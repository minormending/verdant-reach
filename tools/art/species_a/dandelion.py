"""Dandelion line: dandelion_bud -> dandelion -> dandelion_clock.

Dent-de-lion. Shape motif: the lion's-tooth leaf (saw teeth hooked back
toward the base), used as clawed ARMS and splayed FEET. Accent: the head
as a mane. The bud is a cub with a yellow cowlick bursting out of its tip,
the teen is all swept-back mane, the clock is the same lion gone white,
its seed-globe huge and already launching seeds at the foe.

All fronts face left in a 3/4 lean: head pushed toward the foe, the near
arm clawing forward, the far arm raised in guard. Idle: the body rotates
1.5-2 deg further about the feet (a breath into the lunge).

Poses and rubric scores (CREATURES.md §9):
  dandelion_bud    LUNGING  score 8 (4: the tuft could flare further)
  dandelion        LUNGING  score 8 (9: no single crisp glint, the lit floret star does the job)
  dandelion_clock  BOBBING  score 8 (6: pale, so no selout by rule; 2: lean is gentle)
"""

import numpy as np
from px import Sprite, bezier, blob, saw_leaf, star

import fieldkit as fk
IDS = ["dandelion_bud", "dandelion", "dandelion_clock"]

BUD = ["#28602c", "#70b038", "#f8d830"]            # deep green, leaf green, yellow
LION = ["#40641c", "#f0b818", "#f8f0a0"]           # deep green, dandelion gold, pale
CLOCK = ["#3a5c38", "#a8b0d0", "#f8f8f8"]          # deep sage, seed-shade lavender, white


def claw(s, c, p0, p1, w, lobes=3, bend=0.0, tones=(1, 2, 3), lit=True, line="black", depth=0.62):
    """A lion's-tooth leaf used as an arm/foot: teeth hook back to the base."""
    m = saw_leaf(c, p0, p1, w, lobes=lobes, bend=bend, depth=depth)
    if lit:
        return s.add(m, tones=tones, shade=(2, 2), close=2, band=(1, 2), line=line)
    return s.add(m, tones=tones, flat=True, line=line)


def mane(c, cx, cy, n, r_in, r_out, sx=1.0, sy=1.0, rot=0.0, swirl=0.0, back=0.0, sweep=0.0):
    """A swept-back mane: zigzag disc whose outer points lag behind (swirl,
    radians) and grow longer toward the `back` direction (sweep, fraction)."""
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


def seams(s, ctrls, from_tone=2, to=1):
    for ctrl in ctrls:
        for x, y in bezier(ctrl, 24):
            x, y = int(x), int(y)
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] == from_tone:
                s.px([(x, y)], to)


# --------------------------------------------------------------------------- fronts

def bud_front(fr=0):
    """The cub: a fat closed bud leaning hard at the foe on a stub of stem,
    a yellow cowlick flaring from its tip; clawed leaves up in guard."""
    b = fr
    s = Sprite(56, 56, BUD)
    c = s.c
    claw(s, c, (31, 54), (48, 51.5), 9, lobes=2, bend=-1.0, tones=(1, 1, 2), lit=False)
    claw(s, c, (30, 46), (49, 29 + b), 12, lobes=3, bend=-2.0, tones=(1, 2, 2))
    stem = c.curve([(30, 55), (31, 50), (27, 44)], 5.4, 4.6)
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    claw(s, c, (29, 54), (9, 54.6), 10, lobes=2, bend=1.0, tones=(1, 2, 2))
    # the bud: a big egg, long axis tilted up-left at the foe
    oy = b
    bud = c.ellipse(21, 33 + oy, 13.0, 9.5, 55) | c.leaf((18, 28 + oy), (11, 16 + oy), 9, power=0.6, tip=1.2)
    s.add(bud, tones=(1, 2, 3), shade=(3, 2), close=2, band=(1, 2, (c.Y < 31 + oy) & (c.X < 22)), line="black")
    br = (c.leaf((26, 42 + b), (33, 47 + b), 5.0, bend=-1.4, tip=1.6) |
          c.leaf((21, 44 + b), (17, 49 + b), 4.6, bend=1.4, tip=1.6) |
          c.leaf((24, 44 + b), (25, 50 + b), 4.4, tip=1.6))
    s.add(br, tones=(1, 1, 2), shade=(1, 1), line="black")
    tuft = (c.leaf((12, 18 + b), (6, 12 + b), 5.0, bend=1.2, tip=1.4) |
            c.leaf((13, 17 + b), (11, 10 + b), 4.8, bend=-1.0, tip=1.4) |
            c.leaf((14, 18 + b), (18, 12 + b), 4.2, bend=-1.6, tip=1.4) |
            c.ellipse(12.5, 17 + b, 3.4, 2.6, -40))
    s.add(tuft, tones=(3, 3, 3), flat=True, line="black")
    claw(s, c, (27, 47), (4, 40 + b), 12, lobes=3, bend=2.0, tones=(1, 2, 2))
    s.render()
    seams(s, [[(13, 31 + b), (12, 24 + b), (13, 19 + b)], [(21, 40 + b), (19, 30 + b), (15, 20 + b)]])
    s.clean()
    return fk.finish(s)


