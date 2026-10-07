# Art bundles: the swappable art format (v1)

**Goal:** every creature, tileset, structure and character is a
**self-contained folder of PNGs plus one JSON file**. Swapping one means
replacing a folder, or switching on an *art pack* that overrides it. Tools,
whether today's Python generators, a future in-browser editor or Aseprite and
Tiled exports, read and write exactly this format.

The game reads the bundles directly, with no build step: edit a PNG, reload
the page and it's in the game. This document is the **contract**. The
pipeline owner (Round 4, agent 2) may add sections on tooling but must not
change the format without main.

## 1. Layout

```
public/art/
  index.json                         GENERATED registry: `npm run art:index` (never hand-edit)
  CREDITS.md
  species/<species_id>/              one bundle per species
    species.json
    front.png front__2.png front__3.png back.png icon.png icon__2.png
  tilesets/<tileset_id>/             a sheet of 16x16 tiles plus its key map
    tileset.json
    sheet.png
  structures/<structure_key>/        one multi-tile building or scenery object
    structure.json
    structure.png
  characters/<character_key>/        one overworld walk sheet
    character.json
    sheet.png
  sets/<set_id>/                     flat image sets: portraits, items, ui, stills
    set.json
    *.png
  packs/<pack_id>/                   optional overrides, mirroring the tree above
    pack.json
    species/... tilesets/... (any subset)
```

Rules:
- Bundle folder names are the ids from `src/contracts/ids.ts`.
- File names inside a bundle are free, because the JSON names them. The
  defaults above are what tools write.

## 2. Logical paths and how they resolve

Game code never sees bundle files. It asks `ctx.assets.image(path)` for the
**logical paths** built by the helpers in `src/contracts/constants.ts`, and
the art registry (`src/art/`) resolves each one:

| Logical path | Resolves to |
|---|---|
| `assets/species/<id>/<kind>.png` (`kind`: front, front__2 … front__8, back, icon, icon__2) | `species/<id>/`: `frames[...]` |
| `assets/species/<id>/<kind>.png?sport` | the same frame, with the palette swapped to `sport` |
| `assets/tiles/<key>.png`, `<key>__2.png` | the tileset that defines `<key>`: `base` frame 1 / 2 |
| `assets/tiles/<key>~<n>.png` | that tile's `alts[n-1]` |
| `assets/tiles/<key>@<mask>.png`, `<key>@<mask>__2.png` | that tile's `masks[mask]` frame 1 / 2 |
| `assets/structures/<key>.png` | `structures/<key>/`: `image` |
| `assets/characters/<key>.png` | `characters/<key>/`: `sheet` |
| `assets/trainers/<k>.png`, `assets/items/<k>.png`, `assets/ui/<k>.png`, `assets/stills/<k>.png` | the set whose `logicalDir` matches, entry `<k>` |

Sheet cells come back as cut-out canvases, cached. A logical path that no
bundle provides is **missing**: the game draws its placeholder and the bundle
test fails. `wall_face` is a deliberate exception: the engine supplies a
procedural GBC fallback when its bundle images are absent.

## 3. Species bundle: `species.json`

```json
{
  "format": "verdant.species/1",
  "id": "oak_acorn",
  "palette": ["#181818", "#5a3818", "#a87838", "#f0e0a8"],
  "sport":   ["#181818", "#3a4a5a", "#7890a8", "#e8f0f8"],
  "frames": {
    "front": ["front.png", "front__2.png", "front__3.png"],
    "back":  ["back.png"],
    "icon":  ["icon.png", "icon__2.png"]
  },
  "credits": "Hand-drawn for Verdant Reach. Reference: <photo source>",
  "source": { "kind": "generated", "tool": "tools/art/species_a/oak.py" },
  "notes": "optional free text for artists"
}
```

**Images**

| Frame | Size | Required | Notes |
|---|---|---|---|
| front | 56x56 | first one | 1–8 frames, same registration, facing left. How they play is set by `anim` (below); with no `anim`, the first ≤3 ping-pong as the idle. |
| back | 48x48 | first one | exactly 1 frame |
| icon | 16x16 | first one | 1–2 frames: party menu and follower |

**Animation (`anim`, optional).** This is a Crystal-style per-species
animation. Each step is `[frame, ticks]`: the front frame index (0 = the
first `front` file) and how long it shows, in 60 fps ticks.

