import { describe, expect, it, vi } from "vitest";
import type { Button, GameContext, Scene } from "../contracts";
import { SCREEN_H, SCREEN_W } from "../contracts";
import { createSceneStack } from "../engine/core";
import { measureText } from "./font";
import { CREDITS_DURATION_TICKS, CREDITS_TICKS_PER_PIXEL, rollCredits } from "./credits";

function setup() {
  let pressed: Button | null = null;
  const scenes = createSceneStack();
  const below: Scene = { update() {}, draw() {} };
  scenes.push(below);
  const drawText = vi.fn();
  const ctx = {
    scenes, input: { pressed: (b: Button) => b === pressed },
    ui: { drawText, measure: measureText },
  } as unknown as GameContext;
  const promise = rollCredits(ctx);
  const scene = scenes.top()!;
  const g = { fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) scene.update(1000 / 60); };
  return { ctx, scenes, scene, below, promise, g, tick, drawText, press: (b: Button) => { pressed = b; } };
}

describe("credits", () => {
  it("scrolls at one pixel every three fixed ticks and fills the 160x144 screen", () => {
    const { scene, g, tick, drawText, press } = setup();
    scene.draw(g);
    expect(g.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_W, SCREEN_H);
    expect(drawText).not.toHaveBeenCalled();
    tick(CREDITS_TICKS_PER_PIXEL);
    scene.draw(g);
    expect(drawText).toHaveBeenLastCalledWith(g, "VERDANT REACH", 28, 143, expect.any(String));
    drawText.mockClear();
    tick(CREDITS_TICKS_PER_PIXEL - 1);
    scene.draw(g);
    expect(drawText.mock.calls[0][3]).toBe(143);
    drawText.mockClear();
    tick();
    scene.draw(g);
    expect(drawText.mock.calls[0][3]).toBe(142);
    press("b"); tick();
  });

  it("shows the entire cast within the screen width, then returns after the last glyph exits", async () => {
    const { scenes, scene, below, g, tick, drawText, promise } = setup();
    const shown = new Set<string>();
    for (let i = 0; i < CREDITS_DURATION_TICKS - 1; i++) {
      tick(); scene.draw(g);
      for (const [, text, x, y] of drawText.mock.calls) {
        shown.add(text);
        expect(x).toBeGreaterThanOrEqual(8);
        expect(x + measureText(text)).toBeLessThanOrEqual(SCREEN_W - 8);
        expect(y).toBeGreaterThan(-8);
        expect(y).toBeLessThan(SCREEN_H);
      }
      drawText.mockClear();
    }
    expect(shown).toEqual(new Set([
      "VERDANT REACH", "BELLADONNA", "MIMI OSA", "TITUS ARUM", "PYRA", "ROWAN VALE",
      "DR. VALE", "THANK YOU FOR", "PLAYING",
    ]));
    expect(scenes.top()).toBe(scene);
    tick();
    await promise;
    expect(scenes.top()).toBe(below);
  });

  it("skips immediately with B and resumes the scene below", async () => {
    const { scenes, below, tick, press, promise } = setup();
    press("b"); tick();
    await promise;
    expect(scenes.all()).toEqual([below]);
  });

  it("ignores A and START", () => {
    const { scenes, scene, tick, press } = setup();
    press("a"); tick();
    press("start"); tick();
    expect(scenes.top()).toBe(scene);
    press("b"); tick();
  });
});
