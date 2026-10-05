"""Drawing helpers shared by Artist A's Crystal-rule lines (chili, lily,
dandelion, bramble). No build() here: the line modules import it.

Everything is drawn with the species_a vector toolkit (px.Sprite: parts are
boolean masks lit from the top-left, then one full 1px #181818 outline),
loaded through kit.legacy, exactly as the pilot oak was. A finished frame is
an INDEX array (0..3, T = transparent), which kit.write_species takes as is.

  index 0  #181818  outline, crevices, cast shadow (shared)
  index 1  the species' dark tone
  index 2  the species' light tone (the body)
  index 3  #f8f8f8  highlights (shared)

Helpers:
  rim()          the Crystal white light rim on a form's lit (top-left) edge
  crescent()     a white specular crescent inside a glossy form
  fourconnect()  bridge diagonal-only rim/vein pixels so nothing reads as an orphan
  finish()       orphan sweep (protected hand pixels survive), -> index array
  frames_from()  render the intro poses; frame k = frame 0 except near the moving part
  register()     bottom-centre all frames on one shared offset
  moving_boxes() the declared moving region (2-row bands round every changed pixel)
  icon()/hop()   16x16 ASCII icons and the follower's 1px hop frame
  pose()/m()     fieldkit-style design -> pixel rotation about the feet
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, legacy  # noqa: E402,F401

px = legacy("species_a/px.py")
Sprite, bezier, blob, spline, star, shift, lit_stripe, saw_leaf = (
    px.Sprite, px.bezier, px.blob, px.spline, px.star, px.shift, px.lit_stripe, px.saw_leaf)


def rot(pts, ang, pivot):
    """Rotate points by ang degrees (+ = clockwise on screen) about pivot."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    px_, py_ = pivot
    return [(px_ + (x - px_) * ca - (y - py_) * sa, py_ + (x - px_) * sa + (y - py_) * ca) for x, y in pts]


# ------------------------------------------------------------- finishing --
def rim(s, region, body=(2,), tone=3, sides=((-1, 0), (0, -1))):
    """Crystal light rim: body pixels that touch the outline on the lit
    (top-left) side become `tone`, inside `region` only."""
    t = s.t
    m = np.isin(t, body) & region
    hit = np.zeros_like(m)
    line = t == 0
    for dx, dy in sides:
        hit |= m & shift(line, -dx, -dy)
    ys, xs = np.nonzero(hit)
    s.px(list(zip(xs.tolist(), ys.tolist())), tone)
    return hit


