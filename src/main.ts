// Boot: assemble the GameContext from each module's entry point, then start
// the title screen (or a dev scene with ?dev=<module>). The page shell
// (scaling, touch controls, fullscreen, pause, error card) lives in
// src/platform.

import type { GameContext, Scene } from "./contracts";
import { uiPath } from "./contracts";
import { createAssets, createCanvas, createInput, createSceneStack, runLoop } from "./engine/core";
import { createGameContext, playClock } from "./engine/context";
import { installDevRandom } from "./engine/random";
import { setAudioSuspended } from "./audio";
import {
  createLoadingScene, createPause, createShell, installErrorScreen, pauseOnFocusLoss, platformFlags,
} from "./platform";

const devModules = import.meta.glob<{ default: (ctx: GameContext) => Scene | Promise<Scene> }>("./*/dev.ts");

async function boot() {
  installDevRandom();
  const { canvas, g } = createCanvas();
  const flags = platformFlags();
  let ticks = 0;
  let ctx: GameContext | undefined;
  const scenes = createSceneStack();

  const errors = installErrorScreen({
    canvas, g,
    ticks: () => ticks,
    onShow(redraw) {
      try { ctx?.audio.stopMusic(10); } catch { /* audio is optional */ }
      // If the loop is still alive (a boot failure), keep the card on screen.
      scenes.clear();
      scenes.push({ update() {}, draw: redraw });
    },
  });

  try {
    const input = createInput(() => ctx?.audio.unlock());
    const assets = createAssets();
    ctx = createGameContext({ input, scenes, assets });
    const game = ctx;
    // Touch only grants audio permission on pointerup/touchend, not pointerdown.
    const unlock = () => game.audio.unlock();
    addEventListener("pointerup", unlock);
    addEventListener("touchend", unlock);

    if (flags.shell) createShell(canvas, unlock);
    else canvas.style.imageRendering = "pixelated";

    let booted = false;
    const pause = createPause({
      scenes, input,
      allowed: () => booted && !errors.shown,
      onChange: (on) => setAudioSuspended(game.audio, on),
    });
    if (flags.pauseOnBlur) pauseOnFocusLoss(pause, canvas);

    if (import.meta.env.DEV) {
      (window as unknown as { __vr: unknown }).__vr = { ctx, scenes, pause };
      void import("./overworld/devDriver").then((m) => m.installDevDriver(scenes));
    }

    // Logo first, so the loading screen can show it, then everything else.
    const loading = createLoadingScene(assets);
    scenes.push(loading);
    runLoop(g, scenes, input, (dt) => {
      ticks++;
      if (playClock.running && !pause.paused) game.state.playTimeMs += dt;
    });
    await assets.loadAll([uiPath("title_logo")]);
    // The whole art registry: every bundle (and any legacy file not yet migrated).
    await assets.loadAll(undefined, (d, t) => loading.progress(d, t));
    await loading.finish();
    scenes.pop();

    const params = new URLSearchParams(location.search);
    const dev = params.get("dev");
    const loader = dev ? devModules[`./${dev}/dev.ts`] : undefined;
    if (dev && !loader) console.warn(`[dev] no dev scene at src/${dev}/dev.ts`);
    if (loader) {
      const mod = await loader();
      scenes.push(await mod.default(game));
    } else {
      const { createTitleScene } = await import("./ui/title");
      scenes.push(createTitleScene(game));
    }
    booted = true;

    // Dev only: ?e2e=<suite> runs the automated playthrough (see e2e/README).
    if (import.meta.env.DEV && params.get("e2e")) {
      const e2e = await import("../e2e/playthrough");
      (window as unknown as { __e2e: unknown }).__e2e = e2e;
      void e2e.autorun(params.get("e2e")!);
    }
  } catch (err) {
    errors.fatal(err);
  }
}

void boot();
