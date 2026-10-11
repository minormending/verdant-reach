"""Original 56x56 busts in cast8-cast10's 3/4-left, top-left-lit style.

  belladonna  BELLADONNA, the Apothecary: cool and appraising. A long,
              elegant older face, the eyes level and a little narrowed under
              a far brow arched in question, a small closed plum smile that
              lifts at one corner; fine lines at the eye and from nose to
              mouth. Near-black hair streaked with one silver lock, swept up
              from the temples into a high bun, pinned with a sprig of
              nightshade: two green leaves, a violet bell and three glossy
              black berries. A deep plum gown with a high black lace collar
              and a jet-and-plum brooch; one black-lace-gloved hand raised at
              the shoulder, closed round a tiny stoppered vial of aqua
              tincture.
  mimi_osa    MIMI OSA, the Sleeper: sleepy and serene. A soft round young
              face, the eyes half closed under heavy lids, a gentle smile
              and pink cheeks. A lavender nightcap with a cream cuff, its
              long tip flopping over to the right and hanging past the
              shoulder to a cream pom-pom; soft brown hair falling from under
              the cuff; a pink powder-puff mimosa flower with its feathery
              leaflets pinned at the near ear. A lilac robe crossed over a
              cream nightgown; a small round paper lantern glowing warm in
              her hand at the lower right.
  titus_arum  TITUS ARUM, the Rotter: a big broad grin. A wide ruddy face,
              crinkled happy eyes under bushy brows, wild dark hair and a
              huge wild beard round an open laughing mouth. A maroon leather
              apron bib on brass-buckled straps over a moss-olive shirt, a
              few crumbs of compost on the leather, and a huge spade on his
              far shoulder: the worn ash haft running up behind him to the
              steel blade at the top right of the frame.
  pyra        PYRA, the Kindler: fierce and bright. A young face with a
              dusting of freckles, the brows drawn down hard over wide, keen
              eyes and a fierce open grin. A big mop of flame-red curls with
              orange lights, a pair of amber-lensed goggles pushed up on top
              of them; a safety-orange field jacket with a stand-up collar
              and a silver reflective stripe across the chest; her iron
              ember lantern held up at the lower right, embers glowing and
              sparks rising.

Every portrait keeps the shared kit (portraits.Portrait): labelled regions
auto-shaded from the top left and outlined, then faces, strands and props
painted pixel by pixel. Each has a silhouette prop nobody else carries: the
raised vial, the drooping nightcap, the spade blade, the goggles and lantern.
"""
from __future__ import annotations

import common11 as common
from chars11 import (APRON, APRON_H, APRON_S, BEARD, BEARD_H, BEARD_S, BERRY, CAP, CAP_S, CREAM,
                     CREAM_S, EMBER, EMBER_H, EMBER_S, FLAME, FLAME_H, FLAME_S, GLOVE, GLOVE_S,
                     GOGGLE, GOGGLE_S, HAFT, HAFT_S, IRON, IRON_S, LEAF, LEAF_S, LILAC, LILAC_H, LILAC_S,
                     MIMOSA, MIMOSA_H, MIMOSA_S, NIGHT_HAIR, NIGHT_HAIR_H, NIGHT_HAIR_S, PAPER, PAPER_H, PAPER_S,
                     PLUM, PLUM_H, PLUM_S, SAFETY, SAFETY_H, SAFETY_S, SHIRT, SHIRT_S, SOFT_HAIR, SOFT_HAIR_S,
                     STEEL, STEEL_H, STEEL_S, STRAP, STRIPE, STRIPE_S, TAN, TAN_S, VIAL_AQUA)
from portraits import Portrait, eye, head, neck, nose

SK = dict(skin="sk0", shade="sk1")


def ramp(p, mask, base, shade=None, hi=None, **kw):
    return p.add(mask, base, shade, hi=hi, **kw)


# =============================================================================
# Belladonna
# =============================================================================
LACE = "#241c28"
LIP, LIP_S = "#a03860", "#702040"
SILVER = "#a8a4b8"


