import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// SUGARBUSH: a maple-syrup town in autumn. The south road climbs past a
// pumpkin patch to the square, where the great SUGAR MAPLE stands. North of
// the square, the grove lane runs between tapped maples hung with sap buckets
// up to SUGARBUSH GROVE; the SUGAR SHACK and its woodpile sit just east of it.
// West, behind a fence, is the bog. The CONSERVATORY stands in it like a
// lantern, and a boardwalk leads to it from a gate a worried villager guards.
//
// The taps come out (X -> plain maple) once ROOTSTOCK leaves the grove.
export const sugarbush: MapDef = {
  id: "sugarbush",
  name: "SUGARBUSH",
  outdoor: true,
  music: "small_town",
  border: "maple_tree",
  legend: OUTDOOR,
  legendWhen: [{ when: [{ flag: "grove_cleared", is: true }], legend: { X: "maple_tree" } }],
  ambient: "leaves",
  tiles: [
    // x: 012345678901234567890123456789
    "MMMMMMMMMMMMMM::MMMMMMMMMMMMMM", // 0  to the GROVE
    "MMMMMMMMMMMMXX::XXMMMMMMMMMMMM", // 1  the tapped grove lane
    "Mqb0~~0bbqMMX7::7XMMMMMMMMMMMM", // 2
    "Mb@@@@@@bbMMX.::.XMM.@@@@@7X.M", // 3  CONSERVATORY in the bog; SUGAR SHACK
    "Mb@@@@@@bqMMX7::7XM..@@@@@.X7M", // 4
    "Mb@@@@@@qbMMX.::.....@@@@@...M", // 5
    "Mb@@@@@@bbMMX7::.......:..34.M", // 6  woodpile
    "Mbbbb=bbqbMMMS::::::::::.7.7.M", // 7  sap buckets
    "Mqbbb=bbbb#...::.y*...MM.5..MM", // 8
    "Mb0~~=bbbq#...::......@@@@.f.M", // 9  GREENHOUSE
    "Mq~~0=bbbb#.61111116..@@@@.*.M", // 10 the square
    "Mbbbb=======11111@@1.S@@@@.**M", // 11 boardwalk gate; the SUGAR MAPLE
    "Mqbbbbbqbb#S.1111@@111111....M", // 12
    "M~~0bbbbbq#.69111116...*y*...M", // 13
    "M~0bbbqbbb#...::.....y*......M", // 14
    "M##########...::.9.....MM....M", // 15
    "M..M....####..::....MM.......M", // 16
    "M..@@@@.#kk#..::......@@@@...M", // 17 pumpkin patch
    "M..@@@@.#GG#..::......@@@@.4.M", // 18
    "M..@@@@.####..::......@@@@...M", // 19
    "M...:...3.....::.......:..M..M", // 20
    "M...::::::::::::::::::::.....M", // 21
    "M.y*....M.....::......MM...M.M", // 22
    "MM......MMM..S::...MM.....MMMM", // 23
    "MMMMMMMMMMMMM.::.MMMMMMMMMMMMM", // 24
    "MMMMMMMMMMMMMM::MMMMMMMMMMMMMM", // 25 to ROUTE 3
  ],
  structures: [
    { key: "conservatory", x: 2, y: 3 }, // door 5,6
    { key: "lodge", x: 21, y: 3 },       // door 23,5 (SUGAR SHACK)
    { key: "greenhouse", x: 22, y: 9 },  // door 24,11
    { key: "big_maple", x: 17, y: 11 },
    { key: "house_small", x: 3, y: 17 }, // door 4,19
    { key: "house_small", x: 22, y: 17 }, // door 23,19
  ],
  warps: [
    { x: 14, y: 0, to: "sugarbush_grove", toX: 13, toY: 26, facing: "up" },
    { x: 15, y: 0, to: "sugarbush_grove", toX: 14, toY: 26, facing: "up" },
    { x: 14, y: 25, to: "route_3", toX: 10, toY: 1, facing: "down" },
    { x: 15, y: 25, to: "route_3", toX: 11, toY: 1, facing: "down" },
    { x: 5, y: 6, to: "sugarbush_conservatory", toX: 9, toY: 16, facing: "up" },
    { x: 24, y: 11, to: "sugarbush_greenhouse", toX: 5, toY: 7, facing: "up" },
  ],
  npcs: [
    // Stands on the boardwalk gate until the grove is cleared.
    { id: "gatekeeper", sprite: "villager_a", x: 11, y: 11, facing: "right", movement: "static", script: "sb_gatekeeper",
      visibleWhen: when({ grove_cleared: false }) },
    // rival_2: BRAM takes the same spot; the player steps on 12,11, east of him.
    { id: "bram", sprite: "bram", x: 11, y: 11, facing: "right", movement: "static", script: "rival_2",
      visibleWhen: when({ grove_cleared: true, rival_2_done: false }) },
    { id: "syrupmaker", sprite: "villager_b", x: 26, y: 7, facing: "down", movement: "look_around", script: "q_sap_run" }, // THE SAP RUN (falls back to sb_syrupmaker)
    { id: "tapper", sprite: "hiker", x: 16, y: 5, facing: "left", movement: "look_around", script: "sb_tapper" },
    { id: "pip", sprite: "pip", x: 19, y: 14, facing: "down", movement: "look_around", script: "sb_pip",
      visibleWhen: when({ pip_demo_done: true }) },
    { id: "elder", sprite: "elder", x: 14, y: 13, facing: "left", movement: "static", script: "sb_elder" },
    { id: "kid", sprite: "kid", x: 16, y: 17, facing: "down", movement: "wander", script: "sb_kid" },
    { id: "bogfan", sprite: "florist", x: 11, y: 14, facing: "left", movement: "look_around", script: "sb_bogfan" },
    { id: "cat", sprite: "cat", x: 5, y: 20, facing: "down", movement: "wander", script: "sb_cat" },
    { id: "dog", sprite: "dog", x: 26, y: 15, facing: "left", movement: "wander", script: "sb_dog" },
    { id: "bird", sprite: "bird", x: 6, y: 22, facing: "right", movement: "wander", script: "sb_bird" },
  ],
  // Behind the woodpile by the SUGAR SHACK.
  hidden: [{ x: 26, y: 6, item: "compost" }],
  signs: [
    { x: 13, y: 23, text: "SUGARBUSH. Sweetest sap in the VERDANT REACH." },
    { x: 13, y: 7, text: "SUGARBUSH GROVE. Please don't disturb the trees." },
    { x: 21, y: 11, text: "GREENHOUSE. Water, light and rest for tired QUICKENED." },
    { x: 11, y: 12, text: "BOG BOARDWALK to the CONSERVATORY. WARDEN: NELL PITCHER." },
  ],
  triggers: [
    { x: 12, y: 11, script: "rival_2", when: when({ grove_cleared: true, rival_2_done: false }) },
    { x: 23, y: 5, script: "sb_door_lodge" },
    { x: 23, y: 19, script: "sb_door_a" },
    { x: 4, y: 19, script: "sb_door_b" },
  ],
  onEnter: "sb_enter",
  encounters: {
    bog: {
      rate: 10,
      slots: [
        { species: "sundew_rosette", minLevel: 12, maxLevel: 15, weight: 30 },
        { species: "flytrap_seedling", minLevel: 12, maxLevel: 14, weight: 25 },
        { species: "pitcher_sprout", minLevel: 12, maxLevel: 15, weight: 22 },
        { species: "cattail_shoot", minLevel: 12, maxLevel: 14, weight: 18 },
        { species: "fern_fiddlehead", minLevel: 12, maxLevel: 14, weight: 10 },
      ],
    },
  },
};

