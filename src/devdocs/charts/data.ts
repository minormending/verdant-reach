// Pure data for the developer-docs charts (CONTRACT.md § Charts). Every number
// comes from the game's own modules and formulas, so the charts can't drift
// from the build. Tested in data.test.ts against the real formulas.

import { MAP_IDS, TYPES, type GameData, type MapDef, type MapId, type Quickened, type ScriptCmd, type Species, type SpeciesId, type StatusId, type TypeId, type WorldData } from "../../contracts";
import { catchProbability, catchValue } from "../../battle/logic/capture";
import { calcDamage, newStages, typeEffectiveness } from "../../battle/logic/damage";
import { calcStats, trainerIvs } from "../../battle/logic/stats";
import { BUNDLE_KINDS, type ArtIndex, type BundleKind } from "../../art/format";
import { mapFinds } from "../../guide/indexer";
import type { Section } from "../../guide/types";
import type { SourceStats } from "./sourceStats";

const zero = () => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

// ---- exp-curves ----------------------------------------------------------

export const GROWTH_RATES = ["fast", "medium", "slow"] as const;
export type GrowthRate = (typeof GROWTH_RATES)[number];

export interface ExpSeries { rate: GrowthRate; species: number; points: { level: number; exp: number }[] }

/** Total EXP to reach each level 1..100 for every growth rate, via DATA.expForLevel. */
export function expCurves(data: GameData, maxLevel = 100): ExpSeries[] {
  const all = Object.values(data.species);
  return GROWTH_RATES.map((rate) => ({
    rate,
    species: all.filter((s) => s.growthRate === rate).length,
    points: Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, exp: data.expForLevel(rate, i + 1) })),
  }));
}

// ---- type-chart ----------------------------------------------------------

export interface TypeCell { atk: TypeId; def: TypeId; mult: number }

/** Every attacking type against every single defending type, via the battle's typeEffectiveness. */
export function typeMatrix(data: GameData): { types: TypeId[]; cells: TypeCell[] } {
  const types = [...TYPES];
  const cells: TypeCell[] = [];
  for (const atk of types) for (const def of types) cells.push({ atk, def, mult: typeEffectiveness(data.typeChart, atk, [def]) });
  return { types, cells };
}

// ---- catch-curve ---------------------------------------------------------

export interface CatchSeries {
  catchRate: number;
  status: StatusId | null;
  /** An example species with this catch rate. */
  example: string;
  points: { hpPct: number; p: number }[];
}

/** A low, a middle and a high catch rate from the species data (with an example each). */
export function sampleCatchRates(data: GameData): { rate: number; example: string }[] {
  const species = Object.values(data.species).sort((a, b) => a.catchRate - b.catchRate || a.id.localeCompare(b.id));
  const rates = [...new Set(species.map((s) => s.catchRate))];
  const picks = [...new Set([rates[0], rates[Math.floor((rates.length - 1) / 2)], rates[rates.length - 1]])];
  return picks.map((rate) => ({ rate, example: species.find((s) => s.catchRate === rate)!.name }));
}

/**
 * Catch probability with a Terrarium Pod (x1) at each remaining-HP percentage,
 * for sample catch rates, healthy and dormant. Uses catchValue + catchProbability.
 */
export function catchCurves(data: GameData, podMultiplier = 1, maxHp = 100): CatchSeries[] {
  const out: CatchSeries[] = [];
  for (const { rate, example } of sampleCatchRates(data)) {
    for (const status of [null, "dormant"] as const) {
      const points: { hpPct: number; p: number }[] = [];
      for (let pct = 100; pct >= 1; pct--) {
        const hp = Math.max(1, Math.round((maxHp * pct) / 100));
        const target = { stats: { ...zero(), hp: maxHp }, hp, status } as Quickened;
        points.push({ hpPct: pct, p: catchProbability(catchValue(target, rate, podMultiplier)) });
      }
      out.push({ catchRate: rate, status, example, points });
    }
  }
  return out;
}

// ---- damage-spread -------------------------------------------------------

export interface DamageScenario { label: string; stab: boolean; effectiveness: number; crit: boolean; damages: number[] }
export interface DamageSample {
  attacker: string;
  defender: string;
  move: string;
  moveType: TypeId;
  power: number;
  category: string;
  level: number;
  defenderHp: number;
  scenarios: DamageScenario[];
}

