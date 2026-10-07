import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const relay_2f: MapDef = {
  id: "relay_2f", name: "SERVER HALL", outdoor: false, music: "root_relay",
  border: "void", legend: LEGEND,
  tiles: [
    "WWWWWWWWWWWWWWWWWWWW",
    "W////////J/////////W",
    "W////////////////U/W",
    "W///[[[[///[[[[////W",
    "W//////////////////W",
    "W//////////////////W",
    "W///[[[[///[[[[////W",
    "W//////////////////W",
    "W//////////////////W",
    "W///[[[[///[[[[////W",
    "W//////////////////W",
    "W//////////////////W",
    "W/u////////////////W",
    "WWWWWWWWWWWWWWWWWWWW",
  ],
  structures: [],
  warps: [
    { x: 2, y: 12, to: "glasshouse_relay", toX: 13, toY: 6, facing: "down" },
    { x: 17, y: 2, to: "relay_3f", toX: 2, toY: 11, facing: "up" },
  ],
  npcs: [
    { id: "grunt_r2_1", sprite: "grunt", x: 4, y: 4, facing: "right", trainer: "grunt_r2_1", sight: 4,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    { id: "grunt_r2_2", sprite: "grunt", x: 14, y: 7, facing: "left", trainer: "grunt_r2_2", sight: 4,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    { id: "grunt_r2_3", sprite: "grunt", x: 4, y: 10, facing: "right", trainer: "grunt_r2_3", sight: 4,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
  ],
  hidden: [{ x: 14, y: 9, item: "spring_water" }],
  signs: [],
  triggers: [{ x: 9, y: 1, script: "ch8_patch_note" }],
};
