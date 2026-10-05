"""Bramble line: bramble_blossom -> bramble_berry -> blackberry.

Shape motif: the hooked, thorny cane, worn as a scorpion TAIL that arches
up behind the creature and grows with each stage (a flick, a raised hook,
a whip over the head). Accent: the plum cane (slot 1 in all three). The
blossom's centre is already a knot of drupelets; the berry is a red head
lunging on the cane; the blackberry is a heavy black mace of a cluster
under a whip of a tail, its leaves finally green.

Poses and rubric scores (CREATURES.md §9):
  bramble_blossom  COILED   score 8 (6: pale flower keeps black edges by rule)
  bramble_berry    LUNGING  score 8 (3: the tail pulls the top-half lean back to centre)
  blackberry       LOOMING  score 9
"""

import numpy as np
from px import Sprite, bezier, spline, shift, blob, star

import fieldkit as fk
IDS = ["bramble_blossom", "bramble_berry", "blackberry"]

BLOSSOM = ["#883060", "#e8a8c0", "#f8f8f0"]        # plum cane, petal pink, white
BERRY = ["#682048", "#d83840", "#f8b880"]          # plum-wine, berry red, peach glint
BLACK = ["#482048", "#509038", "#d8f0a0"]          # plum (berry + cane), leaf green, lime glint


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
    """Ellipse with drupelet bumps all round its rim (a bumpy, round berry)."""
    m = c.ellipse(cx, cy, rx, ry)
    n = max(8, int(2 * np.pi * np.sqrt((rx * rx + ry * ry) / 2) / 5.2))
    for k in range(n):
        a = 2 * np.pi * (k + 0.5) / n
        m |= c.circle(cx + np.cos(a) * (rx - 0.6), cy + np.sin(a) * (ry - 0.6), r * 0.9)
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


def leaflet(c, p0, p1, w, bend=0.0):
    return c.leaf(p0, p1, w, bend=bend, power=0.6, teeth=6, tooth=0.32, tip=1.3)


def trifoliate(c, p0, ang, L, w, spread=38, bend=1.0):
    """Bramble leaf: three toothed leaflets fanned from one point (an open hand)."""
    m = c.empty()
    for k, da in enumerate((-spread, 0, spread)):
        a = np.radians(ang + da)
        l = L * (1.0 if da == 0 else 0.78)
        p1 = (p0[0] + np.cos(a) * l, p0[1] + np.sin(a) * l)
        m |= leaflet(c, p0, p1, w * (1.0 if da == 0 else 0.85), bend=bend * np.sign(da or 1))
    return m


def drupes(s, cx, cy, rx, ry, glints=2, stamps=None, dx=6.0, dy=5.0, inside=None):
    """Drupelet stamps over the berry's dark fill (see paint_drupes). With
    `inside` (a mask) they may also paint over black fill inside it."""
    if inside is not None:
        from scipy import ndimage
        inside = ndimage.binary_erosion(inside)
    lit, mid, shd = stamps or (LIT, MID, SHD)
    pts = drupe_centres(cx, cy, rx, ry, dx, dy)
    order = sorted(pts, key=lambda p: (p[0] - cx) + (p[1] - cy))
    gl = set(order[:glints])
    for x, y in pts:
        u = (x - cx) / rx + (y - cy) / ry
        st = lit if (x, y) in gl else (mid if u < 0.7 else shd)
        x0, y0 = int(round(x - 2.5)), int(round(y - 2.5))
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch == ".":
                    continue
                xx, yy = x0 + i, y0 + j
                if not (0 <= xx < s.w and 0 <= yy < s.h):
                    continue
                if (inside is not None and inside[yy, xx] and s.t[yy, xx] >= 0) or (inside is None and s.t[yy, xx] > 0):
                    s.t[yy, xx] = int(ch)


# blackberry drupelets: plum beads on black seams, lime glints
B_LIT = [".111.", "13311", "13111", ".1111", "..11."]
B_MID = [".111.", "11111", "11111", ".111.", "....."]
B_SHD = ["....", ".11.", "111.", ".1..", "...."]


# --------------------------------------------------------------------------- fronts

