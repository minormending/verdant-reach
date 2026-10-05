"""Pumpkin line: pumpkin_blossom -> green_pumpkin -> pumpkin.

Signature: the ribbed gourd (a bud-sized one under the blossom, a green one,
the full orange one) and a vine tendril that grows from a flick into a big
coiled crown. Palettes share the warm orange (blossom/pumpkin) and the line
is tied by the gourd + curl shapes.
"""

from __future__ import annotations

import math

from pix import Sprite, bez, erode, rot

PAL_BLOSSOM = ("#c85010", "#f8b828", "#f8f0a8")
PAL_GREEN = ("#306830", "#98c840", "#e0f0a8")
PAL_PUMPKIN = ("#b03810", "#f88820", "#f8e0a0")


def gourd(s, cx, cy, w, h, lobes=5, base=2, k=2, rib=1, hl=True, deep=0, tilt=0.0):
    """Ribbed gourd from overlapping lobes, back lobes first. Returns part ids."""
    ids = []
    # lobe centres across the width; outer lobes narrower and lower in z
    n = lobes
    order = sorted(range(n), key=lambda i: -abs(i - (n - 1) / 2))
    for i in order:
        f = (i - (n - 1) / 2) / ((n - 1) / 2)   # -1..1
        lx = cx + f * (w / 2 - w / (2 * n) * 1.15)
        rx = w / n * (0.80 if abs(f) > 0.9 else 0.72) * 1.05
        ry = h / 2 * (1 - 0.16 * abs(f) ** 2)
        ly = cy + abs(f) * h * 0.06 + f * tilt
        m = s.ellipse(lx, ly, rx, ry)
        hlm = None
        if hl and i == (n - 1) // 2 - (1 if n > 3 else 0):
            hlm = s.ellipse(lx - rx * 0.30, ly - ry * 0.42, max(1.0, rx * 0.22), ry * 0.26)
        ids.append(s.part(m, base=base, k=k, hl=hlm, line=rib, deep=deep))
    return ids


def gourd3d(s, cx, cy, R, sq=0.8, n=8, elev=0.5, spin=0.0, base=2, k=2, deep=0, rib=0,
            hl=True, pinch=0.0, extra=3, stripe=None):
    """A ribbed gourd as a real (oblate) sphere cut into n longitude lobes,
    viewed from `elev` radians above, orthographic. Lobes paint far-to-near so
    the near ones cover; each draws its rib line on the lobe behind it.
    Lobes on the right (away from the light) get a wider shadow band.
    Returns (ids, pole_xy)."""
    ce, se = math.cos(elev), math.sin(elev)

    def P(th, ph):
        r = 1.0 - pinch * (1 - math.cos(ph)) * 0.0
        x = math.cos(ph) * math.sin(th) * r
        y = math.sin(ph) * sq
        z = math.cos(ph) * math.cos(th) * r
        y2 = y * ce - z * se
        z2 = y * se + z * ce
        return (cx + R * x, cy - R * y2), z2

    bands = []
    for i in range(n):
        t0 = spin + 2 * math.pi * i / n
        t1 = spin + 2 * math.pi * (i + 1) / n
        tm = (t0 + t1) / 2
        phs = [(-math.pi / 2 + math.pi * j / 40) for j in range(41)]
        e0 = [P(t0, ph)[0] for ph in phs]
        e1 = [P(t1, ph)[0] for ph in phs]
        depth = math.cos(tm)
        xm = math.sin(tm)
        bands.append((depth, e0 + e1[::-1], xm, i))
    bands.sort()
    ids = []
    for depth, poly, xm, i in bands:
        m = s.poly(poly)
        if depth < -0.2:
            ids.append(s.part(m, base=base - 1, k=0, line=rib))
            continue
        kk = k + max(0, round(extra * xm))
        hm = None
        if hl and -0.75 < xm < -0.2 and depth > 0:
            (hx, hy), _ = P((-0.7), 0.45 if elev < 0.3 else 0.75)
            hm = s.ellipse(hx, hy, 1.3, 3.6 if elev < 0.3 else 2.4, ang=0.15)
            hl = False
        pid = s.part(m, base=base, k=kk, deep=deep, hl=hm, line=rib, shadow=(1, 0.35))
        ids.append(pid)
        if stripe is not None and depth > 0.2:
            tm = (spin + 2 * math.pi * (i + 0.5) / n)
            pts = [P(tm, -math.pi / 2 * 0.7 + math.pi * 0.75 * j / 30)[0] for j in range(31)]
            s.decal(s.line1(pts) & erode(m, 2), stripe, on=[pid])
    pole, _ = P(0, math.pi / 2)
    return ids, pole


