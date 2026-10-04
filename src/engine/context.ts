// Wires every module's entry point into one GameContext. Engine agent owns
// this file; other modules are reached only through their index.ts exports.

import type { Assets, GameContext, GameState, Input, SceneStack, TimeOfDay } from "../contracts";
import { TIME_OF_DAY } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { createAudio } from "../audio";
import { createBattleScene } from "../battle";
import { createScreens } from "../screens";
import { createUiKit } from "../ui/kit";
import { createSave, newGameState } from "../save";

export function createGameContext(deps: { input: Input; scenes: SceneStack; assets: Assets }): GameContext {
  const ctx = {
    ...deps,
    state: undefined as unknown as GameState,
    data: DATA,
    world: WORLD,
    audio: createAudio(),
    rng: Math.random,
    timeOfDay(): TimeOfDay {
      const h = new Date().getHours();
      if (h >= TIME_OF_DAY.morningStart && h < TIME_OF_DAY.dayStart) return "morning";
      if (h >= TIME_OF_DAY.dayStart && h < TIME_OF_DAY.nightStart) return "day";
      return "night";
    },
    battle: (req) => deps.scenes.run((done) => createBattleScene(ctx, req, done)),
  } as GameContext;
  ctx.ui = createUiKit(ctx);
  ctx.screens = createScreens(ctx);
  ctx.save = createSave();
  ctx.state = newGameState(ctx);
  return ctx;
}
