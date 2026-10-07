"""Original 56x56 busts in cast5's 3/4-left, top-left-lit portrait style."""
from __future__ import annotations

import common6 as common
from portraits import Portrait, face, head, neck, strands, torso

NAVY = dict(base="#303868", shade="#1c2048", hi="#485888")
SAND = dict(base="#d0b888", shade="#988060", hi="#e8d8b0")
HAIR = dict(base="#503828", shade="#302020", hi="#785038")
WHITE = dict(base="#e8e8e8", shade="#b0b0b8", hi="#f8f8f8")


def region(p, mask, ramp, **kwargs):
    return p.add(mask, **ramp, **kwargs)


def straw_hat(p):
    region(p, p.poly([(15, 14), (19, 5), (24, 3), (34, 4), (40, 13)]),
           dict(base="#d8c088", shade="#a08850", hi="#f0dca0"))
    p.add(p.poly([(16, 12), (39, 11), (40, 15), (15, 16)]), "#907040", "#705028")
    p.add(p.poly([(6, 18), (11, 15), (24, 13), (42, 13), (49, 17), (44, 20), (16, 21)]),
          "#e0c890", "#a08850", hi="#f0dca0", shade_off=(3, 1), hi_off=(2, 1))
    for x in (18, 23, 28, 33):
        p.pxs([(x, 8), (x - 1, 9), (x + 1, 7)], "#a08850")


def reyes():
    p = Portrait()
    torso(p, **dict(top=NAVY["base"], shade=NAVY["shade"], hi=NAVY["hi"]))
    p.add(p.poly([(23, 34), (28, 43), (33, 34)]), "#d8e0e0", "#90a0b8")
    neck(p, skin="#d8a078", shade="#a87058")
    head(p, skin="#d8a078", shade="#a87058", jaw=1)
    face(p, eyes="narrow", brow="raised", mouth_kind="smile", brow_c=HAIR["shade"])
    # Weathered cheeks and crow's feet; a steady, confident gaze.
    p.pxs([(18, 26), (17, 27), (34, 26), (35, 27), (21, 29), (22, 30)], "#a87058")
    # Curls tucked under the cap, breaking the silhouette behind the ear.
    for x, y, rx, ry in [(18, 17, 3, 5), (17, 23, 2, 3), (39, 18, 4, 5), (41, 25, 3, 4), (39, 30, 3, 3)]:
        region(p, p.ellipse(x, y, rx, ry), HAIR)
    region(p, p.poly([(16, 15), (18, 7), (24, 4), (34, 4), (40, 9), (42, 15)]), NAVY)
    p.add(p.poly([(16, 12), (41, 12), (42, 16), (15, 16)]), "#d8b858", "#a07830", hi="#f0d888")
    region(p, p.poly([(7, 19), (12, 16), (24, 15), (43, 14), (48, 17), (44, 20), (14, 22)]), NAVY)
    p.pxs([(27, 9), (26, 10), (28, 10), (27, 11)], "#d8b858")
    # Double-breasted brass buttons, lapels and the specimen tin's strap.
    p.add(p.poly([(20, 36), (25, 43), (22, 46), (17, 39)]), NAVY["hi"], NAVY["base"])
    p.add(p.poly([(34, 35), (29, 43), (33, 46), (39, 38)]), NAVY["base"], NAVY["shade"])
    p.add(p.line([(12, 38), (38, 53)], 3), "#a88050", "#705030", line=False)
    for x in (24, 31):
        for y in (46, 51):
            p.pxs([(x, y), (x + 1, y)], "#d8b858")
            p.px(x + 1, y + 1, "#a07830")
    p.add(p.poly([(35, 46), (50, 44), (53, 47), (53, 54), (37, 55), (34, 52)]),
          "#90a8a0", "#587870", hi="#c8d8c8", shade_off=(2, 2))
    p.add(p.line([(37, 49), (50, 47)]), "#587870", line=False)
    p.pxs([(43, 48), (44, 48), (44, 49)], "#d8b858")
    return p


