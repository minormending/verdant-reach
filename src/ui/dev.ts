// ?dev=ui : UI showcase. A menu of demos: the font sheet, the text box at
// each speed, menus, YES/NO, name entry, trainer card, SAVE, the TO BE
// CONTINUED card and the title screen.

import type { GameContext, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W, UI } from "../contracts";
import { GLYPHS } from "./font";
import { drawText, drawWindow } from "./kit";
import { nameEntry } from "./nameEntry";
import { toBeContinued } from "./tbc";
import { saveDialog, trainerCard } from "./widgets";

const DEMOS = ["FONT", "TEXT BOX", "MENUS", "NAME ENTRY", "CARD", "SAVE", "TBC", "TITLE"] as const;

export default function devUi(ctx: GameContext): Scene {
  ctx.state.playerName = ctx.state.playerName || "ROWAN";
  ctx.state.money = 3210;
  ctx.state.marks = ["bramble_mark"];
  let mode: "menu" | "font" | "busy" = "menu";
  let frame = 0;

  const run = async (demo: (typeof DEMOS)[number]) => {
    mode = "busy";
    switch (demo) {
      case "FONT":
        mode = "font";
        return;
      case "TEXT BOX":
        for (const speed of ["slow", "mid", "fast"] as const) {
          ctx.state.options.textSpeed = speed;
          await ctx.ui.say(`Text speed: ${speed.toUpperCase()}. Hold A to hurry the words along.`);
        }
        ctx.state.options.textSpeed = "mid";
        await ctx.ui.say("A long paragraph scrolls a line at a time, the way it did on the Game Boy Color, so nothing is cut off mid-thought.");
        await ctx.ui.say("A blank line starts a fresh box.\n\nLike this one!");
        await ctx.ui.say("Symbols: ♪ é … × ♂ ♀ → ← ↑ ↓ ▶ ▼", { speaker: "DR. VALE" });
        await ctx.ui.say("{PLAYER} and {RIVAL} are substituted.");
        await ctx.ui.say("This box closes itself.", { autoClose: true });
        break;
      case "MENUS": {
        await ctx.ui.say("Which seedling calls to you?");
        const i = await ctx.ui.choose(["OAK ACORN", "CHILI BLOSSOM", "LILY SEEDPOD"]);
        await ctx.ui.say(i < 0 ? "Cancelled." : `You picked option ${i + 1}.`);
        const yes = await ctx.ui.yesNo("Is the text box readable?");
        await ctx.ui.say(yes ? "Wonderful!" : "Noted. Back to the drawing board.");
        const j = await ctx.ui.choose(["NORTH", "SOUTH"], { prompt: "A menu placed top-left.", x: 0, y: 0 });
        await ctx.ui.say(`Chosen: ${j}`);
        break;
      }
      case "NAME ENTRY": {
        const n = await nameEntry(ctx, { title: "YOUR NAME?", max: 7, defaultName: "ROWAN", sprite: "player" });
        await ctx.ui.say(`Name: ${n}`);
        const k = await nameEntry(ctx, { title: "NICKNAME?", max: 10, defaultName: "OAK ACORN", species: "oak_acorn" });
        await ctx.ui.say(`Nickname: ${k}`);
        break;
      }
      case "CARD":
        await trainerCard(ctx);
        break;
      case "SAVE":
        await saveDialog(ctx);
        break;
      case "TBC":
        await toBeContinued(ctx);
        break;
      case "TITLE": {
        const { createTitleScene } = await import("./title");
        ctx.scenes.replace(createTitleScene(ctx));
        return;
      }
    }
    mode = "menu";
  };

  let pending: Promise<number> | null = null;
  const openMenu = () => {
    pending = ctx.ui.choose([...DEMOS], { x: 0, y: 0 });
    void pending.then((i) => {
      pending = null;
      if (i >= 0) void run(DEMOS[i]);
    });
  };

  return {
    update() {
      frame++;
      if (mode === "font") {
        if (ctx.input.pressed("a") || ctx.input.pressed("b")) mode = "menu";
        return;
      }
      if (mode === "menu" && !pending) openMenu();
    },
    draw(g) {
      g.fillStyle = UI.light;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      if (mode === "font") {
        drawWindow(g, 0, 0, SCREEN_W, SCREEN_H);
        const chars = [...GLYPHS.keys()];
        chars.forEach((ch, i) => drawText(g, ch, 8 + (i % Math.floor((SCREEN_W - 16) / 8)) * 8, 8 + Math.floor(i / Math.floor((SCREEN_W - 16) / 8)) * 10));
        drawText(g, "The quick brown fox", 8, 84);
        drawText(g, "jumps over the lazy", 8, 94);
        drawText(g, "dog. 0123456789!?", 8, 104);
        drawText(g, "HP 23/31 Lv12 ×3", 8, 118, UI.dark);
        drawText(g, "$3000 ♂♀ é…", 8, 128, UI.dark);
      } else {
        drawText(g, "UI SHOWCASE", 72, 136 - Math.floor((frame / 30) % 2), UI.dark);
      }
    },
  };
}
