"""An original 56x56 bust in cast6-cast8's 3/4-left, top-left-lit style.

  rook  VALERIAN ROOK, the Dragon warden: stern and patient, the eyes level
        and a little narrowed under hard brows, weighing whoever stands in
        front of him. A long, deeply lined face (forehead creases, a frown
        line, crow's feet, folds from nose to mouth and a hollow under the
        cheekbone), white hair cropped close to the skull. The stone-grey
        mantle rides high on his shoulders with its collar standing up to
        the jaw, clasped at the throat with a bead of red resin, over the
        oxblood coat and a dark stock. His staff stands at the right edge of
        the frame: dragon-tree wood carved into a forked crown that cups a
        bead of resin, his old hand resting on the shaft below it.
"""
from __future__ import annotations

import common9 as common
from chars9 import (DARK, DARK_S, MANTLE, MANTLE_H, MANTLE_S, OXBLOOD, OXBLOOD_H, OXBLOOD_S, RESIN, RESIN_H,
                    RESIN_S, STAFF, STAFF_H, STAFF_S, WHITE_HAIR, WHITE_HAIR_S)
from portraits import Portrait, eye, head, neck, nose, torso

COAT = dict(base=OXBLOOD, shade=OXBLOOD_S, hi=OXBLOOD_H)
STONE = dict(base=MANTLE, shade=MANTLE_S, hi=MANTLE_H)
HAIR = dict(base=WHITE_HAIR, shade=WHITE_HAIR_S, hi="#f8f8f8")
WOOD = dict(base=STAFF, shade=STAFF_S, hi=STAFF_H)
BEAD = dict(base=RESIN, shade=RESIN_S, hi=RESIN_H)
SKIN, SKIN_S, LINE = "sk0", "sk1", "sk2"
BROW = "#585868"


def region(p, mask, ramp, **kwargs):
    return p.add(mask, **ramp, **kwargs)


