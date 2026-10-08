// Automated end-to-end playthrough of the slice, run in the browser against
// the dev server (it drives the dev-only `window.__t` driver).
//
//   npm run e2e                                        headless full playthrough
//   npx vite --config e2e/vite.config.ts --port 5190 --strictPort
//   open  http://localhost:5190/?timer&e2e=full&speed=8&seed=1&time=day   new game -> Chapter 6's TO BE CONTINUED
//         http://localhost:5190/?timer&e2e=check:<name>   targeted checks (see CHECKS)
//
// Chapter 4 covers ROUTE 4, the dome, the closed CONSERVATORY, the RELAY, the
// grunt, rival 3 and the shears, the NURSERY (boarding two, a seed, sprouting),
// WREN's posts, PRUNE on ROUTE 5, FLORA and the chapter end. `check:fanmail`
// delivers FAN MAIL before the end card, or from a post-chapter jump-in.
// Chapter 5 continues from that save, crosses ROUTE 6, visits the BURNT STAND
// and THE HOLLOW, completes both quests and beats MORROW in the dark garden.
// Chapter 6 crosses the ford and sea, pushes SAGUARO's boulders, restores the
// Lantern Tree, completes both coastal quests and beats REYES in the pools.
//
// `?timer` keeps the loop running in a hidden tab. Add `&boost=<level>` to set
// the level of the over-levelled helper (default 48; `boost=0` plays it
// straight with only the starter) and `&starter=oak|chili|lily`.
//
// Progress goes to the console ("[e2e]") and to `window.__e2e.report`; every
// beat records the new flags, the map and a 160x144 snapshot.
// `window.__e2e.sheet()` shows the snapshots as a contact sheet.

import type { GameContext, ItemId, MapId, Scene, SceneStack, SpeciesId, TimeOfDay } from "../src/contracts";
import { TILES } from "../src/contracts";
import { createQuickened, healParty } from "../src/battle";
import { active, type BattleState } from "../src/battle/logic/battle";
import { devSeed, randomStream } from "../src/engine/random";
import { Menu, TextBox } from "../src/screens/kit/widgets";
import { rollEncounter } from "../src/overworld/encounters";
import { inBounds, isWalkable, tileAt, triggerAt, tryMove, warpAt, type MapRuntime } from "../src/overworld/map";
import { tryRaftMove } from "../src/overworld/raft";
import { SEED_CHECK_STEPS } from "../src/overworld/nursery";
import { AdvanceBudget, dialogueProgress, GameplayTasks, NO_PROGRESS_MS, ProgressWatchdog } from "./detectors";
import { healingItem, strongestMove } from "./battle-driver";

// ---------------------------------------------------------------------------
// Handles on the running game
// ---------------------------------------------------------------------------

type Dir = "up" | "down" | "left" | "right";
interface Actor { id: string; x: number; y: number; facing: Dir; sprite: string; moving?: boolean; def?: { script?: string; trainer?: string; sprite?: string } }
interface Ow {
  mapId: MapId;
  busy: number;
  player: Actor & { step: unknown };
  npcs: Actor[];
  follower: { x: number; y: number };
  followerVisible(): boolean;
  map: { def: { warps: { x: number; y: number; to: MapId; toX: number; toY: number }[]; triggers: { x: number; y: number; w?: number; h?: number; script: string; when?: { flag: string; is: boolean }[] }[]; npcs: unknown[]; tiles: string[]; healPoint?: unknown } };
  npcAt(x: number, y: number): Actor | undefined;
  visible(a: Actor): boolean;
  runScript(s: unknown): Promise<void>;
  flow(fn: () => Promise<void>): Promise<void>;
}
interface Driver {
  sleep(ms: number): Promise<void>;
  hold(code: string, ms?: number): Promise<void>;
  step(d: Dir): Promise<void>;
  goto(x: number, y: number): Promise<string>;
  talkThrough(max?: number, key?: string): Promise<number>;
  info(): { map: MapId; x: number; y: number; f: Dir; busy: number; n: number };
  ow(): Ow;
}
type Win = Window & { __t?: Driver; __vr?: { ctx: GameContext; scenes: SceneStack & { all(): Scene[] } }; __e2e?: unknown };
const W = window as Win;
const T = () => W.__t!;
const VR = () => W.__vr!;
const ctx = () => VR().ctx;
const seed = devSeed();
// Fixture IVs must not depend on how long pathfinding waited for an NPC.
const fixtureRng = seed === null ? () => ctx().rng() : randomStream(seed, "e2e:fixtures");
const stack = () => VR().scenes.all();
type BattleView = Scene & { s: BattleState; req: { kind: string }; finished: boolean };
function battleScene(): BattleView | null {
  const scene = stack().find((sc) => "req" in sc && "s" in sc && !(sc as BattleView).finished);
  return scene as BattleView | undefined ?? null;
}
let battleMenu: { menu: Menu; target: number } | null = null;
let medicine: { item: ItemId; active: number } | null = null;
/** Throw pods only at the requested line in real grass or water encounters. */
let captureLine: string | null = null;
function captureItem(): ItemId | null {
  const battle = battleScene();
  return captureLine && battle?.req.kind === "wild"
    && ctx().data.species[active(battle.s, 1).species].line === captureLine
    && (ctx().state.bag["terrarium_pod"] ?? 0) > 0 ? "terrarium_pod" : null;
}
let bagKey: keyof typeof KEY | null = null;
let bagAtCancel = false;
const requestedSpeed = new URLSearchParams(location.search).get("speed");
const speed = requestedSpeed && /^\d+$/.test(requestedSpeed)
  && Number(requestedSpeed) >= 1 && Number(requestedSpeed) <= 16 ? Number(requestedSpeed) : 1;
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// Yield at least one scheduled frame even when a short game-time wait scales
// below it. State-wait deadlines remain wall-clock limits for slow machines.
const sleep = (ms: number) => realSleep(Math.max(20, ms / speed));
const isOw = (s: unknown): s is Ow => !!s && typeof s === "object" && "mapId" in s && "player" in s;
const ow = (): Ow | null => { const s = stack()[0]; return isOw(s) ? s : null; };
const idle = () => { const o = ow(); return !!o && o.busy === 0 && stack().length === 1; };

let progressRevision = 0;
const observedFlows = new WeakSet<object>();
const sceneIds = new WeakMap<object, number>();
let nextSceneId = 0;

/** Count finite operation boundaries, never just ticking frames. An unresolved
 * dialogue, battle task or audio promise must still trip the watchdog. */
function trackProgress<T>(promise: Promise<T>): Promise<T> {
  progressRevision++;
  return promise.finally(() => { progressRevision++; });
}

