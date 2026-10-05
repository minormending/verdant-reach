"""Tiny pixel-art construction kit for hand-built GBC creature sprites.

A sprite is built from *parts* (shapes drawn back to front). Each part is a
boolean mask sampled at pixel centres (no anti-aliasing), lit from the
top-left with a dome model, then the whole thing gets one consistent 1px
#181818 outline. After that, per-sprite hand edits paint explicit pixels.

Tones: -1 transparent, 0 outline (#181818), 1 dark, 2 mid, 3 light.
Every sprite is exactly 4 colours + transparency (GBC rule).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from PIL import Image
from scipy import ndimage

K = "#181818"
NO_INNER = False   # icon renders: skip internal part lines (they'd swamp a 16px miniature)
CROSS = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
LIGHT = np.array([-1.0, -1.15, 1.25])
LIGHT /= np.linalg.norm(LIGHT)


def snap(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(min(248, round(int(h[i:i + 2], 16) / 8) * 8) for i in (0, 2, 4))


# --------------------------------------------------------------------------- shapes

class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        ys, xs = np.mgrid[0:h, 0:w]
        self.X = xs + 0.5
        self.Y = ys + 0.5

    def empty(self):
        return np.zeros((self.h, self.w), bool)

    def ellipse(self, cx, cy, rx, ry, ang=0.0):
        a = math.radians(ang)
        dx, dy = self.X - cx, self.Y - cy
        u = dx * math.cos(a) + dy * math.sin(a)
        v = -dx * math.sin(a) + dy * math.cos(a)
        return (u / rx) ** 2 + (v / ry) ** 2 <= 1.0

    def circle(self, cx, cy, r):
        return self.ellipse(cx, cy, r, r)

    def rect(self, x0, y0, x1, y1):
        return (self.X >= x0) & (self.X < x1) & (self.Y >= y0) & (self.Y < y1)

    def poly(self, pts):
        pts = np.asarray(pts, float)
        inside = self.empty()
        n = len(pts)
        X, Y = self.X, self.Y
        for i in range(n):
            x0, y0 = pts[i]
            x1, y1 = pts[(i + 1) % n]
            cond = ((y0 > Y) != (y1 > Y))
            with np.errstate(divide="ignore", invalid="ignore"):
                xint = (x1 - x0) * (Y - y0) / (y1 - y0 + 1e-12) + x0
            inside ^= cond & (X < xint)
        return inside

    def _seg_dist(self, p, q):
        p, q = np.asarray(p, float), np.asarray(q, float)
        d = q - p
        L2 = max(d @ d, 1e-9)
        t = np.clip(((self.X - p[0]) * d[0] + (self.Y - p[1]) * d[1]) / L2, 0, 1)
        px, py = p[0] + t * d[0], p[1] + t * d[1]
        return np.hypot(self.X - px, self.Y - py), t

    def stroke(self, pts, w0, w1=None):
        """Thick polyline, width tapering w0 -> w1 along its length."""
        w1 = w0 if w1 is None else w1
        pts = [np.asarray(p, float) for p in pts]
        lens = [np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1)]
        tot = sum(lens) or 1
        m = self.empty()
        acc = 0
        for i, L in enumerate(lens):
            d, t = self._seg_dist(pts[i], pts[i + 1])
            s = (acc + t * L) / tot
            w = w0 + (w1 - w0) * s
            m |= d <= w / 2
            acc += L
        return m

    def curve(self, ctrl, w0, w1=None, n=40):
        return self.stroke(bezier(ctrl, n), w0, w1)

    def leaf(self, p0, p1, width, bend=0.0, power=0.8, teeth=0, tooth=0.0, lobes=0, lobe=0.0,
             tip=1.0, base=1.0):
        """Lens shape from p0 (base) to p1 (tip). `bend` curves the midrib
        (px, + = to the right of travel). teeth/lobes modulate the edge."""
        p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
        ax = p1 - p0
        L = np.linalg.norm(ax)
        ax /= L
        nx = np.array([-ax[1], ax[0]])
        dx, dy = self.X - p0[0], self.Y - p0[1]
        u = (dx * ax[0] + dy * ax[1]) / L
        v = dx * nx[0] + dy * nx[1]
        uc = np.clip(u, 0, 1)
        v = v - bend * np.sin(np.pi * uc)
        prof = np.sin(np.pi * uc) ** power
        # asymmetric ends: tip<1 sharpens the tip, base<1 sharpens the base
        prof = np.where(uc > 0.5, prof ** tip, prof ** base)
        half = width / 2 * prof
        if teeth:
            # saw teeth pointing back toward the base (dandelion, bramble leaf)
            fr = (teeth * uc) % 1.0
            half = half * (1 - tooth * fr * (uc > 0.1) * (uc < 0.95))
        if lobes:
            # rounded lobes with deep sinuses (oak leaf)
            half = half * (1 - lobe * (1 - np.abs(np.sin(np.pi * lobes * uc + 0.3)) ** 0.5))
        return (u >= 0) & (u <= 1) & (np.abs(v) <= half)

    def rays(self, cx, cy, n, r0, r1, width, rot=0.0, sx=1.0, sy=1.0, power=0.8, tip=1.0):
        """n petals radiating from a centre (ellipse-squashed by sx, sy)."""
        m = self.empty()
        for i in range(n):
            a = math.radians(rot) + 2 * math.pi * i / n
            p0 = (cx + math.cos(a) * r0 * sx, cy + math.sin(a) * r0 * sy)
            p1 = (cx + math.cos(a) * r1 * sx, cy + math.sin(a) * r1 * sy)
            m |= self.leaf(p0, p1, width, power=power, tip=tip)
        return m


def bezier(ctrl, n=40):
    ctrl = np.asarray(ctrl, float)
    ts = np.linspace(0, 1, n)
    out = []
    for t in ts:
        pts = ctrl.copy()
        while len(pts) > 1:
            pts = (1 - t) * pts[:-1] + t * pts[1:]
        out.append(pts[0])
    return out


def shift(m, dx, dy):
    out = np.zeros_like(m)
    h, w = m.shape
    ys = slice(max(0, dy), min(h, h + dy))
    yd = slice(max(0, -dy), min(h, h - dy))
    xs = slice(max(0, dx), min(w, w + dx))
    xd = slice(max(0, -dx), min(w, w - dx))
    out[ys, xs] = m[yd, xd]
    return out


# --------------------------------------------------------------------------- sprite

def prune_mask(m, min_n=2, min_size=4):
    """Drop 1px spurs (pixels with < min_n orthogonal neighbours) and crumbs."""
    m = m.copy()
    for _ in range(4):
        n = sum(shift(m, dx, dy).astype(int) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        bad = m & (n < min_n)
        if not bad.any():
            break
        m &= ~bad
    lab, k = ndimage.label(m)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        for i, sz in enumerate(sizes):
            if sz < min_size:
                m[lab == i + 1] = False
    return m


@dataclass
class Part:
    mask: np.ndarray
    tones: tuple = (1, 2, 3)        # (shadow, body, light)
    line: str = "black"             # line against parts behind: black | dark | none
    hl: object = None               # None | "rim" | "spot" | mask
    dark: float = 0.18              # lambert below (Lz - dark) -> shadow
    lite: float = 0.16              # lambert above (Lz + lite) -> light (rim mode)
    round: float = 0.0              # dome radius (px); 0 = auto (max EDT)
    cast: int = 0                   # cast-shadow depth from parts in front
    name: str = ""
    flat: bool = False              # no lighting, body tone only
    shade: tuple = None             # (ox, oy): shadow where p+(ox,oy) leaves the mask (crisp crescent)
    close: int = 0                  # smooth the mask (closing radius) before computing shade/band
    band: tuple = None              # (a, b, ...): light band inside the top-left rim, depth a..b


class Sprite:
    def __init__(self, w, h, pal, crop_bottom=False):
        self.c = Canvas(w, h)
        self.w, self.h = w, h
        self.pal = [snap(K)] + [snap(p) for p in pal]
        assert len(self.pal) == 4
        self.parts: list[Part] = []
        self.crop_bottom = crop_bottom
        self.t = None
        self.protect = None

    # building
    def add(self, mask, prune=True, **kw) -> Part:
        p = Part(mask=prune_mask(mask) if prune else mask.copy(), **kw)
        self.parts.append(p)
        return p

    def render(self):
        h, w = self.h, self.w
        owner = np.full((h, w), -1)
        for i, p in enumerate(self.parts):
            owner[p.mask] = i
        t = np.full((h, w), -1)
        for i, p in enumerate(self.parts):
            vis = owner == i
            if not vis.any():
                continue
            t[vis] = self._light(p, vis, owner, i)[vis]
        # internal lines against parts behind
        for i, p in enumerate(self.parts):
            if p.line == "none" or NO_INNER:
                continue
            vis = owner == i
            behind = (owner >= 0) & (owner < i)
            nb = np.zeros_like(vis)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb |= shift(behind, dx, dy)
            edge = vis & nb
            t[edge] = 0 if p.line == "black" else p.tones[0]
        sil = owner >= 0
        holes = ndimage.binary_fill_holes(sil) & ~sil
        lab, k = ndimage.label(holes)
        for j in range(1, k + 1):
            if (lab == j).sum() > 6:
                holes[lab == j] = False
        t[holes] = 1
        owner[holes] = 0
        sil |= holes
        self.owner = owner
        self.t = t
        self.protect = np.zeros((h, w), bool)
        self._outline(sil)
        return self

    def _light(self, p: Part, vis, owner, i):
        m = p.mask
        sh, bd, lt = p.tones
        out = np.full(m.shape, bd)
        if p.flat:
            return out
        if p.shade is not None:
            ox, oy = p.shade
            mm = m
            if p.close:
                r = p.close
                yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
                disk = xx * xx + yy * yy <= r * r + 0.5
                mm = ndimage.binary_closing(np.pad(m, r + 1), disk)[r + 1:-r - 1, r + 1:-r - 1] | m
            out[m & ~shift(mm, -ox, -oy)] = sh
            if p.band is not None:
                a, b = p.band[:2]
                lit = m & shift(mm, a, a) & ~shift(mm, b, b) & (out == bd)
                if len(p.band) > 2:
                    lit &= p.band[2]
                lab, k = ndimage.label(lit)
                if k > 1:
                    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
                    lit = lab == (1 + int(np.argmax(sizes)))
                out[lit] = lt
            if isinstance(p.hl, np.ndarray):
                out[p.hl & m] = lt
            if p.cast:
                front = owner > i
                cs = np.zeros_like(m)
                for k in range(1, p.cast + 1):
                    cs |= shift(front, k, k)
                out[cs & m] = sh
            return out
        d = ndimage.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1]
        R = p.round or max(d.max(), 1)
        x = np.clip(d / R, 0, 1)
        hgt = np.sqrt(np.clip(1 - (1 - x) ** 2, 0, 1)) * R
        hgt = ndimage.gaussian_filter(hgt, 0.7)
        gy, gx = np.gradient(hgt)
        n = np.stack([-gx, -gy, np.ones_like(gx)], -1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
        lam = n @ LIGHT
        Lz = LIGHT[2]
        out[lam < Lz - p.dark] = sh
        if isinstance(p.hl, np.ndarray):
            out[p.hl & m] = lt
        elif p.hl == "rim":
            out[lam > Lz + p.lite] = lt
        elif p.hl == "spot":
            ys, xs = np.nonzero(m)
            cx, cy = xs.mean(), ys.mean()
            ex, ey = xs.max() - xs.min(), ys.max() - ys.min()
            spot = self.c.ellipse(cx - 0.22 * ex, cy - 0.24 * ey, max(1.2, 0.13 * ex), max(1.0, 0.10 * ey), -35)
            out[spot & m & (d > 1.5)] = lt
        if p.cast:
            front = owner > i
            cs = np.zeros_like(m)
            for k in range(1, p.cast + 1):
                cs |= shift(front, k, k)
            out[cs & m] = sh
        return out

    def _outline(self, sil):
        t = self.t
        h, w = t.shape
        pad = np.pad(sil, 1, constant_values=False)
        if self.crop_bottom:
            pad[-1, :] = True
        inner = np.zeros_like(sil)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            inner |= sil & ~shift(pad, dx, dy)[1:-1, 1:-1]
        t[inner] = 0
        self._pixel_perfect()

    def _pixel_perfect(self):
        """Drop outline elbows that stick out (convex L corners): smoother curves."""
        t = self.t
        for _ in range(2):
            sil = t >= 0
            line = t == 0
            changed = False
            ys, xs = np.nonzero(line)
            for y, x in zip(ys, xs):
                def at(yy, xx, m):
                    if 0 <= yy < self.h and 0 <= xx < self.w:
                        return m[yy, xx]
                    return self.crop_bottom and yy >= self.h and m is sil
                n, s, e, wv = at(y - 1, x, line), at(y + 1, x, line), at(y, x + 1, line), at(y, x - 1, line)
                ns, ss, es, ws = at(y - 1, x, sil), at(y + 1, x, sil), at(y, x + 1, sil), at(y, x - 1, sil)
                if self.crop_bottom and y == self.h - 1:
                    continue
                for (a, b, oa, ob) in ((n, e, ss, ws), (n, wv, ss, es), (s, e, ns, ws), (s, wv, ns, es)):
                    if a and b and not oa and not ob:
                        t[y, x] = -1
                        changed = True
                        break
            if not changed:
                break

    # hand edits
    def px(self, pts, tone, protect=True):
        for x, y in pts:
            if 0 <= x < self.w and 0 <= y < self.h:
                self.t[y, x] = tone
                if protect:
                    self.protect[y, x] = True

    def paint(self, mask, tone, only=None, protect=True):
        """Paint a mask with a tone, only over existing body (not outline/empty)."""
        m = mask & (self.t > 0) if only is None else mask & np.isin(self.t, only)
        self.t[m] = tone
        if protect:
            self.protect |= m

    def rows(self, x0, y0, rows, keymap=None):
        """ASCII hand edit: '.' skip, ' ' skip, '_' transparent, 0-3 tones."""
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in ". ":
                    continue
                v = -1 if ch == "_" else int(ch)
                x, y = x0 + i, y0 + j
                if 0 <= x < self.w and 0 <= y < self.h:
                    self.t[y, x] = v
                    self.protect[y, x] = True

    def clean(self, passes=3, force=False):
        """Remove orphan pixels: a body pixel with no same-tone neighbour (8-way)
        takes the commonest body tone around it. Protected pixels stay."""
        t = self.t
        N8 = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
        for _ in range(passes):
            changed = False
            for y in range(self.h):
                for x in range(self.w):
                    v = t[y, x]
                    if v <= 0 or (self.protect[y, x] and not force):
                        continue
                    nb = [t[y + dy, x + dx] for dy, dx in N8 if 0 <= y + dy < self.h and 0 <= x + dx < self.w]
                    if v in nb:
                        continue
                    body = [n for n in nb[:4] if n > 0] or [n for n in nb if n > 0]
                    if not body:
                        if force:
                            t[y, x] = 0      # a lone fill pixel in the outline: make it outline
                        continue
                    t[y, x] = max(set(body), key=body.count)
                    changed = True
            if not changed:
                break
        return self

    def image(self) -> Image.Image:
        self.clean(force=True)       # final guarantee: no orphan pixels anywhere
        a = np.zeros((self.h, self.w, 4), np.uint8)
        for k in range(4):
            a[self.t == k] = self.pal[k] + (255,)
        return Image.fromarray(a, "RGBA")


# --------------------------------------------------------------------------- icons

def icon_rows(rows, pal):
    """16x16 icon from ASCII: '.' transparent, 0-3 tones."""
    h, w = len(rows), max(len(r) for r in rows)
    assert (h, w) == (16, 16), (h, w)
    a = np.zeros((16, 16, 4), np.uint8)
    P = [snap(K)] + [snap(p) for p in pal]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in "0123":
                a[y, x] = P[int(ch)] + (255,)
    return Image.fromarray(a, "RGBA")


def squash(img: Image.Image, row: int) -> Image.Image:
    """Frame 2: drop one row at `row` and shift everything above down 1px
    (a squash toward the ground, base stays planted)."""
    a = np.asarray(img).copy()
    out = np.zeros_like(a)
    out[row + 1:] = a[row + 1:]
    out[1:row + 1] = a[0:row]
    return Image.fromarray(out, "RGBA")


def bob(img: Image.Image) -> Image.Image:
    a = np.asarray(img)
    out = np.zeros_like(a)
    out[1:] = a[:-1]
    return Image.fromarray(out, "RGBA")


def lobed_leaf(c: Canvas, p0, p1, w, lobes=2, bend=0.0, **_):
    """Oak leaf: a core ellipse plus round lobes (circles) placed in leaf
    coordinates, so any rotation still rasterises cleanly."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])

    def at(u, v):
        q = p0 + ax * L * u + nx * (v * w + bend * np.sin(np.pi * u))
        return q

    q = at(0.5, 0)
    ang = np.degrees(np.arctan2(ax[1], ax[0]))
    m = c.ellipse(q[0], q[1], 0.42 * L, 0.18 * w, ang)
    m |= c.stroke([at(0, 0), at(0.3, 0)], max(1.5, 0.12 * w))
    tip = at(0.85, 0)
    m |= c.circle(tip[0], tip[1], 0.23 * w)
    pairs = [(0.61, 0.31, 0.21), (0.36, 0.27, 0.18)] if lobes == 2 else \
        [(0.66, 0.3, 0.2), (0.47, 0.29, 0.19), (0.29, 0.24, 0.16)]
    for u, v, r in pairs:
        for sd in (-1, 1):
            q = at(u + (0.03 if sd > 0 else 0), sd * v)
            m |= c.circle(q[0], q[1], r * w)
    return m


