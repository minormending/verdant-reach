"""Crystal rule, lodgepole line: lodgepole_cone -> lodgepole_seedling ->
lodgepole_pine (Pinus contorta).

  index 0  #181818  outline, the needles' shade side, the cone's scale seams,
           the ash heap (shared)
  index 1  BARK BROWN: the cone, the bark, the seedling's red-brown stem
  index 2  needle green: the needles
  index 3  #f8f8f8  resin glaze on the sealed scales, light rims on the lit
           side of the needle tufts, ash flecks

Two hues, the oak's way: the second hue (bark and cone brown) lives in the
dark slot. The needles do not shade to brown (brown shading on green read as
dead needles); they shade to black, and the brown is kept for what is
really brown: the cone, the trunk and the seedling's stem.

Poses (docs/CREATURES.md section 4.3):
  lodgepole_cone      BRACED: a squat, closed serotinous cone sitting tilted
                      at the foe on a little heap of char and ash, a snapped
                      twig with three paired-needle bundles behind it as the
                      rear arm. The resin seal is the white glaze on the
                      scale rims.
  lodgepole_seedling  BRACED: a first-year pine on a thin red-brown stem,
                      topped by its whorl of seed needles (cotyledons) fanned
                      out like a spiked crown, the seed coat still caught on
                      one needle tip, the terminal bud pushing up.
  lodgepole_pine      LOOMING, but straight: the design call is a tall, very
                      straight, narrow pine (self-pruned, bare lower bole,
                      a short narrow crown of needle tufts). The asymmetry
                      lives in the crown: the boughs reach further on the
                      foe side, and the leader bends a little toward it.
                      Closed cones cling to the trunk under the crown.

Entrance animations (only the cone scales and needles move; the ash heap,
stem and trunk are pixel-identical):
  lodgepole_cone      the cone squeezes (anticipation), then its scales
                      CRACK OPEN (serotiny), hold, the needles shiver, it
                      seals again.
  lodgepole_seedling  the needle whorl draws in, then flares wide and
                      shivers, rebounds, settles.
  lodgepole_pine      the crown leans back, then every tuft shivers, the
                      cones crack open on the trunk, hold, settle.

Sport: 'Chief Joseph' (Pinus contorta var. latifolia 'Chief Joseph'): its
needles turn bright gold in winter; in two tones a golden needle light and a
warm bark brown.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/lodgepole.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py lodgepole --sheet        write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, stalk, preview, stats)

TOOL = "tools/art/crystal/lodgepole.py"
IDS = ["lodgepole_cone", "lodgepole_seedling", "lodgepole_pine"]
BARK = "#885028"
NEEDLE = "#58a840"
PAL = [BLACK, BARK, NEEDLE, WHITE]
SPORT = [BLACK, "#805830", "#d8c030", WHITE]
SPAL = (BARK, NEEDLE, WHITE)


# ---------------------------------------------------------------------------
# shared parts
# ---------------------------------------------------------------------------

def rot_pts(pts, deg, cx, cy):
    """+deg turns the top toward the foe (left)."""
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c + (y - cy) * s_, cy - (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def cone(s, cx, cy, h, w, deg, open_=0.0, squeeze=0.0, rows=6, glaze=True, beads=(), seeds=False):
    """A pine cone, base at (cx, cy), axis tilted deg toward the foe. Its
    scales (apophyses) sit in offset rows; black seams fall out of the inner
    lines. open_ (0..1) pushes every scale out from the axis over a black core
    (serotiny: the resin seal breaks); squeeze narrows it (anticipation)."""
    w = w * (1 - 0.12 * squeeze)
    h = h * (1 + 0.05 * squeeze)
    a = math.radians(deg)
    ax, ay = -math.sin(a), -math.cos(a)            # unit axis, base -> tip
    nx, ny = -ay, ax                               # across (to the right of the axis when deg=0)

    def P(u, v):
        """u along the axis 0..1, v across in px."""
        return (cx + ax * u * h + nx * v, cy + ay * u * h + ny * v)

    def half(u):
        # egg profile: widest a third of the way up, rounded tip, blunt base
        return w / 2 * (math.sin(math.pi * min(1.0, 0.18 + u * 0.95)) ** 0.7)

    prof = [P(u, -half(u)) for u in np.linspace(0, 1, 24)] + [P(u, half(u)) for u in np.linspace(1, 0, 24)]
    core = s.poly(prof)
    if open_:
        s.part(s.poly([P(u, -half(u) * 0.8) for u in np.linspace(0.02, 0.95, 20)]
                      + [P(u, half(u) * 0.8) for u in np.linspace(0.95, 0.02, 20)]), base=0, k=0, line=0)
    else:
        s.part(core, base=1, k=2, sh_tone=0, line=0)
    pids = []
    for r in range(rows):
        u = 0.08 + r * (0.86 / (rows - 1))
        hw = half(u)
        n = 4 if 0 < r < rows - 1 else 3
        off = 0.5 if r % 2 else 0.0
        for c_ in range(n + (1 if off else 0)):
            vfrac = (c_ - (n - 1) / 2 - off) / max(1.0, n - 0.4)
            if abs(vfrac) > 0.75:
                continue
            v = vfrac * hw * 2
            # the scale: a diamond, flatter at the edges of the cone (foreshortened)
            sw = hw * 0.62 * (1 - 0.40 * abs(vfrac))
            sh = h * 0.86 / (rows - 1) * 0.78
            push = open_ * (2.2 + 1.6 * abs(vfrac))
            pu = u * (1 + open_ * 0.10)
            cxs, cys = P(pu, v + math.copysign(push, v) if abs(vfrac) > 0.05 else v)
            pts = [(cxs - ax * sh, cys - ay * sh), (cxs + nx * sw, cys + ny * sw),
                   (cxs + ax * sh * 1.1, cys + ay * sh * 1.1), (cxs - nx * sw, cys - ny * sw)]
            if open_:
                # the open scale lifts its outer tip away from the axis
                lift = open_ * 1.4 * (1 if v >= 0 else -1)
                pts[2] = (pts[2][0] + nx * lift, pts[2][1] + ny * lift)
            m = s.poly(pts) & (dilate(core, 2) if open_ else core)
            pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
            if glaze and not open_ and vfrac <= 0.45:
                rim_white(s, m, pid, 0.75)
            pids.append(pid)
    for bu, bv in beads:
        x, y = P(bu, bv)
        s.glint([(x, y), (x + 1, y)])
    if open_ >= 0.6 and seeds:
        # winged seeds glint in the opened gaps
        for su, sv in ((0.42, -0.30), (0.62, 0.22), (0.28, 0.12), (0.52, -0.02), (0.74, -0.18), (0.2, -0.28)):
            x, y = P(su, sv * w)
            s.glint([(x, y), (x + 1, y)])
    return pids, core


def ash_heap(s, x0, x1, y, hgt, flecks):
    """A low heap of char and ash: black, with white ash flecks on top."""
    pts = [(x0, y)]
    for t in np.linspace(0, 1, 16):
        pts.append((x0 + (x1 - x0) * t, y - hgt * math.sin(math.pi * t) ** 0.6))
    pts.append((x1, y))
    m = s.poly(pts)
    s.part(m, base=0, k=0, line=0)
    # each fleck is a 2px dash (a lone pixel would be swept as an orphan)
    s.px([(int(x) + d, int(y_)) for x, y_ in s.T(flecks) for d in (0, 1)], 3)
    return m


def needle_pair(s, base, deg, L, spread=16, w=2.2, rim=True):
    """A fascicle of two needles (lodgepole needles come in pairs)."""
    bx, by = base
    out = []
    for d in (-spread / 2, spread / 2):
        a = math.radians(deg + d)
        tip = (bx + math.cos(a) * L, by - math.sin(a) * L)
        mid = (bx + math.cos(a) * L * 0.55, by - math.sin(a) * L * 0.55 - 0.6)
        pid, m, _ = stalk(s, [base, mid, tip], w, 0.9, base=2, k=1, sh_tone=0, vein=None)
        if rim:
            rim_white(s, m, pid, 0.35)
        out.append(pid)
    return out


def tuft(s, cx, cy, rx, ry, spikes=9, spike=2.2, ang=0.0, rim=0.5, k=2):
    """A tuft of needles seen as one mass: an ellipse whose rim breaks into
    needle points, shaded black on the bottom-right, a white rim top-left."""
    pts = []
    n = spikes * 2
    for i in range(n):
        t = math.pi * 2 * i / n + ang
        r = 1.0 if i % 2 else 0.0
        ex = rx + spike * r
        ey = ry + spike * r * 0.8
        # needle points mostly on the sides and the bottom (needles droop and splay)
        pts.append((cx + ex * math.cos(t), cy + ey * math.sin(t) * (0.8 if math.sin(t) < 0 else 1.0)))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=k, sh_tone=0, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


# ---------------------------------------------------------------------------
# lodgepole_cone: BRACED
# ---------------------------------------------------------------------------

# (open, squeeze, needle deg offset)
CONE_KEYS = [
    (0.0, 0.0, 0),     # 0 rest: sealed
    (0.0, 1.0, -6),    # 1 squeeze (anticipation)
    (1.0, 0.0, 8),     # 2 CRACK: the scales open
    (0.6, 0.0, -4),    # 3 shiver, half open
]


def cone_front(f=0):
    op, sq, nd = CONE_KEYS[f]
    s = Spr(64, 60, SPAL, sc=1.0)
    with s.untilted():
        heap = ash_heap(s, 10, 52, 57.5, 5, [(18, 54), (22, 53), (34, 53), (41, 54), (45, 55), (28, 53)])
    before = s.tone.copy()
    # the snapped twig behind (rear arm), with three needle pairs
    _, tw, _ = stalk(s, [(33, 50), (41, 44), (49, 36)], 3.6, 2.4, base=1, k=1, sh_tone=0, vein=None)
    for b, d, L in (((44, 41.5), 60 + nd, 13), ((48.5, 37), 82 + nd, 12), ((41, 44.5), 22 + nd * 0.5, 11)):
        needle_pair(s, b, d, L, spread=24, w=3.0, rim=False)
    cone(s, 30, 54, 31, 21, 22, open_=op, squeeze=sq, rows=6, seeds=True,
         beads=[(0.55, -2.5), (0.3, 4), (0.78, 1.5)] if not op else [])
    s.headm = (s.tone != before)
    s.contact += [(16, 24), (36, 44)]
    return s


def cone_frames():
    return place(frames(cone_front, len(CONE_KEYS)), 56, dx=1)


def cone_back():
    """From behind and above: the cone's rounded back leaning top-left at the
    foe, the twig and its needle pairs on the right, ash below."""
    s = Spr(48, 60, SPAL)
    stalk(s, [(26, 52), (36, 44), (46, 30)], 5, 3.4, base=1, k=1, sh_tone=0, vein=None)
    for b, d, L in (((38, 42), 64, 15), ((44, 33), 84, 13)):
        needle_pair(s, b, d, L, spread=20, w=3)
    cone(s, 22, 62, 40, 28, 18, rows=6)
    return s


# ---------------------------------------------------------------------------
# lodgepole_seedling: BRACED (a whorl of seed needles)
# ---------------------------------------------------------------------------

# (spread deg, length scale, shiver sign)
SEED_KEYS = [
    (0, 1.00, 0),     # 0 rest
    (-14, 0.90, 0),   # 1 draw in
    (12, 1.06, 1),    # 2 FLARE and shiver
    (7, 1.03, -1),    # 3 shiver back
]

# the cotyledon whorl: (angle deg, 0 = right, 90 = up; length; z: 0 back, 1 front)
WHORL = [(124, 18, 0), (102, 18, 0), (80, 17, 0), (58, 18, 0), (38, 18, 0),
         (162, 20, 1), (142, 21, 1), (18, 19, 1)]


def needle(s, base, a, L, w0, rim=0.0, curl=1.4, k=1):
    r = math.radians(a)
    bx, by = base
    mid = (bx + math.cos(r) * L * 0.5, by - math.sin(r) * L * 0.5 - curl)
    tip = (bx + math.cos(r) * L, by - math.sin(r) * L)
    pid, m, _ = stalk(s, [base, mid, tip], w0, 1.0, base=2, k=k, sh_tone=0, vein=None)
    if rim:
        rim_white(s, m, pid, rim)
    return tip


def seed_front(f=0):
    sp, ls, jit = SEED_KEYS[f]
    s = Spr(64, 64, SPAL, sc=1.2)
    with s.untilted():
        ash_heap(s, 16, 48, 61.5, 4.5, [(21, 60), (26, 58.5), (37, 59), (42, 60)])
    stalk(s, [(32, 60), (32.5, 54), (31, 47)], 4.4, 3.4, base=1, k=1, sh_tone=0, vein=None)
    before = s.tone.copy()
    hx, hy = 31, 46
    tips = {}
    for i, (a, L, z) in enumerate(WHORL):
        side = -1 if a > 90 else 1
        a2 = a + side * sp * (0.6 if z == 0 else 1.0) + jit * 4 * (1 if i % 2 else -1)
        tips[a] = needle(s, (hx, hy), a2, L * ls, 3.2 if z else 2.8,
                         rim=0.5 if (z and a > 100) else 0.0, curl=0.6, k=0)
    # the first true needles: a short tuft and the terminal bud, rising from the whorl
    for a, L in ((114, 10), (68, 10)):
        needle(s, (hx, hy - 1), a + jit * 3, L * ls, 2.8, rim=0.5 if a > 90 else 0.0, curl=0.4, k=0)
    bud = s.leaf((hx, hy), (hx - 0.5, hy - 9 * ls), 4.4, fat=0.42)[0]
    pid = s.part(bud, base=2, k=1, sh_tone=0)
    rim_white(s, bud, pid, 0.6)
    # the seed coat, still caught on a needle tip (the front-left one)
    tx, ty = tips[102]
    coat = s.ellipse(tx, ty - 1.2, 2.0, 2.8, ang=math.radians(15))
    s.part(coat, base=1, k=1, sh_tone=0)
    s.glint([(tx - 1, ty - 2.5)])
    s.headm = (s.tone != before)
    s.contact += [(20, 27), (36, 44)]
    return s


def seed_frames():
    return place(frames(seed_front, len(SEED_KEYS)), 56, dx=1)


def seed_back():
    s = Spr(48, 64, SPAL)
    stalk(s, [(24, 70), (24, 56), (25, 46)], 7, 6, base=1, k=1, sh_tone=0, vein=None)
    hx, hy = 25, 45
    for a, L, w in ((120, 18, 4), (92, 16, 4), (64, 18, 4), (174, 24, 4.6), (148, 25, 4.6), (34, 25, 4.6),
                    (6, 22, 4.6)):
        needle(s, (hx, hy), a, L, w, rim=0.35 if a > 90 else 0.15, curl=2)
    bud = s.leaf((hx, hy), (hx + 1, hy - 14), 6, fat=0.42)[0]
    pid = s.part(bud, base=2, k=1, sh_tone=0)
    rim_white(s, bud, pid, 0.5)
    return s


# ---------------------------------------------------------------------------
# lodgepole_pine: LOOMING (straight and narrow)
# ---------------------------------------------------------------------------

# (crown lean px at the top, shiver sign, cone open)
PINE_KEYS = [
    (0, 0, 0.0),      # 0 rest
    (1.5, 0, 0.0),    # 1 lean back (anticipation)
    (-1.5, 1, 1.0),   # 2 SHIVER, the cones crack open
    (-0.5, -1, 0.7),  # 3 shiver back
]

# needle tufts at the branch tips: (cx, cy, rx, ry, side); side -1 = foe side,
# +1 = behind, 0 = on the trunk. Drawn in this order (rear first).
PTUFTS = [
    (37, 10, 3.5, 2.8, 1), (39, 16.5, 5, 3, 1), (40.5, 23, 6, 3.2, 1), (41.5, 29.5, 7, 3.4, 1),
    (40.5, 36, 6, 3, 1),
    (33, 4, 2.6, 4, 0),
    (30, 9.5, 4.5, 2.8, -1), (27.5, 16, 6.5, 3.1, -1), (26, 22.5, 8, 3.3, -1), (25, 29, 9, 3.5, -1),
    (26.5, 35.5, 8, 3.1, -1),
]


def brush(s, cx, cy, rx, ry, spikes=None, rim=0.5, k=2):
    """A pine needle tuft at a branch tip: a rounded base with the needles
    brushing up and out in points along the top, shaded black underneath."""
    spikes = spikes or max(4, int(rx * 1.3))
    pts = []
    # bottom arc (smooth), right to left
    for t in np.linspace(0, math.pi, 12):
        pts.append((cx + rx * math.cos(t), cy + ry * 0.75 * math.sin(t)))
    # top: needle points splaying out and up, left to right
    n = spikes * 2
    for i in range(n + 1):
        t = math.pi + math.pi * i / n
        r = 1.0 + (0.45 if i % 2 else 0.0)
        x = cx + rx * r * math.cos(t) * (1.08 if i % 2 else 0.9)
        y = cy + ry * r * math.sin(t) * (1.1 if i % 2 else 0.7)
        pts.append((x, y))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=k, sh_tone=0, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


def pine_front(f=0):
    lean, sh, op = PINE_KEYS[f]
    s = Spr(64, 64, SPAL, sc=0.845)
    with s.untilted():
        stalk(s, [(33, 57), (29, 60.5), (25, 62)], 3.6, 2.0, base=1, k=1, sh_tone=0, vein=None)
        stalk(s, [(35, 57), (39, 60.5), (43, 62)], 3.6, 2.0, base=1, k=1, sh_tone=0, vein=None)
    stalk(s, [(34, 62), (34, 30), (33.5, 5)], 5.4, 2.4, base=1, k=2, sh_tone=0, vein=None, cap=False,
          rim=0.25)
    for y in (39, 51, 56):
        s.decal(s.line1([(32.5, y), (33.5, y + 1.6)]), 0)
    before = s.tone.copy()

    def L(x, y, i):
        k = max(0.0, (46 - y) / 40)
        return x + lean * k + sh * (1 if i % 2 else -1), y

    # branches first (brown, upturned toward their tufts), then the tufts
    for i, (cx, cy, rx, ry, side) in enumerate(PTUFTS):
        if side:
            x, y = L(cx, cy, i)
            jx = 34 + side * 1.0
            stalk(s, [(jx, cy + 2.5), (x + side * rx * 0.6, y + 1.5)], 2.2, 1.4, base=1, k=0, vein=None)
    for i, (cx, cy, rx, ry, side) in enumerate(PTUFTS):
        x, y = L(cx, cy, i)
        brush(s, x, y, rx, ry, rim=0.55 if side <= 0 else 0.3)
    # closed cones clinging to the bole under the crown (they crack open on frame 2)
    for bx, by, d in ((31.5, 43.5, 44), (36.5, 47, -40)):
        cone(s, bx, by, 8, 6.4, d, open_=op, rows=3, glaze=True)
    s.headm = (s.tone != before)
    s.contact += [(22, 27), (41, 46)]
    return s

def pine_frames():
    return place(frames(pine_front, len(PINE_KEYS)), 56, dx=0)


def pine_back():
    """From behind and below the crown: the straight bole rising into tufts
    on upturned branches, the foe-side boughs (now on the right) reaching
    further."""
    s = Spr(48, 64, SPAL)
    stalk(s, [(24, 72), (24, 30), (24.5, 2)], 9, 4, base=1, k=2, sh_tone=0, vein=None)
    tufts = [(18, 12, 5, 3.6, -1), (16, 21, 7, 4, -1), (15, 30, 8, 4.4, -1), (16, 39, 7, 4, -1),
             (24, 4, 3.4, 5, 0),
             (30, 11, 6, 3.8, 1), (33, 20, 9, 4.2, 1), (35, 29, 10.5, 4.6, 1), (34, 38, 9.5, 4.2, 1)]
    for cx, cy, rx, ry, side in tufts:
        if side:
            stalk(s, [(24 + side * 1.5, cy + 3), (cx + side * rx * 0.6, cy + 1.5)], 3, 2,
                  base=1, k=0, vein=None)
    for cx, cy, rx, ry, side in tufts:
        brush(s, cx, cy, rx, ry, rim=0.5)
    return s


# ---------------------------------------------------------------------------
# icons
# ---------------------------------------------------------------------------

ICONS = {
    "lodgepole_cone": [
        "..........k.k...",
        ".........k2k2k..",
        "....kkk..k2k2k..",
        "...k331k.k22kk..",
        "..k3k1k1kk1k....",
        "..k31k31k1k.....",
        ".k1k11k1k1k.....",
        ".k31k31k11k.....",
        ".k1k11k1k1k.....",
        "..k31k31k1k.....",
        "..k1k11k1k......",
        "...kk1k1kk......",
        ".kkkkkkkkkkk....",
        "k033000033000k..",
        "kkkkkkkkkkkkkk..",
    ],
    "lodgepole_seedling": [
        "......kk........",
        ".....k31k.......",
        ".k...k11k...k...",
        "k2k.k2kk2k.k2k..",
        ".k2kk2k2k2kk2k..",
        "k22k2k232k2k22k.",
        ".kk22k232k22kk..",
        "...kk22322kk....",
        ".....kk1kk......",
        "......k1k.......",
        "......k1k.......",
        "....kkk1kkk.....",
        "...k3000300k....",
        "...kkkkkkkkk....",
    ],
    "lodgepole_pine": [
        ".......k........",
        "......k3k.......",
        ".....k232k......",
        "....k32222k.....",
        ".....k2k22kk....",
        "...k3222222k....",
        "....kk2k222kk...",
        "..k322222222k...",
        "...kkk2k22kkk...",
        "......k1k.......",
        "......k1k.......",
        "......k1k.......",
        ".....k111k......",
        ".....kkkkk......",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "lodgepole_cone": {"intro": [[0, 6], [1, 14], [2, 4], [2, 18], [3, 6], [2, 6], [0, 6]],
                       "idle": [[0, 130], [3, 8]]},
    "lodgepole_seedling": {"intro": [[0, 6], [1, 12], [2, 4], [3, 4], [2, 14], [3, 8], [0, 6]],
                           "idle": [[0, 120], [3, 8]]},
    "lodgepole_pine": {"intro": [[0, 6], [1, 14], [2, 4], [3, 4], [2, 16], [3, 8], [0, 6]],
                       "idle": [[0, 140], [3, 8]]},
}

NOTES = {
    "lodgepole_cone": "Crystal rule. BRACED: a squat, closed serotinous cone tilted at the foe on a heap of char "
                      "and ash, a snapped twig with three paired-needle bundles behind it. The resin seal is "
                      "the white glaze on the scale rims. Gesture: the cone squeezes, then its scales CRACK "
                      "OPEN over the black core (serotiny), hold, the needles shiver, it seals again. Two hues: "
                      "bark/cone brown in the dark slot; the needles shade to black. Sport: 'Chief Joseph' "
                      "(golden winter needles).",
    "lodgepole_seedling": "Crystal rule. BRACED: a first-year pine on a thin red-brown stem rising from ash, "
                          "its whorl of seed needles (cotyledons) fanned out like a spiked crown, the seed "
                          "coat still caught on one needle tip, the terminal bud pushing up. Gesture: the whorl "
                          "draws in, then flares wide and shivers, settles. Sport: 'Chief Joseph'.",
    "lodgepole_pine": "Crystal rule. LOOMING, but straight and narrow as the real tree: a self-pruned bare bole "
                      "on two root feet, a short narrow crown of needle tufts reaching further on the foe "
                      "side, the leader bent toward it, closed cones clinging to the trunk. Gesture: the crown "
                      "leans back, then every tuft shivers and the cones crack open, settle. Sport: 'Chief "
                      "Joseph' (golden winter needles).",
}

SPECS = {"lodgepole_cone": (cone_frames, cone_back), "lodgepole_seedling": (seed_frames, seed_back),
         "lodgepole_pine": (pine_frames, pine_back)}


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
