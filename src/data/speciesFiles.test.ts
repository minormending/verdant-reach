// The species JSON files (docs/DATA.md): one file per line, complete and well formed.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { SPECIES_IDS } from "../contracts";
import { DATA } from "./index";
import { speciesLineErrors, type SpeciesLineFile } from "./species";

const DIR = "src/data/species";
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const read = (f: string) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as SpeciesLineFile;

describe("species line files", () => {
  it.each(files)("%s is well formed", (f) => {
    expect(speciesLineErrors(f, read(f))).toEqual([]);
  });

  it("defines every species in SPECIES_IDS exactly once", () => {
    const ids = files.flatMap((f) => read(f).species.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...SPECIES_IDS].sort());
    expect(Object.keys(DATA.species)).toEqual([...SPECIES_IDS]);
  });

  it("keeps a line's stages in order, each growing into the next stage of its own line", () => {
    for (const f of files) {
      const { species } = read(f);
      species.forEach((s, i) => {
        expect(s.stage, `${f} ${s.id}`).toBe(i + 1);
        if (s.growsInto) expect(species.map((x) => x.id), `${f} ${s.id} grows outside its line`).toContain(s.growsInto.species);
      });
    }
  });

  it("only uses moves that exist", () => {
    for (const s of Object.values(DATA.species)) {
      for (const { move } of s.learnset) expect(DATA.moves[move], `${s.id} learns unknown move ${move}`).toBeDefined();
    }
  });

  it("reports mistakes with the file and field", () => {
    const bad = structuredClone(read("oak.json"));
    bad.species[0].baseStats.hp = 0;
    bad.species[0].types = ["plasma" as never];
    bad.line = "acorn";
    const errs = speciesLineErrors("oak.json", bad);
    expect(errs).toContain("oak.json: line: must match the file name (oak.json)");
    expect(errs.some((e) => e.includes("oak_acorn") && e.includes("baseStats.hp"))).toBe(true);
    expect(errs.some((e) => e.includes("types must be 1-2 known types"))).toBe(true);
  });
});
