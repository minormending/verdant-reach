"""Helpers for the redesigned starter lines (oak, chili, lily): posing
(rotating control points about a pivot), selout, a hand-pixelled icon
loader and a preview sheet for iterating on one line.
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

from px import K, snap


def rot(pts, ang, pivot):
    """Rotate points by ang degrees (+ = clockwise on screen) about pivot."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    px_, py_ = pivot
    return [(px_ + (x - px_) * ca - (y - py_) * sa, py_ + (x - px_) * sa + (y - py_) * ca) for x, y in pts]


def selout(s, region=None, tone=1, lit=(2, 3)):
    """Selective outline: black outline pixels whose outside is up/left and
    whose inside (down/right) is a lit tone become the dark tone. Only where
    the outside is background. `region`: optional mask limiting it."""
    t = s.t
    h, w = t.shape
    out = []
    for y in range(h):
        for x in range(w):
            if t[y, x] != 0 or (region is not None and not region[y, x]):
                continue

            def at(yy, xx):
                return t[yy, xx] if 0 <= yy < h and 0 <= xx < w else -1
            up_out = at(y - 1, x) == -1
            lf_out = at(y, x - 1) == -1
            dn_in = at(y + 1, x) in lit
            rt_in = at(y, x + 1) in lit
            if (up_out and dn_in) or (lf_out and rt_in):
                # never where the outside is down/right (shadow side)
                if at(y + 1, x) == -1 or at(y, x + 1) == -1:
                    continue
                out.append((x, y))
    for x, y in out:
        t[y, x] = tone
        s.protect[y, x] = True
    return s


def icon(rows, pal):
    """16x16 icon from ASCII rows ('.' transparent, 0-3 tones). Rows are
    padded/trimmed to 16x16."""
    rows = [(r + "." * 16)[:16] for r in rows] + ["." * 16] * 16
    rows = rows[:16]
    P = [snap(K)] + [snap(p) for p in pal]
    a = np.zeros((16, 16, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in "0123":
                a[y, x] = P[int(ch)] + (255,)
    return Image.fromarray(a, "RGBA")


def preview(sets, path, z=5):
    """sets: list of (id, {kind: img}). Rows: frames at z, 1x strip, silhouettes."""
    BG = (232, 236, 220, 255)
    order = ["front", "front__2", "front__3", "back", "icon", "icon__2"]
    W = 0
    for _, imgs in sets:
        W = max(W, sum(imgs[k].width * (z if k in ("front", "front__2", "front__3", "back") else z) + 8
                       for k in order if k in imgs))
    W += 200
    rowh = 56 * z + 30
    im = Image.new("RGBA", (W, rowh * len(sets)), BG)
    d = ImageDraw.Draw(im)
    for r, (id_, imgs) in enumerate(sets):
        x, y = 6, r * rowh + 14
        d.text((x, y - 12), id_, fill=(0, 0, 0, 255))
        for k in order:
            if k not in imgs:
                continue
            g = imgs[k]
            zz = z if g.width > 16 else z
            big = g.resize((g.width * zz, g.height * zz), Image.NEAREST)
            im.alpha_composite(big, (x, y + 56 * z - big.height if g.width > 16 else y))
            x += big.width + 8
        # 1x: battle-like bg, plus silhouette
        x += 6
        for k in ("front", "back", "icon"):
            g = imgs[k]
            im.alpha_composite(g, (x, y))
            a = np.asarray(g).copy()
            a[a[..., 3] > 0, :3] = 0
            im.alpha_composite(Image.fromarray(a, "RGBA"), (x, y + 60))
            # 2x
            g2 = g.resize((g.width * 2, g.height * 2), Image.NEAREST)
            im.alpha_composite(g2, (x + 60, y + 120 if k != "front" else y + 120))
            x += g.width + 4 if k != "front" else 62
    im.save(path)


class Ico:
    """16x16 icon builder: shapes are filled back to front, each with a 1px
    black ring drawn OUTSIDE its mask (so even 2px stems keep their colour),
    then lit: the top-left edge of a shape gets `lt`, the bottom-right edge `dk`."""

    def __init__(self):
        from px import Canvas
        self.c = Canvas(16, 16)
        self.t = np.full((16, 16), -1)

    def shape(self, mask, tone, dk=None, lt=None, ring=True):
        t = self.t
        if ring:
            r = np.zeros_like(mask)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                r |= np.roll(np.roll(mask, dy, 0), dx, 1)
            r &= ~mask
            t[r] = 0
        t[mask] = tone
        if dk is not None:
            br = mask & ~(np.roll(np.roll(mask, -1, 0), -1, 1))
            t[br & mask] = dk
        if lt is not None:
            tl = mask & ~(np.roll(np.roll(mask, 1, 0), 1, 1)) & ~(mask & ~np.roll(mask, -1, 0))
            t[tl] = lt
        return self

    def put(self, x, y, rows):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == ".":
                    continue
                if 0 <= x + i < 16 and 0 <= y + j < 16:
                    self.t[y + j, x + i] = -1 if ch == "_" else int(ch)
        return self

    def rows(self):
        return ["".join("." if v < 0 else str(v) for v in r) for r in self.t]


def icon2(img):
    """Icon frame 2: a 1px hop when the top row is free, else a squash (the
    top drops 1px at the middle row while the base stays planted)."""
    from px import squash
    a = np.asarray(img)
    if not a[0, :, 3].any():
        out = np.zeros_like(a)
        out[:-1] = a[1:]
        return Image.fromarray(out, "RGBA")
    return squash(img, 8)


def nudge(img, dx):
    """Translate a finished sprite horizontally by dx px (whole-sprite
    registration, e.g. to put the centre of mass at x 28-34). Every frame of
    a species gets the same dx, so the idle registration is unchanged."""
    a = np.asarray(img)
    out = np.zeros_like(a)
    if dx >= 0:
        assert not a[:, a.shape[1] - dx:, 3].any(), "nudge would crop the sprite"
        out[:, dx:] = a[:, :a.shape[1] - dx]
    else:
        assert not a[:, :-dx, 3].any(), "nudge would crop the sprite"
        out[:, :dx] = a[:, -dx:]
    return Image.fromarray(out, "RGBA")


def ringed(rows):
    """Icon authoring aid: rows give the fill tones ('1'-'3') and any
    internal black lines ('0'); a 1px black ring is added round the whole
    silhouette (4-connected, pixel-perfect corners dropped), so the outline
    is always complete. Returns 16 strings for icon()."""
    rows = [(r + "." * 16)[:16] for r in rows] + ["." * 16] * 16
    g = [list(r) for r in rows[:16]]
    fill = [[ch in "0123" for ch in r] for r in g]
    for y in range(16):
        for x in range(16):
            if fill[y][x]:
                continue
            n = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(0 <= a < 16 and 0 <= b < 16 and fill[a][b] and g[a][b] != "0" for a, b in n):
                g[y][x] = "0"
    return ["".join(r) for r in g]
