"""Crystal rule, apple line: apple_pip -> apple_sapling -> apple_tree.

A redraw of tools/art/species_f/apple.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). Malus domestica: glossy dark pips,
a whip of a young tree, five-petalled white blossom flushed pink, oval
serrated leaves, and an old tree's twisted trunk under a low crown that
sags with fruit.

  index 0  #181818  outline, crevices, bark grooves                (shared)
  index 1  apple red-wine: the fruit, the pip, the bark AND the shadow side
           of every green form. The second hue lives in the dark slot (the
           pilot flytrap's lesson): one red is the apple skin, the twig and
           the leaf shade, which ties the line together.
  index 2  leaf green: leaves, sprout, crown
  index 3  #f8f8f8  the white blossom (a genuinely white part), glints on
           the fruit and the pip, rims on lit leaf edges             (shared)

Poses (kept from the classic art):
  apple_pip      BOBBING  a glossy pip tipped at the foe on a forked radicle,
                          its sprout flicked back like a plume.
  apple_sapling  LUNGING  a whip trunk in a C, a king blossom for a head, its
                          first apple held out on the lead twig like a fist.
  apple_tree     LOOMING  an S-twisted trunk, a wide low crown hunched over the
                          foe, the lead bough sagging with apples, blossom on top.

Entrance animations (only the signature part moves):
  apple_pip      the sprout's two seed leaves clap shut, then flick open wide
                 and wave back to rest.
  apple_sapling  the king blossom is a shut pink bud; it swells, POPS open
                 wider than rest, and settles.
  apple_tree     an apple hangs at the crown's edge, lets go, falls and
                 bounces once at the roots, where it rests (frame 0).

Sport: Malus 'Royalty', the purple-leaved crabapple (bronze-purple leaves,
near-black fruit), carried through the whole line.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/apple.py <out.png>     # preview sheet only
  $PY tools/art/crystal/build.py apple         # write the base bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species  # noqa: E402
import _arte_draw as D  # noqa: E402

TOOL = "tools/art/crystal/apple.py"
IDS = ["apple_pip", "apple_sapling", "apple_tree"]

PALS = {
    "apple_pip": ("#782028", "#90c848"),       # pip wine / sprout green
    "apple_sapling": ("#a02830", "#78b840"),   # apple red / leaf green
    "apple_tree": ("#982838", "#68b040"),      # crimson / leaf green
}
SPORTS = {   # Malus 'Royalty'
    "apple_pip": ("#402040", "#a86888"),
    "apple_sapling": ("#502048", "#a06890"),
    "apple_tree": ("#502048", "#9c6088"),
}


def palette(id_):
    d, l = PALS[id_]
    return [BLACK, d, l, WHITE]


def sport(id_):
    d, l = SPORTS[id_]
    return [BLACK, d, l, WHITE]


# ---------------------------------------------------------------- parts ----

def aleaf(s, base, tip, w, bend=0.0, line=0, rimf=0.45, mv=False):
    """An apple leaf: oval, finely serrated; green, red shadow band, a red
    midrib broken toward the light, a white rim on the lit edge."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.45, power=0.7, teeth=4 if w > 6 else 0, tooth=0.12)
    put = s.mpart if mv else s.part
    pid = put(m, base=2, k=1 if w < 7 else 2, sh=1, line=line)
    if rimf:
        s.rim(m, pid, rimf)
    if math.dist(base, tip) > 9:
        rib = s.line1(path[10:-16]) & D.erode(m, 1)
        s.decal(rib, 1, on=pid)
    return pid


def fruit(s, x, y, r, stalk=True, mv=False):
    """An apple: wider at the shoulders, a dimple at the stalk; red with a
    black shadow band and a white glint on the lit shoulder."""
    m = s.ellipse(x, y + r * 0.08, r, r * 0.92) | s.circle(x - r * 0.42, y - r * 0.32, r * 0.62) \
        | s.circle(x + r * 0.42, y - r * 0.32, r * 0.62)
    m &= ~s.ellipse(x, y - r * 0.98, r * 0.22, r * 0.2)
    put = s.mpart if mv else s.part
    pid = put(m, base=1, k=1 if r < 4 else 2, sh=0, line=0)
    gx, gy = round(x - r * 0.45), round(y - r * 0.3)
    s.px([(gx, gy), (gx, gy + 1)] + ([(gx + 1, gy - 1)] if r > 3.5 else []), 3)
    if stalk:
        st = s.line1([(x, y - r * 0.7), (x + 0.6, y - r * 1.25), (x + 1.4, y - r * 1.6)])
        s.ink(st, 0)
        if mv:
            s.mark(st)
    if mv:
        s.mark(D.dilate(m, 1))
    return pid


