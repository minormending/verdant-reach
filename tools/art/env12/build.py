"""Build the Chapter 11 environment: the `council` tileset for the Council's
rooms, and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env12/build.py [--review]
Registered as `env12` in build_all.py (after env11: props are drawn over the
shipped basalt, resin, marble and window tiles, and the map review composes
the Grove's litter and roots). --review redraws the sheets without emitting
bundles. Bundle writes go through artkit.emit, which skips edited/imported
bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets

TILE_LABELS = [
    ("jar_shelf", ["jar_shelf"]),
    ("poison_bed", ["poison_bed@0", "poison_bed@10", "poison_bed@6", "poison_bed@14", "poison_bed@12", "poison_bed@15"]),
    ("star_floor", ["star_floor", "star_floor~1", "star_floor~2", "star_floor~3"]),
    ("moon_lantern", ["moon_lantern", "moon_lantern__2"]),
    ("night_window", ["night_window"]),
    ("loam_floor", ["loam_floor", "loam_floor~1", "loam_floor~2", "loam_floor~3"]),
    ("rot_pool", ["rot_pool@0", "rot_pool@0__2", "rot_pool@6", "rot_pool@14", "rot_pool@12", "rot_pool@7",
                  "rot_pool@15", "rot_pool@13", "rot_pool@3", "rot_pool@11", "rot_pool@9"]),
    ("brazier", ["brazier", "brazier__2"]),
    ("aspen_pillar", ["aspen_pillar@0", "aspen_pillar@4", "aspen_pillar@5", "aspen_pillar@1"]),
]

# Joined patches, as the game draws them, each on its room's floor.
PATCHES = {
    "APOTHECARY: shelves, beds and rails": (
        ["jjjjjj", "......", ".RRR..", ".RRR..", "......", "RR..RR"],
        {"j": "jar_shelf", ".": "basalt_floor", "R": "poison_bed"}),
    "SLEEPER: windows, lanterns, stars": (
        ["OOOOOO", "......", ".L..L.", "......", "..ss..", "L.ss.L"],
        {"O": "night_window", ".": "star_floor", "L": "moon_lantern", "s": "night_floor"}),
    "ROTTER: pools in the loam": (
        ["......", ".~~~..", ".~~~.~", ".~~~..", "......", "~~..~."],
        {".": "loam_floor", "~": "rot_pool"}),
    "KINDLER: braziers on the flags": (
        ["......", ".B..B.", "......", "..B...", "......", ".B..B."],
        {".": "resin_floor", "B": "brazier"}),
    "KEEPER: colonnades by the root": (
        ["I.;:;I", "I.;:;I", "..;:;.", "I.;:;I", "I.;:;I", "..;:;."],
        {".": "floor_marble", "I": "aspen_pillar", ";": "grove_floor", ":": "root_vein"}),
}
GROUP = {"poison_bed": "poison_bed", "rot_pool": "rot_pool", "aspen_pillar": "aspen_pillar", "root_vein": "root_vein"}


def patch(rows, legend, tiles, frame=1):
    from review_maps import image
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    for y in range(h):
        for x in range(w):
            key = legend[rows[y][x]]
            get = (lambda st: tiles.get(st)) if key in tiles else (lambda st: image(f"assets/tiles/{st}.png"))
            sfx = "__2" if frame == 2 and get(f"{key}__2") is not None else ""
            if key in GROUP:
                m = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or GROUP.get(legend[rows[ny][nx]]) == GROUP[key]:
                        m |= bit
                stem = f"{key}@{m}{sfx}"
            else:
                alts = [n for n in (1, 2, 3) if get(f"{key}~{n}") is not None]
                n = kit.pick_alt(x, y, alts)
                stem = (f"{key}~{n}" if n else key) + sfx
            im.alpha_composite(get(stem), (x * 16, y * 16))
    return im


def env_sheet():
    """Each new tile (frames, alternates and sample masks) at 4x, then joined
    patches at 2x (both frames) on their rooms' floors."""
    tiles = tilesets.TILESETS["council"]
    W = 1400
    sheet = Image.new("RGBA", (W, 1600), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "CHAPTER 11 ENVIRONMENT: new tiles at 4x (frames, alternates, masks); joined patches at 2x",
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
        x += max(row_w + 30, 160)
    y += 112
    x = 12
    rowh = 0
    for label, (rows, legend) in PATCHES.items():
        for fr in (1, 2):
            im = patch(rows, legend, tiles, fr)
            w2, h2 = im.width * 2, im.height * 2
            if x + w2 > W:
                x, y, rowh = 12, y + rowh + 24, 0
            d.text((x, y), f"{label} ({fr})", fill="#f0e8c8")
            sheet.alpha_composite(im.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
            x += w2 + 24
            rowh = max(rowh, h2 + 16)
    sheet = sheet.crop((0, 0, W, y + rowh + 16))
    kit.save_png(kit.REVIEW / "ch11_env_lead.png", sheet)


def build(save=True):
    tilesets.build()
    tilesets.check()
    if save:
        for tid, tiles in tilesets.TILESETS.items():
            kit.emit.tileset(tid, tiles, tool=kit.TOOL_TILES, name=tilesets.NAMES[tid],
                             order=tilesets.ORDER[tid], credits=kit.CREDITS)
    env_sheet()
    from review_maps import review_maps
    review_maps()
    n = sum(len(v) for v in tilesets.TILESETS.values())
    print(f"Chapter 11: {n} tile images")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
