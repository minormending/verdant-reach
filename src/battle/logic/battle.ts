// Pure turn resolution. The scene asks for a turn to be resolved and plays
// back the returned event log (text, animations, HP drains, wilts). The state
// is mutated in place as the turn runs, so the scene keeps its own "shown" HP
// values and animates them from the hp events.

import type {
  BattleStat, GameData, ItemId, Move, MoveEffect, MoveId, Quickened, StatusId,
  TimeOfDay, TypeId, Weather,
} from "../../contracts";
import {
  accStageMult, calcDamage, clampStage, critChance, newStages, statStageMult, type Stages,
} from "./damage";
import { getItem, getMove, getSpecies, itemName, moveName, qName, STRUGGLE } from "./lookup";
import { chance, pct, randInt, type Rng } from "./rng";

export type Side = 0 | 1; // 0 = player, 1 = foe

export interface Volatile {
  stages: Stages;
  rootTapped: boolean;
  protecting: boolean;
  protectChain: number;
  flinched: boolean;
}

export const newVolatile = (): Volatile => ({
  stages: newStages(), rootTapped: false, protecting: false, protectChain: 0, flinched: false,
});

export interface SideState {
  party: Quickened[];
  active: number;
  vol: Volatile;
}

export interface BattleState {
  data: GameData;
  sides: [SideState, SideState];
  weather: { kind: Weather; turns: number } | null;
  time?: TimeOfDay;
  wild: boolean;
  /** Display name of the foe trainer, e.g. "WARDEN HOLLIS" (trainer battles). */
  foeTrainer?: string;
  /** Items the foe trainer still has. */
  foeItems: Record<string, number>;
  turn: number;
  /** Dormant counters by Quickened uid. */
  dormant: Record<string, number>;
  /** Player uids that faced the current foe (exp participants). */
  participants: Set<string>;
}

export type Action =
  | { kind: "move"; slot: number } // slot -1 = Struggle
  | { kind: "switch"; index: number }
  | { kind: "item"; item: ItemId }
  | { kind: "none" };

export type HpKind = "hit" | "drain" | "heal" | "residual" | "recoil";

export type BattleEvent =
  | { t: "text"; text: string }
  | { t: "anim"; side: Side; move: MoveId; type: TypeId; category: Move["category"]; selfTarget: boolean }
  | { t: "hp"; side: Side; from: number; to: number; kind: HpKind; eff?: number; crit?: boolean }
  | { t: "status"; side: Side; status: StatusId | null }
  | { t: "stat"; side: Side; up: boolean }
  | { t: "residual"; side: Side; kind: StatusId | "root_tap" | "frost" }
  | { t: "wilt"; side: Side }
  | { t: "weather"; weather: Weather | null }
  | { t: "switch_out"; side: Side }
  | { t: "switch_in"; side: Side; index: number }
  | { t: "miss"; side: Side }
  | { t: "item"; side: Side; item: ItemId };

export function createBattleState(opts: {
  data: GameData;
  playerParty: Quickened[];
  playerActive: number;
  foeParty: Quickened[];
  wild: boolean;
  time?: TimeOfDay;
  foeTrainer?: string;
  foeItems?: Record<string, number>;
}): BattleState {
  const s: BattleState = {
    data: opts.data,
    sides: [
      { party: opts.playerParty, active: opts.playerActive, vol: newVolatile() },
      { party: opts.foeParty, active: 0, vol: newVolatile() },
    ],
    weather: null,
    time: opts.time,
    wild: opts.wild,
    foeTrainer: opts.foeTrainer,
    foeItems: { ...(opts.foeItems ?? {}) },
    turn: 0,
    dormant: {},
    participants: new Set(),
  };
  const p = active(s, 0);
  if (p) s.participants.add(p.uid);
  return s;
}

export const active = (s: BattleState, side: Side): Quickened => s.sides[side].party[s.sides[side].active];
const other = (side: Side): Side => (side === 0 ? 1 : 0);

