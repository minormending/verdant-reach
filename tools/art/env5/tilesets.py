"""Chapter 5 tiles, grouped into three themed tilesets.

  oldgrowth  oldgrowth_tree (canopy group), moss (alts), fern_brush (2-frame),
             canopy_boardwalk / canopy_drop / rope_rail (the high walkway,
             each autotiled)
  burnt      ash (alts + edges that thin onto char soil), burnt_trunk,
             charred_log, fresh_shoots (2-frame)
  hollow     shrine_floor (alts), hollow_wall (autotiled), carved_post,
             ghostpipe_clump, glow_pipe (2-frame), night_floor (alts)

Every tile keeps <=4 colours per 8x8 quadrant (`check`). Light comes from the
top-left; edges are dark hue-shifted ramps, never black outlines.

Ground pairings (tiles here have no transparent pixels, so each prop carries
the ground it stands on):
  moss       under oldgrowth_tree, fern_brush gaps
  char soil  under burnt_trunk, charred_log, fresh_shoots, and outside ash
             edges, so ash drifts meet every burnt prop seamlessly
  heartwood  under carved_post, ghostpipe_clump, glow_pipe
"""

from __future__ import annotations

import math

import numpy as np

import kit
from kit import MASKS, blob, c, fill, pad_same, put, reduce_quads, rims, sides

TILESETS: dict[str, dict[str, np.ndarray]] = {}
ORDER: dict[str, list[str]] = {}
NAMES_OF = {"oldgrowth": "Old Growth", "burnt": "Burnt Stand", "hollow": "The Hollow"}
_cur: dict[str, np.ndarray] = {}


def tileset(tid: str, *keys: str):
    global _cur
    _cur = TILESETS.setdefault(tid, {})
    ORDER[tid] = list(keys)


def emit(stem: str, a: np.ndarray):
    assert a.shape == (16, 16), stem
    _cur[stem] = a.astype(np.int16).copy()


def wrap(a: np.ndarray, x: int, y: int, col: str):
    a[y % 16, x % 16] = c(col)


# ======================================================================
# OLD GROWTH (Route 6, Cedarhallow)
# ======================================================================
tileset("oldgrowth", "moss", "fern_brush", "oldgrowth_tree", "canopy_boardwalk", "canopy_drop", "rope_rail")


# --- moss: a calm, deep floor; a few low cushions catch the light -------
BUMPS = {  # , lit crown, . cushion, : shaded flank, # crevice beneath
    "s": [" .. ", ".::.", " ## "],
    "m": [" ,.. ", ".:::.", ":::::", " ### "],
    "l": ["  ,..  ", " ,.:::.", ".::::::", "::::::#", " ##### "],
}


def moss(bumps, deep=()) -> np.ndarray:
    """Flat moss body with a few cushions: a light dome on top, a shadow
    lip below (wrapping, so the tile is seamless)."""
    a = fill("MS1")
    for (kind, x0, y0) in bumps:
        for j, row in enumerate(BUMPS[kind]):
            for i, ch in enumerate(row):
                col = {",": "MS0", ".": "MS1", ":": "MS2", "#": "MS3"}.get(ch)
                if col:
                    wrap(a, x0 + i, y0 + j, col)
    for (x, y) in deep:
        wrap(a, x, y, "MS3")
    return a


MOSS = moss([("l", 1, 2), ("s", 10, 10)], [(13, 4)])
MOSS_ALTS = [
    moss([("m", 9, 1), ("s", 2, 11)], [(5, 6)]),
    moss([("s", 3, 4), ("l", 8, 9)], [(14, 1)]),
    moss([("m", 1, 9)], [(11, 4), (12, 13)]),
]
MOSS_ALTS = [reduce_quads(m, [("MS3", "MS2"), ("MS0", "MS1"), ("CB2", "CB1"), ("GP2", "MS2")]) for m in MOSS_ALTS]
emit("moss", MOSS)
for i, m in enumerate(MOSS_ALTS, 1):
    emit(f"moss~{i}", m)


