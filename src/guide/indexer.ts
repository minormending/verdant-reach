// The guidebook's indexes: pure functions over the game's own WorldData and
// GameData (no DOM). A map panel asks `mapFinds` what lives on a map (wild
// encounters, items on the ground and hidden, trainers, and everything the
// map's scripts give, sell, trade or fight); the reference sections ask the
// reverse indexes (`speciesSources`, `itemSources`) where each thing is found.
// Unit-tested in indexer.test.ts.

import type {
  Cond, EncounterSlot, GameData, ItemId, MapDef, MapId, MoveId, NpcDef, ScriptCmd, SpeciesId, TrainerDef,
  WorldData,
} from "../contracts";
import { MAP_IDS } from "../contracts";
import { ROAMER_MAPS, WANDERER_LEVEL, WANDERERS } from "../overworld/roaming";
import { COUNTER, STARTER_LINES } from "../world/trainers";

// ---------------------------------------------------------------------------
// Wild encounters
// ---------------------------------------------------------------------------

export type Method = "grass" | "bog" | "water";
export const METHODS: readonly Method[] = ["grass", "bog", "water"];

export interface EncounterRow {
  species: SpeciesId;
  minLevel: number;
  maxLevel: number;
  time: "any" | "day" | "night";
  /** Chance among this method's encounters by day (morning and day) / at night, in %; null when absent. */
  dayPct: number | null;
  nightPct: number | null;
}

export interface EncounterTable {
  method: Method;
  /** % chance per step. */
  rate: number;
  rows: EncounterRow[];
}

export interface EncounterSet {
  /** null for the map's normal table; otherwise the condition that selects this variant. */
  when: Cond | null;
  label: string;
  tables: EncounterTable[];
}

const slotTime = (s: EncounterSlot) => s.time ?? "any";
const activeAt = (s: EncounterSlot, tod: "day" | "night") => slotTime(s) === "any" || slotTime(s) === tod;

