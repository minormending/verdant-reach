import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, say, when, type Scripts } from "../build";

// The observation deck on the Herbarium roof. Past the railing the valley
// falls away: the river and its footbridge, a path climbing the crags of the far
// slope, and on the summit the CENTURYHEART's flower spike, a gold column in the
// dark forest. One straight line runs from the deck (where VALE stands, x=6) over
// the bridge and up the path to the spike, so the eye goes where she points.
// The prologue pans the camera to 6,3 (centred there, the spike, the crags and
// the river all sit above the text box).
//
//            000000000011
//            012345678901
export const herbarium_roof: MapDef = {
  id: "herbarium_roof",
  name: "OBSERVATION DECK",
  outdoor: true,
  music: "prologue_bloom",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    "TTTTTTyTTTTT", // 0  the spike's tip
    "TTTTTAyATTTT", // 1
    "TTTTAAyAATTT", // 2  the summit crags
    "TTTAAA:AAATT", // 3  the path up the far slope
    "q~~~~~2~~~~q", // 4  the river and its footbridge
    "############", // 5  railing
    "#PwwwwwwwwP#", // 6  new game: <PLAYER> 5,6 beside VALE 6,6
    "#Pwwwwwwwwh#", // 7
    "#hwwwwwwwwP#", // 8
    "#PwwwwwwwwP#", // 9
    "#PPwwwwwwwu#", // 10
    "############", // 11
  ],
  structures: [],
  warps: [{ x: 10, y: 10, to: "herbarium", toX: 2, toY: 1, facing: "down" }],
  npcs: [
    { id: "vale", sprite: "vale", x: 6, y: 6, facing: "up", movement: "static", script: "roof_vale",
      visibleWhen: when({ prologue_done: false }) },
    { id: "stargazer", sprite: "birdwatcher", x: 3, y: 6, facing: "up", movement: "static", script: "roof_stargazer",
      visibleWhen: when({ got_starter: true }) },
  ],
  signs: [
  ],
  triggers: [],
};

export const scripts: Scripts = {
  roof_vale: [say("Look! Up on the far slope!", "VALE")],
  roof_stargazer: [
    ifNight(
      [say("No moon tonight. You can still see the spike up there, glowing faintly.")],
      [say("See the spike on the far slope? It's already browning at the tips.")],
    ),
    ifFlags({ got_pods: true }, [
      say("A plant that flowers once gives that bloom everything. Then it rests for good."),
    ], [
      say("They say it hums. I've only ever heard the wind."),
    ]),
  ],
};
