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
  it("builds a new game at the world's start with the home as heal point", () => {
    const s = newGameState({ world });
    expect(s.position).toEqual({ map: "herbarium_roof", x: 4, y: 6, facing: "up" });
    expect(s.heal).toEqual({ map: "player_home", x: 3, y: 5 });
    expect(s.rivalName).toBe("BRAM");
    expect(s.party).toEqual([]);
    expect(s.version).toBe(1);
  });

  it("round-trips state, play time and date through storage", () => {
    const storage = memoryStorage();
    let state: GameState = newGameState({ world });
    state.playerName = "SAGE";
    state.money = 1234;
    state.flags = { got_starter: true };
    state.bag = { terrarium_pod: 5 };
    state.marks = ["bramble_mark"];
    state.herbarium = { seen: ["oak_acorn", "dandelion_bud"], caught: ["oak_acorn"] };
    state.playTimeMs = 3_725_000;
    state.position = { map: "route_2", x: 9, y: 4, facing: "left" };
    state.options = { textSpeed: "fast" };
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
    expect(JSON.parse(storage.raw.get(OPTIONS_KEY)!)).toEqual({ textSpeed: "fast" });
    expect(loadOptions(storage)).toEqual({ textSpeed: "fast" });

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
