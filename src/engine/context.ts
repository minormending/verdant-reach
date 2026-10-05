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

/** Play time only accrues while the overworld (or something above it) is running. */
export const playClock = { running: false };

/** Real-clock time of day; `?time=morning|day|night` overrides it for testing. */
export function timeOfDayFor(hour: number): TimeOfDay {
  if (hour >= TIME_OF_DAY.morningStart && hour < TIME_OF_DAY.dayStart) return "morning";
  if (hour >= TIME_OF_DAY.dayStart && hour < TIME_OF_DAY.nightStart) return "day";
  return "night";
}

function timeOverride(): TimeOfDay | null {
  try {
    const t = new URLSearchParams(location.search).get("time");
    return t === "morning" || t === "day" || t === "night" ? t : null;
  } catch {
    return null;
  }
}

export function createGameContext(deps: { input: Input; scenes: SceneStack; assets: Assets }): GameContext {
  const override = timeOverride();
  const ctx = {
    ...deps,
    state: undefined as unknown as GameState,
    data: DATA,
    world: WORLD,
    audio: createAudio(),
    rng: Math.random,
    timeOfDay: (): TimeOfDay => override ?? timeOfDayFor(new Date().getHours()),
    battle: (req) => deps.scenes.run((done) => createBattleScene(ctx, req, done)),
  } as GameContext;
  ctx.ui = createUiKit(ctx);
  ctx.screens = createScreens(ctx);
  ctx.save = createSave(() => ctx.state, undefined, () => newGameState(ctx));
  ctx.state = newGameState(ctx);
  return ctx;
}
