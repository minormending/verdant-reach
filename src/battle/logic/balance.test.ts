// Balance check for the slice's story battles: for each starter, simulate the
// player (smart AI, a stand-in for a reasonable human) with a party typical
// of that point in the story against each boss, and report win rates. The
// sim player never uses items or deliberate switches, so it's pessimistic;
// the bounds below are deliberately loose.

import { describe, expect, it } from "vitest";
import type { SpeciesId } from "../../contracts";
import { DATA } from "../../data";
import { WORLD } from "../../world";
import { chooseFoeAction } from "./ai";
import { active, canContinue, createBattleState, doSwitch, firstHealthy, resolveTurn, sendOutFoe } from "./battle";
import { seeded } from "./rng";
import { attackStats, typeEffectiveness } from "./damage";
import type { Quickened } from "../../contracts";
import { createQuickened } from "./stats";

type Line = "oak" | "chili" | "lily";
const STARTER: Record<Line, [SpeciesId, SpeciesId]> = {
  oak: ["oak_acorn", "oak_sapling"],
  chili: ["chili_blossom", "green_chili"],
  lily: ["lily_seedpod", "lily_pad"],
};
// Bram's starter is the one strong against the player's.
const COUNTER: Record<Line, Line> = { oak: "chili", chili: "lily", lily: "oak" };

interface Milestone {
  trainer: (line: Line) => string;
  starterLevel: number;
  extras: [SpeciesId, number][];
}

const MILESTONES: Record<string, Milestone> = {
  hollis: { trainer: () => "hollis", starterLevel: 12, extras: [["dandelion_bud", 9]] },
  shears: { trainer: () => "shears", starterLevel: 15, extras: [["dandelion_bud", 12], ["moonflower_seed", 12]] },
  rival_2: { trainer: (l) => `rival_2_${COUNTER[l]}`, starterLevel: 16, extras: [["dandelion", 13], ["nettle_sprout", 13]] },
  nell: { trainer: () => "nell", starterLevel: 18, extras: [["nettle_sprout", 15], ["dandelion", 14]] },
};

/** Human-like policy: the move with the best expected damage (power x STAB x
 *  type x stat ratio); a status move only if nothing deals damage. */
function greedy(me: Quickened, foe: Quickened): { kind: "move"; slot: number } {
  let best = 0, bestScore = -1;
  me.moves.forEach((m, i) => {
    const mv = DATA.moves[m.id];
    if (!mv || m.pp <= 0) return;
    let score = 0;
    if (mv.power > 0) {
      const { atk, def } = attackStats(mv);
      const stab = DATA.species[me.species].types.includes(mv.type) ? 1.5 : 1;
      const eff = typeEffectiveness(DATA.typeChart, mv.type, DATA.species[foe.species].types);
      score = mv.power * stab * eff * (me.stats[atk] / Math.max(1, foe.stats[def])) * ((mv.accuracy ?? 100) / 100);
    }
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return { kind: "move", slot: best };
}

function winRate(line: Line, m: Milestone, n = 300): number {
  const rng = seeded(99);
  const tid = m.trainer(line);
  const trainer = WORLD.trainers[tid];
  if (!trainer) throw new Error(`no trainer ${tid}`);
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const [s1, s2] = STARTER[line];
    const p = [
      createQuickened(DATA, m.starterLevel >= 16 ? s2 : s1, m.starterLevel, rng),
      ...m.extras.map(([sp, lv]) => createQuickened(DATA, sp, lv, rng)),
    ];
    const f = trainer.team.map((t) => {
      const q = createQuickened(DATA, t.species, t.level, rng);
      if (t.moves) q.moves = t.moves.map((id) => ({ id, pp: DATA.moves[id]?.pp ?? 10 }));
      return q;
    });
    const s = createBattleState({
      data: DATA, playerParty: p, playerActive: 0, foeParty: f, wild: false, time: "day",
      // No items on either side: the sim player can't use them, so the foe doesn't either.
      foeTrainer: trainer.name, foeItems: {},
    });
    let guard = 0;
    while (canContinue(p) && canContinue(f) && guard++ < 300) {
      const pa = greedy(active(s, 0), active(s, 1));
      const fa = chooseFoeAction(s, trainer.ai, rng);
      resolveTurn(s, pa, fa, rng);
      if (active(s, 1).hp <= 0) { const k = firstHealthy(f); if (k >= 0) sendOutFoe(s, k); }
      if (active(s, 0).hp <= 0) { const k = firstHealthy(p); if (k >= 0) doSwitch(s, 0, k, []); }
    }
    if (canContinue(p) && !canContinue(f)) wins++;
  }
  return wins / n;
}

describe.skipIf(Object.keys(WORLD.trainers).length === 0)("story battle balance", () => {
  for (const [name, m] of Object.entries(MILESTONES)) {
    it(`${name}: beatable with every starter`, () => {
      const rates = (["oak", "chili", "lily"] as Line[]).map((l) => [l, winRate(l, m)] as const);
      console.log(`${name}: ${rates.map(([l, r]) => `${l} ${(r * 100).toFixed(0)}%`).join(", ")}`);
      // The sim player never heals or switches on purpose, so these floors are
      // pessimistic. Lopsided wins for a type-advantaged starter are fine (as
      // in Crystal); what matters is that no starter is walled.
      for (const [, r] of rates) expect(r).toBeGreaterThan(0.25);
    });
  }
});
