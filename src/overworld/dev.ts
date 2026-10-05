// ?dev=overworld            -> fixture test maps (src/overworld/devFixtures.ts)
// ?dev=overworld&map=<id>   -> a real WORLD map (optional &x=&y=)
// Add &time=morning|day|night to force the time of day.

import type { GameContext, MapDef, MapId, Scene } from "../contracts";
import { MAP_IDS } from "../contracts";
import { WORLD } from "../world";
import { createQuickened } from "../battle";
import { createOverworldScene } from "./index";
import { DEV_START, devWorld } from "./devFixtures";
import { buildMap, isWalkable } from "./map";

/** A sensible arrival tile for a map: a warp destination into it, its heal point, or a walkable tile near the centre. */
function startFor(id: MapId, def: MapDef): { x: number; y: number } {
  for (const m of Object.values(WORLD.maps)) {
    const w = m?.warps?.find((w) => w.to === id);
    if (w) return { x: w.toX, y: w.toY };
  }
  if (def.healPoint) return def.healPoint;
  const rt = buildMap(def);
  const cx = Math.floor(rt.w / 2);
  const cy = Math.floor(rt.h / 2);
  for (let r = 0; r < Math.max(rt.w, rt.h); r++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) if (isWalkable(rt, x, y)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

export default function devOverworld(ctx: GameContext): Scene {
  const q = new URLSearchParams(location.search);
  const mapParam = q.get("map") as MapId | null;
  const st = ctx.state;
  st.playerName = st.playerName || "ROWAN";
  if (st.party.length === 0) {
    try {
      st.party.push(createQuickened(ctx.data, "oak_acorn", 8, ctx.rng));
    } catch (e) {
      console.warn("[dev] createQuickened failed", e);
    }
  }
  st.bag.field_herbarium = 1;
  st.bag.terrarium_pod = st.bag.terrarium_pod ?? 5;

  if (q.get("fixture") === "nursery") {
    // Nursery playground: the fixture nursery, pollination groups filled in where data has none yet,
    // and &seed=<steps> to start with a seed in the party.
    ctx.world = devWorld(WORLD);
    for (const sp of Object.values(ctx.data.species)) if (!sp.pollination?.length) sp.pollination = ["woodland"];
    if (st.party.length < 3) st.party.push(createQuickened(ctx.data, "maple_samara", 9, ctx.rng), createQuickened(ctx.data, "oak_acorn", 7, ctx.rng));
    if (q.has("seed")) {
      const s = createQuickened(ctx.data, "dandelion_bud", 5, ctx.rng);
      s.seed = { steps: Number(q.get("seed")) || 5 };
      st.party.push(s);
    }
    st.money = Math.max(st.money, 5000);
    st.position = { map: "glasshouse_nursery", x: 4, y: 3, facing: "up" };
    st.heal = { map: "player_home", x: 7, y: 4 };
    return createOverworldScene(ctx, { mode: "none" });
  }
  if (mapParam && MAP_IDS.includes(mapParam) && WORLD.maps[mapParam]) {
    const def = WORLD.maps[mapParam];
    const start = startFor(mapParam, def);
    const x = q.has("x") ? Number(q.get("x")) : start.x;
    const y = q.has("y") ? Number(q.get("y")) : start.y;
    st.position = { map: mapParam, x, y, facing: "down" };
    return createOverworldScene(ctx, { mode: "continue" });
  }
  if (mapParam) console.warn(`[dev] map "${mapParam}" not in WORLD yet; using fixtures`);
  ctx.world = devWorld(WORLD);
  st.position = { ...DEV_START };
  st.heal = { map: "player_home", x: 7, y: 4 };
  return createOverworldScene(ctx, { mode: "none" });
}
