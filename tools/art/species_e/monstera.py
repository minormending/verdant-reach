"""Monstera line (Monstera deliciosa): monstera_cutting -> monstera.

Motif: the SPLIT, HOLED LEAF (pinnatifid slits from the edge, oval holes
along the midrib) held up like a shield, and the AERIAL ROOTS as legs.
Accent: the lime light (slot 3), first the cut face of the cutting's node,
then the veins and glint of the grown leaves.

monstera_cutting BRACED   a propagation cutting turned critter: the stout node braced on
                          two aerial-root legs (its cut end a lime face behind), the
                          young split leaf held up on its petiole like a shield at the
                          foe, a furled new leaf raised behind, a root reaching forward.
                          Splits only, no holes yet. Idle: the shield leaf sways 1px.
                          score: 8 (the shield is big for the body, on purpose)
monstera         LOOMING  two great fenestrated leaves raised in a V (the lead one bigger,
                          its tip hanging over the foe), slits and alternating holes,
                          a thick trunk on aerial-root legs, one root whipping forward.
                          The holes sit toward the base so no pair can read as eyes.
                          Idle: the crown sways 1-2px.
                          score: 8 (the crown is a V more than an overhang)

Sports: cutting = 'Aurea'; monstera = 'Thai Constellation'. See docs/SPORTS.md.
"""

from __future__ import annotations

import numpy as np
from scipy import ndimage

from px import Sprite, bezier, blob
from kit import rot, selout, icon, icon2, nudge

IDS = ["monstera_cutting", "monstera"]

CUT = ["#204838", "#58a848", "#d0f080"]            # blue-green shade (roots, node), leaf green, lime (cut face, light)
MON = ["#1c4438", "#48983c", "#c8e878"]

CREDIT = ("Hand-built for Verdant Reach (tools/art/species_e). Botany reference: Monstera deliciosa "
          "leaves, nodes and aerial roots, Wikimedia Commons.")

SPECIES = {
    "monstera_cutting": dict(
        pal=CUT,
        sport=["#181818", "#4a5a28", "#b8c040", "#f8f0a8"],
        credits=CREDIT,
        notes="BRACED. Sport: Monstera deliciosa 'Aurea' (yellow-variegated, lime-gold leaves).",
    ),
    "monstera": dict(
        pal=MON,
        sport=["#181818", "#3c5848", "#a8c098", "#f0f0d8"],
        credits=CREDIT,
        notes="LOOMING. Sport: Monstera deliciosa 'Thai Constellation' (cream-speckled, milky green leaves).",
    ),
}


def mleaf(c, base, tip, width, n=(2, 2), depth=0.6, holes=0, lobe=0.5, slit=2.2, phase=0.0, hole_r=1.5):
    """A monstera leaf: an ovate-cordate blade from the petiole sinus (base)
    to the tip, with n=(left, right) slits cut from the edge toward the
    midrib (pinnatifid) and `holes` oval holes in a row on the near side of
    the midrib, between the slits. Returns the mask."""
    base, tip = np.asarray(base, float), np.asarray(tip, float)
    ax = tip - base
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])

    def at(u, v):
        return base + ax * L * u + nx * v * width / 2

    m = c.leaf(at(-0.04, 0), tip, width, power=0.5, tip=1.3, base=0.4)
    for sd in (-1, 1):
        q = at(0.1, sd * lobe)
        m |= c.circle(q[0], q[1], width * 0.18)
    m &= ~c.poly([at(-0.25, 0), at(0.08, -0.1), at(0.08, 0.1)])
    for side, k in ((-1, n[0]), (1, n[1])):
        for j in range(k):
            u = 0.22 + 0.62 * (j + 0.5 + phase * side * 0.25) / k
            e = at(u + 0.08, side * 1.15)
            i = at(u, side * max(0.42, 1 - depth))
            m &= ~c.stroke([e, i], slit)
    k = n[1]
    for j in range(holes):
        # between two slits (never in a slit's lane), alternating sides of the
        # midrib and kept toward the base: a pair at the tip would read as eyes
        u = 0.22 + 0.62 * (j + 0.5 + 0.5 * (j % 2)) / k * 0.8
        q = at(u, 0.2 * (1 if j % 2 == 0 else -1))
        ang = np.degrees(np.arctan2(ax[1], ax[0]))
        m &= ~c.ellipse(q[0], q[1], hole_r * 1.35, hole_r * 0.8, ang + 25)
    lab, k = ndimage.label(m)
    if k > 1:                                  # slits must never cut a finger loose
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        m = lab == 1 + int(np.argmax(sizes))
    return m


