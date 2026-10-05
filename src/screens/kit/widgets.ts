// Text box, cursor menus, scrolling lists, YES/NO and quantity pickers for
// battle and menu screens. Geometry follows the engine's UiKit (8px grid,
// text rows at TEXTBOX.y + 12 / + 28) so everything looks of a piece.

import type { Button, GameContext, Input } from "../../contracts";
import { SCREEN_W, TEXTBOX } from "../../contracts";
import type { Flow, Task } from "./flow";
import { drawCursor, drawMoreArrow } from "./draw";

export const TEXT_X = TEXTBOX.x + 8;
export const LINE_Y = [TEXTBOX.y + 12, TEXTBOX.y + 28] as const;

const SPEED = { slow: 1 / 4, mid: 1 / 2, fast: 1 } as const;

export type SayMode = "wait" | "auto" | "hold" | "instant";

export interface Drawable {
  draw(g: CanvasRenderingContext2D): void;
}

/** Split into pages ("\n\n" or "\f" = new box) of wrapped lines. */
export function pagesOf(ctx: GameContext, text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split(/\f|\n{2,}/)
    .map((p) => ctx.ui.wrap(p.trim(), TEXTBOX.cols))
    .filter((ls) => ls.some((l) => l.length > 0));
}

/**
 * Crystal text box. Lines type in, the box scrolls a line at a time within a
 * paragraph, and paragraphs start a fresh box.
 *  - wait:    ▼ on every page, A/B to continue, A/B to close the last page
 *  - auto:    like wait, but the last page closes itself after a pause
 *  - hold:    finishes as soon as the last page has typed (for prompts)
 *  - instant: shows the first page at once and finishes
 */
export class TextBox implements Task {
  visible = false;
  private pages: string[][] = [[""]];
  private page = 0;
  private top = 0;
  private line = 0;
  private chars = 0;
  private scroll = 0;
  private waiting = false;
  private done = true;
  private mode: SayMode = "wait";
  private autoTimer = 0;
  private frame = 0;
  private blipCool = 0;
  autoFrames = 50;

  constructor(private ctx: GameContext, private opts: { blip?: boolean } = {}) {}

  /** Start showing text; returns this as a Task. */
  show(text: string, mode: SayMode = "wait"): Task {
    this.pages = pagesOf(this.ctx, text);
    if (this.pages.length === 0) this.pages = [[""]];
    this.page = 0;
    this.top = 0;
    this.line = 0;
    this.chars = 0;
    this.scroll = 0;
    this.waiting = false;
    this.done = false;
    this.mode = mode;
    this.autoTimer = 0;
    this.visible = true;
    if (mode === "instant") {
      const ls = this.pages[0];
      this.line = Math.min(2, ls.length);
      this.done = true;
    }
    return this;
  }

  clear() {
    this.visible = false;
    this.pages = [[""]];
    this.done = true;
  }

  get finished() {
    return this.done;
  }

  private get lines() {
    return this.pages[this.page];
  }

  update(input: Input): boolean {
    this.frame++;
    if (this.done) return true;
    if (this.blipCool > 0) this.blipCool--;
    if (this.scroll > 0) {
      if (--this.scroll === 0) this.top++;
      return false;
    }
    const lines = this.lines;
    const lastPage = this.page === this.pages.length - 1;
    if (this.waiting) {
      const pageDone = this.line >= lines.length;
      if (this.mode === "auto" && pageDone && lastPage) {
        this.autoTimer++;
        if (this.autoTimer >= this.autoFrames || input.pressed("a") || input.pressed("b")) {
          this.done = true;
          return true;
        }
        return false;
      }
      if (input.pressed("a") || input.pressed("b")) {
        this.waiting = false;
        if (pageDone) {
          if (!lastPage) {
            this.page++;
            this.top = 0;
            this.line = 0;
            this.chars = 0;
          } else {
            this.done = true;
            return true;
          }
        } else {
          this.scroll = 4;
        }
      }
      return false;
    }
    const fast = input.held("a") || input.held("b");
    const speed = this.ctx.state?.options?.textSpeed ?? "mid";
    let budget = fast ? 2 : SPEED[speed];
    while (budget > 0 && this.line < lines.length && this.line < this.top + 2) {
      const chars = Array.from(lines[this.line]);
      const before = Math.floor(this.chars);
      this.chars = Math.min(chars.length, this.chars + Math.min(budget, 1));
      budget -= 1;
      const ch = chars[Math.floor(this.chars) - 1];
      if (this.opts.blip && Math.floor(this.chars) > before && ch && ch !== " " && this.blipCool === 0) {
        this.ctx.audio.playSfx("text_blip");
        this.blipCool = 4;
      }
      if (this.chars >= chars.length) {
        this.line++;
        this.chars = 0;
        if (this.line === this.top + 2 && this.line < lines.length) break;
      }
    }
    if (this.line >= lines.length || this.line >= this.top + 2) {
      const pageDone = this.line >= lines.length;
      if (pageDone && lastPage && this.mode === "hold") {
        this.done = true;
        return true;
      }
      this.waiting = true;
    }
    return false;
  }

