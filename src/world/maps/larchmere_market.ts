import type { MapDef } from "../../contracts";
import { marketInterior } from "./market";
import { LEGEND } from "../build";

// The MARKET: the big shop, with two counters. West: pods and
// medicine. East: plant care. Shelves to the ceiling behind both, a display
// of GLASS PODS in the middle like a pyramid of soap bubbles.
export const larchmere_market: MapDef = {
  id: "larchmere_market",
  name: "MARKET",
  outdoor: false,
  music: "market",
  border: "void",
  legend: LEGEND,
  ...marketInterior(true),
  warps: [
    { x: 6, y: 8, to: "larchmere", toX: 13, toY: 12, facing: "down" },
    { x: 7, y: 8, to: "larchmere", toX: 13, toY: 12, facing: "down" },
  ],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 2, y: 2, facing: "down", movement: "static", script: "ch7_market_pods" },
    { id: "clerk_b", sprite: "shopkeeper", x: 11, y: 2, facing: "down", movement: "static", script: "ch7_market_care" },
    { id: "trader", sprite: "villager_b", x: 9, y: 5, facing: "left", movement: "look_around", script: "ch7_market_visitor" },
    { id: "kid", sprite: "kid", x: 4, y: 6, facing: "up", movement: "wander", script: "ch7_market_kid" },
  ],
  signs: [
    { x: 4, y: 2, text: "TERRARIUM PODS and GLASS PODS, stacked like teacups." },
    { x: 9, y: 2, text: "ALOE GEL in tubs. Break an aloe leaf and the gel inside soothes burns." },
  ],
  triggers: [],
};
