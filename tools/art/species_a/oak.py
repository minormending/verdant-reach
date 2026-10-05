"""Oak line: oak_acorn -> oak_sapling -> great_oak.  (CREATURES.md)

Motif: the scaly acorn cap worn as a HELMET, pulled low toward the foe.
Accent: the cap brown. The acorn rams with it, the sapling still wears it
over a leafy crest, and the great oak's crown is a helm of leaves with a
cap-brown acorn cluster hanging from its lead bough like a fist.

oak_acorn    BRACED   tilted 20 deg at the foe, cap brim pulled low, a pale
                      radicle split into two planted root feet, stalk flicked back.
oak_sapling  BRACED   C-curved trunk, big lobed lead leaf raised like a shield,
                      rear leaf swept up, cap helmet tilted forward, two root feet.
great_oak    LOOMING  crown overhangs the foe side, short thick trunk in a
                      reverse C, lead bough reaching forward with an acorn fist.
"""

from __future__ import annotations

import numpy as np

from px import Sprite, lobed_leaf, blob, bezier
from kit import rot, selout, icon, icon2

IDS = ["oak_acorn", "oak_sapling", "great_oak"]

ACORN = ["#603020", "#d08830", "#f8e098"]          # cap brown (wine-shifted), amber nut, cream light
SAPLING = ["#583418", "#78b838", "#f0e8a0"]        # olive-brown (cap, trunk, leaf shade), leaf, light
OAK = ["#3c3418", "#60a838", "#d0e878"]            # bark/shade, leaf, light


