"""Chapter 9 story still, an original pixel painting on the stills.Canvas.

  dragon_trees  Sanguine Ridge at sunset. A stand of ancient dragon's blood
                trees on the red cliffs: dense umbrella crowns held up on
                forking, candelabra branches over thick pale trunks. The
                oldest tree's trunk carries a cut that weeps dark red resin.
                The sky runs from violet overhead to deep orange at the
                horizon, where the sun sinks behind the far cliff and the
                ridge's Conservatory sits small on its rim, its panes lit.

Composition follows stills.py: the bottom 48px sit under the text box, so
they stay calm (the shadowed cliff face) and the crowns, the cut, the sun and
the Conservatory all live above y = 96. The sun is low on the left, so every
trunk and crown is lit from the left and shaded on the right, in keeping
with the top-left rule. Every coordinate is fixed; the output is
deterministic.
"""
from __future__ import annotations

import common9 as common
from stills import Canvas

PAL = {
    # sky, sun and the far ranges
    "sky0": "#382450", "sky1": "#582c5c", "sky2": "#88345a", "sky3": "#b8444c", "sky4": "#e06838",
    "sky5": "#f09848", "sun0": "#f8e8b0", "sun1": "#f8c870",
    "far0": "#784060", "far1": "#603454",
    # the far cliff and its Conservatory
    "mesa0": "#7c3850", "mesa1": "#602c48", "mesa2": "#4a223e",
    "pane0": "#f8e098", "pane1": "#d09858", "frame": "#2c1830",
    # the gorge and the near red cliffs
    "haze": "#542a48", "haze1": "#462440",
    "rock0": "#e8804c", "rock1": "#c05438", "rock2": "#90363a", "rock3": "#642434", "rock4": "#40182c",
    # the dragon trees
    "leaf0": "#a8a860", "leaf1": "#5c7c4c", "leaf2": "#36573e", "leaf3": "#203834",
    "bark0": "#e8c8a0", "bark1": "#b89478", "bark2": "#7c6058", "bark3": "#4a3440",
    # resin
    "res0": "#f85048", "res1": "#c81c2c", "res2": "#801424",
}


def sky(cv):
    cv.bands([0, 14, 28, 40, 50, 58], ["sky0", "sky1", "sky2", "sky3", "sky4", "sky5"])
    # The sun, low on the left and half behind the far cliff.
    cv.glow(40, 58, [(22, "sky5", "dith"), (14, "sky5", "solid"), (10, "sun1", "dith"), (7, "sun1", "solid")],
            ry_scale=0.7, only=cv.m_of("sky3", "sky4", "sky5"))
    cv.ellipse(40, 57, 5, 5, "sun0")
    # The first stars in the violet overhead.
    for x, y in ((12, 4), (58, 9), (31, 2), (150, 6), (128, 11)):
        cv.px(x, y, "sun1")
    # Two long thin clouds catching the last light.
    for x0, x1, y, c in ((70, 112, 20, "sky3"), (82, 104, 21, "sky3"), (8, 44, 33, "sky4"), (18, 36, 34, "sky4"),
                         (118, 150, 36, "sky4")):
        cv.line([(x0, y), (x1, y)], c)


