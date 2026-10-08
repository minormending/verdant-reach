import { afterEach, describe, expect, it, vi } from "vitest";
import type { Button, GameContext, SpeciesId } from "../contracts";
import { SCREEN_W, SCREEN_H, TEXTBOX } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { createQuickened } from "../battle/logic/stats";
import { seeded } from "../battle/logic/rng";
import { createSceneStack } from "../engine/core";
import { newGameState } from "../save";
import { measureText, wrapText } from "../ui/font";
import { partyScreen } from "./party";
import { bagScreen } from "./bag";
import { cabinetScreen } from "./cabinet";
import { herbariumScreen, showHerbariumEntry } from "./herbarium";
import { summaryScreen } from "./summary";
import { notesScreen } from "./notes";
import { optionsScreen } from "./options";
import { shopScreen } from "./shop";
import { runGrowth } from "./flows/growth";
import * as skin from "../ui/skin";
import { drawWindow as renderWindow } from "../ui/kit";
import { fixtureSkin } from "../ui/skin.fixture";
import { setActiveArt } from "../art/registry";
import { partyRowY } from "./kit/layout";

// Render real scenes with native asset dimensions. Capture labels and panels;
// canvas drawing is stubbed so this also runs without a browser.
function harness(v2 = false) {
  const scenes = createSceneStack();
  const drawText = vi.fn(), drawWindow = vi.fn(renderWindow);
  const drawImage = vi.fn();
  const g = new Proxy({ drawImage, fillStyle: "", globalAlpha: 1 }, {
    get(target, key) { return key in target ? target[key as keyof typeof target] : () => {}; },
  }) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 56, height: 56, getContext: () => g }) });
  let button: Button | undefined;
  const state = newGameState({ world: WORLD });
  state.playerName = "ROSE";
  const ids = ["oak_acorn", "chili_blossom", "lily_seedpod", "dandelion_bud", "bramble_blossom", "moonflower_seed"] as SpeciesId[];
  state.party = ids.map((s, i) => createQuickened(DATA, s, 30 + i, seeded(i)));
  state.party[2].status = "blight";
  state.party[4].hp = 0;
  state.box = [...state.party];
  state.bag = { water_flask: 5, rain_jar: 2, neem_spray: 1, spring_water: 2, compost: 1, plant_food: 2, glass_pod: 10, field_herbarium: 1, centuryheart_seed: 1 };
  state.money = 999999;
  state.herbarium = { seen: ids, caught: ids };
  for (const id of Object.keys(WORLD.quests ?? {})) state.flags[`quest_${id}_started`] = true;
  const ctx = {
    scenes, state, data: DATA, world: WORLD, rng: seeded(1),
    input: { pressed: (b: Button) => button === b, repeat: (b: Button) => button === b, held: () => false },
    ui: { drawText, drawWindow, wrap: wrapText, measure: measureText },
    assets: { exists: () => true, has: () => true, image: (path: string) => {
      const size = path.includes("/items/") ? 16 : path.includes("/icon") ? (v2 ? 32 : 16) : path.includes("/back") ? (v2 ? 64 : 48) : (v2 ? 64 : 56);
      return { width: size, height: size };
    } },
    audio: { playSfx() {}, async playCry() {}, async playJingle() {}, current: () => null, stopMusic() {}, playMusic() {} },
  } as unknown as GameContext;
  const tick = async (press?: Button, n = 1) => {
    for (let i = 0; i < n; i++) {
      button = i === 0 ? press : undefined;
      scenes.top()?.update(1000 / 60);
      for (let j = 0; j < 20; j++) await null;
    }
    button = undefined;
  };
  const render = () => {
    drawText.mockClear(); drawWindow.mockClear(); drawImage.mockClear();
    scenes.top()!.draw(g);
    expect(drawText.mock.calls.length).toBeGreaterThan(0);
    for (const [, text, x, y] of drawText.mock.calls) {
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x + measureText(text), text).toBeLessThanOrEqual(SCREEN_W);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y + 8, text).toBeLessThanOrEqual(SCREEN_H);
    }
    for (const [, x, y, w, h] of drawWindow.mock.calls) {
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(SCREEN_W); expect(y + h).toBeLessThanOrEqual(SCREEN_H);
    }
  };
  return { ctx, scenes, tick, render, drawText, drawWindow, drawImage };
}

