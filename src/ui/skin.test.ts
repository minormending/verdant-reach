import { afterEach, describe, expect, it, vi } from "vitest";
import { UI } from "../contracts";
import { setActiveArt } from "../art/registry";
import { drawWindow, drawStaticBox } from "./kit";
import { drawHpBar } from "../screens/kit/draw";
import * as skin from "./skin";
import { fixtureSkin } from "./skin.fixture";

// Tiny software canvas for a pixel-level fallback oracle, including our font
// atlas. No browser, installed pack or licensed fixture is required.
class Pixels {
  width = 320; height = 180;
  pixels = new Uint8Array(320 * 320 * 4);
  fillStyle = "#000000";
  getContext() { return this; }
  fillRect(x: number, y: number, w: number, h: number) {
    const hex = this.fillStyle.replace('#', '');
    const rgba = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); rgba.push(255);
    for (let yy = Math.max(0, y); yy < Math.min(this.height, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(this.width, x + w); xx++) this.pixels.set(rgba, (yy * this.width + xx) * 4);
  }
  drawImage(src: Pixels, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const s = ((sy + Math.floor(y * sh / dh)) * src.width + sx + Math.floor(x * sw / dw)) * 4;
      const d = ((dy + y) * this.width + dx + x) * 4;
      if (src.pixels[s + 3]) this.pixels.set(src.pixels.subarray(s, s + 4), d);
    }
  }
  hash() {
    let h = 2166136261;
    for (const p of this.pixels.subarray(0, this.width * this.height * 4)) h = Math.imul(h ^ p, 16777619);
    return (h >>> 0).toString(16);
  }
  get g() { return this as unknown as CanvasRenderingContext2D; }
}
function gbcWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Frozen pre-R6 window geometry: independent of the production helper.
  const rects: [string, number[][]][] = [
    [UI.white, [[x,y,w,h]]],
    [UI.black, [[x+3,y+1,w-6,2],[x+3,y+h-3,w-6,2],[x+1,y+3,2,h-6],[x+w-3,y+3,2,h-6],[x+2,y+2,1,1],[x+w-3,y+2,1,1],[x+2,y+h-3,1,1],[x+w-3,y+h-3,1,1]]],
    [UI.light, [[x+4,y+4,w-8,1],[x+4,y+h-5,w-8,1],[x+4,y+5,1,h-10],[x+w-5,y+5,1,h-10]]],
  ];
  for (const [color, rects_] of rects) { g.fillStyle = color; for (const [xx,yy,ww,hh] of rects_) g.fillRect(xx,yy,ww,hh); }
}
afterEach(() => { setActiveArt(null); vi.unstubAllGlobals(); });

describe("UI skin fallback pixels", () => {
  it("retains the reference GBC window pixel for pixel", () => {
    setActiveArt(null);
    const actual = new Pixels(), expected = new Pixels();
    drawWindow(actual.g, 4, 8, 96, 64); gbcWindow(expected.g, 4, 8, 96, 64);
    expect(actual.hash()).toBe(expected.hash());
    expect(skin.panel(actual.g, "window", { x: 0, y: 0, w: 40, h: 24 })).toBe(false);
  });
  it("retains the static dialogue and HP reference pixels", () => {
    setActiveArt(null); vi.stubGlobal('document', { createElement: () => new Pixels() });
    const actual = new Pixels();
    drawStaticBox(actual.g, ['DR. VALE: Welcome!', 'Choose your plant.', 'A new journey begins.']);
    drawHpBar(actual.g, 8, 24, 31, 100);
    drawHpBar(actual.g, 8, 40, 1, 100);
    drawHpBar(actual.g, 8, 56, 0, 100);
    expect(actual.hash()).toMatchInlineSnapshot(`"b7a3ea15"`);
  });
});

describe("UI skin slices", () => {
  it("resolves the set through the real catalogue and preserves corner sizes", () => {
    const art = fixtureSkin(); setActiveArt(art);
    expect(art.catalog.resolve('assets/ui/panel_window.png')?.layer).toBe('limezu');
    const drawImage = vi.fn();
    const g = { drawImage, imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D;
    expect(skin.panel(g, 'window', { x: 0, y: 0, w: 100, h: 50 })).toBe(true);
    expect(drawImage).toHaveBeenCalledTimes(9);
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0,0,3,3,0,0,3,3]);
    expect(drawImage.mock.calls[4].slice(1)).toEqual([3,3,10,10,3,3,94,44]);
    expect(g.imageSmoothingEnabled).toBe(true);
    expect(skin.textColor(g, 8, 8, UI.black)).toBe('#3a2a1e');
    expect(skin.textColor(g, 108, 8, UI.white)).toBe(UI.white);
    skin.beginSkinFrame(g);
    expect(skin.textColor(g, 8, 8, UI.black)).toBe(UI.black);
  });
  it.each([[.51,'bar_green'],[.5,'bar_yellow'],[.21,'bar_yellow'],[.2,'bar_red'],[0,'bar_red']])('HP %s picks %s and clips its fill', (frac, key) => {
    setActiveArt(fixtureSkin());
    const drawImage = vi.fn(), rect = vi.fn();
    const g = { drawImage, rect, save() {}, restore() {}, beginPath() {}, clip() {} } as unknown as CanvasRenderingContext2D;
    expect(skin.bar(g,'hp',{ x: 0,y: 0,w: 40,h: 7 }, Number(frac))).toBe(true);
    if (Number(frac)) {
      expect(drawImage.mock.calls.some(c => c[0].key === key)).toBe(true);
      expect(rect).toHaveBeenCalledWith(3,1,Math.max(1,Math.round(34 * Number(frac))),5);
    } else expect(rect).not.toHaveBeenCalled();
  });
  it("uses blue EXP, rotates the more cursor down, and selects both toggles", () => {
    setActiveArt(fixtureSkin());
    const drawImage = vi.fn(), rotate = vi.fn();
    const g = { drawImage, rotate, save() {}, restore() {}, translate() {}, beginPath() {}, rect() {}, clip() {} } as unknown as CanvasRenderingContext2D;
    skin.bar(g, 'exp', { x: 0,y: 0,w: 64,h: 7 }, .5);
    expect(drawImage.mock.calls.some(c => c[0].key === 'bar_blue')).toBe(true);
    skin.cursor(g,'down',8,8); expect(rotate).toHaveBeenLastCalledWith(Math.PI / 2);
    skin.toggle(g,true,8,8); expect(drawImage.mock.calls.at(-1)?.[0].key).toBe('toggle_on');
    skin.toggle(g,false,8,8); expect(drawImage.mock.calls.at(-1)?.[0].key).toBe('toggle_off');
  });
});
