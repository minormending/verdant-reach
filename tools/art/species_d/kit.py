"""Pixel-art construction kit for the species D sprites (mint, wild rose,
pitcher plant, snapdragon lines).

A sprite is a stack of *parts* painted back to front. Each part is a
boolean mask rasterised at 1x from vector shapes (4x supersample, >= 50%
coverage, so curves step evenly). Each part carries its own form shading,
computed on its full shape so it follows the form even where a later part
covers it:

  tone -1 = transparent, 0 = outline (#181818), 1 = dark, 2 = mid, 3 = light

* a shadow band hugging the bottom-right of the shape (light is top-left),
* an optional light rim hugging the top-left inside edge, and/or one
  explicit highlight shape (the "glint of life"),
* a 1px #181818 (or dark) line on the part BEHIND wherever a later part
  overlaps it, so overlaps read as depth,
* decals (veins, stamens, thorns) and hand pixels painted on top,
* an orphan-pixel sweep, then the 1px outline, with selective lighter
  outline ("selout") on lit edges where the body next to it is light.

Every sprite is exactly 4 colours + transparency (GBC rule): #181818 plus
the 3 palette colours, which are hue-shifted (dark leans blue/purple, light
leans yellow/cyan).
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

SS = 4
K = (24, 24, 24)  # #181818


def hexc(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(min(248, round(int(h[i:i + 2], 16) / 8) * 8) for i in (0, 2, 4))


def shift(m: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """out[y, x] = m[y + dy, x + dx] (False / 0 outside)."""
    h, w = m.shape
    out = np.zeros_like(m)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    if ys0 < ys1 and xs0 < xs1:
        out[ys0:ys1, xs0:xs1] = m[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
    return out


def move(m, dx, dy):
    """Translate a mask by (dx, dy) pixels (content moves right/down for +)."""
    return shift(m, -dx, -dy)


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

def spline(pts, n=24):
    """Catmull-Rom through pts; a dense polyline."""
    pts = [np.array(p, float) for p in pts]
    if len(pts) == 2:
        return [tuple(pts[0] + (pts[1] - pts[0]) * t) for t in np.linspace(0, 1, n)]
    P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=(i == len(P) - 3)):
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                       + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            out.append(tuple(q))
    return out


def qbez(p0, c, p1, n=48):
    p0, c, p1 = (np.array(p, float) for p in (p0, c, p1))
    return [tuple((1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t * t * p1) for t in np.linspace(0, 1, n)]


def arclen(path):
    d = [0.0]
    for a, b in zip(path, path[1:]):
        d.append(d[-1] + math.dist(a, b))
    L = d[-1] or 1.0
    return [x / L for x in d], L


def at(path, t):
    """Point and unit tangent at fraction t of a dense path's length."""
    ts, _ = arclen(path)
    for i in range(1, len(ts)):
        if ts[i] >= t:
            a, b = path[i - 1], path[i]
            f = (t - ts[i - 1]) / max(1e-9, ts[i] - ts[i - 1])
            x, y = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
            L = math.dist(a, b) or 1
            return (x, y), ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    a, b = path[-2], path[-1]
    L = math.dist(a, b) or 1
    return b, ((b[0] - a[0]) / L, (b[1] - a[1]) / L)