def bloom(s, cx, cy, R, tilt=0.4, sq=0.7, rotp=0.3, open_=1.0, mv=True, pk=1):
    """Apple blossom in 3/4: five round white petals, each a cup flushed red
    on its shadow rim, black-lined where it overlaps; a green eye with white
    anthers. open_ < 1 closes it toward a pink bud."""
    put = s.mpart if mv else s.part
    if open_ <= 0.05:
        # the shut bud: a red-flushed white teardrop with a green calyx
        cal = s.ellipse(cx + R * 0.28, cy + R * 0.34, R * 0.34, R * 0.22, ang=0.6)
        m, _ = s.leaf((cx + R * 0.3, cy + R * 0.3), (cx - R * 0.45, cy - R * 0.55), R * 0.8, fat=0.45, power=0.7)
        pid = put(m, base=3, k=3, sh=1, line=0)
        s.decal(s.line1([(cx + R * 0.2, cy + R * 0.2), (cx - R * 0.3, cy - R * 0.35)]) & D.erode(m, 1), 1, on=pid)
        put(cal, base=2, k=1, sh=1, line=0)
        return
    ct, st = math.cos(tilt), math.sin(tilt)
    pet = []
    rr = R * (0.30 + 0.22 * open_)
    for i in range(5):
        a = rotp + 2 * math.pi * i / 5
        u, v = math.cos(a) * rr * sq, math.sin(a) * rr
        x, y = cx + u * ct - v * st, cy + u * st + v * ct
        pet.append((y, x, a))
    pet.sort()
    pr = R * (0.36 + 0.14 * min(open_, 1.1))
    for y, x, a in pet:
        m = s.ellipse(x, y, pr * (0.75 + 0.25 * sq), pr, ang=a)
        put(m, base=3, k=pk, sh=1, line=0)
    eye = s.circle(cx + 0.3, cy + 0.3, max(1.6, R * 0.22))
    put(eye, base=2, k=1, sh=1, line=None)
    ex, ey = round(cx), round(cy)
    s.px([(ex - 1, ey - 1), (ex + 1, ey)], 3)


def bud(s, x, y, r=2.2, mv=False):
    m = s.circle(x, y, r)
    pid = (s.mpart if mv else s.part)(m, base=1, k=1, sh=0, line=0)
    s.px([(round(x - r * 0.4), round(y - r * 0.4))], 3)


def floret(s, x, y):
    """A crown blossom: one white five-lobed rosette notched in black at the
    rim. No dark dot inside and never in level pairs (no faces)."""
    s.rows(x - 2, y - 2, [".k3k.", "k3333", "3333k", "k333k", ".kk3."])


# ----------------------------------------------------------------- pip -----

# (spread of the two seed leaves, length) per frame
PIP_LEAVES = [(1.0, 1.0), (0.0, 0.85), (1.55, 1.08), (0.7, 1.0)]


