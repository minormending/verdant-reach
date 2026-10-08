import { SCREEN_H, SCREEN_W } from "../src/contracts";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Drive the actual Chapter 11 continuation, geometry, trainer battles,
 * whiteout, credits and wake-up without needing a localhost browser. */
it.each([1, 42])("plays all 18 Chapter 11 milestones with a real loss and eight battles (seed %i)", async (seed) => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("location", { search: `?speed=8&seed=${seed}&time=day&allowTodo` });
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  vi.stubGlobal("addEventListener", (name: string, fn: (event: KeyboardEvent) => void) => listeners.set(name, fn));
  vi.stubGlobal("KeyboardEvent", class {
    constructor(public type: string, public init: { code: string }) {}
    get code() { return this.init.code; }
    preventDefault() {}
  });
  vi.stubGlobal("dispatchEvent", (event: KeyboardEvent) => listeners.get(event.type)?.(event));
  vi.stubGlobal("window", {});
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  const g = { fillRect() {}, drawImage() {} } as unknown as CanvasRenderingContext2D;
  const canvas = () => ({ width: SCREEN_W, height: SCREEN_H, getContext: () => g });
  vi.stubGlobal("document", { getElementById: canvas, createElement: canvas });
  const { createInput, createSceneStack } = await import("../src/engine/core");
  const { createGameContext } = await import("../src/engine/context");
  const { createTitleScene } = await import("../src/ui/title");
  // Preload Continue's dynamic module before advancing a synthetic clock;
  // module IO must not race the driver's wall-clock deadline.
  await import("../src/overworld");
  const { createQuickened } = await import("../src/battle");
  const { randomStream } = await import("../src/engine/random");
  const input = createInput(() => {}), scenes = createSceneStack();
  const ctx = createGameContext({ input, scenes, assets: {
    loadAll: async () => {}, exists: () => false, image: () => null,
  } });
  // A saved Chapter 10 fixture supplies only the earlier chapter's state.
  // Every Council flag and ending milestone must be earned by the driver.
  ctx.state.flags = { ch10_done: true, ch10_arrived: true, got_starter: true };
  ctx.state.position = { map: "council_arboretum", x: 15, y: 15, facing: "up" };
  const rng = randomStream(seed, "e2e:fixtures");
  ctx.state.party = [
    Object.assign(createQuickened(ctx.data, "red_chili", 48, rng), { e2e: true }),
    createQuickened(ctx.data, "great_oak", 35, rng),
  ];
  ctx.state.bag.spring_water = 3; // the deliberate loss must decline available medicine
  ctx.state.options.textSpeed = "fast";
  ctx.save.write();
  expect(ctx.save.read()?.flags.ch10_done).toBe(true);
  scenes.push(createTitleScene(ctx));
  const field = () => scenes.all()[0] as unknown as { player: { facing: string } };
  Object.assign(window, { __vr: { ctx, scenes }, __t: {
    hold: async () => {}, step: async () => {}, info: () => ({ f: field().player.facing }),
  } });
  const e2e = await import("./playthrough");
  e2e.report.suite = "full";
  e2e.installSpeedDriver();
  e2e.instrument();
  const interval = setInterval(() => {
    for (let i = 0; i < 8; i++) { scenes.top()?.update(1000 / 60); input.endFrame(); }
    // Credits must actually draw; the other scenes need only their updates.
    if (ctx.state.position.map === "fellowship_hall" && scenes.all().length > 1) scenes.top()?.draw(g);
    e2e.report.frame.samples++;
  }, 16);
  try {
    // Let the title's fade finish before pressing START, like the full suite.
    await vi.advanceTimersByTimeAsync(1000);
    const task = e2e.chapter11();
    await vi.advanceTimersByTimeAsync(600_000);
    await task;
    expect(e2e.report.issues, JSON.stringify({ beats: e2e.report.beats, battles: e2e.report.battles })).toEqual([]);
    expect(e2e.report.beats, JSON.stringify({ beats: e2e.report.beats, texts: e2e.report.texts })).toHaveLength(18);
    expect(e2e.report.beats.filter((b) => !b.ok).map((b) => [b.name, b.note])).toEqual([]);
    expect(e2e.report.battles.map((b) => [b.request.trainer, b.outcome])).toEqual([
      ["belladonna", "won"], ["mimi_osa", "won"], ["titus_arum", "lost"],
      ["belladonna", "won"], ["mimi_osa", "won"], ["titus_arum", "won"], ["pyra", "won"], ["rowan", "won"],
    ]);
    expect(ctx.state.hallOfFame).toHaveLength(1);
    expect(ctx.state.position.map).toBe("player_home");
    expect(ctx.state.flags.game_cleared).toBe(true);
  } finally { clearInterval(interval); }
}, 30_000);
