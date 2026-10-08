// Chapter 9's staging and progression (docs/CH9.md §1 and §6).
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
// Narration has no speaker (as in ch5–ch8).
import type { ScriptCmd } from "../../contracts";
import { face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";
import { COUNTER, type StarterLine } from "../trainers";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (): ScriptCmd => ({ op: "cameraReset", frames: 30 });
const byStarter = (make: (line: StarterLine) => ScriptCmd[]): ScriptCmd =>
  ifFlags({ got_starter_oak: true }, make("oak"), [
    ifFlags({ got_starter_chili: true }, make("chili"), make("lily")),
  ]);

export const ch9Scripts: Scripts = {
  ch9_east_gate: [
    ifFlags({ ch8_done: false }, [
      face("east_gate_guard", "toPlayer"),
      say("The east road's closed. Out there it's scrub, then sand, then nothing for miles.", "GUARD"),
    ]),
  ],
  ch9_arrival: [
    ifFlags({ ch8_done: true, ch9_arrived: false }, [
      camera(15, 17, 60),
      say("THISTLEDOWN, on the desert's edge. Tumbleweed country."),
      say("A dry wind blows through the square. It smells of dust and warm stone."),
      flag("ch9_arrived"),
      flag("visited_thistledown"),
      call("ch9_tumbleweed"),
      cameraReset(),
    ]),
  ],
  ch9_tumbleweed: [
    ifFlags({ ch9_arrived: true, tumbleweed_seen: false }, [
      say("Something pale and round comes bowling across the square. A tumbleweed."),
      // (3,17) -> (30,17): scripted movement carries it beyond the east edge.
      moveNpc("tumbleweed_sighting", ...steps("right", 27)),
      { op: "hideNpc", npc: "tumbleweed_sighting" },
      flag("tumbleweed_seen"),
      say("Then it's gone, into the scrub. Odd. There's no wind just now."),
    ]),
  ],
  rival_5: [
    ifFlags({ ch9_arrived: true, rival_5_done: false }, [
      { op: "music", id: "rival_appears" },
      face("bram", "toPlayer"),
      say("BRAM waits at the switchback, his back to the red rock."),
      say("His partner stands beside him. No collar. The scar has grown over, green and whole."),
      say("Look at it. Grew back on its own. One battle? A friendly one. No collars.", "BRAM"),
      byStarter((line) => [{ op: "battle", trainer: `rival_5_${COUNTER[line]}`, canLose: true }]),
      say("Good battle. ...Thanks. It fought because it wanted to. That's new.", "BRAM"),
      say("I'm going after my father. He won't listen to anyone. Maybe he'll listen to me.", "BRAM"),
      say("Don't wait up. I'll find you when it's time.", "BRAM"),
      // The sandy lane at x15 is clear from y27 to y17.
      moveNpc("bram", ...steps("up", 10)),
      { op: "hideNpc", npc: "bram" },
      flag("rival_5_done"),
      { op: "restoreMusic" },
      // A friendly loss must leave the party able to continue up the canyon.
      { op: "heal" },
    ]),
  ],
  ch9_cons8_door: [
    ifFlags({ rival_5_done: false }, [
      { op: "sfx", id: "bump" },
      say("Barred. Carved in the door: \"ROOK SEES ONLY THOSE WHO HAVE COME THE HARD WAY.\""),
      movePlayer("down"),
    ]),
  ],
  rook: [
    face("rook", "toPlayer"),
    ifFlags({ rival_5_done: true }, [
      ifFlags({ beat_rook: true }, [
        call("ch9_rook_after"),
        say("The road ahead is yours, <PLAYER>. I trust you with it. So do the old trees.", "ROOK"),
      ], [
        say("I am VALERIAN ROOK. Welcome, challenger, to the eighth and final test.", "ROOK"),
        say("These dragon trees were old before kingdoms had names. My plants guard them.", "ROOK"),
        { op: "battle", trainer: "rook" },
        { op: "ifLastBattle", result: "won", then: [
          say("Well fought. The RESIN MARK, red as the resin these trees bleed: dragon's blood.", "ROOK"),
          { op: "giveMark", mark: "resin_mark" },
          call("ch9_rook_after"),
        ] },
      ]),
    ], [
      say("Not yet. The final test is for those who come the hard way. Come back when you have.", "ROOK"),
    ]),
  ],
  ch9_rook_after: [
    ifFlags({ beat_rook: true, got_fig_root: false }, [
      { op: "still", image: "dragon_trees" },
      say("Hear me. The CENTURYHEART is dying, as it must. One bloom in a century, then it's spent.", "ROOK"),
      say("But its seed carries its voice. The only voice that can calm the ELDER. You carry it.", "ROOK"),
      say("And MERCER THORNE knows it too. Guard that seed well.", "ROOK"),
      say("Take this FIG ROOT. It is living root, and patient. It will bridge what you cannot.", "ROOK"),
      { op: "stillClear" },
      give("fig_root"),
      flag("got_fig_root"),
      say("Face a narrow gap and let the root grow across. That is ROOT BRIDGE.", "ROOK"),
    ]),
  ],
  ch9_end: [
    ifFlags({ beat_rook: true, got_fig_root: true, ch9_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("Behind you, a telephone rings. A junior leans out of the door. It's VALE."),
      say("<PLAYER>! Never mind hello. ROOTSTOCK's been seen at the COUNCIL ARBORETUM.", "VALE"),
      say("The ARBORETUM keeps the gates of the ELDER GROVE. Sealed gates. For now.", "VALE"),
      say("And ROWAN, the KEEPER, has gone silent. ...We don't talk much. But this is different.", "VALE"),
      say("Whatever happens, <PLAYER>... Bring the seed.", "VALE"),
      flag("ch9_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch9_gh_visitor: [
    say("When the dry wind blows, I bring my seedlings in here. Out there, it'd wick them dry.", "VISITOR"),
  ],
  ch9_house_resident: [
    say("I count the tumbleweeds. They snap off at the root and roll, dropping seed as they go.", "RESIDENT"),
  ],
  ch9_market_visitor: [
    say("Climbing the red canyon? Take more water than you think. Then a little more.", "TRADER"),
  ],
  ch9_market_kid: [
    say("Where do tumbleweeds go? I followed one once. It just kept going.", "KID"),
  ],
  ch9_market_pods: [
    say("Pods, and plenty of water. The desert road is thirsty work.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch9_market_care: [
    say("Plant care, RAIN JARS, and now EMBER ASH. Some pine cones won't open without fire.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar", "ember_ash"] },
  ],
};