def front_pip(k=0):
    s = D.S(56, 56)
    sp, ln = PIP_LEAVES[k]
    # feet: the radicle forked into two white roots, front foot ahead
    for pts, w in (([(29, 47), (25, 51.5), (18, 54.6)], (3.6, 2.2)), ([(34, 48), (38, 52), (43, 54.6)], (3.2, 2.0))):
        m = s.curve(pts, w)
        s.part(m, base=3, k=1, sh=1, line=0)
    # sprout: rises from the pip's back and flicks over its shoulder like a plume
    stem = s.curve([(37, 32), (42, 28), (45, 23)], (3.0, 2.2))
    pid = s.part(stem, base=2, k=1, sh=1, line=0)
    tx, ty = 45, 23
    base_a = (math.radians(-28), math.radians(-88))     # rear leaf, front leaf (from +x, screen y up = -)
    mid = (base_a[0] + base_a[1]) / 2
    for j, (L, w) in enumerate(((10.5, 8.5), (11.5, 8.0))):
        a = mid + (base_a[j] - mid) * sp
        tip = (tx + math.cos(a) * L * ln, ty + math.sin(a) * L * ln)
        m, path = s.leaf((tx, ty), tip, w, bend=0.14 if j == 0 else -0.14, fat=0.5, power=0.6)
        lp = s.mpart(m, base=2, k=2, sh=1, line=0)
        s.rim(m, lp, 0.5)
    # pip body: a fat glossy teardrop leaning at the foe, tip hooked forward
    body = s.blob([(12.5, 16.5), (18, 18.5), (26.5, 23.5), (35, 30.5), (40.5, 38), (40, 45.5), (34, 50),
                   (26, 50.5), (19.5, 46.5), (15.2, 40), (13.2, 32), (12.6, 24), (11.6, 19.5)])
    pid = s.part(body, base=1, k=3, sh=0, line=0)
    s.rim(body, pid, 0.42)
    # the raphe: a black ridge down the pip's back, gapped where it turns to the light
    seam = s.line1(D.spline([(17, 20.5), (25, 25.5), (32, 31.5), (36, 38), (37, 44)], 12))
    s.decal(seam & ~s.rect(20, 20, 27, 27), 0, on=pid)
    # the gloss: a bold white sweep on the lit shoulder and a stripe down the foe side
    s.px([(18, 24), (19, 24), (19, 25), (20, 25), (18, 25), (17, 26), (18, 26), (17, 27), (17, 28)], 3)
    s.decal(s.line1(D.spline([(15.5, 32.5), (16, 36), (18, 41), (21, 44.5)], 12)), 3, on=pid)
    return s


def back_pip():
    """From behind and above: the pip's broad back with its raphe ridge,
    pointing top-right at the foe; the sprout rises on the near side."""
    s = D.back_canvas()
    body, _ = s.leaf((20, 62), (43, 3), 37, bend=-0.04, fat=0.36, power=0.62)
    pid = s.part(body, base=1, k=4, sh=0, line=0)
    s.rim(body, pid, 0.5)
    seam = s.line1(D.spline([(42, 6), (40, 18), (35, 32), (31, 48)], 12))
    s.decal(seam & ~s.rect(36, 14, 44, 26), 0, on=pid)
    s.px([(28, 16), (27, 17), (28, 17), (27, 18), (26, 19), (26, 20), (25, 21)], 3)
    st = s.curve([(15, 49), (14, 40), (12, 32)], (4.6, 3.6))
    s.part(st, base=2, k=2, sh=1, line=0)
    for tip, bend in (((1, 22), 0.12), ((16.5, 15), -0.12)):
        m, _ = s.leaf((12, 32), tip, 12, bend=bend, fat=0.5, power=0.6)
        lp = s.part(m, base=2, k=3, sh=1, line=0)
        s.rim(m, lp, 0.5)
    return s


ICON_PIP = [
    "................",
    "..........kk.kk.",
    ".kk......k22k22k",
    "k31k.....k22k22k",
    "k131kk....kk2kk.",
    ".k1311kk..k2k...",
    ".k13111k.k2k....",
    ".k131111k2k.....",
    "..k1111111k.....",
    "..k1111111k.....",
    "...k111111k.....",
    "....k1111k......",
    ".....kkkk.......",
    "....k3k.k3k.....",
    "...k3k...k3k....",
    "...kk.....kk....",
]


# --------------------------------------------------------------- sapling ---

SAP_OPEN = [1.0, 0.0, 0.5, 1.2]


