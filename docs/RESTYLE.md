# The restyle: from GBC to LimeZu's modern 16-bit look (plan and binding decisions)

**The owner's decision (2026-10-07):** drop the Game Boy Color look. The world
moves to LimeZu's **Modern Interiors / Modern Exteriors** art (and Modern UI
where useful), and the **creatures are modernised too**, leaving the
4-colour Crystal rule behind. The lead (Claude) makes the decisions below;
implementers (Codex) build exactly these. If something is impossible or
contradictory, stop and say so.

All restyle work happens on branch **`restyle`**, cut from `postgame` (all
chapters, green). Chapters 6–11 branches are frozen. The story pass (the
dialogue, owned by the other lead session) also lands here; that session
edits only string literals in map files.

## 1. Licence and where the art lives (binding)

LimeZu's licence (all three packs): **use in commercial and non-commercial
projects is allowed; credit limezu.itch.io; no reselling or distributing the
assets.** The repository and the Pages source are **public**, so:

- **No LimeZu pixels, and nothing derived from them, ever enters git:** not
  the raw sheets, not crops, not bundles built from them, not review sheets
  that contain them.
- **The LimeZu art is an art pack, `limezu`,** generated locally into
  **`public/art/packs/limezu/`**, which is **gitignored**. The importer
  (code only: coordinates and mappings, no pixels) is public, in
  `tools/art/limezu/`, and reads the owner's local copies of the packs:
  - `…/research/moderninteriors-win`
  - `…/research/modernexteriors-win`
  - `…/research/modernuserinterface-win`
  Paths come from an env var or a gitignored local config, never hard-coded.
- **When the `limezu` pack is present, it is on by default.** Without it
  (public clones, CI today), the game falls back to the existing GBC base
  art. That fallback is a supported, tested mode until the owner decides how
  the shipped build gets the private art (§6).
- `public/art/CREDITS.md` gets a LimeZu credit line (text only) in R1.

## 2. What changes in the engine (R1)

The engine already y-sorts structures and characters (by footprint bottom
and feet). R1 extends that, contracts-first, with **no art**:

1. **Tall characters.** Character bundles declare `frame: [w, h]`
   (`[16, 16]` today). Support `[16, 32]`:
   - frames are drawn with the **feet on the tile's bottom edge**, rising
     one tile above;
   - y-sort stays by feet;
   - light-layer erase, shadows, hops, fly, emotes and the battle-transition
     snapshot all use the frame size;
   - the static-object rule (sheets narrower than 48 px) is unchanged.
   Sheets stay 3 columns (stand, stepA, stepB) × 4 rows (down, up, left,
   right).
2. **Props: structures with a footprint and a layer.** Extend
   `StructureSpec` with optional:
   - `footprint?: { x, y, w, h }`: the solid area in tiles, relative to the
     image's top-left. The default is the whole image (today's behaviour).
     A 1×2 plant uses `{ x: 0, y: 1, w: 1, h: 1 }`.
   - `layer?: "floor"`: drawn under all actors and never solid (rugs,
     floor decals). The default is the y-sorted layer, as today.
   - Doors keep working. The world validator and the map runtime use the
     footprint.
   - **Furniture becomes structures (props)**, so the contract lists props
     like any structure.
3. **The back wall face.** A new tile `wall_face` (`walk: false`, autotile
   group `wall_face`): the 2-tile-tall back wall of a room. A `wall_face`
   cell whose north neighbour is not `wall_face` is the **upper row** (mask
   bit N clear); otherwise it is the **lower row** (the baseboard). Rooms
   draw 2 rows of `wall_face` under the top `wall` border.
4. **Pack plumbing for a gitignored pack:**
   - `npm run art:index` must not write the `limezu` pack's entries into
     the committed `public/art/index.json`. It writes them to
     `public/art/packs/limezu/index.json` (gitignored with the pack).
   - At runtime the catalogue loads that file **if it exists** (a 404 is
     fine) and enables the pack by default. `?art=` still overrides, and
     `?art=base` forces the GBC fallback.
5. **Tests:**
   - tall-character draw offsets and y-sort with props;
   - footprint blocking (walk behind a plant's top half; blocked at its
     base);
   - floor-layer props are never solid;
   - `wall_face` masks;
   - index plumbing (the committed index is unchanged when the local pack
     exists);
   - the full suite, e2e and validator stay green in the **fallback**
     mode.

## 3. The importer (R2): LimeZu → the `limezu` pack, locally

`tools/art/limezu/build_pack.py`, deterministic, writing only into the
gitignored pack:
- **Tilesets:**
  - floors and walls from `Room_Builder_subfiles` (the floors, wall faces
    and borders);
  - outdoor ground, paths, water and cliffs from Modern Exteriors.
  The lead supplies the mapping (tile key → sheet and cell).
