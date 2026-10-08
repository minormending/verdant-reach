// Pure ICE movement: one direction carries the player to the next slide stop.
import type { Dir } from "../contracts";
import { DIRS, isWalkable, key, tileAt, tileProps, tryMove, warpAt, type MapRuntime, type MoveResult } from "./map";

export interface IcePosition { x: number; y: number }
type LegalMove = Exclude<MoveResult, { kind: "blocked" }>;

/** Shared trace for runtime movement and composed validator terrain. Include
 *  the walkable non-ice landing; a blocked next step leaves the last ice tile.
 *  Warp tiles stop the trace even when their terrain is ice. */
export function slidePathFrom(
  start: IcePosition, dir: Dir,
  move: (x: number, y: number, dir: Dir) => MoveResult,
  sliding: (x: number, y: number) => boolean,
): LegalMove[] {
  const path: LegalMove[] = [];
  let p = start;
  do {
    const next = move(p.x, p.y, dir);
    if (next.kind === "blocked") break;
    path.push(next);
    p = next;
  } while (sliding(p.x, p.y));
  return path;
}

export function slidePath(
  map: MapRuntime, x: number, y: number, dir: Dir,
  occupied: (x: number, y: number) => boolean = () => false,
): LegalMove[] {
  return slidePathFrom({ x, y }, dir,
    (px, py, d) => tryMove(map, px, py, d, occupied),
    (px, py) => !!tileProps(tileAt(map, px, py)).slide && !warpAt(map, px, py));
}

/** BFS states are stops, never intermediate ice tiles where turning is illegal.
 *  The default occupancy includes every NPC; callers may resolve visibility. */
export function reachableIceStops(
  map: MapRuntime, start: IcePosition,
  occupied: (x: number, y: number) => boolean = (x, y) => map.def.npcs.some((n) => n.x === x && n.y === y),
): Set<string> {
  const reached = new Set<string>();
  if (!isWalkable(map, start.x, start.y) || occupied(start.x, start.y)) return reached;
  const queue = [start];
  reached.add(key(start.x, start.y));
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const dir of Object.keys(DIRS) as Dir[]) {
      const path = slidePath(map, p.x, p.y, dir, occupied);
      const stop = path.at(-1);
      if (!stop || reached.has(key(stop.x, stop.y))) continue;
      reached.add(key(stop.x, stop.y));
      queue.push(stop);
    }
  }
  return reached;
}

export function solveIcePuzzle(
  map: MapRuntime, start: IcePosition, goal: IcePosition,
  occupied?: (x: number, y: number) => boolean,
): boolean {
  return reachableIceStops(map, start, occupied).has(key(goal.x, goal.y));
}
