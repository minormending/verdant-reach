import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, say, type Scripts } from "../build";

// Living cedars enclose the town. The northern avenue connects the ranger's
// house (built into a cedar's foot), MORROW's dark glasshouse and THE HOLLOW,
// the oldest trunk; the southern path serves travellers and branches east
// toward the fire-scarred stand. Giant cedars stand between the buildings and
// along the packed-earth lanes, and the old growth pushes in at the edges, so
// every view of the town has a trunk in it.
export const cedarhallow: MapDef = {
  id: "cedarhallow", name: "CEDARHALLOW", outdoor: true, music: "cedarhallow",
  border: "oldgrowth_tree", ambient: "leaves",
  legend: { ...OUTDOOR, T: "oldgrowth_tree", ".": "moss", "@": "moss", ":": "dirt" },
  tiles: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTT.......T..........TT.......TTTTTT", // 2
    "TT........@@@........TTT..@@@@@...TT", // 3
    "TT...@@@@.@@@..@@@@@@.TT..@@@@@....T", // 4
    "TTT..@@@@.@@@..@@@@@@.....@@@@@....T", // 5
    "TTTT.@@@@.@@@5.@@@@@@.....@@@@@....T", // 6
    "TTTT.@@@@......@@@@@@.....@@@@@...TT", // 7
    "TT....::::.6......::....6...::....TT", // 8
    "TT......::........::........::....TT", // 9
    "TT.5....::::::::::::::::::::::....TT", // 10
    "TT......::::::::::::::::::::::.@@@TT", // 11
    "TT......::....@@@.::.@@@....::.@@@TT", // 12
    "T.......::....@@@.::.@@@5...::.@@@TT", // 13
    "TT..@@@@::...5@@@.::.@@@.@@@@:5@@@TT", // 14
    "TT..@@@@::..9.@@@.::.@@@.@@@@:...TTT", // 15
    "TT..@@@@::........::.....@@@@:....TT", // 16
    "TT.:::::::::::::::::::::::::::::::::", // 17
    "TT.:::::::::::::::::::::::::::::::::", // 18
    "TT5..............::...............TT", // 19
    "TT...............::...9........TTTTT", // 20
    "TT.@@@...........::.@@@........TTTTT", // 21
    "TT.@@@....*..4...::.@@@.....@@@.TTTT", // 22
    "TT.@@@.....*.....::.@@@.....@@@...TT", // 23
    "TT.@@@..@@@.3....::5@@@.....@@@...TT", // 24
    "T.......@@@......::....5....@@@.5.TT", // 25
    "TTTT....@@@......::..............TTT", // 26
    "TTTTT...@@@5.....::.............TTTT", // 27
    "TTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTT", // 28
    "TTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTT", // 29
  ],
  structures: [
    { key: "greenhouse", x: 4, y: 14 }, // door 6,16; glide 6,17
    { key: "market", x: 25, y: 14 }, // door 26,16
    { key: "cedar_house", x: 5, y: 4 }, // ranger's house, door 6,7
    { key: "night_conservatory", x: 15, y: 4 }, // door 18,7
    { key: "hollow_trunk", x: 26, y: 3 }, // THE HOLLOW, door 28,7
    { key: "giant_cedar", x: 3, y: 21 },
    { key: "giant_cedar", x: 28, y: 22 },
    { key: "giant_cedar", x: 14, y: 12 },
    { key: "giant_cedar", x: 21, y: 12 },
    { key: "giant_cedar", x: 10, y: 3 },
    { key: "giant_cedar", x: 31, y: 11 },
    { key: "giant_cedar", x: 8, y: 24 },
    { key: "giant_cedar", x: 20, y: 21 },
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
  ch5_pip: [
    ifFlags({ burnt_vision_seen: true }, [
      say("<PLAYER>! FIREWEED fluff can ride the wind a long, long way!"),
      say("That's how it finds a burn so fast. It just floats in and lands!"),
    ], [
      say("<PLAYER>! RED CEDARS aren't real cedars! They're in the cypress family!"),
      say("Real cedars have needles. These have tiny scales, all folded over!"),
    ]),
  ],
  ch5_resident: [
    ifFlags({ beat_morrow: true }, [
      say("MORROW smiled at breakfast today. First time in a month. What did you DO?"),
    ], [
      say("MORROW goes out to the BURNT STAND every night now. Comes back grey with ash."),
    ]),
  ],
  ch5_elder: [
    say("That's THE HOLLOW. Oldest cedar in the valley, and hollow as a drum."),
    ifFlags({ got_lantern: true }, [
      say("The old song goes: the heart blooms, and the woods listen."),
      say("Sixty years I've sung that. Never knew it meant anything."),
    ], [
      say("The keeper lives in there, near enough. Mind your manners."),
    ]),
  ],
  ch5_gardener: [
    say("See that log glowing at night? That's FOXFIRE. A fungus making its own light."),
    say("Not a plant, mind. Fungi are a whole kingdom of their own."),
  ],
  ch5_traveller: [
    say("I came up the CANOPY WALK. Halfway across, the boards swayed."),
    say("There wasn't a breath of wind. I checked."),
  ],
  ch5_kid: [
    say("I hid in a hollow tree for hide-and-seek. Nobody found me all day."),
    say("...Nobody looked all day, either."),
  ],
  ch5_bird: [
    say("A tiny brown wren sings from a cedar root. Its song is far too big for it."),
  ],
};
