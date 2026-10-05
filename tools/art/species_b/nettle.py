"""Nettle line: nettle_sprout -> stinging_nettle.

Deep green, saw-toothed heart leaves in opposite pairs, bristling with white
stinging hairs. Signature: the raised top pair (arms up, ready to sting) and
the hairs, which multiply as it grows; the adult adds hanging catkins.

Round 3 poses + scores (CREATURES.md rubric). Serrations are explicit saw
teeth raked to the tip; stinging hairs are 1px bristles drawn past the outline;
the catkin is short and hangs high under an arm (no more catkin "legs").
  nettle_sprout    BRACED   C-stem, hooded crown, lead leaf thrust forward. score: 8
  stinging_nettle  LUNGING  long C-stem hunched forward, raised saw-blade
                            lead leaf, spearhead crown.                     score: 8 (leafy mass reads busy at 1x)
"""

from __future__ import annotations

import functools
import math

from icons_wild import ICONS
from rig import Spr as Sprite, fit_back
from pix import arclen_param, bez, edge_beads, erode, qbez

PAL = ("#383060", "#78b840", "#d8f080")   # slate-violet shadow + stem (accent), nettle green, lime glint


def toothed_leaf(s, base, tip, width, bend=0.0, step=5.0, depth=3.4, k=2, hl=False, vein=True, line=0):
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
        tooth = 0
        left.append((x + nx * (w - tooth), y + ny * (w - tooth)))
        right.append((x - nx * (w - tooth), y - ny * (w - tooth)))
    # smooth blade + explicit saw teeth raked toward the tip (crisp serrations)
    m = s.poly(left + right[::-1])
    polys = []
    dd = 0.0
    nxt = step * 0.8
    for i in range(1, len(path)):
        dd += math.dist(path[i - 1], path[i])
        t = dd / L
        if dd < nxt or not (0.14 < t < 0.88):
            continue
        nxt = dd + step
        x, y = path[i]
        a, b = path[i - 1], path[min(len(path) - 1, i + 1)]
        ux, uy = b[0] - a[0], b[1] - a[1]
        ul = math.hypot(ux, uy) or 1
        ux, uy = ux / ul, uy / ul
        nx, ny = -uy, ux
        w = width / 2 * (math.sin(math.pi * min(1, (t + 0.08) ** 0.75)) ** 0.9)
        h = min(depth, 0.9 + w * 0.35)
        for sg in (1, -1):
            ex, ey = x + nx * sg * (w - 0.6), y + ny * sg * (w - 0.6)
            polys.append([(ex - ux * step * 0.55, ey - uy * step * 0.55),
                          (ex + nx * sg * h + ux * step * 0.35, ey + ny * sg * h + uy * step * 0.35),
                          (ex + ux * step * 0.15, ey + uy * step * 0.15)])
    if polys:
        m = m | s.polys(polys)
    hm = None
    if hl:
        hx, hy = path[int(len(path) * 0.35)]
        hm = s.ellipse(hx - 1.5, hy - 1.5, 1.6, 0.9, ang=-0.6)
    pid = s.part(m, base=2, k=k, hl=hm, line=line)
    s.leafmask = getattr(s, "leafmask", m & False) | m
    if vein:
        s.decal(s.line1(path[3:-4]), 1, on=[pid])
        # two side veins (only on big leaves)
        for tt in ((0.3, 0.55) if width >= 18 else ()):
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


