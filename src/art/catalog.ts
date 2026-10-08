// The art catalog: bundle JSONs merged across active packs, and the resolver
// that turns a LOGICAL path (src/contracts/constants.ts) into a concrete file
// URL plus an optional sheet cell and palette swap. Pure (no DOM, no Node):
// the browser registry, the Art Lab and the Node bundle test all share it.
//
// Layering (docs/ART.md §8). Each bundle is a stack of layers, bottom-up:
// the base bundle, then each active pack that has a bundle with the same
// kind and id (in activation order: later packs win), then an optional
// in-memory "lab" layer (JSON patches from the Art Lab).
//  - JSON merges shallowly, layer over layer; tileset `tiles` and image-set
//    `images` merge one level deeper (per tile key / per image key), so a
//    pack can override a single tile or image.
//  - A file name resolves in the highest layer whose folder holds that file,
//    down to the base. For tilesets, a tile defined by layer D reads its sheet
//    from the highest layer at or above D that does not define its own `tiles`
//    (so a pack that only ships `sheet.png` swaps the whole sheet, while a
//    pack that overrides a few tiles keeps its own sparse sheet for them).
//  - Species colours: an image is in the palette of the layer it came from.
//    It is recoloured index by index to the merged `palette` (or to `sport`
//    for `?sport` paths). A pack that changes only `palette` recolours the
//    base images; a sport is an exact swap palette[i] -> sport[i].
//
// Legacy fallback (Round 4 migration): a path whose SUBJECT (species id, tile
// key, structure, character, set entry) no bundle owns resolves to the old
// public/assets/<same path> file, if the index lists it.

import {
  BUNDLE_JSON, BUNDLE_KINDS, bundleDir, refCells,
  type BundleKind, type RawBundle, type TileDef, type TileRef,
} from "./format";
import { isPalette, isSportMap, makeRecolor, materialRecolor, type Recolor } from "./palette";
import { legacyFileOf, logicalPath, parseLogical, SPECIES_FRAME_KINDS, speciesFrameSlot, type LogicalRef } from "./paths";

export const LAB_LAYER = "@lab";

export interface Layer {
  /** null = base tree; a pack id; or LAB_LAYER for in-memory patches. */
  pack: string | null;
  /** URL prefix of the bundle folder ("" for the lab layer). */
  dir: string;
  files: ReadonlySet<string>;
  json: Record<string, unknown>;
}

export interface BundleView {
  kind: BundleKind;
  id: string;
  /** Bottom-up. layers[0] is the base bundle, or the pack that introduced a new bundle. */
  layers: Layer[];
  /** The merged JSON (what the game effectively sees). */
  merged: Record<string, unknown>;
}

/** Where a logical path comes from. */
export interface Resolution {
  path: string;
  /** The file to load, relative to the site root ("art/tilesets/terrain/sheet.png" or "assets/..."). */
  url: string;
  /** Sub-rectangle of the file (sheet cells), else the whole image. */
  rect?: [number, number, number, number];
  /** Exact palette swap applied after cutting. */
  recolor?: Recolor;
  /** Horizontal image-set frames, with the size of a single frame. */
  frames?: number;
  frameSize?: [number, number];
  /** False when no layer's file list has the file (it will probably 404). */
  listed: boolean;
  legacy: boolean;
  bundle?: { kind: BundleKind; id: string };
  /** The layer the file came from (null = base). */
  layer?: string | null;
  /** Expected pixel size where the format fixes it (cells, frames). */
  cell?: number;
}

export interface CatalogOptions {
  /** Active packs, lowest priority first. */
  packs?: readonly string[];
  artRoot?: string;
  /** Legacy files (logical paths). null = unknown: every unowned "assets/" path is tried. */
  legacy?: readonly string[] | null;
  /** In-memory JSON patches, keyed `${kind}/${id}` (the Art Lab). */
  lab?: ReadonlyMap<string, Record<string, unknown>>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCell = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
export function isRef(v: unknown): v is TileRef {
  return isCell(v) || (Array.isArray(v) && v.length >= 1 && v.length <= 2 && v.every(isCell));
}

/** Merge one layer's JSON over the accumulated JSON. */
function mergeJson(kind: BundleKind, under: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  // A format change cannot inherit the other version's palette/sport contract.
  if (kind === "species" && over.format !== undefined && under.format !== undefined && over.format !== under.format) {
    under = { ...under };
    delete under.palette; delete under.sport; delete under.size;
  }
  const out: Record<string, unknown> = { ...under, ...over };
  const deep = kind === "tilesets" ? "tiles" : kind === "sets" ? "images" : null;
  if (deep && isObj(under[deep]) && isObj(over[deep])) out[deep] = { ...(under[deep] as object), ...(over[deep] as object) };
  return out;
}

export class ArtCatalog {
  readonly packs: readonly string[];
  readonly artRoot: string;
  private views = new Map<string, BundleView>();
  private tileOwners = new Map<string, BundleView>();
  private setEntries = new Map<string, BundleView>(); // `${dir}/${key}` -> set
  private legacy: ReadonlySet<string> | null;
  private memo = new Map<string, Resolution | null>();

