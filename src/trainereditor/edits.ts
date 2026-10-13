// The editor's working state (pure; no DOM): edits are whole trainer entries
// that differ from the shipped src/data/trainers.json, keyed by id. Applying
// them gives the file the export writes; the diff says what changed in words.
// Validation runs the build's own trainersFileErrors. Unit-tested in
// edits.test.ts.

import type { GameData } from "../contracts";
import {
  defaultPrize, formatTrainersFile, normalizeEntry, trainersFileErrors, type TeamMember, type TrainerEntry,
  type TrainerFileContext, type TrainersFile,
} from "../world/trainerFile";

/** Edited entries by trainer id (only those that differ from the shipped file). */
export type Edits = Record<string, TrainerEntry>;

const key = (e: TrainerEntry) => JSON.stringify(normalizeEntry(e));
export const sameEntry = (a: TrainerEntry, b: TrainerEntry) => key(a) === key(b);

/** The shipped file with the edits applied, in the shipped order. Unknown ids are ignored. */
export function applyEdits(base: TrainersFile, edits: Edits): TrainersFile {
  return { format: base.format, trainers: base.trainers.map((e) => (edits[e.id] ? normalizeEntry(edits[e.id]) : e)) };
}

/** Edits with `entry` recorded (or dropped, when it matches the shipped entry again). */
export function setEdit(base: TrainersFile, edits: Edits, entry: TrainerEntry): Edits {
  const out = { ...edits };
  const shipped = base.trainers.find((t) => t.id === entry.id);
  if (!shipped) return out;
  if (sameEntry(shipped, entry)) delete out[entry.id];
  else out[entry.id] = normalizeEntry(entry);
  return out;
}

/** Drop edits for ids the shipped file no longer has, and edits the shipped file now matches (after a save). */
export function pruneEdits(base: TrainersFile, edits: Edits): Edits {
  const out: Edits = {};
  for (const e of base.trainers) if (edits[e.id] && !sameEntry(e, edits[e.id])) out[e.id] = normalizeEntry(edits[e.id]);
  return out;
}

/** Edits that turn the shipped file into `file` (an imported trainers.json), with ids it can't use. */
export function editsFromFile(base: TrainersFile, file: TrainersFile): { edits: Edits; unknown: string[]; missing: string[] } {
  const byId = new Map((Array.isArray(file?.trainers) ? file.trainers : []).map((t) => [t?.id, t]));
  const edits: Edits = {};
  for (const e of base.trainers) {
    const t = byId.get(e.id);
    if (t && !sameEntry(e, t)) edits[e.id] = normalizeEntry(t);
  }
  return {
    edits,
    unknown: [...byId.keys()].filter((id) => !base.trainers.some((e) => e.id === id)).map(String),
    missing: base.trainers.filter((e) => !byId.has(e.id)).map((e) => e.id),
  };
}

/** The file text an export writes (canonical layout, byte-identical to the shipped file when nothing changed). */
export const exportText = (base: TrainersFile, edits: Edits) => formatTrainersFile(applyEdits(base, edits));

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export interface Names { species: (id: string) => string; move: (id: string) => string; item: (id: string) => string }

export function namesFrom(data: Pick<GameData, "species" | "moves" | "items">): Names {
  return {
    species: (id) => data.species[id as keyof typeof data.species]?.name ?? id,
    move: (id) => data.moves[id]?.name ?? id,
    item: (id) => data.items[id]?.name ?? id,
  };
}

const memberText = (m: TeamMember, n: Names) =>
  `${n.species(m.species)} Lv ${m.level}${m.grafted ? " (grafted)" : ""}${m.moves ? ` [${m.moves.map(n.move).join(", ")}]` : ""}`;
const movesText = (m: TeamMember, n: Names) => (m.moves ? m.moves.map(n.move).join(", ") : "default moves");
const prizeText = (e: TrainerEntry) => (e.prize === undefined ? `default (${defaultPrize(e.team)})` : String(e.prize));

/** What changed between the shipped entry and an edited one, in words (empty when the same). */
export function diffEntry(before: TrainerEntry, after: TrainerEntry, n: Names): string[] {
  const out: string[] = [];
  const a = before.team;
  const b = after.team;
  const sameTeamOrder = a.length === b.length && a.every((m, i) => m.species === b[i].species);
  if (sameTeamOrder) {
    a.forEach((m, i) => {
      const o = b[i];
      const at = `#${i + 1} ${n.species(m.species)}`;
      if (m.level !== o.level) out.push(`${at}: level ${m.level} → ${o.level}`);
      if (JSON.stringify(m.moves ?? null) !== JSON.stringify(o.moves ?? null)) out.push(`${at}: moves ${movesText(m, n)} → ${movesText(o, n)}`);
      if (!!m.grafted !== !!o.grafted) out.push(`${at}: ${o.grafted ? "now grafted" : "no longer grafted"}`);
    });
  } else {
    out.push(`team: ${a.map((m) => memberText(m, n)).join(" / ")} → ${b.map((m) => memberText(m, n)).join(" / ")}`);
  }
  const bag = (e: TrainerEntry) => (e.items ?? []).map((i) => `${n.item(i.item)} x${i.qty}`).join(", ") || "none";
  if (bag(before) !== bag(after)) out.push(`bag: ${bag(before)} → ${bag(after)}`);
  if (prizeText(before) !== prizeText(after)) out.push(`prize: ${prizeText(before)} → ${prizeText(after)}`);
  if (before.ai !== after.ai) out.push(`AI: ${before.ai} → ${after.ai}`);
  for (const k of ["name", "className", "portrait", "music", "mark", "note"] as const) {
    if ((before[k] ?? "") !== (after[k] ?? "")) out.push(`${k}: ${before[k] ?? "none"} → ${after[k] ?? "none"}`);
  }
  return out;
}

/** Every edited trainer with its changes, in file order. */
export function diffFile(base: TrainersFile, edits: Edits, n: Names): { id: string; label: string; changes: string[] }[] {
  return base.trainers.filter((e) => edits[e.id]).map((e) => ({
    id: e.id, label: `${e.className} ${e.name}`, changes: diffEntry(e, edits[e.id], n),
  })).filter((d) => d.changes.length);
}

// ---------------------------------------------------------------------------
// Validation glue
// ---------------------------------------------------------------------------

export interface Validation {
  errors: string[];
  /** Errors naming a trainer, by id. */
  byTrainer: Map<string, string[]>;
  /** Errors naming no trainer (format, unused lines). */
  general: string[];
}

/** The build's own check over the edited file, sorted by trainer. */
export function validate(file: TrainersFile, ctx: TrainerFileContext): Validation {
  const errors = trainersFileErrors(file, ctx);
  const byTrainer = new Map<string, string[]>();
  const general: string[] = [];
  for (const e of errors) {
    const m = /^trainers\.json: trainers\[\d+\] ([a-z0-9_?]+): (.*)$/.exec(e);
    if (!m) { general.push(e); continue; }
    byTrainer.set(m[1], [...(byTrainer.get(m[1]) ?? []), m[2]]);
  }
  return { errors, byTrainer, general };
}
