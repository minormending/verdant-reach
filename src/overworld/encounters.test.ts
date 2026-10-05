import { describe, expect, it } from "vitest";
import type { EncounterSlot, MapDef } from "../contracts";
import { filterSlots, pickWeighted, rollEncounter, rollLevel, slotActive } from "./encounters";

const slots: EncounterSlot[] = [
  { species: "dandelion_bud", minLevel: 2, maxLevel: 4, weight: 50 },
  { species: "sunflower_seedling", minLevel: 3, maxLevel: 3, weight: 30, time: "day" },
  { species: "moonflower_seed", minLevel: 7, maxLevel: 9, weight: 20, time: "night" },
  { species: "nettle_sprout", minLevel: 2, maxLevel: 2, weight: 10, time: "any" },
];

/** Deterministic rng from a list of values. */
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe("encounter slots by time of day", () => {
  it("'day' covers morning and day, 'night' only night", () => {
    expect(slotActive(slots[1], "morning")).toBe(true);
    expect(slotActive(slots[1], "day")).toBe(true);
    expect(slotActive(slots[1], "night")).toBe(false);
    expect(slotActive(slots[2], "night")).toBe(true);
    expect(slotActive(slots[2], "morning")).toBe(false);
    expect(slotActive(slots[0], "night")).toBe(true);
  });

  it("filters the table", () => {
    expect(filterSlots(slots, "day").map((s) => s.species)).toEqual(["dandelion_bud", "sunflower_seedling", "nettle_sprout"]);
    expect(filterSlots(slots, "morning").map((s) => s.species)).toEqual(["dandelion_bud", "sunflower_seedling", "nettle_sprout"]);
    expect(filterSlots(slots, "night").map((s) => s.species)).toEqual(["dandelion_bud", "moonflower_seed", "nettle_sprout"]);
  });

  it("picks by weight", () => {
    const day = filterSlots(slots, "day"); // weights 50, 30, 10 (total 90)
    expect(pickWeighted(day, () => 0)?.species).toBe("dandelion_bud");
    expect(pickWeighted(day, () => 0.55)?.species).toBe("dandelion_bud"); // 49.5
    expect(pickWeighted(day, () => 0.56)?.species).toBe("sunflower_seedling"); // 50.4
    expect(pickWeighted(day, () => 0.99)?.species).toBe("nettle_sprout");
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });

  it("rolls levels inclusively", () => {
    expect(rollLevel(slots[0], () => 0)).toBe(2);
    expect(rollLevel(slots[0], () => 0.999)).toBe(4);
    expect(rollLevel(slots[2], () => 0.5)).toBe(8);
  });

  it("rolls the per-step chance on the right terrain only", () => {
    const map: Pick<MapDef, "encounters"> = { encounters: { grass: { rate: 10, slots }, bog: { rate: 20, slots: [slots[3]] } } };
    expect(rollEncounter(map, "grass", "day", () => 0)).toBeNull(); // not encounter terrain
    expect(rollEncounter(map, "tall_grass", "day", seq(0.2))).toBeNull(); // 20 >= 10%
    const hit = rollEncounter(map, "tall_grass", "night", seq(0.05, 0.7, 0.0));
    expect(hit).toEqual({ species: "moonflower_seed", level: 7, kind: "grass" });
    expect(rollEncounter(map, "bog", "day", seq(0.1, 0.3, 0.5))).toEqual({ species: "nettle_sprout", level: 2, kind: "bog" });
    expect(rollEncounter({}, "tall_grass", "day", () => 0)).toBeNull();
  });
});
