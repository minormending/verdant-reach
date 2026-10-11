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

async function runMocked(options: { failBeat?: boolean; issue?: boolean; beats?: number; startupError?: boolean; headed?: boolean; seed?: number } = {}) {
  const report = {
    suite: "full", finished: true,
    beats: Array.from({ length: options.beats ?? 229 }, (_, i) => ({ name: `beat ${i}`, t: i, ok: !(options.failBeat && i === 0) })),
    issues: options.issue ? [{ kind: "test", msg: "problem", t: 1 }] : [],
    texts: [],
  };
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const server = {
    listen: options.startupError ? vi.fn().mockRejectedValue(new Error("listen EPERM")) : vi.fn().mockResolvedValue(undefined),
    httpServer: { address: () => ({ port: 43210 }) }, close: vi.fn().mockResolvedValue(undefined),
  };
  const page = { on: vi.fn(), goto: vi.fn(), evaluate: vi.fn().mockResolvedValue(report), isClosed: () => false };
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined) };
  const launch = vi.fn().mockResolvedValue(browser);
  const createServer = vi.fn().mockResolvedValue(server);
  vi.doMock("node:fs/promises", () => ({ writeFile }));
  vi.doMock("vite", () => ({ createServer }));
  vi.doMock("playwright", () => ({ chromium: { launch } }));
  if (options.headed) process.argv.push("--headed", "--speed", "6");
  if (options.seed !== undefined) process.argv.push("--seed", String(options.seed));
  const interruptsBefore = process.listenerCount("SIGINT");
  const runner = "./run.mjs";
  await import(runner);
  expect(process.listenerCount("SIGINT")).toBe(interruptsBefore);
  expect(server.close).toHaveBeenCalledOnce();
  expect(writeFile).toHaveBeenCalledOnce();
  const saved = JSON.parse(writeFile.mock.calls[0][1]);
  if (!options.startupError) {
    expect(browser.close).toHaveBeenCalledOnce();
    expect(createServer.mock.calls[0][0].server.port).toBe(0);
    expect(page.goto).toHaveBeenCalledWith(`http://127.0.0.1:43210/?e2e=full&timer&speed=${options.headed ? 6 : 8}&seed=${options.seed ?? 1}&time=day`);
  }
  return { saved, launch };
}

it("saves the full report and succeeds only for all 229 passing beats", async () => {
  const { saved, launch } = await runMocked();
  expect(process.exitCode).toBe(0);
  expect(saved.finished).toBe(true);
  expect(saved.beats).toHaveLength(229);
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

it.each([{ failBeat: true }, { issue: true }, { beats: 46 }, { beats: 73 }, { beats: 99 }, { beats: 125 }, { beats: 126 }, { beats: 143 }, { beats: 161 }, { beats: 162 }, { beats: 182 }, { beats: 183 }, { beats: 184 }, { beats: 185 }, { beats: 186 }, { beats: 187 }, { beats: 188 }, { beats: 204 }, { beats: 206 }, { beats: 230 }, { beats: 228 }])("fails an unsuccessful or incomplete report: %j", async (options) => {
  await runMocked(options);
  expect(process.exitCode).toBe(1);
});

it("accepts headed mode and a custom speed", async () => {
  const { saved, launch } = await runMocked({ headed: true });
  expect(process.exitCode).toBe(0);
  expect(saved.runner.speed).toBe(6);
  expect(launch).toHaveBeenCalledWith({ headless: false });
});

it("saves a diagnostic report and closes its server on startup failure", async () => {
  const { saved, launch } = await runMocked({ startupError: true });
  expect(process.exitCode).toBe(1);
  expect(saved.finished).toBe(false);
  expect(saved.runner.issues[0]).toContain("listen EPERM");
  expect(launch).not.toHaveBeenCalled();
});

it.each(["-1", "1.5", "abc", "4294967296", "9007199254740993"])("rejects invalid seed %s before starting", async (seed) => {
  process.argv.push("--seed", seed);
  vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit 1"); });
  const runner = "./run.mjs";
  await expect(import(runner)).rejects.toThrow("exit 1");
  expect(process.exit).toHaveBeenCalledWith(1);
  expect(console.error).toHaveBeenCalled();
});
