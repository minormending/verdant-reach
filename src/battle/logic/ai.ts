// Foe decision making: wild (random), basic and smart trainer AI.

import type { Move, Quickened, TypeId } from "../../contracts";
import { active, healFraction, statusImmune, type Action, type BattleState, type Side } from "./battle";
import { calcDamage, newStages, typeEffectiveness } from "./damage";
import { getItem, getMove, getSpecies } from "./lookup";
import { chance, pick, weightedPick, type Rng } from "./rng";

export type AiKind = "wild" | "basic" | "smart";

function usableSlots(q: Quickened): number[] {
  return q.moves.map((m, i) => (m.pp > 0 ? i : -1)).filter((i) => i >= 0);
}

function moveEff(s: BattleState, move: Move, target: Quickened): number {
  return typeEffectiveness(s.data.typeChart, move.type, getSpecies(s.data, target.species).types);
}

/** Basic AI weight for a move: slight preference for super-effective, avoids useless picks. */
export function basicWeight(s: BattleState, move: Move, target: Quickened): number {
  if (move.category !== "status") {
    const eff = moveEff(s, move, target);
    if (eff === 0) return 0.05;
    if (eff > 1) return 1.6;
    if (eff < 1) return 0.7;
    return 1;
  }
  const inflicts = move.effects.find((e) => e.kind === "status" && e.target === "foe");
  if (inflicts && target.status) return 0.2;
  return 1;
}

/** Average expected damage of a move (no crit, mid roll, accuracy-weighted). */
export function expectedDamage(s: BattleState, side: Side, move: Move): number {
  const user = active(s, side);
  const tSide: Side = side === 0 ? 1 : 0;
  const target = active(s, tSide);
  const fixed = move.effects.find((e) => e.kind === "fixed_damage");
  let per: number;
  if (fixed && fixed.kind === "fixed_damage") {
    per = moveEff(s, move, target) === 0 ? 0 : fixed.amount === "level" ? user.level : fixed.amount;
  } else {
    if (move.category === "status" || move.power <= 0) return 0;
    per = calcDamage({
      data: s.data, attacker: user, defender: target,
      atkStages: s.sides[side].vol.stages ?? newStages(), defStages: s.sides[tSide].vol.stages ?? newStages(),
      move, weather: s.weather?.kind ?? null, time: s.time, crit: false, roll: 92,
    }).damage;
    if (moveEff(s, move, target) === 0) per = 0;
  }
  const multi = move.effects.find((e) => e.kind === "multi_hit");
  const hits = multi && multi.kind === "multi_hit" ? (multi.min === 2 && multi.max === 5 ? 3 : (multi.min + multi.max) / 2) : 1;
  const acc = move.accuracy === null || move.effects.some((e) => e.kind === "always_hit") ? 1 : move.accuracy / 100;
  return per * hits * acc;
}

const STATUS_VALUE = { dormant: 60, frostbite: 55, rootbound: 45, blight: 40, scorch: 35 } as const;

/** Smart AI score for one move. */
export function scoreMove(s: BattleState, side: Side, move: Move): number {
  const user = active(s, side);
  const tSide: Side = side === 0 ? 1 : 0;
  const target = active(s, tSide);
  const vol = s.sides[side].vol;
  const tVol = s.sides[tSide].vol;
  const acc = move.accuracy === null ? 1 : move.accuracy / 100;
  let score = 0;

  const dmg = expectedDamage(s, side, move);
  if (dmg > 0) {
    score += Math.min(1, dmg / Math.max(1, target.hp)) * 100;
    if (dmg >= target.hp) score += 40 * acc;
    if ((move.priority ?? 0) > 0 && dmg >= target.hp) score += 15;
  }

  for (const e of move.effects) {
    switch (e.kind) {
      case "status": {
        if (e.target !== "foe") break;
        if (target.status || statusImmune(s.data, target, e.status, s.weather?.kind ?? null)) break;
        let v = STATUS_VALUE[e.status];
        if (e.status === "scorch") {
          const ts = getSpecies(s.data, target.species).baseStats;
          if (ts.atk > ts.spa) v += 15;
        }
        score += v * acc * (move.category === "status" ? 1 : e.chance / 100);
        break;
      }
      case "stat": {
        const tgtVol = e.target === "self" ? vol : tVol;
        const stage = tgtVol.stages[e.stat];
        const good = (e.target === "self") === (e.stages > 0);
        if (!good) break;
        const room = e.stages > 0 ? stage < 2 : stage > -2;
        let v = room ? 28 : 3;
        if (e.target === "self" && user.hp < user.stats.hp / 2) v *= 0.4;
        score += v * (move.category === "status" ? 1 : e.chance / 100);
        break;
      }
      case "heal": {
        const missing = 1 - user.hp / user.stats.hp;
        if (missing > 0.5) score += missing * 130 * healFraction(e, s.weather?.kind ?? null) * 2;
        break;
      }
      case "drain":
        if (user.hp < user.stats.hp * 0.6) score += 12;
        break;
      case "recoil":
        score -= 8;
        break;
      case "weather": {
        if (s.weather?.kind === e.weather) break;
        const boosted: Record<string, TypeId> = { sun: "fire", rain: "water", frost: "frost" };
        const helps = user.moves.some((m) => {
          const mv = getMove(s.data, m.id);
          return mv.type === boosted[e.weather] || (e.weather === "sun" && mv.effects.some((x) => x.kind === "heal" && x.sunBonus));
        });
        score += helps ? 30 : 4;
        break;
      }
      case "root_tap": {
        const types = getSpecies(s.data, target.species).types as readonly TypeId[];
        if (!tVol.rootTapped && !types.includes("wood")) score += 35;
        break;
      }
      case "protect":
        score += vol.protectChain > 0 ? 0 : 8;
        break;
      default:
        break;
    }
  }
  return score;
}

