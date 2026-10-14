import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { precacheList, swSource } from "./precache";

describe("offline precache", () => {
  it("keeps every built file but the worker, source maps and OS clutter, plus the folder URL", () => {
    expect(precacheList(["index.html", "sw.js", "assets/main-1.js", "assets/main-1.js.map", "art\\index.json", "art/.DS_Store"]))
      .toEqual(["./", "art/index.json", "assets/main-1.js", "index.html"]);
  });

  it("fills the template's version and file list", () => {
    const template = readFileSync("src/platform/offline/sw.template.js", "utf8");
    const src = swSource(template, ["./", "index.html"], "20261014-abc");
    expect(src).toContain('const VERSION = "20261014-abc";');
    expect(src).toContain('const FILES = ["./","index.html"];');
    expect(src).not.toContain("__VERSION__");
    expect(src).not.toContain("__FILES__");
  });

  it("refuses a template without its placeholders", () => {
    expect(() => swSource("const x = 1;", [], "v")).toThrow(/placeholders/);
  });
});
