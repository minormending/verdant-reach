// Wild encounter rolls: per-step chance, time-of-day slot filtering,
// weighted species pick, random level. Pure; unit-tested.

import type { EncounterSlot, MapDef, SpeciesId, TileKey, TimeOfDay } from "../contracts";
import { TILES } from "../contracts";

/** "day" slots cover morning and day; "night" only night; "any"/unset always. */
export function slotActive(slot: EncounterSlot, tod: TimeOfDay): boolean {
  const t = slot.time ?? "any";
  if (t === "any") return true;
  if (t === "day") return tod === "morning" || tod === "day";
  return tod === "night";
}

export function filterSlots(slots: EncounterSlot[], tod: TimeOfDay): EncounterSlot[] {
  return slots.filter((s) => slotActive(s, tod) && s.weight > 0);
}

export function pickWeighted(slots: EncounterSlot[], rng: () => number): EncounterSlot | null {
  const total = slots.reduce((n, s) => n + s.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const s of slots) {
    r -= s.weight;
    if (r < 0) return s;
  }
  return slots[slots.length - 1];
}

export function rollLevel(slot: EncounterSlot, rng: () => number): number {
  const lo = Math.min(slot.minLevel, slot.maxLevel);
  const hi = Math.max(slot.minLevel, slot.maxLevel);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export type EncounterKind = "grass" | "bog";

export function encounterKindFor(tile: TileKey): EncounterKind | null {
  const props = TILES[tile] as { encounter?: EncounterKind };
  return props.encounter ?? null;
}

/**
 * Roll a step on `tile`. Returns the wild Quickened to battle, or null.
 * `rate` is the % chance per step.
 */
export function rollEncounter(
  map: Pick<MapDef, "encounters">, tile: TileKey, tod: TimeOfDay, rng: () => number,
): { species: SpeciesId; level: number; kind: EncounterKind } | null {
  const kind = encounterKindFor(tile);
  if (!kind) return null;
  const table = map.encounters?.[kind];
  if (!table || table.rate <= 0) return null;
  if (rng() * 100 >= table.rate) return null;
  const slot = pickWeighted(filterSlots(table.slots, tod), rng);
  if (!slot) return null;
  return { species: slot.species, level: rollLevel(slot, rng), kind };
}
