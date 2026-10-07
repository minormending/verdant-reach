import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { isSelfAnim, MOVE_ANIMS } from "../battle/anims";
import { createQuickened, movesAtLevel } from "../battle/logic/stats";
import { seeded } from "../battle/logic/rng";
import { compatibility, nurseryStep, SEED_CHECK_STEPS } from "../overworld/nursery";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { DATA } from "./index";

const ROSTER = [
  { id: "centuryheart", name: "Centuryheart", types: ["bloom", "dragon"], total: 600,
    move: "long_bloom_2", level: 30, scientific: "Puya raimondii",
    fact: "It can grow for decades before flowering once, then dies.", source: "Puya_raimondii" },
  { id: "tumbleweed", name: "Tumbleweed", types: ["thorn", "wood"], total: 580,
    move: "roll_scatter", level: 60, scientific: "Salsola tragus",
    fact: "When dry, it breaks off at the root and rolls in the wind, scattering seeds as it goes.", source: "Salsola_tragus" },
  { id: "coconut", name: "Coconut", types: ["water", "wood"], total: 580,
    move: "drift_seed", level: 60, scientific: "Cocos nucifera",
    fact: "Its fruit can float and stay viable across long ocean crossings.", source: "Coconut" },
  { id: "burr", name: "Burr", types: ["thorn", "bug"], total: 580,
    move: "hook_cling", level: 60, scientific: "Arctium",
    fact: "Its hooked burrs inspired the invention of Velcro.", source: "Arctium" },
  { id: "methuselah", name: "Methuselah", types: ["wood", "frost"], total: 620,
    move: "old_rings", level: 70, scientific: "Pinus longaeva",
    fact: "Some living bristlecone pines are more than 4,800 years old.", source: "Pinus_longaeva" },
] as const;

describe("Post-game species (POSTGAME.md §2)", () => {
  it("appends the five species in spec order", () => {
    expect(SPECIES_IDS.slice(SPECIES_IDS.indexOf("flame_lily") + 1)).toEqual(ROSTER.map((s) => s.id));
  });

  for (const row of ROSTER) {
    it(`${row.id} is a single stage with its specified types, total and usable signature`, () => {
      const s = DATA.species[row.id];
      expect(s).toMatchObject({ name: row.name, line: row.id, stage: 1, types: row.types, pollination: [] });
      expect(s.growsInto).toBeUndefined();
      expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0)).toBe(row.total);
      if (row.id !== "centuryheart") expect(s.catchRate).toBe(3);
      expect(movesAtLevel(s, row.level)).toContain(row.move);
      const attacks = movesAtLevel(s, row.level).map((id) => DATA.moves[id]).filter((m) => m.category !== "status");
      for (const type of row.types) expect(attacks.some((m) => m.type === type)).toBe(true);
      expect(isSelfAnim(MOVE_ANIMS[row.move])).toBe(row.id === "methuselah");
    });

    it(`${row.id} has exactly the prescribed sourced botanical fact`, () => {
      const h = DATA.herbarium[row.id];
      expect(h.scientificName).toBe(row.scientific);
      const sentences = h.entry.split(/(?<=[.!?])\s+/);
      expect(sentences).toHaveLength(2);
      expect(sentences[1]).toBe(row.fact);
      const text = readFileSync(new URL("./herbarium.ts", import.meta.url), "utf8");
      expect(text).toContain(`// Fact: ${row.fact}\n  // Source: https://en.wikipedia.org/wiki/${row.source}\n  h("${row.id}"`);
    });

    it(`${row.id} cannot breed with itself or any other species, in either nursery slot`, () => {
      const q = createQuickened(DATA, row.id, row.level, seeded(1));
      for (const id of SPECIES_IDS) {
        const other = createQuickened(DATA, id, 60, seeded(2));
        expect(compatibility(DATA, q, other), id).toBe(0);
        expect(compatibility(DATA, other, q), id).toBe(0);
      }
      const state = newGameState({ world: WORLD });
      state.nursery = { slots: [q, createQuickened(DATA, row.id, row.level, seeded(3))],
        steps: SEED_CHECK_STEPS - 1, seedReady: false };
      expect(nurseryStep(state, DATA, () => 0)).toBe(false);
      expect(state.nursery.seedReady).toBe(false);
    });
  }
});

describe("Post-game signatures", () => {
  it("uses the exact numbers and existing effects, including Old Rings healing", () => {
    const signatures = [
      ["long_bloom_2", "Century", "bloom", "special", 100, 90, 5,
        [{ kind: "stat", stat: "spa", stages: -1, chance: 100, target: "self" }]],
      ["roll_scatter", "Roll Scatter", "thorn", "physical", 75, 100, 15,
        [{ kind: "stat", stat: "spe", stages: 1, chance: 100, target: "self" }]],
      ["drift_seed", "Drift Seed", "water", "special", 80, 100, 10, [{ kind: "drain", fraction: 0.25 }]],
      ["hook_cling", "Hook Cling", "bug", "physical", 70, 100, 15,
        [{ kind: "stat", stat: "spe", stages: -1, chance: 100, target: "foe" }]],
      ["old_rings", "Old Rings", "wood", "status", 0, null, 10,
        [{ kind: "stat", stat: "def", stages: 1, chance: 100, target: "self" },
          { kind: "stat", stat: "spd", stages: 1, chance: 100, target: "self" }, { kind: "heal", fraction: 0.25 }]],
    ] as const;
    for (const [id, name, type, category, power, accuracy, pp, effects] of signatures) {
      expect(DATA.moves[id]).toMatchObject({ name, type, category, power, accuracy, pp, effects, priority: 0 });
    }
  });
});
