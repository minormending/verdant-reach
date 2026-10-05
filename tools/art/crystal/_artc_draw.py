"""Drawing helpers shared by Artist C's Crystal-rule lines (nettle,
moonflower, clover, cattail, foxglove). No build() here: the line modules
(tools/art/crystal/<line>.py) import it.

Everything is drawn with the species_b vector toolkit (pix.Sprite via
rig.Spr), as the pilot flytrap was: parts are flat-shaded at 1x with a
shadow band on the bottom-right (light from the top-left) and a full
#181818 outline. A frame is an index array (0..3, T = transparent).

  index 0  #181818  outline, crevices, cast shadow (shared)
  index 1  the species' dark tone
  index 2  the species' light tone (the body)
  index 3  #f8f8f8  highlights (shared)
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
from kit import legacy  # noqa: E402

# the species_b toolkit, loaded via kit.legacy (never put an old folder at
# the front of sys.path: species_b has its own nettle.py / moonflower.py)
_rig = legacy("species_b/rig.py")
_pix = sys.modules["pix"]
Spr = _rig.Spr
arclen_param, bez, dilate, erode, qbez, rot, shift = (
    _pix.arclen_param, _pix.bez, _pix.dilate, _pix.erode, _pix.qbez, _pix.rot, _pix.shift)

BLACK = "#181818"
WHITE = "#f8f8f8"
T = 255


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_rgba(idx, palette):
    idx = np.asarray(idx)
    out = np.zeros(idx.shape + (4,), np.uint8)
    for i, h in enumerate(palette):
        m = idx == i
        out[m, :3] = rgb(h)
        out[m, 3] = 255
    return out


# ---------------------------------------------------------------- shading --

def rim_white(s, m, pid, frac, tone=3):
    """A 1px white light rim on the top-left edge of a form: edge pixels
    facing up or left, on the top-left `frac` of the form's diagonal
    extent, only where part `pid` is still visible."""
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    ys, xs = np.nonzero(m)
    if not len(xs):
        return
    d = xs + ys
    lim = d.min() + (d.max() - d.min()) * frac
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    s.decal(edge & ((xx + yy) <= lim), tone, on=[pid])


def rim_top(s, m, pid, frac, tone=3):
    """Like rim_white but only the top-facing edge (for flat blades)."""
    edge = m & ~shift(m, 0, -1)
    ys, xs = np.nonzero(m)
    if not len(xs):
        return
    d = xs + ys
    lim = d.min() + (d.max() - d.min()) * frac
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    s.decal(edge & ((xx + yy) <= lim), tone, on=[pid])


def cast_shadow(s, n0, on, depth=2):
    """Black cast shadow on parts `on`, just under everything drawn after
    part id n0."""
    head = (s.pid > n0) & (s.tone >= 0)
    below = np.zeros_like(head)
    for d in range(1, depth + 1):
        below |= shift(head, 0, -d)
    s.decal(below & ~head & np.isin(s.pid, list(on)), 0)


def spr(w, h, pal, sc=1.0, pad=0):
    """A Spr whose canvas has `pad` extra px each side (geometry shifted by
    it), for poses whose biggest animation frame would hit the edge."""
    old = Spr.pad
    Spr.pad = pad
    try:
        return Spr(w, h, pal, sc)
    finally:
        Spr.pad = old


def mask_px(m):
    return list(zip(*[a.tolist() for a in np.nonzero(m)[::-1]]))


# ---------------------------------------------------------------- frames ---

def tones(s, **kw):
    s.sel = 0.0        # Crystal: a full black outline, no selout
    t = s.finish(**kw)
    return np.where(t >= 0, t, T).astype(np.uint8)


def render_frames(fn, n, grow=2):
    """Render n front frames. Frame k keeps its own pixels only near its
    moving part (s.movem, set by the drawing function: the mask of pixels
    the moving part changed), everything else is frame 0's."""
    sp = [fn(k) for k in range(n)]
    fr = [tones(x) for x in sp]
    out = [fr[0]]
    for k in range(1, n):
        reg = dilate(sp[0].movem | sp[k].movem, grow, diag=True)
        out.append(np.where(reg, fr[k], fr[0]))
    return out


