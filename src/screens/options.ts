// Options: text speed and music/sfx volume. Volumes are a per-browser
// setting (GameState has no field for them), kept in localStorage.

import type { GameContext, Input } from "../contracts";
import { UI } from "../contracts";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, drawCursor } from "./kit/draw";

const KEY = "verdant-reach-volume";
const SPEEDS = ["slow", "mid", "fast"] as const;

export interface Volumes { music: number; sfx: number } // 0..10

export function loadVolumes(): Volumes {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Volumes>;
      const clamp = (n: unknown, d: number) => (typeof n === "number" && n >= 0 && n <= 10 ? Math.round(n) : d);
      return { music: clamp(v.music, 8), sfx: clamp(v.sfx, 8) };
    }
  } catch {
    /* storage unavailable */
  }
  return { music: 8, sfx: 8 };
}

function saveVolumes(v: Volumes) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export function applyVolumes(ctx: GameContext, v: Volumes) {
  try {
    ctx.audio?.setVolume(v.music / 10, v.sfx / 10);
  } catch {
    /* audio not ready */
  }
}

export function optionsScreen(ctx: GameContext): Promise<void> {
  const vol = loadVolumes();
  let row = 0;
  const ROWS = 4;

  const bar = (g: CanvasRenderingContext2D, x: number, y: number, n: number) => {
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i < n ? UI.dark : "#c8d8c0";
      g.fillRect(x + i * 6, y + 1, 4, 6);
    }
  };

  const draw = (g: CanvasRenderingContext2D) => {
    clearScreen(g, UI.white);
    ctx.ui.drawWindow(g, 0, 0, 160, 144);
    const speed = (ctx.state?.options?.textSpeed ?? "mid").toUpperCase();
    ctx.ui.drawText(g, "TEXT SPEED", 16, 16);
    ctx.ui.drawText(g, `:${speed}`, 88, 26);
    ctx.ui.drawText(g, "MUSIC", 16, 44);
    bar(g, 80, 54, vol.music);
    ctx.ui.drawText(g, "SOUND", 16, 72);
    bar(g, 80, 82, vol.sfx);
    ctx.ui.drawText(g, "CANCEL", 16, 104);
    const ys = [16, 44, 72, 104];
    drawCursor(ctx, g, 8, ys[row]);
    ctx.ui.drawText(g, "◀▶: change", 16, 124, UI.dark);
  };

  const main = async (flow: Flow) => {
    ctx.audio.playSfx("menu_open");
    await flow.run({
      update(input: Input) {
        if (input.repeat("up")) { row = (row + ROWS - 1) % ROWS; ctx.audio.playSfx("cursor"); }
        else if (input.repeat("down")) { row = (row + 1) % ROWS; ctx.audio.playSfx("cursor"); }
        const d = input.repeat("left") ? -1 : input.repeat("right") ? 1 : 0;
        if (d !== 0) {
          if (row === 0 && ctx.state) {
            const i = SPEEDS.indexOf(ctx.state.options.textSpeed);
            ctx.state.options.textSpeed = SPEEDS[Math.max(0, Math.min(2, (i < 0 ? 1 : i) + d))];
            ctx.audio.playSfx("cursor");
          } else if (row === 1 || row === 2) {
            const k = row === 1 ? "music" : "sfx";
            vol[k] = Math.max(0, Math.min(10, vol[k] + d));
            applyVolumes(ctx, vol);
            saveVolumes(vol);
            ctx.audio.playSfx("cursor");
          }
        }
        if (input.pressed("b") || (input.pressed("a") && row === 3)) {
          ctx.audio.playSfx("cancel");
          return true;
        }
        return false;
      },
    });
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}
