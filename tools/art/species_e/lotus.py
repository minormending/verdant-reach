"""Lotus line (Nelumbo nucifera): lotus_seed -> sacred_lotus.

Motif: the SEED-HEAD POD with its holes (a shower-head on a stalk), carried
over the water on a C-curved stalk, with the water-shedding leaf held up
as a shield and the lotus-root rhizome as feet. Accent: lotus pink (slot 2)
over the cream-gold pod (slot 3).

lotus_seed   REARING  the seed pod (a flat-topped cone, its face pitted with seed holes and
                      tilted at the foe) rears on a C stalk from two plump lotus-root feet;
                      a young cupped leaf with a water bead is raised as a shield, the last
                      pink petal clings behind like a cape. Idle: the pod bobs 1px.
                      score: 8 (the leaves are flat dark shapes, as on the giant lily)
sacred_lotus REARING  the upright pink flower (pointed petals in a cup, the gold pod in its
                      heart) leans over the foe on a tall C stalk; a big cupped leaf held as
                      a shield sheds a drop (the motion cue), a second leaf high behind,
                      lotus-root feet. Idle: the bloom sways, the drop falls 1-2px.
                      score: 8 (the pod is only glimpsed inside the cup)

Sports: lotus_seed = 'Chawan Basu'; sacred_lotus = 'Alba Grandiflora'. See docs/SPORTS.md.
"""

from __future__ import annotations

import numpy as np

from px import Sprite, bezier, blob
from kit import rot, selout, icon, icon2, nudge

IDS = ["lotus_seed", "sacred_lotus"]

SEED = ["#2c5c5c", "#e07898", "#f8e8b0"]            # teal (leaf, holes, shade), lotus pink, cream (pod, root)
LOTUS = ["#285458", "#e86890", "#f8e0a8"]

CREDIT = ("Hand-built for Verdant Reach (tools/art/species_e). Botany reference: Nelumbo nucifera "
          "flower, receptacle and rhizome, Wikimedia Commons.")

SPECIES = {
    "lotus_seed": dict(
        pal=SEED,
        sport=["#181818", "#3c5c50", "#e8b0b8", "#f8f8f0"],
        credits=CREDIT,
        notes="REARING. Sport: Nelumbo nucifera 'Chawan Basu', the white lotus with blush-pink tips.",
    ),
    "sacred_lotus": dict(
        pal=LOTUS,
        sport=["#181818", "#3c5c50", "#c8c8b8", "#f8f8f0"],
        credits=CREDIT,
        notes="REARING. Sport: Nelumbo nucifera 'Alba Grandiflora', the great white lotus.",
    ),
}


def pts_on(path, n=40):
    return bezier(path, n)


def root_seg(s, x0, y0, x1, y1, w, line="black"):
    """One plump lotus-root segment (cream, pink shadow): a foot."""
    c = s.c
    ang = np.degrees(np.arctan2(y1 - y0, x1 - x0))
    m = c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, abs(x1 - x0) / 2 + 0.5, w / 2, ang)
    s.add(m, tones=(2, 3, 3), shade=(1, 2), line=line)


def leaf_cup(s, cx, cy, rx, ry, tilt, line="black"):
    """A lotus leaf held up like a shield: a shallow funnel seen from the
    side. Returns the inner-lip arc and the bead spot, finished after render."""
    c = s.c
    s.add(c.ellipse(cx, cy, rx, ry, tilt), tones=(1, 1, 1), flat=True, line=line)
    inner = c.ellipse(cx + 0.5, cy - ry * 0.25, rx * 0.78, ry * 0.5, tilt)
    lip = inner & ~np.roll(inner, -1, 0)                      # the inner face's near (lower) edge
    return lip, (cx - rx * 0.1, cy - ry * 0.3)


def finish_cup(s, lip, bead, big=False):
    s.paint(lip, 0, only=[1])
    x, y = int(bead[0]), int(bead[1])
    pts = [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]
    if big:
        pts += [(x + 2, y), (x + 2, y + 1), (x, y + 2), (x + 1, y + 2), (x + 2, y + 2)]
    s.px(pts, 3)
    s.px([(x + (2 if big else 1), y + (2 if big else 1))], 2)


