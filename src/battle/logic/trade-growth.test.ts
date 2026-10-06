import { describe, expect, it } from "vitest";
import type { GameData } from "../../contracts";
import { DATA } from "../../data";
import { createQuickened } from "./stats";
import { seeded } from "./rng";
import { crossPollinationTarget, growthTarget, itemGrowthTarget } from "./exp";

const data: GameData = {
  ...DATA,
  species: {
    ...DATA.species,
    oak_acorn: { ...DATA.species.oak_acorn, growsInto: { species: "oak_sapling", trigger: { kind: "cross_pollination" } } },
  },
};

describe("cross-pollination growth on receipt", () => {
  it("targets trade growth at any level, without firing on level-up or item use", () => {
    for (const level of [1, 16, 60]) {
      const q = createQuickened(data, "oak_acorn", level, seeded(1));
      expect(crossPollinationTarget(data, q)).toBe("oak_sapling");
      for (const time of ["morning", "day", "night"] as const) expect(growthTarget(data, q, time)).toBeNull();
      expect(itemGrowthTarget(data, q, "ember_ash")).toBeNull();
    }
  });

  it("excludes seeds, other triggers, and plants without growth", () => {
    const q = createQuickened(data, "oak_acorn", 60, seeded(1));
    expect(crossPollinationTarget(DATA, q)).toBeNull();
    q.seed = { steps: 10 };
    expect(crossPollinationTarget(data, q)).toBeNull();
    expect(crossPollinationTarget(data, createQuickened(data, "great_oak", 60, seeded(1)))).toBeNull();
    expect(crossPollinationTarget(data, createQuickened(data, "oak_sapling", 60, seeded(1)))).toBeNull();
  });

  it("rejects a missing target species", () => {
    const broken = { ...data, species: { ...data.species } };
    delete (broken.species as Partial<GameData["species"]>).oak_sapling;
    expect(crossPollinationTarget(broken, createQuickened(broken, "oak_acorn", 16, seeded(1)))).toBeNull();
  });
});
