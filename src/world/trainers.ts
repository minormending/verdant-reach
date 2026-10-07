// Every trainer in the slice. Teams follow docs/SLICE.md; species stay at or
// past their growth level unless the story says otherwise (Bram's graft collar).

import type { SpeciesId, TrainerDef } from "../contracts";

type Team = TrainerDef["team"];

function trainer(
  id: string,
  name: string,
  className: string,
  portrait: TrainerDef["portrait"],
  team: Team,
  lines: { intro: string; defeat: string; after: string },
  extra: Partial<TrainerDef> = {},
): TrainerDef {
  const top = Math.max(...team.map((m) => m.level));
  return {
    id, name, className, portrait, team,
    prize: extra.prize ?? top * 20,
    ai: extra.ai ?? "basic",
    music: extra.music ?? "battle_trainer",
    ...lines,
    ...extra,
  };
}

const T = (species: SpeciesId, level: number, moves?: string[]) => (moves ? { species, level, moves } : { species, level });

/** Placeholder text for new trainers; narrative (agent 10) writes the real lines. */
// --- route trainers ---------------------------------------------------------

const routeTrainers: TrainerDef[] = [
  trainer("schoolkid_milo", "MILO", "SCHOOLKID", "schoolkid", [T("dandelion_bud", 4)], {
    intro: "Teacher says dandelions are weeds. I say they're FIGHTERS!",
    defeat: "Blown away like fluff!",
    after: "One fluffy head holds up to 200 seeds. I counted. Mostly.",
  }),
  trainer("gardener_rosa", "ROSA", "GARDENER", "gardener", [T("sunflower_seedling", 5), T("dandelion_bud", 6)], {
    intro: "My seedlings chase the sun all day. Let's see them chase you!",
    defeat: "Wilted in the noon heat!",
    after: "Young sunflowers follow the sun. Grown ones face east.",
  }),
  trainer("birdwatcher_alder", "ALDER", "BIRDWATCHER", "birdwatcher", [T("dandelion_bud", 6), T("fern_fiddlehead", 6)], {
    intro: "Shh! I was waiting for a goldfinch. You'll do instead!",
    defeat: "Flew right past me.",
    after: "Goldfinches love dandelion seeds. Find the clocks, find the birds.",
  }),
  trainer("beekeeper_mae", "MAE", "BEEKEEPER", "beekeeper", [T("sunflower_seedling", 6), T("pumpkin_blossom", 7)], {
    intro: "Easy, now. My bees don't like surprises. Neither do I.",
    defeat: "Bzz... that stung.",
    after: "Pumpkin flowers open at dawn and shut by noon. My bees get up early!",
  }),
  trainer("hiker_gus", "GUS", "HIKER", "hiker", [T("fern_fiddlehead", 9), T("nettle_sprout", 10)], {
    intro: "Ferns were here before the dinosaurs. Show some respect!",
    defeat: "Rolled up like a fiddlehead!",
    after: "Ferns spread by spores, not seeds. Flip a frond and look!",
  }),
  trainer("florist_petra", "PETRA", "FLORIST", "florist", [T("bramble_blossom", 9), T("sunflower_bud", 12)], {
    intro: "Every bouquet needs a thorn or two. Care to test mine?",
    defeat: "My arrangement! Ruined!",
    after: "Brambles are cousins of the WILD ROSE. Thorns run in the family!",
  }),
  trainer("birdwatcher_owen", "OWEN", "BIRDWATCHER", "birdwatcher", [T("moonflower_seed", 10), T("moonflower_vine", 12)], {
    intro: "Owls, moths and me. The night shift! You in?",
    defeat: "Out-hooted!",
    after: "MOONFLOWERS open at dusk for hawkmoths. I come for the moths.",
  }),
];

// --- conservatory juniors ----------------------------------------------------

const juniors: TrainerDef[] = [
  trainer("jr_hazel", "HAZEL", "JR.GARDENER", "gardener", [T("bramble_blossom", 7), T("fern_fiddlehead", 8)], {
    intro: "HOLLIS laid this maze himself. You won't get past me!",
    defeat: "Lost in my own hedge...",
    after: "A laid hedge is cut half through and bent over. And it keeps growing!",
  }),
  trainer("jr_linden", "LINDEN", "JR.GARDENER", "gardener", [T("pumpkin_blossom", 8), T("bramble_blossom", 8)], {
    intro: "Nobody reaches HOLLIS without getting past me first!",
    defeat: "Fine, fine. Go on through.",
    after: "HOLLIS is gentle. His brambles are not.",
  }),
  trainer("jr_sorrel", "SORREL", "JR.GARDENER", "gardener", [T("sundew_rosette", 13), T("unfurling_fern", 14)], {
    intro: "Mind the boardwalk! And mind my hunters. They're peckish.",
    defeat: "Stuck fast...",
    after: "Bogs are short on nitrogen. So these plants get theirs from bugs!",
  }),
  trainer("jr_tansy", "TANSY", "SCHOOLKID", "schoolkid", [T("flytrap_seedling", 13), T("sundew_rosette", 14)], {
    intro: "I'm NELL's best student! Snap snap!",
    defeat: "Snapped shut on nothing!",
    after: "A flytrap only shuts if its hairs are touched twice. It counts!",
  }),
];

// --- leaders ------------------------------------------------------------------

