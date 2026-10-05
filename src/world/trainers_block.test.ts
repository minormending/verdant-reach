// Trainers that spot you walk up to you and stay where the battle happened.
// For every trainer, on every map, this simulates each place it could end up
// (one tile short of each spot in its line of sight) and checks the trainer
// never seals off anything you could reach from where you were spotted:
// warps, triggers, signs and other NPCs (talk range, counters included).

import { describe, expect, it } from "vitest";
import type { Dir, MapDef } from "../contracts";
import { WORLD } from "./index";
import { flood, grid, walkable, type Grid } from "./validate";

const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRS = Object.values(STEP);

/** The grid with extra solid tiles (a trainer standing somewhere). */
const withBlocked = (g: Grid, blocked: Set<string>): Grid => ({
  ...g,
  structureSolid: (x, y) => g.structureSolid(x, y) || blocked.has(`${x},${y}`),
});

function targets(m: MapDef, g: Grid, skip: string) {
  const out: { what: string; ok: (reach: Set<string>) => boolean }[] = [];
  const at = (x: number, y: number) => (r: Set<string>) => r.has(`${x},${y}`);
  const talk = (x: number, y: number) => (r: Set<string>) => DIRS.some(([dx, dy]) =>
    r.has(`${x + dx},${y + dy}`) || (g.tile(x + dx, y + dy) === "counter" && r.has(`${x + 2 * dx},${y + 2 * dy}`)));
  for (const w of m.warps) out.push({ what: `warp ${w.x},${w.y}`, ok: at(w.x, w.y) });
  for (const t of m.triggers) {
    const cells: [number, number][] = [];
    for (let dy = 0; dy < (t.h ?? 1); dy++) for (let dx = 0; dx < (t.w ?? 1); dx++) cells.push([t.x + dx, t.y + dy]);
    out.push({ what: `trigger ${t.script}`, ok: (r) => cells.some(([x, y]) => r.has(`${x},${y}`)) });
  }
  for (const s of m.signs) out.push({ what: `sign ${s.x},${s.y}`, ok: talk(s.x, s.y) });
  for (const n of m.npcs) if (n.id !== skip) out.push({ what: `npc ${n.id}`, ok: talk(n.x, n.y) });
  return out;
}

function problems(m: MapDef): string[] {
  const errs: string[] = [];
  const g = grid(m);
  for (const tr of m.npcs.filter((n) => n.trainer)) {
    const [dx, dy] = STEP[tr.facing];
    const sight = tr.sight ?? 4;
    const others = new Set(m.npcs.filter((n) => n !== tr && !n.trainer).map((n) => `${n.x},${n.y}`));
    for (let d = 1; d <= sight; d++) {
      const px = tr.x + dx * d, py = tr.y + dy * d;
      // The line of sight stops at anything solid.
      if (!walkable(g, px, py) || others.has(`${px},${py}`)) break;
      const end = `${tr.x + dx * (d - 1)},${tr.y + dy * (d - 1)}`;
      const before = flood(withBlocked(g, new Set([`${tr.x},${tr.y}`])), [{ x: px, y: py }]);
      const after = flood(withBlocked(g, new Set([end])), [{ x: px, y: py }]);
      for (const t of targets(m, g, tr.id)) {
        if (t.ok(before) && !t.ok(after)) {
          errs.push(`[${m.id}] ${tr.id} spotting you at ${px},${py} ends at ${end} and cuts off ${t.what}`);
        }
      }
    }
  }
  return errs;
}

describe("trainer approaches", () => {
  it("never leave a beaten trainer blocking the way", () => {
    expect(Object.values(WORLD.maps).flatMap(problems)).toEqual([]);
  });

  it("catches a trainer that ends up in a one-tile corridor", () => {
    const m = structuredClone(WORLD.maps.sugarbush_grove);
    // Narrow the grove's approach avenue back to one tile and face grunt 3 down it.
    m.tiles = m.tiles.map((r, y) => (y === 7 ? r.slice(0, 6) + "MMMMMMM" + r.slice(13) : r));
    const g3 = m.npcs.find((n) => n.id === "grunt3")!;
    Object.assign(g3, { x: 14, y: 8, facing: "left", sight: 4 });
    expect(problems(m).join("\n")).toMatch(/grunt3 .* cuts off/);
  });
});
