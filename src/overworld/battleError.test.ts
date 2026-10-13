import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleOutcome, GameContext, MapDef, Scene, WorldData } from "../contracts";
import { createQuickened } from "../battle";
import { DATA } from "../data";
import { Fader, Timers } from "../engine/gfx";
import { newGameState } from "../save";
import { wrapText } from "../world/validate";
import { BattleTransition } from "./render";
import { createOverworldScene } from "./index";

// A crashed battle ("error") must never count as a win, and must not trap the
// player in a loop of re-spotting trainers.

const ROOM: MapDef = {
  id: "route_1", name: "TEST", outdoor: false, music: "herbarium", border: "void",
  tiles: ["#######", "#.....#", "#.....#", "#######"], legend: { "#": "wall", ".": "floor_wood" },
  structures: [], warps: [], signs: [], triggers: [],
  npcs: [{ id: "hiker", sprite: "gardener", x: 5, y: 1, facing: "left", movement: "static", trainer: "hiker", sight: 4 }],
} as unknown as MapDef;

function setup(outcomes: BattleOutcome[]) {
  const world: WorldData = {
    maps: { route_1: ROOM } as WorldData["maps"],
    scripts: {},
    trainers: {
      hiker: {
        id: "hiker", name: "ROSS", className: "HIKER", portrait: "gardener", team: [{ species: "oak_acorn", level: 5 }],
        prize: 100, intro: "Hi!", defeat: "Oh.", after: "Well played.", ai: "basic", mark: "bramble_mark",
      },
    } as unknown as WorldData["trainers"],
    newGame: { map: "route_1", x: 1, y: 1, facing: "right", script: "intro" },
  };
  const state = newGameState({ world });
  state.party = [createQuickened(DATA, "great_oak", 30, () => 0.5)];
  state.position = { map: "route_1", x: 1, y: 1, facing: "right" };
  const said: string[] = [];
  const battle = vi.fn(async () => outcomes.shift() ?? "won");
  const ctx = {
    world, state, data: DATA, rng: () => 0.5, timeOfDay: () => "day", assets: { exists: () => false },
    audio: { stopMusic: vi.fn(), playMusic: vi.fn(), playSfx: vi.fn(), current: () => null, playJingle: vi.fn(async () => {}) },
    ui: { say: vi.fn(async (text: string) => { said.push(text); }) },
    battle,
  } as unknown as GameContext;
  vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
  vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
  vi.spyOn(BattleTransition.prototype, "run").mockResolvedValue(undefined);
  const scene = createOverworldScene(ctx, { mode: "continue" }) as Scene & {
    trainerEncounter(id: string): Promise<void>;
    checkTrainers(): boolean;
    loadMap(id: string, x: number, y: number, facing: string): void;
    flow(fn: () => Promise<void>): Promise<void>;
  };
  return { ctx, scene, state, said, battle };
}

afterEach(() => vi.restoreAllMocks());

describe("a crashed trainer battle", () => {
  it("awards nothing, says so in one box, and lets the player fight the trainer again", async () => {
    const { scene, state, said, battle } = setup(["error", "won"]);
    const money = state.money;
    await scene.trainerEncounter("hiker");
    expect(battle).toHaveBeenCalledOnce();
    expect(state.flags.beat_hiker).toBeUndefined();
    expect(state.marks).toEqual([]);
    expect(state.money).toBe(money);
    const notice = said[said.length - 1];
    expect(notice).toBe("Something wilted… The battle is off.");
    expect(wrapText(notice)).toHaveLength(2);
    // The player is in the trainer's sight, but the trainer no longer re-spots them...
    expect(scene.checkTrainers()).toBe(false);
    // ...though talking to them (or coming back) starts the fight again, and a win counts.
    await scene.trainerEncounter("hiker");
    expect(state.flags.beat_hiker).toBe(true);
    expect(state.marks).toEqual(["bramble_mark"]);
  });

  it("spots the player again after the map is reloaded", async () => {
    const { scene, state } = setup(["error"]);
    await scene.trainerEncounter("hiker");
    expect(scene.checkTrainers()).toBe(false);
    scene.loadMap("route_1", 1, 1, "right");
    expect(state.flags.beat_hiker).toBeUndefined();
    expect(scene.checkTrainers()).toBe(true);
  });
});
