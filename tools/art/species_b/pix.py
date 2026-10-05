"""Tiny hand-pixel toolkit for the species B sprites.

Every sprite is composed from shapes (ellipses, polygons, tapered strokes,
spirals, maple leaves) rasterised at 1x (coverage >= 50% of a 4x supersample,
so curves step evenly), painted back to front as *parts*. Each part carries
its own form shading, computed on its own full shape so the shading follows
the form even where a later part covers it:

  tone 0 = outline (#181818), 1 = dark, 2 = light, 3 = white

* a shadow band along the bottom-right of the shape (light from top-left),
* one deliberate highlight shape (an explicit ellipse/mask or a short rim),
* a 1px #181818 outline outside the silhouette, and 1px lines on the part
  BEHIND wherever a part overlaps another (so overlaps read as depth),
* decals (ribs, veins, teeth, dew) painted onto existing pixels,
* an orphan-pixel sweep at the end.

Hand edits are applied last with `px()` / `rows()` (ASCII patches).
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

SS = 4
K = (24, 24, 24)  # #181818
WHITE = (248, 248, 248)


def hexc(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(min(248, round(int(h[i:i + 2], 16) / 8) * 8) for i in (0, 2, 4))


def shift(m: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """out[y, x] = m[y + dy, x + dx] (False outside)."""
    h, w = m.shape
    out = np.zeros_like(m)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    if ys0 < ys1 and xs0 < xs1:
        out[ys0:ys1, xs0:xs1] = m[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
    return out


def erode(m, n=1):
    for _ in range(n):
        m = m & shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1)
    return m


def dilate(m, n=1, diag=False):
    for _ in range(n):
        o = m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)
        if diag:
            o |= shift(m, 1, 1) | shift(m, -1, 1) | shift(m, 1, -1) | shift(m, -1, -1)
        m = o
    return m


# ---------------------------------------------------------------------------
# geometry
# ---------------------------------------------------------------------------

def bez(pts, n=48):
    """Catmull-Rom spline through pts (list of (x, y)); returns n*(len-1) points."""
    pts = [np.array(p, float) for p in pts]
    if len(pts) == 2:
        return [tuple(pts[0] + (pts[1] - pts[0]) * t) for t in np.linspace(0, 1, n)]
    P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=(i == len(P) - 3)):
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            out.append(tuple(q))
    return out


def qbez(p0, c, p1, n=64):
    p0, c, p1 = (np.array(p, float) for p in (p0, c, p1))
    return [tuple((1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t * t * p1) for t in np.linspace(0, 1, n)]


def arclen_param(path):
    d = [0.0]
    for a, b in zip(path, path[1:]):
        d.append(d[-1] + math.dist(a, b))
    L = d[-1] or 1.0
    return [x / L for x in d], L


def offset_poly(path, widths):
    """Polygon around a centreline with per-point full widths."""
    left, right = [], []
    n = len(path)
    for i, (x, y) in enumerate(path):
        a = path[max(0, i - 1)]
        b = path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        w = widths[i] / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return left + right[::-1]


def rot(pts, ang, cx=0.0, cy=0.0):
    c, s = math.cos(ang), math.sin(ang)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


class Canvas:
    def __init__(self, w, h, sc=1.0):
        self.w, self.h = w, h
        self.sc = sc   # vector scale about the bottom-centre (geometry only; rasterised after)

    def T(self, pts):
        if self.sc == 1.0:
            return pts
        ax, ay = self.w / 2, self.h
        return [(ax + (x - ax) * self.sc, ay + (y - ay) * self.sc) for x, y in pts]

    # -- rasterisers --------------------------------------------------------
    def _img(self):
        im = Image.new("L", (self.w * SS, self.h * SS), 0)
        return im, ImageDraw.Draw(im)

    def _down(self, im, thr=0.5):
        a = np.asarray(im, np.float32).reshape(self.h, SS, self.w, SS).mean((1, 3))
        return a >= 255 * thr

    def poly(self, pts, thr=0.5):
        im, d = self._img()
        d.polygon([(x * SS, y * SS) for x, y in self.T(pts)], fill=255)
        return self._down(im, thr)

    def polys(self, polys, thr=0.5):
        im, d = self._img()
        for pts in polys:
            d.polygon([(x * SS, y * SS) for x, y in self.T(pts)], fill=255)
        return self._down(im, thr)

    def ellipse(self, cx, cy, rx, ry, ang=0.0, thr=0.5):
        pts = [(cx + rx * math.cos(t), cy + ry * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 96, endpoint=False)]
        if ang:
            pts = rot(pts, ang, cx, cy)
        return self.poly(pts, thr)

    def circle(self, cx, cy, r, thr=0.5):
        return self.ellipse(cx, cy, r, r, thr=thr)

    def stroke(self, path, widths, cap=True, thr=0.5):
        """Tapered stroke along `path` (already dense). widths: float, (w0, w1) or callable(t)."""
        ts, _ = arclen_param(path)
        if callable(widths):
            ws = [widths(t) for t in ts]
        elif isinstance(widths, (tuple, list)):
            ws = [widths[0] + (widths[1] - widths[0]) * t for t in ts]
        else:
            ws = [widths] * len(ts)
        polys = [offset_poly(path, ws)]
        if cap:
            for i in (0, -1):
                r = ws[i] / 2
                if r > 0.6:
                    x, y = path[i]
                    polys.append([(x + r * math.cos(t), y + r * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 32)])
        return self.polys(polys, thr)

    def curve(self, ctrl, widths, cap=True, thr=0.5):
        return self.stroke(bez(ctrl), widths, cap, thr)

    def leaf(self, base, tip, width, bend=0.0, fat=0.45, blunt=0.0, thr=0.5):
        """Pointed leaf from base to tip. bend bows the midrib (fraction of length,
        + = to the left of base->tip). fat = where the widest point sits (0..1)."""
        bx, by = base
        tx, ty = tip
        L = math.dist(base, tip)
        nx, ny = -(ty - by) / L, (tx - bx) / L
        c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
        path = qbez(base, c, tip, 80)
        p = math.log(0.5) / math.log(fat)

        def wf(t):
            s = math.sin(math.pi * (t ** p))
            return max(blunt, width * s ** 0.85)
        return self.stroke(path, wf, cap=False, thr=thr), path

    def spiral(self, cx, cy, r0, r1, a0, turns, w0, w1, n=200, squash=1.0):
        """Archimedean-ish spiral from radius r0 (start, outer) to r1 (centre end)."""
        pts = []
        for i in range(n):
            t = i / (n - 1)
            r = r0 + (r1 - r0) * t
            a = a0 + turns * 2 * math.pi * t
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * squash))
        return pts

    def line1(self, path):
        """1px 8-connected line through a dense path (for tendrils, hairs)."""
        m = np.zeros((self.h, self.w), bool)
        last = None
        for x, y in self.T(path):
            p = (int(math.floor(x)), int(math.floor(y)))
            if p == last:
                continue
            if last is not None:
                # fill gaps
                x0, y0 = last
                x1, y1 = p
                steps = max(abs(x1 - x0), abs(y1 - y0))
                for s in range(1, steps + 1):
                    xx = x0 + round((x1 - x0) * s / steps)
                    yy = y0 + round((y1 - y0) * s / steps)
                    if 0 <= xx < self.w and 0 <= yy < self.h:
                        m[yy, xx] = True
            elif 0 <= p[0] < self.w and 0 <= p[1] < self.h:
                m[p[1], p[0]] = True
            last = p
        return thin8(m)

    def maple(self, cx, cy, size, ang=0.0, thr=0.5):
        """A sugar-maple leaf (5 lobes, U-shaped sinuses), stem pointing down at ang=0."""
        pts = [(x * size + cx, y * size + cy) for x, y in rot(MAPLE, ang)]
        return self.poly(pts, thr)


def thin8(m):
    """Remove pixels that make a 1px line L-shaped corners (keep 8-connectivity)."""
    m = m.copy()
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if not m[y, x]:
                continue
            def g(dx, dy):
                xx, yy = x + dx, y + dy
                return 0 <= xx < w and 0 <= yy < h and m[yy, xx]
            # corner pixel: has one orth neighbour horizontally and one vertically, and the
            # diagonal between them would connect them anyway
            for hx in (-1, 1):
                for vy in (-1, 1):
                    if g(hx, 0) and g(0, vy) and not g(-hx, 0) and not g(0, -vy) and not g(hx, vy):
                        m[y, x] = False
    return m


# normalised maple leaf, petiole at (0, 0.5) pointing down, tip at top (y = -0.5)
MAPLE = [
    (0.00, 0.30),
    (-0.08, 0.20), (-0.30, 0.24), (-0.26, 0.14), (-0.48, 0.02), (-0.40, -0.04),
    (-0.50, -0.20), (-0.34, -0.16), (-0.28, -0.28), (-0.20, -0.14), (-0.14, -0.14),
    (-0.18, -0.36), (-0.08, -0.32), (0.00, -0.52),
    (0.08, -0.32), (0.18, -0.36), (0.14, -0.14), (0.20, -0.14), (0.28, -0.28),
    (0.34, -0.16), (0.50, -0.20), (0.40, -0.04), (0.48, 0.02), (0.26, 0.14), (0.30, 0.24),
    (0.08, 0.20),
]


# ---------------------------------------------------------------------------
# sprite
# ---------------------------------------------------------------------------

class Sprite(Canvas):
    def __init__(self, w, h, pal, sc=1.0):
        """pal: (dark, light) hex colours; white and #181818 are implied."""
        super().__init__(w, h, sc)
        self.pal = [K, hexc(pal[0]), hexc(pal[1]), hexc(pal[2]) if len(pal) > 2 else WHITE]
        self.tone = np.full((h, w), -1, int)
        self.pid = np.zeros((h, w), int)
        self.parts = {}   # id -> dict(line=..., z=...)
        self.lock = np.zeros((h, w), bool)   # pixels the orphan sweep must not touch
        self.soft = np.zeros((h, w), bool)   # pixels whose outline ring is drawn in the dark tone (dew beads)
        self.n = 0

    def part(self, mask, base=2, shadow=(1, 1), k=2, hl=None, hl_tone=None, deep=0,
             line=0, merge=(), sh_tone=None, only_on=None, rimlight=0):
        """Paint a part over everything so far.

        base     tone of the lit body
        shadow   (dx, dy) direction the shadow band hugs (bottom-right default)
        k        shadow band thickness (0 = flat)
        deep     a second, thinner band of tone base-2 (0 = none)
        hl       highlight mask (clipped to the part, 1px inside its edge)
        line     tone of the line this part draws where it overlaps parts behind
                 it (0 = black, 1 = dark, None = no line, merges in)
        merge    part ids this part joins without a line
        rimlight width of a highlight crescent hugging the top-left inside edge
        """
        if only_on is not None:
            mask = mask & only_on
        self.n += 1
        i = self.n
        sh = base - 1 if sh_tone is None else sh_tone
        t = np.full(mask.shape, base, int)
        if k:
            ux, uy = shadow
            L = math.hypot(ux, uy)
            ux, uy = ux / L, uy / L
            band = np.zeros_like(mask)
            for d in range(1, k + 1):
                band |= mask & ~shift(mask, round(d * ux), round(d * uy))
            t[band] = sh
            if deep:
                band2 = np.zeros_like(mask)
                for d in range(1, deep + 1):
                    band2 |= mask & ~shift(mask, round(d * ux), round(d * uy))
                t[band2] = max(1, sh - 1)
        if rimlight:
            inner = erode(mask, 1)
            rim = np.zeros_like(mask)
            for d in range(2, 2 + rimlight):
                rim |= inner & ~shift(mask, -round(d * .7), -round(d * .7))
            t[rim] = base + 1 if hl_tone is None else hl_tone
        if hl is not None:
            hm = hl & erode(mask, 1)
            t[hm] = base + 1 if hl_tone is None else hl_tone
        self.tone[mask] = t[mask]
        self.pid[mask] = i
        self.parts[i] = dict(line=line, merge=set(merge))
        return i

    def decal(self, mask, tone, on=None, lock=False):
        """Paint tone onto existing (non-empty) pixels, optionally only on given part ids."""
        m = mask & (self.tone >= 0)
        if on is not None:
            m &= np.isin(self.pid, list(on) if not isinstance(on, int) else [on])
        self.tone[m] = tone
        if lock:
            self.lock |= m
        return m

    def ink(self, mask, tone=0, pid=None, lock=True):
        """Paint pixels regardless of what is there (hand pixels, thin lines)."""
        self.tone[mask] = tone
        if pid is not None:
            self.pid[mask] = pid
        elif mask.any():
            self.n += 1
            self.pid[mask] = self.n
            self.parts[self.n] = dict(line=None, merge=set())
        if lock:
            self.lock |= mask

    def px(self, pts, tone, lock=True):
        for x, y in pts:
            if 0 <= x < self.w and 0 <= y < self.h:
                self.tone[y, x] = tone
                if self.pid[y, x] == 0:
                    self.pid[y, x] = -1
                if lock:
                    self.lock[y, x] = True

    def erase(self, mask):
        self.tone[mask] = -1
        self.pid[mask] = 0

    def rows(self, x0, y0, rows, lock=True):
        """ASCII patch: '.' leaves pixel, ' ' erases, k/0 1 2 3 = tones."""
        mp = {"k": 0, "0": 0, "1": 1, "2": 2, "3": 3, "d": 1, "l": 2, "w": 3}
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                x, y = x0 + i, y0 + j
                if not (0 <= x < self.w and 0 <= y < self.h) or ch == ".":
                    continue
                if ch == " " or ch == "_":
                    self.tone[y, x] = -1
                    self.pid[y, x] = 0
                    continue
                self.tone[y, x] = mp[ch]
                if self.pid[y, x] == 0:
                    self.pid[y, x] = -1
                if lock:
                    self.lock[y, x] = True

    # -- finishing ----------------------------------------------------------
    def finish(self, outline=True, inner=True, sweep=True, open_bottom=False, selout=False):
        t = self.tone.copy()
        body = t >= 0
        if inner:
            # line on the part BEHIND where a later part overlaps it
            order = self.pid
            line = np.full(t.shape, -1)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb = shift(order, dx, dy)
                nbody = shift(body, dx, dy)
                cand = body & nbody & (nb > order) & (order > 0)
                ys, xs = np.nonzero(cand)
                for y, x in zip(ys, xs):
                    front = nb[y, x]
                    back = order[y, x]
                    fp = self.parts.get(front)
                    if fp is None or fp["line"] is None or back in fp["merge"]:
                        continue
                    if self.lock[y, x]:
                        continue
                    lt = fp["line"]
                    line[y, x] = lt if line[y, x] < 0 else min(line[y, x], lt)
            t[line >= 0] = line[line >= 0]
        if sweep:
            t = sweep_orphans(t, self.lock)
        if outline:
            core = body & ~((t == 0) & self.lock)
            ring = dilate(core, 1) & ~body
            if open_bottom:
                ring[-1, :] = False
            t[ring] = 0
            if self.soft.any():
                hard = core & ~self.soft
                soft_ring = ring & dilate(self.soft, 1) & ~dilate(hard, 1)
                t[soft_ring] = 1
            if selout:
                # lit (top-left) outline next to light body pixels softens to dark
                up = shift(body, 0, 1) & ~shift(body, 0, -1)
                lit = ring & (shift(body, 1, 0) | shift(body, 0, 1)) & ~shift(body, -1, 0) & ~shift(body, 0, -1)
                nbt = np.maximum(shift(np.where(body, t, -1) + 1, 1, 0), shift(np.where(body, t, -1) + 1, 0, 1)) - 1
                t[lit & (nbt >= 2)] = 1
        self.final = t
        return t

    def image(self):
        t = self.final
        a = np.zeros((self.h, self.w, 4), np.uint8)
        for k in range(4):
            a[t == k] = self.pal[k] + (255,)
        return Image.fromarray(a, "RGBA")


