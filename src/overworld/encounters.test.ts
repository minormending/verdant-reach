import { describe, expect, it, vi } from "vitest";
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
  it("snow rolls grass encounters and ice never consumes an encounter draw", () => {
    const map = { encounters: { grass: { rate: 100, slots: [slots[0]] } } };
    const rng = vi.fn(() => 0);
    expect(rollEncounter(map, "ice", "day", rng)).toBeNull();
    expect(rng).not.toHaveBeenCalled();
    expect(rollEncounter(map, "snow", "day", rng)).toEqual({ species: "dandelion_bud", level: 2, kind: "grass" });
  });

  it("uses the first matching conditional table, including its rate, then falls back", () => {
    const map: Pick<MapDef, "encounters" | "encountersWhen"> = {
      encounters: { water: { rate: 100, slots: [slots[0]] } },
      encountersWhen: [
        { when: [{ flag: "calmed", is: true }], encounters: { water: { rate: 8, slots: [slots[1]] } } },
        { when: [{ flag: "red", is: true }], encounters: { water: { rate: 20, slots: [slots[3]] } } },
      ],
    };
    expect(rollEncounter(map, "water", "day", () => 0, true, { calmed: true, red: true })).toMatchObject({ species: "sunflower_seedling", level: 3 });
    expect(rollEncounter(map, "water", "day", () => 0.1, true, { calmed: true, red: true })).toBeNull();
    expect(rollEncounter(map, "water", "day", () => 0.1, true, { red: true })).toMatchObject({ species: "nettle_sprout" });
    expect(rollEncounter(map, "water", "day", () => 0, true)).toMatchObject({ species: "dandelion_bud" });
    map.encountersWhen![0].encounters = undefined;
    expect(rollEncounter(map, "water", "day", () => 0, true, { calmed: true })).toBeNull();
  });
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

  it("rolls water encounters only on raft steps on water:true tiles", () => {
    const map: Pick<MapDef, "encounters"> = { encounters: { water: { rate: 20, slots } } };
    const rng = vi.fn(() => 0);
    for (const tile of ["water", "pond_lily", "fountain_basin"] as const) {
      expect(rollEncounter(map, tile, "day", rng)).toBeNull();
      expect(rng).not.toHaveBeenCalled();
      expect(rollEncounter(map, tile, "night", seq(0.05, 0.7, 0), true)).toEqual({ species: "moonflower_seed", level: 7, kind: "water" });
      expect(rollEncounter(map, tile, "day", seq(0.2), true)).toBeNull();
    }
    for (const tile of ["grass", "boardwalk", "bridge", "water_channel"] as const) expect(rollEncounter(map, tile, "day", rng, true)).toBeNull();
    expect(rng).not.toHaveBeenCalled();
    expect(rollEncounter({}, "water", "day", rng, true)).toBeNull();
  });
});
