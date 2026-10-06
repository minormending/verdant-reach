// Pure checks over WorldData: geometry, references, reachability and text fit.
// Used by world.test.ts and by the ?dev=world overview.

import {
  FIELD_MOVES, JINGLES, MAP_IDS, MARKS, MUSIC, REQUIRED_ITEMS, SFX, SPECIES_IDS, STILLS, STRUCTURES, TILES, TEXTBOX,
} from "../contracts";
import type { Ambient, Cond, MapDef, MapId, NpcDef, ScriptCmd, TileKey, TileProps, WorldData } from "../contracts";
import { pickupItem } from "./build";
import { DATA } from "../data";
import { glowField, glowLamps } from "../overworld/glow";
import { buildMap } from "../overworld/map";
import { reachableBoulderTiles } from "../overworld/uproot";

/**
 * Side-quest givers (docs/ROUND3.md §4). Narrative writes the `q_*` scripts in
 * src/world/scripts/quests.ts; the maps place these NPCs with exactly these ids
 * and script ids. Until a script exists the validator only warns.
 */
export const QUEST_GIVERS: { quest: string; map: MapId; npc: string; script: string }[] = [
  { quest: "seed_library", map: "fallowfield", npc: "librarian", script: "q_seed_library" },
  { quest: "lost_cat", map: "hedgerow", npc: "cottager", script: "q_lost_cat" },
  { quest: "lost_cat", map: "route_2", npc: "moss", script: "q_lost_cat_moss" },
  { quest: "florists_order", map: "bramblegate", npc: "marigold", script: "q_florists_order" },
  { quest: "moonwatch", map: "route_3", npc: "stargazer", script: "q_moonwatch" },
  { quest: "sap_run", map: "sugarbush", npc: "syrupmaker", script: "q_sap_run" },
  { quest: "sap_run", map: "hedgerow", npc: "baker", script: "q_sap_run_baker" },
  { quest: "herbarium_survey", map: "herbarium", npc: "archivist", script: "q_herbarium_survey" },
  { quest: "fire_followers", map: "cedarhallow_house", npc: "ranger", script: "q_fire_followers" },
  { quest: "shrine_offerings", map: "cedar_hollow", npc: "shrine_keeper", script: "ch5_shrine_keeper" },
  // Chapter 4 (docs/ROUND4.md §1.4)
  { quest: "relay_sensors", map: "glasshouse_relay", npc: "wren", script: "q_relay_sensors" },
  { quest: "first_seed", map: "glasshouse_nursery", npc: "nursery_keeper_b", script: "q_first_seed" },
  { quest: "fan_mail", map: "glasshouse_city", npc: "fan", script: "q_fan_mail" },
];
const QUEST_SCRIPTS = new Set(QUEST_GIVERS.map((q) => q.script));

/** Harvest bushes are NPCs `bush:<harvestId>` with the harvest_bush sprite. */
export const harvestId = (n: NpcDef): string | undefined =>
  n.sprite === "harvest_bush" && n.id.startsWith("bush:") ? n.id.slice("bush:".length) : undefined;

/** NPCs that are set dressing for a system, never gatekeepers: they must not
 *  block any path (bushes, quest givers, and quest-only appearances). */
export const mustNotBlock = (n: NpcDef): boolean =>
  n.sprite === "harvest_bush" || isBoarder(n) || QUEST_SCRIPTS.has(n.script ?? "") || !!n.visibleWhen?.some((c) => c.flag.startsWith("quest_"));

/** Nursery boarders: the engine draws a boarder's icon on `boarder_<n>` and handles talking. */
export const isBoarder = (n: NpcDef): boolean => /^boarder_\d+$/.test(n.id);

/**
 * PRUNE (docs/ROUND4.md §2.1). Bramble tiles block until the player holds the
 * PRUNING SHEARS. Maps listed here are optional loops gated by brambles: their
 * NPCs and items may sit beyond a bramble. Everywhere else, every warp,
 * trigger, sign and NPC (bar item pickups and bushes) must be reachable
 * without PRUNE, so the story never needs it.
 */
export const PRUNE_OPTIONAL_MAPS: MapId[] = ["route_5"];
export const prunable = (t: TileKey | undefined): boolean => !!t && (TILES[t] as { fieldMove?: string }).fieldMove === "prune";

/** Every `Ambient` value (src/contracts/world.ts). Kept exhaustive by the type. */
const AMBIENT_VALUES: Record<Ambient, true> = { none: true, pollen: true, leaves: true, fireflies: true, rain: true, mist: true, spores: true };
const AMBIENTS = new Set<string>(Object.keys(AMBIENT_VALUES));

export interface Grid {
  w: number;
  h: number;
  tile(x: number, y: number): TileKey | undefined;
  /** Solid because of a structure footprint (doors excluded). */
  structureSolid(x: number, y: number): boolean;
  doors: { x: number; y: number; key: string }[];
  /** Water is traversable only after the LILY RAFT is obtainable. */
  rafting?: boolean;
}

/** The map's walk grid. With `pruned`, every prunable tile reads as a cut stump
 *  (the world once the PRUNING SHEARS are in hand). */
export function grid(map: MapDef, opts: { pruned?: boolean; rafting?: boolean } = {}): Grid {
  const h = map.tiles.length;
  const w = map.tiles[0]?.length ?? 0;
  const solid = new Set<string>();
  const doors: Grid["doors"] = [];
  for (const s of map.structures) {
    const def = STRUCTURES[s.key];
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        if (def.door && dx === def.door.x && dy === def.door.y) continue;
        solid.add(`${s.x + dx},${s.y + dy}`);
      }
    }
    if (def.door) doors.push({ x: s.x + def.door.x, y: s.y + def.door.y, key: s.key });
  }
  return {
    w, h, doors, rafting: opts.rafting,
    tile(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return undefined;
      const t = map.legend[map.tiles[y][x]];
      return opts.pruned && prunable(t) ? "bramble_stump" : t;
    },
    structureSolid: (x, y) => solid.has(`${x},${y}`),
  };
}

const waterTile = (t: TileKey | undefined): boolean => !!t && !!(TILES[t] as TileProps).water;
/** A water step keeps the raft; walking onto a structure door dismounts. */
const raftTile = (g: Grid, x: number, y: number): boolean =>
  waterTile(g.tile(x, y)) && !g.doors.some((d) => d.x === x && d.y === y);

export function walkable(g: Grid, x: number, y: number): boolean {
  const t = g.tile(x, y);
  if (!t) return false;
  return (TILES[t].walk || (!!g.rafting && waterTile(t))) && !g.structureSolid(x, y);
}

const DIRS = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
] as const;

