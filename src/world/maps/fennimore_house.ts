import type { MapDef } from "../../contracts";
import { LEGEND, type Scripts } from "../build";

// OLD FENNIMORE's cottage: fifty years of botany in one room. Shelves of field
// notes, the hearth with his armchair and rug, a bench with the old microscope,
// more shelves, and pots on every free tile.
//
//            0123456789
export const fennimore_house: MapDef = {
  id: "fennimore_house",
  name: "FENNIMORE's HOUSE",
  outdoor: false,
  music: "small_town",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWWOOW", // 0
    "WKKKFKKwJW", // 1
    "WhwrrrwwQW", // 2
    "WDwrrrwwJW", // 3
    "WDhwwwwwwW", // 4
    "WKwwwwwwKW", // 5
    "WZDwwwwKKW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "hedgerow", toX: 13, toY: 8, facing: "down" }],
  npcs: [
    { id: "fennimore", sprite: "fennimore", x: 5, y: 3, facing: "down", movement: "static", script: "pg_fennimore" },
  ],
  signs: [
    { x: 1, y: 1, text: "FIELD NOTES, VOLS. 1 to 50. Volume 51 is still blank." },
    { x: 8, y: 2, text: "An old brass microscope. A label on it: \"NOT to be lent to IMOGEN.\"" },
    { x: 8, y: 1, text: "Seed packets, labelled in tiny writing. One empty packet just says \"ROLLS.\"" },
    { x: 8, y: 3, text: "A half-written letter, crossed out three times. \"IMOGEN, I think...\"" },
  ],
  triggers: [],
};

export const scripts: Scripts = {};
