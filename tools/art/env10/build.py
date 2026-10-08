"""Build the Chapter 9 environment: the `desert` and `ridge` tilesets, four
Thistledown and Sanguine Ridge structures, and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env10/build.py [--review]
Registered as `env10` in build_all.py (after tiles: the scrub's ground is the
shipped sand colour, and the review composes the shipped sand, grass, water
and town tiles). --review redraws the sheets without emitting bundles.
Bundle writes go through artkit.emit, which skips edited/imported bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets
import buildings

TILE_LABELS = [
    ("desert_scrub", ["desert_scrub", "desert_scrub__2"]),
    ("cracked_earth", ["cracked_earth", "cracked_earth~1", "cracked_earth~2", "cracked_earth~3"]),
    ("red_ledge", ["red_ledge"]),
    ("red_rock", ["red_rock@0", "red_rock@4", "red_rock@6", "red_rock@14", "red_rock@12",
                  "red_rock@5", "red_rock@15", "red_rock@10", "red_rock@11"]),
    ("resin_floor", ["resin_floor", "resin_floor~1", "resin_floor~2", "resin_floor~3"]),
]

# Joined patches, as the game draws them. '.' sand, 'c' cracked earth,
# ',' scrub, 'R' red rock, 'v' red ledge, 'g' grass, 'f' resin floor.
PATCHES = {
    "the canyon: walls, a ledge, scrub": [
        "RRRRRRRRRR",
        "RRRRRRRRRR",
        "RRcccccRRR",
        "Rcc...ccRR",
        "Rc..,,,.cR",
        "Rcc.,,,..c",
        "Rcccccc..c",
        "Rvvvvvvccc",
        "Rcccc..ccR",
        "RRcc..ccRR",
    ],
    "the desert: outcrops, clay, a wash": [
        "cccccc..gg",
        "ccRRcc...g",
        "ccRRRcc...",
        "cccRcc....",
        "cccccc,,,.",
        "..ccc.,,,,",
        "......,,,.",
        "cccccccc..",
        "cccccRRcc.",
    ],
    "Conservatory 8: rock and resin floor": [
        "RRRRRRRRRR",
        "RRRRfffRRR",
        "RRRRfffRRR",
        "RRRRRfRRRR",
        "RRRfffffRR",
        "RRRfffffRR",
        "RRRRRRRRRR",
    ],
}
GROUND = {".": "sand", "c": "cracked_earth", ",": "desert_scrub", "R": "red_rock", "v": "red_ledge",
          "g": "grass", "f": "resin_floor"}
GROUP = {"sand": "sand", "cracked_earth": "sand", "desert_scrub": "sand", "red_ledge": "sand", "red_rock": "red_rock"}


def patch(rows, tiles, frame=1):
    from review_maps import image
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    for y in range(h):
        for x in range(w):
            key = GROUND[rows[y][x]]
            g = GROUP.get(key)
            stem = None
            if key in ("sand", "red_rock"):
                m = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or GROUP.get(GROUND[rows[ny][nx]]) == g:
                        m |= bit
                stem = f"{key}@{m}"
            else:
                alts = [n for n in (1, 2, 3) if f"{key}~{n}" in tiles]
                n = kit.pick_alt(x, y, alts)
                stem = f"{key}~{n}" if n else key
                if key == "desert_scrub" and frame == 2:
                    stem += "__2"
            t = tiles.get(stem) or image(f"assets/tiles/{stem}.png")
            im.alpha_composite(t, (x * 16, y * 16))
    return im


def env_sheet():
    """Each new tile (frames, alternates and sample masks) at 4x, joined
    patches at 2x, then each structure at 2x on its ground."""
    tiles = {**tilesets.TILESETS["desert"], **tilesets.TILESETS["ridge"]}
    W = 1400
    sheet = Image.new("RGBA", (W, 1400), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "CHAPTER 9 ENVIRONMENT: new tiles at 4x (frames, alternates, masks); joined patches and structures at 2x",
           fill="#f0e8c8")
    x, y = 12, 30
    for key, stems in TILE_LABELS:
        row_w = len(stems) * 70
        if x + row_w > W:
            x, y = 12, y + 104
        d.text((x, y), key, fill="#f0e8c8")
        for j, stem in enumerate(stems):
            sheet.alpha_composite(tiles[stem].resize((64, 64), Image.Resampling.NEAREST), (x + j * 70, y + 16))
            lab = stem.replace(key, "") or "base"
            d.text((x + j * 70, y + 84), lab, fill="#98a0a8")
        x += max(row_w + 30, 200)
    y += 112
    x = 12
    rowh = 0
    for label, rows in PATCHES.items():
        frames = (1, 2) if any("," in r for r in rows) else (1,)
        for fr in frames:
            im = patch(rows, tiles, fr)
            w2, h2 = im.width * 2, im.height * 2
            if x + w2 > W:
                x, y, rowh = 12, y + rowh + 24, 0
            d.text((x, y), label + (f" (frame {fr})" if len(frames) > 1 else ""), fill="#f0e8c8")
            sheet.alpha_composite(im.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
            x += w2 + 24
            rowh = max(rowh, h2 + 16)
    y += rowh + 24
    x = 12
    ground = {"dragon_tree_big": "cracked_earth", "adobe_house": "sand", "ridge_conservatory": "cracked_earth",
              "windmill_pump": "sand"}
    tallest = 0
    for key, im in buildings.IMAGES.items():
        w2, h2 = im.width * 2, im.height * 2
        if x + w2 > W:
            x, y = 12, y + tallest + 30
            tallest = 0
        d.text((x, y), key, fill="#f0e8c8")
        rows = ["." * (im.width // 16)] * (im.height // 16)
        GROUND["."] = ground[key]
        bg = patch(rows, tiles)
        GROUND["."] = "sand"
        bg.alpha_composite(im)
        sheet.alpha_composite(bg.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
        x += w2 + 24
        tallest = max(tallest, h2 + 16)
    sheet = sheet.crop((0, 0, W, y + tallest + 16))
    kit.save_png(kit.REVIEW / "ch9_env_lead.png", sheet)


def build(save=True):
    tilesets.build()
    buildings.build()
    if save:
        for tid, tiles in tilesets.TILESETS.items():
            kit.emit.tileset(tid, tiles, tool=kit.TOOL_TILES, name=tilesets.NAMES[tid],
                             order=tilesets.ORDER[tid], credits=kit.CREDITS)
        for key, im in buildings.IMAGES.items():
            kit.emit.structure(key, im, tool=kit.TOOL_BUILDINGS, credits=kit.CREDITS)
    env_sheet()
    from review_maps import review_maps
    review_maps()
    n = sum(len(v) for v in tilesets.TILESETS.values())
    print(f"Chapter 9: {n} tile images; {len(buildings.IMAGES)} structures")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
