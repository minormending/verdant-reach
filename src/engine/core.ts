// Minimal engine core: canvas + integer scaling, fixed-timestep loop, input,
// scene stack, asset store. Owned by the engine agent from here on; the
// interfaces it implements live in src/contracts/runtime.ts.

import { FPS, SCREEN_H, SCREEN_W } from "../contracts";
import type { Assets, Button, Input, Scene, SceneStack } from "../contracts";
import { createArtAssets } from "../art";
import { readGamepads } from "./gamepad";
import { testHooks } from "./testHooks";
import { advanceGameClock, setLoopSpeed } from "./speed";

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

/** Keyboard codes to buttons (also read by the guidebook's controls table). */
export const KEYMAP: Record<string, Button> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  KeyZ: "a", Space: "a", KeyJ: "a",
  KeyX: "b", Backspace: "b", Escape: "b", KeyK: "b",
  Enter: "start", ShiftLeft: "select", ShiftRight: "select",
};

/**
 * Keyboard (and the touch controls, which synthesise key events) plus any
 * game controllers (src/engine/gamepad.ts). `poll` reads the controllers at
 * the start of each step; `endFrame` consumes the step's press edges.
 *
 * `setRepeatScale(n)` stretches `repeat`'s counts by n (runLoop passes GAME
 * SPEED), so menu auto-repeat keeps the same real-time pace at x2-x4.
 *
 * `onPress` runs on every new mapped key or controller press (not on key
 * auto-repeat): main.ts passes the audio unlock. Not every key counts as a
 * user gesture (Chrome ignores Escape, which is B), so the unlock must be
 * retried until audio is actually running; `unlock()` returns at once then.
 */
export function createInput(
  onPress: () => void,
  readPads: () => Set<Button> = readGamepads,
): Input & { endFrame(): void; poll(): void; setRepeatScale(n: number): void } {
  const keys = new Set<Button>();
  let repeatScale = 1;
  let pad = new Set<Button>();
  const down = new Set<Button>();
  const holdFrames = new Map<Button, number>();
  const isHeld = (b: Button) => keys.has(b) || pad.has(b);
  addEventListener("keydown", (e) => {
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (!e.repeat) onPress();
    if (!isHeld(b)) down.add(b);
    keys.add(b);
  });
  addEventListener("keyup", (e) => {
    const b = KEYMAP[e.code];
    if (!b) return;
    keys.delete(b);
    if (!isHeld(b)) holdFrames.delete(b);
  });
  addEventListener("blur", () => { keys.clear(); holdFrames.clear(); });
  return {
    pressed: (b) => down.has(b),
    held: isHeld,
    repeat: (b) => {
      if (down.has(b)) return true;
      const n = holdFrames.get(b) ?? 0;
      return isHeld(b) && n > 18 * repeatScale && n % (6 * repeatScale) === 0;
    },
    setRepeatScale(n) { repeatScale = Number.isInteger(n) && n >= 1 ? n : 1; },
    poll() {
      const now = readPads();
      let pressedAny = false;
      for (const b of now) if (!isHeld(b)) { down.add(b); pressedAny = true; }
      const before = pad;
      pad = now;
      for (const b of before) if (!isHeld(b)) holdFrames.delete(b);
      // Browsers don't count a controller press as a user gesture, so audio may
      // stay locked until a key or tap; asking again on each press is harmless.
      if (pressedAny) onPress();
    },
    endFrame() {
      down.clear();
      for (const b of new Set([...keys, ...pad])) holdFrames.set(b, (holdFrames.get(b) ?? 0) + 1);
    },
  };
}

export function createSceneStack(): SceneStack & { all(): Scene[]; clear(): void } {
  const stack: Scene[] = [];
  const api: SceneStack & { all(): Scene[]; clear(): void } = {
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
    clear() { while (stack.length) api.pop(); },
  };
  return api;
}

export interface EngineAssets extends Assets {
  /** True once a load for this path has failed (the file does not exist). */
  isMissing(path: string): boolean;
}

/**
 * The asset store is the art registry (src/art/, docs/ART.md): logical paths
 * resolve to swappable bundles under public/art/ (with art packs, sheet cells
 * and exact sport palettes), falling back to legacy public/assets/ files.
 * `image()` lazy-loads anything not yet loaded; `loadAll()` with no paths
 * preloads the whole registry.
 */
