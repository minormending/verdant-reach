"""Original Crystal-rule Lithops (living stones): lithops_pebble ->
lithops_pair -> lithops_bloom.

BRACED baby: one pair of fused, round-topped leaves almost buried in olive
grit, with a plain real pebble beside it as its near twin; the near
(foe-side) leaf is the bigger, split from the far one by a thin fissure.
BRACED teen: a clump of three pairs half buried among real pebbles; the
lead pair stands a little taller, its window and fissure the clearest.
BRACED adult: a clump of five pairs with a large white daisy-like flower of
many narrow petals rising from the central fissure, bigger than any pair.
Windows: each leaf top carries a reticulate window, a darker band beside
the fissure from which fine connected olive lines (cell walls of scattered
seeds) run out across the top; any line not joined to that band is
dropped, and `finish` turns any small dark pocket wholly ringed by light
tan, so no frame, back or icon holds an enclosed dark dot. The fissure is
a crack that runs to the outline; the white rim never runs down it.
Intro: the pair squashes, then swells while its fissure parts and the
rounded tips of a new pair push up through it, sand trickling down its
wall, then it settles; the bloom's flower climbs out of the fissure as a
furled bud, opens as a crown of petals, flares and settles. Grit, pebbles
and the other pairs stay registered.
Sport: Lithops optica 'Rubra', the purple-red cultivar (see SPORTS.md).
No sprite from any other game is copied, traced or imported.

score: lithops_pebble 8 (7: the window marbling reads as texture rather
than distinct lines at 1x); lithops_pair 8 (4: the rear pairs' windows are
small); lithops_bloom 8 (1: the five-pair clump is busy under the flower).
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, erode, dilate, hop, moving_boxes, rim_white, shift, tones, icon_arr

TOOL = "tools/art/crystal/lithops.py"
IDS = ["lithops_pebble", "lithops_pair", "lithops_bloom"]
PAL = [BLACK, "#685838", "#c8b898", WHITE]
SPORT = [BLACK, "#582030", "#a84058", WHITE]
SPAL = tuple(PAL[1:])

ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 18], [4, 12], [0, 8]],
        "idle": [[0, 140], [4, 10], [0, 8]]}


# ---------------------------------------------------------------- parts ---

def finish(s, **kw):
    """The shared Crystal finishing (full black outline), then one
    safeguard: a dark pocket of up to 12px wholly ringed by light (a black
    pinch where two petal tips touch) turns tan, so no image ever holds an
    enclosed dark dot."""
    t = tones(s, **kw)
    h, w = t.shape
    dark = (t == 0) | (t == 1)
    seen = np.zeros((h, w), bool)
    for y0 in range(h):
        for x0 in range(w):
            if not dark[y0, x0] or seen[y0, x0]:
                continue
            stack, comp = [(y0, x0)], []
            seen[y0, x0] = True
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and dark[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
            ring = {(y + dy, x + dx) for y, x in comp for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - set(comp)
            if len(comp) <= 12 and all(0 <= y < h and 0 <= x < w and t[y, x] in (2, 3) for y, x in ring):
                for y, x in comp:
                    t[y, x] = 2
    return t



def reticulate(s, W, pids, seed, root, cell=5.5, ysc=1.4, fill=0.0):
    """A reticulate window: a darker band of window along the fissure
    (`root`), from which fine olive lines (the walls of irregular cells,
    scattered seeds rather than a grid) run out across the window region
    W. Every piece of line not joined to the root band is dropped, so the
    network is one piece tied to the fissure crack and never leaves a loose
    dark dot or slit on the light top."""
    ys, xs = np.nonzero(W)
    if not len(xs):
        return
    rng = np.random.default_rng(seed)
    x0, x1, y0, y1 = xs.min() - 3, xs.max() + 3, ys.min() - 2, ys.max() + 2
    area = (x1 - x0 + 1) * (y1 - y0 + 1) * ysc
    n = max(3, int(area / (cell * cell)))
    P = np.stack([rng.uniform(x0, x1, n), rng.uniform(y0, y1, n)], 1)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    d = (xx[..., None] - P[:, 0]) ** 2 + ((yy[..., None] - P[:, 1]) * ysc) ** 2
    lab = d.argmin(-1)
    diff = (lab != shift(lab, -1, 0)) | (lab != shift(lab, 0, -1))
    net = (W & diff) | (W & root)
    # the window is clearest (darkest) next to the fissure: the cells that
    # touch the root band are filled, every other cell stays a light island
    near = dilate(root, 2, diag=True)
    for c in range(len(P)):
        cellm = W & (lab == c)
        if cellm.any() and (cellm & near).sum() > 0.6 * cellm.sum() and rng.uniform() < fill:
            net |= cellm
    # cells too small to read as an island close up (no lone light specks)
    for c in range(len(P)):
        cellm = W & (lab == c) & ~net
        if 0 < cellm.sum() <= 3:
            net |= cellm
    # keep only what is joined (8-way) to the root band
    keep = net & root
    for _ in range(80):
        grown = dilate(keep, 1, diag=True) & net
        if (grown == keep).all():
            break
        keep = grown
    s.decal(keep, 1, on=pids, lock=True)


def split(s, M, line, gap=0.0, side=-1):
    """The half of mask M left (side=-1) or right (+1) of the polyline
    `line` (top to bottom), pulled back by gap/2 where the fissure parts
    (the parting tapers to nothing at the line's last point)."""
    n = len(line)
    pts = []
    for i, (x, y) in enumerate(line):
        g = gap / 2 * (1 - i / (n - 1)) if n > 1 else gap / 2
        pts.append((x + side * g, y))
    far = -80 if side < 0 else 140
    (xa, ya), (xb, yb) = pts[0], pts[-1]
    poly = [(far, ya - 80), (xa, ya - 80)] + pts + [(xb, yb + 80), (far, yb + 80)]
    return M & s.poly(poly)


def pair(s, cx, ty, rx, ry, depth, swell=0.0, part=0.0, rise=0.0, fis=0.18, slant=2.0, lean=1.5,
         seed=0, win=True, rim=0.4, cell=None, shade=3, margin=(0.84, 0.78)):
    """One pair of fused, round-topped leaves seen from the front-left and
    above: a flattened, window-bearing top over a bulging pebble wall, split
    by a fissure a little right of centre (the near, foe-side leaf is the
    bigger), with a shallow notch where the two leaf tops meet. `part`
    opens the fissure (widest at the top); `rise` lifts the tips of a new
    pair up through it. Returns (part ids, body mask, fissure top)."""
    rx, ry, ty = rx + swell * 0.6, ry + swell * 0.25, ty - swell
    top = s.ellipse(cx, ty, rx, ry)
    bx = cx + lean
    # the wall bulges just under the top's rim, then rolls in to the sand
    wall = s.ellipse(bx * 0.5 + cx * 0.5, ty + depth * 0.42, rx * 1.04, depth * 0.62)
    wall |= s.ellipse(bx, ty + depth * 0.8, rx * 0.9, depth * 0.45)
    wall &= s.poly([(-50, ty), (150, ty), (150, 120), (-50, 120)])
    M = top | wall
    fx = cx + fis * rx
    xb = fx + slant
    notch = s.poly([(xb - 2.6, ty - ry - 1.5), (xb + 2.6, ty - ry - 1.5), (xb + 0.3, ty - ry + 1.6)])
    M &= ~notch
    top &= ~notch
    line = [(xb, ty - ry - 2), (fx + slant * 0.5, ty - ry * 0.2), (fx, ty + ry),
            (fx + lean * 0.4, ty + depth + ry)]
    pids = []
    if part > 0.4:
        # the new pair's rounded tips pushing up through the parted fissure
        nx, ny = fx + slant * 0.6, ty - ry * 0.6 - rise
        nm = s.ellipse(nx - 1.0, ny, 1.3 + part * 0.3, 2.4)
        nm |= s.ellipse(nx + 1.0, ny + 0.5, 1.2 + part * 0.3, 2.2)
        npid = s.part(nm, base=2, k=1, shadow=(1, 0.3), line=0)
        s.decal(nm & ~shift(nm, 0, -1) & ~shift(nm, 1, 0), 3, on=[npid])
        pids.append(npid)
    R = split(s, M, line, part, +1)
    L = split(s, M, line, part, -1)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    ox = getattr(s, "ox", 0)
    for n, half in enumerate((R, L)):
        # each leaf is its own rounded lobe: an olive crescent hugs its
        # lower-right edge (for the near leaf, the side rolling into the
        # fissure), deeper on the wall than on the top
        pid = s.part(half, base=2, k=0, line=0)
        band = np.zeros_like(half)
        for d in range(1, shade + 3):
            band |= half & ~shift(half, d, round(d * 0.45))
        s.decal(band & ~top, 1, on=[pid])
        s.decal(half & top & ~shift(half, 1, 0), 1, on=[pid])
        if win:
            W = half & s.ellipse(cx + 0.4, ty - 0.2, min(rx - 2.0, rx * margin[0]), min(ry - 1.1, ry * margin[1]))
            other = M & ~half
            sign = 1 if n == 1 else -1      # the fissure lies right of the near leaf
            root = np.zeros_like(half)
            for d in (1, 2):
                root |= half & shift(other, sign * d, 0)
            reticulate(s, W, [pid], seed * 7 + n, root, cell=cell or min(5.5, max(3.8, rx * 0.33)))
        # the white light rim runs only along the outline (top-left), never
        # down the fissure, so no glint sits beside the dark window
        tm = half & top
        edge = tm & (~shift(M, 0, -1) | ~shift(M, -1, 0))
        ys, xs = np.nonzero(tm)
        if len(xs):
            dd = xs + ys
            s.decal(edge & ((xx + yy) <= dd.min() + (dd.max() - dd.min()) * rim), 3, on=[pid])
        # the lit front-left shoulder of the top face
        sh = half & top & ~shift(top, 0, 1) & (xx < cx + ox - rx * 0.2)
        s.decal(sh, 3, on=[pid])
        pids.append(pid)
    return pids, M, (xb, ty - ry)


def sand(s, pts, grains=(), lit=0.55, seed=0):
    """The grit the plant sits in, banked up against it: olive-brown sand
    (darker than the plant, so the living stones stand out of it), a tan
    lit edge on its upper-left slopes, scattered tan grit dashes (light
    marks, never dark ones) and a few paired white grains."""
    m = s.poly(pts)
    pid = s.part(m, base=1, k=0, line=0)
    ys, xs = np.nonzero(m)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    d = xx + yy
    litm = d < d[m].min() + (d[m].max() - d[m].min()) * lit
    s.decal(m & ~shift(m, 0, -1) & (litm | (yy < ys.min() + 2)), 2, on=[pid])
    s.decal(m & ~shift(m, 0, -2) & litm, 2, on=[pid])
    rng = np.random.default_rng(seed)
    safe = erode(m, 2)
    grit = np.zeros_like(m)
    for gy in range(int(ys.min()) + 2, int(ys.max()), 3):
        for gx in range(int(xs.min()) + 2 + (gy % 2) * 3, int(xs.max()) - 1, 6):
            x, y = gx + int(rng.integers(0, 3)), gy
            if 0 <= x < s.w - 1 and safe[y, x] and safe[y, x + 1]:
                grit[y, x] = grit[y, x + 1] = True
    s.decal(grit, 2, on=[pid])
    for x, y in grains:
        s.decal(s.line1([(x, y), (x + 1.2, y)]), 3, on=[pid])
    return pid, m


def pebble(s, x, y, rx, ry, tone=1, rim=0.3):
    """A real pebble: a small rounded stone lit from the top-left (olive or
    tan), with a white rim glint; no marks, so it never reads as a lithops."""
    m = s.ellipse(x, y, rx, ry)
    pid = s.part(m, base=tone, k=1 if tone == 2 else 0, line=0)
    if tone == 1:
        lit = s.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.62, ry * 0.55) & erode(m, 1)
        s.decal(lit, 2, on=[pid])
    rim_white(s, m, pid, rim)
    return pid


