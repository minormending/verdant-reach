// What surrounds a trainer (pure; no DOM): the wild plants on its map and the
// maps one warp away, the nearest heal point, the next Conservatory leader in
// story order, and the level strip that compares them. Unit-tested in
// context.test.ts.

import type { MapDef, MapId, WorldData } from "../contracts";
import { encounterSets, type EncounterSet, type LabelContext } from "../guide/indexer";
import type { TrainerEntry } from "../world/trainerFile";
import { levelRange, type CatalogRow } from "./catalog";

export interface Range { min: number; max: number }

/** Wild levels over a map's tables: the normal table, or (`variants`) every encountersWhen variant too. */
export function wildRange(sets: readonly EncounterSet[], variants = false): Range | null {
  const rows = sets.filter((s) => variants || s.when === null).flatMap((s) => s.tables.flatMap((t) => t.rows));
  if (!rows.length) return variants ? null : wildRange(sets, true);
  return { min: Math.min(...rows.map((r) => r.minLevel)), max: Math.max(...rows.map((r) => r.maxLevel)) };
}

/** A map's encounter sets (normal table, then labelled variants). */
export const mapEncounters = (def: MapDef, ctx: LabelContext = {}) => encounterSets(def, ctx);

/** Maps one warp away, in the order their warps are listed (each once, never the map itself). */
export function adjacentMaps(world: Pick<WorldData, "maps">, map: MapId): MapId[] {
  const out: MapId[] = [];
  for (const w of world.maps[map]?.warps ?? []) if (w.to !== map && world.maps[w.to] && !out.includes(w.to)) out.push(w.to);
  return out;
}

/** The wild plants to compare a trainer with: its own map's, else the nearest map's with wild plants (by warps, up to `depth`). */
export function nearestWild(world: Pick<WorldData, "maps">, maps: readonly MapId[], ctx: LabelContext = {}, depth = 4): { map: MapId | null; sets: EncounterSet[] } {
  const seen = new Set<MapId>(maps);
  let frontier = [...maps];
  for (let d = 0; d <= depth && frontier.length; d++) {
    for (const m of frontier) {
      const sets = encounterSets(world.maps[m], ctx);
      if (wildRange(sets)) return { map: m, sets };
    }
    frontier = frontier.flatMap((m) => adjacentMaps(world, m)).filter((m) => !seen.has(m) && (seen.add(m), true));
  }
  return { map: null, sets: [] };
}

/** The nearest map with a heal point (a GREENHOUSE, home), by number of warps; `warps` 0 when the map heals itself. */
export function nearestHeal(world: Pick<WorldData, "maps">, map: MapId): { map: MapId; name: string; warps: number } | null {
  const seen = new Set<MapId>([map]);
  let frontier: MapId[] = [map];
  for (let warps = 0; frontier.length && warps < 64; warps++) {
    const hit = frontier.find((m) => world.maps[m]?.healPoint);
    if (hit) return { map: hit, name: world.maps[hit].name, warps };
    const next: MapId[] = [];
    for (const m of frontier) for (const to of adjacentMaps(world, m)) if (!seen.has(to)) { seen.add(to); next.push(to); }
    frontier = next;
  }
  return null;
}

/**
 * The Conservatory leader the player meets next in story order: the trainer
 * itself when it is a leader, else the first leader whose walkthrough section
 * is at or after the trainer's. Null after the eighth mark.
 */
export function nextLeader(rows: readonly CatalogRow[], row: CatalogRow): CatalogRow | null {
  if (row.kind === "leader") return row;
  if (!row.story) return null;
  const leaders = rows.filter((r) => r.kind === "leader" && r.story).sort((a, b) => a.story!.index - b.story!.index);
  return leaders.find((l) => l.story!.index >= row.story!.index) ?? null;
}

export interface LevelContext {
  trainer: Range;
  wild: Range | null;
  /** The map whose wild plants `wild` describes. */
  wildMap: MapId | null;
  leader: { id: string; label: string; range: Range } | null;
  /** The span every bar is drawn against. */
  scale: Range;
  hints: string[];
}

/** The strip: this trainer's levels vs. its map's wild levels vs. the next leader's. */
export function levelContext(entry: TrainerEntry, wild: Range | null, wildMap: MapId | null,
  leader: { id: string; label: string; team: TrainerEntry["team"] } | null): LevelContext {
  const trainer = levelRange(entry.team);
  const lead = leader ? { id: leader.id, label: leader.label, range: levelRange(leader.team) } : null;
  const all = [trainer, wild, lead?.range].filter((r): r is Range => !!r);
  const lo = Math.min(...all.map((r) => r.min));
  const hi = Math.max(...all.map((r) => r.max));
  const pad = Math.max(2, Math.round((hi - lo) * 0.1));
  const hints: string[] = [];
  if (wild && trainer.max > wild.max + 5) hints.push(`The ace (Lv ${trainer.max}) is ${trainer.max - wild.max} levels above the wild plants here (up to Lv ${wild.max}).`);
  if (wild && trainer.max < wild.min) hints.push(`The whole team is below the wild plants here (from Lv ${wild.min}).`);
  if (lead && lead.id !== entry.id && trainer.max > lead.range.max) hints.push(`The ace (Lv ${trainer.max}) is above the next leader's ace (Lv ${lead.range.max}).`);
  return { trainer, wild, wildMap, leader: lead, scale: { min: Math.max(1, lo - pad), max: Math.min(100, hi + pad) }, hints };
}
