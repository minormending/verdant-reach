// Side quests (docs/ROUND3.md §4, ROUND4.md §1.4). Nine small stories, each with a character, a
// true plant fact and a thread back to the main mystery: the bloom, the hum
// under the valley and the plants that turned toward the hills.
//
// Every giver handles four states: not started, started (a reminder), goal met
// (the reward, then completeQuest, then a closing line so the quest jingle
// never ends a script with no box open) and done (an after-line; the reward is never
// repeated). Where a goal can already be met when the quest starts, the giver
// checks it straight away rather than sending the player off for nothing.
//
// Map agents place the NPCs (ids and script ids per ROUND3.md §4). These
// scripts never face/emote/move the quest NPCs by id (talking turns an NPC to
// the player anyway), so they stay valid whichever map files have landed.
//
// Voice: STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.

import type { QuestDef, ScriptCmd, SpeciesId } from "../../contracts";
import { emote, flag, give, ifFlags, say, wait, type Scripts } from "../build";

const started = (q: string) => `quest_${q}_started`;
const done = (q: string) => `quest_${q}_done`;
const startQuest = (quest: string): ScriptCmd => ({ op: "startQuest", quest });
const completeQuest = (quest: string): ScriptCmd => ({ op: "completeQuest", quest });

/** Branch on a quest's progress: done, then started, then not started. */
const byQuest = (q: string, s: { fresh: ScriptCmd[]; going: ScriptCmd[]; finished: ScriptCmd[] }): ScriptCmd =>
  ifFlags({ [done(q)]: true }, s.finished, [ifFlags({ [started(q)]: true }, s.going, s.fresh)]);

const caughtCount = (atLeast: number, then: ScriptCmd[], els: ScriptCmd[] = []): ScriptCmd =>
  ({ op: "ifCaughtCount", atLeast, then, else: els });
const caught = (species: SpeciesId[], then: ScriptCmd[], els: ScriptCmd[] = []): ScriptCmd =>
  ({ op: "ifCaught", species, then, else: els });
const partyHas = (species: SpeciesId[], then: ScriptCmd[], els: ScriptCmd[] = []): ScriptCmd =>
  ({ op: "ifPartyHas", species, then, else: els });
const hasItem = (item: string, then: ScriptCmd[], els: ScriptCmd[] = []): ScriptCmd =>
  ({ op: "ifHasItem", item, then, else: els });
const night = (then: ScriptCmd[], els: ScriptCmd[]): ScriptCmd => ({ op: "ifTime", time: ["night"], then, else: els });
/** giveMoney is silent, so the script announces it. */
const pay = (amount: number): ScriptCmd[] => [
  { op: "giveMoney", amount },
  { op: "jingle", id: "item_get" },
  say(`<PLAYER> received $${amount}!`),
];

const SUNFLOWERS: SpeciesId[] = ["sunflower_seedling", "sunflower_bud", "sunflower"];
const MOONFLOWERS: SpeciesId[] = ["moonflower_seed", "moonflower_vine", "moonflower"];

// --- SEED LIBRARY: WILLA, FALLOWFIELD ------------------------------------------
// Fact: old seeds can wait for centuries (a date palm grew from a ~2,000-year-old
// seed). Clover fixes nitrogen from the air. Mystery: since the bloom, every
// packet on her shelves has shuffled to the north side.

const seedLibraryReward: ScriptCmd[] = [
  say("Six kinds! Let me copy them out. ...Lovely. Not a smudge."),
  say("Here. My great-aunt's seed jars, thick glass with tight lids."),
  give("glass_pod", 3),
  say("A QUICKENED likes a pod it can see out of."),
  completeQuest("seed_library"),
  say("Seeds can wait. A date palm once grew from a seed 2,000 years old."),
  say("Seeds that patient don't fidget for nothing. Mine are listening."),
];

const seedLibrary: ScriptCmd[] = [
  byQuest("seed_library", {
    fresh: [
      ifFlags({ got_starter: true }, [
        say("VALE's new botanist? I'm WILLA. I keep the SEED LIBRARY."),
        say("Borrow a packet, grow it, bring back more seed."),
        say("But since the bloom, every packet has crept to the north side."),
        say("Seeds don't creep. Something's woken, and I want it written down."),
        say("Press six kinds of QUICKENED in your HERBARIUM. Then come and show me."),
        startQuest("seed_library"),
        caughtCount(6, [wait(20), emote("player", "!"), ...seedLibraryReward]),
      ], [
        say("Seeds to borrow, seeds to bring back. That's a SEED LIBRARY."),
        say("Grow a packet, save the best seed, and return it. Easy as that."),
      ]),
    ],
    going: [
      caughtCount(6, seedLibraryReward, [
        say("Six kinds pressed, then come and see me. Each one's a page I lack."),
        say("There's CLOVER in every field round here. That's one to start you."),
      ]),
    ],
    finished: [
      say("Sow CLOVER before cabbages. It feeds the soil from thin air."),
      say("The packets still lean north. I've stopped turning them round."),
    ],
  }),
];

// --- MOSS IS MISSING: OLIVE, HEDGEROW (the cat MOSS hides on ROUTE 2) -----------
// Fact: catmint is a mint, and about two cats in three react to it.
// (No fur colour in the text: the shared cat sprite may be recoloured.)
// Mystery: since the bloom, MOSS sits with an ear to the ground. She hears the hum.

