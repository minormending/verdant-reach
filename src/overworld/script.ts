// Script interpreter: runs world `ScriptCmd` lists. Everything that touches
// the overworld (movement, fades, warps, windows) goes through `ScriptHost`,
// so the interpreter itself runs on a fake host in tests.

import type {
  Ambient, BattleOutcome, BattleRequest, Dir, GameContext, GameData, ItemId, MapDef, MapId,
  MarkId, Quickened, ScriptCmd, ScriptId, SpeciesId, StillKey, TimeOfDay,
} from "../contracts";
import { checkCond } from "./map";
import { mapTime } from "../engine/time";
import {
  caughtAny, caughtCount, countedName, hasItem, partyHas, pickBush, pocketName, questDoneFlag, questStartedFlag,
} from "./progress";
import { nurseryCounter } from "./nurseryFlow";
import { tradeFlow } from "./tradeFlow";

export type ToastKind = "new_note" | "note_done";

export interface ScriptHost {
  ctx: GameContext;
  mapId(): MapId;
  map(): MapDef | undefined;
  createQuickened(data: GameData, species: SpeciesId, level: number, rng: () => number): Quickened;
  healParty(party: Quickened[], data: GameData): void;
  /** Battle with transition; resolves after the overworld is back. */
  battle(req: BattleRequest): Promise<BattleOutcome>;
  whiteout(): Promise<void>;
  warp(to: MapId, x: number, y: number, facing?: Dir): Promise<void>;
  movePlayer(path: Dir[]): Promise<void>;
  moveNpc(id: string, path: Dir[]): Promise<void>;
  face(who: string, dir: Dir | "toPlayer"): void;
  setNpcVisible(id: string, visible: boolean): void;
  fade(to: "black" | "white" | "clear"): Promise<void>;
  shake(frames: number): Promise<void>;
  emote(who: string, emote: "!" | "?" | "..." | "♪"): Promise<void>;
  wait(frames: number): Promise<void>;
  showSpecies(id: SpeciesId): void;
  hideSpecies(): void;
  restoreMusic(): void;
  nameEntry(opts: { kind: "player" | "rival" | "nickname"; species?: SpeciesId; defaultName: string; max: number }): Promise<string>;
  /** Save offer, "TO BE CONTINUED", then back to the title. Never resolves normally in game. */
  endSlice(): Promise<void>;
  /** Scroll the cast, or skip with B, then return to the running script. */
  credits(): Promise<void>;
  /** Optional: battle backdrop for scripted battles. */
  backdrop?(): BattleRequest["backdrop"];
  /** Cutscene camera: eased pan to centre a tile; holds there until `cameraReset`. */
  camera?(x: number, y: number, frames?: number): Promise<void>;
  /** Eased pan back to the player, then follow again. */
  cameraReset?(frames?: number): Promise<void>;
  /** Override the map's ambient particles (until the next map load). */
  ambient?(kind: Ambient): void;
  /** Full-screen flash; resolves when it has faded. */
  flash?(color: "white" | "gold"): Promise<void>;
  /** Fade to a centred, native-size story illustration (text boxes draw over it). */
  still?(image: StillKey): Promise<void>;
  /** Fade back from the illustration to the map. */
  stillClear?(): Promise<void>;
  /** Leaf burst + bush shake as a harvest bush is picked (resolves after a short beat). */
  harvestFx?(harvestId: string): Promise<void>;
  /** A small notice that slides in at the top ("NEW NOTE", "NOTE COMPLETE"). Non-blocking. */
  toast?(kind: ToastKind, title: string): void;
  /** Current date (tests inject one; defaults to the real clock). */
  now?(): Date;
}

/** Thrown to stop the running script (whiteout, end of slice). */
export class ScriptAbort extends Error {
  constructor(reason: string) { super(reason); }
}
class ScriptEnd extends Error {}

