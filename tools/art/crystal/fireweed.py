"""Crystal rule, fireweed line: fireweed_fluff -> fireweed_shoot -> fireweed
(Chamaenerion angustifolium; Chapter 5, the burnt stand).

Fireweed is one of the first plants back after a forest fire: its seeds,
each on a plume of silky white hairs, blow in by the million. The line's
motif is that plume: a tuft bursting from a split pod (stage 1), a stray
tuft caught on the shoot (stage 2), plumes on the split pods under the
flower spike (stage 3), and in every intro the fluff drifts off.

  index 0  #181818  outline, the splits between pod valves, crevices (shared)
  index 1  deep red-violet: the stems, the reddish leaves, the pods, the
           shade of the flowers (the second hue in the dark slot, as the
           flytrap's red)
  index 2  fireweed magenta-pink: the flowers and buds, the pod's lit side,
           the leaves' midribs and lit rims
  index 3  #f8f8f8  the seed fluff (shaded by black strand splits), glints

No faces: a flower is four petals round a white cross of stigma, never a
dark disc; a drifting seed is a white plume over a 1px seed, never a dot
with a glint beside it.

Poses (docs/CREATURES.md):
  fireweed_fluff  BOBBING   a split pod on its stalk, the four valves curled
                            back like arms, a big tuft of fluff billowing out
                            of its top at the foe, one seed drifting off.
  fireweed_shoot  LUNGING   a reddish leafy shoot in an S, the nodding tip of
                            closed buds thrust at the foe, a tuft of fluff
                            caught in its leaves.
  fireweed        LOOMING   a tall spike: willow leaves as arms, magenta
                            flowers opening bottom-up (open below, buds
                            nodding at the tip), and below them the oldest
                            pods split into plumes of fluff.

Entrance animations (the signature: seed fluff drifts off the plant):
  fluff   the tuft swells, PUFFS: three seeds launch at the foe and drift
          up and away.
  shoot   the bud tip dips, then lifts; the caught tuft tears free and
          drifts off.
  fireweed  the plumes swell, then release a volley of seeds that drifts up
          past the flowers toward the foe.

Sport: Chamaenerion angustifolium f. albiflorum, the white-flowered form:
white flowers on green stems (docs/SPORTS.md).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/fireweed.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py fireweed                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, stalk, preview, stats, shift)

TOOL = "tools/art/crystal/fireweed.py"
IDS = ["fireweed_fluff", "fireweed_shoot", "fireweed"]
DARK = "#882050"     # deep red-violet
MID = "#e058a0"      # fireweed magenta-pink
PAL = [BLACK, DARK, MID, WHITE]
SPORT = [BLACK, "#487838", "#d0d0c0", WHITE]   # f. albiflorum: white flowers, green stems
SPAL = (DARK, MID, WHITE)


# ---------------------------------------------------------------- parts ---

def lance(s, base, tip, w, bend=0.0, rim=0.4, line=0, fat=0.42):
    """A willow-like fireweed leaf: flat red-violet with a black shade edge,
    a magenta midrib, a magenta lit rim turning white at the top-left."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat)
    pid = s.part(m, base=1, k=1, sh_tone=0, line=line)
    s.decal(s.line1(path[10:-14]), 2, on=[pid])
    if rim:
        rim_white(s, m, pid, rim, tone=2)
        rim_white(s, m, pid, rim * 0.45, tone=3)
    return pid, m


def red_stem(s, ctrl, w0, w1, rim=0.6, merge=(), line=0):
    """A red-violet stem with a magenta lit edge."""
    path = bez(ctrl, 40)
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=1, k=1, sh_tone=0, line=line, merge=merge)
    rim_white(s, m, pid, rim, tone=2)
    return pid, m, path


