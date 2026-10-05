import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, pickups, say, when, type Scripts } from "../build";

// Woodland edge. The lane comes in from HEDGEROW on the east, turns north,
// runs west under a long line of ledges, dips south round a copse (past the
// forest pool), then climbs north through the trees to BRAMBLEGATE. Above the
// ledges is the plateau: a high meadow you can only get onto from the top of
// the climb. Hop off its lip anywhere for a shortcut back toward HEDGEROW. The
// compost on the plateau's edge is plain to see from the lane; getting to it
// means going all the way round. A hollow south-west of the dip hides a spray.
//
//            0         1         2         3         4
//            012345678901234567890123456789012345678901234567
export const route_2: MapDef = {
  id: "route_2",
  name: "ROUTE 2",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: OUTDOOR,
  ambient: "leaves",
  tiles: [
    "TTTT::TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTT::..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTT.::...TTT.......TTT.....f...TT..,.....TTTTTTT", // 2
    "TTT*::...T..f,........,.....y*..,,,,,,,...TTTTTT", // 3
    "TTT.::,...T,,,,,....,,,,,TT.....,,,,,,,.T...TTTT", // 4
    "TTT.::,,...,,,,,.T.,,,,,,TT.....,,,,,T,.....TTTT", // 5
    "TTT.::,,...,,,,,....,,,,,..........,...f....TTTT", // 6
    "TTT.::,,.....,..y.5T..,4.......*....o....3..TTTT", // 7
    "TTT.::,.......35..............T..y.........ATTTT", // 8
    "TTT3::.y.AvvvvvvvvvAAvvvvvvvvvAvvvvvvvvvAAAATTTT", // 9
    "TTT5::....,...........o.,,,......y.....TTTTTTTTT", // 10
    "TTT.::::::::::::::::...,,,,,..::::::::.TTTTTTTTT", // 11
    "TTT.::::::::::::::::....,,,...::::::::.TTTTTTTTT", // 12
    "TTTTT.S..TT.TTTTT.::..TTTTT...::TTTT::T......TTT", // 13
    "TTTTTTTTTT........::::::::::::::TTT.::.,,,,,...T", // 14
    "TTTTTTTTTT.*,,,y..::::::::::::::TTT.::,,,,,,f..T", // 15
    "TTTTTTTTTT.3,,,,.....T..............::.,,,,S...T", // 16
    "TTTTTTTTTTT,,,,,.TTTTT..4.~~~~~q.35.::::::::::::", // 17
    "TTTTTTTTTTT....TTTTTTT...q~0~~~~.......*.......T", // 18
    "TTTTTTTTTTTTTTTTTTTTTTTT..~~~~q..TT.........TTTT", // 19
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 20
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 21
  ],
  structures: [],
  warps: [
    { x: 4, y: 0, to: "bramblegate", toX: 13, toY: 22, facing: "up" },
    { x: 5, y: 0, to: "bramblegate", toX: 14, toY: 22, facing: "up" },
    { x: 47, y: 17, to: "hedgerow", toX: 1, toY: 12, facing: "left" },
  ],
  npcs: [
    { id: "alder", sprite: "birdwatcher", x: 38, y: 15, facing: "left", trainer: "birdwatcher_alder", sight: 2 },
    { id: "mae", sprite: "beekeeper", x: 19, y: 10, facing: "down", trainer: "beekeeper_mae", sight: 2 },
    { id: "rosa", sprite: "gardener", x: 11, y: 6, facing: "left", trainer: "gardener_rosa", sight: 3 },
    { id: "forager", sprite: "villager_b", x: 33, y: 18, facing: "left", movement: "look_around", script: "r2_forager" },
    { id: "picnic", sprite: "villager_a", x: 29, y: 7, facing: "down", movement: "static", script: "r2_picnic" },
    { id: "picnic_dog", sprite: "dog", x: 27, y: 7, facing: "right", movement: "wander", script: "r2_dog" },
    { id: "jay", sprite: "bird", x: 40, y: 6, facing: "left", movement: "look_around", script: "r2_jay" },
    ...pickups([{ item: "compost", x: 27, y: 8 }, { item: "neem_spray", x: 12, y: 18 }]),
    // Wild berry bushes: one where the lane turns south, one up on the plateau.
    { id: "bush:r2_berry_lane", sprite: "harvest_bush", x: 21, y: 13, facing: "down", movement: "static", script: "bush_r2_berry_lane" },
    { id: "bush:r2_berry_plateau", sprite: "harvest_bush", x: 18, y: 2, facing: "down", movement: "static", script: "bush_r2_berry_plateau" },
    // MOSS IS MISSING: HEDGEROW's cat, curled up behind the fallen log by the
    // forest pool, while the quest is open.
    { id: "moss", sprite: "cat", x: 25, y: 19, facing: "left", movement: "static", script: "q_lost_cat_moss",
      visibleWhen: when({ quest_lost_cat_started: true, moss_found: false }) },
  ],
  hidden: [
    // Under the stump in the plateau's far north-east corner.
    { x: 41, y: 7, item: "spring_water" },
    // Deep in the reed bed on the forest pool's south shore.
    { x: 30, y: 19, item: "compost" },
  ],
  signs: [
    { x: 6, y: 13, text: "ROUTE 2. North: BRAMBLEGATE." },
    { x: 43, y: 16, text: "ROUTE 2. East: HEDGEROW. Ledges: hop down only!" },
  ],
  triggers: [],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "dandelion_bud", minLevel: 3, maxLevel: 6, weight: 25, time: "day" },
        { species: "dandelion_bud", minLevel: 3, maxLevel: 6, weight: 20, time: "night" },
        { species: "bramble_blossom", minLevel: 3, maxLevel: 7, weight: 22 },
        { species: "fern_fiddlehead", minLevel: 4, maxLevel: 7, weight: 22, time: "day" },
        { species: "fern_fiddlehead", minLevel: 4, maxLevel: 7, weight: 25, time: "night" },
        { species: "sunflower_seedling", minLevel: 3, maxLevel: 6, weight: 15, time: "day" },
        { species: "holly_seedling", minLevel: 4, maxLevel: 7, weight: 10 },
        { species: "foxglove_rosette", minLevel: 4, maxLevel: 7, weight: 4, time: "day" },
        { species: "foxglove_rosette", minLevel: 4, maxLevel: 7, weight: 25, time: "night" },
        { species: "pumpkin_blossom", minLevel: 5, maxLevel: 7, weight: 5 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r2_forager: [
    ifFlags({ quest_lost_cat_started: true, moss_found: false }, [
      say("A cat? Ginger, fluffy? Something's been mewing behind that log by the pool."),
    ]),
    say("Fiddleheads are young fern fronds, coiled tight like the scroll of a violin."),
    say("They uncurl as they grow. These ones uncurl to slap you. Times have changed!"),
  ],
  r2_picnic: [
    ifNight(
      [say("I came up to watch the stars. The ferns keep turning to watch ME.")],
      [say("Best picnic spot in the valley. Hop off the ledge and you're back on the lane.")],
    ),
    ifFlags({ beat_hollis: true }, [
      say("Saw your MARK! HOLLIS made me cry once. Well. His hedge did."),
    ]),
  ],
  bush_r2_berry_lane: [
    say("A wild berry bush, humming with bees. They let you have a share."),
    { op: "harvest", id: "r2_berry_lane", item: "wild_berry", qty: 2 },
  ],
  bush_r2_berry_plateau: [
    say("Up here, out of reach of the lane, nobody has picked this bush all year."),
    { op: "harvest", id: "r2_berry_plateau", item: "wild_berry", qty: 3 },
  ],
  r2_dog: [
    say("The dog is very interested in your sandwich. You don't have a sandwich."),
  ],
  r2_jay: [
    say("A jay buries an acorn, looks right at you, and moves it somewhere else."),
  ],
};
