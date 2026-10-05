// Dev-only test maps for ?dev=overworld (not used by the real game).
// They exercise every engine feature: tall grass + encounters, ledges,
// animated water/flowers, a structure with a door, an interior with an exit
// mat, counter, bookshelf and cabinet, a trainer with line of sight, NPC
// behaviours, item pickups, signs, triggers and a script covering most ops.

import type { MapDef, MapId, ScriptCmd, TrainerDef, WorldData } from "../contracts";

const town: MapDef = {
  id: "fallowfield",
  name: "TEST MEADOW",
  outdoor: true,
  music: "fallowfield",
  tiles: [
    "TTTTTTTTTTTTTTTTTTTT",
    "T.....,,,,,,...ff..T",
    "T.....,,,,,,...ff..T",
    "T.....,,,,,,.......T",
    "T..............~~~.T",
    "T.S....=====...~~~.T",
    "T......=...=.......T",
    "T======.....=======T",
    "T......vvvv........T",
    "T...........,,,,...T",
    "T.m.r.......,,,,...T",
    "T...........,,,,.F.T",
    "TTTTTTTTTT==TTTTTTTT",
  ],
  legend: {
    T: "tree", ".": "grass", ",": "tall_grass", f: "flowers", "=": "path", "~": "water",
    v: "ledge_down", S: "sign", m: "mailbox", r: "rock", F: "fence",
  },
  border: "tree",
  structures: [{ key: "house_small", x: 2, y: 1 }],
  warps: [
    { x: 3, y: 3, to: "player_home", toX: 4, toY: 7, facing: "up" },
    { x: 10, y: 12, to: "route_1", toX: 5, toY: 0, facing: "down" },
    { x: 11, y: 12, to: "route_1", toX: 6, toY: 0, facing: "down" },
  ],
  npcs: [
    { id: "elder", sprite: "elder", x: 5, y: 6, facing: "down", script: "dev_elder" },
    { id: "wanderer", sprite: "villager_a", x: 9, y: 5, facing: "down", movement: "wander", script: "dev_wanderer" },
    { id: "kid", sprite: "kid", x: 14, y: 10, facing: "left", movement: "look_around", script: "dev_kid" },
    { id: "gardener", sprite: "gardener", x: 17, y: 9, facing: "left", trainer: "dev_gardener", sight: 4 },
    { id: "item_water_flask", sprite: "item_pickup", x: 17, y: 2, facing: "down" },
    { id: "pod_ball", sprite: "item_pickup", x: 13, y: 1, facing: "down", script: "dev_pod" },
    { id: "night_owl", sprite: "birdwatcher", x: 16, y: 6, facing: "down", script: "dev_night", visibleWhen: [{ flag: "dev_show_owl", is: true }] },
  ],
  signs: [{ x: 2, y: 5, text: "TEST MEADOW\nWhere the engine stretches its roots." }],
  triggers: [{ x: 12, y: 7, script: "dev_trigger", when: [{ flag: "dev_trigger_seen", is: false }] }],
  encounters: {
    grass: {
      rate: 18,
      slots: [
        { species: "dandelion_bud", minLevel: 2, maxLevel: 4, weight: 40 },
        { species: "sunflower_seedling", minLevel: 2, maxLevel: 4, weight: 30, time: "day" },
        { species: "moonflower_seed", minLevel: 3, maxLevel: 5, weight: 30, time: "night" },
        { species: "nettle_sprout", minLevel: 3, maxLevel: 4, weight: 5 },
      ],
    },
  },
};

const house: MapDef = {
  id: "player_home",
  name: "TEST HOUSE",
  outdoor: false,
  music: "greenhouse",
  tiles: [
    "WWwWWWkkcW",
    "..........",
    "...tt.....",
    "......CCC.",
    "..........",
    "..........",
    "..........",
    "....MM....",
  ],
  legend: {
    W: "wall", w: "window", k: "bookshelf", c: "specimen_cabinet", ".": "floor_wood",
    t: "table", C: "counter", M: "mat_exit",
  },
  border: "void",
  structures: [],
  warps: [
    { x: 4, y: 7, to: "fallowfield", toX: 3, toY: 4, facing: "down" },
    { x: 5, y: 7, to: "fallowfield", toX: 3, toY: 4, facing: "down" },
  ],
  npcs: [{ id: "keeper", sprite: "greenhouse_keeper", x: 7, y: 2, facing: "down", script: "dev_heal" }],
  signs: [],
  triggers: [],
  healPoint: { x: 7, y: 4 },
};