/** Tiles reachable from `starts`, honouring one-way ledges and ignoring NPCs. */
export function flood(g: Grid, starts: { x: number; y: number }[]): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  for (const s of starts) {
    if (walkable(g, s.x, s.y) && !seen.has(`${s.x},${s.y}`)) {
      seen.add(`${s.x},${s.y}`);
      queue.push([s.x, s.y]);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of DIRS) {
      let nx = x + dx;
      let ny = y + dy;
      const t = g.tile(nx, ny);
      if (t === "ledge_down") {
        const from = g.tile(x, y);
        if (dy !== 1 || (g.rafting && waterTile(from))) continue;
        ny += 1; // hop over
      }
      if (!walkable(g, nx, ny)) continue;
      const k = `${nx},${ny}`;
      if (!seen.has(k)) { seen.add(k); queue.push([nx, ny]); }
    }
  }
  return seen;
}

/** Tiles from which some `target` is reachable: `flood` run backwards (ledge hops included),
 *  so a soft-lock check is one pass instead of a flood from every tile. */
export function canReach(g: Grid, targets: { x: number; y: number }[]): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  const visit = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (!seen.has(k) && walkable(g, x, y)) { seen.add(k); queue.push([x, y]); }
  };
  for (const t of targets) visit(t.x, t.y);
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of DIRS) visit(x - dx, y - dy);       // a plain step into (x, y)
    const from = g.tile(x, y - 2);
    if (g.tile(x, y - 1) === "ledge_down" && !(g.rafting && waterTile(from))) visit(x, y - 2);  // a hop down over the ledge
  }
  return seen;
}

/** A trigger on a solid tile you talk to (a sensor post): it fires on A, never on a step. */
export const isTalkTrigger = (g: Grid, t: MapDef["triggers"][number]): boolean => {
  const tile = g.tile(t.x, t.y);
  return (t.w ?? 1) === 1 && (t.h ?? 1) === 1 && !!tile && !walkable(g, t.x, t.y) && "interact" in TILES[tile];
};

/** Scripts a map can start: NPC talk, triggers and onEnter, following `call`s. */
function mapScripts(world: WorldData, map: MapDef): Set<string> {
  const out = new Set<string>();
  const visit = (sid: string | undefined) => {
    if (!sid || out.has(sid) || !world.scripts[sid]) return;
    out.add(sid);
    eachCmd(world.scripts[sid], (c) => { if (c.op === "call") visit(c.script); });
  };
  for (const n of map.npcs) visit(n.script);
  for (const t of map.triggers) visit(t.script);
  visit(map.onEnter);
  return out;
}

/** Each gate declares its terrain and content policy; acquisition and script
 *  dependency handling are shared. Adding a gate needs only another entry. */
interface ProgressGate {
  id: string;
  name: string;
  item: string;
  flag?: string;
  policy: "optional" | "required" | "content";
  affects(map: MapDef): boolean;
  terrain(map: MapDef, g: Grid, enabled: boolean): Grid;
  reach?(map: MapDef, g: Grid, starts: Point[]): Set<string>;
  path?: string;
  rooms?: string;
  optionalMaps?: readonly MapId[];
  resetPaths?: boolean;
}
type Point = { x: number; y: number };

/** Adapt the composed terrain for the runtime movement solver. In particular,
 *  darkness and uncut brambles remain solid during a boulder-layout search. */
function boulderReach(map: MapDef, g: Grid, starts: Point[]): Set<string> {
  const chars = new Map<TileKey, string>();
  const legend: MapDef["legend"] = {};
  const tiles = Array.from({ length: g.h }, (_, y) => Array.from({ length: g.w }, (_, x) => {
    const tile = g.tile(x, y) ?? "void";
    let ch = chars.get(tile);
    if (!ch) { ch = String.fromCharCode(65 + chars.size); chars.set(tile, ch); legend[ch] = tile; }
    return ch;
  }).join(""));
  const runtime = buildMap({ ...map, tiles, legend });
  const stones = map.npcs.filter((n) => n.pushable);
  const reached = new Set<string>();
  for (const start of starts) {
    for (const tile of reachableBoulderTiles(runtime, stones, start, { rafting: g.rafting })) reached.add(tile);
  }
  return reached;
}

const PROGRESS_GATES: readonly ProgressGate[] = [
  {
    id: "prune", name: "PRUNE", item: FIELD_MOVES.prune.item, policy: "optional",
    affects: (m) => m.tiles.some((row) => [...row].some((ch) => prunable(m.legend[ch]))),
    terrain: (_m, g, enabled) => enabled ? { ...g, tile: (x, y) => prunable(g.tile(x, y)) ? "bramble_stump" : g.tile(x, y) } : g,
    optionalMaps: PRUNE_OPTIONAL_MAPS,
  },
  {
    id: "raft", name: "RAFT", item: "lily_raft", flag: "got_raft", policy: "content",
    affects: (m) => m.tiles.some((row) => [...row].some((ch) => waterTile(m.legend[ch]))),
    terrain: (_m, g, enabled) => ({ ...g, rafting: enabled }),
    path: "a land path",
  },
  {
    id: "glow", name: "GLOW", item: "foxfire_lantern", flag: "got_lantern", policy: "required",
    affects: (m) => !!m.dark,
    terrain: (m, g, enabled) => {
      if (!m.dark || enabled) return g;
      const bandAt = glowField(null, glowLamps(g.w, g.h, g.tile), false);
      // Even an unlit ledge is solid; a lit landing cannot justify a dark hop.
      return { ...g, tile: (x, y) => bandAt(x, y) === "dark" ? undefined : g.tile(x, y) };
    },
    path: "a lamp-lit path", rooms: "dark rooms",
  },
  {
    id: "uproot", name: "UPROOT", item: "saxifrage", flag: "got_saxifrage", policy: "required",
    affects: (m) => m.npcs.some((n) => n.pushable),
    terrain: (m, g, enabled) => {
      if (enabled) return g;
      const stones = new Set(m.npcs.filter((n) => n.pushable).map((n) => `${n.x},${n.y}`));
      return { ...g, structureSolid: (x, y) => g.structureSolid(x, y) || stones.has(`${x},${y}`) };
    },
    reach: boulderReach,
    path: "a path without pushing boulders", rooms: "boulder rooms", resetPaths: true,
  },
];

function canTalk(g: Grid, reach: Set<string>, x: number, y: number): boolean {
  return !!g.tile(x, y) && DIRS.some(([dx, dy]) =>
    reach.has(`${x + dx},${y + dy}`) || (g.tile(x + dx, y + dy) === "counter" && reach.has(`${x + 2 * dx},${y + 2 * dy}`)));
}

