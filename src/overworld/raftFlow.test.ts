import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleRequest, Dir, GameContext, MapDef, MapId, Scene } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle";
import { Fader, Timers } from "../engine/gfx";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { Actor } from "./actor";
import { createOverworldScene } from "./index";
import type { ScriptHost } from "./script";

const shore: MapDef = {
  id: "route_1", name: "RAFT TEST", outdoor: true, music: "route", border: "void",
  tiles: ["#####", "#.~~#", "#...#", "#####"],
  legend: { "#": "wall", ".": "grass", "~": "water" },
  structures: [], warps: [], npcs: [], signs: [], triggers: [],
  encounters: { water: { rate: 100, slots: [{ species: "lily_pad", minLevel: 12, maxLevel: 12, weight: 100 }] } },
};

type TestScene = Scene & {
  player: Actor;
  host: ScriptHost;
  attemptMove(dir: Dir): void;
  useWarp(w: MapDef["warps"][number]): Promise<void>;
  whiteout(): Promise<void>;
  wildEncounter(species: string, level: number, kind: string): Promise<void>;
  backdrop(): BattleRequest["backdrop"];
  followerVisible(): boolean;
  loadMap(id: MapId, x: number, y: number, dir: Dir): void;
};

function setup(rafting = false) {
  const world = { ...WORLD, maps: { ...WORLD.maps, route_1: structuredClone(shore) } };
  const state = newGameState({ world });
  state.position = { map: "route_1", x: rafting ? 2 : 1, y: 1, facing: "right" };
  state.bag.lily_raft = 1;
  if (rafting) state.rafting = true;
  const ctx = {
    state, world, data: DATA, rng: vi.fn(() => 0), assets: { exists: () => false },
    timeOfDay: () => "day",
    audio: { playSfx: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null },
    input: { pressed: () => false, held: () => false, repeat: () => false },
    ui: { yesNo: vi.fn().mockResolvedValue(true), say: vi.fn().mockResolvedValue(undefined) },
  } as unknown as GameContext;
  const scene = createOverworldScene(ctx, { mode: "continue" }) as TestScene;
  const encounter = vi.spyOn(scene, "wildEncounter").mockResolvedValue(undefined);
  return { ctx, scene, encounter };
}

function finishStep(scene: TestScene) {
  for (let i = 0; i < 8; i++) scene.update(1000 / 60);
}

afterEach(() => vi.restoreAllMocks());

describe("RAFT overworld flow", () => {
  it("asks on A, mounts only on yes, and rolls the first water step", async () => {
    const { ctx, scene, encounter } = setup();
    ctx.input.pressed = (button) => button === "a";
    scene.update(0);
    ctx.input.pressed = () => false;
    await vi.waitFor(() => expect(scene.player.moving).toBe(true));
    expect(ctx.ui.yesNo).toHaveBeenCalledWith("Ride the LILY RAFT?");
    expect(ctx.state.rafting).toBe(true);
    expect(scene.backdrop()).toBe("water");
    finishStep(scene);
    await vi.waitFor(() => expect(encounter).toHaveBeenCalledWith("lily_pad", 12, "water"));
    expect(ctx.state.position).toEqual({ map: "route_1", x: 2, y: 1, facing: "right" });
  });

  it("declining or lacking the item keeps the player on land without rolling water", async () => {
    const { ctx, scene, encounter } = setup();
    vi.mocked(ctx.ui.yesNo).mockResolvedValue(false);
    ctx.input.pressed = (button) => button === "a";
    scene.update(0);
    ctx.input.pressed = () => false;
    await vi.waitFor(() => expect(ctx.ui.yesNo).toHaveBeenCalledTimes(1));
    expect(scene.player.x).toBe(1);
    expect(ctx.state.rafting).toBeUndefined();
    expect(encounter).not.toHaveBeenCalled();
    delete ctx.state.bag.lily_raft;
    scene.attemptMove("right");
    finishStep(scene);
    expect(scene.player.x).toBe(1);
    expect(encounter).not.toHaveBeenCalled();
  });

  it("continues rafting after loading, rolls water steps, and dismounts on shore", () => {
    const { ctx, scene, encounter } = setup(true);
    expect(ctx.state.rafting).toBe(true);
    scene.attemptMove("right");
    finishStep(scene);
    expect(ctx.state.rafting).toBe(true);
    expect(encounter).toHaveBeenCalledTimes(1);
    scene.attemptMove("down");
    finishStep(scene);
    expect(ctx.state.rafting).toBeUndefined();
    expect(ctx.state.position).toMatchObject({ x: 3, y: 2 });
    expect(encounter).toHaveBeenCalledTimes(1);
  });

  it("keeps the follower tucked until the player takes a step from land", () => {
    const { ctx, scene } = setup(true);
    ctx.state.party = [createQuickened(DATA, "oak_acorn", 5, () => 0)];
    scene.update(0);
    expect(scene.followerVisible()).toBe(false);
    scene.attemptMove("down");
    finishStep(scene);
    expect(scene.followerVisible()).toBe(false);
    scene.attemptMove("right");
    finishStep(scene);
    expect(scene.followerVisible()).toBe(true);
  });

  it.each(["tile", "script"])("ends rafting on a %s warp", async (kind) => {
    const { ctx, scene } = setup(true);
    vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
    vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
    if (kind === "tile") await scene.useWarp({ x: 2, y: 1, to: "route_1", toX: 1, toY: 2 });
    else await scene.host.warp("route_1", 1, 2, "down");
    expect(ctx.state.rafting).toBeUndefined();
    expect(ctx.state.position).toMatchObject({ map: "route_1", x: 1, y: 2 });
  });

  it("ends rafting on whiteout and returns to the heal point", async () => {
    const { ctx, scene } = setup(true);
    vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
    vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
    await scene.whiteout();
    expect(ctx.state.rafting).toBeUndefined();
    expect(ctx.state.position).toEqual({ ...ctx.state.heal, facing: "up" });
  });
});
