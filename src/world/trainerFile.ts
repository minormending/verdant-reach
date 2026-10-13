// Trainer battle data as JSON (src/data/trainers.json, format docs/DATA.md §
// Trainers): who each trainer is, what they field and carry. The dialogue
// stays in TypeScript (src/world/trainers.ts), joined by id. This module is
// pure (no DATA import): the game's loader, the Trainer Editor page and the
// editor's dev-server "Save to repo" endpoint all validate and build with it.

import type { GameData, ItemId, MarkId, TrainerDef, TrainerPortraitKey } from "../contracts";
import { MARKS, TRAINER_PORTRAITS } from "../contracts";
import { MAX_LEVEL } from "../battle/logic/stats";
import { councilRematches, REMATCH_LINES } from "./rematches";

export const TRAINERS_FORMAT = "verdant.trainers/1";
export const TRAINER_MUSIC = ["battle_trainer", "battle_leader", "battle_rootstock", "battle_mercer", "battle_keeper"] as const;
export type TrainerMusic = (typeof TRAINER_MUSIC)[number];
export type TeamMember = TrainerDef["team"][number];
export interface TrainerLines { intro: string; defeat: string; after: string }

/** One trainer as stored on disk. `prize` is omitted when it follows the default rule. */
export interface TrainerEntry {
  id: string;
  name: string;
  className: string;
  portrait: TrainerPortraitKey;
  ai: "basic" | "smart";
  music: TrainerMusic;
  /** Prize money; omitted = the default rule, highest team level x 20 (`defaultPrize`). */
  prize?: number;
  mark?: MarkId;
  items?: { item: ItemId; qty: number }[];
  /** A designer's note (balance rationale). The game ignores it; the editor shows it. */
  note?: string;
  team: TeamMember[];
}

export interface TrainersFile { format: typeof TRAINERS_FORMAT; trainers: TrainerEntry[] }

/** What the file is checked against: the game data and the dialogue records. */
export interface TrainerFileContext {
  data: Pick<GameData, "species" | "moves" | "items">;
  /** Dialogue by key: a trainer id, or a rival group (`rival_4` for `rival_4_oak`/`_chili`/`_lily`). */
  lines: Readonly<Record<string, TrainerLines>>;
}

export const NAME_MAX = 12;
export const CLASS_MAX = 14;
export const TEAM_MAX = 6;
export const MOVES_MAX = 4;
/** Portraits for the player's side only; never a trainer's. */
const PLAYER_PORTRAITS = new Set<string>(["player_back", "player_girl_back"]);
const STARTER_SUFFIX = /_(oak|chili|lily)$/;

/** The default prize rule: the highest level on the team x 20. */
export const defaultPrize = (team: readonly { level: number }[]): number =>
  team.length ? Math.max(...team.map((m) => m.level)) * 20 : 0;
export const prizeOf = (e: Pick<TrainerEntry, "prize" | "team">): number => e.prize ?? defaultPrize(e.team);

/** The dialogue key a trainer id reads: its own id, else its rival group (the starter suffix dropped). */
export function linesKey(id: string, lines: Readonly<Record<string, TrainerLines>>): string | null {
  if (lines[id]) return id;
  const base = id.replace(STARTER_SUFFIX, "");
  return base !== id && lines[base] ? base : null;
}

/** True for a trainer id the build derives (the Council rematches); the file must not define those. */
export const isDerivedId = (id: string) => /_rematch$/.test(id);
/** The Council seats whose `<id>_rematch` the build derives at +8 (src/world/rematches.ts). */
export const isCouncilSeat = (id: string) => `${id}_rematch` in REMATCH_LINES;

