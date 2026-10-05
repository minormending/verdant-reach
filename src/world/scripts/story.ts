// Prologue and Chapter 1: the bloom, the morning call, the starter, the
// errand to FENNIMORE, PIP's catching demo, the theft and rival battle 1, and
// DR. VALE's letter scene.

import type { ScriptCmd } from "../../contracts";
import {
  emote, face, flag, give, ifFlags, moveNpc, say, steps, wait, type Scripts,
} from "../build";
import { COUNTER, STARTER_LINES, STARTER_SPECIES, type StarterLine } from "../trainers";

const VALE = "VALE";
const BRAM = "BRAM";
const PIP = "PIP";
const FEN = "FENNIMORE";

/** Runs `then` for whichever starter line the player chose. */
const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

const POTS: Record<StarterLine, { look: string; fact: string; after: string }> = {
  oak: {
    look: "A sprouting acorn. One stubborn root has cracked right through its shell.",
    fact: "A single oak can feed hundreds of other species, from moths to jays.",
    after: "An acorn in a pot. It leans toward the window, waiting for someone else.",
  },
  chili: {
    look: "A chili seedling in flower. The air around it feels warm.",
    fact: "Birds can't taste chili heat, so they happily eat the fruit and spread the seeds.",
    after: "A chili seedling. It gives off a little warmth, but doesn't turn your way.",
  },
  lily: {
    look: "A spiny seedpod, bobbing in a dish of water. It bobs toward you.",
    fact: "Grown up, its giant pads can hold the weight of a small child!",
    after: "A water lily seedpod, bobbing in its dish. It's waiting for someone else.",
  },
};

function potScripts(): Scripts {
  const out: Scripts = {};
  for (const line of STARTER_LINES) {
    const species = STARTER_SPECIES[line][0];
    const pot = POTS[line];
    out[`pot_${line}`] = [
      ifFlags({ got_starter: true }, [say(pot.after)], [
        { op: "showSpecies", species },
        say(pot.look),
        say(pot.fact),
        { op: "yesno", prompt: "Choose this one?", yes: [
          { op: "hideSpecies" },
          { op: "call", script: `choose_${line}` },
        ], no: [
          { op: "hideSpecies" },
          say("The seedling settles back into its soil."),
        ] },
      ]),
    ];
    out[`choose_${line}`] = [
      flag(`got_starter_${line}`),
      { op: "hideNpc", npc: `pot_${line}` },
      say("<PLAYER> lifted the pot. The seedling leaned in close!"),
      { op: "giveSpecies", species, level: 5 },
      { op: "call", script: "vale_after_starter" },
    ];
  }
  return out;
}