/** Percentages from the weights, per time of day (morning shares the day slots, as in the engine). */
export function encounterRows(slots: readonly EncounterSlot[], forced?: "day" | "night"): EncounterRow[] {
  const total = (tod: "day" | "night") => slots.filter((s) => activeAt(s, tod) && s.weight > 0).reduce((n, s) => n + s.weight, 0);
  const day = total("day");
  const night = total("night");
  const pct = (s: EncounterSlot, tod: "day" | "night", sum: number) =>
    forced && forced !== tod ? null : activeAt(s, tod) && s.weight > 0 && sum > 0 ? round1((s.weight / sum) * 100) : null;
  // One row per species and level range: a plant listed separately by day and by night
  // reads as one row with both percentages.
  const rows: EncounterRow[] = [];
  for (const s of slots.filter((x) => x.weight > 0)) {
    const row: EncounterRow = {
      species: s.species, minLevel: Math.min(s.minLevel, s.maxLevel), maxLevel: Math.max(s.minLevel, s.maxLevel),
      time: slotTime(s), dayPct: pct(s, "day", day), nightPct: pct(s, "night", night),
    };
    const same = rows.find((r) => r.species === row.species && r.minLevel === row.minLevel && r.maxLevel === row.maxLevel);
    if (!same) { rows.push(row); continue; }
    const add = (a: number | null, b: number | null) => (a === null && b === null ? null : round1((a ?? 0) + (b ?? 0)));
    same.dayPct = add(same.dayPct, row.dayPct);
    same.nightPct = add(same.nightPct, row.nightPct);
    if (same.time !== row.time) same.time = same.dayPct !== null && same.nightPct !== null ? "any" : same.dayPct !== null ? "day" : "night";
  }
  return rows;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function tablesOf(enc: MapDef["encounters"], forced?: "day" | "night"): EncounterTable[] {
  const out: EncounterTable[] = [];
  for (const method of METHODS) {
    const t = enc?.[method];
    if (!t || t.rate <= 0 || !t.slots.some((s) => s.weight > 0)) continue;
    out.push({ method, rate: t.rate, rows: encounterRows(t.slots, forced) });
  }
  return out;
}

/** The time a map forces, folded to the encounter clock (morning counts as day). */
export function forcedTime(def: MapDef): "day" | "night" | undefined {
  return def.time ? (def.time === "night" ? "night" : "day") : undefined;
}

/** The map's normal encounter tables, then each `encountersWhen` variant, labelled by its condition. */
export function encounterSets(def: MapDef, ctx: LabelContext = {}): EncounterSet[] {
  const forced = forcedTime(def);
  const sets: EncounterSet[] = [];
  const base = tablesOf(def.encounters, forced);
  const variants = def.encountersWhen ?? [];
  if (base.length) sets.push({ when: null, label: variants.length ? "Normally" : "", tables: base });
  for (const v of variants) {
    const tables = tablesOf(v.encounters, forced);
    sets.push({ when: v.when, label: condLabel(v.when, ctx), tables });
  }
  return sets.filter((s) => s.tables.length || s.when);
}

/** Which encounter set the engine uses for these flags (first matching variant, else the normal table). */
export function activeEncounterSet(def: MapDef, flags: Record<string, boolean>): Cond | null {
  return def.encountersWhen?.find((e) => checkFlags(e.when, flags))?.when ?? null;
}

export function checkFlags(cond: Cond | undefined, flags: Record<string, boolean>): boolean {
  return !cond || cond.every((c) => (flags[c.flag] ?? false) === c.is);
}

// ---------------------------------------------------------------------------
// Condition labels
// ---------------------------------------------------------------------------

export interface LabelContext {
  trainers?: Record<string, TrainerDef>;
  items?: GameData["items"];
  species?: GameData["species"];
}

const NAMED_FLAGS: Record<string, [string, string]> = {
  game_cleared: ["after the credits", "before the credits"],
};

export const trainerLabel = (t: TrainerDef) => `${t.className} ${t.name}`;

/** One condition entry in plain words, e.g. "after beating WARDEN HOLLIS". */
export function flagLabel(flag: string, is: boolean, ctx: LabelContext = {}): string {
  const named = NAMED_FLAGS[flag];
  if (named) return is ? named[0] : named[1];
  const beat = /^beat_(.+)$/.exec(flag);
  if (beat) {
    const t = ctx.trainers?.[beat[1]] ?? ctx.trainers?.[`${beat[1]}_oak`];
    const who = t ? trainerLabel(t) : beat[1].replace(/_/g, " ").toUpperCase();
    return `${is ? "after" : "before"} beating ${who}`;
  }
  const words = flag.replace(/_/g, " ");
  return is ? words : `not yet: ${words}`;
}

export function condLabel(cond: Cond | undefined, ctx: LabelContext = {}): string {
  if (!cond?.length) return "";
  return cond.map((c) => flagLabel(c.flag, c.is, ctx)).join(", ");
}

// ---------------------------------------------------------------------------
// Scripts reachable from a map
// ---------------------------------------------------------------------------

/** Where a script runs from on its map. */
export type ScriptSource =
  | { kind: "npc"; npc: NpcDef }
  | { kind: "trigger"; x: number; y: number }
  | { kind: "onEnter" }
  | { kind: "onWhiteout" };

export interface ScriptHit {
  op: ScriptCmd;
  source: ScriptSource;
  scriptId: string;
  /** Branch conditions on the way to the op, in words (outermost first). */
  when: string[];
}

/** Child op lists of a command with a label for each branch. */
function branches(op: ScriptCmd, ctx: LabelContext): { cmds: ScriptCmd[]; label: string | null }[] {
  const itemName = (id: ItemId) => ctx.items?.[id]?.name?.toUpperCase() ?? id;
  const spName = (ids: SpeciesId | SpeciesId[]) =>
    (Array.isArray(ids) ? ids : [ids]).map((id) => ctx.species?.[id]?.name?.toUpperCase() ?? id).join(" or ");
  switch (op.op) {
    case "if": {
      // "Not yet done" story flags mostly mean "the first time": they stay out of the labels.
      const said = (c: Cond[number]) => c.is || NAMED_FLAGS[c.flag] !== undefined || /^beat_/.test(c.flag);
      const then = op.when.filter(said);
      const one = op.when.length === 1 ? { flag: op.when[0].flag, is: !op.when[0].is } : null;
      return [
        { cmds: op.then, label: then.length ? condLabel(then, ctx) : null },
        { cmds: op.else ?? [], label: one && said(one) ? flagLabel(one.flag, one.is, ctx) : null },
      ];
    }
    case "ifTime":
      return [{ cmds: op.then, label: `${op.time.join("/")} only` }, { cmds: op.else ?? [], label: `not ${op.time.join("/")}` }];
    case "ifHasItem":
      return [{ cmds: op.then, label: `with ${itemName(op.item)}` }, { cmds: op.else ?? [], label: `without ${itemName(op.item)}` }];
    case "ifMarks":
      return [{ cmds: op.then, label: `with ${op.marks.length} marks` }, { cmds: op.else ?? [], label: `without ${op.marks.length} marks` }];
    case "ifPartyHas":
      return [{ cmds: op.then, label: `with ${spName(op.species)} in party` }, { cmds: op.else ?? [], label: null }];
    case "ifCaught":
      return [{ cmds: op.then, label: `once ${spName(op.species)} is caught` }, { cmds: op.else ?? [], label: null }];
    case "ifCaughtCount":
      return [{ cmds: op.then, label: `with ${op.atLeast}+ caught` }, { cmds: op.else ?? [], label: `under ${op.atLeast} caught` }];
    case "ifLastBattle":
      return [{ cmds: op.then, label: `if the battle ended: ${op.result}` }, { cmds: op.else ?? [], label: null }];
    case "ifNurserySeed":
      return [{ cmds: op.then, label: null }, { cmds: op.else ?? [], label: null }];
    case "yesno":
      return [{ cmds: op.yes, label: null }, { cmds: op.no, label: null }];
    case "choice":
      return op.branches.map((cmds) => ({ cmds, label: null }));
    case "trade":
      return [{ cmds: op.then ?? [], label: null }, { cmds: op.else ?? [], label: null }];
    default:
      return [];
  }
}

/** Every op reachable from a script (following `call`s and every branch). */
export function walkScript(
  world: Pick<WorldData, "scripts">, scriptId: string, visit: (op: ScriptCmd, when: string[], scriptId: string) => void,
  ctx: LabelContext = {},
): void {
  const seen = new Set<string>();
  const run = (id: string, when: string[]) => {
    if (seen.has(id)) return;
    seen.add(id);
    const cmds = world.scripts[id];
    if (!cmds) return;
    const walk = (list: ScriptCmd[], w: string[]) => {
      for (const op of list) {
        visit(op, w, id);
        if (op.op === "call") run(op.script, w);
        for (const b of branches(op, ctx)) if (b.cmds.length) walk(b.cmds, b.label ? [...w, b.label] : w);
      }
    };
    walk(cmds, when);
  };
  run(scriptId, []);
}

/** Every op reachable from a map's NPC talk scripts, triggers, onEnter and onWhiteout. */
export function mapScriptHits(world: Pick<WorldData, "scripts">, def: MapDef, ctx: LabelContext = {}): ScriptHit[] {
  const hits: ScriptHit[] = [];
  const from = (scriptId: string | undefined, source: ScriptSource) => {
    if (!scriptId) return;
    walkScript(world, scriptId, (op, when, sid) => hits.push({ op, source, scriptId: sid, when }), ctx);
  };
  for (const npc of def.npcs) from(npc.script, { kind: "npc", npc });
  for (const t of def.triggers) from(t.script, { kind: "trigger", x: t.x, y: t.y });
  from(def.onEnter, { kind: "onEnter" });
  from(def.onWhiteout, { kind: "onWhiteout" });
  return hits;
}

// ---------------------------------------------------------------------------
// What a map holds
// ---------------------------------------------------------------------------

/** The item a script-less `item_pickup` NPC gives (the engine's rule, src/overworld/index.ts pickup()). */
export function pickupItemId(npcId: string, items: Record<string, unknown>): ItemId | null {
  const raw = npcId.replace(/^item[_:-]?/, "");
  const candidates = [npcId, raw, raw.replace(/[_-]\d+$/, ""), raw.split(":").pop() ?? raw];
  return candidates.find((c) => c in items) ?? null;
}

export interface MapItem {
  /** Marker number on the map picture (shared numbering for ground, hidden and bushes). */
  n: number;
  kind: "ground" | "hidden" | "bush";
  item: ItemId;
  qty: number;
  x: number;
  y: number;
  /** Condition for the pickup to appear (NPC visibleWhen), in words. */
  when?: string;
}

export interface MapTrainer {
  /** Marker number; null when the battle has no fixed spot (a scripted fight). */
  n: number | null;
  /** The trainer ids fought here under one entry: the rival's starter variants share one. */
  ids: string[];
  x?: number;
  y?: number;
  /** Fought from a script rather than a trainer's line of sight. */
  scripted: boolean;
  when: string[];
}

export interface Gift { species: SpeciesId; level: number; moves?: MoveId[]; from: string; when: string[] }
export interface ItemGift { item: ItemId; qty: number; from: string; when: string[] }
export interface Shop { stock: ItemId[]; from: string; when: string[] }
export interface Trade { wants: SpeciesId[]; gives: { species: SpeciesId; level: number; nickname?: string }; from: string; when: string[] }
export interface StaticBattle { species: SpeciesId; level: number; sport?: boolean; from: string; when: string[] }

export interface MapFinds {
  map: MapId;
  encounters: EncounterSet[];
  items: MapItem[];
  trainers: MapTrainer[];
  gifts: Gift[];
  itemGifts: ItemGift[];
  shops: Shop[];
  trades: Trade[];
  statics: StaticBattle[];
  /** Side quests that start on this map. */
  quests: string[];
}

/** A display name for whoever runs a script. */
export function sourceLabel(src: ScriptSource): string {
  if (src.kind === "npc") return src.npc.id.replace(/^bush:/, "").replace(/[_:]+/g, " ").toUpperCase();
  if (src.kind === "trigger") return "event";
  return src.kind === "onEnter" ? "on arrival" : "after a whiteout";
}

/** The rival's three starter variants (`rival_2_oak` / `_chili` / `_lily`) and a post-game
 *  `<id>_rematch` group under one id. */
export const STARTER_SUFFIX = /_(oak|chili|lily)$/;
const STARTERS = ["oak", "chili", "lily"] as const;
export function trainerGroup(id: string, trainers: Record<string, TrainerDef>): string {
  let base = id;
  const re = /^(.+)_rematch$/.exec(base);
  if (re && (trainers[re[1]] || STARTERS.every((l) => trainers[`${re[1]}_${l}`]))) base = re[1];
  if (!STARTER_SUFFIX.test(base)) return base;
  const root = base.replace(STARTER_SUFFIX, "");
  return STARTERS.every((l) => trainers[`${root}_${l}`]) ? root : base;
}
/** A group's trainer ids: the trainer itself or its three starter variants (in the order of the
 *  player's choice: BRAM answers OAK with CHILI, and so on), then any rematches. */
export function groupMembers(group: string, trainers: Record<string, TrainerDef>): string[] {
  const main = trainers[group] ? [group] : STARTER_LINES.map((l) => `${group}_${COUNTER[l]}`).filter((id) => trainers[id]);
  return [...main, ...main.map((id) => `${id}_rematch`).filter((id) => trainers[id])];
}
/** The player's starter line a rival variant answers (BRAM picks the line strong against yours). */
export function starterVariant(id: string): "oak" | "chili" | "lily" | null {
  const m = STARTER_SUFFIX.exec(id.replace(/_rematch$/, ""));
  return m ? (m[1] as "oak" | "chili" | "lily") : null;
}

const uniq = <T>(list: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>();
  return list.filter((t) => { const k = key(t); if (seen.has(k)) return false; seen.add(k); return true; });
};

export function mapFinds(world: WorldData, data: GameData, id: MapId): MapFinds {
  const def = world.maps[id];
  const ctx: LabelContext = { trainers: world.trainers, items: data.items, species: data.species };
  const hits = mapScriptHits(world, def, ctx);
  const items: MapItem[] = [];
  let n = 0;
  for (const npc of def.npcs) {
    const when = npc.visibleWhen?.length ? condLabel(npc.visibleWhen, ctx) : undefined;
    if (npc.sprite === "item_pickup") {
      if (npc.script) {
        const gives: ItemGift[] = [];
        walkScript(world, npc.script, (op) => { if (op.op === "giveItem") gives.push({ item: op.item, qty: op.qty ?? 1, from: "", when: [] }); }, ctx);
        for (const g of gives) items.push({ n: ++n, kind: "ground", item: g.item, qty: g.qty, x: npc.x, y: npc.y, when });
      } else {
        const item = pickupItemId(npc.id, data.items);
        if (item) items.push({ n: ++n, kind: "ground", item, qty: 1, x: npc.x, y: npc.y, when });
      }
    } else if (npc.sprite === "harvest_bush" && npc.script) {
      walkScript(world, npc.script, (op) => {
        if (op.op === "harvest") items.push({ n: ++n, kind: "bush", item: op.item, qty: op.qty ?? 1, x: npc.x, y: npc.y, when });
      }, ctx);
    }
  }
  for (const h of def.hidden ?? []) items.push({ n: ++n, kind: "hidden", item: h.item, qty: h.qty ?? 1, x: h.x, y: h.y });

  const trainers: MapTrainer[] = [];
  const byGroup = new Map<string, MapTrainer>();
  const rank = { npc: 2, trigger: 1, none: 0 } as const;
  const posRank = new Map<MapTrainer, number>();
  const addTrainer = (tid: string, at: { x: number; y: number } | null, how: keyof typeof rank, scripted: boolean, when: string[]) => {
    if (!world.trainers[tid]) return;
    const group = trainerGroup(tid, world.trainers);
    const prev = byGroup.get(group);
    if (prev) {
      if (!prev.ids.includes(tid)) prev.ids.push(tid);
      if (at && rank[how] > (posRank.get(prev) ?? 0)) { prev.x = at.x; prev.y = at.y; posRank.set(prev, rank[how]); }
      return;
    }
    const t: MapTrainer = { n: null, ids: [tid], scripted, when, ...(at ? { x: at.x, y: at.y } : {}) };
    posRank.set(t, at ? rank[how] : 0);
    byGroup.set(group, t);
    trainers.push(t);
  };
  for (const npc of def.npcs) {
    if (npc.trainer) addTrainer(npc.trainer, npc, "npc", false, npc.visibleWhen?.length ? [condLabel(npc.visibleWhen, ctx)] : []);
  }
  for (const h of hits) {
    if (h.op.op !== "battle") continue;
    const src = h.source;
    addTrainer(h.op.trainer, src.kind === "npc" ? src.npc : src.kind === "trigger" ? src : null,
      src.kind === "npc" ? "npc" : src.kind === "trigger" ? "trigger" : "none", true, h.when);
  }
  // Order the variants as in the trainer list (oak, chili, lily).
  for (const t of trainers) {
    const g = trainerGroup(t.ids[0], world.trainers);
    const members = groupMembers(g, world.trainers);
    t.ids.sort((a, b) => members.indexOf(a) - members.indexOf(b));
  }
  let tn = 0;
  for (const t of trainers) if (t.x !== undefined) t.n = ++tn;

  const gifts: Gift[] = [];
  const itemGifts: ItemGift[] = [];
  const shops: Shop[] = [];
  const trades: Trade[] = [];
  const statics: StaticBattle[] = [];
  const quests: string[] = [];
  for (const h of hits) {
    const from = sourceLabel(h.source);
    const op = h.op;
    if (h.source.kind === "npc" && (h.source.npc.sprite === "item_pickup" || h.source.npc.sprite === "harvest_bush")) continue;
    if (op.op === "giveSpecies") gifts.push({ species: op.species, level: op.level, moves: op.moves, from, when: h.when });
    else if (op.op === "giveItem") itemGifts.push({ item: op.item, qty: op.qty ?? 1, from, when: h.when });
    else if (op.op === "shop") shops.push({ stock: op.stock, from, when: h.when });
    else if (op.op === "trade") trades.push({ wants: op.wants, gives: op.gives, from, when: h.when });
    else if (op.op === "wildBattle") statics.push({ species: op.species, level: op.level, sport: op.sport, from, when: h.when });
    else if (op.op === "startQuest") quests.push(op.quest);
  }
  for (const q of Object.values(world.quests ?? {})) if (q.area === id && !quests.includes(q.id)) quests.push(q.id);

  return {
    map: id,
    encounters: encounterSets(def, ctx),
    items,
    trainers,
    gifts: uniq(gifts, (g) => `${g.species}|${g.level}|${g.from}`),
    itemGifts: uniq(itemGifts, (g) => `${g.item}|${g.qty}|${g.from}`),
    shops: uniq(shops, (s) => `${s.stock.join(",")}|${s.from}`),
    trades: uniq(trades, (t) => `${t.wants.join(",")}>${t.gives.species}|${t.from}`),
    statics: uniq(statics, (s) => `${s.species}|${s.level}|${s.from}`),
    quests: uniq(quests, (q) => q),
  };
}

/** True when a map has something a walkthrough must cover: wild encounters, trainers or items. */
export function mapHasContent(f: MapFinds): boolean {
  return f.encounters.some((s) => s.tables.length > 0) || f.trainers.length > 0 || f.items.some((i) => i.kind !== "bush");
}

/** Every map's finds, in MAP_IDS order. */
export function allMapFinds(world: WorldData, data: GameData): MapFinds[] {
  return MAP_IDS.filter((id) => world.maps[id]).map((id) => mapFinds(world, data, id));
}

// ---------------------------------------------------------------------------
// Reverse indexes
// ---------------------------------------------------------------------------

export type SpeciesSourceKind = Method | "gift" | "trade" | "static" | "roaming";

export interface SpeciesSource {
  map: MapId;
  kind: SpeciesSourceKind;
  minLevel: number;
  maxLevel: number;
  /** For wild encounters: "any", "day" or "night". */
  time?: "any" | "day" | "night";
  /** % (best of day/night) for wild encounters. */
  pct?: number;
  /** The encounter variant's or script branch's condition, in words. */
  when?: string;
}

/**
 * The post-game Wanderers (src/overworld/roaming.ts): the tumbleweed and the coconut roam their
 * maps; the burr hitches a ride behind you on any outdoor route.
 */
export function wandererSources(world: Pick<WorldData, "maps">): { species: SpeciesId; source: SpeciesSource }[] {
  const out: { species: SpeciesId; source: SpeciesSource }[] = [];
  const when = flagLabel("game_cleared", true);
  for (const id of WANDERERS) {
    const maps: MapId[] = id === "burr"
      ? MAP_IDS.filter((m) => /^route_\d+$/.test(m) && world.maps[m]?.outdoor)
      : [...ROAMER_MAPS[id]];
    for (const map of maps) out.push({ species: id, source: { map, kind: "roaming", minLevel: WANDERER_LEVEL, maxLevel: WANDERER_LEVEL, when } });
  }
  return out;
}

/** Where each species can be found: wild tables (every variant), gifts, trades, static battles and Wanderers. */
export function speciesSources(
  finds: readonly MapFinds[], extra: readonly { species: SpeciesId; source: SpeciesSource }[] = [],
): Map<SpeciesId, SpeciesSource[]> {
  const out = new Map<SpeciesId, SpeciesSource[]>();
  const add = (id: SpeciesId, s: SpeciesSource) => {
    const list = out.get(id) ?? [];
    const dup = list.find((o) => o.map === s.map && o.kind === s.kind && o.when === s.when && o.time === s.time);
    if (dup) {
      dup.minLevel = Math.min(dup.minLevel, s.minLevel);
      dup.maxLevel = Math.max(dup.maxLevel, s.maxLevel);
      if (s.pct !== undefined) dup.pct = round1((dup.pct ?? 0) + s.pct);
      return;
    }
    list.push(s);
    out.set(id, list);
  };
  for (const f of finds) {
    for (const set of f.encounters) {
      for (const t of set.tables) {
        for (const r of t.rows) {
          add(r.species, {
            map: f.map, kind: t.method, minLevel: r.minLevel, maxLevel: r.maxLevel, time: r.time,
            pct: Math.max(r.dayPct ?? 0, r.nightPct ?? 0), ...(set.when ? { when: set.label } : {}),
          });
        }
      }
    }
    for (const g of f.gifts) add(g.species, { map: f.map, kind: "gift", minLevel: g.level, maxLevel: g.level, ...(g.when.length ? { when: g.when.join("; ") } : {}) });
    for (const t of f.trades) add(t.gives.species, { map: f.map, kind: "trade", minLevel: t.gives.level, maxLevel: t.gives.level });
    for (const s of f.statics) add(s.species, { map: f.map, kind: "static", minLevel: s.level, maxLevel: s.level, ...(s.when.length ? { when: s.when.join("; ") } : {}) });
  }
  for (const e of extra) add(e.species, e.source);
  return out;
}

export type ItemSourceKind = "ground" | "hidden" | "bush" | "shop" | "gift";
export interface ItemSource { map: MapId; kind: ItemSourceKind; qty: number; n?: number }

/** Where each item is found: on the ground, hidden, from berry bushes, sold, or given. */
export function itemSources(finds: readonly MapFinds[]): Map<ItemId, ItemSource[]> {
  const out = new Map<ItemId, ItemSource[]>();
  const add = (id: ItemId, s: ItemSource) => {
    const list = out.get(id) ?? [];
    const dup = list.find((o) => o.map === s.map && o.kind === s.kind);
    if (dup) { if (s.kind !== "shop") dup.qty += s.qty; }
    else list.push({ ...s });
    out.set(id, list);
  };
  for (const f of finds) {
    for (const i of f.items) add(i.item, { map: f.map, kind: i.kind, qty: i.qty, n: i.n });
    for (const s of f.shops) for (const item of s.stock) add(item, { map: f.map, kind: "shop", qty: 0 });
    for (const g of f.itemGifts) add(g.item, { map: f.map, kind: "gift", qty: g.qty });
  }
  return out;
}

/** The species a species grows from (its previous stage), if any. */
export function grownFrom(data: GameData, id: SpeciesId): SpeciesId | null {
  for (const s of Object.values(data.species)) if (s.growsInto?.species === id) return s.id;
  return null;
}

/** Every species whose learnset has a move. */
export function learnedBy(data: GameData): Map<MoveId, { species: SpeciesId; level: number }[]> {
  const out = new Map<MoveId, { species: SpeciesId; level: number }[]>();
  for (const s of Object.values(data.species)) {
    for (const e of s.learnset) {
      const list = out.get(e.move) ?? [];
      if (!list.some((x) => x.species === s.id)) list.push({ species: s.id, level: e.level });
      out.set(e.move, list);
    }
  }
  return out;
}

/** Trainers grouped by the map they are fought on, in MAP_IDS order (only maps with trainers). */
export function trainersByMap(finds: readonly MapFinds[]): { map: MapId; trainers: MapTrainer[] }[] {
  return finds.filter((f) => f.trainers.length).map((f) => ({ map: f.map, trainers: f.trainers }));
}
