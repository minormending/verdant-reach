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

describe("graft collar placeholder", () => {
  it("draws a 2px ochre band with a black outline across the lower third", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, 96, 0, { clipBottom: 56 });
    expect(rects).toEqual([
      { color: "#181818", rect: [0, 36, 56, 4] },
      { color: "#a07840", rect: [1, 37, 54, 2] },
    ]);
    expect(g.translate).toHaveBeenCalledWith(96, 0);
    expect(g.rect).toHaveBeenCalledWith(0, 0, 160, 56);
    expect(g.clip).toHaveBeenCalled();
    expect(g.restore).toHaveBeenCalled();
  });

  it("follows scaling, wilt drop and silhouette tint", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, 96, 0, { scale: 0.5, drop: 8, silhouette: "#f8f8f8" });
    expect(g.translate).toHaveBeenCalledWith(110, 36);
    expect(g.scale).toHaveBeenCalledWith(0.5, 0.5);
    expect(rects.every((r) => r.color === "#f8f8f8")).toBe(true);
  });
});
