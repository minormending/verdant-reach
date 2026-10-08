"""Original 56x56 busts in cast6's 3/4-left, top-left-lit portrait style.

  signe   Conservatory head 7, the Frost warden: a long silver-blond braid
          over the near shoulder, an ice-blue felted coat with a deep white
          fur collar, a navy scarf knitted with snowflakes, a snowdrop
          pinned on the lapel; calm, kind eyes and a level mouth.
  skier   windburnt and grinning: a white bobble hat with the goggles pushed
          up onto it, a red quilted ski jacket zipped to the chin, a pair of
          yellow skis over the far shoulder.
"""
from __future__ import annotations

import common7 as common
from portraits import Portrait, face, head, neck, strands, torso

ICE = dict(base="#70a8d8", shade="#4068a8", hi="#b0d8f0")
FUR = dict(base="#f0f0f0", shade="#b0c0d0", hi="#f8f8f8")
NAVY = dict(base="#304070", shade="#202850", hi="#4c5c90")
BLOND = dict(base="#e8e0b0", shade="#b0a070", hi="#f8f8e0")
RED = dict(base="#e84030", shade="#a02020", hi="#f88060")
HAT = dict(base="#f0f0f0", shade="#a8b0c8", hi="#f8f8f8")
SKI = dict(base="#f0c838", shade="#b08018", hi="#f8e888")
BROWN = dict(base="#784828", shade="#503018", hi="#a06838")


def region(p, mask, ramp, **kwargs):
    return p.add(mask, **ramp, **kwargs)


def snowflake(p, x, y, c):
    p.pxs([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], c)


SNOWDROP = ["..GGG...", ".G...G..", ".G..KgK.", "G..KWWWK", "G..KWWwK", "GL.KWwwK",
            "GL..KwK.", "GL......", ".GL....."]
SNOWDROP_KEY = {"G": "#58a050", "L": "#387838", "g": "#88c868", "K": "k", "W": "#f8f8f8", "w": "#b0c0d0"}


def snowdrop(p, x, y):
    """The pinned sprig: an arching stalk, a nodding white bell, a strap leaf."""
    for j, row in enumerate(SNOWDROP):
        for i, c in enumerate(row):
            if c != ".":
                p.px(x + i, y + j, SNOWDROP_KEY[c])


def signe():
    p = Portrait()
    # --- the long coat and its deep fur collar ------------------------------
    torso(p, ICE["base"], ICE["shade"], hi=ICE["hi"], shoulder_y=40)
    p.add(p.line([(26, 47), (25, 55)]), ICE["shade"], line=False)                # the coat's front edge
    for y in (49, 53):
        p.pxs([(28, y), (29, y)], "#e0e8f0")                                        # toggle loops
        p.px(29, y + 1, ICE["shade"])
    neck(p, x0=24, x1=30)
    fur = p.poly([(5, 47), (7, 40), (13, 35), (20, 33), (28, 35), (36, 33), (44, 35), (50, 40), (51, 46),
                  (46, 45), (40, 47), (33, 48), (27, 49), (21, 48), (14, 49), (8, 50)])
    region(p, fur, FUR, shade_off=(2, 2))
    for x, y in ((9, 49), (16, 49), (23, 48), (31, 48), (38, 47), (45, 45), (49, 45)):   # tufted fur edge
        p.pxs([(x, y), (x + 1, y)], FUR["shade"])
    for x, y in ((12, 40), (18, 37), (42, 38), (47, 41)):
        p.pxs([(x, y), (x + 1, y + 1)], FUR["shade"])
    # --- the knitted scarf: a navy band with white snowflakes ---------------
    scarf = p.poly([(20, 34), (23, 31), (28, 33), (33, 31), (37, 33), (36, 38), (31, 40), (24, 40), (20, 38)])
    region(p, scarf, NAVY)
    tail = p.poly([(30, 37), (36, 37), (37, 50), (31, 51)])
    region(p, tail, NAVY, shade_off=(2, 1))
    for x, y in ((24, 36), (30, 36), (33, 42), (34, 47)):
        snowflake(p, x, y, "#f0f0f8")
    for x in range(22, 36, 2):
        p.px(x, 33 + (x % 4 == 0), NAVY["hi"])
    for x in (32, 34, 36):                                                          # fringe
        p.pxs([(x, 52), (x, 53)], "#4c5c90")
    # --- head ----------------------------------------------------------------
    head(p, rx=9, ry=11, jaw=1)
    face(p, eyes="calm", brow="flat", mouth_kind="flat", brow_c=BLOND["shade"])
    p.pxs([(19, 24), (31, 24)], "sk1")                                              # quiet lids
    p.pxs([(20, 28), (34, 27)], "#e8b8a8")                                          # cold-pink cheeks
    p.px(28, 29, "sk3")                                                             # the hint of a smile
    # --- silver-blond hair, centre-parted, drawn smoothly back --------------
    hair = p.poly([(16, 30), (16, 22), (17, 13), (21, 7), (28, 4), (35, 6), (40, 12), (41, 20), (40, 28), (37, 27),
                   (37, 19), (33, 14), (29, 12), (27, 13), (23, 15), (19, 19), (18, 23), (19, 30)])
    region(p, hair, BLOND)
    for x0, y0, dx in ((27, 6, -1), (24, 8, -1), (31, 7, 1), (34, 9, 1)):           # comb lines from the parting
        p.pxs([(x0 + dx * i, y0 + i) for i in range(4)], BLOND["shade"])
    p.pxs([(28, 5), (28, 6), (28, 7), (28, 8), (28, 9), (28, 10)], BLOND["shade"])  # the parting
    p.pxs([(22, 9), (23, 8), (21, 10)], BLOND["hi"])
    # --- the single long braid, over the near shoulder down to the chest ----
    for i, (x, y) in enumerate([(18, 31), (17, 35), (17, 39), (16, 43), (16, 47), (15, 51)]):
        dx = -1 if i % 2 else 1
        p.add(p.ellipse(x + dx, y, 3, 2), BLOND["base"], BLOND["shade"], hi=BLOND["hi"], shade_off=(1, 1))
    p.add(p.rect(12, 53, 16, 55), NAVY["base"], NAVY["shade"])                      # the tie
    # --- the snowdrop pinned on the fur --------------------------------------
    snowdrop(p, 39, 35)
    # --- a few snowflakes drifting past --------------------------------------
    for x, y in ((6, 10), (49, 6), (4, 30)):
        snowflake(p, x, y, "#a8c8e8")
    return p


