// Chapter 10 world wiring. The story wave replaces the §6 scene stubs.
import { MARKS } from "../../contracts";
import { flag, ifFlags, ifMarks, movePlayer, say, type Scripts } from "../build";

const stub = (text: string) => [say(`TODO(text): ${text}`)];
export const ch10Scripts: Scripts = {
  ch10_west_gate: [ifFlags({ ch9_done: false }, [
    say("TODO(text): The west road is still closed."), movePlayer("right"),
  ])],
  ch10_marks_warden: [ifMarks(MARKS, [flag("ch10_marks_checked")], [
    say("TODO(text): All eight marks are needed to pass."), movePlayer("right"),
  ])],
  ch10_council_door: [ifFlags({ ch10_done: false }, [
    say("TODO(text): The Council has gone to the Grove."), movePlayer("down"),
  ])],
  ch10_arrival: stub("The Grove Gate stands open."),
  ch10_bram_joins: stub("BRAM arrives at the Arboretum."),
  shears_2: stub("SHEARS waits in the first ring."),
  shears_2_after: stub("SHEARS yields the first ring."),
  calloway_2: stub("DR. CALLOWAY waits beyond the shifting paths."),
  calloway_2_after: stub("DR. CALLOWAY yields the second ring."),
  wren_2: stub("WREN waits in the third ring."),
  wren_2_after: stub("WREN yields the third ring."),
  ch10_bram_heal: stub("BRAM tends the party before the heart."),
  mercer: stub("MERCER grafts a scion onto the Elder's root."),
  mercer_after: stub("MERCER has lost the heart."),
  ch10_planting: stub("The seed sprouts; the Quickened choose to stay awake."),
  ch10_elder: stub("The Elder listens at the heart."),
  ch10_end: stub("ROWAN reopens the Council."),
  ch10_gh_visitor: stub("The Grove is one shared root system."),
  ch10_rowan: stub("ROWAN is held at the edge of the heart."),
  ch10_bram_ring_1: stub("BRAM follows into the first ring."),
  ch10_bram_ring_2: stub("BRAM follows into the second ring."),
  ch10_arboretum_enter: [
    ifFlags({ ch10_arrived: false }, [{ op: "call", script: "ch10_arrival" }]),
    ifFlags({ beat_mercer: true, ch10_done: false }, [{ op: "call", script: "ch10_end" }]),
  ],
  ch10_heart_enter: [ifFlags({ beat_mercer: true }, [{ op: "music", id: "prologue_bloom" }])],
  ch10_listening_clearing: [ifFlags({ grove_lean: true }, [flag("grove_lean", false)], [flag("grove_lean")])],
};
