"""Fern line: fern_fiddlehead -> unfurling_fern -> ostrich_fern.

Signature: the crozier coil. The baby IS a coil; the teen's three fronds
are half unrolled with curls at their tips; the adult is a tall shuttlecock
vase of feathery fronds with one last curl rising from its heart.

Round 3 (CREATURES.md): every front is a function of the idle frame p; the
whole body is tilted at the foe about its planted roots (rig.Spr.set_tilt).
  fern_fiddlehead  COILED   the crozier drawn as one coiled stroke, a 1px groove
                            between windings; sibling curl as tail.        score: 9
  unfurling_fern   COILED   coil head, lead frond jabbing with a curled fist,
                            rear frond swept back.                          score: 8 (fronds a little busy)
  ostrich_fern     LOOMING  plume crest overhanging the foe, great crozier
                            head in front, front fronds as arms.            score: 8 (back is still fan-like)
"""

from __future__ import annotations

import functools
import math

import numpy as np

from pix import arclen_param, bez, dilate, erode, rot
from icons_wild import ICONS
from rig import Spr as Sprite, fit_back

PAL = ("#205838", "#90c838", "#e0f090")   # blue-green shadow, fern green, lime light


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
        # the tip rolls into a little coil (a fist): one spiral stroke
        R, cw = curl
        (x1, y1), (x0, y0) = path[-1], path[-8]
        tx, ty = x1 - x0, y1 - y0
        tl = math.hypot(tx, ty)
        tx, ty = tx / tl, ty / tl
        nx, ny = (-ty, tx) if cw else (ty, -tx)
        cx, cy = x1 + nx * R, y1 + ny * R
        rx, ry = x1 - cx, y1 - cy
        sg = 1 if (-ry * tx + rx * ty) > 0 else -1
        a0 = math.atan2(ry, rx)
        sp = [(cx + (R * (1 - u) + 0.6 * u) * math.cos(a0 + sg * u * 1.25 * 2 * math.pi),
               cy + (R * (1 - u) + 0.6 * u) * math.sin(a0 + sg * u * 1.25 * 2 * math.pi)) for u in np.linspace(0, 1, 60)]
        cm = s.stroke(sp, (max(2.0, R * 0.75), 1.4))
        cid = s.part(cm, base=2, k=1, line=0, merge=[pid])
    return pid, path


