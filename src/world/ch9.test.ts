import { describe, expect, it } from "vitest";
import { MAP_IDS, type Cond, type MapId, type ScriptCmd } from "../contracts";
import { DATA } from "../data";
import { buildMap, DIRS, filledPitFlag, key, refreshLegend, tileAt, tryMove } from "../overworld/map";
import { reachableBoulderTiles, solveBoulderPuzzle } from "../overworld/uproot";
import { WORLD } from "./index";
import { checkProgressWithoutFigRoot, eachCmd, flood, grid, validateWorld, walkable } from "./validate";

const CH9: MapId[] = ["route_10", "thistledown", "thistledown_greenhouse", "thistledown_market", "thistledown_house", "route_11", "sanguine_greenhouse", "sanguine_ridge", "sanguine_conservatory"];
const holds = (c: Cond | undefined, flags: Record<string, boolean>) => !c || c.every((v) => (flags[v.flag] ?? false) === v.is);

describe("Chapter 9 world", () => {
  it("appends the eight maps in order, with the extra greenhouse after Route 11", () => {
    expect(MAP_IDS.slice(MAP_IDS.indexOf("route_10"))).toEqual(CH9);
    for (const [id, w, h, outdoor, music, ambient] of [
      ["route_10", 50, 20, true, "route", "leaves"],
      ["thistledown", 30, 26, true, "small_town", "leaves"],
      ["thistledown_greenhouse", 11, 9, false, "greenhouse", undefined],
      ["thistledown_market", 14, 9, false, "market", undefined],
      ["thistledown_house", 9, 8, false, "herbarium", undefined],
      ["route_11", 28, 56, true, "route", "none"],
      ["sanguine_ridge", 32, 28, true, "small_town", "none"],
      ["sanguine_conservatory", 18, 20, false, "conservatory", "none"],
    ] as const) {
      const m = WORLD.maps[id];
      expect([grid(m).w, grid(m).h, m.outdoor, m.music, m.ambient]).toEqual([w, h, outdoor, music, ambient]);
    }
  });

  it("closes the only city east exit until ch8_done", () => {
    const m = WORLD.maps.glasshouse_city, g = grid(m);
    const exits = m.warps.filter((w) => w.to === "route_10");
    expect(exits).toHaveLength(1);
    expect(m.npcs.find((n) => n.id === "east_gate_guard")).toMatchObject({ script: "ch9_east_gate", visibleWhen: [{ flag: "ch8_done", is: false }] });
    for (const done of [false, true]) {
      const occupied = new Set(m.npcs.filter((n) => holds(n.visibleWhen, { ch8_done: done })).map((n) => key(n.x, n.y)));
      const reach = flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) || occupied.has(key(x, y)) }, [{ x: 20, y: 23 }]);
      expect(reach.has(key(exits[0].x, exits[0].y))).toBe(done);
    }
    expect(flood(grid(WORLD.maps.route_10), [{ x: 1, y: 10 }]).has("49,10")).toBe(true);
  });

  it("guards the sole conservatory door approach until rival_5_done", () => {
    const m = WORLD.maps.sanguine_ridge, g = grid(m);
    const door = m.warps.find((w) => w.to === "sanguine_conservatory")!;
    const trigger = m.triggers.find((t) => t.script === "ch9_cons8_door")!;
    expect(trigger).toMatchObject({ x: door.x, y: door.y + 1 });
    for (const done of [false, true]) {
      const ops: ScriptCmd[] = [];
      const run = (cmds: ScriptCmd[]) => { for (const c of cmds) {
        if (c.op === "if") run(holds(c.when, { rival_5_done: done }) ? c.then : c.else ?? []);
        else ops.push(c);
      } };
      run(WORLD.scripts.ch9_cons8_door);
      expect(holds(trigger.when, { rival_5_done: done })).toBe(!done);
      expect(ops.filter((c) => c.op === "movePlayer")).toEqual(done ? [] : [{ op: "movePlayer", path: ["down"] }]);
      const reach = flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) || (!done && x === trigger.x && y === trigger.y) }, [{ x: 15, y: 26 }]);
      expect(reach.has(key(door.x, door.y))).toBe(done);
    }
  });

  it("requires ROOT BRIDGE for the side ledge, leaving the main canyon open", () => {
    const m = WORLD.maps.route_11;
    const gaps = m.tiles.flatMap((row, y) => [...row].flatMap((ch, x) => m.legend[ch] === "root_gap" ? [{ x, y }] : []));
    expect(gaps).toEqual([{ x: 19, y: 35 }]);
    expect(m.hidden).toEqual([{ x: 23, y: 35, item: "rain_jar" }]);
    for (const bridged of [false, true]) {
      const reach = flood(grid(m, { bridged }), [{ x: 13, y: 54 }]);
      expect(reach.has("23,35")).toBe(bridged);
      expect(reach.has("13,0")).toBe(true);
    }
    const runtime = buildMap(m);
    expect(tryMove(runtime, 18, 35, "right").kind).toBe("blocked");
    refreshLegend(runtime, { bridged_route_11_19_35: true });
    expect(tileAt(runtime, 19, 35)).toBe("root_bridge");
    expect(tryMove(runtime, 18, 35, "right").kind).toBe("walk");
  });

  it("validates the root-gap stash through Rook's actual Fig Root reward", () => {
    // Chapter 8 remains staged with stub scripts. Model that prerequisite's
    // completion while exercising Chapter 9's actual gated reward chain.
    const world = structuredClone(WORLD);
    world.scripts.ch8_arrival = [{ op: "setFlag", flag: "ch8_done" }];
    expect(checkProgressWithoutFigRoot(world)).toEqual([]);
    expect(validateWorld(world)).toEqual([]);
  });

  it("uses precisely the specified wild slots with every numeric growth cap", () => {
    const tuples = (id: MapId) => WORLD.maps[id].encounters!.grass!.slots.map((s) => [s.species, s.weight, s.minLevel, s.maxLevel, s.time]);
    expect(tuples("route_10")).toEqual([
      ["lithops_pebble", 25, 27, 27, undefined], ["prickly_pear", 20, 40, 44, undefined],
      ["pear_pad", 15, 21, 21, undefined], ["saguaro_column", 15, 39, 39, undefined],
      ["dandelion", 15, 23, 23, undefined], ["pitaya_cutting", 10, 37, 37, "night"],
    ]);
    expect(tuples("route_11")).toEqual([
      ["lithops_pair", 25, 39, 39, undefined], ["dragon_seedling", 25, 29, 29, undefined],
      ["pitaya_cutting", 20, 37, 37, undefined], ["snapdragon_sprout", 15, 21, 21, undefined],
      ["saguaro_column", 15, 39, 39, undefined],
    ]);
    // Extend the growth-cap coverage across Chapters 5–9, including variants.
    for (const id of MAP_IDS.slice(MAP_IDS.indexOf("route_6"))) for (const m of [WORLD.maps[id]]) for (const enc of [m.encounters, ...(m.encountersWhen ?? []).map((s) => s.encounters)]) {
      for (const table of Object.values(enc ?? {})) for (const slot of table.slots) {
        const growth = DATA.species[slot.species].growsInto?.trigger;
        if (growth && "level" in growth) expect(slot.maxLevel, `${m.id} ${slot.species}`).toBeLessThan(growth.level);
        expect(slot.minLevel).toBeLessThanOrEqual(slot.maxLevel);
      }
    }
  });

  it("stages all prescribed actors, triggers and scripts", () => {
    for (const [map, id, script] of [
      ["glasshouse_city", "east_gate_guard", "ch9_east_gate"], ["thistledown", "tumbleweed_sighting", "ch9_tumbleweed"],
      ["thistledown_house", "stone_botanist", "q_window_panes"], ["route_11", "bram", "rival_5"], ["sanguine_conservatory", "rook", "rook"],
    ] as const) expect(WORLD.maps[map].npcs.find((n) => n.id === id)?.script).toBe(script);
    expect(WORLD.maps.thistledown_house.npcs.find((n) => n.id === "stone_botanist")?.sprite).toBe("researcher");
    expect(WORLD.maps.thistledown.npcs.find((n) => n.id === "tumbleweed_sighting")).toMatchObject({ sprite: "item_pickup", visibleWhen: [{ flag: "tumbleweed_seen", is: false }] });
    expect(WORLD.maps.route_11.triggers.find((t) => t.script === "rival_5")?.when).toEqual([{ flag: "rival_5_done", is: false }]);
    expect(WORLD.maps.thistledown.onEnter).toBe("ch9_arrival");
    expect(WORLD.maps.sanguine_ridge.onEnter).toBe("ch9_end");
    for (const id of ["ch9_east_gate", "ch9_arrival", "rival_5", "ch9_cons8_door", "rook", "ch9_rook_after", "ch9_end", "q_window_panes"]) expect(WORLD.scripts[id], id).toBeDefined();
    for (const id of ["route_10", "route_11"] as const) expect(WORLD.maps[id].npcs.filter((n) => n.trainer)).toHaveLength(4);
    expect(WORLD.maps.route_10.hidden).toHaveLength(2);
    expect(WORLD.maps.sanguine_conservatory.npcs.filter((n) => n.trainer)).toHaveLength(2);
    expect(WORLD.maps.sanguine_ridge.structures.filter((s) => s.key === "big_oak")).toHaveLength(3);
    const stock: string[] = [];
    for (const id of ["ch9_market_pods", "ch9_market_care"]) eachCmd(WORLD.scripts[id], (c) => { if (c.op === "shop") stock.push(...c.stock); });
    expect(stock).toEqual(["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost", "neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar", "ember_ash"]);
  });

  it("uses the exact route and junior teams, portraits and placeholder lines", () => {
    const teams = {
      drifter_dune: [["prickly_pear", 43], ["lithops_pair", 42]], drifter_mesa: [["saguaro", 44]],
      botanist_sage2: [["pitaya_cutting", 43], ["foxglove", 43]], botanist_rue: [["lithops_pair", 43], ["dandelion_clock", 43]],
      climber_red: [["snapdragon_sprout", 44], ["larch", 45]], climber_ochre: [["dragon_sapling", 45]],
      ranger_flint: [["dragon_fruit", 45], ["saguaro", 45]], ranger_shale: [["lithops_bloom", 46]],
      jr_ember: [["snapdragon_sprout", 47], ["dragon_sapling", 47]], jr_scale: [["pitaya_cutting", 47], ["lithops_pair", 48]],
    };
    for (const [id, team] of Object.entries(teams)) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => [q.species, q.level])).toEqual(team);
      const hiker = id.startsWith("drifter") || id.startsWith("climber"), ranger = id.startsWith("ranger");
      expect([t.portrait, t.className]).toEqual(hiker ? ["hiker", "HIKER"] : ranger ? ["birdwatcher", "BIRDWATCHER"] : ["gardener", id.startsWith("jr_") ? "JR.GARDENER" : "GARDENER"]);
      expect(t.music).toBe("battle_trainer");
    }
    for (const id of [...Object.keys(teams), "rook", "rival_5_oak", "rival_5_chili", "rival_5_lily"]) {
      const t = WORLD.trainers[id];
      for (const line of [t.intro, t.defeat, t.after]) expect(line).toContain("TODO(text)");
    }
  });

  it("keeps Rival 5's stage-three partner ungrafted, and Rook's tuning within ±2", () => {
    for (const [line, starter] of [["oak", "great_oak"], ["chili", "red_chili"], ["lily", "giant_water_lily"]] as const) {
      const t = WORLD.trainers[`rival_5_${line}`];
      expect(t).toMatchObject({ portrait: "bram", className: "RIVAL", ai: "smart" });
      expect(t.team.map((q) => [q.species, q.level])).toEqual([["blackberry", 46], ["dandelion_clock", 46], ["sugar_maple", 47], ["red_cedar", 47], [starter, 49]]);
      expect(t.team.some((q) => q.grafted)).toBe(false);
      expect(t.team.slice(0, 4).map((q) => q.moves)).toEqual([
        undefined, ["wind_scatter", "sunbeam", "perfume"], ["samara_spin", "sap_spout", "sugar_rush", "hoarfrost"], ["leaf_edge", "pale_touch", "sap_seal", "heartwood"],
      ]);
    }
    const t = WORLD.trainers.rook;
    expect(t).toMatchObject({ portrait: "hollis", className: "WARDEN", ai: "smart", music: "battle_leader", mark: "resin_mark", items: [{ item: "spring_water", qty: 2 }] });
    expect(t.team.map((q) => [q.species, q.level])).toEqual([["snapdragon", 47], ["dragon_fruit", 48], ["lithops_bloom", 48], ["dragon_tree", 51]]);
    t.team.forEach((q, i) => expect(Math.abs(q.level - [49, 50, 50, 53][i])).toBeLessThanOrEqual(2));
    expect(t.team.map((q) => q.moves)).toEqual([
      ["dragon_snap", "red_resin", "perfume"], ["night_bloom", "spine_volley", "nectar_lure"],
      ["thorn_lash", "stone_window", "bristle"], ["dragon_resin", "sap_seal", "bark_skin"],
    ]);
    // Every tuned move is actually learned by its species at this level.
    for (const id of ["rook", "rival_5_oak", "rival_5_chili", "rival_5_lily"]) for (const q of WORLD.trainers[id].team) {
      for (const move of q.moves ?? []) expect(DATA.species[q.species].learnset.some((m) => m.move === move && m.level <= q.level), `${q.species} ${move}`).toBe(true);
    }
  });

  it("has valid, unoccupied glide landings below both healing doors", () => {
    for (const [town, interior] of [["thistledown", "thistledown_greenhouse"], ["sanguine_ridge", "sanguine_greenhouse"]] as const) {
      const m = WORLD.maps[town], d = WORLD.glide!.find((d) => d.map === town)!;
      const door = m.warps.find((w) => w.to === interior)!;
      expect(d).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
      expect(walkable(grid(m), d.x, d.y)).toBe(true);
      expect(m.npcs.some((n) => n.x === d.x && n.y === d.y)).toBe(false);
      expect(WORLD.maps[interior].healPoint).toBeDefined();
    }
  });
});

