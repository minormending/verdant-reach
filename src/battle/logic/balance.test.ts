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
import { calcTrainerStats } from "./trainer";

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

// Round 3: the same milestones with parties built from the new species the
// player can catch by then (docs/ENCOUNTERS.md), so they can't wall a starter
// either. Snapdragon (the Survey gift) is in the last one.
const MILESTONES_R3: Record<string, Milestone> = {
  hollis_r3: { trainer: () => "hollis", starterLevel: 12, extras: [["clover_sprout", 9]] },
  shears_r3: { trainer: () => "shears", starterLevel: 15, extras: [["mint_sprig", 12], ["holly_seedling", 12]] },
  rival_2_r3: { trainer: (l) => `rival_2_${COUNTER[l]}`, starterLevel: 16, extras: [["foxglove_rosette", 13], ["rose_bud", 13]] },
  nell_r3: { trainer: () => "nell", starterLevel: 18, extras: [["cattail_shoot", 15], ["snapdragon_sprout", 14]] },
};

// Round 4 (Chapter 4). The player arrives in Glasshouse City around lv 18-20
// and meets Flora at ~22. Two party shapes: older lines raised alongside the
// starter, and the new Route 4 / Palm House catches. Neither is a hand-picked
// counter to Bloom, so Flora must be beatable with "whatever you brought".
const MILESTONES_R4: Record<string, Milestone> = {
  rival_3: { trainer: (l) => `rival_3_${COUNTER[l]}`, starterLevel: 22, extras: [["dandelion", 19], ["stinging_nettle", 19], ["apple_sapling", 19]] },
  rival_3_r4: { trainer: (l) => `rival_3_${COUNTER[l]}`, starterLevel: 22, extras: [["apple_sapling", 19], ["dandelion", 19], ["white_clover", 19]] },
  flora: { trainer: () => "flora", starterLevel: 23, extras: [["dandelion", 21], ["stinging_nettle", 21], ["apple_sapling", 21]] },
  flora_r4: { trainer: () => "flora", starterLevel: 23, extras: [["apple_sapling", 21], ["wild_rose", 21], ["dandelion", 21]] },
  flora_r3: { trainer: () => "flora", starterLevel: 23, extras: [["foxglove", 21], ["cattail", 21], ["white_clover", 21]] },
};

// Chapter 5: ordinary mixed parties raised since Flora, at the expected 25–27.
const MILESTONES_R5: Record<string, Milestone> = {
  // By Morrow the player has crossed Route 6 and the Burnt Stand, where fire types
  // (fireweed, skunk cabbage) are the common catches; the Ghost leader is built to
  // reward bringing one, so each party carries at least one Chapter 5 catch.
  morrow: { trainer: () => "morrow", starterLevel: 27, extras: [["dandelion", 25], ["stinging_nettle", 25], ["fireweed_shoot", 25]] },
  morrow_r5: { trainer: () => "morrow", starterLevel: 27, extras: [["fireweed_shoot", 25], ["skunk_cabbage_shoot", 25], ["cedar_seedling", 25]] },
  rival_4: { trainer: (l) => `rival_4_${COUNTER[l]}`, starterLevel: 27, extras: [["dandelion", 25], ["stinging_nettle", 25], ["apple_sapling", 25]] },
  rival_4_r5: { trainer: (l) => `rival_4_${COUNTER[l]}`, starterLevel: 27, extras: [["fireweed_shoot", 25], ["skunk_cabbage_shoot", 25], ["cedar_seedling", 25]] },
};

// Chapter 6: two mixed parties, each carrying catches from Chapters 5 and 6.
// Starters have reached their third stage; catches retain their actual stages.
const MILESTONES_R6: Record<string, Milestone> = {
  saguaro: { trainer: () => "saguaro", starterLevel: 32, extras: [["fireweed_shoot", 29], ["mangrove_sapling", 29], ["eelgrass", 29]] },
  saguaro_r6: { trainer: () => "saguaro", starterLevel: 32, extras: [["skunk_cabbage", 29], ["cedar_seedling", 29], ["eelgrass", 29]] },
  reyes: { trainer: () => "reyes", starterLevel: 34, extras: [["fireweed", 31], ["mangrove_sapling", 31], ["padded_cactus", 31]] },
  reyes_r6: { trainer: () => "reyes", starterLevel: 34, extras: [["skunk_cabbage", 31], ["cedar_seedling", 31], ["vanilla_vine", 31]] },
};
const THIRD_STARTER: Record<Line, SpeciesId> = { oak: "great_oak", chili: "red_chili", lily: "giant_water_lily" };

