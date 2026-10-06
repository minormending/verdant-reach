import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

// Two lamps warm the entrance hall. Beyond the keeper, the trunk's central
// aisle branches into three shrine rooms and beds of pale woodland plants.
export const cedar_hollow: MapDef = {
  id: "cedar_hollow", name: "THE HOLLOW", outdoor: false, dark: true,
  music: "hollow", border: "void", legend: LEGEND, ambient: "spores",
  tiles: [
    "WWWWWWWWWWWWWWWWWWWW", // 0
    "WWWWWWWWWWWWWWWWWWWW", // 1
    "WWWWWWWwwwwwwWWWWWWW", // 2
    "WWWWWWWw,,,,wWWWWWWW", // 3
    "WWwwwwww,,,,wwwwwwWW", // 4
    "WW!wwwww,,,,wwwww!WW", // 5
    "WWw,,,,wwwwwwwwwwwWW", // 6
    "WWw,,,,wwwwwwwwwwwWW", // 7
    "WWw,,,,wwwwwwwwwwwWW", // 8
    "WWw3wwwwwwwwwwwwwwWW", // 9
    "WWWWWWWwwwwwwWWWWWWW", // 10
    "WWWWWWWwwwwwwWWWWWWW", // 11
    "WWwwwwwwwwwwwwwwwwWW", // 12
    "WWwwwwwwwwww,,,,,wWW", // 13
    "WW!wwwwwwwww,,,,,wWW", // 14
    "WWwwwwwwwwww,,,,,wWW", // 15
    "WWwwwwwwwwww,,,,,wWW", // 16
    "WWwwwwwwwwwwwwww5wWW", // 17
    "WWWWWWWwwwwwwWWWWWWW", // 18
    "WWWWWWwwwwwwwwWWWWWW", // 19
    "WWWWWWwwwwwwwwWWWWWW", // 20
    "WWWWWWwwwwww6wWWWWWW", // 21
    "WWWWWWww6wwwwwWWWWWW", // 22
    "WWWWWWWWWEWWWWWWWWWW", // 23
  ],
  structures: [],
  warps: [{ x: 9, y: 23, to: "cedarhallow", toX: 28, toY: 8, facing: "down" }],
  npcs: [
    { id: "shrine_keeper", sprite: "elder", x: 10, y: 21, facing: "down", movement: "static", script: "ch5_shrine_keeper" },
  ],
  hidden: [{ x: 16, y: 17, item: "rain_jar" }, { x: 3, y: 9, item: "glass_pod" }],
  signs: [],
  triggers: [
    { x: 2, y: 5, script: "q_shrine_offerings_shrine_1", when: when({ got_lantern: true }) },
    { x: 17, y: 5, script: "q_shrine_offerings_shrine_2", when: when({ got_lantern: true }) },
    { x: 2, y: 14, script: "q_shrine_offerings_shrine_3", when: when({ got_lantern: true }) },
  ],
  encounters: { grass: { rate: 10, slots: [
    { species: "ghostpipe_stalk", minLevel: 20, maxLevel: 21, weight: 30 },
    { species: "ghostpipe_nodding", minLevel: 22, maxLevel: 25, weight: 35 },
    { species: "moonflower", minLevel: 22, maxLevel: 25, weight: 20, time: "night" },
    { species: "cedar_seedling", minLevel: 22, maxLevel: 25, weight: 15 },
  ] } },
};
