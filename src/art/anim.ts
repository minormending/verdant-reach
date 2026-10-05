// Crystal-style species animations (docs/ART.md §3, `anim`). Pure: parsing
// and checking the bundle field, and the playback state machine that turns
// "ticks since the species appeared" into a front frame index. Shared by the
// registry, the validator, the game's sprite views and the Art Lab.

import type { AnimStep, SpeciesAnim } from "../contracts";

/** Most front frames a species bundle may have (front, front__2 … front__8). */
export const MAX_FRONT_FRAMES = 8;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isTicks = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;
const isFrame = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/**
 * Problems with a bundle's `anim` field (merged JSON), given how many front
 * frames the bundle has. Empty when it is absent or valid.
 */
export function checkSpeciesAnim(anim: unknown, frontCount: number): string[] {
  if (anim === undefined) return [];
  if (!isObj(anim)) return ["anim must be an object with optional intro / idle step lists"];
  const out: string[] = [];
  for (const key of ["intro", "idle"] as const) {
    const steps = anim[key];
    if (steps === undefined) continue;
    if (!Array.isArray(steps) || steps.length === 0) { out.push(`anim.${key} must be a non-empty list of [frame, ticks] steps`); continue; }
    steps.forEach((s, i) => {
      if (!Array.isArray(s) || s.length !== 2) { out.push(`anim.${key}[${i}] must be [frame, ticks]`); return; }
      const [frame, ticks] = s as unknown[];
      if (!isFrame(frame)) out.push(`anim.${key}[${i}] frame ${JSON.stringify(frame)} must be a whole number ≥ 0`);
      else if (frame >= frontCount) out.push(`anim.${key}[${i}] frame ${frame} does not exist (frames.front has ${frontCount})`);
      if (!isTicks(ticks)) out.push(`anim.${key}[${i}] ticks ${JSON.stringify(ticks)} must be a positive whole number`);
    });
    if (key === "intro") {
      const last = steps[steps.length - 1];
      if (Array.isArray(last) && last[0] !== 0) out.push("anim.intro must end on frame 0");
    }
  }
  return out;
}

/** Keep only well-formed steps ([whole frame ≥ 0, positive whole ticks]). */
function cleanSteps(v: unknown): AnimStep[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: AnimStep[] = [];
  for (const s of v) if (Array.isArray(s) && s.length === 2 && isFrame(s[0]) && isTicks(s[1])) out.push([s[0], s[1]]);
  return out.length ? out : undefined;
}

/**
 * The runtime view of a bundle's `anim`: malformed steps are dropped (the
 * validator reports them), and an intro that doesn't end on frame 0 gets a
 * 1-tick frame 0 appended so playback always lands on the rest pose.
 * Undefined when the bundle has no `anim` object.
 */
export function parseSpeciesAnim(raw: unknown): SpeciesAnim | undefined {
  if (!isObj(raw)) return undefined;
  const intro = cleanSteps(raw.intro);
  const idle = cleanSteps(raw.idle);
  if (intro && intro[intro.length - 1][0] !== 0) intro.push([0, 1]);
  // Any `anim` object (even `{}`) opts out of the legacy ping-pong: at worst it holds frame 0.
  const out: SpeciesAnim = {};
  if (intro) out.intro = intro;
  if (idle) out.idle = idle;
  return out;
}

/** Total ticks of a step list. */
export function stepsLength(steps: readonly AnimStep[] | undefined): number {
  let n = 0;
  for (const s of steps ?? []) n += s[1];
  return n;
}

/** Index of the step showing at tick `t` (0 ≤ t < length), clamped to the last step. */
export function stepAt(steps: readonly AnimStep[], t: number): number {
  let local = Math.max(0, Math.floor(t));
  for (let i = 0; i < steps.length; i++) {
    if (local < steps[i][1]) return i;
    local -= steps[i][1];
  }
  return steps.length - 1;
}

export type AnimPhase = "intro" | "idle" | "hold";

export interface AnimState {
  phase: AnimPhase;
  /** Front frame index to draw (0 = `front`). */
  frame: number;
  /** Step index within the current phase's list (-1 while holding). */
  step: number;
}

/**
 * The playback state machine. `t` is ticks since the species appeared.
 * With `intro` true the intro plays once (t in [0, introLength)), then `idle`
 * loops from its first step; with no idle the creature holds frame 0.
 * With `intro` false playback starts straight in the idle loop.
 */
export function animState(anim: SpeciesAnim, t: number, opts: { intro?: boolean } = {}): AnimState {
  const tt = Math.max(0, Math.floor(t));
  const introLen = opts.intro ? stepsLength(anim.intro) : 0;
  if (anim.intro && tt < introLen) {
    const step = stepAt(anim.intro, tt);
    return { phase: "intro", frame: anim.intro[step][0], step };
  }
  const idleLen = stepsLength(anim.idle);
  if (anim.idle && idleLen > 0) {
    const step = stepAt(anim.idle, (tt - introLen) % idleLen);
    return { phase: "idle", frame: anim.idle[step][0], step };
  }
  return { phase: "hold", frame: 0, step: -1 };
}

/** Ticks of the intro still to play at `t` (0 when done or absent). */
export function introRemaining(anim: SpeciesAnim | undefined, t: number): number {
  return Math.max(0, stepsLength(anim?.intro) - Math.max(0, Math.floor(t)));
}

/** The highest front frame index the animation uses (for preloading). */
export function animMaxFrame(anim: SpeciesAnim | undefined): number {
  let m = 0;
  for (const s of [...(anim?.intro ?? []), ...(anim?.idle ?? [])]) m = Math.max(m, s[0]);
  return m;
}
