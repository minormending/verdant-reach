import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

export const thistledown_house: MapDef = {
  id: "thistledown_house", name: "HOUSE", outdoor: false, music: "herbarium",
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
  warps: [{ x: 4, y: 7, to: "thistledown", toX: 5, toY: 6, facing: "down" }],
  npcs: [
    { id: "stone_botanist", sprite: "researcher", x: 3, y: 4, facing: "down", movement: "static", script: "q_window_panes" },
    { id: "resident", sprite: "villager_b", x: 6, y: 3, facing: "left", movement: "look_around", script: "ch9_house_resident" },
  ],
  signs: [], triggers: [],
};
