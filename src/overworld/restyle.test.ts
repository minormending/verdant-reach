import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtImage, Assets, GameContext, MapDef, Scene } from "../contracts";
import { STRUCTURES, characterPath, structurePath } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { newGameState } from "../save";
import { ArtRegistry } from "../art/registry";
import { tallCharacterRaw } from "../art/character.fixture";
import { Actor } from "./actor";
import { createOverworldScene } from "./index";
import { buildMap, tryMove, warpAt } from "./map";
import { characterTileY, characterTop, drawCharacter, eraseCharacter, isStaticObject } from "./render";
import { drawCell } from "./tilelayer";
import { MASK, TileCatalog, autotileMask } from "./autotile";

vi.mock("../ui/kit", async (original) => ({
  ...await original<typeof import("../ui/kit")>(), drawText: vi.fn(),
}));

const originalWell = STRUCTURES.well;
const originalHouse = STRUCTURES.house_small;
afterEach(() => {
  STRUCTURES.well = originalWell;
  STRUCTURES.house_small = originalHouse;
  vi.restoreAllMocks();
});

const def: MapDef = {
  id: "route_1", name: "TEST", outdoor: false, music: "route", border: "wall",
  tiles: Array(9).fill(".........."), legend: { ".": "floor_wood" },
  structures: [{ key: "well", x: 3, y: 2 }], warps: [], npcs: [], signs: [], triggers: [],
};
const tallSheet = { width: 48, height: 128 } as ArtImage;
const propImage = { width: 16, height: 32 } as ArtImage;

