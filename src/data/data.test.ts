import { describe, expect, it } from "vitest";
import { DATA } from "./index";
import { REQUIRED_ITEMS, SPECIES_IDS, STATUSES, TYPES } from "../contracts";
import type { GrowthTrigger } from "../contracts";

const species = Object.values(DATA.species);

function growthLevel(t: GrowthTrigger): number | null {
  return t.kind === "vigor" || t.kind === "vigor_day" || t.kind === "vigor_night" ? t.level : null;
}

describe("species", () => {
  it("every SPECIES_ID has a species and a herbarium entry", () => {
    for (const id of SPECIES_IDS) {
      expect(DATA.species[id], id).toBeDefined();
      expect(DATA.species[id].id).toBe(id);
      expect(DATA.herbarium[id], id).toBeDefined();
      expect(DATA.herbarium[id].species).toBe(id);
    }
    expect(Object.keys(DATA.species).length).toBe(SPECIES_IDS.length);
  });

  it("names are <= 12 characters and unique", () => {
    const names = new Set<string>();
    for (const s of species) {
      expect(s.name.length, s.name).toBeLessThanOrEqual(12);
      expect(names.has(s.name), s.name).toBe(false);
      names.add(s.name);
    }
  });

  it("types are valid", () => {
    for (const s of species) for (const t of s.types) expect(TYPES).toContain(t);
  });

  it("every learnset move exists, sorted, with level-1 starting moves", () => {
    for (const s of species) {
      expect(s.learnset.filter((l) => l.level === 1).length, s.id).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < s.learnset.length; i++) {
        expect(DATA.moves[s.learnset[i].move], `${s.id}: ${s.learnset[i].move}`).toBeDefined();
        if (i > 0) expect(s.learnset[i].level).toBeGreaterThanOrEqual(s.learnset[i - 1].level);
      }
      // a level-1 move shares a type with the species (STAB)
      const l1 = s.learnset.filter((l) => l.level === 1).map((l) => DATA.moves[l.move]);
      if (s.stage === 1) expect(l1.some((m) => m.category !== "status" && s.types.includes(m.type)), s.id).toBe(true);
    }
  });

  it("growth targets exist, stay in the line, and levels increase", () => {
    for (const s of species) {
      if (!s.growsInto) continue;
      const next = DATA.species[s.growsInto.species];
      expect(next, s.id).toBeDefined();
      expect(next.line).toBe(s.line);
      expect(next.stage).toBe(s.stage + 1);
      const lv = growthLevel(s.growsInto.trigger);
      const nextLv = next.growsInto ? growthLevel(next.growsInto.trigger) : null;
      if (lv !== null && nextLv !== null) expect(nextLv).toBeGreaterThan(lv);
    }
  });

  it("starters grow at 16 and 32; required trigger kinds appear", () => {
    for (const id of ["oak_acorn", "chili_blossom", "lily_seedpod"] as const) {
      const s1 = DATA.species[id];
      expect(growthLevel(s1.growsInto!.trigger)).toBe(16);
      expect(growthLevel(DATA.species[s1.growsInto!.species].growsInto!.trigger)).toBe(32);
    }
    const kinds = species.map((s) => s.growsInto?.trigger.kind);
    expect(kinds).toContain("tending");
    expect(kinds).toContain("vigor_day");
    expect(kinds).toContain("vigor_night");
  });

  it("stat totals sit in sensible bands", () => {
    const total = (id: string) => Object.values(DATA.species[id as keyof typeof DATA.species].baseStats).reduce((a, b) => a + b, 0);
    expect(total("oak_acorn")).toBe(310);
    expect(total("green_chili")).toBe(405);
    expect(total("giant_water_lily")).toBe(525);
    for (const s of species) {
      const t = total(s.id);
      expect(t, s.id).toBeGreaterThanOrEqual(240);
      expect(t, s.id).toBeLessThanOrEqual(530);
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    }
  });
});

