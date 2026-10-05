import { describe, expect, it } from "vitest";
import { growthPeriods } from "./growth";

describe("growthPeriods", () => {
  it("starts slow, speeds up to a flicker and covers the whole sequence", () => {
    const p = growthPeriods(300);
    expect(p[0]).toBeGreaterThanOrEqual(20);
    expect(p[p.length - 1]).toBeLessThanOrEqual(3);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(300);
  });
});
