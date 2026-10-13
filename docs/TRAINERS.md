# The Trainer Editor (trainereditor.html)

A page for editing every trainer's team, moves, bag, prize and AI with the
context beside it: where the trainer stands, which plants grow there, and how
its levels compare with the wild plants and the next Conservatory leader.
`npm run dev`, then http://localhost:5173/trainereditor.html (the build emits
`dist/trainereditor.html`; it is published like the other pages, with "Save to
repo" hidden). The data it edits is `src/data/trainers.json` (format:
docs/DATA.md § Trainers); the dialogue stays in `src/world/trainers.ts`.

**The list** (left): search by name, class, plant or map; filter by map, story
part (the guidebook walkthrough's order), class, kind (route trainer,
Conservatory leader, rival, Rootstock, Council, rematch-eligible), level range
and "edited only". Rows show the portrait, class and name, the team's icons
with levels, the map and the part. BRAM's three starter variants per battle
are separate rows (and linked from each other's header).

**A trainer** (right), top to bottom:

| Panel | Shows |
|---|---|
| Header | Portrait, kind, rematch eligibility, Council seat, the walkthrough section (a link into the guide), the designer's `note`, Revert. |
| Checks | The build's own `trainersFileErrors` for this trainer, live; warnings (below); a cheap balance hint (summed stats at level vs. the shipped team; leaders still need `npm test`); the **level strip**: this trainer vs. the wild plants on its map (or the nearest map with any) vs. the next Conservatory leader. |
| Team | Up to six members: add, remove, reorder. The species picker searches by name, type and stage and shows sprites, types, stage and base stats. Level; **Default** moves (the engine's rule, `movesAtLevel`: the last four learned, keeping two attacks) or **Custom** (four slots from the learnset at or below the level, earlier stages included, each with level learned, type, category, power, accuracy and PP; "Allow any move" adds every move, flagged off-learnset); **Grafted**; stats at that level with the battle's formula (`calcTrainerStats`). |
| Bag, prize, AI | Items with quantities; the prize (the default rule, top level x 20, or a fixed amount); `basic` or `smart`. |
| Type coverage | Every attacking type against each member (the game's type chart), with weak/resist/immune counts, threats, the team's damaging move types and what they hit. |
| Rematch preview | Route rematches at +N (the game's `buildRematch`, growth included) for eligible trainers; the +8 post-game rematch for Council seats. |
| Where | Every map the trainer is fought on, drawn with the guide's `renderMap` in a story state where it stands, with its tile marked and its sight line shaded: NPC id, tile, facing, sight, `visibleWhen`, sight/talk/script battle, the script, route rematches, the nearest heal point (by warps). |
| Available plants | The map's wild encounters (grass, bog, water; levels, day and night %, every `encountersWhen` variant labelled), then each map one warp away (collapsed). |

**Warnings** never block a save; errors do. A member below the level its
previous stage grows at (level triggers, or for care, item and trade growth the
level rematches use) is flagged, except a `grafted` member and BRAM's collared
starter in Rival 2 and 3 (`GROWTH_EXCEPTIONS` in `src/trainereditor/team.ts`).
Moves outside the learnset, or learned above the member's level, are flagged
too; the shipped bosses use a few on purpose (balance.test.ts).

**Saving.** Edits are kept per trainer in IndexedDB (`verdant.trainereditor`)
as whole entries that differ from the shipped file; the page works without
IndexedDB, it just forgets on reload. **Changes** lists what changed in words
and every error in the file. **Export** downloads a complete `trainers.json` in
the canonical layout (byte-identical to the shipped file when nothing
changed): drop it into `src/data/` and run `npm test`. **Load…** reads a
`trainers.json` back in as edits.

**Save to repo** (dev server only): posts the file to
`/__trainereditor/save`, a `configureServer` middleware in `vite.config.ts`
with `apply: "serve"` (absent from builds and `vite preview`). It accepts only a
same-origin JSON POST with the editor's header, validates the body with the
build's own modules (loaded through the dev server), and writes
`src/data/trainers.json`. The page then reloads with it as the shipped data.

**Play with these trainers** opens `index.html?trainerlab=1`: at boot the game
dynamically imports `src/trainereditor/hook.ts`, loads the saved edits,
checks them, builds the trainers (Council rematches included) and swaps them
into `WORLD.trainers` in memory. Without the param the module is never
loaded; edits that fail the checks are logged and ignored. On the dev server,
*Play here* opens `?trainerlab=1&dev=world&play=1&map=<id>` with the trainer's
visibility flags.

**Code.** `src/trainereditor/`: pure, unit-tested modules (`catalog.ts`
locations, kinds, story places and filters; `context.ts` wild levels, warps,
heal points, the next leader and the level strip; `team.ts` learnsets, default
moves, stats, warnings, coverage, rematch previews and the balance hint;
`edits.ts` edits, export, import, diff and validation), the hook (`hook.ts`),
and the page (`app.ts` state, `store.ts`, `main.ts`, `detail.ts`,
`teamview.ts`, `trainereditor.css`). The loader and validator are
`src/world/trainerFile.ts`.

**Limitations.** Trainer ids, names, classes, portraits, music, marks and
dialogue are not edited here (they tie into maps, scripts and the text-box
rules); add or rename trainers in the JSON and `trainers.ts` by hand. The
balance hint is not the balance simulation: run `npm test`. Maps draw a still
frame.
