// Prepared states for the smoke suite (e2e/smoke.ts, `npm run e2e:smoke`).
//
// A fixture is a small recipe, not a copied save file: it starts from the
// game's own new-game state (newGameState), sets the listed story flags, gives
// a party built with the battle code (createQuickened, seeded) and puts the
// player on the arrival tile of a real warp. The smoke suite writes it with the
// game's save code and loads it through the title's CONTINUE, so the save
// format, normalizeState and the overworld's continue path are all exercised.
//
// Story changes can't rot a fixture silently: buildFixture checks every
// assumption against the live world data (each flag is still set by some
// script, battle or trainer; the maps, warps, heal point and NPCs exist; the
// rematch trainer is still rematchable and the leader still awards a mark) and
// throws a FixtureError naming everything that no longer holds.

import type { GameContext, GameState, MapId, ScriptCmd, SpeciesId } from "../src/contracts";
import { createQuickened, healParty } from "../src/battle";
import { newGameState } from "../src/save";
import { isRematchTrainer } from "../src/world";
import { STARTER_SPECIES } from "../src/world/trainers";

/** Story flags set from the prologue through VALE's letter (`got_pods`), playing the OAK starter
 *  (so BRAM took the CHILI). The order follows the story. */
export const CHAPTER_1_FLAGS: readonly string[] = [
  "visited_fallowfield", "prologue_done", "morning_done", "vale_greeted", "saw_seedlings",
  "got_starter_oak", "errand_fennimore", "got_starter", "got_seed", "pip_demo_done",
  "beat_schoolkid_milo", "rival_has_chili", "theft_seen", "beat_rival_1_chili", "rival_1_done", "got_pods",
];

export interface FixtureSpec {
  /** What the prepared state is for (shown in the beat note). */
  about: string;
  flags: readonly string[];
  /** Party, lead first. The starter's own species comes from STARTER_SPECIES. */
  party: { species: SpeciesId; level: number }[];
  /** Arrive on `map` through its warp from `from`: no hand-picked coordinates. */
  at: { map: MapId; from: MapId };
  /** A map with a healPoint: where a whiteout sends the player. */
  heal: MapId;
  bag: Record<string, number>;
  money: number;
  /** Extra preconditions on the world data; return one message per broken assumption. */
  expects?(ctx: GameContext): string[];
}

const OAK = STARTER_SPECIES.oak[0];
/** What VALE gives at `got_pods` (scripts/story.ts). */
const CHAPTER_1_BAG = { terrarium_pod: 5, water_flask: 2 };

export const FIXTURES = {
  /** Chapter 1 done; MILO (ROUTE 1) beaten once, never rematched. */
  rematch: {
    about: "chapter 1 done, MILO beaten once, on ROUTE 1",
    flags: CHAPTER_1_FLAGS,
    party: [{ species: OAK, level: 8 }],
    at: { map: "route_1", from: "fallowfield" },
    heal: "herbarium",
    bag: CHAPTER_1_BAG,
    money: 3000,
    expects: (ctx) => {
      const npc = ctx.world.maps.route_1?.npcs.find((n) => n.id === "milo");
      return [
        ...(npc?.trainer === "schoolkid_milo" ? [] : ["route_1 has no NPC milo fighting schoolkid_milo"]),
        ...(isRematchTrainer(ctx.world, "schoolkid_milo") ? [] : ["schoolkid_milo is no longer a route rematch trainer"]),
      ];
    },
  },
  /** Chapter 1 done and in BRAMBLEGATE, at the CONSERVATORY door, HOLLIS not yet beaten. */
  leader: {
    about: "chapter 1 done, inside the BRAMBLEGATE CONSERVATORY door, HOLLIS unbeaten",
    flags: [...CHAPTER_1_FLAGS, "visited_bramblegate"],
    party: [{ species: OAK, level: 12 }],
    at: { map: "bramblegate_conservatory", from: "bramblegate" },
    heal: "bramblegate_greenhouse",
    bag: CHAPTER_1_BAG,
    money: 3500,
    expects: (ctx) => {
      const npc = ctx.world.maps.bramblegate_conservatory?.npcs.find((n) => n.id === "hollis");
      return [
        ...(npc ? [] : ["bramblegate_conservatory has no NPC hollis"]),
        ...(ctx.world.trainers.hollis?.mark ? [] : ["trainer hollis no longer awards a mark"]),
      ];
    },
  },
  /** A lone Lv 5 starter on ROUTE 1 whose last heal point is the HERBARIUM: sure to lose a strong wild battle. */
  whiteout: {
    about: "a lone Lv 5 starter on ROUTE 1, last healed at the HERBARIUM",
    flags: CHAPTER_1_FLAGS,
    party: [{ species: OAK, level: 5 }],
    at: { map: "route_1", from: "fallowfield" },
    heal: "herbarium",
    bag: CHAPTER_1_BAG,
    money: 2000,
  },
} satisfies Record<string, FixtureSpec>;

