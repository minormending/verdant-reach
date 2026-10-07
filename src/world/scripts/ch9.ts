// Chapter 9's staging and progression (docs/CH9.md §1 and §6).
// Dialogue placeholders preserve scene length and speakers for the writing pass.
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
      say("TODO(text): The east road is closed.", "GUARD"),
    ]),
  ],
  ch9_arrival: [
    ifFlags({ ch8_done: true, ch9_arrived: false }, [
      camera(15, 17, 60),
      say("TODO(text): Thistledown stands at the desert's edge.", "NARRATOR"),
      say("TODO(text): A dry wind blows through the square.", "NARRATOR"),
      flag("ch9_arrived"),
      flag("visited_thistledown"),
      call("ch9_tumbleweed"),
      cameraReset(),
    ]),
  ],
  ch9_tumbleweed: [
    ifFlags({ ch9_arrived: true, tumbleweed_seen: false }, [
      say("TODO(text): A tumbleweed rolls across the square.", "NARRATOR"),
      // (3,17) -> (30,17): scripted movement carries it beyond the east edge.
      moveNpc("tumbleweed_sighting", ...steps("right", 27)),
      { op: "hideNpc", npc: "tumbleweed_sighting" },
      flag("tumbleweed_seen"),
      say("TODO(text): The wandering plant vanishes into the scrub.", "NARRATOR"),
    ]),
  ],
  rival_5: [
    ifFlags({ ch9_arrived: true, rival_5_done: false }, [
      { op: "music", id: "rival_appears" },
      face("bram", "toPlayer"),
      say("TODO(text): Bram waits at the canyon's switchback.", "NARRATOR"),
      say("TODO(text): His partner wears no collar and has regrown.", "NARRATOR"),
      say("TODO(text): Bram asks for a friendly battle.", "BRAM"),
      byStarter((line) => [{ op: "battle", trainer: `rival_5_${COUNTER[line]}`, canLose: true }]),
      say("TODO(text): Bram thanks the player for the battle.", "BRAM"),
      say("TODO(text): He is going after his father.", "BRAM"),
      say("TODO(text): He will find the player when it is time.", "BRAM"),
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
      say("TODO(text): ROOK only sees challengers who have come the hard way.", "NARRATOR"),
      movePlayer("down"),
    ]),
  ],
  rook: [
    face("rook", "toPlayer"),
    ifFlags({ rival_5_done: true }, [
      ifFlags({ beat_rook: true }, [
        call("ch9_rook_after"),
        say("TODO(text): Rook trusts the player with the road ahead.", "ROOK"),
      ], [
        say("TODO(text): Rook welcomes the player to the final test.", "ROOK"),
        say("TODO(text): His ancient Dragon plants guard the ridge.", "ROOK"),
        { op: "battle", trainer: "rook" },
        { op: "ifLastBattle", result: "won", then: [
          say("TODO(text): Rook presents the Resin Mark.", "ROOK"),
          { op: "giveMark", mark: "resin_mark" },
          call("ch9_rook_after"),
        ] },
      ]),
    ], [
      say("TODO(text): Come the hard way before taking the final test.", "ROOK"),
    ]),
  ],
  ch9_rook_after: [
    ifFlags({ beat_rook: true, got_fig_root: false }, [
      say("TODO(text): The Centuryheart is dying, as it must.", "ROOK"),
      say("TODO(text): Its seed is the only voice that can calm the Elder.", "ROOK"),
      say("TODO(text): Mercer knows this too.", "ROOK"),
      say("TODO(text): Rook gives the player a living Fig Root.", "ROOK"),
      give("fig_root"),
      flag("got_fig_root"),
      say("TODO(text): ROOT BRIDGE grows roots across narrow gaps.", "ROOK"),
    ]),
  ],
  ch9_end: [
    ifFlags({ beat_rook: true, got_fig_root: true, ch9_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("TODO(text): Dr. Vale calls as the player leaves the Conservatory.", "NARRATOR"),
      say("TODO(text): Rootstock has been seen at the Council Arboretum.", "DR. VALE"),
      say("TODO(text): The Arboretum stands at the sealed Elder Grove's gates.", "DR. VALE"),
      say("TODO(text): Rowan, the Keeper, has gone silent.", "DR. VALE"),
      say("TODO(text): Bring the seed.", "DR. VALE"),
      flag("ch9_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch9_gh_visitor: [
    say("TODO(text): The visitor shelters plants from the dry wind.", "VISITOR"),
  ],
  ch9_house_resident: [
    say("TODO(text): The resident watches tumbleweeds cross the square.", "RESIDENT"),
  ],
  ch9_market_visitor: [
    say("TODO(text): The trader prepares supplies for the canyon climb.", "TRADER"),
  ],
  ch9_market_kid: [
    say("TODO(text): The kid wonders where the wandering plants go.", "KID"),
  ],
  ch9_market_pods: [
    say("TODO(text): The clerk offers pods and water for the desert road.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch9_market_care: [
    say("TODO(text): The clerk offers plant care, rain jars and Ember Ash.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar", "ember_ash"] },
  ],
};
