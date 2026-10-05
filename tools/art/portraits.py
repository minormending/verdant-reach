"""Trainer portraits -> public/art/sets/portraits/ (assets/trainers/<key>.png).

56x56 busts in a 3/4 view facing left (toward the player's side of the
battle), in the overworld sprites' colours; player_back is 48x48, seen
from behind. Crystal trainer-card discipline: each portrait keeps to a
few ramps (skin, hair, one or two costume colours, an accent) plus the
outline, light from the top-left.

A portrait is built from labelled regions (shapes with a z-order). Each
region is filled with its base colour, auto-shaded (a shadow rim on the
lower right, an optional highlight rim on the upper left) and outlined 1px
where it sits on another region or on the background. Faces, strands,
seams and props are painted last, pixel by pixel. Silhouettes matter: the
VS banner shows each portrait as a flat silhouette, so every trainer gets a
prop or hairline nobody else has.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

import gbc
from gbc import C

N = 56


def col(c):
    if isinstance(c, tuple):
        return c
    return gbc.hexc(c) if c.startswith("#") else C[c]


class Portrait:
    def __init__(self, size=N):
        self.n = size
        self.label = np.full((size, size), -1, np.int16)
        self.regions: list[dict] = []
        self.paint: list[tuple] = []

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

    def line(self, pts, w=1):
        return self._mask(lambda d: d.line([tuple(p) for p in pts], fill=255, width=w))

    def add(self, mask, base, shade=None, hi=None, line=True, shade_off=(3, 2), clip=None, hi_off=(2, 2)):
        if clip is not None:
            mask = mask & clip
        self.regions.append(dict(base=base, shade=shade, hi=hi, line=line, mask=mask,
                                 shade_off=shade_off, hi_off=hi_off))
        self.label[mask] = len(self.regions) - 1
        return mask

    def px(self, x, y, c):
        self.paint.append((x, y, c))

    def pxs(self, pts, c):
        for x, y in pts:
            self.px(x, y, c)

    def hline(self, x0, x1, y, c):
        for x in range(x0, x1 + 1):
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
            out[vis] = col(r["base"])
            full = r["mask"]
            if r["shade"]:
                dx, dy = r["shade_off"]
                sh = vis & ~shifted(full, -dx, -dy)
                out[sh] = col(r["shade"])
            if r["hi"]:
                hx, hy = r["hi_off"]
                hi = vis & ~shifted(full, hx, hy) & shifted(full, -1, -1)
                out[hi] = col(r["hi"])
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
                out[y, x] = col(c)
        return Image.fromarray(out, "RGBA")


# =============================================================================
# Building blocks (3/4 view, facing left)
# =============================================================================
CX, CY = 28, 22


def torso(p: Portrait, top, shade, hi=None, shoulder_y=38, x0=5, x1=51, neck=(23, 31)):
    """Shoulders + chest to the bottom edge, turned a little to the left
    (the near shoulder is lower and wider)."""
    pts = [(x0, 55), (x0 + 1, shoulder_y + 7), (x0 + 6, shoulder_y + 1), (neck[0] - 3, shoulder_y - 3),
           (neck[1] + 2, shoulder_y - 4), (x1 - 7, shoulder_y - 1), (x1 - 1, shoulder_y + 5), (x1, 55)]
    return p.add(p.poly(pts), top, shade, hi)


def neck(p, skin="sk0", shade="sk1", x0=23, x1=30, y0=29, y1=39):
    p.add(p.rect(x0, y0, x1, y1), skin, shade, shade_off=(3, 0))
    p.pxs([(x, y0 + 1) for x in range(x0, x1 + 1)], "sk1")   # chin shadow


def head(p, cx=CX, cy=CY, rx=10, ry=11, skin="sk0", shade="sk1", jaw=0):
    """Head turned 3/4 left: the far (right) ear shows, the jaw leans left."""
    p.add(p.ellipse(cx + rx - 1, cy + 2, 2, 3), skin, shade)
    m = p.ellipse(cx, cy, rx, ry)
    m |= p.poly([(cx - rx + 1, cy + 2), (cx - 4 - jaw, cy + ry + 1), (cx + 3, cy + ry + 1), (cx + rx - 1, cy + 3)])
    return p.add(m, skin, shade, shade_off=(3, 3))


def eye(p, x, y, kind="calm", far=False):
    """3x3 eye looking left: pupil on the left, white to the right."""
    if kind == "happy":
        p.pxs([(x, y + 2), (x + 1, y + 1), (x + 2, y + 1), (x + 3 - far, y + 2)], "k")
        return
    if kind == "closed":
        p.pxs([(x, y + 2), (x + 1, y + 2), (x + 2, y + 2)], "k")
        return
    w = 2 if far else 3
    if kind in ("narrow", "scowl"):
        p.hline(x, x + w, y + 1, "k")
        p.pxs([(x, y + 2), (x + 1, y + 2)], "k")
        if not far:
            p.px(x + 2, y + 2, "white")
        return
    p.hline(x, x + w, y, "k")                       # lash line
    p.pxs([(x, y + 1), (x + 1, y + 1), (x, y + 2), (x + 1, y + 2)], "k")
    p.px(x + 1, y + 1, "r2" if kind != "wide" else "k")   # glint
    if not far:
        p.pxs([(x + 2, y + 1), (x + 2, y + 2)], "white")
    else:
        p.px(x + 2, y + 2, "white")
    if kind == "wide":
        p.pxs([(x, y + 3), (x + 1, y + 3)], "k")


def brows(p, x_near, x_far, y, kind="calm", c="k"):
    if kind == "scowl":
        p.pxs([(x_near - 1, y - 1), (x_near, y - 1), (x_near + 1, y), (x_near + 2, y), (x_near + 3, y + 1)], c)
        p.pxs([(x_far - 1, y + 1), (x_far, y), (x_far + 1, y), (x_far + 2, y - 1)], c)
    elif kind == "flat":
        p.hline(x_near - 1, x_near + 3, y, c)
        p.hline(x_far, x_far + 3, y, c)
    elif kind == "raised":
        p.pxs([(x_near - 1, y), (x_near, y - 1), (x_near + 1, y - 2), (x_near + 2, y - 2), (x_near + 3, y - 1)], c)
        p.pxs([(x_far, y - 1), (x_far + 1, y - 2), (x_far + 2, y - 2), (x_far + 3, y - 1)], c)
    elif kind == "kind":
        p.pxs([(x_near - 1, y), (x_near, y - 1), (x_near + 1, y - 1), (x_near + 2, y - 1), (x_near + 3, y)], c)
        p.pxs([(x_far, y), (x_far + 1, y - 1), (x_far + 2, y - 1), (x_far + 3, y)], c)
    else:
        p.pxs([(x_near - 1, y), (x_near, y - 1), (x_near + 1, y - 1), (x_near + 2, y - 1)], c)
        p.pxs([(x_far, y - 1), (x_far + 1, y - 1), (x_far + 2, y - 1), (x_far + 3, y)], c)


def mouth(p, mx, my, kind="flat"):
    if kind == "smile":
        p.pxs([(mx - 3, my - 1), (mx - 2, my), (mx + 2, my), (mx + 3, my - 1)], "sk3")
        p.hline(mx - 1, mx + 1, my + 1, "sk3")
    elif kind == "grin":       # open, teeth and tongue
        p.hline(mx - 3, mx + 3, my, "k")
        p.hline(mx - 2, mx + 2, my + 1, "white")
        p.hline(mx - 1, mx + 1, my + 2, "b2")
        p.pxs([(mx - 3, my + 1), (mx + 3, my + 1), (mx - 2, my + 2), (mx + 2, my + 2)], "k")
        p.hline(mx - 1, mx + 1, my + 3, "k")
    elif kind == "smirk":
        p.hline(mx - 2, mx + 1, my, "sk3")
        p.pxs([(mx + 2, my - 1), (mx + 3, my - 1)], "sk3")
    elif kind == "frown":
        p.hline(mx - 1, mx + 2, my, "sk3")
        p.pxs([(mx - 2, my + 1), (mx + 3, my + 1)], "sk3")
    elif kind == "open":
        p.hline(mx - 1, mx + 1, my, "k")
        p.pxs([(mx - 2, my + 1), (mx + 2, my + 1)], "k")
        p.hline(mx - 1, mx + 1, my + 1, "b2")
        p.hline(mx - 1, mx + 1, my + 2, "k")
    else:
        p.hline(mx - 2, mx + 2, my, "sk3")


def nose(p, cx=CX, cy=CY):
    """3/4 left: a small wedge left of centre, shadowed on its right."""
    p.pxs([(cx - 3, cy + 3), (cx - 3, cy + 4)], "sk1")
    p.pxs([(cx - 4, cy + 5), (cx - 3, cy + 5)], "sk2")


def face(p, cx=CX, cy=CY, eyes="calm", brow="calm", mouth_kind="flat", brow_c="k", blush=None,
         glasses=False):
    ey = cy + 1
    xn, xf = cx - 8, cx + 1
    eye(p, xn, ey, eyes)
    eye(p, xf, ey, eyes, far=True)
    brows(p, xn, xf, ey - 2, brow, brow_c)
    nose(p, cx, cy)
    mouth(p, cx - 3, cy + 8, mouth_kind)
    if blush:
        p.pxs([(xn - 1, ey + 4), (xn, ey + 4), (xf + 3, ey + 4)], blush)
    if glasses:
        for x0, w in ((xn - 1, 5), (xf - 1, 4)):
            p.hline(x0, x0 + w, ey - 1, "k")
            p.hline(x0, x0 + w, ey + 3, "k")
            for y in range(ey - 1, ey + 4):
                p.px(x0, y, "k")
                p.px(x0 + w, y, "k")
        p.hline(xn + 4, xf - 1, ey, "k")
        p.px(xf + 4, ey, "k")


def strands(p, pts, c):
    for x, y in pts:
        p.px(x, y, c)


# =============================================================================
# Trainers
# =============================================================================
def bram():
    """Rival. Blue-black blade spikes swept back, plum jacket with a high
    red-lined collar, a scowl he hasn't grown into."""
    p = Portrait()
    torso(p, "x2", "x3", hi="x1")
    p.add(p.poly([(22, 37), (27, 50), (32, 37)]), "#383848", "#202030")          # dark tee
    # high collar, flared: red lining shows inside
    p.add(p.poly([(17, 34), (22, 31), (26, 42), (21, 46)]), "b1", "b2")
    p.add(p.poly([(39, 33), (33, 31), (29, 42), (34, 45)]), "b1", "b2")
    p.add(p.poly([(13, 38), (19, 34), (24, 45), (18, 49)]), "x2", "x3", hi="x1")
    p.add(p.poly([(43, 37), (36, 33), (31, 45), (36, 48)]), "x2", "x3")
    p.add(p.poly([(19, 33), (22, 31), (26, 43), (24, 45)]), "b1", "b2", line=False)   # red lining
    p.add(p.poly([(36, 32), (34, 31), (30, 43), (31, 44)]), "b1", "b2", line=False)
    p.hline(27, 27, 50, "x3")
    neck(p)
    head(p, jaw=1)
    face(p, eyes="scowl", brow="scowl", mouth_kind="frown", brow_c="k")
    p.pxs([(20, 20), (21, 20), (22, 21), (31, 21), (32, 20)], "k")                     # heavy brows
    # hair: long blades raking back to the right
    spikes = p.poly([(14, 22), (15, 13), (11, 9), (18, 8), (17, 3), (24, 6), (27, 0), (31, 5), (38, 1),
                     (38, 7), (47, 5), (43, 12), (50, 14), (43, 17), (46, 23), (39, 21), (37, 26),
                     (35, 18), (31, 15), (27, 18), (24, 13), (21, 19), (18, 16)])
    p.add(spikes, "u2", "u3", hi="u1")
    strands(p, [(22, 9), (23, 10), (29, 6), (30, 7), (36, 6), (37, 8), (41, 12), (42, 13)], "u3")
    return p