/** Shape and reference errors (empty when valid), each naming the trainer and field. */
export function trainersFileErrors(d: TrainersFile, ctx: TrainerFileContext): string[] {
  const errs: string[] = [];
  const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);
  const { species, moves, items } = ctx.data;
  if (!d || typeof d !== "object") return ["trainers.json: must be an object"];
  if (d.format !== TRAINERS_FORMAT) errs.push(`trainers.json: format: expected "${TRAINERS_FORMAT}"`);
  if (!Array.isArray(d.trainers) || !d.trainers.length) {
    errs.push("trainers.json: trainers must be a non-empty array");
    return errs;
  }
  const seen = new Set<string>();
  const usedLines = new Set<string>();
  const marks = new Map<string, string>();
  for (const [i, t] of d.trainers.entries()) {
    const at = (msg: string) => errs.push(`trainers.json: trainers[${i}] ${t?.id ?? "?"}: ${msg}`);
    if (!t || typeof t !== "object") { at("must be an object"); continue; }
    if (typeof t.id !== "string" || !/^[a-z0-9_]+$/.test(t.id)) at("id must be lower_snake_case");
    else if (isDerivedId(t.id)) at("ids ending _rematch are built from the Council seats (src/world/rematches.ts)");
    if (seen.has(t.id)) at("id is defined twice");
    seen.add(t.id);
    if (typeof t.name !== "string" || !t.name.trim() || t.name.length > NAME_MAX) at(`name must be 1-${NAME_MAX} characters`);
    if (typeof t.className !== "string" || !t.className.trim() || t.className.length > CLASS_MAX) at(`className must be 1-${CLASS_MAX} characters`);
    if (!(TRAINER_PORTRAITS as readonly string[]).includes(t.portrait) || PLAYER_PORTRAITS.has(t.portrait)) at(`portrait ${String(t.portrait)} is not a trainer portrait (TRAINER_PORTRAITS)`);
    if (t.ai !== "basic" && t.ai !== "smart") at("ai must be basic or smart");
    if (!(TRAINER_MUSIC as readonly string[]).includes(t.music)) at(`music must be one of ${TRAINER_MUSIC.join(", ")}`);
    if (t.prize !== undefined && (!isInt(t.prize) || t.prize < 0)) at("prize must be a whole number (omit it for the default rule)");
    if (t.mark !== undefined) {
      if (!(MARKS as readonly string[]).includes(t.mark)) at(`mark ${String(t.mark)} is unknown`);
      else if (marks.has(t.mark)) at(`mark ${t.mark} is already awarded by ${marks.get(t.mark)}`);
      else marks.set(t.mark, t.id);
    }
    if (t.note !== undefined && typeof t.note !== "string") at("note must be text");
    if (t.items !== undefined) {
      if (!Array.isArray(t.items)) at("items must be a list");
      else {
        const bag = new Set<string>();
        for (const [j, it] of t.items.entries()) {
          if (!it || !(it.item in items)) at(`items[${j}]: unknown item ${String(it?.item)}`);
          else if (bag.has(it.item)) at(`items[${j}]: ${it.item} is listed twice`);
          else bag.add(it.item);
          if (!isInt(it?.qty) || it.qty < 1) at(`items[${j}]: qty must be a whole number, at least 1`);
        }
      }
    }
    if (!Array.isArray(t.team) || t.team.length < 1 || t.team.length > TEAM_MAX) at(`team must have 1-${TEAM_MAX} members`);
    for (const [j, m] of (Array.isArray(t.team) ? t.team : []).entries()) {
      const w = (msg: string) => at(`team[${j}]: ${msg}`);
      if (!m || typeof m !== "object") { w("must be an object"); continue; }
      if (!(m.species in species)) w(`unknown species ${String(m.species)}`);
      if (!isInt(m.level) || m.level < 1 || m.level > MAX_LEVEL) w(`level must be a whole number 1-${MAX_LEVEL}`);
      if (m.grafted !== undefined && typeof m.grafted !== "boolean") w("grafted must be true or false");
      if (m.moves !== undefined) {
        if (!Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > MOVES_MAX) w(`moves must list 1-${MOVES_MAX} moves (omit it for the default moves)`);
        else {
          if (new Set(m.moves).size !== m.moves.length) w("moves must be unique");
          for (const mv of m.moves) if (!(mv in moves)) w(`unknown move ${String(mv)}`);
        }
      }
    }
    if (typeof t.id === "string") {
      const key = linesKey(t.id, ctx.lines);
      if (!key) at("has no dialogue lines (add them in src/world/trainers.ts)");
      else usedLines.add(key);
    }
  }
  for (const key of Object.keys(ctx.lines)) {
    if (!usedLines.has(key)) errs.push(`trainers.json: no trainer uses the dialogue lines "${key}" (src/world/trainers.ts)`);
  }
  return errs;
}

