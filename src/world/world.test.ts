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
    // standing on the lower meadow, the plateau above the ledge is not reachable directly
    const below = flood(g, [{ x: 15, y: 12 }]);
    const above = flood(g, [{ x: 15, y: 10 }]);
    expect(above.has("15,12")).toBe(true);
    // the plateau is only reachable from below by walking around via the west climb
    expect(below.has("15,10")).toBe(true);
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
    w.maps.route_1.tiles[3] = w.maps.route_1.tiles[3] + "Q";
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/row 3 has length/);
    expect(errs).toMatch(/'Q' has no valid tile/);
  });
  it("catches unreachable NPCs and warps", () => {
    const w = clone();
    w.maps.route_1.tiles[0] = "TTTTTTTTTTTTTTTTTTTT";
    w.maps.route_1.npcs.push({ id: "lost", sprite: "kid", x: 1, y: 1, facing: "down", script: "r1_walker" });
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/npc lost stands on solid/);
    expect(errs).toMatch(/warp at 9,0 is not walkable/);
  });
  it("catches a soft-lock below a ledge", () => {
    const w = clone();
    // wall in the lower meadow of route 2 from the lane: a pit you can only hop into
    const m = w.maps.route_2;
    m.tiles = m.tiles.map((r, y) => (y >= 12 ? r.replace(/[^T]/g, "T") : r));
    m.tiles[12] = m.tiles[12].slice(0, 15) + "." + m.tiles[12].slice(16);
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/soft-lock/);
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
