import { describe, expect, it } from "vitest";
import { FIXTURE_DATA } from "../fixtures";
import { canContinue, canFight, firstHealthy } from "./battle";
import { distributeExp, itemGrowthTarget, growthTarget } from "./exp";
import { applyItem, itemHasEffect } from "./items";
import { qName } from "./lookup";
import { createQuickened } from "./stats";

const data = FIXTURE_DATA;
const rng = () => 0.5;

describe("Nursery seeds in battle", () => {
  it("are never a lead, a switch-in or a reason to keep fighting, and earn no exp", () => {
    const seed = createQuickened(data, "oak_acorn", 5, rng);
    seed.seed = { steps: 900 };
    const fighter = createQuickened(data, "oak_acorn", 10, rng);
    const party = [seed, fighter];
    expect(canFight(seed)).toBe(false);
    expect(firstHealthy(party)).toBe(1);
    expect(firstHealthy(party, 1)).toBe(-1);
    fighter.hp = 0;
    expect(canContinue(party)).toBe(false);
    fighter.hp = 10;
    expect(distributeExp(party, new Set([fighter.uid]), 40).map((s) => s.index)).toEqual([1]);
  });

  it("can't take items, can't grow, and are called SEED", () => {
    const seed = createQuickened(data, "oak_acorn", 5, rng);
    seed.seed = { steps: 10 };
    seed.hp = 1;
    const potion = Object.keys(data.items).find((id) => data.items[id].effect.kind === "heal")!;
    expect(itemHasEffect(data, potion, seed)).toBe(false);
    expect(applyItem(data, potion, seed).ok).toBe(false);
    seed.level = 99;
    expect(growthTarget(data, seed, "day")).toBeNull();
    expect(itemGrowthTarget(data, seed, potion)).toBeNull();
    expect(qName(data, seed)).toBe("SEED");
  });
});
