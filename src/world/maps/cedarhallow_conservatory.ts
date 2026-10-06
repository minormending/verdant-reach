import type { MapDef } from "../../contracts";
import { LEGEND, flag, ifFlags, say, when, type Scripts } from "../build";

// Three parallel stepping-root paths above solid pits. Lower halves a/b/c,
// upper halves d/e/f: only A ON + B ON completes the middle route. The levers
// stand on permanent floor in the entrance hall; nobody can change the floor
// from the paths or MORROW's platform, so every reachable state has a way out.
export const cedarhallow_conservatory: MapDef = {
  id: "cedarhallow_conservatory", name: "CONSERVATORY", outdoor: false, dark: true,
  music: "conservatory", border: "void",
  // The base grid is the union of the four states for structural validation.
  legend: { ...LEGEND, a: "floor_greenhouse", b: "floor_greenhouse", c: "floor_greenhouse", d: "floor_greenhouse", e: "floor_greenhouse", f: "floor_greenhouse" },
  legendWhen: [
    { when: when({ cons4_lever_a: false, cons4_lever_b: false }), legend: { a: "floor_greenhouse", b: "void", c: "void", d: "void", e: "floor_greenhouse", f: "void" } },
    { when: when({ cons4_lever_a: false, cons4_lever_b: true }), legend: { a: "void", b: "void", c: "floor_greenhouse", d: "floor_greenhouse", e: "void", f: "void" } },
    { when: when({ cons4_lever_a: true, cons4_lever_b: false }), legend: { a: "void", b: "floor_greenhouse", c: "void", d: "void", e: "void", f: "floor_greenhouse" } },
    { when: when({ cons4_lever_a: true, cons4_lever_b: true }), legend: { a: "void", b: "floor_greenhouse", c: "void", d: "void", e: "floor_greenhouse", f: "void" } },
  ],
  tiles: [
    "WWWWWWWWWWWWWWWW", // 0
    "WggggggggggggggW", // 1
    "WggggggggggggggW", // 2
    "WggggggggggggggW", // 3
    "W__d___e____f__W", // 4
    "W__d___e____f__W", // 5
    "W__d___e____f__W", // 6
    "W__d__ge____f__W", // 7
    "W__d___e____f__W", // 8
    "W__a___b____c__W", // 9
    "W__a___bg___c__W", // 10
    "W__a___b____c__W", // 11
    "W__a___b____c__W", // 12
    "W__a___b____c__W", // 13
    "WggggggggggggggW", // 14
    "WggggggggggggggW", // 15
    "WggggggggggggggW", // 16
    "WWWWWWWEWWWWWWWW", // 17
  ],
  structures: [],
  warps: [{ x: 7, y: 17, to: "cedarhallow", toX: 18, toY: 8, facing: "down" }],
  npcs: [
    { id: "morrow", sprite: "elder", x: 7, y: 2, facing: "down", movement: "static", script: "morrow" },
    { id: "jr_nightshade", sprite: "gardener", x: 6, y: 7, facing: "right", trainer: "jr_nightshade", sight: 1 },
    { id: "jr_lantern", sprite: "gardener", x: 8, y: 10, facing: "left", trainer: "jr_lantern", sight: 1 },
    { id: "lever:cons4_lever_a", sprite: "lever", x: 2, y: 15, facing: "down", movement: "static", script: "cons4_lever_a" },
    { id: "lever:cons4_lever_b", sprite: "lever", x: 13, y: 15, facing: "down", movement: "static", script: "cons4_lever_b" },
  ],
  signs: [], triggers: [],
};
const lever = (id: string) => [
  say(`TODO(text): ${id}`),
  ifFlags({ [id]: true }, [flag(id, false)], [flag(id)]),
];
export const scripts: Scripts = {
  cons4_lever_a: lever("cons4_lever_a"),
  cons4_lever_b: lever("cons4_lever_b"),
};
