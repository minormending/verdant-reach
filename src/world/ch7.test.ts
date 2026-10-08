import { describe, expect, it } from "vitest";
import { MAP_IDS, TILES, type Cond, type MapId, type ScriptCmd } from "../contracts";
import { DATA } from "../data";
import { buildMap, DIRS, key, tileAt, tryMove } from "../overworld/map";
import { reachableIceStops, solveIcePuzzle } from "../overworld/ice";
import { WORLD } from "./index";
import { eachCmd, flood, grid, isTalkTrigger, walkable } from "./validate";

const CH7: MapId[] = ["route_9", "larchmere", "larchmere_greenhouse", "larchmere_market", "bloom_lake", "larchmere_lodge", "rootstock_hideout_1", "rootstock_hideout_2", "larchmere_conservatory"];
const holds = (c: Cond | undefined, flags: Record<string, boolean>) => !c || c.every((v) => (flags[v.flag] ?? false) === v.is);
const resolved = (id: MapId, flags: Record<string, boolean>) => {
  const m = WORLD.maps[id];
  return { ...m, legend: { ...m.legend, ...(m.legendWhen?.find((s) => holds(s.when, flags))?.legend ?? {}) } };
};

describe("Chapter 7 world", () => {
  it("appends all nine maps in order at their prescribed dimensions", () => {
    expect(MAP_IDS.slice(-9)).toEqual(CH7);
    for (const [id, w, h] of [
      ["route_9", 30, 56], ["larchmere", 36, 30], ["bloom_lake", 36, 36],
      ["larchmere_lodge", 14, 12], ["rootstock_hideout_1", 24, 20], ["rootstock_hideout_2", 18, 16], ["larchmere_conservatory", 16, 20],
    ] as const) expect([grid(WORLD.maps[id]).w, grid(WORLD.maps[id]).h]).toEqual([w, h]);
  });

  it("keeps the single north pass closed until ch6_done", () => {
    const m = WORLD.maps.cedarhallow, g = grid(m);
    const exits = m.warps.filter((w) => w.to === "route_9");
    expect(exits).toHaveLength(1);
    expect(m.npcs.find((n) => n.id === "pass_ranger")).toMatchObject({ sprite: "hiker", script: "ch7_pass_ranger", visibleWhen: [{ flag: "ch6_done", is: false }] });
    for (const done of [false, true]) {
      const occupied = new Set(m.npcs.filter((n) => holds(n.visibleWhen, { ch6_done: done })).map((n) => key(n.x, n.y)));
      const reach = flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) || occupied.has(key(x, y)) }, [{ x: 17, y: 20 }]);
      expect(reach.has(key(exits[0].x, exits[0].y))).toBe(done);
    }
    expect(flood(grid(WORLD.maps.route_9), [{ x: 14, y: 54 }]).has("14,0")).toBe(true);
  });

  it("gates the bookcase, B1 stairs and one-way B2 tunnel on their flags", () => {
    for (const open of [false, true]) {
      const lodge = buildMap(resolved("larchmere_lodge", { lodge_stair_open: open }));
      expect(tileAt(lodge, 10, 2)).toBe(open ? "stairs_down" : "bookshelf");
      expect(tryMove(lodge, 10, 3, "up").kind === "walk").toBe(open);
      const b1 = buildMap(resolved("rootstock_hideout_1", { emitters_off: open }));
      expect(tileAt(b1, 21, 2)).toBe(open ? "stairs_down" : "hideout_wall");
      expect(tryMove(b1, 21, 3, "up").kind === "walk").toBe(open);
      const b2 = buildMap(resolved("rootstock_hideout_2", { beat_calloway: open, files_read: open }));
      expect(tryMove(b2, 15, 3, "up").kind === "walk").toBe(open);
    }
    for (const flags of [{ beat_calloway: true, files_read: false }, { beat_calloway: false, files_read: true }]) {
      const b2 = buildMap(resolved("rootstock_hideout_2", flags));
      expect(tryMove(b2, 15, 3, "up").kind).toBe("blocked");
    }
    expect(WORLD.maps.rootstock_hideout_2.warps.some((w) => w.to === "larchmere")).toBe(true);
    expect(WORLD.maps.larchmere.warps.some((w) => w.to === "rootstock_hideout_2")).toBe(false);
    expect(isTalkTrigger(grid(WORLD.maps.larchmere_lodge), WORLD.maps.larchmere_lodge.triggers.find((t) => t.script === "ch7_bookcase")!)).toBe(true);
    expect(isTalkTrigger(grid(WORLD.maps.rootstock_hideout_2), WORLD.maps.rootstock_hideout_2.triggers[0])).toBe(true);
  });

  it("refuses the Conservatory until lake_calmed, moving the player away", () => {
    const m = WORLD.maps.larchmere;
    const door = m.warps.find((w) => w.to === "larchmere_conservatory")!;
    const trigger = m.triggers.find((t) => t.script === "ch7_cons7_door")!;
    expect(trigger).toMatchObject({ x: door.x, y: door.y + 1 });
    for (const calm of [false, true]) {
      const ops: ScriptCmd[] = [];
      const run = (cmds: ScriptCmd[]) => { for (const c of cmds) {
        if (c.op === "if") run(holds(c.when, { lake_calmed: calm }) ? c.then : c.else ?? []);
        else ops.push(c);
      } };
      run(WORLD.scripts.ch7_cons7_door);
      expect(holds(trigger.when, { lake_calmed: calm })).toBe(!calm);
      expect(ops.filter((c) => c.op === "movePlayer")).toEqual(calm ? [] : [{ op: "movePlayer", path: ["down"] }]);
    }
  });

  it("requires RAFT to reach the lily and preserves water-to-water warp arrivals", () => {
    const m = WORLD.maps.bloom_lake;
    for (const rafting of [false, true]) {
      const reach = flood(grid(m, { rafting }), [{ x: 1, y: 17 }]);
      expect(reach.has("18,19")).toBe(rafting);
    }
    const isWater = (id: MapId, x: number, y: number) => !!(TILES[grid(WORLD.maps[id]).tile(x, y)!] as { water?: boolean })?.water;
    // Apply the Chapter 6 crossing rule to the entire world, including new lake maps.
    for (const m of Object.values(WORLD.maps)) for (const w of m.warps) {
      if (isWater(m.id, w.x, w.y)) expect(isWater(w.to, w.toX, w.toY), `${m.id} -> ${w.to}`).toBe(true);
      else expect(walkable(grid(WORLD.maps[w.to]), w.toX, w.toY), `${m.id} -> ${w.to}`).toBe(true);
    }
  });

  it("plays the Chapter 7 music: alpine on the pass and in town, the red lake until calmed, the hideout below", () => {
    const musicAt = (id: MapId, flags: Record<string, boolean>) =>
      WORLD.maps[id].musicWhen?.find((o) => holds(o.when, flags))?.music ?? WORLD.maps[id].music;
    expect(musicAt("route_9", {})).toBe("alpine");
    expect(musicAt("larchmere", {})).toBe("alpine");
    expect(musicAt("bloom_lake", { lake_calmed: false })).toBe("red_lake");
    expect(musicAt("bloom_lake", { lake_calmed: true })).toBe("route");
    expect(musicAt("rootstock_hideout_1", {})).toBe("hideout");
    expect(musicAt("rootstock_hideout_2", {})).toBe("hideout");
  });

  it("uses the exact capped encounters before and after calming the lake", () => {
    const tuples = (slots: NonNullable<NonNullable<typeof WORLD.maps.route_9.encounters>["grass"]>["slots"]) => slots.map((s) => [s.species, s.weight, s.minLevel, s.maxLevel]);
    expect(tuples(WORLD.maps.route_9.encounters!.grass!.slots)).toEqual([
      ["larch_seedling", 25, 32, 33], ["campion_cushion", 25, 29, 29], ["edelweiss_bud", 20, 31, 31],
      ["holly", 10, 32, 35], ["peppermint", 10, 32, 35], ["snowdrop_bulb", 10, 32, 35],
    ]);
    const m = WORLD.maps.bloom_lake, calm = m.encountersWhen![0];
    expect(calm.when).toEqual([{ flag: "lake_calmed", is: true }]);
    expect(m.encounters!.water!.rate).toBe(20);
    expect(calm.encounters!.water!.rate).toBe(8);
    expect(tuples(m.encounters!.water!.slots)).toEqual([["bladderwort_sprig", 35, 32, 32], ["lily_pad", 25, 31, 31], ["cattail", 20, 36, 40], ["eelgrass", 20, 36, 40]]);
    expect(tuples(calm.encounters!.water!.slots)).toEqual([["bladderwort_sprig", 40, 32, 32], ["eelgrass", 30, 33, 37], ["lily_pad", 30, 31, 31]]);
    const shore = [["edelweiss_bud", 40, 31, 31], ["campion_cushion", 30, 29, 29], ["snowdrop_bulb", 30, 33, 36]];
    expect(tuples(m.encounters!.grass!.slots)).toEqual(shore);
    expect(tuples(calm.encounters!.grass!.slots)).toEqual(shore);
    for (const id of CH7) for (const enc of [WORLD.maps[id].encounters, ...(WORLD.maps[id].encountersWhen ?? []).map((s) => s.encounters)]) {
      for (const table of Object.values(enc ?? {})) for (const s of table.slots) {
        const trigger = DATA.species[s.species].growsInto?.trigger;
        if (trigger && "level" in trigger) expect(s.maxLevel, `${id} ${s.species}`).toBeLessThan(trigger.level);
        expect(s.minLevel).toBeLessThanOrEqual(s.maxLevel);
      }
    }
  });

  it("places the exact story NPCs, triggers, trainer ids and all stub scripts", () => {
    for (const [map, id, script] of [
      ["route_9", "mountaineer", "q_lost_climber"], ["bloom_lake", "crimson_lily", "ch7_crimson_lily"],
      ["rootstock_hideout_1", "emitter_1", "ch7_emitter_1"], ["rootstock_hideout_1", "emitter_2", "ch7_emitter_2"], ["rootstock_hideout_1", "emitter_3", "ch7_emitter_3"],
      ["rootstock_hideout_2", "calloway", "calloway"], ["larchmere_conservatory", "signe", "signe"],
    ] as const) expect(WORLD.maps[map].npcs.find((n) => n.id === id)?.script).toBe(script);
    for (const id of ["ch7_pass_ranger", "ch7_arrival", "ch7_cons7_door", "ch7_crimson_lily", "ch7_lodge_grunt", "ch7_bookcase", "ch7_emitter_1", "ch7_emitter_2", "ch7_emitter_3", "calloway", "ch7_calloway_after", "ch7_files", "signe", "ch7_signe_after", "ch7_end", "q_lost_climber"]) expect(WORLD.scripts[id], id).toBeDefined();
    expect(WORLD.maps.route_9.npcs.filter((n) => n.trainer)).toHaveLength(4);
    expect(WORLD.maps.route_9.hidden).toHaveLength(2);
    expect(WORLD.maps.route_9.hidden!.some((h) => h.item === "climber_pack" && WORLD.maps.route_9.legend[WORLD.maps.route_9.tiles[h.y][h.x]] === "snow")).toBe(true);
    expect(WORLD.maps.bloom_lake.npcs[0]).toMatchObject({ id: "crimson_lily", sprite: "crimson_lily", visibleWhen: [{ flag: "crimson_lily_done", is: false }] });
    const stock: string[] = [];
    for (const id of ["ch7_market_pods", "ch7_market_care"]) eachCmd(WORLD.scripts[id], (c) => { if (c.op === "shop") stock.push(...c.stock); });
    expect(stock).toEqual(["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost", "neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"]);
  });

  it("keeps trainer teams, portraits, rewards and boss tuning within ±2", () => {
    const teams = {
      climber_ridge: [["larch_seedling", 33], ["holly", 34]], climber_scree: [["campion_mound", 34]],
      skier_frost: [["peppermint", 34], ["edelweiss_bud", 33]], skier_drift: [["snowdrop_shoot", 34], ["larch", 35]],
      grunt_lodge: [["stinging_nettle", 35], ["venus_flytrap", 35]], grunt_b1_1: [["fireweed", 36], ["sugar_maple", 36]],
      grunt_b1_2: [["red_mangrove", 36], ["bladderwort", 36]], grunt_b1_3: [["prickly_pear", 37], ["foxglove", 36]],
      jr_flurry: [["edelweiss", 38], ["snowdrop_shoot", 38]], jr_hoarfrost: [["campion_mound", 39], ["holly", 39]],
    };
    for (const [id, team] of Object.entries(teams)) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => [q.species, q.level])).toEqual(team);
      for (const text of [t.intro, t.defeat, t.after]) expect(text).toMatch(/^(?!.*TODO)\S.*\S$/);
      if (id.startsWith("grunt")) expect([t.className, t.name]).toEqual(["ROOTSTOCK", "GRUNT"]);
      expect(t.portrait).toBe(id.startsWith("climber") ? "hiker" : id.startsWith("skier") ? "skier" : id.startsWith("grunt") ? "grunt" : "gardener");
      expect(t.music).toBe(id.startsWith("grunt") ? "battle_rootstock" : "battle_trainer");
    }
    for (const [id, species, levels] of [
      ["calloway", ["ghost_pipe", "lodgepole_pine", "red_mangrove"], [38, 39, 41]],
      ["signe", ["edelweiss", "moss_campion", "larch", "snowdrop"], [40, 41, 41, 43]],
    ] as const) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => q.species)).toEqual(species);
      t.team.forEach((q, i) => expect(Math.abs(q.level - levels[i])).toBeLessThanOrEqual(2));
      expect(t.ai).toBe("smart");
    }
    expect(WORLD.trainers.calloway.team[2].grafted).toBe(true);
    expect(WORLD.trainers.calloway).toMatchObject({ portrait: "calloway", className: "ADMIN", music: "battle_rootstock", items: [{ item: "spring_water", qty: 1 }] });
    expect(WORLD.trainers.signe).toMatchObject({ portrait: "signe", className: "WARDEN", music: "battle_leader", mark: "snowdrop_mark", items: [{ item: "spring_water", qty: 2 }] });
  });

  it("has a valid, unoccupied glide landing below the healing door", () => {
    const m = WORLD.maps.larchmere, d = WORLD.glide!.find((d) => d.map === m.id)!;
    const door = m.warps.find((w) => w.to === "larchmere_greenhouse")!;
    expect(d).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
    expect(walkable(grid(m), d.x, d.y)).toBe(true);
    expect(m.npcs.some((n) => n.x === d.x && n.y === d.y)).toBe(false);
    expect(WORLD.maps.larchmere_greenhouse.healPoint).toBeDefined();
  });
});

describe("SIGNE ice puzzle", () => {
  it("reaches SIGNE from the entrance, with an exit from every legal stop", () => {
    const runtime = buildMap(WORLD.maps.larchmere_conservatory);
    const start = { x: 7, y: 18 }, exit = { x: 7, y: 19 }, goal = { x: 7, y: 3 };
    expect(solveIcePuzzle(runtime, start, goal)).toBe(true);
    const stops = reachableIceStops(runtime, start);
    expect(stops.has("7,14")).toBe(false); // no turning midway through a slide
    for (const cell of stops) {
      const [x, y] = cell.split(",").map(Number);
      expect(solveIcePuzzle(runtime, { x, y }, exit), cell).toBe(true);
    }
    for (const n of runtime.def.npcs) expect(Object.values(DIRS).some(({ dx, dy }) => stops.has(key(n.x + dx, n.y + dy))), n.id).toBe(true);
  });
});