def fringe(s, m, cx, cy, light_tone=3, dark_tone=1, over=(2,)):
    """Draw the edge of an inner floret layer: lit pixels on the top-left
    half, shade on the bottom-right half (layered rays, not a disc)."""
    from scipy import ndimage
    edge = m & ~ndimage.binary_erosion(m)
    ys, xs = np.nonzero(edge)
    for y, x in zip(ys, xs):
        if s.t[y, x] not in over:
            continue
        u = (x - cx) + (y - cy)
        if u < -3:
            s.px([(x, y)], light_tone)
        elif u > 2:
            s.px([(x, y)], dark_tone)


def lion_front(fr=0):
    """The lion: the flower head turned 3/4 at the foe, its florets a shaggy
    mane fanning forward and swept back over the green cup of bracts; a
    crouched S-curved stem, a forward swipe and a raised claw."""
    b = fr
    s = Sprite(56, 56, LION)
    c = s.c
    hx, hy = 21, 21 + b
    back = np.radians(-40)
    claw(s, c, (32, 54), (52, 51), 10, lobes=2, bend=-1.0, tones=(1, 1, 1), lit=False)
    claw(s, c, (30, 54), (7, 54.6), 11, lobes=2, bend=1.0, tones=(1, 1, 1), lit=False)
    # the whole body rotates about the feet toward the foe (idle: a little more)
    fk.pose(s, 1.0, 13 + 2.0 * b, 31, 55)
    hy = 22
    claw(s, c, (34, 42), (53, 30), 12, lobes=3, bend=-2.5, tones=(1, 1, 1), lit=False)
    stem = c.curve([(31, 28), (35, 38), (34, 47), (30, 56)], 5.6, 4.6)
    s.add(stem, tones=(1, 1, 1), flat=True)
    # the cup of bracts behind the head, reflexed bracts curling back/down
    cup = (c.ellipse(31, 24, 5.5, 6.5, 20) | c.leaf((32, 27), (41, 33), 4.6, bend=-1.5, tip=1.6) |
           c.leaf((33, 24), (42, 23), 4.4, bend=1.2, tip=1.6) |
           c.leaf((30, 29), (31, 37), 4.4, bend=-1.0, tip=1.6))
    s.add(cup, tones=(1, 1, 1), flat=True)
    head = mane(c, hx, hy, 15, 13.5, 20.0, sx=0.82, sy=0.95, rot=-4, swirl=0.24, back=back, sweep=0.45)
    hid = len(s.parts)
    s.add(head, tones=(1, 2, 2), flat=True, line="black")
    claw(s, c, (32, 45), (6, 35), 14, lobes=3, bend=2.5, tones=(1, 1, 3), lit=False)
    s.render()
    # florets radiate from the receptacle, which faces down-left (3/4)
    # form: a spiky terminator (floret tips) between the lit and shaded halves
    head_m = s.owner == hid
    lit = mane(c, hx - 3, hy - 3, 13, 13.0, 17.5, sx=0.82, sy=0.95, rot=10, swirl=0.2)
    s.paint(head_m & ~lit & (s.t == 2), 1)
    hi = mane(c, hx - 6, hy - 7, 9, 4.0, 7.5, sx=0.82, sy=0.95, rot=-5, swirl=0.2)
    s.paint(head_m & hi & (s.t == 2), 3)
    fk.contact(s, 9, 16)
    fk.contact(s, 40, 47)
    s.clean()
    return fk.finish(s)


