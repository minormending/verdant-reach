import { describe, expect, it } from "vitest";
import { dialogueProgress, GameplayTasks, NO_PROGRESS_MS, ProgressWatchdog } from "./detectors";
import { JINGLE_DEFS } from "../src/audio/sfx";
import { parseSong, TICKS_PER_QUARTER } from "../src/audio/song";

describe("speed-independent liveness", () => {
  it.each([1, 8, 16])("flags a frozen state at speed %i, even with an idle animation ticking", (speed) => {
    const watchdog = new ProgressWatchdog();
    const box = { page: 0, line: 2, chars: 0, waiting: true, frame: 0 };
    const signature = () => JSON.stringify(dialogueProgress(box));
    expect(watchdog.sample(signature(), 0)).toBe(false);
    for (let t = 100; t < NO_PROGRESS_MS; t += 100) {
      box.frame += 6 * speed;
      expect(watchdog.sample(signature(), t)).toBe(false);
    }
    expect(watchdog.sample(signature(), NO_PROGRESS_MS)).toBe(true);
    expect(watchdog.sample(signature(), NO_PROGRESS_MS + 100)).toBe(false);
  });

  it("does not mistake 60 fast taps awaiting a real-time jingle for a lock", () => {
    const watchdog = new ProgressWatchdog();
    const song = parseSong(JINGLE_DEFS.mark);
    const duration = song.length * 60_000 / (song.bpm * TICKS_PER_QUARTER);
    expect(duration).toBeGreaterThan(60 * 60);
    expect(duration).toBeLessThan(NO_PROGRESS_MS);
    for (let press = 0; press * 60 < duration; press++) {
      expect(watchdog.sample("mark dialogue finished; jingle pending", press * 60)).toBe(false);
    }
    expect(watchdog.sample("jingle completed", duration)).toBe(false);
    // An audio promise that never resolves still reports a lock.
    const frozenAudio = new ProgressWatchdog();
    expect(frozenAudio.sample("jingle pending", 0)).toBe(false);
    expect(frozenAudio.sample("jingle pending", NO_PROGRESS_MS)).toBe(true);
  });

  it("tracks pages and characters within one dialogue instead of its total duration", () => {
    const watchdog = new ProgressWatchdog();
    const box = { page: 0, top: 0, line: 0, chars: 0, waiting: false };
    for (let t = 0; t <= 60_000; t += 1000) {
      box.page = Math.floor(t / 6000);
      box.chars = (t / 1000) % 6;
      expect(watchdog.sample(JSON.stringify(dialogueProgress(box)), t)).toBe(false);
    }
    expect(watchdog.sample(JSON.stringify(dialogueProgress(box)), 60_000 + NO_PROGRESS_MS)).toBe(true);
  });

  it("resets on battle task completion, but still flags a subsequent frozen task", () => {
    const watchdog = new ProgressWatchdog();
    for (let task = 0; task < 10; task++) {
      expect(watchdog.sample(`battle task ${task}`, task * 6000)).toBe(false);
    }
    expect(watchdog.sample("battle task 9", 54_000 + NO_PROGRESS_MS)).toBe(true);
    expect(watchdog.sample("overworld", 70_000)).toBe(false);
    expect(watchdog.sample("overworld", 70_000 + NO_PROGRESS_MS)).toBe(true);
  });
});

describe("gameplay long tasks", () => {
  it("excludes boot even when its entry is delivered after gameplay begins", () => {
    const tasks = new GameplayTasks();
    expect(tasks.includes(400, 139)).toBe(false);
    tasks.ready(1000);
    expect(tasks.includes(400, 139)).toBe(false);
    expect(tasks.includes(950, 139)).toBe(false);
    expect(tasks.includes(1000, 139)).toBe(true);
    tasks.ready(2000); // Readiness is recorded once, not renewed every draw.
    expect(tasks.includes(1500, 139)).toBe(true);
  });

  it("excludes active and overlapping asset loads using entry timestamps", () => {
    const tasks = new GameplayTasks();
    tasks.ready(0);
    const finishA = tasks.loading(1000);
    const finishB = tasks.loading(1100);
    expect(tasks.includes(1100, 139)).toBe(false);
    finishA(1200);
    expect(tasks.includes(1200, 139)).toBe(false);
    finishB(1300);
    expect(tasks.includes(1100, 139)).toBe(false);
    expect(tasks.includes(950, 139)).toBe(false);
    expect(tasks.includes(800, 139)).toBe(true);
    expect(tasks.includes(1300, 139)).toBe(true);
  });
});
