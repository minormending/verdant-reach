"""Sunflower line: sunflower_seedling -> sunflower_bud -> sunflower.

Signature feature: the striped seed. The seedling still wears its seed
hull like a cap; the bud is a green star of bracts with yellow peeking;
the sunflower's disc is packed with those seeds.
"""

import numpy as np
from px import Sprite, icon_rows, squash, bob, bezier, spline, shift, blob, star

import icons
IDS = ["sunflower_seedling", "sunflower_bud", "sunflower"]

SEED = ["#2e6a30", "#88c848", "#f8f0a0"]           # deep green, leaf green, pale yellow
BUD = ["#2a6430", "#78b840", "#f8d038"]            # deep green, leaf green, yellow
SUN = ["#5a3010", "#f0b018", "#78b040"]            # seed brown, gold petals, leaf green


def seedling_front():
    s = Sprite(56, 56, SEED)
    c = s.c
    stem = c.curve([(28, 55.5), (28.5, 46), (27.5, 36)], 5.6, 4.4)
    cotL = c.leaf((26.5, 35), (5, 24), 15, bend=2.0, power=0.6, tip=0.7, base=1.3)
    cotR = c.leaf((29, 35), (51, 27), 14, bend=-2.0, power=0.6, tip=0.7, base=1.3)
    true1 = c.leaf((27.5, 35), (23.5, 25), 6.5, power=0.7, tip=1.5)
    true2 = c.leaf((28.5, 35), (32.5, 26), 6.0, power=0.7, tip=1.5)
    hull = c.leaf((14, 28.5), (2.5, 22.5), 8.5, power=0.7, tip=1.8, base=0.6)
    s.add(true1, tones=(1, 2, 2), dark=0.15)
    s.add(true2, tones=(1, 2, 2), dark=0.15)
    s.add(cotR, tones=(1, 2, 3), dark=0.12, round=5)
    s.add(stem, tones=(1, 2, 2), dark=0.05)
    s.add(cotL, tones=(1, 2, 3), dark=0.12, round=5, hl="rim", lite=0.3)
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    # hull stripes
    for x, y in [(5, 23), (6, 24), (7, 24), (8, 25), (9, 26), (10, 26), (11, 27)]:
        if s.t[y, x] == 0 and s.t[y - 1, x] == 0 and s.t[y + 1, x] == 0:
            s.px([(x, y)], 3)
    s.clean()
    return s.image()


def bud_front():
    s = Sprite(56, 56, BUD)
    c = s.c
    stem = c.curve([(31, 55.5), (32, 40), (29, 26), (24, 19)], 5.0, 4.0)
    lfL = c.leaf((30, 42), (6, 44), 15, bend=3.0, power=0.6, tip=1.3, base=0.8)
    lfR = c.leaf((32, 34), (52, 26), 13, bend=-2.5, power=0.6, tip=1.3, base=0.8)
    lfS = c.leaf((32, 50), (46, 55), 8, power=0.6, tip=1.3)
    bracts = star(c, 21, 15, 9, 7.5, 14.0, sx=1.0, sy=0.85, rot=-20)
    bud = c.ellipse(21, 14, 9.0, 8.0, -15)
    s.add(lfR, tones=(1, 2, 2), dark=0.12, round=4)
    s.add(stem, tones=(1, 2, 2), dark=0.05)
    s.add(lfS, tones=(1, 2, 2), dark=0.12, round=3)
    s.add(lfL, tones=(1, 2, 2), dark=0.12, round=4)
    s.add(bracts, tones=(1, 1, 2), dark=0.2, round=4)
    s.add(bud, tones=(1, 2, 2), dark=0.14, round=5, line="dark")
    s.render()
    # yellow petal tips peeking from the top of the bud
    for x, y in [(16, 7), (17, 7), (19, 6), (20, 6), (22, 6), (23, 6), (25, 7)]:
        s.px([(x, y), (x, y - 1)], 3)
    s.clean()
    return s.image()


def petal_ring(s, c, cx, cy, n, r0, r1, w, sx, sy, rot, tones, line="dark", shade=(2, 2), skip=()):
    order = sorted(range(n), key=lambda k: np.sin(np.radians(rot + 360 * k / n)))  # top (back) first
    for k in order:
        if k in skip:
            continue
        a = np.radians(rot + 360 * k / n)
        p0 = (cx + np.cos(a) * r0 * sx, cy + np.sin(a) * r0 * sy)
        p1 = (cx + np.cos(a) * r1 * sx, cy + np.sin(a) * r1 * sy)
        s.add(c.leaf(p0, p1, w, power=0.6, tip=1.6, base=0.8), tones=tones, shade=shade, line=line)


def midrib(s, x0, y0, x1, y1, tone, over):
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for k in range(n + 1):
        x, y = round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def phyllo(s, cx, cy, rx, ry, n, lit, shade, owner):
    """Fibonacci seed spiral: lit flecks toward the light, dark ones away."""
    for k in range(1, n):
        a = k * np.radians(137.5)
        r = np.sqrt(k / n)
        x, y = int(round(cx + np.cos(a) * r * rx)), int(round(cy + np.sin(a) * r * ry))
        if s.owner[y, x] != owner or s.t[y, x] != 1:
            continue
        u = (x - cx) / rx + (y - cy) / ry
        s.px([(x, y)], lit if u < -0.35 else shade)