def trickle(s, x, y0, y1, pid_on=None):
    """A thin stream of sand running down a leaf wall (no outline of its
    own: tan over the olive shade), white grains at its head and middle."""
    m = s.stroke([(x, y0), (x + 0.4, (y0 + y1) / 2), (x + 0.2, y1)], 2.2, cap=True)
    if pid_on is not None:
        s.decal(m, 2, on=pid_on)
        s.decal(s.line1([(x, y0), (x, y0 + 1.2)]), 3, on=pid_on)
        ym = (y0 + y1) / 2 + 1
        s.decal(s.line1([(x + 0.4, ym), (x + 0.4, ym + 1.2)]), 3, on=pid_on)


# ---------------------------------------------------------------- fronts --

# (swell, fissure parting, new-pair rise, trickle stage)
KEYS = [(0.0, 0.0, 0.0, None), (-0.6, 0.0, 0.0, None), (1.0, 2.4, 1.5, 0),
        (1.5, 4.0, 3.5, 1), (0.5, 1.4, 1.0, 2)]
TRICKLES = {0: (0, 3), 1: (2, 7), 2: (5, 9)}


def pebble_front(frame=0):
    swell, part, rise, tr = KEYS[frame]
    s = Spr(56, 56, SPAL)
    cx, ty, rx, ry = 26, 38, 13.0, 8.0
    pids, M, _ = pair(s, cx, ty, rx, ry, 9, swell, part, rise, seed=1)
    if tr is not None:
        a, b = TRICKLES[tr]
        trickle(s, cx + rx * 0.78, ty + 3 + a, ty + 3 + b, pids[-2:-1])
    # a real pebble beside it, nearly its twin in colour, but plain
    pebble(s, 45, 48.5, 5.2, 4.0, tone=2, rim=0.35)
    sand(s, [(10, 55), (11, 52.5), (13, 50), (15.5, 48), (18, 47.5), (23, 49), (29, 49.5), (34, 49),
             (38, 48), (42, 50.5), (47, 51.5), (49, 52.5), (50, 55)], grains=[(14, 51), (19, 49)])
    pebble(s, 14, 52.6, 3.6, 2.6, tone=2)
    pebble(s, 33, 54.2, 2.2, 1.4, tone=2)
    return finish(s)


