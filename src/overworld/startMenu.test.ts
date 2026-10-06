import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameContext, Scene } from "../contracts";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { Menu } from "../ui/kit";
import { Fader, Timers } from "../engine/gfx";
import { createOverworldScene } from "./index";
import * as startMenu from "./startMenu";

function context(): GameContext {
  const ctx = {
    state: newGameState({ world: WORLD }), world: WORLD,
    assets: { exists: () => false },
    timeOfDay: () => "day",
    audio: { playSfx: vi.fn(), playMusic: vi.fn(), current: () => null },
    input: { pressed: () => false, held: () => false, repeat: () => false },
    ui: { choose: vi.fn().mockResolvedValue(0) },
    scenes: {
      run: (factory: (done: (result: unknown) => void) => Scene) => new Promise((resolve) => {
        factory(resolve).update(0);
      }),
    },
  } as unknown as GameContext;
  ctx.state.bag.glider_seed = 1;
  ctx.state.position = { map: "route_1", x: 10, y: 36, facing: "down" };
  return ctx;
}

afterEach(() => vi.restoreAllMocks());

describe("START menu GLIDE", () => {
  it("shows GLIDE only with its key item, outdoors and without a script", () => {
    const ctx = context();
    expect(startMenu.startMenuItems(ctx)).toContain("glide");
    expect(startMenu.startMenuItems(ctx, true)).not.toContain("glide");
    ctx.state.position.map = "herbarium";
    expect(startMenu.startMenuItems(ctx)).not.toContain("glide");
    ctx.state.position.map = "route_1";
    delete ctx.state.bag.glider_seed;
    expect(startMenu.startMenuItems(ctx)).not.toContain("glide");
  });

  it("lists visited destinations and CANCEL, travels once and closes", async () => {
    const ctx = context();
    ctx.state.flags.visited_bramblegate = true;
    vi.spyOn(Menu.prototype, "update").mockImplementation(function (this: Menu) { return this.options.indexOf("GLIDE"); });
    const glide = vi.fn().mockResolvedValue(undefined);
    await startMenu.runStartMenu(ctx, { scriptRunning: false, glide });
    expect(ctx.ui.choose).toHaveBeenCalledWith(["FALLOWFIELD", "BRAMBLEGATE", "CANCEL"], { prompt: "Where shall we go?", cancel: true });
    expect(glide).toHaveBeenCalledExactlyOnceWith(WORLD.glide![0]);
  });

  it.each([-1, 1])("cancels destination choice %s without travelling", async (choice) => {
    const ctx = context();
    vi.mocked(ctx.ui.choose).mockResolvedValue(choice);
    vi.spyOn(Menu.prototype, "update").mockImplementationOnce(function (this: Menu) { return this.options.indexOf("GLIDE"); }).mockReturnValue(-1);
    const glide = vi.fn();
    await startMenu.runStartMenu(ctx, { scriptRunning: false, glide });
    expect(glide).not.toHaveBeenCalled();
  });

  it("handles having no other visited town", async () => {
    const ctx = context();
    ctx.state.position.map = "fallowfield";
    vi.mocked(ctx.ui.choose).mockResolvedValue(0);
    vi.spyOn(Menu.prototype, "update").mockImplementationOnce(function (this: Menu) { return this.options.indexOf("GLIDE"); }).mockReturnValue(-1);
    const glide = vi.fn();
    await startMenu.runStartMenu(ctx, { scriptRunning: false, glide });
    expect(ctx.ui.choose).toHaveBeenCalledWith(["CANCEL"], expect.anything());
    expect(glide).not.toHaveBeenCalled();
  });

  it("persists home and recovered town visits when the overworld loads", () => {
    const ctx = context();
    createOverworldScene(ctx);
    expect(ctx.state.flags.visited_fallowfield).toBe(true);
    expect(ctx.state.flags.visited_bramblegate).toBeUndefined();
    ctx.state.position.map = "sugarbush_greenhouse";
    createOverworldScene(ctx, { mode: "continue" });
    expect(ctx.state.flags).toMatchObject({ visited_fallowfield: true, visited_bramblegate: true, visited_sugarbush: true });
    expect(ctx.state.flags.visited_glasshouse_city).toBeUndefined();
  });

  it("fades out, plays a cue, lands facing down and fades in", async () => {
    const ctx = context();
    const events: string[] = [];
    vi.spyOn(Fader.prototype, "to").mockImplementation(async (color) => { events.push(color); });
    vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
    vi.mocked(ctx.audio.playSfx).mockImplementation((sfx) => { events.push(sfx); });
    vi.spyOn(startMenu, "runStartMenu").mockImplementation(async (_, actions) => {
      expect(actions.scriptRunning).toBe(false);
      await actions.glide(WORLD.glide![0]);
    });
    ctx.input.pressed = (button) => button === "start";
    const scene = createOverworldScene(ctx);
    scene.update(0);
    await vi.waitFor(() => expect(ctx.state.position).toEqual({ map: "fallowfield", x: 20, y: 7, facing: "down" }));
    expect(events).toEqual(["black", "run", "clear"]);
    expect(ctx.audio.playMusic).toHaveBeenCalledWith(WORLD.maps.fallowfield.music);
  });
});
