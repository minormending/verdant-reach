import { SCREEN_W } from "../contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { drawGraftCollarPlaceholder } from "./hud";

function canvas() {
  const rects: { color: string; rect: number[] }[] = [];
  const g = {
    fillStyle: "", save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
    rect: vi.fn(), clip: vi.fn(), translate: vi.fn(), scale: vi.fn(), createPattern: () => ({}),
    fillRect: (...rect: number[]) => rects.push({ color: g.fillStyle, rect }),
  };
  return { g, rects };
}

const LEATHER = ["#a07040", "#704828", "#40281a"];
const BRASS = ["#e0b048", "#a07818"];
const WIRE = ["#d8d8e0", "#888898"];

describe("graft collar overlay", () => {
  it("clamps a leather and brass collar with a wire splint across the lower third", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, ENEMY_HOME.x, ENEMY_HOME.y, { clipBottom: ENEMY_HOME.y + 56 });
    expect(g.translate).toHaveBeenCalledWith(ENEMY_HOME.x, ENEMY_HOME.y);
    expect(g.rect).toHaveBeenCalledWith(0, 0, SCREEN_W, ENEMY_HOME.y + 56);
    expect(g.clip).toHaveBeenCalled();
    expect(g.restore).toHaveBeenCalled();
    // every pixel run is one row tall and sits inside the sprite's lower half
    for (const { rect: [x, y, w, h] } of rects) {
      expect(h).toBe(1);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(56);
      expect(y).toBeGreaterThanOrEqual(28);
      expect(y).toBeLessThan(56);
    }
    const colors = new Set(rects.map((r) => r.color));
    for (const c of ["#181818", ...LEATHER, ...BRASS, ...WIRE]) expect(colors).toContain(c);
    // the strap itself (leather) lies in the lower third, the splint runs past it
    const strap = rects.filter((r) => LEATHER.includes(r.color)).map((r) => r.rect[1]);
    expect(Math.min(...strap)).toBeGreaterThanOrEqual(56 * 2 / 3 - 1);
    const wire = rects.filter((r) => WIRE.includes(r.color)).map((r) => r.rect[1]);
    expect(Math.min(...wire)).toBeLessThan(Math.min(...strap));
    expect(Math.max(...wire)).toBeGreaterThan(Math.max(...strap));
  });

  it("follows scaling, wilt drop and silhouette tint", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, ENEMY_HOME.x, ENEMY_HOME.y, { scale: 0.5, drop: 8, silhouette: "#f8f8f8" });
    expect(g.translate).toHaveBeenCalledWith(ENEMY_HOME.x + 14, ENEMY_HOME.y + 36);
    expect(g.scale).toHaveBeenCalledWith(0.5, 0.5);
    expect(rects.length).toBeGreaterThan(0);
    expect(rects.every((r) => r.color === "#f8f8f8")).toBe(true);
  });

  it("draws nothing at zero scale", () => {
    const { g, rects } = canvas();
    drawGraftCollarPlaceholder(g as unknown as CanvasRenderingContext2D, ENEMY_HOME.x, ENEMY_HOME.y, { scale: 0 });
    expect(rects).toEqual([]);
    expect(g.save).not.toHaveBeenCalled();
  });
});

import type { GameContext, SpeciesId } from "../contracts";
import { SCREEN_H, TEXTBOX } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "./logic/stats";
import { seeded } from "./logic/rng";
import { drawEnemyHud, drawPlayerHud, drawStatWindow, drawBackdrop, drawVersusBanner, newHud } from "./hud";
import { ENEMY_HOME, PLAYER_HOME, PLAYER_HUD_AREA, COMMAND_AREA, MOVE_AREA, MOVE_INFO_AREA } from "./layout";
import { measureText, wrapText } from "../ui/font";
import { Menu } from "../screens/kit/widgets";
import { Fx } from "./fx";

function hudContext() {
  const drawText = vi.fn(), drawWindow = vi.fn();
  const g = {
    ...canvas().g, drawImage() {}, createPattern: () => ({}),
  } as unknown as CanvasRenderingContext2D;
  const ctx = {
    data: DATA, assets: { image: () => ({ width: 56, height: 56 }) },
    audio: { playSfx() {} }, ui: { drawText, drawWindow, measure: measureText, wrap: wrapText },
  } as unknown as GameContext;
  return { ctx, g, drawText, drawWindow };
}