def tuft(s, ox, oy, ang, R, spread=1.0, swell=1.0, n=7, width=3.4, seed_dots=True, order=None, shade=(0, 1, 2)):
    """A plume of silky seed hairs bursting from (ox, oy) along `ang`
    (screen radians): `n` thin wavy locks fanning out, each white with a
    magenta underside, tapering to a curled tip; drawn back to front, so a
    black line parts each lock from the one behind (the hairs read as
    hairs, not as one blob). The dark seeds are packed at the root.
    Returns (mask, ids)."""
    R *= swell
    m = np.zeros((s.h, s.w), bool)
    ids = []
    for i in (order if order is not None else range(n)):
        t = (i / max(1, n - 1) - 0.5)
        a = ang + t * 2.0 * spread
        L = R * (0.82 + 0.18 * math.cos(t * 3.0)) * (1.0 + 0.06 * ((i * 7) % 3 - 1))
        wv = 0.22 * (1 if i % 2 else -1)
        curl = 0.5 * (1 if t >= 0 else -1)

        def P(u, off):
            aa = a + off
            return (ox + math.cos(aa) * L * u, oy + math.sin(aa) * L * u)
        p = bez([(ox, oy), P(0.35, wv * 0.3), P(0.65, -wv * 0.4), P(0.88, wv * 0.2), P(1.0, curl * 0.35)], 10)
        w = width * min(1.25, swell ** 0.5)
        lm = s.stroke(p, lambda u: max(1.2, w * (0.45 + 0.75 * math.sin(math.pi * min(1.0, 0.25 + u * 0.8)))),
                      cap=True)
        ids.append(s.part(lm, base=3, k=1 if i in shade else 0, sh_tone=2, line=0, shadow=(1, 1)))
        m |= lm
    if seed_dots:
        s.decal(s.ellipse(ox, oy, 1.7, 1.5), 1, on=ids)
    return m, ids


def drift_seed(s, x, y, size=1.0, ang=-2.3):
    """One seed adrift: a small white plume over a 1px dark seed, painted
    after the outline (it may sit anywhere on the background)."""
    c, s_ = math.cos(ang), math.sin(ang)
    plume = []
    L = 3.2 * size
    for t in (-0.6, 0.0, 0.6):
        a = ang + t
        plume.append(bez([(x, y), (x + math.cos(a) * L * 0.6, y + math.sin(a) * L * 0.6),
                          (x + math.cos(a) * L, y + math.sin(a) * L)], 6))
    m = np.zeros((s.h, s.w), bool)
    for p in plume:
        m |= s.stroke(p, 1.3 * size, cap=True)
    seed = s.ellipse(x - c * 0.6, y - s_ * 0.6, 0.9, 0.9)
    return m & ~seed, seed


def pod(s, ctrl, w0, w1, split=0.0):
    """A slender four-chambered capsule: red-violet, a magenta lit side,
    a black seam between the chambers. Returns (pid, path)."""
    path = bez(ctrl, 40)
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.9, tone=2)
    rim_white(s, m, pid, 0.25, tone=3)
    s.decal(s.line1(path[8:-6]) & erode(m, 1), 2, on=[pid])
    return pid, path


def valve(s, root, ctrl, w0, w1, lit=True):
    """A split pod valve curling back: red-violet outside, the magenta inner
    face lit."""
    path = bez([root] + ctrl, 30)
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=2 if lit else 1, k=1, sh_tone=1 if lit else 0, line=0)
    if lit:
        rim_white(s, m, pid, 0.35, tone=3)
    return pid, m


def post_seeds(s, seeds):
    """Paint drifting seeds after the outline: a black ring round each."""
    for x, y, sz, a in seeds:
        pm, sm = drift_seed(s, x, y, sz, a)
        ring = dilate(pm | sm, 1, diag=False) & ~(pm | sm)
        s.post.append((ring, 0))
        s.post.append((pm, 3))
        s.post.append((sm, 1))


# ---------------------------------------------------------------------------
# fireweed_fluff: BOBBING
# ---------------------------------------------------------------------------

# (tuft swell, drifting seeds [(x, y, size, plume angle)])
FLUFF_KEYS = [
    (1.00, [(14, 22, 1.0, -2.4)]),                                         # 0 rest: one seed adrift
    (1.06, [(15, 23, 1.0, -2.4)]),                                         # 1 the tuft swells
    (0.94, [(16, 15, 1.0, -2.2), (11, 26, 1.0, -2.5), (21, 9, 0.9, -2.0)]),  # 2 PUFF
    (0.97, [(11, 12, 1.0, -2.3), (6, 21, 0.9, -2.6), (17, 5, 0.9, -2.1)]),  # 3 adrift
    (1.00, [(6, 8, 0.9, -2.3), (4, 16, 0.8, -2.5)]),                       # 4 far off
]


