// World data shapes. Owned by the world agent (src/world/), interpreted by the
// engine agent (src/overworld/).

import type { BattleOutcome } from "./runtime";

import type {
  CharacterKey, Dir, ItemId, MapId, MarkId, MoveId, MusicId, ScriptId, StillKey,
  SfxId, JingleId, SpeciesId, StructureKey, TileKey, TrainerId, TrainerPortraitKey,
} from "./ids";

export type TimeOfDay = "morning" | "day" | "night";
export type Ambient = "none" | "pollen" | "leaves" | "fireflies" | "rain" | "mist" | "spores";

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
  /** Black outside player/lamppost light; the bag's FOXFIRE LANTERN expands player light. */
  dark?: boolean;
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
    water?: { rate: number; slots: EncounterSlot[] }; // per raft step on water:true
  };
  /** Conditional encounter tables. First match wins; otherwise use `encounters`. */
  encountersWhen?: { when: Cond; encounters: MapDef["encounters"] }[];
  /** Force a time of day on this map regardless of the clock (e.g. the prologue
   *  roof is always night). Affects tint, lights, ambience and encounters. */
  time?: TimeOfDay;
  /** Hidden items: press A facing the tile to find it (once; flag hidden_<map>_<x>_<y>).
   *  The engine shows a faint sparkle every few seconds as a modern hint. */
  hidden?: { x: number; y: number; item: ItemId; qty?: number }[];
  /** Ambient particles drawn over the map ("fireflies" only shows at night). */
  ambient?: Ambient;
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
  /** UPROOT boulder: pushed one tile at a time; position resets on map entry. */
  pushable?: boolean;
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
  /** True only when every listed mark has been earned (Chapter 10 requires all eight). */
  | { op: "ifMarks"; marks: MarkId[]; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "battle"; trainer: TrainerId; canLose?: boolean } // sets flag `beat_<trainer>` on win
  | { op: "wildBattle"; species: SpeciesId; level: number; sport?: boolean; canLose?: boolean }
  | { op: "ifLastBattle"; result: BattleOutcome; then: ScriptCmd[]; else?: ScriptCmd[] }
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
  | { op: "camera"; x: number; y: number; frames?: number } // pan camera to a tile (cutscenes)
  | { op: "cameraReset"; frames?: number }                // pan back to the player
  | { op: "ambient"; kind: Ambient }                      // override the map's particles
  | { op: "flash"; color: "white" | "gold" }              // full-screen flash
  // --- Round 3 ---------------------------------------------------------------
  | { op: "still"; image: StillKey }                      // fade to a full-screen illustration (stays up)
  | { op: "stillClear" }                                  // fade back to the map
  | { op: "ifHasItem"; item: ItemId; qty?: number; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "ifPartyHas"; species: SpeciesId | SpeciesId[]; then: ScriptCmd[]; else?: ScriptCmd[] } // any listed
  | { op: "ifCaught"; species: SpeciesId | SpeciesId[]; then: ScriptCmd[]; else?: ScriptCmd[] }   // in herbarium.caught
  | { op: "ifCaughtCount"; atLeast: number; then: ScriptCmd[]; else?: ScriptCmd[] }
  /** Pick a bush: gives the item if it hasn't been picked today (real date), else says it's bare.
   *  Bush NPCs use the id `bush:<harvestId>`; the engine shows the picked row until tomorrow. */
  | { op: "harvest"; id: string; item: ItemId; qty?: number }
  | { op: "startQuest"; quest: string }                   // sets quest_<id>_started, notes "NEW NOTE" toast
  | { op: "completeQuest"; quest: string }                // sets quest_<id>_done + "quest" jingle
  // --- Round 4 ---------------------------------------------------------------
  /** The Nursery Garden keeper's whole counter flow: board a plant (party picker),
   *  check on boarders, collect a ready seed (joins the party as a seed), take a
   *  plant back (with the boarding fee). The engine writes the menu text. */
  | { op: "nursery" }
  /** Exchange a non-seed party member, then grow the received plant if trading triggers it. */
  | { op: "trade"; wants: SpeciesId[]; gives: { species: SpeciesId; level: number; nickname?: string }; then?: ScriptCmd[]; else?: ScriptCmd[] }
  /** True while a seed is waiting at the Nursery (the yard keeper's hint). */
  | { op: "ifNurserySeed"; then: ScriptCmd[]; else?: ScriptCmd[] }
  | { op: "endSlice" }                                    // "to be continued" card -> title
  | { op: "end" };

export interface TrainerDef {
  id: TrainerId;
  name: string;                 // e.g. "HOLLIS"
  className: string;            // e.g. "WARDEN", "GARDENER"
  portrait: TrainerPortraitKey;
  /** Grafted members keep their level but use stats from five levels lower. */
  team: { species: SpeciesId; level: number; moves?: MoveId[]; grafted?: boolean }[];
  prize: number;                // money on win
  intro: string;                // said before battle (overworld)
  defeat: string;               // said in battle when beaten
  after: string;                // said when talked to afterwards
  ai: "basic" | "smart";
  items?: { item: ItemId; qty: number }[]; // leaders may use healing items
  music?: "battle_trainer" | "battle_leader" | "battle_rootstock";
  mark?: MarkId;                // leaders award a mark
}

/** Side quests, listed in the START menu NOTES screen. */
export interface QuestDef {
  id: string;                   // flags: quest_<id>_started / quest_<id>_done
  title: string;                // <= 16 chars, e.g. "THE SAP RUN"
  giver: string;                // display, e.g. "SYRUP MAKER, SUGARBUSH"
  area: MapId;
  /** Ordered steps; a step shows as ticked when its condition holds. */
  steps: { text: string; doneWhen: Cond }[];
  reward: string;               // display text
}

export interface GlideDestination {
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
  name: string;                 // menu label, <= 18 columns
}

export interface WorldData {
  maps: Record<MapId, MapDef>;
  scripts: Record<ScriptId, ScriptCmd[]>;
  trainers: Record<TrainerId, TrainerDef>;
  quests?: Record<string, QuestDef>;
  /** SEED GLIDE lands outside each town's healing building. */
  glide?: GlideDestination[];
  /** New game: where the player starts (inside the Herbarium at night, prologue). */
  newGame: { map: MapId; x: number; y: number; facing: Dir; script: ScriptId };
}
