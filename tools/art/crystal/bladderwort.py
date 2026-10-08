"""Original Crystal-rule Utricularia vulgaris: bladderwort_sprig -> bladderwort.

bladderwort_sprig (teen): COILED. A floating tangle of finely forked,
thread-like leaves (green lace) hangs from a stolon just under a white
water line; five tiny pale bladders sit along the threads, each with a
white highlight and a little black bristle at its trap door. The curled
stem tip coils up out of the water, leaning toward the foe.
bladderwort (adult): LUNGING. The same lace trap mass below the water
line, now with an emergent stalk thrust up and out toward the foe. It
carries five bright yellow two-lipped flowers: a small upper lip, a big
rounded lower lip with faint radiating lines, and a spur curving below.

Face discipline: bladders are pale ovals with light highlights (no dark
sacs or dots), never two side by side; the flowers' throats are closed by
the palate (no dark slit); every black mark joins the outline network.

Intro (the VACUUM TRAP): one bladder is set (walls drawn in), then snaps:
it inflates, gulps and a tiny white water swirl appears at its door; the
lace sways, rebounds and settles. The stolon, water line, coil and flower
stalk stay registered.
Sport: the bronze-red anthocyanin colouring the leaves take on in sunny,
nutrient-poor water: a natural colour form, not a named cultivar
(docs/SPORTS.md). All geometry is original; no other game's sprites are used.

Rubric (docs/CREATURES.md §9): bladderwort_sprig 8/10 (the lace is a
little busy at 1x); bladderwort 8/10 (the bladders share the flowers'
yellow, so they read less pale than the sprig's).
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, tones, rim_white, moving_boxes, hop, icon_arr, _pix

TOOL = "tools/art/crystal/bladderwort.py"
IDS = ["bladderwort_sprig", "bladderwort"]
# Water-green leaves in the dark slot; the mid slot is the pale bladder
# green of the sprig, ripening to the adult's bright flower yellow.
PALS = {
    "bladderwort_sprig": [BLACK, "#307858", "#c0dc78", WHITE],
    "bladderwort": [BLACK, "#307858", "#f0d038", WHITE],
}
SPORTS = {
    "bladderwort_sprig": [BLACK, "#8c4030", "#c0dc78", WHITE],
    "bladderwort": [BLACK, "#8c4030", "#f0d038", WHITE],
}

# Per frame: (bladder state, lace sway in degrees, swirl size)
# rest, set (walls drawn in) + lean back, SNAP (inflated, swirl) + lace flung,
# hold with the swirl drifting + rebound, settle.
KEYS = [("rest", 0.0, 0), ("set", -2.5, 0), ("snap", 5.0, 1), ("hold", 2.5, 2), ("rest", -1.2, 0)]
ANIM = {"intro": [[0, 6], [1, 14], [2, 5], [3, 16], [4, 12], [0, 7]],
        "idle": [[0, 130], [1, 10], [0, 6]]}


# ------------------------------------------------------------ parts -----

def feather(x, y, ang, length, curl, sway, pinnae=7, plen=0.3):
    """One capillary leaf: a curved rachis with alternating fine side threads.

    Returns (rachis path, [pinna paths]). The rachis curls by `curl` degrees
    over its length; side threads leave at 42 degrees, shorten toward the
    tip, and the longer ones fork into a tiny Y. Sway grows toward the tip.
    """
    pts = []
    a0 = math.radians(ang)
    px, py = x, y
    n = 30
    for i in range(n + 1):
        t = i / n
        a = a0 + math.radians((curl + sway) * t)
        pts.append((px, py))
        px += math.cos(a) * length / n
        py += math.sin(a) * length / n
    side, forks = [], []
    for j in range(pinnae):
        t = 0.22 + 0.72 * j / max(1, pinnae - 1)
        i = min(n, int(t * n))
        bx, by = pts[i]
        a = a0 + math.radians((curl + sway) * t)
        sgn = 1 if j % 2 else -1
        pa = a + sgn * math.radians(42)
        L = length * plen * (1.0 - 0.55 * t)
        ex, ey = bx + math.cos(pa) * L, by + math.sin(pa) * L
        side.append([(bx, by), (ex, ey)])
        if L > 3.4:
            for f in (-30, 30):
                fa = pa + math.radians(f)
                forks.append([(ex, ey), (ex + math.cos(fa) * 1.8, ey + math.sin(fa) * 1.8)])
    return pts, side, forks


def lace(s, leaves, sway, thick=False, shine=True, bold=False, plen=0.3):
    """Paint feathery leaves, one part each: thin 1px threads (a 2px rachis
    base). Returns, per leaf, the rachis tip and its outer pinna tips, where
    bladders hang."""
    tips = []
    for x, y, ang, length, curl, pinnae in leaves:
        rachis, side, forks = feather(x, y, ang, length, curl, sway, pinnae, plen)
        m = s.line1(rachis)
        cut = int(len(rachis) * (0.5 if thick else 0.16))
        m |= s.stroke(rachis[:cut], 2.0, cap=False)
        if bold:
            m |= s.stroke(rachis, (2.8, 1.8), cap=False)
        for seg in side + forks:
            m |= s.stroke(bez(seg, 8), 1.8, cap=False) if bold and seg in side else s.line1(seg)
        pid = s.part(m, base=1, k=0, line=0)
        if shine:
            s.decal(s.line1([(px - 0.6, py - 0.6) for px, py in rachis[2:cut]]), 3, on=[pid])
        tips.append([rachis[-1]] + [seg[-1] for seg in side])
    return tips


def bladder(s, x, y, ang, state="rest", scale=1.0, door=True, shade=1):
    """A tiny pale oval trap on a thread stalk: mid-tone body, dark crescent
    on the shadow side, a white highlight up-left, black bristles at the door.

    `ang` points from the stalk to the trap door. 'set' draws the walls in
    (flatter), 'snap'/'hold' inflate it round.
    """
    rx, ry = 2.9 * scale, 2.1 * scale
    if state == "set":
        rx, ry = rx * 0.95, ry * 0.68
    elif state in ("snap", "hold"):
        rx, ry = rx * 1.2, ry * 1.42
    a = math.radians(ang)
    cx, cy = x + math.cos(a) * rx, y + math.sin(a) * rx
    m = s.ellipse(cx, cy, rx, ry, ang=-a)
    pid = s.part(m, base=2, k=shade, sh_tone=1, line=0)
    hl = s.ellipse(cx - rx * 0.35, cy - ry * 0.4, max(0.8, rx * 0.38), max(0.7, ry * 0.32), ang=-a)
    s.decal(hl, 3, on=[pid])
    if door:
        # Bristles: short black hairs fanning out of the trap door.
        dx, dy = cx + math.cos(a) * (rx + 0.4), cy + math.sin(a) * (rx + 0.4)
        hairs = np.zeros((s.h, s.w), bool)
        for spread in (-38, 38):
            b = a + math.radians(spread)
            hairs |= s.line1([(dx, dy), (dx + math.cos(b) * 2.0, dy + math.sin(b) * 2.0)])
        s.post.append((hairs, 0))
    return cx, cy, rx


def swirl(s, x, y, size, ang):
    """A tiny white water swirl just past the trap door: an open curl of
    about 240 degrees, its open side toward the door (the water rushing in)."""
    if not size:
        return
    a0 = math.radians(ang)
    r = 2.2 + 0.4 * size
    d = 3.0 + r + 0.3 * size
    cx, cy = x + math.cos(a0) * d, y + math.sin(a0) * d
    back = a0 + math.pi
    pts = [(cx + r * math.cos(back + th), cy + r * math.sin(back + th))
           for th in np.linspace(math.radians(60), math.radians(300), 40)]
    pts += [(cx + (r - 1.2 * u) * math.cos(back + th), cy + (r - 1.2 * u) * math.sin(back + th))
            for u, th in zip(np.linspace(0, 1, 10), np.linspace(math.radians(300), math.radians(345), 10))]
    s.part(s.line1(pts), base=3, k=0, line=0)


def water(s, spans, y):
    """The water surface: broken white crests only (no water colour)."""
    for a, b, dy in spans:
        m = s.line1([(a, y + dy), (b, y + dy)])
        s.part(m, base=3, k=0, line=0)


def spiral_kappa(R, r_end, turns, lead=0.0, n=240):
    """Curvature profile of an Archimedean spiral (R in to r_end), with
    `lead` px of nearly straight stem first (the fern line's method)."""
    pts = []
    for i in range(n):
        t = i / (n - 1)
        r = R * (1 - t) + r_end * t
        a = turns * 2 * math.pi * t
        pts.append((r * math.cos(a), r * math.sin(a)))
    ds, ks = [], []
    for i in range(1, n - 1):
        (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[i + 1]
        h1 = math.atan2(by - ay, bx - ax)
        h2 = math.atan2(cy - by, cx - bx)
        dh = (h2 - h1 + math.pi) % (2 * math.pi) - math.pi
        d = (math.dist(pts[i - 1], pts[i]) + math.dist(pts[i], pts[i + 1])) / 2
        ds.append(d)
        ks.append(dh / d)
    if lead:
        ds = [lead / 20] * 20 + ds
        ks = [ks[0] * 0.3] * 20 + ks
    return ds, ks


def coil(s, ctrl, R, r_end, turns, w0, w1, tone=2, sign=-1, rim=0.5):
    """A stem rising out of the water and rolling into a tight crozier.

    One stroke (no seam): the stalk follows `ctrl`, then the spiral's
    curvature is integrated from its end, so the coil's inner turn rests
    on the outer one (no enclosed dark hole)."""
    stalk = bez(ctrl, 30)
    (x1, y1), (x0, y0) = stalk[-1], stalk[-3]
    ds, ks = spiral_kappa(R, r_end, turns, lead=2)
    x, y, th = x1, y1, math.atan2(y1 - y0, x1 - x0)
    path = [(x, y)]
    for d, k in zip(ds, ks):
        th += sign * abs(k) * d
        x += math.cos(th) * d
        y += math.sin(th) * d
        path.append((x, y))
    full = stalk + path[1:]
    ts, L = _pix.arclen_param(full)
    f0 = _pix.arclen_param(stalk)[1] / L
    m = s.stroke(full, lambda t: w0 if t <= f0 else w0 + (w1 - w0) * ((t - f0) / (1 - f0)) ** 0.8, cap=True)
    pid = s.part(m, base=tone, k=1, sh_tone=1 if tone == 2 else 0, line=0)
    outer = s.stroke(full[: int(len(stalk) + len(path) * rim)], w0 + 2, cap=False) & m
    rim_white(s, outer, pid, 0.55)
    return pid


def stem(s, ctrl, width, tone=1, shine=True, cap=True):
    path = bez(ctrl, 50)
    m = s.stroke(path, width, cap=cap)
    pid = s.part(m, base=tone, k=0, line=0)
    if shine:
        s.decal(s.line1([(px - 0.7, py - 0.5) for px, py in path[5:-5]]), 3, on=[pid])
    return pid, path


# A left-facing two-lipped flower, colour only (the outline comes from the
# part): '2' yellow, '1' shade and the faint guide lines, '3' highlight.
# The small upper lip and the big rounded lower lip meet at a notch in the
# silhouette on the foe side; the closed palate means there is no throat.
# The spur curls down and forward under the lower lip.
FLOWER = [
    "..33...",
    ".3222..",
    ".22221.",
    "..221..",
    ".33222.",
    "3222222",
    "2222221",
    "2212121",
    ".2.2.1.",
]
SPUR = [
    "..22",
    ".221",
    "221.",
    "21..",
]


def stamp(s, x, y, rows, flip=False):
    """Paint an ASCII colour stamp as one part (outlined by finish)."""
    m = np.zeros((s.h, s.w), bool)
    tone = {}
    for j, r in enumerate(rows):
        for i, ch in enumerate(r[::-1] if flip else r):
            if ch in "123":
                xx, yy = int(x) + i, int(y) + j
                if 0 <= xx < s.w and 0 <= yy < s.h:
                    m[yy, xx] = True
                    tone[(xx, yy)] = int(ch)
    pid = s.part(m, base=2, k=0, line=0)
    for (xx, yy), t in tone.items():
        if t != 2:
            s.tone[yy, xx] = t
    return pid


def flower(s, x, y, flip=False):
    """Spur behind (pointing down-right), then the two-lipped corolla."""
    stamp(s, x + 4, y + 6, SPUR, flip)
    stamp(s, x, y, FLOWER, flip)


# ---------------------------------------------------------- the sprig ---

SPRIG_LEAVES = [  # x, y, angle (90 = down), length, curl, pinnae
    (18, 22, 140, 12, -44, 4),
    (24, 25, 112, 20, -24, 5),
    (31, 26, 88, 20, 2, 6),
    (38, 25, 64, 20, 24, 5),
    (43, 22, 36, 11, 44, 4),
]
# (leaf, tip index, angle of the trap door); the first one snaps
SPRIG_BLADDERS = [(1, 0, 150), (0, 0, 165), (2, 0, 50), (3, 3, 40), (4, 0, 100)]


def sprig(s, frame):
    state, sway, sw = KEYS[frame]
    # stolon just under the water, sagging between its leaf nodes
    stem(s, [(14, 21), (24, 27), (36, 27), (46, 21)], 2.4)
    tips = lace(s, SPRIG_LEAVES, sway, shine=False)
    for i, (leaf, k, ang) in enumerate(SPRIG_BLADDERS):
        x, y = tips[leaf][k]
        cx, cy, rx = bladder(s, x, y, ang, state if i == 0 else "rest", scale=1.15)
        if i == 0:
            swirl(s, cx, cy, sw, ang)
    coil(s, [(26, 26), (27, 18), (24, 12)], 5.4, 3.2, 0.72, 3.8, 2.4)
    water(s, [(8, 13, 1), (16, 24, 0), (29, 35, 1), (39, 44, 0), (47, 50, 1)], 17)


# ----------------------------------------------------------- the adult --

ADULT_LEAVES = [
    (11, 28, 140, 12, -44, 4),
    (17, 31, 112, 21, -26, 5),
    (26, 33, 94, 21, -6, 5),
    (35, 33, 78, 21, 10, 5),
    (43, 31, 60, 18, 26, 5),
    (47, 28, 40, 7, 40, 3),
]
ADULT_BLADDERS = [(2, 2, 150), (1, 4, 120), (3, 4, 120), (4, 1, 60), (4, 4, 75)]
# flowers along the stalk: (t from water to tip, offset side, pedicel length)
FLOWER_T = [(0.36, 1, 3.5), (0.52, -1, 3.5), (0.67, 1, 3.5), (0.82, -1, 3.0), (1.0, 0, 0.0)]


def adult(s, frame):
    state, sway, sw = KEYS[frame]
    stem(s, [(6, 27), (20, 33), (38, 33), (52, 27)], 2.6)
    tips = lace(s, ADULT_LEAVES, sway, shine=False)
    for i, (leaf, k, ang) in enumerate(ADULT_BLADDERS):
        x, y = tips[leaf][k]
        # the adult's bladders: green-washed yellow, set apart from the flowers
        cx, cy, rx = bladder(s, x, y, ang, state if i == 0 else "rest", scale=1.1, shade=2)
        if i == 0:
            swirl(s, cx, cy, sw, ang)
    # emergent stalk lunging up and out toward the foe
    _, path = stem(s, [(37, 32), (38, 17), (24, 10), (9, 9)], (3.6, 2.2))
    heads = []
    for t, side, plen in FLOWER_T:
        i = min(len(path) - 1, int(t * (len(path) - 1)))
        x, y = path[i]
        x2, y2 = path[max(0, i - 3)]
        ang = math.atan2(y - y2, x - x2) - side * math.pi / 2
        fx, fy = x + math.cos(ang) * plen, y + math.sin(ang) * plen
        if plen:
            stem(s, [(x, y), (fx, fy)], 1.4, shine=False, cap=False)
        heads.append((fx, fy))
    for fx, fy in heads:
        flower(s, fx - 4, fy - 3)
    water(s, [(1, 9, 1), (13, 22, 0), (26, 33, 1), (42, 47, 0), (50, 52, 1)], 24)


# ---------------------------------------------------------- finishing ---

def blunt_tips(arr):
    """Round off 1px outline spikes at thread ends: a black pixel with a
    single cardinal neighbour gets black shoulders on both sides, so each
    capillary ends in a small blunt cap instead of a stray pixel."""
    for _ in range(3):
        op = arr != T
        p = np.pad(op, 1)
        n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        ys, xs = np.nonzero(op & (n == 1) & (arr == 0))
        if not len(ys):
            break
        h, w = arr.shape
        for y, x in zip(ys, xs):
            vertical = (y > 0 and op[y - 1, x]) or (y < h - 1 and op[y + 1, x])
            for dx, dy in (((1, 0), (-1, 0)) if vertical else ((0, 1), (0, -1))):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and arr[yy, xx] == T:
                    arr[yy, xx] = 0
    return arr


def fill_pinholes(arr):
    """Single transparent pixels enclosed by all eight neighbours turn black."""
    op = arr != T
    enclosed = np.ones((arr.shape[0] - 2, arr.shape[1] - 2), bool)
    for dy in range(3):
        for dx in range(3):
            if (dx, dy) != (1, 1):
                enclosed &= op[dy:dy + enclosed.shape[0], dx:dx + enclosed.shape[1]]
    mid = arr[1:-1, 1:-1]
    mid[(mid == T) & enclosed] = 0
    return arr


def finish(s, **kw):
    """Full outline, blunt thread tips (bristles stay fine), no pinholes."""
    arr = fill_pinholes(tones(s, **kw))
    hairs = np.zeros(arr.shape, bool)
    for m, _ in s.post:
        hairs |= m
    hairs &= arr == 0
    arr[hairs] = T
    arr = blunt_tips(arr)
    arr[hairs] = 0
    return fill_pinholes(arr)


# Registration: the sprig is drawn a little smaller (teen size class), and
# both sit right of centre so the trap mass counterbalances the head.
PLACE = {"bladderwort_sprig": (1.0, 1), "bladderwort": (1.0, 2)}


def front(sid, frame=0):
    sc, dx = PLACE[sid]
    s = Spr(56, 56, tuple(PALS[sid][1:]), sc=sc)
    (sprig if sid == IDS[0] else adult)(s, frame)
    arr = finish(s)
    out = np.full_like(arr, T)
    out[:, dx:] = arr[:, :56 - dx]
    return out


def front_frames(sid):
    return [front(sid, f) for f in range(len(KEYS))]


BACK_LEAVES = [  # a close view: big feathery leaves fanning down
    (3, 21, 128, 26, -16, 6), (12, 23, 104, 30, -8, 6), (23, 24, 88, 30, 2, 6),
    (34, 23, 70, 30, 12, 6), (43, 21, 44, 24, 24, 6),
]
BACK_BLADDERS = [(1, 1, 150), (3, 2, 30), (2, 5, 100)]


def back(sid):
    """From behind and above, cropped at the bottom: the lace mass seen
    close, the bladders large, the white water line, and the identifying
    part rising toward the foe (top-right): the open coil, or the raceme."""
    s = Spr(48, 48, tuple(PALS[sid][1:]))
    y0 = 0 if sid == IDS[0] else 3
    leaves = [(x, y + y0, a, L, c, p) for x, y, a, L, c, p in BACK_LEAVES]
    stem(s, [(0, 18 + y0), (16, 22 + y0), (32, 21 + y0), (48, 17 + y0)], 3.2)
    tips = lace(s, leaves, 0, thick=True, shine=False, bold=True, plen=0.36)
    for leaf, k, ang in BACK_BLADDERS:
        x, y = tips[leaf][k]
        bladder(s, x, y + y0 * 0, ang, scale=1.45)
    if sid == IDS[0]:
        coil(s, [(20, 22), (20, 12), (24, 5)], 6.4, 3.8, 0.72, 5.4, 3.4, sign=1)
        water(s, [(0, 8, 1), (12, 16, 0), (27, 38, 1), (42, 48, 0)], 15)
    else:
        _, path = stem(s, [(15, 25), (12, 15), (22, 7), (37, 5)], (4.4, 3.0))
        heads = []
        for t, side in ((0.42, -1), (0.62, 1), (0.82, -1), (1.0, 0)):
            i = min(len(path) - 1, int(t * (len(path) - 1)))
            x, y = path[i]
            x2, y2 = path[max(0, i - 3)]
            ang = math.atan2(y - y2, x - x2) - side * math.pi / 2
            fx, fy = x + math.cos(ang) * 4 * abs(side), y + math.sin(ang) * 4 * abs(side)
            if side:
                stem(s, [(x, y), (fx, fy)], 1.6, shine=False, cap=False)
            heads.append((fx, fy))
        for fx, fy in heads:
            flower_back(s, fx - 3, fy - 4)
        water(s, [(0, 7, 1), (22, 32, 0), (36, 42, 1)], 18)
    return finish(s, open_bottom=True)


# A flower seen from behind, turned toward the foe (top-right): the lips
# face away, and the spur points back at the viewer.
SPUR_BACK = [
    "22..",
    "122.",
    ".12.",
]


def flower_back(s, x, y):
    stamp(s, x, y, FLOWER, flip=True)
    stamp(s, x - 1, y + 6, SPUR_BACK)


def icon(sid):
    """Colour-only maps; icon_arr adds the full black outline around them.
    Sprig: the open coil leaning left over a white water crest, lace and two
    pale bladders (at different heights). Adult: the yellow raceme lunging
    left over the water, the lace and a bladder below."""
    if sid == IDS[0]:
        rows = [
            "................",
            "...kkkkk........",
            "..k23332k.......",
            ".k22kkk22k......",
            ".k2k...k22k.....",
            ".k1k...k22k.....",
            "..k.....k22k....",
            "kkkkk.kkk22kkkk.",
            "k333kk33k22k333k",
            ".kkkk11111111kk.",
            "...k1k1k1k1k1k..",
            "..k1kk1k1kk1k1k.",
            ".k22kk1k1k.kk1k.",
            "k2322kk1k1k..kk.",
            "k2221k.kk1k.....",
            ".kkkk....kk.....",
        ]
    else:
        rows = [
            "..kkk...........",
            ".k233k..........",
            "k22222k..kkk....",
            "k21222k.k233k...",
            ".kk11kk.k2222k..",
            "...kk1k.k2122k..",
            ".....k1kkkk1kk..",
            "......k1kkk1k...",
            ".......k1kk1k...",
            "kkkkk..kk11k.kkk",
            "k333kkk3k1kk333k",
            ".kkkk11111111kk.",
            "...k1k1k1k1k1k..",
            "..k1kk1k1kk1k1k.",
            ".k232kk1k1k.kk..",
            "..kkk..kkkk.....",
        ]
    return icon_arr(rows)


def render():
    out = {}
    for sid in IDS:
        small = icon(sid)
        out[sid] = (front_frames(sid), back(sid), [small, hop(small)])
    return out


def review_layout(art):
    """The lead's layout: each species' front, back and icon at 3x, one row."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "bladderwort_1x.png"), (3, "bladderwort_lead_layout.png")):
        sheet = Image.new("RGB", (284 * scale, 60 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((2, fs[0]), (62, b), (114, icons[0])):
                im = Image.fromarray(to_rgba(arr, PALS[sid]), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((142 * n + x) * scale, 58 * scale - im.height), im)
        sheet.save(folder / name)


def preview(art, path, k=4):
    """Scratch sheet: every front frame, back, icons and the sport at k."""
    from kit import to_rgba
    rows = []
    for sid in IDS:
        fs, b, icons = art[sid]
        rows.append([(a, PALS[sid]) for a in fs + [b] + icons] + [(fs[0], SPORTS[sid])])
    W = max(sum(a.shape[1] * k + 8 for a, _ in r) for r in rows) + 8
    sheet = Image.new("RGB", (W, len(rows) * (56 * k + 8) + 8), (200, 208, 200))
    for r, row in enumerate(rows):
        x = 8
        for a, pal in row:
            im = Image.fromarray(to_rgba(a, pal), "RGBA")
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, 8 + r * (56 * k + 8) + 56 * k - im.height), im)
            x += im.width + 8
    sheet.save(path)


def build():
    from kit import write_species, intro_strip
    art = render()
    review_layout(art)
    poses = {
        "bladderwort_sprig": "COILED: a floating tangle of finely forked thread-like leaves hangs from "
        "a stolon just under a white water line, with five tiny pale bladder traps; the curled "
        "stem tip coils up out of the water toward the foe.",
        "bladderwort": "LUNGING: the same lace trap mass and pale bladders below the water line, "
        "with an emergent stalk thrust up and out toward the foe carrying five bright yellow "
        "two-lipped flowers (spur, rounded lower lip, faint guide lines); a small coiled stolon "
        "tip trails behind.",
    }
    for sid, (fs, b, icons) in art.items():
        write_species(sid, palette=PALS[sid], sport=SPORTS[sid], front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Utricularia vulgaris, floating (free-floating, rootless). "
                      + poses[sid] + " Water-green leaves in the dark slot, "
                      + ("pale bladder green" if sid == IDS[0] else "bright flower yellow")
                      + " in the mid slot; the water line is white highlights only. "
                      "Gesture: VACUUM TRAP, one bladder is set, then snaps (inflates and gulps, a tiny "
                      "white water swirl at its door), and the lace sways, rebounds and settles. "
                      "Sport: bronze-red anthocyanin leaves of plants in sunny, nutrient-poor water, "
                      "a natural colour form, not a named cultivar.",
                      credits="Original geometry drawn for Verdant Reach. Botanical reference: "
                      "https://en.wikipedia.org/wiki/Utricularia . No sprite from any other game "
                      "was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    import sys
    if "--preview" in sys.argv:
        art = render()
        preview(art, sys.argv[-1])
        from _d_kit import stats
        for sid, (fs, b, icons) in art.items():
            for i, f in enumerate(fs):
                stats(f"{sid}[{i}]", f)
            stats(sid + " back", b)
    else:
        build()