def fluff_front(f=0):
    sw, seeds = FLUFF_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.84)
    s.set_tilt(8, 34, 58)
    with s.untilted():
        lance(s, (34, 58), (18, 55), 6, bend=0.15)
        lance(s, (35, 58), (50, 56), 5.5, bend=-0.15, rim=0.0)
    red_stem(s, [(35, 58), (36, 52), (35, 47)], 3.5, 3)
    # the pod, leaning at the foe, its tip split into four valves
    pid, path = pod(s, [(35, 48), (36, 40), (34, 32), (31, 26)], 8, 7)
    valve(s, (33, 28), [(39, 24), (44, 27), (44, 33)], 3.5, 2, lit=False)    # far valve, curled back
    before = s.tone.copy()
    m, tid = tuft(s, 30, 28, math.radians(-118), 17, spread=0.85, swell=sw, order=[0, 6, 1, 5, 2, 4, 3])
    s.headm = s.tone != before
    valve(s, (31, 29), [(25, 29), (21, 34), (22, 39)], 3.5, 2)               # lead valve, curled like an arm
    valve(s, (33, 29), [(37, 33), (37, 38)], 3, 2)
    post_seeds(s, [(x, y, sz, a) for x, y, sz, a in seeds])
    for pm, _ in s.post:
        s.headm |= pm
    s.contact += [(22, 30), (40, 46)]
    return s


def fluff_frames():
    return place(frames(fluff_front, len(FLUFF_KEYS)), 56, dx=0)


# ---------------------------------------------------------------------------
# shared: buds, flowers
# ---------------------------------------------------------------------------

def bud(s, base, tip, w):
    """A closed fireweed bud: a slim magenta spindle on a red-violet
    pedicel, the sepal seam a dark line down its shade side."""
    m, path = s.leaf(base, tip, w, fat=0.55)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.25, tone=3)
    return pid, m


# Open flowers are hand-pixelled (at this size a vector flower turns to a
# blob): four petals turned 3/4 to the foe, the upper ones broader as on the
# real flower, each parted by black; the white stigma at the centre sits in
# a red-violet eye of stamens, never a dark disc.
FLOWER_L = [
    "....kkkk.....",
    "...k3322k....",
    "..k33222k.kk.",
    ".kkk3221kk22k",
    "k332k21k2221k",
    "k3222k3k2221k",
    "k22211k11kkk.",
    ".k211k122k...",
    "..kkk12221k..",
    "....k22211k..",
    "....k12211k..",
    ".....kkkk....",
]
FLOWER_S = [
    "...kkk...",
    "..k332k..",
    ".kk322kk.",
    "k32k2k22k",
    "k221312k.",
    ".kk1k21k.",
    "..k221k..",
    "..k211k..",
    "...kkk...",
]


def flower4(s, cx, cy, big=True):
    """Stamp an open flower centred on design point (cx, cy)."""
    pat = FLOWER_L if big else FLOWER_S
    (X, Y), = s.T([(cx, cy)])
    x0, y0 = int(round(X - len(pat[0]) / 2)), int(round(Y - len(pat) / 2))
    s.rows(x0, y0, pat)
    m = np.zeros((s.h, s.w), bool)
    for j, row in enumerate(pat):
        for i, ch in enumerate(row):
            if ch != "." and 0 <= y0 + j < s.h and 0 <= x0 + i < s.w:
                m[y0 + j, x0 + i] = True
    return m


# ---------------------------------------------------------------------------
# fireweed_shoot: LUNGING
# ---------------------------------------------------------------------------

# (tip theta tweak, tuft position (x, y) or None when torn free, drifting seeds)
SHOOT_KEYS = [
    (0.0, (40, 30), []),                                        # 0 rest: the tuft caught in an axil
    (0.22, (40, 30), []),                                       # 1 the tip dips (wind-up)
    (-0.30, None, [(46, 21, 1.1, -1.9), (51, 25, 0.9, -1.6)]),  # 2 LIFT: the tuft tears free
    (-0.18, None, [(47, 13, 1.1, -2.1), (54, 18, 0.9, -1.8)]),  # 3 it drifts up
    (-0.05, None, [(42, 8, 1.0, -2.3), (52, 11, 0.9, -2.0)]),   # 4 off at the foe; the tip settles
]


