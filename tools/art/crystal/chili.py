"""Crystal rule, chili line: chili_blossom -> green_chili -> red_chili.

A redraw of tools/art/species_a/chili.py under the Crystal rule
(docs/CREATURES.md, docs/ROLLOUT.md):

  index 0  #181818  outline, the pod's shadow flank, crevices   (shared)
  index 1  species dark: CALYX GREEN. Calyx, stem, leaf shade; the line's
           accent (the old lime calyx) now lives here in all three stages
  index 2  species light: the body. Leaf green -> pod green -> flame red
  index 3  #f8f8f8  the blossom's real white petals, the pod's gloss stripe,
           leaf rims, the ember                                  (shared)

The two-hue problem (a red pod on a green plant) is solved the flytrap way,
no exception needed: the green goes in the dark slot. The red chili's calyx,
stem and sepal claw are flat index-1 green lit by white rims, and the red
pod is shaded with black, which is what makes it glossy at 1x.

Poses (docs/CREATURES.md) kept from the base art:
  chili_blossom  LUNGING  the nodding star flower thrust out on a hooked stem.
  green_chili    LUNGING  a candle-flame pod leaning in, its tip curling up.
  red_chili      COILED   a fat-shouldered pod whipped into a flame curl.

Entrance animations (only the named part moves):
  chili_blossom  the flower draws back on its neck, holds, then DIPS at the
                 foe with the petals flared, recoils and settles.
  green_chili    the tail tip curls tight (wind-up), then FLICKS out straight
                 and quivers twice like a flame.
  red_chili      the flame curl coils, then LASHES open and throws off an
                 ember that drifts up and away.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/build.py chili        write the base bundles
  $PY tools/art/crystal/chili.py --preview    scratch preview only
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species, review_sheet, intro_strip  # noqa: E402
from _arta_draw import (Sprite, spline, star, lit_stripe, rot, rim, fourconnect, finish, grow,  # noqa: E402
                        frames_from, register, moving_boxes, icon, hop, preview)

TOOL = "tools/art/crystal/chili.py"
IDS = ["chili_blossom", "green_chili", "red_chili"]

PAL = {  # (index 1, index 2)
    "chili_blossom": ("#286830", "#98d058"),
    "green_chili": ("#205030", "#60b838"),
    "red_chili": ("#286028", "#e83820"),
}
# 'Black Pearl' (docs/SPORTS.md): near-black leaves, glossy black fruit,
# purple flowers. Two tones: a black-purple dark, a slate-violet light.
SPORT = {
    "chili_blossom": ("#382048", "#9878b8"),
    "green_chili": ("#201838", "#605078"),
    "red_chili": ("#281828", "#684878"),
}


def pal3(i):
    return [*PAL[i], WHITE]


def tapered(c, path, widths):
    """Stroke along a dense path with a width profile [(t, w), ...]."""
    P = np.asarray(path, float)
    n = len(P)
    ts = np.linspace(0, 1, n)
    kt, kw = zip(*widths)
    W = np.interp(ts, kt, kw)
    m = c.empty()
    for i in range(n - 1):
        d, t = c._seg_dist(P[i], P[i + 1])
        w = W[i] + (W[i + 1] - W[i]) * t
        m |= d <= w / 2
    return m


def calyx_cap(c, cx, cy, w, h, ang=-20, n=5):
    """A calyx gripping the pod's shoulder, its sepal lobes hanging over it."""
    m = c.ellipse(cx, cy, w / 2, h / 2, ang)
    a0 = np.radians(ang)
    for k in range(n):
        a = np.radians(15 + 150 * k / (n - 1)) + a0
        m |= c.circle(cx + np.cos(a) * w * 0.42, cy + np.sin(a) * h * 0.55 + 0.6, w * 0.12)
    return m


# --------------------------------------------------------------- blossom
NECK = (31.0, 24.5)


