"""Dandelion line: dandelion_bud -> dandelion -> dandelion_clock.

Signature feature: the lion's-tooth leaf (saw teeth pointing back) at the
base, and the reflexed green bracts under the head. The bud's tip shows a
lick of yellow, the teen is all mane, the clock is all seeds.
"""

import numpy as np
from px import Sprite, icon_rows, squash, bob, bezier, spline, shift, blob, star, saw_leaf

import icons
IDS = ["dandelion_bud", "dandelion", "dandelion_clock"]

BUD = ["#286828", "#78b838", "#f8d830"]            # deep green, leaf green, yellow
LION = ["#2c6828", "#f8c018", "#f8f8a8"]           # deep green, dandelion yellow, pale
CLOCK = ["#4c7838", "#b0b8d8", "#f8f8f8"]          # stem olive, seed shade lavender, white


def tooth_leaf(c, p0, p1, w, teeth=3, bend=0.0):
    return saw_leaf(c, p0, p1, w, lobes=teeth, bend=bend)


def rosette(s, c, cx, cy, spec, tones=(1, 2, 2)):
    """Base rosette of lion's-tooth leaves: spec = [(tip_x, tip_y, width, lobes, bend), ...] back to front."""
    for tx, ty, w, lobes, bend in spec:
        s.add(tooth_leaf(c, (cx, cy), (tx, ty), w, teeth=lobes, bend=bend), tones=tones, shade=(2, 2), close=2)


def bud_front():
    s = Sprite(56, 56, BUD)
    c = s.c
    stem = c.curve([(28, 53), (29.5, 42), (26, 31), (22, 25)], 3.8, 3.2)
    bud = blob(c, [(18, 10), (14, 15), (13, 22), (16, 27), (22, 28), (26, 23), (25, 15), (22, 11)])
    tip = c.ellipse(18.5, 10.5, 3.0, 3.4, -25)
    bracts = (c.leaf((22, 26), (29, 33), 4.6, bend=-1.2, tip=1.6) | c.leaf((17, 27), (13, 34), 4.6, bend=1.2, tip=1.6)
              | c.leaf((20, 27), (21, 35), 4.4, tip=1.6))
    rosette(s, c, 28, 53, [(50, 41, 13, 3, -1.5), (9, 55.6, 10, 2, 0)])
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    s.add(bracts, tones=(1, 1, 1), flat=True)
    rosette(s, c, 28, 53, [(4, 42, 14, 3, 1.5), (40, 55.6, 9, 2, 0)])
    s.add(tip, tones=(3, 3, 3), flat=True)
    s.add(bud, tones=(1, 2, 2), shade=(3, 2), line="black")
    s.render()
    # sepal seams spiralling up to the yellow tip
    for ctrl in ([(16, 26), (15, 19), (18, 14)], [(21, 27), (22, 20), (20, 14)]):
        for x, y in bezier(ctrl, 20):
            x, y = int(x), int(y)
            if s.t[y, x] == 2:
                s.px([(x, y)], 1)
    s.clean()
    return s.image()


def lion_front():
    s = Sprite(56, 56, LION)
    c = s.c
    hx, hy = 23, 19
    stem = c.curve([(27, 30), (30, 41), (29, 53)], 4.2, 3.6)
    bracts = (c.leaf((26, 28), (35, 37), 4.8, bend=-1.5, tip=1.6) | c.leaf((22, 29), (17, 38), 4.8, bend=1.5, tip=1.6)
              | c.leaf((24, 29), (26, 39), 4.4, tip=1.6) | c.ellipse(24.5, 27, 6, 4, -15))
    mane = star(c, hx, hy, 16, 15.5, 19.0, sx=1.0, sy=0.72, rot=-12)
    rosette(s, c, 29, 53, [(53, 41, 14, 3, -1.5), (12, 55.6, 10, 2, 0)], tones=(1, 1, 1))
    s.add(stem, tones=(1, 1, 1), flat=True)
    rosette(s, c, 29, 53, [(4, 41, 15, 3, 1.5), (44, 55.6, 10, 2, 0)], tones=(1, 1, 1))
    s.add(bracts, tones=(1, 1, 1), flat=True)
    s.add(mane, tones=(1, 2, 2), shade=(1, 2), close=2)
    s.add(star(c, hx - 1, hy - 1, 13, 10.0, 13.0, sx=1.0, sy=0.72, rot=2), tones=(2, 2, 3), shade=(1, 1),
          band=(1, 3, (c.X < hx + 2) & (c.Y < hy)), line="black")
    s.add(star(c, hx - 2, hy - 1.5, 8, 4.0, 6.6, sx=1.0, sy=0.72, rot=-8), tones=(2, 2, 3), flat=True, line="black")
    s.render()
    s.paint(c.ellipse(hx - 2, hy - 1.5, 2.2, 1.6), 3)
    s.clean()
    return s.image()


