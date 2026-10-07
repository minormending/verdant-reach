import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MapId } from "../src/contracts";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Run the real overworld and modal screens against the e2e keyboard driver.
 * No browser is needed: only drawing and asset/audio loading are omitted. */
async function setup(map: MapId, x: number, y: number, rafting = false) {
  vi.stubGlobal("location", { search: "?speed=8&seed=1&time=day&allowTodo" });
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
  const { createOverworldScene } = await import("../src/overworld");
  const input = createInput(() => {});
  const scenes = createSceneStack();
  const ctx = createGameContext({ input, scenes, assets: {
    loadAll: async () => {}, exists: () => false, image: () => null,
  } });
  ctx.state.position = { map, x, y, facing: "up" };
  if (rafting) ctx.state.rafting = true;
  ctx.state.options.textSpeed = "fast";
  ctx.state.bag.lily_raft = 1;
  ctx.state.bag.saxifrage = 1;
  // Fixture prerequisites and defeated juniors keep these checks about field
  // input; the full playthrough earns all of these through story/battle input.
  Object.assign(ctx.state.flags, {
    ch6_arrived: true, lantern_healed: true, cons5_gate: false,
    beat_jr_tide: true, beat_jr_current: true, beat_jr_spine: true, beat_jr_needle: true,
  });
  const scene = createOverworldScene(ctx, { mode: "none" });
  scenes.push(scene);
  Object.assign(window, { __vr: { ctx, scenes }, __t: { hold: async () => {}, step: async () => {},
    info: () => { const o = e2eOw(); return { f: o.player.facing }; } } });
  const e2e = await import("./playthrough");
  function e2eOw() { return scene as typeof scene & {
    busy: number;
    player: { x: number; y: number; facing: string };
    npcs: { id: string; x: number; y: number }[];
    follower: { x: number; y: number; moving: boolean };
    followerVisible(): boolean;
  }; }
  e2e.installSpeedDriver();
  e2e.instrument();
  const interval = setInterval(() => {
    for (let i = 0; i < 8; i++) { scenes.top()?.update(1000 / 60); input.endFrame(); }
    e2e.report.frame.samples++;
  }, 16);
  const drive = async <T>(action: () => Promise<T>): Promise<T> => {
    const task = action();
    await vi.advanceTimersByTimeAsync(60_000);
    return task;
  };
  return { ctx, e2e, drive, field: e2eOw(), stop: () => clearInterval(interval) };
}

function fieldTaps({ ctx, field }: Awaited<ReturnType<typeof setup>>) {
  const taps: { x: number; y: number; facing: string; facingFollower: boolean }[] = [];
  const dispatch = dispatchEvent;
  const dirs: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  vi.spyOn(globalThis, "dispatchEvent").mockImplementation((event) => {
    if (event.type === "keydown" && (event as KeyboardEvent).code === "KeyZ"
      && ctx.scenes.top() === field && !field.busy) {
      const { x, y, facing } = field.player;
      const [dx, dy] = dirs[facing];
      taps.push({ x, y, facing, facingFollower: field.followerVisible()
        && field.follower.x === x + dx && field.follower.y === y + dy });
    }
    return dispatch(event);
  });
  return taps;
}