  /** Draw the box (window + visible lines). */
  draw(g: CanvasRenderingContext2D, opts: { window?: boolean } = {}) {
    if (!this.visible) return;
    if (opts.window !== false) this.ctx.ui.drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    const lines = this.lines;
    for (let i = 0; i < 2; i++) {
      const idx = this.top + i;
      let text = "";
      if (idx < this.line) text = lines[idx] ?? "";
      else if (idx === this.line) text = Array.from(lines[idx] ?? "").slice(0, Math.floor(this.chars)).join("");
      if (!text) continue;
      if (this.scroll > 0) {
        if (i === 0) continue;
        const y = this.scroll > 2 ? LINE_Y[1] - 8 : LINE_Y[0];
        this.ctx.ui.drawText(g, text, TEXT_X, y);
      } else {
        this.ctx.ui.drawText(g, text, TEXT_X, LINE_Y[i]);
      }
    }
    const showArrow = this.waiting && !(this.mode === "auto" && this.page === this.pages.length - 1 && this.line >= lines.length);
    if (showArrow) drawMoreArrow(this.ctx, g, TEXTBOX.x + TEXTBOX.w - 16, LINE_Y[1] + 7, this.frame);
  }
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

export interface MenuOpts {
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Columns for grid menus (filled row by row). */
  cols?: number;
  colW?: number;
  /** Row spacing: 16 (Crystal default) or 8. */
  spacing?: number;
  cancel?: boolean;
  wrap?: boolean;
  start?: number;
  /** Draw the window frame (default true). */
  window?: boolean;
  /** Called when the cursor moves. */
  onMove?: (index: number) => void;
  /** Extra buttons: return a result code to finish with, or null to ignore. */
  onButton?: (b: Button, index: number) => number | null;
}

/** ▶-cursor menu; `result` is the index, or -1 on B. */
export class Menu implements Task {
  index: number;
  result = -1;
  w: number;
  h: number;
  spacing: number;
  frame = 0;

  constructor(private ctx: GameContext, public options: string[], public opts: MenuOpts) {
    this.index = Math.max(0, Math.min(opts.start ?? 0, options.length - 1));
    const cols = opts.cols ?? 1;
    const rows = Math.ceil(options.length / cols);
    this.spacing = opts.spacing ?? 16;
    const longest = Math.max(1, ...options.map((o) => Array.from(o).length));
    this.w = opts.w ?? Math.min(SCREEN_W, cols * (opts.colW ?? 8 * (longest + 1)) + 16);
    this.h = opts.h ?? (this.spacing === 16 ? rows * 16 + 8 : rows * 8 + 16);
  }

