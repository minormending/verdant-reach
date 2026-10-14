import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";
import { build, createServer, preview } from "vite";
import { SMOKE_BEATS, SMOKE_PHASES, checkPages } from "./smoke-plan.mjs";

// By default the playthrough plays the production pipeline: `vite build --mode
// e2e` (the real bundling, chunking, minification and relative base, plus the
// test hooks that src/engine/testHooks.ts enables only in this mode) into its
// own folder, served by `vite preview`. `--dev` plays the dev server instead
// (quicker to iterate on), and `--no-build` reuses the last e2e build.
// `--smoke` plays the smoke suite instead of the full playthrough: one page
// load per phase of e2e/smoke-plan.mjs (e2e/smoke.ts in the page), then the
// other pages; it gates deploys, while the full playthrough runs nightly.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONFIG = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const E2E_OUT_DIR = "dist-e2e";

const args = process.argv.slice(2);
let speed = 8;
let seed = 1;
let headed = false;
let dev = false;
let reuseBuild = false;
let smoke = false;
let allowTodo = false; // --allow-placeholders: tolerate TODO(text) dialogue (the chapter branches, until the writing pass)
let timeoutMin = 0;
let reportFile = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--headed") headed = true;
  else if (args[i] === "--dev") dev = true;
  else if (args[i] === "--no-build") reuseBuild = true;
  else if (args[i] === "--smoke") smoke = true;
  else if (args[i] === "--allow-placeholders") allowTodo = true;
  else if (args[i] === "--timeout-min" && /^\d+$/.test(args[i + 1] ?? "")) timeoutMin = Number(args[++i]);
  else if (args[i] === "--speed" && /^\d+$/.test(args[i + 1] ?? "")) speed = Number(args[++i]);
  else if (args[i] === "--seed" && /^\d+$/.test(args[i + 1] ?? "")) seed = Number(args[++i]);
  else if (args[i] === "--report" && args[i + 1]) reportFile = args[++i]; // parallel runs: write elsewhere
  else {
    console.error("Usage: npm run e2e -- [--smoke] [--dev | --no-build] [--speed N] [--seed N] [--headed] [--allow-placeholders] [--timeout-min N] [--report PATH] (speed: 1–16; seed: 0–4294967295)");
    process.exit(1);
  }
}
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
  console.error("--seed must be an integer from 0 to 4294967295");
  process.exit(1);
}
if (dev && reuseBuild) {
  console.error("--dev plays the dev server; --no-build applies only to the production build");
  process.exit(1);
}
if (!Number.isInteger(speed) || speed < 1 || speed > 16) {
  console.error("--speed must be an integer from 1 to 16");
  process.exit(1);
}

const started = performance.now();
// The full suite grows each chapter (218 beats through the post-game), including
// real catches, field puzzles, the Elder retry and a Council whiteout/restart.
// Allow room for alternate seeds, the legendary catch and thirteen Council battles, plus the Vault and Wanderer search.
// The smoke suite takes a few minutes; its limit (20) stays below its CI job's (30).
const timeoutMs = timeoutMin ? timeoutMin * 60_000 : smoke ? 20 * 60_000 : Math.max(75 * 60_000, 360 * 60_000 / speed);
const suiteName = smoke ? "smoke" : "full";
const reportPath = reportFile ? new URL(reportFile, `file://${process.cwd()}/`)
  : new URL(smoke ? "./last-smoke-report.json" : "./last-report.json", import.meta.url);
const abort = new AbortController();
let server;
let browser;
let page;
let report;
let smokeReport = null; // --smoke: the phases' reports combined
let livePhase = null;
let printed = 0;
let printedIssues = 0;
let printedWarnings = 0;
const runnerIssues = [];
const interrupt = (signal) => {
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  abort.abort(new Error(`Interrupted by ${signal}`));
};
const onSigint = () => interrupt("SIGINT");
const onSigterm = () => interrupt("SIGTERM");
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);

function printProgress(current) {
  for (const b of current.beats.slice(printed)) {
    const phase = b.phase ?? livePhase;
    console.log(`${b.ok ? "OK  " : "FAIL"} ${b.t}s ${phase ? `[${phase}] ` : ""}${b.name}${b.note ? ` — ${b.note}` : ""}`);
  }
  printed = current.beats.length;
  for (const issue of current.issues.slice(printedIssues)) {
    console.error(`ISSUE ${issue.kind} ${issue.t}s @${issue.where ?? "?"}: ${issue.msg}`);
  }
  printedIssues = current.issues.length;
  // Warnings (a whiteout before a retried must-win fight) are reported, never failures.
  const warnings = current.warnings ?? [];
  for (const warning of warnings.slice(printedWarnings)) {
    console.log(`WARN ${warning.kind} ${warning.t}s @${warning.where ?? "?"}: ${warning.msg}`);
  }
  printedWarnings = warnings.length;
}

/** Load one game URL and poll its in-page report until the suite finishes. */
async function play(url) {
  printed = 0;
  printedIssues = 0;
  await page.goto(url);
  let current = null;
  while (true) {
    abort.signal.throwIfAborted();
    current = await page.evaluate(() => window.__e2e?.report ?? null);
    if (current) printProgress(current);
    if (current?.finished) return current;
    if (performance.now() - started > timeoutMs) throw new Error(`${smoke ? "Smoke test" : "Playthrough"} timed out after ${timeoutMs / 60_000} minutes`);
    await sleep(1000, undefined, { signal: abort.signal });
  }
}

