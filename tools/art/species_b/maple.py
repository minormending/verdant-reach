"""Maple line: maple_samara -> maple_sapling -> sugar_maple.

Signature: the five-pointed maple leaf. The samara's wings carry the leaf's
red-orange; the sapling holds up a handful of big true maple leaves already
tipped red; the sugar maple's crown is built from great maple leaves, so its
silhouette is all maple points (never a blob).

Round 3 poses + scores (CREATURES.md rubric). MAPLE5 is a bolder five-point
leaf for small sizes; the samara key pair is the family motif in all three.
  maple_samara     BOBBING  keys flung up as wings, radicle leg planted.    score: 8
  maple_sapling    LUNGING  S-trunk, open-hand lead leaf, crown leaf ducked
                            like a head, a key at its shoulder.             score: 8
  sugar_maple      LOOMING  crown of five-point leaves overhanging the foe,
                            low lead bough, keys spinning off.              score: 8 (crown interior dense)
"""

from __future__ import annotations

import functools
import math

from pix import MAPLE, bez, erode, qbez, rot
from icons_wild import ICONS
from rig import Spr as Sprite, fit_back

PAL_SAMARA = ("#a84018", "#f0a840", "#f8e8a8")
PAL_SAPLING = ("#b03820", "#b0d040", "#e8f8a8")
PAL_TREE = ("#b83018", "#f89830", "#f8e088")


# Round 3: a bolder, exaggerated sugar-maple leaf for small sizes: five sharp
# lobes (three big, two basal), deep U sinuses, one shoulder tooth per big
# lobe. Petiole at (0, 0.5), tip up.
MAPLE5 = [
    (0.00, 0.34),
    (-0.10, 0.30), (-0.34, 0.36), (-0.24, 0.18),            # left basal lobe
    (-0.30, 0.10), (-0.56, 0.02), (-0.44, -0.08),           # left lobe: tooth, tip
    (-0.58, -0.30), (-0.34, -0.22), (-0.16, -0.10),          # left lobe top point, sinus
    (-0.22, -0.32), (-0.30, -0.40), (-0.14, -0.38),          # centre lobe shoulder tooth
    (0.00, -0.62),                                           # centre tip
    (0.14, -0.38), (0.30, -0.40), (0.22, -0.32),
    (0.16, -0.10), (0.34, -0.22), (0.58, -0.30),
    (0.44, -0.08), (0.56, 0.02), (0.30, 0.10),
    (0.24, 0.18), (0.34, 0.36), (0.10, 0.30),
]


def maple_leaf(s, cx, cy, size, ang=0.0, hl=False, k=2, line=0, veins=True, base=2, vein_tone=1):
    m = s.poly([(x * size + cx, y * size + cy) for x, y in rot(MAPLE5, ang)])
    hm = None
    if hl:
        hx, hy = rot([(-0.16 * size, -0.12 * size)], ang)[0]
        hm = s.ellipse(cx + hx, cy + hy, max(1.0, size * 0.09), max(1.0, size * 0.06), ang=ang - 0.6)
    if size < 18:
        k = min(k, 1)
    pid = s.part(m, base=base, k=k, hl=hm, line=line)
    if veins and size >= 15:
        # main veins from the petiole base to the three big lobes
        o = rot([(0, 0.24 * size)], ang)[0]
        for tx, ty in (((0, -0.48),) if size < 20 else ((0, -0.48), (-0.46, -0.22), (0.46, -0.22))):
            p = rot([(tx * size, ty * size)], ang)[0]
            s.decal(s.line1(bez([(cx + o[0], cy + o[1]), (cx + p[0] * 0.85, cy + p[1] * 0.85)], 16)) & erode(m, 1), vein_tone, on=[pid])
    return pid


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