const lostCat: ScriptCmd[] = [
  byQuest("lost_cat", {
    fresh: [
      say("Have you seen my cat? Small, bold, white socks. Her name's MOSS."),
      say("Nine years, and she's never gone past the gate. Not once."),
      say("Since the bloom, she sits by the hedge all night, ear to the ground."),
      say("Like she's listening to something under the lane."),
      say("Last night she slipped off to ROUTE 2, and she's not come home."),
      say("I'm OLIVE, by the way. If you see her, would you send her home?"),
      startQuest("lost_cat"),
    ],
    going: [
      ifFlags({ moss_found: true }, [
        say("MOSS came in the back door just now, muddy to the knees!"),
        say("You found her? Oh, thank you. Here. SPRING WATER, from our well."),
        give("spring_water", 2),
        completeQuest("lost_cat"),
        say("Where was she? ...Listening to the ground. Again."),
        wait(20),
        say("Then it's not just MOSS who hears it, is it?"),
      ], [
        say("No MOSS yet? She loves long grass, and she can't pass wild MINT."),
        say("Catmint's a mint, you know. Two cats in three go silly for it."),
      ]),
    ],
    finished: [
      say("MOSS sleeps on the step now, in the sun."),
      say("The hedge can do its own listening."),
    ],
  }),
];

const lostCatMoss: ScriptCmd[] = [
  byQuest("lost_cat", {
    fresh: [say("A cat watches you from the grass. She isn't ready to be found.")],
    going: [
      ifFlags({ moss_found: true }, [
        say("MOSS washes a white sock. She's waiting for you to tell OLIVE."),
      ], [
        say("A small cat crouches in the wild MINT by the pond, very still."),
        say("It's MOSS. One ear is pressed flat to the earth."),
        emote("player", "..."),
        say("You kneel beside her. Far below, faint as breath, something hums."),
        { op: "shake", frames: 20 },
        say("MOSS looks up, then bumps her head against your hand. Purr."),
        flag("moss_found"),
        { op: "fade", to: "black" },
        wait(30),
        { op: "fade", to: "clear" },
        say("MOSS has trotted off toward HEDGEROW, tail held high."),
      ]),
    ],
    finished: [
      say("MOSS stretches on the warm step and purrs like a kettle."),
    ],
  }),
];

// --- A SUNNY ORDER: MARIGOLD, BRAMBLEGATE --------------------------------------
// Fact: a sunflower's seeds sit in spirals, often 34 one way and 55 the other.
// Wild roses have five petals. Mystery: cut flowers turning toward the hills.

const floristReward: ScriptCmd[] = [
  emote("player", "!"),
  say("Your SUNFLOWER turns its head. Not to the hills. To the sun."),
  say("Oh! It still loves the sun. So it isn't the flowers that changed."),
  say("It's something up in the hills, calling them."),
  say("I'll send them facing north. FLORA can call it a new look."),
  say("Your fee, and a RAIN JAR. Rainwater's soft. Plants love it."),
  give("rain_jar"),
  ...pay(1000),
  completeQuest("florists_order"),
  say("Count the spirals in a SUNFLOWER's face. Often 34 one way, 55 the other!"),
];

const floristsOrder: ScriptCmd[] = [
  byQuest("florists_order", {
    fresh: [
      say("Fresh flowers! Well, fresh-ish. They keep wandering off."),
      say("I'm MARIGOLD. And I've an order from FLORA VANCE in GLASSHOUSE CITY!"),
      say("Twelve sunflowers. Only mine have gone strange since the bloom."),
      say("Cut flowers don't turn. Mine do. Every one, to the hills."),
      say("I can't send FLORA VANCE a bouquet that's looking the other way!"),
      say("Can you show me a live SUNFLOWER? I need to see where it looks."),
      startQuest("florists_order"),
      partyHas(SUNFLOWERS, [wait(20), ...floristReward]),
    ],
    going: [
      partyHas(SUNFLOWERS, floristReward, [
        say("Any SUNFLOWER will do, seedling or full bloom. Bring it in your party."),
        say("They grow wild on ROUTE 1 and ROUTE 2. Sun-lovers, obviously."),
      ]),
    ],
    finished: [
      say("FLORA adored the north-facing look. Now everyone wants one!"),
      say("Buttonhole? WILD ROSE off the town wall. Five petals. Always five."),
    ],
  }),
];

// --- MOONWATCH: ORRIN, ROUTE 3 (the night meadow) ------------------------------
// Fact: a moonflower opens fast enough to watch, in about a minute, for hawkmoths.
// Mystery: his great-grandmother's star log, the night of the last bloom.

const moonwatchReward: ScriptCmd[] = [
  say("You've got one! Look, its petals turn to the far slope."),
  say("Just as she wrote. Here's her entry, word for word."),
  wait(30),
  say("\"Night of the long bloom. No moon, yet the meadow is white as noon.\""),
  say("\"Every MOONFLOWER has turned to the far slope at once.\""),
  say("\"The ground hums under my blanket. I shall not sleep tonight.\""),
  say("\"Nor, I think, will the meadow.\""),
  wait(30),
  say("Take these. She'd want the MOONFLOWERS to go with someone kind."),
  give("glass_pod", 2),
  completeQuest("moonwatch"),
  say("She never kept the log again after that night. Never said why."),
];

const moonwatch: ScriptCmd[] = [
  night([
    byQuest("moonwatch", {
      fresh: [
        say("Shh. Look down, not up. The MOONFLOWERS are opening."),
        say("They unfurl so fast you can watch it. A minute, start to finish."),
        say("I'm ORRIN. My grandmother kept a star log in this meadow."),
        say("She was here the night of the last CENTURYHEART bloom."),
        say("Her entry is all about MOONFLOWERS. I want to see if it's still true."),
        say("But they shut tight whenever I come near. They might choose you."),
        say("Catch one, and I'll read you the entry. Fair trade?"),
        startQuest("moonwatch"),
        caught(MOONFLOWERS, [wait(20), ...moonwatchReward]),
      ],
      going: [
        caught(MOONFLOWERS, moonwatchReward, [
          say("Any MOONFLOWER will do. They only come out after dark."),
          say("Tire one gently, then a POD. And be patient with it."),
        ]),
      ],
      finished: [
        say("Hawkmoths, see? Tongues as long as their bodies, all for MOONFLOWERS."),
        say("I've started a log of my own. Page one is you."),
      ],
    }),
  ], [
    ifFlags({ [done("moonwatch")]: true }, [
      say("Daytime's for sleeping in the grass. The stars keep late hours."),
    ], [
      say("Come back after dark. By day, this meadow's only half a place."),
    ]),
  ]),
];