export interface ScriptState {
  lastBattle?: BattleOutcome;
  depth: number;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function speciesName(ctx: GameContext, id: SpeciesId): string {
  return (ctx.data.species?.[id]?.name ?? id.replace(/_/g, " ")).toUpperCase();
}

export function quickenedName(ctx: GameContext, q: Quickened): string {
  if (q.seed) return "SEED";
  return q.nickname || speciesName(ctx, q.species);
}

export function itemName(ctx: GameContext, id: ItemId): string {
  return (ctx.data.items?.[id]?.name ?? id.replace(/_/g, " ")).toUpperCase();
}

export function markName(mark: MarkId): string {
  return mark.replace(/_/g, " ").toUpperCase();
}

const POCKET: Record<string, string> = { items: "ITEMS POCKET", pods: "POD POCKET", key: "KEY POCKET" };

export function timeMatches(times: TimeOfDay[], now: TimeOfDay): boolean {
  return times.includes(now);
}

// ---------------------------------------------------------------------------
// Shared actions (also used by the overworld outside scripts)
// ---------------------------------------------------------------------------

export async function giveItem(host: ScriptHost, item: ItemId, qty = 1, opts: { found?: boolean } = {}) {
  const { ctx } = host;
  const bag = ctx.state.bag;
  bag[item] = Math.min(999, (bag[item] ?? 0) + qty);
  const name = itemName(ctx, item);
  const jingle = ctx.audio.playJingle("item_get");
  const verb = opts.found ? "found" : "received";
  await Promise.all([ctx.ui.say(`{PLAYER} ${verb} ${countedName(name, qty)}!`), jingle]);
  await ctx.ui.say(`{PLAYER} put the ${pocketName(name, qty)} in the ${pocketOf(ctx, item)}.`);
}

function pocketOf(ctx: GameContext, item: ItemId): string {
  return POCKET[ctx.data.items?.[item]?.pocket ?? "items"] ?? "ITEMS POCKET";
}

export function questTitle(ctx: GameContext, id: string): string {
  return (ctx.world.quests?.[id]?.title ?? id.replace(/_/g, " ")).toUpperCase();
}

/** Pick a harvest bush: once per real-world day. */
export async function harvest(host: ScriptHost, id: string, item: ItemId, qty = 1) {
  const { ctx } = host;
  const now = host.now?.() ?? new Date();
  if (!pickBush(ctx.state, id, now)) {
    await ctx.ui.say("Only leaves and bare twigs now. New fruit should ripen by tomorrow.");
    return;
  }
  await host.harvestFx?.(id);
  const bag = ctx.state.bag;
  bag[item] = Math.min(999, (bag[item] ?? 0) + qty);
  const name = itemName(ctx, item);
  const jingle = ctx.audio.playJingle("item_get");
  await Promise.all([ctx.ui.say(`{PLAYER} picked ${countedName(name, qty)}!`), jingle]);
  await ctx.ui.say(`{PLAYER} put the ${pocketName(name, qty)} in the ${pocketOf(ctx, item)}.`);
}

export function startQuest(host: ScriptHost, id: string) {
  const flags = host.ctx.state.flags;
  if (flags[questStartedFlag(id)] || flags[questDoneFlag(id)]) return;
  flags[questStartedFlag(id)] = true;
  host.ctx.audio.playSfx("menu_open");
  host.toast?.("new_note", questTitle(host.ctx, id));
}

export async function completeQuest(host: ScriptHost, id: string) {
  const flags = host.ctx.state.flags;
  if (flags[questDoneFlag(id)]) return;
  flags[questStartedFlag(id)] = true;
  flags[questDoneFlag(id)] = true;
  host.toast?.("note_done", questTitle(host.ctx, id));
  await host.ctx.audio.playJingle("quest");
}

export async function giveSpecies(host: ScriptHost, species: SpeciesId, level: number, moves?: string[]) {
  const { ctx } = host;
  const st = ctx.state;
  const q = host.createQuickened(ctx.data, species, level, ctx.rng);
  if (moves && moves.length) {
    q.moves = moves.slice(0, 4).map((id) => ({ id, pp: ctx.data.moves?.[id]?.pp ?? 10 }));
  }
  q.metAt = { map: host.mapId(), level };
  if (!st.herbarium.seen.includes(species)) st.herbarium.seen.push(species);
  if (!st.herbarium.caught.includes(species)) st.herbarium.caught.push(species);
  const name = speciesName(ctx, species);
  const jingle = ctx.audio.playJingle("caught");
  await Promise.all([ctx.ui.say(`{PLAYER} received ${name}!`), jingle]);
  if (await ctx.ui.yesNo(`Give a nickname to ${name}?`)) {
    const nick = await host.nameEntry({ kind: "nickname", species, defaultName: name, max: 10 });
    if (nick && nick.toUpperCase() !== name) q.nickname = nick;
  }
  if (st.party.length < 6) {
    st.party.push(q);
  } else {
    st.box.push(q);
    await ctx.ui.say(`${quickenedName(ctx, q)} was sent to the SPECIMEN CABINET.`);
  }
  return q;
}

export async function giveMark(host: ScriptHost, mark: MarkId) {
  const { ctx } = host;
  if (ctx.state.marks.includes(mark)) return;
  ctx.state.marks.push(mark);
  const jingle = ctx.audio.playJingle("mark");
  await Promise.all([ctx.ui.say(`{PLAYER} received the ${markName(mark)}!`), jingle]);
}

export async function heal(host: ScriptHost) {
  const { ctx } = host;
  host.healParty(ctx.state.party, ctx.data);
  const hp = host.map()?.healPoint;
  if (hp) ctx.state.heal = { map: host.mapId(), x: hp.x, y: hp.y };
  await ctx.audio.playJingle("heal");
}

/** True if any world script awards this mark itself (then the engine doesn't). */
export function scriptsAwardMark(scripts: Record<string, ScriptCmd[]>, mark: MarkId): boolean {
  const scan = (cmds: ScriptCmd[] | undefined): boolean =>
    !!cmds?.some((c) => {
      if (c.op === "giveMark") return c.mark === mark;
      return childLists(c).some(scan);
    });
  return Object.values(scripts).some(scan);
}

/** Trainer battle with flag + mark bookkeeping. Whiteout handled by caller. */
export async function trainerBattle(host: ScriptHost, trainer: string, canLose = false): Promise<BattleOutcome> {
  const { ctx } = host;
  const result = await host.battle({ kind: "trainer", trainer, canLose, backdrop: host.backdrop?.() });
  if (result === "won") {
    ctx.state.flags[`beat_${trainer}`] = true;
    const mark = ctx.world.trainers[trainer]?.mark;
    if (mark && !ctx.state.marks.includes(mark) && !scriptsAwardMark(ctx.world.scripts, mark)) {
      await giveMark(host, mark);
    }
  }
  return result;
}

/** Nested command lists of a branching op (for static scans of scripts). */
export function childLists(c: ScriptCmd): (ScriptCmd[] | undefined)[] {
  if (c.op === "choice") return c.branches;
  if (c.op === "yesno") return [c.yes, c.no];
  if (c.op === "trade") return [c.then, c.else];
  if ("then" in c) return [c.then, c.else];
  return [];
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

/** Built-in recovery script, callable using the existing call command. */
export const WHITEOUT_SCRIPT = "whiteout";

/** Run a script by id or command list. Resolves when it finishes or ends. */
export async function runScript(
  host: ScriptHost, script: ScriptId | ScriptCmd[], state: ScriptState = { depth: 0 },
): Promise<void> {
  if (script === WHITEOUT_SCRIPT) {
    await host.whiteout();
    throw new ScriptAbort("whiteout");
  }
  try {
    await exec(host, resolve(host, script), state);
  } catch (e) {
    if (e instanceof ScriptEnd) return;
    throw e;
  }
}

function resolve(host: ScriptHost, script: ScriptId | ScriptCmd[]): ScriptCmd[] {
  if (Array.isArray(script)) return script;
  const cmds = host.ctx.world.scripts?.[script];
  if (!cmds) {
    console.warn(`[script] unknown script "${script}"`);
    return [];
  }
  return cmds;
}

async function exec(host: ScriptHost, cmds: ScriptCmd[] | undefined, st: ScriptState): Promise<void> {
  if (!cmds) return;
  for (const cmd of cmds) await step(host, cmd, st);
}

async function step(host: ScriptHost, cmd: ScriptCmd, st: ScriptState): Promise<void> {
  const { ctx } = host;
  const flags = ctx.state.flags;
  switch (cmd.op) {
    case "say":
      return ctx.ui.say(cmd.text, cmd.speaker ? { speaker: cmd.speaker } : undefined);
    case "choice": {
      const i = await ctx.ui.choose(cmd.options, { prompt: cmd.prompt, cancel: false });
      return exec(host, cmd.branches[i < 0 ? cmd.options.length - 1 : i], st);
    }
    case "yesno":
      return exec(host, (await ctx.ui.yesNo(cmd.prompt)) ? cmd.yes : cmd.no, st);
    case "if":
      return exec(host, checkCond(cmd.when, flags) ? cmd.then : cmd.else, st);
    case "ifTime":
      return exec(host, timeMatches(cmd.time, mapTime(host.map(), ctx.timeOfDay)) ? cmd.then : cmd.else, st);
    case "setFlag":
      flags[cmd.flag] = cmd.value ?? true;
      return;
    case "giveItem":
      return giveItem(host, cmd.item, cmd.qty ?? 1);
    case "takeItem": {
      const left = (ctx.state.bag[cmd.item] ?? 0) - (cmd.qty ?? 1);
      if (left > 0) ctx.state.bag[cmd.item] = left;
      else delete ctx.state.bag[cmd.item];
      return;
    }
    case "giveMoney":
      ctx.state.money = Math.max(0, Math.min(999999, ctx.state.money + cmd.amount));
      return;
    case "giveSpecies":
      await giveSpecies(host, cmd.species, cmd.level, cmd.moves);
      return;
    case "showSpecies": {
      host.showSpecies(cmd.species);
      if (!ctx.state.herbarium.seen.includes(cmd.species)) ctx.state.herbarium.seen.push(cmd.species);
      await ctx.audio.playCry(cmd.species);
      return;
    }
    case "hideSpecies":
      host.hideSpecies();
      return;
    case "giveMark":
      return giveMark(host, cmd.mark);
    case "battle": {
      const r = await trainerBattle(host, cmd.trainer, cmd.canLose);
      st.lastBattle = r;
      if (r === "lost" && !cmd.canLose) {
        await host.whiteout();
        throw new ScriptAbort("whiteout");
      }
      return;
    }
    case "wildBattle": {
      const r = await host.battle({
        kind: "wild", wild: { species: cmd.species, level: cmd.level, sport: cmd.sport }, canLose: cmd.canLose, backdrop: host.backdrop?.(),
      });
      st.lastBattle = r;
      if (r === "lost" && !cmd.canLose) {
        await host.whiteout();
        throw new ScriptAbort("whiteout");
      }
      return;
    }
    case "ifLastBattle":
      return exec(host, st.lastBattle === cmd.result ? cmd.then : cmd.else, st);
    case "heal":
      return heal(host);
    case "warp":
      return host.warp(cmd.to, cmd.x, cmd.y, cmd.facing);
    case "movePlayer":
      return host.movePlayer(cmd.path);
    case "moveNpc":
      return host.moveNpc(cmd.npc, cmd.path);
    case "face":
      host.face(cmd.who, cmd.dir);
      return;
    case "showNpc":
      host.setNpcVisible(cmd.npc, true);
      return;
    case "hideNpc":
      host.setNpcVisible(cmd.npc, false);
      return;
    case "music":
      ctx.audio.playMusic(cmd.id);
      return;
    case "restoreMusic":
      host.restoreMusic();
      return;
    case "sfx":
      ctx.audio.playSfx(cmd.id);
      return;
    case "jingle":
      return ctx.audio.playJingle(cmd.id);
    case "wait":
      return host.wait(cmd.frames);
    case "fade":
      return host.fade(cmd.to);
    case "shake":
      return host.shake(cmd.frames);
    case "emote":
      return host.emote(cmd.who, cmd.emote);
    case "shop":
      return ctx.screens.shop(cmd.stock);
    case "openCabinet":
      return ctx.screens.cabinet();
    case "nameRival": {
      const name = await host.nameEntry({ kind: "rival", defaultName: "BRAM", max: 7 });
      ctx.state.rivalName = name || "BRAM";
      return;
    }
    case "call": {
      if (cmd.script === WHITEOUT_SCRIPT) {
        await host.whiteout();
        throw new ScriptAbort("whiteout");
      }
      if (st.depth > 16) throw new Error(`[script] call depth exceeded at "${cmd.script}"`);
      st.depth++;
      try {
        await exec(host, resolve(host, cmd.script), st);
      } finally {
        st.depth--;
      }
      return;
    }
    case "camera":
      return host.camera?.(cmd.x, cmd.y, cmd.frames);
    case "cameraReset":
      return host.cameraReset?.(cmd.frames);
    case "ambient":
      host.ambient?.(cmd.kind);
      return;
    case "flash":
      return host.flash?.(cmd.color);
    case "still":
      return host.still?.(cmd.image);
    case "stillClear":
      return host.stillClear?.();
    case "ifHasItem":
      return exec(host, hasItem(ctx.state, cmd.item, cmd.qty ?? 1) ? cmd.then : cmd.else, st);
    case "ifMarks":
      return exec(host, cmd.marks.every((mark) => ctx.state.marks.includes(mark)) ? cmd.then : cmd.else, st);
    case "ifPartyHas":
      return exec(host, partyHas(ctx.state, cmd.species) ? cmd.then : cmd.else, st);
    case "ifCaught":
      return exec(host, caughtAny(ctx.state, cmd.species) ? cmd.then : cmd.else, st);
    case "ifCaughtCount":
      return exec(host, caughtCount(ctx.state) >= cmd.atLeast ? cmd.then : cmd.else, st);
    case "harvest":
      return harvest(host, cmd.id, cmd.item, cmd.qty ?? 1);
    case "startQuest":
      startQuest(host, cmd.quest);
      return;
    case "completeQuest":
      return completeQuest(host, cmd.quest);
    case "nursery":
      return nurseryCounter(host);
    case "trade":
      return exec(host, (await tradeFlow(host, cmd)) ? cmd.then : cmd.else, st);
    case "ifNurserySeed":
      return exec(host, ctx.state.nursery?.seedReady ? cmd.then : cmd.else, st);
    case "credits":
      return host.credits();
    case "hallOfFame": {
      const team = ctx.state.party.map(({ species, level, nickname }) => ({
        species, level, ...(nickname !== undefined ? { nickname } : {}),
      }));
      (ctx.state.hallOfFame ??= []).push(team);
      return;
    }
    case "endSlice":
      await host.endSlice();
      throw new ScriptAbort("endSlice");
    case "end":
      throw new ScriptEnd();
    default: {
      const unknown = cmd as { op?: string };
      console.warn(`[script] unknown op "${unknown.op}"`);
    }
  }
}
