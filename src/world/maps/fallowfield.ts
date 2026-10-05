import type { MapDef } from "../../contracts";
import { OUTDOOR, emote, face, ifFlags, ifNight, lockedDoor, movePlayer, say, when, type Scripts } from "../build";

// Home town, a farming village. The HERBARIUM stands on its stone forecourt to
// the north-east; the hedged lane north to ROUTE 1 runs straight into the
// square and its well. West: home, the kitchen garden, the windmill and barn,
// and the fields (one plot lying fallow, as the name promises). South-east: the
// duck pond. The south road to SALTMARSH HARBOUR is shut while the ford floods.
//
//            0         1         2
//            0123456789012345678901234567
export const fallowfield: MapDef = {
  id: "fallowfield",
  name: "FALLOWFIELD",
  outdoor: true,
  music: "fallowfield",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    "TTTTTTTTTTTTT::TTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTH::HTTTTTTTTTTTT", // 1
    "TTTT.....TTTH::H........TTTT", // 2
    "T..y.f.####TH::H.*@@@@@@y.TT", // 3
    "T.@@@@.#GG#.H::HS.@@@@@@...T", // 4
    "T.@@@@.#GG#.H::Hf.@@@@@@.y.T", // 5
    "T*@@@@m#GG#.f::y.6@@@@@@6..T", // 6
    "T..:...#N##.S::...111111...T", // 7
    "T..::::::::::::::::::.*.f..T", // 8
    "T.n.+....f61111116y.......TT", // 9
    "T@@@+@@@@@7111111..@@@@.T..T", // 10
    "T@@@+@@@@@.11@@11..@@@@.y..T", // 11
    "T@@@+@@@@@911@@119.@@@@....T", // 12
    "T@@@+@@@@@8111111.:::..f*..T", // 13
    "Tnn7++++++*111111*:...@@@@@T", // 14
    "T...++++++...::...:...@@@@@T", // 15
    "T###N######..::...:...@@@@@T", // 16
    "T#kk+kk+++#..::.5.:...@@@@@T", // 17
    "T#+++j++++#..::...:::::::..T", // 18
    "T#kk+kk+++#..::...q~~~~~q..T", // 19
    "T#++++++++#..::S.9~0~~~~~35T", // 20
    "TTTT#######TL88L..q~~~0~~TTT", // 21
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 22
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT", // 23
  ],
  structures: [
    { key: "house_small", x: 2, y: 4 },   // home, door 3,6
    { key: "herbarium", x: 18, y: 3 },    // door 20,6
    { key: "windmill", x: 1, y: 10 },
    { key: "barn", x: 5, y: 10 },
    { key: "well", x: 13, y: 11 },
    { key: "house_small", x: 19, y: 10 }, // PIP's house, door 20,12
    { key: "house_large", x: 22, y: 14 }, // door 24,17
  ],
  warps: [
    { x: 13, y: 0, to: "route_1", toX: 10, toY: 38, facing: "up" },
    { x: 14, y: 0, to: "route_1", toX: 11, toY: 38, facing: "up" },
    { x: 3, y: 6, to: "player_home", toX: 4, toY: 6, facing: "up" },
    { x: 20, y: 6, to: "herbarium", toX: 4, toY: 11, facing: "up" },
  ],
  npcs: [
    { id: "lookout", sprite: "villager_a", x: 14, y: 5, facing: "up", movement: "look_around", script: "ff_lookout" },
    { id: "farmer", sprite: "villager_b", x: 8, y: 18, facing: "left", movement: "look_around", script: "ff_farmer" },
    { id: "elder", sprite: "elder", x: 12, y: 11, facing: "right", movement: "static", script: "ff_elder" },
    { id: "kid", sprite: "kid", x: 16, y: 13, facing: "down", movement: "wander", script: "ff_kid" },
    { id: "miller", sprite: "hiker", x: 2, y: 15, facing: "up", movement: "look_around", script: "ff_miller" },
    { id: "pip", sprite: "pip", x: 16, y: 19, facing: "right", movement: "look_around", script: "ff_pip", visibleWhen: when({ got_seed: false }) },
    { id: "bram", sprite: "bram", x: 16, y: 8, facing: "right", movement: "static", script: "ff_bram_wait",
      visibleWhen: when({ theft_seen: true, rival_1_done: false }) },
    // ambient life
    { id: "cat", sprite: "cat", x: 2, y: 7, facing: "down", movement: "static", script: "ff_cat" },
    { id: "dog", sprite: "dog", x: 11, y: 14, facing: "left", movement: "wander", script: "ff_dog" },
    { id: "crow", sprite: "bird", x: 6, y: 18, facing: "left", movement: "look_around", script: "ff_crow" },
  ],
  signs: [
    { x: 12, y: 7, text: "FALLOWFIELD. Fields at rest, ready to grow." },
    { x: 16, y: 4, text: "FALLOWFIELD HERBARIUM. DR. I. VALE, Director." },
    { x: 6, y: 6, text: "<PLAYER>'s house. Post for JUNE goes in too." },
    { x: 15, y: 20, text: "SOUTH: SALTMARSH HARBOUR. Road shut while the ford's in flood." },
  ],
  triggers: [
    { x: 13, y: 1, w: 2, script: "ff_gate", when: when({ got_starter: false }) },
    { x: 20, y: 12, script: "ff_door_pip" },
    { x: 24, y: 17, script: "ff_door_large" },
  ],
  onEnter: "ff_enter",
};

