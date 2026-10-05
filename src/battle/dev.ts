// Dev route: ?dev=battle
//   &mode=wild|trainer|leader|rootstock   start straight into one battle (default: a hub menu)
//   &species=<id>&level=<n>     wild foe
//   &trainer=<id>               trainer from WORLD (fallback: a fixture trainer)
//   &backdrop=grass|bog|water|indoor|night
//   &lv=<n>                     party level (default 12)
// Uses the real DATA when it is populated, else the fixture data in ./fixtures.

import { installDevHook } from "../screens/kit/devhook";
import type { BattleRequest, GameContext, MusicId, Scene, SpeciesId, TrainerDef } from "../contracts";
import { SPECIES_IDS } from "../contracts";
import { FIXTURE_DATA, FIXTURE_TRAINERS } from "./fixtures";
import { createQuickened, healParty } from "./logic/stats";
import { Flow } from "../screens/kit/flow";
import { clearScreen } from "../screens/kit/draw";
import { Menu, ScreenUi } from "../screens/kit/widgets";
import { UI } from "../contracts";

export default function devBattle(ctx: GameContext): Scene {
  installDevHook(ctx);
  const q = new URLSearchParams(location.search);
  if (Object.keys(ctx.data.species).length === 0) {
    (ctx as { data: GameContext["data"] }).data = FIXTURE_DATA;
  }
  const trainers = ctx.world.trainers as Record<string, TrainerDef>;
  for (const [id, t] of Object.entries(FIXTURE_TRAINERS)) if (!trainers[id]) trainers[id] = t;

  const lv = Number(q.get("lv") ?? 12);
  const st = ctx.state;
  st.playerName = st.playerName || "ROSE";
  const has = (id: string) => !!ctx.data.species[id as SpeciesId];
  const starters = (["oak_acorn", "chili_blossom", "lily_seedpod", "dandelion_bud", "moonflower_seed"] as SpeciesId[]).filter(has);
  st.party = starters.slice(0, 4).map((s, i) => {
    const m = createQuickened(ctx.data, s, i === 0 ? lv : Math.max(3, lv - 2 - i), ctx.rng);
    m.metAt = { map: "route_1", level: m.level };
    return m;
  });
  // One near a level-up (and a growth) to exercise those flows.
  if (st.party[0]) {
    const lead = st.party[0];
    const sp = ctx.data.species[lead.species];
    lead.exp = ctx.data.expForLevel(sp.growthRate, lead.level + 1) - 5;
  }
  st.bag = { terrarium_pod: 10, glass_pod: 3, water_flask: 5, spring_water: 2, rain_jar: 1, compost: 2, neem_spray: 3, plant_food: 1, field_herbarium: 1 };
  st.money = 3000;
  for (const id of SPECIES_IDS.slice(0, 12)) if (!st.herbarium.seen.includes(id)) st.herbarium.seen.push(id);
  for (const id of SPECIES_IDS.slice(0, 3)) if (!st.herbarium.caught.includes(id)) st.herbarium.caught.push(id);

  const backdrop = (q.get("backdrop") as BattleRequest["backdrop"]) ?? undefined;
  const wildSpecies = (q.get("species") as SpeciesId) ?? (has("bramble_blossom") ? "bramble_blossom" : starters[0]);
  const wildLevel = Number(q.get("level") ?? Math.max(2, lv - 2));
  const trainerId = q.get("trainer") ?? (trainers["gardener_rosa"] ? "gardener_rosa" : "dev_gardener");
  const leaderId = trainers["hollis"] ? "hollis" : "dev_hollis";
  const rootstockId = trainers["shears"] ? "shears" : leaderId;

  const run = async (kind: string) => {
    let req: BattleRequest;
    if (kind === "wild") req = { kind: "wild", wild: { species: wildSpecies, level: wildLevel }, backdrop };
    else if (kind === "random") {
      const pool = Object.keys(ctx.data.species) as SpeciesId[];
      const s = pool[Math.floor(Math.random() * pool.length)];
      req = { kind: "wild", wild: { species: s, level: wildLevel }, backdrop };
    } else req = { kind: "trainer", trainer: kind === "leader" ? leaderId : kind === "rootstock" ? rootstockId : trainerId, backdrop };
    const t = req.trainer ? trainers[req.trainer] : undefined;
    const music: MusicId = req.kind === "trainer" ? t?.music ?? "battle_trainer" : "battle_wild";
    ctx.audio.playMusic(music);
    const outcome = await ctx.battle(req);
    console.info("[dev battle] outcome:", outcome);
    return outcome;
  };

  const flow = new Flow(ctx.input);
  const ui = new ScreenUi(ctx, flow);
  let last = "";
  const main = async () => {
    const mode = q.get("mode");
    if (mode) last = await run(mode);
    const options = ["WILD", "RANDOM WILD", "TRAINER", "LEADER", "ROOTSTOCK", "HEAL PARTY", "PARTY", "BAG"];
    let start = 0;
    for (;;) {
      ui.tb.show(last ? `Outcome: ${last.toUpperCase()}` : "Battle dev route.", "instant");
      const m = new Menu(ctx, options, { x: 0, y: 0, w: 112, spacing: 8, start, cancel: false });
      const c = await ui.choose(m);
      start = c;
      if (c === 0) last = await run("wild");
      else if (c === 1) last = await run("random");
      else if (c === 2) last = await run("trainer");
      else if (c === 3) last = await run("leader");
      else if (c === 4) last = await run("rootstock");
      else if (c === 5) { healParty(st.party, ctx.data); last = "healed"; }
      else if (c === 6) await ctx.screens.party({ mode: "view" });
      else if (c === 7) await ctx.screens.bag({ inBattle: false });
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
