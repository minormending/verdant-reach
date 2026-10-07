import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const relay_roof: MapDef = {
  id: "relay_roof", name: "RELAY ROOF", outdoor: true, music: "rootstock_appears",
  border: "void", legend: { ...LEGEND, "@": "paving" },
  tiles: [
    "||||||||||||||||",
    "|--------------|",
    "|--------------|",
    "|------@-------|",
    "|------@-------|",
    "|------@-------|",
    "|--------------|",
    "|--------------|",
    "|--------------|",
    "|--------------|",
    "|-u------------|",
    "||||||||||||||||",
  ],
  structures: [{ key: "relay_mast", x: 7, y: 3 }],
  warps: [{ x: 2, y: 10, to: "relay_3f", toX: 15, toY: 3, facing: "down" }],
  npcs: [
    { id: "wren", sprite: "wren", x: 7, y: 6, facing: "down", movement: "static", script: "ch8_wren",
      visibleWhen: when({ beat_wren: false }) },
    { id: "mercer", sprite: "gentleman", x: 8, y: 5, facing: "down", movement: "static", script: "ch8_wren_after",
      visibleWhen: when({ mercer_seen: true }) },
  ],
  signs: [],
  triggers: [{ x: 7, y: 7, script: "ch8_wren", when: when({ beat_wren: false }) }],
};
