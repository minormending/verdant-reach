// Automated end-to-end playthrough of the slice, run in the browser against
// the dev server (it drives the dev-only `window.__t` driver).
//
//   npx vite --config e2e/vite.config.ts --port 5190 --strictPort
//   open  http://localhost:5190/?timer&e2e=full           new game -> TO BE CONTINUED
//         http://localhost:5190/?timer&e2e=check:<name>   targeted checks (see CHECKS)
//
// `?timer` keeps the loop running in a hidden tab. Add `&boost=<level>` to set
// the level of the over-levelled helper (default 48; `boost=0` plays it
// straight with only the starter) and `&starter=oak|chili|lily`.
//
// Progress goes to the console ("[e2e]") and to `window.__e2e.report`; every
// beat records the new flags, the map and a 160x144 snapshot.
// `window.__e2e.sheet()` shows the snapshots as a contact sheet.

import type { GameContext, MapId, Scene, SceneStack, SpeciesId, TimeOfDay } from "../src/contracts";
import { createQuickened, healParty } from "../src/battle";
import { rollEncounter } from "../src/overworld/encounters";

// ---------------------------------------------------------------------------
// Handles on the running game
// ---------------------------------------------------------------------------

type Dir = "up" | "down" | "left" | "right";
interface Actor { id: string; x: number; y: number; facing: Dir; sprite: string; def?: { script?: string; trainer?: string; sprite?: string } }
interface Ow {
  mapId: MapId;
  busy: number;
  player: Actor & { step: unknown };
  npcs: Actor[];
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
const stack = () => VR().scenes.all();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isOw = (s: unknown): s is Ow => !!s && typeof s === "object" && "mapId" in s && "player" in s;
const ow = (): Ow | null => { const s = stack()[0]; return isOw(s) ? s : null; };
const idle = () => { const o = ow(); return !!o && o.busy === 0 && stack().length === 1; };

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
    const ui = (sc as unknown as { ui?: Record<string, unknown> & { __e2e?: boolean } }).ui;
    if (!ui || ui.__e2e || typeof ui.say !== "function") continue;
    ui.__e2e = true;
    const say = (ui.say as (...a: unknown[]) => Promise<unknown>).bind(ui);
    ui.say = (text: unknown, ...rest: unknown[]) => {
      const t = String(text);
      report.texts.push({ t: now(), map: ow()?.mapId, text: `[battle] ${t}` });
      checkText(t);
      return say(text, ...rest);
    };
    if (typeof ui.yesNo === "function") {
      const yn = (ui.yesNo as (...a: unknown[]) => Promise<unknown>).bind(ui);
      ui.yesNo = (prompt: unknown, ...rest: unknown[]) => {
        const p = String(prompt);
        report.texts.push({ t: now(), map: ow()?.mapId, text: `[battle?] ${p}` });
        const rule = answers.find(([re]) => re.test(p));
        pendingNo = rule ? !rule[1] : false;
        return yn(prompt, ...rest).then((r) => { pendingNo = false; return r; });
      };
    }
  }
}
let pendingNo = false;
let expectName = false;
let instrumented = false;

function instrument() {
  if (instrumented) return;
  instrumented = true;
  const ui = ctx().ui as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const say = ui.say.bind(ui);
  ui.say = (text: unknown, opts?: unknown) => {
    const t = String(text);
    const speaker = (opts as { speaker?: string } | undefined)?.speaker;
    report.texts.push({ t: now(), map: ow()?.mapId, text: t, speaker });
    checkText(t, speaker);
    return say(text, opts).then((r) => {
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
    return yesNo(prompt).then((r) => { pendingNo = false; return r; });
  };
  const choose = ui.choose.bind(ui);
  ui.choose = (options: unknown, opts?: unknown) => {
    report.texts.push({ t: now(), map: ow()?.mapId, text: `[menu] ${(options as string[]).join(" / ")}` });
    return choose(options, opts);
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
      });
    }
    fill(x, y, w, h);
  };
  // Long tasks (>50 ms) are visible hitches whatever the cause.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { report.frame.longTasks++; if (e.duration > 120) issue("long-task", `${Math.round(e.duration)}ms`); }
    }).observe({ type: "longtask", buffered: false });
  } catch { /* unsupported */ }
}

