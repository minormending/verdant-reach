import type { GameData, ItemId, Move, Quickened } from "../src/contracts";
import { active, effectiveSpeed, type BattleState, type Side } from "../src/battle/logic/battle";
import { calcDamage, typeEffectiveness } from "../src/battle/logic/damage";

/** One hit of `move` from `side` on the other side's active plant, at a fixed
 * roll and no crit. Pure: it never consumes the battle's random numbers. */
export function hitDamage(s: BattleState, side: Side, move: Move, roll = 100): number {
  const me = active(s, side);
  const foe = active(s, side === 0 ? 1 : 0);
  const fixed = move.effects.find((e) => e.kind === "fixed_damage");
  if (fixed?.kind === "fixed_damage") {
    const effective = typeEffectiveness(s.data.typeChart, move.type, s.data.species[foe.species].types);
    return effective === 0 ? 0 : fixed.amount === "level" ? me.level : fixed.amount;
  }
  if (move.category === "status" || move.power <= 0) return 0;
  const multi = move.effects.find((e) => e.kind === "multi_hit");
  const hits = multi?.kind === "multi_hit"
    ? multi.min === 2 && multi.max === 5 ? 3 : (multi.min + multi.max) / 2 : 1;
  return hits * calcDamage({
    data: s.data, attacker: me, defender: foe,
    atkStages: s.sides[side].vol.stages, defStages: s.sides[side === 0 ? 1 : 0].vol.stages,
    move, weather: s.weather?.kind ?? null, time: s.time, crit: false, roll,
  }).damage;
}

/** Score legal moves with the game's damage formula (including its type chart,
 * STAB, weather, status and stat stages), without consuming any random rolls.
 * Damage beyond the foe's HP is worth nothing, so a sure KO beats a riskier
 * overkill (raw damage breaks ties), and a recoil move that would wilt the
 * user is a last resort. */
export function strongestMove(s: BattleState): number {
  const me = active(s, 0);
  const foe = active(s, 1);
  let best = -1;
  let bestScore: [number, number] = [-1, -1];
  me.moves.forEach((slot, index) => {
    if (slot.pp <= 0) return;
    const move = s.data.moves[slot.id];
    if (!move) return;
    const fixed = move.effects.some((e) => e.kind === "fixed_damage");
    if (move.category === "status" || (move.power <= 0 && !fixed)) return;
    const damage = hitDamage(s, 0, move);
    const accuracy = (move.accuracy ?? 100) / 100;
    const recoil = move.effects.find((e) => e.kind === "recoil");
    const selfWilt = recoil?.kind === "recoil" && Math.max(1, Math.floor(Math.min(damage, foe.hp) * recoil.fraction)) >= me.hp;
    const score: [number, number] = [Math.min(damage, foe.hp) * accuracy * (selfWilt ? 0.01 : 1), damage * accuracy];
    if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) { best = index; bestScore = score; }
  });
  // A status-only moveset can still spend its remaining PP and reach Struggle.
  return best >= 0 ? best : me.moves.findIndex((m) => m.pp > 0);
}

/** The foe's strongest hit on the player's active plant (top roll, no crit),
 * over the moves it still has PP for: a cautious one-turn threat. */
export function foeThreat(s: BattleState): number {
  const foe = active(s, 1);
  let threat = 0;
  for (const slot of foe.moves) {
    const move = s.data.moves[slot.id];
    if (slot.pp > 0 && move) threat = Math.max(threat, hitDamage(s, 1, move));
  }
  return threat;
}

/** Spend only medicine the story already supplied; never manufacture items.
 * Heal below a third of max HP. Given the battle, skip medicine that cannot
 * help, as a careful player would: when the plant moves first and a sure hit
 * (full accuracy, lowest roll) finishes the foe, or when even the healed HP
 * would fall to the foe's strongest top-roll hit. In seeded simulations of the
 * late bosses this beat the plain rule (CALLOWAY's Grove rematch at the
 * helper's level 60: 45% -> 72%) and saved medicine for later fights. */
export function healingItem(data: GameData, bag: Record<string, number>, q: Quickened, s?: BattleState): ItemId | null {
  if (q.hp <= 0 || q.hp > q.stats.hp / 3) return null;
  let best: ItemId | null = null;
  let restored = 0;
  for (const [id, qty] of Object.entries(bag)) {
    const item = data.items[id as ItemId];
    if (qty <= 0 || !item?.usableInBattle) continue;
    const effect = item.effect;
    const hp = effect.kind === "heal_full" ? q.stats.hp - q.hp
      : effect.kind === "heal" ? Math.min(effect.amount, q.stats.hp - q.hp) : 0;
    if (hp > restored) { best = id as ItemId; restored = hp; }
  }
  if (!best || !s || active(s, 0) !== q) return best;
  const foe = active(s, 1);
  const finishes = effectiveSpeed(s, 0) > effectiveSpeed(s, 1) && q.moves.some((slot) => {
    const move = s.data.moves[slot.id];
    return slot.pp > 0 && !!move && (move.accuracy ?? 100) >= 100 && hitDamage(s, 0, move, 85) >= foe.hp;
  });
  if (finishes || q.hp + restored <= foeThreat(s)) return null;
  return best;
}
