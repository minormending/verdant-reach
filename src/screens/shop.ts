import * as skin from "../ui/skin";
// Market: BUY / SELL / CANCEL with a quantity picker and money display.
// Drawn over the map (transparent), like Crystal's Mart.

import type { GameContext, ItemId } from "../contracts";
import { SCREEN_W } from "../contracts";
import { addItem, consumeItem } from "../battle/logic/items";
import { getItem, itemName } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { drawCursor, drawItemIcon, drawMoreArrow, drawTextRight } from "./kit/draw";
import { ListView, Menu, ScreenUi } from "./kit/widgets";
import { countOf } from "./kit/text";

import { aboveText, CONTENT_H, LIST_ROWS, RIGHT } from "./kit/layout";

const SIDE = 88;
const MAX_MONEY = 999999;

export function shopScreen(ctx: GameContext, stock: ItemId[]): Promise<void> {
  let ui!: ScreenUi;
  let list: ListView | null = null;
  let listItems: ItemId[] = [];
  let selling = false;
  let frame = 0;
  const forSale = stock.filter((id) => getItem(ctx.data, id).price > 0);

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    ctx.ui.drawWindow(g, 0, 0, 88, 24);
    ctx.ui.drawText(g, "$", 8, 8);
    drawTextRight(ctx, g, String(ctx.state.money), 80, 8);
    if (list) {
      ctx.ui.drawWindow(g, SIDE, 0, SCREEN_W - SIDE, CONTENT_H);
      skin.highlight(g, { x: SIDE + 6, y: 5 + (list.index - list.scroll) * 16, w: SCREEN_W - SIDE - 12, h: 14 });
      for (const [i, r] of list.visibleRows()) {
        const y = 8 + r * 16;
        const id = listItems[i];
        if (!id) { ctx.ui.drawText(g, "CANCEL", SIDE + 16, y); continue; }
        ctx.ui.drawText(g, itemName(ctx.data, id), SIDE + 16, y);
        const it = getItem(ctx.data, id);
        const right = selling ? `×${String(ctx.state.bag[id] ?? 0).padStart(2, " ")}` : `$${it.price}`;
        drawTextRight(ctx, g, right, RIGHT, y);
      }
      drawCursor(ctx, g, SIDE + 8, 8 + (list.index - list.scroll) * 16, ui.overlays.length > 0, list.frame);
      // the item under the cursor, and how many are already in the bag
      const cur = listItems[list.index];
      if (cur) {
        ctx.ui.drawWindow(g, 0, 32, SIDE, CONTENT_H - 32);
        drawItemIcon(ctx, g, cur, 32, 48);
        g.fillStyle = "#306850";
        const have = ctx.state.bag[cur] ?? 0;
        ctx.ui.drawText(g, String(Math.min(99, have)).padStart(2, " "), 32, 80);
      }
      if (list.canScrollDown()) drawMoreArrow(ctx, g, RIGHT - 8, CONTENT_H - 12, frame);
      if (list.canScrollUp()) drawMoreArrow(ctx, g, RIGHT - 8, 2, frame, "up");
    }
    ui?.draw(g);
  };

  const describe = () => {
    if (!list) return;
    const id = listItems[list.index];
    ui.tb.show(id ? getItem(ctx.data, id).description || itemName(ctx.data, id) : "Done shopping here.", "instant");
  };

  const buy = async (flow: Flow) => {
    selling = false;
    listItems = forSale;
    list = new ListView(ctx, () => listItems.length + 1, { rows: LIST_ROWS, rowH: 16, onMove: describe });
    for (;;) {
      describe();
      await flow.run(list);
      const i = list.result;
      if (i < 0 || i >= listItems.length) break;
      const id = listItems[i];
      const it = getItem(ctx.data, id);
      const have = ctx.state.bag[id] ?? 0;
      const afford = Math.floor(ctx.state.money / it.price);
      if (afford <= 0) { await ui.say("You don't have enough money."); continue; }
      if (have >= 99) { await ui.say("Your bag can't hold any more of those."); continue; }
      ui.tb.show(`${itemName(ctx.data, id)}?\nHow many?`, "instant");
      const n = await ui.qty(Math.min(99 - have, afford), { ...aboveText(136, 24), extra: (k) => `  $${k * it.price}` });
      if (n <= 0) continue;
      const total = n * it.price;
      const ok = await ui.yesNo(`${countOf(n, itemName(ctx.data, id))} will be $${total}. OK?`);
      if (!ok) continue;
      if (ctx.state.money < total) { await ui.say("You don't have enough money."); continue; }
      ctx.state.money -= total;
      addItem(ctx.state.bag, id, n);
      ctx.audio.playSfx("save");
      await ui.say("Here you are. Thank you!");
    }
    list = null;
  };

  const sell = async (flow: Flow) => {
    selling = true;
    const refresh = () => {
      listItems = Object.keys(ctx.state.bag).filter((id) => {
        const it = getItem(ctx.data, id);
        return (ctx.state.bag[id] ?? 0) > 0 && it.pocket !== "key" && it.price > 0;
      });
    };
    refresh();
    if (listItems.length === 0) {
      await ui.say("You don't have anything I can buy.");
      return;
    }
    list = new ListView(ctx, () => listItems.length + 1, { rows: LIST_ROWS, rowH: 16, onMove: describe });
    for (;;) {
      describe();
      await flow.run(list);
      const i = list.result;
      if (i < 0 || i >= listItems.length) break;
      const id = listItems[i];
      const it = getItem(ctx.data, id);
      const each = Math.floor(it.price / 2);
      ui.tb.show("How many?", "instant");
      const n = await ui.qty(ctx.state.bag[id] ?? 0, { ...aboveText(136, 24), extra: (k) => `  $${k * each}` });
      if (n <= 0) continue;
      const ok = await ui.yesNo(`I can pay you $${n * each}. Is that OK?`);
      if (!ok) continue;
      consumeItem(ctx.state.bag, id, n);
      ctx.state.money = Math.min(MAX_MONEY, ctx.state.money + n * each);
      ctx.audio.playSfx("save");
      await ui.say(`Sold ${itemName(ctx.data, id)}. Thank you!`);
      refresh();
      list.clamp();
      if (listItems.length === 0) break;
    }
    list = null;
  };

  const main = async (flow: Flow) => {
    ui = new ScreenUi(ctx, flow);
    let first = true;
    let start = 0;
    for (;;) {
      ui.tb.show(first ? "Welcome! How may I help you?" : "Is there anything else I can do?", "instant");
      first = false;
      const menu = new Menu(ctx, ["BUY", "SELL", "CANCEL"], { x: 0, y: 24, w: 72, start });
      const c = await ui.choose(menu);
      if (c < 0 || c === 2) break;
      start = c;
      if (c === 0) await buy(flow);
      else await sell(flow);
    }
    await ui.say("Please come again!");
  };

  return runFlowScene<void>(ctx, { transparent: true, draw, main, fallback: undefined });
}