def hollis():
    """Conservatory head 1. An old hedge-layer: tweed flat cap, grey beard,
    waxed olive jacket, billhook over his shoulder, kind eyes."""
    p = Portrait()
    # billhook behind the shoulder (handle + hooked blade)
    p.add(p.line([(44, 55), (49, 24)], 3), "o1", "o2")
    p.add(p.poly([(47, 25), (48, 14), (53, 9), (54, 12), (51, 15), (52, 25)]), "r0", "r2", shade_off=(2, 1))
    torso(p, "#688840", "#405828", hi="#88a858")
    p.add(p.poly([(22, 36), (28, 46), (34, 36)]), "s1", "s2")                    # shirt
    p.add(p.poly([(15, 37), (22, 33), (27, 45), (20, 49)]), "d1", "d2")           # corduroy collar
    p.add(p.poly([(40, 36), (34, 33), (30, 44), (36, 47)]), "d1", "d2")
    p.pxs([(13, 47), (14, 48), (40, 48), (41, 49)], "#405828")                     # pocket flaps
    p.add(p.ellipse(44, 51, 4, 4), "sk0", "sk1")                                   # hand on the haft
    neck(p)
    head(p)
    face(p, eyes="happy", brow="kind", mouth_kind="smile", brow_c="r2")
    # beard + sideburns
    p.add(p.ellipse(25, 31, 9, 5) & ~p.rect(0, 0, N, 28), "r1", "r2")
    p.add(p.rect(35, 17, 37, 27) | p.rect(17, 17, 18, 25), "r1", "r2")
    p.hline(22, 27, 30, "sk3")                                                     # mouth in the beard
    p.pxs([(20, 28), (21, 28), (28, 28), (29, 28)], "r1")
    # flat cap, peak to the left
    p.add(p.ellipse(29, 13, 13, 7) & ~p.rect(0, 17, N, N), "d1", "d2", hi="d0")
    p.add(p.poly([(13, 15), (24, 13), (32, 16), (16, 18)]), "d2", "d3")
    for x in range(19, 41, 3):
        p.px(x, 10 + (x % 2), "d2")
        p.px(x + 1, 13 - (x % 2), "d0")
    return p


