"""Original Crystal-rule Puya raimondii (Queen of the Andes): centuryheart.

centuryheart (adult, single-stage legendary), REARING / displaying: a huge,
dense rosette of stiff, sword-like silver-blue leaves radiating from one hub
like a dragon's frill, the far (right) side higher and shorter, the near
(foe) side sweeping long and low; the lowest leaves droop to the ground as
two planted feet. Out of the centre rises the first hint of the great flower
spike: a tight, pale bud column scaled with bracts, curving back then
forward so its tip leans over the foe (the head). Black spines hook out
along the top edges of the outer leaves, spaced wide, so the saw edge reads
at 1x without becoming noise.

Intro: the frill flexes (the upper and side leaves draw in, then fan out
wide and hold) while a glint runs up the bud column to its tip, then it
settles. The column, the hub and the grounded leaves stay registered.
Two tones: a silver blue-green mid (the leaves, the bud column) over a deep
teal dark slot (the leaves' shaded keels, the inner rosette, the soil); the
silvery wax is white streaks inside the lit edges. The front's white share
stays under 20%, so no WHITE_PARTS entry is needed.
Faces: the bracts are long diagonal seams that run out to the column's
outline; spines are black hooks grown out of the outline; no enclosed dark
dots anywhere (no_dots).
Sport: the flowering colouring, an artistic interpretation drawn from the
flowers' greenish-white petals, often somewhat purple; see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, T, Spr, bez, dilate, hop, icon_arr, moving_boxes, qbez, shift, tones  # noqa: E402
from dragontree import across, blunt  # noqa: E402

TOOL = "tools/art/crystal/centuryheart.py"
SID = "centuryheart"
PAL = [BLACK, "#285860", "#98c0b8", WHITE]
SPORT = [BLACK, "#705078", "#d0d8b8", WHITE]
SPAL = tuple(PAL[1:])
FLEX = [0.0, -1.0, 2.6, 1.6, -0.4]           # frill spread per front frame (+ = fanned out)
GLINT = [None, None, 0.25, 0.58, 0.86]        # the glint running up the bud column (0 base .. 1 tip)
ANIM = {"intro": [[0, 6], [1, 12], [2, 6], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 150], [4, 10], [0, 6]]}

HUB = (35.0, 40.0)


# ------------------------------------------------------------- parts ------

def sword_poly(base, tip, w, bend=0.0, n=48):
    """A long, stiff, arching sword leaf: near-parallel sides from a pinched
    base, tapering over its last 40% to a sharp point. Returns (polygon,
    midrib path, half-widths, left edge, right edge)."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
    path = qbez(base, c, tip, n)
    left, right, hws = [], [], []
    for i, (x, y) in enumerate(path):
        t = i / (n - 1)
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ll = math.hypot(dx, dy) or 1.0
        ux, uy = -dy / ll, dx / ll
        hw = w / 2 * (0.7 + 0.3 * min(1.0, t / 0.2)) * min(1.0, (1.0 - t) / 0.45) ** 0.9
        hws.append(max(hw, 0.3))
        left.append((x + ux * hw, y + uy * hw))
        right.append((x - ux * hw, y - uy * hw))
    return left + right[::-1], path, hws, left, right


def sword(s, base, tip, w, bend=0.0, gloss=(0.18, 0.7), keel=0.45):
    """A silver sword leaf: the mid tone, a crisp dark keel along its shaded
    (bottom-right) half, a white wax streak inside the lit edge (the spines
    are added to the finished silhouette, see add_spines)."""
    poly, path, hws, left, right = sword_poly(base, tip, w, bend)
    m = s.poly(poly)
    pid = s.part(m, base=2, k=0, line=0)
    u, t = across(s, m, path, hws)
    facing = math.atan2(tip[1] - base[1], tip[0] - base[0])
    lit_leaf = math.cos(facing) * 0.6 + math.sin(facing) * 0.8 < 0.1
    s.decal(m & (u > (keel if lit_leaf else keel - 0.35)) & (t < 0.93), 1, on=[pid])
    if gloss and lit_leaf:
        a, b = gloss
        s.decal(m & (u < -0.3) & (u > -0.85) & (t > a) & (t < b), 3, on=[pid])
    return pid


