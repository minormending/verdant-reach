// Soak test against the real DATA: thousands of AI-vs-AI turns with every
// species and move, checking invariants (no crashes, HP in range, PP never
// negative, stages in -6..6, battles always end).

import { describe, expect, it } from "vitest";
import type { SpeciesId } from "../../contracts";
import { DATA } from "../../data";
import { chooseFoeAction } from "./ai";
import { active, canContinue, createBattleState, firstHealthy, sendOutFoe, doSwitch, resolveTurn, type BattleEvent, type Side } from "./battle";
import { createQuickened } from "./stats";
import { createTrainerQuickened } from "./trainer";
import { seeded } from "./rng";
import { getMove } from "./lookup";
import { distributeExp, expYield, gainExp } from "./exp";

const ids = Object.keys(DATA.species) as SpeciesId[];

describe.skipIf(ids.length === 0)("simulated battles with DATA", () => {
  it("every move resolves without breaking invariants", () => {
    const rng = seeded(1234);
    let turns = 0;
    for (let b = 0; b < 300; b++) {
      const lvl = 3 + Math.floor(rng() * 40);
      const mkParty = (n: number) =>
        Array.from({ length: n }, () => createQuickened(DATA, ids[Math.floor(rng() * ids.length)], lvl, rng));
      const p = mkParty(3);
      const f = b % 2 === 0 ? mkParty(2) : Array.from({ length: 2 }, (_, index) =>
        createTrainerQuickened(DATA, {
          species: ids[Math.floor(rng() * ids.length)], level: lvl, grafted: index === 1,
        }, rng));
      const s = createBattleState({ data: DATA, playerParty: p, playerActive: 0, foeParty: f, wild: b % 2 === 0, time: b % 3 === 0 ? "night" : "day", foeTrainer: "TEST", foeItems: { water_flask: 1 } });
      let guard = 0;
      while (canContinue(p) && canContinue(f) && guard++ < 200) {
        // Player side uses the same AI, mirrored by swapping sides.
        const mirrored = { ...s, sides: [s.sides[1], s.sides[0]] as typeof s.sides };
        const pa = chooseFoeAction(mirrored, "smart", rng);
        const fa = chooseFoeAction(s, b % 2 ? "smart" : "basic", rng);
        const ev: BattleEvent[] = resolveTurn(s, pa.kind === "item" ? { kind: "none" } : pa, fa, rng);
        turns++;
        for (const e of ev) {
          if (e.t === "hp") {
            expect(e.to).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(e.to)).toBe(true);
          }
        }
        for (const side of [0, 1] as Side[]) {
          for (const q of s.sides[side].party) {
            expect(q.hp).toBeGreaterThanOrEqual(0);
            expect(q.hp).toBeLessThanOrEqual(q.stats.hp);
            for (const m of q.moves) expect(m.pp).toBeGreaterThanOrEqual(0);
          }
          for (const v of Object.values(s.sides[side].vol.stages)) {
            expect(v).toBeGreaterThanOrEqual(-6);
            expect(v).toBeLessThanOrEqual(6);
          }
        }
        if (active(s, 1).hp <= 0) {
          const base = expYield(DATA, active(s, 1), !s.wild);
          for (const sh of distributeExp(p, s.participants, base)) gainExp(DATA, p[sh.index], sh.amount);
          const n = firstHealthy(f);
          if (n >= 0) sendOutFoe(s, n);
        }
        if (active(s, 0).hp <= 0) {
          const n = firstHealthy(p);
          if (n >= 0) doSwitch(s, 0, n, []);
        }
      }
      expect(guard).toBeLessThan(200);
    }
    expect(turns).toBeGreaterThan(300);
  });

  it("every move id in every learnset exists", () => {
    for (const sp of Object.values(DATA.species)) {
      for (const e of sp.learnset) expect(DATA.moves[e.move], `${sp.id} -> ${e.move}`).toBeDefined();
    }
    for (const m of Object.values(DATA.moves)) expect(getMove(DATA, m.id).name.length).toBeLessThanOrEqual(12);
  });
});
