"""Crystal rule, dandelion line: dandelion_bud -> dandelion -> dandelion_clock.

A redraw of tools/art/species_a/dandelion.py under the Crystal rule
(docs/CREATURES.md, docs/ROLLOUT.md). Dent-de-lion: the lion's-tooth leaf
(saw teeth hooked back toward the base) is worn as clawed ARMS and FEET, and
the head is a MANE: a cub's yellow cowlick, a gold lion, a white old lion.

  dandelion_bud    index 1 leaf green (the whole plant)  index 2 dandelion yellow
  dandelion        index 1 deep green (leaves, bracts, the mane's shade)
                   index 2 dandelion gold (the mane)
  dandelion_clock  index 1 sage green (leaves, stem)     index 2 seed lavender
  index 0 #181818 outline, leaf shade, midribs; index 3 #f8f8f8 the clock's
  pappus, rims, the mane's lit florets, glints.

The bud is a two-hue plant (green, with yellow breaking through): the green
takes the dark slot, as the flytrap's red did, and the yellow shows in the
cowlick and in the seams between the bracts, where real buds split.

Poses (docs/CREATURES.md) kept from the base art:
  dandelion_bud    LUNGING  a fat bud leaning hard at the foe, claws up in guard.
  dandelion        LUNGING  the mane turned 3/4 at the foe, a forward swipe.
  dandelion_clock  BOBBING  the seed-globe swollen huge, seeds lifting off.

Entrance animations (only the head moves):
  dandelion_bud    the bud swells, the cowlick BURSTS open, then it shivers.
  dandelion        the mane fluffs up and SHAKES, left-right, then settles.
  dandelion_clock  the globe draws in a breath, then PUFFS: a volley of seeds
                   launches at the foe and drifts away.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/build.py dandelion        write the base bundles
  $PY tools/art/crystal/dandelion.py --preview    scratch preview only
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _arta_draw import (Sprite, bezier, blob, star, saw_leaf, rim, fourconnect, finish, grow,  # noqa: E402
                        crescent, contact, frames_from, register, moving_boxes, hop, preview,
                        pose, m, mi, ms)

TOOL = "tools/art/crystal/dandelion.py"
IDS = ["dandelion_bud", "dandelion", "dandelion_clock"]

PAL = {  # (index 1, index 2)
    "dandelion_bud": ("#388030", "#f8d028"),
    "dandelion": ("#406020", "#f0b818"),
    "dandelion_clock": ("#386038", "#a8b0d0"),
}
# Taraxacum pseudoroseum, the pink dandelion (docs/SPORTS.md): rose florets.
SPORT = {
    "dandelion_bud": ("#387838", "#f0a0c0"),
    "dandelion": ("#405028", "#e888b0"),
    "dandelion_clock": ("#305838", "#d098b8"),
}


def pal3(i):
    return [*PAL[i], WHITE]


def claw(s, c, p0, p1, w, lobes=3, bend=0.0, tones=(0, 1, 1), shade=(2, 2), line="black", depth=0.62):
    """A lion's-tooth leaf used as an arm or foot: teeth hook back to the base."""
    mk = saw_leaf(c, p0, p1, w, lobes=lobes, bend=bend, depth=depth)
    if shade is None:
        s.add(mk, tones=tones, flat=True, line=line)
    else:
        s.add(mk, tones=tones, shade=shade, close=2, line=line)
    return mk


def midrib(s, p0, p1, tone=0, over=(1,), t0=0.12, t1=0.7):
    for t in np.linspace(t0, t1, 40):
        x, y = int(p0[0] + (p1[0] - p0[0]) * t), int(p0[1] + (p1[1] - p0[1]) * t)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def mane(c, cx, cy, n, r_in, r_out, sx=1.0, sy=1.0, rot=0.0, swirl=0.0, back=0.0, sweep=0.0):
    """A swept-back mane: a zigzag disc whose points lag (swirl) and grow
    toward `back` (sweep)."""
    pts = []
    for i in range(2 * n):
        a = np.radians(rot) + np.pi * i / n
        if i % 2 == 0:
            g = 1 + sweep * np.cos(a - back)
            r = r_in + (r_out - r_in) * g
            a2 = a + swirl
        else:
            r, a2 = r_in, a
        pts.append((cx + np.cos(a2) * r * sx, cy + np.sin(a2) * r * sy))
    return c.poly(pts)


