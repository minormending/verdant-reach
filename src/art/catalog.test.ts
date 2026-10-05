// Resolver, packs, palette swaps, legacy fallback, validator and PNG codec,
// against the hand-made fixture tree in src/art/__fixtures__/public/.

import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildIndex } from "../../tools/art/index.mjs";
import { ArtCatalog } from "./catalog";
import { diskImages, loadPacksFromDisk, loadRawFromDisk } from "./fs";
import { colorStats, recolorRgba } from "./palette";
import { logicalPath, parseLogical } from "./paths";
import { decodePng, encodePng, pngSize } from "./png";
import { errorsOnly, validateArt } from "./validate";

const FIX = fileURLToPath(new URL("./__fixtures__/public/", import.meta.url));
const index = buildIndex(FIX);
const raw = loadRawFromDisk(FIX, index);
const images = diskImages(FIX);
const cat = (packs: string[] = []) => new ArtCatalog(raw, { packs, legacy: index.legacy });

const PAL = ["#181818", "#204020", "#40a040", "#c0f0c0"];
const SPORT = ["#181818", "#403820", "#c0a040", "#f8f0c0"];

describe("logical paths", () => {
  it("parse and rebuild every helper shape", () => {
    for (const p of [
      "assets/species/fern/front__2.png", "assets/species/fern/icon.png?sport", "assets/tiles/water@15__2.png",
      "assets/tiles/grass~3.png", "assets/tiles/tall_grass__2.png", "assets/structures/well.png",
      "assets/characters/player.png", "assets/trainers/player_back.png", "assets/ui/seed__2.png", "assets/stills/bloom.png",
    ]) {
      const ref = parseLogical(p);
      expect(ref, p).not.toBeNull();
      expect(logicalPath(ref!)).toBe(p);
    }
    expect(parseLogical("assets/tiles/water@5.png")).toEqual({ type: "tile", key: "water", frame: 1, mask: 5 });
    expect(parseLogical("assets/species/fern/side.png")).toBeNull();
    expect(parseLogical("art/species/fern/front.png")).toBeNull();
  });
});

describe("index builder", () => {
  it("lists bundles, their files, packs and legacy files", () => {
    expect(Object.keys(index.species)).toEqual(["fern"]);
    expect(index.species.fern).toEqual(["back.png", "front.png", "front__2.png", "icon.png"]);
    expect(Object.keys(index.packs)).toEqual(["frames", "onetile", "recolor", "sheet"]);
    expect(index.packs.recolor.species.fern).toEqual([]);
    expect(index.packs.onetile.name).toBe("ONE TILE");
    expect(index.legacy).toEqual(["assets/species/fern/front__3.png", "assets/species/oak/front.png", "assets/tiles/rock.png"]);
  });
});

