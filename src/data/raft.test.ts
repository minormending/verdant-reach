import { expect, it } from "vitest";
import { REQUIRED_ITEMS } from "../contracts";
import { ITEMS } from "./items";

it("defines LILY RAFT as a required key item used at the water's edge", () => {
  expect(REQUIRED_ITEMS).toContain("lily_raft");
  expect(ITEMS.lily_raft).toMatchObject({
    name: "Lily Raft", pocket: "key", price: 0, effect: { kind: "none" },
    usableInBattle: false, usableInField: false,
  });
});
