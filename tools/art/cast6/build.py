"""Build Chapter 6 cast bundles and the single lead review sheet.

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import common6 as common
import chars6
import icons6
import portraits6
import stills6
from PIL import Image, ImageDraw


def review(characters, portraits, items, ui, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1296, 504), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    ink = "#303040"
    d.text((12, 10), "VERDANT REACH / CHAPTER 6 CAST / original deterministic pixel art", fill=ink)
    d.text((12, 28), "CHARACTERS 3x / each row: stand, step A, step B / rows: down, left, up", fill=ink)
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 160
        d.text((x, 48), key, fill=ink)
        for j, row in enumerate((0, 2, 1)):
            strip = im.crop((0, row * 16, 48, row * 16 + 16)).resize((144, 48), Image.Resampling.NEAREST)
            d.rectangle((x, 64 + j * 48, x + 143, 111 + j * 48), fill="#a8c898")
            sheet.alpha_composite(strip, (x, 64 + j * 48))
    d.text((12, 222), "PORTRAITS 2x / 56x56 native", fill=ink)
    for i, (key, im) in enumerate(portraits.items()):
        x = 12 + i * 160
        d.text((x, 240), key, fill=ink)
        d.rectangle((x, 256, x + 111, 367), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((112, 112), Image.Resampling.NEAREST), (x, 256))
    d.text((12, 380), "ITEM ICONS + MARKS 4x", fill=ink)
    for i, (key, im) in enumerate({**items, **{k: v for k, v in ui.items() if k != "raft"}}.items()):
        x = 12 + i * 112
        d.text((x, 400), key, fill=ink)
        sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x, 420))
    d.text((596, 400), "raft 1x / two 24x14 frames", fill=ink)
    sheet.alpha_composite(ui["raft"], (596, 426))
    d.text((996, 222), "lantern_tree_healed / 1x", fill=ink)
    sheet.alpha_composite(stills["lantern_tree_healed"], (996, 242))
    sheet.save(common.REVIEW / "ch6_cast_lead.png")


def build(write=True):
    characters = chars6.build(write)
    portraits = portraits6.build(write)
    items, ui = icons6.build(write)
    stills = stills6.build(write)
    review(characters, portraits, items, ui, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
