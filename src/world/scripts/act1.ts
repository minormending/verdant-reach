// Chapters 2-3: HOLLIS, the grunt sighting, ROUTE 3's surveyor, SUGARBUSH's
// distress, the grove and SHEARS, rival battle 2, NELL PITCHER, DR. VALE's
// call and the end card.
//
// Voice: STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.

import type { ScriptCmd, StillKey } from "../../contracts";
import { emote, face, flag, ifFlags, moveNpc, say, steps, wait, type Scripts } from "../build";
import { COUNTER, type StarterLine } from "../trainers";

const BRAM = "BRAM";
const HOLLIS = "HOLLIS";
const NELL = "NELL";
const SHEARS = "SHEARS";
const VALE = "VALE";
const GRUNT = "GRUNT";

const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

const camera = (x: number, y: number, frames = 60): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 45): ScriptCmd => ({ op: "cameraReset", frames });
// Story stills: held over one to three boxes, then cleared. Keep them rare.
const still = (image: StillKey): ScriptCmd => ({ op: "still", image });
const stillClear: ScriptCmd = { op: "stillClear" };

// The engine announces giveMark itself ("<PLAYER> received the ... MARK!" + jingle).
const awardMark = (mark: "bramble_mark" | "sundew_mark"): ScriptCmd => ({ op: "giveMark", mark });

