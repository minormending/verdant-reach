import { expect, it } from "vitest";
import { FONT_H, FONT_W, SCREEN_H, SCREEN_W, TEXTBOX, TILE, VIEW_TILES_X, VIEW_TILES_Y } from "./constants";

it("defines a 320×180 canvas, fractional tile view and bottom 36×3 dialogue box", () => {
  expect([SCREEN_W, SCREEN_H]).toEqual([320, 180]);
  expect([VIEW_TILES_X, VIEW_TILES_Y]).toEqual([20, 11.25]);
  expect(VIEW_TILES_X * TILE).toBe(SCREEN_W);
  expect(VIEW_TILES_Y * TILE).toBe(SCREEN_H);
  expect([FONT_W, FONT_H]).toEqual([8, 8]);
  expect(TEXTBOX).toEqual({ x: 0, y: 124, w: SCREEN_W, h: 56, cols: 36, lines: 3 });
  expect(TEXTBOX.y + TEXTBOX.h).toBe(SCREEN_H);
  expect(TEXTBOX.cols * FONT_W + 32).toBeLessThanOrEqual(TEXTBOX.w);
});
