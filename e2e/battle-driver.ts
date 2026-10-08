import type { GameData, ItemId, Quickened } from "../src/contracts";
import { active, type BattleState } from "../src/battle/logic/battle";
import { calcDamage, typeEffectiveness } from "../src/battle/logic/damage";

/** Score legal moves with the game's damage formula (including its type chart,
 * STAB, weather, status and stat stages), without consuming any random rolls. */
export function strongestMove(s: BattleState): number {
  const me = active(s, 0);
  const foe = active(s, 1);
  let best = -1;
  let bestScore = -1;
  me.moves.forEach((slot, index) => {
    if (slot.pp <= 0) return;
    const move = s.data.moves[slot.id];
    if (!move) return;
    const fixed = move.effects.find((e) => e.kind === "fixed_damage");
    if (move.category === "status" || (move.power <= 0 && !fixed)) return;
    let damage: number;
    if (fixed?.kind === "fixed_damage") {
      const effective = typeEffectiveness(s.data.typeChart, move.type, s.data.species[foe.species].types);
      damage = effective === 0 ? 0 : fixed.amount === "level" ? me.level : fixed.amount;
    } else {
      damage = calcDamage({
        data: s.data, attacker: me, defender: foe,
        atkStages: s.sides[0].vol.stages, defStages: s.sides[1].vol.stages,
        move, weather: s.weather?.kind ?? null, time: s.time, crit: false, roll: 100,
      }).damage;
    }
    const multi = move.effects.find((e) => e.kind === "multi_hit");
    const hits = multi?.kind === "multi_hit"
      ? multi.min === 2 && multi.max === 5 ? 3 : (multi.min + multi.max) / 2 : 1;
    const score = damage * hits * (move.accuracy ?? 100) / 100;
    if (score > bestScore) { best = index; bestScore = score; }
  });
  // A status-only moveset can still spend its remaining PP and reach Struggle.
  return best >= 0 ? best : me.moves.findIndex((m) => m.pp > 0);
}

/** Spend only medicine the story already supplied; never manufacture items. */
export function healingItem(data: GameData, bag: Record<string, number>, q: Quickened): ItemId | null {
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
  return best;
}

/** Navigate by the menu's actual on-screen rows and columns, at any canvas size. */
export function menuDirection(menu: { index: number; itemPos(i: number): { x: number; y: number } }, target: number): "up" | "down" | "left" | "right" | "a" {
  const current = menu.itemPos(menu.index), next = menu.itemPos(target);
  if (current.y !== next.y) return current.y < next.y ? "down" : "up";
  if (current.x !== next.x) return current.x < next.x ? "right" : "left";
  return "a";
}
