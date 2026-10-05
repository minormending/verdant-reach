// Party menu: six rows (icon, name, level, HP bar, status), SUMMARY / SWITCH
// / ITEM / CANCEL submenu, and a pick mode for battle and items.

import type { GameContext, ItemId, Quickened } from "../contracts";
import { speciesPath, TEXTBOX, UI } from "../contracts";
import { applyItem, consumeItem, isMedicine } from "../battle/logic/items";
import { itemGrowthTarget } from "../battle/logic/exp";
import { qName, STATUS_ABBR } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, drawCursor, drawHpBar, drawIcon, drawLevel, drawStatusBadge, drawTextRight, drawTiny, pad, preload } from "./kit/draw";
import { fmt } from "./kit/text";
import { Menu, ScreenUi } from "./kit/widgets";
import { runGrowth } from "./flows/growth";
import { summaryScreen } from "./summary";

export interface PartyOpts {
  mode: "view" | "pick";
  prompt?: string;
  /** Field item use: apply this item to the picked Quickened (stays open on "no effect"). */
  useItem?: ItemId;
  /** Pick mode with a Crystal-style submenu: [verb, SUMMARY, CANCEL] (battle switching). */
  verb?: string;
  /** Initial cursor row. */
  start?: number;
}

const ROW_H = 16;

export function preloadPartyArt(ctx: GameContext, party: Quickened[]) {
  const paths: string[] = [];
  for (const q of party) {
    paths.push(speciesPath(q.species, "icon"), speciesPath(q.species, "icon__2"), speciesPath(q.species, "front"));
  }
  return preload(ctx, paths);
}

