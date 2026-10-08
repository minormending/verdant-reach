import { describe, expect, it } from "vitest";
import { STRUCTURES, type MapId } from "../contracts";
import { buildMap, DIRS, isWalkable, tileAt, tileProps, tryMove } from "../overworld/map";
import { WORLD } from "./index";
import { flood, grid } from "./validate";

// The Chapter 9 environment pass dresses the desert, the canyon and the ridge;
// gameplay stays frozen. Digests were taken from the stand-in maps before the
// pass (branch ch9).

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// Warps, triggers, NPCs (positions, sprites, scripts, trainers, sight), hidden
// items, door cells, encounter tables, music, flag swaps and the map size.
function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers, npcs: m.npcs, hidden: m.hidden ?? [],
    doors: m.structures.filter((s) => STRUCTURES[s.key].door)
      .map((s) => [s.x + STRUCTURES[s.key].door!.x, s.y + STRUCTURES[s.key].door!.y]),
    encounters: m.encounters ?? null, encountersWhen: m.encountersWhen ?? null,
    music: m.music, musicWhen: m.musicWhen ?? null, onEnter: m.onEnter ?? null,
    healPoint: m.healPoint ?? null, legendWhen: m.legendWhen ?? null,
    outdoor: m.outdoor, ambient: m.ambient ?? null, size: [m.tiles[0].length, m.tiles.length],
  });
}

// [map, gameplay digest, encounter-footprint digest]
const FROZEN: [MapId, string, string][] = [
  ["route_10", "f4170cbaa0444b577e3d6ddd0b9e27a2c87140bb936b036f6fcde2f0e504854f", "a51689675d7b437f21975da4369568a29eb997396b6e10701d8a865f3c9c8dfe"],
  ["thistledown", "15bb77944cbf1629be08935b28cffa0a4924e3fb63ee2a6fa8098d7df67afcbc", "ab97e4c31a6e757201e3cb09a55357147a11595d4a273ba06f755047fee8f12b"],
  ["thistledown_greenhouse", "e47adb4dc906a94a2f0a8037eff88687ed26d69c3ac3727da56e8f43f27c2234", "7842ea36364692b6e923afa8e8e80906d45e5e19f2520aced6536917938bec15"],
  ["thistledown_market", "a559396e41e304f9d7db087e3b73d053ec685ea2b00f33129f5370dfaf705627", "9034e68187715ea45ec6240e58fe652786fcc270d09db3362678e46b1e232167"],
  ["thistledown_house", "c2dfce242a1a5a1762fe9b0e317bd06f7dedfecc3fc746e32922000f06854eeb", "5be59d365acb8d35446f682c6d314fffd5db5846ab8c6eb021e6bacd98a82aa0"],
  ["route_11", "0a8193b9bae05edc599d03778b848cd512f7ad4093c838aa75b2c5c10d26333c", "776a355ca15d1a3687d74231f88ba26ab8d4666eb0c42d25b54c34216c7fe5f8"],
  ["sanguine_greenhouse", "b01fa45041ad3ac8ad9f0a1392068429d82b4b42dcffc1237df5535a28ad2b11", "7842ea36364692b6e923afa8e8e80906d45e5e19f2520aced6536917938bec15"],
  ["sanguine_ridge", "5e59ef7772688f38ca9d260ee8707973008cd3a5c1a1e8224f87070ec69c3ef9", "a33e216780b14d5b358065dd769231e600e3c98ee45816d36b2c12de51bca70f"],
  ["sanguine_conservatory", "5d1f5fd075ebdd36261a7c552a37bdb33c96bc1e91d0ea015476d5c5d048d911", "19ed3692e952a3d029fee42e0a01e3aa84aaedf44919c6a64c3f1f5fc4e8aac0"],
];

// Encounter footprint: one character per cell, the encounter kind or "-".
function encounterCells(id: MapId): string {
  const m = buildMap(WORLD.maps[id]);
  let s = "";
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) s += tileProps(tileAt(m, x, y)).encounter ?? "-";
  return s;
}

