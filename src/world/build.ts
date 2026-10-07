// Shared helpers for authoring world data: the tile legend, script shorthands
// and small builders (item pickups, locked doors, signs).

import type { Cond, Dir, ItemId, NpcDef, ScriptCmd, TileKey } from "../contracts";

/**
 * One legend for every map. `@` marks a structure footprint (the structure
 * image covers it; the engine treats it as solid except the door).
 */
export const LEGEND: Record<string, TileKey> = {
  ".": "grass",
  ",": "tall_grass",
  "*": "flowers",
  ":": "path",
  "+": "dirt",
  "s": "sand",
  "~": "water",
  "b": "bog",
  "=": "boardwalk",
  "v": "ledge_down",
  "T": "tree",
  "M": "maple_tree",
  "X": "tapped_maple",
  "H": "hedge",
  "B": "bramble_bush",
  "o": "rock",
  "#": "fence",
  "S": "sign",
  "m": "mailbox",
  "w": "floor_wood",
  "t": "floor_tile",
  "g": "floor_greenhouse",
  "r": "rug",
  "E": "mat_exit",
  "W": "wall",
  "O": "window",
  "C": "counter",
  "D": "table",
  "K": "bookshelf",
  "p": "plant_pot",
  "P": "planter_bed",
  "Z": "bed",
  "c": "specimen_cabinet",
  "U": "stairs_up",
  "u": "stairs_down",
  "%": "water_channel",
  "_": "void",
  "@": "path",
  // polish pass: set dressing (see TILES in src/contracts/ids.ts)
  "f": "flowers_red",
  "y": "flowers_yellow",
  "1": "stone_path",
  "2": "bridge",
  "3": "stump",
  "4": "log",
  "5": "mushrooms",
  "6": "lamp_post",
  "7": "barrel",
  "8": "crate",
  "9": "bench",
  "0": "pond_lily",
  "q": "reeds",
  "A": "cliff",
  "L": "stone_wall",
  "G": "garden_plot",
  "k": "crops",
  "j": "scarecrow",
  "n": "haybale",
  "N": "gate_open",
  "F": "fireplace",
  "V": "stove",
  "Y": "potted_tree",
  "I": "glass_wall",
  "J": "workbench",
  "Q": "microscope",
  "h": "chair",
  // Round 4: Chapter 4 (Route 4 orchard, Glasshouse City, the Palm House, the Relay)
  "}": "bramble_stump",
  "-": "paving",
  ";": "tropical_grass",
  "R": "orchard_tree",
  "a": "fallen_apples",
  "e": "stepping_stones",
  "l": "palm_tree",
  "|": "iron_railing",
  "$": "market_stall",
  "^": "fountain_basin",
  "x": "console",
  "!": "sensor_post",
  "[": "server_rack",
  "/": "cable_floor",
  "z": "seed_tray",
  "d": "potting_bench",
  "(": "rose_trellis",
  ")": "rose_bed",
  "i": "floor_marble",
  "'": "stage_floor",
  "{": "ice",
  "?": "snow",
  "<": "root_gap",
  ">": "root_bridge",
  "ø": "pit",
  "Ø": "filled_pit",
};

/** Outdoor maps: structure footprints sit on grass, so scenery with soft edges
 *  (the well, the windmill, landmark trees) shows lawn rather than road. */
export const OUTDOOR: Record<string, TileKey> = { ...LEGEND, "@": "grass" };

// --- script shorthands -------------------------------------------------------

export const say = (text: string, speaker?: string): ScriptCmd =>
  speaker ? { op: "say", text, speaker } : { op: "say", text };
export const flag = (name: string, value = true): ScriptCmd =>
  value ? { op: "setFlag", flag: name } : { op: "setFlag", flag: name, value };
export const when = (spec: Record<string, boolean>): Cond =>
  Object.entries(spec).map(([f, is]) => ({ flag: f, is }));
export const ifFlags = (spec: Record<string, boolean>, then: ScriptCmd[], els?: ScriptCmd[]): ScriptCmd =>
  els ? { op: "if", when: when(spec), then, else: els } : { op: "if", when: when(spec), then };
export const ifNight = (then: ScriptCmd[], els: ScriptCmd[]): ScriptCmd =>
  ({ op: "ifTime", time: ["night"], then, else: els });
export const moveNpc = (npc: string, ...path: Dir[]): ScriptCmd => ({ op: "moveNpc", npc, path });
export const movePlayer = (...path: Dir[]): ScriptCmd => ({ op: "movePlayer", path });
export const face = (who: string, dir: Dir | "toPlayer"): ScriptCmd => ({ op: "face", who, dir });
export const emote = (who: string, e: "!" | "?" | "..." | "♪"): ScriptCmd => ({ op: "emote", who, emote: e });
export const wait = (frames: number): ScriptCmd => ({ op: "wait", frames });
export const give = (item: ItemId, qty = 1): ScriptCmd => (qty === 1 ? { op: "giveItem", item } : { op: "giveItem", item, qty });
export const end: ScriptCmd = { op: "end" };

/** Repeat a direction n times. */
export const steps = (dir: Dir, n: number): Dir[] => Array.from({ length: n }, () => dir);

// --- builders ---------------------------------------------------------------

export type Scripts = Record<string, ScriptCmd[]>;

/**
 * Item pickups ("item balls"). Per the engine convention, an `item_pickup` NPC
 * without a script gives the item named by its id ("glass_pod", "glass_pod_2"),
 * says "found", and hides for good (flag `picked_<mapId>_<npcId>`).
 */
export function pickups(list: { item: ItemId; x: number; y: number; n?: number }[]): NpcDef[] {
  return list.map((p) => ({
    id: p.n && p.n > 1 ? `${p.item}_${p.n}` : p.item,
    sprite: "item_pickup", x: p.x, y: p.y, facing: "down", movement: "static",
  }));
}

/** Item id a script-less pickup NPC gives (mirrors the engine rule). */
export const pickupItem = (npcId: string): string => npcId.replace(/^item_/, "").replace(/_\d+$/, "");

/** A door with no interior: a line of flavour, then step back off the step. */
export const lockedDoor = (...lines: string[]): ScriptCmd[] => [
  { op: "sfx", id: "bump" },
  ...lines.map((l) => say(l)),
  movePlayer("down"),
];