def pod(s, cx, cy, rx, ry, depth, tilt, holes=7, tones=(1, 3, 3), line="black"):
    """The receptacle: a flat-topped cone, its top face tilted at the foe and
    pitted with seed holes. Returns the hole pixel list for later use."""
    c = s.c
    top = c.ellipse(cx, cy, rx, ry, tilt)
    (bx, by), = rot([(cx + 1.0, cy + depth)], tilt, (cx, cy))
    body = blob(c, list(rot([(cx - rx, cy), (cx - rx * 0.55, cy + depth * 0.7), (cx + 1.0, cy + depth),
                             (cx + rx * 0.6, cy + depth * 0.7), (cx + rx, cy)], tilt, (cx, cy))))
    s.add(body, tones=(1, 1, 3), shade=(2, 1), line=line)
    s.add(top, tones=tones, flat=True, line="dark")
    # holes on a jittered ring + centre (never two in a row: no face)
    hs = []
    ring = [(0.0, 0.0)] + [(np.cos(a) * 0.62, np.sin(a) * 0.55) for a in np.radians([15, 75, 140, 200, 255, 320])]
    for k, (u, v) in enumerate(ring[:holes]):
        (hx, hy), = rot([(cx + u * rx, cy + v * ry)], tilt, (cx, cy))
        hs.append((int(round(hx - 0.5)), int(round(hy - 0.5))))
    return hs


def drop_holes(s, hs, big=False):
    for x, y in hs:
        s.px([(x, y)], 1)
        if big:
            s.px([(x + 1, y)], 1)


# --------------------------------------------------------------------------- seed