function tallAssets(): Assets {
  const reg = new ArtRegistry();
  reg.raw = [tallCharacterRaw];
  reg.setActivePacks([]);
  return {
    characterFrame: (id) => reg.characterFrame(id),
    image: (p) => p === characterPath("player") ? tallSheet : p === structurePath("well") ? propImage : undefined,
    has: (p) => p === characterPath("player") || p === structurePath("well"),
    exists: (p) => p === characterPath("player") || p === structurePath("well"),
    loadAll: async () => {},
  };
}
function canvas() {
  return { drawImage: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D;
}
function sceneAt(y: number, assets = tallAssets()) {
  const world = { ...WORLD, maps: { ...WORLD.maps, route_1: def } };
  const state = newGameState({ world });
  state.position = { map: "route_1", x: 3, y, facing: "down" };
  const ctx = { state, world, data: DATA, rng: () => 0.5, assets, timeOfDay: () => "day" } as unknown as GameContext;
  const scene = createOverworldScene(ctx, { mode: "none" }) as Scene & {
    player: Actor; camera: { following: boolean; x: number; y: number };
    transition: { kind: "wild" | null; t: number };
  };
  scene.camera = { following: false, x: 0, y: 0 };
  return scene;
}

describe("tall character rendering", () => {
  it("crops the declared row/column and draws 16px above the occupied tile", () => {
    const g = canvas(), assets = tallAssets();
    drawCharacter(g, assets, "player", 2, "left", 48, 64);
    expect(g.drawImage).toHaveBeenCalledWith(tallSheet, 32, 64, 16, 32, 48, 48, 16, 32);
    eraseCharacter(g, assets, "player", 2, "left", 48, 64);
    expect(g.drawImage).toHaveBeenLastCalledWith(tallSheet, 32, 64, 16, 32, 48, 48, 16, 32);
    expect(g.globalCompositeOperation).toBe("source-over");
    expect(characterTop(assets, "player", characterTileY(assets, "player", 64))).toBe(48);
  });

  it("preserves GBC frame coordinates and the narrower-than-48 static-object rule", () => {
    const g = canvas();
    const sheet = { width: 48, height: 64 } as ArtImage;
    const assets = { ...tallAssets(), characterFrame: undefined, image: () => sheet };
    drawCharacter(g, assets, "player", 2, "right", 48, characterTileY(assets, "player", 64));
    expect(g.drawImage).toHaveBeenLastCalledWith(sheet, 32, 48, 16, 16, 48, 60, 16, 16);
    const object = { width: 16, height: 32 } as ArtImage;
    assets.image = () => object;
    drawCharacter(g, assets, "player", 2, "right", 48, 64);
    expect(g.drawImage).toHaveBeenLastCalledWith(object, 0, 16, 16, 16, 48, 64, 16, 16);
    expect(isStaticObject(assets, "player")).toBe(true);
  });

  it.each([2, 3, 4])("sorts by feet against the prop footprint base at actor row %i", (y) => {
    // The solid base is in the image's middle row, not its bottom row.
    STRUCTURES.well = { w: 1, h: 3, footprint: { x: 0, y: 1, w: 1, h: 1 } };
    const g = canvas(), scene = sceneAt(y);
    scene.draw(g);
    const images = vi.mocked(g.drawImage).mock.calls.map((c) => c[0]).filter((i) => i === propImage || i === tallSheet);
    expect(images).toEqual(y === 2 ? [tallSheet, propImage] : [propImage, tallSheet]);
  });

  it("draws floor props before even an actor with feet above the prop", () => {
    STRUCTURES.well = { w: 1, h: 2, layer: "floor" };
    const g = canvas();
    sceneAt(1).draw(g);
    const images = vi.mocked(g.drawImage).mock.calls.map((c) => c[0]).filter((i) => i === propImage || i === tallSheet);
    expect(images).toEqual([propImage, tallSheet]);
  });

  it("keeps hops, fly lift, emotes and the battle transition attached to the tall frame", () => {
    const scene = sceneAt(4), g = canvas();
    void scene.player.begin("right", 16, { hop: true });
    scene.player.step!.t = 8;
    const { px, py, lift } = scene.player.pixel();
    scene.player.emote = { kind: "!", t: 8 };
    scene.transition.kind = "wild";
    scene.transition.t = 0;
    scene.draw(g);
    expect(g.drawImage).toHaveBeenCalledWith(tallSheet, 0, 96, 16, 32, px, py - 16 - lift, 16, 32);
    // The emote sits above the character's head, not its occupied tile.
    expect(g.fillRect).toHaveBeenCalledWith(px + 1, py - 32, 14, 14);
    expect(g.fillRect).toHaveBeenCalledWith(px + 4 + (lift > 6 ? 2 : 1), py + 13, 8 - (lift > 6 ? 4 : 2), 3);
    scene.player.step = null;
    scene.player.fly = { t: 10, dx: 1 };
    vi.mocked(g.drawImage).mockClear();
    scene.draw(g);
    const flyLift = Math.round(12 + Math.sin(10 / 4) * 2);
    expect(g.drawImage).toHaveBeenCalledWith(tallSheet, 32, 96, 16, 32, scene.player.x * 16 + 17, scene.player.y * 16 - 16 - flyLift, 16, 32);
  });
});

describe("prop collision", () => {
  it("lets the player walk behind a 1x2 plant's top half and blocks its base", () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 1, w: 1, h: 1 } };
    const m = buildMap(def);
    expect(tryMove(m, 2, 2, "right")).toEqual({ kind: "walk", x: 3, y: 2 });
    expect(tryMove(m, 2, 3, "right")).toEqual({ kind: "blocked", reason: "wall" });
  });

  it("keeps gaps between opaque floor supports walkable", () => {
    STRUCTURES.well = { w: 3, h: 2, footprint: { x: 0, y: 1, w: 3, h: 1, columns: [0, 2] } };
    const m = buildMap(def);
    expect(tryMove(m, 4, 4, "up")).toEqual({ kind: "walk", x: 4, y: 3 });
    expect(tryMove(m, 3, 4, "up")).toEqual({ kind: "blocked", reason: "wall" });
    expect(tryMove(m, 5, 4, "up")).toEqual({ kind: "blocked", reason: "wall" });
  });

  it("reads a sign on the prop base when A is pressed facing it", async () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 1, w: 1, h: 1 } };
    const map = { ...def, signs: [{ x: 3, y: 3, text: "Pressed leaves." }] };
    const world = { ...WORLD, maps: { ...WORLD.maps, route_1: map } };
    const state = newGameState({ world });
    state.position = { map: "route_1", x: 3, y: 4, facing: "up" };
    const say = vi.fn().mockResolvedValue(undefined);
    const ctx = { state, world, data: DATA, rng: () => 0.5, assets: tallAssets(), timeOfDay: () => "day",
      input: { pressed: (button: string) => button === "a", held: () => false, repeat: () => false },
      audio: { playSfx: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null },
      ui: { say } } as unknown as GameContext;
    const scene = createOverworldScene(ctx, { mode: "none" }) as Scene & { player: Actor };
    scene.player.facing = "right";
    scene.update(0);
    expect(say).not.toHaveBeenCalled();
    scene.player.facing = "up";
    scene.update(0);
    await vi.waitFor(() => expect(say).toHaveBeenCalledWith("Pressed leaves."));
  });

  it("keeps a floor rug walkable, even with an explicit footprint", () => {
    STRUCTURES.well = { w: 1, h: 2, footprint: { x: 0, y: 1, w: 1, h: 1 }, layer: "floor" };
    const m = buildMap(def);
    expect(m.solid.size).toBe(0);
    expect(tryMove(m, 2, 3, "right")).toEqual({ kind: "walk", x: 3, y: 3 });
  });

  it.each([1, 2])("keeps a door working with footprint row %i (inside or outside it)", (y) => {
    STRUCTURES.house_small = { ...originalHouse, footprint: { x: 0, y, w: 4, h: 1 } };
    const m = buildMap({ ...def, structures: [{ key: "house_small", x: 2, y: 1 }],
      warps: [{ x: 3, y: 3, to: "herbarium", toX: 1, toY: 1 }] });
    expect(tryMove(m, 3, 4, "up")).toEqual({ kind: "walk", x: 3, y: 3 });
    expect(warpAt(m, 3, 3)?.to).toBe("herbarium");
  });
});