def seams(s, ctrls, from_tone=(1,), to=2):
    for ctrl in ctrls:
        for x, y in bezier(ctrl, 30):
            x, y = int(x), int(y)
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in from_tone:
                s.px([(x, y)], to)


def rays(s, cx, cy, n, r0, r1, rot=0.0, lit=3, dark=2, over=(2,), skip=0.25, n_pts=6):
    """Radial dashes inside a head (florets, pappus): lit on the top-left
    half, dark on the bottom-right, none across the terminator."""
    for k in range(n):
        a = np.radians(rot) + 2 * np.pi * k / n
        u = np.cos(a - np.radians(225))
        if abs(u) < skip:
            continue
        tone = lit if u > 0 else dark
        for r in np.linspace(r0, r1, n_pts):
            x, y = int(round(cx + np.cos(a) * r)), int(round(cy + np.sin(a) * r))
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
                s.px([(x, y)], tone)


# --------------------------------------------------------------- bud
def bud_front(swell=0.0, burst=0.0, mask=False):
    """swell: the bud grows (px); burst: the cowlick flares open (0..1+)."""
    s = Sprite(56, 56, pal3("dandelion_bud"))
    c = s.c
    claw(s, c, (31, 54), (48, 51.5), 9, lobes=2, bend=-1.0, shade=None)
    rear = claw(s, c, (30, 46), (49, 29), 12, lobes=3, bend=-2.0)
    stem = c.curve([(30, 55), (31, 50), (27, 44)], 5.4, 4.6)
    s.add(stem, tones=(1, 1, 1), flat=True)
    claw(s, c, (29, 54), (9, 54.6), 10, lobes=2, bend=1.0)
    k = 1 + swell / 13.0
    bx, by = 21 - swell * 0.4, 33 - swell * 0.6
    bud = (c.ellipse(bx, by, 13.0 * k, 9.5 * k, 55)
           | c.leaf((bx - 3, by - 5), (bx - 10 - swell * 0.5, by - 17 - swell * 0.6), 9 * k, power=0.6, tip=1.2))
    s.add(bud, tones=(0, 1, 1), shade=(3, 2), close=2, line="black")
    br = (c.leaf((26, 42), (33, 47), 5.0, bend=-1.4, tip=1.6) |
          c.leaf((21, 44), (17, 49), 4.6, bend=1.4, tip=1.6) |
          c.leaf((24, 44), (25, 50), 4.4, tip=1.6))
    s.add(br, tones=(0, 1, 1), shade=(1, 1), line="black")
    tx, ty = bx - 9 - swell * 0.5, by - 16 - swell * 0.6
    f = burst
    tuft = (c.leaf((tx, ty + 1), (tx - 6 - f * 3, ty - 5 + f * 1.5), 5.0 + f, bend=1.2, tip=1.4) |
            c.leaf((tx + 1, ty), (tx - 1 - f, ty - 7 - f * 2.5), 4.8 + f, bend=-1.0, tip=1.4) |
            c.leaf((tx + 2, ty + 1), (tx + 6 + f * 3, ty - 5 - f * 1.5), 4.2 + f, bend=-1.6, tip=1.4) |
            c.ellipse(tx + 0.5, ty, 3.4 + f * 0.6, 2.6 + f * 0.4, -40))
    s.add(tuft, tones=(2, 2, 2), flat=True, line="black")
    lead = claw(s, c, (27, 47), (4, 40), 12, lobes=3, bend=2.0)
    s.render()
    # yellow breaking through the bracts' seams, white rims on the lit side
    seams(s, [[(bx - 8, by - 2), (bx - 9, by - 9), (tx + 1, ty + 2)],
              [(bx, by + 7), (bx - 2, by - 3), (tx + 3, ty + 3)]])
    rim(s, bud & (c.X + c.Y < bx + by - 4), body=(1,))
    rim(s, tuft & (c.X + c.Y < tx + ty), body=(2,))
    rim(s, lead & (c.Y < 44) & (c.X < 16), body=(1,))
    contact(s, 12, 18)
    contact(s, 34, 40)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, bud | tuft
    return img


