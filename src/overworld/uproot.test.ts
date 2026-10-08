import { describe, expect, it, vi } from "vitest";
import type { Dir, GameContext, MapDef, MapId, Scene, WorldData } from "../contracts";
import { REQUIRED_ITEMS } from "../contracts";
import { DATA } from "../data";
import { newGameState } from "../save";
import { Actor } from "./actor";
import { createOverworldScene } from "./index";
import { buildMap } from "./map";
import { UPROOT, reachableBoulderTiles, solveBoulderPuzzle, tryPushBoulder } from "./uproot";

function board(tiles: string[]): MapDef {
  return {
    id: "route_1", name: "TEST", outdoor: true, music: "route", border: "grass",
    tiles, legend: { "#": "wall", ".": "grass", "~": "water", v: "ledge_down" },
    structures: [], warps: [], npcs: [], signs: [], triggers: [],
  };
}

describe("UPROOT push rules", () => {
  it("registers SAXIFRAGE as a key item", () => {
    expect(REQUIRED_ITEMS).toContain("saxifrage");
    expect(DATA.items.saxifrage).toMatchObject({ name: "Saxifrage", pocket: "key", price: 0, effect: { kind: "none" } });
  });

  it("moves exactly one tile without mutating the boulder or map", () => {
    const def = board(["....", "...."]);
    const boulder = { x: 1, y: 0 };
    expect(tryPushBoulder(buildMap(def), boulder, "right", true)).toEqual({ kind: "push", x: 2, y: 0 });
    expect(boulder).toEqual({ x: 1, y: 0 });
    expect(def.tiles).toEqual(["....", "...."]);
  });

  it("refuses without SAXIFRAGE", () => {
    expect(tryPushBoulder(buildMap(board(["...."])), { x: 1, y: 0 }, "right", false))
      .toEqual({ kind: "locked", text: UPROOT.locked });
  });

  it.each(["#", "~", "v"])("cannot push onto solid terrain (%s), including a ledge", (tile) => {
    const def = board(["....", `..${tile}.`, "...."]);
    expect(tryPushBoulder(buildMap(def), { x: 1, y: 1 }, "right", true))
      .toEqual({ kind: "blocked", reason: "wall", text: UPROOT.blocked });
  });

  it("cannot push into a structure footprint", () => {
    const def = board(["......", "......", "......", "......"]);
    def.structures = [{ key: "house_small", x: 2, y: 0 }];
    expect(tryPushBoulder(buildMap(def), { x: 1, y: 1 }, "right", true)).toMatchObject({ kind: "blocked", reason: "wall" });
  });

  it.each([false, true])("cannot push into another NPC (pushable=%s)", (pushable) => {
    const def = board(["...."]);
    def.npcs = [{ id: "obstacle", sprite: pushable ? "boulder" : "elder", x: 2, y: 0, facing: "down", pushable }];
    expect(tryPushBoulder(buildMap(def), { x: 1, y: 0 }, "right", true, (x, y) => def.npcs.some((n) => n.x === x && n.y === y)))
      .toEqual({ kind: "blocked", reason: "occupied", text: UPROOT.blocked });
  });

  it.each([
    [0, 0, "left"], [3, 0, "right"], [1, 0, "up"], [1, 1, "down"],
  ] as const)("cannot leave the map from %s,%s facing %s even with a walkable border", (x, y, dir) => {
    expect(tryPushBoulder(buildMap(board(["....", "...."])), { x, y }, dir, true))
      .toEqual({ kind: "blocked", reason: "edge", text: UPROOT.blocked });
  });
});

