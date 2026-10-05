// Small RNG helpers. Every piece of battle logic takes an `Rng` so tests can
// drive it deterministically.

export type Rng = () => number; // [0, 1)

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability p (0..1). */
export function chance(rng: Rng, p: number): boolean {
  if (p >= 1) return true;
  if (p <= 0) return false;
  return rng() < p;
}

/** Percent roll: true with probability pct/100. */
export function pct(rng: Rng, percent: number): boolean {
  return chance(rng, percent / 100);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Weighted pick; weights <= 0 are never chosen unless all are <= 0. */
export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  const ws = items.map((t) => Math.max(0, weight(t)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(rng, items);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Deterministic seeded RNG (mulberry32) for tests and fixtures. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG that replays a fixed sequence (then repeats the last value). */
export function sequence(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