def midrib(s, base, tip, u0=0.08, u1=0.8, tone=3, over=(2,)):
    for k in np.linspace(u0, u1, 50):
        x = base[0] + (tip[0] - base[0]) * k
        y = base[1] + (tip[1] - base[1]) * k
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone, protect=False)


# --------------------------------------------------------------------------- cutting

def cut_front(f=0):
    s = Sprite(56, 56, CUT)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    # the node: a stout stem segment lying braced, its cut end showing a lime face
    node = c.ellipse(35, 45, 10, 6.2, -14)
    face = c.ellipse(44, 42.6, 3.2, 5.6, -14)
    roots = (c.curve([(31, 48), (26, 51), (22, 55.4)], 4.4, 3.2)
             | c.curve([(38, 49), (41, 52), (43, 55.4)], 4.4, 3.2))
    curl = c.curve([(30, 44), (22, 44), (17, 47), (15, 51)], 3.0, 2.2)      # a young root reaching forward
    # the furled new leaf rising behind (rear arm), the petiole up to the shield leaf
    furl = c.leaf((38, 41), (47, 20 - sw), 7, bend=1.5, power=0.6, tip=1.5)
    pet = c.curve([(33, 41), (31, 33), (27, 27)], 3.4, 2.8)
    b, t = (26.5, 28 + sw * 0.3), (4 - sw, 10 + sw * 0.4)
    blade = mleaf(c, b, t, 28, n=(2, 2), depth=0.58)
    s.add(furl, tones=(1, 2, 3), shade=(2, 1), band=(1, 2))
    s.add(roots, tones=(1, 1, 2), shade=(1, 1))
    s.add(node, tones=(1, 2, 3), shade=(3, 2), band=(1, 2))
    s.add(face, tones=(2, 3, 3), shade=(1, 1), line="dark")
    s.add(curl, tones=(1, 1, 2), shade=(1, 1), line="black")
    s.add(pet, tones=(1, 2, 2), shade=(2, 0))
    s.add(blade, tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line="black")
    s.render()
    midrib(s, b, t, tone=1)
    s.px([(9, 13), (10, 13), (10, 12)], 3)
    selout(s, region=(c.Y < 26) & (c.X < 26))
    s.clean()
    return s.image()


def cut_back():
    s = Sprite(48, 48, CUT, crop_bottom=True)
    c = s.c
    node = c.ellipse(20, 42, 17, 9.5, -10)
    furl = c.leaf((12, 38), (3, 12), 10, bend=-1.5, power=0.6, tip=1.5)
    pet = c.curve([(22, 36), (24, 29), (27, 26)], 4.8, 4.2)
    b, t = (26, 28), (47.6, 1)
    blade = mleaf(c, b, t, 38, n=(2, 2), depth=0.58)
    s.add(furl, tones=(1, 2, 3), shade=(2, 1), band=(1, 2))
    s.add(node, tones=(1, 2, 3), shade=(3, 2), band=(1, 2))
    s.add(pet, tones=(1, 2, 2), shade=(2, 0))
    s.add(blade, tones=(1, 2, 2), shade=(2, 2), line="black")
    s.render()
    midrib(s, b, t, tone=3)
    selout(s, region=(c.Y < 24) & (c.X < 30))
    s.clean()
    return s.image()


CUT_ICON = [
    "....0000........",
    "...0333300......",
    "..0332220200....",
    ".033222220220...",
    ".03222222220....",
    ".030222222210...",
    ".03022222210....",
    ".02222222110....",
    "..0022211010....",
    "....0000001000..",
    ".......02222230.",
    "......022222330.",
    "......011111330.",
    ".......0100010..",
    "......0110.0110.",
    ".......00...00..",
]