def stingers(s, mask, spacing=4, length=2, region=None, tone=1):
    """Stinging hairs: fine 1px spikes standing out of the edge, raked toward
    the leaf tip. Drawn after the outline (no ring) so they read as bristle,
    not as blobs. Dark tone on the background."""
    import numpy as np
    from pix import erode, shift
    ys, xs = np.nonzero(mask & ~erode(mask, 1))
    if region is not None:
        keep = region[ys, xs]
        ys, xs = ys[keep], xs[keep]
    f = mask.astype(float)
    for _ in range(3):
        f = (f + shift(f, 1, 0) + shift(f, -1, 0) + shift(f, 0, 1) + shift(f, 0, -1)) / 5
    gy, gx = np.gradient(f)
    hair = np.zeros(mask.shape, bool)
    picked = []
    for i in np.lexsort((xs, ys)):
        x, y = int(xs[i]), int(ys[i])
        if any(max(abs(x - a), abs(y - b)) < spacing for a, b in picked):
            continue
        nx, ny = -gx[y, x], -gy[y, x]
        if math.hypot(nx, ny) < 1e-6:
            continue
        a8 = round(math.atan2(ny, nx) / (math.pi / 4)) * (math.pi / 4)
        dx, dy = round(math.cos(a8)), round(math.sin(a8))
        X, Y = x, y
        while 0 <= X < s.w and 0 <= Y < s.h and mask[Y, X]:
            X, Y = X + dx, Y + dy
        cells = [(X + dx * k, Y + dy * k) for k in range(1, length + 1)]
        if any(not (0 <= u < s.w and 0 <= v < s.h) or mask[v, u] for u, v in cells):
            continue
        picked.append((x, y))
        for u, v in cells:
            hair[v, u] = True
    s.post.append((hair, tone))
    return hair


def stem(s, ctrl, w0, w1):
    """The square stem: a straight-sided stroke with a lit face and a dark
    angle line down its length (the square edge)."""
    path = bez(ctrl, 30)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=2, k=1, line=0)
    off = [(x + 0.8, y) for x, y in path[2:-2]]
    s.decal(s.line1(off), 1, on=[pid])
    return pid, m


def catkin(s, x, y, dx, n=3, r=1.4):
    """A short tassel of flower beads hanging from a leaf axil (kept short and
    high so it never reads as a leg)."""
    pts = [(x + dx * f, y + 1 + 4 * f + 2 * f * f) for f in [i / max(1, n - 1) for i in range(n)]]
    m = s.line1(bez([(x, y)] + pts, 8))
    for j, (px_, py_) in enumerate(pts[1:]):
        m |= s.circle(px_, py_, r - 0.2 * j)
    return s.part(m, base=2, k=1, line=0)


# ---------------------------------------------------------------------------
# nettle_sprout: BRACED. Low and stubborn: the lower pair planted wide like
# feet, the top pair raised like guarded fists, the bud ducked forward; every
# edge bristling.
# ---------------------------------------------------------------------------

def front_sprout(p=0):
    s = Sprite(60, 60, PAL)
    b = p
    s.set_tilt(8, 35, 58)
    # the stem: a C, base back under the body, top hooked forward
    pid, sm = stem(s, [(36, 58), (40, 49), (38, 40), (31, 33)], 5.6, 4.2)
    # rear arm: small and high on the far side
    _, l1, _ = toothed_leaf(s, (37, 42), (52, 30 - b), 10, bend=0.2, k=2)
    # feet: front foot long and ahead, back foot short behind
    with s.untilted(): toothed_leaf(s, (37, 53), (51, 58), 8, bend=0.12, k=2, vein=False)
    with s.untilted(): toothed_leaf(s, (35, 53), (12, 58), 10, bend=-0.10, k=2, vein=False)
    # head: the crown pair hooded forward, the near leaf a brim over the foe
    toothed_leaf(s, (31, 34), (37, 17 - b), 9, bend=0.2, k=2, vein=False)
    toothed_leaf(s, (31, 34), (15, 18 - b), 11, bend=-0.32, k=2)
    # lead arm: a big serrated leaf thrust straight at the foe
    _, l2, _ = toothed_leaf(s, (36, 45), (7 - b, 32), 14, bend=-0.2, k=3, hl=True)
    import numpy as np
    up = np.zeros((60, 60), bool)
    up[:52] = True
    stingers(s, s.leafmask | sm, spacing=4, length=2, region=up)
    s.contact += [(11, 20), (45, 52)]
    return s


