"""16px post-game overworld objects, drawn pixel by pixel.

  burr_hitch           BURR, the hitch-hiking Wanderer, as it appears on the
                       tile behind the player: a small round burdock burr
                       (Arctium) bristling with hooked bracts, a tuft of
                       thistle-purple florets at its crown, riding a torn
                       scrap of burdock leaf. Column 0 sits; columns 1-2 are
                       a little hop off the leaf (its shadow shows on the
                       leaf), the floret tuft swaying as it goes.
                       Down and up are the round burr seen square-on; left and
                       right lean its tuft and point the leaf's tip toward the
                       way it faces. No face: the bract ticks are scattered and
                       never sit in a pair.
  centuryheart_sprout  the second Centuryheart sprout in the Elder's glade:
                       a young Puya raimondii, a dense silver-blue rosette of
                       stiff spined leaves in a ring of moss, with
                       a pale gold heart where the leaves meet. Column 0 rests;
                       columns 1-2 shimmer (leaf tips catch the light in turn
                       and two motes rise). Every row is the same.

Both use the character kit's 1px #181818 outline, light from the top left.
"""
from __future__ import annotations

import commonpg as common
import characters as ch
from PIL import Image

hexc = ch.gbc.hexc

# --- BURR: hook green-brown and thistle purple (the `burr` species' identity) ---
BURR_PAL = {
    "K": "#181818",
    "l": "#c8c070", "h": "#8c8840", "H": "#585020",       # bracts: pale hook tips, green-brown, shadow
    "q": "#e8c0f0", "p": "#b070d0", "P": "#683888",       # the floret tuft
    "e": "#b8c878", "g": "#788c40", "G": "#3c5028",       # the scrap of burdock leaf: dull, paler than grass
}

# The burr, drawn square-on. Its crown tuft (rows 2-4) is a separate layer so
# it can lean; the bract ball's serrated edge is its hooks in silhouette, and
# the pale diagonal ticks are hook tips catching the light (light only in the
# upper half, so nothing pairs up into eyes).
BURR_TUFT = [
    "......q..q......",
    ".....qpqpqp.....",
    ".....KpPpPK.....",
    "......PPPp......",
]
BURR_BALL = [
    "................",
    "................",
    "................",
    "................",
    "...K........K...",
    "....KlhhhhhK....",
    "..KKllhhlhhhK...",
    "...KlhlhhlhhKK..",
    "..KKhlhhlhhHK...",
    "...KhhlhhhHHKK..",
    "..KKhhhlhHhHK...",
    "....KhhHhHHK....",
    ".....KKKKKK.....",
]
# The torn scrap of burdock leaf it rides: a pointed tip, a ragged end and a
# pale lit edge. When the burr hops, its shadow shows on the leaf.
BURR_LEAF = [
    "...KKKKKKKKKK.K.",
    ".KKeeeeegggggKgK",
    "KeeeeeggggggGGGK",
    ".KKKKGGGGGGGKKK.",
]
LEAF_SHADOW = [(6, 13), (7, 13), (8, 13), (9, 13), (7, 14), (8, 14)]


def rows_img(rows, pal, size=(16, 16)):
    assert all(len(r) == size[0] for r in rows), [len(r) for r in rows]
    im = Image.new("RGBA", size, ch.gbc.CLEAR)
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != ".":
                px[x, y] = hexc(pal[c])
    return im


def burr_frame(lift=0, lean=0):
    """lift: pixels the burr hops off its leaf; lean: the tuft's sway (-1 left, +1 right)."""
    out = Image.new("RGBA", (16, 16), ch.gbc.CLEAR)
    leaf = rows_img(BURR_LEAF, BURR_PAL, (16, 4))
    if lift:
        px = leaf.load()
        for x, y in LEAF_SHADOW:
            px[x, y - 12] = hexc(BURR_PAL["G"])
    out.alpha_composite(leaf, (0, 12))
    out.alpha_composite(rows_img(BURR_BALL, BURR_PAL, (16, 13)), (0, -lift))
    tuft = rows_img(BURR_TUFT, BURR_PAL, (16, 4))
    out.alpha_composite(tuft, (lean, 2 - lift))
    return out


def burr_hitch():
    def row(lean, flip=False):
        frames = [burr_frame(0, lean), burr_frame(2, lean - 1 if lean <= 0 else lean), burr_frame(2, lean + 1 if lean >= 0 else lean)]
        return [f.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else f for f in frames]
    # down / up: square-on; left: the tuft leans the way it faces; right mirrors left.
    return ch.static_sheet([row(0), row(0), row(-1), row(-1, flip=True)])


# --- the Centuryheart sprout: a young Puya raimondii, silver-blue and spined ---
PUYA_PAL = {
    "K": "#181818",
    "w": "#e8f8f8", "L": "#a8cce0", "M": "#6c94b8", "D": "#3c5880",   # silver to slate blue
    "Y": "#f8e078", "y": "#c89838",                                   # the pale gold heart
    "m": "#78a850", "n": "#3c6c34",                                   # a ring of moss at its foot
    "o": "#f8f8d0",                                                   # shimmer motes
}

PUYA_ROWS = [
    ".......K........",
    "....K.KwK..K....",
    "...KwKKwK.KwK...",
    "..KKwMKLKKLwKK..",
    ".KwwKwKLKKwKwwK.",
    "..KwMwMLKKwLwK..",
    ".KKKMMMLKLLLKKK.",
    "KwwMMMMLKLLLLLLK",
    ".KKKMMMMLLLLKKK.",
    ".KMMMMMYYLMMMMK.",
    "KwwKKMMYyMMKKLLK",
    ".KKKMMMMMMDDKKK.",
    "..KKMMMMDDDDKK..",
    ".KmmmMDDDDDnnnK.",
    ".KmmmmmmmnnnnnK.",
    "..KKKKmmmmKKKK..",
]


# The shimmer: on each pulse frame a different set of leaf tips catches the
# light (w -> o), the heart brightens, and two motes rise beside it.
SHIMMER = {
    1: {"tips": [(7, 1), (4, 2), (2, 4), (1, 7)], "motes": [(2, 1), (14, 2)]},
    2: {"tips": [(11, 2), (13, 4), (10, 5), (2, 10)], "motes": [(13, 0), (0, 3)]},
}


def puya_frame(shimmer=0):
    g = [list(r) for r in PUYA_ROWS]
    if shimmer:
        for x, y in SHIMMER[shimmer]["tips"]:
            assert g[y][x] == "w", (x, y, g[y][x])
            g[y][x] = "o"
        for x, y in SHIMMER[shimmer]["motes"]:
            assert g[y][x] == ".", (x, y)
            g[y][x] = "o"
        g = [["Y" if c == "y" else c for c in r] for r in g]
    return rows_img(["".join(r) for r in g], PUYA_PAL)


def centuryheart_sprout():
    a, b, c = puya_frame(0), puya_frame(1), puya_frame(2)
    return ch.static_sheet([[a, b, c]] * 4)


def images():
    return {"burr_hitch": burr_hitch(), "centuryheart_sprout": centuryheart_sprout()}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