def lit_stripe(c: Canvas, ctrl, w0, w1, t0, t1, inset=2.5, width=2.0, n=60, path=None):
    """Highlight stripe inside a tapered stroke, offset toward the light."""
    pts = np.asarray(path if path is not None else bezier(ctrl, n))
    out = []
    for i in range(len(pts)):
        t = i / (len(pts) - 1)
        if not (t0 <= t <= t1):
            continue
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        d = b - a
        d /= np.linalg.norm(d) + 1e-9
        nrm = np.array([-d[1], d[0]])
        if nrm @ np.array([-1.0, -0.8]) < 0:
            nrm = -nrm
        w = w0 + (w1 - w0) * t
        out.append(pts[i] + nrm * max(0.0, w / 2 - inset))
    if len(out) < 2:
        return c.empty()
    return c.stroke(out, width)


def spline(pts, n=12):
    """Catmull-Rom through the given points (dense polyline)."""
    P = [np.asarray(p, float) for p in pts]
    P = [P[0]] + P + [P[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return out


def blob(c: Canvas, pts, n=10):
    """Closed organic shape through the outline points (Catmull-Rom)."""
    P = list(pts)
    ring = spline(P + P[:3], n)
    k = n  # drop the duplicated wrap segment at the start
    return c.poly(ring[k:k + n * len(P)])


def star(c: Canvas, cx, cy, n, r_in, r_out, sx=1.0, sy=1.0, rot=0.0, round_in=False):
    """Zigzag-edged disc: n points between radius r_in and r_out."""
    pts = []
    for i in range(2 * n):
        a = np.radians(rot) + np.pi * i / n
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + np.cos(a) * r * sx, cy + np.sin(a) * r * sy))
    return c.poly(pts)


