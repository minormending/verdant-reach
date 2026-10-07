"""Crystal rule, ghostpipe line: ghostpipe_stalk -> ghostpipe_nodding -> ghost_pipe
(Monotropa uniflora, the ghost pipe or Indian pipe; Chapter 5).

Ghost pipe has no chlorophyll: the whole plant is waxy white, and every stem
carries one bell that nods on a hooked neck (the "pipe") and lifts upright as
it fruits. It is one of the white-part species (kit.WHITE_PARTS): the white
is the plant's real colour, so a front may carry up to 35% white, but it is
always shaded. The lilac-grey light slot is the cool shade of the wax and
the violet dark slot carries the form (the crescent on every stem and bell,
the leaf litter), so the white never sits as a flat blob.

  index 0  #181818  outline, the bell's mouth seam, the litter's crevices (shared)
  index 1  dusky violet-grey: the deep shade of the wax, the dead leaves
  index 2  cool pale lilac-grey: the wax in shade, the scale leaves
  index 3  #f8f8f8  the lit wax (a white part, not highlight spam)

No faces: a bell hangs side-on, its mouth a thin lilac lip ringed by petal
tips, never a dark disc; the scale leaves are lilac flecks, not glints.

Poses (docs/CREATURES.md):
  ghostpipe_stalk    COILED   one fat stem bent like a question mark, pushing
                              out of the leaf litter, its scaled bud tucked
                              under the hook toward the foe.
  ghostpipe_nodding  COILED   taller, a clear pipe: a crook carrying one big
                              nodding bell at the foe, two scale bracts
                              flared as arms.
  ghost_pipe         LOOMING  a clump of five waxy pipes fanning out of the
                              litter, heads at every stage between nodding
                              and lifted.

Entrance animations (the signature: the nodding heads lift and sway):
  stalk    the hook dips (wind-up), the bud LIFTS to the foe, sways back,
           and droops to rest.
  nodding  the bell dips, LIFTS upright, sways over, rebounds, and nods.
  pipe     the heads dip, then four LIFT upright together (as they do when
           they fruit; one short pipe stays nodding), sway, and settle back.

Sport: the natural pink form of Monotropa uniflora: pale rose wax with a
dusky rose shade (docs/SPORTS.md).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/ghostpipe.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py ghostpipe                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, preview, stats, shift)

TOOL = "tools/art/crystal/ghostpipe.py"
IDS = ["ghostpipe_stalk", "ghostpipe_nodding", "ghost_pipe"]
DARK = "#605070"     # dusky violet-grey
MID = "#b0a8c8"      # cool pale lilac-grey
PAL = [BLACK, DARK, MID, WHITE]
SPORT = [BLACK, "#985068", "#e8b0c8", WHITE]   # the pink form of Monotropa uniflora
SPAL = (DARK, MID, WHITE)


# ---------------------------------------------------------------- parts ---

class Tall(Spr):
    """A Spr whose geometry is shifted down by `oy` (headroom for heads that
    lift above the rest pose) and right by `ox`."""
    oy = 0

    def T(self, pts):
        return super().T([(x, y + self.oy) for x, y in pts])


def neck_path(jx, jy, phi0, L, theta, p=2.0, n=60):
    """A stem from the joint (jx, jy) heading phi0 (screen radians; -pi/2 is
    up) that turns toward the foe (left) by theta in total, the bend packed
    toward the tip (the pipe's crook). Returns the dense path."""
    pts = [(jx, jy)]
    x, y = jx, jy
    ds = L / (n - 1)
    for i in range(1, n):
        t = i / (n - 1)
        phi = phi0 - theta * t ** p
        x += math.cos(phi) * ds
        y += math.sin(phi) * ds
        pts.append((x, y))
    return pts


def end_dir(path):
    (x0, y0), (x1, y1) = path[-4], path[-1]
    return math.atan2(y1 - y0, x1 - x0)


def wax_stem(s, path, w0, w1, merge=(), line=0, k=5, deep=2, edge=1):
    """A waxy stem: a lilac reflected rim on the lit (left) edge, then the
    white lit plane, a lilac band and a violet crescent on the shade
    (bottom-right) side, so the white reads as a lit cylinder of wax."""
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=3, k=k, deep=deep, sh_tone=2, line=line, merge=merge, shadow=(1, 0.35))
    rim = np.zeros_like(m)
    for d in range(1, edge + 1):
        rim |= m & ~shift(m, -d, 0)
    s.decal(rim & shift(m, 2, 0), 2, on=[pid])
    return pid, m


