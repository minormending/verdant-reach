"""Drawing helpers shared by Artist E's Crystal-rule lines (apple, orchid,
monstera, lotus, bird of paradise). No build() here: the line modules
(tools/art/crystal/<line>.py) import it.

Everything is drawn with the species_f vector toolkit (loaded via
kit.legacy, never by name: several old folders have a `kit.py`). Parts are
supersampled masks painted back to front, each flat-shaded with a shadow
band on its bottom-right (light from the top-left), black lines where a
part overlaps the one behind, and a full #181818 outline (no selout).

  index 0  #181818  outline, crevices, cast shadow (shared)
  index 1  the species' dark tone (shading, and the second hue)
  index 2  the species' light tone (the body)
  index 3  #f8f8f8  highlights (shared)

A frame is an index array (0..3, T = transparent). `frames(fn, n)` renders
n front frames from fn(k) and keeps frame k's own pixels only near the
parts marked as moving (`s.mark(mask)` / `s.mpart(...)`), so the rest of
the body is pixel-identical across the intro.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, legacy, to_rgba  # noqa: E402,F401

_k = legacy("species_f/kit.py")
Base = _k.Sprite
shift, move, erode, dilate = _k.shift, _k.move, _k.erode, _k.dilate
spline, qbez, rot = _k.spline, _k.qbez, _k.rot

SCRATCH = None   # set by a line module's preview mode
_DX = [0]        # whole-sprite horizontal registration while frames() renders


class S(Base):
    """species_f Sprite + a moving-part mask and Crystal helpers."""

    def __init__(self, w, h, pal=("#000000", "#808080", "#ffffff")):
        super().__init__(w, h, pal)
        self.movem = np.zeros((h, w), bool)
        if _DX[0]:
            dx = _DX[0]
            self.xf = lambda x, y: (x + dx, y)

    # hand pixels are given in design space: on a back canvas (xf set) they
    # are mapped through it, like every shape
    def _c(self, x, y):
        if not self.xf:
            return x, y
        X, Y = self.xf(x + 0.5, y + 0.5)
        return int(math.floor(X)), int(math.floor(Y))

    def px(self, pts, tone, lock=True):
        super().px([self._c(x, y) for x, y in pts], tone, lock)

    def pxc(self, pts, tone, lock=True):
        """Hand pixels in canvas space."""
        super().px(pts, tone, lock)

    def rows(self, x0, y0, rows, lock=True):
        x0, y0 = self._c(x0, y0)
        super().rows(x0, y0, rows, lock)

    def rect(self, x0, y0, x1, y1):
        x0, y0 = self._c(x0, y0)
        x1, y1 = self._c(x1, y1)
        return super().rect(x0, y0, x1, y1)

    def mark(self, m):
        self.movem |= m
        return m

    def mpart(self, mask, **kw):
        self.mark(mask)
        return self.part(mask, **kw)

    # -- Crystal shading helpers --------------------------------------------
    def rim(self, mask, pid, frac=0.5, sides="tl", tone=3, inset=0):
        """A 1px white light rim inside the top/left edge of a form, on the
        top-left `frac` of its diagonal extent, where part `pid` is visible."""
        m = erode(mask, inset) if inset else mask
        e = np.zeros_like(m)
        if "t" in sides:
            e |= m & ~shift(m, 0, -1)
        if "l" in sides:
            e |= m & ~shift(m, -1, 0)
        ys, xs = np.nonzero(m)
        if not len(xs):
            return
        d = xs + ys
        lim = d.min() + (d.max() - d.min()) * frac
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        return self.decal(e & ((xx + yy) <= lim), tone, on=pid)

    def rim2(self, mask, pid, frac=0.5, frac2=None, sides="tl", tone=3):
        """A bold Crystal rim: the 1px rim on the top-left `frac`, thickened to
        2px on the top-left-most `frac2` (the brightest corner of the form)."""
        self.rim(mask, pid, frac, sides, tone)
        self.rim(mask, pid, frac * 0.4 if frac2 is None else frac2, sides, tone, inset=1)

    def shade(self, mask, pid, ox, oy, tone=1):
        """A crisp crescent: pixels of `mask` whose (ox, oy) neighbour leaves it."""
        cres = mask & ~move(mask, -ox, -oy)
        return self.decal(cres, tone, on=pid)

    def cast(self, n0, on, depth=2, dx=1, tone=0):
        """Black cast shadow under every part drawn after id n0, on parts `on`."""
        front = (self.pid > n0) & (self.tone >= 0)
        sh = np.zeros_like(front)
        for d in range(1, depth + 1):
            sh |= move(front, dx * d // depth if dx else 0, d)
        self.decal(sh & ~front, tone, on=on)


def back_canvas():
    """A 48x48 back canvas whose design space (0..48) is drawn at 92% and
    1-3px in from the sides and top, so the outline never falls off the
    canvas; the bottom stays cut (open). Use s.P(x, y) for hand pixels."""
    s = S(48, 48)
    s.open_bottom = True
    s.xf = lambda x, y: (2.0 + x * 0.92, 3.0 + y * 0.94)
    return s


def tones(s, open_bottom=False):
    # open_bottom only affects shading (s.open_bottom); the outline still wraps
    # the sides down to the last row (the bottom edge itself is off-canvas)
    t = s.finish(selout=False, open_bottom=False)
    return np.where(t >= 0, t, T).astype(np.uint8)


def frames(fn, n, grow=2, dx=0):
    """Render n front frames; frame k differs from frame 0 only near the
    moving parts of either frame (dilated by `grow`). dx shifts the whole
    design right (registration) before rasterising, so outlines stay whole."""
    _DX[0] = dx
    try:
        sp = [fn(k) for k in range(n)]
    finally:
        _DX[0] = 0
    fr = [tones(x) for x in sp]
    out = [fr[0]]
    for k in range(1, n):
        reg = dilate(sp[0].movem | sp[k].movem, grow, diag=True)
        # keep frame k's outline where it rings the region from outside
        reg |= dilate(reg, 1, diag=True) & (fr[k] == 0) & (fr[0] == T)
        out.append(np.where(reg, fr[k], fr[0]))
    return out


def moving_boxes(fr):
    """Row-band boxes (2px tall) covering every pixel that differs from frame 0."""
    f0 = fr[0]
    diff = np.zeros(f0.shape, bool)
    for f in fr[1:]:
        diff |= f != f0
    boxes = []
    for y0 in range(0, f0.shape[0], 2):
        ys, xs = np.nonzero(diff[y0:y0 + 2])
        if len(xs):
            boxes.append((int(xs.min()), y0 + int(ys.min()), int(xs.max()) + 1, y0 + int(ys.max()) + 1))
    return boxes


def nudge(fr, dx):
    """Shift every frame horizontally (whole-sprite registration)."""
    out = []
    for f in fr:
        o = np.full_like(f, T)
        if dx >= 0:
            assert (f[:, f.shape[1] - dx:] == T).all() if dx else True, "nudge would crop"
            o[:, dx:] = f[:, :f.shape[1] - dx]
        else:
            assert (f[:, :-dx] == T).all(), "nudge would crop"
            o[:, :dx] = f[:, -dx:]
        out.append(o)
    return out


def icon(rows):
    """16x16 icon from ASCII ('.' clear; k/0 outline, 1 dark, 2 light, 3 white).
    Then finished: any colour pixel on the canvas edge turns black, every
    transparent pixel touching colour (4-way) becomes outline, and orphan
    colour pixels take their commonest 4-neighbour colour."""
    mp = {"k": 0, "0": 0, "1": 1, "2": 2, "3": 3}
    assert len(rows) == 16, len(rows)
    a = np.full((16, 16), T, np.uint8)
    for y, r in enumerate(rows):
        assert len(r) == 16, (y, r)
        for x, ch in enumerate(r):
            if ch in mp:
                a[y, x] = mp[ch]
    return finish_icon(a)


def _nb(a, y, x, d8=False):
    h, w = a.shape
    ds = ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if d8 else ())
    return [a[y + dy, x + dx] for dy, dx in ds if 0 <= y + dy < h and 0 <= x + dx < w]


def finish_icon(a):
    a = a.copy()
    h, w = a.shape
    col = (a != T) & (a != 0)
    edge = np.zeros_like(col)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    a[col & edge] = 0
    col = (a != T) & (a != 0)
    ring = np.zeros_like(col)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring |= np.roll(np.roll(col, dy, 0), dx, 1)
    a[ring & (a == T)] = 0
    for _ in range(2):
        for y in range(h):
            for x in range(w):
                v = a[y, x]
                if v in (0, T) or v in _nb(a, y, x, True):
                    continue
                c = [n for n in _nb(a, y, x) if n not in (0, T)]
                if c:
                    a[y, x] = max(set(c), key=c.count)
    return a


def hop(a):
    """Icon frame 2: the whole icon up 1px when the top row is clear, else a
    squash (the rows above row 8 drop 1px; the base stays planted)."""
    o = np.full_like(a, T)
    if (a[0] == T).all():
        o[:-1] = a[1:]
        return o
    o[9:] = a[9:]
    o[1:9] = a[0:8]
    return finish_icon(o)


def stats(ix):
    op = (ix != T).sum()
    ys, xs = np.nonzero(ix != T)
    return dict(fill=op / ix.size, white=(ix == 3).sum() / max(op, 1),
                bbox=(int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())),
                cx=float(xs.mean()))


# ----------------------------------------------------------- previews -------
BG = (200, 208, 192)


def preview(items, path, k=4):
    """items: [(id, pal, sport, front_frames, back, icons)]. One row each:
    every front frame @k, the sport, back @k, icons @k, and a 1x strip."""
    rows = []
    for id_, pal, sport, fr, back, ics in items:
        tiles = [to_rgba(f, pal) for f in fr] + [to_rgba(fr[0], sport), to_rgba(back, pal)] + \
                [to_rgba(i, pal) for i in ics]
        rows.append(tiles)
    W = max(sum(t.shape[1] * k + 6 for t in r) + 56 * 3 + 30 for r in rows)
    H = sum(56 * k + 10 for _ in rows)
    sheet = Image.new("RGB", (W, H), BG)
    y = 0
    for (id_, pal, sport, fr, back, ics), r in zip(items, rows):
        x = 4
        for t in r:
            im = Image.fromarray(t, "RGBA")
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, y + 4), im)
            x += im.width + 6
        for f in (fr[0], back):
            im = Image.fromarray(to_rgba(f, pal), "RGBA")
            sheet.paste(im, (x, y + 4), im)
            x += 60
        y += 56 * k + 10
    sheet.save(path)
    return path