function labelsFit(calls: unknown[][]) {
  for (const [, text, x, y] of calls as [unknown, string, number, number][]) {
    expect(x, text).toBeGreaterThanOrEqual(0);
    expect(x + measureText(text), text).toBeLessThanOrEqual(SCREEN_W);
    expect(y, text).toBeGreaterThanOrEqual(0);
    expect(y + 8, text).toBeLessThanOrEqual(SCREEN_H);
  }
}

describe("widescreen battle geometry", () => {
  it("leaves the two native-size creatures clear of the HUD and command rail", () => {
    const sprites = [ENEMY_HOME, PLAYER_HOME].map(p => ({ ...p, w: 64, h: 64 }));
    const huds = [{ x: 4, y: 4, w: 122, h: 38 }, { x: PLAYER_HUD_AREA.x + 2, y: PLAYER_HUD_AREA.y - 3, w: PLAYER_HUD_AREA.w - 4, h: PLAYER_HUD_AREA.h + 3 }];
    const controls = [COMMAND_AREA, MOVE_AREA, MOVE_INFO_AREA, { x: 88, y: 98, w: SCREEN_W - 88, h: 26 }];
    const overlaps = (a: typeof controls[number], b: typeof controls[number]) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const sprite of sprites) {
      expect(sprite.x + sprite.w).toBeLessThanOrEqual(SCREEN_W);
      expect(sprite.y + sprite.h).toBeLessThan(TEXTBOX.y);
      for (const hud of huds) expect(overlaps(sprite, hud)).toBe(false);
    }
    for (const panel of controls) {
      expect(panel.y + panel.h).toBeLessThanOrEqual(SCREEN_H);
      for (const subject of [...sprites, ...huds]) expect(overlaps(panel, subject)).toBe(false);
    }
  });

  it("fits every species name, three-digit level/HP and status in both HUDs", () => {
    const { ctx, g, drawText } = hudContext();
    for (const species of Object.keys(DATA.species) as SpeciesId[]) {
      const q = createQuickened(DATA, species, 100, seeded(1));
      const hud = { ...newHud(), q, visible: true, hp: q.hp, level: 100, status: "blight" as const, exp: 0.5, flash: 4 };
      drawEnemyHud(ctx, g, hud, true);
      drawPlayerHud(ctx, g, hud);
    }
    labelsFit(drawText.mock.calls);
    drawStatWindow(ctx, g, createQuickened(DATA, "great_oak", 100, seeded(1)).stats);
    labelsFit(drawText.mock.calls);
  });

  it("fits battle commands, every move label and settled versus banners", () => {
    const { ctx, g, drawText } = hudContext();
    new Menu(ctx, ["FIGHT", "BAG", "QUICKENED", "RUN"], { ...COMMAND_AREA, cols: 2 }).draw(g);
    for (const move of Object.values(DATA.moves)) {
      const menu = new Menu(ctx, [move.name.toUpperCase(), "-", "-", "-"], { ...MOVE_AREA, spacing: 8 });
      menu.draw(g);
      for (let i = 0; i < 4; i++) expect(menu.itemPos(i).y + 8).toBeLessThanOrEqual(menu.opts.y + menu.h - 4);
    }
    drawVersusBanner(ctx, g, "leader", "gardener", "CONSERVATORY", "DR. CALLOWAY", 40, 80);
    labelsFit(drawText.mock.calls);
  });

  it("covers the entire canvas with flash and each backdrop", () => {
    const { ctx } = hudContext();
    const { g, rects } = canvas();
    vi.stubGlobal("document", { createElement: () => ({ width: 2, height: 2, getContext: () => g }) });
    const fx = new Fx();
    fx.flashScreen("#ffffff", 2);
    fx.drawFlash(g as unknown as CanvasRenderingContext2D);
    expect(rects.some(({ rect }) => rect.join() === [0, 0, SCREEN_W, SCREEN_H].join())).toBe(true);
    for (const kind of ["grass", "bog", "water", "indoor", "night", "glasshouse"] as const) {
      rects.length = 0;
      drawBackdrop(ctx, g as unknown as CanvasRenderingContext2D, kind, 0);
      expect(rects.some(({ rect: [x, y, w, h] }) => x === 0 && w === SCREEN_W && y + h === SCREEN_H)).toBe(true);
    }
  });
});

afterEach(() => vi.unstubAllGlobals());
