// Every trainer's dialogue, joined by id to the battle data in
// src/data/trainers.json (format: docs/DATA.md § Trainers), and the TRAINERS
// record the game reads. Teams, levels, moves, bags, prizes, AI, music and
// marks live in the JSON (the Trainer Editor, trainereditor.html, edits it);
// the lines stay here, one set per trainer, where the three starter variants
// of a rival battle share one set keyed by the battle (`rival_4`).
// Species stay at or past their growth level unless the story says otherwise
// (BRAM's graft collar); the editor warns about the rest.

import type { SpeciesId } from "../contracts";
import { DATA } from "../data";
import file from "../data/trainers.json";
import { buildTrainers, type TrainerLines, type TrainersFile } from "./trainerFile";

type Lines = TrainerLines;

// --- rival BRAM: three variants per battle, by the player's starter -------------
// Bram always holds the starter strong against the player's:
//   player oak  -> Bram chili   player chili -> Bram lily   player lily -> Bram oak
// Each variant (`rival_2_oak`, ...) is its own entry in trainers.json.

export type StarterLine = "oak" | "chili" | "lily";
export const STARTER_LINES: StarterLine[] = ["oak", "chili", "lily"];
export const STARTER_SPECIES: Record<StarterLine, [SpeciesId, SpeciesId, SpeciesId]> = {
  oak: ["oak_acorn", "oak_sapling", "great_oak"],
  chili: ["chili_blossom", "green_chili", "red_chili"],
  lily: ["lily_seedpod", "lily_pad", "giant_water_lily"],
};
/** The line strong against the given one. */
export const COUNTER: Record<StarterLine, StarterLine> = { oak: "chili", chili: "lily", lily: "oak" };