def samara_pair(s, sx, sy, a_lead, a_rear, L, W, lead_hl=True, veins=True, rear=0.8):
    """Twin keys: the rear wing behind (80%), the lead wing in front, the
    plump seeds where they join. Returns the lead wing's id."""
    wr = wing(s, sx + 1.5, sy - 0.5, a_rear, L * rear, W * 0.85)
    rid = s.part(s.poly(wr), base=2, k=2, line=0)
    wl = wing(s, sx - 1.5, sy, a_lead, L, W)
    hm = None
    if lead_hl:
        hx, hy = sx - 1.5 + math.cos(a_lead) * L * 0.55, sy + math.sin(a_lead) * L * 0.55
        hm = s.ellipse(hx + 0.5, hy - W * 0.2, max(1.2, L * 0.13), 0.9, ang=a_lead)
    lid = s.part(s.poly(wl), base=2, k=2, line=1, hl=hm)
    if veins:
        for wid, a, sgn, (ox, oy), ln0 in ((rid, a_rear, 1, (sx + 1.5, sy - 0.5), L * rear), (lid, a_lead, -1, (sx - 1.5, sy), L)):
            for da, f in ((0.10, 0.75), (0.28, 0.55)):
                aa = a + sgn * da * (1 if math.cos(a) > 0 else -1)
                s.decal(s.line1(bez([(ox, oy), (ox + math.cos(aa) * ln0 * f, oy + math.sin(aa) * ln0 * f)], 12)), 1, on=[wid])
    # the seeds: plump, dark, a glint on the lead one
    s.part(s.ellipse(sx + 2, sy + 0.5, W * 0.30, W * 0.26, ang=0.6), base=1, k=1, sh_tone=0, line=0)
    s.part(s.ellipse(sx - 2, sy + 1, W * 0.33, W * 0.28, ang=-0.4), base=1, k=1, sh_tone=0, line=0,
           hl=s.circle(sx - 3, sy - 0.2, 0.8), hl_tone=2)
    return lid


# ---------------------------------------------------------------------------
# maple_samara: BOBBING, but sprouted. Twin keys flung up like arms, the
# radicle curled down to the ground as a leg, the pedicel a flicking tail.
# ---------------------------------------------------------------------------

def front_samara(p=0):
    s = Sprite(56, 56, PAL_SAMARA)
    b = p
    s.set_tilt(12, 30, 54)
    sx, sy = 30, 31 - b
    # the radicle: a root leg curling down, a toe planted forward
    s.part(s.curve([(sx + 1, sy + 3), (sx + 4, sy + 12), (sx + 1, sy + 20), (sx - 4, 54)], (3.0, 2.0)), base=1, k=1, sh_tone=0, line=0)
    with s.untilted(): s.part(s.curve([(sx + 2, 48), (sx + 5, 52), (sx + 9, 54)], (1.8, 1.4)), base=1, k=0, line=0)
    # the pedicel (old stalk) flicking up behind
    s.part(s.curve([(sx + 2, sy - 2), (sx + 5, sy - 7), (sx + 9, sy - 8 - b)], (1.6, 1.2)), base=1, k=0, line=0)
    # wings: lead flung up-forward at the foe, rear swept up and back
    samara_pair(s, sx, sy, math.pi + 0.32 - 0.05 * b, -1.05 - 0.08 * b, 25, 14.0, rear=0.76)
    s.contact += [(sx - 7, sx - 2)]
    return s


def back_samara():
    s = Sprite(48, 56, PAL_SAMARA)
    sx, sy = 22, 40
    # from behind: the wings spread to the top-right, seen from above
    s.part(s.curve([(sx, sy + 4), (sx - 2, sy + 12), (sx, 60)], (5, 4)), base=1, k=1, sh_tone=0, line=0)
    samara_pair(s, sx, sy, -0.55, math.pi + 0.95, 27, 14)
    return s


# ---------------------------------------------------------------------------
# maple_sapling: LUNGING. An S-whip of a trunk; the lead bough thrusts a big
# open-hand leaf at the foe, the crown leaf ducks forward like a head, and it
# still carries a samara key at its shoulder.
# ---------------------------------------------------------------------------

def front_sapling(p=0):
    s = Sprite(60, 60, PAL_SAPLING, sc=0.9)
    b = p
    s.set_tilt(12, 33, 58)
    # rear arm: a bough up and back, a leaf raised behind
    s.part(s.curve([(33, 38), (39, 31), (44, 27 - b)], (2.2, 1.4)), base=1, k=0, line=0)
    maple_leaf(s, 46, 22 - b, 15, ang=0.7, k=2)
    # samara key hanging from the shoulder (the family motif)
    s.part(s.curve([(36, 36), (38, 40)], (1.2, 1.2)), base=1, k=0, line=0)
    samara_pair(s, 38.5, 42, 1.9, 0.9, 9, 4.6, lead_hl=False, veins=False)
    # trunk: an S, leaning in
    trunk = s.curve([(33, 58), (36, 50), (32, 40), (29, 31), (27, 25)], (5.0, 2.6))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0)
    # roots: two feet planted wide
    for a, c in (((33, 57), (25, 58)), ((34, 57), (42, 58))):
        with s.untilted(): s.part(s.curve([a, ((a[0] + c[0]) / 2, 57.5), c], (2.8, 1.4)), base=1, k=0, line=0, merge=[tid])
    # head: the crown leaf, ducked forward at the foe
    maple_leaf(s, 21 - b * 0.5, 16 - b * 0.5, 22, ang=-0.5, k=2, hl=True, line=0)
    # lead arm: a bough thrust forward with an open-hand leaf
    s.part(s.curve([(31, 41), (24, 40), (17, 37)], (2.8, 1.8)), base=1, k=0, line=0, merge=[tid])
    maple_leaf(s, 10 - b, 35, 19, ang=-1.3, k=2)
    s.contact += [(25, 31), (36, 42)]
    return s


