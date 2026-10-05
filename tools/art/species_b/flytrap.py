"""Flytrap line: flytrap_seedling -> young_flytrap -> venus_flytrap.

The traps are the star: jaws parted, wine-red mouths, white teeth (cilia)
along both rims. Signature that grows: one baby trap -> two -> a crown of
three with one huge trap up front.
"""

from __future__ import annotations

import math

from pix import Sprite, bez, erode, qbez, rot

PAL = ("#882838", "#98d040", "#f0f8d0")   # wine shadow / mouths, spring green


def trap(s, hx, hy, L, ang=0.0, gape=0.9, teeth=6, flip=False, depth=0.42, tooth=0.22,
         inner_up=2, inner_lo=4, hl=True, back=False):
    """One trap, hinge at (hx, hy), jaws pointing left (or right if flip),
    rotated by ang (radians, + = tips swing up). Returns jaw part ids."""
    sx = -1 if not flip else 1

    def T(pts):
        out = []
        for x, y in pts:
            x2 = x * math.cos(ang) + y * math.sin(ang)
            y2 = -x * math.sin(ang) + y * math.cos(ang)
            out.append((hx + sx * x2, hy + y2))
        return out

    g_up = L * math.tan(gape * 0.55)
    g_lo = L * math.tan(gape * 0.45)
    tip_u = (L, -g_up)
    tip_l = (L, g_lo)
    D = depth * L
    rim_u = qbez((0, 0), (L * 0.5, -g_up * 0.5 - L * 0.04), tip_u, 40)
    rim_l = qbez((0, 0), (L * 0.5, g_lo * 0.5 + L * 0.04), tip_l, 40)
    out_u = qbez(tip_u, (L * 0.75, -g_up - D * 1.5), (-L * 0.08, -D * 0.5), 40)
    out_l = qbez(tip_l, (L * 0.75, g_lo + D * 1.5), (-L * 0.08, D * 0.5), 40)
    # throat between the rims (behind both jaws)
    if not back:
        throat = s.poly(T([(-1, 0)] + list(rim_u) + list(rim_l[::-1])))
        s.part(throat, base=1, k=0, line=None)
    ids = []
    rims = []
    for rim, outer, inner_w, is_up in ((rim_l, out_l, inner_lo, False), (rim_u, out_u, inner_up, True)):
        poly = T(list(rim) + list(outer))
        m = s.poly(poly)
        hm = None
        if hl and is_up:
            hp = T([(L * 0.45, -g_up - D * 0.55)])[0]
            hm = s.ellipse(hp[0], hp[1], max(1.0, L * 0.12), 1.0, ang=-ang * sx)
        jid = s.part(m, base=2, k=2 if is_up else 3, hl=hm, line=0)
        ids.append(jid)
        if inner_w and not back:
            # the red inner face seen along the rim
            band = s.stroke(T(rim), lambda t: inner_w * 2 * math.sin(math.pi * min(1, t * 1.1)) ** 0.6, cap=False)
            s.decal(band & m, 1, on=[jid])
        rims.append((T(rim), is_up, m))
    # teeth (cilia): a comb of 1px white spikes with black between, stamped
    # pixel by pixel off each rim so they stay crisp
    for rimpts, is_up, m in rims:
        teeth_comb(s, rimpts, is_up, teeth, max(2, min(4, round(tooth * L * 0.6))), m, ang, sx)
    return ids


