"""Build Chapter 7 cast bundles and the single lead review sheet.

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import common7 as common
import chars7
import icons7
import portraits7
import stills7
from PIL import Image, ImageDraw

INK = "#303040"
GRASS = "#a8c898"


def strip(im, row, cols=(0, 1, 2)):
    out = Image.new("RGBA", (16 * len(cols), 16))
    for i, c in enumerate(cols):
        out.alpha_composite(im.crop((c * 16, row * 16, c * 16 + 16, row * 16 + 16)), (i * 16, 0))
    return out.resize((48 * len(cols), 48), Image.Resampling.NEAREST)


def review(characters, portraits, items, ui, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1200, 432), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "VERDANT REACH / CHAPTER 7 CAST / original deterministic pixel art", fill=INK)
    d.text((12, 28), "CHARACTERS 3x / each row: stand, step A, step B / rows: down, left, up", fill=INK)
    notes = {"signal_emitter": "rows: on, on, off", "crimson_lily": "cols: rest, pulse, pulse"}
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 160
        d.text((x, 48), key, fill=INK)
        if key in notes:
            d.text((x, 60), notes[key], fill="#787068")
        for j, row in enumerate((0, 2, 1)):
            y = 76 + j * 52
            d.rectangle((x, y, x + 143, y + 47), fill=GRASS)
            sheet.alpha_composite(strip(im, row), (x, y))
    d.text((12, 240), "1x, down row:", fill=INK)
    d.rectangle((104, 236, 104 + 5 * 24 + 4, 256), fill=GRASS)
    for i, im in enumerate(characters.values()):
        sheet.alpha_composite(im.crop((0, 0, 16, 16)), (108 + i * 24, 238))
    d.text((12, 276), "PORTRAITS 2x (and 1x) / 56x56 native", fill=INK)
    for i, (key, im) in enumerate(portraits.items()):
        x = 12 + i * 200
        d.text((x, 294), key, fill=INK)
        d.rectangle((x, 310, x + 111, 421), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((112, 112), Image.Resampling.NEAREST), (x, 310))
        d.rectangle((x + 118, 310, x + 118 + 55, 365), fill="#f8f8f0")
        sheet.alpha_composite(im, (x + 118, 310))
    d.text((430, 276), "ITEM ICON + MARK 4x (and 1x)", fill=INK)
    for i, (key, im) in enumerate({**items, **ui}.items()):
        x = 430 + i * 130
        d.text((x, 294), key, fill=INK)
        sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x, 310))
        sheet.alpha_composite(im, (x + 72, 358))
    d.text((820, 28), "STILLS 1x / 160x144 (text box covers y >= 96)", fill=INK)
    for i, (key, im) in enumerate(stills.items()):
        x = 820 + i * 186
        d.text((x, 48), key, fill=INK)
        sheet.alpha_composite(im, (x, 64))
        d.line([(x - 5, 64 + 96), (x - 2, 64 + 96)], fill=INK)
    sheet.save(common.REVIEW / "ch7_cast_lead.png")


def build(write=True):
    characters = chars7.build(write)
    portraits = portraits7.build(write)
    items, ui = icons7.build(write)
    stills = stills7.build(write)
    review(characters, portraits, items, ui, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
