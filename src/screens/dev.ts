// Dev route: ?dev=screens[&open=party|bag|herbarium|summary|cabinet|shop|options|growth]
// Opens each menu screen with a fixture party and bag.

import { installDevHook } from "./kit/devhook";
import type { GameContext, Scene, SpeciesId } from "../contracts";
import { SPECIES_IDS, UI } from "../contracts";
import { FIXTURE_DATA } from "../battle/fixtures";
import { createQuickened } from "../battle/logic/stats";
import { Flow } from "./kit/flow";
import { clearScreen } from "./kit/draw";
import { Menu, ScreenUi } from "./kit/widgets";
import { runGrowth } from "./flows/growth";

export default function devScreens(ctx: GameContext): Scene {
  installDevHook(ctx);
  if (Object.keys(ctx.data.species).length === 0) {
    (ctx as { data: GameContext["data"] }).data = FIXTURE_DATA;
  }
  const st = ctx.state;
  st.playerName = st.playerName || "ROSE";
  const has = (id: string) => !!ctx.data.species[id as SpeciesId];
  const ids = (["oak_acorn", "chili_blossom", "lily_seedpod", "dandelion_bud", "bramble_blossom", "moonflower_seed"] as SpeciesId[]).filter(has);
  st.party = ids.map((s, i) => {
    const q = createQuickened(ctx.data, s, 6 + i * 3, ctx.rng);
    q.metAt = { map: "route_2", level: q.level };
    return q;
  });
  if (st.party[1]) st.party[1].hp = Math.floor(st.party[1].stats.hp / 3);
  if (st.party[2]) { st.party[2].hp = 3; st.party[2].status = "blight"; }
  if (st.party[4]) st.party[4].hp = 0;
  if (st.party[0]) st.party[0].sport = true;
  st.box = (["fern_fiddlehead", "nettle_sprout", "sunflower_seedling"] as SpeciesId[]).filter(has).map((s) => createQuickened(ctx.data, s, 8, ctx.rng));
  st.bag = { water_flask: 5, spring_water: 2, rain_jar: 1, compost: 2, neem_spray: 3, plant_food: 1, terrarium_pod: 12, glass_pod: 2, field_herbarium: 1, centuryheart_seed: 1, fennimores_letter: 1 };
  st.money = 4200;
  st.herbarium.seen = SPECIES_IDS.filter((_, i) => i % 3 !== 2).slice(0, 26) as SpeciesId[];
  st.herbarium.caught = st.herbarium.seen.filter((_, i) => i % 2 === 0);

  const flow = new Flow(ctx.input);
  const ui = new ScreenUi(ctx, flow);
  const open = async (name: string) => {
    switch (name) {
      case "party": return void (await ctx.screens.party({ mode: "view" }));
      case "pick": return void (await ctx.screens.party({ mode: "pick", prompt: "Pick one." }));
      case "bag": return void (await ctx.screens.bag({ inBattle: false }));
      case "battlebag": return void console.info("[dev] bag ->", await ctx.screens.bag({ inBattle: true }));
      case "herbarium": return ctx.screens.herbarium();
      case "summary": return ctx.screens.summary(0);
      case "cabinet": return ctx.screens.cabinet();
      case "shop": return ctx.screens.shop(["terrarium_pod", "water_flask", "neem_spray", "spring_water"]);
      case "options": return ctx.screens.options();
      case "growth": {
        const q = createQuickened(ctx.data, has("oak_acorn") ? "oak_acorn" : ids[0], 16, ctx.rng);
        const to = ctx.data.species[q.species]?.growsInto?.species;
        if (to) await runGrowth(ctx, q, to);
        return;
      }
    }
  };
  const names = ["party", "pick", "bag", "battlebag", "herbarium", "summary", "cabinet", "shop", "options", "growth"];
  const main = async () => {
    const first = new URLSearchParams(location.search).get("open");
    if (first) await open(first);
    let start = 0;
    for (;;) {
      ui.tb.show("Screens dev route.", "instant");
      const m = new Menu(ctx, names.map((n) => n.toUpperCase()), { x: 0, y: 0, w: 112, spacing: 8, start, cancel: false });
      start = await ui.choose(m);
      await open(names[start]);
    }
  };
  let started = false;
  return {
    update() {
      if (!started) { started = true; void main(); }
      flow.tick();
    },
    draw(g) {
      clearScreen(g, UI.light);
      ui.draw(g);
    },
  };
}
