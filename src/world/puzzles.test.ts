// The Conservatory puzzles: hedge gates + levers (BRAMBLEGATE) and valves +
// flooding channels (SUGARBUSH). validateWorld ignores NPC gates and
// legendWhen, so this file walks the real state space: (position, puzzle
// flags), stepping one tile at a time and "talking" to any lever or valve next
// to the player. For every reachable state, it checks that the exit and the
// leader are both still reachable, so the puzzles have no soft-locks.

import { describe, expect, it } from "vitest";
import type { Cond, MapDef, MapId, NpcDef, ScriptCmd, TileKey } from "../contracts";
import { WORLD } from "./index";
import { grid, walkable } from "./validate";

type Flags = Record<string, boolean>;

const holds = (c: Cond | undefined, f: Flags) => !c || c.every((x) => (f[x.flag] ?? false) === x.is);

/** The map as the engine sees it under these flags (legendWhen: first match wins per char). */
function mapUnder(m: MapDef, f: Flags): MapDef {
  const legend: Record<string, TileKey> = { ...m.legend };
  const set = new Set<string>();
  for (const o of m.legendWhen ?? []) {
    if (!holds(o.when, f)) continue;
    for (const [ch, t] of Object.entries(o.legend)) if (!set.has(ch)) { legend[ch] = t; set.add(ch); }
  }
  return { ...m, legend };
}

/** Run the flag effects of a script (if / setFlag / call), ignoring everything else. */
function runFlags(cmds: ScriptCmd[], f: Flags): Flags {
  const out = { ...f };
  const run = (list: ScriptCmd[]) => {
    for (const c of list) {
      if (c.op === "setFlag") out[c.flag] = c.value ?? true;
      else if (c.op === "if") run(holds(c.when, out) ? c.then : c.else ?? []);
      else if (c.op === "call") run(WORLD.scripts[c.script]);
    }
  };
  run(cmds);
  return out;
}

const isSwitch = (n: NpcDef) => n.sprite === "lever" || n.sprite === "valve";
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;

interface Puzzle {
  map: MapId;
  flags: string[];
  leader: string;
}

function explore(p: Puzzle) {
  const m = WORLD.maps[p.map];
  const start = { x: m.warps[0].x, y: m.warps[0].y - 1 };
  const leader = m.npcs.find((n) => n.id === p.leader)!;
  const switches = m.npcs.filter(isSwitch);
  const fkey = (f: Flags) => p.flags.map((k) => (f[k] ? 1 : 0)).join("");
  const key = (x: number, y: number, f: Flags) => `${x},${y}|${fkey(f)}`;

  const cache = new Map<string, (x: number, y: number) => boolean>();
  const passable = (f: Flags) => {
    const k = fkey(f);
    if (!cache.has(k)) {
      const g = grid(mapUnder(m, f));
      // Visible NPCs block (gates, trainers at home, switches); item pickups don't count.
      const blocked = new Set(m.npcs.filter((n) => n.sprite !== "item_pickup" && holds(n.visibleWhen, f)).map((n) => `${n.x},${n.y}`));
      cache.set(k, (x, y) => walkable(g, x, y) && !blocked.has(`${x},${y}`));
    }
    return cache.get(k)!;
  };

  type S = { x: number; y: number; f: Flags };
  const next = (s: S): S[] => {
    const out: S[] = [];
    const ok = passable(s.f);
    for (const [dx, dy] of DIRS) if (ok(s.x + dx, s.y + dy)) out.push({ x: s.x + dx, y: s.y + dy, f: s.f });
    for (const sw of switches) {
      if (Math.abs(sw.x - s.x) + Math.abs(sw.y - s.y) === 1) out.push({ ...s, f: runFlags(WORLD.scripts[sw.script!], s.f) });
    }
    return out;
  };
  const bfs = (from: S) => {
    const seen = new Map<string, S>([[key(from.x, from.y, from.f), from]]);
    const q = [from];
    while (q.length) for (const n of next(q.shift()!)) {
      const k = key(n.x, n.y, n.f);
      if (!seen.has(k)) { seen.set(k, n); q.push(n); }
    }
    return [...seen.values()];
  };
  const atExit = (s: S) => m.warps.some((w) => w.x === s.x && w.y === s.y);
  const byLeader = (s: S) => Math.abs(leader.x - s.x) + Math.abs(leader.y - s.y) === 1;

  const init: S = { ...start, f: {} };
  const reach = bfs(init);
  return { m, init, reach, bfs, atExit, byLeader, switches, passable };
}

