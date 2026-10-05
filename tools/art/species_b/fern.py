"""Fern line: fern_fiddlehead -> unfurling_fern -> ostrich_fern.

Signature: the crozier coil. The baby IS a coil; the teen's three fronds
are half unrolled with curls at their tips; the adult is a tall shuttlecock
vase of feathery fronds with one last curl rising from its heart.
"""

from __future__ import annotations

import math

import numpy as np

from pix import Sprite, arclen_param, bez, dilate, erode, rot

PAL = ("#2c6030", "#a0d040", "#e0f0a8")


def coil_path(cx, cy, r0, turns, a0, r1=1.0, cw=True, n=160, sq=1.0):
    pts = []
    for i in range(n):
        t = i / (n - 1)
        r = r0 * (1 - t) ** 0.9 + r1 * t
        a = a0 + (1 if cw else -1) * turns * 2 * math.pi * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * sq))
    return pts


def coil_disk(s, cx, cy, R, turns=1.3, a_out=0.0, cw=False, sq=1.0, knuckles=True, hl=True, base=2):
    """A rolled crozier: a round body with a black spiral groove and little
    knuckles (the curled pinnae) round the outside. a_out = angle where the
    outer turn leaves toward the stalk."""
    m = s.ellipse(cx, cy, R, R * sq)
    if knuckles:
        for j in range(3):
            a = a_out + (0.9 + j * 0.75) * (-1 if cw else 1)
            if abs(((a - a_out + math.pi) % (2 * math.pi)) - math.pi) < 0.6:
                continue
            m |= s.circle(cx + math.cos(a) * (R - 0.3), cy + math.sin(a) * (R - 0.3) * sq, max(1.2, R * 0.17))
    hm = s.ellipse(cx - R * 0.5, cy - R * 0.55 * sq, max(1.0, R * 0.16), max(1.2, R * 0.3), ang=-0.8) if hl else None
    pid = s.part(m, base=base, k=max(1, round(R / 4)), hl=hm, line=0)
    # spiral groove from the outer edge (where the stalk joins) into the centre
    g = []
    n = 120
    for i in range(n):
        t = i / (n - 1)
        r = (R - 1.2) * (1 - t) ** 0.85 + 0.6 * t
        a = a_out + (1 if cw else -1) * (turns * 2 * math.pi * t + 0.9)
        g.append((cx + r * math.cos(a), cy + r * math.sin(a) * sq))
    s.ink(s.line1(g) & erode(m, 1), 0, pid=pid)
    return pid


def crozier(s, stalk, cx, cy, R, w0, w1=None, cw=False, sq=1.0, turns=1.3, hl=True, knuckles=True):
    """Stalk (ctrl points) running into a coil_disk centred at (cx, cy)."""
    ex, ey = stalk[-1]
    a_out = math.atan2((ey - cy) / sq, ex - cx)
    path = bez(stalk, 30)
    sm = s.stroke(path, (w0, w1 or w0 * 0.85))
    sid = s.part(sm, base=2, k=1, line=0)
    pid = coil_disk(s, cx, cy, R, turns=turns, a_out=a_out, cw=cw, sq=sq, hl=hl, knuckles=knuckles)
    s.parts[pid]["merge"].add(sid)
    return pid