const leaders: TrainerDef[] = [
  trainer("hollis", "HOLLIS", "WARDEN", "hollis", [T("fern_fiddlehead", 8, ["vine_lash", "curl_up", "sap_drain"]), T("bramble_berry", 10, ["thorn_jab", "vine_lash", "burr_hitch", "sap_seal"])], {
    intro: "A hedge isn't a wall. It's a home. Show me who's chosen yours.",
    defeat: "Ah. Deep roots on that one.",
    after: "Tend them, and they'll tend you back. Always been the way.",
  }, { ai: "smart", music: "battle_leader", mark: "bramble_mark", prize: 1100, items: [{ item: "water_flask", qty: 2 }] }),
  trainer("nell", "NELL", "WARDEN", "nell_pitcher", [T("flytrap_seedling", 13), T("sundew_rosette", 14), T("young_flytrap", 16)], {
    intro: "My little hunters are SO hungry today. Shall we?",
    defeat: "Oh! You're not on the menu after all!",
    after: "Feed them flies, never hamburger. Meat just rots in the trap!",
  }, { ai: "smart", music: "battle_leader", mark: "sundew_mark", prize: 1700, items: [{ item: "spring_water", qty: 2 }] }),
];

// --- Rootstock ------------------------------------------------------------------

const rootstock = (id: string, team: Team, lines: { intro: string; defeat: string; after: string }) =>
  trainer(id, "GRUNT", "ROOTSTOCK", "grunt", team, lines, { music: "battle_rootstock" });

const villains: TrainerDef[] = [
  rootstock("grunt_r3", [T("nettle_sprout", 9), T("bramble_blossom", 10)], {
    intro: "Official field survey. Move along, sprout!",
    defeat: "That wasn't in the survey plan!",
    after: "Forget you saw me. I'm a... surveyor. Of things.",
  }),
  rootstock("grunt_grove_1", [T("nettle_sprout", 11), T("maple_samara", 12)], {
    intro: "This sugarbush is under study. Authorised staff only!",
    defeat: "My sample jar! Careful!",
    after: "Sap carries signals, they told us. That's all I know. Honest.",
  }),
  rootstock("grunt_grove_2", [T("bramble_berry", 12), T("nettle_sprout", 12)], {
    intro: "Another nosy botanist? A collar'll sort you out!",
    defeat: "The collars didn't help...",
    after: "Collars make them listen. Mostly. They hate it, though.",
  }),
  rootstock("grunt_grove_3", [T("maple_samara", 12), T("maple_sapling", 13)], {
    intro: "SHEARS said nobody gets past. NOBODY!",
    defeat: "SHEARS is gonna prune ME now.",
    after: "Go on, then. SHEARS will cut you down to size.",
  }),
  trainer("shears", "SHEARS", "ADMIN", "shears", [T("bramble_berry", 12), T("maple_sapling", 14)], {
    intro: "Let's prune you back to the root.",
    defeat: "An inefficient result.",
    after: "Every branch answers to the root, botanist.",
  }, { ai: "smart", music: "battle_rootstock", prize: 1400 }),
];

// --- rival BRAM: three variants per battle, by the player's starter -------------
// Bram always holds the starter strong against the player's:
//   player oak  -> Bram chili   player chili -> Bram lily   player lily -> Bram oak

export type StarterLine = "oak" | "chili" | "lily";
export const STARTER_LINES: StarterLine[] = ["oak", "chili", "lily"];
export const STARTER_SPECIES: Record<StarterLine, [SpeciesId, SpeciesId, SpeciesId]> = {
  oak: ["oak_acorn", "oak_sapling", "great_oak"],
  chili: ["chili_blossom", "green_chili", "red_chili"],
  lily: ["lily_seedpod", "lily_pad", "giant_water_lily"],
};
/** The line strong against the given one. */
export const COUNTER: Record<StarterLine, StarterLine> = { oak: "chili", chili: "lily", lily: "oak" };

const RIVAL_3_MOVES: Record<StarterLine, string[]> = {
  oak: ["acorn_drop", "splinter", "vine_lash", "bark_skin"],
  chili: ["chili_burst", "smoulder", "seed_burst", "capsaicin"],
  lily: ["undertow", "cold_mist", "pad_slap", "sap_drain"],
};

const rivals: TrainerDef[] = STARTER_LINES.flatMap((line) => [
  trainer(`rival_1_${line}`, "BRAM", "RIVAL", "bram", [T(STARTER_SPECIES[line][0], 5)], {
    intro: "Plants are tools. This one's mine now.",
    defeat: "...Fine. The tool was blunt.",
    after: "My father fixes things. So do I.",
  }, { ai: "smart", prize: 300 }),
  trainer(`rival_2_${line}`, "BRAM", "RIVAL", "bram",
    [T("bramble_berry", 11), T("dandelion", 13), T(STARTER_SPECIES[line][1], 14)], {
      intro: "You again. Let's get this over with.",
      defeat: "The collar should've... No. Forget it.",
      after: "Don't. Whatever you're about to say. Don't.",
    }, { ai: "smart", prize: 1500 }),
  // Rival 3 (GLASSHOUSE NURSERY): the collared starter is forced past its growth level.
  // Balance (data): 18/19/21 and an all-attack set (the collar leaves no room
  // to rest) keep the counter-starter fight hard but winnable; see balance.test.ts.
  trainer(`rival_3_${line}`, "BRAM", "RIVAL", "bram",
    [T("bramble_berry", 18), T("dandelion", 19), T(STARTER_SPECIES[line][1], 21, RIVAL_3_MOVES[line])], {
      intro: "Show them. Show them it's stronger.",
      defeat: "No. It's stronger now. It HAS to be.",
      after: "Leave me alone. Leave IT alone.",
    },
    { ai: "smart", prize: 2200 }),
]);

// --- Chapter 4: ROUTE 4 (15-19), the PALM HOUSE, ROUTE 5 (the PRUNE loop) -------