def scales(s, path, ts, width, size, on, sides=None):
    """Scale leaves along a stem (path, full width `width` there): small
    pointed bracts pressed to it, tips up the stem. On the stem's edge a
    scale juts past the silhouette (a waxy tooth with its own outline); on
    the face (side 0) it is a lilac chevron."""
    n = len(path)
    out = []
    for j, t in enumerate(ts):
        i = min(n - 2, max(1, int(t * (n - 1))))
        (x0, y0), (x1, y1) = path[i - 1], path[i + 1]
        L = math.hypot(x1 - x0, y1 - y0) or 1.0
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = -uy, ux
        sd = sides[j] if sides is not None else (1 if j % 2 else -1)
        bx, by = path[i]
        if sd == 0:
            a = (bx - nx * size * 0.5 - ux * size * 0.2, by - ny * size * 0.5 - uy * size * 0.2)
            b = (bx + ux * size * 0.6, by + uy * size * 0.6)
            c = (bx + nx * size * 0.5 - ux * size * 0.2, by + ny * size * 0.5 - uy * size * 0.2)
            s.decal(s.line1(bez([a, b, c], 8)) & erode(np.isin(s.pid, on), 1), 2, on=on)
            continue
        hw = (width[j] if isinstance(width, (tuple, list)) else width) / 2
        base = (bx + nx * sd * (hw - 1.6) - ux * size * 0.3, by + ny * sd * (hw - 1.6) - uy * size * 0.3)
        tip = (bx + nx * sd * (hw + size * 0.55) + ux * size * 1.1, by + ny * sd * (hw + size * 0.55) + uy * size * 1.1)
        m, _ = s.leaf(base, tip, size * 0.75, bend=-0.12 * sd, fat=0.35)
        pid = s.part(m, base=3, k=1, sh_tone=2, line=0)
        out.append((pid, m))
    return out


def bell(s, ax, ay, ang, L, W, flare=1.0, collar=True, base=0.34):
    """A ghost-pipe bell hung from (ax, ay), its axis pointing `ang` (screen
    radians; pi/2 = straight down). Waxy petals (two lilac seams), the tips
    flared and toothed at the mouth, the mouth's inner face a thin violet
    lip; a collar of two scale bracts at its base."""
    c, s_ = math.cos(ang), math.sin(ang)

    def tr(pts):
        return [(ax + u * c - v * s_, ay + u * s_ + v * c) for u, v in pts]
    hw = W / 2
    prof = [(0.0, base), (0.18, base + (0.72 - base) * 0.6), (0.45, 0.84), (0.72, 0.93), (0.87, 1.0 * flare),
            (0.96, 1.08 * flare)]
    left = [(u * L, -w * hw) for u, w in prof]
    right = [(u * L, w * hw) for u, w in prof]
    mouth = [(L * 1.04, -0.92 * flare * hw), (L * 0.95, -0.50 * flare * hw), (L * 1.05, -0.05 * flare * hw),
             (L * 0.95, 0.42 * flare * hw), (L * 1.04, 0.88 * flare * hw)]
    poly = left + mouth + right[::-1]
    m = s.poly(tr(bez(poly, 4)))
    pid = s.part(m, base=3, k=4, deep=1, sh_tone=2, line=0, shadow=(1, 0.35))
    out = [pid]
    for v in (-0.30, 0.38):
        seam = tr(bez([(L * 0.30, v * hw * 0.85), (L * 0.62, v * hw * 1.0), (L * 0.90, v * hw * 1.10)], 10))
        s.decal(s.line1(seam) & erode(m, 1), 2, on=[pid])
    lip = s.ellipse(*tr([(L * 0.93, 0.0)])[0], max(1.0, hw * 0.80 * flare), max(0.8, L * 0.07), ang=ang + math.pi / 2)
    s.decal(lip & erode(m, 1), 1, on=[pid])
    if collar:
        for v, du in ((-0.55, 0.30), (0.60, 0.28)):
            b0 = tr([(-L * 0.06, v * hw * 0.45)])[0]
            t0 = tr([(L * du, v * hw * 0.98)])[0]
            cm, _ = s.leaf(b0, t0, max(2.4, hw * 0.62), bend=-0.08 * (1 if v >= 0 else -1), fat=0.4)
            out.append(s.part(cm, base=3, k=2, deep=1, sh_tone=2, line=0, shadow=(1, 0.35)))
    return out


