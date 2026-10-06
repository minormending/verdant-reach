// Pure checks over WorldData: geometry, references, reachability and text fit.
// Used by world.test.ts and by the ?dev=world overview.

import {
  FIELD_MOVES, JINGLES, MAP_IDS, MARKS, MUSIC, REQUIRED_ITEMS, SFX, SPECIES_IDS, STILLS, STRUCTURES, TILES, TEXTBOX,
} from "../contracts";
import type { Ambient, MapDef, MapId, NpcDef, ScriptCmd, TileKey, WorldData } from "../contracts";
import { pickupItem } from "./build";
import { DATA } from "../data";

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
}

/** The map's walk grid. With `pruned`, every prunable tile reads as a cut stump
 *  (the world once the PRUNING SHEARS are in hand). */
export function grid(map: MapDef, opts: { pruned?: boolean } = {}): Grid {
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
    w, h, doors,
    tile(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return undefined;
      const t = map.legend[map.tiles[y][x]];
      return opts.pruned && prunable(t) ? "bramble_stump" : t;
    },
    structureSolid: (x, y) => solid.has(`${x},${y}`),
  };
}

export function walkable(g: Grid, x: number, y: number): boolean {
  const t = g.tile(x, y);
  if (!t) return false;
  return TILES[t].walk && !g.structureSolid(x, y);
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
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      let nx = x + dx;
      let ny = y + dy;
      const t = g.tile(nx, ny);
      if (t === "ledge_down") {
        if (dy !== 1) continue;
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
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) visit(x - dx, y - dy);       // a plain step into (x, y)
    if (g.tile(x, y - 1) === "ledge_down") visit(x, y - 2);  // a hop down over the ledge
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

/**
 * Required progress never needs PRUNE. With every bramble solid, walk the
 * world from the new game through warps whose tiles are reachable, then check:
 *  - every map is reached, and the map that hands out the PRUNING SHEARS is;
 *  - outside PRUNE_OPTIONAL_MAPS, every warp, trigger, sign and NPC (bar item
 *    pickups and bushes) is reachable from the ways in, without cutting;
 *  - no prunable tile stands on a warp, door or story trigger.
 */
export function checkProgressWithoutPrune(world: WorldData): string[] {
  const errs: string[] = [];
  const entries = new Map<MapId, { x: number; y: number }[]>();
  const queue: MapId[] = [];
  const add = (m: MapId, x: number, y: number) => {
    const list = entries.get(m) ?? [];
    if (list.some((e) => e.x === x && e.y === y)) return;
    list.push({ x, y });
    entries.set(m, list);
    queue.push(m);
  };
  add(world.newGame.map, world.newGame.x, world.newGame.y);
  // Scripted warps (cutscenes) are story entries.
  for (const cmds of Object.values(world.scripts)) eachCmd(cmds, (c) => { if (c.op === "warp") add(c.to, c.x, c.y); });
  while (queue.length) {
    const id = queue.shift()!;
    const map = world.maps[id];
    if (!map) continue;
    const reach = flood(grid(map), entries.get(id)!);
    for (const wp of map.warps) if (reach.has(`${wp.x},${wp.y}`)) add(wp.to, wp.toX, wp.toY);
  }

  for (const id of MAP_IDS) {
    const map = world.maps[id];
    if (!map) continue;
    const where = `[${id}] without PRUNE:`;
    const starts = entries.get(id);
    if (!starts) { errs.push(`${where} the map can't be reached`); continue; }
    const g = grid(map);
    for (const wp of map.warps) if (prunable(g.tile(wp.x, wp.y))) errs.push(`${where} a bramble sits on the warp at ${wp.x},${wp.y}`);
    if (PRUNE_OPTIONAL_MAPS.includes(id)) continue;
    // Only things reachable once brambles are cut are reported here (the rest
    // are plain reachability errors in validateWorld).
    const reach = flood(g, starts);
    const reachP = flood(grid(map, { pruned: true }), starts);
    const talk = (r: Set<string>) => (x: number, y: number) => DIRS.some(([dx, dy]) =>
      r.has(`${x + dx},${y + dy}`) || (g.tile(x + dx, y + dy) === "counter" && r.has(`${x + 2 * dx},${y + 2 * dy}`)));
    const behind = (now: boolean, later: boolean) => !now && later;
    for (const wp of map.warps) {
      if (behind(reach.has(`${wp.x},${wp.y}`), reachP.has(`${wp.x},${wp.y}`))) errs.push(`${where} warp at ${wp.x},${wp.y} is behind brambles`);
    }
    for (const t of map.triggers) {
      if (isTalkTrigger(g, t)) {
        if (behind(talk(reach)(t.x, t.y), talk(reachP)(t.x, t.y))) errs.push(`${where} trigger ${t.script} is behind brambles`);
        continue;
      }
      const cells: string[] = [];
      for (let dy = 0; dy < (t.h ?? 1); dy++) for (let dx = 0; dx < (t.w ?? 1); dx++) cells.push(`${t.x + dx},${t.y + dy}`);
      if (behind(cells.some((k) => reach.has(k)), cells.some((k) => reachP.has(k)))) {
        errs.push(`${where} trigger ${t.script} at ${t.x},${t.y} is behind brambles`);
      }
    }
    for (const s of map.signs) {
      if (behind(talk(reach)(s.x, s.y), talk(reachP)(s.x, s.y))) errs.push(`${where} sign at ${s.x},${s.y} is behind brambles`);
    }
    for (const n of map.npcs) {
      if (n.sprite === "item_pickup" || n.sprite === "harvest_bush" || isBoarder(n)) continue;
      if (behind(talk(reach)(n.x, n.y), talk(reachP)(n.x, n.y))) errs.push(`${where} npc ${n.id} is behind brambles`);
    }
  }

  // The PRUNING SHEARS must come from a map you can reach without them.
  const givers = MAP_IDS.filter((id) => {
    const m = world.maps[id];
    if (!m) return false;
    let gives = false;
    for (const sid of mapScripts(world, m)) eachCmd(world.scripts[sid], (c) => {
      if (c.op === "giveItem" && c.item === FIELD_MOVES.prune.item) gives = true;
    });
    return gives;
  });
  if (!givers.length) errs.push(`no map hands out the ${FIELD_MOVES.prune.item}`);
  for (const id of givers) if (!entries.has(id)) errs.push(`[${id}] gives the ${FIELD_MOVES.prune.item} but can't be reached without PRUNE`);
  return errs;
}

/** Walk every command, including nested branches. */
export function eachCmd(cmds: ScriptCmd[], fn: (c: ScriptCmd) => void) {
  for (const c of cmds) {
    fn(c);
    switch (c.op) {
      case "choice": c.branches.forEach((b) => eachCmd(b, fn)); break;
      case "yesno": eachCmd(c.yes, fn); eachCmd(c.no, fn); break;
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
  const stills = new Set<string>(STILLS);
  const species = new Set<string>(SPECIES_IDS);
  // Story items (the contract) plus everything the data owner defines (PLANT FOOD, ...).
  const items = new Set<string>([...REQUIRED_ITEMS, ...Object.keys(DATA.items ?? {})]);
  const music = new Set<string>(MUSIC);
  const marks = new Set<string>(MARKS);
  const sfx = new Set<string>(SFX);
  const jingles = new Set<string>(JINGLES);

  // Entry points per map: warp arrivals from elsewhere, scripted warps, new game.
  const entries = new Map<MapId, { x: number; y: number }[]>();
  const addEntry = (m: MapId, x: number, y: number) => {
    if (!entries.has(m)) entries.set(m, []);
    entries.get(m)!.push({ x, y });
  };
  addEntry(world.newGame.map, world.newGame.x, world.newGame.y);
  for (const m of Object.values(world.maps)) for (const w of m.warps) addEntry(w.to, w.toX, w.toY);
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
    } else if (!flood(g, entries.get(landing.map) ?? []).has(`${landing.x},${landing.y}`)) {
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
    const g = grid(map);

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
      const tg = grid(target);
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
        else if (n.sprite !== "item_pickup") errs.push(`${where} npc ${n.id} has nothing to say`);
        else if (!items.has(pickupItem(n.id))) errs.push(`${where} pickup ${n.id} gives unknown item ${pickupItem(n.id)}`);
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
    if (map.healPoint && !walkable(g, map.healPoint.x, map.healPoint.y)) errs.push(`${where} healPoint is solid`);

    // encounters
    for (const kind of ["grass", "bog"] as const) {
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
      if (!walkable(g, s.x, s.y)) errs.push(`${where} entry ${s.x},${s.y} is solid`);
    }
    // Everything is checked as eventually reachable (brambles cut); the
    // required-progress pass after this loop checks the world without PRUNE.
    const gp = grid(map, { pruned: true });
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
      const open = grid({ ...map, structures: map.structures.filter((s) => STRUCTURES[s.key]?.door) });
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

  errs.push(...checkProgressWithoutPrune(world));

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
