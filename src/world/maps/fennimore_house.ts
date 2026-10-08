import type { MapDef } from "../../contracts";
import { LEGEND, type Scripts } from "../build";

// FENNIMORE's cottage: journals and seed packets against the back wall,
// a hearth, a reading rug, and the microscope and letter tables to the east.
// His position at 5,3 and the entry at 4,6 stay clear. The one-tile
// reading alcove at 7,1 keeps the fixed seed-packet sign at 8,1 accessible.
export const fennimore_house: MapDef = {
  id: "fennimore_house",
  name: "FENNIMORE's HOUSE",
  outdoor: false,
  music: "small_town",
  border: "void",
  legend: LEGEND,
  tiles: [
    "W¤¤¤¤¤¤¤¤W",
    "W¤¤¤¤¤¤w¤W",
    "WwwwwwwwwW",
    "WwwwwwwwwW",
    "WwwwwwwwwW",
    "WwwwwwwwwW",
    "WwwwwwwwwW",
    "WWWWEWWWWW",
  ],
  structures: [
    { key: "prop_bookcase", x: 1, y: 0 },
    { key: "prop_fireplace", x: 4, y: 0 },
    { key: "prop_sack", x: 8, y: 0 },
    { key: "prop_window", x: 6, y: 0 },
    { key: "prop_rug_large", x: 3, y: 3 },
    { key: "prop_table_small", x: 8, y: 2 },
    { key: "prop_table_small", x: 8, y: 3 },
    { key: "prop_chair", x: 2, y: 2 },
    { key: "prop_table_small", x: 1, y: 3 },
    { key: "prop_bed_single", x: 1, y: 4 },
    { key: "prop_bookcase", x: 7, y: 5 },
    { key: "prop_plant_small", x: 6, y: 6 },
  ],
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
