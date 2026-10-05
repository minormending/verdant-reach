// The walking companion: the lead Quickened trails one tile behind the
// player using its 16x16 party icon. It never blocks anything. Pure movement
// logic (no DOM) so it can be unit-tested; the overworld draws it.
//
// Rules:
//  - it always heads for the tile the player just left (one step behind);
//  - a straight two-tile gap (the player hopped a ledge) is crossed with a hop;
//  - any other gap (warps, scripted teleports) pops it in place at the target;
//  - after a map load it is "tucked" into the player's tile, hidden, and pops
//    out when the player first moves (as HeartGold's followers do at doors).

import type { Dir } from "../contracts";
import { TILE } from "../contracts";

interface FStep {
  fx: number; fy: number; tx: number; ty: number;
  t: number; dur: number; hop: boolean;
}

/** Frames for the little "pop out" hop. */
export const POP_FRAMES = 12;

export class Follower {
  x = 0;
  y = 0;
  facing: Dir = "down";
  /** Icons face left; true mirrors them to face right. */
  flip = false;
  step: FStep | null = null;
  /** Hidden in the player's tile until the player moves. */
  tucked = true;
  /** Pop-out / happy hop frames left. */
  pop = 0;
  /** Alternates each step (which icon frame leads). */
  foot = 0;
  private queue: { tx: number; ty: number; dur: number; age: number }[] = [];

  /** Put it (tucked) on a tile: map loads, warps, toggling it on. */
  place(x: number, y: number, facing: Dir = "down") {
    this.x = x;
    this.y = y;
    this.facing = facing;
    if (facing === "left") this.flip = false;
    if (facing === "right") this.flip = true;
    this.step = null;
    this.queue = [];
    this.tucked = true;
    this.pop = 0;
  }

  get moving() { return this.step !== null; }

  /** The player just started a step away from (tx, ty) taking `dur` frames. */
  follow(tx: number, ty: number, dur: number) {
    if (this.tucked) {
      // Emerge where the player was standing (normally the tile we're tucked into).
      this.x = tx;
      this.y = ty;
      this.tucked = false;
      this.pop = POP_FRAMES;
      return;
    }
    if (this.step) {
      this.queue.push({ tx, ty, dur, age: 0 });
      return;
    }
    this.start(tx, ty, dur);
  }

  private start(tx: number, ty: number, dur: number) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0) return;
    if (dx < 0) this.flip = false;
    else if (dx > 0) this.flip = true;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    if (dist === 1 || (dist === 2 && (dx === 0 || dy === 0))) {
      const hop = dist === 2;
      this.step = { fx: this.x, fy: this.y, tx, ty, t: 0, dur: hop ? Math.max(dur, 12) : Math.max(2, dur), hop };
      this.x = tx;
      this.y = ty;
      this.foot ^= 1;
      return;
    }
    // Too far to walk (a warp, a scripted jump): pop in at the target.
    this.x = tx;
    this.y = ty;
    this.pop = POP_FRAMES;
  }

  tick() {
    if (this.pop > 0) this.pop--;
    for (const q of this.queue) q.age++;
    if (!this.step) return;
    if (++this.step.t < this.step.dur) return;
    this.step = null;
    const next = this.queue.shift();
    // A queued step that has been waiting catches up by moving a little faster.
    if (next) this.start(next.tx, next.ty, Math.max(3, next.dur - next.age));
  }

  /** Is the follower on (or leaving) this tile? */
  occupies(x: number, y: number): boolean {
    if (this.tucked) return false;
    if (this.x === x && this.y === y) return true;
    return !!this.step && this.step.fx === x && this.step.fy === y;
  }

  /** Tile-cell pixel position plus a hop lift: 1–2px bounce per step, a real arc over ledges. */
  pixel(): { px: number; py: number; lift: number } {
    let lift = 0;
    if (this.pop > 0) lift = Math.round(Math.sin(Math.PI * (1 - this.pop / POP_FRAMES)) * 4);
    if (!this.step) return { px: this.x * TILE, py: this.y * TILE, lift };
    const s = this.step;
    const k = s.t / s.dur;
    const px = (s.fx + (s.tx - s.fx) * k) * TILE;
    const py = (s.fy + (s.ty - s.fy) * k) * TILE;
    lift = Math.max(lift, Math.round(Math.sin(Math.PI * k) * (s.hop ? 9 : 2)));
    return { px: Math.round(px), py: Math.round(py), lift };
  }

  /** Which icon frame: the second frame (squash) leads each step; idle alternates slowly. */
  iconFrame(frame: number): 0 | 1 {
    if (this.step) return this.step.t < this.step.dur / 2 ? 1 : 0;
    if (this.pop > POP_FRAMES / 2) return 1;
    return Math.floor(frame / 24) % 2 === 1 ? 1 : 0;
  }
}

// ---------------------------------------------------------------------------
// Talking to it
// ---------------------------------------------------------------------------

export interface FollowerMood {
  name: string;
  friendship: number;
  hpFrac: number;
  status: string | null;
  activity: "any" | "day" | "night";
  time: "morning" | "day" | "night";
  outdoor: boolean;
}

/** A friendship-flavoured line for talking to the follower, plus the emote to show. */
export function followerLine(m: FollowerMood, roll: number): { text: string; emote: "♪" | "..." | "!" } {
  const n = m.name;
  const pick = (opts: string[]) => opts[Math.min(opts.length - 1, Math.floor(roll * opts.length))];
  if (m.hpFrac <= 0) return { text: `${n} is wilted. It needs a GREENHOUSE.`, emote: "..." };
  switch (m.status) {
    case "blight": return { text: `${n} looks peaky. Its leaves are spotted with BLIGHT.`, emote: "..." };
    case "scorch": return { text: `${n}'s leaf tips are SCORCHED. It's being brave about it.`, emote: "..." };
    case "frostbite": return { text: `${n} is stiff with frost and barely moving.`, emote: "..." };
    case "dormant": return { text: `${n} has gone DORMANT. It's dozing on its feet.`, emote: "..." };
    case "rootbound": return { text: `${n} keeps tugging at its tangled roots.`, emote: "..." };
  }
  if (m.hpFrac < 0.25) return { text: `${n} is drooping. It could use some water.`, emote: "..." };
  if (m.outdoor && m.time === "night" && m.activity === "night" && roll < 0.5) {
    return { text: `${n} is wide awake under the night sky. It seems to love the dark.`, emote: "♪" };
  }
  if (m.outdoor && m.time !== "night" && m.activity === "day" && roll < 0.4) {
    return { text: `${n} turns its leaves toward the sun and soaks it up.`, emote: "♪" };
  }
  if (m.friendship >= 220) {
    return {
      text: pick([
        `${n} leans against your leg. It's thriving at your side!`,
        `${n} rustles happily. It would follow you anywhere.`,
        `${n} gives a little hop. It's never looked healthier!`,
      ]),
      emote: "♪",
    };
  }
  if (m.friendship >= 150) {
    return {
      text: pick([
        `${n} sways along beside you, perfectly in step.`,
        `${n} brushes its leaves against your hand.`,
        `${n} looks up at you. It seems glad you're here.`,
      ]),
      emote: "♪",
    };
  }
  if (m.friendship >= 70) {
    return {
      text: pick([
        `${n} is keeping pace with you, leaves twitching.`,
        `${n} looks around curiously.`,
        `${n} gives its leaves a shake.`,
      ]),
      emote: "♪",
    };
  }
  return {
    text: pick([
      `${n} keeps a careful distance. Give it time.`,
      `${n} eyes you warily… if a plant can eye.`,
    ]),
    emote: "...",
  };
}
