"""Chapter 4 story stills -> public/art/sets/stills/<key>.png (160x144).

Same rules as tools/art/stills.py (and its Canvas): each still is painted
from primitives with its own small named palette, light from the top-left,
dithering only as a deliberate 2-colour checker, and the bottom 48px (under
the text box) kept calm, with every focal point in the upper two-thirds.

  glasshouse_dome  arrival: from the orchard road, the whole of GLASSHOUSE
                   CITY under one vast wrought-iron glass dome. Rooftops,
                   palms, the Rose Conservatory and the Root Relay's mast show
                   through the aqua glass; the sun strikes a glint across the
                   upper-left panes; the player, small, on the road.
  relay_pulse      the Root Relay's listening room in the dark: the seed glows
                   gold in its cradle on the desk, and every screen spikes at
                   once. The big trace climbs off the top of its screen, the
                   sonar plot shows one enormous return far below the valley
                   floor, and a pale ring of light washes out across the wall.
                   Two figures, rim-lit, lean in.

Deterministic: every random draw comes from a fixed-seed generator.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import gbc  # noqa: E402
import stills as st  # noqa: E402
from stills import H, W, Canvas, rng  # noqa: E402


# =============================================================================
# glasshouse_dome
# =============================================================================
def glasshouse_dome() -> Image.Image:
    cv = Canvas({
        # midday sky and clouds
        "k0": "#5890e0", "k1": "#78b0f0", "k2": "#a8d0f8", "k3": "#d0e8f8",
        "cl0": "#f8f8f8", "cl1": "#d8e8f0", "cl2": "#b0c8e0",
        # far hills
        "h0": "#88b8a8", "h1": "#689888",
        # glass, lit side to shaded side
        "gl0": "#e0f8f0", "gl1": "#b8e8e0", "gl2": "#90d0c8", "gl3": "#68b0b0", "gl4": "#488c90",
        # the city seen through the glass (aqua-tinted)
        "ct0": "#d8f0e0", "ct1": "#a8d0c0", "ct2": "#80a8a0", "ct3": "#587c7c", "ct4": "#3c5c60",
        "cr0": "#f0b0b8", "cr1": "#c87888",          # rose conservatory glass through the dome
        "cb0": "#c89878", "cb1": "#987060",          # brick townhouse roofs
        "cp0": "#88c878", "cp1": "#509060",          # palms
        "lt": "#f8f0a8",                             # the mast beacon
        # wrought iron (painted dark green), lit edge
        "ir0": "#58887c", "ir1": "#2c5048", "ir2": "#183028",
        "gold": "#f8d050", "gold2": "#b08820",
        # stone base wall + gate
        "s0": "#f0e8d8", "s1": "#c8c0b0", "s2": "#908878", "s3": "#585048",
        # orchard and road
        "g0": "#d8f0a0", "g1": "#98d060", "g2": "#58a040", "g3": "#285828",
        "p0": "#f0e0b0", "p1": "#d8c090", "p2": "#b09868",
        "ap": "#e04838", "ap2": "#a02828",
        "tr0": "#8a5030", "tr1": "#4a2818",
        # the player
        "pc": "#58a040", "pc2": "#286828", "pj": "#d87038", "pj2": "#a04820", "ph": "#906830",
        "pv": "#b8e8e0", "pb": "#3850a0", "pb2": "#283878", "k": "#181818", "white": "#f8f8f0",
    }, "k0")
    R = rng(41)
    CX, BASE, RX, RY = 80, 84, 86, 74            # the dome: wider than the frame, apex near the top

    # --- sky ----------------------------------------------------------------
    cv.bands([0, 12, 26, 42, 58], ["k0", "k1", "k2", "k3", "k3"])

    def cloud(x, y, w, h):
        m = cv.m_ellipse(x, y, w, h) | cv.m_ellipse(x - w * 0.55, y + h * 0.35, w * 0.6, h * 0.7) | \
            cv.m_ellipse(x + w * 0.6, y + h * 0.3, w * 0.55, h * 0.65)
        m &= cv.yy <= y + h * 0.9
        cv.fill(m, "cl1")
        cv.fill(m & cv.m_ellipse(x - w * 0.2, y - h * 0.3, w * 0.8, h * 0.8), "cl0")
        cv.fill(m & (cv.yy >= y + h * 0.9 - 1), "cl2")
    cloud(14, 10, 10, 4)
    cloud(146, 14, 12, 5)
    cloud(118, 4, 6, 2)

    hills = np.array([62 - 4 * math.sin(x * 0.05 + 0.6) - 2 * math.sin(x * 0.17) for x in range(W)])
    cv.fill(cv.yy >= np.round(hills[cv.xx]), "h0")
    h2 = np.array([70 - 2 * math.sin(x * 0.09 + 2.0) for x in range(W)])
    cv.fill(cv.yy >= np.round(h2[cv.xx]), "h1")

    # --- the dome --------------------------------------------------------------
    dome = cv.m_ellipse(CX, BASE, RX, RY) & (cv.yy <= BASE)
    nx = (cv.xx - CX) / RX
    ny = (BASE - cv.yy) / RY
    shade = nx * 0.9 - ny * 0.5
    cv.fill(dome, "gl2")
    cv.fill(dome & (shade < -0.3), "gl1")
    cv.checker(dome & (shade >= -0.4) & (shade < -0.3), "gl2")
    cv.fill(dome & (shade < -0.75), "gl0")
    cv.checker(dome & (shade >= -0.82) & (shade < -0.75), "gl1")
    cv.fill(dome & (shade > 0.3), "gl3")
    cv.checker(dome & (shade > 0.2) & (shade <= 0.3), "gl3")
    cv.fill(dome & (shade > 0.7), "gl4")

    # --- the city through the glass: far rooftops, then landmarks, then near
    city = dome & (cv.yy > 30)

    def block(x0, w, h, body="ct1", side="ct2", roof="ct0", win="ct3", gable=False, roofc=None):
        top = BASE - h
        m = cv.m_rect(x0, top, x0 + w - 1, BASE) & city
        cv.fill(m, body)
        cv.fill(m & (cv.xx >= x0 + w - 2), side)
        if gable:
            g = cv.m_poly([(x0 - 1, top), (x0 + w / 2 - 0.5, top - w * 0.45), (x0 + w, top)]) & city
            cv.fill(g, roofc or "cb1")
            cv.fill(g & (cv.xx < x0 + w / 2), roofc and roofc.replace("1", "0") or "cb0")
        else:
            cv.fill(m & (cv.yy == top), roof)
        for wy in range(top + 3, BASE - 3, 4):
            for wx in range(x0 + 1, x0 + w - 2, 3):
                if city[wy, wx]:
                    cv.px(wx, wy, win)
    # far row: pale and hazy
    x = -2
    while x < W:
        w = int(R.integers(6, 11))
        block(x, w, int(R.integers(22, 32)), "ct1", "ct1", "ct0", "ct2")
        x += w + int(R.integers(0, 2))
    # landmarks
    # the Root Relay mast, right of centre, rising most of the way to the apex
    mx = 116
    block(104, 22, 30, "ct2", "ct3", "ct1", "ct3")
    for y in range(18, BASE - 29):
        half = 0.8 + 5.0 * (y - 18) / (BASE - 47)
        cv.px(mx - half, y, "ct4")
        cv.px(mx + half, y, "ct4")
        if y % 5 == 0:
            cv.line([(mx - half, y), (mx + half + 1, y + 4)], "ct4")
            cv.line([(mx + half, y), (mx - half - 1, y + 4)], "ct3")
    for dy, dx in ((28, -1), (38, 1)):                      # listening dishes
        sx_ = mx + dx * 7
        cv.line([(sx_, dy - 3), (sx_ + dx * 2, dy), (sx_, dy + 3)], "ct4")
        cv.line([(mx + dx * 2, dy), (sx_, dy)], "ct4")
    cv.rect(mx, 13, mx, 17, "ct4")
    cv.glow(mx, 13, [(3, "lt", "dith"), (1, "lt", "solid")], 1.0)
    cv.px(mx, 13, "white")
    # the Palm House: a smaller glass dome inside the great one
    ph = cv.m_ellipse(140, BASE - 14, 15, 14) & (cv.yy <= BASE - 14) & city
    cv.fill(cv.m_rect(125, BASE - 14, 155, BASE) & city, "ct2")
    cv.fill(ph, "ct0")
    cv.fill(ph & (cv.xx > 144), "ct1")
    for k in (-10, -5, 0, 5, 10):
        cv.line([(140 + k, BASE - 14), (140 + k * 0.5, BASE - 26)], "ct3")
    cv.line([(126, BASE - 19), (154, BASE - 19)], "ct3")
    # the Rose Conservatory: a pink glass barrel vault, left of centre
    cv.fill(cv.m_rect(30, BASE - 22, 64, BASE) & city, "ct1")
    rc = cv.m_ellipse(47, BASE - 22, 18, 12) & (cv.yy <= BASE - 22) & city
    cv.fill(rc, "cr0")
    cv.fill(rc & (cv.xx > 54), "cr1")
    for k in range(-15, 16, 5):
        cv.line([(47 + k, BASE - 22), (47 + k * 0.6, BASE - 32)], "cr1")
    cv.px(47, BASE - 35, "cr1")
    cv.px(47, BASE - 36, "gold")
    # the near row: brick townhouses with gables
    for (x0, w, h) in [(-1, 9, 16), (8, 8, 13), (66, 9, 14), (75, 7, 12), (88, 9, 15), (149, 10, 9)]:
        block(x0, w, h, "ct1", "ct2", "ct0", "ct3", gable=True)
    # palms: crowns over the roofs
    for (px_, top) in [(22, BASE - 30), (84, BASE - 34), (98, BASE - 24), (138, BASE - 22), (60, BASE - 18)]:
        cv.line([(px_, BASE - 8), (px_ + 1, top)], "ct3")
        for ang in (-2.8, -2.3, -1.6, -0.9, -0.35):
            L = 8
            ex, ey = px_ + 1 + math.cos(ang) * L, top + math.sin(ang) * L * 0.55 + 3
            cv.line([(px_ + 1, top), (ex, ey)], "cp1")
            cv.px(ex, ey + 1, "cp1")
        cv.px(px_, top - 1, "cp0")
        cv.px(px_ - 2, top, "cp0")
        cv.px(px_ + 3, top - 1, "cp0")
    # haze on the shaded side
    cv.checker(city & (shade > 0.35) & (cv.yy < BASE - 30) & cv.m_of("ct1", "ct0", "ct2"), "gl3")

    # --- glints: the sun on the panes, upper left -------------------------------
    for k, (x0, y0, L) in enumerate([(14, 40, 16), (22, 31, 12), (34, 22, 9), (12, 52, 7)]):
        for i in range(L):
            cv.px(x0 + i, y0 - i * 0.6, "gl0")
            if k <= 1:
                cv.px(x0 + i, y0 - i * 0.6 + 1, "gl0")
    cv.glow(28, 30, [(6, "gl0", "dith"), (2, "white", "solid")], 1.0, only=dome)

    # --- iron: meridian ribs and rings -----------------------------------------
    ribs = np.zeros((H, W), bool)
    for k in np.linspace(-0.95, 0.95, 15):
        pts = []
        for y in range(BASE - RY, BASE + 1):
            t = (BASE - y) / RY
            pts.append((CX + k * RX * math.sqrt(max(0.0, 1 - t * t)), y))
        ribs |= cv.m_line(pts, 1)
    for t in (0.2, 0.42, 0.62, 0.78, 0.9):
        y0 = BASE - RY * t
        half = RX * math.sqrt(1 - t * t)
        pts = [(CX + half * u, y0 + 4 * (1 - u * u) * (1 - t)) for u in np.linspace(-1, 1, 80)]
        ribs |= cv.m_line(pts, 1)
    ribs &= dome
    cv.fill(ribs, "ir1")
    cv.fill(ribs & (shade < -0.2) & ~np.roll(ribs, 1, 1), "ir0")
    rim = (dome & ~np.roll(dome, -1, 0)) | (dome & ~np.roll(dome, 1, 1) & (cv.xx > 0)) | \
          (dome & ~np.roll(dome, -1, 1) & (cv.xx < W - 1))
    cv.fill(rim & (cv.yy < BASE), "ir2")
    cv.fill(rim & (cv.xx < CX) & (cv.yy < BASE - 10), "ir1")
    # lantern + finial at the apex, a gilded weather vane
    ax, ay = CX, BASE - RY
    cv.rect(ax - 4, ay - 4, ax + 4, ay, "ir1")
    cv.rect(ax - 3, ay - 3, ax + 3, ay - 1, "gl1")
    for xx in (ax - 1, ax + 1):
        cv.rect(xx, ay - 3, xx, ay - 1, "ir1")
    cv.fill(cv.m_ellipse(ax, ay - 5, 5, 2) & (cv.yy <= ay - 4), "ir1")
    cv.px(ax - 2, ay - 6, "ir0")
    cv.rect(ax, ay - 10, ax, ay - 6, "ir2")
    cv.line([(ax - 3, ay - 9), (ax + 2, ay - 9)], "gold")
    cv.px(ax, ay - 10, "gold")
    cv.px(ax - 3, ay - 10, "gold2")

    # --- the base wall and the great gate --------------------------------------
    cv.rect(0, BASE - 1, W - 1, BASE + 5, "s1")
    cv.rect(0, BASE - 1, W - 1, BASE - 1, "s0")
    cv.rect(0, BASE + 5, W - 1, BASE + 5, "s2")
    for x in range(4, W, 12):
        cv.rect(x, BASE, x, BASE + 4, "s2")
    gate = cv.m_ellipse(CX, BASE - 6, 11, 13) | cv.m_rect(CX - 11, BASE - 6, CX + 11, BASE + 5)
    gate &= cv.yy <= BASE + 5
    cv.outline(gate, "s3")
    cv.fill(gate, "s1")
    cv.fill(gate & ~np.roll(gate, 1, 1), "s0")
    cv.fill(gate & ~np.roll(gate, -1, 1), "s2")
    inner = cv.m_ellipse(CX, BASE - 5, 8, 10) | cv.m_rect(CX - 8, BASE - 5, CX + 8, BASE + 5)
    inner &= cv.yy <= BASE + 5
    cv.fill(inner, "ct1")
    cv.fill(inner & (cv.yy > BASE - 1), "g2")
    cv.fill(inner & (cv.yy <= BASE - 1) & (cv.xx > CX + 3), "ct2")
    # open iron gates folded back against the jambs
    for gx in (CX - 8, CX + 7):
        cv.rect(gx, BASE - 9, gx + 1, BASE + 5, "ir1")
        cv.px(gx, BASE - 10, "ir0")
    cv.rect(CX - 1, BASE - 19, CX + 1, BASE - 18, "gold")      # keystone crest
    cv.px(CX, BASE - 20, "gold2")

    # --- foreground: orchard grass and the road --------------------------------
    gtop = BASE + 6
    cv.rect(0, gtop, W - 1, H - 1, "g1")
    cv.rect(0, gtop, W - 1, gtop, "g2")
    road = cv.m_poly([(CX - 8, gtop), (CX + 8, gtop), (CX + 46, H), (CX - 46, H)])
    cv.fill(road, "p1")
    cv.edge(road, "p2", "E")
    cv.edge(road, "g2", "W")
    for _ in range(46):
        x, y = int(R.integers(0, W)), int(R.integers(gtop + 3, H))
        if not road[y, x] and not road[y - 1, min(W - 1, x + 1)]:
            cv.px(x, y, "g2")
            cv.px(x + 1, y - 1, "g2")

    def apple_tree(x, y, r):
        cv.rect(x - 1, y + r * 0.5, x + 1, gtop + 3, "tr0")
        cv.rect(x + 1, y + r * 0.5, x + 1, gtop + 3, "tr1")
        crown = cv.m_ellipse(x, y, r, r * 0.8) | cv.m_ellipse(x - r * 0.65, y + r * 0.3, r * 0.55, r * 0.5) | \
            cv.m_ellipse(x + r * 0.65, y + r * 0.25, r * 0.55, r * 0.5)
        cv.fill(crown, "g2")
        cv.fill(crown & cv.m_ellipse(x - r * 0.3, y - r * 0.3, r * 0.75, r * 0.55), "g1")
        cv.fill(crown & cv.m_ellipse(x - r * 0.45, y - r * 0.45, r * 0.35, r * 0.25), "g0")
        cv.fill(crown & ~cv.m_ellipse(x - 2, y - 2, r + 0.5, r * 0.8 + 0.5), "g3")
        cv.outline(crown, "g3", sides="SE")
        rr = rng(int(x * 7 + y))
        for _ in range(int(r * 1.3)):
            ang, d = rr.random() * math.tau, rr.random() * r * 0.85
            ax_, ay_ = x + math.cos(ang) * d, y + math.sin(ang) * d * 0.7
            xi, yi = int(round(ax_)), int(round(ay_))
            if 0 <= xi < W - 1 and crown[yi, xi] and crown[yi + 1, xi + 1]:
                cv.px(xi, yi, "ap")
                cv.px(xi + 1, yi + 1, "ap2")
    apple_tree(4, 72, 14)
    apple_tree(157, 76, 12)

    # --- the player, from behind, at the head of the road ------------------
    px_, py_ = 64, 79
    cv.stamp([
        "...cccc...",
        "..ccccccc.",
        ".ccccccccc",
        ".CCCCCCCC.",
        "..hhhhhh..",
        "..hhhhhh..",
        ".jjjjjjJj.",
        "jjvjjjjJJj",
        "jjjvjjjJJj",
        "jjjjvjjJJj",
        "jjjjjvJJJj",
        ".jjjjjJJj.",
        "..bbbBB...",
        "..bb.BB...",
        "..bb.BB...",
        "..bb.BB...",
    ], px_, py_, {"c": "pc", "C": "pc2", "h": "ph", "j": "pj", "J": "pj2", "v": "pv", "b": "pb", "B": "pb2"})
    m = cv.m_of("pc", "pc2", "ph", "pj", "pj2", "pv", "pb", "pb2") & cv.m_rect(px_ - 1, py_ - 1, px_ + 11, py_ + 16)
    cv.outline(m, "k")
    cv.fill(cv.m_rect(px_ + 3, py_ + 17, px_ + 10, py_ + 17), "p2")      # shadow falls down-right
    return cv.image()


# =============================================================================
# relay_pulse
# =============================================================================
def relay_pulse() -> Image.Image:
    cv = Canvas({
        # the dark room
        "d0": "#080c18", "d1": "#101828", "d2": "#18243a", "d3": "#24344c",
        "w1": "#203a48", "w2": "#2c5060",                  # wall where the screen light falls
        # screens: phosphor teal, the spike white-hot, the deep return red
        "sc0": "#081c20", "sc1": "#10343a", "sc2": "#287060", "tr0": "#58d0a0", "tr1": "#a8f8d0",
        "hot": "#f8f8e8", "red": "#e04858", "red2": "#882838",
        "bz0": "#485868", "bz1": "#303c4c", "bz2": "#1c2434",
        # the desk, brass cradle, the seed
        "dk0": "#3a3040", "dk1": "#282030", "dk2": "#181420",
        "br0": "#f8d880", "br1": "#c09040", "br2": "#705020",
        "sd0": "#f8f8c8", "sd1": "#f8e070", "sd2": "#e0a838", "sd3": "#a06828",
        "gw1": "#584830", "gw2": "#806838",
        # figures
        "fig": "#06080e", "rim": "#78e0b8", "rimg": "#f0c868",
        "cab": "#0c1220",
    }, "d1")
    R = rng(77)

    # --- room: back wall, a ring of light washing out from the desk ----------
    cv.bands([0, 20, 70], ["d0", "d1", "d1"])
    SX, SY = 80, 71                                      # the seed
    for r, c, kind in [(78, "d2", "dith"), (66, "d2", "solid"), (54, "w1", "dith"), (44, "w1", "solid")]:
        m = cv.m_ellipse(SX, SY, r, r * 0.72) & (cv.yy < 74)
        (cv.fill if kind == "solid" else cv.checker)(m, c)
    # the pulse ring itself: a thin bright band, broken, travelling outward
    ring = cv.m_ellipse(SX, SY, 70, 50) & ~cv.m_ellipse(SX, SY, 68, 48.5) & (cv.yy < 74)
    cv.checker(ring, "w2")
    ring2 = cv.m_ellipse(SX, SY, 36, 26) & ~cv.m_ellipse(SX, SY, 34, 24.5) & (cv.yy < 74)
    cv.fill(ring2, "w2")

    # --- the screens -----------------------------------------------------------
    def screen(x0, y0, x1, y1):
        cv.rect(x0 - 2, y0 - 2, x1 + 2, y1 + 3, "bz1")
        cv.rect(x0 - 2, y0 - 2, x1 + 2, y0 - 2, "bz0")
        cv.rect(x0 - 2, y0 - 2, x0 - 2, y1 + 3, "bz0")
        cv.rect(x1 + 2, y0 - 2, x1 + 2, y1 + 3, "bz2")
        cv.rect(x0 - 2, y1 + 3, x1 + 2, y1 + 3, "bz2")
        cv.rect(x0, y0, x1, y1, "sc0")
        for y in range(y0, y1 + 1, 2):                  # scanlines
            cv.rect(x0, y, x1, y, "sc1")
        cv.px(x1 - 1, y1 + 2, "tr0")                     # power LED
        return cv.m_rect(x0, y0, x1, y1)

    # main screen: the trace, flat... then one colossal spike off the top
    main = screen(54, 10, 106, 46)
    for x in range(55, 106, 6):
        cv.rect(x, 11, x, 45, "sc1")
    base_y = 38
    pts = []
    for x in range(55, 106):
        d = x - 84
        y = base_y + 1.2 * math.sin(x * 0.9) * (1 if abs(d) > 8 else 0)
        if abs(d) <= 8:
            y = base_y - (31 * math.exp(-(d / 2.4) ** 2)) + (3 * math.exp(-((d + 5) / 1.5) ** 2))
        pts.append((x, y))
    cv.line(pts, "tr0")
    cv.line([(p[0], p[1] - 1) for p in pts if abs(p[0] - 84) <= 3], "tr1")
    cv.rect(83, 10, 85, 13, "hot")                       # clipping at the top of the glass
    cv.px(84, 9, "hot")
    cv.px(84, 8, "tr1")
    cv.checker(cv.m_rect(78, 10, 90, 16) & main, "tr0")
    # a readout bar pinned at max, red
    cv.rect(57, 13, 70, 14, "sc2")
    cv.rect(57, 13, 70, 13, "red")
    cv.rect(98, 13, 104, 14, "red")

    # left screen: the root map, every branch lit back to one node far below
    left = screen(14, 18, 44, 44)
    trunk = [(29, 20), (28, 26), (30, 31), (29, 36), (31, 42)]
    cv.line(trunk, "tr0")
    for (a, b) in [((28, 26), (19, 30)), ((30, 31), (40, 28)), ((29, 36), (18, 40)), ((19, 30), (16, 37)),
                   ((40, 28), (43, 36)), ((31, 42), (38, 43)), ((31, 42), (22, 44)), ((28, 23), (36, 21))]:
        cv.line([a, b], "sc2")
    cv.line([(29, 36), (31, 42)], "tr1")
    cv.glow(31, 42, [(3, "tr0", "dith"), (1, "hot", "solid")], 1.0, only=left)

    # right screen: the sonar plot: rings, one enormous return deep down
    right = screen(116, 18, 146, 44)
    for r in (6, 11, 16):
        rr = cv.m_ellipse(131, 22, r * 1.1, r) & ~cv.m_ellipse(131, 22, r * 1.1 - 1, r - 1) & (cv.yy >= 22)
        cv.fill(rr & right, "sc2")
    cv.line([(117, 22), (145, 22)], "sc2")              # the valley floor
    blob = cv.m_ellipse(131, 39, 9, 4) & right
    cv.fill(blob, "red2")
    cv.checker(cv.m_ellipse(131, 39, 12, 6) & right & ~blob, "red2")
    cv.fill(cv.m_ellipse(131, 39, 5, 2) & right, "red")
    cv.line([(131, 22), (131, 34)], "tr0")              # the ping, straight down
    cv.px(131, 22, "hot")

    # cables drooping from the screens behind the desk
    for (a, b, sag) in [((30, 47), (60, 52), 6), ((80, 50), (110, 56), 5), ((131, 48), (104, 56), 7)]:
        pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * math.sin(t * math.pi))
               for t in np.linspace(0, 1, 20)]
        cv.line(pts, "cab")

    # --- the desk and the seed --------------------------------------------------
    DT = 72
    cv.rect(0, DT, W - 1, H - 1, "dk1")
    cv.rect(0, DT, W - 1, DT + 1, "dk0")
    cv.rect(0, DT + 2, W - 1, DT + 2, "dk2")
    cv.rect(0, DT + 9, W - 1, DT + 9, "dk2")
    cv.rect(0, DT + 10, W - 1, H - 1, "d0")
    for x in (12, 148):
        cv.rect(x, DT + 10, x + 3, H - 1, "dk2")
    # warm pool of light on the desk around the seed
    cv.checker(cv.m_ellipse(SX, DT + 1, 30, 3) & cv.m_rect(0, DT, W - 1, DT + 2), "gw1")
    cv.fill(cv.m_ellipse(SX, DT + 1, 16, 2) & cv.m_rect(0, DT, W - 1, DT + 2), "gw2")
    # brass cradle: three claws on a round foot
    cv.fill(cv.m_ellipse(SX, DT, 8, 2) & (cv.yy <= DT + 1), "br1")
    cv.fill(cv.m_ellipse(SX, DT - 1, 7, 1.5) & (cv.yy <= DT), "br0")
    for (x0, x1) in [(SX - 7, SX - 5), (SX + 7, SX + 5)]:
        cv.line([(x0, DT - 1), (x1, DT - 6)], "br1")
    cv.line([(SX, DT - 1), (SX, DT - 3)], "br2")
    # the seed, glowing
    cv.glow(SX, DT - 9, [(16, "gw1", "dith"), (11, "gw2", "dith"), (7, "sd2", "dith")], 1.0,
            only=cv.yy < DT)
    seed = cv.m_ellipse(SX, DT - 8, 5, 6)
    cv.fill(seed, "sd2")
    cv.fill(seed & ~np.roll(np.roll(seed, 2, 0), 2, 1), "sd1")
    cv.fill(seed & ~np.roll(np.roll(seed, -2, 0), -2, 1), "sd3")
    cv.fill(cv.m_ellipse(SX - 2, DT - 11, 1.5, 1.5), "sd0")
    cv.line([(SX + 1, DT - 13), (SX + 1, DT - 3)], "sd1")
    for (dx, dy) in [(-9, -18), (8, -16), (-12, -6), (12, -9), (0, -20)]:
        cv.px(SX + dx, DT + dy, "sd0")
        cv.px(SX + dx, DT + dy + 1, "sd2")

    # --- the figures, leaning in from either side, rim-lit ---------------------
    def rimlit(fig, cx_face, toward_right):
        """Rim light only on the edges that face the screens and the seed."""
        cv.fill(fig, "fig")
        side = np.zeros((H, W), bool)
        if toward_right:
            side[:, :-1] = fig[:, :-1] & ~fig[:, 1:]
        else:
            side[:, 1:] = fig[:, 1:] & ~fig[:, :-1]
        top = fig & ~np.roll(fig, 1, 0) & ((cv.xx > cx_face) if toward_right else (cv.xx < cx_face))
        cv.fill((side | top) & (cv.yy < 72), "rim")
        cv.fill(side & (cv.yy >= 63) & (cv.yy < 74), "rimg")       # warm from the seed, low down

    # WREN on the left: cropped hair swept forward, headset, leaning on the desk
    wren = cv.m_ellipse(16, 54, 6, 7)
    wren |= cv.m_poly([(9, 50), (14, 46), (21, 47), (25, 51), (22, 52), (18, 50)])      # swept fringe
    wren |= cv.m_rect(13, 59, 18, 64)                                                  # neck
    wren |= cv.m_poly([(0, 68), (6, 64), (22, 63), (28, 67), (31, 96), (0, 96)])       # shoulders
    wren |= cv.m_line([(24, 67), (37, 71)], 4)                                         # arm on the desk
    wren |= cv.m_rect(35, 70, 41, 72)
    rimlit(wren, 14, True)
    cv.line([(12, 57), (14, 61), (19, 62)], "bz1")                                     # mic boom
    cv.px(20, 62, "tr1")
    cv.px(12, 56, "bz0")
    # the director on the right: upright, coat collar, hands behind the back
    dire = cv.m_ellipse(146, 46, 6, 7)
    dire |= cv.m_poly([(139, 43), (144, 38), (152, 39), (153, 45), (148, 42), (141, 44)])   # hair
    dire |= cv.m_rect(143, 51, 149, 57)
    dire |= cv.m_poly([(128, 62), (136, 57), (156, 57), (160, 60), (160, 96), (126, 96)])
    dire |= cv.m_poly([(136, 57), (141, 56), (143, 63)])                                # collar point
    rimlit(dire, 148, False)
    cv.px(140, 47, "tr1")                                                               # glasses glint
    cv.px(141, 47, "rim")
    return cv.image()


STILLS4 = {"glasshouse_dome": glasshouse_dome, "relay_pulse": relay_pulse}


def images():
    out = {}
    for k, fn in STILLS4.items():
        im = fn()
        assert im.size == (W, H), k
        out[k] = im
    return out


def build(write=True):
    out = images()
    if write:
        common.write_set_images("stills", out, "stills4.py")
    cells = []
    for k, im in out.items():
        cells.append((k, im))
        cells.append((k + " +box", st.with_textbox(im)))
    gbc.grid_sheet(cells, 2, 3).save(common.REVIEW / "stills_ch4.png")
    for k, im in out.items():
        worst, share = st.tile_report(im)
        print(f"{k}: {len(gbc.colours(im))} colours, worst 8x8 {worst}, {share:.0%} tiles <=4")
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
