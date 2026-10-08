"""Original Crystal-rule Silene acaulis: campion_cushion -> campion_mound -> moss_campion.

BRACED baby: a small tight cushion of needle-leaved rosettes wedged in the
crack between two frost-capped stones, three closed pink buds on top.
BRACED teen: a wider dome spilling over its boulder, a third of it starred
with open five-petalled flowers lying flat to the cushion.
BRACED adult: a big low dome, wider than tall, blanketed in pink stars, its
edge draped over a rock ledge; the heaviest silhouette of the line.
The cushion's texture is tiny rosettes on latitude rows that curve with the
dome: short dark creases under them, white needle tips on the lit top-left,
never a lone dark dot. The stone (dark rock with white frost strata on its
lit faces, read as weathered grey stone) appears in every stage and view.
Intro: the cushion swells (it keeps its centre warm) while the flowers pop
open in a wave from left to right, then it settles. The stones never move.
Sport: Silene acaulis f. alba, the white-flowered form: the pink becomes
cream and the green stays.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, Spr, erode, hop, moving_boxes, shift, tones

TOOL = "tools/art/crystal/campion.py"
IDS = ["campion_cushion", "campion_mound", "moss_campion"]
PAL = [BLACK, "#50a040", "#f090b8", WHITE]
SPORT = [BLACK, "#50a040", "#d8d0a8", WHITE]
SPAL = tuple(PAL[1:])

# Per front frame: (swell in px, how far the opening wave has travelled 0..1,
# whether the wave has closed every flower first).
KEYS = [(0, 1.0, False), (-1, 0.0, True), (1, 0.35, True), (2, 0.7, True), (2, 1.0, False), (1, 1.0, False)]
ANIM = {"intro": [[0, 6], [1, 10], [2, 5], [3, 6], [4, 16], [5, 8], [0, 1]],
        "idle": [[0, 140], [5, 10], [0, 8]]}

# --------------------------------------------------------------- stamps ----
STAR = ["..2..",
        "23322",
        ".222.",
        ".2.2."]
STAR_PLAIN = ["..2..",
              "22222",
              ".222.",
              ".2.2."]
STAR_SMALL = [".2.",
              "222",
              ".2."]
BUD = [".2.",
       "222",
       "222"]
BUD_SMALL = ["22",
             "22"]


def stamp(s, pattern, x, y, on=None, lock=True):
    """Hand-pixel pattern centred on (x, y); '.' leaves the pixel alone.
    Only paints over existing body pixels of the parts in `on`."""
    h, w = len(pattern), len(pattern[0])
    x0, y0 = int(round(x - w // 2)), int(round(y - h // 2))
    for j, row in enumerate(pattern):
        for i, ch in enumerate(row):
            if ch == ".":
                continue
            xx, yy = x0 + i, y0 + j
            if not (0 <= xx < s.w and 0 <= yy < s.h) or s.tone[yy, xx] < 0:
                continue
            if on is not None and s.pid[yy, xx] not in on:
                continue
            s.tone[yy, xx] = int(ch)
            if lock:
                s.lock[yy, xx] = True


def footprint(pattern, x, y):
    h, w = len(pattern), len(pattern[0])
    x0, y0 = int(round(x - w // 2)), int(round(y - h // 2))
    return {(x0 + i, y0 + j) for j, row in enumerate(pattern) for i, ch in enumerate(row) if ch != "."}


# ---------------------------------------------------------------- parts ----
def finish(s, **kw):
    """Outline and tones (the shared Crystal finishing), then one safeguard:
    a dark pocket wholly ringed by light (a sliver of rock caught between
    two frost strata) is filled with the frost, so no image ever holds an
    enclosed dark spot."""
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
                    t[y, x] = 3
    return t



def stone(s, pts, lit_pts, slope=0.0, gap=3, rim=0.55, crack=None):
    """Grey rock in four colours: a white frost cap on its lit top edge, and
    the lit face (inside `lit_pts`) ruled with white strata over the dark
    rock, one row in every `gap`, which reads as weathered grey stone; the
    shaded face stays dark with one crack. Strata and crack run out to the
    outline, so no dark spot is ever enclosed by white."""
    m = s.poly(pts)
    pid = s.part(m, base=0, k=0, line=0)
    inner = erode(m, 1)
    lit = inner & s.poly(lit_pts)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    k = np.floor(yy - xx * slope).astype(int)
    s.decal(lit & ((k % gap) == 0), 3, on=[pid])
    ys, xs = np.nonzero(m)
    span = (xs.max() - xs.min()) + (ys.max() - ys.min())
    near = ((xx - xs.min()) + (yy - ys.min())) <= span * rim
    s.decal(inner & ~shift(inner, 0, -2) & near, 3, on=[pid])
    if crack:
        s.decal(s.line1(crack) & inner, 3, on=[pid])
    return pid, m


LIGHT = np.array([-0.55, 0.62, 0.56])
LIGHT = LIGHT / np.linalg.norm(LIGHT)


class Dome:
    """A cushion: an upper half-ellipse (rx, ry) whose crown leans `lean` px
    toward the foe, over a shallow front lip (tilt * rx) because we look
    down on it a little. Its rosettes sit on latitude rows that curve with
    the dome, so the texture itself gives the form."""

    def __init__(self, cx, base, rx, ry, lean=3.0, tilt=0.22, swell=0.0):
        self.cx, self.base, self.lean, self.tilt = cx, base, lean, tilt
        self.rx0, self.ry0 = rx, ry                       # the rest pose
        self.rx, self.ry = rx + swell * 0.5, ry + swell   # swollen (intro)

    def at(self, th, ph, rest=False):
        rx, ry = (self.rx0, self.ry0) if rest else (self.rx, self.ry)
        a = rx * math.cos(th)
        x = self.cx + a * math.sin(ph) - self.lean * math.sin(th)
        y = self.base - ry * math.sin(th) + self.tilt * a * math.cos(ph)
        return x, y

    def mask(self, s, lumps=0.0):
        up = [(self.cx - self.rx * math.cos(t) - self.lean * math.sin(t), self.base - self.ry * math.sin(t))
              for t in np.linspace(0, math.pi, 72)]
        lo = [(self.cx + self.rx * math.cos(t), self.base + self.tilt * self.rx * math.sin(t))
              for t in np.linspace(0, math.pi, 48)]
        m = s.poly(up + lo)
        if lumps:
            # tiny rosette bumps scallop the crown
            for t in np.linspace(0.12, math.pi - 0.12, int(self.rx * 2 / 5)):
                x = self.cx - (self.rx - 1) * math.cos(t) - self.lean * math.sin(t)
                y = self.base - (self.ry - 1) * math.sin(t)
                m |= s.ellipse(x, y, lumps, lumps)
        for _ in range(2):                   # no 1px spurs on the silhouette
            m &= shift(m, 1, 0) | shift(m, -1, 0)
        return m

    def lattice(self, sx=6.0, sy=4.0):
        """Rosette centres: rows equally spaced in screen y at the front, each
        row stepped equally along its own latitude (so they crowd at the
        sides, where the dome turns away)."""
        ths = np.linspace(0, math.pi / 2, 400)
        y0 = np.array([self.at(t, 0, rest=True)[1] for t in ths])
        pts = []
        row = 0
        y = y0[0] - sy * 0.6
        while y > y0[-1] + 1.5:
            th = float(np.interp(-y, -y0, ths))
            a = max(1.0, self.rx0 * math.cos(th))
            dph = min(0.9, sx / a)
            ph = -math.pi / 2 + dph * (0.5 + 0.5 * (row % 2))
            col = 0
            while ph < math.pi / 2 - dph * 0.3:
                # the lattice is laid out on the rest pose and carried by the swell,
                # so the rosettes and flowers stay the same ones in every frame
                x, yy = self.at(th, ph)
                x0, y0_ = self.at(th, ph, rest=True)
                n = np.array([math.cos(th) * math.sin(ph), math.sin(th), math.cos(th) * math.cos(ph)])
                pts.append(dict(x=x, y=yy, x0=x0, y0=y0_, row=row, col=col, ph=ph, th=th,
                                lam=float(n @ LIGHT)))
                ph += dph
                col += 1
            row += 1
            y -= sy
        return pts


# A rosette's crease, lit to shaded: the dark under its lower-right flank,
# asymmetric so a row of them reads as packed bumps (never a row of smiles).
CREASE = [[(-1, 1), (0, 1), (1, 0)],
          [(-1, 1), (0, 1), (1, 0)],
          [(-1, 1), (0, 1), (1, 0), (1, -1)]]


def star_of(p):
    """Which open-flower stamp a rosette gets: small where the dome turns
    away, a white-glinted star where it faces the light, else plain."""
    if abs(math.sin(p["ph"])) > 0.82:
        return STAR_SMALL
    return STAR if p["lam"] > 0.62 else STAR_PLAIN


def cushion(s, domes, mask, lit=0.80, shade=0.45, tips=True, rim=0.35, sx=6.0, sy=4.0, flowers=None, rest=None):
    """Green body; each rosette's dark crease is a small smile under it.
    Lit rosettes (top-left) lose the crease and some get white needle tips;
    shaded ones (bottom-right) get the full crease. `domes` is a list of
    (Dome, region): each region takes its own dome's rosette rows (a lobe
    draped over the rock has its own little dome). `flowers(pts)` picks the
    rosettes that bloom; no two stars touch, and a crease that would meet a
    star is dropped whole, so no dark spot is caught between petals.
    Returns (pid, flowered points)."""
    pid = s.part(mask, base=1, k=0, line=0)
    inner = erode(mask, 1)
    inner0 = erode(rest if rest is not None else mask, 1)   # flowers are chosen on the rest pose
    ox = getattr(s, "ox", 0)
    marks = np.zeros(mask.shape, bool)
    white = np.zeros(mask.shape, bool)
    taken = set()
    chosen = []
    lattices = []
    for dome, region in domes:
        pts = [p for p in dome.lattice(sx, sy)
               if region[min(s.h - 1, max(0, int(round(p["y"])))), min(s.w - 1, max(0, int(round(p["x"])) + ox))]]
        lattices.append(pts)
        cand = flowers(pts) if flowers else []
        # a scattered, not gridded, bloom: accept rosettes in a fixed shuffled order
        cand = sorted(cand, key=lambda p: ((p["row"] * 7919 + p["col"] * 104729) * 2654435761) % 1000003)
        rest_taken = set()
        for p in cand:
            fp0 = footprint(star_of(p), p["x0"] + ox, p["y0"])
            halo = {(x + dx, y + dy) for x, y in fp0 for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
            fp = footprint(star_of(p), p["x"] + ox, p["y"])
            if halo & rest_taken or fp & taken:
                continue
            if not all(0 <= x < s.w and 0 <= y < s.h and inner0[y, x] for x, y in fp0):
                continue
            rest_taken |= fp0
            taken |= fp
            chosen.append(p)
    near = {(x + dx, y + dy) for x, y in taken for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))}
    for pts in lattices:
        for p in pts:
            cx, cy = int(round(p["x"])) + ox, int(round(p["y"]))
            side = abs(math.sin(p["ph"])) > 0.8
            if p["lam"] > lit:
                # lit rosettes: a white needle tip on every other one, a light crease on the rest
                if (p["row"] + p["col"]) % 2 == 0:
                    if tips and not {(cx - 1, cy - 1), (cx, cy - 1)} & near:
                        for dx in (-1, 0):
                            if 0 <= cx + dx < s.w and 0 <= cy - 1 < s.h:
                                white[cy - 1, cx + dx] = True
                    continue
                arc = CREASE[0]
            elif side or p["lam"] > shade:
                arc = CREASE[1]
            else:
                arc = CREASE[2]
            px_ = [(cx + dx, cy + dy) for dx, dy in arc]
            if set(px_) & near or not all(0 <= x < s.w and 0 <= y < s.h and inner[y, x] for x, y in px_):
                continue                                  # a whole crease or none: never a stray dot
            for x, y in px_:
                if 0 <= x < s.w and 0 <= y < s.h:
                    marks[y, x] = True
    s.decal(marks & inner, 0, on=[pid])
    s.decal(white & erode(mask, 2), 3, on=[pid])
    if rim:
        ys, xs = np.nonzero(mask)
        span = (xs.max() - xs.min()) + (ys.max() - ys.min())
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        edge = mask & ~shift(mask, 0, -1)
        s.decal(edge & (((xx - xs.min()) + (yy - ys.min())) < span * rim), 3, on=[pid])
    return pid, chosen


def blooms(s, pid, spots, wave, closed):
    """Open stars on chosen rosettes (closed buds until the wave reaches
    them, from the left)."""
    if not spots:
        return
    xs = [p["x"] for p in spots]
    lo, hi = min(xs), max(xs) + 1e-6
    ox = getattr(s, "ox", 0)
    for p in spots:
        x, y = p["x"] + ox, p["y"]
        if closed and (p["x"] - lo) / (hi - lo) >= wave:
            stamp(s, BUD_SMALL, x + 0.5, y, on=[pid])
        else:
            stamp(s, star_of(p), x, y, on=[pid])


def bud(s, x, y, tall=2.0, lean=0.0, popped=False):
    """A closed pink bud sitting in the cushion (its green shade is the
    calyx); `popped` opens it into a star for the intro peak."""
    if popped:
        m = s.poly([(x - 3.5, y - 1.5), (x - 1, y - 2), (x, y - 4.5), (x + 1, y - 2), (x + 3.5, y - 1.5),
                    (x + 1.5, y + 0.5), (x + 2.5, y + 3), (x, y + 1.5), (x - 2.5, y + 3), (x - 1.5, y + 0.5)])
        pid = s.part(m, base=2, k=0, line=0)
        s.glint([(x - 1, y - 1), (x, y - 1)])
        return pid
    # a pointed teardrop, tip up and leaning; its shaded lower right is the green calyx
    tip = (x + lean * 2, y - 2 * tall - 0.5)
    m = s.poly([tip, (x + 2.2, y - tall * 0.7), (x + 1.8, y + 1.5), (x - 1.8, y + 1.5), (x - 2.2, y - tall * 0.7)])
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    s.glint([(x - 1 + round(lean), y - round(tall)), (x - 1 + round(lean), y - round(tall) + 1)])
    return pid


# --------------------------------------------------------------- fronts ----
def front_cushion(frame):
    sw, wave, closed = KEYS[frame]
    s = Spr(56, 56, SPAL)
    s.ox = 1
    d = Dome(29.5, 47, 16, 15, lean=2.5, tilt=0.25, swell=sw)
    m = d.mask(s, lumps=2.0)
    m |= s.poly([(26, 48), (29, 54), (31, 54), (34, 48)])     # its taproot wedged into the crack
    cushion(s, [(d, m)], m)
    # the two stones grip it from either side, in front of its base
    stone(s, [(9, 55), (10, 49), (13, 45), (19, 43), (24, 44), (28, 48), (30, 55)],
          [(8, 42), (25, 42), (19, 55), (8, 55)], crack=[(25, 49), (27, 52), (26, 55)])
    stone(s, [(30, 55), (31, 50), (35, 46), (41, 45), (47, 46), (49, 50), (49, 55)],
          [(30, 44), (45, 44), (39, 55), (30, 55)], crack=[(44, 49), (43, 52), (44, 55)])
    pop = frame in (3, 4)
    for x, y, tall, lean in ((23, 36 - sw, 2.0, -0.4), (36, 37 - sw, 1.7, 0.3), (29.5, 33 - sw, 2.4, 0.0)):
        bud(s, x, y, tall, lean, popped=(pop and x < 31) or (frame == 4 and x > 31))
    return finish(s)


def front_mound(frame):
    sw, wave, closed = KEYS[frame]
    s = Spr(56, 56, SPAL)
    # the boulder: its frosted right shoulder shows beside the cushion
    stone(s, [(17, 55), (17, 47), (22, 40), (33, 35), (42, 33), (47, 33), (51, 37), (53, 44), (53, 55)],
          [(16, 33), (48, 33), (36, 55), (16, 55)], slope=0.2, rim=0.75, crack=[(49, 46), (51, 50), (50, 55)])
    d = Dome(27.5, 40, 18.5, 16, lean=4, tilt=0.2, swell=sw)
    m = d.mask(s, lumps=2.2)
    lobe = Dome(13, 47, 5.5, 7, lean=0, tilt=0.5)          # spilling down the boulder's left side
    lm = lobe.mask(s) & ~m
    rest = Dome(27.5, 40, 18.5, 16, lean=4, tilt=0.2).mask(s, lumps=2.2) | lobe.mask(s)
    pid, spots = cushion(s, [(d, m), (lobe, lm)], m | lm, rest=rest,
                         flowers=lambda pts: [p for p in pts if p["x"] < 31 and abs(math.sin(p["ph"])) < 0.85])
    blooms(s, pid, spots, wave, closed)
    return finish(s)


def front_campion(frame):
    sw, wave, closed = KEYS[frame]
    s = Spr(56, 56, SPAL)
    # the ledge: a broad slab, its frosted lip showing under the cushion
    stone(s, [(14, 55), (14, 46), (17, 43), (40, 42), (52, 42), (55, 44), (55, 55)],
          [(13, 41), (56, 41), (44, 55), (13, 55)], slope=0.08, gap=4, rim=1.0, crack=[(51, 47), (49, 51), (50, 55)])
    d = Dome(30.5, 42, 24.5, 21, lean=3, tilt=0.07, swell=sw)
    m = d.mask(s, lumps=2.5)
    lobe = Dome(10, 50, 8.5, 8.5, lean=0, tilt=0.45)          # its edge draped over the ledge's lip
    lm = lobe.mask(s) & ~m
    rest = Dome(30.5, 42, 24.5, 21, lean=3, tilt=0.07).mask(s, lumps=2.5) | lobe.mask(s)
    pid, spots = cushion(s, [(d, m), (lobe, lm)], m | lm, rest=rest,
                         flowers=lambda pts: pts)
    blooms(s, pid, spots, wave, closed)
    return finish(s)


FRONT = {IDS[0]: front_cushion, IDS[1]: front_mound, IDS[2]: front_campion}


def front_frames(sid):
    return [FRONT[sid](k) for k in range(len(KEYS))]


# ---------------------------------------------------------------- backs ----
def back(sid):
    """From behind and above: the dome's crown fills the view, its rosette
    rows curving round it, the stone showing at the bottom corners."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        d = Dome(24, 38, 22, 24, lean=-1, tilt=0.45)
        m = d.mask(s, lumps=2.0)
        cushion(s, [(d, m)], m)
        stone(s, [(0, 48), (0, 41), (5, 37), (12, 39), (16, 44), (16, 48)],
              [(0, 36), (14, 36), (8, 48), (0, 48)], slope=0.2)
        stone(s, [(33, 48), (34, 43), (39, 39), (46, 39), (48, 41), (48, 48)],
              [(33, 38), (48, 38), (44, 48), (33, 48)], slope=0.2)
        for x, y in ((18, 22), (30, 19), (26, 29)):
            bud(s, x, y, 1.9, lean=-0.3)
    else:
        adult = sid == IDS[2]
        d = Dome(24, 38, 23 if adult else 21, 34 if adult else 28, lean=-1, tilt=0.45)
        m = d.mask(s, lumps=2.4)
        if adult:
            pick_ = lambda pts: pts  # noqa: E731
        else:
            pick_ = lambda pts: [p for p in pts if (p["row"] + p["col"]) % 2 == 0  # noqa: E731
                                 and p["x"] < 26 and abs(math.sin(p["ph"])) < 0.85]
        pid, spots = cushion(s, [(d, m)], m, flowers=pick_)
        blooms(s, pid, spots, 1.0, False)
        # the rock it grips shows at the bottom corners, in front
        if adult:
            stone(s, [(0, 48), (0, 42), (4, 39), (14, 40), (17, 44), (17, 48)],
                  [(0, 38), (16, 38), (10, 48), (0, 48)], slope=0.1)
            stone(s, [(36, 48), (37, 42), (42, 40), (48, 40), (48, 48)],
                  [(36, 39), (48, 39), (44, 48), (36, 48)], slope=0.1)
        else:
            stone(s, [(31, 48), (32, 42), (38, 37), (45, 37), (48, 39), (48, 48)],
                  [(31, 36), (48, 36), (42, 48), (31, 48)], slope=0.15)
    return finish(s, open_bottom=True)


