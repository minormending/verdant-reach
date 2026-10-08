import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dir, GameContext, MapDef, Scene } from "../contracts";
import { DATA } from "../data";
import { newGameState } from "../save";
import { WORLD } from "../world";
import type { Actor } from "./actor";
import { createOverworldScene } from "./index";
import type { ScriptHost } from "./script";

type TestScene = Scene & {
  player: Actor;
  host: ScriptHost;
  attemptMove(dir: Dir): void;
  wildEncounter(species: string, level: number, kind: string): Promise<void>;
  useWarp(warp: MapDef["warps"][number]): Promise<void>;
};

function setup(blocker = false, warpX?: number) {
  const room: MapDef = {
    id: "route_1", name: "ICE TEST", outdoor: true, music: "route", border: "wall",
    tiles: ["########", "#.IIIS.#", "#......#", "########"],
    legend: { "#": "wall", ".": "floor_tile", I: "ice", S: "snow" },
    structures: [], warps: [], npcs: [], signs: [], triggers: [],
  };
  room.encounters = { grass: { rate: 100, slots: [{ species: "dandelion_bud", minLevel: 2, maxLevel: 2, weight: 100 }] } };
  room.encountersWhen = [{ when: [{ flag: "calmed", is: true }], encounters: {
    grass: { rate: 100, slots: [{ species: "nettle_sprout", minLevel: 3, maxLevel: 3, weight: 100 }] },
  } }];
  if (blocker) room.npcs = [{ id: "blocker", sprite: "hiker", x: 4, y: 1, facing: "left" }];
  if (warpX !== undefined) {
    room.tiles = ["#######", "#.III.#", "#######"];
    room.warps = [{ x: warpX, y: 1, to: "route_2", toX: 1, toY: 1 }];
  }
  const world = { ...WORLD, maps: { ...WORLD.maps, route_1: room } };
  const state = newGameState({ world });
  state.position = { map: "route_1", x: 1, y: 1, facing: "right" };
  state.flags.calmed = true;
  const ctx = {
    state, world, data: DATA, rng: vi.fn(() => 0), assets: { exists: () => false },
    timeOfDay: () => "day",
    audio: { playSfx: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null },
    input: { pressed: vi.fn(() => false), held: vi.fn(() => false), repeat: () => false },
    ui: { say: vi.fn().mockResolvedValue(undefined) },
  } as unknown as GameContext;
  const scene = createOverworldScene(ctx, { mode: "continue" }) as TestScene;
  const encounter = vi.spyOn(scene, "wildEncounter").mockResolvedValue(undefined);
  return { ctx, scene, encounter };
}

afterEach(() => vi.restoreAllMocks());

describe("ICE overworld flow", () => {
  it.each([3, 5])("uses a warp exactly once at x=%s, on ice or the non-ice landing", async (warpX) => {
    const { ctx, scene, encounter } = setup(false, warpX);
    const warp = vi.spyOn(scene, "useWarp").mockResolvedValue(undefined);
    scene.attemptMove("right");
    for (let i = 0; i < 40; i++) {
      scene.update(0);
      await Promise.resolve();
    }
    expect(warp).toHaveBeenCalledExactlyOnceWith({ x: warpX, y: 1, to: "route_2", toX: 1, toY: 1 });
    expect(scene.player).toMatchObject({ x: warpX, y: 1 });
    expect(scene.player.moving).toBe(false);
    expect(ctx.state.position).toMatchObject({ x: warpX, y: 1 });
    expect(encounter).not.toHaveBeenCalled();
  });

  it("slides after a scripted player step too", async () => {
    const { ctx, scene, encounter } = setup();
    const moving = scene.host.movePlayer(["right"]);
    for (let i = 0; i < 32; i++) {
      scene.update(0);
      await Promise.resolve();
    }
    await moving;
    expect(ctx.state.position).toMatchObject({ x: 5, y: 1, facing: "right" });
    expect(scene.player.moving).toBe(false);
    expect(encounter).not.toHaveBeenCalled();
  });
  it("continues without input, ignores turns and menus, then rolls on snow using flags", () => {
    const { ctx, scene, encounter } = setup();
    scene.attemptMove("right");
    ctx.input.pressed = vi.fn(() => true);
    ctx.input.held = vi.fn(() => true);
    for (let i = 0; i < 24; i++) scene.update(0);
    expect(scene.player).toMatchObject({ x: 5, y: 1, facing: "right" });
    expect(scene.player.moving).toBe(true);
    expect(ctx.input.pressed).not.toHaveBeenCalled();
    expect(ctx.input.held).not.toHaveBeenCalled();
    expect(encounter).not.toHaveBeenCalled();
    ctx.input.pressed = () => false;
    ctx.input.held = () => false;
    for (let i = 0; i < 8; i++) scene.update(0);
    expect(scene.player.moving).toBe(false);
    expect(ctx.state.position).toMatchObject({ x: 5, y: 1, facing: "right" });
    expect(encounter).toHaveBeenCalledExactlyOnceWith("nettle_sprout", 3, "grass");
  });

  it("stops before an NPC and returns control on the last ice tile", () => {
    const { ctx, scene, encounter } = setup(true);
    scene.attemptMove("right");
    for (let i = 0; i < 16; i++) scene.update(0);
    expect(scene.player).toMatchObject({ x: 3, y: 1, facing: "right" });
    expect(scene.player.moving).toBe(false);
    expect(encounter).not.toHaveBeenCalled();
    expect(ctx.input.pressed).toHaveBeenCalled();
    scene.attemptMove("down");
    for (let i = 0; i < 8; i++) scene.update(0);
    expect(ctx.state.position).toMatchObject({ x: 3, y: 2 });
  });
});
