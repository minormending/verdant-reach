"""Foxglove line: foxglove_rosette -> foxglove (Digitalis purpurea).

Signature: the bells and their spots (the speckled throat of each pendent
tubular flower). The first-year rosette is a woolly grey-teal cloak of
leaves with its first young spire curled over like a crook, two bells
dangling at the foe. The foxglove is a tall spire hooked over the foe like
a reaper's crook, bells hung down its foe side (a one-sided raceme, as in
the real plant), big at the bottom to tight buds at the tip, over a cloak
of dusky violet leaves: poisonous and a little eerie (bloom/ghost).

Palettes: the light slot is the line's accent (blush pink) in both.
- foxglove_rosette: COILED (the spire's S-curve crook carrying two bells
  at the foe). score: 8 (7: the leaves are matte, two-tone).
- foxglove: LOOMING (the raceme hooks over the foe like a hood; bells
  drawn bottom-first so every speckled mouth shows). score: 8 (6: the dusky
  leaf cloak uses a flat dark with a hairy rim, no mid tone).
"""

from __future__ import annotations

import math

import numpy as np

import icons_c
from common import icon, squash, recentre
from px import Sprite, bezier

IDS = ["foxglove_rosette", "foxglove"]

ROSETTE = ["#483c70", "#7898a0", "#f8d0e0"]    # violet shade, woolly grey-teal leaf, blush bell
FOXGLOVE = ["#48306c", "#c058a8", "#f8d8e0"]   # violet shade/leaves, magenta bells, blush light


def woolly_leaf(s, p0, p1, w, bend=0.0, tones=(1, 2, 2), line="black", veins=True):
    """Ovate-lanceolate rosette leaf, soft-tipped, with wrinkled net veins."""
    c = s.c
    m = c.leaf(p0, p1, w, bend=bend, power=0.7, tip=1.25, base=0.8)
    if tones == (0, 1, 1):          # dusky leaves: flat violet, a hairy lit rim
        part = s.add(m, tones=(1, 1, 3), shade=(2, 2), close=2, band=(1, 2), line=line)
    else:
        part = s.add(m, tones=tones, shade=(2, 2), close=2, line=line)
    return part, (p0, p1, w, bend)


def leaf_veins(s, part, geo, tone=1, n=3):
    c = s.c
    p0, p1, w, bend = geo
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    mid = [p0 + ax * L * t + nx * bend * math.sin(math.pi * t) for t in np.linspace(0.05, 0.85, 12)]
    m = c.stroke(mid, 1.0)
    for k in range(1, n + 1):
        t = k / (n + 1.2)
        q = p0 + ax * L * t + nx * bend * math.sin(math.pi * t)
        for sd in (-1, 1):
            e = q + ax * L * 0.12 + nx * sd * w * 0.32
            m |= c.stroke([q, e], 1.0)
    s.paint(m & part.mask & ~shift_edge(part.mask), tone, only=[2, 3])


def shift_edge(m):
    from scipy import ndimage
    return m & ~ndimage.binary_erosion(m)


def bell(s, at, L, w, ang, tones=(1, 2, 3), lip=True, mouth_tones=(1, 1, 1)):
    """A pendent foxglove bell hanging from `at` on the stem, its axis at
    `ang` degrees (90 = straight down, 135 = down-left toward the foe).
    The tube flares from the stalk to an open mouth, drawn as its own part
    so the throat reads. Returns (tube part, mouth part, mouth centre, axis)."""
    c = s.c
    a = math.radians(ang)
    ax = np.array([math.cos(a), math.sin(a)])
    p0 = np.array(at, float)
    p1 = p0 + ax * L
    tube = c.stroke([p0, p0 + ax * L * 0.45], w * 0.42, w * 0.8)
    tube |= c.stroke([p0 + ax * L * 0.4, p1 - ax * 1.0], w * 0.8, w)
    k = 2 if (w > 9.5 and not lip) else 1
    part = s.add(tube, tones=tones, shade=(k, k), close=1, band=(1, 2) if not lip else None, line="black")
    mp = None
    mc = p1 - ax * 0.4
    if lip:
        mouth = c.ellipse(mc[0], mc[1], w * 0.58, w * 0.38, math.degrees(a) + 90)
        mp = s.add(mouth, prune=False, tones=(3, 3, 3), flat=True, line="black")
    return part, mp, mc, ax