def clock_front(fr=0):
    """The clock: the lion gone white, its seed-globe swollen huge, one flank
    already blown open and seeds launched at the foe."""
    b = fr
    s = Sprite(56, 56, CLOCK)
    c = s.c
    gx, gy, R = 27, 23, 16.5
    claw(s, c, (33, 54), (54, 50), 10, lobes=2, bend=-1.0, tones=(1, 1, 1), lit=False)
    claw(s, c, (31, 54), (8, 54.6), 11, lobes=2, bend=1.0, tones=(1, 1, 1), lit=False)
    fk.pose(s, 1.0, 8 + 1.5 * b, 32, 55)
    claw(s, c, (33, 43), (54, 29), 14, lobes=3, bend=-2.5, tones=(1, 1, 1), lit=False)
    stem = c.curve([(27, 37), (33, 44), (33, 50), (31, 56)], 5.6, 4.8)
    s.add(stem, tones=(1, 1, 1), flat=True)
    globe = star(c, gx, gy, 26, R, R + 3.0, rot=4)
    globe &= ~c.ellipse(gx - R - 1, gy - 7, 6.0, 5.0)
    s.add(globe, tones=(2, 3, 3), shade=(7, 7), close=3)
    claw(s, c, (32, 45), (6, 34), 14, lobes=3, bend=2.5, tones=(1, 1, 2), lit=False)
    s.render()
    gcx, gcy = fk.m(s, gx + 1, gy + 1)
    fk.rays(s, gcx, gcy, 18, 7.0, 17.0, lit=2, dark=3, over=(2,), rot=5, skip=0.15, n_pts=12)
    fk.rays(s, gcx, gcy, 18, 9.0, 13.0, lit=2, dark=2, over=(3,), rot=15, skip=0.0, n_pts=6)
    seed = ["..000..", ".03330.", "0333330", ".00000.", "...0...", "...0...", "..010..", "..010..", "...0..."]
    small = [".000.", "03330", ".000.", "..0..", ".010.", ".010.", "..0.."]
    bx, by = fk.mi(s, gx - R - 1, gy - 7)
    s.rows(max(0, bx - 6) - b, max(0, by - 10) - b, seed)
    s.rows(max(0, bx - 5), by + 8 + b, small)
    s.rows(bx + 5 - b, 0, small)
    s.clean()
    return fk.finish(s, to=None)


# --------------------------------------------------------------------------- backs

def bud_back():
    """From behind and above: the bud's seams spiralling to the yellow
    cowlick, both claws raised either side, leaning toward the foe (right)."""
    s = Sprite(48, 48, BUD, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.4, 26, 8)
    claw(s, c, (21, 36), (2, 22), 12, lobes=3, bend=2.0, tones=(1, 2, 2))
    stem = c.curve([(22, 48), (21, 38), (24, 28)], 6.0, 4.6)
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    bud = blob(c, [(30, 4), (25, 8), (21, 16), (22, 25), (29, 28), (35, 22), (35, 12), (33, 6)])
    s.add(bud, tones=(1, 2, 3), shade=(3, 2), close=2, band=(1, 2, c.Y < 16), line="black")
    br = (c.leaf((25, 25), (17, 31), 5.0, bend=1.4, tip=1.6) | c.leaf((31, 26), (37, 32), 5.0, bend=-1.4, tip=1.6))
    s.add(br, tones=(1, 1, 2), shade=(1, 1))
    tuft = c.leaf((31, 6), (35, -2), 5.0, bend=-1.2, tip=1.4) | c.leaf((30, 6), (27, -1), 4.4, bend=1.2, tip=1.4)
    s.add(tuft, tones=(3, 3, 3), flat=True)
    claw(s, c, (24, 38), (47, 26), 13, lobes=3, bend=-2.0)
    s.render()
    seams(s, [[fk.m(s, *q) for q in ((24, 24), (23, 16), (28, 8))], [fk.m(s, *q) for q in ((29, 27), (31, 18), (31, 9))]])
    s.clean()
    return fk.finish(s)


def lion_back():
    """The back of the head: the mane round a green star of bracts, swept
    toward us; claws spread wide below."""
    s = Sprite(48, 48, LION, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.25, 25, 30)
    hx, hy = 25, 19
    claw(s, c, (22, 38), (0, 27), 14, lobes=3, bend=2.0, tones=(1, 1, 1), lit=False)
    stem = c.curve([(25, 26), (23, 38), (24, 48)], 6.0, 5.0)
    s.add(stem, tones=(1, 1, 1), flat=True)
    outer = mane(c, hx, hy, 18, 13.0, 21.0, sx=1.0, sy=0.82, rot=-6, swirl=-0.10, back=np.radians(200), sweep=0.25)
    s.add(outer, tones=(1, 2, 2), shade=(1, 3), close=2)
    s.add(mane(c, hx, hy, 14, 10.0, 15.0, sx=1.0, sy=0.82, rot=6, swirl=-0.1), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 3, (c.X < hx + 4) & (c.Y < hy - 3)), line="black")
    for k in range(9):
        a = np.radians(90 + 40 * k)
        p1 = (hx + np.cos(a) * 11.0, hy + 1 + np.sin(a) * 9.0)
        s.add(c.leaf((hx, hy + 1), p1, 4.2, power=0.7, tip=1.8), tones=(1, 1, 1), flat=True, line="black")
    s.add(c.ellipse(hx, hy + 1, 4.5, 3.8), tones=(1, 1, 3), shade=(1, 1), band=(1, 2), line="black")
    claw(s, c, (27, 40), (48, 30), 14, lobes=3, bend=-2.0, tones=(1, 1, 1), lit=False)
    s.render()
    s.clean()
    return fk.finish(s)


