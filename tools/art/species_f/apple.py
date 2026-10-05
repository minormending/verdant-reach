"""Apple line: apple_pip -> apple_sapling -> apple_tree (wood/bloom).

Malus domestica, the orchard apple of Route 4: glossy chestnut pips in a
papery core; a whip of a young tree with reddish-brown twigs; five-petalled
blossom, white flushed pink, in clusters of five to six with a "king" bloom
in the middle; oval, finely serrated leaves; and an old tree's short,
twisted, gnarled trunk under a wide, low, spreading crown that sags with
fruit in autumn.

Motif: the wine-red apple skin (the dark slot, the line's accent) and the
blossom. The pip is that skin's colour as a seed; the sapling carries its
first apple like a fist; the tree is laden.

apple_pip      BOBBING  a glossy pip tipped 30 deg at the foe, pointed end
                        first, hopping on a forked pale radicle; its sprout
                        flicks back over its shoulder like a plume.
apple_sapling  LUNGING  a whip trunk in a C, a blossom cluster as the head
                        thrust at the foe, the lead twig holding its first
                        apple out like a fist, the rear twig swept back.
apple_tree     LOOMING  a twisted trunk in an S, a wide low crown hunched
                        over the foe, the lead bough sagging with apples,
                        blossom on top, an apple dropping (the motion cue).

Scores (CREATURES.md section 9; audit via tools/art/species_f/audit.py):
  apple_pip     8  (1: a plain seed silhouette at 1x, close to a "nut"; 9: the
                    glint is the lime light, a double-duty colour like the chili's)
  apple_sapling 8  (1: busy twigs at 1x; 7: bark is flat wine with no lit plane)
  apple_tree    8  (fill 61.8%; 1: the crown dome sits near great_oak's, told
                    apart by the hanging fruit and blossom; the back is the weakest)
Crown blossoms are single cream rosettes, never in level pairs and never with
a dark centre: both read as eyes at 1x (no faces, decision Q3).
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, at, dilate, erode, move, qbez, spline

PIP = ("#682028", "#b85830", "#d8e890")       # wine (skin accent) / glossy chestnut / sprout lime
# Sport: Malus 'Royalty', the purple-leaved crabapple (bronze-purple leaves,
# crimson-pink blossom, near-black fruit), carried through the whole line.
PIP_SPORT = ("#402040", "#985070", "#f0c0c8")
SAP_SPORT = ("#502048", "#905068", "#f8b8c8")
TREE_SPORT = ("#502048", "#905068", "#f8b8c8")
ROYALTY = "Malus 'Royalty' (purple-leaved crabapple: bronze-purple leaves, crimson-pink blossom, dark fruit)"

SAP = ("#702830", "#70b040", "#f8f0d0")       # wine (twig, first apple) / leaf green / blossom cream
TREE = ("#882838", "#68a840", "#f8f0c8")      # crimson-wine (apples, gnarled bark) / leaf green / blossom cream


# --------------------------------------------------------------------------- parts

def aleaf(s, base, tip, w, bend=0.0, line=0, glint=False):
    """An apple leaf: oval, finely serrated, pointed; green with a dark band
    on its shadow side and a dark midrib broken toward the light."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.45, power=0.7, teeth=4 if w > 6 else 0, tooth=0.12)
    pid = s.part(m, base=2, k=1 if w < 7 else 2, line=line)
    if math.dist(base, tip) > 9:
        rib = s.line1(path[8:-14]) & erode(m, 1)
        s.decal(rib, 1, on=pid)
    return pid


def fruit(s, x, y, r, stalk=True, glint=True):
    """An apple: round, a little wider at the shoulders, a dimple at the stalk;
    the wine skin with one cream glint on the lit shoulder."""
    m = s.ellipse(x, y + r * 0.08, r, r * 0.92) | s.circle(x - r * 0.42, y - r * 0.32, r * 0.62) \
        | s.circle(x + r * 0.42, y - r * 0.32, r * 0.62)
    m &= ~s.ellipse(x, y - r * 0.98, r * 0.22, r * 0.2)
    pid = s.part(m, base=1, k=0, line=0)
    if glint:
        gx, gy = round(x - r * 0.45), round(y - r * 0.3)
        s.px([(gx, gy), (gx, gy + 1)] + ([(gx + 1, gy - 1)] if r > 3.5 else []), 3)
    if stalk:
        s.ink(s.line1([(x, y - r * 0.7), (x + 0.6, y - r * 1.25), (x + 1.4, y - r * 1.6)]), 0)
    return pid