def spiral_stalk(s, stalk, cx, cy, R, turns=1.6, r_end=1.6, w_out=5.0, w_in=2.2, ccw=True,
                 knuckles=0, k=1, hl=None):
    """A crozier drawn as ONE coiled stroke: the stalk (ctrl points) runs into
    a spiral round (cx, cy) that winds inward. The width stays under the
    spiral's pitch so a 1px groove (outline) separates the windings: the coil
    reads in the silhouette, not just as a painted line. ccw: the coil turns
    over toward the foe (up, then left, then down)."""
    ex, ey = stalk[-1]
    a0 = math.atan2(ey - cy, ex - cx)
    path = bez(stalk, 30)
    n = 140
    sp = []
    for i in range(1, n):
        t = i / (n - 1)
        r = R * (1 - t) + r_end * t
        a = a0 + (-1 if ccw else 1) * turns * 2 * math.pi * t
        sp.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    # blend the stalk end into the spiral start
    full = path + sp
    ts, L = arclen_param(full)
    Ls = arclen_param(path)[1]
    f0 = Ls / L

    def w(t):
        if t <= f0:
            return w_out
        u = (t - f0) / (1 - f0)
        return w_out + (w_in - w_out) * u ** 0.8
    m = s.stroke(full, w, cap=True)
    for j in range(knuckles):
        # rolled pinnae: little knobs on the outer winding's back
        a = a0 + (-1 if ccw else 1) * (0.9 + j * 0.85)
        rr = R + w_out * 0.35
        m |= s.circle(cx + rr * math.cos(a), cy + rr * math.sin(a), 1.3)
    pid = s.part(m, base=2, k=k, line=0)
    if hl is not None:
        # the glint: a short locked dash on the outer winding's top-left
        best = min(sp[: len(sp) * 2 // 3], key=lambda q: abs(math.atan2(q[1] - cy, q[0] - cx) + 2.3))
        best = s.T([best])[0]
        gx, gy = int(math.floor(best[0])), int(math.floor(best[1]))
        pts = [(gx, gy), (gx + 1, gy - 1)] if w_out < 5.5 else [(gx, gy), (gx + 1, gy - 1), (gx + 1, gy)]
        s.glint([q for q in pts if m[q[1], q[0]]], transform=False)
    return pid, full


def roots(s, base, feet, w=2.4):
    """Root feet: short tapered strokes from the base out to each foot."""
    ids = []
    for (fx, fy) in feet:
        bx, by = base
        c = ((bx + fx) / 2, max(by, fy) - 1.0)
        from pix import qbez
        m = s.stroke(qbez((bx, by), c, (fx, fy), 30), (w, 1.4))
        ids.append(s.part(m, base=1, k=0, line=0))
    return ids


def blade_fn(mx, start=0.1, p=0.7):
    return lambda t: mx * math.sin(math.pi * min(1, start + t * (1 - start) * 1.02)) ** p


# ---------------------------------------------------------------------------
# fern_fiddlehead: COILED. A fat crozier head pulled back on an S-stalk,
# a sibling curl at its heel as the tail.
# ---------------------------------------------------------------------------

def front_fiddle(p=0):
    s = Sprite(56, 56, PAL)
    b = p
    s.set_tilt(10, 31, 55)
    # tail: a sibling fiddlehead behind, low right
    spiral_stalk(s, [(33, 55), (38, 51), (41, 46)], 39.5, 42.5, 3.4, turns=1.2, r_end=1.0, w_out=2.8, w_in=1.6)
    # lead arm: the first pinna unrolling forward off the stalk, a little fist
    frond(s, [(32, 45), (26, 43), (19, 39 - b)], blade_fn(6.0, 0.2), step=2.5, depth=0.5, curl=(2.2, True), rachis=None)
    # the hero: S-stalk into a big coil head, turned over toward the foe
    hl = s.ellipse(15.5, 17, 2.2, 0.9, ang=-0.8)
    spiral_stalk(s, [(31, 55), (35, 47), (34, 39), (31, 32)], 21.5 - 0.6 * b, 24 - 0.6 * b, 10.5, turns=1.6,
                 r_end=1.8, w_out=6.2, w_in=2.4, k=2, hl=hl)
    with s.untilted(): roots(s, (31, 54), [(24, 55), (38, 55)], w=2.6)
    s.contact += [(24, 28), (34, 38)]
    return s


def back_fiddle():
    s = Sprite(48, 66, PAL)
    # from behind and above: the coil's back, turning over toward the foe (right)
    spiral_stalk(s, [(20, 70), (20, 56), (23, 46)], 26, 30, 17, turns=1.45, r_end=2.5, w_out=10.0, w_in=3.5,
                 ccw=False, knuckles=0, k=2, hl=s.ellipse(17, 18, 3, 1.2, ang=-0.6))
    return s


# ---------------------------------------------------------------------------
# unfurling_fern: COILED -> striking. The head still coiled; the lead frond
# unrolls forward like a whip with a curled fist, the rear frond swept back.
# ---------------------------------------------------------------------------

def front_unfurl(p=0):
    s = Sprite(60, 60, PAL)
    b = p
    s.set_tilt(12, 32, 58)
    # rear arm: swept up and back, tip still curled
    frond(s, [(34, 57), (41, 46), (47, 36), (50, 28 - b)], blade_fn(9), step=4.6, curl=(2.6, False))
    # body + head
    hl = s.ellipse(19, 15, 2.2, 0.9, ang=-0.7)
    spiral_stalk(s, [(31, 58), (36, 47), (33, 36), (30, 29)], 23 - 0.6 * b, 21 - 0.6 * b, 8.5, turns=1.5,
                 r_end=1.6, w_out=5.0, w_in=2.2, knuckles=0, k=2, hl=hl)
    # lead arm: thrust forward and up, unrolling, a curled fist at the end
    frond(s, [(32, 50), (24, 46), (15, 42), (8, 35 - b)], blade_fn(10, 0.15), step=4.6, curl=(2.6, True))
    with s.untilted(): roots(s, (32, 57), [(23, 58), (42, 58)], w=2.8)
    s.contact += [(22, 28), (37, 42)]
    return s


def back_unfurl():
    s = Sprite(48, 66, PAL)
    frond(s, [(20, 70), (10, 56), (4, 44), (3, 34)], blade_fn(13), step=4, curl=(3.5, False))
    frond(s, [(24, 70), (34, 58), (42, 48), (46, 38)], blade_fn(13), step=4, curl=(3.5, True))
    spiral_stalk(s, [(22, 70), (22, 54), (25, 44)], 28, 28, 13, turns=1.4, r_end=2.0, w_out=8.0, w_in=3.0,
                 ccw=False, knuckles=0, k=2, hl=s.ellipse(21, 19, 2.5, 1, ang=-0.6))
    return s


# ---------------------------------------------------------------------------
# ostrich_fern: LOOMING. A shuttlecock of plumes overhanging the foe, the
# great crozier rising from its heart as the head, front fronds spread as arms.
# ---------------------------------------------------------------------------

def front_ostrich(p=0):
    s = Sprite(64, 64, PAL, sc=0.81)
    b = p
    s.set_tilt(8, 38, 62)
    bx, by = 38, 62
    # tail: a plume swept back and drooping on the far side
    frond(s, [(bx + 1, by), (bx + 10, 44), (bx + 19, 28), (bx + 24, 20), (bx + 27, 22 + b)], blade_fn(10), step=3.5, depth=0.6, k=1)
    # the crest: a tall plume behind the head
    frond(s, [(bx, by), (bx + 2, 42), (bx + 1, 22), (bx - 3, 6 + b)], blade_fn(11), step=3.5, depth=0.6, k=1)
    # the overhang: the great plume arching right over the foe, tip drooping
    frond(s, [(bx - 1, by), (bx - 4, 40), (bx - 12, 18), (bx - 24, 8), (bx - 33, 10), (bx - 36, 17 + b)],
          blade_fn(12), step=3.5, depth=0.6, k=2)
    # rear arm: low on the far side, braced
    frond(s, [(bx + 1, by - 1), (bx + 10, 55), (bx + 20, 50), (bx + 26, 45)], blade_fn(9), step=3.5, depth=0.6, k=2)
    # the head: the great crozier rising from the heart, coiled at the foe
    hl = s.ellipse(bx - 24, 26, 2, 0.9, ang=-0.8)
    spiral_stalk(s, [(bx - 1, by), (bx + 1, 50), (bx - 4, 40), (bx - 9, 35)], bx - 19 - 0.5 * b, 31.5 - 0.5 * b, 11.2,
                 turns=1.55, r_end=1.8, w_out=6.2, w_in=2.4, k=2, hl=hl)
    # lead arm: a front frond thrust out low toward the foe
    frond(s, [(bx - 1, by - 1), (bx - 10, 55), (bx - 22, 52), (bx - 33, 50 - b)], blade_fn(10), step=3.5, depth=0.6, k=2)
    with s.untilted(): roots(s, (bx, by - 1), [(bx - 8, by + 1), (bx + 8, by + 1)], w=3.2)
    s.contact += [(bx - 9, bx - 4), (bx + 4, bx + 9)]
    return s


def back_ostrich():
    s = Sprite(48, 64, PAL)
    # from behind and above: plumes radiating from the vase mouth, leaning right
    bx, by = 22, 52
    for (ex, ey), mx in (((2, 18), 10), ((12, 4), 10), ((30, 2), 10), ((47, 10), 10)):
        frond(s, [(bx, by), ((bx + ex) / 2 + 2, (by + ey) / 2), (ex, ey)], blade_fn(mx), step=4, k=2)
    for (ex, ey) in ((-1, 44), (48, 40)):
        frond(s, [(bx, by + 4), ((bx + ex) / 2, by - 2), (ex, ey)], blade_fn(12), step=4, k=2)
    s.part(s.ellipse(bx + 1, by + 3, 7, 4), base=1, k=0, line=0)
    spiral_stalk(s, [(bx, by + 10), (bx + 1, by), (bx + 4, by - 8)], bx + 10, by - 14, 8, turns=1.4, r_end=1.6,
                 w_out=5, w_in=2.2, ccw=False, knuckles=0, k=2, hl=s.ellipse(bx + 6, by - 20, 2, 0.9, ang=-0.6))
    for y in range(by + 4, 70):
        pass
    s.part(s.stroke(bez([(bx, by + 2), (bx + 1, 70)], 10), (12, 14)), base=2, k=2, line=0)
    return s


SPRITES = {
    "fern_fiddlehead": dict(pal=PAL, front=front_fiddle, back=fit_back(back_fiddle), icon=ICONS["fern_fiddlehead"], icon2="bob",
                            idle=[functools.partial(front_fiddle, 1)]),
    "unfurling_fern": dict(pal=PAL, front=front_unfurl, back=fit_back(back_unfurl), icon=ICONS["unfurling_fern"], icon2="bob",
                           idle=[functools.partial(front_unfurl, 1)]),
    "ostrich_fern": dict(pal=PAL, front=front_ostrich, back=fit_back(back_ostrich), icon=ICONS["ostrich_fern"], icon2="bob",
                         idle=[functools.partial(front_ostrich, 1)]),
}
