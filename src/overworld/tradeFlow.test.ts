import { TEXTBOX } from "../contracts";
import { describe, expect, it, vi } from "vitest";
import type { Button, GameContext, GameData, ScriptCmd, SpeciesId, WorldData } from "../contracts";
import { DATA } from "../data";
import { createQuickened, movesAtLevel } from "../battle/logic/stats";
import { seeded } from "../battle/logic/rng";
import { createSceneStack } from "../engine/core";
import { newGameState } from "../save";
import { createUiKit } from "../ui/kit";
import { wrapText } from "../ui/font";
import { runScript, scriptsAwardMark, type ScriptHost } from "./script";

// Local overrides only: Chapter 6 will supply the real trading species and NPCs.
const data: GameData = {
  ...DATA,
  species: {
    ...DATA.species,
    oak_acorn: { ...DATA.species.oak_acorn, growsInto: { species: "oak_sapling", trigger: { kind: "cross_pollination" } } },
    maple_samara: { ...DATA.species.maple_samara, growsInto: { species: "maple_sapling", trigger: { kind: "cross_pollination" } } },
  },
};
const world = { maps: {}, scripts: {}, trainers: {}, newGame: { map: "herbarium", x: 1, y: 1, facing: "down", script: "x" } } as unknown as WorldData;

/** Drive the actual picker, YES/NO, text boxes, growth scene and move learning. */
function harness(gameData = data) {
  const scenes = createSceneStack();
  let button: Button | undefined;
  const texts: string[] = [];
  const prompts: string[] = [];
  const jingles: string[] = [];
  const drawText = vi.fn();
  const ctx = {
    data: gameData, world, scenes, state: newGameState({ world }), rng: seeded(42),
    input: {
      pressed: (b: Button) => b === button,
      repeat: (b: Button) => b === button,
      held: (b: Button) => b === button,
    },
    assets: { exists: () => false, has: () => false, image: () => ({ width: 16, height: 16 }) },
    audio: {
      playSfx: vi.fn(), playCry: async () => {}, playJingle: async (id: string) => { jingles.push(id); },
      current: () => "herbarium", stopMusic: vi.fn(), playMusic: vi.fn(),
    },
  } as unknown as GameContext;
  ctx.state.options.textSpeed = "fast";
  ctx.ui = createUiKit(ctx);
  const say = ctx.ui.say;
  const choose = ctx.ui.choose;
  ctx.ui.say = (text, opts) => { texts.push(text); return say(text, opts); };
  ctx.ui.choose = (options, opts) => { if (opts?.prompt) prompts.push(opts.prompt); return choose(options, opts); };
  ctx.ui.wrap = (text, cols) => { texts.push(text); return wrapText(text, cols); };
  ctx.ui.drawText = drawText;
  ctx.ui.drawWindow = vi.fn();
  const host = { ctx, mapId: () => "herbarium", createQuickened } as unknown as ScriptHost;
  const plant = (id: SpeciesId = "oak_acorn") => createQuickened(gameData, id, 12, seeded(1));
  const tick = async (press?: Button) => {
    button = press;
    scenes.top()?.update(1000 / 60);
    for (let i = 0; i < 12; i++) await Promise.resolve();
    button = undefined;
  };
  const until = async (done: () => boolean, press?: Button) => {
    for (let i = 0; i < 2000 && !done(); i++) await tick(press);
    expect(done(), `trade flow timed out; last text: ${texts.at(-1)}`).toBe(true);
  };
  const confirmation = async () => {
    await until(() => prompts.length > 0, "a");
    // Finish typing the confirmation before navigating its menu.
    for (let i = 0; i < 80; i++) await tick();
  };
  const open = (changes: Partial<Extract<ScriptCmd, { op: "trade" }>> = {}) => {
    const cmd: Extract<ScriptCmd, { op: "trade" }> = {
      op: "trade", wants: ["oak_acorn"], gives: { species: "oak_acorn", level: 16, nickname: "SPROUT" },
      then: [{ op: "say", text: "Take good care." }, { op: "setFlag", flag: "traded" }],
      else: [{ op: "setFlag", flag: "declined" }],
      ...changes,
    };
    let done = false;
    const result = runScript(host, [cmd]).then(() => { done = true; });
    return { result, done: () => done };
  };
  const drawPicker = () => {
    drawText.mockClear();
    scenes.top()!.draw({ fillRect() {}, drawImage() {}, save() {}, restore() {} } as unknown as CanvasRenderingContext2D);
    return drawText.mock.calls.map(([, text]) => text);
  };
  return { ctx, scenes, texts, prompts, jingles, plant, tick, until, confirmation, open, drawPicker };
}

