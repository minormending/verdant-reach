# Art QA

The read-only QA suite measures creature geometry, accidental face patterns,
animation registration, similarity, tile seams and map orientation landmarks.
It never writes art or runs generators. NumPy and Pillow are the existing
pinned art dependencies; `tools/art/requirements.txt` is unchanged.

Use the project's art virtualenv (activate it before `npm run qa:art`, which
uses `python3`), or invoke its Python explicitly:

```bash
PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
$PY tools/art/qa/qa.py oak_acorn oak_sapling great_oak
$PY tools/art/qa/qa.py --line oak --json /tmp/oak-qa.json
npm run qa:art -- --all --json /tmp/art-qa-report.json
npm run qa:art -- --all --strict
npm run qa:art -- --tiles terrain --json /tmp/tile-qa.json
npm run qa:art -- --tiles --json /tmp/all-tile-qa.json
npm run qa:art -- --tiles --patch /tmp/tile-patches.png --changed main
npm run qa:art -- --all --changed HEAD --json /tmp/changed-art.json
npm run qa:art:changed
npm run qa:art -- --sheet /tmp/milestone.png --changed HEAD~1
npm run qa:maps
ART_QA_MAPS_JSON=/tmp/milestone-maps.json npm run qa:maps
$PY -m unittest discover -s tools/art/qa -p 'test_*.py'
```

Choose species ids, `--line`, `--all`, or `--tiles [tileset]`. `--all` audits
all base species and tilesets. `--changed` filters that selection to bundles
different from the git ref; alone, it selects changed species and tilesets.
With ids or `--line`, it filters the species selection and also checks changed
tilesets. Clone comparisons and progression still use the
whole current roster. `--line` uses gameplay line names, including `orchid`
and `ghostpipe`, rather than guessing from generator names. Unknown selectors
and invalid git refs are usage errors (exit 2).

The shipped roster predates these checks: **errors gate changed art, not the
existing audit baseline**. A successful `--all` audit always exits 0, even
when its report contains errors; `--all --strict` exits 1 for any error-class
FAIL. `--changed <git-ref>` (alone, with `--all`, ids, `--line`, or `--tiles`)
exits 1 only for error-class FAILs in the selected changed species or tilesets.
Unchanged art cannot fail that gate, even with `--strict`. WARNs exit 0.
Targeted ids, `--line`, and `--tiles` without `--changed` continue to exit 1
for errors in their selection. `npm run qa:art:changed` is the art-agent/CI
gate, equivalent to `qa.py --all --changed origin/main`; the ref must exist.
JSON includes statuses, severity, measured values, face coordinates and frames,
per-frame size results, clone distances, every autotile mismatch, and the
maximum shared-edge mean difference. `error_count` counts reported errors
even when the audit exits 0.

Art agents should run QA on their line after each generator iteration, inspect
the numbers, and address errors and unintended warnings. At a milestone, use
`--sheet --changed <milestone-base>` for the final visual review. These are
heuristics: passing cannot prove that a plant has no face or that its identity
is distinctive. Keep the existing in-game intro and 1x review before delivery.
Do not relax published size rules merely to make today's roster green.

## Creature measurements

The suite reuses `crystal.kit.load_species`, `to_index`, `check`, and its moving
JSON files. `crystal` aggregates the existing palette, sport, alpha,
white-share, outline, orphan, registration and animation-format checks; these
are not reimplemented. All front images are scanned, including unused images
and frames displayed for only one tick. The table gives the worst result for
checks that aggregate frames; face coordinates retain every hit.