export const scripts: Scripts = {
  ff_enter: [
    ifFlags({ theft_seen: true, rival_1_done: false }, [{ op: "call", script: "rival_1" }]),
  ],
  ff_gate: [
    emote("lookout", "!"),
    face("lookout", "down"),
    say("Whoa, hold up! The grass past the hedges is rustling."),
    say("QUICKENED. Lots. Don't go out there without a partner."),
    movePlayer("down"),
  ],
  ff_lookout: [
    ifFlags({ got_pods: true }, [
      ifFlags({ beat_hollis: true }, [
        say("A PRESSED MARK from HOLLIS! He doesn't hand those out for good manners."),
      ], [
        say("BRAMBLEGATE's past HEDGEROW, then west on ROUTE 2. Mind the ledges."),
      ]),
    ], [
      ifFlags({ got_starter: true }, [
        say("ROUTE 1's hedges are wide awake now. Keep to the lane and they'll mostly let you be."),
      ], [
        say("DR. VALE was out at dawn, talking to her tomatoes. Normal."),
        say("The tomatoes leaned in to listen. Not normal."),
      ]),
    ]),
  ],
  ff_farmer: [
    say("This plot's lying fallow. A season off, so the soil gets its breath back."),
    ifNight(
      [say("Funny. At night I'd swear the furrows hum.")],
      [say("Clover goes in next. Its roots pull nitrogen out of thin air. Free fertiliser!")],
    ),
  ],
  ff_elder: [
    ifFlags({ got_pods: true }, [
      say("FENNIMORE wrote to VALE? Then he's worried. He only writes when he's worried."),
    ], [
      ifNight(
        [say("My grandmother saw the last bloom. Said the woods listened, after.")],
        [say("Gold dust on every sill this morning. CENTURYHEART pollen, they say.")],
      ),
      say("The old songs had it: the heart blooms and the woods listen."),
    ]),
  ],
  ff_kid: [
    ifFlags({ got_starter: true }, [
      say("Is that a QUICKENED? Can it do tricks? Can it do a backflip?"),
    ], [
      say("Mum says don't trample the flowers. Now the flowers say it too!"),
    ]),
  ],
  ff_miller: [
    say("No wind all week, and the sails won't turn. Can't grind a thing."),
    say("Meanwhile the grain in the loft keeps sprouting. Every seed's in a hurry."),
  ],
  ff_pip: [
    say("I'm PIP! I know a fact about every plant in FALLOWFIELD. Well, most."),
    say("Water lilies close up at dusk and open at dawn. Like going to bed!"),
  ],
  ff_bram_wait: [
    { op: "call", script: "rival_1_battle" },
  ],
  ff_cat: [
    say("The cat blinks slowly at you. In cat, that means you may pass."),
  ],
  ff_dog: [
    ifFlags({ got_starter: true }, [
      say("The dog sniffs your QUICKENED. Your QUICKENED sniffs back. Friends."),
    ], [
      say("The dog drops a stick at your feet. The stick has sprouted a leaf."),
    ]),
  ],
  ff_crow: [
    say("A crow perches by the scarecrow. It does not look scared."),
  ],
  ff_door_pip: lockedDoor("Locked. A note on the door: \"Out looking at plants! -PIP\""),
  ff_door_large: lockedDoor("Locked. Someone inside is singing to their ferns."),
};