describe("BFS puzzle solver", () => {
  it.each([
    { name: "one boulder needs the side pocket", tiles: ["#######", "###.###", "#.....#", "#...###", "#######"],
      stones: [{ x: 3, y: 2 }], goal: { x: 5, y: 2 }, solvable: true },
    { name: "two boulders need separate pushes", tiles: ["########", "###..###", "#......#", "#....###", "########"],
      stones: [{ x: 3, y: 2 }, { x: 4, y: 2 }], goal: { x: 6, y: 2 }, solvable: true },
    { name: "corridor has no place to put the boulder", tiles: ["#######", "#.....#", "#######"],
      stones: [{ x: 3, y: 1 }], goal: { x: 5, y: 1 }, solvable: false },
  ])("$name", ({ tiles, stones, goal, solvable }) => {
    const map = buildMap(board(tiles));
    const player = { x: 1, y: goal.y };
    const snapshot = JSON.stringify({ stones, player, tiles });
    expect(solveBoulderPuzzle(map, stones, player, goal)).toBe(solvable);
    expect(JSON.stringify({ stones, player, tiles })).toBe(snapshot);
  });

  it("honours fixed NPC occupancy and does not chain-push", () => {
    const def = board(["#######", "###.###", "#.....#", "#...###", "#######"]);
    def.npcs = [{ id: "keeper", sprite: "elder", x: 3, y: 1, facing: "down" }];
    expect(solveBoulderPuzzle(buildMap(def), [{ x: 3, y: 2 }], { x: 1, y: 2 }, { x: 5, y: 2 })).toBe(false);
    expect(solveBoulderPuzzle(buildMap(board(["........"])), [{ x: 2, y: 0 }, { x: 3, y: 0 }], { x: 0, y: 0 }, { x: 7, y: 0 })).toBe(false);
  });

  it("can report all reachable tiles, handles an already-reached goal, and rejects an occupied start", () => {
    const map = buildMap(board(["..."]));
    expect([...reachableBoulderTiles(map, [], { x: 0, y: 0 })].sort()).toEqual(["0,0", "1,0", "2,0"]);
    expect(solveBoulderPuzzle(map, [], { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(solveBoulderPuzzle(map, [{ x: 0, y: 0 }], { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
  });
});

// Exercise the real scene's actors/loading/interaction flow without a canvas.
type TestOverworld = Scene & {
  npcs: Actor[]; player: Actor;
  loadMap(id: MapId, x: number, y: number, dir: Dir): void;
  uproot(boulder: Actor): Promise<void>;
  interact(): boolean;
};
function scene(yes = true) {
  const room = board(["....", "...."]);
  room.npcs = [{ id: "stone", sprite: "boulder", x: 1, y: 0, facing: "down", pushable: true }];
  const other = { ...board(["...."]), id: "route_2" as const };
  const world = { maps: { route_1: room, route_2: other }, scripts: { start: [] }, trainers: {},
    newGame: { map: "route_1", x: 0, y: 0, facing: "right", script: "start" } } as unknown as WorldData;
  const state = newGameState({ world });
  const say = vi.fn(async (_text: string) => {});
  const yesNo = vi.fn(async (_prompt: string) => yes);
  const ctx = { state, world, data: DATA, assets: {}, audio: { playSfx: vi.fn() }, ui: { say, yesNo } } as unknown as GameContext;
  return { room, state, say, yesNo, ow: createOverworldScene(ctx, { mode: "none" }) as TestOverworld };
}
async function push(ow: TestOverworld) {
  const done = ow.uproot(ow.npcs[0]);
  await Promise.resolve(); // confirmation resolves, then the animated step begins
  for (let i = 0; i < 12; i++) ow.npcs[0].tick();
  await done;
}

describe("UPROOT overworld flow", () => {
  it("refuses without the item and does not prompt", async () => {
    const { ow, say, yesNo } = scene();
    await ow.uproot(ow.npcs[0]);
    expect(say).toHaveBeenCalledWith(UPROOT.locked);
    expect(yesNo).not.toHaveBeenCalled();
    expect(ow.npcs[0].x).toBe(1);
  });

  it("asks the exact prompt and leaves the boulder in place on no", async () => {
    const { ow, state, yesNo } = scene(false);
    state.bag.saxifrage = 1;
    await ow.uproot(ow.npcs[0]);
    expect(yesNo).toHaveBeenCalledWith("UPROOT it?");
    expect(ow.npcs[0].x).toBe(1);
  });

  it("pushes on yes and resets on re-entry without changing map data or saving positions", async () => {
    const { ow, state, room } = scene();
    state.bag.saxifrage = 1;
    const initial = JSON.stringify(state);
    await push(ow);
    expect(ow.npcs[0].x).toBe(2);
    expect(ow.player.x).toBe(0);
    expect(room.npcs[0].x).toBe(1);
    expect(JSON.stringify(state)).toBe(initial);
    ow.loadMap("route_2", 0, 0, "right");
    ow.loadMap("route_1", 0, 0, "right");
    expect(ow.npcs[0]).toMatchObject({ x: 1, y: 0, step: null });
  });

  it("routes facing-A to UPROOT and says it won't budge when blocked", async () => {
    const { ow, state, say, yesNo } = scene();
    state.bag.saxifrage = 1;
    ow.npcs.push(new Actor("other", "elder", 2, 0, "down"));
    expect(ow.interact()).toBe(true);
    await vi.waitFor(() => expect(say).toHaveBeenCalledWith("It won't budge."));
    expect(yesNo).toHaveBeenCalledWith("UPROOT it?");
    expect(ow.npcs[0].x).toBe(1);
  });
});