| Check | Severity | Measurement and threshold |
|---|---|---|
| `face_risk` | error | A compact 1–4px dark component (indexes 0/1, up to 2×2) with an index-3 pixel within Chebyshev distance 2; or two compact components with x separation 2–8 and y difference ≤1; or an isolated horizontal 3–8px dark component. Reports top-left coordinates and frame indexes. |
| `size_class` | error / warn | Baby: extent 38–44px, fill 22–38%; teen: 44–52px, 28–48%; adult: 52–56px, 38–62%. Extent or fill outside these inclusive bands is an error. Otherwise WARN if an adult touches fewer than two actual canvas edges, or within 1px of an extent limit or 2 percentage points of a fill limit. |
| `grounding` | warn | Lowest opaque row must be 54 or 55; notes containing `float` exempt it. |
| `centre_of_mass` | warn | Mean x of opaque pixels must be 28–34 inclusive. |
| `stage_progression` | error | Rest-pose fill and largest bounding-box dimension must each be nondecreasing from the previous stage in the line. First stages pass as inapplicable. |
| `back_fill` | warn | Opaque pixels / back canvas area must be 60–85% inclusive. |
| `anim_signature` | warn | Union of changed coordinates in frames actually used by `intro`, compared with frame 0: at least 2% of rest-pose opaque count; at least 80% of changes inside the union of kit's end-exclusive moving boxes. Missing boxes or an invalid/missing intro warn. |
| `clone_risk` | warn | Both 64-bit aHash distance <5 and 64-bit dHash distance <7 against another line's front[0]. Whole canvas, composited over battle-box green, resized with BOX filtering; size and placement are retained. Same-line pairs are excluded. |
| `silhouette_noise` | warn | More than 12 opaque pixels with exactly one cardinal opaque neighbour, or more than 4 transparent 1px holes enclosed by all eight opaque neighbours. Diagonal-only orphan pixels remain kit's responsibility. |

Stage and line come from the `sp({ id, name, line, stage, ... })` headers in
`src/data/species.ts`. The final stage is adult, stage 1 of a three-stage line
is baby, and intermediate stages and stage 1 of two-stage lines are teen.
Missing metadata fails rather than guessing; keep the parser in sync if that
authoring syntax changes. Fill means canvas area, not bounding-box area.

Face calibration uses 8-connected dark components, so a diagonal midrib is
one component rather than several "eyes". Candidates need an immediately
light 8-neighbour rim and a clear 2px light halo (for a pair, around both
components together). This excludes edge glints and crowded seams. Three or
more compact candidates within 8px are treated as seed/floret texture. Mouth
candidates need the same clear halo. These restrictions deliberately trade
some recall for useful review volume; large dark discs with internal glints,
light-only eye pairs, curved mouths, and faces embedded in dense texture can
escape detection. There are no species-specific suppression lists.

## Tiles and map landmarks

`--tiles` checks repeatable base tiles and every alternate, including animated
frames, for grass, path, stone_path, dirt, sand, moss, ash, tropical_grass and
paving. `seam` WARNs when opposite edge mean difference exceeds 16 on a 0–255
scale. The difference is the greater of mean absolute RGB difference
(composited over black) and mean alpha difference. RGB hidden under full
transparency is ignored. Results give horizontal and vertical numbers.

`autotile_edges` checks all 16 masks for each key declaring masks. Missing
variants fall back to base, following the runtime contract. For every
reciprocal east/west or south/north neighbour pair, every animation frame's
shared-edge mean difference uses the same RGB/alpha measurement as `seam`.
The check reports all nonzero mismatches and their maximum difference: PASS
at 0, WARN for a nonzero difference up to 16 (including 1–16), and an error
only above the shared `seam` threshold of 16. North/east/south/west are bits
1/2/4/8. This exposes existing texture discontinuities without treating every
small mismatch as an error.

**A seam fix must not introduce a visible per-tile pattern.** Hiding seams
by stamping the same border into every tile is a regression. Connected
planks and brick courses should continue their texture across the boundary;
a four-way-connected wall interior should read as one continuous surface.
Small residual edge differences up to 16 are acceptable when they read
better than a grid. Review patches before accepting a numerical improvement.

`grid_artifact` is a warning against the before version (`--changed` ref,
or `HEAD` when omitted). Repeat mask 15 in a 4×4 block; for ground, repeat
the base and each alternate instead. It measures absolute Fourier energy
at the 16px fundamental along both axes and their diagonal combinations
(frequencies 0 and ±4 in the 64px block, excluding DC). Signals are RGB
composited over black plus alpha; hidden RGB is ignored. WARN if energy
increases by more than 75% **and** more than 4 squared channel levels
(2 levels RMS). JSON includes before/after energy, ratio and delta for
every frame. Shorter repeating courses, existing regular motifs, and
quieter textures are not penalized just for being periodic. This heuristic
can flag a legitimate course change and can miss visible grids; it never
replaces the patch review or gates the build. New tiles have no comparison.