const ch4Trainers: TrainerDef[] = [
  trainer("orchardist_russet", "RUSSET", "ORCHARDIST", "orchardist", [T("apple_pip", 16), T("white_clover", 17)], {
    intro: "Mind the windfalls! This orchard's mine, and so's this battle.",
    defeat: "Bruised like a windfall!",
    after: "Plant an apple pip and you never get the same apple. So we graft them.",
  }),
  trainer("beekeeper_clem", "CLEM", "BEEKEEPER", "beekeeper", [T("dandelion", 16), T("sunflower_bud", 17)], {
    intro: "Easy now. My bees are in a mood since the bloom. So am I.",
    defeat: "Bzz. That stung a bit.",
    after: "A honeybee makes a twelfth of a spoon of honey in her whole life.",
  }),
  trainer("schoolkid_tam", "TAM", "SCHOOLKID", "schoolkid", [T("mint_sprig", 15), T("rose_bud", 15), T("apple_pip", 16)], {
    intro: "I picked these apples MYSELF! Bet they hit hard!",
    defeat: "Not fair! I had an apple!",
    after: "Mint makes your mouth feel cold. It isn't! It tricks your nerves.",
  }),
  trainer("birdwatcher_kit", "KIT", "BIRDWATCHER", "birdwatcher", [T("maple_sapling", 16), T("foxglove", 18)], {
    intro: "Shh! A kingfisher, by the stones. Don't spook it... Too late.",
    defeat: "Gone. Like the kingfisher.",
    after: "Foxgloves are bumblebee flowers. Fat bees fit right inside the bells.",
  }),
  trainer("hiker_ford", "FORD", "HIKER", "hiker", [T("holly_seedling", 17), T("stinging_nettle", 18), T("cattail", 19)], {
    intro: "Stepping stones, easy. Getting past me? Less easy!",
    defeat: "Slipped right off the stones!",
    after: "Only female hollies grow berries. They need a male tree nearby.",
  }),
  trainer("researcher_lin", "LIN", "RESEARCHER", "researcher", [T("orchid_keiki", 15), T("monstera_cutting", 17)], {
    intro: "You're raising the humidity. I'm logging it. And battling you.",
    defeat: "My readings! All fogged up!",
    after: "KEIKI is Hawaiian for baby. Orchids grow them right on their stems.",
  }),
  trainer("florist_amaryl", "AMARYL", "FLORIST", "florist", [T("lotus_seed", 17), T("orchid_spike", 18)], {
    intro: "The PALM HOUSE is my muse. You, darling, are a distraction.",
    defeat: "Wilted in the steam!",
    after: "Lotus leaves shed water. Mud just rolls off. They stay spotless.",
  }),
  trainer("gardener_ivy", "IVY", "GARDENER", "gardener", [T("peppermint", 19), T("white_clover", 19), T("wild_rose", 20)], {
    intro: "This was a lane, once. Then the bloom happened. Now it's mine!",
    defeat: "Cut right back!",
    after: "Peppermint's a cross of water mint and spearmint. A happy accident!",
  }),
  trainer("hiker_dale", "DALE", "HIKER", "hiker", [T("unfurling_fern", 19), T("holly", 20), T("bramble_berry", 20)], {
    intro: "Nobody's walked this lane in months. Who sent you?",
    defeat: "Lost my footing!",
    after: "Holly grows fewer prickles up high, where nothing can nibble it.",
  }),
  // Conservatory 3: the rose maze. Juniors, then FLORA VANCE (Bloom).
  trainer("jr_posy", "POSY", "ARRANGER", "arranger", [T("wild_rose", 18), T("orchid_spike", 18)], {
    intro: "Every arrangement needs a star. Today, the star is ME!",
    defeat: "My arrangement! It's drooping!",
    after: "FLORA's roses bloom twice a year. Wild roses only manage once.",
  }),
  trainer("jr_wexley", "WEXLEY", "GENTLEMAN", "gentleman", [T("sunflower_bud", 18), T("white_clover", 19)], {
    intro: "Forty of FLORA's shows, I've seen. You shan't pass, young sprout!",
    defeat: "Oh, bother. Not in front of FLORA.",
    after: "She once signed my umbrella. I've never opened it since.",
  }),
  // Balance (data): the spike. Clover controls (root snare, crits), the rose
  // hits hard, and the MOTH ORCHID sets up SUN TRACK with bloom, ghost (vs wood)
  // and water-drain (vs fire) cover, plus one SPRING WATER. See balance.test.ts.
  trainer("flora", "FLORA", "WARDEN", "flora_vance", [
    T("white_clover", 19, ["lucky_leaf", "sap_drain", "root_snare", "vine_lash"]),
    T("wild_rose", 20, ["rose_thorn", "pollen_puff", "perfume", "vine_lash"]),
    T("moth_orchid", 22, ["wind_scatter", "moonbeam", "sun_track", "velamen"]),
  ], {
    intro: "Be a dear, and lose beautifully.",
    defeat: "No! Not my ORCHID! Not in front of the PRESS!",
    after: "I've redone my face. You'd never know. Would you? Don't answer.",
  },
    { ai: "smart", music: "battle_leader", mark: "rose_mark", prize: 2200, items: [{ item: "spring_water", qty: 1 }] }),
];

