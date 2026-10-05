"""Flytrap line: flytrap_seedling -> young_flytrap -> venus_flytrap.

Round 3 redesign: a predator line. Every trap is a HEAD that lunges at the
foe (left), jaws wide on a wine-red maw, white cilia standing up like fangs.
The winged petioles are the body and the low rosette leaves are splayed
claws/feet. Line motif: the maw. 1 head -> head + a raised "fist" trap ->
a huge head with two fist traps flanking it.

Round 3 scores (CREATURES.md rubric):
  flytrap_seedling LUNGING  S-torso, head thrust past its claws.            score: 9
  young_flytrap    LUNGING  + a clenched fist trap raised behind.           score: 9
  venus_flytrap    LUNGING  huge head on a deep maw, two fists; the back is
                            now just the shells + one fist (de-busied).     score: 9
"""

from __future__ import annotations

import functools
import math

import numpy as np

from pix import bez, dilate, erode, qbez
from icons_wild import ICONS
from rig import Spr as Sprite, fit_back

PAL = ("#882838", "#98d040", "#e8f0a0")   # wine shadow + maw (accent), spring green, pale lime glint/cilia


def _tf(hx, hy, ang, flip):
    """local (x right = back of the trap, jaws open toward -x) -> world."""
    sx = -1 if flip else 1
    c, s_ = math.cos(ang), math.sin(ang)

    def T(pts):
        out = []
        for x, y in pts:
            x2 = x * c + y * s_
            y2 = -x * s_ + y * c
            out.append((hx + sx * x2, hy + y2))
        return out
    return T


def trap(s, hx, hy, L, ang=0.0, au=0.55, al=0.42, thick=0.42, teeth=6, tlen=3,
         flip=False, maw=True, hl=True, closed=False, lip=True, deep=-0.12):
    """A trap with its hinge at (hx, hy). Jaws open toward the left (flip:
    right); ang tilts the whole head (+ = jaws swing up). au/al: opening of
    the upper/lower lobe (radians from the axis). Returns (upper, lower) ids."""
    T = _tf(hx, hy, ang, flip)
    U = (-L * math.cos(au), -L * math.sin(au))
    Lw = (-L * math.cos(al), L * math.sin(al))
    D = thick * L
    # rims bow slightly away from the gap (a rounded lip), shells bulge out
    rim_u = qbez((0, 0), (U[0] * 0.5, U[1] * 0.5 - L * 0.07), U, 40)
    rim_l = qbez((0, 0), (Lw[0] * 0.5, Lw[1] * 0.5 + L * 0.07), Lw, 40)
    sh_u = qbez(U, (U[0] * 0.35 + 2, U[1] - D * 0.95), (L * 0.10, -D * 0.38), 40)
    sh_l = qbez(Lw, (Lw[0] * 0.35 + 2, Lw[1] + D * 0.95), (L * 0.10, D * 0.38), 40)
    ids = []
    if maw and not closed:
        # the maw: the red inner faces between the rims, closed off by a
        # curve that bows back toward the hinge (the far wall of the throat)
        far = qbez(Lw, (L * deep, (U[1] + Lw[1]) * 0.5), U, 40)
        mm = s.poly(T(list(rim_u) + list(far[::-1][1:]) + list(rim_l[::-1])))
        mid = s.part(mm, base=1, k=0, line=None)
        # throat: a black pit at the hinge
        tp = T([(-L * 0.16, (U[1] + Lw[1]) * 0.12)])[0]
        s.ink(s.ellipse(tp[0], tp[1], max(1.0, L * 0.11), max(1.0, L * 0.15), ang=-ang) & mm, 0, pid=mid, lock=False)
        ids.append(mid)
    for rim, shell, up in ((rim_l, sh_l, False), (rim_u, sh_u, True)):
        m = s.poly(T(list(rim) + list(shell)))
        hm = None
        if hl and up:
            hp = T([(U[0] * 0.42, U[1] * 0.55 - D * 0.45)])[0]
            hm = s.ellipse(hp[0], hp[1], max(1.0, L * 0.09), 0.9, ang=-ang * (-1 if flip else 1) + 0.25)
        jid = s.part(m, base=2, k=2 if up else 3, hl=hm, line=0, shadow=(1, 1))
        ids.append(jid)
        if lip and not closed:
            # the red inner face seen along the rim (3/4 view): thick on the
            # lower jaw (we look down into it), thin on the upper
            bw = (1.6 if up else 3.2) * max(1.0, L / 20)
            band = s.stroke(T(rim), lambda t: bw * math.sin(math.pi * min(1.0, 0.1 + t)) ** 0.5, cap=False)
            s.decal(band & m, 1, on=[jid])
    # cilia: 1px white fangs off each rim, standing out past the lip, angled
    # forward (toward the tips) and across the gap
    for rim, up in ((rim_u, True), (rim_l, False)):
        fangs(s, T, rim, up, teeth, tlen, L, closed)
    return ids


