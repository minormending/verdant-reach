import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, pickups, say, when, type Scripts } from "../build";

// Hedgerow lanes. The lane snakes north from FALLOWFIELD in an S: past the
// lily pond, west along the stream to the footbridge, east round the hedge,
// then up the last straight to HEDGEROW. Meadows of shaped tall grass open off
// each bend. Two lines of ledges are one-way shortcuts home: the north-east
// meadow drops to the bridge bend, the east meadow drops to the pond. A pod
// sits on the lip of the upper ledge, in plain view from the bend below; you
// reach it from the top. PIP's catching demo runs on the north straight.
//
//            0         1         2
//            0123456789012345678901
export const route_1: MapDef = {
  id: "route_1",
  name: "ROUTE 1",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: OUTDOOR,
  ambient: "pollen",
  tiles: [
    "TTTTTTTTT::TTTTTTTTTTT", // 0
    "TTTTTTTTH::HTTTTTTTTTT", // 1
    "TTTTT.B*H::H.f.TTTTTTT", // 2
    "TTT.,B...::...y...TTTT", // 3
    "TT,,,,,..::.....,...TT", // 4
    "TT,,,,,..::..,,,,,,,.T", // 5
    "TT,,,,,..::..,,,,,,,.T", // 6
    "TTT.,::::::..,,,,,,,.T", // 7
    "TTTT.::::::.o...,f...T", // 8
    "TTTT.::HHHHH.........T", // 9
    "TTTT.*:H.....,,,,,...T", // 10
    "TTT,,::Hy...,,,,,,,..T", // 11
    "TT,,,::H.....,,,,,...T", // 12
    "TT,,,::HvvvvvvvvvvvvvT", // 13
    "TT.,.::H.........*,..T", // 14
    "TTT..:::::::::...,,,.T", // 15
    "TTTT.:::::::::..,,,,,T", // 16
    "TTTT.*.....H::S..,,,TT", // 17
    "TT~~q......H::H...,qTT", // 18
    "TT~~0~~~~~~~22~~~~~~~~", // 19
    "TT~~~~~~~~~~22~~~~~~~~", // 20
    "TTq.,..y...H::H..q..TT", // 21
    "TTT,,,,....H::H,,,,,.T", // 22
    "TT,,,,,....H::H,,,,,,T", // 23
    "TT,,,,,:::::::.,,,,3.T", // 24
    "TT..,..:::::::...,...T", // 25
    "TTT...H::HvvvvvvvvvvvT", // 26
    "TTTT..H::H.*~~o~~....T", // 27
    "TTT35.H::H.~~~0~~q...T", // 28
    "TT....H::H.q~~~~~~...T", // 29
    "TT..,.H::H.~~~~~0~...T", // 30
    "TT,,,,H::H..~~~~~...TT", // 31
    "TT,,,,,:::::.........T", // 32
    "TTT,,,,:::::....f,9..T", // 33
    "TTTT,....H::H..,,,y,.T", // 34
    "TTTTT..*.H::H..,,,,,.T", // 35
    "TTTTTT...H::H..,,,,,TT", // 36
    "TTTTTTT..H::H....,.TTT", // 37
    "TTTTTTTT.S::H.TTTTTTTT", // 38
    "TTTTTTTTTT::TTTTTTTTTT", // 39
  ],
  structures: [],
  warps: [
    { x: 9, y: 0, to: "hedgerow", toX: 12, toY: 19, facing: "up" },
    { x: 10, y: 0, to: "hedgerow", toX: 13, toY: 19, facing: "up" },
    { x: 10, y: 39, to: "fallowfield", toX: 13, toY: 1, facing: "down" },
    { x: 11, y: 39, to: "fallowfield", toX: 14, toY: 1, facing: "down" },
  ],
  npcs: [
    // PIP's demo (story.ts): left, right x2, left x2, then left + down 5 along the lane.
    { id: "pip", sprite: "pip", x: 12, y: 3, facing: "left", movement: "static", script: "pip_demo",
      visibleWhen: when({ got_seed: true, pip_demo_done: false }) },
    { id: "milo", sprite: "schoolkid", x: 16, y: 15, facing: "left", trainer: "schoolkid_milo", sight: 3 },
    { id: "hedger", sprite: "villager_b", x: 10, y: 17, facing: "right", movement: "look_around", script: "r1_hedger" },
    { id: "walker", sprite: "villager_a", x: 8, y: 22, facing: "down", movement: "wander", script: "r1_walker" },
    { id: "picnic", sprite: "florist", x: 19, y: 33, facing: "left", movement: "static", script: "r1_picnic" },
    { id: "robin", sprite: "bird", x: 13, y: 8, facing: "left", movement: "look_around", script: "r1_robin" },
    ...pickups([
      { item: "terrarium_pod", x: 18, y: 12 },
      { item: "water_flask", x: 20, y: 29 },
    ]),
    // Wild berry bushes: one in the hedge corner of the north meadow, one in
    // the river nook east of the footbridge.
    { id: "bush:r1_berry_north", sprite: "harvest_bush", x: 8, y: 10, facing: "down", movement: "static", script: "bush_r1_berry_north" },
    { id: "bush:r1_berry_river", sprite: "harvest_bush", x: 15, y: 21, facing: "down", movement: "static", script: "bush_r1_berry_river" },
  ],
  // Under the old stump in the west hollow, ringed with mushrooms.
  hidden: [
    { x: 3, y: 28, item: "terrarium_pod", qty: 2 },
    // PRUNE payoff: brambles have closed off the nook by the north gate since the bloom.
    { x: 5, y: 2, item: "rain_jar" },
  ],
  signs: [
    { x: 9, y: 38, text: "ROUTE 1. North: HEDGEROW. South: FALLOWFIELD." },
    { x: 14, y: 17, text: "Hedges laid by hand. Please don't trim in nesting season!" },
  ],
  triggers: [
    { x: 9, y: 2, w: 2, script: "pip_demo", when: when({ got_seed: true, pip_demo_done: false }) },
  ],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "dandelion_bud", minLevel: 2, maxLevel: 4, weight: 35 },
        { species: "sunflower_seedling", minLevel: 2, maxLevel: 4, weight: 25, time: "day" },
        { species: "clover_sprout", minLevel: 2, maxLevel: 4, weight: 25, time: "day" },
        { species: "mint_sprig", minLevel: 2, maxLevel: 4, weight: 15, time: "day" },
        { species: "mint_sprig", minLevel: 2, maxLevel: 4, weight: 25, time: "night" },
        { species: "nettle_sprout", minLevel: 3, maxLevel: 4, weight: 8, time: "day" },
        { species: "nettle_sprout", minLevel: 3, maxLevel: 4, weight: 12, time: "night" },
        { species: "foxglove_rosette", minLevel: 3, maxLevel: 4, weight: 20, time: "night" },
      ],
    },
  },
};

