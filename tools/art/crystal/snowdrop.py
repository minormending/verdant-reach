"""Original Crystal-rule Galanthus nivalis: snowdrop_bulb -> snowdrop_shoot -> snowdrop.

Baby BRACED: a plump papery bulb, pale tunic over a cream body with a few dry
brown tunic lines, half sunk in a lumpy snow crust. One blunt grey-green leaf
spear pierces the neck and leans at the foe; the bulb sits low and wide.
Teen REARING: two flat strap leaves (blunt hooded tips, a pale central stripe)
push up through the snow, and between them one closed white bud on a thin
scape, wrapped in a small green spathe, just starting to nod over.
Adult LUNGING: the nodding flower hangs from an arched scape toward the foe.
Three long outer tepals flare like a skirt; between them the short inner cup
shows the line's identifying mark, one green inverted-V chevron at each
inner tepal tip (each joins the tip's outline, never a loose dark dot). A
small green ovary caps the flower; two strap leaves stand below.
Intros: the bulb's leaf spear pushes up through the crust; the bud lifts and
nods; the adult's outer tepals flare open (as they do in warmth), the flower
swings once and the tepals settle. Snow, leaves and scapes stay registered.
Sport: Galanthus nivalis Sandersii Group, a yellow ovary and yellow inner
marks, so the dark slot becomes a yellow-olive (palette swap only).
No sprites from another game are copied, traced or imported.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, close_outline, erode, hop, moving_boxes,  # noqa: E402
                    rim_white, shift, tones)

TOOL = "tools/art/crystal/snowdrop.py"
IDS = ["snowdrop_bulb", "snowdrop_shoot", "snowdrop"]
# The bulb's dark slot is a dry olive-brown (tunic lines, leaf shade); its mid
# is a pale sage-cream shared by the bulb body and the young spear.
PAL_BULB = [BLACK, "#605838", "#b8c0a0", WHITE]
# Shoot and flower: deep green (scape, spathe, ovary, chevrons) and grey-green leaf.
PAL = [BLACK, "#386040", "#98b098", WHITE]
# Sandersii Group: yellow ovary and marks; the dark slot turns yellow-olive.
SPORT_BULB = [BLACK, "#988830", "#b8c0a0", WHITE]
SPORT = [BLACK, "#988830", "#98b098", WHITE]
PALS = {IDS[0]: (PAL_BULB, SPORT_BULB), IDS[1]: (PAL, SPORT), IDS[2]: (PAL, SPORT)}

ANIM = {
    IDS[0]: {"intro": [[0, 8], [1, 12], [2, 5], [3, 16], [2, 8], [0, 8]],
             "idle": [[0, 130], [2, 10], [0, 6]]},
    IDS[1]: {"intro": [[0, 8], [1, 12], [2, 5], [3, 16], [2, 8], [0, 8]],
             "idle": [[0, 140], [2, 10], [0, 6]]},
    IDS[2]: {"intro": [[0, 6], [1, 12], [2, 5], [3, 16], [4, 10], [0, 8]],
             "idle": [[0, 140], [4, 10], [0, 6]]},
}


def spal(sid):
    return tuple(PALS[sid][0][1:])


# ---------------------------------------------------------------- parts ---

def strap(s, ctrl, w, tip_w=0.6, stripe=True, rim=0.0, base_tone=2, waist=1.0):
    """A flat strap leaf along ctrl: a ribbon narrowed to `waist` at its
    base, broadest past the middle, ending in a blunt hooded tip.

    The face is the mid tone with a dark band on its shade edge; the paler
    central stripe is a 1px white line, so it reads as a flat blade, never
    a tube."""
    path = bez(ctrl, 40)

    def width(t):
        base = waist + (1 - waist) * min(1.0, t / 0.35)
        return w * base * (1 - (1 - tip_w) * max(0.0, (t - 0.72) / 0.28))
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=base_tone, k=1, sh_tone=1, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    if stripe:
        n = len(path)
        s.decal(s.line1(path[int(n * 0.12):int(n * 0.86)]) & erode(m, 1), 3, on=[pid])
    return pid, m, path


def scape(s, ctrl, w=(3.0, 2.2), tone=1):
    path = bez(ctrl, 50)
    m = s.stroke(path, w, cap=True)
    pid = s.part(m, base=tone, k=0, line=0)
    # a lit mid-tone line along the stem's left edge
    s.decal(m & ~shift(m, -1, 0), 2, on=[pid])
    return pid, m, path


def snow(s, x0, x1, top, bottom=55, humps=(), crevices=(), white=2.6, open_bottom=False, sag=3.0, roll=0.6):
    """One soft snow drift from x0 to x1: a domed top (it sags `sag` px to
    each end) made of rounded humps, a white lit crust along the top, the
    mid tone in shade below and a dark band on the bottom-right. Short black
    crevices slant in from the top between humps (joined to the outline,
    never loose dark marks).

    humps: (cx, height, half-width) cosine bumps added above the dome."""
    mid = (x0 + x1) / 2
    half = (x1 - x0) / 2

    def ytop(x):
        # a drift: flat-topped in the middle, rolling down to the ground at
        # both ends (sag = how far the shoulders drop before the roll-off)
        d = min(1.0, abs(x - mid) / half)
        y = top + sag * d ** 2
        if d > roll:
            y += (bottom - 1 - y) * (1 - math.sqrt(max(0.0, 1 - ((d - roll) / (1 - roll)) ** 2)))
        for cx, h, hw in humps:
            if abs(x - cx) < hw:
                y -= h * (0.5 + 0.5 * math.cos(math.pi * (x - cx) / hw))
        return y
    xs = np.linspace(x0, x1, 120)
    edge = [(x, ytop(x)) for x in xs]
    end = bottom + (1.5 if open_bottom else 0.6)
    pts = [(x0, end)] + edge + [(x1, end)]
    m = s.poly(pts)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0, shadow=(1, 0.6))
    # white crust: everything within `white` px below the top
    yy = np.mgrid[0:s.h, 0:s.w][0]
    lim = np.array([[ytop(min(max(x + 0.5, x0), x1)) + white for x in range(s.w)]])
    s.decal(m & (yy + 0.5 <= lim), 3, on=[pid])
    for cx, depth in crevices:
        y0 = ytop(cx)
        s.decal(s.line1([(cx, y0 - 1), (cx + depth * 0.7, y0 + depth)]), 0, on=[pid])
    return pid, m


# ------------------------------------------------------------- the bulb ---

def onion(cx, by, w, h, tilt, n=48):
    """A tilted onion outline: broad and plump low down, drawn up into a
    short neck. (cx, by) is the base, `tilt` radians tips the top toward
    the foe. Returns (outline, frame) where frame(u, v) maps u in -1..1
    across and v in 0..1 up the bulb to canvas points."""
    c, sn = math.cos(tilt), math.sin(tilt)

    prof = [(0.0, 0.55), (0.15, 0.90), (0.35, 1.0), (0.55, 0.96), (0.70, 0.82), (0.82, 0.56),
            (0.90, 0.32), (0.96, 0.18), (1.0, 0.14)]

    def r(v):
        for (v0, r0), (v1, r1) in zip(prof, prof[1:]):
            if v <= v1:
                t = (v - v0) / (v1 - v0)
                t = 0.5 - 0.5 * math.cos(math.pi * t)
                return 0.5 * w * (r0 + (r1 - r0) * t)
        return 0.5 * w * prof[-1][1]

    def frame(u, v):
        x, y = u * r(v), -v * h
        return (cx + x * c + y * sn, by - x * sn + y * c)
    vs = np.linspace(0.0, 1.0, n)
    left = [frame(-1, v) for v in vs]
    right = [frame(1, v) for v in vs[::-1]]
    return left + right, frame


def bulb_body(s, outline, frame, k=2, lines=(-0.55, 0.05, 0.6), sheen=-0.8):
    m = s.poly(outline)
    pid = s.part(m, base=2, k=k, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.45)
    inner = erode(m, 1)
    # dry tunic lines: meridians from the base up to the neck
    for u in lines:
        s.decal(s.line1([frame(u, v) for v in np.linspace(0.02, 0.9, 40)]) & inner, 1, on=[pid])
    # papery sheen on the lit shoulder
    s.decal(s.line1([frame(sheen, v) for v in np.linspace(0.25, 0.75, 30)]) & inner, 3, on=[pid])
    return pid, m


def bulb_front(frame=0):
    """BRACED: a fat onion-shaped bulb sunk in snow, its neck tipped left."""
    push = [0, -2, 1, 2][frame]          # the spear dips (wind-up), then pushes up
    s = Spr(56, 56, spal(IDS[0]))
    outline, fr = onion(33, 57, 31, 31, 0.26)
    nx, ny = fr(0, 0.95)
    # the spear: one blunt leaf from the neck, leaning at the foe, with the
    # line's pale central stripe
    strap(s, [(nx + 1, ny + 4), (nx - 2, ny - 3), (nx - 5 - push * 0.5, ny - 9 - push)], 6.5,
          tip_w=0.8, stripe=True, rim=0.0)
    bulb_body(s, outline, fr)
    # the snow crust it is sunk in, banked up round its base
    snow(s, 12, 52, 49, humps=[(16, 2.0, 5), (25, 1.5, 6), (36, 1.0, 6), (46, 2.0, 5)],
         crevices=[(20, 2), (30, 2), (41, 2)], sag=1.0, roll=0.55)
    return tones(s)


def bulb_back():
    s = Spr(48, 48, spal(IDS[0]))
    outline, fr = onion(23, 60, 41, 50, -0.12)
    nx, ny = fr(0, 0.95)
    # the spear from behind and above, leaning to the top-right
    strap(s, [(nx - 1, ny + 4), (nx + 2, ny - 3), (nx + 5, ny - 8)], 8.0, tip_w=0.8, stripe=True)
    bulb_body(s, outline, fr, k=3, lines=(-0.6, -0.05, 0.5), sheen=-0.85)
    snow(s, 0, 47, 42, bottom=47, humps=[(5, 2.5, 6), (17, 2.0, 7), (30, 1.5, 6), (42, 3.0, 6)],
         crevices=[(11, 2), (24, 2), (36, 2)], sag=1.0, roll=0.95, open_bottom=True)
    return tones(s, open_bottom=True)


# ------------------------------------------------------------ the shoot ---

def bud(s, x, y, ang, L=12.0, W=7.0, spathe=True):
    """A closed white bud hung from the scape tip (x, y), axis `ang` from
    straight down (+ = swings left), its top wrapped in a green spathe."""
    c, sn = math.cos(ang), math.sin(ang)

    def tr(u, v):          # u across, v down the axis
        return (x + u * c - v * sn, y + u * sn + v * c)
    prof = [(-0.22, 0.0), (-0.40, 0.16), (-0.50, 0.42), (-0.44, 0.70), (-0.22, 0.92), (0.0, 1.0),
            (0.22, 0.92), (0.44, 0.70), (0.50, 0.42), (0.40, 0.16), (0.22, 0.0)]
    m = s.poly(bez([tr(u * W, v * L) for u, v in prof], 4))
    pid = s.part(m, base=3, k=2, sh_tone=2, line=0, shadow=(1, 0.4))
    # the tepals' overlap, a mid-tone seam down the bud
    s.decal(s.line1([tr(0.10 * W, 0.30 * L), tr(0.06 * W, 0.86 * L)]) & erode(m, 1), 2, on=[pid])
    if spathe:
        # a slim green sheath from the pedicel down the bud's back
        sp = s.poly(bez([tr(-0.18 * W, -0.25 * L), tr(0.30 * W, -0.15 * L), tr(0.52 * W, 0.30 * L),
                         tr(0.40 * W, 0.58 * L), tr(0.18 * W, 0.30 * L), tr(-0.10 * W, 0.08 * L)], 4))
        spid = s.part(sp, base=1, k=0, line=0)
        rim_white(s, sp, spid, 0.5, tone=2)
    return pid, m


def shoot_front(frame=0):
    """REARING: two strap leaves rise from the snow, a bud nods between them."""
    nod = [0.70, 0.30, 1.05, 1.20][frame]
    s = Spr(56, 56, spal(IDS[1]))
    # rear leaf, swept back to the right and higher, its tip arched outward
    strap(s, [(35, 51), (38, 39), (42, 26), (46, 16), (49, 12)], 6.5, tip_w=0.75, waist=0.8)
    # scape: up between the leaves, curving over at the top
    sx, sy = 25, 15
    scape(s, [(31, 51), (32, 37), (31, 24), (28, 16), (sx, sy)], (3.0, 2.2))
    bud(s, sx, sy + 1, nod, L=15, W=9)
    # lead leaf, big, rising forward at the foe like a guard
    strap(s, [(29, 52), (25, 42), (19, 34), (14, 29), (10, 27)], 8.0, tip_w=0.75, rim=0.35, waist=0.8)
    snow(s, 8, 52, 50, humps=[(12, 2.0, 5), (21, 2.5, 7), (33, 1.5, 6), (45, 2.5, 6)],
         crevices=[(16, 2), (27, 2), (39, 2)], sag=2.0)
    return tones(s)


def shoot_back():
    """From behind and above: the bud nods away to the top-right over the
    near leaf, the far leaf rising on the left."""
    s = Spr(48, 48, spal(IDS[1]))
    strap(s, [(12, 48), (9, 34), (6, 20), (6, 12)], 11, tip_w=0.75, rim=0.3, waist=0.85)
    strap(s, [(28, 48), (35, 41), (40, 36), (44, 34)], 10, tip_w=0.75, rim=0.3, waist=0.85)
    scape(s, [(21, 48), (20, 32), (21, 16), (25, 7), (29, 5)], (4.4, 3.4))
    bud(s, 30, 6, -0.55, L=22, W=14)
    snow(s, 0, 47, 42, bottom=47, humps=[(5, 2.5, 6), (17, 2.0, 7), (30, 1.5, 6), (42, 3.0, 6)],
         crevices=[(11, 2), (24, 2), (36, 2)], sag=1.0, roll=0.95, open_bottom=True)
    return tones(s, open_bottom=True)


# ----------------------------------------------------------- the flower ---

def flower(s, x, y, ang, flare, scale=1.0):
    """The nodding flower hung from the pedicel tip (x, y); its axis points
    `ang` from straight down (+ = mouth swings left, toward the foe).

    Three outer tepals: a far one in the skirt's shade and two flared to
    each side. The short inner cup hangs between them; its front inner
    tepal carries one green inverted-V over the notch at its tip, and the
    two side tepals show the ends of theirs, every mark joined to the rim.
    A green ovary caps it all."""
    c, sn = math.cos(ang), math.sin(ang)
    k = scale

    def tr(u, v):
        return (x + (u * c - v * sn) * k, y + (u * sn + v * c) * k)

    def P(pts):
        return [tr(u, v) for u, v in pts]
    oy = 2.6                       # the ovary's centre down the axis
    top = 4.4                      # where the tepals attach
    f = flare

    def tepal(base, tip, w, tone=3):
        m, path = s.leaf(tr(*base), tr(*tip), w * k, bend=0.0, fat=0.64, blunt=1.4)
        pid = s.part(m, base=tone, k=2 if tone == 3 else 1, sh_tone=tone - 1, line=0, shadow=(1, 0.4))
        if tone == 3:
            # one grey-green vein down the middle gives the white tepal form
            s.decal(s.line1(path[16:-24]) & erode(m, 1), 2, on=[pid])
        return pid, m

    # far outer tepal: the inside of the skirt, in shade, peeping below
    tepal((0.4, top), (2.6 + 2.5 * f, 18.0 - 1.5 * f), 7.0, tone=2)
    # the shade-side outer tepal (right) and the lit one (left), flared
    tepal((1.4, top), (6.0 + 5.0 * f, 16.5 - 2.5 * f), 7.5, tone=2)
    tepal((-1.4, top), (-5.5 - 5.0 * f, 17.5 - 2.5 * f), 8.0)
    # the inner cup: a short bell; the front inner tepal's tip is notched
    rim = top + 10.0
    cup = [(-2.2, top - 0.6), (-3.6, top + 2.5), (-4.6, top + 6), (-4.8, rim - 0.6), (-3.4, rim + 0.3),
           (-1.8, rim + 1.0), (-0.6, rim + 1.0), (0.0, rim + 0.2), (0.6, rim + 1.0), (1.8, rim + 1.0),
           (3.4, rim + 0.3), (4.8, rim - 0.6), (4.6, top + 6), (3.6, top + 2.5), (2.2, top - 0.6)]
    cm = s.poly(P(cup))
    cpid = s.part(cm, base=3, k=1, sh_tone=2, line=0, shadow=(1, 0.4))
    # the front chevron: an inverted V astride the notch, arms to the rim
    for d in (0.0, 0.7):
        s.decal(s.line1(P([(-2.8 + d, rim + 1.2), (0.0, rim - 2.4 + d), (2.8 - d, rim + 1.2)])), 1, on=[cpid])
    # the side inner tepals: the ends of their marks at the cup's corners
    for u in (-4.2, 4.2):
        s.decal(s.line1(P([(u, rim - 1.2), (u * 0.9, rim + 0.8)])), 1, on=[cpid])
    # ovary: a small deep-green cap with a mid-tone rim, no glint
    om = s.ellipse(*tr(0, oy), 2.1 * k, 1.9 * k, ang=ang)
    opid = s.part(om, base=1, k=0, line=0)
    rim_white(s, om, opid, 0.5, tone=2)


def adult_front(frame=0):
    """LUNGING: an arched scape drops the nodding flower at the foe."""
    flare, swing = [(0.45, 0.0), (0.10, -0.12), (0.95, 0.09), (1.05, 0.13), (0.65, 0.03)][frame]
    s = Spr(56, 56, spal(IDS[2]))
    # rear leaf, swept back, its blunt tip arched outward
    strap(s, [(37, 52), (41, 40), (45, 28), (49, 18), (52, 12)], 8.5, tip_w=0.75, waist=0.8)
    # the scape: up, then arched over toward the foe
    scape(s, [(34, 52), (36, 34), (35, 14), (31, 5), (25, 3)], (3.4, 2.4))
    # papery spathe at the arch, hanging behind the pedicel
    sp = s.poly([(24, 2), (28, 2), (30, 8), (28, 11), (26, 6)])
    spid = s.part(sp, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, sp, spid, 0.5)
    # pedicel and the flower
    px, py = 22, 5
    s.part(s.stroke(bez([(25, 3), (23, 4), (px, py)], 8), 2.0), base=1, k=0, line=0)
    flower(s, px, py, 0.12 + swing, flare, scale=1.45)
    # lead leaf: big and thrust forward under the flower like a guard
    strap(s, [(31, 52), (27, 45), (21, 40), (13, 37), (7, 37)], 7.5, tip_w=0.75, rim=0.35, waist=0.8)
    snow(s, 7, 54, 50, humps=[(11, 2.0, 5), (21, 2.5, 7), (33, 1.5, 6), (46, 2.5, 6)],
         crevices=[(16, 2), (27, 2), (40, 2)], sag=2.5)
    return tones(s)


def adult_back():
    """From behind and above: the scape arches away to the top-right and the
    flower hangs beyond it, outer tepals flared so the chevroned cup shows."""
    s = Spr(48, 48, spal(IDS[2]))
    strap(s, [(10, 48), (7, 36), (4, 24), (4, 17)], 11, tip_w=0.75, rim=0.3, waist=0.85)
    strap(s, [(34, 48), (39, 42), (44, 39)], 10, tip_w=0.75, rim=0.3, waist=0.85)
    scape(s, [(17, 48), (15, 32), (15, 16), (18, 7), (22, 4)], (5, 4))
    flower(s, 25, 4, -0.18, 0.45, scale=1.75)
    snow(s, 0, 47, 42, bottom=47, humps=[(5, 2.5, 6), (17, 2.0, 7), (30, 1.5, 6), (42, 3.0, 6)],
         crevices=[(11, 2), (24, 2), (36, 2)], sag=1.0, roll=0.95, open_bottom=True)
    return tones(s, open_bottom=True)


# ---------------------------------------------------------------- icons ---

# Icons, hand-placed pixel by pixel (k outline, 1 dark, 2 mid, 3 white).
ICONS = {
    # the bulb tipped left, its blunt spear up; a snow crust across the base
    IDS[0]: [
        "................",
        "................",
        "...kk...........",
        "..k32k..........",
        "..k322k.........",
        "...k22k.........",
        "...k22kkkk......",
        "..kk222222kk....",
        ".k3222222221k...",
        ".k32222122211k..",
        "k322221222211k..",
        "k322221222211k..",
        "kk33kk3333kk3kk.",
        "k33333333333332k",
        "k22222222222221k",
        ".kkkkkkkkkkkkkk.",
    ],
    # the bud nods left from its arched scape, two strap leaves below
    IDS[1]: [
        "................",
        "....kkkkkk......",
        "...k111111k.kk..",
        "..k11kkkk1k.k2k.",
        ".k311k..k1kk32k.",
        "k3331k..k1kk32k.",
        "k3332k..k1kk32k.",
        "k3332k..k1kk32k.",
        ".k332k..k1k32k..",
        "..k32k..k1k32k..",
        "...kk..kk1k32k..",
        "..kk3322k1k2k...",
        ".k3222kkk1kk3k..",
        ".k333333333332k.",
        ".k222222222221k.",
        "..kkkkkkkkkkkk..",
    ],
    # the nodding flower: white bell, flared tepal tips, the green inverted V
    # on the inner cup between them; the arched scape on the right
    IDS[2]: [
        "................",
        "........kkk.....",
        "......kk111k....",
        ".....k11kkk1k...",
        "....k11k...k1k..",
        "...k3322k..k1k..",
        "..k333322k.k1k..",
        ".k3k333222kk1k..",
        "k33k3333k22k1k..",
        "k33k3332k22k1k..",
        "k3k33132k2kk1k..",
        ".k.k1k1kk2k.k1k.",
        "....kkk..k.kk1k.",
        ".......kk333332k",
        "........kkkkkkk.",
        "................",
    ],
}


def icon(sid):
    rows = ICONS[sid]
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), sid
    t = np.array([[{"k": 0, "1": 1, "2": 2, "3": 3}.get(ch, -1) for ch in r] for r in rows])
    t = close_outline(t)
    return np.where(t >= 0, t, T).astype(np.uint8)


# --------------------------------------------------------------- render ---

FRONTS = {IDS[0]: (bulb_front, 4), IDS[1]: (shoot_front, 4), IDS[2]: (adult_front, 5)}
BACKS = {IDS[0]: bulb_back, IDS[1]: shoot_back, IDS[2]: adult_back}


def render():
    out = {}
    for sid in IDS:
        fn, n = FRONTS[sid]
        fs = [fn(f) for f in range(n)]
        out[sid] = (fs, BACKS[sid](), [icon(sid), hop(icon(sid))])
    return out


def review_layout(art):
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "snowdrop_1x.png"), (3, "snowdrop_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            pal = PALS[sid][0]
            # bottom-aligned on one ground line
            for x, arr in ((0, fs[0]), (56, b), (106, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                y = 56 - im.height
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, y * scale), im)
        sheet.save(folder / name)
    # every frame at native size, with the back and both icon frames
    sheet = Image.new("RGB", (448, 168), (200, 208, 200))
    for n, sid in enumerate(IDS):
        fs, b, icons = art[sid]
        x = 0
        for arr in fs + [b] + icons:
            im = Image.fromarray(to_rgba(arr, PALS[sid][0]), "RGBA")
            sheet.paste(im, (x, 56 * n), im)
            x += im.width
    sheet.save(folder / "snowdrop_frames_1x.png")


POSES = {
    IDS[0]: "BRACED: a plump papery bulb half sunk in a snow crust, cream body under a pale tunic with dry "
            "brown tunic lines, one blunt grey-green leaf spear piercing the neck. The spear pushes up "
            "through the crust.",
    IDS[1]: "REARING: two flat grey-green strap leaves with pale central stripes rise through the snow; "
            "between them a closed white bud in a small green spathe starts to nod. The bud lifts and nods.",
    IDS[2]: "LUNGING: a nodding white flower hung from an arched scape at the foe, three long outer tepals "
            "flared like a skirt, the short inner cup with one green chevron at each inner tepal tip, a "
            "green ovary on top and two strap leaves below. The outer tepals flare, the flower swings once "
            "and settles.",
}
WHITE_NOTE = {
    IDS[1]: " WHITE: the snowdrop bud is a white flower in the making (and it rises out of snow).",
    IDS[2]: " WHITE: Galanthus nivalis has pure white tepals; the snow crust is white too.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        pal, sport = PALS[sid]
        write_species(sid, palette=pal, sport=sport, front=fs, back=[b], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + POSES[sid] + WHITE_NOTE.get(sid, "") +
                      " Snow, leaves and scape stay fixed; only the signature part moves. "
                      "No enclosed dark dots: every inner-tepal chevron joins its tip's outline. "
                      "Sport: Galanthus nivalis Sandersii Group, yellow ovary and inner marks, so the dark "
                      "slot becomes a yellow-olive; geometry stays identical.")
        intro_strip(sid)


def preview(path):
    """Scratch sheet: every frame, back and icons at 4x, plus sport fronts."""
    from kit import to_rgba
    art = render()
    rows = []
    for sid in IDS:
        fs, b, icons = art[sid]
        pal, sport = PALS[sid]
        ims = [to_rgba(f, pal) for f in fs] + [to_rgba(fs[0], sport), to_rgba(b, pal)] + \
              [to_rgba(i, pal) for i in icons]
        rows.append(ims)
        for k, f in enumerate(fs):
            op = (f != T).sum()
            ys, xs = np.nonzero(f != T)
            print(f"{sid} f{k}: {xs.max() - xs.min() + 1}x{ys.max() - ys.min() + 1} fill {op / f.size:.1%} "
                  f"white {(f == 3).sum() / op:.1%} comx {xs.mean():.1f} bottom {ys.max()}")
        op = (b != T).sum()
        print(f"{sid} back fill {op / b.size:.1%} white {(b == 3).sum() / op:.1%}")
    k = 4
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


if __name__ == "__main__":
    if "--preview" in sys.argv:
        preview(sys.argv[sys.argv.index("--preview") + 1])
    else:
        build()
