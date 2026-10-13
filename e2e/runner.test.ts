import { afterEach, beforeEach, expect, it, vi } from "vitest";

const originalArgs = process.argv;
const originalExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  process.argv = [process.execPath, "e2e/run.mjs"];
  process.exitCode = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.argv = originalArgs;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.doUnmock("vite");
  vi.doUnmock("playwright");
  vi.doUnmock("node:fs/promises");
});

async function runMocked(options: {
  failBeat?: boolean; issue?: boolean; beats?: number; startupError?: boolean; buildError?: boolean; headed?: boolean; seed?: number;
  dev?: boolean; noBuild?: boolean;
} = {}) {
  const report = {
    suite: "full", finished: true,
    beats: Array.from({ length: options.beats ?? 218 }, (_, i) => ({ name: `beat ${i}`, t: i, ok: !(options.failBeat && i === 0) })),
    issues: options.issue ? [{ kind: "test", msg: "problem", t: 1 }] : [],
    texts: [],
  };
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const server = {
    listen: options.startupError ? vi.fn().mockRejectedValue(new Error("listen EPERM")) : vi.fn().mockResolvedValue(undefined),
    httpServer: { address: () => ({ port: 43210 }) }, close: vi.fn().mockResolvedValue(undefined),
  };
  const build = options.buildError ? vi.fn().mockRejectedValue(new Error("build failed")) : vi.fn().mockResolvedValue(undefined);
  const preview = options.startupError ? vi.fn().mockRejectedValue(new Error("listen EPERM")) : vi.fn().mockResolvedValue(server);
  const page = { on: vi.fn(), goto: vi.fn(), evaluate: vi.fn().mockResolvedValue(report), isClosed: () => false };
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined) };
  const launch = vi.fn().mockResolvedValue(browser);
  const createServer = vi.fn().mockResolvedValue(server);
  vi.doMock("node:fs/promises", () => ({ writeFile }));
  vi.doMock("vite", () => ({ createServer, build, preview }));
  vi.doMock("playwright", () => ({ chromium: { launch } }));
  if (options.headed) process.argv.push("--headed", "--speed", "6");
  if (options.dev) process.argv.push("--dev");
  if (options.noBuild) process.argv.push("--no-build");
  if (options.seed !== undefined) process.argv.push("--seed", String(options.seed));
  const interruptsBefore = process.listenerCount("SIGINT");
  const runner = "./run.mjs";
  await import(runner);
  expect(process.listenerCount("SIGINT")).toBe(interruptsBefore);
  // Only a server this run created is closed: none exists if the build or bind failed.
  if (options.buildError || (options.startupError && !options.dev)) expect(server.close).not.toHaveBeenCalled();
  else expect(server.close).toHaveBeenCalledOnce();
  expect(writeFile).toHaveBeenCalledOnce();
  const saved = JSON.parse(writeFile.mock.calls[0][1]);
  if (options.dev) {
    expect(build).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    expect(createServer).toHaveBeenCalledOnce();
    if (!options.startupError) expect(createServer.mock.calls[0][0].server.port).toBe(0);
  } else {
    expect(createServer).not.toHaveBeenCalled();
    if (options.noBuild) expect(build).not.toHaveBeenCalled();
    else expect(build).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: "e2e", build: expect.objectContaining({ outDir: "dist-e2e" }) }));
    if (!options.buildError) {
      expect(preview).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: "e2e", build: { outDir: "dist-e2e" } }));
      expect(preview.mock.calls[0][0].preview).toMatchObject({ host: "127.0.0.1", port: 0 });
    }
  }
  if (!options.startupError && !options.buildError) {
    expect(browser.close).toHaveBeenCalledOnce();
    expect(page.goto).toHaveBeenCalledWith(`http://127.0.0.1:43210/?e2e=full&timer&speed=${options.headed ? 6 : 8}&seed=${options.seed ?? 1}&time=day`);
  }
  return { saved, launch };
}

it("saves the full report and succeeds only for all 218 passing beats", async () => {
  const { saved, launch } = await runMocked();
  expect(process.exitCode).toBe(0);
  expect(saved.finished).toBe(true);
  expect(saved.beats).toHaveLength(218);
  expect(saved.runner.issues).toEqual([]);
  expect(saved.seed).toBe(1);
  expect(saved.runner.seed).toBe(1);
  expect(launch).toHaveBeenCalledWith({ headless: true });
});

it.each([0, 42, 4294967295])("records override seed %i for replay", async (seed) => {
  const { saved } = await runMocked({ seed });
  expect(process.exitCode).toBe(0);
  expect(saved.seed).toBe(seed);
  expect(saved.runner.seed).toBe(seed);
  expect(saved.runner.time).toBe("day");
});

it.each([{ failBeat: true }, { issue: true }, { beats: 46 }, { beats: 73 }, { beats: 99 }, { beats: 125 }, { beats: 126 }, { beats: 143 }, { beats: 161 }, { beats: 162 }, { beats: 182 }, { beats: 183 }, { beats: 184 }, { beats: 185 }, { beats: 186 }, { beats: 187 }, { beats: 188 }, { beats: 204 }, { beats: 206 }, { beats: 219 }, { beats: 217 }])("fails an unsuccessful or incomplete report: %j", async (options) => {
  await runMocked(options);
  expect(process.exitCode).toBe(1);
});

it("accepts headed mode and a custom speed", async () => {
  const { saved, launch } = await runMocked({ headed: true });
  expect(process.exitCode).toBe(0);
  expect(saved.runner.speed).toBe(6);
  expect(launch).toHaveBeenCalledWith({ headless: false });
});

