"""Crystal rule, cedar line: cedar_seedling -> red_cedar (Thuja plicata,
western red cedar).

  index 0  #181818  outline, the deep grooves of the fibrous bark, the
           sprays' shade (shared)
  index 1  RED-BROWN BARK: the trunk, the stems, the branches
  index 2  spray green: the flat scale-leaf sprays
  index 3  #f8f8f8  1px light rims on the lit edges of the sprays and the
           bark ridges, glints on the glossy foliage

Two hues, the oak's way: the red-brown bark lives in the dark slot. The
sprays shade to black (bark-red shading on the foliage read as autumn
browning), and the red is kept for what is really red: the bark.

A cedar spray is not a fern frond: the scale leaves press flat into
braided, blunt-lobed strands, so every spray here is a stem with rounded,
overlapping lobes that shorten toward a blunt tip, hung in a droop.

Poses (docs/CREATURES.md section 4.3):
  cedar_seedling  BOBBING-soft C: a thin red-brown stem leaning toward the
                  foe, its flat sprays held out like hands, the top spray
                  nodding forward (a cedar's leader droops).
  red_cedar       LOOMING: a huge buttressed trunk on wide flared roots,
                  fibrous red bark in long vertical strips, sweeping boughs
                  whose sprays droop like curtains, the drooping leader
                  nodding over the foe.

Entrance animations (only the sprays move; the stem, trunk and boughs are
pixel-identical): the sprays droop, then lift and spread, hold, and sink
back, like a slow breath.

Sport: 'Zebrina' (Thuja plicata 'Zebrina'): its sprays are banded
creamy-yellow; in two tones a golden-lime spray light over the same
red-brown bark family.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/cedar.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py cedar --sheet        write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, stalk, preview, stats)

TOOL = "tools/art/crystal/cedar.py"
IDS = ["cedar_seedling", "red_cedar"]
BARK = "#904028"
SPRAY = "#68b048"
PAL = [BLACK, BARK, SPRAY, WHITE]
SPORT = [BLACK, "#884830", "#c0c840", WHITE]
SPAL = (BARK, SPRAY, WHITE)


def rot_about(p, deg, cx, cy):
    """+deg turns the point up (counter-clockwise on screen) about (cx, cy)."""
    a = math.radians(deg)
    x, y = p
    c, s_ = math.cos(a), math.sin(a)
    return (cx + (x - cx) * c + (y - cy) * s_, cy - (x - cx) * s_ + (y - cy) * c)


def spray(s, ctrl, w, lobes=3, rim=0.45, k=1, droop=0.0):
    """A flat scale-leaf spray along ctrl (base first): a green axis with
    blunt, rope-like branchlets alternating either side, angled toward the
    tip and shortening to a blunt end. Each branchlet is its own part, so
    where they overlap a black line splits them and the spray reads lacy,
    not as one leaf. Returns (pids, mask)."""
    if droop:
        bx, by = ctrl[0]
        ctrl = [ctrl[0]] + [rot_about(p, droop * (i / (len(ctrl) - 1)), bx, by) for i, p in enumerate(ctrl[1:], 1)]
    path = bez(ctrl, 30)
    n = len(path)
    strands = []
    for i in range(lobes * 2):
        t = 0.12 + 0.70 * i / (lobes * 2 - 1)
        j = int(t * (n - 1))
        px, py = path[j]
        a, b = path[max(0, j - 2)], path[min(n - 1, j + 2)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        sg = 1 if i % 2 else -1
        ln = w * (0.62 - 0.30 * t)
        vx, vy = nx * sg * 0.80 + ux * 0.60, ny * sg * 0.80 + uy * 0.60
        tip = (px + vx * ln, py + vy * ln + ln * 0.15)
        mid = (px + vx * ln * 0.5, py + vy * ln * 0.5)
        strands.append(s.stroke(bez([(px, py), mid, tip], 12), (3.2, 2.6), cap=True))
    pids = []
    total = np.zeros((s.h, s.w), bool)
    for sm in reversed(strands):          # tip first, so the base strands lie on top
        pids.append(s.part(sm, base=2, k=k, sh_tone=0, line=0))
        total |= sm
    ax = s.stroke(path, (3.4, 2.6), cap=True)
    pids.append(s.part(ax, base=2, k=k, sh_tone=0, line=0, merge=pids))
    total |= ax
    if rim:
        for pid in pids:
            rim_white(s, total, pid, rim)
    return pids, total


def curtain(s, xs, ytop, lens, sway=0.0, lift=0.0):
    """Drooping branchlets hanging from a bough like a curtain: blunt strands
    side by side, split by black where they overlap."""
    pids = []
    for i, (x, L) in enumerate(zip(xs, lens)):
        L = L * (1 - lift)
        y0 = ytop + 0.5 * (i % 2)
        p = [(x, y0), (x + sway * 0.4, y0 + L * 0.5), (x + sway, y0 + L)]
        pids.append(s.part(s.stroke(bez(p, 12), (3.4, 2.6), cap=True), base=2, k=1, sh_tone=0, line=0))
    return pids


def shelf(s, ctrl, thick, rim=0.5, lift=0.0, pivot=None):
    """The foliage lying along a bough: a lacy band with a scalloped top,
    white-rimmed on its lit upper edge."""
    if lift and pivot:
        ctrl = [rot_about(p, lift, *pivot) for p in ctrl]
    path = bez(ctrl, 30)
    m = s.stroke(path, thick, cap=True)
    for i in range(0, len(path), 6):
        x, y = path[i]
        m |= s.ellipse(x, y - thick * 0.35, thick * 0.42, thick * 0.38)
    pid = s.part(m, base=2, k=2, sh_tone=0, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


# ---------------------------------------------------------------------------
# cedar_seedling
# ---------------------------------------------------------------------------

# droop deg per frame (negative = droops down), and a lift for the top spray
SEED_KEYS = [0, -10, 12, 5]

# (control points, width, lobes, rim)
SEED_SPRAYS = [
    ([(33, 30), (42, 25), (48, 27), (51, 32)], 10, 3, 0.3),      # rear spray, up-right, tip drooping
    ([(31, 38), (39, 41), (44, 48)], 9, 3, 0.25),                # rear low spray, hanging
    ([(29, 34), (20, 33), (12, 37), (9, 42)], 12, 4, 0.5),       # lead spray, held out to the foe
    ([(29, 23), (24, 14), (16, 11), (10, 15)], 12, 4, 0.5),      # the top spray, nodding forward
]


def seed_front(f=0):
    dr = SEED_KEYS[f]
    s = Spr(64, 64, SPAL, sc=0.78)
    with s.untilted():
        stalk(s, [(33, 58), (28, 61), (24, 62)], 3.4, 2, base=1, k=1, sh_tone=0, vein=None)
        stalk(s, [(34, 58), (39, 61), (43, 62)], 3.4, 2, base=1, k=1, sh_tone=0, vein=None)
    pid, m, _ = stalk(s, [(34, 62), (35, 48), (32, 36), (29, 24)], 4, 2.4, base=1, k=1, sh_tone=0, vein=None)
    rim_white(s, m, pid, 0.3)
    before = s.tone.copy()
    for ctrl, w, lobes, rim in SEED_SPRAYS:
        spray(s, ctrl, w, lobes=lobes, rim=rim, droop=dr * (1 if ctrl[-1][0] > ctrl[0][0] else -1))
    s.headm = (s.tone != before)
    s.contact += [(22, 26), (40, 44)]
    return s


def seed_frames():
    return place(frames(seed_front, len(SEED_KEYS)), 56, dx=1)


def seed_back():
    s = Spr(48, 64, SPAL)
    stalk(s, [(24, 72), (24, 52), (26, 34)], 6, 4, base=1, k=1, sh_tone=0, vein=None)
    spray(s, [(24, 46), (12, 42), (2, 48)], 13, lobes=5, rim=0.3)
    spray(s, [(25, 40), (36, 34), (46, 38)], 14, lobes=5, rim=0.4)
    spray(s, [(26, 34), (30, 20), (40, 12), (46, 16)], 16, lobes=5, rim=0.5)
    return s


# ---------------------------------------------------------------------------
# red_cedar: LOOMING
# ---------------------------------------------------------------------------

RED_KEYS = [0, -8, 10, 4]


def trunk(s, flare=1.0):
    """The buttressed trunk: flared root lobes at the base, the bole tapering
    up, fibrous bark in vertical strips (black grooves, white ridge rims)."""
    left = [(4, 63), (9, 59), (15, 56), (19, 50), (22, 40), (25, 28), (28, 14), (30, 4)]
    right = [(33, 4), (35, 14), (37, 28), (39, 40), (42, 50), (47, 56), (54, 59), (60, 63)]
    pts = bez(left, 10) + bez(right, 10)
    m = s.poly(pts)
    pid = s.part(m, base=1, k=3, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.55)
    # the buttress folds: black creases between the root flares
    for c in ([(21, 63), (24, 54), (26, 44)], [(42, 63), (39, 54), (37, 44)], [(31.5, 63), (31.5, 52)]):
        s.decal(s.line1(bez(c, 16)), 0, on=[pid])
    # the fibrous strips: long grooves following the taper, broken (no long seams)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    for x0, x1, y0, y1 in ((27, 30, 8, 30), (26, 28.5, 34, 50), (33, 34.5, 12, 26), (34.5, 37, 30, 46),
                           (30.5, 31, 20, 42), (23, 21, 48, 58), (40, 44, 50, 58)):
        g = s.line1(bez([(x0, y0), (x1, y1)], 16))
        s.decal(g, 0, on=[pid])
        # a white ridge rim just left of the groove, on the upper part of it
        rid = np.zeros_like(g)
        rid[:, :-1] = g[:, 1:]
        s.decal(rid & ~g & (yy < (y0 + (y1 - y0) * 0.45)), 3, on=[pid])
    return pid, m


# boughs: (bough ctrl from the trunk out, shelf thickness, curtain xs, curtain top y, curtain lengths)
BOUGHS = [
    # behind, on the right
    ([(36, 15), (44, 12), (51, 9)], 6, [44, 47, 50], 15, [9, 11, 8]),
    ([(37, 26), (46, 24), (53, 20)], 6, [45, 48, 51, 54], 27, [10, 13, 11, 8]),
    # the foe side, longer and lower
    ([(28, 23), (19, 20), (10, 16)], 7, [9, 12, 15, 18, 21], 21, [12, 15, 13, 11, 8]),
    ([(27, 34), (18, 32), (8, 28)], 7, [7, 10, 13, 16, 19], 33, [10, 13, 12, 9, 7]),
]
# the crown top and the drooping leader, nodding over the foe
CROWN = [
    ([(25, 10), (32, 7), (40, 9)], 7),
]
LEADER = [(32, 7), (29, 2), (23, 1), (19, 4)]


def red_front(f=0):
    dr = RED_KEYS[f]
    lift = dr / 60.0
    s = Spr(64, 66, SPAL, sc=0.79)
    trunk(s)
    for ctrl, *_ in BOUGHS:
        stalk(s, ctrl, 3.6, 2.2, base=1, k=1, sh_tone=0, vein=None)
    before = s.tone.copy()
    for ctrl, th, xs, yt, lens in BOUGHS:
        side = 1 if ctrl[-1][0] > ctrl[0][0] else -1
        curtain(s, xs, yt - 1 - dr * 0.12 * (1 if side < 0 else 0.6), lens, sway=-side * 1.0, lift=lift)
    for ctrl, th, xs, yt, lens in BOUGHS:
        side = 1 if ctrl[-1][0] > ctrl[0][0] else -1
        shelf(s, ctrl[1:], th, rim=0.5, lift=dr * 0.5 * side * -1 * -1, pivot=ctrl[0])
    for ctrl, th in CROWN:
        shelf(s, ctrl, th, rim=0.6, lift=dr * 0.3, pivot=(32, 10))
    spray(s, LEADER, 10, lobes=2, rim=0.5, droop=-dr)
    s.headm = (s.tone != before)
    s.contact += [(6, 14), (48, 58)]
    return s


def red_frames():
    return place(frames(red_front, len(RED_KEYS)), 56, dx=0)


def red_back():
    s = Spr(52, 64, SPAL)
    left = [(0, 70), (8, 60), (14, 44), (18, 24), (22, 4)]
    right = [(30, 4), (34, 24), (38, 44), (44, 60), (52, 70)]
    m = s.poly(bez(left, 10) + bez(right, 10))
    pid = s.part(m, base=1, k=3, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.5)
    for c in ([(20, 8), (18, 30), (15, 50)], [(27, 10), (28, 34), (30, 56)], [(23, 20), (23, 40)]):
        s.decal(s.line1(bez(c, 16)), 0, on=[pid])
    spray(s, [(20, 16), (8, 14), (0, 22)], 14, lobes=5, rim=0.4)
    spray(s, [(30, 12), (42, 8), (52, 14)], 15, lobes=5, rim=0.4)
    spray(s, [(32, 28), (44, 28), (52, 36)], 14, lobes=5, rim=0.4)
    spray(s, [(24, 6), (30, 0), (38, 2)], 12, lobes=4, rim=0.5)
    return s


# ---------------------------------------------------------------------------
# icons
# ---------------------------------------------------------------------------

ICONS = {
    "cedar_seedling": [
        "..kkk...........",
        ".k232k.kk.......",
        "k2k22kk22k......",
        ".kk.k22kk2k.....",
        "......k1k.kk....",
        ".kkk..k1k.......",
        "k232kk1kkkk.....",
        ".k22k1k2232k....",
        "..kkk1k.k22k....",
        ".....k1k.kk.....",
        "......k1k.......",
        "....kkk1kkk.....",
        "...k11kkk11k....",
        "...kkk...kkk....",
    ],
    "red_cedar": [
        "....kkkk........",
        "..kk2322kk......",
        ".k23kk1k22kkk...",
        "k232kk1k2k232k..",
        "k22k.k1k.k222k..",
        ".k2k.k11kk22k...",
        "k23kk1131k2k....",
        "k2k.k11131kk....",
        ".k..k11131k.....",
        "...k111131k.....",
        "..k1131k131k....",
        ".k11k31k1311k...",
        "k111k1kk11111k..",
        "kkkkkkkkkkkkkk..",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "cedar_seedling": {"intro": [[0, 6], [1, 14], [2, 6], [2, 16], [3, 8], [0, 8]],
                       "idle": [[0, 130], [1, 12]]},
    "red_cedar": {"intro": [[0, 6], [1, 16], [2, 8], [2, 18], [3, 10], [0, 8]],
                  "idle": [[0, 150], [1, 14]]},
}

NOTES = {
    "cedar_seedling": "Crystal rule. A soft C: a thin red-brown stem leaning toward the foe, its flat, blunt-lobed "
                      "scale-leaf sprays held out like hands, the top spray nodding forward (a cedar's leader "
                      "droops). Gesture: the sprays droop, then lift and spread, hold, and sink back, like a "
                      "breath. Two hues: red-brown bark in the dark slot; the sprays shade to black. Sport: "
                      "'Zebrina' (yellow-banded foliage).",
    "red_cedar": "Crystal rule. LOOMING: a huge buttressed trunk on wide flared roots, fibrous red bark in long "
                 "vertical strips (black grooves, white ridge rims), sweeping boughs whose flat sprays droop "
                 "like curtains, the drooping leader nodding over the foe. Gesture: every spray droops, then "
                 "lifts and spreads, holds, and sinks back, like a slow breath. Sport: 'Zebrina' "
                 "(yellow-banded foliage).",
}

SPECS = {"cedar_seedling": (seed_frames, seed_back), "red_cedar": (red_frames, red_back)}


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
