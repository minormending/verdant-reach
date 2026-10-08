"""Original 56x56 busts in cast6/cast7's 3/4-left, top-left-lit portrait style.

  mercer  MERCER THORNE: cool, unhurried, certain. A long face with a slight
          downward look under BRAM's heavy brow, silver-streaked blue-black
          hair swept back, a short trimmed grey beard, the charcoal frock
          coat's high collar standing up to frame the jaw, a gold root-knot
          pin, and the leather map tube's strap across the chest with its
          brass cap rising over the far shoulder. No sneer: he thinks he is
          right.
  wren    WREN, the Chapter 4 sensor engineer turned Rootstock admin. Her
          overworld navy-black crop swept over one eye with the teal streak,
          her teal work top and yellow lanyard, now under a dark green
          Rootstock jacket with a graft-tape armband, and a headset with a
          mic boom. Determined but conflicted: one brow set hard, the other
          lifted at its inner end, the mouth pressed tight.
"""
from __future__ import annotations

import common8 as common
from chars8 import BEARD, BEARD_S, BRASS, BRASS_S, COAT, COAT_S, HAIR, HAIR_S, LEATHER, LEATHER_S, SILVER, SILVER_S
from portraits import Portrait, face, head, neck, torso

CHARCOAL = dict(base=COAT, shade=COAT_S, hi="#787c8c")
MHAIR = dict(base=HAIR, shade=HAIR_S, hi="#4858a0")
GREY = dict(base=BEARD, shade=BEARD_S, hi=SILVER)
TUBE = dict(base=LEATHER, shade=LEATHER_S, hi="#c88850")

GREEN = dict(base="#2c5838", shade="#183420", hi="#447850")       # the Rootstock jacket
TEAL = dict(base="#408878", shade="#285850", hi="#68b0a0")        # her engineer's top
WHAIR = dict(base="#182858", shade="#101830", hi="#304080")       # navy-black crop
SET = dict(base="#484850", shade="#282830", hi="#888890")         # headset


def region(p, mask, ramp, **kwargs):
    return p.add(mask, **ramp, **kwargs)


def root_knot(p, x, y):
    """The Rootstock pin: a gold knot with three short roots splaying below."""
    for j, row in enumerate([".HG.", "GGGg", "g.g.g", "g...g"]):
        for i, c in enumerate(row):
            if c != ".":
                p.px(x + i, y + j, {"H": "#f8e8a0", "G": BRASS, "g": BRASS_S}[c])


def mercer():
    p = Portrait()
    # --- the map tube behind the far shoulder, its brass cap catching light --
    region(p, p.poly([(41, 44), (45, 12), (52, 13), (49, 45)]), TUBE, shade_off=(2, 0))
    region(p, p.ellipse(48, 12, 4, 2) | p.rect(44, 12, 52, 15), dict(base=BRASS, shade=BRASS_S, hi="#f8e8a0"),
           shade_off=(1, 1))
    p.hline(45, 51, 16, LEATHER_S)
    for y in (24, 32):                                                              # stitched bands
        p.hline(44, 49, y, LEATHER_S)
    # --- the frock coat --------------------------------------------------------
    torso(p, CHARCOAL["base"], CHARCOAL["shade"], hi=CHARCOAL["hi"], shoulder_y=41, x0=6, x1=50)
    p.add(p.poly([(23, 37), (28, 49), (33, 37)]), "#a8b0c0", "#787c90")              # shirt
    p.add(p.poly([(25, 38), (31, 38), (29, 44), (28, 46), (27, 44)]), "#303448", "#202030")   # dark cravat
    p.add(p.poly([(14, 41), (22, 37), (28, 50), (22, 54)]), CHARCOAL["base"], CHARCOAL["shade"],
          hi=CHARCOAL["hi"])                                                            # near lapel
    p.add(p.poly([(42, 40), (34, 37), (29, 50), (35, 52)]), CHARCOAL["base"], CHARCOAL["shade"])
    # the strap of the map tube, far shoulder to near hip
    p.add(p.line([(42, 41), (31, 50), (22, 55)], 3), LEATHER, LEATHER_S, line=False)
    p.pxs([(36, 46), (37, 46), (36, 47)], BRASS)                                      # buckle
    root_knot(p, 17, 45)
    neck(p, x0=24, x1=30, y0=30)
    # --- head: a long, lean face, a level gaze lowered toward the player -----
    head(p, rx=9, ry=12, jaw=2, cy=21)
    face(p, cy=21, eyes="calm", brow="flat", mouth_kind="flat", brow_c=HAIR_S)
    p.pxs([(21, 23), (30, 23)], "k")                                                 # heavy lids: the gaze drops
    # BRAM's heavy brow, set level rather than scowling.
    p.pxs([(19, 19), (20, 19), (21, 19), (22, 19), (29, 19), (30, 19), (31, 19)], HAIR_S)
    p.pxs([(20, 21), (21, 21), (22, 21), (29, 21), (30, 21)], "sk1")
    p.pxs([(19, 26), (31, 26)], "sk1")                                               # lines under the eyes
    p.pxs([(20, 28), (21, 29)], "sk1")                                               # hollow cheek
    # --- the short trimmed beard: a close band along the jaw and chin --------
    beard = p.poly([(19, 30), (22, 33), (28, 33), (33, 31), (36, 27), (37, 30), (34, 35), (29, 37), (24, 37),
                    (20, 34)])
    region(p, beard, GREY, line=False, shade_off=(2, 2))
    # The moustache over a level mouth (painted over face()'s mouth).
    p.hline(21, 30, 28, BEARD)
    p.hline(22, 29, 29, BEARD_S)
    p.pxs([(21, 28), (22, 27), (23, 27)], SILVER)
    p.hline(23, 27, 30, "sk3")
    p.hline(24, 26, 31, "sk1")
    p.pxs([(25, 35), (29, 35), (33, 32)], BEARD_S)
    # --- hair swept straight back, silver at the temples ---------------------
    hair = p.poly([(17, 17), (17, 11), (21, 6), (28, 3), (36, 4), (42, 8), (44, 15), (42, 22), (39, 25), (37, 17),
                   (33, 12), (27, 11), (21, 13)])
    region(p, hair, MHAIR)
    for pts in ([(22, 9), (27, 6), (33, 6)], [(24, 11), (30, 8), (37, 9)], [(30, 11), (36, 11), (40, 14)]):
        p.add(p.line(pts), MHAIR["shade"], line=False)                               # combed-back lines
    p.add(p.poly([(17, 15), (19, 11), (22, 9), (21, 12), (19, 16)]), SILVER, SILVER_S, line=False)
    p.add(p.line([(37, 16), (40, 12), (42, 15), (41, 21)], 2), SILVER, SILVER_S, line=False)
    p.pxs([(23, 7), (24, 6), (25, 6)], MHAIR["hi"])
    # --- the high collar, standing up either side of the jaw -----------------
    p.add(p.poly([(13, 42), (14, 29), (17, 27), (22, 36), (21, 40)]), CHARCOAL["base"], CHARCOAL["shade"],
          hi=CHARCOAL["hi"], shade_off=(1, 1))
    p.add(p.poly([(43, 39), (42, 27), (39, 28), (35, 36), (36, 39)]), CHARCOAL["base"], CHARCOAL["shade"],
          shade_off=(1, 1))
    p.pxs([(15, 31), (15, 33), (16, 35)], COAT_S)                                   # inner lining edge
    p.pxs([(40, 30), (39, 32)], COAT_S)
    return p


