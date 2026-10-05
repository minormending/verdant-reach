"""Moonflower line: moonflower_seed -> moonflower_vine -> moonflower.

A night palette: moon-white, pale mint, midnight blue. Signature: the
twist. The seed's sprout loops like a hook, the vine twines into a
corkscrew carrying a furled, twisted bud, and the adult opens that twist
into a great white trumpet with a five-pointed star.

Round 3 poses + scores (CREATURES.md rubric). The vine twist is a smooth stem
with a curling tendril now (the old zig-zag helix is gone).
  moonflower_seed  BOBBING  the violet seed coat worn as a helmet, brim at the
                            foe, cotyledon wings, hooked neck.              score: 8
  moonflower_vine  REARING  the spiral-furled bud is the head, lance-like.  score: 8 (base leaves cluttered)
  moonflower       REARING  the trumpet turned 3/4 at the foe, a bud fist
                            raised behind, a moonlight glint.               score: 8
"""

from __future__ import annotations

import functools
import math

import numpy as np

from icons_wild import ICONS
from rig import Spr as Sprite, fit_back
from pix import arclen_param, bez, erode, qbez, rot, shift

PAL = ("#383868", "#80b890", "#f0f8f0")   # night violet (accent), sage leaf / petal shade, moon-white


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



def vine(s, ctrl, w0, w1, wraps=2.0, k=1):
    """A twining stem: one smooth S of a stem with a thin strand wound round
    it. Only the strand's front crossings are drawn, as smooth diagonal
    bands, so the twist reads as a spiral (never a zig-zag)."""
    path = bez(ctrl, 60)
    m = s.stroke(path, (w0, w1))
    pid = s.part(m, base=2, k=k, line=0)
    s.decal(s.line1([(x + 0.9, y + 0.3) for x, y in path[4:-6]]) & erode(m, 1), 1, on=[pid])
    return pid, path


def leaf_on(s, at, cx, cy, size, ang, k=2, hl=False, vein=True):
    """A heart leaf on a petiole from the vine point `at` to its notch."""
    nx, ny = rot([(0, -0.21 * size)], ang)[0]
    (ax, ay) = at
    px_, py_ = cx + nx, cy + ny
    s.part(s.stroke(qbez(at, ((ax + px_) / 2, min(ay, py_) - 1.5), (px_, py_), 20), (2.0, 1.6)), base=2, k=0, line=0)
    return heart(s, cx, cy, size, ang=ang, k=k, hl=hl, vein=vein)


def tendril(s, start, R, turns=1.2, sg=1, a0=0.0):
    """A curling tendril (the motion cue): a 1px spiral."""
    x0, y0 = start
    cx, cy = x0 - R * math.cos(a0), y0 - R * math.sin(a0)
    pts = [(cx + R * (1 - 0.7 * u) * math.cos(a0 + sg * u * turns * 2 * math.pi),
            cy + R * (1 - 0.7 * u) * math.sin(a0 + sg * u * turns * 2 * math.pi)) for u in np.linspace(0, 1, 60)]
    m = s.stroke(pts, (1.6, 1.1))
    return s.part(m, base=2, k=0, line=0)


def bud(s, base, tip, w, turns=2.2, bend=2.0, hl=True, bold=False):
    """The spiral-furled moonflower bud: a white spindle, its pleats wound in
    smooth sage spirals, a sage calyx cup at the base."""
    (x0, y0), (x1, y1) = base, tip
    L = math.dist(base, tip)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    path = qbez(base, ((x0 + x1) / 2 + nx * bend, (y0 + y1) / 2 + ny * bend), tip, 50)
    wf = lambda t: max(1.0, w * math.sin(math.pi * min(1, 0.12 + t * 0.92)) ** 0.75)
    m = s.stroke(path, wf, cap=True)
    hm = None
    if hl:
        hx, hy = path[int(len(path) * 0.45)]
        hm = s.ellipse(hx - nx * w * 0.25, hy - ny * w * 0.25, 1.0, 1.6, ang=math.atan2(y1 - y0, x1 - x0) + math.pi / 2)
    pid = s.part(m, base=3, k=2, sh_tone=2, line=0)
    # spiral pleats: diagonal bands in the bud's own frame (u along the
    # axis, v across), so each furl wraps the spindle as one clean stripe
    ax, ay = s.T([(x0, y0)])[0]
    bx2, by2 = s.T([(x1, y1)])[0]
    ux, uy = bx2 - ax, by2 - ay
    ul = math.hypot(ux, uy) or 1
    ux, uy = ux / ul, uy / ul
    ys, xs = np.nonzero(erode(m, 1))
    period = max(4.0, ul / (turns * 2.2))
    band = np.zeros(m.shape, bool)
    for x, y in zip(xs, ys):
        u = (x + 0.5 - ax) * ux + (y + 0.5 - ay) * uy
        v = -(x + 0.5 - ax) * uy + (y + 0.5 - ay) * ux
        if u < ul * 0.12 or u > ul * 0.9:
            continue
        if (u + v * 1.1) % period < (1.6 if bold else 1.0):
            band[y, x] = True
    s.decal(band, 2, on=[pid])
    # calyx
    cm = s.ellipse(x0, y0, w * 0.42, w * 0.34, ang=math.atan2(y1 - y0, x1 - x0))
    s.part(cm, base=2, k=1, line=0)
    return pid