// --- THE SAP RUN: the SYRUP MAKER, SUGARBUSH -> the BAKER, HEDGEROW ------------
// Facts: 40 buckets of sap make one of syrup; sap runs when frosty nights follow
// thawing days; a maple stores sugar over winter as starch. Mystery: the first
// boil after the taps comes out gold, like the pollen in SHEARS's drums.

const sapRun: ScriptCmd[] = [
  ifFlags({ grove_cleared: true }, [
    byQuest("sap_run", {
      fresh: [
        say("The sap's running! Forty buckets boil down to one of syrup."),
        say("The first jar of the year goes to HEDGEROW's BAKER. Always has."),
        say("Only I can't leave the boil. Would you run it down for me?"),
        { op: "yesno", prompt: "Carry the SYRUP JAR?", yes: [
          give("syrup_jar"),
          startQuest("sap_run"),
          say("Look at the colour. I've never boiled a jar so gold."),
          say("Like there's a bit of the bloom in it."),
        ], no: [
          say("No rush. Syrup keeps. Good things do."),
        ] },
      ],
      going: [
        say("The BAKER's in HEDGEROW. Don't let it tip. It's the first run!"),
        say("Sap runs best when frosty nights follow thawing days."),
      ],
      finished: [
        say("The BAKER sent word: best maple buns in forty years!"),
        say("Sweet work, and slow. Like everything worth doing."),
      ],
    }),
  ], [{ op: "call", script: "sb_syrupmaker" }]), // the map's own pre-grove lines
];

const sapRunBaker: ScriptCmd[] = [
  byQuest("sap_run", {
    fresh: [
      ifFlags({ grove_cleared: true }, [
        say("Word is the sap's running in SUGARBUSH again. About time!"),
        say("They always send me the first jar. My maple buns depend on it."),
      ], [
        say("No syrup from SUGARBUSH all spring."),
        say("My maple buns are just buns."),
        say("I'm making do with MINT from the garden. It spreads like gossip."),
      ]),
    ],
    going: [
      hasItem("syrup_jar", [
        say("Is that the first jar from SUGARBUSH? At last!"),
        { op: "takeItem", item: "syrup_jar" },
        say("Look at the gold in it. It smells like a summer night."),
        say("For your trouble. And berries off my hedge, for the road."),
        ...pay(1500),
        give("wild_berry", 5),
        completeQuest("sap_run"),
        say("A maple banks its sugar all winter as starch. Spring turns it sweet."),
      ], [
        say("SUGARBUSH is sending syrup? I'll warm the oven."),
      ]),
    ],
    finished: [
      say("Maple buns, fresh! The dough rose toward the window this morning."),
      say("I've stopped asking why. They taste wonderful."),
    ],
  }),
];

// --- THE SURVEY: the ARCHIVIST, HERBARIUM --------------------------------------
// Fact: only a bumblebee is heavy enough to open a snapdragon; dry snapdragon
// pods look like tiny skulls. Mystery: a seed from the last survey, a hundred
// years in a shut drawer, sprouted the night of the bloom.

const surveyReward: ScriptCmd[] = [
  say("Fifteen! Neat sheets, too. A. FENNIMORE would approve."),
  say("Drawer nine is yours. Mind its jaws. It has opinions."),
  { op: "giveSpecies", species: "snapdragon_sprout", level: 10 },
  completeQuest("herbarium_survey"),
  say("Squeeze a SNAPDRAGON flower and it gapes like a mouth."),
  say("Only a bumblebee is heavy enough to pry it open."),
  say("A century in a drawer. It knew what it was waiting for."),
];

const survey: ScriptCmd[] = [
  byQuest("herbarium_survey", {
    fresh: [
      ifFlags({ got_pods: true }, [
        say("A word, botanist. VALE had me dig out the last full survey."),
        say("It was done a hundred years ago. Just after the last long bloom."),
        say("One sheet in drawer nine has no plant. Just a seed, glued on."),
        say("\"SNAPDRAGON. Collected by A. FENNIMORE.\""),
        say("That's old FENNIMORE's grandfather."),
        say("The night of the bloom, it sprouted. In a shut drawer."),
        emote("player", "!"),
        say("It needs a proper botanist. Press fifteen kinds, and it's yours."),
        startQuest("herbarium_survey"),
        caughtCount(15, [wait(20), ...surveyReward]),
      ], [{ op: "call", script: "herb_archivist" }]), // the map's own flavour lines

    ],
    going: [
      caughtCount(15, surveyReward, [
        say("Fifteen kinds pressed, and drawer nine is yours."),
        say("Flat, dry, then labelled. The sprout can wait. It's good at it."),
      ]),
    ],
    finished: [
      say("Drawer nine's empty. First time in a hundred years."),
      say("Dry SNAPDRAGON pods look like tiny skulls. Don't tell NELL!"),
    ],
  }),
];

// --- LISTENING POSTS: WREN, the ROOT RELAY -------------------------------------
// Fact: fungal threads join plant roots and trade water and minerals for sugar.
// Subtext for Act 2 (never said): WREN is mapping the network's hubs.

