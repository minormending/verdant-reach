"""Oak line: oak_acorn -> oak_sapling -> great_oak.

Signature feature: the scaly acorn cap. The acorn wears it, the sapling
still wears it as a hat over its first oak leaves, and the great oak
carries a new crop of acorns under its crown.
"""

from px import Sprite, icon_rows, squash, bob, shift, lobed_leaf, blob
import numpy as np

import icons
IDS = ["oak_acorn", "oak_sapling", "great_oak"]

ACORN = ["#683818", "#d88830", "#f8e098"]          # cap brown, amber nut, cream light
SAPLING = ["#4c4418", "#80b838", "#e0f090"]        # olive (trunk/acorn/leaf shade), leaf, light
OAK = ["#344420", "#68a838", "#d0e878"]            # blue-green shade, leaf, light


def cap_scales(s: Sprite, cap, x0, x1, y0, y1, dx=4, dy=3, lit_tone=2):
    """Acorn-cap scales: little lit tops (mid) over dark, black notch below."""
    for j, y in enumerate(range(y0, y1, dy)):
        off = (j % 2) * (dx // 2)
        for x in range(x0 + off, x1, dx):
            if cap[y, x] and cap[y, x + 1] and s.t[y, x] > 0 and s.t[y, x + 1] > 0 and y + 1 < s.h:
                lit = x < (x0 + x1) / 2 + 2
                if lit:
                    s.px([(x, y), (x + 1, y)], lit_tone)
                if s.t[y + 1, x] > 0:
                    s.px([(x + (1 if lit else 0), y + 1)], 0)


# --------------------------------------------------------------------------- acorn

def acorn_front():
    s = Sprite(56, 56, ACORN)
    c = s.c
    nut = blob(c, [(27, 29), (17, 32), (14, 40), (17, 48), (24, 54), (27, 55.6), (31, 53), (38, 46), (40, 38), (37, 31)])
    cap = c.ellipse(28.5, 25.5, 17.5, 9.5, -10)
    stalk = c.curve([(30, 18), (30, 13), (33, 10.5), (37, 11.5)], 4.0, 2.6)
    s.add(nut, tones=(1, 2, 3), shade=(4, 3), band=(3, 5, c.Y > 34), cast=3)
    s.add(stalk, tones=(1, 1, 2), dark=0.05)
    s.add(cap, tones=(1, 1, 2), shade=(3, 2), band=(1, 2, (c.Y < 24) & (c.X < 34)))
    s.render()
    cap_scales(s, cap, 12, 46, 19, 34)
    s.clean()
    return s.image()


def acorn_back():
    s = Sprite(48, 48, ACORN, crop_bottom=True)
    c = s.c
    cx, cy = 24, 25
    nut = blob(c, [(24, 30), (9, 33), (6, 40), (11, 48.5), (37, 48.5), (42, 40), (39, 33)])
    cap = c.ellipse(cx, cy, 21.5, 13.5)
    stalk = c.curve([(24, 15), (23.5, 9), (21, 6), (17, 6.5)], 4.6, 3.0)
    s.add(nut, tones=(1, 2, 3), shade=(5, 3), band=(3, 5, c.Y > 39), cast=3)
    s.add(cap, tones=(1, 1, 2), shade=(3, 3), band=(1, 2, (c.Y < 24) & (c.X < 28)))
    s.add(stalk, tones=(1, 1, 2), dark=0.05)
    s.render()
    cap_scales(s, cap, 3, 46, 13, 40)
    s.clean()
    return s.image()



# --------------------------------------------------------------------------- sapling


def sapling_front():
    s = Sprite(56, 56, SAPLING)
    c = s.c
    roots = (c.curve([(27, 50), (23, 54), (19, 55.6)], 3.8, 2.4) | c.curve([(30, 50), (34, 54), (38, 55.6)], 3.8, 2.4))
    trunk = c.curve([(28.5, 55.6), (31, 44), (28, 32), (24.5, 22)], 6.8, 5.0)
    leafF = lobed_leaf(c, (27, 38), (6, 42), 15)              # forward arm
    leafR = lobed_leaf(c, (31, 34), (51, 34), 14)             # back arm
    leafA = lobed_leaf(c, (21, 21), (2, 11), 16)              # crown, forward
    leafB = lobed_leaf(c, (28, 19), (47, 8), 15)              # crown, back
    cap = c.ellipse(24.5, 18.0, 11.0, 6.6, -16)
    stalk = c.curve([(26, 12), (26.5, 7.5), (30, 5.5), (33.5, 6.5)], 3.6, 2.6)
    s.add(leafB, tones=(1, 2, 3), close=3, shade=(3, 3))
    s.add(leafR, tones=(1, 2, 3), close=3, shade=(3, 3))
    s.add(roots, tones=(1, 1, 1), flat=True)
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(leafF, tones=(1, 2, 3), close=3, shade=(3, 3), band=(1, 2))
    s.add(leafA, tones=(1, 2, 3), close=3, shade=(3, 3), band=(1, 2))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(1, 1, 1), shade=(2, 2))
    s.render()
    cap_scales(s, cap, 13, 37, 13, 25, dx=4, dy=3, lit_tone=3)
    s.clean()
    return s.image()