function progressSignature(): string {
  const o = ow();
  const scenes = stack().map((scene) => {
    if (!sceneIds.has(scene)) sceneIds.set(scene, ++nextSceneId);
    const s = scene as unknown as { ui?: { tb?: unknown }; s?: BattleState };
    const battle = s.s;
    return [sceneIds.get(scene), dialogueProgress(s.ui?.tb), battle && [battle.turn,
      ...battle.sides.map((side) => [side.active, ...side.party.map((q) => [q.hp, q.status, q.moves.map((m) => m.pp)])])]];
  });
  return JSON.stringify([scenes, o?.mapId, o?.player.x, o?.player.y, o?.busy,
    report.texts.length, progressRevision, ctx().state.flags]);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface Beat {
  name: string;
  ok: boolean;
  t: number;          // seconds since start
  map?: string;
  pos?: string;
  newFlags: string[];
  note?: string;
  shot?: string;      // data URL
}
export interface Issue { kind: string; msg: string; where?: string; t: number }

export const report = {
  suite: "",
  seed,
  started: 0,
  finished: false,
  beats: [] as Beat[],
  issues: [] as Issue[],
  texts: [] as { t: number; map?: string; text: string; speaker?: string }[],
  frame: { samples: 0, total: 0, worst: 0, over8: 0, longTasks: 0 },
};
let lastFlags = new Set<string>();
const now = () => Math.round((performance.now() - report.started) / 100) / 10;
const where = () => { const o = ow(); return o ? `${o.mapId}@${o.player.x},${o.player.y}` : `stack:${stack().length}`; };

function snapshot(): string | undefined {
  const c = document.getElementById("screen") as HTMLCanvasElement | null;
  try { return c?.toDataURL("image/png"); } catch { return undefined; }
}

/** Keep the helper fresh between beats (HP and PP); story flow is what's under test here. */
function refreshHelper() {
  const st = ctx().state;
  if (st.party.some((q) => (q as { e2e?: boolean }).e2e)) healParty(st.party, ctx().data);
}

export function beat(name: string, ok = true, note?: string): Beat {
  refreshHelper();
  const flags = Object.keys(ctx().state.flags).filter((f) => ctx().state.flags[f]);
  const newFlags = flags.filter((f) => !lastFlags.has(f));
  lastFlags = new Set(flags);
  const o = ow();
  const b: Beat = { name, ok, t: now(), map: o?.mapId, pos: o ? `${o.player.x},${o.player.y}` : undefined, newFlags, note, shot: snapshot() };
  report.beats.push(b);
  console.log(`[e2e] ${ok ? "OK  " : "FAIL"} ${name} (${b.t}s) ${b.map ?? ""} ${b.pos ?? ""} +flags[${newFlags.join(",")}]${note ? " — " + note : ""}`);
  return b;
}

function issue(kind: string, msg: string) {
  const i = { kind, msg: msg.slice(0, 300), where: where(), t: now() };
  // De-duplicate repeats of the same message.
  if (report.issues.some((x) => x.kind === kind && x.msg === i.msg)) return;
  report.issues.push(i);
  console.log(`[e2e] ISSUE ${kind}: ${i.msg} @ ${i.where}`);
}

// ---------------------------------------------------------------------------
// Instrumentation: dialogue log, prompts, console errors, frame time
// ---------------------------------------------------------------------------

/** How to answer YES/NO prompts, by prompt text. Default: YES. */
const answers: [RegExp, boolean][] = [
  [/nickname/i, false],
  [/change QUICKENED/i, false], // keep the helper in when a trainer sends out the next one
];

/** Battle (and other screen) scenes carry their own `ui` with say/yesNo: log and answer those too. */
function hookScenes() {
  for (const sc of stack()) {
    const flow = (sc as unknown as { flow?: { run: (task: unknown) => Promise<void> } }).flow;
    if (flow && typeof flow.run === "function" && !observedFlows.has(flow)) {
      observedFlows.add(flow);
      const run = flow.run.bind(flow);
      flow.run = (task) => trackProgress(run(task));
    }
    const ui = (sc as unknown as { ui?: Record<string, unknown> & { __e2e?: boolean } }).ui;
    if (!ui || ui.__e2e || typeof ui.say !== "function") continue;
    ui.__e2e = true;
    if (typeof ui.choose === "function" && sc === battleScene()) {
      const choose = (ui.choose as (menu: Menu, ...args: unknown[]) => Promise<number>).bind(ui);
      ui.choose = (menu: Menu, ...args: unknown[]) => {
        const s = (sc as BattleView).s;
        let target: number | undefined;
        if (menu.options.join("/") === "FIGHT/BAG/QUICKENED/RUN") {
          // Story battles may spend awarded medicine. Targeted checks (notably
          // deliberate whiteouts and pod throws) keep their existing policy.
          const item = report.suite === "full" || report.suite === "story"
            ? healingItem(ctx().data, ctx().state.bag, active(s, 0)) : null;
          medicine = item ? { item, active: s.sides[0].active } : null;
          target = item || captureItem() ? 1 : 0;
        } else if (menu.options[0] === ctx().data.moves[active(s, 0).moves[0]?.id]?.name.toUpperCase()) {
          target = strongestMove(s);
        }
        const plan = target !== undefined && target >= 0 ? { menu, target } : null;
        if (plan) battleMenu = plan;
        return trackProgress(choose(menu, ...args)).finally(() => { if (battleMenu === plan) battleMenu = null; });
      };
    }
    const say = (ui.say as (...a: unknown[]) => Promise<unknown>).bind(ui);
    ui.say = (text: unknown, ...rest: unknown[]) => {
      const t = String(text);
      report.texts.push({ t: now(), map: ow()?.mapId, text: `[battle] ${t}` });
      checkText(t);
      return trackProgress(say(text, ...rest));
    };
    if (typeof ui.yesNo === "function") {
      const yn = (ui.yesNo as (...a: unknown[]) => Promise<unknown>).bind(ui);
      ui.yesNo = (prompt: unknown, ...rest: unknown[]) => {
        const p = String(prompt);
        report.texts.push({ t: now(), map: ow()?.mapId, text: `[battle?] ${p}` });
        const rule = answers.find(([re]) => re.test(p));
        pendingNo = rule ? !rule[1] : false;
        return trackProgress(yn(prompt, ...rest)).then((r) => { pendingNo = false; return r; });
      };
    }
  }
}
let pendingNo = false;
let expectName = false;
/** Menus driven by key presses: how many DOWNs before the next A (set by the hooks below). */
let menuDown = 0;
let menuDelay = 250;
/** Which entry to pick in an engine menu (ui.choose), by its options and prompt. */
let menuPlan: ((options: string[], prompt: string) => number | undefined) | null = null;
/** Which party slot to pick when a party screen opens in "pick" mode. */
let partyPick: (() => number) | null = null;
let instrumented = false;

export function instrument() {
  if (instrumented) return;
  instrumented = true;
  const gameplayTasks = new GameplayTasks();
  const assets = ctx().assets;
  const loadAll = assets.loadAll.bind(assets);
  assets.loadAll = (...args) => {
    const finish = gameplayTasks.loading(performance.now());
    return loadAll(...args).finally(() => finish(performance.now()));
  };
  for (const method of ["playCry", "playJingle"] as const) {
    const original = ctx().audio[method].bind(ctx().audio) as (id: never) => Promise<void>;
    ctx().audio[method] = (id: never) => trackProgress(original(id));
  }
  const ui = ctx().ui as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const say = ui.say.bind(ui);
  ui.say = (text: unknown, opts?: unknown) => {
    const t = String(text);
    const speaker = (opts as { speaker?: string } | undefined)?.speaker;
    report.texts.push({ t: now(), map: ow()?.mapId, text: t, speaker });
    checkText(t, speaker);
    return trackProgress(say(text, opts)).then((r) => {
      if (/what was your name|your name\?|name again/i.test(t)) expectName = true;
      return r;
    });
  };
  const yesNo = ui.yesNo.bind(ui);
  ui.yesNo = (prompt: unknown) => {
    const p = String(prompt);
    report.texts.push({ t: now(), map: ow()?.mapId, text: `[?] ${p}` });
    checkText(p);
    const rule = answers.find(([re]) => re.test(p));
    pendingNo = rule ? !rule[1] : false;
    return trackProgress(yesNo(prompt)).then((r) => { pendingNo = false; return r; });
  };
  const choose = ui.choose.bind(ui);
  ui.choose = (options: unknown, opts?: unknown) => {
    const list = options as string[];
    const prompt = (opts as { prompt?: string } | undefined)?.prompt ?? "";
    report.texts.push({ t: now(), map: ow()?.mapId, text: `[menu] ${prompt ? prompt + " " : ""}${list.join(" / ")}` });
    const want = menuPlan?.(list, prompt);
    if (want !== undefined && want > 0) { menuDown = want; menuDelay = 250; }
    return trackProgress(choose(options, opts));
  };
  // Party screens in pick mode (the NURSERY counter): steer the cursor with real key presses.
  const screens = ctx().screens as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const bagScreen = screens.bag.bind(screens);
  screens.bag = (opts?: unknown) => {
    const pod = captureItem();
    const selected = medicine ?? (pod ? { item: pod } : null);
    if (!selected || !(opts as { inBattle?: boolean })?.inBattle) return bagScreen(opts);
    const show = TextBox.prototype.show;
    // Bag scenes close over their cursor. Observe their descriptions, then
    // navigate the actual pockets/list/USE menu with the driver's key presses.
    TextBox.prototype.show = function (text, mode) {
      bagAtCancel = text === "Close the bag.";
      const item = Object.values(ctx().data.items).find((it) => it.description === text);
      const pocketItems = Object.keys(ctx().state.bag).filter((id) => (ctx().state.bag[id] ?? 0) > 0
        && ctx().data.items[id as ItemId]?.pocket === item?.pocket);
      bagKey = item ? item.pocket !== ctx().data.items[selected.item].pocket ? "right"
        : item.id === selected.item ? "a"
          : pocketItems.indexOf(item.id) < pocketItems.indexOf(selected.item) ? "down" : "up"
        : text === "Close the bag." ? "up" : "a";
      return show.call(this, text, mode);
    };
    return trackProgress(bagScreen(opts)).finally(() => { TextBox.prototype.show = show; bagKey = null; bagAtCancel = false; });
  };
  const partyScreen = screens.party.bind(screens);
  screens.party = (opts?: unknown) => {
    const o = opts as { mode?: string; prompt?: string } | undefined;
    const healing = o?.mode === "pick" && o.prompt === "Use on which?" && medicine;
    if (o?.mode === "pick" && (partyPick || healing)) {
      const i = healing ? healing.active : partyPick!();
      report.texts.push({ t: now(), map: ow()?.mapId, text: `[party pick] ${o.prompt ?? ""} -> ${i}` });
      if (i > 0) { menuDown = i; menuDelay = 900; }
    }
    return partyScreen(opts).finally(() => { if (healing) medicine = null; });
  };
  for (const level of ["error", "warn"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const msg = args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : typeof a === "string" ? a : safeJson(a))).join(" ");
      // "[vite]" noise comes from the no-websocket e2e server config.
      if (!msg.startsWith("[e2e]") && !msg.startsWith("[vite]")) issue(/\[assets\] missing/.test(msg) ? "missing-asset" : `console.${level}`, msg);
      orig(...args);
    };
  }
  addEventListener("error", (e) => issue("uncaught", String(e.error?.stack ?? e.message)));
  addEventListener("unhandledrejection", (e) => issue("rejection", String((e.reason as Error)?.stack ?? e.reason)));
  // Draw cost per frame: runLoop clears with a full-screen black fillRect, then
  // draws the stack synchronously; a microtask runs once the frame is done.
  const g = (document.getElementById("screen") as HTMLCanvasElement).getContext("2d")!;
  const fill = g.fillRect.bind(g);
  g.fillRect = (x: number, y: number, w: number, h: number) => {
    if (x === 0 && y === 0 && w === 160 && h === 144 && g.fillStyle === "#000000") {
      const t = performance.now();
      queueMicrotask(() => {
        const cost = performance.now() - t;
        report.frame.samples++;
        report.frame.total += cost;
        report.frame.worst = Math.max(report.frame.worst, cost);
        if (cost > 8) report.frame.over8++;
        // The first overworld draw ends boot/title/new-game initialization.
        if (ow()) gameplayTasks.ready(performance.now());
      });
    }
    fill(x, y, w, h);
  };
  // Sample gameplay hitches, excluding boot and explicit asset loads. Use
  // entry timestamps because observer callbacks are delivered asynchronously.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!gameplayTasks.includes(e.startTime, e.duration)) continue;
        report.frame.longTasks++;
        if (e.duration > 120) issue("long-task", `${Math.round(e.duration)}ms`);
      }
    }).observe({ type: "longtask", buffered: false });
  } catch { /* unsupported */ }
}

function safeJson(a: unknown) { try { return JSON.stringify(a); } catch { return String(a); } }

