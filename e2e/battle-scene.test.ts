import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createQuickened } from "../src/battle/logic/stats";
import { randomStream } from "../src/engine/random";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Exercise the real battle scene, menus, item screens and input driver. This
 * supplements (does not replace) the browser's full 46-beat playthrough. */
async function fight(seed: number, wounded = false, active = 0) {
  const originalConsole = { log: console.log, warn: console.warn, error: console.error };
  vi.resetModules();
  vi.stubGlobal("location", { search: `?speed=8&seed=${seed}&time=day` });
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  vi.stubGlobal("addEventListener", (name: string, fn: (event: KeyboardEvent) => void) => listeners.set(name, fn));
  vi.stubGlobal("KeyboardEvent", class {
    constructor(public type: string, public init: { code: string }) {}
    get code() { return this.init.code; }
    preventDefault() {}
  });
  vi.stubGlobal("dispatchEvent", (event: KeyboardEvent) => listeners.get(event.type)?.(event));
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { getElementById: () => ({ getContext: () => ({ fillRect() {} }) }) });
  const { createInput, createSceneStack } = await import("../src/engine/core");
  const { createGameContext } = await import("../src/engine/context");
  const input = createInput(() => {});
  const scenes = createSceneStack();
  const ctx = createGameContext({ input, scenes, assets: {
    loadAll: async () => {}, exists: () => false, image: () => null,
  } });
  const helper = createQuickened(ctx.data, "red_chili", 48, randomStream(seed, "e2e:fixtures"));
  ctx.state.party = [helper];
  if (active === 1) {
    const wilted = createQuickened(ctx.data, "oak_acorn", 5, randomStream(seed, "test:wilted"));
    wilted.hp = 0;
    ctx.state.party.unshift(wilted);
  }
  ctx.state.options.textSpeed = "fast";
  ctx.state.bag = { water_flask: 2, spring_water: 1, terrarium_pod: 3 };
  if (wounded) helper.hp = Math.floor(helper.stats.hp / 3);
  scenes.push({ mapId: "glasshouse_conservatory", busy: 1, player: { x: 7, y: 3 }, update() {}, draw() {} } as Parameters<typeof scenes.push>[0]);
  Object.assign(window, { __vr: { ctx, scenes }, __t: { hold: async () => {}, step: async () => {} } });
  const e2e = await import("./playthrough");
  e2e.report.suite = "full";
  e2e.installSpeedDriver();
  e2e.instrument();
  const interval = setInterval(() => {
    for (let i = 0; i < 8; i++) {
      scenes.top()?.update(1000 / 60);
      input.endFrame();
    }
    e2e.report.frame.samples++;
  }, 16);
  let outcome: string | undefined;
  void ctx.battle({ kind: "trainer", trainer: "flora" }).then((value) => { outcome = value; });
  const drive = e2e.advance(1000, () => outcome !== undefined);
  await vi.advanceTimersByTimeAsync(240_000);
  const advanced = await drive;
  clearInterval(interval);
  Object.assign(console, originalConsole);
  expect(advanced, JSON.stringify(e2e.report.issues)).toBe(true);
  expect(outcome).toBe("won");
  expect(e2e.report.issues).toEqual([]);
  return { texts: e2e.report.texts.map((t) => t.text), bag: ctx.state.bag };
}

it.each([1, 2, 42])("drives FLORA's real battle scene with seed %i", async (seed) => {
  await fight(seed);
});

it("replays the same FLORA dialogue for the same seed", async () => {
  const first = await fight(1);
  const second = await fight(1);
  expect(second.texts).toEqual(first.texts);
});

it("heals a wounded helper through BAG and party selection using awarded medicine", async () => {
  const result = await fight(1, true);
  expect(result.bag.spring_water ?? 0, JSON.stringify(result.texts)).toBe(0);
  expect(result.texts.some((text) => text.includes("used SPRING WATER"))).toBe(true);
});

it("selects the active party member when healing a helper outside slot zero", async () => {
  const result = await fight(1, true, 1);
  expect(result.bag.spring_water ?? 0).toBe(0);
  expect(result.texts).toContain("[party pick] Use on which? -> 1");
  expect(result.texts).toContain("[battle] RED CHILI recovered 60 HP!");
});