def add_spines(t, hub, region, spacing=4.5, skip=None):
    """The spines: 1px black hooks grown diagonally out of the silhouette's
    outline along the leaf margins (never at a leaf tip, never into a notch
    between two leaves), pointing outward and toward the leaf tips (away
    from the hub), at least `spacing` px apart, inside `region` (x0, y0, x1,
    y1) and outside `skip` (a mask, e.g. the bud column)."""
    t = t.copy()
    h, w = t.shape
    op = t != T
    p = np.pad(op, 1)
    clear8 = sum((~p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]).astype(int)
                 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0))
    x0, y0, x1, y1 = region
    hx, hy = hub
    cands = []
    for y, x in zip(*np.nonzero((t == 0) & (clear8 >= 2) & (clear8 <= 4))):
        if not (x0 <= x < x1 and y0 <= y < y1) or (skip is not None and skip[y, x]):
            continue
        # outward normal: the mean direction of the clear neighbours
        nx = ny = 0.0
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if (dy or dx) and (not (0 <= yy < h and 0 <= xx < w) or not op[yy, xx]):
                    nx += dx
                    ny += dy
        rx, ry = x + 0.5 - hx, y + 0.5 - hy
        rl = math.hypot(rx, ry) or 1.0
        nl = math.hypot(nx, ny) or 1.0
        vx, vy = nx / nl + 0.9 * rx / rl, ny / nl + 0.9 * ry / rl
        sx, sy = (1 if vx > 0 else -1), (1 if vy > 0 else -1)
        qx, qy = x + sx, y + sy
        if not (0 <= qx < w and 0 <= qy < h) or op[qy, qx]:
            continue
        nb = [(qy + a, qx + b) for a in (-1, 0, 1) for b in (-1, 0, 1) if (a, b) != (0, 0)]
        touch = [(a, b) for a, b in nb if 0 <= a < h and 0 <= b < w and op[a, b]]
        if len(touch) > 2 or any(t[a, b] != 0 for a, b in touch):
            continue
        if any(op[qy, qx + d] for d in (-1, 1) if 0 <= qx + d < w) and any(
                op[qy + d, qx] for d in (-1, 1) if 0 <= qy + d < h):
            continue
        cands.append((rl, qx, qy))
    placed = []
    for rl, qx, qy in sorted(cands, key=lambda c: (-c[0], c[1], c[2])):
        if all(math.dist((qx, qy), q) >= spacing for q in placed):
            placed.append((qx, qy))
    for qx, qy in placed:
        t[qy, qx] = 0
    return t


def bracts(s, pid, path, hws, glint=None, period=4.0):
    """The bud column's bracts: a lattice of dark diagonal seams crossing
    the whole column both ways (every seam runs out to its outline, so no
    enclosed dark dot), a dark keel down the shaded side and a white tip on
    each lit bract. A `glint` (0..1 along) lights one ring of bracts."""
    m = s.pid == pid
    u, t = across(s, m, path, hws)
    L = sum(math.dist(path[i], path[i + 1]) for i in range(len(path) - 1))
    a = t * L
    # shingled bracts: each row's lower edge is a cup-shaped seam, the two
    # halves of the column staggered half a row like laid scales
    stag = np.where(u > 0.05, period / 2, 0.0)
    ph = (a - 1.4 * u ** 2 + stag) % period
    seam = m & (ph < 1.0) & (t > 0.03) & (t < 0.9) & (np.abs(u) < 1.2)
    s.decal(m & (u > 0.5), 1, on=[pid])
    s.decal(seam, 1, on=[pid])
    tipw = m & ~seam & (u < -0.15) & (u > -0.85) & (ph >= 1.0) & (ph < 2.0) & (t > 0.05) & (t < 0.88)
    s.decal(tipw, 3, on=[pid])
    if glint is not None:
        band = m & (np.abs(t - glint) < 0.07) & (u < 0.45) & ~seam
        s.decal(band, 3, on=[pid])


def soil(s, left, right, top=52.5):
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 5, top + 2.5), (left + 9, top + 1.5)]), 3, on=[pid])
    return pid


# ------------------------------------------------------------- the plant ---