def frond(s, ctrl, width, step=4.0, depth=0.7, curl=None, base=2, k=1, line=0, rachis=1, start=0.06, side=(1, 1)):
    """A feathery frond as one lanceolate blade with sawtooth edges (each
    tooth a pinna) and a dark rachis. width(t) = full width at t.
    curl=(R, cw) ends the blade in a little crozier knob."""
    path = bez(ctrl, 50)
    ts, L = arclen_param(path)
    left, right = [], []
    d = 0.0
    k_i = 0
    for i, (x, y) in enumerate(path):
        if i:
            d += math.dist(path[i - 1], path[i])
        t = d / L
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, ty) or 1
        nx, ny = -ty / tl, tx / tl
        w = width(t) / 2
        phase = (d % step) / step
        # sawtooth: ramps out toward the tip, then snaps back in
        tooth = depth * w * (1 - phase) ** 1.3 if w > 1.4 else 0
        wl = (w - tooth) if side[0] else 0.8
        wr = (w - tooth) if side[1] else 0.8
        left.append((x + nx * wl, y + ny * wl))
        right.append((x - nx * wr, y - ny * wr))
    m = s.poly(left + right[::-1])
    m |= s.stroke(path, (1.6, 1.0))
    pid = s.part(m, base=base, k=k, line=line)
    if rachis is not None:
        s.decal(s.line1(path[int(len(path) * start):int(len(path) * 0.92)]), rachis, on=[pid])
        # herringbone: a vein from the rachis out to each notch between pinnae
        dd = [0.0]
        for i in range(1, len(path)):
            dd.append(dd[-1] + math.dist(path[i - 1], path[i]))
        kk = 1
        while kk * step < L * 0.85:
            dn = kk * step
            i = min(range(len(path)), key=lambda j: abs(dd[j] - dn))
            i0 = min(range(len(path)), key=lambda j: abs(dd[j] - (dn - step * 0.7)))
            x, y = path[i]
            a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]
            tl = math.hypot(tx, ty) or 1
            nx, ny = -ty / tl, tx / tl
            w = width(dn / L) / 2 * (1 - depth) - 0.3
            if w > 1.5:
                for sg in (1, -1):
                    s.decal(s.line1(bez([path[i0], (x + nx * w * sg, y + ny * w * sg)], 8)), rachis, on=[pid])
            kk += 1
    if curl:
        R, cw = curl
        (x1, y1), (x0, y0) = path[-1], path[-8]
        tx, ty = x1 - x0, y1 - y0
        tl = math.hypot(tx, ty)
        tx, ty = tx / tl, ty / tl
        nx, ny = (-ty, tx) if cw else (ty, -tx)
        cid = coil_disk(s, x1 + nx * R * 0.6 + tx * R * 0.5, y1 + ny * R * 0.6 + ty * R * 0.5, R,
                        turns=1.0, a_out=math.atan2(-ny, -nx), cw=cw, knuckles=False, hl=False)
        s.parts[cid]["merge"].add(pid)
    return pid, path


# ---------------------------------------------------------------------------
# fern_fiddlehead
# ---------------------------------------------------------------------------

def front_fiddle():
    s = Sprite(64, 64, PAL, sc=1.0)
    # a sibling bud peeking up behind
    crozier(s, [(40, 63), (42, 55), (43, 50)], 40.5, 46, 4.0, 3.6, cw=False, hl=False, turns=1.0)
    # the hero: stalk rises, leans left, rolls into a big fuzzy "9"
    crozier(s, [(32, 63), (34, 54), (34, 44), (33, 36)], 26, 28, 10.5, 7.5, 6.0, cw=False)
    return s


def back_fiddle():
    s = Sprite(48, 72, PAL)
    crozier(s, [(25, 72), (26, 60), (26, 50)], 23, 36, 15, 10, 9, cw=True, sq=0.85)
    return s


ICON_FIDDLE = [
    "                ",
    "     kkkkk      ",
    "    k22222k     ",
    "   k23kkk22k    ",
    "  k23k111k21k   ",
    "  k2k12kk1k1k   ",
    "  k2k1k  k21k   ",
    "  k21kkk k21k   ",
    "   k11k  k21k   ",
    "    kk  k221k   ",
    "       k221k    ",
    "      k221k     ",
    "      k21k      ",
    "      k21k      ",
    "      k21k      ",
    "      kkkk      ",
]


# ---------------------------------------------------------------------------
# unfurling_fern
# ---------------------------------------------------------------------------

def front_unfurl():
    s = Sprite(64, 64, PAL, sc=1.0)
    blade = lambda mx: (lambda t: mx * math.sin(math.pi * min(1, 0.1 + t * 0.95)) ** 0.7)
    # side fronds: half unrolled, tips still curled
    frond(s, [(34, 63), (40, 52), (46, 42), (49, 34)], blade(11), curl=(3.2, True))
    frond(s, [(30, 63), (24, 52), (18, 42), (15, 35)], blade(11), curl=(3.2, False))
    # centre: tallest, unrolling from the bottom, a fat curl on top
    frond(s, [(32, 63), (33, 54), (33, 44)], blade(12), rachis=1)
    crozier(s, [(33, 46), (33, 38), (31, 30)], 26, 25, 7.0, 4.5, 4.0, cw=False)
    return s


def back_unfurl():
    s = Sprite(48, 72, PAL)
    blade = lambda mx: (lambda t: mx * math.sin(math.pi * min(1, 0.1 + t * 0.95)) ** 0.7)
    frond(s, [(24, 72), (14, 58), (8, 48), (6, 40)], blade(13), curl=(4, True))
    frond(s, [(24, 72), (34, 58), (40, 48), (42, 40)], blade(13), curl=(4, False))
    crozier(s, [(24, 72), (24, 56), (25, 44)], 24, 35, 9.5, 6.5, 6.0, cw=True, sq=0.85)
    return s