`qa.py --tiles --patch <out.png> [--changed <ref>]` writes one labelled row
per changed autotile key or ground key, before on the left and after on the
right, at nearest-neighbour 2×. Each view is the lead's 5-row × 9-column
cross: columns 2–6 form the stem and rows 2–3 form the arms (zero-based).
Masks use N/E/S/W bits and out-of-bounds neighbours count as joined, like
the game; missing variants fall back to base. Every animation frame and
ground alternate gets a labelled pair in the same key's row. Alternates
use a plain repeat so their texture can be inspected independently. The
comparison defaults to `HEAD`; `--changed` also filters the QA selection.
Keys are compared by resolved cell pixels and mask/alternate availability,
not sheet offsets, so a changed sheet does not add unchanged keys. Pack
tileset overrides and removed/added keys are included; an empty comparison
gets an explicit labelled PNG. This diagnostic uses base fallback rather
than the game's position-hashed decorated alternate selection.

`qa:maps` uses Vitest already installed in the repository. It prints a table
and writes `/tmp/art-qa-maps.json` (override with `ART_QA_MAPS_JSON`). Its five
synthetic/runtime tests also run under `npm test`. Each outdoor map is measured
at every in-bounds standable tile, using `buildMap` and `isWalkable`, ignoring
NPC occupancy and evaluating the default legend before story flags or field
moves. The 10×9 viewport starts at player tile minus (4,4), matching the game
camera. Each player position has equal weight; overlapping views are counted
separately. Artificial border scenery outside the map is excluded.

Landmarks are full structure footprints, signs (tile or map declaration), or
4-connected clusters of at least two non-ground tiles. An explicit ground-key
list excludes ordinary traversal textures, tall grass, flowers, water, lily
pads, and floor surfaces. Adjacent decorative kinds can form one cluster.
Town maps are the world's glide destinations (currently Fallowfield,
Bramblegate, Sugarbush, Glasshouse City and Cedarhallow): WARN below 85%.
Other outdoor routes/scenery WARN below 60%. JSON retains all uncovered
player positions. Coverage measures orientation cues, not the identity of
those cues: 100% does not prove a cedar appears in every view.

## Changed-only sheet

The git comparison includes committed differences from the ref, staged and
unstaged changes, untracked files, deletions, and both sides of renames.
Registry-only changes do not add cards. It includes base bundles and pack
bundles; deleted bundles get a labelled tombstone. Species show front[0],
the last intro step's frame, back, and the first icon in one row, with id and
all current species FAIL/WARN tags. Crystal intros settle on frame 0, so the
last-step image usually repeats the rest pose. Pack metadata merges with base
metadata and missing species PNGs fall back to base.

Tileset, character and structure sheets appear at 2×. Image sets show only
changed PNG entries unless their manifest changed, when all entries are
shown. Pack species labels use the base species' QA tags; QA checks currently
measure base art, not the effective pack. All images use nearest-neighbour
2× scaling. Cards wrap at 1400px; wider image sheets split into horizontal
strips without shrinking the pixels. An empty comparison produces a labelled
"No changed art bundles" PNG rather than stale previous review content.

## Shipped-roster calibration (2026-10-07)

Measured 78 base species. The existing kit reports no errors. Under the new
classification there are 50 failing species/check combinations across 49
species: 45 size failures, 3 face candidates, and 2 progression failures.
Nine edge-only size failures became warnings. Tiles add 32 error-class
autotile checks, for 82 total reported errors. These existing art issues
remain visible in the audit: `--all` exits 0, `--all --strict` exits 1, and
`--all --changed HEAD` exits 0 when no art differs from HEAD. No art was
changed to make this baseline pass.

| Check | PASS | WARN | FAIL |
|---|---:|---:|---:|
| crystal | 61 | 17 | 0 |
| face_risk | 75 | 0 | 3 |
| size_class | 3 | 30 | 45 |
| grounding | 78 | 0 | 0 |
| centre_of_mass | 25 | 53 | 0 |
| back_fill | 21 | 57 | 0 |
| anim_signature | 78 | 0 | 0 |
| clone_risk | 76 | 2 | 0 |
| silhouette_noise | 60 | 18 | 0 |
| stage_progression | 76 | 0 | 2 |
| autotile_edges (tile keys) | 1 | 1 | 32 |
| seam (tile frames) | 24 | 7 | 0 |

## Lead's review queue

