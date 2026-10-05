"""Bramble line: bramble_blossom -> bramble_berry -> blackberry.

Signature feature: the hooked thorny cane (reddish-purple, as real bramble
canes are) and the drupelet cluster. The blossom's centre is already a
little knot of drupelets; the berry ripens red on the cane; the blackberry
is a heavy black cluster weighing its cane down.
"""

import numpy as np
from px import Sprite, icon_rows, squash, bob, bezier, spline, shift, blob, star

import icons
IDS = ["bramble_blossom", "bramble_berry", "blackberry"]

BLOSSOM = ["#8a3860", "#e8b0c8", "#f8f8f8"]        # berry cane, pink, white
BERRY = ["#701838", "#d83848", "#80c040"]          # plum, red, leaf green
BLACK = ["#302050", "#7058a0", "#c8d8f8"]          # indigo, violet, pale blue glint


def thorns(c, path, every=6, size=3.0, side=1, start=0.1, end=0.9):
    """Hooked thorns along a path: little triangles pointing back down it."""
    pts = np.asarray(path)
    m = c.empty()
    n = len(pts)
    k = 0
    for i in range(int(n * start), int(n * end)):
        if (i - int(n * start)) % every:
            continue
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        d = (b - a) / (np.linalg.norm(b - a) + 1e-9)
        nrm = np.array([-d[1], d[0]]) * (side if k % 2 == 0 else -side)
        k += 1
        base = pts[i]
        tip = base + nrm * size - d * size * 0.7
        m |= c.poly([base - d * 3.4 - nrm * 1.5, base + d * 3.4 - nrm * 1.5, tip])
    return m


def drupe_centres(cx, cy, rx, ry, dx=6.0, dy=5.0):
    out = []
    j = 0
    y = cy - ry
    while y <= cy + ry + 0.01:
        off = (j % 2) * dx / 2
        x = cx - rx - dx + off
        while x <= cx + rx + dx:
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                out.append((x, y))
            x += dx
        y += dy
        j += 1
    return out


def berry_mask(c, cx, cy, rx, ry, r=3.0):
    m = c.ellipse(cx, cy, rx, ry)
    for x, y in drupe_centres(cx, cy, rx, ry):
        m |= c.circle(x, y, r)
    return m


LIT = [".222.", "23322", "23222", ".2221", "..11."]
MID = [".222.", "22222", "22221", ".2211", "..11."]
SHD = [".211.", "22111", ".1111", "....."]


def paint_drupes(s, cx, cy, rx, ry, glints=3):
    """Drupelet stamps over a dark fill: lit ones top-left, shaded ones
    bottom-right, glints only on the few nearest the light."""
    pts = drupe_centres(cx, cy, rx, ry)
    lit_order = sorted(pts, key=lambda p: (p[0] - cx) + (p[1] - cy))
    glint = set(lit_order[:glints])
    for x, y in pts:
        u = (x - cx) / rx + (y - cy) / ry
        stamp = LIT if (x, y) in glint else (MID if u < 0.7 else SHD)
        x0, y0 = int(round(x - 2.5)), int(round(y - 2.5))
        for j, row in enumerate(stamp):
            for i, ch in enumerate(row):
                if ch == ".":
                    continue
                xx, yy = x0 + i, y0 + j
                if 0 <= xx < s.w and 0 <= yy < s.h and s.t[yy, xx] > 0:
                    s.t[yy, xx] = int(ch)
                    s.protect[yy, xx] = True


def cane_mask(c, path, w0, w1, every=7, size=3.8, start=0.1, end=0.9, side=1):
    """Thick cane with hooked thorns that stick out ~size px past its edge."""
    m = c.stroke(path, w0, w1)
    n = len(path)
    pts = np.asarray(path)
    k = 0
    for i in range(int(n * start), int(n * end)):
        if (i - int(n * start)) % every:
            continue
        w = w0 + (w1 - w0) * i / (n - 1)
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        d = (b - a) / (np.linalg.norm(b - a) + 1e-9)
        nrm = np.array([-d[1], d[0]]) * (side if k % 2 == 0 else -side)
        k += 1
        base = pts[i] + nrm * (w / 2 - 1.0)
        tip = base + nrm * size - d * size * 0.8
        m |= c.poly([base - d * 3.6, base + d * 2.8, tip])
    return m


