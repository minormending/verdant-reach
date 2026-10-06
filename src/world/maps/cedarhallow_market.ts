import type { MapDef } from "../../contracts";
import { LEGEND, say, type Scripts } from "../build";

export const cedarhallow_market: MapDef = {
  id: "cedarhallow_market", name: "MARKET", outdoor: false, music: "market",
  border: "void", legend: LEGEND,
  tiles: [
    "WWOOWWOOWW",
    "WKKKKKKKKW",
    "WwCwwwwwwW",
    "WwCwwDDwwW",
    "WwCwwDDwwW",
    "WpwwwwwwYW",
    "WpDwrrwwpW",
    "WWWWEWWWWW",
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "cedarhallow", toX: 26, toY: 17, facing: "down" }],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 1, y: 3, facing: "right", movement: "static", script: "ch5_market_clerk" },
    { id: "shopper", sprite: "villager_b", x: 7, y: 3, facing: "left", movement: "look_around", script: "ch5_market_shopper" },
  ],
  signs: [], triggers: [],
};
export const scripts: Scripts = {
  ch5_market_clerk: [say("TODO(text): ch5_market_clerk"), { op: "shop", stock: [
    "terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost", "neem_spray", "aloe_gel", "cloche",
  ] }],
  ch5_market_shopper: [say("TODO(text): ch5_market_shopper")],
};