Face candidates for the lead's visual judgement (zero-based frames and x/y):

- `sugar_maple`: frame 1, (15,9), 2px dark blob near a glint in the upper leaf.
- `pitcher_plant`: frame 4, (9,10), 3px horizontal dark mark in the lid.
- `snapdragon`: frame 4, (22,14), 2px dark blob near a petal highlight.

These are candidates, not assertions that the plant has a face. Visual
inspection shows leaf/petal/lid markings; the lead should decide whether each
reads as facial at 1×. The initial literal detector flagged 66 species,
mostly diagonal ribs, crowded glints and seed texture. The clear-halo and
8-connected-component calibration reduced that to three, with all synthetic
eye, eye-pair and mouth fixtures still detected. Lotus seed dots are excluded
as a seed lattice.

One cross-line clone pair: `lily_seedpod` / `dandelion_bud`, aHash=4 and
dHash=6. Their upright tapered lead leaves, left highlights and small side
leaves are similar despite different colours and flower heads. Both species
show the same pair warning; this is one pair, not two distinct clones.
Progression failures: `sundew` extent 53→52px (fill 28.8→42.5%), and `holly`
extent 52→51px (fill 38.4→51.6%).

The species still reporting errors are the 45 `size_class FAIL` species
listed below, plus `sugar_maple`, `pitcher_plant`, and `snapdragon` (face
candidates), and `sundew` (progression). `holly` has both size and progression
errors. These remain review work; they gate when their art changes.

**Manual blind-ID notes from the lead:** the moonflower line
(`moonflower_seed`, `moonflower_vine`, `moonflower`) reads as pitcher plants,
and `wild_rose` reads as "open mouths". These are visual identity notes for
human review, not automated checks or additional gate failures.

All 15 outdoor maps pass: Cedarhallow 100%, Route 4 93.0% (lowest), Route 6
98.6%, Burnt Stand 98.3%, Glasshouse City 99.6%, and the remaining ten 100%.
Tile calibration reports 32 failing autotile-key checks, one autotile warning
(`oldgrowth/canopy_drop`, maximum difference 9.17), and 7 seam warnings:
paving base and all three alternates, tropical_grass base both animation
frames, and stone_path base. See the reproducible JSON commands above for
mask pairs, animation frames, measured sizes, and warning coordinates.

### Remaining baseline flag list

**size_class FAIL (45):** `oak_acorn`, `oak_sapling`, `great_oak`, `chili_blossom`, `lily_seedpod`, `dandelion_bud`, `bramble_blossom`, `bramble_berry`, `sunflower_seedling`, `sunflower`, `pumpkin_blossom`, `green_pumpkin`, `fern_fiddlehead`, `unfurling_fern`, `flytrap_seedling`, `young_flytrap`, `venus_flytrap`, `sundew_rosette`, `maple_samara`, `maple_sapling`, `moonflower_seed`, `moonflower_vine`, `moonflower`, `clover_sprout`, `white_clover`, `foxglove`, `holly`, `wild_rose`, `pitcher_sprout`, `apple_pip`, `orchid_keiki`, `orchid_spike`, `monstera_cutting`, `monstera`, `ghostpipe_stalk`, `ghostpipe_nodding`, `ghost_pipe`, `fireweed_fluff`, `fireweed_shoot`, `lodgepole_cone`, `lodgepole_seedling`, `lodgepole_pine`, `skunk_cabbage_shoot`, `skunk_cabbage`, `cedar_seedling`.

**size_class WARN (30):** `green_chili`, `red_chili`, `lily_pad`, `giant_water_lily`, `dandelion`, `dandelion_clock`, `blackberry`, `sunflower_bud`, `pumpkin`, `ostrich_fern`, `sundew`, `sugar_maple`, `nettle_sprout`, `stinging_nettle`, `cattail_shoot`, `cattail`, `holly_seedling`, `mint_sprig`, `peppermint`, `rose_bud`, `pitcher_plant`, `snapdragon_sprout`, `snapdragon`, `apple_sapling`, `apple_tree`, `moth_orchid`, `sacred_lotus`, `bird_of_paradise`, `fireweed`, `red_cedar`.

