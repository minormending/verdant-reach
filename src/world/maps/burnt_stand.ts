import type { MapDef } from "../../contracts";
import { OUTDOOR, pickups, when } from "../build";

// A scar of ash cuts east through standing snags and charred logs. Bright
// fireweed shoots push through the ash beside the lane; ROOTSTOCK has pitched
// a tent in the southern camp and stacks cone sacks round it. BRAM waits before
// the final turn into the burnt heart, a quiet eastern clearing.
export const burnt_stand: MapDef = {
  id: "burnt_stand", name: "BURNT STAND", outdoor: true, music: "burnt_stand",
  border: "burnt_trunk", ambient: "spores",
  legend: {
    ...OUTDOOR, T: "burnt_trunk", "+": "ash", ":": "ash", "@": "ash", ",": "fresh_shoots",
    "3": "charred_log", "4": "charred_log",
  },
  tiles: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 2
    "TT+++++++++++++++++++4++++++T++++T+++TTT", // 3
    "TT++,,,,,,,,++++++++++++T+++T++++++++TTT", // 4
    "TT+,,,,,,,,,,++++,,,,,,,,+++T++++4+T+TTT", // 5
    "TT+,,,,,,,,,,T++,,,,,,,,,,++T++T+++++TTT", // 6
    "TT+,,,,,,,,,,++3,,,,,,,,,,++T++++++++TTT", // 7
    "TT+,,3,,,,,,,+++,,,,,T,,,,++T+++:::::TTT", // 8
    "TT+,,,,,,,,,,+++,,,,,,,4,,++T+++:::::TTT", // 9
    "TT++,,,,,,,,+++++,,,,,,,,+++T+++:::::TTT", // 10
    "TT++++++++++++++++++++++++++T+++:::::TTT", // 11
    "TT++T+++T++++++++T+++++++++TT+++:::::TTT", // 12
    "TT++++++++++++T++++4++++++++T+++:::3:TTT", // 13
    "TT++++++++++++++++++++++++++T+++:::::TTT", // 14
    ":::::::::::::::::::::::::::::::::::::TTT", // 15
    ":::::::::::::::::::::::::::::::::::::TTT", // 16
    "TT+++4++++++++++++++++++++++T+++:::::TTT", // 17
    "TT++++++++@@@+++++++++++++++T+++4::::TTT", // 18
    "TTT+++++++@@@+++++++++++++++T+++::::3TTT", // 19
    "TT+++++++++++++++++T+++++,,,T,++:::::TTT", // 20
    "TT++++,,,,,,,,+++++++++++,,,T,++:::::TTT", // 21
    "TT+++,,,,,,,,,,++++++++++,,,T,+++4+++TTT", // 22
    "TT+++,,,,,,,,,,++++++++++,,,T,T++++++TTT", // 23
    "TTT++,,,,,,,,,,++++++++++,,,T,+++++++TTT", // 24
    "TT++T+,,,,,,,,+++++++++++,,,T,+++++++TTT", // 25
    "TT++++++++++++++++++++++3+++T++3+++++TTT", // 26
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 27
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 28
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 29
  ],
  structures: [{ key: "camp_tent", x: 10, y: 18 }],
  warps: [
    { x: 0, y: 15, to: "cedarhallow", toX: 34, toY: 17, facing: "left" },
    { x: 0, y: 16, to: "cedarhallow", toX: 34, toY: 18, facing: "left" },
  ],
  npcs: [
    { id: "grunt_bs_1", sprite: "grunt", x: 8, y: 18, facing: "up", trainer: "grunt_bs_1", sight: 3 },
    { id: "grunt_bs_2", sprite: "grunt", x: 15, y: 20, facing: "left", trainer: "grunt_bs_2", sight: 2 },
    { id: "grunt_bs_3", sprite: "grunt", x: 23, y: 14, facing: "down", trainer: "grunt_bs_3", sight: 2 },
    { id: "bram", sprite: "bram", x: 29, y: 15, facing: "left", movement: "static", script: "rival_4", visibleWhen: when({ rival_4_done: false }) },
    { id: "morrow_bs", sprite: "morrow", x: 34, y: 11, facing: "down", movement: "static", script: "ch5_morrow_burnt", visibleWhen: when({ burnt_vision_seen: true, morrow_returned: false }) },
    ...pickups([{ item: "ember_ash", x: 6, y: 11 }, { item: "ember_ash", x: 27, y: 25, n: 2 }]),
    // The cone sacks round the camp tent (ch5_grunts pans the camera to 11,19).
    { id: "cone_sack_1", sprite: "cone_sack", x: 9, y: 20, facing: "down", movement: "static", script: "ch5_grunts" },
    { id: "cone_sack_2", sprite: "cone_sack", x: 10, y: 20, facing: "down", movement: "static", script: "ch5_grunts" },
    { id: "cone_sack_3", sprite: "cone_sack", x: 13, y: 19, facing: "down", movement: "static", script: "ch5_grunts" },
  ],
  signs: [],
  triggers: [
    { x: 7, y: 15, w: 2, h: 2, script: "ch5_grunts", when: when({ ch5_grunts_seen: false }) },
    { x: 28, y: 15, h: 2, script: "rival_4", when: when({ rival_4_done: false }) },
    { x: 34, y: 15, w: 2, h: 2, script: "ch5_vision", when: when({ rival_4_done: true, burnt_vision_seen: false }) },
  ],
  encounters: { grass: { rate: 12, slots: [
    { species: "fireweed_fluff", minLevel: 18, maxLevel: 19, weight: 25 },
    { species: "lodgepole_cone", minLevel: 20, maxLevel: 24, weight: 35 },
    { species: "fireweed_shoot", minLevel: 20, maxLevel: 24, weight: 30 },
    { species: "stinging_nettle", minLevel: 20, maxLevel: 24, weight: 10 },
  ] } },
};
