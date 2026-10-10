"""Chapter 10 story still, an original pixel painting on the stills.Canvas.

  centuryheart_sprouts  The heart of the Elder Grove, the moment after the
                        planting. The Elder's vast pale root arches across
                        the clearing; at its crest, where the Centuryheart
                        seed was pressed into a split in the bark, a small
                        brilliant green shoot unfurls its first two leaves
                        out of the burst husk. Light pours from it: a soft
                        halo, then veins of green-gold running both ways
                        along the root and up into the pale aspen trunks
                        that ring the clearing, all leaning in toward it.
                        Golden aspen leaves drift down through shafts of
                        light from the canopy. Relief and awe: the dark grove
                        warming from the middle out.

Composition follows stills.py: the bottom 48px sit under the text box, so
they stay calm (moss and the root's shadowed foot) and the shoot, the halo,
the veins and the trunks all live above y = 96. Light comes from the canopy
at the top left and from the shoot itself, so trunks are lit on their left
and on the side that faces the shoot. Aspen bark marks are single staggered
dashes, never pairs. Every coordinate is fixed; the output is deterministic.
"""
from __future__ import annotations

import common10 as common
from stills import Canvas

PAL = {
    # the grove's shadow, deepest at the edges
    "bg0": "#142824", "bg1": "#1c3830", "bg2": "#284a3c", "bg3": "#365c46",
    # far trunks in the gloom
    "ft0": "#7c9c88", "ft1": "#5c7c6c", "ft2": "#3e5c50",
    # the golden canopy and the light through it
    "sky": "#f8f0c0", "lf0": "#f8e890", "lf1": "#f0c040", "lf2": "#c88c28", "lf3": "#7c5420",
    # near aspen trunks and the Elder's root: pale bark
    "tr0": "#f8f8e8", "tr1": "#e0dcc4", "tr2": "#b0ac94", "tr3": "#727060", "tr4": "#44443c",
    # glow
    "gl0": "#f8f8d8", "gl1": "#eef8a8", "gl2": "#c0e080", "gl3": "#5c8c5c",
    # the shoot and the seed husk
    "sp0": "#f0ffc0", "sp1": "#a0e858", "sp2": "#50b038", "sp3": "#286c28",
    "hk0": "#c08848", "hk1": "#7c4c24",
    # moss and soil
    "gr0": "#4c7440", "gr1": "#34543a", "gr2": "#22382c", "gr3": "#16241e",
}

SX, SY = 80, 66          # the shoot's heart: the light source


def backdrop(cv):
    """The deep grove: dark at the edges, lifting toward the middle, with the
    shoot's halo already warming the air."""
    cv.rect(0, 0, 159, 143, "bg0")
    cv.glow(SX, SY + 4, [(96, "bg1", "dith"), (84, "bg1", "solid"), (66, "bg2", "dith"), (56, "bg2", "solid"),
                         (44, "bg3", "dith"), (36, "bg3", "solid"), (28, "gl3", "dith"), (22, "gl3", "solid")],
            ry_scale=0.8)


def far_trunks(cv):
    # Thin pale trunks deep in the grove, leaning in toward the heart; lit on
    # the side that faces the shoot.
    for x_foot, x_top, w in ((22, 30, 3), (40, 44, 2), (56, 58, 3), (66, 67, 2), (94, 93, 2), (104, 102, 3),
                             (120, 116, 2), (138, 130, 3)):
        m = cv.m_poly([(x_foot - w / 2, 92), (x_top - w / 2, 0), (x_top + w / 2, 0), (x_foot + w / 2, 92)])
        cv.fill(m, "ft1")
        lit = cv.m_poly([(x_foot - w / 2, 92), (x_top - w / 2, 0), (x_top, 0), (x_foot, 92)])
        side = lit if x_foot > SX else (m & ~lit)
        cv.fill(m & side, "ft0")
        cv.fill(m & (cv.yy < 22), "ft2")


def canopy(cv):
    """Golden aspen crowns across the top, broken by gaps of bright sky."""
    cv.rect(0, 0, 159, 6, "lf2")
    blobs = [(-4, 4, 22, 12), (20, 2, 18, 10), (40, 6, 16, 9), (58, 0, 20, 9), (82, 3, 16, 8), (100, 0, 20, 10),
             (122, 5, 16, 9), (142, 1, 20, 12)]
    for cx, cy, rx, ry in blobs:
        cv.ellipse(cx, cy, rx, ry, "lf2")
    for cx, cy, rx, ry in blobs:
        cv.ellipse(cx - 3, cy - 2, rx - 4, ry - 3, "lf1")
        cv.checker(cv.m_ellipse(cx - 6, cy - 4, rx - 9, ry - 6), "lf0")
    # The underside in shade, and leaf clumps hanging below it.
    for cx, cy, rx, ry in blobs:
        cv.fill(cv.m_ellipse(cx, cy, rx, ry) & ~cv.m_ellipse(cx - 2, cy - 3, rx, ry), "lf3")
    # Sky gaps between the crowns, where the light comes in.
    for x, y, rx, ry in ((36, 3, 4, 2), (78, 2, 4, 2), (118, 2, 3, 2), (60, 10, 2, 1)):
        cv.ellipse(x, y, rx, ry, "sky")
        cv.checker(cv.m_ellipse(x, y, rx + 2, ry + 1) & ~cv.m_ellipse(x, y, rx, ry), "lf0")


