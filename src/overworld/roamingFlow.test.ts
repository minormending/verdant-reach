import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleRequest, Dir, GameContext, MapDef, MapId, Scene, SpeciesId } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle";
import { seeded } from "../battle/logic/rng";
import { newGameState, createSave, SAVE_KEY, normalizeState } from "../save";
import { WORLD } from "../world";
import { Actor } from "./actor";
import { createOverworldScene } from "./index";
import type { EncounterKind } from "./encounters";
import { finishWandererBattle, moveRoamers, ROAMER_MAPS, WANDERERS, wandererMaxHp } from "./roaming";

const route: MapDef = {
  ...WORLD.maps.route_10, tiles: ["....", "....", "....", "...."], legend: { ".": "tall_grass" },
  structures: [], npcs: [], warps: [], signs: [], triggers: [],
  encounters: { grass: { rate: 100, slots: [{ species: "oak_acorn", minLevel: 2, maxLevel: 2, weight: 1 }] } },
};
type TestScene = Scene & {
  player: Actor; npcs: Actor[]; mapId: MapId;
  loadMap(map: MapId, x: number, y: number, facing: Dir): void;
  wildEncounter(species: SpeciesId, level: number, kind: EncounterKind): Promise<void>;
  onArrive(): void;
  battle(req: BattleRequest): Promise<"fled">;
  talk(npc: Actor): Promise<void>;
};
function context() {
  const world = { ...WORLD, maps: { ...WORLD.maps, route_10: structuredClone(route), route_11: { ...structuredClone(route), id: "route_11" as const } } };
  const state = newGameState({ world });
  state.playerName = "ROWAN";
  state.position = { map: "player_home", x: 2, y: 2, facing: "up" };
  state.flags = { game_cleared: true, wanderers_free: true };
  state.party.push(createQuickened(DATA, "great_oak", 100, seeded(15)));
  return {
    state, world, data: DATA, rng: vi.fn(() => 0), assets: { exists: () => false },
    timeOfDay: () => "day",
    audio: { playSfx: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null },
    input: { pressed: () => false, held: () => false, repeat: () => false },
    ui: { say: vi.fn().mockResolvedValue(undefined) },
  } as unknown as GameContext;
}
function sceneFor(ctx: GameContext, mode: "none" | "continue" = "none") {
  const scene = createOverworldScene(ctx, { mode }) as TestScene;
  vi.spyOn(scene, "battle").mockResolvedValue("fled");
  return scene;
}
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("roaming overworld wiring", () => {
  it("moves every free roamer on each map change, including indoor entries, and can meet on the destination", async () => {
    const ctx = context(), scene = sceneFor(ctx);
    expect(ctx.rng).not.toHaveBeenCalled(); // initial load is not a map change
    ctx.rng = vi.fn(() => 0.999);
    scene.loadMap("route_11", 2, 2, "up");
    expect(ctx.state.roamers.tumbleweed.map).toBe("route_12");
    expect(ctx.state.roamers.coconut.map).toBe("driftseed_isle");
    ctx.rng = vi.fn(() => 0);
    scene.loadMap("player_home", 2, 2, "up");
    expect(ctx.rng).toHaveBeenCalledTimes(2);
    expect(ctx.state.roamers.tumbleweed.map).toBe("route_10");
    scene.loadMap("route_10", 2, 2, "up");
    await scene.wildEncounter("oak_acorn", 2, "grass");
    expect(scene.battle).toHaveBeenLastCalledWith(expect.objectContaining({
      kind: "wild", wild: { species: "tumbleweed", level: 60 }, wanderer: "tumbleweed",
    }));
  });
  it("runs encounter replacement only after an encounter roll succeeds", async () => {
    const ctx = context(), scene = sceneFor(ctx);
    scene.loadMap("route_10", 2, 2, "up");
    const encounter = vi.spyOn(scene, "wildEncounter").mockResolvedValue(undefined);
    scene.onArrive();
    expect(encounter).toHaveBeenCalledWith("oak_acorn", 2, "grass");
    scene.onArrive();
    expect(encounter).toHaveBeenCalledTimes(2);
    ctx.rng = () => 0.999;
    // A zero-rate table never produces a roaming encounter.
    ctx.world.maps.route_10.encounters!.grass!.rate = 0;
    scene.onArrive();
    expect(encounter).toHaveBeenCalledTimes(2);
  });
  it("uses the water encounter hook for COCONUT and honours the 1/4 miss", async () => {
    const ctx = context(), scene = sceneFor(ctx);
    scene.loadMap("route_8", 18, 1, "down");
    await scene.wildEncounter("eelgrass", 28, "water");
    expect(scene.battle).toHaveBeenLastCalledWith(expect.objectContaining({
      wild: { species: "coconut", level: 60 }, wanderer: "coconut", backdrop: "water",
    }));
    ctx.rng = () => 0.25;
    await scene.wildEncounter("eelgrass", 28, "water");
    expect(scene.battle).toHaveBeenLastCalledWith(expect.objectContaining({ wild: { species: "eelgrass", level: 28 } }));
    expect(vi.mocked(scene.battle).mock.calls.at(-1)![0]).not.toHaveProperty("wanderer");
  });
  it("places BURR behind the player, talking starts its wild battle, then it hops off until a later entry", async () => {
    const ctx = context(), scene = sceneFor(ctx);
    scene.loadMap("route_10", 2, 2, "up");
    const burr = scene.npcs.find((n) => n.id === "burr")!;
    expect(burr).toMatchObject({ sprite: "item_pickup", x: 2, y: 3 });
    expect(ctx.state.burrHitch).toEqual({ map: "route_10", x: 2, y: 3, facing: "up" });
    await scene.talk(burr);
    expect(scene.battle).toHaveBeenCalledWith({ kind: "wild", wild: { species: "burr", level: 60 }, wanderer: "burr" });
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
    expect(ctx.state.burrHitch).toBeUndefined();
    expect(ctx.state.flags.picked_route_10_burr).toBeUndefined();
    scene.loadMap("route_11", 2, 2, "up");
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(true);
    scene.loadMap("player_home", 2, 2, "up");
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
    expect(ctx.state.burrHitch).toBeUndefined();
  });
  it("keeps the Vault-to-Route-9 return warp free during placement and saved hitch restoration", () => {
    const ctx = context(), scene = sceneFor(ctx);
    scene.loadMap("seed_vault_entrance", 6, 10, "down");
    const arrival = ctx.world.maps.seed_vault_entrance.warps.find((w) => w.to === "route_9")!;
    scene.loadMap("route_9", arrival.toX, arrival.toY, arrival.facing!);
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
    expect(ctx.state.burrHitch).toBeUndefined();
    const db = storage();
    ctx.state.burrHitch = { map: "route_9", x: 6, y: 0, facing: "down" };
    const save = createSave(() => ctx.state, db);
    save.write();
    ctx.state = save.read()!;
    const resumed = sceneFor(ctx, "continue");
    expect(resumed.npcs.some((n) => n.id === "burr")).toBe(false);
    expect(ctx.state.burrHitch).toBeUndefined();
  });
  it("does not put BURR on an authored visible NPC or on a solid tile", () => {
    const ctx = context(), scene = sceneFor(ctx);
    ctx.world.maps.route_10.npcs.push({ id: "occupant", sprite: "hiker", x: 2, y: 3, facing: "up" });
    scene.loadMap("route_10", 2, 2, "up");
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
    ctx.world.maps.route_11.tiles[3] = "WWWW";
    ctx.world.maps.route_11.legend.W = "wall";
    scene.loadMap("route_11", 2, 2, "up");
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
  });
});

