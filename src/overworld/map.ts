// Pure map logic: tile lookup with borders, structure footprints, and the
// movement rules (walls, ledges, occupancy). No DOM; unit-tested.

import type { Cond, Dir, MapDef, TileKey, TileProps } from "../contracts";
import { STRUCTURES, TILES } from "../contracts";

export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export interface MapRuntime {
  def: MapDef;
  w: number;
  h: number;
  /** "x,y" of structure footprint tiles that block movement. */
  solid: Set<string>;
  /** "x,y" -> door tile of a structure (walkable). */
  doors: Set<string>;
  /** Active `legendWhen` overrides; refreshed from flags by the overworld. */
  legendOverride?: Record<string, TileKey>;
}

/** Recompute flag-dependent legend overrides (cheap; called every frame). */
export function refreshLegend(m: MapRuntime, flags: Record<string, boolean>): void {
  let merged: Record<string, TileKey> | undefined;
  for (const o of m.def.legendWhen ?? []) {
    if (checkCond(o.when, flags)) merged = { ...o.legend, ...merged };
  }
  m.legendOverride = merged;
}

const warnedLegend = new Set<string>();

export const key = (x: number, y: number) => `${x},${y}`;

export function buildMap(def: MapDef): MapRuntime {
  const solid = new Set<string>();
  const doors = new Set<string>();
  for (const s of def.structures ?? []) {
    const spec = STRUCTURES[s.key];
    if (!spec) continue;
    for (let yy = 0; yy < spec.h; yy++) {
      for (let xx = 0; xx < spec.w; xx++) {
        const k = key(s.x + xx, s.y + yy);
        if (spec.door && xx === spec.door.x && yy === spec.door.y) doors.add(k);
        else solid.add(k);
      }
    }
  }
  const w = Math.max(0, ...def.tiles.map((r) => Array.from(r).length));
  return { def, w, h: def.tiles.length, solid, doors };
}

export function inBounds(m: MapRuntime, x: number, y: number) {
  return x >= 0 && y >= 0 && x < m.w && y < m.h;
}

/** Tile at a position; the map's border tile beyond the edges. */
export function tileAt(m: MapRuntime, x: number, y: number): TileKey {
  if (!inBounds(m, x, y)) return m.def.border;
  const ch = Array.from(m.def.tiles[y])[x];
  if (ch === undefined) return m.def.border;
  const t = m.legendOverride?.[ch] ?? m.def.legend[ch];
  if (!t) {
    const k = `${m.def.id}:${ch}`;
    if (!warnedLegend.has(k)) {
      warnedLegend.add(k);
      console.warn(`[map] ${m.def.id}: no legend entry for "${ch}"`);
    }
    return m.def.border;
  }
  return t;
}

export function tileProps(t: TileKey): TileProps {
  return (TILES as Record<string, TileProps>)[t] ?? { walk: false };
}

/** Walkable terrain ignoring characters. */
export function isWalkable(m: MapRuntime, x: number, y: number): boolean {
  if (!inBounds(m, x, y)) return false;
  const k = key(x, y);
  if (m.doors.has(k)) return true;
  if (m.solid.has(k)) return false;
  return tileProps(tileAt(m, x, y)).walk;
}

export type MoveResult =
  | { kind: "walk"; x: number; y: number }
  | { kind: "ledge"; x: number; y: number }   // hop: lands two tiles away
  | { kind: "blocked"; reason: "wall" | "edge" | "occupied" | "ledge" };

/**
 * Can something at (x,y) move one step in `dir`?
 * Ledges (`ledge: "down"`) can only be hopped southward, landing on the
 * tile beyond, which must be walkable and free. They block every other way.
 */
export function tryMove(
  m: MapRuntime, x: number, y: number, dir: Dir,
  occupied: (x: number, y: number) => boolean = () => false,
): MoveResult {
  const { dx, dy } = DIRS[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (!inBounds(m, nx, ny)) return { kind: "blocked", reason: "edge" };
  const props = tileProps(tileAt(m, nx, ny));
  if (props.ledge && !m.solid.has(key(nx, ny))) {
    if (dir !== props.ledge) return { kind: "blocked", reason: "ledge" };
    const lx = nx + dx;
    const ly = ny + dy;
    if (!isWalkable(m, lx, ly)) return { kind: "blocked", reason: "wall" };
    if (occupied(lx, ly)) return { kind: "blocked", reason: "occupied" };
    return { kind: "ledge", x: lx, y: ly };
  }
  if (!isWalkable(m, nx, ny)) return { kind: "blocked", reason: "wall" };
  if (occupied(nx, ny)) return { kind: "blocked", reason: "occupied" };
  return { kind: "walk", x: nx, y: ny };
}

export function checkCond(cond: Cond | undefined, flags: Record<string, boolean>): boolean {
  if (!cond) return true;
  return cond.every((c) => (flags[c.flag] ?? false) === c.is);
}

/**
 * Warp at a tile. Exit mats are often two tiles wide with a single warp, so
 * a mat tile without its own warp shares the one on a neighbouring mat tile.
 */
export function warpAt(m: MapRuntime, x: number, y: number) {
  const own = m.def.warps.find((w) => w.x === x && w.y === y);
  if (own || tileAt(m, x, y) !== "mat_exit") return own;
  for (const dx of [-1, 1, -2, 2]) {
    const nx = x + dx;
    if (Array.from({ length: Math.abs(dx) }, (_, i) => x + Math.sign(dx) * (i + 1)).some((cx) => tileAt(m, cx, y) !== "mat_exit")) continue;
    const w = m.def.warps.find((w) => w.x === nx && w.y === y);
    if (w) return w;
  }
  return undefined;
}

export function triggerAt(m: MapRuntime, x: number, y: number, flags: Record<string, boolean>) {
  return m.def.triggers.find(
    (t) => x >= t.x && y >= t.y && x < t.x + (t.w ?? 1) && y < t.y + (t.h ?? 1) && checkCond(t.when, flags),
  );
}

/** Exit mats only warp when walking "out" (down), as in Crystal. */
export function isMatWarp(m: MapRuntime, x: number, y: number): boolean {
  return tileAt(m, x, y) === "mat_exit";
}

/**
 * Tiles from (x,y) looking `dir` up to `range` tiles: true if `target` is in
 * that line with nothing solid in between (for trainer sight).
 */
export function inSight(
  m: MapRuntime, x: number, y: number, dir: Dir, range: number,
  target: { x: number; y: number }, blocked: (x: number, y: number) => boolean,
): number {
  const { dx, dy } = DIRS[dir];
  for (let i = 1; i <= range; i++) {
    const tx = x + dx * i;
    const ty = y + dy * i;
    if (tx === target.x && ty === target.y) return i;
    if (!isWalkable(m, tx, ty) || blocked(tx, ty)) return 0;
  }
  return 0;
}
