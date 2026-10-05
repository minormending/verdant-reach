"""Sundew line: sundew_rosette -> sundew.

Green blades rimmed in red tentacles, each tipped with a white dewdrop.
Signature: the dew-tipped fringe; the baby is a flat rosette of spoons, the
adult a fountain of strap leaves with one curled over its catch.
"""

from __future__ import annotations

import math

from pix import Sprite, arclen_param, bez, qbez, rot

PAL = ("#b02838", "#98c848")


def blade(s, path, width, k=2, hl=None, base=2):
    """A leaf along path with full width(t); returns (part id, edge samples)
    where edge samples are (x, y, nx, ny, t) on both sides."""
    ts, L = arclen_param(path)
    left, right, edges = [], [], []
    for i, (x, y) in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, ty) or 1
        nx, ny = -ty / tl, tx / tl
        w = width(ts[i]) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
        edges.append((x + nx * w, y + ny * w, nx, ny, ts[i]))
        edges.append((x - nx * w, y - ny * w, -nx, -ny, ts[i]))
    # round the tip
    m = s.poly(left + right[::-1])
    tx, ty = path[-1]
    wt = width(1.0) / 2
    if wt > 0.8:
        m |= s.circle(tx, ty, wt)
    pid = s.part(m, base=base, k=k, hl=hl, line=0)
    return pid, edges, m


def beads(s, mask, pid=None, spacing=3, t_from=None, band=True, rim_tone=1, keep=None):
    """Red glandular rim (1px band inside the edge) and white dew beads sat on
    the edge every `spacing` px (each bead gets its own outline ring)."""
    from pix import erode, dilate, shift
    import numpy as np
    if band:
        edge = mask & ~erode(mask, 1)
        if keep is not None:
            edge &= keep
        s.decal(edge, rim_tone, on=[pid] if pid else None)
    # candidate bead spots: outside pixels 4-adjacent to the mask, on its
    # upper/outer side (not the bottom, which faces the stem)
    out = dilate(mask, 1) & ~mask & (s.tone < 0)
    if keep is not None:
        out &= dilate(keep, 1)
    ys, xs = np.nonzero(out)
    # order the ring by angle round the mask centroid, then take every n-th
    my, mx = np.nonzero(mask)
    cy, cx = my.mean(), mx.mean()
    order = np.argsort(np.arctan2(ys - cy, xs - cx))
    picked = []
    for i in order[::spacing]:
        x, y = xs[i], ys[i]
        if all(abs(x - px) + abs(y - py) > 2 for px, py in picked):
            picked.append((x, y))
    s.px(picked, 3)
    for x, y in picked:
        s.soft[y, x] = True
    return picked


# ---------------------------------------------------------------------------
# sundew_rosette: a flat star of red-rimmed spoons seen from above
# ---------------------------------------------------------------------------

def spoon(s, cx, cy, ang, L, R, sq=0.6, k=2):
    """Petiole + round pad radiating from the centre at ang (foreshortened)."""
    ex, ey = cx + math.cos(ang) * L, cy + math.sin(ang) * L * sq
    path = qbez((cx, cy), ((cx + ex) / 2, (cy + ey) / 2 - 1.0), (ex, ey), 30)
    stalk = s.stroke(path, (2.0, 2.6))
    pad = s.ellipse(ex, ey, R, R * 0.8, ang=ang * 0.2)
    pid = s.part(stalk | pad, base=2, k=k, line=0)
    # the red glandular face: rim band, green heart
    inner = s.ellipse(ex - 0.5, ey - 0.6, R * 0.66, R * 0.5, ang=ang * 0.2)
    s.decal(pad & ~inner, 1, on=[pid])
    return pid, (ex, ey), pad


def scape(s, x, y, h, r=3.0, lean=-1):
    """The flower stalk, its tip still rolled into a little curl (circinate)."""
    path = bez([(x, y), (x + lean * 1, y - h * 0.5), (x + lean * 2, y - h)], 20)
    sm = s.stroke(path, (2.2, 1.8))
    cx, cy = x + lean * 2 + lean * r * 0.9, y - h - r * 0.4
    ring = s.circle(cx, cy, r)
    pid = s.part(sm | ring, base=2, k=1, line=0, hl=s.circle(cx - 0.8, cy - 1.2, 0.7))
    s.ink(s.line1([(cx + math.cos(a) * r * (0.7 - 0.5 * a / 9), cy + math.sin(a) * r * (0.7 - 0.5 * a / 9)) for a in [i / 40 * 9 for i in range(41)]]) & s.circle(cx, cy, r - 0.6), 0, pid=pid)
    return pid


def front_rosette():
    s = Sprite(64, 64, PAL, sc=1.0)
    cx, cy = 32, 52
    # the flower stalk rising from the heart behind, curled at the tip
    scape(s, cx + 1, cy - 2, 20, r=3.6)
    angs = [-math.pi / 2 - 0.75, -math.pi / 2 + 0.75, -math.pi + 0.1, -0.1, math.pi - 0.7, 0.7]
    pads = []
    for a in angs:
        L = 14 if math.sin(a) < 0 else 13
        pads.append(spoon(s, cx, cy, a, L, 6.0))
    # dew beads round all the pads together
    allpads = pads[0][2]
    for p in pads:
        allpads = allpads | p[2]
    beads(s, s.tone >= 0, band=False, spacing=4, keep=allpads)
    s.part(s.ellipse(cx, cy - 1, 3.0, 2.2), base=2, k=1, line=0)
    return s


