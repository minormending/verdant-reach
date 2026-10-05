import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, say, when, type Scripts } from "../build";

// The NURSERY GARDEN: PEONY's potting house (the counter: boarding, via the
// `nursery` op) opens east into LUPIN's glass lean-to yard. A low hedge, the
// keepers' pride, splits the yard; the boarders (the engine draws whichever
// QUICKENED are staying) graze on the far lawn, round its south end.
// BRAM (rival 3) shoves straight through the hedge at 13,4 on his way out:
// from then on that cell is a trampled gap (legendWhen on `]`).
export const glasshouse_nursery: MapDef = {
  id: "glasshouse_nursery",
  name: "NURSERY GARDEN",
  outdoor: false,
  music: "greenhouse",
  border: "void",
  legend: { ...LEGEND, "]": "hedge" },
  legendWhen: [{ when: when({ rival_3_done: true }), legend: { "]": "dirt" } }],
  ambient: "pollen",
  tiles: [
    // x: 0         1
    // x: 012345678901234567
    "WWOOWWOOWIIIIIIIII", // 0 the house | the glass lean-to yard
    "WzKKpzKYWdzz.H...I", // 1 seed shelves | potting bench; the keepers' hedge runs down x13
    "WgggggggWg...H...I", // 2 PEONY behind the counter at 2,2; LUPIN at 11,2
    "WCCCCwwwW..d.H...I", // 3
    "Wwwwwwwwwgg..]...I", // 4 BRAM at 9,4 (rival_3); he shoves through the hedge at 13,4
    "WhDhwwwwwg...H...I", // 5
    "WhDhwwwYWG...H...I", // 6
    "WpwwrrwpWGk.....zI", // 7 the path round the hedge's south end
    "WWWWEWWWWIIIIIIIII", // 8
  ],
  structures: [],
  warps: [{ x: 4, y: 8, to: "glasshouse_city", toX: 5, toY: 28, facing: "down" }],
  npcs: [
    { id: "nursery_keeper", sprite: "nursery_keeper", x: 2, y: 2, facing: "down", movement: "static", script: "gn_keeper" },
    { id: "nursery_keeper_b", sprite: "nursery_keeper_b", x: 11, y: 2, facing: "down", movement: "look_around", script: "q_first_seed" },
    { id: "bram", sprite: "bram", x: 9, y: 4, facing: "left", movement: "static", script: "rival_3",
      visibleWhen: when({ relay_listened: true, rival_3_done: false }) },
    // Boarders: the engine draws nursery slot 1 / 2 here (hidden while empty).
    { id: "boarder_1", sprite: "potted_plant", x: 15, y: 2, facing: "down", movement: "wander" },
    { id: "boarder_2", sprite: "potted_plant", x: 15, y: 5, facing: "down", movement: "wander" },
    { id: "cat", sprite: "cat", x: 6, y: 5, facing: "left", movement: "static", script: "gn_cat" },
  ],
  signs: [
    { x: 9, y: 1, text: "A POTTING BENCH. Seed trays, a dibber and a ball of garden twine." },
    { x: 11, y: 3, text: "LUPIN's notebook: \"Bees in at 9. Bees out at 5. Pumpkins: being dramatic.\"" },
  ],
  triggers: [],
  onEnter: "gn_enter",
};

export const scripts: Scripts = {
  // Rival 3: BRAM is here the first time you visit after the RELAY.
  gn_enter: [
    ifFlags({ relay_listened: true, rival_3_done: false }, [{ op: "call", script: "rival_3" }]),
  ],
  gn_cat: [
    ifFlags({ rival_3_done: true }, [
      say("The cat glares at the hole in the hedge as if it were personally insulted."),
    ], [
      say("The NURSERY cat sleeps in a seed tray. It's warm, and nothing will sprout on it."),
    ]),
  ],
};