// Route 4, the Palm House, Route 5 and the Conservatory 3 juniors: ordinary
// fights. With a mid-chapter party they should be comfortable wins.
const CH4_TRAINERS: Record<string, { ids: string[]; m: Omit<Milestone, "trainer"> }> = {
  route_4: {
    ids: ["orchardist_russet", "beekeeper_clem", "schoolkid_tam", "birdwatcher_kit", "hiker_ford"],
    m: { starterLevel: 19, extras: [["dandelion", 17], ["apple_pip", 17], ["white_clover", 17]] },
  },
  palm_house: { ids: ["researcher_lin", "florist_amaryl"], m: { starterLevel: 20, extras: [["dandelion", 18], ["apple_sapling", 18], ["white_clover", 18]] } },
  route_5: { ids: ["gardener_ivy", "hiker_dale"], m: { starterLevel: 22, extras: [["dandelion", 20], ["apple_sapling", 20], ["white_clover", 20]] } },
  juniors: { ids: ["jr_posy", "jr_wexley"], m: { starterLevel: 22, extras: [["dandelion", 20], ["apple_sapling", 20], ["white_clover", 20]] } },
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
      createQuickened(DATA, m.starterLevel >= 30 ? THIRD_STARTER[line] : m.starterLevel >= 16 ? s2 : s1, m.starterLevel, rng),
      ...m.extras.map(([sp, lv]) => createQuickened(DATA, sp, lv, rng)),
    ];
    const f = trainer.team.map((t) => {
      const q = createQuickened(DATA, t.species, t.level, rng);
      // Keep the balance model's random DVs, applying the same collar stat
      // calculation as runtime without changing existing opponents' balance.
      q.stats = calcTrainerStats(DATA, t, q.ivs, q.evs);
      q.hp = q.stats.hp;
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
  for (const [name, m] of Object.entries({ ...MILESTONES, ...MILESTONES_R3, ...MILESTONES_R4, ...MILESTONES_R5 })) {
    it(`${name}: beatable with every starter`, () => {
      const rates = (["oak", "chili", "lily"] as Line[]).map((l) => [l, winRate(l, m)] as const);
      console.log(`${name}: ${rates.map(([l, r]) => `${l} ${(r * 100).toFixed(0)}%`).join(", ")}`);
      // The sim player never heals or switches on purpose, so these floors are
      // pessimistic. Lopsided wins for a type-advantaged starter are fine (as
      // in Crystal); what matters is that no starter is walled.
      for (const [, r] of rates) expect(r).toBeGreaterThan(0.25);
    });
  }

  // Flora is THE difficulty spike: hard, but no starter is walled, and no
  // starter strolls through her either.
  it("flora: a spike, but fair", () => {
    const all = ["flora", "flora_r4", "flora_r3"].flatMap((k) =>
      (["oak", "chili", "lily"] as Line[]).map((l) => winRate(l, MILESTONES_R4[k], 200)));
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    console.log(`flora mean: ${(mean * 100).toFixed(0)}%`);
    expect(Math.min(...all)).toBeGreaterThan(0.25);
    expect(mean).toBeLessThan(0.75); // Nell averages ~80%: Flora must be clearly harder
  });

  it("morrow: easier than Flora's spike", () => {
    const lines: Line[] = ["oak", "chili", "lily"];
    const mean = (rates: number[]) => rates.reduce((a, b) => a + b, 0) / rates.length;
    const flora = ["flora", "flora_r4", "flora_r3"].flatMap((k) => lines.map((l) => winRate(l, MILESTONES_R4[k], 200)));
    const morrow = ["morrow", "morrow_r5"].flatMap((k) => lines.map((l) => winRate(l, MILESTONES_R5[k], 200)));
    console.log(`morrow mean: ${(mean(morrow) * 100).toFixed(0)}%; flora mean: ${(mean(flora) * 100).toFixed(0)}%`);
    expect(Math.min(...morrow)).toBeGreaterThan(0.25);
    expect(mean(morrow)).toBeGreaterThan(mean(flora));
    expect(mean(morrow)).toBeLessThan(0.88); // a real leader, not a walkover (tuned to ~81%)
  });

  it("Chapter 6: Saguaro and Reyes occupy their prescribed bands", () => {
    const rates = (id: string) => [id, `${id}_r6`].flatMap((k) =>
      (["oak", "chili", "lily"] as Line[]).map((l) => winRate(l, MILESTONES_R6[k], 300)));
    const saguaro = rates("saguaro"), reyes = rates("reyes");
    const mean = (r: number[]) => r.reduce((a, b) => a + b, 0) / r.length;
    console.log(`saguaro mean: ${(mean(saguaro) * 100).toFixed(1)}%; reyes mean: ${(mean(reyes) * 100).toFixed(1)}%`);
    for (const r of [saguaro, reyes]) {
      console.log("Chapter 6 party rates (oak/chili/lily):", r.map((x) => (x * 100).toFixed(1)));
      for (const rate of r) expect(rate).toBeGreaterThan(0.25);
    }
    expect(mean(saguaro)).toBeGreaterThanOrEqual(0.72);
    // Lead: Thorn is weak to the fire types every party carries by now, so Saguaro is the
    // gentler Chapter 6 leader (the patient hermit); Reyes stays the harder one.
    expect(mean(saguaro)).toBeLessThanOrEqual(0.9);
    expect(mean(reyes)).toBeGreaterThanOrEqual(0.65);
    expect(mean(reyes)).toBeLessThanOrEqual(0.75);
    expect(mean(reyes)).toBeLessThan(mean(saguaro));
  });

  for (const [area, { ids, m }] of Object.entries(CH4_TRAINERS)) {
    it(`${area} trainers: comfortable with every starter`, () => {
      for (const id of ids) {
        if (!WORLD.trainers[id]) throw new Error(`no trainer ${id}`);
        const rates = (["oak", "chili", "lily"] as Line[]).map((l) => winRate(l, { ...m, trainer: () => id }, 120));
        console.log(`${id}: ${rates.map((r) => `${(r * 100).toFixed(0)}%`).join(", ")}`);
        for (const r of rates) expect(r, id).toBeGreaterThan(0.6);
      }
    });
  }
});
