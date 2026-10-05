// Gen 2 experience curves. Our three rates map to:
//   fast   -> Gen 2 "fast"        4n^3 / 5
//   medium -> Gen 2 "medium fast" n^3
//   slow   -> Gen 2 "slow"        5n^3 / 4
// Level 1 always needs 0 exp. Capped at level 100.

import type { Species } from "../contracts";

export function expForLevel(rate: Species["growthRate"], level: number): number {
  const n = Math.max(1, Math.min(100, Math.floor(level)));
  if (n <= 1) return 0;
  const cube = n * n * n;
  switch (rate) {
    case "fast": return Math.floor((4 * cube) / 5);
    case "medium": return cube;
    case "slow": return Math.floor((5 * cube) / 4);
  }
}
