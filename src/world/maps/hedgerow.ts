import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, lockedDoor, pickups, say, when, type Scripts } from "../build";

// A hamlet of laid hedges. Hedged lanes cross in the middle: north to OLD
// FENNIMORE's cottage in its walled kitchen garden, south to ROUTE 1, east to
// the green with the old oak and the pond, and west, single-file between the
// hedges, to ROUTE 2 (where the trimmer is re-laying the hedge). Three cottage
// gardens (the south-west one is the bakehouse). A footpath behind FENNIMORE's
// wall hides a pickup; you reach it the long way round, past the east cottage.
//
//            0         1         2
//            01234567890123456789012345
export const hedgerow: MapDef = {
  id: "hedgerow",
  name: "HEDGEROW",
  outdoor: true,
  music: "small_town",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTT", // 0
    "TTTTTTTTTTTTTTTTTTTTTTTTTT", // 1
    "TTTTTTT..y...*.....*.TTTTT", // 2
    "TTTT..yLLLLLLLLLLLLL..TTTT", // 3
    "T..*f..LGGk@@@@@kGGL...TTT", // 4
    "T.@@@@.LGGk@@@@@kGGL..y..T", // 5
    "T*@@@@yL...@@@@@...L.....T", // 6
    "Tf@@@@*Lf*y@@@@@y*fL.f...T", // 7
    "Ty.:.f.L7...*:*...8L.*...T", // 8
    "T##N###LLLLLLNLLLLLL@@@@.T", // 9
    "T*.:.f.HHHHH::mH...y@@@@yT", // 10
    "HHH:SHHHHHHH::HS.f..@@@@.T", // 11
    ":::::::::::::::::::::::..T", // 12
    "HHH:::::::::::::::::::::.T", // 13
    "THHHHHHHHHHH::H.......*..T", // 14
    "T.GGk@@@@f.H::H.@@@..~~q.T", // 15
    "T.GGk@@@@y.H::H.@@@.~~0~.T", // 16
    "Tf.y*@@@@.*H::H9@@@.q~~~.T", // 17
    "T*y...:::::::::......35..T", // 18
    "T..f..*....H::H*y.f......T", // 19
    "TTTTTTTTTTTT::TTTTTTTTTTTT", // 20
  ],
  structures: [
    { key: "house_large", x: 11, y: 4 }, // FENNIMORE, door 13,7
    { key: "house_small", x: 2, y: 5 },  // door 3,7
    { key: "house_small", x: 20, y: 9 }, // door 21,11
    { key: "house_small", x: 5, y: 15 }, // door 6,17
    { key: "big_oak", x: 16, y: 15 },
  ],
  warps: [
    { x: 0, y: 12, to: "route_2", toX: 46, toY: 17, facing: "left" },
    { x: 12, y: 20, to: "route_1", toX: 9, toY: 1, facing: "down" },
    { x: 13, y: 20, to: "route_1", toX: 10, toY: 1, facing: "down" },
    { x: 13, y: 7, to: "fennimore_house", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    // The west lane is one tile wide at the trimmer, so he truly blocks it.
    { id: "trimmer_block", sprite: "gardener", x: 1, y: 12, facing: "right", movement: "static", script: "hh_trimmer",
      visibleWhen: when({ got_pods: false }) },
    { id: "trimmer_aside", sprite: "gardener", x: 3, y: 13, facing: "left", movement: "static", script: "hh_trimmer",
      visibleWhen: when({ got_pods: true }) },
    { id: "neighbour", sprite: "villager_a", x: 22, y: 6, facing: "left", movement: "look_around", script: "hh_neighbour" },
    { id: "kid", sprite: "kid", x: 18, y: 14, facing: "down", movement: "wander", script: "hh_kid" },
    { id: "beekeeper", sprite: "beekeeper", x: 19, y: 18, facing: "up", movement: "look_around", script: "hh_beekeeper" },
    { id: "gossip", sprite: "elder", x: 15, y: 16, facing: "down", movement: "static", script: "hh_gossip" },
    // ambient life
    { id: "cat", sprite: "cat", x: 12, y: 8, facing: "right", movement: "static", script: "hh_cat" },
    { id: "dog", sprite: "dog", x: 22, y: 14, facing: "left", movement: "wander", script: "hh_dog" },
    { id: "wren", sprite: "bird", x: 9, y: 19, facing: "left", movement: "look_around", script: "hh_wren" },
    ...pickups([{ item: "spring_water", x: 8, y: 2 }]),
    // MOSS IS MISSING: the cottager waits at the lavender cottage's garden gate.
    { id: "cottager", sprite: "villager_b", x: 1, y: 10, facing: "right", movement: "look_around", script: "q_lost_cat" },
    // ...and once MOSS is home, MOSS suns beside the doorstep.
    { id: "moss_home", sprite: "cat", x: 2, y: 8, facing: "down", movement: "static", script: "hh_moss_home",
      visibleWhen: when({ quest_lost_cat_done: true }) },
    // THE SAP RUN ends here: the baker by the bakehouse door.
    { id: "baker", sprite: "shopkeeper", x: 10, y: 17, facing: "down", movement: "look_around", script: "q_sap_run_baker" },
    // The baker's own hedge, heavy with wild berries.
    { id: "bush:hh_berry_bakehouse", sprite: "harvest_bush", x: 10, y: 15, facing: "down", movement: "static", script: "bush_hh_berry_bakehouse" },
  ],
  // Tucked behind the old oak, on the side nobody walks.
  hidden: [{ x: 17, y: 14, item: "neem_spray" }],
  signs: [
    { x: 4, y: 11, text: "HEDGEROW. West: ROUTE 2 to BRAMBLEGATE. South: ROUTE 1." },
    { x: 14, y: 10, text: "OLD FENNIMORE. No seeds by post, please." },
    { x: 15, y: 11, text: "HEDGEROW GREEN. The old oak was here before the hamlet." },
  ],
  triggers: [
    { x: 3, y: 7, script: "hh_door_nw" },
    { x: 21, y: 11, script: "hh_door_east" },
    { x: 6, y: 17, script: "hh_door_sw" },
  ],
};