BUD_POSES = [(0, 0), (1.0, 0.3), (1.8, 0.6), (1.2, 1.6), (0.6, 1.0)]
BUD_ANIM = {"intro": [[0, 6], [1, 6], [2, 12], [3, 6], [4, 4], [3, 4], [4, 4], [0, 8]],
            "idle": [[0, 120], [4, 8]]}


def bud_back():
    """From behind and above: the bud's seams spiralling to the yellow
    cowlick, both claws raised either side, leaning toward the foe (right)."""
    s = Sprite(48, 48, pal3("dandelion_bud"), crop_bottom=True)
    c = s.c
    pose(s, 1.4, 0, 26, 8)
    left = claw(s, c, (21, 36), (2, 22), 12, lobes=3, bend=2.0)
    stem = c.curve([(22, 48), (21, 38), (24, 28)], 6.0, 4.6)
    s.add(stem, tones=(1, 1, 1), flat=True)
    bud = blob(c, [(30, 4), (25, 8), (21, 16), (22, 25), (29, 28), (35, 22), (35, 12), (33, 6)])
    s.add(bud, tones=(0, 1, 1), shade=(3, 2), close=2, line="black")
    br = (c.leaf((25, 25), (17, 31), 5.0, bend=1.4, tip=1.6) | c.leaf((31, 26), (37, 32), 5.0, bend=-1.4, tip=1.6))
    s.add(br, tones=(0, 1, 1), shade=(1, 1))
    tuft = c.leaf((31, 6), (35, -2), 5.0, bend=-1.2, tip=1.4) | c.leaf((30, 6), (27, -1), 4.4, bend=1.2, tip=1.4)
    s.add(tuft, tones=(2, 2, 2), flat=True)
    right = claw(s, c, (24, 38), (47, 26), 13, lobes=3, bend=-2.0)
    s.render()
    seams(s, [[m(s, *q) for q in ((24, 24), (23, 16), (28, 8))], [m(s, *q) for q in ((29, 27), (31, 18), (31, 9))]])
    rim(s, bud & (c.X < 26), body=(1,))
    rim(s, left & (c.Y < 30), body=(1,))
    rim(s, right & (c.Y < 30), body=(1,))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- lion
def lion_front(fluff=0.0, shake=0.0, mask=False):
    """fluff: the mane puffs out (px); shake: degrees the mane twists."""
    s = Sprite(56, 56, pal3("dandelion"))
    c = s.c
    claw(s, c, (32, 54), (52, 51), 10, lobes=2, bend=-1.0, shade=None)
    claw(s, c, (30, 54), (7, 54.6), 11, lobes=2, bend=1.0, shade=None)
    pose(s, 1.0, 13, 31, 55)
    hx, hy = 21, 22
    back = np.radians(-40)
    rear = claw(s, c, (34, 42), (53, 30), 12, lobes=3, bend=-2.5, tones=(1, 1, 1), shade=None)
    stem = c.curve([(31, 28), (35, 38), (34, 47), (30, 56)], 5.6, 4.6)
    s.add(stem, tones=(1, 1, 1), flat=True)
    cup = (c.ellipse(31, 24, 5.5, 6.5, 20) | c.leaf((32, 27), (41, 33), 4.6, bend=-1.5, tip=1.6) |
           c.leaf((33, 24), (42, 23), 4.4, bend=1.2, tip=1.6) |
           c.leaf((30, 29), (31, 37), 4.4, bend=-1.0, tip=1.6))
    s.add(cup, tones=(1, 1, 1), flat=True)
    rr = np.radians(shake)
    head = mane(c, hx, hy, 15, 13.5 + fluff * 0.3, 20.0 + fluff, sx=0.82, sy=0.95, rot=-4 + shake,
                swirl=0.24 + rr * 0.6, back=back, sweep=0.45)
    hid = len(s.parts)
    s.add(head, tones=(1, 2, 2), flat=True, line="black")
    lead = claw(s, c, (32, 45), (6, 35), 14, lobes=3, bend=2.5, tones=(1, 1, 1), shade=None)
    s.render()
    head_m = s.owner == hid
    lit = mane(c, hx - 3, hy - 3, 13, 13.0 + fluff * 0.3, 17.5 + fluff, sx=0.82, sy=0.95, rot=10 + shake,
               swirl=0.2 + rr * 0.6)
    s.paint(head_m & ~lit & (s.t == 2), 1)
    hi = mane(c, hx - 6, hy - 7, 9, 3.0, 5.5 + fluff * 0.3, sx=0.82, sy=0.95, rot=-5 + shake, swirl=0.2)
    s.paint(head_m & hi & (s.t == 2), 3)
    rim(s, head_m & (c.X + c.Y < hx + hy - 6), body=(2,))
    rim(s, lead & (c.Y < 40) & (c.X < 18), body=(1,))
    contact(s, 9, 16)
    contact(s, 40, 47)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, head
    return img


