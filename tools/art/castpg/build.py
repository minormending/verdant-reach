"""Build the post-game cast bundles and the single lead review sheet.

  burr_hitch, centuryheart_sprout   overworld objects (charspg)
  old_diary                         item icon, replacing the placeholder (itemspg)
  methuselah_night                  story still (stillspg)

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import commonpg as common
import charspg
import itemspg
import stillspg
from artkit.resolve import Resolver
from PIL import Image, ImageDraw

INK = "#303040"
GROUND = {"burr_hitch": "grass", "centuryheart_sprout": "grove_floor"}   # the tiles each one stands on in game


def tile(key):
    return Image.fromarray(Resolver().image(f"assets/tiles/{key}.png"), "RGBA")


def on_ground(frame, key, scale):
    """One frame drawn 4px above its tile, as the engine draws NPCs."""
    t = tile(key)
    out = Image.new("RGBA", (16, 20))
    out.alpha_composite(t, (0, 4))
    out.alpha_composite(frame, (0, 0))
    return out.resize((16 * scale, 20 * scale), Image.Resampling.NEAREST)


def review(characters, items, stills):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1000, 400), "#f0e8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "VERDANT REACH / POST-GAME CAST / original deterministic pixel art", fill=INK)
    d.text((12, 28), "CHARACTERS 3x on their in-game tiles / stand, step A, step B", fill=INK)
    for i, (key, im) in enumerate(characters.items()):
        x = 12 + i * 230
        rows = ((0, "down"), (2, "left"), (3, "right"), (1, "up"))
        for j, (row, name) in enumerate(rows):
            y = 48 + j * 80
            d.text((x, y), f"{key} {name}", fill=INK)
            for c in range(3):
                cell = im.crop((c * 16, row * 16, c * 16 + 16, row * 16 + 16))
                sheet.alpha_composite(on_ground(cell, GROUND[key], 3), (x + c * 52, y + 14))
        y = 48 + 4 * 80
        d.text((x, y), "1x:", fill=INK)
        for c in range(3):
            cell = im.crop((c * 16, 0, c * 16 + 16, 16))
            sheet.alpha_composite(on_ground(cell, GROUND[key], 1), (x + 28 + c * 22, y))
        for k, row in enumerate((2, 3, 1)):
            cell = im.crop((0, row * 16, 16, row * 16 + 16))
            sheet.alpha_composite(on_ground(cell, GROUND[key], 1), (x + 28 + (3 + k) * 22, y))
    x0 = 480
    d.text((x0, 28), "ITEM 4x (and 1x) / 16x16", fill=INK)
    for i, (key, im) in enumerate(items.items()):
        d.text((x0, 48), key, fill=INK)
        d.rectangle((x0, 64, x0 + 63, 127), fill="#f8f8f0")
        sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x0, 64))
        d.rectangle((x0 + 72, 64, x0 + 87, 79), fill="#f8f8f0")
        sheet.alpha_composite(im, (x0 + 72, 64))
    x1 = 620
    d.text((x1, 28), "STILL 1x / 160x144 (text box covers y >= 96)", fill=INK)
    for i, (key, im) in enumerate(stills.items()):
        x = x1 + 20
        d.text((x, 48), key, fill=INK)
        sheet.alpha_composite(im, (x, 64))
        d.line([(x - 8, 64 + 96), (x - 2, 64 + 96)], fill=INK)
        boxed = im.copy()
        ImageDraw.Draw(boxed).rectangle((0, 96, 159, 143), fill="#f8f8f8", outline="#181818")
        d.text((x + 168, 48), "with the text box", fill=INK)
        sheet.alpha_composite(boxed, (x + 168, 64))
    sheet.save(common.REVIEW / "pg_cast_lead.png")


def build(write=True):
    characters = charspg.build(write)
    items = itemspg.build(write)
    stills = stillspg.build(write)
    review(characters, items, stills)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