def bloom(s, cx, cy, R, tilt=0.4, sq=0.7, rotp=0.3, back=False):
    """Apple blossom in 3/4: five round petals, each its own cup (cream,
    blushed wine on its shadow rim, black-lined where it overlaps the one
    behind), round a wine eye with cream anthers. sq squashes the flower
    across its facing axis; tilt (+) turns its face toward the foe."""
    ct, st = math.cos(tilt), math.sin(tilt)
    pet = []
    for i in range(5):
        a = rotp + 2 * math.pi * i / 5
        u, v = math.cos(a) * R * 0.52 * sq, math.sin(a) * R * 0.52
        x, y = cx + u * ct - v * st, cy + u * st + v * ct
        pet.append((y, x, a))
    pet.sort()
    for y, x, a in pet:
        m = s.ellipse(x, y, R * 0.5 * (0.75 + 0.25 * sq), R * 0.5, ang=a)
        s.part(m, base=3, k=1, sh=1, line=0)
    if back:
        return
    eye = s.circle(cx + 0.3, cy + 0.3, max(1.6, R * 0.24))
    s.part(eye, base=1, k=0, line=None)
    ex, ey = round(cx), round(cy)
    s.px([(ex - 1, ey - 1), (ex + 1, ey), (ex, ey + 1)], 3)


def blossom(s, x, y):
    """A small blossom cluster for the crown: cream florets with wine eyes,
    painted onto the leaves (no outline: at 1x it reads as blossom, not stars)."""
    s.rows(x - 2, y - 2, [".3...", "313.3", ".3313", "..33."])


def floret(s, x, y):
    """A crown blossom, hand-pixelled: one cream five-lobed rosette, notched
    in black at the rim only. No dark dot inside and never placed in level
    pairs: pale discs in pairs read as eyes, and faces are banned."""
    s.rows(x - 2, y - 2, [".k3k.", "k3333", "3333k", "k333k", ".kk3."])


def bud(s, x, y, r=2.2):
    m = s.circle(x, y, r)
    s.part(m, base=1, k=0, line=0)
    s.px([(round(x - r * 0.4), round(y - r * 0.4))], 3)



def front_pip(ph=0):
    s = Sprite(56, 56, PIP)
    b = [0, 1][ph]
    # feet: the radicle forked into two pale roots, front foot ahead
    s.part(s.curve([(29, 47), (25, 51.5), (18, 54.6)], (3.6, 2.2)), base=3, k=1, sh=2, line=0)
    s.part(s.curve([(34, 48), (38, 52), (43, 54.6)], (3.2, 2.0)), base=3, k=1, sh=2, line=0)
    # sprout: rises from the pip's back and flicks over its shoulder like a plume
    stem = s.curve([(37, 32), (42, 28), (45 + b * 0.5, 23 - b)], (3.0, 2.2))
    s.part(stem, base=3, k=1, sh=2, line=0)
    tx, ty = 45 + b * 0.5, 23 - b
    s.part(s.leaf((tx, ty), (54, 18 - b * 0.5), 8.5, bend=0.14, fat=0.5, power=0.6)[0], base=3, k=2, sh=2, line=0)
    s.part(s.leaf((tx, ty), (45 - b, 12 - b), 8.0, bend=-0.14, fat=0.5, power=0.6)[0], base=3, k=2, sh=2, line=0)
    # pip body: a fat teardrop leaning at the foe, its tip hooked forward
    body = s.blob([(12.5, 16.5), (18, 18.5), (26.5, 23.5), (35, 30.5), (40.5, 38), (40, 45.5), (34, 50),
                   (26, 50.5), (19.5, 46.5), (15.2, 40), (13.2, 32), (12.6, 24), (11.6, 19.5)])
    pid = s.part(body, base=2, k=4, sh=1, line=0)
    # the raphe: a wine ridge down the pip's back, gapped where it turns to the light
    seam = s.line1(spline([(17, 20.5), (25, 25.5), (32, 31.5), (36, 38), (37, 44)], 12))
    s.decal(seam & ~s.rect(20, 20, 26, 26), 1, on=pid)
    # glint of life: a short dash on the lit shoulder
    s.px([(19, 26), (20, 26), (19, 27), (18, 28), (18, 29)], 3)
    # the lit plane: one gloss stripe following the foe-side curve
    s.decal(s.line1(spline([(15.5, 31.5), (16, 36), (18, 41), (21, 44.5)], 12)), 3, on=pid)
    return s


