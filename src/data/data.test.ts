import { describe, expect, it } from "vitest";
import { DATA } from "./index";
import { POLLINATION_GROUPS, REQUIRED_ITEMS, SPECIES_IDS, STATUSES, TYPES } from "../contracts";
import type { GrowthTrigger } from "../contracts";
import { wrapText } from "../ui/font";

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
      expect(t, s.id).toBeLessThanOrEqual(s.id === "elder" ? 640 : 530);
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    }
  });
});

describe("round 3 lines", () => {
  const R3 = [
    ["clover_sprout", "white_clover"], ["cattail_shoot", "cattail"], ["foxglove_rosette", "foxglove"],
    ["holly_seedling", "holly"], ["mint_sprig", "peppermint"], ["rose_bud", "wild_rose"],
    ["pitcher_sprout", "pitcher_plant"], ["snapdragon_sprout", "snapdragon"],
  ] as const;
  const total = (id: keyof typeof DATA.species) => Object.values(DATA.species[id].baseStats).reduce((a, b) => a + b, 0);

  it("are two-stage lines in the Gen 2 bands with ~40-level learnsets", () => {
    for (const [a, b] of R3) {
      expect(DATA.species[a].growsInto?.species, a).toBe(b);
      expect(DATA.species[b].growsInto, b).toBeUndefined();
      expect(total(a), a).toBeGreaterThanOrEqual(250);
      expect(total(a), a).toBeLessThanOrEqual(320);
      expect(total(b), b).toBeGreaterThanOrEqual(400);
      expect(total(b), b).toBeLessThanOrEqual(470);
      for (const id of [a, b]) {
        const ls = DATA.species[id].learnset;
        expect(ls.length, id).toBeGreaterThanOrEqual(10);
        expect(ls[ls.length - 1].level, id).toBeGreaterThanOrEqual(36);
        expect(ls.some((l) => DATA.moves[l.move].category === "status"), id).toBe(true);
      }
    }
  });

  it("each line teaches its signature move", () => {
    const sig: [keyof typeof DATA.species, string][] = [
      ["peppermint", "menthol_chill"], ["foxglove", "digitalis"], ["holly", "holly_spines"], ["cattail", "cattail_fluff"],
      ["pitcher_plant", "pitfall_slurp"], ["wild_rose", "rose_thorn"], ["snapdragon", "dragon_snap"],
    ];
    for (const [id, mv] of sig) expect(DATA.species[id].learnset.map((l) => l.move), id).toContain(mv);
  });

  it("snapdragon is the strongest new line but a rare gift", () => {
    expect(total("snapdragon")).toBe(Math.max(...R3.map(([, b]) => total(b))));
    expect(DATA.species.snapdragon_sprout.catchRate).toBeLessThanOrEqual(45);
    expect(DATA.species.snapdragon.types).toContain("dragon");
  });
});

describe("round 4 lines", () => {
  const total = (id: keyof typeof DATA.species) => Object.values(DATA.species[id].baseStats).reduce((a, b) => a + b, 0);
  const R4 = [
    ["apple_pip", "apple_sapling", "apple_tree"], ["orchid_keiki", "orchid_spike", "moth_orchid"],
    ["monstera_cutting", "monstera"], ["lotus_seed", "sacred_lotus"], ["paradise_shoot", "bird_of_paradise"],
  ] as const;

  it("follow the Gen 2 stat bands with ~40-level learnsets", () => {
    for (const line of R4) {
      const last = line[line.length - 1];
      expect(DATA.species[last].growsInto, last).toBeUndefined();
      for (let i = 0; i < line.length - 1; i++) expect(DATA.species[line[i]].growsInto?.species, line[i]).toBe(line[i + 1]);
      const bands: [number, number][] = line.length === 3 ? [[255, 290], [350, 370], [465, 490]] : [[275, 320], [420, 470]];
      line.forEach((id, i) => {
        expect(total(id), id).toBeGreaterThanOrEqual(bands[i][0]);
        expect(total(id), id).toBeLessThanOrEqual(bands[i][1]);
        const ls = DATA.species[id].learnset;
        expect(ls.length, id).toBeGreaterThanOrEqual(10);
        expect(ls[ls.length - 1].level, id).toBeGreaterThanOrEqual(36);
      });
    }
  });

  it("teach their real-plant signature moves", () => {
    const sig: [keyof typeof DATA.species, string][] = [
      ["apple_sapling", "windfall"], ["moth_orchid", "false_nectar"], ["moth_orchid", "long_bloom"], ["orchid_keiki", "velamen"],
      ["monstera", "fenestrate"], ["monstera_cutting", "aerial_root"], ["sacred_lotus", "lotus_effect"],
      ["sacred_lotus", "pod_shower"], ["bird_of_paradise", "pollen_perch"],
    ];
    for (const [id, mv] of sig) expect(DATA.species[id].learnset.map((l) => l.move), id).toContain(mv);
    // A cutting's leaves are whole: monstera only fenestrates once mature.
    expect(DATA.species.monstera_cutting.learnset.map((l) => l.move)).not.toContain("fenestrate");
  });

  it("Flora's ace is grown by 22, and the bird of paradise is the rare top line", () => {
    const t = DATA.species.orchid_spike.growsInto!.trigger;
    expect(t.kind === "vigor_night" && t.level <= 22).toBe(true);
    expect(DATA.species.paradise_shoot.catchRate).toBeLessThanOrEqual(45);
    expect(total("bird_of_paradise")).toBe(Math.max(total("monstera"), total("sacred_lotus"), total("bird_of_paradise")));
  });
});

