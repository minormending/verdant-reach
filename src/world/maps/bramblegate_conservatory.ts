import type { MapDef, NpcDef, ScriptCmd } from "../../contracts";
import { LEGEND, flag, ifFlags, pickups, say, wait, when, type Scripts } from "../build";

// Conservatory 1: HOLLIS's hedge maze under glass.
//
// THE PUZZLE. Hedge gates (`hedge_gate` NPCs) open and close with two levers.
//   LEVER 1 (entrance terrace, toggles): off -> gate A shut, gate B open,
//     gate C open. On -> A open, B shut, C shut.
//   LEVER 2 (east lane, one-way): opens gate D between the east and west lanes.
// Gate B (east) is open from the start: through it, JR. LINDEN guards lever 2.
// Pulling it opens D; the west lane then winds up to gate C and HOLLIS.
// Pulling lever 1 first is the red herring. A opens onto the west lane, which
// has a SPRING WATER in it, but C is now shut. Walk back and flip it again.
// No state is a soft-lock: lever 1 can only change while you're on the
// entrance terrace, and lever 2 never closes (see src/world/puzzles.test.ts).
const LEVER_1 = "bgc_lever_1";
const LEVER_2 = "bgc_lever_2";

const gate = (id: string, x: number, y: number, shutWhen: Record<string, boolean>): NpcDef => ({
  id, sprite: "hedge_gate", x, y, facing: "down", movement: "static", script: "bgc_gate", visibleWhen: when(shutWhen),
});

export const bramblegate_conservatory: MapDef = {
  id: "bramblegate_conservatory",
  name: "BRAMBLEGATE CONSERVATORY",
  outdoor: false,
  music: "conservatory",
  border: "void",
  legend: LEGEND,
  ambient: "pollen",
  tiles: [
    // x: 0123456789012345
    "WOOOOOOOOOOOOOOW", // 0
    "WPPYyf*r*fyYPPPW", // 1  HOLLIS's hall
    "WPpgggrrrgggpPPW", // 2
    "WYgggggrggggggYW", // 3
    "WHHHHHHgHHHHHHHW", // 4  gate C at 7,4
    "WgggggggHYgggggW", // 5  west lane | east lane (lever 2 at 14,5)
    "WgHHHHHHHHHHgHHW", // 6
    "WgggggggggggggYW", // 7  gate D at 8,7
    "WgHgHHHHHHHPgggW", // 8  LINDEN at 14,8
    "WgggpPPHHHPPggpW", // 9
    "WHHgHHHHHHHHgHHW", // 10 gate A at 3,10, gate B at 12,10
    "WYgggHHHHHHgggYW", // 11 entrance terrace
    "WggggHPPPPHggggW", // 12 lever 1 at 1,12
    "WggggHHHHHHggggW", // 13 HAZEL at 14,13
    "WggggggggggggggW", // 14
    "WPpggggggggggpPW", // 15
    "WPPYggggggggYPPW", // 16
    "WWWWWWWEWWWWWWWW", // 17
  ],
  structures: [],
  warps: [{ x: 7, y: 17, to: "bramblegate", toX: 7, toY: 7, facing: "down" }],
  npcs: [
    { id: "hollis", sprite: "hollis", x: 7, y: 2, facing: "down", movement: "static", script: "hollis" },
    { id: "hazel", sprite: "gardener", x: 14, y: 13, facing: "left", trainer: "jr_hazel", sight: 3 },
    { id: "linden", sprite: "gardener", x: 14, y: 8, facing: "left", trainer: "jr_linden", sight: 3 },
    { id: "guide", sprite: "villager_b", x: 9, y: 16, facing: "left", movement: "static", script: "bgc_guide" },
    { id: `lever:${LEVER_1}`, sprite: "lever", x: 1, y: 12, facing: "down", movement: "static", script: "bgc_lever_1" },
    { id: `lever:${LEVER_2}`, sprite: "lever", x: 14, y: 5, facing: "down", movement: "static", script: "bgc_lever_2" },
    gate("gate_a", 3, 10, { [LEVER_1]: false }),
    gate("gate_b", 12, 10, { [LEVER_1]: true }),
    gate("gate_c", 7, 4, { [LEVER_1]: true }),
    gate("gate_d", 8, 7, { [LEVER_2]: false }),
    ...pickups([{ item: "spring_water", x: 1, y: 9 }]),
  ],
  signs: [],
  triggers: [],
};

const pan = (x: number, y: number, frames = 40): ScriptCmd => ({ op: "camera", x, y, frames });
const back: ScriptCmd = { op: "cameraReset", frames: 30 };
const clunk: ScriptCmd[] = [{ op: "sfx", id: "select" }, wait(8), { op: "sfx", id: "door" }];

export const scripts: Scripts = {
  bgc_guide: [
    ifFlags({ beat_hollis: true }, [
      say("You found the way through! Most folk try the lever first."),
    ], [
      say("Here to see HOLLIS? He waits at the heart of his hedge maze."),
      say("The levers move the hedge gates. Watch which ones open, and which close."),
      say("His QUICKENED are WOOD types. Patient, and they hit back. Bring fire."),
    ]),
  ],
  bgc_gate: [
    say("A gate of woven hazel, laid into the hedge. It won't budge by hand."),
  ],
  bgc_lever_1: [
    ifFlags({ [LEVER_1]: true }, [
      say("An iron lever, wrapped in ivy. Pull it back?"),
      pan(8, 10),
      ...clunk,
      flag(LEVER_1, false),
      wait(20),
      say("The west gate swings shut. Somewhere east, hedges creak open."),
      back,
    ], [
      say("An iron lever, wrapped in ivy. You pull it..."),
      pan(8, 10),
      ...clunk,
      flag(LEVER_1),
      wait(20),
      say("The west gate swings open! Further in, something rustles shut."),
      back,
    ]),
  ],
  bgc_lever_2: [
    ifFlags({ [LEVER_2]: true }, [
      say("The lever is wedged down with a root. The west gate stays open."),
    ], [
      say("A second lever, stiff with sap. You lean on it..."),
      pan(8, 7),
      ...clunk,
      flag(LEVER_2),
      wait(20),
      say("A hedge gate to the west folds aside, and a root locks the lever down."),
      back,
    ]),
  ],
};