export function displayName(s: BattleState, side: Side): string {
  const n = qName(s.data, active(s, side));
  if (side === 0) return n;
  return (s.wild ? "Wild " : "Enemy ") + n;
}

export const STAT_NAMES: Record<BattleStat, string> = {
  atk: "ATTACK", def: "DEFENCE", spa: "SPCL.ATK", spd: "SPCL.DEF", spe: "SPEED",
  accuracy: "ACCURACY", evasion: "EVASION",
};

/** Effective speed: stages, and rootbound halves it. */
export function effectiveSpeed(s: BattleState, side: Side): number {
  const q = active(s, side);
  let spe = q.stats.spe * statStageMult(s.sides[side].vol.stages.spe);
  if (q.status === "rootbound") spe /= 2;
  return Math.floor(spe);
}

export function hasUsableMove(q: Quickened): boolean {
  return q.moves.some((m) => m.pp > 0);
}

export function isAlive(q: Quickened | undefined): boolean {
  return !!q && q.hp > 0;
}

export function firstHealthy(party: Quickened[], except = -1): number {
  return party.findIndex((q, i) => i !== except && q.hp > 0);
}

export function canContinue(party: Quickened[]): boolean {
  return party.some((q) => q.hp > 0);
}

/** Does this move aim at the foe (so accuracy and protect apply)? */
export function targetsFoe(move: Move): boolean {
  if (move.category !== "status") return true;
  return move.effects.some(
    (e) => ((e.kind === "status" || e.kind === "stat") && e.target === "foe") || e.kind === "root_tap" || e.kind === "fixed_damage",
  );
}

/** Statuses some types shrug off. */
export function statusImmune(data: GameData, q: Quickened, status: StatusId, weather: Weather | null): boolean {
  const types = getSpecies(data, q.species).types as readonly TypeId[];
  if (status === "scorch" && types.includes("fire")) return true;
  if (status === "frostbite" && (types.includes("frost") || weather === "sun")) return true;
  return false;
}

const STATUS_INFLICT: Record<StatusId, string> = {
  blight: "was blighted!",
  scorch: "was scorched!",
  frostbite: "got frostbite!",
  dormant: "went dormant!",
  rootbound: "is rootbound! It may not move!",
};
const STATUS_ALREADY: Record<StatusId, string> = {
  blight: "is already blighted!",
  scorch: "is already scorched!",
  frostbite: "is already frostbitten!",
  dormant: "is already dormant!",
  rootbound: "is already rootbound!",
};

/** Resolve one full turn. Player action first in the tuple, foe second. */
export function resolveTurn(s: BattleState, playerAction: Action, foeAction: Action, rng: Rng): BattleEvent[] {
  const ev: BattleEvent[] = [];
  s.turn++;
  const actions: [Action, Action] = [playerAction, foeAction];

  // 1. Switches and items go first (player, then foe).
  for (const side of [0, 1] as Side[]) {
    const a = actions[side];
    if (a.kind === "switch") doSwitch(s, side, a.index, ev);
    else if (a.kind === "item" && side === 1) foeUseItem(s, a.item, ev);
  }

  // 2. Moves by priority, then speed, random tiebreak.
  const movers: Side[] = ([0, 1] as Side[]).filter((sd) => actions[sd].kind === "move");
  const prio = (sd: Side) => {
    const a = actions[sd] as { kind: "move"; slot: number };
    const q = active(s, sd);
    const id = a.slot >= 0 ? q.moves[a.slot]?.id : undefined;
    return id ? getMove(s.data, id).priority ?? 0 : 0;
  };
  movers.sort((a, b) => {
    const pd = prio(b) - prio(a);
    if (pd !== 0) return pd;
    const sd = effectiveSpeed(s, b) - effectiveSpeed(s, a);
    if (sd !== 0) return sd;
    return 0;
  });
  if (movers.length === 2 && prio(movers[0]) === prio(movers[1]) &&
      effectiveSpeed(s, movers[0]) === effectiveSpeed(s, movers[1]) && rng() < 0.5) {
    movers.reverse();
  }
  const acted = new Set<Side>();
  for (const side of movers) {
    const user = active(s, side);
    const target = active(s, other(side));
    if (!isAlive(user) || !isAlive(target)) continue;
    const a = actions[side] as { kind: "move"; slot: number };
    executeMove(s, side, a.slot, !acted.has(other(side)), rng, ev);
    acted.add(side);
  }

  // 3. End of turn.
  const order: Side[] = [...movers];
  for (const sd of [0, 1] as Side[]) if (!order.includes(sd)) order.push(sd);
  endOfTurn(s, order, rng, ev);
  return ev;
}

