"""Chapter 4 tiles, grouped into six themed tilesets.

  city        paving (alts + kerbed edges), iron_railing, market_stall,
              fountain_basin (water group)
  orchard     orchard_tree (canopy group), fallen_apples, stepping_stones
              (water group), bramble_stump
  palm_house  tropical_grass (animated, tufted edges), palm_tree
  relay       console (animated), sensor_post, server_rack (animated),
              cable_floor
  nursery     seed_tray, potting_bench
  rose        rose_trellis (maze wall group), rose_bed, floor_marble (alts),
              stage_floor

Every tile keeps <=4 colours per 8x8 quadrant (`check`). Water-group tiles
reuse tiles.WATER / WATER2 and the same shoreline maths as tiles.shore, so
they sit seamlessly against the Round-3 water.
"""

from __future__ import annotations

import numpy as np

import kit
from kit import A, IDX, MASKS, T, blob, c, fill, put, reduce_quads, rims, sides

TILESETS: dict[str, dict[str, np.ndarray]] = {}
ORDER: dict[str, list[str]] = {}
NAMES_OF = {"city": "Glasshouse City", "orchard": "Orchard & River", "palm_house": "Palm House",
            "relay": "Root Relay", "nursery": "Nursery Garden", "rose": "Rose Conservatory"}
_cur: dict[str, np.ndarray] = {}


def tileset(tid: str, *keys: str):
    global _cur
    _cur = TILESETS.setdefault(tid, {})
    ORDER[tid] = list(keys)


def emit(stem: str, a: np.ndarray):
    assert a.shape == (16, 16), stem
    _cur[stem] = a.astype(np.int16).copy()


def stones(layout, gap, lit, face, shade=None, w=16, h=16, base=None):
    """Wrapping rectangular slabs: lit top/left edge, optional shaded
    bottom/right edge, `gap` between them."""
    a = fill(gap, w, h) if base is None else base.copy()
    for (x0, y0, sw, sh) in layout:
        for j in range(sh):
            for i in range(sw):
                col = face
                if j == 0 or i == 0:
                    col = lit
                if shade and (j == sh - 1 or i == sw - 1) and not (j == 0 or i == 0):
                    col = shade
                a[(y0 + j) % h, (x0 + i) % w] = c(col)
    return a


# ======================================================================
# CITY
# ======================================================================
tileset("city", "paving", "market_stall", "iron_railing", "fountain_basin")

# --- paving: big honey flagstones in staggered courses, mauve joints ----
PAVE_LAYOUTS = [
    [(0, 0, 10, 8), (10, 0, 6, 8), (5, 8, 8, 8), (13, 8, 8, 8)],
    [(3, 0, 7, 8), (10, 0, 9, 8), (0, 8, 6, 8), (6, 8, 10, 8)],
    [(0, 0, 6, 8), (6, 0, 10, 8), (3, 8, 9, 8), (12, 8, 7, 8)],
    [(7, 0, 8, 8), (15, 0, 8, 8), (2, 8, 7, 8), (9, 8, 9, 8)],
]


def pave(layout, specks=()):
    a = stones(layout, "H2", "H0", "H1")
    for (x, y, col) in specks:
        a[y, x] = c(col)
    return a


PAVING = pave(PAVE_LAYOUTS[0], [(13, 4, "H2"), (3, 5, "H0")])
PAVING_ALTS = [
    pave(PAVE_LAYOUTS[1], [(6, 3, "H2"), (13, 12, "H0"), (2, 12, "H2")]),
    pave(PAVE_LAYOUTS[2], [(9, 1, "H2"), (10, 2, "H2"), (10, 3, "H2"), (11, 4, "H2"), (4, 12, "H2")]),  # a crack
    pave(PAVE_LAYOUTS[3], [(1, 7, "G2"), (2, 7, "G2"), (1, 6, "G1"), (12, 3, "H2")]),  # moss in a joint
]
PAVING_ALTS[2] = reduce_quads(PAVING_ALTS[2], [("G1", "G2")])


