// Pure tile-art resolution: autotile masks, ground-variation hashing, and
// picking the best available image path for a map cell. No DOM; unit-tested.
//
// Rules (see AUTOTILE / tileVariantPath / tileAltPath in src/contracts):
//  - Tiles in an AUTOTILE group look at their 4 neighbours. Bit N=1, E=2,
//    S=4, W=8 is set when that neighbour is in the SAME group; out-of-bounds
//    counts as same. `${key}@${mask}.png` is drawn when it exists.
//    wall_face uses only N: mask 0 is upper, mask 1 is lower.
//  - Ground variation: `${key}~1..3.png` are picked by a stable position hash.
//    Alts apply only when the cell would otherwise draw the plain base tile
//    (an edge variant always wins). Animated tiles only use an alt if the alt
//    has its own second frame (`${key}~N__2.png`), so animation never pops.
//  - Missing files always fall back: variant -> alt -> base.

import type { TileKey } from "../contracts";
import { AUTOTILE, tileAltPath, tilePath, tileVariantPath } from "../contracts";
import { inBounds, tileAt, type MapRuntime } from "./map";

export const MASK = { N: 1, E: 2, S: 4, W: 8 } as const;

/** Autotile group of a tile, or undefined when it doesn't autotile. */
export function autotileGroup(t: TileKey): string | undefined {
  return AUTOTILE[t];
}

/**
 * 4-neighbour mask for the cell at (x, y). Works for cells beyond the map
 * edge too (they show the border tile). Returns -1 for non-autotiled tiles.
 */
export function autotileMask(m: MapRuntime, x: number, y: number): number {
  const tile = tileAt(m, x, y);
  // Wall faces have just two rows, selected solely by the north neighbour.
  if (tile === "wall_face") return tileAt(m, x, y - 1) === "wall_face" ? MASK.N : 0;
  const group = autotileGroup(tile);
  if (!group) return -1;
  const same = (nx: number, ny: number) => !inBounds(m, nx, ny) || autotileGroup(tileAt(m, nx, ny)) === group;
  return (same(x, y - 1) ? MASK.N : 0)
    | (same(x + 1, y) ? MASK.E : 0)
    | (same(x, y + 1) ? MASK.S : 0)
    | (same(x - 1, y) ? MASK.W : 0);
}

/** Stable 32-bit hash of a grid position (and an optional salt). */
export function posHash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Pick a ground variant for (x, y) from the alts that exist. Returns 0 for the
 * base tile or one of `alts`. The base tile is weighted double so fields stay
 * calm, and a cell avoids repeating its west neighbour's alt when it can.
 */
export function pickAlt(x: number, y: number, alts: readonly number[], salt = 0): number {
  if (alts.length === 0) return 0;
  const choose = (cx: number, cy: number) => {
    const r = posHash(cx, cy, salt) % (alts.length + 2);
    return r < 2 ? 0 : alts[r - 2];
  };
  const v = choose(x, y);
  if (v !== 0 && v === choose(x - 1, y)) {
    // Re-roll once with a different salt to break up horizontal runs.
    const r = posHash(x, y, salt + 7) % (alts.length + 2);
    return r < 2 ? 0 : alts[r - 2];
  }
  return v;
}

/** Which tile files exist (normally the generated asset manifest). */
export interface TileFiles {
  has(path: string): boolean;
}

/** Resolved art for one cell: frame-1 path and frame-2 path (null if static). */
export interface CellArt {
  key: TileKey;
  mask: number;
  alt: number;
  path: string;
  path2: string | null;
}

/** Per-file-set memo of which alts / masks / frames exist. */
export class TileCatalog {
  private altCache = new Map<TileKey, number[]>();
  constructor(readonly files: TileFiles) {}

  animated(key: TileKey): boolean {
    return this.files.has(tilePath(key, 2));
  }

  alts(key: TileKey): number[] {
    let list = this.altCache.get(key);
    if (!list) {
      const anim = this.animated(key);
      list = ([1, 2, 3] as const).filter((n) => {
        const p = tileAltPath(key, n);
        return this.files.has(p) && (!anim || this.files.has(altFrame2(p)));
      });
      this.altCache.set(key, list);
    }
    return list;
  }

  /** Best art for a tile with a given mask (-1 = not autotiled) at (x, y). */
  resolve(key: TileKey, mask: number, x: number, y: number): CellArt {
    const anim = this.animated(key);
    if (mask >= 0) {
      const v = tileVariantPath(key, mask);
      if (this.files.has(v)) {
        const v2 = tileVariantPath(key, mask, 2);
        return { key, mask, alt: 0, path: v, path2: anim ? (this.files.has(v2) ? v2 : v) : null };
      }
    }
    const alt = pickAlt(x, y, this.alts(key));
    if (alt > 0) {
      const p = tileAltPath(key, alt as 1 | 2 | 3);
      return { key, mask, alt, path: p, path2: anim ? altFrame2(p) : null };
    }
    return { key, mask, alt: 0, path: tilePath(key), path2: anim ? tilePath(key, 2) : null };
  }
}

function altFrame2(p: string): string {
  return p.replace(/\.png$/, "__2.png");
}

/** Resolve every cell in a rectangle (map coords, may extend past the edges). */
export function resolveCells(
  m: MapRuntime, cat: TileCatalog, x0: number, y0: number, w: number, h: number,
): CellArt[] {
  const out: CellArt[] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) out.push(cat.resolve(tileAt(m, x, y), autotileMask(m, x, y), x, y));
  }
  return out;
}
