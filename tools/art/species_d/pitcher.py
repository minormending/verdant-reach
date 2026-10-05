"""Pitcher plant line: pitcher_sprout -> pitcher_plant (bug/water).

Sarracenia leucophylla (white-topped pitcher plant) of the bog: tall lime
trumpets whose tops flare into a white hood netted with maroon veins, a
wavy lid arching over a gaping, rolled-lipped mouth. Insects are lured by
nectar on the lip and fall in. The head is the hood-and-mouth; the tube is
the neck; a sphagnum tussock is the base.

pitcher_sprout: REARING. One trumpet rises off a moss tussock and leans its
  hooded mouth at the foe; a small one behind. A fly circles (motion cue).
pitcher_plant: REARING. A brood of three; the lead trumpet rears in an S
  over the tussock, hood flared like a cobra, mouth gaping, nectar on the lip.
Scores: pitcher_sprout 8 (REARING; rosette base); pitcher_plant 8 (REARING;
second pitcher + closed spike as escalation; 3: lid could tilt further).
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, dilate, erode, mask_rows, move, qbez, spline

PAL = ("#703068", "#b0c840", "#f8f0d0")   # maroon veins + throat / lime tube / cream hood

# Region maps (facing left). L lid / hood (cream, veined), M mouth (dark
# throat), R rolled lip (peristome, lime), T top of the tube (cream fading
# to lime), N nectar bead on the lip.
HEAD_P = [
    "...........LLLLLL.........",
    "........LLLLLLLLLLL.......",
    "......LLLLVLLLLVLLLLL.....",
    ".....LLLLVLLLLLVLLLLLL....",
    "....LLLVLVLLLLVLLLVLLLL...",
    "...LLLVLLLVLLLVLLVLLLLL...",
    "..LLLVLLLLLVLLVLLVLLLLLL..",
    "..LLLVLLLLLLVLVLVLLLLLLL..",
    ".LLLVLLLLLLLLVVLVLLLLLLL..",
    ".LLLLLL.....LLVVLLLLLLLT..",
    "LLLLL..........LLLLLLLTT..",
    ".LLL..RRRRRRR...LLLLLTVT..",
    "..L..RMMMMMMMRR..LLLTVTT..",
    "....RMMMMMMMMMMR.LLTTVTT..",
    "...RMMMMMMMMMMMMRLTTVTTVT.",
    "...RMMMMMMMMMMMMMRTTVTTVT.",
    "...NRMMMMMMMMMMMMRTTTTTTT.",
    "...NRRMMMMMMMMMMRTTTTTTTT.",
    ".....RRMMMMMMMRRTTTTTTTT..",
    ".......RRRRRRRTTTTTTTTT...",
    "............TTTTTTTTTT....",
    ".............TTTTTTTT.....",
    "..............TTTTTTT.....",
]
HEAD_PS = [
    ".......LLLL.......",
    ".....LLLVLLVL.....",
    "...LLLVLLLVLLLL...",
    "..LLLVLLLLVLVLLL..",
    ".LLLVLLLLLVVLLLL..",
    ".LLLL....LVLLLLT..",
    "LLL........LLLTT..",
    ".L..RRRRR...LLTVT.",
    "...RMMMMMRR.LTVTT.",
    "..RMMMMMMMMRTTVTT.",
    "..NRMMMMMMMRTTTTT.",
    "...RRMMMMMRTTTTTT.",
    ".....RRRRRTTTTTT..",
    ".........TTTTTT...",
    "..........TTTT....",
]
HEAD_PBS = [
    "....LLLLL.......",
    "..LLLLVLLLLL....",
    ".LLLVLLLVLLLLL..",
    "LLLVLLLLVLLVLLL.",
    "LLLLVLLLVLVLLLLL",
    ".LLLLVLLVVLLLLL.",
    "..TTTLLLVLLLLL..",
    "..TTTTTTLLLL....",
    "...TTTTTTT......",
    "...TTTTTTT......",
]
# from behind: the hood's back (veins radiating from its base), the tube
HEAD_PB = [
    "........LLLLLL..........",
    ".....LLLLLLVLLLLL.......",
    "...LLLLVLLLVLLLLLLL.....",
    "..LLLLVLLLLVLLLVLLLLL...",
    ".LLLLVLLLLLVLLVLLLLVLL..",
    ".LLLVLLLLLLVLLVLLLVLLLL.",
    "LLLVLLLLLLLVLVLLLVLLLLL.",
    "LLLLVLLLLLLVLVLLVLLLLLLL",
    ".LLLLVLLLLLVVLLVLLLLLLL.",
    "..TTTTVLLLLLVLVLLLLLLL..",
    "..TTTTTTTLLLVVLLLLLL....",
    "...TTTTTTTTTVTTT........",
    "...TTTTTTTTTVTT.........",
    "....TTTTTTTTTT..........",
]


def veins(s, m, origin, cell=3, **_):
    """The maroon vein net on the cream hood: veins fanning up from the hood's
    base (`origin`), crossed by arcs around it, both broken into short runs
    so it reads as a reticulate net of cream cells, not stripes or rings."""
    ox, oy = origin
    Y, X = np.mgrid[0:s.h, 0:s.w]
    dx, dy = X + 0.5 - ox, Y + 0.5 - oy
    r = np.hypot(dx, dy)
    a = np.arctan2(dy, dx)
    fan = np.abs(((a * r / cell) % 1.0) - 0.5) < 0.17 * (1 + 0.6 / (1 + r * 0.2))
    rings = np.abs(((r / (cell + 0.6)) % 1.0) - 0.5) < 0.16
    # break both families so the cells read as a net
    fan &= ((r // 2) % 3) != 0
    rings &= ((np.floor(a * r / cell)) % 2) == 0
    net = (fan | rings) & erode(m, 1) & (r > 3)
    from kit import thin8
    return thin8(net)


def head(s, x0, y0, rows, face=-1, origin=(0.7, 0.62), hl=None, back=False):
    """Stamp a pitcher head from a region map; returns the lid mask."""
    flip = face > 0
    M = lambda ch: mask_rows(s.w, s.h, x0, y0, rows, ch, flip)
    L, Mo, R, T, N, V = M("LV"), M("M"), M("R"), M("TV") & ~M("LV"), M("N"), M("V")
    W, H = len(rows[0]), len(rows)
    tid = s.part(T, base=3, k=2, sh=2, line=0)
    # the tube top fades from cream to lime downward and toward the shadow side
    Y, X = np.mgrid[0:s.h, 0:s.w]
    fade = (Y > y0 + H * 0.72) | ((X > x0 + W * 0.80) if not flip else (X < x0 + W * 0.20))
    s.decal(T & fade, 2, on=tid)
    if R.any():
        s.part(R, base=2, k=1, line=0)
    if Mo.any():
        s.part(Mo, base=1, k=0, line=None)
        # the throat's far wall catches a little light at the back
        s.decal(Mo & ~move(Mo, -2 if not flip else 2, 0) & move(Mo, 0, -1) & ~move(Mo, 0, 2), 1, on=None)
    ox = x0 + (W * origin[0] if not flip else W * (1 - origin[0]))
    oy = y0 + H * origin[1]
    glint = None
    if hl:
        gx, gy, n = hl
        glint = s.empty()
        for i in range(n):
            glint[y0 + gy, (x0 + gx + i) if not flip else (x0 + W - 1 - gx - i)] = True
    lid = s.part(L, base=3, k=2, sh=2, line=0)
    s.decal(V & ~(glint if glint is not None else s.empty()), 1, lock=True)
    if N.any():
        # nectar on the lip: the glint of life
        s.part(N, base=3, k=0, line=0)
    return L


def tube(s, pts, w0, w1, vein=True):
    path = spline(pts, 20)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=2, k=2, rim=1, line=0)
    if vein:
        # the wing (ala) seam down the front of the trumpet: a dark line
        sx = [(x - (w0 + (w1 - w0) * i / len(path)) * 0.18, y) for i, (x, y) in enumerate(path)]
        s.decal(s.line1(sx[len(sx) // 3:]) & erode(m, 1), 1, on=pid)
    return pid


def tussock(s, cx, y, rx, ry, phase=0):
    """A sphagnum moss mound: clumped lime heads on top, dark underneath."""
    m = s.ellipse(cx, y + 1, rx, ry)
    for i in range(7):
        t = i / 6
        bx = cx - rx * 0.86 + 2 * rx * 0.86 * t
        by = y - ry * 0.55 * math.sin(math.pi * (0.15 + 0.7 * t)) - (1 if i % 2 else 0)
        m |= s.circle(bx, by, 2.6 + (i % 3) * 0.5)
    m &= s.rect(0, 0, s.w, int(y + ry))
    pid = s.part(m, base=2, k=2, rim=1, line=0)
    # the dark underside where the moss sits in the bog
    under = m & s.rect(0, int(y + 1), s.w, s.h)
    s.decal(under & ~move(under, 0, -1) & False, 1)
    s.decal(m & s.rect(0, int(y + ry - 2), s.w, s.h), 1, on=pid)
    return pid


def rosette(s, leaves):
    """Ground rosette: flat lime phyllodes splayed from the crown, each with a
    maroon midrib; the two longest are the creature's planted feet."""
    for base, tip, w, bend in leaves:
        m, path = s.leaf(base, tip, w, bend=bend, fat=0.40, power=0.7)
        pid = s.part(m, base=2, k=2, rim=1, line=0)
        if w >= 6:
            s.decal(s.line1(path[10:-24]) & erode(m, 1), 1, on=pid)