describe("wall faces", () => {
  it("selects upper mask 0 and lower mask N, including a north map edge", () => {
    const m = buildMap({ ...def, tiles: ["WWW", "FFF", "FFF", "..."], legend: { W: "wall", F: "wall_face", ".": "floor_wood" }, structures: [] });
    const cat = new TileCatalog({ has: (p) => /^assets\/tiles\/wall_face(?:@[01])?\.png$/.test(p) });
    expect(autotileMask(m, 1, 1)).toBe(0);
    expect(autotileMask(m, 1, 2)).toBe(MASK.N);
    expect(cat.resolve("wall_face", autotileMask(m, 1, 1), 1, 1).path).toBe("assets/tiles/wall_face@0.png");
    expect(cat.resolve("wall_face", autotileMask(m, 1, 2), 1, 2).path).toBe("assets/tiles/wall_face@1.png");
    const edge = buildMap({ ...m.def, tiles: ["FFF", "FFF"] });
    expect(autotileMask(edge, 1, 0)).toBe(0);
  });

  it("draws complete procedural upper/lower fallbacks without placeholder pixels", () => {
    const assets: Assets = { image: () => undefined, has: () => false, exists: () => false, loadAll: async () => {} };
    const g = canvas();
    const cat = new TileCatalog({ has: () => false });
    expect(drawCell(g, assets, cat.resolve("wall_face", 0, 0, 0), 0, 0, false)).toBe(true);
    const upper = vi.mocked(g.fillRect).mock.calls.slice();
    vi.mocked(g.fillRect).mockClear();
    expect(drawCell(g, assets, cat.resolve("wall_face", 1, 0, 1), 0, 16, false)).toBe(true);
    expect(g.fillRect).toHaveBeenCalledWith(0, 28, 16, 4);
    expect(upper).not.toEqual(vi.mocked(g.fillRect).mock.calls);
    expect(g.fillStyle).not.toBe("#f800f8");
  });
});
