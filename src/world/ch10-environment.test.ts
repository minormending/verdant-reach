import { describe, expect, it } from "vitest";
import { STRUCTURES, type MapId, type TileKey } from "../contracts";
import { buildMap, DIRS, isWalkable, refreshLegend, tileAt, tileProps, type MapRuntime } from "../overworld/map";
import { WORLD } from "./index";
import { flood, grid } from "./validate";

// The Chapter 10 environment pass dresses the plateau, the Arboretum and the
// Elder Grove; gameplay stays frozen. Digests were taken from the stand-in maps
// before the pass (branch ch10).

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// What a tile does, not how it looks: a cosmetic swap (tree -> aspen_tree,
// path -> root_vein) keeps its class.
const role = (t: TileKey) => {
  const p = tileProps(t);
  return [p.walk ? "walk" : "solid", p.encounter ?? "", p.water ? "water" : "", p.ledge ?? "", p.fieldMove ?? "",
    t === "pit" ? "pit" : "", p.interact ? "interact" : ""].join(":");
};

// Warps, triggers, NPCs (positions, sprites, scripts, trainers, sight), hidden
// items, door cells, encounter tables, music, the flag swaps (by role) and size.
function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers, npcs: m.npcs, hidden: m.hidden ?? [],
    doors: m.structures.filter((s) => STRUCTURES[s.key].door)
      .map((s) => [s.x + STRUCTURES[s.key].door!.x, s.y + STRUCTURES[s.key].door!.y]),
    encounters: m.encounters ?? null, encountersWhen: m.encountersWhen ?? null,
    music: m.music, musicWhen: m.musicWhen ?? null, onEnter: m.onEnter ?? null,
    healPoint: m.healPoint ?? null,
    legendWhen: (m.legendWhen ?? []).map((o) => ({ when: o.when, legend: Object.fromEntries(Object.entries(o.legend).map(([ch, t]) => [ch, role(t)])) })),
    outdoor: m.outdoor, ambient: m.ambient ?? null, size: [m.tiles[0].length, m.tiles.length],
  });
}

// [map, gameplay digest, encounter-footprint digest]
// Gameplay digests re-pinned after the lead's merge: the Grove rings play
// elder_grove, MERCER/ROWAN/CALLOWAY/the warden/the Elder use their own sprites,
// and the dialogue pass wrote the sign and NPC strings (all intended).
const FROZEN: [MapId, string, string][] = [
  ["route_12", "339f396ccdc018ea3f95724a4e96f0d206cdba2ff11e9a710d4b644a025dde01", "5174f3c7838af35ab1e2d26aa677a554efbaa15b93954bb11b8448f37e7e6d77"],
  // Re-pinned on ch11: Chapter 11 turns the hall door into the Council entrance.
  ["council_arboretum", "d1acef7cf87bc659326f9ace97cf9832cd01551df25d048243b03ae173f1c8a3", "f47d68e470eadb52b41e87e3efe0ca1c0b7e0d48644e13212e07931664b976f0"],
  ["arboretum_greenhouse", "2e36479270136138c4ee49f5612ec3ce290bc9eaaee24aefd48708798c8e99ab", "7842ea36364692b6e923afa8e8e80906d45e5e19f2520aced6536917938bec15"],
  ["elder_grove_1", "846f7889efa74e46b0e8d7c928a7d790ff3866e8d4e3b64973b5214aecfddca5", "dff6785501c66c059fa5938afb12f0e7457eb9e66220d42b9604ba2686da2bda"],
  ["elder_grove_2", "4cdec02b50fe4a58f380b993a8fc404a962e708566632314f7307c3c92f59f2c", "a3e4c41491946cec6b32148bed2b9698895a239ed57d7a73aa0ab3610001dd1e"],
  ["elder_grove_3", "8ce16f4bb5e966a0489d6cfe6720a2292c93e18f857ece94b5b06621769ea260", "03279a5b830a08c49184da302c70c99d6d395df39d09563fbd44c968f091ea78"],
  // Re-pinned on postgame: the post-game adds the Centuryheart sprout NPC.
  ["elder_grove_heart", "55e9f69e1e69bea6d964ffc99645351d8f822fa6bbd193d1496c0268afa1f003", "dbce4f004ee6f50a6189a436a5970ad64d1b4ec2390435fc4eea1c6e4f5aa5fb"],
  // Re-pinned on ch11: Chapter 11 builds the lobby out (stairs to the Council, heal and market counters).
  // Re-pinned on postgame: the post-game adds ROWAN, who releases the Wanderers.
  ["council_hall", "d40821a555a6b5a3d10b16c71f7c32d9474c2987ff61c0d609532c8c2ac51d4a", "12cc1fa9d187e6ef08b750b46654ff534d10248662a77b761ed91bc3510afa3e"],
];

