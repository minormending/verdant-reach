import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const relay_3f: MapDef = {
  id: "relay_3f", name: "PATCH BAY", outdoor: false, music: "root_relay",
  musicWhen: [{ when: when({ ch8_started: true, beat_wren: false }), music: "relay_seized" }],
  border: "void", legend: { ...LEGEND, "=": "cable_trunk", t: "relay_terminal", b: "rootstock_banner", g: "hideout_floor" },
  // The console row (A, B, C at 5, 8, 11) is the room's focus: trunks come
  // down both walls and along the north wall (behind the roof stair) into A
  // and C, patch leads join A-B and B-C, ROOTSTOCK's banner hangs over B and
  // a dark grate deck lies in front of the row. Two banks of operator desks
  // face it; the grunts' lines and the stair approach stay open.
  tiles: [
    "WWWWWWWWbWWWWWWWWW",
    "W====x==x==x=====W",
    "W=/ggggggggggg/U=W",
    "W=/ggggggggggg//=W",
    "W=//////////////=W",
    "W=//////////////=W",
    "W////////////////W",
    "W////////////////W",
    "W////////////////W",
    "W///ttt////ttt///W",
    "W////////////////W",
    "W////////////////W",
    "W/u//////////////W",
    "WWWWWWWWWWWWWWWWWW",
  ],
  legendWhen: [{ when: when({ relay_patched: false }), legend: { U: "wall" } }],
  structures: [],
  warps: [
    { x: 2, y: 12, to: "relay_2f", toX: 17, toY: 3, facing: "down" },
    { x: 15, y: 2, to: "relay_roof", toX: 2, toY: 9, facing: "up" },
  ],
  npcs: [
    { id: "grunt_r3_1", sprite: "grunt", x: 6, y: 7, facing: "right", trainer: "grunt_r3_1", sight: 3,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    { id: "grunt_r3_2", sprite: "grunt", x: 12, y: 4, facing: "down", trainer: "grunt_r3_2", sight: 3,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    { id: "bram_r3", sprite: "bram", x: 3, y: 11, facing: "up", movement: "static", script: "ch8_bram_after",
      visibleWhen: when({ ch8_bram_met: true, beat_wren: false }) },
  ],
  signs: [],
  // Arrival scripts also run onEnter: warps land beside, rather than on, stairs.
  onEnter: "ch8_bram",
  triggers: [
    { x: 5, y: 1, script: "ch8_console_a" },
    { x: 8, y: 1, script: "ch8_console_b" },
    { x: 11, y: 1, script: "ch8_console_c" },
    { x: 2, y: 11, script: "ch8_bram", when: when({ ch8_bram_met: false }) },
  ],
};