def place(frames, size=56, dx=0, bottom=None):
    """Crop all frames to their union bbox and drop it bottom-centred in a
    size x size box (+dx). bottom = the row the lowest pixel lands on."""
    f0 = frames[0]
    on = np.zeros(f0.shape, bool)
    for f in frames:
        on |= f != T
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h = x1 - x0, y1 - y0
    if w > size or h > size:
        print(f"  !! too big {w}x{h}")
    out = []
    ox = max(0, (size - w) // 2 + dx)
    oy = max(0, (size if bottom is None else bottom + 1) - h)
    for f in frames:
        c = np.full((size, size), T, np.uint8)
        crop = f[y0:y1, x0:x1][-size:, :size - ox]
        c[oy:oy + crop.shape[0], ox:ox + crop.shape[1]] = crop
        out.append(c)
    return out


def moving_boxes(frames):
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


def back_frame(fn, maxw=46):
    """Render a back on a padded canvas (scaled down until it fits), centred
    and cut by the bottom edge, 48x48."""
    old = (Spr.pad, Spr.extra_sc)
    try:
        Spr.pad, Spr.extra_sc = 12, 1.0
        for _ in range(4):
            s = fn()
            s.sel = 0.0
            t = s.finish(open_bottom=True)
            xs = np.nonzero((t >= 0).any(0))[0]
            if xs.max() - xs.min() + 1 <= maxw:
                break
            Spr.extra_sc *= (maxw - 0.5) / (xs.max() - xs.min() + 1)
    finally:
        Spr.pad, Spr.extra_sc = old
    t = np.where(t >= 0, t, T).astype(np.uint8)
    ys, xs = np.nonzero(t != T)
    c = t[ys.min():ys.min() + 48, xs.min():xs.max() + 1]
    out = np.full((48, 48), T, np.uint8)
    ox = (48 - c.shape[1]) // 2
    out[48 - c.shape[0]:, ox:ox + c.shape[1]] = c
    return out


def icon_arr(rows):
    """16x16 icon from ASCII ('.' clear; k outline, 1 dark, 2 light, 3 white),
    bottom-aligned."""
    mp = {"k": 0, "1": 1, "2": 2, "3": 3}
    a = np.full((16, 16), T, np.uint8)
    off = 16 - len(rows)
    for y, r in enumerate(rows):
        if len(r) != 16:
            print("  !! icon row width", len(r), repr(r))
        for x, ch in enumerate(r[:16]):
            if ch in mp:
                a[off + y, x] = mp[ch]
    return a


# ---------------------------------------------------------------- review ---

BG = (200, 208, 192)


def preview(rows, path, k=4):
    """rows: [(palette, [index arrays...], sport or None)] -> a PNG sheet."""
    tiles = []
    for pal, arrs, sport in rows:
        ims = [to_rgba(a, pal) for a in arrs]
        if sport:
            ims.append(to_rgba(arrs[0], sport))
        tiles.append(ims)
    W = max(sum(im.shape[1] * k + 8 for im in r) for r in tiles) + 8
    H = sum(max(im.shape[0] for im in r) * k + 8 for r in tiles) + 8
    sheet = Image.new("RGB", (W, H), BG)
    y = 8
    for ims in tiles:
        rh = max(im.shape[0] for im in ims) * k
        x = 8
        for a in ims:
            im = Image.fromarray(a, "RGBA")
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, y + rh - im.height), im)
            x += im.width + 8
        y += rh + 8
    sheet.save(path)
    return path


def white_share(a):
    op = (a != T).sum()
    return (a == 3).sum() / max(1, op)


# ------------------------------------------------- species_c px adapter ----

def px_kit():
    """The species_c vector kit (px.Sprite, Canvas, bezier, ...) and its
    shape helpers (common.py), loaded via kit.legacy."""
    px = legacy("species_c/px.py")
    common = legacy("species_c/common.py")
    return px, common


def px_index(s, clean=True):
    """A rendered species_c px.Sprite -> index array (T transparent)."""
    if clean:
        s.clean(force=True)
    t = s.t
    return np.where(t >= 0, t, T).astype(np.uint8)


def register(frames, regions=None, grow=1):
    """Frame k keeps its own pixels only where it differs from frame 0
    (grown by `grow`), clipped to regions[k] (a bool mask) when given."""
    f0 = frames[0]
    out = [f0]
    for k, f in enumerate(frames[1:], 1):
        d = dilate(f != f0, grow, diag=True)
        if regions is not None and regions[k] is not None:
            d &= regions[k]
        out.append(np.where(d, f, f0))
    return out


def box(h, w, x0, y0, x1, y1):
    m = np.zeros((h, w), bool)
    m[max(0, y0):y1, max(0, x0):x1] = True
    return m


def icon_squash(a, row):
    """Icon frame 2: everything above `row` drops 1px (row is swallowed),
    the base stays planted: a crouch-and-hop in the party menu."""
    out = np.full_like(a, T)
    out[row + 1:] = a[row + 1:]
    out[1:row + 1] = a[0:row]
    return out


def icon_pair(rows, row, extra=None):
    """(icon, icon__2): frame 2 is the squash, plus optional ASCII `extra`
    pixels ({(x, y): ch}) for the gesture (a hair, a fluff, a flare)."""
    a = icon_arr(rows)
    b = icon_squash(a, row)
    mp = {"k": 0, "1": 1, "2": 2, "3": 3, ".": T}
    for (x, y), ch in (extra or {}).items():
        b[y, x] = mp[ch]
    return [a, b]


def outline_fix(a):
    """Close outline gaps in an icon: a colour pixel touching transparency
    (4-neighbour) gets a black pixel on that side if it is free, else it
    turns black itself."""
    a = a.copy()
    h, w = a.shape
    for y in range(h):
        for x in range(w):
            if a[y, x] in (T, 0):
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if not (0 <= xx < w and 0 <= yy < h):
                    a[y, x] = 0
                    break
                if a[yy, xx] == T:
                    a[yy, xx] = 0
    return a
