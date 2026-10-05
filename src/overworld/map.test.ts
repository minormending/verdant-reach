import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { buildMap, checkCond, inSight, isMatWarp, isWalkable, tileAt, triggerAt, tryMove, warpAt } from "./map";

const def: MapDef = {
  id: "route_2",
  name: "TEST",
  outdoor: true,
  music: "route",
  tiles: [
    "TTTTTTTT",
    "T......T",
    "T.vvv..T",
    "T......T",
    "T.~~.v.T",
    "T....T.T",
    "T......T",
    "TTTTTTTT",
  ],
  legend: { T: "tree", ".": "grass", v: "ledge_down", "~": "water" },
  border: "tree",
  structures: [{ key: "house_small", x: 5, y: 1 }], // 4x3 at (5..8, 1..3), door (6,3)
  warps: [{ x: 6, y: 3, to: "bramblegate", toX: 1, toY: 1 }],
  npcs: [],
  signs: [],
  triggers: [{ x: 1, y: 6, w: 2, script: "t", when: [{ flag: "done", is: false }] }],
};

describe("map rules", () => {
  const m = buildMap(def);

  it("reads tiles and uses the border beyond the edges", () => {
    expect(tileAt(m, 1, 1)).toBe("grass");
    expect(tileAt(m, 2, 2)).toBe("ledge_down");
    expect(tileAt(m, -1, 3)).toBe("tree");
    expect(tileAt(m, 99, 99)).toBe("tree");
  });

  it("blocks walls, water and map edges", () => {
    expect(tryMove(m, 1, 1, "up")).toEqual({ kind: "blocked", reason: "wall" });
    expect(tryMove(m, 1, 4, "right")).toEqual({ kind: "blocked", reason: "wall" }); // water
    expect(tryMove(m, 1, 3, "right")).toEqual({ kind: "walk", x: 2, y: 3 });
    const edge = buildMap({ ...def, tiles: ["..", ".."], structures: [], legend: { ".": "grass" } });
    expect(tryMove(edge, 0, 0, "left")).toEqual({ kind: "blocked", reason: "edge" });
  });

  it("makes structure footprints solid except the door", () => {
    expect(isWalkable(m, 5, 1)).toBe(false);
    expect(isWalkable(m, 6, 2)).toBe(false);
    expect(isWalkable(m, 6, 3)).toBe(true); // door
    expect(tryMove(m, 6, 4, "up")).toEqual({ kind: "walk", x: 6, y: 3 });
    expect(warpAt(m, 6, 3)?.to).toBe("bramblegate");
  });

  it("hops ledges southward only, onto a free walkable tile", () => {
    expect(tryMove(m, 2, 1, "down")).toEqual({ kind: "ledge", x: 2, y: 3 });
    expect(tryMove(m, 2, 3, "up")).toEqual({ kind: "blocked", reason: "ledge" });
    expect(tryMove(m, 1, 2, "right")).toEqual({ kind: "blocked", reason: "ledge" });
    // landing tile occupied
    expect(tryMove(m, 3, 1, "down", (x, y) => x === 3 && y === 3)).toEqual({ kind: "blocked", reason: "occupied" });
    // landing tile solid (tree below the ledge at 5,4)
    expect(tryMove(m, 5, 3, "down")).toEqual({ kind: "blocked", reason: "wall" });
  });

  it("treats other characters as obstacles", () => {
    expect(tryMove(m, 1, 1, "right", (x, y) => x === 2 && y === 1)).toEqual({ kind: "blocked", reason: "occupied" });
  });

  it("evaluates conditions and triggers", () => {
    expect(checkCond(undefined, {})).toBe(true);
    expect(checkCond([{ flag: "a", is: false }], {})).toBe(true);
    expect(checkCond([{ flag: "a", is: true }, { flag: "b", is: false }], { a: true })).toBe(true);
    expect(checkCond([{ flag: "a", is: true }], {})).toBe(false);
    expect(triggerAt(m, 2, 6, {})?.script).toBe("t");
    expect(triggerAt(m, 2, 6, { done: true })).toBeUndefined();
    expect(triggerAt(m, 3, 6, {})).toBeUndefined();
  });

  it("finds trainers' line of sight, blocked by walls and people", () => {
    const target = { x: 1, y: 6 };
    expect(inSight(m, 1, 1, "down", 6, target, () => false)).toBe(5);
    expect(inSight(m, 1, 1, "down", 4, target, () => false)).toBe(0); // too far
    expect(inSight(m, 1, 3, "down", 4, target, (x, y) => x === 1 && y === 5)).toBe(0);
    expect(inSight(m, 1, 3, "right", 4, target, () => false)).toBe(0);
  });

  it("recognises exit mats", () => {
    const room = buildMap({ ...def, tiles: ["..", "MM"], legend: { ".": "floor_wood", M: "mat_exit" }, structures: [] });
    expect(isMatWarp(room, 0, 1)).toBe(true);
    expect(isMatWarp(room, 0, 0)).toBe(false);
  });

  it("lets a two-tile exit mat share one warp", () => {
    const room = buildMap({
      ...def, tiles: ["....", ".MM.", "...."], legend: { ".": "floor_wood", M: "mat_exit" }, structures: [],
      warps: [{ x: 1, y: 1, to: "fallowfield", toX: 4, toY: 6 }],
    });
    expect(warpAt(room, 2, 1)?.to).toBe("fallowfield");
    expect(warpAt(room, 3, 1)).toBeUndefined(); // floor, not mat
    expect(warpAt(room, 2, 0)).toBeUndefined();
  });
});
