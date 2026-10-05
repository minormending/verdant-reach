// Prologue and Chapter 1: the bloom, the morning call, the starter, the
// errand to FENNIMORE, PIP's catching demo, the theft and rival battle 1, and
// DR. VALE's letter scene.
//
// Voice: STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.

import type { ScriptCmd, StillKey } from "../../contracts";
import {
  emote, face, flag, give, ifFlags, moveNpc, say, steps, wait, type Scripts,
} from "../build";
import { COUNTER, STARTER_LINES, STARTER_SPECIES, type StarterLine } from "../trainers";

const VALE = "VALE";
const BRAM = "BRAM";
const PIP = "PIP";
const FEN = "FENNIMORE";
const JUNE = "JUNE";

/** Runs `then` for whichever starter line the player chose. */
const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

const camera = (x: number, y: number, frames = 60): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 45): ScriptCmd => ({ op: "cameraReset", frames });
// Story stills: held over one to three boxes, then cleared. Keep them rare.
const still = (image: StillKey): ScriptCmd => ({ op: "still", image });
const stillClear: ScriptCmd = { op: "stillClear" };

// Each pot has a temperament: the oak is patient, the chili is impatient,
// the lily is friendly. Every one gets a true fact.
const POTS: Record<StarterLine, {
  name: string; look: string; mood: string; fact: string; no: string; lift: string; after: string;
}> = {
  oak: {
    name: "OAK ACORN",
    look: "A sprouting acorn. One stubborn root has cracked clean through its shell.",
    mood: "It doesn't move. It seems to be thinking about you.",
    fact: "One oak can feed hundreds of species, from moths to jays.",
    no: "The acorn goes back to its long, slow thoughts.",
    lift: "<PLAYER> lifted the pot. The little root curled up over the rim.",
    after: "The acorn sits very still. It's waiting for someone else.",
  },
  chili: {
    name: "CHILI FLOWER",
    look: "A chili seedling in flower. The air above it shimmers like a stove top.",
    mood: "Its leaves twitch. It's been ready for ages.",
    fact: "Birds can't taste chili heat, so they spread its seeds.",
    no: "The chili flicks a leaf at you. Unimpressed.",
    lift: "<PLAYER> lifted the pot. It was warm, like a hand held out.",
    after: "The chili gives off a little heat, and pointedly ignores you.",
  },
  lily: {
    name: "LILY SEEDPOD",
    look: "A spiny seedpod, bobbing in a dish of water.",
    mood: "It bobs a little closer. Then a little closer still.",
    fact: "Grown up, its giant pads can hold the weight of a small child!",
    no: "The seedpod drifts back to the middle of its dish.",
    lift: "<PLAYER> lifted the dish. The seedpod bumped happily at the rim.",
    after: "The seedpod bobs in its dish. It's waiting for someone else.",
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
        say(pot.mood),
        say(pot.fact),
        { op: "yesno", prompt: `Choose the ${pot.name}?`, yes: [
          { op: "hideSpecies" },
          { op: "call", script: `choose_${line}` },
        ], no: [
          { op: "hideSpecies" },
          say(pot.no),
        ] },
      ]),
    ];
    out[`choose_${line}`] = [
      flag(`got_starter_${line}`),
      { op: "hideNpc", npc: `pot_${line}` },
      say(pot.lift),
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
    emote("vale", "!"),
    say("There, <PLAYER>! On the far slope!", VALE),
    camera(6, 3, 90),
    wait(30),
    say("The CENTURYHEART. A century, it's waited for this.", VALE),
    say("It flowers once. Only once. Then it dies.", VALE),
    say("Everything it ever stored goes into this one bloom.", VALE),
    wait(50),
    { op: "flash", color: "gold" },
    { op: "ambient", kind: "pollen" },
    still("bloom"),
    wait(40),
    say("The great spike glows, studded with thousands of pale flowers."),
    say("Gold pollen lifts on the night wind and drifts down the valley."),
    wait(20),
    stillClear,
    cameraReset(60),
    face("vale", "left"),
    say("Oh... Oh, would you look at that.", VALE),
    say("Write down the time, <PLAYER>. Nobody alive has seen this.", VALE),
    face("vale", "up"),
    wait(60),
    { op: "shake", frames: 60 },
    emote("player", "!"),
    say("A low hum rises up through the floor."),
    say("You feel it in your teeth."),
    wait(20),
    say("DR. VALE hasn't noticed. She's sketching by starlight."),
    wait(30),
    face("vale", "toPlayer"),
    say("Well! Some first shift. That's a hard act to follow.", VALE),
    say("Get some sleep. And come in early.", VALE),
    say("I want to look in on the seedlings.", VALE),
    { op: "fade", to: "black" },
    wait(60),
    flag("prologue_done"),
    { op: "warp", to: "player_home", x: 2, y: 2, facing: "right" },
    wait(30),
    { op: "fade", to: "clear" },
  ],

  // --- Morning at home (player_home onEnter) ----------------------------------
  morning: [
    wait(30),
    say("Morning. Gold dust glitters all along the windowsill."),
    emote("june", "!"),
    moveNpc("june", ...steps("up", 2), ...steps("left", 4)),
    face("june", "left"),
    face("player", "right"),
    say("You're up! DR. VALE rang at dawn.", JUNE),
    say("She said, and I quote: \"The greenhouse moved.\"", JUNE),
    say("Then she hung up.", JUNE),
    emote("june", "?"),
    say("...Can greenhouses do that?", JUNE),
    say("Go and find out! The HERBARIUM's just east.", JUNE),
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
    ifFlags({ saw_seedlings: false }, [
      still("greenhouse_morning"),
      wait(30),
      say("Three pots on the bench. All three seedlings face the door."),
      say("Overnight. Not to the light, <PLAYER>. To the DOOR.", VALE),
      stillClear,
      flag("saw_seedlings"),
      say("I reached for one and it flinched. It flinched, <PLAYER>!", VALE),
      say("Plants don't flinch. Except, it seems, now they do.", VALE),
    ]),
    say("They're waiting for someone. Go on, say hello.", VALE),
  ],
  ...potScripts(),
  vale_after_starter: [
    face("vale_gh", "toPlayer"),
    emote("vale_gh", "!"),
    say("Did you see that? It leaned in. It chose you right back!", VALE),
    say("Well, that settles it. Let's give it a good drink first.", VALE),
    { op: "heal" },
    say("Water, light and patience. That's all any of us need.", VALE),
    say("Oh! And this. Every botanist needs one.", VALE),
    give("field_herbarium"),
    say("Folk in town call them QUICKENED.", VALE),
    say("\"Quick\" is the old word for alive.", VALE),
    say("Sketch every QUICKENED you see. Press a leaf from each one you tend.", VALE),
    say("How many? Where? Nobody knows.", VALE),
    say("Finding out is our job now.", VALE),
    say("Oh, and OLD FENNIMORE rang.", VALE),
    say("He's found \"a seed that won't sit still.\"", VALE),
    say("He's in HEDGEROW, up ROUTE 1. Would you fetch it? I'd go, but...", VALE),
    face("vale_gh", "up"),
    say("...someone should keep an eye on these two.", VALE),
    flag("errand_fennimore"),
    // Back to her desk (the lab VALE appears once got_starter is set).
    moveNpc("vale_gh", "up", "left", "left", "left", "left"),
    flag("got_starter"),
  ],
  vale_talk: [
    face("vale", "toPlayer"),
    ifFlags({ got_pods: true }, [
      ifFlags({ beat_hollis: true }, [
        say("A PRESSED MARK! It's going above my diploma.", VALE),
      ], [
        say("HOLLIS is in BRAMBLEGATE. ROUTE 2, west of HEDGEROW.", VALE),
      ]),
      { op: "yesno", prompt: "Rest your QUICKENED here?", yes: [
        say("Under the grow lamps they go.", VALE),
        { op: "heal" },
        say("There. Right as rain. Well, right as gentle drizzle.", VALE),
      ], no: [say("Off you go, then. Notice everything!", VALE)] },
    ], [
      ifFlags({ theft_seen: true }, [
        say("He went out the front! Go, <PLAYER>!", VALE),
      ], [
        say("FENNIMORE's in HEDGEROW, up ROUTE 1!", VALE),
      ]),
    ]),
  ],

  // --- Fennimore ---------------------------------------------------------------
  fennimore: [
    face("fennimore", "toPlayer"),
    ifFlags({ got_seed: true }, [
      say("Keep it warm. And tell IMOGEN she still owes me a trowel.", FEN),
    ], [
      say("Ah. IMOGEN's new botanist.", FEN),
      say("You look at things the way she does.", FEN),
      say("Come in. Mind the fern. It's taken to sulking.", FEN),
      say("Sixty years I've kept seeds.", FEN),
      say("Not one ever left its shelf on its own.", FEN),
      say("Then this one turned up on my step.", FEN),
      say("The morning after the bloom.", FEN),
      say("It's warm. And if you're quiet, it hums.", FEN),
      give("centuryheart_seed"),
      say("Seeds are patient. They know what they're waiting for.", FEN),
      wait(20),
      say("I suspect this one's been waiting for you.", FEN),
      say("And give IMOGEN this. She'll say she isn't worried.", FEN),
      give("fennimores_letter"),
      say("She will be. Go gently.", FEN),
      say("The lanes are listening now.", FEN),
      flag("got_seed"),
    ]),
  ],

  // --- PIP's catching demo on ROUTE 1 ------------------------------------------
  pip_demo: [
    emote("pip", "!"),
    face("pip", "toPlayer"),
    say("You're DR. VALE's new botanist! I'm PIP! I know facts!", PIP),
    moveNpc("pip", "left"),
    say("Have you caught one yet? No? Watch! Watch watch watch!", PIP),
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
    emote("pip", "♪"),
    say("Gotcha! A LION'S TOOTH! That's a baby DANDELION!", PIP),
    moveNpc("pip", "left", "left"),
    face("pip", "toPlayer"),
    say("Step one: tire it out in a battle. Not too much! Just sleepy.", PIP),
    say("Step two: throw a TERRARIUM POD. It's a tiny greenhouse!", PIP),
    say("If it wants to, it roots right in. You can't make it. They choose!", PIP),
    say("Fact! Dandelions close up at night. And on cloudy days!", PIP),
    say("DR. VALE has pods at the HERBARIUM. Ask her! Bye, <PLAYER>!", PIP),
    moveNpc("pip", "left", ...steps("down", 5)),
    { op: "hideNpc", npc: "pip" },
    flag("pip_demo_done"),
  ],

  // --- The theft (herbarium onEnter) -------------------------------------------
  theft: [
    emote("vale", "!"),
    moveNpc("vale", ...steps("down", 6), "left"),
    face("vale", "down"),
    say("<PLAYER>! Oh, thank goodness.", VALE),
    say("One of the seedlings is gone.", VALE),
    byStarter((line) => [flag(`rival_has_${COUNTER[line]}`), { op: "hideNpc", npc: `pot_${COUNTER[line]}` }]),
    still("theft"),
    wait(30),
    say("Its pot sits empty on the bench. A trail of soil runs out the door."),
    say("It didn't want to go. It clung to the door frame.", VALE),
    stillClear,
    say("My aide saw a boy bolt out with it. Dark coat. Quick hands.", VALE),
    emote("player", "!"),
    say("He can't have gone far. Go!", VALE),
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
    wait(20),
    say("Looking for this?", BRAM),
    say("Behind him, the stolen seedling strains toward you."),
    say("It was wasting away in a pot.", BRAM),
    say("Plants are tools. Tools get used.", BRAM),
    say("You want it back? Take it.", BRAM),
    { op: "call", script: "rival_1_fight" },
    moveNpc("bram", ...steps("left", 6), ...steps("up", 6)),
    { op: "hideNpc", npc: "bram" },
    { op: "call", script: "rival_1_end" },
  ],
  // Talk fallback if the scene was somehow skipped.
  rival_1_battle: [
    { op: "music", id: "rival_appears" },
    face("bram", "toPlayer"),
    say("You again. Fine. Let's settle it.", BRAM),
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
    say("Don't follow me. My father's a man who fixes things.", BRAM),
    say("Whole valleys, if they need it.", BRAM),
    say("The name's <RIVAL>. You'll hear it again.", BRAM),
  ],
  rival_1_end: [
    flag("rival_1_done"),
    // A story battle you may lose shouldn't leave the starter wilted.
    say("Your partner shakes it off and turns to the light."),
    { op: "heal" },
    { op: "restoreMusic" },
    say("Over by the HERBARIUM door, DR. VALE is waving you in."),
  ],

  // --- The letter, pods and flasks (herbarium onEnter) ---------------------------
  vale_letter: [
    moveNpc("vale", ...steps("down", 6), "left"),
    face("vale", "down"),
    say("BRAM, was it? And he still has the seedling...", VALE),
    say("I bet it fought him every step. That tells me something.", VALE),
    say("They're not just awake, <PLAYER>. They have opinions.", VALE),
    say("Now. Did FENNIMORE give you anything?", VALE),
    emote("vale", "!"),
    say("Oh. Oh, my. It's warm as a teacup. And it's... humming.", VALE),
    say("Keep it on you. I want it somewhere safe, and that's you.", VALE),
    say("A letter, too? Let's see...", VALE),
    { op: "takeItem", item: "fennimores_letter" },
    say("\"IMOGEN. The old songs say: the heart blooms and the woods listen.\"", VALE),
    say("\"I think they are listening now.\"", VALE),
    say("\"And I don't think the bloom is the whole story. -F.\"", VALE),
    wait(30),
    emote("vale", "..."),
    say("Hm. FENNIMORE always did love a mystery. So do I.", VALE),
    say("If the woods are listening, we'd better learn their names.", VALE),
    give("terrarium_pod", 5),
    say("PODS. A tired QUICKENED may root in one.", VALE),
    give("water_flask", 2),
    say("And WATER FLASKS, for when your partner starts to wilt.", VALE),
    say("Catalogue every QUICKENED you can.", VALE),
    say("And earn your accreditation.", VALE),
    say("Each CONSERVATORY awards a PRESSED MARK.", VALE),
    say("HOLLIS in BRAMBLEGATE is first.", VALE),
    say("Take ROUTE 2, west of HEDGEROW.", VALE),
    say("And <PLAYER>? Notice everything.", VALE),
    flag("got_pods"),
    moveNpc("vale", "right", ...steps("up", 6)),
    face("vale", "down"),
  ],
};
