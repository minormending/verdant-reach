import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./release-check.mjs", import.meta.url));
let root: string;

function write(path: string, content: string) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function run() {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "verdant-release-check-"));
  for (const path of ["public/art", "src", "e2e"]) mkdirSync(join(root, path), { recursive: true });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("release-check CLI", () => {
  it("passes clean files and permits e2e-only tolerance", () => {
    write("public/art/sets/items/set.json", JSON.stringify({
      notes: "Finished art", entries: [{ notes: "Replaced PLACEHOLDER" }, { notes: null }],
    }));
    write("src/game.ts", 'say("Welcome!");');
    write("e2e/runner.mjs", '// TODO(text) dialogue is permitted with allowTodo here');
    expect(run()).toEqual({ status: 0, output: "release-check: OK\n" });
  });

  it.each([
    ["public/art/species/fern/species.json", { notes: "PLACEHOLDER fern" }],
    ["public/art/tilesets/placeholder_tiles/tileset.json", { notes: "PLACEHOLDER tiles" }],
    ["public/art/sets/items/set.json", { notes: "PLACEHOLDER items" }],
    ["public/art/sets/items/set.json", { entries: { seed: { notes: "PLACEHOLDER seed" } } }],
    ["public/art/packs/test/sets/items/set.json", { entries: [{ notes: "PLACEHOLDER seed" }] }],
  ])("rejects placeholder notes in %s", (path, json) => {
    write(path, JSON.stringify(json));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain(path);
    expect(result.output).toContain("PLACEHOLDER");
  });

  it.each([
    ["src/world/ch5.ts", 'say("TODO(text): Finish me");', "TODO(text)"],
    ["src/dialogue.txt", "TODO(text): Finish me", "TODO(text)"],
    ["src/driver.mjs", "const allowTodo = true;", "allowTodo"],
    ["src/e2e/driver.ts", "// allowTodo", "allowTodo"],
  ])("rejects source markers in %s", (path, content, marker) => {
    write(path, content);
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain(`${path}:1:`);
    expect(result.output).toContain(marker);
  });

  it("lists every offender instead of stopping at the first", () => {
    write("public/art/packs/test/bundle.json", JSON.stringify({
      notes: "PLACEHOLDER bundle", entries: [{ notes: "PLACEHOLDER entry" }],
    }));
    write("src/dialogue.ts", 'say("TODO(text): One");\nsay("TODO(text): Two"); // allowTodo');
    write("src/other.txt", "allowTodo allowTodo");
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output.trim().split("\n")).toHaveLength(8);
    expect(result.output).toContain('$["notes"]');
    expect(result.output).toContain('$["entries"]["0"]["notes"]');
    expect(result.output).toContain("src/dialogue.ts:1:");
    expect(result.output).toContain("src/dialogue.ts:2:");
    expect(result.output).toContain("src/other.txt:1:");
    expect(result.output).not.toContain("release-check: OK");
  });

  it("fails with a path when JSON cannot be checked", () => {
    write("public/art/broken.json", "{");
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain("public/art/broken.json: cannot check JSON");
  });
});
