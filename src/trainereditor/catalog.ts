// The Trainer Editor's index (pure; no DOM): for every trainer in
// trainers.json, where it stands (every map, NPC, tile, facing, sight line,
// visibility condition, sight/talk/script battle), what kind of trainer it is,
// whether route rematches apply, and where it sits in the story (the
// guidebook walkthrough's part and section). Plus the list filters.
// Unit-tested in catalog.test.ts against the real WORLD.

import type { Cond, Dir, MapId, TrainerDef, WorldData } from "../contracts";
import { MAP_IDS } from "../contracts";
import { checkFlags, condLabel, mapScriptHits, sourceLabel, trainerGroup, type LabelContext } from "../guide/indexer";
import type { Section } from "../guide/types";
import { isRematchTrainer } from "../world/rematches";
import { isCouncilSeat, type TrainerEntry } from "../world/trainerFile";

export type TrainerKind = "trainer" | "leader" | "rival" | "rootstock" | "council";
export const KINDS: readonly TrainerKind[] = ["trainer", "leader", "rival", "rootstock", "council"];
export const KIND_LABELS: Record<TrainerKind, string> = {
  trainer: "Route trainer", leader: "Conservatory leader", rival: "Rival (BRAM)", rootstock: "Rootstock", council: "Council",
};

/** What a trainer is, from fields the editor never changes (id, class, music, mark). */
export function trainerKind(e: Pick<TrainerEntry, "id" | "className" | "music" | "mark">): TrainerKind {
  if (e.mark) return "leader";
  if (e.id.startsWith("rival_")) return "rival";
  if (e.className === "ROOTSTOCK" || e.music === "battle_rootstock" || e.music === "battle_mercer") return "rootstock";
  if (isCouncilSeat(e.id) || e.music === "battle_keeper") return "council";
  return "trainer";
}

export interface TrainerLocation {
  map: MapId;
  mapName: string;
  outdoor: boolean;
  /** sight: an NPC trainer who spots the player (and can be talked to); talk: an NPC with sight 0; script: a story battle. */
  how: "sight" | "talk" | "script";
  npcId?: string;
  x?: number;
  y?: number;
  facing?: Dir;
  /** Sight range in tiles (NPC trainers; the engine's default is 4). */
  sight?: number;
  /** The NPC's raw visibility condition, if any. */
  visibleWhen?: Cond;
  /** Conditions in words: the NPC's visibleWhen, or the script branches leading to the battle. */
  when: string[];
  /** For script battles: the script and who runs it ("ROWAN", "event", "on arrival"). */
  scriptId?: string;
  source?: string;
}

export interface StoryPlace {
  /** Index of the walkthrough section (play order). */
  index: number;
  part: string;
  sectionId: string;
  title: string;
}

export interface CatalogRow {
  id: string;
  kind: TrainerKind;
  /** The trainer's group: a rival's battle (`rival_2`) or its own id. */
  group: string;
  /** For a rival variant: the starter line in its id (BRAM's starter; the guide orders them by the player's). */
  variant: "oak" | "chili" | "lily" | null;
  councilSeat: boolean;
  rematchEligible: boolean;
  locations: TrainerLocation[];
  /** Maps it is fought on, in MAP_IDS order. */
  maps: MapId[];
  story: StoryPlace | null;
  /** Position in trainers.json. */
  order: number;
}

