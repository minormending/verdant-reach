"""Pumpkin line: pumpkin_blossom -> green_pumpkin -> pumpkin.

Drawn with the field-lines kit (tools/art/species_a/px.py + fieldkit.py)
so it matches the dandelion, bramble and sunflower lines; build.py in this
folder still collects it (SPRITES below adapts the images to its API).

Shape motif: the RIBBED GOURD (the blossom's ovary, the green gourd, the
great orange one) under a stem that curls forward like a HORN, with a
coiled tendril for a tail. Accent: the pale gold in slot 3 (the flower's
throat, the green gourd's stripes, the pumpkin's glint). Lobed leaves are
the arms; the pumpkin's have withered to rust in the autumn field.

Poses and rubric scores (CREATURES.md §9):
  pumpkin_blossom  BRACED  score 8 (8: fill at the low end of the baby class)
  green_pumpkin    BRACED  score 9
  pumpkin          BRACED  score 9
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.append(str(Path(__file__).resolve().parents[1] / "species_a"))
from px import Sprite, bezier, spline, star  # noqa: E402
import fieldkit as fk  # noqa: E402

IDS = ["pumpkin_blossom", "green_pumpkin", "pumpkin"]

# all channels multiples of 8 (the pix icon loader does not snap)
BLOSSOM = ["#386028", "#f09820", "#f8e070"]        # leaf green (leaf, sepal, ovary, vein), orange, pale gold
GREEN = ["#285030", "#70a838", "#d8e888"]          # blue-green, gourd green, pale gold stripe
PUMPKIN = ["#883018", "#f08020", "#f8d070"]        # rust (rib, stem, withered leaf), orange, gold


def gourd(s, c, cx, cy, w, h, n=5, tilt=0.0, tones=(1, 2, 3), glint=True, ribline="black"):
    """Ribbed gourd as one round mass (an oblate sphere seen 3/4) with
    scalloped flanks; returns a `ribs` closure that paints the rib grooves
    and the per-lobe light after render. `tilt` (deg) rolls it to the foe."""
    rx, ry = w / 2, h / 2
    m = c.ellipse(cx, cy, rx, ry, tilt)
    # scallops: each lobe bulges a little past the silhouette
    for i in range(n):
        th = -np.pi / 2 + np.pi * (i + 0.5) / n
        x = cx + rx * np.sin(th) * 0.96
        for yy in (-1, 1):
            m |= c.ellipse(x, cy + yy * ry * 0.02, rx / n * 1.05, ry * (0.97 - 0.10 * abs(np.sin(th))), tilt)
    # stem dimple
    m &= ~c.ellipse(cx - rx * 0.12, cy - ry - 0.2, rx * 0.22, 1.4)
    part = s.add(m, tones=tones, shade=(3, 2), close=2, band=(1, 2, (c.X < cx) & (c.Y < cy - ry * 0.25)),
                 line=ribline)

    def ribs(groove=1, lit=3, over=None):
        ca, sa = np.cos(np.radians(tilt)), np.sin(np.radians(tilt))
        for i in range(1, n):
            th = -np.pi / 2 + np.pi * i / n
            for yy in np.arange(-ry + 1.5, ry - 1.0, 0.25):
                f = np.sqrt(max(0.0, 1 - (yy / ry) ** 2))
                u = rx * np.sin(th) * f
                x, y = fk.mi(s, cx + u * ca - yy * sa, cy + u * sa + yy * ca)
                ov = over or ((1, 2, 3) if groove == 0 else (2, 3))
                if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in ov:
                    s.px([(x, y)], groove)
                    # the lobe to the right of a groove catches light on its left edge (left half only)
                    if th < -0.15 and abs(yy) < ry * 0.55 and x + 1 < s.w and s.t[y, x + 1] in (1, 2) and groove != 0:
                        s.px([(x + 1, y)], lit)
    return ribs


def lobed(c, p0, ang, L, w, lobes=3, spread=46):
    """Palmate pumpkin leaf: broad rounded lobes fanned from the petiole."""
    m = c.empty()
    k = (lobes - 1) / 2
    for j in range(lobes):
        da = (j - k) * spread
        a = np.radians(ang + da)
        l = L * (1 - 0.18 * abs(j - k))
        p1 = (p0[0] + np.cos(a) * l, p0[1] + np.sin(a) * l)
        m |= c.leaf(p0, p1, w * 0.68 * (1 - 0.1 * abs(j - k)), power=0.6, tip=1.6, base=0.8)
    return m


def coil(cx, cy, r0, turns, a0=0.0, r1=0.8, cw=True, sq=1.0, n=60):
    out = []
    for i in range(n):
        t = i / (n - 1)
        r = r0 + (r1 - r0) * t
        a = a0 + (1 if cw else -1) * turns * 2 * np.pi * t
        out.append((cx + r * np.cos(a), cy + r * np.sin(a) * sq))
    return out


def tendril(s, c, lead, cx, cy, r0, turns, a0, w=2.0, cw=True, tones=(1, 1, 1)):
    path = list(lead) + coil(cx, cy, r0, turns, a0, cw=cw)
    s.add(c.stroke(path, w, w * 0.8), tones=tones, flat=True, prune=False)


def vein_line(s, pts, tone, over):
    for x, y in bezier(pts, 40):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
            s.px([(x, y)], tone)


# --------------------------------------------------------------------------- fronts

def stub_feet(s, c, xs, y=55.6, w=5.0, tones=(1, 1, 1)):
    m = c.empty()
    for x0, x1 in xs:
        m |= c.leaf((x0, y - 2.5), (x1, y), w, power=0.6)
    s.add(m, tones=tones, flat=True)


def rim_star(c, cx, cy, rx, ry, ang, n=5, tip=1.45, rot=0.0):
    """A star of n points laid round a rotated ellipse (a flared corolla rim)."""
    pts = []
    ca, sa = np.cos(np.radians(ang)), np.sin(np.radians(ang))
    for i in range(2 * n):
        t = np.radians(rot) + np.pi * i / n
        r = tip if i % 2 == 0 else 1.0
        u, v = np.cos(t) * rx * r, np.sin(t) * ry * r
        pts.append((cx + u * ca - v * sa, cy + u * sa + v * ca))
    return c.poly(pts)


def blossom_front(fr=0):
    """BRACED. A golden bell of a flower flaring at the foe like a war-horn,
    riding the tiny striped gourd it will become; a leaf raised in guard, a
    tendril curling off behind."""
    b = fr
    s = Sprite(56, 56, BLOSSOM)
    c = s.c
    stub_feet(s, c, [(28, 20), (34, 43)])
    fk.pose(s, 0.88, 4 + 2.0 * b, 31, 55)
    b = 0
    tendril(s, c, [(38, 45), (43, 41)], 46, 36, 4.0, 1.25, np.radians(110), w=2.0)
    s.add(lobed(c, (37, 43), -55, 10, 8), tones=(1, 1, 1), flat=True)
    ribs = gourd(s, c, 31, 48, 19, 13, n=5, tilt=-8, tones=(1, 1, 3))
    s.add(star(c, 28, 41, 5, 1.6, 5.5, sx=1.2, sy=0.6, rot=-110), tones=(1, 1, 1), flat=True)
    mx, my, ang = 15, 22, 22
    tube = c.curve([(28, 41), (24, 35), (19, 28 + b)], 4.0, 10.0)
    s.add(tube, tones=(2, 2, 3), flat=True, line="black")
    s.add(rim_star(c, mx, my, 8.0, 12.5, ang, tip=1.55, rot=-90), tones=(2, 2, 3), flat=True, line="black")
    s.add(rim_star(c, mx - 0.5, my, 4.4, 7.0, ang, tip=1.5, rot=-90), tones=(3, 3, 3), flat=True, line="dark")
    s.add(lobed(c, (25, 47), 215, 10, 8), tones=(1, 1, 3), flat=True)
    s.render()
    # lit plane: gold along the tube's top-left; throat shade at the heart
    for x, y in bezier([(19, 29), (22, 33), (25, 37)], 30):
        s.paint(c.circle(x - 1.6, y - 1.6, 1.2) & (s.t == 2), 3)
    s.paint(c.ellipse(mx + 1.5, my + 2.0, 1.3, 3.4, -40) & (s.t == 3), 2)
    gx_, gy_ = fk.mi(s, mx - 5, my - 8)
    s.px([(gx_, gy_), (gx_ + 1, gy_), (gx_, gy_ + 1)], 3)
    ribs(groove=3, lit=3, over=(1,))
    vein_line(s, [fk.m(s, *p) for p in ((24, 47), (18, 45), (15, 44))], 3, (1,))
    fk.contact(s, 22, 40)
    s.clean()
    return fk.finish(s)


def green_front(fr=0):
    """BRACED. A striped green gourd hunkered on stub feet, rolled toward the
    foe; its stem a hooked horn; a broad leaf raised off its near flank like a
    shield; a tendril tail."""
    b = fr
    s = Sprite(56, 56, GREEN)
    c = s.c
    stub_feet(s, c, [(22, 14), (36, 45)], w=6)
    tendril(s, c, [(43, 38), (46, 33)], 48, 27 - b, 4.0, 1.25, np.radians(120), w=2.2)
    s.add(c.curve([(39, 30), (43, 24)], 3.0, 2.6), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (43, 24), -60, 11, 9), tones=(1, 2, 2), shade=(2, 2), close=1)
    gx, gy = 30, 41
    ribs = gourd(s, c, gx, gy + b * 0.5, 34, 25 - b, n=5, tilt=-8, tones=(1, 2, 3))
    stem = c.curve([(27, 30), (24, 23), (20, 18 + b), (15, 16 + b)], 5.5, 3.2)
    s.add(stem, tones=(1, 1, 2), shade=(1, 1), line="black")
    s.add(c.curve([(16, 39), (10, 34), (8, 28)], 3.2, 2.8), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (8, 29), 255, 15, 12), tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    ribs(groove=1, lit=3)
    vein_line(s, [(8, 29), (6, 22), (5, 16)], 1, (2, 3))
    fk.contact(s, 16, 44)
    s.clean()
    return fk.finish(s)


def pumpkin_front(fr=0):
    """BRACED (heavy). A great ribbed pumpkin squatting wide on stub feet,
    rolled toward the foe; its thick stem a horn hooked at the foe; withered
    vines as arms, the near one raised with a leaf-hand; a coiled tendril tail."""
    b = fr
    s = Sprite(56, 56, PUMPKIN)
    c = s.c
    stub_feet(s, c, [(20, 11), (40, 50)], w=7)
    tendril(s, c, [(50, 36), (53, 31)], 51, 25 - b, 4.0, 1.25, np.radians(120), w=2.4)
    s.add(c.curve([(44, 26), (49, 19)], 3.4, 3.0), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (49, 19), -70, 11, 9), tones=(1, 1, 2), shade=(1, 1), close=1)
    gx, gy = 31, 37
    ribs = gourd(s, c, gx, gy + b * 0.5, 44, 32 - b, n=7, tilt=-7, tones=(1, 2, 3))
    stem = c.curve([(27, 23), (25, 15), (20, 9 + b), (13, 7 + b)], 8.0, 4.0)
    s.add(stem, tones=(1, 1, 2), shade=(2, 1), band=(1, 2), line="black")
    s.add(c.curve([(13, 36), (7, 31), (5, 24)], 3.6, 3.0), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (5, 25), 262, 14, 12), tones=(1, 1, 2), shade=(1, 1), close=1, band=(1, 2))
    s.render()
    ribs(groove=1, lit=3)
    vein_line(s, [(5, 25), (4, 18), (4, 13)], 2, (1,))
    fk.contact(s, 14, 46)
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- backs

def blossom_back():
    """From behind: the trumpet's ribbed back and green sepals, flaring to
    the top right; the little gourd below, a leaf raised beside it."""
    s = Sprite(48, 48, BLOSSOM, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.3, 26, 14)
    s.add(lobed(c, (14, 38), 210, 14, 11), tones=(1, 1, 1), flat=True)
    ribs = gourd(s, c, 22, 44, 26, 18, n=5, tilt=6, tones=(1, 1, 3))
    tube = c.curve([(23, 36), (27, 28), (31, 21)], 6.0, 11.0)
    s.add(tube, tones=(2, 2, 3), shade=(2, 2), band=(1, 2), line="black")
    mouth = star(c, 33, 15, 5, 8.0, 15.0, sx=1.0, sy=0.8, rot=-60)
    s.add(mouth, tones=(2, 2, 3), shade=(3, 3), close=1, band=(1, 3), line="black")
    s.add(star(c, 23, 36, 5, 1.6, 6.0, sx=1.2, sy=0.6, rot=-80), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (32, 38), -20, 14, 11), tones=(1, 1, 3), flat=True)
    s.render()
    ribs(groove=3, lit=3, over=(1,))
    for k in range(5):
        a = np.radians(-60 + 72 * k)
        vein_line(s, [fk.m(s, 33, 15), fk.m(s, 33 + np.cos(a) * 12, 15 + np.sin(a) * 9.6)], 1, (3,))
    s.clean()
    return fk.finish(s)


def green_back():
    """The gourd from behind and above: its stem-end crown with the curled
    horn toward the top right, stripes running to us, leaf up on the right."""
    s = Sprite(48, 48, GREEN, crop_bottom=True)
    c = s.c
    fk.zoom(s, 1.05, 24, 34)
    s.add(lobed(c, (12, 26), 215, 14, 11), tones=(1, 2, 2), shade=(2, 2), close=1)
    ribs = gourd(s, c, 23, 34, 46, 34, n=5, tilt=6, tones=(1, 2, 3))
    s.add(c.ellipse(24, 20, 5.5, 3.0), tones=(1, 1, 1), flat=True)
    stem = c.curve([(25, 21), (29, 13), (35, 9), (38, 12)], 5.0, 3.0)
    s.add(stem, tones=(1, 1, 2), shade=(1, 1))
    s.add(lobed(c, (36, 26), -30, 14, 12), tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2))
    s.render()
    ribs(groove=1, lit=3)
    s.clean()
    return fk.finish(s)


def crown_ribs(s, cx, top, bottom, rx, n, groove=1, lit=3, bulge=1.12):
    """Ribs seen from above: curves from the stem crown out over the
    shoulder and down to the cropped bottom edge."""
    for i in range(1, n):
        th = -np.pi / 2 + np.pi * i / n
        ex = cx + rx * np.sin(th)
        ctrl = [(cx + 1.0 * np.sin(th) * 3, top), (cx + rx * np.sin(th) * bulge, (top + bottom) / 2 - 2), (ex, bottom)]
        for x, y in bezier(ctrl, 60):
            x, y = int(round(x)), int(round(y))
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in (2, 3):
                s.px([(x, y)], groove)
                if th < -0.2 and x + 1 < s.w and s.t[y, x + 1] == 2 and y > top + 3:
                    s.px([(x + 1, y)], lit)


def pumpkin_back():
    """The great pumpkin from behind and above: its broad shoulders and the
    ribs fanning out from the stem crown, the thick stem hooked toward the
    foe (top right), a vine arm raised on each side."""
    s = Sprite(48, 48, PUMPKIN, crop_bottom=True)
    c = s.c
    s.add(c.curve([(10, 30), (5, 22), (6, 15)], 3.4, 3.0), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (6, 16), 250, 12, 11), tones=(1, 1, 2), shade=(1, 1), close=1, band=(1, 2))
    s.add(c.curve([(38, 26), (43, 19), (44, 13)], 3.4, 3.0), tones=(1, 1, 1), flat=True)
    s.add(lobed(c, (44, 14), -75, 11, 10), tones=(1, 1, 2), shade=(1, 1), close=1)
    body = c.ellipse(24, 38, 23.5, 22) | c.ellipse(24, 46, 24.5, 18)
    s.add(body, tones=(1, 2, 3), shade=(4, 3), close=2, band=(1, 3, (c.X < 22) & (c.Y < 32)), line="black")
    s.add(c.ellipse(25, 20, 5.0, 2.6), tones=(1, 1, 1), flat=True)
    stem = c.curve([(25, 21), (28, 13), (33, 8), (38, 6)], 7.5, 3.8)
    s.add(stem, tones=(1, 1, 2), shade=(2, 1), band=(1, 2))
    s.render()
    crown_ribs(s, 25, 21, 48, 24, 7)
    s.px([(12, 28), (13, 27), (12, 27)], 3)
    s.clean()
    return fk.finish(s)


# --------------------------------------------------------------------------- build glue

def make(id_):
    f, b, pal = {
        "pumpkin_blossom": (blossom_front, blossom_back, BLOSSOM),
        "green_pumpkin": (green_front, green_back, GREEN),
        "pumpkin": (pumpkin_front, pumpkin_back, PUMPKIN),
    }[id_]
    fr = fk.register([f(0), f(1)])
    i1, i2 = fk.hand_icon(_HAND[id_], pal)
    return {"front": fr[0], "front__2": fr[1], "back": b(), "icon": i1, "icon__2": i2}


# hand-pixelled 16x16 icons, fill-only (fk.auto_rows adds the outline ring)
_HAND = {
    "pumpkin_blossom": [
        "..3.............",
        ".323..3.........",
        "..3223232.......",
        ".3222222........",
        "3322112223......",
        ".322112222......",
        "..3222222.......",
        "..32.2222.......",
        ".3...2221...11..",
        "......2211.111..",
        ".....1121..11...",
        "....2323232.....",
        "...232323231....",
        "...223232311....",
        "....2222111.....",
        "................"],
    "green_pumpkin": [
        "................",
        "................",
        ".22......1......",
        "2222....11......",
        "23222..11.......",
        ".2222.11........",
        "..21.11.........",
        "...1222222......",
        "..2322232221....",
        ".232223222221...",
        ".322232222211...",
        ".322232222211...",
        ".222232222111...",
        "..22222221111...",
        "...11....11.....",
        "................"],
    "pumpkin": [
        "................",
        "....111.........",
        "...1..11........",
        "...1...11.......",
        ".......11.......",
        "...2221112222...",
        "..232212221222..",
        ".23221222122221.",
        ".32212221222211.",
        ".32212221222211.",
        ".32212221222211.",
        ".22212221222111.",
        "..2212221221111.",
        "...22222111111..",
        ".....11111111...",
        "................"],
}
ICONS = {k: fk.auto_rows(v) for k, v in _HAND.items()}
ICONS2 = {}
SQUASH = {}


class _Img:
    """Adapter: species_b/build.py calls fn().finish(**kw).image()."""

    def __init__(self, im):
        self.im = im

    def finish(self, **_):
        return self

    def image(self):
        return self.im


_cache = {}


def _get(id_):
    if id_ not in _cache:
        _cache[id_] = make(id_)
    return _cache[id_]


def _spec(id_, pal):
    return dict(
        pal=tuple(pal),
        front=lambda: _Img(_get(id_)["front"]),
        idle=[lambda: _Img(_get(id_)["front__2"])],
        back=lambda: _Img(_get(id_)["back"]),
        icon=ICONS.get(id_),
        icon2=ICONS2.get(id_, "squash"),
        squash_row=SQUASH.get(id_),
    )


SPRITES = {
    "pumpkin_blossom": _spec("pumpkin_blossom", BLOSSOM),
    "green_pumpkin": _spec("green_pumpkin", GREEN),
    "pumpkin": _spec("pumpkin", PUMPKIN),
}