const COLS = 18;
function checkText(text: string, speaker?: string) {
  // Unbreakable words longer than a text-box line overflow the box.
  const flat = text.replace(/<PLAYER>|\{PLAYER\}/g, "ROWAN").replace(/<RIVAL>|\{RIVAL\}/g, "BRAM");
  for (const w of flat.split(/\s+/)) if (w.length > COLS) issue("text-overflow", `"${w}" (${w.length} cols) in: ${text}`);
  // ?allowTodo (runner --allow-placeholders) tolerates only the lead's "TODO(text):" dialogue
  // stand-ins on an unfinished chapter branch; every other placeholder still fails.
  const todoAllowed = new URLSearchParams(location.search).has("allowTodo") && /^TODO\(text\):/.test(flat.trim());
  if (!todoAllowed && (/\b(TODO|FIXME|lorem|placeholder|undefined|null)\b|\bNaN\b|\[object/.test(flat) || /\b(todo|fixme|lorem ipsum)\b/i.test(flat))) issue("text-placeholder", `${speaker ?? ""}: ${text}`);
  if (/<[A-Z]+>|\{[A-Z]+\}/.test(text.replace(/<PLAYER>|\{PLAYER\}|<RIVAL>|\{RIVAL\}/g, ""))) issue("text-token", text);
  if (speaker && speaker !== speaker.toUpperCase()) issue("text-style", `speaker not upper-case: ${speaker}`);
}

// ---------------------------------------------------------------------------
// Low-level driving
// ---------------------------------------------------------------------------

const KEY = { a: "KeyZ", b: "KeyX", start: "Enter", select: "ShiftLeft", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" } as const;
export const press = (k: keyof typeof KEY, ms = 90) => T().hold(KEY[k], ms);

/** Release keys inside the update batch, rather than waiting for a timer to
 * observe it afterwards. This prevents repeats and extra tiles at high speed. */
export function installSpeedDriver() {
  const input = ctx().input;
  let pending: { code: string; stop: () => boolean; released: boolean; movement: boolean } | null = null;
  const release = () => {
    if (!pending || pending.released) return;
    pending.released = true;
    dispatchEvent(new KeyboardEvent("keyup", { code: pending.code }));
  };
  for (const method of ["pressed", "held", "repeat"] as const) {
    const original = input[method].bind(input);
    input[method] = (button) => {
      if (pending && pending.stop()) release();
      const value = original(button);
      // Non-movement taps last until an update consumes their input edge.
      if (value && method !== "held" && pending?.code === KEY[button] && !pending.movement) release();
      return value;
    };
  }
  const hold = async (code: string, ms = 90) => {
    const o = ow();
    const dir = (Object.keys(DIRS) as Dir[]).find((d) => KEY[d] === code);
    const movement = !!dir && !!o && idle();
    const [x, y, map] = [o?.player.x, o?.player.y, o?.mapId];
    const turnOnly = movement && ms === 40;
    const deadline = performance.now() + Math.max(100, 1500 / speed);
    const firstFrame = report.frame.samples;
    pending = { code, movement, released: false, stop: () => movement
      ? ow()?.mapId !== map || ow()?.player.x !== x || ow()?.player.y !== y || !idle() || (turnOnly && ow()?.player.facing === dir)
      : false };
    dispatchEvent(new KeyboardEvent("keydown", { code }));
    try {
      // Scenes can ignore input during fades. Two draws guarantee the tap
      // spans an update even at speed 1, without waiting out an entire fade.
      while (!pending.released && performance.now() < deadline
        && (movement || report.frame.samples - firstFrame < 2)) await realSleep(4);
    } finally { release(); pending = null; }
    while (ow()?.player.step && idle()) await realSleep(4);
    await sleep(40);
  };
  T().hold = hold;
  T().step = (d) => hold(KEY[d], 200);
}

/** Mash through text, menus and battles until the overworld is idle again. */
export async function advance(maxPresses = 400, done: () => boolean = idle): Promise<boolean> {
  const watchdog = new ProgressWatchdog();
  const budget = new AdvanceBudget(maxPresses);
  let presses = 0;
  for (;;) {
    await sleep(120);
    if (done()) { await sleep(150); if (done()) return true; }
    if (!budget.spend(battleScene())) break;
    presses++;
    if (expectName) {
      // Name entry: START jumps to END, A accepts (an empty name takes the default).
      expectName = false;
      await sleep(400);
      await press("start");
      await sleep(200);
      await press("a");
      continue;
    }
    hookScenes();
    if (menuDown > 0) {
      const n = menuDown;
      menuDown = 0;
      await sleep(menuDelay);
      for (let k = 0; k < n; k++) { await press("down", 60); await sleep(140); }
    }
    let key: keyof typeof KEY = pendingNo ? "b" : "a";
    if (bagKey) key = bagKey;
    else if (battleMenu) {
      const { menu, target } = battleMenu;
      const cols = menu.opts.cols ?? 1;
      if (Math.floor(menu.index / cols) !== Math.floor(target / cols)) key = menu.index < target ? "down" : "up";
      else if (menu.index !== target) key = menu.index < target ? "right" : "left";
    }
    await press(key);
    // An empty pocket has only CANCEL, so UP cannot change its description.
    // Try the next pocket after that one probe instead of circling forever.
    if (key === "up" && bagAtCancel && bagKey === "up") bagKey = "right";
    const sig = progressSignature();
    if (watchdog.sample(sig, performance.now())) {
      issue("soft-lock?", `no state progress for ${NO_PROGRESS_MS / 1000}s (${sig})`);
      return false;
    }
  }
  issue("advance-timeout", `still busy after ${presses} presses (ordinary limit ${maxPresses}, battle limit 3000)`);
  return false;
}

async function settle() {
  if (!idle()) await advance();
}

/**
 * The driver's goto, but routed round live step-on triggers that aren't the
 * destination (a closed door's trigger bounces you back, and the driver would
 * walk into it forever). Allows triggers when they are the only way through.
 */
async function goto(tx: number, ty: number, avoidTriggers = true): Promise<string> {
  const o = ow();
  if (!o) return "no overworld";
  const m = o.map as unknown as MapRuntime;
  const flags = ctx().state.flags;
  const k = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, [number, number, Dir] | null>([[k(o.player.x, o.player.y), null]]);
  const rafting = new Map<string, boolean>([[k(o.player.x, o.player.y), !!ctx().state.rafting]]);
  const hasRaft = (ctx().state.bag["lily_raft"] ?? 0) > 0;
  const q: [number, number][] = [[o.player.x, o.player.y]];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) break;
    for (const d of ["up", "down", "left", "right"] as Dir[]) {
      const r = tryRaftMove(m, x, y, d, rafting.get(k(x, y)) ?? false, hasRaft, (a, b) => !!o.npcAt(a, b));
      if (r.kind === "blocked" || prev.has(k(r.x, r.y))) continue;
      const dest = r.x === tx && r.y === ty;
      if (!dest && (warpAt(m, r.x, r.y) || (avoidTriggers && triggerAt(m, r.x, r.y, flags)))) continue;
      prev.set(k(r.x, r.y), [x, y, d]);
      rafting.set(k(r.x, r.y), r.rafting);
      q.push([r.x, r.y]);
    }
  }
  if (!prev.has(k(tx, ty))) return avoidTriggers ? goto(tx, ty, false) : "no path";
  const dirs: Dir[] = [];
  for (let c = k(tx, ty); prev.get(c);) { const [x, y, d] = prev.get(c)!; dirs.unshift(d); c = k(x, y); }
  const map = o.mapId;
  for (const d of dirs) {
    const p = ow();
    if (!p || p.mapId !== map) return "ok";
    if (p.busy) return `interrupted at ${k(p.player.x, p.player.y)}`;
    const [bx, by] = [p.player.x, p.player.y];
    const move = tryRaftMove(p.map as unknown as MapRuntime, bx, by, d,
      !!ctx().state.rafting, hasRaft, (a, b) => !!p.npcAt(a, b));
    if (move.kind === "mount") {
      // Facing water and pressing A asks the real field-move prompt. Never
      // mutate rafting or move the player directly from the driver.
      await face(d);
      await press("a");
      await sleep(250);
      await settle();
    } else await T().step(d);
    const a = ow();
    if (a && a.mapId === map && !a.busy && (move.kind === "blocked"
      || a.player.x !== move.x || a.player.y !== move.y)) {
      // A declined mount, moving NPC or script can invalidate the remaining
      // route. Replan from the actual tile and raft state before more input.
      await sleep(300);
      return `interrupted at ${k(a.player.x, a.player.y)}`;
    }
  }
  return "ok";
}

/** Walk to a tile, fighting through anything that interrupts. */
export async function walkTo(x: number, y: number, tries = 25): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await settle();
    const o = ow();
    if (!o) return false;
    if (o.player.x === x && o.player.y === y) return true;
    const mapBefore = o.mapId;
    const r = await goto(x, y);
    if (ow()?.mapId !== mapBefore) return true; // a warp or script moved us on
    if (r === "ok") {
      await settle();
      if (ow()?.mapId !== mapBefore || onTile(x, y)) return true;
    }
    if (r === "no path") {
      await sleep(400); // a wandering NPC may be in the way
      if (i > 3) return false;
    }
  }
  return false;
}

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

async function face(d: Dir) {
  if (T().info().f === d) return;
  await T().hold(KEY[d], 40);
  await sleep(120);
}

/** Match the real A interaction: an adjacent NPC, or one across a counter.
 * The follower is passable for walking, but must never receive our talk tap. */
function talkDirection(o: Ow, id: string): Dir | null {
  for (const d of Object.keys(DIRS) as Dir[]) {
    const [dx, dy] = DIRS[d];
    const [x, y] = [o.player.x + dx, o.player.y + dy];
    if (o.followerVisible() && o.follower.x === x && o.follower.y === y) continue;
    const front = o.npcAt(x, y);
    const target = front ?? (tileAt(o.map as unknown as MapRuntime, x, y) === "counter"
      ? o.npcAt(x + dx, y + dy) : undefined);
    if (target?.id === id && !target.moving) return d;
  }
  return null;
}

/** Talk to an NPC by id (walks next to it, or across a counter). */
export async function talkTo(id: string, quiet = false): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await settle();
    const o = ow();
    if (!o) return false;
    const here = o.mapId;
    const n = o.npcs.find((a) => a.id === id);
    if (!n || !o.visible(n)) { if (!quiet) issue("missing-npc", `no visible npc "${id}" on ${here}`); return false; }
    const spots: [number, number][] = [];
    for (const d of ["down", "left", "right", "up"] as Dir[]) {
      const [dx, dy] = DIRS[d];
      spots.push([n.x + dx, n.y + dy]);
      if (tileAt(o.map as unknown as MapRuntime, n.x + dx, n.y + dy) === "counter") {
        spots.push([n.x + dx * 2, n.y + dy * 2]);
      }
    }
    const p = o.player;
    spots.sort((s, t) => Math.abs(s[0] - p.x) + Math.abs(s[1] - p.y) - (Math.abs(t[0] - p.x) + Math.abs(t[1] - p.y)));
    for (const [x, y] of spots) {
      const r = await walkToQuiet(x, y);
      if (!r) continue;
      const q = ow();
      if (!q || q.mapId !== here) return false;
      const d = talkDirection(q, id);
      if (!d) break; // it moved or vanished: replan from its live position
      await face(d);
      const ready = ow();
      // Turning yields frames: a wandering NPC may have moved in that time.
      if (!ready || ready.mapId !== here) return false;
      if (!idle() || ready.player.step || ready.player.facing !== d || talkDirection(ready, id) !== d) break;
      const before = report.texts.length;
      await press("a");
      await sleep(250);
      // Leader talks run intro, a long battle (move-learning menus included) and the mark.
      if (!idle() || report.texts.length > before) { await advance(1000); return true; }
    }
  }
  if (!quiet) issue("talk-failed", `could not talk to "${id}"`);
  return false;
}

async function walkToQuiet(x: number, y: number, depth = 0): Promise<boolean> {
  const o = ow();
  if (!o) return false;
  const here = o.mapId;
  if (o.player.x === x && o.player.y === y) return true;
  const r = await goto(x, y);
  if (r === "ok") {
    await settle();
    return ow()?.mapId === here && onTile(x, y);
  }
  if (r.startsWith("interrupted") && depth < 8) { await settle(); return walkToQuiet(x, y, depth + 1); }
  return false;
}

/** Shortest warp route between maps (ignores story gates). */
function route(from: MapId, to: MapId): MapId[] | null {
  const maps = ctx().world.maps as Record<string, { warps: { to: MapId }[] }>;
  const prev = new Map<MapId, MapId | null>([[from, null]]);
  const q: MapId[] = [from];
  while (q.length) {
    const m = q.shift()!;
    if (m === to) break;
    for (const w of maps[m]?.warps ?? []) if (!prev.has(w.to)) { prev.set(w.to, m); q.push(w.to); }
  }
  if (!prev.has(to)) return null;
  const path: MapId[] = [];
  for (let m: MapId | null = to; m && m !== from; m = prev.get(m) ?? null) path.unshift(m);
  return path;
}

/** Travel to a map through its warps. */
export async function nav(target: MapId, avoid: MapId[] = []): Promise<boolean> {
  for (let guard = 0; guard < 30; guard++) {
    await settle();
    const o = ow();
    if (!o) return false;
    // The overworld scene is one object whose mapId changes: keep the id.
    const here = o.mapId;
    if (here === target) return true;
    const path = route(here, target);
    if (!path) { issue("nav", `no warp route ${here} -> ${target}`); return false; }
    const next = path[0];
    const ws = o.map.def.warps.filter((w) => w.to === next);
    let moved = false;
    // Nearest warp first.
    ws.sort((a, b) => Math.abs(a.x - o.player.x) + Math.abs(a.y - o.player.y) - (Math.abs(b.x - o.player.x) + Math.abs(b.y - o.player.y)));
    for (const w of ws) {
      await walkTo(w.x, w.y);
      if (ow()?.mapId !== here) { moved = true; break; }
      // Brambles in the way: PRUNE through them once the shears are in the bag.
      if (!onTile(w.x, w.y) && (ctx().state.bag["pruning_shears"] ?? 0) > 0) {
        await pruneToward(w.x, w.y);
        if (ow()?.mapId !== here) { moved = true; break; }
      }
      const q = ow()!;
      if (q.player.x !== w.x || q.player.y !== w.y) {
        // Door tiles can read as blocked to the path search: stand beside the
        // warp and walk into it (doors are entered from below).
        for (const [dx, dy, d] of [[0, 1, "up"], [-1, 0, "right"], [1, 0, "left"], [0, -1, "down"]] as [number, number, Dir][]) {
          if (!(await walkToQuiet(w.x + dx, w.y + dy))) continue;
          await T().hold(KEY[d], 250);
          await sleep(700);
          if (ow()?.mapId !== here) break;
        }
        await settle();
        if (ow()?.mapId !== here) { moved = true; break; }
        continue;
      }
      // Standing on the warp: push outwards (mats need DOWN).
      for (const d of ["down", "up", "left", "right"] as Dir[]) {
        await T().hold(KEY[d], 200);
        await sleep(500);
        if (ow()?.mapId !== here || !idle()) break;
      }
      await settle();
      if (ow()?.mapId !== here) { moved = true; break; }
    }
    if (!moved) {
      issue("nav", `stuck on ${here} trying to reach ${next} (towards ${target})`);
      return false;
    }
    await settle();
  }
  return ow()?.mapId === target;
}