const ROLLS = Array.from({ length: 16 }, (_, i) => 85 + i);

/**
 * One sample attack through calcDamage at every random roll (85..100%): the
 * oak line's middle stage using its strongest same-type damaging move at
 * level 30 against a fixed defender, with the defender's types swapped to
 * show neutral, super-effective and resisted hits, with and without STAB and
 * a critical hit.
 */
export function damageSpread(data: GameData, level = 30): DamageSample {
  const species = Object.values(data.species).sort((a, b) => a.id.localeCompare(b.id));
  const attacker = species.find((s) => s.line === "oak" && s.stage === 2) ?? species.find((s) => s.stage === 2) ?? species[0];
  const moveType = attacker.types[0];
  const learnable = new Set(attacker.learnset.map((l) => l.move));
  const moves = Object.values(data.moves)
    .filter((m) => m.type === moveType && m.power > 0 && m.category !== "status" && !m.effects.some((e) => e.kind === "fixed_damage" || e.kind === "multi_hit"))
    .sort((a, b) => Number(learnable.has(b.id)) - Number(learnable.has(a.id)) || Math.abs(a.power - 60) - Math.abs(b.power - 60) || a.id.localeCompare(b.id));
  const move = moves[0];
  const mult = (t: TypeId) => typeEffectiveness(data.typeChart, moveType, [t]);
  const typeWith = (m: number) => TYPES.find((t) => mult(t) === m && t !== moveType) ?? TYPES.find((t) => mult(t) === m);
  const offType = TYPES.find((t) => t !== moveType && !attacker.types.includes(t))!;
  const defenderSp = species.find((s) => s.stage === 2 && s.types.length === 1 && mult(s.types[0]) === 1 && s.id !== attacker.id) ?? species[1];

  const ivs = trainerIvs();
  const quick = (id: SpeciesId, stats: Quickened["stats"]): Quickened => ({
    uid: id, species: id, level, exp: 0, hp: stats.hp, stats, ivs, evs: zero(), moves: [], status: null, friendship: 70, sport: false,
  });
  const aStats = calcStats(attacker, ivs, zero(), level);
  const dStats = calcStats(defenderSp, ivs, zero(), level);
  // Same stats, other types: the formula reads only the species' types (STAB, chart) and activity.
  const run = (label: string, atkTypes: TypeId[], defType: TypeId | undefined, crit: boolean): DamageScenario => {
    const d: GameData = {
      ...data,
      species: {
        ...data.species,
        [attacker.id]: { ...attacker, types: atkTypes as Species["types"], activity: "any" },
        [defenderSp.id]: { ...defenderSp, types: [defType ?? defenderSp.types[0]] },
      },
    };
    const hit = (roll: number) => calcDamage({
      data: d, attacker: quick(attacker.id, aStats), defender: quick(defenderSp.id, dStats),
      atkStages: newStages(), defStages: newStages(), move, weather: null, crit, roll,
    });
    const top = hit(100);
    return { label, stab: top.stab, effectiveness: top.effectiveness, crit, damages: ROLLS.map((r) => hit(r).damage) };
  };
  const neutral = defenderSp.types[0];
  return {
    attacker: attacker.name, defender: defenderSp.name, move: move.name, moveType, power: move.power, category: move.category,
    level, defenderHp: dStats.hp,
    scenarios: [
      run("No STAB, neutral", [offType], neutral, false),
      run("STAB, neutral", [moveType], neutral, false),
      run("STAB, super effective", [moveType], typeWith(2), false),
      run("STAB, resisted", [moveType], typeWith(0.5), false),
      run("STAB, neutral, critical", [moveType], neutral, true),
    ],
  };
}

// ---- base-stat-totals / species-by-type ----------------------------------

export interface SpeciesTotal { id: SpeciesId; name: string; stage: 1 | 2 | 3; types: TypeId[]; total: number }

