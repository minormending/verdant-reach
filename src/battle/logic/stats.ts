// Gen 2-style stats: base stats + DVs (0..15) + stat experience, by level.
//
//   HP    = floor(((Base + IV) * 2 + floor(EV / 4)) * L / 100) + L + 10
//   Other = floor(((Base + IV) * 2 + floor(EV / 4)) * L / 100) + 5
//
// EVs are stored on the modern 0..252 scale; floor(EV/4) is the same 0..63
// contribution Gen 2's floor(ceil(sqrt(statExp)) / 4) produced.

import type { GameData, MoveId, Quickened, Species, SpeciesId, Stats, StatKey } from "../../contracts";
import { getMove, getSpecies } from "./lookup";
import { randInt, type Rng } from "./rng";

export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];
export const MAX_LEVEL = 100;
export const EV_MAX_STAT = 252;
export const EV_MAX_TOTAL = 510;
export const SPORT_ODDS = 512;
export const BASE_FRIENDSHIP = 70;

export function calcStat(key: StatKey, base: number, iv: number, ev: number, level: number): number {
  const core = Math.floor((((base + iv) * 2 + Math.floor(ev / 4)) * level) / 100);
  return key === "hp" ? core + level + 10 : core + 5;
}

export function calcStats(species: Species, ivs: Stats, evs: Stats, level: number): Stats {
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = calcStat(k, species.baseStats[k], ivs[k], evs[k], level);
  return out;
}

/**
 * Gen 2 DVs: attack, defence, speed and special are rolled 0..15; special
 * attack and special defence share the special DV; the HP DV is built from
 * the low bit of each of the others.
 */
export function rollIvs(rng: Rng): Stats {
  const atk = randInt(rng, 0, 15);
  const def = randInt(rng, 0, 15);
  const spe = randInt(rng, 0, 15);
  const spc = randInt(rng, 0, 15);
  const hp = ((atk & 1) << 3) | ((def & 1) << 2) | ((spe & 1) << 1) | (spc & 1);
  return { hp, atk, def, spa: spc, spd: spc, spe };
}

/** Gen 2 trainer DVs (fixed 9/8/8/8). */
export function trainerIvs(): Stats {
  const atk = 9, def = 8, spe = 8, spc = 8;
  const hp = ((atk & 1) << 3) | ((def & 1) << 2) | ((spe & 1) << 1) | (spc & 1);
  return { hp, atk, def, spa: spc, spd: spc, spe };
}

const zeroStats = (): Stats => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

/** The last (up to) four distinct moves learnable at or below `level`, in learn order. */
/**
 * The moves a Quickened of this level knows: the last four learned (Gen 2),
 * except that it always keeps at least two attacking moves when it has learned
 * them. Status-heavy learnsets would otherwise leave trainers' and wild
 * Quickened with one attack, which no human player would choose.
 */
export function movesAtLevel(species: Species, level: number, isAttack?: (id: MoveId) => boolean): MoveId[] {
  const learned: MoveId[] = [];
  const entries = species.learnset
    .map((e, i) => ({ ...e, i }))
    .filter((e) => e.level <= level)
    .sort((a, b) => a.level - b.level || a.i - b.i);
  for (const e of entries) {
    const at = learned.indexOf(e.move);
    if (at >= 0) learned.splice(at, 1);
    learned.push(e.move);
  }
  const chosen = learned.slice(-4);
  if (isAttack) {
    const older = learned.slice(0, -4).filter(isAttack);
    while (chosen.filter(isAttack).length < 2 && older.length) {
      const drop = chosen.findIndex((id) => !isAttack(id));
      if (drop < 0) break;
      chosen.splice(drop, 1);
      chosen.unshift(older.pop()!); // most recent older attack
    }
  }
  return chosen;
}

/** Moves a species learns exactly at `level`. */
export function movesLearnedAt(species: Species, level: number): MoveId[] {
  return species.learnset.filter((e) => e.level === level).map((e) => e.move);
}

let uidCounter = 0;
function makeUid(rng: Rng): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  uidCounter++;
  return `q${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(rng() * 1e9).toString(36)}`;
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
}

/** Create a wild/starter/trainer Quickened at a level with level-appropriate moves. */
export function createQuickened(data: GameData, speciesId: SpeciesId, level: number, rng: Rng): Quickened {
  const species = getSpecies(data, speciesId);
  const lv = clampLevel(level);
  const ivs = rollIvs(rng);
  const evs = zeroStats();
  const stats = calcStats(species, ivs, evs, lv);
  const moves = movesAtLevel(species, lv, (id) => getMove(data, id).power > 0).map((id) => ({ id, pp: getMove(data, id).pp }));
  const sport = rng() < 1 / SPORT_ODDS;
  return {
    uid: makeUid(rng),
    species: speciesId,
    level: lv,
    exp: Math.max(0, Math.floor(data.expForLevel(species.growthRate, lv))),
    hp: stats.hp,
    stats,
    ivs,
    evs,
    moves,
    status: null,
    friendship: BASE_FRIENDSHIP,
    sport,
  };
}

/** Recompute stats after a level/species change; current HP moves by the max-HP delta. */
export function recalcStats(data: GameData, q: Quickened): void {
  const species = getSpecies(data, q.species);
  const before = q.stats.hp;
  q.stats = calcStats(species, q.ivs, q.evs, q.level);
  if (q.hp > 0) q.hp = Math.max(1, Math.min(q.stats.hp, q.hp + (q.stats.hp - before)));
}

/** Full heal: hp, pp, status. */
export function healParty(party: Quickened[], data: GameData): void {
  for (const q of party) {
    q.hp = q.stats.hp;
    q.status = null;
    for (const m of q.moves) m.pp = getMove(data, m.id).pp;
  }
}

export function maxPp(data: GameData, moveId: MoveId): number {
  return getMove(data, moveId).pp;
}
