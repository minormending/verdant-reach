import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

export const council_hall: MapDef = {
  id: "council_hall", name: "COUNCIL HALL", outdoor: false, music: "herbarium",
  border: "void", legend: LEGEND,
  // A stub lobby (Chapter 11 seats the Council): a long rug to the Council
  // table, potted trees and windows on the north wall.
  tiles: [
    "WWWOOWWWWWWOOWWW",
    "WYiiiiDDDDiiiiYW",
    "WiiiiihiihiiiiiW",
    "WpiiiirrrriiiipW",
    "WiiiiirrrriiiiiW",
    "WYiiiirrrriiiiYW",
    "WiiiiirrrriiiiiW",
    "WpiiiirrrriiiipW",
    "WiiiiirrrriiiiiW",
    "WYiiiirrrriiiiYW",
    "WiiiiiirriiiiiiW",
    "WWWWWWWEWWWWWWWW",
  ],
  structures: [],
  warps: [{ x: 7, y: 11, to: "council_arboretum", toX: 15, toY: 14, facing: "down" }],
  npcs: [], signs: [], triggers: [],
};
