import { describe, expect, it } from "vitest";
import type { GameState, WorldData } from "../contracts";
import {
  OPTIONS_KEY, SAVE_KEY, battleAnimsOn, beginNewGameSession, createSave, followerOn, formatPlayTime, loadOptions,
  newGameState, normalizeState, storeOptions,
} from "./index";

const world = {
  maps: {
    player_home: { healPoint: { x: 3, y: 5 } },
  },
  newGame: { map: "herbarium_roof", x: 4, y: 6, facing: "up", script: "prologue" },
} as unknown as WorldData;

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("save", () => {
  it("migrates a pre-Council v1 save without inventing Hall of Fame entries", () => {
    const storage = memoryStorage();
    const old = newGameState({ world });
    old.playerName = "SAGE";
    old.flags.ch10_done = true;
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 1, savedAt: 42, gameId: "old", state: old }));
    const save = createSave(() => old, storage, () => newGameState({ world }));
    expect(save.read()).toEqual(old);
    expect(save.read()).not.toHaveProperty("hallOfFame");
    const loaded = save.read()!;
    loaded.hallOfFame = [[{ species: "great_oak", level: 66, nickname: "ACORN" }]];
    const updatedSave = createSave(() => loaded, storage);
    updatedSave.write();
    expect(updatedSave.read()!.hallOfFame).toEqual(loaded.hallOfFame);
    expect(updatedSave.read()!.flags.ch10_done).toBe(true);
  });

  it("round-trips multiple clears, preserving team order and optional nicknames", () => {
    const storage = memoryStorage();
    const state = newGameState({ world });
    state.playerName = "SAGE";
    state.hallOfFame = [
      [{ species: "great_oak", level: 66, nickname: "ACORN" }, { species: "dandelion", level: 60 }],
      [{ species: "dandelion", level: 100 }],
    ];
    const save = createSave(() => state, storage);
    save.write();
    expect(save.read()).toEqual(state);
    expect(save.read()!.hallOfFame![0][1]).not.toHaveProperty("nickname");
    state.hallOfFame = [];
    save.write();
    expect(save.read()!.hallOfFame).toEqual([]);
  });

  it("drops malformed Hall of Fame records while retaining complete valid teams", () => {
    const fallback = newGameState({ world });
    const valid = [{ species: "great_oak", level: 66, nickname: "ACORN", hp: 40 }];
    const loaded = normalizeState({ ...fallback, hallOfFame: [
      null, "junk", [{ species: "unknown", level: 60 }],
      [{ species: "great_oak", level: 0 }], [{ species: "great_oak", level: 101 }],
      [{ species: "great_oak", level: 60.5 }], [{ species: "great_oak", level: 60, nickname: 5 }],
      Array(7).fill({ species: "great_oak", level: 60 }), valid,
    ] }, fallback)!;
    expect(loaded.hallOfFame).toEqual([[{ species: "great_oak", level: 66, nickname: "ACORN" }]]);
    expect(normalizeState({ ...fallback, hallOfFame: {} }, fallback)).not.toHaveProperty("hallOfFame");
  });

  it("round-trips a player rafting on water and keeps older saves unmounted", () => {
    const storage = memoryStorage();
    const state = newGameState({ world });
    state.playerName = "SAGE";
    state.rafting = true;
    state.position = { map: "route_1", x: 2, y: 3, facing: "right" };
    state.bag.lily_raft = 1;
    const save = createSave(() => state, storage, () => newGameState({ world }));
    save.write();
    expect(save.read()).toEqual(state);
    state.rafting = false;
    save.write();
    expect(save.read()!.rafting).toBe(false);
    delete state.rafting;
    save.write();
    expect(save.read()).not.toHaveProperty("rafting");
    expect(normalizeState({ ...state, rafting: "yes" }, state)).not.toHaveProperty("rafting");
  });

  it("builds a new game at the world's start with the home as heal point", () => {
    const s = newGameState({ world });
    expect(s.position).toEqual({ map: "herbarium_roof", x: 4, y: 6, facing: "up" });
    expect(s.heal).toEqual({ map: "player_home", x: 3, y: 5 });
    expect(s.rivalName).toBe("BRAM");
    expect(s.party).toEqual([]);
    expect(s.version).toBe(1);
  });

  it.each([
    { follower: false, battleAnims: true },
    { follower: true, battleAnims: false },
  ])("round-trips state, play time and date through storage with toggles %j", (toggles) => {
    const storage = memoryStorage();
    let state: GameState = newGameState({ world });
    state.playerName = "SAGE";
    state.money = 1234;
    state.flags = {
      got_starter: true,
      visited_fallowfield: true,
      visited_bramblegate: true,
      visited_glasshouse_city: false,
      pruned_route_1_2_0: true,
      pruned_route_2_5_3: false,
    };
    state.harvested = { hedgerow_1: "2026-10-05", hedgerow_2: "2026-10-06" };
    state.bag = { terrarium_pod: 5 };
    state.marks = ["bramble_mark"];
    state.herbarium = { seen: ["oak_acorn", "dandelion_bud"], caught: ["oak_acorn"] };
    state.playTimeMs = 3_725_000;
    state.position = { map: "route_2", x: 9, y: 4, facing: "left" };
    state.options = { textSpeed: "fast", ...toggles };
    const save = createSave(() => state, storage, () => newGameState({ world }));
    expect(save.exists()).toBe(false);
    const before = Date.now();
    save.write();
    expect(save.exists()).toBe(true);

    const env = JSON.parse(storage.raw.get(SAVE_KEY)!);
    expect(env.v).toBe(1);
    expect(env.savedAt).toBeGreaterThanOrEqual(before);

    const loaded = save.read()!;
    expect(loaded).toEqual(state);
    expect(save.meta()).toMatchObject({ playerName: "SAGE", marks: 1, herbarium: 1, playTimeMs: 3_725_000 });
    expect(formatPlayTime(loaded.playTimeMs)).toBe("1:02");
    // options are remembered separately for the title screen
    expect(JSON.parse(storage.raw.get(OPTIONS_KEY)!)).toEqual(state.options);
    expect(loadOptions(storage)).toEqual(state.options);

    save.clear();
    expect(save.exists()).toBe(false);
    expect(save.read()).toBeNull();
    state = loaded;
  });

  it("tags saves with a game id so a new game can warn before overwriting", () => {
    const storage = memoryStorage();
    const state = newGameState({ world });
    const save = createSave(() => state, storage, () => newGameState({ world }));
    save.write();
    const first = save.envelope()!.gameId;
    beginNewGameSession();
    save.write();
    expect(save.envelope()!.gameId).not.toBe(first);
  });

  it("rejects corrupt or future saves and repairs missing fields", () => {
    const storage = memoryStorage();
    const fallback = () => newGameState({ world });
    const save = createSave(fallback, storage, fallback);
    storage.setItem(SAVE_KEY, "{not json");
    expect(save.read()).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 99, savedAt: 0, gameId: "x", state: fallback() }));
    expect(save.read()).toBeNull();

    const partial = normalizeState({ position: { map: "fallowfield", x: 1, y: 2 }, money: -5 }, fallback())!;
    expect(partial.position.facing).toBe("down");
    expect(partial.money).toBe(0);
    expect(partial.bag).toEqual({});
    expect(partial.playerName).toBe("ROWAN");
    expect(normalizeState({ position: { map: "nowhere", x: 0, y: 0 } }, fallback())).toBeNull();
  });

  it("keeps the follower / battle animation toggles (default on) and harvest dates", () => {
    const storage = memoryStorage();
    storeOptions({ textSpeed: "slow", follower: false, battleAnims: true }, storage);
    expect(loadOptions(storage)).toEqual({ textSpeed: "slow", follower: false, battleAnims: true });
    storage.setItem(OPTIONS_KEY, JSON.stringify({ textSpeed: "warp", follower: "yes" }));
    expect(loadOptions(storage)).toEqual({ textSpeed: "mid" });
    expect(followerOn({ textSpeed: "mid" })).toBe(true);
    expect(followerOn({ textSpeed: "mid", follower: false })).toBe(false);
    expect(battleAnimsOn(undefined)).toBe(true);

    const fallback = newGameState({ world });
    expect(fallback.harvested).toEqual({});
    const s = normalizeState({
      position: { map: "hedgerow", x: 1, y: 1, facing: "up" },
      options: { textSpeed: "fast", battleAnims: false },
      harvested: { hedgerow_1: "2026-10-05", junk: 5, bad: "yesterday" },
    }, fallback)!;
    expect(s.options).toEqual({ textSpeed: "fast", battleAnims: false });
    expect(s.harvested).toEqual({ hedgerow_1: "2026-10-05" });
    expect(normalizeState({ position: { map: "hedgerow", x: 1, y: 1 } }, fallback)!.harvested).toEqual({});
  });
});

