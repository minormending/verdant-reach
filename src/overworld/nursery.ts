// The Nursery Garden (breeding), pure logic: boarding, per-step growth for the
// boarders, the 256-step seed checks, seed generation, seed countdown in the
// party and the fee. No DOM; unit-tested. The counter flow (menus and text)
// lives in nurseryFlow.ts.
//
// Rules (docs/ROUND4.md §2.2):
//  - up to 2 boarders; each gains 1 exp per player step and can level up there,
//    but learns no moves (Gen 2 keeps the old ones) and never grows (evolves);
//  - taking one back costs $100 + $100 per level gained;
//  - the party always keeps at least one healthy non-seed Quickened;
//  - every 256 steps, two boarders sharing a pollination group may set a seed:
//    50% for the same line, 20% for a shared group, 0% otherwise;
//  - the seed is the stage-1 species of the first-boarded parent's line, level 5,
//    3 DVs inherited from random parents, its level-1 moves plus one move both
//    parents know (if its learnset has it), a 1/256 sport roll;
//  - a seed in the party counts down 600/900/1200 steps by growth rate.

import type { GameData, GameState, MoveId, Quickened, SpeciesId, Stats } from "../contracts";
import { calcStats, createQuickened, MAX_LEVEL, recalcStats } from "../battle/logic/stats";
import { expToLevel } from "../battle/logic/exp";

export const NURSERY_SLOTS = 2;
export const SEED_CHECK_STEPS = 256;
export const SEED_LEVEL = 5;
export const SEED_SPORT_ODDS = 256;
/** Hatched Quickened start a little fonder of you (Gen 2 hatchlings start at 120). */
export const SEED_FRIENDSHIP = 120;
export const SEED_STEPS: Record<"fast" | "medium" | "slow", number> = { fast: 600, medium: 900, slow: 1200 };
export const FEE_BASE = 100;
export const FEE_PER_LEVEL = 100;

/** A boarder remembers its level on arrival (extra field; dropped when it leaves). */
export type Boarder = Quickened & { boardedLevel?: number };
export type Nursery = NonNullable<GameState["nursery"]>;

export const isSeed = (q: Quickened | undefined): boolean => !!q?.seed;
/** Can stand in a battle: not a seed, not wilted. */
export const canBattle = (q: Quickened | undefined): boolean => !!q && !q.seed && q.hp > 0;

/** The nursery record, created on first use. */
export function nurseryOf(state: GameState): Nursery {
  state.nursery ??= { slots: [], steps: 0, seedReady: false };
  return state.nursery;
}

// ---------------------------------------------------------------------------
// Boarding and taking back
// ---------------------------------------------------------------------------

export type BoardBlock = "full" | "seed" | "last";

/** Why party[index] can't board (null = it can). */
export function boardBlock(state: GameState, index: number): BoardBlock | null {
  const n = state.nursery?.slots.length ?? 0;
  if (n >= NURSERY_SLOTS) return "full";
  const q = state.party[index];
  if (!q || q.seed) return "seed";
  if (!state.party.some((o, i) => i !== index && canBattle(o))) return "last";
  return null;
}

/** Move party[index] into the nursery. Caller checks `boardBlock` first. */
export function board(state: GameState, index: number): Boarder {
  const [q] = state.party.splice(index, 1) as Boarder[];
  q.boardedLevel = q.level;
  nurseryOf(state).slots.push(q);
  return q;
}

export function levelsGained(b: Boarder): number {
  return Math.max(0, b.level - (b.boardedLevel ?? b.level));
}

export function takeBackFee(b: Boarder): number {
  return FEE_BASE + FEE_PER_LEVEL * levelsGained(b);
}

/** Return a boarder to the party (fee already paid). */
export function takeBack(state: GameState, slot: number): Quickened {
  const n = nurseryOf(state);
  const [b] = n.slots.splice(slot, 1) as Boarder[];
  delete b.boardedLevel;
  state.party.push(b);
  return b;
}

// ---------------------------------------------------------------------------
// Compatibility and steps
// ---------------------------------------------------------------------------

/** Seed chance per 256-step check: 0.5 same line, 0.2 shared group, else 0. */
export function compatibility(data: GameData, a: Quickened | undefined, b: Quickened | undefined): number {
  if (!a || !b) return 0;
  const sa = data.species[a.species];
  const sb = data.species[b.species];
  const ga = sa?.pollination ?? [];
  const gb = sb?.pollination ?? [];
  if (!ga.length || !gb.length || !ga.some((g) => gb.includes(g))) return 0;
  return sa.line === sb.line ? 0.5 : 0.2;
}

/** Give a boarder exp without learning moves or growing. Returns levels gained. */
export function boarderExp(data: GameData, q: Quickened, amount = 1): number {
  if (q.level >= MAX_LEVEL) return 0;
  q.exp = Math.min(expToLevel(data, q, MAX_LEVEL), q.exp + amount);
  let ups = 0;
  while (q.level < MAX_LEVEL && q.exp >= expToLevel(data, q, q.level + 1)) {
    q.level++;
    recalcStats(data, q);
    ups++;
  }
  return ups;
}

/** One player step for the nursery. Returns true if a seed was set on this step. */
export function nurseryStep(state: GameState, data: GameData, rng: () => number): boolean {
  const n = state.nursery;
  if (!n || n.slots.length === 0) return false;
  for (const q of n.slots) boarderExp(data, q, 1);
  n.steps++;
  if (n.steps < SEED_CHECK_STEPS) return false;
  n.steps = 0;
  if (n.seedReady || n.slots.length < 2) return false;
  const chance = compatibility(data, n.slots[0], n.slots[1]);
  if (chance > 0 && rng() < chance) {
    n.seedReady = true;
    return true;
  }
  return false;
}

