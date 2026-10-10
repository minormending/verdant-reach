"""An original 56x56 bust in cast6-cast9's 3/4-left, top-left-lit style.

  rowan  ROWAN VALE, the Keeper: calm, tired and steadfast. The moss-green
         hood of his keeper's cloak is up but pushed back, framing a lean,
         weathered face; grey-streaked auburn hair (DR. VALE's red, gone dark
         and grey) shows at the brow and temple under its rim. Kind eyes
         with tired lids and the bags of twenty years at the gate, soft
         brows, a short grizzled beard round a quiet mouth. The cloak closes
         at the throat with a brass clasp over earth-brown clothes. His aspen
         staff stands at the right edge of the frame: pale wood with dark
         lenticel marks, a crook at the top and a small brass bell hung from
         its tip, his hand resting on the shaft.
"""
from __future__ import annotations

import common10 as common
from chars10 import (ASPEN, ASPEN_H, ASPEN_S, AUBURN, AUBURN_S, BEARD, BEARD_S, BELL, BELL_S, EARTH, EARTH_S,
                     GREY_STREAK, MOSS, MOSS_H, MOSS_S)
from portraits import Portrait, eye, head, neck, nose

HOOD = dict(base=MOSS, shade=MOSS_S, hi=MOSS_H)
WOOD = dict(base=ASPEN, shade=ASPEN_S, hi=ASPEN_H)
BRASS = dict(base=BELL, shade=BELL_S, hi="#f8e8a0")
HOOD_D = "#2e4428"                        # the hood's deep inside
SKIN, SKIN_S, LINE = "sk0", "sk1", "sk2"
BROW = "#7c4030"
GREY_S = "#9c948c"
LENTICEL = "#585448"


