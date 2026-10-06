import { describe, expect, it } from "vitest";
import { MAP_IDS, SPECIES_IDS, STRUCTURES, TILES } from "../contracts";
import { WORLD } from "./index";
import type { Cond, MapDef, TileKey } from "../contracts";
import { checkProgressWithoutPrune, eachCmd, flood, grid, prunable, validateWorld, walkable, wrapText, expandTokens } from "./validate";

describe("world data", () => {
  it("glides to the tile below each town's healing-building door", () => {
    const buildings = ["herbarium", "bramblegate_greenhouse", "sugarbush_greenhouse", "glasshouse_greenhouse", "cedarhallow_greenhouse", "saltmarsh_greenhouse", "driftseed_greenhouse"];
    expect(WORLD.glide?.map((d) => d.map)).toEqual(["fallowfield", "bramblegate", "sugarbush", "glasshouse_city", "cedarhallow", "saltmarsh_harbour", "driftseed_isle"]);
    for (const [i, landing] of WORLD.glide!.entries()) {
      const town = WORLD.maps[landing.map];
      const door = town.warps.find((w) => w.to === buildings[i])!;
      expect(landing).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
      expect(walkable(grid(town), landing.x, landing.y)).toBe(true);
    }
  });
  it("passes every structural check", () => {
    expect(validateWorld(WORLD)).toEqual([]);
  });

  it("has every contracted map with equal-length rows and valid legend tiles", () => {
    for (const id of MAP_IDS) {
      const m = WORLD.maps[id];
      expect(m, id).toBeDefined();
      const w = m.tiles[0].length;
      for (const row of m.tiles) {
        expect(row.length, `${id} row`).toBe(w);
        for (const ch of row) expect(TILES[m.legend[ch]], `${id} '${ch}'`).toBeDefined();
      }
    }
  });

  it("puts every door warp exactly on a structure's door tile", () => {
    for (const m of Object.values(WORLD.maps)) {
      for (const s of m.structures) {
        const d = STRUCTURES[s.key].door;
        if (!d) continue; // scenery
        const at = { x: s.x + d.x, y: s.y + d.y };
        const warp = m.warps.find((w) => w.x === at.x && w.y === at.y);
        const trig = m.triggers.find((t) => t.x === at.x && t.y === at.y);
        expect(warp || trig, `${m.id} ${s.key} door`).toBeTruthy();
      }
    }
  });

  it("starts the new game on the roof, beside DR. VALE", () => {
    const g = WORLD.newGame;
    expect(g.map).toBe("herbarium_roof");
    expect(walkable(grid(WORLD.maps[g.map]), g.x, g.y)).toBe(true);
    expect(WORLD.scripts[g.script]).toBeDefined();
  });

  it("treats ledges as one-way", () => {
    const m = WORLD.maps.route_2;
    const g = grid(m);
    // (15,9) is the plateau's ledge lip: hop down from the high meadow onto the lane strip.
    expect(g.tile(15, 9)).toBe("ledge_down");
    const below = flood(g, [{ x: 15, y: 10 }]);
    const above = flood(g, [{ x: 15, y: 8 }]);
    expect(above.has("15,10")).toBe(true);
    // From below, the plateau is only reachable the long way: up the west climb.
    expect(below.has("15,8")).toBe(true);
    const climbBlocked = { ...m, tiles: m.tiles.map((r, y) => (y === 9 ? r.slice(0, 3) + "TTTTTT" + r.slice(9) : r)) };
    expect(flood(grid(climbBlocked), [{ x: 15, y: 10 }]).has("15,8")).toBe(false);
  });

  it("offers a starter pot for each line, and three rival variants per battle", () => {
    for (const line of ["oak", "chili", "lily"]) {
      expect(WORLD.scripts[`pot_${line}`]).toBeDefined();
      expect(WORLD.trainers[`rival_1_${line}`]).toBeDefined();
      expect(WORLD.trainers[`rival_2_${line}`]).toBeDefined();
      expect(WORLD.trainers[`rival_3_${line}`]).toBeDefined();
    }
  });

  it("gives every leader a mark, smart AI and leader music", () => {
    for (const id of ["hollis", "nell", "flora"]) {
      const t = WORLD.trainers[id];
      expect(t.mark).toBeTruthy();
      expect(t.ai).toBe("smart");
      expect(t.music).toBe("battle_leader");
    }
    expect(WORLD.trainers.shears.music).toBe("battle_rootstock");
  });

  it("keeps moonflowers to the night and sunflowers to the day", () => {
    for (const m of Object.values(WORLD.maps)) {
      for (const enc of [m.encounters?.grass, m.encounters?.bog]) {
        for (const s of enc?.slots ?? []) {
          if (s.species.startsWith("moonflower")) expect(s.time, m.id).toBe("night");
          if (s.species.startsWith("sunflower")) expect(s.time, m.id).toBe("day");
        }
      }
    }
  });

  it("lets the Field Herbarium reach most of the roster", () => {
    // Lines grow left to right (see ids.ts); anything caught can grow on.
    const LINES = [
      ["oak_acorn", "oak_sapling", "great_oak"], ["chili_blossom", "green_chili", "red_chili"],
      ["lily_seedpod", "lily_pad", "giant_water_lily"], ["dandelion_bud", "dandelion", "dandelion_clock"],
      ["bramble_blossom", "bramble_berry", "blackberry"], ["sunflower_seedling", "sunflower_bud", "sunflower"],
      ["pumpkin_blossom", "green_pumpkin", "pumpkin"], ["fern_fiddlehead", "unfurling_fern", "ostrich_fern"],
      ["flytrap_seedling", "young_flytrap", "venus_flytrap"], ["sundew_rosette", "sundew"],
      ["maple_samara", "maple_sapling", "sugar_maple"], ["nettle_sprout", "stinging_nettle"],
      ["moonflower_seed", "moonflower_vine", "moonflower"],
    ];
    const wild = new Set<string>();
    for (const m of Object.values(WORLD.maps)) {
      for (const s of [...(m.encounters?.grass?.slots ?? []), ...(m.encounters?.bog?.slots ?? [])]) wild.add(s.species);
    }
    const seen = new Set<string>(wild);
    for (const t of Object.values(WORLD.trainers)) for (const p of t.team) seen.add(p.species);
    for (const line of LINES) if (wild.has(line[0])) line.forEach((s) => seen.add(s));
    for (const s of seen) expect(SPECIES_IDS as readonly string[]).toContain(s);
    expect(seen.size).toBeGreaterThanOrEqual(30);
  });

  it("writes every line to fit the 18-column text box", () => {
    for (const [id, cmds] of Object.entries(WORLD.scripts)) {
      eachCmd(cmds, (c) => {
        if (c.op !== "say") return;
        for (const line of wrapText(expandTokens(c.text))) expect(line.length, `${id}: ${c.text}`).toBeLessThanOrEqual(18);
      });
    }
  });
});

