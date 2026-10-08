// Runtime shapes and services shared across modules.

import type { GameData, Stats, Weather } from "./data";
import type {
  Button, Dir, ItemId, JingleId, MapId, MarkId, MoveId, MusicId, SfxId,
  SpeciesId, StatusId, TrainerId,
} from "./ids";
import type { TimeOfDay, WorldData } from "./world";

/** One Quickened plant the player (or a trainer) owns. */
export interface Quickened {
  uid: string;
  species: SpeciesId;
  nickname?: string;
  level: number;
  exp: number;
  hp: number;                   // current
  stats: Stats;                 // computed at current level (hp = max hp)
  ivs: Stats;                   // 0..15 (Gen 2 DVs)
  evs: Stats;
  moves: { id: MoveId; pp: number }[]; // up to 4
  status: StatusId | null;
  friendship: number;           // 0..255
  sport: boolean;               // shiny ("sport")
  metAt?: { map: MapId; level: number };
  /** Round 4: an unsprouted seed from the Nursery Garden. While present it sits in the
   *  party as a seed (no battling, no moves shown); each overworld step counts down,
   *  and at 0 the engine plays the sprouting scene and deletes this field. */
  seed?: { steps: number };
}

export type RoamerId = "tumbleweed" | "coconut";
export type WandererId = RoamerId | "burr";
export interface WandererHealth { hp: number; status: StatusId | null }

export interface GameState {
  version: 1;
  playerName: string;
  rivalName: string;
  money: number;
  party: Quickened[];           // max 6
  /** One snapshot per Council clear, in party order. Older saves have no history. */
  hallOfFame?: { species: SpeciesId; level: number; nickname?: string }[][];
  box: Quickened[];             // specimen cabinet storage
  bag: Record<string, number>;  // ItemId -> qty
  flags: Record<string, boolean>;
  roamers: Record<RoamerId, WandererHealth & { map: MapId }>;
  burr: WandererHealth;
  /** Local calendar day on which a wanderer wilted; it recovers on a later day. */
  wandererWilted?: Partial<Record<WandererId, string>>;
  /** Temporary hitch location, retained by SAVE / CONTINUE until the next map entry. */
  burrHitch?: { map: MapId; x: number; y: number; facing: Dir };
  marks: MarkId[];
  herbarium: { seen: SpeciesId[]; caught: SpeciesId[] };
  position: { map: MapId; x: number; y: number; facing: Dir };
  /** Riding the LILY RAFT; retained on Continue, cleared by travel and whiteout. */
  rafting?: boolean;
  heal: { map: MapId; x: number; y: number };  // last greenhouse
  playTimeMs: number;
  options: {
    textSpeed: "slow" | "mid" | "fast";
    follower?: boolean;         // lead Quickened walks behind the player (default true)
    battleAnims?: boolean;      // move animations on/off (default true)
  };
  /** harvestId -> ISO date (YYYY-MM-DD) last picked. */
  harvested?: Record<string, string>;
  /** Round 4: the Nursery Garden in Glasshouse City. Up to 2 plants board there;
   *  they gain 1 exp per player step. `steps` counts toward the next seed check.
   *  `boardedLevel` remembers the level at boarding (the take-back fee is per level gained). */
  nursery?: { slots: (Quickened & { boardedLevel?: number })[]; steps: number; seedReady: boolean };
}

export interface BattleRequest {
  kind: "wild" | "trainer";
  trainer?: TrainerId;
  wild?: { species: SpeciesId; level: number; sport?: boolean }; // omitted: normal random sport roll
  /** Persistent legendary wild encounter; flees after its first complete turn. */
  wanderer?: WandererId;
  canLose?: boolean;            // story battles (rival #1): no whiteout on loss
  backdrop?: "grass" | "bog" | "water" | "indoor" | "night" | "glasshouse";
}
export type BattleOutcome = "won" | "lost" | "fled" | "caught";

export interface Scene {
  /** If true, the scene below is drawn first (menus, text boxes over the map). */
  transparent?: boolean;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
}

export interface SceneStack {
  push(scene: Scene): void;
  pop(): Scene | undefined;
  replace(scene: Scene): void;
  top(): Scene | undefined;
  /** Push a scene and resolve when it pops itself (via the provided `done`). */
  run<T>(factory: (done: (result: T) => void) => Scene): Promise<T>;
}

export interface Input {
  pressed(b: Button): boolean;  // went down this frame
  held(b: Button): boolean;
  /** Key-repeat for menus: true on press, then every few frames while held. */
  repeat(b: Button): boolean;
}

