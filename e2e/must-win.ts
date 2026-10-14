// Must-win battles: the story stops unless the player wins them (leaders,
// ROOTSTOCK bosses and grunts, Conservatory juniors, unavoidable trainers).
// A real player who loses one trains and tries again, and so does the
// playthrough: a whiteout is a warning, then it trains near the fight, heals
// and retries, and fails only when it still cannot win. Pure parts only: the
// browser-side driving lives in playthrough.ts.
import type { MapId, WorldData } from "../src/contracts";
import { checkCond } from "../src/overworld/map";
import { isRematchTrainer } from "../src/world/rematches";

/** One whiteout: the battle the party lost, and where. */
export interface Loss { opponent: string; map?: string; t: number }

export const describeLoss = (loss: Loss) => `lost to ${loss.opponent}${loss.map ? ` on ${loss.map}` : ""} at ${loss.t}s`;

/** Attempts per must-win fight, the first included. */
export const MUST_WIN_ATTEMPTS = 3;

export interface MustWinDeps {
  /** Whiteouts so far, in order. */
  losses(): readonly Loss[];
  /** Train and heal after a lost attempt; returns a summary for the note. */
  train(lostAttempt: number): Promise<string>;
  warn(msg: string): void;
  fail(msg: string): void;
}

/**
 * Run `attempt` until it succeeds without a whiteout, training between tries.
 * An attempt that fails without a whiteout is not a lost battle: return its
 * result at once so the beat reports the real problem. `attempt` receives its
 * number (1 = the original story path; later ones must walk back themselves).
 */
export async function mustWin(label: string, attempt: (n: number) => Promise<boolean>, deps: MustWinDeps,
  attempts = MUST_WIN_ATTEMPTS): Promise<boolean> {
  for (let n = 1; ; n++) {
    const before = deps.losses().length;
    const ok = await attempt(n);
    const lost = deps.losses().slice(before);
    if (!lost.length) return ok;
    const why = lost.map(describeLoss).join("; ");
    if (ok) {
      deps.warn(`${label}: won on attempt ${n} despite a whiteout (${why})`);
      return true;
    }
    if (n >= attempts) {
      deps.fail(`${label}: still not won after ${attempts} attempts (${why})`);
      return false;
    }
    const trained = await deps.train(n);
    deps.warn(`${label}: attempt ${n} ${why}; trained (${trained}) and retrying`);
  }
}

// ---------------------------------------------------------------------------
// Where to train
// ---------------------------------------------------------------------------

export interface TrainingPlan {
  /** The nearest GREENHOUSE in a town the run has visited. */
  heal: MapId | null;
  /** Beaten route trainers that offer rematches, nearest first. */
  trainers: { map: MapId; npc: string; trainer: string }[];
  /** The nearest visited outdoor map with grass encounters, for wild battles. */
  wild: MapId | null;
}

/** Warp distance from `from` to every map it reaches (story gates ignored, as in
 * nav), with the tile each map is first entered on along those warps. */
export function warpDistances(world: Pick<WorldData, "maps">, from: MapId): Map<MapId, { distance: number; x: number; y: number }> {
  const reach = new Map<MapId, { distance: number; x: number; y: number }>([[from, { distance: 0, x: 0, y: 0 }]]);
  const queue: MapId[] = [from];
  while (queue.length) {
    const map = queue.shift()!;
    for (const w of world.maps[map]?.warps ?? []) {
      if (reach.has(w.to)) continue;
      reach.set(w.to, { distance: reach.get(map)!.distance + 1, x: w.toX, y: w.toY });
      queue.push(w.to);
    }
  }
  return reach;
}

export const isGreenhouse = (world: Pick<WorldData, "maps">, map: MapId) => {
  const def = world.maps[map];
  return !!def?.healPoint && def.npcs.some((n) => n.id === "keeper" && n.script === "greenhouse_heal");
};

/**
 * Plan a training round near a lost fight. Only places the run has already
 * reached qualify (a beaten trainer, a visited map or its GREENHOUSE), so no
 * story gate can strand the trainer. Rematches pay only EXP, like a player's
 * grinding; wild grass is the fallback when no rematch is within reach.
 */
export function trainingPlan(world: WorldData, flags: Record<string, boolean>, near: MapId,
  seen: ReadonlySet<MapId>, opts: { maxDistance?: number; maxTrainers?: number } = {}): TrainingPlan {
  const maxDistance = opts.maxDistance ?? 6, maxTrainers = opts.maxTrainers ?? 3;
  const reach = warpDistances(world, near);
  const order = [...reach].filter(([, r]) => r.distance <= maxDistance)
    .sort((a, b) => a[1].distance - b[1].distance || a[0].localeCompare(b[0])).map(([map]) => map);
  const heal = order.find((map) => isGreenhouse(world, map)
    && (seen.has(map) || world.maps[map].warps.some((w) => seen.has(w.to)))) ?? null;
  const trainers: TrainingPlan["trainers"] = [];
  for (const map of order) {
    const def = world.maps[map], entry = reach.get(map)!;
    if (!def.outdoor) continue;
    // Nearest the side the fight is on first: less walking, and back sooner.
    const npcs = [...def.npcs].sort((a, b) => Math.abs(a.x - entry.x) + Math.abs(a.y - entry.y)
      - (Math.abs(b.x - entry.x) + Math.abs(b.y - entry.y)));
    for (const npc of npcs) {
      if (trainers.length >= maxTrainers) break;
      if (!npc.trainer || !flags[`beat_${npc.trainer}`] || !isRematchTrainer(world, npc.trainer)
        || !checkCond(npc.visibleWhen, flags)) continue;
      trainers.push({ map, npc: npc.id, trainer: npc.trainer });
    }
  }
  const wild = order.find((map) => world.maps[map].outdoor && seen.has(map)
    && (world.maps[map].encounters?.grass?.slots.length ?? 0) > 0) ?? null;
  return { heal, trainers, wild };
}
