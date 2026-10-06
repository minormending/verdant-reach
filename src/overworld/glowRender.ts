// An opaque pixel mask over the tinted world, before illustrations and UI.
// No alpha gradients or second tint: uncovered pixels keep their world colour.
import { SCREEN_H, SCREEN_W, TILE } from "../contracts";
import { glowField, type GlowBand, type GlowPosition } from "./glow";

/** World-anchored 2x2 dither: inner hides 1/4, outer hides 3/4 of pixels. */
export function glowPixelHidden(band: GlowBand, x: number, y: number): boolean {
  const evenX = (x & 1) === 0;
  const evenY = (y & 1) === 0;
  return band === "dark" || (band === "inner" && evenX && evenY) || (band === "outer" && (evenX || evenY));
}

export function drawGlow(
  g: CanvasRenderingContext2D, camX: number, camY: number,
  player: GlowPosition, lamps: readonly GlowPosition[], hasLantern: boolean,
): void {
  const bandAt = glowField(player, lamps, hasLantern);
  g.save();
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "#000000";
  // Coalesce horizontal black runs, including fully dark areas of the screen.
  // Sample pixels as well as tile centres for round, stair-stepped edges.
  for (let sy = 0; sy < SCREEN_H; sy++) {
    const wy = sy + camY;
    let start = -1;
    for (let sx = 0; sx <= SCREEN_W; sx++) {
      const wx = sx + camX;
      const hidden = sx < SCREEN_W && glowPixelHidden(bandAt((wx + 0.5) / TILE - 0.5, (wy + 0.5) / TILE - 0.5), wx, wy);
      if (hidden && start < 0) start = sx;
      if (!hidden && start >= 0) { g.fillRect(start, sy, sx - start, 1); start = -1; }
    }
  }
  g.restore();
}
