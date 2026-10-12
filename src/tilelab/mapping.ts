// The external-sheet mapping: which cells of ANY 16px-grid tileset sheet
// stand in for which of the game's tile keys (base frames, alts, masks).
// Keys left unmapped keep the current art. Saved and loaded as JSON
// (MAPPING_FORMAT). Pure: no DOM; unit-tested.

import type { Rgba } from "../art/png";
import { TILES } from "../contracts";
import { cellOf, MASKS, type TileEdit } from "./tiles";

export const MAPPING_FORMAT = "verdant.tilelab-mapping/1";

/** One key's cells: refs as cell lists (1–2 frames for base and masks). */
export interface KeyMap {
  base?: number[];
  alts?: number[];
  masks?: Record<string, number[]>;
}

export interface SheetMapping {
  format: typeof MAPPING_FORMAT;
  sheet: { name: string; width: number; height: number; columns: number };
  /** Unmapped alts and masks of a mapped key: true shows its new base there; false keeps the current art. */
  fill: boolean;
  tiles: Record<string, KeyMap>;
}

export type Slot =
  | { kind: "base"; frame: 1 | 2 }
  | { kind: "alt"; n: 1 | 2 | 3 }
  | { kind: "mask"; mask: number; frame: 1 | 2 };

export function newMapping(name: string, width: number, height: number): SheetMapping {
  return { format: MAPPING_FORMAT, sheet: { name, width, height, columns: Math.floor(width / 16) }, fill: true, tiles: {} };
}

export const cellCount = (m: SheetMapping) => m.sheet.columns * Math.floor(m.sheet.height / 16);

const withFrame = (list: number[] | undefined, frame: 1 | 2, cell: number): number[] =>
  frame === 1 ? [cell, ...(list?.slice(1, 2) ?? [])] : [list?.[0] ?? cell, cell];

/** The mapping with `cell` assigned to a key's slot (a new object). */
export function assign(m: SheetMapping, key: string, slot: Slot, cell: number): SheetMapping {
  if (!Number.isInteger(cell) || cell < 0 || cell >= cellCount(m)) throw new Error(`cell ${cell} is outside the sheet`);
  const k: KeyMap = { ...m.tiles[key] };
  if (slot.kind === "base") k.base = withFrame(k.base, slot.frame, cell);
  else if (slot.kind === "alt") {
    const alts = [...(k.alts ?? [])];
    alts[Math.min(slot.n - 1, alts.length)] = cell; // alts stay dense: n beyond the end appends
    k.alts = alts.slice(0, 3);
  } else {
    if (slot.mask < 0 || slot.mask >= MASKS) throw new Error(`mask ${slot.mask} must be 0–15`);
    k.masks = { ...k.masks, [String(slot.mask)]: withFrame(k.masks?.[String(slot.mask)], slot.frame, cell) };
  }
  return { ...m, tiles: { ...m.tiles, [key]: k } };
}

/** Assign masks 0–15 from a 4x4 block of cells whose top-left cell is `topLeft` (mask order, row-major). */
export function assignMaskBlock(m: SheetMapping, key: string, topLeft: number, frame: 1 | 2 = 1): SheetMapping {
  const cols = m.sheet.columns;
  const x0 = topLeft % cols, y0 = Math.floor(topLeft / cols);
  if (x0 + 4 > cols || (y0 + 4) * cols > cellCount(m)) throw new Error("a 4x4 block starting there runs off the sheet");
  let out = m;
  for (let mask = 0; mask < MASKS; mask++) out = assign(out, key, { kind: "mask", mask, frame }, (y0 + Math.floor(mask / 4)) * cols + x0 + (mask % 4));
  return out;
}

/** Remove one slot, or the whole key when `slot` is omitted. */
export function unassign(m: SheetMapping, key: string, slot?: Slot): SheetMapping {
  const tiles = { ...m.tiles };
  if (!slot) { delete tiles[key]; return { ...m, tiles }; }
  const k: KeyMap = { ...tiles[key] };
  if (slot.kind === "base") k.base = slot.frame === 2 ? k.base?.slice(0, 1) : undefined;
  else if (slot.kind === "alt") k.alts = k.alts?.filter((_, i) => i !== slot.n - 1);
  else {
    const masks = { ...k.masks };
    const cur = masks[String(slot.mask)];
    if (slot.frame === 2 && cur && cur.length > 1) masks[String(slot.mask)] = cur.slice(0, 1);
    else delete masks[String(slot.mask)];
    k.masks = masks;
  }
  if (!k.alts?.length) delete k.alts;
  if (k.masks && !Object.keys(k.masks).length) delete k.masks;
  if (!k.base) delete k.base;
  if (!k.base && !k.alts && !k.masks) delete tiles[key];
  else tiles[key] = k;
  return { ...m, tiles };
}

