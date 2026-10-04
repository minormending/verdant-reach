// Shared vocabulary. Every agent builds against these lists; adding an id
// here is a contract change (ask main), adding content under an existing id
// is not.

export const TYPES = [
  "wood", "fire", "water", "bug", "bloom", "ghost", "thorn", "frost", "dragon",
] as const;
export type TypeId = (typeof TYPES)[number];

/** The vertical-slice roster (Prologue + Act 1). Lines evolve left to right. */
export const SPECIES_IDS = [
  // Starters
  "oak_acorn", "oak_sapling", "great_oak",                    // wood
  "chili_blossom", "green_chili", "red_chili",                // fire
  "lily_seedpod", "lily_pad", "giant_water_lily",             // water
  // Act 1 wild + trainer lines
  "dandelion_bud", "dandelion", "dandelion_clock",            // bloom
  "bramble_blossom", "bramble_berry", "blackberry",           // wood / thorn
  "sunflower_seedling", "sunflower_bud", "sunflower",         // bloom
  "pumpkin_blossom", "green_pumpkin", "pumpkin",              // wood
  "fern_fiddlehead", "unfurling_fern", "ostrich_fern",        // wood
  "flytrap_seedling", "young_flytrap", "venus_flytrap",       // bug
  "sundew_rosette", "sundew",                                 // bug
  "maple_samara", "maple_sapling", "sugar_maple",             // wood
  "nettle_sprout", "stinging_nettle",                         // thorn
  "moonflower_seed", "moonflower_vine", "moonflower",         // ghost (night only)
] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

export const MAP_IDS = [
  "player_home",            // interior, Fallowfield
  "herbarium",              // interior: Dr. Vale's lab + greenhouse room
  "herbarium_roof",         // prologue observation deck
  "fallowfield",            // home town
  "route_1",                // Fallowfield -> Hedgerow (hedgerow lanes)
  "hedgerow",               // hamlet
  "fennimore_house",        // interior: Old Fennimore
  "route_2",                // Hedgerow -> Bramblegate (woodland edge, ledges)
  "bramblegate",            // town
  "bramblegate_greenhouse", // healing centre
  "bramblegate_market",     // shop
  "bramblegate_conservatory", // Conservatory 1 (Hollis, Wood)
  "route_3",                // Bramblegate -> Sugarbush (night meadow section)
  "sugarbush",              // maple-syrup town
  "sugarbush_greenhouse",   // healing centre
  "sugarbush_grove",        // dungeon: Rootstock tapping Quickened maples
  "sugarbush_conservatory", // Conservatory 2 (Nell Pitcher, Bug) in the bog
] as const;
export type MapId = (typeof MAP_IDS)[number];

/** 16x16 tiles. Properties are fixed here so world, engine and art agree. */
export const TILES = {
  // outdoor ground
  grass:        { walk: true },
  tall_grass:   { walk: true, encounter: "grass" },
  flowers:      { walk: true },
  path:         { walk: true },
  dirt:         { walk: true },
  sand:         { walk: true },
  bog:          { walk: true, encounter: "bog" },
  boardwalk:    { walk: true },
  water:        { walk: false, water: true },
  ledge_down:   { walk: false, ledge: "down" }, // hop south only
  // outdoor obstacles
  tree:         { walk: false },
  maple_tree:   { walk: false },
  tapped_maple: { walk: false },                // story: tapped by Rootstock
  hedge:        { walk: false },
  bramble_bush: { walk: false },                // needs Prune later (not in slice)
  rock:         { walk: false },
  fence:        { walk: false },
  sign:         { walk: false, interact: true },
  mailbox:      { walk: false, interact: true },
  // interior
  floor_wood:   { walk: true },
  floor_tile:   { walk: true },
  floor_greenhouse: { walk: true },
  rug:          { walk: true },
  mat_exit:     { walk: true },                 // warp tile at interior exits
  wall:         { walk: false },
  window:       { walk: false },
  counter:      { walk: false, interact: true },  // talk across it
  table:        { walk: false },
  bookshelf:    { walk: false, interact: true },
  plant_pot:    { walk: false },
  planter_bed:  { walk: false },
  bed:          { walk: false },
  specimen_cabinet: { walk: false, interact: true }, // the "PC": party/box storage
  stairs_up:    { walk: true },
  stairs_down:  { walk: true },
  water_channel:{ walk: false },
  void:         { walk: false },                // black, outside interiors
} as const satisfies Record<string, TileProps>;
export type TileKey = keyof typeof TILES;

