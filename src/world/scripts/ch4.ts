// Chapter 4: GLASSHOUSE CITY. The dome, the closed CONSERVATORY, the ROOT
// RELAY's open day (the seed on the listening desk, and the pulse that answers
// it), the grunt at the mast, the NURSERY GARDEN and rival battle 3, the
// GARDEN SHEARS (pruning_shears), FLORA VANCE and the ROSE MARK, then DR. VALE's call and the
// end card.
//
// Cast named here:
//   DR. MAREN ODELL  director of the ROOT RELAY (a university station).
//   PEONY and LUPIN  the NURSERY GARDEN keepers, married forty years.
//   WREN             the RELAY's network engineer. Later the ROOTSTOCK admin
//                    who seizes it (Ch. 8): here, only likeable, brilliant and
//                    a shade too interested in the seed. Never say more.
//
// Ids (NPCs, flags, triggers, script ids) follow docs/CH4_IDS.md exactly; the
// maps' onEnter chains (gc_enter, gn_enter) and triggers call these scripts.
// Voice: STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.

import type { ScriptCmd, StillKey } from "../../contracts";
import { emote, face, flag, give, ifFlags, moveNpc, say, wait, type Scripts } from "../build";
import { COUNTER, type StarterLine } from "../trainers";

const VALE = "VALE";
const BRAM = "BRAM";
const WREN = "WREN";
const ODELL = "ODELL";
const FLORA = "FLORA";
const PEONY = "PEONY";
const LUPIN = "LUPIN";

const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

const camera = (x: number, y: number, frames = 60): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 45): ScriptCmd => ({ op: "cameraReset", frames });
const still = (image: StillKey): ScriptCmd => ({ op: "still", image });
const stillClear: ScriptCmd = { op: "stillClear" };
const call = (script: string): ScriptCmd => ({ op: "call", script });
const ring: ScriptCmd[] = [
  { op: "sfx", id: "text_blip" }, wait(8), { op: "sfx", id: "text_blip" }, wait(24),
  { op: "sfx", id: "text_blip" }, wait(8), { op: "sfx", id: "text_blip" },
];

// --- NPC ids (docs/CH4_IDS.md) ---------------------------------------------------
const N = {
  // glasshouse_relay
  wren: "wren",
  director: "relay_director",
  floraRelay: "flora",
  // glasshouse_city
  gcGrunt: "watcher",
  // glasshouse_nursery
  peony: "nursery_keeper",
  lupin: "nursery_keeper_b",
  bram: "bram",
  // glasshouse_conservatory
  flora: "flora",
};

// Camera targets (tiles), per the maps.
const AT = {
  relayRoom: { x: 9, y: 4 },
  relayMast: { x: 10, y: 8 }, // frames the mast (10,3-5) and the watcher (11,8) above the text box
};