def sun_front():
    s = Sprite(56, 56, SUN)
    c = s.c
    hx, hy = 23, 20
    stem = c.curve([(29, 30), (32, 42), (31, 55.6)], 6.0, 5.2)
    lfL = c.leaf((31, 45), (6, 49), 15, bend=2.5, power=0.6, tip=1.3, base=0.8)
    lfR = c.leaf((32, 38), (54, 30), 14, bend=-2.5, power=0.6, tip=1.3, base=0.8)
    s.add(lfR, tones=(1, 3, 3), flat=True)
    s.add(stem, tones=(1, 3, 3), shade=(2, 0))
    s.add(lfL, tones=(1, 3, 3), flat=True)
    petal_ring(s, c, hx + 3, hy, 12, 6, 21, 8, 0.78, 1.0, 15, (1, 1, 1), line="black", shade=(0, 0))
    petal_ring(s, c, hx, hy, 13, 6, 20, 8, 0.76, 1.0, -8, (1, 2, 2), line="dark", shade=(1, 1))
    disc_i = len(s.parts)
    s.add(c.ellipse(hx - 1, hy, 8.5, 10.5), tones=(0, 1, 2), shade=(3, 3), line="black")
    s.render()
    for y in range(hy - 8, hy + 9, 3):
        for x in range(hx - 8 + (y % 2) * 1 + ((y - hy) // 3 % 2) * 1, hx + 7, 3):
            if s.owner[y, x] == disc_i and s.t[y, x] == 1:
                s.px([(x, y)], 0)
    midrib(s, 29, 46, 10, 48, 1, (3,))
    midrib(s, 33, 37, 50, 31, 1, (3,))
    s.clean()
    return s.image()


def seedling_back():
    """From behind and above: the two seed leaves spread like arms, the hull
    still caught on the far one, the first true leaves between them."""
    s = Sprite(48, 48, SEED, crop_bottom=True)
    c = s.c
    stem = c.curve([(24, 48), (24, 38), (24, 28)], 6.4, 5.6)
    cotL = c.leaf((22, 27), (1, 18), 17, bend=2.0, power=0.6, tip=0.7, base=1.3)
    cotR = c.leaf((26, 27), (47, 16), 17, bend=-2.0, power=0.6, tip=0.7, base=1.3)
    true1 = c.leaf((23.5, 28), (19, 16), 8, power=0.7, tip=1.5)
    true2 = c.leaf((24.5, 28), (29, 16), 8, power=0.7, tip=1.5)
    hull = c.leaf((36, 18.5), (47, 13), 9, power=0.7, tip=1.8, base=0.6)
    s.add(stem, tones=(1, 2, 2), shade=(3, 0))
    s.add(cotL, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(cotR, tones=(1, 2, 2), shade=(3, 3))
    s.add(true1, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(true2, tones=(1, 2, 2), shade=(2, 2))
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    for x, y in [(39, 17), (40, 16), (41, 16), (42, 15), (43, 15)]:
        if s.t[y, x] == 0 and s.t[y - 1, x] == 0 and s.t[y + 1, x] == 0:
            s.px([(x, y)], 3)
    s.clean()
    return s.image()


def bud_back():
    """The bud from behind: its green star of bracts and a ring of yellow
    tips, leaves spread below."""
    s = Sprite(48, 48, BUD, crop_bottom=True)
    c = s.c
    stem = c.curve([(24, 48), (24, 34), (24, 22)], 6.0, 5.0)
    lfL = c.leaf((23, 38), (0, 33), 16, bend=2.5, power=0.6, tip=1.3, base=0.8)
    lfR = c.leaf((25, 32), (47, 27), 15, bend=-2.5, power=0.6, tip=1.3, base=0.8)
    tips = star(c, 24, 14, 10, 11.0, 15.0, sx=1.0, sy=0.8, rot=-90)
    bracts = star(c, 24, 15, 9, 9.0, 14.0, sx=1.0, sy=0.85, rot=-70)
    bud = c.ellipse(24, 15, 10.0, 9.0)
    s.add(lfR, tones=(1, 2, 2), shade=(3, 3))
    s.add(lfL, tones=(1, 2, 2), shade=(3, 3))
    s.add(stem, tones=(1, 2, 2), shade=(3, 0))
    s.add(tips, tones=(3, 3, 3), flat=True)
    s.add(bracts, tones=(1, 1, 2), shade=(2, 2), close=1)
    s.add(bud, tones=(1, 2, 2), shade=(3, 3), line="dark")
    s.render()
    s.clean()
    return s.image()


def sun_back():
    """The back of the head: a green disc of bracts ringed by gold petals,
    the thick stem dropping away below."""
    s = Sprite(48, 48, SUN, crop_bottom=True)
    c = s.c
    hx, hy = 23, 20
    stem = c.curve([(24, 28), (25, 38), (24, 48)], 7.0, 6.4)
    lf = c.leaf((25, 42), (47, 36), 14, bend=-2.0, power=0.6, tip=1.3, base=0.8)
    s.add(lf, tones=(1, 3, 3), flat=True)
    s.add(stem, tones=(1, 3, 3), shade=(3, 0))
    petal_ring(s, c, hx, hy, 14, 8, 22, 8, 0.95, 0.85, 0, (1, 2, 2), line="dark", shade=(1, 1))
    s.add(c.ellipse(hx, hy, 12, 10.5), tones=(1, 3, 3), shade=(3, 3), line="black")
    s.add(star(c, hx, hy, 9, 7.0, 11.5, sx=1, sy=0.88, rot=-90), tones=(1, 3, 3), shade=(2, 2), line="dark")
    s.render()
    s.clean()
    return s.image()


EMPTY_ICON = ["................"] * 16


def make(id_):
    import icons
    f, b, pal, ic = {
        "sunflower_seedling": (seedling_front, seedling_back, SEED, icons.seedling),
        "sunflower_bud": (bud_front, bud_back, BUD, icons.sbud),
        "sunflower": (sun_front, sun_back, SUN, icons.sun),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, front)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
