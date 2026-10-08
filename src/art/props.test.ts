import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STRUCTURES } from "../contracts";
import { PROP_SPECS } from "../contracts/props";
import { ArtCatalog } from "./catalog";
import type { RawBundle } from "./format";
import { validateArt } from "./validate";

type PropPick = { source: string | null; box?: [number, number, number, number] };
const load = (f: string) => JSON.parse(readFileSync(new URL(`../../tools/art/limezu/mapping/${f}`, import.meta.url), "utf8")) as Record<string, PropPick>;
const mapping = { ...load("interior_props.json"), ...load("exterior_props.json") };

describe("mapped props", () => {
  it("gives every mapped prop a spec, with a footprint inside its image and a GBC fallback", () => {
    const mapped = Object.entries(mapping).filter(([, pick]) => pick.source !== null).map(([key]) => `prop_${key}`);
    for (const key of mapped) expect(PROP_SPECS, key).toHaveProperty(key);
    for (const key of Object.keys(PROP_SPECS)) {
      const spec = STRUCTURES[key as keyof typeof PROP_SPECS];
      const fp = spec.footprint ?? { x: 0, y: 0, w: spec.w, h: spec.h };
      expect(fp.x >= 0 && fp.y >= 0 && fp.x + fp.w <= spec.w && fp.y + fp.h <= spec.h, key).toBe(true);
      const bare = key.slice("prop_".length);
      expect(spec.layer, key).toBe(["rug_large", "rug_small", "window", "painting", "dock", "flower_bed"].includes(bare) ? "floor" : undefined);
      const meta = JSON.parse(readFileSync(new URL(`../../public/art/structures/${key}/structure.json`, import.meta.url), "utf8")) as { notes: string; source: { kind: string } };
      expect(meta.notes, key).toMatch(/^FALLBACK:/);
      expect(meta.source.kind, key).toBe("generated");
    }
  });
});

describe("six-cell interior floor blocks", () => {
  const tile = (id: string, pack: string | null, tiles: object): RawBundle => ({
    kind: "tilesets", id, pack, files: ["sheet.png"], json: {
      format: "verdant.tileset/1", id, tileSize: 16, sheet: "sheet.png", columns: 16, tiles,
    },
  });
  const raw = [
    tile("interior", null, { floor_wood: { base: 0 } }),
    tile("rose", null, { floor_marble: { base: 0 } }),
    tile("interior", "test", {
      floor_wood: { base: 0, alts: [1, 2, 3, 4, 5] },
      floor_marble: { base: 6, alts: [7, 8, 9, 10, 11] },
    }),
  ];

  it("resolves all five alts and the imported marble while preserving base ownership", () => {
    const base = new ArtCatalog(raw, { packs: [] });
    const local = new ArtCatalog(raw, { packs: ["test"] });
    expect(base.resolve("assets/tiles/floor_marble.png")?.url).toBe("art/tilesets/rose/sheet.png");
    for (const key of ["floor_wood", "floor_marble"]) {
      for (let alt = 1; alt <= 5; alt++) {
        expect(local.resolve(`assets/tiles/${key}~${alt}.png`)).toMatchObject({
          url: "art/packs/test/tilesets/interior/sheet.png", cell: (key === "floor_marble" ? 6 : 0) + alt,
        });
      }
    }
    const result = validateArt({ raw, packs: { test: { json: { format: "verdant.pack/1", id: "test" } } }, legacy: [], required: [],
      image: () => ({ width: 256, height: 16, data: new Uint8Array(256 * 16 * 4) }) });
    expect(result.problems.filter(p => p.message.includes("alts"))).toEqual([]);
  });
});
