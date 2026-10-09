import { describe, expect, it } from "vitest";
import { STRUCTURES, type MapId, type TileKey } from "../contracts";
import { buildMap, checkCond, isWalkable, refreshLegend, tileAt, tileProps, type MapRuntime } from "../overworld/map";
import { WORLD } from "./index";

// The Chapter 8 environment pass dresses the Root Relay; gameplay stays frozen.
// Digests were taken from the stand-in maps before the pass (branch ch8).

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// The lobby's banners are a cosmetic swap (wall <-> banner, both solid) during the takeover.
const isBannerSwap = (legend: Record<string, TileKey>) => Object.values(legend).every((t) => t === "rootstock_banner");

// Warps, triggers, NPCs (positions, sprites, scripts, trainers, sight), hidden
// items, door cells, encounter tables, music and the existing flag swaps.
function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  const legendWhen = (m.legendWhen ?? []).filter((o) => !isBannerSwap(o.legend));
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers, npcs: m.npcs, hidden: m.hidden ?? [],
    doors: m.structures.filter((s) => STRUCTURES[s.key].door)
      .map((s) => [s.x + STRUCTURES[s.key].door!.x, s.y + STRUCTURES[s.key].door!.y]),
    encounters: m.encounters ?? null, encountersWhen: m.encountersWhen ?? null,
    music: m.music, musicWhen: m.musicWhen ?? null, onEnter: m.onEnter ?? null,
    healPoint: m.healPoint ?? null, legendWhen: legendWhen.length ? legendWhen : null,
    outdoor: m.outdoor, size: [m.tiles[0].length, m.tiles.length],
  });
}

// Digests re-pinned after the lead's merge: the lobby and 2F/3F gained the
// relay_seized musicWhen and the roof's MERCER uses his own sprite (both
// intended); everything else is as frozen before the dressing pass.
const GAMEPLAY: [MapId, string][] = [
  ["glasshouse_relay", "a6b37710010ad3a50a6c8ed84db3146438c440e6b7e36199c095d8a1f110204a"],
  ["relay_2f", "abda73cd3c68b755968e015be9f0a64af1b852ad0d652ddc01c243d36a986ce7"],
  ["relay_3f", "84916ca3f21575e72c5b57071aefc653a83d10f64cf6df9707527c5f7590918f"],
  ["relay_roof", "2d859404a557e8c4f9f54af55731507f5cad59ff30d0729a54f499417b75ff61"],
];

const TAKEOVER = { ch8_started: true, got_keycard: true, ch8_takeover: true, beat_wren: false, relay_patched: false };
const FLOORS: MapId[] = ["relay_2f", "relay_3f", "relay_roof"];
const NEW_TILES: TileKey[] = ["cable_trunk", "relay_terminal", "roof_vent", "roof_glass", "rootstock_banner"];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

function runtime(id: MapId, flags: Record<string, boolean>): MapRuntime {
  const m = buildMap(WORLD.maps[id]);
  refreshLegend(m, flags);
  return m;
}

// Every walkable cell, flooded from the floor's arrival cells (ignoring NPCs).
function reach(m: MapRuntime, id: MapId): Set<string> {
  const starts = Object.values(WORLD.maps).flatMap((o) => o.warps.filter((w) => w.to === id).map((w) => [w.toX, w.toY] as const));
  const seen = new Set(starts.map(([x, y]) => `${x},${y}`));
  const queue = [...starts];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && isWalkable(m, nx, ny)) { seen.add(k); queue.push([nx, ny]); }
    }
  }
  return seen;
}

// The lobby before the pass: the banners replace two plain wall cells only.
const LOBBY_BEFORE = [
  "WOOWWOOWWWWOOWWOOW", "W[[x/xxx//xxx/x[[W", "W[//////////////[W", "W////////////////W", "W//x///xxxx///x//W",
  "WhD/////////////pW", "WWWWWWW//WWWW/WWWW", "WKKKiiiiiii[WUW[[W", "Wiiiiiiiiiii[W[//W", "WpiiDDiiiiii//i//W",
  "WhiiDDiiiiii[[i[[W", "WiiiiiiiiiiiiiiiiW", "WYiCCCCiiiiiiii!pW", "WpiiiiiiirriiiiipW", "WWWWWWWWWEEWWWWWWW",
];
const BANNERS = [[5, 6], [10, 6]] as const;

