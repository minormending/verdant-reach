"""Build the girl player's bundles and her lead review sheet.

  player_girl       overworld walk sheet, 48x64 (charsgirl)
  player_girl_back  48x48 battle back view in the portraits set (portraitsgirl)

She is the boy player's counterpart for the boy/girl choice at the new game:
the same junior-botanist kit in his colours, read from his generator specs
(characters.CHARS["player"], the player_back regions); his files are never
written. Review: tools/art/review/player_girl_lead.png, both players' sheets
at 4x, a 1x strip of both walking on the shipped grass tile, and both back
views at 3x.

Run build.py --scratch for a review without writing bundles. All output is
deterministic; protected edited/imported bundles are skipped by artkit.emit.
"""
from __future__ import annotations

import commongirl as common
import charsgirl
import portraitsgirl
from artkit.resolve import Resolver
from PIL import Image, ImageDraw

INK = "#303040"
PAPER = "#f0e8d8"
ART = common.ART_TOOLS.parent.parent / "public" / "art"


def tile(key):
    return Image.fromarray(Resolver().image(f"assets/tiles/{key}.png"), "RGBA")


def shipped(rel):
    return Image.open(ART / rel).convert("RGBA")


def walk_strip(sheet, grass):
    """1x: each facing as the in-game cycle (stand, A, stand, B), one frame per
    grass tile, drawn 4px above the tile as the engine draws walkers."""
    order = ((0, "down"), (2, "left"), (1, "up"), (3, "right"))
    out = Image.new("RGBA", (16 * 16, 20))
    for i, (row, _) in enumerate(order):
        for j, col in enumerate((0, 1, 0, 2)):
            x = (i * 4 + j) * 16
            out.alpha_composite(grass, (x, 4))
            out.alpha_composite(sheet.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16)), (x, 0))
    return out


def review(boy, girl, boy_back, girl_back):
    common.REVIEW.mkdir(parents=True, exist_ok=True)
    grass = tile("grass")
    sheet = Image.new("RGBA", (560, 592), PAPER)
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "VERDANT REACH / THE PLAYERS: player (boy) and player_girl", fill=INK)
    d.text((12, 24), "SHEETS 4x / rows down, up, left, right / columns stand, step A, step B", fill=INK)
    for i, (key, im) in enumerate((("player", boy), ("player_girl", girl))):
        x = 12 + i * 220
        d.text((x, 42), key, fill=INK)
        bg = Image.new("RGBA", im.size, (160, 216, 104, 255))
        bg.alpha_composite(im)
        sheet.alpha_composite(bg.resize((192, 256), Image.Resampling.NEAREST), (x, 58))
    x0 = 452
    d.text((x0, 24), "1x", fill=INK)
    for i, im in enumerate((boy, girl)):
        sheet.alpha_composite(im, (x0 + i * 52, 58))
    y = 330
    d.text((12, y), "WALKING 1x on the grass tile / down, left, up, right (stand, A, stand, B)", fill=INK)
    for i, (key, im) in enumerate((("player", boy), ("player_girl", girl))):
        d.text((12, y + 18 + i * 28), key, fill=INK)
        sheet.alpha_composite(walk_strip(im, grass), (96, y + 14 + i * 28))
    y = 404
    d.text((12, y), "BACK VIEWS 3x (and 1x)", fill=INK)
    for i, (key, im) in enumerate((("player_back", boy_back), ("player_girl_back", girl_back))):
        x = 12 + i * 220
        d.text((x, y + 18), key, fill=INK)
        sheet.alpha_composite(im.resize((144, 144), Image.Resampling.NEAREST), (x, y + 34))
        sheet.alpha_composite(im, (x + 152, y + 130))
    sheet.save(common.REVIEW / "player_girl_lead.png")


def build(write=True):
    girl = charsgirl.build(write)["player_girl"]
    girl_back = portraitsgirl.build(write)["player_girl_back"]
    boy = shipped("characters/player/sheet.png")
    boy_back = shipped("sets/portraits/player_back.png")
    review(boy, girl, boy_back, girl_back)


if __name__ == "__main__":
    import sys
    build(write="--scratch" not in sys.argv)
