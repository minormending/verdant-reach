import type { MapDef } from "../../contracts";
import { LEGEND, ifNight, say, type Scripts } from "../build";

// A small shop: the clerk sits behind the counter on the left.
export const bramblegate_market: MapDef = {
  id: "bramblegate_market",
  name: "MARKET",
  outdoor: false,
  music: "market",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWOOWW", // 0
    "WwwKKKKKKW", // 1
    "WwCwwwwwwW", // 2
    "WwCwwDDwwW", // 3
    "WwCwwDDwwW", // 4
    "WpwwwwwwpW", // 5
    "WpwwrrwwKW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "bramblegate", toX: 6, toY: 14, facing: "down" }],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 1, y: 3, facing: "right", movement: "static", script: "market_clerk" },
    { id: "shopper", sprite: "villager_b", x: 7, y: 4, facing: "up", movement: "look_around", script: "market_shopper" },
  ],
  signs: [],
  triggers: [],
};

export const scripts: Scripts = {
  market_clerk: [
    say("Welcome to the MARKET! What can I get you?"),
    { op: "shop", stock: ["terrarium_pod", "water_flask", "neem_spray"] },
    say("Grow well!"),
  ],
  market_shopper: [
    ifNight(
      [say("NEEM SPRAY is pressed from neem seeds. Pests hate it. So do I, it stinks!")],
      [say("Running low on pods? A tired QUICKENED is likelier to root in one.")],
    ),
  ],
};
