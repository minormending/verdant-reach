import { describe, expect, it } from "vitest";
import type { MapDef, TileKey } from "../contracts";
import { canReach, flood, grid, validateWorld, walkable } from "./validate";
import { WORLD } from "./index";

function testGrid(tiles: string[]) {
  const map: MapDef = {
    id: "route_1",
    name: "TEST MAP",
    outdoor: true,
    music: "route",
    border: "tree",
    tiles,
    legend: { ".": "grass", "#": "tree", "v": "ledge_down" },
    structures: [],
    warps: [],
    npcs: [],
    signs: [],
    triggers: [],
  };
  return grid(map);
}

describe("canReach", () => {
  it("includes every tile on open floor, including the target itself", () => {
    const g = testGrid(["...", "..."]);
    expect(canReach(g, [{ x: 1, y: 0 }])).toEqual(new Set([
      "0,0", "1,0", "2,0", "0,1", "1,1", "2,1",
    ]));
  });

  it("excludes walls and floor sealed off from the target", () => {
    const g = testGrid(["..#..", "..#..", "#####"]);
    expect(canReach(g, [{ x: 0, y: 0 }])).toEqual(new Set([
      "0,0", "1,0", "0,1", "1,1",
    ]));
  });

  it("includes tiles above a ledge when the target is below it", () => {
    const g = testGrid(["..", "vv", ".."]);
    expect(canReach(g, [{ x: 0, y: 2 }])).toEqual(new Set([
      "0,0", "1,0", "0,2", "1,2",
    ]));
  });

  it("excludes tiles below a ledge when the target is above it", () => {
    const g = testGrid(["..", "vv", ".."]);
    expect(canReach(g, [{ x: 0, y: 0 }])).toEqual(new Set(["0,0", "1,0"]));
  });

  it.each([
    { name: "wall", target: { x: 1, y: 0 } },
    { name: "ledge", target: { x: 1, y: 1 } },
    { name: "outside the map", target: { x: -1, y: 0 } },
  ])("ignores a target on $name", ({ target }) => {
    const g = testGrid([".#.", ".v.", "..."]);
    expect(canReach(g, [target])).toEqual(new Set());
  });

  it("includes tiles that can reach either target and ignores unwalkable targets", () => {
    const g = testGrid(["..#.."]);
    expect(canReach(g, [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }]))
      .toEqual(new Set(["0,0", "1,0", "3,0", "4,0"]));
  });

  it.each([
    { name: "open floor", tiles: ["...", "..."] },
    { name: "sealed rooms", tiles: ["..#..", "..#..", "#####"] },
    { name: "one-way ledge", tiles: ["..", "vv", ".."] },
    { name: "chained ledges", tiles: ["..", "vv", "..", "vv", ".."] },
    { name: "blocked and out-of-bounds landings", tiles: ["...", "vv#", "#..", "vvv"] },
  ])("agrees with flood for every walkable start and target on $name", ({ tiles }) => {
    const g = testGrid(tiles);
    const floor: { x: number; y: number }[] = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (walkable(g, x, y)) floor.push({ x, y });
    }
    for (const target of floor) {
      const reverse = canReach(g, [target]);
      for (const start of floor) {
        const startKey = `${start.x},${start.y}`;
        const targetKey = `${target.x},${target.y}`;
        expect(reverse.has(startKey), `${startKey} -> ${targetKey}`)
          .toBe(flood(g, [start]).has(targetKey));
      }
    }
  });
});

describe("conditional terrain validation", () => {
  it.each(["bramble_bush", "root_gap", "pit"] as TileKey[])("rejects conditional %s on Route 11", (tile) => {
    const world = structuredClone(WORLD);
    const map = world.maps.route_11;
    map.tiles[28] = "AAAAAAAAAAAAAggAAAAAAAAAAAAA";
    map.legend = { ...map.legend, g: "dirt" };
    map.legendWhen = [{ when: [{ flag: "rival_5_done", is: true }], legend: { g: tile } }];
    expect(validateWorld(world)).toContain(
      `[route_11] legendWhen must not introduce field-move or pit tiles (${tile})`,
    );
  });
});