- **Props:** every furniture or scenery piece the maps use, cut by
  bounding box from the Theme Sorter sheets (the lead's `comps` method:
  8-connected blobs), each with its footprint.
- **Characters:** built from the Character Generator layers (bodies,
  outfits, hairstyles, accessories) per character key, using a mapping
  table (key → layers). Re-packed into our 48×128 sheet format.
- **Credits:** each bundle credits LimeZu.

## 4. Map re-layouts (R3, chapter by chapter)

Every interior and exterior is re-laid-out in LimeZu's ¾ style:
- 2-row back walls;
- furniture as props;
- town buildings as structures from Modern Exteriors.

Gameplay stays identical: warps, triggers, NPC positions where scripts
depend on them, puzzles, encounter areas, glide landings. The validator,
the puzzle tests and the e2e are the judge. The other lead session edits
string literals in these files; restyle work re-reads before every edit.

## 5. Creatures (R5), designed later

The creatures leave the 4-colour Crystal rule for a modern full-colour
style that sits with LimeZu's world. CREATURES.md v2 (palette, outline,
shading, size and animation rules), a pilot line, then the QA-gated Codex
loop as in Chapter 6. **Creature sprite size is decided in R5**. R1e lays
out the 320×180 battle screen using the current 56×56 fronts and 48×48 backs
at 1× until then.

## 6. Shipping (R7), decided with the owner

Options for getting the private art into the deployed build: a private
assets repository pulled by CI with a deploy key; deploying from a private
repository; or a manual local build-and-publish. **The owner chooses.**
Until then, `main` ships the GBC fallback. The release horizon
(`RELEASED_THROUGH`) is designed with the other lead session.

## 7. Phases

| Phase | What | Who |
|---|---|---|
| R1a ✓ | Engine: tall characters, props (footprint, floor layer), `wall_face`, tests (§2.1–2.3, §2.5); procedural GBC wall-face fallback | Codex |
| R1b ✓ | Local-pack plumbing and index tests (§2.4–2.5) | Codex |
| R1d ✓ | Screen core: 320×180, integer scaling, clamped camera and centred small maps, 36×3 dialogue and validation, native-size framed stills, title/intro/card/start-menu layouts and full-screen effects | Codex |
| R1e ✓ | Menu screens and battle laid out for 320×180; 36×3 battle dialogue, native-size creature sprites, full-width effects and layout checks | Codex |
| R2a ✓ | Interior importer, prop geometry contracts and original GBC fallback props (§1, §3) | lead (mappings) + Codex (code) |
| R2b ✓ | Outdoor importer, pixel footprints, prop signs, building doors, ground blob masks + local review (character/UI work remains R4/R6) | lead (mappings) + Codex (code) |
| R3a ✓ | Prologue/Chapter 1 interiors: `player_home`, `herbarium`, `herbarium_roof` (outdoor deck), `fennimore_house`, `bramblegate_conservatory`; shared `greenhouseMap()` (all ten healing centres) and narrow/wide market layouts (all six markets). Local 2× review: `tools/art/limezu/review/r3a.png`. | Codex; lead review pending |
| R3 | Map re-layouts: interiors, then exteriors, chapter by chapter | Codex, QA-gated, with the lead reviewing one render sheet each |
| R4 ✓ | 51 composed 16×32 characters; eight later-cast keys with original GBC stand-in fallbacks; objects/animals keep GBC. Local review: `tools/art/limezu/review/r4.png` (all directions and down steps at 3×, HOME at 320×180). Portraits deferred. | Codex; lead review pending |
| R5a ✓ | Creature v2 engine: 64×64 / 32×32 slots, v1 compatibility at centred 1×, material sport maps, original Crystal snapshot pack, kit2 and synthetic QA v2; no new creature art | Codex; browser e2e pending (sandbox denies localhost binding) |
| R5b ✓ | Starter v2 pilot: nine original oak/chili/lily bundles, 64×64 fronts/backs and 32×32 icons, four intro keys, material sports and 3× review; local real-scene battle captures in ignored LimeZu review | Codex; traced-pack fallback fix, blind-ID and lead review pending |
| R5 | Creature style v2 and a pilot, then the roster | lead (rules) + Codex loop |
| R6 ✓ | Modern UI Style 1: measured slices, shared skin, cursors, bars, slots, toggles and unchanged GBC fallback; local render `tools/art/limezu/review/r6.png` | Codex; browser playthrough and lead review pending |
| R6b ✓ | Trainer portraits from the Portrait Generator, derived from mapping/characters.json; dialogue speaker faces via src/world/speakers.ts | Codex; lead review pending |
| R7 | Shipping and the release horizon | the owner + both leads |


### R3a layout notes

