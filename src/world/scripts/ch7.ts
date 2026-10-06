// Chapter 7 world wiring. Story and quest logic belongs to the next wave.
// The lodge battle/bookcase retain just enough navigation for progression
// validation to discover the hideout; the next wave supplies their scenes.
import { flag, ifFlags, movePlayer, say, type Scripts } from "../build";
const stub = (id: string) => [say(`TODO(text): ${id}`)];
export const ch7Scripts: Scripts = {
  ch7_pass_ranger: stub("The pass is snowed in."),
  ch7_town_enter: [
    flag("visited_larchmere"),
    ifFlags({ ch7_arrived: false }, [{ op: "call", script: "ch7_arrival" }]),
    ifFlags({ beat_signe: true, ch7_done: false }, [{ op: "call", script: "ch7_end" }]),
  ],
  ch7_arrival: [say("TODO(text): Arrival in Larchmere."), flag("ch7_arrived")],
  ch7_cons7_door: [ifFlags({ lake_calmed: false }, [
    { op: "sfx", id: "bump" },
    say("TODO(text): SIGNE will not battle while the lake is screaming."),
    movePlayer("down"),
  ])],
  ch7_crimson_lily: stub("ch7_crimson_lily"),
  ch7_lodge_grunt: [ifFlags({ lodge_grunt_seen: false }, [
    say("TODO(text): ch7_lodge_grunt"), { op: "battle", trainer: "grunt_lodge" },
    { op: "ifLastBattle", result: "won", then: [flag("lodge_grunt_seen"), { op: "hideNpc", npc: "grunt_lodge" }] },
  ])],
  ch7_bookcase: [say("TODO(text): ch7_bookcase"), ifFlags({ lodge_grunt_seen: true }, [flag("lodge_stair_open"),
    { op: "warp", to: "rootstock_hideout_1", x: 2, y: 17, facing: "up" },
  ])],
  ch7_emitter_1: stub("ch7_emitter_1"),
  ch7_emitter_2: stub("ch7_emitter_2"),
  ch7_emitter_3: stub("ch7_emitter_3"),
  calloway: stub("calloway"),
  ch7_calloway_after: stub("ch7_calloway_after"),
  ch7_files: stub("ch7_files"),
  signe: stub("signe"),
  ch7_signe_after: stub("ch7_signe_after"),
  ch7_end: stub("ch7_end"),
  q_lost_climber: stub("q_lost_climber"),
  ch7_lodge_keeper: stub("ch7_lodge_keeper"),
  ch7_gh_visitor: stub("ch7_gh_visitor"),
  ch7_market_visitor: stub("ch7_market_visitor"),
  ch7_market_kid: stub("ch7_market_kid"),
  ch7_market_pods: [say("TODO(text): Pods and water."), { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] }],
  ch7_market_care: [say("TODO(text): Plant care and rain jars."), { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] }],
};
