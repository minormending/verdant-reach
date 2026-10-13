// Route rematches: a beaten outdoor trainer's after line, a YES/NO question,
// then a fresh rematch team at +(wins + 1) levels. Only a win moves the count.
import type { BattleOutcome } from "../contracts";
import { buildRematch, isRematchTrainer, rematchPrompt } from "../world";
import type { ScriptHost } from "./script";

/** Talk to a beaten trainer. Returns the rematch outcome, or null if none was fought. */
export async function beatenTrainerTalk(host: ScriptHost, trainerId: string): Promise<BattleOutcome | null> {
  const { ctx } = host;
  const tr = ctx.world.trainers[trainerId];
  if (!tr) return null;
  await ctx.ui.say(tr.after);
  if (!isRematchTrainer(ctx.world, trainerId)) return null;
  if (!(await ctx.ui.yesNo(rematchPrompt(tr)))) return null;
  const wins = ctx.state.trainerRematches?.[trainerId] ?? 0;
  const result = await host.battle({
    kind: "trainer", trainer: trainerId, trainerDef: buildRematch(ctx.data, tr, wins), backdrop: host.backdrop?.(),
  });
  // Only a win counts: a loss, or a crashed battle ("error"), retries at the same level.
  if (result === "won") ctx.state.trainerRematches = { ...ctx.state.trainerRematches, [trainerId]: wins + 1 };
  else if (result === "lost") await host.whiteout();
  return result;
}
