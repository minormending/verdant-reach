"""Original Crystal-rule Dracaena cinnabari (Socotra dragon tree):
dragon_seedling -> dragon_sapling -> dragon_tree.

dragon_seedling (baby), BRACED: a stiff, low, wide rosette of thick,
keeled, sword-shaped blue-green leaves on a stubby grey stem, the big lead
sword held forward-left like a shield and the rear ones fanned up and back.
One bead of red resin oozes at the stem's foot: the line's accent,
"dragon's blood".
dragon_sapling (teen), BRACED, "Umbrella Pup": a short, thick grey trunk
forked once (dichotomous branching), each fork tipped with a dense tuft of
stiff, upward-pointing swords, the lead tuft lower and forward. A red resin
drop hangs from a cut in the bark's lit edge.
dragon_tree (adult), LOOMING: the umbrella crown. A dense, flat-topped,
upturned canopy with a fringe of leaf points leans over the foe like a huge
parasol, on a fan of repeatedly forking branches over a thick grey trunk.
The canopy's underside is one dark band whose top edge is a row of leaf
points, so the umbrella reads at 1x; one cut on the trunk weeps red resin.

Intro: the crown spreads and lifts (the outer swords and rim tufts flex
outward and up) while the resin bead stretches and a drop falls from the
cut, then it settles. Trunk, roots and the central swords stay registered.
Two tones: blue-green leaf (mid) over a deep resin red-brown (dark slot)
that is the resin, the bark shading and the crown's underside. The grey
bark is the dark slot split by white ridges on the lit side.
Faces: no enclosed dark dots. Resin beads hang off a silhouette edge (never
a dot on the bark), rosette hubs are de-clotted, and the crown has no
internal horizontal seams.
Sport: the paler grey-green foliage of the related Canary Islands dragon
tree (Dracaena draco), a natural colour of the genus; see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): seedling 8, sapling 8, tree 9.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, hop, icon_arr, moving_boxes, qbez, shift, tones

TOOL = "tools/art/crystal/dragontree.py"
IDS = ["dragon_seedling", "dragon_sapling", "dragon_tree"]
PAL = [BLACK, "#883038", "#5898a0", WHITE]
SPORT = [BLACK, "#884038", "#a0b898", WHITE]
SPAL = tuple(PAL[1:])
FLEX = [0.0, -1.0, 2.5, 1.2, -0.4]           # crown spread per front frame (+ = out and up)
DROP = [None, None, 0, 1, 2]                 # resin drop fall stage per front frame
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 10], [0, 8]]}


# ------------------------------------------------------------- parts ------

def sword_poly(base, tip, w, bend=0.0, n=48):
    """A thick, stiff, sword-shaped leaf: near-parallel sides from a slightly
    pinched base, tapering only over its last third to a sharp point.
    Returns (outline polygon, midrib path, half-widths)."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
    path = qbez(base, c, tip, n)
    left, right, hws = [], [], []
    for i, (x, y) in enumerate(path):
        t = i / (n - 1)
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ll = math.hypot(dx, dy) or 1.0
        ux, uy = -dy / ll, dx / ll
        hw = w / 2 * (0.75 + 0.25 * min(1.0, t / 0.15)) * min(1.0, (1.0 - t) / 0.4) ** 0.8
        hws.append(max(hw, 0.3))
        left.append((x + ux * hw, y + uy * hw))
        right.append((x - ux * hw, y - uy * hw))
    return left + right[::-1], path, hws