/** Switch the active Quickened on a side (voluntary or forced). */
export function doSwitch(s: BattleState, side: Side, index: number, ev: BattleEvent[]): void {
  const sd = s.sides[side];
  if (isAlive(active(s, side))) ev.push({ t: "switch_out", side });
  sd.active = index;
  sd.vol = newVolatile();
  ev.push({ t: "switch_in", side, index });
  if (side === 0) s.participants.add(active(s, 0).uid);
  else {
    // A new foe: exp goes to whoever faces this one.
    s.participants = new Set();
    const p = active(s, 0);
    if (isAlive(p)) s.participants.add(p.uid);
  }
}

/** Bring in the foe's next Quickened (after a wilt); resets exp participants. */
export function sendOutFoe(s: BattleState, index: number): void {
  s.sides[1].active = index;
  s.sides[1].vol = newVolatile();
  s.participants = new Set();
  const p = active(s, 0);
  if (isAlive(p)) s.participants.add(p.uid);
}

function foeUseItem(s: BattleState, item: ItemId, ev: BattleEvent[]): void {
  const q = active(s, 1);
  if ((s.foeItems[item] ?? 0) <= 0) return;
  s.foeItems[item]--;
  const it = getItem(s.data, item);
  ev.push({ t: "text", text: `${s.foeTrainer ?? "The foe"} used ${itemName(s.data, item)}!` });
  ev.push({ t: "item", side: 1, item });
  const e = it.effect;
  if (e.kind === "heal" || e.kind === "heal_full") {
    const from = q.hp;
    q.hp = e.kind === "heal_full" ? q.stats.hp : Math.min(q.stats.hp, q.hp + e.amount);
    ev.push({ t: "hp", side: 1, from, to: q.hp, kind: "heal" });
    ev.push({ t: "text", text: `${displayName(s, 1)} regained health!` });
  } else if (e.kind === "cure_status" && q.status && (!e.status || e.status === q.status)) {
    q.status = null;
    ev.push({ t: "status", side: 1, status: null });
    ev.push({ t: "text", text: `${displayName(s, 1)} is cured!` });
  }
}

function pushText(ev: BattleEvent[], text: string) {
  ev.push({ t: "text", text });
}

/** Handle wilt bookkeeping for the given side's active, if it hit 0. */
function checkWilt(s: BattleState, side: Side, ev: BattleEvent[]): boolean {
  const q = active(s, side);
  if (q.hp > 0) return false;
  q.hp = 0;
  if (q.status) {
    q.status = null;
  }
  s.sides[side].vol = newVolatile();
  ev.push({ t: "wilt", side });
  pushText(ev, `${displayName(s, side)} wilted!`);
  return true;
}

function applyDamage(s: BattleState, side: Side, amount: number, kind: HpKind, ev: BattleEvent[], extra?: { eff?: number; crit?: boolean }) {
  const q = active(s, side);
  const from = q.hp;
  q.hp = Math.max(0, q.hp - Math.max(0, Math.floor(amount)));
  ev.push({ t: "hp", side, from, to: q.hp, kind, ...extra });
  return from - q.hp;
}

