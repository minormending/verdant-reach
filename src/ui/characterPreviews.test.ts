import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameContext, MapDef } from "../contracts";
import { SCREEN_W, TEXTBOX, characterPath } from "../contracts";
import { tallCharacter } from "../art/character.fixture";
import { createSceneStack } from "../engine/core";
import { renderWorldPreview } from "../world/dev";
import { nameEntry } from "./nameEntry";
import { runNewGame } from "./newgame";
import { trainerCard } from "./widgets";

vi.mock("./kit", async (importOriginal) => ({
  ...await importOriginal<typeof import("./kit")>(),
  drawText: vi.fn(),
}));

afterEach(() => vi.unstubAllGlobals());

function setup(frame: typeof tallCharacter.frame = tallCharacter.frame) {
  const sheet = { width: 48, height: 4 * frame[1] } as HTMLImageElement;
  const assets = {
    image: (path: string) => path === characterPath("player") || path === characterPath("vale") ? sheet : undefined,
    has: () => false,
    characterFrame: vi.fn(() => frame),
  };
  const scenes = createSceneStack();
  const ctx = {
    assets, scenes,
    input: { pressed: () => false, repeat: () => false },
    audio: { playMusic: vi.fn() },
    ui: { say: vi.fn(() => new Promise<void>(() => {})) },
    state: { playerName: "ROWAN", money: 3000, herbarium: { caught: [] }, playTimeMs: 0, marks: [] },
    world: { maps: {}, newGame: { map: "fallowfield", x: 0, y: 0, facing: "down" } },
  } as unknown as GameContext;
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  const translate = vi.fn();
  const g = { drawImage, fillRect, translate, save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D;
  const tick = (n: number) => { for (let i = 0; i < n; i++) scenes.top()!.update(1000 / 60); };
  return { ctx, scenes, sheet, g, drawImage, fillRect, translate, tick };
}

/** Check the full crop, integer pixel scale, unchanged feet and clear UI bounds. */
function expectPortrait(
  call: unknown[], height: number, baseline: number,
  box: { x: number; y: number; w: number; h: number },
) {
  const [, , , sw, sh, dx, dy, dw, dh] = call as number[];
  expect([sw, sh]).toEqual([16, height]);
  expect(dw / sw).toBe(dh / sh);
  expect(Number.isInteger(dw / sw)).toBe(true);
  expect(dw / sw).toBeGreaterThanOrEqual(1);
  expect(dy + dh).toBe(baseline);
  expect(dx).toBeGreaterThanOrEqual(box.x);
  expect(dy).toBeGreaterThanOrEqual(box.y);
  expect(dx + dw).toBeLessThanOrEqual(box.x + box.w);
  expect(dy + dh).toBeLessThanOrEqual(box.y + box.h);
}

describe("character previews", () => {
  it("trainer card fits a 16x32 animated frame in its portrait box beside the stats", () => {
    const { ctx, scenes, g, sheet, drawImage, tick } = setup();
    void trainerCard(ctx);
    tick(90); // stepB column
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenCalledWith(sheet, 32, 0, 16, 32, 124, 30, 16, 32);
    expectPortrait(drawImage.mock.calls[0], 32, 62, { x: 116, y: 30, w: 32, h: 32 });
    expect(ctx.assets.characterFrame).toHaveBeenCalledWith("player");
  });

  it("name entry fits a 16x32 animated frame beside the title and name field", () => {
    const { ctx, scenes, g, sheet, drawImage, tick } = setup();
    void nameEntry(ctx, { title: "YOUR NAME?", max: 7, defaultName: "ROWAN", sprite: "vale" });
    tick(72); // stepB column
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenCalledWith(sheet, 32, 0, 16, 32, SCREEN_W / 2 - 64, 8, 16, 32);
    expectPortrait(drawImage.mock.calls[0], 32, 40, { x: SCREEN_W / 2 - 72, y: 8, w: 32, h: 32 });
    expect(ctx.assets.characterFrame).toHaveBeenCalledWith("vale");
  });

  it("name entry keeps a narrow tall sheet static while cropping its full height", () => {
    const { ctx, scenes, g, sheet, drawImage, tick } = setup();
    sheet.width = 16;
    void nameEntry(ctx, { title: "YOUR NAME?", max: 7, defaultName: "ROWAN" });
    tick(72);
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenCalledWith(sheet, 0, 0, 16, 32, SCREEN_W / 2 - 64, 8, 16, 32);
  });

  it("new-game intro fits the full 16x32 portrait above its dialogue at 1x", async () => {
    const { ctx, scenes, g, sheet, drawImage, tick } = setup();
    void runNewGame(ctx);
    for (let i = 0; i < 48; i++) { tick(1); await Promise.resolve(); }
    expect(ctx.ui.say).toHaveBeenCalled();
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenCalledWith(sheet, 0, 0, 16, 32, SCREEN_W / 2 - 8, (TEXTBOX.y - 64) / 2 + 24, 16, 32);
    expectPortrait(drawImage.mock.calls[0], 32, (TEXTBOX.y - 64) / 2 + 56, { x: SCREEN_W / 2 - 24, y: (TEXTBOX.y - 64) / 2 + 8, w: 48, h: 48 });
    expect(ctx.assets.characterFrame).toHaveBeenCalledWith("vale");
  });

  it.each([1, 0])("world overview anchors 16x32 NPC feet on row %i and avoids canvas clipping", (y) => {
    const { ctx, g, sheet, drawImage, translate } = setup();
    const map = previewMap(y);
    const canvas = { style: {}, getContext: () => g } as unknown as HTMLCanvasElement;
    vi.stubGlobal("location", { search: "" });
    renderWorldPreview(ctx, map, canvas, 2);
    const padding = y === 0 ? 16 : 0;
    expect(translate).toHaveBeenCalledWith(0, padding);
    expect(drawImage).toHaveBeenCalledWith(sheet, 0, 0, 16, 32, 16, (y + 1) * 16 - 32, 16, 32);
    const call = [...drawImage.mock.calls[0]];
    call[6] += padding;
    expectPortrait(call, 32, (y + 1) * 16 + padding, { x: 0, y: 0, w: canvas.width, h: canvas.height });
    expect(canvas.height).toBe(48 + padding);
    expect(canvas.style.height).toBe(`${canvas.height * 2}px`);
    expect(ctx.assets.characterFrame).toHaveBeenCalledWith("vale");
  });

  it.each(["metadata", "legacy"])("keeps integer UI portrait scales after centring with %s assets", async (kind) => {
    const { ctx, scenes, g, sheet, drawImage, tick } = setup([16, 16]);
    if (kind === "legacy") delete ctx.assets.characterFrame;
    void trainerCard(ctx);
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenLastCalledWith(sheet, 0, 0, 16, 16, 116, 30, 32, 32);
    void nameEntry(ctx, { title: "YOUR NAME?", max: 7, defaultName: "ROWAN" });
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenLastCalledWith(sheet, 0, 0, 16, 16, SCREEN_W / 2 - 72, 8, 32, 32);
    void runNewGame(ctx);
    for (let i = 0; i < 48; i++) { tick(1); await Promise.resolve(); }
    scenes.top()!.draw(g);
    expect(drawImage).toHaveBeenLastCalledWith(sheet, 0, 0, 16, 16, SCREEN_W / 2 - 24, (TEXTBOX.y - 64) / 2 + 8, 48, 48);
  });

  it("keeps today's 16x16 world overview and canvas dimensions", () => {
    const { ctx, g, sheet, drawImage, translate } = setup([16, 16]);
    const canvas = { style: {}, getContext: () => g } as unknown as HTMLCanvasElement;
    vi.stubGlobal("location", { search: "" });
    renderWorldPreview(ctx, previewMap(0), canvas, 2);
    expect(drawImage).toHaveBeenCalledWith(sheet, 0, 0, 16, 16, 16, 0, 16, 16);
    expect(translate).toHaveBeenCalledWith(0, 0);
    expect([canvas.width, canvas.height]).toEqual([48, 48]);
    expect([canvas.style.width, canvas.style.height]).toEqual(["96px", "96px"]);
  });
});

function previewMap(y: number): MapDef {
  return {
    id: "fallowfield", name: "Preview fixture", outdoor: false, music: "herbarium",
    tiles: ["...", "...", "..."], legend: { ".": "floor_wood" }, border: "void",
    structures: [], warps: [], triggers: [], signs: [],
    npcs: [{ id: "vale", sprite: "vale", x: 1, y, facing: "down" }],
  };
}
