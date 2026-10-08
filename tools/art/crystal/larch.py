"""Original Crystal-rule Larix decidua (European larch): larch_seedling -> larch.

larch_seedling (teen size class, stage 1 of 2), BRACED: a short woody stem
on a soil mound with a low lead twig held across the front like a shield and
a smaller rear twig up behind. Every twig carries soft rosettes: starburst
tufts of short needles on little spurs. One rosy-red larch rose (the young
female cone) stands upright on the leader: the line's accent.
larch (adult), LOOMING: a tall narrow cone leaning over the foe, built from
six tiers of solid autumn-gold drapes (curtains of drooping branchlets) that
widen toward the bottom. Each tier's blunt bough tips sweep up past the tier
above; the dark slot is only the shadow under each hem, a few white sheen
pixels light the left of each drape, and the trunk shows only at the foot.
Two small upright cones, the red larch rose upper-left toward the foe, and
fallen gold needles heaped at the foot (the signature NEEDLE DROP).

Intro: the tiers dip, lift and shake while a shower of needles falls, then
settle. Trunk, roots and ground stay registered.
Two tones: fresh green (seedling) / autumn gold (adult) over a rosy bark
red-brown, which is also the larch rose and the cones (dark slot).
Sport: the soft blue-green needles of the related Japanese larch (Larix
kaempferi), see docs/SPORTS.md. Palette swap only.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, hop, moving_boxes, rim_white, tones

TOOL = "tools/art/crystal/larch.py"
IDS = ["larch_seedling", "larch"]
DARK = "#a04038"
PALS = {
    "larch_seedling": [BLACK, DARK, "#88c040", WHITE],
    "larch": [BLACK, DARK, "#e0a830", WHITE],
}
SPORT = [BLACK, "#804858", "#80b0a0", WHITE]
LIFT = [0.0, -1.0, 3.0, 1.5, -0.5]          # bough swing per front frame (+ = up)
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 10], [0, 8]]}


# ------------------------------------------------------------- parts ------

def wood(s, ctrl, width, shine=True, n=60):
    """A woody stem or twig in bark red-brown, a lengthwise glint on its lit side."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=1, k=0, line=0)
    w0 = width[0] if isinstance(width, tuple) else width
    if shine and w0 >= 3:
        lit = [(x - w0 * 0.25, y) for x, y in path[int(n * 0.15):int(n * 0.7)]]
        s.decal(s.line1(lit), 3, on=[pid])
    return pid


def _ray(cx, cy, a, r0, r1, sq=1.0):
    return [(cx + r0 * math.cos(a), cy + r0 * math.sin(a) * sq),
            (cx + r1 * math.cos(a), cy + r1 * math.sin(a) * sq)]


def tuft(s, cx, cy, r, a0=0.0, sq=1.0, notch=0.6, n=None, white=2):
    """A soft rosette: a starburst of short needles on a spur.

    The silhouette is a many-pointed star, one point per needle bundle.
    Thin radial gaps split the bundles around the rim (bark tone on the lit
    side, black in the shade) and stop short of a solid light hub; a clean
    bark-tone crescent shades the bottom-right and one or two thin white
    needles catch the light top-left. No dark spur dot (it would read as
    an eye).
    """
    n = n or max(6, round(1.35 * r + 1))
    pts = []
    for i in range(2 * n):
        a = a0 + i * math.pi / n
        rr = r if i % 2 == 0 else r * notch
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * sq))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    dx = xx + 0.5 - cx - getattr(s, "ox", 0)
    dy = (yy + 0.5 - cy) / sq
    rad = np.hypot(dx, dy)
    ph = ((np.arctan2(dy, dx) - a0) / (2 * math.pi / n)) % 1.0   # 0 at a point, 0.5 at a notch
    lit = dx * 0.6 + dy * 0.8
    gap = (np.abs(ph - 0.5) < 0.17) & (rad > r * 0.42)
    s.decal(m & (lit > r * 0.45), 1, on=[pid])
    s.decal(m & gap & (lit <= r * 0.09), 1, on=[pid])
    s.decal(m & gap & (lit > r * 0.09), 0, on=[pid])
    order = sorted(range(n), key=lambda i: math.cos(a0 + 2 * math.pi * i / n) * 0.6
                   + math.sin(a0 + 2 * math.pi * i / n) * 0.8)
    for k, i in enumerate(order[:(white + (r >= 6.5)) if r >= 5 else 1]):
        a = a0 + 2 * math.pi * i / n
        s.decal(s.line1(_ray(cx + 0.5, cy + 0.5, a, r * (0.3 + 0.15 * k), r * 0.85, sq)), 3, on=[pid])
    return pid