describe("save migration (Round 4: nursery and seeds)", () => {
  const q = (species: string, extra: object = {}) => ({
    uid: species, species, level: 10, exp: 0, hp: 20, stats: {}, ivs: {}, evs: {}, moves: [], status: null, friendship: 70, sport: false, ...extra,
  });

  it("loads a pre-Round-4 save (no nursery, no seeds) unchanged", () => {
    const storage = memoryStorage();
    const old = { v: 1, savedAt: 1, gameId: "g", state: {
      version: 1, playerName: "SAGE", rivalName: "BRAM", money: 500, party: [q("oak_acorn")], box: [], bag: {}, flags: { got_starter: true },
      marks: [], herbarium: { seen: ["oak_acorn"], caught: ["oak_acorn"] }, position: { map: "route_2", x: 1, y: 2, facing: "up" },
      heal: { map: "player_home", x: 3, y: 5 }, playTimeMs: 10, options: { textSpeed: "mid" },
    } };
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = createSave(() => newGameState({ world }), storage, () => newGameState({ world })).read()!;
    expect(loaded).not.toBeNull();
    expect(loaded.nursery).toBeUndefined();
    expect("nursery" in loaded).toBe(false);
    expect(loaded.party[0].seed).toBeUndefined();
    expect(loaded.party[0].species).toBe("oak_acorn");
    expect(loaded.harvested).toEqual({});
    expect(loaded.flags).toEqual({ got_starter: true });
    expect(loaded.flags.visited_bramblegate).toBeUndefined();
    expect(loaded.flags.pruned_route_1_2_0).toBeUndefined();
    expect(loaded.options).toEqual({ textSpeed: "mid" });
    expect(followerOn(loaded.options)).toBe(true);
    expect(battleAnimsOn(loaded.options)).toBe(true);
  });

  it.each([false, true])("round-trips two boarders, boarding level, steps and party seeds with seedReady=%s", (seedReady) => {
    const storage = memoryStorage();
    const state = newGameState({ world });
    state.party = [q("oak_acorn"), q("maple_samara", { seed: { steps: 412 } })] as never;
    state.nursery = {
      slots: [q("dandelion_bud", { boardedLevel: 8 }), q("maple_samara")] as never,
      steps: 200,
      seedReady,
    };
    const save = createSave(() => state, storage, () => newGameState({ world }));
    save.write();
    const loaded = save.read()!;
    expect(loaded.nursery).toEqual(state.nursery);
    expect(loaded.nursery!.slots).toHaveLength(2);
    expect(loaded.nursery!.slots[0].boardedLevel).toBe(8);
    expect(loaded.nursery!.slots[1].boardedLevel).toBeUndefined();
    expect(loaded.party).toEqual(state.party);
    expect(loaded.party[1].seed).toEqual({ steps: 412 });
  });

  it("repairs a damaged nursery and seed countdowns", () => {
    const fallback = newGameState({ world });
    const raw = {
      ...fallback,
      party: [q("oak_acorn", { seed: { steps: "lots" } }), q("lily_pad", { seed: { steps: 12.7 } })],
      nursery: { slots: [q("a"), q("b"), q("c"), "junk"], steps: -5, seedReady: "yes" },
    };
    const st = normalizeState(raw, fallback)!;
    expect(st.nursery!.slots).toHaveLength(2);
    expect(st.nursery!.steps).toBe(0);
    expect(st.nursery!.seedReady).toBe(false);
    expect(st.party[0].seed).toEqual({ steps: 0 });
    expect(st.party[1].seed).toEqual({ steps: 12 });
    expect(normalizeState({ ...fallback, nursery: [] }, fallback)!.nursery).toBeUndefined();
  });
});