def nell_pitcher():
    """Conservatory head 2. Bog scientist: strawberry-blonde bunches, pink
    shirt, denim dungarees, a potted sundew held up proudly."""
    p = Portrait()
    # bunches either side
    p.add(p.ellipse(13, 26, 5, 7), "m0", "m1", hi="y0")
    p.add(p.ellipse(44, 25, 5, 7), "m0", "m1")
    torso(p, "n1", "n2", hi="n0")
    p.add(p.rect(18, 44, 37, 55) | p.poly([(15, 38), (19, 37), (22, 45), (18, 45)]) |
          p.poly([(39, 37), (35, 36), (33, 45), (37, 45)]), "u1", "u2")             # dungarees
    p.add(p.rect(23, 47, 31, 52), "u2", None)                                       # bib pocket
    p.pxs([(19, 45), (36, 45)], "y1")                                               # buttons
    neck(p)
    head(p)
    face(p, eyes="happy", brow="raised", mouth_kind="grin", brow_c="m2", blush="n1")
    p.pxs([(18, 27), (20, 28), (34, 27)], "sk1")                                    # freckles
    # hair cap + fringe
    cap = p.ellipse(28, 17, 12, 11) & ~p.rect(0, 19, N, N)
    fringe = p.poly([(16, 21), (20, 14), (24, 18), (27, 13), (31, 17), (35, 13), (40, 20), (40, 10), (16, 10)])
    p.add(cap | (fringe & p.ellipse(28, 17, 13, 12)), "m0", "m1", hi="y0")
    strands(p, [(22, 10), (23, 11), (30, 8), (31, 9), (35, 10)], "m1")
    p.add(p.ellipse(17, 19, 2, 2) | p.ellipse(39, 18, 2, 2), "g2", "f2")            # hair ties
    # potted sundew at lower right
    p.add(p.poly([(37, 47), (51, 47), (49, 55), (39, 55)]), "b1", "b2")
    p.add(p.rect(36, 45, 52, 47), "b0", "b1")
    for x, y in [(39, 43), (41, 40), (44, 39), (47, 40), (49, 43), (44, 36)]:
        p.px(x, y, "b2")
        p.px(x, y - 1, "white")
    p.pxs([(40, 44), (42, 42), (44, 41), (46, 42), (48, 44), (44, 38), (44, 40), (43, 43), (45, 43)], "g2")
    p.add(p.ellipse(36, 50, 3, 3), "sk0", "sk1")                                    # hand
    return p


