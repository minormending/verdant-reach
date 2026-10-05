"""Nettle line: nettle_sprout -> stinging_nettle.

Deep green, saw-toothed heart leaves in opposite pairs, bristling with white
stinging hairs. Signature: the raised top pair (arms up, ready to sting) and
the hairs, which multiply as it grows; the adult adds hanging catkins.
"""

from __future__ import annotations

import math

from pix import Sprite, arclen_param, bez, edge_beads, erode, qbez

PAL = ("#285830", "#88c048", "#e0f0b8")


def toothed_leaf(s, base, tip, width, bend=0.0, step=3.0, depth=1.7, k=2, hl=False, vein=True, line=0):
    """Heart-based, pointed leaf with forward-raking saw teeth."""
    (bx, by), (tx, ty) = base, tip
    L0 = math.dist(base, tip)
    nx0, ny0 = -(ty - by) / L0, (tx - bx) / L0
    c = ((bx + tx) / 2 + nx0 * bend * L0, (by + ty) / 2 + ny0 * bend * L0)
    path = qbez(base, c, tip, 60)
    ts, L = arclen_param(path)
    left, right = [], []
    d = 0.0
    for i, (x, y) in enumerate(path):
        if i:
            d += math.dist(path[i - 1], path[i])
        t = d / L
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        ux, uy = b[0] - a[0], b[1] - a[1]
        ul = math.hypot(ux, uy) or 1
        nx, ny = -uy / ul, ux / ul
        # heart: broad near the base, tapering to a long point
        w = width / 2 * (math.sin(math.pi * min(1, (t + 0.08) ** 0.75)) ** 0.9)
        if t < 0.1:
            w = width / 2 * (0.55 + 4 * t)
        phase = (d % step) / step
        tooth = depth * (1 - phase) if 0.12 < t < 0.92 and w > depth + 0.8 else 0
        left.append((x + nx * (w - tooth), y + ny * (w - tooth)))
        right.append((x - nx * (w - tooth), y - ny * (w - tooth)))
    m = s.poly(left + right[::-1])
    hm = None
    if hl:
        hx, hy = path[int(len(path) * 0.35)]
        hm = s.ellipse(hx - 1.5, hy - 1.5, 1.6, 0.9, ang=-0.6)
    pid = s.part(m, base=2, k=k, hl=hm, line=line)
    s.leafmask = getattr(s, "leafmask", m & False) | m
    if vein:
        s.decal(s.line1(path[3:-4]), 1, on=[pid])
        # two side veins
        for tt in (0.3, 0.55):
            i = int(len(path) * tt)
            x, y = path[i]
            a, b = path[i - 1], path[i + 1]
            ux, uy = b[0] - a[0], b[1] - a[1]
            ul = math.hypot(ux, uy) or 1
            ux, uy = ux / ul, uy / ul
            nx, ny = -uy, ux
            w = width / 2 * 0.6
            for sg in (1, -1):
                e = (x + (nx * sg * 0.9 + ux * 0.6) * w, y + (ny * sg * 0.9 + uy * 0.6) * w)
                s.decal(s.line1(bez([(x, y), e], 8)) & erode(m, 1), 1, on=[pid])
    return pid, left, right


def hairs(s, pts):
    """Stinging hairs: single white pixels standing proud of the outline."""
    s.px(pts, 3)
    for x, y in pts:
        s.soft[y, x] = True


# ---------------------------------------------------------------------------

def front_sprout():
    s = Sprite(64, 64, PAL, sc=1.0)
    stem = s.curve([(32, 63), (32, 52), (31, 40)], (3.4, 2.6))
    s.part(stem, base=2, k=1, line=0)
    # lower pair: big, spreading low
    toothed_leaf(s, (31, 55), (12, 55), 13, bend=-0.14, k=2)
    toothed_leaf(s, (33, 55), (53, 52), 13, bend=0.14, k=3)
    # upper pair: raised like arms
    toothed_leaf(s, (31, 45), (17, 32), 10.5, bend=-0.12, k=2, hl=True)
    toothed_leaf(s, (32, 45), (46, 32), 10.5, bend=0.12, k=2)
    # the crown: a tight bud of tiny leaves
    toothed_leaf(s, (31, 43), (28, 30), 7, bend=-0.05, k=1, vein=False)
    toothed_leaf(s, (32, 43), (36, 31), 6.5, bend=0.05, k=1, vein=False)
    edge_beads(s, s.leafmask, spacing=7, region=s.ellipse(32, 30, 30, 24))
    return s