def pairs_front(frame=0):
    swell, part, rise, tr = KEYS[frame]
    s = Spr(56, 56, SPAL)
    # the rear pair (right), the taller lead pair (left), a small front pair
    pair(s, 40, 34, 9.5, 6.0, 9, seed=3, lean=1.0)
    pids, _, _ = pair(s, 23, 31, 12.0, 8.0, 12, swell, part, rise, seed=2, lean=1.5)
    if tr is not None:
        a, b = TRICKLES[tr]
        trickle(s, 23 + 12 * 0.78, 33 + a, 33 + b, pids[-2:-1])
    pair(s, 44, 43.5, 7.5, 4.8, 6, seed=4, lean=0.5, shade=2)
    sand(s, [(6, 55), (7, 52.5), (10, 49.5), (13, 46.5), (17, 46.5), (22, 48), (30, 48.5), (35, 49.5),
             (38, 49), (44, 49.5), (49, 49), (52, 52), (53, 55)], grains=[(10, 51), (15, 48)])
    pebble(s, 11, 52.5, 4.0, 2.8, tone=2)
    pebble(s, 33, 52.8, 3.4, 2.4, tone=2)
    pebble(s, 49.5, 53, 2.6, 1.9, tone=2)
    return finish(s)


# ---------------------------------------------------------------- flower --

