"""Crystal-rule pilot, sunflower line: sunflower_seedling -> sunflower_bud -> sunflower.

(docs/CRYSTAL_PILOT.md, row 4.)  A redraw, not a recolour, of
tools/art/species_a/sunflower.py under the Crystal rule:

  index 0  #181818  outline, the seed hull, the disc's deep florets, cast shadow (shared)
  index 1  species dark: leaf green -- leaves, stem, bracts, the seed lattice
  index 2  species light: the line's yellow, ripening along the line (rays, lit rims)
  index 3  #f8f8f8  highlights: ray rims, leaf rims, the seed-hull stripes, glints (shared)

The palette problem.  A sunflower is three colours (green leaves, gold rays,
brown disc) and the rule gives it two.  The brief suggested a deep gold or
brown in index 1; tried (#806818, #707018 and friends), it reads as mud: the
leaves turn autumn-brown and the line sits far darker and duller than the oak
and flytrap lines.  What works is the flytrap's trick: the dark slot carries
the SECOND HUE.  Index 1 is a true leaf green, index 2 the yellow, and the
disc is drawn in the shared BLACK (a near-black seed face with a green seed
lattice and a ring of yellow open florets), so the brown is simply dropped.
The rays get no index-1 shading at all (green-shaded yellow looks sickly):
they are flat yellow, separated by black, rimmed in white on the lit side.
Along the line the yellow ripens: lime-yellow (seedling), gold (bud),
sunflower yellow (sunflower).

Poses (CREATURES.md §4) are kept from the base art:
  sunflower_seedling  LUNGING  the striped seed hull worn as a helmet, seed leaves as arms
  sunflower_bud       LUNGING  a nodding fist of bracts on a crooked neck
  sunflower           LOOMING  a huge 3/4 disc overhanging the foe

Entrance animations (only the named part moves; the rest is pixel-identical):
  sunflower_seedling  the seed leaves clasp the hull, then fling wide open and settle.
  sunflower_bud       the bud squeezes, swells, and cracks a sliver of yellow.
  sunflower           the head lifts from a nod, turns to face the foe, the petals
                      flare and the disc gleams.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/pilot_crystal/sunflower.py            # write the pack bundles + review sheet
  $PY tools/art/pilot_crystal/sunflower.py --preview  # frames strip only (scratch)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "species_a"))   # px
sys.path.insert(0, str(HERE))                        # common

from px import Sprite, bezier, star  # noqa: E402
import fieldkit as fk  # noqa: E402
from common import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402

TOOL = "tools/art/pilot_crystal/sunflower.py"
IDS = ["sunflower_seedling", "sunflower_bud", "sunflower"]

PAL = {  # (index 1, index 2)
    "sunflower_seedling": ("#388028", "#b8d838"),   # leaf green, lime-yellow
    "sunflower_bud":      ("#408828", "#f0c828"),   # olive, gold
    "sunflower":          ("#509828", "#f8c818"),   # olive-gold, sunflower yellow
}
# 'Italian White' (docs/SPORTS.md): cream-white rays round a near-black disc.
# In two colours: the yellow becomes cream, the olive becomes a sage green
# (the disc stays black, which is what makes it 'near-black').
SPORT = {
    "sunflower_seedling": ("#406848", "#d8e0a0"),
    "sunflower_bud":      ("#386848", "#e8e0b0"),
    "sunflower":          ("#386848", "#f0e8b8"),
}


def palette(id_):
    return [BLACK, *PAL[id_], WHITE]


def sport(id_):
    return [BLACK, *SPORT[id_], WHITE]


def sprite(id_, size=56, crop=False):
    return Sprite(size, size, list(PAL[id_]) + [WHITE], crop_bottom=crop)


def idx(s: Sprite) -> np.ndarray:
    s.clean(force=True)
    t = s.t.copy()
    out = np.where(t < 0, T, t).astype(np.uint8)
    return out


def heart(c, p0, p1, w, bend=0.0, teeth=7):
    return c.leaf(p0, p1, w, bend=bend, power=0.55, tip=1.35, base=0.55, teeth=teeth, tooth=0.10)


def line(s, ctrl, tone, over, n=40):
    for x, y in bezier(ctrl, n):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


def veins(s, p0, p1, bend=0.0, n=3, tone=0, over=(1, 2), side=1, map_=None):
    """Midrib p0->p1 (bowed by `bend`) plus n side veins swept toward the tip."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    at = lambda u, v=0.0: p0 + ax * L * u + nx * (v + bend * np.sin(np.pi * u))  # noqa: E731
    mp = map_ or (lambda q: q)
    line(s, [mp(at(u)) for u in (0.0, 0.45, 0.9)], tone, over)
    for k in range(n if n else 0):
        u = 0.25 + 0.5 * k / max(1, n - 1)
        for sd in ((side,) if side else (1, -1)):
            line(s, [mp(at(u)), mp(at(u + 0.12, sd * 0.22 * L * 0.35))], tone, over, n=12)