def saw_leaf(c: Canvas, p0, p1, w, lobes=3, depth=0.62, bend=0.0, hook=0.06, tip_len=0.3):
    """Dandelion (runcinate) leaf: midrib p0->p1; triangular lobes on both
    sides whose points hook back toward the base; a big triangular end lobe."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])

    def at(u, v):
        return p0 + ax * L * u + nx * (v + bend * np.sin(np.pi * u))

    side = []
    end = 1 - tip_len
    for sd in (1, -1):
        pts = [at(0, sd * 1.2)]
        for i in range(lobes):
            u0 = 0.08 + (end - 0.08) * i / lobes
            u1 = 0.08 + (end - 0.08) * (i + 1) / lobes
            half = w / 2 * (0.6 + 0.4 * (i + 1) / lobes)
            pts.append(at(u0, sd * max(1.2, half * (1 - depth))))         # notch
            pts.append(at(u0 - hook, sd * half))                          # point, hooked back
        pts.append(at(end, sd * max(1.2, w / 2 * (1 - depth))))           # notch before the end lobe
        pts.append(at(end - hook * 0.5, sd * w / 2 * 0.95))               # end lobe shoulder
        side.append(pts)
    tip = [at(1.0, 0)]
    return c.poly(side[0] + tip + side[1][::-1])
