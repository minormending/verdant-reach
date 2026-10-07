// Chapter 9 world staging. Story and quest logic belong to the next wave.
import { ifFlags, movePlayer, say, type Scripts } from "../build";

const stub = (id: string) => [say(`TODO(text): ${id}`)];
export const ch9Scripts: Scripts = {
  ch9_east_gate: stub("The east road is closed."),
  ch9_arrival: stub("ch9_arrival"),
  ch9_tumbleweed: stub("ch9_tumbleweed"),
  rival_5: stub("rival_5"),
  ch9_cons8_door: [ifFlags({ rival_5_done: false }, [
    say("TODO(text): ROOK only sees challengers who have come the hard way."),
    movePlayer("down"),
  ])],
  rook: stub("rook"),
  ch9_rook_after: stub("ch9_rook_after"),
  ch9_end: stub("ch9_end"),
  q_window_panes: stub("q_window_panes"),
  ch9_gh_visitor: stub("ch9_gh_visitor"),
  ch9_house_resident: stub("ch9_house_resident"),
  ch9_market_visitor: stub("ch9_market_visitor"),
  ch9_market_kid: stub("ch9_market_kid"),
  ch9_market_pods: [say("TODO(text): ch9_market_pods"),
    { op: "shop", stock: ["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost"] },
  ],
  ch9_market_care: [say("TODO(text): ch9_market_care"),
    { op: "shop", stock: ["neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar", "ember_ash"] },
  ],
};
