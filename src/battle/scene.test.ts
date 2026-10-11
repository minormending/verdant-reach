import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleOutcome, BattleRequest, GameContext, Quickened, SpeciesId, TrainerDef } from "../contracts";
import { DATA } from "../data";
import { drawSpecies } from "../screens/kit/draw";
import { FIXTURE_TRAINERS } from "./fixtures";
import { drawGraftCollarPlaceholder } from "./hud";
import { sendOutFoe, type BattleState } from "./logic/battle";
import { createQuickened } from "./logic/stats";
import { seeded } from "./logic/rng";
import { createBattleScene } from "./scene";
import { createSave, newGameState } from "../save";
import { createOverworldScene } from "../overworld";
import { WORLD } from "../world";
import { type BattleEvent } from "./logic/battle";
import { recoverWanderers, wandererHealth, wandererMaxHp } from "../overworld/roaming";

vi.mock("./hud", async (original) => ({
  ...await original<typeof import("./hud")>(), drawGraftCollarPlaceholder: vi.fn(),
}));
vi.mock("../screens/kit/draw", async (original) => ({
  ...await original<typeof import("../screens/kit/draw")>(), drawSpecies: vi.fn(),
}));

// Only animation/UI waits are replaced; main's trainer/wild setup, send-out
// flow, sprite drawing decisions and capture guard execute the real code.
interface SceneHarness {
  s: BattleState;
  main(): Promise<BattleOutcome>;
  preload(): Promise<void>;
  intro(): Promise<void>;
  ending(): Promise<void>;
  chooseAction(): Promise<{ kind: "fled" | "caught" | "pod_failed" } | { kind: "move"; slot: number } | { kind: "switch"; index: number }>;
  play(events: BattleEvent[]): Promise<void>;
  awardExp(foe: Quickened): Promise<void>;
  sendOutFoeAnim(text: string): Promise<void>;
  throwPod(item: string): Promise<{ kind: "caught" | "pod_failed" } | null>;
  say(text: string, mode: string): Promise<void>;
  lobPod(): Promise<void>;
  popOut(): Promise<void>;
  slideHud(): Promise<void>;
  startIntro(): void;
  introLeft(): number;
  idlePose(): string;
  flow: {
    wait(frames: number): Promise<void>;
    animate(frames: number, step: (i: number, t: number) => void): Promise<void>;
  };
  ui: { yesNo(prompt: string): Promise<boolean>; tb: { clear(): void } };
  drawSprite(g: CanvasRenderingContext2D, v: SpriteView, kind: "front" | "back", home: { x: number; y: number }, clipBottom: number, side: 0 | 1): void;
}
interface SpriteView {
  species: SpeciesId; sport: boolean; visible: boolean; dx: number; dy: number;
  drop: number; scale: number; silhouette: string | null; hidden: boolean;
}
const sprite = (q: Quickened): SpriteView => ({
  species: q.species, sport: q.sport, visible: true, dx: 0, dy: 0,
  drop: 0, scale: 1, silhouette: null, hidden: false,
});
const trainer: TrainerDef = {
  ...FIXTURE_TRAINERS.dev_hollis,
  team: [{ species: "great_oak", level: 27, grafted: true }, { species: "oak_sapling", level: 25 }],
};