const PUZZLES: Puzzle[] = [
  { map: "bramblegate_conservatory", flags: ["bgc_lever_1", "bgc_lever_2"], leader: "hollis" },
  { map: "sugarbush_conservatory", flags: ["sbc_valve_1", "sbc_valve_2"], leader: "nell" },
];

describe.each(PUZZLES)("conservatory puzzle: $map", (p) => {
  const e = explore(p);

  it("uses switch NPCs named after the flag they drive", () => {
    expect(e.switches.length).toBe(p.flags.length);
    for (const sw of e.switches) {
      expect(sw.id).toBe(`${sw.sprite}:${sw.id.split(":")[1]}`);
      expect(p.flags).toContain(sw.id.split(":")[1]);
    }
  });

  it("is a real puzzle: the leader can't be reached without the switches", () => {
    const g = e.passable({});
    const seen = new Set<string>([`${e.init.x},${e.init.y}`]);
    const q = [[e.init.x, e.init.y]];
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [dx, dy] of DIRS) {
        const k = `${x + dx},${y + dy}`;
        if (!seen.has(k) && g(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
      }
    }
    const m = WORLD.maps[p.map];
    const l = m.npcs.find((n) => n.id === p.leader)!;
    expect(DIRS.some(([dx, dy]) => seen.has(`${l.x + dx},${l.y + dy}`))).toBe(false);
  });

  it("can be solved from the entrance", () => {
    expect(e.reach.some(e.byLeader)).toBe(true);
  });

  it("never soft-locks: from every reachable state, the exit and the leader stay reachable", () => {
    for (const s of e.reach) {
      const from = e.bfs(s);
      expect(from.some(e.atExit), `stuck at ${s.x},${s.y} ${JSON.stringify(s.f)}`).toBe(true);
      expect(from.some(e.byLeader), `leader lost at ${s.x},${s.y} ${JSON.stringify(s.f)}`).toBe(true);
    }
  });

  it("reaches every trainer and pickup in some state", () => {
    for (const n of e.m.npcs.filter((n) => n.trainer || n.sprite === "item_pickup")) {
      expect(e.reach.some((s) => Math.abs(n.x - s.x) + Math.abs(n.y - s.y) <= 1), n.id).toBe(true);
    }
  });
});

describe("conservatory puzzle details", () => {
  it("BRAMBLEGATE: pulling lever 1 first leads west, but HOLLIS's gate shuts", () => {
    const m = WORLD.maps.bramblegate_conservatory;
    const f = runFlags(WORLD.scripts.bgc_lever_1, {});
    expect(f.bgc_lever_1).toBe(true);
    const gate = (id: string) => m.npcs.find((n) => n.id === id)!;
    expect(holds(gate("gate_a").visibleWhen, f)).toBe(false); // open
    expect(holds(gate("gate_c").visibleWhen, f)).toBe(true);  // shut
    expect(runFlags(WORLD.scripts.bgc_lever_1, f).bgc_lever_1).toBe(false); // toggles back
  });
  it("SUGARBUSH: valve 1 always floods exactly one of the two lower channels", () => {
    const m = WORLD.maps.sugarbush_conservatory;
    for (const on of [false, true]) {
      const t = mapUnder(m, { sbc_valve_1: on }).legend;
      expect([t.d, t.i].filter((x) => x === "water_channel").length).toBe(1);
    }
  });
});
