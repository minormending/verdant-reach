"""Build the Chapter 10 cast bundles and the single lead review sheet.

  rowan, council_warden   character sheets (chars10)
  elder_root              a static object with a two-frame glow pulse (chars10)
  rowan                   trainer portrait (portraits10)
  centuryheart_sprouts    story still (stills10)

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import common10 as common
import chars10
import portraits10
import stills10
from PIL import Image, ImageDraw

INK = "#303040"
GRASS = "#a8c898"
HEART = "#8cae84"       # a darker clearing floor, so the pale knot and its glow read


def strip(im, row, cols=(0, 1, 2)):
    out = Image.new("RGBA", (16 * len(cols), 16))
    for i, c in enumerate(cols):
        out.alpha_composite(im.crop((c * 16, row * 16, c * 16 + 16, row * 16 + 16)), (i * 16, 0))
    return out.resize((48 * len(cols), 48), Image.Resampling.NEAREST)


def review(characters, portraits, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1000, 300), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "VERDANT REACH / CHAPTER 10 CAST / original deterministic pixel art", fill=INK)
    d.text((12, 28), "CHARACTERS 3x / stand, step A, step B (elder_root: rest, pulse, pulse)", fill=INK)
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 160
        bg = HEART if key == "elder_root" else GRASS
        for j, (row, name) in enumerate(((0, "down"), (2, "left"), (1, "up"))):
            y = 48 + j * 64
            d.text((x, y), f"{key} {name}", fill=INK)
            d.rectangle((x, y + 12, x + 143, y + 59), fill=bg)
            sheet.alpha_composite(strip(im, row), (x, y + 12))
        d.text((x, 246), "1x:", fill=INK)
        d.rectangle((x + 24, 242, x + 24 + 4 * 20, 262), fill=bg)
        cells = [(0, 0), (0, 1)] if key == "elder_root" else [(r, 0) for r in (0, 2, 1, 3)]
        for k, (row, col) in enumerate(cells):
            sheet.alpha_composite(im.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16)), (x + 28 + k * 20, 244))
    x0 = 500
    d.text((x0, 28), "PORTRAIT 2x (and 1x) / 56x56", fill=INK)
    for i, (key, im) in enumerate(portraits.items()):
        x = x0 + i * 186
        d.text((x, 48), key, fill=INK)
        d.rectangle((x, 64, x + 111, 175), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((112, 112), Image.Resampling.NEAREST), (x, 64))
        d.rectangle((x + 118, 64, x + 118 + 55, 119), fill="#f8f8f0")
        sheet.alpha_composite(im, (x + 118, 64))
    x1 = 790
    d.text((x1, 28), "STILL 1x / 160x144", fill=INK)
    d.text((x1, 40), "(text box covers y >= 96)", fill=INK)
    for i, (key, im) in enumerate(stills.items()):
        x = x1 + 20 + i * 186
        d.text((x, 54), key, fill=INK)
        sheet.alpha_composite(im, (x, 70))
        d.line([(x - 6, 70 + 96), (x - 2, 70 + 96)], fill=INK)
    sheet.save(common.REVIEW / "ch10_cast_lead.png")


def build(write=True):
    characters = chars10.build(write)
    portraits = portraits10.build(write)
    stills = stills10.build(write)
    review(characters, portraits, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
