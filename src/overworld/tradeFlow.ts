// The NPC's exchange counter. Branches run only after receipt and any growth.
import type { ScriptCmd } from "../contracts";
import { crossPollinationTarget } from "../battle/logic/exp";
import { partyScreen } from "../screens/party";
import { runGrowth } from "../screens/flows/growth";
import { quickenedName, speciesName, type ScriptHost } from "./script";
import { canTrade, swapTrade } from "./trade";

export async function tradeFlow(host: ScriptHost, offer: Extract<ScriptCmd, { op: "trade" }>): Promise<boolean> {
  const { ctx } = host;
  const eligible = (q: typeof ctx.state.party[number]) => canTrade(q, offer.wants);
  if (!ctx.state.party.some(eligible)) return false;
  const slot = await partyScreen(ctx, { mode: "pick", prompt: "Trade which one?", filter: eligible });
  const picked = ctx.state.party[slot];
  if (!canTrade(picked, offer.wants)) return false;
  await ctx.ui.say(`For my ${speciesName(ctx, offer.gives.species)}.`);
  if (!(await ctx.ui.yesNo(`Trade ${quickenedName(ctx, picked)}?`))) return false;
  const received = host.createQuickened(ctx.data, offer.gives.species, offer.gives.level, ctx.rng);
  if (offer.gives.nickname !== undefined) received.nickname = offer.gives.nickname;
  received.metAt = { map: host.mapId(), level: received.level };
  if (!swapTrade(ctx.state, slot, offer.wants, received)) return false;
  await Promise.all([
    ctx.audio.playJingle("item_get"),
    ctx.ui.say(`${quickenedName(ctx, received)} joined you!`),
  ]);
  const to = crossPollinationTarget(ctx.data, received);
  if (to) await runGrowth(ctx, received, to, { canCancel: false });
  return true;
}