  update(input: Input): boolean {
    this.frame++;
    const n = this.options.length;
    const cols = this.opts.cols ?? 1;
    const wrap = this.opts.wrap !== false;
    const prev = this.index;
    if (cols > 1) {
      if (input.repeat("left") && this.index % cols > 0) this.index--;
      else if (input.repeat("right") && this.index % cols < cols - 1 && this.index + 1 < n) this.index++;
      else if (input.repeat("up") && this.index - cols >= 0) this.index -= cols;
      else if (input.repeat("down") && this.index + cols < n) this.index += cols;
    } else {
      if (input.repeat("up")) this.index = this.index > 0 ? this.index - 1 : wrap ? n - 1 : 0;
      else if (input.repeat("down")) this.index = this.index < n - 1 ? this.index + 1 : wrap ? 0 : n - 1;
    }
    if (this.index !== prev) {
      this.ctx.audio.playSfx("cursor");
      this.opts.onMove?.(this.index);
    }
    if (this.opts.onButton) {
      for (const b of ["left", "right", "select", "start"] as Button[]) {
        if (input.pressed(b)) {
          const r = this.opts.onButton(b, this.index);
          if (r !== null) { this.result = r; return true; }
        }
      }
    }
    if (input.pressed("a")) {
      this.ctx.audio.playSfx("select");
      this.result = this.index;
      return true;
    }
    if (input.pressed("b") && this.opts.cancel !== false) {
      this.ctx.audio.playSfx("cancel");
      this.result = -1;
      return true;
    }
    return false;
  }

  itemPos(i: number): { x: number; y: number } {
    const cols = this.opts.cols ?? 1;
    const colW = this.opts.colW ?? (this.w - 16) / cols;
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      x: this.opts.x + 8 + c * colW,
      y: this.spacing === 16 ? this.opts.y + 8 + r * 16 : this.opts.y + 8 + r * 8,
    };
  }

  draw(g: CanvasRenderingContext2D, opts: { cursor?: boolean; hollow?: boolean } = {}) {
    if (this.opts.window !== false) this.ctx.ui.drawWindow(g, this.opts.x, this.opts.y, this.w, this.h);
    this.options.forEach((o, i) => {
      const p = this.itemPos(i);
      this.ctx.ui.drawText(g, o, p.x + 8, p.y);
    });
    if (opts.cursor !== false) {
      const p = this.itemPos(this.index);
      drawCursor(this.ctx, g, p.x, p.y, opts.hollow);
    }
  }
}

/**
 * Scrolling list with custom rows. `result`: index, -1 on B, or a code from
 * `onButton`. Rows are `rowH` px apart starting at `y`.
 */
export class ListView implements Task {
  index: number;
  scroll = 0;
  result = -1;
  frame = 0;

  constructor(
    private ctx: GameContext,
    public count: () => number,
    public opts: {
      rows: number;
      rowH: number;
      start?: number;
      cancel?: boolean;
      wrap?: boolean;
      onMove?: (index: number) => void;
      onButton?: (b: Button, index: number) => number | null;
      /** Up/down + left/right page jumps. */
      paging?: boolean;
    },
  ) {
    this.index = Math.max(0, opts.start ?? 0);
    this.clamp();
  }

  clamp() {
    const n = this.count();
    this.index = Math.max(0, Math.min(this.index, n - 1));
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.opts.rows) this.scroll = this.index - this.opts.rows + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, n - this.opts.rows)));
  }

  update(input: Input): boolean {
    this.frame++;
    const n = this.count();
    const prev = this.index;
    if (input.repeat("up")) this.index = this.index > 0 ? this.index - 1 : this.opts.wrap ? n - 1 : 0;
    else if (input.repeat("down")) this.index = this.index < n - 1 ? this.index + 1 : this.opts.wrap ? 0 : n - 1;
    else if (this.opts.paging && input.repeat("left")) this.index = Math.max(0, this.index - this.opts.rows);
    else if (this.opts.paging && input.repeat("right")) this.index = Math.min(n - 1, this.index + this.opts.rows);
    this.clamp();
    if (this.index !== prev) {
      this.ctx.audio.playSfx("cursor");
      this.opts.onMove?.(this.index);
    }
    if (this.opts.onButton) {
      for (const b of ["left", "right", "select", "start"] as Button[]) {
        if (this.opts.paging && (b === "left" || b === "right")) continue;
        if (input.pressed(b)) {
          const r = this.opts.onButton(b, this.index);
          if (r !== null) { this.result = r; return true; }
        }
      }
    }
    if (input.pressed("a") && n > 0) {
      this.ctx.audio.playSfx("select");
      this.result = this.index;
      return true;
    }
    if (input.pressed("b") && this.opts.cancel !== false) {
      this.ctx.audio.playSfx("cancel");
      this.result = -1;
      return true;
    }
    return false;
  }

  /** Visible rows as [index, rowNumber]. */
  visibleRows(): [number, number][] {
    const out: [number, number][] = [];
    const n = this.count();
    for (let r = 0; r < this.opts.rows; r++) {
      const i = this.scroll + r;
      if (i >= n) break;
      out.push([i, r]);
    }
    return out;
  }

  canScrollUp() { return this.scroll > 0; }
  canScrollDown() { return this.scroll + this.opts.rows < this.count(); }
}

