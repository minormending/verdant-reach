// Fixture data for tests and the dev routes. Used only when the real DATA is
// still empty (it's written in parallel by the data agent).

import type {
  GameData, HerbariumEntry, Item, Move, Species, SpeciesId, TrainerDef, TypeChart,
} from "../contracts";

const gen2Exp = (rate: Species["growthRate"], n: number): number => {
  if (n <= 1) return 0;
  if (rate === "fast") return Math.floor((4 * n ** 3) / 5);
  if (rate === "slow") return Math.floor((5 * n ** 3) / 4);
  return n ** 3;
};

const mv = (m: Partial<Move> & Pick<Move, "id" | "name" | "type">): Move => ({
  category: "physical", power: 40, accuracy: 100, pp: 35, priority: 0, effects: [], description: "", ...m,
});

export const FIXTURE_MOVES: Record<string, Move> = {
  tackle: mv({ id: "tackle", name: "Tackle", type: "wood", power: 35, accuracy: 95, description: "A full-body shove with the root ball." }),
  leaf_blade: mv({ id: "leaf_blade", name: "Leaf Blade", type: "wood", power: 70, pp: 15, effects: [{ kind: "high_crit" }], description: "A sharp leaf edge. Often lands a critical hit." }),
  root_tap: mv({ id: "root_tap", name: "Root Tap", type: "wood", category: "status", power: 0, accuracy: 90, pp: 10, effects: [{ kind: "root_tap" }], description: "Roots tap the foe and sip its sap every turn." }),
  photosynthesise: mv({ id: "photosynthesise", name: "Photosynth", type: "bloom", category: "status", power: 0, accuracy: null, pp: 5, effects: [{ kind: "heal", fraction: 0.5, sunBonus: true }], description: "Heals with light. Heals more in sun." }),
  sap_seal: mv({ id: "sap_seal", name: "Sap Seal", type: "wood", category: "status", power: 0, accuracy: null, pp: 20, effects: [{ kind: "stat", stat: "def", stages: 1, chance: 100, target: "self" }], description: "Seals wounds with sap to raise DEFENCE." }),
  ember: mv({ id: "ember", name: "Ember", type: "fire", category: "special", power: 40, pp: 25, effects: [{ kind: "status", status: "scorch", chance: 10, target: "foe" }], description: "Hot sparks. May scorch the foe." }),
  capsaicin: mv({ id: "capsaicin", name: "Capsaicin", type: "fire", category: "special", power: 65, pp: 15, effects: [{ kind: "stat", stat: "accuracy", stages: -1, chance: 30, target: "foe" }], description: "A burning spray. May lower accuracy." }),
  heat_wave: mv({ id: "heat_wave", name: "Sunny Day", type: "fire", category: "status", power: 0, accuracy: null, pp: 5, effects: [{ kind: "weather", weather: "sun" }], description: "Calls bright sun for five turns." }),
  bubble: mv({ id: "bubble", name: "Bubble", type: "water", category: "special", power: 40, pp: 30, effects: [{ kind: "stat", stat: "spe", stages: -1, chance: 10, target: "foe" }], description: "A spray of bubbles. May lower SPEED." }),
  rain_call: mv({ id: "rain_call", name: "Rain Call", type: "water", category: "status", power: 0, accuracy: null, pp: 5, effects: [{ kind: "weather", weather: "rain" }], description: "Calls rain for five turns." }),
  pad_slam: mv({ id: "pad_slam", name: "Pad Slam", type: "water", power: 90, accuracy: 85, pp: 10, effects: [{ kind: "recoil", fraction: 1 / 4 }], description: "A heavy pad slam. The user is hurt too." }),
  seed_burst: mv({ id: "seed_burst", name: "Seed Burst", type: "bloom", power: 15, accuracy: 85, pp: 20, effects: [{ kind: "multi_hit", min: 2, max: 5 }], description: "Squirts seeds 2-5 times in a row." }),
  pollen_puff: mv({ id: "pollen_puff", name: "Pollen Puff", type: "bloom", category: "status", power: 0, accuracy: 75, pp: 15, effects: [{ kind: "status", status: "dormant", chance: 100, target: "foe" }], description: "Drowsy pollen makes the foe dormant." }),
  nectar_lure: mv({ id: "nectar_lure", name: "Nectar Lure", type: "bloom", category: "status", power: 0, accuracy: 100, pp: 20, effects: [{ kind: "stat", stat: "accuracy", stages: -1, chance: 100, target: "foe" }], description: "Sweet nectar distracts. Lowers accuracy." }),
  thorn_jab: mv({ id: "thorn_jab", name: "Thorn Jab", type: "thorn", power: 50, pp: 25, effects: [{ kind: "flinch", chance: 30 }], description: "A quick stab. May make the foe flinch." }),
  allelopathy: mv({ id: "allelopathy", name: "Allelopathy", type: "thorn", category: "status", power: 0, accuracy: 90, pp: 20, effects: [{ kind: "status", status: "blight", chance: 100, target: "foe" }], description: "Poisons the soil, like black walnut." }),
  snap_trap: mv({ id: "snap_trap", name: "Snap Trap", type: "bug", power: 60, pp: 20, effects: [{ kind: "drain", fraction: 0.5 }], description: "Snaps shut and digests. Heals the user." }),
  sticky_dew: mv({ id: "sticky_dew", name: "Sticky Dew", type: "bug", category: "status", power: 0, accuracy: 90, pp: 20, effects: [{ kind: "status", status: "rootbound", chance: 100, target: "foe" }], description: "Glue-like dew binds the foe in place." }),
  quick_snap: mv({ id: "quick_snap", name: "Quick Snap", type: "bug", power: 40, pp: 30, priority: 1, description: "Snaps first. Always strikes before others." }),
  night_fold: mv({ id: "night_fold", name: "Night Fold", type: "ghost", category: "status", power: 0, accuracy: null, pp: 10, effects: [{ kind: "stat", stat: "def", stages: 2, chance: 100, target: "self" }], description: "Folds leaves at dusk. Sharply ups DEFENCE." }),
  moonbeam: mv({ id: "moonbeam", name: "Moonbeam", type: "ghost", category: "special", power: 0, accuracy: 100, pp: 15, effects: [{ kind: "fixed_damage", amount: "level" }], description: "Deals damage equal to the user's level." }),
  shadow_vine: mv({ id: "shadow_vine", name: "Shade Vine", type: "ghost", category: "special", power: 60, accuracy: null, pp: 20, effects: [{ kind: "always_hit" }], description: "A vine from the shadows. Never misses." }),
  frost_nip: mv({ id: "frost_nip", name: "Frost Nip", type: "frost", category: "special", power: 40, pp: 25, effects: [{ kind: "status", status: "frostbite", chance: 10, target: "foe" }], description: "A chill touch. May cause frostbite." }),
  curl_up: mv({ id: "curl_up", name: "Curl Up", type: "wood", category: "status", power: 0, accuracy: null, pp: 10, priority: 3, effects: [{ kind: "protect" }], description: "Curls up to block attacks this turn." }),
  sprout_up: mv({ id: "sprout_up", name: "Sprout Up", type: "wood", category: "status", power: 0, accuracy: null, pp: 20, effects: [{ kind: "stat", stat: "atk", stages: 2, chance: 100, target: "self" }], description: "Grows a burst of shoots. Ups ATTACK." }),
  ivy_wrap: mv({ id: "ivy_wrap", name: "Ivy Wrap", type: "wood", power: 0, accuracy: 100, pp: 20, effects: [{ kind: "fixed_damage", amount: 20 }], description: "Ivy squeezes for a steady 20 damage." }),
  dragon_rush: mv({ id: "dragon_rush", name: "Resin Rush", type: "dragon", power: 80, accuracy: 90, pp: 10, description: "A charge glazed in red resin." }),
};

