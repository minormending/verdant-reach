// Field Herbarium (the Pokédex), styled as a botanist's pressed-specimen book:
// the index is a ruled page with leaf markers for caught entries; each entry
// is a mounted specimen sheet (pinned and taped, with a Latin-name label),
// and the entry text pages in the text box.

import type { GameContext, Input, SpeciesId } from "../contracts";
import { SPECIES_IDS, speciesPath, SCREEN_W, SCREEN_H, TEXTBOX, UI } from "../contracts";
import { getSpecies, speciesName, TYPE_NAMES } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import {
  cursorBob, drawIcon, drawLeaf, drawMoreArrow, drawPaper, drawSpecies, drawTiny, opaqueBounds, preload, silhouette,
  speciesImage, TYPE_COLORS,
} from "./kit/draw";
import { ListView, LINE_Y, TEXT_X } from "./kit/widgets";
import { herbariumNumber } from "./summary";
import { habitatLines, habitatOf } from "./habitat";
import { frontPaths, isAnimated, SpritePlayback } from "./kit/idle";
import { BOOK_ROWS, CONTENT_H, FOOTER_Y, RIGHT, textCols } from "./kit/layout";

const ROWS = BOOK_ROWS;
const ROW_H = 16;

const INK = "#2c3c30";
const RULE = "#c8d4dc";
const MARGIN = "#e0a098";
let lastIndex = 0;

const num3 = (n: number) => String(n).padStart(3, "0");

export function herbariumScreen(ctx: GameContext): Promise<void> {
  const ids = SPECIES_IDS as readonly SpeciesId[];
  let list: ListView | null = null;
  let frame = 0;
  const seen = () => new Set(ctx.state.herbarium.seen);
  const caught = () => new Set(ctx.state.herbarium.caught);

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    const S = seen();
    const C = caught();
    // the page
    drawPaper(g, 0, 0, SCREEN_W, FOOTER_Y, "cream");
    g.fillStyle = "#d8c8a0";
    g.fillRect(0, FOOTER_Y - 1, SCREEN_W, 1);
    // header strip
    g.fillStyle = "#4a6a48";
    g.fillRect(0, 0, SCREEN_W, 9);
    drawTiny(g, "FIELD HERBARIUM", 4, 2, "#f0e8c8");
    drawTiny(g, "INDEX", RIGHT - 16, 2, "#c8e0a8");
    if (!list) return;
    // ruled lines and the red margin rule
    for (let r = 0; r <= ROWS; r++) {
      g.fillStyle = RULE;
      g.fillRect(0, 12 + r * ROW_H + 15, SCREEN_W, 1);
    }
    g.fillStyle = MARGIN;
    g.fillRect(34, 9, 1, FOOTER_Y - 9);
    for (const [i, r] of list.visibleRows()) {
      const y = 14 + r * ROW_H;
      const id = ids[i];
      const sel = i === list.index;
      if (sel) {
        // a highlighter stroke across the selected line
        g.fillStyle = "#f8e898";
        g.fillRect(35, y - 1, SCREEN_W - 35, 12);
        g.fillStyle = "#f0d870";
        g.fillRect(35, y + 10, SCREEN_W - 35, 1);
      }
      drawTiny(g, num3(i + 1), 2, y + 2, sel ? INK : "#8a8068");
      if (S.has(id)) {
        drawIcon(ctx, g, id, 17, y - 5, sel ? Math.floor(frame / 8) % 2 : Math.floor((frame + i * 7) / 24) % 2);
        ctx.ui.drawText(g, speciesName(ctx.data, id).slice(0, 12), 46, y, INK);
        if (C.has(id)) drawLeaf(g, 37, y);
        const scientific = ctx.data.herbarium[id]?.scientificName ?? "";
        drawTiny(g, scientific.slice(0, Math.floor((SCREEN_W / 2 - 24) / 4)), SCREEN_W / 2 + 8, y + 2, "#6a5a40");
      } else {
        ctx.ui.drawText(g, "-----", 46, y, "#a89c80");
      }
    }
    // ribbon bookmark beside the selected line, bobbing
    const ry = 14 + (list.index - list.scroll) * ROW_H;
    const bob = cursorBob(frame);
    g.fillStyle = "#c03838";
    g.fillRect(SCREEN_W - 8, ry - 1 + bob, 6, 9);
    g.fillStyle = "#e86060";
    g.fillRect(SCREEN_W - 8, ry - 1 + bob, 2, 9);
    g.fillStyle = "#c03838";
    g.fillRect(SCREEN_W - 8, ry + 8 + bob, 2, 2);
    g.fillRect(SCREEN_W - 4, ry + 8 + bob, 2, 2);
    if (list.canScrollDown()) drawMoreArrow(ctx, g, SCREEN_W - 16, FOOTER_Y - 9, frame);
    if (list.canScrollUp()) drawMoreArrow(ctx, g, SCREEN_W - 16, 9, frame, "up");
    // the count label, like a specimen label
    drawPaper(g, 0, FOOTER_Y, SCREEN_W, 32, "kraft");
    g.fillStyle = "#6a4a28";
    g.fillRect(4, FOOTER_Y + 3, SCREEN_W - 8, 1); g.fillRect(4, SCREEN_H - 4, SCREEN_W - 8, 1); g.fillRect(4, FOOTER_Y + 3, 1, 26); g.fillRect(SCREEN_W - 5, FOOTER_Y + 3, 1, 26);
    ctx.ui.drawText(g, `SEEN ${String(S.size).padStart(2, " ")}`, 10, FOOTER_Y + 12, "#3a2814");
    drawLeaf(g, SCREEN_W / 2 - 10, FOOTER_Y + 12);
    ctx.ui.drawText(g, `CAUGHT ${String(C.size).padStart(2, " ")}`, SCREEN_W / 2, FOOTER_Y + 12, "#3a2814");
  };

  const main = async (flow: Flow) => {
    await preload(ctx, ctx.state.herbarium.seen.map((id) => speciesPath(id, "icon")));
    list = new ListView(ctx, () => ids.length, { rows: ROWS, rowH: ROW_H, start: lastIndex, paging: true });
    for (;;) {
      await flow.run(list);
      lastIndex = list.index;
      if (list.result < 0) return;
      const id = ids[list.result];
      if (!seen().has(id)) {
        ctx.audio.playSfx("bump");
        continue;
      }
      await showHerbariumEntry(ctx, id);
    }
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}

