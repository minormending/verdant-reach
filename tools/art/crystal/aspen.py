"""Original Crystal-rule Populus tremuloides (quaking aspen): aspen_sucker -> quaking_aspen.

aspen_sucker (teen size class, stage 1 of 2), REARING: a slender pale stem
pushing up from a visible root runner, a pale root that crosses the soil from
off the right edge of the frame (the clone's shared root). Round, finely
toothed sage leaves hang on long flattened stalks; the head leaf tilts toward
the foe, the big lead leaf is raised on the foe side, and one leaf at the top
right is caught mid-tremble, twisted edge-on to show its pale underside.
quaking_aspen (adult), LOOMING: a tall, slim, white-barked trunk leaning
toward the foe, its bark marked with dark horizontal knots and lenticel scars
(short dashes and lenses that always touch the trunk's edge, never a pair of
dark ovals). A narrow crown of golden round leaves overhangs the foe; a second,
smaller trunk rises from the same pale root at the base: it is a clone.

Intro: aspen_sucker's leaves tremble in a flutter wave from the lead leaf to
the rear one; quaking_aspen's whole crown quakes, a band of leaves twisting
edge-on (flashing their pale undersides) running from the top of the crown to
the bottom, then it settles. Stems, trunks, roots and soil stay registered.
Two tones: pale sage (sucker) / pale gold (adult) mid over a deep gold-olive
dark slot that is the leaves' shade, the knots and the soil; the pale bark is
white plus the mid tone. The adult's golden crown stays inside the two tones
(its own pale-gold mid, as the larch line's adult turns gold), so no third-hue
exception is needed.
Faces: bark marks are short horizontal dashes and lenses joined to the trunk
outline, alternating sides; no enclosed dark dots anywhere (no_dots).
Sport: the autumn-red colour form some aspen clones show (red-orange crowns),
a natural colour variation, not a cultivar; see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): sucker 8, quaking_aspen 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, hop, icon_arr, moving_boxes, rim_white, shift, tones

TOOL = "tools/art/crystal/aspen.py"
IDS = ["aspen_sucker", "quaking_aspen"]
OLIVE = "#887828"
PALS = {
    "aspen_sucker": [BLACK, OLIVE, "#b8c890", WHITE],
    "quaking_aspen": [BLACK, "#987020", "#e8c850", WHITE],
}
SPORTS = {
    "aspen_sucker": [BLACK, "#903828", "#e09860", WHITE],
    "quaking_aspen": [BLACK, "#983020", "#e88048", WHITE],
}
SUCKER_ANIM = {"intro": [[0, 6], [1, 8], [2, 8], [3, 8], [4, 10], [0, 8]],
               "idle": [[0, 130], [4, 8], [0, 6]]}
ADULT_ANIM = {"intro": [[0, 6], [1, 8], [2, 8], [3, 8], [4, 12], [0, 8]],
              "idle": [[0, 140], [1, 8], [0, 6]]}


# ------------------------------------------------------------- shared -----

def across(s, m, path, hws):
    """Per pixel of mask m: (u, a), u the signed position across the form
    (-1 = its lit, left edge, +1 = its shaded right edge) and a the distance
    along it in pixels from the start of `path`."""
    P = np.array(s.T(list(path)))
    ys, xs = np.nonzero(m)
    q = np.stack([xs + 0.5, ys + 0.5], 1)
    d = np.linalg.norm(q[:, None, :] - P[None, :, :], axis=2)
    k = d.argmin(1)
    tang = np.gradient(P, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    flip = nrm[:, 0] < 0                        # orient each normal toward the right
    nrm[flip] *= -1
    sd = ((q - P[k]) * nrm[k]).sum(1)
    hw = np.array(hws)[k]
    seg = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    u = np.zeros(m.shape)
    a = np.zeros(m.shape)
    u[ys, xs] = np.clip(sd / np.maximum(hw, 0.5), -1.5, 1.5)
    a[ys, xs] = seg[k]
    return u, a


def trunk(s, ctrl, width, knots=(), white=0.4, n=60, cap=True):
    """A pale aspen stem or trunk: white on the lit (left) side, the mid tone
    on the shaded side. `knots` are (distance along from the base in px,
    side, depth 0..1): side -1 is a black knot dash running in from the lit
    edge (a lens, thicker at the edge), side +1 a dark lenticel scar running
    in from the shaded edge. Every mark touches the outline, so none is an
    enclosed dark dot. Returns (part id, mask)."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=cap)
    pid = s.part(m, base=2, k=0, line=0)
    w0, w1 = (width if isinstance(width, tuple) else (width, width))
    hws = [(w0 + (w1 - w0) * i / (len(path) - 1)) / 2 for i in range(len(path))]
    u, a = across(s, m, path, hws)
    s.decal(m & (u < white) & (u > -1.4), 3, on=[pid])
    for at, side, depth in knots:
        su = u * side                            # +1 at the marked edge
        lim = 1.0 - 2.0 * depth
        dash = m & (np.abs(a - at) < 0.55) & (su > lim)
        lens = m & (np.abs(a - at) < 1.3) & (su > 1.0 - 2.0 * depth * 0.35)
        s.decal(dash | lens, 0 if side < 0 else 1, on=[pid])
    return pid, m


