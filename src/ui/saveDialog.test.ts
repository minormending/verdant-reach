import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameContext, WorldData } from "../contracts";
import { createSceneStack } from "../engine/core";
import { createSave, newGameState, SAVE_KEY, type StorageLike } from "../save";
import { wrapText } from "../world/validate";
import { SAVE_FAILED, saveDialog } from "./widgets";

const world = {
  maps: { player_home: { healPoint: { x: 3, y: 5 } } },
  newGame: { map: "herbarium_roof", x: 4, y: 6, facing: "up", script: "prologue" },
} as unknown as WorldData;

function setup(storage: StorageLike | null) {
  const state = newGameState({ world });
  const said: string[] = [];
  const ctx = {
    state, scenes: createSceneStack(),
    save: createSave(() => state, storage),
    audio: { playSfx: vi.fn() },
    ui: { yesNo: vi.fn(async () => true), say: vi.fn(async (text: string) => { said.push(text); }) },
  } as unknown as GameContext;
  return { ctx, said };
}

function memory(): StorageLike & { m: Map<string, string> } {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

afterEach(() => vi.restoreAllMocks());

describe("the SAVE dialog", () => {
  it("says the game was saved only when it was", async () => {
    const storage = memory();
    const { ctx, said } = setup(storage);
    await expect(saveDialog(ctx)).resolves.toBe(true);
    expect(storage.m.has(SAVE_KEY)).toBe(true);
    expect(said[said.length - 1]).toBe("{PLAYER} saved the game.");
    expect(ctx.audio.playSfx).toHaveBeenCalledWith("save");
    expect(ctx.scenes.top()).toBeUndefined();
  });

  it.each([
    ["no storage (private mode, blocked site data)", null],
    ["a full quota", { ...memory(), setItem: () => { throw new DOMException("full", "QuotaExceededError"); } }],
    ["a write that doesn't stick", { ...memory(), setItem: () => {} }],
  ] as const)("is honest about %s", async (_why, storage) => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, said } = setup(storage);
    await expect(saveDialog(ctx)).resolves.toBe(false);
    expect(said).not.toContain("{PLAYER} saved the game.");
    expect(said[said.length - 1]).toBe(SAVE_FAILED);
    expect(ctx.audio.playSfx).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalled();
    expect(ctx.scenes.top()).toBeUndefined();
  });

  it("words the failure for the 18x2 text box", () => {
    const lines = wrapText(SAVE_FAILED);
    expect(lines.every((l) => l.length <= 18)).toBe(true);
    expect(Math.ceil(lines.length / 2)).toBeLessThanOrEqual(2);
  });
});