export function baseStatTotals(data: GameData): SpeciesTotal[] {
  return Object.values(data.species)
    .map((s) => ({
      id: s.id, name: s.name, stage: s.stage, types: [...s.types],
      total: s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spa + s.baseStats.spd + s.baseStats.spe,
    }))
    .sort((a, b) => a.stage - b.stage || a.total - b.total || a.id.localeCompare(b.id));
}

export function speciesByType(data: GameData): { type: TypeId; primary: number; secondary: number }[] {
  const all = Object.values(data.species);
  return TYPES.map((type) => ({
    type,
    primary: all.filter((s) => s.types[0] === type).length,
    secondary: all.filter((s) => s.types[1] === type).length,
  }));
}

// ---- story order, level-curve --------------------------------------------

export interface StoryMap { map: MapId; part: string }

/** Maps in the order the guidebook's walkthrough first shows them, with their part ("Chapter 3"). */
export function storyMapOrder(sections: readonly Section[]): StoryMap[] {
  const seen = new Set<MapId>();
  const out: StoryMap[] = [];
  for (const s of sections) for (const b of s.blocks) {
    if ("map" in b && !seen.has(b.map)) { seen.add(b.map); out.push({ map: b.map, part: s.part }); }
  }
  return out;
}

export interface LevelPoint {
  map: MapId;
  name: string;
  part: string;
  /** Wild levels in the map's normal tables (every method), or null when there are none. */
  wild: { min: number; max: number } | null;
  /** Each story trainer fought on the map (rematches excluded): its highest level. */
  trainers: { id: string; name: string; max: number }[];
}

/** Wild and trainer levels along the story, for maps that have either. */
export function levelCurve(world: WorldData, data: GameData, order: readonly StoryMap[]): LevelPoint[] {
  const out: LevelPoint[] = [];
  for (const { map, part } of order) {
    const def = world.maps[map];
    if (!def) continue;
    const slots = [def.encounters?.grass, def.encounters?.bog, def.encounters?.water].flatMap((t) => t?.slots ?? []);
    const wild = slots.length ? { min: Math.min(...slots.map((s) => s.minLevel)), max: Math.max(...slots.map((s) => s.maxLevel)) } : null;
    const trainers: LevelPoint["trainers"] = [];
    for (const t of mapFinds(world, data, map).trainers) {
      const id = t.ids[0];
      const def = world.trainers[id];
      if (!def || /_rematch$/.test(id) || !def.team.length) continue;
      trainers.push({ id, name: `${def.className} ${def.name}`, max: Math.max(...def.team.map((m) => m.level)) });
    }
    if (wild || trainers.length) out.push({ map, name: def.name, part, wild, trainers });
  }
  return out;
}

// ---- map-sizes -----------------------------------------------------------

export interface MapSize { id: MapId; name: string; outdoor: boolean; w: number; h: number; area: number }

export function mapSizes(world: WorldData): MapSize[] {
  return Object.values(world.maps)
    .map((m) => {
      const h = m.tiles.length;
      const w = Math.max(0, ...m.tiles.map((r) => r.length));
      return { id: m.id, name: m.name, outdoor: m.outdoor, w, h, area: w * h };
    })
    .sort((a, b) => b.area - a.area || a.id.localeCompare(b.id));
}

// ---- scripts: walking ScriptCmd trees ------------------------------------

/** Visit every command, depth first, including those nested in branches (choice, yesno, if…, trade). */
export function walkCmds(cmds: readonly ScriptCmd[], visit: (c: ScriptCmd) => void): void {
  for (const c of cmds) {
    visit(c);
    for (const v of Object.values(c)) {
      if (!Array.isArray(v) || !v.length) continue;
      if (Array.isArray(v[0])) for (const b of v as ScriptCmd[][]) walkCmds(b, visit);
      else if (typeof v[0] === "object" && v[0] && "op" in v[0]) walkCmds(v as ScriptCmd[], visit);
    }
  }
}