// The Prologue through Chapter 4. Lines: one set per trainer; the rival's
// three starter variants share BRAM's set for that battle.
const EARLY_LINES: Record<string, Lines> = {
  // --- route trainers ---
  schoolkid_milo: {
    intro: "Teacher says dandelions are weeds. I say they're FIGHTERS!",
    defeat: "Blown away like fluff!",
    after: "One fluffy head holds up to 200 seeds. I counted. Mostly.",
  },
  gardener_rosa: {
    intro: "My seedlings chase the sun all day. Let's see them chase you!",
    defeat: "Wilted in the noon heat!",
    after: "Young sunflowers follow the sun. Grown ones face east.",
  },
  birdwatcher_alder: {
    intro: "Shh! I was waiting for a goldfinch. You'll do instead!",
    defeat: "Flew right past me.",
    after: "Goldfinches love dandelion seeds. Find the clocks, find the birds.",
  },
  beekeeper_mae: {
    intro: "Easy, now. My bees don't like surprises. Neither do I.",
    defeat: "Bzz... that stung.",
    after: "Pumpkin flowers open at dawn and shut by noon. My bees get up early!",
  },
  hiker_gus: {
    intro: "Ferns were here before the dinosaurs. Show some respect!",
    defeat: "Rolled up like a fiddlehead!",
    after: "Ferns spread by spores, not seeds. Flip a frond and look!",
  },
  florist_petra: {
    intro: "Every bouquet needs a thorn or two. Care to test mine?",
    defeat: "My arrangement! Ruined!",
    after: "Brambles are cousins of the WILD ROSE. Thorns run in the family!",
  },
  birdwatcher_owen: {
    intro: "Owls, moths and me. The night shift! You in?",
    defeat: "Out-hooted!",
    after: "MOONFLOWERS open at dusk for hawkmoths. I come for the moths.",
  },
  // --- conservatory juniors ---
  jr_hazel: {
    intro: "HOLLIS laid this maze himself. You won't get past me!",
    defeat: "Lost in my own hedge...",
    after: "A laid hedge is cut half through and bent over. And it keeps growing!",
  },
  jr_linden: {
    intro: "Nobody reaches HOLLIS without getting past me first!",
    defeat: "Fine, fine. Go on through.",
    after: "HOLLIS is gentle. His brambles are not.",
  },
  jr_sorrel: {
    intro: "Mind the boardwalk! And mind my hunters. They're peckish.",
    defeat: "Stuck fast...",
    after: "Bogs are short on nitrogen. So these plants get theirs from bugs!",
  },
  jr_tansy: {
    intro: "I'm NELL's best student! Snap snap!",
    defeat: "Snapped shut on nothing!",
    after: "A flytrap only shuts if its hairs are touched twice. It counts!",
  },
  // --- leaders ---
  hollis: {
    intro: "A hedge isn't a wall. It's a home. Show me who's chosen yours.",
    defeat: "Ah. Deep roots on that one.",
    after: "Tend them, and they'll tend you back. Always been the way.",
  },
  nell: {
    intro: "My little hunters are SO hungry today. Shall we?",
    defeat: "Oh! You're not on the menu after all!",
    after: "Feed them flies, never hamburger. Meat just rots in the trap!",
  },
  // --- Rootstock ---
  grunt_r3: {
    intro: "Official field survey. Move along, sprout!",
    defeat: "That wasn't in the survey plan!",
    after: "Forget you saw me. I'm a... surveyor. Of things.",
  },
  grunt_grove_1: {
    intro: "This sugarbush is under study. Authorised staff only!",
    defeat: "My sample jar! Careful!",
    after: "Sap carries signals, they told us. That's all I know. Honest.",
  },
  grunt_grove_2: {
    intro: "Another nosy botanist? A collar'll sort you out!",
    defeat: "The collars didn't help...",
    after: "Collars make them listen. Mostly. They hate it, though.",
  },
  grunt_grove_3: {
    intro: "SHEARS said nobody gets past. NOBODY!",
    defeat: "SHEARS is gonna prune ME now.",
    after: "Go on, then. SHEARS will cut you down to size.",
  },
  shears: {
    intro: "Let's prune you back to the root.",
    defeat: "An inefficient result.",
    after: "Every branch answers to the root, botanist.",
  },
  // --- rival BRAM (one set per battle; the three starter variants share it) ---
  rival_1: {
    intro: "Plants are tools. This one's mine now.",
    defeat: "...Fine. The tool was blunt.",
    after: "My father fixes things. So do I.",
  },
  rival_2: {
    intro: "You again. Let's get this over with.",
    defeat: "The collar should've... No. Forget it.",
    after: "Don't. Whatever you're about to say. Don't.",
  },
  rival_3: {
    intro: "Show them. Show them it's stronger.",
    defeat: "No. It's stronger now. It HAS to be.",
    after: "Leave me alone. Leave IT alone.",
  },
  // --- Chapter 4: ROUTE 4, the PALM HOUSE, ROUTE 5 and Conservatory 3 (the rose maze) ---
  orchardist_russet: {
    intro: "Mind the windfalls! This orchard's mine, and so's this battle.",
    defeat: "Bruised like a windfall!",
    after: "Plant an apple pip and you never get the same apple. So we graft them.",
  },
  beekeeper_clem: {
    intro: "Easy now. My bees are in a mood since the bloom. So am I.",
    defeat: "Bzz. That stung a bit.",
    after: "A honeybee makes a twelfth of a spoon of honey in her whole life.",
  },
  schoolkid_tam: {
    intro: "I picked these apples MYSELF! Bet they hit hard!",
    defeat: "Not fair! I had an apple!",
    after: "Mint makes your mouth feel cold. It isn't! It tricks your nerves.",
  },
  birdwatcher_kit: {
    intro: "Shh! A kingfisher, by the stones. Don't spook it... Too late.",
    defeat: "Gone. Like the kingfisher.",
    after: "Foxgloves are bumblebee flowers. Fat bees fit right inside the bells.",
  },
  hiker_ford: {
    intro: "Stepping stones, easy. Getting past me? Less easy!",
    defeat: "Slipped right off the stones!",
    after: "Only female hollies grow berries. They need a male tree nearby.",
  },
  researcher_lin: {
    intro: "You're raising the humidity. I'm logging it. And battling you.",
    defeat: "My readings! All fogged up!",
    after: "KEIKI is Hawaiian for baby. Orchids grow them right on their stems.",
  },
  florist_amaryl: {
    intro: "The PALM HOUSE is my muse. You, darling, are a distraction.",
    defeat: "Wilted in the steam!",
    after: "Lotus leaves shed water. Mud just rolls off. They stay spotless.",
  },
  gardener_ivy: {
    intro: "This was a lane, once. Then the bloom happened. Now it's mine!",
    defeat: "Cut right back!",
    after: "Peppermint's a cross of water mint and spearmint. A happy accident!",
  },
  hiker_dale: {
    intro: "Nobody's walked this lane in months. Who sent you?",
    defeat: "Lost my footing!",
    after: "Holly grows fewer prickles up high, where nothing can nibble it.",
  },
  jr_posy: {
    intro: "Every arrangement needs a star. Today, the star is ME!",
    defeat: "My arrangement! It's drooping!",
    after: "FLORA's roses bloom twice a year. Wild roses only manage once.",
  },
  jr_wexley: {
    intro: "Forty of FLORA's shows, I've seen. You shan't pass, young sprout!",
    defeat: "Oh, bother. Not in front of FLORA.",
    after: "She once signed my umbrella. I've never opened it since.",
  },
  flora: {
    intro: "Be a dear, and lose beautifully.",
    defeat: "No! Not my ORCHID! Not in front of the PRESS!",
    after: "I've redone my face. You'd never know. Would you? Don't answer.",
  },
};