def blossom_front(nod=0.0, flare=0.0, mask=False):
    """nod: degrees the flower swings about its neck (+ = dips at the foe);
    flare: extra petal length. Only the flower and the stem tip move."""
    s = Sprite(56, 56, pal3("chili_blossom"))
    c = s.c
    hx0, hy0 = 18.5, 28.0
    (hx, hy), = rot([(hx0, hy0)], nod, NECK)
    tilt = -28 + nod
    (sx4, sy4), = rot([(24, 20.5)], nod, NECK)
    stem = c.curve([(34, 55.6), (37.5, 46), (36, 34), (31, 24.5), (sx4, sy4)], 4.4, 3.2)
    feet = (c.leaf((33, 53.2), (22, 55.2), 5.4, power=0.7, bend=0.6)
            | c.leaf((35.5, 53.2), (46, 55.2), 5.0, power=0.7, bend=-0.6))
    lead = c.leaf((35.5, 41), (15, 41), 10.0, bend=-2.6, tip=1.4)
    rear = c.leaf((36.5, 36), (48, 26), 7.5, bend=1.5, tip=1.3)
    budst = c.curve([(36, 31), (40.5, 20), (44, 14.5)], 2.6, 2.0)
    bud = c.leaf((44.5, 14), (47.5, 21), 5.6, power=0.7, tip=1.6, base=0.8)
    budcal = c.ellipse(44.5, 14.8, 2.8, 2.1)
    (cxx, cyy), = rot([(hx0 + 6.5, hy0 - 6.5)], nod, NECK)
    cal = star(c, cxx, cyy, 5, 2.6, 7.0, sy=0.8, rot=-40 + nod)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(budst, tones=(1, 1, 1), flat=True)
    s.add(bud, tones=(2, 3, 3), shade=(2, 1))
    s.add(budcal, tones=(1, 1, 1), flat=True)
    s.add(feet, tones=(1, 2, 2), shade=(1, 1))
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(cal, tones=(1, 1, 1), flat=True)
    tr = np.radians(tilt)
    pet = []
    L = 18.0 + flare
    for k in range(5):
        a = np.radians(-90 + 72 * k + 18)
        ex, ey = np.cos(a) * L, np.sin(a) * L * 0.68
        x, y = ex * np.cos(tr) - ey * np.sin(tr), ex * np.sin(tr) + ey * np.cos(tr)
        near = y > -2
        pet.append((not near, k, (hx + x * (1.0 if near else 0.82), hy + y * (1.0 if near else 0.82))))
    petals = c.empty()
    for far, k, p1 in sorted(pet, reverse=True):
        pm = c.leaf((hx, hy), p1, 11.5 + flare * 0.3, bend=1.6, power=0.55, tip=3.2, base=0.7)
        petals |= pm
        # white petals; the shadow side of each is the leaf green, deeper on the far ones
        s.add(pm, tones=(2, 3, 3), shade=(3, 3) if far else (2, 2), close=1, line="black")
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2, line="black")
    s.render()
    # the eye: green throat, black anther ring, a white pistil
    s.paint(c.ellipse(hx - 0.3, hy - 0.2, 4.2, 3.2, tilt), 2, only=[2, 3, 0])
    s.paint(c.ellipse(hx - 0.3, hy - 0.2, 2.6, 1.9, tilt), 1)
    for k in range(5):
        a = np.radians(-90 + 36 + 72 * k)
        ex, ey = np.cos(a) * 3.8, np.sin(a) * 2.8
        x, y = ex * np.cos(tr) - ey * np.sin(tr), ex * np.sin(tr) + ey * np.cos(tr)
        s.px([(int(round(hx - 0.3 + x)), int(round(hy - 0.2 + y)))], 0)
    rim(s, lead & (c.Y < 41))
    rim(s, rear & (c.Y < 33))
    rim(s, cal & (c.X + c.Y < cxx + cyy), body=(1,))
    for t in np.linspace(0.15, 0.75, 14):
        x, y = int(35.5 + (15 - 35.5) * t), int(41 - 2.6 * np.sin(np.pi * t) * 0.7)
        if s.t[y, x] == 2:
            s.px([(x, y)], 1)
    fourconnect(s)
    img = finish(s)
    if mask:
        return img, petals | cal | c.circle(sx4, sy4, 4.5) | c.circle(26, 21.5, 4)
    return img


BLOSSOM_POSES = [  # (nod, flare)
    (0, 0),
    (-8, -1.0),     # 1 drawing back, petals furling
    (-14, -1.5),    # 2 wound back (held)
    (9, 1.5),       # 3 the dip: thrust at the foe, petals flared
    (4, 0.8),       # 4 recoil
]
BLOSSOM_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 6], [4, 5], [3, 4], [4, 5], [0, 8]],
                "idle": [[0, 120], [4, 10]]}