const cloneMember = (m: TeamMember): TeamMember => ({
  species: m.species, level: m.level,
  ...(m.moves ? { moves: [...m.moves] } : {}),
  ...(m.grafted ? { grafted: true } : {}),
});

/** One TrainerDef: the entry's battle data with its dialogue (fresh arrays, nothing shared with the file). */
export function buildTrainer(e: TrainerEntry, lines: TrainerLines): TrainerDef {
  return {
    id: e.id, name: e.name, className: e.className, portrait: e.portrait,
    team: e.team.map(cloneMember),
    prize: prizeOf(e),
    ai: e.ai,
    music: e.music,
    intro: lines.intro, defeat: lines.defeat, after: lines.after,
    ...(e.mark ? { mark: e.mark } : {}),
    ...(e.items ? { items: e.items.map((i) => ({ item: i.item, qty: i.qty })) } : {}),
  };
}

/**
 * Every TrainerDef in file order, then the derived Council rematches (each seat
 * at +8, src/world/rematches.ts) in seat order. Throws on an invalid file.
 */
export function buildTrainers(d: TrainersFile, ctx: TrainerFileContext): Record<string, TrainerDef> {
  const errs = trainersFileErrors(d, ctx);
  if (errs.length) throw new Error(`Invalid trainer data:\n${errs.join("\n")}`);
  const base = d.trainers.map((e) => buildTrainer(e, ctx.lines[linesKey(e.id, ctx.lines)!]));
  const all = [...base, ...councilRematches(base.filter((t) => isCouncilSeat(t.id)))];
  return Object.fromEntries(all.map((t) => [t.id, t]));
}

/** A canonical entry: fields in file order, empty optionals dropped, `grafted` only when true. */
export function normalizeEntry(e: TrainerEntry): TrainerEntry {
  return {
    id: e.id, name: e.name, className: e.className, portrait: e.portrait, ai: e.ai, music: e.music,
    ...(e.prize !== undefined ? { prize: e.prize } : {}),
    ...(e.mark ? { mark: e.mark } : {}),
    ...(e.items?.length ? { items: e.items.map((i) => ({ item: i.item, qty: i.qty })) } : {}),
    ...(e.note ? { note: e.note } : {}),
    team: e.team.map(cloneMember),
  };
}

const inline = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
  if (v && typeof v === "object") {
    const e = Object.entries(v).filter(([, x]) => x !== undefined);
    return e.length ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(", ")} }` : "{}";
  }
  return JSON.stringify(v);
};

/**
 * The file's text, deterministic: one trainer per block, its fields on the
 * first line, a note and the bag on their own lines, one team member per line.
 * The editor's export, its "Save to repo" and the shipped file all use it, so
 * an unchanged export is byte-identical to src/data/trainers.json.
 */
export function formatTrainersFile(d: TrainersFile): string {
  const blocks = d.trainers.map((raw) => {
    const e = normalizeEntry(raw);
    const { team, items, note, ...head } = e;
    const lines = [`    ${inline(head).slice(0, -2)},`];
    if (note !== undefined) lines.push(`      "note": ${JSON.stringify(note)},`);
    if (items) lines.push(`      "items": ${inline(items)},`);
    lines.push(`      "team": [`);
    lines.push(team.map((m) => `        ${inline(m)}`).join(",\n"));
    lines.push("      ] }");
    return lines.join("\n");
  });
  return `{\n  "format": ${JSON.stringify(d.format)},\n  "trainers": [\n${blocks.join(",\n")}\n  ]\n}\n`;
}

/** Parse file text (JSON). Returns the value and any syntax error. */
export function parseTrainersFile(text: string): { file?: TrainersFile; error?: string } {
  try {
    return { file: JSON.parse(text) as TrainersFile };
  } catch (e) {
    return { error: `trainers.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
}

