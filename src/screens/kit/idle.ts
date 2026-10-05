// Species front-sprite animation.
//
// Crystal-style (the bundle has `anim`, docs/ART.md §3): `intro` plays once
// when the species appears (SpritePlayback.appear), then `idle` loops, or
// frame 0 holds when there is no idle.
//
// Legacy (no `anim`): front, front__2[, front__3] ping-ponged with a slightly
// irregular hold (20–30 frames per pose) and a per-sprite phase, so two
// creatures on screen never breathe in lockstep. Frames are optional: they're
// only used when the art registry provides them.

import type { SpeciesAnim, SpeciesId } from "../../contracts";
import { speciesPath } from "../../contracts";
import { activeArt, animMaxFrame, animState, frontKind, introRemaining, type FrontFrameKind } from "../../art";

export type FrontKind = FrontFrameKind;
/** Looks up a species' `anim` (the active art registry by default). */
export type AnimLookup = (id: SpeciesId) => SpeciesAnim | undefined;

/** The species' `anim` from the active art registry (packs applied), if any. */
export function speciesAnimOf(id: SpeciesId): SpeciesAnim | undefined {
  return activeArt()?.speciesAnim(id);
}

const counts = new Map<string, number>();
let countsVersion = -1;

/** How many idle poses a species has (1 = static), from the art registry (`assets.exists`). */
export function idleFrameCount(id: SpeciesId, has: (path: string) => boolean = registryHas): number {
  const art = activeArt();
  const cacheable = has === registryHas && !!art?.loaded;
  if (cacheable && countsVersion !== art!.version) { counts.clear(); countsVersion = art!.version; }
  const known = counts.get(id);
  if (known !== undefined && cacheable) return known;
  let n = 1;
  if (has(speciesPath(id, "front__2"))) n = has(speciesPath(id, "front__3")) ? 3 : 2;
  if (cacheable) counts.set(id, n);
  return n;
}

function registryHas(path: string): boolean {
  return activeArt()?.exists(path) ?? false;
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

/** Idle phase offset for a sprite view, so two views of a species don't loop in lockstep. */
const phaseOf = (id: SpeciesId, salt: string) => seedOf(`${id}${salt}`) % 3600;

/**
 * Which front sprite to draw for `id` at frame `t` when no intro is playing:
 * the `anim` idle loop (or frame 0) for Crystal-style art, else the legacy
 * ping-pong. `salt` separates two views of the same species.
 */
export function idleKind(id: SpeciesId, t: number, salt = "", anim: SpeciesAnim | undefined = speciesAnimOf(id)): FrontKind {
  if (anim) return frontKind(animState(anim, t + phaseOf(id, salt)).frame);
  const n = idleFrameCount(id);
  if (n <= 1) return "front";
  return KINDS[idlePose(n, t, seedOf(`${id}${salt}`))];
}

/** True when the species' front sprite moves at all (an `anim`, or ≥2 legacy idle poses). */
export function isAnimated(id: SpeciesId, anim: SpeciesAnim | undefined = speciesAnimOf(id)): boolean {
  if (anim) return !!anim.intro || !!anim.idle;
  return idleFrameCount(id) > 1;
}

/** Logical paths of every front frame the species may show (for preloading). */
export function frontPaths(id: SpeciesId, anim: SpeciesAnim | undefined = speciesAnimOf(id)): string[] {
  const n = anim ? animMaxFrame(anim) + 1 : 3;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(speciesPath(id, frontKind(i)));
  return out;
}

/**
 * Playback for one on-screen view of a species (a battle side, a Herbarium
 * page). Call `appear(now)` when the species shows up to play its intro once;
 * `kind(id, now)` then gives the frame to draw. Without `appear` (or for art
 * with no `anim`) it is the plain idle of `idleKind`.
 */
export class SpritePlayback {
  /** Frame the intro started at (null: no intro pending or playing). */
  private at: number | null = null;
  private species: SpeciesId | null = null;
  /** Holding frame 0 until `appear` (e.g. while the sprite slides in). */
  private held = false;

  constructor(private salt = "", private lookup: AnimLookup = speciesAnimOf) {}

  /** The species appeared at frame `now`: play its intro (if its art has one). */
  appear(id: SpeciesId, now: number) {
    this.species = id;
    this.at = now;
    this.held = false;
  }

  /** Hold `id` on frame 0 (Crystal-style art only) until `appear` starts its intro. */
  hold(id: SpeciesId) {
    this.species = id;
    this.at = null;
    this.held = true;
  }

  /** Forget any intro or hold (the view was cleared or the species changed). */
  reset() {
    this.at = null;
    this.species = null;
    this.held = false;
  }

  /** The front frame to draw for `id` at frame `now`. */
  kind(id: SpeciesId, now: number): FrontKind {
    const anim = this.lookup(id);
    if (anim && this.held && this.species === id) return "front";
    // After the intro the idle loop runs on from its first step (no phase offset).
    if (this.at !== null && this.species === id && anim?.intro) return frontKind(animState(anim, now - this.at, { intro: true }).frame);
    return idleKind(id, now, this.salt, anim);
  }

  /** Ticks of the intro still to play at frame `now` (0 if none). */
  remaining(id: SpeciesId, now: number): number {
    if (this.at === null || this.species !== id) return 0;
    return introRemaining(this.lookup(id), now - this.at);
  }

  /** True while an intro is on screen. */
  playing(id: SpeciesId, now: number): boolean {
    return this.remaining(id, now) > 0;
  }
}
