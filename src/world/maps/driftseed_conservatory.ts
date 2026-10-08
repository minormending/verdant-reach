import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

// Each boulder has a right-hand storage pocket. The ledge below it prevents
// vertical pushes and lets players descend safely after clearing each step.
// Only the three horizontal pushes are possible; re-entry resets all stones.
export const driftseed_conservatory: MapDef = {
  id: "driftseed_conservatory", name: "CONSERVATORY", outdoor: false, music: "conservatory", ambient: "none",
  border: "void", legend: { ...LEGEND, g: "salt_flat", W: "volcanic_rock" },
  tiles: [
    "WWWWWWWWWWWWWWWW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWgWWWWWWWW",
    "WWWWWWgggWWWWWWW",
    "WWWWWWgvWWWWWWWW",
    "WWWWWWggWWWWWWWW",
    "WWWWWWWgWWWWWWWW",
    "WWWWWWgggWWWWWWW",
    "WWWWWWgvWWWWWWWW",
    "WWWWWWggWWWWWWWW",
    "WWWWWWWgWWWWWWWW",
    "WWWWWWgggWWWWWWW",
    "WWWWWWgvWWWWWWWW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWEWWWWWWWW",
  ],
  structures: [],
  warps: [{ x: 7, y: 17, to: "driftseed_isle", toX: 26, toY: 10, facing: "down" }],
  npcs: [
    { id: "saguaro", sprite: "brother_saguaro", x: 7, y: 2, facing: "down", script: "saguaro" },
    { id: "jr_spine", sprite: "gardener", x: 4, y: 15, facing: "right", trainer: "jr_spine", sight: 1 },
    { id: "jr_needle", sprite: "gardener", x: 11, y: 15, facing: "left", trainer: "jr_needle", sight: 1 },
    { id: "boulder_1", sprite: "boulder", x: 7, y: 12, facing: "down", pushable: true },
    { id: "boulder_2", sprite: "boulder", x: 7, y: 8, facing: "down", pushable: true },
    { id: "boulder_3", sprite: "boulder", x: 7, y: 4, facing: "down", pushable: true },
  ],
  signs: [], triggers: [],
};