const SENSORS = [1, 2, 3] as const;
const sensorRead = (n: number) => `sensor_${n}_read`;
const allSensors = Object.fromEntries(SENSORS.map((n) => [sensorRead(n), true]));

const relaySensorsReward: ScriptCmd[] = [
  say("All three posts! Look at those traces. Clean as birdsong.", "WREN"),
  say("Thanks, <PLAYER>. Really. You've saved me weeks of walking.", "WREN"),
  ...pay(2000),
  say("And these. GLASS PODS. We use them for soil cores.", "WREN"),
  give("glass_pod", 3),
  completeQuest("relay_sensors"),
  say("Funny. Every post sits where the threads all bunch up.", "WREN"),
  say("The roots love a crossroads. I'd love to know why.", "WREN"),
];

const relaySensors: ScriptCmd[] = [
  ifFlags({ relay_listened: true }, [
    byQuest("relay_sensors", {
      fresh: [
        say("That pulse! I haven't slept. I don't think I want to.", "WREN"),
        say("Three of our listening posts went quiet right after it.", "WREN"),
        say("One on ROUTE 4 by the river. One in the city square.", "WREN"),
        say("And one in the PALM HOUSE, in all that steam.", "WREN"),
        say("Could you check them? Face a post and press A. It reads itself.", "WREN"),
        say("I'd go, but DR. ODELL has me rewriting the logs. Again.", "WREN"),
        startQuest("relay_sensors"),
      ],
      going: [
        ifFlags(allSensors, relaySensorsReward, [
          say("ROUTE 4's river, the city square and the PALM HOUSE.", "WREN"),
          say("Read all three posts, then come back. I'll put the kettle on.", "WREN"),
        ]),
      ],
      finished: [
        say("Listening's the easy part.", "WREN"),
        say("Knowing what to SAY back... that's the trick.", "WREN"),
      ],
    }),
  ], [
    say("Hi! You're just in time. The open day's in the listening room.", "WREN"),
  ]),
];

/** A ROOT RELAY sensor post: reads once while the quest is running. */
const sensorPost = (n: 1 | 2 | 3, place: string): ScriptCmd[] => [
  ifFlags({ [sensorRead(n)]: true }, [
    say(`SENSOR ${n}'s light blinks green. Reading sent.`),
  ], [
    ifFlags({ [started("relay_sensors")]: true }, [
      say(`A brass post, humming faintly. ROOT RELAY SENSOR ${n}.`),
      say("You press READ. Click... whirr... ding!"),
      { op: "sfx", id: "select" },
      say(place),
      flag(sensorRead(n)),
      say("The light turns green. The reading's on its way to WREN."),
    ], [
      say(`A brass post with a little window. ROOT RELAY SENSOR ${n}.`),
      say("\"PLEASE DO NOT DIG. WE ARE LISTENING.\""),
    ]),
  ]),
];

// --- THE FIRST SEED: LUPIN, the NURSERY GARDEN yard ----------------------------
// Fact: lupins fix nitrogen from the air, so they leave poor soil richer.
// The yard keeper also hints when a seed is ready (ifNurserySeed).

const seedHint = (els: ScriptCmd[]): ScriptCmd => ({ op: "ifNurserySeed", then: [
  emote("player", "!"),
  say("Psst! Your two have set a SEED! Ask PEONY at the counter.", "LUPIN"),
], else: els });

const firstSeedReward: ScriptCmd[] = [
  say("It sprouted? Best news in the whole garden!", "LUPIN"),
  say("Here. A RAIN JAR, and PLANT FOOD for the little one.", "LUPIN"),
  give("rain_jar"),
  give("plant_food", 5),
  completeQuest("first_seed"),
  say("Forty years, and a sprout still makes me grin.", "LUPIN"),
];

const firstSeed: ScriptCmd[] = [
  byQuest("first_seed", {
    fresh: [
      say("I'm LUPIN. PEONY's the brains. I'm the knees.", "LUPIN"),
      say("Ever grown a QUICKENED from seed? There's nothing like it.", "LUPIN"),
      say("Board two at the counter. Same bees? They may set seed.", "LUPIN"),
      say("Carry the seed with you. All that walking keeps it warm.", "LUPIN"),
      say("Come and tell me when one sprouts. I want to hear it all.", "LUPIN"),
      startQuest("first_seed"),
      ifFlags({ sprouted_any: true }, [wait(20), emote("player", "!"), ...firstSeedReward], [seedHint([])]),
    ],
    going: [
      ifFlags({ sprouted_any: true }, firstSeedReward, [
        seedHint([
          say("Two of the same kind give the best odds. Same bees, fair odds.", "LUPIN"),
          say("Lupins feed the soil. They pull nitrogen from the air.", "LUPIN"),
        ]),
      ]),
    ],
    finished: [
      seedHint([
        say("A seed's a packed lunch with a plant asleep inside.", "LUPIN"),
      ]),
    ],
  }),
];

// --- FAN MAIL: a gentleman fan, GLASSHOUSE CITY -> FLORA VANCE ------------------
// Take the letter after the RELAY, then talk to FLORA again after her battle.
// She rewards the courier before leaving the CONSERVATORY triggers the end card.

// Kept for saves where FLORA already read the letter before this flow changed.
const fanMailReward: ScriptCmd[] = [
  say("She READ it? All of it? Oh my. Oh my word.", "FAN"),
  say("Front row. FRONT ROW. I shall need to sit down.", "FAN"),
  say("You must take something. Please. I insist.", "FAN"),
  ...pay(1000),
  completeQuest("fan_mail"),
  say("Keep the photo, too. I have two hundred of my own.", "FAN"),
];

