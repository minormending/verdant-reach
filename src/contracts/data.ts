// Static game data shapes. Owned by the data agent (src/data/), consumed by
// battle, screens, engine and world.

import type { ItemId, MoveId, SpeciesId, StatusId, TypeId } from "./ids";

export interface Stats {
  hp: number;
  atk: number; // physical attack
  def: number; // physical defence
  spa: number; // special attack
  spd: number; // special defence
  spe: number; // speed
}
export type StatKey = keyof Stats;
export type BattleStat = Exclude<StatKey, "hp"> | "accuracy" | "evasion";

export type GrowthTrigger =
  | { kind: "vigor"; level: number }                     // level up
  | { kind: "vigor_day"; level: number }                 // level up during morning/day
  | { kind: "vigor_night"; level: number }               // level up at night
  | { kind: "tending"; friendship: number }              // friendship >= value on level up
  | { kind: "item"; item: ItemId }                       // use item from the bag
  | { kind: "cross_pollination" };                       // trade (not reachable in slice)

export interface Species {
  id: SpeciesId;
  name: string;                 // display name, e.g. "Oak Acorn" (<= 12 chars preferred)
  line: string;                 // evolution line id, e.g. "oak"
  stage: 1 | 2 | 3;
  types: [TypeId] | [TypeId, TypeId];
  baseStats: Stats;
  growthRate: "fast" | "medium" | "slow";
  catchRate: number;            // 3..255, Gen 2 semantics
  baseExp: number;              // exp yield base
  evYield?: Partial<Stats>;
  activity: "any" | "day" | "night"; // when it appears / is strongest (photoperiod)
  growsInto?: { species: SpeciesId; trigger: GrowthTrigger };
  learnset: { level: number; move: MoveId }[]; // level 1 entries = starting moves
  /** Nursery Garden (Round 4): two Quickened that share a group can cross-pollinate
   *  and set a seed. Omitted or [] = can't set seed (legendaries, the Centuryheart). */
  pollination?: PollinationGroup[];
}

/** Pollination groups: loosely, how the real plant is pollinated / where it grows. */
export const POLLINATION_GROUPS = [
  "meadow",     // open-field flowers, bee-pollinated (clover, dandelion, sunflower)
  "woodland",   // trees, shrubs and woodland edge (oak, maple, holly, bramble)
  "wetland",    // water and bog margins (lily, lotus, cattail)
  "carnivore",  // carnivorous plants (flytrap, sundew, pitcher)
  "garden",     // cultivated beds and orchards (pumpkin, chili, mint, rose, apple)
  "tropical",   // glasshouse exotics (orchid, monstera, bird of paradise)
  "spore",      // ferns: no flowers; they only pair with other ferns
] as const;
export type PollinationGroup = (typeof POLLINATION_GROUPS)[number];

export type MoveEffect =
  | { kind: "status"; status: StatusId; chance: number; target: "foe" | "self" }
  | { kind: "stat"; stat: BattleStat; stages: number; chance: number; target: "foe" | "self" }
  | { kind: "drain"; fraction: number }                 // heal user by fraction of damage dealt
  | { kind: "recoil"; fraction: number }                // user takes fraction of damage dealt
  | { kind: "heal"; fraction: number; sunBonus?: boolean } // Photosynthesise: more in sun, less in rain/frost
  | { kind: "multi_hit"; min: number; max: number }
  | { kind: "flinch"; chance: number }
  | { kind: "high_crit" }
  | { kind: "weather"; weather: Weather }              // sets weather for 5 turns
  | { kind: "root_tap" }                                 // Leech Seed-like: drains foe each turn
  | { kind: "protect" }                                  // Curl Up: block this turn
  | { kind: "fixed_damage"; amount: number | "level" }
  | { kind: "always_hit" };

export type Weather = "sun" | "rain" | "frost";

export interface Move {
  id: MoveId;
  name: string;                 // <= 12 chars
  type: TypeId;
  category: "physical" | "special" | "status";
  power: number;                // 0 for status moves
  accuracy: number | null;      // percent; null = never misses
  pp: number;
  priority: number;             // default 0
  effects: MoveEffect[];
  description: string;          // shown in menus (fit TEXTBOX.cols × TEXTBOX.lines)
}

export type ItemEffect =
  | { kind: "heal"; amount: number }
  | { kind: "heal_full" }
  | { kind: "revive"; fraction: number }
  | { kind: "cure_status"; status?: StatusId }   // omitted = any
  | { kind: "pod"; catchMultiplier: number }
  | { kind: "restore_pp"; amount: number }
  | { kind: "none" };

export interface Item {
  id: ItemId;
  name: string;                 // <= 12 chars
  pocket: "items" | "pods" | "key";
  price: number;                // 0 = can't be sold/bought
  description: string;
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInField: boolean;
}

/** Attack type -> defending type -> multiplier. Missing entries = 1. */
export type TypeChart = Record<TypeId, Partial<Record<TypeId, number>>>;

export interface HerbariumEntry {
  species: SpeciesId;
  scientificName: string;       // e.g. "Quercus robur"
  category: string;             // e.g. "Acorn Quickened"
  heightM: number;
  weightKg: number;
  /** 2-4 short sentences. Must contain one TRUE, checkable fact about the real plant. */
  entry: string;
}

export interface GameData {
  species: Record<SpeciesId, Species>;
  moves: Record<MoveId, Move>;
  items: Record<string, Item>;
  typeChart: TypeChart;
  herbarium: Record<SpeciesId, HerbariumEntry>;
  /** Exp needed to reach `level` for a growth rate (Gen 2 curves). */
  expForLevel(rate: Species["growthRate"], level: number): number;
}