def front_sapling(k=0):
    s = D.S(56, 56)
    op = SAP_OPEN[k]
    # rear twig: swept back and up, small leaves (the far arm)
    s.part(s.curve([(36, 36), (42, 29), (47, 22)], (2.4, 1.6)), base=1, k=0, line=0)
    aleaf(s, (47, 22), (54, 13), 6.5, bend=0.1)
    aleaf(s, (43, 28), (52, 29), 5.5, bend=-0.1)
    # feet
    s.part(s.curve([(33, 51), (27, 53.5), (20, 55)], (3.4, 2.0)), base=1, k=1, sh=0, line=0)
    s.part(s.curve([(36, 51), (41, 53.5), (46, 55)], (3.0, 1.8)), base=1, k=1, sh=0, line=0)
    # the whip trunk: a C leaning at the foe
    trunk = s.curve([(35, 55), (38, 45), (35, 34), (28, 25), (23, 20)], (4.6, 2.6))
    tp = s.part(trunk, base=1, k=1, sh=0, line=0)
    s.rim(trunk, tp, 0.5, sides="l")
    # collar of leaves under the head (an apple spur's rosette)
    hx, hy = 21, 17
    aleaf(s, (hx + 3, hy + 2), (hx + 17, hy - 7), 8.5, bend=0.12)
    aleaf(s, (hx + 4, hy + 4), (hx + 12, hy + 13), 6.5, bend=-0.1)
    # lead twig: thrust forward, holding its first apple out like a fist
    s.part(s.curve([(36, 40), (28, 38), (19, 39), (12, 41)], (2.6, 1.8)), base=1, k=1, sh=0, line=0)
    aleaf(s, (27, 38.5), (14, 31), 8.0, bend=0.12, rimf=0.55)
    fruit(s, 11, 46.5, 5.4)
    # the head: a king bloom tilted at the foe, two red buds beside it
    bud(s, hx + 8, hy - 6.5, 2.4)
    bud(s, hx - 5, hy - 4, 2.0)
    bloom(s, hx, hy, 10.0, tilt=0.42, sq=0.72, open_=op)
    # a petal drifting off behind (motion cue)
    s.rows(44, 7, [".kk.", "k33k", ".kk."])
    return s


def back_sapling():
    """From behind: the king bloom's white petal backs round a green calyx
    star, leaning top-right at the foe; the twigs spread."""
    s = D.back_canvas()
    s.part(s.curve([(20, 48), (21, 38), (26, 28)], (6.5, 4.6)), base=1, k=1, sh=0, line=0)
    s.part(s.curve([(21, 40), (12, 36), (3, 37)], (3.4, 2.4)), base=1, k=1, sh=0, line=0)
    aleaf(s, (10, 36.5), (1, 27), 8, bend=0.1, rimf=0.25)
    aleaf(s, (21, 37), (8, 46), 7.5, bend=-0.1, rimf=0.25)
    aleaf(s, (27, 31), (45, 33), 9, bend=0.12, rimf=0.25)
    aleaf(s, (27, 27), (12, 14), 9, bend=-0.12, rimf=0.25)
    aleaf(s, (29, 25), (47, 13), 8.5, bend=0.1, rimf=0.25)
    fruit(s, 5, 42.5, 4.6)
    bud(s, 18, 9, 2.6)
    bud(s, 41, 22, 2.4)
    bloom(s, 30, 14, 12.5, tilt=-0.35, sq=0.85, rotp=0.6, mv=False, pk=2)
    star = s.empty()
    for j in range(5):
        a = 2 * math.pi * j / 5 + 0.5
        star |= s.stroke([(30, 15), (30 + math.cos(a) * 7.5, 15 + math.sin(a) * 7)], (3.4, 1.2), cap=False)
    s.part(star | s.circle(30, 15, 3.0), base=2, k=1, sh=1, line=0)
    return s


ICON_SAP = [
    "................",
    "..kkkk.....kk...",
    ".k3333k...k22k..",
    "k333333k.k221k..",
    "k332233kk221k...",
    "k333113k1kkk....",
    ".k1133k11k......",
    "..kkkkk11k......",
    "......k11k......",
    "..kk..k11k......",
    ".k31kkk11k......",
    "k1311k11k.......",
    "k1111k11k.......",
    ".k11k.k11k......",
    "..kk.k1kk1k.....",
    ".....kk..kk.....",
]


# ------------------------------------------------------------------ tree ---

def clump(s, cx, cy, rx, ry, bumps=7, br=2.3, seed=0):
    """A leafy clump: an ellipse with small leaf bumps round its upper rim."""
    m = s.ellipse(cx, cy, rx, ry)
    for j in range(bumps):
        a = math.pi + math.pi * (j + 0.5) / bumps + (0.12 if (j + seed) % 2 else -0.08)
        m |= s.circle(cx + math.cos(a) * (rx - br * 0.4), cy + math.sin(a) * (ry - br * 0.4), br)
    return m


