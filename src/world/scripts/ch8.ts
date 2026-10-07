// Chapter 8's takeover, patch bay and progression (docs/CH8.md §1, §4 and §6).
// Spoken placeholders retain their speakers for the later writing pass.
import type { ScriptCmd } from "../../contracts";
import { face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const pay = (amount: number): ScriptCmd => ({ op: "giveMoney", amount });
const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (): ScriptCmd => ({ op: "cameraReset", frames: 30 });

const staticReset: ScriptCmd[] = [
  flag("patch_1", false), flag("patch_2", false),
  { op: "sfx", id: "bump" },
  say("TODO(text): Static interrupts the patch; the sequence resets.", "NARRATOR"),
];

const console = (id: "a" | "b" | "c"): ScriptCmd[] => [
  ifFlags({ relay_patched: true }, [
    say("TODO(text): The signal is already routed to the roof stair.", "NARRATOR"),
  ], [
    ifFlags(id === "c" ? { patch_1: false, patch_2: false }
      : id === "a" ? { patch_1: true, patch_2: false }
        : { patch_1: true, patch_2: true },
    id === "b" ? [
      flag("relay_patched"),
      { op: "sfx", id: "door" },
      camera(15, 2),
      say("TODO(text): The patch is complete; the roof stair opens.", "NARRATOR"),
      cameraReset(),
    ] : [
      flag(id === "c" ? "patch_1" : "patch_2"),
      { op: "sfx", id: "select" },
      say(`TODO(text): Console ${id.toUpperCase()} accepts the patch.`, "NARRATOR"),
    ], staticReset),
  ]),
];

export const ch8Scripts: Scripts = {
  ch8_arrival: [
    ifFlags({ ch7_done: true, ch8_started: false }, [
      camera(5, 6, 60),
      say("TODO(text): Glasshouse City has gone still; its Quickened plants are frozen.", "NARRATOR"),
      say("TODO(text): Rootstock has seized the ROOT RELAY.", "NARRATOR"),
      say("TODO(text): WREN has reversed the sensors to broadcast MERCER's command.", "NARRATOR"),
      say("TODO(text): Across the region, every Quickened hears a voice ordering it to be still.", "NARRATOR"),
      flag("ch8_started"),
      flag("ch8_takeover"),
      cameraReset(),
    ]),
  ],
  ch8_relay_door: [
    ifFlags({ ch8_started: true, got_keycard: false }, [
      say("TODO(text): A RELAY KEYCARD is needed to enter.", "NARRATOR"),
      movePlayer("down"),
    ]),
  ],
  // Cond is conjunction-only. Refresh the derived takeover flag on every lobby
  // entry so visibleWhen hides staff exactly while ch8_started && !beat_wren.
  ch8_relay_enter: [
    ifFlags({ ch8_started: true, beat_wren: false }, [
      flag("ch8_takeover"),
      { op: "music", id: "rootstock_appears" },
    ], [flag("ch8_takeover", false)]),
    ifFlags({ beat_wren: true, ch8_done: false }, [call("ch8_reward"), call("ch8_end")]),
  ],
  ch8_director: [
    ifFlags({ ch8_started: true, got_keycard: false }, [
      face("director_hiding", "toPlayer"),
      say("TODO(text): I am ODELL, the Relay director; Rootstock threw me out.", "ODELL"),
      say("TODO(text): I hid here when the broadcast froze the plants.", "ODELL"),
      say("TODO(text): Take my RELAY KEYCARD; it opens every Relay floor.", "ODELL"),
      give("relay_keycard"),
      flag("got_keycard"),
    ]),
  ],
  ch8_patch_note: [
    say("TODO(text): The pinned work note gives the patch order: C, then A, then B.", "NARRATOR"),
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
      say("TODO(text): I read the Bloom Lake files too.", "BRAM"),
      say("TODO(text): My father, MERCER THORNE, started the Quickening on purpose.", "BRAM"),
      say("TODO(text): I took the graft collar off my partner, and it is healing.", "BRAM"),
      say("TODO(text): Go on; I will hold the stairwell so no more grunts come up.", "BRAM"),
      flag("ch8_bram_met"),
    ]),
  ],
  ch8_bram_after: [
    ifFlags({ ch8_bram_met: true, beat_wren: false }, [
      face("bram_r3", "toPlayer"),
      say("TODO(text): My partner is healing; I will keep the grunts downstairs.", "BRAM"),
    ]),
  ],
  ch8_wren: [
    ifFlags({ relay_patched: true, ch8_bram_met: true, beat_wren: false }, [
      face("wren", "toPlayer"),
      say("TODO(text): You remember me as the friendly sensor engineer.", "WREN"),
      say("TODO(text): I am a ROOTSTOCK admin now; the network carries our command.", "WREN"),
      say("TODO(text): I will defend the mast and its broadcast.", "WREN"),
      { op: "battle", trainer: "wren" },
      { op: "ifLastBattle", result: "won", then: [call("ch8_wren_after")] },
    ]),
  ],
  ch8_wren_after: [
    ifFlags({ beat_wren: true, broadcast_off: false }, [
      // Winning the battle sets beat_wren immediately; keep her visible for
      // the cutscene before her final hide and the persistent map condition.
      { op: "showNpc", npc: "wren" },
      say("TODO(text): You have won; I will cut the broadcast.", "WREN"),
      { op: "sfx", id: "pulse" },
      { op: "flash", color: "white" },
      { op: "still", image: "relay_pulse" },
      say("TODO(text): The command fades, and the region's Quickened begin to move.", "NARRATOR"),
      wait(30),
      { op: "stillClear" },
      flag("beat_wren"),
      flag("broadcast_off"),
      flag("ch8_takeover", false),
    ]),
    ifFlags({ beat_wren: true, broadcast_off: true, mercer_seen: false }, [
      { op: "showNpc", npc: "mercer" },
      camera(8, 5),
      say("TODO(text): MERCER THORNE stands behind WREN, holding the Relay's hub map.", "NARRATOR"),
      say("TODO(text): I am MERCER THORNE; the Quickening began with my work.", "MERCER THORNE"),
      say("TODO(text): This map shows the network's hubs; I have what I came for.", "MERCER THORNE"),
      say("TODO(text): We are leaving, WREN.", "MERCER THORNE"),
      say("TODO(text): The mast is silent. I am coming with you.", "WREN"),
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
      say("TODO(text): Thank you for saving the Relay and freeing the plants.", "ODELL"),
      say("TODO(text): Please accept two RAIN JARS and $3000.", "ODELL"),
      give("rain_jar", 2),
      pay(3000),
      flag("relay_reward"),
    ]),
  ],
  ch8_end: [
    ifFlags({ beat_wren: true, broadcast_off: true, mercer_seen: true, relay_reward: true, ch8_done: false }, [
      { op: "sfx", id: "text_blip" }, wait(8),
      say("TODO(text): DR. VALE calls as ODELL finishes thanking the player.", "NARRATOR"),
      say("TODO(text): MERCER has the map of the network's hubs.", "DR. VALE"),
      say("TODO(text): VALERIAN ROOK at SANGUINE RIDGE wants to see you.", "DR. VALE"),
      say("TODO(text): He says the Centuryheart is dying, as it must.", "DR. VALE"),
      flag("ch8_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
};
