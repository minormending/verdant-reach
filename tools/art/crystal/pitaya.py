"""Original Crystal-rule Selenicereus undatus: pitaya_cutting -> dragon_fruit.

Teen COILED: an upright cut segment of three-ribbed (triangular) stem,
standing in a mound of soil and leaning toward the foe, with one rib turned
to the viewer: a clean white crest line splits the lit green face from the
black shade face. Both rib margins are deeply scalloped, with a 2px white
areole tuft in every notch (never dark dots), and short aerial roots grip
the soil. Only the top quarter curls: a young shoot from the top areole,
bent into a short crook with a small magenta flush at its very tip. The
intro curls the crook tighter, flicks it up, holds, and settles.
Adult LUNGING: the climbing three-ribbed stem arches toward the foe and
carries the huge night-blooming flower: a broad white cup of narrow pointed
petals with green seams, ringed by long narrow yellow-green outer bracts with
magenta tips, and a central starburst of stamens (short lines joined at the
centre, never dots). One bright magenta dragon fruit, with green-tipped scale
flaps and chevrons, hangs where the stem forks; a younger rear arm climbs
straight up behind. The intro half-closes the flower, then opens it wide (it
blooms for one night), holds, and settles. The back shows the flower from
behind: a fan of white petal backs under the radiating bracts.
Sport: the yellow pitaya (Selenicereus megalanthus), a related species
whose fruit skin is yellow: the magenta mid slot turns yellow.
No sprites from another game are copied, traced or imported.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, close_outline, erode, hop, icon_arr,  # noqa: E402
                    moving_boxes, rim_white, shift, tones)

TOOL = "tools/art/crystal/pitaya.py"
IDS = ["pitaya_cutting", "dragon_fruit"]
# Stem green in the dark slot; magenta-pink (fruit, bract tips, young tip) in the mid.
PAL = [BLACK, "#3c9048", "#f058a0", WHITE]
# Yellow pitaya: the same stem green, a yellow fruit skin in the mid slot.
SPORT = [BLACK, "#3c9048", "#e8d038", WHITE]
SPAL = tuple(PAL[1:])

ANIM = {
    IDS[0]: {"intro": [[0, 8], [1, 12], [2, 6], [3, 16], [4, 10], [0, 8]],
             "idle": [[0, 140], [4, 10], [0, 8]]},
    IDS[1]: {"intro": [[0, 6], [1, 12], [2, 6], [3, 18], [4, 10], [0, 8]],
             "idle": [[0, 150], [4, 10], [0, 8]]},
}


# ------------------------------------------------------------- the stem ---

def _frame(path):
    """Arc-length parameter and unit normals (pointing left of travel)."""
    d = [0.0]
    for a, b in zip(path, path[1:]):
        d.append(d[-1] + math.dist(a, b))
    nrm = []
    n = len(path)
    for i in range(n):
        a, b = path[max(0, i - 1)], path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nrm.append((-dy / L, dx / L))
    return d, nrm


def rib_stem(s, ctrl, width, step=7.0, amp=2.4, crest=0.10, tufts=True, rim=0.6,
             young=0.0, n=160, creases=True, base_tone=1, k=1, min_crest=9.0, min_tuft=7.0):
    """A three-ribbed cactus stem along ctrl, seen side-on.

    The two outer rib margins are scalloped: rounded humps that pinch into
    sharp notches every `step` px (staggered between the two sides). In
    each notch sits an areole: a 2px white spine tuft just inside the
    margin; the shade side also gets a short black crease running in from
    the notch, so every dark mark joins the outline (no dark dot). Each lit
    hump carries its own short white rim, broken at the notches, so the
    margin reads as a row of humps rather than a smooth tube. The third rib
    faces the viewer as a wavy crest beside the centreline: a broken white
    ridge with a black groove on its shade side. `width` is a float or
    callable(t); `young` tints the last share of the stem magenta (the soft
    new growth)."""
    path = bez(ctrl, n)
    d, nrm = _frame(path)
    L = d[-1]
    wf = width if callable(width) else (lambda t, w=width: w)
    left, right = [], []
    for i, ((x, y), (nx, ny)) in enumerate(zip(path, nrm)):
        t = d[i] / L
        hw = wf(t) / 2
        out = []
        for side, ph in ((1, 0.0), (-1, 0.5)):
            f = (d[i] / step + ph) % 1.0
            bump = math.sin(math.pi * f) ** 0.5
            a = amp * min(1.0, hw / 4.0)
            off = max(0.6, hw + a * (bump - 0.6))
            out.append((x + side * nx * off, y + side * ny * off))
        left.append(out[0])
        right.append(out[1])
    m = s.poly(left + right[::-1])
    pid = s.part(m, base=base_tone, k=k, sh_tone=0, line=0)
    notches = []
    for side, ph in ((1, 0.0), (-1, 0.5)):
        kk = 0
        while True:
            dist = (kk - ph) * step
            kk += 1
            if dist < 1:
                continue
            if dist > L - 1:
                break
            j = min(range(len(d)), key=lambda q: abs(d[q] - dist))
            t = d[j] / L
            (x, y), (nx, ny) = path[j], nrm[j]
            w = wf(t)
            hw = max(0.6, w / 2 - amp * 0.6 * min(1.0, w / 8.0))
            notches.append((x, y, nx, ny, side, hw, w))
    # broken lit rims: one per hump
    if rim:
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        cut = np.zeros(m.shape, bool)
        for x, y, nx, ny, side, hw, w in notches:
            px_, py_ = s.T([(x + side * nx * hw, y + side * ny * hw)])[0]
            cut |= (xx + 0.5 - px_) ** 2 + (yy + 0.5 - py_) ** 2 <= 2.3 ** 2
        before = s.tone.copy()
        rim_white(s, m, pid, rim)
        s.tone[cut & (s.tone == 3) & (before != 3)] = before[cut & (s.tone == 3) & (before != 3)]
    if young:
        cut_i = int(len(path) * (1 - young))
        ym = s.stroke(path[cut_i:], lambda t: wf(1.0) + 2, cap=True)
        s.decal(ym & m & (s.tone == base_tone), 2, on=[pid])
    safe = erode(m, 1)
    for x, y, nx, ny, side, hw, w in notches:
        if w < min_tuft:
            continue
        tx, ty = ny, -nx
        if tufts:
            p0 = (x + side * nx * (hw - 1.5) + tx * 0.7, y + side * ny * (hw - 1.5) + ty * 0.7)
            p1 = (x + side * nx * (hw - 0.3) - tx * 0.3, y + side * ny * (hw - 0.3) - ty * 0.3)
            s.decal(s.line1([p0, p1]) & safe, 3, on=[pid])
        if creases and side == 1:
            q0 = (x + side * nx * (hw + 0.6), y + side * ny * (hw + 0.6))
            q1 = (x + side * nx * (hw - 1.8) - tx * 1.6, y + side * ny * (hw - 1.8) - ty * 1.6)
            s.decal(s.line1([q0, q1]), 0, on=[pid])
    if crest is not None:
        cr = []
        for i, ((x, y), (nx, ny)) in enumerate(zip(path, nrm)):
            w = wf(d[i] / L)
            wob = 0.4 * math.sin(2 * math.pi * (d[i] / step + 0.25))
            c = w * crest + wob
            cr.append((x + nx * c, y + ny * c))
        inner = erode(m, 2)
        ok = [i for i in range(len(cr)) if wf(d[i] / L) >= min_crest]
        if ok:
            lo, hi = ok[0] + 3, ok[-1] - 2
            ridge = np.zeros(m.shape, bool)
            # broken ridge: one dash per hump
            per = max(1, int(len(cr) * step / L))
            for st in range(lo, hi, per):
                ridge |= s.line1(cr[st:min(hi, st + int(per * 0.7))])
            s.decal(ridge & inner, 3, on=[pid])
            groove = [(x + nx * 1.0, y + ny * 1.0) for (x, y), (nx, ny) in zip(cr, nrm)]
            s.decal(s.line1(groove[lo:hi]) & inner, 0, on=[pid])
    return pid, m, path


def root(s, ctrl, w=2.0):
    """A short aerial root: a slim green strand gripping the ground."""
    path = bez(ctrl, 40)
    m = s.stroke(path, (w + 0.6, w - 0.4), cap=True)
    pid = s.part(m, base=1, k=0, line=0)
    return pid, m


# ------------------------------------------------------------ the teen ---

def segment(s, ctrl, width, step=7.0, amp=4.0, crest=0.16, young=0.0, shade_rim=True,
            shade_end=0.88, crest_min=7.0, n=200, tufts=True):
    """A cut pitaya segment: a three-ribbed stem seen with one rib toward
    the viewer, so two faces show.

    Both outer rib margins (the silhouette) are deeply scalloped: rounded
    humps between V notches every `step` px, staggered side to side. The
    facing rib runs down the middle as a clean white crest line; the lit
    face (left of it) is the stem green with a white rim broken at each
    notch, the shade face (right of it) is black with a green reflected rim
    along its humps. A 2px white areole tuft sits in every notch of both
    margins, lined up along the rib edges. `young` > 0 is the radius of a
    small magenta flush at the very tip; `shade_end` stops the shade face
    short of the tip. Returns (pid, mask, path)."""
    path = bez(ctrl, n)
    d, nrm = _frame(path)
    L = d[-1]
    wf = width if callable(width) else (lambda t, w=width: w)
    edges = {1: [], -1: []}
    crest_pts = []
    for i, ((x, y), (nx, ny)) in enumerate(zip(path, nrm)):
        t = d[i] / L
        hw = wf(t) / 2
        a = amp * min(1.0, hw / 5.0)
        for side, ph in ((1, 0.0), (-1, 0.5)):
            f = (d[i] / step + ph) % 1.0
            v = min(f, 1 - f) * 2
            bump = v ** 0.6
            off = max(0.8, hw + a * (bump - 0.75))
            edges[side].append((x + side * nx * off, y + side * ny * off))
        c = wf(t) * crest
        crest_pts.append((x + nx * c, y + ny * c))
    m = s.poly(edges[-1] + edges[1][::-1])
    pid = s.part(m, base=1, k=0, line=0)
    ks = int(len(path) * shade_end)
    shade = s.poly(crest_pts[:ks] + edges[1][:ks][::-1]) & m
    # notches on both margins
    notches = []
    for side, ph in ((1, 0.0), (-1, 0.5)):
        kk = 0
        while True:
            dist = (kk - ph) * step
            kk += 1
            if dist < 1.5:
                continue
            if dist > L - 2:
                break
            j = min(range(len(d)), key=lambda q: abs(d[q] - dist))
            notches.append((j, side))
    yy, xx = np.mgrid[0:s.h, 0:s.w]

    def disc(px_, py_, r):
        (qx, qy), = s.T([(px_, py_)])
        return (xx + 0.5 - qx) ** 2 + (yy + 0.5 - qy) ** 2 <= r * r
    # lit rim along the left humps, broken at the notches
    cut = np.zeros(m.shape, bool)
    for j, side in notches:
        if side == -1:
            cut |= disc(*edges[-1][j], 2.2)
    edge = m & ~erode(m, 1)
    lit = edge & ~shade & ~cut
    s.decal(lit, 3, on=[pid])
    # the shade face: black, with a green reflected rim along its humps
    s.decal(shade, 0, on=[pid], lock=True)
    if shade_rim:
        rcut = np.zeros(m.shape, bool)
        for j, side in notches:
            if side == 1:
                rcut |= disc(*edges[1][j], 1.6)
        s.decal(shade & ~erode(m, 2) & ~rcut, 1, on=[pid], lock=True)
    # the facing rib: a clean white crest line between the two faces
    wide = [i for i in range(len(path)) if wf(d[i] / L) >= crest_min]
    if wide:
        s.decal(s.line1(crest_pts[wide[0] + 2:wide[-1]]) & erode(m, 1), 3, on=[pid], lock=True)
    if young:
        # a small magenta flush at the very tip only
        ex, ey = path[-1]
        s.decal(disc(ex, ey, young) & m & ~shade, 2, on=[pid], lock=True)
    # areole tufts in every notch, just inside the margin
    if tufts:
        safe = erode(m, 1)
        for j, side in notches:
            t = d[j] / L
            if wf(t) < 7:
                continue
            (x, y), (nx, ny) = path[j], nrm[j]
            hw = wf(t) / 2 - amp * min(1.0, wf(t) / 10.0) * 0.75
            tx, ty = ny, -nx
            p0 = (x + side * nx * (hw - 1.3) + tx * 0.6, y + side * ny * (hw - 1.3) + ty * 0.6)
            p1 = (x + side * nx * (hw + 0.2) - tx * 0.3, y + side * ny * (hw + 0.2) - ty * 0.3)
            s.decal(s.line1([p0, p1]) & safe, 3, on=[pid], lock=True)
    return pid, m, path


def soil(s, x0, x1, y=55):
    """A shallow mound of dark soil the cutting stands in, two grit glints."""
    m = s.poly([(x0, y + 0.6), (x0 + 3, y - 2.5), (x0 + 8, y - 3.6), (x1 - 8, y - 3.6),
                (x1 - 3, y - 2.5), (x1, y + 0.6)])
    pid = s.part(m, base=0, k=0, line=0)
    s.decal(s.line1([(x0 + 5, y - 2), (x0 + 7, y - 2)]), 3, on=[pid], lock=True)
    s.decal(s.line1([(x1 - 9, y - 1), (x1 - 7, y - 1)]), 3, on=[pid], lock=True)
    return pid


# the top quarter per frame: rest hook, wind-up (tighter), flicked up, held, settle
SHOOT = [  # the new shoot per frame: rest crook, wind-up (tighter), flicked up, held, settle
    [(30, 24), (29, 18), (31, 13), (35, 11), (38, 13), (38, 17)],
    [(30, 24), (29, 19), (31, 15), (34, 14), (35, 17)],
    [(30, 24), (29, 18), (29, 13), (31, 10)],
    [(30, 24), (29, 18), (31, 13), (35, 11), (39, 12)],
    [(30, 24), (29, 18), (32, 12), (36, 11), (39, 12), (41, 15)],
]


def cutting_front(frame=0):
    """COILED: an upright cut segment standing in soil, leaning toward the
    foe, with a young shoot from its top areole curled into a crook."""
    s = Spr(56, 56, SPAL)
    root(s, [(30, 50), (26, 52), (23, 55)])
    root(s, [(38, 50), (42, 52), (45, 55)])
    soil(s, 16, 51)
    segment(s, SHOOT[frame], lambda t: 7.5 - 1.5 * t, step=5.0, amp=1.6, young=1.6, shade_end=1.0,
            tufts=False, crest_min=99)
    segment(s, [(36, 54), (35, 41), (32, 28), (31, 21)], 21.0, young=0.0)
    root(s, [(31, 51), (28, 55)], w=2.4)
    root(s, [(39, 51), (41, 55)], w=2.4)
    return tones(s)


# ----------------------------------------------------------- the adult ---

def bract(s, base, ang, length, w, tipfrac=0.3, bend=0.12, line=0):
    """A long narrow outer bract, yellow-green with a magenta tip."""
    a = math.radians(ang)
    tipp = (base[0] + length * math.cos(a), base[1] - length * math.sin(a))
    m, path = s.leaf(base, tipp, w, fat=0.35, bend=bend, blunt=1.3)
    pid = s.part(m, base=1, k=0, line=line)
    cut = int(len(path) * (1 - tipfrac))
    s.decal(s.stroke(path[cut:], w + 2, cap=True) & m, 2, on=[pid])
    return pid


def flower(s, cx, cy, R, opening=1.0, sq=0.62, stamens=True, back_len=9.0):
    """The huge night flower, its mouth turned toward the foe (left).

    (cx, cy) is the centre of the mouth. Behind it the bowl's outer side
    runs back to the tube; long narrow bracts fan out past the rim from
    the bowl's base, green with magenta tips. The mouth is a broad white
    cup: narrow petal tips tooth its rim, a few green seams run in from the
    rim, and the shaded inner wall is a green crescent below the lit upper
    lip. The stamens are a soft starburst of short green lines, all joined
    at the throat (never dots). `opening` 0 = a loose bud, 1 = the rest
    pose, >1 = flared wide."""
    o = opening
    ry = R * (0.42 + 0.58 * o)
    rx = ry * sq
    bx = cx + back_len * (1.15 - 0.2 * min(o, 1.3))
    # bracts, behind everything: fanned from the bowl's base past the rim
    angs = (108, 78, 50, 26, -32, -56, -82, -110, 140, -142)
    for k, ang in enumerate(angs):
        a = math.radians(ang)
        spread = 0.55 + 0.45 * min(o, 1.3)
        L = (R * (0.78 + 0.22 * min(o, 1.2)) + 5.5 + (k % 2) * 1.5) * (0.9 if abs(ang) > 120 else 1.0)
        base = (bx - 1, cy)
        tipp = (cx + 2 + (L - 2) * math.cos(a) * (0.72 + 0.3 * spread),
                cy - L * math.sin(a) * spread - (L * 0.35 * (1 - spread) * math.copysign(1, ang)))
        ln = math.dist(base, tipp)
        aa = math.degrees(math.atan2(-(tipp[1] - base[1]), tipp[0] - base[0]))
        bract(s, base, aa, ln, 3.4, tipfrac=0.24, bend=0.08 if ang > 0 else -0.08, line=1)
    # the bowl's outer side, from the rim back to the tube
    bowl = [(cx, cy - ry), (cx + rx * 0.9, cy - ry * 0.82), (bx - 1, cy - ry * 0.32), (bx + 1, cy),
            (bx - 1, cy + ry * 0.32), (cx + rx * 0.9, cy + ry * 0.82), (cx, cy + ry)]
    bm = s.poly(bez(bowl, 8))
    bpid = s.part(bm, base=3, k=2, sh_tone=1, line=0)
    for v in (-0.55, 0.0, 0.55):
        s.decal(s.line1(bez([(cx + rx * 0.7, cy + ry * v * 1.1), (bx - 2, cy + ry * v * 0.3)], 12))
                & erode(bm, 1), 1, on=[bpid])
    # the cup: a white heart, then one ring of broad pointed petals laid
    # far (upper-right) to near, each starting part-way out so their green
    # seams radiate through the rim zone only, never knotting at the centre
    sx, sy = cx + rx * 0.3, cy + ry * 0.04
    heart = s.ellipse(sx - rx * 0.12, sy, rx * 0.62, ry * 0.5)
    mpid = s.part(heart, base=3, k=0, line=0)
    n = 11
    for k in sorted(range(n), key=lambda k: -math.cos(2 * math.pi * k / n + 0.35 - 0.8)):
        a = 2 * math.pi * k / n + 0.35
        base = (sx + rx * 0.3 * math.cos(a), sy - ry * 0.3 * math.sin(a))
        tip = (cx + rx * 1.1 * math.cos(a), cy - ry * 1.1 * math.sin(a))
        m, path = s.leaf(base, tip, 6.8 * (0.75 + 0.25 * min(o, 1.0)), fat=0.6, blunt=2.0)
        s.part(m, base=3, k=0, line=1)
    if stamens:
        for k in range(8):
            a = 2 * math.pi * k / 8 + 0.4
            r = 3.2 + (k % 2) * 1.2
            p1 = (sx + r * math.cos(a) * 0.8, sy - r * math.sin(a))
            s.ink(s.line1([(sx, sy), p1]) & (s.tone >= 0), 1, lock=False)
    return mpid


def fruit(s, x, y, rx=6.0, ry=8.0, ang=-12):
    """The dragon fruit: a bright magenta oval clad in green-tipped scales.

    The scales on the edge are pointed flaps that curl out of the
    silhouette, magenta with green ends; those on the face are small green
    chevrons pointing to the fruit's tip (never dots). A white gloss
    follows the lit upper-left curve."""
    a = math.radians(ang)
    c, sn = math.cos(a), math.sin(a)

    def P(u, v):
        return (x + u * c + v * sn, y - u * sn + v * c)
    # edge scales behind the body: triangular flaps whose free ends curl
    # out past the outline, magenta with green tips
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    for th, L, lean in ((115, 4.5, 0.5), (65, 4.5, -0.5), (160, 4.0, 0.8), (20, 4.0, -0.8),
                        (205, 3.5, 0.9), (330, 3.5, -0.9), (90, 4.0, 0.0)):
        t = math.radians(th)
        ex, ey = rx * math.cos(t), -ry * math.sin(t)
        nx, ny = math.cos(t), -math.sin(t)          # outward
        tx_, ty_ = -ny, nx                          # along the rim
        b0 = P(ex - tx_ * 2.0 - nx * 1.5, ey - ty_ * 2.0 - ny * 1.5)
        b1 = P(ex + tx_ * 2.0 - nx * 1.5, ey + ty_ * 2.0 - ny * 1.5)
        tip = P(ex + nx * L + tx_ * lean + 0.0, ey + ny * L + ty_ * lean - 1.2)
        fm = s.poly([b0, tip, b1])
        fp = s.part(fm, base=2, k=0, line=0)
        (qx, qy), = s.T([tip])
        s.decal(fm & ((xx + 0.5 - qx) ** 2 + (yy + 0.5 - qy) ** 2 <= 2.6 ** 2), 1, on=[fp])
    m = s.ellipse(x, y, rx, ry, ang=a)
    pid = s.part(m, base=2, k=1, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.32)
    inner = erode(m, 1)
    # face scales: small green chevrons pointing to the tip, hand placed
    # (each is one joined 3px mark, never a dot)
    for (u, v) in ((-2.5, -3.5), (1.5, -1.0), (-2.0, 2.5), (2.5, 3.5), (-0.5, 6.0)):
        (qx, qy), = s.T([P(u, v)])
        s.rows(int(qx) - 1, int(qy), [".1.", "1.1"])
    return pid


OPEN = [1.0, 0.75, 1.12, 1.18, 1.06]


def adult_front(frame=0):
    s = Spr(56, 56, SPAL)
    root(s, [(40, 50), (36, 52), (32, 55)])
    root(s, [(46, 50), (50, 52), (53, 55)])
    # the rear arm: a younger segment climbing straight up behind
    rib_stem(s, [(44, 36), (48, 26), (51, 15), (50, 3.5)], lambda t: 9 - 2 * t, step=6.0, amp=2.0,
             min_crest=99)
    rib_stem(s, [(44, 55), (46, 42), (42, 30), (33, 22), (25, 21)], lambda t: 12 - 3 * t,
             min_crest=8.5)
    fruit(s, 46, 34, 6.5, 8.5)
    flower(s, 14, 23, 11.5, OPEN[frame])
    return trim_tips(tones(s))


# --------------------------------------------------------------- render ---

def trim_tips(t):
    """Hand clean-up: drop black outline pixels that stick out as 1px
    spurs (one cardinal neighbour, itself black), so bract and scale tips
    end in a 2px point rather than a lone outline pixel."""
    t = t.copy()
    op = t != T
    p = np.pad(op, 1)
    n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    pt = np.pad(t, 1, constant_values=T)
    nb_black = np.zeros(t.shape, bool)
    for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
        nb_black |= pt[dy:dy + t.shape[0], dx:dx + t.shape[1]] == 0
    t[op & (n == 1) & (t == 0) & nb_black] = T
    return fill_holes(t, 0)


def fill_holes(t, tone):
    """Close transparent pockets the outline has sealed off (a 1px gap
    between bracts, the inside of a tight arch) with `tone`, so no light
    dot sits inside a dark ring."""
    t = t.copy()
    tr = t == T
    h, w = tr.shape
    seen = np.zeros_like(tr)
    st = [(y, x) for y in range(h) for x in (0, w - 1) if tr[y, x]]
    st += [(y, x) for x in range(w) for y in (0, h - 1) if tr[y, x]]
    for q in st:
        seen[q] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and tr[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True
                st.append((yy, xx))
    t[tr & ~seen] = tone
    return t


FRONTS = {IDS[0]: (cutting_front, 5), IDS[1]: (adult_front, 5)}


def cutting_back():
    """From behind and above: the broad ribbed segment, cropped by the
    bottom edge, its lit and shaded faces and scalloped margins, and the
    new shoot curling up toward the foe (top right)."""
    s = Spr(48, 48, SPAL)
    segment(s, [(26, 19), (27, 12), (31, 6), (37, 4), (42, 6), (44, 11)], lambda t: 9.0 - 1.5 * t,
            step=6.0, amp=2.0, young=2.0, tufts=False, crest_min=99, shade_end=1.0)
    segment(s, [(21, 62), (21, 44), (23, 27), (24, 17)], 38.0, step=9.0, amp=5.0)
    return fill_holes(tones(s, open_bottom=True), 0)


def flower_back(s, cx, cy, R, bx, by):
    """The night flower from behind and above, facing the foe (top right).

    Its petals fan up from the tube's mouth at (bx, by) to a toothed rim:
    white petal backs with green seams, shaded on the lower right. The long
    bracts sit nearer the viewer and splay out over the petals' bases,
    green with magenta tips; the green tube runs in from the stem."""
    base_ang = math.atan2(-(cy - by), cx - bx)
    n = 9
    for k in range(n):
        a = base_ang + (k / (n - 1) - 0.5) * 2.5
        tip = (bx + R * 1.25 * math.cos(a), by - R * 1.25 * math.sin(a))
        m, path = s.leaf((bx, by), tip, 8.0, fat=0.7, blunt=2.5)
        s.part(m, base=3, k=1, sh_tone=1, line=1)
    for k, (da, f) in enumerate(((-1.5, 0.8), (-0.95, 0.95), (-0.4, 1.0), (0.2, 1.0),
                                 (0.75, 0.92), (1.3, 0.8))):
        a = base_ang + da
        bract(s, (bx, by), math.degrees(a), R * f, 3.4, tipfrac=0.14, bend=0.06 if da > 0 else -0.06,
              line=0)


def adult_back():
    """From behind and above: the stem climbs out of the bottom left and
    arches to the top right, where the flower faces the foe; the fruit
    hangs on the near side of the stem."""
    s = Spr(48, 48, SPAL)
    rib_stem(s, [(12, 62), (12, 44), (16, 33), (22, 27)], lambda t: 22 - 5 * t, step=8.0, amp=2.8)
    flower_back(s, 32, 15, 21, 21, 28)
    s.part(s.stroke(bez([(17, 32), (21, 28), (24, 25)], 20), 8.0, cap=True), base=1, k=1, sh_tone=0, line=0)
    fruit(s, 9, 39, 8.0, 10.0, 12)
    return tones(s, open_bottom=True)


ICONS = {
    # the upright ribbed segment: lit face, white crest, shade face, notched
    # margins, a lit cut top, the young shoot's crook and the soil
    IDS[0]: [
        "................",
        "......kkk.......",
        ".....k111k......",
        ".....k1kk2k.....",
        ".....k1k.kk.....",
        ".....k1k........",
        "...kkk1kkkk.....",
        "..k33331kkkk....",
        ".k311111kk1k....",
        "..k11111kk1k....",
        ".k311111kkk.....",
        ".k311111kk1k....",
        "..k11111kk1k....",
        ".k311111kkk.....",
        ".k311111kk1kk...",
        ".k1kkkkkkkk1k...",
    ],
    # the white flower in side view, its toothed mouth to the foe and its
    # bracts flaring back from the tube; the arched stem and the fruit
    IDS[1]: [
        "................",
        "..k.............",
        ".k3k....k.......",
        ".k33k..k2k......",
        "..k333kk1kkk....",
        ".k3333331k111k..",
        ".k33333331kk11k.",
        ".k3333331k1kk1k.",
        "..k333kk1kk.k1k.",
        ".k33k..k2k..k1k.",
        ".k3k....k..kk1k.",
        "..k........k11k.",
        "........kk22k1k.",
        ".......k3222k1k.",
        ".......k2212k1k.",
        "........kkkkkkk.",
    ],
}


def icon(sid):
    return fill_holes(icon_arr(ICONS[sid]), 1)


def render():
    out = {}
    for sid in IDS:
        fn, n = FRONTS[sid]
        fs = [fn(f) for f in range(n)]
        b = cutting_back() if sid == IDS[0] else adult_back()
        ic = icon(sid)
        out[sid] = (fs, b, [ic, hop(ic)])
    return out


def review_layout(art):
    """Each species' front, back and icon at 3x in one row, nothing else."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "pitaya_1x.png"), (3, "pitaya_lead_layout.png")):
        sheet = Image.new("RGB", (256 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (106, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                y = 56 - im.height
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, y * scale), im)
        sheet.save(folder / name)


POSES = {
    IDS[0]: "COILED: an upright cut segment of three-ribbed stem in soil, leaning toward the foe: a lit "
            "green face and a black shade face split by a white crest, deeply scalloped margins with 2px "
            "white areole tufts in the notches, short aerial roots, and a young shoot from the top curled "
            "into a short crook with a small magenta flush at its tip. The crook curls tighter, flicks up "
            "and settles.",
    IDS[1]: "LUNGING: the climbing three-ribbed stem arches toward the foe and carries the huge night "
            "flower (a broad white cup of narrow petals, long yellow-green outer bracts with magenta tips, "
            "a starburst of stamens) and one magenta dragon fruit with green-tipped scales. The flower opens "
            "wide, holds and settles.",
}
WHITE_NOTE = {
    IDS[1]: " WHITE: the pitaya's huge night flower (Selenicereus undatus) has white inner tepals.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + POSES[sid] + WHITE_NOTE.get(sid, "") +
                      " Stem green in the dark slot, magenta-pink in the mid. Roots and the stem base stay "
                      "fixed; only the signature part moves. Areoles are white tufts, never dark dots; the "
                      "stamens are joined lines, never dots. Sport: the yellow pitaya (Selenicereus "
                      "megalanthus), a related species with yellow fruit skin: the magenta mid slot turns "
                      "yellow; geometry stays identical.")
        intro_strip(sid)


def preview(path):
    from kit import to_rgba
    art = render()
    k = 4
    rows = []
    for sid in IDS:
        fs, b, icons = art[sid]
        ims = [to_rgba(f, PAL) for f in fs] + [to_rgba(fs[0], SPORT), to_rgba(b, PAL)] + \
              [to_rgba(i, PAL) for i in icons]
        rows.append(ims)
        for n, f in enumerate(fs):
            op = (f != T).sum()
            ys, xs = np.nonzero(f != T)
            print(f"{sid} f{n}: {xs.max() - xs.min() + 1}x{ys.max() - ys.min() + 1} fill {op / f.size:.1%} "
                  f"white {(f == 3).sum() / op:.1%} comx {xs.mean():.1f} bottom {ys.max()}")
        op = (b != T).sum()
        print(f"{sid} back fill {op / b.size:.1%} white {(b == 3).sum() / op:.1%}")
    W = max(sum(im.shape[1] * k + 8 for im in r) for r in rows) + 8
    sheet = Image.new("RGB", (W, len(rows) * (56 * k + 8) + 8 + 70), (200, 208, 200))
    for r, ims in enumerate(rows):
        x = 8
        for a in ims:
            im = Image.fromarray(a, "RGBA")
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, 8 + r * (56 * k + 8) + 56 * k - im.height), im)
            x += im.width + 8
    x = 8
    for r, ims in enumerate(rows):
        for a in ims:
            im = Image.fromarray(a, "RGBA")
            sheet.paste(im, (x, len(rows) * (56 * k + 8) + 8), im)
            x += im.width + 2
    sheet.save(path)
    print(path)


