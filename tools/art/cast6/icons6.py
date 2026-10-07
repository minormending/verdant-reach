"""Chapter 6 key items, pressed-specimen Marks, and a two-frame Victoria raft.

Small icons follow cast5's cream herbarium cards, black contours and clustered
top-left highlights. The raft is a 48x14 strip of two 24x14 frames, sampled
by drawLilyRaft; the second frame bobs down a pixel within the same canvas.
"""
from __future__ import annotations

import common6 as common
from PIL import Image, ImageDraw

K = "#181818"
PAPER, PAPER_S = "#f0e8c8", "#c8b890"
GREEN, GREEN_S, GREEN_H = "#789858", "#385838", "#c0d888"


def canvas(size=(16, 16)):
    im = Image.new("RGBA", size)
    return im, ImageDraw.Draw(im)


def cactus_sap():
    im, d = canvas()
    d.rectangle((6, 1, 10, 4), fill=K)
    d.rectangle((7, 1, 9, 3), fill="#c89860")
    d.point((7, 1), fill="#e8c890")
    d.polygon([(5, 4), (11, 4), (11, 6), (13, 8), (13, 13), (11, 15), (5, 15), (3, 13), (3, 8), (5, 6)], fill=K)
    d.polygon([(6, 5), (10, 5), (10, 7), (12, 8), (12, 12), (10, 14), (6, 14), (4, 12), (4, 8), (6, 7)], fill="#b8d8d0")
    d.rectangle((4, 9, 12, 12), fill=GREEN)
    d.line([(5, 13), (11, 13), (12, 12), (12, 9)], fill=GREEN_S)
    d.line([(5, 8), (5, 11)], fill="#f8f8f8")
    d.line([(7, 9), (10, 9)], fill=GREEN_H)
    d.point((9, 11), fill=GREEN_H)
    return im


def lily_raft():
    im, d = canvas()
    d.polygon([(2, 5), (4, 3), (10, 3), (13, 5), (14, 9), (12, 12), (4, 12), (1, 10)], fill=K)
    d.polygon([(3, 5), (5, 4), (10, 4), (12, 6), (13, 9), (11, 11), (4, 11), (2, 9)], fill=GREEN)
    d.line([(3, 5), (5, 4), (10, 4), (12, 6)], fill=GREEN_H)
    d.polygon([(3, 7), (11, 5), (13, 9), (11, 11), (4, 11)], fill=GREEN_S)
    d.line([(4, 8), (11, 6), (12, 9)], fill=GREEN)
    d.line([(5, 9), (10, 8)], fill=GREEN_H)
    # Folded leaf bound by a cord; the loose coil hangs below it.
    d.line([(7, 4), (8, 8), (9, 11)], fill="#e0c890", width=2)
    d.ellipse((9, 10, 14, 15), outline=K)
    d.ellipse((10, 11, 13, 14), outline="#c89860")
    d.point((10, 11), fill="#f0d8a0")
    return im


def saxifrage():
    im, d = canvas()
    # Two halves of the split pebble, roots visibly entering the fissure.
    d.polygon([(2, 9), (5, 7), (7, 8), (7, 11), (6, 14), (2, 14), (0, 12)], fill=K)
    d.polygon([(3, 9), (5, 8), (6, 9), (6, 12), (5, 13), (2, 13), (1, 12)], fill="#b8b8b0")
    d.line([(2, 10), (4, 9), (5, 9)], fill="#f0f0e8")
    d.polygon([(10, 8), (13, 8), (15, 11), (14, 14), (10, 15), (8, 13)], fill=K)
    d.polygon([(11, 9), (13, 9), (14, 11), (13, 13), (10, 14), (9, 12)], fill="#787888")
    d.line([(11, 9), (13, 10)], fill="#b8b8b0")
    d.line([(8, 7), (8, 10), (7, 12), (9, 14)], fill="#c8a878")
    for x, y in ((4, 6), (7, 4), (10, 5), (6, 8), (10, 8)):
        d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=K)
        d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=GREEN)
        d.point((x - 1, y - 1), fill=GREEN_H)
        d.point((x + 1, y + 1), fill=GREEN_S)
    d.line([(7, 3), (7, 1), (9, 1)], fill=GREEN_S)
    d.line([(8, 0), (10, 2)], fill="#f8f8f8")
    d.line([(10, 0), (8, 2)], fill="#f8f8f8")
    d.point((9, 1), fill="#e0c070")
    return im


