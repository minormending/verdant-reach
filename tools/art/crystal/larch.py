"""Original Crystal-rule Larix decidua (European larch): larch_seedling -> larch.

larch_seedling (teen size class, stage 1 of 2), BRACED: a short woody stem
on a soil mound with a low lead twig held across the front like a shield and
a smaller rear twig up behind. Every twig carries soft rosettes: starburst
tufts of short needles on little spurs. One rosy-red larch rose (the young
female cone) stands upright on the leader: the line's accent.
larch (adult), LOOMING: a tall narrow cone leaning over the foe. Upswept
boughs carry drooping branchlets strung with autumn-gold rosettes, a few
small upright cones and the red larch rose; fallen gold needles drift at the
foot of the trunk (the signature NEEDLE DROP).

Intro: the boughs dip, lift and shake while a shower of needles falls, then
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

TRUNK = [(35, 56), (34, 42), (27, 21), (18, 1)]
# Upswept boughs, bottom to top: (trunk y, side -1 left / +1 right, reach,
# curtain depth). The foe side (left) reaches further: the cone leans over.
BOUGHS = [(45, 1, 16, 7), (43, -1, 22, 8), (37, 1, 14, 7), (34, -1, 19, 8),
          (28, 1, 12, 7), (25, -1, 16, 7), (19, 1, 9, 6), (16, -1, 12, 6),
          (11, 1, 6, 5), (8, -1, 8, 5), (4, 1, 4, 4)]


def trunk_at(y):
    path = bez(TRUNK, 200)
    return min(path, key=lambda p: abs(p[1] - y))


def spray(s, at, side, reach, depth, lift=0.0, rim=1.0):
    """One upswept bough with its curtain of drooping branchlets.

    The bough leaves the trunk level and sweeps up at the tip; under it the
    branchlets hang in a curtain whose hem is a fringe of rosette points.
    Bark-tone strands run down the curtain, the hem band is shaded and the
    bough's lit top edge takes a short white rim. Returns the bough tip.
    """
    x0, y0 = at
    x0 += side * 1.5
    rise = reach * 0.4 + lift
    tip = (x0 + side * reach, y0 - rise)
    top = bez([(x0, y0), (x0 + side * reach * 0.55, y0 + 0.3 - lift * 0.2), tip], 50)
    n = max(2, round(reach / 3.2))
    hem = []
    for i in range(2 * n + 1):
        f = 0.08 + 0.9 * i / (2 * n)
        bx, by = top[min(len(top) - 1, int(f * (len(top) - 1)))]
        d = depth * (0.55 + 0.45 * math.sin(math.pi * min(1.0, f * 1.25)))
        d = min(d, 2 + depth * (1 - f) * 1.6)
        hem.append((bx, by + d + (0.6 if i % 2 == 0 else -2.2)))
    poly = top + [(tip[0], tip[1] + 1.5)] + hem[::-1]
    m = s.poly(poly)
    pid = s.part(m, base=2, k=1, shadow=(0.3 * side, 1), sh_tone=1, line=0)
    for i in range(1, 2 * n, 2):
        hx, hy = hem[i]
        f = 0.08 + 0.9 * i / (2 * n)
        ty = top[min(len(top) - 1, int(f * (len(top) - 1)))][1]
        if hy - ty > 3:
            s.decal(s.line1([(hx + 0.5, ty + 2.5), (hx + 0.5, hy + 0.5)]), 1, on=[pid])
    up_edge = m & ~np.roll(m, 1, axis=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    ox = getattr(s, "ox", 0)
    lo, hi = sorted((x0 + ox + side * reach * 0.12, x0 + ox + side * reach * (0.7 if side < 0 else 0.4) * rim))
    s.decal(up_edge & (xx >= lo) & (xx <= hi), 3, on=[pid])
    if reach >= 12:
        # a drooping branchlet ends in a gold rosette below the hem
        hx, hy = hem[int(len(hem) * 0.62)]
        tuft(s, hx, hy + 1.5, 3.2, a0=reach * 0.7, white=1)
    return tip


def adult(s, lift=0.0):
    s.ox = 1
    soil(s, 10, 52, litter=True)
    wood(s, [(33, 52), (29, 52), (26, 55)], (3.5, 2), shine=False)
    wood(s, [(35, 52), (39, 52), (43, 55)], (3.5, 2), shine=False)
    wood(s, TRUNK, (4.5, 1.2))
    tips = {}
    for y, side, reach, depth in BOUGHS:
        tips[(y, side)] = spray(s, trunk_at(y), side, reach, depth, lift * (0.5 + reach / 22))
    for key in ((28, 1), (37, 1)):
        x, y = tips[key]
        cone(s, x - 4, y - 0.5, 0.8)
    x, y = tips[(25, -1)]
    rose(s, x + 1.5, y - 3.5, 1.1)
    tuft(s, 18, 2, 2.5)


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
        trunk = [(19, 60), (21, 40), (28, 17), (35, 3)]
        wood(s, trunk, (8, 2))
        path = bez(trunk, 200)

        def at(y):
            return min(path, key=lambda p: abs(p[1] - y))
        tips = {}
        for y, side, reach, depth in ((47, -1, 20, 11), (46, 1, 24, 11), (39, -1, 18, 10),
                                      (37, 1, 21, 10), (30, -1, 15, 9), (28, 1, 18, 9),
                                      (21, -1, 12, 8), (19, 1, 14, 8), (12, -1, 8, 6),
                                      (10, 1, 10, 6), (5, 1, 6, 5)):
            tips[(y, side)] = spray(s, at(y), side, reach, depth, rim=1.6)
        x, y = tips[(28, 1)]
        rose(s, x - 3, y - 3, 1.4)
        tuft(s, 35, 3, 3)
    return blunt(tones(s, open_bottom=True))


# The adult icon: a narrow gold cone leaning left, its edge notched into
# whorls of upswept boughs. Per row: (reach left of the trunk, reach right,
# role) where role is "top" (lit bough), "hang" (hanging strands) or "-".
ICON_ROWS = [(0, 0, "-"), (1, 1, "top"), (2, 1, "-"), (1, 1, "hang"),
             (3, 2, "top"), (4, 3, "-"), (3, 2, "hang"),
             (5, 4, "top"), (6, 5, "-"), (5, 4, "hang"),
             (7, 5, "top"), (7, 6, "-"), (6, 5, "hang")]


def adult_icon():
    from _d_kit import close_outline
    t = np.full((16, 16), -1, int)
    for y, (lw, rw, role) in enumerate(ICON_ROWS, start=1):
        c = int(round(5.5 + (y - 1) * 0.25))
        for x in range(c - lw, c + rw + 1):
            t[y, x] = 2
        if role == "hang":
            for x in range(c - lw, c + rw + 1):
                if (x - c) % 3:
                    t[y, x] = 1
        t[y, c + rw] = 1 if y > 2 else t[y, c + rw]           # the shade side
        if role == "top":
            t[y, c - lw:c - lw + 2] = 3                         # the lit bough
        if y >= 4:
            t[y, c] = 1                                         # the trunk
    t[14, 6:9] = 1
    t[15, 3:13] = 2
    t[15, 6:9] = 1
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
        "larch": "LOOMING: a tall narrow cone leaning over the foe; upswept boughs with drooping "
                 "branchlets of autumn-gold rosettes, small upright cones, one red larch rose, and "
                 "fallen gold needles heaped at the foot.",
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
