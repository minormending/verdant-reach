import type { MapDef } from "../../contracts";
import { OUTDOOR, when } from "../build";

export const elder_grove_heart: MapDef = {
  id: "elder_grove_heart", name: "THE HEART", outdoor: true, music: "rootstock_appears",
  musicWhen: [{ when: when({ beat_mercer: true }), music: "prologue_bloom" }],
  border: "aspen_tree",
  // The Elder's roots run under its trunk ('@'), so every spoke joins it.
  legend: { ...OUTDOOR, T: "aspen_tree", ".": "grove_floor", ":": "root_vein", "@": "root_vein" },
  tiles: [
    "TTTTTTTTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTTTTTTT",
    "TTTTTT.TTTTTT.TTTTTT",
    "TTTT...TTTTTT...TTTT",
    "TTT.:..TTTTTT..:.TTT",
    "TTT.::........::.TTT",
    "TT...:..@@@@..:...TT",
    "TT...:..@@@@..:...TT",
    "T:::::::@@@@:::::::T",
    "T......:@@@@:......T",
    "T......:.::.:......T",
    "T.....::..:.::.....T",
    "T.....:...:..:.....T",
    "TT...::...:..::...TT",
    "TT..::....:...::..TT",
    "TTT.:.....:....:.TTT",
    "TTTT......:.....TTTT",
    "TTTTTT....:...TTTTTT",
    "TTTTTTTTT.:TTTTTTTTT",
    "TTTTTTTTTT:TTTTTTTTT",
  ],
  structures: [{ key: "elder_trunk", x: 8, y: 6 }],
  warps: [{ x: 10, y: 19, to: "elder_grove_3", toX: 13, toY: 1, facing: "down" }],
  npcs: [
    { id: "mercer", sprite: "gentleman", x: 10, y: 11, facing: "down", script: "mercer", visibleWhen: when({ centuryheart_planted: false }) },
    { id: "rowan", sprite: "vale", x: 4, y: 8, facing: "right", script: "ch10_rowan", visibleWhen: when({ centuryheart_planted: false }) },
    { id: "grunt_heart_1", sprite: "grunt", x: 3, y: 8, facing: "right", trainer: "grunt_heart_1", sight: 1, visibleWhen: when({ centuryheart_planted: false }) },
    { id: "grunt_heart_2", sprite: "grunt", x: 4, y: 6, facing: "down", trainer: "grunt_heart_2", sight: 1, visibleWhen: when({ centuryheart_planted: false }) },
    { id: "the_elder", sprite: "potted_plant", x: 9, y: 10, facing: "down", script: "ch10_elder", visibleWhen: when({ centuryheart_planted: true, elder_caught: false }) },
  ],
  signs: [], triggers: [],
};