def fourconnect(s, tones=(1, 3), body=(2,)):
    """A rim or vein pixel touching its own tone only diagonally gets a
    bridge pixel (on a body pixel), so every line is 4-connected."""
    t = s.t
    h, w = t.shape
    for _ in range(2):
        for y in range(h):
            for x in range(w):
                v = t[y, x]
                if v not in tones:
                    continue
                if any(0 <= y + dy < h and 0 <= x + dx < w and t[y + dy, x + dx] == v
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    continue
                for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and t[yy, xx] == v:
                        cands = [(x, yy), (xx, y)] if v == 3 else [(xx, y), (x, yy)]
                        for bx, by in cands:
                            if t[by, bx] in body:
                                t[by, bx] = v
                                s.protect[by, bx] = True
                                break
                        break


def crescent(mask, inset=2, thick=2, region=None):
    """The top-left band of a mask, `inset` px in and `thick` px deep."""
    inner = ndimage.binary_erosion(mask, iterations=inset) if inset else mask
    out = inner & ~shift(inner, thick, thick)
    if region is not None:
        out &= region
    lab, k = ndimage.label(out)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        out = lab == (1 + int(np.argmax(sizes)))
    return out


def grow(m, r):
    if r <= 0:
        return m
    return ndimage.binary_dilation(m, structure=np.ones((3, 3), bool), iterations=r)


def finish(s) -> np.ndarray:
    """Orphan sweep (protected hand pixels survive the first pass), then the
    sprite as an index array."""
    s.clean(force=False)
    s.clean(force=True)
    return np.where(s.t >= 0, s.t, T).astype(np.uint8)


def contact(s, x0, x1):
    """Weighted contact line: the ground outline 2px thick over x0..x1."""
    t = s.t
    for x in range(x0, x1 + 1):
        ys = np.nonzero(t[:, x] >= 0)[0]
        if not len(ys):
            continue
        y = ys.max()
        if t[y, x] == 0 and y > 0 and t[y - 1, x] > 0:
            s.px([(x, y - 1)], 0)


# ------------------------------------------------------------ animation ---
def frames_from(render, poses, pad=2):
    """render(*pose) -> (index array, moving-part mask). Frame k keeps frame
    0's pixels everywhere except near the moving part (in either pose)."""
    raw = [render(*p) for p in poses]
    f0, m0 = raw[0]
    out = [f0]
    for im, m in raw[1:]:
        reg = grow(m0 | m, pad)
        a = f0.copy()
        a[reg] = im[reg]
        out.append(a)
    return out


def register(frames, size=56, dx=0, dy=0):
    """Bottom-centre every frame with one shared offset (the union bbox)."""
    on = np.zeros(frames[0].shape, bool)
    for f in frames:
        on |= f != T
    ys, xs = np.nonzero(on)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    if x1 - x0 > size or y1 - y0 > size:
        print(f"  !! union bbox {x1 - x0}x{y1 - y0} exceeds {size}")
    ox = (size - (x1 - x0)) // 2 - x0 + dx
    oy = size - y1 + dy
    out = []
    H, W = frames[0].shape
    for f in frames:
        c = np.full((size, size), T, np.uint8)
        sy0, sy1 = max(0, -oy), min(H, size - oy)
        sx0, sx1 = max(0, -ox), min(W, size - ox)
        src = f[sy0:sy1, sx0:sx1]
        dst = c[sy0 + oy:sy1 + oy, sx0 + ox:sx1 + ox]
        dst[src != T] = src[src != T]
        out.append(c)
    return out


def moving_boxes(frames):
    a0 = frames[0]
    m = np.zeros(a0.shape, bool)
    for f in frames[1:]:
        m |= f != a0
    out = []
    for y0 in range(0, a0.shape[0], 2):
        ys, xs = np.nonzero(m[y0:y0 + 2])
        if len(xs):
            out.append((int(xs.min()), y0 + int(ys.min()), int(xs.max()) + 1, y0 + int(ys.max()) + 1))
    return out


def back_frame(s) -> np.ndarray:
    """A 48x48 back (crop_bottom sprite) as an index array."""
    return finish(s)


# ---------------------------------------------------------------- icons ---
def icon(rows) -> np.ndarray:
    """16x16 icon from ASCII ('.' clear, 0-3 palette index)."""
    a = np.full((16, 16), T, np.uint8)
    rows = [(r + "." * 16)[:16] for r in rows] + ["." * 16] * 16
    for y, r in enumerate(rows[:16]):
        for x, ch in enumerate(r):
            if ch in "0123":
                a[y, x] = int(ch)
    return seal(a)


def seal(a: np.ndarray) -> np.ndarray:
    """Close outline gaps: a transparent pixel 4-next to a colour pixel
    becomes black (a colour pixel on the canvas edge turns black itself)."""
    a = a.copy()
    h, w = a.shape
    col = (a != T) & (a != 0)
    for y, x in zip(*np.nonzero(col)):
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if not (0 <= yy < h and 0 <= xx < w):
                a[y, x] = 0
            elif a[yy, xx] == T:
                a[yy, xx] = 0
    return a


def hop(a: np.ndarray) -> np.ndarray:
    """Follower frame 2: the whole icon up 1px (the top row must be clear)."""
    out = np.full_like(a, T)
    out[:-1] = a[1:]
    return out


def squash(a: np.ndarray, row: int) -> np.ndarray:
    """Follower frame 2: drop one row at `row`, everything above moves down."""
    out = np.full_like(a, T)
    out[row + 1:] = a[row + 1:]
    out[1:row + 1] = a[0:row]
    return out


# ------------------------------------------------- fieldkit-style posing ---
def pose(s, k=1.0, deg=0.0, pxv=24.0, pyv=48.0):
    """Everything drawn from now on is scaled by k and rotated `deg`
    (+ = the top swings LEFT, toward the foe) about (pxv, pyv)."""
    c = s.c
    if not hasattr(s, "_X0"):
        s._X0, s._Y0 = c.X.copy(), c.Y.copy()
    a = np.radians(deg)
    ca, sa = np.cos(a), np.sin(a)
    dx, dy = (s._X0 - pxv) / k, (s._Y0 - pyv) / k
    c.X = pxv + ca * dx - sa * dy
    c.Y = pyv + sa * dx + ca * dy
    s._zk = (k, pxv, pyv, deg)
    return s


def m(s, x, y):
    """Design point -> pixel point under the current pose()."""
    k, pxv, pyv, deg = getattr(s, "_zk", (1.0, 0.0, 0.0, 0.0))
    a = np.radians(deg)
    ca, sa = np.cos(a), np.sin(a)
    dx, dy = (x - pxv) * k, (y - pyv) * k
    return pxv + ca * dx + sa * dy, pyv - sa * dx + ca * dy


def mi(s, x, y):
    X, Y = m(s, x, y)
    return int(round(X)), int(round(Y))


def ms(s, r):
    return r * getattr(s, "_zk", (1.0,))[0]


# -------------------------------------------------------- scratch review --
def preview(rows, path, k=4):
    """Quick look while iterating: [(id, front_frames, back, icons, palette, sport)]
    -> classic | every front frame | sport | back | icons | 1x, plus stats."""
    from PIL import Image, ImageDraw
    from kit import CLASSIC_DIR, to_rgba, white_share
    BG = (200, 208, 192)

    def up(a, kk):
        im = Image.fromarray(np.ascontiguousarray(a, np.uint8), "RGBA")
        return im.resize((im.width * kk, im.height * kk), Image.NEAREST)

    out_rows = []
    for id_, fr, back, icons, pal, sp in rows:
        tiles = []
        cp = CLASSIC_DIR / id_ / "front.png"
        if cp.exists():
            tiles.append(up(np.asarray(Image.open(cp).convert("RGBA")), k))
        for f in fr:
            tiles.append(up(to_rgba(f, pal), k))
        tiles.append(up(to_rgba(fr[0], sp), k))
        tiles.append(up(to_rgba(back, pal), k))
        for ic in icons:
            tiles.append(up(to_rgba(ic, pal), k))
        tiles.append(up(to_rgba(fr[0], pal), 1))
        op = fr[0] != T
        ys, xs = np.nonzero(op)
        lab = (f"{id_}: front white {white_share(fr[0]):.1%} black {(fr[0] == 0).sum() / op.sum():.1%} "
               f"fill {op.mean():.0%} bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} | "
               f"back white {white_share(back):.1%} fill {(back != T).mean():.0%} | "
               f"icon white {white_share(icons[0]):.1%}")
        out_rows.append((lab, tiles))
    pad = 6
    W = max(sum(t.width + pad for t in tl) for _, tl in out_rows) + pad
    H = sum(max(t.height for t in tl) + 20 for _, tl in out_rows) + pad
    sh = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(sh)
    y = pad
    for lab, tl in out_rows:
        dr.text((pad, y), lab, fill=(0, 0, 0))
        x = pad
        hh = max(t.height for t in tl)
        for t in tl:
            sh.paste(t, (x, y + 14 + hh - t.height), t)
            x += t.width + pad
        y += hh + 20
    sh.save(path)
    return path