def rowan():
    p = Portrait()
    # --- the aspen staff at the right edge: crook and bell -------------------
    p.add(p.rect(47, 16, 50, 55), **WOOD, shade_off=(2, 0))
    crook = p.poly([(47, 17), (46, 9), (48, 5), (52, 3), (55, 5), (55, 10), (53, 11), (52, 7), (50, 7), (50, 17)])
    p.add(crook, **WOOD, shade_off=(1, 2))
    for x, y in ((48, 27), (49, 36), (48, 44), (48, 12)):                         # lenticels: single dashes
        p.hline(x, x + 1, y, LENTICEL)
    p.add(p.line([(54, 11), (54, 13)]), BELL_S, line=False)                        # the bell's cord
    p.add(p.poly([(52, 19), (53, 14), (55, 14), (56, 19)]) | p.rect(51, 18, 56, 19), **BRASS, shade_off=(1, 1))
    p.px(53, 15, "#f8e8a0")
    p.px(54, 20, BELL_S)                                                            # the clapper
    # --- the cloak over earth-brown clothes ----------------------------------
    cloak = p.poly([(3, 55), (4, 47), (9, 41), (18, 37), (37, 37), (46, 41), (51, 47), (52, 55)])
    p.add(cloak, MOSS, MOSS_S, hi=MOSS_H)
    p.add(p.poly([(22, 42), (28, 55), (34, 42), (31, 38), (25, 38)]), EARTH, EARTH_S)    # tunic
    p.add(p.poly([(14, 55), (17, 46), (24, 40), (28, 55)]), MOSS, MOSS_S, hi=MOSS_H)       # cloak fronts
    p.add(p.poly([(42, 55), (39, 46), (32, 40), (28, 55)]), MOSS, MOSS_S)
    for pts in ([(9, 47), (10, 54)], [(44, 46), (46, 54)], [(19, 48), (20, 54)]):
        p.add(p.line(pts), MOSS_S, line=False)                                    # folds
    # --- the hood's cowl round his neck and its deep inside ------------------
    p.add(p.ellipse(28, 21, 15, 17) | p.poly([(12, 30), (44, 30), (42, 40), (14, 40)]), HOOD_D, None)
    # --- his hand on the shaft ----------------------------------------------
    hand = p.poly([(44, 41), (51, 40), (53, 43), (52, 49), (45, 49), (43, 45)])
    p.add(hand, SKIN, SKIN_S, shade_off=(2, 2))
    for y in (43, 45, 47):
        p.hline(45, 50, y, LINE)
    neck(p, x0=23, x1=30, y0=30, y1=39)
    # --- head: lean and long-jawed --------------------------------------------
    head(p, cx=27, rx=9, ry=11, jaw=1, cy=23)
    # The beard: short and grizzled, along the jaw and up the cheeks to the
    # sideburns, leaving the lip clear under a trim moustache.
    beard = ((p.ellipse(26, 31, 9, 5) & ~p.rect(0, 0, 56, 30)) | p.rect(33, 24, 35, 31) | p.rect(17, 26, 18, 30)
             | p.poly([(17, 30), (20, 32), (32, 32), (35, 30), (35, 34), (17, 34)]))
    p.add(beard, BEARD, BEARD_S, shade_off=(2, 2))
    p.pxs([(21, 34), (25, 35), (29, 33), (18, 31), (34, 28), (34, 25), (23, 33), (31, 34)], GREY_STREAK)
    ey = 23
    xn, xf = 19, 28
    eye(p, xn, ey, "calm")
    eye(p, xf, ey, "calm", far=True)
    p.hline(xn, xn + 3, ey, "k")                                                  # tired lids
    p.hline(xf, xf + 2, ey, "k")
    p.pxs([(xn, ey + 3), (xn + 1, ey + 3), (xn + 2, ey + 3), (xf, ey + 3), (xf + 1, ey + 3)], SKIN_S)
    # Soft brows that lift a little at the inner ends: kind, not stern.
    p.pxs([(18, 21), (19, 20), (20, 20), (21, 20), (22, 21)], BROW)
    p.pxs([(28, 20), (29, 20), (30, 20), (31, 21)], BROW)
    nose(p, 27, 22)
    p.pxs([(25, 23), (25, 24)], SKIN_S)
    # The mouth in the beard: a quiet line, its near corner lifting.
    p.hline(20, 26, 29, BEARD)                                                    # moustache
    p.pxs([(19, 30), (27, 30)], BEARD_S)
    p.hline(21, 25, 31, "sk3")
    p.px(20, 30, "sk3")
    # A few lines: crow's feet, a crease across the brow, the hollow cheek.
    p.pxs([(32, 23), (32, 25)], SKIN_S)
    p.hline(21, 26, 17, SKIN_S)
    p.pxs([(31, 27), (30, 28)], SKIN_S)
    # --- hair under the hood's rim: auburn, streaked grey --------------------
    hair = p.poly([(17, 21), (18, 14), (23, 12), (31, 12), (36, 15), (37, 24), (35, 24), (34, 18), (29, 17),
                   (23, 17), (19, 19), (19, 22)])
    p.add(hair, AUBURN, AUBURN_S, hi="#d07850", shade_off=(2, 2))
    for pts in ([(24, 15), (27, 14)], [(34, 16), (36, 20)], [(19, 17), (20, 16)]):
        p.add(p.line(pts), GREY_STREAK, line=False)
    p.pxs([(30, 15), (36, 22)], GREY_S)
    # --- the hood: up but pushed back, its rim framing the face ---------------
    hood = (p.ellipse(28, 19, 15, 16) & ~p.ellipse(27, 24, 10, 12)) | p.poly([(13, 22), (16, 35), (20, 40), (12, 40)])
    hood = hood | p.poly([(41, 22), (43, 32), (40, 40), (36, 40), (38, 30)])
    hood = hood & ~p.rect(0, 41, 56, 56)
    p.add(hood, **HOOD, shade_off=(3, 2))
    rim = p.ellipse(27, 24, 11, 13) & ~p.ellipse(27, 24, 10, 12) & p.rect(0, 0, 56, 22)
    p.add(rim, MOSS_H, MOSS, line=False)                                          # the lit rim
    for pts in ([(20, 6), (25, 4)], [(38, 8), (41, 14)], [(14, 26), (15, 32)]):
        p.add(p.line(pts), MOSS_S, line=False)                                    # cloth folds
    # --- the brass clasp at the throat ----------------------------------------
    p.add(p.ellipse(28, 40, 2, 2), **BRASS, shade_off=(1, 1))
    p.px(27, 39, "#f8e8a0")
    return p


PORTRAITS = {"rowan": rowan}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits10")
    return out