def blossom_front():
    s = Sprite(56, 56, BLOSSOM)
    c = s.c
    cx, cy = 23, 37
    cane_p = spline([(54, 53), (46, 44), (40, 34), (33, 30)])
    cane = cane_mask(c, cane_p, 4.4, 3.6, every=9, size=4.4, start=0.12, end=0.8)
    sepals = star(c, cx + 1, cy - 1, 5, 4, 17, sx=1, sy=0.85, rot=-90)
    s.add(cane, tones=(1, 1, 2), dark=0.05, prune=False)
    s.add(sepals, tones=(1, 1, 1), flat=True)
    order = [2, 3, 1, 4, 0]
    for k in order:
        a = np.radians(-54 + 72 * k)
        p0 = (cx + np.cos(a) * 2, cy + np.sin(a) * 1.7)
        p1 = (cx + np.cos(a) * 17.5, cy + np.sin(a) * 15)
        m = c.leaf(p0, p1, 15.5, power=0.55, tip=0.45, base=1.4)
        s.add(m, tones=(2, 3, 3), dark=0.08, round=5, line="black")
    s.render()
    # crinkle creases on the petals
    for k in (1, 2, 3):
        a = np.radians(-54 + 72 * k)
        for r in (9, 10, 11):
            x, y = int(cx + np.cos(a) * r), int(cy + np.sin(a) * r * 0.85)
            if s.t[y, x] == 3:
                s.px([(x, y)], 2)
    # centre: a knot of green-to-berry drupelets ringed by stamens
    s.paint(c.circle(cx, cy, 5.2), 2)
    for k in range(12):
        a = 2 * np.pi * k / 12
        x, y = int(round(cx + np.cos(a) * 5.0 - 0.5)), int(round(cy + np.sin(a) * 4.6 - 0.5))
        s.px([(x, y)], 0 if k % 2 else 1)
    s.paint(c.circle(cx, cy, 2.8), 1)
    s.px([(int(cx) - 1, int(cy) - 1), (int(cx), int(cy) - 1)], 2)
    s.clean()
    return s.image()


LIT_G = [".222.", "22222", "22221", ".2211", "..11."]


def berry_front():
    s = Sprite(56, 56, BERRY)
    c = s.c
    bx, by, brx, bry = 18, 35, 11.5, 11.5
    cane_p = spline([(39, 55.6), (41, 42), (39, 26), (32, 13), (22, 10), (16, 14), (16, 21)])
    cane = cane_mask(c, cane_p, 7.0, 4.0, every=10, size=3.8, start=0.05, end=0.72, side=1)
    leaf = c.leaf((40, 37), (55, 27), 11, bend=-1.5, power=0.6, teeth=6, tooth=0.3, tip=1.3)
    leaf2 = c.leaf((40, 47), (54, 52), 9, bend=1.0, power=0.6, teeth=5, tooth=0.3, tip=1.3)
    sep = star(c, 17.5, 23.5, 6, 3.0, 10.5, sx=1.1, sy=0.5, rot=-90 + 30)
    s.add(leaf2, tones=(1, 3, 3), shade=(2, 2), close=2)
    s.add(cane, tones=(0, 1, 1), shade=(3, 0), prune=False)
    s.add(leaf, tones=(1, 3, 3), shade=(2, 2), close=2)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    s.add(sep, tones=(1, 3, 3), shade=(1, 1))
    s.render()
    paint_drupes(s, bx, by, brx, bry, glints=0)
    for (x0, y0, x1, y1) in ((42, 35, 52, 29), (42, 47, 51, 51)):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for k in range(n):
            x, y = round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n)
            if s.t[y, x] == 3:
                s.px([(x, y)], 1)
    s.clean()
    return s.image()


def black_front():
    s = Sprite(56, 56, BLACK)
    c = s.c
    cane_p = spline([(45, 55.6), (48, 40), (45, 22), (36, 9), (23, 5), (13, 9), (11, 16)])
    cane = cane_mask(c, cane_p, 8.0, 4.4, every=10, size=4.2, start=0.04, end=0.75, side=1)
    s.add(cane, tones=(0, 1, 2), shade=(3, 0), band=(1, 2), prune=False)
    s.add(berry_mask(c, 31, 33, 8, 9), tones=(1, 1, 1), flat=True)
    s.add(star(c, 30, 23.5, 5, 2.6, 8.5, sx=1.1, sy=0.5, rot=-54), tones=(1, 1, 2), shade=(1, 1))
    s.add(berry_mask(c, 15, 32, 11, 12), tones=(1, 1, 1), flat=True)
    s.add(star(c, 13, 19.5, 5, 3.0, 10.5, sx=1.1, sy=0.5, rot=-54), tones=(1, 1, 2), shade=(1, 1))
    s.add(berry_mask(c, 23, 47, 9, 7.5), tones=(1, 1, 1), flat=True)
    s.render()
    paint_drupes(s, 31, 33, 8, 9, glints=2)
    paint_drupes(s, 15, 32, 11, 12, glints=3)
    paint_drupes(s, 23, 47, 9, 7.5, glints=2)
    s.clean()
    return s.image()