def sapling_back():
    """From behind and above: the cap's crown, the leaves fanned out around
    it (their paler undersides on the far ones), trunk running out of frame."""
    s = Sprite(48, 48, SAPLING, crop_bottom=True)
    c = s.c
    trunk = c.curve([(24, 48), (23.5, 34), (24, 22)], 7.0, 6.0)
    armL = lobed_leaf(c, (21, 36), (2, 33), 14)
    armR = lobed_leaf(c, (26, 33), (46, 38), 13)
    lfL = lobed_leaf(c, (21, 18), (2, 9), 15)
    lfR = lobed_leaf(c, (27, 17), (46, 8), 15)
    cap = c.ellipse(24, 16, 12.5, 8.5, 10)
    stalk = c.curve([(23, 11), (22, 6), (18, 3.5), (14.5, 4.5)], 3.6, 2.6)
    s.add(armR, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(lfR, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(armL, tones=(1, 2, 3), close=3, shade=(2, 2), band=(1, 2))
    s.add(lfL, tones=(1, 2, 3), close=3, shade=(2, 2), band=(1, 2))
    s.add(cap, tones=(1, 1, 1), shade=(2, 2))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.render()
    cap_scales(s, cap, 12, 37, 10, 24, dx=4, dy=3, lit_tone=3)
    s.clean()
    return s.image()



# --------------------------------------------------------------------------- great oak


def clump(c, cx, cy, rx, ry, bumps=7, br=2.3, seed=0):
    """A leafy clump: an ellipse with little leaf bumps around its top half."""
    m = c.ellipse(cx, cy, rx, ry)
    for k in range(bumps):
        a = np.pi + np.pi * (k + 0.5) / bumps + (0.15 if (k + seed) % 2 else -0.1)
        m |= c.circle(cx + np.cos(a) * (rx - br * 0.5), cy + np.sin(a) * (ry - br * 0.5), br)
    return m


def oak_front():
    s = Sprite(56, 56, OAK)
    c = s.c
    trunk = (c.stroke([(28, 55), (28.5, 44), (27.5, 34)], 10.0, 7.5)
             | c.curve([(25, 49), (20, 53.5), (13, 55.6)], 5.4, 2.4)
             | c.curve([(31, 49), (37, 53.5), (44, 55.6)], 5.4, 2.4)
             | c.curve([(26, 40), (19, 35), (11, 32)], 4.8, 2.6)
             | c.curve([(30, 38), (37, 34), (46, 32)], 4.8, 2.6))
    clumps = [  # back to front
        (28, 10, 11, 7.5), (14, 14, 9, 7), (42, 14, 9.5, 7),
        (6.5, 23, 6, 6.5), (49.5, 23, 6, 6.5), (21, 19, 10, 7.5), (36, 20, 10, 7.5),
        (11, 29, 9.5, 6), (28, 28.5, 10, 6.5), (45, 29, 9, 6),
    ]
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    for i, (cx, cy, rx, ry) in enumerate(clumps):
        s.add(clump(c, cx, cy, rx, ry, bumps=int(rx * 0.7), seed=i), tones=(1, 2, 3), shade=(3, 3), close=2,
              band=(1, 2, c.Y < cy - ry * 0.2), line="dark", cast=2)
    s.render()
    for ax, ay in [(17, 36), (40, 36)]:
        s.rows(ax - 2, ay - 1, ["..0..", ".010.", "01110", "00000", "03320", "03220", ".020.", "..0.."])
    # bark grooves
    s.px([(26, 41), (26, 42), (25, 43), (25, 44), (25, 45), (24, 46), (24, 47), (31, 42), (31, 43),
          (30, 44), (30, 45), (30, 46), (28, 48), (28, 49), (28, 50), (28, 51)], 0)
    s.clean()
    return s.image()


def oak_back():
    """From behind and above: the top of the crown fills the frame, the
    trunk drops out of the bottom edge."""
    s = Sprite(48, 48, OAK, crop_bottom=True)
    c = s.c
    trunk = c.stroke([(24, 48), (24, 38)], 10, 9)
    clumps = [(24, 7.5, 11, 7), (10, 13, 9, 7), (38, 13, 9.5, 7), (17, 19, 10, 7.5), (32, 19.5, 10, 7.5),
              (5.5, 26, 5.5, 6.5), (42.5, 26, 5.5, 6.5), (24, 27, 12, 7.5), (11, 33, 9, 6), (37, 33, 9, 6)]
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    for i, (cx, cy, rx, ry) in enumerate(clumps):
        s.add(clump(c, cx, cy, rx, ry, bumps=int(rx * 0.7), seed=i), tones=(1, 2, 3), shade=(3, 3), close=2,
              band=(1, 2, c.Y < cy - ry * 0.2), line="dark", cast=2)
    s.render()
    s.clean()
    return s.image()




def make(id_):
    f, b, pal = {
        "oak_acorn": (acorn_front, acorn_back, ACORN),
        "oak_sapling": (sapling_front, sapling_back, SAPLING),
        "great_oak": (oak_front, oak_back, OAK),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, lambda: icons.plain(f), pal)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
