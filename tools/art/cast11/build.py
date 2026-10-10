"""Build the Chapter 11 cast bundles and the single lead review sheet.

  belladonna, mimi_osa, titus_arum, pyra   character sheets (chars11)
  belladonna, mimi_osa, titus_arum, pyra   trainer portraits (portraits11)
  fellowship                               story still (stills11)

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import common11 as common
import chars11
import portraits11
import stills11
from PIL import Image, ImageDraw

INK = "#303040"
FLOOR = "#c8a888"       # the Council hall's warm floor, so plum, lilac and maroon all read


def strip(im, row, cols=(0, 1, 2)):
    out = Image.new("RGBA", (16 * len(cols), 16))
    for i, c in enumerate(cols):
        out.alpha_composite(im.crop((c * 16, row * 16, c * 16 + 16, row * 16 + 16)), (i * 16, 0))
    return out.resize((48 * len(cols), 48), Image.Resampling.NEAREST)


def review(characters, portraits, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1360, 316), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "VERDANT REACH / CHAPTER 11 CAST (THE COUNCIL) / original deterministic pixel art", fill=INK)
    d.text((12, 28), "CHARACTERS 3x / stand, step A, step B", fill=INK)
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 160
        for j, (row, name) in enumerate(((0, "down"), (2, "left"), (1, "up"))):
            y = 48 + j * 64
            d.text((x, y), f"{key} {name}", fill=INK)
            d.rectangle((x, y + 12, x + 143, y + 59), fill=FLOOR)
            sheet.alpha_composite(strip(im, row), (x, y + 12))
        d.text((x, 246), "1x:", fill=INK)
        d.rectangle((x + 24, 242, x + 24 + 4 * 20, 262), fill=FLOOR)
        for k, row in enumerate((0, 2, 1, 3)):
            sheet.alpha_composite(im.crop((0, row * 16, 16, row * 16 + 16)), (x + 28 + k * 20, 244))
    x0 = 660
    d.text((x0, 28), "PORTRAITS 2x (and 1x) / 56x56", fill=INK)
    for i, (key, im) in enumerate(portraits.items()):
        x = x0 + (i % 2) * 180
        y = 48 + (i // 2) * 126
        d.text((x, y), key, fill=INK)
        d.rectangle((x, y + 14, x + 111, y + 125), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((112, 112), Image.Resampling.NEAREST), (x, y + 14))
        d.rectangle((x + 116, y + 14, x + 116 + 55, y + 69), fill="#f8f8f0")
        sheet.alpha_composite(im, (x + 116, y + 14))
    x1 = 1030
    d.text((x1, 28), "STILL 1x / 160x144", fill=INK)
    d.text((x1, 40), "(text box covers y >= 96)", fill=INK)
    for i, (key, im) in enumerate(stills.items()):
        x = x1 + 20 + i * 186
        d.text((x, 54), key, fill=INK)
        sheet.alpha_composite(im, (x, 70))
        d.line([(x - 6, 70 + 96), (x - 2, 70 + 96)], fill=INK)
    sheet.save(common.REVIEW / "ch11_cast_lead.png")


def build(write=True):
    characters = chars11.build(write)
    portraits = portraits11.build(write)
    stills = stills11.build(write)
    review(characters, portraits, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