def rose(s, x, y, size=1.0):
    """The larch rose: a small upright cone of rounded rosy scales, packed
    like the petals of a tiny rose. Back scales first, then the front ones;
    black seams part them and each scale's lit rim is white."""
    for dx, dy, rx, ry in ((0, -2.3, 1.7, 1.5), (-1.7, -0.6, 1.6, 1.9), (1.7, -0.6, 1.6, 1.9),
                           (0, 1.2, 2.3, 1.7)):
        m = s.ellipse(x + dx * size, y + dy * size, rx * size, ry * size)
        pid = s.part(m, base=1, k=0, line=0)
        rim_white(s, m, pid, 0.35)


def cone(s, x, y, size=1.0):
    """A small upright ovoid cone: bark-tone scales, white shine, black tip."""
    m = s.ellipse(x, y, 1.8 * size, 2.8 * size)
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(x - 0.8 * size, y - 1.6 * size), (x - 0.8 * size, y + 0.4 * size)]), 3, on=[pid])
    return pid


def needle(s, x, y, tilt=1):
    """A falling needle: a short slanted gold bar (2px thick, so its black
    ring has no 1px tip)."""
    m = s.poly([(x, y), (x + 2, y), (x + 2 + 1.6 * tilt, y + 3), (x + 1.6 * tilt, y + 3)])
    s.part(m, base=2, k=0, line=0)


def soil(s, left, right, litter=False):
    top = 51.5 if litter else 52.5
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 9, top), (right - 9, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 5, top + 2.5), (left + 10, top + 1.5)]), 3, on=[pid])
    if litter:
        # A drift of fallen gold needles: short slanted strokes heaped on the soil.
        for i, x in enumerate(range(left + 2, right - 2, 3)):
            y = 52.5 + (i % 2) * 1.0
            st = s.stroke([(x, y + 1.5), (x + 2.5, y - 1)], 1.6, cap=True)
            s.part(st, base=2, k=0, line=0)


# ------------------------------------------------------------ seedling ----

def seedling(s, lift=0.0):
    s.ox = 2
    soil(s, 15, 45)
    wood(s, [(30, 53), (26, 52), (22, 55)], (3, 2), shine=False)        # front root
    wood(s, [(32, 53), (36, 52), (40, 55)], (3, 2), shine=False)        # back root
    wood(s, [(31, 54), (32, 45), (30, 37), (26, 29)], (4.5, 2.5))
    tuft(s, 38, 45, 5, a0=0.1)                                           # low spur behind
    # the rear twig (small, high, behind) and its rosette
    with s.rotated(-lift * 3.0, 31, 37):
        wood(s, [(31, 37), (36, 34), (40, 30), (43, 27)], (2.0, 1.4), shine=False)
        tuft(s, 43.5, 26, 5.5, a0=0.5)
    # the head: rosettes clustered on the leader, the larch rose upright on top
    with s.rotated(lift * 1.5, 27, 30):
        wood(s, [(26, 30), (24, 25), (22, 20), (20, 16)], (2.2, 1.6), shine=False)
        tuft(s, 33, 27, 5.5, a0=0.4)
        tuft(s, 23, 22, 7, a0=0.0)
        rose(s, 18, 13, 1.25)
    # the lead twig held across the front like a shield, its big rosettes
    with s.rotated(lift * 3.0, 30, 42):
        wood(s, [(30, 42), (24, 40), (17, 37), (12, 35)], (2.4, 1.6), shine=False)
        tuft(s, 21, 40, 5.5, a0=0.3)
        tuft(s, 10.5, 33, 6.5, a0=0.1)


# --------------------------------------------------------------- adult ----

# Tiers of drooping branchlet curtains, top to bottom, as (top, hem) fractions
# of the cone's height. Each overlaps the one below so the trunk only shows
# at the foot.
TIERS = [(0.0, 0.22), (0.15, 0.39), (0.32, 0.56), (0.49, 0.73), (0.66, 0.89), (0.82, 1.0)]