def litter(s, cx, cy, w, h, spec=None):
    """A mound of dead leaves: violet blades with lilac ribs and rims, black
    crevices between them; lilac leaves tipped up on top. spec: a list of
    (base (dx, dy), tip (dx, dy), width, bend, tone) relative to (cx, cy) in
    units of (w, h)."""
    spec = spec or [
        ((-0.50, 0.30), (0.05, -0.30), 1.15, 0.14, 1),
        ((0.52, 0.35), (-0.02, -0.25), 1.10, -0.16, 1),
        ((-0.10, 0.50), (-0.62, -0.05), 0.95, -0.10, 2),
        ((0.15, 0.55), (0.60, -0.15), 0.85, 0.12, 2),
    ]
    ids = []
    for (bx, by), (tx, ty), ww, bend, tone in spec:
        base = (cx + bx * w, cy + by * h)
        tip = (cx + tx * w, cy + ty * h)
        m, path = s.leaf(base, tip, ww * h, bend=bend, fat=0.5)
        if tone == 1:
            pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
            s.decal(s.line1(path[10:-12]), 2, on=[pid])
            rim_white(s, m, pid, 0.35, tone=2)
        else:
            pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
            s.decal(s.line1(path[10:-12]), 1, on=[pid])
            rim_white(s, m, pid, 0.25, tone=3)
        ids.append(pid)
    return ids


def bud_head(s, ax, ay, ang, L, W, merge=(), line=None, bract=False, k=3, deep=1):
    """The closed bud of a young pipe, hung from (ax, ay) along `ang`: the
    neck swells into a smooth waxy club (it joins the neck without a seam,
    so the hook reads as one shape). The furled bracts show as lilac
    V-seams pointing to the tip, and one bract tip lifts off its back."""
    c, s_ = math.cos(ang), math.sin(ang)

    def tr(pts):
        return [(ax + u * c - v * s_, ay + u * s_ + v * c) for u, v in pts]
    hw = W / 2
    core = [(-0.10, -0.32), (0.30, -0.50), (0.70, -0.46), (0.97, -0.16), (1.02, 0.04), (0.84, 0.36),
            (0.42, 0.50), (-0.10, 0.32)]
    m = s.poly(tr(bez([(u * L, v * W) for u, v in core + [core[0]]], 8)))
    pid = s.part(m, base=3, k=k, deep=deep, sh_tone=2, line=line, merge=merge, shadow=(1, 0.35))
    for u in (0.46, 0.78):
        v = tr(bez([(L * (u - 0.26), -hw * 0.62), (L * u, -hw * 0.06), (L * (u - 0.22), hw * 0.62)], 10))
        s.decal(s.line1(v) & erode(m, 1), 2, on=[pid])
    if not bract:
        return [pid]
    # one bract tip lifting off the outer (lit) flank
    b0 = tr([(L * 0.20, -hw * 0.50)])[0]
    t0 = tr([(L * 0.62, -hw * 1.05)])[0]
    cm, _ = s.leaf(b0, t0, max(2.2, hw * 0.70), bend=0.10, fat=0.4)
    return [pid, s.part(cm, base=3, k=1, sh_tone=2, line=0, shadow=(1, 0.35))]


