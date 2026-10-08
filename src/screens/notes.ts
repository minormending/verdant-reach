// NOTES: the quest log, styled as a pocket field notebook. The index is a
// ruled page listing started quests (ticked when done); each note shows who
// asked, where, the steps (ticked as their `doneWhen` holds) and the reward.
// Quests come from WORLD.quests; flags are quest_<id>_started / _done.

import type { Cond, GameContext, Input, QuestDef, WorldData } from "../contracts";
import { SCREEN_W, SCREEN_H, UI } from "../contracts";
import { runFlowScene, type Flow } from "./kit/flow";
import { cursorBob, drawMoreArrow, drawPaper, drawTiny } from "./kit/draw";
import { ListView } from "./kit/widgets";

import { BOOK_ROWS, FOOTER_Y, HALF, RIGHT, textCols } from "./kit/layout";

const INK = "#2c3c30";
const FADED = "#8a8068";
const RULE = "#c8d4dc";
const MARGIN = "#e0a098";
const STAMP = "#c03838";

export type NoteStatus = "active" | "done";
export interface NoteEntry { quest: QuestDef; status: NoteStatus }

const holds = (cond: Cond, flags: Record<string, boolean>) => cond.every((c) => (flags[c.flag] ?? false) === c.is);

/** Started quests, active first then finished, each group in WORLD.quests order. */
export function notesList(world: Pick<WorldData, "quests">, flags: Record<string, boolean>): NoteEntry[] {
  const defs = new Map<string, QuestDef>(Object.entries(world.quests ?? {}));
  // Quests started by a script but not (yet) defined still get a page.
  for (const k of Object.keys(flags)) {
    const m = /^quest_(.+)_(started|done)$/.exec(k);
    if (m && flags[k] && !defs.has(m[1])) {
      defs.set(m[1], { id: m[1], title: m[1].replace(/_/g, " ").toUpperCase(), giver: "", area: "fallowfield" as QuestDef["area"], steps: [], reward: "" });
    }
  }
  const out: NoteEntry[] = [];
  for (const q of defs.values()) {
    const done = !!flags[`quest_${q.id}_done`];
    if (done || flags[`quest_${q.id}_started`]) out.push({ quest: q, status: done ? "done" : "active" });
  }
  return [...out.filter((e) => e.status === "active"), ...out.filter((e) => e.status === "done")];
}

export type NoteRow =
  | { kind: "text"; text: string; label?: string }
  | { kind: "step"; text: string; first: boolean; done: boolean }
  | { kind: "gap" };

/** The detail page as rows of text (each fits the notebook width), ready to draw and scroll. */
export function noteRows(
  world: Pick<WorldData, "maps">, flags: Record<string, boolean>, e: NoteEntry, wrap: (t: string, cols: number) => string[],
): NoteRow[] {
  const q = e.quest;
  const rows: NoteRow[] = [];
  // Margin labels (FROM / WHERE / REWARD) sit beside the first line of each block.
  const block = (label: string, text: string) => {
    if (!text) return;
    wrap(text, textCols(SCREEN_W - 38)).forEach((l, i) => rows.push(i === 0 ? { kind: "text", text: l, label } : { kind: "text", text: l }));
  };
  block("FROM", q.giver);
  const area = world.maps?.[q.area]?.name;
  if (area) block("WHERE", area.toUpperCase());
  if (q.steps.length) {
    if (rows.length) rows.push({ kind: "gap" });
    for (const s of q.steps) {
      const done = e.status === "done" || holds(s.doneWhen, flags);
      wrap(s.text, textCols(SCREEN_W - 38)).forEach((l, i) => rows.push({ kind: "step", text: l, first: i === 0, done }));
    }
  }
  if (q.reward && rows.length) rows.push({ kind: "gap" });
  block("REWARD", q.reward);
  return rows;
}

const ROW_H = 16;
const ROWS = BOOK_ROWS;
let lastIndex = 0;

