// Team logic for the Trainer Editor (pure; no DOM), all through the game's own
// rules: a species' learnset at a level, the engine's default moves
// (movesAtLevel, as createTrainerQuickened uses them), stats at a level
// (calcTrainerStats: trainer DVs, grafted members five levels lower), the
// growth-level warning, type coverage from the type chart, and the rematch
// previews (buildRematch, councilRematches). Unit-tested in team.test.ts.

import type { GameData, MoveId, SpeciesId, Stats, TrainerDef, TypeId } from "../contracts";
import { TYPES } from "../contracts";
import { typeEffectiveness } from "../battle/logic/damage";
import { movesAtLevel, STAT_KEYS } from "../battle/logic/stats";
import { calcTrainerStats } from "../battle/logic/trainer";
import { buildRematch, councilRematches, rematchGrowthLevel } from "../world/rematches";
import type { TeamMember, TrainerEntry } from "../world/trainerFile";
import { STARTER_SPECIES, type StarterLine } from "../world/trainers";

/** Each move a species learns at or below `level` (or every move with `level` null), at the first level it learns it. */
export function learnsetMoves(data: GameData, species: SpeciesId, level: number | null = null): { move: MoveId; level: number }[] {
  const out: { move: MoveId; level: number }[] = [];
  const entries = [...(data.species[species]?.learnset ?? [])].map((e, i) => ({ ...e, i })).sort((a, b) => a.level - b.level || a.i - b.i);
  for (const e of entries) {
    if (level !== null && e.level > level) continue;
    if (!out.some((o) => o.move === e.move)) out.push({ move: e.move, level: e.level });
  }
  return out;
}

export interface LineageMove { move: MoveId; level: number; /** The stage that learns it (this species or an earlier stage). */ from: SpeciesId }

/**
 * The moves a member could know: its species' learnset, then moves its
 * earlier stages learn that it doesn't (a plant keeps what it knew before it
 * grew), each at the first level learned, at or below `level` (null: all).
 */
export function lineageMoves(data: GameData, species: SpeciesId, level: number | null = null): LineageMove[] {
  const out: LineageMove[] = [];
  for (let id: SpeciesId | null = species, guard = 0; id && guard < 4; id = previousStage(data, id), guard++) {
    for (const m of learnsetMoves(data, id, level)) if (!out.some((o) => o.move === m.move)) out.push({ ...m, from: id });
  }
  return out;
}

/** The moves the engine gives a member without a `moves` list: the last four learned, keeping two attacks. */
export function defaultMoves(data: GameData, species: SpeciesId, level: number): MoveId[] {
  const sp = data.species[species];
  return sp ? movesAtLevel(sp, level, (id) => (data.moves[id]?.power ?? 0) > 0) : [];
}

/** The moves a member battles with: its own list, or the engine's default. */
export const memberMoves = (data: GameData, m: TeamMember): MoveId[] => m.moves?.length ? m.moves.slice(0, 4) : defaultMoves(data, m.species, m.level);

/** Stats at the member's level, as the battle builds them (trainer DVs 9/8/8/8, no EVs; grafted: five levels lower). */
export const memberStats = (data: GameData, m: TeamMember): Stats => calcTrainerStats(data, m);
export const statTotal = (s: Stats) => STAT_KEYS.reduce((n, k) => n + s[k], 0);

/** The species a species grows from, if any. */
export function previousStage(data: GameData, id: SpeciesId): SpeciesId | null {
  for (const s of Object.values(data.species)) if (s.growsInto?.species === id) return s.id;
  return null;
}

/**
 * The level a species would normally have grown at: its previous stage's
 * level trigger, or for care, item and trade growth the level rematches use
 * (rematchGrowthLevel). Null for a first stage.
 */
export function grownAt(data: GameData, id: SpeciesId): { from: SpeciesId; level: number } | null {
  const from = previousStage(data, id);
  if (!from) return null;
  const level = rematchGrowthLevel(data, from);
  return level === null ? null : { from, level };
}

/**
 * The story's deliberate exceptions to the growth rule, by battle: BRAM's
 * collared starter in Rival 2 and 3 (the GRAFT COLLAR "makes them grow",
 * Chapter 3). A `grafted` member is always allowed.
 */
export const GROWTH_EXCEPTIONS: Record<string, { stage: 2 | 3; why: string }> = {
  rival_2: { stage: 2, why: "BRAM's GRAFT COLLAR forced his starter's growth (Chapter 3)" },
  rival_3: { stage: 2, why: "BRAM's GRAFT COLLAR forced his starter's growth (Chapter 3)" },
};

export type WarningKind = "growth" | "off_learnset" | "above_level" | "allowed";
export interface MemberWarning { kind: WarningKind; text: string }

