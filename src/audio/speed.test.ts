import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JINGLE_DEFS } from "./sfx";
import { parseSong, songSeconds } from "./song";

// A fake chip whose sounds end only when the test says so: what is under test
// is how long a flow waits on an awaited jingle or cry, not synthesis.
const players: { song: unknown; onEnd?: () => void; stopped: boolean; isFinished: boolean }[] = [];
vi.mock("./engine", () => {
  const gain = () => ({ gain: { value: 1, setTargetAtTime() {} }, connect() { return this; } });
  class Chip {
    musicBus = gain(); sfxBus = gain(); duckGain = gain(); jingleBus = gain(); effectBus = gain(); cryBus = gain(); ambienceBus = gain();
    constructor(readonly ctx: unknown) {}
    play(song: unknown, _bus: unknown, onEnd?: () => void) {
      const p = {
        song, onEnd, stopped: false, isFinished: false,
        stop() { p.stopped = true; p.isFinished = true; onEnd?.(); },
        positionTicks: () => 0, songTick: () => 0,
      };
      players.push(p);
      return p;
    }
  }
  return { Chip };
});
vi.mock("./ambience", () => ({
  AmbienceBed: class { current = "none"; start(kind: string) { this.current = kind; } stop() {} },
  ambienceFor: () => "none",
  clockTimeOfDay: () => "day",
}));

class RunningContext {
  state = "running";
  currentTime = 0;
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
}

const { awaitSound, createAudio } = await import("./index");

const itemGetMs = songSeconds(parseSong(JINGLE_DEFS.item_get)) * 1000;
const settled = (p: Promise<void>) => {
  let done = false;
  void p.then(() => { done = true; });
  return () => done;
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); players.length = 0; });

describe("awaitSound", () => {
  it("waits for the sound's end at x1", async () => {
    let end = () => {};
    const done = settled(awaitSound((e) => { end = e; }, 2000, (ms) => ms));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(done()).toBe(false);
    end();
    await Promise.resolve();
    expect(done()).toBe(true);
  });

  it("stops waiting after length / speed at x4, even if the sound runs late", async () => {
    const done = settled(awaitSound(() => {}, 2000, (ms) => ms / 4));
    await vi.advanceTimersByTimeAsync(499);
    expect(done()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done()).toBe(true);
  });
});

describe("awaited jingles under GAME SPEED", () => {
  const audio = (speed: number) => {
    vi.stubGlobal("AudioContext", RunningContext);
    const a = createAudio({ scaleMs: (ms) => ms / speed });
    a.unlock();
    a.playMusic("route");
    return a;
  };

  it("does not stall a flow at x4: it moves on at a quarter of the jingle, the jingle plays on", async () => {
    const a = audio(4);
    const done = settled(a.playJingle("item_get"));
    const jingle = players.at(-1)!;
    await vi.advanceTimersByTimeAsync(itemGetMs / 4 + 1);
    expect(done()).toBe(true);
    // Still audible: not stopped, and the route music waits for its end.
    expect(jingle.stopped).toBe(false);
    const musicBefore = players.length;
    jingle.onEnd!();
    expect(players.length).toBe(musicBefore + 1);
  });

  it("waits for the whole jingle at x1", async () => {
    const a = audio(1);
    const done = settled(a.playJingle("item_get"));
    await vi.advanceTimersByTimeAsync(itemGetMs * 3);
    expect(done()).toBe(false);
    players.at(-1)!.onEnd!();
    await Promise.resolve();
    expect(done()).toBe(true);
  });

  it("lets a new jingle replace one still finishing, and resumes the music once", async () => {
    const a = audio(4);
    void a.playJingle("item_get");
    const first = players.at(-1)!;
    await vi.advanceTimersByTimeAsync(itemGetMs / 4 + 1);
    void a.playJingle("quest");
    const second = players.at(-1)!;
    expect(first.stopped).toBe(true);
    expect(second.stopped).toBe(false);
    const count = players.length;
    second.onEnd!();
    expect(players.length).toBe(count + 1); // the music, once
  });

  it("does not stall on an awaited cry at x4", async () => {
    const a = audio(4);
    const done = settled(a.playCry("oak_acorn"));
    await vi.advanceTimersByTimeAsync(2000);
    expect(done()).toBe(true);
  });
});