def back_rosette():
    s = Sprite(48, 72, PAL)
    cx, cy = 24, 54
    angs = [-math.pi / 2, -math.pi / 2 - 0.95, -math.pi / 2 + 0.95, math.pi - 0.1, 0.1, math.pi - 0.8, 0.8]
    pads = []
    for a in angs:
        pads.append(spoon(s, cx, cy, a, 16, 6.8, sq=0.8))
    scape(s, cx, cy - 2, 20, r=4.0, lean=1)
    allpads = pads[0][2]
    for p in pads:
        allpads = allpads | p[2]
    beads(s, s.tone >= 0, band=False, spacing=4, keep=allpads)
    return s


ICON_ROSETTE = [
    "                ",
    "                ",
    "                ",
    "    3      3    ",
    "  3kkk3  3kkk3  ",
    "  k121k  k121k  ",
    "3kk1k1kkkk1k1kk3",
    "k121kk2222kk121k",
    "k1221k2332k1221k",
    "3kkk22k22k22kkk3",
    " 3k121kkkk121k3 ",
    "  k1221kk1221k  ",
    "  3kkkk11kkkk3  ",
    "     k1221k     ",
    "     3kkkk3     ",
    "                ",
]


# ---------------------------------------------------------------------------
# sundew: a fountain of dewy straps, one curled over its catch
# ---------------------------------------------------------------------------

def strap(s, ctrl, w=5.6, k=2, hl=None, sp=3):
    path = bez(ctrl, 30)
    width = lambda t: 2.0 + (w - 2.0) * min(1, t * 2.0)
    pid, edges, m = blade(s, path, width, k=k, hl=hl)
    # glands only on the upper two thirds of the blade
    ts, L = arclen_param(path)
    upper = s.stroke(path[int(len(path) * 0.3):], w + 2)
    s.decal(m & ~__import__("pix").erode(m, 1) & upper, 1, on=[pid])
    return pid, path, m, upper


def front_sundew():
    s = Sprite(72, 72, PAL, sc=0.88)
    bx, by = 36, 71
    leaves = []
    leaves.append(strap(s, [(bx + 1, by), (bx + 5, 52), (bx + 11, 32), (bx + 16, 20)]))
    leaves.append(strap(s, [(bx + 2, by), (bx + 13, 56), (bx + 22, 46), (bx + 27, 42)]))
    leaves.append(strap(s, [(bx - 2, by), (bx - 13, 56), (bx - 21, 46), (bx - 26, 43)]))
    # the hero leaf: tall, curled over at the tip like a beckoning finger
    leaves.append(strap(s, [(bx, by), (bx - 1, 46), (bx - 5, 28), (bx - 12, 17), (bx - 19, 18), (bx - 21, 24), (bx - 17, 28)],
                        w=6.4, hl=s.ellipse(bx - 14, 17, 2.0, 0.8, ang=-0.3)))
    keep = leaves[0][3]
    for l in leaves:
        keep = keep | l[3]
    beads(s, s.tone >= 0, band=False, spacing=4, keep=keep)
    # the catch: a little gnat held in the curl
    s.px([(bx - 15, 22), (bx - 14, 22), (bx - 15, 23)], 0)
    return s


def back_sundew():
    s = Sprite(48, 72, PAL)
    bx, by = 24, 72
    leaves = [
        strap(s, [(bx, by), (bx - 8, 58), (bx - 18, 48), (bx - 23, 44)], w=5.5),
        strap(s, [(bx, by), (bx + 8, 58), (bx + 18, 48), (bx + 23, 44)], w=5.5),
        strap(s, [(bx, by), (bx - 3, 50), (bx - 8, 32), (bx - 12, 22)], w=5.5),
        strap(s, [(bx, by), (bx + 1, 48), (bx + 5, 30), (bx + 12, 22), (bx + 17, 25), (bx + 16, 31)], w=6),
    ]
    keep = leaves[0][3]
    for l in leaves:
        keep = keep | l[3]
    beads(s, s.tone >= 0, band=False, spacing=4, keep=keep)
    return s


ICON_SUNDEW = [
    "    3 3         ",
    "   3kkk3        ",
    "  3k212k3  3    ",
    "  k2kk12k3k3 3  ",
    "  3k3 k2kk12k3  ",
    "   3 3k21k21k   ",
    "  3   k21k2k3   ",
    " 3k3  k21k2k    ",
    "3k12k3k21k2k 3  ",
    " kk12kk2k12k3k3 ",
    " 3 k12k2k2kk21k3",
    "    k12221k21k  ",
    "    3k1221k1k3  ",
    "     k1221kk    ",
    "     k1121k     ",
    "      kkkk      ",
]


SPRITES = {
    "sundew_rosette": dict(pal=PAL, front=front_rosette, back=back_rosette, icon=ICON_ROSETTE),
    "sundew": dict(pal=PAL, front=front_sundew, back=back_sundew, icon=ICON_SUNDEW),
}
