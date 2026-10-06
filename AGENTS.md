# AGENTS.md: working on Verdant Reach

This file is for coding agents (Codex, Claude, and others). Read it first. It
holds the context that isn't obvious from the code.

## What this is

Verdant Reach is a Game Boy Color–style monster collector (Pokémon Crystal with
updated mechanics) in which every creature is a **real plant**. The owner builds
it for fun, to practise engineering management and planning.

- **Stack:** Vite, strict TypeScript and Canvas 2D at 160x144, integer-scaled.
  **Zero runtime dependencies.**
- **Live site:** https://minormending.github.io/verdant-reach/. It deploys
  automatically on every push to `main` (`.github/workflows/pages.yml` runs the
  tests, the build and the headless playthrough, and deploys only if all pass).
- **Scope so far:** the Prologue through Chapter 4 (Glasshouse City,
  Conservatory 3). The story bible is in `docs/story/` (chapters 5–11 aren't
  built yet).

## Commands

```bash
npm ci
npm run dev                 # http://localhost:5173
npm run typecheck           # strict tsc
npm test                    # vitest, about 420 tests: data, world validation, puzzles, balance, art bundles
npm run build               # typecheck + production bundle (relative base, for GitHub Pages)
npx playwright install chromium # first use: install the e2e browser
npm run e2e                 # headless full playthrough, 46 beats, speed 8, seed 1, daytime
npm run e2e -- --seed 42    # replay another RNG seed (unsigned 32-bit integer)
npm run art:index           # REQUIRED after adding, removing or renaming any file under public/art/

python3 -m venv .venv && .venv/bin/pip install -r tools/art/requirements.txt
.venv/bin/python tools/art/build_all.py            # validate the art and rebuild the index
.venv/bin/python tools/art/build_all.py --regen    # re-run every generator; must leave git clean
.venv/bin/python tools/art/crystal/build.py <line> [--sheet]   # rebuild one creature line, with a review sheet
.venv/bin/python tools/art/crystal/kit.py <ids...>             # run the rule checker and write a review sheet
```

Docstrings in `tools/art/` mention
`/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python`. That's
the owner's machine; any venv built from `tools/art/requirements.txt` gives
byte-identical output. Keep the pins: changing the Pillow or NumPy version can
change PNG bytes.

**Before you finish any change:** `npm run typecheck`, `npm test` and
`npm run build` must pass. If you touched art, `build_all.py --regen` must
leave `git status` clean (the generators are deterministic).

## Where things live

| Area | Path |
|---|---|
| Shared contracts (ids, data shapes, ops). Change them deliberately and keep them minimal. | `src/contracts/` |
| Engine, overworld, battle, menus | `src/engine`, `src/overworld`, `src/battle`, `src/screens`, `src/ui` |
| Species data, moves, items, Herbarium facts | `src/data/` (every Herbarium entry holds one TRUE, sourced plant fact) |
| Maps, story scripts, trainers | `src/world/` (`validate.ts` proves reachability, no soft-locks and text fit) |
| Art runtime (resolves logical asset paths to bundles), the Art Lab | `src/art/` |
| **All art, as swappable bundles** | `public/art/` (format: **docs/ART.md**) |
| Art generators and tools (Python) | `tools/art/` |
| Automated full playthrough | `e2e/` (`npm run e2e`; first use: `npx playwright install chromium`; 46 beats, report in ignored `e2e/last-report.json`; `npm run e2e -- --speed 6 --seed 1 --headed` to watch) |

The e2e runner fixes time to day and defaults to `--seed 1`. It prints the seed
and records it in the report; use `--seed N` to reproduce another run. Dev URLs
also accept `?seed=N` (0–4294967295); production ignores it. Seeded battle and
driver-fixture streams are independent of cosmetic draws and NPC idle time.
Without a seed, the game uses its usual randomness.

## The art system (read docs/ART.md)

- Every creature is a folder: `public/art/species/<id>/` with `species.json`
  plus PNGs.
  - Front frames are 56x56, facing left, `front` through `front__8`.
  - The back is 48x48 and the icons are 16x16 (2 frames).
  - `species.json` holds a 4-colour `palette`, a `sport` (shiny) palette, `anim`,
    `notes` and `credits`.
- Tilesets, structures, characters and image sets work the same way.
- **Art packs** (`public/art/packs/<id>/`) override any subset and are switched
  on with `?art=<id>`.
  - `classic` is the pre-Crystal creature art, kept as a rollback.
  - `traced` holds the original photo-traced sprites.
- **The Art Lab:** `?dev=art`. Browse every bundle, preview animations and
  sports, use the Compare tab (`#compare/<id>/classic`), and drop in a PNG to
  test a swap.
- **The source of truth is `public/art/`.** The generators are authoring
  tools: a bundle whose `source.kind` is `edited` or `imported` is never
  overwritten by `--regen`.