def fangs(s, T, rim, up, n, tlen, L, closed):
    pts = rim[int(len(rim) * 0.30):int(len(rim) * 0.93)]
    picks = [pts[int(i * (len(pts) - 1) / max(1, n - 1))] for i in range(n)]
    white = []
    for j, (x, y) in enumerate(picks):
        # direction: across the gap (down for upper jaw), tilted toward the tip
        d = (-0.45, 1.0) if up else (-0.45, -1.0)
        ln = tlen + (1 if 0 < j < n - 1 else 0)
        seg = [(x + d[0] * k * 0.9, y + d[1] * k * 0.9) for k in np.linspace(0.6, ln, 12)]
        white.append(T(seg))
    m = np.zeros((s.h, s.w), bool)
    for seg in white:
        m |= s.line1(seg)
    # fangs never sit on the outer shell
    s.px(list(zip(*np.nonzero(m)[::-1])), 3)


def shell_back(s, hx, hy, L, ang, W=None, cilia=5, hl=True):
    """A trap seen from behind and above: its jaws face away (toward the foe,
    along ang; 0 = right, - = up). We see the two OUTER lobes side by side,
    the hinge midrib between them, a vein down each lobe, and the cilia
    fringe peeking past the far rims."""
    W = W or L * 0.9
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    ids = []
    for side in (1, -1):   # the lobe on the shadow side first
        cx = hx + dx * L * 0.52 + nx * side * W * 0.24
        cy = hy + dy * L * 0.52 + ny * side * W * 0.24
        m = s.ellipse(cx, cy, L * 0.52, W * 0.30, ang=ang + side * 0.12)
        hm = None
        if hl and side == -1:
            hm = s.ellipse(cx - dx * L * 0.12 + nx * side * W * 0.08, cy - dy * L * 0.12 + ny * side * W * 0.08,
                           max(1.0, L * 0.12), 0.9, ang=ang)
        pid = s.part(m, base=2, k=3 if side == 1 else 2, line=0, hl=hm)
        ids.append(pid)
        # the lobe's vein, fanning from the hinge
        s.decal(s.line1(bez([(hx + dx * 2, hy + dy * 2), (cx + dx * L * 0.3, cy + dy * L * 0.3)], 12)) & erode(m, 1), 1, on=[pid])
        # cilia peeking past the far rim
        for j in range(cilia):
            a = ang + side * (0.15 + 0.55 * j / max(1, cilia - 1))
            ex = cx + math.cos(a) * L * 0.5 + nx * side * W * 0.05
            ey = cy + math.sin(a) * L * 0.5 * (W * 0.30 / (L * 0.52)) + 0 * ny
            ex = cx + (math.cos(a - ang) * L * 0.52) * dx - (math.sin(a - ang) * W * 0.30) * dy * 1.0
            ey = cy + (math.cos(a - ang) * L * 0.52) * dy + (math.sin(a - ang) * W * 0.30) * dx * 1.0
            seg = [(ex + math.cos(a) * k, ey + math.sin(a) * k) for k in np.linspace(0.5, 3.0, 8)]
            mm = s.line1(seg) & ~m
            s.px(list(zip(*np.nonzero(mm)[::-1])), 3)
    return ids