def flower5(s, c, cx, cy, R, sx=0.8, rot=-70, tones=(2, 3, 3), line="dark"):
    """Five round petals overlapping in a spiral, the face squashed sideways
    (sx) for the 3/4 turn. Returns the centre ellipse mask."""
    for k in range(5):
        a = np.radians(rot + 72 * k)
        px_, py_ = cx + np.cos(a) * 0.52 * R * sx, cy + np.sin(a) * 0.52 * R
        m = c.ellipse(px_, py_, 0.50 * R * (0.75 + 0.25 * sx), 0.46 * R, np.degrees(a))
        s.add(m, tones=tones, shade=(2, 2), close=1, line=line if k else "black")
    return c.ellipse(cx - 0.5, cy, 0.30 * R * sx, 0.30 * R)


def leaf_arm(s, c, p0, p1, w, bend=0.0, tones=(1, 1, 1), vein=2):
    """One big toothed leaflet as an arm, with a lighter midrib."""
    m = leaflet(c, p0, p1, w, bend=bend)
    s.add(m, tones=tones, flat=True, line="black")
    return (p0, p1, vein)


def draw_vein(s, p0, p1, tone, over=(1,), t0=0.15, t1=0.8):
    for k in range(40):
        t = t0 + (t1 - t0) * k / 39
        x, y = int(p0[0] + (p1[0] - p0[0]) * t), int(p0[1] + (p1[1] - p0[1]) * t)
        if s.t[y, x] in over:
            s.px([(x, y)], tone)