def card():
    im, d = canvas()
    d.rectangle((3, 1, 15, 15), fill="#887850")
    d.rectangle((2, 0, 14, 14), fill=K)
    d.rectangle((3, 1, 13, 13), fill=PAPER)
    d.line([(3, 14), (13, 14), (13, 1)], fill=PAPER_S)
    d.rectangle((8, 11, 11, 13), fill="#f8f8f0")
    d.line([(9, 12), (10, 12)], fill="#988868")
    return im, d


def mark_cactus():
    im, d = card()
    d.ellipse((5, 2, 11, 9), fill=GREEN_S)
    d.ellipse((6, 2, 10, 8), fill=GREEN)
    d.line([(7, 3), (7, 5)], fill=GREEN_H)
    for x, y in ((6, 4), (9, 4), (8, 6), (10, 7), (6, 7)):
        d.point((x, y), fill="#e0d0a0")
    d.line([(8, 8), (7, 12)], fill=GREEN_S)
    d.line([(5, 10), (9, 10)], fill="#e0d8b8")
    return im


def mark_mangrove():
    im, d = card()
    d.polygon([(5, 2), (9, 3), (10, 6), (9, 9), (6, 7), (4, 4)], fill=GREEN_S)
    d.polygon([(5, 3), (8, 4), (9, 6), (8, 7), (6, 6)], fill=GREEN)
    d.line([(5, 3), (8, 7)], fill=GREEN_H)
    d.line([(8, 7), (6, 12)], fill="#786040")
    # The long viviparous propagule pressed alongside the leaf.
    d.line([(11, 4), (11, 8), (10, 10)], fill="#587048", width=2)
    d.line([(11, 5), (11, 9)], fill="#a8b870")
    d.point((11, 3), fill="#786040")
    d.line([(5, 10), (7, 10)], fill="#e0d8b8")
    d.line([(9, 8), (12, 8)], fill="#e0d8b8")
    return im


def raft():
    im, d = canvas((48, 14))
    for frame in range(2):
        x, y = frame * 24, frame
        # Bowl-shaped raised rim, shaded underside, radial leaf veins.
        d.ellipse((x, y, x + 23, y + 12), fill="#203838")
        d.ellipse((x + 1, y, x + 22, y + 11), fill="#386838")
        d.ellipse((x + 2, y + 1, x + 21, y + 9), fill="#88b858")
        d.ellipse((x + 3, y + 3, x + 20, y + 9), fill="#58a040")
        for ex, ey in ((4, 4), (7, 3), (12, 3), (17, 3), (20, 5), (18, 8), (6, 8)):
            d.line([(x + 12, y + 6), (x + ex, y + ey)], fill="#386838")
        d.arc((x + 2, y, x + 21, y + 9), 185, 295, fill="#c0d888")
        d.line([(x + 5, y + 10), (x + 18, y + 10)], fill="#88b858")
        d.line([(x + 7, y + 11), (x + 16, y + 11)], fill="#386838")
    return im


def build(write=True):
    items = {"cactus_sap": cactus_sap(), "lily_raft": lily_raft(), "saxifrage": saxifrage()}
    ui = {"mark_cactus": mark_cactus(), "mark_mangrove": mark_mangrove(), "raft": raft()}
    if write:
        common.write_set("items", items, "icons6")
        common.write_set("ui", ui, "icons6")
    return items, ui
