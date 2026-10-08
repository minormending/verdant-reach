// Bag: ITEMS / PODS / KEY ITEMS pockets with USE / TOSS / CANCEL.
// In battle it resolves with the chosen item (the battle applies it).

import type { GameContext, Item, ItemId } from "../contracts";
import { SCREEN_W, UI } from "../contracts";
import { isGrowthItem } from "../battle/logic/exp";
import { consumeItem, isMedicine } from "../battle/logic/items";
import { getItem, itemName } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, cursorBob, drawCursor, drawItemIcon, drawMoreArrow, drawTextRight } from "./kit/draw";
import { countOf, fmt, playerName } from "./kit/text";
import { ListView, Menu, ScreenUi } from "./kit/widgets";
import { herbariumScreen } from "./herbarium";
import { partyScreen } from "./party";

const POCKETS: { id: Item["pocket"]; name: string[] }[] = [
  { id: "items", name: ["ITEMS"] },
  { id: "pods", name: ["PODS"] },
  { id: "key", name: ["KEY", "ITEMS"] },
];

export interface BagOpts {
  inBattle: boolean;
  /** Choose-an-item mode (e.g. ITEM from the party menu): only these can be picked. */
  select?: (id: ItemId) => boolean;
}

import { aboveText, CONTENT_H, LIST_ROWS, RIGHT } from "./kit/layout";

const SIDE = 72;
const lastPos = { pocket: 0, index: [0, 0, 0] };