def shears():
    """Rootstock admin. Silver hair slicked flat, charcoal work coat, a
    yellow graft-tape armband, long hedge shears across the chest."""
    p = Portrait()
    torso(p, "r2", "r3", hi="r1")
    p.add(p.poly([(23, 35), (28, 43), (33, 35)]), "k", None)                         # black shirt
    p.add(p.poly([(16, 36), (23, 32), (28, 46), (22, 49)]), "r2", "r3", hi="r1")     # lapels
    p.add(p.poly([(40, 35), (33, 32), (28, 46), (34, 48)]), "r2", "r3")
    p.add(p.poly([(42, 40), (50, 42), (50, 49), (42, 47)]), "y1", "y2")              # armband
    p.pxs([(44, 42), (46, 44), (48, 46)], "y2")
    neck(p, x0=24)
    head(p, rx=9, jaw=2)
    face(p, eyes="narrow", brow="flat", mouth_kind="smirk", brow_c="r3")
    p.pxs([(20, 27), (21, 28)], "sk1")                                               # hollow cheek
    hair = p.ellipse(28, 15, 10, 9) & ~p.rect(0, 17, N, N)
    hair |= p.poly([(18, 15), (25, 15), (28, 19), (31, 15), (38, 14), (40, 18), (39, 25), (36, 22), (37, 17)])
    p.add(hair, "r1", "r2", hi="r0")
    for x in range(19, 38, 3):
        p.pxs([(x, 9), (x + 1, 9), (x + 2, 10), (x + 3, 10)], "r3")
    # shears: two long blades crossed at a pivot, red grips at the bottom
    p.add(p.poly([(3, 24), (7, 22), (24, 43), (21, 45)]), "r0", "r2", shade_off=(1, 1))
    p.add(p.poly([(7, 22), (11, 21), (25, 41), (24, 43)]), "r1", "r3", shade_off=(1, 1))
    p.add(p.poly([(21, 45), (25, 41), (32, 51), (28, 54)]), "m2", "m3")
    p.add(p.poly([(25, 44), (27, 41), (37, 49), (34, 52)]), "m2", "m3")
    p.pxs([(23, 43), (24, 42)], "y1")
    return p