/** The entry page for one species (also shown after a first capture). */
export function showHerbariumEntry(ctx: GameContext, id: SpeciesId): Promise<void> {
  const entry = ctx.data.herbarium[id];
  const isCaught = ctx.state.herbarium.caught.includes(id);
  const isSeen = isCaught || ctx.state.herbarium.seen.includes(id);
  // Two sections paged in the text box: the entry text and FOUND IN (◀▶ jumps between them).
  const entryLines = isCaught && entry ? ctx.ui.wrap(entry.entry, TEXTBOX.cols) : ["Catch one to", "press a leaf."];
  const habitat = habitatLines(habitatOf(ctx.world, ctx.data, id, isSeen), (s) => speciesName(ctx.data, s), TEXTBOX.cols);
  const sections: { label: string; lines: string[] }[] = [
    { label: "ENTRY", lines: entryLines },
    { label: "FOUND IN", lines: habitat },
  ];
  if (!isCaught) sections.reverse(); // not pressed yet: where to look matters most
  const pages: { section: number; lines: string[] }[] = [];
  sections.forEach((sec, si) => {
    for (let i = 0; i < sec.lines.length; i += TEXTBOX.lines) pages.push({ section: si, lines: sec.lines.slice(i, i + TEXTBOX.lines) });
  });
  let page = 0;
  let frame = 0;
  const sp = getSpecies(ctx.data, id);
  const animated = isCaught && isAnimated(id);
  // The pressed specimen plays its intro once when the page opens (Crystal-style art), then idles.
  const playback = new SpritePlayback(":herbarium");
  playback.hold(id);

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    drawPaper(g, 0, 0, SCREEN_W, CONTENT_H, "cream");
    // the mounted specimen: soft shadow, the pressed sprite, tape and a pin
    const sx = 24, sy = Math.floor((CONTENT_H - 56) / 2) - 8;
    const img = speciesImage(ctx, id, "front");
    const shadow = silhouette(`${id}:front:`, img, "#d8c8a0");
    g.drawImage(shadow, 0, 0, shadow.width, shadow.height, sx + 2, sy + 2, 56, 56);
    const pose = animated ? playback.kind(id, frame) : "front";
    drawSpecies(ctx, g, id, pose, sx, sy, isCaught ? {} : { silhouette: "#6a6450" });
    const b = opaqueBounds(img);
    const k = 56 / Math.max(1, img.width);
    // tape across the stem / base, and a pin through the top of the plant
    tape(g, sx + Math.round(b.baseX * k) - 6, sy + Math.round(b.y1 * k) - 3);
    const pinX = sx + Math.round(((b.x0 + b.x1) / 2) * k), pinY = sy + Math.round(b.y0 * k) + 2;
    g.fillStyle = "#808890";
    g.fillRect(pinX, pinY, 1, 4);
    g.fillStyle = "#b02828";
    g.fillRect(pinX - 1, pinY - 2, 3, 3);
    g.fillStyle = "#f08080";
    g.fillRect(pinX - 1, pinY - 2, 1, 1);

    // the label card on the right
    const lx = 104, ly = 8, lw = SCREEN_W - 112, lh = 64;
    g.fillStyle = "#c8b890";
    g.fillRect(lx + 2, ly + 2, lw, lh);
    g.fillStyle = "#fbf8ee";
    g.fillRect(lx, ly, lw, lh);
    g.fillStyle = INK;
    g.fillRect(lx, ly, lw, 1); g.fillRect(lx, ly + lh - 1, lw, 1); g.fillRect(lx, ly, 1, lh); g.fillRect(lx + lw - 1, ly, 1, lh);
    g.fillRect(lx + 2, ly + 11, lw - 4, 1);
    drawTiny(g, "NO.", lx + 4, ly + 4, INK);
    drawTiny(g, num3(herbariumNumber(id)), lx + 16, ly + 4, INK);
    if (isCaught) drawLeaf(g, lx + lw - 10, ly + 3);
    const name = speciesName(ctx.data, id);
    const nameLines = ctx.ui.measure(name) <= lw - 8 ? [name] : ctx.ui.wrap(name, textCols(lw - 8)).slice(0, 2);
    nameLines.forEach((l, i) => ctx.ui.drawText(g, l, lx + 4, ly + 14 + i * 9, INK));
    const catName = entry ? entry.category.toUpperCase() : "";
    const cat = isCaught && entry ? (catName.length <= 11 ? `${catName} QUICKENED` : catName) : "?????";
    drawTiny(g, cat.slice(0, Math.floor((lw - 8) / 4)), lx + 4, ly + (nameLines.length > 1 ? 32 : 25), "#6a5a40");
    // type chips
    let tx = lx + 4;
    for (const t of sp.types) {
      const c = TYPE_COLORS[t];
      const label = TYPE_NAMES[t] ?? String(t).toUpperCase();
      const w = label.length * 4 + 3;
      g.fillStyle = c.mid;
      g.fillRect(tx, ly + 38, w, 7);
      drawTiny(g, label, tx + 2, ly + 39, UI.white);
      tx += w + 2;
    }
    drawTiny(g, "HT", lx + 4, ly + 48, "#6a5a40");
    drawTiny(g, isCaught && entry ? `${entry.heightM.toFixed(1)}M` : "???", lx + 14, ly + 48, INK);
    drawTiny(g, "WT", lx + 44, ly + 48, "#6a5a40");
    drawTiny(g, isCaught && entry ? `${fmtWeight(entry.weightKg)}KG` : "???", lx + 54, ly + 48, INK);

    // the herbarium label with the Latin name, across the bottom of the sheet
    const bx = 104, by = CONTENT_H - 40, bw = SCREEN_W - 112, bh = 24;
    g.fillStyle = "#c8b890";
    g.fillRect(bx + 2, by + 2, bw, bh);
    g.fillStyle = "#fbf8ee";
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = "#4a6a48";
    g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + bh - 1, bw, 1); g.fillRect(bx, by, 1, bh); g.fillRect(bx + bw - 1, by, 1, bh);
    g.fillRect(bx + 2, by + 2, bw - 4, 1);
    const sci = entry?.scientificName ?? "";
    const lines = ctx.ui.wrap(sci, textCols(bw - 8)).slice(0, 2);
    if (lines.length === 1) ctx.ui.drawText(g, lines[0], bx + Math.max(4, Math.floor((bw - ctx.ui.measure(lines[0])) / 2)), by + 8, "#2c4c30");
    else lines.forEach((l, i) => ctx.ui.drawText(g, l, bx + 4, by + 4 + i * 9, "#2c4c30"));

    ctx.ui.drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    const cur = pages[page];
    cur?.lines.forEach((l, i) => ctx.ui.drawText(g, l, TEXT_X, LINE_Y[i]));
    if (page < pages.length - 1) drawMoreArrow(ctx, g, TEXTBOX.x + TEXTBOX.w - 16, LINE_Y[TEXTBOX.lines - 1], frame);
    drawSectionTabs(g, sections.map((s) => s.label), cur?.section ?? 0);
  };

  const main = async (flow: Flow) => {
    await preload(ctx, isCaught ? frontPaths(id) : [speciesPath(id, "front")]);
    void ctx.audio.playCry(id);
    if (animated) playback.appear(id, frame);
    await flow.run({
      update(input: Input) {
        if (input.pressed("b")) { ctx.audio.playSfx("cancel"); return true; }
        const d = input.pressed("right") ? 1 : input.pressed("left") ? -1 : 0;
        if (d !== 0) {
          const target = (pages[page]?.section ?? 0) + d;
          const first = pages.findIndex((p) => p.section === target);
          if (first >= 0) { page = first; ctx.audio.playSfx("cursor"); }
          return false;
        }
        if (input.pressed("a")) {
          if (page < pages.length - 1) { page++; ctx.audio.playSfx("select"); return false; }
          ctx.audio.playSfx("select");
          return true;
        }
        return false;
      },
    });
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}

