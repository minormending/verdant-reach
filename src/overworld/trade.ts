// NPC trades: eligibility and the one-for-one party exchange, without UI.
import type { GameState, Quickened, SpeciesId } from "../contracts";

export function canTrade(q: Quickened | undefined, wants: readonly SpeciesId[]): boolean {
  return !!q && !q.seed && wants.includes(q.species);
}

/** Replace exactly one eligible slot and record the arriving species. */
export function swapTrade(
  state: Pick<GameState, "party" | "herbarium">, slot: number, wants: readonly SpeciesId[], received: Quickened,
): boolean {
  if (!canTrade(state.party[slot], wants)) return false;
  if (received.seed) throw new Error("A trade must deliver a non-seed QUICKENED");
  state.party[slot] = received;
  if (!state.party.some((q) => !q.seed)) throw new Error("A trade must leave a non-seed QUICKENED in the party");
  for (const entries of [state.herbarium.seen, state.herbarium.caught]) {
    if (!entries.includes(received.species)) entries.push(received.species);
  }
  return true;
}