export interface TileProps {
  walk: boolean;
  encounter?: "grass" | "bog";
  water?: boolean;
  ledge?: "down";
  interact?: boolean;
}

/** Multi-tile buildings drawn from one image; footprint is solid except the door. */
export const STRUCTURES = {
  house_small:  { w: 4, h: 3, door: { x: 1, y: 2 } },
  house_large:  { w: 5, h: 4, door: { x: 2, y: 3 } },
  herbarium:    { w: 6, h: 4, door: { x: 2, y: 3 } },
  greenhouse:   { w: 4, h: 3, door: { x: 2, y: 2 } }, // healing centre exterior
  market:       { w: 4, h: 3, door: { x: 1, y: 2 } },
  conservatory: { w: 6, h: 4, door: { x: 3, y: 3 } },
  lodge:        { w: 5, h: 3, door: { x: 2, y: 2 } }, // sugarbush sugar shack
} as const;
export type StructureKey = keyof typeof STRUCTURES;

/** Overworld character sheets (see ASSET CONVENTIONS in constants.ts). */
export const CHARACTERS = [
  "player", "vale", "bram", "fennimore", "hollis", "nell_pitcher",
  "shears", "grunt", "greenhouse_keeper", "shopkeeper", "pip",
  "villager_a", "villager_b", "elder", "kid",
  "gardener", "schoolkid", "birdwatcher", "hiker", "beekeeper", "florist",
  // objects that use the NPC system (single static frame is fine)
  "potted_plant",  // starter pots in the Herbarium greenhouse
  "item_pickup",   // an acorn-shaped pod lying on the ground (item ball)
] as const;
export type CharacterKey = (typeof CHARACTERS)[number];

/** 56x56 trainer pictures shown at the start of trainer battles. */
export const TRAINER_PORTRAITS = [
  "bram", "hollis", "nell_pitcher", "shears", "grunt",
  "gardener", "schoolkid", "birdwatcher", "hiker", "beekeeper", "florist",
  "player_back", // 48x48 back view used on the player's side
] as const;
export type TrainerPortraitKey = (typeof TRAINER_PORTRAITS)[number];

export const MUSIC = [
  "title", "prologue_bloom", "herbarium", "fallowfield", "route", "route_night",
  "small_town", "greenhouse", "market", "conservatory", "sugarbush_grove",
  "rival_appears", "rootstock_appears", "battle_wild", "battle_trainer",
  "battle_leader", "battle_rootstock", "victory_wild", "victory_trainer",
  "victory_leader", "slice_end",
] as const;
export type MusicId = (typeof MUSIC)[number];

/** Short non-looping cues that pause music while they play. */
export const JINGLES = ["heal", "caught", "growth", "mark", "item_get", "level_up"] as const;
export type JingleId = (typeof JINGLES)[number];

export const SFX = [
  "select", "cancel", "cursor", "bump", "door", "ledge", "menu_open", "save",
  "encounter", "hit", "hit_super", "hit_weak", "wilt", "stat_up", "stat_down",
  "pod_throw", "pod_shake", "pod_click", "exp_tick", "run", "text_blip",
] as const;
export type SfxId = (typeof SFX)[number];

export const STATUSES = [
  "blight",    // poison-like: chip damage each turn
  "scorch",    // burn-like: chip damage, physical attack halved
  "frostbite", // freeze-like: can't act until thawed
  "dormant",   // sleep-like: can't act for 1-3 turns
  "rootbound", // paralysis-like: speed down, may fail to act
] as const;
export type StatusId = (typeof STATUSES)[number];

/** Item ids the world/story scripts rely on. The data agent may add more. */
export const REQUIRED_ITEMS = [
  "terrarium_pod", "glass_pod",               // capture
  "water_flask", "spring_water", "rain_jar",  // healing: small / medium / full
  "compost",                                  // revive a wilted Quickened
  "neem_spray",                               // cures any status
  "field_herbarium", "centuryheart_seed", "fennimores_letter", // key items
] as const;
export type RequiredItemId = (typeof REQUIRED_ITEMS)[number];
export type ItemId = RequiredItemId | (string & {});
export type MoveId = string;
export type TrainerId = string;
export type ScriptId = string;

/** Pressed Marks (badges) available in the slice. */
export const MARKS = ["bramble_mark", "sundew_mark"] as const;
export type MarkId = (typeof MARKS)[number];

export type Dir = "up" | "down" | "left" | "right";
export type Button = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
