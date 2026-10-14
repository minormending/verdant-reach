// The smoke suite (`npm run e2e:smoke`): the game's most important paths in a
// few minutes, on the same production e2e build, driver and helpers as the full
// playthrough (e2e/playthrough.ts). It gates every game deploy; the full
// playthrough runs nightly (.github/workflows/playthrough.yml).
//
// e2e/run.mjs --smoke loads the game once per phase (`?e2e=smoke:<phase>`, the
// list and beat counts are in e2e/smoke-plan.mjs) in one browser tab, so the
// save survives from one phase to the next like a real reload:
//
//   story     clear the save; title; NEW GAME (BOY, BASIL), the prologue, the
//             starter, FENNIMORE, PIP's demo, the theft, rival battle 1 (won);
//             SAVE through START > SAVE
//   continue  reload; CONTINUE from the title; the state matches the saved one
//   rematch   prepared state (e2e/fixtures.ts): MILO beaten; win his rematch at +1
//   leader    prepared state: at the BRAMBLEGATE CONSERVATORY door; HOLLIS won
//   whiteout  prepared state: a lone Lv 5 starter loses and wakes at the heal point
//
// Prepared states come from e2e/fixtures.ts, written with the game's save code
// and loaded through CONTINUE. The runner then opens the other pages.

import { CHECKS, beat, instrument, installSpeedDriver, nav, report, talkTo, trigger } from "./playthrough";
import {
  boostParty, counter, ctx, expectFlag, flag, newGameFromTitle, ow, rematchRoute1, settle, sleep, solvePuzzle, stack, waitFor,
  waitForGame,
} from "./playthrough";
import { buildFixture, FIXTURES, type FixtureName } from "./fixtures";
import type { GameState } from "../src/contracts";
import { devSeed, randomStream } from "../src/engine/random";

const STARTER = "oak";
/** The story phase's state at SAVE, for the continue phase (sessionStorage survives the reload). */
const DIGEST_KEY = "verdant-reach-e2e-smoke-digest";
const seed = devSeed();
const fixtureRng = seed === null ? () => ctx().rng() : randomStream(seed, "e2e:smoke-fixtures");
const boost = () => Number(new URLSearchParams(location.search).get("boost") ?? 48);

/** What CONTINUE must restore (play time and options aside). */
export function digest(st: GameState) {
  return {
    player: [st.playerName, st.playerLook, st.rivalName],
    money: st.money,
    position: st.position,
    heal: st.heal,
    party: st.party.map((q) => `${q.species}:${q.level}:${q.hp}/${q.exp}:${q.moves.map((m) => m.id).join("+")}`),
    box: st.box.length,
    bag: Object.entries(st.bag).filter(([, n]) => n > 0).sort(([a], [b]) => (a < b ? -1 : 1)),
    flags: Object.keys(st.flags).filter((f) => st.flags[f]).sort(),
    marks: st.marks,
    herbarium: [st.herbarium.seen.length, st.herbarium.caught.length],
    rematches: st.trainerRematches ?? {},
  };
}

async function story() {
  if (!(await newGameFromTitle())) return;
  await nav("herbarium");
  await settle();
  await talkTo("vale_gh");
  beat("vale in the greenhouse");
  await talkTo(`pot_${STARTER}`);
  await settle();
  await expectFlag(`starter: ${STARTER}`, "got_starter");
  boostParty(boost());
  await nav("fennimore_house");
  await talkTo("fennimore");
  await expectFlag("fennimore gives the seed", "got_seed");
  await nav("fallowfield");
  if (!flag("pip_demo_done")) {
    await nav("route_1");
    await trigger("pip_demo");
    await nav("fallowfield");
  }
  await expectFlag("pip's catching demo", "pip_demo_done");
  await nav("herbarium");
  await settle();
  await expectFlag("theft at the herbarium", "theft_seen");
  await nav("fallowfield");
  await settle();
  if (!flag("rival_1_done")) {
    const o = ow()!;
    if (o.npcs.some((n) => n.id === "bram" && o.visible(n))) await talkTo("bram");
  }
  await expectFlag("rival battle 1 won", `beat_rival_1_${counter(STARTER)}`, `rival_1_done=${flag("rival_1_done")}`);
  await CHECKS.save();
  sessionStorage.setItem(DIGEST_KEY, JSON.stringify(digest(ctx().state)));
}

async function continueSaved() {
  const saved = sessionStorage.getItem(DIGEST_KEY);
  await CHECKS.continue();
  const now = JSON.stringify(digest(ctx().state));
  const differs = saved ? Object.keys(JSON.parse(saved)).filter((k) => JSON.stringify(JSON.parse(saved)[k]) !== JSON.stringify(JSON.parse(now)[k])) : [];
  beat("CONTINUE restores the saved state", !!saved && saved === now, saved ? (differs.length ? `differs: ${differs.join(", ")}` : undefined) : "no digest from the story phase");
}

/** Write a prepared state with the game's save code, then load it through the title's CONTINUE. */
async function fromFixture(name: FixtureName) {
  const st = buildFixture(ctx(), name, fixtureRng);
  // CHECKS.continue looks for the e2e's own marker flag in the loaded game.
  st.flags.e2e_marker = true;
  ctx().state = st;
  if (!ctx().save.write()) throw new Error(`fixture ${name}: the save did not write`);
  await CHECKS.continue();
  beat(`fixture ${name}: ${FIXTURES[name].about}`, ow()?.mapId === st.position.map
    && FIXTURES[name].flags.every((f) => flag(f)) && ctx().state.party.length === st.party.length,
  `at ${ow()?.mapId}@${ow()?.player.x},${ow()?.player.y} party=${ctx().state.party.map((q) => `${q.species}:${q.level}`).join(",")}`);
  ctx().state.options.textSpeed = "fast";
}

const PHASES: Record<string, () => Promise<void>> = {
  story,
  continue: continueSaved,
  async rematch() {
    await fromFixture("rematch");
    boostParty(boost());
    await rematchRoute1();
  },
  async leader() {
    await fromFixture("leader");
    boostParty(boost());
    if (!(await solvePuzzle("hollis"))) beat("reach HOLLIS", false, "the conservatory puzzle did not open a path");
    await talkTo("hollis");
    const marks = ctx().state.marks;
    await expectFlag("HOLLIS won: bramble mark", "beat_hollis", `marks=${JSON.stringify(marks)}`);
  },
  async whiteout() {
    await fromFixture("whiteout");
    await CHECKS.whiteout();
  },
};

/** Run one phase (`smoke:<phase>`); the runner reads `window.__e2e.report`. */
export async function autorun(suite: string): Promise<void> {
  const phase = suite.slice("smoke:".length);
  (window as unknown as { __e2e: unknown }).__e2e = { report, digest };
  report.suite = suite;
  report.started = performance.now();
  report.finished = false;
  if (phase === "story") {
    try { ctx().save.clear(); } catch { /* none */ }
    sessionStorage.removeItem(DIGEST_KEY);
  }
  await waitForGame();
  installSpeedDriver();
  instrument();
  try {
    const run = PHASES[phase];
    if (!run) beat(`smoke phase ${phase}`, false, "unknown phase");
    else {
      // Every phase starts at the title screen.
      await waitFor(() => stack().length === 1 && !ow(), 60000);
      await sleep(1500);
      await run();
    }
  } catch (e) {
    beat(`smoke ${phase} crashed`, false, String((e as Error).stack ?? e));
  }
  report.finished = true;
  console.log(`[e2e] DONE ${suite}: ${report.beats.length} beats, ${report.beats.filter((b) => !b.ok).length} failed, ${report.issues.length} issues`);
}
