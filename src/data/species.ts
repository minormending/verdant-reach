// Species. Gen 2–style balance:
//  - starter lines total ~310 / 405 / 525 and grow at 16 and 32;
//  - wild three-stage lines total ~255–290 / 350–370 / 465–490 and grow at
//    roughly 11–14 and 22–26 (SLICE.md);
//  - two-stage lines (sundew, nettle) total ~300 / ~460 and grow once (16–18).
//  - Round 3 two-stage lines total 275–315 / 420–470 and grow at 16–22:
//    clover (tending 120), cattail 17, foxglove (night, 18), holly 20,
//    mint 16, wild rose (day, 18), pitcher 18, snapdragon 22. Snapdragon is
//    the rare dragon: the top of both bands, slow, and 4x weak to frost.
// Stat personalities: oak = physical bulk, chili = fast special attacker,
// lily = special wall; dandelion = fast and frail; pumpkin = slow tank;
// flytrap = glass-cannon physical; moonflower = special night attacker.
//
// Growth rate mapping to the Gen 2 curves (see growth.ts):
//   fast -> "fast", medium -> "medium fast" (n^3), slow -> "slow".
// Starters are "medium" so the player's starter reaches 16 near
// Conservatory 2 in a 60–90 minute slice.
//
// Learnsets: level-1 entries are the starting moves (a STAB attack plus a
// status move). Later stages share the line's list and add their own moves;
// the growth level itself often teaches a signature move.

import type { GrowthTrigger, MoveId, PollinationGroup, Species, SpeciesId, Stats, TypeId } from "../contracts";

type L = [number, MoveId][];
const st = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats =>
  ({ hp, atk, def, spa, spd, spe });
// Sorted by level; a move listed twice (e.g. a line's base list plus a
// growth-move list) is kept only at its earliest level.
const learn = (...lists: L[]): Species["learnset"] => {
  const seen = new Set<string>();
  return lists.flat().sort((a, b) => a[0] - b[0])
    .filter(([, move]) => !seen.has(move) && seen.add(move) !== undefined)
    .map(([level, move]) => ({ level, move }));
};
const vigor = (level: number): GrowthTrigger => ({ kind: "vigor", level });

interface Def {
  id: SpeciesId; name: string; line: string; stage: 1 | 2 | 3;
  types: [TypeId] | [TypeId, TypeId]; base: Stats; rate: Species["growthRate"];
  catchRate: number; baseExp: number; ev: Partial<Stats>;
  activity?: Species["activity"];
  grows?: [SpeciesId, GrowthTrigger];
  learnset: Species["learnset"];
}

// Nursery Garden pollination groups, by line (every stage of a line shares
// them). Loosely: how the real plant is pollinated and where it grows; see
// POLLINATION_GROUPS in contracts/data.ts. Two groups = a "bridge" line that
// can set seed with either.
const POLLINATION: Record<string, PollinationGroup[]> = {
  oak: ["woodland"],                 // wind-pollinated forest tree
  chili: ["garden"],                 // a kitchen-garden crop
  lily: ["wetland", "tropical"],     // Amazon river lily, the glasshouse classic
  dandelion: ["meadow"],
  bramble: ["woodland"],             // hedges and wood edges
  sunflower: ["meadow", "garden"],   // field crop and cottage-garden giant
  pumpkin: ["garden"],
  fern: ["spore"],                   // no flowers at all: ferns pair only with ferns
  flytrap: ["carnivore"],
  sundew: ["carnivore", "wetland"],
  maple: ["woodland"],
  nettle: ["woodland"],              // wind-pollinated hedge-bottom weed
  moonflower: ["garden", "tropical"],// a tropical vine grown in night gardens
  clover: ["meadow"],
  cattail: ["wetland"],
  foxglove: ["meadow", "woodland"],  // bumblebee flower of woodland clearings
  holly: ["woodland"],
  mint: ["garden"],
  rose: ["garden", "woodland"],      // the dog rose: hedgerow and garden
  pitcher: ["carnivore", "wetland"],
  snapdragon: ["garden"],
  apple: ["garden"],                 // orchards (and apples need a partner variety)
  orchid: ["tropical"],
  monstera: ["tropical"],
  lotus: ["wetland", "tropical"],
  paradise: ["tropical"],
};

function sp(d: Def): Species {
  return {
    id: d.id, name: d.name, line: d.line, stage: d.stage, types: d.types,
    baseStats: d.base, growthRate: d.rate, catchRate: d.catchRate, baseExp: d.baseExp,
    evYield: d.ev, activity: d.activity ?? "any",
    growsInto: d.grows ? { species: d.grows[0], trigger: d.grows[1] } : undefined,
    learnset: d.learnset,
    pollination: POLLINATION[d.line] ?? [],
  };
}

// ------------------------------------------------------------------ learnsets
const OAK: L = [[1, "vine_lash"], [1, "sap_seal"], [6, "root_tap"], [7, "pale_touch"], [9, "acorn_drop"], [13, "curl_up"], [14, "splinter"],
  [17, "photosynthesise"], [20, "root_snare"], [24, "leaf_edge"], [28, "bark_skin"], [33, "spore_cloud"], [38, "timber"]];