def ghost_head(s, path, L, W, flare=1.0):
    """The bell at the end of a neck path."""
    ex, ey = path[-1]
    a = end_dir(path)
    return bell(s, ex - math.cos(a) * 0.5, ey - math.sin(a) * 0.5, a, L, W, flare)


# ---------------------------------------------------------------------------
# ghostpipe_stalk: COILED
# ---------------------------------------------------------------------------

# (theta of the hook, extra bud flare)
STALK_KEYS = [
    math.radians(168),   # 0 rest: hooked like a question mark, the bud hanging
    math.radians(192),   # 1 dip (wind-up)
    math.radians(72),    # 2 LIFT: the bud raised at the foe
    math.radians(28),    # 3 sway past upright
    math.radians(135),   # 4 drooping back
]


def stalk_front(f=0):
    th = STALK_KEYS[f]
    s = Spr(64, 60, SPAL)
    with s.untilted():
        litter(s, 33, 52, 17, 6, spec=[
            ((-0.10, 0.45), (-0.98, -1.00), 1.10, 0.20, 1),
            ((0.10, 0.50), (1.00, -0.75), 1.00, -0.22, 1),
        ])
    lower = bez([(34, 56), (37, 46), (36, 36), (32, 28)], 30)
    sid, sm = wax_stem(s, lower, 10, 9)
    scales(s, lower, (0.42, 0.62, 0.74), (9.5, 9.5, 9), 3.0, [sid], sides=(1, 0, -1))
    before = s.tone.copy()
    neck = neck_path(*lower[-1], end_dir(lower), 16, th, p=1.5)
    nid, _ = wax_stem(s, neck, 9, 7.5, merge={sid}, line=None)
    ex, ey = neck[-1]
    a = end_dir(neck)
    bud_head(s, ex - math.cos(a) * 1, ey - math.sin(a) * 1, a, 12, 11, merge={nid, sid})
    s.headm = s.tone != before
    with s.untilted():
        litter(s, 33, 54, 16, 5, spec=[
            ((0.05, 0.55), (-1.10, 0.05), 1.0, -0.12, 2),
            ((0.30, 0.65), (1.05, 0.15), 0.85, 0.12, 2),
        ])
    s.contact += [(18, 26), (40, 48)]
    return s


def stalk_frames():
    return place(frames(stalk_front, len(STALK_KEYS)), 56, dx=1)


def stalk_back():
    """From behind: the fat stem rises out of the frame's bottom and hooks
    over toward the foe (up-right), the bud hanging on the far side."""
    s = Spr(56, 72, SPAL)
    lower = bez([(22, 80), (20, 62), (22, 44), (28, 30)], 30)
    sid, _ = wax_stem(s, lower, 21, 19, k=13, deep=6, edge=4)
    scales(s, lower, (0.30, 0.50, 0.72), (19, 18, 18), 5, [sid], sides=(1, 0, 0))
    neck = neck_path(*lower[-1], end_dir(lower), 20, -math.radians(160), p=1.5)
    nid, _ = wax_stem(s, neck, 17, 14, k=9, deep=4, merge={sid}, line=None, edge=3)
    ex, ey = neck[-1]
    a = end_dir(neck)
    bud_head(s, ex - math.cos(a) * 2, ey - math.sin(a) * 2, a, 17, 18, merge={sid, nid}, k=7, deep=3)
    return s


# ---------------------------------------------------------------------------
# ghostpipe_nodding: COILED (taller, a clear pipe)
# ---------------------------------------------------------------------------

NOD_KEYS = [   # (theta of the crook, bell flare)
    (math.radians(165), 1.00),   # 0 rest: the bell nods at the foe
    (math.radians(188), 0.95),   # 1 dip
    (math.radians(88), 1.06),    # 2 LIFT: the bell raised, mouth to the foe
    (math.radians(52), 1.10),    # 3 sway higher, the mouth turning up
    (math.radians(125), 1.00),   # 4 rebound
]


