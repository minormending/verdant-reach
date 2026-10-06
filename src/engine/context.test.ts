import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameContext } from "../contracts";
import { createGameContext } from "./context";

const battleContexts = vi.hoisted(() => [] as GameContext[]);
vi.mock("../battle", async (original) => ({
  ...await original<typeof import("../battle")>(),
  createBattleScene: (ctx: GameContext) => {
    battleContexts.push(ctx);
    return { update() {}, draw() {} };
  },
}));

beforeEach(() => { battleContexts.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function context(search: string) {
  vi.stubGlobal("location", { search });
  return createGameContext({
    input: {}, assets: {},
    scenes: { run: (create: (done: () => void) => unknown) => {
      create(() => {});
      return Promise.resolve("won");
    } },
  } as unknown as Parameters<typeof createGameContext>[0]);
}

describe("context RNG wiring", () => {
  it("replays trainer and wild rolls independently of world draws and other battles", () => {
    const first = context("?seed=1");
    const replay = context("?seed=1");
    for (let i = 0; i < 500; i++) first.rng();
    void first.battle({ kind: "wild", wild: { species: "oak_acorn", level: 6 } });
    void first.battle({ kind: "trainer", trainer: "flora" });
    void replay.battle({ kind: "trainer", trainer: "flora" });
    const [wild, flora, replayFlora] = battleContexts;
    expect(flora.rng).not.toBe(first.rng);
    expect(Array.from({ length: 20 }, () => flora.rng())).toEqual(Array.from({ length: 20 }, () => replayFlora.rng()));
    void replay.battle({ kind: "wild", wild: { species: "oak_acorn", level: 6 } });
    expect(Array.from({ length: 20 }, () => wild.rng())).toEqual(Array.from({ length: 20 }, () => battleContexts[3].rng()));
    expect(flora.state).toBe(first.state);
    expect(flora.screens).toBe(first.screens);
    void first.battle({ kind: "trainer", trainer: "flora" });
    expect(battleContexts[4].rng).toBe(flora.rng);
  });

  it.each([false, true])("preserves the original context without an active dev seed (production=%s)", (production) => {
    if (production) vi.stubEnv("DEV", false);
    const ctx = context(production ? "?seed=1" : "");
    expect(ctx.rng).toBe(Math.random);
    void ctx.battle({ kind: "trainer", trainer: "flora" });
    expect(battleContexts[0]).toBe(ctx);
  });
});