**centre_of_mass WARN (53):** `oak_acorn`, `oak_sapling`, `great_oak`, `chili_blossom`, `green_chili`, `red_chili`, `lily_seedpod`, `lily_pad`, `giant_water_lily`, `dandelion_bud`, `dandelion`, `dandelion_clock`, `bramble_blossom`, `bramble_berry`, `blackberry`, `sunflower_seedling`, `sunflower_bud`, `sunflower`, `pumpkin_blossom`, `pumpkin`, `fern_fiddlehead`, `unfurling_fern`, `ostrich_fern`, `flytrap_seedling`, `venus_flytrap`, `sundew_rosette`, `maple_samara`, `maple_sapling`, `sugar_maple`, `stinging_nettle`, `moonflower_vine`, `moonflower`, `clover_sprout`, `white_clover`, `cattail_shoot`, `cattail`, `mint_sprig`, `rose_bud`, `wild_rose`, `pitcher_plant`, `apple_sapling`, `apple_tree`, `moth_orchid`, `sacred_lotus`, `ghostpipe_nodding`, `ghost_pipe`, `fireweed_shoot`, `lodgepole_cone`, `lodgepole_seedling`, `lodgepole_pine`, `skunk_cabbage_shoot`, `cedar_seedling`, `red_cedar`.

**back_fill WARN (57):** `oak_sapling`, `chili_blossom`, `green_chili`, `red_chili`, `lily_seedpod`, `lily_pad`, `dandelion_bud`, `sunflower_seedling`, `sunflower_bud`, `pumpkin_blossom`, `fern_fiddlehead`, `unfurling_fern`, `ostrich_fern`, `flytrap_seedling`, `young_flytrap`, `venus_flytrap`, `sundew_rosette`, `sundew`, `maple_samara`, `maple_sapling`, `sugar_maple`, `nettle_sprout`, `stinging_nettle`, `moonflower_seed`, `moonflower_vine`, `moonflower`, `clover_sprout`, `cattail_shoot`, `cattail`, `foxglove_rosette`, `foxglove`, `holly_seedling`, `mint_sprig`, `peppermint`, `rose_bud`, `wild_rose`, `pitcher_sprout`, `pitcher_plant`, `snapdragon_sprout`, `snapdragon`, `apple_sapling`, `orchid_keiki`, `orchid_spike`, `lotus_seed`, `paradise_shoot`, `ghostpipe_stalk`, `ghostpipe_nodding`, `ghost_pipe`, `fireweed_fluff`, `fireweed_shoot`, `fireweed`, `lodgepole_cone`, `lodgepole_seedling`, `lodgepole_pine`, `skunk_cabbage_shoot`, `cedar_seedling`, `red_cedar`.

**silhouette_noise WARN (18):** `lily_seedpod`, `dandelion`, `dandelion_clock`, `ostrich_fern`, `sundew_rosette`, `sundew`, `maple_sapling`, `sugar_maple`, `nettle_sprout`, `stinging_nettle`, `holly_seedling`, `holly`, `snapdragon`, `apple_tree`, `monstera`, `fireweed_shoot`, `fireweed`, `lodgepole_pine`.

**crystal WARN (17):** `blackberry`, `flytrap_seedling`, `young_flytrap`, `venus_flytrap`, `sundew_rosette`, `sundew`, `maple_samara`, `sugar_maple`, `nettle_sprout`, `stinging_nettle`, `moonflower_vine`, `moonflower`, `clover_sprout`, `white_clover`, `foxglove_rosette`, `lodgepole_cone`, `lodgepole_seedling`.

**Autotile FAIL keys, by tileset:**

- `burnt`: `ash`.
- `city`: `paving`, `iron_railing`, `fountain_basin`.
- `hollow`: `hollow_wall`.
- `interior`: `wall`, `glass_wall`.
- `nature`: `tree`, `maple_tree`, `tapped_maple`, `hedge`.
- `oldgrowth`: `oldgrowth_tree`, `canopy_boardwalk`, `rope_rail` (`canopy_drop` is WARN).
- `orchard`: `orchard_tree`, `stepping_stones`.
- `palm_house`: `tropical_grass`.
- `rose`: `rose_trellis`.
- `terrain`: `tall_grass`, `path`, `stone_path`, `dirt`, `sand`, `cliff`.
- `town`: `stone_wall`.
- `water`: `water`, `pond_lily`, `water_channel`, `reeds`, `bridge`, `bog`, `boardwalk`.