- HOME extends two columns east so the back-wall hearth fits without touching
  JUNE's morning route or any gameplay coordinate. The Herbarium preserves its
  stair and arrival opening at 1,1 / 2,1; FENNIMORE has a reading alcove at 7,1
  to keep the seed-packet sign at 8,1 reachable. The outdoor observation deck
  keeps its railing, valley, camera target and prologue positions.
- Counter tiles remain beneath `prop_table_small` (and the cabinet/bookcase at
  the greenhouse counter ends). There is no `prop_counter`. The large markets
  retain counter end caps beneath the signed shelves, separating both clerks
  from customers. The greenhouse storage tile at 1,3 remains beneath
  `prop_cabinet_glass`, since the storage action is still tile-based.
- Signs, dialogue, warps, NPCs, triggers, heal points, pickups and script paths
  keep their existing coordinates and text. The Conservatory's hedge barriers,
  gate openings, levers and puzzle scripts are unchanged.
- Local render contains the LimeZu pack, with NPC staging at their authored
  positions (both story appearances shown; hedge gates use initial flags).
  It is licensed review material and remains gitignored.

### R1d screen decision (2026-10-07)

The owner chose **320×180** for LimeZu's art. R1d keeps 16×16 world tiles
(20×11.25 visible), centres maps smaller than the view on each axis, and
uses the existing 8×8 font and border in a bottom **36-column × 3-line**,
56-pixel-high dialogue box. Legacy 160×144 story stills are centred at 1×
on a dark frame until redrawn. Title, intro/name entry, ending card and START
menu use the new canvas; fades, transitions, night tint, GLOW and weather
cover it. The screen core adapts the existing page shell's canvas placement
while preserving touch/fullscreen controls. Menu screens in `src/screens/`
and the battle layout remain for **R1e**; neither is redesigned in R1d.

### R1e menu and battle layout (2026-10-08)

Menu screens now use canvas-derived margins, rows and columns from
`src/screens/kit/layout.ts`. Party and item pickers have wider rows; summary
and cabinet use specimen/detail columns; bag and shop pair a sidebar with a
wide list. Herbarium and notes use the full notebook width and a bottom
label, and options place controls beside their labels. Growth is centred;
trade, nursery and sprouting share the updated pickers/dialogue or R1d's
centred portrait window.

Battle uses a top-right foe and bottom-left player at **56×56 / 48×48, 1×**.
The HUD and command rail sit clear of the creatures; commands and moves are
above the **36×3 TEXTBOX**, with move details alongside. Particle targets,
weather, backgrounds, flashes and versus banners use the new canvas. The
existing panel borders, bitmap fonts and cursors remain until R6.

The R1e worker verified typecheck, unit/layout tests and the production build.
The full browser playthrough still needs lead verification: this worker's
sandbox rejects localhost server binding and Chromium startup.

### R6 UI skin (2026-10-08)

The private importer now builds `sets/ui_limezu` from the lead's Style 1
mapping. It scans the central axes to the contiguous inner fill to measure
asymmetric 9-slice caps (horizontal caps for bars); an outline that shares the
fill colour is excluded from the inner region. `--check` covers these crops,
metadata and the private index. Panel metadata supplies the darkest border
ink, with the specified contrast fallback.

`src/ui/skin.ts` is the shared drawing layer for windows, dialogue, list
selections, grid focus, HP/EXP, toggles and money icons. The existing geometry
and font are retained. Nearest-neighbour slices fit the existing padding;
small controls compress only their fixed caps. The mapped highlight has a
dark centre, so selections draw its authored frame around parchment instead
of putting dark ink on that centre. Missing skin assets retain the exact
GBC drawing primitives. The fallback reference hashes were also verified
against the pre-R6 implementations from HEAD.

Local review: `node tools/art/limezu/review_ui.mjs` creates an ignored,
self-contained `review/r6.html` using the real screens. Open it in a browser
and save its `r6.png` link into the same ignored directory. In this sandbox,
Chromium startup and localhost binding are denied. The provided `r6.png`
was made by `review_ui.mjs --software` followed by `replay_ui.py`, replaying
real scene Canvas calls with Pillow at 320×180. It includes all eight requested
views plus name entry. This supports visual inspection but does not replace
the pending browser e2e / browser capture review.

### R6b portrait cards (2026-10-08)

`build_pack.py` now derives all 26 trainer heads, the player's back of head,
and all 51 character faces from `mapping/characters.json`. The resolver uses
actual Portrait Generator filenames (hair style precedes `48x48`), excludes
`_Small` accessories, omits the four accessories without equivalents, and
falls back to accessory variant 1 only when the requested variant is absent.
Unresolved layers are errors. The public `mapping/portraits.json` holds only
measured cell geometry, frame coordinates and options: 960×288 sheets,
96×96 cells, neutral 0,0, blink 2,0, back 4,2.

