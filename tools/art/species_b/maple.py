"""Maple line: maple_samara -> maple_sapling -> sugar_maple.

Signature: the five-pointed maple leaf. The samara's wings carry the leaf's
red-orange; the sapling holds up a handful of big true maple leaves already
tipped red; the sugar maple's crown is built from great maple leaves, so its
silhouette is all maple points (never a blob).
"""

from __future__ import annotations

import math

from pix import MAPLE, Sprite, bez, erode, qbez, rot

PAL_SAMARA = ("#a84018", "#f0a840", "#f8e8a8")
PAL_SAPLING = ("#b03820", "#b0d040", "#e8f8a8")
PAL_TREE = ("#b83018", "#f89830", "#f8e088")


def maple_leaf(s, cx, cy, size, ang=0.0, hl=False, k=2, line=0, veins=True, base=2, vein_tone=1):
    m = s.maple(cx, cy, size, ang)
    hm = None
    if hl:
        hx, hy = rot([(-0.16 * size, -0.12 * size)], ang)[0]
        hm = s.ellipse(cx + hx, cy + hy, max(1.0, size * 0.09), max(1.0, size * 0.06), ang=ang - 0.6)
    pid = s.part(m, base=base, k=k, hl=hm, line=line)
    if veins:
        # main veins from the petiole base to the three big lobes
        o = rot([(0, 0.24 * size)], ang)[0]
        for tx, ty in ((0, -0.42), (-0.38, -0.12), (0.38, -0.12)):
            p = rot([(tx * size, ty * size)], ang)[0]
            s.decal(s.line1(bez([(cx + o[0], cy + o[1]), (cx + p[0] * 0.85, cy + p[1] * 0.85)], 16)) & erode(m, 1), vein_tone, on=[pid])
    return pid


# ---------------------------------------------------------------------------
# maple_samara: a winged key pair, mid-spin
# ---------------------------------------------------------------------------

def wing(s, sx, sy, ang, L, W):
    """One samara wing from the seed at (sx, sy) pointing along ang:
    straight thick leading edge, round trailing belly."""
    pts = []
    # leading edge (top) straight-ish, trailing (bottom) bellied, round tip
    lead = [(0, -0.5), (L * 0.5, -W * 0.30), (L * 0.85, -W * 0.38), (L, -W * 0.05)]
    trail = [(L * 0.95, W * 0.35), (L * 0.7, W * 0.62), (L * 0.35, W * 0.5), (L * 0.08, W * 0.25), (0, 0.6)]
    pts = bez(lead + trail, 10)
    c, s_ = math.cos(ang), math.sin(ang)
    return [(sx + x * c - y * s_, sy + x * s_ + y * c) for x, y in pts]


def front_samara():
    s = Sprite(64, 64, PAL_SAMARA, sc=1.0)
    sx, sy = 32, 34
    # right wing (behind), sweeping down-right; left wing (front) up-left
    wr = wing(s, sx + 2, sy + 1, 0.95, 26, 13)
    rid = s.part(s.poly(wr), base=2, k=2, line=0)
    wl = wing(s, sx - 2, sy, math.pi + 0.55, 26, 13)
    lid = s.part(s.poly(wl), base=2, k=2, line=0, hl=s.ellipse(sx - 12, sy - 9, 3.5, 0.9, ang=0.55))
    # veins fanning from the seed along each wing
    for (wid, a) in ((rid, 0.95), (lid, math.pi + 0.55)):
        for da, ln in ((0.12, 20), (0.3, 16), (0.48, 11)):
            aa = a + (da if wid == rid else -da) * (1 if wid == rid else 1)
            ox, oy = (sx + 2, sy + 1) if wid == rid else (sx - 2, sy)
            sgn = 1 if wid == rid else -1
            aa = a + sgn * da
            s.decal(s.line1(bez([(ox, oy), (ox + math.cos(aa) * ln, oy + math.sin(aa) * ln)], 12)), 1, on=[wid])
    # the twin seeds, plump, where the wings join
    s.part(s.ellipse(sx + 3, sy + 2, 4.2, 3.6, ang=0.6), base=1, k=1, sh_tone=0, line=0, hl=s.circle(sx + 2, sy + 1, 0.8), hl_tone=2)
    s.part(s.ellipse(sx - 2.5, sy + 1, 4.5, 3.8, ang=-0.4), base=1, k=1, sh_tone=0, line=0, hl=s.circle(sx - 4, sy - 0.5, 1.0), hl_tone=2)
    # the stalk that held it to the twig, curling up
    s.part(s.curve([(sx + 1, sy - 2), (sx + 2, sy - 6), (sx + 4, sy - 8)], (1.6, 1.2)), base=1, k=0, line=0)
    return s