def blossom_back():
    """The flower from behind: pink-shaded petal backs round the dark star of
    sepals, the thorny cane leading away."""
    s = Sprite(48, 48, BLOSSOM, crop_bottom=True)
    c = s.c
    cx, cy = 22, 26
    cane_p = spline([(cx, cy), (30, 34), (37, 41), (44, 48)])
    cane = cane_mask(c, cane_p, 5.0, 6.0, every=9, size=3.6, start=0.3, end=0.95)
    for k in (2, 3, 1, 4, 0):
        a = np.radians(-90 + 72 * k)
        p0 = (cx + np.cos(a) * 2, cy + np.sin(a) * 1.7)
        p1 = (cx + np.cos(a) * 21, cy + np.sin(a) * 18)
        s.add(c.leaf(p0, p1, 18, power=0.55, tip=0.45, base=1.4), tones=(2, 3, 3), shade=(3, 3), line="black")
    s.add(star(c, cx, cy, 5, 3.5, 12, sx=1, sy=0.9, rot=-90 + 36), tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(cane, tones=(1, 1, 2), shade=(2, 2), prune=False)
    s.render()
    s.clean()
    return s.image()


def berry_back():
    """The berry from behind and above: the sepal star on top, the stalk
    climbing back up to the cane."""
    s = Sprite(48, 48, BERRY, crop_bottom=True)
    c = s.c
    bx, by, brx, bry = 22, 34, 16, 15
    cane_p = spline([(48, 4), (36, 8), (28, 12), (23, 18)])
    cane = cane_mask(c, cane_p, 5.0, 4.0, every=9, size=3.6, start=0.1, end=0.7, side=-1)
    leaf = c.leaf((38, 8), (47, 22), 10, bend=-1.5, power=0.6, teeth=6, tooth=0.3, tip=1.3)
    s.add(leaf, tones=(1, 3, 3), shade=(2, 2), close=2)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    s.add(star(c, 22.5, 21, 6, 3.4, 12.5, sx=1.1, sy=0.6, rot=-90 + 30), tones=(1, 3, 3), shade=(1, 1))
    s.add(cane, tones=(0, 1, 1), shade=(3, 0), prune=False)
    s.render()
    paint_drupes(s, bx, by, brx, bry, glints=0)
    s.clean()
    return s.image()


def black_back():
    """The cluster from behind: three berries hanging off the crook, the
    cane's thorns facing us."""
    s = Sprite(48, 48, BLACK, crop_bottom=True)
    c = s.c
    cane_p = spline([(48, 30), (44, 14), (34, 5), (24, 6), (19, 12)])
    cane = cane_mask(c, cane_p, 7.0, 4.6, every=10, size=4.0, start=0.1, end=0.85, side=-1)
    s.add(cane, tones=(0, 1, 2), shade=(3, 0), band=(1, 2), prune=False)
    s.add(berry_mask(c, 33, 32, 9, 10), tones=(1, 1, 1), flat=True)
    s.add(berry_mask(c, 16, 30, 12, 13), tones=(1, 1, 1), flat=True)
    s.add(star(c, 18, 17.5, 5, 3.0, 10.5, sx=1.1, sy=0.55, rot=-54), tones=(1, 1, 2), shade=(1, 1))
    s.add(berry_mask(c, 26, 45, 11, 8), tones=(1, 1, 1), flat=True)
    s.render()
    paint_drupes(s, 33, 32, 9, 10, glints=2)
    paint_drupes(s, 16, 30, 12, 13, glints=3)
    paint_drupes(s, 26, 45, 11, 8, glints=2)
    s.clean()
    return s.image()


EMPTY_ICON = ["................"] * 16


def make(id_):
    import icons
    f, b, pal, ic = {
        "bramble_blossom": (blossom_front, blossom_back, BLOSSOM, icons.bblossom),
        "bramble_berry": (berry_front, berry_back, BERRY, lambda p: icons.berry(p, [(7, 6), (8, 2), (12, 1), (13, 5), (12, 15.6)], 6, 10, 5, 5, (4, 8))),
        "blackberry": (black_front, black_back, BLACK, lambda p: icons.berry(p, [(6, 5), (7, 1.5), (12, 1), (14, 5), (13, 15.6)], 6.5, 10, 5.6, 5.4, (4, 7))),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, front)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