export function partyScreen(ctx: GameContext, opts: PartyOpts): Promise<number> {
  const party = () => ctx.state.party;
  let ui!: ScreenUi;
  let index = Math.max(0, Math.min(opts.start ?? 0, ctx.state.party.length - 1));
  let swapFrom = -1;
  let frame = 0;
  const shownHp = new Map<string, number>();
  let hideCursor = false;

  const draw = (g: CanvasRenderingContext2D) => {
    frame++;
    clearScreen(g, UI.white);
    party().forEach((q, i) => drawRow(ctx, g, q, i, i === index, frame, shownHp.get(q.uid) ?? q.hp));
    if (!hideCursor) {
      if (swapFrom >= 0) drawCursor(ctx, g, 0, swapFrom * ROW_H + 4, true);
      drawCursor(ctx, g, 0, index * ROW_H + 4);
    }
    ui?.draw(g);
  };

  const main = async (flow: Flow): Promise<number> => {
    ui = new ScreenUi(ctx, flow);
    await preloadPartyArt(ctx, party());
    if (party().length === 0) {
      await ui.say("There are no QUICKENED here.");
      return -1;
    }
    const basePrompt = opts.prompt ?? (opts.mode === "pick" ? "Choose a QUICKENED." : "Choose a QUICKENED.");
    for (;;) {
      ui.tb.show(fmt(ctx, swapFrom >= 0 ? "Move to where?" : basePrompt), "instant");
      const pick = await selectRow(flow);
      if (pick === -1) {
        if (swapFrom >= 0) { swapFrom = -1; continue; }
        return -1;
      }
      if (swapFrom >= 0) {
        const list = party();
        if (pick !== swapFrom) {
          const tmp = list[swapFrom];
          list[swapFrom] = list[pick];
          list[pick] = tmp;
          ctx.audio.playSfx("select");
        }
        swapFrom = -1;
        continue;
      }
      if (opts.mode === "pick") {
        if (opts.verb) {
          const sub = new Menu(ctx, [opts.verb, "SUMMARY", "CANCEL"], { x: 88, y: TEXTBOX.y - 56, w: 72 });
          const c = await ui.choose(sub);
          if (c === 0) return pick;
          if (c === 1) index = await summaryScreen(ctx, party(), pick);
          continue;
        }
        if (opts.useItem) {
          const used = await useItemOn(flow, pick, opts.useItem);
          if (used === "stay") continue;
          return pick;
        }
        return pick;
      }
      // View mode submenu
      const q = party()[pick];
      ui.tb.show(fmt(ctx, `Do what with ${qName(ctx.data, q)}?`), "instant");
      const sub = new Menu(ctx, ["SUMMARY", "SWITCH", "ITEM", "CANCEL"], { x: 88, y: TEXTBOX.y - 72, w: 72 });
      const c = await ui.choose(sub);
      if (c === 0) {
        index = await summaryScreen(ctx, party(), pick);
      } else if (c === 1) {
        if (party().length > 1) swapFrom = pick;
      } else if (c === 2) {
        const { bagScreen } = await import("./bag");
        const item = await bagScreen(ctx, { inBattle: false, select: (id) => isMedicine(ctx.data, id) || !!itemGrowthTarget(ctx.data, q, id) });
        if (item) {
          await useItemOn(flow, pick, item);
        }
      }
    }
  };

  /** Row selection task (up/down, A/B). */
  const selectRow = async (flow: Flow): Promise<number> => {
    const t = {
      result: -1,
      update(input: import("../contracts").Input) {
        const n = party().length;
        const prev = index;
        if (input.repeat("up")) index = (index + n - 1) % n;
        else if (input.repeat("down")) index = (index + 1) % n;
        if (prev !== index) ctx.audio.playSfx("cursor");
        if (input.pressed("a")) { ctx.audio.playSfx("select"); t.result = index; return true; }
        if (input.pressed("b")) { ctx.audio.playSfx("cancel"); t.result = -1; return true; }
        return false;
      },
    };
    return flow.get(t);
  };

  /** Apply a medicine/growth item to party[i] with the HP animation. */
  const useItemOn = async (flow: Flow, i: number, item: ItemId): Promise<"used" | "stay"> => {
    const q = party()[i];
    const growTo = itemGrowthTarget(ctx.data, q, item);
    if (growTo) {
      consumeItem(ctx.state.bag, item);
      hideCursor = true;
      await runGrowth(ctx, q, growTo);
      hideCursor = false;
      return "used";
    }
    const res = applyItem(ctx.data, item, q);
    if (!res.ok) {
      await ui.say(res.text);
      return "stay";
    }
    consumeItem(ctx.state.bag, item);
    ctx.audio.playSfx("select");
    if (res.hpTo !== res.hpFrom) {
      const from = res.hpFrom;
      const to = res.hpTo;
      const frames = Math.max(10, Math.min(60, Math.round(Math.abs(to - from) * 48 / Math.max(1, q.stats.hp))));
      await flow.animate(frames, (_k, t) => shownHp.set(q.uid, from + (to - from) * t));
      shownHp.delete(q.uid);
    }
    await ui.say(fmt(ctx, res.text));
    return "used";
  };

  return runFlowScene<number>(ctx, { draw, main, fallback: -1 });
}

function drawRow(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, i: number, selected: boolean, frame: number, hp: number) {
  const y = i * ROW_H;
  const speed = hp <= 0 ? 0 : hp / q.stats.hp > 0.5 ? (selected ? 6 : 16) : hp / q.stats.hp > 0.2 ? (selected ? 10 : 24) : (selected ? 16 : 32);
  const f = speed === 0 ? 0 : Math.floor(frame / speed) % 2;
  drawIcon(ctx, g, q.species, 8, y, f, q.sport);
  const name = qName(ctx.data, q);
  ctx.ui.drawText(g, name.slice(0, 12), 24, y);
  drawLevel(ctx, g, q.level, 124, y);
  drawHpBar(g, 24, y + 9, Math.max(0, hp), q.stats.hp, 48);
  if (q.hp <= 0) {
    g.fillStyle = "#808080";
    g.fillRect(83, y + 9, 15, 7);
    drawTiny(g, "WLT", 85, y + 10, UI.white);
  } else if (q.status) {
    drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 83, y + 9);
  }
  drawTextRight(ctx, g, `${pad(Math.max(0, Math.round(hp)), 3)}/${pad(q.stats.hp, 3)}`, 156, y + 8);
}