# --------------------------------------------------------------------------- monstera

def mon_front(f=0):
    s = Sprite(56, 56, MON)
    c = s.c
    sw = (0, 0.7, 1.4)[f]
    # legs: aerial roots dropping to the ground, thick and cord-like
    roots = (c.curve([(32, 42), (28, 48), (23, 55.4)], 4.0, 3.0)
             | c.curve([(37, 42), (42, 48), (46, 55.4)], 4.0, 3.0))
    whip = c.curve([(30, 37), (21, 40), (14, 45 - sw * 0.4), (11, 51 - sw * 0.4)], 3.2, 2.2)   # a root reaching at the foe
    trunk = c.curve([(35, 46), (37, 36), (34, 24)], 7.0, 5.5)
    # crown: two great fenestrated leaves spread like arms, the lead one hunched over the foe
    b1, t1 = (32, 25), (0.6, 17 - sw)
    lead = mleaf(c, b1, t1, 31, n=(3, 3), depth=0.66, holes=2, hole_r=1.6)
    b2, t2 = (36, 23), (53 + sw * 0.3, 0.6)
    rear = mleaf(c, b2, t2, 26, n=(3, 3), depth=0.66, holes=2, hole_r=1.4)
    s.add(rear, tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line="dark")
    s.add(roots, tones=(1, 1, 2), shade=(1, 1))
    s.add(trunk, tones=(1, 2, 2), shade=(3, 0), line="black")
    s.add(whip, tones=(1, 1, 2), shade=(1, 1), line="black")
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line="black")
    s.render()
    midrib(s, b1, t1, tone=1)
    midrib(s, b2, t2, tone=1)
    s.px([(10, 22), (11, 22), (11, 21)], 3)
    selout(s, region=(c.Y < 26) & (c.X < 28))
    s.clean()
    return s.image()


def mon_back():
    s = Sprite(48, 48, MON, crop_bottom=True)
    c = s.c
    trunk = c.curve([(20, 48), (19, 38), (23, 28)], 9.0, 8.0)
    roots = c.curve([(17, 40), (9, 44), (4, 49)], 4.6, 4.0) | c.curve([(23, 41), (32, 44), (38, 49)], 4.6, 4.0)
    b1, t1 = (23, 27), (47.6, 14)
    lead = mleaf(c, b1, t1, 36, n=(3, 3), depth=0.6, holes=2, hole_r=1.7)
    b2, t2 = (21, 26), (1, 1)
    left = mleaf(c, b2, t2, 33, n=(3, 3), depth=0.6, holes=2, hole_r=1.5)
    s.add(left, tones=(1, 2, 2), shade=(2, 2), line="dark")
    s.add(roots, tones=(1, 1, 2), shade=(1, 1))
    s.add(trunk, tones=(1, 2, 2), shade=(3, 0))
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), line="black")
    s.render()
    midrib(s, b1, t1, tone=3)
    midrib(s, b2, t2, tone=3)
    selout(s, region=(c.Y < 24) & (c.X < 26))
    s.clean()
    return s.image()


MON_ICON = [
    "...0.0.....0.0..",
    "..03030...02020.",
    ".0320220.022020.",
    ".02222220022220.",
    ".0202222022220..",
    ".0222022212220..",
    ".02220222122220.",
    ".02022202112020.",
    "..0220222110.0..",
    "...00.00110.....",
    ".......0110.....",
    "......010110....",
    ".....010010100..",
    "....01100110110.",
    ".....00..00.00..",
    "................",
]


def make(id_):
    f, b, pal, ic = {
        "monstera_cutting": (cut_front, cut_back, CUT, CUT_ICON),
        "monstera": (mon_front, mon_back, MON, MON_ICON),
    }[id_]
    dx = {"monstera_cutting": 4, "monstera": 0}[id_]
    i1 = icon(ic, pal)
    return {"front": nudge(f(0), dx), "front__2": nudge(f(1), dx), "front__3": nudge(f(2), dx),
            "back": b(), "icon": i1, "icon__2": icon2(i1)}
