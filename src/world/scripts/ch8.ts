// Chapter 8's takeover, patch bay and progression (docs/CH8.md §1, §4 and §6).
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
// Narration has no speaker (as in ch5–ch7).
import type { ScriptCmd } from "../../contracts";
import { face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const pay = (amount: number): ScriptCmd => ({ op: "giveMoney", amount });
const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (): ScriptCmd => ({ op: "cameraReset", frames: 30 });

const staticReset: ScriptCmd[] = [
  flag("patch_1", false), flag("patch_2", false),
  { op: "sfx", id: "bump" },
  say("STATIC! Every patch light flickers out. The sequence has reset."),
];

const console = (id: "a" | "b" | "c"): ScriptCmd[] => [
  ifFlags({ relay_patched: true }, [
    say("The patch holds. The signal runs clean up to the roof."),
  ], [
    ifFlags(id === "c" ? { patch_1: false, patch_2: false }
      : id === "a" ? { patch_1: true, patch_2: false }
        : { patch_1: true, patch_2: true },
    id === "b" ? [
      flag("relay_patched"),
      { op: "sfx", id: "door" },
      camera(15, 2),
      say("The last lead clicks home. Across the bay, the roof stair grinds open."),
      cameraReset(),
    ] : [
      flag(id === "c" ? "patch_1" : "patch_2"),
      { op: "sfx", id: "select" },
      say(`CONSOLE ${id.toUpperCase()} takes the lead. A small light glows green.`),
    ], staticReset),
  ]),
];

export const ch8Scripts: Scripts = {
  ch8_arrival: [
    ifFlags({ ch7_done: true, ch8_started: false }, [
      camera(5, 6, 60),
      say("GLASSHOUSE CITY has gone still. Every QUICKENED under the dome stands frozen."),
      say("Grey coats crowd the ROOT RELAY's door. ROOTSTOCK has seized it."),
      say("Someone has turned the sensors round. They don't listen now. They carry MERCER's command."),
      say("Down every root in the region, each QUICKENED hears one voice: BE STILL."),
      flag("ch8_started"),
      flag("ch8_takeover"),
      cameraReset(),
    ]),
  ],
  ch8_relay_door: [
    ifFlags({ ch8_started: true, got_keycard: false }, [
      say("Locked tight. The panel by the door blinks: RELAY KEYCARD REQUIRED."),
      movePlayer("down"),
    ]),
  ],
  // Cond is conjunction-only. Refresh the derived takeover flag on every lobby
  // entry so visibleWhen hides staff exactly while ch8_started && !beat_wren.
  ch8_relay_enter: [
    ifFlags({ ch8_started: true, beat_wren: false }, [
      flag("ch8_takeover"),
    ], [flag("ch8_takeover", false)]),
    ifFlags({ beat_wren: true, ch8_done: false }, [call("ch8_reward"), call("ch8_end")]),
  ],
  ch8_director: [
    ifFlags({ ch8_started: true, got_keycard: false }, [
      face("director_hiding", "toPlayer"),
      say("<PLAYER>! Shh. It's ODELL, from the RELAY. They threw me out!", "ODELL"),
      say("I've hidden behind this palm since the broadcast. Not one frond has stirred.", "ODELL"),
      say("Here, my RELAY KEYCARD. It opens every floor. Do mind it. It's my only one.", "ODELL"),
      give("relay_keycard"),
      flag("got_keycard"),
    ]),
  ],
  ch8_patch_note: [
    say("A work note, pinned up: \"PATCH BAY. NOT left to right! C, then A, then B.\""),
    flag("patch_note_read"),
  ],
  ch8_console_a: console("a"),
  ch8_console_b: console("b"),
  ch8_console_c: console("c"),
  ch8_bram: [
    // BRAM meets the player on the first 3F arrival, before the consoles.
    ifFlags({ ch8_started: true, got_keycard: true, ch8_bram_met: false, beat_wren: false }, [
      { op: "showNpc", npc: "bram_r3" },
      face("bram_r3", "toPlayer"),
      say("It's me. I'm not here to fight. I read the BLOOM LAKE files too.", "BRAM"),
      say("My father. MERCER THORNE. He started the QUICKENING. On purpose.", "BRAM"),
      say("Behind him, his partner stands straight. A pale scar rings its stem."),
      say("I cut the collar off. The wound's callusing over. It's healing.", "BRAM"),
      say("Go on. I'll hold the stairs. No more grey coats come up past me.", "BRAM"),
      flag("ch8_bram_met"),
    ]),
  ],
  ch8_bram_after: [
    ifFlags({ ch8_bram_met: true, beat_wren: false }, [
      face("bram_r3", "toPlayer"),
      say("It's healing. Slowly. Plants don't hurry. ...I'm learning that.", "BRAM"),
      say("Nobody gets up these stairs. Go.", "BRAM"),
    ]),
  ],
  ch8_wren: [
    ifFlags({ relay_patched: true, ch8_bram_met: true, beat_wren: false }, [
      face("wren", "toPlayer"),
      say("Hi, <PLAYER>. You came to tell me first. Like I asked.", "WREN"),
      say("Still WREN. Still keeping the sensors talking. Only now I'm a ROOTSTOCK admin.", "WREN"),
      say("Since the bloom, the whole network has been screaming. Now it hears one voice.", "WREN"),
      say("Nothing's fighting. Nothing's scared. It's still. I won't let you undo that.", "WREN"),
      { op: "battle", trainer: "wren" },
      { op: "ifLastBattle", result: "won", then: [call("ch8_wren_after")] },
    ]),
  ],
  ch8_wren_after: [
    ifFlags({ beat_wren: true, broadcast_off: false }, [
      // Winning the battle sets beat_wren immediately; keep her visible for
      // the cutscene before her final hide and the persistent map condition.
      { op: "showNpc", npc: "wren" },
      say("...Okay. You win. I'll cut the broadcast myself. I owe you that.", "WREN"),
      { op: "sfx", id: "pulse" },
      { op: "flash", color: "white" },
      { op: "still", image: "relay_pulse" },
      say("The command fades. All across the region, the QUICKENED begin to stir."),
      wait(30),
      { op: "stillClear" },
      flag("beat_wren"),
      flag("broadcast_off"),
      flag("ch8_takeover", false),
    ]),
    ifFlags({ beat_wren: true, broadcast_off: true, mercer_seen: false }, [
      { op: "showNpc", npc: "mercer" },
      camera(8, 5),
      say("A man steps out from behind the mast. Under his arm: the RELAY's hub map."),
      { op: "still", image: "mercer_hub_map" },
      say("You did well, WREN. Better than I asked.", "MERCER"),
      say("I'm MERCER THORNE. The QUICKENING began with my work.", "MERCER"),
      say("My family grew one kind of potato. Every field. One blight took the lot.", "MERCER"),
      say("Wild things answer to no one. So I'll give them someone to answer to.", "MERCER"),
      say("This map marks every hub in the network. It's all I came for.", "MERCER"),
      say("Come, WREN. We're leaving.", "MERCER"),
      say("The mast's gone silent anyway. ...I'm coming.", "WREN"),
      { op: "stillClear" },
      // (8,5) and (7,6) -> beyond the far right edge (x=16).
      moveNpc("mercer", ...steps("right", 8)),
      { op: "hideNpc", npc: "mercer" },
      moveNpc("wren", ...steps("right", 9)),
      { op: "hideNpc", npc: "wren" },
      flag("mercer_seen"),
      // hideNpc is only a runtime override: keep him gone after map reload.
      flag("mercer_left"),
      cameraReset(),
    ]),
  ],
  ch8_reward: [
    ifFlags({ beat_wren: true, broadcast_off: true, mercer_seen: true, relay_reward: false }, [
      face("relay_director", "toPlayer"),
      say("<PLAYER>! The RELAY is ours again, and every plant in the city is moving!", "ODELL"),
      say("Please, take two RAIN JARS and $3000. From the research budget. Don't tell the dean.", "ODELL"),
      give("rain_jar", 2),
      pay(3000),
      flag("relay_reward"),
    ]),
  ],
  ch8_end: [
    ifFlags({ beat_wren: true, broadcast_off: true, mercer_seen: true, relay_reward: true, ch8_done: false }, [
      { op: "sfx", id: "text_blip" }, wait(8),
      say("The RELAY's telephone rings. ODELL answers, then holds it out. It's VALE."),
      say("<PLAYER>! You're safe? Good. But MERCER has the RELAY's map of the hubs.", "VALE"),
      say("And a letter came. VALERIAN ROOK, at SANGUINE RIDGE. He wants to see you.", "VALE"),
      say("He says the CENTURYHEART is dying. \"As it must,\" he writes. Go and hear him out.", "VALE"),
      flag("ch8_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
};
