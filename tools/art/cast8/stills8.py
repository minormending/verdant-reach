"""Chapter 8 story still, an original pixel painting on the stills.Canvas.

  mercer_hub_map  The Relay roof at night. MERCER THORNE, seen from behind,
                  holds the hub map up in both gloved hands; on it, glowing
                  hub points are joined across the valley by lines drawn like
                  roots, the reveal of what he came for. The listening mast
                  rises behind him with its red beacon, the open map tube
                  rides on his back, and far below Glasshouse City's dome
                  glows green. No readable words.

Composition follows stills.py: the bottom 48px sit under the text box, so
they stay calm (the dark roof) and the map, the dome and the beacon all live
in the upper two-thirds. Every coordinate and pattern is fixed, so the
output is deterministic.
"""
from __future__ import annotations

import math

import common8 as common
from stills import Canvas

PAL = {
    # night sky, valley and city
    "sky0": "#0c1020", "sky1": "#121a30", "sky2": "#1a2440", "sky3": "#243052", "star": "#c8d0e8",
    "star1": "#6878a0",
    "hill0": "#1a2438", "hill1": "#121a2a",
    "city0": "#182030", "city1": "#101624", "win0": "#f0d880", "win1": "#987840",
    "dome0": "#d8f8c8", "dome1": "#88d098", "dome2": "#48906c", "dome3": "#285048", "glow": "#1e3a44",
    # the mast and its beacon
    "mast0": "#406860", "mast1": "#24403c", "bea0": "#f8a080", "bea1": "#e84838", "bea2": "#5a2030",
    # the roof
    "rail0": "#384450", "rail1": "#20262e", "roof0": "#222a34", "roof1": "#1a2028",
    # the map
    "pap0": "#c0c0a8", "pap1": "#a0a08c", "pap2": "#787868", "pap3": "#585848", "ink": "#6c6c5c",
    "root0": "#2e5430", "root1": "#78c060", "hub0": "#f8f8d0", "hub1": "#d0f080", "hub2": "#90c870",
    "mark": "#d84838",
    # MERCER
    "coat0": "#585c6c", "coat1": "#383c4a", "coat2": "#262830", "rim": "#78a890",
    "hair0": "#2c3c7c", "hair1": "#18204a", "sil0": "#d0d0d8", "sil1": "#9898a8",
    "skin0": "#d8a880", "skin1": "#a07050", "brd0": "#b8b8c0", "brd1": "#8888a0",
    "glv0": "#4a3c38", "glv1": "#2a2020",
    "tub0": "#a86838", "tub1": "#6c4020", "tub2": "#301c10", "brass": "#e8c058",
    "k": "#181818",
}

# Map-space hub points (x, y, size) and the root lines joining them.
HUBS = [(60, 25, 2), (43, 15, 1), (44, 42, 1), (82, 14, 1), (100, 30, 1), (114, 13, 1), (113, 45, 1),
        (62, 45, 1)]
LINKS = [(0, 1), (0, 2), (0, 3), (0, 7), (3, 4), (3, 5), (4, 6), (0, 4)]
DOME_X = 22
MAP = [(34, 9), (126, 5), (127, 55), (33, 57)]
RING = (60, 25)


def root_path(a, b, seed):
    """A root-like line from hub a to hub b: a gentle meander with kinks."""
    (x0, y0), (x1, y1) = a, b
    n = max(4, int(math.hypot(x1 - x0, y1 - y0) / 4))
    pts = []
    for i in range(n + 1):
        t = i / n
        wob = math.sin(t * math.pi * 2 + seed) * 2.0 * math.sin(t * math.pi)
        nx, ny = -(y1 - y0), (x1 - x0)
        ln = math.hypot(nx, ny) or 1
        pts.append((x0 + (x1 - x0) * t + nx / ln * wob, y0 + (y1 - y0) * t + ny / ln * wob))
    return pts


