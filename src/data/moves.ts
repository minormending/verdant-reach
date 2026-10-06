// Moves. Every move is a real plant behaviour. Names <= 12 chars,
// descriptions <= 36 chars (two 18-column lines).

import type { Move, MoveEffect, TypeId } from "../contracts";

type Cat = Move["category"];

function m(
  id: string, name: string, type: TypeId, category: Cat, power: number,
  accuracy: number | null, pp: number, description: string,
  effects: MoveEffect[] = [], priority = 0,
): Move {
  return { id, name, type, category, power, accuracy, pp, priority, effects, description };
}

const self = (stat: Parameters<typeof statFx>[0], stages: number) => statFx(stat, stages, "self", 100);
const foe = (stat: Parameters<typeof statFx>[0], stages: number, chance = 100) => statFx(stat, stages, "foe", chance);
function statFx(stat: Extract<MoveEffect, { kind: "stat" }>["stat"], stages: number, target: "foe" | "self", chance: number): MoveEffect {
  return { kind: "stat", stat, stages, chance, target };
}
const inflict = (status: Extract<MoveEffect, { kind: "status" }>["status"], chance: number): MoveEffect =>
  ({ kind: "status", status, chance, target: "foe" });

const LIST: Move[] = [
  // ---------------------------------------------------------------- WOOD
  m("vine_lash", "Vine Lash", "wood", "physical", 40, 100, 25, "Whips the foe with a supple vine."),
  m("acorn_drop", "Acorn Drop", "wood", "physical", 60, 95, 20, "Drops a hard acorn. May flinch.", [{ kind: "flinch", chance: 20 }]),
  m("samara_spin", "Samara Spin", "wood", "physical", 55, 100, 25, "Spins in on a winged maple seed."),
  m("leaf_edge", "Leaf Edge", "wood", "physical", 70, 100, 15, "A razor leaf edge. High crit rate.", [{ kind: "high_crit" }]),
  m("gourd_slam", "Gourd Slam", "wood", "physical", 85, 90, 10, "Heavy gourd slam. May flinch.", [{ kind: "flinch", chance: 10 }]),
  m("seed_burst", "Seed Burst", "wood", "physical", 20, 100, 20, "Squirting-cucumber seeds. 2-5x.", [{ kind: "multi_hit", min: 2, max: 5 }]),
  m("timber", "Timber", "wood", "physical", 120, 100, 5, "Crashes down like a tree. Recoil.", [{ kind: "recoil", fraction: 1 / 3 }]),
  m("sap_drain", "Sap Drain", "wood", "special", 40, 100, 15, "Drinks sap. Heals half the damage.", [{ kind: "drain", fraction: 0.5 }]),
  m("sap_spout", "Sap Spout", "wood", "special", 75, 100, 15, "Sticky sap spouts. May slow foe.", [foe("spe", -1, 30)]),
  m("leaf_gale", "Leaf Gale", "wood", "special", 90, 100, 10, "Whirls a gale of cut leaves."),
  m("root_tap", "Root Tap", "wood", "status", 0, 90, 10, "Taps the foe; sips sap every turn.", [{ kind: "root_tap" }]),
  m("root_snare", "Root Snare", "wood", "status", 0, 90, 20, "Roots bind the foe. Rootbound.", [inflict("rootbound", 100)]),
  m("allelopathy", "Allelopathy", "wood", "status", 0, 90, 15, "Poisons the soil. Blights the foe.", [inflict("blight", 100)]),
  m("sap_seal", "Sap Seal", "wood", "status", 0, null, 30, "Seals bark with sap. Ups DEFENCE.", [self("def", 1)]),
  m("bark_skin", "Bark Skin", "wood", "status", 0, null, 15, "Thickens bark. Sharply ups DEF.", [self("def", 2)]),
  m("curl_up", "Curl Up", "wood", "status", 0, null, 10, "Curls up tight. Blocks this turn.", [{ kind: "protect" }], 4),
  m("photosynthesise", "Photosynth", "wood", "status", 0, null, 10, "Heals half HP. More in sunshine.", [{ kind: "heal", fraction: 0.5, sunBonus: true }]),
  m("sugar_rush", "Sugar Rush", "wood", "status", 0, null, 20, "A rush of sugar. Sharply ups SPEED.", [self("spe", 2)]),
  // Round 3: cattail line
  m("cattail_fluff", "Cattail Puff", "wood", "special", 60, 100, 20, "A cloud of seed down. May cut ACC.", [foe("accuracy", -1, 30)]),
  // Round 4: apple and monstera lines
  m("windfall", "Windfall", "wood", "physical", 80, 90, 15, "Ripe apples rain down. May flinch.", [{ kind: "flinch", chance: 20 }]),
  m("aerial_root", "Aerial Root", "wood", "physical", 75, 95, 15, "Climbing roots grip. May bind.", [inflict("rootbound", 20)]),
  m("fenestrate", "Fenestrate", "wood", "status", 0, null, 15, "Holed leaves let gusts by. +DEF/EVA", [self("def", 1), self("evasion", 1)]),

  // ---------------------------------------------------------------- FIRE
  m("ember_seed", "Ember Seed", "fire", "special", 40, 100, 25, "Spits a hot seed. May scorch.", [inflict("scorch", 10)]),
  m("chili_burst", "Chili Burst", "fire", "special", 80, 100, 15, "Bursts with fiery seeds. May scorch.", [inflict("scorch", 10)]),
  m("wildfire", "Wildfire", "fire", "special", 110, 85, 5, "A raging blaze. May scorch.", [inflict("scorch", 20)]),
  m("smoulder", "Smoulder", "fire", "special", 65, 95, 15, "Smouldering heat. May scorch.", [inflict("scorch", 20)]),
  m("capsaicin", "Capsaicin", "fire", "status", 0, 85, 15, "Fiery oil scorches the foe.", [inflict("scorch", 100)]),
  m("sun_flare", "Sun Flare", "fire", "status", 0, null, 5, "Calls blazing sun for 5 turns.", [{ kind: "weather", weather: "sun" }]),

  // ---------------------------------------------------------------- WATER
  m("dew_drop", "Dew Drop", "water", "special", 40, 100, 25, "Flicks heavy dew at the foe."),
  m("undertow", "Undertow", "water", "special", 65, 100, 20, "Drags the foe down. May slow it.", [foe("spe", -1, 30)]),
  m("flood", "Flood", "water", "special", 90, 100, 10, "Floods the field in a rush."),
  m("downpour", "Downpour", "water", "special", 110, 80, 5, "Unleashes a pounding downpour."),
  m("pad_slap", "Pad Slap", "water", "physical", 60, 100, 20, "Slaps with a broad wet pad.", [{ kind: "flinch", chance: 10 }]),
  m("mist_veil", "Mist Veil", "water", "status", 0, null, 15, "Veiled in mist. SP.DEF sharply up.", [self("spd", 2)]),
  m("rain_call", "Rain Call", "water", "status", 0, null, 5, "Calls rain for 5 turns.", [{ kind: "weather", weather: "rain" }]),
  // Round 3: pitcher plant line
  m("pitfall_slurp", "Pit Slurp", "water", "special", 70, 100, 10, "Gulps the foe into the pit. Heals.", [{ kind: "drain", fraction: 0.5 }]),
  // Round 4: lotus and orchid lines
  m("lotus_effect", "Lotus Effect", "water", "status", 0, null, 10, "Everything just rolls off. Blocks.", [{ kind: "protect" }], 4),
  m("pod_shower", "Pod Shower", "water", "special", 25, 100, 20, "Seeds tip from the pod. 2-5 hits.", [{ kind: "multi_hit", min: 2, max: 5 }]),
  m("velamen", "Velamen", "water", "special", 60, 100, 15, "Spongy roots soak it up. Heals.", [{ kind: "drain", fraction: 0.5 }]),

  // ---------------------------------------------------------------- BUG
  m("quick_snap", "Quick Snap", "bug", "physical", 40, 100, 30, "Hair-trigger snap. Strikes first.", [], 1),
  m("dew_grasp", "Dew Grasp", "bug", "physical", 40, 100, 25, "Sticky tentacles. May slow the foe.", [foe("spe", -1, 20)]),
  m("snap_trap", "Snap Trap", "bug", "physical", 70, 95, 15, "Jaws snap shut. High crit rate.", [{ kind: "high_crit" }]),
  m("pitfall", "Pitfall", "bug", "physical", 80, 100, 15, "A slick pitcher rim. May flinch.", [{ kind: "flinch", chance: 20 }]),
  m("digest", "Digest", "bug", "special", 60, 100, 15, "Digests the foe. Heals the user.", [{ kind: "drain", fraction: 0.5 }]),
  m("sticky_dew", "Sticky Dew", "bug", "status", 0, 95, 30, "Gluey dew. Sharply cuts SPEED.", [foe("spe", -2)]),
  m("nectar_lure", "Nectar Lure", "bug", "status", 0, 100, 20, "A sweet lure. Cuts ACCURACY.", [foe("accuracy", -1)]),
  m("slick_rim", "Slick Rim", "bug", "physical", 40, 100, 30, "A waxy lip. The foe slips in."),

  // ---------------------------------------------------------------- BLOOM
  m("pollen_puff", "Pollen Puff", "bloom", "special", 40, 100, 30, "Puffs pollen. May cut ACCURACY.", [foe("accuracy", -1, 10)]),
  m("wind_scatter", "Wind Scatter", "bloom", "special", 60, null, 20, "Wind-borne seeds. Never misses.", [{ kind: "always_hit" }]),
  m("sunbeam", "Sunbeam", "bloom", "special", 90, 100, 10, "Focuses sunlight into a beam."),
  m("petal_storm", "Petal Storm", "bloom", "special", 110, 85, 5, "A blinding storm of petals."),
  m("unfurl", "Unfurl", "bloom", "status", 0, null, 20, "Opens up. Ups ATTACK and SP.ATK.", [self("atk", 1), self("spa", 1)]),
  m("sun_track", "Sun Track", "bloom", "status", 0, null, 20, "Turns sunward. SP.ATK sharply up.", [self("spa", 2)]),
  m("perfume", "Perfume", "bloom", "status", 0, 100, 20, "A heady scent. Sharply cuts ATK.", [foe("atk", -2)]),
  // Round 3: clover line
  m("lucky_leaf", "Lucky Leaf", "bloom", "special", 65, 100, 15, "A four-leaf charm. High crit rate.", [{ kind: "high_crit" }]),
  m("nitro_fix", "Nitro Fix", "bloom", "status", 0, null, 10, "Root nodules feed it. Heals half HP.", [{ kind: "heal", fraction: 0.5 }]),
  // Round 4: orchid and bird of paradise lines
  m("false_nectar", "False Nectar", "bloom", "status", 0, 100, 15, "Fake nectar. Cuts ATK and SP.ATK.", [foe("atk", -1), foe("spa", -1)]),
  m("long_bloom", "Long Bloom", "bloom", "status", 0, null, 10, "Blooms for months. Heals half HP.", [{ kind: "heal", fraction: 0.5 }]),
  m("pollen_perch", "Pollen Perch", "bloom", "physical", 80, 100, 15, "A perch springs open. May cut ACC.", [foe("accuracy", -1, 30)]),

  // ---------------------------------------------------------------- GHOST
  m("pale_touch", "Pale Touch", "ghost", "physical", 40, 100, 25, "A cold, pale touch from the dark."),
  m("rot_touch", "Rot Touch", "ghost", "physical", 70, 100, 15, "Spreads rot. May blight the foe.", [inflict("blight", 20)]),
  m("dodder_coil", "Dodder Coil", "ghost", "physical", 60, 100, 15, "Coils like dodder and drinks sap.", [{ kind: "drain", fraction: 0.5 }]),
  m("wither", "Wither", "ghost", "special", 0, 100, 15, "Damage equal to the user's level.", [{ kind: "fixed_damage", amount: "level" }]),
  m("moonbeam", "Moonbeam", "ghost", "special", 65, 100, 15, "Pale moonlight. May cut SP.DEF.", [foe("spd", -1, 20)]),
  m("pale_bloom", "Pale Bloom", "ghost", "special", 90, 100, 10, "A ghost-white bloom bursts open."),
  m("night_fold", "Night Fold", "ghost", "status", 0, null, 20, "Leaves fold. Ups DEF and SP.DEF.", [self("def", 1), self("spd", 1)]),
  m("spore_cloud", "Spore Cloud", "ghost", "status", 0, 75, 15, "Fungal friends puff sleep spores.", [inflict("dormant", 100)]),
  // Round 3: foxglove line
  m("digitalis", "Digitalis", "ghost", "special", 80, 100, 10, "Heart-slowing sap. May blight/slow.", [inflict("blight", 20), foe("spe", -1, 20)]),

  // ---------------------------------------------------------------- THORN
  m("thorn_jab", "Thorn Jab", "thorn", "physical", 40, 100, 30, "Jabs with a sharp thorn."),
  m("sting_hairs", "Sting Hairs", "thorn", "physical", 45, 100, 25, "Hairs inject sting. May blight.", [inflict("blight", 30)]),
  m("spine_volley", "Spine Volley", "thorn", "physical", 25, 95, 20, "Fires spines 2-5 times in a row.", [{ kind: "multi_hit", min: 2, max: 5 }]),
  m("burr_hitch", "Burr Hitch", "thorn", "physical", 60, null, 20, "Clinging burrs. Never misses.", [{ kind: "always_hit" }]),
  m("thorn_lash", "Thorn Lash", "thorn", "physical", 80, 100, 15, "Lashes with a thorny cane."),
  m("hook_thorns", "Hook Thorns", "thorn", "physical", 100, 85, 5, "Hooked thorns rip. High crit rate.", [{ kind: "high_crit" }]),
  m("bristle", "Bristle", "thorn", "status", 0, null, 20, "Spines stand up. Ups ATK and DEF.", [self("atk", 1), self("def", 1)]),
  // Round 3: holly and wild rose lines
  m("holly_spines", "Holly Spines", "thorn", "physical", 70, 100, 15, "Spiny leaves slash. May up DEF.", [statFx("def", 1, "self", 30)]),
  m("rose_thorn", "Rose Thorn", "thorn", "physical", 75, 100, 15, "Hooked prickles catch. High crit.", [{ kind: "high_crit" }]),

  // ---------------------------------------------------------------- FROST
  m("cold_mist", "Cold Mist", "frost", "special", 55, 95, 20, "Freezing mist off the water.", [inflict("frostbite", 10)]),
  m("splinter", "Splinter", "thorn", "physical", 55, 95, 20, "Hurls sharp oak splinters.", []),
  m("hoarfrost", "Hoarfrost", "frost", "special", 40, 100, 25, "Feathery frost. May slow the foe.", [foe("spe", -1, 30)]),
  m("frost_bloom", "Frost Bloom", "frost", "special", 65, 100, 15, "Ice ribbons burst. May frostbite.", [inflict("frostbite", 10)]),
  m("snowdrift", "Snowdrift", "frost", "special", 100, 85, 5, "Buries the foe. May frostbite.", [inflict("frostbite", 10)]),
  m("frost_needle", "Frost Needle", "frost", "physical", 60, 100, 20, "An icy needle. High crit rate.", [{ kind: "high_crit" }]),
  m("cold_snap", "Cold Snap", "frost", "status", 0, null, 5, "Calls a cold snap for 5 turns.", [{ kind: "weather", weather: "frost" }]),
  // Round 3: mint and holly lines
  m("menthol_chill", "Mint Chill", "frost", "special", 60, 100, 20, "Menthol fakes the cold. May freeze.", [inflict("frostbite", 10)]),
  m("evergreen", "Evergreen", "frost", "status", 0, null, 15, "Green in snow. Ups DEF and SP.DEF.", [self("def", 1), self("spd", 1)]),

  // ---------------------------------------------------------------- DRAGON
  m("fossil_print", "Fossil Print", "dragon", "special", 0, 100, 10, "Ancient imprint. Always 40 HP.", [{ kind: "fixed_damage", amount: 40 }]),
  m("red_resin", "Red Resin", "dragon", "special", 70, 100, 15, "Hurls blood-red dragon resin."),
  m("primal_frond", "Primal Frond", "dragon", "physical", 80, 100, 15, "A frond older than any flower."),
  m("old_growth", "Old Growth", "dragon", "status", 0, null, 20, "Ancient vigour. Ups ATK and SPEED.", [self("atk", 1), self("spe", 1)]),
  // Round 3: snapdragon line
  m("dragon_nip", "Dragon Nip", "dragon", "physical", 40, 100, 30, "A sharp little petal snap."),
  m("dragon_snap", "Dragon Snap", "dragon", "physical", 80, 100, 10, "Petal jaws spring shut. May flinch.", [{ kind: "flinch", chance: 20 }]),

  // ------------------------------------------------------------- Chapter 5
  m("root_siphon", "Root Siphon", "ghost", "special", 60, 100, 15, "Sips through roots. Heals half.", [{ kind: "drain", fraction: 0.5 }]),
  m("seed_drift", "Seed Drift", "bloom", "status", 0, 100, 20, "Drifting seeds cut ACCURACY.", [foe("accuracy", -1)]),
  m("serotiny", "Serotiny", "fire", "status", 0, null, 15, "Cone opens. Ups ATK and SP.ATK.", [self("atk", 1), self("spa", 1)]),
  m("snowmelt", "Snowmelt", "fire", "special", 65, 100, 15, "Flower heat. May scorch the foe.", [inflict("scorch", 10)]),
  m("heartwood", "Heartwood", "wood", "status", 0, null, 10, "Hardens the core. DEF sharply up.", [self("def", 2)]),
];

export const MOVES: Record<string, Move> = Object.fromEntries(LIST.map((mv) => [mv.id, mv]));
