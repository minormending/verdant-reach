// Shared vocabulary. Every agent builds against these lists; adding an id
// here is a contract change (ask main), adding content under an existing id
// is not.

export const TYPES = [
  "wood", "fire", "water", "bug", "bloom", "ghost", "thorn", "frost", "dragon",
] as const;
export type TypeId = (typeof TYPES)[number];

/** The playable roster (Prologue -> Chapter 4). Lines evolve left to right. */
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
  // Round 3 additions (2-stage lines)
  "clover_sprout", "white_clover",                            // bloom
  "cattail_shoot", "cattail",                                 // water (bog)
  "foxglove_rosette", "foxglove",                             // bloom/ghost (poisonous)
  "holly_seedling", "holly",                                  // frost/wood
  "mint_sprig", "peppermint",                                 // frost (menthol)
  "rose_bud", "wild_rose",                                    // thorn/bloom
  "pitcher_sprout", "pitcher_plant",                          // bug/water
  "snapdragon_sprout", "snapdragon",                          // dragon/bloom (rare gift)
  // Round 4: Chapter 4 (Route 4 orchard, Glasshouse City, the Palm House)
  "apple_pip", "apple_sapling", "apple_tree",                 // wood/bloom (Route 4 orchard)
  "orchid_keiki", "orchid_spike", "moth_orchid",              // bloom (Palm House; Flora's ace)
  "monstera_cutting", "monstera",                             // wood (Palm House)
  "lotus_seed", "sacred_lotus",                               // water/bloom (Palm House pool)
  "paradise_shoot", "bird_of_paradise",                       // bloom/fire? (Palm House, rare)
  // Chapter 5
  "ghostpipe_stalk", "ghostpipe_nodding", "ghost_pipe",
  "fireweed_fluff", "fireweed_shoot", "fireweed",
  "lodgepole_cone", "lodgepole_seedling", "lodgepole_pine",
  "skunk_cabbage_shoot", "skunk_cabbage",
  "cedar_seedling", "red_cedar",
  // Chapter 6
  "mangrove_propagule", "mangrove_sapling", "red_mangrove",
  "seagrass_shoot", "eelgrass",
  "pear_pad", "padded_cactus", "prickly_pear",
  "saguaro_pup", "saguaro_column", "saguaro",
  "vanilla_vine", "vanilla_orchid",
  // Chapter 7
  "snowdrop_bulb", "snowdrop_shoot", "snowdrop",
  "campion_cushion", "campion_mound", "moss_campion",
  "larch_seedling", "larch",
  "edelweiss_bud", "edelweiss",
  "bladderwort_sprig", "bladderwort",
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
  // Round 4: Chapter 4
  "route_4",                // Sugarbush -> Glasshouse City (orchard + river)
  "glasshouse_city",        // the city under the glass dome
  "palm_house",             // tropical glasshouse inside the dome (wild encounters)
  "glasshouse_greenhouse",  // healing centre
  "glasshouse_market",      // the big market (shop, two counters)
  "glasshouse_nursery",     // Nursery Garden (breeding: house + yard)
  "glasshouse_relay",       // the Root Relay research station
  "glasshouse_conservatory",// Conservatory 3 (Flora Vance, Bloom)
  "glasshouse_house",       // residents' house (Pip, a quest giver)
  "route_5",                // Glasshouse City -> Hedgerow (short loop; brambles need PRUNE)
  // Chapter 5 (CH5_IDS.md §B order)
  "route_6", "cedarhallow", "cedarhallow_greenhouse", "cedarhallow_market",
  "cedarhallow_house", "cedar_hollow", "burnt_stand", "cedarhallow_conservatory",
  // Chapter 6 (CH6.md §4 order)
  "route_7", "saltmarsh_harbour", "saltmarsh_greenhouse", "saltmarsh_market", "saltmarsh_conservatory", "route_8", "driftseed_isle", "driftseed_greenhouse", "driftseed_conservatory", "driftseed_vents",
  // Chapter 7 (CH7.md §4 order)
  "route_9", "larchmere", "larchmere_greenhouse", "larchmere_market", "bloom_lake", "larchmere_lodge", "rootstock_hideout_1", "rootstock_hideout_2", "larchmere_conservatory",
  // Chapter 8 (CH8.md §2 order)
  "relay_2f", "relay_3f", "relay_roof",
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
  ice:          { walk: true, slide: true },
  snow:         { walk: true, encounter: "grass" },
  bog:          { walk: true, encounter: "bog" },
  boardwalk:    { walk: true },
  water:        { walk: false, water: true },
  ledge_down:   { walk: false, ledge: "down" }, // hop south only
  // outdoor obstacles
  tree:         { walk: false },
  maple_tree:   { walk: false },
  tapped_maple: { walk: false },                // story: tapped by Rootstock
  hedge:        { walk: false },
  bramble_bush: { walk: false, fieldMove: "prune" }, // PRUNE clears it (Round 4)
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
  // --- polish pass: decoration and set dressing ------------------------------
  flowers_red:    { walk: true },
  flowers_yellow: { walk: true },
  stone_path:     { walk: true },
  bridge:         { walk: true },                // wooden bridge over water
  mushrooms:      { walk: true },
  gate_open:      { walk: true },                // gap in a fence/stone wall
  chair:          { walk: true },
  stump:          { walk: false },
  log:            { walk: false },
  lamp_post:      { walk: false },
  barrel:         { walk: false },
  crate:          { walk: false },
  bench:          { walk: false },
  pond_lily:      { walk: false, water: true },  // water with lily pads
  reeds:          { walk: false },
  cliff:          { walk: false },
  stone_wall:     { walk: false },
  garden_plot:    { walk: false },
  crops:          { walk: false },
  scarecrow:      { walk: false },
  haybale:        { walk: false },
  fireplace:      { walk: false },
  stove:          { walk: false },
  potted_tree:    { walk: false },
  glass_wall:     { walk: false },               // conservatory glazing
  workbench:      { walk: false, interact: true },
  microscope:     { walk: false, interact: true },
  // --- Round 4: Chapter 4 ----------------------------------------------------
  bramble_stump:  { walk: true },                // a pruned bramble (drawn where PRUNE cut one)
  paving:         { walk: true },                // city flagstones
  tropical_grass: { walk: true, encounter: "grass" }, // Palm House undergrowth
  orchard_tree:   { walk: false },               // apple trees (canopy group "orchard")
  fallen_apples:  { walk: true },
  stepping_stones:{ walk: true },                // across shallow river water
  palm_tree:      { walk: false },
  iron_railing:   { walk: false },
  market_stall:   { walk: false, interact: true },
  fountain_basin: { walk: false, water: true },  // small decorative pool edge
  console:        { walk: false, interact: true }, // Root Relay listening desk
  sensor_post:    { walk: false, interact: true }, // buried-sensor head, outdoors or in
  server_rack:    { walk: false },
  cable_floor:    { walk: true },
  seed_tray:      { walk: false },
  potting_bench:  { walk: false, interact: true },
  rose_trellis:   { walk: false },               // Conservatory 3 maze walls
  rose_bed:       { walk: false },
  floor_marble:   { walk: true },
  stage_floor:    { walk: true },
  // --- Chapter 5: Route 6 old growth, Cedarhallow, the Hollow, the Burnt Stand
  oldgrowth_tree: { walk: false },               // huge cedar/fir trunks (canopy group "oldgrowth")
  moss:           { walk: true },                // old-growth forest floor
  fern_brush:     { walk: true, encounter: "grass" }, // Route 6 undergrowth
  canopy_boardwalk: { walk: true },              // the raised walkway (group "canopy_boardwalk")
  canopy_drop:    { walk: false },               // the forest floor far below the walkway
  rope_rail:      { walk: false },               // walkway railing
  ash:            { walk: true },                // burnt ground
  burnt_trunk:    { walk: false },               // standing dead snag
  charred_log:    { walk: false },
  fresh_shoots:   { walk: true, encounter: "grass" }, // fireweed regrowth in the Burnt Stand
  shrine_floor:   { walk: true },                // inside the Hollow
  hollow_wall:    { walk: false },               // the living wood of the giant trunk
  carved_post:    { walk: false, interact: true }, // the Hollow's side-shrines
  ghostpipe_clump:{ walk: false },               // pale ghost pipes (decoration, unlit)
  glow_pipe:      { walk: false },               // glowing ghost pipes: a light source on dark maps, like lamp_post
  night_floor:    { walk: true },                // Conservatory 4 slate
  // Chapter 6: tidal coast and volcanic island
  seagrass_bed:   { walk: false, water: true },
  mangrove_roots: { walk: false },
  tide_pool:      { walk: false, water: true },
  pier:           { walk: true },
  salt_flat:      { walk: true },
  driftwood:      { walk: false },
  beach_rock:     { walk: false },
  fishing_net:    { walk: false },
  dry_grass:      { walk: true },               // sparse dune tufts, no encounters
  shell_scatter:  { walk: true },
  vent_moss:      { walk: true, encounter: "grass" },
  cactus_scrub:   { walk: true, encounter: "grass" },
  volcanic_rock:  { walk: false },
  basalt_floor:   { walk: true },
  vent_steam:     { walk: false },
  // Chapter 7: the alpine pass, Larchmere, Bloom Lake and the Rootstock hideout
  larch_tree:     { walk: false },               // narrow golden-green conifer; also a map border
  scree:          { walk: true },                // loose stone chips on the slope
  snow_grass:     { walk: true, encounter: "grass" }, // alpine tufts poking through snow
  frozen_shore:   { walk: true },                // pebbled lake edge with thin ice
  red_water:      { walk: false, water: true },  // Bloom Lake while forced awake (legendWhen only)
  hideout_floor:  { walk: true },                // dark steel grate
  hideout_wall:   { walk: false },               // riveted panels and pipes
} as const satisfies Record<string, TileProps>;
export type TileKey = keyof typeof TILES;

