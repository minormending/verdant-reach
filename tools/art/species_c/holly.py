"""Holly line: holly_seedling -> holly (Ilex aquifolium).

Signature: the spines and the berries. The seedling crouches behind two
spiny young leaves held up like a shield and a crest, its first three
berries clutched at the front. The holly is a squat spiked knight: a
helm-crown of glossy spined leaves leaning at the foe, capped with snow
(frost/wood), a spiked leaf-shield thrust forward, a cluster of berries at
its chest, planted on two woody legs.

Palette (one for the line), planned double duty: the dark slot IS the
leaf (holly is near-black glossy green), the mid slot is the berry red
(the accent), the light slot is the icy gloss + snow (frost type). The
leaves are shaded with black seams and lit with a frost rim on their
top-left edges instead of a selout (a dark-tone selout would vanish into
dark leaves).

- holly_seedling: BRACED (crouched ~10 deg at the foe on a forked base,
  shield leaf up, three glossy berries). score: 8 (6: no selout, see above).
- holly: BRACED (a knight leaning ~8 deg in: a snow-capped helm of spined
  leaves overhanging the foe, a gap under the helm, a 30% bigger berry
  cluster at the chest, the shield leaf thrusting a tip spine). score: 8
  (6: no selout; 9: the berries carry three glints, by request).
"""

from __future__ import annotations

import math

import numpy as np

import icons_c
from common import icon, squash, recentre
from px import Sprite

IDS = ["holly_seedling", "holly"]

PAL = ["#285840", "#d83838", "#e0f0e8"]     # glossy holly green, berry red, icy gloss/snow


SPINES = []          # (base, tip) of every spine on the sprite being built