describe("ROOK boulder pits", () => {
  it("is solvable fresh and after every subset of filled pits with reset boulders", () => {
    const m = WORLD.maps.sanguine_conservatory, stones = m.npcs.filter((n) => n.pushable);
    const start = { x: 8, y: 18 }, goal = { x: 8, y: 3 }, exit = { x: 8, y: 19 };
    const pits = m.tiles.flatMap((row, y) => [...row].flatMap((ch, x) => m.legend[ch] === "pit" ? [{ x, y }] : []));
    expect(pits).toEqual([{ x: 8, y: 6 }, { x: 8, y: 10 }, { x: 8, y: 14 }]);
    expect(stones).toHaveLength(4);
    expect(solveBoulderPuzzle(buildMap(m), [], start, goal)).toBe(false);
    const before = JSON.stringify(m);
    for (let subset = 0; subset < 8; subset++) {
      const runtime = buildMap(m);
      const flags = Object.fromEntries(pits.map((p, i) => [filledPitFlag(m.id, p.x, p.y), !!(subset & (1 << i))]));
      refreshLegend(runtime, flags);
      expect(solveBoulderPuzzle(runtime, stones, start, goal), `filled subset ${subset.toString(2)}`).toBe(true);
      expect(solveBoulderPuzzle(runtime, stones, start, exit), `exit subset ${subset.toString(2)}`).toBe(true);
      const reach = reachableBoulderTiles(runtime, stones, start);
      for (const n of m.npcs.filter((n) => !n.pushable)) expect(Object.values(DIRS).some(({ dx, dy }) => reach.has(key(n.x + dx, n.y + dy))), `subset ${subset} ${n.id}`).toBe(true);
    }
    expect(JSON.stringify(m)).toBe(before);
  });
});
