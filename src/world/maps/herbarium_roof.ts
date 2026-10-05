import type { MapDef } from "../../contracts";
import { LEGEND, say, when, type Scripts } from "../build";

// The observation deck on the Herbarium roof. Past the railing the valley
// falls away: fields, the river, and the far slope where the CENTURYHEART stands.
export const herbarium_roof: MapDef = {
  id: "herbarium_roof",
  name: "OBSERVATION DECK",
  outdoor: true,
  music: "prologue_bloom",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTooTTTTT", // 0
    "TTT..oo..TTT", // 1
    "T*..~~~~..*T", // 2
    "~~~~~..~~~~~", // 3
    "T..*....*..T", // 4
    "############", // 5
    "#pwwwwwwwwp#", // 6
    "#wwwwwwwwww#", // 7
    "#wwwwwwwwww#", // 8
    "#pwwwwwwwuw#", // 9
    "#ppwwwwwwwp#", // 10
    "############", // 11
  ],
  structures: [],
  warps: [{ x: 9, y: 9, to: "herbarium", toX: 2, toY: 1, facing: "down" }],
  npcs: [
    { id: "vale", sprite: "vale", x: 6, y: 6, facing: "up", movement: "static", script: "roof_vale",
      visibleWhen: when({ prologue_done: false }) },
  ],
  signs: [],
  triggers: [],
};

export const scripts: Scripts = {
  roof_vale: [say("Look! Up on the far slope!", "VALE")],
};