def back_pip():
    """From behind and above: the pip's broad back with its raphe ridge,
    pointing top-right at the foe; the sprout rises on the near side, its
    two seed leaves big and close."""
    s = Sprite(48, 48, PIP)
    s.open_bottom = True
    body, _ = s.leaf((20, 62), (43, 3), 37, bend=-0.04, fat=0.36, power=0.62)
    pid = s.part(body, base=2, k=5, sh=1, line=0)
    seam = s.line1(spline([(42, 6), (40, 18), (35, 32), (31, 48)], 12))
    s.decal(seam & ~s.rect(36, 16, 44, 26), 1, on=pid)
    s.px([(28, 17), (27, 18), (28, 18), (27, 19), (26, 20)], 3)
    st = s.curve([(15, 49), (14, 40), (12, 32)], (4.6, 3.6))
    s.part(st, base=3, k=2, sh=2, line=0)
    s.part(s.leaf((12, 32), (1, 22), 12.5, bend=0.12, fat=0.5, power=0.6)[0], base=3, k=3, sh=2, line=0)
    s.part(s.leaf((12, 32), (16.5, 15), 11, bend=-0.12, fat=0.5, power=0.6)[0], base=3, k=3, sh=2, line=0)
    return s



# --------------------------------------------------------------------------- sapling

def front_sapling(ph=0):
    s = Sprite(56, 56, SAP)
    b = [0, 1, 2][ph]
    # rear twig: swept back and up, small leaves (the far arm)
    s.part(s.curve([(36, 36), (42, 29), (47, 22 - b * 0.5)], (2.2, 1.5)), base=1, k=0, line=0)
    aleaf(s, (47, 22 - b * 0.5), (54, 13 - b), 6.5, bend=0.1)
    aleaf(s, (43, 28), (52, 29 - b * 0.5), 5.5, bend=-0.1)
    # feet
    s.part(s.curve([(33, 51), (27, 53.5), (20, 55)], (3.4, 2.0)), base=1, k=0, line=0)
    s.part(s.curve([(36, 51), (41, 53.5), (46, 55)], (3.0, 1.8)), base=1, k=0, line=0)
    # the whip trunk: a C leaning at the foe
    s.lean(35, 55, 0)
    trunk = s.curve([(35, 55), (38, 45), (35, 34), (28, 25), (23 - b * 0.4, 20 + b * 0.3)], (4.6, 2.6))
    s.part(trunk, base=1, k=0, line=0)
    # collar of leaves under the head (an apple spur's rosette)
    hx, hy = 21 - b * 0.6, 17 + b * 0.4
    aleaf(s, (hx + 3, hy + 2), (hx + 17, hy - 7 - b * 0.4), 8.5, bend=0.12)
    aleaf(s, (hx + 4, hy + 4), (hx + 12, hy + 13), 6.5, bend=-0.1)
    # lead twig: thrust forward, holding its first apple out like a fist
    s.part(s.curve([(36, 40), (28, 38), (19, 39), (12 - b * 0.4, 41)], (2.4, 1.6)), base=1, k=0, line=0)
    aleaf(s, (27, 38.5), (14, 31), 8.0, bend=0.12)
    fruit(s, 11 - b * 0.4, 46.5, 5.2)
    # the head: a king bloom tilted at the foe, two pink buds beside it
    bud(s, hx + 8, hy - 6.5, 2.4)
    bud(s, hx - 5, hy - 4, 2.0)
    bloom(s, hx, hy, 10.0, tilt=0.42, sq=0.72)
    # a petal drifting off behind (motion cue)
    py = 8 + b
    s.rows(44, py, [".kk.", "k33k", ".kk."])
    return s


def back_sapling():
    """From behind: the blossom cluster's green calyces and petal backs,
    leaning top-right at the foe; the twigs spread; the trunk runs off the bottom."""
    s = Sprite(48, 48, SAP)
    s.open_bottom = True
    s.part(s.curve([(20, 48), (21, 38), (26, 28)], (6.5, 4.6)), base=1, k=0, line=0)
    s.part(s.curve([(21, 40), (12, 36), (3, 37)], (3.4, 2.4)), base=1, k=0, line=0)
    aleaf(s, (10, 36.5), (1, 27), 8, bend=0.1)
    aleaf(s, (21, 37), (8, 46), 7.5, bend=-0.1)
    aleaf(s, (27, 31), (45, 33), 9, bend=0.12)
    aleaf(s, (27, 27), (12, 14), 9, bend=-0.12)
    aleaf(s, (29, 25), (47, 13), 8.5, bend=0.1)
    fruit(s, 5, 42.5, 4.6)
    bud(s, 18, 9, 2.6)
    bud(s, 41, 22, 2.4)
    # the king bloom from behind: cream petal backs round a green calyx star
    bloom(s, 30, 14, 12.5, tilt=-0.35, sq=0.85, rotp=0.6)
    star = s.empty()
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.5
        star |= s.stroke([(30, 15), (30 + math.cos(a) * 7.5, 15 + math.sin(a) * 7)], (3.4, 1.2), cap=False)
    s.part(star | s.circle(30, 15, 3.0), base=2, k=1, line=1)
    return s


