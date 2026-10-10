"""Original Crystal-rule Maranta leuconeura (the prayer plant): prayer_plant.

prayer_plant (single stage, adult size class), BRACED: a low, wide clump of
broad oval leaves on short green stalks. Two big leaves lie open on the
ground at either side (the feet, the lead one bigger and ahead at the foe),
two more are half raised as arms, and in the middle two leaves stand upright,
folded up and pressed together like praying hands, tilted toward the foe:
the plant's signature and its head. The open leaves show their upper
surface, deep green with red-pink herringbone veins (a red midrib, slanted
lateral veins, and a red feather down the centre broken by elongated dark
green blotches along the midrib); the raised leaves show their red-pink
undersides.

Intro: night falls, so the leaves fold up: after a small dip, the arm
leaves rise upright and fold, turning their red undersides out beside the
praying pair, and the lead foot leaf lifts halfway, until the clump stands
in prayer; it holds, then the leaves open again and settle. The praying
pair, the far foot leaf, the stalks and the soil stay (nearly) registered.
Two tones: deep green in the dark slot (the leaf blades, blotches, stalks
and shade) and the red-pink vein colour as the mid tone (veins, the central
feather and the undersides), after var. erythroneura; white is the leaves'
glossy lit rims and glints.
Faces: the blotches are elongated marks along the midrib that alternate
sides (never a pair of round spots at one height), joined to the dark
blade; no enclosed dark dots anywhere (no_dots).
Sport: Maranta leuconeura var. kerchoveana, the green form with dark
blotches between the veins and light green undersides; see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 7.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math

import numpy as np

from _d_kit import BLACK, WHITE, Spr, bez, erode, hop, icon_arr, moving_boxes, rim_white
from aspen import finish

TOOL = "tools/art/crystal/prayer.py"
SID = "prayer_plant"
PAL = [BLACK, "#285c38", "#e86078", WHITE]
SPORT = [BLACK, "#6c9850", "#c8e0a0", WHITE]
PALS = {SID: PAL}
# per front frame, how far the arm and foot leaves are folded up (0 open
# by day .. 1 upright in prayer at night)
FOLD = [0.0, -0.15, 0.5, 1.0, 0.45]
ANIM = {"intro": [[0, 6], [1, 10], [2, 6], [3, 20], [4, 8], [0, 10]],
        "idle": [[0, 140], [1, 10], [0, 6]]}


# ------------------------------------------------------------- parts ------

def glint(s, m, pid, frac):
    """A white glint just inside the lit (top-left) edge, one or two pixels
    in from the outline (two on a big blade), over the top-left `frac` of
    the form: a shine on the glossy blade that never runs along the
    silhouette's top edge."""
    inner = erode(m, 2 if m.sum() > 90 else 1)
    rim_white(s, inner, pid, frac)


def frame_of(s, base, tip):
    """Per-pixel (a, c, L): distance along base->tip, signed distance across
    it (+ = to the right of the direction), and the length."""
    (bx, by), (tx, ty) = s.T([base, tip])
    L = math.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / L, (ty - by) / L
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    px, py = xx + 0.5 - bx, yy + 0.5 - by
    return px * ux + py * uy, px * -uy + py * ux, L, (ux, uy)


def blade(s, base, tip, w, fat=0.5, bend=0.0):
    """A broad oval leaf blade from its stalk end to its tip; returns (mask,
    half-width function of t)."""
    m, path = s.leaf(base, tip, w, fat=fat, blunt=0.0, bend=bend)
    p = math.log(0.5) / math.log(fat)
    return m, (lambda t: np.maximum(w * np.sin(math.pi * np.clip(t, 0, 1) ** p) ** 0.85 / 2, 0.3))


