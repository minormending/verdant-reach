// The export end to end against the real art tree: plan edits over
// public/art/, check the pack with the art bundle test's validator, then
// resolve tiles through a catalog with the pack active and compare pixels.

import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildIndex } from "../../tools/art/index.mjs";
import { ArtCatalog } from "../art/catalog";
import { diskImages, loadRawFromDisk } from "../art/fs";
import { decodePng, type Rgba } from "../art/png";
import { tilePath, tileVariantPath } from "../contracts";
import { assign, newMapping } from "./mapping";
import { checkMeta, exportEntries, packJson, validatePack } from "./pack";
import { baseSheetOf, currentArt, emptyState, planAll, type ArtSource, type LabState } from "./plan";
import { blank, crop, maskGridImage, paste, sameImage, solid, TS } from "./tiles";
import { unzipStore, zipStore } from "./zip";

const PUBLIC = fileURLToPath(new URL("../../public/", import.meta.url));
const index = buildIndex(PUBLIC);
const raw = loadRawFromDisk(PUBLIC, index);
const image = diskImages(PUBLIC);
const src: ArtSource = { catalog: new ArtCatalog(raw, { legacy: index.legacy }), pixels: image };
const meta = { id: "tilelab_test", name: "TILE LAB TEST" };

/** A tile path's pixels through a catalog. */
function resolved(cat: ArtCatalog, path: string, files: (url: string) => Rgba | null): Rgba | null {
  const res = cat.resolve(path);
  const px = res && files(res.url);
  return px && res ? crop(px, ...(res.rect ?? [0, 0, TS, TS])) : null;
}

/** The base tree plus the exported pack, as an ArtCatalog would see it installed. */
function installed(state: LabState) {
  const plans = planAll(src, state);
  const packRaw = plans.map((p) => ({ kind: "tilesets" as const, id: p.id, pack: meta.id, files: ["tileset.json", "sheet.png"], json: p.json }));
  const cat = new ArtCatalog([...raw, ...packRaw], { packs: [meta.id], legacy: index.legacy });
  const files = (url: string) => plans.find((p) => url === `art/packs/${meta.id}/tilesets/${p.id}/sheet.png`)?.sheet ?? image(url);
  return { plans, cat, files };
}

const pink = solid([248, 96, 160, 255]);

