"""Crystal rule, lily line (Victoria amazonica): lily_seedpod -> lily_pad ->
giant_water_lily.

A redraw of tools/art/species_a/lily.py under the Crystal rule
(docs/CREATURES.md, docs/ROLLOUT.md). Motif: the SPINY ROSE BUD and the
UPTURNED RIM; accent: the rose/pink.

  lily_seedpod      index 1 maroon (shade, sepal backs)   index 2 rose (the bud)
  lily_pad          index 1 maroon (rim wall, bud, stalk) index 2 pad green
  giant_water_lily  index 1 pad green (tray, stalk, the crown's shade)
                    index 2 pink (the crown, the rim wall, the petals' shade)
  index 0 #181818 outline and spines; index 3 #f8f8f8 the sepals' pale
  insides, the white outer petals, rims and glints.

The pad is the flytrap's two-hue case: the maroon lives in the dark slot, so
the rim wall and the bud are flat index-1 fields framed by green and white.

Poses (docs/CREATURES.md) kept from the base art:
  lily_seedpod      REARING  a spiny bud leaning in, the lead sepal peeled up as an arm.
  lily_pad          REARING  the bud rearing on its stalk out of a tilted rimmed pad.
  giant_water_lily  LOOMING  the pink-crowned bloom leaning over its Victoria tray.

Entrance animations (only the named part moves):
  lily_seedpod      the sepals peel open wide like arms flung up, hold, then
                    clap back down and flex.
  lily_pad          the bud rears back on its stalk (wind-up), then STRIKES
                    down at the foe and bobs back.
  giant_water_lily  the bloom unfurls: the white arms lift high, the pink
                    crown spreads, then the arms sweep down into the display.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/build.py lily        write the base bundles
  $PY tools/art/crystal/lily.py --preview    scratch preview only
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species, review_sheet, intro_strip  # noqa: E402
from _arta_draw import (Sprite, bezier, blob, rot, rim, fourconnect, finish, grow, crescent,  # noqa: E402
                        frames_from, register, moving_boxes, icon, hop, preview)

TOOL = "tools/art/crystal/lily.py"
IDS = ["lily_seedpod", "lily_pad", "giant_water_lily"]

PAL = {  # (index 1, index 2)
    "lily_seedpod": ("#602040", "#c05068"),
    "lily_pad": ("#702848", "#70b040"),
    "giant_water_lily": ("#285838", "#e888b0"),
}
# 'Escarboucle' (docs/SPORTS.md): deep crimson flowers over darker, bronze-tinged pads.
# The giant_water_lily sport is the CRIMSON LILY met on Bloom Lake (Chapter 7).
SPORT = {
    "lily_seedpod": ("#401018", "#a82030"),
    "lily_pad": ("#681020", "#587838"),
    "giant_water_lily": ("#304028", "#c02838"),
}


def pal3(i):
    return [*PAL[i], WHITE]


def spikes(s, cx, cy, every=3, length=2, ymax=None, phase=0, region=None):
    """Black spines poking out of the silhouette at every n-th outline pixel."""
    t = s.t
    sil = t >= 0
    ys, xs = np.nonzero(t == 0)
    pts = sorted(zip(ys, xs), key=lambda p: np.arctan2(p[0] - cy, p[1] - cx))
    out = []
    for k, (y, x) in enumerate(pts):
        if (k + phase) % every or (ymax is not None and y > ymax):
            continue
        if region is not None and not region[y, x]:
            continue
        d = np.array([x - cx, y - cy], float)
        d /= np.linalg.norm(d) + 1e-9
        ray = []
        ok = True
        for r in range(1, length + 1):
            xx, yy = int(round(x + d[0] * r)), int(round(y + d[1] * r))
            if not (0 <= xx < s.w and 0 <= yy < s.h) or sil[yy, xx]:
                ok = False
                break
            ray.append((xx, yy))
        if ok and ray:
            out += ray
    s.px(out, 0)


def ribs(s, ctrls, tone=1, over=(2, 3), protect=False):
    for ctrl in ctrls:
        for x, y in bezier(ctrl, 60):
            x, y = int(x), int(y)
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
                s.px([(x, y)], tone, protect=protect)


# --------------------------------------------------------------- seedpod
def pod_front(lift=0.0, spread=0.0, mask=False):
    """lift: px the sepal arms rise (both); spread: degrees they swing open."""
    s = Sprite(56, 56, pal3("lily_seedpod"))
    c = s.c
    tilt = -22
    pv = (30, 50)

    def R(*pts):
        return rot(pts, tilt, pv)

    bud = blob(c, R((29, 14), (24.5, 20), (21, 29), (20.5, 39), (24, 47), (30, 50), (36, 47.5),
                    (39.5, 39), (38.5, 28), (34, 20)))
    lb, = R((24, 41))
    rb, = R((36, 40))
    lt, = rot([(8, 30 - lift)], spread, lb)
    rt, = rot([(51, 33 - lift * 0.6)], -spread * 0.8, rb)
    lead = c.leaf(lb, lt, 10, bend=-2.5, tip=1.5)
    rear = c.leaf(rb, rt, 8, bend=2.0, tip=1.5)
    footL = c.leaf((31, 46), (13, 55.4), 9, bend=1.6, tip=1.5, base=0.35)
    footR = c.leaf((33, 46), (47, 55.4), 8.5, bend=-1.6, tip=1.5, base=0.35)
    s.add(rear, tones=(1, 1, 1), flat=True)
    s.add(footR, tones=(1, 1, 1), flat=True)
    s.add(footL, tones=(1, 2, 2), shade=(2, 2))
    s.add(bud, tones=(1, 2, 2), shade=(5, 3), cast=2)
    s.add(lead, tones=(2, 3, 3), shade=(3, 3), line="black")
    s.render()
    ribs(s, [R((28, 16), (23, 30), (25, 47)), R((30, 16), (30, 32), (31, 49)), R((32, 17), (37, 31), (36, 46))])
    # the bud's specular: a white crescent on the lit shoulder
    s.paint(crescent(bud, 2, 2, (c.Y < 34) & (c.Y > 16)), 3, only=(2,))
    rim(s, rear & (c.X + c.Y < rb[0] + rb[1] + 6), body=(1,))
    rim(s, footL & (c.X < 26))
    spikes(s, *R((30, 34))[0], every=3, length=2, ymax=46)
    fourconnect(s)
    img = finish(s)
    if mask:
        return img, lead | rear
    return img


POD_POSES = [  # (lift, spread)
    (0, 0),
    (3, 8),       # 1 peeling open
    (6, 16),      # 2 arms flung up and wide (held)
    (-1, -4),     # 3 clap: snapped down past rest
    (2, 4),       # 4 flex
]
POD_ANIM = {"intro": [[0, 6], [1, 5], [2, 16], [1, 3], [3, 6], [4, 6], [3, 4], [0, 8]],
            "idle": [[0, 120], [4, 10]]}


def pod_back():
    """From behind and above: the spiny dome fills the frame leaning to the
    top-right, its sepals peeling back at the waterline."""
    s = Sprite(48, 48, pal3("lily_seedpod"), crop_bottom=True)
    c = s.c
    tilt = 16

    def R(*pts):
        return rot(pts, tilt, (24, 48))

    bud = blob(c, R((25, 6), (16, 13), (9, 26), (9, 40), (12, 49), (38, 49), (41, 38), (39, 24), (33, 11)))
    sepL = c.leaf((14, 42), (0, 46), 10, bend=1.0, tip=1.6)
    sepR = c.leaf((36, 40), (48, 30), 10, bend=-1.5, tip=1.6)
    s.add(sepL, tones=(1, 1, 1), flat=True)
    s.add(bud, tones=(1, 2, 2), shade=(6, 3), cast=2)
    s.add(sepR, tones=(2, 3, 3), shade=(2, 2), line="black")
    s.render()
    ribs(s, [R((25, 8), (13, 26), (13, 47)), R((25, 8), (22, 28), (21, 47)), R((25, 8), (31, 28), (31, 47))])
    s.paint(crescent(bud, 2, 2, (c.Y < 26)), 3, only=(2,))
    rim(s, sepL & (c.Y < 44), body=(1,))
    spikes(s, *R((25, 30))[0], every=3, length=2, ymax=38)
    fourconnect(s)
    return finish(s)


POD_ICON = [
    "................",
    "...0.....0......",
    "....0...00......",
    ".....000330.....",
    ".....03222200...",
    "....032212210...",
    "....032212210...",
    "..000322211100..",
    ".03330222110010.",
    ".03333022210110.",
    "..0333022110110.",
    "...00021110000..",
    "....00111110....",
    "...0220000110...",
    "...02220.01110..",
    "....000...000...",
]


# --------------------------------------------------------------- pad
def pad_body(c, cx, cy, rx, ry, wall, tilt, notch_x):
    """The rimmed pad in 3/4: top face, outer rim wall, a drainage notch."""
    top = c.ellipse(cx, cy, rx, ry, tilt)
    outer = c.ellipse(cx, cy + wall, rx + 0.6, ry + 0.4, tilt) | top
    notch = c.poly([(notch_x - 2.2, cy - 3), (notch_x + 2.2, cy - 3), (notch_x + 1.0, cy + ry + wall + 3),
                    (notch_x - 1.0, cy + ry + wall + 3)])
    return top, outer & ~(notch & (c.Y > cy + ry * 0.4))


def pad_front(rear=0.0, mask=False):
    """rear: + = the bud reared back and up, - = struck down at the foe."""
    s = Sprite(56, 56, pal3("lily_pad"))
    c = s.c
    top, outer = pad_body(c, 29, 46.5, 26, 6.6, 3.2, -5, 16)
    inner = c.ellipse(29, 46.2, 23.5, 5.0, -5)
    # the stalk pivots at its base; the bud rides its tip
    base = (30, 46)
    ang = rear * 9.0
    p2, p3 = rot([(29, 29), (22, 24)], ang, base)
    p1, = rot([(33, 38)], ang * 0.5, base)
    stalk = c.curve([base, p1, p2, p3], 4.2, 3.4)
    (bx, by), = rot([(18, 19)], ang, base)
    a = np.radians(-rear * 6)
    d0 = np.array([6, 10.0])
    d1 = np.array([-7, -10.0])
    R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    d0, d1 = R @ d0, R @ d1
    bud = c.leaf((bx + d0[0], by + d0[1]), (bx + d1[0], by + d1[1]), 15, power=0.65, tip=2.4, base=0.45)
    furl = c.leaf((40, 44), (46, 21), 10.5, bend=2.5, power=0.7, tip=1.4)
    s.add(outer, tones=(1, 1, 1), flat=True)
    s.add(top, tones=(1, 2, 2), shade=(0, -1), line="black")
    s.add(furl, tones=(1, 2, 2), shade=(3, 2), line="black")
    s.add(stalk, tones=(1, 1, 1), flat=True, line="black")
    s.add(bud, tones=(1, 1, 1), flat=True, line="black")
    s.render()
    lip = top & ~inner & (s.owner == 1)
    s.paint(lip & (c.Y < 45), 3, only=[2])
    s.paint(lip & (c.Y >= 46), 1, only=[2, 3])
    for x in range(5, 54, 3):
        col = [y for y in range(47, 56) if s.t[y, x] == 1 and s.owner[y, x] == 0]
        if len(col) >= 2:
            s.px([(x, col[0])], 0)
    # veins radiating from the stalk across the face: pale, broken short of the rim
    for k in range(9):
        aa = np.radians(200 - 25 * k)
        for r in np.arange(6, 20, 0.4):
            x, y = int(30 + np.cos(aa) * r), int(46.5 - np.sin(aa) * r * 0.24)
            if 0 <= x < 56 and s.owner[y, x] == 1 and s.t[y, x] == 2:
                s.px([(x, y)], 3 if k % 2 == 0 else 1, protect=False)
    rim(s, furl & (c.X < 44))
    ribs(s, [[(41, 42), (44, 32), (45, 24)]], tone=1, over=(2,))
    # the bud: white seams down its lit side, black spines
    ribs(s, [[(bx + d0[0] * 0.7, by + d0[1] * 0.8), (bx - 3, by + 1), (bx + d1[0] * 0.85, by + d1[1] * 0.9)]],
         tone=3, over=(1,), protect=True)
    rim(s, bud & (c.X + c.Y < bx + by + 2), body=(1,))
    spikes(s, bx, by, every=4, length=1, region=(c.Y < by + 7) & (c.X < bx + 9))
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, stalk | bud | c.circle(bx, by, 13) & (c.Y < 44)
    return img


PAD_POSES = [(0,), (1.0,), (2.0,), (-1.4,), (-0.6,)]
PAD_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 5], [4, 5], [3, 4], [4, 6], [0, 8]],
            "idle": [[0, 110], [1, 10]]}


def pad_back():
    """From behind and above: the pad's whole face and the inner wall of the
    far rim; the bud rears toward the top-right."""
    s = Sprite(48, 48, pal3("lily_pad"), crop_bottom=True)
    c = s.c
    top, outer = pad_body(c, 24, 37, 25, 12.5, 2.6, 6, 40)
    inner = c.ellipse(24, 37.5, 22.0, 10.6, 6)
    stalk = c.curve([(22, 38), (24, 29), (30, 21), (34, 18)], 4.6, 3.8)
    bud = c.leaf((30, 22), (40, 5), 14, power=0.75, tip=1.6, base=0.6)
    furl = c.leaf((9, 40), (5, 18), 10, bend=-2.2, power=0.7, tip=1.4)
    s.add(outer, tones=(1, 1, 1), flat=True)
    s.add(top, tones=(1, 2, 2), shade=(0, -1), line="black")
    s.add(furl, tones=(1, 2, 2), shade=(3, 2), line="black")
    s.add(stalk, tones=(1, 1, 1), flat=True, line="black")
    s.add(bud, tones=(1, 1, 1), flat=True, line="black")
    s.render()
    lip = top & ~inner & (s.owner == 1)
    s.paint(lip & (c.Y < 34), 3, only=[2])
    s.paint(lip & (c.Y >= 36), 1, only=[2, 3])
    for k in range(13):
        aa = np.radians(200 - 18.5 * k)
        for r in np.arange(7, 20, 0.4):
            x, y = int(24 + np.cos(aa) * r), int(37.5 - np.sin(aa) * r * 0.5)
            if 0 <= x < 48 and 0 <= y < 48 and s.owner[y, x] == 1 and s.t[y, x] == 2:
                s.px([(x, y)], 3 if k % 2 == 0 else 1, protect=False)
    ribs(s, [[(31, 21), (33, 12), (39, 6)]], tone=3, over=(1,), protect=True)
    rim(s, furl & (c.Y < 30))
    rim(s, bud & (c.X < 34), body=(1,))
    spikes(s, 35, 14, every=4, length=1, region=(c.Y < 22))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


PAD_ICON = [
    "................",
    "...00...........",
    "..0330..........",
    "..03110.........",
    "..031110.....0..",
    "..0131110...030.",
    "...0111100.0230.",
    "....001110.0220.",
    "......0110.0220.",
    ".......010.0210.",
    "...0000010000200",
    "..03333310333330",
    ".022212221222220",
    "0111111111111110",
    ".00000000000000.",
    "................",
]


# --------------------------------------------------------------- giant water lily
def lily_front(arms=0.0, crown=0.0, mask=False):
    """arms: degrees the reflexed white arm petals lift (+ = raised);
    crown: the pink crown's spread (px)."""
    s = Sprite(56, 56, pal3("giant_water_lily"))
    c = s.c
    rimm = c.ellipse(30, 45.5, 26.5, 6.2, -5)
    wall = rimm | c.ellipse(30, 49.5, 26.5, 6.0, -5)
    top = c.ellipse(30.5, 46.6, 23.5, 4.4, -5)
    s.add(wall, tones=(2, 2, 2), flat=True)
    s.add(top, tones=(1, 1, 1), flat=True, line="black")
    stalk = c.curve([(33, 46), (35.5, 38), (31, 30), (25, 25)], 6.5, 5)
    s.add(stalk, tones=(1, 1, 1), flat=True)
    cx, cy = 21, 23
    tilt = -24
    flower = c.empty()

    def petal(a, L, w, sy=1.0, tones=(2, 3, 3), base=None, line="black", tip=1.7, shade=(3, 3)):
        nonlocal flower
        r = np.radians(a + tilt)
        b = base or (cx, cy)
        p1 = (b[0] + np.cos(r) * L, b[1] + np.sin(r) * L * sy)
        pm = c.leaf(b, p1, w, power=0.62, tip=tip)
        flower |= pm
        s.add(pm, tones=tones, shade=shade, line=line)
        return pm

    backs = [petal(a, L, 14, tones=(2, 3, 3), shade=(3, 3))
             for a, L in ((-90, 23), (-60, 23), (-120, 22), (-30, 22), (-150, 21))]
    lead = petal(172 - arms, 27, 13, sy=0.55, tones=(2, 3, 3), shade=(2, 3))
    rear = petal(8 + arms, 24, 12, sy=0.55, tones=(2, 3, 3), shade=(2, 3))
    petal(140 - arms * 0.5, 21, 12, sy=0.6, tones=(2, 3, 3), shade=(3, 3))
    petal(40 + arms * 0.5, 18, 11, sy=0.6, tones=(2, 3, 3), shade=(3, 3))
    cm = c.empty()
    for a, L in ((-90, 17), (-65, 16), (-115, 16), (-42, 14), (-138, 14)):
        da = (a + 90) * crown * 0.06
        cm |= petal(a + da, L + crown, 10, tones=(1, 2, 2), base=(cx, cy + 1), line="black", tip=2.2,
                    shade=(2, 2))
    s.render()
    for x in range(5, 56, 3):
        col = [y for y in range(46, 56) if s.t[y, x] == 2 and s.owner[y, x] == 0]
        col = [y for y in col if y > 47]
        if len(col) >= 3:
            s.px([(x, col[0]), (x, col[1])], 1)
    rim(s, cm & (c.X + c.Y < cx + cy - 2))
    rim(s, wall & (c.Y < 45) & (c.X < 30))
    s.px([(int(cx) - 1, int(cy) - 2), (int(cx) - 1, int(cy) - 1)], 3)
    fourconnect(s)
    img = finish(s)
    if mask:
        return img, flower
    return img


