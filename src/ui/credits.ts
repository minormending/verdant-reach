import type { GameContext, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W, TEXTBOX, UI } from "../contracts";
import { CREDITS } from "../world/credits";
import { wrapText } from "./font";

/** A pixel every three 60 Hz ticks: readable text at 20 pixels per second. */
export const CREDITS_TICKS_PER_PIXEL = 3;
const LINE_HEIGHT = 16;
const GLYPH_HEIGHT = 8;
const lines = CREDITS.flatMap((entry, i) => [
  ...wrapText(entry, TEXTBOX.cols), ...(i < CREDITS.length - 1 ? [""] : []),
]);
/** Finish only after the final glyph has scrolled completely off the top. */
export const CREDITS_DURATION_TICKS =
  (SCREEN_H + (lines.length - 1) * LINE_HEIGHT + GLYPH_HEIGHT) * CREDITS_TICKS_PER_PIXEL;

/** Opaque screen-size scene; popping it resumes the ending script and the game. */
export function rollCredits(ctx: GameContext): Promise<void> {
  return ctx.scenes.run<void>((done) => {
    let ticks = 0;
    let finished = false;
    const scene: Scene = {
      update() {
        if (finished) return;
        ticks++;
        if (ctx.input.pressed("b") || ticks >= CREDITS_DURATION_TICKS) {
          finished = true;
          done();
        }
      },
      draw(g) {
        g.fillStyle = UI.black;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        const top = SCREEN_H - Math.floor(ticks / CREDITS_TICKS_PER_PIXEL);
        lines.forEach((line, i) => {
          const y = top + i * LINE_HEIGHT;
          if (!line || y <= -GLYPH_HEIGHT || y >= SCREEN_H) return;
          ctx.ui.drawText(g, line, Math.floor((SCREEN_W - ctx.ui.measure(line)) / 2), y, UI.white);
        });
      },
    };
    return scene;
  });
}
