import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

export const council_hall: MapDef = {
  id: "council_hall", name: "COUNCIL HALL", outdoor: false, music: "herbarium",
  border: "void", legend: LEGEND,
  tiles: [
    "WWWWWWWWWWWWWWWW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WWWWWWWEWWWWWWWW",
  ],
  structures: [],
  warps: [{ x: 7, y: 11, to: "council_arboretum", toX: 15, toY: 14, facing: "down" }],
  npcs: [], signs: [], triggers: [],
};
