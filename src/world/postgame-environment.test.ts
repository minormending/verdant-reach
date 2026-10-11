import { describe, expect, it } from "vitest";
import { STRUCTURES, type MapId, type TileKey } from "../contracts";
import { glowLamps } from "../overworld/glow";
import { buildMap, DIRS, isWalkable, refreshLegend, tileAt, tileProps, type MapRuntime } from "../overworld/map";
import { WORLD } from "./index";

// The post-game environment pass gives the Seed Vault, Methuselah Ridge and
// the Route 9 spur their own tiles; the post-game plays exactly as before.
// Digests were taken from the stand-in maps before the pass (branch pg/env,
// cut from postgame), when the vault was built from generic tiles.

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// What a tile does, not how it looks: a cosmetic swap (wall -> vault_wall,
// ice -> vault_ice, snow -> rime) keeps its class. Tiles the engine treats by
// name keep a class of their own (pits, exit mats, lamps).
const role = (t: TileKey) => {
  const p = tileProps(t);
  return [p.walk ? "walk" : "solid", p.slide ? "slide" : "", p.encounter ?? "", p.water ? "water" : "", p.ledge ?? "",
    p.fieldMove ?? "", t === "pit" ? "pit" : t === "filled_pit" ? "filled" : t === "mat_exit" ? "mat" : "",
    glowLamps(1, 1, () => t).length ? "lamp" : "", p.interact ? "interact" : ""].join(":");
};

// The cast swap: METHUSELAH stands on its own bristlecone sprite instead of
// the potted-plant stand-in. Hash it as the stand-in, so any other change fails.
const RESKIN: Record<string, string> = { bristlecone: "potted_plant" };

// Warps, triggers, NPCs (cells, sprites, scripts, conditions, pushable stones),
// sign cells (their text belongs to the writer), hidden items, encounter
// tables, music, darkness, ambience, onEnter, the flag swaps (by role) and size.
function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers, npcs: m.npcs.map((n) => ({ ...n, sprite: RESKIN[n.sprite] ?? n.sprite })),
    signs: m.signs.map((s) => [s.x, s.y]), hidden: m.hidden ?? [],
    doors: m.structures.filter((s) => STRUCTURES[s.key].door)
      .map((s) => [s.x + STRUCTURES[s.key].door!.x, s.y + STRUCTURES[s.key].door!.y]),
    encounters: m.encounters ?? null, encountersWhen: m.encountersWhen ?? null,
    music: m.music, musicWhen: m.musicWhen ?? null, onEnter: m.onEnter ?? null, onWhiteout: m.onWhiteout ?? null,
    healPoint: m.healPoint ?? null, dark: m.dark ?? false, ambient: m.ambient ?? null, time: m.time ?? null,
    legendWhen: (m.legendWhen ?? []).map((o) => ({ when: o.when, legend: Object.fromEntries(Object.entries(o.legend).map(([ch, t]) => [ch, role(t)])) })),
    outdoor: m.outdoor, size: [m.tiles[0].length, m.tiles.length],
  });
}

function runtime(id: MapId, flags: Record<string, boolean> = {}): MapRuntime {
  const m = buildMap(WORLD.maps[id]);
  refreshLegend(m, flags);
  return m;
}

// One role per cell, row by row; structure footprints count as solid.
function behaviour(id: MapId, flags: Record<string, boolean>, skip: (x: number, y: number) => boolean = () => false): string {
  const m = runtime(id, flags);
  const rows: string[] = [];
  for (let y = 0; y < m.h; y++) {
    const row: string[] = [];
    for (let x = 0; x < m.w; x++) row.push(skip(x, y) ? "?" : `${isWalkable(m, x, y) ? "W" : "S"}/${role(tileAt(m, x, y))}`);
    rows.push(row.join(" "));
  }
  return rows.join("\n");
}

const SOLVED_B2 = { filled_seed_vault_b2_8_10: true, bridged_seed_vault_b2_12_10: true, filled_seed_vault_b2_16_10: true };

// The flag states that change a tile on each map.
const STATES: Record<string, Record<string, boolean>[]> = {
  route_9: [{ game_cleared: false }, { game_cleared: true }],
  seed_vault_entrance: [{}, { game_cleared: true }, { diary_read: true }, { game_cleared: true, diary_read: true }],
  seed_vault_b1: [{}],
  seed_vault_b2: [{}, SOLVED_B2],
  seed_vault_b3: [{}],
  methuselah_ridge: [{}],
};

// METHUSELAH's tree stands on the summit behind the NPC at (7,3), so the NPC
// reads as its living base: its footprint (three crest cells that were cliff
// and six open scree cells, none on a route) is the only cell change in the
// pass, listed here and checked below. The vault's stand-in bookshelves become
// seed racks, which keep their class (solid, interactable).
const TREE = { key: "methuselah_tree", x: 6, y: 0 } as const;
const inTree = (id: MapId) => (x: number, y: number) =>
  id === "methuselah_ridge" && x >= TREE.x && x < TREE.x + 3 && y >= TREE.y && y < TREE.y + 3;

