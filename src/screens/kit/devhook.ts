// Dev-only test driver (used by the ?dev= routes, never by the game).
// Exposes window.__vr = { step(frames, press?), render() } so a hidden,
// throttled browser tab can still be driven at full speed: it wraps
// ctx.input so injected presses last exactly one update.

import type { Button, GameContext, Input } from "../../contracts";
import { SCREEN_H, SCREEN_W } from "../../contracts";

export function installDevHook(ctx: GameContext) {
  const real = ctx.input;
  let injected = new Set<Button>();
  let held = new Set<Button>();
  const input: Input = {
    pressed: (b) => injected.has(b) || real.pressed(b),
    held: (b) => held.has(b) || real.held(b),
    repeat: (b) => injected.has(b) || real.repeat(b),
  };
  (ctx as { input: Input }).input = input;
  const stack = ctx.scenes as unknown as { all?: () => { draw(g: CanvasRenderingContext2D): void; transparent?: boolean }[] };
  const render = () => {
    const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
    const g = canvas?.getContext("2d");
    if (!g || !stack.all) return;
    const all = stack.all();
    let from = all.length - 1;
    while (from > 0 && all[from].transparent) from--;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    for (let i = Math.max(0, from); i < all.length; i++) all[i].draw(g);
  };
  const drain = async () => { for (let i = 0; i < 20; i++) await null; };
  // `?freeze`: the real loop stops updating scenes; only step() advances
  // time, so screenshots land on exact frames.
  let frozen = new URLSearchParams(location.search).has("freeze");
  let stepping = false;
  const realTop = ctx.scenes.top.bind(ctx.scenes);
  const idle = { update() {}, draw() {} };
  (ctx.scenes as { top: () => unknown }).top = () => (frozen && !stepping ? (realTop() ? idle : undefined) : realTop());
  const w = window as unknown as { __vr?: Record<string, unknown> };
  w.__vr = Object.assign(w.__vr ?? {}, {
    ctx,
    freeze(on = true) { frozen = on; },
    /** Run `frames` updates; `press` is pressed on the first one. */
    async step(frames = 1, press?: Button | Button[], hold?: Button[]) {
      held = new Set(hold ?? []);
      stepping = true;
      for (let i = 0; i < frames; i++) {
        injected = new Set(i === 0 && press ? (Array.isArray(press) ? press : [press]) : []);
        ctx.scenes.top()?.update(1000 / 60);
        injected = new Set();
        await drain();
      }
      stepping = false;
      held = new Set();
      render();
      return ctx.scenes.top() ? "ok" : "empty";
    },
    render,
  });
}
