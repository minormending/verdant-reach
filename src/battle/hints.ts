// Move-menu type hints (an updated mechanic): once the player knows the foe,
// each damaging move shows SUPER / WEAK / NONE next to its name.

import type { GameData, Move, SpeciesId, TypeId } from "../contracts";

export type EffHint = "SUPER" | "WEAK" | "NONE" | null;

/** Multiplier of an attacking type against a defender's types (missing = 1). */
export function typeMultiplier(data: GameData, type: TypeId, defTypes: readonly TypeId[]): number {
  let m = 1;
  for (const t of defTypes) {
    const v = data.typeChart?.[type]?.[t];
    if (typeof v === "number") m *= v;
  }
  return m;
}

/**
 * The hint for one move against a defender. Status moves, fixed-damage moves
 * and neutral matchups get no hint.
 */
export function effectivenessHint(data: GameData, move: Move, defTypes: readonly TypeId[]): EffHint {
  if (move.category === "status" || move.power <= 0) return null;
  if (move.effects.some((e) => e.kind === "fixed_damage")) return null;
  const m = typeMultiplier(data, move.type, defTypes);
  if (m === 0) return "NONE";
  if (m > 1) return "SUPER";
  if (m < 1) return "WEAK";
  return null;
}

/**
 * Hints show when the player already knew the species before this battle
 * (it was in the Field Herbarium's seen list), or has since struck it with a
 * damaging move this battle and so learned how it reacts.
 */
export class FoeKnowledge {
  private known: Set<SpeciesId>;
  constructor(seenBefore: readonly SpeciesId[]) {
    this.known = new Set(seenBefore);
  }
  knows(species: SpeciesId): boolean {
    return this.known.has(species);
  }
  learn(species: SpeciesId): void {
    this.known.add(species);
  }
}
