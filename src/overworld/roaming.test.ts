import { describe, expect, it, vi } from "vitest";
import type { Dir, GameState, MapId, WandererId } from "../contracts";
import { DATA } from "../data";
import { seeded } from "../battle/logic/rng";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { fieldMoveFlag, fieldMoveOf } from "./fieldmove";
import { buildMap, DIRS, filledPitFlag, isWalkable, refreshLegend, warpAt } from "./map";
import { tryRaftMove } from "./raft";
import { rollEncounter } from "./encounters";
import {
  BURR_CATCH_UP_STEPS, burrCatchUp, burrPlacement, burrRoll, burrTileSafe, finishWandererBattle, meetingRoamer, moveRoamers, recoverWanderers,
  ROAMER_MAPS, wandererFlees, wandererFree, wandererHealth, wandererMaxHp, WANDERERS,
} from "./roaming";

const day = new Date(2026, 9, 7, 23, 59);
const tomorrow = new Date(2026, 9, 8, 0, 0);
function free(): GameState {
  const state = newGameState({ world: WORLD });
  state.flags = { game_cleared: true, wanderers_free: true };
  return state;
}
const map = () => buildMap({
  ...WORLD.maps.route_1, tiles: ["....", "....", "....", "...."], legend: { ".": "grass" },
  structures: [], npcs: [], warps: [], triggers: [], signs: [],
});

describe("roaming movement and release", () => {
  it("uses precisely the dry routes and Chapter 6 sea/island maps", () => {
    expect(ROAMER_MAPS).toEqual({ tumbleweed: ["route_10", "route_11", "route_12"], coconut: ["route_8", "driftseed_isle"] });
    for (const maps of Object.values(ROAMER_MAPS)) for (const id of maps) expect(WORLD.maps[id].outdoor).toBe(true);
  });
  it("is seeded, stays in each list, preserves health and leaves its input unchanged", () => {
    const state = free();
    state.roamers.tumbleweed.hp = 25;
    state.roamers.tumbleweed.status = "dormant";
    const before = structuredClone(state);
    const a = seeded(42), b = seeded(42);
    let first = state, second = state;
    const visited = new Set<string>();
    for (let i = 0; i < 30; i++) {
      first = moveRoamers(first, DATA, a, day);
      second = moveRoamers(second, DATA, b, day);
      expect(first).toEqual(second);
      for (const id of ["tumbleweed", "coconut"] as const) {
        expect(ROAMER_MAPS[id]).toContain(first.roamers[id].map);
        visited.add(first.roamers[id].map);
      }
      expect(first.roamers.tumbleweed).toMatchObject({ hp: 25, status: "dormant" });
    }
    expect(visited.size).toBe(5);
    expect(state).toEqual(before);
  });
  it("can land on the player's destination, including its previous map", () => {
    const state = free();
    const next = moveRoamers(state, DATA, () => 0, day);
    expect(next.roamers.tumbleweed.map).toBe("route_10");
    expect(next.roamers.coconut.map).toBe("route_8");
  });
  it.each(["game_cleared", "wanderers_free"])("requires %s for movement, replacement and BURR placement", (flag) => {
    const state = free(); state.flags[flag] = false;
    const rng = vi.fn(() => 0);
    expect(moveRoamers(state, DATA, rng, day).roamers).toEqual(state.roamers);
    expect(meetingRoamer(state, "route_10", "grass", rng)).toBeNull();
    expect(burrPlacement(state, map(), { x: 2, y: 2, facing: "up" }, () => false, rng)).toBeNull();
    expect(rng).not.toHaveBeenCalled();
  });
});

describe("encounter replacement", () => {
  it("can roll the required habitat on every roaming destination", () => {
    for (const id of ["tumbleweed", "coconut"] as const) for (const destination of ROAMER_MAPS[id]) {
      const state = free();
      state.roamers[id].map = destination;
      const encounter = rollEncounter(WORLD.maps[destination], id === "coconut" ? "water" : "tall_grass", "day", () => 0, true, state.flags);
      expect(encounter, `${id} on ${destination}`).not.toBeNull();
      expect(meetingRoamer(state, destination, encounter!.kind, () => 0)).toBe(id);
    }
  });
  it.each([
    ["tumbleweed", "route_10", "grass"], ["coconut", "route_8", "water"],
  ] as const)("replaces %s only below the 1/4 boundary", (id, location, kind) => {
    const state = free();
    expect(meetingRoamer(state, location, kind, () => 0)).toBe(id);
    expect(meetingRoamer(state, location, kind, () => 0.249999)).toBe(id);
    expect(meetingRoamer(state, location, kind, () => 0.25)).toBeNull();
    expect(meetingRoamer(state, location, kind, () => 0.999)).toBeNull();
  });
  it("does not replace bog encounters, the wrong habitat or a different map", () => {
    const state = free(), rng = vi.fn(() => 0);
    for (const kind of ["bog", "water"] as const) expect(meetingRoamer(state, "route_10", kind, rng)).toBeNull();
    expect(meetingRoamer(state, "route_8", "grass", rng)).toBeNull();
    expect(meetingRoamer(state, "route_11", "grass", rng)).toBeNull();
    expect(rng).not.toHaveBeenCalled();
  });
});