it("plays the production e2e build by default", async () => {
  const { saved } = await runMocked();
  expect(saved.runner.target).toBe("production");
});

it("reuses the last e2e build with --no-build", async () => {
  const { saved } = await runMocked({ noBuild: true });
  expect(process.exitCode).toBe(0);
  expect(saved.runner.target).toBe("production");
});

it("plays the dev server with --dev", async () => {
  const { saved } = await runMocked({ dev: true });
  expect(process.exitCode).toBe(0);
  expect(saved.runner.target).toBe("dev");
});

it.each([{ dev: true }, { dev: false }])("saves a diagnostic report on startup failure: %j", async ({ dev }) => {
  const { saved, launch } = await runMocked({ startupError: true, dev });
  expect(process.exitCode).toBe(1);
  expect(saved.finished).toBe(false);
  expect(saved.runner.issues[0]).toContain("listen EPERM");
  expect(launch).not.toHaveBeenCalled();
});

it("saves a diagnostic report when the e2e build fails", async () => {
  const { saved, launch } = await runMocked({ buildError: true });
  expect(process.exitCode).toBe(1);
  expect(saved.runner.issues[0]).toContain("build failed");
  expect(launch).not.toHaveBeenCalled();
});

it("rejects --dev with --no-build before starting", async () => {
  process.argv.push("--dev", "--no-build");
  vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit 1"); });
  const runner = "./run.mjs";
  await expect(import(runner)).rejects.toThrow("exit 1");
  expect(process.exit).toHaveBeenCalledWith(1);
});

it.each(["-1", "1.5", "abc", "4294967296", "9007199254740993"])("rejects invalid seed %s before starting", async (seed) => {
  process.argv.push("--seed", seed);
  vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit 1"); });
  const runner = "./run.mjs";
  await expect(import(runner)).rejects.toThrow("exit 1");
  expect(process.exit).toHaveBeenCalledWith(1);
  expect(console.error).toHaveBeenCalled();
});

/** --smoke: one page load per phase, each phase's beats tagged, then the page checks. */
async function runSmokeMocked(options: { phaseBeats?: number; pageOk?: boolean; consoleError?: boolean } = {}) {
  const phaseReport = (n: number) => ({ suite: "smoke:x", finished: true, beats: Array.from({ length: n }, (_, i) => ({ name: `b${i}`, t: i, ok: true })), issues: [], texts: [] });
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const server = { httpServer: { address: () => ({ port: 43210 }) }, close: vi.fn().mockResolvedValue(undefined) };
  const handlers: Record<string, (arg: unknown) => void> = {};
  const page = {
    on: vi.fn((event: string, fn: (arg: unknown) => void) => { handlers[event] = fn; }),
    goto: vi.fn(async () => {
      if (options.consoleError) handlers.console?.({ type: () => "error", text: () => "boom" });
    }),
    evaluate: vi.fn().mockResolvedValue(phaseReport(options.phaseBeats ?? 2)),
    isClosed: () => false,
  };
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined) };
  const checkPages = vi.fn(async (_b: unknown, _o: string, out: { beats: unknown[] }) => {
    out.beats.push({ name: "page", ok: options.pageOk ?? true, t: 0, newFlags: [], phase: "pages" });
  });
  vi.doMock("node:fs/promises", () => ({ writeFile }));
  vi.doMock("vite", () => ({ createServer: vi.fn(), build: vi.fn().mockResolvedValue(undefined), preview: vi.fn().mockResolvedValue(server) }));
  vi.doMock("playwright", () => ({ chromium: { launch: vi.fn().mockResolvedValue(browser) } }));
  vi.doMock("./smoke-plan.mjs", () => ({ SMOKE_PHASES: [{ name: "story", beats: 2 }, { name: "continue", beats: 2 }], SMOKE_BEATS: 5, checkPages }));
  process.argv.push("--smoke");
  const runner = "./run.mjs";
  await import(runner);
  vi.doUnmock("./smoke-plan.mjs");
  expect(server.close).toHaveBeenCalledOnce();
  expect(browser.close).toHaveBeenCalledOnce();
  return { saved: JSON.parse(writeFile.mock.calls[0][1]), page, checkPages, path: String(writeFile.mock.calls[0][0]) };
}

it("--smoke plays each phase in one tab, then the pages, into last-smoke-report.json", async () => {
  const { saved, page, checkPages, path } = await runSmokeMocked();
  expect(process.exitCode).toBe(0);
  expect(page.goto.mock.calls.map((c) => c[0])).toEqual([
    "http://127.0.0.1:43210/?e2e=smoke:story&timer&speed=8&seed=1&time=day",
    "http://127.0.0.1:43210/?e2e=smoke:continue&timer&speed=8&seed=1&time=day",
  ]);
  expect(checkPages).toHaveBeenCalledOnce();
  expect(saved.suite).toBe("smoke");
  expect(saved.runner.suite).toBe("smoke");
  expect(saved.beats.map((b: { phase: string }) => b.phase)).toEqual(["story", "story", "continue", "continue", "pages"]);
  expect(saved.phases.map((p: { name: string }) => p.name)).toEqual(["story", "continue"]);
  expect(path).toMatch(/e2e\/last-smoke-report\.json$/);
});

it.each([{ phaseBeats: 1 }, { pageOk: false }, { consoleError: true }])("--smoke fails a short phase, a failed page or a boot console error: %j", async (options) => {
  await runSmokeMocked(options);
  expect(process.exitCode).toBe(1);
});
