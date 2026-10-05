import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import {
  anyQuestStarted, bushId, countedName, hiddenAt, hiddenFlag, pickBush, pickedToday, pluralName, questStatus, todayISO,
  unfoundHidden,
} from "./progress";

describe("harvest dates", () => {
  it("uses the local calendar date", () => {
    expect(todayISO(new Date(2026, 0, 3, 0, 0))).toBe("2026-01-03");
    expect(todayISO(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("picks once per day", () => {
    const st: { harvested?: Record<string, string> } = {};
    const d1 = new Date(2026, 4, 1, 9);
    expect(pickedToday(st, "a", d1)).toBe(false);
    expect(pickBush(st, "a", d1)).toBe(true);
    expect(pickBush(st, "a", new Date(2026, 4, 1, 22))).toBe(false);
    expect(pickBush(st, "a", new Date(2026, 4, 2, 6))).toBe(true);
    expect(st.harvested).toEqual({ a: "2026-05-02" });
  });

  it("reads bush ids", () => {
    expect(bushId("bush:hedgerow_berries")).toBe("hedgerow_berries");
    expect(bushId("bush")).toBeNull();
    expect(bushId("cat")).toBeNull();
  });
});

describe("hidden items", () => {
  const def = { id: "route_1", hidden: [{ x: 3, y: 4, item: "water_flask" }, { x: 7, y: 1, item: "compost", qty: 2 }] } as unknown as MapDef;
  it("finds unfound items by tile and flag", () => {
    const flags: Record<string, boolean> = {};
    expect(hiddenAt(def, flags, 3, 4)?.item).toBe("water_flask");
    expect(hiddenAt(def, flags, 4, 4)).toBeUndefined();
    flags[hiddenFlag("route_1", 3, 4)] = true;
    expect(hiddenFlag("route_1", 3, 4)).toBe("hidden_route_1_3_4");
    expect(hiddenAt(def, flags, 3, 4)).toBeUndefined();
    expect(unfoundHidden(def, flags).map((h) => h.item)).toEqual(["compost"]);
    expect(unfoundHidden({ id: "route_2" } as MapDef, flags)).toEqual([]);
  });
});

describe("quest flags", () => {
  it("derives status and whether NOTES is unlocked", () => {
    expect(questStatus({}, "x")).toBe("none");
    expect(questStatus({ quest_x_started: true }, "x")).toBe("active");
    expect(questStatus({ quest_x_started: true, quest_x_done: true }, "x")).toBe("done");
    expect(anyQuestStarted({ got_starter: true })).toBe(false);
    expect(anyQuestStarted({ quest_lost_cat_started: false })).toBe(false);
    expect(anyQuestStarted({ quest_lost_cat_started: true })).toBe(true);
  });
});

describe("item plurals", () => {
  it("handles -y, -s, -ch and mass nouns", () => {
    expect(pluralName("WILD BERRY")).toBe("WILD BERRIES");
    expect(pluralName("ROSE HIP")).toBe("ROSE HIPS");
    expect(pluralName("GLASS POD")).toBe("GLASS PODS");
    expect(pluralName("HONEY")).toBe("HONEYS");
    expect(countedName("SPRING WATER", 2)).toBe("SPRING WATER ×2");
    expect(countedName("RAIN JAR", 1)).toBe("RAIN JAR");
  });
});