def cap_scales(s, cap, step=4, dy=3, lit_tone=2, dark_notch=True, region=None):
    """Acorn-cap scales on a cap mask: staggered rows of lit 2px tops over a
    black notch (offset to the bottom-right, away from the light)."""
    ys, xs = np.nonzero(cap)
    y0, y1, x0, x1 = ys.min() + 2, ys.max() - 1, xs.min() + 1, xs.max() - 1
    cx = (x0 + x1) / 2
    for j, y in enumerate(range(y0, y1, dy)):
        off = (j % 2) * (step // 2)
        for x in range(x0 + off, x1, step):
            if not (cap[y, x] and cap[y, x + 1] and s.t[y, x] > 0 and s.t[y, x + 1] > 0):
                continue
            if region is not None and not region[y, x]:
                continue
            lit = x < cx + 3
            if lit:
                s.px([(x, y), (x + 1, y)], lit_tone)
            if dark_notch and y + 1 < s.h and s.t[y + 1, x + 1] > 0:
                s.px([(x + 1, y + 1)], 0)


# --------------------------------------------------------------------------- acorn

def acorn_front(f=0):
    s = Sprite(56, 56, ACORN)
    c = s.c
    tilt = (-27, -28.5, -30)[f]                 # idle: the helmet dips at the foe
    pv = (31, 51)
    k = 0.9                                     # baby size class (~44px)

    def R(*pts):
        return rot([(pv[0] + (x - pv[0]) * k, pv[1] + (y - pv[1]) * k) for x, y in pts], tilt, pv)

    nut = blob(c, R((30, 25), (20.5, 27.5), (17, 35), (18.5, 43), (24, 49), (29.5, 51.5),
                    (35, 49), (41, 43), (42.5, 35), (39, 27.5)))
    (cx, cy), = R((29.5, 24.0))
    (dx_, dy_), = R((29.5, 20.0))
    cap = c.ellipse(cx, cy, 17.0 * k, 7.4 * k, tilt) | c.ellipse(dx_, dy_, 13.0 * k, 7.6 * k, tilt)
    flick = (0, 0.6, 1.2)[f]
    st = R((30.5, 14), (31, 9), (35.5, 6.0 - flick * 0.5), (41 + flick * 0.3, 7.5 - flick))
    stalk = c.curve(st, 3.6, 2.6)
    (tx, ty), = R((30, 50.5))
    roots = (c.curve([(tx - 1, ty - 1), (tx - 5, 52.5), (tx - 11, 54.2), (tx - 14, 55.6)], 4.2, 2.6)
             | c.curve([(tx, ty - 1), (tx + 4, 52.0), (tx + 9, 55.6)], 3.8, 2.4))
    s.add(roots, tones=(2, 3, 3), shade=(2, 2))
    s.add(nut, tones=(1, 2, 3), shade=(4, 3), band=(2, 4, c.Y > cy + 5), cast=3)
    s.add(stalk, tones=(1, 1, 2), flat=True)
    s.add(cap, tones=(1, 1, 2), shade=(2, 2), band=(1, 2, c.Y < cy + 1))
    s.render()
    cap_scales(s, cap, step=4, dy=3)
    # glint of life on the nut's lit shoulder, under the brim
    (gx, gy), = R((22.5, 33))
    gx, gy = int(round(gx)), int(round(gy))
    s.px([(gx + 1, gy - 1), (gx, gy), (gx, gy + 1), (gx - 1, gy + 2)], 3)
    selout(s, region=c.Y < 28)
    s.clean()
    return s.image()


def acorn_back():
    """From behind and above: the cap's crown fills the top, the stalk
    flicks toward the top-right (toward the foe), the nut drops out of frame."""
    s = Sprite(48, 48, ACORN, crop_bottom=True)
    c = s.c
    tilt = 14
    pv = (24, 48)

    def R(*pts):
        return rot(pts, tilt, pv)

    nut = blob(c, R((24, 30), (9, 33), (6, 41), (9, 49), (39, 49), (42, 41), (39, 33)))
    (cx, cy), = R((24, 26))
    cap = c.ellipse(cx, cy, 21.5, 14.0, tilt)
    stalk = c.curve(R((25, 13), (25, 7), (29, 3.5), (34, 4.5)), 4.4, 3.0)
    s.add(nut, tones=(1, 2, 3), shade=(5, 3), band=(3, 5, c.Y > 40), cast=3)
    s.add(cap, tones=(1, 1, 2), shade=(3, 3), band=(1, 2, (c.Y < cy - 2) & (c.X < cx + 4)))
    s.add(stalk, tones=(1, 1, 2), flat=True)
    s.render()
    cap_scales(s, cap, step=4, dy=3)
    selout(s, region=c.Y < 20)
    s.clean()
    return s.image()


ACORN_ICON = [
    "................",
    "..........000...",
    "......0000110...",
    "....00111110....",
    "...0121211110...",
    "..012121212110..",
    "..011111111110..",
    "..00000000000...",
    "...0322222210...",
    "...0322222210...",
    "....022222110...",
    "....02222210....",
    ".....0222110....",
    "......03330.....",
    ".....0300030....",
    "......0...0.....",
]


# --------------------------------------------------------------------------- sapling

def sapling_front(f=0):
    s = Sprite(56, 56, SAPLING)
    c = s.c
    sw = (0, 0.8, 1.6)[f]
    roots = (c.curve([(31, 50), (26, 53.2), (18, 55.6)], 4.4, 2.4)
             | c.curve([(34, 50), (39, 53.5), (46, 55.6)], 4.0, 2.2))
    trunk = c.curve([(33, 55.6), (37, 44), (33.5, 31), (25 - sw * 0.4, 21)], 7.4, 5.2)
    rear_pet = c.curve([(34, 31), (39, 26), (42, 22 - sw * 0.5)], 2.8, 2.2)
    rear = lobed_leaf(c, (40, 24 - sw * 0.5), (53, 9 - sw), 13, lobes=2, bend=1.0)   # rear arm: smaller, higher
    lead = lobed_leaf(c, (31, 37), (5, 29 - sw), 17, lobes=3, bend=-1.2)            # lead arm: big shield
    crest = c.empty()
    capc = (21.0 - sw * 0.5, 17.0 + sw * 0.25)
    cap = c.ellipse(capc[0], capc[1], 14.5, 6.4, -17) | c.ellipse(capc[0] + 1.0, capc[1] - 3.0, 10.5, 5.8, -17)
    stalk = c.curve([(capc[0] + 2.5, capc[1] - 7), (capc[0] + 3, capc[1] - 10),
                     (capc[0] + 7.5, capc[1] - 12), (capc[0] + 11.5, capc[1] - 11)], 3.4, 2.4)
    s.add(rear_pet, tones=(1, 1, 1), flat=True)
    s.add(rear, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(crest, tones=(1, 2, 3), close=3, shade=(3, 3), band=(1, 2))
    s.add(roots, tones=(1, 1, 1), flat=True)
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(1, 1, 3), shade=(2, 2), band=(1, 2, c.Y < capc[1] - 2))
    s.add(lead, tones=(1, 2, 3), close=3, shade=(3, 3), band=(1, 2))
    s.render()
    cap_scales(s, cap, step=4, dy=2, lit_tone=1)
    # midrib on the lead leaf, broken toward the lit tip
    for t in np.linspace(0.16, 0.72, 20):
        x = int(31 + (5 - 31) * t)
        y = int(37 + (29 - sw - 37) * t + 0.5)
        if s.t[y, x] in (2, 3):
            s.px([(x, y)], 1)
    selout(s, region=(c.X < 30) & (c.Y < 34))
    s.clean()
    return s.image()


def sapling_back():
    s = Sprite(48, 48, SAPLING, crop_bottom=True)
    c = s.c
    trunk = c.curve([(22, 48), (21, 38), (25, 26)], 7.5, 6.0)
    lead = lobed_leaf(c, (27, 30), (46, 18), 15, lobes=3)        # lead arm raised on the RIGHT (toward foe)
    rear = lobed_leaf(c, (20, 33), (3, 30), 12, lobes=2)
    crest = lobed_leaf(c, (22, 18), (5, 7), 12, lobes=2)
    cap = c.ellipse(27, 16, 14.5, 10.5, 12)
    stalk = c.curve([(28, 8), (28.5, 4), (33, 2), (37, 3)], 3.8, 2.6)
    s.add(rear, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(crest, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(lead, tones=(1, 2, 3), close=3, shade=(3, 3), band=(1, 2))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(1, 1, 3), shade=(3, 3), band=(1, 2, c.Y < 12))
    s.render()
    cap_scales(s, cap, step=4, dy=2, lit_tone=1)
    selout(s, region=(c.X < 26) & (c.Y < 24))
    s.clean()
    return s.image()


SAPLING_ICON = [
    "......010....0..",
    "....00111000020.",
    "...0331111102210",
    ".003101010102210",
    "0311111111002110",
    "011111111000110.",
    ".0111110001000..",
    "..000001100.....",
    "..033330110.....",
    ".0332210110.....",
    "033221100110....",
    "0111110.0110....",
    ".00000..0110....",
    ".......011100...",
    "......01100110..",
    ".......00..00...",
]


# --------------------------------------------------------------------------- great oak

def clump(c, cx, cy, rx, ry, bumps=7, br=2.4, seed=0):
    """A leafy clump: an ellipse with oak-lobe bumps around its upper half."""
    m = c.ellipse(cx, cy, rx, ry)
    for k in range(bumps):
        a = np.pi + np.pi * (k + 0.5) / bumps + (0.15 if (k + seed) % 2 else -0.1)
        m |= c.circle(cx + np.cos(a) * (rx - br * 0.5), cy + np.sin(a) * (ry - br * 0.5), br)
    return m


def oak_front(f=0):
    s = Sprite(56, 56, OAK)
    c = s.c
    sw = (0, 0.7, 1.4)[f]
    trunk = (c.curve([(39, 55.6), (39, 46), (33, 34)], 12.0, 8.5)
             | c.curve([(34, 49), (27, 53.5), (18, 55.6)], 6.4, 2.6)          # front root foot
             | c.curve([(40, 49), (46, 53), (54, 55.6)], 6.0, 2.6)            # back root foot
             | c.curve([(35, 41), (26, 36), (16, 36), (9.5, 40.5 - sw * 0.3)], 6.0, 3.6)   # lead bough
             )
    clumps = [  # back to front: the crown hunches over the foe (left)
        (38, 8, 12.5, 6.5), (50, 16.5, 4.5, 5.5), (21, 10, 12.5, 7.0),
        (7.5, 21, 7.5, 7.0), (40, 20, 10, 7.0), (23, 21, 14, 8.5),
        (9, 33, 9.0, 6.0), (29, 30, 10, 5.0), (45, 27, 6, 4.5),
    ]
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    for i, (cx, cy, rx, ry) in enumerate(clumps):
        dx = -sw * (1 - cy / 36) - 1.5
        s.add(clump(c, cx + dx, cy, rx * 0.93, ry * 0.93, bumps=int(rx * 0.75), seed=i), tones=(1, 2, 3), shade=(3, 3), close=2,
              band=(1, 2, c.Y < cy - ry * 0.25), line="dark" if i in (5, 6, 7) else "none", cast=1)
    s.render()
    # acorn fist hanging from the lead bough (cap = bark tone, green nuts)
    for ax, ay in [(9, 43), (14, 44)]:
        s.rows(ax - 3, ay - 1, ["..000..", ".01110.", "0111110", "0000000", "0332220", "0322220",
                                ".02220.", "..020..", "...0..."])
    # a leaf drifting down behind the trunk (motion cue)
    ly = 38 + (0, 1, 2)[f]
    s.rows(48, ly, ["..00.", ".0330", "02220", "0220.", ".00.."])
    # bark grooves
    s.px([(36, 42), (36, 43), (35, 44), (35, 45), (35, 46), (34, 47), (40, 43), (40, 44),
          (39, 45), (39, 46), (39, 47), (38, 49), (38, 50), (38, 51)], 0)
    selout(s, region=(c.Y < 20) & (c.X < 32))
    s.clean()
    return s.image()


def oak_back():
    s = Sprite(48, 48, OAK, crop_bottom=True)
    c = s.c
    trunk = c.stroke([(20, 48), (21, 38)], 11, 9) | c.curve([(22, 40), (32, 36), (42, 37)], 5, 3.4)
    clumps = [(16, 7.5, 11, 7), (30, 9, 10, 7), (41, 15, 7, 6.5), (6, 16, 6, 6.5), (22, 17, 12, 7.5),
              (37, 22, 10, 7), (9, 26, 8, 6.5), (24, 27, 11, 6.5), (40, 31, 7, 5.5)]
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    for i, (cx, cy, rx, ry) in enumerate(clumps):
        s.add(clump(c, cx, cy, rx, ry, bumps=int(rx * 0.7), seed=i), tones=(1, 2, 3), shade=(3, 3), close=2,
              band=(1, 2, c.Y < cy - ry * 0.2), line="dark", cast=2)
    s.render()
    for ax, ay in [(41, 40), (45, 41)]:
        s.rows(ax - 2, ay - 1, ["..0..", ".010.", "01110", "00000", "03320", "02220", ".020.", "..0.."])
    selout(s, region=(c.Y < 18) & (c.X < 26))
    s.clean()
    return s.image()


OAK_ICON = [
    ".....0000000....",
    "..00033333300...",
    ".0333322222230..",
    "033222222222210.",
    "032222222222220.",
    "0322221122222210",
    "0322222222212210",
    "0221222111222110",
    "011101110001110.",
    ".0000000111000..",
    "..0000111110....",
    ".010111111100...",
    "0111000011110...",
    "03320...01110...",
    ".020...0110110..",
    "..0...000..000..",
]


# --------------------------------------------------------------------------- make

def _icons(rows, pal):
    i1 = icon(rows, pal)
    return i1, icon2(i1)


def make(id_):
    f, b, pal, ic = {
        "oak_acorn": (acorn_front, acorn_back, ACORN, ACORN_ICON),
        "oak_sapling": (sapling_front, sapling_back, SAPLING, SAPLING_ICON),
        "great_oak": (oak_front, oak_back, OAK, OAK_ICON),
    }[id_]
    i1, i2 = _icons(ic, pal)
    return {"front": f(0), "front__2": f(1), "front__3": f(2), "back": b(), "icon": i1, "icon__2": i2}