def shafts(cv):
    # Long beams from the canopy gaps toward the heart: a sparse dither of
    # lifted greens over the shadow, never over the trunks.
    air = cv.m_of("bg0", "bg1", "bg2", "bg3")
    for (x0, x1), (x2, x3) in (((34, 40), (64, 78)), ((76, 82), (78, 92)), ((116, 121), (94, 106))):
        m = cv.m_poly([(x0, 4), (x1, 4), (x3, 92), (x2, 92)]) & air
        cv.sparse(m & cv.m_of("bg0", "bg1"), "bg2")
        cv.sparse(m & cv.m_of("bg2"), "bg3", phase=1)
        cv.sparse(m & cv.m_of("bg3"), "gl3", phase=1)


def trunk(cv, foot, top, w_foot, w_top, y_top=0, y_foot=104, marks=()):
    """A near aspen trunk from (foot, y_foot) to (top, y_top), wider at the
    foot; lit on the left and on the side facing the shoot."""
    m = cv.m_poly([(foot - w_foot / 2, y_foot), (top - w_top / 2, y_top), (top + w_top / 2, y_top),
                   (foot + w_foot / 2, y_foot)])
    cv.fill(m, "tr1")

    def side(f):            # a strip at fraction f across the trunk (0 = left edge)
        return cv.m_poly([(foot - w_foot / 2 + f * w_foot, y_foot), (top - w_top / 2 + f * w_top, y_top),
                          (top + w_top / 2, y_top), (foot + w_foot / 2, y_foot)])

    cv.fill(m & side(0.72), "tr2")
    cv.fill(m & side(0.9), "tr3")
    lit = m & ~side(0.22)
    cv.fill(lit, "tr0")
    cv.outline(m, "tr4", "EW")
    for x, y, n in marks:                   # lenticels: single dark dashes
        cv.line([(x, y), (x + n, y)], "tr4")
        cv.px(x + 1, y - 1, "tr3")
    return m


def trunks(cv):
    # Two great trunks frame the clearing, two lesser ones stand behind the
    # root; all lean in toward the heart.
    cv_t = []
    cv_t.append(trunk(cv, 42, 50, 8, 6, y_foot=94, marks=[(42, 24, 2), (45, 46, 2), (41, 66, 3)]))
    cv_t.append(trunk(cv, 118, 110, 8, 6, y_foot=94, marks=[(110, 18, 2), (114, 40, 2), (116, 62, 3)]))
    cv_t.append(trunk(cv, 12, 24, 18, 14, marks=[(18, 14, 3), (13, 36, 4), (20, 52, 3), (11, 74, 4)]))
    cv_t.append(trunk(cv, 148, 136, 18, 14, marks=[(134, 20, 3), (141, 42, 4), (136, 58, 3), (145, 78, 4)]))
    return cv_t


