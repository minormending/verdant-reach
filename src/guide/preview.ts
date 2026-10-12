// Dev only (`guide.html?preview=atlas`): a stand-in walkthrough with one map
// panel for every map, a boss card for every leader and rival fight, and
// sample species and item cards, for checking the page while the real
// walkthrough is written. Never used by a production build.

import type { MapId } from "../contracts";
import { MAP_IDS } from "../contracts";
import { WORLD } from "../world";
import type { Section } from "./types";

export function atlasSections(): Section[] {
  const bosses = ["rival_1", "hollis", "nell", "rival_3", "flora", "rowan", "mercer"].filter((id) => WORLD.trainers[id] || WORLD.trainers[`${id}_oak`]);
  const sections: Section[] = [{
    id: "preview-cards", part: "Preview", title: "Cards",
    blocks: [
      { p: "A **preview** of every block type. Text uses the game's names, like DR. VALE." },
      { tip: "Hidden items sparkle faintly every few seconds.", title: "HIDDEN ITEMS" },
      { list: ["One", "Two **bold**"] },
      { checklist: ["Catch a FERN FIDDLEHEAD", "Heal at the GREENHOUSE"] },
      { species: "oak_acorn", note: "The starter of the wood line." },
      { item: "foxfire_lantern" },
      ...bosses.map((boss) => ({ boss })),
    ],
  }];
  const maps = MAP_IDS.filter((id) => WORLD.maps[id]) as MapId[];
  for (const map of maps) {
    sections.push({ id: `preview-${map}`, part: "Preview: every map", title: WORLD.maps[map].name, blocks: [{ map }] });
  }
  sections.push({ id: "preview-spur", part: "Preview: every map", title: "ROUTE 9 after the credits", blocks: [{ map: "route_9", flags: { game_cleared: true }, note: "Story-state rendering." }] });
  return sections;
}