describe("Chapter 8 environment keeps gameplay", () => {
  for (const [id, expected] of GAMEPLAY) {
    it(`freezes ${id} warps, triggers, NPCs, items, music and flag swaps`, async () => {
      expect(await sha(gameplay(id))).toBe(expected);
    });
  }

  it("hangs the lobby banners only while ROOTSTOCK holds the Relay, on plain wall otherwise", () => {
    expect(WORLD.maps.glasshouse_relay.tiles.map((row, y) => [...row].map((c, x) =>
      BANNERS.some(([bx, by]) => bx === x && by === y) ? "W" : c).join(""))).toEqual(LOBBY_BEFORE);
    for (const started of [false, true]) for (const beaten of [false, true]) {
      const m = runtime("glasshouse_relay", { ch8_started: started, beat_wren: beaten, got_keycard: true });
      for (const [x, y] of BANNERS) {
        expect(tileAt(m, x, y)).toBe(started && !beaten ? "rootstock_banner" : "wall");
        expect(isWalkable(m, x, y)).toBe(false);
      }
    }
  });

  it("adds only solid scenery: the new tiles never carry walk, water or encounters", () => {
    for (const t of NEW_TILES) expect(tileProps(t)).toEqual({ walk: false });
  });

  for (const id of FLOORS) {
    it(`${id}: every floor cell stays reachable and every actor and trigger stands on open floor`, () => {
      for (const patched of [false, true]) {
        const m = runtime(id, { ...TAKEOVER, relay_patched: patched });
        const seen = reach(m, id);
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
          if (isWalkable(m, x, y)) expect(seen.has(`${x},${y}`), `${id} ${x},${y}`).toBe(true);
        }
        const def = WORLD.maps[id];
        for (const n of def.npcs) expect(isWalkable(m, n.x, n.y), n.id).toBe(true);
        for (const w of def.warps) if (w.to !== "relay_roof" || patched) expect(seen.has(`${w.x},${w.y}`), `${w.to}`).toBe(true);
        for (const t of def.triggers) {
          const solid = !isWalkable(m, t.x, t.y);
          // Talk triggers (the note, the consoles) sit on a solid prop with open floor beside it.
          if (solid) expect(DIRS.some(([dx, dy]) => seen.has(`${t.x + dx},${t.y + dy}`)), t.script).toBe(true);
          else expect(seen.has(`${t.x},${t.y}`), t.script).toBe(true);
        }
      }
    });

    it(`${id}: every grunt still sees down an open lane`, () => {
      const m = runtime(id, TAKEOVER);
      for (const n of WORLD.maps[id].npcs.filter((q) => q.trainer && checkCond(q.visibleWhen, TAKEOVER))) {
        const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[n.facing];
        for (let i = 1; i <= (n.sight ?? 4); i++) expect(isWalkable(m, n.x + dx * i, n.y + dy * i), `${n.id} +${i}`).toBe(true);
      }
    });
  }

  it("keeps the story props where the scripts expect them", () => {
    const hall = runtime("relay_2f", TAKEOVER);
    expect(tileAt(hall, 9, 1)).toBe("workbench");
    expect(tileAt(hall, 14, 9)).toBe("server_rack");   // the hidden SPRING WATER
    expect([tileAt(hall, 17, 2), tileAt(hall, 2, 12)]).toEqual(["stairs_up", "stairs_down"]);
    const bay = runtime("relay_3f", TAKEOVER);
    expect([5, 8, 11].map((x) => tileAt(bay, x, 1))).toEqual(["console", "console", "console"]);
    expect([5, 8, 11].every((x) => isWalkable(bay, x, 2))).toBe(true);
    expect(WORLD.maps.relay_3f.tiles.join("").split("U")).toHaveLength(2);
    expect(WORLD.maps.relay_3f.legendWhen).toEqual([{ when: [{ flag: "relay_patched", is: false }], legend: { U: "wall" } }]);
    for (const patched of [false, true]) expect(tileAt(runtime("relay_3f", { relay_patched: patched }), 15, 2)).toBe(patched ? "stairs_up" : "wall");
  });

  it("rings the roof with railing over the dome glass, the mast at its place", () => {
    const def = WORLD.maps.relay_roof, roof = runtime("relay_roof", TAKEOVER);
    expect(def.border).toBe("roof_glass");
    expect(def.structures).toEqual([{ key: "relay_mast", x: 7, y: 3 }]);
    for (let y = 0; y < roof.h; y++) for (let x = 0; x < roof.w; x++) {
      const edge = x === 0 || y === 0 || x === roof.w - 1 || y === roof.h - 1;
      if (edge) expect(tileAt(roof, x, y), `${x},${y}`).toBe("iron_railing");
    }
    expect(tileAt(roof, -1, 5)).toBe("roof_glass");
    // WREN's and MERCER's walk east, cell by cell to the railing.
    for (let x = 8; x < roof.w - 1; x++) expect(isWalkable(roof, x, 6)).toBe(true);
    for (let x = 9; x < roof.w - 1; x++) expect(isWalkable(roof, x, 5)).toBe(true);
    expect(tileAt(roof, 2, 10)).toBe("stairs_down");
  });
});