const holds = (c: Cond | undefined, f: Record<string, boolean>) => !c || c.every((x) => (f[x.flag] ?? false) === x.is);
/** The map with its legendWhen overrides applied under these flags (first match wins). */
function mapUnder(m: MapDef, f: Record<string, boolean>): MapDef {
  const legend: Record<string, TileKey> = { ...m.legend };
  const set = new Set<string>();
  for (const o of m.legendWhen ?? []) {
    if (!holds(o.when, f)) continue;
    for (const [ch, t] of Object.entries(o.legend)) if (!set.has(ch)) { legend[ch] = t; set.add(ch); }
  }
  return { ...m, legend };
}

describe("PRUNE (field moves)", () => {
  it("never needs PRUNE for required progress", () => {
    expect(checkProgressWithoutPrune(WORLD)).toEqual([]);
  });

  it("gates ROUTE 5 with brambles at both ends: no way through without PRUNE, open with it", () => {
    const m = WORLD.maps.route_5;
    const fromCity = m.warps.find((w) => w.to === "glasshouse_city")!;
    const toHedgerow = m.warps.find((w) => w.to === "hedgerow")!;
    const start = [{ x: fromCity.x, y: fromCity.y + 1 }];
    expect(flood(grid(m), start).has(`${toHedgerow.x},${toHedgerow.y}`)).toBe(false);
    expect(flood(grid(m, { pruned: true }), start).has(`${toHedgerow.x},${toHedgerow.y}`)).toBe(true);
    // ...and from the HEDGEROW end too.
    const back = [{ x: toHedgerow.x + 1, y: toHedgerow.y }];
    expect(flood(grid(m), back).has(`${fromCity.x},${fromCity.y}`)).toBe(false);
  });

  it("puts 4-6 bramble patches in the older maps, each guarding something optional", () => {
    let patches = 0;
    for (const id of ["route_1", "route_2", "route_3", "hedgerow"] as const) {
      const g = grid(WORLD.maps[id]);
      const seen = new Set<string>();
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!prunable(g.tile(x, y)) || seen.has(`${x},${y}`)) continue;
        patches++;
        const q = [[x, y]];
        seen.add(`${x},${y}`);
        while (q.length) {
          const [cx, cy] = q.pop()!;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const k = `${cx + dx},${cy + dy}`;
            if (!seen.has(k) && prunable(g.tile(cx + dx, cy + dy))) { seen.add(k); q.push([cx + dx, cy + dy]); }
          }
        }
      }
    }
    expect(patches).toBeGreaterThanOrEqual(4);
    expect(patches).toBeLessThanOrEqual(6);
  });

  it("hides the PRUNE stashes: out of reach before the shears, findable after", () => {
    const stashes: [keyof typeof WORLD.maps, number, number][] = [["route_1", 5, 2], ["route_3", 17, 16], ["hedgerow", 1, 19]];
    for (const [id, x, y] of stashes) {
      const m = WORLD.maps[id];
      expect(m.hidden?.some((h) => h.x === x && h.y === y), `${id} stash`).toBe(true);
      const starts = m.warps.map((w) => ({ x: w.x, y: w.y }));
      expect(flood(grid(m), starts).has(`${x},${y}`), `${id} before`).toBe(false);
      expect(flood(grid(m, { pruned: true }), starts).has(`${x},${y}`), `${id} after`).toBe(true);
    }
    // ROUTE 4's bramble ring holds a RAIN JAR you can see from the road.
    const r4 = WORLD.maps.route_4;
    const jar = r4.npcs.find((n) => n.id === "rain_jar")!;
    const starts = r4.warps.map((w) => ({ x: w.x, y: w.y }));
    expect(flood(grid(r4), starts).has(`${jar.x},${jar.y}`)).toBe(false);
    expect(flood(grid(r4, { pruned: true }), starts).has(`${jar.x},${jar.y}`)).toBe(true);
  });
});