ICON_SAP = [
    "...kkk..........",
    "..k333k.k.......",
    ".k31133kk2k.....",
    ".k31133k22k.....",
    "..k133k222k.....",
    "...kkk1k2k......",
    "..k22kk1kk.k....",
    "..k222k1k.k2k...",
    "...kkk.k1k22k...",
    "..kk...k1kkk....",
    ".k31k.k1k.......",
    "k1131kk1k.......",
    "k11111k1k.......",
    ".k111k.k1k......",
    "..kkk.k1k1k.....",
    "......kk.kk.....",
]


# --------------------------------------------------------------------------- tree

def clump(s, cx, cy, rx, ry, bumps=7, br=2.3, seed=0):
    """A leafy clump: an ellipse with small leaf bumps round its upper rim."""
    m = s.ellipse(cx, cy, rx, ry)
    for k in range(bumps):
        a = math.pi + math.pi * (k + 0.5) / bumps + (0.12 if (k + seed) % 2 else -0.08)
        m |= s.circle(cx + math.cos(a) * (rx - br * 0.4), cy + math.sin(a) * (ry - br * 0.4), br)
    return m


def front_tree(ph=0):
    s = Sprite(56, 56, TREE)
    sw = [0, 0.8, 1.6][ph]
    # far boughs inside the crown (seen through gaps)
    # the gnarled trunk: an S twist on two root feet
    trunk = (s.curve([(38, 56), (39.5, 49), (35, 43), (37, 36), (33, 28)], (7.2, 4.6))
             | s.curve([(36, 52), (30, 54), (21, 55.5)], (4.4, 1.8))
             | s.curve([(40, 52), (45, 54), (51, 55.5)], (4.0, 1.8))
             | s.circle(41, 46, 2.0) | s.circle(33.5, 40, 1.8))           # burls
    tid = s.part(trunk, base=1, k=0, line=0)
    s.part(s.curve([(36, 33), (44, 29), (51, 27)], (4.5, 3.0)), base=1, k=0, line=0)
    aleaf(s, (50, 27), (55, 21), 5.5, bend=0.1)
    # the crown: wide and low, hunched over the foe
    cl = [(36, 10, 9.5, 5.5), (21, 8, 11, 6), (8.5, 18, 7.5, 6), (42, 19, 5.5, 5),
          (25, 19.5, 11.5, 7.0), (10.5, 28.5, 7.0, 4.6), (30, 28.5, 8.0, 4.0)]
    for i, (cx, cy, rx, ry) in enumerate(cl):
        dx = -sw * (1 - cy / 36) - 1
        s.part(clump(s, cx + dx, cy, rx * 0.86, ry * 0.84, bumps=int(rx * 0.8), seed=i),
               base=2, k=3, sh=1, rim=1, line=1 if i >= 4 else None)
    # the lead bough: low and long, sagging toward the foe under its fruit
    s.part(s.curve([(34, 40), (26, 36), (16, 37), (9 - sw * 0.3, 41)], (5.4, 3.0)), base=1, k=0, line=0)
    aleaf(s, (17, 37), (11, 33 - sw * 0.3), 5.0, bend=0.1)
    # fruit: hanging under the crown's rim and from the bough
    for x, y, r in [(8.5 - sw * 0.3, 45.5, 3.6), (14, 42.5, 3.2), (21, 33.5, 3.0), (37, 32.5, 3.0),
                    (46, 26, 2.8), (30, 24, 3.0)]:
        fruit(s, x - sw * (1 - y / 36) * (y < 36), y, r)
    # blossom on the lit top of the crown
    for x, y in [(27, 13), (46, 9)]:
        blossom(s, round(x - sw * 0.6), y)
    for x, y in [(14, 6), (30, 5), (8, 18), (40, 11), (24, 15)]:
        floret(s, round(x - sw * 0.6 * (y < 10)), y)
    # a ripe apple dropping off behind (the motion cue)
    fruit(s, 50.5, 41 + ph, 2.8, stalk=False)
    # bark: grooves twisting with the trunk, a knot
    for pts in ([(37, 55), (38.5, 50), (36, 45), (35, 42)], [(41, 54), (42, 49), (40, 45)],
                [(36, 41), (37.5, 37), (35.5, 32)], [(32.5, 44), (34, 47)]):
        s.ink(s.line1(spline(pts, 10)), 0)
    return s


