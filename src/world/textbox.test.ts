import { expect, it } from "vitest";
import { TEXTBOX } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "./index";
import { textFitErrors, textPages, validateWorld, wrapText } from "./validate";

it("wraps and counts pages using the shared 36-column, three-row box", () => {
  const row = "W".repeat(TEXTBOX.cols);
  expect(wrapText(`${row} next`)).toEqual([row, "next"]);
  expect(textPages(Array(TEXTBOX.lines).fill(row).join("\n"))).toBe(1);
  expect(textPages(Array(TEXTBOX.lines + 1).fill(row).join("\n"))).toBe(2);
  expect(textPages("A\n\nB\fC")).toBe(3);
  expect(textFitErrors(row, "fixture")).toEqual([]);
  expect(textFitErrors(`${row}W`, "fixture")).toEqual([`fixture word too long: "${row}W"`]);
});

it("validates the new budget for dialogue, signs, trainer lines and item descriptions", () => {
  const world = structuredClone(WORLD);
  // A long word that would fail the old width fits exactly on one new row.
  const fits = "W".repeat(TEXTBOX.cols);
  const overflow = `${fits}W`;
  world.scripts.fixture_box = [{ op: "say", text: Array(TEXTBOX.lines * 3 + 1).fill(fits).join("\n") }];
  world.maps.fallowfield.signs[0].text = overflow;
  const trainer = Object.values(world.trainers)[0];
  trainer.intro = overflow;
  const item = DATA.items.water_flask;
  const originalDescription = item.description;
  let errors: string[];
  try {
    item.description = Array(TEXTBOX.lines + 1).fill(fits).join("\n");
    errors = validateWorld(world);
  } finally {
    item.description = originalDescription;
  }
  expect(errors!).toContain(`[script fixture_box] 4 pages: "${world.scripts.fixture_box[0].op === "say" && world.scripts.fixture_box[0].text}"`);
  expect(errors!.some((e) => e.startsWith("[fallowfield] sign at") && e.includes("word too long"))).toBe(true);
  expect(errors!).toContain(`[trainer ${trainer.id}] word too long "${overflow}"`);
  expect(errors!.some((e) => e.startsWith("[item water_flask] 2 pages:"))).toBe(true);
});