// Chapter 5 teams are fixed by CH5_IDS.md §C.
// Balance: retain every prescribed level, but use explicit early moves on
// Rival 4 and physical Ghost attacks on MORROW. The natural late movesets
// wall older mixed parties; balance.test.ts guards both older and Ch. 5 catches.
// Lines: one set per trainer; the three rival_4 variants share BRAM's.
const CH5_LINES: Record<string, { intro: string; defeat: string; after: string }> = {
  lumberjack_hale: {
    intro: "Came up here to fell timber. Then the timber started arguing back.",
    defeat: "TIMBER! ...That's me. I'm the timber.",
    after: "We only clear windfall now. You can't take a saw to a tree that flinches.",
  },
  lumberjack_birch: {
    intro: "BIRCH by name, lumberjack by trade. The pumpkin's a long story.",
    defeat: "Split like kindling!",
    after: "Red cedar splits clean along the grain. Shingle makers swear by it.",
  },
  forager_sage: {
    intro: "Shh, I'm foraging. You're the first thing I've found all morning.",
    defeat: "Not one basket's worth!",
    after: "SKUNK CABBAGE smells foul on purpose. The stink draws in the flies that carry its pollen.",
  },
  forager_ash: {
    intro: "Basket's full of mushrooms. Hands are free for battling!",
    defeat: "Spilled my whole basket!",
    after: "Mushrooms aren't QUICKENED. They're just the fruit. The fungus lives underground.",
  },
  grunt_bs_1: {
    intro: "This stand is ROOTSTOCK business. Hop it, sprout!",
    defeat: "Not the sacks! Mind the sacks!",
    after: "Cones that open with no fire. The doctor's ever so interested.",
  },
  grunt_bs_2: {
    intro: "Oi! You're trampling the samples!",
    defeat: "Ugh. That's going in my report.",
    after: "The doctor says any growth can be hurried. These cones hurried themselves.",
  },
  grunt_bs_3: {
    intro: "Nobody gets near the camp. Doctor's orders!",
    defeat: "Doctor's orders didn't cover THIS.",
    after: "Which doctor? ...I never said doctor. You misheard.",
  },
  rival_4: {
    intro: "Go on. Prove it. PROVE IT.",
    defeat: "No. It's GROWN. It's bigger than yours. How?!",
    after: "Don't. Just... don't.",
  },
  jr_nightshade: {
    intro: "Mind the dark! It's darker than it looks. Which is very.",
    defeat: "Oh! Lights out for me.",
    after: "MOONFLOWERS open at dusk and shut by morning. We work the same shift.",
  },
  jr_lantern: {
    intro: "MORROW says listen before you leap. I'm leaping!",
    defeat: "Should have listened...",
    after: "GHOST PIPES turn black if you pick them. So we never pick them.",
  },
  morrow: {
    intro: "Listen first. Then we'll begin.",
    defeat: "...There. Did you hear it? I did.",
    after: "Keep listening. Someone should.",
  },
};
const ch5Lines = (id: string) => CH5_LINES[id.startsWith("rival_4_") ? "rival_4" : id];
/** Chapter 6 lines are written in its writing pass. */
const ch6Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const ch5Trainers: TrainerDef[] = [
  trainer("lumberjack_hale", "HALE", "LUMBERJACK", "lumberjack", [T("maple_sapling", 21), T("holly", 22)], ch5Lines("lumberjack_hale")),
  trainer("lumberjack_birch", "BIRCH", "LUMBERJACK", "lumberjack", [T("pumpkin", 22)], ch5Lines("lumberjack_birch")),
  trainer("forager_sage", "SAGE", "FORAGER", "forager", [T("moonflower_vine", 20), T("skunk_cabbage_shoot", 21)], ch5Lines("forager_sage")),
  trainer("forager_ash", "ASH", "FORAGER", "forager", [T("fireweed_fluff", 21), T("sundew", 22)], ch5Lines("forager_ash")),
  trainer("grunt_bs_1", "GRUNT", "ROOTSTOCK", "grunt", [T("stinging_nettle", 23), T("fireweed_shoot", 23)], ch5Lines("grunt_bs_1"), { music: "battle_rootstock" }),
  trainer("grunt_bs_2", "GRUNT", "ROOTSTOCK", "grunt", [T("bramble_berry", 23), T("lodgepole_cone", 24)], ch5Lines("grunt_bs_2"), { music: "battle_rootstock" }),
  trainer("grunt_bs_3", "GRUNT", "ROOTSTOCK", "grunt", [T("venus_flytrap", 24), T("foxglove", 24)], ch5Lines("grunt_bs_3"), { music: "battle_rootstock" }),
  ...STARTER_LINES.map((line) => trainer(`rival_4_${line}`, "BRAM", "RIVAL", "bram", [
    T("blackberry", 25, ["thorn_jab", "bristle", "sap_seal"]),
    T("dandelion", 25, ["pollen_puff", "quick_snap", "perfume"]),
    T("sugar_maple", 26, ["samara_spin", "sugar_rush", "sap_seal"]),
    { ...T(STARTER_SPECIES[line][2], 27, RIVAL_3_MOVES[line]), grafted: true },
  ], ch5Lines(`rival_4_${line}`), { ai: "smart", prize: 2700 })),
  trainer("jr_nightshade", "VESPER", "NIGHT GARDENER", "night_gardener", [T("moonflower_vine", 23), T("ghostpipe_stalk", 23)], ch5Lines("jr_nightshade")),
  trainer("jr_lantern", "LUMEN", "NIGHT GARDENER", "night_gardener", [T("foxglove", 24), T("ghostpipe_nodding", 24)], ch5Lines("jr_lantern")),
  trainer("morrow", "MORROW", "WARDEN", "morrow", [
    T("ghostpipe_nodding", 24, ["pale_touch", "night_fold"]),
    T("moonflower", 26, ["pale_touch", "unfurl"]),
    T("ghost_pipe", 29, ["moonbeam", "rot_touch", "night_fold"]),
  ], ch5Lines("morrow"), { ai: "smart", music: "battle_leader", mark: "pipe_mark", prize: 2800, items: [{ item: "spring_water", qty: 1 }] }),
];

