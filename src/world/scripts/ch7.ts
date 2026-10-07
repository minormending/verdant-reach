// Chapter 7's staging and progression (docs/CH7.md §1 and §6).
// Dialogue placeholders preserve scene length and speakers for the writing pass.
import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (): ScriptCmd => ({ op: "cameraReset", frames: 30 });

const emitter = (n: number): ScriptCmd[] => [
  ifFlags({ lodge_stair_open: true }, [
    ifFlags({ [`emitter_${n}_off`]: true }, [
      face(`emitter_${n}`, "up"),
      say("TODO(text): This signal emitter is already silent.", "NARRATOR"),
    ], [
      ifFlags({ [`beat_grunt_b1_${n}`]: true }, [
        say("TODO(text): The emitter forces the lake's plants awake.", "NARRATOR"),
        face(`emitter_${n}`, "up"),
        { op: "sfx", id: "select" },
        wait(20),
        flag(`emitter_${n}_off`),
        say("TODO(text): The broadcast weakens as the emitter switches off.", "NARRATOR"),
      ], [
        say("TODO(text): Defeat the guard before touching the emitter.", "NARRATOR"),
      ]),
    ]),
    ifFlags({ emitter_1_off: true, emitter_2_off: true, emitter_3_off: true, emitters_off: false }, [
      flag("emitters_off"),
      { op: "sfx", id: "door" },
      camera(21, 2),
      say("TODO(text): All three emitters are off; the lower stairs open.", "NARRATOR"),
      cameraReset(),
    ]),
  ]),
];