def sweep_orphans(t, lock, passes=2):
    """A body pixel with no same-tone 4-neighbour takes its most common neighbour tone."""
    h, w = t.shape
    for _ in range(passes):
        changed = False
        out = t.copy()
        for y in range(h):
            for x in range(w):
                v = t[y, x]
                if v <= 0 or lock[y, x]:
                    continue
                nb = []
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h:
                        nb.append(t[yy, xx])
                if v in nb:
                    continue
                cand = [n for n in nb if n > 0]
                if not cand:
                    continue
                out[y, x] = max(set(cand), key=cand.count)
                changed = True
        t = out
        if not changed:
            break
    return t


def place(im: Image.Image, size: int, bottom=True, dx=0, dy=0) -> Image.Image:
    """Crop to content and drop it bottom-centred into a size x size frame."""
    bb = im.getbbox()
    c = im.crop(bb)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - c.width) // 2 + dx
    y = (size - c.height if bottom else (size - c.height) // 2) + dy
    out.alpha_composite(c, (x, y)) if x >= 0 and y >= 0 else out.paste(c, (x, y), c)
    return out


def icon_from_rows(rows, pal):
    """16x16 icon from ASCII: ' '/. transparent, k/0 outline, 1 dark, 2 light, 3 white."""
    cols = [K, hexc(pal[0]), hexc(pal[1]), hexc(pal[2]) if len(pal) > 2 else WHITE]
    mp = {"k": 0, "0": 0, "1": 1, "2": 2, "3": 3}
    h = len(rows)
    a = np.zeros((16, 16, 4), np.uint8)
    off = 16 - h
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch in mp:
                a[off + j, i] = cols[mp[ch]] + (255,)
    return Image.fromarray(a, "RGBA")


def squash(im: Image.Image, cut_row=None) -> Image.Image:
    """Frame 2 of an icon: drop one row out of the upper body so it squats 1px."""
    a = np.asarray(im).copy()
    ys = np.nonzero(a[..., 3].any(1))[0]
    top, bot = ys[0], ys[-1]
    r = cut_row if cut_row is not None else top + max(1, (bot - top) // 3)
    out = np.zeros_like(a)
    out[top + 1:r + 1] = a[top:r]
    out[r + 1:] = a[r + 1:]
    return Image.fromarray(out, "RGBA")


def bob(im: Image.Image) -> Image.Image:
    a = np.asarray(im)
    out = np.zeros_like(a)
    out[1:] = a[:-1]
    return Image.fromarray(out, "RGBA")


def edge_beads(s, keep, spacing=4, tone=3, soft=True, region=None):
    """Single pixels sat just outside the silhouette (dew, stinging hairs),
    spaced round the outline; their ring is drawn in the dark tone."""
    body = s.tone >= 0
    out = dilate(body, 1) & ~dilate(body, 1, diag=False) if False else (dilate(body, 1) & ~body)
    out &= dilate(keep, 1)
    if region is not None:
        out &= region
    ys, xs = np.nonzero(out)
    if not len(xs):
        return []
    my, mx = np.nonzero(keep)
    cy, cx = my.mean(), mx.mean()
    order = np.argsort(np.arctan2(ys - cy, xs - cx))
    picked = []
    for i in order[::spacing]:
        x, y = int(xs[i]), int(ys[i])
        if all(abs(x - px_) + abs(y - py_) > 3 for px_, py_ in picked):
            picked.append((x, y))
    s.px(picked, tone)
    if soft:
        for x, y in picked:
            s.soft[y, x] = True
    return picked