def crescent(s, part, k=3, tone=1):
    """A crisp form shadow on the bottom-right of a part (big back-view bells)."""
    from px import shift as sh
    m = part.mask
    s.paint(m & ~sh(m, -k, -k), tone, only=[2, 3])


def bell_spots(s, mp, mc, ax, w):
    """The open mouth: the throat's upper half in shadow (dark), the pale
    lower lip speckled with dark spots, as in the real flower."""
    if mp is None:
        return
    c = s.c
    nx, ny = -ax[1], ax[0]
    # throat shadow: the half of the mouth toward the stalk / upper side
    q = (mc[0] - ax[0] * w * 0.14, mc[1] - ax[1] * w * 0.14 - w * 0.05)
    sh = c.ellipse(q[0], q[1], w * 0.46, w * 0.25, math.degrees(math.atan2(ax[1], ax[0])) + 90)
    s.paint(sh & mp.mask, 1, only=[3])
    deep = c.ellipse(q[0] - ax[0] * 0.8, q[1] - ax[1] * 0.8, w * 0.22, w * 0.12,
                     math.degrees(math.atan2(ax[1], ax[0])) + 90)
    s.paint(deep & mp.mask, 0, only=[1])
    # spots on the pale lower lip: every third pale pixel with pale on both
    # sides becomes a dark speckle (the real flower's spotted throat)
    ys, xs = np.nonzero(mp.mask & (s.t == 3))
    k = 0
    for y, x in sorted(zip(ys, xs), key=lambda q: (q[1], q[0])):
        if 0 < x < s.w - 1 and s.t[y, x - 1] == 3 and s.t[y, x + 1] == 3 and (x + 2 * y) % 3 == 0:
            s.px([(x, y)], 1)
            k += 1
            if k >= 3:
                break


def speckles(s, part, pts, ring=3, core=1):
    """Speckle clusters on a bell's flank: a dark dot with a light rim."""
    for x, y in pts:
        if s.owner[y, x] != s.parts.index(part) if False else not part.mask[y, x]:
            continue
        s.px([(x, y)], core)
        for dx, dy in ((-1, 0), (0, -1)):
            xx, yy = x + dx, y + dy
            if part.mask[yy, xx] and s.t[yy, xx] in (1, 2):
                s.px([(xx, yy)], ring)


def bud(s, at, r, tones=(1, 2, 2)):
    c = s.c
    return s.add(c.ellipse(at[0], at[1], r, r * 0.8), tones=tones, shade=(1, 1), line="black")


# --------------------------------------------------------------------------- rosette

