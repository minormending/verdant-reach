// Part 1 of the walkthrough (Prologue to Chapter 4): every id it names must
// exist in the game, and every map in its range with encounters, trainers or
// items must have a map block.
import { describe, expect, it } from "vitest";
import type { MapId } from "../../contracts";
import { DATA } from "../../data";
import { WORLD } from "../../world";
import type { Block } from "../types";
import { PART_1 } from "./part1";

const blocks: Block[] = PART_1.flatMap((s) => s.blocks);
const pick = <K extends string>(key: K) =>
  blocks.filter((b): b is Extract<Block, Record<K, unknown>> => key in b);

/** The maps the player can visit from the Prologue to the end of Chapter 4. */
const RANGE: MapId[] = [
  "herbarium_roof", "player_home", "fallowfield", "herbarium", "route_1", "hedgerow", "fennimore_house",
  "route_2", "bramblegate", "bramblegate_greenhouse", "bramblegate_market", "bramblegate_conservatory",
  "route_3", "sugarbush", "sugarbush_greenhouse", "sugarbush_grove", "sugarbush_conservatory",
  "route_4", "glasshouse_city", "glasshouse_greenhouse", "glasshouse_market", "glasshouse_house",
  "glasshouse_relay", "glasshouse_nursery", "palm_house", "glasshouse_conservatory", "route_5",
];

describe("walkthrough part 1", () => {
  it("has unique section ids in the right parts", () => {
    const ids = PART_1.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const parts = ["Prologue", "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"];
    for (const s of PART_1) expect(parts).toContain(s.part);
    // In play order: parts never go backwards.
    const order = PART_1.map((s) => parts.indexOf(s.part));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("names only real maps, trainers, species and items", () => {
    for (const b of pick("map")) expect(WORLD.maps[b.map], b.map).toBeDefined();
    for (const b of pick("boss")) {
      const variants = ["oak", "chili", "lily"].map((l) => `${b.boss}_${l}`);
      const ok = !!WORLD.trainers[b.boss] || variants.every((id) => WORLD.trainers[id]);
      expect(ok, b.boss).toBe(true);
    }
    for (const b of pick("species")) expect(DATA.species[b.species], b.species).toBeDefined();
    for (const b of pick("item")) expect(DATA.items[b.item], b.item).toBeDefined();
  });

  it("covers every map in range with encounters, trainers or items", () => {
    const shown = new Set(pick("map").map((b) => b.map));
    for (const id of RANGE) {
      const m = WORLD.maps[id];
      const matters = !!m.encounters || (m.hidden?.length ?? 0) > 0
        || m.npcs.some((n) => n.trainer || n.sprite === "item_pickup");
      if (matters) expect(shown.has(id), id).toBe(true);
    }
  });

  it("has a boss card for each leader, rival and admin in range", () => {
    const bosses = new Set(pick("boss").map((b) => b.boss));
    for (const id of ["hollis", "nell", "flora", "shears", "rival_1", "rival_2", "rival_3"]) expect(bosses.has(id), id).toBe(true);
  });

  it("ends each chapter with a checklist", () => {
    for (const part of ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"]) {
      const secs = PART_1.filter((s) => s.part === part);
      expect(secs.some((s) => s.blocks.some((b) => "checklist" in b)), part).toBe(true);
    }
  });
});
