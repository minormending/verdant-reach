"""Original Crystal-rule Arctium (burdock) as a roaming legendary: burr.

burr (adult, single-stage legendary), BRACED/clinging: a cluster of four
round burdock burrs, every one bristling with hooked bracts, clings to a
broad burdock leaf that it rides like a raft. The big lead burr is pushed
forward toward the foe, the others heaped behind and above it, low and
wide; a brush of thistle-purple florets crowns each burr. The leaf is
broad and heart-based, its tip curving up toward the foe like a prow, its
far edge curled up (the woolly pale underside showing) and its reddish
stalk trailing off behind.

Intro: the hooks flex and it springs forward to cling: the hooks curl in
and the cluster crouches, then it springs toward the foe with every hook
flung straight out, clings with the hooks curled tight, and settles. The
leaf raft stays registered.
Two tones: a hook green-brown dark slot (the burrs, the leaf) under a
thistle-purple mid (the floret tufts, the hooks' lit tips, the leaf's side
veins and stalk); white is the leaf's pale midrib and woolly rim, the
florets' tips, the sunlit hooks and the glints.
Faces: each burr is a sphere packed with small outward-pointing hooks (a
texture, never one dot or a slit), thin black hooks bristle from its rim,
and no dark mark is enclosed (no_dots).
Sport: the white-flowered form (burdock disk flowers are pinkish-purple,
occasionally white); see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, T, Spr, bez, erode, hop, icon_arr, moving_boxes, qbez, rim_white, shift  # noqa: E402,F401
from aspen import blunt, finish  # noqa: E402
from titan import preview  # noqa: E402

TOOL = "tools/art/crystal/burr.py"
SID = "burr"
PAL = [BLACK, "#788838", "#d0a0d0", WHITE]
# the white-flowered form: the florets (and the hooks' lit tips) turn white
SPORT = [BLACK, "#788838", "#d0c8c0", WHITE]

# per front frame: (cluster dx, dy; squash; hook reach 0 = curled in ..
# 1 = rest .. > 1 = flung straight; hook curl)
SPRING = [
    (0.0, 0.0, 1.00, 1.0, 1.0),
    (1.0, 1.0, 0.92, 0.4, 1.8),     # the hooks curl in, it crouches
    (-2.5, -1.0, 1.04, 1.5, 0.2),   # springs at the foe, hooks flung straight
    (-1.5, 0.0, 1.00, 1.1, 1.9),    # clings, hooks curled tight
    (-0.5, 0.0, 1.00, 1.0, 1.2),
]
ANIM = {"intro": [[1, 12], [2, 5], [3, 16], [4, 10], [0, 8]],
        "idle": [[0, 140], [3, 8], [0, 6]]}

# the burrs, back to front: (cx, cy, r)
BURRS = [(46.0, 27.0, 6.6), (30.0, 19.5, 8.2), (38.0, 34.0, 8.8), (18.5, 33.5, 10.6)]


# ------------------------------------------------------------- a burr -----

def burr(s, cx, cy, r, reach=1.0, curl=1.0, sq=1.0, tuft=True, seed=0):
    """One burr: a sphere packed with hooked bracts. The dark slot body with
    a black crescent on its shaded bottom-right and a white glint on its lit
    shoulder; the bracts are short curved hooks, light (mid tone) on the lit
    side and black on the shaded side, each running out to the rim; a ring
    of thin black hooks bristles out of the outline, each curling at its
    tip. A brush of purple florets with white tips crowns it."""
    ry = r * sq
    cy2 = cy + (r - ry)
    body = s.ellipse(cx, cy2, r, ry)
    pid = s.part(body, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy2)])
    du, dv = (xx + 0.5 - tcx) / r, (yy + 0.5 - tcy) / ry
    # the bracts: a packed lattice of small hooks pointing outward, light
    # (mid tone, white at the lit top-left) on the lit side, black on the
    # shaded side
    sp = 3.2
    for j in range(-4, 5):
        for i in range(-4, 5):
            u = (i + 0.5 * (j % 2)) * sp / r
            v = j * sp * 0.87 / ry
            rr = math.hypot(u, v)
            if rr > 0.86 or rr < 0.12:
                continue
            ex, ey = u / rr, v / rr
            x0, y0 = cx + u * r, cy2 + v * ry
            p1 = (x0 + ex * 1.4, y0 + ey * 1.4)
            p2 = (p1[0] - ey * 1.0 * curl, p1[1] + ex * 1.0 * curl)
            d = ex * rr + ey * rr
            tone = 3 if d < -0.55 else 2 if d < 0.15 else 0
            s.decal(s.line1([(x0, y0), p1, p2]), tone, on=[pid], lock=True)
    # the shade crescent and the glint
    s.decal(body & ~shift(body, -2, -2) & ((du + dv) > 0.3), 0, on=[pid])
    rad, ang = np.hypot(du, dv), np.arctan2(dv, du)
    s.decal(body & (rad > 0.5) & (rad < 0.8) & (ang > -2.55) & (ang < -2.05), 3, on=[pid])
    # the rim hooks: thin black spikes out of the outline, tips curling
    n = max(10, int(r * 1.6))
    hook = np.zeros_like(body)
    for k in range(n):
        a = 2 * math.pi * (k + 0.5 * (seed % 2)) / n + 0.2
        if tuft and math.sin(a) < -0.6:
            continue
        ex, ey = math.cos(a), math.sin(a)
        L = 1.6 + 1.8 * reach
        p0 = (cx + ex * (r + 0.6), cy2 + ey * (ry + 0.6))
        p1 = (cx + ex * (r + L), cy2 + ey * (ry + L))
        p2 = (p1[0] - ey * 1.2 * curl, p1[1] + ex * 1.2 * curl)
        hook |= s.line1([p0, p1, p2] if curl > 0.4 else [p0, p1])
    s.post.append((hook, 0))
    if tuft:
        florets(s, cx - r * 0.15, cy2 - ry * 0.86, r)
    return pid


def florets(s, x, y, r):
    """The floret tuft on top of a burr: a brush of purple florets flaring
    up out of the hooks and leaning toward the foe, its top parted into
    points, lit white on the left."""
    h, wb, wt, lean = r * 0.95, r * 0.45, r * 1.2, -r * 0.22
    pts = [(x - wb / 2, y + 1.5)]
    n = 4
    for k in range(n + 1):
        f = k / n
        px_ = x + lean - wt / 2 + wt * f
        depth = 0.0 if k % 2 == 0 else h * 0.32
        pts.append((px_, y + 1.5 - h + depth + abs(f - 0.5) * h * 0.25))
    pts.append((x + wb / 2, y + 1.5))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=1, line=0)
    top = m & ~shift(m, 0, -1)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tx, _), = s.T([(x + lean, y)])
    s.decal(top & shift(m, 0, 1) & (xx < tx + 1), 3, on=[pid])
    # a dark-slot split between the florets, run up from the base
    s.decal(s.line1([(x + 0.3, y + 1.0), (x + lean * 0.5 + 0.3, y + 1.5 - h * 0.6)]), 1, on=[pid])
    return pid


# ----------------------------------------------------------- the leaf -----

LEAF = [(53.0, 48.0), (50.5, 52.0), (41.0, 54.0), (28.0, 55.0), (16.0, 53.5), (8.5, 49.5), (3.5, 43.0),
        (1.0, 35.0), (4.5, 37.5), (9.5, 41.5), (18.0, 44.0), (30.0, 43.8), (42.0, 43.5), (50.0, 44.0),
        (54.5, 45.3), (51.5, 47.0)]


def leaf_raft(s):
    """The broad burdock leaf it rides like a raft: seen from the front and
    a little above, its tip curving up toward the foe like a prow, its
    heart-shaped base at the back with the stalk trailing off behind (the
    reddish petiole, in the mid tone). The dark slot with a wavy margin, a
    pale midrib, purple-tinged side veins, the far edge curled up to show
    the woolly pale underside, and black under the near edge."""
    path = bez(LEAF + LEAF[:1], 14)
    pts = []
    for i, (x, y) in enumerate(path):
        pts.append((x, y))
    stalk = s.stroke(bez([(50.0, 46.0), (54.0, 44.5), (57.5, 43.5)], 12), (3.2, 2.6), cap=False)
    sp = s.part(stalk, base=2, k=1, line=0)
    s.decal(stalk & ~shift(stalk, 0, -1), 3, on=[sp])
    m = s.poly(pts)
    pid = s.part(m, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    top = m & ~shift(m, 0, -1)
    left = m & ~shift(m, -1, 0)
    s.decal((top | (shift(top, 0, 1) & m) | (left & (xx < 8))) & (xx < 52), 3, on=[pid])
    s.decal(shift(top, 0, 2) & m & (xx > 9) & (xx < 50), 0, on=[pid])
    s.decal(s.line1(bez([(50.0, 48.0), (30.0, 49.5), (12.0, 47.0), (4.5, 39.0)], 40)), 3, on=[pid])
    for x0, x1, dy in ((44.0, 38.0, 4.5), (36.0, 29.5, 4.5), (27.0, 20.5, 4.0), (16.0, 11.5, 3.0)):
        s.decal(s.line1([(x0, 49.3), (x1, 49.3 + dy)]), 2, on=[pid])
    bot = m & ~shift(m, 0, 1)
    s.decal(shift(bot, 0, -1) & m & (xx > 6), 0, on=[pid])
    return pid, m


def cluster(s, fr=0):
    dx, dy, sq, reach, curl = SPRING[fr]
    for k, (cx, cy, r) in enumerate(BURRS):
        burr(s, cx + dx, cy + dy, r, reach=reach, curl=curl, sq=sq, seed=k)


def burr_plant(s, fr=0):
    s.ox = 0.0
    leaf_raft(s)
    cluster(s, fr)


# ------------------------------------------------------------- frames -----

def front(fr=0):
    s = Spr(56, 56, tuple(PAL[1:]))
    burr_plant(s, fr)
    return finish(s)


def back():
    """Behind and above, close: the heaped burrs from behind, their floret
    tufts on top, leaning toward the foe (the top-right), on the leaf raft
    cut by the bottom edge."""
    s = Spr(48, 48, tuple(PAL[1:]))
    pts = [(24.0 + math.cos(t) * 30.0, 45.0 + math.sin(t) * 9.0 + 0.7 * math.sin(t * 11)) for t in
           np.linspace(0, 2 * math.pi, 80, endpoint=False)]
    m = s.poly(pts)
    pid = s.part(m, base=1, k=0, line=0)
    top = m & ~shift(m, 0, -1)
    s.decal(top | (shift(top, 0, 1) & m), 3, on=[pid])
    s.decal(shift(top, 0, 2) & m, 0, on=[pid])
    for k, (cx, cy, r) in enumerate([(9.0, 33.0, 8.0), (36.0, 22.0, 9.0), (19.0, 26.0, 10.5), (30.0, 35.0, 11.0)]):
        burr(s, cx, cy, r, seed=k + 1)
    return finish(s, open_bottom=True)


# the burr cluster with purple tufts on the leaf raft
ICON = [
    "...2.2..........",
    "..23222...2.2...",
    "...222...23222..",
    "..111111..222...",
    ".131.1.1111111..",
    "131.1.1.1.1.1.1.",
    "11.1.1.1.13.1.11",
    "1.1.1.1.11.1.1.1",
    "11.1.1.1.1.1.1.1",
    ".1.1.1.11.1.1.1.",
    "3.11111..11111..",
    "33333333333333..",
    ".1111111111111..",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows + ["." * 16])


def render():
    fs = [front(f) for f in range(len(SPRING))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


NOTES = ("Crystal rule. Arctium (burdock). BRACED/clinging: a cluster of four round burdock burrs, every "
         "one bristling with hooked bracts and crowned by a tuft of thistle-purple florets, clings to a broad "
         "burdock leaf it rides like a raft; the big lead burr is pushed toward the foe, the others heaped "
         "behind and above it. The leaf is broad and heart-based with a wavy margin and pale veins, its tip "
         "toward the foe and its far edge curled up. Gesture: the hooks flex and it springs forward to "
         "cling (the hooks curl in and it crouches, springs at the foe with the hooks flung straight, clings "
         "with them curled tight and settles); the leaf raft stays fixed. A hook green-brown dark slot (the "
         "burrs, the leaf) under a thistle-purple mid (the florets, the hooks' lit tips). Sport: the "
         "white-flowered form.")


def build():
    from kit import intro_strip, write_species
    fs, b, icons = render()
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL, notes=NOTES,
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Arctium, "
                  "https://en.wikipedia.org/wiki/Arctium . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)
    from tumbleweed import wanderers_layout
    wanderers_layout()


if __name__ == "__main__":
    import os
    preview({SID: render()}, {SID: PAL}, {SID: SPORT}, os.environ.get("PREVIEW", "/tmp/burr_preview.png"))
