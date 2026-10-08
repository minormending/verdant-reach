"""The FIG ROOT key-item icon and the RESIN MARK, 16x16.

cast6-cast8 small-icon rules: black contours, light from the top left, a
few clustered highlights.

  fig_root     a living strangler-fig root coiled into a loop, pale grey-tan
               bark with its tip tapering off in two rootlets, and one glossy
               fig leaf on a short shoot at the top.
  mark_resin   the RESIN MARK: a pressed dragon-tree leaf tuft (stiff
               blue-green blades fanning from one point) with a drop of red
               resin beneath it, on the same cream herbarium card as the
               other Marks.
"""
from __future__ import annotations

import math

import common9 as common

from PIL import Image, ImageDraw

K = "#181818"
PAPER, PAPER_S = "#f0e8c8", "#c8b890"
BARK, BARK_S, BARK_H, BARK_D = "#b8a888", "#786850", "#e0d4b8", "#4c4030"
LEAF, LEAF_S, LEAF_H = "#389048", "#1c5830", "#80c868"
TUFT, TUFT_S, TUFT_H = "#588878", "#305848", "#98c0a8"
RESIN, RESIN_S, RESIN_H = "#d02828", "#801018", "#f87060"

def _hex(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Grid:
    """A 16x16 colour grid painted in layers; each layer is outlined in K on
    the pixels just outside it, over whatever lies below (as in the
    character kit), so a later root segment crosses over an earlier one."""

    def __init__(self):
        self.c = {}

    def layer(self, cells, outline=True):
        mine = set(cells)
        for (x, y), col in cells.items():
            if 0 <= x < 16 and 0 <= y < 16:
                self.c[(x, y)] = col
        if outline:
            for x, y in mine:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in mine and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                        self.c[q] = K

    def image(self):
        im = Image.new("RGBA", (16, 16))
        px = im.load()
        for (x, y), col in self.c.items():
            px[x, y] = _hex(col)
        return im


def tube(path, radii, lit, body, shade):
    """Pixels within radius of a polyline, lit on the side facing the top
    left and shaded on the side facing the bottom right."""
    cells = {}
    for y in range(16):
        for x in range(16):
            best = None
            for i, ((x0, y0), (x1, y1)) in enumerate(zip(path, path[1:])):
                dx, dy = x1 - x0, y1 - y0
                ln = dx * dx + dy * dy or 1
                t = max(0.0, min(1.0, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / ln))
                px, py = x0 + dx * t, y0 + dy * t
                d = math.hypot(x + 0.5 - px, y + 0.5 - py)
                r = radii[i] + (radii[i + 1] - radii[i]) * t
                if d <= r and (best is None or d < best[0]):
                    best = (d, x + 0.5 - px, y + 0.5 - py, r)
            if best:
                d, ox, oy, r = best
                side = -(ox + oy)                       # > 0 faces the top left
                cells[(x, y)] = lit if side > 0.55 * r else shade if side < -0.45 * r else body
    return cells


def fig_root():
    g = Grid()
    # The coil: from the shoot it curls down and round a loop to the left,
    # then runs out to the lower right, tapering to its tip.
    cx, cy, r = 6.0, 9.9, 4.0
    loop = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in range(-50, -340, -24)]
    path = [(8.9, 5.0)] + loop + [(11.2, 12.4), (13.4, 13.9), (15.0, 14.6)]
    radii = [1.0] + [1.15] * len(loop) + [0.95, 0.7, 0.45]
    g.layer(tube(path, radii, BARK_H, BARK, BARK_S))
    # A rootlet off the tail and two cracks in the bark.
    g.layer({(12, 11): BARK_S, (12, 10): BARK_S}, outline=True)
    g.c[(2, 10)] = BARK_D
    g.c[(6, 14)] = BARK_D
    # The one glossy fig leaf, a pointed oval angled up and right on a short
    # shoot, its midrib dark, lit on the upper left with a white glint.
    leaf = {}
    ox, oy, ang, length, width = 8.8, 6.2, -40, 7.9, 2.7
    ax, ay = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    for y in range(16):
        for x in range(16):
            u = (x + 0.5 - ox) * ax + (y + 0.5 - oy) * ay       # along the leaf
            v = -(x + 0.5 - ox) * ay + (y + 0.5 - oy) * ax      # across it (< 0: upper left)
            if 0.6 <= u <= length:
                half = width * math.sin(math.pi * ((u - 0.6) / (length - 0.6)) ** 0.75)
                if abs(v) <= half:
                    rib = abs(v) < 0.5 and 1.5 < u < length - 1.2
                    leaf[(x, y)] = LEAF_S if rib or v > 1.1 else LEAF_H if v < -half + 0.9 else LEAF
    g.layer(leaf)
    g.c[(11, 3)] = "#f8f8f8"
    return g.image()


def card():
    im = Image.new("RGBA", (16, 16))
    d = ImageDraw.Draw(im)
    d.rectangle((3, 1, 15, 15), fill="#887850")
    d.rectangle((2, 0, 14, 14), fill=K)
    d.rectangle((3, 1, 13, 13), fill=PAPER)
    d.line([(3, 14), (13, 14), (13, 1)], fill=PAPER_S)
    d.rectangle((8, 11, 11, 13), fill="#f8f8f0")
    d.line([(9, 12), (10, 12)], fill="#988868")
    return im, d


def mark_resin():
    im, d = card()
    # The pressed tuft: stiff sword-shaped blades fanning up from one point,
    # the lit blades on the upper left; each blade is two pixels wide at its
    # base and narrows to a one-pixel tip.
    base = (7, 9)
    blades = [((3, 5), TUFT_H), ((4, 3), TUFT_H), ((6, 2), TUFT), ((8, 1), TUFT), ((10, 2), TUFT),
              ((11, 4), TUFT_S), ((12, 6), TUFT_S)]
    for tip, c in blades:
        d.line([base, tip], fill=c)
    for (x, y), c in (((6, 7), TUFT), ((7, 7), TUFT), ((8, 7), TUFT_S), ((6, 8), TUFT_S), ((7, 8), TUFT_S),
                      ((8, 8), TUFT_S), ((5, 6), TUFT_H), ((9, 6), TUFT)):
        d.point((x, y), fill=c)
    # The cut stub of pale dragon-tree branch below the tuft ...
    d.line([(7, 9), (7, 10)], fill="#a09078")
    d.point((8, 10), fill="#706048")
    # ... and the drop of red resin welling from it, a glint on its upper left.
    d.point((7, 11), fill=RESIN_S)
    d.rectangle((6, 12, 7, 13), fill=RESIN)
    d.point((6, 12), fill=RESIN_H)
    d.point((7, 13), fill=RESIN_S)
    return im


def build(write=True):
    items = {"fig_root": fig_root()}
    ui = {"mark_resin": mark_resin()}
    if write:
        common.write_set("items", items, "icons9")
        common.write_set("ui", ui, "icons9")
    return items, ui
