import { describe, expect, it } from "vitest";
import { type MapId, type TileKey } from "../contracts";
import { buildMap, DIRS, isWalkable, refreshLegend, tileAt, tileProps, type MapRuntime } from "../overworld/map";
import { WORLD } from "./index";

// The Chapter 11 environment pass gives every Council room its own interior
// (and dresses the lobby and the fellowship room); the Council run plays
// exactly as before. Digests were taken from the stand-in maps before the
// pass (branch ch11), when every seat room was the same bare template.

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// What a tile does, not how it looks.
const role = (t: TileKey) => {
  const p = tileProps(t);
  return [p.walk ? "walk" : "solid", p.encounter ?? "", p.water ? "water" : "", p.ledge ?? "", p.fieldMove ?? "",
    p.interact ? "interact" : ""].join(":");
};

// Warps, triggers, NPCs (cells, sprites, scripts, conditions), signs, the heal
// point, onEnter/onWhiteout, music, the flag swaps (by role) and the size.
function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers, npcs: m.npcs, signs: m.signs, hidden: m.hidden ?? [],
    encounters: m.encounters ?? null, music: m.music, musicWhen: m.musicWhen ?? null,
    onEnter: m.onEnter ?? null, onWhiteout: m.onWhiteout ?? null, healPoint: m.healPoint ?? null,
    legendWhen: (m.legendWhen ?? []).map((o) => ({ when: o.when, legend: Object.fromEntries(Object.entries(o.legend).map(([ch, t]) => [ch, role(t)])) })),
    outdoor: m.outdoor, size: [m.tiles[0].length, m.tiles.length],
  });
}

// Re-pinned at integration: the seat rooms now play the "council" theme and
// the Council and ROWAN stand on their own sprites (gameplay unchanged).
// council_hall re-pinned on postgame: the post-game ROWAN (pg_wanderers)
// stands in the lobby at (10,7) once game_cleared is set.
const FROZEN: [MapId, string][] = [
  ["council_hall", "6230ae235b3a84d7dd6339eb6a6a2166fdeacb77163a22a2a696d405bd784a47"],
  ["council_1", "7f5d478118c7a9438761d3a21ec87667b4d2ad1c5d35aae05f27e5529b6a8e78"],
  ["council_2", "94343372cc28d4287defaa32be24edd1200144a2bcf7704bc1ef253d90da37f8"],
  ["council_3", "2bed6660dba6562fa90043e2324844953e86c6e537bd8e748102ddd3395b5ee2"],
  ["council_4", "d04f6f3579ce4b604bc32efb0692518ec1545493cf648de7e3ab00393e4bb7fc"],
  ["keeper_hall", "42c91d20d585b6d06bf0ebfa2e8c17f37a8e9722bb1326ed0eeb5672a8736718"],
  ["fellowship_hall", "0b9ffb1cdce7d90ce37dd2d124c188f09b2fcce516be914cca95d9f1a9641837"],
];

function runtime(id: MapId, flags: Record<string, boolean> = {}): MapRuntime {
  const m = buildMap(WORLD.maps[id]);
  refreshLegend(m, flags);
  return m;
}

/** Cells reachable on foot from `start`, NPC cells blocked (the seat holder stands still). */
function reach(id: MapId, flags: Record<string, boolean>, start: { x: number; y: number }): Set<string> {
  const m = runtime(id, flags);
  const npcs = new Set(WORLD.maps[id].npcs.map((n) => `${n.x},${n.y}`));
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [[start.x, start.y]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const { dx, dy } of Object.values(DIRS)) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && !npcs.has(k) && isWalkable(m, x + dx, y + dy)) {
        seen.add(k);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  return seen;
}

// [room, seat holder, win flag, entry cell, stair cell, next room]
const RUN: [MapId, string, string, [number, number], [number, number], MapId][] = [
  ["council_1", "belladonna", "beat_council_1", [5, 10], [5, 0], "council_2"],
  ["council_2", "mimi_osa", "beat_council_2", [5, 10], [5, 0], "council_3"],
  ["council_3", "titus_arum", "beat_council_3", [5, 10], [5, 0], "council_4"],
  ["council_4", "pyra", "beat_council_4", [5, 10], [5, 0], "keeper_hall"],
  ["keeper_hall", "rowan", "beat_keeper", [6, 14], [6, 0], "fellowship_hall"],
];