function triggerReached(base: Grid, g: Grid, reach: Set<string>, t: MapDef["triggers"][number]): boolean {
  // Darkness must not turn a walkable trigger into an interactable wall.
  if (isTalkTrigger(base, t)) return canTalk(g, reach, t.x, t.y);
  for (let dy = 0; dy < (t.h ?? 1); dy++) for (let dx = 0; dx < (t.w ?? 1); dx++) {
    if (reach.has(`${t.x + dx},${t.y + dy}`)) return true;
  }
  return false;
}

/** One least-fixed-point explorer for all items, flags and reachable scripts.
 *  A blocked gate records grants without enabling its terrain: this proves
 *  acquisition and explicit pre-item interactions while other gates advance.
 *  Entries/effects persist across acquisition, including pre-item cutscenes. */
function progress(world: WorldData) {
  const maps = Object.values(world.maps);
  const byFlag = new Map(PROGRESS_GATES.filter((g) => g.flag).map((g) => [g.flag!, g]));
  const byItem = new Map(PROGRESS_GATES.map((g) => [g.item, g]));
  const bases = new Map(maps.map((m) => [m.id, grid(m)]));
  const affected = new Map(PROGRESS_GATES.map((gate) => [gate.id, new Set(maps.filter(gate.affects).map((m) => m.id))]));
  const terrainCache = new Map<string, Grid>();
  const reachCache = new Map<string, Set<string>>();
  const signature = (enabled: ReadonlySet<string>) => PROGRESS_GATES.map((g) => enabled.has(g.id) ? "1" : "0").join("");
  // Unrelated acquisitions cannot change this map's geometry. Reuse floods
  // across both phases and all gate checks, including large outdoor maps.
  const terrainSignature = (m: MapDef, enabled: ReadonlySet<string>) =>
    PROGRESS_GATES.map((gate) => affected.get(gate.id)!.has(m.id) && enabled.has(gate.id) ? "1" : "0").join("");
  const terrain = (m: MapDef, enabled: ReadonlySet<string>) => {
    const key = `${m.id}:${terrainSignature(m, enabled)}`;
    let g = terrainCache.get(key);
    if (!g) {
      g = bases.get(m.id)!;
      for (const gate of PROGRESS_GATES) {
        if (affected.get(gate.id)!.has(m.id)) g = gate.terrain(m, g, enabled.has(gate.id));
      }
      terrainCache.set(key, g);
    }
    return g;
  };
  const reachFrom = (m: MapDef, enabled: ReadonlySet<string>, starts: Point[]) => {
    const key = `${m.id}:${terrainSignature(m, enabled)}:${starts.map((s) => `${s.x},${s.y}`).sort().join(";")}`;
    let reach = reachCache.get(key);
    if (!reach) {
      const g = terrain(m, enabled);
      const solver = PROGRESS_GATES.find((gate) => gate.reach && enabled.has(gate.id) && affected.get(gate.id)!.has(m.id));
      reach = solver?.reach ? solver.reach(m, g, starts) : flood(g, starts);
      reachCache.set(key, reach);
    }
    return reach;
  };

  function explore(blocked?: ProgressGate) {
    const enabled = new Set<string>();
    const granted = new Set<string>();
    const flags = new Set<string>();
    const entries = new Map<MapId, Point[]>();
    const reaches = new Map<MapId, Set<string>>();
    const queue: MapId[] = [];
    const pending = new Set<MapId>();
    const enqueue = (id: MapId) => { if (!pending.has(id)) { pending.add(id); queue.push(id); } };
    const add = (id: MapId, x: number, y: number, arrivingRaft = false) => {
      // Owning the raft cannot mount it at an arrival. Only a water exit
      // preserves rafting; script warps and the new-game position are on foot.
      const destination = world.maps[id];
      if (destination && waterTile(terrain(destination, enabled).tile(x, y)) && !arrivingRaft) return;
      const list = entries.get(id) ?? [];
      if (list.some((s) => s.x === x && s.y === y)) return;
      entries.set(id, [...list, { x, y }]); enqueue(id);
    };
    const available = (when: Cond | undefined) => !when?.some((c) => {
      const gate = byFlag.get(c.flag);
      return gate && c.is !== enabled.has(gate.id);
    });
    const needs = (when: Cond | undefined) => (when ?? []).filter((c) => c.is && !byFlag.has(c.flag)).map((c) => c.flag);
    type Effect = { needs: string[]; flag?: string; grant?: string; warp?: { to: MapId; x: number; y: number } };
    const effects: Effect[] = [];
    const scriptsSeen = new Set<string>();
    const script = (sid: string | undefined, deps: string[] = [], stack: string[] = []) => {
      if (!sid || stack.includes(sid)) return;
      const key = `${sid}:${signature(enabled)}:${[...new Set(deps)].sort().join(",")}`;
      if (scriptsSeen.has(key)) return;
      scriptsSeen.add(key);
      commands(world.scripts[sid] ?? [], deps, [...stack, sid]);
    };
    const commands = (cmds: ScriptCmd[], deps: string[], stack: string[]) => {
      const branch = (cmds: ScriptCmd[], extra: string[] = []) => commands(cmds, [...deps, ...extra], stack);
      for (const c of cmds) {
        switch (c.op) {
          case "giveItem": {
            const gate = byItem.get(c.item);
            if (gate && (c.qty ?? 1) > 0) effects.push({ needs: deps, grant: gate.id });
            break;
          }
          // Acquisition flags alone never stand in for an item grant.
          case "setFlag": if (c.value !== false && !byFlag.has(c.flag)) effects.push({ needs: deps, flag: c.flag }); break;
          case "battle": effects.push({ needs: deps, flag: `beat_${c.trainer}` }); break;
          case "warp": effects.push({ needs: deps, warp: c }); break;
          case "call": script(c.script, deps, stack); break;
          case "if": {
            if (available(c.when)) branch(c.then, needs(c.when));
            // A conjunction's else can run when any one condition fails.
            for (const v of c.when) {
              const gate = byFlag.get(v.flag);
              if (gate ? v.is !== enabled.has(gate.id) : true) {
                branch(c.else ?? [], !gate && !v.is ? [v.flag] : []);
              }
            }
            break;
          }
          case "ifHasItem": {
            const gate = byItem.get(c.item);
            if (gate) branch(enabled.has(gate.id) ? c.then : c.else ?? []);
            else { branch(c.then); branch(c.else ?? []); }
            break;
          }
          case "trade": branch(c.then ?? []); branch(c.else ?? []); break;
          case "choice": c.branches.forEach((b) => branch(b)); break;
          case "yesno": branch(c.yes); branch(c.no); break;
          case "ifTime": case "ifLastBattle": case "ifPartyHas": case "ifCaught": case "ifCaughtCount": case "ifNurserySeed":
            branch(c.then); branch(c.else ?? []); break;
        }
      }
    };
    const resolve = () => {
      let changed = true;
      while (changed) {
        changed = false;
        for (const e of effects) {
          if (!e.needs.every((f) => flags.has(f))) continue;
          if (e.flag && !flags.has(e.flag)) { flags.add(e.flag); changed = true; }
          if (e.grant) {
            granted.add(e.grant);
            if (e.grant !== blocked?.id && !enabled.has(e.grant)) {
              enabled.add(e.grant); changed = true;
              for (const id of entries.keys()) enqueue(id);
            }
          }
          if (e.warp) add(e.warp.to, e.warp.x, e.warp.y);
        }
      }
    };
    add(world.newGame.map, world.newGame.x, world.newGame.y);
    script(world.newGame.script); resolve();
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head]; pending.delete(id);
      const m = world.maps[id];
      if (!m) continue;
      const g = terrain(m, enabled);
      const reach = reachFrom(m, enabled, entries.get(id)!);
      reaches.set(id, reach);
      if (!reach.size) continue;
      script(world.newGame.script);
      script(m.onEnter);
      for (const n of m.npcs) {
        if (!available(n.visibleWhen) || !canTalk(g, reach, n.x, n.y)) continue;
        script(n.script, needs(n.visibleWhen));
        if (n.trainer) effects.push({ needs: needs(n.visibleWhen), flag: `beat_${n.trainer}` });
      }
      for (const t of m.triggers) {
        if (available(t.when) && triggerReached(bases.get(id)!, g, reach, t)) script(t.script, needs(t.when));
      }
      // These exits were reached with this terrain, before resolving new grants.
      for (const wp of m.warps) if (reach.has(`${wp.x},${wp.y}`)) {
        add(wp.to, wp.toX, wp.toY, enabled.has("raft") && raftTile(g, wp.x, wp.y));
      }
      resolve();
    }
    return { enabled, granted, entries, reaches };
  }

  const after = explore();
  const beforeCache = new Map<string, ReturnType<typeof explore>>();
  const check = (gate: ProgressGate): string[] => {
    if (gate.policy !== "optional" && !affected.get(gate.id)!.size) return [];
    const before = beforeCache.get(gate.id) ?? (after.granted.has(gate.id) ? explore(gate) : after);
    beforeCache.set(gate.id, before);
    const errs: string[] = [];
    const obtainable = before.granted.has(gate.id);
    const beforeOnly = (when: Cond | undefined) => !!when?.some((c) => c.flag === gate.flag && !c.is);
    const available = (when: Cond | undefined) => !when?.some((c) => c.flag === gate.flag && c.is !== obtainable);
    for (const m of maps) {
      if (gate.policy === "required" && !affected.get(gate.id)!.has(m.id)) continue;
      const where = `[${m.id}] without ${gate.name}:`;
      const early = before.reaches.get(m.id) ?? new Set<string>();
      const late = after.reaches.get(m.id) ?? new Set<string>();
      const locked = terrain(m, before.enabled);
      const g = terrain(m, after.enabled);
      const potentialEnabled = new Set(before.enabled).add(gate.id);
      const potentialGrid = terrain(m, potentialEnabled);
      const potential = reachFrom(m, potentialEnabled, (gate.policy === "content" ? after : before).entries.get(m.id) ?? []);
      if (gate.policy === "optional") {
        if (!before.entries.has(m.id)) { errs.push(`${where} the map can't be reached`); continue; }
        for (const wp of m.warps) if (prunable(locked.tile(wp.x, wp.y))) errs.push(`${where} a bramble sits on the warp at ${wp.x},${wp.y}`);
        if (gate.optionalMaps?.includes(m.id)) continue;
      }
      const need = (earlyOk: boolean, lateOk: boolean, possible: boolean, when: Cond | undefined, what: string) => {
        if (gate.policy === "optional") {
          if (!earlyOk && possible) errs.push(`${where} ${what} is behind brambles`);
          return;
        }
        if (gate.policy === "content" && !possible) return; // Decorative water requires no raft.
        const earlyOnly = beforeOnly(when);
        if (gate.policy === "required" && !earlyOnly && !available(when) && !gate.resetPaths) return;
        if (earlyOnly ? earlyOk : lateOk) return;
        errs.push(gate.resetPaths && obtainable && !earlyOnly
          ? `${where} ${what} has no reachable path from its reset layout with ${gate.flag}`
          : `${where} ${what} needs ${gate.path} before ${gate.flag} is obtainable`);
      };
      for (const n of m.npcs) {
        if (n.pushable) continue;
        if (gate.policy !== "content" && (n.sprite === "item_pickup" || n.sprite === "harvest_bush" || isBoarder(n))) continue;
        need(canTalk(locked, early, n.x, n.y), canTalk(g, late, n.x, n.y), canTalk(potentialGrid, potential, n.x, n.y), n.visibleWhen, `npc ${n.id}`);
      }
      for (const t of m.triggers) {
        const base = bases.get(m.id)!;
        need(triggerReached(base, locked, early, t), triggerReached(base, g, late, t), triggerReached(base, potentialGrid, potential, t), t.when, `trigger ${t.script}${gate.policy === "optional" && !isTalkTrigger(base, t) ? ` at ${t.x},${t.y}` : ""}`);
      }
      for (const wp of m.warps) need(early.has(`${wp.x},${wp.y}`), late.has(`${wp.x},${wp.y}`), potential.has(`${wp.x},${wp.y}`), undefined, `warp at ${wp.x},${wp.y}`);
      if (gate.policy !== "required") {
        for (const sign of m.signs) need(canTalk(locked, early, sign.x, sign.y), canTalk(g, late, sign.x, sign.y), canTalk(potentialGrid, potential, sign.x, sign.y), undefined, `sign at ${sign.x},${sign.y}`);
      }
      if (gate.policy === "content") {
        for (const h of m.hidden ?? []) need(canTalk(locked, early, h.x, h.y), canTalk(g, late, h.x, h.y), canTalk(potentialGrid, potential, h.x, h.y), undefined, `hidden ${h.item}`);
      }
      if (gate.rooms && !obtainable && [...potential].some((k) => !early.has(k))) errs.push(`${where} ${gate.rooms} require an obtainable ${gate.item}`);
    }
    if (gate.policy === "optional") {
      const givers = maps.filter((m) => [...mapScripts(world, m)].some((sid) => {
        let gives = false;
        eachCmd(world.scripts[sid], (c) => { if (c.op === "giveItem" && c.item === gate.item) gives = true; });
        return gives;
      }));
      if (!givers.length) errs.push(`no map hands out the ${gate.item}`);
      for (const m of givers) if (!before.entries.has(m.id)) errs.push(`[${m.id}] gives the ${gate.item} but can't be reached without ${gate.name}`);
    }
    return errs;
  };
  return { after, check };
}

