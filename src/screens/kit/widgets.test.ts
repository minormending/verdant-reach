import { TEXTBOX } from "../../contracts";
import { describe, expect, it } from "vitest";
import type { Button, GameContext, Input } from "../../contracts";
import { Flow } from "./flow";
import { ListView, Menu, QtyPicker, TextBox, pagesOf } from "./widgets";

// Minimal fake context: word-wrap + silent audio is all the widgets need.
function fakeCtx(): GameContext {
  const wrap = (t: string, cols: number) => {
    const out: string[] = [];
    let line = "";
    for (const w of t.split(/ +/).filter(Boolean)) {
      const c = line ? `${line} ${w}` : w;
      if (c.length > cols) { out.push(line); line = w; } else line = c;
    }
    if (line) out.push(line);
    return out;
  };
  return {
    ui: { wrap, measure: (t: string) => t.length * 8 },
    audio: { playSfx() {} },
    state: { options: { textSpeed: "fast" } },
  } as unknown as GameContext;
}

function input(pressed: Button[] = []): Input {
  return { pressed: (b) => pressed.includes(b), held: () => false, repeat: (b) => pressed.includes(b) };
}
const idle = input();

describe("TextBox", () => {
  it("pages on blank lines and wraps to TEXTBOX.cols columns", () => {
    const ctx = fakeCtx();
    const pages = pagesOf(ctx, "Wild LION'S TOOTH appeared!\n\nGo! OAK ACORN!");
    expect(pages).toEqual([["Wild LION'S TOOTH appeared!"], ["Go! OAK ACORN!"]]);
  });
  it("wait mode needs A on the last page; hold mode doesn't", () => {
    const ctx = fakeCtx();
    const tb = new TextBox(ctx);
    tb.show("Hello there.", "wait");
    for (let i = 0; i < 40; i++) tb.update(idle);
    expect(tb.finished).toBe(false);
    expect(tb.update(input(["a"]))).toBe(true);
    tb.show("Hello there.", "hold");
    let done = false;
    for (let i = 0; i < 40 && !done; i++) done = tb.update(idle);
    expect(done).toBe(true);
  });
  it("auto mode closes on its own", () => {
    const tb = new TextBox(fakeCtx());
    tb.autoFrames = 10;
    tb.show("It's super effective!", "auto");
    let n = 0;
    while (!tb.update(idle) && n < 200) n++;
    expect(n).toBeLessThan(200);
  });
});

describe("Menu", () => {
  it("moves through a 2x2 grid and returns the index", () => {
    const m = new Menu(fakeCtx(), ["FIGHT", "BAG", "QUICKENED", "RUN"], { x: 0, y: TEXTBOX.y, cols: 2 });
    m.update(input(["right"]));
    expect(m.index).toBe(1);
    m.update(input(["down"]));
    expect(m.index).toBe(3);
    m.update(input(["left"]));
    expect(m.index).toBe(2);
    expect(m.update(input(["a"]))).toBe(true);
    expect(m.result).toBe(2);
  });
  it("B cancels with -1 unless disabled", () => {
    const m = new Menu(fakeCtx(), ["YES", "NO"], { x: 0, y: 0 });
    expect(m.update(input(["b"]))).toBe(true);
    expect(m.result).toBe(-1);
    const n = new Menu(fakeCtx(), ["YES", "NO"], { x: 0, y: 0, cancel: false });
    expect(n.update(input(["b"]))).toBe(false);
  });
  it("wraps vertically", () => {
    const m = new Menu(fakeCtx(), ["A", "B", "C"], { x: 0, y: 0 });
    m.update(input(["up"]));
    expect(m.index).toBe(2);
  });
});

describe("ListView", () => {
  it("scrolls to keep the cursor visible", () => {
    const l = new ListView(fakeCtx(), () => 10, { rows: 4, rowH: 16 });
    for (let i = 0; i < 6; i++) l.update(input(["down"]));
    expect(l.index).toBe(6);
    expect(l.scroll).toBe(3);
    expect(l.visibleRows().map(([i]) => i)).toEqual([3, 4, 5, 6]);
    expect(l.canScrollUp()).toBe(true);
    expect(l.canScrollDown()).toBe(true);
  });
  it("custom buttons finish with their code", () => {
    const l = new ListView(fakeCtx(), () => 3, { rows: 4, rowH: 16, onButton: (b) => (b === "left" ? -2 : null) });
    expect(l.update(input(["left"]))).toBe(true);
    expect(l.result).toBe(-2);
  });
});

describe("QtyPicker", () => {
  it("wraps 1..max and steps by 10", () => {
    const q = new QtyPicker(fakeCtx(), 15, { x: 0, y: 0 });
    q.update(input(["down"]));
    expect(q.value).toBe(15);
    q.update(input(["up"]));
    expect(q.value).toBe(1);
    q.update(input(["right"]));
    expect(q.value).toBe(11);
    q.update(input(["right"]));
    expect(q.value).toBe(15);
    q.update(input(["a"]));
    expect(q.result).toBe(15);
  });
});

describe("Flow", () => {
  it("resolves waits after the right number of ticks", async () => {
    const f = new Flow(idle);
    let done = false;
    void f.wait(3).then(() => (done = true));
    for (let i = 0; i < 3; i++) { f.tick(); await null; }
    expect(done).toBe(false);
    f.tick();
    await null;
    expect(done).toBe(true);
  });
});

describe("widescreen TextBox", () => {
  it("shows all three instant rows and scrolls the whole paragraph", () => {
    const ctx = fakeCtx();
    const drawn: [string, number, number][] = [];
    ctx.ui.drawWindow = () => {};
    ctx.ui.drawText = (_g, text, x, y) => { drawn.push([text, x, y]); };
    ctx.ui.wrap = (t) => t.split("\n");
    const tb = new TextBox(ctx);
    const g = {} as CanvasRenderingContext2D;
    tb.show("FIRST\nSECOND\nTHIRD", "instant");
    tb.draw(g);
    expect(drawn.map(([text]) => text)).toEqual(["FIRST", "SECOND", "THIRD"]);
    expect(drawn.map(([, , y]) => y)).toEqual([TEXTBOX.y + 8, TEXTBOX.y + 24, TEXTBOX.y + 40]);
    drawn.length = 0;
    tb.show("FIRST\nSECOND\nTHIRD\nFOURTH", "wait");
    for (let i = 0; i < 24; i++) tb.update(idle);
    tb.update(input(["a"]));
    for (let i = 0; i < 24; i++) tb.update(idle);
    tb.draw(g);
    expect(drawn.filter(([text]) => text !== "▼").map(([text]) => text)).toEqual(["SECOND", "THIRD", "FOURTH"]);
  });
});
