import { afterEach, describe, expect, it, vi } from "vitest";

// A fake Web Audio chip: the unlock logic is what's under test, not synthesis.
const plays: unknown[] = [];
vi.mock("./engine", () => {
  const gain = () => ({ gain: { value: 1, setTargetAtTime() {} }, connect() { return this; } });
  class Chip {
    musicBus = gain(); sfxBus = gain(); duckGain = gain(); jingleBus = gain(); effectBus = gain(); cryBus = gain(); ambienceBus = gain();
    constructor(readonly ctx: FakeContext) {}
    play(song: unknown) {
      plays.push(song);
      return { stop() {}, positionTicks: () => 0, songTick: () => 0, song: { length: 1 } };
    }
  }
  return { Chip };
});
vi.mock("./ambience", () => ({
  AmbienceBed: class { current = "none"; start(kind: string) { this.current = kind; } stop() {} },
  ambienceFor: () => "none",
  clockTimeOfDay: () => "day",
}));

/** Resume only succeeds while the page has user activation; otherwise it waits, as in Chrome. */
let activation = false;
class FakeContext {
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  resumes = 0;
  private waiting: (() => void)[] = [];
  resume() {
    this.resumes++;
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
      if (!activation) return;
      this.state = "running";
      for (const r of this.waiting.splice(0)) r();
    });
  }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
}

const { createAudio } = await import("./index");

afterEach(() => { vi.unstubAllGlobals(); plays.length = 0; activation = false; });

describe("audio unlock", () => {
  it("keeps retrying until audio runs, then starts the music once and returns at once", async () => {
    let made: FakeContext | undefined;
    vi.stubGlobal("AudioContext", class extends FakeContext { constructor() { super(); made = this; } });
    const audio = createAudio();
    audio.playMusic("route");
    audio.unlock(); // Escape: not a user gesture
    audio.unlock(); // another non-gesture key
    await Promise.resolve();
    expect(made!.state).toBe("suspended");
    expect(plays).toHaveLength(0);
    activation = true;
    audio.unlock(); // Z: a real gesture
    await vi.waitFor(() => expect(made!.state).toBe("running"));
    await Promise.resolve();
    // Three resume promises resolved, but the music started only once.
    expect(plays).toHaveLength(1);
    const resumes = made!.resumes;
    for (let i = 0; i < 5; i++) audio.unlock();
    expect(made!.resumes).toBe(resumes);
    expect(plays).toHaveLength(1);
  });
});
