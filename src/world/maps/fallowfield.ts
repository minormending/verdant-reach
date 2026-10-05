import type { MapDef } from "../../contracts";
import { LEGEND, face, emote, ifFlags, ifNight, lockedDoor, movePlayer, say, when, type Scripts } from "../build";

// Home town. Herbarium to the north-east, the player's house to the
// north-west, a fenced fallow field, a pond, and the lane north to ROUTE 1.
export const fallowfield: MapDef = {
  id: "fallowfield",
  name: "FALLOWFIELD",
  outdoor: true,
  music: "fallowfield",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTTTTTTT::TTTTTTTTTTT", // 0
    "TTT....TT..::..TTT..*TTT", // 1
    "TT.*.......::..*......TT", // 2
    "T..@@@@....::..@@@@@@..T", // 3
    "T..@@@@....::..@@@@@@..T", // 4
    "T..@@@@m...::..@@@@@@..T", // 5
    "T*..:...*..::.S@@@@@@*.T", // 6
    "T*..:::::::::::::::..*.T", // 7
    "T.........S::..........T", // 8
    "T.#######..::..@@@@....T", // 9
    "T.#+++++#..::..@@@@.*..T", // 10
    "T.#+++++#..::..@@@@.*..T", // 11
    "T.#+++++#..:::::::.....T", // 12
    "T.#+++++#..::...*@@@@@.T", // 13
    "T.#######..::...*@@@@@.T", // 14
    "T..........::....@@@@@.T", // 15
    "T~~~~......::....@@@@@.T", // 16
    "T~~~~~.....:::::::::...T", // 17
    "T~~~~*......*..........T", // 18
    "TTTTTTTTTTTTTTTTTTTTTTTT", // 19
  ],
  structures: [
    { key: "house_small", x: 3, y: 3 },  // player's house, door 4,5
    { key: "herbarium", x: 15, y: 3 },   // door 17,6
    { key: "house_small", x: 15, y: 9 }, // Pip's house, door 16,11
    { key: "house_large", x: 17, y: 13 }, // door 19,16
  ],
  warps: [
    { x: 11, y: 0, to: "route_1", toX: 9, toY: 34, facing: "up" },
    { x: 12, y: 0, to: "route_1", toX: 10, toY: 34, facing: "up" },
    { x: 4, y: 5, to: "player_home", toX: 4, toY: 6, facing: "up" },
    { x: 17, y: 6, to: "herbarium", toX: 4, toY: 9, facing: "up" },
  ],
  npcs: [
    { id: "lookout", sprite: "villager_a", x: 10, y: 2, facing: "right", movement: "look_around", script: "ff_lookout" },
    { id: "farmer", sprite: "villager_b", x: 9, y: 11, facing: "left", movement: "look_around", script: "ff_farmer" },
    { id: "elder", sprite: "elder", x: 13, y: 9, facing: "down", movement: "static", script: "ff_elder" },
    { id: "kid", sprite: "kid", x: 21, y: 11, facing: "down", movement: "wander", script: "ff_kid" },
    { id: "pip", sprite: "pip", x: 6, y: 17, facing: "left", movement: "look_around", script: "ff_pip", visibleWhen: when({ got_seed: false }) },
    { id: "bram", sprite: "bram", x: 13, y: 8, facing: "right", movement: "static", script: "ff_bram_wait",
      visibleWhen: when({ theft_seen: true, rival_1_done: false }) },
  ],
  signs: [
    { x: 10, y: 8, text: "FALLOWFIELD. Where fields rest before they grow." },
    { x: 14, y: 6, text: "FALLOWFIELD HERBARIUM. DR. I. VALE, Director." },
    { x: 7, y: 5, text: "<PLAYER>'s house." },
  ],
  triggers: [
    { x: 11, y: 1, w: 2, script: "ff_gate", when: when({ got_starter: false }) },
    { x: 16, y: 11, script: "ff_door_pip" },
    { x: 19, y: 16, script: "ff_door_large" },
  ],
  onEnter: "ff_enter",
};

export const scripts: Scripts = {
  ff_enter: [
    ifFlags({ theft_seen: true, rival_1_done: false }, [{ op: "call", script: "rival_1" }]),
  ],
  ff_gate: [
    emote("lookout", "!"),
    face("lookout", "toPlayer"),
    say("Hold on! The tall grass up there is rustling with QUICKENED."),
    say("Don't go out without a partner of your own!"),
    movePlayer("down"),
  ],
  ff_lookout: [
    ifFlags({ got_starter: true }, [
      say("Heading up ROUTE 1? Keep to the lanes. The hedges are wide awake now."),
    ], [
      say("DR. VALE was out at dawn, talking to her tomatoes. Normal for her."),
      say("But the tomatoes leaned over to listen. Not normal."),
    ]),
  ],
  ff_farmer: [
    say("This plot's lying fallow. Resting a season, so the soil gets its breath back."),
    ifNight(
      [say("Funny. At night I'd swear the furrows hum.")],
      [say("Weeds will move in. Funny thing is, now they move in on purpose.")],
    ),
  ],
  ff_elder: [
    ifNight(
      [say("A hundred years ago my grandmother saw that bloom. Said the woods listened after.")],
      [say("Gold dust on every windowsill this morning. The CENTURYHEART's pollen, they say.")],
    ),
    say("The old songs had it: the heart blooms and the woods listen."),
  ],
  ff_kid: [
    say("Mum says don't trample the flowers. Now the flowers say it too!"),
  ],
  ff_pip: [
    say("I'm PIP! I know a fact about every plant in FALLOWFIELD. Well, most."),
    say("Water lilies fold up their flowers every evening. Like going to bed!"),
  ],
  ff_bram_wait: [
    { op: "call", script: "rival_1_battle" },
  ],
  ff_door_pip: lockedDoor("It's locked. A note on the door: \"Out looking at plants! -PIP\""),
  ff_door_large: lockedDoor("It's locked. Someone inside is singing to their ferns."),
};
