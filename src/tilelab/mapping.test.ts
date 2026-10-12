import { describe, expect, it } from "vitest";
import { assign, assignMaskBlock, cellUses, mappingEdits, newMapping, parseMapping, slotCell, unassign, unmappedKeys } from "./mapping";
import { blank, paste, solid } from "./tiles";

describe("sheet mapping", () => {
  const m0 = newMapping("ext.png", 128, 64); // 8 x 4 cells

  it("assigns base frames, alts and masks", () => {
    let m = assign(m0, "grass", { kind: "base", frame: 1 }, 3);
    m = assign(m, "grass", { kind: "base", frame: 2 }, 4);
    m = assign(m, "grass", { kind: "alt", n: 1 }, 5);
    m = assign(m, "grass", { kind: "alt", n: 3 }, 6); // appends (alts stay dense)
    m = assign(m, "water", { kind: "mask", mask: 7, frame: 1 }, 9);
    expect(m.tiles.grass).toEqual({ base: [3, 4], alts: [5, 6] });
    expect(slotCell(m, "water", { kind: "mask", mask: 7, frame: 1 })).toBe(9);
    expect(m0.tiles).toEqual({}); // immutable
    expect(unmappedKeys(m, ["grass", "water", "sand"])).toEqual(["sand"]);
    expect(cellUses(m).get(4)).toEqual(["grass frame 2"]);
    expect(() => assign(m0, "grass", { kind: "base", frame: 1 }, 32)).toThrow();
  });

  it("frame 2 before frame 1 fills both", () => {
    expect(assign(m0, "water", { kind: "base", frame: 2 }, 2).tiles.water.base).toEqual([2, 2]);
  });

  it("assigns a 4x4 block in mask order", () => {
    const m = assignMaskBlock(m0, "path", 2);
    expect(m.tiles.path.masks!["0"]).toEqual([2]);
    expect(m.tiles.path.masks!["3"]).toEqual([5]);
    expect(m.tiles.path.masks!["4"]).toEqual([10]);
    expect(m.tiles.path.masks!["15"]).toEqual([29]);
    expect(() => assignMaskBlock(m0, "path", 5)).toThrow(/off the sheet/);
  });

  it("unassigns slots and whole keys", () => {
    let m = assign(assign(m0, "grass", { kind: "base", frame: 1 }, 1), "grass", { kind: "base", frame: 2 }, 2);
    m = unassign(m, "grass", { kind: "base", frame: 2 });
    expect(m.tiles.grass.base).toEqual([1]);
    m = unassign(m, "grass", { kind: "base", frame: 1 });
    expect(m.tiles.grass).toBeUndefined();
    m = assignMaskBlock(m0, "path", 0);
    expect(unassign(m, "path").tiles.path).toBeUndefined();
  });

  it("round-trips through JSON and reports bad entries", () => {
    const m = assignMaskBlock(assign(m0, "grass", { kind: "base", frame: 1 }, 1), "path", 0);
    const back = parseMapping(JSON.parse(JSON.stringify(m)));
    expect(back.errors).toEqual([]);
    expect(back.mapping).toEqual(m);
    const bad = parseMapping({ ...m, tiles: { nope: { base: [1] }, grass: { base: [99] }, path: { masks: { "16": [1] } } } });
    expect(bad.errors.length).toBe(3);
    expect(parseMapping({ format: "x" }).mapping).toBeNull();
  });

  it("cuts edits from the sheet", () => {
    const sheet = blank(128, 64);
    paste(sheet, solid([10, 20, 30, 255]), 16, 0);
    const m = assign(m0, "grass", { kind: "base", frame: 1 }, 1);
    const e = mappingEdits(m, sheet).get("grass")!;
    expect(e.base![0].data.slice(0, 4)).toEqual(new Uint8Array([10, 20, 30, 255]));
    expect(e.fill).toBe(true);
  });
});
