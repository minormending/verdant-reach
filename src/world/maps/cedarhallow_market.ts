import type { MapDef } from "../../contracts";
import { marketInterior } from "./market";
import { LEGEND, say, type Scripts } from "../build";

export const cedarhallow_market: MapDef = {
  id: "cedarhallow_market", name: "MARKET", outdoor: false, music: "market",
  border: "void", legend: LEGEND,
  ...marketInterior(),
  warps: [{ x: 4, y: 7, to: "cedarhallow", toX: 26, toY: 17, facing: "down" }],
  npcs: [
    { id: "clerk", sprite: "shopkeeper", x: 1, y: 3, facing: "right", movement: "static", script: "ch5_market_clerk" },
    { id: "shopper", sprite: "villager_b", x: 7, y: 3, facing: "left", movement: "look_around", script: "ch5_market_shopper" },
  ],
  signs: [], triggers: [],
};
export const scripts: Scripts = {
  ch5_market_clerk: [say("Welcome in! Mind the floor. It's cedar. It creaks, but politely."), { op: "shop", stock: [
    "terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost", "neem_spray", "aloe_gel", "cloche",
  ] }],
  ch5_market_shopper: [say("Moss on the roof, moss on the step, moss in my boots. You get used to it.")],
};