describe("Chapter 4", () => {
  it("opens SUGARBUSH's east road to ROUTE 4 only once VALE sends you (ch4_started)", () => {
    const m = WORLD.maps.sugarbush;
    const exit = m.warps.find((w) => w.to === "route_4")!;
    const south = m.warps.find((w) => w.to === "route_3")!;
    const cart = m.npcs.find((n) => n.id === "sap_cart")!;
    for (const started of [false, true]) {
      const f = { ch4_started: started, grove_cleared: true };
      const g = grid(mapUnder(m, f));
      const blocked = new Set(m.npcs.filter((n) => holds(n.visibleWhen, f)).map((n) => `${n.x},${n.y}`));
      const gg = { ...g, structureSolid: (x: number, y: number) => g.structureSolid(x, y) || blocked.has(`${x},${y}`) };
      expect(flood(gg, [{ x: south.x, y: south.y }]).has(`${exit.x},${exit.y}`), `started=${started}`).toBe(started);
    }
    expect(holds(cart.visibleWhen, {})).toBe(true);
  });

  it("puts the three listening posts on sensor_post tiles, each a trigger you face", () => {
    const posts: [keyof typeof WORLD.maps, string][] = [
      ["route_4", "q_relay_sensors_post_1"], ["glasshouse_city", "q_relay_sensors_post_2"], ["palm_house", "q_relay_sensors_post_3"],
    ];
    for (const [id, script] of posts) {
      const m = WORLD.maps[id];
      const t = m.triggers.find((tr) => tr.script === script);
      expect(t, `${id} ${script}`).toBeDefined();
      expect(grid(m).tile(t!.x, t!.y)).toBe("sensor_post");
    }
  });

  it("keeps the ROSE CONSERVATORY shut until the RELAY's open day, and lets the city's onEnter end the chapter", () => {
    const city = WORLD.maps.glasshouse_city;
    const door = city.warps.find((w) => w.to === "glasshouse_conservatory")!;
    const shut = city.triggers.find((t) => t.x === door.x && t.y === door.y + 1)!;
    expect(shut.script).toBe("ch4_conservatory_closed");
    expect(holds(shut.when, { relay_listened: false })).toBe(true);
    expect(holds(shut.when, { relay_listened: true })).toBe(false);
    const calls: string[] = [];
    eachCmd(WORLD.scripts[city.onEnter!], (c) => { if (c.op === "call") calls.push(c.script); });
    expect(calls).toEqual(expect.arrayContaining(["ch4_city_arrival", "ch4_grunt_watch", "ch4_end"]));
    expect(city.outdoor).toBe(true);
    expect(city.border).toBe("glass_wall");
  });

  it("sets up the NURSERY: a counter keeper, a yard keeper, two boarder spots and BRAM's hedge", () => {
    const m = WORLD.maps.glasshouse_nursery;
    const ids = m.npcs.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(["nursery_keeper", "nursery_keeper_b", "bram", "boarder_1", "boarder_2"]));
    const hedge = (f: Record<string, boolean>) => mapUnder(m, f).legend["]"];
    expect(hedge({})).toBe("hedge");
    expect(hedge({ rival_3_done: true })).not.toBe("hedge");
    expect(WORLD.scripts[m.onEnter!]).toBeDefined();
  });
});