def sky(cv):
    cv.bands([0, 16, 34, 50], ["sky0", "sky1", "sky2", "sky3"])
    for x, y in ((8, 6), (27, 3), (58, 5), (31, 22), (14, 40), (6, 28), (128, 26), (122, 6), (98, 4), (152, 44),
                 (66, 2), (21, 52)):
        cv.px(x, y, "star")
    for x, y in ((44, 8), (17, 17), (119, 40), (3, 50), (110, 3), (85, 6)):
        cv.px(x, y, "star1")


def valley(cv):
    # Far hills across the valley, then the city spread out below the roof.
    cv.poly([(0, 60), (18, 54), (40, 57), (64, 51), (90, 56), (118, 50), (140, 55), (159, 52), (159, 70), (0, 70)],
            "hill0")
    cv.poly([(0, 66), (30, 62), (60, 65), (100, 61), (130, 64), (159, 61), (159, 72), (0, 72)], "hill1")
    # The dome's green glow spilling into the haze around it.
    cv.glow(24, 80, [(34, "glow", "dith"), (26, "glow", "solid")], ry_scale=0.6,
            only=cv.m_of("hill0", "hill1", "sky3", "sky2"))
    cv.rect(0, 70, 159, 86, "city1")
    for x0, x1, top in ((44, 52, 73), (53, 60, 76), (70, 82, 72), (83, 92, 75), (93, 104, 70), (105, 116, 74),
                        (117, 128, 71), (129, 140, 73), (141, 159, 70)):
        cv.rect(x0, top, x1, 86, "city0")
    for i, (x, y) in enumerate(((46, 76), (49, 80), (56, 79), (73, 75), (78, 79), (86, 78), (96, 73), (100, 77),
                                (108, 77), (112, 80), (120, 74), (125, 78), (132, 76), (136, 80), (145, 73),
                                (150, 77), (155, 74))):
        cv.px(x, y, "win0" if i % 3 else "win1")
    # Glasshouse City's dome, lit from inside: ribs and glass panes.
    cx = DOME_X
    dome = cv.m_ellipse(cx, 84, 22, 20) & (cv.yy <= 84)
    cv.fill(dome, "dome2")
    cv.checker(cv.m_ellipse(cx - 2, 82, 17, 15) & dome, "dome1")
    cv.fill(cv.m_ellipse(cx - 3, 80, 11, 10) & dome, "dome1")
    cv.checker(cv.m_ellipse(cx - 4, 79, 7, 6) & dome, "dome0")
    for dx in (-15, -8, 0, 8, 15):                                       # meridian ribs
        cv.line([(cx + dx * 0.3, 65), (cx + dx, 84)], "dome3")
    for y in (71, 78):                                                   # rings
        ring = cv.m_ellipse(cx, 84, 22, 84 - y + 1) & ~cv.m_ellipse(cx, 84, 21, 84 - y)
        cv.fill(ring & dome, "dome3")
    cv.outline(dome, "dome3", "NEW")
    cv.rect(cx - 2, 62, cx + 2, 64, "dome2")                             # the lantern on top
    cv.px(cx, 61, "dome0")


def mast(cv):
    """The listening mast: a lattice tower rising behind MERCER."""
    left = [(134, 96), (143, 8)]
    right = [(158, 96), (149, 8)]
    cv.line(left, "mast0")
    cv.line([(135, 96), (144, 8)], "mast0")
    cv.line(right, "mast1")
    cv.line([(157, 96), (148, 8)], "mast1")
    for y in range(14, 96, 10):                                          # X-bracing
        t0, t1 = (96 - y) / 88, (96 - min(95, y + 10)) / 88
        xl0, xr0 = 134 + 9 * t0, 158 - 9 * t0
        xl1, xr1 = 134 + 9 * t1, 158 - 9 * t1
        cv.line([(xl0, y), (xr1, y + 10)], "mast1")
        cv.line([(xr0, y), (xl1, y + 10)], "mast1")
        cv.line([(xl0, y), (xr0, y)], "mast0")
    cv.rect(142, 4, 150, 8, "mast1")                                     # platform and dish
    cv.line([(142, 4), (150, 4)], "mast0")
    cv.line([(146, 0), (146, 4)], "mast0")
    cv.glow(146, 2, [(8, "bea2", "dith"), (4, "bea2", "solid")], only=cv.m_of("sky0", "sky1"))
    cv.rect(145, 1, 147, 2, "bea1")
    cv.px(145, 1, "bea0")


