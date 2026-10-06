// World-draft stubs. Narrative owns the full §F scenes in the next task.
// Keep only progression flags needed to exercise map gates, and the lantern
// grant needed to prove the real dark rooms reachable in the GLOW validator.
import { flag, give, ifFlags, movePlayer, say, type Scripts } from "../build";

// Long ids need word boundaries to fit the 18-column dialogue box.
const todo = (id: string) => say(`TODO(text): ${id.split(" ").map((word) => word.length > 18 ? word.replaceAll("_", " ") : word).join(" ")}`);
export const ch5Scripts: Scripts = {
  ch5_grove_ranger: [todo("ch5_grove_ranger")],
  ch5_arrival: [todo("ch5_arrival"), flag("ch5_arrived"), flag("visited_cedarhallow")],
  ch5_conservatory_door: [
    ifFlags({ burnt_vision_seen: false }, [todo("ch5_conservatory_door: Morrow is out"), movePlayer("down")], [
      ifFlags({ got_lantern: false }, [todo("ch5_conservatory_door: bring a light"), movePlayer("down")]),
    ]),
  ],
  ch5_grunts: [todo("ch5_grunts"), flag("ch5_grunts_seen")],
  rival_4: [todo("rival_4"), flag("rival_4_done")],
  ch5_vision: [todo("ch5_vision"), flag("burnt_vision_seen")],
  ch5_morrow_burnt: [todo("ch5_morrow_burnt"), flag("morrow_returned")],
  ch5_shrine_keeper: [
    todo("ch5_shrine_keeper"),
    ifFlags({ burnt_vision_seen: true, got_lantern: false }, [give("foxfire_lantern"), flag("got_lantern")]),
    ifFlags({ got_lantern: true }, [{ op: "call", script: "q_shrine_offerings" }]),
  ],
  ch5_end: [todo("ch5_end"), flag("ch5_done")],
  morrow: [todo("morrow")],
  q_fire_followers: [todo("q_fire_followers")],
  q_shrine_offerings: [todo("q_shrine_offerings")],
  q_shrine_offerings_shrine_1: [todo("q_shrine_offerings_shrine_1"), flag("shrine_1_offered")],
  q_shrine_offerings_shrine_2: [todo("q_shrine_offerings_shrine_2"), flag("shrine_2_offered")],
  q_shrine_offerings_shrine_3: [todo("q_shrine_offerings_shrine_3"), flag("shrine_3_offered")],
};