describe("plans and the exported pack", () => {
  it("reads the current art of a key", () => {
    const grass = currentArt(src, "grass")!;
    expect(grass.base.length).toBe(1);
    expect(grass.alts.length).toBe(3);
    const water = currentArt(src, "water")!;
    expect(water.base.length).toBe(2);
    expect(Object.keys(water.masks).length).toBeGreaterThan(0);
  });

  it("a single-tile edit makes a sparse, valid pack that draws the new tile", () => {
    const state: LabState = { ...emptyState(), edits: { grass: { enabled: true, base: [pink], source: "pink.png" } } };
    const { plans, cat, files } = installed(state);
    expect(plans.map((p) => p.id)).toEqual(["terrain"]);
    const p = plans[0];
    expect(Object.keys(p.json.tiles)).toEqual(["grass"]);
    expect(p.json.tiles.grass.alts?.length).toBe(3); // untouched alts copied into the sparse sheet
    expect(p.sheet.width).toBe(256);
    expect(validatePack(plans, meta, raw, image)).toEqual([]);
    expect(sameImage(resolved(cat, tilePath("grass"), files)!, pink)).toBe(true);
    // Other keys of the tileset still read the base sheet.
    expect(sameImage(resolved(cat, tilePath("flowers"), files)!, resolved(src.catalog, tilePath("flowers"), image)!)).toBe(true);
  });

  it("fill drops alts; a disabled edit drops the key", () => {
    const fill = planAll(src, { ...emptyState(), edits: { grass: { enabled: true, base: [pink], fill: true, source: "x" } } })[0];
    expect(fill.json.tiles.grass).toEqual({ base: 0 });
    expect(fill.dropped).toEqual(["grass~1", "grass~2", "grass~3"]);
    expect(planAll(src, { ...emptyState(), edits: { grass: { enabled: false, base: [pink], source: "x" } } })).toEqual([]);
  });

  it("a 4x4 mask grid on an animated autotile keeps two frames and validates", () => {
    const colours = Array.from({ length: 16 }, (_, m) => solid([m * 16, 80, 200, 255]));
    const state: LabState = { ...emptyState(), edits: { water: { enabled: true, base: [colours[15]], masks: Object.fromEntries(colours.map((c, m) => [m, [c]])), source: "w.png" } } };
    const { plans, cat, files } = installed(state);
    const def = plans[0].json.tiles.water;
    expect(Object.keys(def.masks!).length).toBe(16);
    expect(validatePack(plans, meta, raw, image)).toEqual([]);
    expect(sameImage(resolved(cat, tileVariantPath("water", 5), files)!, colours[5])).toBe(true);
  });

  it("a whole-sheet swap keeps the layout and layers edits on top", () => {
    const sheetInfo = baseSheetOf(src.catalog, "town")!;
    const old = image(sheetInfo.url)!;
    // Invert every opaque pixel: same layout, different art.
    const swapped: Rgba = { width: old.width, height: old.height, data: old.data.map((v, i) => (i % 4 === 3 ? v : 255 - v)) };
    const townKey = Object.keys((src.catalog.bundle("tilesets", "town")!.merged.tiles as object))[0];
    const state: LabState = {
      ...emptyState(),
      sheets: { town: { name: "town.png", image: swapped } },
      edits: { [townKey]: { enabled: true, base: [pink], source: "x" }, grass: { enabled: true, base: [pink], source: "x" } },
    };
    const { plans, cat, files } = installed(state);
    expect(plans.map((p) => p.id)).toEqual(["terrain", "town"]);
    const town = plans[1];
    expect(town.full).toBe(true);
    expect(Object.keys(town.json.tiles).length).toBe(Object.keys(src.catalog.bundle("tilesets", "town")!.merged.tiles as object).length);
    expect(town.sheet.height).toBeGreaterThan(old.height); // an extra row for the edited key
    expect(validatePack(plans, meta, raw, image)).toEqual([]);
    expect(sameImage(resolved(cat, tilePath(townKey as never), files)!, pink)).toBe(true);
    const other = Object.keys(town.json.tiles).find((k) => k !== townKey)!;
    const want = resolved(new ArtCatalog(raw, { legacy: index.legacy }), tilePath(other as never), (u) => (u === sheetInfo.url ? swapped : image(u)))!;
    expect(sameImage(resolved(cat, tilePath(other as never), files)!, want)).toBe(true);
  });

  it("a mapping of an external sheet edits the keys it maps", () => {
    const ext = blank(64, 32);
    paste(ext, pink, 48, 16);
    const data = assign(newMapping("ext.png", 64, 32), "sand", { kind: "base", frame: 1 }, 7);
    const { plans, cat, files } = installed({ ...emptyState(), mapping: { image: ext, data } });
    expect(validatePack(plans, meta, raw, image)).toEqual([]);
    expect(sameImage(resolved(cat, tilePath("sand"), files)!, pink)).toBe(true);
    // fill (the default): unmapped masks show the new base, so the key has none.
    expect(plans[0].json.tiles.sand.masks).toBeUndefined();
  });

  it("the validator catches a broken pack", () => {
    const plans = planAll(src, { ...emptyState(), edits: { grass: { enabled: true, base: [pink], source: "x" } } });
    const broken = plans.map((p) => ({ ...p, json: { ...p.json, tiles: { ...p.json.tiles, grass: { base: 999 } } } }));
    expect(validatePack(broken, meta, raw, image).map((x) => x.message).join("\n")).toMatch(/outside the sheet/);
  });

  it("zips the pack, the README and art.py stems", () => {
    const water = maskGridImage(Array(16).fill(pink));
    expect(water.width).toBe(64);
    const plans = planAll(src, { ...emptyState(), edits: { grass: { enabled: true, base: [pink], fill: true, source: "x" } } });
    const mapping = newMapping("ext.png", 32, 32);
    const files = unzipStore(zipStore(exportEntries(plans, meta, { basePacks: [], mapping })));
    expect([...files.keys()]).toEqual([
      "README.md", `${meta.id}/pack.json`, `${meta.id}/tilesets/terrain/tileset.json`, `${meta.id}/tilesets/terrain/sheet.png`,
      "tiles/terrain/grass.png", "tilelab-mapping.json",
    ]);
    expect(JSON.parse(new TextDecoder().decode(files.get(`${meta.id}/pack.json`)))).toEqual(packJson(meta));
    const sheet = decodePng(files.get(`${meta.id}/tilesets/terrain/sheet.png`)!, inflateSync);
    expect(sameImage(crop(sheet, 0, 0), pink)).toBe(true);
    const readme = new TextDecoder().decode(files.get("README.md"));
    expect(readme).toContain(`public/art/packs/${meta.id}/`);
    expect(readme).toContain("npm run art:index");
    expect(readme).toContain(`?art=${meta.id}`);
    expect(readme).toContain("rm -f /tmp/terrain/grass~1.png");
  });

  it("checks pack ids and names", () => {
    expect(checkMeta(meta)).toEqual([]);
    expect(checkMeta({ id: "Bad Id", name: "" }).length).toBe(2);
    expect(checkMeta({ id: "classic", name: "x" }, ["classic"])[0]).toMatch(/already installed/);
  });
});