const fanMail: ScriptCmd[] = [
  byQuest("fan_mail", {
    fresh: [
      ifFlags({ relay_listened: true }, [
        say("You MET FLORA VANCE? Oh! She'll remember your face!", "FAN"),
        say("I've written her two hundred letters. I've never posted one.", "FAN"),
        say("What if she READ it? I'd simply wilt.", "FAN"),
        { op: "yesno", prompt: "Take his letter to FLORA?", yes: [
          give("fan_letter"),
          startQuest("fan_mail"),
          say("Letter two hundred and one. The best one. It rhymes in places.", "FAN"),
          say("Give it to her after your battle! Oh, my heart!", "FAN"),
        ], no: [
          say("Quite right. Perhaps next year. Or the year after.", "FAN"),
        ] },
      ], [
        say("FLORA VANCE! Have you SEEN her roses? Forty petals apiece!", "FAN"),
        say("I've written her two hundred letters. I've never posted one.", "FAN"),
        say("She'd never read a letter from a stranger.", "FAN"),
      ]),
    ],
    going: [
      ifFlags({ fan_letter_delivered: true }, fanMailReward, [
        say("Have you given it to her? Don't tell me if she laughed.", "FAN"),
      ]),
    ],
    finished: [
      say("She READ it? All of it? Oh my. Oh my word.", "FAN"),
      say("Front row. FRONT ROW. I shall need to sit down.", "FAN"),
      say("I'm having my good hat cleaned. For the front row.", "FAN"),
    ],
  }),
];

/** FLORA reads the letter (called from her own script, after her battle). */
const fanMailFlora: ScriptCmd[] = [
  say("A letter? For ME? Darling! HE shouldn't have.", "FLORA"),
  { op: "takeItem", item: "fan_letter" },
  say("FLORA reads it once. Then again. Her lip wobbles."),
  say("\"Your roses are the reason I get up in the morning.\"", "FLORA"),
  say("Two hundred and one letters, and he never sent ONE?", "FLORA"),
  say("Tell him: front row. My next show. I'll save the seat myself.", "FLORA"),
  say("And this is for the courier. Signed, naturally.", "FLORA"),
  give("signed_photo"),
  flag("fan_letter_delivered"),
  say("And a courier's fee! Applause doesn't pay the bills, darling.", "FLORA"),
  ...pay(1000),
  completeQuest("fan_mail"),
  say("Now go on. Give him my love. And a tissue.", "FLORA"),
];

// --- FIRE FOLLOWERS: the ranger, CEDARHALLOW -----------------------------------
// Any caught stage counts, including records made before accepting the quest.
const FIREWEEDS: SpeciesId[] = ["fireweed_fluff", "fireweed_shoot", "fireweed"];
const LODGEPOLES: SpeciesId[] = ["lodgepole_cone", "lodgepole_seedling", "lodgepole_pine"];
const fireFollowersCheck: ScriptCmd[] = [
  caught(FIREWEEDS, [flag("fire_followers_fireweed")]),
  caught(LODGEPOLES, [flag("fire_followers_lodgepole")]),
  ifFlags({ fire_followers_fireweed: true, fire_followers_lodgepole: true }, [
    say("TODO(text): Both fire-following plant lines are recorded.", "RANGER"),
    say("TODO(text): The ranger gives pods and Ember Ash.", "RANGER"),
    give("glass_pod", 3),
    give("ember_ash"),
    completeQuest("fire_followers"),
    say("TODO(text): Fireweed returns first; heat opens sealed pine cones.", "RANGER"),
  ], [
    ifFlags({ fire_followers_fireweed: false }, [
      say("TODO(text): Catch any stage of the fireweed line.", "RANGER"),
    ]),
    ifFlags({ fire_followers_lodgepole: false }, [
      say("TODO(text): Catch any stage of the lodgepole line.", "RANGER"),
    ]),
  ]),
];
const fireFollowers: ScriptCmd[] = [
  byQuest("fire_followers", {
    fresh: [
      say("TODO(text): The ranger records plants returning after a fire.", "RANGER"),
      say("TODO(text): Fireweed and lodgepole each recover differently.", "RANGER"),
      say("TODO(text): Catch one from each line for the forest record.", "RANGER"),
      say("TODO(text): Any growth stage counts; return for the reward.", "RANGER"),
      startQuest("fire_followers"),
      ...fireFollowersCheck,
    ],
    going: fireFollowersCheck,
    finished: [
      say("TODO(text): The record shows life returning to the ash.", "RANGER"),
      say("TODO(text): Ember Ash can open a sealed lodgepole cone.", "RANGER"),
    ],
  }),
];

