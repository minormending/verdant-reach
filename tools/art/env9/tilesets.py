"""Chapter 8 tiles: the Root Relay's upper floors under Rootstock (`relay_upper`).

  cable_trunk       a thick bundle of three root-brown cables in a dark floor
                    channel, autotiled (group "cable_trunk") so runs bend and
                    end; a clamp with a glowing seam straddles every joint
  relay_terminal    a waist-high monitoring desk with a small level-meter
                    screen (2 frames)
  roof_vent         a round vent stack on the roof paving, steam (2 frames)
  roof_glass        the Glasshouse dome's top panes seen from above, the city
                    glowing green below (base + 3 alternates; the roof border)
  rootstock_banner  a dark green banner with ROOTSTOCK's graft-and-root sigil,
                    hung over an interior wall panel

Every tile keeps at most four colours per 8x8 quadrant (check()). Light comes
from the top-left. Cable shading is computed from geometry (each strand is a
small cylinder inside the bundle's larger one), so straight runs and bends
light the same way. A joined edge is always the same clamp column (or row),
so every reciprocal mask pair meets pixel for pixel.
"""
from __future__ import annotations

import math

import numpy as np

import kit
from kit import blank, paint, reduce_quads, shipped

TILESETS: dict[str, dict[str, np.ndarray]] = {"relay_upper": {}}
ORDER = {"relay_upper": ["relay_terminal", "roof_vent", "roof_glass", "rootstock_banner", "cable_trunk"]}
NAMES = {"relay_upper": "Root Relay: Upper Floors"}

N, E, S, W = 1, 2, 4, 8

# ------------------------------------------------------------ cable trunk ---
# '.' channel (ST3), 'l' lit root, 'm' root, 'd' root shade, 'g' joint glow.
CABLE_KEY = {".": "ST3", "l": "RT0", "m": "RT1", "d": "RT2", "g": "PH1"}
LIGHT = (-math.sqrt(0.5), -math.sqrt(0.5))     # toward the light: up and left
BAND = 10                                       # bundle width; rows/cols 3..12
CLAMP = {2: "l", 3: "l", 4: "m", 5: "m", 6: "m", 7: "g", 8: "g", 9: "m", 10: "m", 11: "m", 12: "m", 13: "m"}  # no shade: a bend pins both edges in one quadrant


def strand(u: float, s: int, p: tuple[float, float]) -> str:
    """Colour of a bundle pixel. u: across the bundle (0..10, pixel centre),
    s: along it, p: unit vector of increasing u. The two seams between the
    strands swing out of phase (period 8), so the strands swell and pinch
    like a lay of roots; they touch (no seam) where they cross."""
    w = math.sin(2 * math.pi * s / 8)
    # the outer strands swell and pinch too, so the bundle's silhouette waves
    if u < 0.7 + 0.7 * math.sin(2 * math.pi * (s + 3) / 8) or u > BAND - 0.7 - 0.7 * math.sin(2 * math.pi * (s + 7) / 8):
        return "."
    b1, b2 = BAND / 3 + 0.9 * w, 2 * BAND / 3 - 0.9 * w
    lo, hi, k = (0, b1, 0) if u < b1 else (b1, b2, 1) if u < b2 else (b2, BAND, 2)
    v = (u - lo) / (hi - lo)
    if k > 0 and u - lo < 1.0 and (s + 4 * k) % 8 not in (0, 1):
        return "."
    def lit(t):                                 # a surface normal t*p against the light
        return t * (p[0] * LIGHT[0] + p[1] * LIGHT[1])
    b = 0.8 * lit(2 * v - 1) + 0.6 * lit(2 * u / BAND - 1)
    ch = "l" if b > 0.3 else "d" if b < -0.3 else "m"
    # The bundle's lit half never takes the shade tone, its far half never the light.
    facing = lit(1 - 2 * u / BAND)
    if facing > 0.1 and ch == "d":
        ch = "."
    if facing < -0.1 and ch == "l":
        ch = "m"
    return ch


ROOTLETS = [(5, 2, "l"), (6, 2, "l"), (10, 13, "m")]   # (along, across, colour): root hairs off the bundle