def back_sapling():
    s = Sprite(48, 60, PAL_SAPLING)
    trunk = s.curve([(20, 64), (20, 50), (24, 38), (27, 28)], (6.0, 3.0))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0)
    for a, c in (((21, 48), (8, 42)), ((24, 40), (37, 36))):
        s.part(s.curve([a, c], (2.8, 2.0)), base=1, k=0, line=0, merge=[tid])
    maple_leaf(s, 7, 36, 18, ang=-0.9)
    maple_leaf(s, 39, 32, 19, ang=0.9)
    maple_leaf(s, 28, 18, 24, ang=0.45, hl=True)
    return s


# ---------------------------------------------------------------------------
# sugar_maple: LOOMING. A blazing crown built of great five-point leaves that
# overhangs the foe; a short thick trunk on root feet; the lead bough reaches
# out low; keys spin off the crown.
# ---------------------------------------------------------------------------

CROWN = [
    # (cx, cy, size, ang) back to front; a dome that leans and overhangs left
    (44, 20, 19, 0.7),
    (34, 9, 21, 0.2),
    (19, 10, 21, -0.45),
    (8, 24, 19, -1.05),
    (41, 31, 17, 0.9),
    (29, 22, 23, -0.1),
    (16, 31, 19, -0.75),
]


def front_tree(p=0):
    s = Sprite(60, 60, PAL_TREE, sc=0.86)
    b = p
    s.set_tilt(6, 36, 58)
    # trunk: short and thick, leaning back under the overhang
    trunk = s.curve([(36, 58), (36, 50), (33, 38)], (8.5, 6.0))
    tid = s.part(trunk, base=1, k=2, sh_tone=0, line=0)
    s.part(s.curve([(35, 44), (41, 39), (45, 34)], (3.4, 2.2)), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    # root feet, wide
    with s.untilted(): s.part(s.poly([(26, 58), (32, 52), (40, 52), (47, 58)]), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    for i, (cx, cy, sz, a) in enumerate(CROWN):
        dx = -b if cx < 24 else 0
        maple_leaf(s, cx + dx, cy, sz, ang=a, k=3, line=1 if i > 3 else 0, hl=(i == 5), vein_tone=1)
    # lead bough: reaching low and forward, a leaf like an open hand
    s.part(s.curve([(33, 45), (24, 45), (15, 42)], (3.4, 2.2)), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    maple_leaf(s, 9 - b, 44, 16, ang=-1.5, k=2, line=0)
    # keys spinning off the crown (the motion cue)
    samara_pair(s, 53, 44 + b, 2.3, 0.9, 7, 3.6, lead_hl=False, veins=False)
    s.contact += [(26, 32), (41, 47)]
    return s


def back_tree():
    s = Sprite(48, 60, PAL_TREE)
    crown = [
        (6, 34, 18, -1.1), (42, 26, 18, 0.9),
        (12, 20, 20, -0.6), (34, 12, 20, 0.5),
        (22, 10, 20, 0.0),
        (14, 38, 18, -0.4), (36, 38, 18, 0.5),
        (24, 26, 23, 0.25),
    ]
    trunk = s.curve([(22, 64), (22, 54), (24, 44)], (10, 7))
    s.part(trunk, base=1, k=2, sh_tone=0, line=0)
    for i, (cx, cy, sz, a) in enumerate(crown):
        maple_leaf(s, cx, cy + 4, sz, ang=a, k=3, line=1 if i > 1 else 0, hl=(i == 7))
    return s


SPRITES = {
    "maple_samara": dict(pal=PAL_SAMARA, front=front_samara, back=fit_back(back_samara), icon=ICONS["maple_samara"], icon2="bob",
                         idle=[functools.partial(front_samara, 1)]),
    "maple_sapling": dict(pal=PAL_SAPLING, front=front_sapling, back=fit_back(back_sapling), icon=ICONS["maple_sapling"], icon2="bob",
                          idle=[functools.partial(front_sapling, 1)]),
    "sugar_maple": dict(pal=PAL_TREE, front=front_tree, back=fit_back(back_tree), icon=ICONS["sugar_maple"], icon2="bob",
                        idle=[functools.partial(front_tree, 1)]),
}
