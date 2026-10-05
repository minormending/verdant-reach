"""Round 3 finishing for the wild lines (fern, flytrap, sundew, maple, nettle,
moonflower), per docs/CREATURES.md §2. pix.py stays untouched (the pumpkin
line shares it); this subclass only adds:

* selout on the LIT top-left of the silhouette only: outline pixels facing
  up/left, in the upper ~60% of the shape, next to a lit body pixel, capped at
  ~25% of the outline; they take the dark tone;
* a weighted contact line: `s.contact.append((x0, x1))` turns the lowest body
  pixel of those columns black, so the ground line is 2px over a short run;
* `s.glint(pts)`: the one glint of life, hand-placed, locked.
"""

from __future__ import annotations

import numpy as np

import contextlib
import math

from pix import Sprite, dilate, shift


class Spr(Sprite):
    pad = 0          # fit_back(): extra canvas each side, geometry shifted by it
    extra_sc = 1.0   # fit_back(): extra scale so a back fits 48px without side clipping

    def __init__(self, w, h, pal, sc=1.0):
        self.ox = Spr.pad
        super().__init__(w + 2 * Spr.pad, h, pal, sc * Spr.extra_sc)
        self.contact = []
        self.sel = 0.25   # max share of the outline that may become selout
        self.post = []    # (mask, tone) painted after the outline: hairs, dew (no ring)

    # -- whole-body tilt (CREATURES.md §10: rotate the body about the feet) --
    def set_tilt(self, deg, px, py):
        """Rotate all later vector geometry by deg (+ = top swings toward the
        foe, left) about (px, py), the feet. Draw the planted feet inside
        `with s.untilted():` so they stay on the ground."""
        self.tilt = (math.radians(deg), px, py)
        self.tilt_on = True

    @contextlib.contextmanager
    def untilted(self):
        old = getattr(self, "tilt_on", False)
        self.tilt_on = False
        try:
            yield
        finally:
            self.tilt_on = old

    @contextlib.contextmanager
    def rotated(self, deg, cx, cy):
        """Extra local rotation (deg, + = top toward the foe) about (cx, cy)
        for the parts drawn inside, applied before the body tilt."""
        old = getattr(self, "pre", None)
        self.pre = (math.radians(deg), cx, cy)
        try:
            yield
        finally:
            self.pre = old

    def T(self, pts):
        ox = getattr(self, "ox", 0)
        if ox:
            pts = [(x + ox, y) for x, y in pts]
        pre = getattr(self, "pre", None)
        if pre:
            a, px, py = pre
            px += ox
            c, s_ = math.cos(a), math.sin(a)
            pts = [(px + (x - px) * c + (y - py) * s_, py - (x - px) * s_ + (y - py) * c) for x, y in pts]
        pts = super().T(pts)
        t = getattr(self, "tilt", None)
        if not t or not getattr(self, "tilt_on", False):
            return pts
        a, px, py = t
        (px, py), = super().T([(px + ox, py)])
        c, s_ = math.cos(a), math.sin(a)
        return [(px + (x - px) * c + (y - py) * s_, py - (x - px) * s_ + (y - py) * c) for x, y in pts]

    def glint(self, pts, transform=True):
        if transform:
            pts = [(int(math.floor(x)), int(math.floor(y))) for x, y in self.T([(x + 0.5, y + 0.5) for x, y in pts])]
        self.px(pts, 3)

    def finish(self, outline=True, inner=True, sweep=True, open_bottom=False, selout=True):
        body0 = self.tone >= 0
        t = super().finish(outline=outline, inner=inner, sweep=sweep, open_bottom=open_bottom, selout=False)
        if outline and selout and self.sel > 0:
            ring = (t == 0) & ~body0
            ys, xs = np.nonzero(body0)
            y0, y1 = ys.min(), ys.max()
            x0, x1 = xs.min(), xs.max()
            bt = np.where(body0, t, -1)
            lit_nb = (shift(bt, 1, 0) >= 2) | (shift(bt, 0, 1) >= 2)
            faces = (shift(body0, 1, 0) | shift(body0, 0, 1)) & ~shift(body0, -1, 0) & ~shift(body0, 0, -1)
            yy, xx = np.mgrid[0:self.h, 0:self.w]
            region = yy <= y0 + (y1 - y0) * 0.6
            cand = ring & faces & lit_nb & region
            cy, cx = np.nonzero(cand)
            cap = int(ring.sum() * self.sel)
            order = np.argsort((cx - x0) + (cy - y0))[:cap]
            t[cy[order], cx[order]] = 1
        t = clean8(t)
        for m, tone in self.post:
            # hairs and dew live on the background (and may break the outline
            # where they grow out of it), never over another part
            t[m & ~body0] = tone
        for a, b in self.contact:
            for x in range(a, b + 1):
                col = np.nonzero(body0[:, x])[0]
                if len(col):
                    t[col.max(), x] = 0
        # final sweep (contact pixels can strand a neighbour); hairs/dew/sparkles kept
        keep = np.zeros(t.shape, bool)
        for m, tone in self.post:
            keep |= m & ~body0
        t2 = clean8(t)
        t = np.where(keep, t, t2)
        self.final = t
        return t


def icon_rows(fn, dx=0):
    """Render a 16x16 icon Sprite (full black outline, no selout, no contact
    line) and return it as ASCII rows for build.py, bottom-aligned (the last
    row is the bottom outline), centred horizontally (+dx)."""
    s = fn()
    s.contact = []
    t = s.finish(selout=False)
    on = t >= 0
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    w = x1 - x0 + 1
    if w > 14 or y1 - y0 + 1 > 16:
        print("  !! icon too big", fn.__name__, w, y1 - y0 + 1)
        y0 = max(y0, y1 - 15)
    left = max(0, (16 - w) // 2 + dx)
    rows = []
    for y in range(y0, y1 + 1):
        r = [" "] * 16
        for x in range(x0, min(x1 + 1, x0 + 16 - left)):
            v = t[y, x]
            if v >= 0:
                r[left + x - x0] = "k123"[v]
        rows.append("".join(r))
    return rows


def clean8(t):
    """Orphan sweep the audit's way (8-neighbours): a coloured pixel with no
    same-tone 8-neighbour takes the most common coloured tone around it."""
    h, w = t.shape
    out = t.copy()
    for y in range(h):
        for x in range(w):
            v = t[y, x]
            if v <= 0:
                continue
            nb = [t[yy, xx] for yy in range(max(0, y - 1), min(h, y + 2)) for xx in range(max(0, x - 1), min(w, x + 2))
                  if (yy, xx) != (y, x)]
            if v in nb:
                continue
            cand = [n for n in nb if n > 0]
            if cand:
                out[y, x] = max(sorted(set(cand)), key=cand.count)
            else:
                out[y, x] = 0
    return out


def fit_back(fn, maxw=45):
    """Wrap a back-sprite builder so nothing is clipped at the canvas sides:
    draw on a padded canvas, and if the shape is wider than maxw, redraw it
    scaled down about the bottom-centre until it fits (only the bottom edge
    is cropped, GBC style)."""
    def run():
        old = (Spr.pad, Spr.extra_sc)
        try:
            Spr.pad, Spr.extra_sc = 12, 1.0
            s = fn()
            for _ in range(4):
                t = s.tone >= 0
                xs = np.nonzero(t.any(0))[0]
                w = xs.max() - xs.min() + 3
                if w <= maxw:
                    break
                Spr.extra_sc *= (maxw - 0.5) / w
                s = fn()
            return s
        finally:
            Spr.pad, Spr.extra_sc = old
    run.__name__ = fn.__name__
    return run
