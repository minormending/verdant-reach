"""Original Crystal-rule Nerium oleander: oleander (single stage).

oleander (single stage, adult size class), REARING / displaying: a shrub of
several stems rising from one low mound, swaying back and then forward so
that the crown rears up over the foe. Narrow, leathery, dark green lance
leaves stand in whorls of three at each node (each with a pale midrib and a
glossy white rim on its lit edge), and every stem ends in a cluster of pink
five-petal flowers: the biggest cluster is the head, at the top left,
leaning at the foe; a second crowns the rear stem and a small one tips the
lead arm.

Intro: the flower clusters open outward: they draw in tight (the flowers
cupped and small), spread wide past rest, hold, and settle. The stems,
leaves and mound stay registered.
Two tones: a dark leathery green dark slot (leaves, stems, mound) under the
oleander's pink mid tone (the flowers).
Faces: each flower's centre is a pale white throat, never a dark dot; the
petal notches are silhouette, and flowers overlap with black lines that run
out to the cluster's outline; leaf midribs are white (light, never a black
slit); no enclosed dark dots (no_dots).
Sport: a white-flowered garden form (oleander comes in solid whites as well
as pinks and reds; 'Mont Blanc' and 'Petite White' are white cultivars);
see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, Spr, hop, icon_arr, moving_boxes, rim_white  # noqa: E402
from nightshade import finish, leaf, stem  # noqa: E402

TOOL = "tools/art/crystal/oleander.py"
SID = "oleander"
IDS = [SID]
PAL = [BLACK, "#306040", "#f088b0", WHITE]
# The white-flowered garden form: the flowers turn a blush white (kept a
# step below the shared highlight white so the petals still read).
SPORT = [BLACK, "#306040", "#e0c8d0", WHITE]
PALS = {SID: PAL}
SPAL = tuple(PAL[1:])
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 18], [4, 10], [0, 8]],
        "idle": [[0, 140], [4, 10], [0, 6]]}
# per front frame: how far the clusters are open (1 = rest)
OPEN = [1.0, 0.62, 0.86, 1.05, 0.96]


# ------------------------------------------------------------ flowers -----

def flower_poly(cx, cy, R, rot, n=90):
    """Five pinwheel petals: each lobe is skewed, so the flower turns like a
    propeller (the oleander's twisted corolla lobes)."""
    pts = []
    for i in range(n):
        th = 2 * math.pi * i / n
        f = (5 * th / (2 * math.pi)) % 1.0
        g = f ** 1.3
        r = R * (0.28 + 0.72 * math.sin(math.pi * g) ** 0.6)
        a = th + rot
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def flower(s, cx, cy, R, rot, rim=0.35, throat=True):
    """One pink flower: the pinwheel corolla, a white rim on its lit petal
    edges and a pale white throat at the centre (never a dark dot)."""
    m = s.poly(flower_poly(cx, cy, R, rot))
    pid = s.part(m, base=2, k=0, line=0)
    if rim > 0.05:
        rim_white(s, m, pid, rim if R >= 4.0 else rim * 0.5)
    if throat:
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        (tx, ty), = s.T([(cx, cy)])
        d = np.hypot(xx + 0.5 - tx, yy + 0.5 - ty)
        s.decal(m & (d < max(0.9, R * 0.3)), 3, on=[pid])
    return pid, m


def bud(s, x, y, ang, L=4.5, w=2.6):
    """A closed pink bud: a short twisted spindle."""
    tip = (x + L * math.cos(ang), y + L * math.sin(ang))
    m, _ = s.leaf((x, y), tip, w, fat=0.45, blunt=1.0)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    return pid, m


def cluster(s, cx, cy, flowers, buds=(), op=1.0):
    """A cluster at a stem's end: buds behind, then the flowers back to
    front. `flowers` = [(dx, dy, R, rot)] offsets from the cluster's centre;
    `op` < 1 draws them in tight and small (closing), > 1 spreads them."""
    for dx, dy, ang in buds:
        bud(s, cx + dx * op, cy + dy * op, ang, L=4.5 * min(1.0, op + 0.2))
    for dx, dy, R, rot in flowers:
        k = 0.72 + 0.28 * min(op, 1.08) if op < 1 else 1.0 + 0.25 * (op - 1)
        # a closing flower is cupped: its rim light and pale throat hide
        flower(s, cx + dx * op, cy + dy * op, (R - 0.3) * k, rot + (1.0 - op) * 0.8,
               rim=0.35 * min(1.0, op) ** 2, throat=op >= 0.6)


# --------------------------------------------------------------- body -----

def lance(s, base, tip, w=4.6, bend=0.0, rim=0.0):
    """A narrow leathery lance leaf: dark green, a black shade edge and a
    pale white midrib (the oleander's prominent midrib)."""
    return leaf(s, base, tip, w, bend=bend, point=1.3, rim=rim, rib=0.8)


def mound(s, x0, x1, top=51.0):
    m = s.poly([(x0, 55.5), (x0 + 3, top + 1.5), (x0 + 8, top), (x1 - 8, top), (x1 - 3, top + 1.5), (x1, 55.5)])
    pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
    s.decal(s.line1([(x0 + 5, top + 1.5), (x0 + 10, top + 0.6)]), 3, on=[pid])
    return pid


# whorls of three at the nodes: (node, [tips]), the leaves radiating out
# into the open so the silhouette shows their lance points
WHORLS_REAR = [
    ((44.5, 37.0), [(54.0, 31.5), (52.0, 45.0), (39.0, 44.0)]),
    ((45.5, 25.0), [(55.0, 17.0), (54.0, 30.0), (38.5, 24.0)]),
]
WHORLS_LEAD = [
    ((22.5, 44.5), [(11.0, 48.5), (19.0, 51.5), (14.0, 42.0)]),
]
WHORLS_MAIN = [
    ((32.5, 39.0), [(20.0, 32.5), (41.0, 31.0), (37.5, 46.5)]),
    ((25.5, 25.0), [(12.5, 26.5), (35.0, 19.0), (27.5, 32.0)]),
]


def shrub(s, fr=0):
    op = OPEN[fr]
    mound(s, 12, 52)
    # the rear stem, rearing up behind and crowned by the second cluster
    stem(s, [(35, 53), (42, 43), (45.5, 29), (42, 15)], (3.6, 2.4))
    for node, tips in WHORLS_REAR:
        for t in tips:
            lance(s, node, t, bend=0.05)
    cluster(s, 42.0, 10.0, [(-3.0, -2.5, 4.8, 0.2), (4.5, -1.0, 4.6, 0.9), (0.5, 4.0, 4.8, 1.7)],
            buds=[(6.0, -5.5, -0.9)], op=op)
    # the lead arm, low and reaching at the foe, tipped by a small cluster
    stem(s, [(30, 51), (26, 47), (20, 42), (14, 37)], (3.2, 2.2))
    for node, tips in WHORLS_LEAD:
        for t in tips:
            lance(s, node, t, bend=-0.05)
    cluster(s, 9.5, 33.0, [(-1.5, -2.0, 4.4, 0.4), (2.5, 3.0, 4.2, 1.5)],
            buds=[(-5.0, -4.0, -2.3)], op=op)
    # the main stem: back, then forward, rearing over the foe
    stem(s, [(32, 53), (34, 42), (30, 30), (22, 20), (16, 14)], (4.6, 2.6))
    for node, tips in WHORLS_MAIN:
        for t in tips:
            lance(s, node, t, bend=0.05)
    # the head: the biggest cluster, at the top left, leaning at the foe
    cluster(s, 14.0, 12.0, [(-5.5, -3.5, 5.0, 0.1), (4.0, -5.0, 4.8, 0.8), (6.0, 3.5, 4.8, 1.6),
                            (-4.5, 5.0, 4.8, 2.4), (0.5, 0.5, 5.2, 1.1)],
            buds=[(-9.5, -4.5, -2.4), (2.5, -9.0, -1.6)], op=op)


# ------------------------------------------------------------- frames -----

def front(sid=SID, fr=0):
    s = Spr(56, 56, SPAL)
    shrub(s, fr)
    return finish(s)


def back(sid=SID):
    """Behind and above: the crown rears toward the foe (top-right); the
    clusters show their open faces from above; the stems run off the
    screen's bottom edge."""
    s = Spr(48, 48, SPAL)
    stem(s, [(12, 50), (10, 40), (9, 28)], (3.8, 2.8))
    stem(s, [(36, 50), (41, 40), (43, 30)], (3.8, 2.8))
    for node, tips in (((10, 38), ((0, 31), (1, 46), (21, 47))), ((41, 38), ((48, 30), (47, 47), (29, 48)))):
        for t in tips:
            lance(s, node, t, w=5.6, bend=0.05)
    cluster(s, 9.0, 23.0, [(-3.5, -1.5, 4.8, 0.3), (3.0, -2.5, 4.8, 1.0), (0.0, 3.0, 4.8, 1.8)])
    cluster(s, 43.0, 25.0, [(-2.0, -2.0, 4.6, 0.6), (2.0, 2.5, 4.6, 1.4)])
    stem(s, [(24, 50), (25, 40), (28, 30), (30, 20)], (5.4, 3.4))
    for node, tips in (((25, 38), ((10, 33), (40, 34), (24, 48))), ((27, 29), ((14, 25), (42, 23), (33, 38)))):
        for t in tips:
            lance(s, node, t, w=6.0, bend=0.05)
    cluster(s, 30.0, 13.0, [(-8.0, 0.5, 5.6, 0.2), (-3.5, -6.5, 5.6, 0.9), (5.0, -6.0, 5.4, 1.6),
                            (9.0, 1.5, 5.4, 2.3), (4.0, 7.0, 5.6, 3.0), (-4.5, 7.0, 5.4, 0.6),
                            (0.0, 0.0, 6.0, 1.2)],
            buds=[(12.5, -8.0, -0.7)])
    return finish(s, open_bottom=True)


# the head cluster of pink flowers at the top left, a second at the top
# right, dark lance leaves and a stem below
ICON = [
    "..22.22.........",
    ".2232322..22....",
    ".22222222232222.",
    "..2223222.22322.",
    "...22k1k...22...",
    "..11..1..k1.....",
    ".11....1.1..11..",
    "........11.11...",
    "..111...1111....",
    "....11..11......",
    "......1111......",
    "....kkkkkkk.....",
]


def icon(sid=SID):
    return icon_arr(ICON + ["." * 16])


def render():
    fs = [front(SID, f) for f in range(len(OPEN))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


def build():
    import nightshade
    from kit import intro_strip, write_species
    art = render()
    ns = nightshade.render()
    nightshade.review_layout([(sid, ns[sid], nightshade.PAL) for sid in nightshade.IDS] + [(SID, art, PAL)],
                             "toxic")
    fs, b, icons = art
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                  notes="Crystal rule. Nerium oleander. REARING / displaying: a shrub of several stems "
                  "rising from one low mound, swaying back then forward so the crown rears over the foe; "
                  "narrow, leathery, dark green lance leaves in whorls of three, each with a pale midrib "
                  "and a glossy rim, and a cluster of pink five-petal pinwheel flowers at every stem's "
                  "end, the biggest (the head) at the top left. Gesture: the flower clusters draw in "
                  "tight, then open outward past rest, hold and settle; stems, leaves and mound stay "
                  "fixed. A dark leathery green dark slot under the oleander's pink mid tone. Sport: a "
                  "white-flowered garden form (blush white in the mid slot).",
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Nerium oleander, "
                  "https://en.wikipedia.org/wiki/Nerium . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)


def preview(path):
    from PIL import Image
    from kit import to_rgba
    from _d_kit import preview as pv, stats
    fs, b, icons = render()
    for k, f in enumerate(fs):
        stats(f"oleander f{k}", f)
    stats("oleander back", b)
    pv([(PAL, fs + [b] + icons), (SPORT, [fs[0]])], path)
    one = Image.new("RGB", (60 * 6, 60), (224, 232, 208))
    for k, f in enumerate(fs):
        im = Image.fromarray(to_rgba(f, PAL), "RGBA")
        one.paste(im, (2 + 60 * k, 2), im)
    one.save(str(path).replace(".png", "_1x.png"))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        preview(sys.argv[2])
    else:
        build()
