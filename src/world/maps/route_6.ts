import type { MapDef } from "../../contracts";
import { OUTDOOR, say, type Scripts } from "../build";

// The long canopy boardwalk is the only crossing between two broad clearings.
// Tree masses on both banks keep the old-growth tall and close. A spur drops
// into the skunk-cabbage bog; the main trail stays above the water.
export const route_6: MapDef = {
  id: "route_6", name: "ROUTE 6", outdoor: true, music: "route",
  border: "tree", legend: OUTDOOR, ambient: "mist",
  tiles: [
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 1
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 2
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 3
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 4
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 5
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 6
    "TTTTT..3..................TTTT", // 7
    "TTTTT..................4..TTTT", // 8
    "TTTTT.,,,,,,,.............TTTT", // 9
    "TTTTT.,,,,,,,.............TTTT", // 10
    "TTTTT.,,,,,,,.............TTTT", // 11
    "TTTTT.,,,,,,,......,,,,,..TTTT", // 12
    "TTTTT.,,,,,,,......,,,,,..TTTT", // 13
    "TTTTT..............,,,,,..TTTT", // 14
    "TTTTT..............,,,,,..TTTT", // 15
    "TTTTT....5.........,,,,,..TTTT", // 16
    "TTTTT.....................TTTT", // 17
    "TTTTT.................3...TTTT", // 18
    "TTTTTTTTTTTTTS::TTTTTTTTTTTTTT", // 19
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 20
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 21
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 22
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 23
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 24
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 25
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 26
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 27
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 28
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 29
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 30
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 31
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 32
    "TTTTTTTTT~~~~~==~~~~~TTTTTTTTT", // 33
    "TTTTTTTTT~~~~~==~~~~bbbbbbTTTT", // 34
    "TTTTTTTTT~~~~~======bbbbbbTTTT", // 35
    "TTTTTTTTT~~~~~======bbbbbbTTTT", // 36
    "TTTTTTTTT~~~~~==~~~~bbbbbbTTTT", // 37
    "TTTTTTTTT~~~~~==~~~~bbbbbbTTTT", // 38
    "TTTTTTTTT~~~~~==~~~~bbbbbbTTTT", // 39
    "TTTTTTTTTTTTTT::STTTTTTTTTTTTT", // 40
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 41
    "TTTT......................TTTT", // 42
    "TTTT.4....................TTTT", // 43
    "TTTT.,,,,,,,............3.TTTT", // 44
    "TTTT.,,,,,,,..............TTTT", // 45
    "TTTT.,,,,,,,..............TTTT", // 46
    "TTTT.,,,,,,,........,,,,,.TTTT", // 47
    "TTTT.,,,,,,,........,,,,,.TTTT", // 48
    "TTTT.,,,,,,,........,,,,,.TTTT", // 49
    "TTTT................,,,,,.TTTT", // 50
    "TTTT................,,,,,.TTTT", // 51
    "TTTT....5.................TTTT", // 52
    "TTTT................4.....TTTT", // 53
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 54
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 55
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 56
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 57
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 58
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 59
  ],
  structures: [],
  warps: [
    { x: 14, y: 59, to: "sugarbush_grove", toX: 14, toY: 1, facing: "down" },
    { x: 15, y: 59, to: "sugarbush_grove", toX: 14, toY: 1, facing: "down" },
    { x: 14, y: 0, to: "cedarhallow", toX: 17, toY: 28, facing: "up" },
    { x: 15, y: 0, to: "cedarhallow", toX: 18, toY: 28, facing: "up" },
  ],
  npcs: [
    { id: "lumberjack_hale", sprite: "hiker", x: 12, y: 48, facing: "right", trainer: "lumberjack_hale", sight: 3 },
    { id: "lumberjack_birch", sprite: "hiker", x: 17, y: 44, facing: "left", trainer: "lumberjack_birch", sight: 2 },
    { id: "forager_sage", sprite: "gardener", x: 17, y: 16, facing: "left", trainer: "forager_sage", sight: 2 },
    { id: "forager_ash", sprite: "birdwatcher", x: 12, y: 8, facing: "right", trainer: "forager_ash", sight: 3 },
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
  bush_r6_wild_berry: [say("TODO(text): bush_r6_wild_berry"), { op: "harvest", id: "r6_wild_berry", item: "wild_berry", qty: 2 }],
};
