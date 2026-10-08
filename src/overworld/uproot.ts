// UPROOT: pure one-tile pushes and a BFS over layouts for small puzzle boards.
// Boulder positions belong to map actors; filled pits belong to save flags.

import type { Dir } from "../contracts";
import { DIRS, inBounds, isMatWarp, isWalkable, key, tileAt, tileProps, tryMove, warpAt, type MapRuntime } from "./map";
import { tryRaftMove } from "./raft";
import { slidePathFrom } from "./ice";

export const UPROOT = {
  item: "saxifrage",
  prompt: "UPROOT it?",
  locked: "A heavy boulder. It needs UPROOT.",
  blocked: "It won't budge.",
} as const;

export interface BoulderPosition { x: number; y: number }

export type PushResult =
  | { kind: "push"; x: number; y: number }
  | { kind: "fill"; x: number; y: number }
  | { kind: "locked"; text: string }
  | { kind: "blocked"; reason: "wall" | "edge" | "occupied"; text: string };

/** The caller supplies current occupancy (including NPCs and other boulders).
 *  No hops, chain pushes or mutation: a boulder moves exactly one tile. */
export function tryPushBoulder(
  map: MapRuntime, boulder: BoulderPosition, dir: Dir, hasSaxifrage: boolean,
  occupied: (x: number, y: number) => boolean = () => false,
): PushResult {
  if (!hasSaxifrage) return { kind: "locked", text: UPROOT.locked };
  const { dx, dy } = DIRS[dir];
  const x = boulder.x + dx, y = boulder.y + dy;
  if (!inBounds(map, x, y)) return { kind: "blocked", reason: "edge", text: UPROOT.blocked };
  const pit = tileAt(map, x, y) === "pit" && !map.solid.has(key(x, y));
  if (!pit && !isWalkable(map, x, y)) return { kind: "blocked", reason: "wall", text: UPROOT.blocked };
  if (occupied(x, y)) return { kind: "blocked", reason: "occupied", text: UPROOT.blocked };
  return { kind: pit ? "fill" : "push", x, y };
}

export interface BoulderPuzzleOptions {
  /** Combine land pushes with RAFT travel; boulders still only move on land. */
  rafting?: boolean;
  /** Default: non-pushable NPCs in the map definition. Override for visibility. */
  occupied?: (x: number, y: number) => boolean;
  /** Stop as soon as this tile is reachable; useful for goal-only tests. */
  goal?: BoulderPosition;
}

/** All player tiles reachable across the BFS's boulder layouts. Walks within
 *  one layout are flooded first, so states represent pushes rather than every
 *  footstep. Boulders are interchangeable; reachable arrivals and standing
 *  tiles are part of the key, preserving ledges and terminal warps. Inputs stay intact. */
export function reachableBoulderTiles(
  map: MapRuntime, boulders: readonly BoulderPosition[], player: BoulderPosition,
  opts: BoulderPuzzleOptions = {},
): Set<string> {
  const npcs = new Set(map.def.npcs.filter((n) => !n.pushable).map((n) => key(n.x, n.y)));
  const occupied = opts.occupied ?? ((x: number, y: number) => npcs.has(key(x, y)));
  const walkRegion = (terrain: MapRuntime, start: BoulderPosition, blocked: (x: number, y: number) => boolean) => {
    const region = new Set<string>();
    // Arriving at a forced warp is reachable, but cannot be a walking or
    // pushing position. A loaded entrance remains a valid starting position.
    const stands = new Set<string>();
    const onWater = (x: number, y: number) => !!tileProps(tileAt(terrain, x, y)).water;
    if ((!isWalkable(terrain, start.x, start.y) && !(opts.rafting && inBounds(terrain, start.x, start.y) &&
      onWater(start.x, start.y) && !terrain.solid.has(key(start.x, start.y)))) || blocked(start.x, start.y)) return { region, stands };
    region.add(key(start.x, start.y));
    stands.add(key(start.x, start.y));
    const walks = [start];
    for (let i = 0; i < walks.length; i++) {
      const p = walks[i];
      for (const dir of Object.keys(DIRS) as Dir[]) {
        const path = slidePathFrom(p, dir, (x, y, d) => {
          const move = opts.rafting && !tileProps(tileAt(terrain, x, y)).slide
            ? tryRaftMove(terrain, x, y, d, onWater(x, y), true, blocked)
            : tryMove(terrain, x, y, d, blocked);
          return move.kind === "mount" ? { kind: "walk", x: move.x, y: move.y } : move;
        }, (x, y) => !!tileProps(tileAt(terrain, x, y)).slide && !warpAt(terrain, x, y));
        const move = path.at(-1);
        if (!move) continue;
        const cell = key(move.x, move.y);
        region.add(cell);
        if (warpAt(terrain, move.x, move.y) && (!isMatWarp(terrain, move.x, move.y) || dir === "down")) continue;
        if (stands.has(cell)) continue;
        stands.add(cell);
        walks.push({ x: move.x, y: move.y });
      }
    }
    return { region, stands };
  };
  // Once every potentially reachable tile has been seen, no further layouts
  // can improve the answer. This avoids exhausting free boulder arrangements.
  // Open every pit for this upper bound, including land beyond a fresh pit.
  const allFilled = new Set(map.filled);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (tileAt(map, x, y) === "pit") allFilled.add(key(x, y));
  }
  const potential = walkRegion({ ...map, filled: allFilled }, player, occupied).region;
  const reached = new Set<string>();
  const seen = new Set<string>();
  const queue: { stones: BoulderPosition[]; player: BoulderPosition; filled: Set<string> }[] = [
    { stones: boulders.map((b) => ({ ...b })), player: { ...player }, filled: new Set(map.filled) },
  ];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];
    const terrain = { ...map, filled: state.filled };
    const at = new Set(state.stones.map((b) => key(b.x, b.y)));
    const blocked = (x: number, y: number) => at.has(key(x, y)) || occupied(x, y);
    const { region, stands } = walkRegion(terrain, state.player, blocked);
    if (!region.size) continue;
    const signature = [at, state.filled, region, stands].map((cells) => [...cells].sort().join(";")).join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);
    for (const tile of region) reached.add(tile);
    if (opts.goal && reached.has(key(opts.goal.x, opts.goal.y))) return reached;
    if (reached.size === potential.size) return reached;
    for (let i = 0; i < state.stones.length; i++) {
      const b = state.stones[i];
      for (const dir of Object.keys(DIRS) as Dir[]) {
        const { dx, dy } = DIRS[dir];
        const stand = { x: b.x - dx, y: b.y - dy };
        if (!stands.has(key(stand.x, stand.y))) continue;
        const push = tryPushBoulder(terrain, b, dir, true, blocked);
        if (push.kind !== "push" && push.kind !== "fill") continue;
        const stones = push.kind === "fill" ? state.stones.filter((_, j) => j !== i)
          : state.stones.map((s, j) => j === i ? { x: push.x, y: push.y } : s);
        const filled = new Set(state.filled);
        if (push.kind === "fill") filled.add(key(push.x, push.y));
        // UPROOT moves the boulder; the player stays on the standing tile.
        queue.push({ stones, player: stand, filled });
      }
    }
  }
  return reached;
}

/** Does any sequence of legal walks and UPROOT pushes reach the goal tile? */
export function solveBoulderPuzzle(
  map: MapRuntime, boulders: readonly BoulderPosition[], player: BoulderPosition,
  goal: BoulderPosition, opts: Omit<BoulderPuzzleOptions, "goal"> = {},
): boolean {
  return reachableBoulderTiles(map, boulders, player, { ...opts, goal }).has(key(goal.x, goal.y));
}
