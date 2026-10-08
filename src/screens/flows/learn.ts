// Crystal's move-learning dialogue, including "forget a move?".

import type { GameContext, MoveId, Quickened } from "../../contracts";
import { tryLearn, replaceMove } from "../../battle/logic/exp";
import { moveName, qName } from "../../battle/logic/lookup";
import { centered } from "../kit/layout";
import type { Flow } from "../kit/flow";
import { Menu, type ScreenUi } from "../kit/widgets";

/** Returns true if the move was learned. */
export async function learnMoveFlow(ctx: GameContext, ui: ScreenUi, flow: Flow, q: Quickened, move: MoveId): Promise<boolean> {
  const name = qName(ctx.data, q);
  const mName = moveName(ctx.data, move);
  const r = tryLearn(ctx.data, q, move);
  if (r === "known") return false;
  if (r === "learned") {
    ctx.audio.playSfx("select");
    await ui.say(`${name} learned ${mName}!`);
    return true;
  }
  await ui.say(`${name} is trying to learn ${mName}.`);
  await ui.say(`But ${name} can't learn more than four moves.`);
  for (;;) {
    const del = await ui.yesNo(`Delete an older move to make room for ${mName}?`);
    if (del) {
      await ui.say("Which move should be forgotten?", "hold");
      const labels = q.moves.map((m) => moveName(ctx.data, m.id));
      const menu = new Menu(ctx, labels, { ...centered(192, 72), w: 192, spacing: 16 });
      const idx = await ui.choose(menu);
      if (idx >= 0) {
        const old = moveName(ctx.data, q.moves[idx].id);
        replaceMove(ctx.data, q, idx, move);
        await ui.say("1, 2 and... Poof!");
        await ui.say(`${name} forgot ${old}.\n\nAnd...`);
        ctx.audio.playSfx("select");
        await ui.say(`${name} learned ${mName}!`);
        return true;
      }
    }
    const stop = await ui.yesNo(`Stop learning ${mName}?`);
    if (stop) {
      await ui.say(`${name} did not learn ${mName}.`);
      return false;
    }
    void flow;
  }
}
