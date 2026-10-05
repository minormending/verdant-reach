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
    after: "Brambles are cousins of the rose. Thorns run in the family!",
  }),
  trainer("birdwatcher_owen", "OWEN", "BIRDWATCHER", "birdwatcher", [T("moonflower_seed", 10), T("moonflower_vine", 12)], {
    intro: "Owls, moths and me. The night shift! You in?",
    defeat: "Out-hooted!",
    after: "Moonflowers open at dusk for hawk moths. I come for the moths.",
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
]);

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  [...routeTrainers, ...juniors, ...leaders, ...villains, ...rivals].map((t) => [t.id, t]),
);
