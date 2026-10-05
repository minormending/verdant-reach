// Using medicine on a Quickened (in battle or in the field).

import type { GameData, ItemId, Quickened } from "../../contracts";
import { getItem, getMove, qName } from "./lookup";

export function isMedicine(data: GameData, item: ItemId): boolean {
  const k = getItem(data, item).effect.kind;
  return k === "heal" || k === "heal_full" || k === "revive" || k === "cure_status" || k === "restore_pp";
}

export function isPod(data: GameData, item: ItemId): boolean {
  return getItem(data, item).effect.kind === "pod";
}

/** Would this item do anything to this Quickened? */
export function itemHasEffect(data: GameData, item: ItemId, q: Quickened): boolean {
  const e = getItem(data, item).effect;
  if (q.seed) return false;
  switch (e.kind) {
    case "heal":
    case "heal_full":
      return q.hp > 0 && q.hp < q.stats.hp;
    case "revive":
      return q.hp <= 0;
    case "cure_status":
      return q.hp > 0 && !!q.status && (!e.status || e.status === q.status);
    case "restore_pp":
      return q.moves.some((m) => m.pp < getMove(data, m.id).pp);
    default:
      return false;
  }
}

export interface ItemUseResult {
  ok: boolean;
  text: string;
  hpFrom: number;
  hpTo: number;
}

/** Apply an item (does not touch the bag). */
export function applyItem(data: GameData, item: ItemId, q: Quickened): ItemUseResult {
  const hpFrom = q.hp;
  const name = qName(data, q);
  if (q.seed) return { ok: false, text: "That can't be used on a SEED.", hpFrom, hpTo: q.hp };
  if (!itemHasEffect(data, item, q)) return { ok: false, text: "It won't have any effect.", hpFrom, hpTo: q.hp };
  const e = getItem(data, item).effect;
  let text = "";
  switch (e.kind) {
    case "heal": {
      q.hp = Math.min(q.stats.hp, q.hp + e.amount);
      text = `${name} recovered ${q.hp - hpFrom} HP!`;
      break;
    }
    case "heal_full":
      q.hp = q.stats.hp;
      text = `${name} recovered ${q.hp - hpFrom} HP!`;
      break;
    case "revive":
      q.hp = Math.max(1, Math.floor(q.stats.hp * e.fraction));
      q.status = null;
      text = `${name} perked back up!`;
      break;
    case "cure_status":
      q.status = null;
      text = `${name} was cured!`;
      break;
    case "restore_pp":
      for (const m of q.moves) {
        const max = getMove(data, m.id).pp;
        m.pp = e.amount > 0 ? Math.min(max, m.pp + e.amount) : max;
      }
      text = `${name}'s PP was restored.`;
      break;
    default:
      return { ok: false, text: "It won't have any effect.", hpFrom, hpTo: q.hp };
  }
  return { ok: true, text, hpFrom, hpTo: q.hp };
}

/** Remove one of an item from the bag. */
export function consumeItem(bag: Record<string, number>, item: ItemId, qty = 1): void {
  const n = (bag[item] ?? 0) - qty;
  if (n > 0) bag[item] = n;
  else delete bag[item];
}

export function addItem(bag: Record<string, number>, item: ItemId, qty = 1): void {
  bag[item] = Math.min(99, (bag[item] ?? 0) + qty);
}
