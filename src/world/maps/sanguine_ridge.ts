import type { MapDef } from "../../contracts";
import { OUTDOOR, when } from "../build";

export const sanguine_ridge: MapDef = {
  id: "sanguine_ridge", name: "SANGUINE RIDGE", outdoor: true, music: "ridge", ambient: "none",
  // Dry cliffs ("A") over baked clay ("c"), crowned by dragon's blood trees;
  // Conservatory 8 is built into the north cliff.
  border: "red_rock", legend: { ...OUTDOOR, A: "red_rock", c: "cracked_earth", v: "red_ledge", "@": "cracked_earth" },
  tiles: [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAA@@@AAA@@@AAAAAAAAAAAAAAAAAAAA",
    "AAA@@@AAA@@@AAAAAAAAAAAAAAAAAAAA",
    "AAA@@@cAA@@@AAAAAccAAA@@@@@@AAAA",
    "AAccccccccccAAAcccccAA@@@@@@AAAA",
    "AcccccccccccAAccccAAcA@@@@@@AAcA",
    "AccccccccccccccccAAccA@@@@@@AccA",
    "Accc@@@@cccc@@@cccccccccsssccAcA",
    "Accc@@@@cccc@@@cccccccsssssccAcA",
    "Accc@@@@cccc@@@cccccccsssssccccA",
    "Acccssssssccccccccccccssss@@@ccA",
    "Acccssssssssssssssssssssss@@@ccA",
    "Acccccsssssssssssssssscccc@@@ccA",
    "NcccccccccsssssssssssscccccccccA",
    "AccccAAAccsssssssssssscccccccccA",
    "AAAcccAAcccccccsscccccccccccccAA",
    "AAAAcccccccccccssvvvvvcccccccAAA",
    "AAAAAccccccccccssccccc@@@cccAAAA",
    "AAAAA@@@cccccccssccccc@@@cccAAAA",
    "AAAAA@@@ccAAcccssccccc@@@ccAAAAA",
    "AAAAA@@@ccAAAccsscccccccccAAAAAA",
    "AAAAAccccccAAccssccccccccccAAAAA",
    "AAAAAAcccccccccsscccAAcccAAAAAAA",
    "AAAAAAAccccccccssccAAAAccAAAAAAA",
    "AAAAAAAAcccccccccccAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAccAAAAAAAAAAAAAAA",
  ],
  legendWhen: [{ when: when({ ch9_done: false }), legend: { N: "cliff" } }],
  structures: [
    { key: "greenhouse", x: 4, y: 9 }, { key: "ridge_conservatory", x: 22, y: 5 },
    // Dragon's blood trees: the three stand-in oaks' places, and three more on the terraces.
    { key: "dragon_tree_big", x: 3, y: 3 }, { key: "dragon_tree_big", x: 22, y: 19 }, { key: "dragon_tree_big", x: 5, y: 20 },
    { key: "dragon_tree_big", x: 9, y: 3 }, { key: "dragon_tree_big", x: 12, y: 9 }, { key: "dragon_tree_big", x: 26, y: 12 },
  ],
  warps: [
    { x: 0, y: 15, to: "route_12", toX: 38, toY: 28, facing: "left" },
    { x: 15, y: 27, to: "route_11", toX: 13, toY: 1, facing: "down" },
    { x: 16, y: 27, to: "route_11", toX: 14, toY: 1, facing: "down" },
    { x: 6, y: 11, to: "sanguine_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 25, y: 8, to: "sanguine_conservatory", toX: 8, toY: 18, facing: "up" },
  ],
  npcs: [], signs: [],
  triggers: [{ x: 1, y: 15, script: "ch10_west_gate", when: when({ ch9_done: false }) }, { x: 25, y: 9, script: "ch9_cons8_door", when: when({ rival_5_done: false }) }],
  onEnter: "ch9_end",
};