describe("wanderer battle lifecycle", () => {
  it("flees at the end of the first full wild turn unless caught, wilted or already ended", () => {
    expect(wandererFlees(true, 0, 10, null)).toBe(false);
    expect(wandererFlees(true, 1, 10, null)).toBe(true);
    expect(wandererFlees(false, 1, 10, null)).toBe(false);
    expect(wandererFlees(true, 1, 0, null)).toBe(false);
    for (const outcome of ["won", "caught", "lost", "fled"] as const) expect(wandererFlees(true, 1, 10, outcome)).toBe(false);
  });
  it.each(WANDERERS)("persists %s HP and status after fleeing or a player loss", (id) => {
    const state = free(), before = structuredClone(state);
    for (const outcome of ["fled", "lost"] as const) {
      const next = finishWandererBattle(state, id, { hp: 17, status: "rootbound" }, outcome, day);
      expect(wandererHealth(next, id)).toMatchObject({ hp: 17, status: "rootbound" });
      const moved = moveRoamers(next, DATA, () => 0.999, day);
      expect(wandererHealth(moved, id)).toMatchObject({ hp: 17, status: "rootbound" });
    }
    expect(state).toEqual(before);
  });
  it.each(WANDERERS)("caught %s stays gone on later days, even after it leaves the party", (id) => {
    const state = free();
    const caught = finishWandererBattle(state, id, { hp: 20, status: "blight" }, "caught", day);
    expect(wandererFree(caught, id)).toBe(false);
    expect(wandererFree(moveRoamers(caught, DATA, () => 0, tomorrow), id)).toBe(false);
    expect(state.flags[`wanderer_caught_${id}`]).toBeUndefined();
  });
  it.each(WANDERERS)("wilted %s returns fully healed on the next local calendar day", (id) => {
    const state = free();
    const wilted = finishWandererBattle(state, id, { hp: 0, status: "scorch" }, "won", day);
    const before = structuredClone(wilted);
    expect(wilted.wandererWilted?.[id]).toBe("2026-10-07");
    expect(wandererFree(wilted, id)).toBe(false);
    for (const now of [day, new Date(2026, 9, 6)]) {
      expect(wandererHealth(recoverWanderers(wilted, DATA, now), id).hp).toBe(0);
    }
    const next = recoverWanderers(wilted, DATA, tomorrow);
    expect(wandererHealth(next, id)).toMatchObject({ hp: wandererMaxHp(DATA, id), status: null });
    expect(next.wandererWilted?.[id]).toBeUndefined();
    expect(wandererFree(next, id)).toBe(true);
    expect(wilted).toEqual(before);
  });
  it("honours the caught Herbarium in migrated saves", () => {
    const state = free();
    state.herbarium.caught.push(...WANDERERS);
    for (const id of WANDERERS) expect(wandererFree(state, id)).toBe(false);
  });
});

