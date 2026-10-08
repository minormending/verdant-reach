import { afterEach, describe, expect, it, vi } from "vitest";
import type { FieldMove, GameContext, MapDef, Scene, WorldData } from "../contracts";
import { FIELD_MOVES, tilePath } from "../contracts";
import { createQuickened } from "../battle";
import { DATA } from "../data";
import { Timers } from "../engine/gfx";
import { createSave, newGameState } from "../save";
import { FIELD_MOVE_FX, fieldMoveFlag, fieldMoveOf } from "./fieldmove";
import { createOverworldScene } from "./index";
import { buildMap, isWalkable, refreshLegend, tileAt, tryMove, type MapRuntime } from "./map";
import { TileCatalog } from "./autotile";
import { TileLayer } from "./tilelayer";

const gap: MapDef = {
  id: "route_1", name: "ROOT TEST", outdoor: true, music: "route", border: "void",
  tiles: ["#####", "#.G.#", "#####"],
  legend: { "#": "wall", ".": "grass", G: "root_gap" },
  structures: [], warps: [], npcs: [], signs: [], triggers: [],
};
const bridgedFlag = "bridged_route_1_2_1";

type TestScene = Scene & {
  map: MapRuntime;
  interact(): boolean;
  useFieldMove(move: FieldMove, x: number, y: number): Promise<void>;
};

function setup(yes = true) {
  const world = {
    maps: { route_1: structuredClone(gap) }, scripts: { start: [] }, trainers: {},
    newGame: { map: "route_1", x: 1, y: 1, facing: "right", script: "start" },
  } as unknown as WorldData;
  const state = newGameState({ world });
  state.party = [createQuickened(DATA, "oak_acorn", 5, () => 0)];
  const ctx = {
    state, world, data: DATA, assets: {}, rng: () => 0, timeOfDay: () => "day",
    input: { pressed: () => false, held: () => false, repeat: () => false },
    audio: { playSfx: vi.fn() },
    ui: { say: vi.fn().mockResolvedValue(undefined), yesNo: vi.fn().mockResolvedValue(yes) },
  } as unknown as GameContext;
  const scene = createOverworldScene(ctx, { mode: "none" }) as TestScene;
  return { ctx, scene };
}

afterEach(() => vi.restoreAllMocks());

describe("ROOT BRIDGE", () => {
  it("registers the move, blocking gap, and walkable bridge", () => {
    expect(FIELD_MOVES.rootbridge).toEqual({ item: "fig_root" });
    expect(fieldMoveOf("root_gap")).toBe("rootbridge");
    expect(fieldMoveOf("root_bridge")).toBeUndefined();
    expect(fieldMoveFlag("rootbridge", "route_1", 2, 1)).toBe(bridgedFlag);
    const map = buildMap(gap);
    expect(tryMove(map, 1, 1, "right").kind).toBe("blocked");
    refreshLegend(map, { [bridgedFlag]: true });
    expect(tryMove(map, 1, 1, "right")).toEqual({ kind: "walk", x: 2, y: 1 });
    const layer = new TileLayer({} as GameContext["assets"], new TileCatalog({ has: () => true }));
    expect(layer.resolve(map, 2, 1)).toMatchObject({ key: "root_bridge", path: tilePath("root_bridge") });
  });

  it("does not bridge a gap with a PRUNE flag, or prune a bramble with a bridge flag", () => {
    const def = { ...gap, tiles: ["GB"], legend: { G: "root_gap", B: "bramble_bush" } } as MapDef;
    const map = buildMap(def);
    refreshLegend(map, { pruned_route_1_0_0: true, bridged_route_1_1_0: true });
    expect(tileAt(map, 0, 0)).toBe("root_gap");
    expect(tileAt(map, 1, 0)).toBe("bramble_bush");
  });

  it("facing a gap without Fig Root explains the obstacle without prompting", async () => {
    const { ctx, scene } = setup();
    expect(scene.interact()).toBe(true);
    await vi.waitFor(() => expect(ctx.ui.say).toHaveBeenCalledWith(FIELD_MOVE_FX.rootbridge.locked));
    expect(ctx.ui.yesNo).not.toHaveBeenCalled();
    expect(ctx.state.flags[bridgedFlag]).toBeUndefined();
    expect(isWalkable(scene.map, 2, 1)).toBe(false);
  });

  it("asks on facing-A with Fig Root and keeps the gap on no", async () => {
    const { ctx, scene } = setup(false);
    ctx.state.bag.fig_root = 1;
    expect(scene.interact()).toBe(true);
    await vi.waitFor(() => expect(ctx.ui.yesNo).toHaveBeenCalledWith("A narrow gap. ROOT BRIDGE it?"));
    expect(ctx.state.flags[bridgedFlag]).toBeUndefined();
    expect(tileAt(scene.map, 2, 1)).toBe("root_gap");
  });

  it("confirms on yes and keeps the bridge through save serialization and Continue", async () => {
    const { ctx, scene } = setup();
    ctx.state.bag.fig_root = 1;
    vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
    expect(scene.interact()).toBe(true);
    await vi.waitFor(() => expect(ctx.state.flags[bridgedFlag]).toBe(true));
    expect(ctx.ui.yesNo).toHaveBeenCalledWith(FIELD_MOVE_FX.rootbridge.prompt);
    expect(ctx.ui.say).toHaveBeenCalledWith("OAK ACORN used ROOT BRIDGE!");
    refreshLegend(scene.map, ctx.state.flags);
    expect(tileAt(scene.map, 2, 1)).toBe("root_bridge");
    expect(isWalkable(scene.map, 2, 1)).toBe(true);
    expect(ctx.state.bag.fig_root).toBe(1);
    expect(ctx.world.maps.route_1.tiles).toEqual(gap.tiles);
    const entries = new Map<string, string>();
    const storage = {
      getItem: (k: string) => entries.get(k) ?? null,
      setItem: (k: string, v: string) => { entries.set(k, v); },
      removeItem: (k: string) => { entries.delete(k); },
    };
    const save = createSave(() => ctx.state, storage);
    save.write();
    const loaded = save.read();
    expect(loaded?.flags[bridgedFlag]).toBe(true);
    delete loaded!.bag.fig_root; // completed bridges no longer depend on carrying the root
    const continued = createOverworldScene({ ...ctx, state: loaded! }, { mode: "continue" }) as TestScene;
    continued.update(0);
    expect(tileAt(continued.map, 2, 1)).toBe("root_bridge");
    expect(tryMove(continued.map, 1, 1, "right")).toEqual({ kind: "walk", x: 2, y: 1 });
  });
});
