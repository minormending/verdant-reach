// UiKit: bitmap text, GBC window frames, the Crystal-style text box, cursor
// menus and YES/NO. Other modules reach this through `ctx.ui`; the engine's
// own scenes also use the exported `TextBox`, `Menu` and drawing helpers.

import * as skin from "./skin";
import { drawSpeakerFace } from "./portraits";
import type { GameContext, Input, Scene, UiKit, SayOptions } from "../contracts";
import { facePath, SCREEN_H, SCREEN_W, TEXTBOX, UI } from "../contracts";
import { drawBitmapText, formatText, measureText, paragraphs, wrapText } from "./font";

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

export function drawText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = UI.black) {
  if (text === "▶" || text === "▷" || text === "▼" || text === "▲" || text === "◀") {
    if (skin.cursor(g, text === "▼" ? "down" : text === "▲" ? "up" : text === "◀" ? "left" : "arrow", x, y)) return;
  }
  if (text.includes("$") && skin.skinOn()) {
    Array.from(text).forEach((ch, i) => {
      if (ch !== "$" || !skin.icon(g, "coin", x + i * 8, y)) drawBitmapText(g, ch, x + i * 8, y, skin.textColor(g, x, y, color));
    });
    return;
  }
  drawBitmapText(g, text, x, y, skin.textColor(g, x, y, color));
}

/** Text drawn at an integer scale (title logo, cards). */
export function drawTextScaled(g: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string) {
  drawBitmapText(g, text, x, y, color, scale);
}

/** Text with a 1px outline (for text over art). */
export function drawTextOutlined(
  g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline: string, scale = 1,
) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
    drawBitmapText(g, text, x + dx, y + dy, outline, scale);
  }
  drawBitmapText(g, text, x, y, color, scale);
}

/**
 * GBC window: white fill, 1px white margin, 2px dark border with rounded
 * corners and a pale inner rule. `shadow` adds a soft 2px drop shadow to the
 * bottom-right (for windows floating over the map).
 */
export function drawWindow(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opts: { shadow?: boolean; kind?: skin.PanelKind } = {},
) {
  if (skin.panel(g, opts.kind ?? (y === TEXTBOX.y && h === TEXTBOX.h ? "window" : "inset"), { x, y, w, h })) return;
  x = Math.round(x); y = Math.round(y);
  if (opts.shadow) {
    g.fillStyle = "rgba(16,24,32,0.30)";
    g.fillRect(x + w, y + 4, 2, h - 3);
    g.fillRect(x + 4, y + h, w - 2, 2);
  }
  g.fillStyle = UI.white;
  g.fillRect(x, y, w, h);
  g.fillStyle = UI.black;
  g.fillRect(x + 3, y + 1, w - 6, 2);
  g.fillRect(x + 3, y + h - 3, w - 6, 2);
  g.fillRect(x + 1, y + 3, 2, h - 6);
  g.fillRect(x + w - 3, y + 3, 2, h - 6);
  // rounded corners
  g.fillRect(x + 2, y + 2, 1, 1);
  g.fillRect(x + w - 3, y + 2, 1, 1);
  g.fillRect(x + 2, y + h - 3, 1, 1);
  g.fillRect(x + w - 3, y + h - 3, 1, 1);
  // inner rule
  g.fillStyle = UI.light;
  g.fillRect(x + 4, y + 4, w - 8, 1);
  g.fillRect(x + 4, y + h - 5, w - 8, 1);
  g.fillRect(x + 4, y + 5, 1, h - 10);
  g.fillRect(x + w - 5, y + 5, 1, h - 10);
}

// ---------------------------------------------------------------------------
// Text box (typewriter, scrolling, paging)
// ---------------------------------------------------------------------------

export type TextSpeed = "slow" | "mid" | "fast";
/** Characters revealed per frame (fractions accumulate). */
const SPEED: Record<TextSpeed, number> = { slow: 1 / 4, mid: 1 / 2, fast: 1 };

