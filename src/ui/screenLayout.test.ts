import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtImage, GameContext } from "../contracts";
import { SCREEN_H, SCREEN_W, uiPath } from "../contracts";
import { createSceneStack } from "../engine/core";
import { drawBitmapText } from "./font";
import { createTitleScene } from "./title";
import { toBeContinued } from "./tbc";
import { BattleTransition } from "../overworld/render";

vi.mock("./font", async (original) => ({ ...await original<typeof import("./font")>(), drawBitmapText: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function setup() {
  const g = { fillRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => g }) });
  const art = { width: 160, height: 144 } as ArtImage;
  const scenes = createSceneStack();
  let pressed = "";
  const ctx = {
    assets: { image: (p: string) => p === uiPath("title") ? art : undefined }, scenes,
    input: { pressed: (button: string) => button === pressed, repeat: () => false },
    save: { meta: () => null }, audio: { playMusic() {}, playSfx() {} },
    state: { herbarium: { caught: [] }, marks: [], playTimeMs: 0 },
  } as unknown as GameContext;
  return { g, art, scenes, ctx, press: (button: string) => { pressed = button; } };
}

describe("widescreen scenes", () => {
  it("centres legacy title art, the press prompt and the main menu", () => {
    const { g, ctx, art, press } = setup();
    const title = createTitleScene(ctx);
    title.draw(g);
    expect(g.drawImage).toHaveBeenCalledWith(art, (SCREEN_W - art.width) / 2, (SCREEN_H - art.height) / 2);
    expect(drawBitmapText).toHaveBeenCalledWith(g, "PRESS START", (SCREEN_W - 11 * 8) / 2, SCREEN_H - 24, expect.any(String), 1);
    // Skip the fade, then open the menu with a second edge.
    press("start"); title.update(0); title.update(0);
    press(""); for (let i = 0; i < 8; i++) title.update(0);
    vi.mocked(g.fillRect).mockClear();
    title.draw(g);
    const menuFrame = vi.mocked(g.fillRect).mock.calls.find(([, , w, h]) => w === 88 && h === 40);
    expect(menuFrame).toEqual([(SCREEN_W - 88) / 2, SCREEN_H - 40 - 8, 88, 40]);
  });

  it("fills the ending card all the way to the bottom and centres its text", () => {
    const { g, ctx, scenes } = setup();
    void toBeContinued(ctx);
    const scene = scenes.top()!;
    for (let i = 0; i < 260; i++) scene.update(0);
    scene.draw(g);
    expect(g.fillRect).toHaveBeenCalledWith(0, SCREEN_H - SCREEN_H / 6, SCREEN_W, SCREEN_H / 6);
    expect(drawBitmapText).toHaveBeenCalledWith(g, "THANKS FOR PLAYING!", (SCREEN_W - 18 * 8) / 2, SCREEN_H - 16, expect.any(String));
  });

  it.each(["wild", "trainer"] as const)("covers the partial final block row in a %s transition", (kind) => {
    const { g } = setup();
    const transition = new BattleTransition();
    void transition.run(kind);
    transition.t = transition.total - 4;
    transition.draw(g);
    const blocks = vi.mocked(g.fillRect).mock.calls.filter(([, , w, h]) => w === 8 && h === 8);
    expect(blocks).toHaveLength(Math.ceil(SCREEN_W / 8) * Math.ceil(SCREEN_H / 8));
    expect(blocks).toContainEqual([SCREEN_W - 8, Math.floor((SCREEN_H - 1) / 8) * 8, 8, 8]);
  });
});
