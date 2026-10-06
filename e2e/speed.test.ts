import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInput, runLoop } from "../src/engine/core";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("location", { search: "" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("dev loop speed", () => {
  function loop(search: string) {
    vi.stubGlobal("location", { search });
    let frame: FrameRequestCallback = () => {};
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => { frame = f; return 1; });
    const update = vi.fn();
    const draw = vi.fn();
    const endFrame = vi.fn();
    const tick = vi.fn();
    const scene = { update, draw };
    runLoop({ fillRect: vi.fn() } as unknown as CanvasRenderingContext2D,
      { top: () => scene, all: () => [scene] } as Parameters<typeof runLoop>[1],
      { endFrame } as Parameters<typeof runLoop>[2], tick);
    return { update, draw, endFrame, tick, frame: (ms: number) => frame(ms) };
  }

  it.each([2, 8, 16])("runs %i fixed updates then one draw", (speed) => {
    const l = loop(`?speed=${speed}`);
    l.frame(17);
    expect(l.update).toHaveBeenCalledTimes(speed);
    expect(l.endFrame).toHaveBeenCalledTimes(speed);
    expect(l.tick).toHaveBeenCalledTimes(speed);
    expect(l.update).toHaveBeenCalledWith(1000 / 60);
    expect(l.draw).toHaveBeenCalledTimes(1);
  });

  it.each(["", "?speed=1", "?speed=0", "?speed=17", "?speed=1.5", "?speed=abc"])("preserves normal timing for %s", (search) => {
    const l = loop(search);
    l.frame(10);
    expect(l.update).not.toHaveBeenCalled();
    l.frame(35);
    expect(l.update).toHaveBeenCalledTimes(2);
    expect(l.draw).toHaveBeenCalledTimes(2);
  });

  it("ignores speed in production", () => {
    vi.stubEnv("DEV", false);
    const l = loop("?speed=8");
    l.frame(17);
    expect(l.update).toHaveBeenCalledTimes(1);
  });

  it("composes speed with timer scheduling", async () => {
    const l = loop("?timer&speed=8");
    await vi.advanceTimersByTimeAsync(17);
    expect(l.update).toHaveBeenCalledTimes(8);
    expect(l.draw).toHaveBeenCalledTimes(1);
  });
});

describe("speed-safe input", () => {
  it.each([1, 8, 16])("turns in place and walks exactly one tile at speed %i", async (speed) => {
    vi.resetModules();
    vi.stubGlobal("location", { search: `?speed=${speed}` });
    const listeners = new Map<string, (event: { code: string; preventDefault(): void }) => void>();
    vi.stubGlobal("addEventListener", (name: string, fn: (event: { code: string; preventDefault(): void }) => void) => listeners.set(name, fn));
    vi.stubGlobal("KeyboardEvent", class {
      constructor(public type: string, public init: { code: string }) {}
      get code() { return this.init.code; }
      preventDefault() {}
    });
    vi.stubGlobal("dispatchEvent", (event: KeyboardEvent) => listeners.get(event.type)?.(event));
    const input = createInput(() => {});
    const player = { x: 0, y: 0, facing: "down", step: null as { t: number } | null };
    const overworld = { mapId: "route_1", busy: 0, player };
    let menu = false;
    const driver = { hold: async (_code: string, _ms?: number) => {}, step: async (_dir: string) => {} };
    vi.stubGlobal("window", { __t: driver, __vr: { ctx: { input }, scenes: { all: () => menu ? [overworld, {}] : [overworld] } } });
    const e2e = await import("./playthrough");
    e2e.installSpeedDriver();
    let turn = 0;
    let buttonPresses = 0;
    let menuPresses = 0;
    setInterval(() => {
      for (let i = 0; i < speed; i++) {
        if (menu) {
          if (input.repeat("down")) menuPresses++;
          input.endFrame();
          continue;
        }
        if (input.pressed("a")) buttonPresses++;
        if (player.step && ++player.step.t >= 8) player.step = null;
        if (!player.step && input.held("right")) {
          if (player.facing !== "right") { player.facing = "right"; turn = 5; }
          else if (turn > 0) turn--;
          else { player.x++; player.step = { t: 0 }; }
        }
        input.endFrame();
      }
      e2e.report.frame.samples++;
    }, 16);
    const turnKey = driver.hold("ArrowRight", 40);
    await vi.advanceTimersByTimeAsync(250);
    await turnKey;
    expect(player.facing).toBe("right");
    expect(player.x).toBe(0);
    const step = driver.step("right");
    await vi.advanceTimersByTimeAsync(500);
    await step;
    expect(player.x).toBe(1);
    expect(player.step).toBeNull();
    const tap = driver.hold("KeyZ");
    await vi.advanceTimersByTimeAsync(100);
    await tap;
    expect(buttonPresses).toBe(1);
    expect(input.held("a")).toBe(false);
    menu = true;
    const menuTap = driver.hold("ArrowDown", 60);
    await vi.advanceTimersByTimeAsync(100);
    await menuTap;
    expect(menuPresses).toBe(1);
    expect(input.held("down")).toBe(false);
  });
});

describe("advance watchdog integration", () => {
  it.each(["dialogue", "battle", "frozen dialogue", "frozen battle"])("observes %s beyond the old 60-tap budget", async (mode) => {
    vi.resetModules();
    vi.stubGlobal("location", { search: "?speed=8" });
    const frozen = mode.startsWith("frozen");
    const battle = mode.endsWith("battle");
    const overworld = { mapId: "sugarbush_conservatory", busy: 1, player: { x: 5, y: 15 }, flow: async () => {} };
    const box = { page: 0, chars: 0, frame: 0, waiting: true };
    const scene = {
      flow: { run: async (_task: unknown) => {} },
      ui: { tb: box, say: async (_text: unknown) => {} },
    };
    let taps = 0;
    vi.stubGlobal("window", {
      __t: { hold: async () => {
        taps++;
        box.frame++; // Idle animation must not conceal a frozen scene.
        if (!frozen && battle) await scene.flow.run({});
        if (!frozen && !battle) box.page++;
        await new Promise((resolve) => setTimeout(resolve, 40));
      } },
      __vr: {
        ctx: { state: { flags: {} } },
        scenes: { all: () => [overworld, scene] },
      },
    });
    const e2e = await import("./playthrough");
    const run = e2e.advance(400, () => !frozen && taps >= 300);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await run).toBe(!frozen);
    expect(taps).toBeGreaterThan(60);
    const locks = e2e.report.issues.filter((issue) => issue.kind === "soft-lock?");
    expect(locks).toHaveLength(frozen ? 1 : 0);
    if (frozen) expect(e2e.report.issues.some((issue) => issue.kind === "advance-timeout")).toBe(true);
  });
});
