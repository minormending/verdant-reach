import { describe, expect, it } from "vitest";
import type { GameContext } from "../contracts";
import { mapTime, worldTime } from "./time";

describe("map time", () => {
  it("prefers the map's forced time, else the clock", () => {
    expect(mapTime({ time: "night" }, () => "day")).toBe("night");
    expect(mapTime({}, () => "morning")).toBe("morning");
    expect(mapTime(undefined, () => "day")).toBe("day");
    const ctx = {
      world: { maps: { herbarium_roof: { time: "night" } } },
      state: { position: { map: "herbarium_roof" } },
      timeOfDay: () => "day",
    } as unknown as GameContext;
    expect(worldTime(ctx)).toBe("night");
    (ctx.state.position as { map: string }).map = "fallowfield";
    expect(worldTime(ctx)).toBe("day");
  });
});
