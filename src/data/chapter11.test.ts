import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { isSelfAnim, MOVE_ANIMS } from "../battle/anims";
import { movesAtLevel } from "../battle/logic/stats";
import { DATA } from "./index";

// Binding Chapter 11 species table (docs/CH11.md §2).
const LINES = [
  { line: "nightshade", ids: ["nightshade_sprout", "nightshade"], names: ["Shade Sprout", "Nightshade"],
    totals: [310, 490], types: ["bloom", "ghost"], activity: "night", pollination: ["meadow"],
    scientificName: "Atropa belladonna", fact: "All parts of the plant are toxic if eaten.",
    source: "https://en.wikipedia.org/wiki/Atropa_belladonna" },
  { line: "oleander", ids: ["oleander"], names: ["Oleander"], totals: [480],
    types: ["bloom", "ghost"], activity: "day", pollination: ["meadow"],
    scientificName: "Nerium oleander", fact: "All parts of the plant are toxic if eaten.",
    source: "https://en.wikipedia.org/wiki/Nerium" },
  { line: "mimosa", ids: ["mimosa_sprout", "sensitive_plant"], names: ["Mimosa Shoot", "Sensitive"],
    totals: [300, 480], types: ["bloom", "wood"], activity: "day", pollination: ["meadow"],
    scientificName: "Mimosa pudica", fact: "Its leaflets fold inward within seconds when touched.",
    source: "https://en.wikipedia.org/wiki/Mimosa_pudica" },
  { line: "prayer", ids: ["prayer_plant"], names: ["Prayer Plant"], totals: [470],
    types: ["bloom", "wood"], activity: "any", pollination: ["woodland"],
    scientificName: "Maranta leuconeura", fact: "Its leaves fold upward at night, like hands in prayer.",
    source: "https://en.wikipedia.org/wiki/Maranta_leuconeura" },
  { line: "titan", ids: ["corpse_corm", "corpse_leaf", "titan_arum"], names: ["Corpse Corm", "Corpse Leaf", "Titan Arum"],
    totals: [300, 420, 520], types: ["bug", "ghost"], activity: "night", pollination: ["carnivore"],
    scientificName: "Amorphophallus titanum",
    fact: "Its huge flower smells of rotting meat, which draws carrion beetles and flies to pollinate it.",
    source: "https://en.wikipedia.org/wiki/Amorphophallus_titanum" },
  { line: "flamelily", ids: ["flame_lily_tuber", "flame_lily"], names: ["Flame Tuber", "Flame Lily"],
    totals: [305, 490], types: ["fire", "bloom"], activity: "day", pollination: ["meadow"],
    scientificName: "Gloriosa superba", fact: "It climbs by tendrils at the tips of its leaves.",
    source: "https://en.wikipedia.org/wiki/Gloriosa_superba" },
] as const;
const IDS = LINES.flatMap((line) => [...line.ids]);

