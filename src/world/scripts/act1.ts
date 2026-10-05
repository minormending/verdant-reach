// Chapters 2-3: HOLLIS, the grunt sighting, ROUTE 3's surveyor, the grove
// and SHEARS, rival battle 2, NELL PITCHER, DR. VALE's call and the end card.

import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, ifFlags, moveNpc, say, steps, wait, type Scripts } from "../build";
import { COUNTER, type StarterLine } from "../trainers";

const BRAM = "BRAM";
const HOLLIS = "HOLLIS";
const NELL = "NELL";
const SHEARS = "SHEARS";
const VALE = "VALE";

const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

// The engine announces giveMark itself ("<PLAYER> received the ... MARK!" + jingle).
const awardMark = (mark: "bramble_mark" | "sundew_mark"): ScriptCmd => ({ op: "giveMark", mark });

export const act1Scripts: Scripts = {
  // --- Conservatory 1 -----------------------------------------------------------
  hollis: [
    face("hollis", "toPlayer"),
    ifFlags({ beat_hollis: true }, [
      say("You don't own a hedge. You tend it, and it decides to stay. Same with them.", HOLLIS),
    ], [
      say("Welcome, young botanist. I'm HOLLIS. I've laid hedges here for fifty years.", HOLLIS),
      say("Folk think a hedge is a wall. It isn't. It's a home for a hundred creatures.", HOLLIS),
      say("Let's see who's chosen to make a home with you.", HOLLIS),
      { op: "battle", trainer: "hollis" },
      { op: "ifLastBattle", result: "won", then: [
        say("Well grown. Well grown indeed.", HOLLIS),
        say("You didn't force them. You can always tell. Forced growth is thin and brittle.", HOLLIS),
        say("Remember this: you don't catch them. They choose you.", HOLLIS),
        say("Here. The BRAMBLE MARK, pressed from my oldest bramble.", HOLLIS),
        awardMark("bramble_mark"),
        say("The road north to SUGARBUSH is yours now. Mind the NIGHT MEADOW.", HOLLIS),
      ] },
    ]),
  ],

  // --- Rootstock foreshadowing in BRAMBLEGATE (onEnter after HOLLIS) -------------
  grunt_sighting: [
    wait(20),
    emote("grunt", "..."),
    say("Someone in a grey work coat hurries up the main street."),
    moveNpc("grunt", ...steps("up", 3), "left", ...steps("up", 2)),
    { op: "hideNpc", npc: "grunt" },
    flag("saw_grunt_bg"),
    say("A band of grafting tape was wrapped around one sleeve. Odd."),
  ],

  // --- ROUTE 3: the "surveyor" ---------------------------------------------------
  r3_grunt: [
    { op: "music", id: "rootstock_appears" },
    emote("grunt", "!"),
    face("grunt", "toPlayer"),
    say("Whoa! The pass is closed, kid. Official field survey.", "GRUNT"),
    say("Surveying what? None of your business. ROOTSTOCK business.", "GRUNT"),
    say("...I didn't say that. Forget I said that!", "GRUNT"),
    { op: "battle", trainer: "grunt_r3" },
    { op: "ifLastBattle", result: "won", then: [
      say("Ugh. The boss is gonna prune me. Fine! Survey's over!", "GRUNT"),
      moveNpc("grunt", ...steps("up", 4)),
      { op: "hideNpc", npc: "grunt" },
    ] },
    { op: "restoreMusic" },
  ],

  // --- SUGARBUSH GROVE: SHEARS ---------------------------------------------------
  shears: [
    { op: "music", id: "rootstock_appears" },
    emote("shears", "!"),
    face("shears", "toPlayer"),
    say("Well, well. A botanist. Come to count the trees?", SHEARS),
    say("These maples woke up full of something. We're draining it to find out what.", SHEARS),
    say("Mr. THORNE wants to know what wakes them. And how to make them listen.", SHEARS),
    say("One ROOTSTOCK under everything, sprout. Neat. Orderly. Obedient.", SHEARS),
    say("Snip, snip. Let's cut you back to the root.", SHEARS),
    { op: "battle", trainer: "shears" },
    { op: "ifLastBattle", result: "won", then: [
      say("Cut short by a junior botanist. Hmph.", SHEARS),
      say("Keep the trees. We've got our samples. Mr. THORNE has deeper roots to dig.", SHEARS),
      say("Pack it up! We're leaving!", SHEARS),
      { op: "fade", to: "black" },
      { op: "hideNpc", npc: "shears" },
      { op: "hideNpc", npc: "grunt1" },
      { op: "hideNpc", npc: "grunt2" },
      { op: "hideNpc", npc: "grunt3" },
      flag("grove_cleared"),
      wait(30),
      { op: "fade", to: "clear" },
      { op: "shake", frames: 30 },
      say("All through the grove, the taps pop free and drop into the leaf litter."),
      say("The maples creak and stretch. Their leaves turn back toward the light."),
      say("Somewhere deep in the wood, something seems to sigh."),
    ] },
    { op: "restoreMusic" },
  ],

  // --- Rival battle 2 (SUGARBUSH, after the grove) ---------------------------------
  rival_2: [
    { op: "music", id: "rival_appears" },
    emote("bram", "!"),
    face("bram", "toPlayer"),
    face("player", "left"),
    say("You. Of course it's you.", BRAM),
    say("I was in that grove before you. I saw what they were doing to the maples.", BRAM),
    say("...Doesn't matter. Strong is strong. Look at mine. Grown weeks early.", BRAM),
    emote("player", "..."),
    say("A grey collar is clamped around its stem, tight as a tourniquet."),
    say("A GRAFT COLLAR. It makes them listen. Makes them grow. Don't look at me like that.", BRAM),
    byStarter((line) => [{ op: "battle", trainer: `rival_2_${COUNTER[line]}` }]),
    { op: "ifLastBattle", result: "won", then: [
      say("...It was supposed to be stronger. The collar was supposed to...", BRAM),
      say("Forget it. Forget the grove, too. Forget all of it.", BRAM),
      { op: "fade", to: "black" },
      { op: "hideNpc", npc: "bram" },
      flag("rival_2_done"),
      { op: "fade", to: "clear" },
      say("BRAM stalks off toward the maples without looking back."),
    ] },
    { op: "restoreMusic" },
  ],

  // --- Conservatory 2, VALE's call, and the end of the slice ----------------------
  nell: [
    face("nell", "toPlayer"),
    ifFlags({ beat_nell: true }, [
      say("My hunters are sulking. They hate losing almost as much as they love flies!", NELL),
    ], [
      say("Oh, hello! Mind the sundews, they're sticky. I'm NELL PITCHER!", NELL),
      say("Thank you for the grove. The whole bog felt it. Plants talk, you know.", NELL),
      say("Bogs are so poor in nutrients, my darlings learned to eat bugs instead!", NELL),
      say("Shall we see how hungry they are today?", NELL),
      { op: "battle", trainer: "nell" },
      { op: "ifLastBattle", result: "won", then: [
        say("Oh! Snapped shut on nothing at all. Well done, you!", NELL),
        say("You've earned this. The SUNDEW MARK. Careful, it's still a little sticky.", NELL),
        awardMark("sundew_mark"),
        say("Can I tell you a secret? At night, this bog hums.", NELL),
        say("Low and deep, under the boardwalk. It started the night of the bloom.", NELL),
        say("Whatever it is, it's down in the roots.", NELL),
        wait(30),
        { op: "sfx", id: "text_blip" },
        emote("nell", "!"),
        say("Oh! That's the CONSERVATORY telephone. ...It's for you!", NELL),
        { op: "call", script: "vale_call" },
      ] },
    ]),
  ],
  vale_call: [
    say("<PLAYER>? It's DR. VALE! Two PRESSED MARKS! I'm so proud.", VALE),
    say("Listen. I've been reading FENNIMORE's notes. His grandfather kept a diary.", VALE),
    say("A hundred years ago, the last time the CENTURYHEART bloomed, plants woke up then too.", VALE),
    say("And the diary says the ground hummed all night.", VALE),
    say("As if something underneath was afraid.", VALE),
    emote("player", "!"),
    say("Keep that seed close, <PLAYER>. And come home soon. Carefully.", VALE),
    flag("slice_done"),
    wait(30),
    { op: "endSlice" },
  ],
};
