// Chapter 10's climax (docs/CH10.md §1 and §6).
// Bram uses the scripted ring appearances: the overworld has one follower.
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
// Narration has no speaker (as in ch5–ch9). The ELDER never speaks in words.
import { MARKS, type ScriptCmd } from "../../contracts";
import { face, flag, ifFlags, ifMarks, movePlayer, say, wait, type Scripts } from "../build";

const call = (script: string): ScriptCmd => ({ op: "call", script });

export const ch10Scripts: Scripts = {
  ch10_west_gate: [ifFlags({ ch9_done: false }, [
    say("The west road's closed. Past here it's gorges, all the way to the COUNCIL.", "GUARD"), movePlayer("right"),
  ])],
  ch10_marks_warden: [ifMarks(MARKS, [
    say("All eight PRESSED MARKS. The road to the COUNCIL is yours.", "MARKS WARDEN"),
    flag("ch10_marks_checked"),
  ], [
    say("No one passes without all eight PRESSED MARKS. Not one fewer.", "MARKS WARDEN"), movePlayer("right"),
  ])],
  ch10_council_door: [ifFlags({ ch10_done: false }, [
    say("Shut. A note on the door: \"GONE TO THE GROVE. THE COUNCIL.\""), movePlayer("down"),
  ])],
  ch10_arrival: [ifFlags({ ch9_done: true, ch10_arrived: false }, [ifMarks(MARKS, [
    { op: "camera", x: 16, y: 6, frames: 45 },
    say("The COUNCIL ARBORETUM. Grey coats guard the GROVE GATE. ROOTSTOCK."),
    say("The gate was sealed. Now it hangs open. MERCER's hub map found the way in."),
    say("The COUNCIL HALL stands dark. Its keepers have gone into the GROVE."),
    flag("ch10_arrived"), flag("visited_council_arboretum"),
    { op: "cameraReset", frames: 30 },
  ])])],
  ch10_bram_joins: [ifFlags({ ch10_arrived: true, bram_joined: false }, [
    say("BRAM catches up, out of breath. He stares at the open GROVE GATE."),
    say("We both made it to the COUNCIL. ...I'm going in with you. He's my father.", "BRAM"),
    say("Still got the CENTURYHEART SEED? Keep it close. The GROVE needs it.", "BRAM"),
    flag("bram_joined"), { op: "hideNpc", npc: "bram_arboretum" },
  ])],
  shears_2: [ifFlags({ bram_joined: true }, [
    ifFlags({ beat_shears_2: true }, [call("shears_2_after")], [
      face("shears_2", "toPlayer"),
      say("Pale trunks lean in from every side. SHEARS bars the first ring, blades out."),
      say("I've pruned whole orchards. A rebellion is one more overgrown branch.", "SHEARS"),
      { op: "battle", trainer: "shears_2" },
      { op: "ifLastBattle", result: "won", then: [call("shears_2_after")] },
    ]),
  ], [say("The trunks crowd close. Better find BRAM at the GROVE GATE first.")])],
  shears_2_after: [ifFlags({ beat_shears_2: true, shears_2_yielded: false }, [
    say("SHEARS folds her blades away and steps off the path. The first ring is yours."),
    flag("shears_2_yielded"), { op: "sfx", id: "door" },
    say("The pale trunks creak and lean apart, toward the shifting paths beyond."),
  ])],
  calloway_2: [ifFlags({ bram_joined: true, beat_shears_2: true }, [
    ifFlags({ beat_calloway_2: true }, [call("calloway_2_after")], [
      face("calloway_2", "toPlayer"),
      say("Past the listening clearings, DR. CALLOWAY waits, notebook open."),
      say("One root, thousands of trunks. One signal, and all of it grows for me.", "DR. CALLOWAY"),
      { op: "battle", trainer: "calloway_2" },
      { op: "ifLastBattle", result: "won", then: [call("calloway_2_after")] },
    ]),
  ], [say("The trunks won't let you through. SHEARS still holds the first ring.")])],
  calloway_2_after: [ifFlags({ beat_calloway_2: true, calloway_2_yielded: false }, [
    say("DR. CALLOWAY shuts her notebook. Around her, the GROVE refuses to hurry."),
    flag("calloway_2_yielded"), { op: "sfx", id: "door" },
    say("Wood groans. The trunks shift, and the lane into the third ring opens."),
  ])],
  wren_2: [ifFlags({ bram_joined: true, beat_calloway_2: true }, [
    ifFlags({ beat_wren_2: true }, [call("wren_2_after")], [
      face("wren_2", "toPlayer"),
      say("WREN stands in the last lane before the heart, headphones round her neck."),
      say("MERCER promised them a future with no fear in it. Got a better one? Prove it.", "WREN"),
      { op: "battle", trainer: "wren_2" },
      { op: "ifLastBattle", result: "won", then: [call("wren_2_after")] },
    ]),
  ], [say("The lanes stay shut. DR. CALLOWAY still holds the second ring.")])],
  wren_2_after: [ifFlags({ beat_wren_2: true, wren_2_yielded: false }, [
    say("WREN steps aside without a word. The way to the heart lies open."),
    flag("wren_2_yielded"), { op: "sfx", id: "door" },
  ])],
  // Reset on each map entry, so talking and stepping past Bram cannot double-heal.
  ch10_ring_3_enter: [flag("ch10_bram_healed", false)],
  ch10_bram_heal: [ifFlags({ bram_joined: true, beat_wren_2: true, beat_mercer: false, ch10_bram_healed: false }, [
    { op: "heal" }, flag("ch10_bram_healed"),
    say("BRAM kneels and tends your team, plant by plant. Water, a splint, a quiet word."),
    say("I'll hold this ring. Nobody gets past. Go and stop him. ...Please.", "BRAM"),
  ])],
  mercer: [ifFlags({ bram_joined: true, beat_wren_2: true }, [
    ifFlags({ beat_mercer: true }, [call("mercer_after")], [
      face("mercer", "toPlayer"),
      say("MERCER kneels at the vast root, binding a scion into a clean cut."),
      say("At the clearing's edge, grunts hold ROWAN, the KEEPER of the GROVE."),
      say("One root. One will. Mine. It's the only way I know to keep them safe.", "MERCER"),
      say("It's alive, MERCER. Older than all of us. It belongs to itself.", "ROWAN"),
      { op: "battle", trainer: "mercer" },
      { op: "ifLastBattle", result: "won", then: [call("mercer_after")] },
    ]),
  ], [say("Something presses back through the trunks. WREN still guards the way.")])],
  mercer_after: [ifFlags({ beat_mercer: true }, [call("ch10_planting")])],
  ch10_planting: [ifFlags({ beat_mercer: true, centuryheart_planted: false }, [
    { op: "ifHasItem", item: "centuryheart_seed", then: [
      say("MERCER's graft slips loose and falls away. Underfoot, the root still trembles."),
      say("The seed. You've carried it all this way. Plant it here, where the alarm began.", "ROWAN"),
      { op: "takeItem", item: "centuryheart_seed" },
      // centuryheart_sprouts uses the existing bloom still until the art pass.
      { op: "still", image: "bloom" }, wait(30), { op: "shake", frames: 45 },
      say("You press the seed in against the root. The coat splits. A green shoot rises."),
      say("The low hum you felt the night of the bloom fades away, trunk by trunk."),
      { op: "still", image: "centuryheart_sprouts" }, wait(30), { op: "shake", frames: 45 },
      say("TODO(text): The seed sprouts within the Elder's root.", "NARRATOR"),
      say("TODO(text): The alarm quiets through every pale trunk.", "NARRATOR"),
      // Mercer's win flag is set after battle return; refresh the conditional track now.
      { op: "restoreMusic" },
      say("Across the region, the QUICKENED don't go back to sleep. They choose to stay awake."),
      say("No alarm. No command. Their lives are their own now, and so is their growth.", "ROWAN"),
      { op: "stillClear" }, flag("centuryheart_planted"),
      say("MERCER lowers his shaking hands, graft tape still in them. Unhurt. Undone."),
      say("BRAM returns. He holds out a hand to his father. With ROWAN, they lead him out."),
      { op: "hideNpc", npc: "mercer" }, { op: "hideNpc", npc: "rowan" },
      { op: "hideNpc", npc: "grunt_heart_1" }, { op: "hideNpc", npc: "grunt_heart_2" },
      { op: "showNpc", npc: "the_elder" },
      say("The great trunk remains. All around, pale stems lean toward you, listening."),
    ], else: [say("Only the CENTURYHEART SEED can quiet the root. Please, bring it here.", "ROWAN")] },
  ])],
  ch10_elder: [ifFlags({ centuryheart_planted: true, elder_caught: false }, [
    say("Every trunk in the clearing leans toward you, as one. The ELDER offers a challenge."),
    { op: "wildBattle", species: "elder", level: 60, canLose: true },
    // The Elder isn't hostile: a loss heals the party where it stands, and it waits.
    { op: "ifLastBattle", result: "lost", then: [
      { op: "heal" },
      say("The ELDER's roots stir beneath your team and mend them. It waits for you."),
    ], else: [
      { op: "ifLastBattle", result: "caught", then: [
        flag("elder_caught"), { op: "hideNpc", npc: "the_elder" },
        say("The trunks go still. The ELDER has chosen to travel with you."),
      ], else: [
        say("The pale trunks settle back. The ELDER stays at the heart, listening still."),
      ] },
    ] },
  ])],
  ch10_end: [ifFlags({ beat_mercer: true, ch10_done: false }, [
    say("ROWAN meets you at the ARBORETUM and unbars the COUNCIL HALL doors."),
    say("The GROVE is safe. The COUNCIL is open again. Come when you're ready.", "ROWAN"),
    flag("ch10_done"), flag("slice_done"), wait(60), { op: "endSlice" },
  ])],
  ch10_gh_visitor: [say("Every aspen in the GROVE is one tree, they say. One root system, thousands of trunks.", "VISITOR")],
  ch10_rowan: [say("MERCER's cutting into the ELDER's root to graft it. Please. Stop him.", "ROWAN")],
  ch10_bram_ring_1: [say("Every trunk's leaning at us. Like it's watching. ...Keep moving.", "BRAM")],
  ch10_bram_ring_2: [say("Stand in the clearings and listen. When the GROVE leans, the lanes change.", "BRAM")],
  ch10_arboretum_enter: [call("ch10_arrival"), call("ch10_end")],
  ch10_listening_clearing: [ifFlags({ grove_lean: true }, [flag("grove_lean", false)], [flag("grove_lean")])],
};
