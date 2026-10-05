"""Crystal rule, bramble line: bramble_blossom -> bramble_berry -> blackberry.

A redraw of tools/art/species_a/bramble.py under the Crystal rule
(docs/CREATURES.md, docs/ROLLOUT.md). Motif: the hooked, thorny cane worn as
a scorpion TAIL that grows with each stage (a flick, a raised hook, a whip
over the head). Accent: the plum cane, index 1 in all three.

  bramble_blossom  index 1 plum (cane, leaves, the knot)  index 2 petal pink
  bramble_berry    index 1 plum-wine (cane, leaves, drupelet shade)
                   index 2 berry red
  blackberry       index 1 plum (cane, drupelets)         index 2 leaf green
  index 0 #181818 outline, the drupelets' seams, the blackberry's body;
  index 3 #f8f8f8 petal light, drupelet glints, rims.

Poses (docs/CREATURES.md) kept from the base art:
  bramble_blossom  COILED   the flower on an S of thorny cane, the tail flicked up.
  bramble_berry    LUNGING  the red berry thrust low, the cane arched into a hook.
  blackberry       LOOMING  a mace of black berries under a whip of a tail.

Entrance animations (only the tail moves; the body is pixel-identical):
  bramble_blossom  the tail coils down, then FLICKS up and quivers.
  bramble_berry    the scorpion tail cocks back (held), STRIKES over the head
                   at the foe, recoils.
  blackberry       the whip winds back, CRACKS forward over the berries,
                   rebounds and settles.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/build.py bramble        write the base bundles
  $PY tools/art/crystal/bramble.py --preview    scratch preview only
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _arta_draw import (Sprite, spline, star, rot, rim, fourconnect, finish, grow, crescent,  # noqa: E402
                        contact, frames_from, register, moving_boxes, icon, hop, squash, preview,
                        pose, m, ms)

TOOL = "tools/art/crystal/bramble.py"
IDS = ["bramble_blossom", "bramble_berry", "blackberry"]

PAL = {  # (index 1, index 2)
    "bramble_blossom": ("#883060", "#e8a0c0"),
    "bramble_berry": ("#682048", "#d83840"),
    "blackberry": ("#482048", "#509038"),
}
# Rubus 'Fall Gold' (docs/SPORTS.md): golden-amber fruit on yellow-green canes.
SPORT = {
    "bramble_blossom": ("#486038", "#d8c8a8"),
    "bramble_berry": ("#985818", "#e8b030"),
    "blackberry": ("#805018", "#88a838"),
}


def pal3(i):
    return [*PAL[i], WHITE]


def cane_mask(c, path, w0, w1, every=7, size=3.8, start=0.1, end=0.9, side=1):
    """A thick cane with hooked thorns sticking ~size px past its edge."""
    mk = c.stroke(path, w0, w1)
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
        mk |= c.poly([base - d * 3.6, base + d * 2.8, tip])
    return mk


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
    """An ellipse with drupelet bumps all round its rim."""
    mk = c.ellipse(cx, cy, rx, ry)
    n = max(8, int(2 * np.pi * np.sqrt((rx * rx + ry * ry) / 2) / 5.2))
    for k in range(n):
        a = 2 * np.pi * (k + 0.5) / n
        mk |= c.circle(cx + np.cos(a) * (rx - 0.6), cy + np.sin(a) * (ry - 0.6), r * 0.9)
    return mk


# red drupelets: bead stamps over the plum fill; glints white
LIT = [".222.", "23322", "23222", ".2221", "..11."]
MID = [".222.", "22222", "22221", ".2211", "..11."]
SHD = [".211.", "22111", ".1111", "....."]
# black drupelets: plum beads on black seams, white glints
B_LIT = [".111.", "13311", "13111", ".1111", "..11."]
B_MID = [".111.", "11111", "11111", ".111.", "....."]
B_SHD = ["....", ".11.", "111.", ".1..", "...."]


def drupes(s, cx, cy, rx, ry, glints=2, stamps=None, dx=6.0, dy=5.0, inside=None):
    """Drupelet stamps over the berry's fill: lit ones top-left, shaded ones
    bottom-right, glints on the few nearest the light."""
    if inside is not None:
        from scipy import ndimage
        inside = ndimage.binary_erosion(inside)
    lit, mid, shd = stamps or (LIT, MID, SHD)
    # never paint over the silhouette's outline
    edge = (s.t == 0) & grow(s.t < 0, 1)
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
                if not (0 <= xx < s.w and 0 <= yy < s.h) or edge[yy, xx]:
                    continue
                if (inside is not None and inside[yy, xx] and s.t[yy, xx] >= 0) or (inside is None and s.t[yy, xx] > 0):
                    s.t[yy, xx] = int(ch)
                    s.protect[yy, xx] = True


def leaflet(c, p0, p1, w, bend=0.0):
    return c.leaf(p0, p1, w, bend=bend, power=0.6, teeth=6, tooth=0.32, tip=1.3)


def trifoliate(c, p0, ang, L, w, spread=38, bend=1.0):
    """Three toothed leaflets fanned from one point (an open hand)."""
    mk = c.empty()
    for da in (-spread, 0, spread):
        a = np.radians(ang + da)
        ll = L * (1.0 if da == 0 else 0.78)
        p1 = (p0[0] + np.cos(a) * ll, p0[1] + np.sin(a) * ll)
        mk |= leaflet(c, p0, p1, w * (1.0 if da == 0 else 0.85), bend=bend * np.sign(da or 1))
    return mk


def flower5(s, c, cx, cy, R, sx=0.8, rot_=-70):
    """Five round petals overlapping in a spiral, squashed for the 3/4 turn."""
    pets = c.empty()
    for k in range(5):
        a = np.radians(rot_ + 72 * k)
        px_, py_ = cx + np.cos(a) * 0.52 * R * sx, cy + np.sin(a) * 0.52 * R
        pm = c.ellipse(px_, py_, 0.50 * R * (0.75 + 0.25 * sx), 0.46 * R, np.degrees(a))
        pets |= pm
        s.add(pm, tones=(1, 2, 2), shade=(2, 2), close=1, line="black")
    return pets, c.ellipse(cx - 0.5, cy, 0.30 * R * sx, 0.30 * R)


def vein(s, p0, p1, tone, over=(1,), t0=0.15, t1=0.8):
    for k in range(40):
        t = t0 + (t1 - t0) * k / 39
        x, y = int(p0[0] + (p1[0] - p0[0]) * t), int(p0[1] + (p1[1] - p0[1]) * t)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def tail_path(pts, ang, pivot_i=1):
    """Swing the tail's control points after `pivot_i` about that point
    (progressively: the tip swings the most)."""
    pv = pts[pivot_i]
    out = list(pts[:pivot_i + 1])
    n = len(pts) - pivot_i - 1
    for j, p in enumerate(pts[pivot_i + 1:], 1):
        out.append(rot([p], ang * j / n, pv)[0])
    return spline(out)


# --------------------------------------------------------------- blossom
def blossom_front(flick=0.0, mask=False):
    """flick: degrees the tail swings (+ = clockwise: up and over, - = down)."""
    s = Sprite(56, 56, pal3("bramble_blossom"))
    c = s.c
    cx, cy = 18, 24
    tail_p = tail_path([(35, 50), (43, 46), (47, 39), (46, 32), (41, 31)], -flick)
    tail = cane_mask(c, tail_p, 4.0, 2.6, every=8, size=4.0, start=0.15, end=0.8, side=-1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    rl0, rl1 = (36, 39), (46, 29)
    rleaf = leaflet(c, rl0, rl1, 8, bend=-1.0)
    s.add(rleaf, tones=(1, 1, 1), flat=True, line="black")
    body_p = spline([(33, 55.6), (36, 48), (33, 39), (27, 33), (22, 29)])
    body = cane_mask(c, body_p, 5.0, 3.8, every=9, size=5.0, start=0.15, end=0.75, side=1)
    s.add(body, tones=(1, 1, 1), flat=True, prune=False)
    foot = c.leaf((32, 54), (23, 55.5), 5, power=0.6) | c.leaf((34, 54), (43, 55.5), 5, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    pets, centre = flower5(s, c, cx, cy, 13.5, sx=0.82, rot_=-62)
    ll0, ll1 = (29, 38), (8, 33)
    lleaf = leaflet(c, ll0, ll1, 10, bend=1.5)
    s.add(lleaf, tones=(1, 1, 1), flat=True, line="black")
    s.render()
    vein(s, ll0, ll1, 2)
    vein(s, rl0, rl1, 2)
    # petal light: a white crescent on each petal's lit edge (it's a white-pink rose)
    rim(s, pets & (c.X + c.Y < cx + cy + 8))
    s.paint(crescent(pets, 1, 3, c.X + c.Y < cx + cy - 6), 3, only=(2,))
    rim(s, lleaf & (c.Y < 35), body=(1,))
    # the centre: a plum knot of pistils, a ring of stamens
    s.paint(centre, 1)
    for x, y in ((-2, -2), (0, -2), (-3, 0), (-1, 0), (1, 0), (-2, 2), (0, 2)):
        s.px([(int(cx) + x, int(cy) + y)], 2)
    s.px([(int(cx) - 3, int(cy) - 2), (int(cx) - 2, int(cy) - 3)], 3)
    for k in range(7):
        a = 2 * np.pi * k / 7 + 0.4
        x, y = int(round(cx - 0.5 + np.cos(a) * 5.0 * 0.82)), int(round(cy + np.sin(a) * 5.0))
        dx = 1 if np.cos(a) > 0.38 else -1 if np.cos(a) < -0.38 else 0
        dy = 1 if np.sin(a) > 0.38 else -1 if np.sin(a) < -0.38 else 0
        s.px([(x, y), (x + dx, y + dy)], 1)
    contact(s, 25, 30)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, tail
    return img


BLOSSOM_POSES = [(0,), (-10,), (-18,), (16,), (8,)]
BLOSSOM_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 5], [4, 4], [3, 4], [4, 6], [0, 1]],
                "idle": [[0, 120], [4, 10]]}


def blossom_back():
    """From behind and above: the petal backs round a plum star of sepals;
    the thorny cane runs up into it; the tail flicks up on the right."""
    s = Sprite(48, 48, pal3("bramble_blossom"), crop_bottom=True)
    c = s.c
    pose(s, 1.18, 0, 24, 30)
    cx, cy = 22, 22
    tail_p = spline([(30, 48), (40, 40), (44, 28), (40, 22)])
    s.add(cane_mask(c, tail_p, 4.4, 3.0, every=9, size=3.6, start=0.2, end=0.8, side=1),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(trifoliate(c, (34, 34), -40, 13, 7, spread=38), tones=(1, 1, 1), flat=True)
    pets = c.empty()
    for k in (2, 3, 1, 4, 0):
        a = np.radians(-70 + 72 * k)
        p0 = (cx + np.cos(a) * 2, cy + np.sin(a) * 1.7)
        p1 = (cx + np.cos(a) * 19, cy + np.sin(a) * 16.5)
        pm = c.leaf(p0, p1, 17, power=0.55, tip=0.45, base=1.4)
        pets |= pm
        s.add(pm, tones=(1, 2, 2), shade=(3, 3), line="black")
    for k in range(5):
        a = np.radians(-70 + 36 + 72 * k)
        p1 = (cx + np.cos(a) * 15, cy + np.sin(a) * 13.5)
        s.add(c.leaf((cx, cy), p1, 6.5, power=0.7, tip=1.8), tones=(1, 1, 1), flat=True, line="black")
    s.add(c.circle(cx, cy, 3.6), tones=(1, 1, 1), flat=True, line="black")
    cane_p = spline([(18, 48), (18, 36), (cx, cy + 1)])
    s.add(cane_mask(c, cane_p, 5.0, 4.0, every=9, size=3.4, start=0.15, end=0.7), tones=(1, 1, 1),
          flat=True, prune=False)
    s.render()
    rim(s, pets & (c.X + c.Y < cx + cy + 10))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- berry
def berry_front(cock=0.0, mask=False):
    """cock: degrees the scorpion tail swings (+ = cocked back, - = struck)."""
    s = Sprite(56, 56, pal3("bramble_berry"))
    c = s.c
    foot = c.leaf((35, 54), (25, 55.5), 6, power=0.6) | c.leaf((37, 54), (48, 55.5), 6, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    pose(s, 1.0, 9, 36, 55)
    bx, by, brx, bry = 18, 32, 11.0, 11.5
    tail_p = tail_path([(37, 46), (45, 38), (47, 25), (42, 14), (33, 10), (25, 12), (22, 17)], cock, 2)
    tail = cane_mask(c, tail_p, 6.0, 3.0, every=9, size=4.4, start=0.12, end=0.85, side=-1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    tri_r = trifoliate(c, (42, 38), -20, 12, 7, spread=40)
    s.add(tri_r, tones=(1, 1, 1), flat=True)
    body_p = spline([(36, 56.5), (39, 46), (34, 37), (26, 29)])
    body = cane_mask(c, body_p, 7.0, 4.6, every=10, size=4.0, start=0.2, end=0.8, side=1)
    s.add(body, tones=(1, 1, 1), flat=True, prune=False)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    s.add(star(c, 25, 23, 6, 2.6, 9.0, sx=1.0, sy=0.7, rot=-20), tones=(1, 1, 1), flat=True)
    tri_l = trifoliate(c, (32, 43), 205, 16, 8, spread=26, bend=1.2)
    s.add(tri_l, tones=(1, 1, 1), flat=True)
    s.render()
    drupes(s, *m(s, bx, by), brx, bry, glints=5)
    bm = berry_mask(c, bx, by, brx, bry)
    s.paint(crescent(bm, 1, 1, c.X + c.Y < bx + by - 3), 3, only=(1, 2))
    rim(s, tail & (c.X + c.Y < 60), body=(1,))
    rim(s, tri_l & (c.X < 24), body=(1,))
    contact(s, 26, 33)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, tail
    return img


BERRY_POSES = [(0,), (8,), (16,), (-14,), (-6,)]
BERRY_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 6], [4, 5], [3, 4], [0, 1]],
              "idle": [[0, 110], [1, 10]]}


def berry_back():
    """The berry from behind and above: the sepal star on its crown, the tail
    hooking over toward the foe at the top right."""
    s = Sprite(48, 48, pal3("bramble_berry"), crop_bottom=True)
    c = s.c
    pose(s, 1.12, 0, 24, 32)
    bx, by, brx, bry = 21, 31, 15.5, 15
    tail_p = spline([(34, 48), (42, 36), (45, 20), (41, 8), (33, 5), (29, 9)])
    tail = cane_mask(c, tail_p, 6.0, 3.4, every=9, size=4.0, start=0.1, end=0.85, side=1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    s.add(trifoliate(c, (38, 30), -15, 11, 7, spread=40), tones=(1, 1, 1), flat=True)
    s.add(berry_mask(c, bx, by, brx, bry), tones=(1, 1, 1), flat=True)
    s.add(star(c, 23, 19, 6, 3.4, 11.5, sx=1.1, sy=0.6, rot=-60), tones=(1, 1, 1), flat=True)
    s.render()
    drupes(s, *m(s, bx, by), ms(s, brx), ms(s, bry), glints=3)
    bm = berry_mask(c, bx, by, brx, bry)
    s.paint(crescent(bm, 1, 1, c.X + c.Y < bx + by - 3), 3, only=(1, 2))
    rim(s, tail & (c.X + c.Y < 50), body=(1,))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- blackberry
def black_front(crack=0.0, mask=False):
    """crack: degrees the whip swings (+ = wound back, - = cracked forward)."""
    s = Sprite(56, 56, pal3("blackberry"))
    c = s.c
    foot = c.leaf((37, 54), (26, 55.5), 7, power=0.6) | c.leaf((39, 54), (51, 55.5), 7, power=0.6)
    s.add(foot, tones=(1, 1, 1), flat=True)
    pose(s, 1.0, 7, 38, 55)
    tail_p = tail_path([(40, 44), (49, 34), (53, 19), (48, 6), (37, 1), (28, 3), (25, 9)], crack, 2)
    tail = cane_mask(c, tail_p, 7.0, 3.4, every=8, size=4.8, start=0.08, end=0.88, side=-1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    tri_r = trifoliate(c, (44, 36), -25, 13, 8, spread=40)
    s.add(tri_r, tones=(1, 2, 2), shade=(2, 2), close=1)
    body_p = spline([(38, 56.5), (42, 45), (37, 35), (29, 28)])
    body = cane_mask(c, body_p, 8.0, 5.4, every=10, size=4.4, start=0.2, end=0.8, side=1)
    s.add(body, tones=(1, 1, 1), flat=True, prune=False)
    berries = [(30, 30, 7.5, 8.0), (14, 25, 11.0, 11.5), (21, 40, 9.0, 8.0)]
    for bx, by, rx, ry in berries:
        s.add(berry_mask(c, bx, by, rx, ry), tones=(0, 0, 0), flat=True)
    cal = star(c, 18, 14, 6, 2.6, 9.0, sx=1.1, sy=0.6, rot=-30)
    s.add(cal, tones=(1, 2, 2), shade=(1, 1))
    tri_l = trifoliate(c, (33, 46), 200, 19, 9, spread=26, bend=1.3)
    s.add(tri_l, tones=(1, 2, 2), shade=(2, 2), close=1)
    s.render()
    for bx, by, rx, ry in berries:
        drupes(s, *m(s, bx, by), rx, ry, glints=2 if rx > 10 else 1, stamps=(B_LIT, B_MID, B_SHD),
               inside=berry_mask(c, bx, by, rx, ry))
    inner = grow(s.t < 0, 1) == 0
    for bx, by, rx, ry in berries[1:]:
        bm = berry_mask(c, bx, by, rx, ry)
        s.paint(crescent(bm, 1, 1, (c.X + c.Y < bx + by - 2) & inner), 3, only=(0, 1))
    rim(s, tri_l & (c.X + c.Y < 60))
    rim(s, tri_r & (c.Y < 34))
    rim(s, tail & (c.X + c.Y < 56), body=(1,))
    contact(s, 28, 35)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, tail
    return img


BLACK_POSES = [(0,), (8,), (14,), (-12,), (-5,)]
BLACK_ANIM = {"intro": [[0, 6], [1, 8], [2, 14], [3, 5], [4, 6], [3, 4], [4, 4], [0, 1]],
              "idle": [[0, 130], [1, 10]]}


def black_back():
    """The cluster from behind: three black berries and the whip curling over
    to the top right, green leaves spread under them."""
    s = Sprite(48, 48, pal3("blackberry"), crop_bottom=True)
    c = s.c
    pose(s, 1.03, 0, 24, 30)
    tail_p = spline([(36, 48), (44, 36), (47, 20), (43, 7), (34, 3), (28, 7)])
    tail = cane_mask(c, tail_p, 7.0, 3.6, every=8, size=4.4, start=0.1, end=0.88, side=1)
    s.add(tail, tones=(1, 1, 1), flat=True, prune=False)
    tl = trifoliate(c, (12, 38), 200, 14, 8, spread=38)
    s.add(tl, tones=(1, 2, 2), shade=(2, 2), close=1)
    s.add(trifoliate(c, (34, 36), -10, 14, 8, spread=38), tones=(1, 2, 2), shade=(2, 2), close=1)
    berries = [(31, 27, 8.5, 9.0), (17, 24, 12.0, 12.5), (24, 40, 11.0, 9.0)]
    for bx, by, rx, ry in berries:
        s.add(berry_mask(c, bx, by, rx, ry), tones=(0, 0, 0), flat=True)
    s.add(star(c, 20, 13, 6, 3.0, 10.0, sx=1.1, sy=0.6, rot=-30), tones=(1, 2, 2), shade=(1, 1))
    s.render()
    for bx, by, rx, ry in berries:
        drupes(s, *m(s, bx, by), ms(s, rx), ms(s, ry), glints=2 if rx > 10 else 1,
               stamps=(B_LIT, B_MID, B_SHD), inside=berry_mask(c, bx, by, rx, ry))
    bm = berry_mask(c, *berries[1])
    inner = grow(s.t < 0, 1) == 0
    s.paint(crescent(bm, 1, 1, (c.X + c.Y < berries[1][0] + berries[1][1] - 2) & inner), 3, only=(0, 1))
    rim(s, tl & (c.Y < 40))
    rim(s, tail & (c.X + c.Y < 50), body=(1,))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- icons
def auto_rows(rows):
    """Fill-only ASCII (1-3 fills, explicit 0 seams, '.' clear) -> with a 1px
    4-connected black ring round the silhouette."""
    h = len(rows)
    g = [list(r.ljust(16, ".")) for r in rows]
    out = [r[:] for r in g]
    for y in range(h):
        for x in range(16):
            if g[y][x] != ".":
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < 16 and 0 <= yy < h and g[yy][xx] in "123":
                    out[y][x] = "0"
                    break
    return ["".join(r) for r in out]


def blossom_icon():
    s = Sprite(16, 16, pal3("bramble_blossom"))
    c = s.c
    s.add(c.leaf((10, 14.5), (5, 15.6), 3.6, power=0.6) | c.leaf((11, 14.5), (15, 15.6), 3.6, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.stroke(spline([(11, 15.6), (12, 12), (10, 9.5), (8, 8)]), 2.6, 2.2) |
          c.stroke(spline([(11.5, 12.5), (14.5, 10.5), (14, 7.5)]), 2.0, 1.8), tones=(1, 1, 1), flat=True,
          prune=False)
    for k in range(5):
        a = np.radians(-62 + 72 * k)
        s.add(c.ellipse(6.5 + np.cos(a) * 2.6, 7.5 + np.sin(a) * 3.0, 2.8, 2.6), tones=(1, 2, 2),
              shade=(1, 1), line="black", prune=False)
    s.render()
    s.rows(5, 6, ["11", "11"])
    s.px([(3, 5), (4, 4), (5, 3), (3, 6), (4, 3)], 3)
    return finish(s)


HAND = {
    "bramble_berry": [
        "................",
        "................",
        "........111.....",
        ".......1...1....",
        ".......1....1...",
        "...3121.....1...",
        "..321212....1...",
        ".33212121...1...",
        ".12121212..11...",
        ".21212121.11....",
        "..3121211111....",
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
        "..13111011112232",
        "..1111111.1.222.",
        "...11101.1......",
        ".....1111.......",
        ".....1.11.......",
        "..1111..1111....",
        "................"],
}


def hand_icon(rows, squash_row=5):
    """Frame 2 squashes the FILL (one row dropped at squash_row, the rows
    above move down 1px), then both frames get their black ring."""
    rows = [(r + "." * 16)[:16] for r in rows]
    sq = ["." * 16] + rows[:squash_row] + rows[squash_row + 1:]
    return [icon(auto_rows(rows)), icon(auto_rows(sq))]


NOTES = {
    "bramble_blossom": "COILED. Intro: the thorny tail coils down (wind-up), flicks up and quivers; the flower, "
                       "cane and leaves hold. The plum cane (index 1) is the line's accent; the pink petals "
                       "take white on their lit edges, the centre is a plum knot of pistils.",
    "bramble_berry": "LUNGING. Intro: the scorpion tail cocks back and holds, strikes over the head at the foe, "
                     "recoils; the berry and the body hold. Red drupelets are beads over the plum, the "
                     "glints white.",
    "blackberry": "LOOMING. Intro: the whip winds back (held), cracks forward over the berries, rebounds and "
                  "settles; only the tail moves. The berries are black with plum drupelet beads and white "
                  "glints; the leaves are the only index-2 green.",
}
SPORT_NOTE = (" Sport: 'Fall Gold'. Rubus 'Fall Gold' (University of New Hampshire, 1967): golden-amber fruit "
              "on yellow-green canes (indexes 1-2 only).")


def make():
    out = {}
    for id_, ff, poses, bf, anim in (
        ("bramble_blossom", blossom_front, BLOSSOM_POSES, blossom_back, BLOSSOM_ANIM),
        ("bramble_berry", berry_front, BERRY_POSES, berry_back, BERRY_ANIM),
        ("blackberry", black_front, BLACK_POSES, black_back, BLACK_ANIM),
    ):
        fr = register(frames_from(lambda *p, ff=ff: ff(*p, mask=True), poses))
        if id_ in HAND:
            ic = hand_icon(HAND[id_], {"bramble_berry": 3, "blackberry": 6}[id_])
        else:
            i0 = blossom_icon()
            ic = [i0, hop(i0)]
        out[id_] = dict(front=fr, back=bf(), icon=ic, anim=anim)
    return out


def build():
    errs = 0
    for id_, d in make().items():
        probs = write_species(id_, palette=[BLACK, *PAL[id_], WHITE], sport=[BLACK, *SPORT[id_], WHITE],
                              front=d["front"], back=[d["back"]], icon=d["icon"], anim=d["anim"],
                              moving=moving_boxes(d["front"]), notes=NOTES[id_] + SPORT_NOTE, tool=TOOL)
        errs += sum(1 for lvl, _ in probs if lvl == "error")
        intro_strip(id_)
    review_sheet(IDS, HERE.parent / "review" / "crystal_bramble.png")
    return 1 if errs else 0


if __name__ == "__main__":
    if "--preview" in sys.argv:
        rows = [(i, d["front"], d["back"], d["icon"], [BLACK, *PAL[i], WHITE], [BLACK, *SPORT[i], WHITE])
                for i, d in make().items()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/bramble_preview.png"))
    else:
        sys.exit(build())