async function setup(req: BattleRequest, opts: { rng?: () => number; capture?: boolean; fullParty?: boolean; wilted?: boolean;
  prepare?: (ctx: GameContext) => void; expUi?: () => void; choice?: (scene: SceneHarness) => ReturnType<SceneHarness["chooseAction"]> } = {}) {
  vi.stubGlobal("window", {});
  const ctx = {
    data: DATA, rng: opts.rng ?? seeded(1), input: {}, timeOfDay: () => "day",
    world: { maps: {}, trainers: { [trainer.id]: trainer } },
    state: {
      ...newGameState({ world: WORLD }),
      party: [createQuickened(DATA, "great_oak", 27, seeded(10))],
      box: [], position: { map: "route_1" }, playerName: "ROWAN",
      herbarium: { seen: [], caught: [] }, options: {}, bag: { terrarium_pod: 1 },
    },
    audio: { playSfx() {}, playMusic() {}, playCry() {}, async playJingle() {} },
  } as unknown as GameContext;
  opts.prepare?.(ctx);
  if (opts.fullParty) {
    for (let i = 0; i < 5; i++) ctx.state.party.push(createQuickened(DATA, "oak_acorn", 5, seeded(20 + i)));
  }
  if (opts.wilted) ctx.state.party.forEach((q) => { q.hp = 0; });
  const scene = createBattleScene(ctx, req, () => {}) as unknown as SceneHarness;
  scene.preload = vi.fn(async () => {});
  scene.intro = vi.fn(async () => {});
  scene.ending = vi.fn(async () => {});
  scene.play = vi.fn(async () => {});
  if (opts.expUi) vi.spyOn(scene, "awardExp");
  else scene.awardExp = vi.fn(async () => {});
  scene.chooseAction = vi.fn(async () => {
    if (opts.choice) return opts.choice(scene);
    if (!opts.capture) return { kind: "fled" as const };
    ctx.rng = () => 0; // All capture wobble checks pass, independently of the sport roll.
    return await scene.throwPod("terrarium_pod") ?? { kind: "fled" as const };
  });
  scene.say = vi.fn(async (text) => {
    if (text.includes("EXP. Points!")) opts.expUi?.();
  });
  scene.lobPod = vi.fn(async () => {});
  scene.popOut = vi.fn(async () => {});
  scene.slideHud = vi.fn(async () => {});
  scene.startIntro = vi.fn();
  scene.introLeft = () => 0;
  scene.idlePose = () => "front";
  scene.flow.wait = vi.fn(async () => {});
  scene.flow.animate = vi.fn(async (_frames, step) => { step(0, 1); });
  scene.ui.yesNo = vi.fn(async () => false);
  const outcome = await scene.main();
  return { scene, ctx, outcome };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("battles without a healthy party", () => {
  it.each([false, true])("returns lost for trainers and wild encounters (canLose: %s)", async (canLose) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const req of [
      { kind: "trainer" as const, trainer: trainer.id, canLose },
      { kind: "wild" as const, wild: { species: "elder" as const, level: 60 }, canLose },
    ]) {
      const { scene, outcome } = await setup(req, { wilted: true });
      expect(outcome).toBe("lost");
      expect(scene.intro).not.toHaveBeenCalled();
      expect(scene.chooseAction).not.toHaveBeenCalled();
    }
  });
});

describe("static sport wild battles", () => {
  it("creates a sport and uses its palette for the wild send-out", async () => {
    const { scene } = await setup({
      kind: "wild", wild: { species: "giant_water_lily", level: 40, sport: true }, canLose: true,
    }, { rng: () => 0.5 });
    const foe = scene.s.sides[1].party[0];
    expect(foe.sport).toBe(true);
    await scene.sendOutFoeAnim("Appeared!");
    scene.drawSprite({} as CanvasRenderingContext2D, sprite(foe), "front", { x: 96, y: 0 }, 56, 1);
    expect(drawSpecies).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), "giant_water_lily", "front", 96, 0,
      expect.objectContaining({ sport: true }),
    );
  });

  it.each([false, true])("keeps the sport and updates the Herbarium on capture (full party: %s)", async (fullParty) => {
    const { scene, ctx, outcome } = await setup({
      kind: "wild", wild: { species: "giant_water_lily", level: 40, sport: true }, canLose: true,
    }, { rng: () => 0.5, capture: true, fullParty });
    const caught = (fullParty ? ctx.state.box : ctx.state.party).at(-1)!;
    expect(outcome).toBe("caught");
    expect(caught).toBe(scene.s.sides[1].party[0]);
    expect(caught).toMatchObject({ species: "giant_water_lily", level: 40, sport: true, metAt: { map: "route_1", level: 40 } });
    expect(ctx.state.herbarium.seen).toContain("giant_water_lily");
    expect(ctx.state.herbarium.caught).toContain("giant_water_lily");
    expect(ctx.state.bag.terrarium_pod).toBeUndefined();
  });

  it.each([0.5, 0.001])("keeps the random sport roll when omitted (rng: %s)", async (roll) => {
    const rng = vi.fn(() => roll);
    const { scene } = await setup({ kind: "wild", wild: { species: "giant_water_lily", level: 40 } }, { rng });
    const expectedRng = vi.fn(() => roll);
    const expected = createQuickened(DATA, "giant_water_lily", 40, expectedRng);
    expect(scene.s.sides[1].party[0].sport).toBe(expected.sport);
    expect(rng).toHaveBeenCalledTimes(expectedRng.mock.calls.length);
  });

  it("honours an explicit false sport override", async () => {
    const { scene } = await setup({
      kind: "wild", wild: { species: "giant_water_lily", level: 40, sport: false },
    }, { rng: () => 0.001 });
    expect(scene.s.sides[1].party[0].sport).toBe(false);
  });
});

