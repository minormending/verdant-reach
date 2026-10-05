import { describe, expect, it } from "vitest";
import { FIXTURE_DATA } from "../fixtures";
import { seeded, sequence } from "./rng";
import {
  calcStat, calcStats, createQuickened, healParty, movesAtLevel, recalcStats, rollIvs, trainerIvs,
} from "./stats";
import { getSpecies } from "./lookup";

const data = FIXTURE_DATA;

describe("stat formulas", () => {
  it("matches the Gen 2 HP formula", () => {
    // Base 50, IV 15, EV 0, L50: floor((65*2)*50/100) + 50 + 10 = 65 + 60 = 125
    expect(calcStat("hp", 50, 15, 0, 50)).toBe(125);
  });
  it("matches the Gen 2 other-stat formula", () => {
    // Base 100, IV 15, EV 252 (63), L100: (230 + 63) + 5 = 298
    expect(calcStat("atk", 100, 15, 252, 100)).toBe(298);
    // Base 55, IV 0, L5: floor(110*5/100) + 5 = 5 + 5 = 10
    expect(calcStat("atk", 55, 0, 0, 5)).toBe(10);
  });
  it("level 1 HP is at least 11", () => {
    expect(calcStat("hp", 1, 0, 0, 1)).toBe(11);
  });
  it("calcStats covers every stat", () => {
    const s = calcStats(getSpecies(data, "oak_acorn"), trainerIvs(), { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, 10);
    expect(Object.keys(s).sort()).toEqual(["atk", "def", "hp", "spa", "spd", "spe"]);
    expect(s.hp).toBeGreaterThan(s.atk);
  });
});

describe("IVs", () => {
  it("rolls DVs in 0..15 with Gen 2 HP and shared special", () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const iv = rollIvs(rng);
      for (const v of Object.values(iv)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(15); }
      expect(iv.spa).toBe(iv.spd);
      expect(iv.hp).toBe(((iv.atk & 1) << 3) | ((iv.def & 1) << 2) | ((iv.spe & 1) << 1) | (iv.spa & 1));
    }
  });
});

describe("learnset selection", () => {
  const oak = getSpecies(data, "oak_acorn");
  it("takes level-1 moves at level 1", () => {
    expect(movesAtLevel(oak, 1)).toEqual(["tackle", "sap_seal"]);
  });
  it("keeps the last four learned up to the level", () => {
    expect(movesAtLevel(oak, 13)).toEqual(["sap_seal", "root_tap", "leaf_blade", "curl_up"]);
    expect(movesAtLevel(oak, 16)).toEqual(["root_tap", "leaf_blade", "curl_up", "sprout_up"]);
  });
  it("ignores moves above the level", () => {
    expect(movesAtLevel(oak, 8)).toEqual(["tackle", "sap_seal", "root_tap"]);
  });
});

describe("createQuickened", () => {
  it("builds a full-HP Quickened with level moves and full PP", () => {
    const q = createQuickened(data, "oak_acorn", 9, seeded(1));
    expect(q.level).toBe(9);
    expect(q.hp).toBe(q.stats.hp);
    expect(q.moves.map((m) => m.id)).toEqual(["tackle", "sap_seal", "root_tap", "leaf_blade"]);
    expect(q.moves[3].pp).toBe(15);
    expect(q.exp).toBe(data.expForLevel("slow", 9));
    expect(q.status).toBeNull();
    expect(q.friendship).toBe(70);
  });
  it("rolls a sport at 1/512", () => {
    // First 4 draws are IVs, then the uid may draw; the sport check uses rng() < 1/512.
    const sport = createQuickened(data, "oak_acorn", 5, sequence([0.5, 0.5, 0.5, 0.5, 0.001]));
    const normal = createQuickened(data, "oak_acorn", 5, sequence([0.5, 0.5, 0.5, 0.5, 0.5]));
    expect(sport.sport).toBe(true);
    expect(normal.sport).toBe(false);
    let n = 0;
    const rng = seeded(99);
    for (let i = 0; i < 20000; i++) if (createQuickened(data, "dandelion_bud", 3, rng).sport) n++;
    expect(n).toBeGreaterThan(15);
    expect(n).toBeLessThan(80);
  });
  it("survives unknown species ids", () => {
    const q = createQuickened(data, "pumpkin" as never, 5, seeded(3));
    expect(q.stats.hp).toBeGreaterThan(0);
  });
});

describe("healParty / recalcStats", () => {
  it("restores HP, PP and status", () => {
    const q = createQuickened(data, "chili_blossom", 10, seeded(2));
    q.hp = 1; q.status = "scorch"; q.moves[0].pp = 0;
    const w = createQuickened(data, "oak_acorn", 10, seeded(3));
    w.hp = 0;
    healParty([q, w], data);
    expect(q.hp).toBe(q.stats.hp);
    expect(q.status).toBeNull();
    expect(q.moves[0].pp).toBe(data.moves[q.moves[0].id].pp);
    expect(w.hp).toBe(w.stats.hp);
  });
  it("raises current HP by the max-HP gain", () => {
    const q = createQuickened(data, "oak_acorn", 10, seeded(4));
    q.hp = 10;
    const before = q.stats.hp;
    q.level = 20;
    recalcStats(data, q);
    expect(q.hp).toBe(10 + (q.stats.hp - before));
  });
});