// --- SHRINE OFFERINGS: the keeper, THE HOLLOW ---------------------------------
// The offering is a visit to each shrine; §F specifies no item consumption.
const shrineOfferingsCheck: ScriptCmd[] = [
  ifFlags({ shrine_1_offered: true, shrine_2_offered: true, shrine_3_offered: true }, [
    say("TODO(text): The keeper thanks the player for all three visits.", "KEEPER"),
    say("TODO(text): The keeper gives rain jars and a travel fund.", "KEEPER"),
    give("rain_jar", 2),
    { op: "giveMoney", amount: 1500 },
    { op: "jingle", id: "item_get" },
    say("TODO(text): The player receives fifteen hundred dollars.", "NARRATOR"),
    completeQuest("shrine_offerings"),
    say("TODO(text): The cedar's old rooms remember gentle visitors.", "KEEPER"),
  ], [
    say("TODO(text): Visit the three side-shrines using GLOW.", "KEEPER"),
    say("TODO(text): Return to the keeper after visiting them all.", "KEEPER"),
  ]),
];
const shrineOfferings: ScriptCmd[] = [
  ifFlags({ got_lantern: true }, [
    byQuest("shrine_offerings", {
      fresh: [
        say("TODO(text): Three shrines wait in the cedar's dark rooms.", "KEEPER"),
        say("TODO(text): Carry the lantern to each and pay respects.", "KEEPER"),
        say("TODO(text): The keeper offers a reward for all three visits.", "KEEPER"),
        startQuest("shrine_offerings"),
        ...shrineOfferingsCheck,
      ],
      going: shrineOfferingsCheck,
      finished: [
        say("TODO(text): The keeper thanks the player for tending the shrines.", "KEEPER"),
        say("TODO(text): The lantern still lights the old forest roads.", "KEEPER"),
      ],
    }),
  ], [
    say("TODO(text): A light is needed before tending the shrines.", "KEEPER"),
  ]),
];
const shrineOffering = (n: number): ScriptCmd[] => [
  ifFlags({ got_lantern: true, quest_shrine_offerings_started: true }, [
    ifFlags({ [`shrine_${n}_offered`]: false }, [
      say(`TODO(text): The lantern lights shrine ${n}'s old carving.`, "NARRATOR"),
      wait(20),
      say(`TODO(text): The player pays respects at shrine ${n}.`, "NARRATOR"),
      { op: "sfx", id: "pulse" },
      flag(`shrine_${n}_offered`),
      say("TODO(text): A quiet pulse answers through the roots.", "NARRATOR"),
    ], [
      say("TODO(text): This shrine has already been tended.", "NARRATOR"),
    ]),
  ], [
    say("TODO(text): Ask the keeper about the dark side-shrines.", "NARRATOR"),
  ]),
];

// --- SEAGRASS SURVEY: Reyes's assistant, ROUTE 8 -------------------------------
const seagrassSurveyCheck: ScriptCmd[] = [
  caught(["seagrass_shoot", "eelgrass"], [flag("seagrass_survey_seagrass")]),
  caught(["mangrove_propagule", "mangrove_sapling", "red_mangrove"], [flag("seagrass_survey_mangrove")]),
  ifFlags({ seagrass_survey_seagrass: true, seagrass_survey_mangrove: true }, [
    say("TODO(text): Both coastal plant lines are recorded.", "ASSISTANT"),
    say("TODO(text): The assistant gives pods and a rain jar.", "ASSISTANT"),
    give("glass_pod", 3),
    give("rain_jar"),
    completeQuest("seagrass_survey"),
    say("TODO(text): The survey helps Reyes care for the coast.", "ASSISTANT"),
  ], [
    ifFlags({ seagrass_survey_seagrass: false }, [
      say("TODO(text): Catch any stage of the seagrass line.", "ASSISTANT"),
    ]),
    ifFlags({ seagrass_survey_mangrove: false }, [
      say("TODO(text): Catch any stage of the mangrove line.", "ASSISTANT"),
    ]),
  ]),
];
const seagrassSurvey: ScriptCmd[] = [
  byQuest("seagrass_survey", {
    fresh: [
      say("TODO(text): Reyes's assistant surveys the sea's flowering plants.", "ASSISTANT"),
      say("TODO(text): Seagrass pollen drifts through the water.", "ASSISTANT"),
      say("TODO(text): Record a seagrass and a mangrove for the survey.", "ASSISTANT"),
      say("TODO(text): Any stage counts; return here for a reward.", "ASSISTANT"),
      startQuest("seagrass_survey"),
      ...seagrassSurveyCheck,
    ],
    going: seagrassSurveyCheck,
    finished: [
      say("TODO(text): The assistant thanks the player for the coastal record.", "ASSISTANT"),
      say("TODO(text): Both sea and shore hold flowering plants.", "ASSISTANT"),
    ],
  }),
];

// Lead's decision: no "seen a vanilla vine" gate (the engine has no such check, and the
// trade's own party filter already requires a vine). The trader simply asks for one.
export const handPollinatorOffer: ScriptCmd[] = [
  byQuest("hand_pollinator", {
    fresh: [
      say("TODO(text): The trader asks whether the player has found a vanilla vine.", "TRADER"),
      say("TODO(text): Vanilla flowers can need pollination by hand.", "TRADER"),
      say("TODO(text): Edmond Albius worked out the method on Reunion.", "TRADER"),
      say("TODO(text): Trade a vanilla vine for the trader's POLLY.", "TRADER"),
      startQuest("hand_pollinator"),
    ],
    going: [
      say("TODO(text): Bring a vanilla vine in the party to trade.", "TRADER"),
    ],
    finished: [
      say("TODO(text): The trader hopes POLLY is thriving.", "TRADER"),
      say("TODO(text): Careful pollination helps vanilla grow.", "TRADER"),
    ],
  }),
  ifFlags({ quest_hand_pollinator_done: false }, [
    { op: "trade", wants: ["vanilla_vine"], gives: { species: "vanilla_vine", level: 30, nickname: "POLLY" },
      then: [
        say("TODO(text): POLLY grows into a vanilla orchid at once.", "TRADER"),
        completeQuest("hand_pollinator"),
        say("TODO(text): The trader thanks the player for the exchange.", "TRADER"),
      ],
      else: [
        say("TODO(text): The trader will wait until the player is ready.", "TRADER"),
      ],
    },
  ]),
];

