"""Build the Chapter 7 environment: the `alpine` and `hideout` tilesets, four
Larchmere structures, and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env8/build.py [--review]
Registered as `env8` in build_all.py (after env7: red_water recolours the
shipped water shoreline). --review redraws the sheets without emitting bundles.
Bundle writes go through artkit.emit, which skips edited/imported bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets
import buildings

TILE_LABELS = [
    ("larch_tree", ["larch_tree"]),
    ("scree", ["scree", "scree~1", "scree~2", "scree~3"]),
    ("snow_grass", ["snow_grass", "snow_grass__2"]),
    ("frozen_shore", ["frozen_shore", "frozen_shore~1", "frozen_shore~2", "frozen_shore~3"]),
    ("red_water", ["red_water", "red_water__2", "red_water@0", "red_water@6", "red_water@12"]),
    ("hideout_floor", ["hideout_floor", "hideout_floor~1", "hideout_floor~2", "hideout_floor~3"]),
    ("hideout_wall", ["hideout_wall@0", "hideout_wall@10", "hideout_wall@15", "hideout_wall@11"]),
]


def env_sheet():
    """Each new tile (frames, alternates and sample masks) at 4x, then each structure at 2x."""
    tiles = {**tilesets.TILESETS["alpine"], **tilesets.TILESETS["hideout"]}
    from review_maps import image
    rack = [image("assets/tiles/server_rack.png"), image("assets/tiles/server_rack__2.png")]
    W = 1400
    sheet = Image.new("RGBA", (W, 1180), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "CHAPTER 7 ENVIRONMENT: new tiles at 4x (frames, alternates, masks), structures at 2x", fill="#f0e8c8")
    x, y = 12, 30
    for key, stems in TILE_LABELS + [("server_rack (existing, Root Relay)", None)]:
        row_w = 5 * 72
        if x + row_w > W:
            x, y = 12, y + 100
        d.text((x, y), key, fill="#f0e8c8")
        ims = [tiles[s] for s in stems] if stems else rack
        for j, im in enumerate(ims):
            sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x + j * 70, y + 16))
            if stems:
                lab = stems[j].replace(key, "") or "base"
                d.text((x + j * 70, y + 82), lab, fill="#98a0a8")
        x += max(len(ims) * 70 + 30, 200)
    # A 4x4 joined patch for each autotiled key (the in-game cross).
    y += 112
    x = 12
    patches = {"red_water": (["~~~~~~", "~~~~~~", "~~..~~", "~~...~", "~~~~~~", "~~~~~~"], "assets/tiles/grass.png"),
               "hideout_wall": (["WWWWWW", "W....W", "W.WW.W", "W.WW.W", "W....W", "WWWWWW"], None)}
    for key, (grid, ground) in patches.items():
        d.text((x, y), f"{key}: joined patch", fill="#f0e8c8")
        im = Image.new("RGBA", (96, 96))
        on = [[c != "." for c in r] for r in grid]
        for yy in range(6):
            for xx in range(6):
                if not on[yy][xx]:
                    t = image(ground) if ground else tiles["hideout_floor"]
                else:
                    m = 0
                    for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                        nx, ny = xx + dx, yy + dy
                        if not (0 <= nx < 6 and 0 <= ny < 6) or on[ny][nx]:
                            m |= bit
                    t = tiles[f"{key}@{m}"]
                im.alpha_composite(t, (xx * 16, yy * 16))
        sheet.alpha_composite(im.resize((192, 192), Image.Resampling.NEAREST), (x, y + 16))
        x += 230
    # Structures at 2x on grass.
    grass = image("assets/tiles/grass.png")
    sx, sy = x + 20, y
    for key, im in buildings.IMAGES.items():
        w, h = im.width * 2, im.height * 2
        if sx + w > W:
            sx, sy = 12, sy + 230
        d.text((sx, sy), key, fill="#f0e8c8")
        bg = Image.new("RGBA", im.size)
        for yy in range(0, im.height, 16):
            for xx in range(0, im.width, 16):
                bg.paste(grass, (xx, yy))
        bg.alpha_composite(im)
        sheet.alpha_composite(bg.resize((w, h), Image.Resampling.NEAREST), (sx, sy + 16))
        sx += w + 24
    sheet = sheet.crop((0, 0, W, max(sy + 16 + 2 * 64, y + 16 + 192) + 16))
    kit.save_png(kit.REVIEW / "ch7_env_lead.png", sheet)


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
    print(f"Chapter 7: {n} tile images; {len(buildings.IMAGES)} structures")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
