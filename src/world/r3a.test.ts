import { describe, expect, it, vi } from "vitest";
import type { Actor } from "../overworld/actor";
import type { Dir, GameContext, MapDef, MapId, Scene } from "../contracts";
import { DATA } from "../data";
import { createOverworldScene } from "../overworld";
import { newGameState } from "../save";
import { WORLD } from "./index";
import { flood, grid, walkable } from "./validate";

const shared = Object.values(WORLD.maps).filter((m) => m.id.endsWith("_greenhouse") || m.id.endsWith("_market"));
const rooms = [WORLD.maps.player_home, WORLD.maps.herbarium, WORLD.maps.herbarium_roof,
  WORLD.maps.fennimore_house, WORLD.maps.bramblegate_conservatory, ...shared];

describe("R3a gameplay coordinates", () => {
  it.each(rooms)("keeps entries, NPCs, triggers and healing accessible in $id", (m) => {
    const g = grid(m);
    const entries = Object.values(WORLD.maps).flatMap((other) => other.warps)
      .filter((w) => w.to === m.id).map((w) => ({ x: w.toX, y: w.toY }));
    const positions = [...entries, ...m.warps, ...m.npcs, ...m.triggers, ...(m.healPoint ? [m.healPoint] : [])];
    for (const p of positions) expect(walkable(g, p.x, p.y), `${m.id} ${p.x},${p.y}`).toBe(true);
    const reachable = flood(g, entries);
    for (const p of [...m.warps, ...(m.healPoint ? [m.healPoint] : [])]) {
      expect(reachable.has(`${p.x},${p.y}`), `${m.id} ${p.x},${p.y}`).toBe(true);
    }
  });

  it("leaves the morning, theft, letter and starter cutscene paths clear", () => {
    const home = grid(WORLD.maps.player_home);
    for (const [x, y] of [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [7, 3], [7, 4]]) {
      expect(walkable(home, x, y), `JUNE/player ${x},${y}`).toBe(true);
    }
    const herb = grid(WORLD.maps.herbarium);
    for (let y = 4; y <= 10; y++) expect(walkable(herb, 5, y), `VALE 5,${y}`).toBe(true);
    for (const [x, y] of [[4, 10], [4, 11], [4, 12], [15, 7], [15, 6], [14, 6], [13, 6], [12, 6], [11, 6], [1, 1], [2, 1]]) {
      expect(walkable(herb, x, y), `VALE/player ${x},${y}`).toBe(true);
    }
    const roof = grid(WORLD.maps.herbarium_roof);
    expect(walkable(roof, WORLD.newGame.x, WORLD.newGame.y)).toBe(true);
    expect(walkable(roof, 6, 6)).toBe(true);
  });
});

type TestScene = Scene & {
  interact(): boolean;
  flow(fn: () => Promise<void>): Promise<void>;
  talk(npc: Actor): Promise<void>;
};
function sceneAt(map: MapId, x: number, y: number, facing: Dir) {
  const state = newGameState({ world: WORLD });
  state.position = { map, x, y, facing };
  const cabinet = vi.fn().mockResolvedValue(undefined);
  const say = vi.fn().mockResolvedValue(undefined);
  const ctx = {
    state, world: WORLD, data: DATA, rng: () => 0.5,
    assets: { has: () => false, exists: () => false }, timeOfDay: () => "day",
    audio: { playSfx: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null },
    ui: { say }, screens: { cabinet },
  } as unknown as GameContext;
  const scene = createOverworldScene(ctx, { mode: "none" }) as TestScene;
  vi.spyOn(scene, "flow").mockImplementation(async (fn) => { await fn(); });
  return { scene, cabinet, say };
}

describe("R3a counter and cabinet interactions", () => {
  const counters: { map: MapDef; npc: string; x: number; y: number; facing: Dir }[] = shared.flatMap<{ map: MapDef; npc: string; x: number; y: number; facing: Dir }>((map) => {
    if (map.id.endsWith("_greenhouse")) return [{ map, npc: "keeper", x: 5, y: 4, facing: "up" }];
    if (map.tiles[0].length === 10) return [{ map, npc: "clerk", x: 3, y: 3, facing: "left" }];
    return [{ map, npc: "clerk", x: 2, y: 4, facing: "up" }, { map, npc: "clerk_b", x: 11, y: 4, facing: "up" }];
  });
  it.each(counters)("talks across the dressed counter to $npc in $map.id", ({ map, npc, x, y, facing }) => {
    const { scene } = sceneAt(map.id, x, y, facing);
    const talk = vi.spyOn(scene, "talk").mockResolvedValue(undefined);
    expect(scene.interact()).toBe(true);
    expect(talk).toHaveBeenCalledTimes(1);
    expect(talk.mock.calls[0][0].id).toBe(npc);
  });

  it.each(shared.filter((m) => m.id.endsWith("_greenhouse")))("opens storage under the cabinet prop in $id", async (m) => {
    const { scene, cabinet } = sceneAt(m.id, 1, 4, "up");
    expect(scene.interact()).toBe(true);
    await vi.waitFor(() => expect(cabinet).toHaveBeenCalledTimes(1));
  });
});