LION_POSES = [(0, 0), (1.5, 0), (2.5, -7), (2.5, 7), (1.0, -3)]
LION_ANIM = {"intro": [[0, 6], [1, 6], [2, 6], [3, 6], [2, 5], [3, 5], [4, 8], [0, 10]],
             "idle": [[0, 120], [1, 10]]}


def lion_back():
    """The back of the head: the mane round a green star of bracts, claws
    spread wide below."""
    s = Sprite(48, 48, pal3("dandelion"), crop_bottom=True)
    c = s.c
    pose(s, 1.25, 0, 25, 30)
    hx, hy = 25, 19
    claw(s, c, (22, 38), (0, 27), 14, lobes=3, bend=2.0, tones=(1, 1, 1), shade=None)
    stem = c.curve([(25, 26), (23, 38), (24, 48)], 6.0, 5.0)
    s.add(stem, tones=(1, 1, 1), flat=True)
    outer = mane(c, hx, hy, 18, 13.0, 21.0, sx=1.0, sy=0.82, rot=-6, swirl=-0.10, back=np.radians(200), sweep=0.25)
    s.add(outer, tones=(1, 2, 2), shade=(1, 3), close=2)
    inner = mane(c, hx, hy, 14, 10.0, 15.0, sx=1.0, sy=0.82, rot=6, swirl=-0.1)
    s.add(inner, tones=(1, 2, 2), shade=(1, 1), line="black")
    for k in range(9):
        a = np.radians(90 + 40 * k)
        p1 = (hx + np.cos(a) * 11.0, hy + 1 + np.sin(a) * 9.0)
        s.add(c.leaf((hx, hy + 1), p1, 4.2, power=0.7, tip=1.8), tones=(1, 1, 1), flat=True, line="black")
    s.add(c.ellipse(hx, hy + 1, 4.5, 3.8), tones=(1, 1, 1), flat=True, line="black")
    rc = claw(s, c, (27, 40), (48, 30), 14, lobes=3, bend=-2.0, tones=(1, 1, 1), shade=None)
    s.render()
    s.paint(crescent(inner, 1, 2, c.X + c.Y < 42), 3, only=(2,))
    rim(s, rc & (c.Y < 33), body=(1,))
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- clock
SEED = ["..000..", ".03330.", "0333330", ".00000.", "...0...", "...0...", "..010..", "..010..", "...0..."]
SMALL = [".000.", "03330", ".000.", "..0..", ".010.", ".010.", "..0.."]


