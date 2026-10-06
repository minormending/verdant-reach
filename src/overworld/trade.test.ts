import { describe, expect, it } from "vitest";
import type { GameState, Quickened } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle/logic/stats";
import { seeded } from "../battle/logic/rng";
import { canTrade, swapTrade } from "./trade";

const plant = (species: Quickened["species"] = "oak_acorn") => createQuickened(DATA, species, 12, seeded(1));

describe("NPC trade logic", () => {
  it("accepts only wanted non-seeds, including wilted plants", () => {
    const q = plant();
    expect(canTrade(q, ["maple_samara", "oak_acorn"])).toBe(true);
    q.hp = 0;
    expect(canTrade(q, ["oak_acorn"])).toBe(true);
    expect(canTrade(q, ["maple_samara"])).toBe(false);
    expect(canTrade(q, [])).toBe(false);
    expect(canTrade(undefined, ["oak_acorn"])).toBe(false);
    q.seed = { steps: 10 };
    expect(canTrade(q, ["oak_acorn"])).toBe(false);
  });

  it("replaces just the chosen slot even in a full party and records receipt once", () => {
    const state: Pick<GameState, "party" | "herbarium"> = {
      party: Array.from({ length: 6 }, () => plant()), herbarium: { seen: ["oak_acorn"], caught: ["oak_acorn"] },
    };
    const before = [...state.party];
    const received = plant("maple_samara");
    expect(swapTrade(state, 3, ["oak_acorn"], received)).toBe(true);
    expect(state.party).toHaveLength(6);
    expect(state.party[3]).toBe(received);
    before.forEach((q, i) => { if (i !== 3) expect(state.party[i]).toBe(q); });
    expect(state.party).not.toContain(before[3]);
    expect(state.herbarium).toEqual({ seen: ["oak_acorn", "maple_samara"], caught: ["oak_acorn", "maple_samara"] });
    expect(swapTrade(state, 2, ["oak_acorn"], plant("maple_samara"))).toBe(true);
    expect(state.herbarium.caught).toEqual(["oak_acorn", "maple_samara"]);
  });

  it("can trade the sole non-seed without ever removing its party slot", () => {
    const seed = plant();
    seed.seed = { steps: 10 };
    const state = { party: [seed, plant()], herbarium: { seen: [], caught: [] } };
    const received = plant("maple_samara");
    expect(swapTrade(state, 1, ["oak_acorn"], received)).toBe(true);
    expect(state.party).toEqual([seed, received]);
    expect(state.party.some((q) => !q.seed)).toBe(true);
  });

  it("leaves everything untouched for an invalid slot, unwanted plant or seed", () => {
    const seed = plant();
    seed.seed = { steps: 10 };
    const state = { party: [plant("maple_samara"), seed], herbarium: { seen: [], caught: [] } };
    const before = structuredClone(state);
    for (const slot of [-1, 0, 1, 2]) expect(swapTrade(state, slot, ["oak_acorn"], plant())).toBe(false);
    expect(state).toEqual(before);
  });

  it("asserts that receipt cannot leave an all-seed party before changing anything", () => {
    const state = { party: [plant()], herbarium: { seen: [], caught: [] } };
    const received = plant();
    received.seed = { steps: 10 };
    const before = structuredClone(state);
    expect(() => swapTrade(state, 0, ["oak_acorn"], received)).toThrow(/non-seed/);
    expect(state).toEqual(before);
  });
});
