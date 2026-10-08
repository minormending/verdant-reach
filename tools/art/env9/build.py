"""Build the Chapter 8 environment: the `relay_upper` tileset (the Root Relay's
upper floors under Rootstock) and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env9/build.py [--review]
Registered as `env9` in build_all.py (after tiles and env4: the banner, the
terminal and the vent are drawn over the shipped wall, cable_floor and paving).
--review redraws the sheets without emitting bundles. Bundle writes go through
artkit.emit, which skips edited/imported bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets

TILE_LABELS = [
    ("cable_trunk", [f"cable_trunk@{m}" for m in (10, 5, 6, 12, 3, 9, 2, 8, 4, 1)]),
    ("cable_trunk (junctions)", [f"cable_trunk@{m}" for m in (0, 7, 11, 13, 14, 15)]),
    ("relay_terminal", ["relay_terminal", "relay_terminal__2"]),
    ("roof_vent", ["roof_vent", "roof_vent__2"]),
    ("roof_glass", ["roof_glass", "roof_glass~1", "roof_glass~2", "roof_glass~3"]),
    ("rootstock_banner", ["rootstock_banner"]),
]
MASK_NAMES = {10: "run E-W", 5: "run N-S", 6: "bend E-S", 12: "bend S-W", 3: "bend N-E", 9: "bend N-W",
              2: "end (E)", 8: "end (W)", 4: "end (S)", 1: "end (N)", 0: "alone", 7: "T", 11: "T",
              13: "T", 14: "T", 15: "cross"}

# A joined run on the server-hall plates: from the wall, round two bends,
# into a rack and a terminal. '=' cable, '[' rack, 't' terminal, 'W' wall.
PATCH = [
    "WWWWWWWWW",
    "W=====t..",
    "W=.......",
    "W===[[...",
    "W........",
]


def _label(stem):
    if stem.startswith("cable_trunk@"):
        return MASK_NAMES[int(stem.split("@")[1])]
    return stem.replace(stem.split("~")[0].split("__")[0], "") or "base"


def patch(t):
    floor = kit.shipped("cable_floor")
    other = {"[": kit.shipped("server_rack"), "t": t["relay_terminal"], "W": kit.shipped("wall"), ".": floor}
    im = Image.new("RGBA", (len(PATCH[0]) * 16, len(PATCH) * 16))
    for y, row in enumerate(PATCH):
        for x, c in enumerate(row):
            if c == "=":
                m = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= ny < len(PATCH) and 0 <= nx < len(row)) or PATCH[ny][nx] == "=":
                        m |= bit
                a = t[f"cable_trunk@{m}"]
            else:
                a = other[c]
            im.alpha_composite(kit.to_image(a), (x * 16, y * 16))
    return im


def env_sheet():
    """Each new tile (frames, alternates and every cable mask) at 4x, then a joined patch."""
    t = tilesets.TILESETS["relay_upper"]
    W = 1200
    sheet = Image.new("RGBA", (W, 900), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "CHAPTER 8 ENVIRONMENT: the Root Relay's upper floors, new tiles at 4x (frames, alternates, cable masks)",
           fill="#f0e8c8")
    x, y = 12, 30
    for key, stems in TILE_LABELS:
        row_w = len(stems) * 70
        if x + row_w > W:
            x, y = 12, y + 104
        d.text((x, y), key, fill="#f0e8c8")
        for j, stem in enumerate(stems):
            sheet.alpha_composite(kit.to_image(t[stem]).resize((64, 64), Image.Resampling.NEAREST), (x + j * 70, y + 16))
            d.text((x + j * 70, y + 84), _label(stem), fill="#98a0a8")
        x += row_w + 30
    y += 112
    d.text((12, y), "cable_trunk joined on the 2F plates: off the wall, two bends, into a rack and a terminal (4x)", fill="#f0e8c8")
    im = patch(t)
    sheet.alpha_composite(im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST), (12, y + 16))
    sheet = sheet.crop((0, 0, W, y + 16 + im.height * 4 + 12))
    kit.save_png(kit.REVIEW / "ch8_env_lead.png", sheet)


def build(save=True):
    tilesets.build()
    if save:
        for tid, tiles in tilesets.TILESETS.items():
            kit.emit.tileset(tid, tiles, tool=kit.TOOL_TILES, name=tilesets.NAMES[tid],
                             order=tilesets.ORDER[tid], credits=kit.CREDITS)
    env_sheet()
    from review_maps import review_maps
    review_maps()
    n = sum(len(v) for v in tilesets.TILESETS.values())
    print(f"Chapter 8: {n} tile images")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