export const scripts: Scripts = {
  r1_hedger: [
    say("Count the kinds of shrub in a stretch of hedge. Each kind is roughly a century."),
    say("This one's got seven. Older than the HERBARIUM!"),
  ],
  r1_walker: [
    ifFlags({ got_starter: true }, [
      say("QUICKENED hide in the long grass. Stick to the lane and you'll mostly be let be."),
    ], [
      say("Mind the long grass. Something in there just called my name. Well, hummed it."),
    ]),
  ],
  r1_picnic: [
    ifNight(
      [say("The pond lilies shut at dusk. I come to watch them go to bed.")],
      [say("Lily pads have their pores on top, not underneath. They breathe the sky.")],
    ),
    say("The ledges are a lovely shortcut home. Just don't try going back up them."),
  ],
  bush_r1_berry_north: [
    say("Brambles have scrambled up the hedge here, heavy with fruit."),
    { op: "harvest", id: "r1_berry_north", item: "wild_berry", qty: 2 },
  ],
  bush_r1_berry_river: [
    say("A berry bush leans out over the stream, dark fruit nearly touching the water."),
    { op: "harvest", id: "r1_berry_river", item: "wild_berry", qty: 2 },
  ],
  r1_robin: [
    say("A robin watches you dig through your bag. It's hoping for worms."),
  ],
};