export function notesScreen(ctx: GameContext): Promise<void> {
  const entries = () => notesList(ctx.world, ctx.state.flags);
  let list: ListView | null = null;
  let frame = 0;

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    const all = entries();
    drawPaper(g, 0, 0, SCREEN_W, FOOTER_Y, "cream");
    header(g, "FIELD NOTES", `${all.filter((e) => e.status === "done").length}/${all.length}`);
    for (let r = 0; r <= ROWS; r++) { g.fillStyle = RULE; g.fillRect(0, 12 + r * ROW_H + 15, SCREEN_W, 1); }
    g.fillStyle = MARGIN;
    g.fillRect(22, 9, 1, FOOTER_Y - 9);
    if (!list) return;
    if (all.length === 0) ctx.ui.drawText(g, "No notes yet.", 30, 30, FADED);
    for (const [i, r] of list.visibleRows()) {
      const e = all[i];
      const y = 14 + r * ROW_H;
      const sel = i === list.index;
      if (sel) {
        g.fillStyle = "#f8e898";
        g.fillRect(23, y - 1, SCREEN_W - 23, 12);
        g.fillStyle = "#f0d870";
        g.fillRect(23, y + 10, SCREEN_W - 23, 1);
      }
      checkbox(g, 8, y + 1, e.status === "done");
      const done = e.status === "done";
      ctx.ui.drawText(g, e.quest.title.slice(0, textCols(HALF - 24)), 28, y, done ? FADED : INK);
      const area = ctx.world.maps?.[e.quest.area]?.name?.toUpperCase() ?? "";
      drawTiny(g, area.slice(0, Math.floor((HALF - 24) / 4)), HALF + 8, y + 2, FADED);
    }
    if (list.count() > 0) {
      const ry = 14 + (list.index - list.scroll) * ROW_H;
      ribbon(g, SCREEN_W - 8, ry + cursorBob(frame));
    }
    if (list.canScrollDown()) drawMoreArrow(ctx, g, SCREEN_W - 16, FOOTER_Y - 9, frame);
    if (list.canScrollUp()) drawMoreArrow(ctx, g, SCREEN_W - 16, 9, frame, "up");
    // the selected note's status and area on a kraft label
    drawPaper(g, 0, FOOTER_Y, SCREEN_W, 32, "kraft");
    g.fillStyle = "#6a4a28";
    g.fillRect(4, FOOTER_Y + 3, SCREEN_W - 8, 1); g.fillRect(4, SCREEN_H - 4, SCREEN_W - 8, 1); g.fillRect(4, FOOTER_Y + 3, 1, 26); g.fillRect(SCREEN_W - 5, FOOTER_Y + 3, 1, 26);
    const cur = all[list.index];
    if (cur) {
      drawTiny(g, cur.status === "done" ? "DONE" : "IN PROGRESS", 10, FOOTER_Y + 7, cur.status === "done" ? STAMP : "#6a4a28");
      const where = ctx.world.maps?.[cur.quest.area]?.name?.toUpperCase() ?? "";
      ctx.ui.drawText(g, where.slice(0, textCols(SCREEN_W - 20)), 10, FOOTER_Y + 15, "#3a2814");
    }
  };

  const main = async (flow: Flow) => {
    ctx.audio.playSfx("menu_open");
    list = new ListView(ctx, () => entries().length, { rows: ROWS, rowH: ROW_H, start: lastIndex });
    for (;;) {
      await flow.run(list);
      lastIndex = list.index;
      if (list.result < 0) return;
      const e = entries()[list.result];
      if (e) await noteDetail(ctx, e);
    }
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}