describe("Chapter 11 environment keeps the Council run", () => {
  for (const [id, digest] of FROZEN) {
    it(`freezes ${id} warps, triggers, NPCs, legendWhen, onEnter/onWhiteout and music`, async () => {
      expect(await sha(gameplay(id))).toBe(digest);
    });
  }

  it("arrives every seat on its entry cell, facing up, from the room before", () => {
    for (const [id, , , [ex, ey]] of RUN) {
      const into = Object.values(WORLD.maps).flatMap((m) => m.warps.filter((w) => w.to === id));
      expect(into.length, id).toBeGreaterThan(0);
      for (const w of into) expect([w.toX, w.toY, w.facing], id).toEqual([ex, ey, "up"]);
    }
  });

  for (const [id, holder, win, [ex, ey], [sx, sy], next] of RUN) {
    it(`${id}: entry -> ${holder} -> stair stays reachable, and the stair opens only on ${win}`, () => {
      const m = WORLD.maps[id];
      const npc = m.npcs.find((n) => n.id === holder)!;
      expect([npc.x, npc.y, npc.facing]).toEqual([sx, 3, "down"]);
      expect(m.tiles[sy][sx]).toBe("N");
      expect(m.warps.find((w) => w.x === sx && w.y === sy)?.to).toBe(next);
      for (const beaten of [false, true]) {
        const flags = { council_run: true, [win]: beaten };
        const rt = runtime(id, flags);
        expect(tileAt(rt, sx, sy), `${id} stair beaten=${beaten}`).toBe(beaten ? "stairs_up" : "wall");
        const r = reach(id, flags, { x: ex, y: ey });
        // The seat holder can be faced from the floor in front of them.
        expect(r.has(`${npc.x},${npc.y + 1}`), `${id} talk cell`).toBe(true);
        expect(r.has(`${sx},${sy}`), `${id} stair reachable beaten=${beaten}`).toBe(beaten);
        // No way back mid-run: the bottom row is solid during the run.
        for (let x = 0; x < rt.w; x++) expect(isWalkable(rt, x, rt.h - 1), `${id} bottom ${x}`).toBe(false);
      }
    });
  }

  it("council_1's door to the lobby closes for the run and opens outside it", () => {
    const m = WORLD.maps.council_1;
    expect(m.tiles[11][5]).toBe("E");
    expect(m.warps.find((w) => w.x === 5 && w.y === 11)).toMatchObject({ to: "council_hall", toX: 7, toY: 1, facing: "down" });
    expect(isWalkable(runtime("council_1", { council_run: true }), 5, 11)).toBe(false);
    expect(isWalkable(runtime("council_1", { council_run: false }), 5, 11)).toBe(true);
    expect(reach("council_1", { council_run: false }, { x: 5, y: 10 }).has("5,11")).toBe(true);
  });

  it("keeps the lobby's counters, heal point, stair and doors in reach", () => {
    const m = WORLD.maps.council_hall;
    for (const flags of [{ ch10_done: false }, { ch10_done: true }]) {
      const rt = runtime("council_hall", flags), r = reach("council_hall", flags, { x: 7, y: 10 });
      expect(r.has("2,4"), "heal point").toBe(true);
      expect(tileAt(rt, 2, 3)).toBe("counter");
      expect(tileAt(rt, 13, 3)).toBe("counter");
      expect(r.has("13,4"), "market").toBe(true);
      expect(r.has("7,11"), "door").toBe(true);
      expect(r.has("7,0"), `stair ch10_done=${flags.ch10_done}`).toBe(flags.ch10_done);
      expect(reach("council_hall", flags, { x: 7, y: 1 }).has("7,10"), "back from council_1").toBe(true);
    }
    // Post-game: ROWAN (pg_wanderers) joins the lobby once game_cleared is set.
    expect(m.npcs.map((n) => [n.id, n.x, n.y])).toEqual([["rowan", 10, 7], ["keeper", 2, 2], ["clerk", 13, 2]]);
  });

  it("keeps the fellowship room's arrival, NPCs and exit open", () => {
    const m = WORLD.maps.fellowship_hall, r = reach("fellowship_hall", { game_cleared: true }, { x: 4, y: 6 });
    expect(r.has("4,7")).toBe(true);
    for (const n of m.npcs) expect(Object.values(DIRS).some(({ dx, dy }) => r.has(`${n.x + dx},${n.y + dy}`)), n.id).toBe(true);
  });
});
