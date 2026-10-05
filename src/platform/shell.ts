// The page around the game: crisp integer scaling with letterboxing, the
// bezel, the fullscreen toggle (button + F) and the touch controls.

import { ART, computeLayout, type Insets, type Layout } from "./layout";
import { artCanvas, drawFullscreenIcon } from "./art";
import { createTouchControls, type TouchControls } from "./touch";

export interface Shell {
  layout(): Layout;
  touch: TouchControls;
  /** Force a relayout (e.g. after the canvas was re-sized by someone else). */
  refresh(): void;
  toggleFullscreen(): void;
}

function forcedTouch(): boolean | null {
  const t = new URLSearchParams(location.search).get("touch");
  return t === "1" ? true : t === "0" ? false : null;
}

export function isTouchDevice(): boolean {
  const forced = forcedTouch();
  if (forced !== null) return forced;
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return coarse || (navigator.maxTouchPoints > 0 && typeof matchMedia === "function" && matchMedia("(hover: none)").matches);
}

/** Reads env(safe-area-inset-*) through a probe element. */
function safeInsets(probe: HTMLElement): Insets {
  const cs = getComputedStyle(probe);
  const n = (v: string) => parseFloat(v) || 0;
  return { top: n(cs.paddingTop), right: n(cs.paddingRight), bottom: n(cs.paddingBottom), left: n(cs.paddingLeft) };
}

const fullscreenSupported = () =>
  !!(document.fullscreenEnabled || (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled);

const isFullscreen = () =>
  !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);

export function createShell(canvas: HTMLCanvasElement, onInteract: () => void): Shell {
  document.documentElement.classList.add("vr-ready");
  const bezel = document.getElementById("vr-bezel") ?? (() => {
    const d = document.createElement("div");
    d.id = "vr-bezel";
    document.body.insertBefore(d, canvas);
    return d;
  })();
  const probe = document.createElement("div");
  probe.id = "vr-safe";
  document.body.appendChild(probe);

  let touchMode = isTouchDevice();
  const touch = createTouchControls(() => {
    onInteract();
    if (!touchMode) { touchMode = true; apply(); }
  });

  // --- Fullscreen --------------------------------------------------------------
  const fsBtn = document.createElement("button");
  fsBtn.id = "vr-fs";
  fsBtn.type = "button";
  fsBtn.title = "Fullscreen (F)";
  fsBtn.setAttribute("aria-label", "Toggle fullscreen");
  const [fsC, fsG] = artCanvas(ART.fs, ART.fs);
  fsBtn.appendChild(fsC);
  document.body.appendChild(fsBtn);
  const toggleFullscreen = () => {
    if (!fullscreenSupported()) return;
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (isFullscreen()) {
      void (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    } else {
      const p = el.requestFullscreen?.({ navigationUI: "hide" }) ?? el.webkitRequestFullscreen?.();
      if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => { /* denied */ });
    }
  };
  fsBtn.addEventListener("click", (e) => { e.preventDefault(); toggleFullscreen(); fsBtn.blur(); });
  addEventListener("keydown", (e) => {
    if (e.code === "KeyF" && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) toggleFullscreen();
    // A real keyboard on a touch device hides the on-screen pad until the next tap.
    if (e.isTrusted && touchMode && forcedTouch() === null && e.code !== "KeyF") {
      touchMode = false;
      apply();
    }
  });
  const onFsChange = () => { drawFullscreenIcon(fsG, isFullscreen()); apply(); };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  drawFullscreenIcon(fsG, false);
  // On a hybrid laptop, a first touch anywhere brings the pad up.
  addEventListener("touchstart", () => { if (!touchMode && forcedTouch() !== false) { touchMode = true; apply(); } }, { passive: true });

  // --- Layout --------------------------------------------------------------------
  let current: Layout;
  const apply = () => {
    const vw = document.documentElement.clientWidth || innerWidth;
    const vh = innerHeight;
    current = computeLayout({ vw, vh, dpr: devicePixelRatio || 1, touch: touchMode, safe: safeInsets(probe) });
    const s = current.screen;
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${s.x}px`, top: `${s.y}px`,
      width: `${s.w}px`, height: `${s.h}px`,
    });
    const pad = current.bezel || (current.mode === "desktop" ? 0 : 6);
    if (pad > 0) {
      bezel.style.display = "block";
      Object.assign(bezel.style, {
        left: `${s.x - pad}px`, top: `${s.y - pad}px`,
        width: `${s.w + pad * 2}px`, height: `${s.h + pad * 2}px`,
        borderRadius: `${Math.round(pad * 0.6)}px ${Math.round(pad * 0.6)}px ${Math.round(pad * 2.2)}px ${Math.round(pad * 0.6)}px`,
      });
    } else {
      bezel.style.display = "none";
    }
    document.documentElement.dataset.layout = current.mode;
    touch.setVisible(touchMode);
    touch.place(current);
    const f = current.fullscreen;
    fsBtn.style.display = fullscreenSupported() ? "block" : "none";
    Object.assign(fsBtn.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px` });
  };
  addEventListener("resize", apply);
  addEventListener("orientationchange", () => setTimeout(apply, 60));
  if (typeof matchMedia === "function") {
    // devicePixelRatio changes when the window moves between monitors or zooms.
    const watchDpr = () => {
      const mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      const on = () => { mq.removeEventListener("change", on); apply(); watchDpr(); };
      mq.addEventListener("change", on);
    };
    watchDpr();
  }
  apply();

  return {
    layout: () => current,
    touch,
    refresh: apply,
    toggleFullscreen,
  };
}
