import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, say, type Scripts } from "../build";

// Living cedars enclose the town. The northern avenue connects the ranger,
// MORROW and the shrine trunk; the southern path serves travellers and
// branches east toward the fire-scarred stand.
export const cedarhallow: MapDef = {
  id: "cedarhallow", name: "CEDARHALLOW", outdoor: true, music: "small_town",
  border: "tree", legend: OUTDOOR, ambient: "leaves",
  tiles: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TT................................TT", // 2
    "TT................................TT", // 3
    "TT.............@@@@@@.....@@@@@...TT", // 4
    "TT...@@@@......@@@@@@.....@@@@@...TT", // 5
    "TT...@@@@......@@@@@@.....@@@@@...TT", // 6
    "TT...@@@@:.....@@@@@@.....@@@@@...TT", // 7
    "TT......::.6......::....6...::....TT", // 8
    "TT......::........::........::....TT", // 9
    "TT.5....::::::::::::::::::::::....TT", // 10
    "TT......::::::::::::::::::::::....TT", // 11
    "TT......::........::...*....::.5..TT", // 12
    "TT......::........::........::....TT", // 13
    "TT..@@@@::........::.....@@@@:....TT", // 14
    "TT..@@@@::..9.....::.....@@@@:....TT", // 15
    "TT..@@@@::........::.....@@@@:....TT", // 16
    "TT.:::::::::::::::::::::::::::::::::", // 17
    "TT.:::::::::::::::::::::::::::::::::", // 18
    "TT...............::...............TT", // 19
    "TT...............::...9...........TT", // 20
    "TT...............::...............TT", // 21
    "TT.@@@....*......::...............TT", // 22
    "TT.@@@.....*.....::.........@@@...TT", // 23
    "TT.@@@......3....::.........@@@...TT", // 24
    "TT...............::....5....@@@...TT", // 25
    "TT...............::...............TT", // 26
    "TT...............::...............TT", // 27
    "TTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTT", // 28
    "TTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTT", // 29
  ],
  structures: [
    { key: "greenhouse", x: 4, y: 14 }, // door 6,16; glide 6,17
    { key: "market", x: 25, y: 14 }, // door 26,16
    { key: "house_small", x: 5, y: 5 }, // door 6,7
    { key: "conservatory", x: 15, y: 4 }, // door 18,7
    { key: "house_large", x: 26, y: 4 }, // shrine trunk, door 28,7
    { key: "big_oak", x: 3, y: 22 },
    { key: "big_oak", x: 28, y: 23 },
  ],
  warps: [
    { x: 17, y: 29, to: "route_6", toX: 14, toY: 1, facing: "down" },
    { x: 18, y: 29, to: "route_6", toX: 15, toY: 1, facing: "down" },
    { x: 35, y: 17, to: "burnt_stand", toX: 1, toY: 15, facing: "right" },
    { x: 35, y: 18, to: "burnt_stand", toX: 1, toY: 16, facing: "right" },
    { x: 6, y: 16, to: "cedarhallow_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 26, y: 16, to: "cedarhallow_market", toX: 4, toY: 6, facing: "up" },
    { x: 6, y: 7, to: "cedarhallow_house", toX: 4, toY: 6, facing: "up" },
    { x: 18, y: 7, to: "cedarhallow_conservatory", toX: 7, toY: 16, facing: "up" },
    { x: 28, y: 7, to: "cedar_hollow", toX: 9, toY: 22, facing: "up" },
  ],
  npcs: [
    { id: "pip", sprite: "pip", x: 12, y: 11, facing: "down", movement: "look_around", script: "ch5_pip" },
    { id: "resident", sprite: "villager_a", x: 21, y: 17, facing: "left", movement: "look_around", script: "ch5_resident" },
    { id: "elder", sprite: "elder", x: 30, y: 9, facing: "left", movement: "static", script: "ch5_elder" },
    { id: "gardener", sprite: "gardener", x: 10, y: 20, facing: "down", movement: "look_around", script: "ch5_gardener" },
    { id: "traveller", sprite: "hiker", x: 9, y: 15, facing: "down", movement: "static", script: "ch5_traveller" },
    { id: "kid", sprite: "kid", x: 23, y: 23, facing: "left", movement: "wander", script: "ch5_kid" },
    { id: "bird", sprite: "bird", x: 7, y: 24, facing: "up", movement: "wander", script: "ch5_bird" },
  ],
  signs: [],
  triggers: [
    // Step before the warp: a refused visitor moves back to 18,9.
    { x: 18, y: 8, script: "ch5_conservatory_door", when: [{ flag: "burnt_vision_seen", is: false }] },
    { x: 18, y: 8, script: "ch5_conservatory_door", when: [{ flag: "burnt_vision_seen", is: true }, { flag: "got_lantern", is: false }] },
  ],
  onEnter: "ch5_town_enter",
};
export const scripts: Scripts = {
  ch5_town_enter: [
    ifFlags({ ch5_arrived: false }, [{ op: "call", script: "ch5_arrival" }]),
    ifFlags({ beat_morrow: true, ch5_done: false }, [{ op: "call", script: "ch5_end" }]),
  ],
  ch5_pip: [say("TODO(text): ch5_pip")],
  ch5_resident: [say("TODO(text): ch5_resident")],
  ch5_elder: [say("TODO(text): ch5_elder")],
  ch5_gardener: [say("TODO(text): ch5_gardener")],
  ch5_traveller: [say("TODO(text): ch5_traveller")],
  ch5_kid: [say("TODO(text): ch5_kid")],
  ch5_bird: [say("TODO(text): ch5_bird")],
};
