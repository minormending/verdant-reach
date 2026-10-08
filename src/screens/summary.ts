// Summary: three pages (INFO / STATS / MOVES). Up/down changes Quickened,
// left/right changes page (with a short slide). On MOVES, A enters the move
// list (details for the move under the cursor); A or SELECT there picks a
// move up, and A / SELECT on another swaps the two (an updated mechanic).

import type { GameContext, Input, Quickened, SpeciesId, TypeId } from "../contracts";
import { SPECIES_IDS, speciesPath, SCREEN_W, SCREEN_H, UI } from "../contracts";
import { expProgress, expToLevel } from "../battle/logic/exp";
import { getMove, getSpecies, qName, speciesName, STATUS_ABBR, TYPE_NAMES } from "../battle/logic/lookup";
import { MAX_LEVEL } from "../battle/logic/stats";
import { runFlowScene, type Flow } from "./kit/flow";
import {
  cursorBob, drawCursor, drawExpBar, drawHpBar, drawLeaf, drawLevel, drawPaper, drawSpecies, drawStatusBadge,
  drawTextRight, drawTiny, drawTypeTag, drawWiltBadge, pad, TYPE_COLORS, preload,
} from "./kit/draw";
import { playerName } from "./kit/text";
import { idleFrameCount, idleKind } from "./kit/idle";
import { drawSeedBig } from "../ui/seedArt";
import { seedHint } from "../overworld/nursery";

import { RIGHT, textCols } from "./kit/layout";

const DETAIL_X = 112;
const DETAIL_W = SCREEN_W - DETAIL_X - 8;
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
    drawPaper(g, 0, 0, SCREEN_W, SCREEN_H, "white");
    if (!q) return;
    if (q.seed) {
      drawSeedPage(ctx, g, q, frame);
      return;
    }
    drawHeader(ctx, g, q, page, frame);
    g.save();
    g.beginPath();
    g.rect(DETAIL_X, 24, SCREEN_W - DETAIL_X, SCREEN_H - 24);
    g.clip();
    g.translate(slide, 0);
    if (page === 0) drawInfo(ctx, g, q);
    else if (page === 1) drawStats(ctx, g, q);
    else drawMoves(ctx, g, q, moveCursor, swapFrom, frame);
    g.restore();
  };

  const main = async (flow: Flow): Promise<number> => {
    await preload(ctx, list.map((q) => speciesPath(q.species, "front")));
    const cry = () => { if (!list[idx].seed) void ctx.audio.playCry(list[idx].species); };
    cry();
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
          if (q.seed) {
            // A seed has a single page.
          } else if (input.repeat("left") && page > 0) { page--; slideDir = -1; slideAt = frame; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("right") && page < 2) { page++; slideDir = 1; slideAt = frame; ctx.audio.playSfx("cursor"); }
          else if (input.repeat("up") && list.length > 1) {
            idx = (idx + list.length - 1) % list.length;
            if (list[idx].seed) page = 0;
            cry();
          } else if (input.repeat("down") && list.length > 1) {
            idx = (idx + 1) % list.length;
            if (list[idx].seed) page = 0;
            cry();
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
  g.fillStyle = PAGE_COLORS[page];
  g.fillRect(0, 0, SCREEN_W, 2);
  PAGE_NAMES.forEach((label, i) => {
    const x = DETAIL_X + i * Math.floor(DETAIL_W / 3);
    g.fillStyle = i === page ? PAGE_COLORS[i] : "#d8d8d0";
    g.fillRect(x, 4, Math.floor(DETAIL_W / 3) - 4, 16);
    drawTiny(g, label, x + 8, 9, i === page ? PAGE_DARK[i] : UI.dark);
  });
  drawTiny(g, `NO. ${String(herbariumNumber(q.species)).padStart(3, "0")}`, 8, 10);
  g.fillStyle = "#e8e4d4";
  g.fillRect(24, 32, 58, 58);
  const lively = q.hp > 0 && q.status !== "dormant" && q.status !== "frostbite";
  const animated = idleFrameCount(q.species) > 1;
  const bob = lively && !animated ? cursorBob(frame + 10) : 0;
  const pose = lively && animated ? idleKind(q.species, frame, `:summary:${q.uid}`) : "front";
  drawSpecies(ctx, g, q.species, pose, 24, 32 - bob, { sport: q.sport });
  ctx.ui.wrap(qName(ctx.data, q), 12).forEach((l, i) => ctx.ui.drawText(g, l, 8, 100 + i * 10));
  drawLevel(ctx, g, q.level, 8, 124);
  if (q.hp <= 0) drawWiltBadge(g, 48, 125);
  else if (q.status) drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 48, 125, frame);
  if (q.sport) ctx.ui.drawText(g, "♥", 88, 124, "#c08020");
  if (ctx.state.herbarium.caught.includes(q.species)) drawLeaf(g, 88, 142);
  if (q.nickname) ctx.ui.wrap(speciesName(ctx.data, q.species), 12).forEach((l, i) => drawTiny(g, l, 8, 142 + i * 8, UI.dark));
  g.fillStyle = PAGE_DARK[page];
  g.fillRect(DETAIL_X - 8, 24, 1, SCREEN_H - 32);
}