describe("wanderer save migration and Continue", () => {
  it("migrates saves with no roaming fields without releasing wanderers or changing progress", () => {
    const ctx = context(), db = storage();
    const old = structuredClone(ctx.state) as Partial<GameContext["state"]>;
    delete old.roamers; delete old.burr; delete old.wandererWilted;
    old.flags = { beat_keeper: true, game_cleared: true };
    db.setItem(SAVE_KEY, JSON.stringify({ v: 1, state: old, gameId: "old", savedAt: 100 }));
    const save = createSave(() => ctx.state, db);
    const next = save.read()!;
    expect(next.flags).toEqual(old.flags);
    expect(next.party).toEqual(old.party);
    expect(next.roamers.tumbleweed).toEqual({ hp: wandererMaxHp(DATA, "tumbleweed"), status: null, map: "route_10" });
    expect(next.roamers.coconut).toEqual({ hp: wandererMaxHp(DATA, "coconut"), status: null, map: "route_8" });
    expect(next.burr).toEqual({ hp: wandererMaxHp(DATA, "burr"), status: null });
    ctx.state = next;
    const scene = sceneFor(ctx, "continue");
    scene.loadMap("route_10", 2, 2, "up");
    expect(ctx.rng).not.toHaveBeenCalled();
    expect(scene.npcs.some((n) => n.id === "burr")).toBe(false);
  });
  it("round-trips HP, status, caught/wilted states and BURR location and restores the NPC without rerolling", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59));
    const ctx = context(), scene = sceneFor(ctx), db = storage();
    scene.loadMap("route_10", 2, 2, "up");
    ctx.state.roamers.tumbleweed = { map: "route_12", hp: 0, status: "scorch" };
    ctx.state.wandererWilted = { tumbleweed: "2026-10-07" };
    ctx.state.roamers.coconut = { map: "driftseed_isle", hp: 34, status: "rootbound" };
    ctx.state.flags.wanderer_caught_coconut = true;
    ctx.state.burr = { hp: 29, status: "dormant" };
    const save = createSave(() => ctx.state, db);
    save.write();
    const loaded = save.read()!;
    expect(loaded).toEqual(ctx.state);
    const continued = { ...ctx, state: loaded, rng: vi.fn(() => 0.99) };
    const resumed = sceneFor(continued, "continue");
    expect(continued.rng).not.toHaveBeenCalled();
    expect(continued.state.roamers).toEqual(ctx.state.roamers);
    expect(continued.state.burr).toEqual(ctx.state.burr);
    expect(resumed.npcs.find((n) => n.id === "burr")).toMatchObject({ x: 2, y: 3 });
  });
  it.each(WANDERERS)("a wilted %s remains absent after save/Continue on the same day and recovers the next day", (id) => {
    const ctx = context(), db = storage();
    Object.assign(ctx.state, finishWandererBattle(ctx.state, id, { hp: 0, status: "blight" }, "won", new Date(2026, 9, 7)));
    const save = createSave(() => ctx.state, db);
    save.write();
    const loaded = save.read()!;
    const sameDay = moveRoamers(loaded, DATA, () => 0, new Date(2026, 9, 7, 23, 59));
    expect(id === "burr" ? sameDay.burr.hp : sameDay.roamers[id].hp).toBe(0);
    const nextDay = moveRoamers(loaded, DATA, () => 0, new Date(2026, 9, 8));
    expect(id === "burr" ? nextDay.burr.hp : nextDay.roamers[id].hp).toBe(wandererMaxHp(DATA, id));
    expect(nextDay.wandererWilted?.[id]).toBeUndefined();
  });
  it("normalizes invalid roaming save fields without allowing a foreign map, HP or status", () => {
    const fallback = context().state;
    const raw = { ...fallback, roamers: { tumbleweed: { map: "player_home", hp: -2, status: "poison" }, coconut: null }, burr: { hp: Infinity, status: "frostbite" }, burrHitch: { map: "missing", x: 2, y: 2, facing: "up" } };
    const next = normalizeState(raw, fallback)!;
    for (const id of ["tumbleweed", "coconut"] as const) {
      expect(next.roamers[id]).toEqual({ map: ROAMER_MAPS[id][0], hp: wandererMaxHp(DATA, id), status: null });
    }
    expect(next.burr).toEqual({ hp: wandererMaxHp(DATA, "burr"), status: "frostbite" });
    expect(next.burrHitch).toBeUndefined();
  });
});
