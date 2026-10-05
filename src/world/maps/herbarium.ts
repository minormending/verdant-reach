import type { MapDef } from "../../contracts";
import { LEGEND, face, ifFlags, movePlayer, say, when, type Scripts } from "../build";

// DR. VALE's lab (west) and the greenhouse room (east), joined by one doorway.
// Stairs in the corner climb to the observation deck.
export const herbarium: MapDef = {
  id: "herbarium",
  name: "HERBARIUM",
  outdoor: false,
  music: "herbarium",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWOOWWOOOOOW", // 0
    "WUtKKKKctWPpPpPW", // 1
    "WttttttttWgggggW", // 2
    "WtDDDttttWgggggW", // 3
    "WttttttttWgggggW", // 4
    "WttttttttggggggW", // 5
    "WttttttttWgggggW", // 6
    "WpttttDDpWPgggPW", // 7
    "WtttrrtttWPgggPW", // 8
    "WtttrrtttWPPPPPW", // 9
    "WWWWEWWWWWWWWWWW", // 10
  ],
  structures: [],
  warps: [
    { x: 4, y: 10, to: "fallowfield", toX: 17, toY: 7, facing: "down" },
    { x: 1, y: 1, to: "herbarium_roof", toX: 8, toY: 9, facing: "left" },
  ],
  npcs: [
    { id: "pot_oak", sprite: "potted_plant", x: 11, y: 3, facing: "down", script: "pot_oak",
      visibleWhen: when({ got_starter_oak: false, rival_has_oak: false }) },
    { id: "pot_chili", sprite: "potted_plant", x: 12, y: 3, facing: "down", script: "pot_chili",
      visibleWhen: when({ got_starter_chili: false, rival_has_chili: false }) },
    { id: "pot_lily", sprite: "potted_plant", x: 13, y: 3, facing: "down", script: "pot_lily",
      visibleWhen: when({ got_starter_lily: false, rival_has_lily: false }) },
    { id: "vale_gh", sprite: "vale", x: 12, y: 6, facing: "up", movement: "static", script: "vale_morning",
      visibleWhen: when({ got_starter: false }) },
    { id: "vale", sprite: "vale", x: 5, y: 2, facing: "down", movement: "static", script: "vale_talk",
      visibleWhen: when({ got_starter: true }) },
    { id: "aide", sprite: "villager_b", x: 13, y: 8, facing: "up", movement: "look_around", script: "herb_aide" },
    { id: "archivist", sprite: "elder", x: 7, y: 5, facing: "left", movement: "look_around", script: "herb_archivist" },
  ],
  signs: [],
  triggers: [
    { x: 4, y: 9, script: "herb_exit_block", when: when({ vale_greeted: true, got_starter: false }) },
  ],
  onEnter: "herb_enter",
  // VALE waters the starter here, so an early wilt-out comes back to the lab.
  healPoint: { x: 4, y: 8 },
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
    say("<PLAYER>! The seedlings are this way, in the greenhouse!", "VALE"),
    movePlayer("up"),
  ],
  herb_aide: [
    ifFlags({ theft_seen: true }, [
      ifFlags({ got_pods: true }, [
        say("I've moved the last pot by the window. It keeps turning to watch the door."),
      ], [
        say("He was in and out so fast! Dark coat, quick hands."),
      ]),
    ], [
      say("I water these three every morning. Today they'd all turned to face the door."),
      say("Seedlings lean toward light, not doors! It's called phototropism."),
    ]),
  ],
  herb_archivist: [
    say("Every sheet here is a pressed plant, with the date and place it was found."),
    say("Science is mostly careful noticing. And good glue."),
  ],
};
