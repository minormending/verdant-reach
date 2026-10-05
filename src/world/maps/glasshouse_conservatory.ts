import type { MapDef, NpcDef, ScriptCmd } from "../../contracts";
import { LEGEND, flag, ifFlags, pickups, say, wait, when, type Scripts } from "../build";

// Conservatory 3: FLORA VANCE's rose maze, under a glass roof full of roses.
//
// THE PUZZLE. Trellis gates (`rose_gate` NPCs) open and shut with two levers.
//   LEVER 1 (entrance hall, toggles): off -> gate A (west) shut, gate B (east)
//     open. On -> A open, B shut.
//   LEVER 2 (east wing, toggles): off -> gate C (the stage) shut, gate D (the
//     west alcove) open. On -> C open, D shut.
// The obvious first move, pulling lever 1, opens the west wing: its alcove
// has a PLANT FOOD, but the stage gate C is shut. The way through: go east
// while B is open, pull lever 2 (C opens), come back, pull lever 1 (A opens),
// then up the west wing to the stage. No state is a soft-lock: lever 1 can
// only change from the entrance hall and lever 2 only from the east wing, so
// the gate you came in by never shuts behind you (src/world/puzzles.test.ts).
const LEVER_1 = "rgc_lever_1";
const LEVER_2 = "rgc_lever_2";

const gate = (id: string, x: number, y: number, shutWhen: Record<string, boolean>): NpcDef => ({
  id, sprite: "rose_gate", x, y, facing: "down", movement: "static", script: "rgc_gate", visibleWhen: when(shutWhen),
});

export const glasshouse_conservatory: MapDef = {
  id: "glasshouse_conservatory",
  name: "ROSE CONSERVATORY",
  outdoor: false,
  music: "conservatory",
  border: "void",
  legend: LEGEND,
  ambient: "pollen",
  tiles: [
    // x: 0123456789012345
    "WOOOOOOOOOOOOOOW", // 0
    "W)Y)'''''''')Y)W", // 1 FLORA's stage
    "W)))''''''''))pW", // 2
    "W))Y''''''''Y))W", // 3
    "W((((((i(((((((W", // 4 gate C at 7,4 (lever 2 on)
    "Wiiiiiii((((iiiW", // 5 west corridor to C | east wing top (lever 2 at 14,5)
    "Wi(((i)(()()i()W", // 6 gate D at 1,6 (lever 2 off): the alcove
    "Wi(Y(ii((Y)(ii)W", // 7 WEXLEY at 6,7 | POSY at 13,7
    "Wi(((i)((()(i()W", // 8
    "Wi(((i(())((i))W", // 9 PLANT FOOD in the alcove at 1,9
    "W((((i((((((i((W", // 10 gate A at 5,10 (lever 1 on), gate B at 12,10 (lever 1 off)
    "WYiiii)iii)iiiYW", // 11 entrance hall
    "WiiiiiiiiiiiiiiW", // 12 lever 1 at 1,12
    "W)iiiiiiiiiiii)W", // 13
    "W))iiiiiiiiii))W", // 14
    "WY)iiiiiiiiii)YW", // 15
    "WY)iiiirriiii)YW", // 16
    "WWWWWWWEWWWWWWWW", // 17
  ],
  structures: [],
  warps: [{ x: 7, y: 17, to: "glasshouse_city", toX: 20, toY: 6, facing: "down" }],
  npcs: [
    { id: "flora", sprite: "flora_vance", x: 7, y: 2, facing: "down", movement: "static", script: "flora" },
    { id: "posy", sprite: "arranger", x: 13, y: 7, facing: "left", trainer: "jr_posy", sight: 1 },
    { id: "wexley", sprite: "gentleman", x: 6, y: 7, facing: "left", trainer: "jr_wexley", sight: 1 },
    { id: "guide", sprite: "florist", x: 10, y: 15, facing: "left", movement: "look_around", script: "rgc_guide" },
    { id: `lever:${LEVER_1}`, sprite: "lever", x: 1, y: 12, facing: "down", movement: "static", script: "rgc_lever_1" },
    { id: `lever:${LEVER_2}`, sprite: "lever", x: 14, y: 5, facing: "down", movement: "static", script: "rgc_lever_2" },
    gate("gate_a", 5, 10, { [LEVER_1]: false }),
    gate("gate_b", 12, 10, { [LEVER_1]: true }),
    gate("gate_c", 7, 4, { [LEVER_2]: false }),
    gate("gate_d", 1, 6, { [LEVER_2]: true }),
    ...pickups([{ item: "plant_food", x: 1, y: 9 }]),
  ],
  // Dropped in the rose bed by the east door, under the petals.
  hidden: [{ x: 14, y: 13, item: "neem_spray" }],
  signs: [],
  triggers: [],
};

const pan = (x: number, y: number, frames = 40): ScriptCmd => ({ op: "camera", x, y, frames });
const back: ScriptCmd = { op: "cameraReset", frames: 30 };
const clunk: ScriptCmd[] = [{ op: "sfx", id: "select" }, wait(8), { op: "sfx", id: "door" }];

export const scripts: Scripts = {
  rgc_guide: [
    ifFlags({ beat_flora: true }, [
      say("You beat FLORA? She'll write a song about it. A sad one."),
    ], [
      say("Here for FLORA? She's on the stage, at the heart of the roses."),
      say("The levers swing the trellis gates. One lever never does the whole job."),
      say("Her QUICKENED are BLOOM types. Lovely, and vicious. Bring fire."),
    ]),
  ],
  rgc_gate: [
    say("A gate of trellis, woven thick with climbing roses. It won't budge."),
  ],
  rgc_lever_1: [
    ifFlags({ [LEVER_1]: true }, [
      say("A brass lever, wound with rose stems. Pull it back?"),
      pan(8, 10),
      ...clunk,
      flag(LEVER_1, false),
      wait(20),
      say("The west gate swings shut. The east gate opens with a rustle."),
      back,
    ], [
      say("A brass lever, wound with rose stems. You pull it..."),
      pan(8, 10),
      ...clunk,
      flag(LEVER_1),
      wait(20),
      say("The west gate swings open! The east gate shuts behind its roses."),
      back,
    ]),
  ],
  rgc_lever_2: [
    ifFlags({ [LEVER_2]: true }, [
      say("The second lever. Pull it back?"),
      pan(5, 5),
      ...clunk,
      flag(LEVER_2, false),
      wait(20),
      say("Far off, the stage gate closes. Something in the west wing opens."),
      back,
    ], [
      say("A second lever, slick with sap. You lean on it..."),
      pan(5, 5),
      ...clunk,
      flag(LEVER_2),
      wait(20),
      say("Up by the stage, a trellis gate folds aside. Something west shuts."),
      back,
    ]),
  ],
};