describe("moves", () => {
  const moves = Object.values(DATA.moves);
  it("has ~60 well-formed moves across all types and categories", () => {
    expect(moves.length).toBeGreaterThanOrEqual(55);
    for (const t of TYPES) expect(moves.some((m) => m.type === t), t).toBe(true);
    for (const c of ["physical", "special", "status"] as const) expect(moves.some((m) => m.category === c)).toBe(true);
    for (const m of moves) {
      expect(DATA.moves[m.id]).toBe(m);
      expect(m.name.length, m.name).toBeLessThanOrEqual(12);
      expect(m.description.length, m.id).toBeLessThanOrEqual(36);
      expect(m.pp).toBeGreaterThan(0);
      if (m.category === "status") expect(m.power, m.id).toBe(0);
      for (const e of m.effects) if (e.kind === "status") expect(STATUSES).toContain(e.status);
    }
  });
});

describe("items", () => {
  it("every REQUIRED_ITEM exists and is well-formed", () => {
    for (const id of REQUIRED_ITEMS) expect(DATA.items[id], id).toBeDefined();
    for (const [id, item] of Object.entries(DATA.items)) {
      expect(item.id).toBe(id);
      expect(item.name.length, item.name).toBeLessThanOrEqual(12);
      expect(item.description.length, id).toBeLessThanOrEqual(36);
    }
    expect(DATA.items.terrarium_pod.effect).toEqual({ kind: "pod", catchMultiplier: 1 });
    expect(DATA.items.glass_pod.effect).toEqual({ kind: "pod", catchMultiplier: 1.5 });
    expect(DATA.items.centuryheart_seed.description).toBe("Warm to the touch. It hums.");
  });
});

describe("type chart", () => {
  const eff = (a: string, d: string) => (DATA.typeChart as Record<string, Record<string, number>>)[a][d] ?? 1;
  it("covers all types with valid multipliers", () => {
    for (const a of TYPES) {
      expect(DATA.typeChart[a], a).toBeDefined();
      for (const [d, v] of Object.entries(DATA.typeChart[a])) {
        expect(TYPES).toContain(d);
        expect([0.5, 2]).toContain(v);
      }
    }
  });
  it("encodes the required relations", () => {
    const se: [string, string][] = [
      ["water", "fire"], ["fire", "wood"], ["wood", "water"], ["fire", "bug"], ["fire", "frost"],
      ["frost", "wood"], ["frost", "bloom"], ["frost", "dragon"], ["thorn", "bloom"], ["thorn", "bug"],
      ["bug", "bloom"], ["ghost", "ghost"], ["dragon", "dragon"], ["dragon", "ghost"],
    ];
    for (const [a, d] of se) expect(eff(a, d), `${a}>${d}`).toBe(2);
  });
});

describe("herbarium", () => {
  it("entries are 2-4 sentences with real sizes", () => {
    for (const e of Object.values(DATA.herbarium)) {
      const sentences = e.entry.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, e.species).toBeGreaterThanOrEqual(2);
      expect(sentences.length, e.species).toBeLessThanOrEqual(4);
      expect(e.heightM).toBeGreaterThan(0);
      expect(e.weightKg).toBeGreaterThan(0);
      expect(e.scientificName).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    }
  });
});

describe("expForLevel", () => {
  it("follows the Gen 2 curves", () => {
    expect(DATA.expForLevel("medium", 1)).toBe(0);
    expect(DATA.expForLevel("medium", 5)).toBe(125);
    expect(DATA.expForLevel("medium", 100)).toBe(1_000_000);
    expect(DATA.expForLevel("fast", 100)).toBe(800_000);
    expect(DATA.expForLevel("slow", 100)).toBe(1_250_000);
    for (const r of ["fast", "medium", "slow"] as const)
      for (let l = 2; l <= 100; l++) expect(DATA.expForLevel(r, l)).toBeGreaterThan(DATA.expForLevel(r, l - 1));
  });
});
