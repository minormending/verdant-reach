"""Artist B's shared drawing helpers for the Crystal-rule pumpkin, fern,
maple and sundew lines (docs/ROLLOUT.md). The leading underscore keeps
crystal/build.py from running it as a line.

Builds on the base art's species_b pixel kit (pix.py shapes, rig.py's Spr
with whole-body tilt), loaded through kit.legacy so no old module name can
shadow a crystal one. Everything here works in palette indexes:
0 #181818 outline, 1 species dark, 2 species light, 3 #f8f8f8 white, T clear.

  BSpr             a roomy Spr: geometry authored in the usual 56/60/64 box,
                   drawn with a margin so the biggest gesture never clips
  tones(s)         finish a sprite (full black outline, no selout) -> index array
  rim_white        the Crystal 1px white light rim on a form's top-left edge
  render_frames    frame k keeps its own pixels only round its moving part
  place            crop every frame to their union and drop it bottom-centred
  back_frame       a 48x48 back, centred, cut by the bottom edge
  moving_boxes     the per-row boxes kit.check verifies registration with
  icon_arr, bob    16x16 icons from ASCII; frame 2 as a 1px hop
"""

from __future__ import annotations

import contextlib
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import T, legacy  # noqa: E402

pix = legacy("species_b/pix.py")
Spr = legacy("species_b/rig.py").Spr
shift, dilate, erode = pix.shift, pix.dilate, pix.erode
bez, qbez, rot, arclen_param = pix.bez, pix.qbez, pix.rot, pix.arclen_param


class BSpr(Spr):
    """Spr on a roomy canvas: geometry is authored in the usual box and
    offset by (PADX, PADY), so a big intro gesture never clips the canvas.
    The scale `sc` still pivots on the authored bottom-centre."""
    PADX, PADY = 12, 14

    def __init__(self, w, h, pal, sc=1.0):
        super().__init__(w + 2 * BSpr.PADX - 2 * Spr.pad, h + BSpr.PADY, pal, sc)
        self.ox = BSpr.PADX
        self.oy = BSpr.PADY

    def set_tilt(self, deg, px, py):
        super().set_tilt(deg, px, py + self.oy)

    @contextlib.contextmanager
    def rotated(self, deg, cx, cy):
        with super().rotated(deg, cx, cy + self.oy):
            yield

    def T(self, pts):
        return super().T([(x, y + self.oy) for x, y in pts])

    def finish(self, **kw):
        self.contact = [(a + self.ox, b + self.ox) for a, b in self.contact]
        return super().finish(**kw)


def tones(s, **kw):
    """Finish with the Crystal outline (full black, no selout) -> index array."""
    s.sel = 0.0
    t = s.finish(**kw)
    return np.where(t >= 0, t, T).astype(np.uint8)


def rim_white(s, m, pid, frac, tone=3):
    """A 1px white light rim on the top-left edge of form `m`, along the
    top-left `frac` of its diagonal extent, only where part `pid` shows."""
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    ys, xs = np.nonzero(m)
    if not len(xs):
        return
    d = xs + ys
    lim = d.min() + (d.max() - d.min()) * frac
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    s.decal(edge & ((xx + yy) <= lim), tone, on=[pid] if pid is not None else None)


def render_frames(fn, n):
    """Render n front frames. fn(k) returns a sprite whose `movem` marks its
    moving part; frame k keeps its own pixels only within 2px of its moving
    part and frame 0's, so the rest is pixel-identical to frame 0."""
    sp = [fn(k) for k in range(n)]
    fr = [tones(x) for x in sp]
    out = [fr[0]]
    for k in range(1, n):
        reg = dilate(sp[0].movem | sp[k].movem, 2, diag=True)
        out.append(np.where(reg, fr[k], fr[0]))
    return out


def place(frames, size=56, dx=0):
    """Crop all frames to their union bbox and drop it bottom-centred."""
    on = np.zeros(frames[0].shape, bool)
    for f in frames:
        on |= f != T
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h = x1 - x0, y1 - y0
    if w > size or h > size:
        raise ValueError(f"the largest frame does not fit {size}x{size}: {w}x{h}")
    ox = max(0, (size - w) // 2 + dx)
    oy = size - h
    out = []
    for f in frames:
        c = np.full((size, size), T, np.uint8)
        c[oy:oy + h, ox:ox + w] = f[y0:y1, x0:x1]
        out.append(c)
    return out


def back_frame(fn, maxw=45):
    """Render a back on a padded canvas (scaled down until it fits maxw
    wide), centred and cut by the bottom edge."""
    old = (Spr.pad, Spr.extra_sc)
    try:
        Spr.pad, Spr.extra_sc = 12, 1.0
        for _ in range(4):
            s = fn()
            s.sel = 0.0
            t = s.finish(open_bottom=True)
            xs = np.nonzero((t >= 0).any(0))[0]
            if xs.max() - xs.min() + 3 <= maxw:
                break
            Spr.extra_sc *= (maxw - 0.5) / (xs.max() - xs.min() + 3)
    finally:
        Spr.pad, Spr.extra_sc = old
    t = np.where(t >= 0, t, T).astype(np.uint8)
    ys, xs = np.nonzero(t != T)
    c = t[ys.min():ys.min() + 48, xs.min():xs.max() + 1].copy()
    # the body runs on past the cut: a shadow band the canvas edge drew on the
    # last rows takes the tone of the body above it
    for r in (1, 2):
        row, above = c[-r], c[-r - 3] if c.shape[0] > r + 3 else c[-r]
        fix = (row == 1) & (above == 2)
        row[fix] = 2
    out = np.full((48, 48), T, np.uint8)
    ox = (48 - c.shape[1]) // 2
    out[48 - c.shape[0]:, ox:ox + c.shape[1]] = c
    return out


def moving_boxes(frames):
    """Per-2-row boxes round every pixel that differs from frame 0."""
    f0 = frames[0]
    diff = np.zeros(f0.shape, bool)
    for f in frames[1:]:
        diff |= f != f0
    boxes = []
    for y0 in range(0, f0.shape[0], 2):
        ys, xs = np.nonzero(diff[y0:y0 + 2])
        if len(xs):
            boxes.append((int(xs.min()), y0 + int(ys.min()), int(xs.max()) + 1, y0 + int(ys.max()) + 1))
    return boxes


def icon_arr(rows):
    """16x16 icon from ASCII rows (k outline, 1 dark, 2 light, 3 white,
    anything else clear), bottom-aligned."""
    mp = {"k": 0, "1": 1, "2": 2, "3": 3}
    a = np.full((16, 16), T, np.uint8)
    off = 16 - len(rows)
    for y, r in enumerate(rows):
        if len(r) > 16:
            raise ValueError(f"icon row too long: {r!r}")
        for x, ch in enumerate(r):
            if ch in mp:
                a[off + y, x] = mp[ch]
    return a


def bob(icon):
    """Icon frame 2 as a 1px hop (row 0 must be clear)."""
    if not (icon[0] == T).all():
        raise ValueError("a bobbing icon needs a clear top row")
    out = np.full_like(icon, T)
    out[:-1] = icon[1:]
    return out


def icons(pair):
    """(rows, rows2 or None) -> [icon, icon__2]; None hops."""
    a, b = pair
    i0 = icon_arr(a)
    return [i0, bob(i0) if b is None else icon_arr(b)]
