import { describe, expect, it } from "vitest";
import type { Species } from "../contracts";
import { SPECIES_IDS } from "../contracts";
import { DATA } from "./index";

// The binding Chapter 5 table, kept independent of the species definitions.
const LINES = [
  { line: "ghostpipe", ids: ["ghostpipe_stalk", "ghostpipe_nodding", "ghost_pipe"],
    names: ["Ghost Stalk", "Nodding Pipe", "Ghost Pipe"], totals: [285, 405, 490],
    types: [["ghost"], ["ghost"], ["ghost"]], activity: "night", pollination: ["woodland"], scientificName: "Monotropa uniflora" },
  { line: "fireweed", ids: ["fireweed_fluff", "fireweed_shoot", "fireweed"],
    names: ["Fire Fluff", "Fire Shoot", "Fireweed"], totals: [280, 400, 485],
    types: [["fire", "bloom"], ["fire", "bloom"], ["fire", "bloom"]], activity: "day", pollination: ["meadow"], scientificName: "Chamaenerion angustifolium" },
  { line: "lodgepole", ids: ["lodgepole_cone", "lodgepole_seedling", "lodgepole_pine"],
    names: ["Sealed Cone", "Pine Sprout", "Lodgepole"], totals: [300, 405, 495],
    types: [["wood"], ["wood", "fire"], ["wood", "fire"]], activity: "any", pollination: ["woodland"], scientificName: "Pinus contorta" },
  { line: "skunk", ids: ["skunk_cabbage_shoot", "skunk_cabbage"],
    names: ["Skunk Shoot", "Skunkcabbage"], totals: [290, 445],
    types: [["fire", "wood"], ["fire", "wood"]], activity: "any", pollination: ["wetland"], scientificName: "Symplocarpus foetidus" },
  { line: "cedar", ids: ["cedar_seedling", "red_cedar"],
    names: ["Cedar Sprout", "Red Cedar"], totals: [310, 500],
    types: [["wood", "ghost"], ["wood", "ghost"]], activity: "any", pollination: ["woodland"], scientificName: "Thuja plicata" },
] as const;

describe("Chapter 5 species", () => {
  it("appends all thirteen ids in the approved order", () => {
    expect(SPECIES_IDS.slice(-13)).toEqual(LINES.flatMap((line) => [...line.ids]));
  });

  for (const line of LINES) {
    it(`${line.line} follows its names, types, stat totals and learnset curve`, () => {
      line.ids.forEach((id, i) => {
        const s = DATA.species[id];
        expect(s).toMatchObject({ name: line.names[i], line: line.line, stage: i + 1,
          types: line.types[i], activity: line.activity, pollination: line.pollination });
        expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0)).toBe(line.totals[i]);
        expect(DATA.herbarium[id].scientificName).toBe(line.scientificName);
        expect(s.learnset.length).toBeGreaterThanOrEqual(10);
        expect(s.learnset.at(-1)!.level).toBeGreaterThanOrEqual(36);
        if (i + 1 < line.ids.length) expect(s.growsInto?.species).toBe(line.ids[i + 1]);
        else expect(s.growsInto).toBeUndefined();
      });
    });
  }

  it("uses the approved growth triggers, including Ember Ash", () => {
    const growths = [
      ["ghostpipe_stalk", "ghostpipe_nodding", { kind: "vigor", level: 22 }],
      ["ghostpipe_nodding", "ghost_pipe", { kind: "vigor", level: 30 }],
      ["fireweed_fluff", "fireweed_shoot", { kind: "vigor", level: 20 }],
      ["fireweed_shoot", "fireweed", { kind: "vigor", level: 30 }],
      ["lodgepole_cone", "lodgepole_seedling", { kind: "item", item: "ember_ash" }],
      ["lodgepole_seedling", "lodgepole_pine", { kind: "vigor", level: 32 }],
      ["skunk_cabbage_shoot", "skunk_cabbage", { kind: "vigor", level: 26 }],
      ["cedar_seedling", "red_cedar", { kind: "vigor", level: 34 }],
    ] as const;
    for (const [id, species, trigger] of growths) expect(DATA.species[id].growsInto).toEqual({ species, trigger });
  });

  it("preserves each line's stat shape and the rare cedar catch rate", () => {
    const stats = (s: Species) => Object.values(s.baseStats);
    for (const line of LINES) for (const id of line.ids) {
      const s = DATA.species[id];
      const b = s.baseStats;
      const sorted = stats(s).sort((a, b) => b - a);
      if (line.line === "ghostpipe" || line.line === "fireweed") {
        expect([b.spa, b.spe].sort((a, b) => b - a)).toEqual(sorted.slice(0, 2));
      } else if (line.line === "lodgepole") {
        expect(b.def).toBe(sorted[0]);
        expect(b.atk).toBeGreaterThanOrEqual(Math.max(b.spa, b.spd, b.spe));
        expect(b.spe).toBe(Math.min(...stats(s)));
      } else if (line.line === "skunk") {
        expect([b.hp, b.spd].sort((a, b) => b - a)).toEqual(sorted.slice(0, 2));
      } else {
        expect([b.hp, b.def, b.spd].sort((a, b) => b - a)).toEqual(sorted.slice(0, 3));
      }
    }
    expect(DATA.species.red_cedar.catchRate).toBeLessThanOrEqual(45);
  });

  it("teaches signatures at the approved level and retains them in later stages", () => {
    const signatures = [
      [["ghostpipe_nodding", "ghost_pipe"], 24, "root_siphon"],
      [["fireweed_fluff", "fireweed_shoot", "fireweed"], 12, "seed_drift"],
      [["lodgepole_seedling", "lodgepole_pine"], 26, "serotiny"],
      [["skunk_cabbage_shoot", "skunk_cabbage"], 18, "snowmelt"],
      [["cedar_seedling", "red_cedar"], 20, "heartwood"],
    ] as const;
    for (const [ids, level, move] of signatures) for (const id of ids) {
      expect(DATA.species[id].learnset).toContainEqual({ level, move });
    }
    expect(DATA.species.ghostpipe_stalk.learnset.some((l) => l.move === "root_siphon")).toBe(false);
    expect(DATA.species.lodgepole_cone.learnset.some((l) => l.move === "serotiny")).toBe(false);
  });

  it("defines the five signatures with the exact approved numbers and effects", () => {
    expect(DATA.moves.root_siphon).toMatchObject({ name: "Root Siphon", type: "ghost", category: "special",
      power: 60, accuracy: 100, pp: 15, priority: 0, effects: [{ kind: "drain", fraction: 0.5 }] });
    expect(DATA.moves.seed_drift).toMatchObject({ name: "Seed Drift", type: "bloom", category: "status",
      power: 0, accuracy: 100, pp: 20, priority: 0,
      effects: [{ kind: "stat", stat: "accuracy", stages: -1, chance: 100, target: "foe" }] });
    expect(DATA.moves.serotiny).toMatchObject({ name: "Serotiny", type: "fire", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "atk", stages: 1, chance: 100, target: "self" },
        { kind: "stat", stat: "spa", stages: 1, chance: 100, target: "self" }] });
    expect(DATA.moves.snowmelt).toMatchObject({ name: "Snowmelt", type: "fire", category: "special",
      power: 65, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "status", status: "scorch", chance: 10, target: "foe" }] });
    expect(DATA.moves.heartwood).toMatchObject({ name: "Heartwood", type: "wood", category: "status",
      power: 0, accuracy: null, pp: 10, priority: 0,
      effects: [{ kind: "stat", stat: "def", stages: 2, chance: 100, target: "self" }] });
  });
});