def blossom_back():
    """From behind and above: the calyx star on the green petal backs, the
    flower nodding toward the top-right, the stem dropping out of frame."""
    s = Sprite(48, 48, pal3("chili_blossom"), crop_bottom=True)
    c = s.c
    cx, cy = 26, 24
    stem = c.curve([(14, 48), (11, 36), (14, 24), (20, 18)], 4.4, 3.4)
    lead = c.leaf((13, 34), (34, 44), 10, bend=2.0, tip=1.3)
    rear = c.leaf((12, 30), (2, 18), 8, bend=-1.5, tip=1.3)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(stem, tones=(1, 1, 1), flat=True)
    pets = []
    for k in (0, 4, 1, 3, 2):
        a = np.radians(-60 + 72 * k)
        p1 = (cx + np.cos(a) * 20, cy + np.sin(a) * 16)
        pm = c.leaf((cx + np.cos(a) * 1.5, cy + np.sin(a) * 1.2), p1, 13.5, power=0.62, tip=2.4, base=0.6)
        pets.append(pm)
        s.add(pm, tones=(2, 3, 3), shade=(5, 4), close=1, line="black")
    cal = star(c, cx - 1, cy - 1, 5, 3.5, 10.0, sx=1, sy=0.85, rot=-90 + 18)
    s.add(cal, tones=(1, 1, 1), flat=True)
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.render()
    rim(s, cal & (c.X + c.Y < cx + cy - 2), body=(1,))
    rim(s, rear & (c.Y < 26))
    fourconnect(s)
    return finish(s)


BLOSSOM_ICON = [
    "................",
    "...00..00.......",
    "..0330033000....",
    "..0333333220....",
    ".003331333200...",
    "0333112332020.0.",
    "0333122320.0.020",
    ".033322220.00220",
    "..0322222001210.",
    "...0220220.0110.",
    "....00.00.0110..",
    "...000000.010...",
    "..0322220010....",
    "...00022201100..",
    "......0000110...",
    "..........00....",
]


# --------------------------------------------------------------- green chili
def green_front(curl=0.0, mask=False):
    """curl: the tail tip (+ = curled tighter, - = flicked out straight)."""
    s = Sprite(56, 56, pal3("green_chili"))
    c = s.c
    tipx, tipy = 51 - curl * 2.0, 36 + curl * 0.5
    midx, midy = 50 + curl * 0.6, 43.5 - curl * 0.4
    if curl < 0:
        tipx, tipy = 52.5 - curl * 0.2, 36 + curl * 3.2
        midx, midy = 50.5, 43.5 + curl * 0.6
    path = spline([(20, 17), (22, 29), (28, 41), (36.5, 48.5), (45, 49), (midx, midy), (tipx, tipy)], 14)
    body = tapered(c, path, [(0, 14), (0.15, 15), (0.45, 12), (0.7, 8.5), (0.9, 4.5), (1, 2.6)])
    cap = calyx_cap(c, 19, 15.5, 16, 8, ang=-22)
    stem = c.curve([(20, 11), (21, 6), (26, 3.5), (30, 5)], 3.6, 2.6)
    lead = c.leaf((16, 21), (4, 40), 9.5, bend=2.0, tip=1.3)
    rear = c.leaf((25, 15), (42, 9.5), 8, bend=-1.4, tip=1.3)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(body, tones=(1, 2, 2), shade=(4, 3), close=3)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(1, 1, 1), flat=True)
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2, line="black")
    s.render()
    # the glossy pod: a long white specular down the lit flank, and a fleck
    s.paint(lit_stripe(c, None, 15, 2.6, 0.08, 0.36, inset=3.2, width=2.0, path=path), 3, only=[2])
    s.paint(lit_stripe(c, None, 15, 2.6, 0.45, 0.52, inset=3.0, width=1.6, path=path), 3, only=[2])
    rim(s, cap & (c.Y < 16), body=(1,))
    rim(s, lead & (c.X < 14))
    rim(s, rear & (c.Y < 12))
    fourconnect(s)
    img = finish(s)
    if mask:
        return img, tapered(c, path, [(0, 0), (0.62, 0), (0.66, 14), (1, 8)])
    return img


GREEN_POSES = [(0,), (0.8,), (1.6,), (-1.4,), (-0.6,)]
GREEN_ANIM = {"intro": [[0, 6], [1, 5], [2, 14], [3, 4], [4, 4], [3, 4], [4, 6], [0, 8]],
              "idle": [[0, 110], [1, 10]]}