def belladonna():
    p = Portrait()
    # --- the high bun behind the crown --------------------------------------
    ramp(p, p.ellipse(31, 7, 8, 6), NIGHT_HAIR, NIGHT_HAIR_S, NIGHT_HAIR_H, shade_off=(2, 2))
    # --- the gown: plum shoulders, a high black lace collar -----------------
    torso = p.poly([(5, 55), (6, 47), (12, 41), (21, 38), (35, 38), (44, 41), (50, 47), (51, 55)])
    ramp(p, torso, PLUM, PLUM_S, PLUM_H)
    for pts in ([(14, 46), (15, 54)], [(42, 46), (43, 54)]):
        p.add(p.line(pts), PLUM_S, line=False)
    neck(p, x0=24, x1=30, y0=29, y1=38, **SK)
    # The high collar of black lace: an open diamond mesh over the throat with
    # a scalloped top edge, closed by a jet-and-plum brooch.
    collar = p.poly([(19, 40), (21, 34), (34, 34), (36, 40), (31, 44), (24, 44)])
    ramp(p, collar, LACE, None)
    lace = len(p.regions) - 1
    for y in range(34, 45):
        for x in range(18, 38):
            if p.label[y, x] == lace and y > 34 and ((x + y) % 4 == 0 or (x - y) % 4 == 0):
                p.px(x, y, "sk1" if y < 38 else PLUM)
    for x in range(21, 35, 2):
        p.px(x, 33, LACE)                                                          # scallops
    ramp(p, p.ellipse(27, 42, 2, 2), PLUM_H, PLUM_S, shade_off=(1, 1))              # the brooch
    p.px(26, 41, "#f8f8f8")
    # --- head: long and elegant ---------------------------------------------
    head(p, cx=27, cy=21, rx=9, ry=11, jaw=2, **SK)
    ey = 22
    xn, xf = 19, 28
    # Level, narrowed eyes: a long lid line over a half-hidden iris, plum
    # shadow on the lid above, the lashes flicking out at the corners.
    for x0, w, far in ((xn, 4, False), (xf, 3, True)):
        p.hline(x0, x0 + w - 1, ey, PLUM_S)
        p.hline(x0 - (0 if far else 1), x0 + w - 1, ey + 1, "k")
        p.px(x0 + w, ey, "k")
        p.pxs([(x0, ey + 2), (x0 + 1, ey + 2)], "k")
        p.px(x0 + 1, ey + 2, "r2")
        p.px(x0 + 2, ey + 2, "white")
        p.hline(x0, x0 + w - 2, ey + 3, "sk1")
    # Brows: the near one level and fine, the far one arched in question.
    p.pxs([(17, 19), (18, 19), (19, 18), (20, 18), (21, 18), (22, 19)], NIGHT_HAIR_S)
    p.pxs([(28, 18), (29, 17), (30, 16), (31, 16), (32, 17)], NIGHT_HAIR_S)
    nose(p, 27, 21)
    p.pxs([(25, 22), (25, 23)], "sk1")
    # A small closed smile in plum, lifting at the far corner.
    p.hline(22, 25, 29, LIP_S)
    p.pxs([(26, 28)], LIP_S)
    p.hline(23, 24, 30, LIP)
    # Fine lines: crow's feet, nose to mouth, under the cheekbone.
    p.pxs([(32, 22), (32, 24)], "sk1")
    p.pxs([(20, 26), (19, 27)], "sk1")
    p.pxs([(31, 27), (31, 28)], "sk1")
    # --- hair: swept up and back from the face to the bun -------------------
    hair = p.poly([(17, 21), (17, 14), (21, 9), (28, 7), (35, 9), (38, 14), (38, 24), (36, 27), (35, 18),
                   (31, 13), (25, 12), (20, 15), (19, 21)])
    ramp(p, hair, NIGHT_HAIR, NIGHT_HAIR_S, NIGHT_HAIR_H, shade_off=(2, 2))
    for pts in ([(21, 12), (26, 9), (31, 9)], [(32, 12), (36, 15), (37, 21)], [(19, 16), (22, 12)]):
        p.add(p.line(pts), NIGHT_HAIR_S, line=False)                               # combed-up lines
    p.add(p.line([(19, 18), (20, 14), (23, 11), (28, 9)]), SILVER, line=False)     # one silver lock
    p.add(p.line([(24, 7), (29, 6), (35, 8)]), NIGHT_HAIR_S, line=False)            # the bun's base
    # --- the nightshade sprig pinned at the bun ------------------------------
    for base, tip in (((37, 9), (44, 4)), ((37, 10), (43, 13))):
        ramp(p, p.poly([base, (tip[0] - 1, tip[1] - 2), tip, (tip[0] - 2, tip[1] + 2)]), LEAF, LEAF_S,
             shade_off=(1, 1))
    ramp(p, p.poly([(39, 4), (41, 1), (43, 2), (42, 5)]), "#8c58b8", "#583080", shade_off=(1, 1))   # violet bell
    for x, y in ((40, 8), (43, 9), (41, 11)):
        ramp(p, p.ellipse(x, y, 1.6, 1.6), BERRY, None)
        p.px(x - 1, y - 1, "#f8f8f8")
    # --- the gloved hand raised, a tiny vial pinched between finger and thumb
    sleeve = p.poly([(39, 55), (40, 48), (46, 45), (52, 49), (54, 55)])
    ramp(p, sleeve, PLUM, PLUM_S, PLUM_H)
    for x in range(41, 52, 2):
        p.px(x, 47 + (x > 46), LACE)                                               # lace cuff
    glass = p.rect(43, 27, 46, 37)
    ramp(p, glass, "#d8f0f0", "#90b8c0", shade_off=(1, 0))
    ramp(p, p.rect(43, 31, 46, 37), VIAL_AQUA, "#58a8a0", line=False, shade_off=(1, 0))
    ramp(p, p.rect(43, 25, 46, 26), "#c09060", "#806040")                          # the cork
    p.pxs([(43, 28), (43, 29)], "#f8f8f8")
    # The black lace glove closed round the vial: curled fingers in front,
    # the thumb over them, the lace showing as a fine lighter mesh.
    GLOVE_H = "#7c7090"
    grip = p.poly([(40, 37), (48, 36), (50, 40), (49, 46), (42, 47), (39, 42)])
    ramp(p, grip, GLOVE, GLOVE_S, GLOVE_H, shade_off=(2, 2))
    for y in (39, 41, 43):
        p.hline(41, 47, y, "#5c5068")                                               # finger lines
    ramp(p, p.poly([(41, 35), (45, 34), (47, 36), (43, 38)]), "#4c4258", GLOVE_S, GLOVE_H, shade_off=(1, 1))
    for x, y in ((42, 45), (45, 45), (47, 43), (44, 40)):
        p.px(x, y, GLOVE_H)                                                         # lace
    return p


