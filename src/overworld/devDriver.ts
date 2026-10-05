// Dev-only test driver (window.__t in `vite dev`): synthesises key presses and
// walks the player along BFS paths so play-tests can be scripted from the
// browser console. Never imported by production code paths.

import type { Dir, SceneStack } from "../contracts";
import { tryMove, warpAt } from "./map";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const KEY: Record<Dir, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

interface OwLike {
  mapId: string;
  busy: number;
  map: Parameters<typeof tryMove>[0];
  player: { x: number; y: number; facing: Dir; step: unknown };
  npcAt(x: number, y: number): unknown;
}

export function installDevDriver(scenes: SceneStack & { all(): unknown[] }) {
  const ow = () => scenes.all()[0] as OwLike;
  const hold = async (code: string, ms = 60) => {
    dispatchEvent(new KeyboardEvent("keydown", { code }));
    await sleep(ms);
    dispatchEvent(new KeyboardEvent("keyup", { code }));
    await sleep(40);
  };
  const step = async (d: Dir) => {
    const o = ow();
    const sx = o.player.x, sy = o.player.y, sm = o.mapId;
    dispatchEvent(new KeyboardEvent("keydown", { code: KEY[d] }));
    const t0 = performance.now();
    while (performance.now() - t0 < 1500) {
      await sleep(8);
      const q = ow();
      if (q.mapId !== sm || q.player.x !== sx || q.player.y !== sy || q.busy) break;
    }
    dispatchEvent(new KeyboardEvent("keyup", { code: KEY[d] }));
    while (ow().player.step) await sleep(8);
    await sleep(30);
  };
  const goto = async (tx: number, ty: number): Promise<string> => {
    const o = ow();
    const k = (x: number, y: number) => `${x},${y}`;
    const prev = new Map<string, [number, number, Dir] | null>([[k(o.player.x, o.player.y), null]]);
    const q: [number, number][] = [[o.player.x, o.player.y]];
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === tx && y === ty) break;
      for (const d of ["up", "down", "left", "right"] as Dir[]) {
        const r = tryMove(o.map, x, y, d, (a, b) => !!o.npcAt(a, b));
        if (r.kind === "blocked" || prev.has(k(r.x, r.y))) continue;
        if (warpAt(o.map, r.x, r.y) && !(r.x === tx && r.y === ty)) continue;
        prev.set(k(r.x, r.y), [x, y, d]);
        q.push([r.x, r.y]);
      }
    }
    if (!prev.has(k(tx, ty))) return "no path";
    const dirs: Dir[] = [];
    let cur = k(tx, ty);
    while (prev.get(cur)) {
      const [x, y, d] = prev.get(cur)!;
      dirs.unshift(d);
      cur = k(x, y);
    }
    for (const d of dirs) {
      if (ow().busy) return `interrupted at ${k(ow().player.x, ow().player.y)}`;
      await step(d);
    }
    return "ok";
  };
  const talkThrough = async (max = 40, key = "KeyZ") => {
    for (let i = 0; i < max; i++) {
      if (ow().busy === 0 && scenes.all().length === 1) return i;
      await hold(key, 100);
      await sleep(350);
    }
    return -1;
  };
  const info = () => {
    const o = ow();
    return { map: o.mapId, x: o.player.x, y: o.player.y, f: o.player.facing, busy: o.busy, n: scenes.all().length };
  };
  (window as unknown as { __t: unknown }).__t = { sleep, hold, step, goto, talkThrough, info, ow };
}