const gateById = (id: string) => PROGRESS_GATES.find((g) => g.id === id)!;

/** PRUNE stays optional, even when other acquired items open required routes. */
export function checkProgressWithoutPrune(world: WorldData): string[] {
  return progress(world).check(gateById("prune"));
}

/** Only stationary lamp light is a safe story path before the lantern. */
export function checkProgressWithoutLantern(world: WorldData): string[] {
  return progress(world).check(gateById("glow"));
}

/** Water-only content needs a reachable raft grant; decorative pools do not. */
export function checkProgressWithoutRaft(world: WorldData): string[] {
  return progress(world).check(gateById("raft"));
}

/** Boulder routes are proved from the reset layout, using legal pushes. */
export function checkProgressWithoutSaxifrage(world: WorldData): string[] {
  return progress(world).check(gateById("uproot"));
}

/** Walk every command, including nested branches. */
export function eachCmd(cmds: ScriptCmd[], fn: (c: ScriptCmd) => void) {
  for (const c of cmds) {
    fn(c);
    switch (c.op) {
      case "choice": c.branches.forEach((b) => eachCmd(b, fn)); break;
      case "yesno": eachCmd(c.yes, fn); eachCmd(c.no, fn); break;
      case "trade":
        if (c.then) eachCmd(c.then, fn); if (c.else) eachCmd(c.else, fn); break;
      case "if": case "ifTime": case "ifLastBattle":
      case "ifHasItem": case "ifPartyHas": case "ifCaught": case "ifCaughtCount": case "ifNurserySeed":
        eachCmd(c.then, fn); if (c.else) eachCmd(c.else, fn); break;
    }
  }
}