function safeJson(a: unknown) { try { return JSON.stringify(a); } catch { return String(a); } }

const COLS = 18;
function checkText(text: string, speaker?: string) {
  // Unbreakable words longer than a text-box line overflow the box.
  const flat = text.replace(/<PLAYER>|\{PLAYER\}/g, "ROWAN").replace(/<RIVAL>|\{RIVAL\}/g, "BRAM");
  for (const w of flat.split(/\s+/)) if (w.length > COLS) issue("text-overflow", `"${w}" (${w.length} cols) in: ${text}`);
  if (/\b(TODO|FIXME|lorem|placeholder|undefined|null)\b|\bNaN\b|\[object/.test(flat) || /\b(todo|fixme|lorem ipsum)\b/i.test(flat)) issue("text-placeholder", `${speaker ?? ""}: ${text}`);
  if (/<[A-Z]+>|\{[A-Z]+\}/.test(text.replace(/<PLAYER>|\{PLAYER\}|<RIVAL>|\{RIVAL\}/g, ""))) issue("text-token", text);
  if (speaker && speaker !== speaker.toUpperCase()) issue("text-style", `speaker not upper-case: ${speaker}`);
}

// ---------------------------------------------------------------------------
// Low-level driving
// ---------------------------------------------------------------------------

const KEY = { a: "KeyZ", b: "KeyX", start: "Enter", select: "ShiftLeft", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" } as const;
export const press = (k: keyof typeof KEY, ms = 90) => T().hold(KEY[k], ms);

/** Mash through text, menus and battles until the overworld is idle again. */
export async function advance(maxPresses = 400, done: () => boolean = idle): Promise<boolean> {
  let stuck = 0;
  let lastSig = "";
  for (let i = 0; i < maxPresses; i++) {
    await sleep(120);
    if (done()) { await sleep(150); if (done()) return true; }
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
    await press(pendingNo ? "b" : "a");
    // Soft-lock detector: same stack, map and position for a long time.
    const o = ow();
    const sig = `${stack().length}|${o?.mapId}|${o?.player.x},${o?.player.y}|${o?.busy}|${report.texts.length}`;
    stuck = sig === lastSig ? stuck + 1 : 0;
    lastSig = sig;
    if (stuck === 60) issue("soft-lock?", `no progress for 60 presses (${sig})`);
  }
  issue("advance-timeout", `still busy after ${maxPresses} presses`);
  return false;
}

async function settle() {
  if (!idle()) await advance();
}

/** Walk to a tile, fighting through anything that interrupts. */
export async function walkTo(x: number, y: number, tries = 25): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await settle();
    const o = ow();
    if (!o) return false;
    if (o.player.x === x && o.player.y === y) return true;
    const mapBefore = o.mapId;
    const r = await T().goto(x, y);
    if (ow()?.mapId !== mapBefore) return true; // a warp or script moved us on
    if (r === "ok") { await settle(); return true; }
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

/** Talk to an NPC by id (walks next to it, or across a counter). */
export async function talkTo(id: string, quiet = false): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await settle();
    const o = ow();
    if (!o) return false;
    const here = o.mapId;
    const n = o.npcs.find((a) => a.id === id);
    if (!n || !o.visible(n)) { issue("missing-npc", `no visible npc "${id}" on ${here}`); return false; }
    const spots: [number, number, Dir][] = [];
    for (const d of ["down", "left", "right", "up"] as Dir[]) {
      const [dx, dy] = DIRS[d];
      spots.push([n.x + dx, n.y + dy, OPP[d]]);
      spots.push([n.x + dx * 2, n.y + dy * 2, OPP[d]]); // across a counter
    }
    const p = o.player;
    spots.sort((s, t) => Math.abs(s[0] - p.x) + Math.abs(s[1] - p.y) - (Math.abs(t[0] - p.x) + Math.abs(t[1] - p.y)));
    for (const [x, y, d] of spots) {
      const r = await walkToQuiet(x, y);
      if (!r) continue;
      const q = ow()!;
      if (q.mapId !== here) return false;
      const m = q.npcs.find((a) => a.id === id)!;
      // Only adjacent, or two away with a counter between.
      const dist = Math.abs(m.x - q.player.x) + Math.abs(m.y - q.player.y);
      if (dist > 2) break; // it moved: retry
      await face(d);
      const before = report.texts.length;
      await press("a");
      await sleep(250);
      if (!idle() || report.texts.length > before) { await advance(); return true; }
    }
  }
  if (!quiet) issue("talk-failed", `could not talk to "${id}"`);
  return false;
}

