// "TO BE CONTINUED" card shown at the end of the slice.

import type { GameContext, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W, UI } from "../contracts";
import { Fader } from "../engine/gfx";
import { formatPlayTime } from "../save";
import { drawText, drawTextOutlined } from "./kit";
import { Pollen } from "./pollen";

export function toBeContinued(ctx: GameContext): Promise<void> {
  return ctx.scenes.run<void>((done) => {
    const pollen = new Pollen(36);
    const fader = new Fader();
    fader.set("white");
    let frame = 0;
    let leaving = false;
    const title = "TO BE CONTINUED";
    const scene: Scene = {
      enter() {
        ctx.audio.playMusic("slice_end");
        void fader.to("clear", 60);
      },
      update() {
        frame++;
        fader.tick();
        pollen.update();
        if (!leaving && frame > 240 && (ctx.input.pressed("a") || ctx.input.pressed("start"))) {
          leaving = true;
          ctx.audio.stopMusic(60);
          void fader.to("black", 60).then(() => done());
        }
      },
      draw(g) {
        // Dusk gradient.
        const bands = ["#10261a", "#14301f", "#183a24", "#1c4429", "#204e2e", "#245833"];
        bands.forEach((c, i) => {
          g.fillStyle = c;
          g.fillRect(0, Math.floor(i * SCREEN_H / bands.length), SCREEN_W, Math.ceil(SCREEN_H / bands.length));
        });
        pollen.draw(g, Math.min(1, frame / 120));
        // Letters appear one by one, then hold.
        const shown = Math.min(title.length, Math.max(0, Math.floor((frame - 50) / 6)));
        const text = title.slice(0, shown);
        const titleY = Math.floor(SCREEN_H / 3);
        const bob = Math.round(Math.sin(frame / 40) * 1);
        drawTextOutlined(g, text, Math.floor((SCREEN_W - title.length * 8) / 2), titleY + bob, "#f8e070", "#0a1a12");
        if (frame > 160) {
          const st = ctx.state;
          const lines: [string, string][] = [
            ["HERBARIUM", String(st.herbarium.caught.length)],
            ["MARKS", String(st.marks.length)],
            ["TIME", formatPlayTime(st.playTimeMs)],
          ];
          g.globalAlpha = Math.min(1, (frame - 160) / 40);
          // a thin vine rule under the title
          g.fillStyle = "#78c058";
          g.fillRect(SCREEN_W / 2 - 40, titleY + 14, 80, 1);
          g.fillRect(SCREEN_W / 2 - 2, titleY + 12, 4, 4);
          lines.forEach(([k, v], i) => {
            drawText(g, k, SCREEN_W / 2 - 48, titleY + 28 + i * 12, "#c8e8b0");
            drawText(g, v, SCREEN_W / 2 + 48 - Array.from(v).length * 8, titleY + 28 + i * 12, "#f8f8f8");
          });
          g.globalAlpha = 1;
        }
        if (frame > 240 && !leaving && Math.floor(frame / 32) % 2 === 0) {
          drawText(g, "THANKS FOR PLAYING!", (SCREEN_W - 18 * 8) / 2, SCREEN_H - 16, UI.white);
        }
        fader.draw(g, SCREEN_W, SCREEN_H);
      },
    };
    return scene;
  });
}
