// Game controllers through the Gamepad API, polled once per frame.
//
// Buttons follow the Game Boy's layout, by position: the RIGHT face button is
// A and the BOTTOM one is B. On Nintendo-layout pads (8BitDo, Switch Pro) the
// labels match; on an Xbox-layout pad, A is the button marked B.
//
// Browsers report a pad either with the W3C "standard" mapping or raw
// ("" mapping: DirectInput pads, and many pads in Firefox). Raw pads use a
// known profile when one matches (8BitDo in D-input mode), else a generic
// guess: buttons 0/1 for A/B and the first two axes, or a hat axis, as the D-pad.

import type { Button } from "../contracts";

/** The parts of a Gamepad this module reads (a real Gamepad satisfies it). */
export interface PadState {
  id: string;
  mapping: string;
  connected?: boolean;
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
}

interface Profile {
  /** Button index -> game button. */
  buttons: Record<number, Button>;
  /** Axis indexes used as a D-pad (x, y), if any. */
  stick?: [number, number];
}

const DEAD_ZONE = 0.5;

/** How each game button reads on a controller (for help text). */
export const PAD_LABELS: Record<Button, string> = {
  up: "D-pad", down: "D-pad", left: "D-pad", right: "D-pad",
  a: "A (right face button)", b: "B (bottom face button)", start: "START / +", select: "SELECT / −",
};

/** W3C standard mapping: 0 bottom, 1 right, 2 left, 3 top, 8 back, 9 start, 12-15 D-pad. */
const STANDARD: Profile = {
  buttons: { 1: "a", 3: "a", 0: "b", 2: "b", 8: "select", 9: "start", 12: "up", 13: "down", 14: "left", 15: "right" },
  stick: [0, 1],
};

/** 8BitDo pads in D-input mode (vendor 2dc8): the D-pad is axes 0/1. */
const EIGHTBITDO_RAW: Profile = {
  buttons: { 0: "a", 4: "a", 1: "b", 3: "b", 10: "select", 11: "start" },
  stick: [0, 1],
};

/** Unknown raw pads: the usual DirectInput order. */
const GENERIC_RAW: Profile = {
  buttons: { 0: "a", 1: "b", 8: "select", 9: "start" },
  stick: [0, 1],
};

const is8BitDo = (id: string) => /8bitdo|2dc8/i.test(id);

export function profileFor(pad: PadState): Profile {
  if (pad.mapping === "standard") return STANDARD;
  if (is8BitDo(pad.id)) return EIGHTBITDO_RAW;
  return GENERIC_RAW;
}

/**
 * Chrome reports some DirectInput hats as one axis in eight steps from -1
 * (up) clockwise to 1 (up-left); anything above about 1.1 is centred.
 */
export function hatDirections(v: number): Button[] {
  if (!Number.isFinite(v) || v < -1.05 || v > 1.05) return [];
  const step = Math.round(((v + 1) / 2) * 7); // 0 up, 1 up-right, ... 7 up-left
  return ([["up"], ["up", "right"], ["right"], ["down", "right"], ["down"], ["down", "left"], ["left"], ["up", "left"]] as Button[][])[step] ?? [];
}

/** The game buttons a pad is holding right now. */
export function padButtons(pad: PadState): Set<Button> {
  const out = new Set<Button>();
  if (pad.connected === false) return out;
  const prof = profileFor(pad);
  pad.buttons.forEach((b, i) => {
    const mapped = prof.buttons[i];
    if (mapped && (b.pressed || b.value > DEAD_ZONE)) out.add(mapped);
  });
  if (prof.stick) {
    const [ax, ay] = prof.stick;
    const x = pad.axes[ax] ?? 0, y = pad.axes[ay] ?? 0;
    if (x <= -DEAD_ZONE) out.add("left");
    if (x >= DEAD_ZONE) out.add("right");
    if (y <= -DEAD_ZONE) out.add("up");
    if (y >= DEAD_ZONE) out.add("down");
  }
  // Raw pads with a hat switch on axis 9 (Chrome's DirectInput hat).
  if (pad.mapping !== "standard" && pad.axes.length > 9) for (const d of hatDirections(pad.axes[9])) out.add(d);
  return out;
}

/** Everything every connected pad is holding (empty where the API is missing). */
export function readGamepads(): Set<Button> {
  const out = new Set<Button>();
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return out;
  let pads: readonly (Gamepad | null)[] = [];
  try { pads = navigator.getGamepads(); } catch { return out; }
  for (const pad of pads) if (pad) for (const b of padButtons(pad)) out.add(b);
  return out;
}