export const storyScripts: Scripts = {
  // --- Prologue: the observation deck, night ---------------------------------
  prologue: [
    { op: "music", id: "prologue_bloom" },
    wait(40),
    say("There! On the far slope, <PLAYER>. Do you see it?", VALE),
    say("The CENTURYHEART. Its first bloom in a hundred years.", VALE),
    face("vale", "left"),
    say("It waits decades to flower, just once. Then it dies. Everything goes into this.", VALE),
    face("vale", "up"),
    wait(30),
    { op: "fade", to: "white" },
    wait(50),
    { op: "fade", to: "clear" },
    say("Gold pollen drifts down the valley on the night wind."),
    say("Oh... Will you look at that.", VALE),
    wait(40),
    { op: "shake", frames: 60 },
    emote("player", "!"),
    say("A low hum rises up through the floorboards. You feel it in your chest."),
    say("DR. VALE doesn't seem to notice."),
    face("vale", "toPlayer"),
    say("Well! Some first shift. Go home and sleep, <PLAYER>.", VALE),
    say("Come in early tomorrow. I want to check on the seedlings.", VALE),
    { op: "fade", to: "black" },
    wait(60),
    flag("prologue_done"),
    { op: "warp", to: "player_home", x: 2, y: 2, facing: "right" },
    wait(30),
    { op: "fade", to: "clear" },
  ],

  // --- Morning at home (player_home onEnter) ----------------------------------
  morning: [
    wait(20),
    say("Morning sun pours in. Gold dust glitters on the windowsill."),
    emote("june", "!"),
    moveNpc("june", ...steps("up", 2), ...steps("left", 4)),
    face("june", "left"),
    face("player", "right"),
    say("You're up! DR. VALE phoned at dawn.", "JUNE"),
    say("She said, and I quote: \"The greenhouse moved.\" Then she hung up.", "JUNE"),
    say("Better get over to the HERBARIUM. Big glass building, east side of town.", "JUNE"),
    flag("morning_done"),
    moveNpc("june", ...steps("right", 4), ...steps("down", 2)),
    face("june", "left"),
  ],

  // --- The Herbarium, morning ------------------------------------------------
  vale_greeting: [
    wait(10),
    emote("vale_gh", "!"),
    say("<PLAYER>! In here, quick! The greenhouse!", VALE),
    flag("vale_greeted"),
  ],
  vale_morning: [
    face("vale_gh", "toPlayer"),
    say("Look at them. Overnight, all three seedlings turned to face the door.", VALE),
    say("When I reached for one, it flinched. Plants don't flinch, <PLAYER>!", VALE),
    say("I think they're waiting for someone. Go on, look at each pot.", VALE),
  ],
  ...potScripts(),
  vale_after_starter: [
    face("vale_gh", "toPlayer"),
    say("It leaned toward you. I saw it! It chose you right back.", VALE),
    say("Then it's settled. Here, let's give it a good drink first.", VALE),
    { op: "heal" },
    say("Look after it: water, light and a little patience.", VALE),
    say("And take this. Every botanist needs one.", VALE),
    give("field_herbarium"),
    say("A FIELD HERBARIUM. Sketch every QUICKENED you meet. Press a leaf from each you tend.", VALE),
    say("Find out how many there are, and where. That's our job now.", VALE),
    say("One more thing. OLD FENNIMORE phoned about \"a seed that won't sit still.\"", VALE),
    say("He's in HEDGEROW, north up ROUTE 1. Would you fetch it for me?", VALE),
    flag("errand_fennimore"),
    // Back to her desk (the lab VALE appears once got_starter is set).
    moveNpc("vale_gh", "up", "left", "left", "left", "left"),
    flag("got_starter"),
  ],
  vale_talk: [
    face("vale", "toPlayer"),
    ifFlags({ got_pods: true }, [
      ifFlags({ beat_hollis: true }, [
        say("A PRESSED MARK already! I'll hang it next to my diploma.", VALE),
      ], [
        say("HOLLIS runs the CONSERVATORY in BRAMBLEGATE. West of HEDGEROW on ROUTE 2.", VALE),
      ]),
      { op: "yesno", prompt: "Rest your QUICKENED at the lab?", yes: [
        say("Under the grow lamps they go.", VALE),
        { op: "heal" },
        say("There. Right as rain. Well, right as gentle drizzle.", VALE),
      ], no: [say("Off you go, then. Notice everything!", VALE)] },
    ], [
      ifFlags({ theft_seen: true }, [
        say("He ran out the front! Go, <PLAYER>!", VALE),
      ], [
        say("OLD FENNIMORE's in HEDGEROW, north up ROUTE 1. Stick to the lanes!", VALE),
      ]),
    ]),
  ],

  // --- Fennimore ---------------------------------------------------------------
  fennimore: [
    face("fennimore", "toPlayer"),
    ifFlags({ got_seed: true }, [
      say("Keep that seed warm and close. Tell IMOGEN she still owes me a trowel.", FEN),
    ], [
      say("Eh? Who are you? ...Ah! IMOGEN's new botanist. Come in, come in.", FEN),
      say("Fifty years I've studied plants. Never has one rolled off a shelf by itself.", FEN),
      say("Until this one. Found it on my doorstep the morning after the bloom.", FEN),
      say("It's warm. And it hums. Go on, hold it.", FEN),
      give("centuryheart_seed"),
      say("That's no ordinary seed, if I'm any judge. And I am. Keep it safe.", FEN),
      say("Give IMOGEN this letter, too. She'll want to read it.", FEN),
      give("fennimores_letter"),
      say("Mind how you go. The lanes are livelier than they used to be.", FEN),
      flag("got_seed"),
    ]),
  ],

  // --- PIP's catching demo on ROUTE 1 ------------------------------------------
  pip_demo: [
    emote("pip", "!"),
    face("pip", "toPlayer"),
    say("Hey! You're DR. VALE's new botanist! I'm PIP!", PIP),
    moveNpc("pip", "left"),
    say("Have you caught a QUICKENED yet? No? Watch me!", PIP),
    moveNpc("pip", "right", "right"),
    face("pip", "right"),
    emote("pip", "!"),
    wait(20),
    { op: "sfx", id: "pod_throw" },
    wait(30),
    { op: "sfx", id: "pod_shake" },
    wait(30),
    { op: "sfx", id: "pod_shake" },
    wait(30),
    { op: "sfx", id: "pod_click" },
    { op: "jingle", id: "caught" },
    say("Gotcha!", PIP),
    moveNpc("pip", "left", "left"),
    face("pip", "toPlayer"),
    say("First you tire one out in a battle. Then you throw a TERRARIUM POD.", PIP),
    say("If it's willing, it roots right in. You can't force it. They choose!", PIP),
    say("DR. VALE keeps pods at the HERBARIUM. Ask her!", PIP),
    say("See you around, <PLAYER>! I'm off to find more facts!", PIP),
    moveNpc("pip", "left", ...steps("down", 5)),
    { op: "hideNpc", npc: "pip" },
    flag("pip_demo_done"),
  ],

  // --- The theft (herbarium onEnter) -------------------------------------------
  theft: [
    emote("vale", "!"),
    moveNpc("vale", ...steps("down", 6), "left"),
    face("vale", "down"),
    say("<PLAYER>! Thank goodness. Something awful's happened.", VALE),
    say("One of the seedlings is gone. Pot and all!", VALE),
    byStarter((line) => [flag(`rival_has_${COUNTER[line]}`), { op: "hideNpc", npc: `pot_${COUNTER[line]}` }]),
    say("My aide saw a boy run out with it. Dark coat, quick hands.", VALE),
    say("The poor thing didn't want to go. It clung to the door frame!", VALE),
    emote("player", "!"),
    say("Go after him! He can't have gone far!", VALE),
    flag("theft_seen"),
    moveNpc("vale", "right", ...steps("up", 6)),
    face("vale", "down"),
  ],

  // --- Rival battle 1 (fallowfield onEnter; the player is below the door) ------
  rival_1: [
    { op: "music", id: "rival_appears" },
    emote("player", "!"),
    moveNpc("bram", "right", "right", "right", "up"),
    face("bram", "right"),
    face("player", "left"),
    say("Looking for this?", BRAM),
    say("It was wasting away in a pot. Plants are tools. Tools should be used.", BRAM),
    say("Want it back? Then take it.", BRAM),
    { op: "call", script: "rival_1_fight" },
    moveNpc("bram", ...steps("left", 4), ...steps("up", 6)),
    { op: "hideNpc", npc: "bram" },
    { op: "call", script: "rival_1_end" },
  ],
  // Talk fallback if the scene was somehow skipped.
  rival_1_battle: [
    { op: "music", id: "rival_appears" },
    face("bram", "toPlayer"),
    say("You again? Fine. Let's settle it.", BRAM),
    { op: "call", script: "rival_1_fight" },
    { op: "fade", to: "black" },
    { op: "hideNpc", npc: "bram" },
    { op: "fade", to: "clear" },
    { op: "call", script: "rival_1_end" },
  ],
  rival_1_fight: [
    byStarter((line) => [{ op: "battle", trainer: `rival_1_${COUNTER[line]}`, canLose: true }]),
    { op: "ifLastBattle", result: "won", then: [
      say("...Lucky. It's a blunt tool. I'll sharpen it.", BRAM),
    ], else: [
      say("Like I said. Tools.", BRAM),
    ] },
    say("Don't bother following. My father's a man who fixes things.", BRAM),
    say("Whole valleys, if they need it. The name's <RIVAL>. Remember it.", BRAM),
  ],
  rival_1_end: [
    flag("rival_1_done"),
    // A story battle you may lose shouldn't leave the starter wilted.
    say("Your partner shakes off the fight and turns its leaves to the light."),
    { op: "heal" },
    { op: "restoreMusic" },
    say("DR. VALE is waving from the HERBARIUM door."),
  ],

  // --- The letter, pods and flasks (herbarium onEnter) ---------------------------
  vale_letter: [
    moveNpc("vale", ...steps("down", 6), "left"),
    face("vale", "down"),
    say("You found him? BRAM, was it? And he still has the seedling...", VALE),
    say("It fought him every step, I bet. That tells me something.", VALE),
    say("Now. Did FENNIMORE give you anything?", VALE),
    emote("vale", "!"),
    say("A seed. Warm as a teacup. And it's... humming.", VALE),
    say("Keep it with you. I want it somewhere safe, and that's you.", VALE),
    say("And a letter? Let's see...", VALE),
    { op: "takeItem", item: "fennimores_letter" },
    say("\"IMOGEN. The old songs say: the heart blooms and the woods listen.\"", VALE),
    say("\"I think they're listening now. I don't think the bloom is the whole story. -F.\"", VALE),
    say("Hmm. FENNIMORE always did love a mystery. So do I.", VALE),
    say("If the woods are listening, we'd better learn their names. Take these.", VALE),
    give("terrarium_pod", 5),
    say("TERRARIUM PODS. A tired QUICKENED may choose to root in one.", VALE),
    give("water_flask", 2),
    say("And WATER FLASKS, for when your partner starts to wilt.", VALE),
    say("Catalogue every QUICKENED you can. And earn your CONSERVATORY accreditation.", VALE),
    say("Each CONSERVATORY head awards a PRESSED MARK. HOLLIS in BRAMBLEGATE is first.", VALE),
    say("Take ROUTE 2, west of HEDGEROW. Off you go, <PLAYER>!", VALE),
    flag("got_pods"),
    moveNpc("vale", "right", ...steps("up", 6)),
    face("vale", "down"),
  ],
};
