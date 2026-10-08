// Chapter 7's staging and progression (docs/CH7.md §1 and §6).
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
// Narration has no speaker (as in ch5 and ch6).
import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, give, ifFlags, lockedDoor, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (): ScriptCmd => ({ op: "cameraReset", frames: 30 });

const emitter = (n: number): ScriptCmd[] => [
  ifFlags({ lodge_stair_open: true }, [
    ifFlags({ [`emitter_${n}_off`]: true }, [
      say("The EMITTER is silent. Its little lights have all gone dark."),
    ], [
      ifFlags({ [`beat_grunt_b1_${n}`]: true }, [
        say("A SIGNAL EMITTER. It hums a pulse into the roots, forcing the lake awake."),
        { op: "sfx", id: "select" },
        wait(20),
        flag(`emitter_${n}_off`),
        say("<PLAYER> throws the switch. The hum dies, and the broadcast weakens."),
      ], [
        say("Not with its guard watching. Deal with the grunt first."),
      ]),
    ]),
    ifFlags({ emitter_1_off: true, emitter_2_off: true, emitter_3_off: true, emitters_off: false }, [
      flag("emitters_off"),
      { op: "sfx", id: "door" },
      camera(21, 2),
      say("All three EMITTERS are silent. With a grinding sound, the stairs down open."),
      cameraReset(),
    ]),
  ]),
];