LILY_POSES = [(0, 0), (12, 1.0), (24, 2.0), (-8, 0.5), (4, 0.0)]
LILY_ANIM = {"intro": [[0, 6], [1, 6], [2, 18], [1, 4], [3, 8], [4, 6], [0, 8]],
             "idle": [[0, 140], [4, 10]]}


def lily_back():
    """From behind and above: the outer petals' backs splayed over the pad,
    the pink crown opening at the centre, leaning to the top-right."""
    s = Sprite(48, 48, pal3("giant_water_lily"), crop_bottom=True)
    c = s.c
    cx, cy = 28.5, 24
    rimm = c.ellipse(22, 38.5, 25.5, 10.5, 5)
    wall = rimm | c.ellipse(22, 42, 25.5, 10, 5)
    top = c.ellipse(22.5, 40, 22.5, 8.4, 5)
    s.add(wall, tones=(2, 2, 2), flat=True)
    s.add(top, tones=(1, 1, 1), flat=True, line="black")

    def petal(a, L, w, sy=1.0, tones=(2, 3, 3), base=(cx, cy), line="black", shade=(4, 4)):
        r = np.radians(a + 15)
        p1 = (base[0] + np.cos(r) * L, base[1] + np.sin(r) * L * sy)
        pm = c.leaf(base, p1, w, power=0.62, tip=1.7)
        s.add(pm, tones=tones, shade=shade, line=line)
        return pm

    for a in (-90, -55, -125, -20, -160):
        petal(a, 22, 13, sy=0.85, shade=(3, 3))
    cm = c.empty()
    for a in (-90, -50, -130, -10, -170):
        cm |= petal(a + 20, 13, 9, sy=0.75, tones=(1, 2, 2), base=(cx, cy - 1), shade=(2, 2))
    for a in (15, 165, 50, 130, 90):
        petal(a, 23, 13, sy=0.6, shade=(3, 3))
    s.render()
    rim(s, cm & (c.X + c.Y < cx + cy - 4))
    fourconnect(s)
    return finish(s)