## Creature art rules (binding; full text in docs/CREATURES.md § Crystal rule)

1. **Palette:** index 0 = `#181818` (a full black outline, no selout), indexes
   1–2 = the species' two tones, index 3 = `#f8f8f8` white, **for highlights
   only**.
   - Every opaque pixel is one of the 4 colours, and alpha is 0 or 255.
   - The front's white share is 5–20%; backs and icons need at least 3%.
   - Exceptions are recorded in `tools/art/crystal/kit.py`:
     - `EXCEPTIONS` (the sunflower line keeps a gold third hue);
     - `WHITE_PARTS` (up to 35% white for genuinely white flowers: white_clover,
       moonflower, dandelion_clock, chili_blossom, giant_water_lily);
     - each needs an `EXCEPTION:` or `WHITE:` note.
2. **Two-hue plants:** put the second hue in the dark slot (the flytrap's red,
   the oak's bark brown, the holly's berries).
3. **Sport (shiny):** swaps only indexes 1–2, and is based on a real cultivar
   (see docs/SPORTS.md, and keep it in sync).
4. **Animation:** every species has an `anim.intro` (36–72 ticks at 60 fps,
   ending on frame 0) where its **signature part** moves (the flytrap snaps,
   the fern uncurls), plus an optional `anim.idle`. Declare the moving boxes
   in `write_species(moving=...)`.
5. **No faces.** Plants never get eyes or mouths (decision Q3). A black dot
   with a white glint reads as an eye, and a dark slit reads as a mouth;
   check every frame at 1x.
6. **Keep identity:** species ids, size classes (stage 1 small, stage 3 fills
   56), poses (docs/CREATURES.md pose vocabulary), and each line's shape motif
   and accent colour.
7. **Never copy, trace or import Nintendo or Game Freak sprites.** References
   are for principles only; the game is public.

### How to refine a creature

1. Edit its line module `tools/art/crystal/<line>.py`.
   - Helpers are in `_*.py`; old shape code loads through `kit.legacy("species_x/file.py")`.
   - **Never** `sys.path.insert` a `species_*` folder: module names clash with the kit.
2. Run `.venv/bin/python tools/art/crystal/build.py <line> --sheet`. Read the
   checker output (errors must be 0) and look at the review sheet in
   `tools/art/review/`.
3. `npm run art:index` (only if you added or renamed files), then `npm test`.
4. Check it in the game: `npm run dev`, then
   `/?dev=world&play=1&map=route_1&species=<id>&level=40` (the battle intro),
   and `/?dev=art#compare/<id>/classic`.

### How to add a new species

1. Add the id to `SPECIES_IDS` in `src/contracts/ids.ts`.
2. Add its data (stats, learnset, `pollination`, growth) and a Herbarium entry
   with a true, sourced fact in `src/data/`.
3. Add encounters in `src/world/maps/`.
4. Draw it in a `tools/art/crystal/<line>.py` module (copy a similar line),
   then `npm run art:index`. The bundle test fails until every required
   frame exists.

## Known weak sprites (a good next task)

- `holly`: the adult reads as a bush, not a knight.
- `green_pumpkin` and `pumpkin`: rough rib lines, thin gloss.
- `sundew_rosette` and `sundew`: spindly.
- `foxglove`: the bells read as stacked segments.
- `orchid_spike`: the flower went white, which weakens its link to the magenta
  `moth_orchid`.
- `bramble_berry` and `blackberry`: too dark, close to classic.
- `dandelion_clock`: the seed volley is cramped against the left edge.
- `paradise_shoot`: reads a little like a mushroom.

Full roster review: `tools/art/review/roster_crystal.png`.

## Conventions

- `main` must pass `npm run release-check`; placeholders live only on feature branches.
- **Commits:** small and logical, with an imperative summary line and a body
  explaining why. Push to `main` only when typecheck, tests and the build pass;
  a push deploys the site.
- **Writing in the game:** an 18-column x 2-line text box, a warm and concise
  voice (docs/STYLE.md), and UPPER-CASE names in dialogue (DR. VALE, BRAM).
- **Balance:** guarded by `src/battle/logic/balance.test.ts`. Keep it green.
  Flora (Conservatory 3) is meant to be the hardest boss so far.
- **Process safety:** stop only processes you started yourself. Never kill a
  process by port or PID unless you launched it.

## Deeper docs

- `docs/ARCHITECTURE.md`: modules and conventions.
- `docs/ART.md`: the bundle format and tools.
- `docs/CREATURES.md`: creature design.
- `docs/STYLE.md`: the art and writing bar.
- `docs/SPORTS.md`: shinies.
- `docs/ROUND3.md`, `docs/ROUND4.md`, `docs/CRYSTAL_PILOT.md`, `docs/ROLLOUT.md`:
  how past rounds were planned.
- `docs/story/`: the story bible (plot, characters, key plants, mechanics).
