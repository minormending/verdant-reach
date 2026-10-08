import * as skin from "../ui/skin";
// Party menu: six rows (icon, name, level, HP bar, status), SUMMARY / SWITCH
// / ITEM / CANCEL submenu, and a pick mode for battle and items.

import type { GameContext, ItemId, Quickened } from "../contracts";
import { speciesPath, SCREEN_W, UI } from "../contracts";
import { applyItem, consumeItem, isMedicine } from "../battle/logic/items";
import { canGrowWith, isGrowthItem, itemGrowthTarget } from "../battle/logic/exp";
import { qName, STATUS_ABBR } from "../battle/logic/lookup";
import { runFlowScene, type Flow } from "./kit/flow";
import { clearScreen, drawCursor, drawHpBar, drawIcon, drawLevel, drawStatusBadge, drawTextRight, drawWiltBadge, pad, preload } from "./kit/draw";
import { fmt } from "./kit/text";
import { Menu, ScreenUi } from "./kit/widgets";
import { runGrowth } from "./flows/growth";
import { summaryScreen } from "./summary";
// Bag and party call each other only after initialization, so the static cycle is safe.
import { bagScreen } from "./bag";
import { drawSeedIcon } from "../ui/seedArt";
import { aboveText, HALF, PARTY_ROW_H as ROW_H, partyRowY, partyRowX } from "./kit/layout";

export interface PartyOpts {
  mode: "view" | "pick";
  prompt?: string;
  /** Pick mode: show only matching plants; return their original party index. */
  filter?: (q: Quickened) => boolean;
  /** Field item use: apply this item to the picked Quickened (stays open on "no effect"). */
  useItem?: ItemId;
  /** Pick mode with a Crystal-style submenu: [verb, SUMMARY, CANCEL] (battle switching). */
  verb?: string;
  /** Initial cursor row. */
  start?: number;
}

export function preloadPartyArt(ctx: GameContext, party: Quickened[]) {
  const paths: string[] = [];
  for (const q of party) {
    paths.push(speciesPath(q.species, "icon"), speciesPath(q.species, "icon__2"), speciesPath(q.species, "front"));
  }
  return preload(ctx, paths);
}

