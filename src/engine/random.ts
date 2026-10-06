import { seeded, type Rng } from "../battle/logic/rng";

/** URL seeds are unsigned 32-bit integers, and never apply to production. */
export function devSeed(): number | null {
  if (!import.meta.env.DEV || typeof location === "undefined") return null;
  const value = new URLSearchParams(location.search).get("seed");
  if (value === null || !/^\d+$/.test(value)) return null;
  const seed = Number(value);
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff ? seed : null;
}

/** Stable independent streams: cosmetic/NPC draws cannot shift battle rolls. */
export function randomStream(seed: number, name: string): Rng {
  let hash = seed >>> 0;
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return seeded(hash);
}

/** Covers legacy direct draws (save ids, dev battles, particles and audio).
 * Keep these separate from ctx.rng so drawing a particle cannot change a crit. */
export function installDevRandom(): void {
  const seed = devSeed();
  if (seed !== null) Math.random = randomStream(seed, "direct");
}