def leaf_poly(cx, cy, r, ang, squash=1.0, teeth=11, tooth=0.45, point=0.28):
    """A nearly round aspen leaf with small rounded teeth and a short point,
    its axis at `ang` degrees (the tip). squash < 1 turns it edge-on."""
    pts = []
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    N = 72
    for k in range(N):
        t = 2 * math.pi * k / N
        rr = r * (1 + point * max(0.0, math.cos(t)) ** 10)
        if teeth and abs(math.cos(t)) < 0.93:    # teeth along the sides, not at the tip or stalk
            rr += tooth * max(0.0, math.cos(teeth * t)) ** 3
        x, y = rr * math.cos(t), rr * math.sin(t) * squash
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def leaf(s, cx, cy, r, ang, squash=1.0, glint=True, rib=True, under=False, line=0, teeth=11):
    """One round leaf in the mid tone: a dark crescent bottom-right, a dark
    midrib, a short white rim on the lit top-left. Edge-on (`under`), it
    flashes its pale underside: a white streak down its lit side."""
    m = s.poly(leaf_poly(cx, cy, r, ang, squash, teeth=teeth))
    pid = s.part(m, base=2, k=0, line=line)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    lit = (xx + 0.5 - tcx) * 0.6 + (yy + 0.5 - tcy) * 0.8
    rr = r * max(squash, 0.4)
    if under:
        s.decal(m & (lit < -rr * 0.2), 3, on=[pid])
        s.decal(m & (lit > rr * 0.55), 1, on=[pid])
        return pid, m
    s.decal(m & (lit > rr * 0.42), 1, on=[pid])
    if rib and r >= 4:
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        s.decal(s.line1([(cx - ca * r * 0.55, cy - sa * r * 0.55), (cx + ca * r * 0.65, cy + sa * r * 0.65)]),
                1, on=[pid])
    if glint:
        rim_white(s, m, pid, 0.3 if r >= 5 else 0.22)
    return pid, m


def stalk(s, ctrl, w=1.6):
    """A long flattened leaf stalk: a thin mid-tone line, black-outlined."""
    m = s.stroke(bez(ctrl, 30), w, cap=True)
    return s.part(m, base=2, k=0, line=0)


def soil(s, left, right, top=52.0, glint=True):
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    if glint:
        s.decal(s.line1([(left + 5, top + 2.5), (left + 9, top + 1.5)]), 3, on=[pid])
    return pid


