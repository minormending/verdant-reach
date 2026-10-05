import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, movePlayer, say, when, type Scripts } from "../build";

// DR. VALE's lab (west, old oak boards) and the glass greenhouse wing (east), joined by an open
// doorway at 11,6. The lab: stairs to the observation deck, the archive shelves,
// the specimen cabinets (labelled drawers of pressed sheets), the microscope
// bench, VALE's desk and the archivist's reading table. The greenhouse: planters
// along the glass, the starter bench, potted trees and an irrigation channel.
//
// Cutscene geometry (src/world/scripts/story.ts):
// - VALE stands at her desk (5,4). The theft and letter scenes walk her down 6
//   and left 1 to 4,10, just above the player arriving at 4,11.
// - VALE in the greenhouse (15,7) walks up 1, left 4 to the doorway (11,6).
//
//            0         1
//            01234567890123456789
export const herbarium: MapDef = {
  id: "herbarium",
  name: "HERBARIUM",
  outdoor: false,
  music: "herbarium",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWOOWWWIIIIIIIII", // 0
    "WUwKKKwccKKIYPPPPPYI", // 1
    "WwwwwwwwwwwIgggggggI", // 2
    "WJwwDDDwwwwIgPPPPPgI", // 3
    "WQwwwwwwwwwIgggggggI", // 4
    "WJwwwwwJQJwIggggggYI", // 5
    "WwwwwwwwwwwgggggggPI", // 6
    "WwwwwwwhDDhIggggggPI", // 7
    "WcwwwwwwwwwIgPPgggPI", // 8
    "WcwrrrwwwwKIggggggPI", // 9
    "WwwrrrwwwwKI%%%gggPI", // 10
    "WKwrrrwwwwKIYPPpggYI", // 11
    "WWWWEWWWWWWIIIIIIIII", // 12
  ],
  structures: [],
  warps: [
    { x: 4, y: 12, to: "fallowfield", toX: 20, toY: 7, facing: "down" },
    { x: 1, y: 1, to: "herbarium_roof", toX: 9, toY: 10, facing: "left" },
  ],
  npcs: [
    { id: "pot_oak", sprite: "potted_plant", x: 14, y: 4, facing: "down", script: "pot_oak",
      visibleWhen: when({ got_starter_oak: false, rival_has_oak: false }) },
    { id: "pot_chili", sprite: "potted_plant", x: 15, y: 4, facing: "down", script: "pot_chili",
      visibleWhen: when({ got_starter_chili: false, rival_has_chili: false }) },
    { id: "pot_lily", sprite: "potted_plant", x: 16, y: 4, facing: "down", script: "pot_lily",
      visibleWhen: when({ got_starter_lily: false, rival_has_lily: false }) },
    { id: "vale_gh", sprite: "vale", x: 15, y: 7, facing: "up", movement: "static", script: "vale_morning",
      visibleWhen: when({ got_starter: false }) },
    { id: "vale", sprite: "vale", x: 5, y: 4, facing: "down", movement: "static", script: "vale_talk",
      visibleWhen: when({ got_starter: true }) },
    { id: "aide", sprite: "villager_b", x: 16, y: 9, facing: "right", movement: "look_around", script: "herb_aide" },
    { id: "archivist", sprite: "elder", x: 9, y: 8, facing: "up", movement: "look_around", script: "herb_archivist" },
  ],
  signs: [
    { x: 1, y: 4, text: "Under the lens: a leaf cell. The green specks are chloroplasts, turning light into sugar." },
    { x: 1, y: 3, text: "A tray of seeds, sorted by size. One label just says \"??? (moved)\"." },
    { x: 1, y: 5, text: "A press: two boards, blotting paper and a strap. Flat, dry, labelled." },
    { x: 8, y: 5, text: "VALE's own microscope. A sticky note: \"Pollen?? Gold. Hexagonal. ASK F.\"" },
    { x: 7, y: 5, text: "Petri dishes in a neat row. In one, the mould has spelled a perfect ring." },
    { x: 9, y: 5, text: "VALE's notes: \"Seedlings turned 40 degrees overnight. Toward the DOOR.\"" },
  ],
  triggers: [
    { x: 4, y: 11, script: "herb_exit_block", when: when({ vale_greeted: true, got_starter: false }) },
  ],
  onEnter: "herb_enter",
  // VALE waters the starter here, so an early wilt-out comes back to the lab.
  healPoint: { x: 4, y: 10 },
};

export const scripts: Scripts = {
  herb_enter: [
    ifFlags({ prologue_done: true, vale_greeted: false }, [{ op: "call", script: "vale_greeting" }], [
      ifFlags({ got_seed: true, theft_seen: false }, [{ op: "call", script: "theft" }], [
        ifFlags({ rival_1_done: true, got_pods: false }, [{ op: "call", script: "vale_letter" }]),
      ]),
    ]),
  ],
  herb_exit_block: [
    say("<PLAYER>! Not that way. The greenhouse, through the arch!", "VALE"),
    movePlayer("up"),
  ],
  herb_aide: [
    ifFlags({ theft_seen: true }, [
      ifFlags({ got_pods: true }, [
        say("The last seedling still turns to watch the door. I think it's waiting too."),
      ], [
        say("He was in and out so fast. Dark coat, quick hands."),
        say("The pot fought him. Soil all over the floor. I've never seen soil look angry."),
      ]),
    ], [
      say("I water these three every morning. Today they'd all turned to face the door."),
      say("Seedlings lean toward light, not doors. It's called phototropism. Usually."),
    ]),
  ],
  herb_archivist: [
    ifFlags({ got_starter: true }, [
      say("Pressing a leaf for your FIELD HERBARIUM? Flat, dry, then labelled."),
      say("In that order. Labelling a wet leaf is how you lose a week."),
    ], [
      say("Every sheet in these drawers is a pressed plant, with where and when it was found."),
      say("Science is mostly careful noticing. And good glue."),
    ]),
  ],
};
