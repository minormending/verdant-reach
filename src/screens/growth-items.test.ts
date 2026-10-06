import { describe, expect, it, vi } from "vitest";
import type { Button, GameContext, GameData, ItemId, Quickened, SpeciesId } from "../contracts";
import { createQuickened } from "../battle/logic/stats";
import { seeded } from "../battle/logic/rng";
import { DATA } from "../data";
import { createSceneStack } from "../engine/core";
import { wrapText } from "../ui/font";
import { bagScreen } from "./bag";
import { partyScreen } from "./party";

function itemData(item: ItemId = "ember_ash"): GameData {
  return {
    ...DATA,
    species: {
      ...DATA.species,
      oak_acorn: {
        ...DATA.species.oak_acorn,
        growsInto: { species: "oak_sapling", trigger: { kind: "item", item } },
      },
    },
  };
}

/** Run real scenes and flows; replace only browser assets, audio and canvas text. */
function harness(data = itemData()) {
  const scenes = createSceneStack();
  let button: Button | undefined;
  const texts: string[] = [];
  const drawText = vi.fn();
  const ctx = {
    data,
    scenes,
    state: {
      party: [], bag: {}, herbarium: { seen: [], caught: [] },
      options: { textSpeed: "fast" },
    },
    input: {
      pressed: (b: Button) => b === button,
      repeat: (b: Button) => b === button,
      held: (b: Button) => b === button,
    },
    assets: { exists: () => false, has: () => false, image: () => ({ width: 16, height: 16 }) },
    audio: {
      playSfx: vi.fn(), playCry: async () => {}, playJingle: async () => {},
      current: () => null, stopMusic: vi.fn(), playMusic: vi.fn(),
    },
    ui: {
      drawText, drawWindow: vi.fn(), measure: (t: string) => t.length * 8,
      wrap: (t: string, cols: number) => { texts.push(t); return wrapText(t, cols); },
    },
  } as unknown as GameContext;

  const plant = (species: SpeciesId = "oak_acorn"): Quickened =>
    createQuickened(data, species, 16, seeded(1));

  const tick = async (press?: Button) => {
    button = press;
    scenes.top()?.update(1000 / 60);
    // Nested async flows settle between engine frames, as they do in the browser.
    for (let i = 0; i < 12; i++) await Promise.resolve();
    button = undefined;
  };
  const until = async (done: () => boolean, press?: Button) => {
    for (let i = 0; i < 2000 && !done(); i++) {
      await tick(press);
      // Allow the bag's dynamic party import to settle too.
      if (i % 20 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(done(), `scene flow timed out; last text: ${texts.at(-1)}`).toBe(true);
  };
  const openItemPicker = async (item: ItemId = "ember_ash") => {
    ctx.state.bag = { [item]: 2 };
    const result = bagScreen(ctx, { inBattle: false });
    await until(() => texts.includes(DATA.items[item].description));
    await tick("a"); // choose item
    await tick("a"); // USE
    await until(() => texts.includes("Use on which?"));
    expect(scenes.all()).toHaveLength(2);
    return { result };
  };
  const closePickerAndBag = async () => {
    await tick("b");
    await until(() => scenes.all().length === 1);
    await tick("b");
    await until(() => scenes.all().length === 0);
  };
  const drawParty = () => {
    drawText.mockClear();
    // Draw after the row slide finishes. Growth rendering needs a browser canvas;
    // only the party rows are relevant to these layout assertions.
    scenes.top()!.draw({ fillRect() {}, drawImage() {}, save() {}, restore() {} } as unknown as CanvasRenderingContext2D);
    return drawText.mock.calls;
  };
  return { ctx, scenes, texts, plant, tick, until, openItemPicker, closePickerAndBag, drawParty };
}

describe("field growth items", () => {
  it.each(["ember_ash", "cold_snap"])("grows with %s, consumes exactly one and registers the new species", async (item) => {
    const h = harness(itemData(item));
    const q = h.plant();
    const oldHp = q.stats.hp;
    h.ctx.state.party = [q];
    h.ctx.state.herbarium = { seen: [q.species], caught: [q.species] };
    const { result } = await h.openItemPicker(item);
    await h.tick("a");
    await h.until(() => h.scenes.all().length === 1 && q.species === "oak_sapling", "a");
    expect(q.stats.hp).toBeGreaterThan(oldHp);
    expect(h.ctx.state.bag[item]).toBe(1);
    expect(h.ctx.state.herbarium).toEqual({
      seen: ["oak_acorn", "oak_sapling"], caught: ["oak_acorn", "oak_sapling"],
    });
    expect(q.moves.some((m) => m.id === "bark_skin")).toBe(true);
    await h.tick("b");
    await expect(result).resolves.toBeNull();
  });

  it("uses up nothing when the player cancels the party picker", async () => {
    const h = harness();
    const q = h.plant();
    h.ctx.state.party = [q];
    const before = structuredClone(q);
    const { result } = await h.openItemPicker();
    await h.closePickerAndBag();
    await expect(result).resolves.toBeNull();
    expect(h.ctx.state.bag.ember_ash).toBe(2);
    expect(q).toEqual(before);
    expect(h.ctx.state.herbarium).toEqual({ seen: [], caught: [] });
  });

  it("uses up nothing when B cancels the growth animation, then permits retry", async () => {
    const h = harness();
    const q = h.plant();
    h.ctx.state.party = [q];
    const before = structuredClone(q);
    const { result } = await h.openItemPicker();
    await h.tick("a");
    await h.until(() => h.scenes.all().length === 3);
    await h.until(() => h.scenes.all().length === 2, "b");
    expect(h.texts).toContain("Huh? OAK ACORN stopped growing!");
    expect(h.ctx.state.bag.ember_ash).toBe(2);
    expect(q).toEqual(before);
    expect(h.ctx.state.herbarium).toEqual({ seen: [], caught: [] });
    await h.tick("a");
    await h.until(() => h.scenes.all().length === 1 && q.species === "oak_sapling", "a");
    expect(h.ctx.state.bag.ember_ash).toBe(1);
    await h.tick("b");
    await expect(result).resolves.toBeNull();
  });

  it("opens the picker even with no eligible party member and preserves NOT ABLE selections", async () => {
    const h = harness();
    const q = h.plant("great_oak");
    h.ctx.state.party = [q];
    const before = structuredClone(q);
    const { result } = await h.openItemPicker();
    await h.tick("a");
    await h.until(() => h.texts.includes("It won't have any effect."));
    await h.until(() => h.texts.filter((t) => t === "Use on which?").length === 2, "a");
    expect(h.ctx.state.bag.ember_ash).toBe(2);
    expect(q).toEqual(before);
    expect(h.ctx.state.herbarium).toEqual({ seen: [], caught: [] });
    expect(h.scenes.all()).toHaveLength(2);
    await h.closePickerAndBag();
    await expect(result).resolves.toBeNull();
  });

  it("rejects a seed without consuming the item", async () => {
    const h = harness();
    const q = h.plant();
    q.seed = { steps: 10 };
    h.ctx.state.party = [q];
    const before = structuredClone(q);
    const { result } = await h.openItemPicker();
    await h.tick("a");
    await h.until(() => h.texts.includes("That can't be used on a SEED."));
    await h.until(() => h.texts.filter((t) => t === "Use on which?").length === 2, "a");
    expect(h.ctx.state.bag.ember_ash).toBe(2);
    expect(q).toEqual(before);
    expect(h.ctx.state.herbarium).toEqual({ seen: [], caught: [] });
    await h.closePickerAndBag();
    await expect(result).resolves.toBeNull();
  });

  it("honors usableInField even when the item has a matching growth trigger", async () => {
    const data = itemData();
    data.items = { ...data.items, ember_ash: { ...data.items.ember_ash, usableInField: false } };
    const h = harness(data);
    h.ctx.state.party = [h.plant()];
    h.ctx.state.bag = { ember_ash: 1 };
    const result = bagScreen(h.ctx, { inBattle: false });
    await h.until(() => h.texts.includes(DATA.items.ember_ash.description));
    await h.tick("a");
    await h.tick("a");
    await h.until(() => h.texts.some((t) => t.includes("Now isn't the time")));
    expect(h.scenes.all()).toHaveLength(1);
    expect(h.ctx.state.bag.ember_ash).toBe(1);
    await h.until(() => h.texts.filter((t) => t === DATA.items.ember_ash.description).length === 2, "a");
    await h.tick("b");
    await expect(result).resolves.toBeNull();
  });
});

describe("growth item party labels", () => {
  it("shows ABLE / NOT ABLE for every member, including seeds, beyond the HP bar", async () => {
    const h = harness();
    const eligible = h.plant();
    eligible.status = "scorch";
    const seed = h.plant();
    seed.seed = { steps: 10 };
    h.ctx.state.party = [eligible, h.plant("great_oak"), seed];
    const result = partyScreen(h.ctx, { mode: "pick", useItem: "ember_ash" });
    for (let i = 0; i < 20; i++) await h.tick();
    const labels = h.drawParty().filter(([, text]) => text === "ABLE" || text === "NOT ABLE");
    expect(labels.map(([, text, x, y]) => [text, x, y])).toEqual([
      ["ABLE", 125, 8], ["NOT ABLE", 93, 24], ["NOT ABLE", 93, 40],
    ]);
    // HP tab + framed 48px bar ends at x=82. All labels start beyond it.
    for (const [, text, x] of labels) {
      expect(x).toBeGreaterThanOrEqual(82);
      expect(x + text.length * 8).toBeLessThanOrEqual(160);
    }
    await h.tick("b");
    await expect(result).resolves.toBe(-1);
  });

  it("keeps ordinary party rows for medicine and items with no species trigger", async () => {
    for (const item of ["water_flask", "cold_snap"]) {
      const h = harness();
      h.ctx.state.party = [h.plant()];
      const result = partyScreen(h.ctx, { mode: "pick", useItem: item });
      for (let i = 0; i < 20; i++) await h.tick();
      const rows = h.drawParty();
      expect(rows.some(([, text]) => text === "ABLE" || text === "NOT ABLE")).toBe(false);
      expect(rows.some(([, text]) => text.includes("/"))).toBe(true);
      await h.tick("b");
      await expect(result).resolves.toBe(-1);
    }
  });
});