const MAPS: MapId[] = ["route_9", "seed_vault_entrance", "seed_vault_b1", "seed_vault_b2", "seed_vault_b3", "methuselah_ridge"];

const GAMEPLAY: Record<string, string> = {
  route_9: "44dbd517424a5c9703339e7e8844cfdc5131eb87d6560725a06badabe6bdf42d",
  seed_vault_entrance: "f1129b107ae05dbc43d28b586830f60ae188606e13e0eeb75a46d54887feb423",
  seed_vault_b1: "d2a253b941568315d8bde078fe75b6bde204d3d13a3249c1c9a594286094e5d1",
  seed_vault_b2: "542eb385192a987e6ff1ae613173327fb2c3ddba9528a618f88595c6ff412b5f",
  seed_vault_b3: "26f55307ae97be7b90e7de343e65083477380775ec4851695050c5f9ded036b4",
  methuselah_ridge: "e34a6c4be2117c80536b28fcbb4c1771a325bdb7b20e0cbe79b9a3181b335097",
};

// Per map, one digest of the behaviour grid for each entry of STATES.
const CELLS: Record<string, string[]> = {
  route_9: ["37b922de68478f98188d8028184c82f006c040730adbf612b8c40d20ba3d299b",
    "1caf46aac315f2cbedf7d207a7ccdf1e12be95957ce9a8513cd47e321225bfe4"],
  seed_vault_entrance: ["c3a667ac96289c02a181d236492fb6bf703a2a35d281b2cea08c8df781bd36e5",
    "0f2966f1e290ca7a0e52e0ed2a69d62b5d02c83371aa037bc4722b80fb3e4933",
    "c3a667ac96289c02a181d236492fb6bf703a2a35d281b2cea08c8df781bd36e5",
    "8c0eaa4684e8705b1405d26077b437156ec2f6818c97a1348a4359e18c5935f4"],
  seed_vault_b1: ["8e7f21abe11889651d5405ffaa724994be33c5c9e231fd25042163fd5e55d6f6"],
  seed_vault_b2: ["10304592a8b8786157a51472e4216fbe295f024de7152c5e27ae60c6cb351ff8",
    "2cfc1f8c9c0e5d11f07a5ad16060901fd79fe298b2306df6c40d71b26956b255"],
  seed_vault_b3: ["17448cc36c7c9ed096168a8647f1238c13f821ca7f13c961eb614317c3730ead"],
  methuselah_ridge: ["dd9930fbfe4364f851e1cdbf8cfe9d8d662388a914f45afdc649c8f089c578bf"],
};

/** Cells reachable on foot from `start` (NPC cells blocked unless listed as passable). */
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

describe("post-game environment keeps the post-game", () => {
  for (const id of MAPS) {
    it(`freezes ${id} warps, triggers, NPCs, items, encounters, flags and music`, async () => {
      expect(await sha(gameplay(id))).toBe(GAMEPLAY[id]);
    });
    it(`freezes what every ${id} cell does, in each flag state`, async () => {
      const got = await Promise.all(STATES[id].map((flags) => sha(behaviour(id, flags, inTree(id)))));
      expect(got).toEqual(CELLS[id]);
    });
  }

  it("keeps the Route 9 spur a cliff until the game is cleared, then the vault stair", () => {
    for (const cleared of [false, true]) {
      const rt = runtime("route_9", { game_cleared: cleared });
      expect(tileAt(rt, 6, 0)).toBe(cleared ? "stairs_down" : "cliff");
      expect(reach("route_9", { game_cleared: cleared }, { x: 14, y: 54 }).has("6,0")).toBe(cleared);
    }
  });

  it("stands METHUSELAH at the foot of its tree, still in reach from the ridge path", () => {
    const m = WORLD.maps.methuselah_ridge, rt = runtime("methuselah_ridge");
    const npc = m.npcs.find((n) => n.id === "methuselah")!;
    expect([npc.x, npc.y]).toEqual([7, 3]);
    // The tree is scenery on the summit's crest, directly behind the NPC.
    expect(m.structures).toEqual([TREE]);
    for (let y = TREE.y; y < TREE.y + 3; y++) for (let x = TREE.x; x < TREE.x + 3; x++) {
      expect(isWalkable(rt, x, y), `tree ${x},${y}`).toBe(false);
    }
    expect(npc.sprite).toBe("bristlecone");
    const r = reach("methuselah_ridge", {}, { x: 7, y: 12 });
    expect(r.has("7,4"), "talk cell").toBe(true);
    expect(r.has("7,13"), "the way down").toBe(true);
    // Every open cell of the summit except the tree's footprint is still open.
    for (let y = 1; y < rt.h - 1; y++) for (let x = 1; x < rt.w - 1; x++) {
      if (inTree("methuselah_ridge")(x, y) || (x === npc.x && y === npc.y)) continue;
      expect(r.has(`${x},${y}`), `${x},${y}`).toBe(true);
    }
  });
});