def root(cv):
    """The Elder's root, a pale arch across the clearing from trunk to trunk,
    cresting under the shoot."""
    top = [(0, 92), (8, 89), (16, 88), (24, 85), (34, 83), (44, 79), (52, 78), (60, 75), (68, 72), (76, 70),
           (86, 70), (94, 72), (102, 74), (110, 77), (118, 79), (128, 84), (138, 86), (148, 88), (159, 92)]
    bottom = [(159, 112), (140, 106), (126, 100), (112, 96), (100, 92), (88, 89), (74, 89), (62, 92), (50, 96),
              (36, 100), (20, 106), (0, 112)]
    # The root lies half-buried: a hump of moss and soil under its arch.
    mound = cv.m_poly([(0, 104), (40, 96), (70, 88), (90, 88), (120, 96), (159, 104), (159, 143), (0, 143)])
    cv.fill(mound, "gr1")
    cv.checker(mound & ~cv.m_poly([(0, 106), (40, 98), (70, 90), (90, 90), (120, 98), (159, 106), (159, 143),
                                   (0, 143)]), "gr0")
    m = cv.m_poly(top + bottom)
    # Knots and burls along its back, and the swollen flare where it meets
    # each great trunk.
    for cx, cy, rx, ry in ((30, 85, 6, 3), (56, 77, 5, 3), (106, 76, 6, 3), (134, 85, 5, 3), (12, 92, 12, 6),
                           (148, 92, 12, 6)):
        m |= cv.m_ellipse(cx, cy, rx, ry)
    cv.fill(m, "tr1")
    under = cv.m_poly([(0, 100), (30, 93), (60, 86), (100, 86), (130, 93), (159, 100), (159, 112), (0, 112)])
    cv.fill(m & under, "tr2")
    cv.fill(m & cv.m_poly([(0, 106), (40, 97), (80, 91), (120, 97), (159, 106), (159, 112), (0, 112)]), "tr3")
    # Lit along its upper back: the band of pixels within 3px of the top edge.
    lit = m & ~(cv.m_poly([(x, y + 3) for x, y in top] + [(159, 130), (0, 130)]))
    for cx, cy, rx, ry in ((30, 85, 6, 3), (56, 77, 5, 3), (106, 76, 6, 3), (134, 85, 5, 3)):
        lit |= cv.m_ellipse(cx - 1, cy - 1, rx - 1, ry - 1)
    cv.fill(lit & m, "tr0")
    cv.outline(m, "tr4", "NSE")
    # Strands twisting along it: long shallow creases, and rootlets diving
    # into the moss from its underside.
    for pts in ([(20, 98), (36, 91), (50, 86), (62, 82)], [(98, 82), (112, 87), (124, 91), (140, 98)],
                [(4, 104), (18, 99), (30, 96)], [(130, 96), (144, 100), (156, 104)], [(66, 86), (76, 84)],
                [(86, 84), (94, 86)]):
        cv.line(pts, "tr3")
    return m