def across(s, m, path, hws):
    """Per pixel of mask m: (u, t), u the signed position across the form
    (-1 = its lit, top-left edge, +1 = its shaded edge) and t the position
    along it (0 = base, 1 = tip)."""
    P = np.array(s.T(list(path)))
    ys, xs = np.nonzero(m)
    q = np.stack([xs + 0.5, ys + 0.5], 1)
    d = np.linalg.norm(q[:, None, :] - P[None, :, :], axis=2)
    k = d.argmin(1)
    tang = np.gradient(P, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    # orient each normal toward the shade (bottom-right)
    flip = (nrm[:, 0] * 0.6 + nrm[:, 1] * 0.8) < 0
    nrm[flip] *= -1
    sd = ((q - P[k]) * nrm[k]).sum(1)
    hw = np.array(hws)[k] * getattr(s, "sc", 1.0)
    u = np.zeros(m.shape)
    t = np.zeros(m.shape)
    u[ys, xs] = np.clip(sd / np.maximum(hw, 0.5), -1.5, 1.5)
    t[ys, xs] = k / (len(path) - 1)
    return u, t


def sword(s, base, tip, w, bend=0.0, gloss=(0.15, 0.64), shade=True):
    """A keeled sword leaf: leaf green, a crisp dark crescent along its
    shaded (bottom-right) edge, and a short white gloss streak inside the lit
    edge. Returns part id."""
    poly, path, hws = sword_poly(base, tip, w, bend)
    m = s.poly(poly)
    pid = s.part(m, base=2, k=0, line=0)
    u, t = across(s, m, path, hws)
    if shade:
        # the shaded side of the rosette folds into a dark crescent; leaves
        # facing the light keep only a thin one, narrow leaves none
        facing = math.atan2(tip[1] - base[1], tip[0] - base[0])
        lit_leaf = math.cos(facing) < -0.2
        if w >= 4.2 or not lit_leaf:
            s.decal(m & (u > (0.62 if lit_leaf else 0.5)) & (t < 0.9), 1, on=[pid])
    if gloss:
        a, b = gloss
        s.decal(m & (u < -0.3) & (u > -0.8) & (t > a) & (t < b), 3, on=[pid])
    return pid


def bark(s, ctrl, width, n=60, cap=True, ridges=True, one=False):
    """A grey woody limb. The shaded side is the dark slot; the lit side is
    white ridges split by dark fissures that run along the limb, so at 1x
    the bark reads pale silvery grey. The lit edge itself stays dark (no
    continuous white edge)."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=cap)
    pid = s.part(m, base=1, k=0, line=0)
    w0 = width[0] if isinstance(width, tuple) else width
    w1 = width[1] if isinstance(width, tuple) else width
    hws = [(w0 + (w1 - w0) * i / (len(path) - 1)) / 2 for i in range(len(path))]
    if ridges:
        u, t = across(s, m, path, hws)
        hw = np.array(hws).mean()
        x = (u + 1) * hw                        # pixels from the lit edge
        lit = m & (x >= 0.8) & (u < (0.6 if min(w0, w1) >= 9 else 0.45)) & (t > 0.04)
        if one or min(w0, w1) < 5.5:
            lit &= x < 1.8                      # a thin limb: one ridge
        col = np.floor(x - 0.8).astype(int)
        fissure = (col % 4) == 3
        L = sum(math.dist(path[i], path[i + 1]) for i in range(len(path) - 1))
        along = np.floor(t * L).astype(int)
        gap = ((along + col * 5) % 11) == 0         # rare staggered breaks in each ridge
        s.decal(lit & ~fissure & ~gap, 3, on=[pid])
    return pid, m, path


def resin(s, x, y, size=1.0, tail=0.0, glint=True, ring=True):
    """A bead of red resin: a teardrop hanging from (x, y - tail), its lit
    shoulder glinting white. Drawn in the dark slot with a black ring."""
    r = 1.7 * size
    pts = []
    for k in range(24):
        a = 2 * math.pi * k / 24
        yy = y + r * math.sin(a)
        xx = x + r * math.cos(a)
        if math.sin(a) < 0:   # the upper half pulls up into a point
            yy = y + (r + tail) * math.sin(a)
            xx = x + r * math.cos(a) * (1 - 0.55 * (-math.sin(a)) ** 1.5)
        pts.append((xx, yy))
    m = s.poly(pts)
    pid = s.part(m, base=1, k=0, line=0 if ring else None)
    if glint:
        # a curved glint hugging the lit shoulder, never a dot in the middle
        s.decal(s.line1([(x - r * 0.7, y + 0.2), (x - r * 0.62, y - r * 0.45), (x - r * 0.2, y - r * 0.8)]),
                3, on=[pid])
    return pid


def soil(s, left, right, top=52.0):
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 5, top + 2.5), (left + 10, top + 1.5)]), 3, on=[pid])
    return pid


def tuft(s, cx, cy, leaves, flex=0.0, spread=1.0, stiff=False, grow=0.0):
    """A dense tuft: stiff swords radiating from (cx, cy), drawn back to
    front. Each leaf is (angle deg, length, width, bend); angles fan out by
    `flex` degrees per unit of spread (the intro's outward flex)."""
    out = []
    for a, L, w, bend in leaves:
        L += grow
        if stiff:   # the central swords stay put; the outer ones flex out
            a2 = a + flex * 4.0 * (1 if a > -90 else -1) * spread * (abs(a + 90) / 80) ** 1.5
            L2 = L
        else:
            a2 = a + flex * 4.0 * (1 if a > -90 else -1) * spread * min(1.0, abs(a + 90) / 50 + 0.3)
            L2 = L * (1 + 0.02 * flex)
        r = math.radians(a2)
        tip = (cx + L2 * math.cos(r), cy + L2 * math.sin(r))
        out.append(sword(s, (cx, cy), tip, w, bend))
    return out


# ------------------------------------------------------------ seedling ----

SEED_LEAVES = [   # (angle, length, width, bend): back to front
    (-46, 19, 5.8, 0.06), (-20, 18, 5.8, 0.08), (-2, 14, 5.2, 0.10), (-72, 20, 6.2, 0.03),
    (-98, 21, 6.4, 0.0), (-124, 21, 6.4, -0.03), (-150, 22, 6.6, -0.05),
    (-175, 22, 7.0, -0.06),
]


def seedling(s, flex=0.0, drop=None):
    s.ox = 2
    bark(s, [(29, 53), (25, 52), (20, 54)], (4.5, 2.5), ridges=False)
    bark(s, [(31, 53), (36, 52), (41, 54)], (4.5, 2.5), ridges=False)
    bark(s, [(30, 54), (30, 50), (29, 44)], (11, 8.5), one=True)
    tuft(s, 29, 42, SEED_LEAVES, flex, stiff=True)
    # the bead of dragon's blood oozing at the stem's foot (it swells and sags in the intro)
    swell = drop in (0, 1)
    resin(s, 22.0, 50.5 + (0.5 if swell else 0.0), 1.95 + (0.2 if swell else 0.0), tail=1.8, ring=True)


# ------------------------------------------------------------- sapling ----

SAP_REAR = [(-32, 12, 4.8, 0.06), (-54, 15, 5.0, 0.04), (-128, 13, 4.8, -0.04), (-12, 9, 4.6, 0.08),
            (-76, 17, 5.4, 0.02), (-102, 16, 5.4, -0.02), (-150, 11, 4.8, -0.06)]
SAP_LEAD = [(-40, 15, 5.2, 0.06), (-18, 12, 5.0, 0.08), (-62, 18, 5.6, 0.04), (-150, 15, 5.4, -0.05),
            (-84, 19, 6.0, 0.01), (-106, 19, 6.0, -0.02), (-128, 18, 5.8, -0.04), (-170, 11, 5.2, -0.07)]


def sapling(s, flex=0.0, drop=None):
    s.ox = 2
    soil(s, 13, 47)
    bark(s, [(25, 54), (23, 52), (19, 54)], (4.5, 2.5), ridges=False)
    bark(s, [(33, 54), (36, 52), (40, 54)], (4.5, 2.5), ridges=False)
    bark(s, [(32, 40), (36, 34), (39, 27)], (7, 5.5))       # rear fork
    bark(s, [(27, 41), (21, 37), (17, 32)], (8, 6))         # lead fork
    bark(s, [(29, 54), (29.5, 47), (29.5, 39)], (12, 10))   # trunk
    with s.rotated(-flex * 0.5, 33, 34):
        tuft(s, 39, 27, SAP_REAR, flex, spread=0.7, stiff=True)
    with s.rotated(flex * 0.5, 28, 36):
        tuft(s, 17, 32, SAP_LEAD, flex, spread=0.7, stiff=True)
    weep(s, 24.0, 41.0, drop, fall=(48.0, 51.0))


# --------------------------------------------------------------- adult ----

def clump(s, cx, cy, rx, ry, teeth=5, depth=0.22, flat=0.35, a0=0.0, shade=True, splits=False):
    """One dense leaf tuft of the umbrella crown seen from the side: a fan
    of stiff upturned swords radiating from a hidden base, so its rim is a
    row of leaf points and its foot is cut nearly flat. Leaf green, merged
    with its neighbours (no internal seams); optional short dark creases at
    the notches between leaf points and a dark bottom-right crescent.
    Returns (part id, mask, leaf angles)."""
    pts, angs = [], []
    n = teeth * 2
    lo, hi = math.pi * 1.04, math.pi * 1.96
    for i in range(n + 1):
        a = lo + (hi - lo) * i / n + a0
        r = 1.0 if i % 2 == 1 else 1.0 - depth
        if i % 2 == 1:
            angs.append(a)
        pts.append((cx + rx * r * math.cos(a), cy + ry * r * math.sin(a)))
    pts += [(cx + rx * 0.9, cy + ry * flat), (cx, cy + ry * flat * 1.25), (cx - rx * 0.9, cy + ry * flat)]
    m = s.poly(pts)
    pid = s.part(m, base=2, k=1 if shade else 0, shadow=(1, 1), sh_tone=1, line=None)
    for i in (range(2, n, 2) if splits else ()):
        # a short split down from each notch between leaf points; it starts on
        # the outline, so it is a crease, never a floating dash
        a = lo + (hi - lo) * i / n + a0
        p0 = (cx + rx * (1 - depth + 0.08) * math.cos(a), cy + ry * (1 - depth + 0.08) * math.sin(a))
        p1 = (cx + rx * (1 - depth - 0.22) * math.cos(a), cy + ry * (1 - depth - 0.22) * math.sin(a))
        s.decal(s.line1([p0, p1]), 1, on=[pid])
    return pid, m, angs


def gloss(s, pid, cx, cy, rx, ry, angs, k=2):
    """Short white streaks along the lit leaves (the ones facing up-left),
    kept inside the tuft so no white runs along the crown's edge."""
    lit = sorted(angs, key=lambda a: math.cos(a) * 0.6 + math.sin(a) * 0.8)[:k]
    for a in lit:
        p0 = (cx + rx * 0.2 * math.cos(a), cy + ry * 0.2 * math.sin(a))
        p1 = (cx + rx * 0.58 * math.cos(a), cy + ry * 0.58 * math.sin(a))
        s.decal(s.line1([p0, p1]), 3, on=[pid])


# The crown's tufts, back row first: (cx, cy, rx, ry, teeth, gloss and creases)
CROWN = [
    (15, 11, 11, 8, 5, True), (31, 9, 11, 8, 5, True), (45, 12, 8, 7, 4, False),
    (10, 18, 8, 6.5, 4, True), (25, 19, 11, 8, 5, False), (42, 18, 10, 7.5, 5, False),
]
BRANCHES = [  # (ctrl, width): the forks under the crown, back first
    ([(36, 36), (41, 31), (45, 20)], (4.5, 3.5)),
    ([(36, 35), (35, 30), (35, 20)], (4, 3)),
    ([(27, 36), (25, 30), (23, 20)], (4, 3)),
    ([(27, 37), (20, 32), (13, 20)], (4.5, 3.5)),
    ([(31, 40), (34, 37), (37, 34)], (6, 5)),
    ([(31, 40), (29, 37), (26, 35)], (6, 5)),
]


AXIS = 29.0


def crown(s, flex=0.0, under=True, clumps=CROWN, body=None):
    """The umbrella crown: tufts over a solid core, a leaf-pointed dark
    underside band, a shade crescent on the right flank and a few glosses."""
    # a solid body behind the tufts, so no air hole opens between them
    bx, by, brx, bry = body or (AXIS - 1, 14.5, 19, 6.5)
    core = s.ellipse(bx, by - flex * 0.3, brx + flex * 0.8, bry)
    drawn = [s.part(core, base=2, k=0, line=1)]
    mask = core.copy()
    placed = []
    for cx, cy, rx, ry, teeth, gl in clumps:
        # the umbrella opens: tufts spread out from the trunk axis and the
        # rim tufts turn up, while the crown's top stays put
        e = (cx - AXIS) / 18.0
        dx = flex * 0.6 * e
        dy = max(-flex * 0.9 * abs(e), 1.0 - (cy - ry))   # never past the canvas top
        pid, m, angs = clump(s, cx + dx, cy + dy, rx, ry, teeth, shade=False, splits=gl)
        drawn.append(pid)
        placed.append((pid, cx + dx, cy + dy, rx, ry, gl, angs))
        mask |= m
    if under:
        # the umbrella's underside: one dark shadow band along the crown's base
        # whose top edge is a row of leaf points: the drooping leaves of the
        # underside, pointing up into the lit green above
        ys, xs = np.nonzero(mask)
        bot = np.full(s.w, -1)
        for x in range(s.w):
            col = ys[xs == x]
            if len(col):
                bot[x] = col.max()
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        ph = (xx + int(round(flex))) % 6
        tooth = np.where(ph < 3, ph, 6 - ph)            # 0..3..0: a sawtooth of points
        band = mask & (yy > bot[xx] - 3 - tooth) & (bot[xx] >= 0)
        s.decal(band, 1, on=drawn)
    # one crisp shade crescent down the crown's right (shaded) flank
    xx = np.mgrid[0:s.h, 0:s.w][1]
    flank = mask & ~shift(mask, 1, 0) & (~shift(mask, 2, 1) | (xx > s.w * 0.6))
    s.decal(flank, 1, on=drawn)
    for pid, cx, cy, rx, ry, gl, angs in placed:
        if gl:
            gloss(s, pid, cx, cy, rx, ry, angs)
    return drawn, mask


def weep(s, x, y, drop=None, fall=None, size=1.0):
    """A cut in the bark's lit (left) edge at (x, y) weeping red resin: a
    black notch, and below it a teardrop bead of dark red resin hanging off
    the edge into the air, black-ringed, its lit shoulder glinting. Seen
    against the sky it reads as a drop, never as a dot on the bark.
    `drop` 0..2 for the intro: the bead stretches and sags, a drop falls
    free (`fall` = its y positions) while the bead re-forms."""
    s.ink(s.line1([(x - 0.5, y - 0.5), (x + 2.0, y + 0.3)]), 0)
    stretch = drop == 0
    r = 1.9 * size
    by = y + 2.0 + r + (1.0 if stretch else 0.0)
    falling = fall is not None and drop in (1, 2)
    rr = r * (0.85 if falling else 1.0)
    pid = s.part(teardrop(s, x - 0.6, by, rr, tail=1.6 + (1.0 if stretch else 0.0)), base=1, k=0, line=0)
    s.decal(s.line1([(x - 0.6 - rr * 0.6, by + 0.3), (x - 0.6 - rr * 0.55, by - rr * 0.5),
                     (x - 0.6 - rr * 0.1, by - rr * 0.85)]), 3, on=[pid])
    if falling:
        s.part(teardrop(s, x - 2.6, fall[drop - 1], 1.35, tail=1.0), base=1, k=0, line=0)


def teardrop(s, x, y, r, tail=0.0):
    pts = []
    for k in range(24):
        a = 2 * math.pi * k / 24
        xx, yy = x + r * math.cos(a), y + r * math.sin(a)
        if math.sin(a) < 0:
            yy = y + (r + tail) * math.sin(a)
            xx = x + r * math.cos(a) * (1 - 0.5 * (-math.sin(a)) ** 1.5)
        pts.append((xx, yy))
    return s.poly(pts)


def adult(s, flex=0.0, drop=None):
    s.ox = 0
    soil(s, 11, 51)
    bark(s, [(26, 54), (23, 52), (19, 55)], (4.5, 3), ridges=False)
    bark(s, [(36, 54), (39, 52), (43, 55)], (4.5, 3), ridges=False)
    for ctrl, w in BRANCHES[:4]:
        e = (ctrl[2][0] - AXIS) / 18.0
        c = [ctrl[0], ctrl[1], (ctrl[2][0] + flex * 0.6 * e, ctrl[2][1] - flex * 0.9 * abs(e))]
        bark(s, c, w)
    for ctrl, w in BRANCHES[4:]:
        bark(s, ctrl, w)
    bark(s, [(31, 54), (31, 46), (31, 37)], (12, 9))
    crown(s, flex)
    weep(s, 25.0, 39.0, drop, fall=(46.5, 49.5), size=1.1)


# ------------------------------------------------------------- frames -----

def no_dots(t):
    """No enclosed dark dots: a small dark (black or resin) island wholly
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
        if len(comp) > 6:
            continue
        ring = {(y + dy, x + dx) for y, x in comp for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - set(comp)
        if all(0 <= y < h and 0 <= x < w and t[y, x] in (2, 3) for y, x in ring):
            for y, x in comp:
                t[y, x] = 2
    return t


def declot(t):
    """Where many black seams meet inside the body (a rosette's hub) they
    clot into a black blob that reads as an eye: an interior black pixel with
    7+ black 8-neighbours and no transparent neighbour takes the dark tone."""
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
    neighbour beside it, so every leaf point ends in a 2px cap."""
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


DRAW = {"dragon_seedling": seedling, "dragon_sapling": sapling, "dragon_tree": adult}


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    DRAW[sid](s, FLEX[frame], DROP[frame])
    return blunt(tones(s))


BACK_SEED = [   # the rosette from behind and above: a starburst of swords, the longest toward the foe
    (140, 18, 10.5, 0.04), (40, 19, 10.5, -0.04), (166, 19, 10.5, 0.04), (14, 21, 10.5, -0.04),
    (-172, 23, 11.0, 0.05), (-8, 24, 11.0, -0.06),
    (-148, 26, 11.5, 0.05), (-32, 27, 11.5, -0.05), (-124, 29, 12.0, 0.04),
    (-56, 32, 12.0, -0.04), (-100, 32, 12.5, 0.02), (-78, 35, 12.5, 0.0),
]
BACK_REAR = [(150, 11, 7.0, 0.04), (30, 11, 7.0, -0.04), (-185, 13, 7.2, 0.04), (5, 13, 7.2, -0.05),
             (-155, 15, 7.6, 0.03), (-25, 15, 7.6, -0.03), (-125, 17, 8.0, 0.0), (-55, 17, 8.0, 0.0),
             (-90, 18, 8.0, 0.0)]
BACK_LEAD = [(150, 12, 7.4, 0.04), (30, 12, 7.4, -0.04), (-185, 14, 7.6, 0.05), (5, 15, 7.6, -0.06),
             (-155, 17, 8.2, 0.03), (-25, 18, 8.2, -0.05), (-125, 20, 8.6, 0.01), (-55, 21, 8.6, -0.02),
             (-88, 22, 8.8, 0.0)]
BACK_CROWN = [
    (10, 12, 9, 7, 4, True), (24, 9, 10.5, 8, 5, True), (38, 9, 9, 7.5, 4, False),
    (7, 22, 7, 7, 4, True), (20, 20, 10.5, 8.5, 5, False), (34, 19, 10, 8.5, 5, False), (42, 22, 5, 6, 3, False),
    (13, 29, 9.5, 7, 4, False), (29, 29, 10.5, 7.5, 5, False), (41, 30, 6, 6, 3, False),
]


def back(sid):
    """Behind and above: the same plant leaning toward the foe (top-right),
    its base cut off by the screen's bottom edge. The rosette, the forked
    tufts and the umbrella crown stay the biggest shapes; the trunks' resin
    beads stay in view."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        # from above the rosette hides its stem and the resin bead at its foot
        bark(s, [(21, 50), (21, 47), (22, 44)], (13, 11))
        tuft(s, 23, 39, BACK_SEED)
    elif sid == IDS[1]:
        bark(s, [(23, 35), (29, 29), (32, 23)], (9, 7.5))                  # lead fork (right)
        bark(s, [(21, 36), (17, 31), (14, 27)], (8.5, 7))                  # rear fork (left)
        bark(s, [(22, 50), (22, 42), (22, 33)], (19, 14))
        weep(s, 13.5, 35.0, None, size=1.2)
        tuft(s, 14, 27, BACK_REAR, grow=2)
        tuft(s, 32, 23, BACK_LEAD, grow=2)
    else:
        for ctrl, w in (([(25, 41), (33, 36), (40, 30)], (6, 5)), ([(23, 41), (14, 36), (8, 30)], (6, 5)),
                        ([(24, 40), (25, 35), (27, 30)], (5.5, 4.5))):
            bark(s, ctrl, w)
        bark(s, [(23, 50), (24, 44), (24, 38)], (15, 12))
        crown(s, 0.0, clumps=BACK_CROWN, body=(24, 20, 21, 9))
        weep(s, 17.0, 38.0, None, size=1.2)
    return blunt(tones(s, open_bottom=True))


ICONS = {
    # a stiff rosette of swords on a stub, the resin bead at its foot
    # (interiors only: icon_arr closes the full black outline around them)
    "dragon_seedling": [
        ".......2........",
        ".......2....2...",
        "...2...32..22...",
        "...22..32.22....",
        "....22.3222.....",
        "..2..223222..2..",
        "..332222222222..",
        "...33222222211..",
        ".....2111111....",
        "...1..131.......",
        "..131.1311......",
        "..111.1111......",
    ],
    # a short thick grey trunk forked once, a tuft of swords on each fork
    "dragon_sapling": [
        "...2..2....2....",
        "..2..22...22.2..",
        "...2.32..32.2...",
        "..2232222.232...",
        "...3322222.222..",
        "..3322221.2221..",
        "....22211..11...",
        "......11..11....",
        ".......1111.....",
        ".......3111.....",
        "......33111.....",
        "......31111.....",
        ".....311111.....",
        "....11111111....",
    ],
    # the umbrella: a flat-topped crown, its underside one dark band, on forks
    "dragon_tree": [
        "....k.kk.kk.k...",
        "...k2k22k22k2k..",
        "..k2332222222kk.",
        ".k233222222222k.",
        ".k222222222222k.",
        ".k121112111211k.",
        "..kk11111111kk..",
        "...kk1kk1k1kk...",
        "....k1k11k1k....",
        ".....k1331k.....",
        ".....k1331k.....",
        ".....k3311k.....",
        "....k1111111k...",
        "....kkkkkkkkk...",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    for sid in IDS:
        fs = [front(sid, f) for f in range(len(FLEX))]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


def review_layout(art, folder=None, frames=False):
    """The lead's layout: each species' front, back and icon at 3x, one row."""
    from kit import to_rgba
    folder = Path(folder) if folder else Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "dragontree_1x.png"), (3, "dragontree_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / name)
    if frames:
        for scale in (1, 3):
            sheet = Image.new("RGB", ((56 * 5 + 48 + 16 * 4 + 40) * scale, 64 * 6 * scale), (200, 208, 200))
            for n, sid in enumerate(IDS):
                fs, b, icons = art[sid]
                for row, pal in enumerate((PAL, SPORT)):
                    x = 0
                    for arr in fs + [b] + icons:
                        im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                        im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                        sheet.paste(im, (x * scale, ((n * 2 + row) * 64 + 60) * scale - im.height), im)
                        x += im.width // scale + 8
            sheet.save(folder / f"dragontree_frames_{scale}x.png")


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    poses = {
        "dragon_seedling": "BRACED: a stiff, low, wide rosette of thick sword-shaped blue-green leaves "
                           "on a stubby grey stem, the big lead sword held forward-left like a shield, "
                           "one bead of red resin (dragon's blood) oozing at the foot.",
        "dragon_sapling": "BRACED: a short thick grey trunk forked once (dichotomous branching), each "
                          "fork tipped with a dense tuft of stiff upward-pointing swords, the lead tuft "
                          "lower and forward; a red resin drop hangs from a cut in the bark.",
        "dragon_tree": "LOOMING: a dense, flat-topped, upturned umbrella crown leaning over the foe "
                       "on a fan of repeatedly forking branches over a thick grey trunk; the crown's "
                       "underside is one dark band fringed with leaf points, and a cut on the "
                       "trunk weeps red resin.",
    }
    gestures = {
        "dragon_seedling": "the outer swords flex out and up while the resin bead swells and sags, then "
                           "it settles; the stem and the central swords stay fixed.",
        "dragon_sapling": "both tufts flex out and up while the resin bead stretches and a drop falls "
                          "from the cut, then it settles; trunk, roots and ground stay fixed.",
        "dragon_tree": "the umbrella spreads and its rim lifts while the resin bead stretches and a "
                       "drop falls from the cut, then it settles; trunk, roots and ground stay fixed.",
    }
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Dracaena cinnabari. " + poses[sid] +
                      " Gesture: " + gestures[sid] + " Blue-green leaf over a deep resin red-brown that is the resin, the bark shading "
                      "and the crown's underside (dark slot); white ridges on the lit side make the "
                      "bark grey. Sport: the paler grey-green foliage of the related Canary Islands "
                      "dragon tree (Dracaena draco).",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Dracaena cinnabari, "
                      "https://en.wikipedia.org/wiki/Dracaena_cinnabari . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        review_layout(render(), sys.argv[1], frames=True)
    else:
        build()
