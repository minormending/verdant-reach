// Pause on focus loss. When the window blurs or the tab hides, a transparent
// PAUSED scene goes on top of the stack: nothing below it updates (the loop
// only updates the top scene), the audio is suspended, and play time stops.
// Any button (or a tap on the screen) resumes.

import type { Input, Scene, SceneStack } from "../contracts";
import { SCREEN_H, SCREEN_W, UI } from "../contracts";
import { drawText, drawWindow } from "../ui/kit";

const BUTTONS = ["a", "b", "start", "select", "up", "down", "left", "right"] as const;

export interface PauseController {
  readonly paused: boolean;
  pause(): void;
  resume(): void;
}

export function createPause(opts: {
  scenes: SceneStack;
  input: Input;
  onChange?: (paused: boolean) => void;
  /** False while booting or showing the error screen. */
  allowed?: () => boolean;
}): PauseController {
  let scene: Scene | null = null;
  let frame = 0;
  // The press that resumes must not also act in the game; wait for release.
  let armed = false;

  const make = (): Scene => ({
    transparent: true,
    update() {
      frame++;
      const any = BUTTONS.some((b) => opts.input.held(b));
      if (!armed) { if (!any && frame > 6) armed = true; return; }
      if (BUTTONS.some((b) => opts.input.pressed(b))) api.resume();
    },
    draw(g) {
      // 50% checker dither of the shadow colour: the GBC way to dim.
      g.fillStyle = "rgba(12,18,14,0.55)";
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      g.fillStyle = UI.black;
      for (let y = 0; y < SCREEN_H; y++) {
        for (let x = y & 1; x < SCREEN_W; x += 2) g.fillRect(x, y, 1, 1);
      }
      const w = 96;
      const h = 40;
      const x = (SCREEN_W - w) / 2;
      const y = 44;
      drawWindow(g, x, y, w, h);
      drawText(g, "PAUSED", x + (w - 48) / 2, y + 10, UI.black);
      if (Math.floor(frame / 30) % 2 === 0) drawText(g, "▶", x + 10, y + 24, UI.dark);
      drawText(g, "PRESS A", x + 22, y + 24, UI.dark);
    },
  });

  const api = {
    get paused() { return scene !== null; },
    pause() {
      if (scene || (opts.allowed && !opts.allowed())) return;
      frame = 0;
      armed = false;
      scene = make();
      opts.scenes.push(scene);
      opts.onChange?.(true);
    },
    resume() {
      if (!scene) return;
      const s = scene;
      scene = null;
      // Remove our scene wherever it is (something may have pushed above it).
      const all = (opts.scenes as SceneStack & { all?: () => Scene[] }).all?.();
      if (all) {
        const i = all.lastIndexOf(s);
        if (i >= 0) { all.splice(i, 1); s.exit?.(); }
      } else if (opts.scenes.top() === s) {
        opts.scenes.pop();
      }
      opts.onChange?.(false);
    },
  };
  return api;
}

/** Wire window focus / visibility to a pause controller. */
export function pauseOnFocusLoss(p: PauseController, target: HTMLElement) {
  addEventListener("blur", () => p.pause());
  document.addEventListener("visibilitychange", () => { if (document.hidden) p.pause(); });
  // A tap or click on the screen resumes too.
  target.addEventListener("pointerdown", () => { if (p.paused) p.resume(); });
}
