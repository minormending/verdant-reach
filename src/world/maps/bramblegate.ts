import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// BRAMBLEGATE: a brick town inside a living bramble wall. You come in under
// the south bramble arch onto a cobbled high street. The square in the middle
// has the old well; the MARKET street runs west from it, lined with stalls.
// North-west, behind a brick court with lily pools, stands the CONSERVATORY,
// a glass palace with glazed wings. The north arch (and its WARDEN) lets out
// onto ROUTE 3.
//
// Screens, roughly: NW the glass court; N the warden's arch; NE the GREENHOUSE
// row; W the market; C the well square; E a cottage and its cat; SW a cottage
// under the old oak; S the arch and HOLLIS's house by the pond.
export const bramblegate: MapDef = {
  id: "bramblegate",
  name: "BRAMBLEGATE",
  outdoor: true,
  music: "small_town",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    // x: 0123456789012345678901234567
    "TTTTTTTTTTTTT::TTTTTTTTTTTTT", // 0
    "TBBBBBBBBBBB.::.BBBBBBBBBBBT", // 1  north bramble arch (WARDEN)
    "TB.*Y....Y*.6116.y..y.*f*.BT", // 2
    "TB*.@@@@@@.*L11..@@@@.@@@@BT", // 3  CONSERVATORY, GREENHOUSE, cottage
    "TBII@@@@@@IIL11..@@@@.@@@@BT", // 4  glazed wings
    "TBII@@@@@@IIL11.S@@@@.@@@@BT", // 5
    "TBII@@@@@@IIL11111111111*.BT", // 6
    "TB*.Y00100Y*L11.*f*.9..y*.BT", // 7  lily pools either side of the walk
    "TBf..00100.fL116.......TT.BT", // 8
    "TBLLLLLNLLLLL11.........T.BT", // 9  brick court wall, gate
    "TB....S::::::11...........BT", // 10
    "TB.@@@@..6111111116..@@@@.BT", // 11 MARKET, the square, a cottage
    "TB.@@@@..1111@@1111..@@@@.BT", // 12 the well
    "TB.@@@@S.9111@@1119..@@@@.BT", // 13
    "TB:::::::111111111111::::.BT", // 14 market street
    "TB87.887.6111111116.*f*...BT", // 15 stalls
    "TB...........11.......TT..BT", // 16
    "TB.@@@@..@@@.11...@@@@@...BT", // 17 cottage, the old oak, HOLLIS's house
    "TB.@@@@..@@@.11...@@@@@~0~BT", // 18
    "TB.@@@@..@@@.11...@@@@@0~~BT", // 19
    "TB..:....5.5.11S..@@@@@q~qBT", // 20
    "TB..:::::::::11::::::y*...BT", // 21
    "TBBBBBBBBBBB6116BBBBBBBBBBBT", // 22 south bramble arch
    "TTTTTTTTTTTTT::TTTTTTTTTTTTT", // 23
  ],
  structures: [
    { key: "conservatory", x: 4, y: 3 },  // door 7,6
    { key: "greenhouse", x: 17, y: 3 },   // door 19,5
    { key: "house_small", x: 22, y: 3 },  // door 23,5
    { key: "market", x: 3, y: 11 },       // door 4,13
    { key: "well", x: 13, y: 12 },
    { key: "house_small", x: 21, y: 11 }, // door 22,13
    { key: "house_small", x: 3, y: 17 },  // door 4,19
    { key: "big_oak", x: 9, y: 17 },
    { key: "house_large", x: 18, y: 17 }, // door 20,20 (HOLLIS)
  ],
  warps: [
    { x: 13, y: 0, to: "route_3", toX: 10, toY: 46, facing: "up" },
    { x: 14, y: 0, to: "route_3", toX: 11, toY: 46, facing: "up" },
    { x: 13, y: 23, to: "route_2", toX: 4, toY: 1, facing: "down" },
    { x: 14, y: 23, to: "route_2", toX: 5, toY: 1, facing: "down" },
    { x: 7, y: 6, to: "bramblegate_conservatory", toX: 7, toY: 16, facing: "up" },
    { x: 19, y: 5, to: "bramblegate_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 4, y: 13, to: "bramblegate_market", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    { id: "warden", sprite: "elder", x: 12, y: 1, facing: "right", movement: "static", script: "bg_warden" },
    // Walks up the high street and out of the north arch (grunt_sighting).
    { id: "grunt", sprite: "grunt", x: 14, y: 5, facing: "up", movement: "static", script: "bg_grunt",
      visibleWhen: when({ beat_hollis: true, saw_grunt_bg: false }) },
    { id: "pip", sprite: "pip", x: 21, y: 8, facing: "left", movement: "look_around", script: "bg_pip",
      visibleWhen: when({ pip_demo_done: true }) },
    { id: "hedgelayer", sprite: "gardener", x: 25, y: 10, facing: "right", movement: "look_around", script: "bg_hedgelayer" },
    { id: "stallkeeper", sprite: "villager_a", x: 4, y: 15, facing: "up", movement: "static", script: "bg_stall" },
    { id: "townsfolk", sprite: "villager_b", x: 11, y: 14, facing: "down", movement: "wander", script: "bg_townsfolk" },
    { id: "oldtimer", sprite: "elder", x: 10, y: 13, facing: "left", movement: "look_around", script: "bg_oldtimer" },
    { id: "kid", sprite: "kid", x: 16, y: 12, facing: "left", movement: "wander", script: "bg_kid" },
    { id: "florist", sprite: "florist", x: 12, y: 18, facing: "left", movement: "look_around", script: "bg_florist" },
    { id: "cat", sprite: "cat", x: 23, y: 14, facing: "down", movement: "wander", script: "bg_cat" },
    { id: "dog", sprite: "dog", x: 19, y: 8, facing: "down", movement: "wander", script: "bg_dog" },
    { id: "bird", sprite: "bird", x: 6, y: 16, facing: "left", movement: "wander", script: "bg_bird" },
  ],
  signs: [
    { x: 15, y: 20, text: "BRAMBLEGATE. The gate is a hedge, and the hedge is a gate." },
    { x: 6, y: 10, text: "BRAMBLEGATE CONSERVATORY. WARDEN: HOLLIS, hedge-layer." },
    { x: 16, y: 5, text: "GREENHOUSE. Water, light and rest for tired QUICKENED." },
    { x: 7, y: 13, text: "MARKET. Pods, flasks and sprays for the working botanist." },
  ],
  triggers: [
    { x: 13, y: 1, w: 2, script: "bg_gate", when: when({ beat_hollis: false }) },
    { x: 23, y: 5, script: "bg_door_a" },
    { x: 22, y: 13, script: "bg_door_c" },
    { x: 4, y: 19, script: "bg_door_b" },
    { x: 20, y: 20, script: "bg_door_hollis" },
  ],
  onEnter: "bg_enter",
};

