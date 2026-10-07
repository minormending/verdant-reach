import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const saltmarsh_conservatory: MapDef = {
  id: "saltmarsh_conservatory", name: "CONSERVATORY", outdoor: false, music: "conservatory", ambient: "none",
  border: "void", legend: { ...LEGEND, g: "pier", W: "glass_wall", G: "water" },
  tiles: [
    "WWWWWWWWWWWWWWWW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWGWWWWWWWW",
    "W~~~~~~~~~~~~~~W",
    "W~~~~~~~~~~~~~~W",
    "W~~ggg~~~~~~~~~W",
    "W~~ggg~~~~~~~~~W",
    "W~~ggg~~~~~~~~~W",
    "W~~~~~~~~~ggg~~W",
    "W~~~~~~~~~ggg~~W",
    "W~~~~~~~~~ggg~~W",
    "W~~~~~~~~~~~~~~W",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWEWWWWWWWW",
  ],
  legendWhen: [
    { when: when({ cons5_gate: false }), legend: { G: "glass_wall" } },
    { when: when({ cons5_gate: true }), legend: { G: "water" } },
  ],
  structures: [],
  warps: [{ x: 7, y: 17, to: "saltmarsh_harbour", toX: 25, toY: 9, facing: "down" }],
  npcs: [
    { id: "reyes", sprite: "reyes", x: 7, y: 2, facing: "down", script: "reyes" },
    { id: "jr_tide", sprite: "gardener", x: 5, y: 7, facing: "down", trainer: "jr_tide", sight: 1 },
    { id: "jr_current", sprite: "gardener", x: 12, y: 10, facing: "down", trainer: "jr_current", sight: 1 },
    { id: "lever:cons5_gate", sprite: "lever", x: 4, y: 8, facing: "down", script: "cons5_gate" },
  ],
  signs: [], triggers: [],
};