def seed_front(f=0):
    s = Sprite(56, 56, SEED)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    stalk = c.curve([(27, 48), (34, 39), (32, 28), (24, 21 + sw * 0.3)], 4.2, 3.4)
    lstalk = c.curve([(25, 48), (18, 42), (13, 34 - sw * 0.4)], 3.0, 2.6)
    petal = c.leaf((28, 20), (44 + sw * 0.4, 9 - sw * 0.6), 13, bend=1.8, power=0.55, tip=1.6)   # last petal: a cape
    s.add(petal, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(stalk, tones=(1, 1, 3), shade=(2, 0))
    root_seg(s, 26, 50.4, 45, 52, 8.4)
    root_seg(s, 7, 51.6, 27, 50.4, 9.0)
    s.add(lstalk, tones=(1, 1, 1), flat=True)
    lip, bead = leaf_cup(s, 10.5, 32 - sw * 0.4, 10.5, 5.0, -20)
    hs = pod(s, 18 - sw, 14 + sw * 0.4, 12, 5.2, 12.5, -22)
    s.render()
    finish_cup(s, lip, bead)
    drop_holes(s, hs, big=True)
    # glint: a sliver on the lit rim of the pod's face
    gx, gy = int(10 - sw), int(14 + sw * 0.4)
    s.px([(gx, gy), (gx + 1, gy - 1)], 3)
    selout(s, region=(c.Y < 24) & (c.X < 26), lit=(3,))
    s.clean()
    return s.image()


def seed_back():
    s = Sprite(48, 48, SEED, crop_bottom=True)
    c = s.c
    stalk = c.curve([(22, 44), (16, 34), (20, 24), (28, 18)], 5.0, 4.4)
    petal = c.leaf((24, 18), (4, 3), 16, bend=-1.5, power=0.55, tip=1.6)
    s.add(petal, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(stalk, tones=(1, 1, 3), shade=(2, 0))
    s.add(c.curve([(24, 44), (32, 40), (36, 35)], 3.0, 2.6), tones=(1, 1, 1), flat=True)
    lip, bead = leaf_cup(s, 36, 34, 12, 6.0, 12)
    root_seg(s, 0, 44.5, 24, 43.5, 13)
    root_seg(s, 23, 43.5, 48, 45, 13)
    # the pod from behind and above: its green-gold cone and the rim of the top
    hs = pod(s, 30, 13, 15, 7.5, 16, 16, holes=7)
    s.render()
    finish_cup(s, lip, bead, big=True)
    drop_holes(s, hs, big=True)
    selout(s, region=(c.Y < 20) & (c.X < 28), lit=(3,))
    s.clean()
    return s.image()


SEED_ICON = [
    "................",
    "..00000.....00..",
    ".0333330...0220.",
    ".03131330.02220.",
    ".03313133022230.",
    ".0113333112230..",
    "..01111111000...",
    "...0111110......",
    "..0000010.......",
    ".01110010.......",
    ".01133010.......",
    ".01110110000....",
    ".033330333330...",
    ".022220222220...",
    "..0000.00000....",
    "................",
]


# --------------------------------------------------------------------------- sacred lotus

def lotus_front(f=0):
    s = Sprite(56, 56, LOTUS)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    stalk = c.curve([(30, 49), (38, 39), (36, 27), (28, 20 + sw * 0.3)], 4.2, 3.4)
    rstalk = c.curve([(34, 49), (42, 42), (46, 32)], 3.0, 2.6)
    lstalk = c.curve([(26, 49), (20, 45), (15, 38 - sw * 0.4)], 3.2, 2.8)
    s.add(rstalk, tones=(1, 1, 1), flat=True)
    rlip, rbead = leaf_cup(s, 43.5, 28.5 - sw * 0.4, 9.5, 4.4, 18)           # rear leaf, high
    s.add(stalk, tones=(1, 1, 3), shade=(2, 0))
    root_seg(s, 27, 50.5, 46, 52.4, 8.0)
    root_seg(s, 8, 52.2, 28, 50.6, 9.0)
    s.add(lstalk, tones=(1, 1, 1), flat=True)
    lip, bead = leaf_cup(s, 13, 35 - sw * 0.4, 10.5, 5.2, -16)               # lead leaf: the shield
    # the flower: a cup of pointed petals leaning at the foe, the gold pod in its heart
    cx, cy = 25 - sw, 18 + sw * 0.4
    tilt = -16

    def petal(a, L, w, line="dark", base=3.0):
        r = np.radians(a)
        p1 = rot([(cx + np.cos(r) * L, cy + np.sin(r) * L)], tilt, (cx, cy))[0]
        s.add(c.leaf((cx, cy + base), p1, w, power=0.6, tip=1.8), tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line=line)

    for a, L, w in ((-92, 19, 11), (-58, 18, 10), (-126, 18, 10)):
        petal(a, L, w)
    hs = pod(s, *rot([(cx, cy - 2)], tilt, (cx, cy))[0], 7.5, 3.2, 5, tilt, holes=7, tones=(3, 3, 3), line="dark")
    for a, L, w in ((-18, 18, 10), (-166, 20, 11), (-38, 13, 9), (-142, 14, 9)):
        petal(a, L, w, line="black" if L > 15 else "dark", base=5.0)
    s.render()
    # glint on the lead petal's lit shoulder
    (gx, gy) = rot([(cx - 12, cy - 2)], tilt, (cx, cy))[0]
    s.px([(int(gx), int(gy)), (int(gx) + 1, int(gy))], 3)
    # a bead rolling off the shield leaf: the motion cue
    dx, dy = 4, int(41 + sw * 1.6)
    s.rows(dx - 1, dy - 1, ["_0_", "030", "030", "_0_"])
    finish_cup(s, lip, bead, big=True)
    finish_cup(s, rlip, rbead)
    drop_holes(s, hs)
    selout(s, region=(c.Y < 24) & (c.X < 30), lit=(2, 3))
    s.clean()
    return s.image()


def lotus_back():
    s = Sprite(48, 48, LOTUS, crop_bottom=True)
    c = s.c
    stalk = c.curve([(20, 44), (13, 33), (17, 22), (27, 17)], 4.6, 4.0)
    s.add(c.curve([(18, 44), (12, 38), (9, 32)], 3.0, 2.6), tones=(1, 1, 1), flat=True)
    lip, bead = leaf_cup(s, 10, 31, 11, 6, -10)
    s.add(stalk, tones=(1, 1, 3), shade=(2, 0))
    root_seg(s, 0, 44.5, 24, 43.5, 13)
    root_seg(s, 23, 43.5, 48, 45.5, 13)
    cx, cy = 29, 19
    for a, L, w in ((-80, 21, 14), (-40, 22, 14), (-120, 21, 13), (-5, 22, 14), (-160, 20, 13),
                    (30, 20, 14), (150, 18, 13), (70, 18, 15), (105, 18, 14)):
        r = np.radians(a + 12)
        s.add(c.leaf((cx, cy), (cx + np.cos(r) * L, cy + np.sin(r) * L * 0.85), w, power=0.6, tip=1.8),
              tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line="dark")
    s.render()
    finish_cup(s, lip, bead)
    selout(s, region=(c.Y < 20) & (c.X < 30), lit=(2, 3))
    s.clean()
    return s.image()


LOTUS_ICON = [
    "...0..0..0......",
    "..0200200200....",
    ".023203202320...",
    ".0232333323320..",
    ".0233333333320..",
    "..02222222220...",
    "...012222210....",
    "....0111110.....",
    "..00001000.000..",
    ".0111010..01110.",
    ".01133010011310.",
    ".01110110001110.",
    ".0333303333300..",
    ".022220222220...",
    "..0000.00000....",
    "................",
]


def make(id_):
    f, b, pal, ic = {
        "lotus_seed": (seed_front, seed_back, SEED, SEED_ICON),
        "sacred_lotus": (lotus_front, lotus_back, LOTUS, LOTUS_ICON),
    }[id_]
    dx = {"lotus_seed": 6, "sacred_lotus": 3}[id_]
    i1 = icon(ic, pal)
    return {"front": nudge(f(0), dx), "front__2": nudge(f(1), dx), "front__3": nudge(f(2), dx),
            "back": b(), "icon": i1, "icon__2": icon2(i1)}