def back_sprout():
    s = Sprite(48, 72, PAL)
    stem = s.curve([(24, 72), (24, 58), (24, 48)], (4, 3))
    s.part(stem, base=2, k=1, line=0)
    toothed_leaf(s, (23, 62), (1, 58), 15, bend=0.12, k=2)
    toothed_leaf(s, (25, 62), (47, 58), 15, bend=-0.12, k=3)
    toothed_leaf(s, (23, 50), (9, 36), 12, bend=0.1, k=2, hl=True)
    toothed_leaf(s, (25, 50), (39, 36), 12, bend=-0.1, k=2)
    toothed_leaf(s, (24, 50), (24, 32), 9, k=2)
    edge_beads(s, s.leafmask, spacing=9, region=s.ellipse(24, 36, 30, 20))
    return s


ICON_SPROUT = [
    "                ",
    "      k  k      ",
    "  kk k2kk2k kk  ",
    "  k2kk2kk2kk2k  ",
    "  k22k21k2k22k  ",
    "   k22k11k22k   ",
    "    kkk11kkk    ",
    " kkkk  k1k kkkk ",
    "k2222kkk1kk2221k",
    " k32221k1k12211k",
    "  k2111k1k1111k ",
    "   kkkkk1kkkkk  ",
    "       k1k      ",
    "       k1k      ",
    "       k1k      ",
    "       kkk      ",
]


def catkin(s, x, y, dx, n=4):
    """A dangling string of flower beads."""
    pts = [(x + dx * f, y + 1 + 6 * f + 6 * f * f) for f in [i / (n - 1) for i in range(n)]]
    m = s.line1(bez([(x, y)] + pts, 8))
    for (px_, py_) in pts[1:]:
        m |= s.circle(px_, py_, 1.3)
    s.part(m, base=2, k=1, line=0, hl=None)


def front_nettle():
    s = Sprite(72, 72, PAL, sc=0.88)
    # stem: tall, hunched forward (left) at the top
    path = bez([(37, 71), (37, 52), (34, 36), (29, 22)], 30)
    s.part(s.stroke(path, (4.6, 3.0)), base=2, k=1, line=0)
    # bottom pair: long, drooping
    toothed_leaf(s, (36, 57), (7, 60), 14, bend=-0.16, k=2)
    toothed_leaf(s, (38, 57), (66, 55), 14, bend=0.16, k=3)
    # top pair: raised high like arms
    toothed_leaf(s, (33, 39), (10, 24), 12.5, bend=-0.16, k=2, hl=True)
    toothed_leaf(s, (35, 39), (58, 25), 12.5, bend=0.16, k=3)
    # crown, tipped forward: a spiky head
    toothed_leaf(s, (29, 27), (17, 12), 8.5, bend=-0.12, k=1)
    toothed_leaf(s, (30, 27), (37, 11), 8, bend=0.12, k=2)
    toothed_leaf(s, (29, 26), (26, 8), 7, k=1, vein=False)
    # catkins hang in the gap under the top pair
    catkin(s, 32, 41, -8, n=4)
    catkin(s, 38, 41, 8, n=4)
    edge_beads(s, s.leafmask, spacing=7, region=s.ellipse(34, 26, 40, 24))
    return s


def back_nettle():
    s = Sprite(48, 72, PAL)
    path = bez([(24, 72), (24, 56), (24, 40), (25, 30)], 30)
    s.part(s.stroke(path, (5, 3.4)), base=2, k=1, line=0)
    toothed_leaf(s, (23, 64), (0, 62), 15, bend=0.12, k=2)
    toothed_leaf(s, (25, 64), (48, 62), 15, bend=-0.12, k=3)
    toothed_leaf(s, (23, 52), (3, 44), 14, bend=0.12, k=2)
    toothed_leaf(s, (25, 52), (45, 44), 14, bend=-0.12, k=3)
    toothed_leaf(s, (23, 40), (9, 27), 11, bend=0.1, k=2, hl=True)
    toothed_leaf(s, (25, 40), (39, 27), 11, bend=-0.1, k=2)
    toothed_leaf(s, (24, 36), (25, 20), 9, k=2)
    edge_beads(s, s.leafmask, spacing=10, region=s.ellipse(24, 34, 30, 22))
    return s


ICON_NETTLE = [
    "      3k3       ",
    "     kk2kk      ",
    "  3 k2k2k2k 3   ",
    "  kkk22k22kkk   ",
    " k22kk2k2kk22k  ",
    "  kk22k1k22kk   ",
    "kkkk kk1kk kkkk ",
    "k3222kk1kk2221k ",
    " kk222k1k2211k  ",
    "kkk kkk1kkk kkkk",
    "k2222kk1kk22211k",
    " k3221k1k1222kk ",
    "  kk22k1k11kk   ",
    "    kkk1kkk     ",
    "      k1k       ",
    "      kkk       ",
]


SPRITES = {
    "nettle_sprout": dict(pal=PAL, front=front_sprout, back=back_sprout, icon=ICON_SPROUT),
    "stinging_nettle": dict(pal=PAL, front=front_nettle, back=back_nettle, icon=ICON_NETTLE),
}
