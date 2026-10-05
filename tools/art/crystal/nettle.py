"""Crystal rule, nettle line: nettle_sprout -> stinging_nettle.

A redraw of tools/art/species_b/nettle.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md):

  index 0  #181818  outline, the stinging hairs, crevices        (shared)
  index 1  slate violet: the square stem, the veins, and the shadow side
           of every green form (there is no dark green; nettle stems and
           leaf-backs really do run purple)
  index 2  nettle green: the leaves
  index 3  #f8f8f8  a light rim along the lit saw-teeth, a leaf glint (shared)

Poses (docs/CREATURES.md, kept from the base art):
  nettle_sprout    BRACED   C-stem, hooded crown pair, the lead leaf thrust
                            forward like a guard, feet planted wide.
  stinging_nettle  LUNGING  a long C-stem hunched at the foe, a huge
                            saw-blade lead leaf, catkin tassels high.

Entrance animations (the stinging hairs are the signature):
  nettle_sprout    hunker, then BRISTLE: the crown pair draws down with
                   its hairs flat, then springs up with every hair on end.
  stinging_nettle  wind-up and JAB: the lead leaf cocks back, thrusts at
                   the foe and every hair bristles on the strike.

Sport: Lamium maculatum 'Beacon Silver' (docs/SPORTS.md): violet stems,
silver leaves.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/nettle.py            # write the base bundles
  $PY tools/art/crystal/nettle.py --preview  # scratch preview only
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
                        shift)

TOOL = "tools/art/crystal/nettle.py"
IDS = ["nettle_sprout", "stinging_nettle"]

VIOLET = "#483068"
GREEN = "#78c040"
PAL = [BLACK, VIOLET, GREEN, WHITE]
SPORT = [BLACK, "#583870", "#b0c0b0", WHITE]     # 'Beacon Silver': violet stems, silver leaves
SPAL = (VIOLET, GREEN, WHITE)


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------

def toothed_leaf(s, base, tip, width, bend=0.0, step=5.0, depth=3.4, k=2, hl=False, vein=True,
                 line=0, rim=0.0):
    """Heart-based, pointed leaf with forward-raking saw teeth, flat-shaded:
    green, a violet shadow band bottom-right, a violet midrib, an optional
    white rim along the lit (top-left) teeth."""
    (bx, by), (tx, ty) = base, tip
    L0 = math.dist(base, tip)
    nx0, ny0 = -(ty - by) / L0, (tx - bx) / L0
    c = ((bx + tx) / 2 + nx0 * bend * L0, (by + ty) / 2 + ny0 * bend * L0)
    path = qbez(base, c, tip, 60)
    ts, L = arclen_param(path)

    def half(t):
        w = width / 2 * (math.sin(math.pi * min(1, (t + 0.08) ** 0.75)) ** 0.9)
        return width / 2 * (0.55 + 4 * t) if t < 0.1 else w

    left, right = [], []
    d = 0.0
    for i, (x, y) in enumerate(path):
        if i:
            d += math.dist(path[i - 1], path[i])
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        ux, uy = b[0] - a[0], b[1] - a[1]
        ul = math.hypot(ux, uy) or 1
        nx, ny = -uy / ul, ux / ul
        w = half(d / L)
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    m = s.poly(left + right[::-1])
    polys = []
    dd, nxt = 0.0, step * 0.8
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
        w = half(t)
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
        hx, hy = path[int(len(path) * 0.38)]
        hm = s.ellipse(hx - 1.8, hy - 1.8, 3.4 if width >= 15 else (2.6 if width >= 12 else 1.8), 1.0, ang=math.atan2(ty - by, tx - bx))
    pid = s.part(m, base=2, k=k, hl=hm, line=line)
    s.leafmask = getattr(s, "leafmask", m & False) | m
    if rim:
        rim_white(s, m, pid, rim)
    if vein:
        s.decal(s.line1(path[3:-4]), 1, on=[pid])
        for tt in ((0.3, 0.55) if width >= 15 else ()):
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
    return pid, m


def stingers(s, mask, spacing=4, length=2, region=None, rake=0.0):
    """Stinging hairs: 1px black spikes standing out of the edge, along the
    outward normal. Drawn after the outline (no ring), so they read as
    bristle against the battle backdrop. Returns the hair mask."""
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
        ang = math.atan2(ny, nx) + rake
        a8 = round(ang / (math.pi / 4)) * (math.pi / 4)
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
    s.post.append((hair, 0))
    return hair


def stem(s, ctrl, w0, w1):
    """The square stem: violet, a green lit face down its left edge."""
    path = bez(ctrl, 30)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(x - 0.9, y) for x, y in path[2:-3]]) & erode(m, 1), 2, on=[pid])
    return pid, m


def catkin(s, x, y, dx, n=3, r=1.6):
    """A short tassel of flower beads hanging high from a leaf axil."""
    pts = [(x + dx * f, y + 1 + 4 * f + 2 * f * f) for f in [i / max(1, n - 1) for i in range(n)]]
    m = s.line1(bez([(x, y)] + pts, 8))
    for j, (px_, py_) in enumerate(pts[1:]):
        m |= s.circle(px_, py_, r - 0.2 * j)
    pid = s.part(m, base=2, k=1, line=0)
    return pid


def up_to(y):
    m = np.zeros((70, 70), bool)
    m[:y] = True
    return m


# ---------------------------------------------------------------------------
# nettle_sprout: BRACED. Hunker, then bristle.
# ---------------------------------------------------------------------------

# (crown lift px, hair length, lead-leaf lift px)
SPROUT_KEYS = [
    (0, 2, 0),    # 0 rest
    (-2, 1, -1),  # 1 hunker: the crown pair drawn down, hairs flat
    (2, 3, 1),    # 2 spring up, hairs rising
    (3, 4, 2),    # 3 BRISTLE: every hair on end (held)
]


def front_sprout(f=0):
    lift, hl_, ll = SPROUT_KEYS[f]
    s = Spr(60, 60, SPAL)
    s.set_tilt(8, 35, 58)
    pid, sm = stem(s, [(36, 58), (40, 49), (38, 40), (31, 33)], 5.6, 4.2)
    toothed_leaf(s, (37, 42), (52, 30), 10, bend=0.2, k=2)
    with s.untilted():
        toothed_leaf(s, (37, 53), (51, 58), 8, bend=0.12, k=2, vein=False)
    with s.untilted():
        toothed_leaf(s, (35, 53), (12, 58), 10, bend=-0.10, k=2, vein=False, rim=0.25)
    static = s.leafmask | sm
    before = s.tone.copy()
    n0 = s.n
    # head: the crown pair hooded forward, the near leaf a brim at the foe
    toothed_leaf(s, (31, 34), (37, 17 - lift), 9, bend=0.2, k=2, vein=False, rim=0.3)
    toothed_leaf(s, (31, 34), (15, 18 - lift), 12, bend=-0.32, k=2, rim=0.55, hl=True)
    # lead arm: a big serrated leaf thrust at the foe
    toothed_leaf(s, (36, 45), (7, 32 - ll), 14, bend=-0.2, k=3, hl=True, rim=0.55)
    cast_shadow(s, n0, [pid], depth=1)
    moving = s.tone != before
    hair = stingers(s, s.leafmask | sm, spacing=4, length=hl_, region=up_to(52)[:60, :60])
    s.movem = moving | hair
    s.contact += [(11, 20), (45, 52)]
    return s


def back_sprout():
    s = Spr(52, 60, SPAL)
    s.set_tilt(-10, 20, 64)
    stem(s, [(18, 66), (14, 52), (17, 40), (24, 32)], 7, 5)
    toothed_leaf(s, (16, 52), (1, 44), 15, bend=-0.15, k=2)
    toothed_leaf(s, (19, 42), (6, 28), 13, bend=-0.2, k=2, rim=0.3)
    toothed_leaf(s, (24, 34), (24, 12), 12, bend=-0.2, k=2, vein=False, rim=0.35)
    toothed_leaf(s, (24, 34), (41, 19), 15, bend=0.3, k=3, rim=0.35)
    toothed_leaf(s, (18, 46), (44, 37), 16, bend=0.18, k=3, hl=True, rim=0.4)
    stingers(s, s.leafmask, spacing=4, length=2)
    return s


# ---------------------------------------------------------------------------
# stinging_nettle: LUNGING. Wind-up and JAB.
# ---------------------------------------------------------------------------

# (lead tip dx, lead tip dy, hair length on the lead leaf, hair length elsewhere)
NETTLE_KEYS = [
    (0, 0, 2, 2),     # 0 rest
    (5, -5, 1, 2),    # 1 wind-up: the blade cocked back and up
    (-3, 2, 3, 3),    # 2 JAB: thrust past the rest pose
    (-3, 2, 4, 3),    # 3 the hairs bristle on the strike (held)
    (-1, 1, 3, 2),    # 4 recoil
]


def front_nettle(f=0):
    jx, jy, hlead, hrest = NETTLE_KEYS[f]
    s = Spr(64, 60, SPAL)
    s.set_tilt(10, 37, 58)
    pid, sm = stem(s, [(38, 58), (43, 46), (40, 32), (29, 21)], 5.4, 3.6)
    toothed_leaf(s, (41, 37), (59, 21), 11, bend=0.18, k=2, rim=0.3)
    catkin(s, 43, 39, 4, n=3, r=1.8)
    with s.untilted():
        toothed_leaf(s, (39, 52), (54, 57), 8, bend=0.1, k=2, vein=False)
    with s.untilted():
        toothed_leaf(s, (37, 52), (15, 57), 10, bend=-0.1, k=2, vein=False, rim=0.25)
    toothed_leaf(s, (30, 23), (36, 6), 8, bend=0.18, k=2, vein=False, rim=0.3)
    toothed_leaf(s, (30, 23), (14, 7), 12, bend=-0.3, k=2, rim=0.45, hl=True)
    rest = s.leafmask | sm
    hair_rest = stingers(s, rest, spacing=4, length=hrest, region=up_to(52)[:60, :64])
    before = s.tone.copy()
    n0 = s.n
    s.leafmask = rest & False
    # lead arm: a huge saw-blade jab at the foe
    toothed_leaf(s, (38, 41), (5 + jx, 24 + jy), 17, bend=-0.2, k=3, hl=True, rim=0.4)
    cast_shadow(s, n0, [pid], depth=1)
    lead = s.leafmask
    moving = s.tone != before
    hair = stingers(s, lead, spacing=4, length=hlead, region=up_to(52)[:60, :64])
    s.post[-2] = (hair_rest & ~dilate(lead, 1), 0)
    s.movem = moving | hair | (hair_rest & dilate(lead, 3))
    if hrest != 2:
        s.movem = s.movem | hair_rest | dilate(rest & ~erode(rest, 1), 1)
    s.contact += [(15, 23), (48, 55)]
    return s


def back_nettle():
    s = Spr(52, 60, SPAL)
    s.set_tilt(-12, 20, 64)
    stem(s, [(18, 70), (13, 52), (16, 36), (25, 24)], 7.5, 5)
    toothed_leaf(s, (15, 54), (0, 46), 15, bend=-0.12, k=2)
    catkin(s, 17, 44, -4, n=3, r=1.8)
    toothed_leaf(s, (16, 38), (2, 24), 14, bend=-0.2, k=2, rim=0.3)
    toothed_leaf(s, (25, 26), (24, 4), 12, bend=-0.2, k=2, vein=False, rim=0.35)
    toothed_leaf(s, (25, 26), (42, 11), 15, bend=0.3, k=3, rim=0.35)
    toothed_leaf(s, (17, 42), (45, 31), 16, bend=0.18, k=3, hl=True, rim=0.4)
    stingers(s, s.leafmask, spacing=4, length=2)
    return s


# ---------------------------------------------------------------------------
# icons (16x16): k outline/hairs, 1 violet, 2 green, 3 white.
# Frame 2: the crown bristles (hairs up, leaves raised 1px).
# ---------------------------------------------------------------------------

ICONS = {   # (frame-0 rows, squash row, frame-2 extra pixels: the hairs bristle)
    "nettle_sprout": ([
        "................",
        "...k..k.........",
        "..k3kk3k...k....",
        ".k32k22k..k3k...",
        "..kk222k.k32k.k.",
        ".k.k22k.k221kk1k",
        "k1kkk2kk2211k1k.",
        "k33222k2211kkk..",
        "k222222k11k.....",
        ".k11222k1k......",
        "..kk112k1k......",
        "....kk21k.......",
        ".kkkk.k21k.kkkk.",
        "k3222kk21kk3222k",
        ".kk111k1111k11k.",
        "...kkkkkkkkkkk..",
    ], 10, {(2, 1): "k", (9, 2): "k", (15, 4): "k", (0, 5): "k"}),
    "stinging_nettle": ([
        "................",
        ".k..k...........",
        "k3kk3k..........",
        "k32k22k....k....",
        ".kk222k...k3k...",
        "...kk22k.k321k..",
        "kkkk.k2kk2211k..",
        "k3222k2k2211k...",
        "k222222k211k....",
        ".k1122k21kkk....",
        "..kk11k21k2k....",
        "....kkk21kk1k...",
        ".kkkk.k21k.kk...",
        "k3222kk21kk3222k",
        ".kk111k1111k11k.",
        "...kkkkkkkkkkk..",
    ], 10, {(3, 1): "k", (13, 4): "k", (14, 6): "k"}),
}


ANIM = {
    # hunker (anticipation), spring, BRISTLE held, settle
    "nettle_sprout": {"intro": [[0, 6], [1, 12], [2, 4], [3, 18], [2, 4], [3, 6], [0, 6]],
                      "idle": [[0, 120], [2, 6]]},
    # cock back (held), a 4-tick jab, the hairs bristle, recoil, rest
    "stinging_nettle": {"intro": [[0, 4], [1, 14], [2, 4], [3, 16], [4, 8], [0, 6]],
                        "idle": [[0, 130], [4, 6]]},
}

NOTES = {
    "nettle_sprout": "Crystal rule. BRACED. Gesture: hunker, then bristle (the crown pair draws down with "
                     "its hairs flat, springs up and every stinging hair stands on end, held). Two tones: "
                     "violet is the square stem, the veins and the shadow side of every green leaf, so "
                     "there is no dark green; the hairs are 1px black bristles past the outline, and white "
                     "is a rim along the lit saw-teeth. Sport: Lamium maculatum 'Beacon Silver' "
                     "(violet stems, silver leaves).",
    "stinging_nettle": "Crystal rule. LUNGING. Gesture: wind-up and JAB (the saw-blade lead leaf cocks back "
                       "and up, held, thrusts past its rest pose in 4 ticks and its hairs bristle on the "
                       "strike, then it recoils). Only the lead leaf and the hairs move. Same two tones as "
                       "the sprout. Sport: 'Beacon Silver'.",
}


def build_all(write=True):
    out = {}
    specs = {
        "nettle_sprout": (lambda: place(render_frames(front_sprout, len(SPROUT_KEYS)), 56, dx=1), back_sprout),
        "stinging_nettle": (lambda: place(render_frames(front_nettle, len(NETTLE_KEYS)), 56, dx=0), back_nettle),
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
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/nettle.png"))
    else:
        build()