def grunt():
    """Rootstock grunt: grey cap with the yellow graft sigil, dust mask,
    grey work coat, arms folded, graft-tape armband."""
    p = Portrait()
    torso(p, "r1", "r2", hi="r0")
    p.add(p.poly([(23, 35), (28, 42), (33, 35)]), "r3", None)
    # folded arms
    p.add(p.poly([(12, 48), (46, 45), (50, 51), (14, 54)]), "r1", "r2")              # far forearm
    p.add(p.ellipse(15, 51, 3, 3), "sk0", "sk1")                                     # its hand
    p.add(p.poly([(6, 46), (13, 41), (41, 43), (40, 49), (11, 51)]), "r1", "r2", hi="r0")  # near forearm
    p.add(p.rect(10, 42, 16, 49) & p.poly([(6, 46), (13, 41), (41, 43), (40, 49), (11, 51)]), "y1", "y2")
    p.add(p.ellipse(42, 46, 3, 3), "sk0", "sk1")
    neck(p)
    head(p)
    face(p, eyes="narrow", brow="scowl", mouth_kind="flat")
    # dust mask over nose and mouth, straps to the ear
    p.add(p.poly([(17, 25), (34, 25), (32, 33), (21, 34), (17, 30)]), "r0", "r1")
    p.pxs([(34, 25), (35, 24), (36, 23)], "k")
    p.hline(20, 30, 29, "r1")
    # cap: crown + long peak to the left, sigil on the front
    p.add(p.ellipse(29, 14, 11, 8) & ~p.rect(0, 18, N, N), "r2", "r3", hi="r1")
    p.add(p.poly([(7, 18), (21, 13), (33, 16), (31, 19), (11, 21)]), "r3", "r2", shade_off=(1, 2))
    p.add(p.rect(18, 17, 38, 18) & p.ellipse(29, 14, 12, 9), "d3", None)            # hair under cap
    p.pxs([(25, 9), (26, 8), (27, 9), (26, 10), (24, 10), (28, 10), (26, 11)], "y1")
    return p