def clock_back():
    """The seed clock from behind: the globe fills the frame, seeds lifting
    off its far (right) side toward the foe."""
    s = Sprite(48, 48, CLOCK, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.1, 22, 30)
    gx, gy, R = 22, 22, 17.5
    claw(s, c, (21, 42), (0, 33), 12, lobes=3, bend=2.0, tones=(1, 1, 1), lit=False)
    stem = c.curve([(22, 38), (23, 44), (22, 48)], 5.0, 5.0)
    s.add(stem, tones=(1, 1, 1), flat=True)
    globe = star(c, gx, gy, 24, R, R + 3.0, rot=0) & ~c.ellipse(gx + R + 1, gy - 8, 5.5, 4.5)
    s.add(globe, tones=(2, 3, 3), shade=(6, 6), close=3)
    claw(s, c, (24, 43), (47, 37), 12, lobes=3, bend=-2.0, tones=(1, 1, 2), lit=False)
    s.render()
    s.rows(40, 3, ["..000..", ".03330.", "0333330", ".00000.", "...0...", "...0...", "..010..", "..010..", "...0..."])
    s.clean()
    return fk.finish(s, to=None)


# --------------------------------------------------------------------------- icons

def bud_icon(f=0):
    s = Sprite(16, 16, BUD)
    c = s.c
    d = -f
    s.add(c.leaf((9, 14.5), (3, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.leaf((10, 12), (15, 7), 3.6, bend=-0.5), tones=(1, 2, 2), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10, 13), (8.5, 11)], 3.0, 2.6), tones=(2, 2, 2), flat=True, prune=False)
    s.add(c.ellipse(7 + d, 9, 5.0, 3.6, 55), tones=(1, 2, 3), shade=(1, 1), line="black", prune=False)
    s.add(c.ellipse(4.5 + d, 4.6, 2.8, 2.0, -40) | c.leaf((5 + d, 5), (2.0 + d, 1.6), 3.2) |
          c.leaf((5 + d, 5), (6.5 + d, 1.0), 3.0), tones=(3, 3, 3), flat=True, prune=False)
    return s.render()


def lion_icon(f=0):
    s = Sprite(16, 16, LION)
    c = s.c
    d = -f
    s.add(c.leaf((9, 14.5), (2, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.leaf((10, 12), (15.4, 8), 3.6, bend=-0.5), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10.5, 12), (9, 10)], 3.0, 2.6), tones=(1, 1, 1), flat=True, prune=False)
    s.add(mane(c, 6.5 + d, 6.5, 9, 4.2, 6.6, sx=0.95, sy=0.9, swirl=0.2, back=np.radians(-40), sweep=0.4),
          tones=(1, 2, 3), shade=(1, 1), band=(1, 2), line="black", prune=False)
    return s.render()


def clock_icon(f=0):
    s = Sprite(16, 16, CLOCK)
    c = s.c
    d = -f
    s.add(c.leaf((9, 14.5), (2, 15.6), 4.0, power=0.6) | c.leaf((10, 14.5), (15, 15.6), 4.0, power=0.6),
          tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.curve([(9.5, 15.6), (10.5, 12.5), (9, 11)], 3.0, 2.6), tones=(1, 1, 1), flat=True, prune=False)
    g = star(c, 8 + d, 6.5, 12, 5.6, 6.8, rot=4) & ~c.ellipse(1.5 + d, 4, 2.0, 1.8)
    s.add(g, tones=(2, 3, 3), shade=(2, 2), close=1, prune=False)
    s.render()
    s.rows(0, 1 - f, [".0.", "030", ".0."])
    return s


ICON_FN = {"dandelion_bud": bud_icon, "dandelion": lion_icon, "dandelion_clock": clock_icon}


def make(id_):
    f, b, pal = {
        "dandelion_bud": (bud_front, bud_back, BUD),
        "dandelion": (lion_front, lion_back, LION),
        "dandelion_clock": (clock_front, clock_back, CLOCK),
    }[id_]
    fr = fk.register([f(0), f(1)])
    i1, i2 = fk.icon_frames(ICON_FN[id_], pal)
    return {"front": fr[0], "front__2": fr[1], "back": b(), "icon": i1, "icon__2": i2}