def zoom(path, sid, k=6):
    """Scratch: one species' frames, back and icons at k (bottom-aligned)."""
    from kit import to_rgba
    art = render()
    fs, b, icons = art[sid]
    ims = [to_rgba(f, PAL) for f in fs] + [to_rgba(b, PAL)] + [to_rgba(i, PAL) for i in icons]
    for n, f in enumerate(fs):
        op = (f != T).sum()
        ys, xs = np.nonzero(f != T)
        print(f"f{n}: x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} fill {op / f.size:.1%} "
              f"white {(f == 3).sum() / op:.1%} comx {xs.mean():.1f}")
    op = (b != T).sum()
    print(f"back fill {op / b.size:.1%} white {(b == 3).sum() / op:.1%}")
    W = sum(a.shape[1] * k + 8 for a in ims) + 8
    sheet = Image.new("RGB", (W, 56 * k + 16 + 60), (200, 208, 200))
    x = 8
    for a in ims:
        im = Image.fromarray(a, "RGBA").resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)
        sheet.paste(im, (x, 8 + 56 * k - im.height), im)
        x += im.width + 8
    x = 8
    for a in ims:
        im = Image.fromarray(a, "RGBA")
        sheet.paste(im, (x, 56 * k + 16), im)
        x += im.width + 4
    sheet.save(path)


if __name__ == "__main__":
    if "--zoom" in sys.argv:          # --zoom <id> <out.png>
        zoom(sys.argv[sys.argv.index("--zoom") + 2], sys.argv[sys.argv.index("--zoom") + 1])
    elif "--preview" in sys.argv:     # --preview <out.png>
        preview(sys.argv[sys.argv.index("--preview") + 1])
    else:
        build()
