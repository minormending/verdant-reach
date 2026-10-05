// Damage, type effectiveness, stat stages, crits and accuracy.

import type { BattleStat, GameData, Move, Quickened, StatKey, TimeOfDay, TypeChart, TypeId, Weather } from "../../contracts";
import { getSpecies } from "./lookup";

export type Stages = Record<BattleStat, number>;
export const newStages = (): Stages => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 });

export const clampStage = (n: number) => Math.max(-6, Math.min(6, n));

/** Attack/defence/speed stage multiplier: +n => (2+n)/2, -n => 2/(2+n). */
export function statStageMult(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Accuracy/evasion stage multiplier: +n => (3+n)/3, -n => 3/(3+n). */
export function accStageMult(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

/** Product of the chart entries against each defending type (missing = 1). */
export function typeEffectiveness(chart: TypeChart, moveType: TypeId, defTypes: readonly TypeId[]): number {
  let m = 1;
  for (const t of defTypes) {
    const v = chart?.[moveType]?.[t];
    if (typeof v === "number") m *= v;
  }
  return m;
}

/** Gen 2 crit stages: 17/256, 1/8, 1/4, 85/256, 1/2. */
export function critChance(stage: number): number {
  const table = [17 / 256, 32 / 256, 64 / 256, 85 / 256, 128 / 256];
  return table[Math.max(0, Math.min(table.length - 1, stage))];
}

export function weatherMult(weather: Weather | null, moveType: TypeId): number {
  if (weather === "sun") return moveType === "fire" ? 1.5 : moveType === "water" ? 0.5 : 1;
  if (weather === "rain") return moveType === "water" ? 1.5 : moveType === "fire" ? 0.5 : 1;
  if (weather === "frost") return moveType === "frost" ? 1.5 : 1;
  return 1;
}

/** Photoperiod: sun-lovers hit a little harder by day, night bloomers by night. */
export function photoperiodMult(activity: "any" | "day" | "night", time: TimeOfDay | undefined): number {
  if (!time || activity === "any") return 1;
  const isNight = time === "night";
  return (activity === "night") === isNight ? 1.1 : 1;
}

export interface DamageInput {
  data: GameData;
  attacker: Quickened;
  defender: Quickened;
  atkStages: Stages;
  defStages: Stages;
  move: Move;
  weather: Weather | null;
  time?: TimeOfDay;
  crit: boolean;
  /** Random factor percent, 85..100. */
  roll: number;
  /** Typeless moves (Struggle) ignore the chart and STAB. */
  typeless?: boolean;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  stab: boolean;
}

export function attackStats(move: Move): { atk: StatKey; def: StatKey } {
  return move.category === "special" ? { atk: "spa", def: "spd" } : { atk: "atk", def: "def" };
}

/**
 * Gen 2 order of operations:
 *   base = floor(floor(floor(2L/5 + 2) * P * A / D) / 50)
 *   x2 crit, +2, weather, photoperiod, STAB 1.5, type, random 85..100%.
 * A crit ignores the attacker's negative stages and the defender's positive ones.
 * Scorch halves physical attack.
 */
export function calcDamage(inp: DamageInput): DamageResult {
  const { data, attacker, defender, move } = inp;
  const aSpecies = getSpecies(data, attacker.species);
  const dSpecies = getSpecies(data, defender.species);
  const effectiveness = inp.typeless ? 1 : typeEffectiveness(data.typeChart, move.type, dSpecies.types);
  const stab = !inp.typeless && (aSpecies.types as readonly TypeId[]).includes(move.type);
  if (effectiveness === 0 || move.power <= 0) return { damage: 0, effectiveness, stab };

  const { atk: ak, def: dk } = attackStats(move);
  let aStage = inp.atkStages[ak as BattleStat] ?? 0;
  let dStage = inp.defStages[dk as BattleStat] ?? 0;
  if (inp.crit) {
    aStage = Math.max(0, aStage);
    dStage = Math.min(0, dStage);
  }
  let A = Math.floor(attacker.stats[ak] * statStageMult(aStage));
  const D = Math.max(1, Math.floor(defender.stats[dk] * statStageMult(dStage)));
  if (move.category === "physical" && attacker.status === "scorch") A = Math.floor(A / 2);
  A = Math.max(1, A);

  let dmg = Math.floor(Math.floor(Math.floor((2 * attacker.level) / 5 + 2) * move.power * A / D) / 50);
  if (inp.crit) dmg *= 2;
  dmg += 2;
  if (!inp.typeless) dmg = Math.floor(dmg * weatherMult(inp.weather, move.type));
  dmg = Math.floor(dmg * photoperiodMult(aSpecies.activity, inp.time));
  if (stab) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor(dmg * effectiveness);
  dmg = Math.floor((dmg * Math.max(85, Math.min(100, inp.roll))) / 100);
  return { damage: Math.max(1, dmg), effectiveness, stab };
}
