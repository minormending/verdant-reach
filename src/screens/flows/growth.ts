// Growth (evolution) sequence: light gathers, the sprite flashes between the
// old and new forms as silhouettes, faster and faster, while rays spin up
// behind it; B cancels. On success there's a white-out, the new form is
// revealed with a burst of sparkles and the growth jingle, then any moves
// learned at this level are offered.

import type { GameContext, Quickened, SpeciesId } from "../../contracts";
import { speciesPath, UI } from "../../contracts";
import { applyGrowth } from "../../battle/logic/exp";
import { qName, speciesName } from "../../battle/logic/lookup";
import { checker, ellipse, Fx } from "../../battle/fx";
import { drawSpecies, preload } from "../kit/draw";
import { runFlowScene } from "../kit/flow";
import { fmt, markCaught } from "../kit/text";
import { ScreenUi } from "../kit/widgets";
import { learnMoveFlow } from "./learn";

const SPRITE_X = 52;
const SPRITE_Y = 24;
const CX = SPRITE_X + 28;
const CY = SPRITE_Y + 30;

/** Accelerating flash schedule: frames each form is shown for, from slow to a flicker. */
export function growthPeriods(total: number): number[] {
  const out: number[] = [];
  let f = 0;
  while (f < total) {
    const p = Math.max(2, Math.round(26 - (24 * f) / total));
    out.push(p);
    f += p;
  }
  return out;
}

/** Run the growth scene. Trade growth cannot be cancelled; other growth can. */
export function runGrowth(ctx: GameContext, q: Quickened, to: SpeciesId, opts: { canCancel?: boolean } = {}): Promise<boolean> {
  let ui!: ScreenUi;
  const fx = new Fx();
  const view = { species: q.species as SpeciesId, silhouette: null as string | null, white: 0, rays: 0, spin: 0, glow: 0, dy: 0 };
  return runFlowScene<boolean>(ctx, {
    fallback: false,
    draw(g, frame) {
      // greenhouse light: a pale wash, then rays turning behind the plant
      g.fillStyle = "#f4f4e8";
      g.fillRect(0, 0, 160, 96);
      g.fillStyle = "#e8ecd8";
      g.fillRect(0, 80, 160, 16);
      if (view.rays > 0) {
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = view.spin + (i / n) * Math.PI * 2;
          const len = Math.round(30 + view.rays * 60);
          for (let r = 10; r < len; r += 2) {
            const x = Math.round(CX + Math.cos(a) * r), y = Math.round(CY + Math.sin(a) * r * 0.8);
            if (y < 0 || y >= 96) continue;
            g.fillStyle = i % 2 ? "#f0d878" : "#c8e098";
            g.fillRect(x, y, 2, 2);
          }
        }
      }
      if (view.glow > 0) {
        const r = Math.round(10 + view.glow * 18);
        ellipse(g, CX, CY, r, Math.round(r * 0.8), "#fbf8e0");
        checker(g, CX - r - 4, CY - r, r * 2 + 8, r * 2, "#f8f0c0", frame >> 3);
      }
      // the soil the plant stands in
      ellipse(g, CX, SPRITE_Y + 56, 24, 4, "#c8b890");
      ellipse(g, CX, SPRITE_Y + 55, 21, 3, "#e0d4b0");
      drawSpecies(ctx, g, view.species, "front", SPRITE_X, SPRITE_Y + view.dy, { sport: q.sport, silhouette: view.silhouette ?? undefined });
      fx.drawBack(g);
      fx.draw(g);
      if (view.white > 0) {
        const step = Math.ceil(view.white * 4) / 4;
        g.fillStyle = `rgba(248,248,248,${step})`;
        g.fillRect(0, 0, 160, 144);
      }
      if (!ui?.tb.visible) ctx.ui.drawWindow(g, 0, 96, 160, 48);
      ui?.draw(g);
      void UI;
    },
    async main(flow) {
      ui = new ScreenUi(ctx, flow);
      void flow.run({ update: () => { fx.update(); return false; } });
      await preload(ctx, [speciesPath(q.species, "front"), speciesPath(to, "front")]);
      const prevMusic = ctx.audio.current();
      ctx.audio.stopMusic(20);
      const name = qName(ctx.data, q);
      await ui.say(`What? ${name} is growing!`);
      void ctx.audio.playCry(q.species);
      ui.tb.clear();
      // light gathers
      await flow.animate(30, (_i, t) => { view.glow = t * 0.5; view.rays = t * 0.2; });

      // Flash between forms, accelerating; B cancels unless this is trade growth.
      let cancelled = false;
      const total = 300;
      let f = 0;
      let showNew = false;
      let nextSwap = 0;
      const periods = growthPeriods(total);
      let k = 0;
      await flow.run({
        update(input) {
          if (opts.canCancel !== false && input.pressed("b")) { cancelled = true; return true; }
          f++;
          const t = f / total;
          if (f >= nextSwap) { showNew = !showNew; nextSwap = f + (periods[k++] ?? 2); }
          view.silhouette = "#304858";
          view.species = showNew ? to : q.species;
          view.rays = 0.2 + t * 0.8;
          view.spin += 0.01 + t * 0.08;
          view.glow = 0.5 + t * 0.5;
          // motes drawn in toward the plant, more often as it builds
          if (f % Math.max(4, Math.round(20 - t * 16)) === 0) {
            const a = Math.random() * Math.PI * 2;
            fx.add({
              x: CX, y: CY, shape: "twinkle", color: "#ffffff", color2: t > 0.6 ? "#f8d850" : "#a8e070", max: 18,
              to: { sx: CX + Math.cos(a) * 46, sy: CY + Math.sin(a) * 36, x: CX, y: CY, arc: 0, ease: "in" },
            });
          }
          return f >= total;
        },
      });
      view.silhouette = null;
      if (cancelled) {
        view.species = q.species;
        view.rays = 0; view.glow = 0;
        fx.clear();
        await ui.say(`Huh? ${name} stopped growing!`);
        if (prevMusic) ctx.audio.playMusic(prevMusic);
        return false;
      }
      // Reveal: white-out, the new form, then a burst of sparkles and a hop.
      await flow.animate(12, (_i, t) => { view.white = t; });
      view.species = to;
      view.rays = 1;
      await flow.animate(16, (_i, t) => { view.white = 1 - t; });
      view.white = 0;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        fx.add({ x: CX, y: CY, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.4, shape: i % 2 ? "star" : "twinkle", color: "#ffffff", color2: i % 4 < 2 ? "#f8d850" : "#a8e070", max: 26, blink: true });
      }
      void flow.animate(24, (_i, t) => {
        view.dy = -Math.round(Math.sin(Math.min(1, t * 2) * Math.PI) * 4);
        view.rays = 1 - t * 0.6;
        view.glow = 1 - t;
      });
      void ctx.audio.playCry(to);
      const newMoves = applyGrowth(ctx.data, q, to);
      markCaught(ctx, to);
      const jingle = ctx.audio.playJingle("growth");
      await ui.say(fmt(ctx, `Congratulations! ${name} grew into ${speciesName(ctx.data, to)}!`));
      await jingle;
      view.dy = 0;
      for (const m of newMoves) await learnMoveFlow(ctx, ui, flow, q, m);
      if (prevMusic) ctx.audio.playMusic(prevMusic);
      return true;
    },
  });
}