def rook():
    p = Portrait()
    # --- the staff behind the far shoulder, its carved crown at the edge ----
    region(p, p.rect(46, 14, 50, 55), WOOD, shade_off=(2, 0))
    for y in (24, 31, 38):                                                      # carved rings
        p.hline(46, 50, y, STAFF_S)
        p.hline(47, 49, y + 1, STAFF_H)
    # The crown: the shaft forks into four carved tines that curl up round a
    # bead of resin, like a dragon tree's branches round its crown.
    crown = (p.poly([(44, 15), (42, 8), (43, 3), (46, 6), (47, 11), (49, 11), (50, 6), (53, 2), (55, 6),
                     (54, 12), (52, 16)]) | p.ellipse(48, 15, 5, 3))
    region(p, crown, WOOD, shade_off=(2, 2))
    region(p, p.ellipse(48, 8, 3, 3), BEAD, shade_off=(1, 1))
    p.pxs([(47, 7)], "#f8f8f8")
    p.pxs([(45, 11), (51, 11), (47, 14), (49, 14), (44, 9), (52, 9)], STAFF_S)        # carving cuts
    p.pxs([(43, 5), (46, 13), (53, 4)], STAFF_H)
    # --- the oxblood coat, the dark stock at the throat ----------------------
    torso(p, COAT["base"], COAT["shade"], hi=COAT["hi"], shoulder_y=42, x0=5, x1=50)
    p.add(p.poly([(22, 36), (28, 50), (34, 36)]), DARK, DARK_S, line=False)
    p.add(p.poly([(14, 46), (22, 41), (27, 55), (20, 55)]), COAT["base"], COAT["shade"], hi=COAT["hi"])
    p.add(p.poly([(42, 45), (34, 41), (30, 55), (38, 55)]), COAT["base"], COAT["shade"])
    # The coat's lapels, open over the stock.
    p.add(p.poly([(13, 55), (16, 47), (23, 42), (28, 55)]), COAT["base"], COAT["shade"], hi=COAT["hi"])
    p.add(p.poly([(43, 55), (40, 47), (33, 42), (29, 55)]), COAT["base"], COAT["shade"])
    # --- the high stone-grey mantle: a capelet on the shoulders, open at the
    # front, and a collar standing up either side of the jaw, clasped with
    # resin at the throat ------------------------------------------------------
    near = p.poly([(4, 51), (5, 45), (10, 40), (16, 37), (22, 40), (24, 43), (19, 46), (14, 50), (8, 52)])
    far = p.poly([(33, 42), (36, 39), (41, 37), (47, 40), (52, 45), (53, 50), (46, 51), (40, 47)])
    region(p, near | far, STONE)
    for pts in ([(9, 46), (11, 50)], [(16, 41), (17, 46)], [(44, 42), (47, 48)]):
        p.add(p.line(pts), MANTLE_S, line=False)                                   # folds
    p.add(p.poly([(14, 42), (14, 30), (17, 28), (23, 37), (25, 42)]), STONE["base"], STONE["shade"],
          hi=STONE["hi"], shade_off=(1, 1))
    p.add(p.poly([(42, 41), (41, 28), (38, 29), (33, 37), (32, 41)]), STONE["base"], STONE["shade"],
          shade_off=(1, 1))
    p.pxs([(16, 32), (16, 35), (17, 38)], MANTLE_S)                                 # inner edge
    p.pxs([(39, 31), (38, 34)], MANTLE_S)
    p.add(p.line([(24, 41), (28, 42), (32, 41)]), RESIN_S, line=False)             # the clasp chain
    region(p, p.ellipse(28, 42, 2, 2), BEAD, shade_off=(1, 1))                      # the clasp
    p.px(27, 41, RESIN_H)
    # --- his hand resting on the shaft --------------------------------------
    hand = p.poly([(44, 43), (51, 42), (53, 45), (52, 51), (45, 51), (43, 47)])
    p.add(hand, SKIN, SKIN_S, shade_off=(2, 2))
    for y in (45, 47, 49):
        p.hline(45, 50, y, LINE)                                                    # knuckle lines
    p.pxs([(46, 44), (48, 44)], "sk0")
    neck(p, x0=24, x1=30, y0=30, y1=40)
    p.pxs([(26, 34), (27, 36)], SKIN_S)                                             # sinews
    # --- head: long and lean, level and unhurried ---------------------------
    head(p, rx=9, ry=12, jaw=2, cy=21)
    ey = 22
    xn, xf = 20, 29
    eye(p, xn, ey, "calm")
    eye(p, xf, ey, "calm", far=True)
    p.hline(xn, xn + 3, ey, "k")                                                    # heavy lids
    p.hline(xf, xf + 2, ey, "k")
    p.pxs([(xn, ey + 3), (xn + 1, ey + 3), (xn + 2, ey + 3), (xf + 1, ey + 3)], SKIN_S)   # bags
    # Hard brows, thick and drawn down toward the nose; a frown line between.
    p.pxs([(19, 19), (20, 19), (21, 19), (19, 20), (20, 20), (21, 20), (22, 20), (23, 21)], BROW)
    p.pxs([(28, 21), (29, 20), (30, 20), (31, 20), (32, 20), (29, 19), (30, 19), (31, 19)], BROW)
    p.pxs([(25, 18), (25, 19)], SKIN_S)
    nose(p, 28, 21)
    p.pxs([(26, 22), (26, 23)], SKIN_S)                                             # the bridge
    # The set mouth, its corners pulled a pixel down.
    p.hline(22, 27, 29, "sk3")
    p.pxs([(21, 30), (28, 30)], "sk3")
    p.hline(23, 26, 30, SKIN_S)
    # Lines, few and placed: two forehead creases, crow's feet at the far
    # eye, the folds from nose to mouth, the hollow under the cheekbone and
    # the shadow of a hard chin.
    p.hline(21, 24, 15, SKIN_S)
    p.hline(27, 31, 15, SKIN_S)
    p.hline(22, 30, 17, SKIN_S)
    p.pxs([(33, 22), (33, 24)], SKIN_S)
    p.pxs([(21, 25), (20, 26), (20, 27), (29, 25), (30, 26), (30, 27)], LINE)
    p.pxs([(33, 27), (32, 28), (32, 29)], SKIN_S)
    p.hline(23, 26, 33, SKIN_S)
    # --- white hair cropped close: a thin cap hugging the skull, the hairline
    # high and square, a short sideburn above the far ear --------------------
    hair = p.poly([(18, 17), (18, 13), (21, 9), (28, 7), (35, 8), (38, 11), (39, 15), (38, 20), (36, 20),
                   (35, 15), (31, 13), (26, 13), (21, 14), (20, 17)])
    region(p, hair, HAIR, shade_off=(2, 2))
    for pts in ([(23, 10), (25, 9)], [(30, 9), (32, 9)], [(36, 12), (36, 13)]):
        p.add(p.line(pts), WHITE_HAIR_S, line=False)                               # crop texture
    return p


PORTRAITS = {"rook": rook}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits9")
    return out
