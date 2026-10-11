// New-game state and localStorage persistence (versioned envelope with
// play time and save date). Options are also kept on their own so they
// survive "NEW GAME" and apply at the title screen.

import type { GameContext, GameState, MapId } from "../contracts";
import { MAP_IDS, SPECIES_IDS } from "../contracts";

export const SAVE_KEY = "verdant-reach-save";
export const OPTIONS_KEY = "verdant-reach-options";
export const SAVE_VERSION = 1;
export const DEFAULT_PLAYER_NAME = "ROWAN";
export const DEFAULT_RIVAL_NAME = "BRAM";

export interface SaveEnvelope {
  v: number;
  savedAt: number;      // epoch ms
  gameId: string;       // distinguishes "another save file" on overwrite
  state: GameState;
}

/** Summary for the CONTINUE / SAVE windows. */
export interface SaveMeta {
  playerName: string;
  marks: number;
  herbarium: number;    // caught
  playTimeMs: number;
  savedAt: number;
  gameId: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

let currentGameId = makeId();
function makeId() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
/** Called when a new game starts: later saves will warn about overwriting. */
export function beginNewGameSession() { currentGameId = makeId(); }
export function currentSessionId() { return currentGameId; }

/** Validate options from storage or a save; unknown fields are dropped, toggles default on. */
export function cleanOptions(raw: unknown, fallback: GameState["options"] = { textSpeed: "mid" }): GameState["options"] {
  const o = raw && typeof raw === "object" ? (raw as Partial<GameState["options"]>) : {};
  const speed = o.textSpeed && ["slow", "mid", "fast"].includes(o.textSpeed) ? o.textSpeed : fallback.textSpeed;
  const out: GameState["options"] = { textSpeed: speed };
  const follower = typeof o.follower === "boolean" ? o.follower : fallback.follower;
  const battleAnims = typeof o.battleAnims === "boolean" ? o.battleAnims : fallback.battleAnims;
  if (follower !== undefined) out.follower = follower;
  if (battleAnims !== undefined) out.battleAnims = battleAnims;
  return out;
}

export function loadOptions(storage: StorageLike | null = defaultStorage()): GameState["options"] {
  try {
    const raw = storage?.getItem(OPTIONS_KEY);
    if (raw) return cleanOptions(JSON.parse(raw));
  } catch { /* ignore */ }
  return { textSpeed: "mid" };
}

/** Option toggles that default to on when unset. */
export const followerOn = (o: GameState["options"] | undefined) => o?.follower !== false;
export const battleAnimsOn = (o: GameState["options"] | undefined) => o?.battleAnims !== false;

/** Keep only well-formed `harvestId -> YYYY-MM-DD` entries. */
function cleanHarvested(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v;
  return out;
}

/** Additive v1 migration: pre-Council saves have no history, never a fabricated clear. */
function cleanHallOfFame(raw: unknown): GameState["hallOfFame"] {
  if (!Array.isArray(raw)) return undefined;
  const out: NonNullable<GameState["hallOfFame"]> = [];
  for (const team of raw) {
    // Keep only whole, valid teams so a damaged record cannot invent a smaller clear.
    if (!Array.isArray(team) || team.length > 6 || !team.every((q) =>
      q && typeof q === "object" && SPECIES_IDS.includes(q.species)
      && Number.isInteger(q.level) && q.level >= 1 && q.level <= 100
      && (q.nickname === undefined || typeof q.nickname === "string"),
    )) continue;
    out.push(team.map(({ species, level, nickname }) => ({
      species, level, ...(nickname !== undefined ? { nickname } : {}),
    })));
  }
  return out;
}

/**
 * Round 4: the Nursery Garden. Optional, so older saves load without it. Keeps up
 * to 2 well-formed boarders; a bad step count or flag falls back to a fresh one.
 */
export function cleanNursery(raw: unknown): GameState["nursery"] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Partial<NonNullable<GameState["nursery"]>>;
  const slots = (Array.isArray(r.slots) ? r.slots : [])
    .filter((q) => q && typeof q === "object" && typeof q.species === "string" && typeof q.level === "number")
    .slice(0, 2);
  const steps = typeof r.steps === "number" && isFinite(r.steps) ? Math.max(0, Math.floor(r.steps)) : 0;
  return { slots, steps, seedReady: r.seedReady === true && slots.length > 0 };
}

/** Seeds carried in the party or box: a malformed countdown becomes a whole, non-negative number. */
function cleanSeeds(list: GameState["party"]): GameState["party"] {
  for (const q of list) {
    if (!q || typeof q !== "object" || q.seed === undefined) continue;
    const n = Number((q.seed as { steps?: unknown } | null)?.steps);
    q.seed = { steps: isFinite(n) ? Math.max(0, Math.floor(n)) : 0 };
  }
  return list;
}