def _run(horizontal: bool) -> list[list[str]]:
    g = [["."] * 16 for _ in range(16)]
    for a in range(16):                         # along
        for c in range(3, 13):                  # across
            ch = strand(c - 3 + 0.5, a, (0, 1) if horizontal else (1, 0))
            if horizontal:
                g[c][a] = ch
            else:
                g[a][c] = ch
    for a, c, ch in ROOTLETS:
        if horizontal:
            g[c][a] = ch
        else:
            g[a][c] = ch
    return g


def _clamp(g, side, keep):
    """The canonical joint: a dark gap, then half of a glowing clamp on the
    edge. The whole edge line is pinned, so joined tiles meet exactly."""
    def put(y, x, ch, pin):
        g[y][x] = ch
        keep[y][x] = keep[y][x] or pin
    for i in range(16):
        ch = CLAMP.get(i, ".")
        if side == E:
            put(i, 15, ch, True)
        elif side == W:
            put(i, 0, ch, True)
        elif side == S:
            put(15, i, ch, True)
        else:
            put(0, i, ch, True)
    for i in range(3, 13):
        if side == E:
            put(i, 14, ".", False)
        elif side == W:
            put(i, 1, ".", False)
        elif side == S:
            put(14, i, ".", False)
        else:
            put(1, i, ".", False)


