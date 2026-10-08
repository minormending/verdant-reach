// Title screen: art (assets/ui/title.png + title_logo.png) or a procedural
// night valley with the Centuryheart and drifting pollen. PRESS START, then
// NEW GAME / CONTINUE (when a save exists) / OPTIONS.

import type { GameContext, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W, UI, uiPath } from "../contracts";
import { Fader } from "../engine/gfx";
import { playClock } from "../engine/context";
import { loadOptions, storeOptions, type SaveMeta } from "../save";
import { Menu, drawTextOutlined } from "./kit";
import { Pollen } from "./pollen";
import { drawSaveInfo } from "./widgets";

let backdrop: HTMLCanvasElement | null = null;

/** Static parts of the procedural title (cached). */
function proceduralBackdrop(): HTMLCanvasElement {
  if (backdrop) return backdrop;
  const c = document.createElement("canvas");
  c.width = SCREEN_W;
  c.height = SCREEN_H;
  const g = c.getContext("2d")!;
  // Sky bands with a 2px dither between them.
  const bands = ["#0c1428", "#122040", "#182c50", "#1e3a5c", "#284a64", "#38606c"];
  const bandH = Math.ceil(SCREEN_H * 2 / 3 / bands.length);
  bands.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * bandH, SCREEN_W, bandH);
    if (i > 0) {
      g.fillStyle = bands[i - 1];
      for (let x = 0; x < SCREEN_W; x += 2) g.fillRect(x + ((x / 2) % 2), i * bandH, 1, 1);
    }
  });
  g.fillStyle = bands[bands.length - 1];
  g.fillRect(0, bands.length * bandH, SCREEN_W, SCREEN_H);
  // Far mountains.
  const ridge = (base: number, amp: number, freq: number, phase: number, color: string) => {
    g.fillStyle = color;
    for (let x = 0; x < SCREEN_W; x++) {
      const h = Math.round(base - amp * (Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.7 + phase * 2) * 0.4));
      g.fillRect(x, h, 1, SCREEN_H - h);
    }
  };
  ridge(Math.round(SCREEN_H * 0.58), 12, 0.045, 1.2, "#284450");
  // The far slope the Centuryheart stands on.
  ridge(Math.round(SCREEN_H * 0.68), 10, 0.03, 4.1, "#203a3c");
  // Centuryheart: rosette and towering flower spike (Puya raimondii).
  const cx = Math.round(SCREEN_W * 0.72);
  const base = Math.round(SCREEN_H * 0.64);
  g.fillStyle = "#3a5a38";
  g.fillRect(cx - 5, base - 2, 11, 3);
  g.fillRect(cx - 3, base - 4, 7, 2);
  g.fillStyle = "#4a6a3a";
  for (let y = base - 44; y < base - 4; y++) {
    const half = y < base - 36 ? 1 : 2;
    g.fillRect(cx - half + 1, y, half * 2 - 1, 1);
  }
  // Mid hills and hedgerows.
  ridge(Math.round(SCREEN_H * 0.76), 6, 0.06, 0.4, "#1a3426");
  g.fillStyle = "#16301f";
  for (let x = -4; x < SCREEN_W; x += 9) {
    const h = Math.round(SCREEN_H * 0.72) + Math.round(Math.sin(x * 0.17) * 3);
    g.fillRect(x, h, 8, 3); g.fillRect(x + 1, h - 2, 6, 2); g.fillRect(x + 2, h - 3, 4, 1);
  }
  ridge(SCREEN_H - 20, 4, 0.08, 2.2, "#10261a");
  g.fillStyle = "#0a1a12";
  g.fillRect(0, SCREEN_H - 10, SCREEN_W, 10);
  for (let x = 0; x < SCREEN_W; x += 3) g.fillRect(x, SCREEN_H - 13 + ((x * 7) % 3), 1, 4);
  backdrop = c;
  return c;
}

const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 53 + 17) % SCREEN_W,
  y: (i * 29 + 5) % Math.floor(SCREEN_H * 0.48),
  t: (i * 37) % 120,
}));

function drawProcedural(g: CanvasRenderingContext2D, frame: number) {
  g.drawImage(proceduralBackdrop(), 0, 0);
  for (const s of STARS) {
    const on = (frame + s.t) % 120;
    g.fillStyle = on < 90 ? "#c8d8f0" : "#506888";
    g.fillRect(s.x, s.y, 1, 1);
  }
  // Glowing bloom along the spike (pulses slowly).
  const cx = Math.round(SCREEN_W * 0.72);
  const bloomY = Math.round(SCREEN_H * 0.64) - 48;
  const pulse = (Math.sin(frame / 30) + 1) / 2;
  g.globalAlpha = 0.18 + pulse * 0.12;
  g.fillStyle = "#f8d860";
  g.fillRect(cx - 7, bloomY + 4, 15, 40);
  g.fillRect(cx - 4, bloomY, 9, 48);
  g.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const y = bloomY + 10 + i * 3;
    const lit = (frame / 6 + i) % 12 < 9;
    g.fillStyle = lit ? "#f8e888" : "#d0a040";
    g.fillRect(cx - 1 + (i % 2 ? 2 : -1), y, 1, 1);
  }
}