describe("wanderer battle scene", () => {
  it.each(["tumbleweed", "coconut", "burr"] as const)("restores %s health, resolves one full turn and writes health back before fleeing", async (id) => {
    const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: id, level: 60 }, wanderer: id }, {
      rng: () => 0.5,
      prepare(ctx) {
        ctx.state.party = [createQuickened(DATA, "great_oak", 100, seeded(10))];
        Object.assign(wandererHealth(ctx.state, id), { hp: 70, status: "scorch" });
      },
      choice: async (scene) => {
        const foe = scene.s.sides[1].party[0];
        expect(foe).toMatchObject({ level: 60, hp: 70, status: "scorch" });
        return { kind: "pod_failed" };
      },
    });
    expect(outcome).toBe("fled");
    expect(scene.s.turn).toBe(1);
    expect(scene.chooseAction).toHaveBeenCalledTimes(1);
    const foe = scene.s.sides[1].party[0];
    expect(foe.hp).toBeLessThan(70); // residual scorch is applied before fleeing
    expect(wandererHealth(ctx.state, id)).toMatchObject({ hp: foe.hp, status: foe.status });
    expect(scene.say).toHaveBeenCalledWith(`${DATA.species[id].name.toUpperCase()} fled!`, "wait");
    expect(scene.play).toHaveBeenCalledOnce();
  });

  it("flees after a player switch even if dormant and ROOT TAPped", async () => {
    const { scene, outcome } = await setup({ kind: "wild", wild: { species: "tumbleweed", level: 60 }, wanderer: "tumbleweed" }, {
      rng: () => 0.5,
      prepare(ctx) {
        ctx.state.party = [createQuickened(DATA, "great_oak", 100, seeded(10)), createQuickened(DATA, "great_oak", 100, seeded(11))];
        ctx.state.roamers.tumbleweed.status = "dormant";
      },
      choice: async (scene) => {
        scene.s.sides[1].vol.rootTapped = true;
        return { kind: "switch", index: 1 };
      },
    });
    expect(outcome).toBe("fled");
    expect(scene.s.sides[0].active).toBe(1);
    expect(scene.s.turn).toBe(1);
  });

  it("capture ends the encounter immediately and permanently removes the wanderer", async () => {
    const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: "burr", level: 60 }, wanderer: "burr" }, {
      capture: true, prepare(ctx) { ctx.state.burr.hp = 1; },
    });
    expect(outcome).toBe("caught");
    expect(scene.s.turn).toBe(0);
    expect(ctx.state.flags.wanderer_caught_burr).toBe(true);
    expect(ctx.state.herbarium.caught).toContain("burr");
    expect(ctx.state.party.at(-1)?.hp).toBe(1);
    expect(scene.say).not.toHaveBeenCalledWith("BURR fled!", "wait");
  });

  it("writes back a status inflicted during the first turn", async () => {
    const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: "tumbleweed", level: 60 }, wanderer: "tumbleweed" }, {
      rng: () => 0.5,
      prepare(ctx) {
        const lead = createQuickened(DATA, "great_oak", 100, seeded(10));
        lead.moves = [{ id: "root_snare", pp: 20 }];
        ctx.state.party = [lead];
      },
      choice: async () => ({ kind: "move", slot: 0 }),
    });
    expect(outcome).toBe("fled");
    expect(scene.s.turn).toBe(1);
    expect(ctx.state.roamers.tumbleweed.status).toBe("rootbound");
  });

  it("keeps a player whiteout outcome and still persists wanderer health", async () => {
    const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: "tumbleweed", level: 60 }, wanderer: "tumbleweed" }, {
      rng: () => 0.5,
      prepare(ctx) {
        const lead = createQuickened(DATA, "great_oak", 1, seeded(10));
        lead.hp = 1; lead.status = "blight";
        ctx.state.party = [lead];
        ctx.state.roamers.tumbleweed.status = "blight";
      },
      choice: async () => ({ kind: "pod_failed" }),
    });
    expect(outcome).toBe("lost");
    expect(scene.s.turn).toBe(1);
    expect(ctx.state.roamers.tumbleweed).toMatchObject({ hp: scene.s.sides[1].party[0].hp, status: "blight" });
    expect(scene.say).not.toHaveBeenCalledWith("TUMBLEWEED fled!", "wait");
  });

  it("does not make ordinary wild battles flee after their first turn", async () => {
    let choices = 0;
    const { scene, outcome } = await setup({ kind: "wild", wild: { species: "oak_acorn", level: 2 } }, {
      rng: () => 0.5,
      prepare(ctx) { ctx.state.party = [createQuickened(DATA, "great_oak", 100, seeded(10))]; },
      choice: async () => ++choices === 1 ? { kind: "pod_failed" } : { kind: "fled" },
    });
    expect(outcome).toBe("fled");
    expect(scene.chooseAction).toHaveBeenCalledTimes(2);
    expect(scene.s.turn).toBe(1);
    expect(scene.say).not.toHaveBeenCalledWith("OAK ACORN fled!", "wait");
  });

  it.each(["tumbleweed", "coconut", "burr"] as const)("records %s wilting before midnight, even when EXP UI crosses into the next day", async (id) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 59));
    try {
      const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: id, level: 60 }, wanderer: id }, {
        rng: () => 0.5,
        prepare(ctx) {
          ctx.world = WORLD;
          ctx.assets = { exists: () => false, has: () => false, image: () => undefined, loadAll: async () => {} };
          ctx.state.flags = { game_cleared: true, wanderers_free: true };
          ctx.state.position = { map: "player_home", x: 2, y: 2, facing: "down" };
          ctx.state.party = [createQuickened(DATA, "great_oak", 80, seeded(10))];
          Object.assign(wandererHealth(ctx.state, id), { hp: 1, status: "blight" });
        },
        choice: async () => ({ kind: "pod_failed" }),
        expUi: () => {
          expect(new Date().getDate()).toBe(7);
          vi.setSystemTime(new Date(2026, 9, 8, 0, 0, 1));
        },
      });
      expect(outcome).toBe("won");
      expect(scene.awardExp).toHaveBeenCalledOnce();
      expect(ctx.state.wandererWilted?.[id]).toBe("2026-10-07");
      const recovered = recoverWanderers(ctx.state, DATA, new Date());
      expect(wandererHealth(recovered, id)).toMatchObject({ hp: wandererMaxHp(DATA, id), status: null });
      const values = new Map<string, string>();
      const save = createSave(() => ctx.state, {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
        removeItem: (key) => { values.delete(key); },
      });
      save.write();
      ctx.state = save.read()!;
      expect(ctx.state.wandererWilted?.[id]).toBe("2026-10-07");
      createOverworldScene(ctx, { mode: "continue" });
      expect(wandererHealth(ctx.state, id)).toMatchObject({ hp: wandererMaxHp(DATA, id), status: null });
      expect(ctx.state.wandererWilted?.[id]).toBeUndefined();
    } finally { vi.useRealTimers(); }
  });

  it("wilting from end-of-turn status wins over fleeing and records the real date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59));
    try {
      const { ctx, scene, outcome } = await setup({ kind: "wild", wild: { species: "coconut", level: 60 }, wanderer: "coconut" }, {
        rng: () => 0.5,
        prepare(ctx) {
          ctx.state.party = [createQuickened(DATA, "great_oak", 100, seeded(10))];
          Object.assign(ctx.state.roamers.coconut, { hp: 1, status: "blight" });
        },
        choice: async () => ({ kind: "pod_failed" }),
      });
      expect(outcome).toBe("won");
      expect(ctx.state.roamers.coconut.hp).toBe(0);
      expect(ctx.state.wandererWilted?.coconut).toBe("2026-10-07");
      expect(scene.say).not.toHaveBeenCalledWith("COCONUT fled!", "wait");
    } finally { vi.useRealTimers(); }
  });
});

