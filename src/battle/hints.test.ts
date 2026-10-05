import { describe, expect, it } from "vitest";
import { DATA } from "../data";
import { MOVES } from "../data/moves";
import { effectivenessHint, FoeKnowledge, typeMultiplier } from "./hints";
import { ANIM_FAMILIES, animFor, isSelfAnim, MOVE_ANIMS } from "./anims";
import { targetsFoe } from "./logic/battle";

describe("effectivenessHint", () => {
  it("flags super-effective and resisted damaging moves", () => {
    // water beats fire; wood resists wood (see src/data/typeChart.ts)
    expect(typeMultiplier(DATA, "water", ["fire"])).toBeGreaterThan(1);
    expect(effectivenessHint(DATA, DATA.moves.dew_drop, ["fire"])).toBe("SUPER");
    expect(effectivenessHint(DATA, DATA.moves.vine_lash, ["fire"])).toBe("WEAK");
  });
  it("gives no hint for status, fixed-damage or neutral moves", () => {
    expect(effectivenessHint(DATA, DATA.moves.sap_seal, ["fire"])).toBeNull();
    expect(effectivenessHint(DATA, DATA.moves.wither, ["wood"])).toBeNull();
    expect(effectivenessHint(DATA, DATA.moves.fossil_print, ["dragon"])).toBeNull();
    const neutral = Object.values(DATA.moves).find((m) => m.power > 0 && typeMultiplier(DATA, m.type, ["bug"]) === 1)!;
    expect(effectivenessHint(DATA, neutral, ["bug"])).toBeNull();
  });
  it("multiplies dual types", () => {
    const m = typeMultiplier(DATA, "fire", ["wood", "bug"]);
    expect(m).toBe(typeMultiplier(DATA, "fire", ["wood"]) * typeMultiplier(DATA, "fire", ["bug"]));
  });
});

describe("FoeKnowledge", () => {
  it("knows species seen before the battle, and learns new ones", () => {
    const k = new FoeKnowledge(["oak_acorn"]);
    expect(k.knows("oak_acorn")).toBe(true);
    expect(k.knows("nettle_sprout")).toBe(false);
    k.learn("nettle_sprout");
    expect(k.knows("nettle_sprout")).toBe(true);
  });
});

describe("move animations", () => {
  it("every move has an explicit animation family", () => {
    const missing = Object.keys(MOVES).filter((id) => !MOVE_ANIMS[id]);
    expect(missing).toEqual([]);
    for (const spec of Object.values(MOVE_ANIMS)) expect(ANIM_FAMILIES).toContain(spec.family);
  });
  it("uses at least 20 visually distinct families across the move list", () => {
    const used = new Set(Object.values(MOVES).map((m) => animFor(m).family));
    expect(used.size).toBeGreaterThanOrEqual(20);
  });
  it("self animations only go on moves that don't target the foe", () => {
    for (const m of Object.values(MOVES)) {
      if (isSelfAnim(animFor(m))) expect(targetsFoe(m), m.id).toBe(false);
    }
  });
  it("falls back by type for unknown moves", () => {
    expect(animFor({ id: "brand_new", type: "fire", category: "special" }).family).toBe("ember");
  });
});
