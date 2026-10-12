# The guidebook (guide.html)

A Prima-style strategy guide for the whole game, published next to it:
https://minormending.github.io/verdant-reach/guide.html (dev:
http://localhost:5173/guide.html).

Writers supply only the **prose** and say **which** map, trainer, plant or
item to show. Every table, picture and number is generated in the browser
from the game's own modules, so the guide can't drift from the build.

## How it is built

`guide.html` is a second Vite page (`build.rolldownOptions.input` in
`vite.config.ts`); `npm run build` emits `dist/guide.html` beside the game.
The guide shares the game's modules, so the build splits code they have in
common into shared chunks. The game's base, entry and behaviour are
unchanged.

| Module | Job |
|---|---|
| `src/guide/types.ts` | The content contract: `Section` and `Block`. |
| `src/guide/walkthrough/` | The walkthrough, `part1.ts` to `part3.ts`, combined in play order as `WALKTHROUGH`. |
| `src/guide/indexer.ts` | **Pure indexing** over `WORLD` and `DATA` (unit-tested in `indexer.test.ts`): wild encounter tables per method with day and night percentages from the weights and every `encountersWhen` variant; items on the ground (the engine's `item_pickup` rule), hidden items and berry bushes; trainers (line of sight and scripted fights, with BRAM's starter variants and rematches grouped); everything the map's scripts give, sell, trade or fight (every NPC, trigger, `onEnter` and `onWhiteout` script, following `call` and every branch). Plus the reverse indexes: where each species and item is found, learnsets per move, trainers by map, and the post-game Wanderers (`src/overworld/roaming.ts`). |
| `src/guide/mapRender.ts` | Draws a whole map on a canvas with the overworld's own pieces: `buildMap` and `refreshLegend` (story state), the tile catalog and `drawCell` (autotile masks, ground variation, fallbacks), `drawStructure`, `drawCharacter` and the tall-grass overlay, Y-sorted as in the game. |
| `src/guide/art.ts` | Pictures through the art registry (`src/art`), so `?art=classic` works here too. |
| `src/guide/blocks.ts` | Renders blocks: text, tips, lists, map panels, boss cards, species and item cards. |
| `src/guide/reference.ts` | The Herbarium, moves (sortable and filterable), items, type chart and trainers by map. |
| `src/guide/front.ts` | Cover, How to play (keys from `KEYMAP` in `src/engine/core.ts`, pods, growth triggers, field tools and types from the data), table of contents. |
| `src/guide/main.ts`, `guide.css` | Page shell: sticky bar, search, light and dark modes, print. |
| `src/guide/walkthrough.test.ts` | Validates the walkthrough (below). |

Map pictures render lazily as they scroll near. The print button draws
every remaining map first and opens every trainer's moves; the print
stylesheet starts each part and reference section on a new page.

## The content contract (`src/guide/types.ts`)

A `Section` is `{ id, part, title, blocks }`. `id` is the anchor
(`ch3-bramblegate`: lower case, digits and hyphens, unique). Sections with
the same `part` ("Prologue", "Chapter 3", "Post-game") are grouped under
one part heading, in order of first appearance.

| Block | Renders |
|---|---|
| `{ p }` | A paragraph. `**bold**` is the only markup; names in UPPER CASE as in the game. |
| `{ tip, title? }` | A boxed hint: puzzle solutions, missables, strategy. |
| `{ list }` / `{ checklist }` | A bullet list / a "Before you leave" checklist. |
| `{ map, flags?, note? }` | The map panel: picture with numbered markers (items, hidden items, berry bushes, trainers), wild plants per method (levels, day/night %, conditional tables labelled), items, trainers with teams and moves, gifts, special battles, trades, shop stock and prices, side quests. `flags` draws the map in a story state (`{ game_cleared: true }`): `legendWhen`, NPC `visibleWhen`, the active encounter table. Unset flags read false, as in a new game; trainers and item balls still show unless `flags` names their condition. |
| `{ boss, note? }` | A boss card: portrait, class and name, prize, AI, bag items, Pressed Mark, every team member with types and moves. Pass a trainer id (`hollis`) or a group: `rival_2` shows BRAM's three variants by the player's starter, and a trainer with a `<id>_rematch` shows the rematch as a tab. |
| `{ species, note? }` | Sprite, types, base stats, growth and where to find it. |
| `{ item, note? }` | Icon, description and where to find it. |

Anchors other sections can link to: `#map-<mapId>` (the first panel for a
map), `#sp-<speciesId>`, `#item-<itemId>`, `#move-<moveId>`,
`#boss-<trainerId>`, `#herbarium`, `#moves`, `#items`, `#types`, `#trainers`.

## How to add a section

1. Add a `Section` to the right part file in play order.
2. Write the prose in `p`, `tip`, `list` and `checklist` blocks. Don't type
   out levels, rates, teams or prices: put a `{ map }`, `{ boss }`,
   `{ species }` or `{ item }` block where the reader needs them.
3. Run `npx vitest run src/guide` and look at it in `npm run dev`
   (`/guide.html#<your-section-id>`).

`src/guide/walkthrough.test.ts` checks that every block names a map,
trainer, species or item that exists, that section ids are unique and
well formed, that text blocks aren't empty, and that **every map with wild
plants, trainers or items has a map panel** somewhere in the walkthrough.
When the coverage check fails it lists the maps still missing.

In dev, `guide.html?preview=atlas` appends a stand-in part with a panel for
every map and a sample of every block type (production builds ignore it).