def skier():
    p = Portrait()
    # --- skis over the far shoulder, tips curling forward past the hat -----
    for x0 in (44, 49):
        p.add(p.poly([(x0, 55), (x0 - 2, 10), (x0 - 4, 5), (x0 - 3, 3), (x0, 6), (x0 + 2, 55)]), SKI["base"],
              SKI["shade"], hi=SKI["hi"], shade_off=(1, 0), hi_off=(1, 0))
        p.add(p.line([(x0, 14), (x0 + 1, 55)]), "#c03020", line=False)              # a red racing stripe
        p.add(p.rect(x0 - 2, 44, x0 + 2, 47), "#383848", "#202028")                 # binding
    # --- the quilted red jacket, zipped to the chin ---------------------------
    torso(p, RED["base"], RED["shade"], hi=RED["hi"])
    for y in (44, 50):
        p.hline(7, 50, y, RED["shade"])                                             # quilting seams
    p.add(p.poly([(20, 33), (25, 31), (32, 31), (37, 33), (36, 40), (21, 40)]), RED["base"], RED["shade"],
          hi=RED["hi"])                                                             # high collar
    p.add(p.line([(28, 40), (28, 55)]), "#f0f0f0", line=False)                      # zip
    p.px(28, 41, "#a8b0c8")
    p.add(p.rect(5, 46, 51, 48), HAT["base"], HAT["shade"], line=False)             # chest stripe
    # --- head: windburnt, grinning -------------------------------------------
    head(p, jaw=1, cy=23)
    face(p, cy=23, eyes="happy", brow="raised", mouth_kind="grin", brow_c=BROWN["shade"], blush="n1")
    p.pxs([(19, 29), (20, 29), (33, 28)], "n1")
    p.pxs([(17, 28), (34, 29)], "sk1")
    region(p, p.rect(16, 18, 19, 25) | p.rect(36, 18, 39, 24), BROWN)               # hair at the temples
    # --- the white bobble hat and the goggles pushed up onto it --------------
    region(p, p.ellipse(28, 4, 4, 3), HAT)                                          # the bobble
    crown = p.ellipse(28, 15, 12, 10) & ~p.rect(0, 18, 55, 55)
    region(p, crown, HAT)
    for x, y in ((22, 8), (26, 7), (31, 7), (35, 9), (24, 14), (33, 14)):           # knit texture
        p.pxs([(x, y), (x, y + 1)], HAT["shade"])
    p.add(p.rect(15, 15, 41, 19), "#d0d8e8", "#98a0b8", hi="#f8f8f8")               # ribbed cuff
    for x in range(17, 41, 2):
        p.px(x, 17, "#98a0b8")
    p.pxs([(26, 3), (27, 2)], "#a8b0c8")
    p.add(p.rect(16, 10, 40, 11), "#383848", line=False)                            # goggle strap
    p.add(p.poly([(20, 8), (35, 8), (36, 12), (29, 13), (27, 11), (25, 13), (19, 12)]), "#58a8e8", "#3060b0",
          hi="#a8e0f8", shade_off=(2, 2))
    p.pxs([(21, 9), (22, 9), (21, 10), (31, 9)], "#f8f8f8")                         # lens glint
    return p


PORTRAITS = {"signe": signe, "skier": skier}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits7")
    return out
