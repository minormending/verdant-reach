// New-game state and localStorage persistence (versioned envelope with
// play time and save date). Options are also kept on their own so they
// survive "NEW GAME" and apply at the title screen.

import type { GameContext, GameState, MapId } from "../contracts";
import { MAP_IDS } from "../contracts";

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

export function loadOptions(storage: StorageLike | null = defaultStorage()): GameState["options"] {
  try {
    const raw = storage?.getItem(OPTIONS_KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (o && ["slow", "mid", "fast"].includes(o.textSpeed)) return { textSpeed: o.textSpeed };
  } catch { /* ignore */ }
  return { textSpeed: "mid" };
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
  };
}

/** Fill in anything missing from an older or hand-edited save. */
export function normalizeState(raw: unknown, fallback: GameState): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GameState>;
  if (!r.position || !MAP_IDS.includes(r.position.map as MapId)) return null;
  const arr = <T>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
  const obj = <T extends object>(v: unknown, d: T): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : d);
  return {
    version: 1,
    playerName: typeof r.playerName === "string" && r.playerName ? r.playerName : DEFAULT_PLAYER_NAME,
    rivalName: typeof r.rivalName === "string" && r.rivalName ? r.rivalName : DEFAULT_RIVAL_NAME,
    money: typeof r.money === "number" && isFinite(r.money) ? Math.max(0, Math.floor(r.money)) : fallback.money,
    party: arr(r.party, []).slice(0, 6),
    box: arr(r.box, []),
    bag: obj(r.bag, {}),
    flags: obj(r.flags, {}),
    marks: arr(r.marks, []),
    herbarium: {
      seen: arr(r.herbarium?.seen, []),
      caught: arr(r.herbarium?.caught, []),
    },
    position: { ...r.position, facing: r.position.facing ?? "down" },
    heal: r.heal && MAP_IDS.includes(r.heal.map) ? r.heal : fallback.heal,
    playTimeMs: typeof r.playTimeMs === "number" ? r.playTimeMs : 0,
    options: r.options && ["slow", "mid", "fast"].includes(r.options.textSpeed) ? r.options : fallback.options,
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