const route: MapDef = {
  id: "route_1",
  name: "TEST ROUTE",
  outdoor: true,
  music: "route",
  tiles: [
    "TTTTT==TTTTT",
    "T....==....T",
    "T,,,,==,,,,T",
    "T,,,,==,,,,T",
    "Tvvvv==vvvvT",
    "T....==....T",
    "Tbbbb==BBBBT",
    "Tbbbb==BBBBT",
    "TTTTTTTTTTTT",
  ],
  legend: { T: "tree", ".": "grass", ",": "tall_grass", "=": "path", v: "ledge_down", b: "bog", B: "boardwalk" },
  border: "tree",
  structures: [],
  warps: [
    { x: 5, y: 0, to: "fallowfield", toX: 10, toY: 11, facing: "up" },
    { x: 6, y: 0, to: "fallowfield", toX: 11, toY: 11, facing: "up" },
  ],
  npcs: [],
  signs: [],
  triggers: [],
  onEnter: "dev_route_enter",
  encounters: {
    grass: { rate: 12, slots: [{ species: "fern_fiddlehead", minLevel: 3, maxLevel: 5, weight: 1 }] },
    bog: { rate: 15, slots: [{ species: "sundew_rosette", minLevel: 4, maxLevel: 6, weight: 1 }] },
  },
};

/** The Nursery Garden (counter + yard with boarders) and a bramble patch, for ?dev=overworld&fixture=nursery. */
const nursery: MapDef = {
  id: "glasshouse_nursery",
  name: "TEST NURSERY",
  outdoor: false,
  music: "greenhouse",
  tiles: [
    "WWwWWWWWwWWW",
    "............",
    "...CCC......",
    "............",
    "FFFFFF.FFFFF",
    ",,,,,,....,,",
    "..........KK",
    "..........K.",
    "....MM......",
  ],
  legend: {
    W: "wall", w: "window", ".": "grass", C: "counter", F: "fence", ",": "flowers", K: "bramble_bush", M: "mat_exit",
  },
  border: "void",
  structures: [],
  warps: [
    { x: 4, y: 8, to: "fallowfield", toX: 3, toY: 4, facing: "down" },
    { x: 5, y: 8, to: "fallowfield", toX: 3, toY: 4, facing: "down" },
  ],
  npcs: [
    { id: "keeper", sprite: "nursery_keeper", x: 4, y: 1, facing: "down", script: "dev_nursery" },
    { id: "yard_keeper", sprite: "nursery_keeper_b", x: 8, y: 5, facing: "left", script: "dev_nursery_yard" },
    { id: "boarder_1", sprite: "potted_plant", x: 2, y: 6, facing: "down", movement: "wander" },
    { id: "boarder_2", sprite: "potted_plant", x: 6, y: 6, facing: "down", movement: "wander" },
  ],
  signs: [],
  triggers: [],
  hidden: [{ x: 11, y: 7, item: "compost", qty: 2 }],
};

