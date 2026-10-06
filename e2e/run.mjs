import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const args = process.argv.slice(2);
let speed = 8;
let seed = 1;
let headed = false;
let allowTodo = false; // --allow-placeholders: tolerate TODO(text) dialogue (the ch5 branch only, until the writing pass)
let timeoutMin = 0;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--headed") headed = true;
  else if (args[i] === "--allow-placeholders") allowTodo = true;
  else if (args[i] === "--timeout-min" && /^\d+$/.test(args[i + 1] ?? "")) timeoutMin = Number(args[++i]);
  else if (args[i] === "--speed" && /^\d+$/.test(args[i + 1] ?? "")) speed = Number(args[++i]);
  else if (args[i] === "--seed" && /^\d+$/.test(args[i + 1] ?? "")) seed = Number(args[++i]);
  else {
    console.error("Usage: npm run e2e -- [--speed N] [--seed N] [--headed] [--allow-placeholders] [--timeout-min N] (speed: 1–16; seed: 0–4294967295)");
    process.exit(1);
  }
}
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
  console.error("--seed must be an integer from 0 to 4294967295");
  process.exit(1);
}
if (!Number.isInteger(speed) || speed < 1 || speed > 16) {
  console.error("--speed must be an integer from 1 to 16");
  process.exit(1);
}

const started = performance.now();
// The full suite grows each chapter (73 beats through Chapter 5): about 11 min at speed 8.
const timeoutMs = timeoutMin ? timeoutMin * 60_000 : Math.max(20 * 60_000, 90 * 60_000 / speed);
const reportPath = new URL("./last-report.json", import.meta.url);
const abort = new AbortController();
let server;
let browser;
let page;
let report;
let printed = 0;
let printedIssues = 0;
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
}

try {
  console.log(`Full playthrough: speed=${speed}, seed=${seed}, time=day, ${headed ? "headed" : "headless"}`);
  // Port 0 lets the OS reserve a free port atomically. Vite's API keeps the
  // server in this process: cleanup cannot target someone else's server.
  server = await createServer({
    configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, open: false },
  });
  await server.listen();
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
  if (report.beats.length !== 73) runnerIssues.push(`Expected all 73 beats; received ${report.beats.length}`);
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
  report.runner = { speed, seed, time: "day", headed, elapsedSeconds, issues: runnerIssues };
  try {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report: ${fileURLToPath(reportPath)}`);
  } catch (error) {
    console.error(`Could not write report: ${error}`);
    process.exitCode ||= 1;
  }
  console.log(`${report.beats.length} beats, ${report.beats.filter((b) => !b.ok).length} failed, ${report.issues.length + runnerIssues.length} issues; total ${elapsedSeconds}s`);
  // Close only resources created above; attempt both even if one close fails.
  const cleanup = await Promise.allSettled([browser?.close(), server?.close()]);
  for (const result of cleanup) {
    if (result.status === "rejected") { console.error(`Cleanup failed: ${result.reason}`); process.exitCode ||= 1; }
  }
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
}