def shoot_front(f=0):
    dth, tpos, seeds = SHOOT_KEYS[f]
    s = Spr(64, 64, SPAL, sc=0.92)
    s.set_tilt(6, 34, 62)
    with s.untilted():
        lance(s, (34, 62), (16, 59), 6, bend=0.12)
        lance(s, (35, 62), (52, 60), 5.5, bend=-0.12, rim=0.0)
    # rear leaves (behind the stem)
    lance(s, (37, 47), (55, 38), 6.5, bend=-0.15, rim=0.15)
    lance(s, (36, 32), (50, 22), 5.5, bend=-0.12, rim=0.15)
    stem_ctrl = [(35, 62), (38, 50), (37, 38), (33, 28), (31, 22)]
    sid, sm, spath = red_stem(s, stem_ctrl, 5, 4)
    # lead leaves: the big one thrust at the foe, smaller ones up the stem
    lance(s, (36, 52), (14, 46), 8, bend=0.16, rim=0.6)
    lance(s, (35, 40), (17, 31), 7, bend=0.15, rim=0.6)
    lance(s, (33, 30), (22, 20), 5, bend=0.12, rim=0.6)
    before = s.tone.copy()
    # the nodding tip: the stem hooks over and the buds hang from it
    a0 = math.atan2(22 - 28, 31 - 33)
    tip = []
    x, y = 31.0, 22.0
    for i in range(16):
        t = i / 15
        a = a0 - (1.5 + dth) * t ** 1.5
        x += math.cos(a) * 0.9
        y += math.sin(a) * 0.9
        tip.append((x, y))
    tm = s.stroke([(31, 22)] + tip, (4, 2.5), cap=True)
    tid = s.part(tm, base=1, k=1, sh_tone=0, line=None, merge={sid})
    rim_white(s, tm, tid, 0.6, tone=2)
    for i, (j, ln, w, da) in enumerate(((3, 6.5, 3.2, 0.9), (6, 7.0, 3.4, 0.7), (9, 7.5, 3.4, 0.4),
                                        (12, 7.0, 3.2, 0.1), (15, 6.0, 3.0, -0.3))):
        bx, by = tip[j]
        (ax, ay), (cx2, cy2) = tip[max(0, j - 1)], tip[min(15, j + 1)]
        a = math.atan2(cy2 - ay, cx2 - ax) + da + 1.2
        bud(s, (bx, by), (bx + math.cos(a) * ln, by + math.sin(a) * ln), w)
    if tpos is not None:
        tuft(s, tpos[0], tpos[1], math.radians(-62), 11, spread=0.9, n=5, width=3.0, shade=(4,),
             order=[0, 4, 1, 3, 2])
    s.headm = s.tone != before
    post_seeds(s, seeds)
    for pm, _ in s.post:
        s.headm |= pm
    s.contact += [(14, 26), (42, 50)]
    return s


def shoot_frames():
    return place(frames(shoot_front, len(SHOOT_KEYS)), 56, dx=0)


# ---------------------------------------------------------------------------
# fireweed: LOOMING (the spike)
# ---------------------------------------------------------------------------

# (plume swell, drifting seeds)
FW_KEYS = [
    (1.00, [(5, 30, 1.0, -2.4)]),                                                    # 0 rest
    (1.14, [(5, 29, 1.0, -2.4)]),                                                    # 1 plumes swell
    (0.92, [(7, 24, 1.1, -2.3), (3, 34, 1.0, -2.5), (58, 26, 1.0, -1.2)]),          # 2 RELEASE
    (0.96, [(5, 15, 1.1, -2.2), (2, 25, 1.0, -2.4), (59, 16, 1.0, -1.5)]),          # 3 drifting up
    (1.00, [(4, 7, 1.0, -2.2), (2, 16, 0.9, -2.4), (57, 8, 0.9, -1.8)]),            # 4 far off
]


