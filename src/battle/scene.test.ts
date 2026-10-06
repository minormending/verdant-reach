import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleRequest, GameContext, Quickened, SpeciesId, TrainerDef } from "../contracts";
import { DATA } from "../data";
import { drawSpecies } from "../screens/kit/draw";
import { FIXTURE_TRAINERS } from "./fixtures";
import { drawGraftCollarPlaceholder } from "./hud";
import { sendOutFoe, type BattleState } from "./logic/battle";
import { createQuickened } from "./logic/stats";
import { seeded } from "./logic/rng";
import { createBattleScene } from "./scene";

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
  main(): Promise<string>;
  preload(): Promise<void>;
  intro(): Promise<void>;
  ending(): Promise<void>;
  chooseAction(): Promise<{ kind: "fled" }>;
  sendOutFoeAnim(text: string): Promise<void>;
  throwPod(item: string): Promise<unknown>;
  say(text: string, mode: string): Promise<void>;
  lobPod(): Promise<void>;
  popOut(): Promise<void>;
  slideHud(): Promise<void>;
  startIntro(): void;
  introLeft(): number;
  idlePose(): string;
  flow: { wait(frames: number): Promise<void> };
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

async function setup(req: BattleRequest) {
  vi.stubGlobal("window", {});
  const ctx = {
    data: DATA, rng: seeded(1), input: {}, timeOfDay: () => "day",
    world: { maps: {}, trainers: { [trainer.id]: trainer } },
    state: {
      party: [createQuickened(DATA, "great_oak", 27, seeded(10))],
      herbarium: { seen: [], caught: [] }, options: {}, bag: { terrarium_pod: 1 },
    },
    audio: { playSfx() {}, playCry() {} },
  } as unknown as GameContext;
  const scene = createBattleScene(ctx, req, () => {}) as unknown as SceneHarness;
  scene.preload = vi.fn(async () => {});
  scene.intro = vi.fn(async () => {});
  scene.ending = vi.fn(async () => {});
  scene.chooseAction = vi.fn(async () => ({ kind: "fled" as const }));
  scene.say = vi.fn(async () => {});
  scene.lobPod = vi.fn(async () => {});
  scene.popOut = vi.fn(async () => {});
  scene.slideHud = vi.fn(async () => {});
  scene.startIntro = vi.fn();
  scene.introLeft = () => 0;
  scene.idlePose = () => "front";
  scene.flow.wait = vi.fn(async () => {});
  await scene.main();
  return { scene, ctx };
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

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
