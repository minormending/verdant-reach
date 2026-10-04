// Minimal engine core: canvas + integer scaling, fixed-timestep loop, input,
// scene stack, asset store. Owned by the engine agent from here on; the
// interfaces it implements live in src/contracts/runtime.ts.

import { FPS, SCREEN_H, SCREEN_W } from "../contracts";
import type { Assets, Button, Input, Scene, SceneStack } from "../contracts";

export function createCanvas(): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const g = canvas.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const fit = () => {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth / SCREEN_W, innerHeight / SCREEN_H)));
    canvas.style.width = `${SCREEN_W * scale}px`;
    canvas.style.height = `${SCREEN_H * scale}px`;
  };
  addEventListener("resize", fit);
  fit();
  return { canvas, g };
}

const KEYMAP: Record<string, Button> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  KeyZ: "a", Space: "a", KeyJ: "a",
  KeyX: "b", Backspace: "b", Escape: "b", KeyK: "b",
  Enter: "start", ShiftLeft: "select", ShiftRight: "select",
};

export function createInput(onFirstInput: () => void): Input & { endFrame(): void } {
  const held = new Set<Button>();
  const down = new Set<Button>();
  const holdFrames = new Map<Button, number>();
  let unlocked = false;
  addEventListener("keydown", (e) => {
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (!unlocked) { unlocked = true; onFirstInput(); }
    if (!held.has(b)) down.add(b);
    held.add(b);
  });
  addEventListener("keyup", (e) => {
    const b = KEYMAP[e.code];
    if (b) { held.delete(b); holdFrames.delete(b); }
  });
  addEventListener("blur", () => { held.clear(); holdFrames.clear(); });
  return {
    pressed: (b) => down.has(b),
    held: (b) => held.has(b),
    repeat: (b) => {
      if (down.has(b)) return true;
      const n = holdFrames.get(b) ?? 0;
      return held.has(b) && n > 18 && n % 6 === 0;
    },
    endFrame() {
      down.clear();
      for (const b of held) holdFrames.set(b, (holdFrames.get(b) ?? 0) + 1);
    },
  };
}

export function createSceneStack(): SceneStack & { all(): Scene[] } {
  const stack: Scene[] = [];
  const api: SceneStack & { all(): Scene[] } = {
    push(s) { stack.push(s); s.enter?.(); },
    pop() { const s = stack.pop(); s?.exit?.(); return s; },
    replace(s) { api.pop(); api.push(s); },
    top: () => stack[stack.length - 1],
    run<T>(factory: (done: (r: T) => void) => Scene) {
      return new Promise<T>((resolve) => {
        let scene: Scene;
        scene = factory((r) => {
          const i = stack.lastIndexOf(scene);
          if (i >= 0) { stack.splice(i, 1); scene.exit?.(); }
          resolve(r);
        });
        api.push(scene);
      });
    },
    all: () => stack,
  };
  return api;
}

export function createAssets(): Assets {
  const images = new Map<string, HTMLImageElement>();
  const missing = new Set<string>();
  const loadOne = (path: string) =>
    new Promise<void>((resolve) => {
      if (images.has(path) || missing.has(path)) return resolve();
      const img = new Image();
      img.onload = () => { images.set(path, img); resolve(); };
      img.onerror = () => { missing.add(path); resolve(); };
      img.src = path;
    });
  return {
    image: (p) => images.get(p),
    has: (p) => images.has(p),
    async loadAll(paths, onProgress) {
      let done = 0;
      await Promise.all(paths.map((p) => loadOne(p).then(() => onProgress?.(++done, paths.length))));
    },
  };
}

/** Fixed-timestep loop. Draws the stack bottom-up from the last opaque scene. */
export function runLoop(
  g: CanvasRenderingContext2D,
  scenes: ReturnType<typeof createSceneStack>,
  input: ReturnType<typeof createInput>,
  onTick: (dtMs: number) => void,
) {
  const step = 1000 / FPS;
  let acc = 0;
  let last = performance.now();
  const frame = (now: number) => {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= step) {
      scenes.top()?.update(step);
      input.endFrame();
      onTick(step);
      acc -= step;
    }
    const all = scenes.all();
    let from = all.length - 1;
    while (from > 0 && all[from].transparent) from--;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    for (let i = Math.max(0, from); i < all.length; i++) all[i].draw(g);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
