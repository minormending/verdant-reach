import type { MapDef } from "../../contracts";
import { OUTDOOR, pickups, when, type Scripts } from "../build";

// SUGARBUSH GROVE (dungeon). A maze of sugar maples, the tapped ones (X)
// trailing tubing. From the entrance clearing the lane forks: west to a
// grassy dead end with a RAIN JAR, east up a narrow lane where a grunt waits
// in a side gap, looking across it. The lane opens into ROOTSTOCK's camp
// (crates, sap drums, a workbench), watched by a second grunt. GLASS PODS sit
// behind the crates. A trail north-west climbs to a long avenue where a third
// grunt steps out of a gap, then a cleft opens onto the top clearing, ringed with
// tapped maples and sap drums, where SHEARS waits.
const hideWhenCleared = when({ grove_cleared: false });

export const sugarbush_grove: MapDef = {
  id: "sugarbush_grove",
  name: "SUGARBUSH GROVE",
  outdoor: true,
  music: "sugarbush_grove",
  border: "maple_tree",
  legend: OUTDOOR,
  // The taps come out once ROOTSTOCK leaves the grove.
  legendWhen: [{ when: [{ flag: "grove_cleared", is: true }], legend: { X: "maple_tree" } }],
  ambient: "leaves",
  tiles: [
    // x: 0123456789012345678901234567
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMM", // 0
    "MMMMMMMMMX7.J8..87XMMMMMMMMM", // 1  SHEARS's clearing: drums, crates, bench
    "MMMMMMMMX..+++++..7XMMMMMMMM", // 2
    "MMMMMMMM7...+++....7MMMMMMMM", // 3
    "MMMMMMMMX5.....35..XMMMMMMMM", // 4
    "MMMMMMMMMMMMX..XMMMMMMMMMMMM", // 5  the cleft (trigger)
    "MMMM..5.MMMMM..MMMMMMMMMMMMM", // 6  GLASS POD nook at 7,6
    "MMMM.XMMMMM.M..MMMMMMMMMMMMM", // 7  grunt 3 waits in a gap above the avenue
    "MMMM..,,.......XMMMMMMMMMMMM", // 8  the avenue
    "MMMM..MMMMMMMMMMMMMMMMMMMMMM", // 9
    "MMMX..XMMMMMMMMMMMMMMMMMMMMM", // 10
    "MM,,.....78MM.,MMMMMMMMMMMMM", // 11 ROOTSTOCK camp; GLASS POD behind crates
    "MM,,.+J++...8.,MMMMMMMMMMMMM", // 12
    "MM..+++++...88.MMMMMMMMMMMMM", // 13
    "MM..4+++..,,,..MMMMMMMMMMMMM", // 14
    "MM.........7........XMMMMMMM", // 15 grunt 2 watches the camp mouth
    "MM.,,,...MMM........MMMMMMMM", // 16
    "MMM,,,..MMMMMMMMMX..MMMMMMMM", // 17
    "MMMMMMMMMMMMMMMMMM.,,.MMMMMM", // 18
    "MMMMMMMMMMMMMMMMMMMX..XMMMMM", // 19
    "MMMMMMMMMMMMMMMMMMMM,,MMMMMM", // 20
    "MMMMMMMMMMMMMMMMM.....MMMMMM", // 21 grunt 1 in the side gap
    "MMMMMMMMMMMMMMMMMM....MMMMMM", // 22
    "MM.,,MMMMMMMMMMMX.....MMMMMM", // 23 RAIN JAR dead end
    "MM,,,,..4.............MMMMMM", // 24 entrance clearing, the fork
    "MMMMMMX......::.....XMMMMMMM", // 25
    "MMMMMMMMMMMM.::.MMMMMMMMMMMM", // 26
    "MMMMMMMMMMMMM::MMMMMMMMMMMMM", // 27 to SUGARBUSH
  ],
  structures: [],
  warps: [
    { x: 13, y: 27, to: "sugarbush", toX: 14, toY: 1, facing: "down" },
    { x: 14, y: 27, to: "sugarbush", toX: 15, toY: 1, facing: "down" },
  ],
  npcs: [
    { id: "grunt1", sprite: "grunt", x: 17, y: 21, facing: "right", trainer: "grunt_grove_1", sight: 4, visibleWhen: hideWhenCleared },
    { id: "grunt2", sprite: "grunt", x: 12, y: 15, facing: "right", trainer: "grunt_grove_2", sight: 4, visibleWhen: hideWhenCleared },
    { id: "grunt3", sprite: "grunt", x: 11, y: 7, facing: "down", trainer: "grunt_grove_3", sight: 1, visibleWhen: hideWhenCleared },
    { id: "shears", sprite: "shears", x: 13, y: 2, facing: "down", movement: "static", script: "shears", visibleWhen: hideWhenCleared },
    { id: "bird", sprite: "bird", x: 10, y: 24, facing: "left", movement: "wander", script: "grove_bird",
      visibleWhen: when({ grove_cleared: true }) },
    ...pickups([
      { item: "glass_pod", x: 13, y: 11 },
      { item: "glass_pod", x: 7, y: 6, n: 2 },
      { item: "rain_jar", x: 2, y: 23 },
    ]),
  ],
  signs: [],
  triggers: [
    { x: 13, y: 5, w: 2, script: "shears", when: hideWhenCleared },
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

export const scripts: Scripts = {
  grove_bird: [
    { op: "say", text: "A woodpecker drums on a maple, testing the bark where the taps were." },
  ],
};
