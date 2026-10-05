// On-screen controls for touch devices. Each control synthesises the same
// KeyboardEvents the keyboard does (the engine listens for `code`), so the
// game cannot tell a tap from a key press.

import { ART, dpadDirection, type Layout, type Rect } from "./layout";
import { artCanvas, drawDpad, drawPill, drawRoundButton, type Dir4 } from "./art";

export const TOUCH_KEYS = {
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
  a: "KeyZ", b: "KeyX", start: "Enter", select: "ShiftLeft",
} as const;

export function sendKey(code: string, type: "keydown" | "keyup") {
  dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
}

const buzz = () => { try { navigator.vibrate?.(6); } catch { /* unsupported */ } };

export interface TouchControls {
  root: HTMLElement;
  place(layout: Layout): void;
  setVisible(on: boolean): void;
  /** Release everything (e.g. on blur) so nothing sticks down. */
  releaseAll(): void;
}

function control(root: HTMLElement, cls: string, label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `vr-ctl ${cls}`;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", label);
  root.appendChild(el);
  return el;
}

function put(el: HTMLElement, r: Rect | undefined) {
  if (!r) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.style.left = `${r.x}px`;
  el.style.top = `${r.y}px`;
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
}

export function createTouchControls(onInteract: () => void): TouchControls {
  const root = document.createElement("div");
  root.id = "vr-touch";
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  const releases: (() => void)[] = [];

  // --- D-pad: one pointer, slide between directions --------------------------
  const pad = control(root, "vr-dpad", "D-pad");
  const [padC, padG] = artCanvas(ART.dpad, ART.dpad);
  pad.appendChild(padC);
  drawDpad(padG, null);
  let dir: Dir4 | null = null;
  let padPointer: number | null = null;
  const setDir = (d: Dir4 | null) => {
    if (d === dir) return;
    if (dir) sendKey(TOUCH_KEYS[dir], "keyup");
    dir = d;
    if (d) { sendKey(TOUCH_KEYS[d], "keydown"); buzz(); }
    drawDpad(padG, d);
  };
  const padDir = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    return dpadDirection(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width);
  };
  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    onInteract();
    padPointer = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
    setDir(padDir(e));
  });
  pad.addEventListener("pointermove", (e) => {
    if (e.pointerId !== padPointer) return;
    setDir(padDir(e));
  });
  const padUp = (e: PointerEvent) => {
    if (e.pointerId !== padPointer) return;
    padPointer = null;
    setDir(null);
  };
  pad.addEventListener("pointerup", padUp);
  pad.addEventListener("pointercancel", padUp);
  releases.push(() => { padPointer = null; setDir(null); });

  // --- Buttons ----------------------------------------------------------------
  const button = (cls: string, label: string, code: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, down: boolean) => void) => {
    const el = control(root, cls, label);
    const [c, g] = artCanvas(w, h);
    el.appendChild(c);
    draw(g, false);
    const pointers = new Set<number>();
    const down = (e: PointerEvent) => {
      e.preventDefault();
      onInteract();
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
      if (pointers.size === 0) { sendKey(code, "keydown"); buzz(); draw(g, true); }
      pointers.add(e.pointerId);
    };
    const up = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size === 0) { sendKey(code, "keyup"); draw(g, false); }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    releases.push(() => {
      if (pointers.size) { pointers.clear(); sendKey(code, "keyup"); draw(g, false); }
    });
    return el;
  };
  const a = button("vr-a", "A button", TOUCH_KEYS.a, ART.button, ART.button, (g, d) => drawRoundButton(g, "A", d));
  const b = button("vr-b", "B button", TOUCH_KEYS.b, ART.button, ART.button, (g, d) => drawRoundButton(g, "B", d));
  const start = button("vr-start", "Start", TOUCH_KEYS.start, ART.pill.w, ART.pill.h, (g, d) => drawPill(g, "START", d));
  const select = button("vr-select", "Select", TOUCH_KEYS.select, ART.pill.w, ART.pill.h, (g, d) => drawPill(g, "SELECT", d));

  // Long-press menus, text selection and double-tap zoom would all get in the way.
  root.addEventListener("contextmenu", (e) => e.preventDefault());

  return {
    root,
    place(layout) {
      put(pad, layout.dpad);
      put(a, layout.a);
      put(b, layout.b);
      put(start, layout.start);
      put(select, layout.select);
    },
    setVisible(on) {
      root.style.display = on ? "block" : "none";
      if (!on) for (const r of releases) r();
    },
    releaseAll() { for (const r of releases) r(); },
  };
}
