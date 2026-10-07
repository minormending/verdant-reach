import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameContext, MapDef, MapId, MusicId, Scene } from "../contracts";
import { DATA } from "../data";
import { Fader, Timers } from "../engine/gfx";
import { createSave, newGameState } from "../save";
import { Menu } from "../ui/kit";
import { WORLD } from "../world";
import { createOverworldScene } from "./index";
import { BattleTransition } from "./render";
import type { ScriptHost } from "./script";

type TestScene = Scene & {
  busy: number;
  host: ScriptHost;
  musicFor(def: MapDef): MusicId;
  playMapMusic(): void;
  useWarp(warp: MapDef["warps"][number]): Promise<void>;
  trainerEncounter(trainer: string): Promise<void>;
};

function context(map: MapId = "glasshouse_city"): GameContext {
  let music: MusicId | null = null;
  const state = newGameState({ world: WORLD });
  state.position = { map, x: 7, y: 11, facing: "left" };
  Object.assign(state.flags, { ch8_started: true, got_keycard: true, relay_listened: true });
  return {
    state, world: WORLD, data: DATA,
    assets: { exists: () => false },
    timeOfDay: () => "day",
    audio: {
      current: () => music,
      playMusic: vi.fn((id: MusicId) => { music = id; }),
      playSfx: vi.fn(),
    },
    ui: { say: vi.fn(async () => {}) },
    input: { pressed: () => false, held: () => false, repeat: () => false },
    scenes: {
      run: (factory: (done: (result: unknown) => void) => Scene) => new Promise((resolve) => {
        factory(resolve).update(0);
      }),
    },
    battle: vi.fn(async () => "won"),
  } as unknown as GameContext;
}

const sceneFor = (ctx: GameContext, mode: "none" | "continue" = "none") =>
  createOverworldScene(ctx, { mode }) as TestScene;
const enterLobby = (scene: TestScene) => scene.useWarp(WORLD.maps.glasshouse_city.warps.find((w) => w.to === "glasshouse_relay")!);

beforeEach(() => {
  // Skip only visual delays; keep the real map, script and battle-return flows.
  vi.spyOn(Fader.prototype, "to").mockImplementation(async function (this: Fader, color) { this.set(color); });
  vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
  vi.spyOn(BattleTransition.prototype, "run").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("conditional map music", () => {
  it("plays the takeover track on lobby entry before the derived flag is refreshed", async () => {
    const ctx = context();
    ctx.state.flags.ch8_takeover = false;
    const scene = sceneFor(ctx);
    await enterLobby(scene);
    expect(ctx.audio.playMusic).toHaveBeenCalledExactlyOnceWith("rootstock_appears");
    expect(ctx.audio.current()).toBe("rootstock_appears");
    expect(ctx.state.flags.ch8_takeover).toBe(true);
  });

  it("restores the takeover track after winning a lobby grunt battle", async () => {
    const ctx = context();
    const scene = sceneFor(ctx);
    await enterLobby(scene);
    await scene.trainerEncounter("grunt_r1_1");
    expect(ctx.battle).toHaveBeenCalledWith(expect.objectContaining({ kind: "trainer", trainer: "grunt_r1_1" }));
    expect(ctx.state.flags.beat_grunt_r1_1).toBe(true);
    expect(vi.mocked(ctx.audio.playMusic).mock.calls).toEqual([
      ["rootstock_appears"], ["battle_rootstock"], ["rootstock_appears"],
    ]);
    expect(ctx.audio.current()).toBe("rootstock_appears");
  });

  it("returns to ROOT RELAY music after WREN is beaten, despite a stale takeover flag", async () => {
    const ctx = context();
    const scene = sceneFor(ctx);
    await enterLobby(scene);
    ctx.state.flags.beat_wren = true;
    await scene.host.restoreMusic!();
    expect(ctx.audio.current()).toBe("root_relay");
    ctx.state.flags.ch8_done = true;
    await enterLobby(scene);
    expect(ctx.audio.current()).toBe("root_relay");
    expect(ctx.state.flags.ch8_takeover).toBe(false);
  });

  it("plays the takeover track on Continue from a saved lobby position", async () => {
    const ctx = context("glasshouse_relay");
    const entries = new Map<string, string>();
    const save = createSave(() => ctx.state, {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => { entries.set(key, value); },
      removeItem: (key) => { entries.delete(key); },
    });
    save.write();
    ctx.state = save.read()!;
    const scene = sceneFor(ctx, "continue");
    scene.enter!();
    await vi.waitFor(() => expect(scene.busy).toBe(0));
    expect(ctx.state.position).toEqual({ map: "glasshouse_relay", x: 7, y: 11, facing: "left" });
    expect(ctx.audio.playMusic).toHaveBeenCalledExactlyOnceWith("rootstock_appears");
    expect(ctx.state.flags.ch8_takeover).toBe(true);
  });

  it("keeps takeover music when the START menu closes", async () => {
    const ctx = context();
    const scene = sceneFor(ctx);
    await enterLobby(scene);
    vi.spyOn(Menu.prototype, "update").mockImplementation(function (this: Menu) { return this.options.indexOf("EXIT"); });
    let start = true;
    ctx.input.pressed = (button) => button === "start" && start;
    scene.update(0);
    start = false;
    await vi.waitFor(() => expect(scene.busy).toBe(0));
    expect(ctx.audio.playSfx).toHaveBeenCalledWith("menu_open");
    expect(ctx.audio.current()).toBe("rootstock_appears");
  });

  it("selects the first matching track, defaults missing flags to false, and falls back to base music", () => {
    const ctx = context();
    const scene = sceneFor(ctx);
    const def: MapDef = { ...WORLD.maps.glasshouse_relay, musicWhen: [
      { when: [{ flag: "ready", is: true }], music: "herbarium" },
      { when: [{ flag: "ready", is: false }], music: "rootstock_appears" },
      { when: [{ flag: "ready", is: false }], music: "title" },
    ] };
    expect(scene.musicFor(def)).toBe("rootstock_appears");
    ctx.state.flags.ready = true;
    expect(scene.musicFor(def)).toBe("herbarium");
    def.musicWhen = [def.musicWhen![1]];
    expect(scene.musicFor(def)).toBe("root_relay");
    delete def.musicWhen;
    expect(scene.musicFor(def)).toBe("root_relay");
  });

  it("keeps night route music while honoring a conditional non-route track", () => {
    const ctx = context();
    ctx.timeOfDay = () => "night";
    const scene = sceneFor(ctx);
    const def: MapDef = { ...WORLD.maps.route_1, musicWhen: [
      { when: [{ flag: "ready", is: true }], music: "rootstock_appears" },
    ] };
    expect(scene.musicFor(def)).toBe("route_night");
    ctx.state.flags.ready = true;
    expect(scene.musicFor(def)).toBe("rootstock_appears");
    def.musicWhen![0].music = "route";
    def.music = "rootstock_appears";
    expect(scene.musicFor(def)).toBe("route_night");
  });
});