function runtime(id: MapId, flags: Record<string, boolean> = {}): MapRuntime {
  const m = buildMap(WORLD.maps[id]);
  refreshLegend(m, flags);
  return m;
}

// Encounter footprint: one character per cell, the encounter kind or "-".
function encounterCells(id: MapId): string {
  const m = runtime(id);
  let s = "";
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) s += tileProps(tileAt(m, x, y)).encounter ?? "-";
  return s;
}

// Movement classes in a rectangle: "p" pit, "r" root gap, "b" bramble, "v" ledge,
// "~" water, "g" encounter, "." walkable, "#" blocked (structures included).
function cells(id: MapId, flags: Record<string, boolean> = {}, x0 = 0, y0 = 0, x1?: number, y1?: number, floor = new Set<string>()): string {
  const m = runtime(id, flags);
  let s = "";
  for (let y = y0; y <= (y1 ?? m.h - 1); y++) {
    for (let x = x0; x <= (x1 ?? m.w - 1); x++) {
      const t = tileAt(m, x, y), p = tileProps(t);
      s += floor.has(`${x},${y}`) ? "." : t === "pit" ? "p" : p.fieldMove === "rootbridge" ? "r" : p.fieldMove === "prune" ? "b" : p.ledge ? "v"
        : p.water ? "~" : !isWalkable(m, x, y) ? "#" : p.encounter ? "g" : ".";
    }
    s += "\n";
  }
  return s;
}

/** Every arrival point on a map: the far side of each warp that leads here. */
const arrivals = (id: MapId) => Object.values(WORLD.maps).flatMap((o) => o.warps.filter((w) => w.to === id).map((w) => ({ x: w.toX, y: w.toY })));

// Rings 1 and 3 gain small aspen copses on open floor, clear of the root
// lanes, NPCs and sight lines (ring 2's walkability is its puzzle, so it has
// none). Put these cells back to floor and each walk grid is the stand-in's.
const COPSES: Partial<Record<MapId, string>> = {
  elder_grove_1: "6,1 7,1 27,1 28,1 6,2 22,2 23,2 24,2 27,2 28,2 23,3 17,10 18,10 4,11 5,11 13,11 14,11 4,12 5,12 6,12 13,12 "
    + "22,16 23,16 6,19 7,19 23,19 24,19 25,19 23,20 24,20 10,23 10,24 11,24 1,26 21,26 22,26 23,26 1,27 2,27 22,27 23,27",
  elder_grove_3: "6,1 7,1 23,1 24,1 6,2 19,2 20,2 21,2 23,2 24,2 20,3 15,10 16,10 4,11 5,11 12,11 13,11 4,12 5,12 6,12 12,12 "
    + "19,16 20,16 5,19 6,19 9,21 10,21 1,22 18,22 19,22 1,23 2,23 18,23 19,23 20,23 22,23 23,23",
};
const copses = (id: MapId) => new Set((COPSES[id] ?? "").split(" ").filter(Boolean));