export function slotCell(m: SheetMapping, key: string, slot: Slot): number | undefined {
  const k = m.tiles[key];
  if (!k) return undefined;
  if (slot.kind === "base") return k.base?.[slot.frame - 1];
  if (slot.kind === "alt") return k.alts?.[slot.n - 1];
  return k.masks?.[String(slot.mask)]?.[slot.frame - 1];
}

/** Keys of `all` that the mapping gives no cell at all. */
export function unmappedKeys(m: SheetMapping, all: readonly string[]): string[] {
  return all.filter((k) => !m.tiles[k]);
}

/** Cell -> the keys (and slots) that use it, for drawing labels on the sheet. */
export function cellUses(m: SheetMapping): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (c: number, label: string) => out.set(c, [...(out.get(c) ?? []), label]);
  for (const [key, k] of Object.entries(m.tiles)) {
    k.base?.forEach((c, i) => add(c, i ? `${key} frame 2` : key));
    k.alts?.forEach((c, i) => add(c, `${key}~${i + 1}`));
    for (const [mk, fr] of Object.entries(k.masks ?? {})) fr.forEach((c, i) => add(c, `${key}@${mk}${i ? " frame 2" : ""}`));
  }
  return out;
}

const isCellList = (v: unknown, max: number, n: number): v is number[] =>
  Array.isArray(v) && v.length >= 1 && v.length <= max && v.every((c) => Number.isInteger(c) && c >= 0 && c < n);

/** Parse a saved mapping. Unknown tile keys and out-of-range cells are errors. */
export function parseMapping(json: unknown): { mapping: SheetMapping; errors: string[] } | { mapping: null; errors: string[] } {
  const errors: string[] = [];
  const o = json as Partial<SheetMapping> | null;
  if (!o || typeof o !== "object") return { mapping: null, errors: ["not a JSON object"] };
  if (o.format !== MAPPING_FORMAT) return { mapping: null, errors: [`format is ${JSON.stringify(o.format)}, want "${MAPPING_FORMAT}"`] };
  const s = o.sheet;
  if (!s || !Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width < 16 || s.height < 16) {
    return { mapping: null, errors: ["sheet needs a width and height of at least 16"] };
  }
  const m = newMapping(typeof s.name === "string" ? s.name : "sheet.png", s.width, s.height);
  m.fill = o.fill !== false;
  const n = cellCount(m);
  for (const [key, k] of Object.entries(o.tiles ?? {})) {
    if (!(key in TILES)) { errors.push(`${key}: not a tile key`); continue; }
    const out: KeyMap = {};
    if (k.base !== undefined) { if (isCellList(k.base, 2, n)) out.base = k.base; else errors.push(`${key}.base: 1–2 cells within the sheet`); }
    if (k.alts !== undefined) { if (isCellList(k.alts, 3, n)) out.alts = k.alts; else errors.push(`${key}.alts: 1–3 cells within the sheet`); }
    if (k.masks !== undefined) {
      for (const [mk, fr] of Object.entries(k.masks)) {
        if (!/^(\d|1[0-5])$/.test(mk)) { errors.push(`${key}.masks: "${mk}" is not 0–15`); continue; }
        if (isCellList(fr, 2, n)) (out.masks ??= {})[mk] = fr;
        else errors.push(`${key}.masks.${mk}: 1–2 cells within the sheet`);
      }
    }
    if (out.base || out.alts || out.masks) m.tiles[key] = out;
  }
  return { mapping: m, errors };
}

/** The edits a mapping makes, cut from the sheet's pixels. */
export function mappingEdits(m: SheetMapping, sheet: Rgba): Map<string, TileEdit> {
  const cols = m.sheet.columns;
  const cut = (cells: number[]) => cells.map((c) => cellOf(sheet, c, cols));
  const out = new Map<string, TileEdit>();
  for (const [key, k] of Object.entries(m.tiles)) {
    const e: TileEdit = { enabled: true, fill: m.fill, source: `${m.sheet.name} (mapping)` };
    if (k.base) e.base = cut(k.base);
    if (k.alts) e.alts = cut(k.alts);
    if (k.masks) e.masks = Object.fromEntries(Object.entries(k.masks).map(([mk, fr]) => [Number(mk), cut(fr)]));
    out.set(key, e);
  }
  return out;
}