```json
"anim": {
  "intro": [[0, 8], [1, 6], [2, 6], [3, 10], [2, 6], [1, 6], [0, 1]],
  "idle":  [[0, 40], [4, 20]]
}
```

- `intro` plays **once** whenever the species appears (sent out or met in
  battle, a Herbarium page opening). It must end on frame 0.
- `idle` loops after that. If it's omitted, the creature holds frame 0.
- With no `anim` at all, the legacy behaviour applies (the first ≤3 front
  frames ping-pong).
- Every frame index must exist in `frames.front`. Packs can override `anim`
  like any other field.
- `"anim": null` means no animation (the legacy ping-pong). Packs merge
  shallowly, so a pack whose art predates the base's `anim` sets it to null
  to drop it; the `classic` pack does this for every species.

**Indexed colour.** This rule is what makes palette tools and art packs work.
- `palette` has exactly 4 colours, ordered darkest to lightest. Index 0 is
  the outline (normally `#181818`).
- **Every opaque pixel in every frame is exactly one of the palette colours.**
  Alpha is only 0 or 255.
- PNGs may be RGBA or indexed; either works.

**Sport (shiny).**
- `sport` is the same length as `palette`. The sport rendering replaces
  `palette[i]` with `sport[i]`, pixel for pixel.
- Shipped species must define it, and the test enforces this.
- Pick a real horticultural sport for the plant: variegation, a white or
  golden form, a "black" cultivar.

**`source`** says where the pixels came from:
- `{ "kind": "generated", "tool": "<script>" }`: a generator wrote them and
  may regenerate them.
- `{ "kind": "edited" }`: they were edited by hand or by a tool after
  generation. **Generators must never overwrite an `edited` bundle.**
- `{ "kind": "imported", "from": "<where>" }`.

## 4. Tileset bundle: `tileset.json`

```json
{
  "format": "verdant.tileset/1",
  "id": "terrain",
  "name": "Terrain",
  "tileSize": 16,
  "sheet": "sheet.png",
  "columns": 16,
  "tiles": {
    "grass":      { "base": 0, "alts": [1, 2, 3] },
    "tall_grass": { "base": [4, 5] },
    "water":      { "base": [16, 17], "masks": { "0": [18, 19], "5": [20, 21], "15": [16, 17] } }
  },
  "credits": "…",
  "source": { "kind": "generated", "tool": "tools/art/tiles.py" }
}
```

**The sheet**
- `sheet` is one PNG, `columns × 16` wide, with any number of 16px rows.
- Cell `n` is at `x = (n % columns) * 16`, `y = floor(n / columns) * 16`.
- Unused cells are transparent.

**References.** A *ref* is a cell number (a static tile) or an array of 1–2
cell numbers (animation frames 1 and 2).
- `base` (required) is the plain tile.
- `alts` (optional, up to 3 static refs) are ground variations, picked by a
  position hash.
- `masks` (optional) are autotile variants keyed `"0"`–`"15"`, where
  N=1, E=2, S=4 and W=8 are set for same-group neighbours.
  - Any subset may be present; a missing mask falls back to `base`.
  - Which tiles join which group is gameplay-shared, so it stays in
    `AUTOTILE` in the contracts. A tileset only supplies the images.
- If `base` is animated, give each mask the same number of frames.
- `wall_face` is a non-walkable back-wall tile in its own `wall_face`
  autotile group. It uses only the N bit: mask `0` is the upper row (north
  neighbour is not `wall_face`), mask `1` is the lower row/baseboard (north
  neighbour is `wall_face`). Author two rows below the room's top `wall`
  border; the shared legend uses `¤`. A tileset can supply `base` and these
  two masks. Until that art exists, the engine draws plaster and a baseboard
  procedurally; no generated or committed PNGs change.

**Ownership.** Each image-backed `TileKey` is defined by **exactly one**
tileset; the test enforces this. `wall_face` may use its procedural fallback
without a tileset owner. A tileset may define any subset of keys. Group tiles by
theme, such as terrain, nature, town, interior, city or orchard, so that a
whole look can be swapped at once.

## 5. Structure bundle: `structure.json`

```json
{ "format": "verdant.structure/1", "id": "herbarium", "image": "structure.png",
  "size": [6, 4], "credits": "…", "source": { "kind": "generated", "tool": "tools/art/structures.py" } }
```

