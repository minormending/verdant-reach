import { describe, expect, it, vi } from "vitest";
import type { Button, GameContext, GameState } from "../contracts";
import { createSceneStack } from "../engine/core";
import { gameSpeedOf } from "../save";
import { OPTION_HELP, optionsScreen } from "./options";

// The paper texture needs a DOM canvas; the rest of the screen draws as usual.
vi.mock("./kit/draw", async (original) => ({ ...(await original<typeof import("./kit/draw")>()), drawPaper: () => {} }));

/** The real options scene with stub audio and canvas text; one button per update. */
function harness(options: GameState["options"] = { textSpeed: "mid" }) {
  const scenes = createSceneStack();
  let button: Button | undefined;
  const drawn: string[] = [];
  const ctx = {
    scenes,
    state: { options },
    input: {
      pressed: (b: Button) => b === button,
      repeat: (b: Button) => b === button,
      held: (b: Button) => b === button,
    },
    assets: { exists: () => false, has: () => false, image: () => undefined, isMissing: () => false },
    audio: { playSfx: vi.fn(), setVolume: vi.fn() },
    ui: {
      drawText: (_g: unknown, t: string) => { drawn.push(t); },
      drawWindow: vi.fn(),
      measure: (t: string) => Array.from(t).length * 8,
    },
  } as unknown as GameContext;
  const g = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  const press = async (b?: Button) => {
    button = b;
    scenes.top()?.update(1000 / 60);
    button = undefined;
    for (let i = 0; i < 8; i++) await Promise.resolve();
  };
  const draw = () => { drawn.length = 0; for (const s of scenes.all()) s.draw(g); return [...drawn]; };
  return { ctx, scenes, press, draw };
}

describe("options: GAME SPEED", () => {
  it("cycles x1 to x4, one notch per press, clamped at both ends", async () => {
    const h = harness();
    const done = optionsScreen(h.ctx);
    for (let i = 0; i < 20; i++) await h.press(); // the screen fades in
    await h.press("down"); // TEXT SPEED -> GAME SPEED
    expect(h.draw()).toContain("◀▶ game speed");
    const o = h.ctx.state.options;
    expect(gameSpeedOf(o)).toBe(1);
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) { await h.press("right"); seen.push(gameSpeedOf(o)); }
    expect(seen).toEqual([2, 3, 4, 4, 4]);
    expect(o.gameSpeed).toBe(4);
    await h.press("left");
    expect(o.gameSpeed).toBe(3);
    for (let i = 0; i < 4; i++) await h.press("left");
    expect(o.gameSpeed).toBe(1);
    // TEXT SPEED is untouched.
    expect(o.textSpeed).toBe("mid");
    await h.press("b");
    await done;
  });

  it("draws the GAME SPEED row with its four choices", async () => {
    const h = harness({ textSpeed: "fast", gameSpeed: 2 });
    void optionsScreen(h.ctx);
    for (let i = 0; i < 20; i++) await h.press();
    const text = h.draw();
    expect(text).toContain("GAME SPEED");
    for (const label of ["×1", "×2", "×3", "×4", "TEXT SPEED", "MUSIC", "SOUND", "FOLLOWER", "MOVE ANIMS", "DONE"]) {
      expect(text).toContain(label);
    }
  });

  it("keeps every help line within the 18-column window", () => {
    expect(OPTION_HELP).toHaveLength(7);
    for (const line of OPTION_HELP) expect(Array.from(line).length).toBeLessThanOrEqual(18);
  });
});
