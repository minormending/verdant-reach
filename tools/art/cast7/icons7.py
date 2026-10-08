"""The LOST CLIMBER's pack (a key-item icon) and the SNOWDROP MARK.

Both follow cast6's small-icon rules: black contours, light from the top
left, a few clustered highlights. The Mark is a pressed specimen on the same
cream herbarium card as the other Marks.
"""
from __future__ import annotations

import common7 as common
from PIL import Image, ImageDraw

K = "#181818"
PAPER, PAPER_S = "#f0e8c8", "#c8b890"
RED, RED_S, RED_D, RED_H = "#d84030", "#982018", "#601010", "#f08060"
ROPE, ROPE_S, ROPE_H = "#4890d8", "#285898", "#a8d8f8"
STEEL, STEEL_S, STEEL_H = "#a8b0c0", "#606878", "#e8f0f8"
HAFT, HAFT_S = "#c08848", "#805020"


def canvas(size=(16, 16)):
    im = Image.new("RGBA", size)
    return im, ImageDraw.Draw(im)


def climber_pack():
    im, d = canvas()
    # The coiled climbing rope strapped across the top; the pack shows through its hole.
    d.ellipse((2, 0, 12, 6), fill=K)
    d.ellipse((3, 1, 11, 5), fill=ROPE)
    d.ellipse((5, 2, 9, 4), fill=K)
    d.line([(6, 3), (8, 3)], fill=RED_S)
    d.line([(4, 2), (6, 1), (9, 1)], fill=ROPE_H)
    d.line([(10, 4), (8, 5), (5, 5)], fill=ROPE_S)
    d.point((11, 3), fill=ROPE_S)
    # The rucksack: rounded body, a darker lid flap, two buckled straps.
    d.polygon([(3, 5), (11, 5), (13, 7), (13, 14), (12, 15), (3, 15), (2, 14), (2, 7)], fill=K)
    d.polygon([(3, 6), (11, 6), (12, 7), (12, 14), (3, 14), (3, 7)], fill=RED)
    d.rectangle((3, 6, 12, 9), fill=RED_S)
    d.line([(4, 7), (10, 7)], fill=RED)
    d.line([(3, 9), (12, 9)], fill=RED_D)
    d.line([(3, 7), (3, 13)], fill=RED_H)
    d.line([(4, 10), (4, 11)], fill=RED_H)
    d.line([(12, 10), (12, 14)], fill=RED_S)
    d.line([(4, 14), (11, 14)], fill=RED_S)
    for x in (5, 9):
        d.line([(x, 7), (x, 13)], fill="#383848")
        d.point((x, 10), fill=STEEL_H)
    # The dent: a crumpled crease low on the bag.
    d.line([(7, 11), (8, 12)], fill=RED_D)
    d.point((7, 12), fill=RED_H)
    # The ice axe strapped on the side: haft, steel head and pick.
    d.line([(14, 5), (14, 15)], fill=K)
    d.line([(13, 4), (13, 15)], fill=HAFT)
    d.point((13, 15), fill=STEEL_S)
    d.rectangle((11, 1, 15, 4), fill=K)
    d.line([(11, 2), (14, 2)], fill=STEEL)
    d.point((12, 2), fill=STEEL_H)
    d.line([(15, 3), (15, 3)], fill=STEEL_S)
    d.point((14, 3), fill=STEEL_S)
    d.point((11, 3), fill=STEEL_S)
    d.line([(12, 12), (14, 12)], fill="#383848")
    d.line([(12, 7), (14, 7)], fill="#383848")
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


def mark_snowdrop():
    im, d = card()
    # Two grey-green strap leaves pressed flat beside the stalk.
    d.line([(5, 12), (5, 11), (4, 10), (4, 6)], fill="#486848")
    d.line([(5, 10), (5, 7)], fill="#88a880")
    d.line([(7, 12), (7, 11), (8, 10)], fill="#486848")
    # The stalk arches over; the white bell nods from a green ovary at its tip.
    d.line([(6, 12), (6, 4), (7, 3), (8, 2), (9, 3)], fill="#587848")
    d.point((9, 4), fill="#88c068")
    for x, y, c in ((9, 5, "#f8f8f8"), (8, 6, "#f8f8f8"), (9, 6, "#f8f8f8"), (10, 6, "#d0d8e0"),
                    (8, 7, "#f8f8f8"), (9, 7, "#d0d8e0"), (10, 7, "#d0d8e0"), (8, 8, "#f8f8f8"), (10, 8, "#d0d8e0"),
                    (9, 8, "#88c068"),
                    (8, 5, "#a0a8b0"), (10, 5, "#a0a8b0"), (7, 6, "#a0a8b0"), (11, 6, "#a0a8b0"),
                    (7, 7, "#a0a8b0"), (11, 7, "#a0a8b0"), (7, 8, "#a0a8b0"), (11, 8, "#a0a8b0"),
                    (8, 9, "#a0a8b0"), (10, 9, "#a0a8b0")):
        d.point((x, y), fill=c)
    return im


def build(write=True):
    items = {"climber_pack": climber_pack()}
    ui = {"mark_snowdrop": mark_snowdrop()}
    if write:
        common.write_set("items", items, "icons7")
        common.write_set("ui", ui, "icons7")
    return items, ui
