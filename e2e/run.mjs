import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";
import { build, createServer, preview } from "vite";

// By default the playthrough plays the production pipeline: `vite build --mode
// e2e` (the real bundling, chunking, minification and relative base, plus the
// test hooks that src/engine/testHooks.ts enables only in this mode) into its
// own folder, served by `vite preview`. `--dev` plays the dev server instead
// (quicker to iterate on), and `--no-build` reuses the last e2e build.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONFIG = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const E2E_OUT_DIR = "dist-e2e";

const args = process.argv.slice(2);
let speed = 8;
let seed = 1;
let headed = false;
let dev = false;
let reuseBuild = false;
let allowTodo = false; // --allow-placeholders: tolerate TODO(text) dialogue (the chapter branches, until the writing pass)
let timeoutMin = 0;
let reportFile = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--headed") headed = true;
  else if (args[i] === "--dev") dev = true;
  else if (args[i] === "--no-build") reuseBuild = true;
  else if (args[i] === "--allow-placeholders") allowTodo = true;
  else if (args[i] === "--timeout-min" && /^\d+$/.test(args[i + 1] ?? "")) timeoutMin = Number(args[++i]);
  else if (args[i] === "--speed" && /^\d+$/.test(args[i + 1] ?? "")) speed = Number(args[++i]);
  else if (args[i] === "--seed" && /^\d+$/.test(args[i + 1] ?? "")) seed = Number(args[++i]);
  else if (args[i] === "--report" && args[i + 1]) reportFile = args[++i]; // parallel runs: write elsewhere
  else {
    console.error("Usage: npm run e2e -- [--dev | --no-build] [--speed N] [--seed N] [--headed] [--allow-placeholders] [--timeout-min N] [--report PATH] (speed: 1–16; seed: 0–4294967295)");
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
const timeoutMs = timeoutMin ? timeoutMin * 60_000 : Math.max(75 * 60_000, 360 * 60_000 / speed);
const reportPath = reportFile ? new URL(reportFile, `file://${process.cwd()}/`) : new URL("./last-report.json", import.meta.url);
const abort = new AbortController();
let server;
let browser;
let page;
let report;
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
    console.log(`${b.ok ? "OK  " : "FAIL"} ${b.t}s ${b.name}${b.note ? ` — ${b.note}` : ""}`);
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

try {
  const target = dev ? "dev server" : `production build (${E2E_OUT_DIR}/)`;
  console.log(`Full playthrough: ${target}, speed=${speed}, seed=${seed}, time=day, ${headed ? "headed" : "headless"}`);
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
  const url = `http://127.0.0.1:${address.port}/?e2e=full&timer&speed=${speed}&seed=${seed}&time=day${allowTodo ? "&allowTodo" : ""}`;
  console.log(`Game: ${url}`);
  browser = await chromium.launch({ headless: !headed });
  abort.signal.throwIfAborted();
  page = await browser.newPage();
  // Catch boot errors too, before the in-game instrumentation is installed.
  page.on("pageerror", (error) => runnerIssues.push(error.stack ?? String(error)));
  await page.goto(url);
  while (true) {
    abort.signal.throwIfAborted();
    report = await page.evaluate(() => window.__e2e?.report ?? null);
    if (report) printProgress(report);
    if (report?.finished) break;
    if (performance.now() - started > timeoutMs) throw new Error(`Playthrough timed out after ${timeoutMs / 60_000} minutes`);
    await sleep(1000, undefined, { signal: abort.signal });
  }
  const failures = report.beats.filter((b) => !b.ok).length;
  if (report.beats.length !== 218) runnerIssues.push(`Expected all 218 beats; received ${report.beats.length}`);
  process.exitCode = failures === 0 && report.issues.length === 0 && runnerIssues.length === 0 ? 0 : 1;
} catch (error) {
  runnerIssues.push(error.stack ?? String(error));
  process.exitCode ||= 1;
  // Preserve the last available game report on crashes, timeouts or Ctrl-C.
  if (page && !page.isClosed()) {
    try { report = await page.evaluate(() => window.__e2e?.report ?? null) ?? report; } catch { /* page crashed */ }
  }
} finally {
  const elapsedSeconds = Math.round((performance.now() - started) / 100) / 10;
  report ??= { suite: "full", finished: false, beats: [], issues: [], texts: [] };
  printProgress(report);
  for (const issue of runnerIssues) console.error(`RUNNER ISSUE: ${issue}`);
  report.seed = seed;
  report.runner = { target: dev ? "dev" : "production", speed, seed, time: "day", headed, elapsedSeconds, issues: runnerIssues };
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