/** Warnings for one member (never errors: the file is still valid). */
export function memberWarnings(data: GameData, trainerId: string, m: TeamMember): MemberWarning[] {
  const out: MemberWarning[] = [];
  const sp = data.species[m.species];
  if (!sp) return out;
  const grown = grownAt(data, m.species);
  if (grown && m.level < grown.level) {
    const variant = /^(.+)_(oak|chili|lily)$/.exec(trainerId);
    const exc = variant ? GROWTH_EXCEPTIONS[variant[1]] : undefined;
    const starter = !!exc && STARTER_SPECIES[variant![2] as StarterLine][exc.stage - 1] === m.species;
    const fromName = data.species[grown.from]?.name ?? grown.from;
    if (m.grafted) out.push({ kind: "allowed", text: `Below Lv ${grown.level}, where ${fromName} grows into it: allowed, it wears a GRAFT COLLAR.` });
    else if (starter) out.push({ kind: "allowed", text: `Below Lv ${grown.level}: allowed, ${exc!.why}.` });
    else out.push({ kind: "growth", text: `Lv ${m.level} is below Lv ${grown.level}, where ${fromName} grows into ${sp.name}.` });
  }
  const learn = lineageMoves(data, m.species);
  for (const mv of m.moves ?? []) {
    const name = data.moves[mv]?.name ?? mv;
    const at = learn.filter((l) => l.move === mv).sort((a, b) => a.level - b.level)[0];
    if (!at) out.push({ kind: "off_learnset", text: `${name} is not in ${sp.name}'s learnset or its earlier stages' (an "any move" override).` });
    else if (at.level > m.level) out.push({ kind: "above_level", text: `${name} is learned at Lv ${at.level}${at.from !== m.species ? ` (as ${data.species[at.from]?.name ?? at.from})` : ""}, above Lv ${m.level}.` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Type coverage
// ---------------------------------------------------------------------------

export interface DefenceRow {
  type: TypeId;
  /** Multiplier against each member, in team order. */
  each: number[];
  weak: number;
  resist: number;
  immune: number;
}

/** For each attacking type: how it hits each member (the game's type chart). */
export function defenceTable(data: GameData, team: readonly TeamMember[]): DefenceRow[] {
  return TYPES.map((type) => {
    const each = team.map((m) => typeEffectiveness(data.typeChart, type, data.species[m.species]?.types ?? []));
    return { type, each, weak: each.filter((x) => x > 1).length, resist: each.filter((x) => x > 0 && x < 1).length, immune: each.filter((x) => x === 0).length };
  });
}

export interface CoverageSummary {
  defence: DefenceRow[];
  /** Attacking types that hit more members super-effectively than any member resists. */
  threats: TypeId[];
  /** Types of the team's damaging moves. */
  moveTypes: TypeId[];
  /** Defending types at least one damaging move hits super-effectively (single-type targets). */
  hitsSuper: TypeId[];
  /** Defending types no damaging move hits for at least neutral damage. */
  walledBy: TypeId[];
}

export function coverage(data: GameData, team: readonly TeamMember[]): CoverageSummary {
  const defence = defenceTable(data, team);
  const moveTypes: TypeId[] = [];
  for (const m of team) for (const id of memberMoves(data, m)) {
    const mv = data.moves[id];
    if (mv && mv.power > 0 && !moveTypes.includes(mv.type)) moveTypes.push(mv.type);
  }
  const best = (def: TypeId) => Math.max(0, ...moveTypes.map((t) => typeEffectiveness(data.typeChart, t, [def])));
  return {
    defence,
    threats: defence.filter((r) => r.weak >= 2 && r.weak > r.resist + r.immune).map((r) => r.type),
    moveTypes: TYPES.filter((t) => moveTypes.includes(t)),
    hitsSuper: TYPES.filter((t) => best(t) > 1),
    walledBy: TYPES.filter((t) => moveTypes.length > 0 && best(t) < 1),
  };
}

// ---------------------------------------------------------------------------
// Rematch previews and a cheap balance hint
// ---------------------------------------------------------------------------

/** A route rematch after `wins` rematches won (the game's buildRematch: +wins+1 levels, grown). */
export const routeRematch = (data: GameData, def: TrainerDef, wins: number): TrainerDef => buildRematch(data, def, wins);
/** A Council seat's post-game rematch (+8 levels, rematches.ts). */
export const councilRematch = (def: TrainerDef): TrainerDef => councilRematches([def])[0];

/**
 * A cheap balance hint (not the balance sim): the team's summed stats at
 * level against the shipped team's, and the ace's level change. Leaders and
 * other balance milestones are still checked by balance.test.ts (`npm test`).
 */
export function balanceHint(data: GameData, edited: TrainerEntry, shipped: TrainerEntry): { pct: number; text: string } | null {
  const sum = (e: TrainerEntry) => e.team.reduce((n, m) => n + (data.species[m.species] ? statTotal(memberStats(data, m)) : 0), 0);
  const a = sum(edited);
  const b = sum(shipped);
  if (!b || a === b) return null;
  const pct = Math.round(((a - b) / b) * 1000) / 10;
  const ace = (e: TrainerEntry) => Math.max(...e.team.map((m) => m.level));
  const dl = ace(edited) - ace(shipped);
  const parts = [`Team stats at level ${pct > 0 ? "+" : ""}${pct}% vs. shipped (${a} vs. ${b})`];
  if (dl) parts.push(`ace ${dl > 0 ? "+" : ""}${dl} level${Math.abs(dl) === 1 ? "" : "s"}`);
  if (edited.team.length !== shipped.team.length) parts.push(`${edited.team.length} members (was ${shipped.team.length})`);
  return { pct, text: `${parts.join("; ")}.` };
}
