import { describe, expect, it } from "vitest";
import type { Cond, MapDef, MapId } from "../../contracts";
import { DATA } from "../../data";
import { WORLD } from "../../world";
import type { Block } from "../types";
import { PART_3 } from "./part3";

const blocks: Block[] = PART_3.flatMap((s) => s.blocks);
const mapBlocks = blocks.flatMap((b) => ("map" in b ? [b] : []));
const bosses = blocks.flatMap((b) => ("boss" in b ? [b.boss] : []));
const STARTERS = ["oak", "chili", "lily"] as const;

/** Every flag a map's story-state view can depend on. */
function mapFlags(m: MapDef): Set<string> {
  const conds: (Cond | undefined)[] = [
    ...(m.legendWhen ?? []).map((l) => l.when),
    ...(m.encountersWhen ?? []).map((e) => e.when),
    ...m.npcs.map((n) => n.visibleWhen),
    ...m.triggers.map((t) => t.when),
  ];
  return new Set(conds.flatMap((c) => (c ?? []).map((x) => x.flag)));
}

/** The maps of Chapters 9 to 11 and the post-game. */
const RANGE: MapId[] = [
  "route_10", "thistledown", "thistledown_greenhouse", "thistledown_market", "thistledown_house",
  "route_11", "sanguine_greenhouse", "sanguine_ridge", "sanguine_conservatory",
  "route_12", "council_arboretum", "arboretum_greenhouse", "elder_grove_1", "elder_grove_2",
  "elder_grove_3", "elder_grove_heart", "council_hall",
  "council_1", "council_2", "council_3", "council_4", "keeper_hall", "fellowship_hall",
  "seed_vault_entrance", "seed_vault_b1", "seed_vault_b2", "seed_vault_b3", "methuselah_ridge",
];

describe("walkthrough part 3", () => {
  it("has unique section ids and the right parts", () => {
    const ids = PART_3.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of PART_3) expect(["Chapter 9", "Chapter 10", "Chapter 11", "Post-game"]).toContain(s.part);
  });

  it("references only real maps, with flags those maps actually use", () => {
    for (const b of mapBlocks) {
      const m = WORLD.maps[b.map];
      expect(m, b.map).toBeDefined();
      const used = mapFlags(m);
      for (const f of Object.keys(b.flags ?? {})) expect(used.has(f), `${b.map} flag ${f}`).toBe(true);
    }
  });

  it("covers every map in its range, and every one with encounters, trainers or items", () => {
    const shown = new Set(mapBlocks.map((b) => b.map));
    for (const id of RANGE) expect(shown.has(id), id).toBe(true);
    for (const id of RANGE) {
      const m = WORLD.maps[id];
      const hasStuff = !!m.encounters || !!m.hidden?.length || m.npcs.some((n) => n.trainer || n.sprite === "item_pickup");
      if (hasStuff) expect(shown.has(id), id).toBe(true);
    }
  });

  it("shows the post-game paths in their open state", () => {
    const flagged = (id: MapId) => mapBlocks.filter((b) => b.map === id).map((b) => b.flags ?? {});
    expect(flagged("route_9").some((f) => f.game_cleared)).toBe(true);
    expect(flagged("seed_vault_entrance").some((f) => f.game_cleared)).toBe(true);
    expect(flagged("methuselah_ridge").some((f) => f.game_cleared && f.diary_read)).toBe(true);
  });

  it("references only real trainers, and has a card for every boss in range", () => {
    const exists = (id: string) => !!WORLD.trainers[id] || STARTERS.every((l) => WORLD.trainers[`${id}_${l}`]);
    for (const id of bosses) expect(exists(id), id).toBe(true);
    for (const id of ["rival_5", "rook", "shears_2", "calloway_2", "wren_2", "mercer",
      "belladonna", "mimi_osa", "titus_arum", "pyra", "rowan",
      "belladonna_rematch", "mimi_osa_rematch", "titus_arum_rematch", "pyra_rematch", "rowan_rematch"]) {
      expect(bosses, id).toContain(id);
    }
  });

  it("references only real species and items", () => {
    for (const b of blocks) {
      if ("species" in b) expect(DATA.species[b.species], b.species).toBeDefined();
      if ("item" in b) expect(DATA.items[b.item], b.item).toBeDefined();
    }
    const species = blocks.flatMap((b) => ("species" in b ? [b.species] : []));
    for (const id of ["elder", "centuryheart", "tumbleweed", "coconut", "burr", "methuselah"]) expect(species).toContain(id);
  });

  it("names species in UPPER CASE as the game does", () => {
    const text = blocks.flatMap((b) => Object.values(b).filter((v): v is string => typeof v === "string")).join(" ")
      + blocks.flatMap((b) => ("list" in b ? b.list : "checklist" in b ? b.checklist : [])).join(" ");
    for (const sp of Object.values(DATA.species)) {
      if (sp.name.length < 6) continue;
      const mixed = new RegExp(`\\b${sp.name.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`);
      expect(mixed.test(text), `${sp.name} should be written ${sp.name.toUpperCase()}`).toBe(false);
    }
  });

  it("never gives ROWAN a gendered pronoun", () => {
    const strings = blocks.flatMap((b) => [
      ...Object.values(b).filter((v): v is string => typeof v === "string"),
      ...("list" in b ? b.list : "checklist" in b ? b.checklist : []),
    ]);
    for (const s of strings) for (const sentence of s.split(/(?<=[.!?:])\s+/)) {
      if (/ROWAN/.test(sentence)) expect(/\b(he|she|him|his|himself|herself)\b/i.test(sentence), sentence).toBe(false);
    }
  });
});
