import { afterEach, describe, expect, it, vi } from "vitest";
import type { Scene } from "../contracts";
import { createInput, createSceneStack, createStepper, runLoop } from "./core";
import { gameClockMs, loopSpeed, scaledMs, setLoopSpeed } from "./speed";

const STEP = 1000 / 60;

/** Window key events for createInput, without a DOM. */
function keyboard() {
  const on = new Map<string, (e: unknown) => void>();
  vi.stubGlobal("addEventListener", (type: string, f: (e: unknown) => void) => on.set(type, f));
  const send = (type: string, code: string) => on.get(type)?.({ code, repeat: false, preventDefault() {} });
  return { down: (code: string) => send("keydown", code), up: (code: string) => send("keyup", code) };
}

/** runLoop driven by hand: `frames(n)` draws n frames 1/60 s apart. */
function loop(opts: { search?: string; speed?: () => number; scene?: Scene } = {}) {
  const keys = keyboard();
  let pending: ((now: number) => void) | null = null;
  let now = 0;
  vi.stubGlobal("location", { search: opts.search ?? "" });
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (f: (now: number) => void) => { pending = f; return 1; });
  const input = createInput(() => {}, () => new Set());
  const scenes = createSceneStack();
  let updates = 0;
  scenes.push(opts.scene ?? { update() { updates++; }, draw() {} });
  let played = 0;
  const g = { fillRect() {} } as unknown as CanvasRenderingContext2D;
  runLoop(g, scenes, input, (dt) => { played += dt; }, opts.speed);
  return {
    keys, input,
    updates: () => updates,
    played: () => played,
    frames(n: number, ms = STEP + 0.001) { // a hair over a step, against float drift
      for (let i = 0; i < n; i++) { now += ms; pending!(now); }
    },
  };
}

afterEach(() => { vi.unstubAllGlobals(); setLoopSpeed(1); });

describe("createStepper", () => {
  it("runs one update per elapsed step at x1, carrying the remainder", () => {
    let n = 0;
    const advance = createStepper(STEP, () => n++, () => ({ steps: 1, fixed: false }));
    expect(advance(STEP * 2.5)).toBe(2);
    expect(advance(STEP / 2)).toBe(1);
    expect(advance(1)).toBe(0);
    expect(n).toBe(3);
  });

  it.each([2, 3, 4])("runs %i updates per elapsed step at x%i, on any refresh rate", (speed) => {
    let n = 0;
    const advance = createStepper(STEP, () => n++, () => ({ steps: speed, fixed: false }));
    for (let i = 0; i < 120; i++) advance(STEP / 2); // a 120 Hz display for one second
    expect(n).toBe(60 * speed);
  });

  it("runs a fixed batch per frame for ?speed (clock ignored) and clamps catch-up", () => {
    let n = 0;
    const fixed = createStepper(STEP, () => n++, () => ({ steps: 8, fixed: true }));
    fixed(1);
    fixed(5000);
    expect(n).toBe(16);
    n = 0;
    const normal = createStepper(STEP, () => n++, () => ({ steps: 4, fixed: false }));
    normal(5000); // a stalled tab: at most 250 ms of catch-up
    expect(n).toBe(15 * 4);
  });
});

describe("runLoop with GAME SPEED", () => {
  it.each([1, 2, 3, 4])("runs %i updates per displayed frame at x%i and counts play time in real ms", (speed) => {
    const l = loop({ speed: () => speed });
    l.frames(60); // one real second
    expect(l.updates()).toBe(60 * speed);
    expect(loopSpeed()).toBe(speed);
    expect(l.played()).toBeCloseTo(1000, 6);
  });

  it("counts play time in real time at x4 over a long session", () => {
    const l = loop({ speed: () => 4 });
    l.frames(60 * 90); // ninety real seconds
    expect(l.updates()).toBe(60 * 90 * 4);
    expect(l.played()).toBeCloseTo(90_000, 3);
  });

  it("reads the option every frame, so a change applies at once", () => {
    let speed = 1;
    const l = loop({ speed: () => speed });
    l.frames(10);
    speed = 3;
    l.frames(10);
    speed = 2;
    l.frames(10);
    expect(l.updates()).toBe(10 + 30 + 20);
    expect(scaledMs(1000)).toBe(500);
  });

  it("advances the game clock one step per update", () => {
    const before = gameClockMs();
    const l = loop({ speed: () => 4 });
    l.frames(15);
    expect(gameClockMs() - before).toBeCloseTo(15 * 4 * STEP, 6);
  });

  it("sees a single press in exactly one update at x4", () => {
    let presses = 0;
    let input: ReturnType<typeof createInput> | undefined;
    const l = loop({ speed: () => 4, scene: { update() { if (input!.pressed("a")) presses++; }, draw() {} } });
    input = l.input;
    l.keys.down("KeyZ");
    l.frames(1);
    expect(presses).toBe(1);
    l.frames(10); // still held: no new edge
    l.keys.up("KeyZ");
    l.frames(2);
    expect(presses).toBe(1);
    l.keys.down("KeyZ");
    l.frames(1);
    expect(presses).toBe(2);
  });

  it("keeps menu auto-repeat at its real-time pace at x4", () => {
    const count = (speed: number) => {
      let repeats = 0;
      let input: ReturnType<typeof createInput> | undefined;
      const l = loop({ speed: () => speed, scene: { update() { if (input!.repeat("down")) repeats++; }, draw() {} } });
      input = l.input;
      l.keys.down("ArrowDown");
      l.frames(60); // held for one second
      l.keys.up("ArrowDown");
      vi.unstubAllGlobals();
      return repeats;
    };
    // The press, then 0.4 s later every 0.1 s: 1 + 6 at both speeds.
    expect(count(1)).toBe(7);
    expect(count(4)).toBe(7);
  });

  it("lets the dev/e2e ?speed=N take precedence (a fixed batch per frame)", () => {
    const l = loop({ search: "?speed=8", speed: () => 4 });
    l.frames(5, 1); // the clock is ignored
    expect(l.updates()).toBe(40);
    const one = loop({ search: "?speed=1", speed: () => 4 });
    one.frames(60);
    expect(one.updates()).toBe(60);
  });

  it("ignores ?speed in the public build", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MODE", "production");
    try {
      const l = loop({ search: "?speed=8", speed: () => 2 });
      l.frames(60);
      expect(l.updates()).toBe(120);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