describe("pollination", () => {
  it("breedable species have valid groups shared by their line; legendaries cannot set seed", () => {
    const byLine = new Map<string, string>();
    for (const s of species) {
      if (s.id === "elder") expect(s.pollination, s.id).toEqual([]);
      else expect(s.pollination?.length, s.id).toBeGreaterThan(0);
      for (const g of s.pollination!) expect(POLLINATION_GROUPS, s.id).toContain(g);
      const key = JSON.stringify(s.pollination);
      if (byLine.has(s.line)) expect(key, s.id).toBe(byLine.get(s.line));
      byLine.set(s.line, key);
      if (s.pollination!.includes("spore")) expect(s.pollination, s.id).toEqual(["spore"]);
    }
    for (const g of POLLINATION_GROUPS) expect(species.some((s) => s.pollination!.includes(g)), g).toBe(true);
    expect(DATA.species.fern_fiddlehead.pollination).toEqual(["spore"]);
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
      // The summary screen shows exactly two 18-column lines (screens/summary.ts).
      expect(wrapText(m.description, 18).length, `${m.id}: ${m.description}`).toBeLessThanOrEqual(2);
      expect(m.pp).toBeGreaterThan(0);
      if (m.category === "status") expect(m.power, m.id).toBe(0);
      for (const e of m.effects) if (e.kind === "status") expect(STATUSES).toContain(e.status);
    }
  });
});

describe("items", () => {
  it("requires ODELL's Relay keycard with its exact key-item data", () => {
    expect(REQUIRED_ITEMS).toContain("relay_keycard");
    expect(DATA.items.relay_keycard).toEqual({
      id: "relay_keycard", name: "Keycard", pocket: "key", price: 0,
      description: "ODELL's pass to every RELAY floor.", effect: { kind: "none" },
      usableInBattle: false, usableInField: false,
    });
    expect(wrapText(DATA.items.relay_keycard.description, 18)).toHaveLength(2);
  });
  it("keeps found growth items field-only; ash opens lodgepole cones and cold opens snowdrop bulbs", () => {
    for (const [id, name] of [["ember_ash", "Ember Ash"], ["cold_snap", "Cold Snap"]]) {
      expect(DATA.items[id]).toMatchObject({
        // Ember Ash is sold from Chapter 9 (Thistledown, CH9.md §4); Cold Snap never is.
        id, name, pocket: "items", price: id === "ember_ash" ? 3000 : 0, effect: { kind: "none" },
        usableInBattle: false, usableInField: true,
      });
      expect(wrapText(DATA.items[id].description, 18).length).toBeLessThanOrEqual(2);
      expect(REQUIRED_ITEMS).not.toContain(id);
      const users = species.filter((s) => s.growsInto?.trigger.kind === "item" && s.growsInto.trigger.item === id);
      expect(users.map((s) => s.id)).toEqual(id === "ember_ash" ? ["lodgepole_cone"] : ["snowdrop_bulb"]);
    }
    expect(DATA.species.lodgepole_cone.growsInto).toEqual({
      species: "lodgepole_seedling", trigger: { kind: "item", item: "ember_ash" },
    });
    expect(DATA.species.snowdrop_bulb.growsInto).toEqual({
      species: "snowdrop_shoot", trigger: { kind: "item", item: "cold_snap" },
    });
  });

  it("defines the future GLIDER SEED key item without requiring art yet", () => {
    expect(DATA.items.glider_seed).toMatchObject({ name: "Glider Seed", pocket: "key", price: 0, effect: { kind: "none" }, usableInBattle: false });
    expect(wrapText(DATA.items.glider_seed.description, 18).length).toBeLessThanOrEqual(2);
    expect(REQUIRED_ITEMS).not.toContain("glider_seed");
  });
  it("every REQUIRED_ITEM exists and is well-formed", () => {
    for (const id of REQUIRED_ITEMS) expect(DATA.items[id], id).toBeDefined();
    for (const [id, item] of Object.entries(DATA.items)) {
      expect(item.id).toBe(id);
      // 13 so "Terrarium Pod" matches the story's name; screens fit 13 columns.
      expect(item.name.length, item.name).toBeLessThanOrEqual(13);
      expect(item.description.length, id).toBeLessThanOrEqual(36);
    }
    expect(DATA.items.terrarium_pod.effect).toEqual({ kind: "pod", catchMultiplier: 1 });
    expect(DATA.items.glass_pod.effect).toEqual({ kind: "pod", catchMultiplier: 1.5 });
    expect(DATA.items.centuryheart_seed.description).toBe("Warm to the touch. It hums.");
    expect(DATA.items.wild_berry.effect).toEqual({ kind: "heal", amount: 30 });
    expect(DATA.items.wild_berry.price).toBeGreaterThan(0); // sellable
    expect(DATA.items.rose_hip.effect).toEqual({ kind: "cure_status" });
    expect(DATA.items.syrup_jar.pocket).toBe("key");
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
      // The Chapter 6 prickly pear line is identified to genus (Opuntia).
      expect(e.scientificName).toMatch(/^[A-Z][a-z]+(?: [a-z]+)?$/);
      // plain ASCII only: the 8x8 font has no accented letters except e-acute
      expect(e.entry, e.species).toMatch(/^[ -~]+$/);
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