def fly(s, x, y):
    """A tiny lured fly: black body, a pale wing."""
    s.px([(x, y), (x + 1, y), (x + 1, y + 1)], 0)
    s.px([(x, y - 1), (x + 1, y - 1)], 3)
    s.px([(x - 1, y - 1), (x, y - 2), (x + 1, y - 2), (x + 2, y - 1)], 0)


# ---------------------------------------------------------------------------

def spike(s, pts, w0, w1):
    """A young, still-closed pitcher: a lime spike with a pointed cream tip."""
    path = spline(pts, 16)
    m = s.stroke(path, (w0, w1), cap=False)
    pid = s.part(m, base=2, k=2, rim=1, line=0)
    tip = s.empty()
    tx, ty = path[-1]
    tip |= s.circle(tx, ty, w1 * 0.5 + 0.6) & m
    n = len(path)
    for x, y in path[int(n * 0.78):]:
        tip |= s.circle(x, y, w1 * 0.6) & m
    s.decal(tip, 3, on=pid)
    return pid


def front_sprout(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1][ph]   # the head bobs 1px, the fly circles
    spike(s, [(36, 52), (40, 40), (43, 26), (45, 20)], 5.0, 2.5)    # a young closed pitcher behind
    tube(s, [(31, 53), (32, 42), (28, 31), (24, 25 + b)], 5.0, 8.0)
    head(s, 9, 11 + b, HEAD_PS, origin=(0.78, 0.45), hl=(5, 2, 3))
    rosette(s, [((32, 53), (46, 50), 6, -0.15), ((31, 54), (49, 55), 6, 0.1),
                ((29, 54), (13, 55), 7, -0.1), ((30, 53), (17, 49), 6, 0.15)])
    fx, fy = [(4, 33), (3, 31)][ph]
    fly(s, fx, fy)
    return s


