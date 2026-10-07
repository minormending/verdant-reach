import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameContext, MapDef, MapId, Scene, WorldData } from "../contracts";
import { createQuickened } from "../battle";
import { DATA } from "../data";
import { Fader, Timers } from "../engine/gfx";
import { newGameState } from "../save";
import { createOverworldScene } from "./index";
import { runScript, type ScriptHost } from "./script";

function map(id: MapId, onWhiteout?: string): MapDef {
  return {
    id, name: "TEST", outdoor: false, music: "herbarium", border: "void",
    tiles: ["#####", "#...#", "#...#", "#####"], legend: { "#": "wall", ".": "floor_wood" },
    structures: [], warps: [], npcs: [], signs: [], triggers: [], onWhiteout,
  };
}

function setup(withHook = true) {
  const world: WorldData = {
    maps: {
      route_1: map("route_1", withHook ? "ch11_whiteout" : undefined),
      player_home: { ...map("player_home", "home_whiteout"), healPoint: { x: 1, y: 1 } },
      council_hall: map("council_hall"),
    } as WorldData["maps"],
    scripts: {
      home_whiteout: [{ op: "setFlag", flag: "wrong_hook" }],
      ch11_whiteout: [{ op: "if", when: [{ flag: "council_run", is: true }], then: [
        { op: "say", text: "RECOVERED" },
        ...["council_run", "beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper"]
          .map((flag) => ({ op: "setFlag" as const, flag, value: false })),
        { op: "warp", to: "council_hall", x: 2, y: 2, facing: "up" },
      ] }],
    },
    trainers: {},
    newGame: { map: "route_1", x: 1, y: 1, facing: "down", script: "intro" },
  };
  const state = newGameState({ world });
  state.money = 501;
  state.rafting = true;
  state.party = [createQuickened(DATA, "great_oak", 66, () => 0.5)];
  state.party[0].hp = 0;
  state.party[0].status = "blight";
  state.party[0].moves.forEach((m) => { m.pp = 0; });
  state.flags = {
    council_run: true, beat_council_1: true, beat_council_2: true,
    beat_council_3: true, beat_council_4: true, beat_keeper: true, ch10_done: true,
  };
  const ctx = {
    world, state, data: DATA, rng: () => 0.5, timeOfDay: () => "day", assets: { exists: () => false },
    audio: { stopMusic: vi.fn(), playMusic: vi.fn(), playSfx: vi.fn(), current: () => null },
    ui: { say: vi.fn(async (text: string) => {
      if (text === "RECOVERED") {
        expect(state.position).toEqual({ ...state.heal, facing: "up" });
        expect(state.party[0].hp).toBe(state.party[0].stats.hp);
        expect(state.party[0].status).toBeNull();
        expect(state.money).toBe(251);
        expect(state.rafting).toBeUndefined();
      }
    }) },
  } as unknown as GameContext;
  vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
  vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
  const scene = createOverworldScene(ctx, { mode: "none" }) as Scene & { whiteout(): Promise<void>; host: ScriptHost };
  return { ctx, scene, state };
}

afterEach(() => vi.restoreAllMocks());

describe("map whiteout hook", () => {
  it("runs the losing map's hook after recovery, resetting a Council run and returning to its lobby", async () => {
    const { ctx, scene, state } = setup();
    await scene.whiteout();
    expect(ctx.ui.say).toHaveBeenLastCalledWith("RECOVERED", undefined);
    expect(state.position).toEqual({ map: "council_hall", x: 2, y: 2, facing: "up" });
    expect(state.flags).toMatchObject({
      council_run: false, beat_council_1: false, beat_council_2: false,
      beat_council_3: false, beat_council_4: false, beat_keeper: false, ch10_done: true,
    });
    expect(state.flags.wrong_hook).toBeUndefined();
    expect(state.party[0].moves.every((m) => m.pp === DATA.moves[m.id].pp)).toBe(true);
  });

  it("keeps ordinary whiteouts unchanged when the losing map has no hook", async () => {
    const { ctx, scene, state } = setup(false);
    await scene.whiteout();
    expect(state.position).toEqual({ ...state.heal, facing: "up" });
    expect(state.flags.council_run).toBe(true);
    expect(state.flags.wrong_hook).toBeUndefined();
    expect(ctx.ui.say).not.toHaveBeenCalledWith("RECOVERED", undefined);
    expect(state.money).toBe(251);
    expect(state.party[0].hp).toBe(state.party[0].stats.hp);
  });

  it("runs the hook on a scripted loss and still aborts the losing script", async () => {
    const { scene, state } = setup();
    vi.spyOn(scene.host, "battle").mockResolvedValue("lost");
    await expect(runScript(scene.host, [
      { op: "wildBattle", species: "great_oak", level: 66 },
      { op: "setFlag", flag: "should_not_run" },
    ])).rejects.toThrow("whiteout");
    expect(state.flags.beat_keeper).toBe(false);
    expect(state.flags.should_not_run).toBeUndefined();
    expect(state.position.map).toBe("council_hall");
  });
});