def green_back():
    """From behind and above: the calyx star at the top right, the pod's
    back sweeping down out of frame, its tip curling up on the left."""
    s = Sprite(48, 48, pal3("green_chili"), crop_bottom=True)
    c = s.c
    path = spline([(31, 17), (27, 31), (23, 49)], 14)
    body = tapered(c, path, [(0, 22), (0.5, 26), (1, 27)])
    tpath = spline([(13, 49), (7.5, 42), (5, 33), (5.5, 26), (8.5, 22)], 14)
    tail = tapered(c, tpath, [(0, 9), (0.5, 6.5), (0.85, 3.5), (1, 2.2)])
    cal = c.ellipse(31, 17, 7, 4.5) | star(c, 31, 17.5, 5, 6.0, 14.0, sy=0.62, rot=-90 + 12)
    stem = c.curve([(31.5, 15), (33, 8), (38, 4), (43, 5)], 4.4, 3.2)
    lead = c.leaf((36, 22), (47, 36), 9, bend=1.6, tip=1.3)
    s.add(body, tones=(1, 2, 2), shade=(5, 3), close=3)
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(tail, tones=(1, 2, 2), shade=(2, 2))
    s.add(cal, tones=(1, 1, 1), flat=True)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.render()
    s.paint(lit_stripe(c, None, 22, 27, 0.25, 0.75, inset=4.5, width=2.2, path=path), 3, only=[2])
    rim(s, cal & (c.X < 31), body=(1,))
    rim(s, tail & (c.X < 8))
    fourconnect(s)
    return finish(s)


GREEN_ICON = [
    "......00........",
    "....00010000....",
    "...0311011110...",
    "..0311110110....",
    ".0311110100.....",
    "..0000110.......",
    ".02102320.......",
    "021102320....00.",
    "021022320...0220",
    "0110222220..0200",
    ".00.022222000220",
    "....022222222220",
    ".....0122222200.",
    "......00222200..",
    "........00000...",
    "................",
]


# --------------------------------------------------------------- red chili
def red_front(whip=0.0, ember=0, mask=False):
    """whip: the flame curl (+ = coiled tighter, - = lashed open);
    ember: 0 none, 1-3 the ember thrown off the tip, drifting up."""
    s = Sprite(56, 56, pal3("red_chili"))
    c = s.c
    w = whip
    tail = [(52.5, 41), (52 - w * 0.6, 31.5 + w * 0.4), (47.5 - w * 1.6, 26.5 + w * 1.0),
            (43.5 - w * 1.4, 29.5 + w * 2.2)]
    if w < 0:
        tail = [(52.5 - w * 0.3, 41), (53 - w * 0.6, 31.5 + w * 1.4), (51 - w * 0.6, 24.5 + w * 2.0),
                (48.5 - w * 0.3, 20 + w * 2.6)]
    path = spline([(17.5, 16), (19.5, 30), (27, 43), (37.5, 50), (47, 48.5)] + tail, 14)
    body = tapered(c, path, [(0, 19), (0.12, 21), (0.4, 16), (0.62, 11), (0.8, 7), (0.92, 4), (1, 2.4)])
    cap = calyx_cap(c, 16, 13, 21, 9.5, ang=-20)
    arm = c.leaf((12, 17), (3.5, 31), 6.5, bend=1.5, tip=1.4)
    stem = c.curve([(17, 7.5), (18.5, 3), (24, 1.2), (29, 3.0)], 4.0, 2.8)
    s.add(body, tones=(0, 2, 2), shade=(3, 2), close=3)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(1, 1, 1), flat=True)
    s.add(arm, tones=(1, 1, 1), flat=True)
    s.render()
    s.paint(lit_stripe(c, None, 21, 2.4, 0.05, 0.28, inset=4.2, width=2.2, path=path), 3, only=[2])
    s.paint(lit_stripe(c, None, 21, 2.4, 0.34, 0.40, inset=3.6, width=1.6, path=path), 3, only=[2])
    rim(s, cap & (c.Y < 13), body=(1,))
    rim(s, arm & (c.X < 8), body=(1,))
    # a crease where the shoulder dimples
    for x, y in [(27, 22), (28, 23), (28, 24), (29, 25)]:
        if s.t[y, x] == 2:
            s.px([(x, y)], 0)
    em = c.empty()
    if ember:
        ex, ey = [(0, 0), (41, 21), (37, 15), (33, 10)][ember]
        s.rows(ex - 1, ey - 1, [".0.", "030", ".0."])
        em = c.rect(ex - 2, ey - 2, ex + 3, ey + 3)
    fourconnect(s)
    img = finish(s)
    if mask:
        tm = tapered(c, path, [(0, 0), (0.6, 0), (0.64, 18), (1, 10)])
        return img, tm | em
    return img


RED_POSES = [(0, 0), (1.0, 0), (2.0, 0), (-1.6, 1), (-0.8, 2), (0, 3)]
RED_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 4], [4, 6], [5, 8], [0, 8]],
            "idle": [[0, 100], [1, 8]]}


