// Shared pixel geometry for menus. Keep native art sizes independent of the canvas.
import { SCREEN_H, SCREEN_W, TEXTBOX } from "../../contracts";

export const MARGIN = 8;
export const CONTENT_H = TEXTBOX.y;
export const FOOTER_Y = SCREEN_H - 32;
export const RIGHT = SCREEN_W - MARGIN;
export const HALF = Math.floor(SCREEN_W / 2);
export const LIST_ROWS = Math.floor((CONTENT_H - 16) / 16);
export const BOOK_ROWS = Math.floor((FOOTER_Y - 16) / 16);
export const textCols = (width: number) => Math.max(1, Math.floor(width / 8));
export const centered = (w: number, h: number, areaH = CONTENT_H) => ({
  x: Math.floor((SCREEN_W - w) / 2), y: Math.floor((areaH - h) / 2),
});
export const aboveText = (w: number, h: number) => ({ x: SCREEN_W - w, y: CONTENT_H - h, w, h });
export const PARTY_ROW_H = Math.floor((CONTENT_H - 8) / 6);
export const partyRowY = (i: number) => 4 + i * PARTY_ROW_H;