def front_adult(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1, 1][ph]
    spike(s, [(44, 52), (48, 40), (50, 26), (51, 18)], 5.0, 2.5)     # a young closed pitcher
    tube(s, [(38, 52), (40, 42), (41, 30)], 5.0, 7.0)
    head(s, 32, 10, HEAD_PS, face=1, origin=(0.78, 0.45))          # second pitcher, facing back
    tube(s, [(29, 53), (31, 43), (28, 33), (22, 26 + b), (19, 22 + b)], 6.0, 10.0)
    head(s, 1, 1 + b, HEAD_P, origin=(0.80, 0.50), hl=(7, 3, 3))
    rosette(s, [((34, 53), (52, 49), 7, -0.15), ((33, 54), (55, 55), 7, 0.1),
                ((28, 54), (6, 55), 8, -0.1), ((29, 53), (11, 48), 7, 0.15)])
    fx, fy = [(2, 36), (1, 34), (3, 33)][ph]
    fly(s, fx, fy)
    return s


def hood_back(s, cx, cy, rx, ry, tube_w, lean=0.3, n=5):
    """A pitcher from behind: the cream hood's back (veins fanning up from
    its base), the cream-to-lime top of the tube, leaning to the foe."""
    bx, by = cx - math.sin(lean) * ry * 0.2, cy + ry * 0.75
    hood = s.ellipse(cx, cy, rx, ry, ang=-lean)
    top = s.stroke([(bx, by), (bx - math.sin(lean) * ry, by + ry * 1.2)], (tube_w, tube_w * 0.9), cap=False)
    tid = s.part(top, base=3, k=2, sh=2, line=None)
    s.decal(top & s.rect(0, int(by + ry * 0.45), s.w, s.h), 2, on=tid)
    gl = s.ellipse(cx - rx * 0.45, cy - ry * 0.45, max(1.4, rx * 0.12), 0.9, ang=-0.5)
    hid = s.part(hood, base=3, k=2, sh=2, line=0, hl=gl, hl_tone=3)
    v = s.empty()
    for i in range(n):
        a = -math.pi * (0.12 + 0.76 * i / (n - 1)) - lean
        ex, ey = cx + math.cos(a) * rx * 0.95, cy + math.sin(a) * ry * 0.95
        mx, my = (bx + ex) / 2 + (i - n // 2) * 1.2, (by + ey) / 2
        v |= s.line1(qbez((bx, by), (mx, my), (ex, ey), 20))
    v |= s.line1([(bx, by), (bx - math.sin(lean) * ry * 0.8, by + ry)])
    s.decal(v & erode(hood | top, 1) & ~gl, 1)
    return hid


def back_sprout():
    s = Sprite(48, 48, PAL)
    spike(s, [(7, 48), (5, 38), (6, 28), (8, 22)], 7.0, 3.5)
    tube(s, [(20, 48), (22, 38), (25, 30)], 12.0, 14.0, vein=False)
    hood_back(s, 28, 15, 15, 12, 14, lean=0.30)
    return s


def back_adult():
    s = Sprite(48, 48, PAL)
    spike(s, [(45, 48), (46, 38), (45, 30), (43, 24)], 6.0, 3.0)
    tube(s, [(8, 48), (6, 38), (6, 30)], 9.0, 10.0, vein=False)
    hood_back(s, 7, 21, 9, 7, 9, lean=0.2, n=4)
    tube(s, [(22, 48), (23, 36), (26, 26)], 14.0, 16.0, vein=False)
    hood_back(s, 29, 12, 17, 12, 16, lean=0.30, n=6)
    return s


ICON_SPROUT = [
    "................",
    "...kkkkk........",
    "..k33333kk......",
    ".k3313331k......",
    "k331kkkk31k.....",
    ".k1k...k32k..kk.",
    "..kk111k32k.k32k",
    "....kkk222k.k2k.",
    "......k221k.k2k.",
    "......k221kk21k.",
    "......k2221k21k.",
    "...kk.k2221k21k.",
    "..k22kk2221k1kkk",
    ".k2222222222221k",
    "..kkkkkkkkkkkkkk",
    "................",
]
ICON_ADULT = [
    "..kkkkkk........",
    ".k333333kk......",
    "k33133331k..kkk.",
    "k31kkkkk31kk333k",
    "kk1k...k32k3131k",
    ".kk111k322kk1k3k",
    "...kkkk222k.k32k",
    ".....k2221k.k22k",
    ".....k2221k.k21k",
    ".....k2221kk221k",
    ".....k2221k2221k",
    "..kk.k2221k221k.",
    ".k22kk22211k21kk",
    "k22222222222221k",
    ".kkkkkkkkkkkkkkk",
    "................",
]


def _up(rows):
    return rows[1:] + ["                "]


SPRITES = {
    "pitcher_sprout": dict(pal=PAL, front=front_sprout, frames=2, back=back_sprout,
                           icon=ICON_SPROUT, icon2=_up(ICON_SPROUT)),
    "pitcher_plant": dict(pal=PAL, front=front_adult, frames=3, back=back_adult,
                          icon=ICON_ADULT, icon2=_up(ICON_ADULT)),
}