def clock_front():
    s = Sprite(56, 56, CLOCK)
    c = s.c
    gx, gy, R = 30, 22, 16.0
    stem = c.curve([(30.5, 37), (32, 46), (31, 55.6)], 3.8, 3.4)
    globe = star(c, gx, gy, 22, R, R + 3.2, rot=4)
    rosette(s, c, 31, 55, [(52, 48, 11, 2, -1), (9, 49, 12, 2, 1)], tones=(1, 1, 1))
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(globe, tones=(2, 3, 3), shade=(5, 5), close=3)
    s.render()
    # the seeds' tips cluster at the heart; pappus rays read as fine lavender
    # ticks in the shaded half only
    for k in range(18):
        a = 2 * np.pi * k / 18 + 0.2
        if k % 2:
            continue
        pts = [(int(gx + 1 + np.cos(a) * r), int(gy + 1 + np.sin(a) * r)) for r in (10.0, 11.4)]
        if all(s.t[y, x] == 3 for x, y in pts) and np.cos(a) + np.sin(a) > 0.3:
            s.px(pts, 2)
    # two seeds drifting off to the upper left
    seed = ["..000..", ".03330.", "0333330", ".00000.", "..0....", "..0....", ".010...", ".010...", "..0...."]
    s.rows(2, 2, seed)
    s.rows(8, 13, [".000.", "03330", ".000.", ".0...", "010..", "010..", ".0..."])
    s.clean()
    return s.image()


def bud_back():
    """From behind and above: the bud's sepal seams, its reflexed bracts,
    and the lion's-tooth rosette spread flat round the stem below."""
    s = Sprite(48, 48, BUD, crop_bottom=True)
    c = s.c
    stem = c.curve([(25, 48), (24, 36), (25, 26)], 4.6, 4.0)
    bud = blob(c, [(26, 3), (20, 8), (18, 17), (21, 24), (28, 25), (32, 18), (31, 9)])
    tip = c.ellipse(26, 4, 3.4, 3.0)
    bracts = (c.leaf((22, 22), (14, 30), 5.0, bend=1.2, tip=1.6) | c.leaf((29, 23), (36, 31), 5.0, bend=-1.2, tip=1.6)
              | c.leaf((25, 24), (25, 32), 4.6, tip=1.6))
    for tx, ty, w, lb, bend in ((47, 33, 14, 3, -1.5), (1, 31, 14, 3, 1.5)):
        s.add(tooth_leaf(c, (25, 47), (tx, ty), w, teeth=lb, bend=bend), tones=(1, 1, 2), shade=(2, 2), close=2)
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    for tx, ty, w, lb, bend in ((6, 48, 13, 2, 0.5), (44, 48, 13, 2, -0.5)):
        s.add(tooth_leaf(c, (25, 45), (tx, ty), w, teeth=lb, bend=bend), tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(bracts, tones=(1, 1, 1), flat=True)
    s.add(tip, tones=(3, 3, 3), flat=True)
    s.add(bud, tones=(1, 2, 2), shade=(3, 2), line="black")
    s.render()
    for ctrl in ([(21, 23), (20, 15), (24, 7)], [(27, 24), (28, 16), (27, 7)]):
        for x, y in bezier(ctrl, 20):
            x, y = int(x), int(y)
            if s.t[y, x] == 2:
                s.px([(x, y)], 1)
    s.clean()
    return s.image()


def lion_back():
    """The back of the flower head: a mane of rays round the green
    receptacle and its starburst of reflexed bracts, the stem dropping away."""
    s = Sprite(48, 48, LION, crop_bottom=True)
    c = s.c
    hx, hy = 24, 20
    stem = c.curve([(24, 26), (23, 38), (24, 48)], 5.0, 4.4)
    mane = star(c, hx, hy, 18, 18.0, 22.0, sx=1.0, sy=0.8, rot=-6)
    s.add(stem, tones=(1, 1, 1), shade=(2, 0))
    s.add(mane, tones=(1, 2, 2), shade=(1, 3), close=2)
    s.add(star(c, hx, hy, 14, 12.5, 16.0, sx=1.0, sy=0.8, rot=6), tones=(2, 2, 3), shade=(1, 1),
          band=(1, 3, (c.X < hx + 4) & (c.Y < hy - 3)), line="black")
    for k in range(9):
        a = np.radians(90 + 40 * k)
        p1 = (hx + np.cos(a) * 11.5, hy + 1 + np.sin(a) * 9.5)
        s.add(c.leaf((hx, hy + 1), p1, 4.2, power=0.7, tip=1.8), tones=(1, 1, 1), flat=True, line="black")
    s.add(c.ellipse(hx, hy + 1, 4.5, 3.8), tones=(1, 1, 3), shade=(1, 1), band=(1, 2), line="black")
    s.render()
    s.clean()
    return s.image()


def clock_back():
    """The seed clock from behind: the globe fills the frame, a few seeds
    already lifting off to the right."""
    s = Sprite(48, 48, CLOCK, crop_bottom=True)
    c = s.c
    gx, gy, R = 23, 22, 18.5
    stem = c.curve([(23, 38), (24, 44), (23, 48)], 4.4, 4.2)
    globe = star(c, gx, gy, 24, R, R + 3.2, rot=0)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(globe, tones=(2, 3, 3), shade=(6, 6), close=3)
    s.render()
    s.rows(40, 2, ["..000..", ".03330.", "0333330", ".00000.", "....0..", "....0..", "...010.", "...010.", "....0.."])
    s.clean()
    return s.image()




def make(id_):
    f, b, pal = {
        "dandelion_bud": (bud_front, bud_back, BUD),
        "dandelion": (lion_front, lion_back, LION),
        "dandelion_clock": (clock_front, clock_back, CLOCK),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, lambda: icons.plain(f), pal)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