describe("Chapter 11 species", () => {
  it("appends exactly eleven ids after Chapter 10 in table order", () => {
    expect(IDS).toHaveLength(11);
    const start = SPECIES_IDS.indexOf("elder") + 1;
    expect(SPECIES_IDS.slice(start, start + IDS.length)).toEqual(IDS);
  });

  for (const line of LINES) {
    it(`${line.line} uses the prescribed names, stages, types, totals, activity and pollination`, () => {
      line.ids.forEach((id, i) => {
        const s = DATA.species[id];
        expect(s).toMatchObject({ name: line.names[i], line: line.line, stage: i + 1,
          types: line.types, activity: line.activity, pollination: line.pollination });
        expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0), id).toBe(line.totals[i]);
        if (i === line.ids.length - 1) expect(s.growsInto, id).toBeUndefined();
      });
    });

    it(`${line.line} has distinct entries with exactly the prescribed sourced fact`, () => {
      const sourceText = readFileSync(new URL("./herbarium.ts", import.meta.url), "utf8");
      const entries = line.ids.map((id) => {
        const h = DATA.herbarium[id];
        expect(h.scientificName, id).toBe(line.scientificName);
        const sentences = h.entry.split(/(?<=[.!?])\s+/);
        expect(sentences, id).toHaveLength(2);
        expect(sentences[1], id).toBe(line.fact);
        expect(sourceText, id).toContain(`// Fact: ${line.fact}\n  // Source: ${line.source}\n  h("${id}"`);
        return h.entry;
      });
      expect(new Set(entries).size).toBe(line.ids.length);
    });
  }

  it("uses only the five specified vigor growths", () => {
    const growths = [
      ["nightshade_sprout", "nightshade", 36], ["mimosa_sprout", "sensitive_plant", 34],
      ["corpse_corm", "corpse_leaf", 40], ["corpse_leaf", "titan_arum", 52],
      ["flame_lily_tuber", "flame_lily", 38],
    ] as const;
    for (const [id, species, level] of growths) {
      expect(DATA.species[id].growsInto).toEqual({ species, trigger: { kind: "vigor", level } });
    }
    expect(IDS.filter((id) => DATA.species[id].growsInto)).toHaveLength(growths.length);
  });

  it("teaches signatures at the approved stages and levels, retaining them after growth", () => {
    const signatures = [
      [["nightshade"], 40, "atropine"],
      [["mimosa_sprout", "sensitive_plant"], 30, "leaf_fold"],
      [["prayer_plant"], 1, "leaf_fold"],
      [["titan_arum"], 52, "carrion_bloom"],
      [["flame_lily_tuber", "flame_lily"], 34, "climbing_flame"],
    ] as const;
    for (const [ids, level, move] of signatures) for (const id of ids) {
      expect(DATA.species[id].learnset, id).toContainEqual({ level, move });
    }
    expect(DATA.species.nightshade_sprout.learnset.some((l) => l.move === "atropine")).toBe(false);
    for (const id of ["corpse_corm", "corpse_leaf"] as const) {
      expect(DATA.species[id].learnset.some((l) => l.move === "carrion_bloom"), id).toBe(false);
    }
    for (const [id, move] of [["nightshade", "atropine"], ["sensitive_plant", "leaf_fold"],
      ["titan_arum", "carrion_bloom"], ["flame_lily", "climbing_flame"]] as const) {
      expect(movesAtLevel(DATA.species[id], 63), id).toContain(move);
    }
  });

  it("keeps usable attacking moves of both types at Council levels", () => {
    for (const id of IDS) for (let level = 58; level <= 66; level++) {
      const s = DATA.species[id];
      const attacks = movesAtLevel(s, level, (move) => DATA.moves[move].category !== "status")
        .map((move) => DATA.moves[move]).filter((move) => move.category !== "status");
      expect(attacks.length, `${id} at ${level}`).toBeGreaterThanOrEqual(2);
      for (const type of s.types) expect(attacks.some((move) => move.type === type), `${id}: ${type}`).toBe(true);
    }
  });

  it("uses the existing carnivore fallback for all titan stages", () => {
    for (const id of ["corpse_corm", "corpse_leaf", "titan_arum"] as const) {
      expect(DATA.species[id].pollination).toEqual(DATA.species.venus_flytrap.pollination);
    }
  });

  it("states toxicity only as toxic if eaten, without medicinal claims", () => {
    for (const id of IDS) {
      const entry = DATA.herbarium[id].entry;
      expect(entry.replaceAll("toxic if eaten", ""), id).not.toMatch(/toxic|poison|deadly|medicin|dose|remedy|cure/i);
    }
  });
});

describe("Chapter 11 moves", () => {
  it("defines the exact signature numbers and existing effects", () => {
    expect(DATA.moves.atropine).toMatchObject({ name: "Atropine", type: "ghost", category: "special",
      power: 75, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "status", status: "blight", chance: 20, target: "foe" }] });
    expect(DATA.moves.leaf_fold).toMatchObject({ name: "Leaf Fold", type: "wood", category: "status",
      power: 0, accuracy: null, pp: 15, priority: 0,
      effects: [{ kind: "stat", stat: "def", stages: 2, chance: 100, target: "self" }] });
    expect(DATA.moves.carrion_bloom).toMatchObject({ name: "Corpse Bloom", type: "bug", category: "special",
      power: 90, accuracy: 90, pp: 10, priority: 0,
      effects: [{ kind: "stat", stat: "spd", stages: -1, chance: 30, target: "foe" }] });
    expect(DATA.moves.climbing_flame).toMatchObject({ name: "Climb Flame", type: "fire", category: "physical",
      power: 80, accuracy: 100, pp: 15, priority: 0,
      effects: [{ kind: "status", status: "scorch", chance: 10, target: "foe" }] });
  });

  it("maps folding to the user and all three attacks to the foe", () => {
    expect(MOVE_ANIMS.atropine).toEqual({ family: "toxin", variant: "rot" });
    expect(MOVE_ANIMS.leaf_fold).toEqual({ family: "harden", variant: "night" });
    expect(MOVE_ANIMS.carrion_bloom).toEqual({ family: "lure", variant: "scent" });
    expect(MOVE_ANIMS.climbing_flame).toEqual({ family: "blaze", variant: undefined });
    for (const id of ["atropine", "leaf_fold", "carrion_bloom", "climbing_flame"]) {
      expect(isSelfAnim(MOVE_ANIMS[id]), id).toBe(id === "leaf_fold");
    }
  });
});
