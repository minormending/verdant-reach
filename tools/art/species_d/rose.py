"""Wild rose line: rose_bud -> wild_rose (thorn/bloom).

Rosa canina, the dog rose of hedges: arching canes armed with big hooked
thorns (curved back "like a dog's tooth"), pinnate leaves of 5-7 serrated
leaflets with red-tinged margins, five heart-notched petals pale at the base
and rose at the rim around a ring of gold stamens; feathery sepals; in
autumn, glossy scarlet hips.

rose_bud: COILED. A thorn-spined cane curled into an S, the tight bud head
  pulled back and tilted at the foe, its feathery sepals flaring like claws;
  a leaf raised as a guard.
wild_rose: LUNGING. The bloom thrust at the foe on an arching cane, a
  thorned cane whipping forward as the lead arm, the rear cane arched back
  over the shoulder carrying two glossy hips (the tail).
Scores: rose_bud 8 (COILED; 52px wide; 9: no glint beyond the bud dash);
wild_rose 8 (LUNGING, bloom tilted 3/4 with longer near petals, thorned
cane arm forward, hips as the tail; 1: busy canes at 1x).
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, at, dilate, erode, move, qbez, rot, spline

PAL = ("#306040", "#e86080", "#f8e8b8")   # leaf green / rose / cream


def cane(s, pts, w0, w1, thorns=(), thorn=3.0, rim=0):
    """An arching cane: dark green with a rose lit edge, armed with hooked
    thorns (t along the path, side +1 = right of travel / -1 = left)."""
    path = spline(pts, 24)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=1, k=0, rim=rim, rim_tone=2, line=0)
    if not hasattr(s, "thorns"):
        s.thorns = []
    for t, side, sz in thorns:
        (x, y), (dx, dy) = at(path, t)
        nx, ny = -dy * side, dx * side
        w = w0 + (w1 - w0) * t
        bx, by = x + nx * w * 0.3, y + ny * w * 0.3
        L = thorn * sz
        # a broad base on the cane, the point flung out and hooked back toward the base
        b0 = (bx + dx * L * 0.55, by + dy * L * 0.55)
        b1 = (bx - dx * L * 0.35, by - dy * L * 0.35)
        tip = (bx + nx * L * 1.10 - dx * L * 0.60, by + ny * L * 1.10 - dy * L * 0.60)
        mid = (bx + nx * L * 0.55 + dx * L * 0.15, by + ny * L * 0.55 + dy * L * 0.15)
        s.thorns.append(s.poly([b0, mid, tip, b1], thr=0.4))
    return pid, path


def thorns(s):
    """Draw the queued thorns last, over everything: red hooks, black-lined."""
    for th in getattr(s, "thorns", []):
        s.part(th, base=2, k=1, sh=1, line=0)
    s.thorns = []


def leaflet(s, base, tip, w):
    m, path = s.leaf(base, tip, w, fat=0.50, power=0.55)
    pid = s.part(m, base=1, k=0, line=0)
    return pid


def pinnate(s, base, tip, w, pairs=2):
    """A rose leaf: rachis with `pairs` of leaflets and a terminal one."""
    path = qbez(base, ((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 - 1), tip, 20)
    s.part(s.stroke(path, 1.6), base=1, k=0, line=0)
    for i in range(pairs):
        t = 0.35 + 0.45 * i / max(1, pairs - 1) if pairs > 1 else 0.6
        (x, y), (dx, dy) = at(path, t)
        for sd in (1, -1):
            nx, ny = -dy * sd, dx * sd
            L = w * (1.4 - 0.3 * i)
            e = (x + (nx * 0.85 + dx * 0.5) * L, y + (ny * 0.85 + dy * 0.5) * L)
            leaflet(s, (x, y), e, w * (0.9 - 0.12 * i))
    tx, ty = tip
    (x, y), (dx, dy) = at(path, 1.0)
    leaflet(s, (x - dx, y - dy), (tx + dx * w * 1.3, ty + dy * w * 1.3), w)


def bloom(s, cx, cy, R, tilt=0.0, sq=0.72, rotp=0.0, stamens=True, back=False, shade=0.25):
    """An open five-petal dog rose in 3/4 view, shaded per pixel in the
    flower's own plane: round heart-notched petals, cream at the base
    flushing rose at the rim, pink folds where petals overlap, a green
    centre ringed with gold stamens. sq squashes it across its facing axis,
    tilt (+) turns its top toward the foe. back=True: seen from behind (a
    green calyx star over the petals' backs)."""
    Y, X = np.mgrid[0:s.h, 0:s.w]
    dx, dy = X + 0.5 - cx, Y + 0.5 - cy
    c, sn = math.cos(tilt), math.sin(tilt)
    u = (dx * c - dy * sn) / sq          # back into the flower plane
    v = dx * sn + dy * c
    r = np.hypot(u, v)
    th = np.arctan2(v, u)
    phi = (5 * (th - rotp)) % (2 * math.pi)
    phi = np.where(phi > math.pi, phi - 2 * math.pi, phi)      # 0 at a petal's centre, +-pi between petals
    edge = R * (0.78 + 0.22 * np.sqrt(np.abs(np.cos(phi / 2))))
    edge *= 1 - 0.11 * np.exp(-(phi / 0.32) ** 2)                # heart notch
    if not back:
        edge *= 1 - 0.20 * np.cos(th)                            # 3/4: the near (foe-side) petals longer
    m = r <= edge
    pid = s.part(m, base=3, k=0, line=0)
    t = np.full(m.shape, 3)
    rim = r > edge * (0.66 if not back else 0.55)
    lit = (dx + dy) < shade * R * 1.5
    t[rim] = 2
    t[~lit & (r > edge * 0.48)] = 2
    fold = (np.abs(np.abs(phi) - math.pi) * r / 5 < 0.55) & (r > R * 0.36)
    fm = fold & m
    t[fm] = np.where(t[fm] == 3, 2, 1)
    if not back:
        t[r < R * 0.32] = 1
        if stamens:
            ring = (r >= R * 0.14) & (r < R * 0.29)
            dots = ((np.floor((th + math.pi) * 12 / (2 * math.pi))) % 2) == 0
            t[ring & (dots | (r < R * 0.22))] = 3
            t[r < R * 0.12] = 1
    s.decal(m, 0)
    for k in (1, 2, 3):
        s.decal(m & (t == k), k, on=pid)
    return pid, m


def hip(s, x, y, r, ang=0.4):
    """A glossy rose hip: an ovoid scarlet pod with a crown of dry sepals."""
    m = s.ellipse(x, y, r * 0.8, r, ang=ang)
    gl = s.ellipse(x - r * 0.35, y - r * 0.4, max(1.0, r * 0.22), max(0.8, r * 0.3), ang=ang)
    s.part(m, base=2, k=2, line=0, hl=gl, hl_tone=3)
    # dried sepal crown at the far end
    ex, ey = x + math.sin(ang) * r * 1.0, y + math.cos(ang) * r * 1.0
    cr = s.empty()
    for d in (-1, 0, 1):
        cr |= s.stroke([(ex, ey), (ex + d * 2.2, ey + 2.4)], 1.2)
    s.part(cr | s.circle(ex, ey, 1.2), base=1, k=0, line=0)


def bud(s, x, y, r, ang=0.25):
    """The tight bud: a rose teardrop furled in on itself, clasped by two
    feathery sepals whose tips flare out like claws."""
    tipx, tipy = x - math.sin(ang) * r * 1.9, y - math.cos(ang) * r * 1.9
    m, path = s.leaf((x + math.sin(ang) * r * 0.7, y + math.cos(ang) * r * 0.7), (tipx, tipy), r * 2.1, fat=0.58, power=0.55)
    gl = s.ellipse(x - r * 0.42, y - r * 0.55, max(1.0, r * 0.13), max(1.2, r * 0.30), ang=ang)
    pid = s.part(m, base=2, k=2, sh=1, line=0, hl=gl, hl_tone=3)
    # the furl: two petal edges wrapping round the bud (dark folds)
    for k, (a0, a1) in enumerate(((-0.6, 0.9), (0.2, 1.6))):
        pts = qbez((x - r * 0.75 + k * r * 0.5, y - r * (0.1 + 0.6 * k)),
                   (x + r * 0.1, y + r * (0.45 - 0.5 * k)),
                   (x + r * 0.8, y - r * (0.5 + 0.5 * k)), 16)
        s.decal(s.line1(pts) & erode(m, 1), 1, on=pid)
    # sepals: two narrow green blades hugging the bud's sides, their tips
    # running past its shoulders and flaring out like horns
    for sd in (-1, 1):
        b = (x + sd * r * 0.30, y + r * 1.05)
        c1 = (x + sd * r * 1.15, y + r * 0.10)
        e = (x + sd * r * 0.85 - math.sin(ang) * r * 1.2, y - r * 1.25)
        f = (e[0] + sd * r * 0.55, e[1] - r * 0.45)
        sm = s.stroke(qbez(b, c1, e, 18), (3.2, 1.6)) | s.stroke(qbez(e, (e[0] + sd * r * 0.1, e[1] - r * 0.4), f, 8), (1.6, 1.2))
        s.part(sm, base=1, k=0, line=0)
    return pid


# ---------------------------------------------------------------------------

def front_bud(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1][ph]      # the coil tightens: the lean deepens 1.5 degrees, the guard leaf lifts
    pinnate(s, (34, 54), (45, 52), 5, pairs=1)                     # back foot
    s.lean(31, 54, 14 + 1.5 * b)
    pinnate(s, (35, 34), (47, 25 - b), 5, pairs=1)                 # rear arm, small and high
    cane(s, [(31, 55), (36, 46), (36, 38), (32, 31), (29, 27)], 6.5, 5.0,
         thorns=[(0.16, 1, 1.0), (0.40, 1, 1.1), (0.62, -1, 1.0)], thorn=5.0)
    pinnate(s, (34, 43), (18, 37 - b), 7, pairs=1)                 # lead arm: a leaf raised as a guard
    s.lean()
    cane(s, [(30, 54), (23, 54), (16, 52)], 4.5, 2.8, thorns=[(0.55, 1, 0.9)], thorn=4.4)  # front foot
    hx, hy = s.lean(31, 54, 14 + 1.5 * b) or s.P(28, 19)
    s.lean()
    bud(s, hx, hy, 8.5, ang=0.55 + 0.03 * b)
    thorns(s)
    return s


def front_adult(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1, 1][ph]
    w = [0, 1, 2][ph]
    pinnate(s, (34, 53), (50, 51), 6, pairs=1)                     # back foot: a leaf
    s.lean(32, 54, 12 + 0.7 * w)
    # rear cane: arched high over the shoulder like a tail, hips dangling
    cane(s, [(35, 54), (40, 40), (46, 28), (52, 25), (54, 31)], 4.6, 3.2,
         thorns=[(0.32, -1, 1.0), (0.62, -1, 1.0)], thorn=5.0)
    h1, h2 = s.P(53, 39), s.P(46, 36)
    cane(s, [(32, 55), (36, 45), (34, 35), (29, 28)], 7.0, 5.5,
         thorns=[(0.28, 1, 1.1), (0.55, -1, 1.0)], thorn=5.2)
    cane(s, [(33, 42), (22, 41), (12, 45), (6, 51)], 5.4, 3.0,           # lead arm: a thorned whip
         thorns=[(0.3, 1, 1.15), (0.62, 1, 1.0)], thorn=5.2)
    bx, by = s.P(24, 17)
    s.lean()
    hip(s, h1[0], h1[1], 4.2, ang=0.05)
    hip(s, h2[0], h2[1], 3.6, ang=-0.4)
    bloom(s, round(bx) - b, round(by) + b, 16.5, tilt=0.45, sq=0.60, rotp=0.2)
    thorns(s)
    return s


def back_bud():
    """From behind: the bud huge and close, clasped by its sepals, leaning to
    the foe; leaves both sides, a thorned cane running off the bottom."""
    s = Sprite(48, 48, PAL)
    pinnate(s, (22, 40), (1, 31), 7, pairs=2)
    pinnate(s, (25, 38), (47, 30), 7, pairs=2)
    cane(s, [(20, 48), (22, 38), (26, 30)], 8.0, 6.0, thorns=[(0.25, -1, 1.2), (0.55, 1, 1.2)], thorn=5.0)
    bud(s, 27, 25, 11.0, ang=-0.35)
    thorns(s)
    return s


def back_adult():
    s = Sprite(48, 48, PAL)
    cane(s, [(6, 48), (3, 36), (4, 26)], 5.0, 4.0, thorns=[(0.4, 1, 1.0), (0.7, -1, 1.0)], thorn=4.6)
    hip(s, 5, 24, 4.4, ang=-0.2)
    cane(s, [(42, 48), (45, 38), (46, 30)], 5.0, 4.0, thorns=[(0.5, 1, 1.0)], thorn=4.6)
    cane(s, [(22, 48), (22, 38), (26, 30)], 8.0, 6.0, thorns=[(0.35, 1, 1.2)], thorn=5.0)
    pinnate(s, (22, 42), (2, 44), 6, pairs=2)
    # the bloom from behind: the petals' backs round a green calyx star
    bloom(s, 27, 19, 21, tilt=-0.35, sq=0.88, rotp=0.5, back=True)
    star = s.empty()
    for k in range(5):
        u = 2 * math.pi * k / 5 + 0.2
        star |= s.stroke([(26, 22), (26 + math.cos(u) * 11, 22 + math.sin(u) * 10)], (4.0, 1.4), cap=False)
    s.part(star | s.circle(26, 22, 3.8), base=1, k=0, line=1)
    thorns(s)
    return s


ICON_BUD = [
    "................",
    "...k.....k......",
    "..k1k...k1k.....",
    "..k1kkkkk1k.....",
    "...k12222k......",
    "..k1232222k.....",
    "..k1222222k.....",
    "..k1222221k.....",
    "...k12221k......",
    "....kk11kk.kk...",
    ".kk..k11k.k11k..",
    "k11kk11kk111k...",
    "k1111k11kkkk....",
    ".kkkk2k11k......",
    ".....k11k2k.....",
    "......kkkk......",
]
ICON_ADULT = [
    "...kkkk.........",
    "..k2233kk.......",
    ".k223333k2k.....",
    "k22332233k2k....",
    "k23311133322k...",
    "k2331k11333k....",
    "k22331133322k...",
    ".k2233333322k...",
    "..k2223222kk..k.",
    "...kkkk11kk..k2k",
    "..kk.k11k.kkk21k",
    ".k11k11kkk11kkk.",
    "k1111k11k11k....",
    ".kkkk.k11kk.....",
    "......k111k.....",
    ".......kkk......",
]


def _up(rows):
    return rows[1:] + ["                "]


SPRITES = {
    "rose_bud": dict(pal=PAL, front=front_bud, frames=2, back=back_bud,
                     icon=ICON_BUD, icon2=_up(ICON_BUD)),
    "wild_rose": dict(pal=PAL, front=front_adult, frames=3, back=back_adult,
                      icon=ICON_ADULT, icon2=_up(ICON_ADULT)),
}
