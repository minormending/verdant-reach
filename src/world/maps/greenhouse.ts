import type { MapDef, MapId } from "../../contracts";
import { LEGEND, type Scripts } from "../build";

// The healing centre interior, shared by every town. The keeper stands behind
// the counter; the specimen cabinet (party/box storage) is in the corner.
export function greenhouseMap(
  id: MapId,
  name: string,
  exit: { to: MapId; x: number; y: number },
  visitor: { script: string; sprite: "villager_a" | "villager_b" | "elder" | "kid" | "hiker" | "florist" },
): MapDef {
  return {
    id,
    name,
    outdoor: false,
    music: "greenhouse",
    border: "void",
    legend: LEGEND,
    tiles: [
      "WWOOOOOOWW", // 0
      "WcggggggpW", // 1
      "WgPCCCCPgW", // 2
      "WggggggggW", // 3
      "WpggggggpW", // 4
      "WggggggggW", // 5
      "WPggrrggPW", // 6
      "WWWWEWWWWW", // 7
    ],
    structures: [],
    warps: [{ x: 4, y: 7, to: exit.to, toX: exit.x, toY: exit.y, facing: "down" }],
    npcs: [
      { id: "keeper", sprite: "greenhouse_keeper", x: 4, y: 1, facing: "down", movement: "static", script: "greenhouse_heal" },
      { id: "visitor", sprite: visitor.sprite, x: 7, y: 4, facing: "left", movement: "wander", script: visitor.script },
    ],
    signs: [],
    triggers: [],
    healPoint: { x: 4, y: 3 },
  };
}

export const bramblegate_greenhouse = greenhouseMap(
  "bramblegate_greenhouse", "GREENHOUSE", { to: "bramblegate", x: 20, y: 7 },
  { script: "bg_gh_visitor", sprite: "hiker" },
);
export const sugarbush_greenhouse = greenhouseMap(
  "sugarbush_greenhouse", "GREENHOUSE", { to: "sugarbush", x: 20, y: 16 },
  { script: "sb_gh_visitor", sprite: "villager_b" },
);

export const scripts: Scripts = {
  greenhouse_heal: [
    { op: "say", text: "Welcome to the GREENHOUSE! Water, light and warm soil for weary QUICKENED." },
    { op: "yesno", prompt: "Shall I tend to your QUICKENED?", yes: [
      { op: "say", text: "Into the light they go..." },
      { op: "heal" },
      { op: "say", text: "All watered and perked up! Come back any time." },
    ], no: [
      { op: "say", text: "Come back any time." },
    ] },
  ],
  bg_gh_visitor: [
    { op: "say", text: "That SPECIMEN CABINET in the corner? It stores the QUICKENED you can't carry." },
    { op: "say", text: "You can only carry six. The rest wait in soil and soft light." },
  ],
  sb_gh_visitor: [
    { op: "if", when: [{ flag: "grove_cleared", is: true }], then: [
      { op: "say", text: "My maple's leaves perked right up today. Did you do that? Thank you!" },
    ], else: [
      { op: "say", text: "I brought my maple sprout in. Its leaves went limp, like it had lost blood." },
    ] },
  ],
};