def tendril(s, pts, tone=0):
    m = s.line1(bez(pts, 40))
    s.ink(m, tone)
    return m


def curl(cx, cy, r0, turns, a0=0.0, sq=1.0, n=120, r1=0.6, cw=True):
    out = []
    for i in range(n):
        t = i / (n - 1)
        r = r0 + (r1 - r0) * t
        a = a0 + (1 if cw else -1) * turns * 2 * math.pi * t
        out.append((cx + r * math.cos(a), cy + r * math.sin(a) * sq))
    return out


# ---------------------------------------------------------------------------
# pumpkin_blossom: a golden star flower riding a bud-sized gourd
# ---------------------------------------------------------------------------

def blossom_star(s, cx, cy, R, r, squash=0.82, ang=-0.25):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = R if i % 2 == 0 else r
        # petal tips slightly flared (two points per tip)
        if i % 2 == 0:
            for da in (-0.07, 0.07):
                pts.append((cx + rr * math.cos(a + da), cy + rr * math.sin(a + da) * squash))
        else:
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * squash))
    return rot(pts, ang, cx, cy)


def star_pts(cx, cy, R, r, squash, ang):
    tips, vals = [], []
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        tips.append((cx + R * math.cos(a), cy + R * math.sin(a) * squash))
        b = a + math.pi / 5
        vals.append((cx + r * math.cos(b), cy + r * math.sin(b) * squash))
    return rot(tips, ang, cx, cy), rot(vals, ang, cx, cy)


def flower(s, cx, cy, R, r, squash, ang, hl_xy, throat=True):
    poly = blossom_star(s, cx, cy, R, r, squash, ang)
    star = s.poly(poly)
    fid = s.part(star, base=2, k=2, hl=None, line=0)
    tips, vals = star_pts(cx, cy, R, r, squash, ang)
    # pleats: the clockwise half of each petal away from the light sits in shade
    for i in range(5):
        tx, ty = tips[i]
        if (tx - cx) + (ty - cy) < -R * 0.5:
            continue
        tri = s.poly([(cx, cy), tips[i], vals[i]])
        s.decal(tri & ~s.ellipse(cx, cy, r * 0.45, r * 0.45 * squash), 1, on=[fid])
    # one highlight streak along the upper-left petal's lit half
    hx, hy, hr = hl_xy
    s.decal(s.ellipse(hx, hy, 1.2, hr, ang=-0.9), 3, on=[fid])
    if throat:
        s.decal(s.ellipse(cx + 0.3, cy + 0.3, r * 0.48, r * 0.42), 1, on=[fid])
        st = s.ellipse(cx - 0.2, cy - 0.4, 2.0, 2.0)
        s.part(st, base=2, k=1, hl=s.ellipse(cx - 0.9, cy - 1.1, 0.7, 0.7), line=0)
    return fid


def front_blossom():
    s = Sprite(64, 64, PAL_BLOSSOM, sc=0.84)
    # tendril flick behind the bud
    ids, (px, py) = gourd3d(s, 31, 51, 11, sq=0.8, n=6, elev=0.3, spin=math.pi / 6, base=1, k=0, rib=0, extra=0)
    # tendril springing off the calyx, curling out to the left
    c = curl(14, 43, 4.0, 0.95, a0=-0.3, r1=1.2, cw=False)
    s.part(s.stroke(bez([(27, py), (20, py + 1), c[0]], 16) + c[1:], (2.2, 1.5)), base=1, k=0, line=0)
    # calyx where flower meets bud
    s.part(s.poly([(25, py + 1), (28, py - 4), (31, py - 1), (34, py - 4), (37, py + 1), (31, py + 3)]), base=1, k=0, line=0)
    flower(s, 30, 27, 20, 9.5, 0.84, -0.25, (21, 20, 3.0))
    return s