const scripts: Record<string, ScriptCmd[]> = {
  dev_nursery: [
    { op: "say", text: "Welcome to the NURSERY GARDEN!" },
    { op: "nursery" },
    { op: "say", text: "Mind how you go!" },
  ],
  dev_nursery_yard: [
    {
      op: "ifNurserySeed",
      then: [{ op: "say", text: "Oh! Something's turned up in the beds. Ask at the counter!" }],
      else: [{ op: "say", text: "I water the boarders twice a day." }],
    },
    { op: "ifHasItem", item: "pruning_shears", then: [], else: [{ op: "giveItem", item: "pruning_shears" }] },
  ],
  dev_elder: [
    { op: "say", text: "Hello, {PLAYER}! I test the script engine. Which test?" },
    {
      op: "choice",
      options: ["ITEMS", "SPECIES", "FX", "FLAGS"],
      branches: [
        [{ op: "giveItem", item: "terrarium_pod", qty: 5 }, { op: "giveItem", item: "field_herbarium" }, { op: "giveMoney", amount: 500 }],
        [
          { op: "showSpecies", species: "oak_acorn" },
          { op: "say", text: "An OAK ACORN. It fell from a tree that might be four hundred years old." },
          {
            op: "yesno", prompt: "Will you take it?",
            yes: [{ op: "hideSpecies" }, { op: "giveSpecies", species: "oak_acorn", level: 5 }],
            no: [{ op: "hideSpecies" }, { op: "say", text: "Another time, then." }],
          },
        ],
        [
          { op: "emote", who: "elder", emote: "♪" },
          { op: "emote", who: "player", emote: "?" },
          { op: "shake", frames: 40 },
          { op: "fade", to: "white" },
          { op: "wait", frames: 20 },
          { op: "fade", to: "clear" },
          { op: "moveNpc", npc: "elder", path: ["left", "left"] },
          { op: "face", who: "elder", dir: "toPlayer" },
          { op: "say", text: "…I felt that one in my roots." },
          { op: "moveNpc", npc: "elder", path: ["right", "right"] },
          { op: "face", who: "elder", dir: "down" },
        ],
        [
          {
            op: "if", when: [{ flag: "dev_show_owl", is: true }],
            then: [{ op: "setFlag", flag: "dev_show_owl", value: false }, { op: "say", text: "The birdwatcher has gone home." }],
            else: [{ op: "setFlag", flag: "dev_show_owl" }, { op: "say", text: "A birdwatcher has arrived by the pond!" }],
          },
        ],
      ],
    },
  ],
  dev_wanderer: [
    { op: "ifTime", time: ["night"], then: [{ op: "say", text: "The moonflowers open at night. Listen!" }], else: [{ op: "say", text: "Lovely day for a wander. Mind the tall grass!" }] },
  ],
  dev_kid: [{ op: "say", text: "I'm keeping watch! Nothing gets past me." }, { op: "emote", who: "kid", emote: "!" }],
  dev_pod: [{ op: "giveItem", item: "terrarium_pod" }],
  dev_night: [{ op: "say", text: "Shh! I'm listening for owls." }],
  dev_trigger: [
    { op: "emote", who: "player", emote: "!" },
    { op: "say", text: "A step-on trigger fired. It won't fire again." },
    { op: "setFlag", flag: "dev_trigger_seen" },
  ],
  dev_heal: [
    { op: "say", text: "Welcome! Shall I tend your Quickened?" },
    {
      op: "yesno", prompt: "Rest your Quickened?",
      yes: [{ op: "heal" }, { op: "say", text: "All fighting fit. Come back any time!" }],
      no: [{ op: "say", text: "Take care out there!" }],
    },
  ],
  dev_route_enter: [],
};

const trainers: Record<string, TrainerDef> = {
  dev_gardener: {
    id: "dev_gardener", name: "MOSS", className: "GARDENER", portrait: "gardener",
    team: [{ species: "bramble_blossom", level: 3 }], prize: 120,
    intro: "Hey! Your boots are on my seedlings! Battle me!",
    defeat: "Pruned back…",
    after: "I'll replant. Plants always come back.",
    ai: "basic",
  },
};

/** A world with the fixture maps layered over the real ones. */
export function devWorld(base: WorldData): WorldData {
  const maps = { ...base.maps } as Record<MapId, MapDef>;
  maps.fallowfield = town;
  maps.player_home = house;
  maps.route_1 = route;
  maps.glasshouse_nursery = nursery;
  return {
    ...base,
    maps,
    scripts: { ...base.scripts, ...scripts },
    trainers: { ...base.trainers, ...trainers },
  };
}

export const DEV_START = { map: "fallowfield" as MapId, x: 7, y: 6, facing: "down" as const };
