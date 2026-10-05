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
| `assets/species/<id>/<kind>.png` (`kind`: front, front__2, front__3, back, icon, icon__2) | `species/<id>/`: `frames[...]` |
| `assets/species/<id>/<kind>.png?sport` | the same frame, with the palette swapped to `sport` |
| `assets/tiles/<key>.png`, `<key>__2.png` | the tileset that defines `<key>`: `base` frame 1 / 2 |
| `assets/tiles/<key>~<n>.png` | that tile's `alts[n-1]` |
| `assets/tiles/<key>@<mask>.png`, `<key>@<mask>__2.png` | that tile's `masks[mask]` frame 1 / 2 |
| `assets/structures/<key>.png` | `structures/<key>/`: `image` |
| `assets/characters/<key>.png` | `characters/<key>/`: `sheet` |
| `assets/trainers/<k>.png`, `assets/items/<k>.png`, `assets/ui/<k>.png`, `assets/stills/<k>.png` | the set whose `logicalDir` matches, entry `<k>` |

Sheet cells come back as cut-out canvases, cached. A logical path that no
bundle provides is **missing**: the game draws its placeholder and the bundle
test fails.

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
| front | 56x56 | first one | 1–3 frames: the battle idle cycle, ping-ponged, same registration; faces left |
| back | 48x48 | first one | exactly 1 frame |
| icon | 16x16 | first one | 1–2 frames: party menu and follower |

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

**Ownership.** Each `TileKey` is defined by **exactly one** tileset; the test
enforces this. A tileset may define any subset of keys. Group tiles by
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

## 6. Character bundle: `character.json`

```json
{ "format": "verdant.character/1", "id": "vale", "sheet": "sheet.png",
  "frame": [16, 16], "rows": ["down", "up", "left", "right"], "columns": ["stand", "stepA", "stepB"],
  "credits": "…", "source": { "kind": "generated", "tool": "tools/art/characters.py" } }
```

- The sheet is 48x64 as in `CHAR_ROWS`.
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
- Every `TileKey` is in exactly one tileset.
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
  - a validation panel.
