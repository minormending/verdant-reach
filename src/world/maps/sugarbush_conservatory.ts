import type { MapDef, ScriptCmd, TileKey } from "../../contracts";
import { LEGEND, flag, ifFlags, say, wait, type Scripts } from "../build";

// Conservatory 2: NELL PITCHER's bog under glass, misty and humming.
//
// THE PUZZLE. Three sluice channels cut the room. A full channel is deep
// water; a drained one leaves bog and a sunken boardwalk you can cross.
//   VALVE 1 (entrance, toggles) sends the water west or east:
//     off -> channel A (west) full, channel B (east) drained;
//     on  -> channel A drained, channel B full.
//   VALVE 2 (east lane, toggles) drains channel C below NELL's dais.
// The way up is the west lane, but its channel A starts full. So: cross the
// drained east channel B, beat JR. TANSY, turn valve 2 to drain C, then go
// back and turn valve 1, which drains A and floods B. Up the west lane past
// JR. SORREL, over C, to NELL.
// Valve 1 only turns while you're at the entrance, and valve 2 only from the
// east lane, so no state strands you (see src/world/puzzles.test.ts).
//
// The base legend is every channel drained, the union the validator walks.
// `legendWhen` floods each channel while its valve says so, which is the
// default at the start.
const VALVE_1 = "sbc_valve_1";
const VALVE_2 = "sbc_valve_2";

const FULL: TileKey = "water_channel";
const channel = (body: string, crossing: string): Record<string, TileKey> => ({ [body]: FULL, [crossing]: FULL });

export const sugarbush_conservatory: MapDef = {
  id: "sugarbush_conservatory",
  name: "SUGARBUSH CONSERVATORY",
  outdoor: false,
  music: "conservatory",
  border: "void",
  legend: {
    ...LEGEND,
    // channel A (west): body / crossing
    a: "bog", d: "boardwalk",
    // channel B (east)
    e: "bog", i: "boardwalk",
    // channel C (below the dais)
    l: "bog", x: "boardwalk",
  },
  legendWhen: [
    { when: [{ flag: VALVE_1, is: false }], legend: channel("a", "d") },
    { when: [{ flag: VALVE_1, is: true }], legend: channel("e", "i") },
    { when: [{ flag: VALVE_2, is: false }], legend: channel("l", "x") },
  ],
  ambient: "mist",
  tiles: [
    // x: 012345678901234567
    "WOOOOOOOOOOOOOOOOW", // 0
    "WPPq00bb==bb00qPPW", // 1  NELL's dais (NELL at 8,1)
    "WPqbb======bbbbqPW", // 2
    "Wqbb==bbbbbq0~~0qW", // 3
    "Wqbb=bbqq~~~~~~~qW", // 4
    "Wlllxllll~~0~~~0~W", // 5  channel C (crossing at 4,5)
    "Wbbb=bbqPPbbb===bW", // 6  west lane | east lane (valve 2 at 16,6)
    "Wbqq=bbq~~bqq=bqqW", // 7
    "Wbbb=qqq~0bbb=bbbW", // 8  SORREL at 1,8
    "Wqbb=bbb~~qbb=bqbW", // 9
    "WPbb=bqPP~qqq=bbbW", // 10 TANSY at 16,10
    "Wbbb=bbbPPbbb=bbqW", // 11
    "WaaadaaaPPeeeieeeW", // 12 channel A (crossing 4,12) | channel B (crossing 13,12)
    "Wbbb==========bbbW", // 13
    "Wqbbbbbbb=bbbbbbqW", // 14 valve 1 at 8,14
    "WPPqbbbbb=bbbbqPPW", // 15
    "WPPPqbbb===bbqPPPW", // 16
    "WWWWWWWWWEWWWWWWWW", // 17
  ],
  structures: [],
  warps: [{ x: 9, y: 17, to: "sugarbush", toX: 5, toY: 7, facing: "down" }],
  npcs: [
    { id: "nell", sprite: "nell_pitcher", x: 8, y: 1, facing: "down", movement: "static", script: "nell" },
    { id: "sorrel", sprite: "gardener", x: 1, y: 8, facing: "right", trainer: "jr_sorrel", sight: 3 },
    { id: "tansy", sprite: "schoolkid", x: 16, y: 10, facing: "left", trainer: "jr_tansy", sight: 3 },
    { id: "guide", sprite: "villager_b", x: 10, y: 16, facing: "left", movement: "static", script: "sbc_guide" },
    { id: `valve:${VALVE_1}`, sprite: "valve", x: 8, y: 14, facing: "down", movement: "static", script: "sbc_valve_1" },
    { id: `valve:${VALVE_2}`, sprite: "valve", x: 16, y: 6, facing: "down", movement: "static", script: "sbc_valve_2" },
  ],
  signs: [],
  triggers: [],
  encounters: {
    bog: {
      rate: 10,
      slots: [
        { species: "sundew_rosette", minLevel: 12, maxLevel: 15, weight: 40 },
        { species: "flytrap_seedling", minLevel: 12, maxLevel: 14, weight: 35 },
        { species: "fern_fiddlehead", minLevel: 12, maxLevel: 14, weight: 25 },
      ],
    },
  },
};

const pan = (x: number, y: number, frames = 40): ScriptCmd => ({ op: "camera", x, y, frames });
const back: ScriptCmd = { op: "cameraReset", frames: 30 };
const turn: ScriptCmd[] = [{ op: "sfx", id: "select" }, wait(6), { op: "sfx", id: "select" }, wait(6), { op: "sfx", id: "ledge" }];

export const scripts: Scripts = {
  sbc_guide: [
    ifFlags({ beat_nell: true }, [
      say("NELL says the bog is humming again tonight. Can you hear it?"),
    ], [
      say("Welcome to NELL's bog! Mind your feet. The channels run deep."),
      say("The valves send water one way or the other. Never both."),
      say("Her hunters are BUG types. They snap, stick and drain. Bring fire!"),
    ]),
  ],
  sbc_valve_1: [
    ifFlags({ [VALVE_1]: true }, [
      say("A brass valve, green with age. You turn it back..."),
      ...turn,
      pan(8, 11),
      flag(VALVE_1, false),
      wait(30),
      say("The west channel floods! Water drains out of the east one."),
      back,
    ], [
      say("A brass valve, green with age. You heave it round..."),
      ...turn,
      pan(8, 11),
      flag(VALVE_1),
      wait(30),
      say("The west channel gurgles dry! The east one fills to the brim."),
      back,
    ]),
  ],
  sbc_valve_2: [
    ifFlags({ [VALVE_2]: true }, [
      say("You crank the sluice valve shut again..."),
      ...turn,
      pan(4, 5),
      flag(VALVE_2, false),
      wait(30),
      say("Water rushes back in under the dais."),
      back,
    ], [
      say("A sluice valve, sticky with sundew dew. You wrench it open..."),
      ...turn,
      pan(4, 5),
      flag(VALVE_2),
      wait(30),
      say("Far to the west, the channel below NELL's dais drains to mud!"),
      back,
    ]),
  ],
};