export interface TileProps {
  walk: boolean;
  slide?: boolean;
  encounter?: "grass" | "bog";
  water?: boolean;
  ledge?: "down";
  interact?: boolean;
  /** A field move clears this tile (sets flag `pruned_<map>_<x>_<y>`; then drawn as bramble_stump, walkable). */
  fieldMove?: FieldMove;
}

/** Field moves (HM equivalents). No move slots: each is unlocked by a key item. */
export const FIELD_MOVES = { prune: { item: "pruning_shears" } } as const;
export type FieldMove = keyof typeof FIELD_MOVES;

/** Multi-tile buildings drawn from one image; footprint is solid except the
 *  door. Structures without a door are scenery (barn doors are painted shut). */
const STRUCTURE_SPECS = {
  house_small:  { w: 4, h: 3, door: { x: 1, y: 2 } },
  house_large:  { w: 5, h: 4, door: { x: 2, y: 3 } },
  herbarium:    { w: 6, h: 4, door: { x: 2, y: 3 } },
  greenhouse:   { w: 4, h: 3, door: { x: 2, y: 2 } }, // healing centre exterior
  market:       { w: 4, h: 3, door: { x: 1, y: 2 } },
  conservatory: { w: 6, h: 4, door: { x: 3, y: 3 } },
  lodge:        { w: 5, h: 3, door: { x: 2, y: 2 } }, // sugarbush sugar shack
  barn:         { w: 5, h: 4 },
  windmill:     { w: 3, h: 4 },
  well:         { w: 2, h: 2 },
  big_oak:      { w: 3, h: 3 },                  // landmark tree
  big_maple:    { w: 2, h: 2 },
  // Round 4: Glasshouse City
  relay_station:     { w: 6, h: 4, door: { x: 2, y: 3 } }, // Root Relay (sensor mast on the roof)
  nursery_garden:    { w: 5, h: 3, door: { x: 2, y: 2 } }, // potting shed + glass lean-to
  palm_house:        { w: 6, h: 4, door: { x: 3, y: 3 } }, // curved glass house
  city_house:        { w: 4, h: 4, door: { x: 1, y: 3 } }, // two-storey townhouse
  market_large:      { w: 6, h: 4, door: { x: 3, y: 3 } }, // the GLASSHOUSE MARKET
  rose_conservatory: { w: 6, h: 4, door: { x: 3, y: 3 } }, // Conservatory 3
  fountain:          { w: 3, h: 3 },                       // city square centrepiece
  relay_mast:        { w: 1, h: 3 },                       // listening mast (scenery)
  // Chapter 5: Cedarhallow
  cedar_house:         { w: 4, h: 4, door: { x: 1, y: 3 } }, // plank house on a stone footing
  hollow_trunk:        { w: 5, h: 5, door: { x: 2, y: 4 } }, // the giant cedar that holds the Hollow
  night_conservatory:  { w: 6, h: 4, door: { x: 3, y: 3 } }, // Conservatory 4 (dark glass)
  giant_cedar:         { w: 3, h: 4 },                       // landmark tree (scenery)
  camp_tent:           { w: 3, h: 2 },                       // Rootstock camp tent (scenery)
  // Chapter 6: Saltmarsh Harbour and Driftseed Isle
  harbour_house:      { w: 4, h: 3, door: { x: 1, y: 2 } },
  lantern_tree:       { w: 3, h: 4 },
  tide_conservatory:  { w: 6, h: 4, door: { x: 3, y: 3 } },
  adobe_conservatory: { w: 6, h: 4, door: { x: 3, y: 3 } },
  driftwood_hut:      { w: 4, h: 3, door: { x: 1, y: 2 } },
  // Chapter 7: Larchmere
  alpine_lodge:       { w: 5, h: 3, door: { x: 2, y: 2 } }, // the Lakeside Lodge
  chalet:             { w: 4, h: 3, door: { x: 1, y: 2 } },
  frost_conservatory: { w: 6, h: 4, door: { x: 3, y: 3 } }, // Conservatory 7
  boathouse:          { w: 4, h: 3 },                       // lakeside scenery
} as const satisfies Record<string, StructureSpec>;
export interface StructureSpec { w: number; h: number; door?: { x: number; y: number } }
export const STRUCTURES: Record<keyof typeof STRUCTURE_SPECS, StructureSpec> = STRUCTURE_SPECS;
export type StructureKey = keyof typeof STRUCTURE_SPECS;

