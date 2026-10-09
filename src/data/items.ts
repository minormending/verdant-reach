// Items live in ./items.json (format: docs/DATA.md). Names <= 13 chars; prices
// follow SLICE.md (pod 200, flask 300, neem 250); price 0 = can't be bought or
// sold. This module checks each item's shape at build time.

import type { Item } from "../contracts";
import { STATUSES } from "../contracts";
import file from "./items.json";

export interface ItemsFile { format: "verdant.items/1"; items: Item[] }

const POCKETS = ["items", "pods", "key"];
const EFFECTS = ["heal", "heal_full", "revive", "cure_status", "pod", "restore_pp", "none"];

/** Shape errors in an items file (empty when valid). */
export function itemsFileErrors(d: ItemsFile): string[] {
  const errs: string[] = [];
  if (d.format !== "verdant.items/1") errs.push(`items.json: format: expected "verdant.items/1"`);
  const seen = new Set<string>();
  for (const [i, it] of (d.items ?? []).entries()) {
    const at = (msg: string) => errs.push(`items.json: items[${i}] ${it.id ?? "?"}: ${msg}`);
    if (typeof it.id !== "string" || !/^[a-z0-9_]+$/.test(it.id)) at("id must be lower_snake_case");
    if (seen.has(it.id)) at("id is defined twice");
    seen.add(it.id);
    if (typeof it.name !== "string" || !it.name || it.name.length > 13) at("name must be 1-13 characters");
    if (!POCKETS.includes(it.pocket)) at(`pocket must be one of ${POCKETS.join(", ")}`);
    if (!Number.isInteger(it.price) || it.price < 0) at("price must be a whole number, 0 = not for sale");
    if (typeof it.description !== "string" || !it.description || it.description.length > 36) at("description must be 1-36 characters");
    if (!it.effect || !EFFECTS.includes(it.effect.kind)) at(`effect.kind must be one of ${EFFECTS.join(", ")}`);
    else if (it.effect.kind === "cure_status" && it.effect.status !== undefined && !(STATUSES as readonly string[]).includes(it.effect.status)) at(`effect.status ${it.effect.status} is unknown`);
    if (typeof it.usableInBattle !== "boolean" || typeof it.usableInField !== "boolean") at("usableInBattle and usableInField must be true or false");
  }
  return errs;
}

const errs = itemsFileErrors(file as ItemsFile);
if (errs.length) throw new Error(`Invalid items data:\n${errs.join("\n")}`);

export const ITEMS: Record<string, Item> = Object.fromEntries((file as ItemsFile).items.map((i) => [i.id, i]));