def wing(s, base, tip, w, bend=0.0, k=2, line=0, vein=True, fat=0.6, hl=None):
    """Winged petiole / rosette leaf: a strap leaf from base to tip."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, blunt=1.2)
    pid = s.part(m, base=2, k=k, line=line, hl=hl)
    if vein:
        s.decal(s.line1(path[8:-10]), 1, on=[pid])
    return pid


def body(s, ctrl, w, hl=None, k=2):
    """The winged petiole as a torso: an S-curved strap, widest low down."""
    from pix import bez
    path = bez(ctrl, 40)
    m = s.stroke(path, lambda t: max(2.5, w * math.sin(math.pi * (0.18 + 0.72 * t)) ** 0.8), cap=True)
    pid = s.part(m, base=2, k=k, line=0, hl=hl)
    s.decal(s.line1(path[10:-14]), 1, on=[pid])
    return pid


def fist(s, hx, hy, L, ang, flip=True):
    """A side trap clenched shut: a fist with its cilia interlocked."""
    return trap(s, hx, hy, L, ang=ang, au=0.16, al=0.10, thick=0.55, teeth=3, tlen=2, flip=flip,
                hl=False, maw=False, lip=False)


# ---------------------------------------------------------------------------
# flytrap_seedling: LUNGING. One little head thrust past its feet.
# ---------------------------------------------------------------------------

def front_seedling(p=0):
    s = Sprite(56, 56, PAL)
    b = (p == 1)
    s.set_tilt(10, 29, 54)
    # splayed rosette claws: rear foot back-right, lead foot braced forward
    with s.untilted(): wing(s, (31, 53), (46, 51), 6.5, bend=-0.14)
    with s.untilted(): wing(s, (27, 53), (9, 52), 7.5, bend=0.14)
    # torso: an S that crouches back then thrusts the head forward
    body(s, [(29, 54), (34, 46), (32, 37), (27, 30 + b)], 10)
    # the head: jaws wide, tilted down at the foe
    trap(s, 29, 28 + b, 20, ang=-0.20 - 0.04 * b, au=0.66 - 0.06 * b, al=0.40, thick=0.48, teeth=4, tlen=3)
    s.contact += [(12, 22), (36, 42)]
    return s


def back_seedling():
    s = Sprite(48, 64, PAL)
    wing(s, (22, 64), (2, 52), 11, bend=0.12)
    m, path = s.leaf((24, 72), (22, 34), 14, bend=0.16, fat=0.45, blunt=2.5)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    # from behind: the outer lobes, jaws open away toward the foe (top-right)
    shell_back(s, 16, 40, 30, -0.75, W=24, cilia=4)
    return s


# ---------------------------------------------------------------------------
# young_flytrap: LUNGING. A bigger head, plus a fist raised behind.
# ---------------------------------------------------------------------------

def front_young(p=0):
    s = Sprite(60, 60, PAL, sc=0.92)
    b = (p == 1)
    s.set_tilt(8, 31, 58)
    # the fist: raised high behind, clenched
    wing(s, (35, 57), (50, 24), 7.5, bend=-0.22, k=2)
    trap(s, 50, 23 - b, 16, ang=-1.05, au=0.40, al=0.26, thick=0.5, teeth=3, tlen=2, flip=True, hl=False, deep=0.35)
    # claws on the ground
    with s.untilted(): wing(s, (33, 57), (52, 55), 7, bend=-0.12)
    with s.untilted(): wing(s, (29, 57), (7, 56), 8, bend=0.12)
    # torso
    body(s, [(31, 58), (37, 48), (34, 38), (29, 31 + b)], 12)
    # head: lunging, jaws wide
    trap(s, 31, 29 + b, 26, ang=-0.16 - 0.04 * b, au=0.64 - 0.06 * b, al=0.42, thick=0.46, teeth=5, tlen=3)
    s.contact += [(10, 22), (38, 48)]
    return s


def back_young():
    s = Sprite(48, 64, PAL)
    wing(s, (24, 66), (1, 54), 12, bend=0.1)
    # the raised arm trap, from behind
    wing(s, (28, 66), (40, 40), 8, bend=-0.15)
    shell_back(s, 38, 40, 13, -1.15, W=11, cilia=3, hl=False)
    m, path = s.leaf((22, 74), (19, 36), 16, bend=0.14, fat=0.45, blunt=3)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    shell_back(s, 14, 40, 31, -0.72, W=26, cilia=5)
    return s


# ---------------------------------------------------------------------------
# venus_flytrap: LUNGING (escalated). A huge head, two fists flanking it.
# ---------------------------------------------------------------------------

def front_adult(p=0):
    s = Sprite(72, 64, PAL, sc=0.87)
    b = (p == 1)
    s.set_tilt(6, 34, 63)
    # rear fist: high right, raised like a club
    wing(s, (40, 62), (52, 23), 8, bend=-0.22)
    fist(s, 52, 22 - b, 16, ang=-1.15)
    # second fist: low right, swung out wide
    wing(s, (40, 62), (54, 46), 7, bend=-0.1)
    fist(s, 54, 45 + b, 12, ang=0.45)
    # ground claws
    with s.untilted(): wing(s, (37, 62), (56, 60), 8, bend=-0.12)
    with s.untilted(): wing(s, (31, 62), (8, 60), 9, bend=0.12)
    # torso: thick, crouched
    body(s, [(34, 63), (40, 52), (38, 41), (34, 33 + b)], 16)
    # head: huge, jaws gaping
    trap(s, 36, 31 + b, 34, ang=-0.12 - 0.03 * b, au=0.62 - 0.05 * b, al=0.44, thick=0.42, teeth=6, tlen=4)
    s.contact += [(8, 22), (40, 54)]
    return s


def back_adult():
    s = Sprite(52, 64, PAL)
    # flanking fists (left one high, right one low and wide), from behind
    wing(s, (20, 66), (7, 40), 9, bend=0.15)
    shell_back(s, 7, 40, 13, -1.9, W=11, cilia=3, hl=False)
    wing(s, (30, 66), (44, 48), 9, bend=-0.1)
    shell_back(s, 43, 48, 12, -0.3, W=10, cilia=3, hl=False)
    # body + head from behind: big outer lobes, maw facing away (top-right)
    m, path = s.leaf((26, 76), (22, 38), 18, bend=0.12, fat=0.45, blunt=3.0)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    shell_back(s, 17, 40, 33, -0.7, W=28, cilia=6)
    return s


# ---------------------------------------------------------------------------
# icons (16x16): k outline, 1 wine, 2 green, 3 glint/teeth
# ---------------------------------------------------------------------------

ICON_SEED = [
    "                ",
    "                ",
    "                ",
    "       kkkk     ",
    "     kk2232k    ",
    "    k3k22222k   ",
    "    k11kk222k   ",
    "    k3k11k2k    ",
    "     k1kkk2k    ",
    "    k3k  k22k   ",
    "     k    k2k   ",
    "   kk     k2k   ",
    "  k22kk  k22k   ",
    " k3222222222kk  ",
    "  kk111kk1112k  ",
    "    kkk  kkkk   ",
]

ICON_YOUNG = [
    "                ",
    "          k k   ",
    "         k3k3k  ",
    "      kkkk222k  ",
    "    kk2232kk2k  ",
    "   k3k222222k   ",
    "   k11kkk222k   ",
    "   k3k111k22k   ",
    "    k1kkk222k   ",
    "   k3k   k22k   ",
    "    k    k22k   ",
    "  kk     k22k   ",
    " k22kk  k222k   ",
    "k32222222222kk  ",
    " kk111kk11112k  ",
    "   kkk  kkkkk   ",
]

ICON_ADULT = [
    "          k k   ",
    "    kkkk k3k3k  ",
    "  kk22232k222k  ",
    " k3k2222222k2k  ",
    " k11kkk22222k   ",
    " k3k111kk222k   ",
    "  k11k11k222k   ",
    " k3kk111k222k   ",
    "  k1k3kk222k    ",
    "   k k k222k    ",
    "  kkkk  k22k    ",
    " k3k22k k22k    ",
    " k1k22kk222k    ",
    "k3kk22222222kk  ",
    " kk111kk11112k  ",
    "   kkk  kkkkk   ",
]


SPRITES = {
    "flytrap_seedling": dict(pal=PAL, front=front_seedling, back=fit_back(back_seedling), icon=ICONS["flytrap_seedling"], icon2="bob",
                             idle=[functools.partial(front_seedling, 1)]),
    "young_flytrap": dict(pal=PAL, front=front_young, back=fit_back(back_young), icon=ICONS["young_flytrap"], icon2="bob",
                          idle=[functools.partial(front_young, 1)]),
    "venus_flytrap": dict(pal=PAL, front=front_adult, back=fit_back(back_adult), icon=ICONS["venus_flytrap"], icon2="bob",
                          idle=[functools.partial(front_adult, 1)]),
}
