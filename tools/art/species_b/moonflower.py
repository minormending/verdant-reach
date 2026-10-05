"""Moonflower line: moonflower_seed -> moonflower_vine -> moonflower.

A night palette: moon-white, pale mint, midnight blue. Signature: the
twist. The seed's sprout loops like a hook, the vine twines into a
corkscrew carrying a furled, twisted bud, and the adult opens that twist
into a great white trumpet with a five-pointed star.
"""

from __future__ import annotations

import math

from pix import Sprite, arclen_param, bez, erode, qbez, rot, shift

PAL = ("#405080", "#a8d8b8")


def heart(s, cx, cy, size, ang=0.0, k=2, hl=False, vein=True, line=0, base=2):
    """Heart-shaped leaf, tip pointing along ang (0 = down)."""
    pts = []
    for i in range(80):
        t = i / 80 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * size, -y / 17 * size * 1.05 + size * 0.1))
    # heart tip points down at ang=0; rotate
    pts = [(cx + x, cy + y) for x, y in rot(pts, ang)]
    m = s.poly(pts)
    hm = None
    if hl:
        hx, hy = rot([(-0.42 * size, -0.42 * size)], ang)[0]
        hm = s.ellipse(cx + hx, cy + hy, max(1.0, size * 0.16), max(0.8, size * 0.08), ang=ang - 0.5)
    pid = s.part(m, base=base, k=k, hl=hm, line=line)
    if vein:
        a = rot([(0, -0.5 * size)], ang)[0]
        b = rot([(0, 0.85 * size)], ang)[0]
        s.decal(s.line1(bez([(cx + a[0], cy + a[1]), (cx + b[0], cy + b[1])], 12)) & erode(m, 1), 1, on=[pid])
    return pid, m


def butterfly(s, cx, cy, size, ang=0.0, hl=True):
    """Moonflower cotyledon: broad, deeply notched (a butterfly / 'V' leaf)."""
    pts = []
    for i in range(80):
        t = i / 80 * 2 * math.pi
        r = 1.0 - 0.7 * max(0, math.cos(t)) ** 10   # notch at the far end
        x, y = math.cos(t) * r, math.sin(t) * 0.62 * r
        pts.append((x * size, y * size))
    pts = [(cx + x, cy + y) for x, y in rot(pts, ang)]
    m = s.poly(pts)
    hm = None
    if hl:
        hx, hy = rot([(0.1 * size, -0.3 * size)], ang)[0]
        hm = s.ellipse(cx + hx, cy + hy, size * 0.25, 0.8, ang=ang)
    pid = s.part(m, base=2, k=2, hl=hm, line=0)
    return pid, m


# ---------------------------------------------------------------------------
# moonflower_seed
# ---------------------------------------------------------------------------

def front_seed():
    s = Sprite(64, 64, PAL, sc=0.86)
    # the sprout: a hooked stem rising out of the seed, carrying two cotyledons
    st = s.curve([(31, 52), (30, 44), (31, 36), (33, 31)], (3.4, 2.8))
    s.part(st, base=2, k=1, line=0)
    butterfly(s, 44, 28, 12, ang=-0.35, hl=False)
    butterfly(s, 22, 27, 13, ang=math.pi + 0.3, hl=True)
    s.part(s.ellipse(33, 30, 2.2, 2.0), base=2, k=1, line=0)
    # the seed: plump, midnight blue, a crescent-moon shine; split at the top
    seed = s.ellipse(31, 55, 11, 8, ang=-0.15)
    pid = s.part(seed, base=1, k=0, line=0)
    crescent = s.ellipse(26, 52.5, 5.0, 4.0, ang=-0.3) & ~s.ellipse(28, 54, 5.0, 4.0, ang=-0.3)
    s.decal(crescent & erode(seed, 1), 3, on=[pid])
    # the split the sprout came out of
    s.ink(s.line1(bez([(27, 48), (31, 50), (36, 48)], 10)), 0)
    return s