def clock_front(breath=0.0, puff=0, mask=False):
    """breath: the globe swells (px); puff: 0 rest, 1-3 a volley of seeds
    flying off the blown flank toward the foe."""
    s = Sprite(56, 56, pal3("dandelion_clock"))
    c = s.c
    gx, gy, R = 27, 23, 16.5 + breath
    claw(s, c, (33, 54), (54, 50), 10, lobes=2, bend=-1.0, tones=(1, 1, 1), shade=None)
    claw(s, c, (31, 54), (8, 54.6), 11, lobes=2, bend=1.0, tones=(1, 1, 1), shade=None)
    pose(s, 1.0, 8, 32, 55)
    rear = claw(s, c, (33, 43), (54, 29), 14, lobes=3, bend=-2.5, tones=(1, 1, 1), shade=None)
    stem = c.curve([(27, 37), (33, 44), (33, 50), (31, 56)], 5.6, 4.8)
    s.add(stem, tones=(1, 1, 1), flat=True)
    hole = 6.0 + (1.5 if puff else 0)
    globe = star(c, gx, gy, 26, R, R + 3.0, rot=4)
    globe &= ~c.ellipse(gx - R - 1, gy - 7, hole, hole - 1)
    s.add(globe, tones=(2, 2, 2), flat=True)
    lead = claw(s, c, (32, 45), (6, 34), 14, lobes=3, bend=2.5, tones=(1, 1, 1), shade=None)
    s.render()
    gm = s.owner == 4
    # the white puff: the lit half of the globe, pappus rays across the rest
    gcx, gcy = m(s, gx - 5, gy - 5)
    lit = c.ellipse(gcx, gcy, R * 0.95, R * 0.88)
    s.paint(gm & lit & (s.t == 2), 3)
    gcx, gcy = m(s, gx + 1, gy + 1)
    rays(s, gcx, gcy, 18, 7.0, 17.0 + breath, lit=2, dark=3, over=(2, 3), rot=5, skip=0.15, n_pts=12)
    rim(s, lead & (c.Y < 38) & (c.X < 16), body=(1,))
    bx, by = mi(s, gx - 16.5 - 1, gy - 7)
    flying = c.empty()
    seeds = {0: [(bx - 6, by - 10, SEED), (bx - 5, by + 8, SMALL), (bx + 5, 0, SMALL)],
             1: [(bx - 6, by - 10, SEED), (bx - 5, by + 8, SMALL), (bx + 5, 0, SMALL), (bx - 2, by - 3, SMALL)],
             2: [(bx - 8, by - 13, SEED), (bx - 8, by + 8, SMALL), (bx + 4, 0, SMALL), (bx - 4, by - 4, SMALL),
                 (bx - 1, by + 4, SMALL)],
             3: [(bx - 10, by - 16, SEED), (bx - 4, by + 9, SMALL), (bx + 2, 0, SMALL), (bx + 9, 0, SMALL),
                 (bx - 1, by - 9, SMALL)]}[puff]
    for x, y, st in seeds:
        x, y = max(0, x), max(0, y)
        s.rows(x, y, st)
        flying |= c.rect(x - 1, y - 1, x + len(st[0]) + 1, y + len(st) + 1)
    fourconnect(s, tones=(3,), body=(1, 2))
    img = finish(s)
    if mask:
        return img, gm | flying | c.rect(0, 0, 22, 34)
    return img


CLOCK_POSES = [(0, 0), (1.0, 0), (1.6, 0), (0, 2), (0, 3)]
CLOCK_ANIM = {"intro": [[0, 6], [1, 6], [2, 14], [3, 6], [4, 10], [0, 10]],
              "idle": [[0, 130], [1, 12]]}


def clock_back():
    """The seed clock from behind: the globe fills the frame, seeds lifting
    off its far (right) side toward the foe."""
    s = Sprite(48, 48, pal3("dandelion_clock"), crop_bottom=True)
    c = s.c
    pose(s, 1.1, 0, 22, 30)
    gx, gy, R = 22, 22, 17.5
    claw(s, c, (21, 42), (0, 33), 12, lobes=3, bend=2.0, tones=(1, 1, 1), shade=None)
    stem = c.curve([(22, 38), (23, 44), (22, 48)], 5.0, 5.0)
    s.add(stem, tones=(1, 1, 1), flat=True)
    globe = star(c, gx, gy, 24, R, R + 3.0, rot=0) & ~c.ellipse(gx + R + 1, gy - 8, 5.5, 4.5)
    s.add(globe, tones=(2, 2, 2), flat=True)
    rc = claw(s, c, (24, 43), (47, 37), 12, lobes=3, bend=-2.0, tones=(1, 1, 1), shade=None)
    s.render()
    gm = s.owner == 2
    gcx, gcy = m(s, gx - 5, gy - 5)
    s.paint(gm & c.ellipse(gcx, gcy, R * 0.62, R * 0.56) & (s.t == 2), 3)
    gcx, gcy = m(s, gx, gy)
    rays(s, gcx, gcy, 20, 6.0, 20.0, lit=2, dark=3, over=(2, 3), rot=0, skip=0.15, n_pts=14)
    rim(s, rc & (c.Y < 42), body=(1,))
    s.rows(40, 3, SEED)
    fourconnect(s, tones=(3,), body=(1, 2))
    return finish(s)


