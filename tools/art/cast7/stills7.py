"""Chapter 7 story stills, original pixel paintings on the stills.Canvas.

  rootstock_files  the hideout files desk under one hanging lamp. An open
                   folder: a pinned photo of a glowing plant, a stamped
                   TRIAL 1 label, and a chart whose line spikes well before a
                   red-marked date (the Long Bloom). Scattered papers, and
                   the steel edge of a graft collar on the desk.
  crimson_lily     Bloom Lake at dusk, turned red: the CRIMSON LILY glowing on
                   its islet in the middle distance, mist on the water, dark
                   larches on the far shore, the player's raft small in the
                   foreground.

Composition follows stills.py: the bottom 48px sit under the text box, so
they stay calm and every focal point lives in the upper two-thirds. All
coordinates and patterns are fixed, so the output is deterministic.
"""
from __future__ import annotations

import common7 as common
from stills import Canvas

# 3x5 stamp lettering (only what the stamp needs; never readable prose).
GLYPHS = {
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "A": [".#.", "#.#", "###", "#.#", "#.#"],
    "L": ["#..", "#..", "#..", "#..", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    " ": ["..", "..", "..", "..", ".."],
}


def text(cv, s, x, y, c):
    for ch in s:
        rows = GLYPHS[ch]
        cv.stamp(rows, x, y, {"#": c})
        x += len(rows[0]) + 1
    return x


def rootstock_files():
    cv = Canvas({
        "wall0": "#283038", "wall1": "#1e252c", "wall2": "#161c22", "wall3": "#10141a",
        "beam0": "#384048", "beam1": "#262e36",
        "glow0": "#f8e8a8", "glow1": "#e0c070", "glow2": "#987838", "glow3": "#584830",
        "shade0": "#589068", "shade1": "#386048", "shade2": "#203828", "cord": "#0c1014",
        "desk0": "#906040", "desk1": "#704830", "desk2": "#503420", "desk3": "#30200c",
        "deskL": "#b07850",
        "fold0": "#e8c880", "fold1": "#c8a060", "fold2": "#987040",
        "pap0": "#f8f0e0", "pap1": "#d8d0c0", "pap2": "#a8a090", "pap3": "#787068",
        "ink": "#383040", "red0": "#e04838", "red1": "#a82820",
        "pho0": "#203028", "pho1": "#88f0a0", "pho2": "#48b068", "pho3": "#286040", "phoW": "#e8fff0",
        "st0": "#d8e0e8", "st1": "#98a0b0", "st2": "#606878", "st3": "#383c48", "led": "#f04838",
        "pin": "#d84030",
    }, "wall1")
    # --- the room: a dark wall, a ceiling beam, a filing cabinet and a pinboard in the gloom
    cv.bands([0, 8, 36, 52], ["wall2", "wall1", "wall1", "wall2"])
    cv.rect(0, 0, 159, 6, "beam1")
    cv.rect(0, 6, 159, 7, "wall3")
    cv.line([(0, 2), (159, 2)], "beam0")
    for x in (12, 148):                                         # bolts on the beam
        cv.px(x, 4, "beam0")
    cv.rect(4, 18, 30, 58, "wall2")                              # filing cabinet (left)
    cv.rect(5, 19, 29, 57, "beam1")
    for y in (20, 33, 46):
        cv.rect(6, y, 28, y + 11, "wall1")
        cv.rect(14, y + 4, 20, y + 5, "beam0")
        cv.line([(6, y + 11), (28, y + 11)], "wall3")
    cv.rect(122, 14, 154, 40, "wall3")                           # pinboard (right)
    cv.rect(123, 15, 153, 39, "desk3")
    for x, y, w, h in ((126, 18, 9, 11), (138, 17, 12, 8), (139, 27, 10, 10), (127, 31, 8, 6)):
        cv.rect(x, y, x + w, y + h, "pap3")
        cv.px(x + w // 2, y, "red1")
        for yy in range(y + 2, y + h - 1, 2):
            cv.line([(x + 1, yy), (x + w - 2, yy)], "wall1")
    # --- the hanging lamp and its cone of light -------------------------------
    cv.line([(80, 0), (80, 15)], "cord")
    cone = cv.m_poly([(70, 24), (90, 24), (132, 62), (28, 62)])
    cv.checker(cone & (cv.yy < 44), "wall0")
    cv.fill(cone & (cv.yy >= 44) & ~cv.m_rect(0, 52, 159, 143), "wall0")
    cv.poly([(76, 15), (84, 15), (93, 25), (67, 25)], "shade1")  # the green enamel shade
    cv.poly([(76, 15), (80, 15), (72, 24), (67, 25)], "shade0")
    cv.line([(67, 25), (93, 25)], "shade2")
    cv.rect(78, 13, 82, 15, "shade2")
    cv.glow(80, 27, [(8, "glow3", "dith")], ry_scale=0.5, only=cv.m_of("wall0", "wall1", "wall2"))
    cv.ellipse(80, 26, 5, 2, "glow0")
    cv.line([(74, 26), (86, 26)], "glow1")
    # --- the desk: a lit pool on the top, the dark front below -----------------
    cv.rect(0, 56, 159, 102, "desk2")
    cv.line([(0, 56), (159, 56)], "desk1")
    pool = cv.m_ellipse(80, 76, 74, 24) & cv.m_rect(0, 57, 159, 101)
    cv.checker(pool, "desk1")
    cv.fill(cv.m_ellipse(80, 76, 62, 19) & cv.m_rect(0, 57, 159, 101), "desk1")
    cv.checker(cv.m_ellipse(78, 74, 50, 15) & cv.m_rect(0, 57, 159, 101), "desk0")
    for y in (64, 80, 93):                                       # wood grain
        cv.line([(6, y), (40, y + 1), (70, y)], "desk2")
        cv.line([(98, y + 2), (150, y + 1)], "desk2")
    cv.rect(0, 102, 159, 104, "desk0")                           # front edge, lit
    cv.line([(0, 105), (159, 105)], "desk3")
    cv.rect(0, 106, 159, 143, "desk3")
    for x in (52, 106):                                          # drawer seams in shadow
        cv.line([(x, 106), (x, 143)], "wall3")
    cv.rect(24, 116, 30, 117, "desk2")
    cv.rect(129, 116, 135, 117, "desk2")
    # --- scattered papers ---------------------------------------------------
    for pts, lines in (
        ([(6, 72), (30, 66), (36, 88), (12, 95)], [((11, 75), (29, 70)), ((12, 79), (31, 74)), ((14, 84), (27, 80))]),
        ([(124, 60), (150, 63), (146, 84), (121, 80)], [((127, 65), (146, 67)), ((126, 70), (145, 72)),
                                                       ((125, 75), (138, 76))]),
        ([(18, 90), (44, 92), (43, 101), (17, 100)], [((21, 94), (39, 95))]),
    ):
        cv.poly(pts, "pap1")
        cv.line([pts[0], pts[1]], "pap0")
        cv.line([pts[2], pts[3]], "pap2")
        for a, b in lines:
            cv.line([a, b], "pap2")
    # --- the open folder ----------------------------------------------------
    cv.poly([(33, 59), (127, 59), (131, 96), (29, 96)], "fold2")          # the cover, opened flat
    cv.poly([(35, 58), (79, 58), (79, 93), (32, 93)], "fold0")            # left leaf
    cv.poly([(81, 58), (125, 58), (128, 93), (81, 93)], "fold0")          # right leaf
    cv.line([(80, 58), (80, 94)], "fold2")
    cv.line([(35, 58), (79, 58)], "pap0")
    cv.line([(81, 58), (125, 58)], "pap0")
    cv.line([(32, 93), (79, 93)], "fold1")
    cv.line([(81, 93), (128, 93)], "fold1")
    cv.rect(110, 55, 124, 58, "fold1")                                    # the tab
    cv.line([(111, 55), (123, 55)], "fold0")
    # Left leaf: the pinned photograph of a glowing plant.
    cv.rect(41, 61, 71, 82, "pap0")
    cv.rect(43, 63, 69, 80, "pho0")
    cv.glow(56, 72, [(9, "pho3", "dith"), (6, "pho3", "solid"), (4, "pho2", "dith")],
            only=cv.m_rect(43, 63, 69, 80))
    cv.line([(56, 79), (56, 70)], "pho2")                                  # the plant: stem and leaves
    for pts in ([(56, 75), (52, 72), (50, 72)], [(56, 74), (60, 71), (62, 71)], [(56, 71), (53, 68)],
                [(56, 70), (59, 67)]):
        cv.line(pts, "pho1")
    cv.ellipse(56, 68, 1, 1, "phoW")
    cv.px(56, 66, "pho1")
    cv.line([(43, 80), (69, 80)], "pho3")
    cv.rect(54, 59, 58, 61, "pin")                                         # the pin
    cv.px(55, 59, "red0")
    cv.px(57, 61, "red1")
    # The TRIAL 1 stamp, in red, set a little crooked under the photo.
    cv.rect(41, 84, 72, 92, "red1")
    cv.rect(42, 85, 71, 91, "fold0")
    text(cv, "TRIAL 1", 44, 86, "red1")
    cv.px(72, 84, "fold0")
    cv.px(41, 92, "fold0")
    # Right leaf: the chart. A flat line spikes sharply, long before the
    # red-marked date of the Long Bloom.
    cv.rect(85, 61, 124, 87, "pap0")
    for x in range(92, 123, 6):
        cv.line([(x, 63), (x, 83)], "pap1")
    for y in (67, 73, 79):
        cv.line([(89, y), (122, y)], "pap1")
    cv.line([(89, 62), (89, 84)], "ink")                                   # axes
    cv.line([(89, 84), (123, 84)], "ink")
    for x in range(92, 123, 6):
        cv.px(x, 85, "ink")
    cv.line([(90, 82), (95, 82), (97, 81), (99, 82), (100, 81), (101, 74), (102, 65), (103, 64), (104, 68),
             (106, 66), (108, 69), (110, 65), (112, 67), (114, 64), (116, 66), (118, 65), (121, 66)], "ink")
    cv.line([(101, 75), (102, 66)], "red1")                                # the spike, inked over
    for y in range(62, 85, 2):                                             # the marked date: dashed red
        cv.px(118, y, "red0")
    cv.poly([(118, 61), (122, 62), (118, 64)], "red0")                     # its flag
    cv.px(118, 86, "red0")
    cv.px(117, 86, "red0")
    cv.px(119, 86, "red0")
    for x0, x1, y in ((86, 106, 89), (86, 99, 91)):                         # unreadable note lines
        cv.line([(x0, y), (x1, y)], "fold1")
    cv.rect(83, 59, 86, 62, "st1")                                         # a paperclip
    cv.line([(84, 60), (84, 63)], "st0")
    # --- the edge of a graft collar on the desk -------------------------------
    collar = cv.m_ellipse(160, 80, 24, 13) & ~cv.m_ellipse(160, 80, 15, 7)
    cv.fill(collar, "st2")
    cv.fill(collar & cv.m_ellipse(158, 78, 23, 11) & (cv.yy < 79), "st1")
    cv.fill(collar & (cv.yy < 72), "st0")
    cv.fill(collar & (cv.yy > 88), "st3")
    cv.outline(collar, "desk3", "SW")
    for x, y in ((139, 74), (138, 84), (149, 90)):                         # bolts
        cv.px(x, y, "st3")
        cv.px(x - 1, y - 1, "st0")
    cv.rect(142, 69, 144, 70, "st3")
    cv.px(143, 69, "led")
    cv.glow(143, 69, [(2, "red1", "dith")], only=cv.m_of("desk1", "desk2", "desk0", "pap1"))
    cv.px(143, 69, "led")
    # --- the light falls on the folder; the edges of the pool stay dim -----------
    return cv.image()


def crimson_lily():
    cv = Canvas({
        "sky0": "#281838", "sky1": "#482040", "sky2": "#782840", "sky3": "#b03840", "sky4": "#e06848",
        "star": "#e8c0c8",
        "mtn0": "#683050", "mtn1": "#502848", "snow0": "#f0a0a0", "snow1": "#c07080",
        "far0": "#301828", "far1": "#201020", "larch": "#180c18",
        "lake0": "#c03840", "lake1": "#902838", "lake2": "#681c30", "lake3": "#481428", "lake4": "#301020",
        "mist0": "#e8a0a8", "mist1": "#c07080",
        "isle0": "#402030", "isle1": "#281420",
        "lily0": "#f86070", "lily1": "#d02848", "lily2": "#901838", "lily3": "#580c20", "lilyW": "#f8d0d0",
        "halo0": "#e04858", "halo1": "#a02838",
        "raft0": "#709848", "raft1": "#486838", "raft2": "#283c24",
        "pl0": "#407038", "pl1": "#b05830", "pl2": "#482018", "pl3": "#803820",
    }, "sky0")
    # --- the dusk sky, warming to a red band at the horizon ---------------------
    cv.bands([0, 10, 20, 29, 36], ["sky0", "sky1", "sky2", "sky3", "sky4"])
    for x, y in ((14, 4), (47, 8), (118, 3), (141, 11), (89, 6)):
        cv.px(x, y, "star")
    # --- distant peaks with pink-lit snow --------------------------------------
    cv.poly([(0, 40), (14, 30), (24, 34), (40, 22), (54, 31), (66, 27), (80, 36), (96, 25), (110, 18),
             (126, 30), (140, 24), (159, 34), (159, 44), (0, 44)], "mtn1")
    cv.poly([(40, 22), (46, 27), (42, 27), (38, 30), (33, 28)], "snow0")
    cv.poly([(110, 18), (117, 24), (112, 24), (108, 27), (104, 23)], "snow0")
    cv.poly([(140, 24), (145, 27), (138, 28), (136, 26)], "snow1")
    cv.poly([(110, 18), (126, 30), (118, 30), (113, 25)], "mtn0")
    cv.poly([(40, 22), (54, 31), (46, 31)], "mtn0")
    # --- the far shore: a dark band of larches --------------------------------
    cv.rect(0, 43, 159, 50, "far0")
    for i, x in enumerate(range(-2, 162, 5)):
        h = 7 + (i * 7) % 5
        base = 49 + (i % 2)
        cv.poly([(x, base), (x + 3, base - h), (x + 6, base)], "larch")
        cv.px(x + 3, base - h - 1, "larch")
    cv.rect(0, 49, 159, 51, "far1")
    # --- the red lake: darker bands toward the viewer --------------------------
    cv.bands([52, 58, 70, 86, 104], ["lake0", "lake1", "lake2", "lake3", "lake4"])
    for y, x0, x1 in ((54, 10, 40), (55, 90, 130), (60, 20, 48), (62, 104, 150), (66, 4, 30), (74, 118, 156),
                      (78, 8, 40), (90, 100, 140)):
        cv.line([(x0, y), (x1, y)], "lake0" if y < 70 else "lake1")
    # The sky's red band reflected in the water at the far shore.
    cv.checker(cv.m_rect(0, 52, 159, 53), "sky4")
    # --- the islet and the CRIMSON LILY glowing on it --------------------------
    cv.glow(80, 59, [(30, "halo1", "dith"), (21, "halo1", "solid"), (14, "halo0", "dith")], ry_scale=0.5,
            only=cv.m_rect(0, 40, 159, 76) & ~cv.m_of("mtn0", "mtn1", "snow0", "snow1"))
    cv.ellipse(80, 67, 21, 3, "isle0")                                    # low rocky islet
    cv.ellipse(83, 68, 17, 2, "isle1")
    cv.line([(62, 67), (68, 65), (92, 65), (99, 67)], "isle0")
    cv.ellipse(80, 64, 13, 3, "lily2")                                    # the pad and its upturned rim
    cv.ellipse(80, 64, 11, 2, "lily3")
    cv.line([(68, 63), (71, 62), (89, 62), (92, 63)], "lily1")
    cv.line([(69, 66), (91, 66)], "lily1")
    for x in range(70, 91, 3):
        cv.px(x, 67, "lily2")
    cv.poly([(72, 63), (72, 59), (74, 57), (75, 59), (76, 55), (78, 54), (79, 56), (80, 52), (81, 56), (82, 54),
             (84, 55), (85, 59), (86, 57), (88, 59), (88, 63)], "lily1")  # the bloom: crimson outer petals
    cv.poly([(74, 63), (75, 59), (77, 58), (78, 60), (80, 56), (82, 60), (83, 58), (85, 59), (86, 63)], "lily0")
    cv.line([(72, 63), (88, 63)], "lily2")
    for x, y in ((80, 52), (79, 57), (78, 58), (77, 59), (80, 56)):
        cv.px(x, y, "lilyW")
    cv.line([(81, 58), (82, 61)], "lily1")
    for x, y in ((70, 53), (91, 52), (66, 58), (95, 57), (80, 47), (74, 49), (87, 48)):   # motes in the glow
        cv.px(x, y, "lily0")
    for x0, x1, y in ((70, 90, 70), (72, 88, 72), (74, 86, 74), (76, 84, 76), (77, 83, 78), (78, 82, 80),
                      (79, 81, 82)):                                       # the glow's reflection
        for x in range(x0, x1 + 1, 2):
            cv.px(x + (y // 2) % 2, y, "halo0")
    # --- mist drifting low over the water ------------------------------------
    for cx, cy, rx, ry, ph in ((26, 55, 30, 1.6, 0), (134, 56, 30, 1.6, 1), (22, 72, 26, 1.5, 0),
                               (140, 74, 24, 1.5, 1), (104, 68, 12, 1.0, 0), (84, 85, 40, 1.6, 1)):
        cv.checker(cv.m_ellipse(cx, cy, rx, ry), "mist1", ph)
        cv.fill(cv.m_ellipse(cx - 2, cy, rx * 0.55, 0.6), "mist1")
    # --- the player's raft, small in the foreground, heading for the islet -------
    cv.ellipse(44, 92, 12, 4, "raft2")
    cv.ellipse(44, 91, 11, 3, "raft1")
    cv.ellipse(44, 91, 9, 2, "raft0")
    cv.line([(34, 90), (38, 89), (50, 89), (54, 90)], "raft0")
    for x in (36, 40, 48, 52):
        cv.px(x, 93, "raft1")
    # The player seen from behind: field cap, chestnut hair, rust jacket, facing the lily.
    cv.stamp([".ccc.", "ccccc", "hhhhh", "hhhhh", "jjjJk", "jjjJk", "jjjJk", "jjjJk", "JjjJk", ".pp.p"], 42, 78,
             {"c": "pl0", "h": "pl2", "j": "pl1", "J": "pl3", "k": "pl2", "p": "pl2"})
    cv.px(41, 83, "pl2")
    cv.px(41, 84, "pl2")
    cv.px(47, 83, "pl2")
    cv.px(47, 84, "pl2")
    # The wake: a V of ripples spreading back toward the viewer.
    for i, (x, y) in enumerate(((31, 95), (28, 97), (25, 99), (57, 95), (60, 97), (63, 99))):
        cv.line([(x, y), (x + (2 if i < 3 else -2), y)], "lake2")
    # Quiet water below the text line.
    for y, x0, x1 in ((110, 18, 44), (118, 96, 128), (128, 30, 52), (136, 110, 146)):
        cv.line([(x0, y), (x1, y)], "lake3")
    return cv.image()


STILLS = {"rootstock_files": rootstock_files, "crimson_lily": crimson_lily}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stills7")
    return out
