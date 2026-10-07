// Chapter 8 world wiring (CH8.md §6). The next wave owns story and puzzle logic.
import type { ScriptCmd } from "../../contracts";
import { flag, ifFlags, movePlayer, say, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const stub = (text: string): ScriptCmd[] => [say(`TODO(text): ${text}`)];

export const ch8Scripts: Scripts = {
  ch8_arrival: stub("Rootstock has seized the ROOT RELAY."),
  ch8_relay_door: [
    ifFlags({ ch8_started: true, got_keycard: false }, [
      say("TODO(text): A RELAY KEYCARD is needed to enter."),
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
  ch8_director: stub("ODELL offers his RELAY KEYCARD."),
  ch8_patch_note: stub("Patch order: C, then A, then B."),
  ch8_console_a: stub("Patch console A."),
  ch8_console_b: stub("Patch console B."),
  ch8_console_c: stub("Patch console C."),
  ch8_bram: stub("BRAM holds the stairwell with his healing partner."),
  ch8_bram_after: stub("BRAM keeps the grunts from coming upstairs."),
  ch8_wren: stub("WREN guards the network mast."),
  ch8_wren_after: stub("WREN cuts the broadcast; MERCER takes the hub map."),
  ch8_reward: stub("ODELL thanks the player for saving the RELAY."),
  ch8_end: stub("DR. VALE calls about Sanguine Ridge."),
};
