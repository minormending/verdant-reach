// Crystal-style naming screen: a letter grid with UPPER/lower, DEL and END.
// Used for the player name, the rival (optional) and nicknames.

import type { CharacterKey, GameContext, Scene, SpeciesId } from "../contracts";
import { SCREEN_H, SCREEN_W, UI, characterPath, speciesPath } from "../contracts";
import { characterFrame, drawImagePath } from "../engine/gfx";
import { drawText, drawWindow } from "./kit";

const UPPER = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ ", "-'.!?&é♪×"];
const LOWER = ["abcdefghi", "jklmnopqr", "stuvwxyz ", "-'.!?&é♪×"];
const COLS = 9;
const GRID_X = 16;
const GRID_Y = 56;
/** Bottom row buttons: [label, first col, last col]. */
const BUTTONS = [
  { id: "case", cols: [0, 2] },
  { id: "del", cols: [4, 5] },
  { id: "end", cols: [7, 8] },
] as const;

export interface NameEntryOpts {
  title: string;              // e.g. "YOUR NAME?"
  max: number;                // 7 for people, 10 for nicknames
  defaultName: string;        // used when END is pressed on an empty name
  sprite?: CharacterKey;      // header picture: an overworld sheet...
  species?: SpeciesId;        // ...or a species icon
  initial?: string;
}

/** Pure editing model (tested separately from the scene). */
export class NameModel {
  name: string;
  constructor(public max: number, initial = "") { this.name = Array.from(initial).slice(0, max).join(""); }
  get length() { return Array.from(this.name).length; }
  type(ch: string): boolean {
    if (this.length >= this.max) return false;
    if (ch === " " && this.length === 0) return false; // no leading space
    this.name += ch;
    return true;
  }
  del(): boolean {
    if (!this.length) return false;
    this.name = Array.from(this.name).slice(0, -1).join("");
    return true;
  }
  result(defaultName: string): string {
    const t = this.name.trim();
    return t || defaultName;
  }
}

export function nameEntry(ctx: GameContext, opts: NameEntryOpts): Promise<string> {
  return ctx.scenes.run<string>((done) => {
    const model = new NameModel(opts.max, opts.initial ?? "");
    let row = 0;
    let col = 0;
    let lower = false;
    let frame = 0;
    let closing = -1;

    const rows = () => (lower ? LOWER : UPPER);
    const onButtons = () => row === rows().length;
    const buttonIndex = () => {
      const i = BUTTONS.findIndex((b) => col >= b.cols[0] && col <= b.cols[1]);
      return i < 0 ? 0 : i;
    };
    const finish = () => {
      ctx.audio.playSfx("select");
      closing = 8;
    };

    const scene: Scene = {
      update() {
        frame++;
        const input = ctx.input;
        if (closing >= 0) {
          if (--closing <= 0) done(model.result(opts.defaultName));
          return;
        }
        const nRows = rows().length + 1;
        if (input.repeat("up")) { row = (row + nRows - 1) % nRows; ctx.audio.playSfx("cursor"); }
        if (input.repeat("down")) { row = (row + 1) % nRows; ctx.audio.playSfx("cursor"); }
        if (onButtons()) {
          // Snap to the button's first column; left/right hop between buttons.
          let b = buttonIndex();
          if (input.repeat("left")) { b = (b + BUTTONS.length - 1) % BUTTONS.length; ctx.audio.playSfx("cursor"); }
          if (input.repeat("right")) { b = (b + 1) % BUTTONS.length; ctx.audio.playSfx("cursor"); }
          col = BUTTONS[b].cols[0];
        } else {
          if (input.repeat("left")) { col = (col + COLS - 1) % COLS; ctx.audio.playSfx("cursor"); }
          if (input.repeat("right")) { col = (col + 1) % COLS; ctx.audio.playSfx("cursor"); }
        }
        if (input.pressed("start")) { row = rows().length; col = BUTTONS[2].cols[0]; ctx.audio.playSfx("cursor"); }
        if (input.pressed("select")) { lower = !lower; ctx.audio.playSfx("cursor"); }
        if (input.pressed("b")) {
          if (model.del()) ctx.audio.playSfx("cancel");
        }
        if (input.pressed("a")) {
          if (onButtons()) {
            const b = BUTTONS[buttonIndex()].id;
            if (b === "case") { lower = !lower; ctx.audio.playSfx("select"); }
            else if (b === "del") { if (model.del()) ctx.audio.playSfx("cancel"); }
            else finish();
          } else {
            const ch = Array.from(rows()[row])[col];
            if (ch && model.type(ch)) {
              ctx.audio.playSfx("select");
              // Full: jump to END as in Crystal.
              if (model.length >= model.max) { row = rows().length; col = BUTTONS[2].cols[0]; }
            }
          }
        }
      },
      draw(g) {
        g.fillStyle = UI.white;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        // header
        drawWindow(g, 0, 0, SCREEN_W, 48);
        g.fillStyle = "#e8f0e0";
        g.fillRect(8, 8, 32, 32);
        if (opts.species) {
          const icon = speciesPath(opts.species, Math.floor(frame / 16) % 2 && ctx.assets.image(speciesPath(opts.species, "icon__2")) ? "icon__2" : "icon");
          drawImagePath(g, ctx.assets, icon, 0, 0, 16, 16, 8, 8, 32, 32);
        } else {
          const sprite = opts.sprite ?? "player";
          const sheet = characterPath(sprite);
          const [w, h] = characterFrame(ctx.assets, sprite);
          const img = ctx.assets.image(sheet);
          const step = Math.floor(frame / 24) % 4;
          const colIdx = img && img.width >= 3 * w ? [0, 1, 0, 2][step] : 0;
          // Integer scale in the existing box, centred with feet still at y=40.
          const scale = Math.min(2, Math.floor(32 / w), Math.floor(32 / h));
          drawImagePath(g, ctx.assets, sheet, colIdx * w, 0, w, h,
            24 - w * scale / 2, 40 - h * scale, w * scale, h * scale);
        }
        drawText(g, opts.title, 48, 12);
        // name field with underscores
        const chars = Array.from(model.name);
        for (let i = 0; i < opts.max; i++) {
          const x = 48 + i * 8;
          if (chars[i]) drawText(g, chars[i], x, 26);
          const active = i === chars.length && closing < 0;
          g.fillStyle = active && Math.floor(frame / 16) % 2 ? UI.light : UI.dark;
          g.fillRect(x, 35, 7, 1);
          if (active) g.fillRect(x, 36, 7, 1);
        }
        // grid
        drawWindow(g, 0, 48, SCREEN_W, SCREEN_H - 48);
        rows().forEach((r, ri) => {
          Array.from(r).forEach((ch, ci) => drawText(g, ch, GRID_X + ci * 16, GRID_Y + ri * 16));
        });
        const by = GRID_Y + rows().length * 16;
        drawText(g, lower ? "UPPER" : "lower", GRID_X - 8 + 8, by);
        drawText(g, "DEL", GRID_X + 4 * 16, by);
        drawText(g, "END", GRID_X + 7 * 16, by);
        // cursor
        const cx = GRID_X + col * 16 - 8;
        const cy = onButtons() ? by : GRID_Y + row * 16;
        if (closing < 0) drawText(g, "▶", cx, cy);
      },
    };
    return scene;
  });
}