// Chapter 6 teams from CH6.md §5; dialogue stays with the narrative pass.
// Balance changes: Saguaro's prescribed 30/31/33 become 35/36/38; Reyes's
// ace moves from 34 to 35. Explicit moves retain signature setup/healing,
// with Ghost/Bloom coverage for Saguaro and gentler Water + Wood/Frost
// coverage for Reyes. balance.test.ts checks both mixed parties, every starter,
// and the mean bands (80.6% / 69.8%, no player or foe items in the model).
const ch6Trainers: TrainerDef[] = [
  trainer("angler_reed", "REED", "HIKER", "angler", [T("cattail", 25), T("sundew", 26)], ch6Lines("angler_reed")),
  trainer("angler_moss", "MOSS", "HIKER", "angler", [T("pitcher_plant", 26)], ch6Lines("angler_moss")),
  trainer("birder_tern", "TERN", "BIRDWATCHER", "birdwatcher", [T("mangrove_propagule", 24), T("white_clover", 26)], ch6Lines("birder_tern")),
  trainer("grunt_dock_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 27), T("fireweed", 27)], ch6Lines("grunt_dock_1"), { music: "battle_rootstock" }),
  trainer("grunt_dock_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 27), T("sugar_maple", 28)], ch6Lines("grunt_dock_2"), { music: "battle_rootstock" }),
  trainer("sailor_kelp", "KELP", "HIKER", "sailor", [T("seagrass_shoot", 27), T("lily_pad", 28)], ch6Lines("sailor_kelp")),
  trainer("sailor_brine", "BRINE", "HIKER", "sailor", [T("eelgrass", 29)], ch6Lines("sailor_brine")),
  trainer("diver_coral", "CORAL", "GARDENER", "diver", [T("mangrove_sapling", 28), T("cattail", 28)], ch6Lines("diver_coral")),
  trainer("diver_shoal", "SHOAL", "GARDENER", "diver", [T("seagrass_shoot", 28), T("giant_water_lily", 29)], ch6Lines("diver_shoal")),
  trainer("jr_spine", "SPINE", "JR.GARDENER", "gardener", [T("pear_pad", 28), T("padded_cactus", 29)], ch6Lines("jr_spine")),
  trainer("jr_needle", "NEEDLE", "JR.GARDENER", "gardener", [T("stinging_nettle", 29), T("padded_cactus", 29)], ch6Lines("jr_needle")),
  trainer("saguaro", "SAGUARO", "WARDEN", "brother_saguaro", [
    T("padded_cactus", 34, ["glochid_spray", "vine_lash", "sun_track"]),
    T("prickly_pear", 35, ["pale_bloom", "sunbeam", "sun_track"]),
    T("saguaro_column", 37, ["thorn_lash", "root_tap", "water_store", "sun_track"]),
  ], ch6Lines("saguaro"),
    { ai: "smart", music: "battle_leader", mark: "cactus_mark", items: [{ item: "spring_water", qty: 1 }] }),
  trainer("jr_tide", "TIDE", "JR.GARDENER", "gardener", [T("seagrass_shoot", 30), T("lily_pad", 30)], ch6Lines("jr_tide")),
  trainer("jr_current", "CURRENT", "JR.GARDENER", "gardener", [T("mangrove_sapling", 31), T("eelgrass", 31)], ch6Lines("jr_current")),
  trainer("reyes", "REYES", "WARDEN", "reyes", [T("eelgrass", 32, ["dew_drop", "cold_mist", "sap_drain"]), T("mangrove_sapling", 32, ["undertow", "cold_mist", "stilt_roots"]), T("giant_water_lily", 33, ["undertow", "pad_slap", "sap_drain"]), T("red_mangrove", 35, ["dew_drop", "sap_spout", "cold_mist", "stilt_roots"])], ch6Lines("reyes"),
    { ai: "smart", music: "battle_leader", mark: "mangrove_mark", items: [{ item: "spring_water", qty: 2 }] }),
];

// Chapter 7 (CH7.md §5): preserve team identities and ±2 boss-level bounds.
/** Chapter 7 lines are written in its writing pass. */
const ch7Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const ch7Trainers: TrainerDef[] = [
  trainer("climber_ridge", "RIDGE", "HIKER", "hiker", [T("larch_seedling", 33), T("holly", 34)], ch7Lines("climber_ridge")),
  trainer("climber_scree", "SCREE", "HIKER", "hiker", [T("campion_mound", 34)], ch7Lines("climber_scree")),
  trainer("skier_frost", "FROST", "BIRDWATCHER", "birdwatcher", [T("peppermint", 34), T("edelweiss_bud", 33)], ch7Lines("skier_frost")),
  trainer("skier_drift", "DRIFT", "BIRDWATCHER", "birdwatcher", [T("snowdrop_shoot", 34), T("larch", 35)], ch7Lines("skier_drift")),
  trainer("grunt_lodge", "LODGE", "GRUNT", "grunt", [T("stinging_nettle", 35), T("venus_flytrap", 35)], ch7Lines("grunt_lodge"), { music: "battle_rootstock" }),
  trainer("grunt_b1_1", "SIGNAL 1", "GRUNT", "grunt", [T("fireweed", 36), T("sugar_maple", 36)], ch7Lines("grunt_b1_1"), { music: "battle_rootstock" }),
  trainer("grunt_b1_2", "SIGNAL 2", "GRUNT", "grunt", [T("red_mangrove", 36), T("bladderwort", 36)], ch7Lines("grunt_b1_2"), { music: "battle_rootstock" }),
  trainer("grunt_b1_3", "SIGNAL 3", "GRUNT", "grunt", [T("prickly_pear", 37), T("foxglove", 36)], ch7Lines("grunt_b1_3"), { music: "battle_rootstock" }),
  trainer("jr_flurry", "FLURRY", "JR.GARDENER", "gardener", [T("edelweiss", 38), T("snowdrop_shoot", 38)], ch7Lines("jr_flurry")),
  trainer("jr_hoarfrost", "HOARFROST", "JR.GARDENER", "gardener", [T("campion_mound", 39), T("holly", 39)], ch7Lines("jr_hoarfrost")),
  // Tuning: ghost_pipe 38→40 (+2), lodgepole_pine 39→40 (+1), red_mangrove 41→42 (+1).
  // Explicit moves below retain a special Ghost attack and a real fire attack on
  // the pine; the mangrove carries the coverage used by Reyes. Mean win: 75.1%.
  trainer("calloway", "CALLOWAY", "ADMIN", "shears", [
    T("ghost_pipe", 40, ["pale_bloom", "root_siphon", "spore_cloud", "petal_storm"]),
    T("lodgepole_pine", 40, ["leaf_edge", "ember_seed", "serotiny"]),
    { ...T("red_mangrove", 42, ["flood", "sap_spout", "cold_mist", "stilt_roots"]), grafted: true },
  ], ch7Lines("calloway"),
    { ai: "smart", music: "battle_rootstock", items: [{ item: "spring_water", qty: 1 }] }),
  // Tuning: every member is -1 from §5 (40/41/41/43 → 39/40/40/42).
  // Explicit moves soften repeated healing and Bloom coverage while preserving
  // signature Frost play. Mean win: 62.8%; every party/starter exceeds 25%.
  trainer("signe", "SIGNE", "WARDEN", "nell_pitcher", [
    T("edelweiss", 39, ["frost_bloom", "sunbeam", "woolly_coat"]),
    T("moss_campion", 40, ["cold_mist", "sap_drain", "cushion"]),
    T("larch", 40, ["needle_drop", "frost_needle", "evergreen"]),
    T("snowdrop", 42, ["thaw_bloom", "sap_drain", "sun_track"]),
  ], ch7Lines("signe"),
    { ai: "smart", music: "battle_leader", mark: "snowdrop_mark", items: [{ item: "spring_water", qty: 2 }] }),
];

// Chapter 8 (CH8.md §5). Dialogue is reserved for the writing pass.
const ch8Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const ch8Trainers: TrainerDef[] = [
  trainer("grunt_r0_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 41), T("foxglove", 41)], ch8Lines("grunt_r0_1"), { music: "battle_rootstock" }),
  trainer("grunt_r0_2", "GRUNT", "GRUNT", "grunt", [T("bramble_berry", 41), T("venus_flytrap", 42)], ch8Lines("grunt_r0_2"), { music: "battle_rootstock" }),
  trainer("grunt_r1_1", "GRUNT", "GRUNT", "grunt", [T("fireweed", 42), T("holly", 42)], ch8Lines("grunt_r1_1"), { music: "battle_rootstock" }),
  trainer("grunt_r1_2", "GRUNT", "GRUNT", "grunt", [T("sugar_maple", 42), T("lodgepole_pine", 43)], ch8Lines("grunt_r1_2"), { music: "battle_rootstock" }),
  trainer("grunt_r2_1", "GRUNT", "GRUNT", "grunt", [T("pitcher_plant", 42), T("bladderwort", 43)], ch8Lines("grunt_r2_1"), { music: "battle_rootstock" }),
  trainer("grunt_r2_2", "GRUNT", "GRUNT", "grunt", [T("prickly_pear", 43), T("sundew", 43)], ch8Lines("grunt_r2_2"), { music: "battle_rootstock" }),
  trainer("grunt_r2_3", "GRUNT", "GRUNT", "grunt", [T("red_mangrove", 43), T("ghost_pipe", 43)], ch8Lines("grunt_r2_3"), { music: "battle_rootstock" }),
  trainer("grunt_r3_1", "GRUNT", "GRUNT", "grunt", [T("saguaro", 44)], ch8Lines("grunt_r3_1"), { music: "battle_rootstock" }),
  trainer("grunt_r3_2", "GRUNT", "GRUNT", "grunt", [T("moth_orchid", 43), T("larch", 44)], ch8Lines("grunt_r3_2"), { music: "battle_rootstock" }),
  // Wren tuning from §5: every level -2 (44/45/45/48 → 42/43/43/46).
  // Explicit learned moves below soften late-game damage while retaining orchid
  // healing, fungal drain, maple sap and cedar defence. Mean: 75.5%; min: 38.0%.
  trainer("wren", "WREN", "ADMIN", "researcher", [
    T("moth_orchid", 42, ["wind_scatter", "moonbeam", "false_nectar", "long_bloom"]),
    T("ghost_pipe", 43, ["moonbeam", "root_siphon", "spore_cloud"]),
    T("sugar_maple", 43, ["samara_spin", "sap_spout", "hoarfrost", "sugar_rush"]),
    T("red_cedar", 46, ["leaf_edge", "pale_touch", "heartwood", "sap_seal"]),
  ], ch8Lines("wren"), { ai: "smart", music: "battle_rootstock", items: [{ item: "spring_water", qty: 2 }] }),
];

// Chapter 9 (CH9.md §5). Dialogue awaits the writing pass.
const ch9Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const ch9Trainers: TrainerDef[] = [
  trainer("drifter_dune", "DUNE", "HIKER", "hiker", [T("prickly_pear", 43), T("lithops_pair", 42)], ch9Lines("drifter_dune")),
  trainer("drifter_mesa", "MESA", "HIKER", "hiker", [T("saguaro", 44)], ch9Lines("drifter_mesa")),
  trainer("botanist_sage2", "SAGE", "GARDENER", "gardener", [T("pitaya_cutting", 43), T("foxglove", 43)], ch9Lines("botanist_sage2")),
  trainer("botanist_rue", "RUE", "GARDENER", "gardener", [T("lithops_pair", 43), T("dandelion_clock", 43)], ch9Lines("botanist_rue")),
  trainer("climber_red", "RED", "HIKER", "hiker", [T("snapdragon_sprout", 44), T("larch", 45)], ch9Lines("climber_red")),
  trainer("climber_ochre", "OCHRE", "HIKER", "hiker", [T("dragon_sapling", 45)], ch9Lines("climber_ochre")),
  trainer("ranger_flint", "FLINT", "BIRDWATCHER", "birdwatcher", [T("dragon_fruit", 45), T("saguaro", 45)], ch9Lines("ranger_flint")),
  trainer("ranger_shale", "SHALE", "BIRDWATCHER", "birdwatcher", [T("lithops_bloom", 46)], ch9Lines("ranger_shale")),
  // Rival 5: all levels unchanged. Explicit learned moves replace late-game
  // coverage and healing on the clock/maple/cedar, and reuse Rival 4's starter
  // moves without its collar. Mean win 81.3%, minimum 41.7% (balance.test.ts).
  ...STARTER_LINES.map((line) => trainer(`rival_5_${line}`, "BRAM", "RIVAL", "bram", [
    T("blackberry", 46),
    T("dandelion_clock", 46, ["wind_scatter", "sunbeam", "perfume"]),
    T("sugar_maple", 47, ["samara_spin", "sap_spout", "sugar_rush", "hoarfrost"]),
    T("red_cedar", 47, ["leaf_edge", "pale_touch", "sap_seal", "heartwood"]),
    T(STARTER_SPECIES[line][2], 49, RIVAL_3_MOVES[line]),
  ], ch9Lines(`rival_5_${line}`), { ai: "smart", prize: 4900 })),
  trainer("jr_ember", "EMBER", "JR.GARDENER", "gardener", [T("snapdragon_sprout", 47), T("dragon_sapling", 47)], ch9Lines("jr_ember")),
  trainer("jr_scale", "SCALE", "JR.GARDENER", "gardener", [T("pitaya_cutting", 47), T("lithops_pair", 48)], ch9Lines("jr_scale")),
  // Rook: levels -1/-2/-2/-2 (49/50/50/53 → 48/48/48/51). Explicit learned
  // moves keep Dragon Snap, Night Bloom, Stone Window and Dragon Resin, while
  // removing repeated healing and broad late-game coverage. Raising only
  // snapdragon from 47 to 48 gives mean win 58.6%, minimum 30.7%; harder than
  // Signe (62.8%) and Flora (61.2%) under balance.test.ts's milestone model.
  trainer("rook", "ROOK", "WARDEN", "hollis", [
    T("snapdragon", 48, ["dragon_snap", "red_resin", "perfume"]),
    T("dragon_fruit", 48, ["night_bloom", "spine_volley", "nectar_lure"]),
    T("lithops_bloom", 48, ["thorn_lash", "stone_window", "bristle"]),
    T("dragon_tree", 51, ["dragon_resin", "sap_seal", "bark_skin"]),
  ], ch9Lines("rook"), { ai: "smart", music: "battle_leader", mark: "resin_mark", items: [{ item: "spring_water", qty: 2 }] }),
];

// Chapter 10 (CH10.md §5); dialogue belongs to the story pass.
// Balance (two mixed parties, 300 seeded trials per starter, no items):
// Shears +2 throughout (76.1%); Calloway +1 throughout (75.2%);
// Wren unchanged levels with explicit learned moves (76.1%);
// Mercer +2 on his first five, +1 on the ace (56.8%, minimum 28.3%).
const ch10Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const ch10Trainers: TrainerDef[] = [
  trainer("r12_crag", "CRAG", "HIKER", "hiker", [T("lodgepole_pine", 50), T("lithops_bloom", 51)], ch10Lines("r12_crag")),
  trainer("r12_gorge", "GORGE", "HIKER", "hiker", [T("saguaro", 51), T("dragon_tree", 52), T("prickly_pear", 51)], ch10Lines("r12_gorge")),
  trainer("r12_kite", "KITE", "BIRDWATCHER", "birdwatcher", [T("larch", 51), T("edelweiss", 52)], ch10Lines("r12_kite")),
  trainer("r12_rook", "ROOK", "BIRDWATCHER", "birdwatcher", [T("red_cedar", 52), T("moss_campion", 52), T("snowdrop", 53)], ch10Lines("r12_rook")),
  trainer("r12_sedge", "SEDGE", "GARDENER", "gardener", [T("red_mangrove", 52), T("bladderwort", 52)], ch10Lines("r12_sedge")),
  trainer("r12_heath", "HEATH", "GARDENER", "gardener", [T("fireweed", 53), T("dragon_fruit", 53), T("ghost_pipe", 52)], ch10Lines("r12_heath")),
  trainer("grunt_arb_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 51), T("lodgepole_pine", 51)], ch10Lines("grunt_arb_1"), { music: "battle_rootstock" }),
  trainer("grunt_arb_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 51), T("red_cedar", 51)], ch10Lines("grunt_arb_2"), { music: "battle_rootstock" }),
  trainer("grunt_arb_3", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 51), T("lodgepole_pine", 51)], ch10Lines("grunt_arb_3"), { music: "battle_rootstock" }),
  trainer("grunt_g1_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 52), T("lodgepole_pine", 52)], ch10Lines("grunt_g1_1"), { music: "battle_rootstock" }),
  trainer("grunt_g1_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 52), T("red_cedar", 52)], ch10Lines("grunt_g1_2"), { music: "battle_rootstock" }),
  trainer("grunt_g2_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 53), T("lodgepole_pine", 53)], ch10Lines("grunt_g2_1"), { music: "battle_rootstock" }),
  trainer("grunt_g2_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 53), T("red_cedar", 53)], ch10Lines("grunt_g2_2"), { music: "battle_rootstock" }),
  trainer("grunt_g3_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 54), T("lodgepole_pine", 54)], ch10Lines("grunt_g3_1"), { music: "battle_rootstock" }),
  trainer("grunt_g3_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 54), T("red_cedar", 54)], ch10Lines("grunt_g3_2"), { music: "battle_rootstock" }),
  trainer("grunt_heart_1", "GRUNT", "GRUNT", "grunt", [T("stinging_nettle", 54), T("lodgepole_pine", 54)], ch10Lines("grunt_heart_1"), { music: "battle_rootstock" }),
  trainer("grunt_heart_2", "GRUNT", "GRUNT", "grunt", [T("venus_flytrap", 54), T("red_cedar", 54)], ch10Lines("grunt_heart_2"), { music: "battle_rootstock" }),
  trainer("shears_2", "SHEARS", "ADMIN", "shears", [
    T("bramble_berry", 55), T("holly", 56), T("stinging_nettle", 57), T("blackberry", 58),
  ], ch10Lines("shears_2"), { ai: "smart", music: "battle_rootstock" }),
  trainer("calloway_2", "CALLOWAY", "ADMIN", "shears", [
    { ...T("red_mangrove", 56), grafted: true }, T("lodgepole_pine", 55), T("ghost_pipe", 55),
    { ...T("saguaro", 57), grafted: true },
  ], ch10Lines("calloway_2"), { ai: "smart", music: "battle_rootstock" }),
  trainer("wren_2", "WREN", "ADMIN", "researcher", [
    T("moth_orchid", 54, ["wind_scatter", "moonbeam", "false_nectar", "long_bloom"]),
    T("ghost_pipe", 55, ["moonbeam", "root_siphon", "spore_cloud"]),
    T("red_cedar", 56, ["leaf_edge", "pale_touch", "sap_seal", "heartwood"]),
    T("quaking_aspen", 57, ["many_trunks", "pale_touch", "bark_skin", "sap_seal"]),
  ], ch10Lines("wren_2"), { ai: "smart", music: "battle_rootstock" }),
  trainer("mercer", "MERCER", "ROOTSTOCK", "gentleman", [
    T("apple_tree", 58), T("wild_rose", 58), T("sugar_maple", 59), T("red_cedar", 59), T("dragon_tree", 60), T("quaking_aspen", 61),
  ], ch10Lines("mercer"), { ai: "smart", music: "battle_rootstock", items: [{ item: "spring_water", qty: 3 }] }),
];

// Chapter 11 (CH11.md §4). Narrative is supplied by the next wave.
const ch11Lines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
const council = { ai: "smart", music: "battle_leader", items: [{ item: "spring_water", qty: 2 }] } as const;
const ch11Trainers: TrainerDef[] = [
  trainer("belladonna", "BELLADONNA", "APOTHECARY", "florist", [
    T("stinging_nettle", 61, ["pitfall", "hook_thorns", "sting_hairs", "allelopathy"]),
    T("stinging_nettle", 62, ["pitfall", "thorn_lash", "spine_volley", "thorn_jab"]),
    T("oleander", 56),
    T("stinging_nettle", 62, ["allelopathy", "thorn_lash", "root_snare", "spine_volley"]),
  ], ch11Lines("belladonna"), { ...council, items: [...council.items] }),
  trainer("mimi_osa", "MIMI OSA", "SLEEPER", "researcher", [
    T("moonflower", 58, ["sunbeam", "moonbeam", "pale_bloom", "spore_cloud"]),
    T("ghost_pipe", 64, ["petal_storm", "perfume", "wither", "spore_cloud"]),
    T("moonflower", 64, ["petal_storm", "pale_bloom", "pollen_puff", "wither"]),
    T("sensitive_plant", 65, ["leaf_gale", "sunbeam", "sap_drain", "spore_cloud"]),
  ], ch11Lines("mimi_osa"), { ...council, items: [...council.items] }),
  trainer("titus_arum", "TITUS ARUM", "ROTTER", "gentleman", [
    T("bladderwort", 62, ["digest", "pitfall", "dew_drop", "pad_slap"]),
    T("pitcher_plant", 64),
    T("corpse_leaf", 57),
    T("titan_arum", 65),
  ], ch11Lines("titus_arum"), { ...council, items: [...council.items] }),
  trainer("pyra", "PYRA", "KINDLER", "florist", [
    T("red_chili", 63, ["seed_burst", "petal_storm", "capsaicin", "leaf_edge"]),
    T("fireweed", 61, ["unfurl", "pollen_puff", "wind_scatter", "ember_seed"]),
    T("flame_lily", 62, ["petal_storm", "pollen_puff", "climbing_flame", "wildfire"]),
    T("lodgepole_pine", 63, ["vine_lash", "sap_spout", "timber", "sap_seal"]),
  ], ch11Lines("pyra"), { ...council, items: [...council.items] }),
  trainer("rowan", "ROWAN VALE", "KEEPER", "researcher", [
    T("quaking_aspen", 65, ["many_trunks", "root_tap", "sap_drain", "old_growth"]),
    T("red_cedar", 63, ["vine_lash", "leaf_edge", "sap_seal", "timber"]),
    T("dragon_tree", 65, ["old_growth", "vine_lash", "sap_seal", "leaf_gale"]),
    T("moss_campion", 65, ["sunbeam", "vine_lash", "photosynthesise", "curl_up"]),
    T("sacred_lotus", 66, ["perfume", "dew_drop", "petal_storm", "undertow"]),
    T("great_oak", 65, ["acorn_drop", "photosynthesise", "leaf_edge", "root_snare"]),
  ], ch11Lines("rowan"), { ...council, items: [{ item: "spring_water", qty: 3 }] }),
];

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  [...routeTrainers, ...juniors, ...leaders, ...villains, ...rivals, ...ch4Trainers, ...ch5Trainers, ...ch6Trainers, ...ch7Trainers, ...ch8Trainers, ...ch9Trainers, ...ch10Trainers, ...ch11Trainers].map((t) => [t.id, t]),
);