/** Count down every seed in the party; returns those that have reached 0. */
export function seedStep(party: Quickened[]): Quickened[] {
  const ready: Quickened[] = [];
  for (const q of party) {
    if (!q.seed) continue;
    q.seed.steps = Math.max(0, q.seed.steps - 1);
    if (q.seed.steps === 0) ready.push(q);
  }
  return ready;
}

/** The first seed in the party that is ready to sprout. */
export function readySeed(party: Quickened[]): Quickened | undefined {
  return party.find((q) => q.seed && q.seed.steps <= 0);
}

/** The summary / follower hint for a seed. */
export function seedHint(steps: number): string {
  if (steps > 500) return "It's warm. It needs a lot more time.";
  if (steps > 150) return "Something's moving inside.";
  return "It's cracking! It will sprout soon!";
}

// ---------------------------------------------------------------------------
// Seed generation
// ---------------------------------------------------------------------------

/** Stage-1 species of a species' line (falls back to walking `growsInto` backwards). */
export function stage1Of(data: GameData, id: SpeciesId): SpeciesId {
  const sp = data.species[id];
  if (!sp) return id;
  const all = Object.values(data.species);
  const first = all.find((s) => s.line === sp.line && s.stage === 1);
  if (first) return first.id;
  let cur = id;
  for (let guard = 0; guard < 4; guard++) {
    const parent = all.find((s) => s.growsInto?.species === cur);
    if (!parent) break;
    cur = parent.id;
  }
  return cur;
}

const DVS = ["atk", "def", "spe", "spc"] as const;

/** Gen 2 DVs with 3 of the 4 (attack, defence, speed, special) taken from random parents. */
export function inheritIvs(own: Stats, a: Stats, b: Stats, rng: () => number): Stats {
  const dv = { atk: own.atk, def: own.def, spe: own.spe, spc: own.spa };
  const pool = [...DVS];
  for (let i = 0; i < 3; i++) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const from = rng() < 0.5 ? a : b;
    dv[k] = k === "spc" ? from.spa : from[k];
  }
  const hp = ((dv.atk & 1) << 3) | ((dv.def & 1) << 2) | ((dv.spe & 1) << 1) | (dv.spc & 1);
  return { hp, atk: dv.atk, def: dv.def, spa: dv.spc, spd: dv.spc, spe: dv.spe };
}

/** Level-1 moves (the last four, in learn order). */
function startingMoves(data: GameData, id: SpeciesId): MoveId[] {
  const out: MoveId[] = [];
  for (const e of data.species[id]?.learnset ?? []) {
    if (e.level > 1) continue;
    const at = out.indexOf(e.move);
    if (at >= 0) out.splice(at, 1);
    out.push(e.move);
  }
  return out.slice(-4);
}

/**
 * The seed from two boarders. `parent` is the seed parent (first boarded): the
 * seed is its line's stage 1. Returns an unsprouted Quickened with `seed` set.
 */
export function makeSeed(data: GameData, parent: Quickened, other: Quickened, rng: () => number): Quickened {
  const id = stage1Of(data, parent.species);
  const sp = data.species[id];
  const q = createQuickened(data, id, SEED_LEVEL, rng);
  q.ivs = inheritIvs(q.ivs, parent.ivs, other.ivs, rng);
  q.stats = calcStats(sp, q.ivs, q.evs, q.level);
  q.hp = q.stats.hp;
  const moves = startingMoves(data, id);
  const learnable = new Set(sp.learnset.map((e) => e.move));
  const shared = parent.moves.map((m) => m.id)
    .filter((m) => other.moves.some((o) => o.id === m) && learnable.has(m) && !moves.includes(m));
  if (shared.length) {
    const pick = shared[Math.floor(rng() * shared.length)];
    if (moves.length >= 4) moves.shift();
    moves.push(pick);
  }
  if (moves.length) q.moves = moves.map((m) => ({ id: m, pp: data.moves[m]?.pp ?? 10 }));
  q.sport = rng() < 1 / SEED_SPORT_ODDS;
  q.friendship = SEED_FRIENDSHIP;
  q.seed = { steps: SEED_STEPS[sp.growthRate] ?? SEED_STEPS.medium };
  q.metAt = { map: "glasshouse_nursery", level: SEED_LEVEL };
  return q;
}

/** Hand over the ready seed: clears `seedReady` and returns the new party member (or null if none / party full). */
export function collectSeed(state: GameState, data: GameData, rng: () => number): Quickened | null {
  const n = state.nursery;
  if (!n?.seedReady || state.party.length >= 6) return null;
  const [a, b] = n.slots;
  if (!a) return null;
  const q = makeSeed(data, a, b ?? a, rng);
  n.seedReady = false;
  state.party.push(q);
  return q;
}

/** Sprouting: the seed field goes, the plant is registered in the Herbarium, and `sprouted_any` is set. */
export function sprout(state: GameState, q: Quickened, map: GameState["position"]["map"]): void {
  delete q.seed;
  q.metAt = { map, level: q.level };
  const h = state.herbarium;
  if (!h.seen.includes(q.species)) h.seen.push(q.species);
  if (!h.caught.includes(q.species)) h.caught.push(q.species);
  state.flags.sprouted_any = true;
}