/** Smoke: fold one phase's in-page report into the combined report, tagging its beats and issues. */
function mergePhase(name, part) {
  const tag = (x) => ({ ...x, phase: name });
  smokeReport.beats.push(...part.beats.map(tag));
  smokeReport.issues.push(...part.issues.map(tag));
  smokeReport.texts.push(...(part.texts ?? []).map(tag));
  smokeReport.battles.push(...(part.battles ?? []).map(tag));
  smokeReport.phases.push({ name, finished: !!part.finished, beats: part.beats.length, seconds: part.beats.at(-1)?.t ?? 0, frame: part.frame });
  printed = smokeReport.beats.length;
  printedIssues = smokeReport.issues.length;
}

try {
  const target = dev ? "dev server" : `production build (${E2E_OUT_DIR}/)`;
  console.log(`${smoke ? "Smoke test" : "Full playthrough"}: ${target}, speed=${speed}, seed=${seed}, time=day, ${headed ? "headed" : "headless"}`);
  // Port 0 lets the OS pick a free port. Vite's API keeps the server in this
  // process: cleanup cannot target someone else's server.
  if (dev) {
    server = await createServer({
      configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
      server: { host: "127.0.0.1", port: 0, open: false },
    });
    await server.listen();
  } else {
    if (!reuseBuild) {
      console.log(`Building: vite build --mode e2e --outDir ${E2E_OUT_DIR}`);
      await build({ root: ROOT, configFile: CONFIG, mode: "e2e", logLevel: "warn", build: { outDir: E2E_OUT_DIR, emptyOutDir: true } });
      abort.signal.throwIfAborted();
    }
    server = await preview({
      root: ROOT, configFile: CONFIG, mode: "e2e", logLevel: "warn",
      build: { outDir: E2E_OUT_DIR },
      preview: { host: "127.0.0.1", port: 0, open: false },
    });
  }
  abort.signal.throwIfAborted();
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Vite did not bind a TCP port");
  const origin = `http://127.0.0.1:${address.port}`;
  const gameUrl = (suite) => `${origin}/?e2e=${suite}&timer&speed=${speed}&seed=${seed}&time=day${allowTodo ? "&allowTodo" : ""}`;
  browser = await chromium.launch({ headless: !headed });
  abort.signal.throwIfAborted();
  page = await browser.newPage();
  // Catch boot errors too, before the in-game instrumentation is installed.
  page.on("pageerror", (error) => runnerIssues.push(error.stack ?? String(error)));
  if (!smoke) {
    const url = gameUrl("full");
    console.log(`Game: ${url}`);
    report = await play(url);
    if (report.beats.length !== 218) runnerIssues.push(`Expected all 218 beats; received ${report.beats.length}`);
  } else {
    // The smoke test also fails on a console error while the game boots (the
    // in-game instrumentation only starts once the title is up).
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().startsWith("[e2e]")) runnerIssues.push(`console error in the game: ${m.text()}`);
    });
    smokeReport = { suite: "smoke", seed, finished: false, beats: [], issues: [], notes: [], texts: [], battles: [], phases: [] };
    for (const phase of SMOKE_PHASES) {
      const url = gameUrl(`smoke:${phase.name}`);
      console.log(`Phase ${phase.name}: ${url}`);
      livePhase = phase.name;
      const part = await play(url);
      mergePhase(phase.name, part);
      livePhase = null;
      if (part.beats.length !== phase.beats) runnerIssues.push(`Phase ${phase.name}: expected ${phase.beats} beats; received ${part.beats.length}`);
    }
    console.log("Pages: the guidebook, the Tile Lab, the developer docs and the Trainer Editor");
    await checkPages(browser, origin, { started, beats: smokeReport.beats, issues: smokeReport.issues, notes: smokeReport.notes });
    smokeReport.finished = true;
    report = smokeReport;
    if (report.beats.length !== SMOKE_BEATS) runnerIssues.push(`Expected all ${SMOKE_BEATS} smoke beats; received ${report.beats.length}`);
  }
  const failures = report.beats.filter((b) => !b.ok).length;
  process.exitCode = failures === 0 && report.issues.length === 0 && runnerIssues.length === 0 ? 0 : 1;
} catch (error) {
  runnerIssues.push(error.stack ?? String(error));
  process.exitCode ||= 1;
  // Preserve the last available game report on crashes, timeouts or Ctrl-C.
  if (page && !page.isClosed()) {
    try {
      const live = await page.evaluate(() => window.__e2e?.report ?? null);
      if (smokeReport && livePhase && live) mergePhase(livePhase, live);
      else report = live ?? report;
    } catch { /* page crashed */ }
  }
  if (smokeReport) report = smokeReport;
} finally {
  const elapsedSeconds = Math.round((performance.now() - started) / 100) / 10;
  report ??= { suite: suiteName, finished: false, beats: [], issues: [], texts: [] };
  printProgress(report);
  for (const issue of runnerIssues) console.error(`RUNNER ISSUE: ${issue}`);
  report.seed = seed;
  report.runner = { suite: suiteName, target: dev ? "dev" : "production", speed, seed, time: "day", headed, elapsedSeconds, issues: runnerIssues };
  try {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report: ${fileURLToPath(reportPath)}`);
  } catch (error) {
    console.error(`Could not write report: ${error}`);
    process.exitCode ||= 1;
  }
  console.log(`${report.beats.length} beats, ${report.beats.filter((b) => !b.ok).length} failed, ${report.issues.length + runnerIssues.length} issues, ${report.warnings?.length ?? 0} warnings; total ${elapsedSeconds}s`);
  // Close only resources created above; attempt both even if one close fails.
  const cleanup = await Promise.allSettled([browser?.close(), server?.close()]);
  for (const result of cleanup) {
    if (result.status === "rejected") { console.error(`Cleanup failed: ${result.reason}`); process.exitCode ||= 1; }
  }
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
}
