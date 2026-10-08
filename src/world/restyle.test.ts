import { afterEach, describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { STRUCTURES } from "../contracts";
import { WORLD } from "./index";
import { flood, grid, validateWorld, walkable } from "./validate";

const original = STRUCTURES.well;
const originalHouse = STRUCTURES.house_small;
afterEach(() => { STRUCTURES.well = original; STRUCTURES.house_small = originalHouse; });

// The sole path across the room runs through the image's top half.
const corridor: MapDef = {
  id: "route_1", name: "PROPS", outdoor: false, music: "route", border: "wall",
  tiles: ["#####", "#####", "#...#", "#####", "#####"],
  legend: { "#": "wall", ".": "floor_wood" },
  structures: [{ key: "well", x: 2, y: 2 }], warps: [], signs: [], npcs: [], triggers: [],
};
function problems(map = corridor) {
  const world = structuredClone(WORLD);
  world.maps.route_1 = map;
  world.newGame = { ...world.newGame, map: "route_1", x: 1, y: 2 };
  // Other maps' existing entrances are outside this synthetic room. These
  // tests inspect only its scenery and coverage diagnostics.
  return validateWorld(world).filter((p) => p.startsWith("[route_1]") && /scenery blocks|covers|stray @/.test(p));
}

describe("footprint-aware world validation", () => {
  it("can reach the far side by walking behind a plant's non-solid top half", () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 1, w: 1, h: 1 } };
    const g = grid(corridor);
    expect(g.structureSolid(2, 2)).toBe(false);
    expect(g.structureSolid(2, 3)).toBe(true);
    expect(flood(g, [{ x: 1, y: 2 }]).has("3,2")).toBe(true);
    expect(problems()).toEqual([]);
  });

  it("preserves a gap between two bottom-row supports", () => {
    STRUCTURES.well = { w: 3, h: 2, footprint: { x: 0, y: 1, w: 3, h: 1, columns: [0, 2] } };
    const g = grid({ ...corridor, structures: [{ key: "well", x: 1, y: 1 }] });
    expect(g.structureSolid(1, 2)).toBe(true);
    expect(g.structureSolid(2, 2)).toBe(false);
    expect(g.structureSolid(3, 2)).toBe(true);
  });

  it("accepts sign text on a footprint but rejects it on a canopy or footprint gap", () => {
    STRUCTURES.well = { w: 3, h: 2, footprint: { x: 0, y: 1, w: 3, h: 1, columns: [0, 2] } };
    const room: MapDef = { ...corridor, tiles: ["#####", "#...#", "#...#", "#...#", "#####"],
      structures: [{ key: "well", x: 1, y: 1 }], signs: [{ x: 1, y: 2, text: "Field notes." }] };
    const check = (x: number, y: number) => {
      const world = structuredClone(WORLD);
      world.maps.route_1 = { ...room, signs: [{ x, y, text: "Field notes." }] };
      return validateWorld(world).filter((p) => p.startsWith("[route_1] sign") && p.includes(" is on "));
    };
    expect(check(1, 2)).toEqual([]);
    expect(check(1, 1)).toEqual(["[route_1] sign at 1,1 is on floor_wood"]);
    expect(check(2, 2)).toEqual(["[route_1] sign at 2,2 is on floor_wood"]);
  });

  it("reports scenery blocking when the footprint itself cuts the only path", () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 0, w: 1, h: 1 } };
    expect(flood(grid(corridor), [{ x: 1, y: 2 }]).has("3,2")).toBe(false);
    expect(problems()).toContain("[route_1] scenery blocks the way from 1,2 to 3,2");
  });

  it("ignores floor props for both reachability and scenery-blocking checks", () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 0, w: 1, h: 2 }, layer: "floor" };
    const g = grid(corridor);
    expect(g.structureSolid(2, 2)).toBe(false);
    expect(walkable(g, 2, 2)).toBe(true);
    expect(flood(g, [{ x: 1, y: 2 }]).has("3,2")).toBe(true);
    expect(problems()).toEqual([]);
  });

  it("keeps door tiles walkable over non-walkable terrain, inside or outside the footprint", () => {
    for (const y of [1, 2]) {
      STRUCTURES.house_small = { ...originalHouse, footprint: { x: 0, y, w: 4, h: 1 } };
      const g = grid({ ...corridor, structures: [{ key: "house_small", x: 0, y: 0 }] });
      expect(g.doors).toContainEqual({ x: 1, y: 2, key: "house_small" });
      // Put the door on the existing wall to verify the runtime's door override.
      const wallDoor = grid({ ...corridor, structures: [{ key: "house_small", x: 0, y: 1 }] });
      expect(walkable(wallDoor, 1, 3)).toBe(true);
    }
  });

  it("allows props over ordinary terrain but retains legacy building @ coverage", () => {
    STRUCTURES.well = { w: 1, h: 2 };
    expect(problems().some((p) => p.includes("covers non-@"))).toBe(true);
    STRUCTURES.well = { ...STRUCTURES.well, footprint: { x: 0, y: 1, w: 1, h: 1 } };
    expect(problems()).toEqual([]);
  });
});