def nod_front(f=0):
    th, fl = NOD_KEYS[f]
    s = Spr(64, 64, SPAL, sc=0.90)
    with s.untilted():
        litter(s, 34, 56, 26, 6, spec=[
            ((-0.05, 0.45), (-0.95, -1.10), 1.25, 0.20, 1),
            ((0.10, 0.50), (1.00, -0.85), 1.10, -0.22, 1),
        ])
    lower = bez([(37, 61), (40, 50), (39, 39), (35, 30)], 30)
    sid, sm = wax_stem(s, lower, 11, 9.5)
    # a scale bract flared low at the foe, a smaller one high behind
    for base, tip, w in (((36, 53), (24, 47), 6.0), ((40, 40), (48, 31), 5.0)):
        m, path = s.leaf(base, tip, w, bend=0.12 if tip[0] < base[0] else -0.12, fat=0.38)
        pid = s.part(m, base=3, k=2, deep=1, sh_tone=2, line=0, shadow=(1, 0.35))
        s.decal(s.line1(path[14:-20]), 2, on=[pid])
    scales(s, lower, (0.40, 0.75), (10.5, 10), 3.0, [sid], sides=(0, 0))
    before = s.tone.copy()
    neck = neck_path(*lower[-1], end_dir(lower), 20, th, p=2.2)
    nid, _ = wax_stem(s, neck, 9.5, 7.5, merge={sid}, line=None)
    scales(s, neck, (0.40,), (8.5,), 2.8, [nid], sides=(0,))
    ex, ey = neck[-1]
    a = end_dir(neck)
    bell(s, ex - math.cos(a) * 1.5, ey - math.sin(a) * 1.5, a, 16, 16, flare=fl, collar=False)
    s.headm = s.tone != before
    with s.untilted():
        litter(s, 34, 58, 24, 5, spec=[
            ((0.05, 0.55), (-1.10, 0.0), 1.0, -0.12, 2),
            ((0.30, 0.65), (1.05, 0.10), 0.9, 0.12, 2),
        ])
    s.contact += [(14, 24), (42, 52)]
    return s


def nod_frames():
    return place(frames(nod_front, len(NOD_KEYS)), 56, dx=1)


def nod_back():
    """From behind: the pipe's crook arches toward the foe (up-right), the
    bell hung on the far side, a scale bract flared at the near side."""
    s = Spr(56, 72, SPAL)
    m, path = s.leaf((22, 58), (2, 46), 10, bend=0.15, fat=0.38)
    pid = s.part(m, base=3, k=2, deep=1, sh_tone=2, line=0, shadow=(1, 0.35))
    s.decal(s.line1(path[14:-20]), 2, on=[pid])
    lower = bez([(22, 80), (20, 62), (21, 44), (25, 30)], 30)
    sid, _ = wax_stem(s, lower, 17, 15, k=10, deep=5, edge=3)
    scales(s, lower, (0.40, 0.58, 0.78), (17, 16, 16), 5, [sid], sides=(1, 0, 0))
    neck = neck_path(*lower[-1], end_dir(lower), 20, -math.radians(165), p=1.6)
    wax_stem(s, neck, 15, 12, k=8, deep=4, merge={sid}, line=None, edge=3)
    ex, ey = neck[-1]
    a = end_dir(neck)
    bell(s, ex - math.cos(a) * 2, ey - math.sin(a) * 2, a, 20, 22, collar=False, base=0.55)
    return s


# ---------------------------------------------------------------------------
# ghost_pipe: LOOMING (a clump)
# ---------------------------------------------------------------------------

# Each pipe, back to front: (lower stem ctrl, stem widths, neck length,
# theta at rest / dip / lifted / sway, bell length and width). theta turns
# toward the foe (left); a negative theta nods to the right.
PIPES = [
    ([(33, 60), (36, 48), (39, 38), (41, 30)], (7, 6), 8, (-115, -135, 4, -14, -55), (13, 11)),     # back right
    ([(29, 60), (29, 46), (28, 32), (27, 20)], (7, 6), 10, (55, 80, 12, -8, 30), (13, 11)),         # back, tallest
    ([(36, 60), (40, 54), (44, 49), (47, 45)], (7, 6), 7, (-100, -100, -100, -100, -100), (12, 10)),     # right, short (stays nodding)
    ([(30, 60), (26, 53), (21, 48), (17, 44)], (7.5, 6.5), 8, (140, 160, -35, -55, 118), (13, 11)),  # front left
    ([(33, 60), (34, 50), (33, 38), (31, 30)], (8, 7), 10, (130, 150, -8, -28, 70), (14, 12)),      # front centre
]
PIPE_KEYS = 5   # rest, dip, LIFT, sway, settle
PIPE_SC = 0.82


