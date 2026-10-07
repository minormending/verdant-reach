import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { isSelfAnim, MOVE_ANIMS } from "../battle/anims";
import { movesAtLevel } from "../battle/logic/stats";
import { DATA } from "./index";

// The binding Chapter 9 table (docs/CH9.md §2), independent of the data.
const LINES = [
  { line: "dragontree", ids: ["dragon_seedling", "dragon_sapling", "dragon_tree"],
    names: ["Dragon Seed", "Umbrella Pup", "Dragon Tree"], totals: [300, 420, 530],
    types: [["dragon", "wood"], ["dragon", "wood"], ["dragon", "wood"]],
    activity: "any", pollination: ["woodland"], shape: ["hp", "def", "spd"],
    scientificName: "Dracaena cinnabari" },
  { line: "pitaya", ids: ["pitaya_cutting", "dragon_fruit"], names: ["Pitaya Pad", "Dragon Fruit"],
    totals: [320, 495], types: [["dragon", "thorn"], ["dragon", "thorn"]],
    activity: "night", pollination: ["garden", "tropical"], shape: ["spa", "spe"],
    scientificName: "Selenicereus undatus" },
  { line: "lithops", ids: ["lithops_pebble", "lithops_pair", "lithops_bloom"],
    names: ["Pebble Leaf", "Split Stone", "Living Stone"], totals: [290, 400, 490],
    types: [["thorn"], ["thorn"], ["thorn", "bloom"]],
    activity: "day", pollination: ["meadow"], shape: ["def", "spd"], scientificName: "Lithops" },
] as const;

describe("Chapter 9 species", () => {
  it("appends the eight ids after Chapter 7 in table order", () => {
    const start = SPECIES_IDS.indexOf("bladderwort") + 1;
    expect(SPECIES_IDS.slice(start, start + 8)).toEqual(LINES.flatMap((line) => [...line.ids]));
  });

  for (const line of LINES) {
    it(`${line.line} follows the species table and stat shape with late-game moves`, () => {
      line.ids.forEach((id, i) => {
        const s = DATA.species[id];
        expect(s).toMatchObject({ name: line.names[i], line: line.line, stage: i + 1,
          types: line.types[i], activity: line.activity, pollination: line.pollination });
        expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0), id).toBe(line.totals[i]);
        const strongest = Object.values(s.baseStats).sort((a, b) => b - a).slice(0, line.shape.length);
        expect(line.shape.map((stat) => s.baseStats[stat]).sort((a, b) => b - a), id).toEqual(strongest);
        if (line.line !== "pitaya") {
          expect(s.baseStats.spe, id).toBe(Math.min(...Object.values(s.baseStats)));
          expect(s.baseStats.spe, id).toBeLessThanOrEqual(line.line === "lithops" ? 20 : 35);
        }
        expect(s.learnset.length, id).toBeGreaterThanOrEqual(10);
        expect(s.learnset.at(-1)!.level, id).toBeGreaterThanOrEqual(46);
        for (let level = 40; level <= 46; level++) {
          const attacks = movesAtLevel(s, level, (move) => DATA.moves[move].category !== "status")
            .map((move) => DATA.moves[move]).filter((move) => move.category !== "status");
          expect(attacks.length, `${id} at ${level}`).toBeGreaterThanOrEqual(2);
          expect(attacks.some((move) => s.types.includes(move.type)), `${id} at ${level}`).toBe(true);
        }
        if (i + 1 < line.ids.length) expect(s.growsInto?.species).toBe(line.ids[i + 1]);
        else expect(s.growsInto).toBeUndefined();
      });
    });

    it(`${line.line} has the scientific name and distinct flavour plus fact per stage`, () => {
      const entries = line.ids.map((id) => {
        expect(DATA.herbarium[id].scientificName, id).toBe(line.scientificName);
        const entry = DATA.herbarium[id].entry;
        expect(entry.split(/(?<=[.!?])\s+/), id).toHaveLength(2);
        return entry;
      });
      expect(new Set(entries).size).toBe(line.ids.length);
    });
  }

  it("uses moonflower's existing night-flower groups for pitaya", () => {
    for (const id of ["pitaya_cutting", "dragon_fruit"] as const) {
      expect(DATA.species[id].pollination).toEqual(DATA.species.moonflower.pollination);
    }
  });

  it("uses the five approved vigor triggers", () => {
    const growths = [
      ["dragon_seedling", "dragon_sapling", 30],
      ["dragon_sapling", "dragon_tree", 45],
      ["pitaya_cutting", "dragon_fruit", 38],
      ["lithops_pebble", "lithops_pair", 28],
      ["lithops_pair", "lithops_bloom", 40],
    ] as const;
    for (const [id, species, level] of growths) {
      expect(DATA.species[id].growsInto).toEqual({ species, trigger: { kind: "vigor", level } });
    }
  });

  it("teaches signatures at the approved stages and levels, retaining them after growth", () => {
    const signatures = [
      [["dragon_sapling", "dragon_tree"], 45, "dragon_resin"],
      [["pitaya_cutting", "dragon_fruit"], 30, "night_bloom"],
      [["lithops_pebble", "lithops_pair", "lithops_bloom"], 24, "stone_window"],
    ] as const;
    for (const [ids, level, move] of signatures) for (const id of ids) {
      expect(DATA.species[id].learnset, id).toContainEqual({ level, move });
    }
    expect(DATA.species.dragon_seedling.learnset.some((l) => l.move === "dragon_resin")).toBe(false);
  });

  it("defines the exact signature numbers and effects", () => {
    expect(DATA.moves.dragon_resin).toMatchObject({ name: "Dragon Resin", type: "dragon", category: "special",
      power: 80, accuracy: 100, pp: 10, priority: 0, effects: [{ kind: "drain", fraction: 0.25 }] });
    expect(DATA.moves.night_bloom).toMatchObject({ name: "Night Bloom", type: "dragon", category: "special",
      power: 70, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "spe", stages: 1, chance: 100, target: "self" }] });
    expect(DATA.moves.stone_window).toMatchObject({ name: "Stone Window", type: "thorn", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "def", stages: 1, chance: 100, target: "self" },
        { kind: "stat", stat: "spd", stages: 1, chance: 100, target: "self" }] });
  });

  it("animates resin and petals on the foe, and leaf windows on the user", () => {
    for (const id of ["dragon_resin", "night_bloom", "stone_window"]) {
      expect(MOVE_ANIMS[id], id).toBeDefined();
      expect(isSelfAnim(MOVE_ANIMS[id]), id).toBe(DATA.moves[id].category === "status");
    }
  });
});
