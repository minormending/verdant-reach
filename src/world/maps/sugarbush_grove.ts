import type { MapDef } from "../../contracts";
import { LEGEND, pickups, when, type Scripts } from "../build";

// Dungeon: a maze of sugar maples, many of them tapped by ROOTSTOCK. Three
// grunts guard the lanes; SHEARS waits in the clearing at the top. A dead-end
// west branch hides GLASS PODS.
const hideWhenCleared = when({ grove_cleared: false });

export const sugarbush_grove: MapDef = {
  id: "sugarbush_grove",
  name: "SUGARBUSH GROVE",
  outdoor: true,
  music: "sugarbush_grove",
  border: "maple_tree",
  legend: LEGEND,
  // The taps come out once ROOTSTOCK leaves the grove.
  legendWhen: [{ when: [{ flag: "grove_cleared", is: true }], legend: { X: "maple_tree" } }],
  tiles: [
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMM", // 0
    "MMMMMMMX.,,,........XMMMMMMM", // 1
    "MMMMMMMM.,,,........MMMMMMMM", // 2
    "MMMMMMMX............XMMMMMMM", // 3
    "MMMMMMMM..X......X..MMMMMMMM", // 4
    "MMMMMMMM............MMMMMMMM", // 5
    "MMMMMMMMMMMM..MMMMMMMMMMMMMM", // 6
    "MMMMMMMMMMMM..MMMMMMMMMMMMMM", // 7
    "MMMMMMMMMMMX..XMMMMMMMMMMMMM", // 8
    "MMMMMMMMMMMM.....,,,.....MMM", // 9
    "MMM........M.............MMM", // 10
    "MMM........MMMMMMMMMMMX..MMM", // 11
    "MMM..MMM...MMMXMMMMMMMM..XMM", // 12
    "MMM,,MMM...MMMM......XM,,MMM", // 13
    "MMM,,MMM...MMMM......MM,,MMM", // 14
    "MMX,,MMMMMMMMMM........,,MMM", // 15
    "MMM,,MMMMMMMMMM,,,,..MM..MMM", // 16
    "MMM,,MMMMMMMMMX,,,,..MM..MMM", // 17
    "MMM..MMMMMMMMMMMMMMMMMM..MMM", // 18
    "MMM..XMMMXMMMMMMMMXMMMM..MMM", // 19
    "MMM...,,,....::...MMMMX..MMM", // 20
    "MMM...,,,....::....,,,...MMM", // 21
    "MMMMMMMMMM...::....,,,...XMM", // 22
    "MMMMMMMMMM...::...MMMMMMMMMM", // 23
    "MMMMMMMMMMMMM::MMMMMMMMMMMMM", // 24
    "MMMMMMMMMMMMM::MMMMMMMMMMMMM", // 25
  ],
  structures: [],
  warps: [
    { x: 13, y: 25, to: "sugarbush", toX: 14, toY: 1, facing: "down" },
    { x: 14, y: 25, to: "sugarbush", toX: 15, toY: 1, facing: "down" },
  ],
  npcs: [
    { id: "grunt1", sprite: "grunt", x: 24, y: 17, facing: "down", trainer: "grunt_grove_1", sight: 3, visibleWhen: hideWhenCleared },
    { id: "grunt2", sprite: "grunt", x: 20, y: 10, facing: "right", trainer: "grunt_grove_2", sight: 3, visibleWhen: hideWhenCleared },
    { id: "grunt3", sprite: "grunt", x: 13, y: 7, facing: "down", trainer: "grunt_grove_3", sight: 3, visibleWhen: hideWhenCleared },
    { id: "shears", sprite: "shears", x: 13, y: 2, facing: "down", movement: "static", script: "shears", visibleWhen: hideWhenCleared },
    ...pickups([
      { item: "glass_pod", x: 10, y: 10 },
      { item: "glass_pod", x: 18, y: 14, n: 2 },
      { item: "rain_jar", x: 9, y: 14 },
    ]),
  ],
  signs: [],
  triggers: [
    { x: 12, y: 5, w: 2, script: "shears", when: hideWhenCleared },
  ],
  encounters: {
    grass: {
      rate: 14,
      slots: [
        { species: "maple_samara", minLevel: 10, maxLevel: 13, weight: 50 },
        { species: "fern_fiddlehead", minLevel: 10, maxLevel: 13, weight: 40 },
        { species: "maple_sapling", minLevel: 13, maxLevel: 14, weight: 10 },
      ],
    },
  },
};

export const scripts: Scripts = {};