def back_sprout():
    s = Sprite(52, 60, PAL)
    s.set_tilt(-10, 20, 64)
    # from behind: the C stem rising off the bottom, the head hooded toward
    # the foe (top-right), the lead leaf raised on the right
    pid, sm = stem(s, [(18, 66), (14, 52), (17, 40), (24, 32)], 7, 5)
    toothed_leaf(s, (16, 52), (1, 44), 15, bend=-0.15, k=2)
    toothed_leaf(s, (19, 42), (6, 28), 13, bend=-0.2, k=2)
    toothed_leaf(s, (24, 34), (24, 12), 12, bend=-0.2, k=2, vein=False)
    toothed_leaf(s, (24, 34), (41, 19), 15, bend=0.3, k=3)
    toothed_leaf(s, (18, 46), (44, 37), 16, bend=0.18, k=3, hl=True)
    stingers(s, s.leafmask | sm, spacing=4, length=2)
    return s


# ---------------------------------------------------------------------------
# stinging_nettle: LUNGING. A tall square stem hunched at the foe, the lead
# leaf thrust out like a jab, the rear one flung back; bristling all over;
# short catkin tassels hang high under the arms like sleeves.
# ---------------------------------------------------------------------------

def front_nettle(p=0):
    s = Sprite(60, 60, PAL)
    b = p
    s.set_tilt(10, 35, 58)
    # the stem: a long C, base behind, the top hunched far forward
    pid, sm = stem(s, [(36, 58), (41, 46), (38, 32), (27, 21)], 5.4, 3.6)
    # rear arm: flung up and back
    _, l1, _ = toothed_leaf(s, (39, 37), (57, 21 - b), 11, bend=0.18, k=2)
    # a catkin tassel: high and short, under the rear arm
    catkin(s, 41, 39, 4, n=3, r=1.8)
    # feet: front foot long and ahead, back foot short behind
    with s.untilted(): toothed_leaf(s, (37, 52), (52, 57), 8, bend=0.1, k=2, vein=False)
    with s.untilted(): toothed_leaf(s, (35, 52), (13, 57), 10, bend=-0.1, k=2, vein=False)
    # head: the spearhead crown, its near leaf a hood over the foe
    toothed_leaf(s, (28, 23), (34, 6 - b), 8, bend=0.18, k=2, vein=False)
    toothed_leaf(s, (28, 23), (12, 7 - b), 12, bend=-0.3, k=2)
    # lead arm: a huge saw-blade jab at the foe
    _, l2, _ = toothed_leaf(s, (36, 41), (3 - b, 24), 17, bend=-0.2, k=3, hl=True)
    import numpy as np
    up = np.zeros((60, 60), bool)
    up[:52] = True
    stingers(s, s.leafmask | sm, spacing=4, length=2, region=up)
    s.contact += [(13, 21), (46, 53)]
    return s


def back_nettle():
    s = Sprite(52, 60, PAL)
    s.set_tilt(-12, 20, 64)
    pid, sm = stem(s, [(18, 70), (13, 52), (16, 36), (25, 24)], 7.5, 5)
    toothed_leaf(s, (15, 54), (0, 46), 15, bend=-0.12, k=2)
    catkin(s, 17, 44, -4, n=3, r=1.8)
    toothed_leaf(s, (16, 38), (2, 24), 14, bend=-0.2, k=2)
    toothed_leaf(s, (25, 26), (24, 4), 12, bend=-0.2, k=2, vein=False)
    toothed_leaf(s, (25, 26), (42, 11), 15, bend=0.3, k=3)
    toothed_leaf(s, (17, 42), (45, 31), 16, bend=0.18, k=3, hl=True)
    stingers(s, s.leafmask | sm, spacing=4, length=2)
    return s


SPRITES = {
    "nettle_sprout": dict(pal=PAL, front=front_sprout, back=fit_back(back_sprout), icon=ICONS["nettle_sprout"], icon2="bob",
                          idle=[functools.partial(front_sprout, 1)]),
    "stinging_nettle": dict(pal=PAL, front=front_nettle, back=fit_back(back_nettle), icon=ICONS["stinging_nettle"], icon2="bob",
                            idle=[functools.partial(front_nettle, 1)]),
}
