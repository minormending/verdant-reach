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
  it.each([
    ["saltmarsh_harbour", 6], ["saltmarsh_market", 6], ["saltmarsh_greenhouse", 6], ["route_8", 6],
    ["driftseed_isle", 7], ["driftseed_greenhouse", 7], ["driftseed_conservatory", 7], ["driftseed_vents", 7],
    ["route_7", 5],
  ] as [MapId, number][])("recovers Chapter 6 visits from %s, retaining the shears minimum", (map, count) => {
    const state = fresh();
    state.position.map = map;
    state.bag.pruning_shears = 1;
    expect(visitedGlideMaps(state)).toHaveLength(count);
    state.position.map = "player_home";
    state.heal.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(count);
  });

  it("does not mistake the open ford or raft for an island visit", () => {
    const state = fresh();
    state.flags.ch5_done = true;
    expect(visitedGlideMaps(state)).not.toContain("saltmarsh_harbour");
    state.flags.got_raft = true;
    expect(visitedGlideMaps(state)).toContain("saltmarsh_harbour");
    expect(visitedGlideMaps(state)).not.toContain("driftseed_isle");
  });

  it("recovers both towns from post-sap scenes and either Chapter 6 mark", () => {
    for (const flag of ["got_saxifrage", "got_sap", "lantern_healed", "beat_saguaro", "beat_reyes", "ch6_done", "visited_driftseed_isle"]) {
      const state = fresh();
      state.flags[flag] = true;
      state.bag.pruning_shears = 1;
      expect(visitedGlideMaps(state)).toHaveLength(7);
      expect(glideLanding(WORLD, state, "driftseed_isle")).toBeDefined();
    }
    for (const mark of ["cactus_mark", "mangrove_mark"] as const) {
      const state = fresh();
      state.marks = [mark];
      state.bag.pruning_shears = 1;
      expect(visitedGlideMaps(state)).toHaveLength(7);
    }
  });

  it.each(["larchmere", "larchmere_lodge", "larchmere_market", "larchmere_greenhouse", "larchmere_conservatory", "bloom_lake", "rootstock_hideout_1", "rootstock_hideout_2"] as MapId[])("recovers Chapter 7 visits from %s without a shears cap", (map) => {
    const state = fresh();
    state.bag.pruning_shears = 1;
    state.position.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(8);
    state.position.map = "player_home";
    state.heal.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(8);
  });

  it("requires evidence of Larchmere arrival beyond the cleared pass", () => {
    const state = fresh();
    state.flags.ch6_done = true;
    state.position.map = "route_9";
    state.bag.pruning_shears = 1;
    expect(visitedGlideMaps(state)).toHaveLength(7);
    expect(glideLanding(WORLD, state, "larchmere")).toBeUndefined();
    state.flags.ch7_arrived = true;
    expect(visitedGlideMaps(state)).toHaveLength(8);
    expect(glideLanding(WORLD, state, "larchmere")).toMatchObject({ x: 6, y: 12 });
    state.flags = {};
    state.position.map = "player_home";
    state.marks = ["snowdrop_mark"];
    expect(visitedGlideMaps(state)).toHaveLength(8);
  });

});

describe("Chapter 9 SEED GLIDE visits", () => {
  it.each([
    ["route_10", 8], ["relay_roof", 8], ["thistledown", 9], ["thistledown_house", 9],
    ["thistledown_market", 9], ["thistledown_greenhouse", 9], ["route_11", 9],
    ["sanguine_ridge", 10], ["sanguine_greenhouse", 10], ["sanguine_conservatory", 10],
  ] as [MapId, number][])("infers visits from %s and its healing point", (map, count) => {
    const state = fresh();
    state.position.map = map;
    state.bag.pruning_shears = 1;
    expect(visitedGlideMaps(state)).toHaveLength(count);
    state.position.map = "player_home";
    state.heal.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(count);
  });

  it("does not unlock Thistledown from an open east gate, or the Ridge from BRAM", () => {
    const state = fresh();
    state.flags.ch8_done = true;
    state.position.map = "route_10";
    expect(glideLanding(WORLD, state, "thistledown")).toBeUndefined();
    for (const flag of ["ch9_arrived", "tumbleweed_seen", "rival_5_done", "visited_thistledown"]) {
      state.flags = { [flag]: true };
      expect(visitedGlideMaps(state)).toHaveLength(9);
      expect(glideLanding(WORLD, state, "thistledown")).toBeDefined();
      expect(glideLanding(WORLD, state, "sanguine_ridge")).toBeUndefined();
    }
  });

  it("infers the Ridge from its mark and completion scenes, excluding the current town", () => {
    for (const flag of ["beat_rook", "got_fig_root", "ch9_done", "visited_sanguine_ridge"]) {
      const state = fresh();
      state.flags[flag] = true;
      expect(visitedGlideMaps(state)).toHaveLength(10);
      expect(glideLanding(WORLD, state, "sanguine_ridge")).toMatchObject({ x: 6, y: 12 });
    }
    const state = fresh();
    state.marks = ["resin_mark"];
    expect(visitedGlideMaps(state)).toHaveLength(10);
    state.position.map = "sanguine_ridge";
    expect(glideLanding(WORLD, state, "sanguine_ridge")).toBeUndefined();
    expect(glideLanding(WORLD, state, "thistledown")).toMatchObject({ x: 6, y: 11 });
  });
});

describe("Chapter 10 SEED GLIDE visits", () => {
  it.each(["council_arboretum", "arboretum_greenhouse", "council_hall", "elder_grove_1", "elder_grove_2", "elder_grove_3", "elder_grove_heart"] as MapId[])("infers Arboretum visits from %s and its healing point", (map) => {
    const state = fresh();
    state.position.map = map;
    expect(visitedGlideMaps(state)).toHaveLength(11);
    state.position.map = "player_home";
    state.heal.map = map;
    expect(glideLanding(WORLD, state, "council_arboretum")).toMatchObject({ x: 6, y: 20 });
  });

  it("requires arrival evidence beyond the west road and the eight marks", () => {
    const state = fresh();
    state.flags.ch9_done = true;
    state.position.map = "route_12";
    state.marks = ["bramble_mark", "sundew_mark", "rose_mark", "pipe_mark", "cactus_mark", "mangrove_mark", "snowdrop_mark", "resin_mark"];
    expect(glideLanding(WORLD, state, "council_arboretum")).toBeUndefined();
    for (const flag of ["ch10_arrived", "bram_joined", "beat_shears_2", "beat_mercer", "ch10_done", "visited_council_arboretum"]) {
      state.flags = { [flag]: true };
      expect(glideLanding(WORLD, state, "council_arboretum")).toBeDefined();
    }
    state.position.map = "council_arboretum";
    expect(glideLanding(WORLD, state, "council_arboretum")).toBeUndefined();
  });
});
