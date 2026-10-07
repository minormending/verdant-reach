import { describe, expect, it } from "vitest";
import { MARKS, type MarkId, type ScriptCmd } from "../contracts";
import { ifMarks } from "./build";
import { WORLD } from "./index";
import { eachCmd, validateWorld } from "./validate";

function fixture() {
  const world = structuredClone(WORLD);
  // As in ch9.test.ts, complete the staged Chapter 8 prerequisite so its
  // stub arrival doesn't prevent checking an unrelated script condition.
  world.scripts.ch8_arrival = [{ op: "setFlag", flag: "ch8_done" }];
  return world;
}

describe("mark-condition validation", () => {
  it("validates the eight-mark condition", () => {
    const world = fixture();
    world.scripts.test_marks = [ifMarks(MARKS, [], [])];
    expect(validateWorld(world)).toEqual([]);
  });

  it("visits both branches recursively and checks their references", () => {
    const condition = ifMarks(MARKS, [ifMarks(["bramble_mark"], [{ op: "giveMark", mark: "sundew_mark" }])],
      [{ op: "call", script: "missing_mark_script" }]);
    const visited: ScriptCmd["op"][] = [];
    eachCmd([condition], (cmd) => visited.push(cmd.op));
    expect(visited).toEqual(["ifMarks", "ifMarks", "giveMark", "call"]);
    const world = fixture();
    world.scripts.test_marks = [condition];
    expect(validateWorld(world).join("\n")).toContain("calls missing missing_mark_script");
  });

  it("rejects an unknown required mark, including inside a nested branch", () => {
    const world = fixture();
    world.scripts.test_marks = [ifMarks(MARKS, [ifMarks(["missing_mark" as MarkId], [])])];
    expect(validateWorld(world).join("\n")).toContain("unknown mark missing_mark");
  });
});