function applyHeal(s: BattleState, side: Side, amount: number, kind: HpKind, ev: BattleEvent[]) {
  const q = active(s, side);
  const from = q.hp;
  q.hp = Math.min(q.stats.hp, q.hp + Math.max(0, Math.floor(amount)));
  if (q.hp !== from) ev.push({ t: "hp", side, from, to: q.hp, kind });
  return q.hp - from;
}

/** Try to inflict a status; returns true if it took. */
export function inflictStatus(
  s: BattleState, side: Side, status: StatusId, ev: BattleEvent[], rng: Rng, announceFail: boolean,
): boolean {
  const q = active(s, side);
  const name = displayName(s, side);
  if (q.hp <= 0) return false;
  if (q.status) {
    if (announceFail) pushText(ev, q.status === status ? `${name} ${STATUS_ALREADY[status]}` : "But it failed!");
    return false;
  }
  if (statusImmune(s.data, q, status, s.weather?.kind ?? null)) {
    if (announceFail) pushText(ev, `It doesn't affect ${name}...`);
    return false;
  }
  q.status = status;
  if (status === "dormant") s.dormant[q.uid] = randInt(rng, 1, 3);
  ev.push({ t: "status", side, status });
  pushText(ev, `${name} ${STATUS_INFLICT[status]}`);
  return true;
}

/** Change a battle stat stage; returns true if it moved. */
export function changeStat(
  s: BattleState, side: Side, stat: BattleStat, stages: number, ev: BattleEvent[], announceFail: boolean,
): boolean {
  const vol = s.sides[side].vol;
  const name = displayName(s, side);
  const before = vol.stages[stat];
  const after = clampStage(before + stages);
  if (after === before) {
    if (announceFail) pushText(ev, `${name}'s ${STAT_NAMES[stat]} won't go ${stages > 0 ? "higher" : "lower"}!`);
    return false;
  }
  vol.stages[stat] = after;
  ev.push({ t: "stat", side, up: stages > 0 });
  const how = stages >= 2 ? "sharply rose!" : stages > 0 ? "rose!" : stages <= -2 ? "harshly fell!" : "fell!";
  pushText(ev, `${name}'s ${STAT_NAMES[stat]} ${how}`);
  return true;
}

/** Fraction of max HP restored by a heal effect, with weather. */
export function healFraction(e: Extract<MoveEffect, { kind: "heal" }>, weather: Weather | null): number {
  if (!e.sunBonus) return e.fraction;
  if (weather === "sun") return 2 / 3;
  if (weather === "rain" || weather === "frost") return 1 / 4;
  return e.fraction;
}

const WEATHER_START: Record<Weather, string> = {
  sun: "The sunlight got bright!",
  rain: "It started to rain!",
  frost: "A hard frost set in!",
};
const WEATHER_GOING: Record<Weather, string> = {
  sun: "The sunlight is strong.",
  rain: "Rain continues to fall.",
  frost: "The frost bites.",
};
const WEATHER_END: Record<Weather, string> = {
  sun: "The sunlight faded.",
  rain: "The rain stopped.",
  frost: "The frost thawed.",
};

/** Multi-hit count: Gen 2 2-5 distribution (3/8, 3/8, 1/8, 1/8), else uniform. */
export function rollHits(rng: Rng, min: number, max: number): number {
  if (min === 2 && max === 5) {
    const r = rng();
    return r < 3 / 8 ? 2 : r < 6 / 8 ? 3 : r < 7 / 8 ? 4 : 5;
  }
  return randInt(rng, min, Math.max(min, max));
}