def back_tree():
    """From behind and above: the crown's top, blossom on the lit side, the
    trunk and boughs below, the lead bough reaching top-right at the foe."""
    s = Sprite(48, 48, TREE)
    s.open_bottom = True
    s.part(s.curve([(20, 48), (21, 40), (24, 32)], (11, 8.5)) | s.curve([(22, 40), (33, 37), (44, 38)], (5.4, 3.2)),
           base=1, k=0, line=0)
    cl = [(16, 7, 11, 6.5), (31, 6, 10, 6), (43, 13, 5, 6), (6, 16, 6, 6.5), (24, 17, 13, 7.5),
          (40, 22, 8, 6.5), (9, 27, 8, 6), (25, 28, 11, 6)]
    for i, (cx, cy, rx, ry) in enumerate(cl):
        s.part(clump(s, cx, cy, rx, ry, bumps=int(rx * 0.75), seed=i), base=2, k=2, sh=1, rim=1, line=1)
    for x, y, r in [(42, 42, 3.4), (37, 40.5, 3.0), (14, 33, 3.0), (34, 31, 3.0), (44, 28, 2.8), (6, 22, 2.8)]:
        fruit(s, x, y, r)
    for x, y in [(35, 7), (19, 13), (30, 15)]:
        blossom(s, x, y)
    for x, y in [(12, 6), (26, 3), (6, 15)]:
        floret(s, x, y)
    return s


ICON_TREE = [
    "....kkkkkkkk....",
    "..kk33222223kk..",
    ".k3322332222k2k.",
    "k2322222223222k.",
    "k22231222222212k",
    "k222222k1122222k",
    "k1222211222k11k.",
    ".k1kk1k221k111k.",
    "k11k.kk1111kkk..",
    "k11k..k111k.....",
    ".kk...k111k.....",
    "......k111k..kk.",
    "......k1111kk1k.",
    ".....k11k11k.k..",
    "....k111kk11k...",
    "...kkkk...kkkk..",
]

ICON_PIP = [
    "..........kk.kk.",
    ".........k33k33k",
    ".kk......k333k3k",
    "k22k.....kk33kk.",
    "k232k.....k3k...",
    ".k2222k..k3k....",
    ".k232222kk3k....",
    ".k2322222kk.....",
    "..k22222221k....",
    "..k22222211k....",
    "...k2222111k....",
    "....k21111k.....",
    ".....kkkkk......",
    "....k1k.k1k.....",
    "...k1k...k1k....",
    "...kk.....kk....",
]


def _up(rows):
    return rows[1:] + ["                "]


SPRITES = {
    "apple_tree": dict(pal=TREE, sport=TREE_SPORT, sport_name=ROYALTY, front=front_tree, frames=3, back=back_tree,
                       icon=ICON_TREE, icon2=_up(ICON_TREE),
                       notes="LOOMING: S-twisted gnarled trunk, wide low crown hunched over the foe, the lead bough sagging with apples, blossom on top, an apple dropping. Accent: the wine apple skin (dark slot).", ref="Malus domestica (orchard apple)"),
    "apple_sapling": dict(pal=SAP, sport=SAP_SPORT, sport_name=ROYALTY, front=front_sapling, frames=3, back=back_sapling,
                          icon=ICON_SAP, icon2=_up(ICON_SAP),
                          notes="LUNGING: a whip trunk in a C, a king blossom for a head, its first apple held out on the lead twig like a fist. Accent: the wine apple skin (dark slot).", ref="Malus domestica (orchard apple)"),
    "apple_pip": dict(pal=PIP, sport=PIP_SPORT, sport_name=ROYALTY, front=front_pip, frames=2, back=back_pip,
                      icon=ICON_PIP, icon2=_up(ICON_PIP),
                      notes="BOBBING: a glossy pip tipped at the foe on a forked radicle, its sprout flicked back like a plume. Accent: the wine of the apple skin (dark slot).", ref="Malus domestica (orchard apple)"),
}