# =============================================================================
# Mimi Osa
# =============================================================================
BLUSH = "#f0a0b8"


def mimi_osa():
    p = Portrait()
    # --- hair falling to the shoulders behind ------------------------------
    ramp(p, p.ellipse(28, 27, 15, 14) & ~p.rect(0, 40, 56, 56), SOFT_HAIR, SOFT_HAIR_S, "#c89070")
    # --- the robe over the nightgown --------------------------------------
    torso = p.poly([(6, 55), (7, 47), (13, 41), (21, 38), (35, 38), (43, 41), (49, 47), (50, 55)])
    ramp(p, torso, LILAC, LILAC_S, LILAC_H)
    ramp(p, p.poly([(22, 38), (28, 50), (34, 38)]), CREAM, CREAM_S, line=False)
    ramp(p, p.poly([(13, 55), (16, 45), (23, 39), (30, 55)]), LILAC, LILAC_S, LILAC_H)    # crossed fronts
    ramp(p, p.poly([(30, 55), (34, 40), (40, 45), (43, 55)]), LILAC, LILAC_S)
    neck(p, x0=24, x1=30, y0=30, y1=39, **SK)
    # --- head: soft and round ---------------------------------------------
    head(p, cx=27, cy=24, rx=10, ry=10, jaw=0, **SK)
    ey = 25
    xn, xf = 19, 28
    # Half-closed eyes: heavy lids curving down over the lower half of the eye.
    for x0, w in ((xn, 4), (xf, 3)):
        p.hline(x0, x0 + w - 1, ey + 1, "k")
        p.px(x0 - 1 if x0 == xn else x0 + w, ey + 2, "k")
        p.pxs([(x0, ey + 2), (x0 + 1, ey + 2)], "k")
        p.hline(x0, x0 + w - 1, ey, "sk1")
    p.pxs([(xn + 2, ey + 2)], "white")
    # Soft brows high and relaxed.
    p.pxs([(18, 21), (19, 20), (20, 20), (21, 20)], SOFT_HAIR_S)
    p.pxs([(29, 20), (30, 20), (31, 20), (32, 21)], SOFT_HAIR_S)
    nose(p, 27, 24)
    # A gentle closed smile and pink cheeks.
    p.pxs([(21, 31), (22, 32), (23, 32), (24, 32), (25, 31)], "sk3")
    p.pxs([(17, 29), (18, 29), (32, 29), (33, 28)], BLUSH)
    # --- fringe from under the cuff ----------------------------------------
    fringe = p.poly([(16, 26), (17, 17), (38, 17), (39, 27), (36, 22), (33, 19), (28, 21), (24, 19), (20, 21)])
    ramp(p, fringe, SOFT_HAIR, SOFT_HAIR_S, "#c89070")
    # --- the nightcap: crown, cuff and the long tip flopping right ------------
    cap = p.poly([(15, 18), (17, 9), (24, 4), (33, 4), (41, 8), (47, 15), (50, 24), (50, 33), (46, 33),
                  (44, 24), (40, 18)])
    ramp(p, cap, CAP, CAP_S, "#b0a0d8", shade_off=(3, 2))
    for pts in ([(25, 7), (32, 6)], [(40, 11), (45, 18)], [(46, 22), (47, 30)]):
        p.add(p.line(pts), CAP_S, line=False)                                      # soft folds
    cuff = p.poly([(14, 21), (15, 16), (28, 14), (41, 16), (42, 21), (28, 19)])
    ramp(p, cuff, CREAM, CREAM_S, "#f8f8f0", shade_off=(1, 2))
    ramp(p, p.ellipse(48, 36, 4, 4), CREAM, CREAM_S, "#f8f8f0")                     # the pom-pom
    p.pxs([(46, 34), (49, 33), (51, 36), (47, 39)], CREAM_S)
    # --- the mimosa puff at the near ear, with its feathery leaflets ---------
    for (bx, by), (tx, ty) in (((14, 28), (7, 34)), ((15, 30), (10, 38))):
        p.add(p.line([(bx, by), (tx, ty)]), LEAF_S, line=False)
        for i in range(1, 6):
            x = bx + (tx - bx) * i // 6
            y = by + (ty - by) * i // 6
            p.pxs([(x - 1, y), (x + 1, y + 1)], LEAF)
    ramp(p, p.ellipse(14, 25, 5, 5), MIMOSA, MIMOSA_S, MIMOSA_H, shade_off=(2, 2))
    for x, y in ((10, 23), (12, 20), (15, 20), (18, 23), (19, 26), (9, 26), (11, 29), (17, 29)):
        p.px(x, y, MIMOSA_H)                                                       # filament tips
    p.pxs([(13, 24), (15, 23), (14, 26)], "#f8e8f0")
    # --- the paper lantern at the lower right, glowing --------------------------
    for x, y in ((38, 40), (52, 38), (36, 50), (54, 47), (45, 37)):
        p.px(x, y, PAPER_H)                                                        # the glow
    ramp(p, p.line([(45, 39), (45, 42)]), "#806048", line=False)
    ramp(p, p.ellipse(45, 48, 7, 6), PAPER, PAPER_S, PAPER_H, shade_off=(2, 2))
    for x in (41, 45, 49):
        p.add(p.line([(x, 43), (x, 53)]) & p.ellipse(45, 48, 6, 5), PAPER_S, line=False)   # ribs
    ramp(p, p.rect(42, 41, 48, 42), CAP_S, None)                                    # the cap ring
    ramp(p, p.rect(42, 54, 48, 55), CAP_S, None)
    ramp(p, p.ellipse(39, 52, 3, 3), "sk0", "sk1")                                  # her hand on the bail
    return p


