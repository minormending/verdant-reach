"""Parametric trainer portraits -> public/assets/trainers/<key>.png.

56x56 busts (player_back: 48x48, seen from behind), in the overworld
characters' colours. A portrait is built from labelled regions (shapes with
a z-order), then each region is filled with its base colour, auto-shaded
(light from the upper left: a shadow rim on the lower right, a highlight rim
on hair), and outlined 1px black where it sits on top of another region or
on the background. Face features and props are drawn last, pixel by pixel.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

import gbc
from gbc import C

N = 56


class Portrait:
    def __init__(self, size=N):
        self.n = size
        self.label = np.full((size, size), -1, np.int16)
        self.regions: list[dict] = []
        self.paint: list[tuple] = []   # (x, y, colour) drawn last

    # -- shapes -----------------------------------------------------------
    def _mask(self, draw_fn) -> np.ndarray:
        im = Image.new("L", (self.n, self.n), 0)
        draw_fn(ImageDraw.Draw(im))
        return np.asarray(im) > 0

    def ellipse(self, cx, cy, rx, ry):
        return self._mask(lambda d: d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255))

    def poly(self, pts):
        return self._mask(lambda d: d.polygon([tuple(p) for p in pts], fill=255))

    def rect(self, x0, y0, x1, y1):
        return self._mask(lambda d: d.rectangle((x0, y0, x1, y1), fill=255))

    def add(self, mask, base, shade=None, hi=None, line=True, shade_off=(3, 2), clip=None):
        """Put a region on top of everything so far."""
        if clip is not None:
            mask = mask & clip
        idx = len(self.regions)
        self.regions.append(dict(base=base, shade=shade, hi=hi, line=line, mask=mask,
                                 shade_off=shade_off))
        self.label[mask] = idx
        return mask

    def px(self, x, y, c):
        self.paint.append((x, y, c))

    def pxs(self, pts, c):
        for x, y in pts:
            self.px(x, y, c)

    # -- render -----------------------------------------------------------
    def render(self) -> Image.Image:
        n = self.n
        out = np.zeros((n, n, 4), np.uint8)
        lab = self.label

        def shifted(m, dx, dy):
            r = np.zeros_like(m)
            ys = slice(max(0, -dy), n - max(0, dy))
            yd = slice(max(0, dy), n - max(0, -dy))
            xs = slice(max(0, -dx), n - max(0, dx))
            xd = slice(max(0, dx), n - max(0, -dx))
            r[yd, xd] = m[ys, xs]
            return r

        for i, r in enumerate(self.regions):
            vis = lab == i
            if not vis.any():
                continue
            out[vis] = C[r["base"]]
            full = r["mask"]
            if r["shade"]:
                dx, dy = r["shade_off"]
                # shadow where the region ends within (dx,dy) to the lower right
                sh = vis & ~shifted(full, -dx, -dy)
                out[sh] = C[r["shade"]]
            if r["hi"]:
                hi = vis & ~shifted(full, 2, 2) & shifted(full, -1, -1)
                out[hi] = C[r["hi"]]
        # outlines: a region's pixel touching background or a lower region
        K = C["k"]
        for y in range(n):
            for x in range(n):
                i = lab[y, x]
                if i < 0 or not self.regions[i]["line"]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if not (0 <= xx < n and 0 <= yy < n):
                        continue
                    j = lab[yy, xx]
                    if j < 0 or (j < i and self.regions[j]["base"] != self.regions[i]["base"]):
                        out[y, x] = K
                        break
        for x, y, c in self.paint:
            if 0 <= x < n and 0 <= y < n:
                out[y, x] = C[c] if isinstance(c, str) else c
        return Image.fromarray(out, "RGBA")


# ----------------------------------------------------------- building blocks -
def body(p: Portrait, top, shade, x0=6, x1=49, shoulder_y=38, neck=(24, 32)):
    """Shoulders + torso to the bottom edge."""
    pts = [(x0, 55), (x0 + 2, shoulder_y + 6), (x0 + 8, shoulder_y), (neck[0] - 2, shoulder_y - 3),
           (neck[1] + 2, shoulder_y - 3), (x1 - 8, shoulder_y), (x1 - 2, shoulder_y + 6), (x1, 55)]
    return p.add(p.poly(pts), top, shade)


def neck(p, skin="sk0", shade="sk1", x0=24, x1=32, y0=29, y1=38):
    m = p.rect(x0, y0, x1, y1)
    p.add(m, skin, shade, shade_off=(3, 0))


def head(p, cx=28, cy=21, rx=10, ry=12, skin="sk0", shade="sk1"):
    p.add(p.ellipse(cx - rx - 1, cy + 1, 2, 3) | p.ellipse(cx + rx + 1, cy + 1, 2, 3), skin, shade)
    return p.add(p.ellipse(cx, cy, rx, ry), skin, shade, shade_off=(3, 3))


def face(p, cx=28, cy=21, mood="calm", brow="k", eye_gap=4, glasses=False):
    ey = cy + 1
    lx, rx = cx - eye_gap - 1, cx + eye_gap
    for x in (lx, rx):
        if mood in ("cold", "sharp"):
            p.pxs([(x, ey + 1), (x + 1, ey + 1), (x, ey + 2), (x + 1, ey + 2)], "k")
        else:
            p.pxs([(x, ey), (x + 1, ey), (x, ey + 1), (x + 1, ey + 1), (x, ey + 2), (x + 1, ey + 2)], "k")
            p.px(x, ey, "white")
    # brows
    if mood in ("cold", "sharp"):
        p.pxs([(lx - 1, ey - 2), (lx, ey - 2), (lx + 1, ey - 1), (lx + 2, ey - 1)], brow)
        p.pxs([(rx + 2, ey - 2), (rx + 1, ey - 2), (rx, ey - 1), (rx - 1, ey - 1)], brow)
    elif mood == "kind":
        p.pxs([(lx - 1, ey - 2), (lx, ey - 3), (lx + 1, ey - 3), (lx + 2, ey - 2)], brow)
        p.pxs([(rx - 1, ey - 2), (rx, ey - 3), (rx + 1, ey - 3), (rx + 2, ey - 2)], brow)
    else:
        p.pxs([(lx - 1, ey - 2), (lx, ey - 3), (lx + 1, ey - 3), (lx + 2, ey - 3)], brow)
        p.pxs([(rx - 1, ey - 3), (rx, ey - 3), (rx + 1, ey - 3), (rx + 2, ey - 2)], brow)
    # nose
    p.pxs([(cx, ey + 3), (cx, ey + 4)], "sk1")
    p.px(cx + 1, ey + 4, "sk2")
    # mouth
    my = ey + 7
    if mood == "smile":
        p.pxs([(cx - 3, my - 1), (cx - 2, my), (cx - 1, my), (cx, my), (cx + 1, my), (cx + 2, my), (cx + 3, my - 1)], "sk3")
        p.pxs([(cx - 1, my + 1), (cx, my + 1), (cx + 1, my + 1)], "b2")
    elif mood == "cold":
        p.pxs([(cx - 2, my), (cx - 1, my), (cx, my), (cx + 1, my)], "sk3")
        p.px(cx + 2, my - 1, "sk3")   # a smirk
    elif mood == "sharp":
        p.pxs([(cx - 3, my), (cx - 2, my), (cx - 1, my), (cx, my), (cx + 1, my), (cx + 2, my)], "sk3")
        p.pxs([(cx - 3, my - 1), (cx + 3, my - 1)], "sk3")
    else:
        p.pxs([(cx - 2, my), (cx - 1, my), (cx, my), (cx + 1, my), (cx + 2, my)], "sk3")
        if mood == "kind":
            p.pxs([(cx - 3, my - 1), (cx + 3, my - 1)], "sk3")
    if glasses:
        for x in (lx - 2, rx - 1):
            for i in range(5):
                p.px(x + i, ey - 1, "k"); p.px(x + i, ey + 3, "k")
            p.px(x, ey, "k"); p.px(x, ey + 1, "k"); p.px(x, ey + 2, "k")
            p.px(x + 4, ey, "k"); p.px(x + 4, ey + 1, "k"); p.px(x + 4, ey + 2, "k")
        p.pxs([(cx - 1, ey), (cx, ey)], "k")


# hair styles ---------------------------------------------------------------
def hair_short(p, H, h, hi=None, cx=28, cy=21):
    cap = p.ellipse(cx, cy - 5, 11, 9) & ~p.rect(0, cy - 1, N, N)
    sides = p.rect(cx - 11, cy - 6, cx - 9, cy + 1) | p.rect(cx + 9, cy - 6, cx + 11, cy + 1)
    fringe = p.poly([(cx - 9, cy - 4), (cx - 6, cy - 1), (cx - 4, cy - 4), (cx - 1, cy - 1), (cx + 2, cy - 4),
                     (cx + 5, cy - 2), (cx + 8, cy - 5), (cx + 9, cy - 8), (cx - 9, cy - 8)])
    p.add(cap | sides | fringe, H, h, hi)


def hair_spiky(p, H, h, hi=None, cx=28, cy=21):
    spikes = p.poly([(cx - 13, cy - 2), (cx - 16, cy - 9), (cx - 10, cy - 10), (cx - 12, cy - 17),
                     (cx - 5, cy - 14), (cx - 4, cy - 21), (cx + 1, cy - 15), (cx + 6, cy - 21),
                     (cx + 8, cy - 13), (cx + 15, cy - 16), (cx + 12, cy - 8), (cx + 17, cy - 6),
                     (cx + 11, cy - 1), (cx + 11, cy + 2), (cx + 7, cy - 4), (cx + 4, cy - 2),
                     (cx + 1, cy - 5), (cx - 2, cy - 1), (cx - 5, cy - 4), (cx - 8, cy), (cx - 11, cy + 2)])
    p.add(spikes, H, h, hi)


def hair_bun(p, H, h, hi=None, cx=28, cy=21, side_locks=True):
    p.add(p.ellipse(cx, cy - 15, 6, 5), H, h, hi)
    cap = p.ellipse(cx, cy - 5, 11, 9) & ~p.rect(0, cy - 2, N, N)
    fringe = p.poly([(cx - 10, cy - 3), (cx - 7, cy - 5), (cx - 2, cy - 6), (cx + 4, cy - 5), (cx + 10, cy - 2),
                     (cx + 10, cy - 8), (cx - 10, cy - 8)])
    locks = (p.rect(cx - 11, cy - 6, cx - 9, cy + 4) | p.rect(cx + 9, cy - 6, cx + 11, cy + 4)) if side_locks else cap & False
    p.add(cap | fringe | locks, H, h, hi)


def hair_slick(p, H, h, hi=None, cx=28, cy=21):
    """Swept straight back (Shears)."""
    cap = p.ellipse(cx, cy - 4, 11, 10) & ~p.rect(0, cy - 3, N, N)
    back = p.poly([(cx - 11, cy - 3), (cx - 12, cy + 2), (cx - 9, cy - 3)]) | \
        p.poly([(cx + 11, cy - 3), (cx + 13, cy + 3), (cx + 9, cy - 3)])
    p.add(cap | back, H, h, hi)
    for x in range(cx - 8, cx + 9, 4):
        p.pxs([(x, cy - 9), (x + 1, cy - 8), (x + 2, cy - 7)], h)


def hair_bob(p, H, h, hi=None, cx=28, cy=21):
    back = p.ellipse(cx, cy - 1, 14, 13) & ~p.rect(0, cy + 9, N, N)
    p.add(back, H, h, hi)
    return back


def fringe_bob(p, H, h, hi=None, cx=28, cy=21):
    f = p.poly([(cx - 11, cy - 2), (cx - 6, cy - 5), (cx, cy - 4), (cx + 6, cy - 6), (cx + 11, cy - 2),
                (cx + 11, cy - 11), (cx - 11, cy - 11)]) & p.ellipse(cx, cy - 1, 13, 13)
    p.add(f, H, h, hi)


def hat_cap(p, Cc, c, cx=28, cy=21, logo=None):
    crown = p.ellipse(cx, cy - 7, 11, 8) & ~p.rect(0, cy - 3, N, N)
    p.add(crown, Cc, c, shade_off=(4, 2))
    brim = p.ellipse(cx - 2, cy - 3, 13, 3)
    p.add(brim, c, None)
    if logo:
        p.pxs([(cx - 1, cy - 9), (cx, cy - 10), (cx + 1, cy - 9), (cx, cy - 8), (cx, cy - 9)], logo)


def hat_brim(p, Cc, c, band, cx=28, cy=21):
    p.add(p.ellipse(cx, cy - 8, 18, 5), Cc, c, shade_off=(2, 2))
    crown = p.ellipse(cx, cy - 13, 9, 7) & ~p.rect(0, cy - 8, N, N)
    p.add(crown, Cc, c)
    p.add(p.rect(cx - 9, cy - 10, cx + 9, cy - 8) & p.ellipse(cx, cy - 13, 10, 8), band, None)


def hat_flat(p, Cc, c, cx=28, cy=21):
    crown = p.ellipse(cx, cy - 7, 12, 7) & ~p.rect(0, cy - 3, N, N)
    p.add(crown, Cc, c)
    p.add(p.ellipse(cx - 1, cy - 3, 12, 2), c, None)
    for x in range(cx - 9, cx + 10, 3):   # tweed flecks
        p.px(x, cy - 8 + (x % 2), "d3")


def beard(p, col, shade, cx=28, cy=21, full=True):
    m = p.ellipse(cx, cy + 9, 9, 6) & ~p.rect(0, 0, N, cy + 5)
    if full:
        m |= p.rect(cx - 10, cy + 1, cx - 8, cy + 8) | p.rect(cx + 8, cy + 1, cx + 10, cy + 8)
    p.add(m, col, shade)
    # mouth gap
    p.pxs([(cx - 2, cy + 8), (cx - 1, cy + 8), (cx, cy + 8), (cx + 1, cy + 8), (cx + 2, cy + 8)], "sk3")
    p.pxs([(cx - 4, cy + 6), (cx - 3, cy + 6), (cx + 3, cy + 6), (cx + 4, cy + 6)], col)


def collar(p, col, shade, cx=28, y=36, w=8, h=6):
    left = p.poly([(cx - 1, y + h), (cx - w, y - 2), (cx - w + 3, y - 3), (cx - 1, y + 1)])
    right = p.poly([(cx + 1, y + h), (cx + w, y - 2), (cx + w - 3, y - 3), (cx + 1, y + 1)])
    p.add(left | right, col, shade)


# --------------------------------------------------------------- trainers ---
def bram():
    p = Portrait()
    body(p, "x2", "x3")
    p.add(p.poly([(22, 36), (28, 50), (34, 36)]), "r3", "k")            # dark shirt V
    collar(p, "x2", "x3", w=10, h=8)
    p.add(p.rect(27, 44, 28, 55), "x3", None, line=False)                # zip
    neck(p)
    head(p)
    face(p, mood="cold", brow="b3")
    hair_spiky(p, "b2", "b3", hi="b1")
    return p


def hollis():
    p = Portrait()
    body(p, "f1", "f2")
    p.add(p.poly([(23, 35), (28, 44), (33, 35)]), "s1", "s2")            # shirt
    collar(p, "d1", "d2", w=9, h=7)
    neck(p)
    head(p)
    face(p, mood="kind", brow="r2")
    beard(p, "r1", "r2")
    p.add(p.rect(17, 14, 19, 22) | p.rect(37, 14, 39, 22), "r1", "r2")   # grey hair at the sides
    hat_flat(p, "d1", "d2")
    # bramble sprig in hand (lower left)
    p.add(p.ellipse(13, 50, 5, 4), "sk0", "sk1")
    for x, y in [(12, 46), (11, 44), (10, 42), (9, 40), (13, 43), (14, 41)]:
        p.px(x, y, "f3")
    p.pxs([(8, 39), (9, 38), (15, 40), (16, 39)], "g2")
    p.pxs([(10, 41), (14, 42), (8, 41)], "x2")
    p.pxs([(10, 40), (14, 41)], "x3")
    return p


def nell_pitcher():
    p = Portrait()
    body(p, "n1", "n2")
    # waders bib + straps
    p.add(p.rect(18, 44, 38, 55) | p.poly([(16, 39), (19, 38), (22, 45), (19, 45)]) |
          p.poly([(40, 39), (37, 38), (34, 45), (37, 45)]), "g2", "f2")
    p.pxs([(20, 46), (36, 46)], "y1")
    neck(p)
    head(p)
    face(p, mood="smile", brow="o3")
    hair_bun(p, "m0", "m1", hi="y0")
    # potted sundew held up at lower right
    p.add(p.poly([(37, 49), (49, 49), (47, 55), (39, 55)]), "b1", "b2")
    p.add(p.rect(36, 47, 50, 49), "b0", "b1")
    for x, y in [(39, 46), (41, 44), (43, 43), (45, 44), (47, 46), (43, 41)]:
        p.px(x, y, "b2")
        p.px(x, y - 1, "white")
    p.pxs([(40, 46), (42, 45), (44, 45), (46, 46), (43, 44), (43, 42)], "g2")
    return p


def shears():
    p = Portrait()
    body(p, "r3", "k")
    p.add(p.poly([(23, 35), (28, 42), (33, 35)]), "r1", "r2")             # grey shirt
    collar(p, "r3", "k", w=11, h=10)
    p.add(p.rect(41, 42, 47, 46) & p.poly([(40, 40), (49, 41), (49, 48), (40, 47)]), "y1", "y2")  # armband
    neck(p)
    head(p, rx=9)
    face(p, mood="sharp", brow="r1")
    hair_slick(p, "r1", "r2", hi="r0")
    # big garden shears held diagonally across the chest: two blades + pivot
    p.add(p.poly([(5, 28), (9, 25), (25, 44), (22, 47)]), "r0", "r2")
    p.add(p.poly([(9, 25), (13, 24), (26, 43), (25, 44)]), "r1", "r2")
    p.add(p.poly([(22, 46), (26, 43), (33, 53), (29, 55)]), "m2", "m3")    # handles
    p.add(p.poly([(25, 46), (28, 44), (37, 51), (34, 54)]), "m2", "m3")
    p.pxs([(24, 45), (25, 45)], "y1")
    return p


def grunt():
    p = Portrait()
    body(p, "r1", "r2")
    collar(p, "r1", "r2", w=9, h=6)
    p.add(p.poly([(23, 35), (28, 41), (33, 35)]), "r3", "k")
    # arms crossed
    p.add(p.poly([(8, 46), (14, 42), (42, 42), (48, 46), (46, 52), (10, 52)]), "r1", "r2")
    p.add(p.rect(12, 44, 18, 48), "y1", "y2")                              # graft-tape armband
    p.add(p.ellipse(42, 47, 3, 3) | p.ellipse(15, 50, 3, 2), "sk0", "sk1")  # hands
    neck(p)
    head(p)
    face(p, mood="cold", brow="k")
    hair_short(p, "r3", "k")
    hat_cap(p, "r2", "r3", logo="y1")
    return p


def gardener():
    p = Portrait()
    body(p, "white", "r1")
    p.add(p.rect(19, 41, 37, 55) | p.poly([(17, 38), (20, 37), (22, 42), (19, 42)]) |
          p.poly([(39, 38), (36, 37), (34, 42), (37, 42)]), "g2", "f2")  # apron
    p.add(p.rect(24, 45, 32, 50), "f2", None)                              # pocket
    neck(p)
    head(p)
    face(p, mood="kind", brow="d3")
    hair_short(p, "d3", "k")
    hat_brim(p, "y0", "s2", "g2")
    # trowel
    p.add(p.poly([(42, 40), (47, 38), (50, 44), (45, 46)]), "r0", "r2")
    p.add(p.rect(43, 46, 45, 52), "o1", "o2")
    return p


def schoolkid():
    p = Portrait()
    cy = 25
    body(p, "u2", "u3", x0=10, x1=45, shoulder_y=42, neck=(25, 31))
    p.add(p.poly([(24, 38), (28, 44), (32, 38)]), "white", "r1")
    p.add(p.poly([(27, 40), (29, 40), (30, 49), (28, 51), (26, 49)]), "b1", "b2")   # tie
    p.add(p.poly([(14, 41), (17, 40), (40, 55), (36, 55)]), "o2", "o3")           # satchel strap
    neck(p, y0=31, y1=41, x0=25, x1=31)
    head(p, cy=cy, rx=10, ry=11)
    face(p, cy=cy, mood="smile", brow="k")
    hair_short(p, "k", "r3", cy=cy)
    return p


def birdwatcher():
    p = Portrait()
    body(p, "s2", "s3")
    p.add(p.poly([(22, 36), (28, 44), (34, 36)]), "f1", "f2")             # green shirt
    p.add(p.rect(12, 46, 18, 51) | p.rect(38, 46, 44, 51), "s3", None)    # vest pockets
    neck(p)
    head(p)
    face(p, mood="calm", brow="d3")
    hair_short(p, "d3", "k")
    hat_brim(p, "s2", "s3", "s3")
    # binoculars held at the chest + strap
    p.add(p.rect(19, 43, 36, 50), "r3", "k")
    p.add(p.ellipse(22, 47, 3, 3) | p.ellipse(33, 47, 3, 3), "u2", "u3")
    p.pxs([(21, 46), (32, 46)], "w1")
    p.add(p.ellipse(18, 53, 4, 3) | p.ellipse(38, 53, 4, 3), "sk0", "sk1")
    return p


def hiker():
    p = Portrait()
    p.add(p.ellipse(9, 38, 6, 9) | p.ellipse(47, 38, 6, 9), "f1", "f2")   # pack behind
    body(p, "b1", "b2", x0=4, x1=51)
    p.add(p.poly([(14, 38), (18, 37), (21, 55), (16, 55)]) |
          p.poly([(42, 38), (38, 37), (35, 55), (40, 55)]), "f1", "f2")    # straps
    p.pxs([(18, 46), (19, 46), (37, 46), (38, 46)], "r1")
    neck(p)
    head(p)
    face(p, mood="smile", brow="d3")
    beard(p, "d3", "k")
    hat_brim(p, "o2", "o3", "b2")
    return p


def beekeeper():
    p = Portrait()
    body(p, "white", "r1")
    p.add(p.rect(25, 40, 31, 55), "r1", None, line=False)                  # zip
    # veil: a mesh dome over head and shoulders
    veil = p.ellipse(28, 26, 15, 13) & ~p.rect(0, 0, N, 16)
    p.add(veil, "r2", "r3")
    head(p, cy=23)
    face(p, cy=23, mood="kind", brow="d3")
    hat_brim(p, "white", "r1", "r0", cy=21)
    # mesh over the face
    m = p.ellipse(28, 26, 14, 12) & ~p.rect(0, 0, N, 15)
    ys, xs = np.nonzero(m)
    for x, y in zip(xs, ys):
        if (x + y) % 2 == 0:
            p.px(int(x), int(y), "r2" if not p.label[y, x] in (-1,) else "r2")
    # honey frame held up
    p.add(p.rect(36, 42, 50, 54), "o2", "o3")
    p.add(p.rect(38, 44, 48, 52), "y1", "y2")
    for x in range(38, 49, 3):
        for y in range(44, 53, 3):
            p.px(x, y, "y0")
    return p


def florist():
    p = Portrait()
    hair_bob(p, "y1", "y2", hi="y0")
    body(p, "n1", "n2")
    p.add(p.rect(19, 42, 37, 55) | p.poly([(18, 38), (21, 37), (22, 43), (19, 43)]) |
          p.poly([(38, 38), (35, 37), (34, 43), (37, 43)]), "g2", "f2")     # apron
    neck(p)
    head(p)
    face(p, mood="smile", brow="y3")
    fringe_bob(p, "y1", "y2", hi="y0")
    p.add(p.ellipse(39, 11, 3, 3), "n1", "n2")                              # flower pin
    p.px(39, 11, "y1")
    # bouquet
    p.add(p.poly([(20, 55), (24, 47), (32, 47), (36, 55)]), "q0", "q1")
    for (x, y, c) in [(23, 44, "b1"), (27, 42, "y1"), (31, 44, "x1"), (25, 47, "white"), (30, 47, "n1"),
                      (34, 46, "b1"), (21, 46, "x1")]:
        p.add(p.ellipse(x, y, 2, 2), c, None)
        p.px(x, y, "y1" if c != "y1" else "m1")
    return p


def player_back():
    """48x48, the player seen from behind and slightly above (battle, player side)."""
    p = Portrait(48)
    # shoulders + jacket, wide, cropped by the bottom edge
    p.add(p.poly([(0, 47), (1, 35), (9, 28), (18, 26), (30, 26), (39, 28), (46, 35), (47, 47)]), "m1", "m2")
    p.add(p.poly([(17, 26), (24, 31), (31, 26), (28, 25), (20, 25)]), "m2", "m3")   # collar
    p.add(p.rect(23, 32, 24, 47), "m2", None, line=False)                  # back seam
    p.add(p.poly([(8, 29), (12, 27), (41, 47), (36, 47)]), "o2", "o3")     # satchel strap
    # neck, ears, hair, cap
    p.add(p.rect(19, 18, 29, 27), "sk0", "sk1")
    p.add(p.ellipse(12, 16, 2, 3) | p.ellipse(36, 16, 2, 3), "sk0", "sk1")
    hairm = p.ellipse(24, 13, 12, 10) & ~p.rect(0, 23, 48, 48)
    p.add(hairm, "d2", "d3", hi="d1")
    for x in range(15, 34, 3):
        p.pxs([(x, 19), (x + 1, 20), (x + 1, 21)], "d3")
    crown = p.ellipse(24, 9, 13, 9) & ~p.rect(0, 15, 48, 48)
    p.add(crown, "g2", "f2", hi="g1")
    p.add(p.rect(11, 13, 37, 15) & p.ellipse(24, 10, 14, 10), "f2", None)   # band
    p.add(p.ellipse(24, 15, 4, 2) & ~p.rect(0, 16, 48, 48), "d2", None)    # strap opening
    p.add(p.rect(20, 13, 28, 13), "y1", None, line=False)                  # strap buckle line
    return p


PORTRAITS = {
    "bram": bram, "hollis": hollis, "nell_pitcher": nell_pitcher, "shears": shears, "grunt": grunt,
    "gardener": gardener, "schoolkid": schoolkid, "birdwatcher": birdwatcher, "hiker": hiker,
    "beekeeper": beekeeper, "florist": florist, "player_back": player_back,
}


def build():
    cells = []
    for k, fn in PORTRAITS.items():
        im = fn().render()
        gbc.save(im, f"trainers/{k}.png")
        cells.append((k, gbc.on_bg(im, (248, 248, 248, 255))))
    gbc.grid_sheet(cells, 6, 4).save(gbc.REVIEW / "portraits.png")


if __name__ == "__main__":
    build()