describe("resolver", () => {
  it("species frames and exact sports", () => {
    const c = cat();
    const r = c.resolve("assets/species/fern/front__2.png")!;
    expect(r).toMatchObject({ url: "art/species/fern/front__2.png", legacy: false, listed: true });
    expect(r.recolor).toBeUndefined();
    expect(c.resolve("assets/species/fern/front__3.png")).toBeNull(); // the bundle owns fern: no legacy mixing
    expect(c.resolve("assets/species/fern/icon__2.png")).toBeNull();
    const s = c.resolve("assets/species/fern/icon.png?sport")!;
    expect(s.url).toBe("art/species/fern/icon.png");
    expect(s.recolor).toEqual({ from: PAL, to: SPORT });
  });

  it("tile cells: base, second frame, alts, masks", () => {
    const c = cat();
    expect(c.resolve("assets/tiles/grass.png")).toMatchObject({ url: "art/tilesets/ground/sheet.png", rect: [0, 0, 16, 16], cell: 0 });
    expect(c.resolve("assets/tiles/grass__2.png")).toBeNull();
    expect(c.resolve("assets/tiles/grass~1.png")!.rect).toEqual([16, 0, 16, 16]);
    expect(c.resolve("assets/tiles/grass~2.png")).toBeNull();
    expect(c.resolve("assets/tiles/water__2.png")!.rect).toEqual([48, 0, 16, 16]);
    expect(c.resolve("assets/tiles/water@5.png")!.rect).toEqual([0, 16, 16, 16]);
    expect(c.resolve("assets/tiles/water@5__2.png")!.rect).toEqual([16, 16, 16, 16]);
    expect(c.resolve("assets/tiles/water@6.png")).toBeNull(); // missing masks fall back in the engine
  });

  it("structures, characters and image sets", () => {
    const c = cat();
    expect(c.resolve("assets/structures/well.png")!.url).toBe("art/structures/well/structure.png");
    expect(c.resolve("assets/characters/player.png")!.url).toBe("art/characters/player/sheet.png");
    expect(c.resolve("assets/ui/title_logo.png")!.url).toBe("art/sets/ui/title_logo.png");
    expect(c.resolve("assets/ui/title.png")).toBeNull();
  });

  it("falls back to legacy files only for subjects no bundle owns", () => {
    const c = cat();
    expect(c.resolve("assets/tiles/rock.png")).toMatchObject({ url: "assets/tiles/rock.png", legacy: true });
    expect(c.resolve("assets/species/oak/front.png")).toMatchObject({ url: "assets/species/oak/front.png", legacy: true });
    expect(c.resolve("assets/species/oak/front.png?sport")).toBeNull(); // legacy art has no exact sport
    expect(c.resolve("assets/tiles/bog.png")).toBeNull();
    // Unknown legacy list: every unowned assets/ path is tried.
    const loose = new ArtCatalog(raw, { legacy: null });
    expect(loose.resolve("assets/tiles/bog.png")).toMatchObject({ legacy: true, listed: false });
    expect(loose.resolve("assets/tiles/grass.png")!.legacy).toBe(false);
  });

  it("enumerates what it provides", () => {
    const all = cat().provides();
    expect(all).toContain("assets/species/fern/front__2.png?sport");
    expect(all).toContain("assets/tiles/water@15__2.png");
    expect(all).toContain("assets/tiles/rock.png");
    expect(all).not.toContain("assets/species/fern/front__3.png");
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("art packs", () => {
  it("palette-only pack recolours base images index by index", () => {
    const c = cat(["recolor"]);
    const r = c.resolve("assets/species/fern/front.png")!;
    expect(r.url).toBe("art/species/fern/front.png");
    expect(r.recolor).toEqual({ from: PAL, to: ["#181818", "#202060", "#4040c0", "#c0c0f8"] });
    expect(c.resolve("assets/species/fern/front.png?sport")!.recolor).toEqual({ from: PAL, to: SPORT });
  });

  it("pack files win over base files, each in its own palette", () => {
    const c = cat(["frames"]);
    const P2 = ["#181818", "#600000", "#c00000", "#f8c0c0"];
    const f1 = c.resolve("assets/species/fern/front.png")!;
    expect(f1).toMatchObject({ url: "art/packs/frames/species/fern/front.png", layer: "frames" });
    expect(f1.recolor).toBeUndefined();
    const f2 = c.resolve("assets/species/fern/front__2.png")!;
    expect(f2.url).toBe("art/species/fern/front__2.png");
    expect(f2.recolor).toEqual({ from: PAL, to: P2 });
    expect(c.resolve("assets/species/fern/front.png?sport")!.recolor).toEqual({ from: P2, to: SPORT });
  });

  it("a pack can override one tile from its own sparse sheet", () => {
    const c = cat(["onetile"]);
    expect(c.resolve("assets/tiles/grass.png")).toMatchObject({ url: "art/packs/onetile/tilesets/ground/extra.png", rect: [0, 0, 16, 16] });
    expect(c.resolve("assets/tiles/grass~1.png")).toBeNull(); // the pack's grass has no alts
    expect(c.resolve("assets/tiles/water@5.png")).toMatchObject({ url: "art/tilesets/ground/sheet.png", rect: [0, 16, 16, 16] });
  });

  it("a pack that ships only sheet.png swaps the whole sheet", () => {
    const c = cat(["sheet"]);
    expect(c.resolve("assets/tiles/water@5.png")!.url).toBe("art/packs/sheet/tilesets/ground/sheet.png");
    // ...but a higher pack's own tile still reads the higher pack's sheet.
    const both = cat(["sheet", "onetile"]);
    expect(both.resolve("assets/tiles/grass.png")!.url).toBe("art/packs/onetile/tilesets/ground/extra.png");
    expect(both.resolve("assets/tiles/path.png")!.url).toBe("art/packs/sheet/tilesets/ground/sheet.png");
  });

  it("inactive packs change nothing; later packs win", () => {
    expect(cat().resolve("assets/species/fern/front.png")!.recolor).toBeUndefined();
    const c = cat(["recolor", "frames"]);
    expect(c.resolve("assets/species/fern/front.png")!.url).toBe("art/packs/frames/species/fern/front.png");
  });

  it("in-memory lab patches merge on top", () => {
    const lab = new Map([["species/fern", { sport: ["#181818", "#000000", "#111111", "#222222"] }]]);
    const c = new ArtCatalog(raw, { legacy: index.legacy, lab });
    expect(c.resolve("assets/species/fern/back.png?sport")!.recolor!.to[1]).toBe("#000000");
  });
});

describe("validator", () => {
  const required = [
    { path: "assets/species/fern/front.png", group: "species" as const, size: [56, 56] as [number, number] },
    { path: "assets/tiles/water.png", group: "tiles" as const, size: [16, 16] as [number, number] },
    { path: "assets/tiles/rock.png", group: "tiles" as const },
    { path: "assets/ui/title_logo.png", group: "ui" as const },
    { path: "assets/ui/title.png", group: "ui" as const },
  ];
  const run = (rawIn = raw) => validateArt({ raw: rawIn, packs: loadPacksFromDisk(FIX, index), legacy: index.legacy, image: images, required });

  it("passes the fixture tree, reporting legacy-only and missing paths", () => {
    const r = run();
    // The fixture structure "well" and character "player" are real contract ids; "ground" tiles too.
    expect(errorsOnly(r.problems).filter((p) => !p.where.startsWith("assets/"))).toEqual([]);
    expect(r.legacyOnly).toEqual(["assets/tiles/rock.png"]);
    expect(r.missing).toEqual(["assets/ui/title.png"]);
  });

  it("catches bad JSON, sizes, colours, refs and duplicate tile owners", () => {
    const broken = raw.map((b) => {
      if (b.pack === null && b.kind === "species") return { ...b, json: { ...(b.json as object), palette: ["#181818", "#204020", "#40a040"], sport: undefined } };
      if (b.pack === null && b.kind === "tilesets") return { ...b, json: { ...(b.json as object), tiles: { grass: { base: 99 }, water: { base: [2, 3], masks: { "5": 4, "16": 1 } }, nope: { base: 0 } } } };
      if (b.pack === null && b.kind === "structures") return { ...b, json: { ...(b.json as object), size: [3, 3] } };
      if (b.pack === null && b.kind === "characters") return { ...b, json: { ...(b.json as object), id: "someone" } };
      return b;
    });
    broken.push({ kind: "tilesets", id: "dupe", pack: null, files: [], json: { format: "verdant.tileset/1", id: "dupe", tileSize: 16, sheet: "s.png", columns: 1, tiles: { grass: { base: 0 } } } });
    const msgs = errorsOnly(run(broken).problems).map((p) => `${p.where}: ${p.message}`).join("\n");
    expect(msgs).toMatch(/species\/fern: palette must be 4/);
    expect(msgs).toMatch(/tile grass: base cell 99 is outside the sheet/);
    expect(msgs).toMatch(/tile water: masks.5 has 1 frame\(s\); base has 2/);
    expect(msgs).toMatch(/mask key "16"/);
    expect(msgs).toMatch(/tile nope: is not a TileKey/);
    expect(msgs).toMatch(/structures\/well: size is 3x3/);
    expect(msgs).toMatch(/characters\/player: id is "someone"/);
    expect(msgs).toMatch(/tile grass: defined by 2 tilesets/);
  });

  it("checks species pixels against the palette, and binary alpha", () => {
    const off = raw.map((b) => (b.pack === null && b.kind === "species"
      ? { ...b, json: { ...(b.json as object), palette: ["#181818", "#204020", "#40a040", "#ffffff"] } } : b));
    const msgs = errorsOnly(run(off).problems).map((p) => p.message).join("\n");
    expect(msgs).toMatch(/colour\(s\) not in the palette: #c0f0c0/);
  });
});

describe("palette swaps", () => {
  it("recolour exact colours only, skipping transparent pixels", () => {
    const d = new Uint8Array([0x40, 0xa0, 0x40, 255, 0x40, 0xa0, 0x40, 0, 1, 2, 3, 255]);
    expect(recolorRgba(d, { from: ["#40a040"], to: ["#c0a040"] })).toBe(1);
    expect([...d.slice(0, 4)]).toEqual([0xc0, 0xa0, 0x40, 255]);
    expect([...d.slice(4, 8)]).toEqual([0x40, 0xa0, 0x40, 0]);
    expect([...d.slice(8)]).toEqual([1, 2, 3, 255]);
  });
});

describe("png codec", () => {
  it("round-trips RGBA", () => {
    const data = new Uint8Array(5 * 3 * 4).map((_, i) => (i * 37) & 255);
    const png = encodePng({ width: 5, height: 3, data }, deflateSync);
    expect(pngSize(png)).toEqual({ width: 5, height: 3 });
    expect(decodePng(png, inflateSync).data).toEqual(data);
  });

  it("decodes the fixture PNGs (Pillow-written, filtered)", () => {
    const f = images("art/species/fern/front.png")!;
    expect([f.width, f.height]).toEqual([56, 56]);
    expect([...colorStats(f.data).colors].sort()).toEqual([...PAL].sort());
  });

  it("decodes indexed 2-bit with tRNS, and 8-bit grey", () => {
    // Hand-built: 4x1 indexed, palette [red, green, blue, white], index 3 transparent.
    const chunk = (type: string, body: number[]) => {
      const bytes = [...type].map((c) => c.charCodeAt(0)).concat(body);
      return { type, body, bytes };
    };
    const build = (ihdr: number[], extra: { type: string; body: number[] }[], rows: number[]) => {
      const parts: Uint8Array[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
      const push = (type: string, body: number[] | Uint8Array) => {
        const b = new Uint8Array(12 + body.length);
        const dv = new DataView(b.buffer);
        dv.setUint32(0, body.length);
        for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
        b.set(body, 8);
        parts.push(b); // CRC left as zero: the decoder does not verify it
      };
      push("IHDR", ihdr);
      for (const c of extra) push(c.type, c.body);
      push("IDAT", deflateSync(new Uint8Array(rows)));
      push("IEND", []);
      const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    };
    const ihdr = (w: number, h: number, depth: number, ctype: number) => [0, 0, 0, w, 0, 0, 0, h, depth, ctype, 0, 0, 0];
    const idx = build(ihdr(4, 1, 2, 3), [chunk("PLTE", [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]), chunk("tRNS", [255, 255, 255, 0])], [0, 0b00011011]);
    expect([...decodePng(idx, inflateSync).data]).toEqual([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 0]);
    const grey = build(ihdr(2, 1, 8, 0), [], [0, 10, 200]);
    expect([...decodePng(grey, inflateSync).data]).toEqual([10, 10, 10, 255, 200, 200, 200, 255]);
    const rgb = build(ihdr(1, 2, 8, 2), [], [0, 1, 2, 3, 2, 1, 1, 1]); // row 2 uses the "up" filter
    expect([...decodePng(rgb, inflateSync).data]).toEqual([1, 2, 3, 255, 2, 3, 4, 255]);
  });
});
