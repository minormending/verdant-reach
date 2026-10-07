import { describe, expect, it } from "vitest";
import { SPECIES_IDS } from "../contracts";
import { isSelfAnim, MOVE_ANIMS } from "../battle/anims";
import { movesAtLevel } from "../battle/logic/stats";
import { DATA } from "./index";

const IDS = ["aspen_sucker", "quaking_aspen", "elder"] as const;
const FACT = "A single aspen clone can grow thousands of trunks from one shared root system.";

describe("Chapter 10 species", () => {
  it("appends the three species after Chapter 9 in table order", () => {
    expect(SPECIES_IDS.slice(SPECIES_IDS.indexOf("lithops_bloom") + 1)).toEqual(IDS);
  });

  it("uses the specified names, lines, stages, types, activity and totals", () => {
    const names = ["Aspen Sucker", "Aspen", "The Elder"];
    const totals = [330, 500, 640];
    IDS.forEach((id, i) => {
      const s = DATA.species[id];
      expect(s).toMatchObject({ name: names[i], line: i === 2 ? "elder" : "aspen",
        stage: i === 1 ? 2 : 1, types: ["wood", "ghost"], activity: "any" });
      expect(Object.values(s.baseStats).reduce((a, b) => a + b, 0), id).toBe(totals[i]);
    });
  });

  it("keeps aspen balanced with slightly higher special defence, and the Elder slow and bulky", () => {
    for (const id of IDS.slice(0, 2)) {
      const { spd, ...rest } = DATA.species[id].baseStats;
      expect(spd).toBeGreaterThan(Math.max(...Object.values(rest)));
      expect(spd - Math.min(...Object.values(rest))).toBeLessThanOrEqual(15);
    }
    const { hp, spd, spe, atk, def, spa } = DATA.species.elder.baseStats;
    expect(Math.min(hp, spd)).toBeGreaterThanOrEqual(150);
    expect(Math.min(hp, spd)).toBeGreaterThan(Math.max(atk, def, spa));
    expect(spe).toBeLessThanOrEqual(35);
  });

  it("grows only the sucker at vigor 42 and uses the prescribed catch rates", () => {
    expect(DATA.species.aspen_sucker.growsInto).toEqual({ species: "quaking_aspen", trigger: { kind: "vigor", level: 42 } });
    expect(DATA.species.quaking_aspen.growsInto).toBeUndefined();
    expect(DATA.species.elder.growsInto).toBeUndefined();
    expect(DATA.species.aspen_sucker.catchRate).toBe(120);
    expect(DATA.species.elder.catchRate).toBe(3);
    expect(DATA.species.aspen_sucker.pollination).toEqual(["woodland"]);
    expect(DATA.species.quaking_aspen.pollination).toEqual(["woodland"]);
    expect(DATA.species.elder.pollination).toEqual([]);
  });

  it("defines Many Trunks with the existing 2–5-hit effect and an attacking animation", () => {
    expect(DATA.moves.many_trunks).toMatchObject({ name: "Many Trunks", type: "wood", category: "physical",
      power: 25, accuracy: 90, pp: 10, priority: 0, effects: [{ kind: "multi_hit", min: 2, max: 5 }] });
    expect(MOVE_ANIMS.many_trunks).toEqual({ family: "heavy_drop", variant: "log" });
    expect(isSelfAnim(MOVE_ANIMS.many_trunks)).toBe(false);
    expect(DATA.species.elder.learnset).toContainEqual({ level: 1, move: "many_trunks" });
    expect(DATA.species.quaking_aspen.learnset).toContainEqual({ level: 50, move: "many_trunks" });
    expect(DATA.species.aspen_sucker.learnset.some((l) => l.move === "many_trunks")).toBe(false);
    expect(movesAtLevel(DATA.species.elder, 60)).toContain("many_trunks");
    expect(movesAtLevel(DATA.species.quaking_aspen, 57)).toContain("many_trunks");
  });

  it("gives each stage a distinct entry with the specified botanical name and fact", () => {
    const entries = IDS.map((id) => {
      const h = DATA.herbarium[id];
      expect(h.scientificName, id).toBe("Populus tremuloides");
      expect(h.entry, id).toContain(FACT);
      expect(h.entry.split(/(?<=[.!?])\s+/), id).toHaveLength(2);
      return h.entry;
    });
    expect(new Set(entries).size).toBe(3);
  });
});
