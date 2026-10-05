// Chapter 4's story contract with the maps (docs/CH4_IDS.md): the flags each
// script must set, the beats ROUND4.md §1.1 fixes, and the quest wiring.

import { describe, expect, it } from "vitest";
import type { ScriptCmd } from "../../contracts";
import { eachCmd } from "../validate";
import { act1Scripts } from "./act1";
import { ch4Scripts } from "./ch4";
import { QUESTS, questScripts } from "./quests";

const ops = (cmds: ScriptCmd[]) => {
  const out: ScriptCmd[] = [];
  eachCmd(cmds, (c) => out.push(c));
  return out;
};
const sets = (cmds: ScriptCmd[]) => ops(cmds).flatMap((c) => (c.op === "setFlag" && c.value !== false ? [c.flag] : []));
const has = (cmds: ScriptCmd[], pred: (c: ScriptCmd) => boolean) => ops(cmds).some(pred);

describe("chapter 4 scripts", () => {
  it("lets chapter 3 run on: VALE's call opens the road east instead of ending", () => {
    const call = act1Scripts.vale_call;
    expect(sets(call)).toContain("ch4_started");
    expect(has(call, (c) => c.op === "endSlice")).toBe(false);
  });

  it("writes every script the maps call", () => {
    for (const id of [
      "ch4_city_arrival", "ch4_conservatory_closed", "ch4_relay_listen", "ch4_flora_relay", "ch4_director",
      "ch4_watcher", "ch4_grunt_watch", "ch4_end", "gn_keeper", "rival_3", "flora",
    ]) expect(ch4Scripts[id], id).toBeDefined();
  });

  it("sets the flags the maps read", () => {
    expect(sets(ch4Scripts.ch4_city_arrival)).toContain("gc_arrival_seen");
    expect(sets(ch4Scripts.ch4_relay_listen)).toContain("relay_listened");
    expect(sets(ch4Scripts.ch4_grunt_watch)).toContain("ch4_grunt_seen");
    const rival = [...ch4Scripts.rival_3, ...ch4Scripts.nursery_shears];
    expect(sets(rival)).toEqual(expect.arrayContaining(["rival_3_done", "got_shears"]));
    expect(has(rival, (c) => c.op === "giveItem" && c.item === "pruning_shears")).toBe(true);
  });

  it("stages the fixed beats", () => {
    expect(has(ch4Scripts.ch4_city_arrival, (c) => c.op === "still" && c.image === "glasshouse_dome")).toBe(true);
    expect(has(ch4Scripts.ch4_city_arrival, (c) => c.op === "music" && c.id === "glasshouse_city")).toBe(true);
    const relay = ch4Scripts.ch4_relay_listen;
    expect(has(relay, (c) => c.op === "shake")).toBe(true);
    expect(has(relay, (c) => c.op === "still" && c.image === "relay_pulse")).toBe(true);
    expect(has(relay, (c) => c.op === "sfx" && c.id === "pulse")).toBe(true);
    expect(has(relay, (c) => c.op === "say" && /answering/.test(c.text))).toBe(true);
    expect(has(ch4Scripts.ch4_grunt_watch, (c) => c.op === "camera")).toBe(true);
    expect(has(ch4Scripts.rival_3, (c) => c.op === "battle" && c.trainer.startsWith("rival_3_"))).toBe(true);
    expect(has(ch4Scripts.flora, (c) => c.op === "giveMark" && c.mark === "rose_mark")).toBe(true);
    // The door bounces you back off the step.
    const closed = ch4Scripts.ch4_conservatory_closed;
    expect(closed[closed.length - 1]).toEqual({ op: "movePlayer", path: ["down"] });
  });

  it("ends the chapter with ch4_done set before the end card", () => {
    const all = ops([...ch4Scripts.ch4_end, ...ch4Scripts.ch4_vale_call]);
    const done = all.findIndex((c) => c.op === "setFlag" && c.flag === "ch4_done");
    const end = all.findIndex((c) => c.op === "endSlice");
    expect(done).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(done);
  });
});

describe("chapter 4 quests", () => {
  it("has QuestDefs and scripts for LISTENING POSTS, THE FIRST SEED and FAN MAIL", () => {
    for (const q of ["relay_sensors", "first_seed", "fan_mail"]) {
      expect(QUESTS[q]?.title.length, q).toBeLessThanOrEqual(16);
      expect(questScripts[`q_${q}`], q).toBeDefined();
    }
    for (const n of [1, 2, 3]) {
      expect(sets(questScripts[`q_relay_sensors_post_${n}`])).toContain(`sensor_${n}_read`);
    }
  });

  it("only lets FLORA take the fan letter after her battle", () => {
    expect(has(questScripts.q_fan_mail_flora, (c) => c.op === "takeItem" && c.item === "fan_letter")).toBe(true);
    expect(has(questScripts.q_fan_mail_flora, (c) => c.op === "giveItem" && c.item === "signed_photo")).toBe(true);
  });
});
