// PLACEHOLDER - replaced by the engine agent.
import type { GameContext, GameState } from "../contracts";

export function newGameState(ctx: GameContext): GameState {
  const s = ctx.world.newGame;
  return {
    version: 1, playerName: "ROSE", rivalName: "BRAM", money: 3000, party: [], box: [], bag: {},
    flags: {}, marks: [], herbarium: { seen: [], caught: [] },
    position: { map: s.map, x: s.x, y: s.y, facing: s.facing },
    heal: { map: s.map, x: s.x, y: s.y }, playTimeMs: 0, options: { textSpeed: "mid" },
  };
}

export function createSave(): GameContext["save"] {
  const KEY = "verdant-reach-save";
  return {
    write() {},
    read: () => null,
    exists: () => localStorage.getItem(KEY) !== null,
    clear: () => localStorage.removeItem(KEY),
  };
}