const CHILI: L = [[1, "ember_seed"], [1, "unfurl"], [6, "seed_burst"], [9, "capsaicin"], [13, "smoulder"],
  [17, "sun_flare"], [20, "chili_burst"], [24, "leaf_edge"], [28, "sun_track"], [33, "sap_drain"], [38, "wildfire"]];
const LILY: L = [[1, "dew_drop"], [1, "sap_seal"], [6, "pad_slap"], [7, "hoarfrost"], [9, "rain_call"], [12, "cold_mist"], [13, "undertow"],
  [17, "sap_drain"], [20, "mist_veil"], [24, "flood"], [28, "photosynthesise"], [33, "pale_bloom"], [38, "downpour"]];
const DANDELION: L = [[1, "pollen_puff"], [1, "perfume"], [5, "quick_snap"], [8, "sap_drain"], [12, "wind_scatter"],
  [16, "unfurl"], [20, "seed_burst"], [24, "sunbeam"], [29, "photosynthesise"], [34, "leaf_gale"], [40, "petal_storm"]];
const BRAMBLE: L = [[1, "thorn_jab"], [1, "bristle"], [5, "vine_lash"], [8, "burr_hitch"], [11, "sap_seal"],
  [15, "spine_volley"], [19, "root_tap"], [24, "thorn_lash"], [29, "leaf_edge"], [34, "bark_skin"], [40, "hook_thorns"]];
const SUNFLOWER: L = [[1, "pollen_puff"], [1, "sun_track"], [5, "sap_drain"], [9, "seed_burst"], [12, "allelopathy"],
  [16, "photosynthesise"], [20, "sun_flare"], [24, "sunbeam"], [30, "unfurl"], [35, "leaf_gale"], [40, "petal_storm"]];
const PUMPKIN: L = [[1, "vine_lash"], [1, "curl_up"], [5, "seed_burst"], [9, "sap_seal"], [14, "acorn_drop"],
  [18, "root_tap"], [22, "smoulder"], [26, "gourd_slam"], [31, "bark_skin"], [36, "rot_touch"], [40, "timber"]];
const FERN: L = [[1, "vine_lash"], [1, "curl_up"], [5, "sap_drain"], [9, "leaf_edge"], [13, "night_fold"],
  [17, "fossil_print"], [21, "spore_cloud"], [25, "old_growth"], [30, "leaf_gale"], [35, "red_resin"], [40, "primal_frond"]];
const FLYTRAP: L = [[1, "quick_snap"], [1, "nectar_lure"], [5, "vine_lash"], [8, "sticky_dew"], [12, "snap_trap"],
  [16, "digest"], [20, "bristle"], [24, "pitfall"], [29, "leaf_edge"], [34, "curl_up"], [40, "hook_thorns"]];
const SUNDEW: L = [[1, "dew_grasp"], [1, "sticky_dew"], [5, "pollen_puff"], [9, "nectar_lure"], [13, "digest"],
  [18, "sun_track"], [22, "photosynthesise"], [27, "sunbeam"], [32, "pitfall"], [38, "petal_storm"]];
const MAPLE: L = [[1, "samara_spin"], [1, "sugar_rush"], [5, "sap_drain"], [9, "sap_seal"], [12, "leaf_edge"],
  [16, "sap_spout"], [20, "root_tap"], [25, "hoarfrost"], [30, "bark_skin"], [35, "leaf_gale"], [40, "timber"]];
const NETTLE: L = [[1, "thorn_jab"], [1, "bristle"], [5, "sting_hairs"], [9, "root_snare"], [13, "spine_volley"],
  [16, "allelopathy"], [21, "burr_hitch"], [26, "thorn_lash"], [32, "pitfall"], [38, "hook_thorns"]];
const MOONFLOWER: L = [[1, "pale_touch"], [1, "night_fold"], [5, "pollen_puff"], [8, "wither"], [12, "spore_cloud"],
  [16, "moonbeam"], [20, "dodder_coil"], [25, "perfume"], [30, "pale_bloom"], [35, "sunbeam"], [40, "petal_storm"]];

// Round 3 lines (two stages; grow at 16-22, see the notes by each line).
const CLOVER: L = [[1, "pollen_puff"], [1, "night_fold"], [5, "vine_lash"], [8, "sap_drain"], [11, "lucky_leaf"],
  [15, "root_snare"], [18, "nitro_fix"], [22, "wind_scatter"], [26, "perfume"], [30, "unfurl"], [35, "sunbeam"], [40, "petal_storm"]];
const CATTAIL: L = [[1, "dew_drop"], [1, "sap_seal"], [5, "pad_slap"], [9, "cattail_fluff"], [13, "undertow"],
  [17, "root_tap"], [21, "rain_call"], [25, "leaf_edge"], [29, "bark_skin"], [34, "flood"], [40, "timber"]];
const FOXGLOVE: L = [[1, "pollen_puff"], [1, "nectar_lure"], [5, "pale_touch"], [8, "allelopathy"], [11, "wind_scatter"],
  [14, "wither"], [17, "moonbeam"], [20, "spore_cloud"], [24, "digitalis"], [28, "night_fold"], [32, "pale_bloom"], [36, "sunbeam"], [40, "petal_storm"]];