def upper_leaf(s, base, tip, w, period=4.4, slant=0.9, rim=0.36, line=0, blots=True, bend=0.0):
    """An open leaf, upper surface up: the deep green blade with red-pink
    herringbone veins (a red midrib, and 1px lateral veins slanting out
    toward the tip on both sides), and elongated black-green blotches along
    the midrib between the laterals, on alternate sides (dashes, never a
    pair of round spots at one height; joined to the dark blade, never
    enclosed by light). A white rim on the lit edge."""
    m, hwf = blade(s, base, tip, w, bend=bend)
    pid = s.part(m, base=1, k=0, line=line)
    bx, by = base
    L = math.dist(base, tip)
    ux, uy = (tip[0] - bx) / L, (tip[1] - by) / L
    nx, ny = -uy, ux
    P = lambda a, c: (bx + ux * a + nx * c, by + uy * a + ny * c)  # noqa: E731
    hw = lambda a: float(hwf(np.array(a / L)))  # noqa: E731
    s.decal(s.line1([P(a, 0) for a in np.linspace(L * 0.04, L * 0.93, 60)]), 2, on=[pid])
    k = 0
    a = L * 0.16
    while a < L * 0.8:
        h = hw(a) * 0.92
        for sd in (1, -1):
            s.decal(s.line1([P(a + j * slant, sd * j) for j in np.linspace(0.6, h, 12)]), 2, on=[pid], lock=True)
        if blots and h > 2.4:
            sd = 1 if k % 2 == 0 else -1
            s.decal(s.line1([P(a + period * 0.5 + 0.3 + j, sd * 1.6) for j in np.linspace(0, period * 0.55, 6)]),
                    0, on=[pid])
        a += period
        k += 1
    if rim:
        glint(s, m, pid, rim)
    return pid, m


def under_leaf(s, base, tip, w, rim=0.45, line=0, rib=True, bend=0.0, sheen=True):
    """A raised leaf folded up, showing its red-pink underside: the mid tone
    with a deep green crescent on its shaded side, a green midrib, and a
    white rim on the lit edge."""
    m, hwf = blade(s, base, tip, w, fat=0.45, bend=bend)
    pid = s.part(m, base=2, k=2, sh_tone=1, line=line)
    a, c, L, (ux, uy) = frame_of(s, base, tip)
    t = a / L
    if rib:
        s.decal(m & (np.abs(c - 0.3) < 0.5) & (t > 0.12) & (t < 0.8), 1, on=[pid])
    if sheen:
        # a glossy streak down the lit half, parallel to the midrib
        lit = -1.0 if (-uy * 0.6 + ux * 0.8) > 0 else 1.0      # the side facing the top-left
        hw = np.maximum(hwf(t), 0.5)
        s.decal(m & (np.abs(c - lit * hw * 0.5) < 0.5) & (t > 0.25) & (t < 0.62), 3, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


def leaf(s, node, ang, length, w, fold, base_len=4.0, lean=5.0):
    """A leaf on its short stalk from `node`, open at `ang` degrees; `fold`
    0 lies it open (upper surface), 1 raises it upright and folds it in half
    (a narrow blade showing its underside)."""
    f = min(1.0, max(-0.3, fold))
    up = -90.0 + (lean if math.cos(math.radians(ang)) > 0 else -lean)
    # rotate toward upright by the shorter way
    d = (up - ang + 180) % 360 - 180
    a = ang + d * f                    # a negative fold dips the leaf flatter
    nx, ny = node
    bx, by = nx + math.cos(math.radians(a)) * base_len, ny + math.sin(math.radians(a)) * base_len
    stalk(s, [(nx, ny), (bx, by)])
    ln = length * (1.0 - 0.1 * max(0.0, f))
    tx, ty = bx + math.cos(math.radians(a)) * ln, by + math.sin(math.radians(a)) * ln
    if f > 0.55:
        return under_leaf(s, (bx, by), (tx, ty), w * (0.78 - 0.1 * f))
    sq = 1.0 - 0.35 * max(0.0, f)
    return upper_leaf(s, (bx, by), (tx, ty), w * sq)


def stalk(s, ctrl, w=2.0):
    """A short green leaf stalk; a thick one shines down its lit side."""
    path = bez(ctrl, 30)
    m = s.stroke(path, w, cap=True)
    pid = s.part(m, base=1, k=0, line=0)
    if w >= 2.3:
        s.decal(s.line1([(x - 0.5, y) for x, y in path[6:22]]), 3, on=[pid], lock=True)
    return pid


def soil(s, left, right, top=52.5):
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.stroke([(left + 4.5, top + 2.2), (left + 9.5, top + 0.9)], 1.2, cap=False), 3, on=[pid])
    return pid