def back_seed():
    s = Sprite(48, 72, PAL)
    st = s.curve([(24, 64), (24, 54), (24, 44)], (4, 3.4))
    s.part(st, base=2, k=1, line=0)
    butterfly(s, 11, 40, 14, ang=math.pi - 0.15, hl=True)
    butterfly(s, 37, 40, 14, ang=0.15, hl=False)
    s.part(s.ellipse(24, 43, 2.6, 2.4), base=2, k=1, line=0)
    seed = s.ellipse(24, 66, 14, 10)
    pid = s.part(seed, base=1, k=0, line=0)
    crescent = s.ellipse(18, 63, 6.0, 4.5, ang=-0.3) & ~s.ellipse(20, 64.5, 6.0, 4.5, ang=-0.3)
    s.decal(crescent & erode(seed, 1), 3, on=[pid])
    return s


ICON_SEED = [
    "                ",
    "                ",
    "                ",
    "  kkkk    kkkk  ",
    " k2322k  k2221k ",
    "k22k222kk2221k  ",
    " kk1221k22111k  ",
    "   kkk1k21kkk   ",
    "      k21k      ",
    "     kk21kk     ",
    "    k1kkkk1k    ",
    "   k131111111k  ",
    "   k311111111k  ",
    "   k111111111k  ",
    "    kk11111kk   ",
    "      kkkkk     ",
]


# ---------------------------------------------------------------------------
# moonflower_vine
# ---------------------------------------------------------------------------

