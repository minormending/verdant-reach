// Native-screen sizing. The page shell still owns touch/fullscreen controls;
// this adapter lets the screen core own canvas dimensions during the restyle.
import { SCREEN_H, SCREEN_W } from "../contracts";
import type { Layout, Shell } from "../platform";

interface Rect { x: number; y: number; w: number; h: number }

/** Largest integer device-pixel scale, centred and snapped to physical pixels. */
export function fitScreen(area: Rect, dpr = 1) {
  const scale = Math.max(1, Math.floor(Math.min(area.w * dpr / SCREEN_W, area.h * dpr / SCREEN_H) + 1e-6));
  const w = SCREEN_W * scale / dpr;
  const h = SCREEN_H * scale / dpr;
  return {
    scale,
    screen: { x: Math.round((area.x + (area.w - w) / 2) * dpr) / dpr,
      y: Math.round((area.y + (area.h - h) / 2) * dpr) / dpr, w, h },
  };
}

/** Keep the screen inside the space reserved by the shell's touch controls. */
export function screenArea(layout: Layout, viewport: Rect): Rect {
  const controls = [layout.dpad, layout.a, layout.b, layout.start, layout.select].filter((r): r is Rect => !!r);
  if (layout.mode === "portrait") {
    const bottom = Math.min(viewport.y + viewport.h, ...controls.map((r) => r.y - 12));
    return { ...viewport, h: Math.max(1, bottom - viewport.y) };
  }
  if (layout.mode === "landscape") {
    const left = Math.max(viewport.x, ...[layout.dpad, layout.select].filter((r): r is Rect => !!r).map((r) => r.x + r.w + 12));
    const right = Math.min(viewport.x + viewport.w, ...[layout.a, layout.b, layout.start].filter((r): r is Rect => !!r).map((r) => r.x - 12));
    return { x: left, y: viewport.y, w: Math.max(1, right - left), h: viewport.h };
  }
  return viewport;
}

/** Refit after shell relayouts (resize, orientation, DPR or touch-mode changes). */
export function bindScreenLayout(canvas: HTMLCanvasElement, shell: Shell) {
  const apply = () => {
    const probe = document.getElementById("vr-safe");
    const safe = probe ? getComputedStyle(probe) : undefined;
    const inset = (value?: string) => Number.parseFloat(value ?? "") || 0;
    const x = inset(safe?.paddingLeft), y = inset(safe?.paddingTop);
    const viewport = { x, y, w: (document.documentElement.clientWidth || innerWidth) - x - inset(safe?.paddingRight),
      h: innerHeight - y - inset(safe?.paddingBottom) };
    const layout = shell.layout();
    const { scale, screen } = fitScreen(screenArea(layout, viewport), devicePixelRatio || 1);
    layout.scale = scale;
    layout.screen = screen;
    // Avoid mutation loops when observing our own style writes.
    for (const [key, value] of Object.entries({ left: screen.x, top: screen.y, width: screen.w, height: screen.h })) {
      const css = `${value}px`;
      if (canvas.style.getPropertyValue(key) !== css) canvas.style.setProperty(key, css);
    }
    const bezel = document.getElementById("vr-bezel");
    // The integer fit uses the whole available area; the page remains the letterbox.
    if (bezel) bezel.style.display = "none";
    shell.touch.place(layout);
  };
  const observer = new MutationObserver(apply);
  observer.observe(canvas, { attributes: true, attributeFilter: ["style"] });
  apply();
  return () => observer.disconnect();
}
