// Summary: three pages (INFO / STATS / MOVES). Up/down changes Quickened,
// left/right changes page (with a short slide). On MOVES, A enters the move
// list (details for the move under the cursor); A or SELECT there picks a
// move up, and A / SELECT on another swaps the two (an updated mechanic).

import type { GameContext, Input, Quickened, SpeciesId, TypeId } from "../contracts";
import { SPECIES_IDS, speciesPath, UI } from "../contracts";
import { expProgress, expToLevel } from "../battle/logic/exp";
import { getMove, getSpecies, qName, speciesName, STATUS_ABBR, TYPE_NAMES } from "../battle/logic/lookup";
import { MAX_LEVEL } from "../battle/logic/stats";
import { runFlowScene, type Flow } from "./kit/flow";
import {
  cursorBob, drawCursor, drawExpBar, drawHpBar, drawLeaf, drawLevel, drawPaper, drawSpecies, drawStatusBadge,
  drawTextRight, drawTiny, drawTypeTag, drawWiltBadge, hline, pad, TYPE_COLORS, preload,
} from "./kit/draw";
import { playerName } from "./kit/text";

const PAGE_COLORS = ["#e070a8", "#58a040", "#3888e0"];
const PAGE_DARK = ["#883060", "#285820", "#183888"];
const PAGE_NAMES = ["INFO", "STATS", "MOVES"];

export function herbariumNumber(species: SpeciesId): number {
  return SPECIES_IDS.indexOf(species) + 1;
}

/** Swap two of a Quickened's move slots (PP travels with its move). Returns true if anything moved. */
export function swapMoves(q: Quickened, a: number, b: number): boolean {
  if (a === b || a < 0 || b < 0 || a >= q.moves.length || b >= q.moves.length) return false;
  const tmp = q.moves[a];
  q.moves[a] = q.moves[b];
  q.moves[b] = tmp;
  return true;
}

