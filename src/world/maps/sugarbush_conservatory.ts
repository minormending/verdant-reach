import type { MapDef } from "../../contracts";
import { LEGEND, say, type Scripts } from "../build";

// Conservatory 2: a bog under glass. Boardwalks zig-zag across two water
// channels; anything off the boardwalk is bog, where hunters lurk.
export const sugarbush_conservatory: MapDef = {
  id: "sugarbush_conservatory",
  name: "SUGARBUSH CONSERVATORY",
  outdoor: false,
  music: "conservatory",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WOOOOOOOOOOOOOOOOW", // 0
    "WPPPPPpggggpPPPPPW", // 1
    "WbbbbbggggggbbbbbW", // 2
    "Wbbbbbgggggg===bbW", // 3
    "W%%%%%%%%%%%%%=%%W", // 4
    "WPPbb~~~~bbbbb=bbW", // 5
    "Wbbbbbbbbbbbbb=bbW", // 6
    "Wbb============bbW", // 7
    "Wbb=bbbbbbbbbbbbbW", // 8
    "W%%=%%%%%%%%%%%%%W", // 9
    "Wbb=bbbbbbb~~~~PPW", // 10
    "Wbb=bbbbbbb~~~~PPW", // 11
    "Wbb========~~~~PPW", // 12
    "WPPPbbbb===bbbPPPW", // 13
    "WPPPbbbb===bbbPPPW", // 14
    "WWWWWWWWWEWWWWWWWW", // 15
  ],
  structures: [],
  warps: [{ x: 9, y: 15, to: "sugarbush", toX: 5, toY: 7, facing: "down" }],
  npcs: [
    { id: "nell", sprite: "nell_pitcher", x: 8, y: 1, facing: "down", movement: "static", script: "nell" },
    { id: "sorrel", sprite: "gardener", x: 6, y: 11, facing: "down", trainer: "jr_sorrel", sight: 2 },
    { id: "tansy", sprite: "schoolkid", x: 9, y: 6, facing: "down", trainer: "jr_tansy", sight: 2 },
    { id: "guide", sprite: "villager_b", x: 10, y: 13, facing: "up", movement: "static", script: "sbc_guide" },
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

export const scripts: Scripts = {
  sbc_guide: [
    say("Welcome to NELL's bog! Stay on the boardwalk if you'd rather not be eaten."),
    say("Joking! Mostly. Her hunters are BUG types. They snap, stick and drain."),
    say("The bog off the boardwalk is full of wild ones. Bring NEEM SPRAY."),
  ],
};
