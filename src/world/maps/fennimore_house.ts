import type { MapDef } from "../../contracts";
import { LEGEND, type Scripts } from "../build";

// OLD FENNIMORE's study: shelves of notebooks, potted curiosities.
export const fennimore_house: MapDef = {
  id: "fennimore_house",
  name: "FENNIMORE's HOUSE",
  outdoor: false,
  music: "small_town",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWWOOWWOOW", // 0
    "WKKKwwppKW", // 1
    "WwwwwwwwwW", // 2
    "WwDDwwwppW", // 3
    "WwDDwwwwwW", // 4
    "WwwwwwwwwW", // 5
    "WpwwrrwwpW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "hedgerow", toX: 12, toY: 6, facing: "down" }],
  npcs: [
    { id: "fennimore", sprite: "fennimore", x: 5, y: 3, facing: "down", movement: "static", script: "fennimore" },
  ],
  signs: [],
  triggers: [],
};

export const scripts: Scripts = {};
