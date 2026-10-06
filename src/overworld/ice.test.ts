import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { buildMap, refreshLegend } from "./map";
import { reachableIceStops, slidePath, solveIcePuzzle } from "./ice";

function iceRoom(tiles: string[]): MapDef {
  return {
    id: "route_1", name: "ICE TEST", outdoor: true, music: "route", border: "wall",
    tiles, legend: { "#": "wall", ".": "floor_tile", I: "ice", S: "snow" },
    structures: [], warps: [], npcs: [], signs: [], triggers: [],
  };
}

describe("ICE movement", () => {
  it("lands on the non-ice stop tile and leaves the map intact", () => {
    const map = buildMap(iceRoom([".IIS."]));
    const before = structuredClone(map);
    expect(slidePath(map, 0, 0, "right")).toEqual([
      { kind: "walk", x: 1, y: 0 }, { kind: "walk", x: 2, y: 0 }, { kind: "walk", x: 3, y: 0 },
    ]);
    expect(map).toEqual(before);
    expect(slidePath(map, 3, 0, "right")).toEqual([{ kind: "walk", x: 4, y: 0 }]);
  });

  it("stops on the last ice before walls, edges, NPCs and structures", () => {
    const map = buildMap(iceRoom([".III#"]));
    expect(slidePath(map, 0, 0, "right").at(-1)).toMatchObject({ x: 3, y: 0 });
    expect(slidePath(map, 0, 0, "left")).toEqual([]);
    expect(slidePath(map, 0, 0, "right", (x) => x === 2).at(-1)).toMatchObject({ x: 1, y: 0 });
    expect(slidePath(map, 0, 0, "right", (x) => x === 1)).toEqual([]);
    map.solid.add("2,0");
    expect(slidePath(map, 0, 0, "right").at(-1)).toMatchObject({ x: 1, y: 0 });
    expect(slidePath(buildMap(iceRoom([".III"])), 0, 0, "right").at(-1)).toMatchObject({ x: 3, y: 0 });
  });

  it("uses resolved legends and slides in every direction", () => {
    const def = iceRoom(["##.##", "##I##", ".III.", "##I##", "##.##"]);
    const map = buildMap(def);
    for (const [dir, goal] of [["up", { x: 2, y: 0 }], ["down", { x: 2, y: 4 }],
      ["left", { x: 0, y: 2 }], ["right", { x: 4, y: 2 }]] as const) {
      expect(slidePath(map, 2, 2, dir).at(-1)).toMatchObject(goal);
    }
    def.legendWhen = [{ when: [{ flag: "thawed", is: true }], legend: { I: "floor_tile" } }];
    refreshLegend(map, { thawed: true });
    expect(slidePath(map, 0, 2, "right")).toHaveLength(1);
  });
});

describe("ICE puzzle BFS", () => {
  it.each([
    { tiles: ["######", "#.IIS#", "######"], goal: { x: 4, y: 1 }, solves: true },
    { tiles: ["#######", "#.IIII#", "#####I#", "#####.#", "#######"], goal: { x: 5, y: 3 }, solves: true },
    { tiles: ["#######", "#.IIII#", "###.###", "#######"], goal: { x: 3, y: 2 }, solves: false },
  ])("solves=$solves for fixture $tiles", ({ tiles, goal, solves }) => {
    expect(solveIcePuzzle(buildMap(iceRoom(tiles)), { x: 1, y: 1 }, goal)).toBe(solves);
  });

  it("cannot turn mid-slide, but an NPC creates a new stop", () => {
    const def = iceRoom(["#######", "#.IIII#", "###.###", "#######"]);
    expect(reachableIceStops(buildMap(def), { x: 1, y: 1 }).has("3,1")).toBe(false);
    def.npcs = [{ id: "blocker", sprite: "hiker", x: 4, y: 1, facing: "left" }];
    expect(solveIcePuzzle(buildMap(def), { x: 1, y: 1 }, { x: 3, y: 2 })).toBe(true);
    expect(solveIcePuzzle(buildMap(def), { x: 1, y: 1 }, { x: 4, y: 1 })).toBe(false);
  });
});
