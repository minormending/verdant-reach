"""Crystal rule, wild rose line: rose_bud -> wild_rose (Rosa canina, the dog rose).

  index 0  #181818  outline, petal overlaps, the hips' shade   (shared)
  index 1  DEEP GREEN: canes, leaflets, sepals, the bloom's heart
  index 2  dog-rose pink: petals, hips, the hooked prickles, the leaflets'
           red-tinged margins
  index 3  #f8f8f8  the pale petal bases, stamens, rims, glints

Two hues, the flytrap's way: the deep green of the canes is the dark slot.
The leaflets are flat green lit by pink rims (the dog rose's real
red-tinged margins), so the green never needs a second green.

Poses (docs/CREATURES.md, kept from the classic art):
  rose_bud   COILED: a prickled cane curled into an S, the tight bud head
             pulled back and tilted at the foe, its sepals flaring like
             claws; a leaf raised as a guard.
  wild_rose  LUNGING: the open bloom thrust at the foe on an arching cane,
             a prickled cane arm forward, the rear cane arched back over the
             shoulder carrying two glossy hips (the tail).

Entrance animations (only the head moves):
  rose_bud   the sepals clench, then fling wide like claws as the bud swells
             and cracks a sliver of pale petal, hold, and settle.
  wild_rose  the bloom draws back cupped, then thrusts with its petals
             flaring wide, holds, a glint gleams on the petals, settle.

Sport: 'Persian Yellow' (Rosa foetida 'Persiana'): deep yellow blooms and
hips over dark leaves.

Scores (docs/CREATURES.md §9): rose_bud 8 (1: the leaflets get busy at 1x).
wild_rose 8 (the bloom reads at 1x with no face in any frame; 7: the lower
body is busy with canes and leaflets).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/rose.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py rose                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, mask_px, stalk, preview, stats, shift)

TOOL = "tools/art/crystal/rose.py"
IDS = ["rose_bud", "wild_rose"]
GREEN = "#2c6040"
PINK = "#e86888"
PAL = [BLACK, GREEN, PINK, WHITE]
SPORT = [BLACK, "#305830", "#f0c030", WHITE]
SPAL = (GREEN, PINK, WHITE)


def rot(pts, deg, cx, cy):
    """+deg swings the top toward the foe (left)."""
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c + (y - cy) * s_, cy - (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def cane(s, ctrl, w0, w1, prickles=(), rim=0.2):
    """A green cane with hooked pink prickles at the given path fractions
    (t, side): side +1 = left of the direction of travel."""
    path = bez(ctrl, 50)
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=1, k=0, line=0)
    if rim:
        rim_white(s, m, pid, rim, tone=2)
    n = len(path)
    for t, side in prickles:
        i = min(n - 2, max(1, int(t * (n - 1))))
        (x, y), (x2, y2) = path[i], path[i + 1]
        dx, dy = x2 - x, y2 - y
        L = math.hypot(dx, dy) or 1
        dx, dy = dx / L, dy / L
        nx, ny = dy * side, -dx * side
        w = w0 + (w1 - w0) * t
        b0 = (x - dx * 1.6 + nx * w * 0.4, y - dy * 1.6 + ny * w * 0.4)
        b1 = (x + dx * 1.6 + nx * w * 0.4, y + dy * 1.6 + ny * w * 0.4)
        tip = (x - dx * 1.8 + nx * (w * 0.5 + 2.6), y - dy * 1.8 + ny * (w * 0.5 + 2.6))  # hooked back
        pm = s.poly([b0, tip, b1])
        s.part(pm, base=2, k=0, line=0)
    return pid, m, path


def leaflets(s, base, tip, n=5, size=3.2, rim=True, line=0):
    """A pinnate leaf: a rachis from base to tip with n leaflets (paired,
    the odd one at the tip), flat green lit by pink margins."""
    path = bez([base, tip], 20)
    rach = s.stroke(path, 1.2, cap=False)
    s.part(rach, base=1, k=0, line=line)
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    ux, uy = (tx - bx) / L, (ty - by) / L
    nx, ny = -uy, ux
    pos = []
    pairs = (n - 1) // 2
    for j in range(pairs):
        t = 0.35 + 0.55 * j / max(1, pairs)
        for sd in (1, -1):
            px = bx + ux * L * t + nx * sd * size * 1.05
            py = by + uy * L * t + ny * sd * size * 1.05
            pos.append((px + ux * size * 0.35, py + uy * size * 0.35, sd))
    pos.append((tx + ux * size * 0.5, ty + uy * size * 0.5, 0))
    pos.sort(key=lambda p: p[0] + p[1], reverse=True)    # far (bottom-right) first
    for px, py, sd in pos:
        dx, dy = ux + nx * sd * 0.9, uy + ny * sd * 0.9
        dl = math.hypot(dx, dy)
        dx, dy = dx / dl, dy / dl
        b0 = (px - dx * size * 1.1, py - dy * size * 1.1)
        t0 = (px + dx * size * 1.25, py + dy * size * 1.25)
        m, lp = s.leaf(b0, t0, size * 1.5, bend=0.06 * (sd or 1), fat=0.45, blunt=0.6)
        pid = s.part(m, base=1, k=0, line=0)
        if rim:
            rim_white(s, m, pid, 0.45, tone=3)
        # the dog rose's red-tinged leaflet margin, on the shade edge
        far = m & ~shift(m, 1, 1)
        s.decal(far & ~shift(far, 0, -1) & ~(s.tone == 3), 2, on=[pid])


def bud(s, cx, cy, r, tilt, swell=0.0, crack=0.0, flare=0.0, glint=True):
    """The tight bud: a pink teardrop pointing up-left (tilt deg toward the
    foe), its outer petal wrapping it, long feathery sepals clasping it like
    claws that fling out by `flare`; `crack` opens a sliver of pale petal at
    the tip."""
    R = r * (1 + 0.10 * swell)

    def T(pts):
        return rot(pts, tilt, cx, cy)
    # far sepals, behind the bud
    for a, ln in ((-32 - 34 * flare, 1.45), (30 + 34 * flare, 1.35)):
        base = (cx, cy + R * 0.70)
        tipp = (cx + math.sin(math.radians(a)) * R * ln, cy + R * 0.70 - math.cos(math.radians(a)) * R * ln * 1.15)
        m, path = s.leaf(T([base])[0], T([tipp])[0], R * 0.34, bend=0.22 if a < 0 else -0.22, fat=0.3)
        sid = s.part(m, base=1, k=0, line=0)
    # the bud body: a teardrop, round at the base
    pts = [(cx, cy - R * 1.25), (cx - R * 0.66, cy - R * 0.55), (cx - R * 0.82, cy + R * 0.20),
           (cx - R * 0.55, cy + R * 0.78), (cx, cy + R * 0.95), (cx + R * 0.55, cy + R * 0.78),
           (cx + R * 0.82, cy + R * 0.20), (cx + R * 0.62, cy - R * 0.55)]
    m = s.poly(T(bez(pts + pts[:1], 8)))
    pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.25)
    # the outer petal wrapping the bud from the front: its lit edge (white)
    # over a black tuck gives the spiral without a seam-and-glint "eye"
    wrap = [(cx - R * 0.50, cy + R * 0.85), (cx - R * 0.86, cy + R * 0.15), (cx - R * 0.58, cy - R * 0.62),
            (cx - R * 0.10, cy - R * 1.10), (cx + R * 0.14, cy - R * 0.40), (cx + R * 0.32, cy + R * 0.35),
            (cx + R * 0.30, cy + R * 0.95)]
    wm = s.poly(T(bez(wrap + wrap[:1], 8))) & m
    wid = s.part(wm, base=2, k=2, sh_tone=1, line=0, merge={pid})
    rim_white(s, wm, wid, 0.55)
    right = wm & ~shift(wm, 1, 0) & shift(m, 1, 0)
    s.decal(right, 0, on=[wid])
    if crack > 0:
        # a sliver of the pale inner petal peeking from the tip
        cm = s.poly(T([(cx - R * 0.16, cy - R * 1.05), (cx + R * 0.02, cy - R * (1.40 + 0.18 * crack)),
                       (cx + R * 0.20, cy - R * 1.02), (cx + R * 0.02, cy - R * 0.85)]))
        s.decal(cm & m, 3, on=[pid, wid])
    # near sepals, in front: claws hugging the bud's base, flinging out
    for a, ln, bend in ((-26 - 46 * flare, 1.55, 0.28), (30 + 46 * flare, 1.40, -0.28), (-4, 0.95, 0.1)):
        base = (cx, cy + R * 0.95)
        tipp = (cx + math.sin(math.radians(a)) * R * ln, cy + R * 0.95 - math.cos(math.radians(a)) * R * ln * 1.15)
        m2, path = s.leaf(T([base])[0], T([tipp])[0], R * 0.26, bend=bend, fat=0.25)
        sid = s.part(m2, base=1, k=0, line=0)
        rim_white(s, m2, sid, 0.45, tone=3)
    # the receptacle (the hip-to-be) under the bud
    hp = T([(cx, cy + R * 1.12)])[0]
    rm = s.ellipse(hp[0], hp[1], R * 0.26, R * 0.24)
    s.part(rm, base=1, k=0, line=0)
    return pid


def bloom(s, cx, cy, R, tilt=0.0, flare=0.0, cup=0.0, glint=False):
    """An open five-petalled dog rose in 3/4, facing the foe: a flat face of
    five broad, heart-notched petals (black overlap lines between them, the
    near petals bigger), pale petal bases, and a starburst of stamens.
    flare: the petals spread wider; cup: they close toward a cup."""
    sq = 0.74 - 0.10 * cup + 0.04 * flare     # 3/4 squash across the face
    k = 1 + 0.10 * flare - 0.14 * cup
    Rk = R * k
    t0 = math.radians(tilt)

    def P(th, r):
        x, y = math.cos(th) * r * sq, math.sin(th) * r
        c, s_ = math.cos(t0), math.sin(t0)
        return (cx + x * c - y * s_, cy + x * s_ + y * c)

    pts = []
    for i in range(200):
        th = 2 * math.pi * i / 200
        u = (math.degrees(th) + 90 + 36) % 72 / 72          # 0..1 across a petal, petal tips at u=0.5
        r = Rk * (0.80 + 0.20 * math.sin(math.pi * u) ** 0.6)
        r -= Rk * 0.13 * max(0.0, 1 - abs(u - 0.5) / 0.09)  # the heart notch
        r *= 1.0 + 0.10 * (-math.cos(th))                    # near (left) petals larger
        pts.append(P(th, r))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=1, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.30)
    # pale petal bases: a white wedge at the base of each petal
    base = s.poly([P(2 * math.pi * i / 40, Rk * 0.46) for i in range(40)])
    s.decal(base & m, 3, on=[pid])
    # petal overlaps: black lines from the heart to the rim at the junctions,
    # each bowed so one petal tucks under the next; they split the pale ring
    # into five wedges
    for j in range(5):
        th = math.radians(-90 - 36 + 72 * j)
        line = [P(th + 0.12 * (q / 10) ** 2, Rk * (0.30 + 0.60 * q / 10)) for q in range(11)]
        s.decal(s.line1(line) & erode(m, 1), 0, on=[pid])
    # the heart: a plain pale boss of stamens. Dots or a ring in it read as
    # eyes in motion, so it stays one clean white shape.
    if glint:
        g = P(math.radians(-140), Rk * 0.70)
        g = (int(g[0]), int(g[1]))
        s.glint([g, (g[0] + 1, g[1]), (g[0], g[1] + 1)])
    return pid


def hip(s, cx, cy, r, glint=True):
    m = s.ellipse(cx, cy, r * 0.85, r)
    pid = s.part(m, base=2, k=1, sh_tone=0, line=0)
    if glint:
        s.glint([(int(cx - r * 0.4), int(cy - r * 0.45)), (int(cx - r * 0.4), int(cy - r * 0.45) + 1)])
    # the sepal tuft at the tip (hips hang: the tuft is at the bottom)
    t = s.poly([(cx - r * 0.5, cy + r * 0.8), (cx, cy + r * 1.5), (cx + r * 0.5, cy + r * 0.8)])
    s.part(t, base=1, k=0, line=0)
    return pid


# ---------------------------------------------------------------------------
# rose_bud: COILED
# ---------------------------------------------------------------------------

BUD_KEYS = [  # (sepal flare, swell, crack, head tilt)
    (0.0, 0.0, 0.0, 24),
    (-0.4, -0.3, 0.0, 30),   # clench, pulled back
    (1.0, 1.0, 1.0, 16),     # FLING: sepals wide, the bud cracks
    (0.6, 0.5, 0.5, 20),     # settle
]


def bud_front(f=0):
    fl, sw, cr, tl = BUD_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.92)
    s.set_tilt(6, 32, 58)
    leaflets(s, (37, 38), (50, 30), n=3, size=3.4)              # rear arm, up and back
    cane(s, [(33, 58), (39, 50), (37, 42), (29, 38), (26, 32), (25, 27)], 5, 4.5,
         prickles=[(0.12, -1), (0.34, 1), (0.55, -1), (0.72, 1)])
    with s.untilted():
        cane(s, [(33, 57), (26, 56), (19, 57.5)], 3.5, 2.5, rim=0)
        cane(s, [(35, 57), (41, 56), (47, 57.5)], 3.5, 2.5, rim=0)
    leaflets(s, (33, 46), (17, 41), n=3, size=3.6)              # the guard leaf
    before = s.tone.copy()
    bud(s, 22, 17, 10.5, tl, swell=sw, crack=cr, flare=fl)
    s.headm = s.tone != before
    s.contact += [(18, 26), (40, 48)]
    return s


def bud_frames():
    return place(frames(bud_front, len(BUD_KEYS)), 56, dx=2)


def bud_back():
    """From behind: the bud leaning top-right at the foe, its five green
    sepals clasping its base like a claw, the guard leaf's back on the left."""
    s = Spr(48, 64, SPAL)
    leaflets(s, (22, 50), (2, 40), n=3, size=5.0)
    cane(s, [(22, 74), (23, 54), (24, 40)], 8, 7, prickles=[(0.35, 1), (0.6, -1)])
    leaflets(s, (25, 52), (45, 46), n=3, size=4.4)
    cx, cy, R = 27, 22, 13
    pts = [(cx + R * 0.5, cy - R * 1.4), (cx - R * 0.55, cy - R * 0.55), (cx - R * 0.8, cy + R * 0.3),
           (cx - R * 0.3, cy + R * 0.95), (cx + R * 0.55, cy + R * 0.85), (cx + R * 0.95, cy + R * 0.1),
           (cx + R * 0.95, cy - R * 0.75)]
    m = s.poly(bez(pts + pts[:1], 8))
    pid = s.part(m, base=2, k=3, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.35)
    for tip, bend in (((cx - R * 0.85, cy + R * 0.15), 0.25), ((cx - R * 0.25, cy - R * 0.05), 0.1),
                      ((cx + R * 0.6, cy - R * 0.1), -0.15), ((cx + R * 1.05, cy + R * 0.55), -0.25)):
        mm, _ = s.leaf((cx, cy + R * 0.95), tip, R * 0.30, bend=bend, fat=0.3)
        sid = s.part(mm, base=1, k=0, line=0)
        rim_white(s, mm, sid, 0.4, tone=3)
    return s


