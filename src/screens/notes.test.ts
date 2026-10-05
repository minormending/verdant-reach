import { describe, expect, it } from "vitest";
import type { QuestDef, WorldData } from "../contracts";
import { wrapText } from "../ui/font";
import { WORLD } from "../world";
import { noteRows, notesList } from "./notes";

const q = (id: string, steps: QuestDef["steps"] = []): QuestDef => ({
  id, title: id.toUpperCase(), giver: "SYRUP MAKER, SUGARBUSH", area: "sugarbush", steps, reward: "$1500 + 5 WILD BERRY",
});
const world = {
  quests: {
    sap_run: q("sap_run", [
      { text: "Take the SYRUP JAR to the BAKER in HEDGEROW.", doneWhen: [{ flag: "sap_delivered", is: true }] },
      { text: "Go back to the SYRUP MAKER.", doneWhen: [{ flag: "quest_sap_run_done", is: true }] },
    ]),
    lost_cat: q("lost_cat"),
    moonwatch: q("moonwatch"),
  },
  maps: { sugarbush: { name: "SUGARBUSH" } },
} as unknown as WorldData;

describe("NOTES", () => {
  it("lists started quests, active first, done after", () => {
    const flags = { quest_moonwatch_started: true, quest_moonwatch_done: true, quest_sap_run_started: true };
    expect(notesList(world, flags).map((e) => `${e.quest.id}:${e.status}`)).toEqual(["sap_run:active", "moonwatch:done"]);
    expect(notesList(world, {})).toEqual([]);
  });

  it("gives undefined-but-started quests a readable page", () => {
    const l = notesList({ quests: {} }, { quest_florists_order_started: true });
    expect(l[0].quest.title).toBe("FLORISTS ORDER");
  });

  it("ticks steps as their conditions hold, and every row fits the page", () => {
    const flags: Record<string, boolean> = { quest_sap_run_started: true };
    const wrap = (t: string, c: number) => wrapText(t, c);
    const steps = () => noteRows(world, flags, notesList(world, flags)[0], wrap).filter((r) => r.kind === "step");
    expect(steps().filter((r) => r.kind === "step" && r.first).map((r) => r.kind === "step" && r.done)).toEqual([false, false]);
    flags.sap_delivered = true;
    expect(steps().filter((r) => r.kind === "step" && r.first).map((r) => r.kind === "step" && r.done)).toEqual([true, false]);
    const rows = noteRows(world, flags, notesList(world, flags)[0], wrap);
    expect(rows.map((r) => (r.kind === "text" ? r.label : null)).filter(Boolean)).toEqual(["FROM", "WHERE", "REWARD"]);
    for (const r of rows) if (r.kind !== "gap") expect(r.text.length).toBeLessThanOrEqual(16);
    // a finished quest shows every step ticked
    flags.quest_sap_run_done = true;
    expect(steps().every((r) => r.kind === "step" && r.done)).toBe(true);
  });

  it("the real quests fit the notebook (titles <= 16, giver on the index label <= 17)", () => {
    for (const quest of Object.values(WORLD.quests ?? {})) {
      expect(quest.title.length, quest.id).toBeLessThanOrEqual(16);
      expect(quest.giver.length, `${quest.id} giver`).toBeLessThanOrEqual(17 * 2);
      const rows = noteRows(WORLD, {}, { quest, status: "active" }, (t, c) => wrapText(t, c));
      for (const r of rows) if (r.kind === "text" || r.kind === "step") expect(r.text.length, quest.id).toBeLessThanOrEqual(16);
    }
  });
});
