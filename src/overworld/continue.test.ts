import { describe, expect, it, vi } from "vitest";
import type { Dir, GameContext, MapId, Scene } from "../contracts";
import { DATA } from "../data";
import { createSave, newGameState } from "../save";
import { WORLD } from "../world";
import { Actor } from "./actor";
import { continuePosition } from "./continue";
import { createOverworldScene } from "./index";
import { key, type MapRuntime } from "./map";
import { reachableBoulderTiles, type BoulderPosition } from "./uproot";

type TestScene = Scene & {
  player: Actor;
  npcs: Actor[];
  map: MapRuntime;
  uproot(boulder: Actor): Promise<void>;
  loadMap(map: MapId, x: number, y: number, facing: Dir): void;
};

function context(map: MapId, x: number, y: number): GameContext {
  const state = newGameState({ world: WORLD });
  state.position = { map, x, y, facing: "up" };
  state.bag.saxifrage = 1;
  Object.assign(state.flags, { got_saxifrage: true, beat_saguaro: true, got_sap: true });
  return {
    state, world: WORLD, data: DATA, assets: {},
    audio: { playSfx: vi.fn() },
    ui: { yesNo: vi.fn(async () => true), say: vi.fn(async () => {}) },
  } as unknown as GameContext;
}

function exitsReachable(scene: TestScene, start: BoulderPosition = scene.player) {
  const occupied = new Set(scene.npcs.map((n) => key(n.x, n.y)));
  // Walk only: no UPROOT, encounters or whiteout needed to escape.
  const reached = reachableBoulderTiles(scene.map, [], start, { occupied: (x, y) => occupied.has(key(x, y)) });
  return scene.map.def.warps.every((w) => reached.has(key(w.x, w.y)));
}

describe("Continue position", () => {
  it("uses the first arrival from the room's first exit map, without mutating inputs", () => {
    const world = structuredClone(WORLD);
    world.maps.route_1.npcs.push({ id: "stone", sprite: "boulder", x: 3, y: 3, facing: "down", pushable: true });
    world.maps.route_1.warps = [{ x: 1, y: 1, to: "route_2", toX: 4, toY: 4 }];
    world.maps.herbarium.warps = [{ x: 1, y: 1, to: "route_1", toX: 8, toY: 8 }];
    world.maps.route_2.warps = [
      { x: 1, y: 1, to: "route_1", toX: 2, toY: 2, facing: "down" },
      { x: 2, y: 1, to: "route_1", toX: 9, toY: 9 },
    ];
    const saved = { map: "route_1", x: 5, y: 5, facing: "left" } as const;
    const before = structuredClone({ world, saved });
    expect(continuePosition(world, saved)).toEqual({ map: "route_1", x: 2, y: 2, facing: "down" });
    delete world.maps.route_2.warps[0].facing;
    expect(continuePosition(world, saved).facing).toBe("left");
    world.maps.route_2.warps[0].facing = "down";
    expect({ world, saved }).toEqual(before);
  });

  it("preserves saved coordinates on maps without pushable NPCs", () => {
    const ctx = context("driftseed_isle", 26, 10);
    expect(continuePosition(WORLD, ctx.state.position)).toBe(ctx.state.position);
    const scene = createOverworldScene(ctx, { mode: "continue" }) as TestScene;
    expect(scene.player).toMatchObject({ x: 26, y: 10, facing: "up" });
  });

  it.each(["new", "none"] as const)("preserves the initial tile in a boulder room in %s mode", (mode) => {
    const ctx = context("driftseed_conservatory", 7, 3);
    const scene = createOverworldScene(ctx, { mode }) as TestScene;
    expect(scene.player).toMatchObject({ x: 7, y: 3 });
  });

  it.each([
    { map: "driftseed_conservatory", saved: { x: 7, y: 3 }, entrance: { x: 7, y: 16 }, stands: [[6, 12], [6, 8], [6, 4]] },
    { map: "driftseed_vents", saved: { x: 11, y: 8 }, entrance: { x: 11, y: 22 }, stands: [[10, 10]] },
  ] as const)("escapes $map after real UPROOT pushes, save serialization and Continue", async ({ map, saved, entrance, stands }) => {
    const ctx = context(map, entrance.x, entrance.y);
    const scene = createOverworldScene(ctx, { mode: "none" }) as TestScene;
    const stones = scene.npcs.filter((n) => n.def?.pushable);
    for (const [i, [x, y]] of stands.entries()) {
      Object.assign(scene.player, { x, y, facing: "right" });
      const pushed = scene.uproot(stones[i]);
      await Promise.resolve();
      for (let tick = 0; tick < 12; tick++) stones[i].tick();
      await pushed;
      expect(stones[i].x).toBe(x + 2);
    }
    Object.assign(scene.player, saved);
    ctx.state.position = { map, ...saved, facing: "up" };
    expect(exitsReachable(scene)).toBe(true);

    const entries = new Map<string, string>();
    const storage = {
      getItem: (k: string) => entries.get(k) ?? null,
      setItem: (k: string, v: string) => { entries.set(k, v); },
      removeItem: (k: string) => { entries.delete(k); },
    };
    const save = createSave(() => ctx.state, storage);
    save.write();
    const loaded = save.read();
    expect(loaded?.position).toEqual({ map, ...saved, facing: "up" });
    const resumedCtx = { ...ctx, state: loaded! };
    const resumed = createOverworldScene(resumedCtx, { mode: "continue" }) as TestScene;
    expect(resumed.player).toMatchObject(entrance);
    expect(resumedCtx.state.position).toEqual({ map, ...entrance, facing: "up" });
    expect(resumed.npcs.filter((n) => n.def?.pushable).map((n) => [n.x, n.y]))
      .toEqual(WORLD.maps[map].npcs.filter((n) => n.pushable).map((n) => [n.x, n.y]));
    expect(exitsReachable(resumed)).toBe(true);
    // These are the exact trapped coordinates from the bug hunt with reset stones.
    expect(exitsReachable(resumed, saved)).toBe(false);

    // The Continue adjustment must not affect later ordinary map arrivals.
    resumed.loadMap(map, saved.x, saved.y, "down");
    expect(resumed.player).toMatchObject({ ...saved, facing: "down" });
  });
});