class Cone:
    """The crown's envelope: a narrow cone from `apex` to the hem line at
    `base`, its axis leaning toward the foe."""

    def __init__(self, apex, base, half):
        self.apex, self.base, self.half = apex, base, half

    def y(self, f):
        return self.apex[1] + (self.base[1] - self.apex[1]) * f

    def c(self, f):
        return self.apex[0] + (self.base[0] - self.apex[0]) * f

    def hw(self, f):
        return 1.2 + self.half * max(0.0, f) ** 0.88


def drape(s, env, f0, f1, lift=0.0, tip=3.0, scallop=9.0, top=False):
    """One tier: a solid gold drape of drooping branchlets.

    The top corners are blunt upswept bough tips poking out past the tier
    above (the top tier is the spire instead); the hem is a few long rounded
    scallops parted by short black strand notches; a small white sheen sits
    on the lit left of the drape. Returns (mask, part id, left tip, right tip)."""
    y0, y1 = env.y(f0), env.y(f1)
    c0, c1 = env.c(f0), env.c(f1)
    w0, w1 = env.hw(f0 + 0.08), env.hw(f1)
    up = tip + lift
    lt = (c0 - w0 - 3.5, y0 + 2.5 - up)
    rt = (c0 + w0 + 3.5, y0 + 2.5 - up * 0.8)
    if top:
        pts = [(c0 - 1.2, y0), (c0 + 1.2, y0)]
    else:
        pts = [(c0 - w0 * 0.4, y0), (c0 + w0 * 0.4, y0),
               (rt[0] - 2.5, rt[1] + 1.5), (rt[0] - 0.5, rt[1]), (rt[0] + 1.0, rt[1] + 0.3),
               (rt[0] + 1.2, rt[1] + 2.0)]
    n = max(2, round(2 * w1 / scallop))
    xr, xl = c1 + w1 + 1.0, c1 - w1 - 1.0
    hem, notches = [], []
    for k in range(n):
        a, b = xr - (xr - xl) * k / n, xr - (xr - xl) * (k + 1) / n
        for u in np.linspace(0, 1, 9):
            x = a + (b - a) * u
            edge = abs(x - c1) / (w1 + 1)
            droop = 2.8 * math.sin(math.pi * u) ** 0.7 - lift * 0.6 * edge
            hem.append((x, y1 - 2.0 + droop))
        if k < n - 1:
            notches.append((b, y1 - 2.0))
    pts += hem
    if not top:
        pts += [(lt[0] - 1.2, lt[1] + 2.0), (lt[0] - 1.0, lt[1] + 0.3), (lt[0] + 0.5, lt[1]),
                (lt[0] + 2.5, lt[1] + 1.5)]
    m = s.poly(pts)
    pid = s.part(m, base=2, k=0, line=0)
    for x, y in notches:
        s.decal(s.line1([(x + 0.5, y - 2.0), (x + 0.5, y + 1.5)]), 0, on=[pid])
    # sheen: a small white highlight on the lit left of the drape, below the
    # hem of the tier above (never along an edge)
    alt = round(f0 * 6) % 2
    x = c1 - w1 * ((0.72 if alt else 0.5) if not top else 0.2) + 0.5
    ya = y0 + (y1 - y0) * ((0.5 if alt else 0.42) if not top else 0.45)
    s.decal(s.poly([(x, ya), (x + 1.8, ya), (x + 1.3, ya + 4.5), (x - 0.5, ya + 4.5)]), 3, on=[pid])
    if not top:
        x2 = x + (4 if alt else -3.5)
        s.decal(s.line1([(x2 + 0.5, ya + 1.5), (x2 + 0.3, ya + 4.5)]), 3, on=[pid])
    return m, pid, lt, rt


