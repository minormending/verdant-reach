"""Crystal rule, moonflower line: moonflower_seed -> moonflower_vine -> moonflower.

A redraw of tools/art/species_b/moonflower.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). A night palette:

  index 0  #181818  outline, the throat, crevices                 (shared)
  index 1  midnight violet: the seed coat, the throat, and the shadow side
           of every sage form (the line's accent, as before)
  index 2  sage: leaves, vine, the shaded inside of the trumpet, the
           pleats of the furled bud
  index 3  #f8f8f8  the moon-white petals (the real flower is white, so
           white is a gift here), rims and glints                 (shared)

The white cap (5-20% of the front) is kept by lighting the trumpet the way
a cup is lit: the far limb and the lit rim are white, the inside wall and
the star bands fall into sage, the throat into violet and black.

Poses (docs/CREATURES.md, kept from the base art):
  moonflower_seed  BOBBING  the violet seed coat worn as a helmet, two
                            butterfly cotyledons spread like moth wings.
  moonflower_vine  REARING  a twining vine; the head is the spiral-furled
                            bud aimed at the foe.
  moonflower       REARING  the great trumpet turned 3/4 at the foe, a
                            furled bud raised behind as a fist.

Entrance animations:
  moonflower_seed  the cotyledons beat like a moth's wings, twice, the
                   second beat high, then fold to rest.
  moonflower_vine  the furled bud TWISTS (its spiral pleats wind round)
                   and the tip cracks a sliver of white, then furls back.
  moonflower       the trumpet UNFURLS: a furled spindle twists open into
                   the trumpet, flares wide, and settles.

Sport: the lilac moonflower, Ipomoea muricata (docs/SPORTS.md): plum and
lilac in place of violet and sage, so the star and the cup turn lilac.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/moonflower.py            # write the base bundles
  $PY tools/art/crystal/moonflower.py --preview  # scratch preview only
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from _artc_draw import icon_pair, outline_fix  # noqa: E402
from _artc_draw import (BLACK, WHITE, T, Spr, arclen_param, back_frame, bez, cast_shadow, dilate,  # noqa: E402,F401
                        erode, icon_arr, moving_boxes, place, preview, qbez, render_frames, rim_white,
                        rot, shift, spr)

TOOL = "tools/art/crystal/moonflower.py"
IDS = ["moonflower_seed", "moonflower_vine", "moonflower"]

VIOLET = "#383870"
SAGE = "#80c098"
PAL = [BLACK, VIOLET, SAGE, WHITE]
SPORT = [BLACK, "#502860", "#b898d0", WHITE]    # lilac moonflower: plum and lilac
SPAL = (VIOLET, SAGE, WHITE)


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------

def heart(s, cx, cy, size, ang=0.0, k=2, hl=False, vein=True, line=0, rim=0.0):
    """Heart-shaped leaf, tip pointing along ang (0 = down): sage, a violet
    shadow band, a violet midrib, a white rim on the lit lobe."""
    pts = []
    for i in range(80):
        t = i / 80 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * size, -y / 17 * size * 1.05 + size * 0.1))
    pts = [(cx + x, cy + y) for x, y in rot(pts, ang)]
    m = s.poly(pts)
    hm = None
    if hl:
        hx, hy = rot([(-0.40 * size, -0.40 * size)], ang)[0]
        hm = s.ellipse(cx + hx, cy + hy, max(1.0, size * 0.20), max(0.8, size * 0.09), ang=ang - 0.5)
    pid = s.part(m, base=2, k=k, hl=hm, line=line)
    if rim:
        rim_white(s, m, pid, rim)
    if vein:
        a = rot([(0, -0.5 * size)], ang)[0]
        b = rot([(0, 0.85 * size)], ang)[0]
        s.decal(s.line1(bez([(cx + a[0], cy + a[1]), (cx + b[0], cy + b[1])], 12)) & erode(m, 1), 1, on=[pid])
    return pid, m


def butterfly(s, cx, cy, size, ang=0.0, rim=0.4, sq=0.62):
    """Moonflower cotyledon: broad, deeply notched (a butterfly / 'V' leaf)."""
    pts = []
    for i in range(80):
        t = i / 80 * 2 * math.pi
        r = 1.0 - 0.7 * max(0, math.cos(t)) ** 10
        pts.append((math.cos(t) * r * size, math.sin(t) * sq * r * size))
    pts = [(cx + x, cy + y) for x, y in rot(pts, ang)]
    m = s.poly(pts)
    pid = s.part(m, base=2, k=2, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    # the midrib from the stalk end
    a = rot([(-0.85 * size, 0)], ang)[0]
    b = rot([(0.35 * size, 0)], ang)[0]
    s.decal(s.line1(bez([(cx + a[0], cy + a[1]), (cx + b[0], cy + b[1])], 10)) & erode(m, 1), 1, on=[pid])
    return pid, m


def vine(s, ctrl, w0, w1, k=1):
    """The twining stem: sage with a violet shadow line."""
    path = bez(ctrl, 60)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=2, k=k, line=0)
    s.decal(s.line1([(x + 0.9, y + 0.3) for x, y in path[4:-6]]) & erode(m, 1), 1, on=[pid])
    return pid, path, m


def leaf_on(s, at, cx, cy, size, ang, k=2, hl=False, vein=True, rim=0.0):
    nx, ny = rot([(0, -0.21 * size)], ang)[0]
    (ax, ay) = at
    px_, py_ = cx + nx, cy + ny
    s.part(s.stroke(qbez(at, ((ax + px_) / 2, min(ay, py_) - 1.5), (px_, py_), 20), (2.0, 1.6)), base=2, k=0, line=0)
    return heart(s, cx, cy, size, ang=ang, k=k, hl=hl, vein=vein, rim=rim)


def tendril(s, start, R, turns=1.2, sg=1, a0=0.0):
    x0, y0 = start
    cx, cy = x0 - R * math.cos(a0), y0 - R * math.sin(a0)
    pts = [(cx + R * (1 - 0.7 * u) * math.cos(a0 + sg * u * turns * 2 * math.pi),
            cy + R * (1 - 0.7 * u) * math.sin(a0 + sg * u * turns * 2 * math.pi)) for u in np.linspace(0, 1, 60)]
    m = s.stroke(pts, (1.6, 1.1))
    return s.part(m, base=2, k=0, line=0)


def bud(s, base, tip, w, turns=2.2, bend=2.0, phase=0.0, crack=0.0, calyx=True, bold=True):
    """The spiral-furled bud: a white spindle wound with sage pleats, its
    shadow side sage; `phase` (0..1) turns the spiral (the twist), `crack`
    (px) splays the tip open."""
    (x0, y0), (x1, y1) = base, tip
    L = math.dist(base, tip)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    path = qbez(base, ((x0 + x1) / 2 + nx * bend, (y0 + y1) / 2 + ny * bend), tip, 50)
    wf = lambda t: max(1.0, w * math.sin(math.pi * min(1, 0.12 + t * 0.92)) ** 0.75)  # noqa: E731
    m = s.stroke(path, wf, cap=True)
    if crack:
        # the tip loosening: two petal points splay apart past the tip
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        for sg in (1, -1):
            q0 = (x1 - ux * 4 + nx * sg * 1.0, y1 - uy * 4 + ny * sg * 1.0)
            q1 = (x1 + ux * crack * 0.6 + nx * sg * crack, y1 + uy * crack * 0.6 + ny * sg * crack)
            m |= s.stroke(bez([q0, q1], 10), (2.4, 1.0))
    pid = s.part(m, base=3, k=2, sh_tone=2, line=0)
    ax, ay = s.T([(x0, y0)])[0]
    bx2, by2 = s.T([(x1, y1)])[0]
    ux, uy = bx2 - ax, by2 - ay
    ul = math.hypot(ux, uy) or 1
    ux, uy = ux / ul, uy / ul
    ys, xs = np.nonzero(erode(m, 1))
    period = max(4.0, ul / (turns * 2.2))
    band = np.zeros(m.shape, bool)
    for x, y in zip(xs, ys):
        u = (x + 0.5 - ax) * ux + (y + 0.5 - ay) * uy
        v = -(x + 0.5 - ax) * uy + (y + 0.5 - ay) * ux
        if u < ul * 0.12 or u > ul * 0.9:
            continue
        if (u + v * 1.1 + phase * period) % period < (2.0 if bold else 1.0):
            band[y, x] = True
    s.decal(band, 2, on=[pid])
    if crack:
        # the crack shows the dark inside of the opening tip
        tx, ty = s.T([(x1 + (x1 - x0) / L * 0.5, y1 + (y1 - y0) / L * 0.5)])[0]
        s.decal(s.ellipse(x1, y1, 1.2, 1.2), 1, on=[pid])
    if calyx:
        cm = s.ellipse(x0, y0, w * 0.42, w * 0.34, ang=math.atan2(y1 - y0, x1 - x0))
        s.part(cm, base=2, k=1, line=0)
    return pid, m


def trumpet(s, cx, cy, R, squash=0.5, tube_to=None, open_=1.0):
    """The open flower turned 3/4, its mouth at the foe: a white funnel
    from the tube (right) flaring into a 5-angled limb. Through the mouth
    we see the inside of the cup: sage, deepening to a violet throat on
    the tube side, crossed by the five white star rays. A white rim all
    round the limb; its outer bottom-right edge falls into sage."""
    ry = R * (0.72 + 0.28 * open_)
    rx = R * squash
    if tube_to:
        tx, ty = tube_to
        # the funnel: from the limb's back edge to the tube
        fun = s.poly([(cx, cy - ry * 0.80), (tx, ty - 2.0), (tx, ty + 2.0), (cx, cy + ry * 0.80)])
        fun |= s.stroke(qbez((cx + rx * 0.6, cy), ((cx + tx) / 2, (cy + ty) / 2), (tx, ty), 20), (ry * 1.2, 4.0))
        fid = s.part(fun, base=3, k=4, sh_tone=2, line=0, shadow=(0.4, 1))
        s.decal(s.line1(bez([(cx + rx * 0.9, cy - ry * 0.25), (tx - 1, ty - 0.5)], 16)) & erode(fun, 1), 2,
                on=[fid])
        # sepals clasping the tube
        s.part(s.ellipse(tx + 1, ty, 3.6, 2.4, ang=math.atan2(ty - cy, tx - cx)), base=2, k=1, line=0)
    pts = []
    for i in range(5):
        a0 = -math.pi / 2 + i * 2 * math.pi / 5
        for j in range(8):
            a = a0 + j / 8 * 2 * math.pi / 5
            r = 1.0 - 0.09 * math.sin(math.pi * j / 8) ** 0.5
            pts.append((cx + r * rx * math.cos(a), cy + r * ry * math.sin(a)))
    disc = s.poly(pts)
    did = s.part(disc, base=3, k=1, sh_tone=2, line=0, shadow=(1, 1))
    # the inside of the cup, seen through the mouth
    icx, icy = cx + rx * 0.10, cy + ry * 0.06
    cup = s.ellipse(icx, icy, rx * 0.74, ry * 0.78) & erode(disc, 2)
    s.decal(cup, 2, on=[did])
    tx_, ty_ = icx + rx * 0.38, icy + 0.5               # the throat sits toward the tube
    throat = s.ellipse(tx_, ty_, max(1.2, rx * 0.22), max(1.6, ry * 0.30)) & cup
    s.decal(throat, 1, on=[did])
    # the star: five white rays from the throat out to the limb's points
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        p1 = (cx + rx * 0.98 * math.cos(a), cy + ry * 0.98 * math.sin(a))
        ray = s.line1(bez([(tx_ - 0.5, ty_), p1], 16)) & cup & ~erode(throat, 1)
        s.decal(ray, 3, on=[did])
    return did, disc


def sparkle(s, x, y):
    """A glint of moonlight: a tiny 4-point star, black arms, white heart."""
    m = np.zeros((s.h, s.w), bool)
    for u, v in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= u < s.w and 0 <= v < s.h:
            m[v, u] = True
    c = np.zeros_like(m)
    c[y, x] = True
    s.post.append((m, 1))
    s.post.append((c, 3))
    return m | c


# ---------------------------------------------------------------------------
# moonflower_seed: BOBBING. The cotyledons beat like moth wings.
# ---------------------------------------------------------------------------

# (rear wing direction, lead wing direction, foreshortening): the wings
# hinge at the neck; a beat swings them and turns them edge-on
SEED_KEYS = [
    (-0.55, 2.85, 0.62),   # 0 rest
    (-1.00, 3.30, 0.48),   # 1 wings up
    (-0.10, 2.40, 0.40),   # 2 the downbeat (edge-on)
    (-1.30, 3.60, 0.62),   # 3 wings high, spread (held)
]


def front_seed(f=0):
    ra, la, sq = SEED_KEYS[f]
    s = spr(56, 56, SPAL, sc=0.92, pad=6)
    s.set_tilt(14, 31, 55)
    with s.untilted():
        s.part(s.curve([(31, 50), (28, 53), (23, 55)], (2.4, 1.4)), base=2, k=0, line=0)
    with s.untilted():
        s.part(s.curve([(32, 50), (35, 53), (39, 55)], (2.2, 1.4)), base=2, k=0, line=0)
    stem = s.curve([(32, 51), (36, 43), (34, 34), (27, 28)], (4.6, 3.4))
    sid = s.part(stem, base=2, k=2, line=0)
    rim_white(s, stem, sid, 0.35)
    before = s.tone.copy()
    # rear wing: flung up behind (far, smaller), lead wing spread forward
    hx, hy = 31, 24
    butterfly(s, hx + math.cos(ra) * 8.0, hy + math.sin(ra) * 8.0, 9.0, ang=ra, rim=0.5, sq=sq)
    hx, hy = 22, 28
    butterfly(s, hx + math.cos(la) * 9.5, hy + math.sin(la) * 9.5, 10.5, ang=la, rim=0.55, sq=sq)
    s.movem = s.tone != before
    # head: the violet seed coat worn as a helmet, brim tipped at the foe;
    # its split seam shows a crack of the moon-white flesh inside
    coat = s.ellipse(23, 22, 10.5, 7.0, ang=-0.42)
    hm = s.ellipse(18, 17.5, 3.4, 1.2, ang=-0.42)
    cid = s.part(coat, base=1, k=2, sh_tone=0, hl=hm, line=0)
    rim_white(s, coat, cid, 0.25)
    seam = [(14, 27), (22, 25), (31, 18)]
    s.ink(s.line1(bez(seam, 12)) & erode(coat, 1), 0, lock=False)
    s.decal(s.line1(bez([(x + 1, y + 1) for x, y in seam], 12)) & erode(coat, 1), 3, on=[cid])
    s.contact += [(22, 27), (36, 40)]
    return s


def back_seed():
    s = Spr(48, 56, SPAL)
    stem = s.curve([(18, 62), (16, 50), (20, 38), (26, 30)], (8, 6))
    s.part(stem, base=2, k=2, line=0)
    butterfly(s, 9, 30, 12, ang=3.6, rim=0.35)
    butterfly(s, 40, 30, 12, ang=-0.2, rim=0.45)
    coat = s.ellipse(27, 21, 16, 11, ang=-0.35)
    hm = s.ellipse(20, 15, 4.5, 1.4, ang=-0.4)
    cid = s.part(coat, base=1, k=3, sh_tone=0, hl=hm, line=0)
    rim_white(s, coat, cid, 0.25)
    seam = [(13, 27), (26, 25), (40, 13)]
    s.ink(s.line1(bez(seam, 12)) & erode(coat, 1), 0, lock=False)
    s.decal(s.line1(bez([(x + 1, y + 1) for x, y in seam], 12)) & erode(coat, 1), 3, on=[cid])
    return s


# ---------------------------------------------------------------------------
# moonflower_vine: REARING. The furled bud twists and cracks.
# ---------------------------------------------------------------------------

# (spiral phase, tip crack px, bud tip dx, dy)
VINE_KEYS = [
    (0.00, 0.0, 0, 0),   # 0 rest
    (0.33, 0.0, 1, 1),   # 1 twist (drawn back a little)
    (0.66, 0.0, 0, -1),  # 2 twist on
    (0.66, 2.5, -1, 0),  # 3 the tip cracks a sliver of white (held)
]


def front_vine(f=0):
    ph, crack, dx, dy = VINE_KEYS[f]
    s = Spr(60, 60, SPAL)
    s.set_tilt(12, 32, 57)
    leaf_on(s, (36, 37), 46, 27, 7.5, -2.3, k=2, rim=0.3)
    vid, path, vm = vine(s, [(32, 57), (38, 47), (36, 36), (29, 27)], 4.4, 3.2)
    rim_white(s, vm, vid, 0.25)
    tendril(s, (38, 44), 3.2, turns=1.1, sg=1, a0=3.6)
    with s.untilted():
        leaf_on(s, (31, 56), 19, 54, 8, 1.9, k=2, vein=False, rim=0.35)
    before = s.tone.copy()
    bud(s, (30, 30), (18 + dx, 5 + dy), 12.0, turns=1.6, bend=-2.0, phase=ph, crack=crack)
    s.movem = s.tone != before
    leaf_on(s, (35, 44), 16, 46, 8, 1.25, k=2, rim=0.45, hl=True)
    s.contact += [(12, 22), (38, 47)]
    return s


def back_vine():
    """From behind: the vine rising off the bottom edge, the big furled bud
    aimed up at the foe (top-right), heart leaves either side."""
    s = Spr(48, 60, SPAL)
    vine(s, [(18, 66), (17, 54), (21, 44), (25, 38)], 7.5, 5.5)
    heart(s, 6, 46, 12, ang=1.3, k=2, rim=0.3)
    bud(s, (25, 40), (44, 6), 15, turns=2.0, bend=2.5)
    heart(s, 40, 46, 12, ang=-1.4, k=2, hl=True, rim=0.4)
    return s


# ---------------------------------------------------------------------------
# moonflower: REARING. The trumpet unfurls.
# ---------------------------------------------------------------------------

# (state, R, rot deg): state "bud" = furled spindle, "open" = trumpet
MOON_KEYS = [
    ("open", 18.0, 26, 1.0),   # 0 rest: the trumpet
    ("bud", 0, 26, 0.0),       # 1 furled
    ("open", 12.5, 32, 0.4),   # 2 twisting open, cupped
    ("open", 19.5, 22, 1.0),   # 3 flared wide (held)
]


def front_moonflower(f=0):
    st, R, rd, op = MOON_KEYS[f]
    s = Spr(60, 60, SPAL, sc=0.96)
    s.set_tilt(8, 36, 57)
    s.part(s.curve([(42, 42), (46, 34), (48, 28)], (2.4, 2.0)), base=2, k=0, line=0)
    bud(s, (48, 28), (53, 8), 6.0, turns=2.0, bend=2.0, bold=True)
    with s.untilted():
        leaf_on(s, (37, 56), 48, 54, 6.5, -1.9, k=2, vein=False)
    with s.untilted():
        leaf_on(s, (35, 56), 23, 54, 8, 1.85, k=2, vein=False, rim=0.35)
    vid, path, vm = vine(s, [(36, 57), (43, 47), (42, 36), (35, 29), (29, 27)], 5.0, 3.4)
    rim_white(s, vm, vid, 0.2)
    tendril(s, (43, 50), 3.2, turns=1.1, sg=1, a0=0.2)
    leaf_on(s, (41, 43), 18, 44, 8.5, 1.15, k=2, rim=0.45, hl=True)
    before = s.tone.copy()
    n0 = s.n
    if st == "bud":
        bud(s, (30, 28), (10, 14), 9.0, turns=1.6, bend=-1.5, calyx=False)
    else:
        with s.rotated(rd, 17, 25):
            trumpet(s, 16 + (18 - R) * 0.40, 25, R, squash=0.48, tube_to=(31, 27), open_=op)
    s.movem = s.tone != before
    s.contact += [(17, 27), (44, 51)]
    return s


def back_moonflower():
    """From behind: the vine rising off the bottom, and the great trumpet
    turned away toward the foe (top-right): the outside of its funnel
    (white, a sage crescent below) flaring into the back of the 5-angled
    limb, ribbed with the five sage star bands, a white rim all round."""
    s = Spr(52, 60, SPAL)
    vine(s, [(14, 68), (12, 56), (15, 46), (21, 40)], 8.0, 6.0)
    leaf_on(s, (13, 56), 3, 50, 11, 1.3, k=2, rim=0.3)
    fun = s.stroke(qbez((20, 41), (24, 32), (32, 24), 20), (5.0, 15.0))
    fid = s.part(fun, base=3, k=3, sh_tone=2, line=0)
    s.decal(s.line1(bez([(21, 39), (31, 25)], 12)) & erode(fun, 1), 2, on=[fid])
    s.part(s.ellipse(20, 41, 5, 3.8, ang=-0.8), base=2, k=1, line=0)      # the calyx
    cx, cy, rx, ry, rot_ = 34, 23, 13.0, 20.0, -0.70
    pts = []
    for i in range(5):
        a0 = -math.pi / 2 + i * 2 * math.pi / 5
        for j in range(8):
            a = a0 + j / 8 * 2 * math.pi / 5
            r = 1.0 - 0.10 * math.sin(math.pi * j / 8) ** 0.5
            pts.append((r * rx * math.cos(a), r * ry * math.sin(a)))
    pts = [(cx + x, cy + y) for x, y in rot(pts, rot_)]
    disc = s.poly(pts)
    did = s.part(disc, base=3, k=3, sh_tone=2, line=0)
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        (ex, ey), = rot([(math.cos(a) * rx * 0.95, math.sin(a) * ry * 0.95)], rot_)
        s.decal(s.stroke(bez([(cx - 2, cy + 2), (cx + ex, cy + ey)], 12), (2.4, 1.0), cap=False) & erode(disc, 1),
                2, on=[did])
    rim_white(s, disc, did, 0.7)
    leaf_on(s, (16, 48), 40, 52, 10, -1.2, k=2, hl=True, rim=0.4)
    return s


# ---------------------------------------------------------------------------
# icons (16x16): k outline, 1 violet, 2 sage, 3 white
# ---------------------------------------------------------------------------

ICONS = {   # (frame-0 rows, squash row, frame-2 extra pixels)
    "moonflower_seed": ([
        "................",
        "...kkkkk........",
        "..k33111k.......",
        ".k3111111k..kk..",
        "k1111111k1kk32k.",
        "k111kkk11kk222k.",
        ".kkk333kkk2k21k.",
        "k3222222k2kkkk..",
        ".kk11222k2k.....",
        "...kkkkk22k.....",
        ".......k22k.....",
        "......k22k......",
        "......k21k......",
        ".....kk21kk.....",
        "....k22kk22k....",
        ".....kk..kk.....",
    ], 9, None),
    "moonflower_vine": ([
        "................",
        ".kk.............",
        "k33k............",
        "k323k...........",
        ".k332k...kkk....",
        "..k232k.k322k...",
        "...k22kk2221k...",
        "..kkk2k.kk1k....",
        ".k322k2k..k.....",
        "k3222kk2k.......",
        ".k112k.k2k......",
        "..kkk..k2k......",
        ".kkkk..k2k.kkkk.",
        "k3222kk22kk3221k",
        ".kk11k1122k111k.",
        "...kkkkkkkkkkk..",
    ], 10, None),
    "moonflower": ([
        "..kkkk......kk..",
        ".k3333k....k33k.",
        "k32223kkk..k3k..",
        "k3222233kk.k3k..",
        "k32212333kkk2k..",
        "k3211222222k2k..",
        "k32212222kkk2k..",
        "k3222222kk.k2k..",
        ".k32222k..k22k..",
        "..kkkkkkkk2k....",
        ".kkkk..k22k.kkk.",
        "k3222kkk2kk3221k",
        ".kk11k1122k111k.",
        "...kkkkkkkkkkkk.",
    ], 8, None),
}


ANIM = {
    # beat, beat, the big beat held, fold
    "moonflower_seed": {"intro": [[0, 4], [1, 6], [2, 6], [1, 6], [3, 14], [2, 6], [0, 6]],
                        "idle": [[0, 110], [1, 6], [2, 6]]},
    # twist, twist on, the tip cracks (held), furl back
    "moonflower_vine": {"intro": [[0, 6], [1, 8], [2, 8], [3, 16], [2, 6], [0, 8]],
                        "idle": [[0, 120], [1, 8]]},
    # furled, twisting open, FLARE (held), settle, a second little flare
    "moonflower": {"intro": [[1, 12], [2, 8], [3, 16], [0, 6], [3, 4], [0, 8]],
                   "idle": [[0, 150], [3, 8]]},
}

NOTES = {
    "moonflower_seed": "Crystal rule. BOBBING. Gesture: the butterfly cotyledons beat like a moth's wings "
                       "(up, down, up, a big high beat held, fold to rest); the seed-coat helmet stays put. "
                       "Two tones: midnight violet (the coat, every shadow) and sage (leaves); white is the "
                       "lit rims and the coat's glint. Sport: the lilac moonflower Ipomoea muricata.",
    "moonflower_vine": "Crystal rule. REARING. Gesture: the furled bud twists (its spiral pleats wind round "
                       "the white spindle) and its tip cracks a sliver of white, held, then furls back. Only "
                       "the bud moves. Sport: the lilac moonflower Ipomoea muricata.",
    "moonflower": "WHITE: the trumpet is really white (a white part); lit like a cup, the white is the "
                  "limb and the funnel, with sage and violet inside. Crystal rule. REARING. Gesture: the trumpet unfurls (a furled spindle twists open into a "
                  "cupped trumpet, flares wide, held, and settles). The petals are the real white, so the "
                  "white cap is kept by lighting the trumpet like a cup: the lit limb white, the inside wall "
                  "and the star sage, the throat violet and black. Sport: the lilac moonflower Ipomoea "
                  "muricata (the star and the cup turn lilac).",
}


def build_all(write=True):
    out = {}
    specs = {
        "moonflower_seed": (lambda: place(render_frames(front_seed, len(SEED_KEYS)), 56, dx=1), back_seed),
        "moonflower_vine": (lambda: place(render_frames(front_vine, len(VINE_KEYS)), 56, dx=1), back_vine),
        "moonflower": (lambda: place(render_frames(front_moonflower, len(MOON_KEYS)), 56, dx=0), back_moonflower),
    }
    for sid, (ffn, bfn) in specs.items():
        front = ffn()
        back = back_frame(bfn)
        icons = [outline_fix(x) for x in icon_pair(*ICONS[sid])]
        out[sid] = (front, back, icons)
        if write:
            from kit import write_species
            write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                          anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
    return out


def build():
    build_all(write=True)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = build_all(write=False)
        rows = [(PAL, list(fr) + [bk] + ic, SPORT) for fr, bk, ic in out.values()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/moonflower.png"))
    else:
        build()
