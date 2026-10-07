"""Chapter 5 trainer portraits -> public/art/sets/portraits/<key>.png (56x56).

Built with the Round-3 Portrait class (tools/art/portraits.py): labelled
regions auto-shaded and outlined, faces and details painted last, 3/4 view
facing left, light from the top-left, every silhouette with a prop or
hairline nobody else has.

  morrow          Conservatory head 4, the Warden. A long lean face, heavy
                  lids, silver hair combed back into a short tail, a
                  charcoal coat buttoned to a high stand-up collar, a sprig
                  of white ghost pipe pinned at the collar. Two pale motes
                  drift by him.
  lumberjack      charcoal ribbed beanie, a big brown beard, a red-and-black
                  buffalo-check shirt, an axe on the shoulder.
  forager         a rust kerchief with white dots knotted at the nape, cream
                  blouse, green apron, a basket of chanterelles held up.
  night_gardener  a junior: a blue knit cap over fair hair, dark blue
                  overalls, a jar of glowing fungus held up, its light
                  catching the chin.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common5 as common  # noqa: E402

import gbc  # noqa: E402
import portraits as pt  # noqa: E402
from portraits import N, Portrait, face, head, neck, strands, torso  # noqa: E402

CHARCOAL = dict(hi="#686878", base="#505060", shade="#303040")
SILVER = dict(hi="#f0f0f8", base="#c8c8d8", shade="#8888a0")
GHOST = dict(lit="#f8f8f8", base="#e0d8e8", shade="#a898b8", deep="#706080")


def mote(p: Portrait, x, y, big=False):
    """A faint ghost-light mote: a pale core with dim arms."""
    p.px(x, y, GHOST["base"])
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        p.px(x + dx, y + dy, GHOST["shade"] if big else GHOST["deep"])
    if big:
        p.px(x, y, GHOST["lit"])


def ghost_sprig(p: Portrait, x, y):
    """Ghost pipe, pinned: a waxy white stem rising from (x, y) and hooking
    over into one nodding bell that hangs to the left, two scale leaves,
    lilac shade on the underside."""
    stem = p.line([(x, y), (x - 1, y - 5), (x - 1, y - 9), (x - 3, y - 12)], 2)
    p.add(stem, GHOST["base"], GHOST["shade"], line=False, shade_off=(1, 0))
    bell = p.poly([(x - 3, y - 14), (x - 7, y - 13), (x - 9, y - 9), (x - 8, y - 6), (x - 3, y - 7), (x - 1, y - 11)])
    p.add(bell, GHOST["base"], GHOST["shade"], hi=GHOST["lit"], shade_off=(2, 2), hi_off=(1, 1))
    p.pxs([(x - 7, y - 6), (x - 6, y - 6), (x - 5, y - 7)], GHOST["deep"])   # the bell's mouth, facing down
    p.pxs([(x - 5, y - 12), (x - 6, y - 11)], GHOST["lit"])                  # waxy sheen
    p.pxs([(x + 1, y - 4), (x - 2, y - 7)], GHOST["shade"])                  # scale leaves
    p.pxs([(x + 1, y + 1), (x + 2, y + 1)], "y2")                            # the pin


# =============================================================================
def morrow():
    p = Portrait()
    # --- the tail of tied-back hair, behind the head --------------------------
    p.add(p.poly([(36, 17), (44, 19), (48, 25), (47, 33), (44, 30), (42, 24), (37, 22)]),
          SILVER["base"], SILVER["shade"], hi=SILVER["hi"])
    p.add(p.ellipse(40, 21, 2, 2), "#383848", "#202028")                     # the tie
    # --- the long coat: buttoned high, a tall stand-up collar ---------------
    torso(p, CHARCOAL["base"], CHARCOAL["shade"], hi=CHARCOAL["hi"], shoulder_y=39)
    coat = len(p.regions) - 1
    p.add(p.poly([(22, 36), (27, 33), (30, 33), (33, 36), (31, 55), (24, 55)]),
          CHARCOAL["base"], CHARCOAL["shade"])                              # front placket
    for y in (41, 46, 51):
        p.px(27, y, "#202028")
        p.px(26, y - 1, CHARCOAL["hi"])
    neck(p, x0=24, x1=30)
    # the collar stands up past the jaw on both sides, open at the throat
    p.add(p.poly([(14, 40), (17, 31), (22, 27), (24, 30), (23, 38), (20, 44)]),
          CHARCOAL["base"], CHARCOAL["shade"], hi=CHARCOAL["hi"])
    p.add(p.poly([(42, 38), (39, 30), (34, 27), (32, 30), (33, 37), (36, 42)]),
          CHARCOAL["base"], CHARCOAL["shade"])
    p.add(p.poly([(22, 30), (24, 30), (24, 38), (22, 38)]), "#383848", None, line=False)  # collar lining
    # --- head: long, lean, a hollow under the cheekbone ---------------------
    head(p, rx=9, ry=12, jaw=2, skin="sk0", shade="sk1")
    face(p, eyes="calm", brow="flat", mouth_kind="flat", brow_c=SILVER["shade"])
    p.pxs([(20, 28), (21, 29), (33, 27)], "sk1")                            # hollow cheek
    p.hline(19, 23, 22, "sk1")                                              # heavy lids
    p.hline(29, 32, 22, "sk1")
    # --- silver hair combed straight back -----------------------------------
    hair = p.poly([(18, 19), (17, 12), (21, 6), (28, 4), (36, 5), (40, 10), (41, 18), (40, 26), (37, 25),
                   (36, 19), (32, 15), (27, 16), (22, 14), (19, 17)])
    p.add(hair, SILVER["base"], SILVER["shade"], hi=SILVER["hi"])
    for x0, y0 in ((19, 12), (22, 8), (26, 6), (31, 6)):                     # comb lines raking back
        p.pxs([(x0, y0), (x0 + 1, y0), (x0 + 2, y0 + 1), (x0 + 3, y0 + 1), (x0 + 4, y0 + 2), (x0 + 5, y0 + 3)],
              SILVER["shade"])
    p.pxs([(37, 17), (38, 19), (38, 21)], SILVER["shade"])
    # --- the ghost pipe pinned at the collar --------------------------------
    ghost_sprig(p, 23, 51)
    # --- a faint light passing ----------------------------------------------
    mote(p, 6, 14, big=True)
    mote(p, 50, 8)
    mote(p, 4, 28)
    del coat
    return p


# =============================================================================
CHECK_R, CHECK_RS, CHECK_K = "#d03828", "#902018", "#301818"


def lumberjack():
    p = Portrait()
    # the axe on the shoulder: haft up behind the head, the head at the back
    p.add(p.line([(40, 55), (48, 14)], 3), "o1", "o2", hi="o0")
    head_ = p.poly([(42, 17), (46, 15), (49, 15), (52, 11), (55, 10), (55, 25), (52, 24), (49, 20), (46, 20),
                    (42, 20)])
    p.add(head_, "r1", "r3", hi="r0", shade_off=(2, 2))
    p.pxs([(54, y) for y in range(12, 24)], "white")                            # the honed bit
    p.pxs([(42, 18), (43, 18)], "r3")                                           # the poll
    torso(p, CHECK_R, CHECK_RS, hi="#e86048")
    shirt = len(p.regions) - 1
    p.add(p.poly([(23, 35), (28, 41), (33, 35)]), "#605848", "#403830")       # undershirt
    neck(p)
    p.add(p.ellipse(41, 50, 4, 4), "sk0", "sk1")                              # hand on the haft
    head(p, jaw=1)
    face(p, eyes="happy", brow="raised", mouth_kind="flat", brow_c="#683818")
    # big beard and moustache
    beard = p.ellipse(26, 32, 11, 9) & ~p.rect(0, 0, N, 26)
    beard |= p.rect(16, 18, 18, 28) | p.rect(35, 18, 37, 27)
    p.add(beard, "#985830", "#683818", hi="#b87848")
    p.add(p.poly([(19, 27), (24, 26), (28, 27), (32, 26), (34, 28), (29, 29), (23, 29)]), "#985830", "#683818",
          hi="#b87848")
    p.hline(24, 28, 30, "#402010")                                           # the mouth in the beard
    strands(p, [(21, 34), (24, 36), (27, 38), (30, 35), (25, 33)], "#683818")
    # charcoal ribbed beanie, pulled low
    crown = p.ellipse(28, 13, 12, 10) & ~p.rect(0, 15, N, N)
    p.add(crown, "#484850", "#282830", hi="#686870")
    for x in range(19, 39, 3):
        p.pxs([(x, y) for y in range(5, 15) if crown[y, x]], "#383840")
    p.add(p.rect(15, 14, 41, 18) & p.ellipse(28, 16, 14, 6), "#383840", "#202028", hi="#585860")
    for x in range(16, 41, 2):
        p.px(x, 16, "#202028")
    # buffalo check: 4px blocks, black where both bands cross
    for y in range(32, N):
        for x in range(N):
            if p.label[y, x] != shirt:
                continue
            bx, by = (x // 4) % 2, (y // 4) % 2
            if bx and by:
                p.px(x, y, CHECK_K)
            elif bx or by:
                p.px(x, y, CHECK_RS if (x + y) % 2 else "#601010")
    return p


# =============================================================================
RUST = dict(hi="#e88058", base="#c85838", shade="#883020")


def forager():
    p = Portrait()
    # the knot and two tails of the kerchief at the nape
    p.add(p.poly([(38, 18), (47, 16), (50, 22), (44, 22), (49, 28), (42, 26), (38, 23)]),
          RUST["base"], RUST["shade"], hi=RUST["hi"])
    torso(p, "s1", "s2", hi="s0")
    p.add(p.poly([(23, 35), (28, 40), (33, 35)]), "s2", "s3")
    p.add(p.rect(18, 43, 37, 55) | p.poly([(16, 38), (19, 37), (22, 44), (18, 44)]) |
          p.poly([(40, 37), (37, 36), (34, 44), (38, 44)]), "g2", "f2", hi="g1")   # apron
    p.add(p.rect(23, 47, 32, 52), "f2", None)
    neck(p)
    head(p)
    face(p, eyes="calm", brow="kind", mouth_kind="smile", brow_c="d3", blush="b0")
    p.pxs([(18, 27), (20, 28), (34, 27)], "sk1")                               # freckles
    # brown hair showing at the temples and over the ear
    p.add(p.rect(16, 15, 19, 24) | p.rect(35, 15, 38, 22), "d2", "d3", hi="d1")
    # the kerchief: tied low over the brow, white dots
    scarf = p.ellipse(28, 13, 13, 10) & ~p.rect(0, 18, N, N)
    scarf |= p.poly([(15, 17), (41, 15), (40, 19), (16, 20)])
    p.add(scarf, RUST["base"], RUST["shade"], hi=RUST["hi"])
    for x, y in [(21, 7), (27, 5), (33, 7), (18, 12), (24, 11), (30, 10), (36, 12), (21, 17), (27, 16), (33, 16),
                 (44, 19), (46, 24)]:
        p.px(x, y, "s0")
    # a basket held up on the near side, heaped with chanterelles
    arch = p.ellipse(12, 42, 10, 13) & ~p.ellipse(12, 42, 8, 11) & ~p.rect(0, 41, N, N)
    p.add(arch, "o1", "o2", hi="o0")                                             # the handle arching over
    p.add(p.poly([(2, 42), (22, 42), (19, 55), (5, 55)]), "o1", "o2", hi="o0")
    for y in (45, 48, 51, 54):
        p.hline(4, 19, y, "o2")
    for x in (6, 10, 14, 18):
        p.pxs([(x, 44), (x - 1, 47), (x, 50), (x - 1, 53)], "o3")
    for cx, cy, r in [(6, 39, 4), (17, 38, 4), (11, 36, 5)]:
        # a chanterelle: a wavy funnel cap on a tapering stem
        cap = p.poly([(cx - r, cy - 2), (cx - r + 2, cy - 4), (cx + r - 1, cy - 4), (cx + r, cy - 2),
                      (cx + 2, cy + 1), (cx + 1, cy + 4), (cx - 1, cy + 4), (cx - 2, cy + 1)])
        p.add(cap, "#f0b838", "#c07818", hi="#f8e080", shade_off=(2, 1), hi_off=(1, 1))
        p.pxs([(cx - r + 2, cy - 3), (cx, cy - 2), (cx + r - 2, cy - 3)], "#c07818")   # gills under the rim
    p.add(p.ellipse(22, 47, 3, 3), "sk0", "sk1")
    return p


# =============================================================================
NAVY = dict(hi="#4858a0", base="#303868", shade="#1c2048")
GLOW = dict(core="#f8f8e8", lit="#d8f8b8", base="#a8e898", dim="#68b880")


def night_gardener():
    p = Portrait()
    torso(p, "#b8c8e0", "#8090b8", hi="#e0e8f8")                                # pale shirt
    p.add(p.rect(17, 44, 38, 55) | p.poly([(15, 37), (19, 36), (22, 45), (17, 45)]) |
          p.poly([(41, 37), (37, 36), (34, 45), (39, 45)]), NAVY["base"], NAVY["shade"], hi=NAVY["hi"])
    p.add(p.rect(23, 47, 32, 52), NAVY["shade"], None)
    p.pxs([(18, 45), (37, 45)], "y1")                                          # buckles
    neck(p)
    head(p)
    face(p, eyes="wide", brow="raised", mouth_kind="smile", brow_c="#a88830", blush="n1")
    # fair hair under the cap
    p.add(p.rect(16, 15, 19, 23) | p.rect(35, 15, 38, 21) | p.poly([(17, 16), (26, 16), (20, 21)]),
          "#e0c060", "#a88830", hi="#f8e898")
    # a snug blue knit cap with a turned-up band
    crown = p.ellipse(28, 13, 12, 10) & ~p.rect(0, 15, N, N)
    p.add(crown, "#5868a8", "#384078", hi="#7888c0")
    p.add(p.rect(15, 13, 41, 17) & p.ellipse(28, 15, 14, 6), "#7888c0", "#5868a8", hi="#a8b8e0")
    for x in range(17, 41, 2):
        p.px(x, 15, "#5868a8")
    # the jar of foxfire held up, glowing
    p.add(p.rect(6, 36, 16, 49), GLOW["lit"], GLOW["base"], hi=GLOW["core"], shade_off=(2, 2))
    p.add(p.rect(7, 33, 15, 35), "r1", "r3", hi="r0")                           # lid
    for x, y in [(9, 44), (10, 42), (12, 45), (13, 41), (11, 39), (9, 40), (14, 46)]:
        p.px(x, y, GLOW["core"])                                                # the glowing fungus
    p.pxs([(8, 38), (8, 39), (8, 40)], "white")                                 # glass glint
    p.add(p.ellipse(15, 51, 4, 3), "sk0", "sk1")
    # a dithered halo on the air round the jar (never over the jar itself)
    near = p.ellipse(11, 41, 8, 9)
    far = p.ellipse(11, 41, 11, 12)
    for y in range(N):
        for x in range(N):
            if p.label[y, x] >= 0 or (x + y) % 2:
                continue
            if near[y, x]:
                p.px(x, y, GLOW["base"])
            elif far[y, x] and (x // 2 + y // 2) % 2 == 0:
                p.px(x, y, GLOW["dim"])
    p.pxs([(22, 30), (23, 31), (24, 31)], GLOW["lit"])                          # its light on the chin
    return p


PORTRAITS5 = {"morrow": morrow, "lumberjack": lumberjack, "forager": forager, "night_gardener": night_gardener}


def images():
    return {k: fn().render() for k, fn in PORTRAITS5.items()}


def review(out):
    cells = [(k, gbc.on_bg(im, (248, 248, 248, 255))) for k, im in out.items()]
    sil = [(k, gbc.on_bg(pt.silhouette(im), (248, 248, 248, 255))) for k, im in out.items()]
    gbc.grid_sheet(cells, 4, 4).save(common.REVIEW / "portraits_ch5.png")
    gbc.grid_sheet(cells + sil, 4, 1, label=False).save(common.REVIEW / "portraits_ch5_1x.png")


def build(write=True):
    out = images()
    for k, im in out.items():
        assert im.size == (N, N), k
    if write:
        common.write_set_images("portraits", out, "portraits5.py")
    review(out)
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
