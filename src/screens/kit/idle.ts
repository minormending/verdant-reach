// Species idle animation: front, front__2[, front__3] ping-ponged with a
// slightly irregular hold (20–30 frames per pose) and a per-sprite phase, so
// two creatures on screen never breathe in lockstep. Frames are optional:
// they're only used when the art manifest lists them.

import type { SpeciesId } from "../../contracts";
import { speciesPath } from "../../contracts";
import { ASSET_PATHS } from "../../assets/manifest";

export type FrontKind = "front" | "front__2" | "front__3";

let listed: Set<string> | null = null;
const counts = new Map<string, number>();

/** How many idle poses a species has (1 = static), from the asset manifest. */
export function idleFrameCount(id: SpeciesId, has: (path: string) => boolean = manifestHas): number {
  const key = id;
  const known = counts.get(key);
  if (known !== undefined && has === manifestHas) return known;
  let n = 1;
  if (has(speciesPath(id, "front__2"))) n = has(speciesPath(id, "front__3")) ? 3 : 2;
  if (has === manifestHas) counts.set(key, n);
  return n;
}

function manifestHas(path: string): boolean {
  listed ??= new Set(ASSET_PATHS);
  return listed.has(path);
}

/** Small deterministic hash -> 0..2^32. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mix(a: number, b: number): number {
  let h = Math.imul(a ^ (b + 0x9e3779b9), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Ping-pong order of poses: 2 -> [0,1], 3 -> [0,1,2,1]. */
export function pingPong(n: number): number[] {
  if (n <= 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  for (let i = n - 2; i > 0; i--) out.push(i);
  return out;
}

/** Steps in the repeating super-cycle (4 ping-pong loops, each pose with its own hold). */
const LOOPS = 4;

/**
 * The pose index (0-based) at frame `t` for a sprite with `n` poses.
 * Each step holds 20–30 frames, chosen per (seed, step); `seed` also offsets the phase.
 */
export function idlePose(n: number, t: number, seed: number): number {
  if (n <= 1) return 0;
  const order = pingPong(n);
  const steps = order.length * LOOPS;
  const holds: number[] = [];
  let total = 0;
  for (let k = 0; k < steps; k++) {
    const h = 20 + (mix(seed, k) % 11);
    holds.push(h);
    total += h;
  }
  let local = (((Math.floor(t) + (seed % total)) % total) + total) % total;
  for (let k = 0; k < steps; k++) {
    if (local < holds[k]) return order[k % order.length];
    local -= holds[k];
  }
  return 0;
}

const KINDS: FrontKind[] = ["front", "front__2", "front__3"];

/** Which front sprite to draw for `id` at frame `t`. `salt` separates two views of the same species. */
export function idleKind(id: SpeciesId, t: number, salt = ""): FrontKind {
  const n = idleFrameCount(id);
  if (n <= 1) return "front";
  return KINDS[idlePose(n, t, seedOf(`${id}${salt}`))];
}
