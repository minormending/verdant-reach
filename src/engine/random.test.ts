import { afterEach, describe, expect, it, vi } from "vitest";
import { devSeed, installDevRandom, randomStream } from "./random";

const originalRandom = Math.random;
afterEach(() => {
  Math.random = originalRandom;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("dev seed", () => {
  it.each([0, 1, 42, 4294967295])("accepts unsigned seed %i", (seed) => {
    vi.stubGlobal("location", { search: `?seed=${seed}` });
    expect(devSeed()).toBe(seed);
  });

  it.each(["", "?seed=", "?seed=-1", "?seed=1.5", "?seed=abc", "?seed=4294967296"])("preserves ordinary randomness for %s", (search) => {
    vi.stubGlobal("location", { search });
    expect(devSeed()).toBeNull();
    installDevRandom();
    expect(Math.random).toBe(originalRandom);
  });

  it("ignores seeds in production, including direct random draws", () => {
    vi.stubEnv("DEV", false);
    vi.stubGlobal("location", { search: "?seed=1" });
    expect(devSeed()).toBeNull();
    installDevRandom();
    expect(Math.random).toBe(originalRandom);
  });

  it("repeats direct draws on a fresh seeded boot", () => {
    vi.stubGlobal("location", { search: "?seed=7" });
    installDevRandom();
    const first = Array.from({ length: 20 }, () => Math.random());
    installDevRandom();
    expect(Array.from({ length: 20 }, () => Math.random())).toEqual(first);
  });

  it("isolates battle and fixture rolls from idle NPCs and cosmetic draws", () => {
    const world = randomStream(1, "world");
    const direct = randomStream(1, "direct");
    const battle = randomStream(1, "battle:trainer:flora");
    const fixture = randomStream(1, "e2e:fixtures");
    const expectedBattle = randomStream(1, "battle:trainer:flora");
    const expectedFixture = randomStream(1, "e2e:fixtures");
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < i * 10; j++) { world(); direct(); }
      expect(battle()).toBe(expectedBattle());
      expect(fixture()).toBe(expectedFixture());
    }
    expect(randomStream(2, "world")()).not.toBe(randomStream(1, "world")());
  });
});