def gardener():
    """Straw hat with a green band, white shirt, green apron, watering can."""
    p = Portrait()
    torso(p, "white", "r1")
    p.add(p.rect(18, 41, 37, 55) | p.poly([(16, 38), (19, 37), (22, 42), (18, 42)]) |
          p.poly([(39, 37), (36, 36), (34, 42), (38, 42)]), "g2", "f2", hi="g1")
    p.add(p.rect(23, 46, 31, 51), "f2", None)
    p.px(24, 45, "o2"); p.px(25, 44, "o2")                                            # trowel in pocket
    neck(p)
    head(p)
    face(p, eyes="calm", brow="kind", mouth_kind="smile", brow_c="d3")
    p.add(p.rect(16, 15, 19, 24) | p.rect(35, 15, 38, 23) | p.poly([(17, 15), (40, 15), (38, 19), (24, 18), (19, 21)]),
          "d3", "k", hi="d2")
    # watering can at lower right
    p.add(p.ellipse(45, 49, 7, 6), "f1", "f2", hi="g1")
    p.add(p.poly([(37, 46), (31, 38), (29, 39), (36, 50)]), "f1", "f2")
    p.add(p.ellipse(30, 38, 2, 1), "f2", None)
    p.add(p.line([(41, 43), (45, 38), (50, 43)], 2), "f2", None)
    # straw hat: wide brim tilted, crown, green band
    p.add(p.ellipse(27, 14, 20, 5), "y0", "s1", hi="white", shade_off=(2, 2))
    crown = p.ellipse(28, 9, 9, 7) & ~p.rect(0, 13, N, N)
    p.add(crown, "y0", "s1", hi="white")
    p.add(p.rect(19, 10, 37, 12) & p.ellipse(28, 9, 10, 8), "g2", "f2")
    for x in range(10, 46, 4):
        p.px(x, 14, "s1")
    return p


def schoolkid():
    """Neat black bowl cut, navy blazer, red tie, backpack straps, eager."""
    p = Portrait()
    cy = 25
    torso(p, "u2", "u3", hi="u1", x0=10, x1=46, shoulder_y=42, neck=(24, 31))
    p.add(p.poly([(23, 38), (28, 45), (33, 38)]), "white", "r1")
    p.add(p.poly([(27, 40), (29, 40), (30, 50), (28, 52), (26, 50)]), "b1", "b2")
    p.add(p.poly([(13, 42), (17, 41), (20, 55), (15, 55)]) |
          p.poly([(43, 42), (39, 41), (37, 55), (42, 55)]), "b2", "b3")              # backpack straps
    p.pxs([(16, 47), (40, 47)], "y1")
    neck(p, y0=31, y1=41, x0=24, x1=31)
    head(p, cy=cy, rx=10, ry=10)
    face(p, cy=cy, eyes="wide", brow="raised", mouth_kind="open", brow_c="k")
    hair = p.ellipse(28, cy - 3, 12, 10) & ~p.rect(0, cy - 1, N, N)
    hair |= p.rect(17, cy - 4, 19, cy + 3) | p.rect(37, cy - 4, 39, cy + 3)
    p.add(hair, "r3", "k", hi="r2")
    p.hline(19, 37, cy - 2, "r3")
    return p


def birdwatcher():
    """Khaki bush hat and vest over a green shirt, binoculars raised."""
    p = Portrait()
    torso(p, "s2", "s3", hi="s1")
    p.add(p.poly([(22, 36), (28, 44), (34, 36)]), "f1", "f2")
    p.add(p.rect(11, 46, 17, 51) | p.rect(39, 46, 45, 51), "s3", None)
    p.pxs([(14, 46), (42, 46)], "s1")
    neck(p)
    head(p)
    face(p, eyes="calm", brow="raised", mouth_kind="open", brow_c="d3")
    p.add(p.rect(16, 15, 19, 23) | p.rect(35, 15, 38, 24) | p.poly([(17, 15), (40, 15), (38, 18), (28, 17), (20, 20)]),
          "o2", "o3", hi="o1")
    # binoculars held up at the chest, strap over the neck
    p.add(p.line([(20, 36), (22, 42)], 1) | p.line([(36, 36), (34, 42)], 1), "k", None, line=False)
    p.add(p.rect(18, 42, 37, 50), "r3", "k")
    p.add(p.ellipse(22, 46, 3, 3) | p.ellipse(33, 46, 3, 3), "u2", "u3")
    p.pxs([(21, 45), (32, 45)], "w1")
    p.add(p.ellipse(16, 51, 4, 3) | p.ellipse(39, 51, 4, 3), "sk0", "sk1")
    # bush hat, one side pinned up
    p.add(p.ellipse(27, 14, 17, 4), "s2", "s3", hi="s1", shade_off=(2, 2))
    p.add(p.poly([(37, 12), (44, 5), (46, 8), (41, 14)]), "s2", "s3")
    p.add(p.ellipse(27, 9, 9, 6) & ~p.rect(0, 13, N, N), "s2", "s3", hi="s1")
    p.add(p.rect(18, 10, 36, 11) & p.ellipse(27, 9, 10, 7), "s3", None)
    p.add(p.poly([(43, 6), (49, 0), (50, 2), (45, 8)]), "b1", "b2")                  # red feather
    return p