const LINE_SPACING = 16;
const LINE_Y = Array.from({ length: TEXTBOX.lines }, (_, i) => TEXTBOX.y + 8 + i * LINE_SPACING);
const TEXT_X = TEXTBOX.x + 8;

export interface TextBoxHooks {
  speed(): TextSpeed;
  blip(): void;
}

/**
 * The bottom text box. Lines type in, the box scrolls a line at a time while
 * a paragraph continues, and "\n\n" clears to a fresh box.
 *  - `waitLast: false` stops after typing the final page (prompts for menus).
 *  - `autoClose` closes without waiting for A shortly after the last page.
 */
export class TextBox {
  private pages: string[][];
  private page = 0;
  private top = 0;          // index of the line shown in row 0
  private line = 0;         // line being typed
  private chars = 0;        // chars typed of `line` (fractional)
  private scroll = 0;       // >0 while scrolling up
  private waiting = false;  // showing the ▼ arrow
  private blipCooldown = 0;
  private frame = 0;
  private closeTimer = -1;
  finished = false;         // all text typed (and acknowledged if waitLast)

  constructor(
    text: string,
    private hooks: TextBoxHooks,
    private opts: { waitLast?: boolean; autoClose?: boolean } = {},
  ) {
    this.pages = paragraphs(text, TEXTBOX.cols);
    if (this.pages.length === 0) this.pages = [[""]];
  }

  private get lines() { return this.pages[this.page]; }

  /** Lines currently visible (for handing the box to a following menu). */
  visible(): string[] {
    const l = this.lines;
    const row = (i: number) => {
      const idx = this.top + i;
      if (idx < this.line) return l[idx] ?? "";
      if (idx === this.line) return Array.from(l[idx] ?? "").slice(0, Math.floor(this.chars)).join("");
      return "";
    };
    return Array.from({ length: TEXTBOX.lines }, (_, i) => row(i));
  }

  update(input: Input) {
    this.frame++;
    if (this.finished) return;
    if (this.blipCooldown > 0) this.blipCooldown--;
    if (this.closeTimer >= 0) {
      if (--this.closeTimer <= 0) this.finished = true;
      return;
    }
    if (this.scroll > 0) {
      if (--this.scroll === 0) this.top++;
      return;
    }
    const lines = this.lines;
    if (this.waiting) {
      if (input.pressed("a") || input.pressed("b")) {
        this.waiting = false;
        if (this.line >= lines.length) {
          if (this.page < this.pages.length - 1) {
            this.page++;
            this.top = 0; this.line = 0; this.chars = 0;
          } else {
            this.finished = true;
          }
        } else {
          this.scroll = 4; // scroll one line up
        }
      }
      return;
    }
    // typing
    const fast = input.held("a") || input.held("b");
    let budget = fast ? 2 : SPEED[this.hooks.speed()];
    while (budget > 0 && this.line < lines.length && this.line < this.top + TEXTBOX.lines) {
      const len = Array.from(lines[this.line]).length;
      const before = Math.floor(this.chars);
      this.chars = Math.min(len, this.chars + Math.min(budget, 1));
      budget -= 1;
      const ch = Array.from(lines[this.line])[Math.floor(this.chars) - 1];
      if (Math.floor(this.chars) > before && ch && ch !== " " && this.blipCooldown === 0) {
        this.hooks.blip();
        this.blipCooldown = 4;
      }
      if (this.chars >= len) {
        this.line++;
        this.chars = 0;
        // All visible rows filled and more follows: pause for A.
        if (this.line === this.top + TEXTBOX.lines && this.line < lines.length) break;
      }
    }
    if (this.line >= lines.length || this.line >= this.top + TEXTBOX.lines) {
      const lastPage = this.page === this.pages.length - 1;
      const pageDone = this.line >= lines.length;
      if (pageDone && lastPage) {
        if (this.opts.autoClose) this.closeTimer = 40;
        else if (this.opts.waitLast === false) this.finished = true;
        else this.waiting = true;
      } else {
        this.waiting = true;
      }
    }
  }