const sp = (s: Partial<Species> & Pick<Species, "id" | "name" | "types" | "baseStats" | "learnset">): Species => ({
  line: s.id, stage: 1, growthRate: "medium", catchRate: 190, baseExp: 60, activity: "any", ...s,
});

export const FIXTURE_SPECIES: Partial<Record<SpeciesId, Species>> = {
  oak_acorn: sp({
    id: "oak_acorn", name: "Oak Acorn", line: "oak", types: ["wood"], catchRate: 45, baseExp: 64, growthRate: "slow",
    baseStats: { hp: 50, atk: 55, def: 60, spa: 40, spd: 50, spe: 35 },
    growsInto: { species: "oak_sapling", trigger: { kind: "vigor", level: 16 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 1, move: "sap_seal" }, { level: 6, move: "root_tap" }, { level: 9, move: "leaf_blade" }, { level: 13, move: "curl_up" }, { level: 16, move: "sprout_up" }],
  }),
  oak_sapling: sp({
    id: "oak_sapling", name: "Oak Sapling", line: "oak", stage: 2, types: ["wood"], catchRate: 45, baseExp: 142, growthRate: "slow",
    baseStats: { hp: 65, atk: 75, def: 80, spa: 50, spd: 65, spe: 45 },
    growsInto: { species: "great_oak", trigger: { kind: "tending", friendship: 220 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 9, move: "leaf_blade" }, { level: 16, move: "sprout_up" }, { level: 20, move: "ivy_wrap" }],
  }),
  great_oak: sp({
    id: "great_oak", name: "Great Oak", line: "oak", stage: 3, types: ["wood", "dragon"], catchRate: 45, baseExp: 236, growthRate: "slow",
    baseStats: { hp: 95, atk: 100, def: 110, spa: 60, spd: 85, spe: 50 },
    learnset: [{ level: 1, move: "leaf_blade" }, { level: 36, move: "dragon_rush" }],
  }),
  chili_blossom: sp({
    id: "chili_blossom", name: "Chili Blossom", line: "chili", types: ["fire"], catchRate: 45, baseExp: 62, growthRate: "slow",
    baseStats: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
    growsInto: { species: "green_chili", trigger: { kind: "vigor", level: 16 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 1, move: "nectar_lure" }, { level: 6, move: "ember" }, { level: 12, move: "heat_wave" }, { level: 15, move: "capsaicin" }],
  }),
  green_chili: sp({
    id: "green_chili", name: "Green Chili", line: "chili", stage: 2, types: ["fire"], catchRate: 45, baseExp: 142, growthRate: "slow",
    baseStats: { hp: 58, atk: 64, def: 58, spa: 80, spd: 65, spe: 80 },
    learnset: [{ level: 1, move: "ember" }, { level: 15, move: "capsaicin" }],
  }),
  lily_seedpod: sp({
    id: "lily_seedpod", name: "Lily Seedpod", line: "lily", types: ["water"], catchRate: 45, baseExp: 63, growthRate: "slow",
    baseStats: { hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
    growsInto: { species: "lily_pad", trigger: { kind: "vigor", level: 16 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 1, move: "bubble" }, { level: 8, move: "rain_call" }, { level: 13, move: "pad_slam" }],
  }),
  lily_pad: sp({
    id: "lily_pad", name: "Lily Pad", line: "lily", stage: 2, types: ["water"], catchRate: 45, baseExp: 142, growthRate: "slow",
    baseStats: { hp: 59, atk: 63, def: 80, spa: 65, spd: 80, spe: 58 },
    learnset: [{ level: 1, move: "bubble" }, { level: 13, move: "pad_slam" }],
  }),
  dandelion_bud: sp({
    id: "dandelion_bud", name: "Dandelion Bud", line: "dandelion", types: ["bloom"], catchRate: 255, baseExp: 50, growthRate: "fast",
    baseStats: { hp: 40, atk: 35, def: 35, spa: 45, spd: 40, spe: 60 },
    growsInto: { species: "dandelion", trigger: { kind: "vigor", level: 12 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 3, move: "nectar_lure" }, { level: 5, move: "seed_burst" }, { level: 9, move: "pollen_puff" }],
  }),
  dandelion: sp({
    id: "dandelion", name: "Dandelion", line: "dandelion", stage: 2, types: ["bloom"], catchRate: 120, baseExp: 120, growthRate: "fast",
    baseStats: { hp: 60, atk: 50, def: 50, spa: 70, spd: 60, spe: 80 },
    learnset: [{ level: 1, move: "seed_burst" }, { level: 12, move: "photosynthesise" }],
  }),
  sunflower_seedling: sp({
    id: "sunflower_seedling", name: "Sunflower Sdlg", line: "sunflower", types: ["bloom"], catchRate: 235, baseExp: 52, activity: "day",
    baseStats: { hp: 45, atk: 40, def: 40, spa: 50, spd: 45, spe: 30 },
    growsInto: { species: "sunflower_bud", trigger: { kind: "vigor_day", level: 10 } },
    learnset: [{ level: 1, move: "tackle" }, { level: 4, move: "photosynthesise" }, { level: 8, move: "heat_wave" }],
  }),
  sunflower_bud: sp({
    id: "sunflower_bud", name: "Sunflower Bud", line: "sunflower", stage: 2, types: ["bloom"], catchRate: 120, baseExp: 120, activity: "day",
    baseStats: { hp: 65, atk: 55, def: 55, spa: 75, spd: 65, spe: 40 },
    learnset: [{ level: 1, move: "photosynthesise" }],
  }),
  bramble_blossom: sp({
    id: "bramble_blossom", name: "Bramble Bloom", line: "bramble", types: ["wood", "thorn"], catchRate: 190, baseExp: 58,
    baseStats: { hp: 45, atk: 55, def: 50, spa: 35, spd: 40, spe: 45 },
    learnset: [{ level: 1, move: "tackle" }, { level: 4, move: "thorn_jab" }, { level: 8, move: "allelopathy" }],
  }),
  nettle_sprout: sp({
    id: "nettle_sprout", name: "Nettle Sprout", line: "nettle", types: ["thorn"], catchRate: 120, baseExp: 66,
    baseStats: { hp: 45, atk: 60, def: 40, spa: 45, spd: 40, spe: 65 },
    learnset: [{ level: 1, move: "thorn_jab" }, { level: 3, move: "allelopathy" }],
  }),
  fern_fiddlehead: sp({
    id: "fern_fiddlehead", name: "Fiddlehead", line: "fern", types: ["wood"], catchRate: 190, baseExp: 55,
    baseStats: { hp: 50, atk: 45, def: 55, spa: 45, spd: 55, spe: 40 },
    learnset: [{ level: 1, move: "tackle" }, { level: 5, move: "curl_up" }, { level: 9, move: "root_tap" }],
  }),
  flytrap_seedling: sp({
    id: "flytrap_seedling", name: "Flytrap Sdlg", line: "flytrap", types: ["bug"], catchRate: 120, baseExp: 64,
    baseStats: { hp: 45, atk: 65, def: 45, spa: 40, spd: 45, spe: 55 },
    learnset: [{ level: 1, move: "quick_snap" }, { level: 5, move: "snap_trap" }, { level: 10, move: "sticky_dew" }],
  }),
  moonflower_seed: sp({
    id: "moonflower_seed", name: "Moonflower Sd", line: "moonflower", types: ["ghost"], catchRate: 150, baseExp: 62, activity: "night",
    baseStats: { hp: 40, atk: 30, def: 40, spa: 65, spd: 55, spe: 55 },
    growsInto: { species: "moonflower_vine", trigger: { kind: "vigor_night", level: 14 } },
    learnset: [{ level: 1, move: "moonbeam" }, { level: 4, move: "night_fold" }, { level: 8, move: "shadow_vine" }, { level: 11, move: "frost_nip" }],
  }),
  moonflower_vine: sp({
    id: "moonflower_vine", name: "Moonflwr Vine", line: "moonflower", stage: 2, types: ["ghost"], catchRate: 90, baseExp: 130, activity: "night",
    baseStats: { hp: 55, atk: 40, def: 55, spa: 85, spd: 75, spe: 70 },
    learnset: [{ level: 1, move: "moonbeam" }],
  }),
};

const chart: TypeChart = {
  wood:   { water: 2, fire: 0.5, wood: 0.5, bug: 0.5, thorn: 0.5, dragon: 0.5 },
  fire:   { wood: 2, bug: 2, frost: 2, fire: 0.5, water: 0.5, dragon: 0.5 },
  water:  { fire: 2, thorn: 2, water: 0.5, wood: 0.5, dragon: 0.5 },
  bug:    { wood: 2, bloom: 2, fire: 0.5, ghost: 0.5, thorn: 0.5 },
  bloom:  { bug: 2, dragon: 2, fire: 0.5, thorn: 0.5 },
  ghost:  { ghost: 2, bloom: 2, dragon: 0.5, wood: 0 },
  thorn:  { bloom: 2, frost: 2, thorn: 0.5, wood: 0.5 },
  frost:  { wood: 2, dragon: 2, water: 0.5, fire: 0.5, frost: 0.5 },
  dragon: { dragon: 2, frost: 0.5 },
};

const item = (i: Partial<Item> & Pick<Item, "id" | "name" | "effect">): Item => ({
  pocket: "items", price: 0, description: "", usableInBattle: true, usableInField: true, ...i,
});

export const FIXTURE_ITEMS: Record<string, Item> = {
  terrarium_pod: item({ id: "terrarium_pod", name: "Terrarium Pod", pocket: "pods", price: 200, effect: { kind: "pod", catchMultiplier: 1 }, usableInField: false, description: "A glass acorn. A tiny greenhouse to rest in." }),
  glass_pod: item({ id: "glass_pod", name: "Glass Pod", pocket: "pods", price: 600, effect: { kind: "pod", catchMultiplier: 1.5 }, usableInField: false, description: "Thick glass. Better odds than a terrarium pod." }),
  water_flask: item({ id: "water_flask", name: "Water Flask", price: 300, effect: { kind: "heal", amount: 20 }, description: "Fresh water. Restores 20 HP." }),
  spring_water: item({ id: "spring_water", name: "Spring Water", price: 700, effect: { kind: "heal", amount: 50 }, description: "Cool spring water. Restores 50 HP." }),
  rain_jar: item({ id: "rain_jar", name: "Rain Jar", price: 2500, effect: { kind: "heal_full" }, description: "Bottled rain. Fully restores HP." }),
  compost: item({ id: "compost", name: "Compost", price: 1500, effect: { kind: "revive", fraction: 0.5 }, description: "Rich compost. Revives a wilted plant." }),
  neem_spray: item({ id: "neem_spray", name: "Neem Spray", price: 250, effect: { kind: "cure_status" }, description: "Neem oil mist. Cures any status." }),
  mulch: item({ id: "mulch", name: "Leaf Mulch", price: 1200, effect: { kind: "restore_pp", amount: 10 }, description: "Restores 10 PP to each move." }),
  field_herbarium: item({ id: "field_herbarium", name: "Field Herb.", pocket: "key", effect: { kind: "none" }, usableInBattle: false, description: "Dr. Vale's field journal of the Quickened." }),
  centuryheart_seed: item({ id: "centuryheart_seed", name: "Cent. Seed", pocket: "key", effect: { kind: "none" }, usableInBattle: false, usableInField: false, description: "Warm to the touch. It hums faintly." }),
  fennimores_letter: item({ id: "fennimores_letter", name: "Letter", pocket: "key", effect: { kind: "none" }, usableInBattle: false, usableInField: false, description: "Old Fennimore's letter for Dr. Vale." }),
};

const entry = (species: SpeciesId, scientificName: string, category: string, heightM: number, weightKg: number, text: string): HerbariumEntry =>
  ({ species, scientificName, category, heightM, weightKg, entry: text });

export const FIXTURE_HERBARIUM: Partial<Record<SpeciesId, HerbariumEntry>> = {
  oak_acorn: entry("oak_acorn", "Quercus robur", "Acorn", 0.3, 2.1, "It rolls to a sunny spot and waits. A single oak can host hundreds of other species."),
  chili_blossom: entry("chili_blossom", "Capsicum annuum", "Blossom", 0.4, 1.6, "Birds can't taste capsaicin, so they happily spread chili seeds far and wide."),
  lily_seedpod: entry("lily_seedpod", "Victoria amazonica", "Seedpod", 0.3, 2.4, "Its flowers open white, then turn pink on the second night."),
  dandelion_bud: entry("dandelion_bud", "Taraxacum officinale", "Bud", 0.2, 0.4, "Each seed has a tiny parachute that can ride the wind for miles."),
  bramble_blossom: entry("bramble_blossom", "Rubus fruticosus", "Bramble", 0.5, 3.0, "Its arching canes root where their tips touch the ground."),
  moonflower_seed: entry("moonflower_seed", "Ipomoea alba", "Moonflower", 0.2, 0.5, "Its flowers open at dusk and close by morning."),
  flytrap_seedling: entry("flytrap_seedling", "Dionaea muscipula", "Flytrap", 0.1, 0.3, "Its trap only snaps if two trigger hairs are touched in quick succession."),
};

export const FIXTURE_DATA: GameData = {
  species: FIXTURE_SPECIES as GameData["species"],
  moves: FIXTURE_MOVES,
  items: FIXTURE_ITEMS,
  typeChart: chart,
  herbarium: FIXTURE_HERBARIUM as GameData["herbarium"],
  expForLevel: gen2Exp,
};

export const FIXTURE_TRAINERS: Record<string, TrainerDef> = {
  dev_gardener: {
    id: "dev_gardener", name: "ROSA", className: "GARDENER", portrait: "gardener",
    team: [{ species: "bramble_blossom", level: 6 }, { species: "dandelion_bud", level: 7 }],
    prize: 240, intro: "My hedges need a test!", defeat: "Well, that's pruned me.", after: "Keep your roots deep.", ai: "basic",
  },
  dev_hollis: {
    id: "dev_hollis", name: "HOLLIS", className: "WARDEN", portrait: "hollis",
    team: [{ species: "fern_fiddlehead", level: 9 }, { species: "oak_sapling", level: 11, moves: ["leaf_blade", "sap_seal", "root_tap", "sprout_up"] }],
    prize: 1100, intro: "Show me how you tend them.", defeat: "They chose you. I see why.", after: "Hedges grow slow. So do we.", ai: "smart",
    items: [{ item: "spring_water", qty: 1 }], music: "battle_leader", mark: "bramble_mark",
  },
};