def rosette_front(f=0):
    """COILED: a woolly rosette crouched low, the hood leaves up behind,
    the young spire rising in an S and curled over like a crook so its two
    first bells dangle at the foe. Idle: the bells swing 1px toward the foe,
    the crook nods."""
    s = Sprite(56, 56, ROSETTE)
    c = s.c
    sw = (0, 1, 1)[f]
    nod = (0, 0, 1)[f]
    leaves = []
    # hood: two upright leaves behind (far side, smaller and higher)
    leaves.append(woolly_leaf(s, (33, 50), (47, 26), 11, bend=2.0))
    leaves.append(woolly_leaf(s, (30, 50), (36, 23), 10, bend=-1.5))
    # back foot leaf to the right
    leaves.append(woolly_leaf(s, (32, 52), (54, 48), 10.5, bend=-2.0))
    # the young spire: S-curve up from the heart, hooked over toward the foe
    sp = bezier([(30, 50), (38, 34), (30, 16), (16 - sw, 13 + nod)], 40)
    spire = c.stroke(sp, 4.6, 2.8)
    s.add(spire, tones=(1, 2, 2), shade=(1, 0), band=(1, 2))
    # tip buds curling down past the crook
    bud(s, (13 - sw, 16 + nod), 2.6)
    bud(s, (20 - sw * 0.5, 11 + nod), 2.6)
    # the first bells, dangling from the crook at the foe
    b2 = bell(s, (33.5, 25), 11, 8.0, 118 + sw * 3, tones=(1, 3, 3))
    b1 = bell(s, (25 - sw * 0.5, 14 + nod), 13, 9.4, 112 + sw * 4, tones=(1, 3, 3))
    # front leaves: the lead foot/arm, broad and forward, and a near leaf
    leaves.append(woolly_leaf(s, (30, 52), (4, 48), 13, bend=2.4))
    leaves.append(woolly_leaf(s, (31, 52), (20, 42), 9, bend=-1.5))
    s.render()
    for part, geo in leaves:
        leaf_veins(s, part, geo)
    for (part, mp, mc, ax), w in ((b1, 9.4), (b2, 8.0)):
        bell_spots(s, mp, mc, ax, w)
    # glint: on the near bell's lit shoulder
    s.rows(int(24 - sw * 0.5), int(17 + nod), ["3"])
    s.selout(inner=(2,))
    s.contact(8, 16)
    s.contact(40, 48)
    s.clean()
    return s


def rosette_back():
    """Behind and above: the rosette's broad woolly leaves seen from above,
    spread wide and running out of frame; the young spire rising from the
    heart and hooking over to the top right, its two bells dangling there."""
    s = Sprite(48, 48, ROSETTE, crop_bottom=True)
    c = s.c
    leaves = []
    leaves.append(woolly_leaf(s, (20, 46), (1, 30), 15, bend=-2))
    leaves.append(woolly_leaf(s, (22, 44), (10, 14), 13, bend=2))
    leaves.append(woolly_leaf(s, (27, 46), (47, 34), 15, bend=2))
    sp = bezier([(24, 44), (20, 28), (27, 10), (38, 5)], 40)
    s.add(c.stroke(sp, 6.4, 4.0), tones=(1, 2, 2), shade=(1, 0), band=(1, 2))
    bud(s, (41, 6.5), 3.4)
    b2 = bell(s, (26, 16), 13, 10.5, 64, tones=(1, 3, 3), lip=False)
    b1 = bell(s, (34, 7), 16, 12.5, 76, tones=(1, 3, 3), lip=False)
    bl = [b1[0], b2[0]]
    leaves.append(woolly_leaf(s, (23, 48.5), (2, 46), 16, bend=-2))
    leaves.append(woolly_leaf(s, (25, 48.5), (47, 47), 16, bend=2))
    s.render()
    for part, geo in leaves:
        leaf_veins(s, part, geo)
    for b in bl:
        crescent(s, b, 3)
    s.selout(inner=(2,))
    s.clean()
    return s


# --------------------------------------------------------------------------- foxglove

