// Wave 2 scaffolding: story text and full scene/quest logic arrive in wave 3.
// Minimal grants make the world traversable and allow progression validation.
import { flag, give, ifFlags, movePlayer, say, type Scripts } from "../build";

const todo = (id: string) => say(`TODO(text): ${id}`);
export const ch6Scripts: Scripts = {
  ch6_ford_keeper: [todo("the ford is flooded")],
  ch6_town_enter: [
    ifFlags({ ch6_arrived: false }, [{ op: "call", script: "ch6_arrival" }]),
    ifFlags({ beat_reyes: true, ch6_done: false }, [{ op: "call", script: "ch6_end" }]),
  ],
  ch6_arrival: [todo("ch6_arrival"), flag("ch6_arrived"), flag("visited_saltmarsh_harbour")],
  ch6_doctor: [todo("ch6_doctor"), flag("ch6_doctor_met")],
  ch6_reyes_point: [
    ifFlags({ got_raft: false }, [todo("ch6_reyes_point"), give("lily_raft"), flag("got_raft")], [todo("cactus sap reminder")]),
  ],
  ch6_lantern_tree: [
    ifFlags({ got_sap: true, lantern_healed: false }, [todo("ch6_lantern_tree"), flag("lantern_healed")], [todo("Lantern Tree lore")]),
  ],
  ch6_cons5_door: [
    ifFlags({ lantern_healed: false }, [todo("REYES is tending the tree"), movePlayer("down")]),
  ],
  ch6_isle_enter: [flag("visited_driftseed_isle")],
  ch6_elder: [
    ifFlags({ got_saxifrage: false }, [todo("ch6_elder"), give("saxifrage"), flag("got_saxifrage")], [todo("ch6_elder reminder")]),
  ],
  saguaro: [
    ifFlags({ beat_saguaro: false }, [{ op: "battle", trainer: "saguaro" }]),
    ifFlags({ beat_saguaro: true }, [{ op: "call", script: "ch6_saguaro_after" }]),
  ],
  ch6_saguaro_after: [
    ifFlags({ got_sap: false }, [todo("ch6_saguaro_after"), flag("got_sap")], [todo("saguaro after")]),
  ],
  reyes: [
    ifFlags({ beat_reyes: false }, [{ op: "battle", trainer: "reyes" }], [todo("reyes after")]),
  ],
  ch6_end: [todo("ch6_end")],
  q_seagrass_survey: [todo("q_seagrass_survey")],
  q_hand_pollinator: [todo("q_hand_pollinator")],
  ch6_gh_visitor: [todo("ch6_gh_visitor")],
  ch6_market_pods: [todo("ch6_market_pods"), { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] }],
  ch6_market_care: [todo("ch6_market_care"), { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"] }],
  ch6_market_kid: [todo("ch6_market_kid")],
  cons5_gate: [todo("cons5_gate"), ifFlags({ cons5_gate: true }, [flag("cons5_gate", false)], [flag("cons5_gate")])],
};
