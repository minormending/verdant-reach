"""Chapter 11 story still, an original pixel painting on the stills.Canvas.

  fellowship  The ending. The Herbarium's glass reading room at golden hour:
              a vaulted conservatory of warm iron ribs and glazing, the low
              sun burning through the glass at the left and laying long
              window-shaped patches of gold across the floorboards. Tall
              shelves on both sides hold the living collection: framed
              pressed specimens, books and jars, and potted Quickened
              leaning toward the light. ROWAN VALE (moss-green hooded cloak,
              aspen crook staff with its brass bell) and DR. VALE (wild red
              hair, round glasses, white lab coat over a green blouse, her
              satchel) stand together in the middle of the room, her hand on
              his arm. In the foreground the player, seen from behind in the
              green field cap and rust jacket with the vasculum strap across
              the back, holds up the Field Herbarium (its green cover, cream
              label and leaf). Warm and hopeful: a new world.

Composition follows stills.py: the bottom 48px sit under the text box, so
they stay calm (the floor in shadow and the player's back), and every face,
the staff, the book and the sun live above y = 96. Light comes from the sun
at the upper left, so every figure and shelf is lit on its left side and
shadows fall to the right. No plant has a face. Every coordinate is fixed;
the output is deterministic.
"""
from __future__ import annotations

import numpy as np

import common11 as common
from stills import Canvas

PAL = {
    # the golden sky through the glass, warmest at the sun
    "sk4": "#c88878", "sk3": "#e0a07c", "sk2": "#f0c088", "sk1": "#f8dca0", "sk0": "#f8f0c8", "sun": "#f8f8e8",
    # the far garden through the glass, hazy in the low light
    "tg0": "#d0a078", "tg1": "#b08068", "tg2": "#8c6460",
    # iron ribs and glazing bars, warm with the light
    "fr0": "#b07c50", "fr1": "#7c5038", "fr2": "#4c3028",
    # the room in shadow
    "in0": "#8c6048", "in1": "#684434", "in2": "#4a2e2c", "in3": "#2e1c20",
    # floorboards and the sunlit patches
    "fl0": "#f0c080", "fl1": "#c88c58", "fl2": "#a06840", "fl3": "#784c34", "fl4": "#583428",
    # shelves
    "wd0": "#e8b070", "wd1": "#b87c48", "wd2": "#865434", "wd3": "#5a3424",
    # specimen sheets, books, jars
    "pp0": "#f8f0d8", "pp1": "#d8c8a0", "bk0": "#8c3848", "bk1": "#3c5c8c", "bk2": "#5c7c38", "bk3": "#c07838",
    "jr0": "#c8e8d8", "jr1": "#80b0a0",
    # plants and pots
    "pl0": "#b8e070", "pl1": "#70b040", "pl2": "#3c7830", "pl3": "#1c4424",
    "tc0": "#f0a070", "tc1": "#c86840", "tc2": "#8c4028",
    "pk0": "#f8a0b8", "pk1": "#d06080",
    # figures: ink, skin
    "ink": "#2a1a1c", "s0": "#f8d8b0", "s1": "#e0a878", "s2": "#a87048",
    # Rowan: the moss cloak, earth tunic, auburn-grey hair and beard, aspen staff, brass bell
    "mo0": "#a8c870", "mo1": "#6c8c48", "mo2": "#44603a", "mo3": "#2e4428",
    "ea0": "#8a6040", "ea1": "#5c3c28", "au0": "#c06840", "au1": "#783020", "gy": "#d8d0c0",
    "as0": "#f8f8e8", "as1": "#e0d8c0", "as2": "#a8a088", "be0": "#f8e070", "be1": "#c09030",
    # Vale: wild red hair, white coat, green blouse and trousers, satchel
    "h0": "#f89868", "h1": "#d85840", "h2": "#9c3030",
    "ct0": "#f8f8f0", "ct1": "#e0d4c8", "ct2": "#a8949c",
    "gr0": "#68b048", "gr1": "#3c7c38", "gr2": "#245428", "sa0": "#d8a060", "sa1": "#a06830",
    # the player: field cap, chestnut hair, rust jacket, strap; the Field Herbarium
    "cp0": "#a0d868", "cp1": "#58a040", "cp2": "#286828",
    "hr0": "#b08040", "hr1": "#906830", "hr2": "#583818",
    "jk0": "#f8a850", "jk1": "#e07830", "jk2": "#a84420", "jk3": "#6c2818",
    "st0": "#7c5030", "st1": "#4a2c1c",
    "fb0": "#68b850", "fb1": "#3c8838", "fb2": "#205c28", "lab": "#f8f0d0", "gold": "#f0c848",
}

