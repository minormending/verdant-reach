import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const council_hall: MapDef = {
  id: "council_hall", name: "COUNCIL HALL", outdoor: false, music: "herbarium",
  border: "void", legend: { ...LEGEND, N: "stairs_up" },
  tiles: [
    "WWWWWWWNWWWWWWWW",
    "WPPiiiiiiiiiKKKW",
    "WgggiiiiiiiwwwwW",
    "WCCCiiiiiiiCCCCW",
    "WiiiiiiiiiiiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WPiiiiiiiiiiiiPW",
    "WiiiiirrrriiiiiW",
    "WiiiiirrrriiiiiW",
    "WiiiiirrrriiiiiW",
    "WiiiiiiiiiiiiiiW",
    "WWWWWWWEWWWWWWWW",
  ],
  legendWhen: [{ when: when({ ch10_done: false }), legend: { N: "wall" } }],
  structures: [],
  warps: [
    { x: 7, y: 11, to: "council_arboretum", toX: 15, toY: 14, facing: "down" },
    { x: 7, y: 0, to: "council_1", toX: 5, toY: 10, facing: "up" },
  ],
  npcs: [
    { id: "rowan", sprite: "vale", x: 10, y: 7, facing: "down", script: "pg_wanderers",
      visibleWhen: when({ game_cleared: true }) },
    { id: "keeper", sprite: "greenhouse_keeper", x: 2, y: 2, facing: "down", script: "ch11_heal" },
    { id: "clerk", sprite: "shopkeeper", x: 13, y: 2, facing: "down", script: "ch11_market" },
  ],
  healPoint: { x: 2, y: 4 },
  signs: [], triggers: [],
};
