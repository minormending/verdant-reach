import type { MapDef } from "../../contracts";
import { LEGEND, ifNight, pickups, say, type Scripts } from "../build";

// Woodland edge. The lane runs west from HEDGEROW, then climbs north through
// the trees to BRAMBLEGATE. A raised plateau of meadow loops east above a
// line of one-way ledges: hop down for a shortcut back to the lane.
export const route_2: MapDef = {
  id: "route_2",
  name: "ROUTE 2",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTT::TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTT.::..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTT..:..TT...TTT......TTTT.....TT....TTT", // 2
    "TTT..:,,.T..*.........TTTT.......o...TTT", // 3
    "TT...:,,.T....,,,,,,.................TTT", // 4
    "TT...:,,......,,,,,,......T.,,,,,,...TTT", // 5
    "TT.*.:,,......,,,,,,........,,,,,,...TTT", // 6
    "TT...:......................,,,,,,...TTT", // 7
    "TT...:.T.T.......*..TT.............TTTTT", // 8
    "TTT..:.T.TTT.T......TT.,,,,,,.*....TTTTT", // 9
    "TTT..:...TTT...........,,,,,,......TTTTT", // 10
    "TTT..:...TTTvvvvvvvvTTvvvvvvvvvvvvvTTTTT", // 11
    "TT...:...TT.....*.....*.....,,,,....TTTT", // 12
    "TT.*.:.*......:::::::::::::.,,,,..*.TTTT", // 13
    "TT...:S....o..:....,,,,,,.:..........STT", // 14
    "TT...::::::::::.....,,,,,.::::::::::::::", // 15
    "TTTT...,,,,,,..*..TT...T......TTT,,,,.TT", // 16
    "TTTT...,,,,,,.....TT...T.*..o.TTT,,,,.TT", // 17
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 18
  ],
  structures: [],
  warps: [
    { x: 4, y: 0, to: "bramblegate", toX: 13, toY: 22, facing: "up" },
    { x: 5, y: 0, to: "bramblegate", toX: 14, toY: 22, facing: "up" },
    { x: 39, y: 15, to: "hedgerow", toX: 1, toY: 8, facing: "left" },
  ],
  npcs: [
    { id: "rosa", sprite: "gardener", x: 21, y: 5, facing: "left", trainer: "gardener_rosa", sight: 4 },
    { id: "alder", sprite: "birdwatcher", x: 18, y: 12, facing: "down", trainer: "birdwatcher_alder", sight: 3 },
    { id: "mae", sprite: "beekeeper", x: 3, y: 10, facing: "right", trainer: "beekeeper_mae", sight: 3 },
    { id: "forager", sprite: "villager_b", x: 33, y: 13, facing: "left", movement: "look_around", script: "r2_forager" },
    { id: "picnic", sprite: "villager_a", x: 25, y: 4, facing: "down", movement: "static", script: "r2_picnic" },
    ...pickups([{ item: "compost", x: 35, y: 3 }, { item: "neem_spray", x: 13, y: 17 }]),
  ],
  signs: [
    { x: 6, y: 14, text: "ROUTE 2. North: BRAMBLEGATE." },
    { x: 37, y: 14, text: "ROUTE 2. East: HEDGEROW. Ledges hop down only!" },
  ],
  triggers: [],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "dandelion_bud", minLevel: 3, maxLevel: 6, weight: 30 },
        { species: "bramble_blossom", minLevel: 3, maxLevel: 7, weight: 25 },
        { species: "fern_fiddlehead", minLevel: 4, maxLevel: 7, weight: 25 },
        { species: "sunflower_seedling", minLevel: 3, maxLevel: 6, weight: 15, time: "day" },
        { species: "pumpkin_blossom", minLevel: 5, maxLevel: 7, weight: 5 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r2_forager: [
    say("Fiddleheads are young fern fronds, still coiled up tight like a violin's scroll."),
    say("Pick one now and it bites back. Times have changed!"),
  ],
  r2_picnic: [
    ifNight(
      [say("I came up here to watch the stars. The ferns keep turning to watch ME.")],
      [say("Best picnic spot in the valley. Hop down the ledge and you're back on the lane.")],
    ),
  ],
};