/** Overworld character sheets (see ASSET CONVENTIONS in constants.ts). */
export const CHARACTERS = [
  "player", "vale", "bram", "fennimore", "hollis", "nell_pitcher",
  "shears", "grunt", "greenhouse_keeper", "shopkeeper", "pip",
  "villager_a", "villager_b", "elder", "kid",
  "gardener", "schoolkid", "birdwatcher", "hiker", "beekeeper", "florist",
  // objects that use the NPC system (single static frame is fine)
  "potted_plant",  // starter pots in the Herbarium greenhouse
  "item_pickup",   // an acorn-shaped pod lying on the ground (item ball)
  // polish pass: ambient life and puzzle objects
  "cat", "dog", "bird",          // ambient wanderers (talkable for flavour)
  "hedge_gate",                  // closed gate; hide via visibleWhen to open
  "lever",                       // interactable switch (2 frames: off/on rows ok)
  "valve",                       // bog water valve (puzzle)
  "harvest_bush",                // fruiting bush: DOWN row = ripe, UP row = picked
  // Round 4: Chapter 4
  "flora_vance", "wren", "nursery_keeper", "nursery_keeper_b",
  "researcher", "orchardist", "arranger", "reporter", "gentleman",
  "rose_gate",                   // Conservatory 3 trellis gate (hide via visibleWhen to open)
  "boulder",                     // UPROOT puzzle object; resets on map entry
  // Chapter 5
  "morrow", "shrine_keeper", "ranger", "lumberjack", "forager", "night_gardener",
  "cone_sack",                   // a Rootstock sack of sealed cones (static object)
  // Chapter 6
  "reyes", "brother_saguaro", "calloway", "sailor", "diver", "angler", "island_elder",
  // Chapter 7
  "signe", "skier", "lodge_keeper",
  "signal_emitter",              // Rootstock broadcast cabinet: DOWN row on, UP row switched off
  "crimson_lily",                // the CRIMSON LILY on its islet (static object)
] as const;
export type CharacterKey = (typeof CHARACTERS)[number];

