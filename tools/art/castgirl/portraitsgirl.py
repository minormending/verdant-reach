"""48x48 battle back view for the girl player -> sets/portraits/player_girl_back.

The same shot as the boy's player_back (portraits.player_back): from behind
and slightly above, cropped at the chest, the same Portrait region kit
(auto-shaded regions, 1px outline where a region sits on another), the same
rust field jacket and collar, the vasculum's leather strap with its buckle,
and the same green field cap with its pale band highlight, all in his
colours. What changes is her hair: dark brown and cut to the nape (it
covers her ears, where his stick out), with a long ponytail falling from
the cap's back opening down over her collar and onto the jacket, curving
a little to the right as it does in the walk sheet.

Under the cap her hair sits in shadow (the darker HAIR_S base), so the lit
ponytail reads on it with no outline; where it falls onto the jacket it is
outlined like every other region.
"""
from __future__ import annotations

import commongirl as common
import portraits as pt
from charsgirl import HAIR, HAIR_H, HAIR_S
from PIL import Image

HAIR_D = "#301808"   # the shadow ramp under the cap: HAIR_S lit, HAIR_D shade


def player_girl_back() -> pt.Portrait:
    p = pt.Portrait(48)
    # The jacket, collar, back seam, strap and buckle: his exactly.
    p.add(p.poly([(0, 47), (1, 35), (9, 28), (18, 26), (30, 26), (39, 28), (46, 35), (47, 47)]), "m1", "m2",
          hi="m0")
    p.add(p.poly([(16, 26), (24, 31), (32, 26), (28, 24), (20, 24)]), "m2", "m3")
    p.add(p.rect(23, 33, 24, 47), "m2", None, line=False)
    p.add(p.poly([(37, 29), (41, 31), (14, 47), (9, 47)]), "o3", "k")
    p.pxs([(30, 35), (31, 35), (30, 36), (31, 36)], "r1")                       # strap buckle
    # His neck; no ears (her hair covers them).
    p.add(p.rect(19, 18, 29, 27), "sk0", "sk1")
    # Her hair, cut where his is but a pixel wider each side, in the cap's
    # shadow; his strand ticks at the nape, either side of
    # the ponytail.
    hairm = p.ellipse(24, 13, 13, 10) & ~p.rect(0, 23, 48, 48)
    p.add(hairm, HAIR_S, HAIR_D, hi=HAIR)
    for x in (14, 17, 29, 32):
        p.pxs([(x, 19), (x + 1, 20), (x + 1, 21)], HAIR_D)
    # The cap: his crown, band and band highlight.
    crown = p.ellipse(24, 9, 13, 9) & ~p.rect(0, 15, 48, 48)
    p.add(crown, "g2", "f2", hi="g1")
    p.add(p.rect(11, 13, 37, 15) & p.ellipse(24, 10, 14, 10), "f2", None)
    p.hline(20, 28, 13, "g0")
    p.pxs([(14, 6), (15, 5), (16, 5)], "g1")
    # The ponytail: out of the cap's back opening, over her hair without an
    # outline, then outlined where it falls over the collar and the jacket,
    # tapering to a tip that curves a little to the right.
    tail = p.poly([(22, 15), (26, 15), (27, 19), (27, 24), (28, 30), (28, 35), (27, 39), (26, 41), (25, 37),
                   (24, 31), (23, 26), (22, 21), (21, 18)])
    p.add(tail & ~p.rect(0, 23, 48, 48), HAIR, HAIR_S, hi=HAIR_H, line=False, shade_off=(2, 1))
    p.add(tail & p.rect(0, 23, 48, 48), HAIR, HAIR_S, hi=HAIR_H, shade_off=(2, 1))
    # Strand lines down the tail.
    p.pxs([(23, 20), (24, 21), (24, 22), (25, 26), (25, 27), (26, 31), (26, 32), (26, 36)], HAIR_S)
    return p


def images():
    return {"player_girl_back": player_girl_back().render()}


def build(write=True):
    out = images()
    if write:
        common.write_set("portraits", out, "portraitsgirl")
    return out