/** One note: who, where, the steps (ticked as they hold), and the reward. Up/down scrolls. */
function noteDetail(ctx: GameContext, e: NoteEntry): Promise<void> {
  const rows = noteRows(ctx.world, ctx.state.flags, e, (t, c) => ctx.ui.wrap(t, c));
  const LINE = 10;
  const TOP = 16;
  const VISIBLE = Math.floor((SCREEN_H - TOP - 4) / LINE);
  let scroll = 0;
  let frame = 0;
  const maxScroll = Math.max(0, rows.length - VISIBLE);

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    drawPaper(g, 0, 0, SCREEN_W, SCREEN_H, "cream");
    for (let y = TOP + 9; y < SCREEN_H; y += LINE) { g.fillStyle = RULE; g.fillRect(0, y, SCREEN_W, 1); }
    g.fillStyle = MARGIN;
    g.fillRect(27, 12, 1, SCREEN_H - 12);
    header(g, e.quest.title.slice(0, textCols(SCREEN_W - 8)));
    rows.slice(scroll, scroll + VISIBLE).forEach((r, i) => {
      const y = TOP + i * LINE;
      switch (r.kind) {
        case "text":
          if (r.label) drawTiny(g, r.label, 2, y + 2, "#4a6a48");
          ctx.ui.drawText(g, r.text, 30, y, INK);
          break;
        case "step":
          if (r.first) checkbox(g, 12, y, r.done);
          ctx.ui.drawText(g, r.text, 30, y, r.done ? FADED : INK);
          break;
      }
    });
    if (e.status === "done") stamp(g, SCREEN_W - 56, SCREEN_H - 24);
    if (scroll < maxScroll) drawMoreArrow(ctx, g, SCREEN_W - 12, SCREEN_H - 10, frame);
    if (scroll > 0) drawMoreArrow(ctx, g, SCREEN_W - 12, 13, frame, "up");
  };

  const main = async (flow: Flow) => {
    await flow.run({
      update(input: Input) {
        if (input.repeat("down") && scroll < maxScroll) { scroll++; ctx.audio.playSfx("cursor"); }
        else if (input.repeat("up") && scroll > 0) { scroll--; ctx.audio.playSfx("cursor"); }
        if (input.pressed("a") || input.pressed("b")) { ctx.audio.playSfx(input.pressed("a") ? "select" : "cancel"); return true; }
        return false;
      },
    });
  };
  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}

// ---------------------------------------------------------------------------
// Notebook bits
// ---------------------------------------------------------------------------

function header(g: CanvasRenderingContext2D, title: string, right?: string) {
  // green cloth spine with a stitched edge
  g.fillStyle = "#4a6a48";
  g.fillRect(0, 0, SCREEN_W, 11);
  g.fillStyle = "#6a8a60";
  for (let x = 2; x < SCREEN_W; x += 4) g.fillRect(x, 9, 2, 1);
  drawTiny(g, title, 4, 3, "#f0e8c8");
  if (right) drawTiny(g, right, RIGHT + 4 - right.length * 4, 3, "#c8e0a8");
}

/** A hand-drawn 7x7 box, ticked in green when done. */
function checkbox(g: CanvasRenderingContext2D, x: number, y: number, done: boolean) {
  g.fillStyle = INK;
  g.fillRect(x, y, 7, 1); g.fillRect(x, y + 6, 7, 1); g.fillRect(x, y, 1, 7); g.fillRect(x + 6, y, 1, 7);
  g.fillStyle = UI.white;
  g.fillRect(x + 1, y + 1, 5, 5);
  if (!done) return;
  // the tick overshoots the box, as a pencil tick would
  g.fillStyle = "#3a8a38";
  const pts = [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 0], [2, 3], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]];
  for (const [dx, dy] of pts) g.fillRect(x + dx, y + dy, 1, 1);
}

function ribbon(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = "#c03838";
  g.fillRect(x, y - 1, 6, 9);
  g.fillStyle = "#e86060";
  g.fillRect(x, y - 1, 2, 9);
  g.fillStyle = "#c03838";
  g.fillRect(x, y + 8, 2, 2);
  g.fillRect(x + 4, y + 8, 2, 2);
}

/** A red rubber stamp: COMPLETE in a double box, a touch uneven like real ink. */
function stamp(g: CanvasRenderingContext2D, x: number, y: number) {
  const w = 48, h = 15;
  g.fillStyle = STAMP;
  g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1);
  drawTiny(g, "COMPLETE", x + 8, y + 5, STAMP);
  // ink gaps
  g.fillStyle = "#fbf6e6";
  g.fillRect(x + 13, y, 2, 1); g.fillRect(x + w - 1, y + 9, 1, 2); g.fillRect(x + 30, y + h - 1, 3, 1);
}
