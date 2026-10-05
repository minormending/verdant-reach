"""Crystal rule, sunflower line: sunflower_seedling -> sunflower_bud -> sunflower.

THE FIRST EXCEPTION (docs/CREATURES.md § Crystal rule, Exceptions). A
sunflower is three hues: green leaves, gold rays and a brown seed disc. The
pilot forced it into two (it dropped the brown and drew the disc black) and
the disc lost its identity and read as an eye. So this line keeps the base
art's own palette, with the species' light tone in index 3 instead of the
shared white:

  index 0  #181818  full outline, seams, the seed dots, cast shadow  (shared)
  index 1  species dark: blue-green (seedling, bud), seed brown (sunflower)
  index 2  leaf green, the body
  index 3  species light: pale gold / gold. The rays, the hull stripes, and
           the lit rims and glints (the "white" of this line)

Everything else follows the rule. This is the base art from
tools/art/species_a/sunflower.py (same shapes, poses and palette), re-rendered
with a FULL black outline (no selout; internal lines are black, not dark),
flat bold crescent shading, gold only on lit rims, glints and the rays, and the
pilot's entrance animations (tools/art/review/crystal_sunflower.png) re-made
on this art:

  sunflower_seedling  the seed leaves clasp the hull, then fling wide and settle.
  sunflower_bud       the bud squeezes, swells, and CRACKS: gold rays burst out.
  sunflower           the head lifts from a nod, turns to face the foe, the rays
                      flare and the disc gleams.

Only the named part moves; frames are locked to frame 0 outside the moving box.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/sunflower.py   # write the base bundles + review sheet
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))                        # the crystal kit

from kit import BLACK, T, write_species, review_sheet, intro_strip, legacy, to_index  # noqa: E402

px = legacy("species_a/px.py")
fk = legacy("species_a/fieldkit.py")
Sprite, bezier, star = px.Sprite, px.bezier, px.star

TOOL = "tools/art/crystal/sunflower.py"
IDS = ["sunflower_seedling", "sunflower_bud", "sunflower"]

# the base palettes (index 1-3), unchanged
PAL = {
    "sunflower_seedling": ["#305030", "#78b840", "#e8e890"],   # blue-green, leaf green, pale gold
    "sunflower_bud": ["#305030", "#70b040", "#f8c830"],        # blue-green, leaf green, gold
    "sunflower": ["#583018", "#609838", "#f8c020"],            # seed brown, leaf green, gold rays
}
# 'Italian White' (docs/SPORTS.md): cream-white rays round a near-black disc.
SPORT = {
    "sunflower_seedling": ["#384828", "#a0b850", "#f8f0d0"],
    "sunflower_bud": ["#284838", "#68a848", "#f8f0c8"],
    "sunflower": ["#402028", "#589840", "#f8f0c8"],
}


def palette(id_):
    return [BLACK, *PAL[id_]]


def sport(id_):
    return [BLACK, *SPORT[id_]]


def heart(c, p0, p1, w, bend=0.0, teeth=7):
    """Ovate/heart leaf with a fine serrated edge (as the base)."""
    return c.leaf(p0, p1, w, bend=bend, power=0.55, tip=1.35, base=0.55, teeth=teeth, tooth=0.10)


def vein(s, ctrl, tone, over):
    for x, y in bezier(ctrl, 40):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def phyllo(s, cx, cy, rx, ry, n, tone, over, ang=0.0):
    """Fibonacci seed spiral: dots of `tone` where the disc is `over`."""
    ca, sa = np.cos(np.radians(ang)), np.sin(np.radians(ang))
    for k in range(1, n):
        a = k * np.radians(137.5)
        r = np.sqrt(k / n)
        u, v = np.cos(a) * r * rx, np.sin(a) * r * ry
        x, y = int(round(cx + u * ca - v * sa)), int(round(cy + u * sa + v * ca))
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def gleam(s, x, y, big=True):
    """A 4-point star glint in the light tone."""
    pts = [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
    if big:
        pts += [(x - 2, y), (x + 2, y), (x, y - 2), (x, y + 2)]
    s.px(pts, 3)


def done(s) -> np.ndarray:
    """Final image as palette indexes: full black outline (no selout), no orphans."""
    a = np.asarray(fk.image(s))
    out = np.full(a.shape[:2], T, np.uint8)
    for k in range(4):
        out[(a[..., 3] == 255) & (a[..., :3] == s.pal[k]).all(-1)] = k
    return out


def frames_of(fn, params, box):
    """Render every frame, register them on one shared bottom-centre offset
    (union bbox, like the base), then lock them to frame 0 outside `box`."""
    raw = [fn(p) for p in params]
    ys = [np.nonzero((r != T).any(1))[0] for r in raw]
    xs = [np.nonzero((r != T).any(0))[0] for r in raw]
    x0, x1 = min(x[0] for x in xs), max(x[-1] for x in xs) + 1
    y1 = max(y[-1] for y in ys) + 1
    ox, oy = (56 - (x1 - x0)) // 2 - x0, 56 - y1
    out = []
    for r in raw:
        f = np.full((56, 56), T, np.uint8)
        sy, sx = slice(max(0, -oy), min(56, 56 - oy)), slice(max(0, -ox), min(56, 56 - ox))
        f[sy.start + oy:sy.stop + oy, sx.start + ox:sx.stop + ox] = r[sy, sx]
        out.append(f)
    allow = np.zeros((56, 56), bool)
    for bx0, by0, bx1, by1 in box:
        allow[by0:by1, bx0:bx1] = True
    return [np.where(allow, f, out[0]) for f in out]


# =========================================================================== seedling

def seedling_front(fr):
    """LUNGING. A stout sprout leaning in on a C of stem, its seed hull jammed
    on its head like an oversized striped helmet tipped at the foe; the seed
    leaves are arms, the near one thrust forward, the far one flung up."""
    lead_tip, rear_tip, lead_w, rear_w = fr
    s = Sprite(56, 56, PAL["sunflower_seedling"])
    c = s.c
    roots = c.leaf((32, 54), (22, 55.6), 6, power=0.6) | c.leaf((34, 54), (44, 55.6), 6, power=0.6)
    s.add(roots, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 16, 33, 55)
    rear = c.leaf((29, 39), rear_tip, rear_w, bend=-2.0, power=0.6, tip=0.8, base=1.2)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=1)
    stem = c.curve([(33, 55.6), (35, 49), (32, 42), (27, 38)], 7.0, 5.6)
    s.add(stem, tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    true1 = c.leaf((28, 38), (34, 30), 6, power=0.7, tip=1.5)
    s.add(true1, tones=(1, 2, 2), shade=(1, 1))
    lead = c.leaf((27, 41), lead_tip, lead_w, bend=2.2, power=0.6, tip=0.75, base=1.2)
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    hull = c.leaf((29, 38), (22, 14), 14, power=0.62, tip=1.5, base=0.75)
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    # gold stripes down the hull (the line's accent)
    from scipy import ndimage
    inner = ndimage.binary_erosion(hull, iterations=1)
    for off in (-3.0, 0.4):
        for t in np.linspace(0.16, 0.9, 50):
            x, y = fk.mi(s, 29 + (22 - 29) * t + off * 0.96, 38 + (14 - 38) * t + off * 0.29)
            if inner[y, x] and s.t[y, x] == 0:
                s.px([(x, y)], 3)
    # the lead leaf's midrib follows its tip
    (bx, by), (tx, ty) = (25, 41), lead_tip
    mid = (bx + (tx - bx) * 0.5, by + (ty - by) * 0.5 - 1)
    tip = (bx + (tx - bx) * 0.88, by + (ty - by) * 0.88)
    vein(s, [fk.m(s, *p) for p in ((bx, by), mid, tip)], 1, (2,))
    fk.contact(s, 25, 31)
    s.clean()
    return done(s)


SEED_FRAMES = [
    # lead tip, rear tip, lead width, rear width (the pilot's gesture on the base shapes)
    ((10, 29), (45, 22), 15, 12),    # 0 rest: lead arm thrust, rear arm up
    ((19, 23), (38, 16), 10, 9),     # 1 clasped round the hull (shy, closed)
    ((14, 26), (42, 19), 13, 11),    # 2 opening
    ((6, 34), (49, 26), 16, 13),     # 3 flung wide
    ((10, 28), (45, 21), 15, 12),    # 4 rest, arms a hair higher (idle breath)
]
SEED_BOX = [(0, 4, 56, 50)]
SEED_ANIM = {
    "intro": [[1, 16], [2, 4], [3, 12], [2, 4], [0, 8], [4, 5], [0, 1]],
    "idle": [[0, 110], [4, 14]],
}


# =========================================================================== bud

def bud_front(fr):
    """LUNGING. The bud nods hard at the foe on a crooked neck: a spiked fist
    of green bracts with gold petal tips bursting from its front; the near
    heart leaf thrust forward, the far one flung back."""
    swell, crack, glint = fr
    s = Sprite(56, 56, PAL["sunflower_bud"])
    c = s.c
    feet = c.leaf((35, 54), (25, 55.6), 6, power=0.6) | c.leaf((37, 54), (48, 55.6), 6, power=0.6)
    s.add(feet, tones=(1, 1, 1), flat=True)
    fk.pose(s, 1.0, 10, 36, 55)
    hx, hy = 20, 24
    k = 1.0 + 0.08 * swell
    rear = heart(c, (36, 34), (51, 22), 11, bend=-2.0)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=1)
    stem = c.curve([(36, 56.5), (39, 44), (35, 33), (hx + 8, hy + 2)], 6.5, 5.0)
    s.add(stem, tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    bracts = star(c, hx + 1, hy, 11, 8.0 * k, 16.0 * k, sx=0.9, sy=0.95, rot=-12)
    s.add(bracts, tones=(1, 2, 2), shade=(2, 2), close=1, line="black")
    bud = c.ellipse(hx + 3, hy, 7.5 * k, 8.5 * k, -20)
    s.add(bud, tones=(1, 2, 3), shade=(3, 3), band=(1, 2, c.Y < hy), line="black")
    if crack > 0:    # the gold petal tips cracking out of the foe-side seam
        r_out = 6.5 + 6.0 * crack
        tips = star(c, hx - 3, hy + 0.5, 8, 4.5, r_out * k, sx=0.8, sy=1.0, rot=-8)
        s.add(tips & (c.X < hx - 1), tones=(2, 3, 3), shade=(1, 1), line="black")
    lead = heart(c, (33, 42), (5, 40), 15, bend=2.0)
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    vein(s, [fk.m(s, *p) for p in ((31, 42), (18, 42), (8, 40))], 1, (2, 3))
    # overlapping bract scales on the bud (artichoke-like chevrons)
    for (x0, y0) in ((hx + 3, hy - 4), (hx + 6, hy + 1), (hx + 2, hy + 4), (hx + 7, hy - 3)):
        x0, y0 = fk.mi(s, x0 + (x0 - hx) * (k - 1), y0 + (y0 - hy) * (k - 1))
        s.px([(x0 - 1, y0 - 1), (x0, y0), (x0 + 1, y0 - 1)], 1)
    x0, y0 = fk.mi(s, hx + 1, hy - 6 * k)
    s.px([(x0, y0), (x0 + 1, y0 - 1), (x0 + 1, y0)], 3)
    if glint:
        gx, gy = fk.mi(s, hx - 6 - 2 * crack, hy - 3)
        gleam(s, gx, gy, big=False)
    fk.contact(s, 26, 32)
    s.clean()
    return done(s)


BUD_FRAMES = [
    # swell, crack, glint
    (0.0, 1.0, 0),    # 0 rest: the base's gold tips peeking from the seam
    (-0.7, 0.0, 0),   # 1 squeezed shut (anticipation)
    (0.8, 0.0, 0),    # 2 swollen
    (0.8, 1.6, 1),    # 3 CRACK: the rays burst out, a glint
    (0.4, 1.3, 0),    # 4 easing back
]
BUD_BOX = [(0, 4, 42, 44)]
BUD_ANIM = {
    "intro": [[1, 14], [2, 10], [1, 4], [2, 6], [3, 16], [4, 6], [0, 1]],
    "idle": [[0, 130], [4, 10]],
}


# =========================================================================== sunflower

def sun_front(fr):
    """LOOMING. A huge seed disc turned 3/4 at the foe and overhanging it,
    a ring of gold petals blazing round it; a thick neck curving back down
    to planted roots; heart leaves spread as arms."""
    hx, hy, turn, flare, tilt, gl = fr
    s = Sprite(56, 56, PAL["sunflower"])
    c = s.c
    feet = c.leaf((36, 54), (24, 55.6), 7, power=0.6) | c.leaf((38, 54), (52, 55.6), 7, power=0.6)
    s.add(feet, tones=(1, 2, 2), shade=(1, 1))
    fk.pose(s, 1.07, 14, 37, 55)
    rear = heart(c, (38, 34), (54, 23), 12, bend=-2.0)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=1)
    stem = c.curve([(37, 56), (40, 46), (38.5, 37)], 7.0, 6.6)
    s.add(stem, tones=(1, 2, 2), shade=(2, 0))
    neck = c.curve([(38.5, 38), (37.5, 32), (hx + 7, hy + 4)], 6.6, 6.0)   # moves with the head
    s.add(neck, tones=(1, 2, 2), shade=(2, 0), line="none")
    ta = np.radians(tilt)
    ct, st = np.cos(ta), np.sin(ta)

    def P(u, v):    # head space -> design space (the head nods by `tilt` deg)
        return (hx + u * ct - v * st, hy + u * st + v * ct)

    sx = turn
    # the back of the head shows on the far side: green bracts
    bc = P(6 * turn / 0.62, 0)
    br = star(c, bc[0], bc[1], 12, 10.0, 14.5, sx=0.55 * turn / 0.62, sy=1.0, rot=-15 + tilt)
    s.add(br, tones=(1, 2, 2), shade=(2, 2), line="black")
    # petals: back ring then front ring, on the turned ellipse; the front ring
    # is flat gold, the back ring takes the brown shade on its far side
    for k, (n, r0, r1, w, rot) in enumerate(((15, 8, 19.5, 7.0, 12), (15, 8, 18.0, 7.0, 0))):
        for j in range(n):
            a = np.radians(rot + 360 * j / n)
            ca, sa = np.cos(a), np.sin(a)
            rr = r0 + (r1 - r0) * flare
            p0 = P(ca * r0 * sx, sa * r0)
            p1 = P(ca * rr * sx * (1.25 if ca > 0 else 0.95), sa * rr)
            m = c.leaf(p0, p1, w, power=0.6, tip=1.6, base=0.8)
            s.add(m, tones=(1, 3, 3), shade=(2, 2) if k else (1, 1), line="black")
    dc = P(-1, 0)
    disc = c.ellipse(dc[0], dc[1], 11.0 * sx + 0.6, 11.5, tilt)
    s.add(disc, tones=(0, 1, 1), shade=(2, 2), line="black")
    lead = heart(c, (35, 42), (7, 42), 16, bend=2.5)
    s.add(lead, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    dcx, dcy = fk.m(s, *dc)
    phyllo(s, dcx, dcy, 6.2 * turn / 0.62, 10.2, 46, 0, (1,), ang=-14 + tilt)
    gx, gy = fk.mi(s, *P(-4 * turn / 0.62 - 1, -7))
    if gl == 1:     # the base's small glint
        s.px([(gx, gy), (gx + 1, gy - 1), (gx, gy - 1)], 3)
    elif gl == 2:   # the GLEAM: a 4-point star
        gleam(s, gx, gy)
    vein(s, [fk.m(s, *p) for p in ((33, 42), (20, 43), (10, 42))], 1, (2, 3))
    vein(s, [fk.m(s, *p) for p in ((40, 34), (47, 28), (53, 24))], 1, (2,))
    fk.contact(s, 27, 34)
    s.clean()
    return done(s)


SUN_FRAMES = [
    # hx, hy, turn, flare, tilt, gleam (0 none, 1 small glint, 2 big star)
    (24, 21, 0.62, 1.00, 0, 1),      # 0 rest: facing the foe, the base's glint
    (28, 25, 0.40, 0.80, 22, 0),     # 1 nodding, turned away, rays furled
    (26, 23, 0.50, 0.90, 10, 0),     # 2 lifting, turning
    (24, 20, 0.66, 1.12, -4, 1),     # 3 up, rays flared
    (24, 20, 0.66, 1.12, -4, 2),     # 4 flare + GLEAM
    (24, 21, 0.62, 1.00, 0, 2),      # 5 rest + gleam (idle twinkle)
]
SUN_BOX = [(0, 0, 52, 41)]
SUN_ANIM = {
    "intro": [[1, 12], [2, 6], [3, 5], [4, 14], [5, 8], [0, 1]],
    "idle": [[0, 150], [5, 8]],
}


# =========================================================================== backs (the base's, full outline)

def seedling_back():
    """From behind and above: the seed leaves spread like arms (the near one
    raised on the right), the hull helmet tipped toward the foe."""
    s = Sprite(48, 48, PAL["sunflower_seedling"], crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.4, 26, 14)
    stem = c.curve([(20, 48), (20, 38), (23, 28)], 7.0, 5.6)
    cotL = c.leaf((21, 29), (1, 20), 15, bend=2.0, power=0.6, tip=0.75, base=1.3)
    cotR = c.leaf((25, 28), (47, 12), 18, bend=-2.0, power=0.6, tip=0.75, base=1.3)
    true1 = c.leaf((22.5, 28), (19, 17), 8, power=0.7, tip=1.5)
    true2 = c.leaf((24, 28), (29, 17), 8, power=0.7, tip=1.5)
    hull = c.leaf((24, 22), (35, 8), 11, power=0.6, tip=1.7, base=0.6)
    s.add(stem, tones=(1, 2, 2), shade=(3, 0))
    s.add(cotL, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(true1, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(true2, tones=(1, 2, 2), shade=(2, 2))
    s.add(cotR, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    for t in np.linspace(0.15, 0.85, 40):
        x, y = fk.mi(s, 24 + 11 * t, 22 - 14 * t)
        if 0 <= x < 48 and 0 < y < 47 and s.t[y, x] == 0 and s.t[y - 1, x] == 0 and s.t[y + 1, x] == 0:
            s.px([(x, y)], 3)
    s.clean()
    return done(s)


def bud_back():
    """The bud from behind and below: the green star of bracts, gold tips
    peeping round its far rim, nodding toward the foe (top right)."""
    s = Sprite(48, 48, PAL["sunflower_bud"], crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.3, 26, 18)
    hx, hy = 27, 17
    lfL = heart(c, (18, 38), (0, 30), 15, bend=2.0)
    lfR = heart(c, (20, 32), (47, 30), 15, bend=-2.0)
    s.add(lfL, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.add(star(c, hx + 2, hy - 2, 9, 9.0, 14.5, sx=1.0, sy=0.85, rot=-80) & (c.Y < hy - 3),
          tones=(3, 3, 3), flat=True)
    s.add(star(c, hx, hy, 11, 8.0, 14.5, sx=1.0, sy=0.9, rot=-60), tones=(1, 2, 2), shade=(2, 2), close=1)
    s.add(star(c, hx - 0.5, hy + 0.5, 8, 4.5, 9.5, sx=1.0, sy=0.9, rot=-40), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 2), line="black")
    s.add(lfR, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    stem = c.curve([(17, 48), (16, 37), (20, 27), (hx - 1, hy + 2)], 7.0, 5.0)
    s.add(stem, tones=(1, 2, 3), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    s.clean()
    return done(s)


def sun_back():
    """The back of the great head from behind and below: a broad green star
    of bracts ringed by the backs of the gold rays, leaning to the top
    right; the thick neck runs up into its centre; leaves raised."""
    s = Sprite(48, 48, PAL["sunflower"], crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.06, 24, 28)
    hx, hy = 26, 18
    lfL = heart(c, (17, 40), (0, 32), 15, bend=2.0)
    lfR = heart(c, (20, 36), (47, 40), 14, bend=-2.0)
    s.add(lfL, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    for j in range(16):
        a = np.radians(5 + 360 * j / 16)
        p0 = (hx + np.cos(a) * 9, hy + np.sin(a) * 8)
        p1 = (hx + np.cos(a) * 22, hy + np.sin(a) * 18)
        s.add(c.leaf(p0, p1, 8, power=0.6, tip=1.6, base=0.8), tones=(1, 3, 3), shade=(1, 1), line="black")
    s.add(star(c, hx, hy, 15, 10.5, 14.0, sx=1.0, sy=0.88, rot=-8), tones=(1, 2, 2), shade=(2, 2), close=1,
          line="black")
    s.add(star(c, hx - 0.5, hy + 0.5, 11, 6.5, 10.0, sx=1.0, sy=0.88, rot=10), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 2), line="black")
    s.add(lfR, tones=(2, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    stem = c.curve([(16, 48), (15, 38), (19, 28), (hx - 1, hy + 2)], 9.0, 7.0)
    s.add(stem, tones=(1, 2, 3), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    s.clean()
    return done(s)


# =========================================================================== icons (the base's)

def base_icons(id_):
    """The base icons already have a full black outline: reuse the base generator's."""
    sa = legacy("species_a/sunflower.py")
    pal = PAL[id_]
    if id_ in sa.HAND:
        i1, i2 = fk.hand_icon(sa.HAND[id_], pal)
    else:
        i1, i2 = fk.icon_frames(sa.ICON_FN[id_], None)
    return [ring(to_index(np.asarray(i.convert("RGBA")), palette(id_))) for i in (i1, i2)]


