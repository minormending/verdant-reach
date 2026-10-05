import { describe, expect, it } from "vitest";
import { FIXTURE_DATA } from "../fixtures";
import { addItem, applyItem, consumeItem, isMedicine, isPod, itemHasEffect } from "./items";
import { createQuickened } from "./stats";
import { seeded } from "./rng";

const data = FIXTURE_DATA;
const mk = () => createQuickened(data, "oak_acorn", 20, seeded(1));

describe("items", () => {
  it("classifies medicine and pods", () => {
    expect(isMedicine(data, "water_flask")).toBe(true);
    expect(isMedicine(data, "terrarium_pod")).toBe(false);
    expect(isPod(data, "glass_pod")).toBe(true);
    expect(isMedicine(data, "field_herbarium")).toBe(false);
  });
  it("heals up to max and reports the amount", () => {
    const q = mk();
    expect(itemHasEffect(data, "water_flask", q)).toBe(false);
    q.hp = q.stats.hp - 5;
    const r = applyItem(data, "water_flask", q);
    expect(r.ok).toBe(true);
    expect(q.hp).toBe(q.stats.hp);
    expect(r.text).toContain("5 HP");
  });
  it("heal items do nothing to a wilted Quickened; revive does", () => {
    const q = mk();
    q.hp = 0;
    expect(applyItem(data, "rain_jar", q).ok).toBe(false);
    const r = applyItem(data, "compost", q);
    expect(r.ok).toBe(true);
    expect(q.hp).toBe(Math.floor(q.stats.hp / 2));
  });
  it("cures status", () => {
    const q = mk();
    expect(itemHasEffect(data, "neem_spray", q)).toBe(false);
    q.status = "scorch";
    expect(applyItem(data, "neem_spray", q).ok).toBe(true);
    expect(q.status).toBeNull();
  });
  it("restores PP to each move", () => {
    const q = mk();
    q.moves.forEach((m) => (m.pp = 0));
    expect(applyItem(data, "mulch", q).ok).toBe(true);
    for (const m of q.moves) expect(m.pp).toBe(Math.min(10, data.moves[m.id].pp));
  });
  it("bag add/consume caps at 99 and removes empties", () => {
    const bag: Record<string, number> = {};
    addItem(bag, "water_flask", 120);
    expect(bag.water_flask).toBe(99);
    consumeItem(bag, "water_flask", 99);
    expect(bag.water_flask).toBeUndefined();
  });
});
