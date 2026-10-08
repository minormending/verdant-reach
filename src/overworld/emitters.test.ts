import { describe, expect, it, vi } from "vitest";
import type { Dir, GameContext, MapId, Scene } from "../contracts";
import { DATA } from "../data";
import { createSave, newGameState } from "../save";
import { WORLD } from "../world";
import type { Actor } from "./actor";
import { createOverworldScene } from "./index";
import { rowFor } from "./render";
import { runScript, type ScriptHost } from "./script";

type TestScene = Scene & {
  npcs: Actor[];
  host: ScriptHost;
  loadMap(map: MapId, x: number, y: number, facing: Dir): void;
  interact(): boolean;
};

describe("Flag-driven puzzle object rows", () => {
  it.each(["lever", "valve"] as const)("preserves the %s:<flag> id convention", (sprite) => {
    expect(rowFor(`${sprite}:switched`, sprite, "up", {})).toBe("down");
    expect(rowFor(`${sprite}:switched`, sprite, "down", { switched: true })).toBe("up");
    expect(rowFor(`${sprite}:switched`, sprite, "up", { switched: true }, undefined, "other")).toBe("down");
  });

  it.each([1, 2, 3])("renders emitter %s UP after switching, re-entry, save/Continue and talking again", async (n) => {
    const id = `emitter_${n}`;
    const def = WORLD.maps.rootstock_hideout_1.npcs.find((npc) => npc.id === id)!;
    const state = newGameState({ world: WORLD });
    state.position = { map: "rootstock_hideout_1", x: def.x, y: def.y + 1, facing: "up" };
    Object.assign(state.flags, { lodge_stair_open: true, [`beat_grunt_b1_${n}`]: true });
    const ctx = {
      state, world: WORLD, data: DATA, rng: () => 0.5, timeOfDay: () => "day",
      // A small four-row sheet lets the real scene draw without a browser canvas.
      assets: { exists: () => false, image: () => ({ width: 16, height: 64 }) },
      audio: { playSfx: vi.fn() },
      ui: { say: vi.fn().mockResolvedValue(undefined) },
    } as unknown as GameContext;
    const scene = createOverworldScene(ctx, { mode: "none" }) as TestScene;
    const canvas = {
      save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const expectRow = (s: TestScene, row: Dir) => {
      s.draw(canvas);
      expect(s.npcs.find((npc) => npc.id === id)!.lastRow).toBe(row);
    };
    expectRow(scene, "down");
    scene.host.wait = vi.fn().mockResolvedValue(undefined);
    await runScript(scene.host, def.script!);
    expect(state.flags[`${id}_off`]).toBe(true);
    expectRow(scene, "up");

    scene.loadMap("larchmere_lodge", 10, 3, "down");
    scene.loadMap("rootstock_hideout_1", def.x, def.y + 1, "up");
    expect(scene.npcs.find((npc) => npc.id === id)!.facing).toBe("down");
    expectRow(scene, "up");

    const entries = new Map<string, string>();
    const save = createSave(() => state, {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => { entries.set(key, value); },
      removeItem: (key) => { entries.delete(key); },
    });
    save.write();
    const loaded = save.read()!;
    expect(loaded.flags[`${id}_off`]).toBe(true);
    const resumed = createOverworldScene({ ...ctx, state: loaded }, { mode: "continue" }) as TestScene;
    expectRow(resumed, "up");
    expect(resumed.interact()).toBe(true);
    for (let tick = 0; tick < 10; tick++) await Promise.resolve();
    expect(ctx.ui.say).toHaveBeenLastCalledWith(expect.stringContaining("EMITTER is silent"), undefined);
    expect(loaded.flags[`${id}_off`]).toBe(true);
    expectRow(resumed, "up");
    expect(ctx.audio.playSfx).toHaveBeenCalledExactlyOnceWith("select");
  });
});
