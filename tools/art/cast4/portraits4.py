"""Chapter 4 trainer portraits -> public/art/sets/portraits/<key>.png (56x56).

Built with the Round-3 Portrait class (tools/art/portraits.py): labelled
regions auto-shaded and outlined, faces and details painted last, 3/4 view
facing left, light from the top-left, every silhouette with a prop or
hairline nobody else has.

  flora_vance  Conservatory head 3, the celebrity florist. Glossy plum-black
               waves, a crimson rose pinned at the temple, winged lids, red
               lips, an off-shoulder crimson gown under a white fur stole, a
               long-stemmed rose across her chest, camera-flash glints.
  orchardist   orange knit beanie with a pompom, stubble, red flannel,
               dungaree straps, a big red apple held up.
  arranger     junior florist trainer: red high ponytail, a carnation behind
               the ear, lilac blouse, green apron, snips held up.
  researcher   the Root Relay: short black hair, glasses, headphones round
               the neck, teal lab coat, ID badge, clipboard.
  gentleman    FLORA's devoted fan: bowler, monocle, grey handlebar
               moustache, wing collar and cravat, bottle-green frock coat,
               a bouquet of red roses.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401

import numpy as np  # noqa: E402

import gbc  # noqa: E402
import portraits as pt  # noqa: E402
from portraits import N, Portrait, eye, face, head, neck, nose, strands, torso  # noqa: E402


def sparkle(p: Portrait, x, y, big=False):
    """A camera-flash glint: a 4-point star, white core, gold arms."""
    p.px(x, y, "white")
    arms = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    for dx, dy in arms:
        p.px(x + dx, y + dy, "y1")
    if big:
        for dx, dy in arms:
            p.px(x + 2 * dx, y + 2 * dy, "y0")


CRIMSON = dict(lit="#f86078", base="#d02848", shade="#901830", deep="#500818")


def petal(p: Portrait, x, y, flip=False):
    """A loose rose petal drifting: a 3px curl, lit edge on top."""
    pts = [(x, y), (x + 1, y), (x + 1, y + 1), (x + 2, y + 1)] if not flip else \
          [(x + 2, y), (x + 1, y), (x + 1, y + 1), (x, y + 1)]
    for i, (px_, py_) in enumerate(pts):
        p.px(px_, py_, CRIMSON["lit"] if i == 0 else CRIMSON["base"] if i < 3 else CRIMSON["shade"])


def rose_head(p: Portrait, cx, cy, r=5, lit=CRIMSON["lit"], base=CRIMSON["base"], shade=CRIMSON["shade"],
              deep=CRIMSON["deep"]):
    """A rose seen from above-left: a round bloom, petals spiralling in."""
    p.add(p.ellipse(cx, cy, r, r - 0.5), base, shade, hi=lit, shade_off=(2, 2), hi_off=(1, 1))
    # spiral of petal edges, darkest at the heart
    for (dx, dy) in [(-1, -1), (0, -2), (1, -2), (2, -1), (2, 0), (1, 1), (0, 1), (-1, 0)]:
        p.px(cx + dx, cy + dy, deep if abs(dx) + abs(dy) <= 1 else shade)
    p.px(cx, cy - 1, deep)
    p.pxs([(cx - 3, cy + 1), (cx - 2, cy + 2), (cx + 3, cy - 2)], shade)
    p.px(cx - 2, cy - 3, lit)


# =============================================================================
def flora_vance():
    p = Portrait()
    # --- hair mass behind: glossy waves, fuller on the far side ------------
    back = (p.ellipse(31, 22, 17, 16) | p.ellipse(41, 38, 10, 12) | p.ellipse(15, 34, 6, 9))
    back &= ~p.rect(0, 50, N, N)
    p.add(back, "#504068", "#281830", hi="#7868a0")
    # --- shoulders: bare, the off-shoulder gown, the fur stole -------------
    torso(p, "sk0", "sk1", shoulder_y=40)
    p.add(p.poly([(6, 55), (8, 46), (18, 47), (28, 51), (40, 46), (50, 46), (52, 55)]), CRIMSON["base"],
          CRIMSON["shade"], hi=CRIMSON["lit"])
    stole_l = p.poly([(3, 55), (4, 44), (10, 40), (16, 42), (17, 49), (13, 55)])
    stole_r = p.poly([(42, 55), (41, 46), (45, 40), (51, 42), (54, 48), (55, 55)])
    p.add(stole_l | stole_r, "white", "r1", shade_off=(2, 1))
    for x, y in [(6, 47), (8, 51), (11, 45), (46, 45), (49, 50), (52, 47)]:   # fur tufts
        p.px(x, y, "r1")
    neck(p, x0=23, x1=30, y0=29, y1=41)
    # necklace: a fine gold chain with a ruby drop
    for x, y in [(22, 40), (23, 41), (24, 42), (25, 42), (26, 43), (28, 43), (29, 42), (30, 42), (31, 41)]:
        p.px(x, y, "y1")
    p.pxs([(27, 44), (27, 45)], "b1")
    p.px(27, 44, "#f8a0b0")
    # --- head ---------------------------------------------------------------
    head(p, jaw=1)
    ey = 23
    # winged lids: lashes swept out, lids half-lowered, plum shadow above
    for x0, far in ((20, False), (29, True)):
        w = 2 if far else 3
        p.hline(x0, x0 + w, ey - 1, "x1")                 # eyeshadow
        p.hline(x0 - 1, x0 + w, ey, "k")                  # heavy lash line
        p.px(x0 + w + 1, ey - 1, "k")                     # the wing
        p.pxs([(x0, ey + 1), (x0 + 1, ey + 1), (x0, ey + 2)], "k")
        p.px(x0 + 1, ey + 2, "u2")                        # blue-grey iris
        if not far:
            p.pxs([(x0 + 2, ey + 1), (x0 + 2, ey + 2)], "white")
            p.px(x0 - 2, ey - 1, "k")                     # outer lash flick
        else:
            p.px(x0 + 2, ey + 2, "white")
    # arched brows
    p.pxs([(18, 20), (19, 19), (20, 18), (21, 18), (22, 18), (23, 19)], "#281830")
    p.pxs([(29, 19), (30, 18), (31, 18), (32, 18), (33, 19)], "#281830")
    nose(p)
    # red lips, a knowing half-smile
    p.hline(22, 27, 30, CRIMSON["shade"])
    p.hline(23, 26, 31, CRIMSON["base"])
    p.px(24, 31, CRIMSON["lit"])
    p.px(28, 29, CRIMSON["shade"])
    p.px(32, 28, "sk2")                                   # beauty mark
    p.pxs([(18, 27), (19, 27), (34, 26)], "n1")           # blush
    # drop earring on the far ear
    p.pxs([(38, 27), (38, 28)], "y1")
    p.px(38, 29, "b1")
    # --- front hair: a deep side part sweeping across in a wave ------------
    front = p.poly([(14, 22), (15, 13), (20, 7), (28, 5), (37, 6), (44, 11), (46, 18), (44, 26),
                    (40, 21), (36, 15), (31, 13), (26, 15), (22, 13), (19, 17), (17, 22)])
    p.add(front & ~p.rect(0, 0, 14, N), "#504068", "#281830", hi="#7868a0")
    # wave curl falling past the near cheek
    p.add(p.ellipse(15, 26, 3, 6) & ~p.rect(0, 0, N, 20), "#504068", "#281830", hi="#7868a0")
    # gloss: two bright sheen arcs following the wave
    for x, y in [(22, 9), (23, 8), (24, 8), (25, 8), (31, 8), (32, 8), (33, 9), (34, 10),
                 (40, 14), (41, 15), (42, 17)]:
        p.px(x, y, "#a898c8")
    strands(p, [(27, 11), (28, 12), (29, 12), (19, 14), (20, 13), (38, 18), (39, 20), (44, 30),
                (45, 33), (43, 36)], "#281830")
    # --- the rose pinned at the temple, leaves fanned behind it ------------
    p.add(p.poly([(6, 14), (11, 9), (13, 13)]) | p.poly([(12, 6), (16, 4), (15, 9)]), "g2", "f2", hi="g1")
    rose_head(p, 13, 12, 6)
    # --- a long-stemmed rose held across the chest -------------------------
    p.add(p.line([(34, 54), (44, 40)], 1), "f2", None, line=False)
    p.pxs([(40, 46), (41, 45)], "f2")
    p.add(p.poly([(39, 45), (36, 44), (37, 47)]), "g2", "f2")       # leaf on the stem
    rose_head(p, 46, 37, 4)
    p.add(p.ellipse(33, 52, 3, 3), "sk0", "sk1")                       # her hand
    p.pxs([(30, 51), (31, 53)], "b1")                                  # red nails
    # --- camera flashes -------------------------------------------------------
    sparkle(p, 4, 4, big=True)
    sparkle(p, 50, 8, big=True)
    sparkle(p, 52, 25)
    sparkle(p, 6, 28)
    petal(p, 2, 19)
    petal(p, 49, 17, flip=True)
    petal(p, 8, 38)
    return p


# =============================================================================
def orchardist():
    p = Portrait()
    torso(p, "b1", "b2", hi="b0")
    shirt = len(p.regions) - 1
    p.add(p.poly([(22, 35), (28, 43), (34, 35)]), "s1", "s2")                      # tee at the neck
    p.add(p.rect(18, 46, 37, 55) | p.poly([(16, 38), (20, 37), (23, 47), (18, 47)]) |
          p.poly([(40, 37), (36, 36), (33, 47), (38, 47)]), "u1", "u2", hi="u0")      # dungarees
    p.pxs([(19, 46), (36, 46)], "y1")
    p.add(p.rect(24, 49, 31, 53), "u2", None)
    neck(p)
    head(p)
    face(p, eyes="happy", brow="raised", mouth_kind="grin", brow_c="d3", blush="b0")
    for x, y in [(19, 30), (21, 31), (23, 32), (30, 32), (32, 31), (34, 29), (20, 29)]:   # stubble
        p.px(x, y, "sk1")
    p.add(p.rect(16, 16, 18, 24) | p.rect(36, 16, 38, 23), "d2", "d3", hi="d1")          # hair at the sides
    # knit beanie: ribbed turn-up, a pompom
    crown = p.ellipse(28, 12, 12, 10) & ~p.rect(0, 15, N, N)
    p.add(crown, "m1", "m2", hi="m0")
    for x in range(18, 40, 3):
        p.pxs([(x, y) for y in range(3, 14) if p.label[y, x] >= 0 and crown[y, x] and not crown[y, x - 1] is False], "m2")
    p.add(p.rect(15, 14, 41, 18) & p.ellipse(28, 16, 14, 6), "m2", "m3", hi="m1")
    for x in range(16, 41, 2):
        p.px(x, 16, "m3")
    p.add(p.ellipse(30, 3, 4, 2.5), "s0", "s2")
    # a big red apple held up in the near hand
    p.add(p.ellipse(13, 44, 7, 6), "b1", "b2", hi="b0")
    p.pxs([(10, 41), (11, 40)], "white")
    p.add(p.line([(13, 38), (14, 35)], 1), "o2", None, line=False)
    p.add(p.poly([(15, 36), (20, 33), (18, 37)]), "g2", "f2")
    p.add(p.ellipse(15, 51, 4, 3), "sk0", "sk1")
    # flannel check, only where the shirt is still visible
    for x in range(0, N):
        for y in range(34, N):
            if p.label[y, x] == shirt and (x % 5 == 1 or y % 5 == 1):
                p.px(x, y, "b2" if (x % 5 == 1) != (y % 5 == 1) else "b3")
    return p


# =============================================================================
MAHOG, MAHOG_S, MAHOG_H = "#a04830", "#682818", "#d07050"


def arranger():
    p = Portrait()
    # ponytail flicking out behind
    p.add(p.poly([(36, 6), (46, 2), (53, 8), (51, 18), (54, 28), (47, 22), (44, 13), (38, 12)]),
          MAHOG, MAHOG_S, hi=MAHOG_H)
    torso(p, "x0", "x1", hi="white")
    p.add(p.poly([(23, 35), (28, 41), (33, 35)]), "x1", "x2")
    p.add(p.rect(18, 43, 37, 55) | p.poly([(16, 38), (19, 37), (22, 44), (18, 44)]) |
          p.poly([(40, 37), (37, 36), (34, 44), (38, 44)]), "g2", "f2", hi="g1")   # apron
    p.add(p.rect(23, 47, 32, 52), "f2", None)
    p.pxs([(25, 46), (26, 45), (29, 46), (30, 45)], "n1")                            # flowers in the pocket
    neck(p)
    head(p)
    face(p, eyes="calm", brow="scowl", mouth_kind="smirk", brow_c=MAHOG_S, blush="n1")
    # hair pulled back tight, a few strands loose at the front
    hair = p.ellipse(28, 15, 12, 10) & ~p.rect(0, 17, N, N)
    hair |= p.rect(35, 15, 38, 23)
    p.add(hair, MAHOG, MAHOG_S, hi=MAHOG_H)
    strands(p, [(19, 9), (22, 7), (26, 7), (30, 8), (34, 10)], MAHOG_S)
    p.add(p.ellipse(39, 9, 3, 3), "y1", "y2")                                        # hair tie
    strands(p, [(17, 17), (16, 18), (16, 19), (16, 20)], MAHOG)
    # a carnation behind the ear
    p.add(p.ellipse(38, 17, 3, 3), "n1", "n2", hi="n0")
    p.pxs([(37, 16), (39, 18), (38, 15)], "n0")
    # snips held up: two short blades, looped red handles
    p.add(p.line([(13, 38), (9, 49)], 2) | p.line([(14, 38), (18, 49)], 2), "b1", "b2")   # red grips
    p.add(p.poly([(13, 27), (10, 33), (11, 38), (13, 38)]), "r0", "r2", shade_off=(1, 1))  # anvil blade
    p.add(p.poly([(14, 28), (16, 33), (15, 38), (13, 38)]), "r1", "r3", shade_off=(1, 1))  # cutting blade
    p.pxs([(13, 37), (14, 37)], "y1")                                                   # pivot bolt
    p.add(p.ellipse(13, 47, 4, 3), "sk0", "sk1")
    return p


# =============================================================================
def researcher():
    p = Portrait()
    torso(p, "q0", "q1", hi="white")
    p.add(p.poly([(22, 35), (28, 44), (34, 35)]), "u2", "u3")                        # navy tee
    p.add(p.poly([(16, 36), (22, 33), (27, 47), (21, 49)]), "q0", "q1", hi="white")  # lapels
    p.add(p.poly([(40, 35), (34, 33), (29, 47), (35, 48)]), "q0", "q1")
    p.add(p.rect(37, 44, 42, 50), "white", "r1")                                     # ID badge
    p.pxs([(38, 46), (39, 46), (40, 46)], "q2")
    p.hline(38, 41, 48, "r2")
    p.add(p.line([(36, 37), (39, 44)], 1), "q2", None, line=False)
    neck(p, skin="sk2", shade="sk3")
    p.pxs([(x, 30) for x in range(23, 31)], "sk3")
    # headphones resting round the neck: band behind, cups on the collar
    p.add(p.line([(17, 37), (22, 41), (34, 41), (39, 36)], 2), "r3", "k")
    p.add(p.ellipse(17, 37, 4, 4), "r3", "k", hi="r2")
    p.add(p.ellipse(39, 36, 3, 4), "r3", "k", hi="r2")
    p.pxs([(16, 36), (17, 36)], "q2")
    head(p, skin="sk2", shade="sk3")
    face(p, eyes="calm", brow="raised", mouth_kind="smile", brow_c="k", glasses=True)
    p.pxs([(25, 25), (25, 26)], "sk3")
    hair = p.ellipse(28, 14, 12, 9) & ~p.rect(0, 17, N, N)
    hair |= p.rect(17, 14, 19, 21) | p.rect(36, 14, 38, 22)
    p.add(hair, "#382828", "k", hi="#584040")
    for x in range(19, 38, 2):
        p.px(x, 8 + (x % 3), "#584040")
    # clipboard held low on the near side
    p.add(p.rect(3, 38, 15, 55), "o1", "o2")
    p.add(p.rect(5, 41, 14, 55), "white", "r1", line=False)
    p.add(p.rect(7, 37, 12, 39), "r2", "r3")
    for y in (44, 47, 50, 53):
        p.hline(6, 12 if y != 50 else 10, y, "r2")
    p.pxs([(8, 44), (9, 47)], "q2")
    p.add(p.ellipse(15, 49, 3, 3), "sk2", "sk3")
    return p


# =============================================================================
def gentleman():
    p = Portrait()
    torso(p, "#286848", "#184030", hi="#3c8860")
    p.add(p.poly([(22, 34), (28, 47), (34, 34)]), "white", "r1")                    # shirt front
    p.add(p.poly([(25, 36), (31, 36), (30, 42), (28, 44), (26, 42)]), "x2", "x3", hi="x1")   # cravat
    p.px(28, 39, "y1")                                                               # tie pin
    p.add(p.poly([(15, 37), (22, 33), (27, 48), (21, 51)]), "#286848", "#184030", hi="#3c8860")   # lapels
    p.add(p.poly([(41, 36), (34, 33), (29, 48), (35, 50)]), "#286848", "#184030")
    p.add(p.poly([(23, 33), (26, 31), (26, 35)]) | p.poly([(33, 33), (30, 31), (30, 35)]), "white", "r1")  # wing collar
    neck(p)
    head(p)
    face(p, eyes="happy", brow="raised", mouth_kind="flat", brow_c="r2", blush="n1")
    # monocle on the near eye, its chain looping to the lapel
    for dx, dy in [(-1, 0), (0, -1), (1, -1), (2, -1), (3, 0), (3, 1), (3, 2), (2, 3), (1, 3), (0, 3), (-1, 2), (-1, 1)]:
        p.px(20 + dx, 23 + dy, "y2")
    p.px(20, 24, "white")
    for x, y in [(18, 26), (17, 28), (17, 30), (18, 32), (19, 34)]:
        p.px(x, y, "y1")
    # handlebar moustache
    p.add(p.poly([(17, 26), (21, 27), (24, 27), (28, 28), (31, 27), (34, 26), (32, 29), (28, 30),
                  (24, 30), (19, 29)]), "r2", "r3", hi="r1")
    p.pxs([(16, 25), (35, 25)], "r1")
    p.add(p.rect(36, 18, 38, 25) | p.rect(17, 18, 18, 22), "r1", "r2")              # grey sideburns
    # bowler: a hard dome and a narrow curled brim
    p.add(p.ellipse(28, 11, 11, 9) & ~p.rect(0, 14, N, N), "#383838", "k", hi="#686868")
    p.add(p.rect(15, 13, 41, 16) & p.ellipse(28, 14, 14, 4), "#383838", "k", hi="#585858")
    p.hline(17, 39, 13, "x3")                                                         # hat band
    p.pxs([(22, 6), (23, 5), (24, 5)], "#888888")
    # the bouquet for FLORA: red roses in white paper
    p.add(p.poly([(36, 55), (40, 44), (52, 41), (55, 50), (50, 55)]), "white", "r1")
    for (x, y) in [(42, 40), (47, 38), (52, 40), (45, 43), (50, 44)]:
        rose_head(p, x, y, 3)
    p.add(p.poly([(44, 46), (41, 44), (42, 48)]) | p.poly([(54, 45), (55, 41), (52, 44)]), "g2", "f2")
    p.add(p.ellipse(40, 51, 3, 3), "white", "r1")                                   # white glove
    return p


PORTRAITS4 = {"flora_vance": flora_vance, "orchardist": orchardist, "arranger": arranger,
              "researcher": researcher, "gentleman": gentleman}


def images():
    return {k: fn().render() for k, fn in PORTRAITS4.items()}


def review(out):
    cells = [(k, gbc.on_bg(im, (248, 248, 248, 255))) for k, im in out.items()]
    sil = [(k, gbc.on_bg(pt.silhouette(im), (248, 248, 248, 255))) for k, im in out.items()]
    gbc.grid_sheet(cells, 5, 4).save(common.REVIEW / "portraits_ch4.png")
    gbc.grid_sheet(cells + sil, 5, 1, label=False).save(common.REVIEW / "portraits_ch4_1x.png")


def build(write=True):
    out = images()
    for k, im in out.items():
        assert im.size == (N, N), k
    if write:
        common.write_set_images("portraits", out, "portraits4.py")
    review(out)
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
