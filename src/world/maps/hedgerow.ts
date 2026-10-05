import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// A hamlet of laid hedges. OLD FENNIMORE's cottage sits in a walled garden at
// the top; the lane west to ROUTE 2 is being re-laid by a hedge-trimmer.
export const hedgerow: MapDef = {
  id: "hedgerow",
  name: "HEDGEROW",
  outdoor: true,
  music: "small_town",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTTTTTTHHHHHHHHHTTTTTTT", // 1
    "TTT*...TH.@@@@@.HT....TT", // 2
    "TT.....TH*@@@@@*HT.**.TT", // 3
    "TT..**..H.@@@@@.H..**.TT", // 4
    "TT......H.@@@@@.H.....TT", // 5
    "TT......HH*m:.*HH..*..TT", // 6
    "HHH.S.......:.........TT", // 7
    "::::::::::::::........TT", // 8
    "HHH:::::::::::..*.....TT", // 9
    "TT.........::...@@@@..TT", // 10
    "TT.@@@@....::...@@@@*.TT", // 11
    "TT.@@@@....::...@@@@..TT", // 12
    "TT.@@@@....::::::::...TT", // 13
    "TT..:......::....**...TT", // 14
    "TT..:::::::::....****.TT", // 15
    "TTT.~~~....::.....*..TTT", // 16
    "TTTTTTTTTTT::TTTTTTTTTTT", // 17
  ],
  structures: [
    { key: "house_large", x: 10, y: 2 }, // Fennimore, door 12,5
    { key: "house_small", x: 3, y: 11 }, // door 4,13
    { key: "house_small", x: 16, y: 10 }, // door 17,12
  ],
  warps: [
    { x: 0, y: 8, to: "route_2", toX: 38, toY: 15, facing: "left" },
    { x: 11, y: 17, to: "route_1", toX: 9, toY: 1, facing: "down" },
    { x: 12, y: 17, to: "route_1", toX: 10, toY: 1, facing: "down" },
    { x: 12, y: 5, to: "fennimore_house", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    { id: "trimmer_block", sprite: "gardener", x: 1, y: 8, facing: "right", movement: "static", script: "hh_trimmer",
      visibleWhen: when({ got_pods: false }) },
    { id: "trimmer_aside", sprite: "gardener", x: 3, y: 7, facing: "down", movement: "static", script: "hh_trimmer",
      visibleWhen: when({ got_pods: true }) },
    { id: "neighbour", sprite: "villager_a", x: 19, y: 5, facing: "left", movement: "look_around", script: "hh_neighbour" },
    { id: "kid", sprite: "kid", x: 14, y: 14, facing: "down", movement: "wander", script: "hh_kid" },
    { id: "beekeeper", sprite: "beekeeper", x: 20, y: 14, facing: "left", movement: "look_around", script: "hh_beekeeper" },
    { id: "gossip", sprite: "elder", x: 7, y: 11, facing: "down", movement: "static", script: "hh_gossip" },
  ],
  signs: [
    { x: 4, y: 7, text: "HEDGEROW. West: ROUTE 2 to BRAMBLEGATE. South: ROUTE 1." },
    { x: 11, y: 6, text: "OLD FENNIMORE. No seeds by post, please." },
  ],
  triggers: [
    { x: 4, y: 13, script: "hh_door_west" },
    { x: 17, y: 12, script: "hh_door_east" },
  ],
};

export const scripts: Scripts = {
  hh_trimmer: [
    ifFlags({ got_pods: true }, [
      say("Lane's open! Mind the ledges on ROUTE 2. You can hop down, but never back up."),
    ], [
      say("Laying this hedge, I am. Cut half through, bend it down, and it grows thicker."),
      say("Lane's shut till I'm done. Unless DR. VALE's sent you out properly kitted."),
      say("Got pods? No? Then I'm in no hurry."),
    ]),
  ],
  hh_neighbour: [
    say("HEDGEROW's the smallest place in the valley. More hedge than row."),
    say("Old FENNIMORE's been up all night. Something in his study keeps rolling off the shelf."),
  ],
  hh_kid: [
    ifNight(
      [say("At night the hedges rustle when there's no wind. I'm NOT scared.")],
      [say("I dared my brother to touch a nettle. Now it dares HIM.")],
    ),
  ],
  hh_beekeeper: [
    say("Hawthorn hedges flower in May. Folk even call the tree \"May.\""),
    say("My bees work it from dawn to dusk."),
  ],
  hh_gossip: [
    ifFlags({ got_seed: true }, [
      say("FENNIMORE gave you something? He never gives anything away. Not even advice."),
    ], [
      say("FENNIMORE was a famous botanist once. Now he mostly argues with his marrows."),
    ]),
  ],
  hh_door_west: lockedDoor("It's locked. A bunch of dried lavender hangs on the door."),
  hh_door_east: lockedDoor("It's locked. Muffled snoring comes from inside."),
};
