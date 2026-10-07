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
    { id: "ranger", sprite: "ranger", x: 3, y: 4, facing: "down", movement: "static", script: "q_fire_followers" },
    { id: "resident", sprite: "villager_b", x: 6, y: 3, facing: "left", movement: "look_around", script: "ch5_house_resident" },
  ],
  signs: [], triggers: [],
};
export const scripts: Scripts = { ch5_house_resident: [
  say("The ranger's out at the BURNT STAND most mornings, with a notebook."),
  say("Says a forest needs a fire now and then, to stay young."),
] };