describe("BURR hitch placement", () => {
  it("leaves the Seed Vault return warp free on the Route 9 arrival", () => {
    const state = free(), runtime = buildMap(WORLD.maps.route_9);
    refreshLegend(runtime, state.flags);
    const arrival = WORLD.maps.seed_vault_entrance.warps.find((w) => w.to === "route_9")!;
    expect(warpAt(runtime, 6, 0)?.to).toBe("seed_vault_entrance");
    expect(burrPlacement(state, runtime, { x: arrival.toX, y: arrival.toY, facing: arrival.facing! }, () => false, () => 0)).toBeNull();
  });
  it("reserves shared exit mats and tiles whose only exit is a warp", () => {
    const runtime = buildMap({ ...map().def, tiles: ["WWWW", "W..W", "WEEW", "WWWW"], legend: { W: "wall", ".": "grass", E: "mat_exit" },
      warps: [{ x: 1, y: 2, to: "player_home", toX: 2, toY: 2 }] });
    expect(burrTileSafe(runtime, 2, 2)).toBe(false); // shared mat has no own warp
    runtime.def.tiles[1] = "W.WW";
    expect(burrTileSafe(runtime, 1, 1)).toBe(false); // sole walkable exit is the mat
  });
  it.each([
    ["up", 2, 3], ["down", 2, 1], ["left", 3, 2], ["right", 1, 2],
  ] as [Dir, number, number][])("appears exactly behind a player facing %s", (facing, x, y) => {
    expect(burrPlacement(free(), map(), { x: 2, y: 2, facing }, () => false, () => 0))
      .toMatchObject({ id: "burr", sprite: "burr_hitch", x, y, facing });
  });
  it("rolls a seeded 1/8 chance on outdoor route entry only", () => {
    const state = free(), runtime = map(), player = { x: 2, y: 2, facing: "right" as const };
    expect(burrPlacement(state, runtime, player, () => false, () => 0.124999)).not.toBeNull();
    expect(burrPlacement(state, runtime, player, () => false, () => 0.125)).toBeNull();
    const a = seeded(15), b = seeded(15);
    const outcomes = Array.from({ length: 100 }, () => burrPlacement(state, runtime, player, () => false, a));
    expect(outcomes).toEqual(Array.from({ length: 100 }, () => burrPlacement(state, runtime, player, () => false, b)));
    expect(outcomes.some(Boolean)).toBe(true);
    expect(outcomes.some((p) => p === null)).toBe(true);
    runtime.def = { ...runtime.def, outdoor: false };
    expect(burrPlacement(state, runtime, player, () => false, () => 0)).toBeNull();
    runtime.def = { ...runtime.def, outdoor: true, id: "glasshouse_city" };
    expect(burrPlacement(state, runtime, player, () => false, () => 0)).toBeNull();
  });
  it("never uses occupied tiles, structures, walls, water or out-of-bounds tiles", () => {
    const state = free(), runtime = map(), player = { x: 2, y: 2, facing: "up" as const };
    expect(burrPlacement(state, runtime, player, () => true, () => 0)).toBeNull();
    runtime.solid.add("2,3");
    expect(burrPlacement(state, runtime, player, () => false, () => 0)).toBeNull();
    runtime.solid.clear();
    for (const tile of ["wall", "water"] as const) {
      runtime.def.legend = { ".": tile };
      expect(burrPlacement(state, runtime, player, () => false, () => 0)).toBeNull();
    }
    expect(burrPlacement(state, map(), { x: 0, y: 0, facing: "right" }, () => false, () => 0)).toBeNull();
  });
  it.each(["burr"] as WandererId[])("cannot place a caught or wilted %s", (id) => {
    for (const outcome of ["caught", "won"] as const) {
      const state = finishWandererBattle(free(), id, { hp: 0, status: null }, outcome, day);
      expect(burrPlacement(state, map(), { x: 2, y: 2, facing: "up" }, () => false, () => 0)).toBeNull();
    }
  });
});