LILY_ICON = [
    "....0..0........",
    "...030030.......",
    "..0333033300....",
    ".03320222320....",
    ".0320211122300..",
    "0332021122320...",
    "03322022232230..",
    ".03322222222000.",
    "..0002222200.0..",
    "......00110.....",
    "...0000000110000",
    "..02222222222220",
    "0211111111111120",
    "0222222222222220",
    ".00000000000000.",
    "................",
]


NOTES = {
    "lily_seedpod": "REARING. Intro: the sepals peel open and fling up like arms, hold, then clap down past "
                    "rest and flex; the spiny bud and the feet hold. White is the lead sepal's pale inside "
                    "and the bud's specular crescent; the spines are black.",
    "lily_pad": "REARING. Intro: the bud rears back on its stalk (wind-up, held), strikes down at the foe and "
                "bobs back; the pad and the furled leaf hold. Two-hue case: the maroon (rim wall, stalk, "
                "bud, veins) is index 1 and the pad green index 2, the rim's lit lip white.",
    "giant_water_lily": "WHITE: Victoria's outer petals are genuinely white (each shaded with a pink "
                        "crescent, split by black). LOOMING. Intro: the bloom unfurls: the reflexed white arm petals lift high while the "
                        "pink crown spreads, hold, then the arms sweep down into the display; the tray and "
                        "stalk hold. The white petals are "
                        "shaded with crisp pink crescents round the pink crown.",
}
SPORT_NOTE = (" Sport: 'Escarboucle'. Nymphaea 'Escarboucle' (Latour-Marliac, 1909): "
              "deep crimson flowers over darker, bronze-tinged pads (indexes 1-2 only). "
              "The giant sport is the CRIMSON LILY of Bloom Lake.")


def make():
    out = {}
    for id_, ff, poses, bf, ic, anim in (
        ("lily_seedpod", pod_front, POD_POSES, pod_back, POD_ICON, POD_ANIM),
        ("lily_pad", pad_front, PAD_POSES, pad_back, PAD_ICON, PAD_ANIM),
        ("giant_water_lily", lily_front, LILY_POSES, lily_back, LILY_ICON, LILY_ANIM),
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
    review_sheet(IDS, HERE.parent / "review" / "crystal_lily.png")
    return 1 if errs else 0


if __name__ == "__main__":
    if "--preview" in sys.argv:
        rows = [(i, d["front"], d["back"], d["icon"], [BLACK, *PAL[i], WHITE], [BLACK, *SPORT[i], WHITE])
                for i, d in make().items()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/lily_preview.png"))
    else:
        sys.exit(build())
