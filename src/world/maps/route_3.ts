import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, pickups, say, when, type Scripts } from "../build";

// South: fenced farm meadow. Middle: a narrow wooded pass (a ROOTSTOCK
// "surveyor" blocks it). North: the NIGHT MEADOW, where MOONFLOWERS open
// only after dark.
export const route_3: MapDef = {
  id: "route_3",
  name: "ROUTE 3",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTTTTTT::TTTTTTTTTT", // 0
    "TTTTTTTTTT::TTTTTTTTTT", // 1
    "TTTT...*..::...*..TTTT", // 2
    "TT.......S:..,,,,,..TT", // 3
    "TT..,,,,,.:..,,,,,..TT", // 4
    "TT..,,,,,.:..,,,,,..TT", // 5
    "TT..,,,,,.:.........TT", // 6
    "TTT.,,,,,.:.*...*...TT", // 7
    "TT....o...:.........TT", // 8
    "TT.*....*.:..,,,,,,.TT", // 9
    "TT........:..,,,,,,*TT", // 10
    "TT.,,,,,,.:..,,,,,,.TT", // 11
    "TT.,,,,,,.:..,,,,,,TTT", // 12
    "TT.,,,,,,*:..,,,,,,TTT", // 13
    "TT.,,,,,,.:..,,,,,,TTT", // 14
    "TT.,,,,,,.:.........TT", // 15
    "TT........:.,,,,o...TT", // 16
    "TT...*....:.,,,,..*.TT", // 17
    "TT*.......:.........TT", // 18
    "TTTTT.....:.....TTTTTT", // 19
    "TTTTTTTTT.:..TTTTTTTTT", // 20
    "TTTTTTTTT.:..TTTTTTTTT", // 21
    "TTTTTTTTTT:TTTTTTTTTTT", // 22
    "TTTTTTTTTT:TTTTTTTTTTT", // 23
    "TTT.......:.TTTTTTTTTT", // 24
    "TTT.,,,,..:..TTTTTTTTT", // 25
    "TTT.,,,,..:o.......TTT", // 26
    "TTT.......:......o.TTT", // 27
    "TTTTTTTTT.:........TTT", // 28
    "TTTTTTTTTT:.TTTTTTTTTT", // 29
    "TTTTTTTTTS:.TTTTTTTTTT", // 30
    "TTTT......:......*TTTT", // 31
    "TTTT.::::::.........TT", // 32
    "TT...:......*,,,,,,.TT", // 33
    "TT...:..TT...,,,,,,.TT", // 34
    "TT.*.:..TT...,,,,,,.TT", // 35
    "TT...:.......,,,,,,.TT", // 36
    "TT...:::::::.######.TT", // 37
    "TT........::.......TTT", // 38
    "TT........::T...*..TTT", // 39
    "TT,,,,,,..::.......TTT", // 40
    "TT,,,,,,..::..,,,,,.TT", // 41
    "TT,,,,,,..::..,,,,,.TT", // 42
    "TT.....*.S::..,,,,,.TT", // 43
    "TTTTTTTTT.::.TTTTTTTTT", // 44
    "TTTTTTTTTT::TTTTTTTTTT", // 45
  ],
  structures: [],
  warps: [
    { x: 10, y: 0, to: "sugarbush", toX: 14, toY: 24, facing: "up" },
    { x: 11, y: 0, to: "sugarbush", toX: 15, toY: 24, facing: "up" },
    { x: 10, y: 45, to: "bramblegate", toX: 13, toY: 1, facing: "down" },
    { x: 11, y: 45, to: "bramblegate", toX: 14, toY: 1, facing: "down" },
  ],
  npcs: [
    { id: "grunt", sprite: "grunt", x: 10, y: 22, facing: "down", movement: "static", script: "r3_grunt",
      visibleWhen: when({ beat_grunt_r3: false }) },
    { id: "gus", sprite: "hiker", x: 7, y: 38, facing: "right", trainer: "hiker_gus", sight: 3 },
    { id: "petra", sprite: "florist", x: 11, y: 31, facing: "left", trainer: "florist_petra", sight: 2 },
    { id: "owen", sprite: "birdwatcher", x: 12, y: 12, facing: "left", trainer: "birdwatcher_owen", sight: 3 },
    { id: "meadowkeeper", sprite: "villager_b", x: 8, y: 17, facing: "right", movement: "look_around", script: "r3_meadowkeeper" },
    { id: "stuck_hiker", sprite: "hiker", x: 8, y: 27, facing: "right", movement: "look_around", script: "r3_stuck_hiker" },
    ...pickups([
      { item: "spring_water", x: 18, y: 26 },
      { item: "compost", x: 2, y: 16 },
      { item: "terrarium_pod", x: 17, y: 40 },
    ]),
  ],
  signs: [
    { x: 9, y: 43, text: "ROUTE 3. North: SUGARBUSH. South: BRAMBLEGATE." },
    { x: 9, y: 30, text: "WOODLAND PASS. Beyond lies the NIGHT MEADOW." },
    { x: 9, y: 3, text: "NIGHT MEADOW. Some flowers here open only after dark." },
  ],
  triggers: [
    { x: 10, y: 23, script: "r3_grunt", when: when({ beat_grunt_r3: false }) },
  ],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "bramble_blossom", minLevel: 7, maxLevel: 11, weight: 30, time: "day" },
        { species: "pumpkin_blossom", minLevel: 8, maxLevel: 11, weight: 15, time: "day" },
        { species: "moonflower_seed", minLevel: 8, maxLevel: 11, weight: 40, time: "night" },
        { species: "fern_fiddlehead", minLevel: 7, maxLevel: 11, weight: 30 },
        { species: "nettle_sprout", minLevel: 7, maxLevel: 10, weight: 20 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r3_meadowkeeper: [
    ifNight([
      say("See them glowing white? MOONFLOWERS. They open at dusk and close by morning."),
      say("Hawkmoths come to drink. And now the flowers come to look at you!"),
    ], [
      say("Pretty meadow by day, eh? Come back after dark. It's a different place entirely."),
      say("The MOONFLOWERS only wake at night. By day they're tight little twists."),
    ]),
  ],
  r3_stuck_hiker: [
    ifFlags({ beat_grunt_r3: true }, [
      say("The grey-coat's gone? Thank you! I've a hike to finish."),
    ], [
      say("A fellow in a grey coat won't let anyone through the pass. Says it's a \"survey.\""),
      say("Surveying WHAT? There's nothing up there but SUGARBUSH and maples."),
    ]),
  ],
};