const OUTDOOR: MapId[] = ["route_12", "council_arboretum", "elder_grove_1", "elder_grove_2", "elder_grove_3", "elder_grove_heart"];
const RINGS = ["elder_grove_1", "elder_grove_2", "elder_grove_3"] as const;

// Route 12's puzzle cells, cell for cell: [label, x0, y0, x1, y1].
const ROUTE_12_PUZZLES: [string, number, number, number, number][] = [
  ["the marks warden's gate and the PRUNE bramble", 0, 1, 4, 4],
  ["the RAFT pond and both landings", 4, 2, 7, 6],
  ["the pit row, its boulders and the push cells", 4, 6, 7, 10],
  ["the western root gap", 12, 9, 16, 11],
  ["the middle root gap", 20, 17, 24, 19],
  ["the eastern root gap", 28, 25, 32, 27],
  ["the ledge drop", 33, 29, 38, 31],
];
const ROUTE_12_DIGESTS: Record<string, string> = {
  "the marks warden's gate and the PRUNE bramble": "4833370d465ceb014902b5ef2266f7070a1ef04d92bb12cdfb728cc284ddab21",
  "the RAFT pond and both landings": "e45a71bbf50dade8faf924d62f17b1b33761de29bdb8e9af9583145452d9a051",
  "the pit row, its boulders and the push cells": "f44688817feeaac89900daa25e209ca6e6e57a6201cf7d50ac03db78684a7296",
  "the western root gap": "1748ed4be089074013888296bbcafab625310e8eaf123a3d8e4ad82339863389",
  "the middle root gap": "1748ed4be089074013888296bbcafab625310e8eaf123a3d8e4ad82339863389",
  "the eastern root gap": "1748ed4be089074013888296bbcafab625310e8eaf123a3d8e4ad82339863389",
  "the ledge drop": "0743d66683e278f52e4d2e1e69f6dc3e374da4063cb29b79ca7475a7e8c7e18d",
};