def back_samara():
    s = Sprite(48, 72, PAL_SAMARA)
    sx, sy = 24, 46
    wl = wing(s, sx - 2, sy, math.pi + 0.35, 24, 15)
    lid = s.part(s.poly(wl), base=2, k=2, line=0, hl=s.ellipse(sx - 12, sy - 7, 3.5, 0.9, ang=0.35))
    wr = wing(s, sx + 2, sy, -0.35, 24, 15)
    rid = s.part(s.poly(wr), base=2, k=3, line=0)
    for wid, a, sgn, ox in ((lid, math.pi + 0.35, -1, sx - 2), (rid, -0.35, 1, sx + 2)):
        for da, ln in ((0.12, 19), (0.32, 15), (0.52, 10)):
            aa = a + sgn * da
            s.decal(s.line1(bez([(ox, sy), (ox + math.cos(aa) * ln, sy + math.sin(aa) * ln)], 12)), 1, on=[wid])
    s.part(s.ellipse(sx, sy + 3, 6.5, 5, ang=0.0), base=1, k=1, sh_tone=0, line=0, hl=s.circle(sx - 2, sy + 1, 1.0), hl_tone=2)
    s.part(s.curve([(sx, sy - 1), (sx + 1, sy - 5), (sx + 3, sy - 8)], (1.8, 1.4)), base=1, k=0, line=0)
    return s


ICON_SAMARA = [
    "                ",
    "                ",
    "         kk     ",
    " kkkk      k    ",
    "k3222kk     k   ",
    "k22222kkk  k    ",
    " k11222221kk    ",
    "  kk11122111k   ",
    "    kkk2k111k   ",
    "       k12111k  ",
    "       k122111k ",
    "        k12221k ",
    "         k1221k ",
    "          k11k  ",
    "           kk   ",
    "                ",
]


# ---------------------------------------------------------------------------
# maple_sapling: a young whip holding up big true maple leaves
# ---------------------------------------------------------------------------

def front_sapling():
    s = Sprite(64, 64, PAL_SAPLING, sc=0.82)
    # trunk: slender, a little S, leaning in
    trunk = s.curve([(33, 63), (34, 54), (31, 44), (31, 34), (29, 24)], (4.0, 2.2))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0, hl=s.ellipse(32, 50, 0.6, 3), hl_tone=2)
    # twigs
    for a, b in (((31, 42), (41, 37)), ((31, 36), (22, 31)), ((31, 46), (21, 45))):
        s.part(s.curve([a, b], (2.0, 1.4)), base=1, k=0, line=0, merge=[tid])
    # leaves: back ones first
    maple_leaf(s, 43, 32, 16, ang=0.6, k=2)
    maple_leaf(s, 19, 41, 15, ang=-0.9, k=2)
    maple_leaf(s, 21, 27, 16, ang=-0.5, k=2)
    maple_leaf(s, 29, 15, 18, ang=-0.15, k=2, hl=True)
    # a red-tipped young leaf just opening at the side
    maple_leaf(s, 42, 46, 11, ang=1.1, k=1, veins=False, base=2)
    return s


def back_sapling():
    s = Sprite(48, 72, PAL_SAPLING)
    trunk = s.curve([(24, 72), (24, 58), (23, 44), (24, 34)], (5.0, 3.0))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0)
    maple_leaf(s, 11, 42, 18, ang=-1.1)
    maple_leaf(s, 37, 44, 18, ang=1.15)
    maple_leaf(s, 33, 28, 19, ang=0.5)
    maple_leaf(s, 14, 27, 19, ang=-0.5, hl=True)
    maple_leaf(s, 24, 18, 18, ang=0.0)
    return s


