// The art bundle checks of docs/ART.md §9, run against public/art/ on disk.
// Replaces the old src/assets/manifest.test.ts coverage: every logical path
// the contracts require must resolve (to a bundle or, during the Round 4
// migration, a legacy public/assets/ file) at the right size.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildIndex, strayFolders } from "../../tools/art/index.mjs";
import type { ArtIndex } from "./format";
import { diskImages, loadPacksFromDisk, loadRawFromDisk } from "./fs";
import { requiredPaths } from "./required";
import { errorsOnly, validateArt, type Problem } from "./validate";

const PUBLIC = fileURLToPath(new URL("../../public/", import.meta.url));

const fresh = buildIndex(PUBLIC);
let onDisk: ArtIndex | null = null;
try { onDisk = JSON.parse(readFileSync(join(PUBLIC, "art", "index.json"), "utf8")) as ArtIndex; } catch { onDisk = null; }

const raw = loadRawFromDisk(PUBLIC, fresh);
const result = validateArt({
  raw,
  packs: loadPacksFromDisk(PUBLIC, fresh),
  legacy: fresh.legacy,
  image: diskImages(PUBLIC),
});
const problems = errorsOnly(result.problems);
const fmt = (ps: Problem[]) => ps.map((p) => `${p.where}: ${p.message}`);
const isRequired = (p: Problem) => p.where.startsWith("assets/");
const isTileOwner = (p: Problem) => p.where.startsWith("tile ");
const isPack = (p: Problem) => p.where.startsWith("packs/");

const required = requiredPaths();
const legacyCount = result.legacyOnly.length;
if (legacyCount) {
  console.info(`[art] ${legacyCount} of ${required.length} required paths are still legacy-only (public/assets/):\n  ` +
    result.legacyOnly.slice(0, 20).join("\n  ") + (legacyCount > 20 ? `\n  … and ${legacyCount - 20} more` : ""));
}

describe("art bundles (docs/ART.md §9)", () => {
  it("index.json matches the folders (run `npm run art:index`)", () => {
    expect(onDisk, "public/art/index.json is missing").not.toBeNull();
    expect(onDisk).toEqual(fresh);
  });

  it("every bundle folder has its bundle JSON", () => {
    expect(strayFolders(PUBLIC)).toEqual([]);
  });

  it("bundle JSON, image sizes, frame counts, cell refs and species colours are valid", () => {
    expect(fmt(problems.filter((p) => !isRequired(p) && !isTileOwner(p) && !isPack(p)))).toEqual([]);
  });

  it("every TileKey is defined by at most one tileset", () => {
    expect(fmt(problems.filter(isTileOwner))).toEqual([]);
  });

  it("packs are valid (each override names an existing bundle or is a complete new one)", () => {
    expect(fmt(problems.filter(isPack))).toEqual([]);
  });

  it(`every required logical path resolves at the right size (${legacyCount} of ${required.length} still legacy-only)`, () => {
    const byGroup: Record<string, string[]> = {};
    for (const p of result.missing) {
      const g = required.find((r) => r.path === p)?.group ?? "other";
      (byGroup[g] ??= []).push(p);
    }
    expect(byGroup, "missing art, by group").toEqual({});
    expect(fmt(problems.filter((p) => isRequired(p) && !result.missing.includes(p.where)))).toEqual([]);
  });
});
