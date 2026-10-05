"""Sunflower line: sunflower_seedling -> sunflower_bud -> sunflower.

Shape motif: the HEAD THAT TURNS TO FACE (heliotropism, aimed at the foe
instead of the sun): the seedling's seed-hull helmet, the bud's nodding
fist of bracts, the sunflower's huge 3/4 disc. Accent: the gold in slot 3
(the hull stripes, the bud's peeking petal tips, the petals). Heart-shaped
leaves are the arms throughout, the lead arm always thrust under the head. The whole
plant rotates about its feet (fk.pose); idle pushes it 2 deg further.

Poses and rubric scores (CREATURES.md §9):
  sunflower_seedling  LUNGING  score 8 (8: small for its class, by design)
  sunflower_bud       LUNGING  score 8 (7: the bud body is a plain dome)
  sunflower           LOOMING  score 9
"""

import numpy as np
from px import Sprite, bezier, spline, star

import fieldkit as fk
IDS = ["sunflower_seedling", "sunflower_bud", "sunflower"]

SEED = ["#2c5434", "#78b840", "#e8e890"]           # blue-green, leaf green, pale gold
BUD = ["#2c4c30", "#70b040", "#f8c830"]            # blue-green, leaf green, gold
SUN = ["#583018", "#609838", "#f8c020"]            # seed brown, leaf green, gold petals


def heart(c, p0, p1, w, bend=0.0, teeth=7):
    """Ovate/heart leaf with a fine serrated edge."""
    return c.leaf(p0, p1, w, bend=bend, power=0.55, tip=1.35, base=0.55, teeth=teeth, tooth=0.10)


def vein(s, ctrl, tone, over):
    for x, y in bezier(ctrl, 40):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def phyllo(s, cx, cy, rx, ry, n, tone, over, ang=0.0):
    """Fibonacci seed spiral: dots of `tone` where the disc is `over`."""
    ca, sa = np.cos(np.radians(ang)), np.sin(np.radians(ang))
    for k in range(1, n):
        a = k * np.radians(137.5)
        r = np.sqrt(k / n)
        u, v = np.cos(a) * r * rx, np.sin(a) * r * ry
        x, y = int(round(cx + u * ca - v * sa)), int(round(cy + u * sa + v * ca))
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


# --------------------------------------------------------------------------- fronts

