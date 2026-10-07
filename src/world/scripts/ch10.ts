// Chapter 10's climax (docs/CH10.md §1 and §6).
// Bram uses the scripted ring appearances: the overworld has one follower.
import { MARKS, type ScriptCmd } from "../../contracts";
import { face, flag, ifFlags, ifMarks, movePlayer, say, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });

export const ch10Scripts: Scripts = {
  ch10_west_gate: [ifFlags({ ch9_done: false }, [
    say("TODO(text): The west road is still closed.", "GUARD"), movePlayer("right"),
  ])],
  ch10_marks_warden: [ifMarks(MARKS, [
    say("TODO(text): All eight marks; the road to the Council is yours.", "MARKS WARDEN"),
    flag("ch10_marks_checked"),
  ], [
    say("TODO(text): All eight marks are needed to pass.", "MARKS WARDEN"), movePlayer("right"),
  ])],
  ch10_council_door: [ifFlags({ ch10_done: false }, [
    say("TODO(text): The Council has gone to the Grove.", "NARRATOR"), movePlayer("down"),
  ])],
  ch10_arrival: [ifFlags({ ch9_done: true, ch10_arrived: false }, [ifMarks(MARKS, [
    { op: "camera", x: 16, y: 6, frames: 45 },
    say("TODO(text): Rootstock guards the Council Arboretum's Grove Gate.", "NARRATOR"),
    say("TODO(text): Mercer breached the sealed gate with the hub map.", "NARRATOR"),
    say("TODO(text): The Council hall is empty; its keepers went to the Grove.", "NARRATOR"),
    flag("ch10_arrived"), flag("visited_council_arboretum"),
    { op: "cameraReset", frames: 30 },
  ])])],
  ch10_bram_joins: [ifFlags({ ch10_arrived: true, bram_joined: false }, [
    say("TODO(text): BRAM catches up at the breached Grove Gate.", "NARRATOR"),
    say("TODO(text): We reached the Council together. I'll walk with you.", "BRAM"),
    say("TODO(text): Bring the Centuryheart Seed. The Grove needs it.", "BRAM"),
    flag("bram_joined"), { op: "hideNpc", npc: "bram_arboretum" },
  ])],
  shears_2: [ifFlags({ bram_joined: true }, [
    ifFlags({ beat_shears_2: true }, [call("shears_2_after")], [
      face("shears_2", "toPlayer"),
      say("TODO(text): SHEARS bars the first ring among the leaning trunks.", "NARRATOR"),
      say("TODO(text): I pruned the orchard. I'll prune this rebellion too.", "SHEARS"),
      { op: "battle", trainer: "shears_2" },
      { op: "ifLastBattle", result: "won", then: [call("shears_2_after")] },
    ]),
  ], [say("TODO(text): Meet BRAM at the Grove Gate before entering the rings.", "NARRATOR")])],
  shears_2_after: [ifFlags({ beat_shears_2: true, shears_2_yielded: false }, [
    say("TODO(text): SHEARS lowers her tools and yields the first ring.", "NARRATOR"),
    flag("shears_2_yielded"), { op: "sfx", id: "door" },
    say("TODO(text): The pale trunks part toward the shifting paths.", "NARRATOR"),
  ])],
  calloway_2: [ifFlags({ bram_joined: true, beat_shears_2: true }, [
    ifFlags({ beat_calloway_2: true }, [call("calloway_2_after")], [
      face("calloway_2", "toPlayer"),
      say("TODO(text): DR. CALLOWAY waits beyond the listening clearings.", "NARRATOR"),
      say("TODO(text): The shared roots could grow at my command.", "DR. CALLOWAY"),
      { op: "battle", trainer: "calloway_2" },
      { op: "ifLastBattle", result: "won", then: [call("calloway_2_after")] },
    ]),
  ], [say("TODO(text): SHEARS still holds the first ring.", "NARRATOR")])],
  calloway_2_after: [ifFlags({ beat_calloway_2: true, calloway_2_yielded: false }, [
    say("TODO(text): CALLOWAY yields; the Grove refuses her forced growth.", "NARRATOR"),
    flag("calloway_2_yielded"), { op: "sfx", id: "door" },
    say("TODO(text): The lane into the third ring opens.", "NARRATOR"),
  ])],
  wren_2: [ifFlags({ bram_joined: true, beat_calloway_2: true }, [
    ifFlags({ beat_wren_2: true }, [call("wren_2_after")], [
      face("wren_2", "toPlayer"),
      say("TODO(text): WREN stands between the player and the Grove's heart.", "NARRATOR"),
      say("TODO(text): Mercer promised these plants a future. Prove yours.", "WREN"),
      { op: "battle", trainer: "wren_2" },
      { op: "ifLastBattle", result: "won", then: [call("wren_2_after")] },
    ]),
  ], [say("TODO(text): CALLOWAY still holds the second ring.", "NARRATOR")])],
  wren_2_after: [ifFlags({ beat_wren_2: true, wren_2_yielded: false }, [
    say("TODO(text): WREN steps aside, leaving the heart's path open.", "NARRATOR"),
    flag("wren_2_yielded"), { op: "sfx", id: "door" },
  ])],
  // Reset on each map entry, so talking and stepping past Bram cannot double-heal.
  ch10_ring_3_enter: [flag("ch10_bram_healed", false)],
  ch10_bram_heal: [ifFlags({ bram_joined: true, beat_wren_2: true, beat_mercer: false, ch10_bram_healed: false }, [
    { op: "heal" }, flag("ch10_bram_healed"),
    say("TODO(text): BRAM tends every plant before the heart.", "NARRATOR"),
    say("TODO(text): I'll hold this ring. Go stop Mercer.", "BRAM"),
  ])],
  mercer: [ifFlags({ bram_joined: true, beat_wren_2: true }, [
    ifFlags({ beat_mercer: true }, [call("mercer_after")], [
      face("mercer", "toPlayer"),
      say("TODO(text): MERCER THORNE grafts a scion onto the Elder's root.", "NARRATOR"),
      say("TODO(text): Grunts hold ROWAN VALE, the Keeper, at the clearing's edge.", "NARRATOR"),
      say("TODO(text): One shared root. One will. The Grove will be mine.", "MERCER"),
      say("TODO(text): The Elder is alive, Mercer. It belongs to itself.", "ROWAN"),
      { op: "battle", trainer: "mercer" },
      { op: "ifLastBattle", result: "won", then: [call("mercer_after")] },
    ]),
  ], [say("TODO(text): WREN still guards the way to the heart.", "NARRATOR")])],
  mercer_after: [ifFlags({ beat_mercer: true }, [call("ch10_planting")])],
  ch10_planting: [ifFlags({ beat_mercer: true, centuryheart_planted: false }, [
    { op: "ifHasItem", item: "centuryheart_seed", then: [
      say("TODO(text): Mercer's graft falls away. The shared root still trembles.", "NARRATOR"),
      say("TODO(text): Plant the Centuryheart Seed here, where the alarm began.", "ROWAN"),
      { op: "takeItem", item: "centuryheart_seed" },
      // centuryheart_sprouts uses the existing bloom still until the art pass.
      { op: "still", image: "bloom" }, wait(30), { op: "shake", frames: 45 },
      say("TODO(text): The seed sprouts within the Elder's root.", "NARRATOR"),
      say("TODO(text): The alarm quiets through every pale trunk.", "NARRATOR"),
      { op: "music", id: "prologue_bloom" },
      say("TODO(text): The Quickened stay awake. They choose to stay awake.", "NARRATOR"),
      say("TODO(text): Their lives and their growth are their own.", "ROWAN"),
      { op: "stillClear" }, flag("centuryheart_planted"),
      say("TODO(text): Mercer lowers his hands, shaken but alive.", "NARRATOR"),
      say("TODO(text): BRAM returns, and he and ROWAN lead Mercer from the Grove.", "NARRATOR"),
      { op: "hideNpc", npc: "mercer" }, { op: "hideNpc", npc: "rowan" },
      { op: "hideNpc", npc: "grunt_heart_1" }, { op: "hideNpc", npc: "grunt_heart_2" },
      { op: "showNpc", npc: "the_elder" },
      say("TODO(text): The Elder's trunk remains, listening at the heart.", "NARRATOR"),
    ], else: [say("TODO(text): Bring the Centuryheart Seed to quiet the root.", "ROWAN")] },
  ])],
  ch10_elder: [ifFlags({ centuryheart_planted: true, elder_caught: false }, [
    say("TODO(text): The Elder leans toward the player and offers a challenge.", "NARRATOR"),
    { op: "wildBattle", species: "elder", level: 60, canLose: true },
    { op: "ifLastBattle", result: "caught", then: [
      flag("elder_caught"), { op: "hideNpc", npc: "the_elder" },
      say("TODO(text): The Elder chooses to travel with the player.", "NARRATOR"),
    ], else: [
      say("TODO(text): The Elder settles at the heart. It will listen again.", "NARRATOR"),
    ] },
  ])],
  ch10_end: [ifFlags({ beat_mercer: true, ch10_done: false }, [
    say("TODO(text): ROWAN returns to the Arboretum and reopens the Council.", "NARRATOR"),
    say("TODO(text): The Grove is safe. Come when you're ready.", "ROWAN"),
    flag("ch10_done"), flag("slice_done"), wait(60), { op: "endSlice" },
  ])],
  ch10_gh_visitor: [say("TODO(text): The Grove's many trunks share one root system.", "VISITOR")],
  ch10_rowan: [say("TODO(text): Mercer is grafting onto the Elder. Please stop him.", "ROWAN")],
  ch10_bram_ring_1: [say("TODO(text): Every trunk leans toward us. Let's keep going.", "BRAM")],
  ch10_bram_ring_2: [say("TODO(text): Listen in the clearings; the lanes shift with the Grove.", "BRAM")],
  ch10_arboretum_enter: [call("ch10_arrival"), call("ch10_end")],
  ch10_heart_enter: [ifFlags({ beat_mercer: true }, [{ op: "music", id: "prologue_bloom" }])],
  ch10_listening_clearing: [ifFlags({ grove_lean: true }, [flag("grove_lean", false)], [flag("grove_lean")])],
};
