"""Sundew line: sundew_rosette -> sundew.

Round 3 redesign. Signature: the dew-tipped tentacles, exaggerated (long red
hairs, each with a glistening bead). The leaves are grasping hands.

* sundew_rosette, COILED: a low rosette of spoon-leaf feet; two spoons raised
  as hands, the lead one reaching at the foe with its tentacles splayed; the
  circinate flower scape coiled up as the head.
* sundew, REARING: strap leaves rising from the rosette like arms, the lead
  strap curling over at the foe as if wrapping a catch; the scape (head)
  arching forward with its buds.

Round 3 scores (CREATURES.md rubric):
  sundew_rosette   COILED   pose noted above; tentacles reach at the foe.  score: 8 (thin mass)
  sundew           REARING  hooked lead strap; 2px dew beads w/ glint.      score: 8 (tentacle field is dense)
"""

from __future__ import annotations

import functools
import math

import numpy as np

from pix import arclen_param, bez, dilate, erode, qbez, shift
from icons_wild import ICONS
from rig import Spr as Sprite, fit_back

PAL = ("#a02048", "#90c840", "#f0f8d8")   # crimson tentacles + shadow (accent), leaf green, dew


def tentacles(s, mask, n_from, spacing=3, length=3, region=None, bead=True):
    """Red glandular hairs standing out of a leaf edge, each with a dew bead.
    Hairs follow the outward normal of the mask; drawn after the outline so
    they are fine lines, not outlined blobs."""
    ys, xs = np.nonzero(mask & ~erode(mask, 1))
    if region is not None:
        keep = region[ys, xs]
        ys, xs = ys[keep], xs[keep]
    if not len(xs):
        return
    # outward normal from a blurred mask gradient
    f = mask.astype(float)
    for _ in range(3):
        f = (f + shift(f, 1, 0) + shift(f, -1, 0) + shift(f, 0, 1) + shift(f, 0, -1)) / 5
    gy, gx = np.gradient(f)
    cy, cx = n_from
    order = np.argsort(np.arctan2(ys - cy, xs - cx))
    hair = np.zeros(mask.shape, bool)
    dew = np.zeros(mask.shape, bool)
    picked = []
    for i in order:
        x, y = int(xs[i]), int(ys[i])
        if any(max(abs(x - a), abs(y - b)) < spacing for a, b in picked):
            continue
        nx, ny = -gx[y, x], -gy[y, x]
        L = math.hypot(nx, ny)
        if L < 1e-6:
            continue
        # snap to one of 8 directions so every hair is a clean 1px line
        a8 = round(math.atan2(ny, nx) / (math.pi / 4)) * (math.pi / 4)
        dx, dy = round(math.cos(a8)), round(math.sin(a8))
        # walk out of the leaf, then the hair, then the bead
        X, Y = x, y
        while 0 <= X < s.w and 0 <= Y < s.h and mask[Y, X]:
            X, Y = X + dx, Y + dy
        cells = [(X + dx * k, Y + dy * k) for k in range(0, length)]
        bx, by = X + dx * length, Y + dy * length
        # a 2px dew bead (the glint) cupped in crimson on its shadow side
        pair = [(bx, by), (bx + 1, by)] if abs(dy) >= abs(dx) else [(bx, by), (bx, by + 1)]
        if dx < 0 and abs(dy) < abs(dx):
            pass
        ring = sorted({(u + 1, v) for u, v in pair} | {(u, v + 1) for u, v in pair} | {(u - 1, v) for u, v in pair if dx > 0}
                      | {(u, v - 1) for u, v in pair if dy > 0}) 
        ring = [q for q in ring if q not in pair]
        allc = cells + pair + ring
        if any(not (0 <= u < s.w and 0 <= v < s.h) or mask[v, u] for u, v in allc):
            continue
        picked.append((x, y))
        for u, v in cells + ring:
            hair[v, u] = True
        for u, v in pair:
            dew[v, u] = True
    s.post.append((hair, 1))
    s.post.append((dew, 3))


def spoon(s, base, tip, R, sq=0.75, ang=None, pet=1.8, k=2, hl=None, rim=True):
    """Petiole + round tentacled pad (Drosera rotundifolia leaf)."""
    bx, by = base
    tx, ty = tip
    if ang is None:
        ang = math.atan2(ty - by, tx - bx)
    path = qbez(base, ((bx + tx) / 2, (by + ty) / 2 - 1.5), (tx - math.cos(ang) * R * 0.7, ty - math.sin(ang) * R * 0.7), 30)
    pm = s.stroke(path, (pet + 0.6, pet))
    pid = s.part(pm, base=2, k=1, line=0)
    m = s.ellipse(tx, ty, R, R * sq, ang=ang)
    lid = s.part(m, base=2, k=2, line=0, hl=hl, merge=[pid])
    if rim:
        s.decal(m & ~erode(m, 1), 1, on=[lid])
    return lid, m