// Chapter 5 (CH5_IDS.md §C). Lines: one set per trainer; the three rival_4
// variants share BRAM's.
const CH5_LINES: Record<string, Lines> = {
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

// Chapter 6 (CH6.md §5): one set per trainer.
const CH6_LINES: Record<string, Lines> = {
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

// Chapter 7 (CH7.md §5): one set per trainer.
const CH7_LINES: Record<string, Lines> = {
  climber_ridge: {
    intro: "The air's thin up here. Let's see if you can keep up!",
    defeat: "Out of breath. Out of luck.",
    after: "LARCHES are conifers, but they drop every needle in autumn.",
  },
  climber_scree: {
    intro: "Mind the scree! And mind my QUICKENED!",
    defeat: "Slipped...",
    after: "MOSS CAMPION grows in a tight cushion. It keeps its middle warm.",
  },
  skier_frost: {
    intro: "Fresh powder, fresh challenger!",
    defeat: "Wiped out!",
    after: "EDELWEISS wears woolly hairs against the cold and the glare.",
  },
  skier_drift: {
    intro: "I go downhill fast. You'll go down faster!",
    defeat: "Straight into a drift...",
    after: "SNOWDROPS flower at winter's end. Sometimes right through the snow.",
  },
  grunt_lodge: {
    intro: "Nobody goes near that bookcase. Nobody!",
    defeat: "Stung. The doctor won't like this.",
    after: "There's nothing behind the bookcase. Nothing at all!",
  },
  grunt_b1_1: {
    intro: "Hands off the emitter! The doctor needs that signal!",
    defeat: "Switched off...",
    after: "FIREWEED springs up after a fire. We just skip the fire.",
  },
  grunt_b1_2: {
    intro: "This emitter's mine. So's my BLADDERWORT. Snap!",
    defeat: "Sucked in and spat out.",
    after: "A BLADDERWORT trap snaps in about a millisecond. Faster than you.",
  },
  grunt_b1_3: {
    intro: "Last emitter. Last guard. Last chance to turn back!",
    defeat: "That was the last one, wasn't it.",
    after: "The doctor's downstairs. She won't go as easy as me.",
  },
  jr_flurry: {
    intro: "Careful on the ice! Once you slide, you can't stop!",
    defeat: "Slid right past me...",
    after: "Plan every slide before you take it. SIGNE does.",
  },
  jr_hoarfrost: {
    intro: "Frost forms overnight. So did my strategy!",
    defeat: "Melted.",
    after: "Only female HOLLY plants grow berries. Look for the red ones.",
  },
  calloway: {
    intro: "Observe closely. You may learn something.",
    defeat: "...Noted. A variable I failed to control.",
    after: "Nature is slow. I am not.",
  },
  signe: {
    intro: "Cold teaches patience. Let's see what you've learned.",
    defeat: "...Good. You held steady in the cold.",
    after: "Snow is a blanket. Under it, everything waits for spring.",
  },
};

// Chapter 8 (CH8.md §5): one set per trainer.
const CH8_LINES: Record<string, Lines> = {
  grunt_r0_1: {
    intro: "The RELAY's closed. For maintenance. Forever!",
    defeat: "Stung by my own NETTLES.",
    after: "NETTLE hairs have glassy tips. Brush one and it snaps off in your skin.",
  },
  grunt_r0_2: {
    intro: "Shoo. The boss wants quiet, and you're LOUD.",
    defeat: "...That was loud.",
    after: "A FLYTRAP only shuts if its trigger hairs are touched twice. It counts!",
  },
  grunt_r1_1: {
    intro: "Visiting hours are over. Open day's cancelled!",
    defeat: "Fine. Visiting hours are back on.",
    after: "FIREWEED seeds ride the wind on silky hairs. They find every burnt patch.",
  },
  grunt_r1_2: {
    intro: "The plants are finally quiet. Don't you dare wake them!",
    defeat: "Now you've done it.",
    after: "It takes about forty buckets of MAPLE sap to boil down one of syrup.",
  },
  grunt_r2_1: {
    intro: "These racks run hot. So do I!",
    defeat: "Overheated...",
    after: "A PITCHER PLANT's rim is slippery when wet. Insects slide straight in.",
  },
  grunt_r2_2: {
    intro: "Off the cables! Admin's orders!",
    defeat: "Tripped on a cable.",
    after: "A SUNDEW's sticky tentacles bend in over a fly, slowly, one by one.",
  },
  grunt_r2_3: {
    intro: "The admin says the network needs rest. Doesn't it look restful?",
    defeat: "Not very restful, that.",
    after: "GHOST PIPES have no green at all. They feed through fungi in the soil.",
  },
  grunt_r3_1: {
    intro: "Hands off the consoles! One wrong patch and it's all static!",
    defeat: "Prickled.",
    after: "A SAGUARO can wait fifty years or more before it grows its first arm.",
  },
  grunt_r3_2: {
    intro: "The admin's on the roof. You're not going up there!",
    defeat: "...You're going up there, aren't you.",
    after: "Wild MOTH ORCHIDS don't grow in soil. They cling to tree bark.",
  },
  wren: {
    intro: "Please. Just let it stay quiet.",
    defeat: "...It's going to be so loud again.",
    after: "Orchid seeds are dust. They can't sprout without a fungus. Nothing grows alone.",
  },
};

// Chapter 9 (CH9.md §5). Lines: one set per trainer; the three rival_5
// variants share BRAM's friendly set.
const CH9_LINES: Record<string, Lines> = {
  drifter_dune: {
    intro: "Sand in my boots, sand in my teeth. Sand in my battle plan!",
    defeat: "Buried...",
    after: "PRICKLY PEAR pads are stems, not leaves. Its spines are the leaves.",
  },
  drifter_mesa: {
    intro: "Thirty years I've walked this scrub. Never once in a hurry.",
    defeat: "Well. That was hurried.",
    after: "A SAGUARO's ribs fold like an accordion. After rain, it swells with water.",
  },
  botanist_sage2: {
    intro: "Out here, gardening is mostly patience. And a little shade.",
    defeat: "Wilted in the heat.",
    after: "A PITAYA is a climbing cactus. It clings on with roots along its stems.",
  },
  botanist_rue: {
    intro: "Shh! You nearly trod on a LITHOPS. They look just like pebbles.",
    defeat: "Trodden on after all.",
    after: "A LITHOPS is just two fat leaves. Each new pair grows up between the old.",
  },
  climber_red: {
    intro: "The rock's red all the way up. Wait till you see the trees!",
    defeat: "Lost my grip!",
    after: "A SNAPDRAGON stays shut until a bee heavy enough pushes it open.",
  },
  climber_ochre: {
    intro: "My UMBRELLA PUP has the shape already. Look at that crown!",
    defeat: "Folded up like an umbrella.",
    after: "A grown DRAGON TREE spreads its crown wide and flat, like an open umbrella.",
  },
  ranger_flint: {
    intro: "I came up here for the birds. The DRAGON FRUIT came for me.",
    defeat: "Flown the nest.",
    after: "DRAGON FRUIT flowers open for one night only. By morning, they're done.",
  },
  ranger_shale: {
    intro: "Not many birds up here. So I watch stones. One of mine flowered!",
    defeat: "Stone cold.",
    after: "A LITHOPS flowers from the split between its two leaves.",
  },
  rival_5: {
    intro: "No collar. No grafts. Just us. Go on.",
    defeat: "...Yeah. Fair. It still fought well.",
    after: "It grew back on its own. Took its time. That's allowed.",
  },
  jr_ember: {
    intro: "SNAPDRAGONS bite! Well. They snap. Gently!",
    defeat: "Snapped shut.",
    after: "ROOK says the dragon trees here are older than any kingdom.",
  },
  jr_scale: {
    intro: "Fill the pits, cross the hall. But first you cross me!",
    defeat: "Filled in.",
    after: "Boulder stuck? Step out and come back in. Unused ones roll home.",
  },
  rook: {
    intro: "Before trees older than kingdoms, we begin. Show me your roots.",
    defeat: "...So. The ridge will remember your name.",
    after: "Cut a dragon tree's bark and it weeps red resin. They remember every wound.",
  },
};

// Chapter 10 (CH10.md §5): one set per trainer.
const CH10_LINES: Record<string, Lines> = {
  r12_crag: {
    intro: "Gorge after gorge out here. My legs have opinions!",
    defeat: "My legs win the argument.",
    after: "LODGEPOLE PINE cones can stay shut for years. A fire's heat melts their resin seal.",
  },
  r12_gorge: {
    intro: "I climbed out of the desert to get here. So did all three of mine!",
    defeat: "Dried right up.",
    after: "A SAGUARO's roots run shallow and wide. They catch the rain before it soaks away.",
  },
  r12_kite: {
    intro: "Up here, the wind decides who flies. Today it's me!",
    defeat: "Blown off course.",
    after: "A LARCH is a conifer that drops its needles every autumn. They turn gold first.",
  },
  r12_rook: {
    intro: "Yes, ROOK. No relation. I'm named for the bird, and I watch them too!",
    defeat: "Outflown.",
    after: "SNOWDROP leaves have hardened tips. They push up through frozen ground.",
  },
  r12_sedge: {
    intro: "A pond, up on the plateau! My water plants needed a holiday.",
    defeat: "Sunk.",
    after: "Red MANGROVE seeds sprout while still on the tree. Then they drop and float off.",
  },
  r12_heath: {
    intro: "Last trainer before the COUNCIL. I'm the toughest weed on the road!",
    defeat: "Pulled up, roots and all.",
    after: "After a fire, FIREWEED can turn a whole blackened slope pink.",
  },
  grunt_arb_1: {
    intro: "The gate's open. Just not to you. MR. THORNE's orders!",
    defeat: "Closed... on me.",
    after: "Some butterflies lay eggs only on NETTLES. Their caterpillars don't mind the sting.",
  },
  grunt_arb_2: {
    intro: "Nobody bothers the boss while he works. Not botanists. Not the COUNCIL!",
    defeat: "Snapped.",
    after: "A FLYTRAP takes days to digest one fly. Then the trap opens again, hungry.",
  },
  grunt_arb_3: {
    intro: "That gate's been shut longer than I've been alive. Now it's ours!",
    defeat: "...Not ours, then.",
    after: "LODGEPOLE PINES spring up thick after a fire. Whole forests, all the same age.",
  },
  grunt_g1_1: {
    intro: "Stop staring at the trees! ...They're staring back, aren't they?",
    defeat: "Stop LOOKING at me. Not you. Them.",
    after: "These trunks creak when there's no wind at all. I don't like it in here.",
  },
  grunt_g1_2: {
    intro: "SHEARS is up ahead, trimming. You're next on her list!",
    defeat: "Trimmed.",
    after: "RED CEDAR wood shrugs off rot. A fallen log can lie for a century.",
  },
  grunt_g2_1: {
    intro: "These paths keep moving! I've walked past this tree six times!",
    defeat: "Seven times, now.",
    after: "Stand in a clearing and the trees shuffle. The doctor calls it \"fascinating\".",
  },
  grunt_g2_2: {
    intro: "DR. CALLOWAY's busy. Measuring. Everything. Including you!",
    defeat: "Measured and found wanting.",
    after: "A FLYTRAP snaps shut in a split second. Sealing up tight takes it much longer.",
  },
  grunt_g3_1: {
    intro: "Hear that? Nothing. Not a bird. Just the leaves, shivering.",
    defeat: "Now I'm shivering.",
    after: "Aspen leaves hang on flat stalks. The faintest breath of air sets them trembling.",
  },
  grunt_g3_2: {
    intro: "WREN won't say what the trees are saying. Maybe you will!",
    defeat: "Didn't think so.",
    after: "I signed up for steady work. Now I'm in a forest that's one tree. Steady, it isn't.",
  },
  grunt_heart_1: {
    intro: "The KEEPER stays put till the boss is finished. So do you!",
    defeat: "He's not going to finish, is he.",
    after: "They told us this was a rescue. It looks more like a cutting.",
  },
  grunt_heart_2: {
    intro: "Not one step nearer the root! The graft has nearly taken!",
    defeat: "Don't tell the boss.",
    after: "A graft only takes if the living layers under the bark line up. The boss never misses.",
  },
  shears_2: {
    intro: "You again. A persistent shoot. Persistence is easily cut.",
    defeat: "...Inefficient. Again.",
    after: "Cut a plant hard and it grows back stronger. I had not thought it applied to you.",
  },
  calloway_2: {
    intro: "This forest takes centuries over everything. I won't.",
    defeat: "...Noted. It would not be hurried. Nor, it seems, would you.",
    after: "Burn an aspen grove and it regrows from the roots. No signal required. ...Annoying.",
  },
  wren_2: {
    intro: "If you can make it quiet without a command, show me. Please.",
    defeat: "...Maybe it never needed to be quiet. Maybe it needed to be heard.",
    after: "An aspen clone is one plant, all the way down. Nothing in this grove grows alone.",
  },
  mercer: {
    intro: "I'm sorry it's you. Truly. But I won't watch a blight take everything twice.",
    defeat: "...So the wild wins. It always did.",
    after: "I wanted them safe. One root, one rule. ...Perhaps safe was never mine to give.",
  },
};

// Chapter 11 (CH11.md §4). The seat scripts (scripts/ch11.ts) speak the
// intro and after lines in the run; these cover the battle's defeat line and
// any direct talk. Toxicity is only ever "toxic if eaten" (CH11.md §7.3).
const CH11_LINES: Record<string, Lines> = {
  belladonna: {
    intro: "Look, don't touch. My NETTLES sting, and OLEANDER is toxic if eaten.",
    defeat: "Noted, labelled and filed. Under \"lost\".",
    after: "A NETTLE's hairs are tipped with silica. They snap off like tiny glass needles.",
  },
  mimi_osa: {
    intro: "Quietly, now. Some of us are folded up for the night.",
    defeat: "...Mm. Woken right up.",
    after: "Touch a SENSITIVE PLANT and its leaflets fold shut. Leave it be, and they reopen.",
  },
  titus_arum: {
    intro: "Hold your nose if you must. My TITAN ARUM won't take offence.",
    defeat: "Ah. Thoroughly decomposed.",
    after: "A TITAN ARUM's spike warms itself as it blooms. The heat helps spread the smell.",
  },
  pyra: {
    intro: "Hot start! My CHILI's been simmering all morning!",
    defeat: "Burned out! Wow. Okay. Wow.",
    after: "Birds can't feel a CHILI's burn. They eat the fruit and scatter the seeds far and wide.",
  },
  rowan: {
    intro: "The GROVE taught me patience. Let's see what it taught you.",
    defeat: "...Well grown. Every one of them.",
    after: "Every aspen in the GROVE shares one root. Odd. I always thought I stood alone.",
  },
};

/** Every trainer's dialogue by key (a trainer id, or a rival battle such as `rival_4`). */
export const TRAINER_LINES: Record<string, Lines> = {
  ...EARLY_LINES, ...CH5_LINES, ...CH6_LINES, ...CH7_LINES, ...CH8_LINES, ...CH9_LINES, ...CH10_LINES, ...CH11_LINES,
};

/**
 * Every trainer: trainers.json in file order, then the Council rematches the
 * build derives from the seats (+8 levels, src/world/rematches.ts). The file is
 * checked when this module loads (trainersFileErrors), so a bad edit fails
 * with the trainer and field.
 */
/** The shipped src/data/trainers.json, as parsed (the Trainer Editor's base). */
export const TRAINERS_FILE = file as unknown as TrainersFile;

export const TRAINERS = buildTrainers(TRAINERS_FILE, { data: DATA, lines: TRAINER_LINES });