/** 56x56 trainer pictures shown at the start of trainer battles. */
export const TRAINER_PORTRAITS = [
  "bram", "hollis", "nell_pitcher", "shears", "grunt",
  "gardener", "schoolkid", "birdwatcher", "hiker", "beekeeper", "florist",
  "flora_vance", "orchardist", "arranger", "researcher", "gentleman", // Round 4
  "morrow", "lumberjack", "forager", "night_gardener", // Chapter 5
  "reyes", "brother_saguaro", "calloway", "sailor", "diver", "angler", // Chapter 6
  "signe", "skier", // Chapter 7
  "player_back", // 48x48 back view used on the player's side
] as const;
export type TrainerPortraitKey = (typeof TRAINER_PORTRAITS)[number];

export const MUSIC = [
  "title", "prologue_bloom", "herbarium", "fallowfield", "route", "route_night",
  "small_town", "greenhouse", "market", "conservatory", "sugarbush_grove",
  "rival_appears", "rootstock_appears", "battle_wild", "battle_trainer",
  "battle_leader", "battle_rootstock", "victory_wild", "victory_trainer",
  "victory_leader", "slice_end",
  "glasshouse_city", "palm_house", "root_relay", // Round 4
  "cedarhallow", "burnt_stand", "hollow", // Chapter 5
  "alpine", "red_lake", "hideout", // Chapter 7
] as const;
export type MusicId = (typeof MUSIC)[number];