def offset_poly(path, widths):
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
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.xf = None

    def lean(self, cx=None, cy=None, deg=0.0):
        """Pose the whole body: rotate every shape drawn from now on by `deg`
        about (cx, cy) (the feet), + = the top swings toward the foe (left).
        lean() with no angle switches it off."""
        if not deg:
            self.xf = None
            return
        t = math.radians(deg)
        c, s = math.cos(t), math.sin(t)
        self.xf = lambda x, y: (cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c)

    def P(self, x, y):
        """Where a design-space point lands under the current lean."""
        return self.xf(x, y) if self.xf else (x, y)

    def empty(self):
        return np.zeros((self.h, self.w), bool)

    def _img(self):
        im = Image.new("L", (self.w * SS, self.h * SS), 0)
        return im, ImageDraw.Draw(im)

    def _down(self, im, thr=0.5):
        a = np.asarray(im, np.float32).reshape(self.h, SS, self.w, SS).mean((1, 3))
        return a >= 255 * thr

    def polys(self, polys, thr=0.5):
        im, d = self._img()
        for pts in polys:
            if self.xf:
                pts = [self.xf(x, y) for x, y in pts]
            d.polygon([(x * SS, y * SS) for x, y in pts], fill=255)
        return self._down(im, thr)

    def poly(self, pts, thr=0.5):
        return self.polys([pts], thr)

    def ellipse(self, cx, cy, rx, ry, ang=0.0, thr=0.5):
        pts = [(cx + rx * math.cos(t), cy + ry * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 96, endpoint=False)]
        if ang:
            pts = rot(pts, ang, cx, cy)
        return self.poly(pts, thr)

    def circle(self, cx, cy, r, thr=0.5):
        return self.ellipse(cx, cy, r, r, thr=thr)

    def rect(self, x0, y0, x1, y1):
        m = self.empty()
        m[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = True
        return m

    def stroke(self, path, widths, cap=True, thr=0.5):
        """Tapered stroke along a dense path. widths: float, (w0, w1) or f(t)."""
        ts, _ = arclen(path)
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

    def curve(self, pts, widths, cap=True, thr=0.5):
        return self.stroke(spline(pts), widths, cap, thr)

    def leaf(self, base, tip, width, bend=0.0, fat=0.42, power=0.8, blunt=0.0, teeth=0, tooth=0.0, thr=0.5):
        """Pointed leaf base -> tip. bend bows the midrib (fraction of length,
        + = to the left of travel). fat: where the widest point sits.
        teeth: serrations per side (saw teeth pointing at the tip)."""
        bx, by = base
        tx, ty = tip
        L = math.dist(base, tip)
        nx, ny = -(ty - by) / L, (tx - bx) / L
        c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
        path = qbez(base, c, tip, 96)
        p = math.log(0.5) / math.log(fat)

        def wf(t):
            s = math.sin(math.pi * (t ** p)) ** power
            w = width * s
            if teeth and 0.12 < t < 0.94:
                fr = (teeth * t) % 1.0
                w *= 1 - tooth * (1 - fr)
            return max(blunt, w)
        return self.stroke(path, wf, cap=False, thr=thr), path

    def line1(self, path):
        """1px 8-connected line through a dense path."""
        m = self.empty()
        last = None
        if self.xf:
            path = [self.xf(x, y) for x, y in path]
        for x, y in path:
            p = (int(math.floor(x)), int(math.floor(y)))
            if p == last:
                continue
            if last is not None:
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

    def blob(self, pts, n=12, thr=0.5):
        """Closed organic shape through outline points (closed Catmull-Rom)."""
        P = [np.array(p, float) for p in pts]
        ring = []
        N = len(P)
        for i in range(N):
            p0, p1, p2, p3 = P[i - 1], P[i], P[(i + 1) % N], P[(i + 2) % N]
            for t in np.linspace(0, 1, n, endpoint=False):
                t2, t3 = t * t, t * t * t
                q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                           + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
                ring.append(tuple(q))
        return self.poly(ring, thr)


def thin8(m):
    m = m.copy()
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if not m[y, x]:
                continue

            def g(dx, dy):
                xx, yy = x + dx, y + dy
                return 0 <= xx < w and 0 <= yy < h and m[yy, xx]
            for hx in (-1, 1):
                for vy in (-1, 1):
                    if g(hx, 0) and g(0, vy) and not g(-hx, 0) and not g(0, -vy) and not g(hx, vy):
                        m[y, x] = False
    return m


# ---------------------------------------------------------------------------
# sprite
# ---------------------------------------------------------------------------

class Sprite(Canvas):
    def __init__(self, w, h, pal):
        """pal: (dark, mid, light) hex colours; #181818 is implied."""
        super().__init__(w, h)
        self.pal = [K] + [hexc(p) for p in pal]
        assert len(self.pal) == 4
        self.tone = np.full((h, w), -1, int)
        self.pid = np.zeros((h, w), int)
        self.parts = {}
        self.lock = np.zeros((h, w), bool)
        self.n = 0

    def part(self, mask, base=2, k=1, shadow=(1, 1), sh=None, rim=0, rim_tone=None, hl=None, hl_tone=None,
             line=0, merge=(), deep=0):
        """Paint a part over everything so far.

        base   tone of the lit body;  sh: tone of the shadow band (default base-1)
        k      shadow band thickness toward `shadow` (bottom-right); 0 = flat
        deep   inner, thinner band in tone sh-1 (0 = none)
        rim    width of a light crescent along the top-left inside edge
        hl     explicit highlight mask (kept 1px inside the edge)
        line   line tone this part draws on parts behind it (0 black, 1 dark, None)
        merge  part ids it joins without a line
        """
        self.n += 1
        i = self.n
        shv = base - 1 if sh is None else sh
        t = np.full(mask.shape, base, int)
        if k:
            ux, uy = shadow
            L = math.hypot(ux, uy)
            ux, uy = ux / L, uy / L
            band = np.zeros_like(mask)
            for d in range(1, k + 1):
                band |= mask & ~shift(mask, round(d * ux), round(d * uy))
            t[band] = shv
            if deep:
                b2 = np.zeros_like(mask)
                for d in range(1, deep + 1):
                    b2 |= mask & ~shift(mask, round(d * ux), round(d * uy))
                t[b2] = max(1, shv - 1)
        if rim:
            inner = erode(mask, 1)
            r = np.zeros_like(mask)
            for d in range(2, 2 + rim):
                r |= inner & ~shift(mask, -round(d * .7), -round(d * .7))
            t[r & (t == base)] = base + 1 if rim_tone is None else rim_tone
        if hl is not None:
            hm = hl & erode(mask, 1)
            t[hm] = base + 1 if hl_tone is None else hl_tone
        self.tone[mask] = t[mask]
        self.pid[mask] = i
        self.parts[i] = dict(line=line, merge=set(merge))
        return i

    def decal(self, mask, tone, on=None, lock=False):
        """Paint a tone onto existing body pixels (optionally only on part ids)."""
        m = mask & (self.tone >= 0)
        if on is not None:
            m &= np.isin(self.pid, [on] if isinstance(on, int) else list(on))
        self.tone[m] = tone
        if lock:
            self.lock |= m
        return m

    def ink(self, mask, tone=0, lock=True):
        """Paint pixels regardless of what is there (thin lines, thorns)."""
        self.n += 1
        self.tone[mask] = tone
        self.pid[mask] = self.n
        self.parts[self.n] = dict(line=None, merge=set())
        if lock:
            self.lock |= mask
        return self.n

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
        """ASCII patch: '.' keep, '_' erase, k/0 1 2 3 tones."""
        mp = {"k": 0, "0": 0, "1": 1, "2": 2, "3": 3}
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                x, y = x0 + i, y0 + j
                if not (0 <= x < self.w and 0 <= y < self.h) or ch in ". ":
                    continue
                if ch == "_":
                    self.tone[y, x] = -1
                    self.pid[y, x] = 0
                    continue
                self.tone[y, x] = mp[ch]
                if self.pid[y, x] == 0:
                    self.pid[y, x] = -1
                if lock:
                    self.lock[y, x] = True

    # -- finishing ----------------------------------------------------------
    def finish(self, outline=True, inner=True, sweep=True, open_bottom=False, selout=True):
        t = self.tone.copy()
        body = t >= 0
        if inner:
            order = self.pid
            line = np.full(t.shape, -1)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb = shift(order, dx, dy)
                nbody = shift(body, dx, dy)
                cand = body & nbody & (nb > order) & (order > 0)
                ys, xs = np.nonzero(cand)
                for y, x in zip(ys, xs):
                    fp = self.parts.get(nb[y, x])
                    if fp is None or fp["line"] is None or order[y, x] in fp["merge"]:
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
            if selout:
                # outline on the lit (top/left) side of a light body softens to the
                # dark tone; only where the run is long enough to read as an edge
                tb = np.where(body, t, -1)
                lit = ring & ((shift(tb, 0, 1) >= 2) | (shift(tb, 1, 0) >= 2)) \
                    & ~shift(body, 0, -1) & ~shift(body, -1, 0)
                if isinstance(selout, np.ndarray):
                    lit &= selout
                else:
                    # lit edges only: the local mass of the form lies to the
                    # pixel's bottom-right (its outward normal faces the light)
                    from scipy import ndimage
                    Y, X = np.mgrid[0:self.h, 0:self.w].astype(float)
                    bf = body.astype(float)
                    n = ndimage.uniform_filter(bf, 11, mode="constant") + 1e-9
                    mx = ndimage.uniform_filter(bf * X, 11, mode="constant") / n
                    my = ndimage.uniform_filter(bf * Y, 11, mode="constant") / n
                    ex, ey = mx - X, my - Y
                    lit &= (ex > 0.8) & (ey > 0.8) & (ex + ey > 3.0)
                # keep only runs of >= 3 so it reads as a lit edge, not noise
                lab = _runs(lit)
                t[lab] = 1
        if sweep:
            # final guarantee: no orphan body pixels (the audit's 8-way rule)
            h, w = t.shape
            for y in range(h):
                for x in range(w):
                    v = t[y, x]
                    if v <= 0:
                        continue
                    nb8 = [t[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                           if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w]
                    if v in nb8:
                        continue
                    nb4 = [t[y + dy, x + dx] for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))
                           if 0 <= y + dy < h and 0 <= x + dx < w and t[y + dy, x + dx] > 0]
                    if nb4:
                        t[y, x] = max(set(nb4), key=nb4.count)
                    else:
                        t[y, x] = 0
        self.final = t
        return t

    def image(self):
        t = self.final
        a = np.zeros((self.h, self.w, 4), np.uint8)
        for k in range(4):
            a[t == k] = self.pal[k] + (255,)
        return Image.fromarray(a, "RGBA")