function drawSeedPage(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, frame: number) {
  const steps = q.seed?.steps ?? 0;
  const wob = steps <= 150 && frame % 90 < 12 ? [0, 1, 0, -1][Math.floor(frame / 3) % 4] : 0;
  drawSeedBig(g, ctx.assets, 24 + wob, 48, 0);
  ctx.ui.drawText(g, "SEED", DETAIL_X, 32);
  drawTiny(g, "FROM THE NURSERY GARDEN", DETAIL_X, 48, UI.dark);
  ctx.ui.wrap(seedHint(steps), textCols(DETAIL_W)).forEach((l, i) => ctx.ui.drawText(g, l, DETAIL_X, 72 + i * 16));
  drawTiny(g, "KEEP WALKING TO WARM IT.", DETAIL_X, SCREEN_H - 24, "#8a9a88");
}

function drawInfo(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened) {
  const sp = getSpecies(ctx.data, q.species);
  ctx.ui.drawText(g, "TYPE/", DETAIL_X, 32);
  let x = DETAIL_X + 48;
  for (const t of sp.types as readonly TypeId[]) {
    drawTypeTag(ctx, g, t, TYPE_NAMES[t], x, 32);
    x += ctx.ui.measure(TYPE_NAMES[t]) + 8;
  }
  const lines = [`TENDED BY ${playerName(ctx)}`];
  const met = q.metAt ? ctx.world.maps?.[q.metAt.map]?.name : undefined;
  if (met) lines.push(`MET ${met.toUpperCase()}`);
  let y = 56;
  for (const text of lines) for (const l of ctx.ui.wrap(text, textCols(DETAIL_W))) {
    ctx.ui.drawText(g, l, DETAIL_X, y); y += 12;
  }
  ctx.ui.drawText(g, "EXP POINTS", DETAIL_X, 108);
  drawTextRight(ctx, g, String(q.exp), RIGHT, 120);
  if (q.level < MAX_LEVEL) {
    const need = expToLevel(ctx.data, q, q.level + 1) - q.exp;
    ctx.ui.drawText(g, `${need} to`, DETAIL_X, 140);
    drawLevel(ctx, g, q.level + 1, DETAIL_X + ctx.ui.measure(`${need} to `), 140);
  }
  drawExpBar(g, DETAIL_X, SCREEN_H - 20, expProgress(ctx.data, q), DETAIL_W);
}