def paving(mask: int, base=PAVING) -> np.ndarray:
    """A slim kerb on each open side: a lit kerbstone course on the north and
    west, a shadowed lip on the south and east (light from the top-left)."""
    n, e, s, w = sides(mask)
    a = base.copy()
    if not n:
        a[0, :] = c("H2"); a[1, :] = c("H0"); a[1, 7] = c("H2")
    if not s:
        a[14, :] = c("H0"); a[15, :] = c("H3"); a[14, 11] = c("H2")
    if not w:
        a[:, 0] = c("H2"); a[:, 1] = c("H0"); a[9, 1] = c("H2")
    if not e:
        a[:, 14] = np.where(a[:, 14] == c("H2"), c("H2"), c("H1")); a[:, 15] = c("H3")
    if not n and not w:
        a[0, 0:2] = c("H2"); a[1, 0] = c("H2")
    if not n and not e:
        a[0, 14:16] = c("H3"); a[1, 14] = c("H0")
    if not s and not w:
        a[15, 0:2] = c("H3"); a[14, 0] = c("H2")
    if not s and not e:
        a[14, 14] = c("H1")
    return a


emit("paving", PAVING)
for i, alt in enumerate(PAVING_ALTS, 1):
    emit(f"paving~{i}", alt)
for m in MASKS:
    emit(f"paving@{m}", paving(m))

# plain paving under props (the slabs continue beneath them)
UNDER = PAVING


# --- market stall: striped rose awning over a produce counter ------------
# Stalls placed side by side join into one arcade (awning and counter run
# edge to edge): apples on the west half, pears on the east.
emit("market_stall", A([
    "RRRRRRRRRRRRRRRR",
    "rrrrwwwwrrrrwwww",
    "rrrrwwwwrrrrwwww",
    "rrrrwwwwrrrrwwww",
    "RRRRwwwwRRRRwwww",
    "#RR###w##RR###w#",
    "################",
    "################",
    "#kak#akd#yyd#yyd",
    "dddddddddddddddd",
    "d#ddd#ddd#ddd#dd",
    "d#ddd#ddd#ddd#dd",
    "d#ddd#ddd#ddd#dd",
    "################",
    "#:#:#:#:#:#:#:#:",
    "::::::::::::::::",
], {"R": "RO2", "r": "RO1", "w": "H0", "#": "O3", "d": "O2", "a": "K1", "k": "K1",
    "y": "Y1", ":": "H2"}))


