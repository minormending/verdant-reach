"""Mint line: mint_sprig -> peppermint (frost).

Mentha x piperita: square stems (four flat faces, sharp corners), leaves in
opposite pairs, each pair turned 90 degrees to the last (decussate), ovate,
serrated, deeply veined so the blade puckers ("crinkled"); terminal spikes
of tiny flowers in whorls. Spreads by runners. Menthol feels icy: the frost
type comes from that, so the light tone is a pale frost and the lit leaf
edges read as hoarfrost; the dark is a cold teal.

mint_sprig: BRACED. A stout square-stemmed sprig planted on two leaf feet,
  the lead leaf raised across the front like a shield, a cupped tuft of
  young leaves for a head, a runner creeping off behind (the tail).
peppermint: LOOMING. Three tiers of crinkled pairs on a thick square stem;
  the lead leaf thrust out over the foe, the rear swept up; a frosted flower
  spike crowns the head, leaning in; a frost flake drifts off.
Scores (CREATURES.md section 9): mint_sprig 8 (BRACED, C-leaned 24 deg;
4: crinkle reads at 2x more than 1x); peppermint 8 (LOOMING; frosted spike
crown is the escalation; 7: shadow side light on the lead leaf).
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, dilate, erode, move, qbez, spline

PAL = ("#286078", "#50c890", "#d8f8d8")   # cold teal / mint / frost


def leaf(s, base, tip, w, bend=0.0, teeth=5, veins=3, frost=True, fat=0.42, line=0):
    """A crinkled, serrated mint leaf: midrib + paired lateral veins as dark
    grooves, frost-pale puckers between them on the lit half, a hoarfrost rim."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, power=0.7, teeth=teeth, tooth=0.30)
    pid = s.part(m, base=2, k=2, rim=1 if frost else 0, rim_tone=3, line=line)
    L = math.dist(base, tip)
    if L < 8:
        return pid
    inner = erode(m, 1)
    vein = s.line1(path[6:int(len(path) * 0.82)])
    n = len(path)
    for i in range(veins):
        t = 0.22 + 0.55 * i / max(1, veins - 1) * 0.9
        k = int(t * (n - 1))
        (x, y) = path[k]
        a, b = path[max(0, k - 2)], path[min(n - 1, k + 2)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        dx, dy = dx / d, dy / d
        nx, ny = -dy, dx
        ln = w * 0.42 * (1 - 0.35 * t)
        for sd in (1, -1):
            ex = x + (nx * sd * 0.85 + dx * 0.55) * ln
            ey = y + (ny * sd * 0.85 + dy * 0.55) * ln
            vein |= s.line1(qbez((x, y), (x + nx * sd * ln * 0.5, y + ny * sd * ln * 0.5), (ex, ey), 12))
    s.decal(vein & inner, 1, on=pid)
    # puckers: the blade bulges between the veins and catches the light (lit half)
    if w >= 8:
        Y, X = np.mgrid[0:s.h, 0:s.w]
        bulge = inner & ~dilate(vein, 1) & (s.tone == 2)
        lit = bulge & ~move(bulge, -1, -1)       # top-left edge of each bulge cell
        lit &= (X + Y) < (np.nonzero(m)[1].mean() + np.nonzero(m)[0].mean() + 2)
        s.decal(lit & erode(m, 2), 3, on=pid)
    return pid


def square_stem(s, pts, w0, w1, nodes=()):
    """Square stem: a lit face and a shadow face split by a hard corner; the
    lit corner gets a frost-pale edge line. Dark nodes where leaf pairs join."""
    path = spline(pts, 20)
    m = s.stroke(path, (w0, w1), cap=False)
    pid = s.part(m, base=2, k=0, line=0)
    n = len(path)
    right, corner = s.empty(), s.empty()
    path = [s.P(x, y) for x, y in path]
    for i, (x, y) in enumerate(path):
        w = w0 + (w1 - w0) * i / (n - 1)
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        if nx < 0:
            nx, ny = -nx, -ny
        # shadow face: the right ~45% of the width
        for f in np.linspace(0.05, 0.5, 6):
            xi, yi = int(math.floor(x + nx * w * f)), int(math.floor(y + ny * w * f))
            if 0 <= xi < s.w and 0 <= yi < s.h:
                right[yi, xi] = True
        xi, yi = int(math.floor(x - nx * w * 0.25)), int(math.floor(y - ny * w * 0.25))
        if 0 <= xi < s.w and 0 <= yi < s.h:
            corner[yi, xi] = True
    s.decal(right & m, 1, on=pid)
    s.decal(corner & m & ~right & erode(m, 1), 3, on=pid)
    for (x, y) in nodes:
        s.decal(s.ellipse(x, y, w0 * 0.75, 1.0, ang=math.radians(-0)) & m, 1, on=pid)
    return pid, path


def flake(s, x, y, big=True):
    """A frost flake: a pale cross (or dot) with a dark halo."""
    pts = [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] if big else [(x, y), (x + 1, y)]
    halo = set()
    for (a, b) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            halo.add((a + dx, b + dy))
    halo -= set(pts)
    s.px([p for p in halo if 0 <= p[0] < s.w and 0 <= p[1] < s.h and s.tone[p[1], p[0]] < 0], 0)
    s.px(pts, 3)


def spike(s, base, tip, w, whorls=5):
    """A flower spike: stacked whorls of tiny frost-pale florets on a dark
    axis, each whorl a bump in the silhouette, smaller toward the tip."""
    path = qbez(base, ((base[0] + tip[0]) / 2 + 1, (base[1] + tip[1]) / 2), tip, 30)
    s.part(s.stroke(path, (2.5, 1.5)), base=1, k=0, line=0)
    n = len(path)
    for i in range(whorls):
        t = 0.08 + 0.86 * i / max(1, whorls - 1)
        (x, y) = path[int(t * (n - 1))]
        r = w * 0.5 * (1 - 0.45 * t)
        m = s.ellipse(x, y, r, max(1.6, r * 0.62), ang=-0.35)
        s.part(m, base=3, k=1, sh=1, line=1)
    return None


# ---------------------------------------------------------------------------

def front_sprig(ph=0):
    """BRACED, leaning in: the square stem bows in a C and the whole body is
    rotated ~24 degrees about the feet toward the foe; the top pair is flung
    up at the foe, the lead leaf raised as a shield, the rear pair small and high."""
    s = Sprite(56, 56, PAL)
    b = [0, 1][ph]
    run = spline([(33, 54), (41, 53), (48, 50)], 12)                     # runner (the tail)
    s.part(s.stroke(run, (2.5, 1.6)), base=1, k=0, line=0)
    leaf(s, (47, 50), (52, 44 - b), 4, teeth=0, frost=False)
    leaf(s, (32, 51), (46, 54), 9, bend=0.10, teeth=4, veins=2)         # back foot
    s.lean(32, 54, 24 + 1.5 * b)
    leaf(s, (37, 37), (46, 29), 6, bend=-0.12, teeth=3, veins=2)        # rear leaf: small, high
    square_stem(s, [(32, 55), (37, 47), (38, 37), (35, 27)], 6.0, 4.5, nodes=[(36, 46), (38, 37)])
    leaf(s, (36, 28), (44, 18), 6, bend=-0.16, teeth=3, veins=2)        # top pair, far leaf
    leaf(s, (35, 28), (22, 14), 11, bend=0.20, teeth=4, veins=2)        # top pair, flung up at the foe
    leaf(s, (37, 39), (17, 27), 14, bend=0.14, teeth=6, veins=3)        # lead leaf: raised shield
    s.lean()
    leaf(s, (30, 51), (9, 54), 11, bend=-0.12, teeth=5)                 # front foot
    flake(s, 3, 20 - b)
    return s


def front_adult(ph=0):
    """LOOMING: the C-bowed square stem rotated ~20 degrees over the foe,
    crowned by a big frosted flower spike (the escalation) arching forward;
    the lead leaf thrust out, the top pair raised, the rear leaf small and high."""
    s = Sprite(56, 56, PAL)
    b = [0, 1, 2][ph]
    h = [0, 1.5, 3][ph]
    leaf(s, (35, 50), (54, 52), 11, bend=0.08, teeth=5, veins=2)        # back foot
    s.lean(34, 54, 20 + h)
    leaf(s, (39, 33), (50, 22), 8, bend=-0.12, teeth=3, veins=2)        # rear leaf: small, high
    square_stem(s, [(34, 55), (40, 45), (41, 33), (38, 22), (36, 17)], 8.0, 5.0,
                nodes=[(39, 46), (41, 34), (38, 24)])
    spike(s, (36, 18), (32, 0), 13, whorls=6)                           # the frosted crown
    leaf(s, (38, 23), (47, 13), 7, bend=-0.12, teeth=3, veins=2)
    leaf(s, (36, 23), (22, 10), 11, bend=0.18, teeth=4, veins=2)        # top pair raised at the foe
    leaf(s, (39, 37), (12, 27), 17, bend=0.12, teeth=7, veins=4)        # lead arm: thrust over the foe
    s.lean()
    leaf(s, (32, 51), (5, 54), 13, bend=-0.10, teeth=6)                 # front foot
    for (x, y, big) in [((3, 12, True), (9, 4, False)),
                        ((2, 11, True), (8, 3, False)),
                        ((2, 10, True), (7, 2, False))][ph]:
        flake(s, x, y, big)
    return s


def back_sprig():
    """From behind: the stem bows to the top-right (the foe), near leaf big and
    low on the left, far leaf smaller and higher, the tuft leaning out."""
    s = Sprite(48, 48, PAL)
    leaf(s, (22, 42), (0, 47), 16, bend=-0.08, teeth=6)
    leaf(s, (26, 41), (45, 38), 11, bend=0.10, teeth=5)
    square_stem(s, [(22, 48), (23, 37), (28, 26), (31, 20)], 8.0, 5.5, nodes=[(22, 42)])
    leaf(s, (25, 31), (2, 20), 17, bend=0.12, teeth=7, veins=3)
    leaf(s, (28, 28), (46, 18), 12, bend=-0.10, teeth=5, veins=3)
    leaf(s, (30, 22), (42, 6), 11, bend=-0.14, teeth=4, veins=2)
    leaf(s, (29, 22), (21, 7), 9, bend=0.12, teeth=4, veins=2)
    return s


def back_adult():
    """From behind: the stem bows up to the top-right (toward the foe), the
    near leaf big and low on the left, the far one smaller and higher, the
    frosted spike leaning out at the foe."""
    s = Sprite(48, 48, PAL)
    leaf(s, (21, 44), (0, 48), 17, bend=-0.08, teeth=6)
    leaf(s, (26, 42), (46, 40), 12, bend=0.10, teeth=5)
    square_stem(s, [(22, 48), (23, 36), (28, 24), (33, 16)], 10.0, 6.5, nodes=[(22, 43), (26, 29)])
    leaf(s, (24, 32), (1, 24), 19, bend=0.10, teeth=7, veins=4)
    leaf(s, (28, 28), (47, 16), 14, bend=-0.10, teeth=6, veins=3)
    leaf(s, (31, 20), (20, 6), 10, bend=0.14, teeth=4, veins=2)
    spike(s, (33, 18), (44, 0), 13, whorls=5)
    return s


ICON_SPRIG = [
    "................",
    "....kk..........",
    "...k33k..kk.....",
    "..k3322kk32k....",
    "..k22221k21k....",
    "...k2211k1k.....",
    "....kkk1k1k.....",
    ".kkkk..k21k.kk..",
    "k33222kk21kk32k.",
    "k2222211k21k221k",
    ".k222111k21k11k.",
    "..kkkkk.k21kkk..",
    "..kkk...k21k....",
    ".k3222kkk21kkkk.",
    "k222111k11k2221k",
    ".kkkkkkkkkkkkkk.",
]
ICON_ADULT = [
    "...kk...........",
    "..k33k..........",
    "..k313k.........",
    "...k33k.kk......",
    "..kkk1k k32k....",
    ".k332k1kk22k.kk.",
    "k3322221k21kk32k",
    "k22222111k1k221k",
    ".k22211kk21kk11k",
    "..kkkkk.k21k.kk.",
    ".kkkk...k21k....",
    "k33222kk221kkkk.",
    "k2222111k1k3221k",
    ".k2211kk11k2221k",
    "..kkkkkkkkkkkkkk",
    "................",
]


def _squash(rows, cut):
    """Frame 2: the top drops 1px (rows above `cut` shift down), base stays."""
    blank = " " * 16
    return [blank] + rows[:cut] + rows[cut + 1:]


SPRITES = {
    "mint_sprig": dict(pal=PAL, front=front_sprig, frames=2, back=back_sprig,
                       icon=ICON_SPRIG, icon2=_squash(ICON_SPRIG, 8)),
    "peppermint": dict(pal=PAL, front=front_adult, frames=3, back=back_adult,
                       icon=ICON_ADULT, icon2=_squash(ICON_ADULT, 9)),
}