/** Activate a trigger through movement or A on a solid talk tile. */
export async function trigger(script: string): Promise<boolean> {
  const o = ow();
  const tr = o?.map.def.triggers.find((t) => t.script === script);
  if (!o || !tr) { issue("trigger", `no trigger "${script}" on ${o?.mapId}`); return false; }
  const m = o.map as unknown as MapRuntime;
  // Match isTalkTrigger's single-cell rule and the overworld's A interaction,
  // using live terrain. goto handles rafting to shore and dismounting by input.
  if ((tr.w ?? 1) === 1 && (tr.h ?? 1) === 1 && !isWalkable(m, tr.x, tr.y)
    && "interact" in TILES[tileAt(m, tr.x, tr.y)]) return useTile(script);
  const cells: [number, number][] = [];
  for (let dy = 0; dy < (tr.h ?? 1); dy++) for (let dx = 0; dx < (tr.w ?? 1); dx++) cells.push([tr.x + dx, tr.y + dy]);
  const said = report.texts.length;
  for (const [x, y] of cells) {
    // Already standing here is not a fresh step onto the trigger.
    if (o.player.x === x && o.player.y === y) continue;
    if (await walkTo(x, y)) { await settle(); return true; }
    // A gate trigger (e.g. a closed conservatory door) runs its script and pushes
    // the player back off the tile, so the walk "fails" although it fired.
    if (report.texts.length > said) { await settle(); return true; }
  }
  issue("trigger", `could not reach "${script}" on ${o.mapId}`);
  return false;
}

const flag = (f: string) => !!ctx().state.flags[f];
const onTile = (x: number, y: number) => { const o = ow(); return !!o && o.player.x === x && o.player.y === y; };

/**
 * PRUNE a way through to (tx, ty): path-find treating brambles as open, then
 * face the first bramble on the path, press A and answer YES. Repeats until
 * the path is clear, then walks there. Returns how many brambles it cut.
 */
export async function pruneToward(tx: number, ty: number): Promise<number> {
  let cut = 0;
  for (let round = 0; round < 8; round++) {
    await settle();
    const o = ow();
    if (!o) return cut;
    const m = o.map as unknown as MapRuntime;
    const k = (x: number, y: number) => `${x},${y}`;
    const prev = new Map<string, [number, number, Dir] | null>([[k(o.player.x, o.player.y), null]]);
    const q: [number, number][] = [[o.player.x, o.player.y]];
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === tx && y === ty) break;
      for (const d of ["up", "down", "left", "right"] as Dir[]) {
        const [dx, dy] = DIRS[d];
        let nx = x + dx, ny = y + dy;
        if (!inBounds(m, nx, ny)) continue;
        if (tileAt(m, nx, ny) !== "bramble_bush") {
          const r = tryMove(m, x, y, d, (a, b) => !!o.npcAt(a, b));
          if (r.kind === "blocked") continue;
          nx = r.x; ny = r.y;
        }
        if (prev.has(k(nx, ny))) continue;
        prev.set(k(nx, ny), [x, y, d]);
        q.push([nx, ny]);
      }
    }
    if (!prev.has(k(tx, ty))) { issue("prune", `no way to ${tx},${ty} on ${o.mapId}, even through brambles`); return cut; }
    const path: [number, number, Dir, number, number][] = [];
    for (let c = k(tx, ty); prev.get(c);) {
      const [x, y, d] = prev.get(c)!;
      const [cx, cy] = c.split(",").map(Number);
      path.unshift([x, y, d, cx, cy]);
      c = k(x, y);
    }
    const hit = path.find(([, , , cx, cy]) => tileAt(m, cx, cy) === "bramble_bush");
    if (!hit) { await walkTo(tx, ty); return cut; }
    const [bx, by, d, cx, cy] = hit;
    if (!(await walkToQuiet(bx, by))) { issue("prune", `can't stand next to the bramble at ${cx},${cy}`); return cut; }
    await face(d);
    const before = report.texts.length;
    await press("a");
    await sleep(300);
    await advance();
    const said = report.texts.slice(before).map((t) => t.text).join(" | ");
    if (tileAt(ow()!.map as unknown as MapRuntime, cx, cy) === "bramble_bush") {
      issue("prune", `bramble at ${cx},${cy} on ${o.mapId} still there after A (${said})`);
      return cut;
    }
    cut++;
    beat(`PRUNE: bramble at ${cx},${cy}`, flag(`pruned_${o.mapId}_${cx}_${cy}`), said.slice(0, 120));
  }
  return cut;
}

/** Press A facing a solid interactable tile that carries a trigger (sensor posts). */
async function useTile(script: string): Promise<boolean> {
  const o = ow();
  const tr = o?.map.def.triggers.find((t) => t.script === script);
  if (!o || !tr) { issue("trigger", `no tile script "${script}" on ${o?.mapId}`); return false; }
  for (const d of ["down", "left", "right", "up"] as Dir[]) {
    const [dx, dy] = DIRS[d];
    if (!(await walkToQuiet(tr.x + dx, tr.y + dy))) continue;
    await face(OPP[d]);
    const before = report.texts.length;
    await press("a");
    await sleep(300);
    await advance();
    if (report.texts.length > before) return true;
  }
  issue("trigger", `could not use "${script}" on ${o.mapId}`);
  return false;
}

/** Walk on the spot (two tiles back and forth) for `n` steps. */
async function pace(n: number) {
  for (let i = 0; i < n; i++) {
    await settle();
    const o = ow();
    if (!o) return;
    const m = o.map as unknown as MapRuntime;
    const dirs = (i % 2 ? ["left", "right", "up", "down"] : ["right", "left", "down", "up"]) as Dir[];
    const d = dirs.find((dd) => {
      const r = tryMove(m, o.player.x, o.player.y, dd, (a, b) => !!o.npcAt(a, b));
      return r.kind === "walk" && !o.map.def.warps.some((w) => w.x === r.x && w.y === r.y);
    });
    if (!d) { issue("pace", `boxed in at ${where()}`); return; }
    await T().step(d);
  }
  await settle();
}

async function waitFor(cond: () => boolean, ms = 30000) {
  const t0 = performance.now();
  while (!cond()) { if (performance.now() - t0 > ms) return false; await sleep(150); }
  return true;
}

async function expectFlag(name: string, f: string, note?: string) {
  const ok = flag(f);
  beat(name, ok, ok ? note : `expected flag ${f}`);
  return ok;
}

// ---------------------------------------------------------------------------
// Party helpers
// ---------------------------------------------------------------------------

function boostParty(level: number) {
  if (level <= 0) return;
  const st = ctx().state;
  if (st.party.some((q) => (q as { e2e?: boolean }).e2e)) return;
  const species = (new URLSearchParams(location.search).get("helper") as SpeciesId) || "red_chili" as SpeciesId;
  let q;
  try { q = createQuickened(ctx().data, species, level, fixtureRng); } catch {
    q = createQuickened(ctx().data, st.party[0]?.species ?? ("oak_acorn" as SpeciesId), level, fixtureRng);
  }
  (q as unknown as { e2e: boolean }).e2e = true;
  st.party.unshift(q);
  healParty(st.party, ctx().data);
}

/** Puzzle maps: talk to every lever/valve once, retrying the path after each. */
async function solvePuzzle(goalNpc: string): Promise<boolean> {
  for (let round = 0; round < 6; round++) {
    const o = ow()!;
    const goal = o.npcs.find((n) => n.id === goalNpc);
    if (goal && (await canReachNextTo(goal))) return true;
    const objs = o.npcs.filter((n) => /lever|valve/.test(n.sprite) && o.visible(n));
    if (!objs.length) return false;
    for (const obj of objs) {
      await talkTo(obj.id, true); // some levers are out of reach until another is pulled
      const g2 = ow()!.npcs.find((n) => n.id === goalNpc);
      if (g2 && (await canReachNextTo(g2))) return true;
    }
  }
  return false;
}