afterEach(() => { setActiveArt(null); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("widescreen menu layout", () => {
  it.each([false, true].flatMap(pack => [false, true].flatMap(v2 => ["party", "bag", "shop", "cabinet", "herbarium", "notes", "options", "growth"].map(name => ({ pack, v2, name })))))("keeps $name labels and panels on the canvas (skin=$pack, v2=$v2)", async ({name, pack, v2}) => {
    setActiveArt(pack ? fixtureSkin() : null);
    const panel = vi.spyOn(skin, "panel");
    const surface = vi.spyOn(skin, "surface");
    const h = harness(v2);
    const screens: Record<string, () => unknown> = {
      party: () => partyScreen(h.ctx, { mode: "view" }), bag: () => bagScreen(h.ctx, { inBattle: false }),
      shop: () => shopScreen(h.ctx, ["water_flask", "rain_jar", "neem_spray", "glass_pod"]),
      cabinet: () => cabinetScreen(h.ctx), herbarium: () => herbariumScreen(h.ctx),
      notes: () => notesScreen(h.ctx), options: () => optionsScreen(h.ctx),
      growth: () => runGrowth(h.ctx, h.ctx.state.party[0], "oak_sapling"),
    };
    screens[name]();
    await h.tick(undefined, 30);
    h.render();
    if (name === "cabinet" || name === "shop") { await h.tick("a"); h.render(); }
    if (name === "notes") { await h.tick("a"); h.render(); }
    if (name === "bag") { await h.tick("a"); h.render(); }
    if (pack) {
      const bounds = [
        ...panel.mock.calls.map(([, , rect]) => rect),
        ...surface.mock.calls.map(([, , x, y, w, h]) => ({ x, y, w, h })),
      ];
      expect(bounds.length).toBeGreaterThan(0);
      for (const [, text, x, y] of h.drawText.mock.calls) {
        expect(bounds.some(r => x >= r.x && y >= r.y && x + measureText(text) <= r.x + r.w && y + 8 <= r.y + r.h), text).toBe(true);
      }
    }
  });

  it("keeps all six party slots, their icons and HP labels above dialogue", async () => {
    const h = harness();
    void partyScreen(h.ctx, { mode: "view" });
    await h.tick(undefined, 30); h.render();
    for (let i = 0; i < 6; i++) expect(partyRowY(i) + 32).toBeLessThanOrEqual(TEXTBOX.y);
    const hp = h.drawText.mock.calls.filter(([, t]) => t.includes("/"));
    expect(hp).toHaveLength(6);
    for (const [, , , y] of hp) expect(y + 8).toBeLessThan(TEXTBOX.y);
    await h.tick("a"); h.render(); // SUMMARY / SWITCH / ITEM / CANCEL
  });

  it.each([0, 1, 2])("fits summary page %i, including move details", async (page) => {
    const h = harness();
    void summaryScreen(h.ctx, h.ctx.state.party, 0);
    await h.tick(undefined, 30);
    for (let i = 0; i < page; i++) await h.tick("right", 8);
    h.render();
    if (page === 2) { await h.tick("a"); h.render(); }
    const front = h.drawImage.mock.calls.find((a) => a.length === 9 && a[7] === 56);
    expect(front?.slice(7)).toEqual([56, 56]);
  });

  it("fits the seed summary and all herbarium label lengths", async () => {
    const h = harness();
    h.ctx.state.party[0].seed = { steps: 10 };
    void summaryScreen(h.ctx, h.ctx.state.party, 0);
    await h.tick(undefined, 30); h.render();
    await h.tick("b");
    for (const id of Object.keys(DATA.species) as SpeciesId[]) {
      h.ctx.state.herbarium.caught.push(id);
      void showHerbariumEntry(h.ctx, id);
      await h.tick(undefined, 30); h.render();
      await h.tick("right"); h.render();
      await h.tick("b");
    }
  });
});
