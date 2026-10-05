import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, pickups, say, when, type Scripts } from "../build";

// ROUTE 3, south to north:
//  - BRAMBLEGATE's outskirts: the road bends west into a hedged lane past
//    HIKER GUS and a grass field. A ledge on the east side is the quick way
//    back down to town.
//  - The lily pond: the path runs along its east shore past FLORIST PETRA.
//    Across a row of trees, a SPRING WATER sits in a pocket between two
//    ledges. You reach it from the plateau above.
//  - The woodland pass: a cleft between cliffs, where a ROOTSTOCK "surveyor"
//    stands.
//  - The NIGHT MEADOW: wide moonflower grass, the path snaking through it.
//    Fireflies after dark; MOONFLOWERS bloom only at night.
export const route_3: MapDef = {
  id: "route_3",
  name: "ROUTE 3",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: OUTDOOR,
  ambient: "fireflies",
  tiles: [
    // x: 0123456789012345678901
    "TTTTTTTTTT::TTTTTTTTTT", // 0  to SUGARBUSH
    "TTTTTTTTT.::.TTTTTTTTT", // 1
    "TTTTTT*...::..,,TTTTTT", // 2  compost tucked in the grass at 15,2
    "TTTT..y..:::.,,,,.TTTT", // 3
    "TTT..,,.::..,,,,,,.TTT", // 4
    "TT..,,,,:...,,,,,*..TT", // 5
    "TT.,,,,,:....,,,,...TT", // 6
    "TT.,,,,::.......,..TTT", // 7
    "TT..,,.:...35....TTTTT", // 8  a stump ringed with mushrooms
    "TTy....:......,,,,.TTT", // 9
    "TT*....::::...,,,,.TTT", // 10 OWEN watches the bend
    "TTT.,,,...:..*..,,.TTT", // 11
    "TT..,,,,..:.........TT", // 12
    "TT.,,,,,..::::..y...TT", // 13
    "TT..,,,..S...:....,.TT", // 14 NIGHT MEADOW sign
    "TTT..........:...,,,TT", // 15
    "TTTT*.......::..TTTTTT", // 16
    "TTTTTT....::..TTTTTTTT", // 17
    "TTTTTTTT..:.TTTTTTTTTT", // 18
    "TTTTTTTAA.:.AATTTTTTTT", // 19 the woodland pass
    "TTTTTTTTA.:AATTTTTTTTT", // 20
    "TTTTTTTTAA:ATTTTTTTTTT", // 21
    "TTTTTTTTTA:ATTTTTTTTTT", // 22 the "surveyor"
    "TTTTTTTTTA:ATTTTTTTTTT", // 23
    "TTTTTTTTTS:.TTTTTTTTTT", // 24
    "TTTTTTq...:........TTT", // 25 plateau opens east
    "TTTTq0~q..:.T..*..,TTT", // 26 the lily pond
    "TTTq~~~0q.:.T.,,,..TTT", // 27
    "TTq~0~~~..:.T,,,,..TTT", // 28
    "TT~~~~0~..:.T..35..TTT", // 29
    "TTq~0~~~..:.TvvvvvvTTT", // 30 PETRA by the shore; ledge into the pocket
    "TTTq~~0q..:.T..y...TTT", // 31 SPRING WATER in the pocket
    "TTTTqq....:.T......TTT", // 32
    "TTTT......:.TvvvvvvTTT", // 33 ledge out of the pocket
    "TTT.*.....:........TTT", // 34
    "TT..,::::::.,,,,...TTT", // 35 the road bends west
    "TT.,,:HHHHHH.,,,,..TTT", // 36
    "TT.,,:..*..H..,,...TTT", // 37
    "TT...:.....H.......TTT", // 38 GUS in the hedged lane
    "TT.,,:.....HvvvvvvvTTT", // 39 ledge: the quick way back to town
    "TT.,,:.....H..,,,..TTT", // 40
    "TT.,,::::::H..,,,..TTT", // 41
    "TT.....*..:...,,,..TTT", // 42
    "TTTT......::..*....TTT", // 43
    "TTTTT..y.S::.....TTTTT", // 44
    "TTTTTTTT..::..TTTTTTTT", // 45
    "TTTTTTTTT.::.TTTTTTTTT", // 46
    "TTTTTTTTTT::TTTTTTTTTT", // 47 to BRAMBLEGATE
  ],
  structures: [],
  warps: [
    { x: 10, y: 0, to: "sugarbush", toX: 14, toY: 24, facing: "up" },
    { x: 11, y: 0, to: "sugarbush", toX: 15, toY: 24, facing: "up" },
    { x: 10, y: 47, to: "bramblegate", toX: 13, toY: 1, facing: "down" },
    { x: 11, y: 47, to: "bramblegate", toX: 14, toY: 1, facing: "down" },
  ],
  npcs: [
    // r3_grunt walks him 4 tiles up the pass after the battle.
    { id: "grunt", sprite: "grunt", x: 10, y: 22, facing: "down", movement: "static", script: "r3_grunt",
      visibleWhen: when({ beat_grunt_r3: false }) },
    { id: "gus", sprite: "hiker", x: 8, y: 38, facing: "left", trainer: "hiker_gus", sight: 3 },
    { id: "petra", sprite: "florist", x: 8, y: 30, facing: "right", trainer: "florist_petra", sight: 3 },
    { id: "owen", sprite: "birdwatcher", x: 14, y: 10, facing: "left", trainer: "birdwatcher_owen", sight: 4 },
    { id: "meadowkeeper", sprite: "villager_b", x: 12, y: 12, facing: "left", movement: "look_around", script: "r3_meadowkeeper" },
    { id: "stuck_hiker", sprite: "hiker", x: 8, y: 25, facing: "right", movement: "look_around", script: "r3_stuck_hiker" },
    { id: "pondwatcher", sprite: "kid", x: 9, y: 27, facing: "left", movement: "look_around", script: "r3_pondwatcher" },
    { id: "bird", sprite: "bird", x: 15, y: 42, facing: "left", movement: "wander", script: "r3_bird" },
    ...pickups([
      { item: "compost", x: 15, y: 2 },
      { item: "spring_water", x: 17, y: 31 },
      { item: "terrarium_pod", x: 3, y: 40 },
    ]),
  ],
  signs: [
    { x: 9, y: 44, text: "ROUTE 3. North: SUGARBUSH. South: BRAMBLEGATE." },
    { x: 9, y: 24, text: "WOODLAND PASS. Beyond lies the NIGHT MEADOW." },
    { x: 9, y: 14, text: "NIGHT MEADOW. Some flowers here open only after dark." },
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
      say("See them glowing white? MOONFLOWERS. They open at dusk."),
      say("Hawkmoths come to drink. Tonight the flowers seem to watch back."),
    ], [
      say("Pretty meadow by day. Come back after dark. It's another place."),
      say("The MOONFLOWERS sleep till evening, twisted shut like paper straws."),
    ]),
  ],
  r3_stuck_hiker: [
    ifFlags({ beat_grunt_r3: true }, [
      say("The grey coat's gone? Thank you! The meadow's lovely at night."),
    ], [
      say("A fellow in a grey coat won't let anyone through the pass."),
      say("Says it's a \"survey.\" There's nothing up there but SUGARBUSH and maples!"),
    ]),
  ],
  r3_pondwatcher: [
    ifNight([
      say("Water lilies close at night and open again at sunrise. Every day!"),
    ], [
      say("See that SPRING WATER past the trees? I can't work out how to get it."),
      say("Maybe from up on the ledge? I'm not allowed near ledges."),
    ]),
  ],
  r3_bird: [
    say("A skylark. It hangs in the air, singing, then drops into the grass."),
  ],
};
