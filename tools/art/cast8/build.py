"""Build the Chapter 8 cast bundles and the single lead review sheet.

  mercer          character sheet (chars8)
  mercer, wren    trainer portraits (portraits8)
  relay_keycard   item icon (icons8), replacing the placeholder
  mercer_hub_map  story still (stills8)

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import common8 as common
import chars8
import icons8
import portraits8
import stills8
from PIL import Image, ImageDraw

INK = "#303040"
GRASS = "#a8c898"


def strip(im, row, cols=(0, 1, 2)):
    out = Image.new("RGBA", (16 * len(cols), 16))
    for i, c in enumerate(cols):
        out.alpha_composite(im.crop((c * 16, row * 16, c * 16 + 16, row * 16 + 16)), (i * 16, 0))
    return out.resize((48 * len(cols), 48), Image.Resampling.NEAREST)


def review(characters, portraits, items, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (980, 300), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "VERDANT REACH / CHAPTER 8 CAST / original deterministic pixel art", fill=INK)
    d.text((12, 28), "CHARACTER 3x / stand, step A, step B", fill=INK)
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 160
        for j, (row, name) in enumerate(((0, "down"), (2, "left"), (1, "up"))):
            y = 48 + j * 64
            d.text((x, y), f"{key} {name}", fill=INK)
            d.rectangle((x, y + 12, x + 143, y + 59), fill=GRASS)
            sheet.alpha_composite(strip(im, row), (x, y + 12))
        d.text((x, 246), "1x:", fill=INK)
        d.rectangle((x + 24, 242, x + 24 + 4 * 20, 262), fill=GRASS)
        for k, row in enumerate((0, 2, 1, 3)):
            sheet.alpha_composite(im.crop((0, row * 16, 16, row * 16 + 16)), (x + 28 + k * 20, 244))
    d.text((190, 28), "PORTRAITS 2x (and 1x) / 56x56 native", fill=INK)
    for i, (key, im) in enumerate(portraits.items()):
        x = 190 + i * 186
        d.text((x, 48), key, fill=INK)
        d.rectangle((x, 64, x + 111, 175), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((112, 112), Image.Resampling.NEAREST), (x, 64))
        d.rectangle((x + 118, 64, x + 118 + 55, 119), fill="#f8f8f0")
        sheet.alpha_composite(im, (x + 118, 64))
    d.text((190, 196), "ITEM ICON 4x (and 1x)", fill=INK)
    for i, (key, im) in enumerate(items.items()):
        x = 190 + i * 130
        d.text((x, 212), key, fill=INK)
        sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x, 228))
        sheet.alpha_composite(im, (x + 72, 276))
    d.text((570, 28), "STILL 1x / 160x144 (text box covers y >= 96)", fill=INK)
    for i, (key, im) in enumerate(stills.items()):
        x = 590 + i * 186
        d.text((x, 48), key, fill=INK)
        sheet.alpha_composite(im, (x, 64))
        d.line([(x - 6, 64 + 96), (x - 2, 64 + 96)], fill=INK)
    sheet.save(common.REVIEW / "ch8_cast_lead.png")


def build(write=True):
    characters = chars8.build(write)
    portraits = portraits8.build(write)
    items = icons8.build(write)
    stills = stills8.build(write)
    review(characters, portraits, items, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