const HOLLY: L = [[1, "thorn_jab"], [1, "bristle"], [5, "hoarfrost"], [8, "sap_seal"], [12, "spine_volley"],
  [16, "frost_needle"], [24, "evergreen"], [26, "holly_spines"], [28, "thorn_lash"], [32, "cold_snap"], [36, "snowdrift"], [40, "hook_thorns"]];
const MINT: L = [[1, "hoarfrost"], [1, "perfume"], [5, "vine_lash"], [8, "cold_mist"], [12, "sap_drain"],
  [15, "root_snare"], [20, "menthol_chill"], [24, "unfurl"], [28, "frost_bloom"], [32, "cold_snap"], [36, "leaf_gale"], [40, "snowdrift"]];
const ROSE: L = [[1, "thorn_jab"], [1, "perfume"], [5, "pollen_puff"], [8, "vine_lash"], [10, "bristle"],
  [12, "spine_volley"], [22, "rose_thorn"], [25, "unfurl"], [28, "thorn_lash"], [32, "sunbeam"], [36, "petal_storm"], [40, "hook_thorns"]];
const PITCHER: L = [[1, "slick_rim"], [1, "nectar_lure"], [5, "dew_drop"], [8, "sticky_dew"], [12, "digest"],
  [15, "undertow"], [22, "pitfall_slurp"], [25, "pitfall"], [28, "rain_call"], [32, "mist_veil"], [36, "flood"], [40, "downpour"]];
const SNAPDRAGON: L = [[1, "dragon_nip"], [1, "perfume"], [5, "pollen_puff"], [9, "vine_lash"], [13, "red_resin"],
  [17, "dragon_snap"], [21, "unfurl"], [25, "old_growth"], [29, "sunbeam"], [33, "primal_frond"], [37, "leaf_gale"], [40, "petal_storm"]];

// Round 4 lines (Route 4 orchard and the Palm House). Signature moves are
// learned where the real plant does the thing: a monstera only fenestrates
// once it's mature, an apple only blossoms as a grown tree.
const APPLE: L = [[1, "vine_lash"], [1, "sap_seal"], [5, "seed_burst"], [9, "sap_drain"], [13, "root_tap"],
  [17, "windfall"], [21, "leaf_edge"], [25, "bark_skin"], [30, "photosynthesise"], [35, "leaf_gale"], [40, "timber"]];
const ORCHID: L = [[1, "pollen_puff"], [1, "perfume"], [5, "velamen"], [9, "wind_scatter"], [12, "false_nectar"],
  [16, "sun_track"], [20, "moonbeam"], [25, "sunbeam"], [29, "spore_cloud"], [34, "unfurl"], [40, "petal_storm"]];
const MONSTERA: L = [[1, "vine_lash"], [1, "sap_seal"], [5, "sap_drain"], [9, "root_snare"], [13, "seed_burst"],
  [17, "aerial_root"], [21, "leaf_edge"], [26, "photosynthesise"], [30, "root_tap"], [34, "bark_skin"], [38, "leaf_gale"], [42, "timber"]];
const LOTUS: L = [[1, "dew_drop"], [1, "perfume"], [5, "pollen_puff"], [9, "lotus_effect"], [13, "undertow"],
  [17, "pod_shower"], [21, "mist_veil"], [25, "photosynthesise"], [30, "rain_call"], [34, "flood"], [38, "petal_storm"], [42, "downpour"]];
const PARADISE: L = [[1, "pollen_puff"], [1, "sun_track"], [5, "ember_seed"], [9, "perfume"], [13, "smoulder"],
  [17, "pollen_perch"], [21, "sun_flare"], [25, "sunbeam"], [30, "unfurl"], [34, "petal_storm"], [38, "wildfire"]];