/** What `Assets.image` returns: a whole PNG, or a canvas cut from a sheet / palette-swapped. */
export type ArtImage = HTMLImageElement | HTMLCanvasElement;

/**
 * Round 4: art is served from swappable bundles (see docs/ART.md). Callers keep
 * asking for the LOGICAL paths built by the path helpers in constants.ts
 * (`assets/tiles/water@5__2.png`, `assets/species/oak_acorn/front.png?sport`, ...);
 * the art registry resolves each to a bundle image or sheet cell, applying any
 * active art packs.
 */
/** One step of a species animation: [front frame index (0 = front, 1 = front__2, ...), duration in 60 fps ticks]. */
export type AnimStep = [frame: number, ticks: number];
/** Crystal-style species animation (docs/ART.md section 3). `intro` plays once when the species
 *  appears (battle entry, Herbarium page) and ends on frame 0; `idle` loops afterwards. */
export interface SpeciesAnim { intro?: AnimStep[]; idle?: AnimStep[] }

export interface Assets {
  image(path: string): ArtImage | undefined; // undefined while loading or if missing
  /** Loaded and ready to draw. */
  has(path: string): boolean;
  /** Provided by some bundle (or legacy file), whether or not it has loaded yet. */
  exists(path: string): boolean;
  /** Preload. With no `paths`, loads the whole art registry (every bundle). */
  loadAll(paths?: string[], onProgress?: (done: number, total: number) => void): Promise<void>;
  /** Image-set frame count; omitted metadata means one static frame. */
  imageFrames?(path: string): number;
  /** Loaded horizontal image-set frame; single-frame images are returned unchanged. */
  imageFrame?(path: string, frame: number): ArtImage | undefined;
  /** The species bundle's `anim` (after art packs are applied), if it has one. */
  speciesAnim?(id: import("./ids").SpeciesId): SpeciesAnim | undefined;
  /** Character frame size after art packs and live bundle edits are applied. */
  characterFrame?(id: import("./ids").CharacterKey): import("./constants").CharacterFrame;
}

export interface AudioService {
  playMusic(id: MusicId): void; // no-op if already playing
  stopMusic(fadeFrames?: number): void;
  current(): MusicId | null;
  playSfx(id: SfxId): void;
  playJingle(id: JingleId): Promise<void>; // pauses music, resumes after
  /** Species cry, synthesised per species id (deterministic). */
  playCry(species: SpeciesId): Promise<void>;
  unlock(): void;               // call on first user input (autoplay policy)
  setVolume(music: number, sfx: number): void;
}

/** Faces are supplied only by the world script runner, never signs or battle text. */
export interface SayOptions {
  speaker?: string;
  autoClose?: boolean;
  face?: import("./ids").CharacterKey | null;
  /** The running script scene's deterministic tick, shared across its lines. */
  faceClock?: { tick: number };
}

export interface UiKit {
  drawText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color?: string): void;
  drawWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
  measure(text: string): number;
  wrap(text: string, maxCols: number): string[];
  /** Text box at the bottom of the screen; resolves after the last page. */
  say(text: string, opts?: SayOptions): Promise<void>;
  /** Menu of options; resolves with the chosen index, or -1 if cancelled (B). */
  choose(options: string[], opts?: { prompt?: string; x?: number; y?: number; cancel?: boolean }): Promise<number>;
  yesNo(prompt: string): Promise<boolean>;
}

export interface Screens {
  /** Party menu. mode "pick" resolves with a party index (or -1). */
  party(opts?: { mode: "view" | "pick"; prompt?: string }): Promise<number>;
  /** Bag. In battle, resolves with the chosen item id (or null). */
  bag(opts?: { inBattle: boolean }): Promise<ItemId | null>;
  herbarium(): Promise<void>;
  summary(partyIndex: number): Promise<void>;
  cabinet(): Promise<void>;     // party <-> box storage
  shop(stock: ItemId[]): Promise<void>;
  options(): Promise<void>;
}

export interface GameContext {
  state: GameState;
  data: GameData;
  world: WorldData;
  input: Input;
  scenes: SceneStack;
  assets: Assets;
  audio: AudioService;
  ui: UiKit;
  screens: Screens;
  rng(): number;                // [0, 1)
  timeOfDay(): TimeOfDay;
  battle(req: BattleRequest): Promise<BattleOutcome>;
  save: { write(): void; read(): GameState | null; exists(): boolean; clear(): void };
}

/** Battle-side weather is shared with move data. */
export type { Weather };
