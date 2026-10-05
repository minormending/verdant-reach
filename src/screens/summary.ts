// Summary: three pages (INFO / STATS / MOVES). Up/down changes Quickened,
// left/right changes page, A on MOVES inspects each move.

import type { GameContext, Input, Quickened, SpeciesId, TypeId } from "../contracts";
import { SPECIES_IDS, speciesPath, UI } from "../contracts";
import { expProgress, expToLevel } from "../battle/logic/exp";
import { getMove, getSpecies, qName, speciesName, STATUS_ABBR, TYPE_NAMES } from "../battle/logic/lookup";
import { MAX_LEVEL } from "../battle/logic/stats";
import { runFlowScene, type Flow } from "./kit/flow";
import {
  clearScreen, drawCursor, drawExpBar, drawHpBar, drawLevel, drawSpecies, drawStatusBadge, drawTextRight, drawTiny,
  drawTypeTag, hline, pad, TYPE_COLORS, preload } from "./kit/draw";
import { playerName } from "./kit/text";

const PAGE_COLORS = ["#e070a8", "#58a040", "#3888e0"];
const PAGE_NAMES = ["INFO", "STATS", "MOVES"];

export function herbariumNumber(species: SpeciesId): number {
  return SPECIES_IDS.indexOf(species) + 1;
}

export function summaryScreen(ctx: GameContext, list: Quickened[], start: number): Promise<number> {
  let idx = Math.max(0, Math.min(start, list.length - 1));
  let page = 0;
  let moveCursor = -1; // >= 0 while inspecting moves
  let frame = 0;

  const draw = (g: CanvasRenderingContext2D) => {
    frame++;
    const q = list[idx];
    clearScreen(g, UI.white);
    if (!q) return;
    drawHeader(ctx, g, q, page, frame);
    if (page === 0) drawInfo(ctx, g, q);
    else if (page === 1) drawStats(ctx, g, q);
    else drawMoves(ctx, g, q, moveCursor);
  };

  const main = async (flow: Flow): Promise<number> => {
    await preload(ctx, list.map((q) => speciesPath(q.species, "front")));
    void ctx.audio.playCry(list[idx].species);
    for (;;) {
      const t = {
        result: "" as "" | "exit" | "inspect",
        update(input: Input) {
          if (moveCursor >= 0) {
            const n = list[idx].moves.length;
            if (input.repeat("up") && moveCursor > 0) { moveCursor--; ctx.audio.playSfx("cursor"); }
            else if (input.repeat("down") && moveCursor < n - 1) { moveCursor++; ctx.audio.playSfx("cursor"); }
            if (input.pressed("b") || input.pressed("a")) { moveCursor = -1; ctx.audio.playSfx("cancel"); }
            return false;
          }
          if (input.repeat("left") && page > 0) { page--; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("right") && page < 2) { page++; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("up") && list.length > 1) {
            idx = (idx + list.length - 1) % list.length;
            void ctx.audio.playCry(list[idx].species);
          } else if (input.repeat("down") && list.length > 1) {
            idx = (idx + 1) % list.length;
            void ctx.audio.playCry(list[idx].species);
          }
          if (input.pressed("a") && page === 2 && list[idx].moves.length > 0) {
            moveCursor = 0;
            ctx.audio.playSfx("select");
            return false;
          }
          if (input.pressed("b") || (input.pressed("a") && page !== 2)) {
            ctx.audio.playSfx("cancel");
            t.result = "exit";
            return true;
          }
          return false;
        },
      };
      await flow.run(t);
      if (t.result === "exit") return idx;
    }
  };

  return runFlowScene<number>(ctx, { draw, main, fallback: idx });
}

function drawHeader(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, page: number, frame: number) {
  // Page tabs (top right), Crystal's coloured squares.
  for (let i = 0; i < 3; i++) {
    const x = 112 + i * 16;
    g.fillStyle = i === page ? PAGE_COLORS[i] : "#d8d8d8";
    g.fillRect(x, 1, 14, 6);
  }
  drawTiny(g, PAGE_NAMES[page], 112, 9, PAGE_COLORS[page]);
  if (page === 2) {
    // Compact header on the moves page
    ctx.ui.drawText(g, qName(ctx.data, q), 8, 16);
    drawLevel(ctx, g, q.level, 8, 24);
    hline(g, 0, 34, 160);
    return;
  }
  void frame;
  drawSpecies(ctx, g, q.species, "front", 0, 4, { sport: q.sport });
  drawTiny(g, "NO.", 64, 18);
  ctx.ui.drawText(g, String(herbariumNumber(q.species)).padStart(3, "0"), 76, 16);
  ctx.ui.drawText(g, qName(ctx.data, q), 64, 26);
  if (q.nickname) ctx.ui.drawText(g, `/${speciesName(ctx.data, q.species)}`, 64, 34);
  drawLevel(ctx, g, q.level, 64, 44);
  if (q.hp <= 0) {
    g.fillStyle = "#808080";
    g.fillRect(96, 45, 15, 7);
    drawTiny(g, "WLT", 98, 46, UI.white);
  } else if (q.status) {
    drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 96, 45);
  }
  if (q.sport) ctx.ui.drawText(g, "♥SPORT", 112, 44, "#c08020");
  hline(g, 0, 62, 160);
}