def pipe_front(f=0):
    s = Tall(76, 84, SPAL, sc=PIPE_SC)
    s.ox, s.oy = 6, 20
    with s.untilted():
        litter(s, 32, 58, 22, 6, spec=[
            ((-0.05, 0.45), (-1.00, -0.90), 1.25, 0.20, 1),
            ((0.10, 0.50), (1.00, -0.80), 1.15, -0.22, 1),
        ])
    heads = np.zeros((s.h, s.w), bool)
    prev = None
    for ctrl, (w0, w1), nl, ths, (bl, bw) in PIPES:
        lower = bez(ctrl, 30)
        sid, _ = wax_stem(s, lower, w0, w1, k=3, deep=1)
        scales(s, lower, (0.55,), (w0,), 2.6, [sid], sides=(0,))
        before = s.tone.copy()
        th = math.radians(ths[f])
        neck = neck_path(*lower[-1], end_dir(lower), nl, th, p=2.0)
        wax_stem(s, neck, w1, w1 - 0.5, merge={sid}, line=None, k=3, deep=1)
        ex, ey = neck[-1]
        a = end_dir(neck)
        bell(s, ex - math.cos(a) * 1.2, ey - math.sin(a) * 1.2, a, bl, bw, flare=1.0, collar=False,
             base=min(0.9, (w1 - 0.5) / bw))
        heads |= s.tone != before
    s.headm = heads
    with s.untilted():
        litter(s, 32, 60, 22, 5, spec=[
            ((0.05, 0.55), (-1.10, 0.0), 1.0, -0.12, 2),
            ((0.30, 0.65), (1.05, 0.10), 0.9, 0.12, 2),
        ])
    cx = lambda x: int(s.T([(x, 0)])[0][0])  # noqa: E731
    s.contact += [(cx(8), cx(20)), (cx(44), cx(56))]
    return s


def pipe_frames():
    return place(frames(pipe_front, PIPE_KEYS), 56, dx=1)


