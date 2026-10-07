import { describe, expect, it, vi } from "vitest";
import { drawGraftCollarPlaceholder } from "./hud";

function canvas() {
  const rects: { color: string; rect: number[] }[] = [];
  const g = {
    fillStyle: "", save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
    rect: vi.fn(), clip: vi.fn(), translate: vi.fn(), scale: vi.fn(),
    fillRect: (...rect: number[]) => rects.push({ color: g.fillStyle, rect }),
  };
  return { g, rects };
}

const LEATHER = ["#a07040", "#704828", "#40281a"];
const BRASS = ["#e0b048", "#a07818"];
const WIRE = ["#d8d8e0", "#888898"];

describe("graft collar overlay", () => {
  it("clamps a leather and brass collar with a wire splint across the lower third", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, 96, 0, { clipBottom: 56 });
    expect(g.translate).toHaveBeenCalledWith(96, 0);
    expect(g.rect).toHaveBeenCalledWith(0, 0, 160, 56);
    expect(g.clip).toHaveBeenCalled();
    expect(g.restore).toHaveBeenCalled();
    // every pixel run is one row tall and sits inside the sprite's lower half
    for (const { rect: [x, y, w, h] } of rects) {
      expect(h).toBe(1);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(56);
      expect(y).toBeGreaterThanOrEqual(28);
      expect(y).toBeLessThan(56);
    }
    const colors = new Set(rects.map((r) => r.color));
    for (const c of ["#181818", ...LEATHER, ...BRASS, ...WIRE]) expect(colors).toContain(c);
    // the strap itself (leather) lies in the lower third, the splint runs past it
    const strap = rects.filter((r) => LEATHER.includes(r.color)).map((r) => r.rect[1]);
    expect(Math.min(...strap)).toBeGreaterThanOrEqual(56 * 2 / 3 - 1);
    const wire = rects.filter((r) => WIRE.includes(r.color)).map((r) => r.rect[1]);
    expect(Math.min(...wire)).toBeLessThan(Math.min(...strap));
    expect(Math.max(...wire)).toBeGreaterThan(Math.max(...strap));
  });

  it("follows scaling, wilt drop and silhouette tint", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, 96, 0, { scale: 0.5, drop: 8, silhouette: "#f8f8f8" });
    expect(g.translate).toHaveBeenCalledWith(110, 36);
    expect(g.scale).toHaveBeenCalledWith(0.5, 0.5);
    expect(rects.length).toBeGreaterThan(0);
    expect(rects.every((r) => r.color === "#f8f8f8")).toBe(true);
  });

  it("draws nothing at zero scale", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, 96, 0, { scale: 0 });
    expect(rects).toEqual([]);
    expect(g.save).not.toHaveBeenCalled();
  });
});