/** Short non-looping cues that pause music while they play. */
export const JINGLES = ["heal", "caught", "growth", "mark", "item_get", "level_up", "quest", "sprouted"] as const;
export type JingleId = (typeof JINGLES)[number];

export const SFX = [
  "select", "cancel", "cursor", "bump", "door", "ledge", "menu_open", "save",
  "encounter", "hit", "hit_super", "hit_weak", "wilt", "stat_up", "stat_down",
  "pod_throw", "pod_shake", "pod_click", "exp_tick", "run", "text_blip",
  "prune", "sprout", "pulse", // Round 4
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
  "wild_berry", "rose_hip",                   // harvested from bushes: heal / cure
  "syrup_jar",                                // key item for the SAP RUN quest
  "pruning_shears",                           // key item: unlocks the PRUNE field move
  "foxfire_lantern",                          // key item: automatically lights dark maps
  "lily_raft",                                // key item: ride water with RAFT
  "saxifrage",                                // key item: unlocks UPROOT boulder pushes
  "climber_pack",                             // key item: the LOST CLIMBER pack
  "cactus_sap",                               // key item: Saguaro's remedy for the Lantern Tree
  "relay_keycard",                            // key item: access to every RELAY floor
  "fan_letter", "signed_photo",               // key items for the FAN MAIL quest
] as const;
export type RequiredItemId = (typeof REQUIRED_ITEMS)[number];
export type ItemId = RequiredItemId | (string & {});
export type MoveId = string;
export type TrainerId = string;
export type ScriptId = string;

/** Pressed Marks (badges) available so far. */
export const MARKS = ["bramble_mark", "sundew_mark", "rose_mark", "pipe_mark", "cactus_mark", "mangrove_mark", "snowdrop_mark"] as const;
export type MarkId = (typeof MARKS)[number];

/** Full-screen 160x144 illustrations shown during key story beats. */
export const STILLS = [
  "bloom", "greenhouse_morning", "theft", "grove_taps", "graft_collar", "vale_call",
  "glasshouse_dome", "relay_pulse", // Round 4
  "fire_cone_vision", "morrow_listening", // Chapter 5
  "lantern_tree_healed", // Chapter 6
  "rootstock_files", "crimson_lily", // Chapter 7
] as const;
export type StillKey = (typeof STILLS)[number];

export type Dir = "up" | "down" | "left" | "right";
export type Button = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