def pipe_back():
    """From behind: the near pipe huge, its crook hooked toward the foe
    (up-right); a second pipe beyond it on the left, its bell lifted; a
    third, short, nodding off the right flank."""
    s = Spr(60, 90, SPAL)
    for ctrl, w, nl, th, bl, bw in (
            ([(8, 84), (7, 60), (9, 40), (12, 28)], (12, 11), 10, -30, 15, 15),
            ([(48, 84), (50, 62), (51, 48), (52, 42)], (11, 10), 8, -150, 13, 13),
            ([(28, 84), (26, 62), (27, 44), (31, 32)], (18, 16), 18, -165, 20, 22)):
        lower = bez(ctrl, 30)
        sid, _ = wax_stem(s, lower, *w, k=w[0] // 3 + 1, deep=w[0] // 6 + 1, edge=2)
        scales(s, lower, (0.45, 0.70), (w[0], w[0]), 4, [sid], sides=(0, 0))
        neck = neck_path(*lower[-1], end_dir(lower), nl, math.radians(th), p=1.6)
        wax_stem(s, neck, w[1], w[1] - 2, k=w[1] // 3 + 1, deep=w[1] // 6 + 1, merge={sid}, line=None, edge=2)
        ex, ey = neck[-1]
        a = end_dir(neck)
        bell(s, ex - math.cos(a) * 2, ey - math.sin(a) * 2, a, bl, bw, collar=False, base=0.55)
    return s


# ---------------------------------------------------------------------------
# icons, anim, notes, build
# ---------------------------------------------------------------------------

ICONS = {
    "ghostpipe_stalk": [
        "................",
        "................",
        "......kkkk......",
        ".....k3332k.....",
        "....k33kk22k....",
        "...k33k..k21k...",
        "...k3k...k31k...",
        "..k332k..k31k...",
        "..k3221k.k31k...",
        "...k21k..k32k...",
        "....kk...k32k...",
        "..kk....k332k...",
        ".k11kk..k321k.k.",
        "k1221kkk3321kk1k",
        ".kk111kk3221k11k",
        "...kkkkkkkkkkkk.",
    ],
    "ghostpipe_nodding": [
        "................",
        "......kkkk......",
        ".....k3332k.....",
        "....k33k222k....",
        "...kk3k.kk21k...",
        "..k333k...k31k..",
        ".k33222k..k31k..",
        ".k32222k..k31k..",
        ".k3k2k1k.k331k..",
        "..k.k.k..k3k1k..",
        ".........k331k..",
        "..kk....k3321k..",
        ".k11k...k3321k.k",
        "k1221kkkk3221kk1",
        ".kk111kkk3221k11",
        "...kkkkkkkkkkkk.",
    ],
    "ghost_pipe": [
        "....kkk.........",
        "...k332k..kkk...",
        "..k3222k.k332k..",
        "..k32k2kk32222k.",
        "...k3kk.k32k21k.",
        "..kk3k..kk3k1kk.",
        ".k33k.....k31k..",
        "k3222k.kk.k31k..",
        "k32k2kk33kk31k..",
        ".kk3kk3221k331k.",
        "..k3k.k31k3321k.",
        "..k31kk31k3321k.",
        ".kk321k331k321kk",
        "k1k321k321k3211k",
        ".kk3221k321k21k.",
        "..kkkkkkkkkkkk..",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "ghostpipe_stalk": {"intro": [[0, 4], [1, 12], [2, 6], [3, 16], [2, 8], [4, 10], [0, 1]],
                        "idle": [[0, 120], [1, 10]]},
    "ghostpipe_nodding": {"intro": [[0, 4], [1, 12], [2, 5], [3, 18], [2, 6], [4, 10], [0, 1]],
                          "idle": [[0, 130], [1, 10]]},
    "ghost_pipe": {"intro": [[0, 4], [1, 12], [2, 6], [3, 16], [2, 8], [4, 10], [0, 1]],
                   "idle": [[0, 140], [1, 10]]},
}

WHY = ("WHITE: ghost pipe has no chlorophyll, so the whole plant is waxy white; the lilac light slot "
       "shades the wax and the violet dark slot carries the form and the leaf litter.")
NOTES = {
    "ghostpipe_stalk": "Crystal rule. COILED: one fat waxy stem bent like a question mark, pushing out of "
                       "violet leaf litter, its furled bud tucked under the hook toward the foe, scale leaves "
                       "jutting from the stem. Gesture: the hook dips, the bud LIFTS at the foe, sways past "
                       "upright and droops back. " + WHY + " Sport: the natural pink form.",
    "ghostpipe_nodding": "Crystal rule. COILED: a taller pipe, its crook carrying one big nodding bell at the "
                         "foe (toothed petal tips, a violet lip), scale bracts flared as arms, over leaf "
                         "litter. Gesture: the bell dips, LIFTS until its mouth faces the foe, sways higher "
                         "and nods back. " + WHY + " Sport: the natural pink form.",
    "ghost_pipe": "Crystal rule. LOOMING: a clump of five waxy pipes fanning out of the leaf litter, the bells "
                  "nodding at every angle (one half-lifted). Gesture: the heads dip, then four LIFT upright "
                  "together (as the real plant does when it fruits; one short pipe stays nodding), sway, and "
                  "settle back. "
                  + WHY + " Sport: the natural pink form.",
}

SPECS = {"ghostpipe_stalk": (stalk_frames, stalk_back), "ghostpipe_nodding": (nod_frames, nod_back),
         "ghost_pipe": (pipe_frames, pipe_back)}


def render():
    return {sid: (ffn(), back_frame(bfn), icon_frames(sid)) for sid, (ffn, bfn) in SPECS.items()}


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
