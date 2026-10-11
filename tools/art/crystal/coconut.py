"""Original Crystal-rule Cocos nucifera (coconut) as a roaming legendary:
coconut.

coconut (adult, single-stage legendary), REARING/displaying: a full,
rounded husked coconut (a fat ovoid with a slightly three-sided shoulder)
sits deep in a curling wave, its blunt point raised toward the foe like a
prow, long black husk-fibre lines following its curve over a dark-slot
shadow side. From its stalk end a young palm sprout rises and fans out
three arching, pleated fronds with forked tips (a seedling's leaves are
undivided); the big lead frond arches over the foe, the outer half of its
edge split into leaflets so it reads as a palm, one rises straight up and
the rear one sweeps back over the wave's crest. The wave curls up behind
the nut and over toward the foe; the sea runs in front of the nut, so the
nut sits in the water, and the motion reads as travel.

Intro: it bobs on the wave and the fronds unfurl: the nut dips, its fronds
furled tight; it rises on the swell while the fronds open, flare past the
rest pose, and settle. The wave and the sea stay registered.
Two tones: a palm-green dark slot (the fronds, the sea, the husk's shadow
side and shoulder ridge) under a husk-brown mid (the nut, the frond
midribs' light); the husk fibre is outline black; the wave is the dark slot
under white foam and the black outline.
Faces: the nut is shown from the side, its fibre lines long and running out
to its outline; the
three germination pores (two plugged "eyes" and one open pore) are on the
far end, under the sprout, so the sprite never shows three dark spots; no
enclosed dark dots anywhere (no_dots).
Sport: 'Malayan Dwarf', yellow form (Malayan Yellow Dwarf): yellow young
fruit and petioles; see docs/SPORTS.md.
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

TOOL = "tools/art/crystal/coconut.py"
SID = "coconut"
PAL = [BLACK, "#387858", "#c89048", WHITE]
# 'Malayan Dwarf', yellow form: yellow young fruit and petioles
SPORT = [BLACK, "#688830", "#e0c048", WHITE]

# per front frame: (nut bob in px, + = up; frond opening, 0 = furled .. 1 =
# open, > 1 = flared past the rest pose)
BOB = [(0.0, 1.0), (-1.0, 0.0), (2.0, 0.45), (1.0, 1.18), (0.0, 0.92)]
ANIM = {"intro": [[1, 12], [2, 6], [3, 16], [4, 10], [0, 8]],
        "idle": [[0, 130], [4, 10], [0, 6]]}


# ------------------------------------------------------------- the sea ----

WAVE = [(-2.0, 58.0), (-2.0, 51.5), (6.0, 50.0), (14.0, 51.0), (22.0, 49.5), (30.0, 47.5), (36.0, 45.5),
        (42.0, 43.0), (47.0, 38.5), (49.5, 32.0), (48.5, 27.0), (44.5, 24.8), (39.5, 24.6), (36.0, 23.0),
        (38.0, 19.0), (42.5, 16.0), (48.0, 15.0), (50.5, 16.5), (52.5, 20.5), (53.0, 28.0), (53.5, 58.0)]


def wave(s):
    """The sea and the wave curling up behind the nut and over toward the
    foe, one body of water: the dark slot, a scalloped band of white foam
    along the lip of the curl, the foam line of the sea's surface, and white
    swell lines down the face."""
    m = s.poly(WAVE)
    pid = s.part(m, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    # foam on the lip: 2-4 px deep from the top/left edge, its lower edge
    # scalloped into fingers
    depth = 2 + (np.sin(xx * 1.15) > 0.1).astype(int) + (np.sin(xx * 0.55 + 1.0) > 0.6).astype(int)
    band = np.zeros_like(m)
    for d in range(1, 5):
        band |= m & ~shift(m, 0, -d) & (d <= depth)
        band |= m & ~shift(m, -d, 0) & (d <= 2)
    s.decal(band & (yy < 28), 3, on=[pid])
    top = m & ~shift(m, 0, -1)
    s.decal(top & (xx < 41), 3, on=[pid])
    # swell lines curving down the face, under the lip
    for ctrl in ([(47.5, 22.0), (49.0, 28.0), (48.5, 35.0)], [(52.5, 25.0), (53.5, 32.0), (53.0, 40.0)],
                 [(49.0, 38.0), (47.5, 44.0)]):
        s.decal(s.line1(bez(ctrl, 20)), 3, on=[pid])
    return pid, m


def spray(s):
    """Spray flung off the lip: three white drops (a white ring of foam on
    the background, black-outlined)."""
    for x, y, r in ((32.5, 20.5, 1.3), (34.0, 15.5, 1.0), (38.5, 12.5, 1.0)):
        m = s.ellipse(x, y, r, r)
        s.part(m, base=3, k=0, line=0)


def foam(s, wave_pid):
    """The sea in front of the nut's waterline: a strip of the same water
    (no line where it meets the wave) with foam lapping the nut."""
    top = [(x, 51.5 - 1.1 * math.sin(x / 3.2 + 1.0)) for x in np.linspace(-2, 58, 40)]
    m = s.poly(top + [(58, 58), (-2, 58)])
    pid = s.part(m, base=1, k=0, line=0, merge=(wave_pid,))
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    edge = m & ~shift(m, 0, -1)
    s.decal(edge & (xx < 40), 3, on=[pid])
    s.decal(shift(edge, 0, -1) & m & (xx > 10) & (xx < 32), 3, on=[pid])
    for ctrl in ([(3.0, 54.5), (9.0, 54.0), (13.0, 54.5)], [(37.0, 54.0), (43.0, 53.5)]):
        s.decal(s.line1(bez(ctrl, 20)), 3, on=[pid])
    return pid


# ------------------------------------------------------------- the nut ----

def nut_poly(cx, cy, rx, ry, ang, point=0.35, facets=0.0):
    """A coconut in its husk seen from the side: a fat ovoid drawn out to a
    blunt point at one end (the end away from the stalk), slightly
    three-sided (`facets`), turned by `ang` degrees."""
    pts = []
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    for k in range(96):
        t = 2 * math.pi * k / 96
        x = math.cos(t)
        y = math.sin(t)
        r = 1.0 + point * max(0.0, -x) ** 3            # the point toward -x (the foe)
        r *= 1.0 + facets * math.cos(3 * (t - 0.35))
        px_, py_ = rx * x * r, ry * y * r * (1.0 - 0.22 * max(0.0, -x) ** 2)
        pts.append((cx + px_ * ca - py_ * sa, cy + px_ * sa + py_ * ca))
    return pts


NUT = (21.0, 40.0, 14.2, 11.4, 16.0)       # cx, cy, rx, ry, angle (the point raised toward the foe)


def nut(s, cx, cy, shape=None, point=0.24):
    """The husked nut, fat and slightly three-sided: the husk-brown mid on
    its lit upper facet, a broad dark-slot shadow over its lower side, a
    ridge in the dark slot along its shoulder between the facets, long black
    husk-fibre lines following its curve from the point to the stalk end
    (every one runs out to the outline; never a dot), a white rim and glint
    on its lit top-left. Its pores are on the stalk end, under the sprout."""
    _, _, rx, ry, ang = shape or NUT
    m = s.poly(nut_poly(cx, cy, rx, ry, ang, point=point, facets=0.05))
    pid = s.part(m, base=2, k=0, line=0)
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def P(u, v):          # nut coordinates (u along, v across, both -1..1) -> canvas
        x, y = u * rx, v * ry
        return (cx + x * ca - y * sa, cy + x * sa + y * ca)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    X, Y = xx + 0.5 - tcx, yy + 0.5 - tcy
    u = (X * ca + Y * sa) / rx
    v = (-X * sa + Y * ca) / ry
    # the shadow side: the lower facet, below the shoulder ridge
    ridge_v = lambda uu: 0.18 - 0.12 * uu        # noqa: E731
    s.decal(m & (v > ridge_v(u) + 0.05 + 0.25 * (1 - np.abs(u))), 1, on=[pid])
    s.decal(m & (v > 0.15) & (u > 0.55), 1, on=[pid])
    # the shoulder ridge between the lit facet and the shaded one
    s.decal(s.line1([P(uu, ridge_v(uu) + 0.25 * (1 - abs(uu)) - 0.02) for uu in np.linspace(-1.1, 1.05, 30)]),
            1, on=[pid])
    # husk fibre: long black lines from the point, following the curve
    for c, u0, u1 in ((-0.45, -0.98, 0.35), (0.05, -1.02, 0.7), (0.55, -0.85, 1.02), (0.85, -0.2, 0.95)):
        pts = [P(uu, c * math.sqrt(max(0.0, 1.0 - uu * uu)) * 1.02) for uu in np.linspace(u0, u1, 30)]
        s.decal(s.line1(pts), 0, on=[pid], lock=True)
    # the lit facet: a white rim and a glint along the top-left
    rim_white(s, m, pid, 0.32)
    s.decal(s.line1([P(uu, -0.68 * math.sqrt(1 - uu * uu)) for uu in np.linspace(-0.55, 0.0, 10)]), 3, on=[pid])
    return pid, m


# ----------------------------------------------------------- the fronds ---

# the fronds, from the sprout's crown: (open tip, furled tip, width, bend,
# ridge glints); the lead frond arches over the foe, the rear one sweeps back
FRONDS = [
    ((49.0, 5.0), (35.0, 2.0), 4.6, -0.30),       # rear, back over the crest
    ((27.0, 1.5), (29.0, 1.5), 4.8, 0.18),        # up
    ((2.5, 15.0), (22.0, 2.0), 7.0, 0.36),        # lead, arching over the foe, split into leaflets
]
CROWN = (29.5, 24.0)


def frond(s, base, tip, w, bend, leaflets=False):
    """One young coconut leaf (a seedling's leaves are undivided): a long
    arching blade, pleated. The palm-green dark slot, its midrib catching
    the light in the mid tone, short black pleat folds running in from its
    shaded edge, and a white rim on its lit upper edge."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.5)
    pid = s.part(m, base=1, k=0, line=0)
    n = len(path)
    s.decal(s.line1(path[int(n * 0.1):int(n * 0.85)]), 2, on=[pid])
    # pleats: on the side of the blade away from the light
    for i in range(int(n * 0.22), int(n * (0.42 if leaflets else 0.82)), max(4, n // 9)):
        (x0, y0), (x1, y1) = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        ll = math.hypot(x1 - x0, y1 - y0) or 1.0
        nx, ny = -(y1 - y0) / ll, (x1 - x0) / ll
        if nx + ny < 0:
            nx, ny = -nx, -ny                    # toward the shaded (bottom-right) edge
        tx, ty = (x1 - x0) / ll, (y1 - y0) / ll
        px_, py_ = path[i]
        s.decal(s.line1([(px_ + nx * 1.2 - tx * 0.8, py_ + ny * 1.2 - ty * 0.8),
                         (px_ + nx * w * 0.6 - tx * 2.0, py_ + ny * w * 0.6 - ty * 2.0)]), 0, on=[pid])
    rim_white(s, m, pid, 0.6)
    # the forked (bifid) tip of a young coconut leaf: a notch split down
    # the end of the blade
    notch = s.stroke(path[int(n * 0.86):] + [(path[-1][0] * 2 - path[-3][0], path[-1][1] * 2 - path[-3][1])],
                     (0.6, 1.6), cap=False)
    s.erase(notch & (s.pid == pid))
    if leaflets:
        # the outer half of its shaded edge splits into leaflets: cuts from
        # the edge in toward the midrib, slanting back toward the base
        for t in (0.48, 0.6, 0.72):
            i = int(n * t)
            (x0, y0), (x1, y1) = path[i - 1], path[i + 1]
            ll = math.hypot(x1 - x0, y1 - y0) or 1.0
            nx, ny = -(y1 - y0) / ll, (x1 - x0) / ll
            if nx + ny < 0:
                nx, ny = -nx, -ny
            tx, ty = (x1 - x0) / ll, (y1 - y0) / ll
            px_, py_ = path[i]
            cut = s.stroke([(px_ + nx * 1.6, py_ + ny * 1.6),
                            (px_ + nx * (w * 0.75 + 1.5) - tx * 3.0, py_ + ny * (w * 0.75 + 1.5) - ty * 3.0)],
                           (1.1, 2.1), cap=False)
            s.erase(cut & (s.pid == pid))
    return pid, m


def sprout(s, opening=1.0, dy=0.0):
    """The sprout's stalk out of the husk, and its three fronds fanning up."""
    cx, cy = CROWN[0], CROWN[1] - dy
    m = s.stroke(bez([(31.0, 31.0 - dy), (30.5, 27.5 - dy), (cx, cy)], 20), (4.4, 3.2), cap=True)
    stalk = s.part(m, base=1, k=0, line=0)
    rim_white(s, m, stalk, 0.5)
    for n_, (ot, ft, w, bend) in enumerate(FRONDS):
        k = opening
        tx = ft[0] + (ot[0] - ft[0]) * k
        ty = ft[1] + (ot[1] - ft[1]) * k - dy
        if k > 1.0:                             # flare: the tips droop and spread further
            ty += (k - 1.0) * 10.0
        frond(s, (cx, cy + 1.0), (tx, ty), w, bend * min(1.0, 0.35 + 0.65 * k), leaflets=n_ == 2 and k > 0.7)


def coconut(s, fr=0):
    bob, opening = BOB[fr]
    s.ox = 0.0
    wp, _ = wave(s)
    spray(s)
    nut(s, NUT[0], NUT[1] - bob)
    sprout(s, opening, bob)
    foam(s, wp)


# ------------------------------------------------------------- frames -----

def front(fr=0):
    s = Spr(56, 56, tuple(PAL[1:]))
    coconut(s, fr)
    return finish(s)


def back():
    """Behind and above, close: the nut riding away toward the top-right on
    the swell, the sprout's fronds fanned up and back toward the foe, the
    sea cut off by the bottom edge."""
    s = Spr(48, 48, tuple(PAL[1:]))
    m = s.poly([(x, 38.0 - 1.5 * math.sin(x / 4.0)) for x in np.linspace(-2, 50, 30)] + [(50, 50), (-2, 50)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(m & ~shift(m, 0, -1), 3, on=[pid])
    nut(s, 22.0, 35.0, shape=(0, 0, 18.0, 14.0, 4.0), point=0.08)
    for tip, w, bend in (((4.0, 7.0), 9.0, 0.25), ((46.0, 6.0), 9.0, -0.25), ((29.0, 1.0), 9.5, -0.12)):
        frond(s, (27.0, 21.0), tip, w, bend)
    sm = s.stroke(bez([(28.0, 26.0), (27.0, 21.0)], 10), 5.0, cap=True)
    sp = s.part(sm, base=1, k=0, line=0)
    rim_white(s, sm, sp, 0.5)
    front_sea = s.poly([(x, 44.0 - 1.2 * math.sin(x / 3.0 + 1.0)) for x in np.linspace(-2, 50, 30)] + [(50, 50), (-2, 50)])
    fp = s.part(front_sea, base=1, k=0, line=0)
    s.decal(front_sea & ~shift(front_sea, 0, -1), 3, on=[fp])
    return finish(s, open_bottom=True)


# the nut on the swell, its pointed end toward the foe, the sprout's fronds
# fanned up, a white wave crest curling behind
ICON = [
    "......1.........",
    "...1..31..1.....",
    "11..1.31.31..33.",
    "1331.1313...3311",
    ".1.1.1.11..31111",
    "....1111...11.11",
    "...23322....1111",
    "..2222222...1111",
    ".22.222222..1111",
    ".2222.22221.1111",
    ".122222.2211.111",
    "..1122222111.11.",
    "3311111111133311",
    "1111111111111111",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows + ["." * 16])


def render():
    fs = [front(f) for f in range(len(BOB))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


NOTES = ("Crystal rule. Cocos nucifera. REARING/displaying: a full, rounded husked coconut (a fat ovoid "
         "with a slightly three-sided shoulder, long black fibre lines over a dark shadow side) sits deep in "
         "a curling wave, its point raised toward the foe like a prow; from its stalk end a young palm sprout "
         "fans out three arching, pleated, fork-tipped fronds (the lead frond over the foe, its edge split "
         "into leaflets, one straight up, the rear one back over the crest). The wave curls up behind the nut and over toward the foe; the sea runs "
         "in front of the nut. Gesture: it bobs on the wave and the fronds unfurl (it dips with its fronds "
         "furled, rises on the swell as they open, flares and settles); the wave and the sea stay fixed. "
         "A palm-green dark slot (fronds, sea, husk shadow) under a husk-brown mid; the wave is the "
         "dark slot under white foam. The nut is shown from the side, its germination pores turned away. "
         "Sport: 'Malayan Dwarf', yellow form (Malayan Yellow Dwarf).")


def build():
    from kit import intro_strip, write_species
    fs, b, icons = render()
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL, notes=NOTES,
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Cocos nucifera, "
                  "https://en.wikipedia.org/wiki/Coconut . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)
    from tumbleweed import wanderers_layout
    wanderers_layout()


if __name__ == "__main__":
    import os
    preview({SID: render()}, {SID: PAL}, {SID: SPORT}, os.environ.get("PREVIEW", "/tmp/coconut_preview.png"))