/** The op names of the ScriptCmd union, read from src/contracts/world.ts source text. */
export function scriptOpsFromSource(worldTs: string): string[] {
  const start = worldTs.indexOf("export type ScriptCmd");
  if (start < 0) return [];
  const end = worldTs.indexOf("export interface", start);
  const body = worldTs.slice(start, end < 0 ? undefined : end).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return [...new Set([...body.matchAll(/\{\s*op:\s*"(\w+)"/g)].map((m) => m[1]))];
}

/** How often each ScriptCmd op appears across every script (unused ops count 0), most used first. */
export function scriptOps(world: WorldData, ops: readonly string[]): { op: string; count: number }[] {
  const counts = new Map<string, number>(ops.map((o) => [o, 0]));
  for (const cmds of Object.values(world.scripts)) walkCmds(cmds, (c) => counts.set(c.op, (counts.get(c.op) ?? 0) + 1));
  return [...counts].map(([op, count]) => ({ op, count })).sort((a, b) => b.count - a.count || a.op.localeCompare(b.op));
}

// ---- warp-graph ----------------------------------------------------------

export interface WarpNode { id: MapId; name: string; outdoor: boolean; part: string | null; hub: MapId }
export interface WarpEdge { a: MapId; b: MapId; count: number; scripted: boolean }

function mapScripts(def: MapDef): string[] {
  const ids = [...def.npcs.map((n) => n.script), ...def.triggers.map((t) => t.script), def.onEnter, def.onWhiteout];
  return ids.filter((s): s is string => !!s);
}

/**
 * Every map and every warp tile between maps (undirected, counted), plus
 * script warps (`warp` ops reachable from the map's NPCs, triggers and
 * onEnter/onWhiteout scripts, following `call`) as dashed edges.
 * Each indoor map is grouped under its nearest outdoor map (its hub).
 */
export function warpGraph(world: WorldData, order: readonly StoryMap[]): { nodes: WarpNode[]; edges: WarpEdge[] } {
  const part = new Map(order.map((o) => [o.map, o.part]));
  const ids = Object.keys(world.maps) as MapId[];
  const edges = new Map<string, WarpEdge>();
  const add = (x: MapId, y: MapId, scripted: boolean) => {
    if (x === y || !world.maps[y]) return;
    const [a, b] = x < y ? [x, y] : [y, x];
    const key = `${a}|${b}|${scripted ? "s" : "w"}`;
    const e = edges.get(key) ?? { a, b, count: 0, scripted };
    e.count++;
    edges.set(key, e);
  };
  for (const id of ids) {
    const def = world.maps[id];
    for (const w of def.warps) add(id, w.to, false);
    const seen = new Set<string>();
    const visit = (sid: string) => {
      if (seen.has(sid)) return;
      seen.add(sid);
      walkCmds(world.scripts[sid] ?? [], (c) => {
        if (c.op === "warp") add(id, c.to, true);
        else if (c.op === "call") visit(c.script);
      });
    };
    for (const s of mapScripts(def)) visit(s);
  }
  // Drop a scripted edge where a plain warp already joins the pair.
  for (const [k, e] of edges) if (e.scripted && edges.has(`${e.a}|${e.b}|w`)) edges.delete(k);

  const adj = new Map<MapId, MapId[]>(ids.map((i) => [i, []]));
  for (const e of edges.values()) { adj.get(e.a)!.push(e.b); adj.get(e.b)!.push(e.a); }
  const rank = (id: MapId) => {
    const i = order.findIndex((o) => o.map === id);
    return i >= 0 ? i : order.length + MAP_IDS.indexOf(id);
  };
  for (const list of adj.values()) list.sort((x, y) => rank(x) - rank(y));
  const hubOf = (id: MapId): MapId => {
    if (world.maps[id].outdoor) return id;
    // Breadth-first to the nearest outdoor map (earliest in the story on ties).
    const seen = new Set([id]);
    let frontier = [id];
    while (frontier.length) {
      const next: MapId[] = [];
      for (const f of frontier) for (const n of adj.get(f)!) {
        if (seen.has(n)) continue;
        if (world.maps[n].outdoor) return n;
        seen.add(n);
        next.push(n);
      }
      frontier = next.sort((x, y) => rank(x) - rank(y));
    }
    return id;
  };
  const nodes = ids
    .map((id) => ({ id, name: world.maps[id].name, outdoor: world.maps[id].outdoor, part: part.get(id) ?? null, hub: hubOf(id) }))
    .sort((x, y) => rank(x.id) - rank(y.id));
  return { nodes, edges: [...edges.values()].sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b) || Number(x.scripted) - Number(y.scripted)) };
}

