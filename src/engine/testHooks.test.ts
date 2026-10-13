import { afterEach, expect, it, vi } from "vitest";
import { devSeed } from "./random";
import { testHooks } from "./testHooks";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each([
  { DEV: true, MODE: "development", on: true },  // vite dev
  { DEV: false, MODE: "e2e", on: true },         // vite build --mode e2e (npm run e2e)
  { DEV: false, MODE: "production", on: false }, // the public build
])("test hooks in %j", ({ DEV, MODE, on }) => {
  vi.stubEnv("DEV", DEV);
  vi.stubEnv("MODE", MODE);
  vi.stubGlobal("location", { search: "?seed=42" });
  expect(testHooks()).toBe(on);
  expect(devSeed()).toBe(on ? 42 : null);
});