export function bagScreen(ctx: GameContext, opts: BagOpts): Promise<ItemId | null> {
  let ui!: ScreenUi;
  let pocket = lastPos.pocket;
  let list: ListView | null = null;
  let frame = 0;
  let slide = 0;

  const items = (): ItemId[] => {
    const p = POCKETS[pocket].id;
    return Object.keys(ctx.state.bag).filter((id) => (ctx.state.bag[id] ?? 0) > 0 && getItem(ctx.data, id).pocket === p);
  };
  const entries = () => [...items(), "__cancel"];

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    clearScreen(g, "#e8f0d8");
    // Pocket label + vasculum (the botanist's collecting tin)
    g.fillStyle = UI.dark;
    g.fillRect(0, 0, SIDE, 22);
    POCKETS[pocket].name.forEach((n, i, a) => ctx.ui.drawText(g, n, SIDE / 2 - n.length * 4, (a.length > 1 ? 3 : 7) + i * 9, UI.white));
    drawVasculum(g, (SIDE - 40) / 2, 22 + slide, pocket);
    // the selected item, held up on a little tag
    const sel = list ? entries()[list.index] : undefined;
    if (sel && sel !== "__cancel") {
      g.fillStyle = "#5a3a20";
      g.fillRect(SIDE / 2 - 1, 61, 1, 3);
      g.fillStyle = UI.black;
      g.fillRect(SIDE / 2 - 11, 64, 22, 20);
      g.fillStyle = "#f8f4e4";
      g.fillRect(SIDE / 2 - 10, 65, 20, 18);
      if (!drawItemIcon(ctx, g, sel, SIDE / 2 - 8, 66 - cursorBob(frame))) {
        g.fillStyle = "#c8b890";
        g.fillRect(SIDE / 2 - 4, 70, 8, 8);
      }
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i === pocket ? UI.dark : "#b0c0a0";
      g.fillRect(SIDE / 2 - 8 + i * 6, 88, 4, 4);
    }
    ctx.ui.drawText(g, "◀", 8, 86);
    ctx.ui.drawText(g, "▶", SIDE - 16, 86);
    // List
    ctx.ui.drawWindow(g, SIDE, 0, SCREEN_W - SIDE, CONTENT_H);
    if (list) {
      const ents = entries();
      for (const [i, r] of list.visibleRows()) {
        const y = 8 + r * 16;
        const id = ents[i];
        if (id === "__cancel") {
          ctx.ui.drawText(g, "CANCEL", SIDE + 16, y);
        } else {
          const usable = !opts.select || opts.select(id);
          // 13-character names fit between the cursor and the right edge
          ctx.ui.drawText(g, itemName(ctx.data, id), SIDE + 16, y, usable ? UI.black : "#909090");
          if (getItem(ctx.data, id).pocket !== "key") drawTextRight(ctx, g, `×${pad2(ctx.state.bag[id] ?? 0)}`, RIGHT, y);
        }
      }
      drawCursor(ctx, g, SIDE + 8, 8 + (list.index - list.scroll) * 16, !!ui && ui.overlays.length > 0, list.frame);
      if (list.canScrollDown()) drawMoreArrow(ctx, g, RIGHT - 8, CONTENT_H - 12, frame);
      if (list.canScrollUp()) drawMoreArrow(ctx, g, RIGHT - 8, 2, frame, "up");
    }
    ui?.draw(g);
  };

  const describe = () => {
    if (!list) return;
    const id = entries()[list.index];
    if (!id || id === "__cancel") ui.tb.show("Close the bag.", "instant");
    else ui.tb.show(getItem(ctx.data, id).description || itemName(ctx.data, id), "instant");
  };

  const main = async (flow: Flow): Promise<ItemId | null> => {
    ui = new ScreenUi(ctx, flow);
    const makeList = () => {
      list = new ListView(ctx, () => entries().length, {
        rows: LIST_ROWS, rowH: 16, start: lastPos.index[pocket],
        onMove: () => describe(),
        onButton: (b) => (b === "left" ? -2 : b === "right" ? -3 : null),
      });
    };
    makeList();
    for (;;) {
      describe();
      await flow.run(list!);
      const r = list!.result;
      lastPos.index[pocket] = list!.index;
      if (r === -2 || r === -3) {
        pocket = (pocket + (r === -2 ? 2 : 1)) % 3;
        lastPos.pocket = pocket;
        ctx.audio.playSfx("cursor");
        await flow.animate(6, (_i, t) => { slide = Math.round(Math.sin(t * Math.PI) * -3); });
        slide = 0;
        makeList();
        continue;
      }
      if (r === -1) return null;
      const id = entries()[r];
      if (id === "__cancel") return null;
      const it = getItem(ctx.data, id);

      // Party "ITEM": pick-only mode.
      if (opts.select) {
        if (opts.select(id)) return id;
        await ui.say("That can't be used on it.");
        continue;
      }

      const options = opts.inBattle ? ["USE", "CANCEL"] : it.pocket === "key" ? ["USE", "CANCEL"] : ["USE", "TOSS", "CANCEL"];
      ui.tb.show(`${itemName(ctx.data, id)}:`, "instant");
      const menu = new Menu(ctx, options, aboveText(88, options.length * 16 + 8));
      const c = await ui.choose(menu);
      const choice = c < 0 ? "CANCEL" : options[c];
      if (choice === "CANCEL") continue;
      if (choice === "TOSS") {
        await toss(flow, id);
        list!.clamp();
        continue;
      }
      // USE
      if (opts.inBattle) {
        if (it.usableInBattle) {
          lastPos.index[pocket] = list!.index;
          return id;
        }
        await notNow();
        continue;
      }
      const used = await useInField(id);
      list!.clamp();
      if (used === "close") return null;
    }
  };

  const notNow = () => ui.say(fmt(ctx, `${playerName(ctx)}! Now isn't the time to use that!`));

  const toss = async (flow: Flow, id: ItemId) => {
    const have = ctx.state.bag[id] ?? 0;
    ui.tb.show("Toss out how many?", "instant");
    const n = await ui.qty(have, aboveText(64, 24));
    if (n <= 0) return;
    const ok = await ui.yesNo(`Throw away ${countOf(n, itemName(ctx.data, id))}?`);
    if (!ok) return;
    consumeItem(ctx.state.bag, id, n);
    await ui.say(`Threw away ${itemName(ctx.data, id)}.`);
    void flow;
  };

  const useInField = async (id: ItemId): Promise<"used" | "stay" | "close"> => {
    const it = getItem(ctx.data, id);
    if (id === "field_herbarium") {
      await herbariumScreen(ctx);
      return "stay";
    }
    if (it.usableInField && (isMedicine(ctx.data, id) || isGrowthItem(ctx.data, id))) {
      const picked = await partyScreen(ctx, { mode: "pick", prompt: "Use on which?", useItem: id });
      return picked < 0 ? "stay" : "used";
    }
    await notNow();
    return "stay";
  };

  return runFlowScene<ItemId | null>(ctx, { draw, main, fallback: null });
}

const pad2 = (n: number) => String(n).padStart(2, " ");

/** A procedural vasculum: the botanist's tin collecting case, 40x38. */
function drawVasculum(g: CanvasRenderingContext2D, x: number, y: number, pocket: number) {
  const R = (dx: number, dy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x + dx, y + dy, w, h); };
  // strap
  R(6, 0, 28, 2, "#5a3a20");
  R(4, 2, 2, 8, "#5a3a20");
  R(34, 2, 2, 8, "#5a3a20");
  // tin body
  R(1, 10, 38, 28, UI.black);
  R(2, 11, 36, 26, "#709888");
  R(2, 11, 36, 3, "#a8c8b8");
  R(2, 33, 36, 4, "#507060");
  // lid seam + latch
  R(1, 18, 38, 1, UI.black);
  R(17, 15, 6, 6, "#c8a050");
  R(18, 16, 4, 4, "#f0d080");
  // pocket compartments (highlight the open one)
  for (let i = 0; i < 3; i++) {
    R(5 + i * 11, 22, 8, 10, i === pocket ? "#f0e0a0" : "#5a7868");
    R(5 + i * 11, 22, 8, 1, UI.black);
  }
  // a leaf peeking out
  R(28, 6, 4, 4, "#58a040");
  R(30, 4, 2, 2, "#58a040");
}
