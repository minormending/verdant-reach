import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Drive the complete post-game with real field input, scripts and battles.
 * Only the previously earned Chapter 11 prerequisites are fixtures. */
it.each([1, 42])("plays all 23 post-game milestones, including the five +8 rematches (seed %i)", async (seed) => {
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
  const canvas = () => ({ width: 160, height: 144, getContext: () => g });
  vi.stubGlobal("document", { getElementById: canvas, createElement: canvas });
  const { createInput, createSceneStack } = await import("../src/engine/core");
  const { createGameContext } = await import("../src/engine/context");
  // Preload Continue's dynamic module before advancing a synthetic clock;
  // module IO must not race the driver's wall-clock deadline.
  await import("../src/overworld");
  const { createQuickened } = await import("../src/battle");
  const { randomStream } = await import("../src/engine/random");
  const input = createInput(() => {}), scenes = createSceneStack();
  const ctx = createGameContext({ input, scenes, assets: {
    loadAll: async () => {}, exists: () => false, image: () => null,
  } });
  ctx.state.flags = {
    game_cleared: true, ch10_done: true, ch10_arrived: true, got_starter: true,
    ch9_done: true, ch9_arrived: true, rival_5_done: true, ch8_done: true,
    ch7_done: true, ch7_arrived: true, ch6_done: true, ch5_done: true,
    morning_done: true, got_seed: true, theft_seen: true, rival_1_done: true,
    got_pods: true, pip_demo_done: true, centuryheart_planted: true,
    bram_joined: true, beat_shears_2: true, beat_calloway_2: true, beat_wren_2: true,
    shears_2_yielded: true, calloway_2_yielded: true, wren_2_yielded: true, beat_mercer: true,
    beat_grunt_g1_1: true, beat_grunt_g1_2: true, beat_grunt_g2_1: true,
    beat_grunt_g2_2: true, beat_grunt_g3_1: true, beat_grunt_g3_2: true,
    beat_climber_red: true, beat_climber_ochre: true, beat_ranger_flint: true, beat_ranger_shale: true,
  };
  ctx.state.position = { map: "player_home", x: 2, y: 2, facing: "down" };
  const rng = randomStream(seed, "e2e:fixtures");
  ctx.state.party = [
    Object.assign(createQuickened(ctx.data, "red_chili", 100, rng), { e2e: true }),
    createQuickened(ctx.data, "great_oak", 100, rng),
  ];
  ctx.state.bag = { glider_seed: 1, foxfire_lantern: 1, saxifrage: 1, fig_root: 1 };
  ctx.state.options.textSpeed = "fast";
  ctx.state.hallOfFame = [[{ ...ctx.state.party[0] }]];
  const { createOverworldScene } = await import("../src/overworld");
  scenes.push(createOverworldScene(ctx, { mode: "none" }));
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
    e2e.report.frame.samples++;
  }, 16);
  try {
    await vi.advanceTimersByTimeAsync(1000);
    const task = e2e.postgame();
    void task.catch(() => {});
    await vi.advanceTimersByTimeAsync(900_000);
    await task;
    const diagnostic = JSON.stringify({ beats: e2e.report.beats, battles: e2e.report.battles, issues: e2e.report.issues });
    expect(e2e.report.issues, diagnostic).toEqual([]);
    expect(e2e.report.beats, diagnostic).toHaveLength(23);
    expect(e2e.report.beats.filter((b) => !b.ok).map((b) => [b.name, b.note]), diagnostic).toEqual([]);
    expect(e2e.report.battles.filter((b) => b.request.trainer?.endsWith("_rematch"))
      .map((b) => [b.request.trainer, b.outcome])).toEqual([
      ["belladonna_rematch", "won"], ["mimi_osa_rematch", "won"], ["titus_arum_rematch", "won"],
      ["pyra_rematch", "won"], ["rowan_rematch", "won"],
    ]);
    expect(ctx.state.hallOfFame).toHaveLength(2);
    expect(ctx.state.flags).toMatchObject({ got_centuryheart: true, wanderers_free: true, diary_read: true,
      filled_seed_vault_b2_8_10: true, filled_seed_vault_b2_16_10: true, bridged_seed_vault_b2_12_10: true,
      council_run: false, council_rematch: false });
    expect(ctx.timeOfDay()).toBe("day");
    const clock = ctx.timeOfDay;
    await expect(e2e.atNight(async () => {
      expect(ctx.timeOfDay()).toBe("night");
      throw new Error("night failure");
    })).rejects.toThrow("night failure");
    expect(ctx.timeOfDay).toBe(clock);
  } finally { clearInterval(interval); }
}, 30_000);