# --- sword ferns: one arching rosette per tile, moss in the corners -------
def line(p0, p1):
    """Bresenham pixels from p0 to p1 (inclusive)."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err, out = dx + dy, []
    while True:
        out.append((x0, y0))
        if (x0, y0) == (x1, y1):
            return out
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def polyline(pts):
    out = []
    for p0, p1 in zip(pts, pts[1:]):
        for p in line(p0, p1):
            if not out or out[-1] != p:
                out.append(p)
    return out


# Sword-fern fronds as hand-placed polylines from the crown (a fountain:
# up and out, tips drooping). Back fronds first.
FRONDS = [
    [(6, 12), (4, 11), (2, 10), (1, 10), (0, 11)],                       # low left
    [(7, 12), (5, 9), (3, 8), (1, 7), (0, 8)],                           # mid left
    [(8, 12), (10, 9), (12, 8), (14, 7), (15, 8)],                       # mid right
    [(9, 12), (11, 11), (13, 10), (14, 10), (15, 11)],                   # low right
    [(7, 12), (6, 10), (5, 8), (4, 6), (3, 5), (2, 4), (1, 4), (0, 5)],  # high left
    [(8, 12), (9, 10), (10, 8), (11, 6), (12, 5), (13, 4), (14, 4), (15, 5)],  # high right
    [(8, 12), (8, 9), (7, 6), (7, 4), (8, 2), (9, 1), (10, 1), (11, 2)],  # centre, tip bowing east
]


def fern(frame: int) -> np.ndarray:
    a = fill("MS1")
    for (x, y, col) in ((1, 1, "MS0"), (2, 1, "MS0"), (3, 2, "MS2"), (14, 1, "MS2"), (13, 14, "MS0"),
                        (14, 14, "MS0"), (15, 15, "MS2"), (1, 14, "MS2")):
        a[y, x] = c(col)
    for pts in FRONDS:
        pts = list(pts)
        if frame == 2:     # the breeze nudges each frond's outer third
            n = len(pts)
            pts = [(x + (1 if i >= n - 3 else 0), y) for i, (x, y) in enumerate(pts)]
        px = polyline(pts)
        for i, (x, y) in enumerate(px):
            if not (0 <= x < 16 and 0 <= y < 16):
                continue
            a[y, x] = c("FN1")
            # pinnae: alternate sides; the upper (sunlit) side is light
            if i >= 1:
                (x0, y0) = px[i - 1]
                dx, dy = x - x0, y - y0
                nx, ny = dy, -dx               # perpendicular, pointing "up" for east-going fronds
                if ny > 0 or (ny == 0 and nx > 0):
                    nx, ny = -nx, -ny
                up = (x + nx, y + ny)
                dn = (x - nx, y - ny)
                if i % 2 == 0 and 0 <= up[0] < 16 and 0 <= up[1] < 16:
                    a[up[1], up[0]] = c("FN0")
                elif i % 2 == 1 and 0 <= dn[0] < 16 and 0 <= dn[1] < 16 and a[dn[1], dn[0]] != c("FN0"):
                    a[dn[1], dn[0]] = c("FN1")
    # shadow under the crown and the low fronds
    for (x, y) in ((5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13), (6, 14), (7, 14), (8, 14), (9, 14),
                   (3, 12), (4, 12), (12, 12), (11, 12), (1, 12), (14, 12)):
        if a[y, x] in (c("MS1"), c("MS0"), c("MS2")):
            a[y, x] = c("MS3")
    return reduce_quads(a, [("MS0", "MS1"), ("MS2", "MS3")])


emit("fern_brush", fern(1))
emit("fern_brush__2", fern(2))


# --- old-growth canopy: tiers of drooping cedar/fir sprays ------------------
BOUGH = [  # one drooping spray, stamped in staggered tiers (h lit, b body, m shade, d deep)
    "  hhbb  ",
    " hhbbbb ",
    "hhbbbbbm",
    "bbbbmbbm",
    "mbmmdmmd",
    "d dm  d ",
]


def tiers() -> np.ndarray:
    """Seamless canopy texture: tiers of drooping sprays (8 wide, a tier
    every 4 rows, staggered), lit on top, deep shade in the gaps. Drawn top
    to bottom on a tall strip (each lower tier in front), then a 16-row
    window is cut, so the overlap order is the same across tile seams."""
    a = fill("FR3", 16, 48)
    key = {"h": "FR0", "b": "FR1", "m": "FR2", "d": "FR3"}
    for row in range(12):
        y0 = row * 4 - 1
        off = 0 if row % 2 == 0 else 4
        for i in range(2):
            x0 = off + i * 8
            for j, r in enumerate(BOUGH):
                for k, ch in enumerate(r):
                    if ch != " " and 0 <= y0 + j < 48:
                        a[y0 + j, (x0 + k) % 16] = c(key[ch])
    return a[16:32].copy()


TIERS = tiers()  # shared structure texture keeps its original registration
JOINED_TIERS = np.roll(TIERS, (2, 1), axis=(0, 1))
# Choose a cut through the overlapping sprays, then continue the two matching
# 8px boughs through it. This retains their smaller repeat, not a 16px border.
JOINED_TIERS[2::8, 0::8] = c("FR1")
# fir-tip silhouette along an open north edge (inset per column, 16 wide)
TIPS_N = [3, 2, 1, 2, 3, 3, 2, 0, 1, 2, 3, 2, 1, 2, 3, 3]
SIDE_W = [2, 1, 1, 2, 2, 1, 0, 1, 2, 2, 1, 1, 2, 1, 1, 2]
SIDE_E = [1, 2, 2, 1, 1, 2, 2, 1, 0, 1, 2, 2, 1, 1, 2, 2]
HEM_S = [8, 8, 7, 7, 7, 7, 8, 8, 7, 7, 7, 7, 8, 8, 8, 8]   # canopy bottom row on an open south


def cedar_trunk(a: np.ndarray, x0: int, top: int, w: int = 7):
    """A massive fluted red-cedar trunk from `top` to the tile foot,
    flaring into buttress roots; lit west edge, shaded east edge."""
    for y in range(top, 16):
        flare = max(0, y - 12)
        xl, xr = x0 - flare, x0 + w - 1 + flare
        for x in range(xl, xr + 1):
            u = (x - xl) / max(1, xr - xl)
            col = "CB1"
            if x == xl:
                col = "CB0"
            elif u > 0.78:
                col = "CB3"
            elif (x - x0) % 3 == 1 and y > top + 1:
                col = "CB2"                      # bark fluting
            a[y, x] = c(col)
        if xr + 1 < 16:
            a[y, xr + 1] = c("MS3")              # shadow falls east
    a[top, x0:x0 + w] = c("CB3")                  # canopy shade on the trunk
    a[top + 1, x0 + 1:x0 + w] = c("CB2")


def oldgrowth(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    ins = np.ones((16, 16), bool)
    for x in range(16):
        if not n:
            ins[:TIPS_N[x], x] = False
        if not s:
            ins[HEM_S[x]:, x] = False
    for y in range(16):
        if not w:
            ins[y, :SIDE_W[y]] = False
        if not e:
            ins[y, 16 - SIDE_E[y]:] = False
    # round off the open outer corners
    for (oa, ob, xs, ys) in ((not n, not w, range(0, 4), range(0, 4)), (not n, not e, range(12, 16), range(0, 4)),
                             (not s, not w, range(0, 4), range(5, 12)), (not s, not e, range(12, 16), range(5, 12))):
        if oa and ob:
            for y in ys:
                for x in xs:
                    cx = 3.5 if x < 8 else 12.5
                    cy = 3.5 if y < 8 else (HEM_S[x] - 4.5)
                    if (x - cx) ** 2 + (y - cy) ** 2 > 16 and ((x < 4) == (cx < 8)):
                        ins[y, x] = False
    a = np.where(ins, JOINED_TIERS, MOSS)
    o_rim, i_nw, i_se = rims(ins, mask)
    a[i_se] = c("FR3")
    a[i_nw & (a == c("FR2"))] = c("FR3")
    # dark moss where the canopy shades the floor (south and east)
    p = pad_same(ins, mask)
    shade = ~ins & (p[0:16, 1:17] | p[1:17, 0:16])
    a[shade] = c("FR3")
    if not s:
        cedar_trunk(a, 4, 8, 8)
    return reduce_quads(a, [("MS0", "MS1"), ("MS2", "MS1"), ("MS3", "FR3"), ("FR0", "FR1"), ("CB2", "CB3"),
                            ("CB0", "CB1"), ("FR2", "FR3")])


for m in MASKS:
    emit(f"oldgrowth_tree@{m}", oldgrowth(m))
emit("oldgrowth_tree", oldgrowth(0))


# --- the misty drop: the forest floor far below the walkway --------------
def far_crowns(centers, mist) -> np.ndarray:
    """Treetops seen from high above, swallowed by haze: small round crowns
    (lit top-left, a dark crescent bottom-right) on a deep ground, and a
    few soft wisps of mist drifting over them."""
    own = -np.ones((16, 16), int)
    for k, (cx, cy, r) in enumerate(centers):
        for y in range(16):
            for x in range(16):
                dx = (x - cx + 8) % 16 - 8
                dy = (y - cy + 8) % 16 - 8
                if dx * dx + dy * dy <= r * r:
                    own[y, x] = k
    a = fill("MD3")
    for y in range(16):
        for x in range(16):
            k = own[y, x]
            if k < 0:
                continue
            cx, cy, r = centers[k]
            dx = (x - cx + 8) % 16 - 8
            dy = (y - cy + 8) % 16 - 8
            a[y, x] = c("MD1" if dx + dy < -r * 0.6 else "MD2")
            if own[(y + 1) % 16, x] != k and dx > -1:
                a[y, x] = c("MD3")
    for (x, y, n) in mist:
        for i in range(n):
            wrap(a, x + i, y, "MD0" if 0 < i < n - 1 else "MD1")
    return a


DROP = far_crowns([(3, 3, 2.6), (11, 2, 2.2), (7, 9, 2.8), (14, 10, 2.2), (2, 13, 2.0), (11, 15, 1.8)],
                  [(8, 5, 6), (13, 13, 6), (0, 7, 3)])


def canopy_drop(mask: int) -> np.ndarray:
    """The drop is solid: open sides get a shadow lip (the deck or ground
    above throws shade into the haze; light from the top-left)."""
    n, e, s_, w = sides(mask)
    a = DROP.copy()
    if not n:
        a[0:2, :] = c("MD3")
        a[2, :] = np.where(a[2, :] == c("MD1"), c("MD2"), a[2, :])
    if not w:
        a[:, 0] = c("MD3")
    if not e:
        a[:, 15] = c("MD3")
    return a


for m in MASKS:
    emit(f"canopy_drop@{m}", canopy_drop(m))
emit("canopy_drop", DROP)


# --- canopy walkway: continuous weathered silver plank courses ------------
def deck(horiz: bool) -> np.ndarray:
    a = np.zeros((16, 16), np.int16)
    for y in range(16):
        for x in range(16):
            u = x if horiz else y               # across-plank coordinate
            v = y if horiz else x               # along-plank coordinate
            k = (u + 2) % 4  # shared boundary falls within a plank
            col = ("WP0", "WP1", "WP1", "WP3")[k]
            if k == 2 and v % 8 == (6 if (u // 4) % 2 else 2):
                col = "WP2"                     # a nail head / weathered split
            if k == 1 and (u // 4 + v) % 11 == 3:
                col = "WP2"                     # grain
            a[y, x] = c(col)
    return a


DECK_V, DECK_H = deck(False), deck(True)


def canopy_boardwalk(mask: int) -> np.ndarray:
    n, e, s_, w = sides(mask)
    a = DECK_V.copy()  # continuous courses through corners and junctions
    # the deck's edge beams on open sides; the south beam shows its depth
    if not n:
        a[0, :] = c("WP3")
    if not s_:
        a[13, :] = c("WP1")
        a[14, :] = c("WP2")
        a[15, :] = c("WP3")
    if not w:
        a[:, 0] = c("WP3")
        a[:, 1] = np.where(a[:, 1] == c("WP3"), c("WP3"), c("WP2"))
    if not e:
        a[:, 15] = c("WP3")
        a[:, 14] = np.where(a[:, 14] == c("WP0"), c("WP1"), a[:, 14])
    return a


for m in MASKS:
    emit(f"canopy_boardwalk@{m}", canopy_boardwalk(m))
emit("canopy_boardwalk", canopy_boardwalk(5))


# --- rope rail: cedar posts with a hemp rope between them, on the deck -----
POST = [  # 5 x 9: lit cap, body lit west / shaded east, contact shadow
    " ccc ",
    "cCCCs",
    "lbbbs",
    "lbbbs",
    "lbbbs",
    "lbbbs",
    "lbbbs",
    "lbbbs",
    " sss ",
]


def rope_rail(mask: int) -> np.ndarray:
    n, e, s_, w = sides(mask)
    vert = (n or s_) and not (e or w)
    a = (DECK_V if vert else DECK_H).copy()
    if mask == 0:
        a = DECK_V.copy()
    rope = "RP0"
    # the deck under the rail lies in the rail's shade
    a[a == c("WP0")] = c("WP1")
    # rope toward each same-group neighbour (sagging on horizontal runs)
    if n:
        a[0:5, 8] = c(rope)
        a[0:5, 9] = c("WP3")
    if s_:
        a[5:16, 8] = c(rope)
        a[6:16, 9] = c("WP3")                   # its shadow on the planks
    for side, xs in ((w, range(0, 7)), (e, range(10, 16))):
        if side:
            for x in xs:
                d = min(abs(x - 7.5), 8) / 8.0
                y = 4 + int(round((1 - d) * 2.4))     # sag low midway between posts
                a[y, x] = c(rope)
                a[y + 1, x] = c("WP3")
    put(a, POST, {"c": "RP0", "C": "WP1", "l": "WP1", "b": "WP2", "s": "WP3"}, 6, 2)
    a[3, 7:10] = c("RP0")                       # the rope's lashing over the post top
    return reduce_quads(a, [("WP0", "WP1")])


for m in MASKS:
    emit(f"rope_rail@{m}", rope_rail(m))
emit("rope_rail", rope_rail(5))


# ======================================================================
# BURNT STAND
# ======================================================================
tileset("burnt", "ash", "burnt_trunk", "charred_log", "fresh_shoots")


# --- char soil: the burnt earth under the ash (ground of every burnt prop) --
def char_soil(specks) -> np.ndarray:
    a = fill("CS1")
    for (x, y, col) in specks:
        wrap(a, x, y, col)
    return a


CHAR = char_soil([(3, 2, "CS2"), (4, 2, "CS2"), (11, 4, "CS0"), (7, 8, "CS2"), (14, 11, "CS2"), (15, 11, "CS2"),
                  (2, 12, "CS0"), (9, 14, "CS2")])


# --- ash: soft pale drifts, flecked with embers -------------------------------
DRIFTS = {
    "s": [" ,, ", ",..:", " :: "],
    "m": [" ,,, ", ",...:", " ::: "],
    "l": ["  ,,,  ", " ,....:", ",.....:", " ::::: "],
}


def ash(drifts, bits=()) -> np.ndarray:
    a = fill("AS1")
    for (kind, x0, y0) in drifts:
        for j, row in enumerate(DRIFTS[kind]):
            for i, ch in enumerate(row):
                if ch == ",":
                    wrap(a, x0 + i, y0 + j, "AS0")
                elif ch == ":":
                    wrap(a, x0 + i, y0 + j, "AS2")
    for (x, y, col) in bits:
        wrap(a, x, y, col)
    return a


ASH = ash([], [(3, 4, "AS2"), (12, 11, "AS2"), (13, 11, "AS0")])
ASH_ALTS = [
    ash([("m", 9, 9)], [(12, 2, "EM1"), (13, 2, "EM0"), (12, 3, "EM1"), (3, 6, "AS2")]),
    ash([("s", 4, 10)], [(10, 3, "CS2"), (11, 4, "CS2"), (12, 4, "CS2"), (13, 5, "CS2")]),       # a charcoal twig
    ash([("m", 1, 1), ("s", 10, 12)], [(12, 6, "EM1")]),
]
ASH_ALTS = [reduce_quads(m, [("AS0", "AS1"), ("EM0", "EM1")]) for m in ASH_ALTS]


def ash_edge(mask: int) -> np.ndarray:
    """Ash thins onto the char soil on open sides (a soft, wobbling drift
    line), so it meets every burnt prop (trunks, logs, shoots) cleanly."""
    ins = blob(mask, (2, 2, 2, 2), kit.T.TUFT_PROF, 3)
    o_rim, i_nw, i_se = rims(ins, mask)
    a = np.where(ins, ASH, CHAR)
    a[o_rim] = c("CS2")
    a[i_se] = c("AS2")
    a[i_nw & (a == c("AS1"))] = c("AS0")
    return reduce_quads(a, [("CS0", "CS1"), ("AS0", "AS1"), ("CS2", "CS1"), ("AS2", "AS1")])


emit("ash", ASH)
for i, m in enumerate(ASH_ALTS, 1):
    emit(f"ash~{i}", m)
for m in MASKS:
    emit(f"ash@{m}", ash_edge(m))


# --- burnt trunk: a black snag, its bark cracked silver; a thin pole behind --
SNAG = [  # k black bark, d char, s silver lit side, S bright crack, ' ' soil
    "     k          ",
    "    sk     k    ",
    "    sdk    sk   ",
    " k  sdk    sk   ",
    "  k Sdk    sk   ",
    "   kSdkk  ksk   ",
    "    sdk kk sk   ",
    "    Sdkk   Sk   ",
    "    sddk   sk   ",
    "   sSdkk   sk   ",
    "   sddkk   sdk  ",
    "   Sdddk  sSdk  ",
    "  ssdddkk  kkk  ",
    " sSdddddkk      ",
    "  kkkkkkkkk     ",
    "                ",
]


def burnt_trunk() -> np.ndarray:
    a = CHAR.copy()
    a[a == c("CS0")] = c("CS1")
    put(a, SNAG, {"k": "CS3", "d": "CS2", "s": "AS2", "S": "AS0"}, 0, 0)
    return reduce_quads(a, [("CS2", "CS3")])


emit("burnt_trunk", burnt_trunk())


# --- charred log: alligatored char, a cut end with rings, one live ember -----
LOG = [  # s lit ridge, k char, x crack, r end-grain, o end rim, e ember, d contact shadow
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
    "   ssssssssssss ",
    "  oskkxkkkkxkkks",
    " orokkkxkkkkxkkk",
    " orrokkkkxkkkkxk",
    " orrokkxkkkkxkkk",
    " oorokkkkxkkekkk",
    "  ookkkkkkkkkkk ",
    "   dddddddddddd ",
    "                ",
    "                ",
    "                ",
]


def charred_log() -> np.ndarray:
    a = CHAR.copy()
    a[a == c("CS0")] = c("CS1")
    put(a, LOG, {"s": "AS2", "k": "CS3", "x": "CS2", "o": "AS2", "r": "CS1", "e": "EM1", "d": "CS2"}, 0, 0)
    return reduce_quads(a, [("CS1", "CS2"), ("AS2", "CS2")])


emit("charred_log", charred_log())


# --- fresh shoots: fireweed coming back green through the ash ---------------
SHOOTS = [  # (x of stem, top y)
    (2, 6), (6, 3), (10, 7), (13, 2), (8, 11), (1, 12), (14, 10),
]


def fresh_shoots(frame: int) -> np.ndarray:
    a = CHAR.copy()
    a[a == c("CS0")] = c("CS2")
    for i, (x, top) in enumerate(SHOOTS):
        h = 6 if top < 10 else 4
        for y in range(top, min(16, top + h)):
            a[y % 16, x] = c("N3")                 # the reddish stem
        sway = (1 if (i + frame) % 2 else 0) if frame == 2 else 0
        # lance leaves, alternate, pointing up and out; the lit one west
        for k, y in enumerate(range(top, min(16, top + h - 1), 2)):
            if k % 2 == 0:
                wrap(a, x - 1 + sway, y, "G0")
                wrap(a, x - 2 + sway, y - 1, "G0")
                wrap(a, x - 1 + sway, y - 1, "G1")
            else:
                wrap(a, x + 1 + sway, y, "G1")
                wrap(a, x + 2 + sway, y - 1, "G1")
                wrap(a, x + 1 + sway, y - 1, "G0")
        wrap(a, x + sway, top - 1, "G0")           # the bud tip
        wrap(a, x + sway, top, "G1")
    return reduce_quads(a, [("CS2", "CS1")])


emit("fresh_shoots", fresh_shoots(1))
emit("fresh_shoots__2", fresh_shoots(2))


# ======================================================================
# THE HOLLOW (and Conservatory 4's slate)
# ======================================================================
tileset("hollow", "shrine_floor", "carved_post", "ghostpipe_clump", "glow_pipe", "night_floor", "hollow_wall")


# --- shrine floor: the heartwood itself, its growth rings worn smooth -------
def heartwood(phase=0.0, extra=()) -> np.ndarray:
    a = fill("HW1")
    for k in range(4):
        for x in range(16):
            y = 4 * k + 1 + int(round(1.3 * math.sin(2 * math.pi * x / 16 + k * 1.7 + phase)))
            wrap(a, x, y, "HW2")
            if (x + k) % 5 == 0:
                wrap(a, x, y - 1, "HW0")            # worn polish just above a ring
    for (x, y, col) in extra:
        wrap(a, x, y, col)
    return a


SHRINE = heartwood()
SHRINE_ALTS = [
    heartwood(0.0, [(9, 6, "HW3"), (10, 7, "HW3"), (10, 8, "HW3"), (11, 9, "HW3"), (11, 10, "HW3")]),  # a check
    heartwood(0.0, [(4, 9, "HW2"), (5, 8, "HW2"), (6, 8, "HW2"), (7, 9, "HW2"), (6, 10, "HW2"), (5, 10, "HW2"),
                    (5, 9, "HW3"), (6, 9, "HW3")]),   # a knot
]
emit("shrine_floor", SHRINE)
for i, m in enumerate(SHRINE_ALTS, 1):
    emit(f"shrine_floor~{i}", m)
FLOOR_PLAIN = SHRINE.copy()
FLOOR_PLAIN[FLOOR_PLAIN == c("HW0")] = c("HW1")


# --- hollow wall: the living trunk around you; fibrous red wood -------------
def fibres(x0=0) -> np.ndarray:
    a = fill("CB1")
    for x in range(16):
        k = (x + x0) % 5
        if k == 0:
            a[:, x] = c("CB2")                       # deep fluting
        elif k == 1:
            a[:, x] = c("CB0") if (x + x0) % 10 == 1 else c("CB1")
    for (x, y) in ((3, 4), (3, 5), (8, 10), (8, 11), (13, 2), (13, 3), (13, 4)):
        a[y, x] = c("CB2")                           # split fibres
    return a


WALL_FACE = fibres()


def hollow_wall(mask: int) -> np.ndarray:
    n, e, s_, w = sides(mask)
    if not s_:
        a = WALL_FACE.copy()
        a[13, :] = c("CB2")
        a[14:16, :] = c("CB3")                       # the foot of the wall, in its own shade
        a[14, ::3] = c("CB2")
        if not n:
            a[0, :] = c("CB3")
            a[1, :] = c("CB2")
        if not w:
            a[:13, 0] = c("CB2")
        if not e:
            a[:13, 15] = c("CB3")
        return a
    a = fill("CB3")                                  # the wall seen from above: deep heartwood
    for (x, y) in ((2, 3), (3, 3), (9, 6), (10, 6), (11, 6), (5, 11), (6, 11), (13, 13), (14, 13)):
        a[y, x] = c("HW3")
    if not n:
        a[0, :] = c("CB1"); a[1, :] = c("CB2")
    if not w:
        a[:, 0] = c("CB1"); a[:, 1] = c("CB2")
    if not e:
        a[:, 15] = c("CB2")
    return reduce_quads(a, [("HW3", "CB2")])


for m in MASKS:
    emit(f"hollow_wall@{m}", hollow_wall(m))
emit("hollow_wall", hollow_wall(11))


# --- carved post: a cedar shrine post with a little offering ledge ----------
CARVED = [  # l lit, b body, d groove/shade, L ledge lit, c cone offering, f floor shade
    "      lbbb      ",
    "     lbbbbd     ",
    "     ldddd d    ",
    "     lbbbbd     ",
    "     lblbbd     ",
    "     llbbbd     ",
    "     lblbbd     ",
    "     lbbbbd     ",
    "     ldddd d    ",
    "     lbbbbd     ",
    "  LLLLLLLLLLLL  ",
    "  lbbbbbbbbbbd  ",
    "   dddcc ccddd  ",
    "    lbbbbbbd d  ",
    "    lbbbbbbdd   ",
    "     ddddddd    ",
]
CONES = [  # two fir cones and a sprig laid on the ledge
    "  cc  ",
    " cCCc ",
]


def carved_post() -> np.ndarray:
    a = FLOOR_PLAIN.copy()
    put(a, CARVED, {"l": "CB0", "b": "CB1", "d": "CB3", "L": "CB0", "c": "CB3"}, 0, 0)
    # a carved fern frond running up the post's face (no faces: a leaf)
    for (x, y) in ((7, 3), (8, 4), (7, 5), (8, 6), (7, 7)):
        a[y, x] = c("CB3")
    put(a, CONES, {"c": "CB3", "C": "CB2"}, 5, 8)
    return reduce_quads(a, [("HW2", "HW1"), ("HW0", "HW1"), ("CB2", "CB3")])


emit("carved_post", carved_post())


# --- ghost pipes: waxy white stems with nodding bells, from dark litter ------
# Each pipe: a 1px waxy stem (light west, shade east) and a bell that nods
# over; the clump stands in a little scatter of dark cedar litter.
PIPES = [  # (stem x, top y, height, nod: -1 west / 1 east)
    (4, 5, 8, -1), (6, 3, 10, 1), (9, 4, 9, 1), (11, 6, 7, 1), (7, 7, 6, -1),
]
LITTER = [(2, 12), (3, 13), (4, 14), (5, 13), (8, 14), (9, 13), (10, 14), (12, 13), (13, 12), (11, 12),
          (6, 14), (7, 13), (3, 11), (12, 14)]


def ghost_pipes(glow: int) -> np.ndarray:
    """glow 0: unlit decoration; 1/2: the foxfire shimmer, two frames."""
    a = FLOOR_PLAIN.copy()
    a[a == c("HW2")] = c("HW1")
    for (x, y) in LITTER:
        a[y, x] = c("HW3")
    lit, body, shade = ("T0", "GL0", "GL1") if glow else ("T0", "GP1", "GP2")
    if glow:
        # a soft halo on the floor around the clump; it shimmers between frames
        for y in range(1, 15):
            for x in range(1, 15):
                d = math.hypot((x - 7.5) / 6.5, (y - 8.5) / 6.5)
                if 0.78 < d < 1.0 and (x + y + glow) % 2 == 0:
                    a[y, x] = c("GL1")
    for (x, top, h, nod) in PIPES:
        for y in range(top + 2, top + h):
            a[y, x] = c(body)
            if (y + x) % 3 == 0:
                a[y, x] = c(lit)
        # the bell hooks over: crown, cap and a shaded rim
        a[top + 1, x] = c(lit)
        a[top, x + nod] = c(lit)
        a[top + 1, x + nod] = c(body)
        a[top + 2, x + nod] = c(shade)
        a[top + 2, x + 2 * nod] = c(shade)
        a[top + h - 1, x] = c("HW3")                # where it pushes out of the litter
    return reduce_quads(a, [("HW0", "HW1"), ("HW2", "HW1"), ("GL1", "GL0"), ("GP2", "GP1")])


emit("ghostpipe_clump", ghost_pipes(0))
emit("glow_pipe", ghost_pipes(1))
emit("glow_pipe__2", ghost_pipes(2))


# --- night floor: Conservatory 4's dark slate flags --------------------------
def slabs(layout, specks=()) -> np.ndarray:
    """Big slate flags: a faint lit lip on the top/left, dark joints."""
    a = fill("NS3")
    for (x0, y0, sw, sh) in layout:
        for j in range(sh - 1):
            for i in range(sw - 1):
                col = "NS2"
                if j == 0 and 0 < i < sw - 3:
                    col = "NS1"
                elif i == 0 and 0 < j < sh - 3:
                    col = "NS1"
                wrap(a, x0 + i, y0 + j, col)
    for (x, y, col) in specks:
        wrap(a, x, y, col)
    return a


NIGHT_FLOOR = slabs([(0, 0, 11, 7), (11, 0, 5, 10), (0, 7, 6, 9), (6, 7, 5, 9), (11, 10, 5, 6)],
                    [(3, 3, "NS1"), (14, 13, "NS3")])
NIGHT_ALTS = [
    slabs([(0, 0, 6, 9), (6, 0, 10, 6), (6, 6, 5, 10), (11, 6, 5, 10), (0, 9, 6, 7)],
          [(8, 2, "NS3"), (9, 3, "NS3"), (9, 4, "NS3")]),
    slabs([(0, 0, 8, 10), (8, 0, 8, 5), (8, 5, 8, 11), (0, 10, 8, 6)], [(3, 13, "NS1"), (12, 8, "NS0")]),
]
emit("night_floor", NIGHT_FLOOR)
for i, m in enumerate(NIGHT_ALTS, 1):
    emit(f"night_floor~{i}", m)


def check() -> dict[str, int]:
    return {f"{tid}/{k}": kit.quad_counts(a) for tid, d in TILESETS.items() for k, a in d.items()
            if kit.quad_counts(a) > 4}