def wren():
    p = Portrait()
    # --- jacket over her work top ---------------------------------------------
    torso(p, GREEN["base"], GREEN["shade"], hi=GREEN["hi"], shoulder_y=40)
    region(p, p.poly([(21, 35), (28, 47), (34, 35)]), TEAL)                         # teal work top
    p.add(p.poly([(14, 40), (21, 35), (27, 52), (21, 55)]), GREEN["base"], GREEN["shade"], hi=GREEN["hi"])
    p.add(p.poly([(42, 39), (35, 35), (30, 52), (35, 55)]), GREEN["base"], GREEN["shade"])
    p.add(p.line([(27, 52), (27, 55)]), "#a8b0a8", line=False)                     # the zip, open
    # the yellow graft-tape armband on the far arm
    p.add(p.poly([(43, 43), (50, 45), (50, 51), (43, 49)]), "y1", "y2")
    p.pxs([(45, 45), (47, 47), (49, 49)], "y2")
    # the yellow lanyard and her badge (a RELAY pass, green-striped)
    p.add(p.line([(23, 36), (27, 45)]) | p.line([(33, 36), (30, 45)]), "y1", "y2", line=False)
    p.add(p.rect(25, 45, 33, 54), "#e8e8e0", "#b0b0a8")
    p.add(p.rect(26, 46, 32, 47), "#48a050", line=False)
    p.pxs([(27, 50), (28, 51), (29, 50), (30, 51), (31, 50)], "#406848")
    neck(p, x0=24, x1=30)
    # --- head: set jaw, a wary, resolved look ----------------------------------
    head(p, rx=9, ry=11, jaw=1)
    face(p, eyes="calm", brow="flat", mouth_kind="flat", brow_c=WHAIR["shade"])
    # Near brow pulled down and in (resolve); far brow lifted at its inner end (doubt).
    p.pxs([(19, 20), (20, 20), (21, 21), (22, 21), (23, 22)], WHAIR["shade"])
    p.pxs([(29, 19), (30, 20), (31, 20), (32, 20)], WHAIR["shade"])
    p.pxs([(28, 19), (33, 19), (32, 19), (31, 19), (30, 19)], "sk0")
    p.px(28, 20, WHAIR["shade"])
    p.hline(22, 26, 30, "sk3")                                                       # pressed mouth
    p.px(27, 31, "sk3")                                                              # one corner pulled down
    p.pxs([(20, 28), (34, 27)], "#e8b8a8")
    # --- the crop: swept over the far eye, a teal streak in the fringe -------
    hair = p.poly([(16, 22), (16, 13), (20, 7), (27, 4), (35, 5), (40, 10), (41, 18), (40, 27), (37, 28),
                   (35, 26), (33, 27), (31, 25), (28, 19), (24, 15), (20, 17), (18, 23)])
    region(p, hair, WHAIR)
    p.add(p.line([(28, 13), (31, 18), (33, 24)], 2), "q1", "q2", line=False)         # the teal streak
    p.add(p.line([(22, 10), (26, 13), (29, 17)]), WHAIR["hi"], line=False)
    # --- the headset: band over the crown, cup on the ear, mic at the mouth --
    p.add(p.line([(20, 9), (26, 4), (34, 4), (40, 10), (41, 18)], 2), SET["base"], SET["shade"])
    region(p, p.ellipse(39, 23, 3, 4), SET)
    p.add(p.line([(37, 27), (34, 30), (31, 31)]), SET["hi"], line=False)
    p.add(p.rect(29, 30, 30, 32), SET["base"], SET["shade"])
    p.px(39, 22, "#80e080")                                                         # the live light
    return p


PORTRAITS = {"mercer": mercer, "wren": wren}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits8")
    return out