export const ch7Scripts: Scripts = {
  ch7_pass_ranger: [
    face("pass_ranger", "toPlayer"),
    say("TODO(text): The north pass is snowed in.", "RANGER"),
    say("TODO(text): Wait for the snow to clear before climbing to Larchmere.", "RANGER"),
  ],
  ch7_town_enter: [call("ch7_arrival"), call("ch7_end")],
  ch7_arrival: [
    ifFlags({ ch6_done: true, ch7_arrived: false }, [
      camera(35, 17, 60),
      say("TODO(text): Larchmere stands beside a red alpine lake.", "NARRATOR"),
      say("TODO(text): Hundreds of Quickened churn the water.", "NARRATOR"),
      camera(26, 9, 60),
      say("TODO(text): Signe's Conservatory is shut while the lake screams.", "NARRATOR"),
      camera(26, 22, 60),
      say("TODO(text): The Lakeside Lodge overlooks the restless shore.", "NARRATOR"),
      flag("ch7_arrived"),
      flag("visited_larchmere"),
      cameraReset(),
    ]),
  ],
  ch7_cons7_door: [
    ifFlags({ lake_calmed: false }, [
      { op: "sfx", id: "bump" },
      say("TODO(text): Signe will not battle while the lake is screaming.", "NARRATOR"),
      say("TODO(text): Calm Bloom Lake before entering the Conservatory.", "NARRATOR"),
      movePlayer("down"),
    ]),
  ],
  ch7_crimson_lily: [
    ifFlags({ ch7_arrived: true, crimson_lily_done: false }, [
      say("TODO(text): A crimson giant water lily waits on the islet.", "NARRATOR"),
      say("TODO(text): Its unusual colour marks it as a sport.", "NARRATOR"),
      say("TODO(text): The furious lily rises to challenge the player.", "NARRATOR"),
      { op: "wildBattle", species: "giant_water_lily", level: 40, sport: true, canLose: true },
      // Catch, wilt, flee and even a lost battle all consume the sole encounter.
      flag("crimson_lily_done"),
      { op: "hideNpc", npc: "crimson_lily" },
      say("TODO(text): The crimson lily has left the islet for good.", "NARRATOR"),
    ]),
  ],
  ch7_lodge_grunt: [
    ifFlags({ ch7_arrived: true, lodge_grunt_seen: false }, [
      face("grunt_lodge", "toPlayer"),
      say("TODO(text): A Rootstock grunt watches the lodge door.", "NARRATOR"),
      say("TODO(text): The grunt orders the player away from the bookcase.", "GRUNT"),
      { op: "battle", trainer: "grunt_lodge" },
      { op: "ifLastBattle", result: "won", then: [
        say("TODO(text): The defeated grunt retreats from the lodge.", "GRUNT"),
        flag("lodge_grunt_seen"),
        { op: "hideNpc", npc: "grunt_lodge" },
      ] },
    ]),
  ],
  ch7_bookcase: [
    ifFlags({ lodge_grunt_seen: true }, [
      ifFlags({ lodge_stair_open: false }, [
        say("TODO(text): Fresh scratches show where the bookcase slides.", "NARRATOR"),
        { op: "sfx", id: "door" },
        flag("lodge_stair_open"),
        say("TODO(text): The bookcase reveals stairs into a Rootstock hideout.", "NARRATOR"),
      ]),
      { op: "warp", to: "rootstock_hideout_1", x: 2, y: 17, facing: "up" },
    ], [
      say("TODO(text): The shelf holds books about alpine plants.", "NARRATOR"),
      say("TODO(text): Something has scuffed the floor beneath it.", "NARRATOR"),
    ]),
  ],
  ch7_emitter_1: emitter(1),
  ch7_emitter_2: emitter(2),
  ch7_emitter_3: emitter(3),
  calloway: [
    ifFlags({ emitters_off: true }, [
      ifFlags({ beat_calloway: true }, [call("ch7_calloway_after")], [
        face("calloway", "toPlayer"),
        say("TODO(text): The grey-coated doctor recognises the seed's keeper.", "DR. CALLOWAY"),
        say("TODO(text): She names herself Dr. Calloway.", "DR. CALLOWAY"),
        say("TODO(text): Forced growth is the purpose of her lake experiment.", "DR. CALLOWAY"),
        say("TODO(text): Calloway challenges the player with her grafted plants.", "DR. CALLOWAY"),
        { op: "battle", trainer: "calloway" },
        { op: "ifLastBattle", result: "won", then: [call("ch7_calloway_after")] },
      ]),
    ], [
      say("TODO(text): Switch off all three emitters before confronting the doctor.", "NARRATOR"),
    ]),
  ],
  ch7_calloway_after: [
    ifFlags({ beat_calloway: true, calloway_escaped: false }, [
      say("TODO(text): Calloway insists that growth cannot wait for the seasons.", "DR. CALLOWAY"),
      say("TODO(text): Her research belongs to Rootstock, and she will continue it.", "DR. CALLOWAY"),
      flag("beat_calloway"),
      camera(15, 3),
      // (8,5) -> (15,5) -> (15,3), just below the escape tunnel.
      moveNpc("calloway", ...steps("right", 7), ...steps("up", 2)),
      { op: "hideNpc", npc: "calloway" },
      flag("calloway_escaped"),
      say("TODO(text): Calloway escapes through the back tunnel.", "NARRATOR"),
      say("TODO(text): She has left her research files on the console.", "NARRATOR"),
      cameraReset(),
    ]),
  ],
  ch7_files: [
    ifFlags({ beat_calloway: true }, [
      ifFlags({ files_read: false }, [
        { op: "still", image: "relay_pulse" },
        say("TODO(text): Rootstock's files record its first forced Quickening.", "NARRATOR"),
        say("TODO(text): That experiment was months before the Long Bloom.", "NARRATOR"),
        wait(30),
        say("TODO(text): Rootstock caused the Long Bloom; it was no natural awakening.", "NARRATOR"),
        emote("player", "!"),
        say("TODO(text): The player sends the evidence to Dr. Vale.", "NARRATOR"),
        { op: "stillClear" },
        flag("files_read"),
        flag("lake_calmed"),
        { op: "sfx", id: "door" },
        say("TODO(text): With the broadcast ended, Bloom Lake grows quiet.", "NARRATOR"),
        say("TODO(text): The files reveal how to open the tunnel back to Larchmere.", "NARRATOR"),
      ], [
        say("TODO(text): The files prove that Rootstock caused the Long Bloom.", "NARRATOR"),
      ]),
    ], [
      say("TODO(text): Calloway guards the research files.", "NARRATOR"),
    ]),
  ],
  signe: [
    face("signe", "toPlayer"),
    ifFlags({ beat_signe: true }, [
      call("ch7_signe_after"),
      say("TODO(text): Signe thanks the player for restoring the lake's rest.", "SIGNE"),
    ], [
      ifFlags({ lake_calmed: true }, [
        say("TODO(text): The lake is quiet, and Signe welcomes the player.", "SIGNE"),
        say("TODO(text): Winter lets plants rest before their next growth.", "SIGNE"),
        say("TODO(text): Signe challenges the player with her Frost team.", "SIGNE"),
        { op: "battle", trainer: "signe" },
        { op: "ifLastBattle", result: "won", then: [
          say("TODO(text): Signe praises the player's patience and care.", "SIGNE"),
          say("TODO(text): She presents the Snowdrop Mark.", "SIGNE"),
          { op: "giveMark", mark: "snowdrop_mark" },
          call("ch7_signe_after"),
        ] },
      ], [
        say("TODO(text): Signe refuses to battle while the lake is screaming.", "SIGNE"),
      ]),
    ]),
  ],
  ch7_signe_after: [
    ifFlags({ beat_signe: true, got_cold_snap_signe: false }, [
      say("TODO(text): Signe offers a Cold Snap to help a bulb grow.", "SIGNE"),
      give("cold_snap"),
      flag("got_cold_snap_signe"),
      say("TODO(text): Use the Cold Snap on a Snow Bulb to open its shoot.", "SIGNE"),
      say("TODO(text): A season of cold can be the start of new life.", "SIGNE"),
    ]),
  ],
  ch7_end: [
    ifFlags({ beat_signe: true, got_cold_snap_signe: true, ch7_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("TODO(text): Dr. Vale calls as the player returns to Larchmere.", "NARRATOR"),
      say("TODO(text): Vale has read the files sent from the hideout.", "DR. VALE"),
      { op: "music", id: "prologue_bloom" },
      say("TODO(text): Vale admits she knew Mercer Thorne.", "DR. VALE"),
      say("TODO(text): They studied together before he founded Rootstock.", "DR. VALE"),
      wait(30),
      say("TODO(text): Thorne offered Vale a place, and she turned him down.", "DR. VALE"),
      say("TODO(text): She regrets keeping their history from the player.", "DR. VALE"),
      say("TODO(text): The Root Relay in Glasshouse City has gone silent.", "DR. VALE"),
      emote("player", "!"),
      say("TODO(text): Vale asks the player to investigate the Relay next.", "DR. VALE"),
      flag("ch7_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch7_lodge_keeper: [
    face("lodge_keeper", "toPlayer"),
    ifFlags({ lake_calmed: true }, [
      say("TODO(text): The keeper is relieved that the lake can rest again.", "LODGE KEEPER"),
      say("TODO(text): The lodge feels like home with Rootstock gone.", "LODGE KEEPER"),
    ], [
      say("TODO(text): The nervous keeper says the rooms are occupied.", "LODGE KEEPER"),
      say("TODO(text): Strange guests have been using the bookcase.", "LODGE KEEPER"),
    ]),
  ],
  ch7_gh_visitor: [
    say("TODO(text): The visitor shelters alpine plants from the lake's noise.", "VISITOR"),
    say("TODO(text): Even mountain plants need a quiet season to rest.", "VISITOR"),
  ],
  ch7_market_visitor: [
    say("TODO(text): The visitor saw a crimson lily on the central islet.", "VISITOR"),
    say("TODO(text): A raft can reach it across Bloom Lake.", "VISITOR"),
  ],
  ch7_market_kid: [
    say("TODO(text): The kid hopes the lake will be quiet enough to skate again.", "KID"),
  ],
  ch7_market_pods: [
    say("TODO(text): The clerk offers pods and water for the mountain journey.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch7_market_care: [
    say("TODO(text): The clerk offers plant care and rain jars.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] },
  ],
};