/** Pre-move checks for statuses and flinch. Returns false if the user can't act. */
function canAct(s: BattleState, side: Side, move: Move | null, rng: Rng, ev: BattleEvent[]): boolean {
  const q = active(s, side);
  const vol = s.sides[side].vol;
  const name = displayName(s, side);
  if (q.status === "dormant") {
    const left = (s.dormant[q.uid] ?? randInt(rng, 1, 3)) - 1;
    s.dormant[q.uid] = left;
    if (left <= 0) {
      q.status = null;
      delete s.dormant[q.uid];
      ev.push({ t: "status", side, status: null });
      pushText(ev, `${name} woke up!`);
    } else {
      ev.push({ t: "residual", side, kind: "dormant" });
      pushText(ev, `${name} is dormant.`);
      return false;
    }
  }
  if (q.status === "frostbite") {
    if ((move && move.type === "fire" && move.category !== "status") || pct(rng, 20)) {
      q.status = null;
      ev.push({ t: "status", side, status: null });
      pushText(ev, `${name} thawed out!`);
    } else {
      ev.push({ t: "residual", side, kind: "frostbite" });
      pushText(ev, `${name} is frozen stiff!`);
      return false;
    }
  }
  if (vol.flinched) {
    pushText(ev, `${name} flinched!`);
    return false;
  }
  if (q.status === "rootbound" && pct(rng, 25)) {
    ev.push({ t: "residual", side, kind: "rootbound" });
    pushText(ev, `${name} is rootbound! It can't move!`);
    return false;
  }
  return true;
}

