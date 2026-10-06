import type { MapDef } from "../../contracts";
import { OUTDOOR, say, type Scripts } from "../build";

// The canopy walk is the only crossing between two broad clearings: weathered
// boards high in the old growth, roped on both sides over a misty drop, with a
// lookout spur. A winding trail threads each clearing past fern beds; a giant
// cedar marks the north one, and a skunk-cabbage bog sits in the south.
export const route_6: MapDef = {
  id: "route_6", name: "ROUTE 6", outdoor: true, music: "route",
  border: "oldgrowth_tree", ambient: "mist",
  legend: {
    ...OUTDOOR, T: "oldgrowth_tree", ".": "moss", "@": "moss", ",": "fern_brush",
    "=": "canopy_boardwalk", "~": "canopy_drop", "|": "rope_rail",
  },
  tiles: [
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 1
    "TTTTTTTTTTTTT::TTTTTTTTTTTTTTT", // 2
    "TTTTTTTTTTTT::TTTTTTTTTTTTTTTT", // 3
    "TTTTTTTTTTTT::TTTTTTTTTTTTTTTT", // 4
    "TTTTTTTTTTTTT::TTTTTTTTTTTTTTT", // 5
    "TTTTTTTTTT....::.TTTTTTTTTTTTT", // 6
    "TTTTTT.........::....TTTTTTTTT", // 7
    "TTTTT...........::.......TTTTT", // 8
    "TTTT..,,,,,......::...@@@..TTT", // 9
    "TTTT.,,,,,,,......:...@@@...TT", // 10
    "TTT..,,,,,,,,.....::..@@@...TT", // 11
    "TTT...,,,,,,......:...@@@....T", // 12
    "TTTT...,,,,......::.,,,......T", // 13
    "TTTT............::.,,,,,,...TT", // 14
    "TTTTT..........::.,,,,,,,..TTT", // 15
    "TTTTTT........::...,,,,,..TTTT", // 16
    "TTTTTTT......::.........TTTTTT", // 17
    "TTTTTTTTT....::......TTTTTTTTT", // 18
    "TTTTTTTTTTTTTS==TTTTTTTTTTTTTT", // 19
    "TTTTTTTTTTTTTT==TTTTTTTTTTTTTT", // 20
    "TTTTTTTTTTT~~|==|~~TTTTTTTTTTT", // 21
    "TTTTTTTTT~~~~|==|~~~~~TTTTTTTT", // 22
    "TTTTTTTT~~~~~|==|~~~~~~TTTTTTT", // 23
    "TTTTTTT~~~~~~|==|~~~~~~~TTTTTT", // 24
    "TTTTTTT~~~~~~|==|~~~~~~~TTTTTT", // 25
    "TTTTTTTT~~~~~|==|~~~~~~TTTTTTT", // 26
    "TTTTTTTTT~~~~|==|~~~~~~TTTTTTT", // 27
    "TTTTTTTTTT~~~|==|~~~~~TTTTTTTT", // 28
    "TTTTTTTTTT~~~|==|~~~~~TTTTTTTT", // 29
    "TTTTTTTTT~~~~|==|~~~~~~TTTTTTT", // 30
    "TTTTTTTT~~~~~|==|~~~~~~~TTTTTT", // 31
    "TTTTTTTT~~~~~|==|~~~~~~~~TTTTT", // 32
    "TTTTTTTTT~~~~|==|||||~~~~TTTTT", // 33
    "TTTTTTTTT~~~~|=====|~~~~~TTTTT", // 34
    "TTTTTTTTT~~~~|=====|~~~~TTTTTT", // 35
    "TTTTTTTTTT~~~|==||||~~~~TTTTTT", // 36
    "TTTTTTTTTT~~~|==|~~~~~~TTTTTTT", // 37
    "TTTTTTTTTTT~~|==|~~~~~TTTTTTTT", // 38
    "TTTTTTTTTTTT~|==|~~TTTTTTTTTTT", // 39
    "TTTTTTTTTTTTTT==STTTTTTTTTTTTT", // 40
    "TTTTTTTTTTTTTT==TTTTTTTTTTTTTT", // 41
    "TTTTTTTT......::......TTTTTTTT", // 42
    "TTTTT.........::..........TTTT", // 43
    "TTTT.,,,,,,....::.........TTTT", // 44
    "TTT.,,,,,,,,....::.....T...TTT", // 45
    "TTT..,,,,,,,.....::........TTT", // 46
    "TTTT..,,,,,,......::..bbbb...T", // 47
    "TTTT...,,,,.......::.bbbbbb..T", // 48
    "TTTTT.............::..bbbbb..T", // 49
    "TTTTTT...........::....bbb...T", // 50
    "TTTTTT..........::...........T", // 51
    "TTTTTTT........::.....,,..,,TT", // 52
    "TTTTTTTTTT....::......,,,,.TTT", // 53
    "TTTTTTTTTTTTT::TTTTTTTTTTTTTTT", // 54
    "TTTTTTTTTTTTT::TTTTTTTTTTTTTTT", // 55
    "TTTTTTTTTTTTT::TTTTTTTTTTTTTTT", // 56
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 57
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 58
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 59
  ],
  structures: [{ key: "giant_cedar", x: 22, y: 9 }],
  warps: [
    { x: 14, y: 59, to: "sugarbush_grove", toX: 14, toY: 1, facing: "down" },
    { x: 15, y: 59, to: "sugarbush_grove", toX: 14, toY: 1, facing: "down" },
    { x: 14, y: 0, to: "cedarhallow", toX: 17, toY: 28, facing: "up" },
    { x: 15, y: 0, to: "cedarhallow", toX: 18, toY: 28, facing: "up" },
  ],
  npcs: [
    { id: "lumberjack_hale", sprite: "lumberjack", x: 12, y: 48, facing: "right", trainer: "lumberjack_hale", sight: 3 },
    { id: "lumberjack_birch", sprite: "lumberjack", x: 17, y: 44, facing: "left", trainer: "lumberjack_birch", sight: 2 },
    { id: "forager_sage", sprite: "forager", x: 17, y: 16, facing: "left", trainer: "forager_sage", sight: 2 },
    { id: "forager_ash", sprite: "forager", x: 12, y: 8, facing: "right", trainer: "forager_ash", sight: 3 },
    { id: "bush:r6_wild_berry", sprite: "harvest_bush", x: 24, y: 52, facing: "down", movement: "static", script: "bush_r6_wild_berry" },
  ],
  hidden: [{ x: 9, y: 16, item: "spring_water" }, { x: 20, y: 53, item: "compost" }],
  signs: [
    { x: 13, y: 19, text: "CANOPY WALK. Follow the boards north to CEDARHALLOW." },
    { x: 16, y: 40, text: "ROUTE 6. South: SUGARBUSH GROVE." },
  ],
  triggers: [],
  encounters: {
    grass: { rate: 12, slots: [
      { species: "fireweed_fluff", minLevel: 18, maxLevel: 19, weight: 25, time: "day" },
      { species: "skunk_cabbage_shoot", minLevel: 18, maxLevel: 22, weight: 20, time: "day" },
      { species: "unfurling_fern", minLevel: 18, maxLevel: 22, weight: 20, time: "day" },
      { species: "holly_seedling", minLevel: 18, maxLevel: 19, weight: 15, time: "day" },
      { species: "maple_sapling", minLevel: 18, maxLevel: 22, weight: 15, time: "day" },
      { species: "cedar_seedling", minLevel: 18, maxLevel: 22, weight: 5, time: "day" },
      { species: "ghostpipe_stalk", minLevel: 18, maxLevel: 21, weight: 35, time: "night" },
      { species: "moonflower_vine", minLevel: 18, maxLevel: 21, weight: 20, time: "night" },
      { species: "unfurling_fern", minLevel: 18, maxLevel: 22, weight: 20, time: "night" },
      { species: "skunk_cabbage_shoot", minLevel: 18, maxLevel: 22, weight: 20, time: "night" },
      { species: "cedar_seedling", minLevel: 18, maxLevel: 22, weight: 5, time: "night" },
    ] },
    bog: { rate: 10, slots: [
      { species: "skunk_cabbage_shoot", minLevel: 18, maxLevel: 21, weight: 50 },
      { species: "cattail", minLevel: 18, maxLevel: 21, weight: 30 },
      { species: "sundew", minLevel: 18, maxLevel: 21, weight: 20 },
    ] },
  },
};
export const scripts: Scripts = {
  bush_r6_wild_berry: [say("A salmonberry cane arches over the trail, hung with orange fruit."), { op: "harvest", id: "r6_wild_berry", item: "wild_berry", qty: 2 }],
};
