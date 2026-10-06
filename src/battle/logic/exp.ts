// Experience, level-up, move learning, friendship, EVs and growth checks.

import type { GameData, ItemId, MoveId, Quickened, SpeciesId, Stats, StatKey, TimeOfDay } from "../../contracts";
import { getMove, getSpecies } from "./lookup";
import { EV_MAX_STAT, EV_MAX_TOTAL, MAX_LEVEL, movesLearnedAt, recalcStats, STAT_KEYS } from "./stats";

/** Gen 2 yield: floor(baseExp * level / 7), x1.5 against trainers. */
export function expYield(data: GameData, defeated: Quickened, trainer: boolean): number {
  const sp = getSpecies(data, defeated.species);
  let e = Math.floor((sp.baseExp * defeated.level) / 7);
  if (trainer) e = Math.floor(e * 1.5);
  return Math.max(1, e);
}

export interface ExpShare {
  index: number;   // party index
  amount: number;
  participant: boolean;
}

/**
 * Every healthy participant gets the full yield. Healthy party members that
 * sat out get 50%. Wilted members and level-100s get nothing.
 */
export function distributeExp(party: Quickened[], participants: Set<string>, base: number): ExpShare[] {
  const out: ExpShare[] = [];
  party.forEach((q, index) => {
    if (q.hp <= 0 || q.seed || q.level >= MAX_LEVEL) return;
    const participant = participants.has(q.uid);
    const amount = participant ? base : Math.max(1, Math.floor(base / 2));
    out.push({ index, amount, participant });
  });
  // Participants first, in party order (as Crystal announces them).
  return out.sort((a, b) => Number(b.participant) - Number(a.participant) || a.index - b.index);
}

export function expToLevel(data: GameData, q: Quickened, level: number): number {
  const sp = getSpecies(data, q.species);
  return Math.max(0, Math.floor(data.expForLevel(sp.growthRate, Math.min(MAX_LEVEL, Math.max(1, level)))));
}

/** 0..1 progress towards the next level. */
export function expProgress(data: GameData, q: Quickened): number {
  if (q.level >= MAX_LEVEL) return 1;
  const lo = expToLevel(data, q, q.level);
  const hi = expToLevel(data, q, q.level + 1);
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (q.exp - lo) / (hi - lo)));
}

export interface LevelUp {
  level: number;
  oldStats: Stats;
  newStats: Stats;
  /** Moves the species learns at this exact level. */
  newMoves: MoveId[];
}

/** Friendship gain for levelling up (Gen 2: +5 / +3 / +2 by bracket). */
export function friendshipLevelUpGain(f: number): number {
  return f < 100 ? 5 : f < 200 ? 3 : 2;
}

export function addFriendship(q: Quickened, delta: number): void {
  q.friendship = Math.max(0, Math.min(255, q.friendship + delta));
}

/**
 * Add exp; levels up as many times as needed. Stats are recalculated per
 * level (HP rises by the max-HP gain). Moves are NOT learned here: the caller
 * runs the learn flow for each `newMoves` entry.
 */
export function gainExp(data: GameData, q: Quickened, amount: number): LevelUp[] {
  const ups: LevelUp[] = [];
  if (q.level >= MAX_LEVEL) return ups;
  const cap = expToLevel(data, q, MAX_LEVEL);
  q.exp = Math.min(cap, q.exp + Math.max(0, Math.floor(amount)));
  const species = getSpecies(data, q.species);
  while (q.level < MAX_LEVEL && q.exp >= expToLevel(data, q, q.level + 1)) {
    const oldStats = { ...q.stats };
    q.level++;
    recalcStats(data, q);
    addFriendship(q, friendshipLevelUpGain(q.friendship));
    ups.push({ level: q.level, oldStats, newStats: { ...q.stats }, newMoves: movesLearnedAt(species, q.level) });
  }
  return ups;
}

/** EV gain for defeating a species: its evYield, else +1 in its best base stat. */
export function gainEvs(data: GameData, q: Quickened, defeated: SpeciesId): void {
  const sp = getSpecies(data, defeated);
  let yieldStats: Partial<Stats> | undefined = sp.evYield;
  if (!yieldStats || Object.keys(yieldStats).length === 0) {
    let best: StatKey = "hp";
    for (const k of STAT_KEYS) if (sp.baseStats[k] > sp.baseStats[best]) best = k;
    yieldStats = { [best]: 1 };
  }
  let total = STAT_KEYS.reduce((a, k) => a + q.evs[k], 0);
  for (const k of STAT_KEYS) {
    const add = yieldStats[k] ?? 0;
    if (add <= 0) continue;
    const room = Math.min(EV_MAX_STAT - q.evs[k], EV_MAX_TOTAL - total);
    const d = Math.max(0, Math.min(add, room));
    q.evs[k] += d;
    total += d;
  }
}

export type LearnResult = "learned" | "known" | "full";

/** Learn a move directly if there's room. */
export function tryLearn(data: GameData, q: Quickened, move: MoveId): LearnResult {
  if (q.moves.some((m) => m.id === move)) return "known";
  if (q.moves.length >= 4) return "full";
  q.moves.push({ id: move, pp: getMove(data, move).pp });
  return "learned";
}

/** Replace the move in `slot` with `move` (full PP). */
export function replaceMove(data: GameData, q: Quickened, slot: number, move: MoveId): void {
  q.moves[slot] = { id: move, pp: getMove(data, move).pp };
}

/**
 * Growth (evolution) after a level-up. Item and cross-pollination triggers
 * never fire here.
 */
export function growthTarget(data: GameData, q: Quickened, time: TimeOfDay): SpeciesId | null {
  if (q.seed) return null;
  const g = getSpecies(data, q.species).growsInto;
  if (!g || !data.species[g.species]) return null;
  const t = g.trigger;
  switch (t.kind) {
    case "vigor": return q.level >= t.level ? g.species : null;
    case "vigor_day": return q.level >= t.level && time !== "night" ? g.species : null;
    case "vigor_night": return q.level >= t.level && time === "night" ? g.species : null;
    case "tending": return q.friendship >= t.friendship ? g.species : null;
    default: return null;
  }
}

/** Growth on receipt in a trade; never applies to the rest of the party. */
export function crossPollinationTarget(data: GameData, q: Quickened): SpeciesId | null {
  if (q.seed) return null;
  const g = getSpecies(data, q.species).growsInto;
  if (!g || !data.species[g.species]) return null;
  return g.trigger.kind === "cross_pollination" ? g.species : null;
}

/** Growth from using an item on a Quickened. */
export function itemGrowthTarget(data: GameData, q: Quickened, item: ItemId): SpeciesId | null {
  if (q.seed) return null;
  const g = getSpecies(data, q.species).growsInto;
  if (!g || !data.species[g.species]) return null;
  return g.trigger.kind === "item" && g.trigger.item === item ? g.species : null;
}

/** Crystal-style ABLE rule, shared with the item party picker. */
export function canGrowWith(data: GameData, q: Quickened, item: ItemId): boolean {
  return itemGrowthTarget(data, q, item) !== null;
}

/** Recognize growth items even when no current party member can use them. */
export function isGrowthItem(data: GameData, item: ItemId): boolean {
  return Object.values(data.species).some(({ growsInto: g }) =>
    g?.trigger.kind === "item" && g.trigger.item === item && !!data.species[g.species]);
}

/** Apply growth: change species, recalc stats; returns moves learned at this level by the new form. */
export function applyGrowth(data: GameData, q: Quickened, to: SpeciesId): MoveId[] {
  q.species = to;
  recalcStats(data, q);
  return movesLearnedAt(getSpecies(data, to), q.level);
}