async function walkToQuiet(x: number, y: number) {
  const o = ow();
  if (!o) return false;
  if (o.player.x === x && o.player.y === y) return true;
  const r = await T().goto(x, y);
  if (r === "ok") { await settle(); return true; }
  if (r.startsWith("interrupted")) { await settle(); return walkToQuiet(x, y); }
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
      const q = ow()!;
      if (q.player.x !== w.x || q.player.y !== w.y) continue;
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

/** Step on a trigger tile (by script id) on the current map. */
export async function trigger(script: string): Promise<boolean> {
  const o = ow();
  const tr = o?.map.def.triggers.find((t) => t.script === script);
  if (!o || !tr) { issue("trigger", `no trigger "${script}" on ${o?.mapId}`); return false; }
  const cells: [number, number][] = [];
  for (let dy = 0; dy < (tr.h ?? 1); dy++) for (let dx = 0; dx < (tr.w ?? 1); dx++) cells.push([tr.x + dx, tr.y + dy]);
  for (const [x, y] of cells) {
    // Step off and back on if we're standing on it.
    if (o.player.x === x && o.player.y === y) continue;
    if (await walkTo(x, y)) { await settle(); return true; }
  }
  return false;
}

const flag = (f: string) => !!ctx().state.flags[f];

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
  try { q = createQuickened(ctx().data, species, level, Math.random); } catch {
    q = createQuickened(ctx().data, st.party[0]?.species ?? ("oak_acorn" as SpeciesId), level, Math.random);
  }
  (q as unknown as { e2e: boolean }).e2e = true;
  // Strongest damaging move first, so mashing A ends battles quickly.
  const moves = ctx().data.moves as unknown as Record<string, { power?: number }>;
  const score = (m: { id: string; pp: number }) => (moves[m.id]?.power ?? 0) * (m.pp >= 10 ? 2 : 1);
  q.moves.sort((m1, m2) => score(m2) - score(m1));
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
      const r = await T().goto(n.x + dx * k, n.y + dy * k);
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

  await nav("sugarbush_conservatory");
  if (!(await solvePuzzle("nell"))) issue("puzzle", "could not reach NELL");
  // NELL's talk runs the whole chain: battle, mark, VALE's call, save prompt, end card.
  await talkToUntilEnd("nell");
}

function counter(line: string) {
  return ({ oak: "chili", chili: "lily", lily: "oak" } as Record<string, string>)[line] ?? "chili";
}

