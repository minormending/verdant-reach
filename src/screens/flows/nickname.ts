// "Give a nickname to X?" after a catch, using the shared name-entry screen.

import type { GameContext, Quickened } from "../../contracts";
import { nameEntry } from "../../ui/nameEntry";
import { speciesName } from "../../battle/logic/lookup";
import { fmt } from "../kit/text";
import type { ScreenUi } from "../kit/widgets";

export const NICKNAME_MAX = 10;

/**
 * The nickname to store for a name the player entered: trimmed, at most
 * NICKNAME_MAX characters, and undefined when it is empty or just the
 * species name again (so the Quickened keeps following its species name).
 */
export function cleanNickname(entered: string, species: string): string | undefined {
  const t = Array.from(entered.trim()).slice(0, NICKNAME_MAX).join("");
  if (!t) return undefined;
  if (t.toUpperCase() === species.toUpperCase()) return undefined;
  return t;
}

/** Ask, then open the naming screen. Returns true if a nickname was set. */
export async function askNickname(ctx: GameContext, ui: ScreenUi, q: Quickened): Promise<boolean> {
  const sp = speciesName(ctx.data, q.species);
  const yes = await ui.yesNo(fmt(ctx, `Give a nickname to ${sp}?`));
  ui.tb.clear();
  if (!yes) return false;
  const entered = await nameEntry(ctx, { title: "NICKNAME?", max: NICKNAME_MAX, defaultName: sp, species: q.species });
  const nick = cleanNickname(entered, sp);
  q.nickname = nick;
  return !!nick;
}
