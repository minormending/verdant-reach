import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { DATA } from "./index";

// The binding Chapter 6 table (docs/CH6.md §2), independent of the data.
const LINES = [
  { line: "mangrove", ids: ["mangrove_propagule", "mangrove_sapling", "red_mangrove"],
    names: ["Propagule", "Stilt Sprout", "Red Mangrove"], totals: [290, 410, 500],
    types: [["water"], ["water", "wood"], ["water", "wood"]], activity: "any", pollination: ["wetland"],
    shape: ["def", "spd"], scientificName: "Rhizophora mangle",
    fact: "Its seeds sprout while still on the parent tree. They drop as long propagules that can float at sea for months." },
  { line: "seagrass", ids: ["seagrass_shoot", "eelgrass"], names: ["Seagrass Tip", "Eelgrass"], totals: [300, 450],
    types: [["water"], ["water"]], activity: "any", pollination: ["wetland"], shape: ["spa", "spe"],
    scientificName: "Zostera marina", fact: "It is a true flowering plant pollinated underwater. Its pollen drifts through the sea." },
  { line: "prickly_pear", ids: ["pear_pad", "padded_cactus", "prickly_pear"],
    names: ["Pear Pad", "Pad Cactus", "Prickly Pear"], totals: [290, 400, 490],
    types: [["thorn"], ["thorn"], ["thorn", "bloom"]], activity: "day", pollination: ["garden"], shape: ["atk", "def"],
    scientificName: "Opuntia", fact: "Its pads carry glochids, tiny barbed bristles. They detach at a touch." },
  { line: "saguaro", ids: ["saguaro_pup", "saguaro_column", "saguaro"],
    names: ["Saguaro Pup", "Tall Saguaro", "Old Saguaro"], totals: [300, 420, 520],
    types: [["thorn"], ["thorn"], ["thorn", "water"]], activity: "day", pollination: ["meadow"], shape: ["hp", "def"],
    scientificName: "Carnegiea gigantea",
    fact: "It may grow for decades before sprouting its first arm. For a saguaro, that can take 50 to 70 years." },
  { line: "vanilla", ids: ["vanilla_vine", "vanilla_orchid"], names: ["Vanilla Vine", "Vanilla"], totals: [300, 470],
    types: [["bloom"], ["bloom", "wood"]], activity: "any", pollination: ["tropical"], shape: ["spa", "spd"],
    scientificName: "Vanilla planifolia",
    fact: "Outside Mexico, its flowers are pollinated by hand. Edmond Albius worked out the method on Reunion in 1841." },
] as const;

