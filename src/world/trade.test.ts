import { describe, expect, it } from "vitest";
import type { ScriptCmd, SpeciesId } from "../contracts";
import { WORLD } from "./index";
import { eachCmd, validateWorld } from "./validate";

type Trade = Extract<ScriptCmd, { op: "trade" }>;
const trade = (gives: Partial<Trade["gives"]> = {}): Trade => ({
  op: "trade", wants: ["oak_acorn", "maple_samara"], gives: { species: "moonflower_seed", level: 12, ...gives },
});
const errors = (cmd: Trade) => validateWorld({ ...WORLD, scripts: { ...WORLD.scripts, ch8_arrival: [{ op: "setFlag", flag: "ch8_done" }], fixture_trade: [cmd] } });

describe("trade script validation", () => {
  it("accepts existing species, boundary levels, and a ten-character nickname", () => {
    for (const level of [1, 60]) expect(errors(trade({ level, nickname: "MOONSPROUT" }))).toEqual([]);
    expect(errors(trade({ nickname: "🌱".repeat(10) }))).toEqual([]);
  });

  it("checks every wanted species and the arriving species", () => {
    const cmd = trade({ species: "missing_gift" as SpeciesId });
    cmd.wants = ["oak_acorn", "missing_want" as SpeciesId];
    expect(errors(cmd)).toEqual([
      "[script fixture_trade] unknown trade species missing_want",
      "[script fixture_trade] unknown trade species missing_gift",
    ]);
  });

  it.each([0, 61, -1, 1.5, NaN, Infinity])("rejects invalid level %s", (level) => {
    expect(errors(trade({ level }))).toEqual(["[script fixture_trade] trade level must be 1–60"]);
  });

  it("rejects nicknames longer than ten characters", () => {
    expect(errors(trade({ nickname: "ELEVENCHARS" }))).toEqual(["[script fixture_trade] trade nickname is longer than 10 characters"]);
  });

  it("runs text and reference checks through nested then and else, including else-only trades", () => {
    const cmd = trade();
    cmd.then = [{ op: "say", text: "a".repeat(19) }];
    cmd.else = [trade(), { ...trade(), else: [{ op: "say", text: "b".repeat(19) }] }];
    const found = errors(cmd);
    expect(found).toEqual([
      `[script fixture_trade] word too long: "${"a".repeat(19)}"`,
      `[script fixture_trade] word too long: "${"b".repeat(19)}"`,
    ]);
    const ops: string[] = [];
    eachCmd([cmd], (c) => ops.push(c.op));
    expect(ops).toEqual(["trade", "say", "trade", "trade", "say"]);
  });
});
