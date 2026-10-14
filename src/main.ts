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
import { registerOffline } from "./platform/offline/register";
import { gameSpeedOf } from "./save";

// Dev server and e2e build only (see testHooks() in src/engine/testHooks.ts).
// Spelled out rather than calling testHooks() so the public production build
// drops the dev driver and the playthrough chunk entirely.
const TEST_HOOKS = import.meta.env.DEV || import.meta.env.MODE === "e2e";

const devModules = import.meta.glob<{ default: (ctx: GameContext) => Scene | Promise<Scene> }>("./*/dev.ts");

async function boot() {
  installDevRandom();
  const { canvas, g } = createCanvas();
  const flags = platformFlags();
  let ticks = 0;
  let ctx: GameContext | undefined;
  const scenes = createSceneStack();
  // Public build only: store the game for offline play and take new releases
  // (src/platform/offline/). A downloaded update reloads the page only while
  // nothing would be lost: still loading, or on the bare title screen.
  let titleScene: Scene | undefined;
  let phase: "loading" | "title" | "other" = "loading";
  registerOffline(() => phase === "loading"
    || (phase === "title" && scenes.all().length === 1 && scenes.top() === titleScene));

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

    if (TEST_HOOKS) {
      (window as unknown as { __vr: unknown }).__vr = { ctx, scenes, pause };
      void import("./overworld/devDriver").then((m) => m.installDevDriver(scenes));
    }

    // Logo first, so the loading screen can show it, then everything else.
    const loading = createLoadingScene(assets);
    scenes.push(loading);
    // dt is real time (a step divided by GAME SPEED), so play time counts the wall clock.
    runLoop(g, scenes, input, (dt) => {
      ticks++;
      if (playClock.running && !pause.paused) game.state.playTimeMs += dt;
    }, () => gameSpeedOf(game.state?.options));
    await assets.loadAll([uiPath("title_logo")]);
    // The whole art registry: every bundle (and any legacy file not yet migrated).
    await assets.loadAll(undefined, (d, t) => loading.progress(d, t));
    // ?tilelab=1 (the Tile Lab's "Walk around" button): apply its saved tile
    // overrides in memory. Without the param this module is never loaded.
    if (new URLSearchParams(location.search).has("tilelab")) await (await import("./tilelab/hook")).applyStoredTileLab();
    // ?trainerlab=1 (the Trainer Editor's "Play with these trainers"): use its
    // saved trainer edits in memory. Without the param this module is never loaded.
    if (new URLSearchParams(location.search).has("trainerlab")) await (await import("./trainereditor/hook")).applyStoredTrainerEdits();
    await loading.finish();
    scenes.pop();

    const params = new URLSearchParams(location.search);
    const dev = params.get("dev");
    const loader = dev ? devModules[`./${dev}/dev.ts`] : undefined;
    if (dev && !loader) console.warn(`[dev] no dev scene at src/${dev}/dev.ts`);
    if (loader) {
      const mod = await loader();
      phase = "other";
      scenes.push(await mod.default(game));
    } else {
      const { createTitleScene } = await import("./ui/title");
      titleScene = createTitleScene(game);
      phase = "title";
      scenes.push(titleScene);
    }
    booted = true;

    // Dev and e2e builds only: ?e2e=<suite> runs the automated playthrough
    // (e2e/playthrough.ts) or, for ?e2e=smoke:<phase>, the smoke suite
    // (e2e/smoke.ts); both are started by e2e/run.mjs (docs/DEVDOCS.md § testing).
    if (TEST_HOOKS && params.get("e2e")) {
      const suite = params.get("e2e")!;
      const e2e = suite.startsWith("smoke:") ? await import("../e2e/smoke") : await import("../e2e/playthrough");
      (window as unknown as { __e2e: unknown }).__e2e = e2e;
      void e2e.autorun(suite);
    }
  } catch (err) {
    errors.fatal(err);
  }
}

void boot();
