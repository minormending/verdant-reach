import { describe, expect, it } from "vitest";
import type { Quickened, SpeciesId } from "../../contracts";
import { FIXTURE_DATA } from "../fixtures";
import {
  addFriendship, applyGrowth, distributeExp, expProgress, expYield, gainEvs, gainExp, growthTarget,
  itemGrowthTarget, replaceMove, tryLearn,
} from "./exp";
import { createQuickened } from "./stats";
import { seeded } from "./rng";

const data = FIXTURE_DATA;
const mk = (s: SpeciesId, l: number): Quickened => createQuickened(data, s, l, seeded(l));

describe("exp yield", () => {
  it("is floor(base * level / 7), x1.5 for trainers", () => {
    const foe = mk("dandelion_bud", 7); // base 50
    expect(expYield(data, foe, false)).toBe(50);
    expect(expYield(data, foe, true)).toBe(75);
  });
});

describe("exp distribution", () => {
  it("participants get full, sat-out members half, wilted nothing", () => {
    const a = mk("oak_acorn", 5), b = mk("chili_blossom", 5), c = mk("lily_seedpod", 5), d = mk("dandelion_bud", 5);
    d.hp = 0;
    const shares = distributeExp([a, b, c, d], new Set([a.uid, c.uid]), 100);
    expect(shares).toEqual([
      { index: 0, amount: 100, participant: true },
      { index: 2, amount: 100, participant: true },
      { index: 1, amount: 50, participant: false },
    ]);
  });
});

describe("level-up", () => {
  it("levels up through multiple levels with stat and friendship gains", () => {
    const q = mk("oak_acorn", 5);
    const f0 = q.friendship;
    const need = data.expForLevel("slow", 8) - q.exp;
    const ups = gainExp(data, q, need);
    expect(ups.map((u) => u.level)).toEqual([6, 7, 8]);
    expect(q.level).toBe(8);
    expect(ups[0].newMoves).toEqual(["root_tap"]);
    expect(ups[2].newStats.hp).toBeGreaterThanOrEqual(ups[0].oldStats.hp);
    expect(q.friendship).toBe(f0 + 15);
  });
  it("expProgress is between 0 and 1", () => {
    const q = mk("oak_acorn", 5);
    expect(expProgress(data, q)).toBe(0);
    gainExp(data, q, 10);
    expect(expProgress(data, q)).toBeGreaterThan(0);
    expect(expProgress(data, q)).toBeLessThan(1);
  });
  it("caps at level 100", () => {
    const q = mk("dandelion_bud", 99);
    gainExp(data, q, 10_000_000);
    expect(q.level).toBe(100);
    expect(gainExp(data, q, 100)).toEqual([]);
  });
});

describe("move learning", () => {
  it("learns with room, reports full at four, replaces a slot", () => {
    const q = mk("oak_acorn", 1);
    expect(tryLearn(data, q, "root_tap")).toBe("learned");
    expect(tryLearn(data, q, "root_tap")).toBe("known");
    expect(tryLearn(data, q, "leaf_blade")).toBe("learned");
    expect(tryLearn(data, q, "curl_up")).toBe("full");
    replaceMove(data, q, 0, "curl_up");
    expect(q.moves[0]).toEqual({ id: "curl_up", pp: 10 });
  });
});

describe("growth triggers", () => {
  it("vigor at the level", () => {
    const q = mk("oak_acorn", 15);
    expect(growthTarget(data, q, "day")).toBeNull();
    q.level = 16;
    expect(growthTarget(data, q, "night")).toBe("oak_sapling");
  });
  it("vigor_day only in morning/day", () => {
    const q = mk("sunflower_seedling", 10);
    expect(growthTarget(data, q, "morning")).toBe("sunflower_bud");
    expect(growthTarget(data, q, "day")).toBe("sunflower_bud");
    expect(growthTarget(data, q, "night")).toBeNull();
  });
  it("vigor_night only at night", () => {
    const q = mk("moonflower_seed", 14);
    expect(growthTarget(data, q, "night")).toBe("moonflower_vine");
    expect(growthTarget(data, q, "day")).toBeNull();
  });
  it("tending needs friendship", () => {
    const q = mk("oak_sapling", 30);
    expect(growthTarget(data, q, "day")).toBeNull();
    addFriendship(q, 200);
    expect(q.friendship).toBe(255);
    expect(growthTarget(data, q, "day")).toBe("great_oak");
  });
  it("item growth only via items", () => {
    const q = mk("oak_acorn", 50);
    expect(itemGrowthTarget(data, q, "water_flask")).toBeNull();
  });
  it("applyGrowth changes species and stats", () => {
    const q = mk("oak_acorn", 16);
    const hp = q.stats.hp;
    const moves = applyGrowth(data, q, "oak_sapling");
    expect(q.species).toBe("oak_sapling");
    expect(q.stats.hp).toBeGreaterThan(hp);
    expect(moves).toEqual(["sprout_up"]);
  });
});

describe("EVs", () => {
  it("defaults to +1 in the best base stat and caps", () => {
    const q = mk("oak_acorn", 5);
    gainEvs(data, q, "dandelion_bud"); // best base stat: spe 60
    expect(q.evs.spe).toBe(1);
    for (let i = 0; i < 400; i++) gainEvs(data, q, "dandelion_bud");
    expect(q.evs.spe).toBe(252);
  });
});
