import type { MapDef } from "../../contracts";
import { OUTDOOR, when } from "../build";

export const council_arboretum: MapDef = {
  id: "council_arboretum", name: "ARBORETUM", outdoor: true, music: "small_town",
  border: "aspen_tree",
  // The Grove's aspens ring the gardens; its litter and roots spill through the open gate.
  legend: { ...OUTDOOR, a: "aspen_tree", g: "grove_floor", r: "root_vein" },
  tiles: [
    "aaaaaaaaaaaaaaagrgaaaaaaaaaaaaaaaa",
    "aaaaggaaggggggggrgggggggggaaggaaaa",
    "aaaggggggagggrrrrggrrgggaggggggaaa",
    "aaggaggggggggrggrrrgggggggggagggaa",
    "aggggggggggg@@@@r@@@@gggggggggggga",
    "aLLLLLLLLLLL@@@@r@@@@LLLLLLLLLLLLa",
    "a.HHHHHHHHH.....1...HHHHHHHHHHHH.a",
    "a.Hffyff*fH.....1...Hff*ffyff*fH.a",
    "a.HHHH.HHHH.....1...HHHHH..HHHHH.a",
    "a..........11111111..............a",
    "a.@@@.y*f..1@@@@@@1..f*y...@@@...a",
    "a.@@@.*fy..1@@@@@@1..*fy...@@@.6.a",
    "a.@@@.fy*..1@@@@@@1..yf*...@@@...a",
    "a.@@@......1@@@@@@1......9.......a",
    "a..)))))).-----------.)))))).....a",
    "a.........-----------............a",
    "a.11111111111111111111111111111..a",
    "a...@@@@.9.6..@@@.6.9........16..a",
    "a...@@@@......@@@............1...a",
    "a...@@@@......@@@............19..a",
    "a.....1......................1...a",
    "a..111111111111111111111111111...a",
    "aHHHHHHH....HHHHHHHHHH.......11111",
    "aHf*yf..@@..Hf*yff*yfH.@@@.......a",
    "aHy*ff..@@..HHHH..HHHH.@@@.*ff...a",
    "a......................@@@.fy*...a",
    "a................................a",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ],
  structures: [
    { key: "council_hall", x: 12, y: 10 }, { key: "greenhouse", x: 4, y: 17 },
    // The Grove Gate: a tower either side of the open gap in the wall.
    { key: "grove_gate", x: 12, y: 4 }, { key: "grove_gate", x: 17, y: 4 },
    // The formal garden's fountain on the hall's axis, and the Council's specimen trees.
    { key: "fountain", x: 14, y: 17 }, { key: "giant_cedar", x: 2, y: 10 }, { key: "big_oak", x: 27, y: 10 },
    { key: "dragon_tree_big", x: 23, y: 23 }, { key: "big_maple", x: 8, y: 23 },
  ],
  warps: [
    { x: 33, y: 22, to: "route_12", toX: 1, toY: 3, facing: "right" },
    { x: 6, y: 19, to: "arboretum_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 15, y: 13, to: "council_hall", toX: 7, toY: 10, facing: "up" },
    { x: 16, y: 0, to: "elder_grove_1", toX: 15, toY: 28, facing: "up" },
  ],
  npcs: [
    { id: "grunt_arb_1", sprite: "grunt", x: 14, y: 7, facing: "down", trainer: "grunt_arb_1", sight: 1 },
    { id: "grunt_arb_2", sprite: "grunt", x: 18, y: 7, facing: "down", trainer: "grunt_arb_2", sight: 1 },
    { id: "grunt_arb_3", sprite: "grunt", x: 18, y: 3, facing: "left", trainer: "grunt_arb_3", sight: 1 },
    { id: "bram_arboretum", sprite: "bram", x: 21, y: 20, facing: "left", script: "ch10_bram_joins", visibleWhen: when({ bram_joined: false }) },
    { id: "rowan_arboretum", sprite: "vale", x: 17, y: 14, facing: "down", script: "ch10_end", visibleWhen: when({ beat_mercer: true }) },
  ],
  signs: [],
  triggers: [
    { x: 16, y: 1, script: "ch10_bram_joins", when: when({ bram_joined: false }) },
    { x: 15, y: 14, script: "ch10_council_door", when: when({ ch10_done: false }) },
    { x: 22, y: 20, script: "ch10_bram_joins", when: when({ bram_joined: false }) },
  ],
  onEnter: "ch10_arboretum_enter",
};