export const act1Scripts: Scripts = {
  // --- Conservatory 1 -----------------------------------------------------------
  hollis: [
    face("hollis", "toPlayer"),
    ifFlags({ beat_hollis: true }, [
      say("You don't own a hedge. You tend it.", HOLLIS),
      say("And it decides to stay. Same with them.", HOLLIS),
    ], [
      say("Come in, come in. Mind the hedge. It minds you.", HOLLIS),
      say("I'm HOLLIS. Fifty years laying hedges, me.", HOLLIS),
      say("Folk think a hedge is a wall. It isn't.", HOLLIS),
      say("It's a house with a hundred tenants.", HOLLIS),
      say("Wrens. Dormice. Blackberries for passers-by.", HOLLIS),
      say("Now, then. Let's see who's chosen to live with you.", HOLLIS),
      { op: "battle", trainer: "hollis" },
      { op: "ifLastBattle", result: "won", then: [
        say("Well grown. Well grown indeed.", HOLLIS),
        say("You didn't force them. I can tell.", HOLLIS),
        say("Forced growth is thin. It snaps.", HOLLIS),
        say("I've only one lesson worth the name. Here it is.", HOLLIS),
        wait(30),
        say("You don't catch them. They choose you.", HOLLIS),
        say("So be worth choosing.", HOLLIS),
        say("Here. The BRAMBLE MARK, pressed from my oldest bramble.", HOLLIS),
        awardMark("bramble_mark"),
        say("The road north's yours. Mind the NIGHT MEADOW.", HOLLIS),
        say("Things grow there after dark.", HOLLIS),
      ] },
    ]),
  ],

  // --- Rootstock foreshadowing in BRAMBLEGATE (onEnter after HOLLIS) -------------
  grunt_sighting: [
    wait(20),
    camera(14, 4, 50),
    emote("grunt", "..."),
    say("Someone in a grey work coat is hurrying up the main street."),
    moveNpc("grunt", ...steps("up", 3), "left", ...steps("up", 2)),
    { op: "hideNpc", npc: "grunt" },
    flag("saw_grunt_bg"),
    say("A strip of grafting tape is wound round one sleeve."),
    cameraReset(),
    emote("player", "?"),
  ],

  // --- ROUTE 3: the "surveyor" ---------------------------------------------------
  r3_grunt: [
    { op: "music", id: "rootstock_appears" },
    emote("grunt", "!"),
    face("grunt", "toPlayer"),
    say("Whoa! Pass is closed, kid. Official field survey.", GRUNT),
    say("Surveying what? ROOTSTOCK business, that's what.", GRUNT),
    emote("grunt", "!"),
    say("...I didn't say ROOTSTOCK. You didn't hear ROOTSTOCK.", GRUNT),
    { op: "battle", trainer: "grunt_r3" },
    { op: "ifLastBattle", result: "won", then: [
      say("Ugh. The boss is gonna prune me for this.", GRUNT),
      say("Survey's over! I was never here!", GRUNT),
      moveNpc("grunt", ...steps("up", 4)),
      { op: "hideNpc", npc: "grunt" },
    ] },
    { op: "restoreMusic" },
  ],

  // --- SUGARBUSH: arriving in a town in trouble ----------------------------------
  // Wire as a SUGARBUSH onEnter (or a trigger at the south gate) gated on
  // { sb_arrival_seen: false, grove_cleared: false }.
  sugarbush_arrival: [
    wait(20),
    camera(15, 3, 70),
    say("Every maple on the grove lane bristles with taps."),
    say("Their leaves hang limp, as if the trees have stopped breathing out."),
    wait(30),
    cameraReset(60),
    say("The sugar shack's chimney stands cold. There's no sap left to boil."),
    flag("sb_arrival_seen"),
  ],

  // --- SUGARBUSH GROVE: SHEARS ---------------------------------------------------
  shears: [
    { op: "music", id: "rootstock_appears" },
    camera(13, 2, 60),
    still("grove_taps"),
    wait(30),
    say("Tubing runs from every trunk into sealed steel drums."),
    say("The sap inside has a faint gold sheen, like pollen in lamplight."),
    stillClear,
    cameraReset(40),
    emote("shears", "..."),
    face("shears", "toPlayer"),
    say("A botanist. Good. You can appreciate the work.", SHEARS),
    say("These maples woke up full of something.", SHEARS),
    say("We are extracting it.", SHEARS),
    say("Sap carries signals. We intend to read them.", SHEARS),
    say("Mr. THORNE wants to know what woke them.", SHEARS),
    say("And how to make them listen.", SHEARS),
    say("Wild growth is waste.", SHEARS),
    say("One ROOTSTOCK under everything.", SHEARS),
    say("Orderly. Obedient.", SHEARS),
    say("You are an unscheduled variable.", SHEARS),
    say("Let's prune you back to the root.", SHEARS),
    { op: "battle", trainer: "shears" },
    { op: "ifLastBattle", result: "won", then: [
      say("Noted.", SHEARS),
      say("Keep the trees. We have our samples.", SHEARS),
      say("Mr. THORNE's roots go deeper than one grove, botanist.", SHEARS),
      say("Pack it up. We're done here.", SHEARS),
      { op: "fade", to: "black" },
      { op: "hideNpc", npc: "shears" },
      { op: "hideNpc", npc: "grunt1" },
      { op: "hideNpc", npc: "grunt2" },
      { op: "hideNpc", npc: "grunt3" },
      flag("grove_cleared"),
      wait(30),
      { op: "fade", to: "clear" },
      { op: "shake", frames: 30 },
      say("All through the grove, the taps work loose."),
      say("One by one, they drop into the leaves."),
      say("The maples creak and stretch. Their leaves turn back toward the light."),
      wait(40),
      say("Somewhere far below the roots, something seems to sigh."),
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
    say("I was up in that grove before you. I saw the drums. The tubes.", BRAM),
    emote("bram", "..."),
    say("...Doesn't matter. Strong is strong.", BRAM),
    say("Look at mine. Grown weeks early.", BRAM),
    emote("player", "..."),
    still("graft_collar"),
    wait(30),
    say("A grey collar is clamped around its stem, tight as a tourniquet."),
    say("Its leaves are pale. It won't turn toward him."),
    say("A GRAFT COLLAR. It makes them listen. Makes them grow.", BRAM),
    stillClear,
    say("Don't look at me like that.", BRAM),
    byStarter((line) => [{ op: "battle", trainer: `rival_2_${COUNTER[line]}` }]),
    { op: "ifLastBattle", result: "won", then: [
      say("...It was supposed to be stronger.", BRAM),
      say("The collar was supposed to...", BRAM),
      say("Forget it. Forget the grove. Forget all of it.", BRAM),
      { op: "fade", to: "black" },
      { op: "hideNpc", npc: "bram" },
      flag("rival_2_done"),
      { op: "fade", to: "clear" },
      say("BRAM stalks off toward the maples. He doesn't look back."),
    ] },
    { op: "restoreMusic" },
  ],

  // --- Conservatory 2, VALE's call, and the end of the slice ----------------------
  nell: [
    face("nell", "toPlayer"),
    ifFlags({ beat_nell: true }, [
      say("My hunters are sulking. Losing puts them off their flies!", NELL),
    ], [
      say("Oh, a visitor! I'm NELL PITCHER!", NELL),
      say("Mind the sundews. They're sticky!", NELL),
      say("You cleared the grove! The bog felt it.", NELL),
      say("Plants gossip, you know.", NELL),
      say("Bog soil's so poor, my darlings eat bugs!", NELL),
      say("Slowly. Over days. Isn't that lovely?", NELL),
      say("My BOG PITCHERS have slippery rims. In slide the bugs!", NELL),
      say("Shall we see how hungry they are today?", NELL),
      { op: "battle", trainer: "nell" },
      { op: "ifLastBattle", result: "won", then: [
        say("Oh! Snapped shut on nothing at all. Well done, you!", NELL),
        say("The SUNDEW MARK! Careful, it's still sticky.", NELL),
        awardMark("sundew_mark"),
        wait(20),
        say("Can I tell you a secret?", NELL),
        say("At night, this bog hums. Low and deep, under the boardwalk.", NELL),
        { op: "shake", frames: 20 },
        say("It started the night of the bloom.", NELL),
        say("My flytraps snap at nothing now.", NELL),
        say("And the CATTAILS sway when there's no wind.", NELL),
        say("Whatever it is, it's down in the roots. Ooh, it gives me shivers!", NELL),
        wait(30),
        { op: "sfx", id: "text_blip" },
        wait(8),
        { op: "sfx", id: "text_blip" },
        emote("nell", "!"),
        say("Oh! That's the CONSERVATORY telephone. ...It's for you!", NELL),
        { op: "call", script: "vale_call" },
      ] },
    ]),
  ],
  vale_call: [
    say("<PLAYER>? It's DR. VALE! Two PRESSED MARKS! I'm so proud.", VALE),
    { op: "music", id: "prologue_bloom" },
    say("Listen. I've been up all night with FENNIMORE's papers.", VALE),
    say("His grandfather kept a diary.", VALE),
    say("The last time the CENTURYHEART bloomed...", VALE),
    say("...plants woke up then, too. Just like now.", VALE),
    still("vale_call"),
    wait(30),
    say("And the diary says the ground hummed all night.", VALE),
    { op: "shake", frames: 40 },
    say("\"As if something underneath was afraid.\"", VALE),
    wait(60),
    stillClear,
    emote("player", "!"),
    say("Keep that seed close, <PLAYER>. And come home soon.", VALE),
    say("Carefully.", VALE),
    flag("slice_done"),
    wait(60),
    { op: "endSlice" },
  ],
};
