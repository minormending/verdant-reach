import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const rootstock_hideout_1: MapDef = {
  id: "rootstock_hideout_1", name: "HIDEOUT B1", outdoor: false, music: "hideout", ambient: "none",
  border: "void",
  // Dark steel grate (t), riveted walls (W), server racks ([), cable runs (/) and consoles (x).
  legend: { ...LEGEND, W: "hideout_wall", t: "hideout_floor" },
  tiles: [
    "WWWWWWWWWWWWWWWWWWWWWWWW",
    "Wt[[[[t[[[tWWt[[[ttttt[W",
    "Wttttt/ttttWWttttttttu[W",
    "Wt[[tt/t[[tWWttttttttttW",
    "Wttttt/ttttWWttttttttttW",
    "WttttttttttWWt[[ttt[[ttW",
    "Wtttttttttttttttt/tttttW",
    "Wtttttttttttt/////tttttW",
    "WttttttttttWWttttttttttW",
    "WDtttttttttWWttttttttt[W",
    "WttttttttttWWttttttttt[W",
    "WWWWWttttWWWWWttttttWWWW",
    "Wttt////tttttttttttttttW",
    "W[ttttttttttt[[[[ttxDxtW",
    "W[tttttttttttttttttttttW",
    "WttttttttttttttttttttttW",
    "Wtttttttttttt[[[[ttttt[W",
    "WttttDtttttttttttttttt[W",
    "WtUttttttttttttttttttttW",
    "WWWWWWWWWWWWWWWWWWWWWWWW",
  ],
  legendWhen: [{ when: when({ emitters_off: false }), legend: { u: "hideout_wall" } }],
  structures: [],
  warps: [
    { x: 2, y: 18, to: "larchmere_lodge", toX: 10, toY: 3, facing: "down" },
    { x: 21, y: 2, to: "rootstock_hideout_2", toX: 2, toY: 13, facing: "up" },
  ],
  npcs: [
    { id: "emitter_1", stateFlag: "emitter_1_off", sprite: "lever", x: 6, y: 5, facing: "down", script: "ch7_emitter_1" },
    { id: "emitter_2", stateFlag: "emitter_2_off", sprite: "lever", x: 17, y: 8, facing: "down", script: "ch7_emitter_2" },
    { id: "emitter_3", stateFlag: "emitter_3_off", sprite: "lever", x: 8, y: 13, facing: "down", script: "ch7_emitter_3" },
    { id: "grunt_b1_1", sprite: "grunt", x: 6, y: 7, facing: "down", trainer: "grunt_b1_1", sight: 1 },
    { id: "grunt_b1_2", sprite: "grunt", x: 17, y: 10, facing: "down", trainer: "grunt_b1_2", sight: 1 },
    { id: "grunt_b1_3", sprite: "grunt", x: 8, y: 15, facing: "down", trainer: "grunt_b1_3", sight: 1 },
  ], signs: [], triggers: [],
};
