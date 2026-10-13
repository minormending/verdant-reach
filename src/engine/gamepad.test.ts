import { afterEach, describe, expect, it, vi } from "vitest";
import type { Button } from "../contracts";
import { hatDirections, padButtons, profileFor, readGamepads, type PadState } from "./gamepad";
import { createInput } from "./core";

const btns = (n: number, pressed: number[]) =>
  Array.from({ length: n }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }));
const pad = (o: Partial<PadState> & { pressed?: number[]; n?: number }): PadState => ({
  id: o.id ?? "Generic USB Gamepad", mapping: o.mapping ?? "standard", connected: o.connected,
  buttons: o.buttons ?? btns(o.n ?? 17, o.pressed ?? []), axes: o.axes ?? [0, 0, 0, 0],
});
const held = (p: PadState) => [...padButtons(p)].sort();

describe("gamepad mapping", () => {
  it("standard mapping: right face is A, bottom is B (Game Boy layout), D-pad and START/SELECT", () => {
    expect(held(pad({ pressed: [1] }))).toEqual(["a"]);
    expect(held(pad({ pressed: [0] }))).toEqual(["b"]);
    expect(held(pad({ pressed: [9, 8] }))).toEqual(["select", "start"]);
    expect(held(pad({ pressed: [12, 15] }))).toEqual(["right", "up"]);
    expect(held(pad({ pressed: [13, 14] }))).toEqual(["down", "left"]);
  });

  it("8BitDo Zero 2 in X-input, macOS or Switch mode (standard mapping): labelled A/B match", () => {
    // The Zero 2's A is its right face button, B its bottom one.
    for (const id of ["8BitDo Zero 2 gamepad (Vendor: 2dc8 Product: 9018)", "Xbox 360 Controller (XInput STANDARD GAMEPAD)", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)"]) {
      expect(held(pad({ id, pressed: [1] }))).toEqual(["a"]);
      expect(held(pad({ id, pressed: [0] }))).toEqual(["b"]);
    }
  });

  it("8BitDo Zero 2 in D-input mode (raw): A=0, B=1, SELECT=10, START=11, D-pad on axes 0/1", () => {
    const id = "8BitDo Zero 2 gamepad (Vendor: 2dc8 Product: 9018)";
    expect(profileFor(pad({ id, mapping: "" }))).not.toBe(profileFor(pad({ mapping: "" })));
    expect(held(pad({ id, mapping: "", n: 16, pressed: [0] }))).toEqual(["a"]);
    expect(held(pad({ id, mapping: "", n: 16, pressed: [1] }))).toEqual(["b"]);
    expect(held(pad({ id, mapping: "", n: 16, pressed: [10, 11] }))).toEqual(["select", "start"]);
    expect(held(pad({ id, mapping: "", n: 16, axes: [-1, 1] }))).toEqual(["down", "left"]);
    expect(held(pad({ id, mapping: "", n: 16, axes: [1, -1] }))).toEqual(["right", "up"]);
  });

  it("ignores small axis values and disconnected pads", () => {
    expect(held(pad({ axes: [0.3, -0.4] }))).toEqual([]);
    expect(held(pad({ pressed: [1], connected: false }))).toEqual([]);
  });

  it("decodes a DirectInput hat axis on raw pads", () => {
    expect(hatDirections(-1)).toEqual(["up"]);
    expect(hatDirections(-3 / 7)).toEqual(["right"]);
    expect(hatDirections(1 / 7)).toEqual(["down"]);
    expect(hatDirections(5 / 7)).toEqual(["left"]);
    expect(hatDirections(1)).toEqual(["up", "left"]);
    expect(hatDirections(9 / 7)).toEqual([]); // centred
    const axes = [0, 0, 0, 0, 0, 0, 0, 0, 0, -1];
    expect(held(pad({ mapping: "", n: 12, axes }))).toEqual(["up"]);
    expect(held(pad({ mapping: "standard", axes }))).toEqual([]); // standard pads never use axis 9
  });
});

describe("readGamepads", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is empty without the Gamepad API, and merges every connected pad", () => {
    vi.stubGlobal("navigator", {});
    expect([...readGamepads()]).toEqual([]);
    vi.stubGlobal("navigator", { getGamepads: () => [null, pad({ pressed: [1] }), pad({ pressed: [12] })] });
    expect([...readGamepads()].sort()).toEqual(["a", "up"]);
  });
});

describe("createInput with a controller", () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const listeners = new Map<string, (e: { code: string; repeat?: boolean; preventDefault(): void }) => void>();
    vi.stubGlobal("addEventListener", (name: string, fn: (e: { code: string; preventDefault(): void }) => void) => listeners.set(name, fn));
    let now = new Set<Button>();
    const unlock = vi.fn();
    const input = createInput(unlock, () => new Set(now));
    const key = (type: "keydown" | "keyup", code: string, repeat = false) => listeners.get(type)?.({ code, repeat, preventDefault() {} });
    const step = (buttons: Button[]) => { now = new Set(buttons); input.poll(); };
    return { input, step, key, unlock };
  }

  it("turns a controller press into one press edge, then held and menu repeat", () => {
    const { input, step, unlock } = setup();
    step(["a"]);
    expect(input.pressed("a")).toBe(true);
    expect(unlock).toHaveBeenCalledTimes(1);
    input.endFrame();
    let repeats = 0;
    for (let i = 0; i < 40; i++) {
      step(["a"]);
      expect(input.pressed("a")).toBe(false);
      expect(input.held("a")).toBe(true);
      if (input.repeat("a")) repeats++;
      input.endFrame();
    }
    expect(repeats).toBeGreaterThan(0);
    step([]);
    expect(input.held("a")).toBe(false);
    expect(input.repeat("a")).toBe(false);
  });

  it("asks for the audio unlock on every new mapped key press, not just the first", () => {
    const { key, unlock } = setup();
    // Escape (B) is not a user gesture in Chrome, so the first press may not unlock audio.
    key("keydown", "Escape");
    expect(unlock).toHaveBeenCalledTimes(1);
    key("keyup", "Escape");
    key("keydown", "KeyZ");
    expect(unlock).toHaveBeenCalledTimes(2);
    key("keydown", "KeyZ", true); // auto-repeat
    key("keydown", "KeyQ"); // unmapped
    expect(unlock).toHaveBeenCalledTimes(2);
  });

  it("keyboard and controller holding the same button don't double-press or release each other", () => {
    const { input, step, key } = setup();
    key("keydown", "KeyZ");
    expect(input.pressed("a")).toBe(true);
    input.endFrame();
    step(["a"]);
    expect(input.pressed("a")).toBe(false); // already held by the key
    input.endFrame();
    key("keyup", "KeyZ");
    step(["a"]);
    expect(input.held("a")).toBe(true); // the pad still holds it
    input.endFrame();
    step([]);
    expect(input.held("a")).toBe(false);
  });
});