# ---------------------------------------------------------------------------
# wild_rose: LUNGING
# ---------------------------------------------------------------------------

ROSE_KEYS = [  # (dx, dy, flare, cup, glint, tilt)
    (0, 0, 0.0, 0.0, False, 0),
    (3, 1, 0.0, 1.0, False, -8),     # draw back, cupped
    (-3, -1, 1.0, 0.0, False, 6),    # THRUST: petals flare
    (-2, -1, 0.7, 0.0, True, 4),     # a glint gleams
]


def rose_front(f=0):
    dx, dy, fl, cu, gl, tl = ROSE_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.89)
    s.set_tilt(6, 34, 58)
    # rear cane arched back over the shoulder with two hips (the tail)
    leaflets(s, (42, 44), (54, 52), n=3, size=3.2)
    cane(s, [(37, 56), (41, 42), (47, 31), (53, 27), (57, 31)], 3.5, 2.5, prickles=[(0.35, 1), (0.6, 1)])
    cane(s, [(52, 28), (51, 34)], 2, 1.6, rim=0)
    hip(s, 57.5, 36, 4.0)
    hip(s, 50.5, 38.5, 3.8)
    # the main cane arching up to the bloom
    cane(s, [(33, 58), (38, 46), (36, 34), (30, 27)], 5.5, 4.5, prickles=[(0.2, -1), (0.45, 1)])
    with s.untilted():
        cane(s, [(33, 57), (26, 56), (17, 57.5)], 4, 2.5, rim=0)
        cane(s, [(35, 57), (42, 56), (49, 57.5)], 4, 2.5, rim=0)
    # the prickled cane arm thrust forward and up at the foe
    cane(s, [(35, 45), (26, 44), (17, 39), (10, 32)], 3.5, 2.5, prickles=[(0.3, 1), (0.55, 1), (0.8, 1)])
    leaflets(s, (24, 45), (18, 53), n=3, size=3.2)
    before = s.tone.copy()
    neck = s.stroke(bez([(31, 29), (27 + dx * 0.5, 24 + dy * 0.5), (23 + dx, 20 + dy)], 12), 4)
    s.part(neck, base=1, k=0, line=0)
    bloom(s, 21 + dx, 16 + dy, 15, tilt=tl, flare=fl, cup=cu, glint=gl)
    s.headm = s.tone != before
    s.contact += [(15, 24), (40, 49)]
    return s


