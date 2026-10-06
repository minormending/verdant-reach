import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { isSelfAnim, MOVE_ANIMS } from "../battle/anims";
import { DATA } from "./index";

// The binding Chapter 7 table (docs/CH7.md §2), independent of the data.
const LINES = [
  { line: "snowdrop", ids: ["snowdrop_bulb", "snowdrop_shoot", "snowdrop"],
    names: ["Snow Bulb", "Snow Shoot", "Snowdrop"], totals: [290, 400, 490],
    types: [["frost"], ["frost", "bloom"], ["frost", "bloom"]], activity: "any", pollination: ["meadow"],
    shape: ["spa", "spe"], scientificName: "Galanthus nivalis" },
  { line: "campion", ids: ["campion_cushion", "campion_mound", "moss_campion"],
    names: ["Moss Cushion", "Moss Mound", "Moss Campion"], totals: [300, 410, 500],
    types: [["frost"], ["frost", "wood"], ["frost", "bloom"]], activity: "day", pollination: ["meadow"],
    shape: ["hp", "def", "spd"], scientificName: "Silene acaulis" },
  { line: "larch", ids: ["larch_seedling", "larch"], names: ["Larch Sprout", "Larch"], totals: [310, 480],
    types: [["wood", "frost"], ["wood", "frost"]], activity: "any", pollination: ["woodland"],
    shape: ["atk", "def"], scientificName: "Larix decidua" },
  { line: "edelweiss", ids: ["edelweiss_bud", "edelweiss"], names: ["Edel Bud", "Edelweiss"], totals: [300, 470],
    types: [["frost", "bloom"], ["frost", "bloom"]], activity: "day", pollination: ["meadow"],
    shape: ["spd", "spa"], scientificName: "Leontopodium nivale" },
  { line: "bladderwort", ids: ["bladderwort_sprig", "bladderwort"], names: ["Bladdersprig", "Bladderwort"], totals: [295, 465],
    types: [["bug", "water"], ["bug", "water"]], activity: "any", pollination: ["carnivore"],
    shape: ["spe", "atk"], scientificName: "Utricularia vulgaris" },
] as const;

describe("Chapter 7 species", () => {
  it("appends the twelve ids after Chapter 6 in table order", () => {
    const start = SPECIES_IDS.indexOf("vanilla_orchid") + 1;
    expect(SPECIES_IDS.slice(start, start + 12)).toEqual(LINES.flatMap((line) => [...line.ids]));
  });

  for (const line of LINES) {
    it(`${line.line} follows the species table and stat shape with a full late-game learnset`, () => {
      line.ids.forEach((id, i) => {
        const s = DATA.species[id];
        expect(s).toMatchObject({ name: line.names[i], line: line.line, stage: i + 1,
          types: line.types[i], activity: line.activity, pollination: line.pollination });
        expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0), id).toBe(line.totals[i]);
        const strongest = Object.values(s.baseStats).sort((a, b) => b - a).slice(0, line.shape.length);
        expect(line.shape.map((stat) => s.baseStats[stat]).sort((a, b) => b - a), id).toEqual(strongest);
        expect(s.learnset.length, id).toBeGreaterThanOrEqual(10);
        expect(s.learnset.at(-1)!.level, id).toBeGreaterThanOrEqual(40);
        if (i + 1 < line.ids.length) expect(s.growsInto?.species).toBe(line.ids[i + 1]);
        else expect(s.growsInto).toBeUndefined();
      });
    });

    it(`${line.line} has the scientific name and distinct stage entries`, () => {
      const entries = line.ids.map((id) => {
        expect(DATA.herbarium[id].scientificName, id).toBe(line.scientificName);
        return DATA.herbarium[id].entry;
      });
      expect(new Set(entries).size).toBe(line.ids.length);
    });
  }

  it("uses cold snap for the bulb and all six approved vigor triggers", () => {
    const growths = [
      ["snowdrop_bulb", "snowdrop_shoot", { kind: "item", item: "cold_snap" }],
      ["snowdrop_shoot", "snowdrop", { kind: "vigor", level: 36 }],
      ["campion_cushion", "campion_mound", { kind: "vigor", level: 30 }],
      ["campion_mound", "moss_campion", { kind: "vigor", level: 40 }],
      ["larch_seedling", "larch", { kind: "vigor", level: 34 }],
      ["edelweiss_bud", "edelweiss", { kind: "vigor", level: 32 }],
      ["bladderwort_sprig", "bladderwort", { kind: "vigor", level: 33 }],
    ] as const;
    for (const [id, species, trigger] of growths) expect(DATA.species[id].growsInto).toEqual({ species, trigger });
  });

  it("teaches signatures at the approved stages and levels, retaining them after growth", () => {
    const signatures = [
      [["snowdrop_shoot", "snowdrop"], 38, "thaw_bloom"],
      [["campion_cushion", "campion_mound", "moss_campion"], 22, "cushion"],
      [["larch_seedling", "larch"], 26, "needle_drop"],
      [["edelweiss_bud", "edelweiss"], 24, "woolly_coat"],
      [["bladderwort_sprig", "bladderwort"], 25, "vacuum_trap"],
    ] as const;
    for (const [ids, level, move] of signatures) for (const id of ids) {
      expect(DATA.species[id].learnset, id).toContainEqual({ level, move });
    }
    expect(DATA.species.snowdrop_bulb.learnset.some((l) => l.move === "thaw_bloom")).toBe(false);
  });

  it("defines the exact signature numbers and effects, including vacuum trap's priority field", () => {
    expect(DATA.moves.thaw_bloom).toMatchObject({ name: "Thaw Bloom", type: "frost", category: "special",
      power: 75, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "status", status: "frostbite", chance: 10, target: "foe" }] });
    expect(DATA.moves.cushion).toMatchObject({ name: "Cushion", type: "frost", category: "status",
      power: 0, accuracy: null, pp: 10, priority: 0,
      effects: [{ kind: "stat", stat: "def", stages: 1, chance: 100, target: "self" },
        { kind: "stat", stat: "spd", stages: 1, chance: 100, target: "self" }] });
    expect(DATA.moves.needle_drop).toMatchObject({ name: "Needle Drop", type: "wood", category: "physical",
      power: 25, accuracy: 100, pp: 20, priority: 0, effects: [{ kind: "multi_hit", min: 2, max: 5 }] });
    expect(DATA.moves.woolly_coat).toMatchObject({ name: "Woolly Coat", type: "frost", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "spd", stages: 2, chance: 100, target: "self" }] });
    expect(DATA.moves.vacuum_trap).toMatchObject({ name: "Vacuum Trap", type: "bug", category: "physical",
      power: 60, accuracy: 100, pp: 15, priority: 1, effects: [] });
  });

  it("gives every signature an explicit animation with buffs on the user and attacks on the foe", () => {
    for (const id of ["thaw_bloom", "cushion", "needle_drop", "woolly_coat", "vacuum_trap"]) {
      expect(MOVE_ANIMS[id], id).toBeDefined();
      expect(isSelfAnim(MOVE_ANIMS[id]), id).toBe(DATA.moves[id].category === "status");
    }
  });
});
