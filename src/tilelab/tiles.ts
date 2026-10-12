// Tile images as plain RGBA, and the Tile Lab's edit model. Pure: no DOM.
//
//  - A tile key's art (TileArt) is what docs/ART.md §4 gives one key: a base
//    (1–2 animation frames), up to 3 static alts and any of the 16 autotile
//    masks (each 1–2 frames). Every image is 16x16.
//  - A TileEdit says what the lab replaces; `applyEdit` lays it over the
//    key's current art. Edits come from an upload (16x16, 32x16, 64x64, 128x64),
//    a cell picked from a sheet, or an external-sheet mapping (mapping.ts).

import type { Rgba } from "../art/png";

export const TS = 16;
export const MASKS = 16;

export interface TileArt {
  base: Rgba[];
  alts: Rgba[];
  /** Mask number (0–15) -> 1–2 frames. Missing masks fall back to `base` in the game. */
  masks: Record<number, Rgba[]>;
}

export interface TileEdit {
  /** False keeps the edit but shows the current art (the per-tile A/B). */
  enabled: boolean;
  /** Replaces the base (1–2 frames). */
  base?: Rgba[];
  /** Replaces every alt (static images). */
  alts?: Rgba[];
  /** Replaces these masks; others keep the current art (unless `fill`). */
  masks?: Record<number, Rgba[]>;
  /** Drop the current alts and masks, so the (new) base shows everywhere. */
  fill?: boolean;
  /** Where the art came from, for the UI ("grass.png", "sheet cell 12"). */
  source: string;
}

export function blank(w = TS, h = TS): Rgba {
  return { width: w, height: h, data: new Uint8Array(w * h * 4) };
}

export function solid(rgba: [number, number, number, number], w = TS, h = TS): Rgba {
  const img = blank(w, h);
  for (let i = 0; i < w * h; i++) img.data.set(rgba, i * 4);
  return img;
}

/** Copy a w x h rectangle out of an image (transparent where it falls outside). */
export function crop(src: Rgba, x: number, y: number, w = TS, h = TS): Rgba {
  const out = blank(w, h);
  for (let yy = 0; yy < h; yy++) {
    const sy = y + yy;
    if (sy < 0 || sy >= src.height) continue;
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx;
      if (sx < 0 || sx >= src.width) continue;
      const si = (sy * src.width + sx) * 4;
      out.data.set(src.data.subarray(si, si + 4), (yy * w + xx) * 4);
    }
  }
  return out;
}

/** Draw `img` into `dst` at (x, y), replacing pixels (no blending). */
export function paste(dst: Rgba, img: Rgba, x: number, y: number): void {
  for (let yy = 0; yy < img.height; yy++) {
    const dy = y + yy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let xx = 0; xx < img.width; xx++) {
      const dx = x + xx;
      if (dx < 0 || dx >= dst.width) continue;
      const si = (yy * img.width + xx) * 4;
      dst.data.set(img.data.subarray(si, si + 4), (dy * dst.width + dx) * 4);
    }
  }
}

/** Cell `n` of a sheet with `columns` 16px columns. */
export function cellOf(sheet: Rgba, n: number, columns: number): Rgba {
  return crop(sheet, (n % columns) * TS, Math.floor(n / columns) * TS);
}

/** Cells in a sheet (whole 16px cells only). */
export function gridSize(img: Rgba): { columns: number; rows: number } {
  return { columns: Math.floor(img.width / TS), rows: Math.floor(img.height / TS) };
}

export function isBlank(img: Rgba): boolean {
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] !== 0) return false;
  return true;
}

export function sameImage(a: Rgba, b: Rgba): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false;
  return true;
}

/** A stable string key for an image's pixels (dedupes sheet cells). */
export function imageKey(img: Rgba): string {
  let s = `${img.width}x${img.height}:`;
  for (let i = 0; i < img.data.length; i += 4) {
    // Fully transparent pixels compare equal whatever their colour bytes.
    s += img.data[i + 3] === 0 ? "-" : String.fromCharCode(img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]);
  }
  return s;
}

/** Where mask `m` sits in a 4x4 mask grid (row-major, mask 0 top-left, mask 15 bottom-right). */
export const maskCell = (m: number) => ({ x: (m % 4) * TS, y: Math.floor(m / 4) * TS });

