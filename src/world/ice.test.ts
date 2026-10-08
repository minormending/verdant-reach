import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { LEGEND } from "./build";
import { canReach, flood, grid, validateWorld } from "./validate";
import { WORLD } from "./index";

function room(tiles: string[]): MapDef {
  return {
    id: "route_1", name: "ICE TEST", outdoor: true, music: "route", border: "wall",
    tiles, legend: { "#": "wall", ".": "floor_tile", I: "ice" },
    structures: [], warps: [], npcs: [], signs: [], triggers: [],
  };
}

describe("ICE reachability validation", () => {
  it("reaches an intermediate ice warp as a stop in both directions of validation", () => {
    const map = room(["#######", "#.III.#", "#######"]);
    map.warps = [{ x: 3, y: 1, to: "route_2", toX: 1, toY: 1 }];
    const g = grid(map);
    expect(flood(g, [{ x: 1, y: 1 }]).has("3,1")).toBe(true);
    expect(canReach(g, [{ x: 3, y: 1 }]).has("1,1")).toBe(true);
    expect(canReach(g, [{ x: 3, y: 1 }]).has("5,1")).toBe(true);
  });

  it("provides distinct legend characters for ice and snow", () => {
    expect(Object.values(LEGEND)).toContain("ice");
    expect(Object.values(LEGEND)).toContain("snow");
  });

  it("does not branch from intermediate ice tiles, forward or backward", () => {
    const map = room(["#######", "#.IIII#", "###.###", "#######"]);
    const g = grid(map);
    expect(flood(g, [{ x: 1, y: 1 }])).toEqual(new Set(["1,1", "5,1"]));
    expect(canReach(g, [{ x: 3, y: 2 }]).has("1,1")).toBe(false);
    expect(canReach(g, [{ x: 1, y: 1 }]).has("5,1")).toBe(true);
    map.npcs = [{ id: "blocker", sprite: "hiker", x: 4, y: 1, facing: "left" }];
    expect(flood(grid(map), [{ x: 1, y: 1 }]).has("3,2")).toBe(true);
    expect(canReach(grid(map), [{ x: 3, y: 2 }]).has("1,1")).toBe(true);
  });

  it("reports an unreachable warp and an ice dead end in the full validator", () => {
    const map = room(["#########", "#.IIIIII#", "###.##.##", "######.##", "#########"]);
    map.warps = [{ x: 3, y: 2, to: "route_2", toX: 1, toY: 0 }];
    const world = { ...WORLD, maps: { ...WORLD.maps, route_1: map },
      newGame: { ...WORLD.newGame, map: "route_1" as const, x: 1, y: 1 } };
    // Remove outside entries to make the entrance the sole initial slide stop.
    for (const [id, m] of Object.entries(world.maps)) if (id !== "route_1") {
      world.maps[m.id] = { ...m, warps: m.warps.filter((w) => w.to !== "route_1") };
    }
    const errors = validateWorld(world).join("\n");
    expect(errors).toContain("[route_1] warp at 3,2 unreachable");
    expect(errors).toContain("[route_1] soft-lock before PRUNE: no exit from 1,1");
  });

  it("validates conditional encounter tables", () => {
    const world = { ...WORLD, maps: { ...WORLD.maps, route_1: structuredClone(WORLD.maps.route_1) } };
    world.maps.route_1.encountersWhen = [{ when: [{ flag: "calmed", is: true }], encounters: {
      water: { rate: 8, slots: [{ species: "lily_pad", minLevel: 40, maxLevel: 33, weight: 100 }] },
    } }];
    expect(validateWorld(world).join("\n")).toContain("[route_1] encounter levels lily_pad");
  });
});