def teeth_comb(s, rim, is_up, n, length, jaw, ang, sx):
    """1px white cilia stamped every 3px along the rim, pointing across the gap
    (snapped to vertical, or horizontal on steep rims). On the silhouette the
    outline pass wraps them; over the red mouth they read on their own."""
    (x0, y0), (x1, y1) = rim[0], rim[-1]
    steep = abs(y1 - y0) > abs(x1 - x0) * 1.2
    if steep:
        dx, dy = (1 if (x1 - x0) * (1 if is_up else -1) < 0 else -1), 0
        dx = -dx if sx > 0 else dx
        dx, dy = (1, 0) if sx > 0 else (-1, 0)
    else:
        dx, dy = (0, 1) if is_up else (0, -1)
    seen = []
    for (x, y) in rim:
        p = (int(math.floor(x)), int(math.floor(y)))
        if not seen or p != seen[-1]:
            seen.append(p)
    # spacing by the axis the teeth stand on
    picks, last = [], None
    for (x, y) in seen[len(seen) // 4:]:
        key = x if dy else y
        if last is None or abs(key - last) >= 3:
            picks.append((x, y))
            last = key
    white = []
    for (x, y) in picks[:n + 1]:
        bx, by = x, y
        for _ in range(5):
            if 0 <= by < s.h and 0 <= bx < s.w and jaw[by, bx]:
                bx, by = bx + dx, by + dy
        for j in range(length):
            white.append((bx + dx * j, by + dy * j))
    s.px(white, 3)


def petiole(s, base, hinge, w0=1.5, w1=5.0, bend=0.0):
    (bx, by), (hx, hy) = base, hinge
    mx, my = (bx + hx) / 2, (by + hy) / 2
    L = math.dist(base, hinge)
    nx, ny = -(hy - by) / L, (hx - bx) / L
    path = qbez(base, (mx + nx * bend * L, my + ny * bend * L), hinge, 40)
    m = s.stroke(path, lambda t: w0 + (w1 - w0) * t ** 1.5, cap=True)
    pid = s.part(m, base=2, k=1, line=0)
    s.decal(s.line1(path[:-6]), 1, on=[pid])
    return pid


# ---------------------------------------------------------------------------

def front_seedling():
    s = Sprite(64, 64, PAL, sc=1.0)
    # two round cotyledons low down
    s.part(s.ellipse(41, 52, 8, 3.6, ang=-0.35), base=2, k=2, line=0, hl=s.ellipse(38, 50.5, 2, 0.8, ang=-0.35))
    s.part(s.ellipse(22, 53, 8, 3.4, ang=0.3), base=2, k=2, line=0, hl=s.ellipse(19, 51.8, 2, 0.8, ang=0.3))
    # the stalk: a little winged leaf leaning left
    petiole(s, (32, 56), (34, 34), w0=2.5, w1=5.5, bend=0.12)
    trap(s, 34, 33, 16, ang=0.3, gape=0.7, teeth=4, tooth=0.28, inner_up=1, inner_lo=3, depth=0.5)
    return s


def front_young():
    s = Sprite(64, 64, PAL, sc=1.0)
    # rosette leaves on the ground
    petiole(s, (36, 57), (52, 50), w0=2, w1=5, bend=-0.1)
    petiole(s, (30, 57), (14, 52), w0=2, w1=5, bend=0.1)
    # back trap: smaller, higher, facing up-right, nearly closed
    petiole(s, (34, 57), (40, 32), w0=2, w1=5, bend=-0.1)
    trap(s, 40, 31, 13, ang=-1.9, gape=0.45, teeth=4, tooth=0.25, inner_up=1, inner_lo=2, flip=False, hl=False)
    # main trap, open wide, facing left
    petiole(s, (32, 57), (36, 42), w0=2.5, w1=6, bend=0.15)
    trap(s, 37, 40, 22, ang=0.15, gape=0.7, teeth=5, tooth=0.26, inner_up=2, inner_lo=4, depth=0.5)
    return s


def front_adult():
    s = Sprite(72, 72, PAL, sc=0.92)
    # rosette leaves
    petiole(s, (38, 70), (62, 62), w0=2, w1=6, bend=-0.08)
    petiole(s, (32, 70), (10, 64), w0=2, w1=6, bend=0.08)
    # back right trap, facing right
    petiole(s, (38, 70), (50, 46), w0=2, w1=5.5, bend=-0.1)
    trap(s, 49, 45, 15, ang=0.55, gape=0.8, teeth=5, tooth=0.25, flip=True, inner_up=1, inner_lo=3, hl=False)
    # back left/top trap, facing up
    petiole(s, (35, 70), (34, 30), w0=2, w1=5.5, bend=0.05)
    trap(s, 34, 29, 15, ang=-1.45, gape=0.75, teeth=5, tooth=0.25, inner_up=1, inner_lo=3, hl=False)
    # main trap: huge, jaws wide, facing left
    petiole(s, (34, 70), (42, 54), w0=3, w1=7, bend=0.15)
    trap(s, 44, 52, 30, ang=0.12, gape=0.7, teeth=6, tooth=0.22, inner_up=2, inner_lo=5, depth=0.5)
    return s


# backs: seen from behind, the traps face away (to the right)

def back_seedling():
    s = Sprite(48, 72, PAL)
    s.part(s.ellipse(14, 60, 10, 5, ang=0.3), base=2, k=2, line=0)
    s.part(s.ellipse(35, 61, 10, 5, ang=-0.3), base=2, k=2, line=0)
    petiole(s, (24, 68), (22, 42), w0=3, w1=7, bend=-0.1)
    trap(s, 22, 41, 20, ang=0.55, gape=0.7, teeth=5, tooth=0.26, flip=True, back=True)
    return s


def back_young():
    s = Sprite(48, 72, PAL)
    petiole(s, (24, 72), (8, 56), w0=3, w1=7, bend=0.1)
    petiole(s, (24, 72), (40, 50), w0=3, w1=6, bend=-0.1)
    trap(s, 40, 49, 12, ang=1.2, gape=0.5, teeth=4, flip=True, back=True, hl=False)
    petiole(s, (22, 72), (16, 44), w0=3, w1=7, bend=0.1)
    trap(s, 16, 43, 24, ang=0.5, gape=0.7, teeth=6, tooth=0.22, flip=True, back=True)
    return s


def back_adult():
    s = Sprite(48, 72, PAL)
    petiole(s, (24, 72), (44, 58), w0=3, w1=7, bend=-0.1)
    petiole(s, (24, 72), (4, 60), w0=3, w1=7, bend=0.1)
    petiole(s, (26, 72), (36, 40), w0=3, w1=6, bend=-0.1)
    trap(s, 36, 39, 13, ang=1.4, gape=0.6, teeth=4, flip=True, back=True, hl=False)
    petiole(s, (22, 72), (8, 44), w0=3, w1=6, bend=0.1)
    trap(s, 8, 43, 12, ang=1.9, gape=0.6, teeth=4, flip=False, back=True, hl=False)
    petiole(s, (22, 72), (18, 50), w0=3, w1=8, bend=0.1)
    trap(s, 18, 49, 26, ang=0.45, gape=0.75, teeth=7, tooth=0.2, flip=True, back=True)
    return s


ICON_SEED = [
    "                ",
    "                ",
    "    k k k       ",
    "   k3k3k3k      ",
    "  kk22222kk     ",
    " k11111222k     ",
    "  kk11112k      ",
    "  k3kkk22k      ",
    "   k  kk2kk     ",
    "       k2k      ",
    "  kkk  k2k kkk  ",
    " k222kkk2kk222k ",
    " k3221k22k1222k ",
    "  kk11k2k11kkk  ",
    "    kkk1kkk     ",
    "      kkk       ",
]

ICON_YOUNG = [
    "                ",
    "        k k k   ",
    "       k3k3k3k  ",
    "      kk2222k   ",
    "      k1kk22k   ",
    " k k k1k k22k   ",
    "k3k3kk22kk2k    ",
    "kk2222222kk2k   ",
    "k1111112222k    ",
    "k11111112k2k    ",
    " kk1111k22k     ",
    " k3kkkkk22k     ",
    "  k  kk2k22kkk  ",
    "  kkk22k22222k  ",
    " k22222222111k  ",
    "  kkkkkkkkkkk   ",
]

ICON_ADULT = [
    "    k k k k     ",
    "   k3k3k3k3k    ",
    "  kk2222222kk   ",
    " k322222212kk   ",
    "k1111111122k    ",
    "k11111111112k k ",
    " k11111111k2kk3k",
    "k3kk1111112k22kk",
    "  k3kkk3k22k111k",
    "   k  k k22k3k3 ",
    "  k k  k22k k k ",
    " k3k3kk22kk     ",
    "kk22k222kk22kkk ",
    "k22222222222111k",
    " kkk11111111kkk ",
    "    kkkkkkkk    ",
]


SPRITES = {
    "flytrap_seedling": dict(pal=PAL, front=front_seedling, back=back_seedling, icon=ICON_SEED),
    "young_flytrap": dict(pal=PAL, front=front_young, back=back_young, icon=ICON_YOUNG),
    "venus_flytrap": dict(pal=PAL, front=front_adult, back=back_adult, icon=ICON_ADULT),
}