/**
 * Section legends set into the text box's top border (like a fieldset
 * legend): the current one in ink, the other faded; ◀▶ switches.
 */
function drawSectionTabs(g: CanvasRenderingContext2D, labels: string[], current: number) {
  let x = TEXTBOX.x + TEXTBOX.w - 10;
  const y = TEXTBOX.y;
  for (let i = labels.length - 1; i >= 0; i--) {
    const w = labels[i].length * 4 - 1;
    x -= w;
    g.fillStyle = UI.white;
    g.fillRect(x - 2, y - 1, w + 4, 7);
    drawTiny(g, labels[i], x, y, i === current ? INK : "#b0a890");
    if (i === current) { g.fillStyle = "#c03838"; g.fillRect(x, y + 6, w, 1); }
    x -= 8;
  }
}

/** A strip of paper tape (2-colour checker so the sheet shows through). */
function tape(g: CanvasRenderingContext2D, x: number, y: number) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) {
      const xx = x + c, yy = y + r + (c < 2 || c > 9 ? (c % 2) : 0);
      g.fillStyle = (c + r) % 2 ? "#f0e4b0" : "#e4d498";
      g.fillRect(xx, yy, 1, 1);
    }
  }
}

function fmtWeight(kg: number): string {
  return kg >= 100 ? String(Math.round(kg)) : kg.toFixed(1);
}