def hiker():
    """Felt hat, big beard, red flannel, rucksack straps and bedroll."""
    p = Portrait()
    p.add(p.ellipse(9, 34, 7, 10) | p.ellipse(47, 34, 7, 10), "f1", "f2")             # pack behind
    p.add(p.rect(6, 22, 50, 27) & (p.ellipse(9, 34, 9, 13) | p.ellipse(47, 34, 9, 13) |
                                   p.rect(9, 22, 47, 27)), "m1", "m2")                  # bedroll
    torso(p, "b1", "b2", hi="b0", x0=4, x1=52)
    for x in range(8, 50, 5):
        for y in range(40, 56):
            if (x + y) % 5 == 0:
                p.px(x, y, "b2")
    p.add(p.poly([(14, 37), (18, 36), (21, 55), (16, 55)]) |
          p.poly([(42, 37), (38, 36), (35, 55), (40, 55)]), "f1", "f2")
    p.pxs([(18, 46), (19, 46), (37, 46), (38, 46)], "r1")
    neck(p)
    head(p)
    face(p, eyes="happy", brow="raised", mouth_kind="grin", brow_c="d3")
    beard = p.ellipse(26, 31, 10, 7) & ~p.rect(0, 0, N, 26)
    beard |= p.rect(17, 19, 19, 28) | p.rect(36, 19, 38, 28)
    p.add(beard, "d2", "d3", hi="d1")
    p.hline(22, 28, 30, "k"); p.hline(23, 27, 31, "white"); p.hline(23, 27, 32, "k")
    p.add(p.ellipse(27, 14, 17, 4), "o2", "o3", hi="o1", shade_off=(2, 2))
    p.add(p.ellipse(28, 9, 9, 7) & ~p.rect(0, 13, N, N), "o2", "o3", hi="o1")
    p.add(p.rect(19, 10, 37, 12) & p.ellipse(28, 9, 10, 8), "b2", None)
    return p


def beekeeper():
    """Veiled hat over a white suit, smoker puffing in one hand."""
    p = Portrait()
    torso(p, "white", "r1")
    p.add(p.rect(25, 40, 30, 55), "r1", None, line=False)
    veil = p.ellipse(28, 26, 15, 13) & ~p.rect(0, 0, N, 15)
    p.add(veil, "r1", "r2")
    head(p, cy=23)
    face(p, cy=23, eyes="calm", brow="kind", mouth_kind="smile", brow_c="d3")
    m = p.ellipse(28, 26, 14, 12) & ~p.rect(0, 0, N, 15)
    ys, xs = np.nonzero(m)
    for x, y in zip(xs, ys):
        if (x + y) % 2 == 0 and p.label[y, x] >= 0:
            p.px(int(x), int(y), "r2")
    p.add(p.ellipse(27, 14, 18, 4), "white", "r1", shade_off=(2, 2))
    p.add(p.ellipse(28, 9, 9, 6) & ~p.rect(0, 13, N, N), "white", "r1")
    # smoker: tin can with a spout and bellows, a puff of smoke
    p.add(p.rect(39, 40, 48, 52), "m1", "m2", hi="m0")
    p.add(p.poly([(40, 40), (47, 40), (45, 35), (42, 35)]), "r1", "r2")
    p.add(p.rect(49, 42, 53, 51), "o1", "o2")
    for x, y in [(41, 31), (43, 29), (40, 27), (42, 25), (44, 30)]:
        p.add(p.ellipse(x, y, 2, 2), "r0", "r1", line=False)
    p.add(p.ellipse(38, 47, 3, 3), "s1", "s2")                                     # glove
    return p


