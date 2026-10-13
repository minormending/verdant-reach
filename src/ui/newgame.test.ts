import { describe, expect, it, vi } from "vitest";
import type { GameContext, Scene, WorldData } from "../contracts";
import { playerArt } from "../contracts";
import type { NameEntryOpts } from "./nameEntry";

const named: NameEntryOpts[] = [];
vi.mock("./nameEntry", () => ({
  nameEntry: async (_ctx: unknown, opts: NameEntryOpts) => { named.push(opts); return opts.defaultName; },
}));
vi.mock("../overworld", () => ({ createOverworldScene: () => ({ update() {}, draw() {} }) }));

const { chooseLook, runNewGame } = await import("./newgame");

const world = {
  maps: {},
  newGame: { map: "herbarium_roof", x: 4, y: 6, facing: "up", script: "prologue" },
} as unknown as WorldData;

/** A context whose menus answer from `answers`, with a scene stack that ticks its top scene. */
function setup(answers: number[]) {
  const said: string[] = [];
  const menus: { options: string[]; prompt?: string; cancel?: boolean }[] = [];
  const stack: Scene[] = [];
  const ctx = {
    world,
    audio: { playMusic: vi.fn(), stopMusic: vi.fn(), playCry: vi.fn(async () => {}), playSfx: vi.fn() },
    assets: { image: () => undefined },
    scenes: {
      push: (s: Scene) => void stack.push(s),
      pop: () => stack.pop(),
      top: () => stack[stack.length - 1],
    },
    ui: {
      say: async (t: string) => { said.push(t); },
      choose: async (options: string[], opts?: { prompt?: string; cancel?: boolean; onCursor?: (i: number) => void }) => {
        menus.push({ options, prompt: opts?.prompt, cancel: opts?.cancel });
        const pick = answers.shift() ?? 0;
        opts?.onCursor?.(0);
        opts?.onCursor?.(pick);
        return pick;
      },
    },
  } as unknown as GameContext;
  return { ctx, said, menus, stack };
}

/** Run the new game to the overworld hand-off, ticking the intro scene like the game loop. */
async function play(ctx: GameContext, stack: Scene[]) {
  let done = false;
  const run = runNewGame(ctx).then(() => { done = true; });
  for (let i = 0; i < 5000 && !done; i++) {
    stack[stack.length - 1]?.update(1 / 60);
    await Promise.resolve();
  }
  await run;
}

describe("NEW GAME: boy or girl", () => {
  it("asks Crystal-style after VALE's intro and before the name, with BOY first", async () => {
    named.length = 0;
    const { ctx, said, menus, stack } = setup([0]);
    await play(ctx, stack);
    expect(menus).toEqual([{ options: ["BOY", "GIRL"], prompt: "Are you a boy?\nOr are you a girl?", cancel: false }]);
    const asked = said.indexOf("My notes are such a muddle.");
    expect(asked).toBeGreaterThan(said.indexOf("Our job is to catalogue them, and to understand them."));
    expect(said.indexOf("…what was your name again?")).toBeGreaterThan(asked);
    expect(ctx.state.playerLook).toBe("boy");
    expect(named).toEqual([expect.objectContaining({ sprite: "player", defaultName: "BASIL", max: 7 })]);
    expect(ctx.state.playerName).toBe("BASIL");
    expect(playerArt(ctx.state)).toEqual({ character: "player", back: "player_back" });
  });

  it("GIRL sets the look, her sprite on the name entry and her default name", async () => {
    named.length = 0;
    const { ctx, stack } = setup([1]);
    await play(ctx, stack);
    expect(ctx.state.playerLook).toBe("girl");
    expect(named).toEqual([expect.objectContaining({ sprite: "player_girl", defaultName: "BRYONY" })]);
    expect(ctx.state.playerName).toBe("BRYONY");
    expect(playerArt(ctx.state)).toEqual({ character: "player_girl", back: "player_girl_back" });
  });

  it("reports the highlighted look to the portraits as the cursor moves", async () => {
    const { ctx } = setup([1]);
    const seen: number[] = [];
    expect(await chooseLook(ctx, (i) => seen.push(i))).toBe("girl");
    expect(seen).toEqual([0, 1]);
  });
});