# ---------------------------------------------------------------- icons ----
def icon(sid):
    """16px: the cushion on its frosted stone. Buds and flowers are spread at
    different heights so no two light spots ever pair up like eyes."""
    s = Spr(16, 16, SPAL)
    stone(s, [(1, 16), (2, 12), (7, 11), (13, 11), (15, 13), (15, 16)], [(0, 10), (10, 10), (6, 16), (0, 16)],
          rim=0.7)
    if sid == IDS[0]:
        d = Dome(8, 12, 5.5, 6, lean=1, tilt=0.2)
    elif sid == IDS[1]:
        d = Dome(8, 12, 7, 7.5, lean=1, tilt=0.2)
    else:
        d = Dome(8, 13, 8, 10, lean=1, tilt=0.15)
    m = d.mask(s)
    pid = s.part(m, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:16, 0:16]
    edge = m & ~shift(m, 0, -1) & (xx + yy < 15)
    s.decal(edge, 3, on=[pid])
    if sid == IDS[0]:
        stamp(s, BUD, 6, 6, on=[pid])
        stamp(s, BUD_SMALL, 11, 9, on=[pid])
    elif sid == IDS[1]:
        for x, y in ((5, 6), (10, 8), (5, 10)):
            stamp(s, STAR_SMALL, x, y, on=[pid])
    else:
        for x, y in ((5, 5), (10, 4), (12, 9), (8, 8), (4, 10)):
            stamp(s, STAR_SMALL, x, y, on=[pid])
    return finish(s)


