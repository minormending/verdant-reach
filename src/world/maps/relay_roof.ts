import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const relay_roof: MapDef = {
  id: "relay_roof", name: "RELAY ROOF", outdoor: true, music: "rootstock_appears",
  // Beyond the railing, the Glasshouse dome's top panes glow with the city below.
  border: "roof_glass", legend: { ...LEGEND, "@": "cable_floor", "=": "cable_trunk", v: "roof_vent" },
  // The mast (7,3..5) stands on a steel service deck reached by a plated
  // walkway from the stair. Seized trunks run into its lattice and its foot
  // from two vent boxes. WREN's and MERCER's cells and their walk east stay clear.
  tiles: [
    "||||||||||||||||",
    "|----v---------|",
    "|--------------|",
    "|-----/@/------|",
    "|-----/@======v|",
    "|-v====@/------|",
    "|-----///------|",
    "|-----///----v-|",
    "|-///////------|",
    "|-/------------|",
    "|-u------------|",
    "||||||||||||||||",
  ],
  structures: [{ key: "relay_mast", x: 7, y: 3 }],
  warps: [{ x: 2, y: 10, to: "relay_3f", toX: 15, toY: 3, facing: "down" }],
  npcs: [
    { id: "wren", sprite: "wren", x: 7, y: 6, facing: "down", movement: "static", script: "ch8_wren",
      visibleWhen: when({ beat_wren: false }) },
    { id: "mercer", sprite: "gentleman", x: 8, y: 5, facing: "down", movement: "static", script: "ch8_wren_after",
      visibleWhen: when({ mercer_seen: true, mercer_left: false }) },
  ],
  signs: [],
  triggers: [{ x: 7, y: 7, script: "ch8_wren", when: when({ beat_wren: false }) }],
};