def foxglove_front(f=0):
    """LOOMING: the spire rises from a cloak of dusky leaves and hooks right
    over the foe; six bells hang down its foe side, biggest at the bottom,
    their speckled throats gaping at the foe; the lead leaf is raised
    forward like a claw. Idle: the crook nods 1px, the bells swing."""
    s = Sprite(56, 56, FOXGLOVE)
    c = s.c
    sw = (0, 1, 1)[f]
    nod = (0, 0, 1)[f]
    leaves = []
    # cloak: back leaves spread up behind (far side)
    leaves.append(woolly_leaf(s, (38, 50), (55, 24), 13, bend=2.4, tones=(0, 1, 1)))
    leaves.append(woolly_leaf(s, (37, 53), (55, 48), 11, bend=-1.5, tones=(0, 1, 1)))
    # spire: reverse C up the back, hooking over the top toward the foe
    sp = bezier([(36, 52), (47, 30), (38, 5), (19 - sw, 3 + nod), (12 - sw, 10 + nod)], 60)
    s.add(c.stroke(sp, 7.0, 3.2), tones=(1, 1, 2), shade=(1, 0), band=(1, 2), line="black")
    # tight buds at the hooked tip, curling down (the motion cue)
    bud(s, (12.5 - sw, 12 + nod), 2.4, tones=(1, 2, 2))
    bud(s, (17 - sw, 6.5 + nod), 2.4, tones=(1, 2, 2))
    bud(s, (23 - sw * 0.5, 4.5 + nod * 0.5), 2.6, tones=(1, 2, 2))
    # bells, top (small) to bottom (big), hung on the foe side of the spire
    spec = [(0.78, 9.5, 7.6, 100), (0.62, 11.5, 8.8, 106), (0.46, 13.0, 9.8, 112), (0.30, 14.0, 10.6, 118)]
    bells = []
    for (t, L, w, ang) in reversed(spec):     # bottom first: each upper mouth overlaps the bell below
        x, y = sp[int(t * (len(sp) - 1))]
        lean = (1.0 - t) * 0 + (sw if t > 0.5 else sw * 0.5)
        b = bell(s, (x - 1.5 - lean, y), L, w, ang + sw * 3)
        bells.append((b, w))
    # the lead leaf raised forward like a claw, and the near cloak leaf
    leaves.append(woolly_leaf(s, (35, 53), (3, 52), 15, bend=2.6, tones=(0, 1, 1)))
    leaves.append(woolly_leaf(s, (32, 50), (5, 37 - sw), 11, bend=-3.0, tones=(0, 1, 1)))
    s.render()
    for part, geo in leaves:
        leaf_veins(s, part, geo, tone=0)
    for (part, mp, mc, ax), w in bells:
        bell_spots(s, mp, mc, ax, w)
    # glint on the top bell's shoulder
    (part, mp, mc, ax), w = bells[-1]
    s.rows(int(mc[0] + 4), int(mc[1] - 6), ["3", "3"])
    s.selout(inner=(2,))
    s.contact(6, 13)
    s.contact(46, 53)
    s.clean()
    return s


def foxglove_back():
    """Behind and above: the spire hooks over toward the top right with the
    bells hanging on its far (foe) side, their backs toward us; the leaf
    cloak spreads below, running out of frame."""
    s = Sprite(48, 48, FOXGLOVE, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, zoom=1.12)   # closer: the player's creature fills the box
    leaves = []
    leaves.append(woolly_leaf(s, (20, 48.5), (0, 30), 15, bend=-2, tones=(0, 1, 1)))
    leaves.append(woolly_leaf(s, (27, 48.5), (48, 36), 15, bend=2, tones=(0, 1, 1)))
    sp = bezier([(20, 48.5), (10, 26), (18, 5), (36, 2), (44, 9)], 60)
    s.add(c.stroke(sp, 8.0, 4.0), tones=(1, 1, 2), shade=(1, 0), band=(1, 2))
    for at, r in (((45, 12), 3.2), ((40, 5), 3.2)):
        bud(s, at, r)
    spec = [((15, 32), 15.0, 13.0, 40), ((15, 21), 15.0, 12.0, 46), ((20, 11), 14.0, 11.0, 54), ((29, 5), 12.0, 9.5, 62)]
    bl = [bell(s, at, L, w, ang, lip=False)[0] for at, L, w, ang in spec]
    leaves.append(woolly_leaf(s, (24, 48.5), (4, 47), 16, bend=-2, tones=(0, 1, 1)))
    s.render()
    for part, geo in leaves:
        leaf_veins(s, part, geo, tone=0)
    for b in bl:
        crescent(s, b, 3)
    s.selout(inner=(2,))
    s.clean()
    return s


def make(id_):
    if id_ == "foxglove_rosette":
        fr = [rosette_front(k).image() for k in range(3)]
        pal, back = ROSETTE, rosette_back()
    else:
        fr = [foxglove_front(k).image() for k in range(3)]
        pal, back = FOXGLOVE, foxglove_back()
    i1 = icons_c.make_icon(id_, pal)
    fr = recentre(fr)
    return {"front": fr[0], "front__2": fr[1], "front__3": fr[2], "back": back.image(),
            "icon": i1, "icon__2": squash(i1, 9)}