# =============================================================================
# Titus Arum
# =============================================================================
RUDDY = "#e88870"


def titus_arum():
    p = Portrait()
    # --- the spade over the far shoulder: haft, then the steel blade --------
    ramp(p, p.poly([(36, 46), (47, 16), (50, 17), (39, 47)]), HAFT, HAFT_S, "#e8c088", shade_off=(1, 0))
    blade = p.poly([(44, 16), (45, 4), (48, 1), (52, 1), (55, 4), (55, 17), (50, 19)])
    ramp(p, blade, STEEL, STEEL_S, STEEL_H, shade_off=(2, 1))
    p.add(p.rect(46, 16, 52, 19), HAFT_S, "#5c3c20")                                # the socket
    p.add(p.line([(50, 4), (50, 14)]), STEEL_S, line=False)                         # the spine
    p.pxs([(53, 2), (54, 3)], STEEL_H)
    # --- big shoulders: the shirt, the apron bib and its straps -------------
    torso = p.poly([(2, 55), (3, 45), (9, 39), (19, 36), (37, 36), (47, 39), (53, 45), (54, 55)])
    ramp(p, torso, SHIRT, SHIRT_S, "#a8b070")
    bib = p.poly([(14, 55), (16, 44), (40, 44), (42, 55)])
    ramp(p, bib, APRON, APRON_S, APRON_H)
    for pts in ([(16, 44), (13, 38)], [(40, 44), (43, 38)]):
        p.add(p.line(pts, 2), APRON, APRON_S, line=False)                          # straps
    for x, y in ((15, 45), (40, 45)):
        p.add(p.rect(x - 1, y - 1, x + 1, y + 1), "#e0b848", "#a07c28")               # buckles
    p.pxs([(20, 50), (21, 50), (33, 52), (27, 48), (36, 49), (24, 53)], "#3c2c1c")  # compost crumbs
    p.hline(17, 39, 47, APRON_S)                                                    # pocket seam
    # --- his hand on the haft --------------------------------------------------
    hand = p.poly([(36, 45), (43, 43), (46, 47), (44, 52), (37, 52), (35, 48)])
    ramp(p, hand, TAN, TAN_S, shade_off=(2, 2))
    for y in (46, 48, 50):
        p.hline(37, 43, y, "#b07850")
    neck(p, x0=22, x1=32, y0=30, y1=37, skin=TAN, shade=TAN_S)
    # --- head: wide and ruddy -----------------------------------------------
    head(p, cx=27, cy=22, rx=11, ry=11, jaw=0, skin=TAN, shade=TAN_S)
    ey = 22
    xn, xf = 18, 28
    eye(p, xn, ey, "happy")
    eye(p, xf, ey, "happy", far=True)
    p.pxs([(xn - 1, ey + 3), (xf + 4, ey + 3)], TAN_S)                             # laugh lines
    # Bushy brows, lifted.
    for x0, w in ((16, 6), (27, 5)):
        p.hline(x0, x0 + w - 1, 19, BEARD)
        p.hline(x0 + 1, x0 + w - 2, 18, BEARD)
    nose(p, 26, 22)
    p.pxs([(22, 25), (23, 26), (21, 26)], TAN_S)                                    # a big nose
    p.pxs([(18, 26), (19, 26), (31, 26)], RUDDY)                                   # ruddy cheeks
    # --- the beard: huge and wild, round the open laughing mouth -------------
    beard = (p.ellipse(26, 33, 13, 9) & ~p.rect(0, 0, 56, 26)) | p.rect(14, 22, 17, 30) | p.rect(35, 22, 38, 30)
    beard |= p.poly([(14, 36), (12, 42), (17, 40), (19, 45), (23, 41), (27, 46), (30, 41), (34, 45), (36, 40),
                     (40, 42), (38, 34)])
    ramp(p, beard, BEARD, BEARD_S, BEARD_H, shade_off=(2, 2))
    for pts in ([(17, 33), (18, 39)], [(23, 36), (24, 42)], [(30, 36), (30, 42)], [(35, 33), (36, 38)]):
        p.add(p.line(pts), BEARD_S, line=False)
    p.pxs([(20, 34), (27, 38), (33, 35)], BEARD_H)
    # The moustache and a big open grin: teeth and tongue.
    p.hline(19, 31, 28, BEARD)
    p.pxs([(18, 29), (32, 29)], BEARD_S)
    p.hline(20, 30, 30, "k")
    p.hline(21, 29, 31, "white")
    p.hline(22, 28, 32, "#b84840")
    p.pxs([(20, 31), (30, 31), (21, 32), (29, 32)], "k")
    p.hline(22, 28, 33, "k")
    # --- wild dark hair ---------------------------------------------------------
    hair = p.poly([(14, 22), (13, 14), (9, 12), (15, 9), (14, 4), (21, 6), (24, 1), (29, 5), (35, 2), (36, 7),
                   (42, 7), (39, 12), (41, 18), (39, 25), (36, 21), (36, 15), (31, 13), (26, 16), (22, 12),
                   (19, 17), (16, 15)])
    ramp(p, hair, BEARD, BEARD_S, BEARD_H)
    for pts in ([(18, 8), (20, 11)], [(27, 6), (28, 10)], [(33, 7), (34, 11)], [(38, 13), (38, 18)]):
        p.add(p.line(pts), BEARD_S, line=False)
    return p


