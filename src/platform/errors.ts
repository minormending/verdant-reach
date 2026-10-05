// Graceful failure. Every uncaught error and rejection is logged. If the game
// loop has actually stopped (an exception inside a scene kills the frame
// callback), the screen is replaced by a GBC-style "Something wilted…" card
// with a way to reload. Errors that don't stop the loop are logged only, so a
// glitch in a timer never ends a session that could carry on.

import { SCREEN_H, SCREEN_W, UI } from "../contracts";
import { drawText, drawWindow } from "../ui/kit";

// A wilted seedling, 16x16: stem bowed over, leaves drooping.
const WILT = [
  "................",
  "......oooo......",
  ".....oLLMMo.....",
  "....oLMMMDo.....",
  "....oMMDDo.o....",
  ".....oDoo.oLo...",
  "......o..oLMo...",
  ".........oMDo...",
  ".........oDo....",
  "........oSo.....",
  "........oSo.....",
  "........oSo.....",
  ".......ooSoo....",
  ".....ooPPPPPoo..",
  "....oPPpppppPPo.",
  ".....oooooooooo.",
];
const WILT_COLORS: Record<string, string> = {
  o: "#181818", L: "#c8c890", M: "#98a058", D: "#606830", S: "#788040",
  P: "#c87848", p: "#8a4828",
};

export interface ErrorScreenOpts {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  /** Monotonic count of game-loop ticks, to tell a dead loop from a live one. */
  ticks: () => number;
  /** Called once the error card is up, with a redraw function in case the loop is still running. */
  onShow?: (redraw: (g: CanvasRenderingContext2D) => void) => void;
}

export interface ErrorScreen {
  /** Show the card now (boot failures). */
  fatal(err: unknown): void;
  readonly shown: boolean;
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function benign(msg: string): boolean {
  // Browser noise that is not ours to report.
  return /ResizeObserver loop|Script error\.?$|AbortError|play\(\) request was interrupted/i.test(msg);
}

export function installErrorScreen(opts: ErrorScreenOpts): ErrorScreen {
  let shown = false;
  let pending: unknown = null;
  let checkTimer: ReturnType<typeof setTimeout> | null = null;

  const draw = (err: unknown, g = opts.g) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = "#0c1a12";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // Soil line and the wilted seedling, drawn at 2x.
    g.fillStyle = "#142a1c";
    g.fillRect(0, 70, SCREEN_W, 2);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = WILT_COLORS[WILT[y][x]];
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(64 + x * 2, 26 + y * 2, 2, 2);
      }
    }
    drawWindow(g, 0, 88, SCREEN_W, 56);
    drawText(g, "Something wilted…", 8, 98, UI.black);
    drawText(g, "Let's replant it.", 8, 110, UI.dark);
    drawText(g, "▶ A: RELOAD", 8, 126, UI.black);
    // A short, quiet code for bug reports.
    const code = describe(err).replace(/[^A-Za-z0-9 :._-]/g, "").toUpperCase();
    drawText(g, code.slice(0, 19), 4, 4, "#24402e");
    if (code.length > 19) drawText(g, code.slice(19, 38), 4, 12, "#24402e");
  };

  const reload = () => location.reload();

  const show = (err: unknown) => {
    if (shown) return;
    shown = true;
    try {
      draw(err);
    } catch {
      // Even the UI kit failed: plain DOM fallback.
      const div = document.createElement("div");
      div.className = "vr-fallback-error";
      div.textContent = "Something wilted… Tap or press a key to reload.";
      document.body.appendChild(div);
    }
    opts.canvas.setAttribute("aria-label", "Something wilted. Press A, Enter or tap to reload.");
    opts.onShow?.((g) => { try { draw(err, g); } catch { /* fallback already shown */ } });
    // Let the key that might still be held go first.
    setTimeout(() => {
      addEventListener("keydown", (e) => {
        if (["KeyZ", "Space", "KeyJ", "Enter", "NumpadEnter"].includes(e.code)) reload();
      });
      addEventListener("pointerup", reload);
    }, 400);
  };

  /** After an error, see whether the loop is still ticking; only a dead loop is fatal. */
  const check = (err: unknown) => {
    if (shown) return;
    pending = err;
    if (checkTimer) return;
    const before = opts.ticks();
    const verify = () => {
      checkTimer = null;
      // Hidden tabs stop requestAnimationFrame, so a still tick count proves
      // nothing there, except under `?timer`, where the loop runs on timeouts.
      const ticksWhileHidden = new URLSearchParams(location.search).has("timer");
      if (document.hidden && !ticksWhileHidden) {
        // Frames don't run while hidden; decide when we're visible again.
        const onVis = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVis);
          check(pending);
        };
        document.addEventListener("visibilitychange", onVis);
        return;
      }
      if (opts.ticks() === before) show(pending);
    };
    checkTimer = setTimeout(verify, 600);
  };

  addEventListener("error", (e) => {
    const err = e.error ?? e.message;
    const msg = describe(err);
    if (benign(msg)) return;
    console.error("[verdant] uncaught error:", err);
    check(err);
  });
  addEventListener("unhandledrejection", (e) => {
    const msg = describe(e.reason);
    if (benign(msg)) return;
    console.error("[verdant] unhandled rejection:", e.reason);
    check(e.reason);
  });

  return {
    fatal(err) {
      console.error("[verdant] fatal:", err);
      show(err);
    },
    get shown() { return shown; },
  };
}
