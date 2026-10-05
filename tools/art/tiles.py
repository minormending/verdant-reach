"""16x16 GBC environment tiles -> public/assets/tiles/.

Outputs, per src/contracts/constants.ts:
  <key>.png            base tile (and <key>__2.png second animation frame)
  <key>@<mask>.png     AUTOTILE variants, mask = N1|E2|S4|W8 same-group sides
  <key>~1..3.png       subtle ground variants picked by a position hash

Rules (docs/STYLE.md): shared environment ramps, light from the top-left,
dark hue-shifted edges (never black outlines), <=4 colours per 8x8 quadrant.
`check()` enforces the colour rule on every tile it writes.

Ground autotiles (water, paths, sand, bog...) are built from a shape mask:
open sides are cut back with a hand-tuned wobble profile and rounded
corners, then rimmed (bank / shadow / foam). Walls, hedges and cliffs use a
cap-and-face model; forests use a crown template whose gaps fill with deep
canopy shade toward same-group neighbours. Run, then look at
tools/art/review/tiles.png, tiles_auto.png and tiles_map.png.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image

import gbc

# ---------------------------------------------------------------------------
# Palette. Ramps 0 (light) .. 3 (dark). The six STYLE.md ramps are exact;
# the rest are derived with the same hue shift (shadows to blue/purple,
# highlights to yellow).
# ---------------------------------------------------------------------------
HEX = {
    # STYLE.md shared ramps
    "G0": "#e0f0a0", "G1": "#98d060", "G2": "#58a040", "G3": "#285828",   # grass
    "O0": "#f0c890", "O1": "#c88850", "O2": "#8a5030", "O3": "#4a2818",   # wood
    "R0": "#f0f0e8", "R1": "#b8b8b0", "R2": "#787878", "R3": "#383840",   # stone
    "W0": "#c8e8f8", "W1": "#68a8e8", "W2": "#3060c0", "W3": "#183070",   # water
    "M0": "#f8c060", "M1": "#e88030", "M2": "#b04020", "M3": "#602010",   # maple
    "V0": "#a8b878", "V1": "#687838", "V2": "#384820", "V3": "#182410",   # bog
    # derived
    "L2": "#307040", "L3": "#183828",                                     # deep foliage
    "P0": "#f8f0c8", "P1": "#e8d098", "P2": "#c8a070", "P3": "#907058",   # path
    "D0": "#d8a868", "D1": "#b07848", "D2": "#805030", "D3": "#503020",   # dirt / soil
    "S0": "#f8f8e0", "S1": "#f0e0a8", "S2": "#d8c080", "S3": "#a89060",   # sand
    "B0": "#f0a080", "B1": "#c86048", "B2": "#903028", "B3": "#501818",   # brick / red
    "U0": "#a8c8f0", "U1": "#6888d0", "U2": "#3850a0", "U3": "#202858",   # slate blue
    "Q0": "#f0f8f8", "Q1": "#b8e8e0", "Q2": "#70b8b0", "Q3": "#306860",   # glass
    "Y0": "#f8f8a8", "Y1": "#f8d838", "Y2": "#c8a010", "Y3": "#685008",   # yellow
    "N0": "#f8d0e0", "N1": "#f088a8", "N2": "#c04870", "N3": "#601830",   # pink
    "X0": "#e0b8f0", "X1": "#a868c8", "X2": "#683888", "X3": "#301840",   # berry
    "K1": "#f04830", "K2": "#a81828",                                     # poppy red
    "E0": "#f8f0d8", "E1": "#e8d8b0", "E2": "#c0a880", "E3": "#806048",   # wallpaper
    "T0": "#f8f8f8", "T3": "#101018",                                     # white, void
    "C1": "#e89850", "C2": "#b86030",                                     # copper
    "Z0": "#e0c898", "Z1": "#b09068", "Z2": "#786048", "Z3": "#403040",   # cliff rock
}
NAMES = list(HEX)
IDX = {n: i for i, n in enumerate(NAMES)}
RGBA = np.array([gbc.hexc(HEX[n]) for n in NAMES], np.uint8)

OUT: dict[str, np.ndarray] = {}          # file stem -> 16x16 index array


# ---------------------------------------------------------------- helpers ---
def A(rows: list[str], key: dict[str, str], w=16, h=16) -> np.ndarray:
    """ASCII rows -> index array. key: char -> palette name."""
    assert len(rows) == h and all(len(r) == w for r in rows), [len(r) for r in rows]
    a = np.zeros((h, w), np.int16)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            a[y, x] = IDX[key[ch]]
    return a


def put(dst: np.ndarray, rows: list[str], key: dict[str, str | None], x0: int, y0: int):
    """Overlay ASCII; chars mapped to None (or missing ' ') are transparent."""
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == " " or key.get(ch) is None:
                continue
            yy, xx = y0 + j, x0 + i
            if 0 <= yy < dst.shape[0] and 0 <= xx < dst.shape[1]:
                dst[yy, xx] = IDX[key[ch]]


def fill(n: str, w=16, h=16) -> np.ndarray:
    return np.full((h, w), IDX[n], np.int16)


def c(n: str) -> int:
    return IDX[n]


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray(RGBA[a], "RGBA")


def emit(stem: str, a: np.ndarray):
    assert a.shape == (16, 16), stem
    OUT[stem] = a.copy()


def quad_counts(a: np.ndarray) -> int:
    return max(len(np.unique(a[y:y + 8, x:x + 8])) for y in (0, 8) for x in (0, 8))


def reduce_quads(a: np.ndarray, order: list[tuple[str, str]]) -> np.ndarray:
    """Fold colours (src->dst, in priority order) inside any 8x8 quadrant that
    holds more than four colours. Keeps detail where the budget allows."""
    a = a.copy()
    for y in (0, 8):
        for x in (0, 8):
            q = a[y:y + 8, x:x + 8]
            for src, dst in order:
                if len(np.unique(q)) <= 4:
                    break
                q[q == c(src)] = c(dst)
    return a


def hflip(a):
    return a[:, ::-1].copy()


def shift(a, dx=0, dy=0):
    return np.roll(np.roll(a, dy, 0), dx, 1)


MASKS = range(16)


def sides(mask):
    """-> (n, e, s, w) booleans: True when that neighbour is the same group."""
    return bool(mask & 1), bool(mask & 2), bool(mask & 4), bool(mask & 8)


def pad_same(inside: np.ndarray, mask: int) -> np.ndarray:
    """18x18 copy with a 1px border: open sides are 'outside' (False), same
    sides replicate the edge (the shape continues into the neighbour)."""
    n, e, s, w = sides(mask)
    p = np.zeros((18, 18), bool)
    p[1:17, 1:17] = inside
    if n:
        p[0, 1:17] = inside[0]
    if s:
        p[17, 1:17] = inside[15]
    if w:
        p[1:17, 0] = inside[:, 0]
    if e:
        p[1:17, 17] = inside[:, 15]
    p[0, 0] = n and w and inside[0, 0]
    p[0, 17] = n and e and inside[0, 15]
    p[17, 0] = s and w and inside[15, 0]
    p[17, 17] = s and e and inside[15, 15]
    return p


def blob(mask: int, depth=(3, 3, 3, 3), prof=None, radius=4) -> np.ndarray:
    """Inside-shape for a ground autotile. depth: (n, e, s, w) base inset on
    open sides; prof: dict side -> 16 ints added to the inset (wobble)."""
    n, e, s, w = sides(mask)
    prof = prof or {}
    z = [0] * 16
    pn, pe, ps, pw = (prof.get(k, z) for k in "nesw")
    ins = np.ones((16, 16), bool)
    for y in range(16):
        for x in range(16):
            if not n and y < depth[0] + pn[x]:
                ins[y, x] = False
            if not s and y > 15 - depth[2] - ps[x]:
                ins[y, x] = False
            if not w and x < depth[3] + pw[y]:
                ins[y, x] = False
            if not e and x > 15 - depth[1] - pe[y]:
                ins[y, x] = False
    # round the outer corners
    r = radius
    for (open_a, open_b, cy, cx, sy, sx) in (
            (not n, not w, depth[0] + r, depth[3] + r, -1, -1),
            (not n, not e, depth[0] + r, 15 - depth[1] - r, -1, 1),
            (not s, not w, 15 - depth[2] - r, depth[3] + r, 1, -1),
            (not s, not e, 15 - depth[2] - r, 15 - depth[1] - r, 1, 1)):
        if not (open_a and open_b):
            continue
        for y in range(16):
            for x in range(16):
                dy, dx = (y - cy) * sy, (x - cx) * sx
                if dy > 0 and dx > 0 and dx * dx + dy * dy > r * r + 1:
                    ins[y, x] = False
    return ins


def rims(inside: np.ndarray, mask: int):
    """-> (out_rim, in_nw, in_se) boolean maps.
    out_rim: outside pixels touching the shape; in_nw: inside pixels whose
    outside neighbour is above/left (shadowed by the bank); in_se: inside
    pixels whose outside neighbour is below/right."""
    p = pad_same(inside, mask)
    up, dn = p[0:16, 1:17], p[2:18, 1:17]
    lf, rt = p[1:17, 0:16], p[1:17, 2:18]
    out_rim = ~inside & (up | dn | lf | rt)
    in_nw = inside & (~up | ~lf)
    in_se = inside & (~dn | ~rt) & ~in_nw
    return out_rim, in_nw, in_se


# ------------------------------------------------------------ the ground ---
GRASS_K = {".": "G1", ",": "G0", ":": "G2", "#": "G3"}
GRASS_ROWS = [
    "................",
    "................",
    "..,.............",
    "..:.:...........",
    "...:........,...",
    "...........:.:..",
    "............:...",
    "................",
    "................",
    "......,.........",
    "......:.:.......",
    ".......:........",
    "................",
    ".,...........,..",
    ".:.:.........:.:",
    "..:...........:.",
]
GRASS = A(GRASS_ROWS, GRASS_K)
emit("grass", GRASS)
emit("grass~1", A([
    "................",
    "........,.......",
    "........:.:.....",
    ".........:......",
    "................",
    "..,.............",
    "..:.:...........",
    "...:........,...",
    "...........:.:..",
    "............:...",
    "................",
    "................",
    "....,.......,...",
    "....:.:.....:...",
    ".....:..........",
    "................",
], GRASS_K))
emit("grass~2", A([
    "................",
    "................",
    "...........,....",
    "...........:.:..",
    "............:...",
    "................",
    "................",
    "................",
    "...,............",
    "...:.:..........",
    "....:...........",
    "................",
    "................",
    "..........,.....",
    "..........:.:...",
    "...........:....",
], GRASS_K))
emit("grass~3", A([
    "................",
    "................",
    "................",
    "....,...........",
    "....:.:.........",
    ".....:..........",
    "................",
    "................",
    "................",
    "................",
    "...........,....",
    "...........:.:..",
    "............:...",
    "................",
    "................",
    "................",
], GRASS_K))

# --- path / dirt / sand / bog: interiors + grass-overlap edges -----------
PATH_K = {".": "P1", ",": "P0", ":": "P2", "#": "P3"}
PATH = A([
    "................",
    "........,.......",
    "..:.............",
    "..,.............",
    "............:...",
    "............,...",
    "................",
    "....#...........",
    "..........,.....",
    "................",
    "...:............",
    "...,.......:....",
    "...........,....",
    "................",
    "......:.......#.",
    "................",
], PATH_K)
PATH_ALTS = [A(r, PATH_K) for r in ([
    "................",
    "......:.........",
    "......,.........",
    "................",
    ".:..........#...",
    "................",
    "..........,.....",
    "................",
    "................",
    "....:...........",
    "....,...........",
    ".............:..",
    ".............,..",
    "........#.......",
    "................",
    "................",
], [
    "................",
    "................",
    "...........:....",
    "...........,....",
    "................",
    "...#............",
    "................",
    ".........,......",
    "................",
    "................",
    ".....:..........",
    ".....,..........",
    "................",
    "............#...",
    "................",
    "................",
], [
    "................",
    "..,.............",
    "................",
    "........:.......",
    "........,.......",
    "................",
    "................",
    "................",
    ".............:..",
    ".............,..",
    "..#.............",
    "................",
    "................",
    "......,.........",
    "................",
    "................",
])]

DIRT_K = {".": "D1", ",": "D0", ":": "D2", "#": "D3"}
DIRT = A([
    "................",
    "..:.......,.....",
    "..,.............",
    "..........:.....",
    ".....,....,.....",
    "................",
    ":...........#...",
    ",...............",
    "........:.......",
    "........,.......",
    "..............:.",
    "...#..........,.",
    "................",
    "..........:.....",
    "......,...,.....",
    "................",
], DIRT_K)
DIRT_ALTS = [shift(DIRT, 5, 7), shift(hflip(DIRT), 3, 2), shift(hflip(DIRT), 10, 11)]

SAND_K = {".": "S1", ",": "S0", ":": "S2", "#": "S3"}
SAND = A([
    "................",
    ".......,........",
    "..::............",
    "....::..........",
    "................",
    "...........::...",
    ".............::.",
    "......,.........",
    "................",
    "................",
    ".::.............",
    "...::.......,...",
    "................",
    "........::......",
    "..........::....",
    "................",
], SAND_K)
SAND_ALTS = [shift(SAND, 7, 5), shift(hflip(SAND), 2, 9), shift(SAND, 11, 13)]

BOG_K = {".": "V1", ",": "V0", ":": "V2", "#": "V3"}
BOG_PUDDLE = {".": "V1", ",": "W1", ":": "V2", "#": "W3"}
BOG = A([
    "................",
    "..,.,...........",
    "..:,:...........",
    "...:.......,....",
    "...........:....",
    "................",
    "......:##:......",
    ".....:#,##:.....",
    "......::::......",
    "................",
    ".............,.,",
    ".............:,:",
    "..,...........:.",
    ".,:,............",
    "..:.............",
    "................",
], BOG_K)
BOG_TUFTS = A([
    "................",
    "...........,.,..",
    "...........:,:..",
    "............:...",
    "................",
    "...,............",
    "..,:,...........",
    "...:............",
    "................",
    "................",
    "........,.,.....",
    "........:,:.....",
    ".........:......",
    "................",
    "..............,.",
    ".............:,:",
], BOG_K)
BOG_ALTS = [BOG_TUFTS, shift(hflip(BOG_TUFTS), 3, 6), shift(hflip(BOG), 5, 9)]

# wobble profiles for grass edges (tufted), and gentler ones for shores
TUFT_PROF = {"n": [0, 0, 1, 0, -1, 0, 1, 1, 0, 0, -1, 0, 1, 0, 0, 0],
             "s": [0, 0, -1, 0, 1, 1, 0, -1, 0, 0, 1, 0, -1, 0, 0, 0],
             "w": [0, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0],
             "e": [0, 0, -1, 0, 1, 0, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0]}
SHORE_PROF = {"n": [0, 0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 1, 0, 0],
              "s": [0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 1, 1, 0, 0],
              "w": [0, 0, 0, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, -1, 0, 0],
              "e": [0, 0, 1, 1, 0, 0, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0]}


def ground_edges(interior: np.ndarray, mask: int, outside: np.ndarray, *, depth=(2, 2, 2, 2),
                 prof=TUFT_PROF, radius=3, out_rim="G2", in_nw=None, in_se=None,
                 reduce=()) -> np.ndarray:
    ins = blob(mask, depth, prof, radius)
    o_rim, i_nw, i_se = rims(ins, mask)
    a = np.where(ins, interior, outside)
    if out_rim:
        a[o_rim] = c(out_rim)
    if in_nw:
        a[i_nw] = c(in_nw)
    if in_se:
        a[i_se] = c(in_se)
    return reduce_quads(a, list(reduce))


def ground_family(key: str, base: np.ndarray, alts, **kw):
    emit(key, base)
    for i, alt in enumerate(alts or [], 1):
        emit(f"{key}~{i}", alt)
    for m in MASKS:
        emit(f"{key}@{m}", ground_edges(base, m, GRASS, **kw))


ground_family("path", PATH, PATH_ALTS, in_nw="P2",
              reduce=[("P0", "P1"), ("P3", "P2"), ("G0", "G1")])
ground_family("dirt", DIRT, DIRT_ALTS, in_nw="D2", out_rim="G3",
              reduce=[("D0", "D1"), ("D3", "D2"), ("G0", "G1"), ("G2", "G1")])
ground_family("sand", SAND, SAND_ALTS, in_nw="S2", out_rim="G2",
              reduce=[("S0", "S1"), ("S3", "S2"), ("G0", "G1"), ("S2", "S1")])
ground_family("bog", BOG, BOG_ALTS, in_nw="V2", out_rim="G3", depth=(2, 2, 2, 2),
              reduce=[("V0", "V1"), ("V3", "V2"), ("G0", "G1"), ("G2", "G1")])


# --- water family: shoreline with a dark bank and lapping foam ----------
WATER_K = {".": "W1", ",": "W0", ":": "W2", "#": "W3"}
WATER_ROWS = [
    "................",
    "..,,,...........",
    ".,...::.........",
    "................",
    "................",
    "...........,....",
    "..........,.:...",
    "................",
    "................",
    "................",
    "....,,,.........",
    "...,...::.......",
    "................",
    "..............,.",
    ".............,.:",
    "................",
]
WATER = A(WATER_ROWS, WATER_K)
WATER2 = shift(A(WATER_ROWS, WATER_K), 2, 1)


def lily_overlay(a: np.ndarray, frame: int) -> np.ndarray:
    a = a.copy()
    # clear the pad quadrants of wave marks so pads keep the 4-colour budget
    for (x0, y0) in ((0, 0), (8, 8)):
        q = a[y0:y0 + 8, x0:x0 + 8]
        q[q != c("W1")] = c("W1")
    pad = ["  ####  ", " #,,,## ", "#,,,,.,#", "#,,,..,#", "#,,,,,,#", " #,,,,# ", "  ####  "]
    put(a, pad, {"#": "G3", ",": "G2", ".": "W1"}, 0, 0)
    put(a, ["  n ", " nnn", "  n "], {"n": "N1"}, 2, 1)
    small = [" ### ", "#,,.#", "#,,,#", " ### "]
    put(a, small, {"#": "G3", ",": "G2", ".": "W1"}, 9 + (frame == 2), 10)
    return a


def shore(interior, mask, frame, outside=GRASS, bank="G3", foam="W0", gap="W1", depth=(3, 2, 2, 2),
          reduce=(("G0", "G1"), ("G2", "G1"), ("W2", "W1"), ("W3", "W1"))):
    ins = blob(mask, depth, SHORE_PROF, 3)
    o_rim, i_nw, i_se = rims(ins, mask)
    a = np.where(ins, interior, outside)
    a[o_rim] = c(bank)
    ring = i_nw | i_se
    ys, xs = np.nonzero(ring)
    for y, x in zip(ys, xs):
        lap = (x * 3 + y * 5 + frame * 3) % 8
        a[y, x] = c(gap) if lap in (0, 1) else c(foam)
    return reduce_quads(a, list(reduce))


LILY_RED = (("G0", "G1"), ("W2", "W1"), ("W3", "W1"), ("W0", "W1"), ("N1", "G2"))
emit("water", WATER)
emit("water__2", WATER2)
LILY1, LILY2 = lily_overlay(WATER, 1), lily_overlay(WATER2, 2)
emit("pond_lily", LILY1)
emit("pond_lily__2", LILY2)
STONE_CURB = A([
    "....:.......:...",
    "....:.......:...",
    "::::::::::::::::",
    "........:.......",
    "........:.......",
    "........:.......",
    "::::::::::::::::",
    "....:.......:...",
    "....:.......:...",
    "....:.......:...",
    "::::::::::::::::",
    "........:.......",
    "........:.......",
    "........:.......",
    "::::::::::::::::",
    "....:.......:...",
], {".": "R1", ":": "R2"})
for m in MASKS:
    emit(f"water@{m}", shore(WATER, m, 1))
    emit(f"water@{m}__2", shore(WATER2, m, 2))
    emit(f"pond_lily@{m}", shore(LILY1, m, 1, reduce=LILY_RED))
    emit(f"pond_lily@{m}__2", shore(LILY2, m, 2, reduce=LILY_RED))
    emit(f"water_channel@{m}", shore(WATER, m, 1, STONE_CURB, bank="R3", depth=(3, 3, 3, 3),
                                     reduce=(("R2", "R1"), ("W2", "W1"))))
    emit(f"water_channel@{m}__2", shore(WATER2, m, 2, STONE_CURB, bank="R3", depth=(3, 3, 3, 3),
                                        reduce=(("R2", "R1"), ("W2", "W1"))))
emit("water_channel", shore(WATER, 5, 1, STONE_CURB, bank="R3", depth=(3, 3, 3, 3),
                            reduce=(("R2", "R1"), ("W2", "W1"))))
emit("water_channel__2", shore(WATER2, 5, 2, STONE_CURB, bank="R3", depth=(3, 3, 3, 3),
                               reduce=(("R2", "R1"), ("W2", "W1"))))


# --- tall grass: a darker tufted mass with soft, tufted borders ---------
TG_K = {".": "G2", ",": "G0", ":": "G1", "#": "G3"}
TUFT = [
    ",......,",
    ":..:..:.",
    ":#.:.#:.",
    "#:#:#:#.",
    ".:#:#:..",
    ".#:::#..",
    "..###...",
    "........",
]
TUFT2 = [
    ".,......",
    ".:..:..:",
    ".:#.:#:.",
    "#:#:#:#.",
    ".:#:#:..",
    ".#:::#..",
    "..###...",
    "........",
]


def quad(motif: list[str], offset=0) -> list[str]:
    top = [r + r for r in motif]
    bot = [(r + r)[offset:] + (r + r)[:offset] for r in motif]
    return top + bot


TALL1 = A(quad(TUFT, 4), TG_K)
TALL2 = A(quad(TUFT2, 4), TG_K)
emit("tall_grass", TALL1)
emit("tall_grass__2", TALL2)
for m in MASKS:
    for f, t in ((1, TALL1), (2, TALL2)):
        a = ground_edges(t, m, GRASS, depth=(1, 1, 1, 1), radius=3, out_rim=None,
                         reduce=[("G0", "G1")])
        emit(f"tall_grass@{m}" + ("__2" if f == 2 else ""), a)


# --- stone path: flagstones bedded in moss ------------------------------
def stones(layout, w=16, h=16, gap="G2", lit="R0", face="R1", shade="R2"):
    """layout: list of (x, y, w, h) stones on a wrapping grid."""
    a = fill(gap, w, h)
    for (x0, y0, sw, sh) in layout:
        for j in range(sh):
            for i in range(sw):
                corner = (i in (0, sw - 1)) and (j in (0, sh - 1))
                if corner:
                    continue
                col = face
                if j == 0 or i == 0:
                    col = lit
                if j == sh - 1 or i == sw - 1:
                    col = shade
                a[(y0 + j) % h, (x0 + i) % w] = c(col)
    return a


STONE_PATH = stones([(0, 0, 7, 7), (8, 0, 8, 6), (7, 7, 6, 9), (13, 6, 6, 5),
                     (13, 11, 6, 5), (1, 7, 5, 5), (1, 12, 5, 4)])
STONE_PATH_ALT = stones([(1, 0, 6, 6), (8, 1, 7, 6), (0, 7, 8, 5), (9, 8, 6, 8),
                         (0, 13, 8, 3), (15, 7, 2, 1)])
emit("stone_path", STONE_PATH)
for m in MASKS:
    emit(f"stone_path@{m}", ground_edges(STONE_PATH, m, GRASS, depth=(1, 1, 1, 1), radius=3,
                                         out_rim=None, reduce=[("G0", "G1"), ("R0", "R1")]))


# --- boardwalk: planks run across the direction of travel ---------------
def boardwalk(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    horiz = (e or w) and not (n or s)
    a = np.zeros((16, 16), np.int16)
    for y in range(16):
        for x in range(16):
            u = x if horiz else y                 # across-plank coordinate
            v = y if horiz else x                 # along-plank coordinate
            k = u % 4
            col = ("O0", "O1", "O1", "O3")[k]
            if k == 1 and v % 8 == (5 if (u // 4) % 2 else 1):
                col = "O2"                         # nail / knot
            a[y, x] = c(col)
    # edge beams on open sides (the deck has thickness on the near side)
    if not n:
        a[0, :] = c("O3")
    if not s:
        a[14, :] = c("O2")
        a[15, :] = c("O3")
    if not w:
        a[:, 0] = c("O3")
    if not e:
        a[:, 15] = c("O3")
        a[:, 14] = np.where(a[:, 14] == c("O0"), c("O1"), a[:, 14])
    return a


emit("boardwalk", boardwalk(5))
for m in MASKS:
    emit(f"boardwalk@{m}", boardwalk(m))


# --- forests: crowns that merge into one canopy --------------------------
CROWN = [  # h highlight, b body, m shade, d dark rim; ' ' gap
    "     dddddd     ",
    "   ddhhhbbbdd   ",
    "  dhhhhhbbbbbd  ",
    " dhh,hhhbbbbbmd ",
    " dhhhhhbbbbbbmd ",
    "dbhhhhbbbbbbbmmd",
    "dbbhhbbbbbbbmmmd",
    "dbbbbbbmmbbbmmmd",
    "dmbbbbmhhbbmmmmd",
    "dmbbbmhhbbbbmmmd",
    " dmmbbbbbbbmmmd ",
    " ddmmmbbbbmmmmd ",
    "  dddmmmmmmmdd  ",
    "    dddddddd    ",
    "                ",
    "                ",
]
TRUNK = [  # rows 13..15 when the south side is open
    "    dddttddd    ",
    "      dttd      ",
    "     ddttdd     ",
]
GAP_TEX = [
    "1010001000100010",
    "0001000000000100",
    "0100010001000001",
    "0000000100010000",
]


def forest(mask: int, pal: dict, gap_hi: str, gap_lo: str, ground=None, tapped=False) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = fill("G1") if ground is None else ground.copy()
    for y in range(16):
        for x in range(16):
            ch = CROWN[y][x]
            if ch != " ":
                ch = (pal["lo"] if y >= 8 else pal["hi"]).get(ch, ch)
                a[y, x] = c(pal[ch])
                continue
            bands = []
            if y < 4:
                bands.append(n)
            if y > 11:
                bands.append(s)
            if x < 4:
                bands.append(w)
            if x > 11:
                bands.append(e)
            if bands and all(bands):
                a[y, x] = c(gap_hi if GAP_TEX[y % 4][x] == "1" else gap_lo)
    if not s:
        tk = {"d": pal["d"], "t": pal["m"]}
        put(a, TRUNK, tk, 0, 13)
        if tapped:
            put(a, ["  g  ", " RRRR", " RrrR", " RRRR"],
                {"g": "R1", "R": pal["d"], "r": "R1"}, 9, 12)
    elif tapped:   # tap visible on the canopy edge only when the trunk is
        pass
    return a


TREE_PAL = {"h": "G1", ",": "G0", "b": "G2", "m": "L2", "d": "L3", "lo": {}, "hi": {}}
MAPLE_PAL = {"h": "M0", ",": "M0", "b": "M1", "m": "M2", "d": "M3", "lo": {"h": "b"}, "hi": {"m": "b"}}
TREE_RED = [("G0", "G1"), ("L2", "L3")]
MAPLE_RED = [("M2", "M3"), ("M0", "M1")]
for m in MASKS:
    emit(f"tree@{m}", reduce_quads(forest(m, TREE_PAL, "L2", "L3"), TREE_RED))
    emit(f"maple_tree@{m}", reduce_quads(forest(m, MAPLE_PAL, "M2", "M3"), MAPLE_RED))
    emit(f"tapped_maple@{m}", reduce_quads(forest(m, MAPLE_PAL, "M2", "M3", tapped=True),
                                           MAPLE_RED + [("O2", "M3")]))
for k in ("tree", "maple_tree", "tapped_maple"):
    emit(k, OUT[f"{k}@0"])


# --- hedges: leafy top, darker front face where the south side is open ---
def clumps(centers, r, base, hi, lo, w=16, h=16, edge=None):
    """Periodic leaf-clump texture: overlapping discs (later = in front), each
    lit on its upper-left rim and shaded on its lower-right rim."""
    own = -np.ones((h, w), int)
    for k, (cx, cy) in enumerate(centers):
        for y in range(h):
            for x in range(w):
                dx = (x - cx + w / 2) % w - w / 2
                dy = (y - cy + h / 2) % h - h / 2
                if dx * dx + dy * dy <= r * r:
                    own[y, x] = k
    a = fill(base, w, h)
    for y in range(h):
        for x in range(w):
            k = own[y, x]
            if k < 0:
                a[y, x] = c(edge or lo)
                continue
            dn = own[(y + 1) % h, x] != k
            rt = own[y, (x + 1) % w] != k
            up = own[(y - 1) % h, x] != k
            lf = own[y, (x - 1) % w] != k
            if dn or (rt and not up):
                a[y, x] = c(lo)
            elif up or lf:
                a[y, x] = c(hi)
    return a


HEDGE_CENTERS = [(2, 2), (10, 1), (6, 6), (14, 6), (2, 10), (10, 10), (6, 14), (14, 14)]
HEDGE_TOP = clumps(HEDGE_CENTERS, 3.6, "G2", "G1", "L2")
HEDGE_FACE = clumps([(2, 1), (10, 1), (6, 5), (14, 5)], 3.6, "L2", "G2", "L3", h=8)
HEDGE_FACE[7, :] = c("L3")


def hedge(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = HEDGE_TOP.copy()
    if not s:
        a[8:16] = HEDGE_FACE
        a[8, :] = np.where(a[7, :] == c("G1"), c("G2"), c("L2"))   # top-to-face crease
    if not n:
        a[0, :] = c("L2")
        a[1, :] = np.where(a[1, :] == c("L2"), c("G2"), c("G1"))
    if not w:
        a[:, 0] = c("L2")
    if not e:
        a[:, 15] = c("L3")
        a[:8, 14] = np.where(a[:8, 14] == c("G1"), c("G2"), a[:8, 14])
    # rounded outer corners show the ground (top) or the base shadow (bottom)
    for open_a, open_b, ys, xs, col in ((not n, not w, [0, 0, 1], [0, 1, 0], "G1"),
                                        (not n, not e, [0, 0, 1], [15, 14, 15], "G1"),
                                        (not s, not w, [15, 15, 14], [0, 1, 0], "G1"),
                                        (not s, not e, [15, 15, 14], [15, 14, 15], "G1")):
        if open_a and open_b:
            a[ys, xs] = c(col)
    return reduce_quads(a, [("G1", "G2")])


for m in MASKS:
    emit(f"hedge@{m}", hedge(m))
emit("hedge", OUT["hedge@10"])


# --- fences: a post per tile, rails toward same-group neighbours --------
def fence(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = fill("G1")
    rail = {"0": "O0", "1": "O1", "3": "O3"}
    for y0 in (5, 10):                        # two horizontal rails
        for x in range(16):
            if (x < 6 and w) or (x > 9 and e):
                a[y0, x], a[y0 + 1, x], a[y0 + 2, x] = c("O0"), c("O1"), c("O3")
    if n:
        put(a, ["01", "01", "01"], rail, 7, 0)
    if s:
        put(a, ["01", "01"], rail, 7, 14)
    put(a, [
        " 00 ",
        "0011",
        "0113",
        "0113",
        "0113",
        "0113",
        "0113",
        "0113",
        "0113",
        "0113",
        "0113",
        "3333",
    ], rail, 6, 2)
    return a


for m in MASKS:
    emit(f"fence@{m}", fence(m))
emit("fence", fence(10))


# --- dry-stone walls: capstones on top, coursed face where south is open ---
CAP = stones([(0, 0, 6, 4), (6, 0, 5, 4), (11, 0, 5, 4), (2, 4, 6, 4), (8, 4, 6, 4),
              (14, 4, 4, 4), (0, 8, 5, 4), (5, 8, 6, 4), (11, 8, 5, 4), (3, 12, 5, 4),
              (8, 12, 6, 4), (14, 12, 5, 4)], gap="R2", lit="R0", face="R1", shade="R1")
FACE = A([
    "....:.....:.....",
    "....:.....:.....",
    "::::::::::::::::",
    "..:.....:.......",
    "..:.....:.......",
    "::::::::::::::::",
    "......:.....:...",
    "################",
], {".": "R1", ":": "R2", "#": "R3"}, h=8)
FACE = stones([(0, 0, 7, 4), (7, 0, 5, 4), (12, 0, 4, 4), (3, 4, 6, 3), (9, 4, 7, 3),
               (15, 4, 4, 3)], h=8, gap="R3", lit="R1", face="R1", shade="R2")
FACE[7, :] = c("R3")


def stone_wall(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = fill("G1")
    x0, x1 = (0 if w else 2), (15 if e else 13)
    top = 0 if n else 3
    bot = 15 if s else 7
    a[top:bot + 1, x0:x1 + 1] = CAP[top:bot + 1, x0:x1 + 1]
    if not s:
        a[8:16, x0:x1 + 1] = FACE[:, x0:x1 + 1]
        a[7, x0:x1 + 1] = c("R2")                      # capstone lip
    if not n:
        a[top, x0:x1 + 1] = c("R1")
    if not w:
        a[top:bot + 1, x0] = c("R1")
        if not s:
            a[8:15, x0] = c("R1")
    if not e:
        a[top:bot + 1, x1] = c("R2")
        if not s:
            a[8:16, x1] = c("R3")
    for oa, ob, (yy, xx) in ((not n, not w, (top, x0)), (not n, not e, (top, x1)),
                             (not s, not w, (15, x0)), (not s, not e, (15, x1))):
        if oa and ob:
            a[yy, xx] = c("G1")
    return reduce_quads(a, [("R0", "R1")])


for m in MASKS:
    emit(f"stone_wall@{m}", stone_wall(m))
emit("stone_wall", stone_wall(10))


# --- cliffs: a rock face that stacks; grass lip on top, rubble at the foot -
def slabs(layout, w=16, h=16, crack="Z3", lit="Z0", face="Z1", shade="Z2"):
    """Rock face: rectangular slabs (wrapping) with lit top/left edges, shaded
    right/bottom edges and dark cracks between them."""
    a = fill(crack, w, h)
    for (x0, y0, sw, sh) in layout:
        for j in range(sh):
            for i in range(sw):
                col = face
                if j == 0 or i == 0:
                    col = lit
                if i >= sw - 2 or j == sh - 1:
                    col = shade
                if j == 0 and i >= sw - 2:
                    col = face
                a[(y0 + j) % h, (x0 + i) % w] = c(col)
    return a


def facets(seeds, w=16, h=16, sy=0.55, crack="Z3", lit="Z0", face="Z1", shade="Z2"):
    """Periodic Voronoi rock: tall facets (y distances squashed), each lit
    along its upper-left border, shaded lower-right, dark cracks between."""
    own = np.zeros((h, w), int)
    rel = np.zeros((h, w, 2))
    for y in range(h):
        for x in range(w):
            best = None
            for k, (cx, cy) in enumerate(seeds):
                dx = (x - cx + w / 2) % w - w / 2
                dy = (y - cy + h / 2) % h - h / 2
                d = dx * dx + (dy * sy) ** 2
                if best is None or d < best[0]:
                    best = (d, k, dx, dy)
            own[y, x] = best[1]
            rel[y, x] = best[2:]
    a = fill(face, w, h)
    for y in range(h):
        for x in range(w):
            k = own[y, x]
            rt = own[y, (x + 1) % w] != k
            dn = own[(y + 1) % h, x] != k
            lf = own[y, (x - 1) % w] != k
            up = own[(y - 1) % h, x] != k
            dx, dy = rel[y, x]
            if rt or dn:
                a[y, x] = c(crack)
            elif lf or up:
                a[y, x] = c(lit)
            elif dx + dy * 0.6 > 1.5:
                a[y, x] = c(shade)
    return a


ROCK = A([  # two sandstone strata per tile: lit ledge, cracked body, shade
    ",,,,,,,..,,,,,,,",
    ".,,....,#,,.....",
    "........#,....#,",
    "..:.....#.....#.",
    "........#....:#.",
    ".......::....:#.",
    "::.::::::::::::.",
    ":###########::##",
    "#,,,,,,,,,,,##,,",
    ".#,...,,.....#,.",
    ".#.......#,..#..",
    ".#,......#...#..",
    ".#.......#.....:",
    ":#:.....::...:::",
    "::::::.:::::::::",
    "######:#########",
], {",": "Z0", ".": "Z1", ":": "Z2", "#": "Z3"})


def cliff(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    a = ROCK.copy()
    if not n:
        lip = [3, 3, 2, 3, 3, 3, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3]
        for x in range(16):
            a[:lip[x], x] = c("G1")
            a[lip[x], x] = c("Z3")
            a[lip[x] + 1, x] = c("Z0")
        a[lip[0] + 1:lip[0] + 3, :] = np.where(a[lip[0] + 1:lip[0] + 3, :] == c("Z2"), c("Z1"),
                                                a[lip[0] + 1:lip[0] + 3, :])
    if not s:
        put(a, [
            " ,.: ,..:  ,.:, ",
            ",..:#,...:#,..:#",
            "################",
        ], {",": "Z0", ".": "Z1", ":": "Z2", "#": "Z3"}, 0, 13)
    if not w:
        prof = [2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1]
        for y in range(16):
            if a[y, 0] == c("G1") and not n:
                continue
            k = prof[y]
            a[y, :k] = c("G1")
            a[y, k] = c("Z0")
    if not e:
        prof = [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0]
        for y in range(16):
            k = 15 - prof[y]
            a[y, k + 1:] = c("G1")
            if a[y, k] != c("G1"):
                a[y, k] = c("Z3")
    if not n and not w:
        a[3, 0:2] = c("G1"); a[4, 0] = c("G1")
    if not n and not e:
        a[3, 14:16] = c("G1"); a[4, 15] = c("G1")
    return reduce_quads(a, [("Z2", "Z1"), ("Z0", "Z1"), ("Z3", "Z2")])


for m in MASKS:
    emit(f"cliff@{m}", cliff(m))
emit("cliff", cliff(10))


# --- interior walls: papered face where the room is below, dark cap above -
PAPER = A([
    ".:......:.......",
    ".:......:.......",
    ".:..,...:...,...",
    ".:.,.,..:..,.,..",
    ".:..,...:...,...",
    ".:......:.......",
    ".:......:.......",
    ".:......:.......",
    ".:......:.......",
    ".:......:.......",
    ".:..,...:...,...",
    ".:.,.,..:..,.,..",
    ".:..,...:...,...",
    "::::::::::::::::",
    "################",
    "################",
], {".": "E0", ",": "E1", ":": "E1", "#": "O2"})
PAPER[15, :] = c("O3")


def wall(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    if not s:
        a = PAPER.copy()
        if not n:
            a[0, :] = c("E3")
            a[1, :] = c("E2")
        return reduce_quads(a, [("E2", "E1")])
    a = fill("E3")
    if not n:
        a[0, :] = c("E2"); a[1, :] = c("E1")
    if not w:
        a[:, 0] = c("E2"); a[:, 1] = c("E1")
    if not e:
        a[:, 15] = c("E2")
    return a


for m in MASKS:
    emit(f"wall@{m}", wall(m))
emit("wall", wall(11))


# --- conservatory glazing -----------------------------------------------
GLASS_FACE = A([
    "#..,...#.,.....#",
    "#.,...,#,...,..#",
    "#,...,.#...,...#",
    "#...,..#..,...,#",
    "########.,..,..#",
    "#.....:#,..,...#",
    "#....::#..,...:#",
    "#..:.::#.....::#",
    "#.:::::#..:.:::#",
    "#::::::#.:::::.#",
    "#::::::#::::::.#",
    "################",
    "================",
    "================",
    "================",
    "================",
], {".": "Q1", ",": "Q0", ":": "Q2", "#": "R0", "=": "R2"})


def glass_wall(mask: int) -> np.ndarray:
    n, e, s, w = sides(mask)
    if not s:
        a = GLASS_FACE.copy()
        a[12, :] = c("R0")
        if not n:
            a[0, :] = c("R0")
        if not e:
            a[:12, 15] = c("R2")
        return reduce_quads(a, [("Q0", "Q1"), ("Q2", "Q1")])
    a = fill("Q2")
    for y in range(16):
        for x in range(16):
            if (x + y) % 6 == 0 and 3 < x < 13:
                a[y, x] = c("Q1")
    a[:, 7:9] = c("R0")
    a[7:9, :] = c("R0")
    if not n:
        a[0:2, :] = c("R0")
    if not s:
        a[14:16, :] = c("R0")
    if not w:
        a[:, 0:2] = c("R0")
    if not e:
        a[:, 14:16] = c("R0"); a[:, 15] = c("R2")
    return reduce_quads(a, [("Q1", "Q2")])


for m in MASKS:
    emit(f"glass_wall@{m}", glass_wall(m))
emit("glass_wall", glass_wall(11))


# ----------------------------------------------------- outdoor props -----
def prop(stem: str, rows: list[str], key: dict, bg="G1"):
    k = {" ": bg, **key}
    rows = [r[:16].ljust(16) for r in rows]
    emit(stem, A(rows, k))


emit("ledge_down", A([
    "................",
    "..,.............",
    "..:.:.......,...",
    "...:........:.:.",
    ".............:..",
    "......,.........",
    "......:.:.......",
    ".......:........",
    "................",
    "................",
    ",,,,,,,,,,,,,,,,",
    "::::::::::::::::",
    "#:##:###:##:###:",
    "################",
    ".:..:..:..:..:..",
    "................",
], GRASS_K))

FLOWER_HEADS = [(2, 1), (10, 3), (5, 9), (13, 11)]


def flowers(stem, petal, centre, sway=0, petal2=None, centre2=None):
    a = fill("G1")
    for i, (x, y) in enumerate(FLOWER_HEADS):
        p, cc = (petal2, centre2) if (petal2 and i % 2) else (petal, centre)
        put(a, [" :", ":.:", " :"][0:0] or [" . ", ".:.", " .:"], {".": "G2", ":": "G2"}, x - 1, y + 2)
        put(a, [" p ", "pcp", " p "], {"p": p, "c": cc}, x - 1 + (sway if i % 2 == 0 else -sway), y)
    return a


for k, (pt, cc, pt2, cc2) in {"flowers": ("T0", "Y1", "N1", "Y1"),
                              "flowers_red": ("K1", "K2", None, None),
                              "flowers_yellow": ("Y1", "Y2", None, None)}.items():
    emit(k, flowers(k, pt, cc, 0, pt2, cc2))
    emit(f"{k}__2", flowers(k, pt, cc, 1, pt2, cc2))

prop("bramble_bush", [
    "                ",
    "     ##  ##     ",
    "   ##::##::##   ",
    "  #::o:::::::#  ",
    " #::::::#:o::#  ",
    " #:#:o:::::::##",
    "#:::::::#::::::#",
    "#::o:#:::::o:::#",
    "#:::::::o::#:::#",
    "#:#::::::::::::#",
    " #:::o::#:::o:# ",
    " ##:::::::::::# ",
    "  ###:::::::### ",
    "    ##########  ",
    "                ",
    "                ",
][:5] + [
    " #:#:o:::::::## ",
    "#:::::::#::::::#",
    "#::o:#:::::o:::#",
    "#:::::::o::#:::#",
    "#:#::::::::::::#",
    " #:::o::#:::o:# ",
    " ##:::::::::::# ",
    "  ###:::::::### ",
    "    ##########  ",
    "                ",
    "                ",
], {":": "L2", "#": "X3", "o": "X1"})

prop("rock", [
    "                ",
    "                ",
    "     ######     ",
    "   ##,,,,..##   ",
    "  #,,,,,.....#  ",
    " #,,,,,.......# ",
    " #,,,.........# ",
    "#,,,..........:#",
    "#.............:#",
    "#............::#",
    "#..........:::# ",
    " #:......::::#  ",
    " ##::::::::::#  ",
    "   ##########   ",
    "                ",
    "                ",
], {",": "R0", ".": "R1", ":": "R2", "#": "R3"})

prop("sign", [
    "                ",
    " ############## ",
    " #,,,,,,,,,,,,# ",
    " #,..........:# ",
    " #,.##.###.#.:# ",
    " #,..........:# ",
    " #,.###.##.#.:# ",
    " #,..........:# ",
    " #:::::::::::# ",
    " ############## ",
    "      #,.#      ",
    "      #,.#      ",
    "      #,.#      ",
    "      #,.#      ",
    "     :####:     ",
    "                ",
][:8] + [
    " #::::::::::::# ",
    " ############## ",
    "      #,.#      ",
    "      #,.#      ",
    "      #,.#      ",
    "      #,.#      ",
    "     :####:     ",
    "                ",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3"})
OUT["sign"] = reduce_quads(OUT["sign"], [("O2", "O3"), ("G1", "O1")])

prop("mailbox", [
    "                ",
    "                ",
    "    #######     ",
    "   #,,,,,,,#    ",
    "  #,.......#rr  ",
    "  #,.......#rr  ",
    "  #,.......#r   ",
    "  #,.......#r   ",
    "  #,..##...#    ",
    "  #...##...#    ",
    "   ########     ",
    "      #ot#      ",
    "      #ot#      ",
    "      #ot#      ",
    "     :####:     ",
    "                ",
], {",": "U0", ".": "U1", "#": "U3", "r": "B1", "o": "O1", "t": "O2", ":": "G2"})
OUT["mailbox"] = reduce_quads(OUT["mailbox"], [("U0", "U1"), ("G2", "G1")])

prop("mushrooms", [
    "                ",
    "                ",
    "    ###         ",
    "  #rrwrr#       ",
    " #rwrrrwr#      ",
    " #rrrrrrr#  ##  ",
    "  ###w###  #rwr#",
    "    #w#   #rrrr#",
    "    #w#    ##w##",
    "   :###:    #w# ",
    "            ### ",
    "                ",
    "                ",
    "         ##     ",
    "        #rw#    ",
    "         #w     ",
], {"r": "B1", "w": "E0", "#": "B3", ":": "G2"})
OUT["mushrooms"] = reduce_quads(OUT["mushrooms"], [("G2", "G1")])

prop("stump", [
    "                ",
    "                ",
    "                ",
    "    ########    ",
    "  ##,,,,,,,,##  ",
    " #,,......,,,,# ",
    " #,..,,,,...,,# ",
    " #,..,..,...,,# ",
    " :#,,....,,,,#: ",
    " :##,,,,,,,,##: ",
    " ::::::::::::::: "[:16],
    " :#::#:::#:::#: ",
    " ::#:::#::::#:: ",
    "#::::#:::#::::::#"[:16],
    "  ##  ####  ##  ",
    "                ",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3"})
OUT["stump"] = reduce_quads(OUT["stump"], [("O1", "O0"), ("O0", "O1")])

prop("log", [
    "                ",
    "                ",
    "                ",
    "   g  gg   g    ",
    "  ############# ",
    " #,,#:::::::::::#",
    "#,..,#..:...:..:#",
    "#.,,.#.:...:...:#",
    "#.,,.#:...:..:.:#",
    "#,..:#...:...:.:#",
    " #::#::::::::::# ",
    "  ############# ",
    "   ::::::::::::  ",
    "                ",
    "                ",
    "                ",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3", "g": "G2"})
OUT["log"] = reduce_quads(OUT["log"], [("G2", "G1"), ("O0", "O1")])
OUT["log"][12, 3:15] = np.where(OUT["log"][12, 3:15] == c("O2"), c("G2"), OUT["log"][12, 3:15])
OUT["log"] = reduce_quads(OUT["log"], [("G2", "G1")])

prop("lamp_post", [
    "      ####      ",
    "     #yyyy#     ",
    "    #y,,,yy#    ",
    "    #y,,,yy#    ",
    "    #yyyyyy#    ",
    "     ######     ",
    "       ##       ",
    "       #:       ",
    "       #:       ",
    "       #:       ",
    "       #:       ",
    "       #:       ",
    "       #:       ",
    "      ####      ",
    "     #::::#     ",
    "      ::::      ",
], {"y": "Y1", ",": "Y0", "#": "U3", ":": "U2"})
OUT["lamp_post"] = reduce_quads(OUT["lamp_post"], [("U2", "U3")])

prop("barrel", [
    "                ",
    "    ########    ",
    "  ##,,,,,,::##  ",
    "  #,,,,,,,:::#  ",
    "  ##,,,,,,::##  ",
    "  #h########h#  ",
    "  #,..,...::.#  ",
    "  #,..,...::.#  ",
    "  hhhhhhhhhhhh  ",
    "  #,..,...::.#  ",
    "  #,..,...::.#  ",
    "  #,..,...::.#  ",
    "  hhhhhhhhhhhh  ",
    "  #,..,...:::#  ",
    "   ##########   ",
    "                ",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3", "h": "R2"})
OUT["barrel"] = reduce_quads(OUT["barrel"], [("R2", "O3"), ("O0", "O1")])

prop("crate", [
    "                ",
    "                ",
    " ############## ",
    " #,,,,,,,,,,,:# ",
    " #,##########:# ",
    " #,#,.....,#.:# ",
    " #,#.,....,#.:# ",
    " #,#..,..,.#.:# ",
    " #,#...,,..#.:# ",
    " #,#...,,..#.:# ",
    " #,#..,..,.#.:# ",
    " #,#.,....,#.:# ",
    " #,##########:# ",
    " #::::::::::::# ",
    " ############## ",
    "                ",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3"})
OUT["crate"] = reduce_quads(OUT["crate"], [("O0", "O1"), ("O2", "O3")])

prop("bench", [
    "                ",
    "                ",
    "                ",
    "################",
    ",,,,,,,,,,,,,,,,",
    "################",
    ",,,,,,,,,,,,,,,,",
    "################",
    "                ",
    "################",
    ",,,,,,,,,,,,,,,,",
    "................",
    "################",
    " ##          ## ",
    " ##          ## ",
    "                ",
], {",": "O0", ".": "O1", "#": "O3"})

prop("gate_open", [
    " ##          ## ",
    "#,.#        #,.#",
    "#,.#        #,.#",
    "#,.#,       #,.#",
    "#,.#,.      #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,.#     #,.#",
    "#,.#,#      #,.#",
    "####,       ####",
    "                ",
    "                ",
], {",": "O0", ".": "O1", "#": "O3"})

prop("haybale", [
    "                ",
    "                ",
    "                ",
    "  ############  ",
    " #,,,,,,,,,,,,# ",
    " #,.,.,.,.,.,:# ",
    " #.,.,.,.,.,.:# ",
    " ############## ",
    " #,..,..:..,.:# ",
    " #.,..:...,..:# ",
    " #..,...,..:.:# ",
    " ############## ",
    " #:..:..,..:.:# ",
    " #::::::::::::# ",
    "  ############  ",
    "                ",
], {",": "Y0", ".": "Y1", ":": "Y2", "#": "Y3"})

prop("scarecrow", [
    "      ####      ",
    "    ########    ",
    "   ##,,,,,,##   ",
    "  ############  ",
    "     #ssss#     ",
    "     #s#s##     ",
    "     #ssss#     ",
    " ############## ",
    " #rrrrrrrrrrrr# ",
    " ###rr#rrr#r### ",
    "    #rrrrrrr#   ",
    "    #rr#rrrr#   ",
    "    ####:####   ",
    "        :       ",
    "        :       ",
    "       ###      ",
], {",": "O0", "#": "O3", "s": "E0", "r": "B1", ":": "O2"})

# reeds: a dense, neutral reed bed (works beside water, bog or grass) as the
# base tile; reeds@mask (if the engine groups reeds with water) are reeds
# rising out of open water with shorelines on the open sides.
REED_K = {"#": "L3", ":": "L2", "s": "G2", "l": "G1", "o": "O2", "O": "O3", "w": "W2", "v": "W1"}
emit("reeds", A([
    "#o##s#o#s##o#s##",
    "#o#ls#o#ls#o#ls#",
    "#o#ls#O#ls#O#ls#",
    "#O#ls#s#ls#s#ls#",
    "#s#l:#s#l:#s#l:#",
    "#s#l:#s:l:#s#l:#",
    "#s:l:#s:l:#s:l:#",
    "#sls:#s:ls#sls:#",
    ":slss:slsss:sls:",
    ":sls:#sls:#:sls:",
    "#:s:#::s:#::s:##",
    "::s:::ss:::ss:::",
    "#s:s#:s:s#s:s:#:",
    "ww:ww::ww::w::ww",
    "vwwwwwvwwwwvwwww",
    "wwvwwwwwwvwwwwvw",
], REED_K))
OUT["reeds"] = reduce_quads(OUT["reeds"], [("G1", "G2"), ("O3", "O2"), ("W1", "W2")])

REEDS_IN_WATER = A([
    "..o....o...o....",
    ".so...#o..so..o.",
    ".s#..s#s..s#.so.",
    ".s#..s#s.ss#.s#.",
    "ss#.ss#s.s#..s#.",
    "s#..s#.s.s#.ss#.",
    "s#.ss#ss.s#.s#..",
    "s#.s#.s#ss#ss#..",
    "s#ss#.s#s#.s#...",
    "#.s#..s#s#.s#.s.",
    "..s#.ss#s#ss#ss#",
    "..##.s##s#s#.s#.",
    ".,..,##.##.#.##.",
    "..,,......,,....",
    "................",
    "....,,.......,,.",
], {".": "W1", "s": "G2", "#": "L3", "o": "O2", ",": "W0"})
REED_RED = (("G0", "G1"), ("W2", "W1"), ("W3", "W1"), ("W0", "W1"), ("O2", "L3"), ("G3", "L3"))
for m in MASKS:
    emit(f"reeds@{m}", shore(REEDS_IN_WATER, m, 1, reduce=REED_RED))

GARDEN = A([
    "::::::::::::::::",
    ".,.,.,.,.,.,.,.,",
    "..g....g....g...",
    ".gGg..gGg..gGg..",
    "################",
    "::::::::::::::::",
    ".,.,.,.,.,.,.,.,",
    "................",
    "################",
    "::::::::::::::::",
    ".,.,.,.,.,.,.,.,",
    "...g....g....g..",
    "..gGg..gGg..gGg.",
    "################",
    "::::::::::::::::",
    ".,.,.,.,.,.,.,.,",
], {".": "D1", ",": "D0", ":": "D2", "#": "D3", "g": "G1", "G": "G2"})
emit("garden_plot", reduce_quads(GARDEN, [("D0", "D1"), ("D2", "D1")]))

CROPS = A([
    "y.:.y.:.y.:.y.:.",
    "Y,:.Y,:.Y,:.Y,:.",
    ".,:,.,:,.,:,.,:,",
    ":,::.,::.,::.,::",
    ".,#..,#..,#..,#.",
    ":.#:.:#::.#:.:#:",
    ".,#..,#..,#..,#.",
    "##############=#",
    ".:y.:.y.:.y.:.y.",
    ".:Y,:.Y,:.Y,:.Y,",
    ",.,:,.,:,.,:,.,:",
    ":.,::.,::.,::.,:",
    "..,#..,#..,#..,#",
    ":.:#:.:#::.#:.:#",
    "..,#..,#..,#..,#",
    "################",
], {".": "G2", ",": "G1", ":": "L2", "#": "L3", "y": "Y1", "Y": "Y2", "=": "L3"})
emit("crops", reduce_quads(CROPS, [("Y2", "Y1"), ("G1", "G2")]))

BRIDGE = A([
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:............:#",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:...........,:#",
    "#:............:#",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:...,........:#",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:............:#",
    "#:############:#",
], {",": "O0", ".": "O1", ":": "O2", "#": "O3"})
emit("bridge", BRIDGE)
for m in MASKS:   # only used if the engine groups bridges with water
    emit(f"bridge@{m}", BRIDGE)


OUT["rock"] = reduce_quads(OUT["rock"], [("R0", "R1")])
OUT["haybale"] = reduce_quads(OUT["haybale"], [("Y0", "Y1")])


# ------------------------------------------------------------ interiors ---
FLOOR_K = {",": "O0", ".": "O1", ":": "O2", "#": "O3"}


def planks(seams, knots=()):
    """Floorboards 4px tall; `seams` = x of the butt joint in each board row."""
    a = np.zeros((16, 16), np.int16)
    for y in range(16):
        r = y % 4
        a[y, :] = c(("O1", "O1", "O1", "O2")[r])
    for row, sx in enumerate(seams):
        y0 = row * 4
        a[y0:y0 + 3, sx] = c("O2")
        a[y0, (sx + 1) % 16] = c("O0")
        a[y0, (sx + 2) % 16] = c("O0")
        a[y0 + 1, (sx + 1) % 16] = c("O0")
    for (x, y) in knots:
        a[y, x] = c("O2")
    return a


FLOOR = planks([8, 3, 12, 6], [(13, 1), (4, 9)])
emit("floor_wood", FLOOR)
emit("floor_wood~1", planks([5, 11, 2, 9], [(9, 6)]))
emit("floor_wood~2", planks([13, 6, 9, 1], [(3, 13)]))
emit("floor_wood~3", planks([2, 9, 14, 5], [(11, 2), (7, 10)]))

emit("floor_tile", A([
    ",,,,,,,:.......:",
    ",oooooo:.......:",
    ",oooooo:.......:",
    ",oooooo:.......:",
    ",oooooo:.......:",
    ",oooooo:.......:",
    ",oooooo:.......:",
    "::::::::::::::::",
    "........,,,,,,,:",
    "........,oooooo:",
    "........,oooooo:",
    "........,oooooo:",
    "........,oooooo:",
    "........,oooooo:",
    "........,oooooo:",
    "::::::::::::::::",
], {",": "T0", "o": "R0", ".": "E1", ":": "R1"}))
OUT["floor_tile"] = reduce_quads(OUT["floor_tile"], [("T0", "R0")])

emit("floor_greenhouse", A([
    ",,,,,,,:,,,,,,,:",
    ",......:,......:",
    ",......:,......:",
    ",.....::,......:",
    ",......:,......:",
    ",......:,....#.:",
    ",......:,...#..:",
    "::::::::::::::::",
    ",,,:,,,,,,,,:,,,",
    "...:,.......:,..",
    "...:,.......:,..",
    "...:,.......:,..",
    "#..:,.......:,..",
    ".#.:,.......:,.#",
    "...:,......::,..",
    "::::::::::::::::",
], {",": "S0", ".": "S1", ":": "S2", "#": "G2"}))

emit("rug", A([
    ".......:........",
    "......:y:.......",
    ".....:y.y:......",
    "....:y...y:.....",
    "...:y..:..y:....",
    "..:y..:y:..y:...",
    ".:y..:y,y:..y:..",
    ":y..:y,,,y:..y:.",
    ".:y..:y,y:..y:..",
    "..:y..:y:..y:...",
    "...:y..:..y:....",
    "....:y...y:.....",
    ".....:y.y:......",
    "......:y:.......",
    ".......:........",
    "................",
], {".": "B1", ":": "B2", "y": "Y1", ",": "B3"}))
emit("mat_exit", A([
    "################",
    "#::::::::::::::#",
    "#:............:#",
    "#:............:#",
    "#:.....,,.....:#",
    "#:....,..,....:#",
    "#:...,....,...:#",
    "#:..,..,,..,..:#",
    "#:....,..,....:#",
    "#:...,....,...:#",
    "#:..,......,..:#",
    "#:............:#",
    "#:............:#",
    "#::::::::::::::#",
    "################",
    "#.#.#.#.#.#.#.#.",
], {"#": "B3", ":": "B2", ".": "B1", ",": "Y1"}))


def on_paper(rows, key):
    """A wall-mounted object drawn over the papered wall face."""
    a = PAPER.copy()
    put(a, rows, key, 0, 0)
    return a


emit("window", reduce_quads(on_paper([
    "                ",
    "  ############  ",
    "  #,,,,#,,,,:#  ",
    "  #,ww,#,ww::#  ",
    "  #,w,,#,w,::#  ",
    "  #,,,:#,,,::#  ",
    "  ############  ",
    "  #,,,:#,,:::#  ",
    "  #,,::#,,:::#  ",
    "  #,:::#,::::#  ",
    "  ############  ",
    " ############## ",
], {"#": "O3", ",": "W1", ":": "W2", "w": "W0"}), [("E1", "E0"), ("W0", "W1"), ("W2", "W1")]))

emit("fireplace", reduce_quads(on_paper([
    "################",
    "#,,,,,,,,,,,,,,#",
    "################",
    " #,.:#,..#,..:# ",
    " #,.###########",
    " #,#         #:#",
    " #,#   mm    #:#",
    " #,#  mym m  #:#",
    " #,# mmyymm  #:#",
    " #,# myyyym  #:#",
    " #,#mmyooymm #:#",
    " #,#ttttttttt#:#",
    " #,#tttttttttt:#",
    " #.############ ",
    "################",
    "################",
], {"#": "R3", ",": "R0", ".": "R1", ":": "R2", "m": "M1", "y": "Y1", "o": "T0", "t": "O3"}),
    [("E1", "E0"), ("R0", "R1"), ("O3", "R3"), ("T0", "Y1"), ("R2", "R3"), ("E0", "R1")]))

FURN_K = {",": "O0", ".": "O1", ":": "O2", "#": "O3", "s": "E3"}

emit("counter", A([
    "################",
    ",,,,,,,,,,,,,,,,",
    ",..............,",
    "................",
    "::::::::::::::::",
    "################",
    "#,,,,,,,,,,,,,,#",
    "#.::::::#:::::.#",
    "#.:....:#:....:#",
    "#.:.##.:#:.##.:#",
    "#.:....:#:....:#",
    "#.::::::#:::::.#",
    "#..............#",
    "################",
    "ssssssssssssssss",
    "ssssssssssssssss",
], FURN_K))
OUT["counter"] = reduce_quads(OUT["counter"], [("O0", "O1")])

emit("table", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#,............:#",
    "#,....,.......:#",
    "#,............:#",
    "#,.........,..:#",
    "#,............:#",
    "#,............:#",
    "#::::::::::::::#",
    "################",
    "#::::::::::::::#",
    "################",
    "s#:#ssssssss#:#s",
    "s#:#ssssssss#:#s",
    "s###ssssssss###s",
    "ssssssssssssssss",
], FURN_K))

emit("bookshelf", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#rrbbrbbr#ggyyg#",
    "#rrbbrbbr#ggyyg#",
    "#rrbbrbbr#ggyyg#",
    "#rrbbrbbr#ggyyg#",
    "#rrbbrbbr#ggyyg#",
    "################",
    "#,,,,,,,,,,,,,,#",
    "#gg#yyggyrrbrrb#",
    "#gg#yyggyrrbrrb#",
    "#gg#yyggyrrbrrb#",
    "#gg#yyggyrrbrrb#",
    "#gg#yyggyrrbrrb#",
    "################",
    "#ss##########ss#",
], {**FURN_K, "r": "B1", "b": "U1", "g": "G2", "y": "Y1"}))
OUT["bookshelf"] = reduce_quads(OUT["bookshelf"], [("O0", "O3"), ("E3", "O3")])

PLANT = {"g": "G1", "G": "G2", "d": "L3", "c": "B1", "C": "B2", "h": "B0", " ": "S1", "f": "S2"}
emit("plant_pot", reduce_quads(A([
    "      dd dd     ",
    "   dd dgGdgdd   ",
    "  dgGdgGGdgGGd  ",
    "  dggGdGGdgGd   ",
    " ddgGGdGdgGGdd  ",
    " dgggGGdgGGgGGd ",
    " dGgGGGdGGgGGd  ",
    "  dddGGdGGddd   ",
    "   CCCCCCCCCC   ",
    "   hhcccccccC   ",
    "    hccccccC    ",
    "    hccccccC    ",
    "    hcccccCC    ",
    "     CCCCCC     ",
    "    ffffffff    ",
    "                ",
], PLANT), [("h", "c") and ("B0", "B1"), ("S2", "S1")]))

emit("potted_tree", reduce_quads(A([
    "    dddddd      ",
    "  ddgggGGGdd    ",
    " dgg,ggGGGGGd   ",
    " dgggggGGoGGGd  ",
    "dGggoGGGGGGGGd  ",
    "dGGGGGGGGGGGdd  ",
    " dGGGGoGGGGGd   ",
    "  ddGGGdGGdd    ",
    "    ddCddd      ",
    "      Cd        ",
    "  CCCCCCCCCC    ",
    "  hhcccccccC    ",
    "   hccccccC     ",
    "   hccccccC     ",
    "    CCCCCC      ",
    "   ffffffff     ",
], {**PLANT, ",": "G0", "o": "Y1"}), [("G0", "G1"), ("B0", "B1"), ("S2", "S1"), ("Y1", "G1")]))

emit("planter_bed", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#:::::::::::::##",
    "#eegEEEEgEEEEg:#",
    "#egGgEEgGgEEgG:#",
    "#eeGeeeeGeeeeG:#",
    "#eEeeeEeeeeEee:#",
    "#eeeeEeeeEeeeE:#",
    "################",
    "#,,,,,,,,,,,,,,#",
    "#..............#",
    "#..............#",
    "#::::::::::::::#",
    "################",
    "ssssssssssssssss",
    "ssssssssssssssss",
], {**FURN_K, "e": "D2", "E": "D3", "g": "G1", "G": "G2"}))
OUT["planter_bed"] = reduce_quads(OUT["planter_bed"], [("O0", "O2"), ("D3", "D2"), ("G1", "G2")])

emit("bed", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#,#wwwwwwwwww#:#",
    "#,#wwwwwwwwwW#:#",
    "#,#WWWWWWWWWW#:#",
    "#,############:#",
    "#,#bbbbbbbbbb#:#",
    "#,#bwbbbbbbbB#:#",
    "#,#bbbbbbwbbB#:#",
    "#,#bbbbbbbbbB#:#",
    "#,#bbbwbbbbbB#:#",
    "#,#BBBBBBBBBB#:#",
    "#,############:#",
    "#::::::::::::::#",
    "################",
    "s#ssssssssssss#s",
], {**FURN_K, "w": "T0", "W": "R1", "b": "U1", "B": "U2"}))
OUT["bed"] = reduce_quads(OUT["bed"], [("O0", "O1"), ("O2", "O3"), ("E3", "O3"), ("R1", "T0"), ("U2", "U1")])

emit("specimen_cabinet", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#::::::::::::::#",
    "################",
    "#QwqqqQ##wqqqQ##",
    "#Qqgqq#Q#qqyqQ##",
    "#QqgGgQ##qqGqQ##",
    "#QqqGqQ##qgGqQ##",
    "################",
    "#..............#",
    "#.###.####.###.#",
    "#.#,#.#,,#.#,#.#",
    "#.###.####.###.#",
    "#::::::::::::::#",
    "################",
    "ssssssssssssssss",
], {**FURN_K, "Q": "O3", "q": "Q1", "w": "Q0", "g": "G2", "G": "L2", "y": "Y1"}))
OUT["specimen_cabinet"] = reduce_quads(OUT["specimen_cabinet"],
                                       [("Q0", "Q1"), ("Y1", "Q1"), ("L2", "G2"), ("O0", "O1"), ("E3", "O3"),
                                        ("O2", "O3")])

emit("stairs_up", A([
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:::::::::::::##",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:::::::::::::##",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:::::::::::::##",
    "#:############:#",
    "#:,,,,,,,,,,,,:#",
    "#:............:#",
    "#:::::::::::::##",
    "#:############:#",
], FURN_K))
OUT["stairs_up"] = reduce_quads(OUT["stairs_up"], [("O0", "O1")])

emit("stairs_down", A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#,############:#",
    "#,#..........#:#",
    "#,#::::::::::#:#",
    "#,############:#",
    "#,#::::::::::#:#",
    "#,############:#",
    "#,#kkkkkkkkkk#:#",
    "#,############:#",
    "#,#kkkkkkkkkk#:#",
    "#,kkkkkkkkkkkk:#",
    "#,kkkkkkkkkkkk:#",
    "#,kkkkkkkkkkkk:#",
    "#::::::::::::::#",
    "################",
], {",": "R0", ".": "R1", ":": "R2", "#": "R3", "k": "T3"}))
OUT["stairs_down"] = reduce_quads(OUT["stairs_down"], [("R1", "R0"), ("R0", "R2")])

emit("void", fill("T3"))

CHAIR = A([
    "................",
    "...##########...",
    "...#,,,,,,,:#...",
    "...#,######:#...",
    "...#,#....#:#...",
    "...#,######:#...",
    "...##########...",
    "..############..",
    "..#,,,,,,,,,:#..",
    "..#,........:#..",
    "..#::::::::::#..",
    "..############..",
    "..#:#......#:#..",
    "..#:#ssssss#:#..",
    "..###ssssss###..",
    "................",
], {**FURN_K, ".": "O1", "s": "O2"})
CHAIR_MASK = A([
    "................",
    "...##########...",
    "...##########...",
    "...##########...",
    "...##########...",
    "...##########...",
    "...##########...",
    "..############..",
    "..############..",
    "..############..",
    "..############..",
    "..############..",
    "..###......###..",
    "..############..",
    "..############..",
    "................",
], {".": "T3", "#": "T0"})
emit("chair", reduce_quads(np.where(CHAIR_MASK == c("T0"), CHAIR, FLOOR), [("O0", "O1")]))

STOVE = A([
    "......##........",
    "......#:#.......",
    "......#:#.......",
    ".##############.",
    ".#,,,,,,,,,,,,#.",
    ".#,####,,####:#.",
    ".#,#kk#,,#kk#:#.",
    ".#,####,,####:#.",
    ".#::::::::::::#.",
    ".#,##########:#.",
    ".#,#mmyymmmm#:#.",
    ".#,#mmmmmyym#:#.",
    ".#,##########:#.",
    ".#::::::::::::#.",
    ".##############.",
    "..#..........#..",
], {",": "R1", ":": "R2", "#": "R3", "k": "T3", "m": "M2", "y": "M0", ".": "T0"})
stove = np.where(STOVE == c("T0"), FLOOR, STOVE)
stove[15, 2:14] = np.where(stove[15, 2:14] == c("R3"), c("R3"), c("O2"))
emit("stove", reduce_quads(stove, [("T3", "R3"), ("M0", "M2"), ("O0", "O1"), ("R1", "R2"), ("O2", "R3")]))

emit("workbench", reduce_quads(A([
    "################",
    "#,,,,,,,,,,,,,,#",
    "#,.cCc..,....::#",
    "#,cCCCc.rR...::#",
    "#,.cCc..rR.##..#",
    "#,..,.....##,..#",
    "#,........#....#",
    "#::::::::::::::#",
    "################",
    "#:#:::::::::::##",
    "#:############:#",
    "#:#ssssssssss#:#",
    "#:#ssssssssss#:#",
    "#:#ssssssssss#:#",
    "###ssssssssss###",
    "ssssssssssssssss",
], {**FURN_K, "c": "B1", "C": "B2", "r": "Y1", "R": "Y2"}), [("Y2", "Y1"), ("O0", "O1"), ("B2", "O3"),
                                                              ("E3", "O3"), ("O2", "O3")]))

emit("microscope", reduce_quads(A([
    "######kk########",
    "#,,,,#wk#,,,,,,#",
    "#,....#kk#.....#",
    "#,.....#kk#....#",
    "#,....#kkk#....#",
    "#,....#k#kk#...#",
    "#,...##k####...#",
    "#,...#kkkkk:...#",
    "#,...:#k#:::...#",
    "#,..#kkkkkk#...#",
    "#::::::::::::::#",
    "################",
    "#:#ssssssssss#:#",
    "#:#ssssssssss#:#",
    "###ssssssssss###",
    "ssssssssssssssss",
], {**FURN_K, "k": "R3", "w": "R1"}), [("R1", "O0"), ("O2", "O3"), ("E3", "O3"), ("O0", "O1")]))


def check():
    bad = {k: quad_counts(a) for k, a in OUT.items() if quad_counts(a) > 4}
    return bad


def build() -> None:
    bad = check()
    for stem, a in OUT.items():
        gbc.save(to_img(a), f"tiles/{stem}.png")
    review()
    if bad:
        print("over 4 colours/quadrant:", bad)


# ---------------------------------------------------------------- review ---
AUTOTILE = {  # mirrors src/contracts/constants.ts
    "water": "water", "pond_lily": "water", "water_channel": "water",
    "path": "path", "stone_path": "stone_path", "dirt": "dirt", "sand": "sand",
    "bog": "bog", "boardwalk": "boardwalk", "tall_grass": "tall_grass",
    "hedge": "hedge", "fence": "fence", "stone_wall": "stone_wall", "cliff": "cliff",
    "glass_wall": "glass_wall", "wall": "wall",
    "tree": "tree", "maple_tree": "maple", "tapped_maple": "maple",
    "reeds": "water", "bridge": "water",
}
LEGEND = {  # mirrors src/world/build.ts
    ".": "grass", ",": "tall_grass", "*": "flowers", ":": "path", "+": "dirt", "s": "sand",
    "~": "water", "b": "bog", "=": "boardwalk", "v": "ledge_down", "T": "tree",
    "M": "maple_tree", "X": "tapped_maple", "H": "hedge", "B": "bramble_bush", "o": "rock",
    "#": "fence", "S": "sign", "m": "mailbox", "w": "floor_wood", "t": "floor_tile",
    "g": "floor_greenhouse", "r": "rug", "E": "mat_exit", "W": "wall", "O": "window",
    "C": "counter", "D": "table", "K": "bookshelf", "p": "plant_pot", "P": "planter_bed",
    "Z": "bed", "c": "specimen_cabinet", "U": "stairs_up", "u": "stairs_down",
    "%": "water_channel", "_": "void", "@": "path", "f": "flowers_red", "y": "flowers_yellow",
    "1": "stone_path", "2": "bridge", "3": "stump", "4": "log", "5": "mushrooms",
    "6": "lamp_post", "7": "barrel", "8": "crate", "9": "bench", "0": "pond_lily", "q": "reeds",
    "A": "cliff", "L": "stone_wall", "G": "garden_plot", "k": "crops", "j": "scarecrow",
    "n": "haybale", "N": "gate_open", "F": "fireplace", "V": "stove", "Y": "potted_tree",
    "I": "glass_wall", "J": "workbench", "Q": "microscope", "h": "chair",
}
ALTS = ("grass", "path", "dirt", "sand", "floor_wood", "bog")


def render_map(rows: list[str], frame=1, structures=()) -> Image.Image:
    """Compose a map the way the engine will: autotile masks (OOB = same),
    position-hash ground variants, then structures from disk."""
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    keys = [[LEGEND[ch] for ch in r] for r in rows]
    for y in range(h):
        for x in range(w):
            k = keys[y][x]
            stem = k
            grp = AUTOTILE.get(k)
            if grp:
                def same(xx, yy):
                    if not (0 <= xx < w and 0 <= yy < h):
                        return True
                    return AUTOTILE.get(keys[yy][xx]) == grp
                m = same(x, y - 1) * 1 | same(x + 1, y) * 2 | same(x, y + 1) * 4 | same(x - 1, y) * 8
                if f"{k}@{m}" in OUT:
                    stem = f"{k}@{m}"
            if stem == k and k in ALTS:
                hsh = ((x * 73856093) ^ (y * 19349663)) & 0xFFFF
                alt = hsh % 4
                if alt and f"{k}~{alt}" in OUT:
                    stem = f"{k}~{alt}"
            if frame == 2 and f"{stem}__2" in OUT:
                stem = f"{stem}__2"
            if stem in OUT:
                im.paste(to_img(OUT[stem]), (x * 16, y * 16))
            else:
                im.paste((255, 0, 255, 255), (x * 16, y * 16, x * 16 + 16, y * 16 + 16))
    for key, sx, sy in structures:
        p = gbc.ASSETS / "structures" / f"{key}.png"
        if p.exists():
            s = Image.open(p).convert("RGBA")
            im.alpha_composite(s, (sx * 16, sy * 16))
    return im


TEST_MAP = [
    "TTTTTTTTTTTTTTTTTTTTTTTT",
    "TTTTT....TTTTT..MMMMXMMM",
    "TTT......,,,,TT...MMMMMM",
    "TT..~~~~.,,,,,....MM..MM",
    "T..~~~~~~.,,,......:...M",
    "T.~~~..~~~.,..*....:...M",
    "T.~~.oo.~~.....5...::::.",
    "Tq~~~..~~0.3...y......:.",
    "T..~~~~~00q....f.....::.",
    "T...~~~~~......HHHHH.:..",
    "T.4.........HHHH...H.:..",
    "T..:::::::..H....H.H.:..",
    "T..:.....:..H.HHHH.H.:..",
    "T..:.TT..::.H......H.::.",
    "T..:.TT...:.HHHHHHHH..:.",
    "T..:......:...........:.",
    "AAAAAAA...::::::::::::..",
    "AAAAAAA...:..++++..sss..",
    "......A...:..+++...sss..",
    "..LLLLLNLLL..+++.#######",
    "..L...........1..#kkGGG#",
    "..L.7.8.9.6...11.#kkGGG#",
    "..L.......n.j..1.#######",
    "..........bbbb==b.......",
    "..........bb=====qq.....",
    "TTTTTTTTTTbbbbbbbTTTTTTT",
]
TEST_ROOM = [
    "WWOOWWFWWWOOWWWWIIIIIW",
    "WKKcwwwwwwwwwWVwgggYgW",
    "WwwwwwwwDDwwwWwwgpgggW",
    "WwhwwwwwDDwwwWwwgggg%W",
    "WwwwwrrwwwwwwwwwgJQgg%",
    "WwwwwrrwwwwwwWwwPPPPg%",
    "WWWWWWEWWWWWWWWWWWWWWW",
]


def review() -> None:
    from PIL import ImageDraw
    base = [(k, to_img(a)) for k, a in OUT.items() if "@" not in k]
    cells = []
    for k, im in base:
        patch = Image.new("RGBA", (48 + 4 + 16, 48))
        for y in range(3):
            for x in range(3):
                patch.paste(im, (x * 16, y * 16))
        patch.paste(im, (52, 0))
        cells.append((f"{k} q{quad_counts(OUT[k])}", patch))
    gbc.grid_sheet(cells, 8, 3).save(gbc.REVIEW / "tiles.png")
    # autotile mask grids: masks laid out so neighbouring cells read as a blob
    cells = []
    for k in AUTOTILE:
        if f"{k}@0" not in OUT:
            continue
        g = Image.new("RGBA", (4 * 17, 4 * 17), (255, 0, 255, 255))
        for m in MASKS:
            g.paste(to_img(OUT[f"{k}@{m}"]), ((m % 4) * 17, (m // 4) * 17))
        cells.append((k, g))
    gbc.grid_sheet(cells, 5, 3).save(gbc.REVIEW / "tiles_auto.png")
    for f in (1, 2):
        out = render_map(TEST_MAP, f, structures=())
        gbc.zoom(out, 3).save(gbc.REVIEW / f"tiles_map{'' if f == 1 else '_2'}.png")
    gbc.zoom(render_map(TEST_ROOM), 3).save(gbc.REVIEW / "tiles_room.png")


if __name__ == "__main__":
    if "-n" in sys.argv:          # review sheets only, don't touch public/
        review()
        print("over 4:", check())
    else:
        build()
    print(len(OUT), "tiles")