# The rosette, back to front: (angle deg from the hub, -90 = up, 180 = left;
# length, width, bend, spines, flexes). The frill fans up behind the column,
# the near (left) side long and low, the far (right) side higher and shorter.
FRILL = [   # the frill: the longest leaves, fanned up behind the bud column
    (-100, 26, 5.6, -0.04, 0, True), (-80, 24, 5.6, 0.04, 0, True),
    (-118, 27, 5.8, -0.05, 0, True), (-62, 23, 5.6, 0.05, 0, True),
    (-136, 28, 6.0, -0.07, 0, True), (-45, 22, 5.6, 0.07, 0, True),
    (-153, 29, 6.2, -0.09, 0, True), (-28, 22, 5.6, 0.09, 0, True),
    (-170, 30, 6.4, -0.11, 0, True), (-12, 23, 5.8, 0.11, 0, True),
]
SIDE = [
    (176, 29, 6.4, -0.14, 0, False), (4, 22, 5.8, 0.14, 0, False),
    (160, 27, 6.4, -0.16, 0, False), (20, 21, 5.8, 0.16, 0, False),
    (143, 22, 6.4, -0.12, 0, False), (36, 18, 5.8, 0.12, 0, False),
]
LOWER = [   # the lower half of the ball: leaves angled down and out to the ground (the feet)
    (150, 22, 6.2, 0.10, 0, False), (34, 20, 6.0, -0.10, 0, False),
    (128, 19, 6.4, 0.08, 0, False), (56, 18, 6.2, -0.08, 0, False),
    (108, 17, 6.6, 0.04, 0, False), (80, 16, 6.6, -0.04, 0, False),
]
FRONT: list = []
TILT = -18.0            # the frill's lean toward the foe (degrees)
NEAR, FAR = 7.0, 5.0     # the near (foe) side's leaves are longer, the far side's shorter
CLASP = [   # the youngest leaves, clasping the foot of the bud column
    (-140, 13, 5.6, -0.04, 0, False), (-40, 11, 5.2, 0.04, 0, False),
]


def leaf_at(s, hub, a, L, w, bend, back, flex, f, amp=4.0):
    a2 = a
    if flex and f:
        e = (a + 90) / 80.0                       # -1 .. 1 across the frill
        a2 = a + f * amp * (1 if e > 0 else -1) * min(1.0, abs(e) * 1.4 + 0.25)
    r = math.radians(a2)
    tip = (hub[0] + L * math.cos(r), hub[1] + L * math.sin(r))
    if back:
        return sword(s, hub, tip, w, bend, gloss=(0.45, 0.75), keel=-0.15)
    return sword(s, hub, tip, w, bend)


def plant(s, f=0.0, glint=None):
    s.ox = 2.5
    soil(s, 9, 51)
    for a, L, w, bend, bk, fl in FRILL + SIDE:
        # the whole frill tilts toward the foe: the near side sweeps long and
        # low, the far side is lifted and shorter (the 3/4 view)
        near = math.cos(math.radians(a)) < 0
        leaf_at(s, HUB, a + TILT, L + (NEAR if near else -FAR), w, bend, bk, fl, f)
    for a, L, w, bend, bk, fl in LOWER:
        leaf_at(s, HUB, a, L, w, bend, bk, fl, f)
    for a, L, w, bend, bk, fl in FRONT:
        leaf_at(s, HUB, a, L, w, bend, bk, fl, f, amp=2.5)
    ctrl = [(33.5, 44.0), (33.2, 30.0), (30.0, 16.0), (25.5, 4.5)]
    path = bez(ctrl, 30)
    n = len(path)
    wf = lambda t: 11.0 - 6.0 * t ** 1.2  # noqa: E731
    hws = [max(0.6, wf(i / (n - 1)) / 2) for i in range(n)]
    m = s.stroke(path, wf, cap=False)
    m |= s.ellipse(25.6, 4.8, 2.6, 2.9)
    pid = s.part(m, base=2, k=0, line=0)
    s.colm = m
    bracts(s, pid, path, hws, glint)
    for a, L, w, bend, bk, fl in CLASP:
        leaf_at(s, (HUB[0], HUB[1] + 1.0), a, L, w, bend, bk, fl, 0.0)


def finish_front(s):
    t = blunt(tones(s))
    return add_spines(t, (HUB[0] + 2, HUB[1]), (0, 8, 56, 44), skip=dilate(s.colm, 2))


def front(fr=0):
    s = Spr(56, 56, SPAL)
    plant(s, FLEX[fr], GLINT[fr])
    return finish_front(s)


# ----------------------------------------------------------------- back ---