# where the dropping apple is per frame (x, y); frame 0 = resting at the roots
DROP = [(50.5, 51.6), (46.5, 31.5), (48.5, 37.0), (50.0, 45.0), (50.5, 48.6)]


def front_tree(k=0):
    s = D.S(56, 56)
    # the gnarled trunk: an S twist on two root feet
    trunk = (s.curve([(38, 56), (39.5, 49), (35, 43), (37, 36), (33, 28)], (7.2, 4.6))
             | s.curve([(36, 52), (30, 54), (21, 55.5)], (4.4, 1.8))
             | s.curve([(40, 52), (45, 54), (51, 55.5)], (4.0, 1.8))
             | s.circle(41, 46, 2.0) | s.circle(33.5, 40, 1.8))
    tid = s.part(trunk, base=1, k=2, sh=0, line=0)
    s.rim(trunk, tid, 0.45, sides="l")
    s.part(s.curve([(36, 33), (44, 29), (51, 27)], (4.5, 3.0)), base=1, k=1, sh=0, line=0)
    aleaf(s, (50, 27), (55, 21), 5.5, bend=0.1)
    # the crown: wide and low, hunched over the foe
    cl = [(36, 10, 9.5, 5.5), (21, 8, 11, 6), (8.5, 18, 7.5, 6), (42, 19, 5.5, 5),
          (25, 19.5, 11.5, 7.0), (10.5, 28.5, 7.0, 4.6), (30, 28.5, 8.0, 4.0)]
    for i, (cx, cy, rx, ry) in enumerate(cl):
        m = clump(s, cx - 1, cy, rx * 0.86, ry * 0.84, bumps=int(rx * 0.8), seed=i)
        pid = s.part(m, base=2, k=2, sh=1, line=0)
        s.rim(m, pid, 0.32, sides="t")
    # the lead bough: low and long, sagging toward the foe under its fruit
    s.part(s.curve([(34, 40), (26, 36), (16, 37), (9, 41)], (5.4, 3.0)), base=1, k=1, sh=0, line=0)
    aleaf(s, (17, 37), (11, 33), 5.0, bend=0.1)
    for x, y, r in [(8.5, 45.5, 3.8), (14, 42.5, 3.3), (21, 33.5, 3.1), (37, 32.5, 3.1), (30, 24, 3.1)]:
        fruit(s, x, y, r)
    for x, y in [(14, 6), (30, 5), (8, 18), (40, 11), (24, 15), (45, 17)]:
        floret(s, x, y)
    # the dropping apple (the gesture); frame 0 it rests at the roots
    x, y = DROP[k]
    fruit(s, x, y, 2.9, stalk=k in (1, 2), mv=True)
    if k == 1:
        st = s.line1([(x + 0.5, y - 2), (x + 1.5, y - 4.5)])
        s.ink(st, 0)
        s.mark(st)
    # bark: grooves twisting with the trunk, a knot
    for pts in ([(37, 55), (38.5, 50), (36, 45), (35, 42)], [(41, 54), (42, 49), (40, 45)],
                [(36, 41), (37.5, 37), (35.5, 32)], [(32.5, 44), (34, 47)]):
        s.ink(s.line1(D.spline(pts, 10)), 0)
    return s


def back_tree():
    """From behind and above: the crown's top with blossom, the trunk and
    boughs below, the lead bough reaching top-right at the foe."""
    s = D.back_canvas()
    s.part(s.curve([(20, 48), (21, 40), (24, 32)], (11, 8.5)) | s.curve([(22, 40), (33, 37), (44, 38)], (5.4, 3.2)),
           base=1, k=2, sh=0, line=0)
    cl = [(16, 7, 11, 6.5), (31, 6, 10, 6), (43, 13, 5, 6), (6, 16, 6, 6.5), (24, 17, 13, 7.5),
          (40, 22, 8, 6.5), (9, 27, 8, 6), (25, 28, 11, 6)]
    for i, (cx, cy, rx, ry) in enumerate(cl):
        m = clump(s, cx, cy, rx, ry, bumps=int(rx * 0.75), seed=i)
        pid = s.part(m, base=2, k=2, sh=1, line=0)
        s.rim(m, pid, 0.32, sides="t")
    for x, y, r in [(42, 42, 3.4), (37, 40.5, 3.0), (14, 33, 3.0), (34, 31, 3.0), (44, 28, 2.8), (6, 22, 2.8)]:
        fruit(s, x, y, r)
    for x, y in [(12, 6), (26, 3), (6, 15), (35, 8), (20, 13)]:
        floret(s, x, y)
    return s


