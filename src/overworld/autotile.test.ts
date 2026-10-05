import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { tileAltPath, tilePath, tileVariantPath } from "../contracts";
import { MASK, TileCatalog, autotileMask, pickAlt, posHash } from "./autotile";
import { buildMap, refreshLegend } from "./map";

const def: MapDef = {
  id: "route_1", name: "T", outdoor: true, music: "route",
  tiles: [
    "~~..",
    "~~.:",
    "...:",
    "T.::",
  ],
  legend: { "~": "water", ".": "grass", ":": "path", T: "tree", "0": "pond_lily" },
  legendWhen: [{ when: [{ flag: "drained", is: true }], legend: { "~": "bog" } }],
  border: "tree", structures: [], warps: [], npcs: [], signs: [], triggers: [],
};

describe("autotile masks", () => {
  const m = buildMap(def);
  it("sets N/E/S/W bits for same-group neighbours, out-of-bounds counting as same", () => {
    // (0,0) water: N out (1), E water (2), S water (4), W out (8)
    expect(autotileMask(m, 0, 0)).toBe(MASK.N | MASK.E | MASK.S | MASK.W);
    // (1,1) water: N water, E grass, S grass, W water
    expect(autotileMask(m, 1, 1)).toBe(MASK.N | MASK.W);
    // (3,1) path: N grass, E out, S path, W grass
    expect(autotileMask(m, 3, 1)).toBe(MASK.E | MASK.S);
    // (2,3) path: N grass, E path, S out, W grass
    expect(autotileMask(m, 2, 3)).toBe(MASK.E | MASK.S);
  });

  it("returns -1 for tiles that don't autotile", () => {
    expect(autotileMask(m, 2, 0)).toBe(-1); // grass
  });

  it("groups different tiles that share a group (pond_lily joins water)", () => {
    const m2 = buildMap({ ...def, tiles: ["~0", ".."] });
    expect(autotileMask(m2, 0, 0) & MASK.E).toBe(MASK.E);
    expect(autotileMask(m2, 1, 0) & MASK.W).toBe(MASK.W);
  });

  it("border cells beyond the edge autotile against the map", () => {
    // (-1,3) is border tree; its east neighbour (0,3) is a tree.
    expect(autotileMask(m, -1, 3) & MASK.E).toBe(MASK.E);
    // (-1,2): east neighbour (0,2) is grass, so the east edge is open.
    expect(autotileMask(m, -1, 2) & MASK.E).toBe(0);
  });

  it("follows legendWhen overrides", () => {
    const m3 = buildMap(def);
    refreshLegend(m3, { drained: true });
    expect(m3.legendSig).toBe("0,");
    expect(autotileMask(m3, 1, 1)).toBe(MASK.N | MASK.W); // bog joins bog
    refreshLegend(m3, {});
    expect(m3.legendSig).toBe("");
  });
});

describe("ground variation", () => {
  it("hashes positions stably", () => {
    expect(posHash(3, 7)).toBe(posHash(3, 7));
    expect(posHash(3, 7)).not.toBe(posHash(7, 3));
    expect(posHash(-2, -5)).toBeGreaterThanOrEqual(0);
  });

  it("picks the base tile when no alts exist and only listed alts otherwise", () => {
    expect(pickAlt(4, 4, [])).toBe(0);
    const seen = new Set<number>();
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) seen.add(pickAlt(x, y, [1, 3]));
    expect([...seen].sort()).toEqual([0, 1, 3]);
  });

  it("keeps the base tile the most common and is deterministic", () => {
    const counts = [0, 0, 0, 0];
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) counts[pickAlt(x, y, [1, 2, 3])]++;
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(pickAlt(9, 12, [1, 2, 3])).toBe(pickAlt(9, 12, [1, 2, 3]));
  });
});

describe("tile catalog", () => {
  const files = new Set([
    tilePath("water"), tilePath("water", 2), tileVariantPath("water", 6), tileVariantPath("water", 6, 2),
    tileVariantPath("water", 3),
    tilePath("grass"), tileAltPath("grass", 1), tileAltPath("grass", 2),
    tilePath("tall_grass"), tilePath("tall_grass", 2), tileAltPath("tall_grass", 1),
  ]);
  const cat = new TileCatalog({ has: (p) => files.has(p) });

  it("uses an edge variant with its own second frame when present", () => {
    const a = cat.resolve("water", 6, 0, 0);
    expect(a.path).toBe(tileVariantPath("water", 6));
    expect(a.path2).toBe(tileVariantPath("water", 6, 2));
  });

  it("keeps a variant static rather than popping to the base frame 2", () => {
    expect(cat.resolve("water", 3, 0, 0).path2).toBe(tileVariantPath("water", 3));
  });

  it("falls back to the base tile for a missing mask", () => {
    const a = cat.resolve("water", 9, 0, 0);
    expect(a.path).toBe(tilePath("water"));
    expect(a.path2).toBe(tilePath("water", 2));
  });

  it("varies ground with alts, but not animated tiles whose alts lack a frame 2", () => {
    const paths = new Set<string>();
    for (let x = 0; x < 40; x++) paths.add(cat.resolve("grass", -1, x, 0).path);
    expect(paths).toEqual(new Set([tilePath("grass"), tileAltPath("grass", 1), tileAltPath("grass", 2)]));
    expect(cat.alts("tall_grass")).toEqual([]);
  });
});
