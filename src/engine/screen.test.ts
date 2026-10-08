import { describe, expect, it, vi } from "vitest";
import type { ArtImage } from "../contracts";
import { SCREEN_H, SCREEN_W } from "../contracts";
import { drawCenteredStill } from "./gfx";
import { fitScreen, screenArea } from "./screen";
import { computeLayout } from "../platform/layout";

describe("native screen", () => {
  it.each([[1280, 720, 4], [1024, 768, 3], [640, 359, 1]])("integer fits a %i×%i window", (w, h, scale) => {
    const fit = fitScreen({ x: 0, y: 0, w, h });
    expect(fit.scale).toBe(scale);
    expect(fit.screen).toEqual({ x: Math.round((w - SCREEN_W * scale) / 2),
      y: Math.round((h - SCREEN_H * scale) / 2), w: SCREEN_W * scale, h: SCREEN_H * scale });
  });

  it.each([[390, 844, 3], [844, 390, 3], [1024, 768, 2]])("reserves touch controls in a %i×%i viewport", (w, h, dpr) => {
    const layout = computeLayout({ vw: w, vh: h, dpr, touch: true });
    const fit = fitScreen(screenArea(layout, { x: 0, y: 0, w, h }), dpr);
    expect(Number.isInteger(fit.scale)).toBe(true);
    expect(fit.screen.x).toBeGreaterThanOrEqual(0);
    expect(fit.screen.y).toBeGreaterThanOrEqual(0);
    expect(fit.screen.x + fit.screen.w).toBeLessThanOrEqual(w);
    expect(fit.screen.y + fit.screen.h).toBeLessThanOrEqual(h);
    for (const r of [layout.dpad, layout.a, layout.b, layout.start, layout.select]) {
      expect(r && fit.screen.x < r.x + r.w && r.x < fit.screen.x + fit.screen.w
        && fit.screen.y < r.y + r.h && r.y < fit.screen.y + fit.screen.h).toBe(false);
    }
  });

  it("frames an existing story still at 1× rather than stretching it", () => {
    const img = { width: 160, height: 144 } as ArtImage;
    const g = { fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    drawCenteredStill(g, img);
    expect(g.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_W, SCREEN_H);
    expect(g.fillStyle).toBe("#181818");
    expect(g.drawImage).toHaveBeenCalledExactlyOnceWith(img, 80, 18);
  });
});