export const ch4Scripts: Scripts = {
  // --- Arrival: the dome (gc_enter, once) ------------------------------------------
  ch4_city_arrival: [
    still("glasshouse_dome"),
    wait(40),
    say("GLASSHOUSE CITY. A whole city under one roof of glass."),
    say("Ten thousand panes, ribbed in white iron, catch the sky."),
    say("Under it, palms grow taller than the townhouses."),
    stillClear,
    { op: "music", id: "glasshouse_city" },
    wait(20),
    say("The air is warm and wet, and smells like a just-watered fern."),
    flag("gc_arrival_seen"),
  ],

  // --- The ROSE CONSERVATORY, closed (door trigger until relay_listened) --------
  ch4_conservatory_closed: [
    { op: "sfx", id: "bump" },
    say("The doors are locked. A card is tied to the handle with ribbon."),
    say("\"CLOSED TODAY! I am at the ROOT RELAY open day. Kisses, F.V.\""),
    say("There's a lipstick kiss on the card. Of course there is."),
    { op: "movePlayer", path: ["down"] },
  ],

  // --- The ROOT RELAY open day (the chapter's main beat) ------------------------
  // Runs from the listening-room trigger (or talking to the director or FLORA)
  // until relay_listened is set.
  ch4_relay_listen: [
    // Frame the whole room: ODELL (5,4), the desk (7..10,4), WREN (11,4), FLORA (13,3).
    camera(AT.relayRoom.x, AT.relayRoom.y, 30),
    face(N.director, "toPlayer"),
    emote(N.director, "!"),
    say("A visitor! Welcome to the ROOT RELAY's open day.", ODELL),
    say("I'm DR. MAREN ODELL. I run this place. Or it runs me.", ODELL),
    say("Under the valley, fungal threads join root to root.", ODELL),
    say("Trees pass sugar and water along them. Miles of it.", ODELL),
    say("Our sensors are buried in that web. We listen to it.", ODELL),
    face(N.floraRelay, "toPlayer"),
    emote(N.floraRelay, "♪"),
    say("And it is SO romantic. Isn't it, darling?", FLORA),
    say("FLORA VANCE. Florist. Patron. Mild celebrity.", FLORA),
    say("I paid for the new sensors. They're rose gold. Naturally.", FLORA),
    face(N.wren, "toPlayer"),
    emote(N.wren, "?"),
    say("Sorry, sorry. Is something in your bag... humming?", WREN),
    say("I'm WREN. I keep the sensors talking.", WREN),
    say("Mostly they talk about earthworms.", WREN),
    say("That hum... it's the same pitch the bog makes at night.", WREN),
    emote("player", "!"),
    say("DR. VALE sent it! Put it on the listening desk.", ODELL),
    face("player", "up"),
    wait(20),
    say("<PLAYER> set the CENTURYHEART SEED down on the listening desk."),
    wait(40),
    say("The consoles tick and murmur. The needles barely move."),
    wait(50),
    say("Then everything goes quiet."),
    wait(40),
    { op: "shake", frames: 50 },
    still("relay_pulse"),
    { op: "sfx", id: "pulse" },
    wait(40),
    say("Every needle on every console swings hard over at once."),
    say("Deep, deep under the valley, something enormous answers."),
    say("One pulse. Like a heartbeat, through the bedrock."),
    wait(30),
    stillClear,
    wait(30),
    emote(N.director, "..."),
    say("That reading's from below the deepest sensor.", ODELL),
    say("Below the roots. That isn't possible.", ODELL),
    face(N.wren, "up"),
    wait(30),
    say("WREN slides her headphones down. Very quietly, she says:"),
    say("...It's answering.", WREN),
    face(N.wren, "toPlayer"),
    say("Not an echo. An answer. Your seed called, and it called back.", WREN),
    say("<PLAYER>, could I borrow the seed? Just one night.", WREN),
    say("A few readings. Back by breakfast. Promise.", WREN),
    face(N.director, "right"),
    say("Absolutely not, WREN.", ODELL),
    say("That seed stays with its keeper. We listen. We don't poke.", ODELL),
    emote(N.wren, "♪"),
    say("Course! Can't blame a girl for asking.", WREN),
    say("<PLAYER> took the seed back. It's as warm as a teacup."),
    face(N.floraRelay, "toPlayer"),
    say("Did everyone else feel that? Every petal on me stood up!", FLORA),
    say("Darling, you've upstaged me at my own open day.", FLORA),
    say("I ought to be furious. I'm enchanted.", FLORA),
    say("Come and battle me at my CONSERVATORY.", FLORA),
    say("It reopens this afternoon, darling.", FLORA),
    say("Bring your little sprouts. I'll be devastating.", FLORA),
    moveNpc(N.floraRelay, "down", "down", "down"),
    { op: "hideNpc", npc: N.floraRelay },
    cameraReset(30),
    flag("relay_listened"),
    face(N.wren, "toPlayer"),
    say("If it ever hums like that again, come tell me first. Okay?", WREN),
  ],

  // The director and FLORA, if talked to first: both start the beat.
  ch4_director: [
    face(N.director, "toPlayer"),
    ifFlags({ relay_listened: true }, [
      say("Three write-ups, and it still reads like a dream.", ODELL),
      say("Tell IMOGEN VALE what happened here. Every word.", ODELL),
    ], [call("ch4_relay_listen")]),
  ],
  ch4_flora_relay: [
    face(N.floraRelay, "toPlayer"),
    say("Not now, darling! The doctor's about to be clever.", FLORA),
    call("ch4_relay_listen"),
  ],

  // --- The grunt at the mast (gc_enter, after the RELAY) ----------------------------
  ch4_watcher: [
    face(N.gcGrunt, "toPlayer"),
    say("Move along. I'm... birdwatching. The mast has birds on it."),
  ],
  ch4_grunt_watch: [
    wait(20),
    camera(AT.relayMast.x, AT.relayMast.y, 60),
    wait(20),
    say("By the foot of the RELAY's mast, someone stands very still."),
    say("A grey work coat. Grafting tape around one sleeve."),
    emote(N.gcGrunt, "..."),
    wait(20),
    say("They're writing something down, eyes fixed on the mast."),
    face(N.gcGrunt, "down"),
    wait(20),
    moveNpc(N.gcGrunt, "right", "right", "right", "right"),
    { op: "hideNpc", npc: N.gcGrunt },
    flag("ch4_grunt_seen"),
    cameraReset(50),
    emote("player", "?"),
  ],

  // --- The NURSERY GARDEN --------------------------------------------------------
  // PEONY keeps the counter (boarding); LUPIN keeps the yard (q_first_seed).
  gn_keeper: [
    face(N.peony, "toPlayer"),
    ifFlags({ nursery_met: false }, [
      say("Welcome to the NURSERY GARDEN, pet. I'm PEONY.", PEONY),
      say("My LUPIN's out in the yard. Forty years we've kept this place.", PEONY),
      say("Leave two QUICKENED with us, and we'll mind them.", PEONY),
      say("They grow a bit with the days. No new tricks, mind.", PEONY),
      say("If the two get on, and the bees agree, they may set seed.", PEONY),
      say("Pollen, flower, seed. Oldest trick in the garden.", PEONY),
      flag("nursery_met"),
    ]),
    { op: "nursery" },
  ],

  // Rival battle 3: BRAM, the first visit after the RELAY. The NURSERY's onEnter.
  rival_3: [
    // The player comes in at the door (4,7); BRAM is at the counter's end (9,4).
    // Frame PEONY (2,2) and BRAM together.
    camera(6, 4, 30),
    wait(10),
    say("A STRONGER seed. Now.", BRAM),
    { op: "music", id: "rival_appears" },
    face(N.peony, "right"),
    say("You can't hurry a seed, love. Nobody can.", PEONY),
    say("Then push it. Everything can be hurried. You push harder.", BRAM),
    say("Pushing's how you snap a stem, lad.", LUPIN),
    { op: "movePlayer", path: ["up", "up", "up"] },
    emote(N.bram, "!"),
    face(N.bram, "toPlayer"),
    face("player", "right"),
    say("...You. You're everywhere I go.", BRAM),
    say("Behind him, his partner hunches in its GRAFT COLLAR."),
    say("It's bigger than last time. Its leaves are paler."),
    say("Don't. It's stronger. That's what counts.", BRAM),
    say("It has to be stronger. Show them.", BRAM),
    cameraReset(20),
    // A story battle you may lose: the scene plays on either way.
    byStarter((line) => [{ op: "battle", trainer: `rival_3_${COUNTER[line]}`, canLose: true }]),
    { op: "ifLastBattle", result: "won", then: [
      wait(20),
      emote(N.bram, "..."),
      say("...It flinched. When I shouted, it flinched.", BRAM),
      say("It never used to do that.", BRAM),
    ], else: [
      say("See? Stronger. That's all that matters.", BRAM),
      wait(20),
      emote(N.bram, "..."),
      say("...Then why won't it look at me?", BRAM),
    ] },
    wait(30),
    say("My father says the collar is a kindness.", BRAM),
    say("It saves them from deciding.", BRAM),
    emote("player", "..."),
    say("Don't look at me like that. I said DON'T.", BRAM),
    // Out through the yard, straight through the keepers' hedge at 13,4.
    camera(9, 4, 30),
    moveNpc(N.bram, "right", "right", "right"),
    { op: "sfx", id: "bump" },
    { op: "shake", frames: 10 },
    moveNpc(N.bram, "right", "right", "down", "down", "down"),
    { op: "hideNpc", npc: N.bram },
    flag("rival_3_done"), // the hedge shows trampled from here (legendWhen)
    wait(20),
    cameraReset(30),
    { op: "restoreMusic" },
    say("BRAM shoved straight through the keepers' hedge."),
    say("Somewhere at the back of the yard, a door bangs."),
    wait(30),
    say("Twenty years, that hedge. Clean through it.", LUPIN),
    say("He's not a bad lad. He's a frightened one.", PEONY),
    say("I know the look. I raised three of them.", PEONY),
    // A story battle you may lose shouldn't leave the party wilted.
    say("Here, pet. Your lot look parched.", PEONY),
    say("PEONY gives your QUICKENED a long drink from her watering can."),
    { op: "heal" },
    call("nursery_shears"),
  ],
  nursery_shears: [
    // LUPIN comes in from the yard (11,2) to stand beside the player (4,4).
    moveNpc(N.lupin, "down", "down", "left", "left", "left", "left", "left", "left"),
    face(N.lupin, "toPlayer"),
    face("player", "right"),
    say("Here. You stood up for us. Take these.", LUPIN),
    give("pruning_shears"),
    say("My old GARDEN SHEARS. Sharp as the day I bought them.", LUPIN),
    say("The old HEDGEROW path's gone wild since the bloom.", LUPIN),
    say("Brambles everywhere. Face one and snip. That's PRUNE.", LUPIN),
    say("Cut just above a bud, mind. New shoots grow from there.", LUPIN),
    flag("got_shears"),
  ],

  // --- Conservatory 3: FLORA VANCE ------------------------------------------------
  flora: [
    face(N.flora, "toPlayer"),
    ifFlags({ beat_flora: true }, [
      ifFlags({ quest_fan_mail_started: true, quest_fan_mail_done: false, fan_letter_delivered: false }, [
        { op: "ifHasItem", item: "fan_letter", then: [call("q_fan_mail_flora")], else: [call("flora_after")] },
      ], [call("flora_after")]),
    ], [
      emote(N.flora, "♪"),
      say("Darling! You came! And you found your way through my roses.", FLORA),
      say("Everyone gets lost. I designed it that way. I'm a genius.", FLORA),
      say("Do you know, a rose has no thorns at all?", FLORA),
      say("They're PRICKLES. Thorns are stems. Prickles are skin.", FLORA),
      say("Either way, darling, they draw blood.", FLORA),
      say("Wild roses have five petals. Mine have forty.", FLORA),
      say("Thousands of years of breeding. Beauty takes WORK.", FLORA),
      say("Now. Be a dear, and lose beautifully.", FLORA),
      { op: "battle", trainer: "flora" },
      { op: "ifLastBattle", result: "won", then: [
        wait(20),
        emote(N.flora, "..."),
        say("No.", FLORA),
        say("No no no no NO.", FLORA),
        { op: "shake", frames: 16 },
        say("I'm going to cry. I'm crying. Look. Real tears.", FLORA),
        say("Mascara is NOT built for this!", FLORA),
        wait(40),
        say("FLORA VANCE sobs into a silk handkerchief. Loudly."),
        say("Her MOTH ORCHID droops its petals over her shoulder."),
        wait(30),
        say("...Fine! FINE. Take it. The ROSE MARK.", FLORA),
        { op: "giveMark", mark: "rose_mark" },
        say("Pressed from the very first rose I ever grew. I was seven.", FLORA),
        wait(20),
        emote(N.flora, "♪"),
        say("Wasn't that MAGNIFICENT, though? The papers will adore it.", FLORA),
        say("\"FLORA VANCE, gracious in defeat.\" I'll write it myself.", FLORA),
        say("That pulse at the RELAY... my orchids haven't stopped trembling.", FLORA),
        say("Whatever answered you, darling, it was BIG.", FLORA),
      ] },
    ]),
  ],
  flora_after: [
    say("I've redone my face. You'd never know. Would you? Don't answer.", FLORA),
    say("MOTH ORCHIDS grow on trees in the wild, not in soil!", FLORA),
    say("Green roots, hanging in the air. Drinking the rain.", FLORA),
  ],

  // --- Chapter end: leaving the CONSERVATORY with the ROSE MARK -----------------
  // glasshouse_city onEnter, when beat_flora and relay_listened.
  ch4_end: [
    wait(20),
    ...ring,
    say("Behind you, a telephone rings out through the CONSERVATORY door."),
    say("Darling! Telephone! It's for you! A DR. VALE?", FLORA),
    { op: "call", script: "ch4_vale_call" },
  ],
  ch4_vale_call: [
    say("<PLAYER>? It's DR. VALE! Three MARKS! THREE!", VALE),
    say("FLORA VANCE! She made me cry once. At a flower show.", VALE),
    { op: "music", id: "prologue_bloom" },
    say("But listen. MAREN ODELL rang me from the RELAY.", VALE),
    say("She told me about the pulse.", VALE),
    wait(30),
    say("Something under the valley answered your seed, <PLAYER>.", VALE),
    say("Not the roots. Under them. Something that big, and that old.", VALE),
    emote("player", "..."),
    say("And there's more. Have you heard of CEDARHALLOW?", VALE),
    say("North, in the old cedars, is the BURNT STAND.", VALE),
    say("The fire-cones opened there last week.", VALE),
    say("And nothing was burning.", VALE),
    { op: "shake", frames: 30 },
    wait(30),
    say("Those cones only open in a fire. Only ever.", VALE),
    say("Something is waking up all the old seeds, <PLAYER>.", VALE),
    say("Keep yours close. And mind how you go.", VALE),
    flag("ch4_done"),
    flag("slice_done"),
    wait(60),
    { op: "endSlice" },
  ],
};