# open fraction per bloom frame: rest, the closed bud, half open, flared, settling
BLOOM = [1.0, 0.0, 0.55, 1.12, 0.94]
BLOOM_ANIM = {"intro": [[1, 10], [2, 8], [3, 16], [4, 10], [0, 8]],
              "idle": [[0, 140], [4, 10], [0, 8]]}


def _fpt(cx, cy, a, r, sq, tilt):
    """A point on the flower's (tipped, squashed) disc: angle a (degrees,
    0 = right, 90 = far), radius r."""
    a, ta = math.radians(a), math.radians(tilt)
    dx, dy = math.cos(a) * r, -math.sin(a) * r * sq
    return (cx + dx * math.cos(ta) - dy * math.sin(ta), cy + dx * math.sin(ta) + dy * math.cos(ta))


def flower(s, cx, cy, R, base, t=1.0, sq=0.55, n=20, seed=5, tilt=-10):
    """The big white daisy-like flower: many narrow white petals around a
    tan stamen boss, seen from the front-left and above. `t` opens it: 0 is
    a plump furled bud in the fissure, 1 fully open. The petals are one
    white form whose serrated rim is the petal tips, parted by tan seams
    (light, so never a dark mark), shaded tan on the lower right; the boss
    is tan with an olive rim, never a dark disc."""
    rng = np.random.default_rng(seed)
    bx, by = base
    k = min(t, 1.0)
    cx, cy = bx + (cx - bx) * k, by + (cy - by) * k
    if t < 0.3:
        # the furled bud: a fat white spindle standing in the fissure
        tip = (bx - 1.5, by - 11)
        m, path = s.leaf((bx, by + 1), tip, 6.0, bend=-0.08, fat=0.42, blunt=1.2)
        pid = s.part(m, base=3, k=1, shadow=(1, 0.2), sh_tone=2, line=0)
        for dx in (-1.2, 1.0):
            s.decal(s.line1([(bx + dx, by - 1), (tip[0] + dx * 0.4, tip[1] + 3)]), 2, on=[pid])
        return [pid]
    if t < 0.8:
        # half open: a crown of separate narrow petals fanning up out of
        # the fissure, the far ones first, parted by tan seams
        fan = []
        for i in range(9):
            u = (i - 4) / 4
            fan.append((u, 0.9 + 0.1 * math.cos(u * 2)))
        fan.sort(key=lambda f: -abs(f[0]))
        pids = []
        for u, f in fan:
            a = math.radians(90 - u * 72 * t / 0.55)
            L = R * 0.86 * f
            tip = (bx + math.cos(a) * L - 2, by - 1 - math.sin(a) * L)
            m, path = s.leaf((bx - 0.5, by), tip, 3.2, bend=0.04 * u, fat=0.6, blunt=1.0)
            pid = s.part(m, base=3, k=1, shadow=(1, 0.3), sh_tone=2, line=2 if abs(u) < 0.9 else 0)
            pids.append(pid)
        return pids
    lens = [R * rng.uniform(0.88, 1.04) for _ in range(n)]
    angs = [-90 + 360 * (i + 0.5) / n + rng.uniform(-3, 3) for i in range(n)]
    # opening: petals fan up out of the fissure, then spread to a full disc
    def ang(a):
        return 90 + (a - 90) * min(1.0, t) ** 2
    sqt = sq if t >= 0.8 else 1.0
    grow = 1 + 0.08 * max(0.0, t - 1.0) / 0.12
    m = np.zeros((s.h, s.w), bool)
    tips = []
    for a, L in zip(angs, lens):
        L = L * (0.6 + 0.4 * k) * grow
        p0 = _fpt(cx, cy, ang(a), 1.0, sqt, tilt)
        p1 = _fpt(cx, cy, ang(a), L, sqt, tilt)
        m |= s.stroke([p0, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2), p1], (2.6, 1.6), cap=True)
        tips.append((a, L))
    if t >= 0.8:
        m |= s.ellipse(cx, cy, R * 0.62, R * 0.62 * sqt)
    pid = s.part(m, base=3, k=0, line=0)
    # seams between petals, from the boss out toward the notches
    seams = np.zeros_like(m)
    for (a, L), (a2, L2) in zip(tips, tips[1:] + tips[:1]):
        mid = (a + a2 + (360 if a2 < a else 0)) / 2
        r1 = min(L, L2) * (0.6 + 0.4 * k) * grow * 0.92
        seams |= s.line1([_fpt(cx, cy, ang(mid), r1 * 0.55, sqt, tilt), _fpt(cx, cy, ang(mid), r1, sqt, tilt)])
    s.decal(seams & erode(m, 1), 2, on=[pid])
    # shade: the near and lower-right petals' lower edges, and petal bases
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    if t >= 0.8:
        low = m & ~shift(m, 0, 1) & ((xx - cx) * 0.5 + (yy - cy) > 1)
        s.decal(low, 2, on=[pid])
    pids = [pid]
    if t >= 0.8:
        rb = 1.8 + 2.4 * k
        bm = s.ellipse(cx, cy, rb, rb * 0.75)
        bpid = s.part(bm, base=2, k=0, line=None)
        s.decal(bm & ~shift(bm, 0, -1) & ~shift(bm, -1, 0), 3, on=[bpid])
        pids.append(bpid)
    return pids