def florist():
    """Golden bob with a flower pin, pink blouse, green apron, bouquet."""
    p = Portrait()
    back = p.ellipse(28, 21, 14, 13) & ~p.rect(0, 30, N, N)
    p.add(back, "y1", "y2", hi="y0")
    torso(p, "n1", "n2", hi="n0")
    p.add(p.rect(19, 42, 37, 55) | p.poly([(17, 38), (20, 37), (22, 43), (18, 43)]) |
          p.poly([(39, 37), (36, 36), (34, 43), (38, 43)]), "g2", "f2")
    neck(p)
    head(p)
    face(p, eyes="calm", brow="raised", mouth_kind="smile", brow_c="y3", blush="n1")
    f = p.poly([(15, 20), (20, 15), (25, 18), (29, 13), (34, 17), (40, 14), (41, 22), (42, 9), (15, 9)])
    f &= p.ellipse(28, 21, 14, 14)
    p.add(f, "y1", "y2", hi="y0")
    p.add(p.ellipse(39, 10, 3, 3), "n1", "n2")
    p.px(39, 10, "y0")
    # bouquet wrapped in paper
    p.add(p.poly([(20, 55), (25, 46), (33, 46), (38, 55)]), "q0", "q1")
    for (x, y, c) in [(23, 43, "b1"), (27, 41, "y1"), (31, 43, "x1"), (25, 46, "white"),
                      (30, 46, "n1"), (34, 45, "b1"), (21, 46, "x1")]:
        p.add(p.ellipse(x, y, 2, 2), c, None)
        p.px(x, y, "y1" if c != "y1" else "m1")
    p.add(p.ellipse(19, 51, 3, 3), "sk0", "sk1")
    return p


def player_back():
    """48x48: the player from behind and slightly above. Green field cap,
    chestnut hair, rust field jacket, the vasculum's leather strap."""
    p = Portrait(48)
    p.add(p.poly([(0, 47), (1, 35), (9, 28), (18, 26), (30, 26), (39, 28), (46, 35), (47, 47)]), "m1", "m2",
          hi="m0")
    p.add(p.poly([(16, 26), (24, 31), (32, 26), (28, 24), (20, 24)]), "m2", "m3")
    p.add(p.rect(23, 33, 24, 47), "m2", None, line=False)
    p.add(p.poly([(37, 29), (41, 31), (14, 47), (9, 47)]), "o3", "k")
    p.pxs([(30, 35), (31, 35), (30, 36), (31, 36)], "r1")                       # strap buckle
    p.add(p.rect(19, 18, 29, 27), "sk0", "sk1")
    p.add(p.ellipse(12, 16, 2, 3) | p.ellipse(36, 16, 2, 3), "sk0", "sk1")
    hairm = p.ellipse(24, 13, 12, 10) & ~p.rect(0, 23, 48, 48)
    p.add(hairm, "d2", "d3", hi="d1")
    for x in range(15, 34, 3):
        p.pxs([(x, 19), (x + 1, 20), (x + 1, 21)], "d3")
    crown = p.ellipse(24, 9, 13, 9) & ~p.rect(0, 15, 48, 48)
    p.add(crown, "g2", "f2", hi="g1")
    p.add(p.rect(11, 13, 37, 15) & p.ellipse(24, 10, 14, 10), "f2", None)
    p.add(p.ellipse(24, 15, 4, 2) & ~p.rect(0, 16, 48, 48), "d2", None)
    p.hline(20, 28, 13, "g0")
    p.pxs([(14, 6), (15, 5), (16, 5)], "g1")
    return p


PORTRAITS = {
    "bram": bram, "hollis": hollis, "nell_pitcher": nell_pitcher, "shears": shears, "grunt": grunt,
    "gardener": gardener, "schoolkid": schoolkid, "birdwatcher": birdwatcher, "hiker": hiker,
    "beekeeper": beekeeper, "florist": florist, "player_back": player_back,
}


def silhouette(im: Image.Image) -> Image.Image:
    a = np.asarray(im).copy()
    a[a[..., 3] > 0] = (24, 36, 24, 255)
    return Image.fromarray(a, "RGBA")


def build():
    cells, sil = [], []
    for k, fn in PORTRAITS.items():
        im = fn().render()
        gbc.save(im, f"trainers/{k}.png")
        cells.append((k, gbc.on_bg(im, (248, 248, 248, 255))))
        sil.append((k, gbc.on_bg(silhouette(im), (248, 248, 248, 255))))
    gbc.grid_sheet(cells, 6, 4).save(gbc.REVIEW / "portraits.png")
    gbc.grid_sheet(cells, 12, 1, label=False).save(gbc.REVIEW / "portraits_1x.png")
    gbc.grid_sheet(sil, 12, 1, label=False).save(gbc.REVIEW / "portraits_silhouette.png")


if __name__ == "__main__":
    build()
