import type { MapDef } from "../../contracts";
import { LEGEND, type Scripts } from "../build";

// Conservatory 1: HOLLIS's hedge maze. Two junior gardeners watch the lanes;
// HOLLIS waits in the planted hall at the top.
export const bramblegate_conservatory: MapDef = {
  id: "bramblegate_conservatory",
  name: "BRAMBLEGATE CONSERVATORY",
  outdoor: false,
  music: "conservatory",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WOOOOOOOOOOOOW", // 0
    "WPPPPpPPpPPPPW", // 1
    "WHggggggggggHW", // 2
    "WHHHHHHHHgHHHW", // 3
    "WHggggggggHHHW", // 4
    "WHgHHHHHgggHHW", // 5
    "WHgHHHHHPgPHHW", // 6
    "WHggggggggggHW", // 7
    "WHHHHggHHHHgHW", // 8
    "WHHHHPPHHHHgHW", // 9
    "WHggggggggggHW", // 10
    "WHgHHHHHHHHHHW", // 11
    "WHgHPPgHHPPPHW", // 12
    "WHggggggggggHW", // 13
    "WHHHHHggHHHHHW", // 14
    "WWWWWWWEWWWWWW", // 15
  ],
  structures: [],
  warps: [{ x: 7, y: 15, to: "bramblegate", toX: 7, toY: 7, facing: "down" }],
  npcs: [
    { id: "hollis", sprite: "hollis", x: 6, y: 2, facing: "down", movement: "static", script: "hollis" },
    { id: "hazel", sprite: "gardener", x: 6, y: 12, facing: "down", trainer: "jr_hazel", sight: 2 },
    { id: "linden", sprite: "gardener", x: 5, y: 8, facing: "up", trainer: "jr_linden", sight: 2 },
    { id: "guide", sprite: "villager_b", x: 6, y: 14, facing: "up", movement: "static", script: "bgc_guide" },
  ],
  signs: [],
  triggers: [],
};

export const scripts: Scripts = {
  bgc_guide: [
    { op: "say", text: "Welcome, challenger! HOLLIS waits at the top of his hedge maze." },
    { op: "say", text: "His QUICKENED are WOOD types. Tough, patient, and they hit back." },
    { op: "say", text: "Bring WATER FLASKS. And maybe a little fire." },
  ],
};