def blossom_front(fr=0):
    """COILED. The flower turned 3/4 at the foe on an S of thorny cane; the
    cane's tail flicks up behind; a toothed leaf raised like a hand."""
    b = fr
    s = Sprite(56, 56, BLOSSOM)
    c = s.c
    cx, cy = 18, 24 + b
    tail_p = spline([(35, 50), (43, 46), (47, 39), (46, 32 - b), (41, 31 - b)])
    tail = cane_mask(c, tail_p, 4.0, 2.6, every=8, size=4.0, start=0.15, end=0.8, side=-1)
    s.add(tail, tones=(1, 1, 2), flat=True, prune=False)
    veins = [leaf_arm(s, c, (36, 39), (46, 29 - b), 8, bend=-1.0)]
    body_p = spline([(33, 55.6), (36, 48), (33, 39), (27, 33), (22, 29 + b)])
    body = cane_mask(c, body_p, 5.0, 3.8, every=9, size=5.0, start=0.15, end=0.75, side=1)
    s.add(body, tones=(1, 1, 2), shade=(2, 0), prune=False)
    foot = c.leaf((32, 54), (23, 55.5), 5, power=0.6) | c.leaf((34, 54), (43, 55.5), 5, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    centre = flower5(s, c, cx, cy, 13.5, sx=0.82, rot=-62)
    veins.append(leaf_arm(s, c, (29, 38), (8, 33 + b), 10, bend=1.5))
    s.render()
    for p0, p1, v in veins:
        draw_vein(s, p0, p1, v)
    # the centre: a plum knot of pistils (the berry-to-be), stamens round it
    s.paint(centre, 1)
    for x, y in ((-2, -2), (0, -2), (-3, 0), (-1, 0), (1, 0), (-2, 2), (0, 2)):
        s.px([(int(cx) + x, int(cy) + y)], 2)
    s.px([(int(cx) - 3, int(cy) - 2), (int(cx) - 2, int(cy) - 3)], 3)
    for k in range(7):
        a = 2 * np.pi * k / 7 + 0.4
        x, y = int(round(cx - 0.5 + np.cos(a) * 5.0 * 0.82)), int(round(cy + np.sin(a) * 5.0))
        dx, dy = (1 if np.cos(a) > 0.38 else -1 if np.cos(a) < -0.38 else 0), (1 if np.sin(a) > 0.38 else -1 if np.sin(a) < -0.38 else 0)
        s.px([(x, y), (x + dx, y + dy)], 1)
    fk.contact(s, 25, 30)
    s.clean()
    return fk.finish(s, to=None)


def berry_front(fr=0):
    """LUNGING. The red berry is a head thrust low at the foe; the cane arches
    up behind it into a hooked scorpion tail; one leaf-hand forward, one up."""
    b = fr
    s = Sprite(56, 56, BERRY)
    c = s.c
    foot = c.leaf((35, 54), (25, 55.5), 6, power=0.6) | c.leaf((37, 54), (48, 55.5), 6, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 9 + 2.0 * b, 36, 55)
    b = 0
    bx, by, brx, bry = 18, 32, 11.0, 11.5
    tail_p = spline([(37, 46), (45, 38), (47, 25), (42, 14 + b), (33, 10 + b), (25, 12 + b), (22, 17 + b)])
    tail = cane_mask(c, tail_p, 6.0, 3.0, every=9, size=4.4, start=0.12, end=0.85, side=-1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    s.add(trifoliate(c, (42, 38), -20, 12, 7, spread=40), tones=(1, 1, 2), shade=(1, 1), close=1)
    body_p = spline([(36, 56.5), (39, 46), (34, 37), (26, 29)])
    body = cane_mask(c, body_p, 7.0, 4.6, every=10, size=4.0, start=0.2, end=0.8, side=1)
    s.add(body, tones=(1, 1, 1), flat=True, prune=False)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    # sepals: a reflexed star at the stalk end (top-right of the berry)
    s.add(star(c, 25, 23 + b, 6, 2.6, 9.0, sx=1.0, sy=0.7, rot=-20), tones=(1, 1, 2), shade=(1, 1))
    s.add(trifoliate(c, (32, 43), 205, 16, 8, spread=26, bend=1.2), tones=(1, 1, 1), flat=True)
    s.render()
    drupes(s, *fk.m(s, bx, by), brx, bry, glints=2)
    fk.contact(s, 26, 33)
    s.clean()
    return fk.finish(s)


def black_front(fr=0):
    """LOOMING. A mace of three black berries overhanging the foe, a thick
    cane torso, the tail a whip curled right over the top; green leaf-hands
    spread wide."""
    b = fr
    s = Sprite(56, 56, BLACK)
    c = s.c
    foot = c.leaf((37, 54), (26, 55.5), 7, power=0.6) | c.leaf((39, 54), (51, 55.5), 7, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 7 + 1.5 * b, 38, 55)
    b = 0
    tail_p = spline([(40, 44), (49, 34), (53, 19), (48, 6 + b), (37, 1 + b), (28, 3 + b), (25, 9 + b)])
    tail = cane_mask(c, tail_p, 7.0, 3.4, every=8, size=4.8, start=0.08, end=0.88, side=-1)
    s.add(tail, tones=(0, 1, 1), shade=(2, 0), prune=False)
    s.add(trifoliate(c, (44, 36), -25, 13, 8, spread=40), tones=(1, 2, 2), shade=(2, 2), close=1)
    body_p = spline([(38, 56.5), (42, 45), (37, 35), (29, 28)])
    body = cane_mask(c, body_p, 8.0, 5.4, every=10, size=4.4, start=0.2, end=0.8, side=1)
    s.add(body, tones=(0, 1, 1), shade=(2, 0), prune=False)
    berries = [(30, 30 + b, 7.5, 8.0), (14, 25 + b, 11.0, 11.5), (21, 40 + b, 9.0, 8.0)]
    for bx, by, rx, ry in berries:
        s.add(berry_mask(c, bx, by, rx, ry), tones=(0, 0, 0), flat=True)
    s.add(star(c, 18, 14 + b, 6, 2.6, 9.0, sx=1.1, sy=0.6, rot=-30), tones=(1, 2, 3), shade=(1, 1))
    s.add(trifoliate(c, (33, 46), 200, 19, 9, spread=26, bend=1.3), tones=(1, 2, 3), shade=(2, 2), close=1,
          band=(1, 2))
    s.render()
    for bx, by, rx, ry in berries:
        drupes(s, *fk.m(s, bx, by), rx, ry, glints=2 if rx > 10 else 1, stamps=(B_LIT, B_MID, B_SHD),
               inside=berry_mask(c, bx, by, rx, ry))
    fk.contact(s, 28, 35)
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- backs

def blossom_back():
    """From behind and above: the petal backs (pink-shaded, white rims) round
    a big plum star of pointed sepals; the thorny cane runs up into it; the
    tail flicks up on the right with a leaf raised beside it."""
    s = Sprite(48, 48, BLOSSOM, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.18, 24, 30)
    cx, cy = 22, 22
    tail_p = spline([(30, 48), (40, 40), (44, 28), (40, 22)])
    s.add(cane_mask(c, tail_p, 4.4, 3.0, every=9, size=3.6, start=0.2, end=0.8, side=1),
          tones=(1, 1, 2), shade=(1, 1), prune=False)
    s.add(trifoliate(c, (34, 34), -40, 13, 7, spread=38), tones=(1, 1, 2), shade=(1, 1), close=1)
    for k in (2, 3, 1, 4, 0):
        a = np.radians(-70 + 72 * k)
        p0 = (cx + np.cos(a) * 2, cy + np.sin(a) * 1.7)
        p1 = (cx + np.cos(a) * 19, cy + np.sin(a) * 16.5)
        s.add(c.leaf(p0, p1, 17, power=0.55, tip=0.45, base=1.4), tones=(2, 2, 3), shade=(3, 3),
              band=(1, 2), line="black")
    for k in range(5):
        a = np.radians(-70 + 36 + 72 * k)
        p1 = (cx + np.cos(a) * 15, cy + np.sin(a) * 13.5)
        s.add(c.leaf((cx, cy), p1, 6.5, power=0.7, tip=1.8), tones=(1, 1, 2), shade=(1, 1), band=(1, 2), line="black")
    s.add(c.circle(cx, cy, 3.6), tones=(1, 1, 2), shade=(1, 1), line="black")
    cane_p = spline([(18, 48), (18, 36), (cx, cy + 1)])
    s.add(cane_mask(c, cane_p, 5.0, 4.0, every=9, size=3.4, start=0.15, end=0.7), tones=(1, 1, 2),
          shade=(2, 2), prune=False)
    s.render()
    s.clean()
    return fk.finish(s, to=None)


def berry_back():
    """The berry from behind and above: the sepal star on its crown, the tail
    hooking over toward the foe at the top right."""
    s = Sprite(48, 48, BERRY, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.12, 24, 32)
    bx, by, brx, bry = 21, 31, 15.5, 15
    tail_p = spline([(34, 48), (42, 36), (45, 20), (41, 8), (33, 5), (29, 9)])
    s.add(cane_mask(c, tail_p, 6.0, 3.4, every=9, size=4.0, start=0.1, end=0.85, side=1),
          tones=(1, 1, 2), shade=(2, 0), band=(1, 2), prune=False)
    s.add(trifoliate(c, (38, 30), -15, 11, 7, spread=40), tones=(1, 1, 2), shade=(1, 1), close=1)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    s.add(star(c, 23, 19, 6, 3.4, 11.5, sx=1.1, sy=0.6, rot=-60), tones=(1, 1, 2), shade=(1, 1))
    s.render()
    drupes(s, *fk.m(s, bx, by), fk.ms(s, brx), fk.ms(s, bry), glints=2)
    s.clean()
    return fk.finish(s)


def black_back():
    """The cluster from behind: three black berries and the whip of a tail
    curling over to the top right, green leaves spread under them."""
    s = Sprite(48, 48, BLACK, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.03, 24, 30)
    tail_p = spline([(36, 48), (44, 36), (47, 20), (43, 7), (34, 3), (28, 7)])
    s.add(cane_mask(c, tail_p, 7.0, 3.6, every=8, size=4.4, start=0.1, end=0.88, side=1),
          tones=(0, 1, 1), shade=(2, 0), prune=False)
    s.add(trifoliate(c, (12, 38), 200, 14, 8, spread=38), tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.add(trifoliate(c, (34, 36), -10, 14, 8, spread=38), tones=(1, 2, 2), shade=(2, 2), close=1)
    berries = [(31, 27, 8.5, 9.0), (17, 24, 12.0, 12.5), (24, 40, 11.0, 9.0)]
    for bx, by, rx, ry in berries:
        s.add(berry_mask(c, bx, by, rx, ry), tones=(0, 0, 0), flat=True)
    s.add(star(c, 20, 13, 6, 3.0, 10.0, sx=1.1, sy=0.6, rot=-30), tones=(1, 2, 3), shade=(1, 1))
    s.render()
    for bx, by, rx, ry in berries:
        drupes(s, *fk.m(s, bx, by), fk.ms(s, rx), fk.ms(s, ry), glints=2 if rx > 10 else 1,
               stamps=(B_LIT, B_MID, B_SHD), inside=berry_mask(c, bx, by, rx, ry))
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- icons

def blossom_icon(f=0):
    s = Sprite(16, 16, BLOSSOM)
    c = s.c
    d = -f
    s.add(c.leaf((10, 14.5), (5, 15.6), 3.6, power=0.6) | c.leaf((11, 14.5), (15, 15.6), 3.6, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.stroke(spline([(11, 15.6), (12, 12), (10, 9.5), (8, 8)]), 2.6, 2.2) |
          c.stroke(spline([(11.5, 12.5), (14.5, 10.5), (14, 7.5)]), 2.0, 1.8), tones=(1, 1, 1), flat=True, prune=False)
    for k in range(5):
        a = np.radians(-62 + 72 * k)
        s.add(c.ellipse(6.5 + d + np.cos(a) * 2.6, 6.5 + np.sin(a) * 3.0, 2.8, 2.6), tones=(2, 3, 3),
              shade=(1, 1), line="black" if k == 0 else "dark", prune=False)
    s.render()
    s.rows(5 + d, 5, ["11", "11"])
    return s


def berry_icon(f=0):
    s = Sprite(16, 16, BERRY)
    c = s.c
    d = -f
    s.add(c.leaf((10, 14.5), (5, 15.6), 3.6, power=0.6) | c.leaf((11, 14.5), (15, 15.6), 3.6, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.stroke(spline([(11, 15.6), (13, 11), (13.5, 5), (11, 2.2), (8.5, 3.5)]), 2.6, 2.0),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.ellipse(6.5 + d, 9.5, 5.0, 5.0), tones=(1, 1, 1), flat=True, prune=False)
    s.render()
    s.rows(3 + d, 6, ["32.2.", "22.22", ".22.2", "2.2.1", ".2.1."])
    return s


def black_icon(f=0):
    s = Sprite(16, 16, BLACK)
    c = s.c
    d = -f
    s.add(c.leaf((10, 14.5), (5, 15.6), 3.6, power=0.6) | c.leaf((11, 14.5), (15, 15.6), 3.6, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.stroke(spline([(11, 15.6), (13.5, 10), (14, 4), (11, 1.2), (7.5, 2.5)]), 2.8, 2.0),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.leaf((11, 11), (15.5, 8.5), 3.4), tones=(2, 2, 2), flat=True, prune=False)
    s.add(c.ellipse(9 + d, 8.5, 3.4, 3.4) | c.ellipse(5.5 + d, 8, 4.6, 4.4) | c.ellipse(7.5 + d, 12, 3.6, 3.0),
          tones=(0, 0, 0), flat=True, prune=False)
    s.render()
    s.rows(2 + d, 5, ["311.11", "11.11.", ".11.11", "11.11.", ".1.11."])
    return s


ICON_FN = {"bramble_blossom": blossom_icon, "bramble_berry": berry_icon, "blackberry": black_icon}

# hand-pixelled (fill-only; fk.hand_icon adds the outline ring). Drupelets
# are a deliberate 2-colour bead pattern.
HAND = {
    "bramble_berry": [
        "................",
        "................",
        "........111.....",
        ".......1...1....",
        ".......1....1...",
        "...2121.....1...",
        "..321212....1...",
        ".23212121...1...",
        ".12121212..11...",
        ".21212121.11....",
        "..2121211111....",
        "...121111.......",
        "......11........",
        "......11........",
        "...1111.1111....",
        "................"],
    "blackberry": [
        "........1111....",
        ".......1....1...",
        ".......1.....1..",
        "..111.111....1..",
        ".1311111131..1..",
        "1311101131111.1.",
        "1110111011131.1.",
        "11101110111112..",
        ".110111011112222",
        "..13111011112222",
        "..1111111.1.222.",
        "...11101.1......",
        ".....1111.......",
        ".....1.11.......",
        "..1111..1111....",
        "................"]
}


def make(id_):
    f, b = {
        "bramble_blossom": (blossom_front, blossom_back),
        "bramble_berry": (berry_front, berry_back),
        "blackberry": (black_front, black_back),
    }[id_]
    fr = fk.register([f(0), f(1)])
    pal = {"bramble_blossom": BLOSSOM, "bramble_berry": BERRY, "blackberry": BLACK}[id_]
    if id_ in HAND:
        i1, i2 = fk.hand_icon(HAND[id_], pal)
    else:
        i1, i2 = fk.icon_frames(ICON_FN[id_], None)
    return {"front": fr[0], "front__2": fr[1], "back": b(), "icon": i1, "icon__2": i2}
