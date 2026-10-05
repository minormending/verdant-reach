// Text helpers shared by battle and screens.

import type { GameContext } from "../../contracts";

/** Substitute {PLAYER} / <PLAYER> / [PLAYER] and the RIVAL equivalents. */
export function fmt(ctx: GameContext, text: string): string {
  return text
    .replace(/[{<[]PLAYER[}>\]]/g, ctx.state?.playerName || "YOU")
    .replace(/[{<[]RIVAL[}>\]]/g, ctx.state?.rivalName || "BRAM");
}

export function playerName(ctx: GameContext): string {
  return (ctx.state?.playerName || "YOU").toUpperCase();
}

/** Register a species as seen (idempotent). */
export function markSeen(ctx: GameContext, species: string): void {
  const h = ctx.state.herbarium;
  if (!h.seen.includes(species as never)) h.seen.push(species as never);
}

/** Register a species as caught (and seen). Returns true the first time. */
export function markCaught(ctx: GameContext, species: string): boolean {
  markSeen(ctx, species);
  const h = ctx.state.herbarium;
  if (h.caught.includes(species as never)) return false;
  h.caught.push(species as never);
  return true;
}

export function hasHerbarium(ctx: GameContext): boolean {
  return (ctx.state.bag["field_herbarium"] ?? 0) > 0;
}

/**
 * "5 TERRARIUM PODs", "1 COMPOST", "3 SEEDS": a count and an upper-case item
 * name with a lower-case plural s (Crystal style), never doubling an S.
 */
// Same rules as the overworld's "received" messages: upper-case plural S,
// and uncountable items as "COMPOST ×3".
const MASS_NOUNS = /^(COMPOST|SPRING WATER|PLANT FOOD|NEEM SPRAY)$/i;

export function countOf(n: number, name: string): string {
  if (n === 1) return `1 ${name}`;
  if (MASS_NOUNS.test(name)) return `${name} ×${n}`;
  return /S$/i.test(name) ? `${n} ${name}` : `${n} ${name}S`;
}
