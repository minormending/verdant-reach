"""Crystal rule, maple line: maple_samara -> maple_sapling -> sugar_maple.

A redraw of tools/art/species_b/maple.py under the Crystal rule
(docs/CREATURES.md "Crystal rule", docs/ROLLOUT.md):

  index 0  #181818  the full outline, the seams between leaves
  index 1  species dark: RUST RED. Seeds, radicle, trunk and boughs, the
           veins, and the shadow side of every wing and leaf (the line's
           accent; on the green sapling it is the second hue, the red of
           the twigs and the autumn tips)
  index 2  species light: amber wing / spring-green leaf / sugar-maple orange
  index 3  #f8f8f8  1px light rims on the lit edges of wings and leaves

Signature: the samara key pair and the five-point leaf. Poses kept from the
base art: maple_samara BOBBING (keys as wings on a radicle leg),
maple_sapling LUNGING (S-trunk, open-hand lead leaf, crown leaf as a head),
sugar_maple LOOMING (a crown of five-point leaves overhanging the foe).

Entrance animations (only the named part moves):
  maple_samara   the keys WHIRL a full turn about the stalk, a second slower
                 turn that slows to rest (spin = x scaled by cos; past 90
                 degrees the pair mirrors and the lead wing goes behind).
  maple_sapling  the lead leaf-hand cocks back up, THRUSTS out at the foe and
                 slaps down, the crown leaf ducking with it, then recoils.
  sugar_maple    the crown heaves up and its leaves fan out, holds, settles,
                 and a key whirls down off the crown.

Sport: 'Crimson King' (Acer platanoides, Barbier 1937): maroon-purple
leaves and keys, here a maroon dark under a rose-purple light.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/maple.py          # write the base bundles + review sheet
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _artb_draw import (BSpr, Spr, bez, erode, rot, rim_white, render_frames,  # noqa: E402
                        place, back_frame, moving_boxes, icons)

TOOL = "tools/art/crystal/maple.py"
IDS = ["maple_samara", "maple_sapling", "sugar_maple"]

PAL = {
    "maple_samara": [BLACK, "#a84018", "#f0a840", WHITE],
    "maple_sapling": [BLACK, "#a83820", "#a8d040", WHITE],
    "sugar_maple": [BLACK, "#b03018", "#f89830", WHITE],
}
# 'Crimson King' (docs/SPORTS.md)
SPORT = {
    "maple_samara": [BLACK, "#481838", "#b04868", WHITE],
    "maple_sapling": [BLACK, "#481838", "#a85070", WHITE],
    "sugar_maple": [BLACK, "#401838", "#a84070", WHITE],
}


def spal(i):
    return (PAL[i][1], PAL[i][2], WHITE)


MAPLE5 = [
    (0.00, 0.34),
    (-0.10, 0.30), (-0.34, 0.36), (-0.24, 0.18),
    (-0.30, 0.10), (-0.56, 0.02), (-0.44, -0.08),
    (-0.58, -0.30), (-0.34, -0.22), (-0.16, -0.10),
    (-0.22, -0.32), (-0.30, -0.40), (-0.14, -0.38),
    (0.00, -0.62),
    (0.14, -0.38), (0.30, -0.40), (0.22, -0.32),
    (0.16, -0.10), (0.34, -0.22), (0.58, -0.30),
    (0.44, -0.08), (0.56, 0.02), (0.30, 0.10),
    (0.24, 0.18), (0.34, 0.36), (0.10, 0.30),
]


def maple_leaf(s, cx, cy, size, ang=0.0, k=2, line=0, veins=True, base=2, vein_tone=1, rim=0.45):
    m = s.poly([(x * size + cx, y * size + cy) for x, y in rot(MAPLE5, ang)])
    if size < 18:
        k = min(k, 1)
    pid = s.part(m, base=base, k=k, line=line)
    if veins and size >= 15:
        o = rot([(0, 0.24 * size)], ang)[0]
        for tx, ty in (((0, -0.48),) if size < 20 else ((0, -0.48), (-0.46, -0.22), (0.46, -0.22))):
            p = rot([(tx * size, ty * size)], ang)[0]
            s.decal(s.line1(bez([(cx + o[0], cy + o[1]), (cx + p[0] * 0.85, cy + p[1] * 0.85)], 16)) & erode(m, 1),
                    vein_tone, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


def wing_pts(sx, sy, ang, L, W, squash=1.0):
    lead = [(0, -0.5), (L * 0.5, -W * 0.30), (L * 0.85, -W * 0.38), (L, -W * 0.05)]
    trail = [(L * 0.95, W * 0.35), (L * 0.7, W * 0.62), (L * 0.35, W * 0.5), (L * 0.08, W * 0.25), (0, 0.6)]
    pts = bez(lead + trail, 10)
    c, s_ = math.cos(ang), math.sin(ang)
    return [(sx + (x * c - y * s_) * squash, sy + x * s_ + y * c) for x, y in pts]


def samara_pair(s, sx, sy, a_lead, a_rear, L, W, rear=0.8, veins=True, spin=0.0, rimf=0.5, seed_hl=True):
    """Twin keys. spin (deg) turns the pair about the vertical axis through
    the seeds: every x offset scales by cos(spin) (past 90 deg the pair
    mirrors and the lead wing goes behind)."""
    cs = math.cos(math.radians(spin))
    back_first = cs >= 0
    wr = wing_pts(sx + 1.5 * cs, sy - 0.5, a_rear, L * rear, W * 0.85, cs)
    wl = wing_pts(sx - 1.5 * cs, sy, a_lead, L, W, cs)
    order = [(wr, a_rear, L * rear, False), (wl, a_lead, L, True)]
    if not back_first:
        order = order[::-1]
    ids = []
    for pts, a, ln, lead in order:
        m = s.poly(pts)
        pid = s.part(m, base=2, k=2, line=0 if not ids else 1)
        ids.append(pid)
        if veins:
            ox, oy = pts[0]
            for da, f in ((0.10, 0.75), (0.28, 0.55)):
                aa = a + (1 if not lead else -1) * da * (1 if math.cos(a) > 0 else -1)
                tip = (ox + math.cos(aa) * ln * f * cs, oy + math.sin(aa) * ln * f)
                s.decal(s.line1(bez([(ox, oy), tip], 12)) & erode(m, 1), 1, on=[pid])
        if rimf:
            rim_white(s, m, pid, rimf)
    # the seeds: plump, dark, a white glint on the lead one
    s.part(s.ellipse(sx + 2 * cs, sy + 0.5, W * 0.30, W * 0.26, ang=0.6), base=1, k=1, sh_tone=0, line=0)
    s.part(s.ellipse(sx - 2 * cs, sy + 1, W * 0.33, W * 0.28, ang=-0.4), base=1, k=1, sh_tone=0, line=0,
           hl=s.circle(sx - 2 * cs - 1, sy - 0.2, 0.9) if seed_hl else None, hl_tone=3)
    return ids


# ---------------------------------------------------------------- samara
# spin about the stalk, 60 degrees a frame
SAMARA = [0, 60, 120, 180, 240, 300]


def front_samara(f=0):
    spin = SAMARA[f]
    s = BSpr(56, 56, spal("maple_samara"))
    s.set_tilt(12, 30, 54)
    sx, sy = 30, 31
    s.part(s.curve([(sx + 1, sy + 3), (sx + 4, sy + 12), (sx + 1, sy + 20), (sx - 4, 54)], (3.4, 2.2)), base=1, k=1, sh_tone=0, line=0)
    with s.untilted():
        s.part(s.curve([(sx + 2, 48), (sx + 5, 52), (sx + 9, 54)], (2.0, 1.4)), base=1, k=0, line=0)
    before = s.tone.copy()
    s.part(s.curve([(sx + 2, sy - 2), (sx + 5, sy - 7), (sx + 9, sy - 8)], (1.8, 1.2)), base=1, k=0, line=0)
    samara_pair(s, sx, sy, math.pi + 0.32, -1.05, 25, 14.0, rear=0.76, spin=spin, seed_hl=False, rimf=0.62)
    s.movem = s.tone != before
    s.contact += [(sx - 7, sx - 2)]
    return s


def samara():
    return place(render_frames(front_samara, len(SAMARA)), 56)


def back_samara():
    s = Spr(48, 56, spal("maple_samara"))
    sx, sy = 22, 40
    s.part(s.curve([(sx, sy + 4), (sx - 2, sy + 12), (sx, 60)], (5, 4)), base=1, k=1, sh_tone=0, line=0)
    samara_pair(s, sx, sy, -0.55, math.pi + 0.95, 27, 14, rimf=0.6, seed_hl=False)
    return s


# ---------------------------------------------------------------- sapling
# lead arm (leaf cx, cy, ang, bough tip) and head duck: rest, wind-up, THRUST, slap, recoil
SAPLING = [((10, 35), -1.3, (17, 37), 0), ((15, 39), -0.9, (20, 39), -1), ((5, 39), -1.65, (14, 39), 1),
           ((6, 41), -2.0, (14, 40), 2), ((9, 36), -1.45, (16, 38), 1)]


def front_sapling(f=0):
    (lx, ly), la, (bx, by), duck = SAPLING[f]
    s = BSpr(60, 60, spal("maple_sapling"), sc=0.9)
    s.set_tilt(12, 33, 58)
    s.part(s.curve([(33, 38), (39, 31), (44, 27)], (2.4, 1.6)), base=1, k=0, line=0)
    maple_leaf(s, 46, 22, 15, ang=0.7, k=2, rim=0.4)
    s.part(s.curve([(36, 36), (38, 40)], (1.4, 1.2)), base=1, k=0, line=0)
    samara_pair(s, 38.5, 42, 1.9, 0.9, 9, 4.6, veins=False, rimf=0.0, seed_hl=False)
    trunk = s.curve([(33, 58), (36, 50), (32, 40), (29, 31), (27, 25)], (5.4, 2.8))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0)
    for a, c in (((33, 57), (25, 58)), ((34, 57), (42, 58))):
        with s.untilted():
            s.part(s.curve([a, ((a[0] + c[0]) / 2, 57.5), c], (3.0, 1.4)), base=1, k=0, line=0, merge=[tid])
    before = s.tone.copy()
    maple_leaf(s, 21 - duck * 0.5, 16 + duck * 0.6, 22, ang=-0.5 - duck * 0.05, k=2, line=0, rim=0.5)
    head = s.tone != before
    before = s.tone.copy()
    s.part(s.curve([(31, 41), ((31 + bx) / 2, (41 + by) / 2 - 1), (bx, by)], (3.0, 2.0)), base=1, k=0, line=0, merge=[tid])
    maple_leaf(s, lx, ly, 19, ang=la, k=2, rim=0.5)
    s.movem = head | (s.tone != before)
    s.contact += [(25, 31), (36, 42)]
    return s


def sapling():
    return place(render_frames(front_sapling, len(SAPLING)), 56)


def back_sapling():
    s = Spr(48, 60, spal("maple_sapling"))
    trunk = s.curve([(20, 64), (20, 50), (24, 38), (27, 28)], (6.0, 3.0))
    tid = s.part(trunk, base=1, k=1, sh_tone=0, line=0)
    for a, c in (((21, 48), (8, 42)), ((24, 40), (37, 36))):
        s.part(s.curve([a, c], (2.8, 2.0)), base=1, k=0, line=0, merge=[tid])
    maple_leaf(s, 7, 36, 18, ang=-0.9)
    maple_leaf(s, 39, 32, 19, ang=0.9)
    maple_leaf(s, 28, 18, 24, ang=0.45, rim=0.55)
    return s


# ---------------------------------------------------------------- sugar maple
CROWN = [
    (44, 20, 19, 0.7), (34, 9, 21, 0.2), (19, 10, 21, -0.45), (8, 24, 19, -1.05),
    (41, 31, 17, 0.9), (29, 22, 23, -0.1), (16, 31, 19, -0.75),
]
# (crown heave px, leaf flare rad, key x, key y, key spin deg)
TREE = [(0, 0.0, 52, 44, 0), (-2, 0.06, 50, 36, 40), (-3, 0.10, 49, 39, 140), (-1, 0.04, 51, 43, 220),
        (0, 0.0, 52, 47, 320), (0, 0.0, 52, 44, 0)]


def front_tree(f=0):
    heave, flare, kx, ky, kspin = TREE[f]
    s = BSpr(60, 60, spal("sugar_maple"), sc=0.84)
    s.set_tilt(6, 36, 58)
    trunk = s.curve([(36, 58), (36, 50), (33, 38)], (8.5, 6.0))
    tid = s.part(trunk, base=1, k=2, sh_tone=0, line=0)
    s.part(s.curve([(35, 44), (41, 39), (45, 34)], (3.4, 2.2)), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    with s.untilted():
        s.part(s.poly([(26, 58), (32, 52), (40, 52), (47, 58)]), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    before = s.tone.copy()
    for i, (cx, cy, sz, a) in enumerate(CROWN):
        # the heave: the crown rises and every leaf fans out from the trunk top
        dx = (cx - 30) * flare * 0.25
        maple_leaf(s, cx + dx, cy + heave + abs(dx) * 0.2, sz, ang=a + flare * (1 if cx > 30 else -1), k=3,
                   line=1 if i > 3 else 0, rim=0.0)
    crown = s.tone != before
    # white rims only on the crown's outer silhouette (per-leaf rims inside
    # the crown made white T-shapes where they met the seams)
    rim_white(s, crown & (s.tone >= 0), None, 0.62)
    s.part(s.curve([(33, 45), (24, 45), (15, 42)], (3.4, 2.2)), base=1, k=1, sh_tone=0, line=0, merge=[tid])
    maple_leaf(s, 9, 44, 16, ang=-1.5, k=2, line=0, rim=0.5)
    before = s.tone.copy()
    samara_pair(s, kx, ky, 2.3, 0.9, 8.5, 4.2, veins=False, spin=kspin, rimf=0.0, seed_hl=False)
    s.movem = crown | (s.tone != before)
    s.contact += [(26, 32), (41, 47)]
    return s


def tree():
    return place(render_frames(front_tree, len(TREE)), 56)


def back_tree():
    s = Spr(48, 60, spal("sugar_maple"))
    crown = [(6, 34, 18, -1.1), (42, 26, 18, 0.9), (12, 20, 20, -0.6), (34, 12, 20, 0.5), (22, 10, 20, 0.0),
             (14, 38, 18, -0.4), (36, 38, 18, 0.5), (24, 26, 23, 0.25)]
    s.part(s.curve([(22, 64), (22, 54), (24, 44)], (10, 7)), base=1, k=2, sh_tone=0, line=0)
    for i, (cx, cy, sz, a) in enumerate(crown):
        maple_leaf(s, cx, cy + 4, sz, ang=a, k=3, line=1 if i > 1 else 0, rim=0.45)
    return s


# ---------------------------------------------------------------- icons
# k outline, 1 rust, 2 light, 3 white; None = frame 2 hops 1px
ICONS = {
    "maple_samara": ([
        "................",
        ".........kkkk...",
        ".kkkk...k3322k..",
        "k3332kk.k3222k..",
        "k2222222kk221k..",
        ".k11222222k1k...",
        "..kk1111kk11k...",
        "....kkkkk11k....",
        "........k11k....",
        ".......k11k.....",
        ".......k11k.....",
        "......k11k......",
        ".....k11k.......",
        "....k11kk1k.....",
        "....kk1kk11k....",
        ".....kk..kk.....",
    ], [
        "................",
        "................",
        ".......kkkk.....",
        "......k3332k....",
        ".....kk2222k....",
        "...kk2221kk.....",
        "..k3322kk1k.....",
        "..k2222k11k.....",
        "...kkkkk11k.....",
        ".......k11k.....",
        ".......k11k.....",
        "......k11k......",
        ".....k11k.......",
        "....k11kk1k.....",
        "....kk1kk11k....",
        ".....kk..kk.....",
    ]),
    "maple_sapling": ([
        "................",
        "....k..k........",
        "..kk3kk3kk..kk..",
        ".k3332222k.k32k.",
        "..k22222kkk212k.",
        ".k2212122k.k22k.",
        "..kk21k1kk.k1k..",
        ".k..kk1k..k1k...",
        "k3kk..k1kk1k....",
        "k322kk11k1k.....",
        ".k222k111k......",
        "k22kk.k11k......",
        ".kk....k11k.....",
        "......kk11kk....",
        ".....k11kk11k...",
        "......kk..kk....",
    ], None),
    "sugar_maple": ([
        "................",
        "...k..k..k......",
        ".kk3kk3kk2kk....",
        "k3333322222kk.k.",
        ".k32222k222k2k2k",
        "k32221122112222k",
        ".k2112211222112k",
        "k22k21222k22211k",
        ".kkkk11k11k111k.",
        "..kk..kk11kkkk..",
        "......k1211k....",
        "......k1211k....",
        ".....k112111k...",
        "....k111kk111k..",
        "...k11kk..kk11k.",
        "....kk......kk..",
    ], None),
}

ANIM = {
    # a fast whirl, then a second turn that slows to rest
    "maple_samara": {"intro": [[0, 6], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [0, 4], [1, 4], [2, 5], [3, 6],
                               [4, 8], [5, 10], [0, 1]], "idle": [[0, 130], [5, 8]]},
    # cock back, THRUST, the slap held, recoil
    "maple_sapling": {"intro": [[0, 6], [1, 14], [2, 4], [3, 16], [4, 8], [0, 1]], "idle": [[0, 120], [4, 10]]},
    # heave, hold, settle, the key whirls down
    "sugar_maple": {"intro": [[0, 6], [1, 8], [2, 16], [3, 6], [4, 8], [5, 8], [0, 1]], "idle": [[0, 140], [1, 8]]},
}

NOTES = {
    "maple_samara": "Crystal rule. BOBBING. Gesture: the keys whirl a full turn about the stalk, a slower second "
                    "turn that slows to rest (each frame redraws the pair with its x offsets scaled by "
                    "cos(spin), so it mirrors past 90 degrees). The seeds carry no white dot (it read as an eye). "
                    "Sport: 'Crimson King', maroon and rose-purple.",
    "maple_sapling": "Crystal rule. LUNGING. Gesture: the lead leaf-hand cocks back, THRUSTS out at the foe and slaps "
                     "down while the crown leaf ducks, then recoils. Green leaves with the rust red in the dark slot "
                     "as twigs, veins and shade. Sport: 'Crimson King'.",
    "sugar_maple": "Crystal rule. LOOMING. Gesture: the crown heaves up and fans its leaves, holds, settles, and a "
                   "key whirls down off the crown. Leaf clumps are split by black seams, rust shade and white "
                   "top-left rims. Sport: 'Crimson King'.",
}

FRONTS = {"maple_samara": samara, "maple_sapling": sapling, "sugar_maple": tree}
BACKS = {"maple_samara": back_samara, "maple_sapling": back_sapling, "sugar_maple": back_tree}


def build():
    """Write the three base bundles."""
    for sid in IDS:
        front = FRONTS[sid]()
        write_species(sid, palette=PAL[sid], sport=SPORT[sid], front=front, back=[back_frame(BACKS[sid])],
                      icon=icons(ICONS[sid]), anim=ANIM[sid], moving=moving_boxes(front),
                      notes=NOTES[sid], tool=TOOL)


if __name__ == "__main__":
    build()
    for sid in IDS:
        intro_strip(sid)
    print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_maple.png"))