def bloom_front(frame=0):
    t = BLOOM[frame]
    s = Spr(56, 56, SPAL)
    # back pairs, the central flowering pair, then the front pairs
    pair(s, 46, 36, 9.5, 5.0, 10, seed=12, lean=1.0)
    pair(s, 13, 39, 8.5, 4.5, 8, seed=11, lean=1.0, shade=2)
    _, _, fis = pair(s, 30, 38, 12.0, 6.5, 10, seed=13, lean=1.0)
    pair(s, 43, 47, 9.0, 4.5, 5, seed=15, lean=0.5, shade=2)
    pair(s, 18, 48, 8.0, 4.0, 4, seed=14, lean=0.5, shade=2)
    sand(s, [(3, 55), (3, 52.5), (6, 50.5), (10, 51.5), (16, 52), (24, 51), (32, 51.5), (38, 52),
             (48, 51.5), (53, 50), (55, 51.5), (55, 55)], grains=[(5, 52), (28, 52.5)])
    pebble(s, 7, 53, 3.4, 2.4, tone=2)
    pebble(s, 32, 53.6, 3.0, 2.0, tone=2)
    pebble(s, 52, 53, 2.8, 2.2, tone=2)
    flower(s, 27, 23, 17.0, (fis[0] - 0.5, fis[1] + 1.5), t)
    return finish(s)