/** Word-wrap like the text box: returns lines of at most `cols`. */
export function wrapText(text: string, cols = TEXTBOX.cols): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ").filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > cols && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Names can be up to 7 characters; measure tokens at that width. */
export const expandTokens = (t: string) => t.replace(/<PLAYER>/g, "WWWWWWW").replace(/<RIVAL>/g, "WWWWWWW");

/**
 * Returns the problems in `world`. Soft problems (a quest script narrative
 * hasn't written yet) go to `warnings` instead, when given.
 */
export function validateWorld(world: WorldData, warnings: string[] = []): string[] {
  const errs: string[] = [];
  const progression = progress(world);
  const rafting = progression.after.enabled.has("raft");
  const stills = new Set<string>(STILLS);
  const species = new Set<string>(SPECIES_IDS);
  // Story items (the contract) plus everything the data owner defines (PLANT FOOD, ...).
  const items = new Set<string>([...REQUIRED_ITEMS, ...Object.keys(DATA.items ?? {})]);
  const music = new Set<string>(MUSIC);
  const marks = new Set<string>(MARKS);
  const sfx = new Set<string>(SFX);
  const jingles = new Set<string>(JINGLES);

  // Entry points per map: warp arrivals from elsewhere, scripted warps, new game.
  const entries = new Map<MapId, (Point & { rafting: boolean })[]>();
  const addEntry = (m: MapId, x: number, y: number, rafting = false) => {
    if (!entries.has(m)) entries.set(m, []);
    entries.get(m)!.push({ x, y, rafting });
  };
  addEntry(world.newGame.map, world.newGame.x, world.newGame.y);
  for (const m of Object.values(world.maps)) {
    const g = grid(m);
    for (const w of m.warps) addEntry(w.to, w.toX, w.toY, raftTile(g, w.x, w.y));
  }
  for (const cmds of Object.values(world.scripts)) {
    eachCmd(cmds, (c) => { if (c.op === "warp") addEntry(c.to, c.x, c.y); });
  }

  // Check against ordinary entries: a glide landing must not make itself
  // count as reachable merely by being a new entry point.
  for (const landing of world.glide ?? []) {
    const at = `[glide ${landing.map}] landing at ${landing.x},${landing.y}`;
    const map = world.maps[landing.map];
    if (!map) { errs.push(`${at}: missing map`); continue; }
    const g = grid(map);
    if (!Number.isInteger(landing.x) || !Number.isInteger(landing.y) || !walkable(g, landing.x, landing.y)) {
      errs.push(`${at} is not walkable`);
    } else if (!flood(grid(map, { rafting }), entries.get(landing.map) ?? []).has(`${landing.x},${landing.y}`)) {
      errs.push(`${at} is unreachable`);
    }
    if (!map.outdoor) errs.push(`${at} is indoors`);
    if (landing.name.length > TEXTBOX.cols) errs.push(`${at}: name exceeds ${TEXTBOX.cols} columns`);
    if (map.npcs.some((n) => n.x === landing.x && n.y === landing.y)) errs.push(`${at} is under an NPC`);
  }

  for (const id of MAP_IDS) {
    const map = world.maps[id];
    if (!map) { errs.push(`missing map ${id}`); continue; }
    const where = `[${id}]`;
    if (map.id !== id) errs.push(`${where} id mismatch ${map.id}`);
    if (!music.has(map.music)) errs.push(`${where} bad music ${map.music}`);
    if (!(map.border in TILES)) errs.push(`${where} bad border ${map.border}`);

    // rows + legend
    const w = map.tiles[0]?.length ?? 0;
    map.tiles.forEach((row, y) => {
      if (row.length !== w) errs.push(`${where} row ${y} has length ${row.length}, expected ${w}`);
      for (const ch of row) {
        const t = map.legend[ch];
        if (!t || !(t in TILES)) errs.push(`${where} row ${y}: char '${ch}' has no valid tile`);
      }
    });
    const g = grid(map, { rafting });

    // ambient particles
    if (map.ambient !== undefined && !AMBIENTS.has(map.ambient)) errs.push(`${where} bad ambient ${map.ambient}`);
    if (map.ambient === "fireflies" && !map.outdoor) errs.push(`${where} fireflies indoors never show (night tint is outdoor only)`);

    // legendWhen: every override maps a character the map uses to a real tile,
    // and the swapped-in tiles are checked for reachability like the base map.
    for (const [i, lw] of (map.legendWhen ?? []).entries()) {
      for (const [ch, t] of Object.entries(lw.legend)) {
        if (!(t in TILES)) errs.push(`${where} legendWhen[${i}] '${ch}' -> unknown tile ${t}`);
        if (!(ch in map.legend)) errs.push(`${where} legendWhen[${i}] '${ch}' is not in the base legend`);
        if (!map.tiles.some((row) => row.includes(ch))) errs.push(`${where} legendWhen[${i}] '${ch}' is never used in the tiles`);
      }
    }

    // structures sit on '@' cells, and every '@' is covered
    const covered = new Set<string>();
    for (const s of map.structures) {
      const def = STRUCTURES[s.key];
      if (!def) { errs.push(`${where} bad structure ${s.key}`); continue; }
      for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
        const x = s.x + dx, y = s.y + dy;
        covered.add(`${x},${y}`);
        if (map.tiles[y]?.[x] !== "@") errs.push(`${where} ${s.key} at ${s.x},${s.y} covers non-@ cell ${x},${y}`);
      }
    }
    map.tiles.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "@" && !covered.has(`${x},${y}`)) errs.push(`${where} stray @ at ${x},${y}`);
    }));

    // warps
    const warpAt = new Set<string>();
    for (const wp of map.warps) {
      warpAt.add(`${wp.x},${wp.y}`);
      if (!walkable(g, wp.x, wp.y)) errs.push(`${where} warp at ${wp.x},${wp.y} is not walkable`);
      const target = world.maps[wp.to];
      if (!target) { errs.push(`${where} warp to missing map ${wp.to}`); continue; }
      const tg = grid(target, { rafting: rafting && raftTile(g, wp.x, wp.y) });
      if (!walkable(tg, wp.toX, wp.toY)) errs.push(`${where} warp lands on solid ${wp.to} ${wp.toX},${wp.toY}`);
      if (target.warps.some((o) => o.x === wp.toX && o.y === wp.toY) && tg.tile(wp.toX, wp.toY) !== "mat_exit") {
        errs.push(`${where} warp lands on another warp in ${wp.to} ${wp.toX},${wp.toY}`);
      }
      // Door warps: the interior's exit must come back to the tile below the door.
      const door = g.doors.find((d) => d.x === wp.x && d.y === wp.y);
      if (door) {
        const back = target.warps.filter((o) => o.to === id);
        if (!back.length) errs.push(`${where} door ${door.key} -> ${wp.to} has no way back`);
        for (const b of back) {
          if (b.toX !== door.x || b.toY !== door.y + 1) {
            errs.push(`${where} ${wp.to} exit lands at ${b.toX},${b.toY}, expected below door ${door.x},${door.y + 1}`);
          }
        }
      }
    }
    // Every door has a warp or a (locked-door) trigger.
    for (const d of g.doors) {
      const hasWarp = map.warps.some((wp) => wp.x === d.x && wp.y === d.y);
      const hasTrig = map.triggers.some((t) => d.x >= t.x && d.x < t.x + (t.w ?? 1) && d.y >= t.y && d.y < t.y + (t.h ?? 1));
      if (!hasWarp && !hasTrig) errs.push(`${where} door of ${d.key} at ${d.x},${d.y} leads nowhere`);
    }
    // Interior exits are mats.
    if (!map.outdoor) {
      for (const wp of map.warps) {
        const t = g.tile(wp.x, wp.y);
        if (t !== "mat_exit" && t !== "stairs_up" && t !== "stairs_down") {
          errs.push(`${where} interior warp at ${wp.x},${wp.y} is on ${t}, expected mat_exit/stairs`);
        }
      }
    }

    // signs
    const signAt = new Set(map.signs.map((s) => `${s.x},${s.y}`));
    // Signs sit on sign posts and mailboxes, or give flavour text to any other
    // interactable tile (a microscope, a workbench, a shelf of field notes).
    for (const s of map.signs) {
      const t = g.tile(s.x, s.y);
      if (!t || !("interact" in TILES[t])) errs.push(`${where} sign at ${s.x},${s.y} is on ${t}`);
    }
    map.tiles.forEach((row, y) => [...row].forEach((_, x) => {
      const t = g.tile(x, y);
      if ((t === "sign" || t === "mailbox") && !signAt.has(`${x},${y}`)) errs.push(`${where} ${t} at ${x},${y} has no text`);
    }));

    // NPCs
    const ids = new Set<string>();
    for (const n of map.npcs) {
      if (ids.has(n.id)) errs.push(`${where} duplicate npc id ${n.id}`);
      ids.add(n.id);
      if (!walkable(g, n.x, n.y)) errs.push(`${where} npc ${n.id} stands on solid ${g.tile(n.x, n.y)} at ${n.x},${n.y}`);
      if (warpAt.has(`${n.x},${n.y}`)) errs.push(`${where} npc ${n.id} stands on a warp`);
      if (g.doors.some((d) => d.x === n.x && d.y === n.y)) errs.push(`${where} npc ${n.id} stands on a door`);
      if (!n.script && !n.trainer) {
        if (isBoarder(n)) { if (n.visibleWhen) errs.push(`${where} boarder ${n.id}: the engine shows it, no visibleWhen`); }
        else if (!n.pushable && n.sprite !== "item_pickup") errs.push(`${where} npc ${n.id} has nothing to say`);
        else if (!n.pushable && !items.has(pickupItem(n.id))) errs.push(`${where} pickup ${n.id} gives unknown item ${pickupItem(n.id)}`);
      }
      if (n.script && !world.scripts[n.script]) {
        (QUEST_SCRIPTS.has(n.script) ? warnings : errs).push(`${where} npc ${n.id} script ${n.script} missing`);
      }
      if (n.trainer && !world.trainers[n.trainer]) errs.push(`${where} npc ${n.id} trainer ${n.trainer} missing`);
    }
    for (const t of map.triggers) {
      if (!world.scripts[t.script]) errs.push(`${where} trigger script ${t.script} missing`);
    }
    if (map.onEnter && !world.scripts[map.onEnter]) errs.push(`${where} onEnter ${map.onEnter} missing`);
    if (map.healPoint && !walkable(grid(map), map.healPoint.x, map.healPoint.y)) errs.push(`${where} healPoint is solid`);

    // encounters
    for (const kind of ["grass", "bog", "water"] as const) {
      const enc = map.encounters?.[kind];
      if (!enc) continue;
      for (const s of enc.slots) {
        if (!species.has(s.species)) errs.push(`${where} encounter species ${s.species}`);
        if (s.minLevel > s.maxLevel) errs.push(`${where} encounter levels ${s.species}`);
      }
      for (const time of ["day", "night"] as const) {
        if (!enc.slots.some((s) => !s.time || s.time === "any" || s.time === time)) {
          errs.push(`${where} ${kind} encounters empty at ${time}`);
        }
      }
    }
    map.tiles.forEach((row, y) => [...row].forEach((_, x) => {
      const t = g.tile(x, y);
      if (t === "tall_grass" && !map.encounters?.grass) errs.push(`${where} tall grass at ${x},${y} but no grass encounters`);
      if (t === "bog" && !map.encounters?.bog) errs.push(`${where} bog at ${x},${y} but no bog encounters`);
    }));

    // reachability
    const starts = entries.get(id) ?? [];
    if (!starts.length) { errs.push(`${where} has no way in`); continue; }
    for (const s of starts) {
      if (!walkable(grid(map, { rafting: rafting && s.rafting }), s.x, s.y)) errs.push(`${where} entry ${s.x},${s.y} is solid`);
    }
    // Everything is checked as eventually reachable (brambles cut); the
    // required-progress pass after this loop checks the world without PRUNE.
    const gp = grid(map, { pruned: true, rafting });
    const reach = flood(gp, starts);
    const has = (x: number, y: number) => reach.has(`${x},${y}`);
    const canTalk = (x: number, y: number) => DIRS.some(([dx, dy]) => {
      if (has(x + dx, y + dy)) return true;
      const t = g.tile(x + dx, y + dy);
      return t === "counter" && has(x + 2 * dx, y + 2 * dy);
    });
    for (const wp of map.warps) if (!has(wp.x, wp.y)) errs.push(`${where} warp at ${wp.x},${wp.y} unreachable`);
    for (const n of map.npcs) if (!canTalk(n.x, n.y)) errs.push(`${where} npc ${n.id} unreachable`);
    for (const s of map.signs) if (!canTalk(s.x, s.y)) errs.push(`${where} sign at ${s.x},${s.y} unreachable`);
    for (const t of map.triggers) {
      // A trigger on a solid, interactable tile (a sensor post) fires on A, facing it.
      if (isTalkTrigger(g, t)) {
        if (!canTalk(t.x, t.y)) errs.push(`${where} trigger ${t.script} at ${t.x},${t.y} can't be faced`);
        continue;
      }
      let any = false;
      for (let dy = 0; dy < (t.h ?? 1); dy++) for (let dx = 0; dx < (t.w ?? 1); dx++) if (has(t.x + dx, t.y + dy)) any = true;
      if (!any) errs.push(`${where} trigger ${t.script} at ${t.x},${t.y} unreachable`);
    }
    // Scenery (doorless structures) must not cut the map: everything reachable
    // without them must stay reachable with them.
    const scenery = map.structures.filter((s) => STRUCTURES[s.key] && !STRUCTURES[s.key].door);
    if (scenery.length) {
      const open = grid({ ...map, structures: map.structures.filter((s) => STRUCTURES[s.key]?.door) }, { rafting });
      // Treat the scenery footprint itself as solid in the open grid, so we only
      // compare paths around it, not the cells it covers.
      const covers = new Set<string>();
      for (const s of scenery) {
        const def = STRUCTURES[s.key];
        for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) covers.add(`${s.x + dx},${s.y + dy}`);
      }
      const solidScenery: Grid = { ...open, structureSolid: (x, y) => open.structureSolid(x, y) || covers.has(`${x},${y}`) };
      // Per entry point, so a second way in can't mask a cut path.
      blocked: for (const st of starts) {
        const withScenery = flood(solidScenery, [st]);
        for (const k of flood(open, [st])) {
          if (covers.has(k) || withScenery.has(k)) continue;
          errs.push(`${where} scenery blocks the way from ${st.x},${st.y} to ${k}`);
          break blocked;
        }
      }
    }

    // hidden items: on the map, a known item, not under anything else, and
    // findable: some reachable, free neighbour to stand on and face it from.
    const npcAt = new Set(map.npcs.map((n) => `${n.x},${n.y}`));
    const hiddenAt = new Set<string>();
    for (const hd of map.hidden ?? []) {
      const at = `${where} hidden ${hd.item} at ${hd.x},${hd.y}`;
      const k = `${hd.x},${hd.y}`;
      if (!g.tile(hd.x, hd.y)) { errs.push(`${at} is off the map`); continue; }
      if (hiddenAt.has(k)) errs.push(`${at} doubles up another hidden item`);
      hiddenAt.add(k);
      if (!items.has(hd.item)) errs.push(`${at}: unknown item`);
      if (hd.qty !== undefined && (!Number.isInteger(hd.qty) || hd.qty < 1)) errs.push(`${at}: bad qty ${hd.qty}`);
      if (npcAt.has(k)) errs.push(`${at} is under an NPC`);
      if (warpAt.has(k) || g.doors.some((d) => d.x === hd.x && d.y === hd.y)) errs.push(`${at} is on a warp or door`);
      if (signAt.has(k)) errs.push(`${at} is on a sign`);
      if (g.structureSolid(hd.x, hd.y)) errs.push(`${at} is inside a structure`);
      const from = DIRS.some(([dx, dy]) => has(hd.x + dx, hd.y + dy) && !npcAt.has(`${hd.x + dx},${hd.y + dy}`));
      if (!from) errs.push(`${at} has no reachable free tile beside it`);
    }

    // Bushes and quest NPCs are scenery, not gates: with all of them standing
    // (whatever their visibility), every tile reachable without them still is.
    const props = map.npcs.filter(mustNotBlock);
    if (props.length) {
      const at = new Set(props.map((n) => `${n.x},${n.y}`));
      const solidAt = (cells: Set<string>): Grid => ({ ...gp, structureSolid: (x, y) => gp.structureSolid(x, y) || cells.has(`${x},${y}`) });
      for (const st of starts) {
        if (at.has(`${st.x},${st.y}`)) { errs.push(`${where} npc stands on the entry ${st.x},${st.y}`); continue; }
        const free = flood(gp, [st]);
        const all = flood(solidAt(at), [st]);
        const lost = [...free].find((k) => !at.has(k) && !all.has(k));
        if (!lost) continue;
        const culprit = props.find((n) => {
          const one = new Set([`${n.x},${n.y}`]);
          return !flood(solidAt(one), [st]).has(lost);
        });
        errs.push(`${where} ${culprit ? `npc ${culprit.id}` : "bushes/quest npcs together"} block the way from ${st.x},${st.y} to ${lost}`);
      }
    }

    // soft-lock: from every reachable tile some warp must still be reachable,
    // both before the PRUNING SHEARS (brambles solid) and after (brambles cut).
    if (map.warps.length) {
      for (const [gg, from, when] of [[g, flood(g, starts), "before PRUNE"], [gp, reach, "with PRUNE"]] as const) {
        const canExit = canReach(gg, map.warps);
        for (const k of from) {
          if (!canExit.has(k)) {
            errs.push(`${where} soft-lock ${when}: no exit from ${k}`);
            break;
          }
        }
      }
    } else errs.push(`${where} has no warps`);
  }

  for (const gate of PROGRESS_GATES) errs.push(...progression.check(gate));

  // scripts
  const checkCmds = (sid: string, cmds: ScriptCmd[]) => eachCmd(cmds, (c) => {
    const at = `[script ${sid}]`;
    switch (c.op) {
      case "say": {
        for (const line of wrapText(expandTokens(c.text))) {
          if (line.length > TEXTBOX.cols) errs.push(`${at} word too long: "${line}"`);
        }
        const shown = (c.speaker ? `${c.speaker}: ` : "") + expandTokens(c.text);
        const pages = Math.ceil(wrapText(shown).length / TEXTBOX.lines);
        if (pages > 3) errs.push(`${at} ${pages} pages: "${c.text}"`);
        break;
      }
      case "giveItem": case "takeItem":
        if (!items.has(c.item)) errs.push(`${at} unknown item ${c.item}`); break;
      case "shop":
        for (const i of c.stock) if (!items.has(i)) errs.push(`${at} unknown shop item ${i}`); break;
      case "giveSpecies": case "showSpecies": case "wildBattle":
        if (!species.has(c.species)) errs.push(`${at} unknown species ${c.species}`); break;
      case "trade":
        for (const sp of [...c.wants, c.gives.species]) {
          if (!species.has(sp)) errs.push(`${at} unknown trade species ${sp}`);
        }
        if (!Number.isInteger(c.gives.level) || c.gives.level < 1 || c.gives.level > 60) {
          errs.push(`${at} trade level must be 1–60`);
        }
        if (c.gives.nickname !== undefined && Array.from(c.gives.nickname).length > 10) {
          errs.push(`${at} trade nickname is longer than 10 characters`);
        }
        break;
      case "giveMark": if (!marks.has(c.mark)) errs.push(`${at} unknown mark ${c.mark}`); break;
      case "battle": if (!world.trainers[c.trainer]) errs.push(`${at} unknown trainer ${c.trainer}`); break;
      case "music": if (!music.has(c.id)) errs.push(`${at} unknown music ${c.id}`); break;
      case "sfx": if (!sfx.has(c.id)) errs.push(`${at} unknown sfx ${c.id}`); break;
      case "jingle": if (!jingles.has(c.id)) errs.push(`${at} unknown jingle ${c.id}`); break;
      case "call": if (!world.scripts[c.script]) errs.push(`${at} calls missing ${c.script}`); break;
      case "ambient": if (!AMBIENTS.has(c.kind)) errs.push(`${at} unknown ambient ${c.kind}`); break;
      case "still": if (!stills.has(c.image)) errs.push(`${at} unknown still ${c.image}`); break;
      case "ifHasItem": if (!items.has(c.item)) errs.push(`${at} unknown item ${c.item}`); break;
      case "ifPartyHas": case "ifCaught":
        for (const sp of Array.isArray(c.species) ? c.species : [c.species]) {
          if (!species.has(sp)) errs.push(`${at} unknown species ${sp}`);
        }
        break;
      case "harvest":
        if (!items.has(c.item)) errs.push(`${at} unknown harvest item ${c.item}`);
        if (!bushIds.has(c.id)) errs.push(`${at} harvests ${c.id}, but no NPC bush:${c.id} exists`);
        break;
      case "startQuest": case "completeQuest":
        if (!world.quests) warnings.push(`${at} ${c.op} ${c.quest}: WORLD.quests is not wired yet`);
        else if (!world.quests[c.quest]) errs.push(`${at} unknown quest ${c.quest}`);
        break;
      case "warp": {
        const m = world.maps[c.to];
        if (!m) errs.push(`${at} warp to missing map ${c.to}`);
        else if (!walkable(grid(m), c.x, c.y)) errs.push(`${at} warp lands on solid ${c.to} ${c.x},${c.y}`);
        break;
      }
    }
  });
  // harvest bushes: unique ids, and each one's script really harvests it
  const bushIds = new Set<string>();
  for (const m of Object.values(world.maps)) for (const n of m.npcs) {
    const at = `[${m.id}] npc ${n.id}`;
    const hid = harvestId(n);
    if (n.sprite === "harvest_bush" && !hid) errs.push(`${at}: a harvest_bush must be named bush:<harvestId>`);
    if (n.id.startsWith("bush:") && n.sprite !== "harvest_bush") errs.push(`${at}: bush:<id> NPCs use the harvest_bush sprite`);
    if (!hid) continue;
    if (bushIds.has(hid)) errs.push(`${at}: harvest id ${hid} is used twice`);
    bushIds.add(hid);
    if (n.trainer || n.visibleWhen || (n.movement && n.movement !== "static")) errs.push(`${at}: a bush is a plain static object`);
    const cmds = n.script ? world.scripts[n.script] : undefined;
    let ok = false;
    if (cmds) eachCmd(cmds, (c) => { if (c.op === "harvest" && c.id === hid) ok = true; });
    if (!ok) errs.push(`${at}: its script must { op: "harvest", id: "${hid}" }`);
  }

  // quest givers stand where ROUND3 says, with the agreed script ids
  for (const q of QUEST_GIVERS) {
    const n = world.maps[q.map]?.npcs.find((x) => x.id === q.npc);
    if (!n) { errs.push(`[quest ${q.quest}] giver ${q.npc} missing from ${q.map}`); continue; }
    if (n.script !== q.script) errs.push(`[quest ${q.quest}] ${q.map} ${q.npc} uses script ${n.script}, expected ${q.script}`);
    if (world.quests && !world.quests[q.quest]) warnings.push(`[quest ${q.quest}] no QuestDef in WORLD.quests`);
  }
  if (!world.quests) warnings.push("WORLD.quests is not wired yet");

  for (const [sid, cmds] of Object.entries(world.scripts)) checkCmds(sid, cmds);
  if (!world.scripts[world.newGame.script]) errs.push(`newGame script ${world.newGame.script} missing`);

  // npc ids used by scripts exist on some map
  const allNpcIds = new Set(Object.values(world.maps).flatMap((m) => m.npcs.map((n) => n.id)));
  for (const [sid, cmds] of Object.entries(world.scripts)) eachCmd(cmds, (c) => {
    const npc = c.op === "moveNpc" || c.op === "showNpc" || c.op === "hideNpc" ? c.npc
      : (c.op === "face" || c.op === "emote") && c.who !== "player" ? c.who : undefined;
    if (npc && !allNpcIds.has(npc)) errs.push(`[script ${sid}] unknown npc ${npc}`);
  });

  // trainers
  for (const [tid, t] of Object.entries(world.trainers)) {
    if (t.id !== tid) errs.push(`[trainer ${tid}] id mismatch`);
    if (!t.team.length) errs.push(`[trainer ${tid}] empty team`);
    for (const m of t.team) if (!species.has(m.species)) errs.push(`[trainer ${tid}] species ${m.species}`);
    for (const i of t.items ?? []) if (!items.has(i.item)) errs.push(`[trainer ${tid}] item ${i.item}`);
    if (t.mark && !marks.has(t.mark)) errs.push(`[trainer ${tid}] mark ${t.mark}`);
    for (const line of [t.intro, t.defeat, t.after]) {
      for (const l of wrapText(expandTokens(line))) if (l.length > TEXTBOX.cols) errs.push(`[trainer ${tid}] word too long "${l}"`);
    }
  }
  return errs;
}
