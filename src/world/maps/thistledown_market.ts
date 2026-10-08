import type { MapDef } from "../../contracts";
import { LEGEND } from "../build";

// The MARKET: the big shop, with two counters. West: pods and
// medicine. East: plant care. Shelves to the ceiling behind both, a display
// of GLASS PODS in the middle like a pyramid of soap bubbles.
export const thistledown_market: MapDef = {
  id: "thistledown_market",
  name: "MARKET",
  outdoor: false,
  music: "market",
  border: "void",
  legend: LEGEND,
  tiles: [
    // x: 0         1
    // x: 01234567890123
    "WWOOWWOOWWOOWW", // 0
    "WKKKKYwwYKKKKW", // 1 pods and flasks | seed packets and sprays
    "WwwwKwwwwKwwwW", // 2 clerks at 2,2 and 11,2
    "WCCCwwwwwwCCCW", // 3 two counters
    "WwwwwwDDwwwwwW", // 4 a display of glass pods
    "WwwwwwDDwwwwwW", // 5
    "WYwwwwwwwwwwpW", // 6
    "WpDhwwrrwwhDpW", // 7
    "WWWWWWEEWWWWWW", // 8
  ],
  structures: [],
  warps: [
    { x: 6, y: 8, to: "thistledown", toX: 21, toY: 11, facing: "down" },
    { x: 7, y: 8, to: "thistledown", toX: 21, toY: 11, facing: "down" },
  ],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 2, y: 2, facing: "down", movement: "static", script: "ch9_market_pods" },
    { id: "clerk_b", sprite: "shopkeeper", x: 11, y: 2, facing: "down", movement: "static", script: "ch9_market_care" },
    { id: "trader", sprite: "villager_b", x: 9, y: 5, facing: "left", movement: "look_around", script: "ch9_market_visitor" },
    { id: "kid", sprite: "kid", x: 4, y: 6, facing: "up", movement: "wander", script: "ch9_market_kid" },
  ],
  signs: [
    { x: 4, y: 2, text: "TERRARIUM PODS and GLASS PODS, stacked like teacups." },
    { x: 9, y: 2, text: "ALOE GEL in tubs. Aloe stores water in its thick, fleshy leaves." },
  ],
  triggers: [],
};
