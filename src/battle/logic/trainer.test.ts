import { describe, expect, it } from "vitest";
import type { GameContext, SpeciesId, Stats, TrainerDef } from "../../contracts";
import { DATA } from "../../data";
import { WORLD } from "../../world";
import { wrapText } from "../../ui/font";
import { TextBox } from "../../screens/kit/widgets";
import { FIXTURE_TRAINERS } from "../fixtures";
import { attemptCapture } from "./capture";
import { createBattleState } from "./battle";
import { seeded } from "./rng";
import { calcStats, createQuickened, trainerIvs } from "./stats";
import { calcTrainerStats, createTrainerQuickened, graftCollarText } from "./trainer";

// Test-only: no world trainer wears a collar until Chapter 5 teams are added.
const graftedTrainer: TrainerDef = {
  ...FIXTURE_TRAINERS.dev_hollis,
  team: [
    { species: "oak_sapling", level: 25 },
    { species: "great_oak", level: 27, grafted: true },
  ],
};
const zeroEvs: Stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

describe("trainer graft collars", () => {
  for (const species of ["great_oak", "red_chili", "giant_water_lily"] as SpeciesId[]) {
    it(`${species}: computes all stats five levels lower without changing the team definition`, () => {
      const member = Object.freeze({ species, level: 27, grafted: true });
      const expected = calcStats(DATA.species[species], trainerIvs(), zeroEvs, 22);
      expect(calcTrainerStats(DATA, member)).toEqual(expected);
      expect(calcTrainerStats(DATA, member)).toEqual(expected); // repeatable, no RNG
      const q = createTrainerQuickened(DATA, member, seeded(1));
      expect(q.level).toBe(27);
      expect(q.stats).toEqual(expected);
      expect(q.hp).toBe(expected.hp);
      expect(q.exp).toBe(DATA.expForLevel(DATA.species[species].growthRate, 27));
      expect(q.moves).toEqual(createQuickened(DATA, species, 27, seeded(1)).moves);
      expect(q.ivs).toEqual(trainerIvs());
      expect(q.sport).toBe(false);
      expect(q).not.toHaveProperty("grafted");
    });
  }

  it("floors the stat level at one for low-level grafted opponents", () => {
    for (const level of [1, 3, 5, 6]) {
      const q = createTrainerQuickened(DATA, { species: "great_oak", level, grafted: true }, seeded(1));
      expect(q.stats).toEqual(calcStats(DATA.species.great_oak, trainerIvs(), zeroEvs, 1));
      expect(q.level).toBe(level);
    }
  });

  it("keeps ordinary trainers at full stats and respects explicit moves and PP", () => {
    for (const grafted of [undefined, false]) {
      const moves = DATA.species.great_oak.learnset.slice(0, 2).map((m) => m.move);
      const q = createTrainerQuickened(DATA, { species: "great_oak", level: 27, grafted, moves }, seeded(1));
      expect(q.stats).toEqual(calcStats(DATA.species.great_oak, trainerIvs(), zeroEvs, 27));
      expect(q.moves).toEqual(moves.map((id) => ({ id, pp: DATA.moves[id].pp })));
    }
  });

  it("applies the cap only to trainer opponents, without persisting to player or captured Quickened", () => {
    const player = createQuickened(DATA, "great_oak", 27, seeded(10));
    const before = structuredClone(player);
    const foes = graftedTrainer.team.map((m) => createTrainerQuickened(DATA, m, seeded(1)));
    createBattleState({ data: DATA, playerParty: [player], playerActive: 0, foeParty: foes, wild: false });
    expect(player).toEqual(before);
    expect(player.stats).toEqual(calcStats(DATA.species.great_oak, player.ivs, player.evs, 27));

    const wild = createQuickened(DATA, "great_oak", 27, seeded(10));
    const wildBefore = structuredClone(wild);
    expect(attemptCapture(wild, 255, 255, 0, seeded(2)).caught).toBe(true);
    const caughtParty = [wild]; // capture transfers the same wild Quickened to the party
    expect(caughtParty[0]).toEqual(wildBefore);
    expect(caughtParty[0].stats).toEqual(player.stats);
    expect(JSON.parse(JSON.stringify(caughtParty))[0]).not.toHaveProperty("grafted");
    expect(graftCollarText(DATA, undefined, 0, wild)).toBeNull();
  });

  it("announces the active grafted slot on send-out, including repeated send-outs", () => {
    const foes = graftedTrainer.team.map((m) => createTrainerQuickened(DATA, m, seeded(1)));
    expect(graftCollarText(DATA, graftedTrainer, 0, foes[0])).toBeNull();
    for (let sendOut = 0; sendOut < 2; sendOut++) {
      expect(graftCollarText(DATA, graftedTrainer, 1, foes[1])).toBe("GREAT OAK strains at its GRAFT COLLAR!");
    }
  });

  it("shows the exact sentence within the scrolling 18 by 2 battle text box", () => {
    const drawn: string[] = [];
    const seen = new Set<string>();
    const ctx = {
      ui: { wrap: wrapText, drawWindow() {}, drawText: (_g: unknown, text: string) => drawn.push(text) },
      state: { options: { textSpeed: "fast" } },
    } as unknown as GameContext;
    for (const species of Object.keys(DATA.species) as SpeciesId[]) {
      const q = createTrainerQuickened(DATA, { species, level: 27 }, seeded(1));
      const trainer = { ...graftedTrainer, team: [{ species, level: 27, grafted: true }] };
      const text = graftCollarText(DATA, trainer, 0, q)!;
      const tb = new TextBox(ctx);
      tb.show(text, "wait");
      seen.clear();
      let frames = 0;
      while (!tb.finished && frames++ < 300) {
        tb.update({ pressed: () => true, held: () => true, repeat: () => false });
        drawn.length = 0;
        tb.draw({} as CanvasRenderingContext2D);
        const rows = drawn.filter((s) => s !== "▼");
        expect(rows.length).toBeLessThanOrEqual(2);
        for (const row of rows) { expect(row.length).toBeLessThanOrEqual(18); seen.add(row); }
      }
      expect(tb.finished).toBe(true);
      for (const line of wrapText(text, 18)) expect(seen.has(line), text).toBe(true);
    }
  });

  it("grafts only rival 4's forced starter in the world (Chapter 5)", () => {
    const grafted = Object.values(WORLD.trainers).filter((t) => t.team.some((m) => m.grafted)).map((t) => t.id).sort();
    expect(grafted).toEqual(["rival_4_chili", "rival_4_lily", "rival_4_oak"]);
    for (const id of grafted) expect(WORLD.trainers[id].team.filter((m) => m.grafted)).toHaveLength(1);
  });
});