ICON_SAPLING = [
    "      k  k      ",
    "     k2kk2k     ",
    "  kk k2222k kk  ",
    "  k3kk2112kk2k  ",
    " kk22k1221k22kk ",
    " k2222k11k2221k ",
    "  kk21kkkk12kk  ",
    "   k1k1k1k1k    ",
    "    k  k1k      ",
    " kkk   k1k kkk  ",
    "k221k  k1k k21k ",
    " k21kk k1kk11k  ",
    "  kk1kkk1kk1kk  ",
    "     kk11kk     ",
    "      k11k      ",
    "      kkkk      ",
]


# ---------------------------------------------------------------------------
# sugar_maple: a crown built of great maple leaves on a forked trunk
# ---------------------------------------------------------------------------

CROWN = [
    # (cx, cy, size, ang) back to front
    (12, 30, 20, -1.0),
    (52, 30, 20, 1.0),
    (20, 16, 21, -0.45),
    (44, 16, 21, 0.45),
    (32, 10, 22, 0.0),
    (18, 36, 18, -0.7),
    (46, 36, 18, 0.7),
    (32, 26, 22, 0.05),
]


def front_tree():
    s = Sprite(72, 72, PAL_TREE, sc=0.9)
    # trunk + fork behind the crown
    trunk = s.curve([(33, 71), (33, 60), (32, 48)], (7.5, 5.0))
    tid = s.part(trunk, base=1, k=2, sh_tone=0, line=0, hl=s.ellipse(31.5, 62, 0.7, 4), hl_tone=2)
    for a in ([(32, 52), (25, 44), (20, 38)], [(33, 52), (40, 44), (44, 39)]):
        s.part(s.curve(a, (3.6, 2.4)), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    ox, oy = 0, 12
    for i, (cx, cy, sz, a) in enumerate(CROWN):
        maple_leaf(s, cx + ox, cy + oy, sz, ang=a, k=3, line=0, hl=(i in (2, 7)), vein_tone=1)
    # flaring roots at the foot
    s.part(s.poly([(26, 71), (30, 66), (36, 66), (40, 71)]), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    return s


def back_tree():
    s = Sprite(48, 72, PAL_TREE)
    crown = [
        (6, 40, 18, -1.1), (42, 40, 18, 1.1),
        (12, 26, 20, -0.6), (36, 26, 20, 0.6),
        (24, 18, 21, 0.0),
        (14, 42, 18, -0.4), (34, 42, 18, 0.4),
        (24, 34, 22, 0.1),
    ]
    trunk = s.curve([(24, 72), (24, 62), (24, 50)], (8, 6))
    s.part(trunk, base=1, k=2, sh_tone=0, line=0)
    for i, (cx, cy, sz, a) in enumerate(crown):
        maple_leaf(s, cx, cy + 6, sz, ang=a, k=3, hl=(i == 2))
    return s


ICON_TREE = [
    "      k  k      ",
    "   k kk22kk k   ",
    "  k2k222222k2k  ",
    " kk2222k3222kk  ",
    "k22k22k22222k2k ",
    "k2k2212k222212k ",
    " k2222k122k211k ",
    "kk12221k22k111kk",
    "k21k211kk1k11k1k",
    " kkk11k1kk1kkkk ",
    "   kkkkk11kk    ",
    "       k11k     ",
    "       k11k     ",
    "      k1111k    ",
    "      kkkkkk    ",
    "                ",
]


SPRITES = {
    "maple_samara": dict(pal=PAL_SAMARA, front=front_samara, back=back_samara, icon=ICON_SAMARA),
    "maple_sapling": dict(pal=PAL_SAPLING, front=front_sapling, back=back_sapling, icon=ICON_SAPLING),
    "sugar_maple": dict(pal=PAL_TREE, front=front_tree, back=back_tree, icon=ICON_TREE),
}
