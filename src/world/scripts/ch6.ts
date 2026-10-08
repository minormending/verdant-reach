// Chapter 6's staging and progression (docs/CH6.md §1, §5–§6).
// Voice: docs/STYLE.md §5. One idea per box; text boxes are 18 columns x 2 lines.
// Narration has no speaker (as in ch5): a "NARRATOR" speaker would print "NARRATOR:".
import type { ScriptCmd } from "../../contracts";
import { emote, face, flag, give, ifFlags, moveNpc, movePlayer, say, steps, wait, type Scripts } from "../build";

const camera = (x: number, y: number, frames = 45): ScriptCmd => ({ op: "camera", x, y, frames });
const cameraReset = (frames = 30): ScriptCmd => ({ op: "cameraReset", frames });
const call = (script: string): ScriptCmd => ({ op: "call", script });

export const ch6Scripts: Scripts = {
  ch6_ford_keeper: [
    face("ford_keeper", "toPlayer"),
    say("Still flooded. The reeds hide the deep holes.", "FORD KEEPER"),
    say("Wait till the south road drains. It always does.", "FORD KEEPER"),
  ],
  ch6_town_enter: [
    call("ch6_arrival"),
    call("ch6_end"),
  ],
  ch6_arrival: [
    ifFlags({ ch6_arrived: false }, [
      camera(12, 23, 60),
      say("SALTMARSH HARBOUR. Fishing boats knock softly against the docks."),
      camera(34, 10, 60),
      say("Out on the point, the LANTERN TREE stands dark."),
      say("Not one firefly glows among its mangrove roots."),
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
      say("A woman in a grey coat walks up the pier. She doesn't hurry."),
      say("That seed of yours. It's awake, isn't it?", "THE DOCTOR"),
      say("I study growth. I'd pay well to study yours.", "THE DOCTOR"),
      { op: "yesno", prompt: "Sell her the seed?", yes: [
        say("Sensible. Now, let me just take a look...", "THE DOCTOR"),
        say("Her glove nears the bag. The seed goes cold and shrinks from her."),
        emote("player", "!"),
      ], no: [
        say("<PLAYER> holds the bag a little closer."),
        say("Of course not. Nobody sells the first time.", "THE DOCTOR"),
      ] },
      wait(30),
      say("Not yet, then.", "THE DOCTOR"),
      say("She walks to the end of the pier, where a grey boat is waiting."),
      camera(12, 26, 30),
      // The boardwalk at x12 stays clear through y26.
      moveNpc("doctor", ...steps("down", 5)),
      { op: "hideNpc", npc: "doctor" },
      flag("ch6_doctor_met"),
      { op: "showNpc", npc: "grunt_dock_1" },
      { op: "showNpc", npc: "grunt_dock_2" },
      camera(13, 20, 30),
      emote("grunt_dock_1", "!"),
      say("Two grey coats step out from behind the crates. ROOTSTOCK."),
      say("The doctor asked nicely. We don't. Hand over that seed!", "GRUNT"),
      cameraReset(),
    ]),
  ],
  ch6_reyes_point: [
    face("reyes_point", "toPlayer"),
    ifFlags({ ch6_doctor_met: true, beat_grunt_dock_1: true, beat_grunt_dock_2: true }, [
      ifFlags({ got_raft: false }, [
        say("CAPTAIN REYES kneels in the mud, feeling along the tree's roots."),
        say("Its fireflies used to light the boats home. Every night.", "REYES"),
        say("I won't battle anyone while it's sick.", "REYES"),
        say("BROTHER SAGUARO keeps a cactus sap that might heal it.", "REYES"),
        say("He lives on DRIFTSEED ISLE, due south across the water.", "REYES"),
        say("Take this. A giant lily pad. Its ribs will hold you.", "REYES"),
        give("lily_raft"),
        flag("got_raft"),
        say("Face the water and you can RAFT. Start from the docks.", "REYES"),
        say("Bring the sap back to these roots. I'll be here.", "REYES"),
      ], [
        say("SAGUARO's sap is the best hope this tree has.", "REYES"),
        say("Raft south from the docks. DRIFTSEED's past the seagrass.", "REYES"),
      ]),
    ], [
      say("Trouble at the docks. I can hear it from here.", "REYES"),
      say("See to the docks first. Then we'll talk about DRIFTSEED ISLE.", "REYES"),
    ]),
  ],
  ch6_lantern_tree: [
    ifFlags({ got_sap: true, lantern_healed: false }, [
      { op: "ifHasItem", item: "cactus_sap", then: [
        camera(34, 10, 45),
        say("<PLAYER> pours the CACTUS SAP slowly around the roots."),
        { op: "takeItem", item: "cactus_sap" },
        wait(30),
        { op: "flash", color: "gold" },
        { op: "sfx", id: "pulse" },
        { op: "still", image: "lantern_tree_healed" },
        say("A soft glow climbs from the roots into the branches."),
        wait(40),
        say("Then the fireflies come back. Dozens. Hundreds. The harbour shines."),
        { op: "stillClear" },
        flag("lantern_healed"),
        say("...Look at it. You brought the light back, <PLAYER>.", "REYES"),
        say("Thank you. Come to my CONSERVATORY. Now I'll battle.", "REYES"),
        { op: "hideNpc", npc: "reyes_point" },
        cameraReset(),
      ], else: [
        say("The sick roots need CACTUS SAP. You don't have any with you."),
      ] },
    ], [
      ifFlags({ lantern_healed: true }, [
        say("Fireflies drift among the mangrove's roots, blinking softly."),
        say("The LANTERN TREE lights the boats home again."),
      ], [
        say("An old mangrove up on stilt roots. Once, it lit the whole harbour."),
        say("Its roots look sick, and its fireflies are gone."),
      ]),
    ]),
  ],
  ch6_cons5_door: [
    ifFlags({ lantern_healed: false }, [
      { op: "sfx", id: "bump" },
      say("A note on the door: \"AT THE POINT, WITH THE TREE. -REYES.\""),
      say("No challengers until the LANTERN TREE is well again."),
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
        say("Off the sea on a lily pad! Welcome to DRIFTSEED.", "OPAL"),
        say("SAGUARO? He sits behind boulders in his CONSERVATORY.", "OPAL"),
        say("Take this. SAXIFRAGE. The name means stone-breaker.", "OPAL"),
        give("saxifrage"),
        flag("got_saxifrage"),
        say("With it, your QUICKENED's roots can shove boulders.", "OPAL"),
        say("Face a boulder and UPROOT it. That's the way to SAGUARO.", "OPAL"),
        say("THE VENTS, under the east hut, have stones to shift too.", "OPAL"),
      ], [
        say("UPROOT shoves a boulder one step, if there's room.", "OPAL"),
        say("Stuck? Walk out and in again. The stones roll home.", "OPAL"),
      ]),
    ], [
      say("Nobody reaches DRIFTSEED but by water. Come back on a raft.", "OPAL"),
    ]),
  ],
  saguaro: [
    face("saguaro", "toPlayer"),
    ifFlags({ beat_saguaro: true }, [call("ch6_saguaro_after")], [
      ifFlags({ got_saxifrage: true }, [
        say("You moved the stones. Slowly, I hope. Welcome.", "SAGUARO"),
        say("A saguaro swells when it rains. Its spines guard the water.", "SAGUARO"),
        say("Show me patience. And care for what you carry.", "SAGUARO"),
        { op: "battle", trainer: "saguaro" },
        { op: "ifLastBattle", result: "won", then: [
          say("Steady. You didn't rush, and you left no one behind.", "SAGUARO"),
          say("The CACTUS MARK. It grew slowly, like everything here.", "SAGUARO"),
          { op: "giveMark", mark: "cactus_mark" },
          call("ch6_saguaro_after"),
        ] },
      ], [
        say("Stones don't move for wishing. Ask OPAL, by the landing.", "SAGUARO"),
      ]),
    ]),
  ],
  ch6_saguaro_after: [
    ifFlags({ beat_saguaro: true }, [
      ifFlags({ got_sap: false }, [
        say("The LANTERN TREE is dark? REYES must be worried sick.", "SAGUARO"),
        say("Take this sap. Water kept through a long drought.", "SAGUARO"),
        give("cactus_sap"),
        flag("got_sap"),
        say("Carry it back to SALTMARSH HARBOUR. Don't hurry the sea.", "SAGUARO"),
        say("Pour it around the old mangrove on the point. Slowly.", "SAGUARO"),
      ], [
        say("Is the harbour lit again? I like to think of it, out there.", "SAGUARO"),
        say("Water kept with care can be shared.", "SAGUARO"),
      ]),
    ]),
  ],
  reyes: [
    face("reyes", "toPlayer"),
    ifFlags({ beat_reyes: true }, [
      say("The fireflies haven't missed a night. Your doing.", "REYES"),
      say("The sea's yours now. Raft out whenever you need to.", "REYES"),
    ], [
      ifFlags({ lantern_healed: true }, [
        say("Welcome to my pools, <PLAYER>. They're deeper than they look.", "REYES"),
        say("Mangroves stand on stilt roots. Tides come and go. They stay.", "REYES"),
        say("The tree's alight, so I keep my word. Let's battle!", "REYES"),
        { op: "battle", trainer: "reyes" },
        { op: "ifLastBattle", result: "won", then: [
          say("Strong, and careful with it. That's rarer than either.", "REYES"),
          say("The MANGROVE MARK. You've earned it twice over.", "REYES"),
          { op: "giveMark", mark: "mangrove_mark" },
          say("Wherever you sail next, the LANTERN TREE will light you home.", "REYES"),
        ] },
      ], [
        say("Not while the tree's dark. Heal it first, then we'll battle.", "REYES"),
      ]),
    ]),
  ],
  ch6_end: [
    ifFlags({ beat_reyes: true, ch6_done: false }, [
      wait(20),
      { op: "sfx", id: "text_blip" }, wait(8),
      { op: "sfx", id: "text_blip" }, wait(24),
      say("A telephone rings in the MARKET. The clerk waves <PLAYER> over."),
      say("<PLAYER>? Six MARKS! Wonderful! But listen. News from LARCHMERE.", "VALE"),
      { op: "music", id: "prologue_bloom" },
      say("BLOOM LAKE has turned red. Red, from shore to shore.", "VALE"),
      wait(30),
      say("And a doctor in a grey coat was seen at the water's edge.", "VALE"),
      emote("player", "!"),
      say("A grey coat. The woman on the pier, and her grey boat."),
      say("Will you go and look? Carefully. Only look, for now.", "VALE"),
      say("And keep that seed close, all the way to LARCHMERE. Please.", "VALE"),
      flag("ch6_done"),
      flag("slice_done"),
      wait(60),
      { op: "endSlice" },
    ]),
  ],
  ch6_gh_visitor: [
    say("The sea's full of flowers. SEAGRASS blooms underwater!", "VISITOR"),
    say("On a raft you can drift right over the seagrass beds.", "VISITOR"),
  ],
  ch6_market_pods: [
    say("Off to sea? Pods, fresh water and compost for the trip.", "CLERK"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch6_market_care: [
    say("Salt air's hard on leaves. I've plant care, and RAIN JARS.", "CLERK"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] },
  ],
  ch6_market_kid: [
    ifFlags({ lantern_healed: true }, [
      say("The fireflies are back! I counted forty last night.", "KID"),
    ], [
      say("The LANTERN TREE used to glow. I miss the fireflies.", "KID"),
    ]),
  ],
  cons5_gate: [
    ifFlags({ cons5_gate: true }, [
      say("The lever creaks. The sluice gate grinds shut."),
      flag("cons5_gate", false),
    ], [
      say("The lever creaks. The sluice gate lifts, and the way to REYES opens."),
      flag("cons5_gate"),
    ]),
  ],
};
