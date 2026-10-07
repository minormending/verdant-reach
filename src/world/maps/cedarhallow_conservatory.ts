import type { MapDef } from "../../contracts";
import { LEGEND, flag, ifFlags, say, when, type Scripts } from "../build";

// Three parallel stepping-root paths above solid pits. Lower halves a/b/c,
// upper halves d/e/f: only A ON + B ON completes the middle route. The levers
// stand on permanent floor in the entrance hall; nobody can change the floor
// from the paths or MORROW's platform, so every reachable state has a way out.
// The glasshouse is dark: slate flags under dark glazing, lit only by the lantern.
export const cedarhallow_conservatory: MapDef = {
  id: "cedarhallow_conservatory", name: "CONSERVATORY", outdoor: false, dark: true,
  music: "conservatory", border: "void",
  // The base grid is the union of the four states for structural validation.
  legend: { ...LEGEND, W: "glass_wall", g: "night_floor", a: "night_floor", b: "night_floor", c: "night_floor", d: "night_floor", e: "night_floor", f: "night_floor" },
  legendWhen: [
    { when: when({ cons4_lever_a: false, cons4_lever_b: false }), legend: { a: "night_floor", b: "void", c: "void", d: "void", e: "night_floor", f: "void" } },
    { when: when({ cons4_lever_a: false, cons4_lever_b: true }), legend: { a: "void", b: "void", c: "night_floor", d: "night_floor", e: "void", f: "void" } },
    { when: when({ cons4_lever_a: true, cons4_lever_b: false }), legend: { a: "void", b: "night_floor", c: "void", d: "void", e: "void", f: "night_floor" } },
    { when: when({ cons4_lever_a: true, cons4_lever_b: true }), legend: { a: "void", b: "night_floor", c: "void", d: "void", e: "night_floor", f: "void" } },
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
    { id: "morrow", sprite: "morrow", x: 7, y: 2, facing: "down", movement: "static", script: "morrow" },
    { id: "jr_nightshade", sprite: "night_gardener", x: 6, y: 7, facing: "right", trainer: "jr_nightshade", sight: 1 },
    { id: "jr_lantern", sprite: "night_gardener", x: 8, y: 10, facing: "left", trainer: "jr_lantern", sight: 1 },
    { id: "lever:cons4_lever_a", sprite: "lever", x: 2, y: 15, facing: "down", movement: "static", script: "cons4_lever_a" },
    { id: "lever:cons4_lever_b", sprite: "lever", x: 13, y: 15, facing: "down", movement: "static", script: "cons4_lever_b" },
  ],
  signs: [], triggers: [],
};
const lever = (id: string) => [
  say("A lever, furred with moss. Clunk! Out in the dark, pale lights shift."),
  ifFlags({ [id]: true }, [flag(id, false)], [flag(id)]),
];
export const scripts: Scripts = {
  cons4_lever_a: lever("cons4_lever_a"),
  cons4_lever_b: lever("cons4_lever_b"),
};
