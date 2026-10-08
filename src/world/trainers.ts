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
// Chapter 6 lines: one set per trainer.
const CH6_LINES: Record<string, { intro: string; defeat: string; after: string }> = {
  angler_reed: {
    intro: "Fish aren't biting. Maybe you will!",
    defeat: "Snapped my line!",
    after: "CATTAIL fluff carries the seeds. The wind does the rest.",
  },
  angler_moss: {
    intro: "Sit still long enough and something always bites.",
    defeat: "Off the hook. Again.",
    after: "PITCHER PLANTS fish too. Bugs slip in and can't climb out.",
  },
  birder_tern: {
    intro: "Shh! You'll scare the herons. Battle quietly!",
    defeat: "...That was not quiet.",
    after: "Mangrove seedlings float off on the tide. Some sail for months.",
  },
  grunt_dock_1: {
    intro: "The doctor said not yet. I say NOW!",
    defeat: "Ow! Like grabbing a nettle!",
    after: "She's off to the lake. Never you mind which lake.",
  },
  grunt_dock_2: {
    intro: "Nobody leaves these docks with that seed but us!",
    defeat: "Snapped shut. On me.",
    after: "That grey boat's long gone. You'll never catch her now.",
  },
  sailor_kelp: {
    intro: "Ahoy, raft rider! Prepare to be boarded!",
    defeat: "Sunk without a trace!",
    after: "Lily pads float on air. Their leaves are full of tiny air spaces.",
  },
  sailor_brine: {
    intro: "One sailor. One QUICKENED. One salty battle!",
    defeat: "Washed overboard...",
    after: "EELGRASS meadows calm the waves. Little fish hide in them.",
  },
  diver_coral: {
    intro: "Just came up for air. Battle me before I go back down!",
    defeat: "Out of breath!",
    after: "MANGROVE roots shelter whole schools of young fish.",
  },
  diver_shoal: {
    intro: "Seen the seagrass from below? It's a meadow in the sea!",
    defeat: "Beached!",
    after: "SEAGRASS isn't seaweed. It's a real flowering plant.",
  },
  jr_spine: {
    intro: "BROTHER SAGUARO says be patient. I'm working on it!",
    defeat: "Ouch. A prickly loss.",
    after: "Don't stroke a PRICKLY PEAR. Its bristles come off in your skin.",
  },
  jr_needle: {
    intro: "Sharp! Needle-sharp! It's right there in my name!",
    defeat: "Blunted...",
    after: "Cactus spines are leaves, really. Very pointy leaves.",
  },
  saguaro: {
    intro: "Slowly, now. There is no hurry here.",
    defeat: "...Good. You waited for your moment.",
    after: "Everything worth growing grows slowly.",
  },
  jr_tide: {
    intro: "The tide's coming in. So am I!",
    defeat: "Washed out...",
    after: "SEAGRASS pollen drifts on the current. No bees required.",
  },
  jr_current: {
    intro: "The current carried you this far. Can you swim?",
    defeat: "Pulled under!",
    after: "RED MANGROVE roots keep out most of the salt in seawater.",
  },
  reyes: {
    intro: "Hold fast. The tide's turning!",
    defeat: "Ha! Outsailed, fair and square.",
    after: "Come back some evening and watch the LANTERN TREE light up.",
  },
};
const ch6Lines = (id: string) => CH6_LINES[id];
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

// Chapter 6 teams from CH6.md §5.
// Balance changes: Saguaro's prescribed 30/31/33 become 35/36/38; Reyes's
// ace moves from 34 to 35. Explicit moves retain signature setup/healing,
// with Ghost/Bloom coverage for Saguaro and gentler Water + Wood/Frost
// coverage for Reyes. balance.test.ts checks both mixed parties, every starter,
// and the mean bands (80.6% / 69.8%, no player or foe items in the model).
const ch6Trainers: TrainerDef[] = [
  trainer("angler_reed", "REED", "HIKER", "angler", [T("cattail", 25), T("sundew", 26)], ch6Lines("angler_reed")),
  trainer("angler_moss", "MOSS", "HIKER", "angler", [T("pitcher_plant", 26)], ch6Lines("angler_moss")),
  trainer("birder_tern", "TERN", "BIRDWATCHER", "birdwatcher", [T("mangrove_propagule", 24), T("white_clover", 26)], ch6Lines("birder_tern")),
  trainer("grunt_dock_1", "GRUNT", "ROOTSTOCK", "grunt", [T("stinging_nettle", 27), T("fireweed", 27)], ch6Lines("grunt_dock_1"), { music: "battle_rootstock" }),
  trainer("grunt_dock_2", "GRUNT", "ROOTSTOCK", "grunt", [T("venus_flytrap", 27), T("sugar_maple", 28)], ch6Lines("grunt_dock_2"), { music: "battle_rootstock" }),
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

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  [...routeTrainers, ...juniors, ...leaders, ...villains, ...rivals, ...ch4Trainers, ...ch5Trainers, ...ch6Trainers].map((t) => [t.id, t]),
);