def _runs(m, n=3):
    """Pixels of m that belong to an 8-connected group of at least n."""
    from scipy import ndimage
    lab, k = ndimage.label(m, np.ones((3, 3), bool))
    if not k:
        return m
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
    keep = np.zeros(k + 1, bool)
    keep[1:] = sizes >= n
    return keep[lab]


def sweep_orphans(t, lock, passes=2):
    h, w = t.shape
    for _ in range(passes):
        changed = False
        out = t.copy()
        for y in range(h):
            for x in range(w):
                v = t[y, x]
                if v <= 0 or lock[y, x]:
                    continue
                nb, n8 = [], []
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h:
                        (nb if dx == 0 or dy == 0 else n8).append(t[yy, xx])
                if v in nb or v in n8:
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


def place(im: Image.Image, size: int, dx=0, anchor=None) -> Image.Image:
    """Drop the content bottom-centred into a size x size frame. `anchor`
    (x0, y0) pins the crop origin so animation frames keep registration."""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if anchor is None:
        bb = im.getbbox()
        x = (size - (bb[2] - bb[0])) // 2 + dx - bb[0]
        y = size - bb[3]
        anchor = (x, y)
    out.paste(im, anchor, im)
    return out, anchor


def icon_rows(rows, pal):
    """16x16 icon from ASCII: ' '/'.' transparent, k/0 outline, 1 dark, 2 mid, 3 light."""
    cols = [K] + [hexc(p) for p in pal]
    mp = {"k": 0, "0": 0, "1": 1, "2": 2, "3": 3}
    assert len(rows) == 16, len(rows)
    a = np.zeros((16, 16, 4), np.uint8)
    for j, r in enumerate(rows):
        assert len(r) <= 16, (j, r)
        for i, ch in enumerate(r):
            if ch in mp:
                a[j, i] = cols[mp[ch]] + (255,)
    return Image.fromarray(a, "RGBA")


def mask_rows(w, h, x0, y0, rows, chars, flip=False):
    """Mask of the pixels in an ASCII region map whose char is in `chars`,
    placed with its top-left at (x0, y0); flip mirrors it (face right)."""
    m = np.zeros((h, w), bool)
    W = max(len(r) for r in rows)
    for j, r in enumerate(rows):
        r = r.ljust(W, ".")
        if flip:
            r = r[::-1]
        for i, ch in enumerate(r):
            x, y = x0 + i, y0 + j
            if ch in chars and 0 <= x < w and 0 <= y < h:
                m[y, x] = True
    return m
