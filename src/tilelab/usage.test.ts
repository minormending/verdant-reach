import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { WORLD } from "../world";
import { usageIndex, usageLabel } from "./usage";

const fixture = {
  id: "route_1", name: "T", outdoor: true, music: "route", border: "tree",
  tiles: ["..g", ".~g", "BBp"],
  legend: { ".": "grass", g: "tall_grass", "~": "water", B: "bramble", p: "pit" },
  legendWhen: [{ when: [{ flag: "lake_calmed", is: false }], legend: { "~": "red_water" } }],
  structures: [], warps: [], npcs: [], signs: [], triggers: [],
} as unknown as MapDef;

describe("usage index", () => {
  const idx = usageIndex([fixture]);
  it("counts cells per key, conditional cells and the border", () => {
    expect(idx.keys.get("grass")!.cells).toBe(3);
    expect(idx.keys.get("tall_grass")!.cells).toBe(2);
    expect(idx.keys.get("red_water")!.cond).toBe(1);
    expect(idx.keys.get("red_water")!.cells).toBe(0);
    expect(idx.keys.get("tree")!.maps.get("route_1")!.border).toBe(true);
    expect(idx.keys.get("filled_pit")!.cond).toBe(1);
    expect(idx.maps.get("route_1")!.flags).toEqual(["lake_calmed"]);
    expect(idx.maps.get("route_1")!.keys.has("red_water")).toBe(true);
  });
  it("labels usage", () => {
    expect(usageLabel(idx.keys.get("grass"))).toBe("1 map · 3 cells");
    expect(usageLabel(idx.keys.get("red_water"))).toContain("+1 in some story states");
    expect(usageLabel(undefined)).toBe("unused");
  });
  it("covers the whole world", () => {
    const all = usageIndex(Object.values(WORLD.maps));
    expect(all.maps.size).toBe(Object.keys(WORLD.maps).length);
    expect(all.keys.get("grass")!.maps.size).toBeGreaterThan(10);
    for (const def of Object.values(WORLD.maps)) {
      for (const row of def.tiles) for (const ch of Array.from(row)) {
        const key = def.legend[ch];
        if (key) expect(all.keys.get(key)!.maps.has(def.id)).toBe(true);
      }
    }
  });
});