ICON_UNFURL = [
    "                ",
    "      kkk       ",
    "     k232k      ",
    "  kk k2kk2k  kk ",
    " k22kk21k2k k22k",
    " k2k1kk1k1kk2k1k",
    " k21k kk21kk1k1k",
    "  k1k kk21k k21k",
    " kk21kk221kk21k ",
    "k22k21k21kk21kk ",
    " kk1k21k2k21k22k",
    "   kk21k21k21kk ",
    "    kk21221k1k  ",
    "      k2221k    ",
    "      k2211k    ",
    "      kkkkkk    ",
]


# ---------------------------------------------------------------------------
# ostrich_fern
# ---------------------------------------------------------------------------

def front_ostrich():
    s = Sprite(72, 72, PAL, sc=0.95)
    bx, by = 36, 71
    blade = lambda mx: (lambda t: mx * math.sin(math.pi * min(1, 0.06 + t * 0.97)) ** 0.75)
    # inner fronds (behind): tall and nearly upright
    frond(s, [(bx + 1, by), (bx + 5, 50), (bx + 9, 30), (bx + 12, 15)], blade(12), k=1)
    frond(s, [(bx - 1, by), (bx - 5, 50), (bx - 8, 30), (bx - 10, 14)], blade(12), k=1)
    # outer fronds: arching out and over, tips drooping
    frond(s, [(bx + 2, by), (bx + 10, 50), (bx + 18, 30), (bx + 24, 20), (bx + 27, 22)], blade(13), k=2)
    frond(s, [(bx - 2, by), (bx - 10, 50), (bx - 18, 30), (bx - 24, 20), (bx - 27, 22)], blade(13), k=2)
    # front pair, shorter, leaning out
    frond(s, [(bx, by), (bx + 6, 56), (bx + 14, 44), (bx + 20, 38)], blade(11), k=2)
    frond(s, [(bx, by), (bx - 6, 56), (bx - 14, 44), (bx - 20, 38)], blade(11), k=2)
    # the heart: one last fiddlehead rising from the middle
    crozier(s, [(bx, by), (bx, 58), (bx, 48)], bx - 3, 43, 4.5, 3.5, 3.0, cw=False)
    return s


def back_ostrich():
    s = Sprite(48, 72, PAL)
    # from behind and above: fronds radiating out of the vase's mouth
    bx, by = 24, 50
    blade = lambda mx: (lambda t: mx * math.sin(math.pi * min(1, 0.08 + t * 0.95)) ** 0.75)
    for (ex, ey), mx in (((2, 22), 9), ((46, 22), 9), ((14, 10), 9), ((34, 10), 9), ((24, 6), 8)):
        frond(s, [(bx + (ex - bx) * 0.15, by - 2), ((bx + ex) / 2, (by + ey) / 2 - 3), (ex, ey)], blade(mx), k=2)
    for (ex, ey) in ((-2, 46), (50, 46)):
        frond(s, [(bx, by + 2), ((bx + ex) / 2, by - 4), (ex, ey)], blade(11), k=2)
    s.part(s.ellipse(bx, by + 1, 6.5, 3.2), base=1, k=0, line=0)
    crozier(s, [(bx, by + 2), (bx, by - 4)], bx + 2.5, by - 8, 4.0, 3.0, cw=True)
    return s


ICON_OSTRICH = [
    " kk          kk ",
    "k22k  k  k  k22k",
    "k2k2kk2kk2kk2k2k",
    " kk22k2kk2k22kk ",
    "  k2k2k22k2k2k  ",
    " kk21k2kk2k12kk ",
    "k22k21k22k12k22k",
    " kk2k21k21k2k1k ",
    "   kk21221212kk ",
    "    k2k2kk2k1k  ",
    "    kk222112kk  ",
    "      k2211k    ",
    "      k2211k    ",
    "      k2211k    ",
    "      k2111k    ",
    "      kkkkkk    ",
]


SPRITES = {
    "fern_fiddlehead": dict(pal=PAL, front=front_fiddle, back=back_fiddle, icon=ICON_FIDDLE),
    "unfurling_fern": dict(pal=PAL, front=front_unfurl, back=back_unfurl, icon=ICON_UNFURL),
    "ostrich_fern": dict(pal=PAL, front=front_ostrich, back=back_ostrich, icon=ICON_OSTRICH),
}
