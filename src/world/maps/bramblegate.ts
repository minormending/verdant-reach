import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// A town walled by bramble hedges. The CONSERVATORY sits in its own bramble
// court to the north-west; the GREENHOUSE and MARKET face the main street.
export const bramblegate: MapDef = {
  id: "bramblegate",
  name: "BRAMBLEGATE",
  outdoor: true,
  music: "small_town",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTTTTTTTTT::TTTTTTTTTTTTT", // 0
    "TBBBBBBBBBBB.::.BBBBBBBBBBBT", // 1
    "TB*BBBBBBBB..::.#########.BT", // 2
    "TB*B@@@@@@B..::...........BT", // 3
    "TB*B@@@@@@B..::**.@@@@.**.BT", // 4
    "TB*B@@@@@@B..::...@@@@.**.BT", // 5
    "TB*B@@@@@@B..::...@@@@.**.BT", // 6
    "TB.....:...S.::..S..:.....BT", // 7
    "TB.....::::::::::::::.....BT", // 8
    "TB***...**...::.........T.BT", // 9
    "TB.........*.::...........BT", // 10
    "TB...@@@@BB*.::.T.@@@@***.BT", // 11
    "TB...@@@@....::.B.@@@@***.BT", // 12
    "TB.T.@@@@....::...@@@@....BT", // 13
    "TB....:...S..::....:......BT", // 14
    "TB....::::::::::::::...BB.BT", // 15
    "TB...........::........**.BT", // 16
    "TB.@@@@..**..::..@@@@@....BT", // 17
    "TB.@@@@..**..::..@@@@@~~~.BT", // 18
    "TB.@@@@......::*.@@@@@~~~.BT", // 19
    "TB..:.......S::..@@@@@**..BT", // 20
    "TBT.::::::::::::::::.....TBT", // 21
    "TBBBBBBBBBBBB::BBBBBBBBBBBBT", // 22
    "TTTTTTTTTTTTT::TTTTTTTTTTTTT", // 23
  ],
  structures: [
    { key: "conservatory", x: 4, y: 3 }, // door 7,6
    { key: "greenhouse", x: 18, y: 4 },  // door 20,6
    { key: "market", x: 5, y: 11 },      // door 6,13
    { key: "house_small", x: 18, y: 11 }, // door 19,13
    { key: "house_large", x: 17, y: 17 }, // door 19,20 (Hollis)
    { key: "house_small", x: 3, y: 17 },  // door 4,19
  ],
  warps: [
    { x: 13, y: 0, to: "route_3", toX: 10, toY: 44, facing: "up" },
    { x: 14, y: 0, to: "route_3", toX: 11, toY: 44, facing: "up" },
    { x: 13, y: 23, to: "route_2", toX: 4, toY: 1, facing: "down" },
    { x: 14, y: 23, to: "route_2", toX: 5, toY: 1, facing: "down" },
    { x: 7, y: 6, to: "bramblegate_conservatory", toX: 7, toY: 14, facing: "up" },
    { x: 20, y: 6, to: "bramblegate_greenhouse", toX: 4, toY: 6, facing: "up" },
    { x: 6, y: 13, to: "bramblegate_market", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    { id: "warden", sprite: "elder", x: 12, y: 1, facing: "right", movement: "static", script: "bg_warden" },
    { id: "pip", sprite: "pip", x: 22, y: 9, facing: "left", movement: "look_around", script: "bg_pip",
      visibleWhen: when({ pip_demo_done: true }) },
    { id: "hedgelayer", sprite: "gardener", x: 5, y: 9, facing: "down", movement: "look_around", script: "bg_hedgelayer" },
    { id: "townsfolk", sprite: "villager_a", x: 9, y: 10, facing: "down", movement: "wander", script: "bg_townsfolk" },
    { id: "kid", sprite: "kid", x: 21, y: 16, facing: "down", movement: "wander", script: "bg_kid" },
    { id: "florist", sprite: "florist", x: 11, y: 18, facing: "left", movement: "look_around", script: "bg_florist" },
    { id: "grunt", sprite: "grunt", x: 15, y: 5, facing: "up", movement: "static", script: "bg_grunt",
      visibleWhen: when({ beat_hollis: true, saw_grunt_bg: false }) },
  ],
  signs: [
    { x: 12, y: 20, text: "BRAMBLEGATE. The gate is a hedge, and the hedge is a gate." },
    { x: 11, y: 7, text: "BRAMBLEGATE CONSERVATORY. WARDEN: HOLLIS, the hedge-layer." },
    { x: 17, y: 7, text: "GREENHOUSE. Water, light and rest for tired QUICKENED." },
    { x: 10, y: 14, text: "MARKET. Pods, flasks and sprays for the working botanist." },
  ],
  triggers: [
    { x: 13, y: 1, w: 2, script: "bg_gate", when: when({ beat_hollis: false }) },
    { x: 19, y: 13, script: "bg_door_a" },
    { x: 19, y: 20, script: "bg_door_hollis" },
    { x: 4, y: 19, script: "bg_door_b" },
  ],
  onEnter: "bg_enter",
};

export const scripts: Scripts = {
  bg_enter: [
    ifFlags({ beat_hollis: true, saw_grunt_bg: false }, [{ op: "call", script: "grunt_sighting" }]),
  ],
  bg_gate: [
    { op: "face", who: "warden", dir: "toPlayer" },
    say("Hold it. ROUTE 3 runs through the NIGHT MEADOW. Strange things grow there."),
    say("Earn HOLLIS's mark first. Then I'll know you can handle yourself."),
    { op: "movePlayer", path: ["down"] },
  ],
  bg_warden: [
    ifFlags({ beat_hollis: true }, [
      say("The BRAMBLE MARK! Off you go, then. SUGARBUSH is north, past the meadow."),
    ], [
      say("ROUTE 3's closed to unmarked botanists. HOLLIS's rules, and mine."),
    ]),
  ],
  bg_pip: [
    say("<PLAYER>! It's me, PIP! I walked here. It took ages."),
    say("Blackberries aren't true berries. Each bump is its own tiny fruit!"),
  ],
  bg_hedgelayer: [
    say("HOLLIS laid every hedge in town. Cut, bent and woven, all alive."),
    say("His CONSERVATORY is a maze of them. Wood types, mostly. Stubborn as roots."),
  ],
  bg_townsfolk: [
    ifFlags({ beat_hollis: true }, [
      say("You beat HOLLIS? Then you've got your first PRESSED MARK. Frame it!"),
    ], [
      say("Each CONSERVATORY gives a PRESSED MARK to botanists who prove themselves."),
      say("A real pressed leaf, on a herbarium card. Very official."),
    ]),
  ],
  bg_kid: [
    ifNight(
      [say("At night the brambles curl their canes in tight. Like they're cold!")],
      [say("I got stuck in the bramble wall. It let go when I said sorry.")],
    ),
  ],
  bg_florist: [
    say("Bramble flowers have five petals, just like wild roses. Same family!"),
  ],
  bg_grunt: [say("...Move it, kid.")],
  bg_door_a: lockedDoor("It's locked. A wreath of dried brambles hangs on the door."),
  bg_door_hollis: lockedDoor("HOLLIS's cottage. A note: \"At the CONSERVATORY. Always.\""),
  bg_door_b: lockedDoor("It's locked. Somebody's left muddy boots by the step."),
};
