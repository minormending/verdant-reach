import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// Maple-syrup town. Tapped maples line the lane north into the grove; the
// SUGAR SHACK lodge stands by them. West, behind a fence, the bog boardwalk
// leads to NELL PITCHER's CONSERVATORY.
export const sugarbush: MapDef = {
  id: "sugarbush",
  name: "SUGARBUSH",
  outdoor: true,
  music: "small_town",
  border: "maple_tree",
  legend: LEGEND,
  // The taps come out once ROOTSTOCK leaves the grove.
  legendWhen: [{ when: [{ flag: "grove_cleared", is: true }], legend: { X: "maple_tree" } }],
  tiles: [
    "MMMMMMMMMMMMMM::MMMMMMMMMMMMMM", // 0
    "MMMMMMMMMMMMXX::XXMMMMMMMMMMMM", // 1
    "MMMMMMMMMMMMXX::XXM..........M", // 2
    "Mb@@@@@@bbbMXX::XXM.MM..X....M", // 3
    "Mb@@@@@@bbbMXX::XXM.......X..M", // 4
    "Mb@@@@@@~~bM..::...@@@@@.....M", // 5
    "Mb@@@@@@bbbM.S::...@@@@@.....M", // 6
    "Mbbbb=bbbbbM..::...@@@@@.....M", // 7
    "Mbbbb======M..::.....:...X...M", // 8
    "Mbbbbbbbbb=M..::::::::.......M", // 9
    "Mb~~~bbbbb=M..::.............M", // 10
    "Mb~~~bbbbb==::::.....M...M...M", // 11
    "Mbbbbbbbbbb#S.::...........M.M", // 12
    "M~~~~bbbbbb#..::..@@@@.***...M", // 13
    "M~~~~bbbbbb#..::..@@@@.***...M", // 14
    "M###########..::.S@@@@.......M", // 15
    "M.............::....:......M.M", // 16
    "M.**M.......M.:::::::........M", // 17
    "M.....@@@@....::.......@@@@..M", // 18
    "M.....@@@@....::.......@@@@..M", // 19
    "MM....@@@@...S::.......@@@@..M", // 20
    "M......:......::........:....M", // 21
    "M......::::::::::::::::::....M", // 22
    "M.M......***..::.............M", // 23
    "M...........M.::.M.........M.M", // 24
    "MMMMMMMMMMMMMM::MMMMMMMMMMMMMM", // 25
  ],
  structures: [
    { key: "conservatory", x: 2, y: 3 }, // door 5,6
    { key: "lodge", x: 19, y: 5 },       // door 21,7
    { key: "greenhouse", x: 18, y: 13 }, // door 20,15
    { key: "house_small", x: 23, y: 18 }, // door 24,20
    { key: "house_small", x: 6, y: 18 },  // door 7,20
  ],
  warps: [
    { x: 14, y: 0, to: "sugarbush_grove", toX: 13, toY: 24, facing: "up" },
    { x: 15, y: 0, to: "sugarbush_grove", toX: 14, toY: 24, facing: "up" },
    { x: 14, y: 25, to: "route_3", toX: 10, toY: 1, facing: "down" },
    { x: 15, y: 25, to: "route_3", toX: 11, toY: 1, facing: "down" },
    { x: 5, y: 6, to: "sugarbush_conservatory", toX: 9, toY: 14, facing: "up" },
    { x: 20, y: 15, to: "sugarbush_greenhouse", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    { id: "gatekeeper", sprite: "villager_a", x: 11, y: 11, facing: "right", movement: "static", script: "sb_gatekeeper",
      visibleWhen: when({ grove_cleared: false }) },
    { id: "bram", sprite: "bram", x: 11, y: 11, facing: "right", movement: "static", script: "rival_2",
      visibleWhen: when({ grove_cleared: true, rival_2_done: false }) },
    { id: "syrupmaker", sprite: "villager_b", x: 23, y: 9, facing: "left", movement: "look_around", script: "sb_syrupmaker" },
    { id: "tapper", sprite: "hiker", x: 13, y: 5, facing: "up", movement: "look_around", script: "sb_tapper" },
    { id: "pip", sprite: "pip", x: 8, y: 16, facing: "down", movement: "look_around", script: "sb_pip",
      visibleWhen: when({ pip_demo_done: true }) },
    { id: "elder", sprite: "elder", x: 26, y: 16, facing: "left", movement: "static", script: "sb_elder" },
    { id: "kid", sprite: "kid", x: 10, y: 22, facing: "down", movement: "wander", script: "sb_kid" },
    { id: "bogfan", sprite: "florist", x: 3, y: 21, facing: "right", movement: "look_around", script: "sb_bogfan" },
  ],
  signs: [
    { x: 13, y: 20, text: "SUGARBUSH. Sweetest sap in the VERDANT REACH." },
    { x: 13, y: 6, text: "SUGARBUSH GROVE. Please don't disturb the trees." },
    { x: 17, y: 15, text: "GREENHOUSE. Water, light and rest for tired QUICKENED." },
    { x: 12, y: 12, text: "BOG BOARDWALK to SUGARBUSH CONSERVATORY. WARDEN: NELL PITCHER." },
  ],
  triggers: [
    { x: 12, y: 11, script: "rival_2", when: when({ grove_cleared: true, rival_2_done: false }) },
    { x: 21, y: 7, script: "sb_door_lodge" },
    { x: 24, y: 20, script: "sb_door_a" },
    { x: 7, y: 20, script: "sb_door_b" },
  ],
  encounters: {
    bog: {
      rate: 10,
      slots: [
        { species: "sundew_rosette", minLevel: 12, maxLevel: 15, weight: 40 },
        { species: "flytrap_seedling", minLevel: 12, maxLevel: 14, weight: 35 },
        { species: "fern_fiddlehead", minLevel: 12, maxLevel: 14, weight: 25 },
      ],
    },
  },
};

export const scripts: Scripts = {
  sb_gatekeeper: [
    say("Sorry, love. Nobody goes down the boardwalk today."),
    say("NELL's out there with her hunters, and the bog's in a mood. The whole town is."),
    say("It's the maples. Somebody's tapped the grove and they're drying out."),
    say("Sort out the grove up north and I'll gladly step aside."),
  ],
  sb_syrupmaker: [
    ifFlags({ grove_cleared: true }, [
      say("The sap's running again! Forty buckets of sap boil down to one of syrup."),
      say("Sweet work, and slow. Like everything worth doing."),
    ], [
      say("No sap, no syrup. Strangers tapped the QUICKENED maples and took it all."),
      say("They didn't even boil it. Just bottled it raw. \"For study,\" they said."),
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
    say("<PLAYER>! Maple seeds are called samaras. They spin down like helicopters!"),
    say("Spinning slows their fall, so the wind can carry them far from the parent tree."),
  ],
  sb_elder: [
    ifNight(
      [say("Listen. Hear that? The bog hums some nights. Always has, since I was a girl.")],
      [say("SUGARBUSH has tapped these maples for three hundred years. Never like this.")],
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
    say("NELL PITCHER studies carnivorous plants. She calls them her little hunters."),
    say("A sundew's leaves are covered in sticky dew. Bugs land and can't leave."),
  ],
  sb_door_lodge: [
    ifFlags({ grove_cleared: true }, [
      { op: "sfx", id: "bump" },
      say("The SUGAR SHACK is full of steam and bubbling pans. No room inside today!"),
      { op: "movePlayer", path: ["down"] },
    ], lockedDoor("SUGAR SHACK. A sign: \"Closed. No sap, no syrup.\"")),
  ],
  sb_door_a: lockedDoor("It's locked. The windowsill is lined with tiny jars of syrup."),
  sb_door_b: lockedDoor("It's locked. A cat glares at you from the window."),
};
