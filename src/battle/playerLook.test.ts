import { describe, expect, it, vi } from "vitest";
import type { GameContext, PlayerLook, TrainerPortraitKey } from "../contracts";
import { DATA } from "../data";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { drawTrainer } from "./hud";
import { createQuickened } from "./logic/stats";
import { seeded } from "./logic/rng";
import { createBattleScene } from "./scene";

function battleFor(look: PlayerLook | undefined) {
  vi.stubGlobal("window", {});
  const state = { ...newGameState({ world: WORLD }), party: [createQuickened(DATA, "oak_acorn", 5, seeded(1))] };
  if (look) state.playerLook = look;
  else delete state.playerLook;
  const ctx = {
    data: DATA, rng: seeded(1), input: {}, timeOfDay: () => "day", world: { maps: {}, trainers: {} }, state,
    audio: { playSfx() {}, playMusic() {}, playCry() {}, async playJingle() {} },
  } as unknown as GameContext;
  const scene = createBattleScene(ctx, { kind: "wild", wild: { species: "oak_acorn", level: 3 } }, () => {});
  return (scene as unknown as { playerTrainer: { key: TrainerPortraitKey } }).playerTrainer.key;
}

/** The size drawTrainer draws a portrait at (backs are 48, trainer fronts 56). */
function drawnSize(key: TrainerPortraitKey) {
  const img = { width: 48, height: 48 };
  const ctx = { assets: { image: () => img } } as unknown as GameContext;
  const drawImage = vi.fn();
  const g = new Proxy({ drawImage }, { get: (t, k) => (k in t ? t[k as "drawImage"] : () => {}), set: () => true });
  drawTrainer(ctx, g as unknown as CanvasRenderingContext2D, key, 0, 0);
  return drawImage.mock.calls[0].slice(-2);
}

describe("the player's battle back follows the chosen look", () => {
  it("uses the boy's back for the boy and for saves from before the choice", () => {
    expect(battleFor("boy")).toBe("player_back");
    expect(battleFor(undefined)).toBe("player_back");
  });

  it("uses the girl's back for the girl", () => {
    expect(battleFor("girl")).toBe("player_girl_back");
  });

  it("draws both backs at 48x48, unlike a 56x56 trainer front", () => {
    expect(drawnSize("player_back")).toEqual([48, 48]);
    expect(drawnSize("player_girl_back")).toEqual([48, 48]);
    expect(drawnSize("bram")).toEqual([56, 56]);
  });
});