  draw(g: CanvasRenderingContext2D) {
    drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    const lines = this.lines;
    const scrolling = this.scroll > 0;
    // While scrolling, row 0 is vacated and the other rows move up in two steps.
    for (let i = 0; i < TEXTBOX.lines; i++) {
      const idx = this.top + i;
      let text = "";
      if (idx < this.line) text = lines[idx] ?? "";
      else if (idx === this.line) text = Array.from(lines[idx] ?? "").slice(0, Math.floor(this.chars)).join("");
      if (!text) continue;
      if (scrolling) {
        if (i === 0) continue;
        const y = LINE_Y[i] - (this.scroll > 2 ? LINE_SPACING / 2 : LINE_SPACING);
        drawText(g, text, TEXT_X, y);
      } else {
        drawText(g, text, TEXT_X, LINE_Y[i]);
      }
    }
    if (this.waiting) {
      // The ▼ prompt bobs gently (1px) rather than blinking.
      const bob = [0, 0, 1, 1][Math.floor(this.frame / 8) % 4];
      drawText(g, "▼", TEXTBOX.x + TEXTBOX.w - 16, LINE_Y[TEXTBOX.lines - 1] + bob);
    }
  }
}

/** Draw a static text box holding up to TEXTBOX.lines rows. */
export function drawStaticBox(g: CanvasRenderingContext2D, lines: string[]) {
  drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
  lines.slice(-TEXTBOX.lines).forEach((l, i) => drawText(g, l, TEXT_X, LINE_Y[i]));
}

// ---------------------------------------------------------------------------
// Cursor menu
// ---------------------------------------------------------------------------

export interface MenuOpts {
  x?: number;
  y?: number;
  /** Fixed width in px (default: fits the longest option). */
  w?: number;
  /** Row spacing in px: 16 (Crystal default) or 8 for long lists. */
  spacing?: number;
  /** B returns -1 when true (default true). */
  cancel?: boolean;
  /** Wrap from last to first (default true). */
  wrap?: boolean;
  start?: number;
}

/** A ▶-cursor menu in a window. Call `update` each frame; it returns the
 *  chosen index, -1 on cancel, or null while still open. */
export class Menu {
  index: number;
  private frame = 0;
  x: number; y: number; w: number; h: number;
  spacing: number;

  constructor(public options: string[], private sfx: (id: "cursor" | "select" | "cancel") => void, public opts: MenuOpts = {}) {
    this.index = Math.min(opts.start ?? 0, options.length - 1);
    const longest = Math.max(...options.map((o) => Array.from(o).length));
    this.w = opts.w ?? Math.min(SCREEN_W, 8 * (longest + 1) + 16);
    let spacing = opts.spacing ?? 16;
    if (spacing === 16 && options.length * 16 + 8 > SCREEN_H) spacing = 8;
    this.spacing = spacing;
    this.h = spacing === 16 ? options.length * 16 + 8 : options.length * 8 + 16;
    this.x = opts.x ?? SCREEN_W - this.w;
    this.y = opts.y ?? Math.max(0, TEXTBOX.y - this.h);
  }

  update(input: Input): number | null {
    this.frame++;
    const n = this.options.length;
    const wrap = this.opts.wrap !== false;
    if (input.repeat("up")) {
      const next = this.index > 0 ? this.index - 1 : wrap ? n - 1 : 0;
      if (next !== this.index) { this.index = next; this.frame = 0; this.sfx("cursor"); }
    } else if (input.repeat("down")) {
      const next = this.index < n - 1 ? this.index + 1 : wrap ? 0 : n - 1;
      if (next !== this.index) { this.index = next; this.frame = 0; this.sfx("cursor"); }
    }
    if (input.pressed("a")) { this.sfx("select"); return this.index; }
    if (input.pressed("b") && this.opts.cancel !== false) { this.sfx("cancel"); return -1; }
    return null;
  }

  rowY(i: number) {
    return this.spacing === 16 ? this.y + 8 + i * 16 : this.y + 8 + i * 8;
  }

