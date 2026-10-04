// Boot: assemble the GameContext from each module's entry point, then start
// the title screen (or a dev scene with ?dev=<module>).

import type { GameContext, GameState, Scene } from "./contracts";
import { createAssets, createCanvas, createInput, createSceneStack, runLoop } from "./engine/core";
import { createGameContext } from "./engine/context";
import { ASSET_PATHS } from "./assets/manifest";

const devModules = import.meta.glob<{ default: (ctx: GameContext) => Scene | Promise<Scene> }>("./*/dev.ts");

async function boot() {
  const { g } = createCanvas();
  let ctx: GameContext | undefined;
  const input = createInput(() => ctx?.audio.unlock());
  const scenes = createSceneStack();
  const assets = createAssets();
  ctx = createGameContext({ input, scenes, assets });

  runLoop(g, scenes, input, (dt) => { (ctx!.state as GameState).playTimeMs += dt; });

  await assets.loadAll(ASSET_PATHS);

  const dev = new URLSearchParams(location.search).get("dev");
  const loader = dev ? devModules[`./${dev}/dev.ts`] : undefined;
  if (loader) {
    const mod = await loader();
    scenes.push(await mod.default(ctx));
  } else {
    const { createTitleScene } = await import("./ui/title");
    scenes.push(createTitleScene(ctx));
  }
}

boot();
