// Boot: assemble the GameContext from each module's entry point, then start
// the title screen (or a dev scene with ?dev=<module>).

import type { GameContext, Scene } from "./contracts";
import { SCREEN_W, UI } from "./contracts";
import { createAssets, createCanvas, createInput, createSceneStack, runLoop } from "./engine/core";
import { createGameContext, playClock } from "./engine/context";
import { ASSET_PATHS } from "./assets/manifest";
import { drawText } from "./ui/kit";

const devModules = import.meta.glob<{ default: (ctx: GameContext) => Scene | Promise<Scene> }>("./*/dev.ts");

async function boot() {
  const { g } = createCanvas();
  let ctx: GameContext | undefined;
  const input = createInput(() => ctx?.audio.unlock());
  const scenes = createSceneStack();
  const assets = createAssets();
  ctx = createGameContext({ input, scenes, assets });
  if (import.meta.env.DEV) {
    (window as unknown as { __vr: unknown }).__vr = { ctx, scenes };
    void import("./overworld/devDriver").then((m) => m.installDevDriver(scenes));
  }

  // Loading bar while the art preloads.
  let loaded = 0;
  let total = ASSET_PATHS.length;
  const loading: Scene = {
    update() {},
    draw(gg) {
      gg.fillStyle = "#000";
      gg.fillRect(0, 0, SCREEN_W, 144);
      if (total > 0) {
        drawText(gg, "LOADING", 52, 60, UI.light);
        gg.fillStyle = UI.dark;
        gg.fillRect(40, 74, 80, 4);
        gg.fillStyle = UI.light;
        gg.fillRect(40, 74, Math.round((80 * loaded) / total), 4);
      }
    },
  };
  scenes.push(loading);

  runLoop(g, scenes, input, (dt) => {
    if (playClock.running && ctx) ctx.state.playTimeMs += dt;
  });

  await assets.loadAll(ASSET_PATHS, (d, t) => { loaded = d; total = t; });
  scenes.pop();

  const dev = new URLSearchParams(location.search).get("dev");
  const loader = dev ? devModules[`./${dev}/dev.ts`] : undefined;
  if (dev && !loader) console.warn(`[dev] no dev scene at src/${dev}/dev.ts`);
  if (loader) {
    const mod = await loader();
    scenes.push(await mod.default(ctx));
  } else {
    const { createTitleScene } = await import("./ui/title");
    scenes.push(createTitleScene(ctx));
  }
}

boot();