// ---- graph layouts -------------------------------------------------------

export interface Placed { id: string; x: number; y: number; w: number; h: number }

export const WARP_LAYOUT = { cols: 6, nodeW: 132, nodeH: 24, gapX: 10, gapY: 8, cellPadX: 28, rowGap: 56, childCols: 2 } as const;

/**
 * Deterministic grid layout for the warp graph: hubs (outdoor maps, plus any
 * map with no way outdoors) in story order, snaking left-right then
 * right-left in rows of `cols`, so consecutive maps sit side by side; each
 * hub's indoor maps are stacked under it in two columns.
 */
export function layoutWarpGraph(nodes: readonly WarpNode[], L = WARP_LAYOUT): { placed: Placed[]; width: number; height: number; hubs: { id: string; part: string | null; x: number; y: number }[] } {
  const hubs = nodes.filter((n) => n.hub === n.id);
  const children = new Map<string, WarpNode[]>(hubs.map((h) => [h.id, []]));
  for (const n of nodes) if (n.hub !== n.id) children.get(n.hub)?.push(n);
  const cellW = L.childCols * L.nodeW + (L.childCols - 1) * L.gapX + L.cellPadX;
  const placed: Placed[] = [];
  const hubPos: { id: string; part: string | null; x: number; y: number }[] = [];
  let y = 24;
  for (let r = 0; r * L.cols < hubs.length; r++) {
    const row = hubs.slice(r * L.cols, (r + 1) * L.cols);
    let rowH = 0;
    row.forEach((hub, i) => {
      const col = r % 2 === 0 ? i : L.cols - 1 - i;
      const x0 = col * cellW + L.cellPadX / 2;
      const hx = x0 + (cellW - L.cellPadX - L.nodeW) / 2;
      placed.push({ id: hub.id, x: hx, y, w: L.nodeW, h: L.nodeH });
      hubPos.push({ id: hub.id, part: hub.part, x: hx + L.nodeW / 2, y });
      const kids = children.get(hub.id) ?? [];
      kids.forEach((k, j) => {
        const cx = x0 + (j % L.childCols) * (L.nodeW + L.gapX);
        const cy = y + L.nodeH + 18 + Math.floor(j / L.childCols) * (L.nodeH + L.gapY);
        placed.push({ id: k.id, x: cx, y: cy, w: L.nodeW, h: L.nodeH });
      });
      const h = L.nodeH + (kids.length ? 18 + Math.ceil(kids.length / L.childCols) * (L.nodeH + L.gapY) : 0);
      rowH = Math.max(rowH, h);
    });
    y += rowH + L.rowGap;
  }
  return { placed, width: L.cols * cellW, height: y - L.rowGap + 16, hubs: hubPos };
}

export interface ImportPair { from: string; to: string }
export interface ModuleNode { id: string; files: number; lines: number; layer: number; col: number }

/** Minimum columns in the module graph (more when a layer is wider). */
export const MODULE_COLS = 5;

/**
 * Layered layout for the folder import graph: a folder sits one layer above
 * the highest folder it imports (contracts at the bottom). Imports that close
 * a cycle are set aside greedily, weakest first: edges are added heaviest
 * first (ties by name) and skipped when they would close a cycle. Within a
 * layer, folders are ordered by the mean position of what they import.
 */
