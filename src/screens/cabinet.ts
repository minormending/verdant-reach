// Specimen Cabinet (PC storage): move Quickened between party and box.

import type { GameContext, Quickened } from "../contracts";
import { speciesPath, SCREEN_W, UI } from "../contracts";
import { qName } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, drawCursor, drawIcon, drawLevel, drawMoreArrow, drawSpecies, drawTiny, preload } from "./kit/draw";
import { ListView, Menu, ScreenUi } from "./kit/widgets";
import { summaryScreen } from "./summary";
import { drawSeedIcon } from "../ui/seedArt";

import { aboveText, CONTENT_H, HALF, LIST_ROWS } from "./kit/layout";

type Mode = "menu" | "deposit" | "withdraw";

export function cabinetScreen(ctx: GameContext): Promise<void> {
  let ui!: ScreenUi;
  let mode: Mode = "menu";
  let list: ListView | null = null;
  let frame = 0;
  const party = () => ctx.state.party;
  const box = () => ctx.state.box;
  const source = () => (mode === "withdraw" ? box() : party());

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    clearScreen(g, "#d8e8e0");
    if (mode === "menu") {
      drawCabinetArt(g, HALF + (HALF - 56) / 2, 16);
      ctx.ui.drawText(g, "SPECIMEN", HALF + (HALF - 64) / 2, 80, UI.dark);
      ctx.ui.drawText(g, "CABINET", HALF + (HALF - 56) / 2, 92, UI.dark);
    } else if (list) {
      const src = source();
      g.fillStyle = UI.dark;
      g.fillRect(0, 0, SCREEN_W, 9);
      drawTiny(g, mode === "withdraw" ? `CABINET  ${src.length}` : `PARTY  ${src.length}/6`, 4, 2, UI.white);
      for (const [i, r] of list.visibleRows()) {
        const y = 14 + r * 16;
        const q = src[i];
        g.fillStyle = i === list.index ? "#f8f0b8" : r % 2 ? "#e4efe8" : "#d8e8e0";
        g.fillRect(0, y - 4, HALF, 16);
        if (!q) {
          ctx.ui.drawText(g, "CANCEL", 24, y);
          continue;
        }
        const f = i === list.index ? Math.floor(frame / 12) % 2 : 0;
        if (q.seed) drawSeedIcon(g, ctx.assets, 8, y - 4, f as 0 | 1);
        else drawIcon(ctx, g, q.species, 8, y - 4, f, q.sport);
        ctx.ui.drawText(g, qName(ctx.data, q).slice(0, 12), 24, y);
        if (!q.seed) drawLevel(ctx, g, q.level, HALF - 36, y);
      }
      const sy = 14 + (list.index - list.scroll) * 16;
      drawCursor(ctx, g, 0, sy, ui.overlays.length > 0, list.frame);
      if (list.canScrollDown()) drawMoreArrow(ctx, g, HALF - 12, CONTENT_H - 12, frame);
      if (list.canScrollUp()) drawMoreArrow(ctx, g, HALF - 12, 10, frame, "up");
    }
    if (list && mode !== "menu") {
      const q = source()[list.index];
      if (q) {
        const x = HALF + Math.floor((HALF - 56) / 2);
        if (q.seed) drawSeedIcon(g, ctx.assets, x + 20, 40, 0);
        else drawSpecies(ctx, g, q.species, "front", x, 24, { sport: q.sport });
        ctx.ui.drawText(g, qName(ctx.data, q), HALF + 16, 92);
      }
    }
    ui?.draw(g);
  };

  const pickFrom = async (flow: Flow, m: Mode) => {
    mode = m;
    const src = source();
    if (src.length === 0) {
      await ui.say(m === "withdraw" ? "The CABINET is empty." : "There are no QUICKENED here.");
      mode = "menu";
      return;
    }
    await preload(ctx, src.flatMap((q) => [speciesPath(q.species, "icon"), speciesPath(q.species, "front")]));
    list = new ListView(ctx, () => source().length + 1, { rows: LIST_ROWS, rowH: 16 });
    for (;;) {
      ui.tb.show(m === "withdraw" ? "Take out which QUICKENED?" : "Store which QUICKENED?", "instant");
      await flow.run(list);
      const i = list.result;
      if (i < 0 || i >= source().length) break;
      const q = source()[i];
      const verb = m === "withdraw" ? "WITHDRAW" : "STORE";
      ui.tb.show(`Do what with ${qName(ctx.data, q)}?`, "instant");
      const c = await ui.choose(new Menu(ctx, [verb, "SUMMARY", "CANCEL"], aboveText(88, 56)));
      if (c === 1) {
        await summaryScreen(ctx, source(), i);
      } else if (c === 0) {
        if (m === "deposit") await deposit(q, i);
        else await withdraw(q, i);
        list.clamp();
      }
    }
    mode = "menu";
    list = null;
  };

  const deposit = async (q: Quickened, i: number) => {
    const rest = party().filter((_, k) => k !== i);
    if (rest.length === 0) {
      await ui.say("That's your last QUICKENED! Keep it with you.");
      return;
    }
    if (!rest.some((x) => x.hp > 0 && !x.seed)) {
      await ui.say("You'd have no healthy QUICKENED left with you!");
      return;
    }
    party().splice(i, 1);
    box().push(q);
    ctx.audio.playSfx("select");
    await ui.say(`Stored ${qName(ctx.data, q)} in the CABINET.`);
  };

  const withdraw = async (q: Quickened, i: number) => {
    if (party().length >= 6) {
      await ui.say("Your party is full! Store one first.");
      return;
    }
    box().splice(i, 1);
    party().push(q);
    ctx.audio.playSfx("select");
    await ui.say(`Took out ${qName(ctx.data, q)}.`);
  };

  const main = async (flow: Flow) => {
    ui = new ScreenUi(ctx, flow);
    ctx.audio.playSfx("menu_open");
    let start = 0;
    for (;;) {
      ui.tb.show("What do you want to do?", "instant");
      const menu = new Menu(ctx, ["STORE", "WITHDRAW", "CANCEL"], { x: 16, y: 24, w: HALF - 32, start });
      const c = await ui.choose(menu);
      if (c < 0 || c === 2) return;
      start = c;
      await pickFrom(flow, c === 0 ? "deposit" : "withdraw");
    }
  };

  return runFlowScene<void>(ctx, { draw, main, fallback: undefined });
}

/** A glass-fronted specimen cabinet with pressed leaves, 56x52. */
function drawCabinetArt(g: CanvasRenderingContext2D, x: number, y: number) {
  const R = (dx: number, dy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x + dx, y + dy, w, h); };
  R(0, 0, 56, 52, UI.black);
  R(1, 1, 54, 50, "#8a5a30");
  R(1, 1, 54, 3, "#b07840");
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const dx = 5 + c * 24, dy = 7 + r * 14;
    R(dx, dy, 22, 12, "#3a2410");
    R(dx + 1, dy + 1, 20, 10, "#e8f0e0");
    R(dx + 1, dy + 1, 20, 2, "#ffffff");
    // a pressed leaf on each card
    R(dx + 8, dy + 4, 5, 3, ["#58a040", "#e070a8", "#a07838"][(r + c) % 3]);
    R(dx + 10, dy + 7, 1, 3, "#3a6020");
  }
  R(26, 47, 4, 2, "#f0d080");
}