export const ch7Scripts: Scripts = {
  ch7_pass_ranger: [
    face("pass_ranger", "toPlayer"),
    say("The LARCH PASS is snowed in. Waist-deep, past the scree.", "RANGER"),
    say("Wait for the thaw before you climb to LARCHMERE. It won't be long.", "RANGER"),
  ],
  ch7_town_enter: [call("ch7_arrival"), call("ch7_end")],
  ch7_arrival: [
    ifFlags({ ch6_done: true, ch7_arrived: false }, [
      camera(35, 17, 60),
      say("LARCHMERE, high in the peaks. Below the town, BLOOM LAKE runs red."),
      say("Hundreds of QUICKENED thrash in the water. The whole lake sounds furious."),
      camera(26, 9, 60),
      say("SIGNE's CONSERVATORY is shuttered tight. She won't battle while the lake screams."),
      camera(26, 22, 60),
      say("On the shore, the LAKESIDE LODGE watches the water. Its curtains are drawn."),
      flag("ch7_arrived"),
      flag("visited_larchmere"),
      cameraReset(),
    ]),
  ],
  ch7_cons7_door: [
    ifFlags({ lake_calmed: false }, [
      { op: "sfx", id: "bump" },
      say("Shut. A note: \"NO BATTLES WHILE THE LAKE IS SCREAMING. -SIGNE.\""),
      say("Whatever's wrong with BLOOM LAKE, it needs putting right first."),
      movePlayer("down"),
    ]),
  ],
  ch7_crimson_lily: [
    ifFlags({ ch7_arrived: true, crimson_lily_done: false }, [
      say("A GIANT WATER LILY rests by the islet. Its flower is red to the heart."),
      { op: "still", image: "crimson_lily" },
      say("These lilies open white, then turn pink. This one opened crimson: a SPORT."),
      say("Its great pads heave. Forced awake and furious, the lily rears up!"),
      { op: "stillClear" },
      { op: "wildBattle", species: "giant_water_lily", level: 40, sport: true, canLose: true },
      // Catch, wilt, flee and even a lost battle all consume the sole encounter.
      flag("crimson_lily_done"),
      { op: "hideNpc", npc: "crimson_lily" },
      say("Only ripples are left by the islet. The CRIMSON LILY won't be back."),
    ]),
  ],
  ch7_lodge_grunt: [
    ifFlags({ ch7_arrived: true, lodge_grunt_seen: false }, [
      face("grunt_lodge", "toPlayer"),
      say("A grey coat by the door. ROOTSTOCK, standing guard in the lodge."),
      say("Lodge is full. And keep away from that bookcase. Not that it matters!", "GRUNT"),
      { op: "battle", trainer: "grunt_lodge" },
      { op: "ifLastBattle", result: "won", then: [
        say("Fine! I'm going. I was never here. Neither was the bookcase.", "GRUNT"),
        flag("lodge_grunt_seen"),
        { op: "hideNpc", npc: "grunt_lodge" },
      ] },
    ]),
  ],
  ch7_bookcase: [
    ifFlags({ lodge_grunt_seen: true }, [
      ifFlags({ lodge_stair_open: false }, [
        say("Fresh scratches curve across the floor. This bookcase slides."),
        { op: "sfx", id: "door" },
        flag("lodge_stair_open"),
        say("It rolls aside. Stairs lead down under the lodge, to a ROOTSTOCK hideout."),
      ]),
      { op: "warp", to: "rootstock_hideout_1", x: 2, y: 17, facing: "up" },
    ], [
      say("ALPINE FLOWERS. ROCK GARDENS. A whole shelf of mountain plants."),
      say("The floor in front of it is badly scuffed. Odd, for a bookcase."),
    ]),
  ],
  ch7_emitter_1: emitter(1),
  ch7_emitter_2: emitter(2),
  ch7_emitter_3: emitter(3),
  calloway: [
    ifFlags({ emitters_off: true }, [
      ifFlags({ beat_calloway: true }, [call("ch7_calloway_after")], [
        face("calloway", "toPlayer"),
        say("The botanist with the seed. I did wonder.", "DR. CALLOWAY"),
        say("We skipped introductions on the pier. I'm DR. CALLOWAY.", "DR. CALLOWAY"),
        say("The lake is a trial. One signal, and every plant in it grows on my schedule.", "DR. CALLOWAY"),
        say("Mine are grafted. They don't wait for spring. Shall we?", "DR. CALLOWAY"),
        { op: "battle", trainer: "calloway" },
        { op: "ifLastBattle", result: "won", then: [call("ch7_calloway_after")] },
      ]),
    ], [
      say("She doesn't look up. The EMITTERS upstairs still hum. Switch all three off first."),
    ]),
  ],
  ch7_calloway_after: [
    ifFlags({ beat_calloway: true, calloway_escaped: false }, [
      say("Seasons are a delay. Nothing more. Growth shouldn't wait for them.", "DR. CALLOWAY"),
      say("This work belongs to ROOTSTOCK. One lost battle doesn't end it.", "DR. CALLOWAY"),
      flag("beat_calloway"),
      camera(15, 3),
      // (8,5) -> (15,5) -> (15,3), just below the escape tunnel.
      moveNpc("calloway", ...steps("right", 7), ...steps("up", 2)),
      { op: "hideNpc", npc: "calloway" },
      flag("calloway_escaped"),
      say("DR. CALLOWAY steps into a tunnel at the back, and is gone."),
      say("In her hurry, she's left her files on the console."),
      cameraReset(),
    ]),
  ],
  ch7_files: [
    ifFlags({ beat_calloway: true }, [
      ifFlags({ files_read: false }, [
        { op: "still", image: "rootstock_files" },
        say("CALLOWAY's files. TRIAL ONE: the first forced QUICKENING."),
        say("The date on it is months BEFORE the LONG BLOOM."),
        wait(30),
        say("The plants didn't wake on their own. ROOTSTOCK started the QUICKENING."),
        emote("player", "!"),
        say("<PLAYER> copies out the dates, to send to VALE at the HERBARIUM."),
        { op: "stillClear" },
        flag("files_read"),
        flag("lake_calmed"),
        { op: "sfx", id: "door" },
        say("Far above, the broadcast dies away. BLOOM LAKE falls quiet at last."),
        say("Tucked in the files: a plan of the back tunnel. It comes out in LARCHMERE."),
      ], [
        say("The files are clear. ROOTSTOCK started the QUICKENING, months before the LONG BLOOM."),
      ]),
    ], [
      say("Files, stacked on the console. DR. CALLOWAY stands between you and them."),
    ]),
  ],
  signe: [
    face("signe", "toPlayer"),
    ifFlags({ beat_signe: true }, [
      call("ch7_signe_after"),
      say("The lake sleeps again. As it should. Thank you.", "SIGNE"),
    ], [
      ifFlags({ lake_calmed: true }, [
        say("Quiet out there now. Good. Come in.", "SIGNE"),
        say("Up here, winter is rest. Plenty of plants need it before they grow again.", "SIGNE"),
        say("Let's see how you do in the cold.", "SIGNE"),
        { op: "battle", trainer: "signe" },
        { op: "ifLastBattle", result: "won", then: [
          say("Patient. Careful. You'd do well on a mountain.", "SIGNE"),
          say("The SNOWDROP MARK. It flowers while the snow's still down.", "SIGNE"),
          { op: "giveMark", mark: "snowdrop_mark" },
          call("ch7_signe_after"),
        ] },
      ], [
        say("Not while the lake is screaming. Go and find out why.", "SIGNE"),
      ]),
    ]),
  ],
  ch7_signe_after: [
    ifFlags({ beat_signe: true, got_cold_snap_signe: false }, [
      say("Take this too. A COLD SNAP. Some bulbs won't grow without one.", "SIGNE"),
      give("cold_snap"),
      flag("got_cold_snap_signe"),
      say("Use it on a SNOW BULB. A snowdrop needs a cold winter before it flowers.", "SIGNE"),
      say("Cold first. Then growth. That's the order of things.", "SIGNE"),
    ]),
  ],
  ch7_end: [
    ifFlags({ beat_signe: true, got_cold_snap_signe: true, ch7_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("A telephone rings in the LAKESIDE LODGE. The keeper waves. It's for <PLAYER>."),
      say("<PLAYER>? I've read the files. Twice. Three times, actually.", "VALE"),
      { op: "music", id: "prologue_bloom" },
      say("There's something I should have told you. I knew MERCER THORNE.", "VALE"),
      say("We studied together, long before ROOTSTOCK. He was brilliant.", "VALE"),
      wait(30),
      say("When he started ROOTSTOCK, he offered me a place. I said no.", "VALE"),
      say("I should have told you sooner. I'm sorry. I hoped I was wrong about him.", "VALE"),
      say("And now the ROOT RELAY in GLASSHOUSE CITY has gone silent. Not a sound.", "VALE"),
      emote("player", "!"),
      say("Will you go and find out why? Carefully, <PLAYER>. Please.", "VALE"),
      flag("ch7_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch7_lodge_keeper: [
    face("lodge_keeper", "toPlayer"),
    ifFlags({ lake_calmed: true }, [
      say("Hear that? Nothing. The lake's resting again. Thank you.", "LODGE KEEPER"),
      say("No more grey coats on the stairs. It feels like my lodge again.", "LODGE KEEPER"),
    ], [
      say("R-rooms? No. All taken. Every one. Sorry.", "LODGE KEEPER"),
      say("The guests keep borrowing the bookcase. Not the books. The bookcase.", "LODGE KEEPER"),
    ]),
  ],
  ch7_gh_visitor: [
    say("I've brought my alpines in here, away from that racket on the lake.", "VISITOR"),
    say("Up here, plants sleep for months under the snow. They need the rest.", "VISITOR"),
  ],
  ch7_market_visitor: [
    say("Out by the islet in the lake, there's a lily. CRIMSON! I've never seen one.", "VISITOR"),
    say("You could reach it on a raft. If you're braver than me.", "VISITOR"),
  ],
  ch7_market_kid: [
    say("When the lake calms down, I'm going skating. As soon as it freezes!", "KID"),
  ],
  ch7_market_pods: [
    say("Heading up the mountain? Pods, fresh water and compost. Pack warm.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch7_market_care: [
    say("Frost is hard on leaves. I've plant care, and RAIN JARS.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] },
  ],
  // The four LARCHMERE chalets are private homes.
  lm_door_1: lockedDoor("Locked. Two pairs of skis lean by the door, freshly waxed."),
  lm_door_2: lockedDoor("Locked. A window box of EDELWEISS sits under the sill, woolly and white."),
  lm_door_3: lockedDoor("Locked. Firewood is stacked right up to the eaves."),
  lm_door_4: lockedDoor("Locked. A note: \"Gone to watch the larches turn gold. Back for supper.\""),
};