ICON_TREE = [
    "...kkkkkkk......",
    ".kk3332222kkk...",
    "k33222222k222k..",
    "k32222222k2222k.",
    "k2222222212222k.",
    "k12222221122221k",
    ".k112211k11121k.",
    "k31kk1kk111kkk..",
    "k11k.k1111k.....",
    ".kk..k111k......",
    "......k11k......",
    "......k11k......",
    ".....k111k......",
    "....k11k11k..kk.",
    "...kk11kk11kk11k",
    "...kkkk..kkk.kk.",
]


# -------------------------------------------------------------- build ------

SPECS = {
    "apple_pip": dict(
        fn=front_pip, n=4, back=back_pip, icon=ICON_PIP, dx=0,
        anim={"intro": [[1, 14], [2, 5], [3, 10], [2, 6], [3, 4], [0, 3]], "idle": [[0, 150], [3, 8]]},
        notes="BOBBING: a glossy wine pip tipped at the foe on a forked white radicle, its sprout "
              "flicked back like a plume. Intro: the two seed leaves clap shut, flick open wide and "
              "wave back to rest. Crystal rule: the pip is the dark slot (the line's apple-skin "
              "accent) with a bold white gloss; the sprout is the green light slot, shaded wine. "
              "Sport: Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, dark fruit)."),
    "apple_sapling": dict(
        fn=front_sapling, n=4, back=back_sapling, icon=ICON_SAP, dx=0,
        anim={"intro": [[1, 14], [2, 5], [3, 12], [2, 4], [0, 3]], "idle": [[0, 150], [2, 6]]},
        notes="LUNGING: a whip trunk in a C, a king blossom for a head, its first apple held out on "
              "the lead twig like a fist. Intro: the king blossom is a shut bud; it swells, POPS open "
              "wider than rest and settles. Crystal rule: red is the dark slot (apple, twig and leaf "
              "shade), leaf green the light; the blossom is the shared white, flushed red. Sport: "
              "Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, dark fruit)."),
    "apple_tree": dict(
        fn=front_tree, n=5, back=back_tree, icon=ICON_TREE, dx=0,
        anim={"intro": [[1, 16], [2, 4], [3, 4], [0, 4], [4, 4], [0, 12]], "idle": [[0, 160], [4, 6]]},
        notes="LOOMING: an S-twisted gnarled trunk, a wide low crown hunched over the foe, the lead "
              "bough sagging with apples, white blossom on top. Intro: an apple hangs at the crown's "
              "edge, lets go, drops and bounces once at the roots, where it rests. Crystal rule: "
              "crimson is the dark slot (fruit, bark and crown shade), leaf green the light, the "
              "blossom the shared white. Sport: Malus 'Royalty' (purple-leaved crabapple)."),
}


def render(id_):
    sp = SPECS[id_]
    fr = D.frames(sp["fn"], sp["n"], dx=sp["dx"])
    back = D.tones(sp["back"](), open_bottom=True)
    i0 = D.icon(sp["icon"])
    return fr, back, [i0, D.hop(i0)]


def build():
    for id_ in IDS:
        fr, back, ics = render(id_)
        write_species(id_, palette=palette(id_), sport=sport(id_), front=fr, back=[back], icon=ics,
                      anim=SPECS[id_]["anim"], moving=D.moving_boxes(fr), notes=SPECS[id_]["notes"], tool=TOOL)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/arte_apple.png")
    items = []
    for id_ in IDS:
        fr, back, ics = render(id_)
        for i, f in enumerate(fr):
            st = D.stats(f)
            print(id_, i, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in st.items()})
        items.append((id_, palette(id_), sport(id_), fr, back, ics))
    print(D.preview(items, out))
