import { expect, it } from "vitest";
import { REQUIRED_ITEMS } from "../contracts";
import { ITEMS } from "./items";

it("defines the required FOXFIRE LANTERN as an automatic key item", () => {
  expect(REQUIRED_ITEMS).toContain("foxfire_lantern");
  expect(ITEMS.foxfire_lantern).toMatchObject({
    name: "Foxfire Jar", pocket: "key", price: 0,
    description: "A jar of glowing fungus.", effect: { kind: "none" },
    usableInBattle: false, usableInField: false,
  });
});
