import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

export const larchmere_conservatory: MapDef = {
  id: "larchmere_conservatory", name: "CONSERVATORY", outdoor: false, music: "conservatory", ambient: "none",
  border: "void", legend: LEGEND,
  tiles: [
    "WWWWWWWWWWWWWWWW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWWWWWWWgWW",
    "WWg{{{{{{{{{{gWW",
    "WWgWWWWWWWWWWWWW",
    "WWgWWWWWWWWWWWWW",
    "WWgWWWWWWWWWWWWW",
    "WWg{{{{{{{{{{gWW",
    "WWWWWWWWWWWWWgWW",
    "WWWWWWWWWWWWWgWW",
    "WWWWWWWWWWWWWgWW",
    "WWg{{{{{{{{{{gWW",
    "WWgWWWWWWWWWWWWW",
    "WWgWWWWWWWWWWWWW",
    "WggggggggggggggW",
    "WggggggggggggggW",
    "WWWWWWWEWWWWWWWW",
  ],
  structures: [],
  warps: [{ x: 7, y: 19, to: "larchmere", toX: 26, toY: 10, facing: "down" }],
  npcs: [
    { id: "signe", sprite: "nell_pitcher", x: 7, y: 2, facing: "down", script: "signe" },
    { id: "jr_flurry", sprite: "gardener", x: 4, y: 18, facing: "right", trainer: "jr_flurry", sight: 1 },
    { id: "jr_hoarfrost", sprite: "gardener", x: 11, y: 18, facing: "left", trainer: "jr_hoarfrost", sight: 1 },
  ], signs: [], triggers: [],
};
