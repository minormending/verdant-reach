// Field Herbarium (the Pokédex): list with seen/caught markers and counts,
// and an entry page with sprite, scientific name, category, size and the
// entry text paged in the text box.

import type { GameContext, Input, SpeciesId } from "../contracts";
import { SPECIES_IDS, speciesPath, TEXTBOX, UI } from "../contracts";
import { speciesName } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, drawCursor, drawIcon, drawLeaf, drawMoreArrow, drawSpecies, drawTiny, hline, preload } from "./kit/draw";
import { ListView, LINE_Y, TEXT_X } from "./kit/widgets";
import { herbariumNumber } from "./summary";

const ROWS = 6;
let lastIndex = 0;

const num3 = (n: number) => String(n).padStart(3, "0");

export function herbariumScreen(ctx: GameContext): Promise<void> {
  const ids = SPECIES_IDS as readonly SpeciesId[];
  let list: ListView | null = null;
  let frame = 0;
  const seen = () => new Set(ctx.state.herbarium.seen);
  const caught = () => new Set(ctx.state.herbarium.caught);

  const draw = (g: CanvasRenderingContext2D) => {
    frame++;
    clearScreen(g, "#e8f0d8");
    if (!list) return;
    const S = seen();
    const C = caught();
    ctx.ui.drawWindow(g, 32, 0, 128, 112);
    for (const [i, r] of list.visibleRows()) {
      const y = 8 + r * 16;
      const id = ids[i];
      drawTiny(g, num3(i + 1), 2, y + 2, UI.dark);
      if (S.has(id)) {
        drawIcon(ctx, g, id, 14, y - 4, i === list.index ? Math.floor(frame / 12) % 2 : 0);
        ctx.ui.drawText(g, speciesName(ctx.data, id).slice(0, 12), 56, y);
        if (C.has(id)) drawLeaf(g, 47, y);
      } else {
        ctx.ui.drawText(g, "-----", 56, y);
      }
    }
    drawCursor(ctx, g, 39, 8 + (list.index - list.scroll) * 16);
    if (list.canScrollDown()) drawMoreArrow(ctx, g, 144, 100, frame);
    if (list.canScrollUp()) drawMoreArrow(ctx, g, 144, 1, frame, "up");
    // Counts
    ctx.ui.drawWindow(g, 0, 112, 160, 32);
    ctx.ui.drawText(g, `SEEN ${String(S.size).padStart(2, " ")}`, 8, 124);
    drawLeaf(g, 71, 124);
    ctx.ui.drawText(g, `CAUGHT ${String(C.size).padStart(2, " ")}`, 80, 124);
  };

  const main = async (flow: Flow) => {
    await preload(ctx, ctx.state.herbarium.seen.map((id) => speciesPath(id, "icon")));
    list = new ListView(ctx, () => ids.length, { rows: ROWS, rowH: 16, start: lastIndex, paging: true });
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
  const textLines = isCaught && entry ? ctx.ui.wrap(entry.entry, TEXTBOX.cols) : [];
  const pages: string[][] = [];
  for (let i = 0; i < textLines.length; i += 2) pages.push(textLines.slice(i, i + 2));
  let page = 0;
  let frame = 0;

  const draw = (g: CanvasRenderingContext2D) => {
    frame++;
    clearScreen(g, UI.white);
    drawSpecies(ctx, g, id, "front", 4, 4);
    const name = speciesName(ctx.data, id);
    const at = (w: number) => Math.min(64, 160 - w);
    ctx.ui.drawText(g, name, at(ctx.ui.measure(name)), 8);
    const cat = isCaught && entry ? entry.category.toUpperCase() : "?????";
    ctx.ui.drawText(g, cat, at(ctx.ui.measure(cat)), 20);
    drawTiny(g, "HT", 64, 35);
    ctx.ui.drawText(g, isCaught && entry ? `${entry.heightM.toFixed(1)} m` : "??? m", 80, 34);
    drawTiny(g, "WT", 64, 47);
    ctx.ui.drawText(g, isCaught && entry ? `${fmtWeight(entry.weightKg)} kg` : "??? kg", 80, 46);
    drawTiny(g, "NO.", 8, 66);
    ctx.ui.drawText(g, num3(herbariumNumber(id)), 22, 64);
    if (isCaught) drawLeaf(g, 50, 65);
    const sci = entry?.scientificName ?? "";
    ctx.ui.wrap(sci, 18).slice(0, 2).forEach((l, i) => ctx.ui.drawText(g, l, 8, 76 + i * 9, UI.dark));
    hline(g, 0, 94, 160, UI.dark);
    ctx.ui.drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    const lines = pages[page] ?? (isCaught ? [] : ["Catch one to", "press a leaf."]);
    lines.forEach((l, i) => ctx.ui.drawText(g, l, TEXT_X, LINE_Y[i]));
    if (page < pages.length - 1) drawMoreArrow(ctx, g, TEXTBOX.x + TEXTBOX.w - 16, LINE_Y[1] + 7, frame);
  };

  const main = async (flow: Flow) => {
    await preload(ctx, [speciesPath(id, "front")]);
    void ctx.audio.playCry(id);
    await flow.run({
      update(input: Input) {
        if (input.pressed("b")) { ctx.audio.playSfx("cancel"); return true; }
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

function fmtWeight(kg: number): string {
  return kg >= 100 ? String(Math.round(kg)) : kg.toFixed(1);
}