def rose_frames():
    return place(frames(rose_front, len(ROSE_KEYS)), 56, dx=0)


def rose_back():
    """From behind: the bloom's back leaning top-right -- five pink petals
    behind a star of green sepals -- the hips on the rear cane at the left."""
    s = Spr(52, 64, SPAL)
    cane(s, [(22, 74), (16, 54), (9, 42), (6, 38)], 6, 4, prickles=[(0.4, -1), (0.7, -1)])
    hip(s, 5, 44, 4.6)
    leaflets(s, (26, 56), (48, 48), n=3, size=4.8)
    cane(s, [(26, 76), (27, 54), (28, 38)], 8, 7, prickles=[(0.3, -1), (0.6, 1)])
    cx, cy, R = 29, 27, 17
    for i in range(5):
        a = math.radians(-60 + 72 * i)
        m = s.ellipse(cx + math.cos(a) * R * 0.48, cy + math.sin(a) * R * 0.40, R * 0.52, R * 0.44, ang=-a)
        pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
        rim_white(s, m, pid, 0.4)
    for i in range(5):
        a = math.radians(-24 + 72 * i)
        mm, _ = s.leaf((cx, cy), (cx + math.cos(a) * R * 0.62, cy + math.sin(a) * R * 0.54), 4.4, fat=0.3)
        s.part(mm, base=1, k=0, line=0)
    hm = s.ellipse(cx, cy, 3.4, 3.2)
    hid = s.part(hm, base=1, k=0, line=0)
    rim_white(s, hm, hid, 0.5)
    return s


