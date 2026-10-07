"""The healed Lantern Tree: original pixel painting on cast5's still canvas.

The broad mangrove and returning fireflies occupy the upper two-thirds;
the distant harbour lights sit below its canopy, and the foreground stays
quiet beneath the dialogue box. All patterns and coordinates are fixed.
"""
from __future__ import annotations

import common6 as common
import numpy as np
from stills import Canvas


def lantern_tree_healed():
    cv = Canvas({
        "sky0": "#202840", "sky1": "#384058", "sky2": "#685870", "sky3": "#b08080", "sky4": "#d0a088",
        "sea0": "#384860", "sea1": "#485878", "sea2": "#687888", "sea3": "#202c48",
        "rock0": "#888080", "rock1": "#585868", "rock2": "#383848", "rock3": "#282838",
        "bark0": "#c0a080", "bark1": "#886858", "bark2": "#584840", "bark3": "#302c30",
        "leaf0": "#789870", "leaf1": "#486850", "leaf2": "#304840", "leaf3": "#203430",
        "light0": "#f8f0b8", "light1": "#d8d890", "light2": "#a8b878", "halo": "#788858",
        "town0": "#786878", "town1": "#484058", "town2": "#383448", "roof": "#302c40",
    }, "sky0")
    cv.bands([0, 17, 31, 44, 53], ["sky0", "sky1", "sky2", "sky3", "sky4"])
    for x, y in ((13, 10), (37, 6), (109, 11), (145, 19)):
        cv.px(x, y, "sea2")
    # Flat distant coast and the open harbour.
    cv.poly([(0, 59), (19, 56), (39, 60), (69, 57), (99, 61), (125, 59), (159, 61), (159, 75), (0, 75)], "town1")
    cv.rect(0, 65, 159, 143, "sea1")
    cv.checker(cv.m_rect(0, 65, 159, 66), "sea2")
    cv.rect(0, 89, 159, 143, "sea0")
    cv.checker(cv.m_rect(0, 88, 159, 90), "sea1")
    cv.rect(0, 116, 159, 143, "sea3")
    # Harbour roofs, windows and quays on the sheltered shore below the tree.
    for x, y, w, h in ((108, 67, 12, 13), (125, 70, 15, 12), (144, 65, 13, 18), (97, 75, 10, 10)):
        cv.rect(x, y, x + w, y + h, "town0")
        cv.rect(x + w - 3, y, x + w, y + h, "town1")
        cv.poly([(x - 2, y), (x + w // 2, y - 5), (x + w + 2, y), (x + w, y + 1), (x, y + 1)], "roof")
        for wx in range(x + 3, x + w - 2, 5):
            cv.rect(wx, y + 4, wx + 1, y + 6, "light1")
            cv.px(wx, y + 4, "light0")
    cv.line([(95, 85), (159, 85)], "town2", 3)
    for x in (103, 122, 141, 154):
        cv.line([(x, 79), (x, 87)], "roof")
        cv.px(x, 79, "light0")
        cv.px(x + 1, 80, "light1")
        for y, length in ((90, 2), (94, 3), (99, 2)):
            cv.line([(x - length // 2, y), (x + length // 2, y)], "light2" if y < 96 else "sea2")
    # A small moored boat, its mast silhouetted against the dusk band.
    cv.line([(136, 58), (136, 87)], "roof")
    cv.line([(130, 65), (141, 65)], "roof")
    cv.poly([(127, 87), (145, 87), (142, 90), (131, 90)], "town2")
    cv.px(138, 86, "light1")
    # Rocky headland, warm upper planes and blue-purple shadow facets.
    headland = cv.m_poly([(0, 79), (16, 80), (30, 77), (45, 80), (68, 78), (84, 82), (100, 94),
                         (93, 103), (79, 109), (56, 116), (36, 129), (0, 143)])
    cv.fill(headland, "rock1")
    cv.poly([(0, 79), (30, 77), (48, 81), (69, 78), (85, 83), (98, 94), (78, 93), (53, 90), (27, 92), (0, 89)], "rock0")
    cv.poly([(0, 94), (25, 95), (41, 102), (50, 106), (38, 118), (0, 130)], "rock2")
    cv.poly([(44, 95), (57, 91), (78, 96), (78, 107), (55, 114)], "rock2")
    cv.poly([(81, 94), (96, 96), (89, 103), (79, 106)], "rock3")
    for pts in ([(15, 82), (26, 83), (31, 86)], [(55, 84), (68, 85), (74, 89)], [(33, 96), (37, 99)]):
        cv.line(pts, "rock1")
    # Broad old trunk, leaning with the prevailing wind, splitting into boughs.
    trunk = cv.m_poly([(49, 87), (54, 75), (54, 62), (48, 52), (42, 47), (46, 43),
                      (59, 51), (63, 59), (67, 48), (83, 42), (85, 46), (71, 56), (66, 67), (65, 80), (72, 87)])
    cv.fill(trunk, "bark1")
    cv.fill(trunk & ~np.roll(trunk, 2, 1), "bark0")
    cv.fill(trunk & ~np.roll(trunk, -3, 1), "bark2")
    cv.edge(trunk, "bark3", "E")
    for pts in ([(55, 77), (58, 64), (54, 54)], [(63, 79), (63, 69), (66, 60)], [(61, 60), (59, 55)]):
        cv.line(pts, "bark2")
    # Mangrove prop roots arch out into the cracks of the point.
    for pts in ([(56, 71), (48, 78), (43, 87), (34, 91)], [(58, 76), (55, 84), (47, 93)],
                [(64, 71), (74, 78), (77, 88), (84, 94)], [(63, 79), (68, 85), (68, 94)]):
        cv.line(pts, "bark3", 3)
        cv.line(pts, "bark1", 2)
        cv.line(pts[:2], "bark0")
    # Crown lobes interlock instead of reading as one ellipse. Leaf clusters
    # are deliberate shapes, lit on their upper-left faces.
    crown = np.zeros((144, 160), bool)
    lobes = [(20, 44, 17, 12), (31, 30, 20, 15), (51, 23, 24, 14), (75, 25, 23, 15),
             (96, 34, 21, 15), (105, 45, 16, 11), (79, 45, 25, 15), (52, 44, 23, 16), (32, 47, 22, 13)]
    for x, y, rx, ry in lobes:
        crown |= cv.m_ellipse(x, y, rx, ry)
    cv.fill(crown, "leaf2")
    cv.edge(crown, "leaf3", "S")
    for x, y, rx, ry in lobes:
        patch = cv.m_ellipse(x - 3, y - 4, rx - 4, ry - 4) & crown
        cv.fill(patch, "leaf1")
        cv.fill(cv.m_ellipse(x - 5, y - 7, rx - 7, 3) & patch, "leaf0")
    for x, y in ((18, 40), (39, 26), (61, 19), (88, 29), (99, 40), (30, 46), (53, 41), (74, 42)):
        cv.line([(x, y), (x + 2, y - 1), (x + 4, y)], "leaf0")
        cv.line([(x + 2, y + 2), (x + 5, y + 3)], "leaf2")
    # A few woody tips emerge beneath the old canopy.
    cv.line([(25, 55), (40, 58), (49, 56)], "bark2", 2)
    cv.line([(80, 56), (90, 60), (99, 57)], "bark2", 2)
    # The fireflies have returned: golden cores, soft green checker halos.
    for i, (x, y) in enumerate(((18, 35), (31, 21), (49, 17), (68, 21), (84, 23), (103, 35),
                                (113, 45), (92, 48), (74, 40), (53, 31), (35, 40), (19, 51),
                                (43, 51), (60, 49), (81, 54), (58, 60), (96, 60), (119, 59))):
        cv.glow(x, y, [(3, "halo", "dith")], only=cv.m_of("leaf1", "leaf2", "leaf3", "sky2", "sky3"))
        cv.px(x, y, "light0")
        cv.px(x + 1, y, "light1")
        if i % 3 == 0:
            cv.px(x, y - 1, "light2")
            cv.px(x, y + 1, "light2")
    # Quiet foreground; no bright details competing with the text window.
    cv.fill(headland & (cv.yy >= 116), "rock3")
    return cv.image()


def build(write=True):
    out = {"lantern_tree_healed": lantern_tree_healed()}
    if write:
        common.write_set("stills", out, "stills6")
    return out