/** NELL's chain ends with the TO BE CONTINUED card and the title screen. */
async function talkToUntilEnd(id: string) {
  // Walk next to NELL and start the talk.
  const o = ow()!;
  const n = o.npcs.find((a) => a.id === id);
  if (!n) { beat("nell", false, "no nell"); return; }
  await walkToQuiet(n.x, n.y + 1);
  await face("up");
  await press("a");
  // Mash until the end card is up (it plays "slice_end" over the overworld),
  // snapshot it, then press through to the title.
  let sawCard = false;
  for (let i = 0; i < 600; i++) {
    await sleep(140);
    if (!sawCard && ctx().audio.current() === "slice_end") {
      sawCard = true;
      await sleep(2200); // let it fade in from white
      beat("TO BE CONTINUED card", flag("slice_done"));
      await sleep(3000); // the card ignores input for its first 4 s
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
  beat("NELL: sundew mark", flag("beat_nell"));
  beat("back at the title", !ow() && stack().length >= 1);
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
    await o.flow(async () => {
      await o.runScript([{ op: "wildBattle", species: "sugar_maple" as SpeciesId, level: 70 }]);
    }).catch(() => {});
    await advance();
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
    for (let k = 0; k < 7 && !saved; k++) {
      await press("start");
      await sleep(500);
      for (let i = 0; i < k; i++) { await press("down", 60); await sleep(120); }
      const before = report.texts.length;
      await press("a");
      await sleep(700);
      const prompt = report.texts.slice(before).find((t) => /save the game/i.test(t.text));
      if (prompt) {
        await advance(80); // YES, (overwrite YES), SAVING..., saved
        saved = true;
      } else {
        for (let i = 0; i < 4 && !idle(); i++) { await press("b"); await sleep(400); }
      }
      await settle();
    }
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
      st.party.push(createQuickened(ctx().data, "dandelion_bud" as SpeciesId, 6, Math.random));
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
    await press("a");
    await sleep(600);
    await advance(6, () => !idle()); // the "opened the cabinet" line
    // Cabinet UI: first option is usually DEPOSIT; pick the last party member.
    for (let i = 0; i < 3; i++) { await press("a"); await sleep(400); }
    await sleep(300);
    const mid = { party: st.party.length, box: st.box.length };
    for (let i = 0; i < 8 && !idle(); i++) { await press("b"); await sleep(350); }
    await settle();
    const snap = beat("cabinet deposit", mid.party === partyBefore - 1 && mid.box === boxBefore + 1,
      `party ${partyBefore}->${mid.party}, box ${boxBefore}->${mid.box}`);
    void snap;
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
    // Battle: BAG is right of FIGHT. Pods are the first ball item.
    for (let i = 0; i < 60; i++) {
      await sleep(400);
      if (idle()) break;
      const tail = report.texts.slice(-1)[0]?.text ?? "";
      void tail;
      await press("right", 60);
      await sleep(150);
      await press("a");
      await sleep(400);
      await press("a");
      await sleep(400);
      await press("a");
    }
    await fight.catch(() => {});
    await advance();
    beat("catching with a pod", st.party.length + st.box.length > partyBefore,
      `caught ${caughtBefore}->${st.herbarium.caught.length}, pods left ${st.bag["terrarium_pod"]}`);
  },

  /** Win one battle with a Quickened one exp point short of growing. */
  async growth() {
    instrument();
    await settle();
    const st = ctx().state;
    const q = createQuickened(ctx().data, "dandelion_bud" as SpeciesId, 11, Math.random);
    // One win from level 12, where the dandelion line grows.
    const data = ctx().data as unknown as { species: Record<string, { growth?: unknown; evolves?: unknown }> };
    void data;
    st.party.unshift(q);
    healParty(st.party, ctx().data);
    const o = ow()!;
    void o.flow(async () => { await o.runScript([{ op: "wildBattle", species: "fern_fiddlehead" as SpeciesId, level: 12 }]); });
    await advance(600);
    const grown = st.party.find((p) => p === q);
    beat("growth after a win", !!grown && grown.species !== "dandelion_bud", `now ${grown?.species}:${grown?.level}`);
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
    // Talk, then: BUY, first item, A to confirm quantity, YES, then back out.
    await walkToQuiet(clerk.x, clerk.y + 2);
    await face("up");
    await press("a");
    for (let i = 0; i < 10; i++) { await sleep(300); await press("a"); }
    for (let i = 0; i < 8; i++) { await sleep(250); await press("b"); }
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
  instrument();
  const p = new URLSearchParams(location.search);
  const boost = Number(p.get("boost") ?? 48);
  const starter = (p.get("starter") as "oak" | "chili" | "lily") || "oak";
  try {
    if (suite === "full") {
      if (await newGameFromTitle()) await storyPlaythrough({ boost, starter });
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
