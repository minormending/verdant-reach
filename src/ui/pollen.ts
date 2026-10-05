// Drifting gold pollen motes (title screen, prologue-style cards).

import { SCREEN_H, SCREEN_W } from "../contracts";

interface Mote { x: number; y: number; vx: number; vy: number; phase: number; size: 1 | 2; tw: number }

export class Pollen {
  private motes: Mote[] = [];
  private t = 0;
  constructor(count = 28, private colors = ["#f8e080", "#f8c040", "#fff8c0"], seed = 7) {
    let s = seed;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: rnd() * SCREEN_W,
        y: rnd() * SCREEN_H,
        vx: 0.08 + rnd() * 0.18,
        vy: 0.06 + rnd() * 0.16,
        phase: rnd() * Math.PI * 2,
        size: rnd() < 0.25 ? 2 : 1,
        tw: Math.floor(rnd() * 60),
      });
    }
  }
  update() {
    this.t++;
    for (const m of this.motes) {
      m.x += m.vx + Math.sin(this.t / 40 + m.phase) * 0.15;
      m.y += m.vy;
      if (m.x > SCREEN_W + 2) m.x -= SCREEN_W + 4;
      if (m.y > SCREEN_H + 2) { m.y = -2; m.x = (m.x * 7.3) % SCREEN_W; }
    }
  }
  draw(g: CanvasRenderingContext2D, alpha = 1) {
    g.globalAlpha = alpha;
    for (const m of this.motes) {
      const tw = (this.t + m.tw) % 90 < 70;
      g.fillStyle = this.colors[(m.size + (tw ? 0 : 1)) % this.colors.length];
      g.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      if (m.size === 2 && tw) {
        g.globalAlpha = alpha * 0.5;
        g.fillRect(Math.round(m.x) - 1, Math.round(m.y), 1, 1);
        g.fillRect(Math.round(m.x) + 2, Math.round(m.y) + 1, 1, 1);
        g.globalAlpha = alpha;
      }
    }
    g.globalAlpha = 1;
  }
}
