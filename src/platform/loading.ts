// Boot loading scene: the logo over a night-green field and a vine that grows
// along the progress bar, putting out a leaf every few pixels.

import type { Assets, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W, UI, uiPath } from "../contracts";
import { drawText } from "../ui/kit";

const BG = "#0c1a12";
const STEM = "#58a040";
const STEM_DARK = "#285828";
const LEAF = "#98d060";
const LEAF_LIT = "#e0f0a0";

export interface LoadingScene extends Scene {
  progress(done: number, total: number): void;
  /** Resolves once the vine has visibly finished (keeps a fast load from flashing). */
  finish(): Promise<void>;
}

export function createLoadingScene(assets: Assets): LoadingScene {
  let target = 0;
  let shown = 0;
  let frame = 0;
  let finishing: (() => void) | null = null;
  const X0 = 28;
  const X1 = 132;
  const Y = 100;

  const leaf = (g: CanvasRenderingContext2D, x: number, up: boolean, grow: number) => {
    // A 4px leaf that unfurls over a few frames, lit from the top-left.
    const s = Math.min(3, grow);
    if (s <= 0) return;
    const dy = up ? -1 : 1;
    g.fillStyle = STEM_DARK;
    g.fillRect(x, Y + (up ? -1 : 2), 1, 1);
    g.fillStyle = LEAF;
    for (let i = 1; i <= s; i++) g.fillRect(x + i - 1, Y + (up ? -1 : 2) + dy * i, Math.max(1, 3 - Math.abs(i - 2)), 1);
    if (s >= 3) {
      g.fillStyle = LEAF_LIT;
      g.fillRect(x, Y + (up ? -2 : 3), 1, 1);
    }
  };

  return {
    progress(done, total) { target = total > 0 ? done / total : 1; },
    finish() {
      target = 1;
      return new Promise((resolve) => { finishing = resolve; });
    },
    update() {
      frame++;
      shown += (target - shown) * 0.25;
      if (target - shown < 0.004) shown = target;
      if (finishing && shown >= 1) {
        const f = finishing;
        finishing = null;
        // Hold the full vine for a beat.
        setTimeout(f, 180);
      }
    },
    draw(g) {
      g.fillStyle = BG;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      // A few still stars.
      g.fillStyle = "#284838";
      for (let i = 0; i < 18; i++) g.fillRect((i * 53 + 11) % SCREEN_W, (i * 31 + 7) % 64, 1, 1);
      const logo = assets.image(uiPath("title_logo"));
      if (logo) g.drawImage(logo, Math.round((SCREEN_W - logo.width) / 2), 28);
      else drawText(g, "VERDANT REACH", 28, 40, UI.light);
      // Soil groove for the vine.
      g.fillStyle = "#142a1c";
      g.fillRect(X0 - 2, Y + 2, X1 - X0 + 4, 2);
      const len = Math.round((X1 - X0) * shown);
      g.fillStyle = STEM_DARK;
      g.fillRect(X0, Y + 1, len, 1);
      g.fillStyle = STEM;
      g.fillRect(X0, Y, len, 1);
      for (let x = X0 + 6, i = 0; x < X0 + len; x += 9, i++) leaf(g, x, i % 2 === 0, Math.floor((X0 + len - x) / 2));
      // The growing tip.
      if (len > 0 && shown < 1) {
        g.fillStyle = LEAF_LIT;
        g.fillRect(X0 + len, Y - (frame >> 3) % 2, 1, 1);
      }
      const pct = `${Math.floor(shown * 100)}%`;
      const label = shown >= 1 ? "READY" : `GROWING ${pct}`;
      drawText(g, label, Math.round((SCREEN_W - label.length * 8) / 2), 112, shown >= 1 ? LEAF_LIT : UI.light);
    },
  };
}
