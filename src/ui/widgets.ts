// Engine-owned screens and windows: overlays under kit menus, the SAVE
// dialog, the trainer card, and the CONTINUE summary window.

import type { GameContext, MarkId, Scene } from "../contracts";
import { MARKS, SCREEN_H, SCREEN_W, UI, characterPath } from "../contracts";
import { drawImagePath, hasImage } from "../engine/gfx";
import { currentSessionId, formatDate, formatPlayTime, type SaveEnvelope, type SaveMeta } from "../save";
import { drawText, drawTextScaled, drawWindow } from "./kit";

/** Push a transparent, input-less layer (e.g. an info window under a menu). Returns `close`. */
export function pushOverlay(ctx: GameContext, draw: (g: CanvasRenderingContext2D) => void): () => void {
  let close: () => void = () => {};
  void ctx.scenes.run<void>((done) => {
    close = () => done();
    return { transparent: true, update() {}, draw };
  });
  return close;
}

export function formatMoney(n: number): string {
  return `$${Math.max(0, Math.floor(n))}`;
}

function rightText(g: CanvasRenderingContext2D, text: string, rightX: number, y: number, color: string = UI.black) {
  drawText(g, text, rightX - Array.from(text).length * 8, y, color);
}

/** Crystal-style save summary: PLAYER / MARKS / HERBARIUM / TIME. */
export function drawSaveInfo(
  g: CanvasRenderingContext2D,
  info: { playerName: string; marks: number; herbarium: number; playTimeMs: number; savedAt?: number },
  x = 0, y = 0, rowH = 16,
) {
  const w = 128;
  const rows: [string, string][] = [
    ["PLAYER", info.playerName],
    ["MARKS", String(info.marks)],
    ["HERBARIUM", String(info.herbarium)],
    ["TIME", formatPlayTime(info.playTimeMs)],
  ];
  if (info.savedAt) rows.push(["SAVED", formatDate(info.savedAt)]);
  const h = (rows.length - 1) * rowH + 8 + 16;
  drawWindow(g, x, y, w, h, { shadow: true });
  rows.forEach(([k, v], i) => {
    if (k === "SAVED") {
      drawText(g, v, x + w - 8 - Array.from(v).length * 8, y + 8 + i * rowH, UI.dark);
      return;
    }
    drawText(g, k, x + 8, y + 8 + i * rowH, UI.dark);
    rightText(g, v, x + w - 8, y + 8 + i * rowH);
  });
}

export function stateSummary(ctx: GameContext) {
  return {
    playerName: ctx.state.playerName,
    marks: ctx.state.marks.length,
    herbarium: ctx.state.herbarium.caught.length,
    playTimeMs: ctx.state.playTimeMs,
  };
}

type SaveApi = GameContext["save"] & { envelope?(): SaveEnvelope | null; meta?(): SaveMeta | null };

/** START → SAVE. Returns true if the game was written. */
export async function saveDialog(ctx: GameContext, prompt = "Would you like to save the game?"): Promise<boolean> {
  const close = pushOverlay(ctx, (g) => drawSaveInfo(g, stateSummary(ctx), 0, 0, 10));
  try {
    if (!(await ctx.ui.yesNo(prompt))) return false;
    const env = (ctx.save as SaveApi).envelope?.();
    if (env && env.gameId !== currentSessionId()) {
      if (!(await ctx.ui.yesNo("There is already a save file. Is it OK to overwrite?"))) return false;
    }
    await ctx.ui.say("SAVING… DON'T TURN OFF THE POWER.", { autoClose: true });
    try {
      ctx.save.write();
    } catch (e) {
      console.error("[save] write failed", e);
      await ctx.ui.say("The save failed! There may be no room left in this browser's storage.");
      return false;
    }
    ctx.audio.playSfx("save");
    await ctx.ui.say("{PLAYER} saved the game.");
    return true;
  } finally {
    close();
  }
}