def root(s, ctrl, width, n=60):
    """A pale root: the mid tone with a white streak along its lit top."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=2, k=0, line=0)
    top = m & ~shift(m, 0, -1)
    inner = shift(top, 0, -1) & m & ~top
    s.decal(inner if width_of(width) >= 3.5 else top, 3, on=[pid])
    bot = m & ~shift(m, 0, 1)
    s.decal(bot, 1, on=[pid])
    return pid, m


def width_of(w):
    return min(w) if isinstance(w, tuple) else w


def no_dots(t):
    """No enclosed dark dots: a small dark (black or dark-slot) island wholly
    ringed by light pixels takes the light tone (it would read as an eye)."""
    t = t.copy()
    h, w = t.shape
    dark = (t == 0) | (t == 1)
    seen = np.zeros_like(dark)
    for y0, x0 in zip(*np.nonzero(dark)):
        if seen[y0, x0]:
            continue
        comp, stack = [], [(y0, x0)]
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and dark[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        if len(comp) > 8:
            continue
        ring = {(y + dy, x + dx) for y, x in comp for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - set(comp)
        if all(0 <= y < h and 0 <= x < w and t[y, x] in (2, 3) for y, x in ring):
            for y, x in comp:
                t[y, x] = 2
    return t


def declot(t):
    """Black seams meeting inside the body clot into a blob: an interior
    black pixel with 7+ black 8-neighbours and no transparent one takes the
    dark tone."""
    t = t.copy()
    h, w = t.shape
    p = np.pad(t, 1, constant_values=T)
    blk = np.zeros((h, w), int)
    clear = np.zeros((h, w), bool)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            if (dy, dx) != (1, 1):
                blk += p[dy:dy + h, dx:dx + w] == 0
                clear |= p[dy:dy + h, dx:dx + w] == T
    t[(t == 0) & (blk >= 7) & ~clear] = 1
    return t


def blunt(t):
    """No 1px silhouette tips: a lone outline pixel poking out gets a black
    neighbour beside it."""
    t = t.copy()
    h, w = t.shape
    for _ in range(3):
        op = t != T
        p = np.pad(op, 1)
        n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        ys, xs = np.nonzero(op & (n == 1))
        if not len(xs):
            break
        for y, x in zip(ys, xs):
            vertical = (y > 0 and op[y - 1, x]) or (y < h - 1 and op[y + 1, x])
            cands = [(y, x - 1), (y, x + 1)] if vertical else [(y - 1, x), (y + 1, x)]
            for yy, xx in cands:
                if 0 <= yy < h and 0 <= xx < w and t[yy, xx] == T:
                    t[yy, xx] = 0
                    break
    return no_dots(declot(t))


def finish(s, **kw):
    return blunt(tones(s, **kw))


# ---------------------------------------------------- the leafy crown -----

def lobe_mask(s, cx, cy, rx, ry, leaf_r=2.1, gap=3.3):
    """One clump of the crown: an ellipse whose rim is a row of small round
    leaves (scallops), so its silhouette reads as round leaves at 1x."""
    polys = [[(cx + rx * math.cos(t), cy + ry * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 48, endpoint=False)]]
    per = math.pi * (3 * (rx + ry) - math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
    n = max(6, round(per / gap))
    for k in range(n):
        t = 2 * math.pi * (k + 0.5 * (int(cx + cy) % 2)) / n
        x, y = cx + rx * math.cos(t), cy + ry * math.sin(t)
        polys.append([(x + leaf_r * math.cos(u), y + leaf_r * math.sin(u)) for u in np.linspace(0, 2 * math.pi, 16)])
    return s.polys(polys)


def lobe_crown(s, lobes, quake=None, band=5.0, glints=True, leaf_r=2.1, hem=0):
    """The crown: clumps drawn bottom first, so each upper clump's hem
    overlaps the one below with a black line and casts a dark-slot shadow
    onto it (light from the top-left). Each clump: the mid tone, a dark
    crescent on its bottom-right, a short white glint arc inside its lit
    top-left (never along the crown's top edge). `quake` = a y: clumps near
    it shift a pixel toward the foe and their leaves twist, a scatter of
    white underside flashes (the intro's ripple). Returns (part ids, mask)."""
    drawn, union = [], np.zeros((s.h, s.w), bool)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    for cx, cy, rx, ry, gl in sorted(lobes, key=lambda l: -l[1]):
        tw = quake is not None and abs(cy - quake) < band
        if tw:
            cx -= 1.0
            cy -= 0.5
        m = lobe_mask(s, cx, cy, rx, ry, leaf_r=leaf_r)
        pid = s.part(m, base=2, k=0, line=hem)
        if drawn:
            cast = (shift(m, -1, -1) | shift(m, -1, -2)) & ~m
            s.decal(cast, 1, on=drawn)
        (tx, ty), = s.T([(cx, cy)])
        u = ((xx + 0.5 - tx) / (rx + 2)) * 0.6 + ((yy + 0.5 - ty) / (ry + 2)) * 0.8
        s.decal(m & (u > 0.5), 1, on=[pid])
        if tw:
            # twisting leaves: short white diagonal flashes on a loose lattice
            ph = (xx + 2 * yy + int(cx)) % 6
            lat = ((ph == 0) | (ph == 1)) & (yy % 3 != 0) & (u < 0.5)
            s.decal(m & lat & ~shift(~m, 0, -1) & ~shift(~m, -1, 0), 3, on=[pid])
        elif gl and glints:
            d = np.hypot((xx + 0.5 - tx) / rx, (yy + 0.5 - ty) / ry)
            ang = np.degrees(np.arctan2(yy + 0.5 - ty, xx + 0.5 - tx))
            arc = (d > 0.38) & (d < 0.62) & (ang > -165) & (ang < -110)
            s.decal(m & arc, 3, on=[pid])
        drawn.append(pid)
        union |= m
    return drawn, union


def loose_leaf(s, base, tip, r, ang, flash=False):
    """A single round leaf on its stalk, out at the crown's edge."""
    stalk(s, [base, tip], 1.4)
    if flash:
        return leaf(s, tip[0], tip[1], r * 1.05, ang + 50, squash=0.42, under=True, teeth=0)
    return leaf(s, tip[0], tip[1], r, ang, rib=False, teeth=0, glint=True)


# ------------------------------------------------------------ sucker ------

# per front frame: how far each leaf is twisted (0 rest .. 1 edge-on), a
# flutter wave from the lead leaf (left) to the rear ones (right)
SUCK_TWIST = [
    {"lead": 0.0, "head": 0.0, "rear": 0.0, "low": 0.0},
    {"lead": 1.0, "head": 0.3, "rear": 0.0, "low": 0.0},
    {"lead": 0.3, "head": 1.0, "rear": 0.3, "low": 0.0},
    {"lead": 0.0, "head": 0.3, "rear": 1.0, "low": 0.6},
    {"lead": 0.0, "head": 0.0, "rear": 0.3, "low": 1.0},
]


def sucker_leaf(s, base, tip, r, ang, twist, sway=(0.0, 0.0)):
    """A leaf on its long flattened stalk; `twist` turns it edge-on."""
    bx, by = base
    tx, ty = tip[0] + sway[0] * twist, tip[1] + sway[1] * twist
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    stalk(s, [(bx, by), ((bx + tx) / 2, (by + ty) / 2 - 1), (tx - ca * r * 0.8, ty - sa * r * 0.8)])
    if twist >= 0.7:
        return leaf(s, tx, ty, r * 1.05, ang + 35, squash=0.38, under=True)
    if twist > 0:
        return leaf(s, tx, ty, r, ang + 15, squash=0.75)
    return leaf(s, tx, ty, r, ang)


def sucker(s, fr=0):
    tw = SUCK_TWIST[fr]
    soil(s, 10, 50, top=51.5)
    # the root runner: a pale root crossing the soil from off the right edge
    root(s, [(60, 49.5), (50, 50.5), (40, 51.5), (30, 52.5), (21, 53.5), (14, 55.5)], (4.2, 2.6))
    # the stem pushing up from the runner (a C leaning to the foe)
    trunk(s, [(32, 53), (33.5, 45), (32, 36), (28.5, 27), (24.5, 19)], (4.6, 2.6),
          knots=[(9, -1, 0.5), (15, 1, 0.45), (22, -1, 0.4)])
    # the rear leaves first (behind the stem), then the lead and head
    sucker_leaf(s, (33, 41), (44, 38), 5.6, 15, tw["low"], (0, 1))
    sucker_leaf(s, (30.5, 30), (40, 21), 6.0, -35, tw["rear"], (1, -1))
    # the tremble leaf: caught mid-tremble at rest, twisted edge-on
    stalk(s, [(27, 24), (31, 17), (35, 12)])
    leaf(s, 37.5, 10.0, 5.4, -20, squash=0.38, under=True)
    sucker_leaf(s, (31, 37), (16.5, 31), 7.2, 185, tw["lead"], (0, -1))
    sucker_leaf(s, (25, 20), (19.5, 15), 6.6, -140, tw["head"], (0, 1))


# ------------------------------------------------------------- adult ------

# The main crown's clumps: (cx, cy, rx, ry, glint), a narrow crown leaning
# over the foe, the top clump left of the trunk's foot.
CROWN = [(17.5, 6.5, 6.0, 5.0, True), (11.5, 14.0, 5.5, 5.0, True), (24.0, 12.5, 5.5, 5.0, False),
         (16.5, 20.5, 6.5, 5.0, True), (26.5, 21.0, 4.5, 4.5, False), (21.0, 27.5, 6.0, 3.8, False)]
CLONE = [(45.5, 26.0, 4.5, 4.0, True), (43.5, 32.5, 4.5, 3.5, False), (49.0, 31.5, 3.5, 3.5, False)]
QUAKE = [None, 6.0, 14.0, 21.0, 27.5]


def adult(s, fr=0):
    quake = QUAKE[fr]
    s.ox = 1
    soil(s, 12, 54, top=52.5, glint=False)
    # the shared root lying across the soil, off to both sides
    root(s, [(10, 55.5), (18, 53.5), (28, 52.8), (38, 52.5), (46, 53.0), (56, 54.5)], (3.6, 3.0))
    # the clone: a second, smaller trunk rising from the same root
    trunk(s, [(44, 53.5), (44.5, 46), (45.5, 39), (46, 33)], (4.4, 3.2),
          knots=[(5, 1, 0.55), (10, -1, 0.5), (16, 1, 0.5)])
    lobe_crown(s, CLONE, None if quake is None else quake + 8)
    # the main trunk leaning toward the foe
    trunk(s, [(31, 54), (31, 47), (29, 39), (26, 31), (22, 22)], (7.0, 4.6),
          knots=[(4, -1, 0.45), (9, 1, 0.5), (14, -1, 0.55), (19, 1, 0.45), (25, -1, 0.4)])
    lobe_crown(s, CROWN, quake)
    # a loose round leaf trembling out on the foe side
    fl = quake is not None
    loose_leaf(s, (8, 18), (4.0, 23.0), 3.0, 120, flash=fl and quake >= 14)


# ------------------------------------------------------------- frames -----

def front(sid, fr=0):
    s = Spr(56, 56, tuple(PALS[sid][1:]))
    (sucker if sid == IDS[0] else adult)(s, fr)
    return finish(s)


def back(sid):
    """Behind and above: the plant leaning toward the foe (top-right), its
    base cut off by the screen's bottom edge."""
    s = Spr(48, 48, tuple(PALS[sid][1:]))
    if sid == IDS[0]:
        # the runner crossing the bottom, the stem rising to the top-right
        root(s, [(-4, 44), (10, 44.5), (24, 45), (36, 44), (52, 43)], (5.5, 4.5))
        trunk(s, [(22, 50), (23, 40), (27, 30), (32, 22)], (6, 3.6), knots=[(8, 1, 0.5), (14, -1, 0.45)])
        # leaves seen from behind and above: round discs, the biggest nearest
        stalk(s, [(25, 34), (17, 30), (12, 28)], 2)
        stalk(s, [(28, 28), (35, 24), (39, 20)], 2)
        leaf(s, 10, 27, 8.0, -160)
        leaf(s, 38.5, 32, 7.0, 20)
        leaf(s, 38, 18, 7.5, -40)
        leaf(s, 22, 14.5, 8.5, -110)
        leaf(s, 32, 7.5, 6, -60, squash=0.4, under=True)
    else:
        trunk(s, [(10, 50), (10, 42), (11, 36)], (5, 4), knots=[(4, 1, 0.5)])
        lobe_crown(s, [(11, 31, 6.0, 5.0, True), (8, 37, 4.0, 3.5, False), (15, 37, 4.0, 3.5, False)])
        trunk(s, [(25, 50), (26, 40), (29, 30), (32, 22)], (8, 6),
              knots=[(4, -1, 0.45), (10, 1, 0.5), (16, -1, 0.5)])
        # the crown from behind and above: its clumps' tops, leaning to the
        # top-right toward the foe
        lobe_crown(s, [(31, 6, 8.0, 5.5, True), (21, 12, 7.0, 6.0, True), (38, 13, 7.0, 6.0, True),
                       (28, 18, 8.5, 6.0, False), (19, 24, 6.5, 4.5, False), (37, 24, 6.0, 4.5, False),
                       (29, 27, 6.0, 4.0, False)])
    return finish(s, open_bottom=True)


ICONS = {
    # a pale stem on its root runner, round leaves on stalks, the head leaf
    # leaning left and one leaf at the top right twisted edge-on
    "aspen_sucker": [
        "...222..........",
        "..23322.....3...",
        ".232222....32...",
        ".2222221..321...",
        "..222211.321....",
        "...2111..2......",
        ".......32.......",
        "..22...32..222..",
        ".2332..32.23221.",
        ".22222232222221.",
        "..2221.32..2211.",
        ".......32.......",
        "..333333233333..",
        "..222222222222..",
    ],
    # the white trunk leaning left under a narrow golden crown, a small
    # second trunk rising from the same root
    "quaking_aspen": [
        "...22.22........",
        "..2332222.......",
        ".232222221......",
        ".22222222211....",
        "..222222111.....",
        "...2211111......",
        "......k2........",
        "......32....22..",
        "......32...2322.",
        ".......32..2221.",
        ".......k2...32..",
        ".......32...32..",
        "...333333333332.",
        "...22222222222..",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    for sid in IDS:
        fs = [front(sid, f) for f in range(5)]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


def review_layout(art, extra=None, name="aspen"):
    """Each species' front, back and icon at 3x in one row (plus 1x)."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    items = [(sid, art[sid], PALS[sid]) for sid in IDS] + list(extra or [])
    for scale, fname in ((1, f"{name}_1x.png"), (3, f"{name}_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(items) * scale, 56 * scale), (200, 208, 200))
        for n, (sid, (fs, b, icons), pal) in enumerate(items):
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / fname)


NOTES = {
    "aspen_sucker": "REARING: a slender pale stem pushing up from a visible root runner, a pale root "
                    "crossing the soil from off-frame; round, finely toothed sage leaves on long "
                    "flattened stalks, the head leaf tilted at the foe, the lead leaf raised, and one "
                    "leaf caught mid-tremble, twisted edge-on to show its pale underside. Gesture: "
                    "the leaves tremble, a flutter wave running from the lead leaf to the rear ones; "
                    "the stem, root and soil stay fixed.",
    "quaking_aspen": "LOOMING: a tall, slim, white-barked trunk leaning toward the foe, marked with "
                     "dark horizontal knots and lenticel scars, under a narrow crown of golden round "
                     "leaves; a second, smaller trunk rises from the same root at the base (a clone). "
                     "Gesture: the whole crown quakes, a band of leaves twisting edge-on to flash "
                     "their pale undersides from the top of the crown to the bottom, then it "
                     "settles; trunks, root and soil stay fixed.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PALS[sid], sport=SPORTS[sid], front=fs, back=[b], icon=icons,
                      anim=SUCKER_ANIM if sid == IDS[0] else ADULT_ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Populus tremuloides. " + NOTES[sid] +
                      " Mid tone (pale sage for the sucker, pale gold for the adult) over a deep "
                      "gold-olive dark slot (leaf shade, knots, soil); the pale bark is white plus the "
                      "mid tone. Sport: the autumn-red colour form some aspen clones show, a natural "
                      "colour variation rather than a cultivar.",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Populus tremuloides, "
                      "https://en.wikipedia.org/wiki/Populus_tremuloides . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