def seedling_front(fr=0):
    """LUNGING. A stout sprout leaning in on a C of stem, its seed hull jammed
    on its head like an oversized striped helmet tipped at the foe; the seed
    leaves are arms, the near one thrust forward, the far one flung up."""
    b = fr
    s = Sprite(56, 56, SEED)
    c = s.c
    roots = c.leaf((32, 54), (22, 55.6), 6, power=0.6) | c.leaf((34, 54), (44, 55.6), 6, power=0.6)
    s.add(roots, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 16 + 2.0 * b, 33, 55)
    b = 0
    rear = c.leaf((29, 39), (45, 22), 12, bend=-2.0, power=0.6, tip=0.8, base=1.2)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=1)
    stem = c.curve([(33, 55.6), (35, 49), (32, 42), (27, 38)], 7.0, 5.6)
    s.add(stem, tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    true1 = c.leaf((28, 38), (34, 30), 6, power=0.7, tip=1.5)
    s.add(true1, tones=(1, 2, 2), shade=(1, 1))
    lead = c.leaf((27, 41), (8, 29), 15, bend=2.2, power=0.6, tip=0.75, base=1.2)
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    hull = c.leaf((29, 38), (22, 14), 14, power=0.62, tip=1.5, base=0.75)
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    # gold stripes down the hull (the line's accent) + a glint
    from scipy import ndimage
    inner = ndimage.binary_erosion(hull, iterations=1)
    for off in (-3.0, 0.4):
        for t in np.linspace(0.16, 0.9, 50):
            x, y = fk.mi(s, 29 + (22 - 29) * t + off * 0.96, 38 + (14 - 38) * t + off * 0.29)
            if inner[y, x] and s.t[y, x] == 0:
                s.px([(x, y)], 3)
    vein(s, [fk.m(s, *p) for p in ((25, 41), (16, 35), (10, 31))], 1, (2,))
    fk.contact(s, 25, 31)
    s.clean()
    return fk.finish(s)


def bud_front(fr=0):
    """LUNGING. The bud nods hard at the foe on a crooked neck: a spiked fist
    of green bracts with gold petal tips bursting from its front; the near
    heart leaf thrust forward, the far one flung back."""
    b = fr
    s = Sprite(56, 56, BUD)
    c = s.c
    hx, hy = 19, 24 + b
    feet = c.leaf((35, 54), (25, 55.6), 6, power=0.6) | c.leaf((37, 54), (48, 55.6), 6, power=0.6)
    s.add(feet, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 10 + 2.0 * b, 36, 55)
    b = 0
    hx, hy = 20, 24
    rear = heart(c, (36, 34), (51, 22 + b), 11, bend=-2.0)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=1)
    stem = c.curve([(36, 56.5), (39, 44), (35, 33), (hx + 8, hy + 2)], 6.5, 5.0)
    s.add(stem, tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    bracts = star(c, hx + 1, hy, 11, 8.0, 16.0, sx=0.9, sy=0.95, rot=-12)
    s.add(bracts, tones=(1, 2, 2), shade=(2, 2), close=1, line="black")
    bud = c.ellipse(hx + 3, hy, 7.5, 8.5, -20)
    s.add(bud, tones=(1, 2, 3), shade=(3, 3), band=(1, 2, c.Y < hy), line="black")
    tips = star(c, hx - 3, hy + 0.5, 8, 4.5, 12.5, sx=0.8, sy=1.0, rot=-8)
    s.add(tips & (c.X < hx - 1), tones=(2, 3, 3), shade=(1, 1), line="black")
    lead = heart(c, (33, 42), (5, 40 + b), 15, bend=2.0)
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    vein(s, [fk.m(s, *p) for p in ((31, 42), (18, 42), (8, 40))], 1, (2, 3))
    # overlapping bract scales on the bud (artichoke-like chevrons)
    for (x0, y0) in ((hx + 3, hy - 4), (hx + 6, hy + 1), (hx + 2, hy + 4), (hx + 7, hy - 3)):
        x0, y0 = fk.mi(s, x0, y0)
        s.px([(x0 - 1, y0 - 1), (x0, y0), (x0 + 1, y0 - 1)], 1)
    x0, y0 = fk.mi(s, hx + 1, hy - 6)
    s.px([(x0, y0), (x0 + 1, y0 - 1), (x0 + 1, y0)], 3)
    fk.contact(s, 26, 32)
    s.clean()
    return fk.finish(s)


def sun_front(fr=0):
    """LOOMING. A huge seed disc turned 3/4 at the foe and overhanging it,
    a ring of gold petals blazing round it; a thick neck curving back down
    to planted roots; heart leaves spread as arms."""
    b = fr
    s = Sprite(56, 56, SUN)
    c = s.c
    hx, hy = 24, 21
    feet = c.leaf((36, 54), (24, 55.6), 7, power=0.6) | c.leaf((38, 54), (52, 55.6), 7, power=0.6)
    s.add(feet, tones=(1, 2, 2), shade=(1, 1))
    # the whole plant swings about its roots toward the foe (idle: a little more)
    fk.pose(s, 1.07, 14 + 2.0 * b, 37, 55)
    rear = heart(c, (38, 34), (54, 23), 12, bend=-2.0)
    s.add(rear, tones=(2, 2, 2), flat=True)
    stem = c.curve([(37, 56), (40, 44), (37, 33), (hx + 7, hy + 4)], 7.0, 6.0)
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    sx = 0.62
    # the back of the head shows on the far side: green bracts
    s.add(star(c, hx + 6, hy, 12, 10.0, 14.5, sx=0.55, sy=1.0, rot=-15), tones=(1, 2, 2), shade=(2, 2))
    # petals: back ring then front ring, all on the turned ellipse
    for k, (n, r0, r1, w, rot) in enumerate(((15, 8, 19.5, 7.0, 12), (15, 8, 18.0, 7.0, 0))):
        for j in range(n):
            a = np.radians(rot + 360 * j / n)
            ca, sa = np.cos(a), np.sin(a)
            p0 = (hx + ca * r0 * sx, hy + sa * r0)
            p1 = (hx + ca * r1 * sx * (1.25 if ca > 0 else 0.95), hy + sa * r1)
            m = c.leaf(p0, p1, w, power=0.6, tip=1.6, base=0.8)
            s.add(m, tones=(1, 3, 3), shade=(2, 2) if k else (1, 1), line="dark" if k else "black")
    disc = c.ellipse(hx - 1, hy, 11.0 * sx + 0.6, 11.5)
    s.add(disc, tones=(0, 1, 1), shade=(2, 2), line="black")
    lead = heart(c, (35, 42), (7, 42), 16, bend=2.5)
    s.add(lead, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    dcx, dcy = fk.m(s, hx - 1, hy)
    phyllo(s, dcx, dcy, 6.2, 10.2, 46, 0, (1,), ang=-(14 + 2.0 * b))
    gx_, gy_ = fk.mi(s, hx - 4, hy - 8)
    s.px([(gx_, gy_), (gx_ + 1, gy_ - 1), (gx_, gy_ - 1)], 3)
    vein(s, [fk.m(s, *p) for p in ((33, 42), (20, 43), (10, 42))], 1, (2, 3))
    vein(s, [fk.m(s, *p) for p in ((40, 34), (47, 28), (53, 24))], 1, (2,))
    fk.contact(s, 27, 34)
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- backs

def seedling_back():
    """From behind and above: the seed leaves spread like arms (the near one
    raised on the right), the hull helmet tipped toward the foe."""
    s = Sprite(48, 48, SEED, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.4, 26, 14)
    stem = c.curve([(20, 48), (20, 38), (23, 28)], 7.0, 5.6)
    cotL = c.leaf((21, 29), (1, 20), 15, bend=2.0, power=0.6, tip=0.75, base=1.3)
    cotR = c.leaf((25, 28), (47, 12), 18, bend=-2.0, power=0.6, tip=0.75, base=1.3)
    true1 = c.leaf((22.5, 28), (19, 17), 8, power=0.7, tip=1.5)
    true2 = c.leaf((24, 28), (29, 17), 8, power=0.7, tip=1.5)
    hull = c.leaf((24, 22), (35, 8), 11, power=0.6, tip=1.7, base=0.6)
    s.add(stem, tones=(1, 2, 2), shade=(3, 0))
    s.add(cotL, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(true1, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(true2, tones=(1, 2, 2), shade=(2, 2))
    s.add(cotR, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    for t in np.linspace(0.15, 0.85, 40):
        x, y = fk.mi(s, 24 + 11 * t, 22 - 14 * t)
        if 0 <= x < 48 and 0 < y < 47 and s.t[y, x] == 0 and s.t[y - 1, x] == 0 and s.t[y + 1, x] == 0:
            s.px([(x, y)], 3)
    s.clean()
    return fk.finish(s)


def bud_back():
    """The bud from behind and below: the green star of bracts (no petals, no
    disc), gold tips peeping round its far rim, nodding toward the foe (top
    right); the neck runs up into the back of the bud."""
    s = Sprite(48, 48, BUD, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.3, 26, 18)
    hx, hy = 27, 17
    lfL = heart(c, (18, 38), (0, 30), 15, bend=2.0)
    lfR = heart(c, (20, 32), (47, 30), 15, bend=-2.0)
    s.add(lfL, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.add(star(c, hx + 2, hy - 2, 9, 9.0, 14.5, sx=1.0, sy=0.85, rot=-80) & (c.Y < hy - 3),
          tones=(3, 3, 3), flat=True)
    s.add(star(c, hx, hy, 11, 8.0, 14.5, sx=1.0, sy=0.9, rot=-60), tones=(1, 2, 2), shade=(2, 2), close=1)
    s.add(star(c, hx - 0.5, hy + 0.5, 8, 4.5, 9.5, sx=1.0, sy=0.9, rot=-40), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 2), line="dark")
    s.add(lfR, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    stem = c.curve([(17, 48), (16, 37), (20, 27), (hx - 1, hy + 2)], 7.0, 5.0)
    s.add(stem, tones=(1, 2, 3), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    s.clean()
    return fk.finish(s)


def sun_back():
    """The back of the great head, seen from behind and below: a broad green
    star of bracts ringed by the backs of the gold petals, leaning to the
    top right; the thick neck runs up into its centre; leaves raised."""
    s = Sprite(48, 48, SUN, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.06, 24, 28)
    hx, hy = 26, 18
    lfL = heart(c, (17, 40), (0, 32), 15, bend=2.0)
    lfR = heart(c, (20, 36), (47, 40), 14, bend=-2.0)
    s.add(lfL, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    for j in range(16):
        a = np.radians(5 + 360 * j / 16)
        p0 = (hx + np.cos(a) * 9, hy + np.sin(a) * 8)
        p1 = (hx + np.cos(a) * 22, hy + np.sin(a) * 18)
        s.add(c.leaf(p0, p1, 8, power=0.6, tip=1.6, base=0.8), tones=(1, 3, 3), shade=(1, 1), line="dark")
    s.add(star(c, hx, hy, 15, 10.5, 14.0, sx=1.0, sy=0.88, rot=-8), tones=(1, 2, 2), shade=(2, 2), close=1,
          line="black")
    s.add(star(c, hx - 0.5, hy + 0.5, 11, 6.5, 10.0, sx=1.0, sy=0.88, rot=10), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 2), line="dark")
    s.add(lfR, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    stem = c.curve([(16, 48), (15, 38), (19, 28), (hx - 1, hy + 2)], 9.0, 7.0)
    s.add(stem, tones=(1, 2, 3), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- icons

def _feet(s, c):
    s.add(c.leaf((10, 14.5), (5, 15.6), 3.6, power=0.6) | c.leaf((11, 14.5), (15, 15.6), 3.6, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)


def seedling_icon(f=0):
    s = Sprite(16, 16, SEED)
    c = s.c
    d = -f
    _feet(s, c)
    s.add(c.leaf((9, 8), (15.4, 4.5), 4.6, power=0.6), tones=(1, 2, 2), flat=True, prune=False)
    s.add(c.curve([(10.5, 15.6), (11, 12), (9, 8.5)], 2.8, 2.4), tones=(2, 2, 2), flat=True, prune=False)
    s.add(c.leaf((9 + d, 6), (5.5 + d, 1.2), 4.0, power=0.6), tones=(0, 0, 0), flat=True, prune=False)
    s.add(c.leaf((9, 9), (1 + d, 7), 5.4, power=0.6), tones=(1, 2, 3), shade=(1, 1), band=(1, 2), prune=False)
    s.render()
    s.px([(7 + d, 3), (8 + d, 4)], 3)
    return s


def bud_icon(f=0):
    s = Sprite(16, 16, BUD)
    c = s.c
    d = -f
    _feet(s, c)
    s.add(c.leaf((11, 9), (15.5, 5), 4.0), tones=(1, 2, 2), flat=True, prune=False)
    s.add(c.curve([(11, 15.6), (12, 11), (10, 7.5), (8, 6.5)], 2.8, 2.4), tones=(2, 2, 2), flat=True, prune=False)
    s.add(star(c, 5.5 + d, 7.5, 7, 3.2, 5.6, sx=0.85, rot=10) & (c.X < 6.5 + d), tones=(3, 3, 3), flat=True,
          prune=False)
    s.add(c.ellipse(6.5 + d, 7, 3.8, 4.0, -20), tones=(1, 2, 3), shade=(1, 1), prune=False)
    s.add(c.leaf((10, 12), (2, 12.5), 4.4, bend=0.6), tones=(1, 2, 2), shade=(1, 1), prune=False)
    return s.render()


def sun_icon(f=0):
    s = Sprite(16, 16, SUN)
    c = s.c
    d = -f
    _feet(s, c)
    s.add(c.curve([(11, 15.6), (12.5, 11), (10, 8)], 3.2, 2.8), tones=(2, 2, 2), flat=True, prune=False)
    s.add(c.leaf((11, 11), (15.6, 8), 3.6), tones=(1, 2, 2), flat=True, prune=False)
    s.add(star(c, 7 + d, 7, 10, 4.4, 7.4, sx=0.8, rot=5), tones=(3, 3, 3), flat=True, prune=False)
    s.add(c.ellipse(6.5 + d, 7, 2.6, 3.8, 12), tones=(1, 1, 1), flat=True, line="black", prune=False)
    s.render()
    return s


ICON_FN = {"sunflower_seedling": seedling_icon, "sunflower_bud": bud_icon, "sunflower": sun_icon}

# hand-pixelled (fill-only; fk.hand_icon adds the outline ring)
HAND = {
    "sunflower": [
        "....3.3.3.......",
        "..3333333.3.....",
        ".33300000333....",
        "333011111033....",
        ".30111111103....",
        "330111111103....",
        ".30111111103....",
        "330111111003....",
        ".33011110033.2..",
        "..330000333.222.",
        "...33.3.3.22222.",
        ".........2222...",
        ".......222......",
        "........22......",
        "....1111.1111...",
        "................"],
}


def make(id_):
    f, b = {
        "sunflower_seedling": (seedling_front, seedling_back),
        "sunflower_bud": (bud_front, bud_back),
        "sunflower": (sun_front, sun_back),
    }[id_]
    fr = fk.register([f(0), f(1)])
    pal = {"sunflower_seedling": SEED, "sunflower_bud": BUD, "sunflower": SUN}[id_]
    if id_ in HAND:
        i1, i2 = fk.hand_icon(HAND[id_], pal)
    else:
        i1, i2 = fk.icon_frames(ICON_FN[id_], None)
    return {"front": fr[0], "front__2": fr[1], "back": b(), "icon": i1, "icon__2": i2}