export type FixtureName = keyof typeof FIXTURES;

export class FixtureError extends Error {}

/** Every flag the world can set: setFlag ops, battles (`beat_<trainer>`), trainer NPCs, quests and town visits. */
export function settableFlags(world: GameContext["world"]): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    const c = v as Partial<ScriptCmd> & Record<string, unknown>;
    if (c.op === "setFlag" && typeof c.flag === "string") out.add(c.flag);
    if (c.op === "battle" && typeof c.trainer === "string") out.add(`beat_${c.trainer}`);
    if ((c.op === "startQuest" || c.op === "completeQuest") && typeof c.quest === "string") {
      out.add(`quest_${c.quest}_started`);
      out.add(`quest_${c.quest}_done`);
    }
    for (const child of Object.values(c)) if (child && typeof child === "object") walk(child);
  };
  walk(Object.values(world.scripts));
  for (const map of Object.values(world.maps)) {
    out.add(`visited_${map.id}`);
    for (const npc of map.npcs) if (npc.trainer) out.add(`beat_${npc.trainer}`);
  }
  return out;
}

/** Build the prepared state, or throw a FixtureError listing every assumption that no longer holds. */
export function buildFixture(ctx: GameContext, name: FixtureName, rng: () => number): GameState {
  const spec: FixtureSpec = FIXTURES[name];
  const problems: string[] = [];
  const known = settableFlags(ctx.world);
  for (const f of spec.flags) if (!known.has(f)) problems.push(`flag ${f} is no longer set by any script, battle or trainer`);
  const warp = ctx.world.maps[spec.at.from]?.warps.find((w) => w.to === spec.at.map);
  if (!warp) problems.push(`no warp from ${spec.at.from} to ${spec.at.map}`);
  const healPoint = ctx.world.maps[spec.heal]?.healPoint;
  if (!healPoint) problems.push(`${spec.heal} has no healPoint`);
  for (const m of spec.party) if (!ctx.data.species[m.species]) problems.push(`no species ${m.species}`);
  for (const item of Object.keys(spec.bag)) if (!ctx.data.items[item as keyof typeof ctx.data.items]) problems.push(`no item ${item}`);
  problems.push(...(spec.expects?.(ctx) ?? []));
  if (problems.length || !warp || !healPoint) throw new FixtureError(`fixture ${name}: ${problems.join("; ")}`);

  const st = newGameState(ctx);
  st.playerName = "BASIL";
  st.playerLook = "boy";
  st.options = { ...st.options, textSpeed: "fast" };
  for (const f of spec.flags) st.flags[f] = true;
  st.party = spec.party.map((m) => createQuickened(ctx.data, m.species, m.level, rng));
  healParty(st.party, ctx.data);
  st.herbarium = { seen: [...new Set(st.party.map((q) => q.species))], caught: [...new Set(st.party.map((q) => q.species))] };
  st.bag = { ...spec.bag };
  st.money = spec.money;
  st.position = { map: spec.at.map, x: warp.toX, y: warp.toY, facing: warp.facing ?? "down" };
  st.heal = { map: spec.heal, x: healPoint.x, y: healPoint.y };
  return st;
}