// --- LOST CLIMBER: MOUNTAINEER, ROUTE 9 ---------------------------------------
// Finding the hidden pack can precede the offer; only its return consumes it.
const lostClimberCheck: ScriptCmd[] = [
  hasItem("climber_pack", [
    say("TODO(text): The mountaineer recognises her missing pack.", "MOUNTAINEER"),
    { op: "takeItem", item: "climber_pack" },
    say("TODO(text): She thanks the player with rain jars and a Cold Snap.", "MOUNTAINEER"),
    give("rain_jar", 2),
    give("cold_snap"),
    completeQuest("lost_climber"),
    say("TODO(text): The mountaineer can safely continue her climb.", "MOUNTAINEER"),
  ], [
    say("TODO(text): Search the snow higher up Route 9 for the lost pack.", "MOUNTAINEER"),
    say("TODO(text): Bring the pack back to the mountaineer here.", "MOUNTAINEER"),
  ]),
];
const lostClimber: ScriptCmd[] = [
  byQuest("lost_climber", {
    fresh: [
      say("TODO(text): The mountaineer lost her pack on the snowy slope.", "MOUNTAINEER"),
      say("TODO(text): Her supplies are buried somewhere farther up Route 9.", "MOUNTAINEER"),
      say("TODO(text): She asks the player to find and return the pack.", "MOUNTAINEER"),
      startQuest("lost_climber"),
      ...lostClimberCheck,
    ],
    going: lostClimberCheck,
    finished: [
      say("TODO(text): The mountaineer thanks the player for finding her supplies.", "MOUNTAINEER"),
      say("TODO(text): She will fasten the pack securely on her next climb.", "MOUNTAINEER"),
    ],
  }),
];

// --- WINDOW PANES: BOTANIST, THISTLEDOWN --------------------------------------
const windowPanesCheck: ScriptCmd[] = [
  caught(["lithops_pebble", "lithops_pair", "lithops_bloom"], [flag("window_panes_lithops")]),
  caught(["lithops_bloom"], [flag("window_panes_bloom")]),
  ifFlags({ window_panes_lithops: true, window_panes_bloom: true }, [
    say("TODO(text): The botanist copies the living stones' records.", "BOTANIST"),
    say("TODO(text): The botanist gives two rain jars and five glass pods.", "BOTANIST"),
    give("rain_jar", 2),
    give("glass_pod", 5),
    completeQuest("window_panes"),
    say("TODO(text): The botanist thanks the player for the survey.", "BOTANIST"),
  ], [
    ifFlags({ window_panes_lithops: false }, [
      say("TODO(text): Catch any stage of the living stone line.", "BOTANIST"),
    ]),
    ifFlags({ window_panes_bloom: false }, [
      say("TODO(text): Record a flowering Living Stone, LITHOPS BLOOM.", "BOTANIST"),
    ]),
  ]),
];
const windowPanes: ScriptCmd[] = [
  byQuest("window_panes", {
    fresh: [
      say("TODO(text): The botanist studies three stages of living stones.", "BOTANIST"),
      say("TODO(text): Record any living stone and a LITHOPS BLOOM.", "BOTANIST"),
      say("TODO(text): Return with the records for rain jars and glass pods.", "BOTANIST"),
      startQuest("window_panes"),
      ...windowPanesCheck,
    ],
    going: windowPanesCheck,
    finished: [
      say("TODO(text): The botanist thanks the player for the living stone records.", "BOTANIST"),
    ],
  }),
];

export const questScripts: Scripts = {
  q_window_panes: windowPanes,
  q_lost_climber: lostClimber,
  q_hand_pollinator: handPollinatorOffer,
  q_fire_followers: fireFollowers,
  q_shrine_offerings: shrineOfferings,
  q_shrine_offerings_shrine_1: shrineOffering(1),
  q_shrine_offerings_shrine_2: shrineOffering(2),
  q_shrine_offerings_shrine_3: shrineOffering(3),
  q_seed_library: seedLibrary,
  q_lost_cat: lostCat,
  q_lost_cat_moss: lostCatMoss,
  q_florists_order: floristsOrder,
  q_moonwatch: moonwatch,
  q_sap_run: sapRun,
  q_sap_run_baker: sapRunBaker,
  q_herbarium_survey: survey,
  q_relay_sensors: relaySensors,
  q_relay_sensors_post_1: sensorPost(1, "The needle twitches as the river spills over the stones."),
  q_relay_sensors_post_2: sensorPost(2, "The needle jumps at every footstep. And a little after."),
  q_relay_sensors_post_3: sensorPost(3, "The window's fogged with steam. The needle pulses, slow and even."),
  q_first_seed: firstSeed,
  q_fan_mail: fanMail,
  q_fan_mail_flora: fanMailFlora,
  q_seagrass_survey: seagrassSurvey,
};

const isStarted = (q: string) => [{ flag: started(q), is: true }];
const isDone = (q: string) => [{ flag: done(q), is: true }];

