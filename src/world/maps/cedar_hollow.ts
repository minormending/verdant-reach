import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

// Inside the living trunk: worn heartwood floors ringed like the tree itself.
// Two clumps of glowing ghost pipes light the entrance hall. Beyond the
// keeper, the central aisle branches to three carved shrine posts and two
// mossy courts of sword fern, with pale ghost pipes in the corners.
export const cedar_hollow: MapDef = {
  id: "cedar_hollow", name: "THE HOLLOW", outdoor: false, dark: true,
  music: "hollow", border: "void", ambient: "spores",
  legend: {
    ...LEGEND, W: "hollow_wall", w: "shrine_floor", ".": "moss", ",": "fern_brush",
    "!": "carved_post", "6": "glow_pipe", g: "ghostpipe_clump",
  },
  tiles: [
    "WWWWWWWWWWWWWWWWWWWW", // 0
    "WWWWWWWWWWWWWWWWWWWW", // 1
    "WWWWWWW......WWWWWWW", // 2
    "WWWWWWW.,,,,.WWWWWWW", // 3
    "WWwwwww.,,,,.wwwwwWW", // 4
    "WW!wwww.,,,,.wwww!WW", // 5
    "WW.....w....wwwwwgWW", // 6
    "WW.,,,,.wwwwwwwwwwWW", // 7
    "WW.,,,,.wwwwwwwwwwWW", // 8
    "WW.,,,,.wwwwwwwwwgWW", // 9
    "WWWWWWWwwwwwwWWWWWWW", // 10
    "WWWWWWWwwwwwwWWWWWWW", // 11
    "WWgwwwwwwwwww......W", // 12
    "WWwwwwwwwwww.,,,,,.W", // 13
    "WW!wwwwwwwww.,,,,,.W", // 14
    "WWwwwwwwwwww.,,,,,.W", // 15
    "WWwwwwwwwwww.,,,,,.W", // 16
    "WWgwwwwwwwww.......W", // 17
    "WWWWWWWwwwwwwWWWWWWW", // 18
    "WWWWWWgwwwwwwwgWWWWW", // 19
    "WWWWWWwwwwwwwwWWWWWW", // 20
    "WWWWWWwwwwww6wWWWWWW", // 21
    "WWWWWWww6wwwwwWWWWWW", // 22
    "WWWWWWWWWEWWWWWWWWWW", // 23
  ],
  structures: [],
  warps: [{ x: 9, y: 23, to: "cedarhallow", toX: 28, toY: 8, facing: "down" }],
  npcs: [
    { id: "shrine_keeper", sprite: "shrine_keeper", x: 10, y: 21, facing: "down", movement: "static", script: "ch5_shrine_keeper" },
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
