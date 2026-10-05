"""Snapdragon line: snapdragon_sprout -> snapdragon (dragon/bloom, the rare one).

Antirrhinum majus: a spike (raceme) of two-lipped flowers, buds at the tip,
open flowers below; each flower has a hooded two-lobed upper lip and a
three-lobed lower lip whose yellow "palate" bulge closes the throat. Squeeze
the sides and the jaws gape: that is the creature. Foliage follows the real
bronze-leaved cultivars ('Bronze Dragon'): deep purple-bronze lanceolate
leaves, which double as wings and claws.

Signature that grows: one gaping flower-head with two bud horns -> a rearing
S-necked spike with a big jawed head, a second head lower on the neck, a bud
crest and leaf wings flung wide.
Poses/scores: snapdragon_sprout 8 (LUNGING); snapdragon 8 (LUNGING, three
jaws + bud crest + pollen sparks; jaws carry no throat or eyes, so no face;
4: escalation could raise the second jaw higher on the raceme).
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, at, dilate, erode, mask_rows, move, qbez, spline

PAL = ("#783078", "#f04880", "#f8d048")   # bronze-purple foliage / magenta / gold palate


def T(pts, hx, hy, L, ang, face=-1, piv=None, jaw=0.0):
    """Local flower coords (x forward, y down, units of L) -> world.
    jaw rotates about the hinge pivot first (+ opens upward), then the whole
    head tilts by ang (+ = snout up)."""
    out = []
    px_, py_ = piv if piv else (0.0, 0.0)
    for x, y in pts:
        if jaw:
            dx, dy = x - px_, y - py_
            c, s = math.cos(-jaw), math.sin(-jaw)
            x, y = px_ + dx * c - dy * s, py_ + dx * s + dy * c
        c, s = math.cos(-ang), math.sin(-ang)
        x2, y2 = x * c - y * s, x * s + y * c
        out.append((hx + face * x2 * L, hy + y2 * L))
    return out


# Hand-drawn region maps for the flower-heads (facing left). H hood (the
# two-lobed upper lip), D throat, P palate (gold), J lower lip (three
# lobes), C calyx. The open front of the gape is left transparent so the
# jaws read as two prongs.
HEAD_L = [
    "..............HHHHH.......",
    "........HHH..HHHHHHHH.....",
    "......HHHHHFHHHHHHHHHH....",
    "....HHHHHHHFHHHHHHHHHHHH..",
    "...HHHHHHHHFHHHHHHHHHHHH..",
    "..HHHHHHHHFHHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHHHHHHHHHHHH.",
    "HHHHHHHHHHHHHHHHHHHHHHHHHC",
    "HHHHHHHHHHHHHHHHHHHHHHHCCC",
    ".HHH...........HHHHHHHCCCC",
    "..H..............HHHHHCCCC",
    ".............PPPPPHHHHCCC.",
    ".......PPPPPPPPPPPPHHHHC..",
    ".....PPPPPPPPPPPPPPJHHH...",
    "..JJPPPPPPPPPPPPPJJJJH....",
    ".JJJJJJJJJJJJJJJJJJJJ.....",
    ".JJJJJJJJJJJJJJJJJJJ......",
    "..JJJJJJJJJJJJJJJJJ.......",
    "..JJJ.JJJJJ.JJJJJ.........",
    "...J...JJJ...JJ...........",
]
HEAD_S = [
    "........HHHH.......",
    "......HHHHHHHH.....",
    "....HHHHHHHHHHHH...",
    "...HHHHHHHHHHHHHH..",
    "..HHHHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHHHHHC",
    "HHHHHHHHHHHHHHHHHCC",
    "HHH........HHHHHCCC",
    ".H........PPPHHHCC.",
    ".....PPPPPPPPPHHC..",
    "..JJPPPPPPPPPJJH...",
    ".JJJJJJJJJJJJJJ....",
    ".JJJJJJJJJJJJJ.....",
    "..JJJ.JJJJ.JJ......",
    "...J...JJ..........",
]


HEAD_M = [
    "...........HHHH.......",
    ".......HH.HHHHHHH.....",
    ".....HHHHFHHHHHHHHH...",
    "...HHHHHHFHHHHHHHHHH..",
    "..HHHHHHFHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHHHHHHHH.",
    "HHHHHHHHHHHHHHHHHHHHHC",
    "HHHHHHHHHHHHHHHHHHHCCC",
    ".HH..........HHHHHCCCC",
    "..H........PPPPHHHCCC.",
    "......PPPPPPPPPPHHHC..",
    "....PPPPPPPPPPPJHHH...",
    "..JJPPPPPPPPPJJJJH....",
    ".JJJJJJJJJJJJJJJJ.....",
    ".JJJJJJJJJJJJJJJ......",
    "..JJJ.JJJJ.JJJJ.......",
    "...J...JJ...JJ........",
]
# the head from behind (facing away, to the right): the hood's dome, the
# calyx where the stalk joins, the lower lip's lobes jutting at the far side
HEAD_B = [
    "...HHHHH....HHHHH.....",
    "..HHHHHHH..HHHHHHHH...",
    ".HHHHHHHHHFHHHHHHHHH..",
    "HHHHHHHHHHFHHHHHHHHHH.",
    "HHHHHHHHHHFHHHHHHHHHH.",
    "HHHHHHHHHHFHHHHHHHHHHH",
    "HHHHHHHHHHFHHHHHHHHHHH",
    "HHHHHHHHHHFHHHHHHHHHHH",
    "HHHHHHHHHHHHHHHHHHHHJJ",
    ".HHHHHHHHHHHHHHHHHHJJJ",
    ".HHHHHHHHHHHHHHHHHJJJJ",
    "..HHHHHHHHHHHHHHHJJJJ.",
    "..CCCHHHHHHHHHHJJJJJ..",
    ".CCCCCCHHHHHJJJJJJ....",
    "..CCCCCCC..JJJJJ......",
    "...C.CCC..............",
]
HEAD_T = [
    "....HHHH....",
    "..HHHHHHHH..",
    ".HHHHHHHHHHC",
    "HHHHHHHHHHCC",
    "HHPPPPHHHHC.",
    ".JPPPPPJHH..",
    "..JJJJJJJ...",
    ".JJJJJJJ....",
    "..J.JJ.J....",
]


def flower(s, x0, y0, rows=HEAD_L, face=-1, gape=0, hl=(6, 3, 3), back=False, fold=True):
    """Stamp a flower-head from a region map, top-left at (x0, y0).
    gape: extra px the front of the lower lip drops (idle). hl: (x, y, len)
    of the gold glint dash on the hood, in map coords. back=True draws the
    head from behind (no throat; the hood and lower lip seen from the rear)."""
    flip = face > 0
    W = len(rows[0])
    M = lambda ch: mask_rows(s.w, s.h, x0, y0, rows, ch, flip)
    X = np.arange(s.w)[None, :].repeat(s.h, 0)
    front = (X < x0 + W * 0.55) if not flip else (X >= x0 + W * 0.45)

    def drop(m):
        return (move(m & front, 0, gape) | (m & ~front)) if gape else m
    H, D, P, J, C, F = M("HF"), M("D"), M("P"), M("J"), M("C"), M("F")
    if back:
        H = H | D | P
        D = P = s.empty()
    J, P = drop(J), drop(P)
    D = D | (drop(D) & ~H) | (move(P, 0, -1) & ~H & ~P & dilate(D, 1))
    s.part(C, base=1, k=0, line=0)
    jid = s.part(J, base=2, k=2, line=0)
    if D.any():
        s.part(D & ~J, base=1, k=0, line=None)
    if P.any():
        s.part(P & ~H, base=3, k=0, line=1)
    glint = None
    if hl:
        gx, gy, n = hl
        glint = s.empty()
        for i in range(n):
            xx = (x0 + gx + i) if not flip else (x0 + W - 1 - gx - i)
            glint[y0 + gy - (i // 2), xx] = True
    hid = s.part(H, base=2, k=2, line=0, hl=glint, hl_tone=3)
    # the cleft between the hood's two lobes: a soft dark crease
    s.decal(F, 1, on=hid)
    return hid, jid


def bud(s, x, y, r, ang, face=-1):
    """A pointed bud on the spike: a magenta teardrop on a dark calyx nub.
    ang: direction the tip points (radians, 0 = forward, pi/2 = up)."""
    dx, dy = face * math.cos(ang), -math.sin(ang)
    tip = (x + dx * r * 3.0, y + dy * r * 3.0)
    m, _ = s.leaf((x, y), tip, r * 2.0, fat=0.34, power=0.55)
    s.part(m, base=2, k=1, line=0)
    s.part(s.circle(x + dx * 0.6, y + dy * 0.6, 1.3), base=1, k=0, line=0)


def crest(s, pts, buds, w=2.5):
    """The raceme tip above the head: a dark stalk with buds swept back."""
    path = spline(pts, 16)
    s.part(s.stroke(path, (w, 1.2)), base=1, k=0, line=0)
    for t, r, ang, face in buds:
        (x, y), _ = at(path, t)
        bud(s, x, y, r, ang, face)


def leafp(s, base, tip, w, bend=0.0, rim=1, fat=0.4, rib=False):
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, power=0.75)
    pid = s.part(m, base=1, k=0, rim=rim, rim_tone=2, line=0)
    if rib and w >= 6:
        s.decal(s.line1(path[10:-18]) & erode(m, 1), 0, on=pid)
    return pid


def stem(s, pts, w0, w1):
    path = spline(pts, 20)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=1, k=0, rim=1, rim_tone=2, line=0)
    return pid, path


def spark(s, x, y, big=False):
    """A drifting gold pollen spark: a lit pixel with a dark halo."""
    pts = [(x, y), (x, y + 1)] + ([(x + 1, y), (x + 1, y + 1)] if big else [])
    halo = set()
    for (a, b) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            halo.add((a + dx, b + dy))
    halo -= set(pts)
    s.px([p for p in halo if 0 <= p[0] < s.w and 0 <= p[1] < s.h and s.tone[p[1], p[0]] < 0], 0)
    s.px(pts, 3)


# ---------------------------------------------------------------------------

def front_sprout(ph=0):
    """LUNGING (small): a big jaw-flower thrust at the foe off a short C-stalk."""
    s = Sprite(56, 56, PAL)
    b = [0, 1][ph]             # feint: the head dips 1px, the jaws part 1px more
    leafp(s, (31, 41), (48, 30 - b), 6, bend=-0.18)            # rear arm, cocked back
    leafp(s, (31, 54), (47, 51), 5, bend=0.16)                 # back foot
    stem(s, [(29, 55), (30, 46), (29, 36), (24, 27 + b)], 4.5, 3.5)
    crest(s, [(24, 21 + b), (27, 15 + b), (30, 11 + b)], [(0.45, 2.3, 1.9, -1), (1.0, 2.2, 0.8, 1)], w=1.8)
    leafp(s, (28, 54), (9, 50 - b), 6, bend=0.20)              # lead arm / front foot, braced
    flower(s, 4, 18 + b, HEAD_M, gape=b, hl=(5, 3, 3))
    return s


def front_adult(ph=0):
    """LUNGING: the spike grown into a three-jawed hydra. The big head lunges
    at the foe off an S-neck, a second jaw snaps below it, a third looks back
    as the tail; bud horns crest the top, a leaf wing is flung up behind."""
    s = Sprite(56, 56, PAL)
    b = [0, 1, 1][ph]          # the head dips forward, the jaws gape, sparks drift
    w = [0, 1, 2][ph]
    leafp(s, (35, 40), (55, 17 - w), 8, bend=-0.20, fat=0.45)  # rear arm: a leaf wing flung up,
    leafp(s, (36, 44), (55, 33 - w // 2), 6, bend=-0.12)       # fanned in two
    leafp(s, (35, 54), (54, 50), 6, bend=0.16)                 # back foot
    stem(s, [(33, 55), (35, 46), (33, 36), (28, 24 + b), (27, 18 + b)], 5.5, 3.5)
    flower(s, 37, 27, HEAD_T, face=1, hl=None)                 # the tail: a flower looking back
    crest(s, [(27, 15 + b), (31, 9 + b), (35, 5 + b)],
          [(0.35, 2.7, 2.0, -1), (0.75, 2.6, 0.9, 1), (1.0, 2.4, 1.5, 1)], w=1.8)
    leafp(s, (32, 54), (8, 50 - b), 7, bend=0.20, rib=False)   # lead arm / front foot: a leaf claw braced
    flower(s, 13, 31, HEAD_S, gape=[0, 0, 1][ph], hl=(5, 3, 2))  # second jaw
    flower(s, 2, 6 + b, HEAD_L, gape=[0, 1, 2][ph])
    for (x, y, big) in [((0, 20, True), (2, 24, False)),
                        ((0, 21, True), (1, 26, False)),
                        ((0, 23, True), (0, 28, False))][ph]:
        spark(s, x, y, big)
    return s


def head_back(s, cx, cy, R, lean=0.35):
    """A flower-head from behind and above, leaning toward the foe (top-right):
    the hood's two lobes, the crease between them, the calyx where the stalk
    joins (bottom-left) and the lower lip's lobes jutting past the far side."""
    c, sn = math.cos(lean), math.sin(lean)
    P = lambda u, v: (cx + u * c * R - v * sn * R * -1 * 0 + u * 0, cy - u * sn * R + v * R) if False else \
        (cx + (u * c + v * sn) * R, cy + (-u * sn + v * c) * R)
    # lower lip lobes, beyond the hood on the far (right) side
    jaw = s.empty()
    for u, v, r in ((0.95, 0.30, 0.34), (0.80, 0.55, 0.30), (0.55, 0.70, 0.26)):
        x, y = P(u, v)
        jaw |= s.circle(x, y, r * R)
    s.part(jaw, base=2, k=2, line=0)
    lob = s.empty()
    for u, v, rx, ry in ((-0.30, -0.05, 0.62, 0.70), (0.38, -0.12, 0.60, 0.66)):
        x, y = P(u, v)
        lob |= s.ellipse(x, y, rx * R, ry * R, ang=-lean)
    x0, y0 = P(-0.3, -0.5)
    gl = s.ellipse(x0, y0 + 1, max(1.4, 0.12 * R), 0.9, ang=-0.4)
    hid = s.part(lob, base=2, k=2, line=0, hl=gl, hl_tone=3)
    crease = s.line1([P(0.05, -0.75), P(0.06, -0.35), P(0.02, 0.15)])
    s.decal(crease & erode(lob, 1), 1, on=hid)
    cal = s.empty()
    xc, yc = P(-0.55, 0.62)
    for k in range(5):
        u = 2 * math.pi * k / 5 + 0.3
        cal |= s.stroke([(xc, yc), (xc + math.cos(u) * R * 0.32, yc + math.sin(u) * R * 0.28)], (3.0, 1.2), cap=False)
    s.part(cal | s.circle(xc, yc, R * 0.14), base=1, k=0, line=0)
    return (xc, yc)


