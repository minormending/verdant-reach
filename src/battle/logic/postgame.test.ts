import { describe, expect, it } from "vitest";
import type { SpeciesId } from "../../contracts";
import { DATA } from "../../data";
import { createBattleState, executeMove, type BattleEvent } from "./battle";
import { seeded, sequence } from "./rng";
import { createQuickened } from "./stats";

function setup(species: SpeciesId, move: string) {
  const user = createQuickened(DATA, species, 60, seeded(1));
  user.moves = [{ id: move, pp: DATA.moves[move].pp }];
  const target = createQuickened(DATA, "elder", 80, seeded(2));
  const state = createBattleState({ data: DATA, playerParty: [user], playerActive: 0,
    foeParty: [target], wild: true, time: "night" });
  const events: BattleEvent[] = [];
  return { user, target, state, events };
}

describe("Post-game moves in battle", () => {
  it.each([
    { species: "centuryheart", move: "long_bloom_2", side: 0, stat: "spa", delta: -1 },
    { species: "tumbleweed", move: "roll_scatter", side: 0, stat: "spe", delta: 1 },
    { species: "burr", move: "hook_cling", side: 1, stat: "spe", delta: -1 },
  ] as const)("$move damages the foe and changes the intended stat", ({ species, move, side, stat, delta }) => {
    const { user, target, state, events } = setup(species, move);
    const hp = target.hp;
    executeMove(state, 0, 0, true, sequence([0, 0.9]), events);
    expect(target.hp).toBeLessThan(hp);
    expect(state.sides[side].vol.stages[stat]).toBe(delta);
    expect(state.sides[side === 0 ? 1 : 0].vol.stages[stat]).toBe(0);
    expect(user.moves[0].pp).toBe(DATA.moves[move].pp - 1);
  });

  it("Century misses without lowering the user's special attack", () => {
    const { user, target, state, events } = setup("centuryheart", "long_bloom_2");
    const hp = target.hp;
    executeMove(state, 0, 0, true, sequence([0.99]), events);
    expect(events).toContainEqual({ t: "miss", side: 0 });
    expect(target.hp).toBe(hp);
    expect(state.sides[0].vol.stages.spa).toBe(0);
    expect(user.moves[0].pp).toBe(4);
  });

  it("Drift Seed heals a quarter of actual damage dealt", () => {
    const { user, target, state, events } = setup("coconut", "drift_seed");
    user.hp = 1;
    const hp = target.hp;
    executeMove(state, 0, 0, true, sequence([0, 0.9]), events);
    const damage = hp - target.hp;
    expect(damage).toBeGreaterThan(4);
    expect(user.hp).toBe(1 + Math.floor(damage * 0.25));
    expect(events.some((e) => e.t === "hp" && e.side === 0 && e.kind === "drain")).toBe(true);
    expect(user.moves[0].pp).toBe(9);
  });

  it.each([null, "sun", "rain", "frost"] as const)("Old Rings boosts both defences and heals 25%% in %s", (weather) => {
    const { user, target, state, events } = setup("methuselah", "old_rings");
    state.weather = weather ? { kind: weather, turns: 5 } : null;
    user.hp = 1;
    const targetHp = target.hp;
    executeMove(state, 0, 0, true, sequence([0.9]), events);
    expect(state.sides[0].vol.stages).toMatchObject({ def: 1, spd: 1 });
    expect(state.sides[1].vol.stages).toMatchObject({ def: 0, spd: 0 });
    expect(user.hp).toBe(1 + Math.floor(user.stats.hp * 0.25));
    expect(target.hp).toBe(targetHp);
    expect(user.moves[0].pp).toBe(9);
  });

  it("Old Rings still heals at capped defences and boosts at full HP", () => {
    const { user, state, events } = setup("methuselah", "old_rings");
    state.sides[0].vol.stages.def = 6;
    state.sides[0].vol.stages.spd = 6;
    user.hp = user.stats.hp - 1;
    executeMove(state, 0, 0, true, sequence([0.9]), events);
    expect(user.hp).toBe(user.stats.hp);
    expect(state.sides[0].vol.stages).toMatchObject({ def: 6, spd: 6 });
    state.sides[0].vol.stages.def = 0;
    state.sides[0].vol.stages.spd = 0;
    executeMove(state, 0, 0, true, sequence([0.9]), events);
    expect(user.hp).toBe(user.stats.hp);
    expect(state.sides[0].vol.stages).toMatchObject({ def: 1, spd: 1 });
  });
});