function drawInfo(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened) {
  const sp = getSpecies(ctx.data, q.species);
  ctx.ui.drawText(g, "TYPE/", 8, 68);
  let x = 56;
  for (const t of sp.types as readonly TypeId[]) {
    drawTypeTag(ctx, g, t, TYPE_NAMES[t], x, 68);
    x += ctx.ui.measure(TYPE_NAMES[t]) + 8;
  }
  ctx.ui.drawText(g, `TENDED BY ${playerName(ctx)}`, 8, 80);
  const met = q.metAt ? ctx.world.maps?.[q.metAt.map]?.name : undefined;
  if (met) ctx.ui.drawText(g, `MET ${met.toUpperCase()}`.slice(0, 19), 8, 90);
  ctx.ui.drawText(g, "EXP POINTS", 8, 104);
  drawTextRight(ctx, g, String(q.exp), 152, 112);
  if (q.level < MAX_LEVEL) {
    const need = expToLevel(ctx.data, q, q.level + 1) - q.exp;
    ctx.ui.drawText(g, `${need} to`, 8, 122);
    drawLevel(ctx, g, q.level + 1, 8 + ctx.ui.measure(`${need} to `), 122);
  }
  drawExpBar(g, 88, 132, expProgress(ctx.data, q), 64);
}

function drawStats(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened) {
  drawHpBar(g, 8, 68, q.hp, q.stats.hp, 48);
  drawTextRight(ctx, g, `${pad(Math.max(0, q.hp), 3)}/${pad(q.stats.hp, 3)}`, 152, 67);
  const rows: [string, keyof Quickened["stats"]][] = [
    ["ATTACK", "atk"], ["DEFENCE", "def"], ["SPCL.ATK", "spa"], ["SPCL.DEF", "spd"], ["SPEED", "spe"],
  ];
  rows.forEach(([label, k], i) => {
    const y = 80 + i * 10;
    ctx.ui.drawText(g, label, 8, y);
    drawTextRight(ctx, g, String(q.stats[k]), 152, y);
  });
  // Bond: friendship as leaves (0..5)
  ctx.ui.drawText(g, "BOND", 8, 132);
  const leaves = Math.round((q.friendship / 255) * 5);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < leaves ? "#58a040" : "#d0d0d0";
    g.fillRect(56 + i * 10, 133, 6, 6);
    g.fillRect(57 + i * 10, 132, 4, 8);
  }
}

function drawMoves(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, cursor: number) {
  q.moves.forEach((m, i) => {
    const mv = getMove(ctx.data, m.id);
    const y = 40 + i * 16;
    ctx.ui.drawText(g, mv.name.toUpperCase(), 16, y);
    const c = TYPE_COLORS[mv.type];
    g.fillStyle = c?.mid ?? "#808080";
    g.fillRect(16, y + 9, 3, 5);
    drawTiny(g, TYPE_NAMES[mv.type] ?? "", 22, y + 9, c?.dark ?? UI.black);
    drawTiny(g, "PP", 104, y + 9);
    ctx.ui.drawText(g, `${pad(m.pp, 2)}/${pad(mv.pp, 2)}`, 116, y + 8);
  });
  for (let i = q.moves.length; i < 4; i++) ctx.ui.drawText(g, "-", 16, 40 + i * 16);
  if (cursor >= 0) {
    drawCursor(ctx, g, 8, 40 + cursor * 16);
    const m = q.moves[cursor];
    const mv = getMove(ctx.data, m.id);
    ctx.ui.drawWindow(g, 0, 104, 160, 40);
    const cat = mv.category === "physical" ? "PHYSICAL" : mv.category === "special" ? "SPECIAL" : "STATUS";
    drawTiny(g, `POW ${mv.power > 0 ? mv.power : "--"}`, 8, 110);
    drawTiny(g, `ACC ${mv.accuracy === null ? "--" : mv.accuracy}`, 48, 110);
    drawTiny(g, cat, 92, 110, UI.dark);
    const lines = ctx.ui.wrap(mv.description || "", 18).slice(0, 2);
    lines.forEach((l, i) => ctx.ui.drawText(g, l, 8, 118 + i * 9));
  } else {
    drawTiny(g, "A: DETAILS", 112, 136, UI.dark);
  }
}