/** How well a party member stands against the opposing active (higher is better). */
export function matchupScore(s: BattleState, q: Quickened, foe: Quickened): number {
  const qTypes = getSpecies(s.data, q.species).types;
  const fTypes = getSpecies(s.data, foe.species).types;
  let worstIncoming = 0;
  for (const t of fTypes) worstIncoming = Math.max(worstIncoming, typeEffectiveness(s.data.typeChart, t, qTypes));
  let bestOutgoing = 0;
  for (const m of q.moves) {
    const mv = getMove(s.data, m.id);
    if (mv.category === "status" || m.pp <= 0) continue;
    bestOutgoing = Math.max(bestOutgoing, typeEffectiveness(s.data.typeChart, mv.type, fTypes));
  }
  return bestOutgoing - worstIncoming + q.hp / Math.max(1, q.stats.hp);
}

function healItemFor(s: BattleState, q: Quickened): string | null {
  let best: string | null = null;
  let bestAmt = 0;
  for (const [id, n] of Object.entries(s.foeItems)) {
    if (n <= 0) continue;
    const e = getItem(s.data, id).effect;
    const amt = e.kind === "heal_full" ? q.stats.hp : e.kind === "heal" ? e.amount : 0;
    if (amt > bestAmt) { best = id; bestAmt = amt; }
  }
  return best;
}

function cureItemFor(s: BattleState, q: Quickened): string | null {
  if (!q.status) return null;
  for (const [id, n] of Object.entries(s.foeItems)) {
    if (n <= 0) continue;
    const e = getItem(s.data, id).effect;
    if (e.kind === "cure_status" && (!e.status || e.status === q.status)) return id;
  }
  return null;
}

/** Decide the foe's action for this turn. */
export function chooseFoeAction(s: BattleState, kind: AiKind, rng: Rng): Action {
  const me = active(s, 1);
  const target = active(s, 0);
  const slots = usableSlots(me);
  if (slots.length === 0) return { kind: "move", slot: -1 };

  if (kind === "wild") return { kind: "move", slot: pick(rng, slots) };

  if (kind === "basic") {
    const slot = weightedPick(rng, slots, (i) => basicWeight(s, getMove(s.data, me.moves[i].id), target));
    return { kind: "move", slot };
  }

  // Smart: items first when in trouble.
  if (me.hp > 0 && me.hp <= me.stats.hp / 4) {
    const heal = healItemFor(s, me);
    if (heal && chance(rng, 0.75)) return { kind: "item", item: heal };
  }
  if (me.status === "dormant" || me.status === "frostbite") {
    const cure = cureItemFor(s, me);
    if (cure && chance(rng, 0.5)) return { kind: "item", item: cure };
  }

  const scored = slots.map((i) => ({ i, score: scoreMove(s, 1, getMove(s.data, me.moves[i].id)) }));
  scored.sort((a, b) => b.score - a.score);

  // Switch out of a bad matchup sometimes.
  const here = matchupScore(s, me, target);
  if (scored[0].score < 25 && here < 0) {
    let bestIdx = -1;
    let bestScore = here;
    s.sides[1].party.forEach((q, idx) => {
      if (idx === s.sides[1].active || q.hp <= 0) return;
      const sc = matchupScore(s, q, target);
      if (sc > bestScore + 0.5) { bestScore = sc; bestIdx = idx; }
    });
    if (bestIdx >= 0 && chance(rng, 0.35)) return { kind: "switch", index: bestIdx };
  }

  // Mostly the best move; occasionally the runner-up if it's close.
  if (scored.length > 1 && scored[1].score >= scored[0].score * 0.85 && chance(rng, 0.25)) {
    return { kind: "move", slot: scored[1].i };
  }
  return { kind: "move", slot: scored[0].i };
}