export const scripts: Scripts = {
  sb_enter: [
    ifFlags({ sb_arrival_seen: false, grove_cleared: false }, [{ op: "call", script: "sugarbush_arrival" }]),
  ],
  sb_gatekeeper: [
    { op: "face", who: "gatekeeper", dir: "toPlayer" },
    say("Sorry, love. Nobody goes down the boardwalk today."),
    say("The bog's in a mood. NELL says her hunters won't settle."),
    say("It's the maples. Somebody's tapped the whole grove dry."),
    say("Sort out the grove up north, and I'll gladly step aside."),
  ],
  sb_syrupmaker: [
    ifFlags({ grove_cleared: true }, [
      say("The sap's running! Forty buckets boil down to one of syrup."),
      say("Sweet work, and slow. Like everything worth doing."),
    ], [
      say("No sap, no syrup. Strangers tapped the QUICKENED maples and took it all."),
      say("They didn't even boil it. Bottled it raw. \"For study,\" they said."),
    ]),
  ],
  sb_tapper: [
    ifFlags({ grove_cleared: true }, [
      say("Look at the leaves. They're turning back toward the sun."),
    ], [
      say("Grey coats came up the road with drills and tubing. Now the maples droop."),
      say("We tap a tree once a spring, gently. They've put in dozens."),
    ]),
  ],
  sb_pip: [
    ifFlags({ grove_cleared: true }, [
      say("<PLAYER>! Maple leaves turn red when the tree stops making green!"),
      say("The red was hiding underneath all summer. Isn't that amazing?"),
    ], [
      say("<PLAYER>! Maple seeds are called samaras. They spin like helicopters!"),
      say("Spinning slows their fall, so the wind carries them far away."),
    ]),
  ],
  sb_elder: [
    ifNight(
      [say("Listen. Hear that? The bog hums some nights. Always has, since I was a girl.")],
      [ifFlags({ grove_cleared: true }, [
        say("Three hundred years this town has tapped those maples. Gently."),
        say("You gave them back their dignity, botanist."),
      ], [
        say("That SUGAR MAPLE was here before the town. We built around it."),
        say("Its leaves should be scarlet by now. They're going brown."),
      ])],
    ),
  ],
  sb_kid: [
    ifFlags({ grove_cleared: true }, [
      say("Pancakes are BACK on the menu!"),
    ], [
      say("No syrup means no pancakes. This is the worst week of my life."),
    ]),
  ],
  sb_bogfan: [
    ifFlags({ beat_nell: true }, [
      say("You beat NELL? Did her flytrap snap at you? It snaps at everyone."),
    ], [
      say("NELL PITCHER keeps carnivorous plants. She calls them her little hunters."),
      say("A sundew's leaves are beaded with sticky dew. Bugs land, and stay."),
    ]),
  ],
  sb_cat: [
    say("The cat is watching a falling leaf with total seriousness."),
  ],
  sb_dog: [
    ifFlags({ grove_cleared: true }, [
      say("The dog rolls in a pile of maple leaves, delighted with itself."),
    ], [
      say("The dog sniffs at the grove lane and whines."),
    ]),
  ],
  sb_bird: [
    say("A nuthatch, walking headfirst down a trunk. Showing off."),
  ],
  sb_door_lodge: [
    ifFlags({ grove_cleared: true }, [
      { op: "sfx", id: "bump" },
      say("The SUGAR SHACK is full of steam and bubbling pans. No room inside today!"),
      { op: "movePlayer", path: ["down"] },
    ], lockedDoor("SUGAR SHACK. A sign: \"Closed. No sap, no syrup.\"")),
  ],
  sb_door_a: lockedDoor("It's locked. The windowsill is lined with tiny jars of syrup."),
  sb_door_b: lockedDoor("It's locked. Pumpkin seeds are drying on a tray by the step."),
};