def brother_saguaro():
    p = Portrait()
    # Rib-wood staff: pale vertical grain, two little carved joints.
    p.add(p.line([(49, 55), (47, 7)], 4), "#c8a878", "#886840", hi="#e0c890", shade_off=(1, 0))
    for y in (14, 29, 42):
        p.pxs([(47, y), (48, y)], "#886840")
    torso(p, SAND["base"], SAND["shade"], hi=SAND["hi"], shoulder_y=39)
    p.add(p.poly([(19, 35), (26, 47), (29, 55), (24, 55), (15, 39)]), SAND["hi"], SAND["shade"])
    p.add(p.line([(33, 40), (37, 55)], 2), SAND["shade"], line=False)
    neck(p)
    head(p, rx=10, ry=12, jaw=1)
    face(p, eyes="narrow", brow="kind", mouth_kind="flat", brow_c="#b0b0b8")
    # Half-closed lids, with only a sliver of pupil below them.
    p.hline(19, 23, 24, "sk1")
    p.hline(29, 32, 24, "sk1")
    beard = p.poly([(17, 26), (22, 29), (27, 28), (35, 25), (38, 31), (35, 40), (29, 49), (23, 44), (17, 35)])
    region(p, beard, WHITE)
    strands(p, [(22, 35), (27, 39), (31, 35), (29, 44)], WHITE["shade"])
    region(p, p.poly([(21, 28), (25, 27), (29, 28), (33, 27), (35, 29), (28, 31), (22, 30)]), WHITE)
    straw_hat(p)
    p.add(p.ellipse(47, 44, 3, 4), "sk0", "sk1")
    return p


def calloway():
    p = Portrait()
    # Tight dark bun at the nape, tidy grey blouse inside a long white coat.
    p.add(p.ellipse(41, 17, 6, 6), "#303038", "#181820", hi="#585860")
    torso(p, "#f0f0e8", "#b0b8c0", hi="#f8f8f8")
    p.add(p.poly([(20, 35), (27, 39), (35, 34), (34, 55), (24, 55)]), "#888890", "#585860", hi="#b0b0b8")
    neck(p)
    head(p, rx=9, ry=11, jaw=1)
    face(p, eyes="narrow", brow="flat", mouth_kind="flat", brow_c="#303038")
    hair = p.poly([(17, 18), (17, 11), (21, 6), (28, 4), (35, 7), (39, 12), (39, 22),
                   (36, 24), (35, 16), (31, 12), (26, 13), (22, 16)])
    p.add(hair, "#303038", "#181820", hi="#585860")
    p.pxs([(22, 9), (23, 8), (25, 7), (27, 7)], "#585860")
    # Round wire spectacles, left looking pupils behind clear lenses.
    for x, rx in ((21, 4), (31, 3)):
        ring = p.ellipse(x, 24, rx, 4) & ~p.ellipse(x, 24, rx - 1, 3)
        p.add(ring, "#383840", line=False)
        for yy, xx in zip(*ring.nonzero()):
            p.px(int(xx), int(yy), "#383840")
    p.hline(25, 28, 23, "#383840")
    p.pxs([(18, 22), (19, 21), (29, 21)], "#c8d8e0")
    p.add(p.poly([(18, 35), (23, 39), (25, 48), (17, 43), (13, 38)]), "#f0f0e8", "#b0b8c0", hi="white")
    p.add(p.poly([(34, 34), (39, 36), (35, 44), (30, 47), (33, 39)]), "#f0f0e8", "#b0b8c0")
    # Clipboard held square against the body, with a metal clip and tidy lines.
    p.add(p.poly([(35, 39), (51, 41), (49, 55), (33, 54)]), "#c8a070", "#886840", hi="#e0c090")
    p.add(p.poly([(37, 42), (48, 43), (46, 53), (35, 52)]), "#f0f0e8", "#b0b8c0", line=False)
    p.add(p.rect(41, 40, 45, 42), "#9098a0", "#585860")
    for y in (46, 49):
        p.hline(38, 44, y, "#9098a0")
    p.add(p.ellipse(34, 49, 3, 4), "sk0", "sk1")
    return p


def sailor():
    p = Portrait()
    shirt = torso(p, "#e0e8e8", "#a0b0c0", hi="#f8f8f8")
    for y in (40, 46, 52):
        p.add(p.rect(0, y, 55, y + 2) & shirt, NAVY["base"], NAVY["shade"], line=False)
    neck(p, skin="#d8a078", shade="#a87058")
    head(p, skin="#d8a078", shade="#a87058")
    face(p, eyes="happy", brow="raised", mouth_kind="smile", brow_c=HAIR["shade"])
    region(p, p.rect(16, 16, 19, 22) | p.rect(35, 16, 39, 22), HAIR)
    crown = p.ellipse(28, 12, 12, 10) & ~p.rect(0, 16, 55, 55)
    region(p, crown, NAVY)
    for x in range(20, 38, 3):
        p.pxs([(x, y) for y in range(5, 14) if crown[y, x]], NAVY["shade"])
    p.add(p.rect(15, 14, 40, 18), NAVY["hi"], NAVY["base"], hi="#7888b0")
    for x in range(17, 40, 2):
        p.px(x, 16, NAVY["base"])
    return p