export const QUESTS: Record<string, QuestDef> = {
  window_panes: {
    id: "window_panes", title: "WINDOW PANES", giver: "BOTANIST, THISTLEDOWN", area: "thistledown_house",
    steps: [
      { text: "Catch any LITHOPS stage.", doneWhen: [{ flag: "window_panes_lithops", is: true }] },
      { text: "Catch a LITHOPS BLOOM.", doneWhen: [{ flag: "window_panes_bloom", is: true }] },
    ],
    reward: "2 RAIN JARS + 5 GLASS PODS",
  },
  lost_climber: {
    id: "lost_climber", title: "LOST CLIMBER", giver: "MOUNTAINEER, ROUTE 9", area: "route_9",
    steps: [
      { text: "Find the lost CLIMBER PACK.", doneWhen: [{ flag: "hidden_route_9_8_8", is: true }] },
      { text: "Return it to the MOUNTAINEER.", doneWhen: isDone("lost_climber") },
    ],
    reward: "2 RAIN JARS + COLD SNAP",
  },
  seagrass_survey: {
    id: "seagrass_survey", title: "SEAGRASS SURVEY", giver: "REYES'S ASSISTANT, ROUTE 8", area: "route_8",
    steps: [
      { text: "Catch a SEAGRASS.", doneWhen: [{ flag: "seagrass_survey_seagrass", is: true }] },
      { text: "Catch a MANGROVE.", doneWhen: [{ flag: "seagrass_survey_mangrove", is: true }] },
    ],
    reward: "3 GLASS PODS + RAIN JAR",
  },
  hand_pollinator: {
    id: "hand_pollinator", title: "HAND POLLINATOR", giver: "TRADER, SALTMARSH MARKET", area: "saltmarsh_market",
    steps: [{ text: "Trade a VANILLA VINE.", doneWhen: isDone("hand_pollinator") }],
    reward: "a VANILLA",
  },
  seed_library: {
    id: "seed_library", title: "SEED LIBRARY", giver: "WILLA, FALLOWFIELD", area: "fallowfield",
    steps: [
      { text: "Press 6 kinds of QUICKENED.", doneWhen: isDone("seed_library") },
      { text: "Show WILLA the HERBARIUM.", doneWhen: isDone("seed_library") },
    ],
    reward: "3 GLASS PODS",
  },
  lost_cat: {
    id: "lost_cat", title: "MOSS IS MISSING", giver: "OLIVE, HEDGEROW", area: "hedgerow",
    steps: [
      { text: "Find MOSS on ROUTE 2.", doneWhen: [{ flag: "moss_found", is: true }] },
      { text: "Tell OLIVE in HEDGEROW.", doneWhen: isDone("lost_cat") },
    ],
    reward: "2 SPRING WATER",
  },
  florists_order: {
    id: "florists_order", title: "A SUNNY ORDER", giver: "MARIGOLD, BRAMBLEGATE", area: "bramblegate",
    steps: [
      { text: "Show MARIGOLD a SUNFLOWER.", doneWhen: isDone("florists_order") },
    ],
    reward: "RAIN JAR + $1000",
  },
  moonwatch: {
    id: "moonwatch", title: "MOONWATCH", giver: "ORRIN, ROUTE 3", area: "route_3",
    steps: [
      { text: "Meet ORRIN after dark.", doneWhen: isStarted("moonwatch") },
      { text: "Catch a MOONFLOWER.", doneWhen: isDone("moonwatch") },
    ],
    reward: "2 GLASS PODS + a story",
  },
  sap_run: {
    id: "sap_run", title: "THE SAP RUN", giver: "SYRUP MAKER, SUGARBUSH", area: "sugarbush",
    steps: [
      { text: "Take the SYRUP JAR.", doneWhen: isStarted("sap_run") },
      { text: "Bring it to HEDGEROW's BAKER.", doneWhen: isDone("sap_run") },
    ],
    reward: "$1500 + 5 WILD BERRY",
  },
  herbarium_survey: {
    id: "herbarium_survey", title: "THE SURVEY", giver: "ARCHIVIST, HERBARIUM", area: "herbarium",
    steps: [
      { text: "Press 15 kinds of QUICKENED.", doneWhen: isDone("herbarium_survey") },
    ],
    reward: "A SNAP SPROUT (LV 10)",
  },
  relay_sensors: {
    id: "relay_sensors", title: "LISTENING POSTS", giver: "WREN, ROOT RELAY", area: "glasshouse_relay",
    steps: [
      { text: "Read ROUTE 4's post.", doneWhen: [{ flag: sensorRead(1), is: true }] },
      { text: "Read the square's post.", doneWhen: [{ flag: sensorRead(2), is: true }] },
      { text: "Read the PALM HOUSE post.", doneWhen: [{ flag: sensorRead(3), is: true }] },
      { text: "Report back to WREN.", doneWhen: isDone("relay_sensors") },
    ],
    reward: "$2000 + 3 GLASS PODS",
  },
  first_seed: {
    id: "first_seed", title: "THE FIRST SEED", giver: "LUPIN, NURSERY GARDEN", area: "glasshouse_nursery",
    steps: [
      { text: "Sprout a NURSERY seed.", doneWhen: [{ flag: "sprouted_any", is: true }] },
      { text: "Tell LUPIN in the yard.", doneWhen: isDone("first_seed") },
    ],
    reward: "RAIN JAR + 5 PLANT FOOD",
  },
  fan_mail: {
    id: "fan_mail", title: "FAN MAIL", giver: "A FAN, GLASSHOUSE CITY", area: "glasshouse_city",
    steps: [
      { text: "Give FLORA VANCE the letter.", doneWhen: isDone("fan_mail") },
    ],
    reward: "SIGNED PHOTO + $1000",
  },
  fire_followers: {
    id: "fire_followers", title: "FIRE FOLLOWERS", giver: "RANGER, CEDARHALLOW", area: "cedarhallow_house",
    steps: [
      { text: "Catch a FIREWEED.", doneWhen: [{ flag: "fire_followers_fireweed", is: true }] },
      { text: "Catch a LODGEPOLE.", doneWhen: [{ flag: "fire_followers_lodgepole", is: true }] },
    ],
    reward: "3 GLASS PODS + EMBER ASH",
  },
  shrine_offerings: {
    id: "shrine_offerings", title: "SHRINE OFFERINGS", giver: "SHRINE KEEPER, THE HOLLOW", area: "cedar_hollow",
    steps: [
      { text: "Visit the first shrine.", doneWhen: [{ flag: "shrine_1_offered", is: true }] },
      { text: "Visit the second shrine.", doneWhen: [{ flag: "shrine_2_offered", is: true }] },
      { text: "Visit the third shrine.", doneWhen: [{ flag: "shrine_3_offered", is: true }] },
    ],
    reward: "2 RAIN JARS + $1500",
  },
};