function drawLogo(g: CanvasRenderingContext2D, frame: number, ctx: GameContext) {
  const logo = ctx.assets.image(uiPath("title_logo"));
  if (logo) {
    g.drawImage(logo, Math.floor((SCREEN_W - logo.width) / 2), 10);
    return;
  }
  const logoX = Math.floor((SCREEN_W - 7 * 16) / 2);
  const y = 14 + Math.round(Math.sin(frame / 50));
  drawTextOutlined(g, "VERDANT", logoX + 1, y + 2, "#0a1a12", "#0a1a12", 2);
  drawTextOutlined(g, "VERDANT", logoX, y, "#f8e070", "#183018", 2);
  drawTextOutlined(g, "REACH", logoX + 17, y + 22, "#0a1a12", "#0a1a12", 2);
  drawTextOutlined(g, "REACH", logoX + 16, y + 20, "#b8f090", "#183018", 2);
  // leaf flourish between the words
  g.fillStyle = "#78c058";
  g.fillRect(logoX + 4, y + 25, 8, 2); g.fillRect(logoX + 6, y + 24, 4, 1); g.fillRect(logoX + 6, y + 27, 4, 1);
  g.fillRect(logoX + 100, y + 25, 8, 2); g.fillRect(logoX + 102, y + 24, 4, 1); g.fillRect(logoX + 102, y + 27, 4, 1);
  g.fillStyle = "#c8e8a0";
  drawTextOutlined(g, "A BOTANICAL QUEST", (SCREEN_W - "A BOTANICAL QUEST".length * 8) / 2, y + 42, "#d8f0c0", "#10261a");
}

type Phase = "fadein" | "press" | "menu" | "continue" | "busy" | "fadeout";

export function createTitleScene(ctx: GameContext): Scene {
  const pollen = new Pollen(30);
  const fader = new Fader();
  fader.set("black");
  let frame = 0;
  let phase: Phase = "fadein";
  let menu: Menu | null = null;
  let menuIds: ("new" | "continue" | "options")[] = [];
  let meta: SaveMeta | null = null;
  let lastIndex = 0;
  let menuAt = 0;

  const sfx = (id: "cursor" | "select" | "cancel") => ctx.audio.playSfx(id);

  const buildMenu = () => {
    const save = ctx.save as GameContext["save"] & { meta?(): SaveMeta | null };
    meta = save.meta?.() ?? null;
    menuIds = meta ? ["new", "continue", "options"] : ["new", "options"];
    if (meta && lastIndex === 0 && !menu) lastIndex = 1; // cursor starts on CONTINUE
    const labels = { new: "NEW GAME", continue: "CONTINUE", options: "OPTIONS" };
    menu = new Menu(menuIds.map((id) => labels[id]), sfx, { x: 0, y: 0, start: Math.min(lastIndex, menuIds.length - 1), wrap: false });
    menu.x = Math.floor((SCREEN_W - menu.w) / 2);
    menu.y = SCREEN_H - menu.h - 8;
  };

  const leave = async (next: () => Promise<void>) => {
    phase = "fadeout";
    ctx.audio.stopMusic(20);
    await fader.to("black", 20);
    await next();
  };

  const startNewGame = () =>
    leave(async () => {
      const { runNewGame } = await import("./newgame");
      await runNewGame(ctx);
    });

  const continueGame = () =>
    leave(async () => {
      const loaded = ctx.save.read();
      if (!loaded) { phase = "menu"; void fader.to("clear", 8); return; }
      loaded.options = loadOptions();
      ctx.state = loaded;
      const { createOverworldScene } = await import("../overworld");
      ctx.scenes.replace(createOverworldScene(ctx, { mode: "continue" }));
    });

  const scene: Scene = {
    enter() {
      playClock.running = false;
      ctx.audio.playMusic("title");
      void fader.to("clear", 24).then(() => { if (phase === "fadein") phase = "press"; });
    },
    update() {
      frame++;
      fader.tick();
      pollen.update();
      const input = ctx.input;
      switch (phase) {
        case "fadein":
          if (input.pressed("start") || input.pressed("a")) { fader.set("clear"); phase = "press"; }
          break;
        case "press":
          if (input.pressed("start") || input.pressed("a")) {
            sfx("select");
            buildMenu();
            menuAt = frame;
            phase = "menu";
          }
          break;
        case "menu": {
          const r = menu!.update(input);
          if (r === null) break;
          lastIndex = Math.max(0, r);
          if (r < 0) { phase = "press"; break; }
          const id = menuIds[r];
          if (id === "new") void startNewGame();
          else if (id === "continue") phase = "continue";
          else {
            phase = "busy";
            void ctx.screens.options().then(() => {
              storeOptions(ctx.state.options);
              phase = "menu";
            });
          }
          break;
        }
        case "continue":
          if (input.pressed("a")) { sfx("select"); void continueGame(); }
          else if (input.pressed("b")) { sfx("cancel"); phase = "menu"; }
          break;
      }
    },
    draw(g) {
      const art = ctx.assets.image(uiPath("title"));
      drawProcedural(g, frame);
      if (art) g.drawImage(art, Math.floor((SCREEN_W - art.width) / 2), Math.floor((SCREEN_H - art.height) / 2));
      pollen.draw(g);
      drawLogo(g, frame, ctx);
      if (phase === "press" || phase === "fadein") {
        if (Math.floor(frame / 32) % 2 === 0) drawTextOutlined(g, "PRESS START", (SCREEN_W - 11 * 8) / 2, SCREEN_H - 24, UI.white, "#10261a");
      }
      if ((phase === "menu" || phase === "busy" || phase === "continue") && menu) {
        // The menu rises into place over 8 frames when it opens.
        const rise = Math.max(0, 8 - (frame - menuAt));
        const y0 = menu.y;
        menu.y = y0 + Math.round((rise * rise) / 2);
        menu.draw(g, { cursor: phase !== "continue" });
        menu.y = y0;
      }
      if (phase === "continue" && meta) {
        drawSaveInfo(g, meta, Math.floor((SCREEN_W - 128) / 2), 64, 14);
      }
      fader.draw(g, SCREEN_W, SCREEN_H);
    },
  };
  return scene;
}
