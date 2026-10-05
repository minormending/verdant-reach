import type { MapDef } from "../../contracts";
import { OUTDOOR, ifNight, pickups, say, type Scripts } from "../build";

// ROUTE 5: the old lane from GLASSHOUSE CITY back down to HEDGEROW. Since the
// bloom it has gone wild: brambles have closed both ends (PRUNE them), and
// tall grass has swallowed the old hedges. Inside, the lane wanders south-west
// through meadow. A ring of brambles hides a GLASS POD; a ledge drops from the
// north-east rise back to the lane. The west end opens onto HEDGEROW's green,
// a shortcut home that makes the valley feel small.
export const route_5: MapDef = {
  id: "route_5",
  name: "ROUTE 5",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    // x: 0         1         2
    // x: 012345678901234567890123456789
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT", // 0 from GLASSHOUSE CITY
    "TTTTTTTTTTTTT.::.TTTTTTTTTTTTT", // 1
    "TTTTTTTTTTTTHy::*HTTTTTTTTTTTT", // 2
    "TTTTTTTTTTTTHBBBBHTTTTTTTTTTTT", // 3 the north brambles (PRUNE)
    "TTTTTTTTT...,,::,,.TTTTTTTTTTT", // 4
    "TTTTTT..,,,,,,::,,,,..TTTTTTTT", // 5
    "TTTTT..,,,,,..:..,,,,,,.TTTTTT", // 6
    "TTTT..,,,B,...:...,,,,,,..TTTT", // 7
    "TTT..BBBB..::::.....,,,B...TTT", // 8
    "TTT.,B..B.::....H..y.B.B...TTT", // 9
    "TT.,,B..B.:.....H.......f..TTT", // 10
    "TT.,,BBBB.:.4...H...,,,,...TTT", // 11
    "T..,,,....:.....HHHHvvvvv..TTT", // 12
    "T.,,,,,...:::::........,,...TT", // 13
    "TT.,,,,.......::::.....,,,..TT", // 14
    "TTHH..,,,,,,....::....,,,...TT", // 15
    "::B...,,,,,,.....::::::::..TTT", // 16 to HEDGEROW (west brambles)
    "TTHH...,,,,..35......*.y..TTTT", // 17
    "TTTT....,,,......,,,......TTTT", // 18
    "TTTTTT.y......TT...,,,..TTTTTT", // 19
    "TTTTTTTTT..TTTTTTT...TTTTTTTTT", // 20
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 21
  ],
  structures: [],
  warps: [
    { x: 14, y: 0, to: "glasshouse_city", toX: 19, toY: 34, facing: "up" },
    { x: 15, y: 0, to: "glasshouse_city", toX: 20, toY: 34, facing: "up" },
    { x: 0, y: 16, to: "hedgerow", toX: 24, toY: 12, facing: "left" },
  ],
  npcs: [
    { id: "ivy", sprite: "gardener", x: 12, y: 6, facing: "right", trainer: "gardener_ivy", sight: 3 },
    { id: "dale", sprite: "hiker", x: 20, y: 14, facing: "left", trainer: "hiker_dale", sight: 3 },
    { id: "rambler", sprite: "villager_a", x: 11, y: 14, facing: "down", movement: "look_around", script: "r5_rambler" },
    { id: "bird", sprite: "bird", x: 8, y: 18, facing: "left", movement: "wander", script: "r5_bird" },
    { id: "bush:r5_rosehip_rise", sprite: "harvest_bush", x: 24, y: 10, facing: "down", movement: "static", script: "bush_r5_rosehip_rise" },
    ...pickups([
      { item: "glass_pod", x: 6, y: 9 },       // inside the bramble ring
      { item: "spring_water", x: 25, y: 9 },   // on the rise
    ]),
  ],
  hidden: [
    // In the hollow of the old stump.
    { x: 13, y: 17, item: "compost" },
    // Among the flowers at the lane's south end.
    { x: 7, y: 19, item: "rain_jar" },
  ],
  signs: [],
  triggers: [],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "dandelion", minLevel: 16, maxLevel: 19, weight: 20 },
        { species: "bramble_berry", minLevel: 16, maxLevel: 19, weight: 20 },
        { species: "unfurling_fern", minLevel: 16, maxLevel: 19, weight: 18 },
        { species: "sunflower_bud", minLevel: 16, maxLevel: 18, weight: 15, time: "day" },
        { species: "holly_seedling", minLevel: 16, maxLevel: 19, weight: 12 },
        { species: "peppermint", minLevel: 16, maxLevel: 19, weight: 10 },
        { species: "foxglove_rosette", minLevel: 16, maxLevel: 17, weight: 20, time: "night" },
        { species: "stinging_nettle", minLevel: 17, maxLevel: 19, weight: 5 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r5_rambler: [
    say("This was the old drove road to HEDGEROW. Then the bloom came."),
    say("Brambles grew a yard a week. A bramble roots wherever its tip touches."),
    ifNight(
      [say("At night the brambles creak, like they're still stretching.")],
      [say("Lovely blackberries, mind. Every cloud.")],
    ),
  ],
  r5_bird: [
    say("A wren sings from deep in the brambles. Safe as houses in there."),
  ],
  bush_r5_rosehip_rise: [
    say("A dog rose on the rise, hung with red hips."),
    { op: "harvest", id: "r5_rosehip_rise", item: "rose_hip", qty: 2 },
  ],
};