# --- iron railing: spear-topped bars on a low stone plinth --------------
def iron_railing(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = UNDER.copy()

    def hrun(x0, x1):
        for x in range(x0, x1 + 1):
            a[11, x] = c("H0"); a[12, x] = c("H1"); a[13, x] = c("H2")   # plinth
            a[4, x] = c("I3"); a[9, x] = c("I3")                         # rails
            if x % 3 == 1:
                a[2, x] = c("I1"); a[3, x] = c("I3")                     # spear tip
                a[5:9, x] = c("I3"); a[10, x] = c("I3")
                a[5, x] = c("I1")
            a[14, x] = c("H2") if a[14, x] == c("H0") else a[14, x]

    def vrun(y0, y1):
        for y in range(y0, y1 + 1):
            a[y, 6] = c("H0"); a[y, 9] = c("H2")
            a[y, 7] = c("I3") if y % 3 else c("I1")
            a[y, 8] = c("I3")
    if w:
        hrun(0, 6)
    if e:
        hrun(9, 15)
    if n:
        vrun(0, 4)
    if s:
        vrun(11, 15)
    put(a, [
        " ii ",
        "i##i",
        " ## ",
        " i# ",
        " i# ",
        " i# ",
        " i# ",
        " i# ",
        "pi#q",
        "ppqq",
        "qqqQ",
    ], {"i": "I1", "#": "I3", "p": "H0", "q": "H2", "Q": "H3"}, 6, 1)
    return reduce_quads(a, [("H3", "H2"), ("H0", "H1"), ("I1", "I3")])


for m in MASKS:
    emit(f"iron_railing@{m}", iron_railing(m))
emit("iron_railing", iron_railing(10))

# --- fountain basin: water inside a carved warm-stone coping ------------
COPING = stones([(0, 0, 8, 16), (8, 0, 8, 16)], "H2", "H0", "H1")
for y in (5, 11):
    COPING[y, :] = c("H2")


def shore4(interior, mask, frame, outside, bank, foam="W0", gap="W1", depth=(3, 2, 2, 2),
           radius=3, prof=T.SHORE_PROF, reduce=()):
    """tiles.shore over the extended palette: dark bank outside the water,
    lapping foam along the inside of the edge."""
    ins = blob(mask, depth, prof, radius)
    o_rim, i_nw, i_se = rims(ins, mask)
    a = np.where(ins, interior, outside)
    a[o_rim] = c(bank)
    ys, xs = np.nonzero(i_nw | i_se)
    for y, x in zip(ys, xs):
        lap = (x * 3 + y * 5 + frame * 3) % 8
        a[y, x] = c(gap) if lap in (0, 1) else c(foam)
    return reduce_quads(a, list(reduce))


def basin(mask, frame):
    water = T.WATER if frame == 1 else T.WATER2
    return shore4(water, mask, frame, COPING, bank="H3", depth=(3, 3, 3, 3), prof=None, radius=2,
                  reduce=(("W2", "W1"), ("W3", "W1"), ("H0", "H1"), ("H2", "H3")))


for m in MASKS:
    emit(f"fountain_basin@{m}", basin(m, 1))
    emit(f"fountain_basin@{m}__2", basin(m, 2))
emit("fountain_basin", basin(0, 1))
emit("fountain_basin__2", basin(0, 2))


# ======================================================================
# ORCHARD (Route 4)
# ======================================================================
tileset("orchard", "orchard_tree", "fallen_apples", "stepping_stones", "bramble_stump")
GRASS = T.GRASS

# --- apple trees: broad low crowns studded with apples; rows join -------
ORCHARD_CROWN = [  # h lit (= the grass, as tiles.tree does), b olive body, m shade, a apple
    "     mmm  mmm   ",
    "   mmhhhmmbhhm  ",
    "  mhhhhbbmbbhbm ",
    " mhhahhbbbbbbbbm",
    " mhhhhbbbabbbmbm",
    "mbhhbbbbbbbbmmbm",
    "mbbhbabbhhbbbmbm",
    "mbbbbbbbhbbbmmmm",
    "mbbbbbbbbbbmmbm ",
    " mbbmbbbbbmmmmm ",
    "  mmmbbbmmmmmm  ",
    "   mmmmmmmmmm   ",
    "      mmmm      ",
    "                ",
    "                ",
    "                ",
]
ORCH_TRUNK = [
    "      dd   ",
    "     ddd d ",
    "    dd ddd ",
    "     d  d  ",
]
ORCH_PAL = {"h": "G1", "b": "OR2", "m": "OR3", "a": "K1"}
GAP_TEX = T.GAP_TEX


def orchard_tree(mask: int) -> np.ndarray:
    """Apple trees: low, lumpy olive crowns with apples; joined trees merge
    into one canopy (gaps fill with deep shade toward same-group sides) and
    the gnarled trunk shows only on the open south edge."""
    n, e, s, w = sides(mask)
    a = GRASS.copy()
    for y in range(16):
        for x in range(16):
            ch = ORCHARD_CROWN[y][x]
            if ch != " ":
                a[y, x] = c(ORCH_PAL[ch])
                continue
            bands = []
            if y < 4:
                bands.append(n)
            if y > 10:
                bands.append(s)
            if x < 4:
                bands.append(w)
            if x > 11:
                bands.append(e)
            if bands and all(bands):
                a[y, x] = c("OR2" if GAP_TEX[y % 4][x] == "1" else "OR3")
    if not s:
        put(a, ORCH_TRUNK, {"d": "OR3"}, 2, 12)
        a[15, 4:12] = np.where(a[15, 4:12] == c("G1"), c("OR2"), a[15, 4:12])   # contact shade
    return reduce_quads(a, [("G0", "G1"), ("G2", "G1")])


for m in MASKS:
    emit(f"orchard_tree@{m}", orchard_tree(m))
emit("orchard_tree", orchard_tree(0))

# --- fallen apples: windfalls in the grass ------------------------------
APPLE = [" l ", ",aa", "aaA", " A "]
FA = A([
    "................",
    "...........;....",
    "..........;.....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "........;.......",
    "................",
    "................",
    "................",
    "..;.............",
    "................",
    "................",
    "................",
], {".": "G1", ";": "G2"})
for (x, y) in ((2, 2), (11, 6), (5, 9)):
    put(FA, APPLE, {"l": "G2", ",": "B0", "a": "K1", "A": "K2"}, x, y)
put(FA, ["oo", "o "], {"o": "O1"}, 12, 12)        # a half-eaten one, browning
put(FA, [",a", "aA"], {",": "B0", "a": "K1", "A": "K2"}, 13, 12)
emit("fallen_apples", reduce_quads(FA, [("O1", "K2"), ("G2", "G1")]))

# --- stepping stones: flat grey stones in the river (walkable) ----------------------
STONE = [  # , wet sheen, . stone, : dark wet side and waterline
    "    ,,,,,,     ",
    "  ,,,.......   ",
    " ,,..........  ",
    " ,...........: ",
    " ,...........: ",
    " :..........:: ",
    "  ::.......::  ",
    "   :::::::::   ",
]


def stepping(frame: int) -> np.ndarray:
    a = (T.WATER if frame == 1 else T.WATER2).copy()
    # calm the water right round the stone so the quadrants keep 4 colours
    a[2:14, 1:15] = c("W1")
    # a flat river stone: wet sheen, grey top, dark wet side at the waterline
    put(a, STONE, {",": "W0", ".": "R1", ":": "G3"}, 1, 4)
    # ripples that lap at the stone (shift with the frame)
    rip = [(3, 12), (4, 12), (13, 3)] if frame == 1 else [(10, 12), (11, 12), (3, 3)]
    for (x, y) in rip:
        a[y, x] = c("W0")
    return reduce_quads(a, [("W2", "W1"), ("W3", "W1")])


ST1, ST2 = stepping(1), stepping(2)
# On banks the quadrant also holds grass + bank: the foam/sheen folds away there.
STEP_RED = (("G0", "G1"), ("G2", "G1"), ("W2", "W1"), ("W3", "W1"), ("W0", "W1"))
for m in MASKS:
    emit(f"stepping_stones@{m}", shore4(ST1, m, 1, GRASS, "G3", reduce=STEP_RED))
    emit(f"stepping_stones@{m}__2", shore4(ST2, m, 2, GRASS, "G3", reduce=STEP_RED))
emit("stepping_stones", ST1)
emit("stepping_stones__2", ST2)

# --- bramble stump: what PRUNE leaves behind ----------------------------
# Same grass ground as bramble_bush, so a pruned cell sits naturally on grass,
# and paths edge round it exactly as they did round the bush.
emit("bramble_stump", reduce_quads(A([
    "................",
    "................",
    "........;.......",
    "................",
    "......,.........",
    "..,...#..,......",
    "..#.,.#..#.,....",
    "..#;#.#;.#.#....",
    ".;#;#;#;;#;#;...",
    "..;;;;;;;;;;;...",
    "....;;.#..;.....",
    "........#....#..",
    "............#...",
    "..#.............",
    "...#............",
    "................",
], {".": "G1", ";": "L2", "#": "X3", ",": "G0"}), [("G2", "G1")]))


# ======================================================================
# PALM HOUSE
# ======================================================================
tileset("palm_house", "tropical_grass", "palm_tree")

# --- tropical undergrowth: broad glossy leaves, swaying -----------------
TP_K = {".": "TP2", ",": "TP0", ":": "TP1", "#": "TP3"}
LEAF1 = [
    "...,:...",
    "..,::#..",
    ".,:::#..",
    ".,::#.:.",
    "..:#.,:#",
    ".#..,::#",
    "...#.:#.",
    "..#..#..",
]
LEAF2 = [
    "....,:..",
    "...,::#.",
    "..,:::#.",
    "..,::#:.",
    "..:#.,:#",
    ".#..,::#",
    "...#.:#.",
    "..#..#..",
]
TROP1 = A(T.quad(LEAF1, 4), TP_K)
TROP2 = A(T.quad(LEAF2, 4), TP_K)
emit("tropical_grass", TROP1)
emit("tropical_grass__2", TROP2)


def trop_edge(t, mask):
    ins = blob(mask, (1, 1, 1, 1), T.TUFT_PROF, 3)
    o_rim, i_nw, i_se = rims(ins, mask)
    a = np.where(ins, t, GRASS)
    a[o_rim & (a == c("G1"))] = c("G2")     # a soft contact shadow on the lawn
    a[i_se] = np.where(a[i_se] == c("TP2"), c("TP3"), a[i_se])
    return reduce_quads(a, [("G0", "G1"), ("G2", "G1"), ("TP0", "TP1")])


for m in MASKS:
    emit(f"tropical_grass@{m}", trop_edge(TROP1, m))
    emit(f"tropical_grass@{m}__2", trop_edge(TROP2, m))

# --- palm: a star of arching fronds on a ringed, leaning trunk ---------
# On lawn, like the Round-3 props; ringed by city paving it reads as a
# kerbed tree pit (the paving kerbs face it).
def palm() -> np.ndarray:
    import math
    a = GRASS.copy()
    a = np.where(a == c("G0"), c("G1"), a)
    # trunk: leans a little east as it rises, 2px, lit west / shaded east, rings
    for y in range(6, 15):
        x = 7 + (1 if y < 9 else 0)
        a[y, x] = c("O1")
        a[y, x + 1] = c("O2")
        if y % 2 == 0:
            a[y, x + 1] = c("O3")
    a[14, 6:11] = c("G2")
    a[14, 7] = c("O1"); a[14, 8] = c("O2")
    a[15, 6:10] = c("G2")
    cx, cy = 8.5, 5.0
    fronds = [(-175, 7.5, 0.55), (-140, 6.5, 0.35), (-100, 5.0, 0.1), (-60, 6.5, 0.35),
              (-15, 7.5, 0.55), (150, 6.0, 0.9), (35, 6.0, 0.9)]
    for ang, L, droop in fronds:
        r = math.radians(ang)
        lit = math.cos(r) < 0.2 and ang < 0
        for k in range(1, 26):
            t = k / 25
            x = cx + L * t * math.cos(r)
            y = cy + L * t * math.sin(r) + droop * 6 * t * t
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi < 16 and 0 <= yi < 16:
                a[yi, xi] = c("TP1" if lit else "TP2")
                if t > 0.25 and yi + 1 < 16 and t < 0.95:
                    if a[yi + 1, xi] in (c("G1"), c("G2")):
                        a[yi + 1, xi] = c("TP3")     # leaflets hang on the underside
    put(a, [" oo ", "oOOo", " oo "], {"o": "TP3", "O": "O2"}, 7, 4)    # crown heart + nuts
    return reduce_quads(a, [("G2", "G1"), ("O3", "O2"), ("TP1", "TP2"), ("O1", "O2")])


emit("palm_tree", palm())


# ======================================================================
# ROOT RELAY
# ======================================================================
tileset("relay", "cable_floor", "console", "server_rack", "sensor_post")

# --- cable floor: raised steel plates, one a grille over cable runs -----
CABLE = A([
    "%,,,,,,:%,,,,,,:",
    ",......:,......:",
    ",......:,......:",
    ",......:,......:",
    ",......:,......:",
    ",.....o:,......:",
    ",......:,......:",
    "::::::::::::::::",
    "%,,,,,,:%,,,,,,:",
    ",......:,......:",
    ",......:,.####.:",
    ",......:,.#gr#.:",
    ",......:,.#rr#.:",
    ",.o....:,.####.:",
    ",......:,......:",
    "::::::::::::::::",
], {",": "ST0", ".": "ST1", ":": "ST2", "%": "ST1", "o": "ST2", "#": "ST3", "g": "PH1", "r": "K1",
    "y": "Y2"})
CABLE[CABLE == c("K1")] = c("ST1")
CABLE = reduce_quads(CABLE, [("ST0", "ST1")])
emit("cable_floor", CABLE)
# alts: plain plates, and a plate lifted for a cable run (breaks up the vent grid)
_plain = CABLE.copy()
_plain[9:15, 9:15] = c("ST1")
_plain[13, 2] = c("ST1"); _plain[5, 6] = c("ST1"); _plain[12, 12] = c("ST2")
emit("cable_floor~1", _plain)
_run = _plain.copy()
_run[1:7, 9:15] = c("ST3")
_run[3, 9:15] = c("PH1"); _run[4, 9:15] = c("ST2"); _run[5, 10] = c("ST2")
emit("cable_floor~2", reduce_quads(_run, [("ST0", "ST1")]))

# --- console: angled listening screen over a key desk; trace scrolls ----
def console(frame: int) -> np.ndarray:
    a = A([
        "################",
        "#,,,,,,,,,,,,,,#",
        "#,::::::::::::.#",
        "#,::::::::::::.#",
        "#,::::::::::::.#",
        "#,::::::::::::.#",
        "#,::::::::::::.#",
        "#..............#",
        "################",
        "%,,,,,,,,,,,,,,%",
        "%,y.r.,.=====.,%",
        "%..............%",
        "%%%%%%%%%%%%%%%%",
        "%;;;;;;;;;;;;;;%",
        "%%%%%%%%%%%%%%%%",
        "................",
    ], {"#": "ST3", ",": "ST1", ":": "T3", ".": "ST2", "y": "Y1", "r": "K1", "=": "PH1",
        "%": "ST3", ";": "ST2"})
    # the waveform: one slow pulse travelling left to right
    wave = [4, 4, 4, 3, 2, 4, 5, 6, 4, 4, 4, 4]
    off = 0 if frame == 1 else 3
    for i in range(12):
        y = wave[(i - off) % 12] - 0
        a[y, 2 + i] = c("PH1")
    a[2, 12] = c("PH0") if frame == 1 else c("PH1")
    a[15, :] = CABLE[15, :]
    return reduce_quads(a, [("PH0", "PH1"), ("ST1", "ST2"), ("Y1", "PH1")])


emit("console", console(1))
emit("console__2", console(2))


# --- server rack: a bank of cabinets with blinking status lights ---------
def rack(frame: int) -> np.ndarray:
    a = A([
        "################",
        "#,,,,,,,,,,,,,,#",
        "#.====.=====...#",
        "#..............#",
        "#.====.=====...#",
        "#..............#",
        "#.====.=====...#",
        "#,,,,,,,,,,,,,,#",
        "#.====.=====...#",
        "#..............#",
        "#.====.=====...#",
        "#..............#",
        "#.::::::::::::.#",
        "################",
        "%%%%%%%%%%%%%%%%",
        "::::::::::::::::",
    ], {"#": "ST3", ",": "ST1", ".": "ST2", "=": "ST3", ":": "ST3", "%": "ST2"})
    on1 = [(13, 2), (12, 6), (13, 8)] if frame == 1 else [(12, 2), (13, 4), (12, 10)]
    on2 = [(12, 4), (13, 10)] if frame == 1 else [(13, 6), (12, 8)]
    for (x, y) in on1:
        a[y, x] = c("PH1")
    for (x, y) in on2:
        a[y, x] = c("Y1")
    a[15, :] = CABLE[15, :]
    return reduce_quads(a, [("Y1", "PH1")])


emit("server_rack", rack(1))
emit("server_rack__2", rack(2))

# --- sensor post: a brass listening head on a slab, set in the ground ----
# The slab fills the tile, so the post sits on lawn, paving or a lab floor.
emit("sensor_post", reduce_quads(A([
    ",,,,,,,,,,,,,,,.",
    ",..............:",
    ",....,yy,......:",
    ",...,yYYy,.....:",
    ",...yYqqYy.....:",
    ",...yYqqYy.....:",
    ",....yYYy......:",
    ",.....oo.:.....:",
    ",.....oo.::....:",
    ",.....oo.::....:",
    ",...###########:",
    ",...#:::::::::#:",
    ",...#:##:##:##::",
    ",...###########:",
    ",..............:",
    "::::::::::::::::",
], {",": "R0", ".": "R1", ":": "R2", "#": "R3", "y": "C1", "Y": "C2", "q": "Q1", "o": "R3"}),
    [("R0", "R1"), ("Q1", "C1")]))


# ======================================================================
# NURSERY
# ======================================================================
tileset("nursery", "seed_tray", "potting_bench")

# --- seed trays: wooden flats of seedlings; a run of them fills a bench --
SEED = A([
    "################",
    "#oooooooooooooo#",
    "#o::::::::::::::",
    "#o:v:v:v:v:v:v::",
    "#o::g:g:g:g:g:g:",
    "#o::::::::::::::",
    "#o:v:v:v:v:v:v::",
    "#o::g:g:g:g:g:g:",
    "#o::::::::::::::",
    "#o:v:v:v:v:v:v::",
    "#o::g:g:g:g:g:g:",
    "#o::::::::::::::",
    "################",
    "#o######o#######",
    "#o#    #o#     #",
    "###    ###     #",
], {"#": "O3", "o": "O1", ":": "D2", "v": "G1", "g": "G1", " ": "O3"})
# seedlings: a pair of seed leaves on a stem
SEED = reduce_quads(SEED, [])
emit("seed_tray", SEED)

# --- potting bench: pots, seedlings and a trowel on the top; stacked pots
# and a compost sack on the shelf below. It fills its tile, so it stands
# on a shed floor, the greenhouse floor or the yard lawn alike.
PB = A([
    "################",
    "#,,,g,g,,,,,,,,#",
    "#,,,,g,,,,,,,,,#",
    "#,,pp:pp,,,,,,,#",
    "#,,p:::p,,,,rr,#",
    "#,,,ppp,,,##r,,#",
    "#,,,,,,,,,,,,,,#",
    "################",
    "#oooooooooooooo#",
    "################",
    "#::pp::::sss:::#",
    "#:pPPp:::sSSSs:#",
    "#:pPPpp::SSSSs:#",
    "#::ppPPp:sSSS::#",
    "#:::pp:::::::::#",
    "################",
], {"#": "O3", ",": "O0", ".": "O1", "o": "O2", ":": "O3", "p": "C2", "P": "C1", "g": "G1",
    "r": "R1", "s": "D1", "S": "D2"})
emit("potting_bench", PB)


# ======================================================================
# ROSE CONSERVATORY
# ======================================================================
tileset("rose", "floor_marble", "stage_floor", "rose_bed", "rose_trellis")

# --- marble: cream slabs with soft veins and a slate cabochon at corners --
def marble(veins, cab="ST2"):
    a = fill("MB0")
    for (x, y) in veins:
        a[y % 16, x % 16] = c("MB1")
    a[0, :] = c("MB2")
    a[:, 0] = c("MB2")
    put(a, ["#", ], {"#": cab}, 0, 0)
    for (x, y) in ((1, 0), (15, 0), (0, 1), (0, 15)):
        a[y, x] = c(cab)
    a[1, 1] = c("MB2"); a[15, 15] = c("MB1"); a[1, 15] = c("MB2"); a[15, 1] = c("MB2")
    return a


def vein(x0, y0, steps):
    out, x, y = [], x0, y0
    for dx, dy in steps:
        x += dx
        y += dy
        out.append((x, y))
    return out


V_A = vein(3, 3, [(1, 1), (1, 0), (1, 1), (0, 1), (1, 1), (1, 1), (1, 0), (1, 1), (0, 1), (1, 1)])
V_B = vein(10, 2, [(-1, 1), (0, 1), (-1, 1), (-1, 1), (-1, 0), (-1, 1), (0, 1), (-1, 1)])
V_C = vein(4, 10, [(1, 0), (1, -1), (1, 0), (1, 1), (1, 0), (1, 0), (1, -1), (1, 0)])
emit("floor_marble", marble(V_A))
emit("floor_marble~1", marble(V_B))
emit("floor_marble~2", marble(V_C))
emit("floor_marble~3", marble(V_A[:5] + V_C[3:]))

# --- stage floor: polished cherry boards running up-stage (vertical, so
# it never reads as floor_wood or brick), a long lamp sheen on each board
def stage():
    a = np.zeros((16, 16), np.int16)
    joints = (3, 11, 7, 14)          # butt joint row per board (one per 16px run)
    for x in range(16):
        k = x % 4
        a[:, x] = c(("CH2", "CH1", "CH1", "CH1")[k])
        if k == 1:
            a[:, x] = c("CH0")
    for b, jy in enumerate(joints):
        x0 = b * 4
        a[jy, x0 + 1:x0 + 4] = c("CH2")
        a[(jy + 1) % 16, x0 + 1] = c("CH1")
    for (x, y) in ((2, 1), (6, 9), (10, 5), (14, 12)):
        a[y, x] = c("CH2")
    for (x, y) in ((3, 6), (3, 7), (11, 10), (11, 11), (7, 2), (15, 14)):
        a[y, x] = c("CH0")
    return a


emit("stage_floor", stage())

# --- rose bed: a stone-kerbed bed of standard roses (fills the tile) -----
emit("rose_bed", reduce_quads(A([
    ",,,,,,,,,,,,,,,.",
    ",dddddddddddddd:",
    ",dLrrLddLLrLLdd:",
    ",dLRrlLLrrLlLdd:",
    ",dLllLLLRrlLLLd:",
    ",dLLdLLlllLdLLd:",
    ",ddLLrrLLdLrrLd:",
    ",dlLRrlLddLRrld:",
    ",dLllLLLLLLllLd:",
    ",ddLLdLrrLLLddd:",
    ",dLrrLLRrlLdrrd:",
    ",dLRrlLlllLLRrd:",
    ",dLllLdLLLLllLd:",
    ",dddddddddddddd:",
    ",:::::::::::::::",
    ":::::::::::::::.",
], {",": "H0", ".": "H1", ":": "H2", "d": "D2", "L": "L2", "l": "G2", "r": "RO1", "R": "RO2"}),
    [("H1", "H0"), ("G2", "L2"), ("H2", "D2"), ("RO2", "RO1"), ("H0", "D2")]))


# --- rose trellis: white lattice smothered in climbing roses -------------
# Maze walls: a leafy top, and where the south side is open a lattice face
# showing through the leaves, with blooms. Corners show the marble floor.
def _leafy(seed_off=0):
    a = T.clumps(T.HEDGE_CENTERS, 3.6, "G2", "G1", "L2")   # tiles' palette == ours
    a = np.where(a == c("G1"), c("G2"), np.where(a == c("G2"), c("L2"), c("L3")))
    for (x, y) in ((3, 2), (11, 5), (6, 10), (14, 13), (1, 13), (9, 0)):
        x = (x + seed_off) % 16
        put(a, [" r", "rR"], {"r": "RO1", "R": "RO2"}, x, y)
    return a


TRELLIS_TOP = np.roll(reduce_quads(_leafy(), [("RO2", "RO1")]), (6, 1), axis=(0, 1))
# Continue this leaf shadow through the wrap; do not add a lattice border.
TRELLIS_TOP[15, 0] = TRELLIS_TOP[0, 0]
TRELLIS_FACE = fill("L3", 16, 8)
for y in range(8):
    for x in range(16):
        if (x + y) % 4 == 0 or (x - y) % 4 == 0:
            TRELLIS_FACE[y, x] = c("T0")
put(TRELLIS_FACE, [
    "LL  L LLL  LL L ",
    "LrL LLrRL LLL LL",
    " RL  LL   LrL  L",
    "  L   L    RL   ",
], {"L": "G2", "r": "RO1", "R": "RO2"}, 0, 0)
TRELLIS_FACE[7, :] = c("L3")


def rose_trellis(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = TRELLIS_TOP.copy()
    floor = kit.TILES_FLOOR if hasattr(kit, "TILES_FLOOR") else None  # noqa: F841
    if not s:
        a[8:16] = TRELLIS_FACE
        a[15, :] = c("L3")
        # trellis posts at the open ends
        if not w:
            a[8:15, 0] = c("T0"); a[8:15, 1] = c("R1")
        if not e:
            a[8:15, 15] = c("R1"); a[8:15, 14] = c("T0")
    if not n:
        a[0, :] = c("L3")
        a[1, :] = np.where(a[1, :] == c("L3"), c("L2"), a[1, :])
    if not w:
        a[:8 if not s else 16, 0] = c("L3")
    if not e:
        a[:8 if not s else 16, 15] = c("L3")
    # rounded outer corners show the marble floor
    fl = "MB0"
    for open_a, open_b, ys, xs in ((not n, not w, [0, 0, 1], [0, 1, 0]),
                                   (not n, not e, [0, 0, 1], [15, 14, 15]),
                                   (not s, not w, [15, 15, 14], [0, 1, 0]),
                                   (not s, not e, [15, 15, 14], [15, 14, 15])):
        if open_a and open_b:
            a[ys, xs] = c(fl)
    return reduce_quads(a, [("RO2", "RO1"), ("R1", "T0"), ("G2", "L2"), ("MB0", "L3")])


for m in MASKS:
    emit(f"rose_trellis@{m}", rose_trellis(m))
emit("rose_trellis", rose_trellis(10))


def check() -> dict[str, int]:
    return {f"{tid}/{k}": kit.quad_counts(a) for tid, d in TILESETS.items() for k, a in d.items()
            if kit.quad_counts(a) > 4}


def keys() -> dict[str, str]:
    """tile key -> tileset id."""
    from artkit.sheets import parse_stem
    out = {}
    for tid, d in TILESETS.items():
        for stem in d:
            out.setdefault(parse_stem(stem)[0], tid)
    return out