def twisted_bud(s, x0, y0, x1, y1, w, turns=2.5):
    """A furled moonflower bud: a long spindle with spiral pleats."""
    path = qbez((x0, y0), ((x0 + x1) / 2 + 2, (y0 + y1) / 2), (x1, y1), 40)
    m = s.stroke(path, lambda t: max(1.2, w * math.sin(math.pi * min(1, 0.15 + t * 0.95)) ** 0.8))
    pid = s.part(m, base=3, k=2, line=0, sh_tone=2)
    # spiral pleats: diagonal lines across the spindle
    ts, L = arclen_param(path)
    for j in range(1, int(turns * 2) + 1):
        f = j / (turns * 2 + 1)
        i = int(f * (len(path) - 1))
        x, y = path[i]
        a, b = path[i - 1], path[min(len(path) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, ty) or 1
        tx, ty = tx / tl, ty / tl
        nx, ny = -ty, tx
        ww = w
        p0 = (x - nx * ww - tx * 2.0, y - ny * ww - ty * 2.0)
        p1 = (x + nx * ww + tx * 2.0, y + ny * ww + ty * 2.0)
        s.decal(s.line1(bez([p0, p1], 8)) & erode(m, 1), 2, on=[pid])
    return pid


def helix(s, cx, y0, y1, amp, turns, w, phase=0.0):
    """A twining stem as a corkscrew: back half-turns paint first, front
    half-turns cross over them with a line, so the twist reads."""
    n = 240
    pts = []
    for i in range(n):
        t = i / (n - 1)
        th = phase + turns * 2 * math.pi * t
        pts.append((cx + amp * math.sin(th), y0 + (y1 - y0) * t, math.cos(th)))
    segs, cur, front = [], [], None
    for x, y, z in pts:
        f = z >= 0
        if front is None or f == front:
            cur.append((x, y))
        else:
            segs.append((front, cur))
            cur = [cur[-1], (x, y)]
        front = f
    segs.append((front, cur))
    ids = []
    for f, seg in sorted(segs, key=lambda q: q[0]):
        if len(seg) < 2:
            continue
        m = s.stroke(seg, w)
        ids.append(s.part(m, base=2, k=1 if f else 2, line=0 if f else None))
    return ids


def front_vine():
    s = Sprite(64, 64, PAL, sc=0.76)
    # leaf stalks from the twine out to the hearts
    for a, b in (((35, 50), (44, 48)), ((29, 40), (21, 37)), ((34, 30), (41, 26))):
        s.part(s.curve([a, b], (2.2, 1.8)), base=2, k=0, line=0)
    heart(s, 51, 50, 11, ang=-1.0, k=2)
    heart(s, 13, 39, 10.5, ang=1.0, k=2, hl=True)
    heart(s, 47, 25, 8, ang=-0.8, k=2)
    helix(s, 32, 63, 20, 5.5, 2.25, 3.6)
    # the furled bud rising from the top, twisted like a closed umbrella
    twisted_bud(s, 32, 21, 27, 1, 6.4, turns=2)
    s.part(s.ellipse(32, 21, 3.0, 2.4), base=2, k=1, line=0)
    return s


def back_vine():
    s = Sprite(48, 72, PAL)
    heart(s, 9, 56, 13, ang=0.85, hl=True)
    heart(s, 39, 46, 12, ang=-0.85)
    heart(s, 11, 34, 9, ang=0.6)
    helix(s, 24, 72, 28, 6.5, 2.0, 4.6, phase=math.pi)
    twisted_bud(s, 24, 29, 29, 6, 7.5, turns=2)
    s.part(s.ellipse(24, 29, 3.6, 2.8), base=2, k=1, line=0)
    return s


ICON_VINE = [
    "                ",
    "     kkkkk      ",
    "    k22222k     ",
    "   k3kkkk22k    ",
    "  k33k  kk2k    ",
    "  k32k kk22k    ",
    "  k33kk2222k    ",
    "   k32k1222k    ",
    "   k33kkk2k     ",
    "    kk  k22k    ",
    " kkkk  k22kkkk  ",
    "k3222kk22k2221k ",
    " k22211k2k1111k ",
    "  kk11k22kkkkk  ",
    "    kk22k       ",
    "     kkk        ",
]


# ---------------------------------------------------------------------------
# moonflower
# ---------------------------------------------------------------------------

def trumpet(s, cx, cy, R, squash=0.68, ang=0.0, tube_to=None, star=True):
    """The open flower: a broad 5-angled disc seen at 3/4, a star of mint
    bands to its points, a dark throat. tube_to = where the tube runs to."""
    # the tube, behind the disc
    if tube_to:
        tx, ty = tube_to
        tube = s.stroke(qbez((cx + R * squash * 0.2, cy), ((cx + tx) / 2, (cy + ty) / 2 - 1), (tx, ty), 20),
                        (R * 0.55, 3.0))
        s.part(tube, base=3, k=2, sh_tone=2, line=0)
        s.part(s.ellipse(tx, ty, 2.8, 3.4), base=2, k=1, line=0)
    # disc: pentagon with slightly bowed sides
    pts = []
    for i in range(5):
        a0 = -math.pi / 2 + i * 2 * math.pi / 5
        for j in range(8):
            a = a0 + j / 8 * 2 * math.pi / 5
            # bow out between points
            r = R * (1.0 - 0.07 * math.sin(math.pi * j / 8) ** 0.5)
            pts.append((r * math.cos(a), r * math.sin(a)))
    pts = [(cx + x * squash, cy + y) for x, y in rot(pts, ang)]
    disc = s.poly(pts)
    hl = s.ellipse(cx - R * squash * 0.35, cy - R * 0.55, R * 0.12, R * 0.22, ang=0.4)
    did = s.part(disc, base=3, k=2, sh_tone=2, hl=None, line=0, shadow=(1, 0.3))
    # the cup is concave: its inner wall under the top-left rim falls in shade
    inner = erode(disc, 2)
    wall = inner & ~shift(inner, -3, -3) & ~shift(inner, -1, -4)
    s.decal(wall, 2, on=[did])
    if star:
        for i in range(5):
            a = -math.pi / 2 + i * 2 * math.pi / 5 + ang
            p1 = (cx + math.cos(a) * R * 0.95 * squash, cy + math.sin(a) * R * 0.95)
            p0 = (cx + math.cos(a) * R * 0.25 * squash, cy + math.sin(a) * R * 0.25)
            # a tapering mint band: wide near the throat, thin at the point
            band = s.stroke(bez([p0, p1], 16), (2.4, 0.9), cap=False)
            s.decal(band, 2, on=[did])
    # the cup: mint deepening into a midnight throat
    throat = s.ellipse(cx + R * squash * 0.08, cy + 0.8, R * 0.36 * squash, R * 0.34)
    s.decal(throat, 2, on=[did])
    s.decal(s.ellipse(cx + R * squash * 0.14, cy + 1.4, R * 0.17 * squash + 0.4, R * 0.18), 1, on=[did])
    # stamens peeking out
    s.px([(int(cx - 1), int(cy - 2)), (int(cx), int(cy - 3))], 3)
    return did


def front_moonflower():
    s = Sprite(72, 72, PAL, sc=0.93)
    # vine climbing up behind, leaves below and right
    vine = bez([(40, 71), (44, 62), (40, 54), (45, 46), (50, 40)], 30)
    s.part(s.stroke(vine, (3.6, 2.6)), base=2, k=1, line=0)
    heart(s, 54, 60, 11, ang=-0.7, k=2)
    heart(s, 27, 63, 10, ang=0.8, k=2, hl=True)
    # a second, still-furled bud behind on the right
    twisted_bud(s, 50, 40, 60, 24, 3.2, turns=2)
    # the flower: big moon-white trumpet facing left, tube running back right
    trumpet(s, 28, 36, 21, squash=0.66, ang=0.15, tube_to=(48, 44))
    return s


def back_moonflower():
    s = Sprite(48, 72, PAL)
    heart(s, 6, 62, 12, ang=0.8, hl=True)
    heart(s, 42, 64, 12, ang=-0.8)
    s.part(s.stroke(bez([(24, 72), (22, 64), (24, 58)], 20), (4.5, 3.5)), base=2, k=1, line=0)
    # from behind: the back of the disc, its star of mint bands, the tube
    # and its calyx pointing at us
    cx, cy, R = 24, 36, 22
    pts = []
    for i in range(5):
        a0 = -math.pi / 2 + i * 2 * math.pi / 5 + 0.2
        for j in range(8):
            a = a0 + j / 8 * 2 * math.pi / 5
            r = R * (1.0 - 0.07 * math.sin(math.pi * j / 8) ** 0.5)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * 0.8))
    did = s.part(s.poly(pts), base=3, k=3, sh_tone=2, line=0)
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5 + 0.2
        p1 = (cx + math.cos(a) * R * 0.95, cy + math.sin(a) * R * 0.95 * 0.8)
        band = s.stroke(bez([(cx, cy), p1], 16), (3.6, 1.0), cap=False)
        s.decal(band, 2, on=[did])
    tube = s.stroke(bez([(cx, cy), (cx + 1, cy + 8), (cx, cy + 16)], 12), (8, 5))
    s.part(tube, base=3, k=2, sh_tone=2, line=0)
    s.part(s.ellipse(cx, cy + 17, 4.0, 3.0), base=2, k=1, line=0)
    return s


ICON_MOON = [
    "                ",
    "     kkkkk      ",
    "   kk33333kk    ",
    "  k333323333k   ",
    " k3332k2k2333k  ",
    " k3323k1k3233kk ",
    " k3333212333k2k ",
    " k33232k3233k2k ",
    "  k323k3k32kk2k ",
    "   kk3333kkk2k  ",
    "     kkkkk22k   ",
    "  kkk   k22k kk ",
    " k2221kk22kkk2k ",
    "  kk11k22k111k  ",
    "    kkk2kkkkk   ",
    "      kk        ",
]


SPRITES = {
    "moonflower_seed": dict(pal=PAL, front=front_seed, back=back_seed, icon=ICON_SEED),
    "moonflower_vine": dict(pal=PAL, front=front_vine, back=back_vine, icon=ICON_VINE),
    "moonflower": dict(pal=PAL, front=front_moonflower, back=back_moonflower, icon=ICON_MOON),
}
