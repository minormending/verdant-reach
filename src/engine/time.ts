// Map-scoped time of day. `ctx.timeOfDay()` is the real clock; a map may
// force its own time (`MapDef.time`, e.g. the prologue's night on the
// Herbarium roof). Use these for anything that happens *on* a map: tint and
// lights, ambience, encounters, `ifTime`, music, battle backdrops, growth.

import type { GameContext, MapDef, TimeOfDay } from "../contracts";

/** The time of day on a map: its forced `time`, else the clock. */
export function mapTime(def: Pick<MapDef, "time"> | undefined, clock: () => TimeOfDay): TimeOfDay {
  return def?.time ?? clock();
}

/** The time of day where the player is standing. */
export function worldTime(ctx: Pick<GameContext, "world" | "state" | "timeOfDay">): TimeOfDay {
  const id = ctx.state?.position?.map;
  return mapTime(id ? ctx.world?.maps?.[id] : undefined, () => ctx.timeOfDay());
}