- `size` is in tiles and must equal `STRUCTURES[id]` w×h.
- The image is `(w*16) x (h*16)`.
- Lit windows at night are found automatically, as before.
- Buildings and furniture props both use `StructureSpec` in
  `src/contracts/ids.ts`. `w` and `h` describe the image area; optional
  `footprint: { x, y, w, h }` describes the solid rectangle in tiles,
  relative to that area's top-left. It defaults to the whole image. For a
  1×2 plant with a walkable canopy, use `{ x: 0, y: 1, w: 1, h: 1 }`.
  Rendering sorts by the footprint's bottom edge; the image stays aligned
  to its declared image area. Door coordinates remain relative to the
  image and always override blocking, including outside the footprint.
- Optional `layer: "floor"` draws the prop after tiles and before every
  y-sorted structure or actor, and never adds collision. The underlying
  terrain still controls walking. With no layer, the prop is y-sorted.
- Footprint and layer are gameplay contracts, not art-pack metadata.
  Explicit-footprint and floor props may overlay ordinary map terrain;
  legacy structures still use `@` cells across their image area.

## 6. Character bundle: `character.json`

```json
{ "format": "verdant.character/1", "id": "vale", "sheet": "sheet.png",
  "frame": [16, 16], "rows": ["down", "up", "left", "right"], "columns": ["stand", "stepA", "stepB"],
  "credits": "…", "source": { "kind": "generated", "tool": "tools/art/characters.py" } }
```

- `frame` is `[16, 16]` (GBC) or `[16, 32]` (tall). The sheet is three
  frame-width columns by four frame-height rows: 48×64 or 48×128.
  Frame metadata is read after pack overrides and Art Lab edits.
- Tall frames place their feet on the occupied tile's bottom edge and rise
  one tile above it. Sorting and ground shadows remain anchored to the
  occupied tile; hop and fly lift move the full frame. Emotes sit above
  its head and the light layer erases its full silhouette. Battle
  transitions use the same overworld draw. The existing 16×16 GBC sheets
  keep their original 4px elevation for visual compatibility.
- Sheets narrower than 48px remain static objects; their rows are states,
  cropped at the declared frame height.
- `rows` and `columns` are fixed in v1. They're documented here so tools
  don't have to guess.

## 7. Image sets: `set.json`

These are for flat images that don't need more structure:

| Set | `logicalDir` | Contents |
|---|---|---|
| `portraits` | `assets/trainers` | trainer portraits |
| `items` | `assets/items` | item icons |
| `ui` | `assets/ui` | UI images |
| `stills` | `assets/stills` | story stills |

```json
{ "format": "verdant.imageset/1", "id": "portraits", "logicalDir": "assets/trainers",
  "images": { "bram": { "file": "bram.png", "size": [56, 56] } },
  "credits": "…" }
```

Each entry in `images` may also carry an optional `"source": { "kind", "tool" }`,
with the same meaning as in a species bundle, so generators skip entries
edited by hand.

**Forward compatibility, for every format:** readers ignore fields they
don't know. Writers may add optional fields; renaming or repurposing a field
needs a new `format` version.

## 8. Art packs

A pack is a folder under `public/art/packs/<pack_id>/`. Its `pack.json` is:

```json
{ "format": "verdant.pack/1", "id": "traced", "name": "PHOTO TRACED",
  "description": "The original photo-trace sprites for five lines.", "author": "…" }
```

**What a pack can override.** The pack mirrors the base tree, and any bundle
in it overrides the base bundle with the same id:
- A pack bundle's JSON is **merged shallowly over the base bundle's JSON**.
- File names resolve inside the pack folder first, then in the base folder.
- So a pack can replace images, palettes, single tiles (`tiles.<key>`) or a
  whole tileset sheet.

**Palette-only overrides.** If a pack species changes `palette` but not
`frames`, the base images are recoloured index by index (base `palette[i]`
becomes pack `palette[i]`). A recolour pack therefore needs no images at all.

**Activating packs**
- `?art=<id>[,<id>…]` in the URL, where later packs win.
- The Art Lab's pack toggles, saved in `localStorage["verdant.artPacks"]`.
- Packs are listed in `index.json`.

## 9. Validation (`src/art/bundles.test.ts`, run by `npm test` and CI)