export function layoutModuleGraph(stats: SourceStats): { nodes: ModuleNode[]; layers: string[][]; back: ImportPair[]; cols: number } {
  const names = stats.folders.map((f) => f.folder).sort();
  const known = new Set(names);
  const dag = new Map<string, string[]>(names.map((n) => [n, []]));
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...dag.get(n)!);
    }
    return false;
  };
  const back: ImportPair[] = [];
  const edges = stats.edges.filter((e) => known.has(e.from) && known.has(e.to))
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  for (const e of edges) {
    if (reaches(e.to, e.from)) back.push({ from: e.from, to: e.to });
    else dag.get(e.from)!.push(e.to);
  }
  const out = dag;
  const layer = new Map<string, number>();
  const depth = (n: string): number => {
    const known = layer.get(n);
    if (known !== undefined) return known;
    const d = dag.get(n)!.length ? 1 + Math.max(...dag.get(n)!.map(depth)) : 0;
    layer.set(n, d);
    return d;
  };
  names.forEach(depth);
  const max = Math.max(0, ...layer.values());
  const layers: string[][] = Array.from({ length: max + 1 }, () => []);
  for (const n of names) layers[layer.get(n)!].push(n);
  // Order each layer above the bottom by the barycenter of its dependencies.
  const pos = new Map<string, number>();
  layers[0].forEach((n, i) => pos.set(n, i));
  for (let l = 1; l <= max; l++) {
    const bary = (n: string) => {
      const ds = out.get(n)!.filter((d) => pos.has(d));
      return ds.length ? ds.reduce((a, d) => a + pos.get(d)! / Math.max(1, layers[layer.get(d)!].length), 0) / ds.length : 0.5;
    };
    layers[l].sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
    layers[l].forEach((n, i) => pos.set(n, i));
  }
  // Columns: loosely near what a folder imports, but off the columns used by
  // the layers just below, so long edges don't run straight through nodes.
  const col = new Map<string, number>();
  const cols = Math.max(MODULE_COLS, ...layers.map((l) => l.length));
  const centre = (cols - 1) / 2;
  for (let l = 0; l <= max; l++) {
    const near = [1, 0.6, 0.3].map((wgt, k) => ({ wgt, used: new Set(l - 1 - k >= 0 ? layers[l - 1 - k].map((n) => col.get(n)!) : []) }));
    const used = new Set<number>();
    for (const n of layers[l]) {
      const deps = dag.get(n)!.filter((d) => col.has(d));
      const target = deps.length ? deps.reduce((a, d) => a + col.get(d)!, 0) / deps.length : centre;
      let best = -1, bestCost = Infinity;
      for (let c = 0; c < cols; c++) {
        if (used.has(c)) continue;
        const cost = 0.25 * Math.abs(c - target) + near.reduce((a, b) => a + (b.used.has(c) ? b.wgt : 0), 0) + Math.abs(c - centre) * 0.01;
        if (cost < bestCost - 1e-9) { best = c; bestCost = cost; }
      }
      used.add(best);
      col.set(n, best);
    }
  }
  const byName = new Map(stats.folders.map((f) => [f.folder, f]));
  return {
    nodes: names.map((n) => ({ id: n, files: byName.get(n)!.files, lines: byName.get(n)!.lines, layer: layer.get(n)!, col: col.get(n)! })),
    layers,
    back,
    cols,
  };
}

// ---- content-counts ------------------------------------------------------

export interface Count { label: string; value: number }

export function contentCounts(data: GameData, world: WorldData, stats?: SourceStats): { content: Count[]; tests: Count[] } {
  const maps = Object.values(world.maps);
  const content: Count[] = [
    { label: "Species", value: Object.keys(data.species).length },
    { label: "Moves", value: Object.keys(data.moves).length },
    { label: "Items", value: Object.keys(data.items).length },
    { label: "Maps", value: maps.length },
    { label: "Outdoor maps", value: maps.filter((m) => m.outdoor).length },
    { label: "Trainers", value: Object.keys(world.trainers).length },
    { label: "Scripts", value: Object.keys(world.scripts).length },
    { label: "Side quests", value: Object.keys(world.quests ?? {}).length },
  ];
  const tests = (stats?.folders ?? []).filter((f) => f.tests > 0).map((f) => ({ label: f.folder, value: f.tests })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return { content, tests };
}

// ---- bundle-kinds --------------------------------------------------------

export interface BundleKindRow { kind: BundleKind; base: number; packs: Record<string, number> }

/** Bundles per kind in the base tree, and how many each art pack overrides. */
export function bundleKinds(index: ArtIndex): { rows: BundleKindRow[]; packs: string[] } {
  const packs = Object.keys(index.packs ?? {}).sort();
  const rows = BUNDLE_KINDS.map((kind) => ({
    kind,
    base: Object.keys(index[kind] ?? {}).length,
    packs: Object.fromEntries(packs.map((p) => [p, Object.keys(index.packs[p]?.[kind] ?? {}).length])),
  }));
  return { rows, packs };
}