# ------------------------------------------------------------- plant ------

def plant(s, fr=0):
    f = FOLD[fr]
    s.ox = 2
    soil(s, 13, 45)
    # the half-raised arm leaves behind the praying pair
    leaf(s, (32, 46), -38, 19.0, 12.5, 0.25 + 0.75 * f, lean=28.0)
    leaf(s, (26, 46), -140, 20.0, 13.0, 0.2 + 0.8 * f, lean=28.0)
    # the praying pair: two leaves upright and pressed together, tilted at the foe
    stalk(s, [(28, 51), (22.5, 42)], 2.4)
    stalk(s, [(30, 51), (34.5, 42)], 2.4)
    pid, m = under_leaf(s, (34.5, 43), (26.0, 3.2), 11.0, rim=0.0, bend=0.1)
    glint(s, m, pid, 0.32)
    upper_leaf(s, (22.0, 43), (25.0, 3.6), 11.0, period=3.6, rim=0.4, bend=-0.1)
    # the foot leaves lying open on the ground at either side; at night they
    # rise only halfway
    leaf(s, (33, 51), -9, 20.0, 13.0, 0.12 * f, base_len=3.0)
    leaf(s, (26, 51), -172, 22.5, 14.0, 0.55 * f, base_len=3.0)


def front(fr=0):
    s = Spr(56, 56, tuple(PAL[1:]))
    plant(s, fr)
    return finish(s)


def back():
    """Behind and above: the clump seen from over its shoulder, open leaves
    fanned out flat (their herringbone upper surfaces up), the praying pair
    rising toward the top-right (the foe), the base cut off by the bottom
    edge."""
    s = Spr(48, 48, tuple(PAL[1:]))
    upper_leaf(s, (22, 40), (2, 20), 15.0)
    upper_leaf(s, (27, 40), (47, 22), 14.0)
    pid, m = under_leaf(s, (28, 38), (31, 3), 13.0, rim=0.0, bend=0.1)
    glint(s, m, pid, 0.2)
    upper_leaf(s, (20, 38), (27, 3), 12.5, period=3.6, bend=-0.1)
    upper_leaf(s, (21, 46), (-3, 42), 16.0)
    upper_leaf(s, (27, 46), (52, 42), 15.0)
    return finish(s, open_bottom=True)


# the praying pair standing up in the middle (one leaf green with red
# veins, one showing its red underside), herringbone leaves open at the feet
ICON = [
    "......12........",
    ".....1222.......",
    ".....12222......",
    "....3121222.....",
    "....1211222.....",
    "....3121222.....",
    "....1211222.....",
    "....1121221.....",
    ".11..1121...11..",
    "1312..121..1221.",
    "12121.1.1.12121.",
    ".12121.1.12121..",
    "..111..111.111..",
    "....11111111....",
]


def icon():
    return icon_arr([r[:16].ljust(16, ".") for r in ICON] + ["." * 16])


def render():
    fs = [front(f) for f in range(len(FOLD))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


def layout_items():
    return [(SID, render(), PAL)]


def build():
    from kit import intro_strip, write_species
    import mimosa
    art = render()
    mimosa.review_layout(mimosa.render(), extra=[(SID, art, PAL)])
    fs, b, icons = art
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                  notes="Crystal rule. Maranta leuconeura (after var. erythroneura). BRACED: a low, wide "
                  "clump of broad oval leaves; two lie open on the ground as feet, two are half raised as "
                  "arms, and two stand upright in the middle, folded and pressed together like praying "
                  "hands, tilted at the foe. Open leaves show deep green blades with red-pink herringbone "
                  "veins and elongated dark green blotches along the midrib; raised leaves show red-pink "
                  "undersides. Gesture: night falls and the arm leaves rise and fold up beside the "
                  "praying pair (the lead foot leaf lifts halfway) until the clump stands in prayer, "
                  "hold, then open again; the praying pair and the stalks stay fixed. Sport: "
                  "var. kerchoveana, the green form with dark blotches and light green undersides.",
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Maranta leuconeura, "
                  "https://en.wikipedia.org/wiki/Maranta_leuconeura . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)


if __name__ == "__main__":
    build()