def crown(s, env, lift=0.0, tiers=TIERS, rose_at=1, rose_size=0.9, cones=(2, 3), shadow=True, side=-1):
    """Draw the tiers bottom first, so each hem overlaps the tier below and
    casts its shadow (the dark slot) onto it."""
    from _d_kit import shift
    drawn, tips = [], {}
    for i in range(len(tiers) - 1, -1, -1):
        f0, f1 = tiers[i]
        m, pid, lt, rt = drape(s, env, f0, f1, lift * (0.4 + 0.6 * f1), top=(i == 0))
        tips[i] = (lt, rt)
        if shadow and drawn:
            band = (shift(m, -1, -1) | shift(m, -1, -2)) & ~m
            s.decal(band, 1, on=drawn)
        drawn.append(pid)
    for i in cones:
        x, y = tips[i][1 if side < 0 else 0]
        cone(s, x + side * 2.5, y - 1.0, 0.7)
    x, y = tips[rose_at][0 if side < 0 else 1]
    rose(s, x - side * 1.0, y - 2.6 * rose_size, rose_size)
    return tips


FRONT_CONE = Cone((20.5, 1.5), (31.0, 47.0), 14.5)
BACK_CONE = Cone((35.0, 1.0), (21.0, 50.0), 22.0)
BACK_TIERS = [(0.0, 0.22), (0.14, 0.40), (0.32, 0.60), (0.52, 0.80), (0.72, 1.0)]


def adult(s, lift=0.0):
    s.ox = 2
    soil(s, 10, 52, litter=True)
    wood(s, [(30, 52), (26, 52), (23, 55)], (3.5, 2), shine=False)
    wood(s, [(32, 52), (36, 52), (40, 55)], (3.5, 2), shine=False)
    wood(s, [(31.5, 55), (31, 44), (28, 30)], (4.5, 3.0))
    crown(s, FRONT_CONE, lift, rose_size=0.75)


# ------------------------------------------------------------- frames -----

NEEDLES = {
    2: [(9, 20), (45, 14), (6, 30)],
    3: [(7, 27), (48, 22), (4, 37), (50, 34)],
    4: [(5, 36), (51, 30), (3, 45), (52, 42)],
}


def front(sid, frame=0):
    s = Spr(56, 56, tuple(PALS[sid][1:]))
    lift = LIFT[frame]
    if sid == IDS[0]:
        seedling(s, lift)
        fall = {2: [(8, 24), (45, 18)], 3: [(6, 31), (46, 33)], 4: [(5, 43), (47, 41)]}
    else:
        adult(s, lift)
        fall = NEEDLES
    for x, y in fall.get(frame, []):
        needle(s, x, y)
    return blunt(tones(s))


