// Pure RAFT movement. A mount is a proposed step: the host must ask first.
import type { Dir } from "../contracts";
import { DIRS, inBounds, isWalkable, key, tileAt, tileProps, tryMove, type MapRuntime, type MoveResult } from "./map";

export type RaftMoveResult =
  | { kind: "mount"; x: number; y: number; rafting: true }
  | { kind: "walk" | "ledge"; x: number; y: number; rafting: boolean }
  | Extract<MoveResult, { kind: "blocked" }>;

export function tryRaftMove(
  m: MapRuntime, x: number, y: number, dir: Dir, rafting: boolean, hasRaft: boolean,
  occupied: (x: number, y: number) => boolean = () => false,
): RaftMoveResult {
  const { dx, dy } = DIRS[dir];
  const nx = x + dx, ny = y + dy;
  if (!inBounds(m, nx, ny)) return { kind: "blocked", reason: "edge" };
  if (m.solid.has(key(nx, ny))) return { kind: "blocked", reason: "wall" };
  if (tileProps(tileAt(m, nx, ny)).water && !m.doors.has(key(nx, ny))) {
    if (!rafting && (!hasRaft || !isWalkable(m, x, y))) return { kind: "blocked", reason: "wall" };
    if (occupied(nx, ny)) return { kind: "blocked", reason: "occupied" };
    return { kind: rafting ? "walk" : "mount", x: nx, y: ny, rafting: true };
  }
  if (rafting) {
    // Only a walkable shore dismounts. Solid ledges cannot be hopped from water.
    if (!isWalkable(m, nx, ny)) return { kind: "blocked", reason: "wall" };
    if (occupied(nx, ny)) return { kind: "blocked", reason: "occupied" };
    return { kind: "walk", x: nx, y: ny, rafting: false };
  }
  const move = tryMove(m, x, y, dir, occupied);
  return move.kind === "blocked" ? move : { ...move, rafting: false };
}
