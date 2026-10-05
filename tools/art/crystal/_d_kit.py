"""Artist D's drawing helpers for the Crystal-rule lines holly, mint, rose,
pitcher and snapdragon (tools/art/crystal/{holly,mint,rose,pitcher,snapdragon}.py).

A thin layer over the species_b vector kit (pix.Sprite / rig.Spr): parts are
painted back to front in palette INDEXES (0 black, 1 species dark, 2 species
light, 3 the shared white), then finished with a full black outline (no
selout). This module adds what the Crystal rule needs on top:

* `rim_white`  a 1px white light rim on the lit (top-left) edge of a form;
* `frames`     render n front frames where only the moving part may differ
               (each frame records `s.headm`, the pixels its moving parts
               painted; everything else is frame 0's pixels);
* `place`      crop all frames to their union box and drop it bottom-centred;
* `back_frame` a 48x48 back cut off by the bottom edge;
* `icon_arr`   ASCII icons;
* `preview`    a scratch sheet of a line's frames.

The leading underscore keeps tools/art/crystal/build.py from running it.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))                    # kit (never put an old species_X folder first)

from kit import BLACK, WHITE, T, legacy, to_rgba  # noqa: E402,F401

_rig = legacy("species_b/rig.py")
Spr = _rig.Spr
_pix = sys.modules["pix"]                            # the copy rig.py itself imported
bez, dilate, erode, qbez, shift = _pix.bez, _pix.dilate, _pix.erode, _pix.qbez, _pix.shift


# ---------------------------------------------------------------- forms ---

def rim_white(s, m, pid, frac, tone=3):
    """1px light rim on the top-left edge of form `m` (edge pixels facing up
    or left), over the top-left `frac` of its diagonal extent, only where
    part `pid` is still visible."""
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    ys, xs = np.nonzero(m)
    if not len(xs):
        return
    d = xs + ys
    lim = d.min() + (d.max() - d.min()) * frac
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    s.decal(edge & ((xx + yy) <= lim), tone, on=[pid])


def mask_px(m):
    return list(zip(*np.nonzero(m)[::-1]))


def stalk(s, ctrl, w0, w1, base=2, k=2, line=0, merge=(), vein=None, cap=True, n=40, sh_tone=None, rim=0.0):
    """A tapered stem through ctrl; returns (pid, mask, path)."""
    path = bez(ctrl, n)
    m = s.stroke(path, (w0, w1), cap=cap)
    pid = s.part(m, base=base, k=k, line=line, merge=merge, sh_tone=sh_tone)
    if rim:
        rim_white(s, m, pid, rim)
    if vein is not None:
        s.decal(s.line1(path[4:-4]), vein, on=[pid])
    return pid, m, path


def leaf(s, base, tip, w, bend=0.0, fat=0.45, blunt=0.0, tone=2, k=2, line=0, rib=1, rim=0.0,
         merge=(), shadow=(1, 1)):
    """A plain pointed leaf with a midrib in tone `rib` (None = no rib)."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, blunt=blunt)
    pid = s.part(m, base=tone, k=k, line=line, merge=merge, shadow=shadow)
    if rib is not None:
        s.decal(s.line1(path[6:-8]), rib, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m, path


def serrate(base, tip, w, bend=0.0, fat=0.45, teeth=6, depth=1.2, n=120, spine=0.0, spine_every=1,
            scallop=0.0):
    """Polygon of a leaf with a toothed margin: `teeth` points per side that
    push out by `depth` (+ `spine` on every `spine_every`-th tooth); `scallop`
    pinches the margin in between teeth (holly). Returns (poly, midrib path,
    tooth tips [(x, y, side)])."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
    path = qbez(base, c, tip, n)
    p = math.log(0.5) / math.log(fat)
    left, right, tips = [], [], []
    for i, (x, y) in enumerate(path):
        t = i / (n - 1)
        a = path[max(0, i - 1)]
        b = path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ll = math.hypot(dx, dy) or 1.0
        ux, uy = -dy / ll, dx / ll
        base_w = w * math.sin(math.pi * (t ** p)) ** 0.85 / 2
        # tooth phase
        ph = t * teeth
        frac = ph - math.floor(ph)
        bump = max(0.0, 1 - abs(frac - 0.5) * 2) ** 2 if 0.12 < t < 0.97 else 0.0
        ti = int(math.floor(ph))
        sp = spine if (ti % spine_every == 0) else 0.0
        out = base_w + (depth + sp) * bump - scallop * (1 - bump) * (0.15 < t < 0.95)
        out = max(0.0, out)
        left.append((x + ux * out, y + uy * out))
        right.append((x - ux * out, y - uy * out))
        if 0.12 < t < 0.97 and abs(frac - 0.5) < 0.5 / (n / teeth):
            tips.append((x + ux * out, y + uy * out, 1))
            tips.append((x - ux * out, y - uy * out, -1))
    return left + right[::-1], path, tips


# ------------------------------------------------------------- frames -----

def close_outline(t, open_bottom=False):
    """Full black outline: any transparent pixel 4-adjacent to a colour pixel
    (a particle, a spine tip, a sparkle drawn after the outline) turns black."""
    body = t >= 1
    ring = dilate(body, 1) & (t < 0)
    if open_bottom:
        ring[-1, :] = False
    t = t.copy()
    t[ring] = 0
    return t


def tones(s, **kw):
    s.sel = 0.0
    t = close_outline(s.finish(**kw))
    return np.where(t >= 0, t, T).astype(np.uint8)


def frames(fn, n, grow=2):
    """Render fn(0..n-1); frame k keeps its own pixels only near its moving
    parts (s.headm of frame 0 and k, grown by `grow`), else frame 0's."""
    sp = [fn(k) for k in range(n)]
    fr = [tones(x) for x in sp]
    out = [fr[0]]
    for k in range(1, n):
        reg = dilate(sp[0].headm | sp[k].headm, grow, diag=True)
        out.append(np.where(reg, fr[k], fr[0]))
    return out


def place(fr, size=56, dx=0, bottom=0):
    """Crop all frames to their union bbox, drop it bottom-centred (+dx)."""
    on = np.zeros(fr[0].shape, bool)
    for f in fr:
        on |= f != T
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h = x1 - x0, y1 - y0
    if w > size or h > size:
        print(f"  !! too big {w}x{h}")
    ox = max(0, (size - w) // 2 + dx)
    oy = max(0, size - h - bottom)
    out = []
    for f in fr:
        c = np.full((size, size), T, np.uint8)
        crop = f[y0:y1, x0:x1][-size:, :size - ox]
        c[oy:oy + crop.shape[0], ox:ox + crop.shape[1]] = crop
        out.append(c)
    return out


def moving_boxes(fr):
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


def back_frame(fn, maxw=46):
    """A back on a padded canvas, scaled down until it fits, centred and cut
    by the bottom edge (no outline along the cut)."""
    old = (Spr.pad, Spr.extra_sc)
    try:
        Spr.pad, Spr.extra_sc = 12, 1.0
        for _ in range(8):
            s = fn()
            s.sel = 0.0
            t = close_outline(s.finish(open_bottom=True), open_bottom=True)
            xs = np.nonzero((t >= 0).any(0))[0]
            if xs.max() - xs.min() + 1 <= maxw:
                break
            Spr.extra_sc *= (maxw - 0.5) / (xs.max() - xs.min() + 1)
    finally:
        Spr.pad, Spr.extra_sc = old
    t = np.where(t >= 0, t, T).astype(np.uint8)
    ys, xs = np.nonzero(t != T)
    c = t[ys.min():ys.min() + 48, xs.min():xs.max() + 1][:, :48]
    out = np.full((48, 48), T, np.uint8)
    ox = (48 - c.shape[1]) // 2
    out[48 - c.shape[0]:, ox:ox + c.shape[1]] = c
    return out


def icon_arr(rows):
    """16 ASCII rows (bottom-aligned): '.' clear, k outline, 1 dark, 2 light,
    3 white. Any colour pixel left touching transparency gets a black outline
    pixel, so the outline is always full."""
    mp = {"k": 0, "1": 1, "2": 2, "3": 3}
    t = np.full((16, 16), -1, int)
    rows = ["." * 16] * (16 - len(rows)) + list(rows)
    for y, r in enumerate(rows):
        assert len(r) == 16, (y, r)
        for x, ch in enumerate(r):
            if ch in mp:
                t[y, x] = mp[ch]
    t = close_outline(join_orphans(t))
    return np.where(t >= 0, t, T).astype(np.uint8)


def join_orphans(t):
    """Icons: a lone colour pixel (no same-tone 8-neighbour: a 1px glint or
    vein dot) grows into one 4-neighbour of the body (right, down, left, up),
    so every detail is at least a 2px cluster."""
    t = t.copy()
    h, w = t.shape
    for y in range(h):
        for x in range(w):
            v = t[y, x]
            if v <= 0:
                continue
            nb = [t[yy, xx] for yy in range(max(0, y - 1), min(h, y + 2))
                  for xx in range(max(0, x - 1), min(w, x + 2)) if (yy, xx) != (y, x)]
            if v in nb:
                continue
            for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and t[yy, xx] > 0 and t[yy, xx] != v:
                    t[yy, xx] = v
                    break
    return t


def hop(a):
    """Icon frame 2: the whole icon up 1px; if the top row is taken, a squash
    instead (a row out of the upper body, the base stays put)."""
    if (a[0] != T).any():
        ys = np.nonzero((a != T).any(1))[0]
        top, bot = ys[0], ys[-1]
        r = top + max(1, (bot - top) // 3)
        out = np.full_like(a, T)
        out[top + 1:r + 1] = a[top:r]
        out[r + 1:] = a[r + 1:]
        t = close_outline(np.where(out != T, out.astype(int), -1))
        return np.where(t >= 0, t, T).astype(np.uint8)
    out = np.full_like(a, T)
    out[:-1] = a[1:]
    return out


# ------------------------------------------------------------ preview -----

BG = (200, 208, 192)


def preview(rows, path, k=4, pals=None):
    """rows: [(pal, [index arrays...])]; each row at k, bottom-aligned.
    pals: optional list of extra palettes per row (sport) shown after."""
    ims_rows = []
    for pal, arrs in rows:
        ims_rows.append([Image.fromarray(to_rgba(a, pal), "RGBA") for a in arrs])
    W = max(sum(im.width * k + 8 for im in r) for r in ims_rows) + 8
    H = len(ims_rows) * (56 * k + 8) + 8
    sheet = Image.new("RGB", (W, H), BG)
    for r, ims in enumerate(ims_rows):
        x = 8
        for im in ims:
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, 8 + r * (56 * k + 8) + 56 * k - im.height), im)
            x += im.width + 8
    sheet.save(path)
    return path


def stats(name, a):
    op = (a != T).sum()
    ys, xs = np.nonzero(a != T)
    print(f"  {name}: {xs.max() - xs.min() + 1}x{ys.max() - ys.min() + 1} fill {op / a.size:.0%} "
          f"white {(a == 3).sum() / op:.1%} dark {(a == 1).sum() / op:.0%} light {(a == 2).sum() / op:.0%} "
          f"black {(a == 0).sum() / op:.0%} comx {xs.mean():.1f} bottom {ys.max()}")