def _bend(mask: int) -> list[list[str]]:
    """A quarter turn round the tile corner shared by the two joined sides."""
    cx = 16 if mask & E else 0
    cy = 16 if mask & S else 0
    g = [["."] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if 3.5 <= d < 13.5:
                u = min(9.5, d - 3.5)           # concentric strands; the profile is symmetric
                p = (dx / d, dy / d)
                s = int(round(math.atan2(abs(dy), abs(dx)) * 8))
                g[y][x] = strand(u, s, p)
    return g


# The end of a run, joined on the east: a wide clamp closes the bundle and a
# single lead runs on to the tile edge, plugging into the console, rack or
# wall next door (or diving under the plates).
END_E = [
    ".....lll.",
    "....llll.",
    "....lmmm.",
    "....mmmm.",
    "....mmmm.",
    "lllllggg.",
    "mmmmmggg.",
    "ddddmmmm.",
    "....mmmm.",
    "....mmmm.",
    "....dddd.",
    ".....ddd.",
]                                               # rows 2..13, columns 0..8


def _end(side: int) -> list[list[str]]:
    g = _run(True)
    for y in range(16):
        for x in range(9):
            g[y][x] = "."
    for j, row in enumerate(END_E):
        for i, ch in enumerate(row):
            g[2 + j][i] = ch
    if side == W:
        g = [row[::-1] for row in g]
    elif side in (S, N):
        g = [[g[x][y] for x in range(16)] for y in range(16)]   # transpose keeps top-left light
        if side == N:
            g = g[::-1]
    return g


def _junction(g):
    """Where three or four runs meet: a square graft collar with a glowing heart."""
    rows = [
        "llllllll",
        "lmmmmmmd",
        "lmm..mmd",
        "lm.gg.md",
        "lm.gg.md",
        "lmm..mmd",
        "lmmmmmmd",
        "dddddddd",
    ]
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            g[4 + j][4 + i] = ch


def cable(mask: int) -> np.ndarray:
    if mask == E | W:
        g = _run(True)
    elif mask == N | S:
        g = _run(False)
    elif mask in (E | S, S | W, W | N, N | E):
        g = _bend(mask)
    elif mask in (N, E, S, W):
        g = _end(mask)
    elif mask == 0:
        left, right = _end(E), _end(W)
        g = [left[y][:8] + right[y][8:] for y in range(16)]
    else:
        through_h = mask & E and mask & W
        g = _run(bool(through_h))
        arm = _run(not through_h)
        for y in range(16):
            for x in range(16):
                inside = ((mask & N and y < 8) or (mask & S and y >= 8)) if through_h else \
                         ((mask & W and x < 8) or (mask & E and x >= 8))
                if inside and 3 <= (x if through_h else y) <= 12:
                    g[y][x] = arm[y][x]
        _junction(g)
    keep = [[False] * 16 for _ in range(16)]
    for side in (N, E, S, W):
        if mask & side:
            _clamp(g, side, keep)
    _fold(g, keep)
    a = blank("ST3")
    paint(a, ["".join(r) for r in g], CABLE_KEY)
    return a


def _fold(g, keep):
    """Four colours per quadrant: fold shade into the channel, then light into
    the root, never touching the joint pixels (they must match next door)."""
    for qy in (0, 8):
        for qx in (0, 8):
            cells = [(y, x) for y in range(qy, qy + 8) for x in range(qx, qx + 8)]
            fixed = {g[y][x] for y, x in cells if keep[y][x]}
            for src, dst in (("d", "."), ("l", "m")):
                if len({g[y][x] for y, x in cells}) <= 4:
                    break
                if src in fixed:
                    continue
                for y, x in cells:
                    if g[y][x] == src:
                        g[y][x] = dst


# --------------------------------------------------------- relay terminal ---
# A small monitoring desk on the relay's plain floor plates: a boxy screen on
# a short neck, a steel desk with a key shelf. The screen is a level meter
# (bars of different heights), never two dots.
TERMINAL = [
    "................",
    "................",
    "...cccccccccc...",
    "...cssssssssk...",
    "...cssssssssk...",
    "...cssssssssk...",
    "...cssssssssk...",
    "...kkkkkkkkkk...",
    "......kkkk......",
    ".tttttttttttttt.",
    ".fbbbbbbbbbbbbk.",
    ".f:.:.:.:.:.:.k.",
    ".fffffffffffffk.",
    ".f.....ff.....k.",
    ".kkkkkkkkkkkkkk.",
    "................",
]
TERMINAL_KEY = {"c": "ST1", "k": "ST3", "s": "ST3", "t": "ST0", "f": "ST1", "b": "ST2", ":": "ST3"}
METER = [[2, 4, 3, 2], [3, 2, 4, 3]]            # bar heights per frame, bottom-aligned


def terminal(frame: int) -> np.ndarray:
    a = shipped("cable_floor~1")
    paint(a, TERMINAL, TERMINAL_KEY)
    colour = "PH1" if frame == 1 else "PH0"
    for i, h in enumerate(METER[frame - 1]):
        x = 4 + 2 * i
        for y in range(7 - h, 7):
            paint(a, ["g"], {"g": colour}, x, y)
    paint(a, ["k"] * 5, {"k": "ST2"}, 15, 10)  # the desk's shadow on the plates
    return reduce_quads(a, [("ST0", "ST1")])


# --------------------------------------------------------------- roof vent ---
# A louvred vent box, the relay's own steel: a lit lid with a slotted grille,
# a front of dark louvres, a shadow falling bottom-right on the slabs. Steam
# lifts from the grille and drifts up-right. The tile is one plain slab of
# the roof paving (its joints fold into the slab colour).
VENT = [
    "................",
    "................",
    "................",
    "................",
    "...rrrrrrrrrr...",
    "...rlclclclcl...",
    "...rllllllllc...",
    "...cccccccccc...",
    "...cdddddddddh..",
    "...cccccccccch..",
    "...cdddddddddh..",
    "...cccccccccch..",
    "...cdddddddddh..",
    "...ddddddddddh..",
    "....hhhhhhhhhh..",
    "................",
]
VENT_KEY = {"r": "ST0", "l": "ST1", "c": "ST2", "d": "ST3", "h": "#b09080"}
STEAM = [
    [
        "........s.......",
        "......s..s.s....",
        ".....s.s..s.....",
        "......s...s.....",
        "................",
    ],
    [
        ".......s..s.....",
        ".....s.s...s....",
        "......s..s......",
        ".....s..........",
        "................",
    ],
]


def vent(frame: int) -> np.ndarray:
    a = shipped("paving")
    a[(a == kit.rgba("#f8f0d0")).all(axis=2) | (a == kit.rgba("#b09080")).all(axis=2)] = kit.rgba("#e0c8a0")
    paint(a, STEAM[frame - 1], {"s": "ST0"})
    paint(a, VENT, VENT_KEY)
    return a


# ------------------------------------------------------------- roof glass ---
# The dome's top panes, glazed like the city's glass_wall: a glazing cross at
# 7..8, so tiled panes meet in a grid (its pale bar is the lit side, the
# darker one in shade). Through the glass the city glows green: soft pools of
# light, each round a small bright lamp, scattered differently in each
# variant so the wide roof border never looks stamped.
GLASS_KEY = {".": "GD", "h": "GH", "g": "GL", "#": "GF", "=": "GS"}


def glass(lights: list[tuple[float, float, float]]) -> np.ndarray:
    g = [["."] * 16 for _ in range(16)]
    for (cx, cy, r) in lights:
        for y in range(16):
            for x in range(16):
                dx = min(abs(x - cx), 16 - abs(x - cx))   # wrap, so pools cross tile edges
                dy = min(abs(y - cy), 16 - abs(y - cy))
                d2 = dx * dx + dy * dy
                if d2 <= 0.5:
                    g[y][x] = "g"
                elif d2 <= r * r and g[y][x] == ".":
                    g[y][x] = "h"
    for i in range(16):
        g[7][i] = "#"
        g[i][7] = "#"
        g[8][i] = "="
        g[i][8] = "=" if i != 7 else "#"
    a = blank("GD")
    paint(a, ["".join(r) for r in g], GLASS_KEY)
    # Where both bar tones cross a pane's quadrant, its lamp folds into the glow.
    return reduce_quads(a, [("GL", "GH")])


GLASS_LIGHTS = [
    [(3.5, 3.5, 2.6), (12, 12.5, 3.1), (13, 3, 1.6), (4, 12, 1.4)],
    [(4.5, 12, 2.9), (12.5, 4, 2.2), (2, 3, 1.3)],
    [(3, 3.5, 1.7), (11.5, 13, 2.2), (4, 13, 1.6), (13, 4.5, 2.6)],
    [(12, 11.5, 2.3), (4.5, 4.5, 3.0), (12, 3, 1.3)],
]

# --------------------------------------------------------- rootstock banner ---
# Hung from the wall panel's top rail: the cloth covers the panel between the
# frame posts and the skirting below, its swallowtail showing the frame brown
# behind. The sigil is ROOTSTOCK's graft mark (a scion wedged in a split
# stock, as on the grunts' caps) with roots splaying under the union: the
# root-knot.
BANNER = [
    "................",
    "................",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnnnnnnnnd.",
    ".lnnnnnffnnnnnd.",
    ".lnnnnffffnnnnd.",
]
SIGIL = [
    "y........y",
    ".y......y.",
    ".yy....yy.",
    "..yy..yy..",
    "...yyyy...",
    "....yy....",
    "....yy....",
    "...yyyy...",
    "..y.yy.y..",
    ".y..yy..y.",
]


def banner() -> np.ndarray:
    a = shipped("wall")
    frame = tuple(int(v) for v in a[0, 0])     # the panel frame brown, read from the wall
    a[1, 1:15] = frame                          # the hanging rail
    paint(a, BANNER, {"l": "BN0", "n": "BN1", "d": "BN2"})
    for y in (14, 15):
        for x in range(16):
            if BANNER[y][x] == "f":
                a[y, x] = frame
    paint(a, SIGIL, {"y": "SG"}, 3, 3)
    return reduce_quads(a, [("BN0", "BN1"), ("BN2", "BN1")])


def build():
    t = TILESETS["relay_upper"]
    t.clear()
    for m in range(16):
        t[f"cable_trunk@{m}"] = cable(m)
    t["cable_trunk"] = cable(E | W)
    t["relay_terminal"] = terminal(1)
    t["relay_terminal__2"] = terminal(2)
    t["roof_vent"] = vent(1)
    t["roof_vent__2"] = vent(2)
    for i, lights in enumerate(GLASS_LIGHTS):
        t["roof_glass" + (f"~{i}" if i else "")] = glass(lights)
    t["rootstock_banner"] = banner()
    check()


def check():
    t = TILESETS["relay_upper"]
    for stem, a in t.items():
        assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
        assert kit.quadrant_colours(a) <= 4, (stem, kit.quadrant_colours(a))
    # Joined cable runs meet pixel for pixel on every reciprocal edge.
    for a in range(16):
        for b in range(16):
            if a & E and b & W:
                assert (t[f"cable_trunk@{a}"][:, -1] == t[f"cable_trunk@{b}"][:, 0]).all(), (a, b)
            if a & S and b & N:
                assert (t[f"cable_trunk@{a}"][-1] == t[f"cable_trunk@{b}"][0]).all(), (a, b)
