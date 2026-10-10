"""Build the Chapter 10 environment: the `grove` tileset, the Council hall, the
Grove Gate and the Elder's trunk, and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env11/build.py [--review]
Registered as `env11` in build_all.py (after env10: the map review composes the
shipped desert, frontier, town and terrain tiles). --review redraws the sheets
without emitting bundles. Bundle writes go through artkit.emit, which skips
edited/imported bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets
import buildings

TILE_LABELS = [
    ("aspen_tree", ["aspen_tree", "aspen_tree~1", "aspen_tree~2", "aspen_tree~3"]),
    ("grove_floor", ["grove_floor", "grove_floor~1", "grove_floor~2", "grove_floor~3"]),
    ("grove_grass", ["grove_grass", "grove_grass__2"]),
    ("root_vein", ["root_vein@5", "root_vein@5__2", "root_vein@10", "root_vein@6", "root_vein@13",
                   "root_vein@15", "root_vein@15__2", "root_vein@4"]),
    ("listening_clearing", ["listening_clearing", "listening_clearing__2", "listening_clearing@5",
                            "listening_clearing@5__2"]),
]

# Joined patches, as the game draws them. 'T' aspen, '.' grove floor,
# ',' grove grass, ':' root vein, 'c' listening clearing.
PATCHES = {
    "a ring: aspen bands, a root lane, grass": [
        "TTTTTTTTTTTT",
        "TTTTT:TTTTTT",
        "T....:.,,,,T",
        "T.,,.:.,,,,T",
        "T.,,.c.....T",
        "TTTT.:..TTTT",
        "TTTT.:..TTTT",
        "T....::::..T",
        "T.......:..T",
        "TTTTTTTT:TTT",
    ],
}
GROUND = {"T": "aspen_tree", ".": "grove_floor", ",": "grove_grass", ":": "root_vein", "c": "listening_clearing"}
GROUP = {"root_vein": "root_vein", "listening_clearing": "root_vein"}


def patch(rows, tiles, frame=1):
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    for y in range(h):
        for x in range(w):
            key = GROUND[rows[y][x]]
            sfx = "__2" if frame == 2 and f"{key}__2" in tiles else ""
            if key in GROUP:
                m = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or GROUP.get(GROUND[rows[ny][nx]]) == GROUP[key]:
                        m |= bit
                stem = f"{key}@{m}{sfx}"
            else:
                alts = [n for n in (1, 2, 3) if f"{key}~{n}" in tiles and (not sfx or f"{key}~{n}__2" in tiles)]
                n = kit.pick_alt(x, y, alts)
                stem = (f"{key}~{n}" if n else key) + sfx
            im.alpha_composite(tiles[stem], (x * 16, y * 16))
    return im


def env_sheet():
    """Each new tile (frames, alternates and sample masks) at 4x, a joined
    patch at 2x (both frames), then each structure at 2x on its ground."""
    tiles = tilesets.TILESETS["grove"]
    W = 1400
    sheet = Image.new("RGBA", (W, 1400), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "CHAPTER 10 ENVIRONMENT: new tiles at 4x (frames, alternates, masks); a joined patch and structures at 2x",
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
        for fr in (1, 2):
            im = patch(rows, tiles, fr)
            w2, h2 = im.width * 2, im.height * 2
            if x + w2 > W:
                x, y, rowh = 12, y + rowh + 24, 0
            d.text((x, y), f"{label} (frame {fr})", fill="#f0e8c8")
            sheet.alpha_composite(im.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
            x += w2 + 24
            rowh = max(rowh, h2 + 16)
    y += rowh + 24
    x = 12
    from review_maps import image
    ground = {"council_hall": "grass", "grove_gate": "grass", "elder_trunk": "grove_floor"}
    tallest = 0
    for key, im in buildings.IMAGES.items():
        w2, h2 = im.width * 2, im.height * 2
        if x + w2 > W:
            x, y = 12, y + tallest + 30
            tallest = 0
        d.text((x, y), key, fill="#f0e8c8")
        bg = Image.new("RGBA", im.size)
        for yy in range(0, im.height, 16):
            for xx in range(0, im.width, 16):
                bg.alpha_composite(tiles.get(ground[key]) or image(f"assets/tiles/{ground[key]}.png"), (xx, yy))
        bg.alpha_composite(im)
        sheet.alpha_composite(bg.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
        x += w2 + 24
        tallest = max(tallest, h2 + 16)
    sheet = sheet.crop((0, 0, W, y + tallest + 16))
    kit.save_png(kit.REVIEW / "ch10_env_lead.png", sheet)


def build(save=True):
    tilesets.build()
    tilesets.check()
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
    print(f"Chapter 10: {n} tile images; {len(buildings.IMAGES)} structures")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