# --------------------------------------------------------------- output ----
def render():
    return {sid: (front_frames(sid), back(sid), [icon(sid), hop(icon(sid))]) for sid in IDS}


def review_layout(art):
    """The lead's layout: each species' front, back and icon at 3x in one row."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "campion_1x.png"), (3, "campion_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, (56 - arr.shape[0]) * scale), im)
        sheet.save(folder / name)
    # Every frame at 1x and 3x, then the sport, for iteration.
    for scale, name in ((1, "campion_frames_1x.png"), (3, "campion_frames_3x.png")):
        sheet = Image.new("RGB", ((56 * 7 + 48 + 32) * scale, 56 * 3 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            x = 0
            for arr, pal in [(f, PAL) for f in fs] + [(fs[0], SPORT), (b, PAL)] + [(i, PAL) for i in icons]:
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, (x * scale, (56 * n + 56 - arr.shape[0]) * scale), im)
                x += arr.shape[1]
        sheet.save(folder / name)


POSES = {
    IDS[0]: "BRACED: a small tight needle-leaved cushion wedged in the crack between two frost-capped "
            "stones, three closed pink buds on top; the cushion swells and the buds pop open in a wave.",
    IDS[1]: "BRACED: a wider dome spilling over its boulder, a third starred with flat five-petalled "
            "pink flowers; it swells while the flowers pop open in a wave.",
    IDS[2]: "BRACED: a big low dome, wider than tall, blanketed in pink stars, its edge draped over a "
            "rock ledge; it swells while the flowers pop open in a wave from left to right.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + POSES[sid] + " Cushion green in the dark slot, rose-pink "
                      "flowers in the mid slot. Latitude rows of tiny rosettes give the fine needle texture: "
                      "dark creases, white needle tips only on the lit top-left, no enclosed dark dots. "
                      "White is otherwise frost on the stone's lit faces and petal glints. The stone the "
                      "cushion grips stays fixed in every frame. Sport: Silene acaulis f. alba, the natural "
                      "white-flowered form: the pink mid tone becomes cream, the green stays. WHITE: sport only; "
                      "the cream lives in index 2, so the shared white share is unchanged.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
