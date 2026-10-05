// Options: text speed, music/sfx volume, the walking follower and battle
// move animations. Volumes are a per-browser
// setting (GameState has no field for them), kept in localStorage.

import type { GameContext, Input } from "../contracts";
import { UI } from "../contracts";
import { runFlowScene, type Flow } from "./kit/flow";
import { drawCursor, drawPaper, drawTiny } from "./kit/draw";
import { battleAnimsOn, followerOn } from "../save";

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
  const ROWS = 6;
  const DONE = 5;

  let frame = 0;
  const bar = (g: CanvasRenderingContext2D, x: number, y: number, n: number) => {
    // ten little seedlings that grow taller with the volume
    for (let i = 0; i < 10; i++) {
      const on = i < n;
      const h = 2 + Math.floor(i / 2);
      g.fillStyle = on ? "#58a040" : "#d0d8c4";
      g.fillRect(x + i * 6 + 1, y + 8 - h, 1, h);
      g.fillStyle = on ? "#88c860" : "#d0d8c4";
      g.fillRect(x + i * 6, y + 8 - h, 3, 1);
    }
    g.fillStyle = "#8a6a48";
    g.fillRect(x - 1, y + 8, 60, 1);
  };

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    drawPaper(g, 0, 0, 160, 144, "cream");
    g.fillStyle = "#4a6a48";
    g.fillRect(0, 0, 160, 12);
    ctx.ui.drawText(g, "OPTIONS", 8, 2, "#f0e8c8");
    const ys = [17, 45, 59, 73, 87, 104];
    // row highlight
    g.fillStyle = "#f8e898";
    g.fillRect(4, ys[row] - 3, 152, row === 0 ? 26 : 14);
    const speed = ctx.state?.options?.textSpeed ?? "mid";
    ctx.ui.drawText(g, "TEXT SPEED", 16, ys[0]);
    SPEEDS.forEach((sp, i) => {
      const x = 24 + i * 44;
      const on = sp === speed;
      g.fillStyle = on ? "#4a6a48" : "#e4dcc4";
      g.fillRect(x - 3, ys[0] + 10, 40, 10);
      ctx.ui.drawText(g, sp.toUpperCase(), x + (sp === "mid" ? 4 : 0), ys[0] + 11, on ? "#f8f8f0" : "#8a8068");
    });
    ctx.ui.drawText(g, "MUSIC", 16, ys[1]);
    bar(g, 80, ys[1] - 2, vol.music);
    drawTiny(g, String(vol.music).padStart(2, " "), 144, ys[1] + 1, "#6a5a40");
    ctx.ui.drawText(g, "SOUND", 16, ys[2]);
    bar(g, 80, ys[2] - 2, vol.sfx);
    drawTiny(g, String(vol.sfx).padStart(2, " "), 144, ys[2] + 1, "#6a5a40");
    const toggle = (y: number, on: boolean) => {
      for (const [label, x, w, val] of [["ON", 106, 20, true], ["OFF", 128, 26, false]] as const) {
        const sel = on === val;
        g.fillStyle = sel ? "#4a6a48" : "#e4dcc4";
        g.fillRect(x, y - 1, w, 10);
        ctx.ui.drawText(g, label, x + 2, y, sel ? "#f8f8f0" : "#8a8068");
      }
    };
    ctx.ui.drawText(g, "FOLLOWER", 16, ys[3]);
    toggle(ys[3], followerOn(ctx.state?.options));
    ctx.ui.drawText(g, "MOVE ANIMS", 16, ys[4]);
    toggle(ys[4], battleAnimsOn(ctx.state?.options));
    ctx.ui.drawText(g, "DONE", 16, ys[5]);
    drawCursor(ctx, g, 6, ys[row], false, frame);
    ctx.ui.drawWindow(g, 0, 120, 160, 24);
    const help = ["◀▶ text speed", "◀▶ volume", "◀▶ volume", "Lead plant follows", "Move animations", "A: back"][row];
    ctx.ui.drawText(g, help, 8, 128, UI.dark);
  };

  const main = async (flow: Flow) => {
    ctx.audio.playSfx("menu_open");
    await flow.run({
      update(input: Input) {
        if (input.repeat("up")) { row = (row + ROWS - 1) % ROWS; ctx.audio.playSfx("cursor"); }
        else if (input.repeat("down")) { row = (row + 1) % ROWS; ctx.audio.playSfx("cursor"); }
        const d = input.repeat("left") ? -1 : input.repeat("right") ? 1 : 0;
        const flip = (row === 3 || row === 4) && (d !== 0 || input.pressed("a"));
        if (flip && ctx.state) {
          const o = ctx.state.options;
          if (row === 3) o.follower = d > 0 ? false : d < 0 ? true : !followerOn(o);
          else o.battleAnims = d > 0 ? false : d < 0 ? true : !battleAnimsOn(o);
          ctx.audio.playSfx("cursor");
        } else if (d !== 0) {
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
        if (input.pressed("b") || (input.pressed("a") && row === DONE)) {
          ctx.audio.playSfx("cancel");
          return true;
        }
        return false;
      },
    });
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}
