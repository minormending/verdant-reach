import { describe, expect, it } from "vitest";
import type { GameData, WorldData } from "../contracts";
import { WORLD } from "../world";
import { DATA } from "../data";
import { habitatLines, habitatOf, wildPlaces } from "./habitat";

const map = (id: string, name: string, enc: unknown) =>
  ({ id, name, encounters: enc }) as unknown as WorldData["maps"][keyof WorldData["maps"]];

const world = {
  maps: {
    route_1: map("route_1", "ROUTE 1", {
      grass: { rate: 10, slots: [
        { species: "clover_sprout", minLevel: 2, maxLevel: 4, weight: 30, time: "day" },
        { species: "dandelion_bud", minLevel: 2, maxLevel: 4, weight: 30 },
      ] },
    }),
    route_3: map("route_3", "ROUTE 3", {
      grass: { rate: 10, slots: [
        { species: "moonflower_seed", minLevel: 9, maxLevel: 11, weight: 20, time: "night" },
        { species: "clover_sprout", minLevel: 9, maxLevel: 11, weight: 20, time: "night" },
      ] },
    }),
    sugarbush_conservatory: map("sugarbush_conservatory", "SUGARBUSH CONSERVATORY", {
      bog: { rate: 8, slots: [{ species: "moonflower_seed", minLevel: 12, maxLevel: 14, weight: 5, time: "night" }] },
    }),
    route_2: map("route_2", "ROUTE 2", {
      grass: { rate: 10, slots: [{ species: "dandelion_bud", minLevel: 5, maxLevel: 6, weight: 0 }] },
      bog: { rate: 10, slots: [{ species: "dandelion_bud", minLevel: 5, maxLevel: 6, weight: 10, time: "night" }] },
    }),
  },
} as unknown as WorldData;

const data = {
  species: {
    oak_acorn: { id: "oak_acorn", growsInto: { species: "oak_sapling" } },
    oak_sapling: { id: "oak_sapling" },
  },
} as unknown as GameData;

describe("herbarium FOUND IN", () => {
  it("lists maps in world order and merges time windows per map", () => {
    expect(wildPlaces(world, "clover_sprout")).toEqual([
      { map: "route_1", name: "ROUTE 1", time: "day" },
      { map: "route_3", name: "ROUTE 3", time: "night" },
    ]);
    expect(wildPlaces(world, "dandelion_bud").map((p) => `${p.name}:${p.time}`)).toEqual(["ROUTE 1:any", "ROUTE 2:night"]);
  });

  it("says UNKNOWN until seen, RARE for gifts, and names the earlier stage for grown forms", () => {
    expect(habitatOf(world, data, "clover_sprout", false)).toEqual({ kind: "unknown" });
    expect(habitatOf(world, data, "snapdragon_sprout", true)).toEqual({ kind: "rare" });
    expect(habitatOf(world, data, "oak_sapling", true)).toEqual({ kind: "grown", from: "oak_acorn" });
    const lines = habitatLines(habitatOf(world, data, "moonflower_seed", true), (id) => id);
    expect(lines).toEqual(["ROUTE 3 (NIGHT)", "SUGARBUSH", " CONSERVATORY", " (NIGHT)"]);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(18);
    expect(habitatLines({ kind: "unknown" }, String)).toEqual(["UNKNOWN"]);
  });

  it("every line for every real species fits the text box", () => {
    for (const id of Object.keys(DATA.species) as (keyof typeof DATA.species)[]) {
      for (const l of habitatLines(habitatOf(WORLD, DATA, id, true), (s) => DATA.species[s]?.name ?? s)) {
        expect(l.length, `${id}: "${l}"`).toBeLessThanOrEqual(18);
      }
    }
  });
});
