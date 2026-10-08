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
| R4 | Characters for every NPC key; portraits (LimeZu UI portrait generator, if usable) | Codex + lead review |
| R5 | Creature style v2 and a pilot, then the roster | lead (rules) + Codex loop |
| R6 | UI pass (text box, menus) from Modern UI, if it earns its place | later |
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