describe("Chapter 6 species", () => {
  it("appends all thirteen ids after Chapter 5 in the approved order", () => {
    const start = SPECIES_IDS.indexOf("red_cedar") + 1;
    expect(SPECIES_IDS.slice(start, start + 13)).toEqual(LINES.flatMap((line) => [...line.ids]));
  });

  for (const line of LINES) {
    it(`${line.line} follows the names, stages, types, totals, activity and pollination table`, () => {
      line.ids.forEach((id, i) => {
        const s = DATA.species[id];
        expect(s).toMatchObject({ name: line.names[i], line: line.line, stage: i + 1,
          types: line.types[i], activity: line.activity, pollination: line.pollination });
        expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0), id).toBe(line.totals[i]);
        const strongest = Object.values(s.baseStats).sort((a, b) => b - a).slice(0, 2);
        expect(line.shape.map((stat) => s.baseStats[stat]).sort((a, b) => b - a), id).toEqual(strongest);
        expect(s.learnset.length, id).toBeGreaterThanOrEqual(10);
        expect(s.learnset.at(-1)!.level, id).toBeGreaterThanOrEqual(36);
        if (i + 1 < line.ids.length) expect(s.growsInto?.species).toBe(line.ids[i + 1]);
        else expect(s.growsInto).toBeUndefined();
      });
    });

    it(`${line.line} uses only the approved Herbarium fact and scientific name`, () => {
      for (const id of line.ids) expect(DATA.herbarium[id]).toMatchObject({ scientificName: line.scientificName, entry: line.fact });
    });
  }

  it("uses all approved growth triggers, including vanilla's cross-pollination", () => {
    const growths = [
      ["mangrove_propagule", "mangrove_sapling", { kind: "vigor", level: 24 }],
      ["mangrove_sapling", "red_mangrove", { kind: "vigor", level: 34 }],
      ["seagrass_shoot", "eelgrass", { kind: "vigor", level: 28 }],
      ["pear_pad", "padded_cactus", { kind: "vigor", level: 22 }],
      ["padded_cactus", "prickly_pear", { kind: "vigor", level: 32 }],
      ["saguaro_pup", "saguaro_column", { kind: "vigor", level: 30 }],
      ["saguaro_column", "saguaro", { kind: "vigor", level: 40 }],
      ["vanilla_vine", "vanilla_orchid", { kind: "cross_pollination" }],
    ] as const;
    for (const [id, species, trigger] of growths) expect(DATA.species[id].growsInto).toEqual({ species, trigger });
  });

  it("keeps saguaro slow-growing and very slow, with a low catch rate from stage 2, and vanilla rare", () => {
    for (const id of ["saguaro_pup", "saguaro_column", "saguaro"] as const) {
      const s = DATA.species[id];
      expect(s.growthRate, id).toBe("slow");
      expect(s.baseStats.spe, id).toBeLessThanOrEqual(25);
      expect(s.baseStats.spe, id).toBe(Math.min(...Object.values(s.baseStats)));
      if (s.stage >= 2) expect(s.catchRate, id).toBeLessThanOrEqual(45);
    }
    expect(DATA.species.vanilla_vine.catchRate).toBeLessThanOrEqual(45);
  });

  it("teaches signatures at the approved level and retains them in later stages", () => {
    const signatures = [
      [["mangrove_sapling", "red_mangrove"], 26, "stilt_roots"],
      [["seagrass_shoot", "eelgrass"], 20, "tidal_sway"],
      [["pear_pad", "padded_cactus", "prickly_pear"], 14, "glochid_spray"],
      [["saguaro_column", "saguaro"], 32, "water_store"],
      [["vanilla_vine", "vanilla_orchid"], 18, "hand_pollen"],
    ] as const;
    for (const [ids, level, move] of signatures) for (const id of ids) {
      expect(DATA.species[id].learnset, id).toContainEqual({ level, move });
    }
    expect(DATA.species.mangrove_propagule.learnset.some((l) => l.move === "stilt_roots")).toBe(false);
    expect(DATA.species.saguaro_pup.learnset.some((l) => l.move === "water_store")).toBe(false);
  });

  it("defines the five signatures with the exact approved numbers and effects", () => {
    expect(DATA.moves.stilt_roots).toMatchObject({ name: "Stilt Roots", type: "water", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "def", stages: 1, chance: 100, target: "self" },
        { kind: "stat", stat: "spd", stages: 1, chance: 100, target: "self" }] });
    expect(DATA.moves.tidal_sway).toMatchObject({ name: "Tidal Sway", type: "water", category: "special",
      power: 70, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "spe", stages: -1, chance: 20, target: "foe" }] });
    expect(DATA.moves.glochid_spray).toMatchObject({ name: "Glochids", type: "thorn", category: "physical",
      power: 20, accuracy: 100, pp: 20, priority: 0, effects: [{ kind: "multi_hit", min: 2, max: 5 }] });
    expect(DATA.moves.water_store).toMatchObject({ name: "Water Store", type: "water", category: "status",
      power: 0, accuracy: null, pp: 10, priority: 0, effects: [{ kind: "heal", fraction: 0.5 }] });
    expect(DATA.moves.hand_pollen).toMatchObject({ name: "Hand Pollen", type: "bloom", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "spa", stages: 2, chance: 100, target: "self" }] });
  });
});