// Movement classes in a rectangle: "p" pit, "~" water, "g" encounter, "." walkable, "#" blocked.
function cells(id: MapId, x0 = 0, y0 = 0, x1?: number, y1?: number): string {
  const m = buildMap(WORLD.maps[id]);
  let s = "";
  for (let y = y0; y <= (y1 ?? m.h - 1); y++) {
    for (let x = x0; x <= (x1 ?? m.w - 1); x++) {
      const t = tileAt(m, x, y), p = tileProps(t);
      s += t === "pit" ? "p" : p.water ? "~" : !isWalkable(m, x, y) ? "#" : p.encounter ? "g" : ".";
    }
    s += "\n";
  }
  return s;
}

/** Every arrival point on a map: the far side of each warp that leads here. */
const arrivals = (id: MapId) => Object.values(WORLD.maps).flatMap((o) => o.warps.filter((w) => w.to === id).map((w) => ({ x: w.toX, y: w.toY })));

const OUTDOOR: MapId[] = ["route_10", "thistledown", "route_11", "sanguine_ridge"];

describe("Chapter 9 environment keeps gameplay", () => {
  for (const [id, play, enc] of FROZEN) {
    it(`freezes ${id} warps, triggers, NPCs, items, encounters and its encounter footprint`, async () => {
      expect(await sha(gameplay(id))).toBe(play);
      expect(await sha(encounterCells(id))).toBe(enc);
    });
  }

  it("keeps the BOULDER PITS hall cell for cell", async () => {
    expect(await sha(cells("sanguine_conservatory"))).toBe("ca32dcf8ca6e59b4366cb38a52e6b2e8357bc88eefb2b98535e4d687ffa05c02");
    const m = WORLD.maps.sanguine_conservatory;
    expect(m.npcs.filter((n) => n.pushable).map((n) => [n.x, n.y])).toEqual([[8, 15], [8, 11], [8, 7], [6, 17]]);
  });

  it("keeps Route 11's root-gap side ledge and its hidden RAIN JAR exactly", async () => {
    expect(await sha(cells("route_11", 18, 31, 27, 39))).toBe("b34293bd8689967c8682b05e624789ea06917d355297741f04f616caa5963998");
    expect(tileAt(buildMap(WORLD.maps.route_11), 19, 35)).toBe("root_gap");
  });

  it("keeps BRAM's switchback: the one pass north runs over his trigger, and his lane is clear", () => {
    const m = WORLD.maps.route_11, rt = buildMap(m), g = grid(m);
    expect(m.tiles[28].split("").map((_, x) => isWalkable(rt, x, 28) ? "." : "#").join("")).toBe("#############..#############");
    const trig = m.triggers.find((t) => t.script === "rival_5")!;
    const cellsOf = [0, 1].map((dx) => ({ x: trig.x + dx, y: trig.y }));
    for (const c of cellsOf) expect(isWalkable(rt, c.x, c.y)).toBe(true);
    // With the trigger cells walled off, nothing north of the step is reachable from Thistledown.
    const blocked = { ...g, structureSolid: (x: number, y: number) => g.structureSolid(x, y) || cellsOf.some((c) => c.x === x && c.y === y) };
    const reach = flood(blocked, [{ x: 13, y: 54 }]);
    expect([...reach].some((k) => Number(k.split(",")[1]) <= 28)).toBe(false);
    for (let y = 17; y <= 27; y++) expect(isWalkable(rt, 15, y), `lane 15,${y}`).toBe(true);
  });

  it("keeps the tumbleweed's lane across Thistledown clear", () => {
    const rt = buildMap(WORLD.maps.thistledown);
    const weed = WORLD.maps.thistledown.npcs.find((n) => n.id === "tumbleweed_sighting")!;
    expect([weed.x, weed.y]).toEqual([3, 17]);
    for (let x = 3; x < rt.w - 1; x++) expect(isWalkable(rt, x, 17), `lane ${x},17`).toBe(true);
  });

  it("keeps every trainer's line of sight, NPC cell and hidden item open", () => {
    for (const id of OUTDOOR.concat("sanguine_conservatory")) {
      const m = WORLD.maps[id], rt = buildMap(m);
      for (const n of m.npcs) {
        expect(isWalkable(rt, n.x, n.y), `${id} ${n.id}`).toBe(true);
        for (let i = 1; i <= (n.trainer ? n.sight ?? 4 : 0); i++) {
          const { dx, dy } = DIRS[n.facing];
          expect(isWalkable(rt, n.x + dx * i, n.y + dy * i), `${id} ${n.id} sight ${i}`).toBe(true);
        }
      }
      for (const h of m.hidden ?? []) {
        // The root-gap stash is behind ROOT BRIDGE, by design.
        if (id === "route_11") continue;
        expect(flood(grid(m), arrivals(id)).has(`${h.x},${h.y}`), `${id} hidden ${h.x},${h.y}`).toBe(true);
      }
    }
  });

  it("only uses red ledges as one-way drops that land back on the ordinary route", () => {
    let ledges = 0;
    for (const id of OUTDOOR) {
      const m = WORLD.maps[id], rt = buildMap(m);
      // The validator walks without ledge hops, so every landing must already be reachable.
      const reach = flood(grid(m), arrivals(id));
      for (let y = 0; y < rt.h; y++) for (let x = 0; x < rt.w; x++) {
        if (tileAt(rt, x, y) !== "red_ledge") continue;
        ledges++;
        expect(reach.has(`${x},${y - 1}`), `${id} above ${x},${y}`).toBe(true);
        expect(reach.has(`${x},${y + 1}`), `${id} landing ${x},${y + 1}`).toBe(true);
        expect(tryMove(rt, x, y - 1, "down")).toMatchObject({ kind: "ledge", x, y: y + 1 });
        expect(tryMove(rt, x, y + 1, "up").kind).toBe("blocked");
      }
    }
    expect(ledges).toBeGreaterThan(0);
  });

  it("dresses the towns with the new buildings, the wind pump and the dragon trees", () => {
    const td = WORLD.maps.thistledown;
    const adobe = td.structures.find((s) => s.key === "adobe_house")!;
    expect([adobe.x + STRUCTURES.adobe_house.door!.x, adobe.y + STRUCTURES.adobe_house.door!.y]).toEqual([5, 5]);
    expect(td.warps.find((w) => w.x === 5 && w.y === 5)?.to).toBe("thistledown_house");
    expect(td.structures.filter((s) => s.key === "windmill_pump")).toHaveLength(1);
    expect(td.structures.some((s) => s.key === "house_small")).toBe(false);
    const sr = WORLD.maps.sanguine_ridge;
    const cons = sr.structures.find((s) => s.key === "ridge_conservatory")!;
    expect([cons.x + STRUCTURES.ridge_conservatory.door!.x, cons.y + STRUCTURES.ridge_conservatory.door!.y]).toEqual([25, 8]);
    expect(sr.structures.some((s) => s.key === "conservatory" || s.key === "big_oak")).toBe(false);
    const trees = sr.structures.filter((s) => s.key === "dragon_tree_big").map((s) => [s.x, s.y]);
    for (const oak of [[3, 3], [22, 19], [5, 20]]) expect(trees).toContainEqual(oak);
  });

  it("never lets desert sand touch red rock (the sand's edge is a grass fringe)", () => {
    for (const id of OUTDOOR) {
      const rt = buildMap(WORLD.maps[id]);
      for (let y = 0; y < rt.h; y++) for (let x = 0; x < rt.w; x++) {
        // Route 10's west verge is the city's watered grass, where a fringe belongs.
        if (tileAt(rt, x, y) !== "sand" || (id === "route_10" && x <= 7)) continue;
        for (const { dx, dy } of Object.values(DIRS)) {
          expect(tileAt(rt, x + dx, y + dy), `${id} ${x},${y}`).not.toBe("red_rock");
        }
      }
    }
  });
});
