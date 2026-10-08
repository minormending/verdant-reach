"""The RELAY KEYCARD (ODELL's pass), a 16x16 key-item icon.

cast6/cast7 small-icon rules: black contours, light from the top left, a
few clustered highlights. A pale card with a green stripe across the top,
a small root-network glyph (a hub node rooting down to two more), a punched
slot, and the metal lanyard clip with a loop of green lanyard above it.
"""
from __future__ import annotations

import common8 as common
from PIL import Image, ImageDraw

K = "#181818"
CARD, CARD_S, CARD_H = "#e8e8d8", "#b0b0a0", "#f8f8f0"
STRIPE, STRIPE_S, STRIPE_H = "#48a050", "#286838", "#88d070"
ROOT, NODE = "#386848", "#58b860"
STEEL, STEEL_S, STEEL_H = "#a8b0c0", "#606878", "#e8f0f8"
CORD, CORD_S = "#40885c", "#285838"


def relay_keycard():
    im = Image.new("RGBA", (16, 16))
    d = ImageDraw.Draw(im)
    # The lanyard: a loop of green cord coming down to the clip.
    d.line([(4, 0), (6, 2)], fill=K)
    d.line([(11, 0), (9, 2)], fill=K)
    d.line([(5, 0), (7, 2)], fill=CORD)
    d.line([(10, 0), (8, 2)], fill=CORD_S)
    # The clip: a small steel jaw through the card's slot.
    d.rectangle((6, 2, 9, 5), fill=K)
    d.rectangle((7, 3, 8, 4), fill=STEEL)
    d.point((7, 3), fill=STEEL_H)
    d.point((8, 4), fill=STEEL_S)
    # The card, landscape, rounded corners, a shadow edge on the lower right.
    d.rectangle((1, 5, 14, 15), fill=K)
    d.rectangle((2, 6, 13, 14), fill=CARD)
    for x, y in ((1, 5), (14, 5), (1, 15), (14, 15)):
        d.point((x, y), fill=(0, 0, 0, 0))
    d.line([(2, 14), (13, 14), (13, 6)], fill=CARD_S)
    d.line([(2, 9), (2, 13)], fill=CARD_H)
    # The punched slot under the clip.
    d.line([(6, 6), (9, 6)], fill=STEEL_S)
    # The green stripe.
    d.rectangle((2, 7, 13, 8), fill=STRIPE)
    d.line([(2, 7), (12, 7)], fill=STRIPE_H)
    d.line([(13, 7), (13, 8)], fill=STRIPE_S)
    d.line([(3, 8), (13, 8)], fill=STRIPE_S)
    # The root-network glyph: a hub node whose roots fork down to two more;
    # beside it, two grey lines of the pass's printing.
    d.point((5, 10), fill=NODE)
    d.point((5, 11), fill=ROOT)
    d.point((4, 12), fill=ROOT)
    d.point((6, 12), fill=ROOT)
    d.point((3, 13), fill=NODE)
    d.point((7, 13), fill=NODE)
    d.line([(9, 10), (12, 10)], fill=CARD_S)
    d.line([(9, 12), (11, 12)], fill=CARD_S)
    return im


def build(write=True):
    items = {"relay_keycard": relay_keycard()}
    if write:
        common.write_set("items", items, "icons8")
    return items
