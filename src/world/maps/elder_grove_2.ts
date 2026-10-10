import type { MapDef } from "../../contracts";
import { OUTDOOR, when } from "../build";

const GROVE_LEGEND = { ...OUTDOOR, a: "path", b: "path" } satisfies MapDef["legend"];
export const groveEncounters: MapDef["encounters"] = { grass: { rate: 12, slots: [
  { species: "aspen_sucker", minLevel: 41, maxLevel: 41, weight: 40 },
  { species: "ghost_pipe", minLevel: 48, maxLevel: 55, weight: 20 },
  { species: "red_cedar", minLevel: 48, maxLevel: 55, weight: 15 },
  { species: "moonflower", minLevel: 48, maxLevel: 55, weight: 15, time: "night" },
  { species: "cedar_seedling", minLevel: 33, maxLevel: 33, weight: 10 },
] } };

export const elder_grove_2: MapDef = {
  id: "elder_grove_2", name: "ELDER GROVE", outdoor: true, music: "elder_grove",
  border: "tree", legend: GROVE_LEGEND,
  tiles: [
    "TTTTTTTTTTTTTTTNTTTTTTTTTTTTTT",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "T............................T",
    "TTTTTTTTaTTTTTTTTTTTTbTTTTTTTT",
    "T............................T",
    "T............................T",
    "T.......................,,,..T",
    "T.......................,,,..T",
    "TTTTTTTTTTTTTTT:TTTTTTTTTTTTTT",
    "T............................T",
    "T............................T",
    "T............................T",
    "TTTTTTTTaTTTTTTTTTTTTbTTTTTTTT",
    "T............................T",
    "T............................T",
    "T............................T",
    "T.,,,,.......................T",
    "TTTTTTTTTTTTTTT:TTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTT:TTTTTTTTTTTTTT",
    "T............................T",
    "T............................T",
    "T............................T",
    "TTTTTTTTTTTTTTT:TTTTTTTTTTTTTT",
  ],
  // The base legend is the structural-validation view. Runtime always selects
  // exactly one lean, swapping the two separated sets of passage tiles.
  legendWhen: [
    { when: when({ grove_lean: false }), legend: { a: "path", b: "tree" } },
    { when: when({ grove_lean: true }), legend: { a: "tree", b: "path" } },
    { when: when({ beat_calloway_2: false }), legend: { N: "tree" } },
  ],
  structures: [],
  warps: [
    { x: 15, y: 29, to: "elder_grove_1", toX: 15, toY: 1, facing: "down" },
    { x: 15, y: 0, to: "elder_grove_3", toX: 13, toY: 24, facing: "up" },
  ],
  npcs: [
    { id: "grunt_g2_1", sprite: "grunt", x: 5, y: 27, facing: "right", trainer: "grunt_g2_1", sight: 1 },
    { id: "grunt_g2_2", sprite: "grunt", x: 24, y: 14, facing: "left", trainer: "grunt_g2_2", sight: 1 },
    { id: "calloway_2", sprite: "shears", x: 13, y: 3, facing: "down", script: "calloway_2" },
    { id: "bram_ring_2", sprite: "bram", x: 17, y: 3, facing: "left", script: "ch10_bram_ring_2", visibleWhen: when({ bram_joined: true, beat_mercer: false }) },
  ],
  signs: [],
  triggers: [
    { x: 15, y: 24, script: "ch10_listening_clearing" },
    { x: 15, y: 14, script: "ch10_listening_clearing" },
    { x: 15, y: 5, script: "ch10_listening_clearing" },
  ],
  encounters: groveEncounters,
};