def fw_front(f=0):
    sw, seeds = FW_KEYS[f]
    s = Spr(72, 70, SPAL, sc=FW_SC)
    s.ox = 4
    s.set_tilt(4, 32, 68)
    with s.untilted():
        lance(s, (32, 68), (10, 65), 7.5, bend=0.12)
        lance(s, (33, 68), (56, 66), 7, bend=-0.12, rim=0.0)
    lance(s, (34, 57), (60, 49), 8, bend=-0.15, rim=0.15)            # rear leaf
    # pods under the flowers, split into plumes: the far one first
    pod(s, [(34, 46), (41, 42), (47, 38)], 3.4, 2.6)
    stem_ctrl = [(32, 68), (35, 54), (34, 40), (31, 24), (29, 10)]
    sid, sm, spath = red_stem(s, stem_ctrl, 6, 4)
    lance(s, (34, 61), (6, 54), 10, bend=0.16)                       # lead leaf, thrust at the foe
    lance(s, (34, 51), (13, 44), 8, bend=0.15)
    pod(s, [(33, 44), (26, 41), (20, 37)], 3.4, 2.6)
    before = s.tone.copy()
    tuft(s, 47, 38, math.radians(-40), 12, spread=0.9, n=5, width=3.4, swell=sw, shade=(4,), order=[0, 4, 1, 3, 2])
    tuft(s, 20, 37, math.radians(-150), 12, spread=0.9, n=5, width=3.4, swell=sw, shade=(0,), order=[4, 0, 3, 1, 2])
    s.headm = s.tone != before
    # flowers, opening bottom-up: open below, buds nodding at the tip
    for cx, cy, big in ((41, 33, True), (24, 30, True), (40, 21, True), (25, 18, False), (35, 11, False)):
        flower4(s, cx, cy, big)
    tip = bez([(29, 11), (28, 6), (24, 2), (20, 2)], 12)
    tm = s.stroke(tip, (3.4, 2.2), cap=True)
    s.part(tm, base=1, k=1, sh_tone=0, line=None, merge={sid})
    for j, ln, w, da in ((2, 5.5, 3.2, 2.6), (5, 6, 3.4, 2.0), (8, 6, 3.4, 1.4), (11, 5.5, 3.0, 0.9)):
        bx, by = tip[j]
        bud(s, (bx, by), (bx + math.cos(da) * ln, by + math.sin(da) * ln), w)
    post_seeds(s, seeds)
    for pm, _ in s.post:
        s.headm |= pm
    s.contact += [(16, 27), (46, 56)]
    return s


FW_SC = 0.80


def fw_frames():
    return place(frames(fw_front, len(FW_KEYS)), 56, dx=0)


# ---------------------------------------------------------------------------
# backs (48x48, cut off by the bottom edge; the foe is up-right)
# ---------------------------------------------------------------------------

def fluff_back():
    """From behind: the pod looms up, its valves curled back, the tuft
    billowing up-right toward the foe."""
    s = Spr(56, 64, SPAL)
    pod(s, [(24, 76), (25, 56), (26, 38), (28, 26)], 15, 13)
    valve(s, (25, 28), [(16, 26), (10, 31), (10, 38)], 6, 4, lit=False)
    tuft(s, 29, 27, math.radians(-62), 18, spread=0.9, n=7, width=4.2, shade=(0, 1, 2, 4, 5, 6),
         order=[0, 6, 1, 5, 2, 4, 3])
    valve(s, (31, 30), [(38, 32), (42, 38), (40, 44)], 6, 4)
    valve(s, (26, 31), [(22, 37), (24, 43)], 5, 3.5)
    return s


def shoot_back():
    """From behind: the leafy shoot rises, leaves spread like wings, the
    nodding bud tip hooked over toward the foe, the caught tuft."""
    s = Spr(56, 64, SPAL)
    lance(s, (26, 50), (2, 38), 12, bend=0.16)
    lance(s, (27, 38), (6, 22), 10, bend=0.15, rim=0.2)
    sid, _, _ = red_stem(s, [(26, 80), (25, 56), (27, 34), (31, 22)], 9, 7)
    lance(s, (27, 56), (54, 46), 12, bend=-0.16)
    lance(s, (29, 40), (52, 30), 10, bend=-0.14)
    tip = bez([(31, 22), (34, 14), (40, 10), (45, 12)], 14)
    tm = s.stroke(tip, (6, 4), cap=True)
    s.part(tm, base=1, k=1, sh_tone=0, line=None, merge={sid})
    for j, ln, w, da in ((3, 10, 5.5, -2.6), (7, 11, 6, -1.8), (10, 11, 6, -0.9), (13, 10, 5.5, 0.2)):
        bx, by = tip[j]
        bud(s, (bx, by), (bx + math.cos(da) * ln, by + math.sin(da) * ln), w)
    tuft(s, 22, 32, math.radians(-115), 14, spread=0.9, n=5, width=4.5, shade=(0,), order=[0, 4, 1, 3, 2])
    return s


def fw_back():
    """From behind: the flower spike towers up the frame, flowers on both
    flanks, the plumes billowing off toward the foe."""
    s = Spr(56, 64, SPAL)
    lance(s, (26, 58), (0, 50), 13, bend=0.16)
    lance(s, (27, 58), (55, 50), 12, bend=-0.16)
    pod(s, [(26, 44), (16, 38), (10, 31)], 5, 4)
    sid, _, _ = red_stem(s, [(26, 80), (26, 56), (27, 34), (29, 14), (31, 4)], 9, 6)
    pod(s, [(27, 42), (36, 36), (42, 30)], 5, 4)
    tuft(s, 42, 30, math.radians(-45), 16, spread=0.9, n=5, width=4.5, shade=(4,), order=[0, 4, 1, 3, 2])
    for cx, cy in ((20, 26), (35, 22), (21, 14), (34, 10)):
        flower4(s, cx, cy, True)
    return s