ICONS = {
    "rose_bud": [
        "................",
        "...kk...........",
        "..k23k..........",
        ".k2232k.........",
        ".k2222k.........",
        "k1k22k1k........",
        ".kk11kk..kkk....",
        "...k1k..k311k...",
        "...k1k.kk11k....",
        "..k1kkk1kkk.....",
        "..k1k.kk........",
        "...k1kk.........",
        "..kk11kk........",
        ".k311kk1k.......",
        "..kkk.k11k......",
        "......kkkk......",
    ],
    "wild_rose": [
        "................",
        "..kk.kk.........",
        ".k22k22k........",
        "k2223222kk......",
        "k2k333k22k......",
        ".k23332k2k......",
        "k222322kkk..kk..",
        "k22k2k222k.k12k.",
        ".kk.kk2kkkk1kk..",
        ".....kk1k1kk....",
        "......k11k......",
        ".....k1kk.......",
        "...kkk1k........",
        "..k311k1k.......",
        "...kk.k11k......",
        "......kkkk......",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "rose_bud": {"intro": [[0, 6], [1, 14], [2, 4], [2, 16], [3, 8], [0, 8]],
                 "idle": [[0, 120], [3, 10]]},
    "wild_rose": {"intro": [[0, 6], [1, 14], [2, 4], [2, 14], [3, 12], [0, 8]],
                  "idle": [[0, 130], [3, 8]]},
}

NOTES = {
    "rose_bud": "Crystal rule. COILED: a prickled cane curled into an S, the tight bud pulled back and tilted at "
                "the foe, sepals flaring like claws, a pinnate leaf raised as a guard. Gesture: the sepals clench, "
                "then fling wide as the bud swells and cracks a sliver of pale petal, hold, settle. Two hues: the "
                "cane green is the dark slot; leaflets are flat green lit by pink margins. Sport: 'Persian Yellow'.",
    "wild_rose": "Crystal rule. LUNGING: the open dog rose thrust at the foe on an arching cane, a prickled cane "
                 "arm forward, the rear cane arched back carrying two hips (the tail). Gesture: the bloom draws "
                 "back cupped, thrusts with its petals flaring, holds, a glint gleams, settle. "
                 "Sport: 'Persian Yellow'.",
}

SPECS = {"rose_bud": (bud_frames, bud_back), "wild_rose": (rose_frames, rose_back)}


def render():
    out = {}
    for sid, (ffn, bfn) in SPECS.items():
        out[sid] = (ffn(), back_frame(bfn), icon_frames(sid))
    return out


def build():
    from kit import write_species, intro_strip
    for sid, (front, back, icons) in render().items():
        write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
        intro_strip(sid)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = render()
        rows = []
        for sid, (front, back, icons) in out.items():
            for i, f in enumerate(front):
                stats(f"{sid}[{i}]", f)
            stats(f"{sid} back", back)
            rows.append((PAL, front + [back] + icons))
            rows.append((SPORT, front[:1]))
        print(preview(rows, sys.argv[-1]))
    else:
        build()