def sparkle(s, x, y):
    """A glint of moonlight off the petals: a tiny 4-point star in sage."""
    pts = [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
    m = np.zeros((s.h, s.w), bool)
    for u, v in pts:
        if 0 <= u < s.w and 0 <= v < s.h:
            m[v, u] = True
    c = np.zeros_like(m)
    c[y, x] = True
    s.post.append((m & ~c, 2))
    s.post.append((c, 3))


# ---------------------------------------------------------------------------
# moonflower_seed: BOBBING. A fat night-violet seed, cracked; its hooked
# sprout lifts two butterfly cotyledons like moth wings.
# ---------------------------------------------------------------------------

def front_seed(p=0):
    s = Sprite(56, 56, PAL, sc=0.92)
    s.sel = 0.15
    b = p
    s.set_tilt(14, 31, 55)
    # root feet: two pale roots splayed on the ground
    with s.untilted(): s.part(s.curve([(31, 50), (28, 53), (23, 55)], (2.4, 1.4)), base=2, k=0, line=0)
    with s.untilted(): s.part(s.curve([(32, 50), (35, 53), (39, 55)], (2.2, 1.4)), base=2, k=0, line=0)
    # the hypocotyl: a hooked neck crouched back then thrust forward
    stem = s.curve([(32, 51), (36, 43), (34, 34), (27, 28)], (4.6, 3.4))
    s.part(stem, base=2, k=2, line=0)
    # rear wing: a cotyledon flung up behind (far, smaller, higher)
    butterfly(s, 36, 19 - b, 9.0, ang=-0.55 - 0.08 * b, hl=False)
    # lead wing: the near cotyledon spread forward under the helmet
    butterfly(s, 15, 31 - b * 0.5, 10.5, ang=2.85 + 0.06 * b, hl=False)
    # head: the violet seed coat still worn as a helmet, brim tipped at the foe
    coat = s.ellipse(23, 22 - b * 0.5, 10.5, 7.0, ang=-0.42)
    s.part(coat, base=1, k=2, sh_tone=0, line=0)
    # the split seam and the one glint
    s.ink(s.line1(bez([(14, 27 - b * 0.5), (22, 25 - b * 0.5), (31, 18 - b * 0.5)], 12)) & erode(coat, 1), 0, lock=False)
    s.glint([(18, 18), (19, 17)])
    sparkle(s, 46, 33 + b)
    s.contact += [(22, 27), (36, 40)]
    return s


def back_seed():
    s = Sprite(48, 56, PAL)
    # from behind and above: the neck rising off the bottom, wings spread,
    # the violet helmet tipped toward the foe (top-right)
    s.part(s.curve([(18, 62), (16, 50), (20, 38), (26, 30)], (8, 6)), base=2, k=2, line=0)
    butterfly(s, 9, 30, 12, ang=3.6, hl=False)
    butterfly(s, 40, 30, 12, ang=-0.2, hl=False)
    coat = s.ellipse(27, 21, 16, 11, ang=-0.35)
    s.part(coat, base=1, k=3, sh_tone=0, line=0)
    s.ink(s.line1(bez([(13, 27), (26, 25), (40, 13)], 12)) & erode(coat, 1), 0, lock=False)
    s.glint([(19, 14), (20, 13), (21, 13)])
    return s


# ---------------------------------------------------------------------------
# moonflower_vine: REARING. A twining vine rearing up out of its heart-leaf
# base; the head is the long spiral-furled bud aimed at the foe.
# ---------------------------------------------------------------------------

def front_vine(p=0):
    s = Sprite(60, 60, PAL)
    s.sel = 0.15
    b = p
    s.set_tilt(12, 32, 57)
    # rear arm: a heart leaf high behind
    leaf_on(s, (36, 37), 46, 27 - b, 7.5, -2.3, k=2)
    # base: heart leaves laid on the ground, the far one smaller and higher
    # the vine rears back then forward, a tendril curling off its back
    vid, path = vine(s, [(32, 57), (38, 47), (36, 36), (29, 27)], 4.4, 3.2)
    tendril(s, (38, 44), 3.2, turns=1.1, sg=1, a0=3.6 + 0.3 * b)
    with s.untilted(): leaf_on(s, (31, 56), 19, 54, 8, 1.9, k=2, vein=False)
    # head: the furled bud, tilted at the foe
    bud(s, (30, 30), (18 - b, 5 - b), 12.0, turns=1.6, bend=-2.0, bold=True)
    # lead arm: a heart leaf thrust forward, low
    leaf_on(s, (35, 44), 16, 46, 8, 1.25 + 0.08 * b, k=2)
    s.contact += [(12, 22), (38, 47)]
    return s


def back_vine():
    s = Sprite(48, 60, PAL)
    heart(s, 6, 48, 11, ang=1.3, k=2)
    vid, path = vine(s, [(20, 64), (19, 50), (24, 38), (30, 30)], 6.5, 4.5, wraps=2.5)
    heart(s, 42, 44, 11, ang=-1.4, k=2, hl=True)
    bud(s, (30, 31), (44, 6), 10, turns=2.0, bend=2.0)
    return s


# ---------------------------------------------------------------------------
# moonflower: REARING. The great moon-white trumpet thrust out at the foe as
# the head; the vine rears behind it; a furled bud raised as a second fist;
# moonlight glints off it.
# ---------------------------------------------------------------------------

def front_moonflower(p=0):
    s = Sprite(60, 60, PAL, sc=0.96)
    s.sel = 0.1
    b = p
    s.set_tilt(8, 36, 57)
    # rear fist: a furled bud raised high behind
    s.part(s.curve([(42, 42), (46, 34), (48, 28)], (2.4, 2.0)), base=2, k=0, line=0)
    bud(s, (48, 28), (53, 8 - b), 6.0, turns=2.0, bend=2.0, hl=False)
    # feet: a heart leaf planted ahead, a small one behind
    with s.untilted(): leaf_on(s, (37, 56), 48, 54, 6.5, -1.9, k=2, vein=False)
    with s.untilted(): leaf_on(s, (35, 56), 23, 54, 8, 1.85, k=2, vein=False)
    # the body: the vine rears back then arches forward into a neck
    vid, path = vine(s, [(36, 57), (43, 47), (42, 36), (35, 29), (29, 27)], 5.0, 3.4)
    tendril(s, (43, 50), 3.2, turns=1.1, sg=1, a0=0.2 + 0.3 * b)
    # lead arm: a heart leaf thrust forward and up on its petiole
    leaf_on(s, (41, 43), 18, 44 - b, 8.5, 1.15, k=2)
    # head: the great trumpet on the neck, turned 3/4 at the foe
    with s.rotated(26 + 2 * b, 17, 25):
        trumpet(s, 17 - 0.5 * b, 25 - b, 19, squash=0.5, ang=0.0, tube_to=(31, 27))
    sparkle(s, 4, 9 + b)
    s.contact += [(17, 27), (44, 51)]
    return s


def back_moonflower():
    s = Sprite(52, 60, PAL, sc=0.88)
    s.set_tilt(-10, 18, 64)
    # from behind: the neck rising off the bottom, the trumpet's green-ribbed
    # outside and its sepals, the face turned away toward the foe (top-right)
    vid, path = vine(s, [(16, 66), (12, 52), (16, 42), (24, 36)], 7.0, 5.0)
    leaf_on(s, (13, 54), 3, 46, 10, 1.3, k=2)
    tube = s.stroke(qbez((22, 38), (24, 33), (28, 29), 20), (5.0, 8.0))
    s.part(tube, base=3, k=2, sh_tone=2, line=0)
    with s.rotated(-30, 31, 21):
        disc = s.ellipse(32, 21, 9, 15)
        did = s.part(disc, base=3, k=3, sh_tone=2, line=0)
        for i in range(5):
            a = -math.pi / 2 + i * 2 * math.pi / 5
            s.decal(s.stroke(bez([(27, 23), (32 + math.cos(a) * 8, 21 + math.sin(a) * 14)], 12), (2.2, 0.8), cap=False), 2, on=[did])
    # sepals clasping the tube
    s.part(s.ellipse(24, 35, 4.5, 3.5, ang=-0.6), base=2, k=1, line=0)
    leaf_on(s, (18, 44), 39, 47, 9, -1.2, k=2, hl=True)
    return s


SPRITES = {
    "moonflower_seed": dict(pal=PAL, front=front_seed, back=fit_back(back_seed), icon=ICONS["moonflower_seed"], icon2="bob",
                            idle=[functools.partial(front_seed, 1)]),
    "moonflower_vine": dict(pal=PAL, front=front_vine, back=fit_back(back_vine), icon=ICONS["moonflower_vine"], icon2="bob",
                            idle=[functools.partial(front_vine, 1)]),
    "moonflower": dict(pal=PAL, front=front_moonflower, back=fit_back(back_moonflower), icon=ICONS["moonflower"], icon2="bob",
                       idle=[functools.partial(front_moonflower, 1)]),
}
