import { describe, expect, it } from "vitest";
import { WORLD } from "../../world";
import { DATA } from "../../data";
import { PART_2 } from "./part2";

const trainerExists = (id: string): boolean =>
  !!WORLD.trainers[id] || ["oak", "chili", "lily"].every((l) => !!WORLD.trainers[`${id}_${l}`]);

describe("walkthrough part 2", () => {
  it("references only real maps, flags, trainers, species and items", () => {
    const ids = new Set<string>();
    for (const s of PART_2) {
      expect(ids.has(s.id), `duplicate section ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(["Chapter 5", "Chapter 6", "Chapter 7", "Chapter 8"]).toContain(s.part);
      for (const b of s.blocks) {
        if ("map" in b) expect(WORLD.maps[b.map], b.map).toBeTruthy();
        if ("boss" in b) expect(trainerExists(b.boss), b.boss).toBe(true);
        if ("species" in b) expect(DATA.species[b.species], b.species).toBeTruthy();
        if ("item" in b) expect(DATA.items[b.item], b.item).toBeTruthy();
      }
    }
  });

  it("covers every Chapter 5-8 map with encounters, trainers or items", () => {
    const used = new Set(PART_2.flatMap((s) => s.blocks.flatMap((b) => ("map" in b ? [b.map] : []))));
    const range = [
      "route_6", "cedarhallow", "cedarhallow_greenhouse", "cedarhallow_market", "cedarhallow_house", "burnt_stand",
      "cedar_hollow", "cedarhallow_conservatory", "route_7", "saltmarsh_harbour", "saltmarsh_greenhouse",
      "saltmarsh_market", "saltmarsh_conservatory", "route_8", "driftseed_isle", "driftseed_greenhouse",
      "driftseed_conservatory", "driftseed_vents", "route_9", "larchmere", "larchmere_greenhouse", "larchmere_market",
      "bloom_lake", "larchmere_lodge", "rootstock_hideout_1", "rootstock_hideout_2", "larchmere_conservatory",
      "glasshouse_city", "palm_house", "glasshouse_relay", "relay_2f", "relay_3f", "relay_roof",
    ];
    for (const m of range) expect(used.has(m as never), m).toBe(true);
  });

  it("has a boss card for every chapter 5-8 leader, rival and admin", () => {
    const bosses = new Set(PART_2.flatMap((s) => s.blocks.flatMap((b) => ("boss" in b ? [b.boss] : []))));
    for (const b of ["rival_4", "morrow", "saguaro", "reyes", "calloway", "signe", "wren"]) expect(bosses.has(b), b).toBe(true);
  });

  it("ends every chapter with a checklist", () => {
    for (const part of ["Chapter 5", "Chapter 6", "Chapter 7", "Chapter 8"]) {
      const last = PART_2.filter((s) => s.part === part).at(-1)!;
      expect(last.blocks.some((b) => "checklist" in b), part).toBe(true);
    }
  });
});
