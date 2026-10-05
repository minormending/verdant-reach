import { describe, expect, it } from "vitest";
import type { Quickened } from "../../contracts";
import { FIXTURE_DATA } from "../fixtures";
import {
  accStageMult, calcDamage, critChance, newStages, statStageMult, typeEffectiveness, weatherMult,
} from "./damage";
import { createQuickened, trainerIvs, recalcStats } from "./stats";
import { seeded } from "./rng";

const data = FIXTURE_DATA;

function mk(species: Parameters<typeof createQuickened>[1], level: number): Quickened {
  const q = createQuickened(data, species, level, seeded(level));
  q.ivs = trainerIvs();
  recalcStats(data, q);
  q.hp = q.stats.hp;
  return q;
}

const base = (attacker: Quickened, defender: Quickened, moveId: string, extra: Partial<Parameters<typeof calcDamage>[0]> = {}) =>
  calcDamage({
    data, attacker, defender, atkStages: newStages(), defStages: newStages(),
    move: data.moves[moveId], weather: null, crit: false, roll: 100, ...extra,
  });

describe("type chart", () => {
  it("returns 1 for missing entries", () => {
    expect(typeEffectiveness(data.typeChart, "dragon", ["wood"])).toBe(1);
  });
  it("multiplies dual types", () => {
    expect(typeEffectiveness(data.typeChart, "fire", ["wood", "bug"])).toBe(4);
    expect(typeEffectiveness(data.typeChart, "water", ["wood", "thorn"])).toBe(1); // 0.5 * 2
    expect(typeEffectiveness(data.typeChart, "ghost", ["wood", "bloom"])).toBe(0);
  });
});

describe("stage multipliers", () => {
  it("stat stages run 2/8 .. 8/2", () => {
    expect(statStageMult(0)).toBe(1);
    expect(statStageMult(1)).toBe(1.5);
    expect(statStageMult(6)).toBe(4);
    expect(statStageMult(-6)).toBe(0.25);
    expect(statStageMult(9)).toBe(4);
  });
  it("accuracy stages run 3/9 .. 9/3", () => {
    expect(accStageMult(-6)).toBeCloseTo(1 / 3);
    expect(accStageMult(6)).toBe(3);
  });
});

describe("damage formula", () => {
  const oak = mk("oak_acorn", 20);
  const lily = mk("lily_seedpod", 20);
  const chili = mk("chili_blossom", 20);

  it("applies STAB", () => {
    const a = mk("oak_acorn", 20);
    const bud = mk("dandelion_bud", 20);
    const withStab = base(a, bud, "leaf_blade");
    const noStabMove = { ...data.moves.leaf_blade, type: "dragon" as const };
    const noStab = calcDamage({ data, attacker: a, defender: bud, atkStages: newStages(), defStages: newStages(), move: noStabMove, weather: null, crit: false, roll: 100 });
    expect(withStab.stab).toBe(true);
    expect(noStab.stab).toBe(false);
    // wood and dragon are both neutral on bloom; STAB is the only difference
    expect(withStab.damage).toBeGreaterThan(noStab.damage);
    expect(withStab.damage / noStab.damage).toBeGreaterThan(1.3);
  });

  it("applies the type multiplier", () => {
    const vsWater = base(oak, lily, "leaf_blade");
    const vsFire = base(oak, chili, "leaf_blade");
    expect(vsWater.effectiveness).toBe(2);
    expect(vsFire.effectiveness).toBe(0.5);
    expect(vsWater.damage).toBeGreaterThan(vsFire.damage * 3);
  });

  it("deals 0 on immunity", () => {
    const moon = mk("moonflower_seed", 20);
    const r = base(moon, oak, "shadow_vine");
    expect(r.effectiveness).toBe(0);
    expect(r.damage).toBe(0);
  });

  it("crits double damage", () => {
    const n = base(oak, lily, "tackle");
    const c = base(oak, lily, "tackle", { crit: true });
    expect(c.damage / n.damage).toBeGreaterThan(1.7);
    expect(c.damage).toBeGreaterThan(n.damage);
  });

  it("random roll spans 85..100%", () => {
    const hi = base(oak, lily, "leaf_blade", { roll: 100 }).damage;
    const lo = base(oak, lily, "leaf_blade", { roll: 85 }).damage;
    expect(lo).toBeLessThan(hi);
    expect(lo / hi).toBeGreaterThan(0.8);
  });

  it("uses the physical/special split per move", () => {
    const a = mk("chili_blossom", 30);
    const target = mk("dandelion_bud", 30);
    const special = base(a, target, "ember");
    a.stats.spa = 1;
    const weak = base(a, target, "ember");
    expect(weak.damage).toBeLessThan(special.damage);
    const phys = base(a, target, "tackle");
    a.stats.spa = 999;
    expect(base(a, target, "tackle").damage).toBe(phys.damage);
  });

  it("weather boosts fire in sun and water in rain", () => {
    expect(weatherMult("sun", "fire")).toBe(1.5);
    expect(weatherMult("sun", "water")).toBe(0.5);
    expect(weatherMult("rain", "water")).toBe(1.5);
    expect(weatherMult("rain", "fire")).toBe(0.5);
    const plain = base(chili, oak, "ember").damage;
    const sunny = base(chili, oak, "ember", { weather: "sun" }).damage;
    expect(sunny).toBeGreaterThan(plain);
  });

  it("scorch halves physical attack only", () => {
    const a = mk("oak_acorn", 30);
    const t = mk("dandelion_bud", 30);
    const n = base(a, t, "leaf_blade").damage;
    a.status = "scorch";
    expect(base(a, t, "leaf_blade").damage).toBeLessThan(n * 0.6);
  });

  it("stat stages change damage; crits ignore bad stages", () => {
    const n = base(oak, lily, "tackle").damage;
    const up = base(oak, lily, "tackle", { atkStages: { ...newStages(), atk: 2 } }).damage;
    expect(up).toBeGreaterThan(n * 1.7);
    const defUp = { ...newStages(), def: 6 };
    const critVsWall = base(oak, lily, "tackle", { crit: true, defStages: defUp }).damage;
    const critPlain = base(oak, lily, "tackle", { crit: true }).damage;
    expect(critVsWall).toBe(critPlain);
  });

  it("crit chance table", () => {
    expect(critChance(0)).toBeCloseTo(17 / 256);
    expect(critChance(1)).toBeCloseTo(1 / 8);
    expect(critChance(10)).toBe(0.5);
  });

  it("always does at least 1", () => {
    const weak = mk("dandelion_bud", 2);
    const tank = mk("great_oak", 100);
    expect(base(weak, tank, "tackle").damage).toBeGreaterThanOrEqual(1);
  });
});
