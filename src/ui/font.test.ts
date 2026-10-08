import { TEXTBOX } from "../contracts";
import { describe, expect, it } from "vitest";
import { GLYPHS, formatText, glyphKey, measureText, paragraphs, wrapText } from "./font";
import { NameModel } from "./nameEntry";

describe("bitmap font", () => {
  it("covers letters, digits, punctuation and the special symbols", () => {
    const required = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?'\":;-+/()&%#=$♪é…×♂♀→←↑↓▶▷▼▲◀—";
    for (const ch of Array.from(required)) expect(GLYPHS.has(ch), ch).toBe(true);
    expect(GLYPHS.get("A")!.length).toBe(8);
    expect(glyphKey("’")).toBe("'");
  });

  it("measures 8px per character", () => {
    expect(measureText("OAK")).toBe(24);
    expect(measureText("ab\nlonger")).toBe(48);
  });

  it("wraps to 36 columns at word boundaries", () => {
    const lines = wrapText("The CENTURYHEART on the far slope is about to bloom.", TEXTBOX.cols);
    expect(lines).toEqual(["The CENTURYHEART on the far slope is", "about to bloom."]);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(TEXTBOX.cols);
    expect(wrapText("line one\nline two", TEXTBOX.cols)).toEqual(["line one", "line two"]);
    expect(wrapText("ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMN", TEXTBOX.cols)).toEqual(["ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJ", "KLMN"]);
  });

  it("splits paragraphs on blank lines", () => {
    expect(paragraphs("Hello there!\n\nSecond box.", TEXTBOX.cols)).toEqual([["Hello there!"], ["Second box."]]);
  });

  it("substitutes player and rival names", () => {
    expect(formatText("{PLAYER} and <RIVAL>!", { player: "SAGE", rival: "BRAM" })).toBe("SAGE and BRAM!");
  });
});

describe("name entry model", () => {
  it("caps length, deletes, and falls back to the default", () => {
    const m = new NameModel(7);
    expect(m.result("ROWAN")).toBe("ROWAN");
    expect(m.type(" ")).toBe(false); // no leading space
    for (const c of "ABCDEFGHIJ") m.type(c);
    expect(m.name).toBe("ABCDEFG");
    expect(m.del()).toBe(true);
    expect(m.name).toBe("ABCDEF");
    expect(m.result("ROWAN")).toBe("ABCDEF");
  });
});
