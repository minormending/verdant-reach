"""Chapter 10 architecture and landmarks: the Council hall, the Grove Gate and
the Elder's trunk.

Native integer pixels on the named-colour canvas (kit.Canvas), light from the
top-left, dark hue-shifted edges instead of black outlines, transparent
outside each silhouette. The hall's door is bottom-aligned inside its door
tile; windows, doors and the sign font come from tools/art/structures.py so
the Arboretum matches the earlier towns.
"""
from __future__ import annotations

import math

import kit
from kit import Canvas
import structures as S

SIZES = {"council_hall": (6, 4), "grove_gate": (4, 2), "elder_trunk": (4, 4)}
DOORS = {"council_hall": (3, 3)}
IMAGES = {}
STONE = ("s0", "s1", "s2", "s3")
COPPER = ("c0", "c1", "c2", "c3")


# ---------------------------------------------------------- council hall ---
def copper_roof(cv, x0, x1, top, eave, hip, cx):
    """A hipped verdigris roof: standing seams, lit west of the ridge line,
    a rolled ridge cap and a dark drip edge."""
    for y in range(top, eave + 1):
        t = (y - top) / max(1, eave - top)
        l = round(x0 + hip * (1 - t))
        r = round(x1 - hip * (1 - t))
        for x in range(l, r + 1):
            lit = x < cx - (r - l) * 0.15
            col = "c1" if lit else "c2"
            if (x - x0) % 4 == 0:
                col = "c0" if lit else "c1"           # the standing seams catch light
            if x == l:
                col = "c0"
            elif x == r:
                col = "c3"
            cv.px(x, y, col)
    cv.hline(round(x0 + hip), round(x1 - hip), top, "c0")
    cv.hline(x0, x1, eave, "c3")
    cv.hline(x0 + 1, x1 - 1, eave - 1, "c2")


