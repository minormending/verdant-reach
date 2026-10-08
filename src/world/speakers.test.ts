import { afterEach, expect, it } from "vitest";
import type { CharacterKey } from "../contracts";
import { SPEAKERS, speakerFace } from "./speakers";
// Test-only entries: the story-owned production table stays empty.
const table = SPEAKERS as Record<string, CharacterKey | null>;
afterEach(() => { delete table["TEST VALE"]; delete table["TEST SIGN"]; });
it("looks up trimmed, case-insensitive display names and treats unknown/null as no face", () => {
  table["TEST VALE"] = "vale"; table["TEST SIGN"] = null;
  expect(speakerFace("  test vale  ")).toBe("vale");
  expect(speakerFace("Test Sign")).toBeNull();
  expect(speakerFace("unknown fixture speaker")).toBeNull();
  expect(speakerFace("")).toBeNull();
  expect(speakerFace(undefined)).toBeNull();
});
