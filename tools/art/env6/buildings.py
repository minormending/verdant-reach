"""Original coastal architecture: weatherboard, mangrove, glass and adobe.

Native integer pixels, top-left light, transparent outside each silhouette.
Each door is bottom-aligned within the contract's exact door tile.
"""
import math
from PIL import Image, ImageDraw
import kit
from structures import FONT

SIZES = {"harbour_house": (4, 3), "lantern_tree": (3, 4),
         "tide_conservatory": (6, 4), "adobe_conservatory": (6, 4),
         "driftwood_hut": (4, 3)}
IMAGES = {}
WOOD = kit.WOOD
LEAF = ("#b8d880", "#78a858", "#487850", "#285040")
ADOBE = ("#f0d8a0", "#d8b078", "#a88060", "#685058")
GLASS = ("#d8f0d8", "#98d0c0", "#58a0a0", "#386878")


def canvas(w, h):
    im = Image.new("RGBA", (w*16, h*16))
    return im, ImageDraw.Draw(im)


def label(d, text, x, y, colour):
    for ch in text:
        for yy, row in enumerate(FONT[ch]):
            for xx, p in enumerate(row):
                if p == "#": d.point((x+xx, y+yy), fill=colour)
        x += 4


def window(d, x, y, w, h):
    d.rectangle((x, y, x+w, y+h), fill=WOOD[3])
    d.rectangle((x+1, y+1, x+w-1, y+h-1), fill=GLASS[1])
    d.rectangle((x+w//2, y+h//2, x+w-1, y+h-1), fill=GLASS[2])
    d.line([(x+2, y+4), (x+4, y+2)], fill=GLASS[0])
    d.line([(x+w//2, y+1), (x+w//2, y+h-1)], fill=WOOD[3])
    d.line([(x-1, y+h+1), (x+w+1, y+h+1)], fill=WOOD[0])


def door(d, tx, ty, glass=False):
    x, y = tx*16, ty*16
    d.rectangle((x+2, y, x+13, y+14), fill=WOOD[3])
    d.rectangle((x+3, y+1, x+12, y+13), fill=GLASS[2] if glass else WOOD[1])
    for xx in (x+5, x+8, x+11):
        d.line([(xx, y+2), (xx, y+12)], fill=GLASS[3] if glass else WOOD[2])
    d.line([(x+3, y+1), (x+3, y+12)], fill=GLASS[0] if glass else WOOD[0])
    d.point((x+10, y+8), fill=ADOBE[0])
    d.rectangle((x+1, y+14, x+14, y+15), fill=ADOBE[2])
    d.line([(x+1, y+14), (x+14, y+14)], fill=ADOBE[0])


def cactus(d, x, y, small=False):
    h = 8 if small else 13
    d.line([(x+1, y), (x+1, y-h)], fill=LEAF[3], width=4)
    d.line([(x, y-1), (x, y-h)], fill=LEAF[1], width=2)
    d.line([(x-5, y-h+3), (x-5, y-4), (x-1, y-4)], fill=LEAF[2], width=3)
    d.line([(x+5, y-h+1), (x+5, y-6), (x+2, y-6)], fill=LEAF[2], width=3)
    d.line([(x-6, y-h+3), (x-6, y-5)], fill=LEAF[0])


def cottage(hut=False):
    im, d = canvas(4, 3)
    d.ellipse((2, 41, 63, 47), fill=WOOD[3])
    d.rectangle((5, 19, 59, 44), fill=WOOD[1])
    for y in range(20, 43, 4):
        d.line([(5, y), (59, y)], fill=WOOD[0])
        d.line([(6, y+3), (59, y+3)], fill=WOOD[2])
    d.rectangle((56, 20, 59, 44), fill=WOOD[2])
    if hut:
        # Palm thatch: an uneven, low hipped roof with long drooping fibres.
        d.polygon([(1, 22), (10, 6), (46, 3), (63, 22)], fill=ADOBE[2])
        d.polygon([(2, 19), (10, 6), (45, 3), (57, 19)], fill=ADOBE[1])
        for x in range(4, 61, 4):
            top = 4 + abs(x-31)//8
            d.line([(31+(x-31)//2, top), (x, 21 + (x//4)%3)], fill=ADOBE[0] if x < 35 else ADOBE[2])
        # Uneven upright driftwood braces distinguish it from weatherboard.
        for x in (5, 36, 58):
            d.line([(x, 22), (x-1, 42)], fill=WOOD[2], width=2)
            d.line([(x-1, 23), (x-2, 41)], fill=WOOD[0])
    else:
        d.polygon([(0, 20), (14, 4), (48, 4), (63, 20)], fill=GLASS[3])
        d.polygon([(2, 17), (14, 4), (46, 4), (58, 17)], fill=GLASS[2])
        for y in (7, 11, 15):
            d.line([(14-(y-4), y), (46+(y-4), y)], fill=GLASS[1])
        d.line([(14, 4), (48, 4)], fill=GLASS[0])
        d.rectangle((18, 12, 45, 18), fill=WOOD[3])
        label(d, "MARKET", 20, 13, WOOD[0])
        # Net suspended on the eastern wall; diamonds and scalloped hem.
        d.polygon([(38, 23), (54, 23), (53, 37), (45, 40), (39, 36)], fill=WOOD[2])
        for x in range(36, 56, 4):
            d.line([(x, 24), (min(x+10, 54), 35)], fill=WOOD[0])
            d.line([(min(x+10, 54), 24), (x, 35)], fill=WOOD[1])
        d.line([(38, 23), (54, 23)], fill=WOOD[3])
    window(d, 7, 24, 9, 7)
    if hut: window(d, 43, 25, 9, 7)
    door(d, 1, 2)
    return im


def tree():
    im, d = canvas(3, 4)
    d.ellipse((2, 54, 47, 63), fill=kit.BASALT[3])
    d.polygon([(4, 58), (11, 50), (35, 49), (45, 58), (39, 61), (8, 61)], fill=kit.BASALT[1])
    d.line([(7, 55), (13, 51), (31, 50)], fill=kit.BASALT[0], width=2)
    d.polygon([(20, 16), (29, 16), (29, 40), (36, 56), (27, 52), (23, 42), (19, 56), (12, 58), (20, 38)], fill=WOOD[2])
    d.line([(22, 20), (22, 39), (17, 54)], fill=WOOD[0], width=2)
    d.line([(26, 25), (27, 43), (32, 53)], fill=WOOD[3], width=2)
    # Long arching prop roots, with water/rock visible in their gaps.
    for pts in ([(22, 35), (13, 38), (9, 48), (7, 55)], [(27, 34), (36, 40), (40, 53)]):
        d.line(pts, fill=WOOD[3], width=4)
        d.line([(x-1, y-1) for x, y in pts], fill=WOOD[1], width=2)
    lobes = [(12, 16, 11, 10), (25, 11, 13, 10), (36, 19, 11, 11), (22, 24, 18, 10)]
    for x, y, rx, ry in lobes:
        d.ellipse((x-rx, y-ry, x+rx, y+ry), fill=LEAF[3])
        d.ellipse((x-rx, y-ry, x+rx-2, y+ry-3), fill=LEAF[2])
        d.ellipse((x-rx+2, y-ry+1, x+rx-5, y+ry-7), fill=LEAF[1])
        d.arc((x-rx+3, y-ry+2, x+rx-5, y+ry-6), 190, 270, fill=LEAF[0], width=2)
    # A few warm fireflies, each a connected light cluster, never a face.
    for x, y in ((7, 31), (38, 33), (33, 10)):
        d.line([(x-1, y), (x+1, y)], fill="#f0e8a0")
        d.point((x, y-1), fill="#f8f0d0")
    return im


def tide():
    im, d = canvas(6, 4)
    d.rectangle((3, 52, 93, 62), fill=GLASS[3])
    d.rectangle((4, 30, 91, 54), fill=GLASS[1])
    d.rectangle((70, 31, 91, 54), fill=GLASS[2])
    # A single curling wave roof: high crest west, long rolling tail east.
    top = [(2, 29), (6, 18), (14, 9), (25, 4), (37, 4), (45, 9), (44, 15),
           (37, 18), (40, 11), (33, 9), (27, 12), (24, 19), (31, 25),
           (48, 26), (61, 21), (72, 18), (84, 20), (94, 29)]
    d.polygon(top, fill=GLASS[3])
    d.line(top[:-1], fill=GLASS[0], width=2)
    d.polygon([(7, 28), (12, 19), (21, 13), (20, 22), (30, 29), (49, 30), (64, 24), (77, 22), (88, 27)], fill=GLASS[2])
    for x in (8, 23, 38, 73, 88):
        window(d, x, 34, 10, 16)
    # Pools visible through the lower glass; ripples, no repeated border.
    for x in (8, 29, 74):
        d.line([(x, 47), (x+7, 47)], fill=GLASS[0])
    d.rectangle((17, 27, 80, 33), fill=WOOD[3])
    label(d, "CONSERVATORY", 25, 28, GLASS[0])
    door(d, 3, 3, True)
    return im


def adobe():
    im, d = canvas(6, 4)
    d.ellipse((3, 6, 91, 78), fill=ADOBE[3])
    d.ellipse((3, 5, 88, 76), fill=ADOBE[1])
    d.ellipse((5, 6, 72, 60), fill=ADOBE[0])
    d.rectangle((6, 39, 89, 60), fill=ADOBE[1])
    d.rectangle((79, 39, 89, 60), fill=ADOBE[2])
    d.rectangle((4, 60, 92, 63), fill=ADOBE[3])
    # Soft adobe dome silhouette, stepped native-pixel oculus at its crown.
    d.ellipse((32, 9, 63, 25), fill=ADOBE[3])
    d.ellipse((34, 10, 61, 23), fill=GLASS[1])
    d.arc((35, 11, 60, 23), 190, 300, fill=GLASS[0], width=2)
    d.line([(48, 10), (48, 23)], fill=GLASS[3])
    d.line([(35, 17), (60, 17)], fill=GLASS[3])
    for x in (18, 72): window(d, x, 38, 10, 11)
    d.rectangle((20, 28, 78, 35), fill=ADOBE[2])
    label(d, "CONSERVATORY", 25, 30, ADOBE[0])
    door(d, 3, 3)
    cactus(d, 9, 58); cactus(d, 86, 59, True)
    # Quiet small plaster cracks show age without noisy stippling.
    d.line([(65, 40), (66, 44), (64, 46)], fill=ADOBE[2])
    return im


def build():
    IMAGES.update(harbour_house=cottage(), driftwood_hut=cottage(True),
                  lantern_tree=tree(), tide_conservatory=tide(), adobe_conservatory=adobe())
    for key, im in IMAGES.items():
        assert im.size == tuple(v*16 for v in SIZES[key])