def ashlar(cv, x0, y0, x1, y1, course=5, length=10):
    cv.rect(x0, y0, x1, y1, "s1")
    for row, y in enumerate(range(y0, y1 + 1, course)):
        cv.hline(x0, x1, min(y1, y + course - 1), "s2")
        off = (length // 2) * (row % 2)
        for x in range(x0 + off, x1 + 1, length):
            cv.vline(x, y, min(y1, y + course - 2), "s2")
            cv.hline(x + 1, min(x1, x + length - 2), y, "s0")


def arched_window(cv, x0, y0, w, h):
    """A tall arched window: a deep stone reveal, dark glass with a pale
    reflection and a glazing bar, a keystone over the arch."""
    cv.rect(x0 - 1, y0 + 2, x0 + w, y0 + h, "s3")
    cv.hline(x0 + 1, x0 + w - 2, y0, "s3")
    cv.hline(x0, x0 + w - 1, y0 + 1, "s3")
    cv.rect(x0 + 1, y0 + 2, x0 + w - 2, y0 + h - 1, "U2")
    cv.hline(x0 + 2, x0 + w - 3, y0 + 1, "U2")
    for i in range(3):
        cv.px(x0 + 1 + i, y0 + h - 4 - i * 2, "U0")
        cv.px(x0 + 1 + i, y0 + h - 5 - i * 2, "U1")
    cv.vline(x0 + w // 2, y0 + 2, y0 + h - 1, "s3")
    cv.hline(x0 + 1, x0 + w - 2, y0 + h // 2, "s3")
    cv.px(x0 + w // 2 - 1, y0 - 1, "s0"); cv.px(x0 + w // 2, y0 - 1, "s0")   # keystone
    cv.hline(x0 - 2, x0 + w + 1, y0 + h + 1, "s0")                           # sill
    cv.hline(x0 - 2, x0 + w + 1, y0 + h + 2, "s2")


def leaf_pillar(cv, x0, y0, y1, w=4):
    """A pilaster carved with climbing leaves under a leaf capital."""
    cv.rect(x0, y0, x0 + w - 1, y1, "s0")
    cv.vline(x0 + w - 1, y0, y1, "s2")
    for y in range(y0 + 5, y1 - 2, 4):
        cv.px(x0 + 1, y, "s2"); cv.px(x0 + 2, y + 1, "s2")
        cv.px(x0 + 1, y + 2, "s1")
    cv.put(["c0cc", "cccC", " cC "], {"c": "c1", "C": "c2", "0": "c0"}, x0 - (1 if w > 3 else 0), y0 - 3)
    cv.hline(x0 - 1, x0 + w, y1 + 1, "s2")


def council_hall():
    """The Council hall: an old pale-limestone hall under a hipped verdigris
    roof with a lantern cupola, tall arched windows between leaf-carved
    pilasters, a pediment and a COUNCIL HALL frieze over a columned porch."""
    cv = Canvas(96, 64)
    CX = 56                                   # the door tile (3,3) centre
    # West annex: a lower wing under a copper lean-to.
    for y in range(24, 32):
        t = (y - 24) / 7
        for x in range(0, 17):
            cv.px(x, y, "c1" if x % 4 else "c0")
        cv.px(0, y, "c0")
    cv.hline(0, 16, 24, "c0"); cv.hline(0, 16, 31, "c3"); cv.hline(0, 16, 30, "c2")
    ashlar(cv, 0, 32, 16, 58)
    cv.vline(0, 32, 58, "s0")
    arched_window(cv, 4, 38, 8, 15)
    # The main roof and its lantern.
    copper_roof(cv, 13, 95, 9, 27, 14, CX)
    cv.put([
        "    y    ",
        "   cCc   ",
        "  c0cCc  ",
        " ccccCCc ",
        " s3s3s3s ",
        " s3s3s3s ",
        " sssssss ",
        "#########",
    ], {"y": "Y1", "c": "c1", "C": "c2", "0": "c0", "s": "s0", "3": "s3", "#": "c3"}, CX - 5, 2)
    # The hall's front wall.
    ashlar(cv, 16, 28, 95, 58)
    cv.vline(16, 28, 58, "s0")
    cv.vline(95, 28, 58, "s3")
    cv.hline(14, 95, 28, "s3")                    # the eaves' shadow
    # Frieze with the name.
    name = "COUNCIL HALL"
    w = S.text_w(name) + 6
    cv.rect(CX - w // 2, 30, CX + w // 2 - 1, 37, "s0")
    cv.hline(CX - w // 2, CX + w // 2 - 1, 37, "s2")
    cv.text(name, CX - S.text_w(name) // 2, 31, "c3", "s2")
    # Pediment over the porch, rising into the roof, with a carved Elder leaf.
    for i in range(16):
        y = 14 + i
        half = 2 + int(i * 1.45)
        cv.hline(CX - half, CX + half - 1, y, "s1" if i < 15 else "s2")
        cv.px(CX - half, y, "s0"); cv.px(CX - half + 1, y, "s0")
        cv.px(CX + half - 1, y, "s3"); cv.px(CX + half - 2, y, "s2")
    cv.put([
        "   cc   ",
        "  c0cc  ",
        " cccccC ",
        " ccccCC ",
        "  cCCC  ",
        "   ss   ",
        "   s    ",
    ], {"c": "c1", "C": "c2", "0": "c0", "s": "s2"}, CX - 4, 19)
    # Tall arched windows, symmetric about the door.
    for x0 in (22, 34, 71, 83):
        arched_window(cv, x0, 40, 8, 15)
    # Leaf-carved pilasters at the corners and between the bays.
    for x0, w in ((17, 3), (30, 3), (79, 3), (92, 3)):
        leaf_pillar(cv, x0, 42, 57, w)
    # The porch: two round columns with leaf capitals before an arched door.
    cv.rect(CX - 11, 39, CX + 10, 58, "s3")
    for x in range(CX - 11, CX + 11):
        dx = (x + 0.5 - CX) / 11
        top = 39 + int(round(5 * (1 - math.sqrt(max(0, 1 - dx * dx)))))
        cv.vline(x, 39, top, "s1")
    for px0 in (CX - 14, CX + 9):
        cv.rect(px0, 41, px0 + 4, 57, "s0")
        cv.vline(px0 + 3, 41, 57, "s1"); cv.vline(px0 + 4, 41, 57, "s2")
        cv.vline(px0, 41, 57, "s0")
        cv.put([" c0c ", "ccccC", " cCC "], {"c": "c1", "C": "c2", "0": "c0"}, px0, 38)
        cv.rect(px0 - 1, 57, px0 + 5, 58, "s2")
    S.door(cv, 3, 3, "double", top=46, ramp=("c0", "c1", "c2", "c3"))
    # Steps across the front.
    cv.rect(0, 59, 95, 63, "s2")
    cv.hline(0, 95, 59, "s0")
    cv.hline(0, 95, 61, "s1")
    cv.hline(0, 95, 63, "s3")
    cv.rect(CX - 10, 59, CX + 9, 63, "s1")
    cv.hline(CX - 10, CX + 9, 59, "s0"); cv.hline(CX - 10, CX + 9, 62, "s2")
    S.door(cv, 3, 3, "double", top=46, ramp=("c0", "c1", "c2", "c3"))
    return cv


# ------------------------------------------------------------ grove gate ---
IRON = {"#": "R3", "i": "R2", "o": "a1", "O": "a2"}
LEAF_GATE = [   # a wrought-iron gate leaf pinned open: spear-tipped bars, two rails, a scroll
    " o  o  o  o ",
    " #  #  #  # ",
    " #  #  #  # ",
    "############",
    "#i##i##i##i#",
    " #  #  #  # ",
    " # #o# #  # ",
    " ## O ##  # ",
    " #  #  #  # ",
    " #  #  #  # ",
    " #  #  #  # ",
    " #  #  #  # ",
    " #  #  #  # ",
    "############",
    "#i##i##i##i#",
    " #  #  #  # ",
    " #  #  #  # ",
    " #  #  #  # ",
    "############",
]


def raised(cv, pts, lit="s0", body="s1", shade="s3"):
    """A carved root in relief: a 2px band lit on its west edge, shadowed east."""
    cv.line([(x + 2, y) for x, y in pts], shade)
    cv.line([(x + 1, y) for x, y in pts], body)
    cv.line(pts, lit)


def grove_gate():
    """One tower of the Grove Gate (a pair flanks the open gap): a weathered
    pale-stone pier carved with climbing roots round an aspen-leaf boss,
    under a stepped cornice and finial; on each side the wall's capstones
    with an iron gate leaf thrown back against them. Symmetric, so the two
    towers mirror each other about the gap."""
    from tilesets import FLOOR, FLOOR_KEY
    cv = Canvas(64, 32)
    # The Grove's litter behind the wall line (the threshold north of the
    # gate is grove_floor), so the towers sit in it seamlessly.
    for y in range(16):
        for x in range(64):
            cv.px(x, y, FLOOR_KEY[FLOOR[y][x % 16]])
    # The wall either side, matching the stone_wall tile (capstones over a coursed face).
    for x0 in (0, 48):
        cv.rect(x0, 19, x0 + 15, 23, "R1")
        for x in range(x0 + 1, x0 + 16, 5):
            cv.vline(x, 19, 22, "R2")
            cv.hline(x + 1, min(x0 + 15, x + 3), 19, "R0")
        cv.hline(x0, x0 + 15, 23, "R2")
        cv.rect(x0, 24, x0 + 15, 31, "R1")
        for y, off in ((24, 1), (28, 4)):
            cv.hline(x0, x0 + 15, y + 3, "R2")
            for x in range(x0 + off, x0 + 16, 7):
                cv.vline(x, y, y + 2, "R2")
        cv.hline(x0, x0 + 15, 31, "R3")
    # Iron leaves thrown open against the wall.
    cv.put(LEAF_GATE, IRON, 2, 12)
    cv.put([r[::-1] for r in LEAF_GATE], IRON, 50, 12)
    # The pier: a plinth, a shaft and a stepped cornice, lit from the west.
    cv.rect(16, 25, 47, 31, "s1")
    cv.hline(16, 47, 25, "s0"); cv.vline(16, 25, 31, "s0"); cv.vline(47, 25, 31, "s3")
    cv.hline(17, 46, 30, "s2"); cv.hline(16, 47, 31, "s3")
    cv.rect(19, 7, 44, 24, "s1")
    cv.vline(19, 7, 24, "s0")
    cv.rect(41, 7, 44, 24, "s2"); cv.vline(44, 7, 24, "s3")
    cv.rect(17, 3, 46, 6, "s0")
    cv.hline(17, 46, 6, "s2"); cv.vline(46, 3, 6, "s3"); cv.hline(17, 46, 5, "s1")
    cv.rect(20, 1, 43, 2, "s1"); cv.hline(20, 43, 1, "s0"); cv.px(43, 2, "s3")
    cv.put(["  #  ", " #o# ", "#ooo#"], {"#": "s2", "o": "s0"}, 29, -1)
    # Carved roots climb from the plinth and close round the leaf boss.
    raised(cv, [(21, 24), (22, 20), (21, 16), (23, 12), (26, 9)])
    raised(cv, [(39, 24), (38, 20), (39, 16), (37, 12), (34, 9)], lit="s1", body="s2", shade="s3")
    raised(cv, [(22, 20), (26, 21), (28, 24)])
    raised(cv, [(38, 20), (34, 21), (33, 24)], lit="s1", body="s2", shade="s3")
    # The boss: an aspen leaf in verdigris on a round stone.
    cv.put([
        " ssss ",
        "sccc0s",
        "sccccs",
        "scCCcs",
        " sCCs ",
        "  ss  ",
    ], {"s": "s2", "c": "c1", "C": "c2", "0": "c0"}, 29, 12)
    # Moss in the plinth's joints, weathering on the cornice.
    for x, y in ((18, 30), (19, 30), (27, 31), (36, 30), (44, 30), (45, 29), (22, 6), (40, 4)):
        cv.px(x, y, "v3")
    return cv


# ----------------------------------------------------------- elder trunk ---
def elder_trunk():
    """The Elder at the heart: a vast chalk-white bole leaning a little east,
    its knots long horizontal dashes, roots flaring out across the litter
    with glowing knots, and the golden crown cut off by the top of the view.
    The litter is drawn in (the grove_floor pattern, so it meets the tiles
    round it seamlessly), and roots leave the image where the heart's root
    lanes meet it, drawn exactly like root_vein's arms (bottom edge at x 23
    and 39, side edges at y 39 and 55)."""
    from tilesets import FLOOR, FLOOR_KEY
    cv = Canvas(64, 64)
    for y in range(64):
        for x in range(64):
            cv.px(x, y, FLOOR_KEY[FLOOR[y % 16][x % 16]])
    # The bole: widest at the root flare, leaning east as it rises.
    def edges(y):
        t = (y - 12) / 46                     # 0 under the crown, 1 at the ground
        cx = 34 - 3 * t
        half = 13 + 3 * t + (max(0, y - 49) ** 1.55) * 0.95
        return cx - half, cx + half
    for y in range(12, 60):
        l, r = edges(y)
        for x in range(int(round(l)), int(round(r)) + 1):
            u = (x - l) / max(1, r - l)
            col = "k0" if u < 0.6 else ("k1" if u < 0.9 else "a3")
            if u < 0.05:
                col = "k1"
            if col == "k0" and (x * 7 + (y // 5) * 3) % 11 == 0 and y % 5 != 0:
                col = "k1"
            cv.px(x, y, col)
    # Contact shadow where the flare meets the litter.
    for x in range(10, 56):
        if cv.get(x, 59) in ("k0", "k1", "a3"):
            cv.px(x, 60, "a3")
    # Aspen knots: horizontal dashes, staggered so no two sit side by side.
    for x, y, n in ((25, 24, 5), (38, 28, 4), (28, 34, 6), (40, 39, 3), (23, 42, 4), (32, 46, 5), (26, 52, 3)):
        cv.hline(x, x + n - 1, y, "k2")
        cv.hline(x + 1, x + n - 2, y + 1, "k1")
    # Roots across the litter: broad bark-pale near the trunk, thinning to
    # glowing root_vein strands at the lanes.
    roots = [
        ([(20, 50), (12, 45), (6, 41), (0, 39)], (0, 39)),
        ([(47, 50), (52, 45), (58, 41), (63, 39)], (63, 39)),
        ([(27, 58), (24, 60), (23, 63)], (23, 63)),
        ([(38, 58), (39, 60), (39, 63)], (39, 63)),
        ([(15, 57), (8, 56), (0, 55)], (0, 55)),
        ([(50, 57), (56, 56), (63, 55)], (63, 55)),
    ]
    for pts, _ in roots:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            flat = abs(x1 - x0) >= abs(y1 - y0)
            ox, oy = (0, 1) if flat else (1, 0)
            cv.line([(x0 + 2 * ox, y0 + 2 * oy), (x1 + 2 * ox, y1 + 2 * oy)], "v2")
            cv.line([(x0 + ox, y0 + oy), (x1 + ox, y1 + oy)], "v0")
            cv.line([(x0, y0), (x1, y1)], "v0")
        # Near the trunk the roots are bark: broad, pale, shadowed beneath.
        (x0, y0), (x1, y1) = pts[0], pts[1]
        cv.line([(x0, y0 + 3), (x1, y1 + 3)], "a3")
        cv.line([(x0, y0 + 2), (x1, y1 + 2)], "k1")
        cv.line([(x0, y0 + 1), (x1, y1 + 1)], "k0")
        cv.line([(x0, y0), (x1, y1)], "k0")
    for x, y in ((12, 45), (52, 45), (24, 60), (39, 60), (8, 56), (56, 56)):
        cv.put([" g ", "gvg", " g "], {"g": "v1", "v": "v0"}, x - 1, y - 1)
    # The edge crossings match root_vein's arms exactly (core 7-8, glow 9).
    for x in (23, 39):
        for y in (62, 63):
            cv.px(x, y, "v0"); cv.px(x + 1, y, "v0"); cv.px(x + 2, y, "v2")
    for y in (39, 55):
        for x in (0, 1, 62, 63):
            cv.px(x, y, "v0"); cv.px(x, y + 1, "v0"); cv.px(x, y + 2, "v2")
    # Where the Centuryheart is planted: a glow in the crook of the roots.
    cv.put(["  gg  ", " gvvg ", "gvvvvg", " gggg "], {"g": "v1", "v": "v0"}, 29, 56)
    # The golden crown, cut off at the top: overlapping clumps, lit upper-left,
    # whose centres sit above the view so the canopy runs out of the frame.
    clumps = [(4, -2, 11), (22, -4, 12), (42, -3, 12), (60, -2, 11), (12, 10, 8), (32, 11, 9), (52, 10, 8),
              (3, 16, 6), (61, 16, 6), (21, 19, 7), (44, 19, 7), (32, 22, 5), (11, 21, 4), (54, 21, 4)]
    for i, (cx, cy, r) in enumerate(clumps):
        for y in range(0, 30):
            for x in range(64):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d = math.hypot(dx, dy)
                if d > r:
                    continue
                lit = -(dx + dy) / (r * 1.414)
                if d > r - 1.2 and lit < -0.1:
                    c = "a3"
                elif lit < -0.3:
                    c = "a2"
                elif lit > 0.4 and d < r * 0.85:
                    c = "a0"
                elif lit < 0.15 and (x * 3 + y * 5 + i) % 9 == 0:
                    c = "a2"
                else:
                    c = "a1"
                cv.px(x, y, c)
    # The crown's shadow across the top of the bole.
    for x in range(64):
        for y in range(12, 28):
            if cv.get(x, y) in ("k0", "k1") and cv.get(x, y - 1) in ("a1", "a2", "a3", "a0"):
                cv.px(x, y, "a3" if cv.get(x, y) == "k1" else "k1")
                break
    return cv


def build():
    IMAGES.clear()
    for key, fn in (("council_hall", council_hall), ("grove_gate", grove_gate), ("elder_trunk", elder_trunk)):
        im = fn().image()
        assert im.size == tuple(v * 16 for v in SIZES[key]), key
        IMAGES[key] = im