def far(cv):
    # Faint violet ranges across the horizon, then the far cliff on the left
    # with the Conservatory on its rim.
    cv.poly([(0, 62), (20, 59), (44, 61), (70, 57), (96, 60), (124, 56), (159, 59), (159, 72), (0, 72)], "far0")
    cv.poly([(60, 66), (90, 63), (120, 65), (159, 62), (159, 74), (60, 74)], "far1")
    mesa = cv.m_poly([(0, 62), (6, 60), (52, 60), (56, 62), (62, 74), (66, 84), (0, 84)])
    cv.fill(mesa, "mesa1")
    cv.fill(mesa & cv.m_poly([(0, 60), (52, 60), (55, 62), (40, 66), (0, 66)]), "mesa0")
    cv.fill(mesa & cv.m_poly([(48, 62), (56, 62), (62, 74), (66, 84), (52, 84), (50, 70)]), "mesa2")
    for y in (70, 76):
        cv.line([(0, y), (54, y - 1)], "mesa2")
    # The ridge's Conservatory: a long glass hall under an arched roof, a
    # domed lantern at its centre, its panes lit by the low sun.
    hall = cv.m_rect(15, 54, 39, 59) | (cv.m_ellipse(27, 54, 12, 4) & (cv.yy <= 54))
    cv.fill(hall, "frame")
    cv.fill(cv.m_rect(16, 55, 38, 58) | (cv.m_ellipse(27, 54, 11, 3) & (cv.yy <= 54)), "pane1")
    cv.checker(cv.m_ellipse(25, 53, 8, 2) & (cv.yy <= 54) & cv.m_of("pane1"), "pane0")
    for x in range(16, 39, 3):
        cv.line([(x, 55), (x, 58)], "frame")
        cv.px(x + 1, 56, "pane0")
    cv.line([(16, 55), (38, 55)], "frame")
    cv.ellipse(27, 48, 4, 3, "frame")
    cv.fill(cv.m_ellipse(27, 48, 3, 2), "pane1")
    cv.px(26, 47, "pane0")
    cv.line([(27, 43), (27, 44)], "frame")
    # A lone dragon tree in silhouette on the far rim.
    cv.line([(48, 59), (48, 54)], "mesa2")
    cv.line([(48, 55), (45, 52)], "mesa2")
    cv.line([(48, 55), (51, 52)], "mesa2")
    cv.ellipse(48, 51, 6, 2, "mesa2")
    cv.ellipse(48, 50, 5, 1, "mesa2")


def near(cv):
    # The gorge between, in shadow and haze, then the near red cliffs.
    cv.rect(0, 74, 159, 143, "haze")
    cv.fill(cv.m_poly([(0, 84), (66, 84), (72, 96), (0, 96)]), "haze1")
    cliff = cv.m_poly([(58, 96), (62, 88), (74, 84), (96, 82), (124, 80), (159, 79), (159, 143), (0, 143),
                       (0, 100), (30, 98)])
    cv.fill(cliff, "rock2")
    # The lit cliff top, its rim and the strata below it.
    cv.fill(cliff & cv.m_poly([(60, 90), (74, 84), (96, 82), (124, 80), (159, 79), (159, 86), (120, 87),
                                (90, 89), (66, 92)]), "rock1")
    cv.fill(cliff & cv.m_poly([(64, 88), (76, 84.5), (100, 82.5), (128, 80.5), (159, 79.5), (159, 81), (126, 82),
                                (98, 84), (74, 86)]), "rock0")
    for pts in ([(62, 95), (90, 93), (120, 92), (159, 91)], [(40, 102), (80, 100), (130, 99), (159, 98)]):
        cv.line(pts, "rock3")
    # The left cliff edge drops into the gorge, lit on its upper face.
    cv.fill(cliff & cv.m_poly([(56, 97), (62, 88), (66, 90), (64, 98)]), "rock1")
    # Calm below the text-box line: the shadowed face, two broad bands.
    cv.fill(cliff & (cv.yy >= 104), "rock3")
    cv.fill(cliff & (cv.yy >= 122), "rock4")
    cv.checker(cliff & (cv.yy == 103), "rock3")
    cv.checker(cliff & (cv.yy == 121), "rock4")


def branches(cv, cx, fork_y, tips, widths, lit):
    """A dichotomous branch tree: pair neighbouring tips level by level,
    each parent a little below and between its children, and draw every
    limb with the given width (trunk end first)."""
    levels = [tips]
    depth = (len(tips) - 1).bit_length()
    while len(levels[-1]) > 1:
        kids = levels[-1]
        t = len(levels) / depth
        y = kids[0][1] + (fork_y - kids[0][1]) * t ** 0.85
        levels.append([((kids[i][0] + kids[i + 1][0]) / 2, y) for i in range(0, len(kids), 2)])
    levels[-1] = [(cx, fork_y)]
    limbs = []
    for depth in range(len(levels) - 1, 0, -1):
        for i, p in enumerate(levels[depth]):
            for k in (levels[depth - 1][2 * i], levels[depth - 1][2 * i + 1]):
                limbs.append((p, k, widths[len(levels) - 1 - depth]))
    for p, k, w in limbs:
        cv.line([p, k], "bark3", w + 1)
    for p, k, w in limbs:
        cv.line([p, k], "bark1", w)
        if w > 1 and lit:
            cv.line([(p[0] - w / 3, p[1]), (k[0] - w / 3, k[1])], "bark0")


