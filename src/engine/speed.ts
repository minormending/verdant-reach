// GAME SPEED (Options x1-x4, or the dev/e2e ?speed=N): how many fixed steps
// the loop runs for each step of real time. Everything counted in steps
// (walking, text, menus, fades, battle animations) speeds up by itself; this
// module is for the few things timed in milliseconds instead.
//
// runLoop sets the speed every frame and advances the game clock once per
// update. Wall-clock things (play time, time of day, save dates, calendar days)
// must not use it.

let steps = 1;
let clock = 0;

/** Fixed steps per step of real time this frame (1 = normal speed). */
export function loopSpeed(): number { return steps; }

/** runLoop only: the speed for the frame it is about to run. */
export function setLoopSpeed(n: number): void {
  steps = Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Game time in milliseconds: one fixed step per update, so it runs `loopSpeed()`
 * times faster than the wall clock. Use it instead of `performance.now()` for
 * anything animated in milliseconds (the overworld toasts).
 */
export function gameClockMs(): number { return clock; }

/** runLoop only: one update ran. */
export function advanceGameClock(ms: number): void { clock += ms; }

/**
 * Real milliseconds that a wait of `ms` (written for normal speed) lasts at the
 * current speed. The one helper for real-time waits that should follow GAME
 * SPEED: setTimeout delays and awaited sounds.
 */
export function scaledMs(ms: number): number { return ms / steps; }