- Every JSON file parses, has the right `format` and matches its folder id.
- Image sizes, frame counts and ref cell bounds are all correct.
- **Species colours:** every opaque pixel is one of the 4 palette colours,
  `sport` is present and the right length, and alpha is binary.
- Every image-backed `TileKey` is in exactly one tileset (`wall_face` may use its procedural fallback).
- Every logical path the contracts require resolves: species, tiles,
  structures, characters, portraits, required UI, marks and stills.
- `index.json` matches the folders.
- Packs: each override names an existing base bundle or a valid new one.

## 10. Tools

These are owned by the pipeline; see the tooling section it adds below.
- `npm run art:index`: rebuild `public/art/index.json`. This is Node with
  zero dependencies.
- `tools/art/artkit/`: a Python library to load, save, validate, slice and
  assemble bundles and to swap palettes.
- `tools/art/art.py`: a CLI to list, validate, explode a tileset into
  per-tile PNGs, repack, swap, re-palette, start a new species from a
  template, and make contact sheets.
- `?dev=art`, the **Art Lab** in the browser:
  - browse every bundle with palette swatches, a sport toggle, animation
    previews and a 4x4 autotile mask preview;
  - toggle packs;
  - drop a PNG onto a frame to preview a swap live (in memory only);
  - a validation panel;
  - per species, an Animation section: ▶ Intro, the looping idle and a
    timeline of the `anim` steps;
  - a **Compare** tab (`?dev=art#compare/<species>/<pack>`): base art vs a
    pack side by side at 1x/2x/4x, normal and sport, with intros replayable
    (click a sprite). With no species it lists every species the pack
    touches. It ignores the pack toggles.

## 11. Tooling (pipeline)

All Python tools run with the sprite pipeline's venv (Pillow + numpy):
`PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python`.

### `tools/art/art.py` (CLI)

| Command | What it does |
|---|---|
| `$PY tools/art/art.py list [kind]` | Bundles (kind, id, `source.kind`, palette / tile count) and packs. |
| `… validate [--strict] [-v]` | §9 checks plus `index.json` freshness. Required paths nobody provides yet are counted; `--strict` fails on them, `-v` lists them. |
| `… show <bundle> [--pack P] [-o f.png]` | 4x preview: species palette, sport and every frame (normal and sport); tilesets' sheet and a 4x4 mask grid per autotiled key. `<bundle>` is `kind/id` or a unique bare id. Writes to `tools/art/review/` by default. |
| `… explode <tileset> <dir>` | One PNG per tile image: `<key>.png`, `<key>__2.png`, `<key>~1.png`, `<key>@5.png`, `<key>@5__2.png`. |
| `… pack <dir> <tileset> [--name N]` | The inverse: assemble a folder of those PNGs into a tileset (canonical layout, below). Unchanged pixels keep `source`; changed ones mark it `edited`. A new tileset id creates one (and re-indexes). |
| `… swap species <id> --from <dir> [--quantize]` | Replace frames from `front.png`, `front__2.png`, …, `back.png`, `icon.png`, `icon__2.png` in `<dir>`. Sizes, binary alpha and ≤4 colours are enforced (`--quantize` snaps to the current palette instead). Frames not supplied are kept, recoloured into the new palette. Sets `source: {kind: "imported", from}`. |
| `… palette <id> '#a' '#b' '#c' '#d'` | New base palette: pixels are remapped index by index, `source` becomes `edited`. |
| `… palette <id> --sport '#a' …` | Set the sport palette only (no pixels change; `source` stays). |
| `… new species <id> --like <id>` | Copy a bundle as a template (`source: edited`, credits marked TODO). |
| `… contact <kind> [--pack P]` | Review sheet for `species`, `tileset`, `structure`, `character` or `set`; `contact pack --pack P` puts base and pack side by side. |
| `… resolve <logical path> [--pack P] [-o f.png]` | Resolve `assets/...` (including `?sport`) exactly as the runtime does. |

### `tools/art/artkit/` (library)

- `core`: paths, deterministic `save_png` (RGBA, colour type 6, no metadata,
  only rewritten when the bytes change) and `save_json` (stable, readable
  formatting), and contract ids parsed from `src/contracts/ids.ts`.