function drawStats(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened) {
  drawHpBar(g, DETAIL_X, 33, q.hp, q.stats.hp, 64);
  drawTextRight(ctx, g, `${pad(Math.max(0, q.hp), 3)}/${pad(q.stats.hp, 3)}`, RIGHT, 32);
  const rows: [string, keyof Quickened["stats"]][] = [
    ["ATTACK", "atk"], ["DEFENCE", "def"], ["SPCL.ATK", "spa"], ["SPCL.DEF", "spd"], ["SPEED", "spe"],
  ];
  const best = Math.max(...rows.map(([, k]) => q.stats[k]));
  rows.forEach(([label, k], i) => {
    const y = 56 + i * 18;
    if (i % 2 === 0) { g.fillStyle = "#eef4e6"; g.fillRect(DETAIL_X - 4, y - 2, DETAIL_W + 4, 16); }
    ctx.ui.drawText(g, label, DETAIL_X, y);
    const barX = DETAIL_X + 80, barW = DETAIL_W - 120;
    g.fillStyle = "#c8dcb8"; g.fillRect(barX, y + 2, barW, 4);
    g.fillStyle = "#58a040"; g.fillRect(barX, y + 2, Math.max(1, Math.round(q.stats[k] / Math.max(1, best) * barW)), 4);
    drawTextRight(ctx, g, String(q.stats[k]), RIGHT, y);
  });
  ctx.ui.drawText(g, "BOND", DETAIL_X, SCREEN_H - 20);
  const leaves = Math.round(q.friendship / 255 * 5);
  for (let i = 0; i < 5; i++) drawLeaf(g, DETAIL_X + 48 + i * 16, SCREEN_H - 20, i < leaves ? "#48a040" : "#d0d0c8");
}

function drawMoves(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, cursor: number, swapFrom: number, frame: number) {
  q.moves.forEach((m, i) => {
    const mv = getMove(ctx.data, m.id), y = 28 + i * 22;
    if (i === swapFrom || i === cursor) { g.fillStyle = i === swapFrom ? "#d8e8f8" : "#f8f0b8"; g.fillRect(DETAIL_X, y - 2, DETAIL_W, 22); }
    ctx.ui.drawText(g, mv.name.toUpperCase(), DETAIL_X + 12, y);
    const label = TYPE_NAMES[mv.type] ?? "";
    g.fillStyle = TYPE_COLORS[mv.type]?.mid ?? UI.dark;
    g.fillRect(DETAIL_X + 12, y + 9, label.length * 4 + 4, 7);
    drawTiny(g, label, DETAIL_X + 14, y + 10, UI.white);
    drawTextRight(ctx, g, `PP ${pad(m.pp, 2)}/${pad(mv.pp, 2)}`, RIGHT, y + 9, m.pp === 0 ? UI.hpRed : undefined);
  });
  for (let i = q.moves.length; i < 4; i++) ctx.ui.drawText(g, "-", DETAIL_X + 12, 28 + i * 22);
  if (swapFrom >= 0) drawCursor(ctx, g, DETAIL_X + 2, 28 + swapFrom * 22, true);
  if (cursor >= 0) {
    drawCursor(ctx, g, DETAIL_X + 2, 28 + cursor * 22, false, frame);
    const mv = getMove(ctx.data, q.moves[cursor].id);
    const cat = mv.category === "physical" ? "PHYSICAL" : mv.category === "special" ? "SPECIAL" : "STATUS";
    ctx.ui.drawWindow(g, DETAIL_X, 120, SCREEN_W - DETAIL_X, SCREEN_H - 120);
    drawTiny(g, swapFrom >= 0 ? "SWAP WITH WHICH MOVE?" : `POW ${mv.power || "--"}  ACC ${mv.accuracy ?? "--"}  ${cat}`, DETAIL_X + 8, 128);
    ctx.ui.wrap(mv.description || "", textCols(DETAIL_W - 8)).slice(0, 3).forEach((l, i) => ctx.ui.drawText(g, l, DETAIL_X + 8, 138 + i * 12));
  } else {
    drawTiny(g, "A: DETAILS  SELECT: SWAP", DETAIL_X, 128, UI.dark);
    drawTiny(g, "PICK A MOVE, THEN ITS NEW SLOT", DETAIL_X, 140, "#8a9a88");
  }
}