// ---------------------------------------------------------------------------
// Pressed Mark emblem (art if present, else a drawn pressed-leaf card)
// ---------------------------------------------------------------------------

const MARK_ART: Record<MarkId, "mark_bramble" | "mark_sundew" | "mark_rose" | "mark_pipe" | "mark_cactus" | "mark_mangrove"> = { bramble_mark: "mark_bramble", sundew_mark: "mark_sundew", rose_mark: "mark_rose", pipe_mark: "mark_pipe", cactus_mark: "mark_cactus", mangrove_mark: "mark_mangrove" };

/** One Pressed Mark slot (18x18): the mark's art when owned, else an empty card. */
export function drawMarkSlot(g: CanvasRenderingContext2D, ctx: GameContext, mark: MarkId | null, x: number, y: number) {
  const owned = !!mark && ctx.state.marks.includes(mark);
  g.fillStyle = owned ? "#f0e8c8" : "#e8f0e0";
  g.fillRect(x, y, 18, 18);
  g.fillStyle = owned ? "#887040" : UI.light;
  g.fillRect(x, y, 18, 1); g.fillRect(x, y + 17, 18, 1);
  g.fillRect(x, y, 1, 18); g.fillRect(x + 17, y, 1, 18);
  if (!owned || !mark) return;
  if (!drawImagePath(g, ctx.assets, `assets/ui/${MARK_ART[mark]}.png`, 0, 0, 16, 16, x + 1, y + 1)) {
    // drawn fallback: a pressed sprig
    g.fillStyle = UI.dark;
    g.fillRect(x + 8, y + 4, 2, 11);
    g.fillStyle = mark === "bramble_mark" ? "#6a3a7a" : "#c03838";
    g.fillRect(x + 6, y + 2, 6, 4);
  }
}

// ---------------------------------------------------------------------------
// Trainer card
// ---------------------------------------------------------------------------

const REGION_MARKS = 8;

export function trainerCard(ctx: GameContext): Promise<void> {
  return ctx.scenes.run<void>((done) => {
    let frame = 0;
    const scene: Scene = {
      update() {
        frame++;
        if (frame > 8 && (ctx.input.pressed("a") || ctx.input.pressed("b") || ctx.input.pressed("start"))) {
          ctx.audio.playSfx("cancel");
          done();
        }
      },
      draw(g) {
        g.fillStyle = UI.light;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        g.fillStyle = "#98c088";
        for (let y = 0; y < SCREEN_H; y += 8) g.fillRect(0, y, SCREEN_W, 4);
        drawWindow(g, 4, 4, 152, 136);
        drawText(g, "BOTANIST CARD", 12, 12, UI.dark);
        g.fillStyle = UI.light;
        g.fillRect(8, 22, 144, 1);
        const st = ctx.state;
        const rows: [string, string][] = [
          ["NAME", st.playerName],
          ["MONEY", formatMoney(st.money)],
          ["HERBARIUM", String(st.herbarium.caught.length)],
          ["TIME", formatPlayTime(st.playTimeMs)],
        ];
        rows.forEach(([k, v], i) => {
          drawText(g, k, 12, 30 + i * 14, UI.dark);
          rightText(g, v, 108, 30 + i * 14);
        });
        // portrait: overworld sprite at 2x, gently stepping in place
        g.fillStyle = "#e8f0e0";
        g.fillRect(114, 28, 36, 36);
        g.fillStyle = UI.light;
        g.fillRect(114, 63, 36, 1);
        const col = [0, 1, 0, 2][Math.floor(frame / 30) % 4];
        drawImagePath(g, ctx.assets, characterPath("player"), col * 16, 0, 16, 16, 116, 30, 32, 32);
        drawText(g, "PRESSED MARKS", 12, 92, UI.dark);
        for (let i = 0; i < REGION_MARKS; i++) drawMarkSlot(g, ctx, MARKS[i] ?? null, 12 + i * 17, 106);
      },
    };
    return scene;
  });
}

export { drawTextScaled };
