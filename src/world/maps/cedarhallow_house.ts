import type { MapDef } from "../../contracts";
import { LEGEND, say, type Scripts } from "../build";

export const cedarhallow_house: MapDef = {
  id: "cedarhallow_house", name: "RANGER'S HOUSE", outdoor: false, music: "herbarium",
  border: "void", legend: LEGEND,
  tiles: [
    "WWOOWWOOW",
    "WKKwwwKpW",
    "WwwwDwwwW",
    "WpwwDwwwW",
    "WwwwrwwwW",
    "WYwwrwwpW",
    "WwwwrwwwW",
    "WWWWEWWWW",
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "cedarhallow", toX: 6, toY: 8, facing: "down" }],
  npcs: [
    { id: "ranger", sprite: "hiker", x: 3, y: 4, facing: "down", movement: "static", script: "q_fire_followers" },
    { id: "resident", sprite: "villager_b", x: 6, y: 3, facing: "left", movement: "look_around", script: "ch5_house_resident" },
  ],
  signs: [], triggers: [],
};
export const scripts: Scripts = { ch5_house_resident: [say("TODO(text): ch5_house_resident")] };