export const scripts: Scripts = {
  hh_trimmer: [
    ifFlags({ got_pods: true }, [
      say("Lane's open! Mind the ledges on ROUTE 2. You can hop down, never back up."),
    ], [
      say("Laying this hedge, I am. Cut the stems half through and bend them over."),
      say("They grow back thicker for it. Plants are funny like that."),
      say("Lane's shut till I'm done. Unless DR. VALE's sent you out properly kitted?"),
      say("No pods? Then I'm in no hurry."),
    ]),
  ],
  hh_neighbour: [
    say("HEDGEROW's the smallest place in the valley. More hedge than row."),
    ifFlags({ got_seed: true }, [
      say("FENNIMORE's lamp went out at last. First proper sleep in a week, I'd say."),
    ], [
      say("FENNIMORE's been up all night. Something in his study keeps rolling off the shelf."),
    ]),
  ],
  hh_kid: [
    ifNight(
      [say("At night the hedges rustle when there's no wind. I'm NOT scared.")],
      [say("I dared my brother to touch a nettle. Now the nettle dares HIM.")],
    ),
  ],
  hh_beekeeper: [
    say("Hawthorn hedges flower in May. Folk even call the tree \"May.\""),
    ifFlags({ got_starter: true }, [
      say("My bees have started visiting your QUICKENED. It doesn't seem to mind."),
    ], [
      say("My bees work it dawn to dusk. Best honey in the valley."),
    ]),
  ],
  hh_gossip: [
    ifFlags({ got_seed: true }, [
      say("FENNIMORE gave you something? He never gives anything away. Not even advice."),
    ], [
      say("FENNIMORE was a famous botanist once. Now he mostly argues with his marrows."),
    ]),
  ],
  hh_cat: [
    say("A tabby suns itself on FENNIMORE's path. It has never been moved by anyone."),
  ],
  hh_dog: [
    say("The dog is guarding the old oak. From what, it won't say."),
  ],
  hh_wren: [
    say("A wren hops along the hedge bottom. Tiny bird, enormous song."),
  ],
  hh_moss_home: [
    say("MOSS is back on the doorstep, washing her white sock as if nothing happened."),
  ],
  bush_hh_berry_bakehouse: [
    say("Wild berries on the bakehouse hedge. Take a handful; leave some for the wrens."),
    { op: "harvest", id: "hh_berry_bakehouse", item: "wild_berry", qty: 2 },
  ],
  hh_door_nw: lockedDoor("Locked. Dried lavender hangs on the door, above a little cat flap."),
  hh_door_east: lockedDoor("Locked. Muffled snoring comes from inside."),
  hh_door_sw: lockedDoor("The bakehouse. Locked, but it smells of warm bread.", "A note: \"Back soon. Do NOT feed the marrow.\""),
};