def ring(ix: np.ndarray) -> np.ndarray:
    """Close outline gaps: a transparent pixel 4-next to a colour pixel turns
    black (the squashed icon frame cuts the petal tips open)."""
    out = ix.copy()
    col = (ix != T) & (ix != 0)
    p = np.pad(col, 1)
    near = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    out[(ix == T) & near] = 0
    return out


# =========================================================================== write

EXCEPTION = ("EXCEPTION to the Crystal rule (approved by the Director): index 3 is the line's own gold, not "
             "the shared white, because a sunflower's identity is three hues (green leaves, gold rays, the "
             "brown seed disc) and the two-tone pilot lost the disc. Everything else follows the rule: full "
             "black outline, flat crescent shading, gold only on the rays, hull stripes, lit rims and glints. ")
NOTES = {
    "sunflower_seedling": EXCEPTION + (
        "LUNGING, the base art re-rendered. Intro: the seed leaves start clasped round the striped hull, "
        "open, fling wide, settle with one rebound; only the seed leaves move. Idle: the arms lift 1px. "
        "Sport: 'Italian White'. Helianthus annuus 'Italian White': cream-white rays round a near-black disc."),
    "sunflower_bud": EXCEPTION + (
        "LUNGING, the base art re-rendered. Intro: the bud squeezes shut, swells, squeezes, swells and CRACKS: "
        "gold rays burst out of the foe-side seam with a glint, then ease back to the peeking tips. Only the "
        "head moves. Idle: the tips ease open. "
        "Sport: 'Italian White'. Helianthus annuus 'Italian White': cream-white rays round a near-black disc."),
    "sunflower": EXCEPTION + (
        "LOOMING, the base art re-rendered: the brown seed disc with its black Fibonacci spiral. Intro: the "
        "head starts nodding and turned away, lifts and turns to face the foe, the rays flare past rest and the "
        "disc GLEAMS (a gold 4-point star), then settles. Only the head and neck move. Idle: the gleam "
        "twinkles every ~2.5 s. "
        "Sport: 'Italian White'. Helianthus annuus 'Italian White': cream-white rays round a near-black disc."),
}


def data():
    return {
        "sunflower_seedling": (frames_of(seedling_front, SEED_FRAMES, SEED_BOX), seedling_back(), SEED_ANIM,
                               SEED_BOX),
        "sunflower_bud": (frames_of(bud_front, BUD_FRAMES, BUD_BOX), bud_back(), BUD_ANIM, BUD_BOX),
        "sunflower": (frames_of(sun_front, SUN_FRAMES, SUN_BOX), sun_back(), SUN_ANIM, SUN_BOX),
    }


def build():
    errors = 0
    for id_, (front, back, anim, box) in data().items():
        probs = write_species(id_, palette=palette(id_), sport=sport(id_), front=front, back=[back],
                              icon=base_icons(id_), anim=anim, moving=box, notes=NOTES[id_], tool=TOOL)
        errors += sum(1 for lvl, _ in probs if lvl == "error")
    return errors


if __name__ == "__main__":
    n = build()
    for id_ in IDS:
        intro_strip(id_)
    print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_sunflower_exception.png"))
    sys.exit(1 if n else 0)