/** Slice a 64x64 4x4 grid into the 16 masks, in mask order 0–15. */
export function sliceMaskGrid(img: Rgba, x0 = 0): Rgba[] {
  return Array.from({ length: MASKS }, (_, m) => crop(img, x0 + maskCell(m).x, maskCell(m).y));
}

/** Lay 16 mask images out as a 64x64 4x4 grid (the inverse of `sliceMaskGrid`). */
export function maskGridImage(masks: (Rgba | undefined)[]): Rgba {
  const out = blank(64, 64);
  masks.forEach((m, i) => { if (m) paste(out, m, maskCell(i).x, maskCell(i).y); });
  return out;
}

export type UploadShape =
  | { kind: "tile" }            // 16x16: the base
  | { kind: "frames" }          // 32x16: base frames 1 and 2
  | { kind: "masks" }           // 64x64: the 16 masks
  | { kind: "masks2" }          // 128x64: the 16 masks, frame 1 grid | frame 2 grid
  | { kind: "sheet"; columns: number; rows: number } // a larger 16px grid: pick a cell
  | { kind: "bad"; why: string };

/** What an uploaded image of this size means for a key (autotiled or not). */
export function classifyUpload(w: number, h: number, autotiled: boolean): UploadShape {
  if (w === 16 && h === 16) return { kind: "tile" };
  if (w === 32 && h === 16) return { kind: "frames" };
  if (autotiled && w === 64 && h === 64) return { kind: "masks" };
  if (autotiled && w === 128 && h === 64) return { kind: "masks2" };
  if (w % TS === 0 && h % TS === 0 && w >= TS && h >= TS) return { kind: "sheet", columns: w / TS, rows: h / TS };
  return { kind: "bad", why: `${w}x${h} is not a 16px grid` };
}

/** Turn an upload into an edit (for "sheet" uploads the caller picks a cell instead). */
export function editFromUpload(img: Rgba, autotiled: boolean, fill: boolean, source: string): TileEdit | null {
  const shape = classifyUpload(img.width, img.height, autotiled);
  switch (shape.kind) {
    case "tile": return { enabled: true, base: [crop(img, 0, 0)], fill, source };
    case "frames": return { enabled: true, base: [crop(img, 0, 0), crop(img, TS, 0)], fill, source };
    case "masks":
    case "masks2": {
      const f1 = sliceMaskGrid(img, 0);
      const f2 = shape.kind === "masks2" ? sliceMaskGrid(img, 64) : null;
      const masks: Record<number, Rgba[]> = {};
      for (let m = 0; m < MASKS; m++) masks[m] = f2 ? [f1[m], f2[m]] : [f1[m]];
      // The fully surrounded mask (15) doubles as the base, so palettes and fallbacks match.
      return { enabled: true, base: masks[15], masks, fill: false, source };
    }
    default: return null;
  }
}

/** The key's art with an edit laid over it. Disabled edits change nothing. */
export function applyEdit(cur: TileArt, e: TileEdit | undefined): TileArt {
  if (!e || !e.enabled) return cur;
  let base = e.base?.length ? e.base.slice(0, 2) : cur.base;
  let alts = e.fill ? [] : cur.alts;
  let masks: Record<number, Rgba[]> = e.fill ? {} : { ...cur.masks };
  if (e.alts) alts = e.alts.slice(0, 3);
  if (e.masks) for (const [m, fr] of Object.entries(e.masks)) if (fr.length) masks[Number(m)] = fr.slice(0, 2);
  // A still base over animated masks: repeat it, or the game would stop animating the masks
  // (it animates a key only when the base has a second frame).
  if (base.length === 1 && Object.values(masks).some((fr) => fr.length === 2)) base = [base[0], base[0]];
  // docs/ART.md §4: if the base animates, every mask has the same number of frames.
  if (base.length === 2) {
    masks = Object.fromEntries(Object.entries(masks).map(([m, fr]) => [m, fr.length === 1 ? [fr[0], fr[0]] : fr]));
  }
  return { base, alts, masks };
}

/** True when the key's art would animate (two base frames). */
export const animates = (a: TileArt) => a.base.length === 2;
