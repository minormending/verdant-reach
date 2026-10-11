"""Original Crystal-rule Arctium (burdock) as a roaming legendary: burr.

burr (adult, single-stage legendary), BRACED/clinging: three big round
burdock burrs cling to a broad burdock leaf that they ride like a raft. The
lead burr, the biggest, rides high and forward on the leaf's prow, its tip
curled up toward the foe; the other two trail behind it on the flat of the
leaf. Each burr is a light ball with a clear black rim, and its silhouette
is a halo of short black hooked spines, every tip curled into a J; a brush
of thistle-purple florets on a dark collar of bracts crowns it. The leaf is
heart-based, its far edge curled up (the woolly pale underside showing) and
its reddish stalk trailing off behind.

Intro: the hooks flex and it springs forward to cling: the hooks curl in
and the cluster crouches, then it springs toward the foe with every hook
flung straight out, clings with the hooks curled tight, and settles. The
leaf raft stays registered.
Two tones: the leaf is the dark slot (a hook green-brown), with a light
(white) midrib; the burrs are the light tone, a thistle mauve shared with
the floret brushes, so they stand clear of the leaf. The bracts seen end-on
are dark-slot hooks running in from each burr's rim (black in the shade);
white is the leaf's midrib and woolly rim, the florets' tips and the glints.
Faces: every dark mark on a burr runs in from its outline (never a dot or
an island), the spines are J-shaped lines outside the rim, the seams where
burrs overlap are curves, and no dark mark is enclosed (no_dots).
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
PAL = [BLACK, "#607030", "#d0a8c8", WHITE]
# the white-flowered form: the florets (and the burrs, which share their slot) turn off-white
SPORT = [BLACK, "#607030", "#d0c8b8", WHITE]

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
BURRS = [(46.5, 32.5, 6.6), (34.5, 35.0, 9.6), (16.0, 25.0, 11.5)]


# ------------------------------------------------------------- a burr -----

def burr(s, cx, cy, r, reach=1.0, curl=1.0, sq=1.0, tuft=True, seed=0):
    """One burr: a sphere packed with hooked bracts, in the light tone with a
    clear black rim, and a halo of short black hooked spines bristling from
    the whole rim, every tip curled into a J, so the ball's edge is spiky.
    A dark-slot shade crescent on its bottom-right has a sawtooth inner edge
    (the bracts' tips catching the light), small white hook-glints curl over
    its lit side, and a white glint sits on its shoulder. A brush of purple
    florets crowns it."""
    ry = r * sq
    cy2 = cy + (r - ry)
    # the halo first (the ball covers the spines' roots): black hooked
    # spines, radial, each tip turned back into a J
    n = max(12, int(r * 1.3))
    hook = np.zeros((s.h, s.w), bool)
    for k in range(n):
        a = 2 * math.pi * (k + 0.5 * (seed % 2)) / n + 0.12
        if tuft and math.sin(a) < -0.8:
            continue
        ex, ey = math.cos(a), math.sin(a)
        L = 2.6 + 1.6 * reach
        p0 = (cx + ex * (r - 0.5), cy2 + ey * (ry - 0.5))
        p1 = (cx + ex * (r + L), cy2 + ey * (ry + L))
        p2 = (p1[0] - ey * 1.6 * curl, p1[1] + ex * 1.6 * curl)
        p3 = (p2[0] - ex * 1.3 * curl, p2[1] - ey * 1.3 * curl)
        hook |= s.line1([p0, p1, p2, p3] if curl > 0.4 else [p0, p1])
    s.ink(hook, 0)
    body = s.ellipse(cx, cy2, r, ry)
    pid = s.part(body, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy2)])
    du, dv = (xx + 0.5 - tcx) / r, (yy + 0.5 - tcy) / ry
    rad, ang = np.hypot(du, dv), np.arctan2(dv, du)
    # the shade crescent on the bottom-right
    s.decal(body & ((du + dv) * 0.7071 > 0.62) & (rad > 0.75), 1, on=[pid])
    # the bracts seen end-on: hooked spines running in from the rim all the
    # way round (each joins the outline, so none is an island), dark-slot on
    # the lit side and black in the shade; the middle of the ball stays clean
    m_ = max(16, int(r * 2.2))
    for k in range(m_):
        a = 2 * math.pi * (k + 0.5) / m_ + 0.12 + 0.2 * seed
        ex, ey = math.cos(a), math.sin(a)
        r0 = 0.62 if k % 2 else 0.74
        p0 = (cx + ex * r * 1.02, cy2 + ey * ry * 1.02)
        p1 = (cx + ex * r * r0, cy2 + ey * ry * r0)
        p2 = (p1[0] - ey * 1.2 * curl, p1[1] + ex * 1.2 * curl)
        shade = (ex + ey) > 0.35
        if (ex + ey) < -1.05 and k % 2:
            continue                                  # the lit shoulder stays clean
        s.decal(s.line1([p0, p1, p2]), 0 if shade else 1, on=[pid], lock=True)
    rim_white(s, body, pid, 0.26)
    s.decal(body & (rad > 0.4) & (rad < 0.72) & (ang > -2.55) & (ang < -2.05), 3, on=[pid])
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
    s.decal(top & shift(m, 0, 1) & (xx < tx + 3), 3, on=[pid])
    # the collar of bracts hugging the brush's base
    s.decal(m & ~shift(m, 0, 2), 1, on=[pid])
    # a dark-slot split between the florets, run up from the base
    s.decal(s.line1([(x + 0.3, y + 1.0), (x + lean * 0.5 + 0.3, y + 1.5 - h * 0.6)]), 1, on=[pid])
    return pid


# ----------------------------------------------------------- the leaf -----

LEAF = [(53.0, 48.0), (50.5, 52.5), (40.0, 54.5), (28.0, 55.0), (17.0, 53.5), (9.5, 50.0), (4.5, 44.5),
        (2.0, 37.0), (1.5, 29.0), (3.0, 21.5), (6.0, 26.0), (8.0, 33.0), (11.5, 39.5), (16.0, 44.5),
        (24.0, 46.3), (34.0, 46.5), (44.0, 46.0), (51.0, 46.3), (54.5, 47.0), (51.5, 48.0)]


def leaf_raft(s):
    """The broad burdock leaf it rides like a raft, mostly the dark slot: seen
    from the front and a little above, its tip curled high toward the foe
    like a prow, its heart-shaped base at the back with the reddish stalk
    trailing off behind (the mid tone). A light midrib (white), the far edge
    curled up to show the woolly pale underside, black under the near edge."""
    path = bez(LEAF + LEAF[:1], 14)
    stalk = s.stroke(bez([(50.0, 46.5), (54.0, 45.0), (57.5, 44.0)], 12), (3.2, 2.6), cap=False)
    sp = s.part(stalk, base=2, k=1, line=0)
    s.decal(stalk & ~shift(stalk, 0, -1), 3, on=[sp])
    m = s.poly(path)
    pid = s.part(m, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    top = m & ~shift(m, 0, -1)
    left = m & ~shift(m, -1, 0)
    s.decal((top | (shift(top, 0, 1) & m) | (left & (xx < 8))) & (xx < 52), 3, on=[pid])
    s.decal(shift(top, 0, 2) & m & (xx > 9) & (xx < 50), 0, on=[pid])
    s.decal(s.line1(bez([(50.0, 49.0), (30.0, 50.5), (13.0, 48.0), (5.5, 40.0), (3.8, 31.0), (4.0, 26.0)], 40)), 3, on=[pid])
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
    for k, (cx, cy, r) in enumerate([(8.0, 37.0, 7.5), (20.0, 34.0, 10.0), (33.0, 22.0, 12.5)]):
        burr(s, cx, cy, r, seed=k + 1)
    return finish(s, open_bottom=True)


# the burr cluster with purple tufts on the leaf raft
ICON = [
    "...2.2..........",
    "..23222.........",
    "k..222..k.2.2...",
    ".k22222k.23222..",
    ".233222.k.222..k",
    "k2322222.22222k.",
    ".22222221222221.",
    "k2222221.222211k",
    ".1222211k1221111",
    "3.11111.k.1111.k",
    "3...k.k...k.k...",
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


NOTES = ("Crystal rule. Arctium (burdock). BRACED/clinging: three big round burdock burrs cling to a broad "
         "burdock leaf they ride like a raft; the lead burr rides high and forward on the leaf's prow, curled "
         "up toward the foe, the other two trail behind. Each burr is a light ball with a clear black rim and "
         "a halo of short black hooked spines (J-tipped), crowned by a brush of thistle-purple florets. "
         "Gesture: the hooks flex and it springs forward to cling (the hooks curl in and it crouches, springs "
         "at the foe with the hooks flung straight, clings with them curled tight and settles); the leaf raft "
         "stays fixed. The leaf is the hook green-brown dark slot with a pale midrib; the burrs and florets "
         "share the light thistle mauve. Sport: the white-flowered form.")


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