def crown(cv, cx, top, under, rx, scallop=6):
    """The umbrella crown: a smooth dome over a nearly flat underside, made
    of tufted lobes, rim-lit on the left by the low sun."""
    ry = under - top
    dome = cv.m_ellipse(cx, under, rx, ry) & (cv.yy <= under)
    lobes = dome.copy()
    n = max(4, int(2 * rx / scallop))
    for i in range(n + 1):
        x = cx - rx + 2 * rx * i / n
        lobes |= cv.m_ellipse(x, under, scallop * 0.6, 2.4)
    cv.fill(lobes, "leaf2")
    # Tuft clusters on the dome in staggered rows, lit on their upper-left
    # faces, smaller toward the crest.
    rows = 4
    for j in range(rows):
        y = top + 2.5 + j * (ry / rows)
        half = rx * (0.55 + 0.45 * (j + 1) / rows)
        n = int(half / 3.4)
        for i in range(-n, n + 1):
            x = cx + i * (half / max(n, 1)) + (j % 2) * 1.7
            w = 2.0 + 0.4 * j
            m = cv.m_ellipse(x - 0.5, y - 0.5, w, 1.4) & dome
            cv.fill(m & ~cv.m_ellipse(x + 1, y + 1, w, 1.4), "leaf1")
    rim = dome & ~cv.m_ellipse(cx + 3, under + 2, rx, ry)
    cv.fill(rim & (cv.xx < cx + rx * 0.35), "leaf0")
    cv.fill(rim & (cv.xx >= cx + rx * 0.35), "leaf1")
    # The underside in deep shade, with the branch tips poking into it.
    cv.fill(lobes & (cv.yy >= under - 1), "leaf3")
    cv.edge(lobes, "leaf3", "E")


def tree(cv, cx, base, fork_y, top, under, rx, trunk_w, widths, n_tips=8, lit=True):
    tips = [(cx - rx * 0.78 + 1.56 * rx * i / (n_tips - 1), under + 2) for i in range(n_tips)]
    # The trunk, flared at its foot, lit on the left.
    hw = trunk_w / 2
    trunk = cv.m_poly([(cx - hw - 2, base), (cx - hw, base - 4), (cx - hw + 0.5, fork_y), (cx + hw - 0.5, fork_y),
                       (cx + hw, base - 4), (cx + hw + 2, base)])
    cv.fill(trunk, "bark1")
    cv.fill(trunk & (cv.xx < cx - hw + max(1, trunk_w // 4)), "bark0")
    cv.fill(trunk & (cv.xx > cx + hw - max(1, trunk_w // 3)), "bark2")
    cv.outline(trunk, "bark3", "EW")
    branches(cv, cx, fork_y, tips, widths, lit)
    crown(cv, cx, top, under, rx)
    return trunk


def the_cut(cv, x, y):
    """A cut in the old trunk weeping resin: a dark wound, a bead at its lip
    and three red runs down the bark."""
    cv.poly([(x - 2, y), (x + 3, y - 2), (x + 4, y + 1), (x - 1, y + 3)], "bark3")
    cv.line([(x - 1, y + 1), (x + 3, y - 1)], "res2")
    cv.px(x, y + 1, "res1")
    cv.px(x + 1, y, "res0")
    for x0, length in ((x - 1, 9), (x + 1, 13), (x + 3, 6)):
        cv.line([(x0, y + 2), (x0, y + 2 + length)], "res1")
        cv.px(x0, y + 2 + length, "res2")
        cv.px(x0, y + 3, "res0")
    cv.ellipse(x + 1, y + 16, 1, 1, "res1")
    cv.px(x + 1, y + 15, "res0")


def dragon_trees():
    cv = Canvas(PAL, "sky0")
    sky(cv)
    far(cv)
    near(cv)
    # A young tree near the cliff edge, a second behind on the right, and the
    # great old tree in front of them, its crown spread over the ridge.
    tree(cv, 70, 88, 72, 49, 58, 15, 4, [3, 2], n_tips=4)
    tree(cv, 146, 82, 58, 29, 40, 22, 5, [4, 3, 2], n_tips=8)
    tree(cv, 104, 90, 56, 7, 27, 46, 10, [7, 5, 3, 1], n_tips=16)
    the_cut(cv, 102, 68)
    # Grass tufts and stones along the lit rim.
    for x, y in ((80, 85), (88, 84), (122, 82), (132, 81), (62, 90)):
        cv.px(x, y, "rock3")
        cv.px(x + 1, y, "rock2")
    return cv.image()


STILLS = {"dragon_trees": dragon_trees}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stills9")
    return out