Cards use the measured slot's native 9-slice caps, one-frame sizes of 56×56
(trainers) or 48×48 (player back and faces), and unscaled head pixels. The
chin is bottom-anchored with a four-pixel gap above the inner bottom edge.
Large hair/hat overflow is clipped at card edges; the facial features stay
visible. Neutral and blink cards share crop bounds and placement. Image-set
`frames` defaults to 1; the optional count describes horizontal frames and
`size` describes one frame. Base portraits remain static.

Faces are optional assets under `assets/faces`. The story-owned speaker table
was absent, so `src/world/speakers.ts` is created with the specified empty
mapping. Only script `say` commands resolve that table. Map entry and script
execution preload resolved faces; dialogue uses a shared script clock and
retains the card through the confirming frame. Blinks last six ticks every
150 ticks. Player faces resolve through the active player's walking key.

Local review commands (all pixel outputs remain gitignored):

```bash
node tools/art/limezu/review_portraits.mjs --software
$PY tools/art/limezu/replay_ui.py r6b
$PY tools/art/limezu/review_portraits.py
```

The sheets are `review/r6b.png` and `review/r6b-faces.png`, with both blink
frames and labelled walking-sprite comparisons for every trainer. The
320×180 trainer-intro and dialogue captures currently replay real scene
Canvas calls with Pillow. `review/r6b.html` provides the same scenes in a
self-contained browser page with PNG download links; its speaker fixture is
injected only into the review build. Browser capture and full e2e verification
remain pending: this worker's sandbox denies localhost binding, and no browser
is available through the UI tool.

R5a updates the shared Python validator to support 16×32 character frames
and horizontal image-set frame metadata, matching the TypeScript validator.
The earlier size-validation limitation is resolved.

### R5a creature engine (2026-10-08)

Both species bundle versions render at native pixel size in 64×64 front/back
and 32×32 icon slots. Legacy icons deliberately stay **1×**, centred; the
party uses six slots in two columns, and cabinet/Herbarium lists scroll with
taller rows. `?art=crystal` selects the indexed snapshot of all 130 current
original species. Base creature pixels are unchanged.

Move/type panels occupy the dialogue rail; both creatures and both HP boxes
remain clear. The move description uses the empty field above that rail.
OPTIONS sits inside the header with an eight-pixel inset. Software rendering
of the real scenes was inspected through the existing R6 review tooling.

The new kit has no species generators until R5b. QA detects v2 metadata,
checks the new geometry and material palette, and tests synthetic fixtures.
Palette harmony reads local exteriors Palette.png only, skipping with info
when absent. `build_all.py --regen` includes the empty creatures2 builder.
The headless e2e command was attempted but could not start its local server:
`listen EPERM 127.0.0.1`; browser playthrough remains for lead verification.

### R5b starter pilot (2026-10-08)

The oak, chili and Victoria water-lily lines now use original v2 bundles.
Shared cap/calyx/bud-and-rim motifs, named poses and material ramps connect
each three-stage family. The Crystal pack preserves all nine earlier
bundles. Four deterministic front keys move the signature organ; dedicated
back compositions and separately drawn 32px icons complete each bundle.
Sports recolour the named materials after 'Concordia', 'Black Pearl' and
'Chromatella' (the lily cultivar is a related Nymphaea, not Victoria).

The original-art 3× sheet is `tools/art/review/creatures2_review.png`.
`node tools/art/creatures2/review_battle.mjs` captures the real scene draw
path with the local LimeZu pack: OAK SAPLING back/GREEN CHILI front and
LILY PAD back/GREAT OAK front, each at 320×180, side by side in the ignored
`tools/art/limezu/review/r5b_battle.png`. This is software Canvas replay;
a browser capture and blind-ID remain for the lead.

V2 face checks now cover backs and both icons as well as every front key.
The only intended QA warnings are the oak's deliberately lobed silhouette
tips; their reason is recorded in the species notes. Local palette harmony
passes for all nine starters. See CREATURES_V2.md §6 for kit additions and
review commands.

R5b validation currently exposes a cross-version pack fallback defect:
`traced` has no oak icons and palette-only chili blossom/red chili
bundles, so those v1 overrides inherit v2 base frame sizes/palettes. The
Python full-bundle validator raises `palettes differ in length`; the
TypeScript pack validation reports 20 size mismatches (one test fails;
1604 pass). The loaders must resolve missing v1 files/metadata through the
Crystal snapshot before the full bundle gates are green. This is outside
the R5b worker's allowed file paths. Starter QA (zero errors), all 57 Python
QA tests, typecheck and the production build pass. Full regeneration
leaves every file under `public/art/` byte-identical; its final validation
fails at this same fallback defect. Unrelated regenerated review sheets
are restored, keeping the pilot diff focused.