/** Execute one move use. `first` = the target hasn't acted yet this turn (flinch). */
export function executeMove(s: BattleState, side: Side, slot: number, first: boolean, rng: Rng, ev: BattleEvent[]): void {
  const user = active(s, side);
  const tSide = other(side);
  const target = active(s, tSide);
  const vol = s.sides[side].vol;
  const tVol = s.sides[tSide].vol;
  const slotMove = slot >= 0 ? user.moves[slot] : undefined;
  const struggling = !slotMove || slotMove.pp <= 0;
  const move = struggling ? STRUGGLE : getMove(s.data, slotMove!.id);

  if (!canAct(s, side, move, rng, ev)) {
    vol.protectChain = 0;
    return;
  }
  const name = displayName(s, side);
  const tName = displayName(s, tSide);
  if (struggling) pushText(ev, `${name} has no moves left!`);
  else slotMove!.pp--;

  pushText(ev, `${name} used ${moveName(s.data, move.id)}!`);

  const isProtect = move.effects.some((e) => e.kind === "protect");
  if (!isProtect) vol.protectChain = 0;

  const foeTargeted = targetsFoe(move);
  if (foeTargeted && tVol.protecting) {
    pushText(ev, `${tName} protected itself!`);
    return;
  }

  // Accuracy.
  const alwaysHit = move.accuracy === null || move.effects.some((e) => e.kind === "always_hit");
  if (foeTargeted && !alwaysHit) {
    const stage = clampStage(vol.stages.accuracy - tVol.stages.evasion);
    const acc = (move.accuracy ?? 100) * accStageMult(stage);
    if (!pct(rng, acc)) {
      ev.push({ t: "miss", side });
      pushText(ev, `${name}'s attack missed!`);
      return;
    }
  }

  ev.push({
    t: "anim", side, move: move.id, type: move.type, category: move.category,
    selfTarget: !foeTargeted,
  });

  const fixed = move.effects.find((e) => e.kind === "fixed_damage") as Extract<MoveEffect, { kind: "fixed_damage" }> | undefined;
  const damaging = move.category !== "status" && (move.power > 0 || !!fixed);
  let dealt = 0;
  let anyEffect = false;

  if (damaging || fixed) {
    const tSpecies = getSpecies(s.data, target.species);
    const typeless = move.id === STRUGGLE.id;
    const eff = typeless ? 1 : effectivenessOf(s, move.type, tSpecies.types);
    if (eff === 0) {
      pushText(ev, `It doesn't affect ${tName}...`);
      return;
    }
    const multi = move.effects.find((e) => e.kind === "multi_hit") as Extract<MoveEffect, { kind: "multi_hit" }> | undefined;
    const hits = multi ? rollHits(rng, multi.min, multi.max) : 1;
    const critStage = move.effects.some((e) => e.kind === "high_crit") ? 1 : 0;
    let landed = 0;
    for (let h = 0; h < hits; h++) {
      if (target.hp <= 0) break;
      let amount: number;
      let crit = false;
      if (fixed) {
        amount = fixed.amount === "level" ? user.level : fixed.amount;
      } else {
        crit = chance(rng, critChance(critStage));
        const r = calcDamage({
          data: s.data, attacker: user, defender: target, atkStages: vol.stages, defStages: tVol.stages,
          move, weather: s.weather?.kind ?? null, time: s.time, crit, roll: randInt(rng, 85, 100), typeless,
        });
        amount = r.damage;
      }
      dealt += applyDamage(s, tSide, amount, "hit", ev, { eff: fixed ? 1 : eff, crit });
      landed++;
      if (crit) pushText(ev, "A critical hit!");
      if (h < hits - 1 && target.hp > 0) {
        ev.push({ t: "anim", side, move: move.id, type: move.type, category: move.category, selfTarget: false });
      }
    }
    if (multi) pushText(ev, `Hit ${landed} time${landed === 1 ? "" : "s"}!`);
    if (!fixed && !typeless) {
      if (eff > 1) pushText(ev, "It's super effective!");
      else if (eff < 1) pushText(ev, "It's not very effective...");
    }
    // Fire thaws a frostbitten target.
    if (target.hp > 0 && target.status === "frostbite" && move.type === "fire") {
      target.status = null;
      ev.push({ t: "status", side: tSide, status: null });
      pushText(ev, `${tName} thawed out!`);
    }
    anyEffect = true;
  }

  // Drain / recoil on damage dealt (announced before the wilt, as in Gen 2).
  for (const e of move.effects) {
    if (e.kind === "drain" && dealt > 0 && user.hp > 0) {
      const healed = applyHeal(s, side, Math.max(1, Math.floor(dealt * e.fraction)), "drain", ev);
      if (healed > 0) pushText(ev, `Drew sap from ${tName}!`);
    } else if (e.kind === "recoil" && dealt > 0 && user.hp > 0) {
      applyDamage(s, side, Math.max(1, Math.floor(dealt * e.fraction)), "recoil", ev);
      pushText(ev, `${name} is hit with recoil!`);
    }
  }
  const wiltedTarget = checkWilt(s, tSide, ev);

  // Other effects.
  for (const e of move.effects) {
    switch (e.kind) {
      case "status": {
        const onSelf = e.target === "self";
        const tgtSide = onSelf ? side : tSide;
        if (!onSelf && (wiltedTarget || target.hp <= 0)) break;
        if (onSelf && user.hp <= 0) break;
        const primary = move.category === "status";
        if (primary || pct(rng, e.chance)) {
          if (primary && e.chance < 100 && !pct(rng, e.chance)) { pushText(ev, "But it failed!"); anyEffect = true; break; }
          const ok = inflictStatus(s, tgtSide, e.status, ev, rng, primary);
          anyEffect = anyEffect || ok || primary;
        }
        break;
      }
      case "stat": {
        const onSelf = e.target === "self";
        const tgtSide = onSelf ? side : tSide;
        if (!onSelf && target.hp <= 0) break;
        if (onSelf && user.hp <= 0) break;
        const primary = move.category === "status";
        if (pct(rng, e.chance)) {
          const ok = changeStat(s, tgtSide, e.stat, e.stages, ev, primary);
          anyEffect = anyEffect || ok || primary;
        }
        break;
      }
      case "flinch":
        if (first && target.hp > 0 && dealt > 0 && pct(rng, e.chance)) tVol.flinched = true;
        break;
      case "heal": {
        if (user.hp >= user.stats.hp) {
          pushText(ev, `${name}'s HP is full!`);
          anyEffect = true;
          break;
        }
        applyHeal(s, side, Math.max(1, Math.floor(user.stats.hp * healFraction(e, s.weather?.kind ?? null))), "heal", ev);
        pushText(ev, `${name} regained health!`);
        anyEffect = true;
        break;
      }
      case "weather": {
        if (s.weather?.kind === e.weather) {
          pushText(ev, "But it failed!");
        } else {
          s.weather = { kind: e.weather, turns: 5 };
          ev.push({ t: "weather", weather: e.weather });
          pushText(ev, WEATHER_START[e.weather]);
        }
        anyEffect = true;
        break;
      }
      case "root_tap": {
        if (target.hp <= 0) break;
        const tTypes = getSpecies(s.data, target.species).types as readonly TypeId[];
        if (tTypes.includes("wood")) pushText(ev, `It doesn't affect ${tName}...`);
        else if (tVol.rootTapped) pushText(ev, "But it failed!");
        else {
          tVol.rootTapped = true;
          pushText(ev, `Roots tapped into ${tName}!`);
        }
        anyEffect = true;
        break;
      }
      case "protect": {
        const ok = chance(rng, 1 / 2 ** vol.protectChain);
        if (ok) {
          vol.protecting = true;
          vol.protectChain++;
          pushText(ev, `${name} curled up to protect itself!`);
        } else {
          vol.protectChain = 0;
          pushText(ev, "But it failed!");
        }
        anyEffect = true;
        break;
      }
      default:
        break;
    }
  }

  if (!anyEffect && move.category === "status") pushText(ev, "But it failed!");
  checkWilt(s, side, ev);
}

