// The Nursery Garden keeper's counter (`{ op: "nursery" }`): hand over a ready
// seed, then BOARD / CHECK / TAKE BACK until the player cancels. All the menu
// text is written here (map scripts add the keepers' own lines around it).
// Runs on a ScriptHost, so it is tested with the fake host.

import type { Quickened } from "../contracts";
import {
  board, boardBlock, collectSeed, compatibility, levelsGained, NURSERY_SLOTS, nurseryOf, takeBack, takeBackFee,
  type Boarder,
} from "./nursery";
import { quickenedName, type ScriptHost } from "./script";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export async function nurseryCounter(host: ScriptHost): Promise<void> {
  const { ctx } = host;
  const n = nurseryOf(ctx.state);
  if (n.seedReady && !(await offerSeed(host))) return;
  for (;;) {
    const actions: { label: string; run: () => Promise<void> }[] = [];
    if (n.slots.length < NURSERY_SLOTS) actions.push({ label: "BOARD", run: () => boardOne(host) });
    if (n.slots.length > 0) {
      actions.push({ label: "CHECK", run: () => checkBoarders(host) });
      actions.push({ label: "TAKE BACK", run: () => takeBackOne(host) });
    }
    const i = await ctx.ui.choose([...actions.map((a) => a.label), "CANCEL"], { prompt: "How can we help?" });
    if (i < 0 || i >= actions.length) return;
    await actions[i].run();
  }
}

/** Returns false if the player should leave the counter (no room for the seed). */
async function offerSeed(host: ScriptHost): Promise<boolean> {
  const { ctx } = host;
  const st = ctx.state;
  await ctx.ui.say("Good news! Your plants have set a SEED.");
  if (st.party.length >= 6) {
    await ctx.ui.say("Your party's full, though. Make room and come back for it.");
    return false;
  }
  if (!(await ctx.ui.yesNo("Would you like to take the SEED?"))) {
    await ctx.ui.say("Then we'll keep it warm for you.");
    return true;
  }
  const q = collectSeed(st, ctx.data, ctx.rng);
  if (!q) return true;
  const jingle = ctx.audio.playJingle("item_get");
  await Promise.all([ctx.ui.say("{PLAYER} received a SEED!"), jingle]);
  await ctx.ui.say("Keep it with you. It'll sprout as you walk.");
  return true;
}

async function boardOne(host: ScriptHost) {
  const { ctx } = host;
  const st = ctx.state;
  const idx = await ctx.screens.party({ mode: "pick", prompt: "Board which one?" });
  if (idx < 0) return;
  const block = boardBlock(st, idx);
  if (block === "seed") { await ctx.ui.say("A SEED can't board. Keep it close and warm!"); return; }
  if (block === "last") { await ctx.ui.say("You'd have no healthy QUICKENED left with you!"); return; }
  if (block === "full") { await ctx.ui.say("Our beds are full. Two boarders at a time!"); return; }
  const q = board(st, idx);
  const name = quickenedName(ctx, q);
  void ctx.audio.playCry(q.species);
  await ctx.ui.say(`We'll look after ${name}. Come back for it later!`);
  const slots = nurseryOf(st).slots;
  if (slots.length === 1) await ctx.ui.say("Board two that get along, and they may set a SEED.");
  else await ctx.ui.say(`Taking one back costs $100, plus $100 a level.`);
}

async function checkBoarders(host: ScriptHost) {
  const { ctx } = host;
  const slots = nurseryOf(ctx.state).slots as Boarder[];
  for (const b of slots) {
    const g = levelsGained(b);
    const name = quickenedName(ctx, b);
    await ctx.ui.say(g > 0 ? `${name} has grown by ${plural(g, "level")}!` : `${name} is settling in well.`);
  }
  if (slots.length < 2) return;
  const c = compatibility(ctx.data, slots[0], slots[1]);
  await ctx.ui.say(
    c >= 0.5 ? "The two of them are getting on famously!"
      : c > 0 ? "The two of them seem to get along."
        : "They don't share any pollinators. No SEED, I'm afraid.",
  );
}

async function takeBackOne(host: ScriptHost) {
  const { ctx } = host;
  const st = ctx.state;
  const slots = nurseryOf(st).slots as Boarder[];
  if (st.party.length >= 6) { await ctx.ui.say("Your party's full. Make some room first."); return; }
  let slot = 0;
  if (slots.length > 1) {
    slot = await ctx.ui.choose([...slots.map((q) => quickenedName(ctx, q)), "CANCEL"], { prompt: "Which one?" });
    if (slot < 0 || slot >= slots.length) return;
  }
  const b: Quickened & Boarder = slots[slot];
  const name = quickenedName(ctx, b);
  const fee = takeBackFee(b);
  if (!(await ctx.ui.yesNo(`That's $${fee} for ${name}. All right?`))) return;
  if (st.money < fee) { await ctx.ui.say("Oh dear, you're a little short."); return; }
  st.money -= fee;
  takeBack(st, slot);
  ctx.audio.playSfx("save");
  void ctx.audio.playCry(b.species);
  await ctx.ui.say(`{PLAYER} took back ${name}.`);
}
