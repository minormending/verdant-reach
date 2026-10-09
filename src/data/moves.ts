// Moves live in ./moves.json (format: docs/DATA.md), in list order. Every move
// is a real plant behaviour. This module checks each move's shape at build
// time, so a bad edit names the move and field; the battle and data tests
// cover the rest (animation families, learnsets, balance).

import type { Move, TypeId } from "../contracts";
import { STATUSES, TYPES } from "../contracts";
import file from "./moves.json";

export interface MovesFile { format: "verdant.moves/1"; moves: Move[] }

const CATEGORIES = ["physical", "special", "status"];
const EFFECTS = ["always_hit", "drain", "fixed_damage", "flinch", "heal", "high_crit", "multi_hit", "protect", "recoil", "root_tap", "stat", "status", "weather"];
const STATS = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

/** Shape errors in a moves file (empty when valid). */
export function movesFileErrors(d: MovesFile): string[] {
  const errs: string[] = [];
  const isInt = (n: unknown) => typeof n === "number" && Number.isInteger(n);
  if (d.format !== "verdant.moves/1") errs.push(`moves.json: format: expected "verdant.moves/1"`);
  const seen = new Set<string>();
  for (const [i, m] of (d.moves ?? []).entries()) {
    const at = (msg: string) => errs.push(`moves.json: moves[${i}] ${m.id ?? "?"}: ${msg}`);
    if (typeof m.id !== "string" || !/^[a-z0-9_]+$/.test(m.id)) at("id must be lower_snake_case");
    if (seen.has(m.id)) at("id is defined twice");
    seen.add(m.id);
    if (typeof m.name !== "string" || !m.name || m.name.length > 12) at("name must be 1-12 characters");
    if (!(TYPES as readonly string[]).includes(m.type)) at(`type must be one of ${TYPES.join(", ")}`);
    if (!CATEGORIES.includes(m.category)) at(`category must be one of ${CATEGORIES.join(", ")}`);
    const fixed = Array.isArray(m.effects) && m.effects.some((e) => e?.kind === "fixed_damage");
    if (!isInt(m.power) || m.power < 0) at("power must be a whole number");
    else if (m.category === "status" ? m.power !== 0 : m.power === 0 && !fixed) at("power is 0 for status moves (and fixed-damage moves), and above 0 otherwise");
    if (m.accuracy !== null && (!isInt(m.accuracy) || m.accuracy < 1 || m.accuracy > 100)) at("accuracy must be 1-100, or null (never misses)");
    if (!isInt(m.pp) || m.pp < 1) at("pp must be a positive integer");
    if (!isInt(m.priority)) at("priority must be an integer");
    if (typeof m.description !== "string" || !m.description || m.description.length > 36) at("description must be 1-36 characters");
    for (const e of Array.isArray(m.effects) ? m.effects : [null]) {
      if (!e || !EFFECTS.includes(e.kind)) { at(`effects: unknown kind (one of ${EFFECTS.join(", ")})`); continue; }
      if (e.kind === "status" && !(STATUSES as readonly string[]).includes(e.status)) at(`effects: unknown status ${e.status}`);
      if (e.kind === "stat" && !STATS.includes(e.stat)) at(`effects: unknown stat ${e.stat}`);
    }
  }
  return errs;
}

const errs = movesFileErrors(file as MovesFile);
if (errs.length) throw new Error(`Invalid moves data:\n${errs.join("\n")}`);

export const MOVES: Record<string, Move> = Object.fromEntries(
  (file as MovesFile).moves.map((m) => [m.id, { ...m, type: m.type as TypeId }]),
);