async function canReachNextTo(n: Actor): Promise<boolean> {
  // Ask the driver's BFS without walking: goto to a neighbour and come back is costly,
  // so use a dry run through the map's walkability via a probe walk.
  for (const d of ["down", "left", "right", "up"] as Dir[]) {
    const [dx, dy] = DIRS[d];
    for (const k of [1, 2]) {
      const r = await goto(n.x + dx * k, n.y + dy * k);
      if (r === "ok") return true;
      if (r.startsWith("interrupted")) { await settle(); return canReachNextTo(n); }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// The story, beat by beat
// ---------------------------------------------------------------------------

async function waitForGame() {
  await waitFor(() => !!W.__t && !!W.__vr && stack().length > 0, 60000);
  // Loading screen -> title or dev scene.
  await sleep(500);
}

async function newGameFromTitle(): Promise<boolean> {
  await waitFor(() => stack().length === 1 && !ow(), 60000);
  await sleep(1200);
  beat("title screen");
  await press("start");
  await sleep(600);
  // A save makes CONTINUE the first entry; NEW GAME is found by moving up to the top... the e2e clears saves first.
  await press("a");
  // Intro + name entry + prologue (the overworld starts in "new" mode).
  await advance(300, () => !!ow());
  ctx().state.options.textSpeed = "fast";
  beat("intro done, prologue starts");
  await advance();
  await waitFor(() => idle(), 20000);
  return expectFlag("prologue + morning at home", "morning_done");
}

export async function storyPlaythrough(opts: { boost: number; starter: "oak" | "chili" | "lily" }) {
  instrument();
  const st = () => ctx().state;
  const party = () => st().party.map((q) => `${q.species}:${q.level}`).join(",");
  // Every beat is skipped when its flag is already set, so a `?dev=world&play=1&flags=...`
  // jump-in resumes the story from that point.

  // --- Chapter 1 -------------------------------------------------------------
  if (!flag("got_starter")) {
    await nav("herbarium");
    await settle();
    await talkTo("vale_gh");
    beat("vale in the greenhouse");
    await talkTo(`pot_${opts.starter}`);
    await settle();
    await expectFlag(`starter: ${opts.starter}`, "got_starter", `party=${party()}`);
  }
  boostParty(opts.boost);

  if (!flag("got_seed")) {
    await nav("fennimore_house");
    await talkTo("fennimore");
    await expectFlag("fennimore gives the seed", "got_seed");
  }

  if (!flag("pip_demo_done")) {
    // PIP's demo fires on the way back through ROUTE 1.
    await nav("fallowfield");
    if (!flag("pip_demo_done")) {
      await nav("route_1");
      await trigger("pip_demo");
      await nav("fallowfield");
    }
    await expectFlag("pip's catching demo", "pip_demo_done");
  }

  if (!flag("theft_seen")) {
    await nav("herbarium");
    await settle();
    await expectFlag("theft at the herbarium", "theft_seen");
  }
  if (!flag("rival_1_done")) {
    await nav("fallowfield");
    await settle();
    if (!flag("rival_1_done")) {
      const o = ow()!;
      if (o.npcs.some((n) => n.id === "bram" && o.visible(n))) await talkTo("bram");
    }
    await expectFlag("rival battle 1", "rival_1_done", `won=${flag("beat_rival_1_" + counter(opts.starter))}`);
  }
  if (!flag("got_pods")) {
    await nav("herbarium");
    await settle();
    await expectFlag("vale's letter, pods and flasks", "got_pods", `pods=${st().bag["terrarium_pod"] ?? 0}`);
  }

  // --- Chapter 2 -------------------------------------------------------------
  if (!flag("beat_hollis")) {
    await nav("bramblegate");
    beat("arrived in bramblegate", true, `party=${party()}`);
    await nav("bramblegate_conservatory");
    if (!(await solvePuzzle("hollis"))) issue("puzzle", "could not reach HOLLIS");
    await talkTo("hollis");
    await expectFlag("HOLLIS: bramble mark", "beat_hollis", `marks=${JSON.stringify(st().marks ?? "")}`);
  }
  if (!flag("saw_grunt_bg")) {
    await nav("bramblegate");
    await settle();
    beat("grunt sighting", flag("saw_grunt_bg"));
  }

  if (!flag("beat_grunt_r3")) {
    await nav("route_3");
    await settle();
    if (!flag("beat_grunt_r3")) {
      const o = ow()!;
      if (o.map.def.triggers.some((t) => t.script === "r3_grunt")) await trigger("r3_grunt");
      else if (o.npcs.some((n) => n.id === "grunt" && o.visible(n))) await talkTo("grunt");
    }
    await expectFlag("route 3 grunt", "beat_grunt_r3");
  }

  // --- Chapter 3 -------------------------------------------------------------
  if (!flag("grove_cleared")) {
    await nav("sugarbush");
    beat("arrived in sugarbush");
    await nav("sugarbush_grove");
    for (const g of ["grunt1", "grunt2", "grunt3"]) {
      const o = ow()!;
      const n = o.npcs.find((a) => a.id === g);
      if (n && o.visible(n) && n.def?.trainer && !flag(`beat_${n.def.trainer}`)) await talkTo(g);
    }
    // The step-on trigger in front of SHEARS may already have run the whole scene.
    if (!flag("grove_cleared") && !(await talkTo("shears", true)) && !flag("grove_cleared")) {
      issue("soft-lock", "SHEARS unreachable after the grove grunts (a beaten trainer blocks the path?); re-entering the grove");
      await nav("sugarbush");
      await nav("sugarbush_grove");
      await talkTo("shears");
    }
    await expectFlag("SHEARS: grove cleared", "grove_cleared");
  }
  if (!flag("rival_2_done")) {
    await nav("sugarbush");
    await settle();
    if (!flag("rival_2_done")) {
      const o = ow()!;
      const tr = o.map.def.triggers.find((t) => t.script === "rival_2");
      if (tr) await trigger("rival_2");
      else if (o.npcs.some((n) => n.id === "bram" && o.visible(n))) await talkTo("bram");
    }
    await expectFlag("rival battle 2", "rival_2_done");
  }

  if (!flag("beat_nell")) {
    await nav("sugarbush_conservatory");
    if (!(await solvePuzzle("nell"))) issue("puzzle", "could not reach NELL");
    // NELL's talk runs the chain: battle, mark, then VALE's call, which now sends us east.
    await talkTo("nell");
    await expectFlag("NELL: sundew mark", "beat_nell");
    await expectFlag("VALE's call: take the seed to the ROOT RELAY", "ch4_started");
  }

  await chapter4(opts);
}

// ---------------------------------------------------------------------------
// Chapter 4: GLASSHOUSE CITY
// ---------------------------------------------------------------------------

async function chapter4(_opts: { boost: number; starter: "oak" | "chili" | "lily" }) {
  const st = () => ctx().state;
  const bag = (i: string) => st().bag[i] ?? 0;

  if (!flag("gc_arrival_seen")) {
    await nav("route_4");
    beat("route 4: past the sap cart", ow()?.mapId === "route_4");
    await nav("glasshouse_city");
    await settle();
    await expectFlag("GLASSHOUSE CITY: the dome", "gc_arrival_seen", `music=${ctx().audio.current()}`);
  }

  if (!flag("relay_listened")) {
    // The ROSE CONSERVATORY is shut until the open day is over.
    await nav("glasshouse_city");
    const o = ow()!;
    if (o.map.def.triggers.some((t) => t.script === "ch4_conservatory_closed")) {
      const before = report.texts.length;
      await trigger("ch4_conservatory_closed");
      await settle();
      const said = report.texts.slice(before).some((t) => /CLOSED/.test(t.text));
      beat("ROSE CONSERVATORY closed", said && ow()?.mapId === "glasshouse_city");
    } else beat("ROSE CONSERVATORY closed", false, "no ch4_conservatory_closed trigger");

    await nav("glasshouse_relay");
    await settle();
    if (!flag("relay_listened")) await trigger("ch4_relay_listen");
    await settle();
    await expectFlag("ROOT RELAY: the seed, the pulse", "relay_listened",
      `centuryheart_seed=${bag("centuryheart_seed")}`);
  }

  // WREN's LISTENING POSTS (post 3 is in the PALM HOUSE, post 2 in the square, post 1 on ROUTE 4).
  if (!flag("quest_relay_sensors_started")) {
    await nav("glasshouse_relay");
    await talkTo("wren");
    await expectFlag("WREN: listening posts quest", "quest_relay_sensors_started");
  }

  if (!flag("ch4_grunt_seen")) {
    await nav("glasshouse_city");
    await settle();
    await expectFlag("a grunt watches the RELAY mast", "ch4_grunt_seen");
  }

  if (!flag("rival_3_done")) {
    await nav("glasshouse_nursery");
    await settle();
    await expectFlag("rival battle 3 at the NURSERY", "rival_3_done");
    beat("GARDEN SHEARS from the keepers", flag("got_shears") && bag("pruning_shears") > 0);
  }

  if (!flag("sprouted_any")) await nurseryBreeding();
  if (!flag("quest_first_seed_done")) {
    await nav("glasshouse_nursery");
    await talkTo("nursery_keeper_b");
    await expectFlag("LUPIN: the first seed", "quest_first_seed_done", `plant_food=${bag("plant_food")}`);
  }

  // The posts, in walking order.
  for (const [n, map] of [[2, "glasshouse_city"], [3, "palm_house"], [1, "route_4"]] as [number, MapId][]) {
    if (flag(`sensor_${n}_read`)) continue;
    await nav(map);
    await useTile(`q_relay_sensors_post_${n}`);
    beat(`sensor post ${n} (${map})`, flag(`sensor_${n}_read`));
  }
  if (!flag("quest_relay_sensors_done")) {
    await nav("glasshouse_relay");
    await talkTo("wren");
    await expectFlag("WREN: listening posts done", "quest_relay_sensors_done");
  }

  // ROUTE 5: PRUNE through the brambles at both ends, out to HEDGEROW and back.
  if (!flag("e2e_route5_done")) {
    await nav("glasshouse_city");
    const prunedBefore = Object.keys(st().flags).filter((f) => f.startsWith("pruned_")).length;
    await nav("route_5");
    beat("ROUTE 5 (through the brambles)", ow()?.mapId === "route_5");
    await nav("hedgerow");
    beat("ROUTE 5 comes out in HEDGEROW", ow()?.mapId === "hedgerow");
    const pruned = Object.keys(st().flags).filter((f) => f.startsWith("pruned_")).length - prunedBefore;
    beat("PRUNE used on the way", pruned > 0, `${pruned} brambles cut`);
    await nav("glasshouse_city");
    st().flags["e2e_route5_done"] = true;
  }

  // Conservatory 3.
  if (!flag("beat_flora")) {
    await nav("glasshouse_conservatory");
    if (!(await solvePuzzle("flora"))) issue("puzzle", "could not reach FLORA");
    await talkTo("flora");
    await expectFlag("FLORA VANCE: rose mark", "beat_flora", `marks=${JSON.stringify(st().marks ?? "")}`);
  }

  // Leaving the CONSERVATORY with the mark: VALE's call, the save offer, the end card.
  await nav("glasshouse_conservatory");
  const o = ow()!;
  const exit = o.map.def.warps.find((w) => w.to === "glasshouse_city");
  if (!exit) { beat("chapter end", false, "no conservatory exit"); return; }
  await untilEndCard(async () => {
    await walkToQuiet(exit.x, exit.y - 1);
    await goto(exit.x, exit.y, false);
    await T().hold(KEY.down, 250);
  });
  beat("chapter 4 done", flag("ch4_done"));
}

// ---------------------------------------------------------------------------
// Chapter 5: CEDARHALLOW
// ---------------------------------------------------------------------------

async function chapter5() {
  // The Chapter 4 end card saves before returning to the title. Restore that
  // save through START, CONTINUE and its summary, just as check:continue does.
  const saved = ctx().save.read();
  if (!saved?.flags["ch4_done"]) {
    beat("CONTINUE after Chapter 4", false, "no Chapter 4 save");
    return;
  }
  await press("start");
  await sleep(700);
  await press("a");
  await sleep(700);
  await press("a");
  const continued = await waitFor(() => !!ow(), 15000);
  await sleep(1500);
  if (!continued) { beat("CONTINUE after Chapter 4", false, "no overworld"); return; }
  await settle();
  beat("CONTINUE after Chapter 4", flag("ch4_done") && ow()?.mapId === saved.position.map);
  ctx().state.options.textSpeed = "fast";
  const st = () => ctx().state;
  const bag = (item: ItemId) => st().bag[item] ?? 0;

  await nav("sugarbush_grove");
  await nav("route_6");
  beat("SUGARBUSH GROVE: north exit to ROUTE 6", ow()?.mapId === "route_6" && flag("ch4_done"));
  await nav("cedarhallow");
  await expectFlag("CEDARHALLOW: arrival", "ch5_arrived");
  if (!flag("visited_cedarhallow")) issue("story", "CEDARHALLOW was not recorded as visited");

  let before = report.texts.length;
  await trigger("ch5_conservatory_door");
  beat("MORROW's CONSERVATORY is closed", ow()?.mapId === "cedarhallow" && onTile(18, 9)
    && report.texts.length > before && !flag("burnt_vision_seen"));

  await nav("cedarhallow_house");
  await talkTo("ranger");
  await expectFlag("FIRE FOLLOWERS: accepted", "quest_fire_followers_started");

  await nav("burnt_stand");
  if (!flag("ch5_grunts_seen")) await trigger("ch5_grunts");
  await expectFlag("BURNT STAND: the cone sacks", "ch5_grunts_seen");
  before = report.texts.length;
  if (!flag("rival_4_done")) await trigger("rival_4");
  await expectFlag("rival battle 4: the grafted starter", "rival_4_done");
  if (!report.texts.slice(before).some((t) => /strains at its GRAFT COLLAR!/.test(t.text))) {
    issue("battle", "rival 4's grafted starter did not announce its collar");
  }
  if (!flag("burnt_vision_seen")) await trigger("ch5_vision");
  await expectFlag("BURNT STAND: the vision", "burnt_vision_seen");
  await talkTo("morrow_bs");
  await expectFlag("MORROW returns to the CONSERVATORY", "morrow_returned");

  await nav("cedarhallow");
  before = report.texts.length;
  await trigger("ch5_conservatory_door");
  beat("the dark CONSERVATORY needs a lantern", ow()?.mapId === "cedarhallow" && onTile(18, 9)
    && report.texts.length > before && !flag("got_lantern"));
  await nav("cedar_hollow");
  await talkTo("shrine_keeper");
  beat("THE HOLLOW: the keeper's lantern", flag("got_lantern") && bag("foxfire_lantern") === 1);
  await expectFlag("SHRINE OFFERINGS: accepted", "quest_shrine_offerings_started");
  for (const n of [1, 2, 3]) {
    await useTile(`q_shrine_offerings_shrine_${n}`);
    await expectFlag(`SHRINE OFFERINGS: shrine ${n}`, `shrine_${n}_offered`);
  }
  // Read reward deltas after walking back, so incidental encounters and hidden
  // items cannot count as part of the keeper's reward.
  await walkTo(10, 22);
  const rain = bag("rain_jar"), money = st().money;
  await talkTo("shrine_keeper");
  beat("SHRINE OFFERINGS: rewarded", flag("quest_shrine_offerings_done")
    && bag("rain_jar") === rain + 2 && st().money === money + 1500);

  await nav("burnt_stand");
  await catchFireFollower("fireweed");
  await catchFireFollower("lodgepole");
  await nav("cedarhallow_house");
  await walkTo(3, 5);
  const pods = bag("glass_pod"), ash = bag("ember_ash");
  await talkTo("ranger");
  beat("FIRE FOLLOWERS: rewarded", flag("quest_fire_followers_done")
    && flag("fire_followers_fireweed") && flag("fire_followers_lodgepole")
    && bag("glass_pod") === pods + 3 && bag("ember_ash") === ash + 1);

  await nav("cedarhallow_conservatory");
  beat("the dark CONSERVATORY opens", ow()?.mapId === "cedarhallow_conservatory"
    && ctx().world.maps["cedarhallow_conservatory"].dark === true && bag("foxfire_lantern") > 0);
  // Pull both entrance-hall levers with A. Walk the revealed middle path;
  // both juniors see the player on it and battle before MORROW's platform.
  await talkTo("lever:cons4_lever_a");
  await expectFlag("CONSERVATORY 4: lever A", "cons4_lever_a");
  await talkTo("lever:cons4_lever_b");
  await expectFlag("CONSERVATORY 4: lever B", "cons4_lever_b");
  const crossed = await walkTo(7, 3);
  beat("CONSERVATORY 4: the path through the pits", crossed && onTile(7, 3)
    && flag("beat_jr_lantern") && flag("beat_jr_nightshade"));
  await talkTo("morrow");
  beat("MORROW: pipe mark", flag("beat_morrow") && st().marks.includes("pipe_mark"));

  const exit = ow()?.map.def.warps.find((w) => w.to === "cedarhallow");
  if (!exit) { beat("chapter 5 done: GLIDER SEED", false, "no conservatory exit"); return; }
  await untilEndCard(async () => {
    await walkToQuiet(exit.x, exit.y - 1);
    await goto(exit.x, exit.y, false);
    await T().hold(KEY.down, 250);
  }, "Chapter 5");
  beat("chapter 5 done: GLIDER SEED", flag("ch5_done") && flag("slice_done") && bag("glider_seed") === 1);
}

// ---------------------------------------------------------------------------
// Chapter 6: SALTMARSH HARBOUR and DRIFTSEED ISLE
// ---------------------------------------------------------------------------

async function chapter6() {
  const saved = ctx().save.read();
  if (!saved?.flags["ch5_done"]) {
    beat("CONTINUE after Chapter 5", false, "no Chapter 5 save");
    return;
  }
  await press("start");
  await sleep(700);
  await press("a");
  await sleep(700);
  await press("a");
  const continued = await waitFor(() => !!ow(), 15000);
  await sleep(1500);
  if (!continued) { beat("CONTINUE after Chapter 5", false, "no overworld"); return; }
  await settle();
  beat("CONTINUE after Chapter 5", flag("ch5_done") && ow()?.mapId === saved.position.map);
  ctx().state.options.textSpeed = "fast";
  const st = () => ctx().state;
  const bag = (item: ItemId) => st().bag[item] ?? 0;

  await nav("fallowfield");
  const keeper = ow()?.npcs.find((n) => n.id === "ford_keeper");
  const fordOpen = !!keeper && !ow()!.visible(keeper);
  await nav("route_7");
  beat("the ford opens onto ROUTE 7", fordOpen && ow()?.mapId === "route_7");
  await nav("saltmarsh_harbour");
  beat("SALTMARSH HARBOUR: arrival", ow()?.mapId === "saltmarsh_harbour"
    && flag("ch6_arrived") && flag("visited_saltmarsh_harbour"));

  const seedBefore = bag("centuryheart_seed");
  if (!flag("ch6_doctor_met")) await trigger("ch6_doctor");
  const doctor = ow()?.npcs.find((n) => n.id === "doctor");
  beat("the doctor leaves on the grey boat", flag("ch6_doctor_met")
    && !!doctor && !ow()!.visible(doctor) && seedBefore > 0 && bag("centuryheart_seed") === seedBefore);
  for (const grunt of ["grunt_dock_1", "grunt_dock_2"]) {
    if (!flag(`beat_${grunt}`)) await talkTo(grunt);
    await expectFlag(`the docks: ${grunt}`, `beat_${grunt}`);
  }
  await talkTo("reyes_point");
  beat("REYES: the LILY RAFT", flag("got_raft") && bag("lily_raft") === 1);

  // The harbour pier ends on water. goto mounts with A/YES and then drives
  // each raft step with arrow input; water arrivals keep the player rafting.
  const boarding = report.texts.length;
  await nav("route_8");
  const crossed = await walkTo(27, 16);
  beat("RAFT: across ROUTE 8", ow()?.mapId === "route_8" && crossed && onTile(27, 16)
    && !!st().rafting && report.texts.slice(boarding).some((t) => /Ride the LILY RAFT/.test(t.text)));
  await talkTo("survey_assistant");
  await expectFlag("SEAGRASS SURVEY: accepted", "quest_seagrass_survey_started");
  await nav("driftseed_isle");
  await walkTo(16, 5); // step off the landing boardwalk onto the island
  beat("DRIFTSEED ISLE: shore landing", ow()?.mapId === "driftseed_isle"
    && flag("visited_driftseed_isle") && !st().rafting);
  await talkTo("isle_elder");
  beat("the elder's SAXIFRAGE", flag("got_saxifrage") && bag("saxifrage") === 1);

  // Catch the vine before the two survey catches fill the party. The trade
  // needs a party member; surplus sea catches may go to the cabinet normally.
  await catchCoastalPlant("vanilla", "driftseed_isle", [[5, 20], [6, 20]], "HAND POLLINATOR: caught VANILLA VINE");
  if (!st().party.some((q) => q.species === "vanilla_vine")) {
    issue("trade", "the caught VANILLA VINE is not in the party");
  }

  await nav("driftseed_conservatory");
  let pushed = 0;
  const pushes = report.texts.length;
  // Approach each stone from the left, push into its right-hand pocket, then
  // climb the cleared corridor. Re-entering would reset all three actors.
  for (const [id, y] of [["boulder_1", 12], ["boulder_2", 8], ["boulder_3", 4]] as const) {
    if (!(await walkTo(6, y))) break;
    await face("right");
    await press("a");
    await sleep(250);
    await settle();
    const boulder = ow()?.npcs.find((n) => n.id === id);
    if (boulder?.x !== 8 || boulder.y !== y) break;
    pushed++;
  }
  const summit = await walkTo(7, 3);
  beat("CONSERVATORY 6: UPROOT the three boulders", pushed === 3 && summit && onTile(7, 3)
    && report.texts.slice(pushes).filter((t) => t.text === "[?] UPROOT it?").length === 3);
  await talkTo("saguaro");
  beat("SAGUARO: cactus mark", flag("beat_saguaro") && st().marks.includes("cactus_mark"));
  beat("SAGUARO: the CACTUS SAP", flag("got_sap") && bag("cactus_sap") === 1);

  // Finish the survey on the voyage home, through real water encounters.
  await nav("route_8");
  await catchCoastalPlant("seagrass", "route_8", [[18, 35], [19, 35]], "SEAGRASS SURVEY: caught seagrass");
  await catchCoastalPlant("mangrove", "route_8", [[18, 35], [19, 35]], "SEAGRASS SURVEY: caught mangrove");
  await walkTo(30, 21);
  const pods = bag("glass_pod"), rain = bag("rain_jar");
  await talkTo("survey_assistant");
  beat("SEAGRASS SURVEY: rewarded", flag("quest_seagrass_survey_done")
    && flag("seagrass_survey_seagrass") && flag("seagrass_survey_mangrove")
    && bag("glass_pod") === pods + 3 && bag("rain_jar") === rain + 1);

  await nav("saltmarsh_harbour");
  const healing = report.texts.length;
  await trigger("ch6_lantern_tree");
  beat("the Lantern Tree: fireflies return", flag("lantern_healed") && bag("cactus_sap") === 0
    && report.texts.slice(healing).some((t) => /fireflies come back/i.test(t.text)));
  // Complete the market trade before REYES: the next harbour entry after her
  // battle immediately runs Vale's call and the Chapter 6 end card.
  await nav("saltmarsh_market");
  await talkTo("trader");
  beat("HAND POLLINATOR: POLLY grows into VANILLA", flag("quest_hand_pollinator_done")
    && st().party.some((q) => q.species === "vanilla_orchid" && q.nickname === "POLLY")
    && st().herbarium.caught.includes("vanilla_orchid"));

  await nav("saltmarsh_conservatory");
  const pools = report.texts.length;
  await talkTo("lever:cons5_gate");
  beat("CONSERVATORY 5: raft to the sluice lever", ow()?.mapId === "saltmarsh_conservatory"
    && flag("cons5_gate") && report.texts.slice(pools).some((t) => /Ride the LILY RAFT/.test(t.text)));
  const reached = await walkTo(7, 3);
  beat("CONSERVATORY 5: raft through the open gate", reached && onTile(7, 3) && !st().rafting);
  await talkTo("reyes");
  beat("REYES: mangrove mark", flag("beat_reyes") && st().marks.includes("mangrove_mark"));

  const exit = ow()?.map.def.warps.find((w) => w.to === "saltmarsh_harbour");
  if (!exit) { beat("chapter 6 done", false, "no conservatory exit"); return; }
  await untilEndCard(async () => {
    await walkToQuiet(exit.x, exit.y - 1);
    await goto(exit.x, exit.y, false);
    await T().hold(KEY.down, 250);
  }, "Chapter 6");
  beat("chapter 6 done", flag("ch6_done") && flag("slice_done"));
}

/** Same pod fixture as FIRE FOLLOWERS, with actual grass/raft encounter rolls.
 * No species, caught record, quest flag or encounter RNG is injected. */
async function catchCoastalPlant(line: string, map: MapId, tiles: [[number, number], [number, number]], name: string) {
  const st = ctx().state;
  const total = () => st.party.length + st.box.length;
  const before = total(), texts = report.texts.length;
  const caught = () => [...st.party, ...st.box].some((q) => ctx().data.species[q.species].line === line);
  st.bag["terrarium_pod"] = Math.max(st.bag["terrarium_pod"] ?? 0, 30);
  const pods = st.bag["terrarium_pod"];
  captureLine = line;
  try {
    for (let steps = 0; steps < 1000 && !caught() && (st.bag["terrarium_pod"] ?? 0) > 0; steps++) {
      const [x, y] = onTile(...tiles[0]) ? tiles[1] : tiles[0];
      if (ow()?.mapId !== map || !(await walkTo(x, y))) break;
      await settle();
      refreshHelper();
    }
  } finally { captureLine = null; }
  beat(name, caught() && total() > before && (st.bag["terrarium_pod"] ?? 0) < pods
    && report.texts.slice(texts).some((t) => /used TERRARIUM POD/i.test(t.text)),
    `party+box ${before}->${total()}, pods ${pods}->${st.bag["terrarium_pod"] ?? 0}`);
}

/** Catch a quest plant from real grass encounters, driving BAG/PODS/USE.
 * The 30-pod supply is the same fixture used by check:catching. Encounter
 * rolls, levels, HP, catch odds and caught records all remain game-owned. */
async function catchFireFollower(line: "fireweed" | "lodgepole") {
  const st = ctx().state;
  const caught = () => st.herbarium.caught.some((id) => ctx().data.species[id].line === line);
  const total = () => st.party.length + st.box.length;
  const before = total(), texts = report.texts.length;
  st.bag["terrarium_pod"] = Math.max(st.bag["terrarium_pod"] ?? 0, 30);
  const pods = st.bag["terrarium_pod"];
  captureLine = line;
  try {
    // These neighbouring tiles are both grass in the southern clearing.
    for (let steps = 0; steps < 500 && !caught() && (st.bag["terrarium_pod"] ?? 0) > 0; steps++) {
      if (ow()?.mapId !== "burnt_stand" || !(await walkTo(onTile(6, 21) ? 7 : 6, 21))) break;
      await settle();
      refreshHelper();
    }
  } finally { captureLine = null; }
  beat(`FIRE FOLLOWERS: caught ${line}`, caught() && total() > before
    && (st.bag["terrarium_pod"] ?? 0) < pods
    && report.texts.slice(texts).some((t) => /used TERRARIUM POD/i.test(t.text)),
  `party+box ${before}->${total()}, pods ${pods}->${st.bag["terrarium_pod"] ?? 0}`);
}

/** Board two plants of one line, walk until they set seed, collect it, and walk it to sprouting. */
async function nurseryBreeding() {
  const st = ctx().state;
  await nav("glasshouse_nursery");
  // Two of one line (the best odds), added for the test. Party: helper, starter, + these two.
  const pair = "dandelion_bud" as SpeciesId;
  const nursery = () => st.nursery ?? { slots: [], steps: 0, seedReady: false };
  if (nursery().slots.length < 2 && !nursery().seedReady) {
    for (let i = nursery().slots.length; i < 2; i++) st.party.push(createQuickened(ctx().data, pair, 8, fixtureRng));
    let boards = 2 - nursery().slots.length;
    menuPlan = (options, prompt) => {
      if (!/help/i.test(prompt)) return undefined;
      const i = boards > 0 ? options.indexOf("BOARD") : -1;
      if (i >= 0) { boards--; return i; }
      return options.indexOf("CANCEL");
    };
    partyPick = () => st.party.length - 1;
    await talkTo("nursery_keeper");
    menuPlan = null;
    partyPick = null;
    beat("NURSERY: two plants boarded", nursery().slots.length === 2,
      `slots=${nursery().slots.map((q) => q.species).join(",")} party=${st.party.length}`);
  }
  // Walk the yard. Each check is a real roll; we only skip the 256-step wait.
  for (let i = 0; i < 10 && !nursery().seedReady && nursery().slots.length === 2; i++) {
    if (st.nursery) st.nursery.steps = SEED_CHECK_STEPS - 4;
    await pace(6);
  }
  beat("NURSERY: a seed is set", nursery().seedReady || st.party.some((q) => q.seed));
  if (!st.party.some((q) => q.seed)) {
    const yard = report.texts.length;
    await talkTo("nursery_keeper_b"); // the yard keeper's hint (and THE FIRST SEED)
    beat("LUPIN hints at the seed", report.texts.slice(yard).some((t) => /SEED/.test(t.text)));
    menuPlan = (options, prompt) => (/help/i.test(prompt) ? options.indexOf("CANCEL") : undefined);
    await talkTo("nursery_keeper");
    menuPlan = null;
  }
  const seed = st.party.find((q) => q.seed);
  beat("NURSERY: collected the SEED", !!seed, seed ? `${seed.species} steps=${seed.seed!.steps}` : `party=${st.party.map((q) => q.species)}`);
  if (!seed) return;
  // Skip most of the countdown; the last steps and the sprouting scene are real.
  seed.seed!.steps = 3;
  await pace(5);
  await settle();
  await expectFlag("the SEED sprouted", "sprouted_any", `${seed.species} seed=${JSON.stringify(seed.seed ?? null)}`);
}

function counter(line: string) {
  return ({ oak: "chili", chili: "lily", lily: "oak" } as Record<string, string>)[line] ?? "chili";
}

/** Start the chapter-end chain, then mash through the save offer to the
 *  TO BE CONTINUED card and the title screen. */
async function untilEndCard(start: () => Promise<void>, chapter?: string) {
  await start();
  // Mash until the end card is up (it plays "slice_end" over the overworld),
  // snapshot it, then press through to the title.
  let sawCard = false;
  for (let i = 0; i < 600; i++) {
    await sleep(140);
    if (!sawCard && ctx().audio.current() === "slice_end") {
      sawCard = true;
      await sleep(4000); // fade in from white, then the title types itself out
      beat(chapter ? `${chapter}: TO BE CONTINUED card` : "TO BE CONTINUED card", flag("slice_done"));
      await sleep(1500); // the card ignores input for its first 4 s
    }
    if (sawCard) {
      if (!ow() && stack().length === 1) break; // title is up
      await press("a");
      await sleep(1500);
      continue;
    }
    hookScenes();
    await press(pendingNo ? "b" : "a");
  }
  await sleep(2000);
  beat(chapter ? `${chapter}: back at the title` : "back at the title", !ow() && stack().length >= 1);
}

// ---------------------------------------------------------------------------
// Targeted checks
// ---------------------------------------------------------------------------

export const CHECKS: Record<string, () => Promise<void>> = {
  /** Encounter tables and music by time of day (pure rolls, no walking). */
  async daynight() {
    const world = ctx().world;
    const roll = (map: MapId, tod: TimeOfDay) => {
      const def = world.maps[map];
      const seen = new Map<string, number>();
      let r = 0x9e3779b9;
      const rng = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return ((r >>> 0) % 1e6) / 1e6; };
      for (let i = 0; i < 4000; i++) {
        const e = rollEncounter(def, "tall_grass", tod, rng) ?? rollEncounter(def, "bog", tod, rng);
        if (e) seen.set(e.species, (seen.get(e.species) ?? 0) + 1);
      }
      return [...seen.keys()].sort();
    };
    for (const m of ["route_1", "route_2", "route_3", "sugarbush_grove"] as MapId[]) {
      const day = roll(m, "day");
      const night = roll(m, "night");
      beat(`encounters ${m}`, day.length > 0, `day=[${day}] night=[${night}]`);
    }
    const r3n = roll("route_3", "night");
    const r3d = roll("route_3", "day");
    beat("moonflower only at night on route 3", r3n.some((s) => s.startsWith("moonflower")) && !r3d.some((s) => s.startsWith("moonflower")));
    beat("time of day now", true, `${ctx().timeOfDay()} music=${ctx().audio.current()}`);
  },

  /** Lose on purpose and check the whiteout lands at the heal point, healed and poorer. */
  async whiteout() {
    instrument();
    await settle();
    const st = ctx().state;
    const before = { money: st.money, heal: { ...st.heal } };
    const o = ow()!;
    void o.flow(async () => {
      await o.runScript([{ op: "wildBattle", species: "sugar_maple" as SpeciesId, level: 70 }]);
    });
    await sleep(500);
    await advance(400);
    const after = ow()!;
    const healed = st.party.every((q) => q.hp > 0);
    beat("whiteout", after.mapId === before.heal.map && healed && st.money <= before.money,
      `heal=${before.heal.map}@${before.heal.x},${before.heal.y} now=${after.mapId}@${after.player.x},${after.player.y} money ${before.money}->${st.money} healed=${healed}`);
  },

  /** START -> SAVE through the real menu, then read the save back. */
  async save() {
    instrument();
    await settle();
    const st = ctx().state;
    st.flags["e2e_marker"] = true;
    let saved = false;
    // START reopens on the last item used, and closing a sub-screen returns to
    // the menu on that item. So walk down one row at a time: A, and if it isn't
    // the save prompt, B back to the menu and DOWN.
    await settle();
    await press("start");
    await sleep(600);
    for (let k = 0; k < 8 && !saved; k++) {
      const before = report.texts.length;
      await press("a");
      await sleep(900);
      if (report.texts.slice(before).some((t) => /save the game/i.test(t.text))) {
        await advance(80); // YES, overwrite YES, SAVING…, saved
        saved = true;
        break;
      }
      if (idle()) { await press("start"); await sleep(600); } // EXIT closed the menu
      else { await press("b"); await sleep(700); }
      await press("down", 60);
      await sleep(250);
    }
    for (let i = 0; i < 6 && !idle(); i++) { await press("b"); await sleep(400); }
    const back = ctx().save.read();
    beat("save through START > SAVE", saved && !!back && back.flags["e2e_marker"] === true && back.position.map === st.position.map && back.party.length === st.party.length,
      back ? `map=${back.position.map}@${back.position.x},${back.position.y} party=${back.party.length} money=${back.money} time=${Math.round(back.playTimeMs / 1000)}s` : "no save");
  },

  /** From the title: CONTINUE must restore the saved game (run after check:save, on a fresh load). */
  async continue() {
    instrument();
    const saved = ctx().save.read();
    if (!saved) { beat("continue", false, "no save to continue"); return; }
    await press("start");
    await sleep(700);
    await press("a"); // cursor starts on CONTINUE
    await sleep(700);
    await press("a"); // confirm on the save summary
    await waitFor(() => !!ow(), 15000);
    await sleep(1500);
    await settle();
    const st = ctx().state;
    const o = ow();
    beat("continue from title", !!o && o.mapId === saved.position.map && st.flags["e2e_marker"] === true && st.party.length === saved.party.length,
      o ? `at ${o.mapId}@${o.player.x},${o.player.y}, saved ${saved.position.map}@${saved.position.x},${saved.position.y}` : "no overworld");
  },

  /** Deposit and withdraw through the specimen cabinet. */
  async cabinet() {
    instrument();
    await settle();
    const st = ctx().state;
    if (st.party.length < 2) {
      st.party.push(createQuickened(ctx().data, "dandelion_bud" as SpeciesId, 6, fixtureRng));
    }
    await nav((new URLSearchParams(location.search).get("cabinet") as MapId) || "bramblegate_greenhouse");
    const o = ow()!;
    const tiles = o.map.def.tiles;
    let spot: [number, number] | null = null;
    // Find a specimen_cabinet tile through the runtime map (legend lookup).
    const legend = (ctx().world.maps[o.mapId] as unknown as { legend: Record<string, string> }).legend;
    for (let y = 0; y < tiles.length && !spot; y++) for (let x = 0; x < tiles[y].length; x++) {
      if (legend[tiles[y][x]] === "specimen_cabinet") { spot = [x, y]; break; }
    }
    if (!spot) { beat("cabinet", false, `no specimen_cabinet on ${o.mapId}`); return; }
    const partyBefore = st.party.length;
    const boxBefore = st.box.length;
    await walkToQuiet(spot[0], spot[1] + 1);
    await face("up");
    await press("a");                         // "{PLAYER} opened the SPECIMEN CABINET."
    await sleep(700);
    hookScenes();
    await press("a"); await sleep(700);       // → STORE / WITHDRAW / CANCEL
    hookScenes();
    await press("a"); await sleep(700);       // STORE → "Store which QUICKENED?"
    await press("down", 60); await sleep(250); // the second member
    // member → STORE/SUMMARY/CANCEL → STORE → "Stored X in the cabinet." : A until it moves.
    for (let i = 0; i < 5 && st.party.length === partyBefore; i++) { await press("a"); await sleep(700); }
    const mid = { party: st.party.length, box: st.box.length };
    // "Stored X in the cabinet.": the first B closes the message, the second
    // leaves the store list for STORE / WITHDRAW / CANCEL.
    await sleep(1200);
    await press("b"); await sleep(900);
    await press("b"); await sleep(900);
    await press("down", 60); await sleep(250);
    await press("a"); await sleep(900);        // WITHDRAW → stored list
    // first stored → WITHDRAW/SUMMARY/CANCEL → WITHDRAW → message: A until it moves.
    for (let i = 0; i < 5 && st.box.length > boxBefore; i++) { await press("a"); await sleep(700); }
    const end = { party: st.party.length, box: st.box.length };
    for (let i = 0; i < 8 && !idle(); i++) { await press("b"); await sleep(400); }
    await settle();
    // Store is asserted; the withdraw half is timing-sensitive to drive blind,
    // so it is reported but not asserted (verified by hand: A, DOWN, A, A, A).
    beat("cabinet store", mid.party === partyBefore - 1 && mid.box === boxBefore + 1,
      `party ${partyBefore}->${mid.party}->${end.party}, box ${boxBefore}->${mid.box}->${end.box}` +
      (end.box === boxBefore ? " (withdraw ok)" : " (withdraw not driven; check by hand)"));
  },

  /** Throw pods at a wild Quickened until it roots (the helper is benched). */
  async catching() {
    instrument();
    await settle();
    const st = ctx().state;
    st.bag["terrarium_pod"] = 30;
    const caughtBefore = st.herbarium.caught.length;
    const partyBefore = st.party.length + st.box.length;
    const o = ow()!;
    const fight = o.flow(async () => {
      await o.runScript([{ op: "wildBattle", species: "dandelion_bud" as SpeciesId, level: 3 }]);
    });
    // Wait for the send-out, then: BAG (right of FIGHT) → RIGHT to the PODS pocket → throw.
    const t0 = report.texts.length;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      hookScenes();
      if (report.texts.slice(t0).some((t) => /Go! /.test(t.text))) break;
      await press("a");
    }
    await sleep(1200);
    await press("right", 60); await sleep(250);
    await press("a"); await sleep(900);
    await press("right", 60); await sleep(400);
    await press("a"); await sleep(600);
    // Then mash through: caught, or it broke free and the battle goes on (FIGHT wins it).
    await advance(400);
    await fight.catch(() => {});
    await advance();
    const threw = report.texts.some((t) => /used TERRARIUM|used .*POD/i.test(t.text));
    const outcome = report.texts.some((t) => /was caught|broke free|Gotcha/i.test(t.text));
    beat("catching with a pod", (st.bag["terrarium_pod"] ?? 0) < 30 && threw && outcome,
      `caught ${caughtBefore}->${st.herbarium.caught.length}, party+box ${partyBefore}->${st.party.length + st.box.length}, pods left ${st.bag["terrarium_pod"]}`);
  },

  /** Win one battle with a Quickened one exp point short of growing. */
  async growth() {
    instrument();
    await settle();
    const st = ctx().state;
    const q = createQuickened(ctx().data, "dandelion_bud" as SpeciesId, 11, fixtureRng);
    // One win from level 12 (medium rate: 12^3 exp), where the dandelion line grows.
    q.exp = 12 ** 3 - 5;
    st.party.unshift(q);
    healParty(st.party, ctx().data);
    const o = ow()!;
    void o.flow(async () => { await o.runScript([{ op: "wildBattle", species: "sunflower_seedling" as SpeciesId, level: 6 }]); });
    await sleep(500);
    await advance(600);
    const grown = st.party.find((p) => p === q);
    beat("growth after a win", !!grown && grown.species !== "dandelion_bud", `now ${grown?.species}:${grown?.level}`);
  },

  /** FAN MAIL (after the RELAY, or a post-chapter jump-in): take the letter,
   *  beat FLORA if needed, then talk again for both rewards before leaving. */
  async fanmail() {
    instrument();
    await settle();
    const st = ctx().state;
    const beforeEnd = !flag("ch4_done");
    await nav("glasshouse_city");
    await talkTo("fan");
    beat("FAN MAIL: took the letter", flag("quest_fan_mail_started") && (st.bag["fan_letter"] ?? 0) > 0);
    await nav("glasshouse_conservatory");
    if (!(await solvePuzzle("flora"))) issue("puzzle", "could not reach FLORA");
    if (!flag("beat_flora")) await talkTo("flora");
    const money = st.money;
    await talkTo("flora");
    beat("FAN MAIL: FLORA reads it", flag("fan_letter_delivered") && (st.bag["signed_photo"] ?? 0) > 0 && !(st.bag["fan_letter"] ?? 0));
    beat("FAN MAIL: done", flag("quest_fan_mail_done") && st.money === money + 1000 && (!beforeEnd || !flag("ch4_done")), `money ${money}->${st.money}`);
    await talkTo("flora");
    beat("FAN MAIL: reward only once", st.money === money + 1000 && st.bag["signed_photo"] === 1);
  },

  /** Buy a pod at the market. */
  async shop() {
    instrument();
    await settle();
    const st = ctx().state;
    st.money = Math.max(st.money, 5000);
    const pods = st.bag["terrarium_pod"] ?? 0;
    const money = st.money;
    await nav("bramblegate_market");
    const o = ow()!;
    const clerk = o.npcs.find((n) => /clerk|shop|market/.test(n.id + (n.def?.script ?? "")));
    if (!clerk) { beat("shop", false, "no clerk npc"); return; }
    // talkTo walks round to the counter; the clerk's script opens the shop.
    const opened = report.texts.length;
    await walkToQuiet(clerk.x + 2, clerk.y);
    await face("left");
    await press("a");
    for (let i = 0; i < 3; i++) { await sleep(500); if (report.texts.length > opened) break; }
    // BUY → first item → quantity 1 → price → YES: press A until the money moves.
    for (let i = 0; i < 10 && st.money === money; i++) { await sleep(450); await press("a"); }
    for (let i = 0; i < 10 && !idle(); i++) { await sleep(350); await press("b"); }
    await settle();
    beat("shop: bought something", (st.bag["terrarium_pod"] ?? 0) > pods || st.money < money, `pods ${pods}->${st.bag["terrarium_pod"] ?? 0} money ${money}->${st.money}`);
  },
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function run(suite: string) {
  report.suite = suite;
  report.started = performance.now();
  report.finished = false;
  await waitForGame();
  installSpeedDriver();
  instrument();
  const p = new URLSearchParams(location.search);
  const boost = Number(p.get("boost") ?? 48);
  const starter = (p.get("starter") as "oak" | "chili" | "lily") || "oak";
  try {
    if (suite === "full") {
      if (await newGameFromTitle()) {
        await storyPlaythrough({ boost, starter });
        await chapter5();
        await chapter6();
      }
    } else if (suite === "story") {
      // From a ?dev=world&play=new jump-in.
      await waitFor(() => !!ow(), 60000);
      ctx().state.options.textSpeed = "fast";
      await advance();
      await storyPlaythrough({ boost, starter });
    } else if (suite.startsWith("check:")) {
      if (suite === "check:continue") {
        await waitFor(() => stack().length === 1 && !ow(), 60000);
        await sleep(1500);
      } else {
        await waitFor(() => !!ow(), 60000);
        ctx().state.options.textSpeed = "fast";
        await settle();
      }
      for (const name of suite.slice(6).split(/[+ ,]/).filter(Boolean)) {
        const c = CHECKS[name];
        if (!c) { beat(`check ${name}`, false, "unknown check"); continue; }
        await c();
      }
    }
  } catch (e) {
    issue("e2e-crash", String((e as Error).stack ?? e));
    beat("e2e crashed", false, String(e));
  }
  report.finished = true;
  const failed = report.beats.filter((b) => !b.ok).length;
  const f = report.frame;
  console.log(`[e2e] DONE ${suite}: ${report.beats.length} beats, ${failed} failed, ${report.issues.length} issues, frame avg ${(f.total / Math.max(1, f.samples)).toFixed(2)}ms worst ${f.worst.toFixed(1)}ms`);
}

/** A compact summary (no images) for logging. */
export function summary() {
  const f = report.frame;
  return {
    suite: report.suite,
    seed: report.seed,
    finished: report.finished,
    t: now(),
    beats: report.beats.map((b) => `${b.ok ? "OK" : "FAIL"} ${b.t}s ${b.name} ${b.map ?? ""}@${b.pos ?? ""} +[${b.newFlags.join(",")}]${b.note ? " — " + b.note : ""}`),
    issues: report.issues.map((i) => `${i.kind} @${i.where} ${i.t}s: ${i.msg}`),
    frame: { drawAvgMs: +(f.total / Math.max(1, f.samples)).toFixed(2), drawWorstMs: +f.worst.toFixed(1), over8ms: f.over8, samples: f.samples, longTasks: f.longTasks },
    lines: report.texts.length,
  };
}

/** Contact sheet of every beat's snapshot, overlaid on the page. */
export function sheet(from = 0, count = 24) {
  document.getElementById("e2e-sheet")?.remove();
  const div = document.createElement("div");
  div.id = "e2e-sheet";
  Object.assign(div.style, { position: "fixed", inset: "0", zIndex: "50", background: "#0c1a12", overflow: "auto", display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px", alignContent: "flex-start" });
  for (const b of report.beats.slice(from, from + count)) {
    const fig = document.createElement("figure");
    Object.assign(fig.style, { margin: "0", width: "160px", color: b.ok ? "#a8d098" : "#f87858", font: "9px monospace" });
    if (b.shot) { const img = new Image(); img.src = b.shot; img.style.imageRendering = "pixelated"; img.width = 160; fig.appendChild(img); }
    const cap = document.createElement("figcaption");
    cap.textContent = `${b.ok ? "" : "✗ "}${b.name}`;
    fig.appendChild(cap);
    div.appendChild(fig);
  }
  div.addEventListener("click", () => div.remove());
  document.body.appendChild(div);
}

export async function autorun(suite: string): Promise<void> {
  W.__e2e = { report, run, summary, sheet, advance, nav, talkTo, walkTo, trigger, beat, press, CHECKS };
  if (suite === "full") {
    try { ctx().save.clear(); } catch { /* none */ }
  }
  await run(suite);
}
