import type { MapDef } from "../../contracts";
import { OUTDOOR, ifNight, lockedDoor, pickups, say, type Scripts } from "../build";

// ROUTE 4, west to east: SUGARBUSH to GLASSHOUSE CITY.
//  - The ORCHARD: rows of apple trees over long grass and windfalls (APPLE PIPS
//    by day). In its north-east corner, a ring of brambles hides a RAIN JAR
//    you can see from the road but can't reach until you can PRUNE.
//  - The orchardist's cottage and the CIDER PRESS yard, south of the road.
//    A meadow of long grass beyond, with a beekeeper.
//  - The river: the road crosses on STEPPING STONES. Sundews grow in the boggy
//    margin downstream, where an angler sits.
//  - East bank: the road bends round a lily pond to the glass city gate.
//    North of the pond, a rise (listening post 1, a hiker, a SPRING WATER)
//    is reached from the city end; its lip is a ledge that drops you back by
//    the stones, the quick way home.
export const route_4: MapDef = {
  id: "route_4",
  name: "ROUTE 4",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    // x: 0         1         2         3         4         5
    // x: 0123456789012345678901234567890123456789012345678901
    "TTTTTTTTTTTTTTTTTTTTTTTTT~~~~TTTTTTTTTTTTTTTTTTTTTTT", // 0 the river comes down from the hills
    "TTTTTTTTTTTTTTTTTTTTTTTTq~~~~qTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTTT.R.R.R.R.R.R.R.R.TTT.~~~~.TTTT............TTTTTT", // 2 the ORCHARD
    "TTT,,a,,,,,,,a,,,,,...TTq~~~~.TT.,,,,,R.R.R......TTT", // 3
    "TT..R.R.R.R.R.R.R.R....T.~~~~qT.,,,,,,.....!.....TTT", // 4 sensor post 1 on the rise (43,4)
    "TT.,,,,a,,,,,,,,,a,.BBBT.~~0~.T.,,,,,.R.R.R....,,TTT", // 5
    "TT.R.R.R.R.R.R.R.R.RB.BTq~~~~.T..,,,........*y.,,TTT", // 6 bramble pocket: RAIN JAR at 21,6
    "TT..a,,,,,,,a,,,,,,.BBBT.~~~~qT....::::::::::::,.TTT", // 7
    "TT..R.R.R.R.R.R.R.R...*..~~~~.T..........35...:..TTT", // 8
    "TT...,,,a,,,,,,.........q~0~~.T.....*.........:..TTT", // 9
    "TT.R.R.R.R.R.R.R.R.R.....~~~~qAvvvvAAAAAAAAAAA:AATTT", // 10 the rise's lip: ledge back down to the stones
    "TT........S..............~~~~......q~~~0~~~~~q..:.TT", // 11
    "::::::::::::::::::::::::.eeee......q~~~~~0~~~~::::::", // 12 SUGARBUSH <- road -> stepping stones -> GLASSHOUSE CITY
    "TT.....:.................~~~~.....:.q~0~~~~~~q::::::", // 13
    "T.y*...:########.*.......~~~~.bbqb:::::::::::::....T", // 14 cider yard; bog margin (sundews)
    "TR.@@@@:#J78.7.#.,,,,,,.q~~~~.bbbb.....R...o.......T", // 15 orchardist's cottage
    "T..@@@@:#..a..8#,,,,,,,..~~~~.qbbb..,,,,,,......,,,T", // 16
    "TR.@@@@:#7.....#,,,,R,,..~~~0.bbbq..,,,,,,,....,,,,T", // 17
    "Tf..::::#7a..D.#,R.,,,,..~~~~.bbbb...,,,,,......,,,T", // 18 the CIDER PRESS
    "T...:..:####N###,,,,,,,.q~~~~.qbb....,,,,..........T", // 19
    "T...:::::::::..,,,,,,,,..~~~~..bb...R...R........*.T", // 20
    "T..,,,,,.......,,,,,,....~0~~.............3........T", // 21
    "T.,,,,,,,..R.R.,,,,,,,..q~~~~.........y*..R...R...TT", // 22
    "TTT.,,..35....TTTTTTTTTT.~~~~qT..qTTTTTTTTTTTTTTTTTT", // 23
    "TTTTTTTTTTTTTTTTTTTTTTTTq~~~~.TTTTTTTTTTTTTTTTTTTTTT", // 24
    "TTTTTTTTTTTTTTTTTTTTTTTTT~~~~TTTTTTTTTTTTTTTTTTTTTTT", // 25
  ],
  structures: [
    { key: "house_small", x: 3, y: 15 }, // the orchardist's cottage, door 4,17
  ],
  warps: [
    { x: 0, y: 12, to: "sugarbush", toX: 28, toY: 21, facing: "left" },
    { x: 51, y: 12, to: "glasshouse_city", toX: 1, toY: 16, facing: "right" },
    { x: 51, y: 13, to: "glasshouse_city", toX: 1, toY: 17, facing: "right" },
  ],
  npcs: [
    { id: "russet", sprite: "orchardist", x: 14, y: 9, facing: "down", trainer: "orchardist_russet", sight: 3 },
    { id: "clem", sprite: "beekeeper", x: 19, y: 16, facing: "left", trainer: "beekeeper_clem", sight: 3 },
    { id: "tam", sprite: "schoolkid", x: 32, y: 12, facing: "left", trainer: "schoolkid_tam", sight: 2 },
    { id: "kit", sprite: "birdwatcher", x: 40, y: 15, facing: "up", trainer: "birdwatcher_kit", sight: 1 },
    { id: "ford", sprite: "hiker", x: 44, y: 8, facing: "left", trainer: "hiker_ford", sight: 4 },
    { id: "cidermaker", sprite: "villager_a", x: 11, y: 17, facing: "down", movement: "look_around", script: "r4_cidermaker" },
    { id: "angler", sprite: "villager_b", x: 29, y: 16, facing: "left", movement: "static", script: "r4_angler" },
    { id: "dog", sprite: "dog", x: 13, y: 16, facing: "left", movement: "wander", script: "r4_dog" },
    { id: "bird", sprite: "bird", x: 6, y: 11, facing: "right", movement: "wander", script: "r4_bird" },
    { id: "bush:r4_berry_orchard", sprite: "harvest_bush", x: 22, y: 8, facing: "down", movement: "static", script: "bush_r4_berry_orchard" },
    ...pickups([
      { item: "rain_jar", x: 21, y: 6 },      // inside the bramble ring (PRUNE)
      { item: "spring_water", x: 33, y: 3 },  // on the rise, seen from the stones
      { item: "glass_pod", x: 49, y: 21 },
    ]),
  ],
  hidden: [
    // Caught in the reeds where the river bends.
    { x: 24, y: 15, item: "spring_water" },
    // Under the windfalls in the orchard's far corner.
    { x: 3, y: 23, item: "compost" },
  ],
  signs: [
    { x: 10, y: 11, text: "ROUTE 4. West: SUGARBUSH. East: GLASSHOUSE CITY." },
    { x: 9, y: 15, text: "A CIDER PRESS. Apples go in the top. The big screw squeezes them flat." },
  ],
  triggers: [
    { x: 4, y: 17, script: "r4_door_cottage" },
    // LISTENING POSTS: a buried-sensor head on the rise (press A facing it).
    { x: 43, y: 4, script: "q_relay_sensors_post_1" },
  ],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "apple_pip", minLevel: 14, maxLevel: 17, weight: 25, time: "day" },
        { species: "apple_pip", minLevel: 14, maxLevel: 16, weight: 8, time: "night" },
        { species: "clover_sprout", minLevel: 14, maxLevel: 17, weight: 15, time: "day" },
        { species: "dandelion", minLevel: 15, maxLevel: 18, weight: 15 },
        { species: "mint_sprig", minLevel: 14, maxLevel: 15, weight: 10, time: "day" },
        { species: "mint_sprig", minLevel: 14, maxLevel: 15, weight: 20, time: "night" },
        { species: "rose_bud", minLevel: 14, maxLevel: 17, weight: 12, time: "day" },
        { species: "rose_bud", minLevel: 14, maxLevel: 16, weight: 4, time: "night" },
        { species: "maple_sapling", minLevel: 15, maxLevel: 18, weight: 15 },
        { species: "foxglove_rosette", minLevel: 14, maxLevel: 17, weight: 15, time: "night" },
      ],
    },
    // The boggy margin downstream of the stones.
    bog: {
      rate: 10,
      slots: [
        { species: "sundew_rosette", minLevel: 14, maxLevel: 17, weight: 45 },
        { species: "cattail_shoot", minLevel: 14, maxLevel: 16, weight: 30 },
        { species: "pitcher_sprout", minLevel: 14, maxLevel: 17, weight: 25 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r4_cidermaker: [
    say("Plant an apple pip and you get a brand-new apple. Never the parent."),
    say("So to keep a good one, you graft it. Every BRAMLEY is one tree, from 1809."),
    ifNight(
      [say("Off to bed. The press creaks at night, and I'd rather not know why.")],
      [say("The QUICKENED pips roll about under the trees. They ripen into fighters!")],
    ),
  ],
  r4_angler: [
    say("Shh. The trout lie under the stones, out of the current."),
    say("See the red rosettes in the wet sand? SUNDEWS. The \"dew\" is glue."),
    say("Midges land for a drink and never leave. Fishing, like me."),
  ],
  r4_dog: [
    say("The dog guards the cider press. It had one lick of cider once, and never forgot."),
  ],
  r4_bird: [
    say("A blackbird pecks a windfall. Fermenting apples make birds a little tipsy."),
  ],
  r4_door_cottage: lockedDoor("The orchardist's cottage. Locked. A basket of windfalls waits on the step."),
  bush_r4_berry_orchard: [
    say("Blackberries scramble along the orchard edge. You pick the ripest."),
    { op: "harvest", id: "r4_berry_orchard", item: "wild_berry", qty: 2 },
  ],
};
