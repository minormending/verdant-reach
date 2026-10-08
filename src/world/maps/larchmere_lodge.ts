import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const larchmere_lodge: MapDef = {
  id: "larchmere_lodge", name: "LAKESIDE LODGE", outdoor: false, music: "herbarium", ambient: "none",
  border: "void",
  // A cosy timber common room: shelves line the north wall, and only the K shelf hides the stair.
  legend: { ...LEGEND, b: "bookshelf" },
  tiles: [
    "WWWWOWOWWWWWWW",
    "WFwwwwpwbbbbbW",
    "WwCCCCwwbbKbbW",
    "WwwwwwwwwwwwwW",
    "WYwwwwrrrrrwwW",
    "WwDhwwrhDhrwwW",
    "WwhwwwrrrrrwYW",
    "WwwwwwwwwwwwwW",
    "WpwwwwwwwwwwpW",
    "WwwwwwwwwwwwwW",
    "WYwwwwrrwwwwYW",
    "WWWWWWEWWWWWWW",
  ],
  legendWhen: [{ when: when({ lodge_stair_open: true }), legend: { K: "stairs_down" } }],
  structures: [],
  warps: [{ x: 6, y: 11, to: "larchmere", toX: 26, toY: 23, facing: "down" }],
  npcs: [
    { id: "lodge_keeper", sprite: "lodge_keeper", x: 3, y: 1, facing: "down", script: "ch7_lodge_keeper" },
    { id: "grunt_lodge", sprite: "grunt", x: 9, y: 9, facing: "left", script: "ch7_lodge_grunt", visibleWhen: when({ lodge_grunt_seen: false }) },
  ],
  signs: [], triggers: [
    { x: 6, y: 9, w: 2, script: "ch7_lodge_grunt", when: when({ lodge_grunt_seen: false }) },
    { x: 10, y: 2, script: "ch7_bookcase" },
  ],
};