SUN = (58, 44)


# =============================================================================
# The room
# =============================================================================
def sky(cv):
    cv.bands([0, 14, 30, 46, 60], ["sk4", "sk3", "sk2", "sk1", "sk0"])
    cv.glow(SUN[0], SUN[1], [(40, "sk1", "dith"), (32, "sk0", "dith"), (24, "sk0", "solid"), (13, "sun", "dith"),
                             (8, "sun", "solid")], ry_scale=0.8)
    # The far garden: a soft treeline and a clipped hedge, hazy in the glare.
    tops = np.array([72 - 3 * ((x // 5) % 2) - 3 * ((x // 11) % 2) - 2 * ((x // 23) % 2) for x in range(160)])
    trees = cv.yy >= tops[cv.xx]
    cv.fill(trees, "tg1")
    cv.checker(trees & cv.m_ellipse(SUN[0], 74, 30, 10), "tg0")
    cv.rect(0, 80, 159, 86, "tg2")


def glazing(cv):
    """The iron frame: four columns rising into the ribs of the vault, two
    transoms, glazing bars between, and the low wall under the glass."""
    cols = [8, 40, 80, 120, 152]
    for x in cols:
        cv.rect(x - 1, 22, x + 1, 86, "fr1")
        cv.rect(x - 1, 22, x - 1, 86, "fr0")
        cv.rect(x + 1, 22, x + 1, 86, "fr2")
    # The glass roof overhead: ribs running up from each column toward a
    # crown far above, thin glazing bars between them.
    def top(x):
        return 80 + (x - 80) * 0.45
    for a, b in zip(cols, cols[1:]):
        for k in (1, 2, 3):
            x = a + (b - a) * k / 4
            cv.line([(x, 21), (top(x), 0)], "fr2")
    for x in cols:
        cv.line([(x, 22), (top(x), 0)], "fr1", 2)
        cv.line([(x - 1, 22), (top(x) - 1, 0)], "fr0")
    # Purlins across the vault and the transoms across the wall.
    for y in (4, 12):
        cv.rect(0, y, 159, y, "fr1")
    cv.rect(0, 22, 159, 23, "fr1")
    cv.rect(0, 22, 159, 22, "fr0")
    cv.rect(0, 54, 159, 55, "fr1")
    cv.rect(0, 54, 159, 54, "fr0")
    # Thin glazing bars inside each bay.
    for a, b in zip(cols, cols[1:]):
        for x in range(a + 10, b - 4, 10):
            cv.rect(x, 24, x, 53, "fr2")
            cv.rect(x, 56, x, 79, "fr2")
    # A pale glint on some panes: diagonal reflections.
    for x0 in (20, 92, 132):
        cv.checker(cv.m_poly([(x0, 26), (x0 + 3, 26), (x0 - 6, 52), (x0 - 9, 52)]) & cv.m_of("sk1", "sk2", "sk3"),
                   "sk0")
    # The low wall under the glass and its sill.
    cv.rect(0, 80, 159, 88, "in1")
    cv.rect(0, 80, 159, 80, "fr0")
    cv.rect(0, 81, 159, 81, "fr2")


def floor(cv):
    cv.rect(0, 89, 159, 143, "fl2")
    cv.rect(0, 89, 159, 89, "fl3")
    # Boards running away toward the glass: seams fanning from the far wall.
    for x in range(-120, 300, 14):
        cv.line([(80 + (x - 80) * 0.18, 90), (x, 143)], "fl3")
    # Deeper shadow toward the bottom, under the text box.
    cv.fill((cv.yy >= 118) & cv.m_of("fl2"), "fl3")
    cv.checker((cv.yy == 117) & cv.m_of("fl2"), "fl3")
    cv.fill((cv.yy >= 132) & cv.m_of("fl3"), "fl4")
    cv.checker((cv.yy == 131) & cv.m_of("fl3"), "fl4")
    # The sun through the glass: long window-shaped patches of gold, thrown
    # down and to the right across the boards.
    for x0, x1 in ((44, 66), (72, 94), (102, 118)):
        patch = cv.m_poly([(x0, 90), (x1, 90), (x1 + 34, 118), (x0 + 24, 118)])
        cv.fill(patch & cv.m_of("fl2", "fl3"), "fl1")
        cv.checker(patch & cv.m_of("fl1") & (cv.yy <= 98), "fl0")
        cv.fill(patch & (cv.yy <= 93) & cv.m_of("fl1", "fl0"), "fl0")
        bar = cv.m_poly([((x0 + x1) / 2, 90), ((x0 + x1) / 2 + 1, 90), ((x0 + x1) / 2 + 30, 118),
                         ((x0 + x1) / 2 + 29, 118)])
        cv.fill(bar & patch, "fl2")
    # The Vales' long shadows, thrown to the right by the low sun.
    shadow = cv.m_poly([(80, 91), (120, 90), (150, 97), (104, 98)])
    lit, dim = shadow & cv.m_of("fl0", "fl1"), shadow & cv.m_of("fl2")
    cv.fill(lit, "fl2")
    cv.fill(dim, "fl3")


# =============================================================================
# The shelves and the living collection
# =============================================================================
def case(cv, x0, x1, y0, y1, shelves):
    cv.rect(x0, y0, x1, y1, "in2")
    cv.rect(x0, y0, x1, y0 + 1, "wd1")
    cv.rect(x0, y0, x1, y0, "wd0")
    cv.rect(x0, y0, x0 + 1, y1, "wd1")
    cv.rect(x0, y0, x0, y1, "wd0")
    cv.rect(x1 - 1, y0, x1, y1, "wd2")
    for y in shelves:
        cv.rect(x0, y, x1, y + 2, "wd1")
        cv.rect(x0, y, x1, y, "wd0")
        cv.rect(x0, y + 2, x1, y + 2, "wd3")
        cv.rect(x0 + 2, y + 3, x1 - 2, y + 3, "in3")           # the shelf's shadow


def sheet(cv, x, y, w, h, lean=0):
    """A framed pressed specimen: a sprig laid on cream paper."""
    cv.rect(x, y, x + w, y + h, "wd3")
    cv.rect(x + 1, y + 1, x + w - 1, y + h - 1, "pp0")
    cv.rect(x + w - 1, y + 1, x + w - 1, y + h - 1, "pp1")
    cx = x + w // 2
    cv.line([(cx, y + h - 2), (cx + lean, y + 2)], "pl2")
    for k, yy in enumerate(range(y + 3, y + h - 2, 2)):
        side = -1 if k % 2 == 0 else 1
        cv.px(cx + side + (lean if yy < y + h / 2 else 0), yy, "pl1")
        cv.px(cx + 2 * side + (lean if yy < y + h / 2 else 0), yy - 1, "pl1")


def books(cv, x, y_shelf, spec):
    for w, h, c in spec:
        cv.rect(x, y_shelf - h, x + w - 1, y_shelf - 1, c)
        cv.rect(x, y_shelf - h, x, y_shelf - 1, "pp1" if c == "bk3" else "in0")
        cv.px(x + w // 2, y_shelf - h + 2, "gold")
        x += w + (1 if h < 9 else 0)
    return x


def potted(cv, cx, y_shelf, w, kind):
    """A potted Quickened: terracotta pot, a plant leaning toward the sun."""
    top = y_shelf - 6
    cv.poly([(cx - w / 2 + 1, top + 1), (cx + w / 2 - 1, top + 1), (cx + w / 2 - 2, y_shelf - 1),
             (cx - w / 2 + 2, y_shelf - 1)], "tc1")
    cv.rect(cx - w / 2, top, cx + w / 2 - 1, top + 1, "tc0")
    cv.rect(cx + w / 2 - 2, top, cx + w / 2 - 1, y_shelf - 2, "tc2")
    cv.px(cx - w / 2 + 1, top + 3, "tc0")
    if kind == "fern":
        for dx, dy in ((-5, -8), (-2, -11), (2, -10), (5, -6), (-6, -3)):
            cv.line([(cx, top), (cx + dx, top + dy)], "pl1")
            cv.px(cx + dx, top + dy, "pl0")
            cv.px(cx + dx // 2 - 1, top + dy // 2, "pl0")
        cv.line([(cx, top), (cx - 3, top - 6)], "pl2")
    elif kind == "bloom":
        cv.line([(cx, top), (cx - 2, top - 9)], "pl2")
        for lx, ly in ((cx - 4, top - 3), (cx + 3, top - 5)):
            cv.ellipse(lx, ly, 2.4, 1.4, "pl1")
            cv.px(lx - 1, ly - 1, "pl0")
        cv.ellipse(cx - 2, top - 11, 2.4, 2.4, "pk1")
        cv.px(cx - 3, top - 12, "pk0")
        cv.px(cx - 2, top - 11, "pk0")
    elif kind == "trail":
        cv.ellipse(cx, top - 2, w / 2, 3, "pl1")
        cv.checker(cv.m_ellipse(cx - 1, top - 3, w / 2 - 2, 2), "pl0")
        for vx, n in ((cx - w / 2, 9), (cx + w / 2 - 1, 13), (cx - 1, 6)):
            for k in range(n):
                cv.px(vx + (k % 2), top + k, "pl2" if k % 3 else "pl1")
    elif kind == "spike":
        for dx, h in ((-2, 9), (0, 12), (2, 8), (-4, 5), (4, 6)):
            cv.line([(cx + dx // 2, top), (cx + dx - 1, top - h)], "pl1")
            cv.px(cx + dx - 1, top - h, "pl0")
        cv.line([(cx, top), (cx - 1, top - 12)], "pl2")


def shelves(cv):
    # Left case.
    case(cv, 0, 30, 8, 92, (26, 46, 66))
    sheet(cv, 3, 12, 10, 13, lean=-1)
    sheet(cv, 15, 14, 9, 11, lean=1)
    potted(cv, 26, 26, 6, "spike")
    x = books(cv, 3, 46, [(3, 11, "bk0"), (2, 13, "bk2"), (3, 12, "bk1"), (2, 10, "bk3")])
    cv.rect(x + 2, 36, x + 8, 45, "jr1")
    cv.rect(x + 2, 36, x + 3, 45, "jr0")
    cv.rect(x + 2, 34, x + 8, 35, "wd3")
    cv.line([(x + 5, 44), (x + 5, 38)], "pl2")
    potted(cv, 8, 66, 8, "fern")
    potted(cv, 21, 66, 7, "bloom")
    books(cv, 3, 89, [(3, 14, "bk1"), (3, 15, "bk3"), (2, 12, "bk0"), (3, 14, "bk2"), (3, 13, "bk0")])
    # Right case.
    case(cv, 130, 159, 8, 92, (26, 46, 66))
    potted(cv, 140, 26, 10, "trail")
    sheet(cv, 148, 12, 9, 13, lean=1)
    x = 134
    for h in (9, 12, 10):
        cv.rect(x, 46 - h, x + 5, 45, "jr1")
        cv.rect(x, 46 - h, x + 1, 45, "jr0")
        cv.rect(x - 1, 46 - h - 1, x + 6, 46 - h, "wd3")
        cv.line([(x + 3, 44), (x + 3, 46 - h + 3)], "pl2")
        cv.px(x + 2, 46 - h + 4, "pl1")
        x += 8
    sheet(cv, 133, 50, 10, 14, lean=-1)
    potted(cv, 151, 66, 8, "bloom")
    books(cv, 133, 89, [(3, 13, "bk2"), (3, 15, "bk0"), (2, 12, "bk3"), (3, 14, "bk1"), (3, 15, "bk2"),
                        (2, 11, "bk0"), (3, 13, "bk3")])
    # A trailing Quickened hanging from the vault.
    cv.line([(112, 0), (112, 10)], "fr2")
    cv.poly([(107, 10), (117, 10), (115, 15), (109, 15)], "tc1")
    cv.rect(107, 10, 116, 10, "tc0")
    cv.rect(114, 11, 116, 14, "tc2")
    for vx, n in ((107, 12), (110, 8), (116, 15), (113, 10)):
        for k in range(n):
            cv.px(vx + (k // 3) % 2, 13 + k, "pl1" if k % 3 else "pl0")
    # Light catches the left faces of the cases.
    cv.edge(cv.m_rect(0, 8, 30, 92) & cv.m_of("in2"), "in1", "W")


# =============================================================================
# The Vales
# =============================================================================
def outlined(cv, m, c, ink="ink", sides="NESW"):
    cv.fill(m, c)
    cv.outline(m, ink, sides)
    return m


def lit_split(cv, m, lit, base, shade, a, b):
    """Fill m with base, its left part (x < a) lit and right part (x > b) shaded."""
    cv.fill(m, base)
    cv.fill(m & (cv.xx < a), lit)
    cv.fill(m & (cv.xx > b), shade)


def rowan(cv):
    RX = 90
    # The aspen staff in his right hand: crook at the top, the bell hung from it.
    staff = cv.m_rect(78, 40, 79, 90)
    crook = cv.m_line([(78, 41), (78, 37), (80, 35), (83, 35), (84, 37), (84, 39)], 2)
    outlined(cv, staff | crook, "as1")
    cv.fill(cv.m_rect(78, 40, 78, 90), "as0")
    cv.fill(crook & (cv.yy <= 36), "as0")
    for y in (50, 61, 74):
        cv.px(79, y, "as2")
    cv.line([(84, 40), (84, 41)], "be1")
    bell = cv.m_poly([(83, 42), (85, 42), (86, 45), (82, 45)])
    outlined(cv, bell, "be0")
    cv.px(85, 44, "be1")
    cv.px(84, 46, "be1")
    # The cloak: closed at the throat, open down the front over the tunic,
    # flaring at the hem.
    cloak = cv.m_poly([(RX - 6, 58), (RX + 6, 58), (RX + 10, 66), (RX + 12, 88), (RX - 12, 88), (RX - 9, 66)])
    cv.outline(cloak, "ink")
    lit_split(cv, cloak, "mo0", "mo1", "mo2", RX - 6, RX + 5)
    cv.fill(cloak & (cv.xx < RX - 9), "mo1")                     # the lit edge is a band, not the rim
    tunic = cv.m_poly([(RX - 1, 61), (RX + 1, 61), (RX + 3, 88), (RX - 2, 88)])
    cv.fill(tunic, "ea0")
    cv.fill(tunic & (cv.xx >= RX + 1), "ea1")
    for pts in ([(RX - 7, 70), (RX - 8, 87)], [(RX + 7, 70), (RX + 8, 87)]):
        cv.line(pts, "mo2")
    cv.line([(RX - 4, 72), (RX - 5, 87)], "mo1")
    cv.rect(RX - 7, 89, RX - 3, 90, "ea1")                        # boots under the hem
    cv.rect(RX + 2, 89, RX + 6, 90, "ea1")
    cv.outline(cv.m_rect(RX - 7, 89, RX - 3, 90) | cv.m_rect(RX + 2, 89, RX + 6, 90), "ink", "ESW")
    # His arm out to the staff, the hand round the shaft.
    arm = cv.m_poly([(RX - 8, 61), (RX - 5, 61), (RX - 7, 68), (80, 69), (80, 66), (RX - 9, 64)])
    outlined(cv, arm, "mo1")
    cv.fill(arm & (cv.yy <= 63), "mo0")
    hand = cv.m_rect(78, 65, 81, 68)
    outlined(cv, hand, "s0")
    cv.rect(80, 67, 81, 68, "s1")
    cv.rect(78, 66, 79, 66, "as1")
    cv.rect(78, 66, 78, 66, "as0")
    # The hood, up but pushed back: a moss cowl round the face.
    hood = cv.m_ellipse(RX, 52, 7, 7) | cv.m_poly([(RX - 7, 54), (RX + 7, 54), (RX + 6, 60), (RX - 6, 60)])
    cv.outline(hood, "ink")
    lit_split(cv, hood, "mo0", "mo1", "mo2", RX - 3, RX + 3)
    cv.fill(hood & (cv.yy >= 57), "mo2")
    cv.px(RX, 59, "be0")                                          # the brass clasp
    face = cv.m_ellipse(RX - 1, 54, 4, 5)
    cv.fill(face, "s0")
    cv.fill(face & (cv.xx >= RX + 1), "s1")
    cv.fill(cv.m_ellipse(RX - 1, 54, 5, 6) & ~face & (cv.yy <= 54), "mo3")    # the hood's deep inside
    # Grey-streaked auburn hair under the hood's rim, a short grizzled beard.
    cv.fill(cv.m_rect(RX - 4, 49, RX + 2, 50) & face, "au0")
    cv.px(RX + 1, 50, "au1")
    cv.px(RX - 2, 49, "gy")
    beard = cv.m_ellipse(RX - 1, 58, 4, 2) & face
    cv.fill(beard, "au1")
    cv.fill(beard & (cv.xx <= RX - 2), "au0")
    cv.px(RX - 3, 58, "gy")
    cv.px(RX - 3, 53, "ink")
    cv.px(RX + 1, 53, "ink")
    cv.px(RX - 1, 55, "s1")
    cv.line([(RX - 2, 57), (RX, 57)], "au1")


def vale(cv):
    VX = 109
    # Trousers and shoes.
    legs = cv.m_rect(VX - 4, 82, VX - 2, 88) | cv.m_rect(VX + 1, 82, VX + 3, 88)
    outlined(cv, legs, "gr1")
    cv.fill(cv.m_rect(VX - 4, 82, VX - 4, 88), "gr0")
    shoes = cv.m_rect(VX - 5, 89, VX - 2, 90) | cv.m_rect(VX + 1, 89, VX + 4, 90)
    outlined(cv, shoes, "st1", sides="ESW")
    # The lab coat, open over the green blouse, to the knee.
    coat = cv.m_poly([(VX - 5, 61), (VX + 5, 61), (VX + 8, 68), (VX + 9, 83), (VX - 9, 83), (VX - 8, 68)])
    cv.outline(coat, "ink")
    lit_split(cv, coat, "ct0", "ct1", "ct2", VX - 3, VX + 5)
    blouse = cv.m_poly([(VX - 2, 61), (VX + 2, 61), (VX, 67)])
    cv.fill(blouse, "gr0")
    cv.px(VX + 1, 62, "gr1")
    cv.line([(VX - 3, 61), (VX, 70), (VX, 82)], "ct2")             # lapel and front edge
    cv.line([(VX + 3, 61), (VX + 1, 67)], "ct2")
    for x in (VX - 1, VX - 1):
        cv.px(x, 73, "ct2")
        cv.px(x, 78, "ct2")
    # The satchel strap across the coat, the satchel on her far hip.
    cv.line([(VX - 4, 62), (VX + 7, 74)], "sa1")
    bag = cv.m_rect(VX + 5, 73, VX + 11, 79)
    outlined(cv, bag, "sa0")
    cv.fill(bag & (cv.xx >= VX + 10), "sa1")
    cv.rect(VX + 5, 73, VX + 11, 74, "sa1")
    cv.px(VX + 8, 75, "be0")
    # Her near arm reaching to rest a hand on Rowan's arm.
    arm = cv.m_poly([(VX - 6, 62), (VX - 3, 63), (VX - 7, 70), (99, 71), (99, 68), (VX - 9, 66)])
    outlined(cv, arm, "ct0")
    cv.fill(arm & (cv.yy >= 69), "ct1")
    hand = cv.m_rect(97, 67, 99, 70)
    outlined(cv, hand, "s0")
    cv.px(99, 70, "s1")
    # The head: wild red curls round a round face, round glasses.
    hair = cv.m_ellipse(VX, 53, 7.5, 6.5) | cv.m_ellipse(VX + 1, 58, 8, 3.5)
    for x, y, r in ((VX - 7, 49, 2.5), (VX + 1, 46.5, 3), (VX - 4, 47, 2), (VX + 7, 50, 2), (VX - 8, 57, 2),
                    (VX + 8.5, 57, 2.5), (VX + 5, 61, 2)):
        hair |= cv.m_ellipse(x, y, r, r)
    cv.outline(hair, "ink")
    cv.fill(hair, "h1")
    cv.fill(hair & (cv.xx + cv.yy < VX + 53 - 5), "h0")
    cv.fill(hair & (cv.xx - cv.yy > VX - 53 + 4), "h2")
    cv.fill(hair & (cv.yy >= 58) & (cv.xx > VX + 2), "h2")
    for pts in ([(VX - 5, 49), (VX - 3, 48)], [(VX + 3, 49), (VX + 5, 51)], [(VX + 6, 55), (VX + 7, 58)],
                [(VX - 7, 55), (VX - 6, 58)]):
        cv.line(pts, "h2")
    face = cv.m_ellipse(VX - 1, 55, 4, 4.5)
    cv.fill(face, "s0")
    cv.fill(face & (cv.xx >= VX + 1), "s1")
    cv.fill(cv.m_rect(VX - 5, 50, VX + 3, 51) & face, "h1")      # the fringe
    cv.px(VX - 3, 51, "h0")
    # Round glasses: thin rims with a glint, the eyes behind them.
    cv.line([(VX - 4, 53), (VX + 2, 53)], "ink")
    for ex in (VX - 3, VX + 1):
        cv.px(ex - 1, 54, "ct2")
        cv.px(ex + 1, 54, "ct2")
        cv.px(ex, 54, "ink")
        cv.px(ex - 1, 53, "ct0")
    cv.px(VX - 2, 58, "s2")
    cv.line([(VX - 2, 58), (VX, 58)], "s2")                         # a smile


# =============================================================================
# The player, from behind, holding up the Field Herbarium
# =============================================================================
def player(cv):
    PX = 42
    # The rust jacket: shoulders and back, widening toward the camera.
    back = cv.m_poly([(16, 143), (18, 100), (22, 90), (32, 84), (52, 84), (62, 90), (66, 100), (68, 143)])
    cv.outline(back, "ink")
    cv.fill(back, "jk1")
    cv.fill(back & (cv.xx < 30), "jk0")
    cv.fill(back & (cv.xx > 56), "jk2")
    cv.fill(back & (cv.yy >= 118), "jk2")
    cv.fill(back & (cv.yy >= 118) & (cv.xx > 56), "jk3")
    cv.checker(back & (cv.yy == 117), "jk2")
    cv.line([(PX, 92), (PX, 143)], "jk2")                           # the back seam
    cv.line([(24, 96), (25, 116)], "jk2")                           # folds
    cv.line([(60, 96), (59, 112)], "jk3")
    # The vasculum strap, far shoulder to near hip, with its buckle.
    strap = cv.m_line([(56, 85), (22, 143)], 4)
    cv.fill(strap & back, "st0")
    cv.fill(cv.m_line([(57, 86), (23, 143)], 1) & back, "st1")
    cv.rect(41, 110, 44, 113, "gold")
    cv.rect(42, 111, 43, 112, "st1")
    # The collar and the neck.
    collar = cv.m_poly([(32, 84), (52, 84), (49, 88), (35, 88)])
    cv.fill(collar, "jk2")
    neck = cv.m_rect(37, 78, 47, 85)
    outlined(cv, neck, "s1")
    cv.fill(neck & (cv.xx <= 38), "s0")
    # The raised arm holding the book up and to the right.
    arm = cv.m_poly([(58, 88), (64, 86), (70, 79), (73, 82), (68, 92), (62, 96)])
    outlined(cv, arm, "jk1")
    cv.fill(arm & (cv.xx >= 66), "jk2")
    # The Field Herbarium: green cloth, a cream label with a leaf, a gold band,
    # the page block showing at the edge.
    book = cv.m_poly([(64, 62), (78, 60), (80, 80), (66, 82)])
    cv.outline(book, "ink")
    cv.fill(book, "fb1")
    cv.fill(book & (cv.xx <= 66), "fb0")
    cv.fill(book & (cv.xx >= 78), "fb2")
    cv.fill(cv.m_poly([(79, 61), (80, 61), (82, 80), (81, 80)]) & ~book, "lab")    # the page edge
    cv.outline(cv.m_poly([(79, 61), (80, 61), (82, 80), (81, 80)]), "ink", "E")
    label = cv.m_poly([(68, 65), (75, 64), (76, 72), (69, 73)])
    cv.fill(label, "lab")
    cv.line([(72, 71), (72, 66)], "fb2")
    cv.px(71, 68, "fb1")
    cv.px(73, 67, "fb1")
    cv.px(71, 67, "fb0")
    cv.px(73, 66, "fb0")
    band = cv.m_poly([(69, 75), (77, 74), (77, 76), (69, 77)])
    cv.fill(band & book, "gold")
    hand = cv.m_poly([(67, 78), (71, 77), (72, 82), (68, 83)])
    outlined(cv, hand, "s0")
    cv.px(71, 81, "s1")
    # The head from behind: chestnut hair under the green field cap.
    ears = cv.m_ellipse(PX - 10, 72, 1.5, 2.5) | cv.m_ellipse(PX + 10, 72, 1.5, 2.5)
    outlined(cv, ears, "s1")
    cv.px(PX - 10, 70, "s0")
    hair = cv.m_ellipse(PX, 70, 10, 10) & (cv.yy <= 79)
    cv.outline(hair, "ink")
    cv.fill(hair, "hr1")
    cv.fill(hair & (cv.xx <= PX - 5), "hr0")
    cv.fill(hair & (cv.xx >= PX + 6), "hr2")
    for x in range(PX - 7, PX + 8, 3):
        cv.line([(x, 74), (x + 1, 78)], "hr2")
    cap = cv.m_ellipse(PX, 66, 11, 8) & (cv.yy <= 69)
    cv.outline(cap, "ink")
    cv.fill(cap, "cp1")
    cv.fill(cap & (cv.xx + cv.yy < PX + 66 - 7), "cp0")
    cv.fill(cap & (cv.xx >= PX + 7), "cp2")
    cv.rect(PX - 11, 68, PX + 11, 69, "cp2")                       # the band
    cv.fill(cv.m_ellipse(PX, 69, 3, 2) & (cv.yy <= 69), "hr1")       # the strap gap at the back
    cv.line([(PX - 2, 62), (PX + 2, 62)], "cp0")
    cv.px(PX, 58, "cp2")                                            # the button


def motes(cv):
    # Dust and pollen turning gold in the low sun.
    for x, y in ((60, 40), (66, 52), (72, 44), (96, 38), (102, 50), (58, 28), (118, 42), (88, 30), (128, 54),
                 (70, 34), (54, 48)):
        if cv.at(x, y) not in ("ink",):
            cv.px(x, y, "sun")


def fellowship():
    cv = Canvas(PAL, "in1")
    sky(cv)
    glazing(cv)
    floor(cv)
    shelves(cv)
    motes(cv)
    rowan(cv)
    vale(cv)
    player(cv)
    return cv.image()


STILLS = {"fellowship": fellowship}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stills11")
    return out
