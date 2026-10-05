import type { MapDef } from "../../contracts";
import { LEGEND, pickups, say, when, type Scripts } from "../build";

// Hedgerow lanes: a two-wide lane between laid hedges, with grassy pockets
// opening off it and an open meadow in the middle.

export const route_1: MapDef = {
  id: "route_1",
  name: "ROUTE 1",
  outdoor: true,
  music: "route",
  border: "tree",
  legend: LEGEND,
  tiles: [
    "TTTTTTTTT::TTTTTTTTT", // 0
    "TTTTTTTTH::HTTTTTTTT", // 1
    "TTTT*..TH::HT.*.TTTT", // 2
    "TTT,,,,..::..,,,,TTT", // 3
    "TT,,,,,.H::H.,,,,,TT", // 4
    "TT,,,,,.H::H.,,,,,TT", // 5
    "TTT,,,..H::H..,,,TTT", // 6
    "TTTTT..*H::H*..TTTTT", // 7
    "TTTTTTTTH::HTTTTTTTT", // 8
    "TTT....HH::HH....TTT", // 9
    "TT..,,,,.::..,,,..TT", // 10
    "TT.,,,,,.::..,,,,.TT", // 11
    "TT.,,,,,.::...,,,,TT", // 12
    "TT..,,,..::...,,..TT", // 13
    "TTo......::::::.o.TT", // 14
    "TT.HHHHHHHH..::..TTT", // 15
    "TT.H,,,,,,H..::.*.TT", // 16
    "TT.H,,,,,,...::...TT", // 17
    "TT.H,,,,,,H..::...TT", // 18
    "TT.HHHH.HHH..::..TTT", // 19
    "TTT......::::::..TTT", // 20
    "TTTT....S::.*..TTTTT", // 21
    "TT~~~..TH::H.....TTT", // 22
    "TT~~~~..H::H.,,,,.TT", // 23
    "TT~~~*..H::H.,,,,,TT", // 24
    "TT......H::...,,,,TT", // 25
    "TTT.,,,.H::H.,,,,.TT", // 26
    "TT.,,,,..::H...*.TTT", // 27
    "TT.,,,,.H::H..o..TTT", // 28
    "TTT...*.H::H.....TTT", // 29
    "TTTT..*.H::H.*..TTTT", // 30
    "TTT.....H::H.....TTT", // 31
    "TTTTT...H::S...TTTTT", // 32
    "TTTTTTT.H::H.TTTTTTT", // 33
    "TTTTTTTTH::HTTTTTTTT", // 34
    "TTTTTTTTT::TTTTTTTTT", // 35
  ],
  structures: [],
  warps: [
    { x: 9, y: 0, to: "hedgerow", toX: 11, toY: 16, facing: "up" },
    { x: 10, y: 0, to: "hedgerow", toX: 12, toY: 16, facing: "up" },
    { x: 9, y: 35, to: "fallowfield", toX: 11, toY: 1, facing: "down" },
    { x: 10, y: 35, to: "fallowfield", toX: 12, toY: 1, facing: "down" },
  ],
  npcs: [
    { id: "pip", sprite: "pip", x: 12, y: 3, facing: "left", movement: "static", script: "pip_demo",
      visibleWhen: when({ got_seed: true, pip_demo_done: false }) },
    { id: "milo", sprite: "schoolkid", x: 16, y: 17, facing: "left", trainer: "schoolkid_milo", sight: 3 },
    { id: "hedger", sprite: "villager_b", x: 16, y: 20, facing: "left", movement: "look_around", script: "r1_hedger" },
    { id: "walker", sprite: "villager_a", x: 3, y: 14, facing: "right", movement: "wander", script: "r1_walker" },
    ...pickups([{ item: "water_flask", x: 16, y: 29 }, { item: "terrarium_pod", x: 3, y: 31 }]),
  ],
  signs: [
    { x: 11, y: 32, text: "ROUTE 1. North: HEDGEROW. South: FALLOWFIELD." },
    { x: 8, y: 21, text: "Hedges laid by hand. Please don't trim in nesting season!" },
  ],
  triggers: [
    { x: 9, y: 2, w: 2, script: "pip_demo", when: when({ got_seed: true, pip_demo_done: false }) },
  ],
  encounters: {
    grass: {
      rate: 12,
      slots: [
        { species: "dandelion_bud", minLevel: 2, maxLevel: 4, weight: 45 },
        { species: "sunflower_seedling", minLevel: 2, maxLevel: 4, weight: 40, time: "day" },
        { species: "nettle_sprout", minLevel: 3, maxLevel: 4, weight: 10 },
      ],
    },
  },
};

export const scripts: Scripts = {
  r1_hedger: [
    say("Count the kinds of shrub in a stretch of hedge. Each kind is about a century of age."),
    say("This one's got seven. Older than the HERBARIUM!"),
  ],
  r1_walker: [
    say("The QUICKENED hide in tall grass. Walk the lanes and you'll mostly be left alone."),
  ],
};