it("walks through the follower to stand adjacent to REYES before talking", async () => {
  const fixture = await setup("saltmarsh_harbour", 31, 12);
  const { ctx, e2e, drive, field, stop } = fixture;
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5)];
  ctx.state.flags.lantern_healed = false;
  ctx.state.flags.ch6_doctor_met = true;
  ctx.state.flags.beat_grunt_dock_1 = true;
  ctx.state.flags.beat_grunt_dock_2 = true;
  delete ctx.state.bag.lily_raft;
  try {
    // Stepping away leaves the real follower between the player and REYES.
    expect(await drive(() => e2e.walkTo(30, 12))).toBe(true);
    expect(field.followerVisible()).toBe(true);
    expect(field.follower).toMatchObject({ x: 31, y: 12, moving: false });
    const taps = fieldTaps(fixture);
    expect(await drive(() => e2e.talkTo("reyes_point"))).toBe(true);
    expect(taps).toHaveLength(1);
    expect(taps[0]).toEqual({ x: 31, y: 12, facing: "right", facingFollower: false });
    expect(ctx.state.flags.got_raft).toBe(true);
    expect(ctx.state.bag.lily_raft).toBe(1);
    expect(e2e.report.texts.some((t) => /RED CHILI/.test(t.text))).toBe(false);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it.each([
  { map: "cedarhallow_house", id: "ranger", x: 3, y: 5, dx: 0, dy: 1, facing: "up", flag: "quest_fire_followers_started" },
  { map: "cedar_hollow", id: "shrine_keeper", x: 10, y: 20, dx: 0, dy: -1, facing: "down", flag: "got_lantern" },
  { map: "cedarhallow_conservatory", id: "lever:cons4_lever_a", x: 3, y: 15, dx: 1, dy: 0, facing: "left", flag: "cons4_lever_a" },
  { map: "cedarhallow_conservatory", id: "lever:cons4_lever_b", x: 12, y: 15, dx: -1, dy: 0, facing: "right", flag: "cons4_lever_b" },
  { map: "route_8", id: "survey_assistant", x: 30, y: 21, dx: 0, dy: -1, facing: "down", flag: "quest_seagrass_survey_started" },
  { map: "driftseed_isle", id: "isle_elder", x: 6, y: 10, dx: 0, dy: 1, facing: "up", flag: "got_saxifrage" },
] as const)("approaches $id through the follower before A in Chapters 5–6", async ({ map, id, x, y, dx, dy, facing, flag }) => {
  const fixture = await setup(map, x, y);
  const { ctx, e2e, drive, field, stop } = fixture;
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5)];
  Object.assign(ctx.state.flags, { burnt_vision_seen: true, got_raft: true, visited_driftseed_isle: true });
  try {
    expect(await drive(() => e2e.walkTo(x + dx, y + dy))).toBe(true);
    expect(field.followerVisible()).toBe(true);
    expect(field.follower).toMatchObject({ x, y, moving: false });
    const taps = fieldTaps(fixture);
    expect(await drive(() => e2e.talkTo(id))).toBe(true);
    expect(taps).toEqual([{ x, y, facing, facingFollower: false }]);
    expect(ctx.state.flags[flag]).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("still talks across an authored counter", async () => {
  const fixture = await setup("saltmarsh_market", 2, 4);
  const { ctx, e2e, drive, stop } = fixture;
  ctx.screens.shop = vi.fn().mockResolvedValue(undefined);
  try {
    const taps = fieldTaps(fixture);
    expect(await drive(() => e2e.talkTo("clerk"))).toBe(true);
    expect(taps).toEqual([{ x: 2, y: 4, facing: "up", facingFollower: false }]);
    expect(ctx.screens.shop).toHaveBeenCalledOnce();
    expect(e2e.report.texts.some((t) => t.speaker === "CLERK")).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("rechecks the target after turning instead of talking toward its old tile", async () => {
  const fixture = await setup("saltmarsh_harbour", 31, 12);
  const { ctx, e2e, drive, field, stop } = fixture;
  ctx.state.flags.lantern_healed = false;
  Object.assign(ctx.state.flags, { ch6_doctor_met: true, beat_grunt_dock_1: true, beat_grunt_dock_2: true });
  const reyes = field.npcs.find((n) => n.id === "reyes_point")!;
  const driver = (window as unknown as { __t: { hold(code: string, ms?: number): Promise<void> } }).__t;
  const hold = driver.hold;
  let moved = false;
  vi.spyOn(driver, "hold").mockImplementation(async (code, ms) => {
    await hold(code, ms);
    if (code === "ArrowRight" && !moved) {
      reyes.y = 13;
      moved = true;
    }
  });
  try {
    const taps = fieldTaps(fixture);
    expect(await drive(() => e2e.talkTo("reyes_point"))).toBe(true);
    expect(moved).toBe(true);
    expect(taps).toEqual([{ x: 31, y: 13, facing: "right", facingFollower: false }]);
    expect(ctx.state.flags.got_raft).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("boards by A/YES, reaches the sluice lever, then rafts through its gate", async () => {
  const { ctx, e2e, drive, stop } = await setup("saltmarsh_conservatory", 7, 16);
  try {
    expect(await drive(() => e2e.walkTo(7, 3))).toBe(false);
    expect(await drive(() => e2e.talkTo("lever:cons5_gate"))).toBe(true);
    expect(ctx.state.flags.cons5_gate).toBe(true);
    expect(await drive(() => e2e.walkTo(7, 3))).toBe(true);
    expect(ctx.state.position).toMatchObject({ map: "saltmarsh_conservatory", x: 7, y: 3 });
    expect(ctx.state.rafting).toBeUndefined();
    expect(e2e.report.texts.filter((t) => /Ride the LILY RAFT/.test(t.text)).length).toBeGreaterThanOrEqual(2);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it.each([
  { start: "land", x: 19, y: 20, rafting: false },
  { start: "sea arrival", x: 19, y: 28, rafting: true },
])("heals the Lantern Tree with A from $start and opens the Conservatory", async ({ x, y, rafting }) => {
  const fixture = await setup("saltmarsh_harbour", x, y, rafting);
  const { ctx, e2e, drive, stop } = fixture;
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5)];
  Object.assign(ctx.state.flags, { lantern_healed: false, got_sap: true, ch6_doctor_met: true,
    beat_grunt_dock_1: true, beat_grunt_dock_2: true });
  ctx.state.bag.cactus_sap = 1;
  // Drawing is omitted in this harness; supply the cutscene image so its real
  // fade/still/clear flow runs without a missing-art warning.
  vi.spyOn(ctx.assets, "image").mockReturnValue({} as HTMLImageElement);
  try {
    const taps = fieldTaps(fixture);
    expect(await drive(() => e2e.trigger("ch6_lantern_tree"))).toBe(true);
    expect(taps).toEqual([{ x: 34, y: 12, facing: "up", facingFollower: false }]);
    expect(ctx.state.rafting).toBeUndefined();
    expect(ctx.state.flags.lantern_healed).toBe(true);
    expect(ctx.state.bag.cactus_sap ?? 0).toBe(0);
    expect(e2e.report.texts.some((t) => /Fireflies return/.test(t.text))).toBe(true);
    expect(await drive(() => e2e.nav("saltmarsh_conservatory"))).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it.each(["step", "talk"] as const)("reports an issue when a %s trigger is unreachable", async (kind) => {
  const { e2e, drive, field, stop } = await setup("saltmarsh_harbour", 19, 20);
  const { map } = field as typeof field & { map: import("../src/overworld/map").MapRuntime };
  // Keep the fixture isolated from WORLD and block every approach to the plaque.
  map.def = structuredClone(map.def);
  const tree = map.def.triggers.find((t) => t.script === "ch6_lantern_tree")!;
  if (kind === "step") { tree.x = 0; tree.y = 0; }
  else for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
    const x = tree.x + dx, y = tree.y + dy;
    map.def.tiles[y] = map.def.tiles[y].slice(0, x) + "T" + map.def.tiles[y].slice(x + 1);
  }
  try {
    expect(await drive(() => e2e.trigger("ch6_lantern_tree"))).toBe(false);
    expect(e2e.report.issues).toEqual([expect.objectContaining({ kind: "trigger",
      msg: `could not ${kind === "talk" ? "use" : "reach"} "ch6_lantern_tree" on saltmarsh_harbour` })]);
    expect(e2e.report.texts).toEqual([]);
  } finally { stop(); }
});

it("pushes all three island boulders with A/YES and walks the cleared corridor", async () => {
  const { ctx, e2e, drive, stop } = await setup("driftseed_conservatory", 7, 16);
  try {
    for (const y of [12, 8, 4]) {
      expect(await drive(() => e2e.walkTo(6, y))).toBe(true);
      await drive(async () => {
        await e2e.press("right", 40);
        await e2e.press("a");
        await e2e.advance();
      });
    }
    expect(await drive(() => e2e.walkTo(7, 3))).toBe(true);
    expect(ctx.state.position).toMatchObject({ map: "driftseed_conservatory", x: 7, y: 3 });
    expect(e2e.report.texts.filter((t) => t.text === "[?] UPROOT it?")).toHaveLength(3);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("rafts from the harbour to the island and back through real warps", async () => {
  const { ctx, e2e, drive, stop } = await setup("saltmarsh_harbour", 27, 16);
  // Battles are covered separately; preserve encounter rolls and the normal
  // fade/arrival flow while concentrating this check on raft input and warps.
  ctx.battle = vi.fn().mockResolvedValue("ran");
  try {
    expect(await drive(() => e2e.nav("route_8"))).toBe(true);
    expect(ctx.state.position.map).toBe("route_8");
    expect(ctx.state.rafting).toBe(true); // sea crossings land on water and keep the raft (lead decision)
    expect(e2e.report.texts.filter((t) => t.text === "[?] Ride the LILY RAFT?")).toHaveLength(1);
    expect(await drive(() => e2e.walkTo(27, 16))).toBe(true);
    expect(ctx.state.rafting).toBe(true);
    expect(await drive(() => e2e.nav("driftseed_isle"))).toBe(true);
    expect(await drive(() => e2e.walkTo(16, 5))).toBe(true);
    expect(ctx.state.rafting).toBeUndefined();
    expect(ctx.state.flags.visited_driftseed_isle).toBe(true);
    expect(await drive(() => e2e.nav("saltmarsh_harbour"))).toBe(true);
    expect(ctx.state.position.map).toBe("saltmarsh_harbour");
    expect(ctx.state.rafting).toBe(true); // arrived on water from the sea route: still afloat
    expect(await drive(() => e2e.nav("route_8"))).toBe(true);
    expect(await drive(() => e2e.walkTo(27, 16))).toBe(true);
    expect(ctx.state.rafting).toBe(true);
    // Boards once at the harbour and once leaving the island; sea crossings keep the raft.
    expect(e2e.report.texts.filter((t) => t.text === "[?] Ride the LILY RAFT?").length).toBeGreaterThanOrEqual(2);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("keeps rafting through a water arrival without asking to board again", async () => {
  const { ctx, e2e, drive, stop } = await setup("saltmarsh_harbour", 27, 16);
  ctx.battle = vi.fn().mockResolvedValue("ran");
  // The current sea maps land on boardwalks. Exercise the amended water
  // arrival rule using the same real sea-exit warps and a water landing tile.
  ctx.world.maps = { ...ctx.world.maps, route_8: structuredClone(ctx.world.maps.route_8) };
  const route = ctx.world.maps.route_8;
  route.tiles[1] = route.tiles[1].slice(0, 18) + "~~" + route.tiles[1].slice(20);
  try {
    expect(await drive(() => e2e.nav("route_8"))).toBe(true);
    expect(ctx.state.rafting).toBe(true);
    expect(await drive(() => e2e.walkTo(27, 16))).toBe(true);
    expect(ctx.state.rafting).toBe(true);
    expect(e2e.report.texts.filter((t) => t.text === "[?] Ride the LILY RAFT?")).toHaveLength(1);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("cannot navigate onto the sea without mounting with the raft item", async () => {
  const { ctx, e2e, drive, stop } = await setup("saltmarsh_harbour", 27, 16);
  delete ctx.state.bag.lily_raft;
  try {
    expect(await drive(() => e2e.walkTo(18, 29))).toBe(false);
    expect(ctx.state.position.map).toBe("saltmarsh_harbour");
    expect(ctx.state.rafting).toBeUndefined();
    expect(e2e.report.texts.filter((t) => /Ride the LILY RAFT/.test(t.text))).toHaveLength(0);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("selects the caught vine through the trader's party filter and finishes POLLY's growth", async () => {
  const { ctx, e2e, drive, stop } = await setup("saltmarsh_market", 9, 6);
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5),
    createQuickened(ctx.data, "vanilla_vine", 26, () => 0.5)];
  try {
    expect(await drive(() => e2e.talkTo("trader"))).toBe(true);
    expect(ctx.state.flags.quest_hand_pollinator_done).toBe(true);
    expect(ctx.state.party[1]).toMatchObject({ species: "vanilla_orchid", nickname: "POLLY" });
    expect(ctx.state.herbarium.caught).toContain("vanilla_orchid");
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("routes between real ICE slide stops to SIGNE and back without turning mid-slide", async () => {
  const { ctx, e2e, drive, stop } = await setup("larchmere_conservatory", 7, 18);
  Object.assign(ctx.state.flags, { lake_calmed: true, beat_jr_flurry: true, beat_jr_hoarfrost: true });
  const driver = (window as unknown as { __t: { step(d: string): Promise<void> } }).__t;
  const moves: { dir: string; from: string; to: string }[] = [];
  const step = driver.step;
  vi.spyOn(driver, "step").mockImplementation(async (dir) => {
    const from = `${ctx.state.position.x},${ctx.state.position.y}`;
    await step(dir);
    moves.push({ dir, from, to: `${ctx.state.position.x},${ctx.state.position.y}` });
  });
  try {
    expect(await drive(() => e2e.walkTo(7, 14))).toBe(false); // an intermediate ice cell is no stop
    expect(await drive(() => e2e.walkTo(7, 3))).toBe(true);
    expect(ctx.state.position).toMatchObject({ x: 7, y: 3 });
    expect(moves).toEqual(expect.arrayContaining([
      { dir: "right", from: "2,14", to: "13,14" },
      { dir: "left", from: "13,10", to: "2,10" },
      { dir: "right", from: "2,6", to: "13,6" },
    ]));
    expect(await drive(() => e2e.walkTo(7, 18))).toBe(true);
    expect(ctx.state.position).toMatchObject({ x: 7, y: 18 });
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("stores the last party member through the real LARCHMERE cabinet to make catch room", async () => {
  const { ctx, e2e, drive, stop } = await setup("larchmere_greenhouse", 5, 7);
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = Array.from({ length: 6 }, () => createQuickened(ctx.data, "red_chili", 48, () => 0.5));
  const last = ctx.state.party[5];
  try {
    expect(await drive(() => e2e.makePartyRoom())).toBe(true);
    expect(ctx.state.party).toHaveLength(5);
    expect(ctx.state.box).toContain(last);
    expect(e2e.report.texts.some((t) => /opened the SPECIMEN CABINET/.test(t.text))).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("drives COLD SNAP's real party picker and consumes one item when the bulb grows", async () => {
  const { ctx, e2e, drive, stop } = await setup("larchmere_conservatory", 7, 3);
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5),
    createQuickened(ctx.data, "snowdrop_bulb", 33, () => 0.5)];
  ctx.state.bag.cold_snap = 2;
  const bulb = ctx.state.party[1];
  try {
    await drive(() => e2e.growWithItem(1, "cold_snap"));
    expect(bulb.species).toBe("snowdrop_shoot");
    expect(ctx.state.bag.cold_snap).toBe(1);
    expect(ctx.state.herbarium.caught).toContain("snowdrop_shoot");
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("uses Chapter 7's closed gate, raft, bookcase, guarded emitters and files through field input", async () => {
  const { ctx, e2e, drive, stop } = await setup("larchmere", 17, 28);
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5)];
  Object.assign(ctx.state.flags, { ch6_done: true, ch7_arrived: true });
  // Field routing and script prerequisites are the subject here. The real
  // seeded boss scenes are exercised in battle-scene.test.ts and the suite.
  ctx.battle = vi.fn().mockResolvedValue("won");
  vi.spyOn(ctx.assets, "image").mockReturnValue({} as HTMLImageElement);
  try {
    expect(await drive(() => e2e.trigger("ch7_cons7_door"))).toBe(true);
    expect(ctx.state.position).toMatchObject({ map: "larchmere", x: 26, y: 11 });
    expect(ctx.state.flags.lake_calmed).not.toBe(true);
    expect(await drive(() => e2e.nav("bloom_lake"))).toBe(true);
    expect(await drive(() => e2e.walkTo(18, 19))).toBe(true);
    expect(ctx.state.rafting).toBeUndefined();
    expect(e2e.report.texts.some((t) => /Ride the LILY RAFT/.test(t.text))).toBe(true);
    expect(await drive(() => e2e.talkTo("crimson_lily"))).toBe(true);
    expect(ctx.battle).toHaveBeenCalledWith(expect.objectContaining({ kind: "wild",
      wild: { species: "giant_water_lily", level: 40, sport: true } }));
    expect(ctx.state.flags.crimson_lily_done).toBe(true);
    expect(await drive(() => e2e.nav("larchmere_lodge"))).toBe(true);
    if (!ctx.state.flags.lodge_grunt_seen) expect(await drive(() => e2e.trigger("ch7_lodge_grunt"))).toBe(true);
    expect(ctx.state.flags).toMatchObject({ lodge_grunt_seen: true, beat_grunt_lodge: true });
    expect(await drive(() => e2e.trigger("ch7_bookcase"))).toBe(true);
    expect(ctx.state.position.map).toBe("rootstock_hideout_1");
    for (const n of [1, 2, 3]) {
      expect(await drive(() => e2e.talkTo(`grunt_b1_${n}`))).toBe(true);
      expect(await drive(() => e2e.talkTo(`emitter_${n}`))).toBe(true);
      expect(ctx.state.flags[`emitter_${n}_off`]).toBe(true);
    }
    expect(ctx.state.flags.emitters_off).toBe(true);
    expect(await drive(() => e2e.nav("rootstock_hideout_2"))).toBe(true);
    expect(await drive(() => e2e.talkTo("calloway"))).toBe(true);
    expect(ctx.state.flags.calloway_escaped).toBe(true);
    expect(await drive(() => e2e.trigger("ch7_files"))).toBe(true);
    expect(ctx.state.flags).toMatchObject({ files_read: true, lake_calmed: true });
    expect(await drive(() => e2e.nav("larchmere"))).toBe(true);
    expect(ctx.state.position).toMatchObject({ x: 30, y: 23 });
    expect(await drive(() => e2e.nav("larchmere_conservatory"))).toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("searches ROUTE 9's snow and returns the real hidden pack for LOST CLIMBER's reward", async () => {
  const { ctx, e2e, drive, stop } = await setup("route_9", 14, 54);
  ctx.battle = vi.fn().mockResolvedValue("fled");
  try {
    expect(await drive(() => e2e.talkTo("mountaineer"))).toBe(true);
    expect(ctx.state.flags.quest_lost_climber_started).toBe(true);
    expect(await drive(() => e2e.walkTo(8, 8))).toBe(true);
    await drive(async () => { await e2e.press("a"); await e2e.advance(); });
    expect(ctx.state.flags.hidden_route_9_8_8).toBe(true);
    expect(ctx.state.bag.climber_pack).toBe(1);
    expect(await drive(() => e2e.walkTo(8, 40))).toBe(true);
    const rain = ctx.state.bag.rain_jar ?? 0, cold = ctx.state.bag.cold_snap ?? 0;
    expect(await drive(() => e2e.talkTo("mountaineer"))).toBe(true);
    expect(ctx.state.flags.quest_lost_climber_done).toBe(true);
    expect(ctx.state.bag.climber_pack ?? 0).toBe(0);
    expect(ctx.state.bag.rain_jar).toBe(rain + 2);
    expect(ctx.state.bag.cold_snap).toBe(cold + 1);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});

it("walks Chapter 8's keycard gate, Relay floors and C/A/B talks through WREN and MERCER", async () => {
  const fixture = await setup("glasshouse_greenhouse", 5, 7);
  const { ctx, e2e, drive, field, stop } = fixture;
  const { createQuickened } = await import("../src/battle");
  ctx.state.party = [createQuickened(ctx.data, "red_chili", 48, () => 0.5)];
  Object.assign(ctx.state.flags, { ch7_done: true, ch4_done: true, gc_arrival_seen: true,
    relay_listened: true, ch4_grunt_seen: true });
  // Exercise real field routing and scripts; seeded battles run in the full
  // browser suite. These fixtures do not grant any Chapter 8 progression.
  ctx.battle = vi.fn().mockResolvedValue("won");
  vi.spyOn(ctx.assets, "image").mockReturnValue({} as HTMLImageElement);
  try {
    expect(await drive(() => e2e.nav("glasshouse_city"))).toBe(true);
    expect(ctx.state.flags.ch8_started).toBe(true);
    expect(await drive(() => e2e.trigger("ch8_relay_door"))).toBe(true);
    expect(ctx.state.position).toMatchObject({ map: "glasshouse_city", x: 5, y: 8 });
    expect(ctx.state.bag.relay_keycard).toBeUndefined();
    expect(await drive(() => e2e.nav("palm_house"))).toBe(true);
    expect(await drive(() => e2e.talkTo("director_hiding"))).toBe(true);
    expect(ctx.state.flags.got_keycard).toBe(true);
    expect(ctx.state.bag.relay_keycard).toBe(1);
    expect(await drive(() => e2e.nav("glasshouse_city"))).toBe(true);
    for (const id of ["grunt_r0_1", "grunt_r0_2"]) {
      if (!ctx.state.flags[`beat_${id}`]) expect(await drive(() => e2e.talkTo(id))).toBe(true);
      expect(ctx.state.flags[`beat_${id}`]).toBe(true);
    }
    expect(await drive(() => e2e.nav("glasshouse_relay"))).toBe(true);
    for (const id of ["grunt_r1_1", "grunt_r1_2"]) {
      if (!ctx.state.flags[`beat_${id}`]) expect(await drive(() => e2e.talkTo(id))).toBe(true);
      expect(ctx.state.flags[`beat_${id}`]).toBe(true);
    }
    expect(await drive(() => e2e.nav("relay_2f"))).toBe(true);
    for (const id of ["grunt_r2_1", "grunt_r2_2", "grunt_r2_3"]) {
      if (!ctx.state.flags[`beat_${id}`]) expect(await drive(() => e2e.talkTo(id))).toBe(true);
      expect(ctx.state.flags[`beat_${id}`]).toBe(true);
    }
    expect(await drive(() => e2e.trigger("ch8_patch_note"))).toBe(true);
    expect(ctx.state.flags.patch_note_read).toBe(true);
    expect(await drive(() => e2e.nav("relay_3f"))).toBe(true);
    expect(ctx.state.flags.ch8_bram_met).toBe(true);
    for (const id of ["grunt_r3_1", "grunt_r3_2"]) {
      if (!ctx.state.flags[`beat_${id}`]) expect(await drive(() => e2e.talkTo(id))).toBe(true);
      expect(ctx.state.flags[`beat_${id}`]).toBe(true);
    }
    const taps = fieldTaps(fixture);
    for (const id of ["c", "a", "b"]) {
      expect(await drive(() => e2e.trigger(`ch8_console_${id}`))).toBe(true);
      expect(ctx.state.flags.relay_patched ?? false).toBe(id === "b");
    }
    expect(taps).toEqual([
      { x: 11, y: 2, facing: "up", facingFollower: false },
      { x: 5, y: 2, facing: "up", facingFollower: false },
      { x: 8, y: 2, facing: "up", facingFollower: false },
    ]);
    expect(await drive(() => e2e.nav("relay_roof"))).toBe(true);
    expect(await drive(() => e2e.trigger("ch8_wren"))).toBe(true);
    expect(ctx.battle).toHaveBeenCalledWith(expect.objectContaining({ kind: "trainer", trainer: "wren" }));
    expect(ctx.state.flags).toMatchObject({ beat_wren: true, broadcast_off: true,
      mercer_seen: true, mercer_left: true, ch8_takeover: false });
    // NPC overrides and persistent conditions agree after the roof cutscene.
    expect(field.npcs.filter((n) => ["wren", "mercer"].includes(n.id)).every((n) =>
      !(field as typeof field & { visible(n: (typeof field.npcs)[number]): boolean }).visible(n))).toBe(true);
    expect(await drive(() => e2e.nav("relay_2f"))).toBe(true);
    expect(await drive(() => e2e.walkTo(2, 11))).toBe(true);
    const money = ctx.state.money, rain = ctx.state.bag.rain_jar ?? 0;
    await drive(async () => {
      await e2e.press("down"); // downstairs warp; lobby onEnter starts the reward/end chain
      expect(await e2e.advance(400, () => !!ctx.state.flags.relay_reward)).toBe(true);
    });
    expect(ctx.state.position.map).toBe("glasshouse_relay");
    expect(ctx.state.money).toBe(money + 3000);
    expect(ctx.state.bag.rain_jar).toBe(rain + 2);
    // The reward beat can be recorded before continuing VALE's call/card.
    expect(ctx.state.flags.ch8_done).not.toBe(true);
    expect(e2e.report.issues).toEqual([]);
  } finally { stop(); }
});
