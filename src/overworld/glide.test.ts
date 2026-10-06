import { describe, expect, it } from "vitest";
import type { MapId } from "../contracts";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { availableGlideDestinations, canGlide, glideLanding, visitedGlideMaps } from "./glide";

const fresh = () => newGameState({ world: WORLD });

describe("SEED GLIDE", () => {
  it("requires the seed, outdoors and no running script", () => {
    const state = fresh();
    expect(canGlide(state, WORLD.maps.route_1, false)).toBe(false);
    state.bag.glider_seed = 1;
    expect(canGlide(state, WORLD.maps.route_1, false)).toBe(true);
    expect(canGlide(state, WORLD.maps.glasshouse_city, false)).toBe(true);
    expect(canGlide(state, WORLD.maps.herbarium, false)).toBe(false);
    expect(canGlide(state, WORLD.maps.route_1, true)).toBe(false);
    expect(canGlide(state, undefined, false)).toBe(false);
    state.bag.glider_seed = 0;
    expect(canGlide(state, WORLD.maps.route_1, false)).toBe(false);
  });

  it("always visits Fallowfield, even before the roof prologue ends", () => {
    const state = fresh();
    expect(visitedGlideMaps(state)).toEqual(["fallowfield"]);
    expect(availableGlideDestinations(WORLD, state).map((d) => d.map)).toEqual(["fallowfield"]);
    state.position.map = "fallowfield";
    expect(availableGlideDestinations(WORLD, state)).toEqual([]);
  });

  it("offers visited towns other than the current town, in world order", () => {
    const state = fresh();
    state.flags.visited_bramblegate = true;
    state.position.map = "bramblegate";
    expect(availableGlideDestinations(WORLD, state).map((d) => d.map)).toEqual(["fallowfield"]);
    state.position.map = "route_1";
    expect(availableGlideDestinations(WORLD, state).map((d) => d.map)).toEqual(["fallowfield", "bramblegate"]);
    expect(glideLanding(WORLD, state, "sugarbush")).toBeUndefined();
    expect(glideLanding(WORLD, state, "route_1")).toBeUndefined();
    expect(glideLanding(WORLD, state, "bramblegate")).toEqual({ map: "bramblegate", x: 19, y: 6, facing: "down", name: "BRAMBLEGATE" });
    expect(availableGlideDestinations({}, state)).toEqual([]);
  });

  it.each([
    ["bramblegate", 2], ["bramblegate_market", 2], ["route_3", 2],
    ["sugarbush", 3], ["sugarbush_grove", 3], ["route_4", 3],
    ["glasshouse_city", 4], ["glasshouse_nursery", 4], ["palm_house", 4],
  ] as [MapId, number][])("recovers old visits from being on %s", (map, count) => {
    const state = fresh();
    state.position.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(count);
    expect(state.flags).toEqual({}); // pure, no migration writes here
  });

  it.each([
    ["saw_grunt_bg", 2], ["sb_arrival_seen", 3], ["grove_cleared", 3],
    ["ch4_started", 3], ["gc_arrival_seen", 4], ["relay_listened", 4],
  ])("recovers old visits from %s without unlocking the next town", (flag, count) => {
    const state = fresh();
    state.flags[flag] = true;
    expect(visitedGlideMaps(state)).toHaveLength(count);
    state.flags[flag] = false;
    expect(visitedGlideMaps(state)).toEqual(["fallowfield"]);
  });

  it("recovers visits from marks, the healing point and previously earned shears", () => {
    const state = fresh();
    state.marks = ["bramble_mark"];
    expect(visitedGlideMaps(state)).toHaveLength(2);
    state.marks = ["sundew_mark"];
    expect(visitedGlideMaps(state)).toHaveLength(3);
    state.marks = ["rose_mark"];
    expect(visitedGlideMaps(state)).toHaveLength(4);
    state.marks = [];
    state.heal.map = "sugarbush_greenhouse";
    expect(visitedGlideMaps(state)).toHaveLength(3);
    state.heal.map = "player_home";
    state.bag.pruning_shears = 1;
    expect(visitedGlideMaps(state)).toHaveLength(4);
  });

  // Bug hunt finding: carrying the shears used to cap visits at Glasshouse City.
  it("keeps Cedarhallow with the shears in the bag, on Route 6, after the Pipe Mark", () => {
    const state = fresh();
    state.bag.pruning_shears = 1;
    state.marks = ["pipe_mark"];
    state.flags.visited_cedarhallow = true;
    state.position.map = "route_6";
    expect(visitedGlideMaps(state)).toContain("cedarhallow");
    expect(visitedGlideMaps(state)).toHaveLength(5);
  });
});
