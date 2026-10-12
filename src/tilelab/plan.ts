// From the lab's state to concrete tileset overrides. Pure: the art comes in
// through an ArtSource (a catalog plus decoded pixels), which the browser
// builds from an ArtRegistry fork and the Node tests from public/art/ on disk.
//
// One TilesetPlan per touched tileset, in the art-pack format of docs/ART.md
// §8, so the in-browser preview and the exported pack are the same thing:
//  - Single-tile edits only: a sparse sheet with just the edited keys' images
//    and `tiles` naming only those keys. A pack's `tiles.<key>` replaces the
//    whole key, so an edited key's untouched alts and masks are copied in too.
//  - A whole-sheet replacement: the new sheet (cells line up with the old
//    one) plus extra rows for any edited keys, and `tiles` naming every key of
//    the tileset (a pack layer that defines `tiles` reads its own sheet).

import { tileAltPath, tilePath, tileVariantPath, type TileKey } from "../contracts";
import type { ArtCatalog, BundleView } from "../art/catalog";
import { BUNDLE_JSON, refCells, type TileDef, type TileRef } from "../art/format";
import type { Rgba } from "../art/png";
import { mappingEdits, type SheetMapping } from "./mapping";
import { applyEdit, blank, cellOf, crop, imageKey, paste, TS, type TileArt, type TileEdit } from "./tiles";

export interface ArtSource {
  catalog: ArtCatalog;
  /** Decoded pixels of a loaded file URL, or null. */
  pixels(url: string): Rgba | null;
}

export interface SheetSwap { name: string; image: Rgba }

/** Everything the lab keeps (and persists). */
export interface LabState {
  /** Single-tile edits by tile key. */
  edits: Record<string, TileEdit>;
  /** Whole-sheet replacements by tileset id (same layout as the current sheet). */
  sheets: Record<string, SheetSwap>;
  /** An external sheet and which of its cells stand in for which keys. */
  mapping: { image: Rgba; data: SheetMapping } | null;
  /** Art packs previewed under the edits (lowest priority first). */
  packs: string[];
}

export const emptyState = (): LabState => ({ edits: {}, sheets: {}, mapping: null, packs: [] });

export const isEmptyState = (s: LabState) =>
  !Object.keys(s.edits).length && !Object.keys(s.sheets).length && !s.mapping && !s.packs.length;