def spiny(c, p0, p1, w, spines=3, spike=3.0, bend=0.0, scallop=0.8):
    """Holly leaf: an ellipse with a wavy margin (small points where the
    spines sit). The spines themselves are drawn after render as crisp 1px
    outline points (see draw_spines), so they never break into crumbs."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])

    def at(u, v):
        return p0 + ax * L * u + nx * (v + bend * math.sin(math.pi * u))

    def half(u):
        return w / 2 * math.sin(math.pi * min(1, max(0, u))) ** 0.75

    m = c.leaf(p0, p1, w, bend=bend, power=0.75)
    for k in range(spines):
        u = 0.24 + 0.62 * (k + 0.5) / spines
        for sd in (-1, 1):
            uu = u + (0.05 if sd > 0 else 0.0)
            h = half(uu)
            base = at(uu + 0.03, sd * (h + 1.0))
            m |= c.poly([at(uu - 0.12, sd * (h - 2.0)), base, at(uu + 0.08, sd * (h - 1.5))])
            q = at(uu - 0.15, sd * (half(uu - 0.15) + 0.9))
            m &= ~c.circle(q[0], q[1], scallop)
            out = at(uu + 0.03 + 0.5 * spike / L, sd * (h + 1.0 + spike))
            SPINES.append((at(uu + 0.03, sd * (h - 1.0)), out))
    tipb = at(1.0, 0)
    SPINES.append((at(0.93, 0), tipb + ax * spike))
    return m


def draw_spines(s):
    """Each spine: a 1px #181818 point from the leaf margin outward,
    8-connected to the outline."""
    for (b, t) in SPINES:
        b, t = s.c.to_screen(*b), s.c.to_screen(*t)
        n = int(max(abs(t[0] - b[0]), abs(t[1] - b[1]))) + 1
        for k in range(n + 1):
            x = int(round(b[0] + (t[0] - b[0]) * k / n))
            y = int(round(b[1] + (t[1] - b[1]) * k / n))
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] < 0:
                s.px([(x, y)], 0)
    SPINES.clear()


def leaf_part(s, p0, p1, w, spines=3, spike=3.0, bend=0.0):
    m = spiny(s.c, p0, p1, w, spines, 2.0, bend)
    part = s.add(m, prune=False, tones=(0, 1, 1), shade=(1, 1), close=2, line="black")
    return part, (p0, p1, w, bend)


def gloss(s, part, geo, frost=True):
    """Glossy holly: a black midrib seam, an icy sheen dash on the lit half,
    and a frost rim along the top-left edge."""
    c = s.c
    p0, p1, w, bend = geo
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    pts = [p0 + ax * L * t + nx * bend * math.sin(math.pi * t) for t in np.linspace(0.08, 0.88, 14)]
    m = part.mask
    from scipy import ndimage
    inner = ndimage.binary_erosion(m, iterations=1)
    s.paint(c.stroke(pts, 1.0) & inner, 0, only=[1])
    # the lit side of the midrib: which normal faces the top-left?
    sd = 1 if (nx @ np.array([-1.0, -1.0])) > 0 else -1
    sheen = [q + nx * sd * w * 0.22 for q in pts[3:9]]
    s.paint(c.stroke(sheen, 1.2) & inner, 2 if False else 3, only=[1])
    if frost:
        edge = m & ~ndimage.binary_erosion(m, iterations=1)
        # the outline is the black ring just outside; paint the first inner ring on the lit side
        ring = inner & ~ndimage.binary_erosion(m, iterations=2)
        X, Y = c.X, c.Y
        cx, cy = (p0 + p1) / 2
        lit = ((X - cx) * -1 + (Y - cy) * -1) > w * 0.3
        s.paint(ring & lit, 3, only=[1])
        del edge


def snow(s, parts, ymax, depth=3, seed=0):
    """Snow lying on the upper faces of the given leaf parts: the top
    `depth` px of each leaf above ymax, with a lumpy lower edge."""
    c = s.c
    from px import shift
    m = c.empty()
    for part, geo in parts:
        lm = part.mask
        cap = (lm | shift(lm, 0, -1)) & ~shift(lm, 0, depth)
        m |= cap
    m &= c.Y < ymax
    # lumpy underside: random-ish bites
    k = 0
    for x in range(s.w):
        col = np.nonzero(m[:, x])[0]
        if len(col) and ((x * 7 + seed) % 5 == 0):
            m[col.max(), x] = False
        k += 1
    return s.add(m, prune=True, tones=(3, 3, 3), flat=True, line="black")


def berry(s, x, y, r=2.6):
    c = s.c
    return s.add(c.circle(x, y, r), tones=(2, 2, 2), flat=True, line="black")


def berry_glints(s, pts):
    for x, y in pts:
        X, Y = s.c.to_screen(x, y)
        X, Y = int(round(X)), int(round(Y))
        s.px([(X, Y), (X + 1, Y), (X, Y + 1)], 3)


# --------------------------------------------------------------------------- seedling

def seedling_front(f=0):
    SPINES.clear()
    """BRACED: crouched low and wide on a forked woody base; the lead leaf
    raised across the front like a spiked shield, the crest leaf up and
    leaning at the foe, the rear leaf swept back; three berries clutched
    in front. Idle: a breath (the crest and shield lift 1px)."""
    s = Sprite(56, 56, PAL)
    c = s.c
    br = (0, 1, 1)[f]
    hi = (0, 0, 1)[f]
    leaves = []
    # stem + forked feet (wood: dark with a black seam)
    s.add(c.curve([(22, 55.6), (25, 50), (29, 45)], 3.6, 3.0) | c.curve([(37, 55.6), (34, 50), (30, 45)], 3.6, 3.0)
          | c.curve([(29.5, 46), (29, 41)], 4.4, 4.0), tones=(0, 1, 1), shade=(1, 0))
    # the whole plant crouches ~10 deg at the foe about its fork
    c.pose((30, 46), 10 + (0, 0.8, 1.8)[f], shift=(2, 0))
    s.add(c.curve([(29.5, 44), (29, 38), (27, 30)], 4.4, 3.4), tones=(0, 1, 1), shade=(1, 0))
    # rear leaf swept up and back
    leaves.append(leaf_part(s, (31, 38), (51, 25 - br * 0.5), 12, spines=3, spike=2.4, bend=-1.5))
    # crest: the head, a big young leaf tipped toward the foe
    leaves.append(leaf_part(s, (28, 33), (14, 7 - br - hi), 16, spines=3, spike=2.8, bend=2.0))
    # lead arm: the shield leaf raised across the front
    leaves.append(leaf_part(s, (29, 42), (5, 33 - br), 14, spines=3, spike=2.6, bend=-2.0))
    # berries clutched at the front, off-centre low
    bs = [(24.5, 45, 3.4), (30.5, 46.5, 3.2), (26.5, 50.5, 3.0)]
    for x, y, r in bs:
        berry(s, x, y, r)
    s.render()
    draw_spines(s)
    for part, geo in leaves:
        gloss(s, part, geo)
    berry_glints(s, [(23.5, 43.5)])
    s.contact(19, 25)
    s.contact(35, 40)
    s.despeck()
    s.clean()
    return s


def seedling_back():
    SPINES.clear()
    s = Sprite(48, 48, PAL, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, zoom=1.25)   # closer: the player's creature fills the box
    leaves = []
    s.add(c.curve([(22, 48.5), (22, 40), (24, 32)], 6.0, 4.6), tones=(0, 1, 1), shade=(1, 0))
    leaves.append(leaf_part(s, (21, 38), (2, 27), 13, spines=3, spike=2.6, bend=1.5))
    leaves.append(leaf_part(s, (24, 32), (36, 5), 18, spines=3, spike=3.0, bend=-2.0))
    leaves.append(leaf_part(s, (25, 40), (47, 30), 15, spines=3, spike=2.8, bend=2.0))
    s.render()
    draw_spines(s)
    for part, geo in leaves:
        gloss(s, part, geo)
    s.despeck()
    s.clean()
    return s




# --------------------------------------------------------------------------- holly

def holly_front(f=0):
    SPINES.clear()
    """BRACED, grown into a spiked knight: two woody legs planted wide, a
    stacked helm-crown of spined leaves leaning at the foe with snow on its
    top, the shield leaf thrust forward, the rear arm leaf up and back; a
    berry cluster at the chest. Idle: a breath (crown down 1px, shield up)."""
    s = Sprite(56, 56, PAL)
    c = s.c
    br = (0, 1, 1)[f]
    hi = (0, 0, 1)[f]
    leaves = []
    # legs: woody trunk forking into two planted feet, wide
    s.add(c.curve([(14, 55.6), (19, 50), (27, 45)], 5.6, 4.4) | c.curve([(45, 55.6), (40, 50), (33, 45)], 5.6, 4.4)
          | c.curve([(30, 47), (30.5, 42)], 7.0, 6.6), tones=(0, 1, 1), shade=(1, 0))
    # the whole knight leans ~8 deg into the foe about its hips
    c.pose((30, 46), 8 + (0, 0.7, 1.6)[f], shift=(3, 0))
    s.add(c.curve([(30, 45), (31, 40), (29, 30)], 7.0, 6.0), tones=(0, 1, 1), shade=(1, 0))
    # body / rear arm: leaves swept up and back on the far side
    leaves.append(leaf_part(s, (35, 32), (53, 20 - br * 0.5), 11.5, spines=3, spike=2.4, bend=-1.5))
    leaves.append(leaf_part(s, (35, 40), (50, 46), 10, spines=2, spike=2.2, bend=-1.0))
    # helm-crown: leaves fanned up from a crown point, leaning at the foe
    crown = [((29, 26), (38, 4 + br), 13.0, -1.5), ((27, 26), (20, 1 + br), 15, 1.5),
             ((26, 27), (5, 9 + br), 14, 2.0)]
    for p0, p1, w, b in crown:
        leaves.append(leaf_part(s, p0, p1, w, spines=3, spike=2.8, bend=b))
    snow(s, leaves[-3:], 14, depth=5)
    # berry cluster at the chest, behind the shield
    bs = [(29, 32, 4.6), (36, 33.5, 4.3), (32, 39.5, 4.4), (38.5, 40.5, 3.8)]
    for x, y, r in bs:
        berry(s, x, y, r)
    # lead arm: the shield leaf raised diagonally across the front
    leaves.append(leaf_part(s, (30, 46), (5, 40 - br - hi), 14, spines=3, spike=2.8, bend=-1.2))
    SPINES.append(((5.5, 40 - br - hi), (0.5, 39.5 - br - hi)))     # the thrusting tip spine
    s.render()
    draw_spines(s)
    for part, geo in leaves:
        gloss(s, part, geo)
    berry_glints(s, [(27.5, 30), (34.5, 31.5), (30.5, 38)])
    s.contact(11, 17)
    s.contact(43, 48)
    s.despeck()
    s.clean()
    return s


def holly_back():
    SPINES.clear()
    s = Sprite(48, 48, PAL, crop_bottom=True)
    c = s.c
    leaves = []
    s.add(c.curve([(22, 48.5), (22, 40), (24, 32)], 8.0, 6.4), tones=(0, 1, 1), shade=(1, 0))
    leaves.append(leaf_part(s, (20, 38), (1, 33), 13, spines=3, spike=2.6, bend=1.5))
    for p0, p1, w, b in (((24, 26), (8, 6), 15, 2.0), ((25, 25), (26, 1), 16, -1.5), ((26, 25), (42, 4), 16, -2.0),
                         ((27, 28), (47, 16), 15, 1.5)):
        leaves.append(leaf_part(s, p0, p1, w, spines=3, spike=2.8, bend=b))
    leaves.append(leaf_part(s, (26, 38), (47, 36), 15, spines=3, spike=2.8, bend=-2.0))
    for x, y, r in ((12, 33, 3.2), (17, 34.5, 3.2), (13.5, 38.5, 3.0)):
        berry(s, x, y, r)
    s.render()
    draw_spines(s)
    for part, geo in leaves:
        gloss(s, part, geo)
    for y in range(0, 14):
        for x in range(2, 47):
            if s.t[y, x] in (1, 3) and (y == 0 or s.t[y - 1, x] == 0) and (y < 2 or s.t[y - 2, x] < 0):
                s.px([(x, y)], 3)
    s.despeck()
    s.clean()
    return s




def make(id_):
    if id_ == "holly_seedling":
        fr = [seedling_front(k).image() for k in range(3)]
        back = seedling_back()
    else:
        fr = [holly_front(k).image() for k in range(3)]
        back = holly_back()
    i1 = icons_c.make_icon(id_, PAL)
    fr = recentre(fr)
    return {"front": fr[0], "front__2": fr[1], "front__3": fr[2], "back": back.image(),
            "icon": i1, "icon__2": squash(i1, 9)}