  draw(g: CanvasRenderingContext2D, opts: { cursor?: boolean } = {}) {
    drawWindow(g, this.x, this.y, this.w, this.h, { shadow: true });
    skin.highlight(g, { x: this.x + 6, y: this.rowY(this.index) - 3, w: this.w - 12, h: this.spacing === 16 ? 14 : 8 });
    this.options.forEach((o, i) => drawText(g, o, this.x + 16, this.rowY(i)));
    if (opts.cursor !== false) {
      // The ▶ nudges right 1px on a slow beat (rests while you move it).
      const bob = this.frame > 12 && Math.floor(this.frame / 16) % 2 === 1 ? 1 : 0;
      drawText(g, "▶", this.x + 7 + bob, this.rowY(this.index));
    } else {
      // Hollow cursor marks the remembered choice while a sub-window is open.
      drawText(g, "▷", this.x + 7, this.rowY(this.index));
    }
  }
}

// ---------------------------------------------------------------------------
// UiKit
// ---------------------------------------------------------------------------

export function createUiKit(ctx: GameContext): UiKit & {
  /** Lines left showing by the last `say` (shown under a following menu). */
  lingering(): string[] | null;
  format(text: string): string;
} {
  let last: { lines: string[]; at: number } | null = null;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hooks: TextBoxHooks = {
    speed: () => ctx.state?.options?.textSpeed ?? "mid",
    blip: () => ctx.audio.playSfx("text_blip"),
  };
  const sfx = (id: "cursor" | "select" | "cancel") => ctx.audio.playSfx(id);
  const format = (text: string) =>
    formatText(text, { player: ctx.state?.playerName ?? "", rival: ctx.state?.rivalName ?? "BRAM" });
  const lingering = () => (last && now() - last.at < 80 ? last.lines : null);

  const kit = {
    drawText,
    drawWindow,
    measure: measureText,
    wrap: wrapText,
    format,
    lingering,

    say(text: string, opts?: SayOptions): Promise<void> {
      const body = format(opts?.speaker ? `${opts.speaker}: ${text}` : text);
      return ctx.scenes.run<void>((done) => {
        const box = new TextBox(body, hooks, { autoClose: opts?.autoClose });
        const clock = opts?.faceClock ?? { tick: 0 };
        let closing = false;
        const scene: Scene = {
          transparent: true,
          update() {
            if (closing) return;
            clock.tick++;
            box.update(ctx.input);
            if (box.finished) {
              last = { lines: box.visible(), at: now() };
              if (opts?.face && ctx.assets.has(facePath(opts.face))) {
                // Keep this card in the current draw. The next say is installed
                // in the microtask turn, before the next paint, with no blank frame.
                closing = true;
                void Promise.resolve().then(() => done());
              } else done();
            }
          },
          draw(g) { box.draw(g); drawSpeakerFace(g, ctx.assets, opts?.face, clock.tick); },
        };
        return scene;
      });
    },

    choose(options: string[], opts?: { prompt?: string; x?: number; y?: number; cancel?: boolean }): Promise<number> {
      if (options.length === 0) return Promise.resolve(-1);
      const prior = opts?.prompt ? null : lingering();
      return ctx.scenes.run<number>((done) => {
        const box = opts?.prompt ? new TextBox(format(opts.prompt), hooks, { waitLast: false }) : null;
        const menu = new Menu(options.map(format), sfx, { x: opts?.x, y: opts?.y, cancel: opts?.cancel ?? true });
        const scene: Scene = {
          transparent: true,
          update() {
            if (box && !box.finished) { box.update(ctx.input); return; }
            const r = menu.update(ctx.input);
            if (r !== null) {
              if (box) last = { lines: box.visible(), at: now() };
              done(r);
            }
          },
          draw(g) {
            if (box) box.draw(g);
            else if (prior) drawStaticBox(g, prior);
            if (!box || box.finished) menu.draw(g);
          },
        };
        return scene;
      });
    },

    async yesNo(prompt: string): Promise<boolean> {
      const r = await kit.choose(["YES", "NO"], { prompt, x: SCREEN_W - 48, y: TEXTBOX.y - 40 });
      return r === 0;
    },
  };
  return kit;
}