# --------------------------------------------------------------- icons
def bud_icon():
    s = Sprite(16, 16, pal3("dandelion_bud"))
    c = s.c
    s.add(c.leaf((9, 14.5), (3, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.leaf((10, 12), (15, 7), 3.6, bend=-0.5), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10, 13), (8.5, 11)], 3.0, 2.6), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.ellipse(7, 9.5, 5.0, 3.6, 55), tones=(1, 1, 1), flat=True, line="black", prune=False)
    s.add(c.ellipse(4.5, 5.1, 2.8, 2.0, -40) | c.leaf((5, 5.5), (2.0, 2.1), 3.2) |
          c.leaf((5, 5.5), (6.5, 1.5), 3.0), tones=(2, 2, 2), flat=True, prune=False)
    s.render()
    s.px([(4, 8), (4, 9), (5, 7)], 3)
    s.px([(2, 4), (3, 3)], 3)
    return finish(s)


def lion_icon():
    s = Sprite(16, 16, pal3("dandelion"))
    c = s.c
    s.add(c.leaf((9, 14.5), (2, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.leaf((10, 12), (15.4, 8), 3.6, bend=-0.5), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10.5, 12), (9, 10)], 3.0, 2.6), tones=(1, 1, 1), flat=True, prune=False)
    s.add(mane(c, 6.5, 7.0, 9, 4.2, 6.6, sx=0.95, sy=0.9, swirl=0.2, back=np.radians(-40), sweep=0.4),
          tones=(1, 2, 2), shade=(1, 1), line="black", prune=False)
    s.render()
    s.px([(4, 5), (5, 5), (4, 6), (3, 6), (5, 4)], 3)
    return finish(s)


def clock_icon():
    s = Sprite(16, 16, pal3("dandelion_clock"))
    c = s.c
    s.add(c.leaf((9, 14.5), (2, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10.5, 12.5), (9, 11)], 3.0, 2.6), tones=(1, 1, 1), flat=True, prune=False)
    g = star(c, 8, 7.0, 12, 5.6, 6.8, rot=4) & ~c.ellipse(1.5, 4.5, 2.0, 1.8)
    s.add(g, tones=(2, 2, 2), flat=True, prune=False)
    s.render()
    s.rows(4, 2, ["..33.", ".3333", "3333.", "333..", "33..."])
    s.rows(0, 1, [".0.", "030", ".0."])
    return finish(s)


NOTES = {
    "dandelion_bud": "LUNGING. Intro: the bud swells, the yellow cowlick bursts open, then it shivers; the "
                     "claws, stem and bracts hold. Two-hue case: the green is index 1 (shaded with black, lit "
                     "with white rims) and the yellow index 2, breaking through the bracts' seams.",
    "dandelion": "LUNGING. Intro: the mane fluffs up and shakes left, right, left, then settles; only the head "
                 "moves. The deep green shades the gold mane (a spiky terminator), the lit florets are white.",
    "dandelion_clock": "WHITE: the seed clock is a white pappus sphere; the lavender shade, and the pappus "
                       "rays keep form inside the white (no central dot: it read as an eye). BOBBING. Intro: the globe draws in "
                       "a breath, then puffs: a volley of seeds launches off the blown flank at the foe and "
                       "drifts away (the intro ends back at rest).",
}
SPORT_NOTE = (" Sport: pink dandelion. Taraxacum pseudoroseum, the pink dandelion of Central Asia: rose "
              "florets with pale tips (indexes 1-2 only).")


def make():
    out = {}
    for id_, ff, poses, bf, icf, anim in (
        ("dandelion_bud", bud_front, BUD_POSES, bud_back, bud_icon, BUD_ANIM),
        ("dandelion", lion_front, LION_POSES, lion_back, lion_icon, LION_ANIM),
        ("dandelion_clock", clock_front, CLOCK_POSES, clock_back, clock_icon, CLOCK_ANIM),
    ):
        fr = register(frames_from(lambda *p, ff=ff: ff(*p, mask=True), poses))
        i0 = icf()
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
    review_sheet(IDS, HERE.parent / "review" / "crystal_dandelion.png")
    return 1 if errs else 0


if __name__ == "__main__":
    if "--preview" in sys.argv:
        rows = [(i, d["front"], d["back"], d["icon"], [BLACK, *PAL[i], WHITE], [BLACK, *SPORT[i], WHITE])
                for i, d in make().items()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/dandelion_preview.png"))
    else:
        sys.exit(build())