describe("Chapter 10 environment keeps gameplay", () => {
  for (const [id, play, enc] of FROZEN) {
    it(`freezes ${id} warps, triggers, NPCs, items, encounters and its encounter footprint`, async () => {
      expect(await sha(gameplay(id))).toBe(play);
      expect(await sha(encounterCells(id))).toBe(enc);
    });
  }

  it("keeps Route 12's puzzle cells cell for cell", async () => {
    for (const [label, x0, y0, x1, y1] of ROUTE_12_PUZZLES) {
      expect(await sha(cells("route_12", {}, x0, y0, x1, y1)), label).toBe(ROUTE_12_DIGESTS[label]);
    }
    const m = WORLD.maps.route_12;
    expect(m.npcs.filter((n) => n.pushable).map((n) => [n.x, n.y])).toEqual([[5, 8], [6, 8]]);
  });

  it("keeps the rings' walk grids (bar the copses), and ring 2's two lane sets, in every flag state", async () => {
    const states: [MapId, Record<string, boolean>, string][] = [
      ["elder_grove_1", { beat_shears_2: false }, "c3da799209fd2cb7aff871a46f5f6978f4a2ba1100335375b457d79308073a54"],
      ["elder_grove_1", { beat_shears_2: true }, "d2185a8b52d8a620d2e563df7de44bb5937e5b118f27cc02d607fb4401a4ee94"],
      ["elder_grove_2", { grove_lean: false, beat_calloway_2: false }, "7a083570e50074937ff8dc650f49a83507fcb1a4c2afe98313cee679a2ae171a"],
      ["elder_grove_2", { grove_lean: true, beat_calloway_2: false }, "f0de409169fa8cdbeb8448de1a7e095484eb9ff7d353b10c2c07078524f9ec3a"],
      ["elder_grove_2", { grove_lean: false, beat_calloway_2: true }, "50846456f0a6818bdcdc9db6be9cce6033c69c5aa6f154f5826cc0145d77e059"],
      ["elder_grove_2", { grove_lean: true, beat_calloway_2: true }, "5b0aec9383704415806f9ac6fdaef8642b8d1f337042a8e04354779bd69e142b"],
      ["elder_grove_3", { beat_wren_2: false }, "ec2c95497d98d80cd97f377b5478412b07e12cc308b1b8d06899cf767658b4a6"],
      ["elder_grove_3", { beat_wren_2: true }, "c13538a58b4015278608b299ad48137379db0df0f2e39c4fd217d174250a847d"],
    ];
    for (const [id, flags, digest] of states) {
      expect(await sha(cells(id, flags, 0, 0, undefined, undefined, copses(id))), `${id} ${JSON.stringify(flags)}`).toBe(digest);
      const rt = runtime(id, flags);
      for (const k of copses(id)) {
        const [x, y] = k.split(",").map(Number);
        expect(tileAt(rt, x, y), `${id} copse ${k}`).toBe("aspen_tree");
      }
    }
    // The lanes themselves: the cells whose walkability the lean swaps.
    const lean = (v: boolean) => runtime("elder_grove_2", { grove_lean: v, beat_calloway_2: false });
    const a = lean(false), b = lean(true), swapped: string[] = [];
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      if (isWalkable(a, x, y) !== isWalkable(b, x, y)) swapped.push(`${x},${y}:${isWalkable(a, x, y) ? "a" : "b"}`);
    }
    expect(swapped).toEqual(["8,10:a", "21,10:b", "8,19:a", "21,19:b"]);
  });

  it("puts the listening clearings exactly on ring 2's step triggers", () => {
    const m = WORLD.maps.elder_grove_2, rt = runtime("elder_grove_2");
    const clearings: string[] = [];
    for (let y = 0; y < rt.h; y++) for (let x = 0; x < rt.w; x++) if (tileAt(rt, x, y) === "listening_clearing") clearings.push(`${x},${y}`);
    expect(clearings.sort()).toEqual(m.triggers.filter((t) => t.script === "ch10_listening_clearing").map((t) => `${t.x},${t.y}`).sort());
    for (const id of OUTDOOR.filter((i) => i !== "elder_grove_2")) {
      const r = runtime(id);
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) expect(tileAt(r, x, y), `${id} ${x},${y}`).not.toBe("listening_clearing");
    }
  });

  it("keeps every trainer's line of sight, NPC cell and hidden item open", () => {
    for (const id of OUTDOOR) {
      const m = WORLD.maps[id], rt = runtime(id);
      for (const n of m.npcs) {
        if (n.pushable) continue;
        expect(isWalkable(rt, n.x, n.y), `${id} ${n.id}`).toBe(true);
        for (let i = 1; i <= (n.trainer ? n.sight ?? 4 : 0); i++) {
          const { dx, dy } = DIRS[n.facing];
          expect(isWalkable(rt, n.x + dx * i, n.y + dy * i), `${id} ${n.id} sight ${i}`).toBe(true);
        }
      }
      for (const h of m.hidden ?? []) {
        expect(flood(grid(m, { bridged: true, pruned: true, rafting: true }), arrivals(id)).has(`${h.x},${h.y}`), `${id} hidden ${h.x},${h.y}`).toBe(true);
      }
    }
  });

  it("keeps the heart's NPCs, the Elder and the planting reachable round the trunk", () => {
    const m = WORLD.maps.elder_grove_heart, rt = runtime("elder_grove_heart");
    const reach = flood(grid(m), arrivals("elder_grove_heart"));
    for (const n of m.npcs) {
      expect(isWalkable(rt, n.x, n.y), n.id).toBe(true);
      // Someone can stand beside each of them to talk.
      expect(Object.values(DIRS).some(({ dx, dy }) => reach.has(`${n.x + dx},${n.y + dy}`)), n.id).toBe(true);
    }
    // MERCER is met head-on from the entrance lane, and the Elder waits at the trunk's foot.
    for (let y = 12; y <= 18; y++) expect(isWalkable(rt, 10, y), `lane 10,${y}`).toBe(true);
  });
});