def no_dots(t):
    """No enclosed dark dots: a small dark (black or bark) island wholly
    ringed by light pixels takes the light tone (it would read as an eye)."""
    t = t.copy()
    h, w = t.shape
    dark = (t == 0) | (t == 1)
    seen = np.zeros_like(dark)
    for y0, x0 in zip(*np.nonzero(dark)):
        if seen[y0, x0]:
            continue
        comp, stack = [], [(y0, x0)]
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and dark[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        if len(comp) > 6:
            continue
        ring = {(y + dy, x + dx) for y, x in comp for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - set(comp)
        if all(0 <= y < h and 0 <= x < w and t[y, x] in (2, 3) for y, x in ring):
            for y, x in comp:
                t[y, x] = 2
    return t


def blunt(t):
    """No 1px silhouette tips: a lone outline pixel poking out gets a black
    neighbour beside it, so every needle point ends in a 2px cap."""
    t = t.copy()
    h, w = t.shape
    for _ in range(3):
        op = t != T
        p = np.pad(op, 1)
        n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        ys, xs = np.nonzero(op & (n == 1))
        if not len(xs):
            break
        for y, x in zip(ys, xs):
            vertical = (y > 0 and op[y - 1, x]) or (y < h - 1 and op[y + 1, x])
            cands = [(y, x - 1), (y, x + 1)] if vertical else [(y - 1, x), (y + 1, x)]
            for yy, xx in cands:
                if 0 <= yy < h and 0 <= xx < w and t[yy, xx] == T:
                    t[yy, xx] = 0
                    break
    return no_dots(t)


def back(sid):
    """Behind and above: the crown rises to the top-right, base cropped."""
    s = Spr(48, 48, tuple(PALS[sid][1:]))
    if sid == IDS[0]:
        wood(s, [(21, 52), (22, 38), (27, 24), (33, 13)], (7, 3))
        wood(s, [(22, 36), (14, 32), (7, 28)], (3, 2), shine=False)
        wood(s, [(25, 28), (33, 26), (40, 21)], (3, 2), shine=False)
        # rosettes seen from above: full starbursts, the biggest nearest
        for x, y, r in ((7, 25, 8), (40, 19, 8), (20, 21, 7.5), (29, 33, 8), (11, 41, 9),
                        (37, 44, 9), (27, 11, 6.5)):
            tuft(s, x, y, r, a0=x * 0.2)
        wood(s, [(32, 12), (34, 8)], 2, shine=False)
        rose(s, 35, 6, 1.6)
    else:
        # the same cone from behind and above: its tip leans to the top-right,
        # toward the foe, the near tiers big and cut off by the screen edge
        crown(s, BACK_CONE, tiers=BACK_TIERS, rose_at=1, rose_size=1.1, cones=(2,),
              side=1)
    return blunt(tones(s, open_bottom=True))


# The adult icon: a little gold cone of three drapes leaning left, each tier's
# bough tips swept up past the tier above, the shadow under each hem in the
# dark slot, a white sheen on the lit left, over a trunk foot and needles.
# (first row, [(left, right) per row], tips)
ICON_TIERS = [(1, [(6, 6), (5, 7), (4, 8), (4, 9)], False),
              (5, [(3, 9), (3, 10), (2, 10), (2, 11)], True),
              (9, [(2, 11), (1, 12), (1, 13), (2, 13)], True)]


def adult_icon():
    from _d_kit import close_outline
    t = np.full((16, 16), -1, int)
    for k, (y0, rows, tips) in enumerate(ICON_TIERS):
        for j, (l, r) in enumerate(rows):
            y = y0 + j
            t[y, l:r + 1] = 2
            if j == 0 and k:
                t[y, l + 2:r] = 1                      # the shadow under the hem above
            if j == 1 or (k == 0 and j == 2):
                t[y, l:l + 2] = 3                      # the lit sheen
            if j and y > 2:
                t[y, r] = 1                            # the shade side
        if tips:
            l, r = rows[0]
            t[y0 - 1, l - 1] = 2
            t[y0 - 1, r + 1] = 2
    t[13, 6:8] = 1                                     # the trunk
    t[14, 3:13] = 2                                    # fallen needles
    t[14, 6:8] = 1
    t = close_outline(t)
    return np.where(t >= 0, t, T).astype(np.uint8)


def icon(sid):
    if sid == IDS[1]:
        return adult_icon()
    s = Spr(16, 16, tuple(PALS[sid][1:]))
    wood(s, [(9, 16), (9, 11), (7, 6)], (2.5, 1.5), shine=False)
    tuft(s, 4.5, 9, 3.4, a0=0.2)
    tuft(s, 12, 9, 3, a0=0.6)
    rose(s, 6, 3.5, 0.75)
    return blunt(tones(s))


def render():
    out = {}
    for sid in IDS:
        fs = [front(sid, f) for f in range(len(LIFT))]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


def review_layout(art):
    """The lead's layout: each species' front, back and icon at 3x, one row."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "larch_1x.png"), (3, "larch_lead_layout.png")):
        sheet = Image.new("RGB", (256 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PALS[sid]), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / name)


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    poses = {
        "larch_seedling": "BRACED: a short woody stem on a soil mound; a low lead twig of big green "
                          "needle rosettes held across the front like a shield, a smaller rear twig "
                          "behind, and one rosy-red larch rose upright on the leader.",
        "larch": "LOOMING: a tall narrow cone leaning over the foe, tiers of solid autumn-gold "
                 "drapes of drooping branchlets with blunt upswept bough tips, small upright cones, "
                 "one red larch rose upper-left, and fallen gold needles heaped at the foot.",
    }
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PALS[sid], sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Larix decidua. " + poses[sid] +
                      " Gesture: the boughs dip, lift and shake while a shower of needles falls, "
                      "then settle; trunk, roots and ground stay fixed. Needle tone over a rosy "
                      "bark red-brown that is also the larch rose and the cones (dark slot). "
                      "Sport: the soft blue-green needles of the Japanese larch (Larix kaempferi).",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Larix decidua, "
                      "https://en.wikipedia.org/wiki/Larix_decidua . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
