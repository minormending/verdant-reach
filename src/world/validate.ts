// Pure checks over WorldData: geometry, references, reachability and text fit.
// Used by world.test.ts and by the ?dev=world overview.

import {
  JINGLES, MAP_IDS, MARKS, MUSIC, REQUIRED_ITEMS, SFX, SPECIES_IDS, STRUCTURES, TILES, TEXTBOX,
} from "../contracts";
import type { Ambient, MapDef, MapId, ScriptCmd, TileKey, WorldData } from "../contracts";
import { pickupItem } from "./build";

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

export function grid(map: MapDef): Grid {
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
      return map.legend[map.tiles[y][x]];
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

/** Walk every command, including nested branches. */
export function eachCmd(cmds: ScriptCmd[], fn: (c: ScriptCmd) => void) {
  for (const c of cmds) {
    fn(c);
    switch (c.op) {
      case "choice": c.branches.forEach((b) => eachCmd(b, fn)); break;
      case "yesno": eachCmd(c.yes, fn); eachCmd(c.no, fn); break;
      case "if": case "ifTime": case "ifLastBattle":
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

export function validateWorld(world: WorldData): string[] {
  const errs: string[] = [];
  const species = new Set<string>(SPECIES_IDS);
  const items = new Set<string>(REQUIRED_ITEMS);
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
        if (n.sprite !== "item_pickup") errs.push(`${where} npc ${n.id} has nothing to say`);
        else if (!items.has(pickupItem(n.id))) errs.push(`${where} pickup ${n.id} gives unknown item ${pickupItem(n.id)}`);
      }
      if (n.script && !world.scripts[n.script]) errs.push(`${where} npc ${n.id} script ${n.script} missing`);
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
    const reach = flood(g, starts);
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

    // soft-lock: from every reachable tile some warp must still be reachable
    if (map.warps.length) {
      for (const k of reach) {
        const [x, y] = k.split(",").map(Number);
        const out = flood(g, [{ x, y }]);
        if (!map.warps.some((wp) => out.has(`${wp.x},${wp.y}`))) {
          errs.push(`${where} soft-lock: no exit from ${x},${y}`);
          break;
        }
      }
    } else errs.push(`${where} has no warps`);
  }

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
      case "warp": {
        const m = world.maps[c.to];
        if (!m) errs.push(`${at} warp to missing map ${c.to}`);
        else if (!walkable(grid(m), c.x, c.y)) errs.push(`${at} warp lands on solid ${c.to} ${c.x},${c.y}`);
        break;
      }
    }
  });
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