/** The edit in effect per key: a single-tile edit wins over the mapping; a disabled one switches the key off (A/B). */
export function effectiveEdits(s: LabState): Map<string, TileEdit> {
  const out = s.mapping ? mappingEdits(s.mapping.data, s.mapping.image) : new Map<string, TileEdit>();
  for (const [key, e] of Object.entries(s.edits)) {
    if (e.enabled) out.set(key, e);
    else out.delete(key);
  }
  return out;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A tile key's definition in the catalog (merged across layers). */
export function tileDef(cat: ArtCatalog, key: string): TileDef | null {
  const v = cat.tileOwner(key);
  const d = v && isObj(v.merged.tiles) ? (v.merged.tiles as Record<string, unknown>)[key] : undefined;
  return isObj(d) ? (d as unknown as TileDef) : null;
}

/** Every logical path a definition provides (base frames, alts, masks and their frames). */
export function defPaths(key: string, def: TileDef): string[] {
  const k = key as TileKey;
  const out = refCells(def.base).map((_, i) => tilePath(k, (i + 1) as 1 | 2));
  (def.alts ?? []).forEach((_, i) => out.push(tileAltPath(k, (i + 1) as 1 | 2 | 3)));
  for (const [mk, r] of Object.entries(def.masks ?? {})) refCells(r).forEach((_, i) => out.push(tileVariantPath(k, Number(mk), (i + 1) as 1 | 2)));
  return out;
}

/** Index of the layer that last defined `tiles[key]` (0 = the bottom layer). */
export function defLayer(v: BundleView, key: string): number {
  for (let i = v.layers.length - 1; i >= 0; i--) {
    const t = v.layers[i].json.tiles;
    if (isObj(t) && key in t) return i;
  }
  return 0;
}

/** The key's current art as the catalog resolves it, or null if a file isn't loaded. */
export function currentArt(src: ArtSource, key: string): TileArt | null {
  const def = tileDef(src.catalog, key);
  if (!def) return null;
  const k = key as TileKey;
  const img = (path: string): Rgba | null => {
    const res = src.catalog.resolve(path);
    if (!res) return null;
    const px = src.pixels(res.url);
    if (!px) return null;
    const [x, y, w, h] = res.rect ?? [0, 0, TS, TS];
    return crop(px, x, y, w, h);
  };
  const all = (paths: string[]) => {
    const list = paths.map(img);
    return list.every((i): i is Rgba => !!i) ? list : null;
  };
  const base = all(refCells(def.base).map((_, i) => tilePath(k, (i + 1) as 1 | 2)));
  if (!base) return null;
  const alts = all((def.alts ?? []).map((_, i) => tileAltPath(k, (i + 1) as 1 | 2 | 3))) ?? [];
  const masks: Record<number, Rgba[]> = {};
  for (const [mk, r] of Object.entries(def.masks ?? {})) {
    const fr = all(refCells(r).map((_, i) => tileVariantPath(k, Number(mk), (i + 1) as 1 | 2)));
    if (fr) masks[Number(mk)] = fr;
  }
  return { base, alts, masks };
}

/** A definition's art cut from a sheet laid out like the original. */
export function artFromSheet(def: TileDef, sheet: Rgba, columns: number): TileArt {
  const cut = (r: TileRef) => refCells(r).map((c) => cellOf(sheet, c, columns));
  const masks: Record<number, Rgba[]> = {};
  for (const [mk, r] of Object.entries(def.masks ?? {})) masks[Number(mk)] = cut(r);
  return { base: cut(def.base), alts: (def.alts ?? []).map((r) => cut(r)[0]), masks };
}

/** art.py stem names (tools/art/artkit/sheets.py `stem_of`) of a key's images. */
export function artStems(key: string, art: TileArt): Map<string, Rgba> {
  const out = new Map<string, Rgba>();
  art.base.forEach((im, i) => out.set(i ? `${key}__2` : key, im));
  art.alts.forEach((im, i) => out.set(`${key}~${i + 1}`, im));
  for (const [mk, fr] of Object.entries(art.masks)) fr.forEach((im, i) => out.set(`${key}@${mk}${i ? "__2" : ""}`, im));
  return out;
}

export interface TilesetPlan {
  id: string;
  /** The pack's tileset.json (sheet "sheet.png"). */
  json: { format: string; id: string; tileSize: number; columns: number; sheet: string; tiles: Record<string, TileDef>; source: { kind: "edited" }; notes: string };
  sheet: Rgba;
  /** True when the whole sheet was replaced (every key is redefined). */
  full: boolean;
  /** Keys with a lab edit in this tileset. */
  edited: string[];
  /** Each key's final art (every key in `json.tiles`). */
  art: Map<string, TileArt>;
  /** Stems the base had that a key no longer has (dropped alts and masks), for baking with art.py. */
  dropped: string[];
}

/** Packs cells into a sheet, deduping identical images. */
class CellPacker {
  cells: Rgba[] = [];
  private seen = new Map<string, number>();
  constructor(private start = 0) {}
  put(img: Rgba): number {
    const k = imageKey(img);
    let c = this.seen.get(k);
    if (c === undefined) {
      c = this.start + this.cells.length;
      this.cells.push(img);
      this.seen.set(k, c);
    }
    return c;
  }
  ref(frames: Rgba[]): TileRef {
    const cs = frames.map((f) => this.put(f));
    return cs.length === 1 ? cs[0] : cs;
  }
  def(a: TileArt): TileDef {
    const d: TileDef = { base: this.ref(a.base) };
    if (a.alts.length) d.alts = a.alts.map((im) => this.put(im));
    const mk = Object.keys(a.masks).map(Number).sort((x, y) => x - y);
    if (mk.length) d.masks = Object.fromEntries(mk.map((m) => [String(m), this.ref(a.masks[m])]));
    return d;
  }
}

/** The tileset's keys, in its own order. */
export function tilesetKeys(cat: ArtCatalog, id: string): string[] {
  const v = cat.bundle("tilesets", id);
  if (!v || !isObj(v.merged.tiles)) return [];
  return Object.keys(v.merged.tiles).filter((k) => cat.tileOwner(k) === v);
}

/** The geometry of the sheet a tileset's own (bottom-layer) keys read. */
export function baseSheetOf(cat: ArtCatalog, id: string): { url: string; columns: number } | null {
  const v = cat.bundle("tilesets", id);
  if (!v) return null;
  const key = tilesetKeys(cat, id).find((k) => defLayer(v, k) === 0) ?? tilesetKeys(cat, id)[0];
  return key ? cat.tileSheet(v, key) : null;
}

/**
 * Plan one tileset's override. Returns null when nothing in it changes, and
 * throws when a needed file isn't loaded (load the keys' `defPaths` first).
 */
export function planTileset(src: ArtSource, id: string, edits: ReadonlyMap<string, TileEdit>, replacement?: Rgba): TilesetPlan | null {
  const cat = src.catalog;
  const v = cat.bundle("tilesets", id);
  if (!v) return null;
  const keys = tilesetKeys(cat, id);
  const edited = keys.filter((k) => edits.has(k));
  if (!edited.length && !replacement) return null;
  const sheetInfo = baseSheetOf(cat, id);
  const columns = replacement ? (sheetInfo?.columns ?? 16) : 16;
  const start = replacement ? columns * Math.floor(replacement.height / TS) : 0;
  const packer = new CellPacker(start);
  const tiles: Record<string, TileDef> = {};
  const art = new Map<string, TileArt>();
  const dropped: string[] = [];
  for (const key of keys) {
    const def = tileDef(cat, key)!;
    const edit = edits.get(key);
    // With a new sheet, the tileset's own keys read it at their old cells.
    const fromSheet = !!replacement && v.layers[defLayer(v, key)].pack === null;
    if (!edit && !replacement) continue;
    const cur = fromSheet ? artFromSheet(def, replacement!, columns) : currentArt(src, key);
    if (!cur) throw new Error(`tile ${key}: its art isn't loaded`);
    if (!edit && fromSheet) {
      tiles[key] = def; // unchanged cells of the new sheet
      art.set(key, cur);
      continue;
    }
    const next = applyEdit(cur, edit);
    tiles[key] = packer.def(next);
    art.set(key, next);
    const keep = artStems(key, next);
    for (const s of artStems(key, cur).keys()) if (!keep.has(s)) dropped.push(s);
  }
  const rows = Math.max(1, Math.ceil((start + packer.cells.length) / columns));
  const sheet = blank(columns * TS, Math.max(rows * TS, replacement?.height ?? 0));
  if (replacement) paste(sheet, crop(replacement, 0, 0, Math.min(replacement.width, columns * TS), replacement.height), 0, 0);
  packer.cells.forEach((im, i) => paste(sheet, im, ((start + i) % columns) * TS, Math.floor((start + i) / columns) * TS));
  return {
    id, sheet, full: !!replacement, edited, art, dropped,
    json: {
      format: BUNDLE_JSON.tilesets.format, id, tileSize: TS, columns, sheet: "sheet.png", tiles,
      source: { kind: "edited" }, notes: "Made with the Verdant Reach Tile Lab (tilelab.html).",
    },
  };
}

/** Every tileset the state touches, by id. */
export function planAll(src: ArtSource, s: LabState): TilesetPlan[] {
  const edits = effectiveEdits(s);
  const ids = new Set<string>(Object.keys(s.sheets));
  for (const key of edits.keys()) {
    const v = src.catalog.tileOwner(key);
    if (v) ids.add(v.id);
  }
  const out: TilesetPlan[] = [];
  for (const id of [...ids].sort()) {
    const p = planTileset(src, id, edits, s.sheets[id]?.image);
    if (p) out.push(p);
  }
  return out;
}

/** Logical paths whose files must be loaded before `planAll` (the keys it reads the current art of). */
export function pathsToLoad(cat: ArtCatalog, s: LabState): string[] {
  const keys = new Set(effectiveEdits(s).keys());
  for (const id of Object.keys(s.sheets)) for (const k of tilesetKeys(cat, id)) keys.add(k);
  const out: string[] = [];
  for (const k of keys) {
    const d = tileDef(cat, k);
    if (d) out.push(...defPaths(k, d));
  }
  return out;
}
