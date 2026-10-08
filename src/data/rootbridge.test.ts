import { expect, it } from "vitest";
import { REQUIRED_ITEMS } from "../contracts";
import { ITEMS } from "./items";

it("defines FIG ROOT as a required key item for living bridges", () => {
  expect(REQUIRED_ITEMS).toContain("fig_root");
  expect(ITEMS.fig_root).toMatchObject({
    name: "Fig Root", pocket: "key", price: 0,
    description: "Living roots that grow into bridges.", effect: { kind: "none" },
    usableInBattle: false, usableInField: false,
  });
});
