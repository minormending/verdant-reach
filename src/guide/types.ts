// The guidebook's walkthrough content (docs/GUIDE.md). Writers fill
// src/guide/walkthrough/*.ts with Sections; the guide page (src/guide/)
// renders them, expanding the data blocks (`map`, `boss`, `species`) from the
// game's own data, so tables and pictures never drift from the game.

import type { ItemId, MapId, SpeciesId } from "../contracts";

/** One block of a walkthrough section, rendered in order. */
export type Block =
  /** A paragraph. Inline: **bold**; UPPER-CASE names as in the game. */
  | { p: string }
  /** A boxed hint (puzzle solutions, missables, strategy). */
  | { tip: string; title?: string }
  /** A bullet list. */
  | { list: string[] }
  /** "Before you leave" checklist. */
  | { checklist: string[] }
  /**
   * A full map panel, built from the map data: a picture of the map (rendered
   * with the game's own tiles), wild encounters (species, levels, rates, time
   * of day), items lying around and hidden items, trainers with their teams,
   * gifts, trades and shop stock found on the map.
   * `flags` renders the map in a story state (legendWhen/encountersWhen/NPC
   * visibility), e.g. { game_cleared: true } for the Route 9 spur.
   */
  | { map: MapId; flags?: Record<string, boolean>; note?: string }
  /** A boss card (leader, rival, admin, Council): portrait, full team with levels and moves, prize. */
  | { boss: string; note?: string }
  /** A highlighted creature (a gift, starter, legendary): sprite, types, stats and where to get it. */
  | { species: SpeciesId; note?: string }
  /** A highlighted key item (field tools such as the lantern or raft). */
  | { item: ItemId; note?: string };

export interface Section {
  /** Stable anchor, e.g. "ch3-bramblegate". */
  id: string;
  /** Part heading this section belongs to, e.g. "Prologue", "Chapter 3", "Post-game". */
  part: string;
  title: string;
  blocks: Block[];
}