def back_blossom():
    s = Sprite(48, 72, PAL_BLOSSOM)
    ids, (px, py) = gourd3d(s, 24, 62, 17, sq=0.8, n=8, elev=0.75, spin=math.pi / 8, base=1, k=0, rib=0, extra=0)
    # the flower from behind: green-gold backs of the petals, calyx at the centre
    cx, cy = 24, 36
    poly = blossom_star(s, cx, cy, 23, 11, squash=0.6, ang=0.25)
    fid = s.part(s.poly(poly), base=2, k=2, line=0)
    tips, vals = star_pts(cx, cy, 23, 11, 0.6, 0.25)
    for i in range(5):
        tri = s.poly([(cx, cy), tips[i], vals[i]])
        s.decal(tri, 1, on=[fid])
    s.decal(s.ellipse(cx - 12, cy - 5, 1.2, 3.0, ang=-1.2), 3, on=[fid])
    s.part(s.poly([(cx - 6, cy + 1), (cx - 3, cy - 3), (cx, cy), (cx + 3, cy - 3), (cx + 6, cy + 1), (cx, cy + 4)]), base=1, k=0, line=0)
    return s


ICON_BLOSSOM = [
    "                ",
    "      k  k      ",
    "  kkkk2kk2kkkk  ",
    "  k3322k22222k  ",
    "   k3221122kk   ",
    "  kk2211112kk   ",
    " k22221112222k  ",
    " k2222k2k2221k  ",
    "  kk22kkk21kk   ",
    "    kk1k1kk     ",
    "    k11111k  k  ",
    "   k1211111k1k  ",
    "   k12111111k   ",
    "   k11111111k   ",
    "    kk1111kk    ",
    "      kkkk      ",
]


# ---------------------------------------------------------------------------
# green_pumpkin: a striped green gourd under a curling vine and leaf
# ---------------------------------------------------------------------------

def pumpkin_leaf(s, cx, cy, size, ang=0.0):
    """Five-lobed, rounded pumpkin leaf (a soft maple shape)."""
    pts = []
    for i in range(60):
        a = i / 60 * 2 * math.pi
        lob = 0.78 + 0.22 * abs(math.cos(2.5 * (a + math.pi / 2)))
        r = size * lob
        if math.sin(a) > 0.75:   # notch at the stem
            r *= 0.75
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * 0.8))
    return s.poly(rot(pts, ang, cx, cy))


def front_green():
    s = Sprite(64, 64, PAL_GREEN, sc=0.86)
    # leaf behind, top right, on its own stalk from the stem
    s.part(s.curve([(32, 30), (37, 27), (41, 26)], (2.4, 2.0)), base=1, k=0, line=0)
    leaf = pumpkin_leaf(s, 45, 21, 11, ang=0.35)
    lid = s.part(leaf, base=2, k=2, hl=s.ellipse(40, 16, 2, 1.4, ang=-0.5), line=0)
    for p1 in [(37, 16), (46, 12), (53, 20), (50, 29)]:
        s.decal(s.line1(bez([(43, 25), p1], 20)), 1, on=[lid])
    ids, (px, py) = gourd3d(s, 31, 44, 21, sq=0.8, n=10, elev=0.28, spin=math.pi / 10, k=2, rib=1, stripe=3)
    # stem: thick, leaning left, cut top
    stem = s.curve([(px, py + 2), (px - 1, py - 4), (px - 5, py - 9), (px - 10, py - 10)], (6, 4.2))
    sid = s.part(stem, base=1, k=0, line=0, hl=s.ellipse(px - 2.5, py - 3, 0.8, 2.2, ang=0.4))
    s.part(s.ellipse(px - 10.5, py - 10.5, 2.2, 2.6), base=2, k=1, line=0, merge=[sid])
    # the vine curl, springing up off the stem
    c = curl(px - 6, py - 17, 4.0, 0.9, a0=0.1, r1=1.4, cw=False)
    vine = bez([(px - 3, py - 7), (px - 2, py - 11), c[0]], 16) + c[1:]
    s.part(s.stroke(vine, (2.6, 1.6)), base=1, k=0, line=0)
    return s


def back_green():
    s = Sprite(48, 72, PAL_GREEN)
    leaf = pumpkin_leaf(s, 36, 24, 10, ang=-0.3)
    lid = s.part(leaf, base=2, k=2, line=0, hl=s.ellipse(32, 20, 2, 1.3))
    for p1 in [(29, 19), (37, 15), (44, 23), (41, 30)]:
        s.decal(s.line1(bez([(35, 28), p1], 20)), 1, on=[lid])
    ids, (px, py) = gourd3d(s, 24, 50, 23.5, sq=0.85, n=10, elev=0.75, spin=math.pi / 10, k=2, rib=1, stripe=3)
    # leaf stalk running from the stem over the shoulder
    s.part(s.curve([(px + 1, py - 2), (px + 6, py - 6), (px + 10, py - 8)], (2.6, 2.2)), base=1, k=0, line=0)
    stem = s.curve([(px, py + 1), (px - 1, py - 4), (px - 5, py - 7)], (6, 4.5))
    sid = s.part(stem, base=1, k=0, line=0)
    s.part(s.ellipse(px - 5.5, py - 7.5, 2.4, 2.4), base=2, k=1, line=0, merge=[sid])
    vine = curl(px - 13, py - 9, 5.5, 0.8, a0=0.2, r1=2.2)
    s.part(s.stroke(vine, (2.8, 1.8)), base=1, k=0, line=0)
    return s


