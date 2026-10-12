import { describe, expect, it } from "vitest";
import {
  applyEdit, blank, cellOf, classifyUpload, crop, editFromUpload, imageKey, isBlank, maskCell, maskGridImage,
  paste, sameImage, sliceMaskGrid, solid, type TileArt,
} from "./tiles";

const red = solid([255, 0, 0, 255]);
const green = solid([0, 255, 0, 255]);
const blue = solid([0, 0, 255, 255]);
/** A 16x16 tile whose every pixel encodes `n`. */
const tagged = (n: number) => solid([n, 0, 0, 255]);

describe("pixels", () => {
  it("crops, pastes and reads cells", () => {
    const sheet = blank(32, 32);
    paste(sheet, red, 16, 0);
    paste(sheet, green, 0, 16);
    expect(sameImage(cellOf(sheet, 1, 2), red)).toBe(true);
    expect(sameImage(cellOf(sheet, 2, 2), green)).toBe(true);
    expect(isBlank(cellOf(sheet, 0, 2))).toBe(true);
    // Outside the image: transparent.
    expect(isBlank(crop(sheet, 40, 40))).toBe(true);
    expect(isBlank(cellOf(sheet, 3, 2))).toBe(true);
  });
  it("keys images by pixels, ignoring the colour of transparent pixels", () => {
    const a = blank();
    const b = blank();
    b.data[0] = 99; // colour byte of a transparent pixel
    expect(imageKey(a)).toBe(imageKey(b));
    expect(imageKey(red)).not.toBe(imageKey(green));
  });
});

describe("mask grids", () => {
  it("orders masks 0–15 row-major and round-trips", () => {
    expect(maskCell(0)).toEqual({ x: 0, y: 0 });
    expect(maskCell(5)).toEqual({ x: 16, y: 16 });
    expect(maskCell(15)).toEqual({ x: 48, y: 48 });
    const masks = Array.from({ length: 16 }, (_, m) => tagged(m + 1));
    const grid = maskGridImage(masks);
    expect(grid.width).toBe(64);
    const back = sliceMaskGrid(grid);
    back.forEach((m, i) => expect(m.data[0]).toBe(i + 1));
  });
});

describe("uploads", () => {
  it("classifies by size", () => {
    expect(classifyUpload(16, 16, false).kind).toBe("tile");
    expect(classifyUpload(32, 16, true).kind).toBe("frames");
    expect(classifyUpload(64, 64, true).kind).toBe("masks");
    expect(classifyUpload(128, 64, true).kind).toBe("masks2");
    expect(classifyUpload(64, 64, false)).toEqual({ kind: "sheet", columns: 4, rows: 4 });
    expect(classifyUpload(17, 16, false).kind).toBe("bad");
  });
  it("turns a 64x64 grid into all 16 masks, with mask 15 as the base", () => {
    const grid = maskGridImage(Array.from({ length: 16 }, (_, m) => tagged(m + 1)));
    const e = editFromUpload(grid, true, false, "g.png")!;
    expect(Object.keys(e.masks!).length).toBe(16);
    expect(e.masks![5][0].data[0]).toBe(6);
    expect(e.base![0].data[0]).toBe(16);
  });
  it("reads 32x16 as two frames and 128x64 as two mask grids", () => {
    const strip = blank(32, 16);
    paste(strip, red, 0, 0);
    paste(strip, blue, 16, 0);
    const e = editFromUpload(strip, false, true, "s.png")!;
    expect(e.base!.map((b) => sameImage(b, red))).toEqual([true, false]);
    expect(e.fill).toBe(true);
    const two = blank(128, 64);
    paste(two, maskGridImage(Array(16).fill(red)), 0, 0);
    paste(two, maskGridImage(Array(16).fill(blue)), 64, 0);
    const m = editFromUpload(two, true, false, "w.png")!;
    expect(sameImage(m.masks![3][1], blue)).toBe(true);
  });
});

describe("applyEdit", () => {
  const cur: TileArt = { base: [red], alts: [green, green], masks: { 0: [blue], 5: [blue] } };
  it("replaces the base and keeps alts and masks", () => {
    const a = applyEdit(cur, { enabled: true, base: [green], source: "x" });
    expect(sameImage(a.base[0], green)).toBe(true);
    expect(a.alts.length).toBe(2);
    expect(Object.keys(a.masks)).toEqual(["0", "5"]);
  });
  it("fill drops alts and masks so the base shows everywhere", () => {
    const a = applyEdit(cur, { enabled: true, base: [green], fill: true, source: "x" });
    expect(a).toEqual({ base: [green], alts: [], masks: {} });
  });
  it("a disabled edit changes nothing", () => {
    expect(applyEdit(cur, { enabled: false, base: [green], source: "x" })).toBe(cur);
  });
  it("gives masks a second frame when the base animates, and repeats a still base over animated masks", () => {
    const a = applyEdit(cur, { enabled: true, base: [red, green], source: "x" });
    expect(a.masks[0].length).toBe(2);
    const water: TileArt = { base: [red, green], alts: [], masks: { 3: [red, green] } };
    const b = applyEdit(water, { enabled: true, base: [blue], source: "x" });
    expect(b.base.length).toBe(2);
    expect(sameImage(b.base[1], blue)).toBe(true);
    const c = applyEdit(water, { enabled: true, base: [blue], fill: true, source: "x" });
    expect(c.base.length).toBe(1);
  });
});