export function createAssets(): EngineAssets {
  return createArtAssets();
}

/**
 * The dev/e2e `?speed=N` (1-16), or null. Test hooks only: the public build
 * ignores it and uses GAME SPEED from the options instead.
 */
export function devSpeed(): number | null {
  if (!testHooks() || typeof location === "undefined") return null;
  const v = new URLSearchParams(location.search).get("speed");
  return v && /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 16 ? Number(v) : null;
}

/** How the loop runs this frame: `steps` updates per step of time, or a `fixed` batch per frame. */
export interface LoopSpeed { steps: number; fixed: boolean }

/**
 * The loop's timing, separate from the browser so it can be tested. Each call
 * is one displayed frame with `elapsed` real ms; it runs the updates due and
 * returns how many ran.
 * - Normal: an accumulator of real time; each whole step due runs `steps`
 *   updates (GAME SPEED), so the speed is the same on any refresh rate.
 *   At x1 this is exactly the plain fixed-step loop.
 * - `fixed` (dev/e2e `?speed=N` above 1): exactly `steps` updates per frame,
 *   ignoring the clock.
 */
export function createStepper(step: number, update: () => void, speed: () => LoopSpeed) {
  let acc = 0;
  return (elapsed: number): number => {
    acc += Math.min(250, elapsed);
    const { steps, fixed } = speed();
    let ran = 0;
    if (fixed) {
      for (; ran < steps; ran++) update();
      acc = 0;
      return ran;
    }
    while (acc >= step) {
      for (let i = 0; i < steps; i++, ran++) update();
      acc -= step;
    }
    return ran;
  };
}

/**
 * Fixed-timestep loop. Draws the stack bottom-up from the last opaque scene.
 * `gameSpeed` is read every frame (GAME SPEED, 1-4), so a change in OPTIONS
 * applies at once; the dev/e2e `?speed=N` takes precedence when present.
 * `onTick` receives real milliseconds (a step divided by the speed), so play
 * time counts the wall clock at any speed.
 */
export function runLoop(
  g: CanvasRenderingContext2D,
  scenes: ReturnType<typeof createSceneStack>,
  input: ReturnType<typeof createInput>,
  onTick: (dtMs: number) => void,
  gameSpeed: () => number = () => 1,
) {
  const step = 1000 / FPS;
  // `?timer` drives the loop with setTimeout (for embedded/hidden test panes
  // where requestAnimationFrame is throttled).
  const useTimer = typeof location !== "undefined" && new URLSearchParams(location.search).has("timer");
  const dev = devSpeed();
  const schedule = (f: (now: number) => void) =>
    useTimer ? setTimeout(() => f(performance.now()), 1000 / FPS) : requestAnimationFrame(f);
  let current: LoopSpeed = { steps: 1, fixed: false };
  const speed = (): LoopSpeed => {
    const n = dev ?? Math.max(1, Math.min(4, Math.floor(gameSpeed()) || 1));
    current = { steps: n, fixed: dev !== null && dev > 1 };
    setLoopSpeed(n);
    // Menu auto-repeat keeps its real-time feel under GAME SPEED; ?speed keeps the old counts.
    input.setRepeatScale?.(dev === null ? n : 1);
    return current;
  };
  // Input edges are consumed after each step, so a press is seen by exactly one update.
  const update = () => {
    input.poll();
    scenes.top()?.update(step);
    input.endFrame();
    advanceGameClock(step);
    onTick(step / current.steps);
  };
  const advance = createStepper(step, update, speed);
  let last = performance.now();
  const frame = (now: number) => {
    advance(now - last);
    last = now;
    const all = scenes.all();
    let from = all.length - 1;
    while (from > 0 && all[from].transparent) from--;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    for (let i = Math.max(0, from); i < all.length; i++) all[i].draw(g);
    schedule(frame);
  };
  schedule(frame);
}

/** Pop every scene (works on any SceneStack). */
export function clearScenes(scenes: SceneStack): void {
  while (scenes.top()) scenes.pop();
}