ICON_GREEN = [
    "   kk           ",
    "  k11k   kkk    ",
    "  k1k1k k222k   ",
    "   kk1kk22122k  ",
    "     k1k21222k  ",
    "   kkk1kkkkkk   ",
    "  k221k12kkk    ",
    " k2312k12122k   ",
    " k3212k12121k   ",
    "k23212k121221k  ",
    "k22212k121211k  ",
    "k22212k121211k  ",
    " k2211k12111k   ",
    " k1211k11111k   ",
    "  kk111111kk    ",
    "    kkkkkk      ",
]


# ---------------------------------------------------------------------------
# pumpkin: the full ribbed gourd crowned by a big coiled vine
# ---------------------------------------------------------------------------

def front_pumpkin():
    s = Sprite(64, 64, PAL_PUMPKIN, sc=0.95)
    ids, (px, py) = gourd3d(s, 32, 44, 27.5, sq=0.70, n=10, elev=0.28, spin=math.pi / 10, k=2, deep=1, rib=0)
    # vine leaves the stem to the right and rolls up into one big coil
    c = curl(px + 12, py - 12, 6.0, 1.0, a0=math.pi * 0.8, r1=1.8)
    coil = bez([(px + 1, py - 2), (px + 6, py - 4), c[0]], 20) + c[1:]
    s.part(s.stroke(coil, (3.6, 2.0)), base=1, k=0, line=0)
    stem = s.curve([(px, py + 2), (px - 1, py - 5), (px - 4, py - 10), (px - 8, py - 12)], (7.5, 5.5))
    sid = s.part(stem, base=1, k=1, sh_tone=0, line=0, hl=s.ellipse(px - 2.5, py - 5, 0.9, 2.4, ang=0.4))
    s.part(s.ellipse(px - 8.5, py - 12.5, 2.6, 3.0), base=2, k=1, line=0, merge=[sid])
    return s


def back_pumpkin():
    s = Sprite(48, 72, PAL_PUMPKIN)
    cx, cy, R = 24, 48, 24.5
    # where the pole lands (stem) for this view
    ids, (px, py) = gourd3d(s, cx, cy, R, sq=0.78, n=10, elev=0.75, spin=math.pi / 10, k=2, deep=1, rib=0)
    coil = curl(px + 8, py - 12, 5.5, 1.1, a0=math.pi, r1=1.5)
    s.part(s.stroke(coil, (3.0, 1.8)), base=1, k=0, line=0)
    stem = s.curve([(px, py + 1), (px, py - 5), (px + 3, py - 10)], (7, 5.5))
    sid = s.part(stem, base=1, k=1, sh_tone=0, line=0)
    s.part(s.ellipse(px + 3.5, py - 10.5, 2.8, 2.4), base=2, k=1, line=0, merge=[sid])
    s.part(s.curve([(px + 1, py - 6), (px + 5, py - 8), (px + 7, py - 10)], (3, 2.8)), base=1, k=0, line=0)
    return s


ICON_PUMPKIN = [
    "                ",
    "       kk  kkk  ",
    "      k11kk11k  ",
    "      k1kk1kk1k ",
    "      k11k1k1k  ",
    "   kkkkk1kkkk   ",
    "  k2221k1222k   ",
    " k23221k12221k  ",
    "k232211k122211k ",
    "k222211k122211k ",
    "k222211k122211k ",
    "k222211k122211k ",
    "k122211k122111k ",
    " k11221k12111k  ",
    "  kk11111111kk  ",
    "    kkkkkkkk    ",
]


SPRITES = {
    "pumpkin_blossom": dict(pal=PAL_BLOSSOM, front=front_blossom, back=back_blossom, icon=ICON_BLOSSOM),
    "green_pumpkin": dict(pal=PAL_GREEN, front=front_green, back=back_green, icon=ICON_GREEN),
    "pumpkin": dict(pal=PAL_PUMPKIN, front=front_pumpkin, back=back_pumpkin, icon=ICON_PUMPKIN),
}
