import { afterEach, describe, expect, it, vi } from "vitest";
import { MAP_IDS, type GameContext, type MapId, type Scene } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle/logic/stats";
import { Fader, Timers } from "../engine/gfx";
import { newGameState } from "../save";
import { createOverworldScene } from "../overworld";
import { buildMap, isWalkable, refreshLegend, tileAt } from "../overworld/map";
import { runScript, type ScriptHost } from "../overworld/script";
import { WORLD } from "./index";
import { COUNCIL_RUN_FLAGS } from "./scripts/ch11";
import { flood, grid } from "./validate";

const ROOMS = ["council_1", "council_2", "council_3", "council_4", "keeper_hall"] as const;
const WINS = ["beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper"];
function reachedRooms(flags: Record<string, boolean>) {
  const reached = new Set<MapId>(), queue = [{ map: "council_hall" as MapId, x: 2, y: 4 }];
  for (let head = 0; head < queue.length; head++) {
    const entry = queue[head];
    if (reached.has(entry.map)) continue;
    reached.add(entry.map);
    const m = WORLD.maps[entry.map], runtime = buildMap(m);
    refreshLegend(runtime, flags);
    const g = grid(m), reachedTiles = flood({ ...g, tile: (x, y) => tileAt(runtime, x, y) }, [entry]);
    for (const warp of m.warps) if (reachedTiles.has(`${warp.x},${warp.y}`) && [...ROOMS, "fellowship_hall"].includes(warp.to)) {
      queue.push({ map: warp.to, x: warp.toX, y: warp.toY });
    }
  }
  return reached;
}
function sceneAt(map: MapId) {
  const state = newGameState({ world: WORLD });
  state.position = { map, x: 5, y: 10, facing: "up" };
  state.party = [createQuickened(DATA, "great_oak", 60, () => 0.5)];
  state.party[0].hp = 0;
  state.flags = { ch10_done: true, ...Object.fromEntries(COUNCIL_RUN_FLAGS.map((f) => [f, true])) };
  const ctx = {
    world: WORLD, state, data: DATA, rng: () => 0.5, timeOfDay: () => "day", assets: { exists: () => false },
    audio: { stopMusic: vi.fn(), playMusic: vi.fn(), playSfx: vi.fn(), current: () => null },
    ui: { say: vi.fn(async () => {}) },
  } as unknown as GameContext;
  vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
  vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
  const scene = createOverworldScene(ctx, { mode: "none" }) as Scene & { whiteout(): Promise<void>; host: ScriptHost };
  return { state, scene };
}
afterEach(() => vi.restoreAllMocks());