def red_back():
    """From behind and above: the calyx star on the pod's shoulder (toward
    the foe), the body running out of frame, the flame tail hooking up left."""
    s = Sprite(48, 48, pal3("red_chili"), crop_bottom=True)
    c = s.c
    path = spline([(31, 17), (27, 31), (24, 49)], 14)
    body = tapered(c, path, [(0, 25), (0.5, 30), (1, 31)])
    tpath = spline([(12, 49), (6, 41), (3.5, 31), (4.5, 22), (8.5, 17)], 14)
    tail = tapered(c, tpath, [(0, 10), (0.5, 7), (0.85, 3.8), (1, 2.2)])
    cal = c.ellipse(31, 17, 8, 5) | star(c, 31, 17.5, 5, 7.0, 16.0, sy=0.62, rot=-90 + 12)
    stem = c.curve([(31.5, 15), (33, 8), (38, 3.5), (44, 4.5)], 4.8, 3.4)
    s.add(body, tones=(0, 2, 2), shade=(4, 3), close=3)
    s.add(tail, tones=(0, 2, 2), shade=(2, 2))
    s.add(cal, tones=(1, 1, 1), flat=True)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.render()
    s.paint(lit_stripe(c, None, 25, 30, 0.12, 0.6, inset=5.0, width=2.4, path=path), 3, only=[2])
    rim(s, cal & (c.X < 30), body=(1,))
    rim(s, tail & (c.X < 6))
    fourconnect(s)
    return finish(s)


RED_ICON = [
    "......00........",
    "...0001100......",
    "..03111110......",
    ".031111110......",
    ".0111111100.....",
    ".0000000...000..",
    ".02322220.02220.",
    ".02322220.00020.",
    "..0232220...0220",
    "..02222220..0220",
    "...02222220.0220",
    "....022222200220",
    ".....02222222200",
    "......0002220000",
    ".......0000000..",
    "................",
]


NOTES = {
    "chili_blossom": "WHITE: the chili flower's petals are genuinely white (shaded inside with the leaf green "
                     "and split by black). LUNGING. Intro: the flower draws back on its neck and holds, then dips at the foe with "
                     "the petals flared, recoils and settles; only the flower and the stem tip move. The petals "
                     "are the real white (index 3), each shaded with a crisp leaf-green crescent.",
    "green_chili": "LUNGING. Intro: the tail tip curls tight (wind-up, held), then flicks out straight and "
                   "quivers like a flame; the calyx, leaves and body hold. The line's calyx accent is the "
                   "index-1 green, lit by a white rim; the pod's gloss is a long white specular.",
    "red_chili": "COILED. Intro: the flame curl coils tighter, then lashes open and throws off a white ember "
                 "that drifts up and away. Two-hue plant without an exception: the calyx, stem and sepal claw "
                 "are the index-1 green, the pod is the index-2 red shaded with black.",
}
SPORT_NOTE = (" Sport: 'Black Pearl'. Capsicum annuum 'Black Pearl' (USDA, AAS winner 2006): near-black "
              "leaves, glossy black fruit, purple flowers (indexes 1-2 only).")


def make():
    out = {}
    for id_, ff, poses, bf, ic, anim in (
        ("chili_blossom", blossom_front, BLOSSOM_POSES, blossom_back, BLOSSOM_ICON, BLOSSOM_ANIM),
        ("green_chili", green_front, GREEN_POSES, green_back, GREEN_ICON, GREEN_ANIM),
        ("red_chili", red_front, RED_POSES, red_back, RED_ICON, RED_ANIM),
    ):
        fr = register(frames_from(lambda *p, ff=ff: ff(*p, mask=True), poses))
        i0 = icon(ic)
        out[id_] = dict(front=fr, back=bf(), icon=[i0, hop(i0)], anim=anim)
    return out


def build():
    errs = 0
    for id_, d in make().items():
        probs = write_species(id_, palette=[BLACK, *PAL[id_], WHITE], sport=[BLACK, *SPORT[id_], WHITE],
                              front=d["front"], back=[d["back"]], icon=d["icon"], anim=d["anim"],
                              moving=moving_boxes(d["front"]), notes=NOTES[id_] + SPORT_NOTE, tool=TOOL)
        errs += sum(1 for lvl, _ in probs if lvl == "error")
        intro_strip(id_)
    review_sheet(IDS, HERE.parent / "review" / "crystal_chili.png")
    return 1 if errs else 0


if __name__ == "__main__":
    if "--preview" in sys.argv:
        rows = [(i, d["front"], d["back"], d["icon"], [BLACK, *PAL[i], WHITE], [BLACK, *SPORT[i], WHITE])
                for i, d in make().items()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/chili_preview.png"))
    else:
        sys.exit(build())