export const scripts: Scripts = {
  bg_enter: [
    ifFlags({ beat_hollis: true, saw_grunt_bg: false }, [{ op: "call", script: "grunt_sighting" }]),
  ],
  bg_gate: [
    { op: "face", who: "warden", dir: "toPlayer" },
    say("Hold it. ROUTE 3 crosses the NIGHT MEADOW."),
    say("Things bloom out there after dark that never used to."),
    say("Earn HOLLIS's mark first. Then I'll know you'll come back."),
    { op: "movePlayer", path: ["down"] },
  ],
  bg_warden: [
    ifFlags({ beat_hollis: true }, [
      ifFlags({ grove_cleared: true }, [
        say("Word is SUGARBUSH's sap is running again. Your doing?"),
        say("Thought so. The arch is yours, botanist."),
      ], [
        say("The BRAMBLE MARK. Off you go, then. SUGARBUSH is north."),
        say("Stay on the path in the meadow. It moves at night."),
      ]),
    ], [
      say("I keep this arch for HOLLIS. Forty years now."),
      say("No mark, no meadow. Not with things the way they are."),
    ]),
  ],
  bg_pip: [
    ifFlags({ beat_hollis: true }, [
      say("<PLAYER>! A real PRESSED MARK! Can I smell it?"),
      say("Bramble canes root where their tips touch soil. That's how a bramble walks!"),
    ], [
      say("<PLAYER>! It's me, PIP! I walked here. It took ages!"),
      say("Blackberries aren't true berries! Each bump is its own tiny fruit!"),
    ]),
  ],
  bg_hedgelayer: [
    ifFlags({ beat_hollis: true }, [
      say("Did HOLLIS's maze turn you round? He says that's half the lesson."),
    ], [
      say("To lay a hedge you cut each stem half through, then bend it over."),
      say("It keeps on living, sideways. HOLLIS laid this whole wall that way."),
    ]),
  ],
  bg_stall: [
    ifNight([
      say("Stall's shut, love. Even jam needs its sleep."),
    ], [
      say("Bramble jam! Picked fresh off the town wall."),
      say("...We don't tell HOLLIS where it comes from."),
    ]),
  ],
  bg_townsfolk: [
    ifFlags({ beat_hollis: true }, [
      say("You beat HOLLIS? Then you've your first PRESSED MARK. Frame it!"),
    ], [
      say("Every CONSERVATORY gives a PRESSED MARK to botanists who earn it."),
      say("A real leaf, pressed onto a card. Very official."),
    ]),
  ],
  bg_oldtimer: [
    ifFlags({ saw_grunt_bg: true }, [
      say("Saw that grey coat? Tape round his sleeve, like a grafted branch."),
      say("Grafting's for joining things that don't belong together. I don't like it."),
    ], [
      say("This well is older than the town. The brambles came first."),
      say("Folk just filled the gaps with bricks and called it home."),
    ]),
  ],
  bg_kid: [
    ifNight(
      [say("At night the brambles curl their canes in tight. Like they're cold!")],
      [say("I got stuck in the bramble wall. It let go when I said sorry.")],
    ),
  ],
  bg_florist: [
    say("Bramble flowers have five petals, like a wild rose. Same family!"),
    say("Under this oak, the flowers bloom a week late. They like the shade."),
  ],
  bg_cat: [
    ifNight(
      [say("The cat's eyes glint. It is very busy, guarding the doorstep from moths.")],
      [say("The cat is sunning itself on warm brick. It does not get up.")],
    ),
  ],
  bg_dog: [
    say("The dog drops a stick at your feet. It's a bramble cane."),
    say("Ouch."),
  ],
  bg_bird: [
    say("A wren! It ducks back into the bramble wall. Thorns make good bodyguards."),
  ],
  bg_grunt: [say("...Move it, kid.")],
  bg_door_a: lockedDoor("It's locked. A wreath of dried brambles hangs on the door."),
  bg_door_c: lockedDoor("It's locked. Somebody's left muddy boots by the step."),
  bg_door_b: lockedDoor("It's locked. Acorns line the windowsill, sorted by size."),
  bg_door_hollis: lockedDoor("HOLLIS's house. A note: \"At the CONSERVATORY. Always.\""),
};