def diver():
    p = Portrait()
    torso(p, "#384850", "#202830", hi="#586878")
    p.add(p.poly([(16, 35), (19, 45), (21, 55), (16, 55), (11, 39)]), "#50a8a0", "#286870", hi="#80c8b8")
    p.add(p.poly([(38, 35), (42, 41), (45, 55), (39, 55), (35, 39)]), "#50a8a0", "#286870")
    p.add(p.line([(27, 38), (28, 55)]), "#b0b8c0", line=False)
    neck(p)
    head(p)
    face(p, eyes="wide", brow="raised", mouth_kind="smile", brow_c=HAIR["shade"])
    region(p, p.poly([(16, 18), (17, 9), (23, 5), (33, 6), (39, 11), (39, 19), (35, 16), (26, 13), (20, 17)]), HAIR)
    # Mask on the forehead, separated from the eyes below it.
    p.add(p.rect(14, 13, 41, 17), "#202830", line=False)
    p.add(p.poly([(16, 12), (26, 12), (28, 14), (30, 12), (39, 12), (39, 19), (31, 20), (28, 17), (25, 20), (16, 19)]),
          "#5898b0", "#286870", hi="#b8e0e8", shade_off=(1, 1))
    p.pxs([(19, 14), (20, 14), (19, 15), (33, 14), (34, 14)], "#e0f0f0")
    # A pair of long flippers held together; heel loops and diverging blades.
    for x, y in ((8, 38), (17, 40)):
        p.add(p.ellipse(x + 2, y, 3, 4) & ~p.ellipse(x + 2, y, 1, 2), "#286870", "#202830")
        p.add(p.poly([(x, y + 2), (x + 4, y + 2), (x + 7, 54), (x - 3, 55)]),
              "#50a8a0", "#286870", hi="#80c8b8", shade_off=(2, 1))
        p.add(p.line([(x + 1, y + 5), (x + 2, 53)]), "#286870", line=False)
    p.add(p.ellipse(19, 43, 4, 3), "sk0", "sk1")
    return p


def angler():
    p = Portrait()
    # Rod carried over the shoulder, its line and guide rings in silhouette.
    p.add(p.line([(43, 55), (47, 20), (49, 3)], 2), "#b09060", "#705030", hi="#e0c090", shade_off=(1, 0))
    p.add(p.line([(50, 4), (54, 10), (54, 30)]), "#a8b8c0", line=False)
    p.pxs([(50, 7), (48, 18), (47, 28)], "#383840")
    torso(p, "#a09868", "#706840", hi="#c8c090")
    for pts in ([(14, 36), (22, 35), (24, 55), (9, 55)], [(34, 35), (41, 36), (49, 55), (31, 55)]):
        p.add(p.poly(pts), "#506858", "#304840", hi="#809880")
    for x, y in ((13, 44), (34, 42), (36, 50)):
        p.add(p.rect(x, y, x + 7, y + 5), "#887048", "#584830", hi="#c8b078", shade_off=(1, 1))
        p.hline(x + 2, x + 5, y + 1, "#c8b078")
    neck(p)
    head(p, jaw=1)
    face(p, eyes="calm", brow="kind", mouth_kind="smile", brow_c=HAIR["shade"])
    region(p, p.rect(16, 16, 19, 24) | p.rect(35, 16, 39, 22), HAIR)
    p.add(p.poly([(16, 14), (19, 6), (24, 5), (35, 6), (40, 14)]), "#a09868", "#706840", hi="#c8c090")
    p.add(p.rect(16, 12, 40, 15), "#506050", "#303830")
    p.add(p.poly([(8, 19), (13, 15), (41, 14), (46, 17), (43, 20), (14, 22)]),
          "#b8b080", "#706840", hi="#d8d0a0", shade_off=(2, 1))
    p.pxs([(38, 12), (39, 11), (40, 10)], "#c8b078")
    p.add(p.ellipse(43, 48, 3, 4), "sk0", "sk1")
    return p


PORTRAITS = {"reyes": reyes, "brother_saguaro": brother_saguaro, "calloway": calloway,
             "sailor": sailor, "diver": diver, "angler": angler}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits6")
    return out
