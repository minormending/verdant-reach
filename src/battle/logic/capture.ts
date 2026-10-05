// Capture (terrarium pods) and running away.

import type { Quickened } from "../../contracts";
import { chance, type Rng } from "./rng";

export interface CaptureResult {
  caught: boolean;
  /** Wobbles to animate before the click or the break-out (0..3). */
  shakes: 0 | 1 | 2 | 3;
  critical: boolean;
}

/**
 * Gen 2 catch value "a" (1..255):
 *   a = floor((3*maxHP - 2*HP) * catchRate * podMultiplier / (3*maxHP))
 * plus a status bonus (+10 dormant/frostbite, +5 for the others).
 * Low HP raises a; at a = 255 the pod always holds.
 */
export function catchValue(target: Quickened, catchRate: number, podMultiplier: number): number {
  const M = Math.max(1, target.stats.hp);
  const H = Math.max(0, Math.min(M, target.hp));
  let a = Math.floor(((3 * M - 2 * H) * catchRate * podMultiplier) / (3 * M));
  if (target.status === "dormant" || target.status === "frostbite") a += 10;
  else if (target.status) a += 5;
  return Math.max(1, Math.min(255, a));
}

/** Probability that a single wobble check passes: (a/255)^(1/4). */
export function shakeProbability(a: number): number {
  return Math.pow(Math.max(1, Math.min(255, a)) / 255, 0.25);
}

/** Overall catch probability for a given a (all four checks pass). */
export function catchProbability(a: number): number {
  return a >= 255 ? 1 : Math.pow(shakeProbability(a), 4);
}

/** Critical capture multiplier scales with how many species are already caught. */
export function criticalMultiplier(caughtCount: number): number {
  if (caughtCount >= 30) return 2.5;
  if (caughtCount >= 20) return 2;
  if (caughtCount >= 10) return 1.5;
  if (caughtCount >= 5) return 1;
  if (caughtCount >= 1) return 0.5;
  return 0;
}

export function criticalChance(a: number, caughtCount: number): number {
  return Math.min(1, (Math.min(255, a) / 255) * criticalMultiplier(caughtCount) / 6);
}

export function attemptCapture(
  target: Quickened, catchRate: number, podMultiplier: number, caughtCount: number, rng: Rng,
): CaptureResult {
  const a = catchValue(target, catchRate, podMultiplier);
  if (a >= 255) return { caught: true, shakes: 3, critical: false };
  const p = shakeProbability(a);
  if (chance(rng, criticalChance(a, caughtCount))) {
    // A critical capture is a single wobble check.
    const caught = chance(rng, p);
    return { caught, shakes: 1, critical: true };
  }
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (!chance(rng, p)) return { caught: false, shakes: Math.min(3, shakes) as 0 | 1 | 2 | 3, critical: false };
    shakes++;
  }
  return { caught: true, shakes: 3, critical: false };
}

/**
 * Gen 2 escape odds. Always escapes when at least as fast. Otherwise
 *   F = floor(playerSpeed * 32 / (floor(foeSpeed / 4) mod 256)) + 30 * attempts
 * and escape succeeds when F > 255 or random(0..255) < F.
 * `attempts` counts previous failed tries this battle.
 */
export function runChance(playerSpeed: number, foeSpeed: number, attempts: number): number {
  if (playerSpeed >= foeSpeed) return 1;
  const b = Math.floor(foeSpeed / 4) % 256;
  if (b === 0) return 1;
  const f = Math.floor((playerSpeed * 32) / b) + 30 * attempts;
  if (f > 255) return 1;
  return f / 256;
}

export function tryRun(playerSpeed: number, foeSpeed: number, attempts: number, rng: Rng): boolean {
  return chance(rng, runChance(playerSpeed, foeSpeed, attempts));
}
