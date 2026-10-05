// Growth (evolution) sequence: the sprite flashes between the old and new
// forms, faster and faster; B cancels. On success the new form is revealed
// with the growth jingle, then any moves learned at this level are offered.

import type { GameContext, Quickened, SpeciesId } from "../../contracts";
import { speciesPath, UI } from "../../contracts";
import { applyGrowth } from "../../battle/logic/exp";
import { qName, speciesName } from "../../battle/logic/lookup";
import { Fx } from "../../battle/fx";
import { clearScreen, drawSpecies, preload } from "../kit/draw";
import { runFlowScene } from "../kit/flow";
import { fmt, markCaught } from "../kit/text";
import { ScreenUi } from "../kit/widgets";
import { learnMoveFlow } from "./learn";

const SPRITE_X = 52;
const SPRITE_Y = 24;

/** Run the growth scene. Resolves true if the Quickened grew. */
export function runGrowth(ctx: GameContext, q: Quickened, to: SpeciesId): Promise<boolean> {
  let ui!: ScreenUi;
  const fx = new Fx();
  const view = { species: q.species as SpeciesId, silhouette: null as string | null, white: 0 };
  return runFlowScene<boolean>(ctx, {
    fallback: false,
    draw(g) {
      clearScreen(g, UI.white);
      drawSpecies(ctx, g, view.species, "front", SPRITE_X, SPRITE_Y, { sport: q.sport, silhouette: view.silhouette ?? undefined });
      fx.draw(g);
      if (view.white > 0) {
        g.fillStyle = `rgba(248,248,248,${view.white})`;
        g.fillRect(0, 0, 160, 144);
      }
      if (!ui?.tb.visible) ctx.ui.drawWindow(g, 0, 96, 160, 48);
      ui?.draw(g);
    },
    async main(flow) {
      ui = new ScreenUi(ctx, flow);
      const tick = () => fx.update();
      const fxTask = { update: () => { tick(); return false; } };
      void flow.run(fxTask);
      await preload(ctx, [speciesPath(q.species, "front"), speciesPath(to, "front")]);
      const prevMusic = ctx.audio.current();
      ctx.audio.stopMusic(20);
      const name = qName(ctx.data, q);
      await ui.say(`What? ${name} is growing!`);
      void ctx.audio.playCry(q.species);
      ui.tb.clear();
      await flow.wait(30);

      // Flash between forms, accelerating; B cancels.
      let cancelled = false;
      const total = 300;
      let f = 0;
      let showNew = false;
      let nextSwap = 0;
      await flow.run({
        update(input) {
          if (input.pressed("b")) { cancelled = true; return true; }
          f++;
          const period = Math.max(2, Math.round(26 - (24 * f) / total));
          if (f >= nextSwap) { showNew = !showNew; nextSwap = f + period; }
          view.silhouette = "#304858";
          view.species = showNew ? to : q.species;
          if (f % 24 === 0) fx.sparkle({ x: SPRITE_X + 28, y: SPRITE_Y + 28 });
          return f >= total;
        },
      });
      view.silhouette = null;
      if (cancelled) {
        view.species = q.species;
        await ui.say(`Huh? ${name} stopped growing!`);
        if (prevMusic) ctx.audio.playMusic(prevMusic);
        return false;
      }
      // Reveal
      await flow.animate(12, (_i, t) => { view.white = t; });
      view.species = to;
      await flow.animate(16, (_i, t) => { view.white = 1 - t; });
      view.white = 0;
      void ctx.audio.playCry(to);
      const newMoves = applyGrowth(ctx.data, q, to);
      markCaught(ctx, to);
      const jingle = ctx.audio.playJingle("growth");
      await ui.say(fmt(ctx, `Congratulations! ${name} grew into ${speciesName(ctx.data, to)}!`));
      await jingle;
      for (const m of newMoves) await learnMoveFlow(ctx, ui, flow, q, m);
      if (prevMusic) ctx.audio.playMusic(prevMusic);
      return true;
    },
  });
}