def roof(cv):
    cv.rect(0, 87, 159, 143, "roof0")
    for y in (100, 116, 134):
        cv.line([(0, y), (159, y)], "roof1")
    for x in range(8, 160, 24):
        cv.line([(x, 87), (x - 6, 143)], "roof1")
    cv.rect(0, 84, 159, 85, "rail0")                                     # the iron railing's top bar
    cv.line([(0, 86), (159, 86)], "rail1")
    for x in range(2, 160, 8):
        cv.line([(x, 86), (x, 92)], "rail1")
    cv.line([(0, 92), (159, 92)], "rail1")


def the_map(cv):
    paper = cv.m_poly(MAP)
    cv.fill(paper, "pap1")
    cv.fill(paper & cv.m_poly([(34, 9), (126, 5), (100, 24), (36, 34)]), "pap0")
    cv.checker(paper & cv.m_poly([(36, 34), (100, 24), (127, 34), (127, 55), (33, 57)]), "pap0")
    # Fold creases, a curl at the top corners.
    cv.line([(80, 7), (80, 56)], "pap2")
    cv.line([(34, 32), (126, 30)], "pap2")
    cv.poly([(34, 9), (40, 9), (35, 14)], "pap2")
    cv.poly([(126, 5), (120, 5), (126, 10)], "pap2")
    cv.line([(34, 9), (126, 5)], "pap0")
    # The valley drawn on it: a river and a few contour hills.
    cv.line([(36, 54), (48, 50), (58, 52), (70, 40), (86, 40), (98, 34), (110, 36), (124, 24)], "ink")
    for cx, cy, rx in ((50, 30, 7), (98, 20, 8), (70, 13, 5), (94, 46, 6)):
        ring = cv.m_ellipse(cx, cy, rx, rx * 0.5) & ~cv.m_ellipse(cx, cy, rx - 1, rx * 0.5 - 1)
        cv.fill(ring & paper, "pap2")
    cv.edge(paper, "pap3", "S")
    cv.edge(paper, "pap3", "E")
    # Root lines between the hubs: a dark root with a glowing core, and
    # little rootlets kinking off them.
    for n, (a, b) in enumerate(LINKS):
        pa, pb = HUBS[a][:2], HUBS[b][:2]
        pts = root_path(pa, pb, n * 1.7)
        cv.line(pts, "root0", width=2)
        cv.line(pts, "root1")
        mid = pts[len(pts) // 2]
        side = 1 if n % 2 else -1
        cv.line([mid, (mid[0] + 2 * side, mid[1] + 3), (mid[0] + 3 * side, mid[1] + 5)], "root0")
        q = pts[len(pts) // 3]
        cv.line([q, (q[0] - 2 * side, q[1] + 2)], "root0")
    # The glowing hubs; the largest is ringed in red: the one that matters.
    for x, y, s in HUBS:
        cv.glow(x, y, [(3 + 2 * s, "hub2", "dith"), (1 + s, "hub1", "solid")], only=paper)
        cv.px(x, y, "hub0")
        if s > 1:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                cv.px(x + dx, y + dy, "hub0")
    ring = cv.m_ellipse(*RING, 8, 7) & ~cv.m_ellipse(*RING, 7, 6)
    cv.fill(ring & paper, "mark")
    cv.outline(paper, "k", "NESW")


def mercer(cv):
    """MERCER from behind, head turned a little left, holding the map up."""
    # Sleeves out from the shoulders, bent at the elbow, to the map's lower
    # corners; the gloves gripping the edge.
    left = cv.m_poly([(52, 84), (60, 72), (49, 64), (43, 55), (36, 58), (41, 68)])
    right = cv.m_poly([(108, 84), (100, 72), (111, 64), (118, 53), (125, 56), (119, 68)])
    cv.fill(left | right, "coat1")
    cv.line([(58, 72), (48, 64), (42, 56)], "coat0", width=2)
    cv.line([(102, 72), (111, 63), (117, 54)], "coat0")
    cv.outline(left | right, "k", "NESW")
    for gx, gy in ((39, 55), (122, 53)):
        cv.ellipse(gx, gy, 4, 3, "k")
        cv.ellipse(gx, gy, 3, 2, "glv1")
        cv.ellipse(gx - 1, gy - 1, 2, 1, "glv0")
    # The coat: shoulders and back tapering down into the dark.
    body = cv.m_poly([(48, 143), (49, 84), (54, 74), (66, 68), (94, 68), (106, 74), (111, 84), (112, 143)])
    cv.fill(body, "coat1")
    cv.fill(body & cv.m_poly([(49, 84), (54, 74), (66, 68), (80, 68), (72, 92), (52, 112)]), "coat0")
    cv.line([(80, 74), (80, 143)], "coat2")                              # the centre back seam
    cv.line([(84, 110), (110, 110)], "coat2")                            # the waist line
    cv.outline(body, "k", "NEW")
    cv.edge(body & (cv.yy < 84), "rim", "N")
    # The map tube slung across his back, its cap off: the map came from here.
    tube = cv.m_line([(60, 78), (104, 126)], width=8)
    cv.fill(tube & body, "tub0")
    cv.fill(tube & body & cv.m_line([(63, 81), (106, 126)], width=3), "tub1")
    for t in (0.35, 0.7):
        x, y = 60 + 44 * t, 78 + 48 * t
        cv.line([(x - 3, y + 3), (x + 3, y - 3)], "tub1")
    cv.ellipse(60, 78, 5, 4, "k")
    cv.ellipse(60, 78, 4, 3, "tub2")
    cv.line([(56, 76), (59, 74)], "brass")
    # The high collar standing up round his neck.
    collar = cv.m_poly([(66, 72), (67, 60), (72, 57), (90, 57), (95, 60), (96, 72)])
    cv.fill(collar, "coat1")
    cv.fill(collar & cv.m_poly([(66, 72), (67, 60), (72, 57), (78, 57), (76, 72)]), "coat0")
    cv.outline(collar, "k", "NEW")
    cv.line([(67, 60), (72, 57), (90, 57)], "rim")
    # The head from behind, turned a little left: an ear, the edge of the
    # cheek and the trimmed beard.
    head = cv.m_ellipse(81, 47, 11, 13)
    cv.fill(head, "hair0")
    cv.fill(head & cv.m_poly([(69, 43), (74, 46), (76, 54), (73, 60), (69, 56)]), "skin0")
    cv.fill(head & cv.m_poly([(69, 53), (74, 55), (77, 61), (71, 61)]), "brd0")
    cv.line([(70, 53), (73, 55), (75, 58)], "brd1")
    cv.ellipse(76, 49, 2, 3, "skin1")                                   # the ear
    cv.px(75, 48, "skin0")
    cv.px(70, 47, "skin1")
    # Hair swept back: combed lines, and silver streaking back from the temple.
    for pts in ([(74, 36), (83, 37), (89, 43)], [(78, 35), (87, 35)], [(80, 49), (86, 55)]):
        cv.line(pts, "hair1")
    cv.line([(71, 41), (76, 39), (84, 40), (90, 46)], "sil1")
    cv.line([(72, 39), (77, 37), (83, 38)], "sil0")
    cv.line([(76, 43), (84, 44), (88, 49)], "sil1")
    cv.line([(81, 57), (89, 55)], "sil1")
    cv.px(84, 56, "sil0")
    cv.edge(head, "rim", "N")
    cv.outline(head, "k", "NEW")


def mercer_hub_map():
    cv = Canvas(PAL, "sky0")
    sky(cv)
    valley(cv)
    mast(cv)
    roof(cv)
    the_map(cv)
    mercer(cv)
    return cv.image()


STILLS = {"mercer_hub_map": mercer_hub_map}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stills8")
    return out