describe("graft collar scene wiring", () => {
  it("announces grafted send-outs, clears it for the next slot and announces it again on return", async () => {
    const { scene } = await setup({ kind: "trainer", trainer: trainer.id });
    await scene.sendOutFoeAnim("Sent out!");
    expect(scene.say).toHaveBeenLastCalledWith("GREAT OAK strains at its GRAFT COLLAR!", "wait");
    sendOutFoe(scene.s, 1);
    await scene.sendOutFoeAnim("Sent out!");
    expect(scene.say).toHaveBeenLastCalledWith("Sent out!", "hold");
    sendOutFoe(scene.s, 0);
    await scene.sendOutFoeAnim("Sent out!");
    expect(scene.say).toHaveBeenLastCalledWith("GREAT OAK strains at its GRAFT COLLAR!", "wait");
  });

  it("overlays only the active grafted trainer front, following sprite offsets and clipping", async () => {
    const { scene } = await setup({ kind: "trainer", trainer: trainer.id });
    const g = {} as CanvasRenderingContext2D;
    const v = { ...sprite(scene.s.sides[1].party[0]), dx: 3, dy: 2, drop: 4, scale: 0.5 };
    scene.drawSprite(g, v, "front", { x: 96, y: 0 }, 56, 1);
    expect(drawSpecies).toHaveBeenCalled();
    expect(drawGraftCollarPlaceholder).toHaveBeenCalledWith(g, 99, 2, { scale: 0.5, drop: 4, clipBottom: 56, silhouette: undefined });
    vi.mocked(drawGraftCollarPlaceholder).mockClear();
    scene.drawSprite(g, sprite(scene.s.sides[0].party[0]), "back", { x: 8, y: 40 }, 88, 0);
    sendOutFoe(scene.s, 1);
    scene.drawSprite(g, sprite(scene.s.sides[1].party[1]), "front", { x: 96, y: 0 }, 56, 1);
    expect(drawGraftCollarPlaceholder).not.toHaveBeenCalled();
  });

  it("blocks capture of a collared trainer's Quickened without changing the bag or player party", async () => {
    const { scene, ctx } = await setup({ kind: "trainer", trainer: trainer.id });
    const before = structuredClone(ctx.state.party);
    expect(await scene.throwPod("terrarium_pod")).toBeNull();
    expect(ctx.state.bag.terrarium_pod).toBe(1);
    expect(ctx.state.party).toEqual(before);
    expect(scene.say).toHaveBeenCalledWith("The trainer blocked the pod!", "auto");
  });

  it("never collars a wild opponent of the same species", async () => {
    const { scene } = await setup({ kind: "wild", wild: { species: "great_oak", level: 27 } });
    const foe = scene.s.sides[1].party[0];
    await scene.sendOutFoeAnim("Appeared!");
    expect(scene.say).toHaveBeenCalledExactlyOnceWith("Appeared!", "hold");
    scene.drawSprite({} as CanvasRenderingContext2D, sprite(foe), "front", { x: 96, y: 0 }, 56, 1);
    expect(drawGraftCollarPlaceholder).not.toHaveBeenCalled();
    expect(foe.stats).toEqual(createQuickened(DATA, "great_oak", 27, seeded(1)).stats);
    expect(foe).not.toHaveProperty("grafted");
  });
});