def front(sid, frame=0):
    if sid == IDS[0]:
        return pebble_front(frame)
    if sid == IDS[1]:
        return pairs_front(frame)
    return bloom_front(frame)


def front_frames(sid):
    n = len(BLOOM) if sid == IDS[2] else len(KEYS)
    return [front(sid, f) for f in range(n)]


def back(sid):
    """The same plant from behind and above, leaning to the top-right: the
    window faces and the fissure are the biggest shapes; sand cut off by
    the bottom edge."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        pair(s, 25, 21, 20.0, 11.0, 17, seed=7, lean=-1.5, fis=0.1, slant=2.5)
        sand(s, [(-2, 48), (-2, 41), (6, 38.5), (14, 39.5), (24, 40.5), (34, 39.5), (42, 37.5), (50, 39), (50, 48)],
             grains=[(3, 41), (10, 40)])
        pebble(s, 6, 44, 4.5, 3.2, tone=2)
        pebble(s, 41, 44.5, 4.0, 3.0, tone=2)
    elif sid == IDS[1]:
        pair(s, 12, 24, 10.5, 6.0, 12, seed=8, lean=-1.0)
        pair(s, 30, 18, 15.5, 8.5, 18, seed=21, lean=-1.5, slant=2.5)
        pair(s, 16, 37, 9.0, 5.0, 8, seed=10, lean=-0.5, shade=2)
        sand(s, [(-2, 48), (-2, 43), (4, 42), (12, 43.5), (22, 42.5), (32, 41.5), (42, 40.5), (50, 41), (50, 48)],
             grains=[(26, 43), (33, 42)])
        pebble(s, 41, 44.5, 4.2, 3.0, tone=2)
        pebble(s, 4, 46, 3.4, 2.4, tone=2)
    else:
        pair(s, 8, 30, 8.5, 5.0, 10, seed=16, lean=-0.5, shade=2)
        pair(s, 40, 31, 9.0, 5.0, 10, seed=17, lean=-0.5, shade=2)
        _, _, fis = pair(s, 23, 33, 12.0, 6.5, 12, seed=18, lean=-1.0)
        pair(s, 12, 41, 9.0, 4.5, 6, seed=19, lean=-0.5, shade=2)
        pair(s, 37, 42, 9.5, 4.5, 6, seed=20, lean=-0.5, shade=2)
        sand(s, [(-2, 48), (-2, 46), (8, 45.5), (20, 46), (30, 45.5), (42, 45), (50, 45.5), (50, 48)],
             grains=[(22, 46)])
        flower(s, 27, 15, 17.5, (fis[0], fis[1] + 1), 1.0, sq=0.62, tilt=8, seed=6)
    return finish(s, open_bottom=True)


ICONS = {
    # one pair: the near leaf bigger, a fissure, an olive window on each top
    IDS[0]: ["....kkkkk.kkk...",
             "...k33222kk22k..",
             "..k3211112k112k.",
             "..k2111211k1121k",
             "..k2211112k1112k",
             "..k3222222k2221k",
             "..k2222222k2211k",
             "..k1222221k2111k",
             ".kk11222211k111k",
             "k22kk11111kkk1kk",
             "k2222kkkkk11122k",
             ".kkkkkkkkkkkkkk."],
    # the taller lead pair and a smaller rear pair half hidden behind it
    IDS[1]: ["..kkkkk.kk......",
             ".k33222kk2k.....",
             "k321112k112kkk..",
             "k211121k12k322k.",
             "k221112k11k1112k",
             "k322222k21k1211k",
             "k222222k21k2211k",
             "k222221k11k2221k",
             "kk22211k1kk2111k",
             "k1k1111k1k11111k",
             "k221kkkkkkkk122k",
             ".kkkkkkkkkkkkkk."],
    # the big white daisy over the clump's fissure
    IDS[2]: ["...k.k.k.k.k....",
             "..k3k3k3k3k3k...",
             ".k33333333333k..",
             "..k3332233333k..",
             ".k33322333332k..",
             "..k3333333322k..",
             "...k2k2k3k2kkk..",
             "...kkkk2kkkkkk..",
             ".k3211kk2k1121k.",
             ".k2111k2kk1111k.",
             ".k2211k1k12211k.",
             "kk1111kkkk1111kk",
             "k22111kkkk11122k",
             ".kkkkkkkkkkkkkk."],
}


def icon(sid):
    return icon_arr(ICONS[sid])


def render():
    return {sid: (front_frames(sid), back(sid), [icon(sid), hop(icon(sid))]) for sid in IDS}


def review_layout(art, folder=None):
    from kit import to_rgba
    folder = Path(folder) if folder else Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "lithops_1x.png"), (3, "lithops_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, (56 - arr.shape[0]) * scale), im)
        sheet.save(folder / name)


POSES = {
    IDS[0]: "BRACED: one pair of fused, round-topped leaves almost buried in olive grit and tan pebbles, "
            "looking like a pebble itself; the near leaf is the bigger. The pair swells, its fissure parts "
            "and the tips of a new pair push through while sand trickles down its wall, then it settles.",
    IDS[1]: "BRACED: a clump of three pairs half buried among real pebbles, the taller lead pair in front "
            "on the foe side. The lead pair swells, its fissure parts on a new pair's tips and sand "
            "trickles off; the other pairs, the grit and the pebbles stay put.",
    IDS[2]: "BRACED: a clump of five pairs in grit and pebbles, with a large white daisy-like flower of "
            "many narrow petals rising from the central fissure, bigger than any pair. The flower "
            "climbs out of the fissure as a furled bud, opens, flares and settles; the pairs stay put.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        notes = ("Crystal rule. " + POSES[sid] + " Stone tan mid; olive-brown dark for the window "
                 "markings, fissures, shading and the grit. Windows are reticulate networks of fine "
                 "connected olive lines tied to their rims; the fissure is a crack that runs out to the "
                 "outline. No enclosed dark dots. ")
        if sid == IDS[2]:
            notes += ("WHITE: lithops flowers are genuinely white in L. karasmontana and others; the petals "
                      "are paper white, parted by tan seams and shaded tan beneath, around a tan stamen boss. ")
        notes += ("Sport: Lithops optica 'Rubra', the purple-red cultivar: the stone tan turns a deep wine "
                  "red and the olive markings a dark plum; white stays white.")
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=BLOOM_ANIM if sid == IDS[2] else ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes=notes)
        intro_strip(sid)


if __name__ == "__main__" and "--preview" not in __import__("sys").argv:
    build()
elif __name__ == "__main__":
    import sys
    from _d_kit import preview, stats
    art = render()
    out = sys.argv[sys.argv.index("--preview") + 1]
    rows = []
    for sid in IDS:
        fs, b, icons = art[sid]
        for k, f in enumerate(fs):
            stats(f"{sid}[{k}]", f)
        stats(f"{sid} back", b)
        rows.append((PAL, fs + [b] + icons))
        rows.append((SPORT, [fs[0], b] + icons))
    preview(rows, out + "_4x.png", k=4)
    preview(rows, out + "_1x.png", k=1)
    review_layout(art, Path(out).parent)