# ---------------------------------------------------------------------------
# icons, anim, notes, build
# ---------------------------------------------------------------------------

ICONS = {
    "fireweed_fluff": [
        "................",
        "...k.k.kk.......",
        "..k3k3k33k......",
        ".k332332k3k.....",
        "k32k33322k......",
        ".k322322k..kk...",
        "..k2222k..k1k...",
        "...k22kkkk11k...",
        "..k2k21k1k1k....",
        "..k1kk21kkk.....",
        "...k.k21k.......",
        ".....k21k.......",
        ".....k11k.......",
        "...kkk11kkk.....",
        "..k221k1k122k...",
        "...kkkkkkkkk....",
    ],
    "fireweed_shoot": [
        "..kk.kk.........",
        ".k22k22k........",
        ".k22k22kk.......",
        "..k1k12k1k......",
        "...kk11kkk.kkk..",
        ".kk...k1k.k333k.",
        "k122k.k1kk3333k.",
        ".k1112k1k1k33k..",
        "..kkk1k1k11kk...",
        "....kk1k111k....",
        ".kk..k1kkkk.....",
        "k1122k1k.kkkk...",
        ".kk111k1k1112k..",
        "...kkk11kkkkk...",
        "..kk2k11k22kk...",
        "...kkkkkkkkk....",
    ],
    "fireweed": [
        "....kkk.........",
        "...k211k........",
        "..k2kk1k........",
        "..kk.k22k.......",
        "....k3222k......",
        ".kk.k22k22k.kk..",
        "k33kkk2k122k33k.",
        "k333k32k22k333k.",
        ".k3k3222k2k33k..",
        "..kk22k22k2kkk..",
        ".kk.k21k1kk.....",
        "k112kk1k1k.kk...",
        ".k1112k1kk1112k.",
        "..kkkk11k1kkkk..",
        "..kk22k11k22kk..",
        "...kkkkkkkkkk...",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "fireweed_fluff": {"intro": [[0, 4], [1, 14], [2, 8], [3, 12], [4, 14], [0, 1]],
                       "idle": [[0, 110], [1, 10]]},
    "fireweed_shoot": {"intro": [[0, 4], [1, 12], [2, 8], [3, 12], [4, 14], [0, 1]],
                       "idle": [[0, 120], [1, 8]]},
    "fireweed": {"intro": [[0, 4], [1, 14], [2, 8], [3, 12], [4, 14], [0, 1]],
                 "idle": [[0, 130], [1, 10]]},
}

NOTES = {
    "fireweed_fluff": "Crystal rule. BOBBING: a slender red-violet seed pod on its stalk, split at the top into "
                      "four valves curled back like arms, a tuft of silky white seed hairs billowing out of it "
                      "at the foe, one seed already adrift. Gesture: the tuft swells, then PUFFS: three seeds "
                      "launch at the foe and drift up and away. Two hues: the red-violet stem and pod in the "
                      "dark slot, fireweed magenta in the light slot. Sport: f. albiflorum.",
    "fireweed_shoot": "Crystal rule. LUNGING: a reddish leafy shoot in an S, willow leaves as arms (magenta "
                      "midribs), the nodding tip of closed magenta buds thrust at the foe, a tuft of seed fluff "
                      "caught in an upper leaf. Gesture: the tip dips, then lifts, and the caught tuft tears "
                      "free and drifts off. Sport: f. albiflorum.",
    "fireweed": "Crystal rule. LOOMING: a tall spike on willow-leaf arms; the magenta flowers open bottom-up "
                "(open below, closed buds nodding at the tip, as on the real raceme), and under them the oldest "
                "pods have split into two plumes of white seed fluff. Gesture: the plumes swell, then release a "
                "volley of seeds that drifts up past the flowers. Sport: f. albiflorum (white flowers, green "
                "stems).",
}

SPECS = {"fireweed_fluff": (fluff_frames, fluff_back), "fireweed_shoot": (shoot_frames, shoot_back),
         "fireweed": (fw_frames, fw_back)}


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