describe("Chapter 11 Council world", () => {
  it("provides all seven prescribed maps, indoor music and no encounters", () => {
    expect(MAP_IDS.slice(MAP_IDS.indexOf("council_1"))).toEqual([...ROOMS, "fellowship_hall"]);
    for (const [i, id] of ["council_hall", ...ROOMS, "fellowship_hall"].entries()) {
      const m = WORLD.maps[id as MapId];
      expect([m.tiles[0].length, m.tiles.length]).toEqual(i === 0 ? [16, 12] : i === 5 ? [14, 16] : i === 6 ? [10, 8] : [12, 12]);
      expect(m.outdoor).toBe(false);
      expect(m.music).toBe(i === 0 ? "herbarium" : i === 6 ? "prologue_bloom" : "conservatory");
      expect(m.encounters).toBeUndefined();
    }
  });

  it("reaches only the next seat in order, and never offers a return warp mid-run", () => {
    for (let wins = 0; wins <= 5; wins++) {
      const flags = { ch10_done: true, council_run: true, ...Object.fromEntries(WINS.map((w, i) => [w, i < wins])) };
      const reached = reachedRooms(flags);
      expect(reached.has("council_hall")).toBe(true);
      for (const [i, room] of ROOMS.entries()) expect(reached.has(room), `${wins} wins -> ${room}`).toBe(i <= wins);
      expect(reached.has("fellowship_hall")).toBe(wins === 5);
      for (const room of ROOMS.slice(1)) expect(WORLD.maps[room].warps).toHaveLength(1);
      const first = buildMap(WORLD.maps.council_1);
      refreshLegend(first, flags);
      expect(isWalkable(first, 5, 11)).toBe(false);
    }
    expect(reachedRooms({ ch10_done: false }).has("council_1")).toBe(false);
  });

  it("keeps both lobby counters and the outside exit reachable before and after a run", () => {
    for (const run of [false, true]) {
      const m = WORLD.maps.council_hall, rt = buildMap(m);
      refreshLegend(rt, { council_run: run, ch10_done: true });
      const reach = flood({ ...grid(m), tile: (x, y) => tileAt(rt, x, y) }, [{ x: 7, y: 10 }]);
      for (const point of ["7,11", "2,4", "13,4", "7,0"]) expect(reach.has(point), point).toBe(true);
    }
    expect(WORLD.scripts.ch11_market).toEqual([{ op: "shop", stock: ["spring_water", "rain_jar", "compost", "neem_spray", "glass_pod"] }]);
    expect(WORLD.maps.council_hall.healPoint).toEqual({ x: 2, y: 4 });
  });

  it.each(ROOMS)("whiteout from %s heals, clears every run win, and returns to the lobby", async (room) => {
    const { state, scene } = sceneAt(room);
    expect(WORLD.maps[room].onWhiteout).toBe("ch11_whiteout");
    await scene.whiteout();
    expect(state.position).toEqual({ map: "council_hall", x: 2, y: 4, facing: "up" });
    for (const flag of COUNCIL_RUN_FLAGS) expect(state.flags[flag], flag).toBe(false);
    expect(state.flags.ch10_done).toBe(true);
    expect(state.party[0].hp).toBe(state.party[0].stats.hp);
    const first = buildMap(WORLD.maps.council_1);
    refreshLegend(first, state.flags);
    expect(isWalkable(first, 5, 11)).toBe(true);
  });

  it("starts a fresh run only after Chapter 10 and closes the first return door", async () => {
    const { state, scene } = sceneAt("council_1");
    state.flags.council_run = false;
    await runScript(scene.host, "ch11_run_start");
    expect(state.flags.council_run).toBe(true);
    for (const flag of COUNCIL_RUN_FLAGS.slice(1)) expect(state.flags[flag]).toBe(false);
    const rt = buildMap(WORLD.maps.council_1);
    refreshLegend(rt, state.flags);
    expect(isWalkable(rt, 5, 11)).toBe(false);
    state.flags.council_run = false;
    state.flags.ch10_done = false;
    await runScript(scene.host, "ch11_run_start");
    expect(state.position.map).toBe("council_hall");
    expect(state.flags.council_run).toBe(false);
  });

  it("gates the Arboretum hall script and wires the Council encounter ids", async () => {
    const { state, scene } = sceneAt("council_hall");
    await runScript(scene.host, "ch11_hall_door");
    expect(state.position).toEqual({ map: "council_hall", x: 7, y: 10, facing: "up" });
    for (const [i, id] of ["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"].entries()) {
      expect(WORLD.scripts[id]).toBeDefined();
      expect(WORLD.scripts[`${id}_after`]).toBeDefined();
      expect(WORLD.maps[ROOMS[i]].npcs)
        .toContainEqual(expect.objectContaining({ id, script: id }));
    }
    expect(WORLD.scripts.ch11_ending).toBeDefined();
  });

  it("keeps exact prescribed trainer teams, Smart AI, waters and chapter placeholders", () => {
    const teams = [
      ["belladonna", [["foxglove", 58], ["oleander", 59], ["nightshade", 59], ["nightshade", 61]]],
      ["mimi_osa", [["prayer_plant", 59], ["sensitive_plant", 60], ["moonflower", 60], ["sensitive_plant", 62]]],
      ["titus_arum", [["skunk_cabbage", 60], ["corpse_leaf", 60], ["pitcher_plant", 61], ["titan_arum", 63]]],
      ["pyra", [["red_chili", 61], ["fireweed", 61], ["flame_lily", 62], ["lodgepole_pine", 63]]],
      ["rowan", [["quaking_aspen", 63], ["red_cedar", 63], ["dragon_tree", 64], ["moss_campion", 63], ["sacred_lotus", 64], ["great_oak", 66]]],
    ] as const;
    for (const [id, team] of teams) {
      const trainer = WORLD.trainers[id];
      expect(trainer.team.map((t) => [t.species, t.level])).toEqual(team);
      expect(trainer.ai).toBe("smart");
      expect(trainer.music).toBe("battle_leader");
      expect(trainer.items).toEqual([{ item: "spring_water", qty: id === "rowan" ? 3 : 2 }]);
      for (const [kind, text] of [["intro", trainer.intro], ["defeat", trainer.defeat], ["after", trainer.after]]) expect(text).toBe(`TODO(text): ${id} ${kind}`);
    }
  });
});