describe("BURR on every route entry", () => {
  // Post-game flags: every chapter done, the Wanderers released.
  const cleared = (): GameState => {
    const state = free();
    for (let n = 4; n <= 10; n++) state.flags[`ch${n}_done`] = true;
    return state;
  };
  const routes = Object.values(WORLD.maps).filter((m) => m.outdoor && /^route_\d+$/.test(m.id));
  const entries = Object.values(WORLD.maps).flatMap((from) => from.warps
    .filter((w) => routes.some((r) => r.id === w.to))
    .map((w) => ({ from: from.id, to: w.to, x: w.toX, y: w.toY, facing: (w.facing ?? "down") as Dir })));

  /** The route as a post-game player finds it: every bramble pruned, gap bridged and pit filled. */
  function opened(state: GameState, to: MapId) {
    const runtime = buildMap(WORLD.maps[to]);
    refreshLegend(runtime, state.flags);
    for (const c of runtime.fieldCells ?? []) {
      const ch = Array.from(runtime.def.tiles[c.y])[c.x];
      const move = fieldMoveOf(runtime.legendOverride?.[ch] ?? runtime.def.legend[ch]);
      if (move) state.flags[fieldMoveFlag(move, to, c.x, c.y)] = true;
    }
    for (const c of runtime.pitCells ?? []) state.flags[filledPitFlag(to, c.x, c.y)] = true;
    refreshLegend(runtime, state.flags);
    return runtime;
  }

  /** Walk up to BURR_CATCH_UP_STEPS steps (raft allowed, warps avoided) and look for a catch-up tile. */
  function catchUpSpot(state: GameState, to: MapId, start: { x: number; y: number; facing: Dir }, follower: boolean) {
    const runtime = opened(state, to);
    const npcs = new Set(WORLD.maps[to].npcs.map((n) => `${n.x},${n.y}`));
    const blocked = (x: number, y: number) => npcs.has(`${x},${y}`);
    const startRafting = !isWalkable(runtime, start.x, start.y);
    const seen = new Set<string>();
    let frontier = [{ ...start, rafting: startRafting, steps: 0 }];
    while (frontier.length) {
      const next: typeof frontier = [];
      for (const s of frontier) for (const dir of Object.keys(DIRS) as Dir[]) {
        const move = tryRaftMove(runtime, s.x, s.y, dir, s.rafting, true, blocked);
        if (move.kind === "blocked" || warpAt(runtime, move.x, move.y)) continue;
        const steps = Math.min(BURR_CATCH_UP_STEPS, s.steps + 1);
        const at = { x: move.x, y: move.y, facing: dir };
        if (steps >= BURR_CATCH_UP_STEPS) {
          const { dx, dy } = DIRS[dir];
          // A walking follower fills the tile just behind; BURR may then land one further back.
          const occupied = (x: number, y: number) => blocked(x, y) || (follower && x === at.x - dx && y === at.y - dy);
          const burr = burrCatchUp(state, runtime, steps, at, occupied);
          if (burr) return burr;
        }
        const k = `${move.x},${move.y},${dir},${steps},${move.rafting}`;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ ...at, rafting: move.rafting, steps });
      }
      frontier = next;
    }
    return null;
  }

  it("covers every outdoor route", () => {
    expect(routes.length).toBeGreaterThanOrEqual(12);
    for (const r of routes) expect(entries.some((e) => e.to === r.id), r.id).toBe(true);
  });
  it.each(entries.map((e) => [`${e.from} -> ${e.to} (${e.x},${e.y})`, e] as const))(
    "can place BURR behind the player after arriving %s", (_, entry) => {
      const state = cleared();
      const runtime = opened(state, entry.to);
      // The 1/8 roll is kept even when the arrival tile behind is the exit warp.
      expect(burrRoll(state, runtime, () => 0)).toBe(true);
      const now = burrPlacement(state, runtime, entry, () => false, () => 0);
      if (now) expect(burrTileSafe(runtime, now.x, now.y)).toBe(true);
      for (const follower of [false, true]) {
        const later = catchUpSpot(state, entry.to, entry, follower);
        expect(later, `follower: ${follower}`).not.toBeNull();
        expect(burrTileSafe(runtime, later!.x, later!.y)).toBe(true);
      }
    });
  it("waits for the catch-up steps and for BURR to be free", () => {
    const state = cleared(), runtime = map();
    const at = { x: 2, y: 1, facing: "up" as const };
    expect(burrCatchUp(state, runtime, BURR_CATCH_UP_STEPS - 1, at, () => false)).toBeNull();
    expect(burrCatchUp(state, runtime, BURR_CATCH_UP_STEPS, at, () => false)).toMatchObject({ id: "burr", x: 2, y: 2 });
    // A follower on the tile just behind: BURR lands one further back.
    expect(burrCatchUp(state, runtime, BURR_CATCH_UP_STEPS, at, (x, y) => x === 2 && y === 2)).toMatchObject({ x: 2, y: 3 });
    state.flags.wanderer_caught_burr = true;
    expect(burrCatchUp(state, runtime, BURR_CATCH_UP_STEPS, at, () => false)).toBeNull();
  });
  it("only rolls on a free outdoor route, at 1/8", () => {
    const state = cleared(), runtime = buildMap(WORLD.maps.route_1);
    expect(burrRoll(state, runtime, () => 0.124999)).toBe(true);
    expect(burrRoll(state, runtime, () => 0.125)).toBe(false);
    const town = buildMap(WORLD.maps.fallowfield), rng = vi.fn(() => 0);
    expect(burrRoll(state, town, rng)).toBe(false);
    expect(rng).not.toHaveBeenCalled();
  });
});
