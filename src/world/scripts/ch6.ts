// Chapter 6's staging and progression (docs/CH6.md §1, §5–§6).
// Dialogue placeholders preserve scene length and speakers for the writing pass.
import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 30): ScriptCmd => ({ op: "cameraReset", frames });
const call = (script: string): ScriptCmd => ({ op: "call", script });

export const ch6Scripts: Scripts = {
  ch6_ford_keeper: [
    face("ford_keeper", "toPlayer"),
    say("TODO(text): The ford is still flooded.", "FORD KEEPER"),
    say("TODO(text): Wait until the south road drains.", "FORD KEEPER"),
  ],
  ch6_town_enter: [
    call("ch6_arrival"),
    call("ch6_end"),
  ],
  ch6_arrival: [
    ifFlags({ ch6_arrived: false }, [
      camera(12, 23, 60),
      say("TODO(text): Boats wait at Saltmarsh Harbour's docks.", "NARRATOR"),
      camera(34, 10, 60),
      say("TODO(text): The Lantern Tree on the point is dark.", "NARRATOR"),
      say("TODO(text): No fireflies shine among its roots.", "NARRATOR"),
      wait(20),
      flag("ch6_arrived"),
      flag("visited_saltmarsh_harbour"),
      cameraReset(),
    ]),
  ],
  ch6_doctor: [
    ifFlags({ ch6_arrived: true, ch6_doctor_met: false }, [
      camera(12, 22, 30),
      // From (12,23) up the pier to (12,21), below the trigger at y20.
      moveNpc("doctor", ...steps("up", 2)),
      face("doctor", "toPlayer"),
      say("TODO(text): A woman in a grey coat approaches.", "NARRATOR"),
      say("TODO(text): The doctor recognises the player's seed.", "THE DOCTOR"),
      say("TODO(text): She offers to buy it for her research.", "THE DOCTOR"),
      { op: "yesno", prompt: "TODO(text): Sell the seed?", yes: [
        say("TODO(text): The doctor reaches toward the seed.", "THE DOCTOR"),
        say("TODO(text): The seed recoils and the exchange cannot happen.", "NARRATOR"),
        emote("player", "!"),
      ], no: [
        say("TODO(text): The player keeps the seed close.", "NARRATOR"),
        say("TODO(text): The doctor accepts the refusal calmly.", "THE DOCTOR"),
      ] },
      wait(30),
      say("TODO(text): Not yet, then.", "THE DOCTOR"),
      say("TODO(text): She boards a grey boat at the pier's end.", "NARRATOR"),
      camera(12, 26, 30),
      // The boardwalk at x12 stays clear through y26.
      moveNpc("doctor", ...steps("down", 5)),
      { op: "hideNpc", npc: "doctor" },
      flag("ch6_doctor_met"),
      { op: "showNpc", npc: "grunt_dock_1" },
      { op: "showNpc", npc: "grunt_dock_2" },
      camera(13, 20, 30),
      emote("grunt_dock_1", "!"),
      say("TODO(text): Two Rootstock grunts block the docks.", "NARRATOR"),
      say("TODO(text): The grunts challenge the seed's keeper.", "GRUNT"),
      cameraReset(),
    ]),
  ],
  ch6_reyes_point: [
    face("reyes_point", "toPlayer"),
    ifFlags({ ch6_doctor_met: true, beat_grunt_dock_1: true, beat_grunt_dock_2: true }, [
      ifFlags({ got_raft: false }, [
        say("TODO(text): Reyes tends the Lantern Tree's sick roots.", "NARRATOR"),
        say("TODO(text): Its fireflies once guided boats home.", "REYES"),
        say("TODO(text): She will not battle while the tree is sick.", "REYES"),
        say("TODO(text): Brother Saguaro keeps healing cactus sap.", "REYES"),
        say("TODO(text): Find him on Driftseed Isle across the sea.", "REYES"),
        say("TODO(text): Reyes lends the player a giant lily pad.", "REYES"),
        give("lily_raft"),
        flag("got_raft"),
        say("TODO(text): RAFT crosses the water to the island.", "REYES"),
        say("TODO(text): Bring the cactus sap back to the tree.", "REYES"),
      ], [
        say("TODO(text): Brother Saguaro's cactus sap can heal the tree.", "REYES"),
        say("TODO(text): Ride the raft south to Driftseed Isle.", "REYES"),
      ]),
    ], [
      say("TODO(text): Something is wrong at the docks.", "REYES"),
      say("TODO(text): Check the docks before sailing to Driftseed Isle.", "REYES"),
    ]),
  ],
  ch6_lantern_tree: [
    ifFlags({ got_sap: true, lantern_healed: false }, [
      { op: "ifHasItem", item: "cactus_sap", then: [
        camera(34, 10, 45),
        say("TODO(text): The player pours cactus sap around the roots.", "NARRATOR"),
        { op: "takeItem", item: "cactus_sap" },
        wait(30),
        { op: "flash", color: "gold" },
        { op: "sfx", id: "pulse" },
        { op: "still", image: "bloom" },
        say("TODO(text): A glow spreads through the mangrove's branches.", "NARRATOR"),
        wait(40),
        say("TODO(text): Fireflies return and light the harbour.", "NARRATOR"),
        { op: "stillClear" },
        flag("lantern_healed"),
        { op: "hideNpc", npc: "reyes_point" },
        say("TODO(text): Reyes thanks the player for bringing back the light.", "REYES"),
        say("TODO(text): She returns to the Conservatory to await a battle.", "REYES"),
        cameraReset(),
      ], else: [
        say("TODO(text): The sick tree needs the cactus sap.", "NARRATOR"),
      ] },
    ], [
      ifFlags({ lantern_healed: true }, [
        say("TODO(text): Fireflies shine among the mangrove's roots.", "NARRATOR"),
        say("TODO(text): The Lantern Tree guides boats home again.", "NARRATOR"),
      ], [
        say("TODO(text): The old mangrove once lit the harbour.", "NARRATOR"),
        say("TODO(text): Its roots are sick and its fireflies are gone.", "NARRATOR"),
      ]),
    ]),
  ],
  ch6_cons5_door: [
    ifFlags({ lantern_healed: false }, [
      { op: "sfx", id: "bump" },
      say("TODO(text): Reyes is tending the sick Lantern Tree.", "NARRATOR"),
      say("TODO(text): Heal the tree before challenging the Conservatory.", "NARRATOR"),
      movePlayer("down"),
    ]),
  ],
  ch6_isle_enter: [
    flag("visited_driftseed_isle"),
  ],
  ch6_elder: [
    face("isle_elder", "toPlayer"),
    ifFlags({ got_raft: true, visited_driftseed_isle: true }, [
      ifFlags({ got_saxifrage: false }, [
        say("TODO(text): The elder welcomes the visitor from the sea.", "ELDER"),
        say("TODO(text): Brother Saguaro waits beyond the boulders.", "ELDER"),
        say("TODO(text): The elder gives a stone-breaker plant.", "ELDER"),
        give("saxifrage"),
        flag("got_saxifrage"),
        say("TODO(text): SAXIFRAGE lets Quickened roots push boulders.", "ELDER"),
        say("TODO(text): Use UPROOT to clear the Conservatory's path.", "ELDER"),
        say("TODO(text): The Vents hold an optional stone puzzle too.", "ELDER"),
      ], [
        say("TODO(text): UPROOT moves a boulder into a clear space.", "ELDER"),
        say("TODO(text): Returning to a room resets its stones.", "ELDER"),
      ]),
    ], [
      say("TODO(text): First arrive on Driftseed Isle by raft.", "ELDER"),
    ]),
  ],
  saguaro: [
    face("saguaro", "toPlayer"),
    ifFlags({ beat_saguaro: true }, [call("ch6_saguaro_after")], [
      ifFlags({ got_saxifrage: true }, [
        say("TODO(text): Saguaro welcomes the player past the stones.", "SAGUARO"),
        say("TODO(text): Cacti keep water safely behind their thorns.", "SAGUARO"),
        say("TODO(text): Show patience and care in battle.", "SAGUARO"),
        { op: "battle", trainer: "saguaro" },
        { op: "ifLastBattle", result: "won", then: [
          say("TODO(text): Saguaro recognises the player's steady care.", "SAGUARO"),
          say("TODO(text): He presents the Cactus Mark.", "SAGUARO"),
          { op: "giveMark", mark: "cactus_mark" },
          call("ch6_saguaro_after"),
        ] },
      ], [
        say("TODO(text): Seek the elder's stone-breaker first.", "SAGUARO"),
      ]),
    ]),
  ],
  ch6_saguaro_after: [
    ifFlags({ beat_saguaro: true }, [
      ifFlags({ got_sap: false }, [
        say("TODO(text): Saguaro hears about the dark Lantern Tree.", "SAGUARO"),
        say("TODO(text): He gives cactus sap to heal its roots.", "SAGUARO"),
        give("cactus_sap"),
        flag("got_sap"),
        say("TODO(text): Carry the sap back to Saltmarsh Harbour.", "SAGUARO"),
        say("TODO(text): Pour it around the mangrove on the point.", "SAGUARO"),
      ], [
        say("TODO(text): Saguaro hopes the harbour's light returns.", "SAGUARO"),
        say("TODO(text): Water kept with care can help another plant.", "SAGUARO"),
      ]),
    ]),
  ],
  reyes: [
    face("reyes", "toPlayer"),
    ifFlags({ beat_reyes: true }, [
      say("TODO(text): Reyes thanks the keeper of the harbour's light.", "REYES"),
      say("TODO(text): The sea route is open whenever the player needs it.", "REYES"),
    ], [
      ifFlags({ lantern_healed: true }, [
        say("TODO(text): Reyes welcomes the player to the pools.", "REYES"),
        say("TODO(text): Mangrove roots hold firm against the tides.", "REYES"),
        say("TODO(text): She challenges the player with the harbour restored.", "REYES"),
        { op: "battle", trainer: "reyes" },
        { op: "ifLastBattle", result: "won", then: [
          say("TODO(text): Reyes praises the player's strength and care.", "REYES"),
          say("TODO(text): She presents the Mangrove Mark.", "REYES"),
          { op: "giveMark", mark: "mangrove_mark" },
          say("TODO(text): The Lantern Tree will guide the player's next voyage.", "REYES"),
        ] },
      ], [
        say("TODO(text): Heal the Lantern Tree before a battle.", "REYES"),
      ]),
    ]),
  ],
  ch6_end: [
    ifFlags({ beat_reyes: true, ch6_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("TODO(text): A call from Dr. Vale reaches the player.", "NARRATOR"),
      say("TODO(text): Vale has urgent news from Larchmere.", "VALE"),
      { op: "music", id: "prologue_bloom" },
      say("TODO(text): Bloom Lake has turned red.", "VALE"),
      wait(30),
      say("TODO(text): A doctor in a grey coat was seen there.", "VALE"),
      emote("player", "!"),
      say("TODO(text): The player remembers the woman at the docks.", "NARRATOR"),
      say("TODO(text): Vale asks the player to investigate the lake.", "VALE"),
      say("TODO(text): Keep the seed safe on the way to Larchmere.", "VALE"),
      flag("ch6_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch6_gh_visitor: [
    say("TODO(text): The sea is full of flowering Quickened.", "VISITOR"),
    say("TODO(text): A raft reaches their seagrass beds.", "VISITOR"),
  ],
  ch6_market_pods: [
    say("TODO(text): The clerk offers pods and fresh water for a voyage.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch6_market_care: [
    say("TODO(text): The clerk offers plant care and rain jars.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] },
  ],
  ch6_market_kid: [
    say("TODO(text): The kid misses the Lantern Tree's fireflies.", "KID"),
  ],
  cons5_gate: [
    ifFlags({ cons5_gate: true }, [
      say("TODO(text): The lever closes the sluice gate.", "NARRATOR"),
      flag("cons5_gate", false),
    ], [
      say("TODO(text): The lever opens a water passage to Reyes.", "NARRATOR"),
      flag("cons5_gate"),
    ]),
  ],
};