describe("validator self-check", () => {
  const clone = () => structuredClone(WORLD);
  it("accepts a static sport battle fixture", () => {
    const w = clone();
    w.scripts.static_sport_fixture = [
      { op: "wildBattle", species: "giant_water_lily", level: 40, sport: true, canLose: true },
      { op: "setFlag", flag: "static_sport_done" },
    ];
    expect(validateWorld(w)).toEqual([]);
  });
  it("rejects solid, off-map, missing-map and unreachable glide landings", () => {
    for (const landing of [
      { map: "fallowfield", x: 0, y: 0 },
      { map: "fallowfield", x: -1, y: 7 },
      { map: "fallowfield", x: 20.5, y: 7 },
    ] as const) {
      const w = clone();
      Object.assign(w.glide![0], landing);
      expect(validateWorld(w).join("\n")).toMatch(/\[glide fallowfield\].*not walkable/);
    }
    const missing = clone();
    delete (missing.maps as Partial<typeof missing.maps>).fallowfield;
    expect(validateWorld(missing).join("\n")).toMatch(/\[glide fallowfield\].*missing map/);
    const w = clone();
    const m = w.maps.fallowfield;
    // An isolated floor tile is walkable, but has no ordinary route to it.
    const set = (x: number, y: number, ch: string) => { m.tiles[y] = m.tiles[y].slice(0, x) + ch + m.tiles[y].slice(x + 1); };
    set(1, 1, ".");
    for (const [x, y] of [[0, 1], [2, 1], [1, 0], [1, 2]]) set(x, y, "T");
    Object.assign(w.glide![0], { x: 1, y: 1 });
    expect(validateWorld(w).join("\n")).toMatch(/\[glide fallowfield\].*unreachable/);
  });
  it("catches ragged rows and unknown legend chars", () => {
    const w = clone();
    w.maps.route_1.tiles[3] = w.maps.route_1.tiles[3] + "&";
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/row 3 has length/);
    expect(errs).toMatch(/'&' has no valid tile/);
  });
  it("catches unreachable NPCs and warps", () => {
    const w = clone();
    w.maps.route_1.tiles[0] = "T".repeat(w.maps.route_1.tiles[0].length);
    w.maps.route_1.npcs.push({ id: "lost", sprite: "kid", x: 1, y: 1, facing: "down", script: "r1_walker" });
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/npc lost stands on solid/);
    expect(errs).toMatch(/warp at 9,0 is not walkable/);
  });
  it("catches a soft-lock below a ledge", () => {
    const w = clone();
    // On route 2, wall in one tile under the plateau's lip: a pit you can only hop into.
    const m = w.maps.route_2;
    const set = (x: number, y: number, ch: string) => { m.tiles[y] = m.tiles[y].slice(0, x) + ch + m.tiles[y].slice(x + 1); };
    m.tiles[10] = m.tiles[10].replace(/[^T]/g, "T");
    set(15, 10, ".");
    set(15, 11, "T");
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/soft-lock/);
  });
  it("catches bad ambients, dangling legendWhen chars and blocking scenery", () => {
    const w = clone();
    (w.maps.fallowfield as { ambient: string }).ambient = "snow";
    w.maps.route_1.legendWhen = [{ when: [{ flag: "x", is: true }], legend: { "&": "grass" } }];
    // a well dropped into ROUTE 1's hedged south lane cuts FALLOWFIELD off from the north
    const r1 = w.maps.route_1;
    for (const y of [35, 36]) r1.tiles[y] = r1.tiles[y].slice(0, 10) + "@@" + r1.tiles[y].slice(12);
    r1.structures.push({ key: "well", x: 10, y: 35 });
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/bad ambient snow/);
    expect(errs).toMatch(/legendWhen\[0\] '&' is not in the base legend/);
    expect(errs).toMatch(/\[route_1\] scenery blocks the way/);
  });
  it("lets signs give flavour to interactable furniture only", () => {
    const w = clone();
    w.maps.herbarium.signs.push({ x: 2, y: 2, text: "A floor." });
    expect(validateWorld(w).join("\n")).toMatch(/\[herbarium\] sign at 2,2 is on floor_wood/);
  });
  it("catches required progress behind brambles", () => {
    const w = clone();
    // A bramble across ROUTE 1's single-file north gate cuts HEDGEROW off until PRUNE.
    const r1 = w.maps.route_1;
    r1.tiles[1] = r1.tiles[1].slice(0, 9) + "BB" + r1.tiles[1].slice(11);
    expect(checkProgressWithoutPrune(w).join("\n")).toMatch(/\[route_1\] without PRUNE: warp at 9,0 is behind brambles/);
  });
  it("catches PRUNING SHEARS nobody hands out", () => {
    const w = clone();
    for (const cmds of Object.values(w.scripts)) eachCmd(cmds, (c) => { if (c.op === "giveItem" && c.item === "pruning_shears") c.item = "compost"; });
    expect(checkProgressWithoutPrune(w).join("\n")).toMatch(/no map hands out the pruning_shears/);
  });
  it("catches missing scripts and trainers", () => {
    const w = clone();
    w.maps.fallowfield.npcs[0].script = "nope";
    w.maps.route_2.npcs[0].trainer = "nobody";
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/script nope missing/);
    expect(errs).toMatch(/trainer nobody missing/);
  });
});