export function storeOptions(options: GameState["options"], storage: StorageLike | null = defaultStorage()) {
  try { storage?.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch { /* ignore */ }
}

export function newGameState(ctx: Pick<GameContext, "world">): GameState {
  const s = ctx.world.newGame;
  // First whiteout point: the player's home (or the Herbarium) if they heal.
  const homes: MapId[] = ["player_home", "herbarium"];
  let heal: GameState["heal"] = { map: s.map, x: s.x, y: s.y };
  for (const id of homes) {
    const hp = ctx.world.maps?.[id]?.healPoint;
    if (hp) { heal = { map: id, x: hp.x, y: hp.y }; break; }
  }
  return {
    version: 1,
    playerName: "",
    rivalName: DEFAULT_RIVAL_NAME,
    money: 3000,
    party: [],
    box: [],
    bag: {},
    flags: {},
    marks: [],
    herbarium: { seen: [], caught: [] },
    position: { map: s.map, x: s.x, y: s.y, facing: s.facing },
    heal,
    playTimeMs: 0,
    options: loadOptions(),
    harvested: {},
  };
}

/** Fill in anything missing from an older or hand-edited save. */
export function normalizeState(raw: unknown, fallback: GameState): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GameState>;
  if (!r.position || !MAP_IDS.includes(r.position.map as MapId)) return null;
  const arr = <T>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
  const obj = <T extends object>(v: unknown, d: T): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : d);
  const hallOfFame = cleanHallOfFame(r.hallOfFame);
  return {
    version: 1,
    playerName: typeof r.playerName === "string" && r.playerName ? r.playerName : DEFAULT_PLAYER_NAME,
    rivalName: typeof r.rivalName === "string" && r.rivalName ? r.rivalName : DEFAULT_RIVAL_NAME,
    money: typeof r.money === "number" && isFinite(r.money) ? Math.max(0, Math.floor(r.money)) : fallback.money,
    party: cleanSeeds(arr(r.party, []).slice(0, 6)),
    ...(hallOfFame !== undefined ? { hallOfFame } : {}),
    box: cleanSeeds(arr(r.box, [])),
    bag: obj(r.bag, {}),
    flags: obj(r.flags, {}),
    marks: arr(r.marks, []),
    herbarium: {
      seen: arr(r.herbarium?.seen, []),
      caught: arr(r.herbarium?.caught, []),
    },
    position: { ...r.position, facing: r.position.facing ?? "down" },
    ...(typeof r.rafting === "boolean" ? { rafting: r.rafting } : {}),
    heal: r.heal && MAP_IDS.includes(r.heal.map) ? r.heal : fallback.heal,
    playTimeMs: typeof r.playTimeMs === "number" ? r.playTimeMs : 0,
    options: r.options ? cleanOptions(r.options, fallback.options) : fallback.options,
    harvested: cleanHarvested(r.harvested) ?? {},
    ...(r.nursery !== undefined && cleanNursery(r.nursery) ? { nursery: cleanNursery(r.nursery) } : {}),
  };
}

/** Upgrade older envelopes to the current version. */
function migrate(env: SaveEnvelope): SaveEnvelope | null {
  if (typeof env.v !== "number" || env.v > SAVE_VERSION) return null;
  // v1 is the first version; future migrations go here (env.v === 1 -> 2, ...).
  return env;
}

export function createSave(
  getState: () => GameState = () => { throw new Error("createSave: no state getter"); },
  storage: StorageLike | null = defaultStorage(),
  fallback: () => GameState = getState,
): GameContext["save"] & { meta(): SaveMeta | null; envelope(): SaveEnvelope | null } {
  const readEnvelope = (): SaveEnvelope | null => {
    try {
      const raw = storage?.getItem(SAVE_KEY);
      if (!raw) return null;
      const env = migrate(JSON.parse(raw) as SaveEnvelope);
      return env && env.state ? env : null;
    } catch (e) {
      console.warn("[save] unreadable save data", e);
      return null;
    }
  };
  return {
    write() {
      const state = getState();
      const env: SaveEnvelope = { v: SAVE_VERSION, savedAt: Date.now(), gameId: currentGameId, state };
      storage?.setItem(SAVE_KEY, JSON.stringify(env));
      storeOptions(state.options, storage);
    },
    read() {
      const env = readEnvelope();
      if (!env) return null;
      const state = normalizeState(env.state, fallback());
      if (state) currentGameId = env.gameId ?? currentGameId;
      return state;
    },
    exists: () => readEnvelope() !== null,
    clear: () => storage?.removeItem(SAVE_KEY),
    envelope: readEnvelope,
    meta() {
      const env = readEnvelope();
      if (!env) return null;
      return {
        playerName: env.state.playerName,
        marks: env.state.marks?.length ?? 0,
        herbarium: env.state.herbarium?.caught?.length ?? 0,
        playTimeMs: env.state.playTimeMs ?? 0,
        savedAt: env.savedAt,
        gameId: env.gameId,
      };
    },
  };
}

/** "12:05" style hours:minutes (hours uncapped up to 999). */
export function formatPlayTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.min(999, Math.floor(totalMin / 60));
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()];
  return `${mon} ${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