def veins(cv, root_m):
    # Light spreading from the shoot: a bright vein along each strand of the
    # root, and up into the trunks; brightest near the shoot, then dithered.
    for pts in ([(SX - 4, 77), (64, 79), (48, 84), (32, 90), (16, 95), (0, 99)],
                [(SX + 4, 77), (96, 79), (112, 84), (128, 90), (144, 95), (159, 99)],
                [(SX - 2, 80), (60, 86), (44, 92)], [(SX + 2, 80), (100, 86), (116, 92)]):
        cv.line(pts, "gl1")
    near = cv.m_ellipse(SX, 78, 22, 10)
    cv.fill(root_m & near & cv.m_of("gl1"), "gl0")
    # Up the trunks: the light climbs each, fading as it rises.
    for x0, y0, x1, y1 in ((44, 84, 49, 10), (116, 84, 111, 10), (16, 94, 24, 4), (144, 94, 136, 4)):
        m = cv.m_line([(x0, y0), (x1, y1)])
        halo = cv.m_line([(x0 + 1, y0), (x1 + 1, y1)]) & ~m
        cv.fill(halo & (cv.yy > (y0 + y1) // 2), "gl2")
        cv.checker(halo & (cv.yy <= (y0 + y1) // 2) & (cv.yy > y1 + 20), "gl2")
        cv.fill(m & (cv.yy > y1 + 20), "gl2")
        cv.fill(m & (cv.yy > (y0 + y1) // 2), "gl1")
        cv.checker(m & (cv.yy <= y1 + 20), "gl2")


def shoot(cv):
    """The Centuryheart shoot: out of the split husk in the root's crest, a
    short stem and two first leaves unfurling, the left one open, the right
    still curled; the brightest thing in the picture."""
    # The halo first, over air and bark alike, then the planting split.
    cv.glow(SX, SY, [(20, "gl2", "dith"), (14, "gl1", "dith"), (10, "gl1", "solid"), (6, "gl0", "solid")],
            ry_scale=0.85, only=cv.m_of("bg0", "bg1", "bg2", "bg3", "gl3", "ft0", "ft1"))
    cv.glow(SX, 74, [(16, "gl1", "dith"), (9, "gl0", "dith")], ry_scale=0.4, only=cv.m_of("tr1", "tr2", "tr0"))
    # The split in the bark and the burst husk.
    cv.poly([(73, 74), (77, 71), (83, 71), (87, 74), (80, 76)], "tr4")
    cv.poly([(74, 73), (77, 70), (79, 72), (77, 74)], "hk0")
    cv.poly([(86, 73), (83, 70), (81, 72), (83, 74)], "hk0")
    cv.px(75, 73, "hk1")
    cv.px(85, 73, "hk1")
    # The stem.
    cv.line([(80, 73), (80, 62)], "sp2", 2)
    cv.line([(80, 72), (80, 63)], "sp1")
    # The left leaf, open: a rounded aspen-like blade.
    cv.fill(cv.m_ellipse(73, 60, 7, 4) & ~cv.m_ellipse(78, 64, 3, 2), "sp2")
    cv.fill(cv.m_ellipse(72, 59, 6, 3), "sp1")
    cv.line([(67, 59), (73, 60), (79, 62)], "sp2")
    cv.checker(cv.m_ellipse(70, 58, 3, 1.5), "sp0")
    cv.outline(cv.m_ellipse(73, 60, 7, 4), "sp3", "SE")
    # The right leaf, still curled round itself.
    cv.fill(cv.m_ellipse(85, 58, 4, 5), "sp2")
    cv.fill(cv.m_ellipse(84, 57, 3, 4), "sp1")
    cv.line([(86, 54), (87, 58), (85, 61)], "sp3")
    cv.px(83, 55, "sp0")
    cv.outline(cv.m_ellipse(85, 58, 4, 5), "sp3", "E")
    # The bud between them.
    cv.ellipse(80, 60, 1.5, 2, "sp1")
    cv.px(80, 59, "sp0")


def leaves(cv):
    # Golden aspen leaves drifting down; round blades, some edge-on.
    shapes = {
        "flat": [".LL", "LLl", ".l."],
        "tilt": ["LL.", "Lll"],
        "edge": ["LLl"],
        "spin": [".L", "Ll", "l."],
    }
    key = {"L": "lf1", "l": "lf2"}
    for x, y, s in ((26, 30, "flat"), (58, 22, "tilt"), (98, 28, "spin"), (130, 34, "flat"), (70, 40, "edge"),
                    (34, 52, "spin"), (104, 50, "tilt"), (140, 56, "edge"), (60, 46, "flat"), (92, 40, "edge"),
                    (20, 66, "tilt"), (124, 68, "spin"), (52, 64, "edge"), (110, 64, "flat"), (84, 30, "spin"),
                    (150, 30, "tilt"), (8, 44, "edge")):
        cv.stamp(shapes[s], x, y, key)
    # A few caught in the glow, lit almost white.
    for x, y in ((66, 52), (94, 56), (88, 46)):
        cv.stamp(["LL", "Ll"], x, y, {"L": "lf0", "l": "lf1"})


def ground(cv):
    # Under the text box: moss and soil, the root's shadowed foot, a scatter
    # of fallen gold. Calm, low contrast.
    floor = (cv.yy >= 100) & ~cv.m_of("tr0", "tr1", "tr2", "tr3", "tr4")
    cv.fill(floor, "gr1")
    cv.fill(floor & (cv.yy >= 116), "gr2")
    cv.fill(floor & (cv.yy >= 130), "gr3")
    cv.checker(floor & (cv.yy == 115), "gr2")
    cv.checker(floor & (cv.yy == 129), "gr3")
    cv.fill((cv.yy >= 112) & cv.m_of("tr3", "tr2", "tr1", "tr0"), "tr3")
    cv.fill((cv.yy >= 122) & cv.m_of("tr3"), "tr4")
    # The moss lip along the root and the trunk feet.
    cv.outline(cv.m_of("tr0", "tr1", "tr2", "tr3", "tr4") & (cv.yy >= 96), "gr0", "S")
    for x, y in ((30, 118), (70, 124), (112, 120), (140, 126), (52, 134), (96, 136)):
        cv.px(x, y, "lf3")
        cv.px(x + 1, y, "lf2")


def canopy_front(cv):
    # Leaf clumps hanging in front of the trunk tops, so the trunks rise
    # into the crowns rather than stopping at them.
    for cx, cy, rx, ry in ((18, 3, 9, 4), (46, 2, 6, 3), (112, 3, 6, 3), (140, 2, 9, 4)):
        cv.ellipse(cx, cy, rx, ry, "lf2")
        cv.ellipse(cx - 1, cy - 1, rx - 2, ry - 1, "lf1")
        cv.checker(cv.m_ellipse(cx - 3, cy - 2, rx - 5, ry - 2), "lf0")
        cv.outline(cv.m_ellipse(cx, cy, rx, ry), "lf3", "S")


def motes(cv):
    # Sparks of light rising from the shoot into the beam above it.
    for x, y in ((78, 50), (83, 46), (76, 40), (81, 34), (86, 52), (73, 47), (80, 26), (84, 38)):
        cv.px(x, y, "gl0")


def centuryheart_sprouts():
    cv = Canvas(PAL, "bg0")
    backdrop(cv)
    far_trunks(cv)
    shafts(cv)
    canopy(cv)
    trunks(cv)
    canopy_front(cv)
    root_m = root(cv)
    veins(cv, root_m)
    ground(cv)
    shoot(cv)
    motes(cv)
    leaves(cv)
    return cv.image()


STILLS = {"centuryheart_sprouts": centuryheart_sprouts}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stills10")
    return out