def back_sprout():
    s = Sprite(48, 48, PAL)
    leafp(s, (22, 46), (47, 30), 11, bend=-0.14)
    leafp(s, (20, 46), (0, 30), 11, bend=0.14)
    stem(s, [(18, 48), (16, 40), (15, 32)], 7.0, 5.5)
    crest(s, [(34, 14), (38, 8), (40, 2)], [(0.5, 3.0, 1.0, 1), (1.0, 2.6, 1.6, 1)], w=2.6)
    head_back(s, 24, 21, 15, lean=0.30)
    return s


def back_adult():
    s = Sprite(48, 48, PAL)
    leafp(s, (24, 48), (48, 26), 12, bend=-0.14)
    leafp(s, (20, 48), (0, 24), 12, bend=0.14)
    stem(s, [(16, 48), (14, 40), (13, 32)], 8.0, 6.0)
    flower(s, 0, 30, HEAD_T, face=-1, back=True, hl=None)
    crest(s, [(36, 10), (40, 5), (44, 0)], [(0.4, 3.0, 1.0, 1), (0.95, 2.6, 1.5, 1)], w=2.8)
    head_back(s, 25, 19, 17, lean=0.35)
    return s


ICON_SPROUT = [
    "................",
    "........kk......",
    ".......k22k.....",
    "....kkkk2kkk....",
    "..kk22222222k...",
    ".k2332222222k...",
    "k222222222221k..",
    "k2kkkkkkk2211k..",
    ".k.......k221k..",
    "..kkkkkkk2221k..",
    ".k3333322211k...",
    "k22222222211k.k.",
    ".k2222222211kk1k",
    "..kkkkkkk11k111k",
    ".......k11kkkkk.",
    "......kkkk......",
]

ICON_ADULT = [
    "..........kk....",
    ".........k22k...",
    "..kkkkk.k22k....",
    ".k2332kkk2kk....",
    "k222222222k.....",
    "k222222222k..kk.",
    "kkkkkk22221kk11k",
    "k.....k2221k111k",
    ".kkkkkk2221k11k.",
    "k3333322211k1k..",
    "k22222222211kkk.",
    ".kk222222211k22k",
    "...kkkkkkk11k221",
    "..kk11k..k11kkkk",
    ".k1111k.k111k...",
    "..kkkkkkkkkkk...",
]


def _down(rows):
    return ["                "] + rows[:-1]


SPRITES = {
    "snapdragon_sprout": dict(pal=PAL, front=front_sprout, frames=2, back=back_sprout,
                              icon=ICON_SPROUT, icon2=_down(ICON_SPROUT)),
    "snapdragon": dict(pal=PAL, front=front_adult, frames=3, back=back_adult,
                       icon=ICON_ADULT, icon2=_down(ICON_ADULT)),
}