function effectivenessOf(s: BattleState, type: TypeId, defTypes: readonly TypeId[]): number {
  let m = 1;
  for (const t of defTypes) {
    const v = s.data.typeChart?.[type]?.[t];
    if (typeof v === "number") m *= v;
  }
  return m;
}

/** Residual effects at the end of a turn. */
export function endOfTurn(s: BattleState, order: Side[], rng: Rng, ev: BattleEvent[]): void {
  void rng;
  for (const side of order) {
    const q = active(s, side);
    if (!isAlive(q)) continue;
    const name = displayName(s, side);
    if (q.status === "blight" || q.status === "scorch") {
      const frac = q.status === "blight" ? 1 / 8 : 1 / 16;
      ev.push({ t: "residual", side, kind: q.status });
      applyDamage(s, side, Math.max(1, Math.floor(q.stats.hp * frac)), "residual", ev);
      pushText(ev, q.status === "blight" ? `${name} is hurt by blight!` : `${name} is hurt by its scorch!`);
      if (checkWilt(s, side, ev)) continue;
    }
    if (s.sides[side].vol.rootTapped) {
      const drainer = active(s, other(side));
      ev.push({ t: "residual", side, kind: "root_tap" });
      const lost = applyDamage(s, side, Math.max(1, Math.floor(q.stats.hp / 8)), "residual", ev);
      pushText(ev, `Roots sap ${name}'s strength!`);
      if (isAlive(drainer)) applyHeal(s, other(side), lost, "drain", ev);
      if (checkWilt(s, side, ev)) continue;
    }
  }
  if (s.weather) {
    s.weather.turns--;
    if (s.weather.turns <= 0) {
      pushText(ev, WEATHER_END[s.weather.kind]);
      s.weather = null;
      ev.push({ t: "weather", weather: null });
    } else {
      pushText(ev, WEATHER_GOING[s.weather.kind]);
      if (s.weather.kind === "frost") {
        for (const side of order) {
          const q = active(s, side);
          if (!isAlive(q)) continue;
          const types = getSpecies(s.data, q.species).types as readonly TypeId[];
          if (types.includes("frost")) continue;
          ev.push({ t: "residual", side, kind: "frost" });
          applyDamage(s, side, Math.max(1, Math.floor(q.stats.hp / 16)), "residual", ev);
          pushText(ev, `${displayName(s, side)} is nipped by the frost!`);
          checkWilt(s, side, ev);
        }
      }
    }
  }
  for (const sd of s.sides) {
    sd.vol.protecting = false;
    sd.vol.flinched = false;
  }
}