def strap(s, ctrl, w, curl=None, k=2, hl=None):
    """A strap leaf (Drosera capensis) along ctrl; curl=(R, sign) rolls the tip."""
    path = bez(ctrl, 40)
    if curl:
        R, sg = curl
        (x1, y1), (x0, y0) = path[-1], path[-6]
        tx, ty = x1 - x0, y1 - y0
        tl = math.hypot(tx, ty)
        tx, ty = tx / tl, ty / tl
        nx, ny = (-ty * sg, tx * sg)
        cx, cy = x1 + nx * R, y1 + ny * R
        a0 = math.atan2(y1 - cy, x1 - cx)
        sd = 1 if (-(y1 - cy) * tx + (x1 - cx) * ty) > 0 else -1
        path = path + [(cx + R * (1 - 0.35 * u) * math.cos(a0 + sd * u * 1.1 * math.pi),
                        cy + R * (1 - 0.35 * u) * math.sin(a0 + sd * u * 1.1 * math.pi)) for u in np.linspace(0.02, 1, 30)]
    m = s.stroke(path, lambda t: w * (0.55 + 0.45 * math.sin(math.pi * min(1, 0.15 + t))) if t < 0.9 else w * 0.7)
    pid = s.part(m, base=2, k=k, line=0, hl=hl)
    s.decal(m & ~erode(m, 1) & ~shift(m, 0, 1), 1, on=[pid])   # red rim on the lower edges
    return pid, m, path


def scape(s, ctrl, R, w=2.4, turns=1.0, sg=-1, buds=2):
    """The flower scape: a stalk that ends in a circinate (rolled) tip with buds."""
    path = bez(ctrl, 30)
    (x1, y1), (x0, y0) = path[-1], path[-5]
    tx, ty = x1 - x0, y1 - y0
    tl = math.hypot(tx, ty)
    tx, ty = tx / tl, ty / tl
    nx, ny = (-ty * sg, tx * sg)
    cx, cy = x1 + nx * R, y1 + ny * R
    a0 = math.atan2(y1 - cy, x1 - cx)
    sd = 1 if (-(y1 - cy) * tx + (x1 - cx) * ty) > 0 else -1
    sp = [(cx + R * (1 - 0.6 * u) * math.cos(a0 + sd * u * turns * 2 * math.pi),
           cy + R * (1 - 0.6 * u) * math.sin(a0 + sd * u * turns * 2 * math.pi)) for u in np.linspace(0.02, 1, 50)]
    full = path + sp
    m = s.stroke(full, lambda t: w * (1 - 0.35 * t))
    pid = s.part(m, base=2, k=1, line=0)
    # buds: round knobs strung along the hook's outer side (a one-sided raceme)
    ids = [pid]
    for j in range(buds):
        a = a0 + sd * (0.15 + j * 0.85 / max(1, buds)) * 2 * math.pi * turns
        rr = R * (1 - 0.6 * (0.15 + j * 0.85 / max(1, buds))) + w * 0.5 + 1.2
        bm = s.circle(cx + rr * math.cos(a), cy + rr * math.sin(a), 2.0 - 0.25 * j)
        ids.append(s.part(bm, base=2, k=1, line=0))
    return pid, full, (cx, cy)


# ---------------------------------------------------------------------------
# sundew_rosette
# ---------------------------------------------------------------------------

def front_rosette(p=0):
    s = Sprite(56, 56, PAL, sc=0.98)
    b = p
    s.set_tilt(12, 31, 51)
    cx, cy = 31, 51
    # rear hand: raised high behind, far side (smaller, higher)
    rear, rm = spoon(s, (cx + 1, cy), (37, 25 - b), 5.6, sq=0.8, ang=-1.3, pet=2.2)
    # feet: ground spoons splayed wide, foreshortened
    with s.untilted(): f2, fm2 = spoon(s, (cx, cy), (45, 52), 4.4, sq=0.55, ang=0.1)
    with s.untilted(): f1, fm1 = spoon(s, (cx, cy), (15, 52), 4.8, sq=0.55, ang=3.1)
    # the head: the flower scape coiled up like a question mark, tilted at the foe
    sid, path, (hx, hy) = scape(s, [(cx, cy), (cx + 2, 40), (cx - 2, 27), (cx - 8, 18)], 3.6, w=2.4, turns=0.6, sg=-1, buds=3)
    # lead hand: thrust forward at the foe, tentacles splayed like fingers
    hl = s.ellipse(8, 30, 2.0, 0.9, ang=-0.6)
    lead, lm = spoon(s, (cx - 1, cy), (12 - b, 35), 9.0, sq=0.85, ang=-2.6, pet=2.8, hl=hl)
    tentacles(s, lm, (cx, cy), spacing=6, length=4)
    tentacles(s, rm, (cx, cy), spacing=8, length=3)
    up = np.zeros((56, 56), bool)
    up[:51] = True
    s.contact += [(11, 19), (41, 48)]
    return s


