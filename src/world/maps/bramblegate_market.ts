import type { MapDef } from "../../contracts";
import { marketInterior } from "./market";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// The MARKET: a narrow brick shop. The clerk sits behind the counter on the
// left; shelves of pods and flasks line the back wall, a sample table stands
// by the door, and a display table holds today's specials.
export const bramblegate_market: MapDef = {
  id: "bramblegate_market",
  name: "MARKET",
  outdoor: false,
  music: "market",
  border: "void",
  legend: LEGEND,
  ...marketInterior(),
  warps: [{ x: 4, y: 7, to: "bramblegate", toX: 4, toY: 14, facing: "down" }],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 1, y: 3, facing: "right", movement: "static", script: "market_clerk" },
    { id: "shopper", sprite: "villager_b", x: 7, y: 3, facing: "left", movement: "look_around", script: "market_shopper" },
  ],
  signs: [
    { x: 3, y: 1, text: "TERRARIUM PODS, nested inside each other like teacups." },
    { x: 6, y: 1, text: "A notice: \"No WILD BERRIES or ROSE HIPS sold here. Find a bush and pick your own!\"" },
    { x: 8, y: 1, text: "NEEM SPRAY, in brown bottles. Even through the glass, it smells of garlic." },
  ],
  triggers: [],
};

export const scripts: Scripts = {
  market_clerk: [
    ifFlags({ beat_hollis: true }, [
      say("A PRESSED MARK customer! Same prices, mind. What'll it be?"),
    ], [
      say("Welcome to the MARKET! What can I get you?"),
    ]),
    { op: "shop", stock: ["terrarium_pod", "water_flask", "neem_spray"] },
    say("Grow well!"),
  ],
  market_shopper: [
    ifNight(
      [say("NEEM SPRAY is pressed from neem seeds. Pests hate it. So do I. It stinks!")],
      [say("Running low on pods? A tired QUICKENED is likelier to root in one.")],
    ),
  ],
};