export function partyScreen(ctx: GameContext, opts: PartyOpts): Promise<number> {
  const party = () => opts.mode === "pick" && opts.filter ? ctx.state.party.filter(opts.filter) : ctx.state.party;
  const growthItem = opts.mode === "pick" && opts.useItem && isGrowthItem(ctx.data, opts.useItem) ? opts.useItem : undefined;
  let ui!: ScreenUi;
  let index = Math.max(0, Math.min(opts.start ?? 0, party().length - 1));
  let swapFrom = -1;
  let frame = 0;
  const shownHp = new Map<string, number>();
  let hideCursor = false;

  const draw = (g: CanvasRenderingContext2D, f = frame + 1) => {
    frame = f;
    clearScreen(g, "#f8f8f0");
    // soft zebra rows; empty slots show as pale dashed plots
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? "#eef4e2" : "#f8f8f0";
      skin.surface(g, "slot", partyRowX(i), partyRowY(i) - (skin.skinOn() ? 2 : 0), HALF, ROW_H);
    }
    for (let i = party().length; i < 6; i++) {
      g.fillStyle = "#d8e0c8";
      for (let x = partyRowX(i) + 10; x < partyRowX(i) + HALF - 8; x += 4) g.fillRect(x, partyRowY(i) + 8, 2, 1);
    }
    if (swapFrom >= 0) {
      g.fillStyle = "#d8e8f8";
      skin.surface(g, "selection", partyRowX(swapFrom), partyRowY(swapFrom), HALF, ROW_H);
    }
    if (!hideCursor) {
      g.fillStyle = "#f8f0b8";
      skin.surface(g, "selection", partyRowX(index), partyRowY(index) - (skin.skinOn() ? 2 : 0), HALF, ROW_H);
      g.fillStyle = UI.dark;
      if (!skin.skinOn()) g.fillRect(partyRowX(index), partyRowY(index), HALF, 1);
      if (!skin.skinOn()) g.fillRect(partyRowX(index), partyRowY(index) + ROW_H - 1, HALF, 1);
    }
    party().forEach((q, i) => {
      // rows slide in from the right as the menu opens
      const k = Math.max(0, Math.min(1, (frame - i * 2) / 8));
      const off = Math.round((1 - k) * (1 - k) * 80);
      drawRow(ctx, g, q, i, i === index && !hideCursor, frame, shownHp.get(q.uid) ?? q.hp, off, growthItem);
    });
    if (!hideCursor) {
      if (swapFrom >= 0) drawCursor(ctx, g, partyRowX(swapFrom), partyRowY(swapFrom) + 4, true);
      if (!skin.focus(g, { x: partyRowX(index), y: partyRowY(index) - 2, w: HALF, h: ROW_H })) drawCursor(ctx, g, partyRowX(index), partyRowY(index) + 4, false, frame);
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
        const originalIndex = ctx.state.party.indexOf(party()[pick]);
        if (opts.verb) {
          const sub = new Menu(ctx, [opts.verb, "SUMMARY", "CANCEL"], aboveText(88, 56));
          const c = await ui.choose(sub);
          if (c === 0) return originalIndex;
          if (c === 1) index = await summaryScreen(ctx, party(), pick);
          continue;
        }
        if (opts.useItem) {
          const used = await useItemOn(flow, pick, opts.useItem);
          if (used === "stay") continue;
          return originalIndex;
        }
        return originalIndex;
      }
      // View mode submenu
      const q = party()[pick];
      ui.tb.show(fmt(ctx, `Do what with ${qName(ctx.data, q)}?`), "instant");
      const sub = new Menu(ctx, ["SUMMARY", "SWITCH", "ITEM", "CANCEL"], aboveText(88, 72));
      const c = await ui.choose(sub);
      if (c === 0) {
        index = await summaryScreen(ctx, party(), pick);
      } else if (c === 1) {
        if (party().length > 1) swapFrom = pick;
      } else if (c === 2) {
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
    if (q.seed) {
      await ui.say("That can't be used on a SEED.");
      return "stay";
    }
    const growTo = itemGrowthTarget(ctx.data, q, item);
    if (growTo) {
      hideCursor = true;
      let grew: boolean;
      try {
        grew = await runGrowth(ctx, q, growTo);
      } finally {
        hideCursor = false;
      }
      if (!grew) return "stay";
      consumeItem(ctx.state.bag, item);
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

function drawRow(ctx: GameContext, g: CanvasRenderingContext2D, q: Quickened, i: number, selected: boolean, frame: number, hp: number, off = 0, growthItem?: ItemId) {
  const y = partyRowY(i);
  const x = partyRowX(i) + off;
  const ability = growthItem ? (canGrowWith(ctx.data, q, growthItem) ? "ABLE" : "NOT ABLE") : null;
  if (q.seed) {
    // A Nursery seed: its icon rocks gently; no level or HP until it sprouts (as Crystal's eggs).
    const f = Math.floor(frame / (selected ? 12 : 28)) % 2 as 0 | 1;
    drawSeedIcon(g, ctx.assets, 12 + x, y + 8, f);
    ctx.ui.drawText(g, "SEED", 40 + x, y + 2);
    if (ability) drawTextRight(ctx, g, ability, HALF - 8 + x, y + 24);
    return;
  }
  // icons bob faster the healthier they are (and fastest when selected), as in Crystal
  const speed = hp <= 0 ? 0 : hp / q.stats.hp > 0.5 ? (selected ? 6 : 16) : hp / q.stats.hp > 0.2 ? (selected ? 10 : 24) : (selected ? 16 : 32);
  const f = speed === 0 ? 0 : Math.floor(frame / speed) % 2;
  const hop = selected && speed > 0 && Math.floor(frame / speed) % 4 === 1 ? -1 : 0;
  drawIcon(ctx, g, q.species, 4 + x, y + hop, f, q.sport);
  const name = qName(ctx.data, q);
  ctx.ui.drawText(g, name.slice(0, 12), 40 + x, y + 2, hp <= 0 ? "#707070" : undefined);
  drawLevel(ctx, g, q.level, 40 + x, y + 12);
  drawHpBar(g, (ability ? 40 : 100) + x, y + 25, Math.max(0, hp), q.stats.hp, ability ? 26 : 36);
  // Growth eligibility replaces HP numbers and status in the right column.
  if (ability) {
    drawTextRight(ctx, g, ability, HALF - 8 + x, y + 24);
    return;
  }
  if (q.hp <= 0) drawWiltBadge(g, 84 + x, y + 13);
  else if (q.status) drawStatusBadge(g, q.status, STATUS_ABBR[q.status], 84 + x, y + 13, frame);
  ctx.ui.drawText(g, `${pad(Math.max(0, Math.round(hp)), 3)}/${pad(q.stats.hp, 3)}`, 40 + x, y + 24);
}