BACK_LEAVES = [   # the rosette from behind and above: a starburst, the longest leaves toward the foe
    (150, 22, 7.4, 0.05, 0), (30, 24, 7.4, -0.05, 0), (172, 24, 7.6, 0.06, 2), (8, 26, 7.6, -0.06, 2),
    (-168, 26, 8.0, 0.06, 2), (-12, 28, 8.0, -0.06, 3), (-146, 27, 8.2, 0.05, 2), (-34, 30, 8.2, -0.05, 3),
    (-124, 23, 8.0, 0.04, 2), (-50, 27, 8.0, -0.03, 3), (-104, 17, 8.2, 0.02, 0), (-80, 18, 8.2, 0.0, 0),
    (128, 18, 8.0, 0.0, 0), (52, 19, 8.0, 0.0, 0), (100, 16, 9.0, 0.0, 0), (76, 17, 9.0, 0.0, 0),
]


def back():
    """Behind and above: the frill seen from over the shoulder, a starburst
    of silver swords around the hub, the bud column rising out of it and
    leaning to the top-right toward the foe; the bottom edge cuts it off."""
    s = Spr(48, 48, SPAL)
    hub = (22.0, 34.0)
    for a, L, w, bend, sp in BACK_LEAVES:
        r = math.radians(a)
        sword(s, hub, (hub[0] + L * math.cos(r), hub[1] + L * math.sin(r)), w, bend)
    ctrl = [(22.0, 38.0), (22.8, 28.0), (26.0, 16.0), (30.5, 6.0)]
    path = bez(ctrl, 30)
    n = len(path)
    wf = lambda t: 10.0 - 5.0 * t ** 1.2  # noqa: E731
    hws = [max(0.6, wf(i / (n - 1)) / 2) for i in range(n)]
    m = s.stroke(path, wf, cap=False)
    m |= s.ellipse(30.6, 6.2, 2.4, 2.6)
    pid = s.part(m, base=2, k=0, line=0)
    colm = m
    bracts(s, pid, path, hws)
    for a, L, w, bend in ((140, 9, 6.5, 0.0), (40, 9, 6.5, 0.0), (95, 8, 7.0, 0.0)):
        r = math.radians(a)
        sword(s, (hub[0], hub[1] + 3), (hub[0] + L * math.cos(r), hub[1] + 3 + L * math.sin(r)), w, bend)
    t = blunt(tones(s, open_bottom=True))
    return add_spines(t, (hub[0], hub[1]), (0, 0, 48, 40), skip=dilate(colm, 2))


# ---------------------------------------------------------------- icon ----

# the pale bud column leaning left out of a spiky silver rosette
ICON = [
    ".....kkk........",
    "....k332k.......",
    "....k3321k......",
    ".k..k3221k...k..",
    ".kk.k3221k..kk..",
    ".k2kk3221k.k2k..",
    "..k2k32221kk21k.",
    "k..k232221k221k.",
    "kk3k232221k211kk",
    ".k32k3222212111k",
    "..k322222222111k",
    ".k223222222211k.",
    "..k111111111111k",
    "...kk1kk11kk1kk.",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows + ["." * 16])


def render():
    fs = [front(f) for f in range(len(FLEX))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


def build():
    from kit import intro_strip, write_species
    from methuselah import lead_layout
    art = render()
    fs, b, icons = art
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                  notes="Crystal rule. Puya raimondii (Queen of the Andes). REARING / displaying: a huge, "
                  "dense rosette of stiff, sword-like silver-blue leaves radiating from one hub like a "
                  "dragon's frill, the near (foe) side long and low, the far side higher; the lowest "
                  "leaves droop to the ground as two feet; out of the centre rises a tight, pale bud "
                  "column scaled with bracts, curving back then forward so its tip leans over the foe. "
                  "Black spines hook out, spaced wide, along the top edges of the outer leaves. Gesture: "
                  "the frill draws in, fans out wide and holds while a glint runs up the bud column, then "
                  "it settles; the column, the hub and the grounded leaves stay fixed. Silver blue-green "
                  "mid over a deep teal dark slot (keels, inner rosette, soil); the wax is white streaks. "
                  "Sport: the flowering colouring (greenish-white with purple), an artistic "
                  "interpretation.",
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Puya raimondii, "
                  "https://en.wikipedia.org/wiki/Puya_raimondii . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)
    lead_layout()


if __name__ == "__main__":
    build()
