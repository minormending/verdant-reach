import { describe, expect, it } from "vitest";
import { GB_H, GB_W, computeLayout, dpadDirection, integerScale, overlaps } from "./layout";

const inside = (r: { x: number; y: number; w: number; h: number }, vw: number, vh: number) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= vw + 0.01 && r.y + r.h <= vh + 0.01;

describe("integerScale", () => {
  it("fits whole device pixels and never drops below 1", () => {
    expect(integerScale(800, 600, 1)).toBe(4);
    expect(integerScale(800, 600, 2)).toBe(8);
    expect(integerScale(100, 100, 1)).toBe(1);
    // 1.25x Windows scaling: 4 device px per game px, not a blurry 3.75.
    expect(integerScale(600, 500, 1.25)).toBe(4);
  });
});

describe("computeLayout", () => {
  const devices = [
    { name: "desktop", vw: 1440, vh: 900, dpr: 2, touch: false },
    { name: "small window", vw: 300, vh: 200, dpr: 1, touch: false },
    { name: "phone portrait", vw: 375, vh: 812, dpr: 3, touch: true },
    { name: "small phone portrait", vw: 320, vh: 568, dpr: 2, touch: true },
    { name: "phone landscape", vw: 812, vh: 375, dpr: 3, touch: true },
    { name: "small phone landscape", vw: 568, vh: 320, dpr: 2, touch: true },
    { name: "tablet portrait", vw: 768, vh: 1024, dpr: 2, touch: true },
    { name: "tablet landscape", vw: 1180, vh: 820, dpr: 2, touch: true },
  ];
  for (const d of devices) {
    it(`${d.name}: integer scale, on screen, controls clear of the screen`, () => {
      const l = computeLayout(d);
      expect(Number.isInteger(l.scale)).toBe(true);
      // The canvas is exactly scale device pixels per game pixel.
      expect(l.screen.w * d.dpr).toBeCloseTo(GB_W * l.scale, 6);
      expect(l.screen.h * d.dpr).toBeCloseTo(GB_H * l.scale, 6);
      // Snapped to the device-pixel grid.
      expect(Math.abs(l.screen.x * d.dpr - Math.round(l.screen.x * d.dpr))).toBeLessThan(1e-6);
      expect(Math.abs(l.screen.y * d.dpr - Math.round(l.screen.y * d.dpr))).toBeLessThan(1e-6);
      if (l.scale > 1) expect(inside(l.screen, d.vw, d.vh)).toBe(true);
      if (!d.touch) {
        expect(l.mode).toBe("desktop");
        expect(l.dpad).toBeUndefined();
        return;
      }
      expect(l.mode).toBe(d.vh >= d.vw ? "portrait" : "landscape");
      const ctl = [l.dpad!, l.a!, l.b!, l.start!, l.select!];
      for (const r of ctl) {
        expect(inside(r, d.vw, d.vh)).toBe(true);
        expect(overlaps(r, l.screen)).toBe(false);
      }
      // Controls never overlap each other.
      for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) expect(overlaps(ctl[i], ctl[j])).toBe(false);
      // Thumb-sized targets.
      expect(l.a!.w).toBeGreaterThanOrEqual(44);
      expect(l.dpad!.w).toBeGreaterThanOrEqual(80);
    });
  }

  it("gives the screen priority over control size in landscape", () => {
    // iPad 1024x768 @2x: 4 CSS px per game pixel fits once the controls stop at size 4.
    expect(computeLayout({ vw: 1024, vh: 768, dpr: 2, touch: true }).scale).toBe(8);
  });

  it("respects safe-area insets", () => {
    const l = computeLayout({ vw: 812, vh: 375, dpr: 3, touch: true, safe: { top: 0, right: 44, bottom: 21, left: 44 } });
    expect(l.dpad!.x).toBeGreaterThanOrEqual(44);
    expect(l.a!.x + l.a!.w).toBeLessThanOrEqual(812 - 44);
    expect(l.start!.y + l.start!.h).toBeLessThanOrEqual(375 - 21);
  });
});

describe("dpadDirection", () => {
  it("picks the dominant axis with a small dead zone", () => {
    expect(dpadDirection(0, 0, 100)).toBeNull();
    expect(dpadDirection(30, 5, 100)).toBe("right");
    expect(dpadDirection(-30, 10, 100)).toBe("left");
    expect(dpadDirection(5, -30, 100)).toBe("up");
    expect(dpadDirection(-10, 40, 100)).toBe("down");
  });
});