describe("NPC trade script flow", () => {
  it("filters seeds and unwanted plants, swaps the original slot, then grows only the receipt", async () => {
    const h = harness();
    const seed = h.plant();
    seed.seed = { steps: 10 };
    const first = h.plant();
    first.nickname = "FIRST";
    const offered = h.plant();
    offered.nickname = "SECOND";
    offered.hp = 0;
    offered.status = "scorch";
    offered.moves.forEach((m) => { m.pp = 0; });
    h.ctx.state.party = [h.plant("maple_samara"), seed, first, offered];
    const originals = [...h.ctx.state.party];
    const snapshots = structuredClone(originals);
    const flow = h.open();
    await h.until(() => h.texts.includes("Trade which one?"));
    for (let i = 0; i < 20; i++) await h.tick();
    const shown = h.drawPicker();
    expect(shown).toContain("FIRST");
    expect(shown).toContain("SECOND");
    expect(shown).not.toContain("SEED");
    expect(shown).not.toContain("MAPLE SAMARA");
    await h.tick("down"); // row 1 in the filtered picker is original party slot 3
    await h.tick("a");
    await h.confirmation();
    expect(h.prompts).toEqual(["Trade SECOND?"]);
    expect(h.ctx.state.party).toEqual(snapshots);
    await h.tick("a");
    await h.until(() => h.ctx.state.party[3] !== offered);
    const received = h.ctx.state.party[3];
    expect(received.species).toBe("oak_acorn");
    expect(received.level).toBe(16);
    expect(received.nickname).toBe("SPROUT");
    expect(received.uid).not.toBe(offered.uid);
    expect(received.hp).toBe(received.stats.hp);
    expect(received.status).toBeNull();
    expect(received.evs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(received.moves).toEqual(movesAtLevel(data.species.oak_acorn, 16, (id) => data.moves[id].power > 0)
      .map((id) => ({ id, pp: data.moves[id].pp })));
    expect(received.metAt).toEqual({ map: "herbarium", level: 16 });
    expect(h.ctx.state.flags.traded).toBeUndefined();
    await h.until(() => h.texts.includes("What? SPROUT is growing!"), "a");
    // B advances text but cannot stop Crystal's trade growth.
    await h.until(() => received.species === "oak_sapling", "b");
    expect(h.ctx.state.flags.traded).toBeUndefined();
    await h.until(flow.done, "a");
    await flow.result;
    expect(h.scenes.all()).toHaveLength(0);
    expect(h.jingles).toEqual(["item_get", "growth"]);
    expect(h.ctx.state.flags.traded).toBe(true);
    expect(h.ctx.state.flags.declined).toBeUndefined();
    expect(received.moves.some((m) => m.id === "bark_skin")).toBe(true);
    expect(received.nickname).toBe("SPROUT");
    expect(h.ctx.state.herbarium).toEqual({ seen: ["oak_acorn", "oak_sapling"], caught: ["oak_acorn", "oak_sapling"] });
    expect(h.texts.some((t) => t.includes("stopped growing"))).toBe(false);
    for (let i = 0; i < 3; i++) {
      expect(h.ctx.state.party[i]).toBe(originals[i]);
      expect(h.ctx.state.party[i]).toEqual(snapshots[i]);
    }
    expect(h.ctx.state.box).toEqual([]);
  });

  it("receives a fresh unnamed plant and runs then after the receipt jingle, without level growth", async () => {
    const h = harness(DATA);
    h.ctx.state.party = [h.plant()];
    let finishJingle!: () => void;
    h.ctx.audio.playJingle = async (id) => {
      h.jingles.push(id);
      await new Promise<void>((resolve) => { finishJingle = resolve; });
    };
    const flow = h.open({ gives: { species: "oak_acorn", level: 30 } });
    await h.confirmation();
    await h.tick("a");
    await h.until(() => h.texts.includes("OAK ACORN joined you!"));
    const received = h.ctx.state.party[0];
    expect(received.nickname).toBeUndefined();
    expect(received.level).toBe(30);
    await h.until(() => h.scenes.all().length === 0, "a");
    expect(flow.done()).toBe(false);
    expect(h.ctx.state.flags.traded).toBeUndefined();
    finishJingle();
    await h.until(flow.done, "a");
    await flow.result;
    expect(received.species).toBe("oak_acorn");
    expect(h.jingles).toEqual(["item_get"]);
    expect(h.ctx.state.party).toHaveLength(1);
    expect(h.ctx.state.party.some((q) => !q.seed)).toBe(true);
  });

  it.each(["picker", "no", "confirmation cancel"])("runs else on %s with no changes or jingle", async (reason) => {
    const h = harness();
    h.ctx.state.party = [h.plant()];
    const before = structuredClone(h.ctx.state);
    const flow = h.open();
    await h.until(() => h.texts.includes("Trade which one?"));
    if (reason === "picker") await h.tick("b");
    else {
      await h.confirmation();
      if (reason === "no") { await h.tick("down"); await h.tick("a"); }
      else await h.tick("b");
    }
    await h.until(flow.done);
    await flow.result;
    expect(h.ctx.state).toEqual({ ...before, flags: { ...before.flags, declined: true } });
    expect(h.jingles).toEqual([]);
  });

  it.each(["unwanted", "seed", "empty party", "empty wants"])("runs else immediately for %s", async (reason) => {
    const h = harness();
    h.ctx.state.party = reason === "empty party" ? [] : [h.plant(reason === "unwanted" ? "great_oak" : "oak_acorn")];
    if (reason === "seed") h.ctx.state.party[0].seed = { steps: 10 };
    const before = structuredClone(h.ctx.state);
    const flow = h.open(reason === "empty wants" ? { wants: [] } : {});
    await flow.result;
    expect(h.ctx.state).toEqual({ ...before, flags: { ...before.flags, declined: true } });
    expect(h.scenes.all()).toHaveLength(0);
    expect(h.prompts).toEqual([]);
    expect(h.jingles).toEqual([]);
  });

  it("fits trade text in the shared dialogue box for every species and a maximum nickname", () => {
    for (const species of Object.values(DATA.species)) {
      const name = species.name.toUpperCase();
      for (const text of ["Trade which one?", `For my ${name}.`, `Trade ${name}?`, `${name} joined you!`, "ABCDEFGHIJ joined you!"]) {
        expect(wrapText(text, TEXTBOX.cols).length, text).toBeLessThanOrEqual(TEXTBOX.lines);
        expect(wrapText(text, TEXTBOX.cols).every((line) => line.length <= TEXTBOX.cols), text).toBe(true);
      }
    }
  });

  it("scans an else-only trade for nested script awards", () => {
    expect(scriptsAwardMark({ trade: [{ op: "trade", wants: [], gives: { species: "oak_acorn", level: 1 },
      else: [{ op: "giveMark", mark: "sundew_mark" }] }] }, "sundew_mark")).toBe(true);
  });
});