const ALL: Species[] = [
  // ------------------------------------------------------------- starters
  sp({ id: "oak_acorn", name: "Oak Acorn", line: "oak", stage: 1, types: ["wood"],
    base: st(52, 54, 64, 42, 54, 44), rate: "medium", catchRate: 45, baseExp: 64, ev: { def: 1 },
    grows: ["oak_sapling", vigor(16)], learnset: learn(OAK) }),
  sp({ id: "oak_sapling", name: "Oak Sapling", line: "oak", stage: 2, types: ["wood"],
    base: st(68, 70, 82, 56, 70, 59), rate: "medium", catchRate: 45, baseExp: 141, ev: { def: 1, hp: 1 },
    grows: ["great_oak", vigor(32)], learnset: learn(OAK, [[16, "bark_skin"]]) }),
  sp({ id: "great_oak", name: "Great Oak", line: "oak", stage: 3, types: ["wood"],
    base: st(95, 95, 105, 75, 95, 60), rate: "medium", catchRate: 45, baseExp: 208, ev: { def: 2, hp: 1 },
    learnset: learn(OAK, [[16, "bark_skin"], [32, "gourd_slam"], [44, "old_growth"]]) }),

  sp({ id: "chili_blossom", name: "Chili Flower", line: "chili", stage: 1, types: ["fire"],
    base: st(39, 48, 40, 62, 46, 75), rate: "medium", catchRate: 45, baseExp: 65, ev: { spe: 1 },
    grows: ["green_chili", vigor(16)], learnset: learn(CHILI) }),
  sp({ id: "green_chili", name: "Green Chili", line: "chili", stage: 2, types: ["fire"],
    base: st(56, 62, 55, 82, 60, 90), rate: "medium", catchRate: 45, baseExp: 142, ev: { spa: 1, spe: 1 },
    grows: ["red_chili", vigor(32)], learnset: learn(CHILI, [[16, "smoulder"]]) }),
  sp({ id: "red_chili", name: "Red Chili", line: "chili", stage: 3, types: ["fire"],
    base: st(75, 80, 70, 110, 80, 110), rate: "medium", catchRate: 45, baseExp: 209, ev: { spa: 3 },
    learnset: learn(CHILI, [[16, "smoulder"], [32, "red_resin"], [44, "petal_storm"]]) }),

  sp({ id: "lily_seedpod", name: "Lily Seedpod", line: "lily", stage: 1, types: ["water"],
    base: st(50, 42, 50, 62, 64, 52), rate: "medium", catchRate: 45, baseExp: 63, ev: { spd: 1 },
    grows: ["lily_pad", vigor(16)], learnset: learn(LILY) }),
  sp({ id: "lily_pad", name: "Lily Pad", line: "lily", stage: 2, types: ["water"],
    base: st(66, 56, 64, 82, 84, 64), rate: "medium", catchRate: 45, baseExp: 140, ev: { spd: 2 },
    grows: ["giant_water_lily", vigor(32)], learnset: learn(LILY, [[16, "mist_veil"]]) }),
  sp({ id: "giant_water_lily", name: "Giant Lily", line: "lily", stage: 3, types: ["water"],
    base: st(90, 70, 90, 108, 107, 60), rate: "medium", catchRate: 45, baseExp: 207, ev: { spd: 3 },
    learnset: learn(LILY, [[16, "mist_veil"], [32, "petal_storm"], [44, "curl_up"]]) }),

  // ------------------------------------------------------------- dandelion (fast, frail)
  sp({ id: "dandelion_bud", name: "Lion's Tooth", line: "dandelion", stage: 1, types: ["bloom"],
    base: st(40, 40, 35, 45, 40, 60), rate: "medium", catchRate: 255, baseExp: 50, ev: { spe: 1 },
    grows: ["dandelion", vigor(12)], learnset: learn(DANDELION) }),
  sp({ id: "dandelion", name: "Dandelion", line: "dandelion", stage: 2, types: ["bloom"],
    base: st(55, 50, 45, 65, 55, 85), rate: "medium", catchRate: 120, baseExp: 119, ev: { spe: 2 },
    grows: ["dandelion_clock", vigor(24)], learnset: learn(DANDELION) }),
  sp({ id: "dandelion_clock", name: "Seed Clock", line: "dandelion", stage: 3, types: ["bloom"],
    base: st(70, 60, 55, 85, 75, 120), rate: "medium", catchRate: 45, baseExp: 176, ev: { spe: 3 },
    learnset: learn(DANDELION, [[24, "wind_scatter"]]) }),

  // ------------------------------------------------------------- bramble (wood/thorn bruiser)
  sp({ id: "bramble_blossom", name: "Bramble Bud", line: "bramble", stage: 1, types: ["wood", "thorn"],
    base: st(50, 55, 50, 30, 40, 40), rate: "medium", catchRate: 190, baseExp: 58, ev: { atk: 1 },
    grows: ["bramble_berry", vigor(11)], learnset: learn(BRAMBLE) }),
  sp({ id: "bramble_berry", name: "Brambleberry", line: "bramble", stage: 2, types: ["wood", "thorn"],
    base: st(65, 75, 70, 40, 55, 55), rate: "medium", catchRate: 120, baseExp: 127, ev: { atk: 2 },
    grows: ["blackberry", vigor(24)], learnset: learn(BRAMBLE) }),
  sp({ id: "blackberry", name: "Blackberry", line: "bramble", stage: 3, types: ["wood", "thorn"],
    base: st(80, 100, 90, 55, 70, 75), rate: "medium", catchRate: 45, baseExp: 185, ev: { atk: 3 },
    learnset: learn(BRAMBLE, [[24, "seed_burst"]]) }),

  // ------------------------------------------------------------- sunflower (day; special)
  sp({ id: "sunflower_seedling", name: "Sun Seedling", line: "sunflower", stage: 1, types: ["bloom"],
    base: st(45, 40, 40, 55, 45, 30), rate: "medium", catchRate: 235, baseExp: 52, ev: { spa: 1 },
    activity: "day", grows: ["sunflower_bud", vigor(12)], learnset: learn(SUNFLOWER) }),
  sp({ id: "sunflower_bud", name: "Sun Bud", line: "sunflower", stage: 2, types: ["bloom"],
    base: st(65, 50, 55, 75, 60, 45), rate: "medium", catchRate: 120, baseExp: 120, ev: { spa: 2 },
    activity: "day", grows: ["sunflower", { kind: "vigor_day", level: 24 }], learnset: learn(SUNFLOWER) }),
  sp({ id: "sunflower", name: "Sunflower", line: "sunflower", stage: 3, types: ["bloom"],
    base: st(90, 70, 75, 110, 85, 50), rate: "medium", catchRate: 45, baseExp: 182, ev: { spa: 3 },
    activity: "day", learnset: learn(SUNFLOWER, [[24, "sun_flare"]]) }),

  // ------------------------------------------------------------- pumpkin (slow tank)
  sp({ id: "pumpkin_blossom", name: "Pumpkin Bud", line: "pumpkin", stage: 1, types: ["wood"],
    base: st(60, 55, 60, 35, 40, 25), rate: "slow", catchRate: 120, baseExp: 62, ev: { hp: 1 },
    grows: ["green_pumpkin", vigor(14)], learnset: learn(PUMPKIN) }),
  sp({ id: "green_pumpkin", name: "Green Gourd", line: "pumpkin", stage: 2, types: ["wood"],
    base: st(85, 70, 85, 45, 55, 30), rate: "slow", catchRate: 90, baseExp: 135, ev: { hp: 2 },
    grows: ["pumpkin", vigor(26)], learnset: learn(PUMPKIN, [[14, "gourd_slam"]]) }),
  sp({ id: "pumpkin", name: "Pumpkin", line: "pumpkin", stage: 3, types: ["wood"],
    base: st(115, 95, 110, 55, 75, 35), rate: "slow", catchRate: 45, baseExp: 196, ev: { hp: 3 },
    learnset: learn(PUMPKIN, [[14, "gourd_slam"]]) }),

  // ------------------------------------------------------------- fern (wood -> wood/dragon; ancient)
  sp({ id: "fern_fiddlehead", name: "Fiddlehead", line: "fern", stage: 1, types: ["wood"],
    base: st(40, 50, 45, 35, 45, 50), rate: "medium", catchRate: 190, baseExp: 55, ev: { atk: 1 },
    grows: ["unfurling_fern", vigor(13)], learnset: learn(FERN) }),
  sp({ id: "unfurling_fern", name: "Fern Frond", line: "fern", stage: 2, types: ["wood"],
    base: st(55, 70, 60, 50, 60, 70), rate: "medium", catchRate: 120, baseExp: 124, ev: { atk: 1, spe: 1 },
    grows: ["ostrich_fern", vigor(25)], learnset: learn(FERN) }),
  sp({ id: "ostrich_fern", name: "Ostrich Fern", line: "fern", stage: 3, types: ["wood", "dragon"],
    base: st(70, 95, 80, 70, 80, 90), rate: "medium", catchRate: 45, baseExp: 190, ev: { atk: 2, spe: 1 },
    learnset: learn(FERN, [[25, "primal_frond"]]) }),

  // ------------------------------------------------------------- flytrap (physical glass cannon)
  sp({ id: "flytrap_seedling", name: "Tiny Flytrap", line: "flytrap", stage: 1, types: ["bug"],
    base: st(40, 60, 40, 30, 35, 55), rate: "medium", catchRate: 190, baseExp: 60, ev: { atk: 1 },
    grows: ["young_flytrap", vigor(12)], learnset: learn(FLYTRAP) }),
  sp({ id: "young_flytrap", name: "Flytrap", line: "flytrap", stage: 2, types: ["bug"],
    base: st(55, 85, 55, 40, 50, 75), rate: "medium", catchRate: 120, baseExp: 130, ev: { atk: 2 },
    grows: ["venus_flytrap", vigor(22)], learnset: learn(FLYTRAP) }),
  sp({ id: "venus_flytrap", name: "Venus Trap", line: "flytrap", stage: 3, types: ["bug"],
    base: st(70, 120, 75, 55, 65, 100), rate: "medium", catchRate: 45, baseExp: 192, ev: { atk: 3 },
    learnset: learn(FLYTRAP, [[22, "pitfall"]]) }),

  // ------------------------------------------------------------- sundew (two stages)
  sp({ id: "sundew_rosette", name: "Dew Rosette", line: "sundew", stage: 1, types: ["bug"],
    base: st(50, 45, 50, 60, 60, 35), rate: "medium", catchRate: 150, baseExp: 75, ev: { spa: 1 },
    grows: ["sundew", vigor(18)], learnset: learn(SUNDEW) }),
  sp({ id: "sundew", name: "Sundew", line: "sundew", stage: 2, types: ["bug", "bloom"],
    base: st(75, 65, 75, 100, 90, 55), rate: "medium", catchRate: 60, baseExp: 172, ev: { spa: 2 },
    learnset: learn(SUNDEW, [[18, "sun_flare"]]) }),

  // ------------------------------------------------------------- maple (tending; frost at the end)
  sp({ id: "maple_samara", name: "Maple Samara", line: "maple", stage: 1, types: ["wood"],
    base: st(40, 45, 40, 45, 45, 55), rate: "medium", catchRate: 190, baseExp: 54, ev: { spe: 1 },
    grows: ["maple_sapling", vigor(12)], learnset: learn(MAPLE) }),
  sp({ id: "maple_sapling", name: "Maple Sprout", line: "maple", stage: 2, types: ["wood"],
    base: st(60, 60, 60, 65, 65, 60), rate: "medium", catchRate: 75, baseExp: 128, ev: { spa: 1, spd: 1 },
    grows: ["sugar_maple", { kind: "tending", friendship: 220 }], learnset: learn(MAPLE) }),
  sp({ id: "sugar_maple", name: "Sugar Maple", line: "maple", stage: 3, types: ["wood", "frost"],
    base: st(85, 80, 80, 95, 90, 65), rate: "medium", catchRate: 45, baseExp: 195, ev: { spa: 2, spd: 1 },
    learnset: learn(MAPLE, [[1, "frost_bloom"], [30, "cold_snap"], [38, "snowdrift"]]) }),

  // ------------------------------------------------------------- nettle (two stages)
  sp({ id: "nettle_sprout", name: "Nettle Shoot", line: "nettle", stage: 1, types: ["thorn"],
    base: st(45, 65, 45, 35, 45, 60), rate: "medium", catchRate: 120, baseExp: 72, ev: { atk: 1 },
    grows: ["stinging_nettle", vigor(16)], learnset: learn(NETTLE) }),
  sp({ id: "stinging_nettle", name: "Great Nettle", line: "nettle", stage: 2, types: ["thorn"],
    base: st(70, 100, 70, 50, 65, 95), rate: "medium", catchRate: 60, baseExp: 168, ev: { atk: 2 },
    learnset: learn(NETTLE, [[16, "thorn_lash"]]) }),

  // ------------------------------------------------------------- moonflower (night only)
  sp({ id: "moonflower_seed", name: "Moon Seed", line: "moonflower", stage: 1, types: ["ghost"],
    base: st(40, 35, 40, 60, 50, 50), rate: "medium", catchRate: 190, baseExp: 62, ev: { spa: 1 },
    activity: "night", grows: ["moonflower_vine", vigor(12)], learnset: learn(MOONFLOWER) }),
  sp({ id: "moonflower_vine", name: "Moon Vine", line: "moonflower", stage: 2, types: ["ghost"],
    base: st(55, 50, 55, 80, 65, 65), rate: "medium", catchRate: 120, baseExp: 128, ev: { spa: 2 },
    activity: "night", grows: ["moonflower", { kind: "vigor_night", level: 22 }], learnset: learn(MOONFLOWER) }),
  sp({ id: "moonflower", name: "Moonflower", line: "moonflower", stage: 3, types: ["ghost", "bloom"],
    base: st(75, 60, 70, 110, 90, 80), rate: "medium", catchRate: 45, baseExp: 188, ev: { spa: 3 },
    activity: "night", learnset: learn(MOONFLOWER, [[22, "pale_bloom"]]) }),
  // ============================================================== Round 3 lines
  // ------------------------------------------------------------- clover (bloom; bulky support, grows by tending)
  // Tending 120 from a fresh catch (friendship 70) takes ~13 level-ups, so a
  // Route 1 Shamrock (lv 3) blooms into White Clover around lv 16.
  sp({ id: "clover_sprout", name: "Shamrock", line: "clover", stage: 1, types: ["bloom"],
    base: st(50, 35, 50, 45, 55, 40), rate: "fast", catchRate: 255, baseExp: 50, ev: { spd: 1 },
    activity: "day", grows: ["white_clover", { kind: "tending", friendship: 120 }], learnset: learn(CLOVER) }),
  sp({ id: "white_clover", name: "White Clover", line: "clover", stage: 2, types: ["bloom"],
    base: st(85, 50, 75, 70, 90, 50), rate: "fast", catchRate: 90, baseExp: 140, ev: { spd: 2 },
    activity: "day", learnset: learn(CLOVER, [[1, "nitro_fix"]]) }),

  // ------------------------------------------------------------- cattail (water -> water/wood; sturdy mixed attacker)
  sp({ id: "cattail_shoot", name: "Bulrush", line: "cattail", stage: 1, types: ["water"],
    base: st(50, 50, 55, 45, 45, 40), rate: "medium", catchRate: 190, baseExp: 58, ev: { def: 1 },
    grows: ["cattail", vigor(17)], learnset: learn(CATTAIL) }),
  sp({ id: "cattail", name: "Cattail", line: "cattail", stage: 2, types: ["water", "wood"],
    base: st(75, 80, 80, 65, 65, 55), rate: "medium", catchRate: 90, baseExp: 150, ev: { def: 1, atk: 1 },
    learnset: learn(CATTAIL, [[17, "leaf_edge"]]) }),

  // ------------------------------------------------------------- foxglove (bloom -> bloom/ghost; dusk/night special + blight)
  // Biennial: grows into its flowering spire on a night-time level-up (18+).
  sp({ id: "foxglove_rosette", name: "Fox Rosette", line: "foxglove", stage: 1, types: ["bloom"],
    base: st(45, 30, 45, 60, 60, 40), rate: "medium", catchRate: 150, baseExp: 64, ev: { spa: 1 },
    activity: "night", grows: ["foxglove", { kind: "vigor_night", level: 18 }], learnset: learn(FOXGLOVE) }),
  sp({ id: "foxglove", name: "Foxglove", line: "foxglove", stage: 2, types: ["bloom", "ghost"],
    base: st(65, 45, 65, 100, 90, 70), rate: "medium", catchRate: 75, baseExp: 155, ev: { spa: 2 },
    activity: "night", learnset: learn(FOXGLOVE, [[18, "digitalis"]]) }),

  // ------------------------------------------------------------- holly (thorn -> thorn/frost; slow physical wall)
  sp({ id: "holly_seedling", name: "Holly Sprout", line: "holly", stage: 1, types: ["thorn"],
    base: st(50, 55, 65, 35, 50, 30), rate: "slow", catchRate: 120, baseExp: 66, ev: { def: 1 },
    grows: ["holly", vigor(20)], learnset: learn(HOLLY) }),
  sp({ id: "holly", name: "Holly", line: "holly", stage: 2, types: ["thorn", "frost"],
    base: st(75, 90, 100, 50, 80, 45), rate: "slow", catchRate: 60, baseExp: 160, ev: { def: 2 },
    learnset: learn(HOLLY, [[20, "holly_spines"]]) }),

  // ------------------------------------------------------------- mint (frost; fast special sweeper, grows fast)
  sp({ id: "mint_sprig", name: "Mint Sprig", line: "mint", stage: 1, types: ["frost"],
    base: st(45, 40, 40, 60, 45, 65), rate: "fast", catchRate: 190, baseExp: 60, ev: { spe: 1 },
    grows: ["peppermint", vigor(16)], learnset: learn(MINT) }),
  sp({ id: "peppermint", name: "Peppermint", line: "mint", stage: 2, types: ["frost"],
    base: st(65, 55, 60, 95, 65, 100), rate: "fast", catchRate: 75, baseExp: 150, ev: { spa: 1, spe: 1 },
    learnset: learn(MINT, [[16, "menthol_chill"]]) }),

  // ------------------------------------------------------------- wild rose (thorn -> thorn/bloom; physical; opens by day)
  sp({ id: "rose_bud", name: "Rose Bud", line: "rose", stage: 1, types: ["thorn"],
    base: st(45, 60, 45, 45, 45, 55), rate: "medium", catchRate: 120, baseExp: 64, ev: { atk: 1 },
    activity: "day", grows: ["wild_rose", { kind: "vigor_day", level: 18 }], learnset: learn(ROSE) }),
  sp({ id: "wild_rose", name: "Wild Rose", line: "rose", stage: 2, types: ["thorn", "bloom"],
    base: st(65, 95, 70, 70, 70, 85), rate: "medium", catchRate: 60, baseExp: 162, ev: { atk: 2 },
    activity: "day", learnset: learn(ROSE, [[18, "rose_thorn"]]) }),

  // ------------------------------------------------------------- pitcher plant (bug -> bug/water; bulky drainer)
  sp({ id: "pitcher_sprout", name: "Tiny Pitcher", line: "pitcher", stage: 1, types: ["bug"],
    base: st(50, 50, 50, 55, 55, 35), rate: "medium", catchRate: 150, baseExp: 68, ev: { spd: 1 },
    grows: ["pitcher_plant", vigor(18)], learnset: learn(PITCHER) }),
  sp({ id: "pitcher_plant", name: "Bog Pitcher", line: "pitcher", stage: 2, types: ["bug", "water"],
    base: st(75, 75, 75, 85, 85, 50), rate: "medium", catchRate: 60, baseExp: 160, ev: { hp: 1, spd: 1 },
    learnset: learn(PITCHER, [[18, "pitfall_slurp"]]) }),

  // ------------------------------------------------------------- snapdragon (dragon -> dragon/bloom; rare, slow, strong)
  // Gifted at lv 10 (THE SURVEY) or a very rare Route 3 day slot. Strong but
  // capped at 470 and 4x weak to frost, slow-growing, and only grows at 22.
  sp({ id: "snapdragon_sprout", name: "Snap Sprout", line: "snapdragon", stage: 1, types: ["dragon"],
    base: st(50, 62, 50, 58, 50, 45), rate: "slow", catchRate: 45, baseExp: 72, ev: { atk: 1 },
    activity: "day", grows: ["snapdragon", vigor(22)], learnset: learn(SNAPDRAGON) }),
  sp({ id: "snapdragon", name: "Snapdragon", line: "snapdragon", stage: 2, types: ["dragon", "bloom"],
    base: st(76, 96, 72, 86, 70, 70), rate: "slow", catchRate: 45, baseExp: 180, ev: { atk: 2, spa: 1 },
    activity: "day", learnset: learn(SNAPDRAGON, [[22, "old_growth"]]) }),

  // ============================================================== Round 4 lines
  // ------------------------------------------------------------- apple (wood -> wood/bloom; sturdy physical orchard tree)
  // Grows at 18, then into a blossoming tree by tending, "a tree you cared
  // for". Only the grown tree is part bloom: real apples flower after years.
  sp({ id: "apple_pip", name: "Apple Pip", line: "apple", stage: 1, types: ["wood"],
    base: st(50, 55, 50, 40, 45, 40), rate: "medium", catchRate: 190, baseExp: 58, ev: { atk: 1 },
    activity: "day", grows: ["apple_sapling", vigor(18)], learnset: learn(APPLE) }),
  sp({ id: "apple_sapling", name: "Apple Whip", line: "apple", stage: 2, types: ["wood"],
    base: st(65, 75, 70, 50, 60, 45), rate: "medium", catchRate: 75, baseExp: 130, ev: { atk: 1, def: 1 },
    activity: "day", grows: ["apple_tree", { kind: "tending", friendship: 220 }], learnset: learn(APPLE) }),
  sp({ id: "apple_tree", name: "Apple Tree", line: "apple", stage: 3, types: ["wood", "bloom"],
    base: st(90, 100, 90, 70, 85, 50), rate: "medium", catchRate: 45, baseExp: 192, ev: { atk: 2, def: 1 },
    activity: "day", learnset: learn(APPLE, [[1, "pollen_puff"], [1, "unfurl"], [30, "sunbeam"], [44, "petal_storm"]]) }),

  // ------------------------------------------------------------- moth orchid (bloom; fast special attacker, night grower)
  // Flora's ace. Grows at 16, then on a night-time level-up from 22 (moth
  // orchids take in CO2 at night), like the moonflower. Top of the band.
  sp({ id: "orchid_keiki", name: "Orchid Keiki", line: "orchid", stage: 1, types: ["bloom"],
    base: st(45, 35, 45, 60, 55, 50), rate: "medium", catchRate: 120, baseExp: 64, ev: { spa: 1 },
    activity: "night", grows: ["orchid_spike", vigor(16)], learnset: learn(ORCHID) }),
  sp({ id: "orchid_spike", name: "Orchid Spike", line: "orchid", stage: 2, types: ["bloom"],
    base: st(58, 42, 58, 80, 72, 60), rate: "medium", catchRate: 60, baseExp: 135, ev: { spa: 2 },
    activity: "night", grows: ["moth_orchid", { kind: "vigor_night", level: 22 }], learnset: learn(ORCHID) }),
  sp({ id: "moth_orchid", name: "Moth Orchid", line: "orchid", stage: 3, types: ["bloom"],
    base: st(75, 45, 70, 110, 95, 85), rate: "medium", catchRate: 45, baseExp: 196, ev: { spa: 3 },
    activity: "night", learnset: learn(ORCHID, [[22, "long_bloom"]]) }),

  // ------------------------------------------------------------- monstera (wood; physical bruiser, grows late)
  sp({ id: "monstera_cutting", name: "Monstera Tip", line: "monstera", stage: 1, types: ["wood"],
    base: st(55, 55, 55, 45, 50, 40), rate: "medium", catchRate: 150, baseExp: 66, ev: { atk: 1 },
    grows: ["monstera", vigor(24)], learnset: learn(MONSTERA) }),
  sp({ id: "monstera", name: "Monstera", line: "monstera", stage: 2, types: ["wood"],
    base: st(90, 90, 85, 60, 75, 60), rate: "medium", catchRate: 60, baseExp: 162, ev: { atk: 1, hp: 1 },
    learnset: learn(MONSTERA, [[24, "fenestrate"]]) }),

  // ------------------------------------------------------------- lotus (water -> water/bloom; special wall)
  sp({ id: "lotus_seed", name: "Lotus Seed", line: "lotus", stage: 1, types: ["water"],
    base: st(50, 40, 55, 55, 60, 45), rate: "medium", catchRate: 150, baseExp: 66, ev: { spd: 1 },
    grows: ["sacred_lotus", vigor(26)], learnset: learn(LOTUS) }),
  sp({ id: "sacred_lotus", name: "Sacred Lotus", line: "lotus", stage: 2, types: ["water", "bloom"],
    base: st(80, 50, 85, 95, 100, 55), rate: "medium", catchRate: 60, baseExp: 164, ev: { spd: 2 },
    learnset: learn(LOTUS, [[26, "sunbeam"]]) }),

  // ------------------------------------------------------------- bird of paradise (bloom -> bloom/fire; rare, fast mixed attacker)
  // Rare by day in the Palm House, slow to grow (28): the strongest new line.
  sp({ id: "paradise_shoot", name: "Paradise Bud", line: "paradise", stage: 1, types: ["bloom"],
    base: st(50, 62, 48, 58, 45, 57), rate: "slow", catchRate: 45, baseExp: 72, ev: { atk: 1 },
    activity: "day", grows: ["bird_of_paradise", vigor(28)], learnset: learn(PARADISE) }),
  sp({ id: "bird_of_paradise", name: "Crane Flower", line: "paradise", stage: 2, types: ["bloom", "fire"],
    base: st(70, 95, 65, 95, 65, 80), rate: "slow", catchRate: 45, baseExp: 182, ev: { atk: 1, spa: 1 },
    activity: "day", learnset: learn(PARADISE, [[28, "chili_burst"]]) }),
];

export const SPECIES = Object.fromEntries(ALL.map((s) => [s.id, s])) as Record<SpeciesId, Species>;
