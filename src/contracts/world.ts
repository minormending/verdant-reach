// World data shapes. Owned by the world agent (src/world/), interpreted by the
// engine agent (src/overworld/).

import type {
  CharacterKey, Dir, ItemId, MapId, MarkId, MoveId, MusicId, ScriptId,
  SfxId, JingleId, SpeciesId, StructureKey, TileKey, TrainerId, TrainerPortraitKey,
} from "./ids";

export type TimeOfDay = "morning" | "day" | "night";

/** All conditions must hold. Flags default to false. */
export type Cond = { flag: string; is: boolean }[];

export interface EncounterSlot {
  species: SpeciesId;
  minLevel: number;
  maxLevel: number;
  weight: number;               // relative
  time?: "any" | "day" | "night"; // "day" covers morning+day
}

export interface MapDef {
  id: MapId;
  name: string;                 // shown on entry, e.g. "ROUTE 1"
  outdoor: boolean;             // outdoor maps get the night tint
  music: MusicId;
  /** Rows of single characters; `legend` maps each character to a tile. */
  tiles: string[];
  legend: Record<string, TileKey>;
  /** Legend overrides applied while their condition holds (e.g. the grove's
   *  tapped maples become plain maples once `grove_cleared`). First match wins. */
  legendWhen?: { when: Cond; legend: Record<string, TileKey> }[];
  /** Tile used beyond the map edge (e.g. "tree" outdoors, "void" indoors). */
  border: TileKey;
  structures: { key: StructureKey; x: number; y: number }[];
  warps: { x: number; y: number; to: MapId; toX: number; toY: number; facing?: Dir }[];
  npcs: NpcDef[];
  signs: { x: number; y: number; text: string }[];
  /** Step-on triggers. */
  triggers: { x: number; y: number; w?: number; h?: number; script: ScriptId; when?: Cond }[];
  encounters?: {
    grass?: { rate: number; slots: EncounterSlot[] }; // rate: % chance per step on tall_grass
    bog?: { rate: number; slots: EncounterSlot[] };
  };
  /** Runs each time the map is entered (after fade-in). */
  onEnter?: ScriptId;
  /** Where to send the player after wilting out, if this is a healing map. */
  healPoint?: { x: number; y: number };
}

export interface NpcDef {
  id: string;                   // unique within the map
  sprite: CharacterKey;
  x: number;
  y: number;
  facing: Dir;
  movement?: "static" | "wander" | "look_around";
  /** Talk script. Trainers use `trainer` instead (engine runs intro -> battle -> after). */
  script?: ScriptId;
  trainer?: TrainerId;
  /** Trainers spot the player within this many tiles in their facing direction (default 4). */
  sight?: number;
  visibleWhen?: Cond;
}

export type ScriptCmd =
  | { op: "say"; text: string; speaker?: string }        // auto-wrapped, paged
  | { op: "choice"; prompt?: string; options: string[]; branches: ScriptCmd[][] }
  | { op: "yesno"; prompt: string; yes: ScriptCmd[]; no: ScriptCmd[] }
  | { op: "if"; when: Cond; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "ifTime"; time: TimeOfDay[]; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "setFlag"; flag: string; value?: boolean }      // default true
  | { op: "giveItem"; item: ItemId; qty?: number }
  | { op: "takeItem"; item: ItemId; qty?: number }
  | { op: "giveMoney"; amount: number }
  | { op: "giveSpecies"; species: SpeciesId; level: number; moves?: MoveId[] }
  | { op: "showSpecies"; species: SpeciesId }             // big sprite pop-up (starter choice)
  | { op: "hideSpecies" }
  | { op: "giveMark"; mark: MarkId }
  | { op: "battle"; trainer: TrainerId; canLose?: boolean } // sets flag `beat_<trainer>` on win
  | { op: "wildBattle"; species: SpeciesId; level: number; canLose?: boolean }
  | { op: "ifLastBattle"; result: "won" | "lost"; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "heal" }                                        // full party heal + jingle
  | { op: "warp"; to: MapId; x: number; y: number; facing?: Dir }
  | { op: "movePlayer"; path: Dir[] }
  | { op: "moveNpc"; npc: string; path: Dir[] }
  | { op: "face"; who: "player" | string; dir: Dir | "toPlayer" }
  | { op: "showNpc"; npc: string }
  | { op: "hideNpc"; npc: string }
  | { op: "music"; id: MusicId }
  | { op: "restoreMusic" }                                // back to the map's music
  | { op: "sfx"; id: SfxId }
  | { op: "jingle"; id: JingleId }
  | { op: "wait"; frames: number }
  | { op: "fade"; to: "black" | "white" | "clear" }
  | { op: "shake"; frames: number }
  | { op: "emote"; who: "player" | string; emote: "!" | "?" | "..." | "♪" }
  | { op: "shop"; stock: ItemId[] }
  | { op: "openCabinet" }                                 // party/box storage
  | { op: "nameRival" }                                   // optional; default "BRAM"
  | { op: "call"; script: ScriptId }
  | { op: "endSlice" }                                    // "to be continued" card -> title
  | { op: "end" };

export interface TrainerDef {
  id: TrainerId;
  name: string;                 // e.g. "HOLLIS"
  className: string;            // e.g. "WARDEN", "GARDENER"
  portrait: TrainerPortraitKey;
  team: { species: SpeciesId; level: number; moves?: MoveId[] }[];
  prize: number;                // money on win
  intro: string;                // said before battle (overworld)
  defeat: string;               // said in battle when beaten
  after: string;                // said when talked to afterwards
  ai: "basic" | "smart";
  items?: { item: ItemId; qty: number }[]; // leaders may use healing items
  music?: "battle_trainer" | "battle_leader" | "battle_rootstock";
  mark?: MarkId;                // leaders award a mark
}

export interface WorldData {
  maps: Record<MapId, MapDef>;
  scripts: Record<ScriptId, ScriptCmd[]>;
  trainers: Record<TrainerId, TrainerDef>;
  /** New game: where the player starts (inside the Herbarium at night, prologue). */
  newGame: { map: MapId; x: number; y: number; facing: Dir; script: ScriptId };
}