/** Quantity picker "×01" with up/down ±1 and left/right ±10. */
export class QtyPicker implements Task {
  value = 1;
  result = 0;
  frame = 0;
  constructor(private ctx: GameContext, public max: number, public opts: { x: number; y: number; w?: number; extra?: (n: number) => string }) {}

  update(input: Input): boolean {
    this.frame++;
    const prev = this.value;
    if (input.repeat("up")) this.value = this.value >= this.max ? 1 : this.value + 1;
    else if (input.repeat("down")) this.value = this.value <= 1 ? this.max : this.value - 1;
    else if (input.repeat("right")) this.value = Math.min(this.max, this.value + 10);
    else if (input.repeat("left")) this.value = Math.max(1, this.value - 10);
    if (prev !== this.value) this.ctx.audio.playSfx("cursor");
    if (input.pressed("a")) { this.ctx.audio.playSfx("select"); this.result = this.value; return true; }
    if (input.pressed("b")) { this.ctx.audio.playSfx("cancel"); this.result = 0; return true; }
    return false;
  }

  draw(g: CanvasRenderingContext2D) {
    const extra = this.opts.extra?.(this.value) ?? "";
    const w = this.opts.w ?? 8 * (4 + extra.length) + 16;
    this.ctx.ui.drawWindow(g, this.opts.x, this.opts.y, w, 24);
    this.ctx.ui.drawText(g, `×${String(this.value).padStart(2, "0")}${extra}`, this.opts.x + 8, this.opts.y + 8);
  }
}

// ---------------------------------------------------------------------------
// Per-scene UI host: one text box plus a stack of overlays.
// ---------------------------------------------------------------------------

export class ScreenUi {
  tb: TextBox;
  overlays: Drawable[] = [];

  constructor(private ctx: GameContext, private flow: Flow, opts: { blip?: boolean } = {}) {
    this.tb = new TextBox(ctx, { blip: opts.blip ?? true });
  }

  /** Show text in the box and wait for it per `mode`. */
  async say(text: string, mode: SayMode = "wait"): Promise<void> {
    await this.flow.run(this.tb.show(text, mode));
  }

  async choose(menu: Menu, draw?: (g: CanvasRenderingContext2D) => void): Promise<number> {
    const d: Drawable = { draw: draw ?? ((g) => menu.draw(g)) };
    this.overlays.push(d);
    await this.flow.run(menu);
    this.overlays.splice(this.overlays.indexOf(d), 1);
    return menu.result;
  }

  /** YES/NO box at the right, above the text box. */
  async yesNo(prompt?: string, opts: { x?: number; y?: number } = {}): Promise<boolean> {
    if (prompt) await this.say(prompt, "hold");
    const m = new Menu(this.ctx, ["YES", "NO"], { x: opts.x ?? SCREEN_W - 48, y: opts.y ?? TEXTBOX.y - 40, w: 48 });
    const r = await this.choose(m);
    return r === 0;
  }

  async qty(max: number, opts: { x: number; y: number; w?: number; extra?: (n: number) => string }): Promise<number> {
    const q = new QtyPicker(this.ctx, Math.max(1, max), opts);
    const d: Drawable = { draw: (g) => q.draw(g) };
    this.overlays.push(d);
    await this.flow.run(q);
    this.overlays.splice(this.overlays.indexOf(d), 1);
    return q.result;
  }

  draw(g: CanvasRenderingContext2D, opts: { textbox?: boolean } = {}) {
    if (opts.textbox !== false) this.tb.draw(g);
    for (const o of this.overlays) o.draw(g);
  }
}