/** Every place a trainer is fought: NPC trainers (sight or talk) and every script battle, map by map. */
export function trainerLocations(world: WorldData, id: string, ctx: LabelContext = {}): TrainerLocation[] {
  const out: TrainerLocation[] = [];
  const seen = new Set<string>();
  for (const map of MAP_IDS) {
    const def = world.maps[map];
    if (!def) continue;
    for (const npc of def.npcs) {
      if (npc.trainer !== id) continue;
      const sight = npc.sight ?? 4;
      out.push({
        map, mapName: def.name, outdoor: def.outdoor, how: sight > 0 ? "sight" : "talk",
        npcId: npc.id, x: npc.x, y: npc.y, facing: npc.facing, sight,
        ...(npc.visibleWhen?.length ? { visibleWhen: npc.visibleWhen } : {}),
        when: npc.visibleWhen?.length ? [condLabel(npc.visibleWhen, ctx)] : [],
      });
    }
    for (const hit of mapScriptHits(world, def, ctx)) {
      if (hit.op.op !== "battle" || hit.op.trainer !== id) continue;
      const src = hit.source;
      const key = `${map}|${hit.scriptId}|${src.kind}|${src.kind === "npc" ? src.npc.id : src.kind === "trigger" ? `${src.x},${src.y}` : ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const at = src.kind === "npc" ? { npcId: src.npc.id, x: src.npc.x, y: src.npc.y, facing: src.npc.facing }
        : src.kind === "trigger" ? { x: src.x, y: src.y } : {};
      out.push({
        map, mapName: def.name, outdoor: def.outdoor, how: "script", ...at,
        ...(src.kind === "npc" && src.npc.visibleWhen?.length ? { visibleWhen: src.npc.visibleWhen } : {}),
        when: hit.when, scriptId: hit.scriptId, source: sourceLabel(src),
      });
    }
  }
  return out;
}

/**
 * Where the trainer sits in the story: the first walkthrough section with its
 * boss card, else the first map panel of one of its maps drawn in a story
 * state where the trainer stands there (its NPC's visibleWhen holds under the
 * panel's flags), else the first panel of one of its maps.
 */
export function storyPlace(sections: readonly Section[], id: string, group: string, locations: readonly TrainerLocation[]): StoryPlace | null {
  const place = (i: number): StoryPlace => ({ index: i, part: sections[i].part, sectionId: sections[i].id, title: sections[i].title });
  const boss = sections.findIndex((s) => s.blocks.some((b) => "boss" in b && (b.boss === id || b.boss === group)));
  if (boss >= 0) return place(boss);
  const maps = new Set(locations.map((l) => l.map));
  let first = -1;
  for (const [i, s] of sections.entries()) {
    for (const b of s.blocks) {
      if (!("map" in b) || !maps.has(b.map)) continue;
      if (first < 0) first = i;
      const conds = locations.filter((l) => l.map === b.map && l.visibleWhen).map((l) => l.visibleWhen!);
      if (!conds.length || conds.some((c) => checkFlags(c, b.flags ?? {}))) return place(i);
    }
  }
  return first >= 0 ? place(first) : null;
}

/** The walkthrough's parts in play order ("Prologue", "Chapter 1", ..., "Post-game"). */
export function storyParts(sections: readonly Section[]): string[] {
  return [...new Set(sections.map((s) => s.part))];
}

/** One row per trainers.json entry, in file order. */
export function buildCatalog(world: WorldData, entries: readonly TrainerEntry[], sections: readonly Section[],
  ctx: LabelContext = {}): CatalogRow[] {
  const trainers: Record<string, TrainerDef> = world.trainers;
  return entries.map((e, order) => {
    const locations = trainerLocations(world, e.id, ctx);
    const maps = MAP_IDS.filter((m) => locations.some((l) => l.map === m));
    const group = trainerGroup(e.id, trainers);
    const v = /_(oak|chili|lily)$/.exec(e.id);
    return {
      id: e.id, kind: trainerKind(e), group, variant: v ? (v[1] as "oak" | "chili" | "lily") : null,
      councilSeat: isCouncilSeat(e.id), rematchEligible: isRematchTrainer(world, e.id),
      locations, maps, story: storyPlace(sections, e.id, group, locations), order,
    };
  });
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface TrainerFilter {
  text?: string;
  map?: string;
  part?: string;
  className?: string;
  /** A kind, or "rematch" for route-rematch-eligible trainers. */
  kind?: TrainerKind | "rematch" | "";
  minLevel?: number | null;
  maxLevel?: number | null;
  /** Only trainers with unsaved edits. */
  edited?: boolean;
}

export interface FilterContext {
  entry: (id: string) => TrainerEntry;
  speciesName?: (id: string) => string;
  mapName?: (id: MapId) => string;
  edited?: (id: string) => boolean;
}

export const levelRange = (team: readonly { level: number }[]) =>
  ({ min: Math.min(...team.map((m) => m.level)), max: Math.max(...team.map((m) => m.level)) });

/** Rows matching every set filter, in story order (then file order). Text matches id, name, class, species and map names. */
export function filterCatalog(rows: readonly CatalogRow[], f: TrainerFilter, ctx: FilterContext): CatalogRow[] {
  const words = (f.text ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const out = rows.filter((r) => {
    const e = ctx.entry(r.id);
    if (f.map && !r.maps.includes(f.map as MapId)) return false;
    if (f.part && r.story?.part !== f.part) return false;
    if (f.className && e.className !== f.className) return false;
    if (f.kind === "rematch" ? !r.rematchEligible : f.kind && r.kind !== f.kind) return false;
    if (f.edited && !ctx.edited?.(r.id)) return false;
    const { min, max } = levelRange(e.team);
    if (typeof f.minLevel === "number" && max < f.minLevel) return false;
    if (typeof f.maxLevel === "number" && min > f.maxLevel) return false;
    if (!words.length) return true;
    const hay = [r.id, e.name, e.className, ...e.team.map((m) => `${m.species} ${ctx.speciesName?.(m.species) ?? ""}`),
      ...r.maps.map((m) => `${m} ${ctx.mapName?.(m) ?? ""}`)].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const rank = (r: CatalogRow) => r.story?.index ?? Number.MAX_SAFE_INTEGER;
  return out.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}
