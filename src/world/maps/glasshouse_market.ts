import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// The GLASSHOUSE MARKET: the big shop, with two counters. West: pods and
// medicine. East: plant care. Shelves to the ceiling behind both, a display
// of GLASS PODS in the middle like a pyramid of soap bubbles.
export const glasshouse_market: MapDef = {
  id: "glasshouse_market",
  name: "GLASSHOUSE MARKET",
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
    { x: 6, y: 8, to: "glasshouse_city", toX: 33, toY: 15, facing: "down" },
    { x: 7, y: 8, to: "glasshouse_city", toX: 33, toY: 15, facing: "down" },
  ],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 2, y: 2, facing: "down", movement: "static", script: "gm_clerk_pods" },
    { id: "clerk_b", sprite: "shopkeeper", x: 11, y: 2, facing: "down", movement: "static", script: "gm_clerk_care" },
    { id: "shopper", sprite: "villager_b", x: 9, y: 5, facing: "left", movement: "look_around", script: "gm_shopper" },
    { id: "kid", sprite: "kid", x: 4, y: 6, facing: "up", movement: "wander", script: "gm_kid" },
  ],
  signs: [
    { x: 4, y: 2, text: "TERRARIUM PODS and GLASS PODS, stacked like teacups." },
    { x: 9, y: 2, text: "ALOE GEL in tubs. Aloe stores water in its thick, fleshy leaves." },
  ],
  triggers: [],
};

export const scripts: Scripts = {
  gm_clerk_pods: [
    say("Pods and medicine! Best glass in the REACH, blown right here in the city."),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
    say("Mind how you go!"),
  ],
  gm_clerk_care: [
    ifFlags({ beat_flora: true }, [
      say("Plant care! You beat FLORA? Don't tell her I sold you anything."),
    ], [
      say("Plant care! Sprays, feeds and covers. Everything a sprout could ask for."),
    ]),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche"] },
    say("A GLASS CLOCHE keeps the frost off. Gardeners have used them for centuries."),
  ],
  gm_shopper: [
    ifNight(
      [say("The market never closes. The dome keeps it warm enough to sleep in.")],
      [say("FLORA VANCE buys her ribbons here. A mile a week, they say.")],
    ),
  ],
  gm_kid: [
    say("Mum says I can have ONE pod. I'm going to catch something HUGE."),
  ],
};