# =============================================================================
# Pyra
# =============================================================================
FRECKLE = "#c87850"


def pyra():
    p = Portrait()
    # --- the curls: a big mop behind the head --------------------------------
    mop = p.ellipse(28, 20, 18, 17) & ~p.rect(0, 38, 56, 56)
    for x, y in ((11, 11), (14, 5), (22, 2), (31, 1), (40, 4), (45, 11), (47, 20), (46, 29), (10, 22), (11, 31)):
        mop |= p.ellipse(x, y, 4, 4)
    ramp(p, mop, FLAME, FLAME_S, FLAME_H, shade_off=(3, 3))
    # --- the jacket: safety orange with a silver stripe, a stand-up collar ----
    torso = p.poly([(5, 55), (6, 46), (12, 40), (21, 37), (35, 37), (44, 40), (50, 46), (51, 55)])
    ramp(p, torso, SAFETY, SAFETY_S, SAFETY_H)
    stripe = p.rect(0, 47, 56, 49) & torso
    ramp(p, stripe, STRIPE, STRIPE_S, line=False, shade_off=(0, 1))
    ramp(p, p.poly([(22, 37), (28, 46), (34, 37)]), "#3c4458", "#262c3c")          # dark tee
    ramp(p, p.poly([(16, 41), (19, 33), (24, 37), (26, 46)]), SAFETY, SAFETY_S, SAFETY_H, shade_off=(1, 1))
    ramp(p, p.poly([(40, 41), (37, 33), (32, 37), (30, 46)]), SAFETY, SAFETY_S, shade_off=(1, 1))
    p.add(p.line([(28, 46), (28, 55)]), "#a8b0b8", line=False)                     # the zip
    neck(p, x0=24, x1=30, y0=30, y1=38, **SK)
    # --- head --------------------------------------------------------------------
    head(p, cx=27, cy=23, rx=10, ry=11, jaw=1, **SK)
    ey = 23
    xn, xf = 19, 28
    eye(p, xn, ey, "calm")
    eye(p, xf, ey, "calm", far=True)
    # Brows drawn down hard toward the nose: fierce.
    p.pxs([(17, 20), (18, 20), (19, 20), (20, 21), (21, 21), (22, 22), (18, 21), (19, 21)], FLAME_S)
    p.pxs([(28, 22), (29, 21), (30, 21), (31, 20), (32, 20), (30, 20)], FLAME_S)
    nose(p, 27, 23)
    # A fierce open grin, teeth showing, the far corner pulled higher.
    p.hline(21, 26, 29, "k")
    p.pxs([(27, 28), (28, 28)], "k")
    p.hline(22, 27, 30, "white")
    p.pxs([(21, 30), (28, 29)], "k")
    p.hline(22, 26, 31, "k")
    for x, y in ((18, 27), (20, 28), (17, 29), (31, 27), (33, 28)):
        p.px(x, y, FRECKLE)
    # --- the fringe of curls over the brow ------------------------------------------
    fringe = (p.ellipse(19, 15, 4, 4) | p.ellipse(24, 13, 4, 4) | p.ellipse(30, 13, 4, 4) | p.ellipse(35, 15, 4, 4)
              | p.ellipse(38, 21, 3, 5) | p.ellipse(16, 21, 2, 4) | p.rect(17, 9, 38, 13))
    ramp(p, fringe, FLAME, FLAME_S, FLAME_H)
    for x, y in ((19, 13), (24, 11), (30, 11), (35, 13), (12, 16), (44, 16), (14, 26), (43, 26), (20, 4),
                 (34, 4), (9, 28), (46, 24)):
        p.pxs([(x, y), (x + 1, y - 1), (x + 2, y - 1)], FLAME_H)                     # curl lights
        p.pxs([(x, y + 1), (x + 1, y + 1)], FLAME_S)
    # --- the goggles pushed up on top of the curls ---------------------------------
    p.add(p.line([(9, 12), (18, 8), (38, 7), (47, 12)], 2), STRAP, None)
    for cx in (22, 34):
        ramp(p, p.ellipse(cx, 7, 5, 4), IRON, IRON_S)
        ramp(p, p.ellipse(cx, 7, 3, 2.5), GOGGLE, GOGGLE_S, "#f8e8a0", shade_off=(1, 1))
        p.pxs([(cx - 2, 6), (cx - 1, 5)], "#f8f8f0")
    # --- the ember lantern held up at the lower right ------------------------------
    for x, y in ((44, 28), (48, 25), (41, 32), (51, 30), (46, 22)):
        p.px(x, y, EMBER_H)                                                        # rising sparks
    ramp(p, p.ellipse(46, 36, 2, 2), IRON, IRON_S)                                  # the ring
    cage = p.poly([(40, 40), (52, 40), (51, 52), (41, 52)])
    ramp(p, cage, IRON, IRON_S)
    ramp(p, p.rect(42, 42, 50, 50), EMBER, EMBER_S, EMBER_H, line=False)
    for x in (44, 47):
        p.add(p.line([(x, 41), (x, 51)]), IRON, line=False)                         # the bars
    p.pxs([(43, 44), (49, 47), (45, 49)], EMBER_H)
    ramp(p, p.rect(39, 38, 53, 39), IRON_S, None)
    ramp(p, p.ellipse(41, 53, 4, 3), "sk0", "sk1")                                  # her hand
    return p


PORTRAITS = {"belladonna": belladonna, "mimi_osa": mimi_osa, "titus_arum": titus_arum, "pyra": pyra}


def build(write=True):
    out = {key: fn().render() for key, fn in PORTRAITS.items()}
    if write:
        common.write_set("portraits", out, "portraits11")
    return out