def side(c, p0, p1, bend=0.0):
    """Mask of the canvas on the LEFT of travel p0->p1 (the midrib bowed by bend)."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    dx, dy = c.X - p0[0], c.Y - p0[1]
    u = np.clip((dx * ax[0] + dy * ax[1]) / L, 0, 1)
    v = dx * nx[0] + dy * nx[1] - bend * np.sin(np.pi * u)
    return v < 0


LEAF = "lrib"
DISC = "both"
PETAL = 18.0


def lock(frames, boxes):
    """Every frame equals frame 0 outside the moving boxes (registration)."""
    f0 = frames[0]
    allow = np.zeros(f0.shape, bool)
    for x0, y0, x1, y1 in boxes:
        allow[y0:y1, x0:x1] = True
    return [np.where(allow, f, f0) for f in frames]


# =========================================================================== sunflower

def sun_head(s, c, hx, hy, turn=0.62, flare=1.0, tilt=0.0, gleam=0, back=False):
    """The head: back ring of petals, front ring, disc. `turn` is the 3/4
    squash (1 = facing the camera), `flare` scales the petal length, `tilt`
    rotates the whole head (deg, + = clockwise / nodding down)."""
    sx = turn
    ta = np.radians(tilt)
    ct, st = np.cos(ta), np.sin(ta)

    def P(u, v):  # head space -> canvas (rotated by tilt)
        return (hx + u * ct - v * st, hy + u * st + v * ct)

    lit = (c.X < hx + 3) & (c.Y < hy + 2)
    # back ring: the green bracts peeking between the rays
    for j in range(13):
        a = np.radians(14 + 360 * j / 13)
        ca, sa = np.cos(a), np.sin(a)
        far = 1.2 if ca > 0 else 0.95
        rr = 8 + (15.5 - 8) * flare
        m = c.leaf(P(ca * 8 * sx, sa * 8), P(ca * rr * sx * far, sa * rr), 6.0, power=0.6, tip=1.8, base=0.8)
        s.add(m, tones=(1, 1, 1), flat=True, line="black")
    # front ring: broad yellow rays, black between them, white rims on the lit side
    for j in range(13):
        a = np.radians(360 * j / 13)
        ca, sa = np.cos(a), np.sin(a)
        far = 1.25 if ca > 0 else 0.95
        rr = 8 + (PETAL - 8) * flare
        m = c.leaf(P(ca * 8 * sx, sa * 8), P(ca * rr * sx * far, sa * rr), 8.0, power=0.6, tip=1.5, base=0.8)
        front_lit = (ca < 0.5) and (sa < 0.5)
        s.add(m, tones=(2, 2, 3), flat=not front_lit, shade=(1, 1) if front_lit else None, line="black",
              band=(1, 2, lit) if front_lit else None)
    dc = P(-1, 0)
    disc = c.ellipse(dc[0], dc[1], 11.0 * sx + 0.6, 11.5, np.degrees(ta))
    s.add(disc, tones=(0, 0, 0), flat=True, line="black")
    return dc


def sun_front(fr):
    """LOOMING. The huge disc turned 3/4 at the foe and overhanging it, a ring
    of yellow rays round it, a thick neck curving back to planted roots,
    heart leaves spread as arms."""
    id_ = "sunflower"
    s = sprite(id_)
    c = s.c
    hx, hy, turn, flare, tilt, gleam = fr
    feet = c.leaf((36, 54), (23, 55.6), 7, power=0.6) | c.leaf((38, 54), (53, 55.6), 7, power=0.6)
    s.add(feet, tones=(0, 1, 1), shade=(1, 1))
    fk.pose(s, 1.06, 12, 37, 55)          # the whole plant swings about its roots at the foe
    rear = heart(c, (38, 35), (55, 21), 12, bend=-2.0)
    rear_up = rear & ~side(c, (38, 35), (55, 21), -2.0)
    s.add(rear, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    stem = c.curve([(37, 56), (40, 46), (38.5, 37)], 7.0, 6.4)
    s.add(stem, tones=(0, 1, 2), shade=(2, 0), band=(1, 2))
    neck = c.curve([(38.5, 38), (37.5, 32), (hx + 8, hy + 5)], 6.4, 6.0)     # the neck moves with the head
    s.add(neck, tones=(0, 1, 2), shade=(2, 0), band=(1, 2), line="none")
    dc = sun_head(s, c, hx, hy, turn, flare, tilt)
    lead = heart(c, (35, 43), (6, 38), 16, bend=3.0)
    lead_up = lead & side(c, (35, 43), (6, 38), 3.0)
    s.add(lead, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    s.render()
    M = lambda x, y: fk.mi(s, x, y)  # noqa: E731
    dcx, dcy = fk.m(s, *dc)
    # disc florets: a black seed face; the ring of open florets round its lit
    # rim in yellow, the seed lattice (two crossing spirals) in green inside
    k_ = s._zk[0]
    disc_m = s.t == 0
    for y in range(56):
        for x in range(56):
            if not disc_m[y, x]:
                continue
            u, v = (x + 0.5 - dcx) / (11.0 * turn * k_), (y + 0.5 - dcy) / (11.0 * k_)
            r = np.hypot(u, v)
            lat = (x + y) % 4 == 0 or (x - y) % 4 == 0
            if DISC in ("ring", "both") and 0.62 < r < 0.86 and u + v < 0.1 and lat:
                s.px([(x, y)], 2)
            elif DISC in ("lattice", "both") and r < 0.62 and u + v < 0.5 and lat:
                s.px([(x, y)], 1)
    # leaf midribs (black: a deep fold)
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    if LEAF == "split":    # the lit half of each leaf takes the light tone, folded at the midrib
        s.paint(lead_up & (s.t == 1), 2)
        s.paint(rear_up & (s.t == 1), 2)
        veins(s, (35, 43), (6, 38), bend=3.0, n=0, tone=1, over=(2,), map_=mp)
    elif LEAF == "lrib":
        veins(s, (35, 43), (6, 38), bend=3.0, n=0, tone=2, over=(1,), map_=mp)
        veins(s, (38, 35), (55, 21), bend=-2.0, n=0, tone=2, over=(1,), map_=mp)
    elif LEAF == "rib":
        veins(s, (35, 43), (6, 38), bend=3.0, n=0, map_=mp)
        veins(s, (38, 35), (55, 21), bend=-2.0, n=0, map_=mp)
    gx, gy = M(dc[0] - 4 * turn - 1, dc[1] - 6)
    if gleam == 1:    # the gleam: a 4-point star
        s.px([(gx, gy), (gx - 1, gy), (gx + 1, gy), (gx, gy - 1), (gx, gy + 1)], 3)
        s.px([(gx - 2, gy), (gx + 2, gy), (gx, gy - 2), (gx, gy + 2)], 3)
    # weighted contact line
    for x in range(27, 34):
        ys = np.nonzero(s.t[:, x] >= 0)[0]
        if len(ys) and s.t[ys.max(), x] == 0 and s.t[ys.max() - 1, x] > 0:
            s.px([(x, ys.max() - 1)], 0)
    return idx(s)


SUN_FRAMES = [
    # hx, hy, turn, flare, tilt, gleam
    (22, 21, 0.62, 1.00, 0, 0),      # 0 rest: facing the foe
    (27, 26, 0.36, 0.80, 24, -1),    # 1 nodding, turned away, petals furled
    (24, 23, 0.48, 0.90, 10, -1),    # 2 lifting, turning
    (22, 20, 0.66, 1.12, -4, -1),    # 3 up, petals flared
    (22, 20, 0.66, 1.12, -4, 1),     # 4 flare + gleam
    (22, 21, 0.62, 1.00, 0, 1),      # 5 rest + gleam (idle twinkle)
]
SUN_BOX = [(0, 0, 50, 42)]
SUN_ANIM = {
    "intro": [[1, 12], [2, 6], [3, 5], [4, 14], [5, 8], [0, 1]],
    "idle": [[0, 150], [5, 8]],
}


# =========================================================================== seedling

def seedling_front(fr):
    """LUNGING. A stout sprout leaning in on a C of stem, its striped seed hull
    jammed on its head like a helmet tipped at the foe; the seed leaves are
    arms, the near one thrust forward, the far one flung up."""
    id_ = "sunflower_seedling"
    s = sprite(id_)
    c = s.c
    lead_tip, rear_tip, lead_w, rear_w = fr
    roots = c.leaf((32, 54), (22, 55.6), 6, power=0.6) | c.leaf((34, 54), (44, 55.6), 6, power=0.6)
    s.add(roots, tones=(0, 1, 1), flat=True)
    fk.pose(s, 1.0, 16, 33, 55)
    rear = c.leaf((29, 39), rear_tip, rear_w, bend=-2.0, power=0.6, tip=0.8, base=1.2)
    s.add(rear, tones=(0, 1, 2), shade=(1, 1), close=1, band=(1, 2))
    stem = c.curve([(33, 55.6), (35, 49), (32, 42), (27, 38)], 7.0, 5.6)
    s.add(stem, tones=(0, 2, 3), shade=(2, 0), band=(1, 2))
    true1 = c.leaf((28, 38), (34, 30), 6, power=0.7, tip=1.5)
    s.add(true1, tones=(1, 2, 2), shade=(1, 1))
    lead = c.leaf((27, 41), lead_tip, lead_w, bend=2.2, power=0.6, tip=0.75, base=1.2)
    s.add(lead, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    hull = c.leaf((29, 38), (22, 14), 14, power=0.62, tip=1.5, base=0.75)
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    # the seed's white stripes (a real sunflower seed: black with pale stripes)
    from scipy import ndimage
    inner = ndimage.binary_erosion(hull, iterations=1)
    for off in (-2.2, 2.0):
        t0, t1 = (0.16, 0.86)
        for t in np.linspace(t0, t1, 60):
            x, y = fk.mi(s, 29 + (22 - 29) * t + off * 0.96, 38 + (14 - 38) * t + off * 0.29)
            if inner[y, x] and s.t[y, x] == 0:
                s.px([(x, y)], 3)
    # a light midrib on the lead seed leaf
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    veins(s, (27, 41), lead_tip, bend=2.2, n=0, tone=1, over=(2,), map_=mp)
    for x in range(25, 32):
        ys = np.nonzero(s.t[:, x] >= 0)[0]
        if len(ys) and s.t[ys.max(), x] == 0 and s.t[ys.max() - 1, x] > 0:
            s.px([(x, ys.max() - 1)], 0)
    return idx(s)


SEED_FRAMES = [
    # lead tip, rear tip, lead width, rear width
    ((8, 29), (45, 22), 15, 12),     # 0 rest: lead arm thrust, rear arm up
    ((19, 22), (37, 15), 10, 9),     # 1 clasped round the hull (shy, closed)
    ((12, 25), (42, 18), 13, 11),    # 2 opening
    ((5, 34), (49, 27), 16, 13),     # 3 flung wide
    ((8, 28), (45, 21), 15, 12),     # 4 rest, arms a hair higher (idle breath)
]
SEED_BOX = [(0, 8, 56, 50)]
SEED_ANIM = {
    "intro": [[1, 16], [2, 4], [3, 12], [2, 4], [0, 8], [4, 5], [0, 1]],
    "idle": [[0, 110], [4, 14]],
}


# =========================================================================== bud

def bud_front(fr):
    """LUNGING. The bud nods hard at the foe on a crooked neck: a spiked fist
    of bracts, yellow rays cracking out of its front; the near heart leaf
    thrust forward, the far one flung back."""
    id_ = "sunflower_bud"
    s = sprite(id_)
    c = s.c
    swell, crack, glint = fr
    feet = c.leaf((35, 54), (25, 55.6), 6, power=0.6) | c.leaf((37, 54), (48, 55.6), 6, power=0.6)
    s.add(feet, tones=(0, 1, 1), flat=True)
    fk.pose(s, 1.0, 10, 36, 55)
    hx, hy = 20, 24
    rear = heart(c, (36, 34), (51, 22), 11, bend=-2.0)
    s.add(rear, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    stem = c.curve([(36, 56.5), (39, 44), (35, 33), (hx + 8, hy + 2)], 6.5, 5.0)
    s.add(stem, tones=(0, 1, 2), shade=(2, 0), band=(1, 2))
    k = 1.0 + 0.09 * swell
    bracts = star(c, hx + 1, hy, 11, 8.0 * k, 16.0 * k, sx=0.9, sy=0.95, rot=-12)
    s.add(bracts, tones=(0, 1, 1), shade=(2, 2), close=1, line="black")
    bud = c.ellipse(hx + 3, hy, 7.5 * k, 8.5 * k, -20)
    s.add(bud, tones=(0, 1, 2), shade=(2, 2), band=(1, 3, c.Y < hy), line="black")
    if crack > 0:   # rays bursting out of the foe-side seam, over the bud's face
        L = (4.0 + 9.0 * crack) * k
        for ang in (-150, -172, 166, 146):
            a = np.radians(ang)
            p0 = (hx - 1, hy + 0.5)
            p1 = (p0[0] + np.cos(a) * L, p0[1] + np.sin(a) * L * 1.1)
            ray = c.leaf(p0, p1, 4.5 + 1.0 * crack, power=0.6, tip=1.6, base=0.8)
            s.add(ray, tones=(1, 2, 3), shade=(1, 1), band=(1, 2, c.Y < hy) if ang == -150 and crack > 0.7 else None,
                  line="black")
    lead = heart(c, (33, 42), (5, 40), 15, bend=2.0)
    s.add(lead, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    s.render()
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    veins(s, (33, 42), (5, 40), bend=2.0, n=0, tone=2, over=(1,), map_=mp)
    veins(s, (36, 34), (51, 22), bend=-2.0, n=0, tone=2, over=(1,), map_=mp)
    # bract chevrons on the bud dome
    for (x0, y0) in ((hx + 4, hy + 1), (hx + 7, hy - 3), (hx + 3, hy + 5), (hx + 8, hy + 3)):
        x0, y0 = fk.mi(s, x0, y0)
        s.px([(x0 - 1, y0 - 1), (x0, y0), (x0 + 1, y0 - 1)], 0)
    gx, gy = fk.mi(s, hx + 0.5, hy - 5.5 * k)
    s.px([(gx, gy), (gx + 1, gy), (gx, gy + 1)], 3)
    if glint:
        gx, gy = fk.mi(s, hx - 5 - 3 * crack, hy - 2)
        s.px([(gx, gy), (gx - 1, gy), (gx + 1, gy), (gx, gy - 1), (gx, gy + 1)], 3)
    for x in range(26, 33):
        ys = np.nonzero(s.t[:, x] >= 0)[0]
        if len(ys) and s.t[ys.max(), x] == 0 and s.t[ys.max() - 1, x] > 0:
            s.px([(x, ys.max() - 1)], 0)
    return idx(s)


BUD_FRAMES = [
    # swell, crack, glint
    (0.0, 0.45, 0),   # 0 rest: a sliver of yellow showing at the seam
    (-0.6, 0.0, 0),   # 1 squeezed shut (anticipation)
    (0.8, 0.0, 0),    # 2 swollen
    (0.8, 1.0, 1),    # 3 CRACK: the rays burst out, a glint
    (0.4, 0.6, 0),    # 4 easing back
]
BUD_BOX = [(0, 4, 40, 44)]
BUD_ANIM = {
    "intro": [[1, 14], [2, 10], [1, 4], [2, 6], [3, 16], [4, 6], [0, 1]],
    "idle": [[0, 130], [4, 10]],
}


# =========================================================================== backs

def seedling_back():
    """From behind and above: the seed leaves spread like arms (the near one
    raised on the right), the striped hull tipped toward the foe."""
    id_ = "sunflower_seedling"
    s = sprite(id_, 48, crop=True)
    c = s.c
    fk.zoom(s, 1.4, 26, 14)
    stem = c.curve([(20, 48), (20, 38), (23, 28)], 7.0, 5.6)
    cotL = c.leaf((21, 29), (1, 20), 15, bend=2.0, power=0.6, tip=0.75, base=1.3)
    cotR = c.leaf((25, 28), (47, 12), 18, bend=-2.0, power=0.6, tip=0.75, base=1.3)
    true1 = c.leaf((22.5, 28), (19, 17), 8, power=0.7, tip=1.5)
    true2 = c.leaf((24, 28), (29, 17), 8, power=0.7, tip=1.5)
    hull = c.leaf((24, 22), (35, 8), 11, power=0.6, tip=1.7, base=0.6)
    s.add(stem, tones=(0, 2, 2), shade=(3, 0))
    s.add(cotL, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(true1, tones=(1, 2, 2), shade=(2, 2))
    s.add(true2, tones=(0, 1, 1), shade=(2, 2))
    s.add(cotR, tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
    s.add(hull, tones=(0, 0, 0), flat=True)
    s.render()
    from scipy import ndimage
    inner = ndimage.binary_erosion(hull, iterations=1)
    for off in (-1.6, 1.8):
        for t in np.linspace(0.15, 0.85, 50):
            x, y = fk.mi(s, 24 + 11 * t + off * 0.79, 22 - 14 * t + off * 0.62)
            if 0 <= x < 48 and 0 <= y < 48 and inner[y, x] and s.t[y, x] == 0:
                s.px([(x, y)], 3)
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    veins(s, (25, 28), (47, 12), bend=-2.0, n=0, tone=1, over=(2,), map_=mp)
    veins(s, (21, 29), (1, 20), bend=2.0, n=0, tone=1, over=(2,), map_=mp)
    return idx(s)


def bud_back():
    """The bud from behind: the star of bracts with yellow peeping round its
    far rim, nodding toward the foe (top right); the neck runs up into it."""
    id_ = "sunflower_bud"
    s = sprite(id_, 48, crop=True)
    c = s.c
    fk.zoom(s, 1.3, 26, 18)
    hx, hy = 27, 17
    lfL = heart(c, (18, 38), (0, 30), 15, bend=2.0)
    lfR = heart(c, (20, 32), (47, 30), 15, bend=-2.0)
    s.add(lfL, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    s.add(star(c, hx + 2, hy - 2, 9, 9.0, 14.5, sx=1.0, sy=0.85, rot=-80) & (c.Y < hy - 3),
          tones=(1, 2, 3), shade=(1, 1), band=(1, 2))
    s.add(star(c, hx, hy, 11, 8.0, 14.5, sx=1.0, sy=0.9, rot=-60), tones=(0, 1, 1), shade=(2, 2), close=1)
    s.add(star(c, hx - 0.5, hy + 0.5, 8, 4.5, 9.5, sx=1.0, sy=0.9, rot=-40), tones=(0, 1, 2), shade=(1, 1),
          band=(1, 2), line="black")
    s.add(lfR, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    stem = c.curve([(17, 48), (16, 37), (20, 27), (hx - 1, hy + 2)], 7.0, 5.0)
    s.add(stem, tones=(0, 1, 2), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    veins(s, (20, 32), (47, 30), bend=-2.0, n=0, tone=2, over=(1,), map_=mp)
    veins(s, (18, 38), (0, 30), bend=2.0, n=0, tone=2, over=(1,), map_=mp)
    gx, gy = fk.mi(s, hx - 3, hy - 4)
    s.px([(gx, gy), (gx + 1, gy), (gx, gy + 1)], 3)
    return idx(s)


def sun_back():
    """The back of the great head, from behind and below: the bract star
    ringed by the backs of the yellow petals, leaning to the top right; the
    thick neck runs up into its centre; leaves raised."""
    id_ = "sunflower"
    s = sprite(id_, 48, crop=True)
    c = s.c
    fk.zoom(s, 1.06, 24, 28)
    hx, hy = 26, 18
    lfL = heart(c, (17, 40), (0, 32), 15, bend=2.0)
    lfR = heart(c, (20, 36), (47, 40), 14, bend=-2.0)
    s.add(lfL, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    lit = (c.X < hx + 4) & (c.Y < hy + 2)
    for j in range(16):
        a = np.radians(5 + 360 * j / 16)
        p0 = (hx + np.cos(a) * 9, hy + np.sin(a) * 8)
        p1 = (hx + np.cos(a) * 22, hy + np.sin(a) * 18)
        top = np.sin(a) < 0.3 and np.cos(a) < 0.5
        s.add(c.leaf(p0, p1, 8, power=0.6, tip=1.6, base=0.8), tones=(2, 2, 3), flat=not top, line="black",
              shade=(1, 1) if top else None, band=(1, 2, lit) if top else None)
    s.add(star(c, hx, hy, 15, 10.5, 14.0, sx=1.0, sy=0.88, rot=-8), tones=(0, 1, 1), shade=(2, 2), close=1,
          line="black")
    s.add(star(c, hx - 0.5, hy + 0.5, 11, 6.5, 10.0, sx=1.0, sy=0.88, rot=10), tones=(0, 1, 2), shade=(1, 1),
          band=(1, 2), line="black")
    s.add(lfR, tones=(0, 1, 3), shade=(1, 1), close=1, band=(1, 2))
    stem = c.curve([(16, 48), (15, 38), (19, 28), (hx - 1, hy + 2)], 9.0, 7.0)
    s.add(stem, tones=(0, 1, 2), shade=(3, 0), band=(1, 2), line="black")
    s.render()
    mp = lambda q: fk.m(s, *q)  # noqa: E731
    veins(s, (20, 36), (47, 40), bend=-2.0, n=0, tone=2, over=(1,), map_=mp)
    veins(s, (17, 40), (0, 32), bend=2.0, n=0, tone=2, over=(1,), map_=mp)
    return idx(s)


# =========================================================================== icons

class Ico:
    """16x16 icon built straight in palette indexes: fills are layered, then a
    full 1px black ring goes round the silhouette (CREATURES.md §7: no selout)."""

    def __init__(self):
        from px import Canvas
        self.c = Canvas(16, 16)
        self.t = np.full((16, 16), T, np.uint8)

    def fill(self, mask, tone):
        self.t[mask] = tone
        return self

    def seam(self, mask):
        """Black 1px line round `mask` where it meets other fills (an internal line)."""
        from scipy import ndimage
        edge = mask & ~ndimage.binary_erosion(mask, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool))
        self.t[edge & (self.t != T)] = 0
        return self

    def px(self, pts, tone):
        for x, y in pts:
            if 0 <= x < 16 and 0 <= y < 16:
                self.t[y, x] = tone
        return self

    def done(self):
        sil = self.t != T
        p = np.pad(sil, 1)
        ring = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        ring &= ~sil
        out = self.t.copy()
        out[ring] = 0
        return out


def hop(a):
    """Icon frame 2: the whole icon 1px up."""
    out = np.full_like(a, T)
    out[:-1] = a[1:]
    return out


def _feet(i, c, x0=10.2):
    i.fill(c.leaf((x0, 14.2), (x0 - 4.5, 14.6), 2.2, power=0.6) | c.leaf((x0 + 0.5, 14.2), (x0 + 4, 14.6), 2.2,
                                                                       power=0.6), 1)


def seedling_icon():
    i = Ico()
    c = i.c
    _feet(i, c)
    i.fill(c.curve([(10.5, 14.5), (11, 11.5), (9, 8.5)], 2.4, 2.0), 2)
    i.fill(c.leaf((9.5, 8.5), (14.5, 5.0), 4.2, power=0.6), 1)
    i.fill(c.leaf((9, 9.5), (1.6, 8.0), 5.0, power=0.6), 2)
    hull = c.leaf((9.6, 8.0), (5.6, 1.4), 4.6, power=0.6)
    i.fill(hull, 0)
    i.px([(6, 2), (7, 3), (7, 4), (8, 5)], 3)  # the seed's stripe
    i.px([(3, 7), (4, 7)], 3)                  # glint on the lead seed leaf
    a = i.done()
    return [a, hop(a)]


def bud_icon():
    i = Ico()
    c = i.c
    _feet(i, c)
    i.fill(c.curve([(11, 14.5), (12, 11), (10, 8), (8, 7)], 2.4, 2.0), 1)
    i.fill(c.leaf((11, 9.5), (14.6, 5.5), 3.6), 1)
    i.fill(star(c, 6.8, 7.0, 8, 4.0, 6.0, sx=0.95, rot=10), 1)
    bud = c.ellipse(7.2, 7, 3.6, 3.8, -20)
    i.fill(bud, 1).seam(bud)
    i.fill(c.ellipse(6.6, 6.0, 2.2, 1.8) & bud, 2)
    i.px([(6, 5), (6, 4), (7, 4), (2, 9)], 3)
    i.px([(3, 8), (4, 8), (3, 9)], 2)          # the sliver of yellow at the seam
    i.px([(2, 8)], 3)
    i.fill(c.leaf((10.5, 12.0), (3.0, 12.6), 3.6, bend=0.6), 1)
    i.px([(4, 11), (5, 11)], 2)
    a = i.done()
    return [a, hop(a)]


def sun_icon():
    i = Ico()
    c = i.c
    _feet(i, c, 10.6)
    i.fill(c.curve([(11, 14.5), (12.5, 11), (10, 8)], 2.8, 2.4), 1)
    i.fill(c.leaf((11.5, 11.0), (14.8, 8.2), 3.2), 1)
    petals = star(c, 6.6, 6.6, 9, 4.4, 6.0, sx=0.85, rot=-8)
    i.fill(petals, 2)
    disc = c.ellipse(6.2, 6.6, 2.5, 3.3, 12)
    i.fill(disc, 0)
    i.px([(5, 5), (6, 6), (5, 7), (7, 5)], 1)
    i.px([(3, 3), (4, 2), (2, 5), (2, 6), (3, 4)], 3)
    a = i.done()
    return [a, hop(a)]


def preview(id_, frames, k=4, ids=None):
    from PIL import Image
    from common import to_rgba
    ids = ids or [id_] * len(frames)
    ims = [Image.fromarray(to_rgba(f, palette(i)), "RGBA").resize((f.shape[1] * k, f.shape[0] * k), Image.NEAREST)
           for f, i in zip(frames, ids)]
    W = sum(i.width + 6 for i in ims)
    sheet = Image.new("RGB", (W, max(i.height for i in ims)), (232, 232, 216))
    x = 0
    for i in ims:
        sheet.paste(i, (x, 0), i)
        x += i.width + 6
    out = Path("/private/tmp/claude-502/-Users-kevinramdath-projects-research/"
               "f9b53c5b-a672-48fc-9b70-e20f796e2670/scratchpad") / f"pv_{id_}.png"
    sheet.save(out)
    return out


NOTES = {
    "sunflower_seedling": (
        "Crystal-rule pilot. LUNGING, as the base. Index 1 leaf green, index 2 a lime-yellow (the line's "
        "yellow, still unripe); the seed hull is the shared black with two white stripes, which is what a "
        "real sunflower seed looks like, so the shared black and white ARE the species' signature here. "
        "Intro: the seed leaves start clasped round the hull, open, fling wide, settle (with one rebound); "
        "only the seed leaves move. Idle: the arms lift 1px. Sport: 'Italian White' (cream over blue-green)."),
    "sunflower_bud": (
        "Crystal-rule pilot. LUNGING, as the base. Index 1 leaf green (bracts, leaves, stem), index 2 gold. "
        "Intro: the bud squeezes shut, swells, squeezes, swells and CRACKS: yellow rays burst out "
        "of the foe-side seam with a white glint, then ease back to a sliver of yellow (frame 0). Only the head "
        "moves. Idle: the sliver eases open a little. Sport: 'Italian White' (cream over blue-green)."),
    "sunflower": (
        "Crystal-rule pilot. LOOMING, as the base. Index 2 sunflower yellow (flat rays, black between them, white "
        "rims on the lit side), index 1 leaf green (leaves, stem, the bracts behind the rays, the seed lattice). "
        "The disc is the shared black with a green seed lattice and a ring of yellow open florets: the base's "
        "brown has no slot. Intro: the head starts nodding and turned away, lifts and turns to face the foe, the "
        "rays flare past rest and the disc GLEAMS (a 4-point star), then settles. Only the head and neck move. "
        "Idle: the gleam twinkles every ~2.5 s. Learned: a deep gold/olive index 1 (as first briefed) turned the "
        "whole line to mud next to the oak and flytrap; a black-ribbed leaf reads as a mouth, so leaves get a "
        "yellow midrib; a black disc with only a white glint reads as an EYE, so it needs the lattice. Sport: "
        "'Italian White' (cream rays, blue-green leaves, the disc stays near-black)."),
}


def build():
    data = {
        "sunflower_seedling": (lock([seedling_front(f) for f in SEED_FRAMES], SEED_BOX), seedling_back(),
                               seedling_icon(), SEED_ANIM, SEED_BOX),
        "sunflower_bud": (lock([bud_front(f) for f in BUD_FRAMES], BUD_BOX), bud_back(), bud_icon(),
                          BUD_ANIM, BUD_BOX),
        "sunflower": (lock([sun_front(f) for f in SUN_FRAMES], SUN_BOX), sun_back(), sun_icon(),
                      SUN_ANIM, SUN_BOX),
    }
    errors = 0
    for id_, (front, back, icon, anim, box) in data.items():
        probs = write_species(id_, palette=palette(id_), sport=sport(id_), front=front, back=[back], icon=icon,
                              anim=anim, moving=box, notes=NOTES[id_], tool=TOOL)
        errors += sum(1 for lvl, _ in probs if lvl == "error")
    print("review:", review_sheet(IDS, Path(__file__).resolve().parents[1] / "review" / "crystal_sunflower.png"))
    for id_ in IDS:
        intro_strip(id_)
    return errors


if __name__ == "__main__":
    if "--pal" in sys.argv:
        from PIL import Image
        outs = []
        for c1 in sys.argv[sys.argv.index("--pal") + 1:]:
            PAL["sunflower"] = (c1, PAL["sunflower"][1])
            outs.append(Image.open(preview("sunflower", [sun_front(SUN_FRAMES[0])], 3)))
        W = sum(o.width for o in outs)
        sh = Image.new("RGB", (W, outs[0].height))
        x = 0
        for o in outs:
            sh.paste(o, (x, 0))
            x += o.width
        sh.save(preview("sunflower", [sun_front(SUN_FRAMES[0])]).with_name("pal.png"))
    elif "--disc" in sys.argv:
        fr = []
        for st in ("ring", "lattice", "both"):
            DISC = st
            fr.append(sun_front(SUN_FRAMES[0]))
        print(preview("sunflower", fr, 6))
    elif "--leaf" in sys.argv:
        fr = []
        for st in ("plain", "lrib"):
            LEAF = st
            fr.append(sun_front(SUN_FRAMES[0]))
        print(preview("sunflower", fr))
    elif "--preview" in sys.argv:
        print(preview("sunflower", lock([sun_front(f) for f in SUN_FRAMES], SUN_BOX)))
        print(preview("sunflower_seedling", lock([seedling_front(f) for f in SEED_FRAMES], SEED_BOX)))
        print(preview("sunflower_bud", lock([bud_front(f) for f in BUD_FRAMES], BUD_BOX)))
        print(preview("backs", [seedling_back(), bud_back(), sun_back()], ids=IDS))
        ic = seedling_icon() + bud_icon() + sun_icon()
        print(preview("icons", [np.pad(i, 4, constant_values=T) for i in ic], 8,
                      ids=[i for i in IDS for _ in (0, 1)]))
    else:
        sys.exit(1 if build() else 0)