  constructor(raw: readonly RawBundle[], opts: CatalogOptions = {}) {
    this.packs = opts.packs ?? [];
    this.artRoot = opts.artRoot ?? "art/";
    this.legacy = opts.legacy === null ? null : new Set(opts.legacy ?? []);
    const rank = (pack: string | null) => (pack === null ? -1 : this.packs.indexOf(pack));
    const groups = new Map<string, RawBundle[]>();
    for (const r of raw) {
      if (r.pack !== null && !this.packs.includes(r.pack)) continue;
      if (!isObj(r.json)) continue; // unparseable bundles provide nothing (the validator reports them)
      const k = `${r.kind}/${r.id}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
    for (const [k, list] of groups) {
      list.sort((a, b) => rank(a.pack) - rank(b.pack));
      const layers: Layer[] = list.map((r) => ({
        pack: r.pack, dir: bundleDir(r.kind, r.id, r.pack, this.artRoot), files: new Set(r.files), json: r.json as Record<string, unknown>,
      }));
      const lab = opts.lab?.get(k);
      if (lab) layers.push({ pack: LAB_LAYER, dir: "", files: new Set(), json: lab });
      const kind = list[0].kind;
      let merged: Record<string, unknown> = {};
      for (const l of layers) merged = mergeJson(kind, merged, l.json);
      this.views.set(k, { kind, id: list[0].id, layers, merged });
    }
    // Indexes, in a stable order (by id).
    for (const v of this.list("tilesets")) {
      const tiles = v.merged.tiles;
      if (!isObj(tiles)) continue;
      for (const key of Object.keys(tiles)) if (!this.tileOwners.has(key)) this.tileOwners.set(key, v);
    }
    for (const v of this.list("sets")) {
      const dir = v.merged.logicalDir, images = v.merged.images;
      if (typeof dir !== "string" || !isObj(images)) continue;
      for (const key of Object.keys(images)) if (!this.setEntries.has(`${dir}/${key}`)) this.setEntries.set(`${dir}/${key}`, v);
    }
  }

  bundle(kind: BundleKind, id: string): BundleView | undefined {
    return this.views.get(`${kind}/${id}`);
  }

  /** Bundles of a kind (or all), sorted by id. */
  list(kind?: BundleKind): BundleView[] {
    const out = [...this.views.values()].filter((v) => !kind || v.kind === kind);
    return out.sort((a, b) => (a.kind === b.kind ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : BUNDLE_KINDS.indexOf(a.kind) - BUNDLE_KINDS.indexOf(b.kind)));
  }

  /** The tileset that defines a tile key. */
  tileOwner(key: string): BundleView | undefined {
    return this.tileOwners.get(key);
  }

  /** The image set that serves `${dir}/${key}.png`. */
  setOwner(dir: string, key: string): BundleView | undefined {
    return this.setEntries.get(`${dir}/${key}`);
  }

  /** True when a bundle owns this path's subject (so legacy files are ignored for it). */
  owned(ref: LogicalRef): boolean {
    switch (ref.type) {
      case "species": return !!this.bundle("species", ref.id);
      case "tile": return this.tileOwners.has(ref.key);
      case "structure": return !!this.bundle("structures", ref.key);
      case "character": return !!this.bundle("characters", ref.key);
      case "set": return this.setEntries.has(`${ref.dir}/${ref.key}`);
    }
  }

  isLegacyListed(path: string): boolean {
    const file = legacyFileOf(path);
    return this.legacy ? this.legacy.has(file) : file.startsWith("assets/");
  }

  /** Resolve a logical path, or null when nothing provides it. */
  resolve(path: string): Resolution | null {
    const hit = this.memo.get(path);
    if (hit !== undefined) return hit;
    const ref = parseLogical(path);
    let out: Resolution | null = null;
    if (ref) {
      if (this.owned(ref)) out = this.resolveBundle(path, ref);
      else if (!(ref.type === "species" && ref.sport) && this.isLegacyListed(path)) {
        out = { path, url: legacyFileOf(path), listed: this.legacy !== null, legacy: true };
      }
    }
    this.memo.set(path, out);
    return out;
  }

  // -------------------------------------------------------------------------

  /** Search layers from `top` down to 0 for a file; `skip` excludes layers. */
  findFile(v: BundleView, name: string, top = v.layers.length - 1, skip?: (l: Layer, i: number) => boolean): { url: string; layer: number; listed: boolean } {
    for (let i = top; i >= 0; i--) {
      const l = v.layers[i];
      if (l.pack === LAB_LAYER || skip?.(l, i)) continue;
      if (l.files.has(name)) return { url: l.dir + name, layer: i, listed: true };
    }
    // Not listed anywhere: point at the lowest real layer (it will 404 if truly absent).
    const base = v.layers.findIndex((l) => l.pack !== LAB_LAYER);
    return { url: v.layers[Math.max(0, base)].dir + name, layer: Math.max(0, base), listed: false };
  }

  /** The value of a field in effect at layer `i` (merged bottom-up through i). */
  valueAt(v: BundleView, field: string, i: number): unknown {
    for (let k = Math.min(i, v.layers.length - 1); k >= 0; k--) if (field in v.layers[k].json) return v.layers[k].json[field];
    return undefined;
  }

  private resolveBundle(path: string, ref: LogicalRef): Resolution | null {
    switch (ref.type) {
      case "species": return this.resolveSpecies(path, ref);
      case "tile": return this.resolveTile(path, ref);
      case "structure": return this.resolveSingle(path, "structures", ref.key, "image");
      case "character": return this.resolveSingle(path, "characters", ref.key, "sheet");
      case "set": {
        const v = this.setOwner(ref.dir, ref.key)!;
        const entry = (v.merged.images as Record<string, unknown>)[ref.key];
        if (!isObj(entry) || typeof entry.file !== "string") return null;
        const f = this.findFile(v, entry.file);
        const frames = typeof entry.frames === "number" && Number.isInteger(entry.frames) && entry.frames > 0 ? entry.frames : 1;
        const size = Array.isArray(entry.size) && entry.size.length === 2 && entry.size.every(n => typeof n === "number" && Number.isInteger(n) && n > 0) ? entry.size as [number, number] : undefined;
        return { path, url: f.url, listed: f.listed, legacy: false, bundle: { kind: "sets", id: v.id }, layer: v.layers[f.layer].pack, frames, frameSize: size };
      }
    }
  }

  private resolveSingle(path: string, kind: BundleKind, id: string, field: string): Resolution | null {
    const v = this.bundle(kind, id)!;
    const name = v.merged[field];
    if (typeof name !== "string") return null;
    const f = this.findFile(v, name);
    return { path, url: f.url, listed: f.listed, legacy: false, bundle: { kind, id }, layer: v.layers[f.layer].pack };
  }

  /** The palette the images of layer `i` are drawn in. */
  paletteAt(v: BundleView, i: number): string[] | undefined {
    const p = v.layers.slice(0, i + 1).reduce((m, l) => mergeJson(v.kind, m, l.json), {} as Record<string, unknown>).palette;
    return isPalette(p) ? p : undefined;
  }

  private resolveSpecies(path: string, ref: Extract<LogicalRef, { type: "species" }>): Resolution | null {
    const v = this.bundle("species", ref.id)!;
    const frames = v.merged.frames;
    if (!isObj(frames)) return null;
    const slot = speciesFrameSlot(ref.kind);
    const list = frames[slot.list];
    if (!Array.isArray(list)) return null;
    const name = list[slot.index];
    if (typeof name !== "string") return null;
    const palette = isPalette(v.merged.palette) ? v.merged.palette : undefined;
    const f = this.findFile(v, name);
    let recolor = makeRecolor(this.paletteAt(v, f.layer), palette);
    let target = palette;
    if (ref.sport) {
      const sport = v.merged.sport;
      if (v.merged.format === "verdant.species/2" && isSportMap(sport)) {
        recolor = materialRecolor(recolor, sport);
      } else {
        if (!isPalette(sport) || !palette || sport.length !== palette.length) return null;
        target = sport;
        recolor = makeRecolor(this.paletteAt(v, f.layer), target);
      }
    }
    return { path, url: f.url, listed: f.listed, legacy: false, recolor: recolor ?? undefined, bundle: { kind: "species", id: v.id }, layer: v.layers[f.layer].pack };
  }

  /** Index of the layer that last defined `tiles[key]`. */
  private tileLayer(v: BundleView, key: string): number {
    for (let i = v.layers.length - 1; i >= 0; i--) {
      const t = v.layers[i].json.tiles;
      if (isObj(t) && key in t) return i;
    }
    return 0;
  }

  /** The sheet file (and its geometry) for a tile defined at layer `d`. */
  tileSheet(v: BundleView, key: string): { url: string; listed: boolean; layer: number; columns: number; tileSize: number } | null {
    const d = this.tileLayer(v, key);
    const definesTiles = (l: Layer) => isObj(l.json.tiles);
    const name = this.valueAt(v, "sheet", d);
    if (typeof name !== "string") return null;
    // Above d: only layers without their own `tiles` (whole-sheet swaps); then d and below.
    let f: { url: string; layer: number; listed: boolean } | null = null;
    for (let i = v.layers.length - 1; i > d; i--) {
      const l = v.layers[i];
      if (l.pack === LAB_LAYER || definesTiles(l)) continue;
      if (l.files.has(name)) { f = { url: l.dir + name, layer: i, listed: true }; break; }
    }
    f ??= this.findFile(v, name, d);
    const at = Math.max(d, f.layer);
    const columns = this.valueAt(v, "columns", at);
    const tileSize = this.valueAt(v, "tileSize", at) ?? 16;
    if (!isCell(columns) || columns <= 0 || !isCell(tileSize) || tileSize <= 0) return null;
    return { ...f, columns, tileSize };
  }

  private resolveTile(path: string, ref: Extract<LogicalRef, { type: "tile" }>): Resolution | null {
    const v = this.tileOwner(ref.key)!;
    const def = (v.merged.tiles as Record<string, unknown>)[ref.key];
    if (!isObj(def)) return null;
    const t = def as Partial<TileDef>;
    let r: unknown;
    if (ref.alt) r = Array.isArray(t.alts) ? t.alts[ref.alt - 1] : undefined;
    else if (ref.mask !== undefined) r = isObj(t.masks) ? (t.masks as Record<string, unknown>)[String(ref.mask)] : undefined;
    else r = t.base;
    if (!isRef(r)) return null;
    const cell = refCells(r)[ref.frame - 1];
    if (cell === undefined) return null;
    const sheet = this.tileSheet(v, ref.key);
    if (!sheet) return null;
    const ts = sheet.tileSize;
    return {
      path, url: sheet.url, listed: sheet.listed, legacy: false, cell,
      rect: [(cell % sheet.columns) * ts, Math.floor(cell / sheet.columns) * ts, ts, ts],
      bundle: { kind: "tilesets", id: v.id }, layer: v.layers[sheet.layer].pack,
    };
  }

  // -------------------------------------------------------------------------

  /** Logical paths a bundle provides. */
  pathsOf(v: BundleView): string[] {
    const out: string[] = [];
    const m = v.merged;
    switch (v.kind) {
      case "species": {
        for (const kind of SPECIES_FRAME_KINDS) {
          const p = logicalPath({ type: "species", id: v.id, kind, sport: false });
          if (this.resolve(p)) out.push(p);
          const s = logicalPath({ type: "species", id: v.id, kind, sport: true });
          if (this.resolve(s)) out.push(s);
        }
        break;
      }
      case "tilesets": {
        if (!isObj(m.tiles)) break;
        for (const [key, def] of Object.entries(m.tiles)) {
          if (this.tileOwner(key) !== v || !isObj(def)) continue;
          const add = (r: Omit<Extract<LogicalRef, { type: "tile" }>, "type" | "key" | "frame">) => {
            for (const frame of [1, 2] as const) {
              const p = logicalPath({ type: "tile", key, frame, ...r });
              if (this.resolve(p)) out.push(p);
            }
          };
          add({});
          if (Array.isArray(def.alts)) def.alts.forEach((_, i) => add({ alt: i + 1 }));
          if (isObj(def.masks)) for (const mk of Object.keys(def.masks)) if (/^\d+$/.test(mk) && Number(mk) <= 15) add({ mask: Number(mk) });
        }
        break;
      }
      case "structures": out.push(logicalPath({ type: "structure", key: v.id })); break;
      case "characters": out.push(logicalPath({ type: "character", key: v.id })); break;
      case "sets": {
        if (typeof m.logicalDir !== "string" || !isObj(m.images)) break;
        for (const key of Object.keys(m.images)) if (this.setOwner(m.logicalDir, key) === v) out.push(`${m.logicalDir}/${key}.png`);
        break;
      }
    }
    return out.filter((p) => this.resolve(p));
  }

  /** Every logical path the catalog provides: bundles first, then unowned legacy files. */
  provides(): string[] {
    const out: string[] = [];
    for (const v of this.list()) out.push(...this.pathsOf(v));
    if (this.legacy) {
      for (const p of this.legacy) {
        const ref = parseLogical(p);
        if (ref && !this.owned(ref)) out.push(p);
      }
    }
    return out;
  }
}

/** Expected JSON file name for a kind (re-exported for tools). */
export const jsonFileOf = (kind: BundleKind) => BUNDLE_JSON[kind].file;
