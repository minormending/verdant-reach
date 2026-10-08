import { describe, expect, it } from "vitest";
import type { Input } from "../contracts";
import { TEXTBOX } from "../contracts";
import { TextBox } from "./kit";

const idle: Input = { pressed: () => false, held: () => false, repeat: () => false };
const confirm: Input = { ...idle, pressed: (b) => b === "a" };
const box = (text: string, opts = {}) => new TextBox(text, { speed: () => "fast", blip() {} }, opts);
const type = (tb: TextBox) => { for (let i = 0; i < 300; i++) tb.update(idle); };

describe("36×3 dialogue", () => {
  it("wraps at the shared column count and fills all three rows before waiting", () => {
    const text = Array.from({ length: 4 }, (_, i) => String(i + 1).repeat(TEXTBOX.cols)).join(" ");
    const tb = box(text);
    type(tb);
    expect(tb.visible()).toEqual(["1", "2", "3"].map((c) => c.repeat(TEXTBOX.cols)));
    expect(tb.finished).toBe(false);
    tb.update(confirm);
    type(tb);
    expect(tb.visible()).toEqual(["2", "3", "4"].map((c) => c.repeat(TEXTBOX.cols)));
    tb.update(confirm);
    expect(tb.finished).toBe(true);
  });

  it("holds three lines at once and clears the box for the next paragraph", () => {
    const tb = box("ONE\nTWO\nTHREE\n\nFOUR");
    type(tb);
    expect(tb.visible()).toEqual(["ONE", "TWO", "THREE"]);
    tb.update(confirm);
    type(tb);
    expect(tb.visible()).toEqual(["FOUR", "", ""]);
    tb.update(confirm);
    expect(tb.finished).toBe(true);
  });

  it("finishes a three-row prompt without requiring confirmation", () => {
    const tb = box("ONE\nTWO\nTHREE", { waitLast: false });
    type(tb);
    expect(tb.finished).toBe(true);
    expect(tb.visible()).toEqual(["ONE", "TWO", "THREE"]);
  });
});