- `bundles`: `load(kind, id, packs=…)` gives a `Bundle` (merged JSON; files
  resolve pack-first; species files from the base folder are recoloured into
  a pack's palette), plus `write_species / write_tileset / write_structure /
  write_character / write_set_images`, `list_ids`, `list_packs`.
- `sheets`: tile stems, `assemble` (stems to sheet + key map) and `explode`.
  Canonical layout, 16 columns: unmasked keys packed first (base frames, then
  alts); then each autotiled key on fresh rows: `[base…, alts…]`, then a row
  with mask *m* in column *m* (and a second row for frame 2).
- `palette`: ordering (darkest to lightest by luma), `remap`, `quantize`,
  and `legacy_sport` (the Round 1–3 hue shift, used only to seed sports).
- `resolve.Resolver(packs=…)`: logical path to RGBA, or `None` if missing.
- `validate.validate()`: the §9 rules, returned as `(level, where, message)`.
- `emit`: **the generator API** (next section). `contact`: preview sheets.
  `tilegroups`: which tileset owns each Round 1–3 tile key. `index`: runs
  `tools/art/index.mjs`.

### Generators and `build_all.py`

Generators write bundles only through `artkit.emit` (or `gbc.save`, which
routes characters, structures and set images to it):

```python
sys.path.insert(0, "<repo>/tools/art")
from artkit import emit
emit.species("orchid_keiki", {"front": im, "front__2": im, "back": im, "icon": im, "icon__2": im},
             tool="tools/art/<folder>/<generator>.py")   # species now use tools/art/crystal/kit.py
emit.tileset("city", {"paving": im, "paving~1": im, "paving@5": im, ...}, tool=..., name="City", order=[...])
emit.structure("fountain", im, tool=...); emit.character("wren", im, tool=...)
emit.set_images("items", {"pruning_shears": im}, tool=...)
```

`emit` rules:
- It skips any bundle (or set entry) whose `source.kind` is `edited` or
  `imported`.
- It computes the palette, keeping the existing order when the colours are
  unchanged.
- It keeps hand-kept metadata: `sport` (when the length matches), `credits`,
  `notes` and a tileset's `name`.
- Default species credits come from `artkit/species_refs.json` (the
  reference photos).

**Species: the Crystal rule.** Every species is drawn by a line module
`tools/art/crystal/<line>.py` that defines `build()` and writes base bundles
through `tools/art/crystal/kit.py` (`write_species`, the rule checker
`check`, and `review_sheet` / `intro_strip`). The rule is in
docs/CREATURES.md § Crystal rule. `tools/art/crystal/build.py` (the
`crystal` builder) discovers and runs every such module; underscore modules
(`_*.py`) are shared helpers. The pre-Crystal generators in
`tools/art/species_a/` to `species_f/` are kept as reference only and are no
longer run; their art is the `classic` pack (below).

`$PY tools/art/build_all.py` validates and rebuilds `index.json`. `--regen
[names…]` first runs the `BUILDERS` list (add a line for a new generator).
A regen reproduces every `generated` bundle byte-identically: it writes
nothing when no art changed.

### The `classic` pack

`packs/classic/` is a snapshot of all 65 species as they were before the
Crystal-rule rollout (frames, palette, sport and notes copied from the base
bundles, `source: {kind: "imported", from: "base art before the Crystal-rule
rollout"}`, and `"anim": null` so the base's intros don't leak into the old
frames). Try it with `?art=classic`; the Art Lab's Compare tab uses it by
default (`?dev=art#compare/<id>/classic`). Rolling a species back is a copy
of its classic folder into `species/` with `source.kind` set to `edited`.

### Migration and the `traced` pack

- `tools/art/migrate_legacy.py` (archived) converted Round 1–3 `public/assets/`
  into bundles; that tree was then deleted, so with no arguments it does
  nothing. `--check --legacy <copy of the old tree>` re-runs the equivalence
  proof: every legacy file is pixel-identical through the resolver, and every
  seeded `?sport` frame equals the old hue shift.
- `tools/art/import_traced.py` builds `packs/traced/`:
  - the photo-traced fronts of the sunflower, oak, pumpkin, flytrap and fern
    lines (from `creature-sprites/out/plants`);
  - back views traced from the same cut-outs;
  - icons that fall back to the base icons recoloured into the pack palette;
  - palette-only overrides for `chili_blossom` and `red_chili`;
  - `"anim": null` on the traced species, which have a single front frame;
  - credits in `packs/traced/CREDITS.md`.
- Try it with `?art=traced`.
