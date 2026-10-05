// Pure progress helpers for round-3 systems: real-date harvest regrowth,
// hidden items, quest flags and item plurals. No DOM; unit-tested.

import type { GameState, ItemId, MapDef, MapId, SpeciesId } from "../contracts";

// ---------------------------------------------------------------------------
// Harvest bushes (regrow on the next real-world day)
// ---------------------------------------------------------------------------

/** Local calendar date as YYYY-MM-DD (the player's day, not UTC). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if the bush `id` has already been picked today. */
export function pickedToday(state: Pick<GameState, "harvested">, id: string, now: Date = new Date()): boolean {
  return state.harvested?.[id] === todayISO(now);
}

/** Record a pick. Returns false (and changes nothing) if it was already picked today. */
export function pickBush(state: Pick<GameState, "harvested">, id: string, now: Date = new Date()): boolean {
  if (pickedToday(state, id, now)) return false;
  state.harvested = { ...(state.harvested ?? {}), [id]: todayISO(now) };
  return true;
}

/** Harvest id for a bush NPC (`bush:<harvestId>`), or null. */
export function bushId(npcId: string): string | null {
  const m = /^bush:(.+)$/.exec(npcId);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Hidden items
// ---------------------------------------------------------------------------

export type HiddenItem = NonNullable<MapDef["hidden"]>[number];

export const hiddenFlag = (map: MapId, x: number, y: number) => `hidden_${map}_${x}_${y}`;

/** The unfound hidden item at (x, y) on a map, if any. */
export function hiddenAt(def: MapDef, flags: Record<string, boolean>, x: number, y: number): HiddenItem | undefined {
  return def.hidden?.find((h) => h.x === x && h.y === y && !flags[hiddenFlag(def.id, h.x, h.y)]);
}

export function unfoundHidden(def: MapDef, flags: Record<string, boolean>): HiddenItem[] {
  return (def.hidden ?? []).filter((h) => !flags[hiddenFlag(def.id, h.x, h.y)]);
}

// ---------------------------------------------------------------------------
// Quests (flags quest_<id>_started / quest_<id>_done)
// ---------------------------------------------------------------------------

export const questStartedFlag = (id: string) => `quest_${id}_started`;
export const questDoneFlag = (id: string) => `quest_${id}_done`;

export type QuestStatus = "none" | "active" | "done";

export function questStatus(flags: Record<string, boolean>, id: string): QuestStatus {
  if (flags[questDoneFlag(id)]) return "done";
  if (flags[questStartedFlag(id)]) return "active";
  return "none";
}

/** Any quest started (or finished)? Decides whether NOTES shows in the START menu. */
export function anyQuestStarted(flags: Record<string, boolean>): boolean {
  return Object.keys(flags).some((k) => flags[k] && /^quest_.+_(started|done)$/.test(k));
}

// ---------------------------------------------------------------------------
// Conditions for the round-3 conditional ops
// ---------------------------------------------------------------------------

const asList = (s: SpeciesId | SpeciesId[]) => (Array.isArray(s) ? s : [s]);

export function hasItem(state: Pick<GameState, "bag">, item: ItemId, qty = 1): boolean {
  return (state.bag[item] ?? 0) >= Math.max(1, qty);
}

export function partyHas(state: Pick<GameState, "party">, species: SpeciesId | SpeciesId[]): boolean {
  const want = asList(species);
  return state.party.some((q) => want.includes(q.species));
}

export function caughtAny(state: Pick<GameState, "herbarium">, species: SpeciesId | SpeciesId[]): boolean {
  const want = asList(species);
  return want.some((s) => state.herbarium.caught.includes(s));
}

export function caughtCount(state: Pick<GameState, "herbarium">): number {
  return new Set(state.herbarium.caught).size;
}

// ---------------------------------------------------------------------------
// Item names in sentences
// ---------------------------------------------------------------------------

/** Uncountable items read as "COMPOST ×3" rather than "3 COMPOSTS". */
const MASS_NOUNS = /^(COMPOST|SPRING WATER|PLANT FOOD|NEEM SPRAY|SYRUP)$/i;

/** Plural of an upper-case item name: BERRY -> BERRIES, POD -> PODS, PEACH -> PEACHES (…S stays). */
export function pluralName(name: string): string {
  if (/[^AEIOU]Y$/i.test(name)) return `${name.slice(0, -1)}IES`;
  if (/S$/i.test(name)) return name;
  if (/(SH|CH|X|Z)$/i.test(name)) return `${name}ES`;
  return `${name}S`;
}

/** "2 WILD BERRIES", the bare name for 1, "COMPOST ×3" for mass nouns. */
export function countedName(name: string, qty: number): string {
  if (qty === 1) return name;
  if (MASS_NOUNS.test(name)) return `${name} ×${qty}`;
  return `${qty} ${pluralName(name)}`;
}

/** The name as it goes in "put the ___ in the POCKET". */
export function pocketName(name: string, qty: number): string {
  if (qty === 1 || MASS_NOUNS.test(name)) return name;
  return pluralName(name);
}
