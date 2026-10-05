import { describe, expect, it } from "vitest";
import { MAP_IDS, SPECIES_IDS, STRUCTURES, TILES } from "../contracts";
import { WORLD } from "./index";
import { eachCmd, flood, grid, validateWorld, walkable, wrapText, expandTokens } from "./validate";

describe("world data", () => {
  it("passes every structural check", () => {
    expect(validateWorld(WORLD)).toEqual([]);
  });

  it("has all 17 maps with equal-length rows and valid legend tiles", () => {
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
    }
  });

  it("gives every leader a mark, smart AI and leader music", () => {
    for (const id of ["hollis", "nell"]) {
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

describe("validator self-check", () => {
  const clone = () => structuredClone(WORLD);
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
  it("catches missing scripts and trainers", () => {
    const w = clone();
    w.maps.fallowfield.npcs[0].script = "nope";
    w.maps.route_2.npcs[0].trainer = "nobody";
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/script nope missing/);
    expect(errs).toMatch(/trainer nobody missing/);
  });
});
