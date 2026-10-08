import { describe, expect, it, vi } from "vitest";
import type { GameContext, GameData, GameState, PollinationGroup, SpeciesId, WorldData } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle/logic/stats";
import { newGameState } from "../save";
import { runScript, type ScriptHost } from "./script";
import { nurseryOf } from "./nursery";

const species = { ...DATA.species };
for (const id of ["oak_acorn", "maple_samara"] as SpeciesId[]) species[id] = { ...species[id], pollination: ["woodland"] as PollinationGroup[] };
const data: GameData = { ...DATA, species };
const world = { maps: {}, scripts: {}, trainers: {}, newGame: { map: "glasshouse_nursery", x: 1, y: 1, facing: "down", script: "x" } } as unknown as WorldData;

function setup(opts: { choices?: number[]; yesNo?: boolean[]; picks?: number[] }) {
  const said: string[] = [];
  const prompts: string[][] = [];
  const choices = [...(opts.choices ?? [])];
  const yes = [...(opts.yesNo ?? [])];
  const picks = [...(opts.picks ?? [])];
  const state: GameState = newGameState({ world });
  state.playerName = "ROWAN";
  const rng = () => 0.5;
  state.party = [createQuickened(data, "oak_acorn", 10, rng), createQuickened(data, "maple_samara", 12, rng), createQuickened(data, "dandelion_bud", 8, rng)];
  const ctx = {
    state, data, world, rng,
    audio: { playSfx: vi.fn(), playCry: async () => {}, playJingle: async () => {} },
    ui: {
      say: async (t: string) => { said.push(t.replace(/\{PLAYER\}/g, "ROWAN")); },
      choose: async (o: string[]) => { prompts.push(o); return choices.shift() ?? -1; },
      yesNo: async () => yes.shift() ?? true,
    },
    screens: { party: async () => picks.shift() ?? -1 },
  } as unknown as GameContext;
  const host = { ctx, mapId: () => "glasshouse_nursery", map: () => undefined } as unknown as ScriptHost;
  return { host, state, said, prompts };
}

describe("nursery counter (op: nursery)", () => {
  it("boards two plants with a stable menu order, then cancels", async () => {
    const { host, state, said, prompts } = setup({ choices: [0, 0, 2], picks: [0, 0] });
    await runScript(host, [{ op: "nursery" }]);
    expect(prompts).toEqual([
      ["BOARD", "CANCEL"],
      ["BOARD", "CHECK", "TAKE BACK", "CANCEL"],
      ["CHECK", "TAKE BACK", "CANCEL"],
    ]);
    expect(nurseryOf(state).slots.map((q) => q.species)).toEqual(["oak_acorn", "maple_samara"]);
    expect(state.party.map((q) => q.species)).toEqual(["dandelion_bud"]);
    expect(said.some((s) => s.includes("OAK ACORN"))).toBe(true);
  });

  it("refuses to board the last healthy plant, or a seed", async () => {
    const { host, state, said } = setup({ choices: [0, 0, -1], picks: [0, 1] });
    state.party = state.party.slice(0, 2);
    state.party[1].seed = { steps: 900 };
    await runScript(host, [{ op: "nursery" }]);
    expect(nurseryOf(state).slots).toHaveLength(0);
    expect(state.party).toHaveLength(2);
    expect(said).toContain("You'd have no healthy QUICKENED left with you!");
    expect(said).toContain("A SEED can't board. Keep it close and warm!");
  });

  it("charges the fee to take a boarder back, and refuses when short", async () => {
    // BOARD the maple, then TAKE BACK (index 2 of [BOARD, CHECK, TAKE BACK, CANCEL]) with only $50
    const { host, state, said } = setup({ choices: [0, 2, -1], picks: [1], yesNo: [true] });
    state.money = 50;
    await runScript(host, [{ op: "nursery" }]);
    expect(said).toContain("Oh dear, you're a little short.");
    expect(nurseryOf(state).slots).toHaveLength(1);
    state.money = 1000;
    const b = nurseryOf(state).slots[0];
    b.level += 2;
    const again = setup({ choices: [2, -1], yesNo: [true] });
    again.state.party = state.party;
    again.state.nursery = state.nursery;
    again.state.money = 1000;
    await runScript(again.host, [{ op: "nursery" }]);
    expect(again.state.money).toBe(700);
    expect(again.state.party.map((q) => q.species)).toContain("maple_samara");
    expect(nurseryOf(again.state).slots).toHaveLength(0);
  });

  it("hands over a ready seed first, and ifNurserySeed sees it", async () => {
    const { host, state, said } = setup({ choices: [0, 0, -1], picks: [0, 0], yesNo: [true] });
    await runScript(host, [{ op: "nursery" }]);
    const marker: string[] = [];
    const probe = async () => {
      marker.length = 0;
      await runScript(host, [{ op: "ifNurserySeed", then: [{ op: "setFlag", flag: "hint" }], else: [{ op: "setFlag", flag: "hint", value: false }] }]);
      return state.flags.hint;
    };
    expect(await probe()).toBe(false);
    nurseryOf(state).seedReady = true;
    expect(await probe()).toBe(true);
    const before = state.party.length;
    const s2 = setup({ yesNo: [true], choices: [-1] });
    s2.state.party = state.party;
    s2.state.nursery = state.nursery;
    await runScript(s2.host, [{ op: "nursery" }]);
    expect(s2.said[0]).toMatch(/set a SEED/);
    expect(s2.said).toContain("ROWAN received a SEED!");
    expect(state.party).toHaveLength(before + 1);
    const seed = state.party[state.party.length - 1];
    expect(seed.seed?.steps).toBeGreaterThan(0);
    expect(seed.species).toBe("oak_acorn");
    expect(nurseryOf(state).seedReady).toBe(false);
    void said;
  });

  it("keeps the seed waiting when the party is full", async () => {
    const { host, state, said } = setup({});
    nurseryOf(state).slots.push(createQuickened(data, "oak_acorn", 10, () => 0.5));
    nurseryOf(state).seedReady = true;
    while (state.party.length < 6) state.party.push(createQuickened(data, "oak_acorn", 5, () => 0.5));
    await runScript(host, [{ op: "nursery" }]);
    expect(said[1]).toMatch(/party's full/);
    expect(nurseryOf(state).seedReady).toBe(true);
  });

  it("writes concise lines for the shared text box", async () => {
    const { host, said } = setup({ choices: [0, 1, -1], picks: [0] });
    await runScript(host, [{ op: "nursery" }]);
    for (const s of said) expect(s.length).toBeLessThanOrEqual(72);
  });
});
