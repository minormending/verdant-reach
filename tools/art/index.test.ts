import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_PACKS as RUNTIME_LOCAL_PACKS } from "../../src/art/format";
import { buildIndex, buildLocalIndexes, formatIndex, LOCAL_PACKS, main } from "./index.mjs";

let temp: string | undefined;
afterEach(() => {
  if (temp) rmSync(temp, { recursive: true, force: true });
  temp = undefined;
  vi.restoreAllMocks();
});

describe("local art pack indexes", () => {
  it("keeps runtime discovery and index exclusions in sync", () => {
    expect(LOCAL_PACKS).toEqual(RUNTIME_LOCAL_PACKS);
  });

  it("writes a fake local pack only to its own index, leaving committed bytes unchanged", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    temp = mkdtempSync(join(tmpdir(), "verdant-local-pack-"));
    const publicDir = join(temp, "public");
    cpSync(fileURLToPath(new URL("../../src/art/__fixtures__/public/", import.meta.url)), publicDir, { recursive: true });
    const committed = join(publicDir, "art", "index.json");
    expect(main([], publicDir)).toBe(0);
    const before = readFileSync(committed, "utf8");
    expect(buildLocalIndexes(publicDir)).toEqual({});
    expect(existsSync(join(publicDir, "art", "packs", "limezu"))).toBe(false);

    const packDir = join(publicDir, "art", "packs", "limezu");
    const bundleDir = join(packDir, "characters", "player");
    mkdirSync(bundleDir, { recursive: true });
    writeFileSync(join(packDir, "pack.json"), JSON.stringify({ name: "Fake local pack", description: "No pixels", author: "Test" }));
    writeFileSync(join(bundleDir, "character.json"), "{}");
    writeFileSync(join(bundleDir, "fake.txt"), "No art in this fixture");

    expect(formatIndex(buildIndex(publicDir))).toBe(before);
    expect(main(["--check"], publicDir)).toBe(1); // missing local index
    expect(main([], publicDir)).toBe(0);
    expect(readFileSync(committed, "utf8")).toBe(before);
    expect(JSON.parse(readFileSync(join(packDir, "index.json"), "utf8"))).toEqual({
      format: "verdant.artindex/1", species: {}, tilesets: {}, structures: {}, characters: {}, sets: {}, legacy: [],
      packs: {
        limezu: {
          name: "Fake local pack", description: "No pixels", author: "Test",
          species: {}, tilesets: {}, structures: {}, characters: { player: ["fake.txt"] }, sets: {},
        },
      },
    });
    expect(main(["--check"], publicDir)).toBe(0);
    writeFileSync(join(bundleDir, "another.txt"), "Still no pixels");
    expect(main(["--check"], publicDir)).toBe(1); // stale local index
    expect(readFileSync(committed, "utf8")).toBe(before);

    rmSync(packDir, { recursive: true });
    expect(main([], publicDir)).toBe(0);
    expect(readFileSync(committed, "utf8")).toBe(before);
    expect(main(["--check"], publicDir)).toBe(0);
  });
});