export function summaryScreen(ctx: GameContext, list: Quickened[], start: number): Promise<number> {
  let idx = Math.max(0, Math.min(start, list.length - 1));
  let page = 0;
  let moveCursor = -1; // >= 0 while in the move list
  let swapFrom = -1;   // >= 0 while a move is picked up
  let frame = 0;
  let slideDir = 0;    // page-change slide: direction and start frame
  let slideAt = 0;

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    const slide = slideDir * Math.max(0, 24 - (frame - slideAt) * 6);
    const q = list[idx];
    drawPaper(g, 0, 0, 160, 144, "white");
    if (!q) return;
    drawHeader(ctx, g, q, page, frame);
    g.save();
    g.translate(slide, 0);
    if (page === 0) drawInfo(ctx, g, q);
    else if (page === 1) drawStats(ctx, g, q);
    else drawMoves(ctx, g, q, moveCursor, swapFrom, frame);
    g.restore();
  };

  const main = async (flow: Flow): Promise<number> => {
    await preload(ctx, list.map((q) => speciesPath(q.species, "front")));
    void ctx.audio.playCry(list[idx].species);
    for (;;) {
      const t = {
        result: "" as "" | "exit",
        update(input: Input) {
          const q = list[idx];
          if (moveCursor >= 0) {
            const n = q.moves.length;
            if (input.repeat("up") && moveCursor > 0) { moveCursor--; ctx.audio.playSfx("cursor"); }
            else if (input.repeat("down") && moveCursor < n - 1) { moveCursor++; ctx.audio.playSfx("cursor"); }
            if (input.pressed("a") || input.pressed("select")) {
              if (swapFrom < 0) {
                swapFrom = moveCursor;
                ctx.audio.playSfx("select");
              } else {
                if (swapMoves(q, swapFrom, moveCursor)) ctx.audio.playSfx("save");
                else ctx.audio.playSfx("cancel");
                swapFrom = -1;
              }
              return false;
            }
            if (input.pressed("b")) {
              ctx.audio.playSfx("cancel");
              if (swapFrom >= 0) swapFrom = -1;
              else moveCursor = -1;
            }
            return false;
          }
          if (input.repeat("left") && page > 0) { page--; slideDir = -1; slideAt = frame; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("right") && page < 2) { page++; slideDir = 1; slideAt = frame; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("up") && list.length > 1) {
            idx = (idx + list.length - 1) % list.length;
            void ctx.audio.playCry(list[idx].species);
          } else if (input.repeat("down") && list.length > 1) {
            idx = (idx + 1) % list.length;
            void ctx.audio.playCry(list[idx].species);
          }
          if ((input.pressed("a") || input.pressed("select")) && page === 2 && q.moves.length > 0) {
            moveCursor = 0;
            swapFrom = -1;
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
  // a coloured band with the page tabs (Crystal's coloured squares)
  g.fillStyle = PAGE_COLORS[page];
  g.fillRect(0, 0, 160, 2);
  for (let i = 0; i < 3; i++) {
    const x = 112 + i * 16;
    const on = i === page;
    g.fillStyle = on ? PAGE_COLORS[i] : "#d8d8d0";
    g.fillRect(x, 2, 14, on ? 7 : 5);
    if (on) { g.fillStyle = PAGE_DARK[i]; g.fillRect(x, 9, 14, 1); }
  }
  drawTiny(g, PAGE_NAMES[page], 112, 11, PAGE_DARK[page]);
  if (page === 2) {
    // compact header on the moves page: icon-sized portrait strip
    ctx.ui.drawText(g, qName(ctx.data, q), 8, 8);
    drawLevel(ctx, g, q.level, 8, 18);
    if (q.status) drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 40, 19, frame);
    hline(g, 0, 30, 160, PAGE_DARK[page]);
    hline(g, 0, 31, 160, PAGE_COLORS[page]);
    return;
  }
  // the specimen: on a little mount with a soft shadow
  g.fillStyle = "#e8e4d4";
  g.fillRect(2, 6, 58, 54);
  g.fillStyle = "#d0c8b0";
  g.fillRect(2, 59, 58, 1);
  g.fillRect(59, 6, 1, 54);
  const bob = q.hp > 0 ? cursorBob(frame + 10) : 0;
  drawSpecies(ctx, g, q.species, "front", 2, 4 - bob, { sport: q.sport });
  drawTiny(g, "NO.", 64, 18);
  ctx.ui.drawText(g, String(herbariumNumber(q.species)).padStart(3, "0"), 76, 16);
  if (ctx.state.herbarium.caught.includes(q.species)) drawLeaf(g, 102, 17);
  ctx.ui.drawText(g, qName(ctx.data, q), 64, 26);
  if (q.nickname) ctx.ui.drawText(g, `/${speciesName(ctx.data, q.species)}`.slice(0, 12), 64, 35, "#506050");
  drawLevel(ctx, g, q.level, 64, 46);
  if (q.hp <= 0) drawWiltBadge(g, 96, 47);
  else if (q.status) drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 96, 47, frame);
  if (q.sport) ctx.ui.drawText(g, "♥", 150, 46, "#c08020");
  hline(g, 0, 62, 160, PAGE_DARK[page]);
  hline(g, 0, 63, 160, PAGE_COLORS[page]);
}

function drawInfo(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened) {
  const sp = getSpecies(ctx.data, q.species);
  ctx.ui.drawText(g, "TYPE/", 8, 68);
  let x = 56;
  for (const t of sp.types as readonly TypeId[]) {
    drawTypeTag(ctx, g, t, TYPE_NAMES[t], x, 68);
    x += ctx.ui.measure(TYPE_NAMES[t]) + 8;
  }
  ctx.ui.drawText(g, `TENDED BY ${playerName(ctx)}`.slice(0, 19), 8, 80);
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
  drawHpBar(g, 8, 69, q.hp, q.stats.hp, 48);
  drawTextRight(ctx, g, `${pad(Math.max(0, q.hp), 3)}/${pad(q.stats.hp, 3)}`, 152, 68);
  const rows: [string, keyof Quickened["stats"]][] = [
    ["ATTACK", "atk"], ["DEFENCE", "def"], ["SPCL.ATK", "spa"], ["SPCL.DEF", "spd"], ["SPEED", "spe"],
  ];
  const best = Math.max(...rows.map(([, k]) => q.stats[k]));
  rows.forEach(([label, k], i) => {
    const y = 80 + i * 10;
    if (i % 2 === 0) { g.fillStyle = "#eef4e6"; g.fillRect(4, y - 1, 152, 10); }
    ctx.ui.drawText(g, label, 8, y);
    // a small bar shows each stat relative to the strongest
    const w = Math.max(1, Math.round((q.stats[k] / Math.max(1, best)) * 32));
    g.fillStyle = "#c8dcb8";
    g.fillRect(84, y + 2, 32, 4);
    g.fillStyle = "#58a040";
    g.fillRect(84, y + 2, w, 4);
    drawTextRight(ctx, g, String(q.stats[k]), 152, y);
  });
  // Bond: friendship as leaves (0..5)
  ctx.ui.drawText(g, "BOND", 8, 132);
  const leaves = Math.round((q.friendship / 255) * 5);
  for (let i = 0; i < 5; i++) drawLeaf(g, 56 + i * 10, 132, i < leaves ? "#48a040" : "#d0d0c8");
}

function drawMoves(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, cursor: number, swapFrom: number, frame: number) {
  q.moves.forEach((m, i) => {
    const mv = getMove(ctx.data, m.id);
    const y = 36 + i * 16;
    if (i === swapFrom) { g.fillStyle = "#d8e8f8"; g.fillRect(0, y - 2, 160, 16); }
    else if (i === cursor) { g.fillStyle = "#f8f0b8"; g.fillRect(0, y - 2, 160, 16); }
    ctx.ui.drawText(g, mv.name.toUpperCase(), 16, y);
    const c = TYPE_COLORS[mv.type];
    const label = TYPE_NAMES[mv.type] ?? "";
    g.fillStyle = c?.mid ?? "#808080";
    g.fillRect(16, y + 8, label.length * 4 + 3, 7);
    drawTiny(g, label, 18, y + 9, UI.white);
    drawTiny(g, "PP", 104, y + 9);
    const low = m.pp <= Math.max(1, Math.floor(mv.pp / 4));
    ctx.ui.drawText(g, `${pad(m.pp, 2)}/${pad(mv.pp, 2)}`, 116, y + 8, m.pp === 0 ? UI.hpRed : low ? "#c07010" : undefined);
  });
  for (let i = q.moves.length; i < 4; i++) ctx.ui.drawText(g, "-", 16, 36 + i * 16);
  if (swapFrom >= 0) drawCursor(ctx, g, 6, 36 + swapFrom * 16, true);
  if (cursor >= 0) {
    drawCursor(ctx, g, 6, 36 + cursor * 16, false, frame);
    const m = q.moves[cursor];
    const mv = getMove(ctx.data, m.id);
    ctx.ui.drawWindow(g, 0, 100, 160, 44);
    const cat = mv.category === "physical" ? "PHYSICAL" : mv.category === "special" ? "SPECIAL" : "STATUS";
    if (swapFrom >= 0) {
      drawTiny(g, "SWAP WITH WHICH MOVE?", 8, 106, UI.dark);
    } else {
      drawTiny(g, `POW ${mv.power > 0 ? mv.power : "--"}`, 8, 106);
      drawTiny(g, `ACC ${mv.accuracy === null ? "--" : mv.accuracy}`, 48, 106);
      drawTiny(g, cat, 92, 106, UI.dark);
    }
    const lines = ctx.ui.wrap(mv.description || "", 18).slice(0, 2);
    lines.forEach((l, i) => ctx.ui.drawText(g, l, 8, 116 + i * 10));
  } else {
    drawTiny(g, "A: DETAILS  SELECT: SWAP", 8, 104, UI.dark);
    const hint = "PICK A MOVE, THEN ITS NEW SLOT";
    drawTiny(g, hint, 8, 112, "#8a9a88");
  }
}