def back_rosette():
    s = Sprite(48, 60, PAL)
    cx, cy = 18, 60
    # from behind and above: the backs (undersides) of the spoons, plain
    # green, ribbed; the lead hand raised on the right toward the foe, its
    # dew beads glinting past the far rim; the coiled scape leaning top-right
    _, m1 = spoon(s, (cx, cy), (5, 46), 7, sq=0.7, ang=3.6, pet=3, rim=False)
    sid, path, _ = scape(s, [(cx, cy), (cx - 1, 40), (cx + 4, 26), (cx + 10, 16)], 4.0, w=3.2, turns=0.6, sg=1, buds=3)
    _, m2 = spoon(s, (cx + 2, cy), (34, 26), 11, sq=0.85, ang=-0.7, pet=3.6, rim=False,
                  hl=s.ellipse(29, 21, 2.5, 1.0, ang=-0.7))
    s.decal(s.line1(bez([(27, 33), (35, 26), (40, 20)], 12)), 1)
    _, m3 = spoon(s, (cx + 1, cy), (40, 48), 7, sq=0.7, ang=-0.2, pet=3, rim=False)
    s.part(s.ellipse(cx + 1, cy + 1, 11, 6), base=2, k=2, line=0)
    far = np.zeros((s.h, s.w), bool)
    far[:24, 30 + s.ox:] = True
    tentacles(s, m2, (cx, cy), spacing=6, length=3, region=far)
    return s


# ---------------------------------------------------------------------------
# sundew
# ---------------------------------------------------------------------------

def front_sundew(p=0):
    s = Sprite(60, 60, PAL)
    b = p
    s.set_tilt(10, 33, 57)
    bx, by = 33, 57
    # rear arm: a strap swept up and back, its tip hooked
    _, m1, _ = strap(s, [(bx + 1, by), (bx + 8, 44), (bx + 15, 30), (bx + 18, 20 - b)], 5.6, curl=(3.2, -1))
    # the head: the scape arching forward, its rolled tip of buds over the foe
    sid, path, _ = scape(s, [(bx, by), (bx + 3, 40), (bx, 22), (bx - 6, 12 - b)], 4.0, w=2.4, turns=0.6, sg=-1, buds=3)
    # ground rosette feet
    with s.untilted(): _, f1, _ = strap(s, [(bx, by), (bx - 9, 55), (bx - 19, 55)], 4.2)
    with s.untilted(): _, f2, _ = strap(s, [(bx, by), (bx + 10, 55), (bx + 18, 53)], 4.0)
    # lead arm: rears up then hooks over at the foe like a whip wrapping a catch
    hl = s.ellipse(bx - 22, 27, 1.8, 0.9, ang=-0.7)
    _, m3, _ = strap(s, [(bx - 1, by), (bx - 9, 46), (bx - 17, 36), (bx - 22, 28), (bx - 21, 21)], 7.4,
                     curl=(4.6 + 0.4 * b, 1), hl=hl)
    for m, L, sp in ((m3, 4, 7), (m1, 3, 10)):
        tentacles(s, m, (bx, by - 20), spacing=sp, length=L)
    up = np.zeros((60, 60), bool)
    up[:55] = True
    s.contact += [(bx - 18, bx - 10), (bx + 9, bx + 16)]
    return s


def back_sundew():
    s = Sprite(48, 64, PAL)
    bx, by = 16, 70
    # from behind: the straps' green backs (no glands on this side), the lead
    # strap rearing on the right and hooking over toward the foe, beads
    # glinting only where its tip curls past
    _, m1, _ = strap(s, [(bx, by), (bx - 6, 50), (bx - 9, 34), (bx - 8, 24)], 6.5, curl=(3.4, 1))
    sid, path, _ = scape(s, [(bx + 2, by), (bx + 4, 44), (bx + 9, 26), (bx + 14, 12)], 4.2, w=3.0, turns=0.6, sg=1, buds=3)
    _, m3, _ = strap(s, [(bx + 2, by), (bx + 12, 52), (bx + 22, 36), (bx + 27, 22), (bx + 25, 14)], 8.0,
                     curl=(4.6, -1), hl=s.ellipse(bx + 19, 38, 1.0, 2.5, ang=0.6))
    s.part(s.ellipse(bx + 4, 60, 14, 6), base=2, k=2, line=0)
    far = np.zeros((s.h, s.w), bool)
    far[:22, 26 + s.ox:] = True
    tentacles(s, m3, (bx + 20, 30), spacing=6, length=3, region=far)
    return s


ICON_ROSETTE = None
ICON_SUNDEW = None

SPRITES = {
    "sundew_rosette": dict(pal=PAL, front=front_rosette, back=fit_back(back_rosette), icon=ICONS["sundew_rosette"], icon2="bob",
                           idle=[functools.partial(front_rosette, 1)]),
    "sundew": dict(pal=PAL, front=front_sundew, back=fit_back(back_sundew), icon=ICONS["sundew"], icon2="bob",
                   idle=[functools.partial(front_sundew, 1)]),
}
