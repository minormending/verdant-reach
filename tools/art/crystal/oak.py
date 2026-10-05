"""Crystal rule, oak line: oak_acorn -> oak_sapling -> great_oak (base art).

Promoted from the pilot (docs/CRYSTAL_PILOT.md, row 2) into the base
species bundles (docs/ROLLOUT.md).  A redraw, not a recolour, of
tools/art/species_a/oak.py under the Crystal rule:

  index 0  #181818  outline, deepest crevices, cast shadow   (shared)
  index 1  species dark: the CAP / BARK brown                (the line's accent)
  index 2  species light: the nut amber, then the leaf green  (the body)
  index 3  #f8f8f8  highlights                                (shared)

The green-on-green problem (leaf on leaf, crown on crown) is solved by
NOT having a dark green: the only dark is the bark brown, hue-shifted warm
from the leaf green, so every crown shadow is the same brown as the trunk
and the acorn cap.  Leaf clumps separate by black crevices and white
top-left rims instead of by a second green.

Pose vocabulary and silhouettes are kept from the base art:
  oak_acorn    BRACED   the cap helmet tilted at the foe, radicle feet.
  oak_sapling  BRACED   C trunk, lobed lead leaf as a shield, cap helmet.
  great_oak    LOOMING  crown overhangs the foe, acorn fist on the lead bough.

Entrance animations (only the named part moves; the rest is pixel-identical):
  oak_acorn    the cap tips up, a peek from under the brim, then it SNAPS down.
  oak_sapling  the branches pull in, flex out, and brace like arms.
  great_oak    the crown heaves up, the leaves shiver, then it settles.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/oak.py      # write the base bundles + review sheet
  (tools/art/crystal/build.py runs build() for every line)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))                        # the crystal kit

from kit import BLACK, WHITE, write_species, review_sheet, intro_strip, legacy  # noqa: E402

px = legacy("species_a/px.py")                       # the base art's pixel helpers
akit = legacy("species_a/kit.py")                    # rot, icon, icon2
Sprite, blob, lobed_leaf, bezier = px.Sprite, px.blob, px.lobed_leaf, px.bezier
rot = akit.rot
TOOL = "tools/art/crystal/oak.py"

IDS = ["oak_acorn", "oak_sapling", "great_oak"]

# species colours (index 1, index 2).  Same greyscale weight across the line
# (dark ~26%, light ~58%) so the three read as one family in the battle box.
PAL = {
    "oak_acorn":   ("#703818", "#d88830"),   # cap brown (wine-warm), amber nut
    "oak_sapling": ("#604018", "#78c040"),   # cap/trunk brown, leaf green
    "great_oak":   ("#584018", "#68b838"),   # bark brown, deep leaf green
}
# 'Concordia' golden oak (docs/SPORTS.md), re-expressed in two colours.
SPORT = {
    "oak_acorn":   ("#585018", "#b8b040"),   # olive cap, gold-green nut
    "oak_sapling": ("#584018", "#d0b828"),   # bark, butter-yellow leaf
    "great_oak":   ("#504018", "#d0b030"),
}


def pal3(id_):
    d, l = PAL[id_]
    return [d, l, WHITE]


def _frame_diff(frames):
    """Bounding box of every pixel that differs from frame 0 (for review)."""
    a0 = np.asarray(frames[0])
    m = np.zeros(a0.shape[:2], bool)
    for f in frames[1:]:
        m |= (np.asarray(f) != a0).any(-1)
    if not m.any():
        return None
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max(), ys.max()


def rim(s, region, body=(2,), tone=3, sides=((-1, 0), (0, -1))):
    """Crystal light rim: body pixels just inside the outline on the lit
    (top-left) side become white.  `region` limits it to one form."""
    t = s.t
    h, w = t.shape
    hit = []
    for y in range(h):
        for x in range(w):
            if t[y, x] not in body or not region[y, x]:
                continue
            for dx, dy in sides:
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and t[yy, xx] == 0:
                    hit.append((x, y))
                    break
    s.px(hit, tone)


def fourconnect(s, tones=(1, 3), body=(2,)):
    """Crystal clusters, not dotted lines: a rim or vein pixel that touches
    its own tone only diagonally gets a bridge pixel (on a body pixel), so
    every line is 4-connected and no pixel reads as an orphan."""
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
                        # bridge on the lit side for rims, the shadow side for veins
                        cands = [(x, yy), (xx, y)] if v == 3 else [(xx, y), (x, yy)]
                        for bx, by in cands:
                            if t[by, bx] in body:
                                t[by, bx] = v
                                s.protect[by, bx] = True
                                break
                        break


def crescent(mask, inset=2, thick=2, region=None):
    """A specular crescent: the top-left band of the mask, `inset` px in from
    the edge and `thick` px deep (Crystal's white shine on a glossy form)."""
    from scipy import ndimage
    shift = px.shift
    inner = ndimage.binary_erosion(mask, iterations=inset) if inset else mask
    out = inner & ~shift(inner, thick, thick)
    if region is not None:
        out &= region
    lab, k = ndimage.label(out)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        out = lab == (1 + int(np.argmax(sizes)))
    return out


def compose(base, other, moving):
    """Frame `other` inside the `moving` mask, frame `base` everywhere else, so
    only the moving part (and the pixels it uncovers) can ever differ."""
    a, b = np.asarray(base).copy(), np.asarray(other)
    a[moving] = b[moving]
    return Image.fromarray(a, "RGBA")


def grow(m, r):
    from scipy import ndimage
    return ndimage.binary_dilation(m, structure=np.ones((3, 3), bool), iterations=r)


# --------------------------------------------------------------------------- acorn

ACORN_TILT = -27
ACORN_PV = (31, 51)
ACORN_K = 0.9
ACORN_DX = 5          # whole body right so the centre of mass sits at x ~28


def _acorn_R(*pts):
    pv, k = ACORN_PV, ACORN_K
    r = rot([(pv[0] + (x - pv[0]) * k, pv[1] + (y - pv[1]) * k) for x, y in pts], ACORN_TILT, pv)
    return [(x + ACORN_DX, y) for x, y in r]


def acorn_front(lift=0.0, drop=0.0, wide=0.0, mask=False):
    """lift: degrees the cap tips up about its back hinge (the peek);
    drop: px the cap is slammed down (the snap); wide: brim flare on impact."""
    s = Sprite(56, 56, pal3("oak_acorn"))
    c = s.c
    R = _acorn_R
    k = ACORN_K
    nut = blob(c, R((30, 25), (20.5, 27.5), (17, 35), (18.5, 43), (24, 49), (29.5, 51.5),
                    (35, 49), (41, 43), (42.5, 35), (39, 27.5)))
    # the cap and its stalk move as one rigid piece about the hinge
    hinge, = R((44.5, 25.5))

    def C(*pts):
        pts = [(x, y + drop) for x, y in pts]
        return rot(R(*pts), lift, hinge)

    (cx, cy), = C((29.5, 24.0))
    (dx_, dy_), = C((29.5, 20.0))
    ang = ACORN_TILT + lift
    cap = (c.ellipse(cx, cy, (17.5 + wide) * k, 7.4 * k, ang)
           | c.ellipse(dx_, dy_, 13.0 * k, 7.8 * k, ang))
    st = C((30.5, 14), (31, 9), (35.5, 6.0), (41, 7.5))
    stalk = c.curve(st, 3.6, 2.6)
    # the inside of the cap: what you see under the brim when it tips up
    (ux, uy), = C((29.5, 25.5))
    under = c.ellipse(ux, uy, 15.5 * k, 5.0 * k, ang)
    s.add(nut, tones=(1, 2, 3), shade=(4, 3), close=2, cast=2)
    if lift > 0:
        s.add(under, tones=(0, 0, 0), flat=True)
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(0, 1, 3), shade=(2, 2), close=2)
    s.render()
    rim(s, nut & (c.Y < 46) & (c.X < 27))
    cap_scales(s, cap)
    # cap shine: a white sliver on the crown's lit shoulder (the gift)
    (gx, gy), = C((23.5, 17.5))
    gx, gy = int(round(gx)), int(round(gy))
    s.px([(gx - 1, gy + 2), (gx, gy + 1), (gx + 1, gy + 1), (gx + 1, gy), (gx + 2, gy), (gx + 3, gy),
          (gx + 3, gy - 1), (gx + 4, gy - 1), (gx + 5, gy - 1)], 3)
    # nut specular under the brim: a curved streak plus a dot
    (nx, ny), = R((22.5, 34))
    nx, ny = int(round(nx)), int(round(ny))
    s.px([(nx + 1, ny - 1), (nx + 2, ny - 1), (nx, ny), (nx + 1, ny), (nx, ny + 1), (nx, ny + 2),
          (nx - 1, ny + 2), (nx - 1, ny + 3), (nx - 1, ny + 4)], 3)
    s.px([(nx + 1, ny + 5)], 3)
    acorn_feet(s)
    fourconnect(s)
    s.clean()
    if mask:
        return s.image(), cap | stalk | (under if lift > 0 else c.empty())
    return s.image()


def acorn_feet(s):
    """Two pale radicle feet, hand-pixelled: the front one kicked forward,
    the back one braced.  Genuinely white plant tissue, so index 3."""
    s.t[51:, :] = -1
    s.rows(17, 50, [
        "...........000000000....",
        "..........03330.03330...",
        "........003330...03330..",
        "......0033330.....03330.",
        "...0033333300......0330.",
        "...0000000000......0000.",
    ])


def cap_rings(s, cap, centre, rx, ry, ang, n_rings, per_ring=10, lit=None, gap=0.34):
    """Acorn-cap scales as concentric rows around the stalk: each row is a
    run of scales; a scale is index 1 with a black lower lip, and on the lit
    side an index-2 top.  Reads as a cap at 1x without dot noise."""
    import math
    t = s.t
    a = math.radians(ang)
    ys, xs = np.nonzero(cap & (t == 1))
    for y, x in zip(ys, xs):
        dx, dy = x + 0.5 - centre[0], y + 0.5 - centre[1]
        u = dx * math.cos(a) + dy * math.sin(a)
        v = -dx * math.sin(a) + dy * math.cos(a)
        rho = math.hypot(u / rx, v / ry) * n_rings
        j = int(rho)
        f = rho - j
        th = (math.atan2(v / ry, u / rx) / (2 * math.pi)) * (per_ring + 2 * j) + 0.5 * (j % 2)
        g = th - math.floor(th)
        if j == 0:
            continue
        if f > 1 - gap and g > 0.2:
            t[y, x] = 0                      # the scale's lip, in shadow
        elif f < 0.45 and g > 0.25 and g < 0.85 and (lit is None or lit[y, x]):
            t[y, x] = 2                      # its lit top


def cap_scales(s, cap, step=4, dy=3, lit_tone=2):
    """Acorn-cap scales: staggered rows, each a 2px index-2 top over a black
    notch to its bottom-right.  Lit half only (the shadow half stays flat)."""
    ys, xs = np.nonzero(cap)
    y0, y1, x0, x1 = ys.min() + 2, ys.max() - 1, xs.min() + 1, xs.max() - 1
    cx = (x0 + x1) / 2
    for j, y in enumerate(range(y0, y1, dy)):
        off = (j % 2) * (step // 2)
        for x in range(x0 + off, x1, step):
            if not (cap[y, x] and cap[y, x + 1] and s.t[y, x] == 1 and s.t[y, x + 1] == 1):
                continue
            if lit_tone is not None and x + 0.5 * (y - y0) < cx + 4:
                s.px([(x, y), (x + 1, y)], lit_tone)
            if y + 1 < s.h and s.t[y + 1, x + 1] == 1:
                s.px([(x + 1, y + 1)], 0)


ACORN_INTRO = [  # (lift deg, drop px, flare)
    (0, 0, 0),       # 0 rest
    (9, 0, 0),       # 1 cap tipping up
    (20, 0, 0),      # 2 the peek: brim high, the dark gap under it
    (24, -1, 0),     # 3 the peek, craning a little higher
    (0, 1, 1),       # 4 SNAP: slammed 1px low, brim flared
]


def frames_from(render, poses, pad=2):
    """render(*pose) -> (image, moving-part mask).  Frame k keeps frame 0's
    pixels everywhere except near the moving part (in either pose)."""
    raw = [render(*p) for p in poses]
    f0, m0 = raw[0]
    out = [f0]
    for im, m in raw[1:]:
        out.append(compose(f0, im, grow(m0 | m, pad)))
    return out


def acorn_frames():
    return frames_from(lambda *p: acorn_front(*p, mask=True), ACORN_INTRO)


ACORN_ANIM = {
    # hold, tip, the peek (held, then craning higher), back down, SNAP, settle
    "intro": [[0, 10], [1, 4], [2, 8], [3, 14], [2, 5], [1, 3], [4, 6], [0, 1]],
    "idle": [[0, 150], [1, 8]],
}


def acorn_back():
    """From behind and above: the cap's crown fills the top, the stalk
    flicks toward the top-right (the foe), the nut drops out of frame."""
    s = Sprite(48, 48, pal3("oak_acorn"), crop_bottom=True)
    c = s.c
    tilt = 14
    pv = (24, 48)

    def R(*pts):
        return rot(pts, tilt, pv)

    nut = blob(c, R((24, 30), (7, 33), (4, 41), (6, 49), (42, 49), (44, 41), (41, 33)))
    (cx, cy), = R((23, 24))
    cap = c.ellipse(cx, cy, 22.5, 15.0, tilt)
    stalk = c.curve(R((25, 12), (25, 6), (29, 3.0), (34, 4.0)), 4.4, 3.0)
    s.add(nut, tones=(1, 2, 3), shade=(5, 3), cast=3)
    s.add(cap, tones=(0, 1, 3), shade=(3, 3), close=2)
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.render()
    s.paint(crescent(cap, 2, 2, (c.X + c.Y < 34) & (c.X + c.Y > 22)), 3, only=(1,))
    cap_scales(s, cap, step=5, dy=3)
    rim(s, nut & (c.X < 24))
    rim(s, cap & (c.X + c.Y < 40), body=(1,))
    fourconnect(s)
    s.clean()
    return s.image()


ACORN_ICON = [
    "................",
    "..........000...",
    "......0000110...",
    "....00111110....",
    "...0131211110...",
    "..013121212110..",
    "..011111111110..",
    "..00000000000...",
    "...0322222210...",
    "...0322222210...",
    "....032222110...",
    "....02222210....",
    ".....0222110....",
    "......00000.....",
    ".....0330330....",
    "......00.00.....",
]


# --------------------------------------------------------------------------- sapling

def leaf_vein(s, p0, p1, t0=0.16, t1=0.72, tone=1, on=(2,)):
    """A midrib from p0 toward p1, broken toward the lit tip."""
    for t in np.linspace(t0, t1, 28):
        x = int(p0[0] + (p1[0] - p0[0]) * t)
        y = int(p0[1] + (p1[1] - p0[1]) * t + 0.5)
        if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in on:
            s.px([(x, y)], tone)


SAP_LEAD_BASE = (31, 37)
SAP_REAR_BASE = (34, 31)


def sapling_front(aL=0.0, aR=0.0, mask=False):
    """aL: lead-leaf swing (deg, + = raised); aR: rear branch swing (deg,
    - = raised up and back).  Only the two branches move."""
    s = Sprite(56, 56, pal3("oak_sapling"))
    c = s.c
    roots = (c.curve([(31, 50), (26, 53.2), (18, 55.6)], 4.4, 2.4)
             | c.curve([(34, 50), (39, 53.5), (46, 55.6)], 4.0, 2.2))
    trunk = c.curve([(33, 55.6), (37, 44), (33.5, 31), (25, 21)], 7.4, 5.2)
    rb = SAP_REAR_BASE
    rp = rot([(34, 31), (39, 26), (42, 22)], aR, rb)
    rear_pet = c.curve(rp, 2.8, 2.2)
    rl0, rl1 = rot([(40, 24), (53, 9)], aR, rb)
    rear = lobed_leaf(c, rl0, rl1, 15, lobes=2, bend=1.0)
    lb = SAP_LEAD_BASE
    ll1, = rot([(3, 28)], aL, lb)
    lead = lobed_leaf(c, lb, ll1, 20, lobes=3, bend=-1.2)
    # a low back leaf on the trunk: green counter-mass behind (static)
    low = lobed_leaf(c, (37, 41), (52, 41), 11, lobes=2, bend=1.0)
    low_pet = c.curve([(35, 42), (38, 41.5)], 2.4)
    capc = (22.0, 16.5)
    cap = c.ellipse(capc[0], capc[1], 13.0, 6.0, -17) | c.ellipse(capc[0] + 1.0, capc[1] - 3.0, 9.5, 5.6, -17)
    stalk = c.curve([(capc[0] + 2.5, capc[1] - 7), (capc[0] + 3, capc[1] - 10),
                     (capc[0] + 7.5, capc[1] - 12), (capc[0] + 11.5, capc[1] - 11)], 3.4, 2.4)
    s.add(rear_pet, tones=(1, 1, 1), flat=True)
    s.add(rear, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(roots, tones=(1, 1, 1), flat=True)
    s.add(low, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(0, 1, 1), shade=(2, 2), close=2)
    s.add(lead, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.render()
    rim(s, cap & (c.Y < 15) & (c.X < 26), body=(1,))
    cap_scales(s, cap, step=4, dy=2, lit_tone=None)
    (gx, gy) = (13, 14)
    s.px([(gx, gy + 1), (gx + 1, gy), (gx + 2, gy), (gx + 3, gy - 1), (gx + 4, gy - 1), (gx + 5, gy - 2),
          (gx + 6, gy - 2)], 3)
    leaf_vein(s, lb, ll1)
    leaf_vein(s, rl0, rl1, 0.1, 0.6)
    rim(s, lead)
    rim(s, rear)
    rim(s, low)
    leaf_vein(s, (37, 41), (52, 41), 0.25, 0.7)
    fourconnect(s)
    s.clean()
    if mask:
        return s.image(), lead | rear | rear_pet
    return s.image()


SAP_INTRO = [  # (lead deg, rear deg)
    (0, 0),        # 0 rest
    (-9, 12),      # 1 coil: both arms dropped in
    (14, -14),     # 2 flex: both arms flung up
    (9, -9),       # 3 pump
    (-3, -6),      # 4 brace: the shield thrust out level, rear arm cocked
]
SAP_ANIM = {
    "intro": [[0, 6], [1, 10], [2, 10], [3, 4], [2, 4], [3, 4], [4, 12], [0, 1]],
    "idle": [[0, 130], [4, 8]],
}


def sapling_frames():
    return frames_from(lambda *p: sapling_front(*p, mask=True), SAP_INTRO)


# --------------------------------------------------------------------------- great oak

def clump(c, cx, cy, rx, ry, bumps=7, br=2.4, seed=0, jit=0.0):
    """A leafy clump: an ellipse with oak-lobe bumps round its upper half.
    `jit` rotates the bumps (the leaves shiver)."""
    m = c.ellipse(cx, cy, rx, ry)
    for k in range(bumps):
        a = np.pi + np.pi * (k + 0.5 + jit) / bumps + (0.15 if (k + seed) % 2 else -0.1)
        m |= c.circle(cx + np.cos(a) * (rx - br * 0.5), cy + np.sin(a) * (ry - br * 0.5), br)
    return m


OAK_CLUMPS = [  # back to front: the crown hunches over the foe (left)
    (38, 8, 12.5, 6.5), (50, 16.5, 4.5, 5.5), (21, 10, 12.5, 7.0),
    (7.5, 21, 7.5, 7.0), (40, 20, 10, 7.0), (23, 21, 14, 8.5),
    (9, 33, 9.0, 6.0), (29, 30, 10, 5.0), (45, 27, 6, 4.5),
]
CROWN_PV = (30, 34)


def oak_front(dy=0.0, sc=1.0, jit=0.0, mask=False):
    """dy: crown lift (px, - = up); sc: crown swell; jit: leaf shiver.
    Only the crown moves; trunk, boughs, roots and the acorn fist hold."""
    s = Sprite(56, 56, pal3("great_oak"))
    c = s.c
    trunk = (c.curve([(39, 55.6), (39, 46), (33, 34)], 12.0, 8.5)
             | c.curve([(34, 49), (27, 53.5), (18, 55.6)], 6.4, 2.6)
             | c.curve([(40, 49), (46, 53), (54, 55.6)], 6.0, 2.6)
             | c.curve([(35, 41), (26, 36), (16, 36), (9.5, 40.5)], 6.0, 3.6))
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    crown = c.empty()
    parts = []
    for i, (cx, cy, rx, ry) in enumerate(OAK_CLUMPS):
        cx = CROWN_PV[0] + (cx - 0.5 - CROWN_PV[0]) * sc
        cy = CROWN_PV[1] + (cy + 2 - CROWN_PV[1]) * sc + dy
        m = clump(c, cx, cy, rx * 0.93 * sc, ry * 0.93 * sc, bumps=int(rx * 0.75), seed=i,
                  jit=jit * (1 if i % 2 else -1))
        crown |= m
        s.add(m, tones=(1, 2, 2), shade=(3, 3), close=2,
              line="black" if i in (5, 6, 7) else "dark", cast=1)
        parts.append((len(s.parts) - 1, cy, ry))
    s.render()
    # white rims on the lit top-left of the front clumps
    for p, cy, ry in parts:
        vis = s.owner == p
        rim(s, vis & (c.Y < cy), body=(2,))
    # acorn fist hanging from the lead bough (cap = bark, nuts = leaf green, white glints)
    for ax, ay in [(9, 43), (14, 44)]:
        s.rows(ax - 3, ay - 1, ["..000..", ".01110.", "0111110", "0000000", "0322220", "0232220",
                                ".02220.", "..020..", "...0..."])
    # a leaf drifting down behind the trunk (motion cue)
    s.rows(48, 38, ["..00.", ".0320", "02220", "0220.", ".00.."])
    # bark grooves
    s.px([(36, 42), (36, 43), (35, 44), (35, 45), (35, 46), (34, 47), (40, 43), (40, 44),
          (39, 45), (39, 46), (39, 47), (38, 49), (38, 50), (38, 51)], 0)
    fourconnect(s)
    s.clean()
    if mask:
        return s.image(), crown
    return s.image()


OAK_INTRO = [  # (lift, swell, shiver)
    (0, 1.0, 0.0),      # 0 rest
    (-1, 1.0, 0.0),     # 1 inhale
    (-2, 1.03, 0.0),    # 2 heaved
    (-2, 1.03, 0.5),    # 3 shiver A
    (-2, 1.03, -0.5),   # 4 shiver B
    (1, 1.0, 0.0),      # 5 settle: the crown drops past rest
]
OAK_ANIM = {
    "intro": [[0, 6], [1, 6], [2, 8], [3, 4], [4, 4], [3, 4], [4, 4], [1, 6], [5, 6], [0, 1]],
    "idle": [[0, 140], [3, 6], [4, 6]],
}


def oak_frames():
    return frames_from(lambda *p: oak_front(*p, mask=True), OAK_INTRO)


SAPLING_ICON = [
    "................",
    ".....00000...00.",
    "...00113110.0320",
    "..01131111100320",
    ".011111111110210",
    ".00000001100100.",
    "..00000011110...",
    ".03332220110....",
    "032222222110....",
    "022222211110....",
    ".02222110110....",
    "..0000000110....",
    "........0110....",
    ".......011110...",
    "......01100110..",
    ".......00..00...",
]

OAK_ICON = [
    "................",
    "....0000000.....",
    "..00333322200...",
    ".0332222222220..",
    ".03222222222210.",
    "0332221222222110",
    "0222222211222110",
    "0222222211122110",
    "0122222111122110",
    ".011111111111110",
    "..0000111000000.",
    ".011111110......",
    "01110011100.....",
    "03220011110.....",
    ".020.01101110...",
    "..0..000.0000...",
]


def sapling_back():
    """From behind: the cap's crown, the lead leaf raised on the right
    (toward the foe), a far leaf low on the left; the trunk runs out of frame."""
    s = Sprite(48, 48, pal3("oak_sapling"), crop_bottom=True)
    c = s.c
    trunk = c.curve([(22, 48), (21, 38), (25, 26)], 9.0, 6.5)
    lead = lobed_leaf(c, (26, 31), (48, 15), 21, lobes=3)
    rear = lobed_leaf(c, (21, 36), (0, 32), 18, lobes=3)
    crest = lobed_leaf(c, (21, 18), (1, 4), 16, lobes=2)
    cap = c.ellipse(27, 15, 13.5, 9.5, 12)
    stalk = c.curve([(28, 7), (28.5, 3), (33, 1.5), (37, 2.5)], 3.8, 2.6)
    s.add(rear, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(crest, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(trunk, tones=(0, 1, 1), shade=(3, 0))
    s.add(lead, tones=(1, 2, 2), close=3, shade=(3, 3))
    s.add(stalk, tones=(1, 1, 1), flat=True)
    s.add(cap, tones=(0, 1, 1), shade=(3, 3), close=2)
    s.render()
    s.paint(crescent(cap, 1, 2, (c.X + c.Y < 36)), 3, only=(1,))
    cap_scales(s, cap, step=4, dy=3, lit_tone=None)
    for m, p0, p1 in ((lead, (26, 31), (48, 15)), (rear, (21, 36), (0, 32)), (crest, (21, 18), (1, 4))):
        rim(s, m)
        leaf_vein(s, p0, p1, 0.2, 0.75)
    fourconnect(s)
    s.clean()
    return s.image()


def oak_back():
    s = Sprite(48, 48, pal3("great_oak"), crop_bottom=True)
    c = s.c
    trunk = c.stroke([(20, 48), (21, 38)], 11, 9) | c.curve([(22, 40), (32, 36), (42, 37)], 5, 3.4)
    clumps = [(16, 7.5, 11, 7), (30, 9, 10, 7), (41, 15, 7, 6.5), (6, 16, 6, 6.5), (22, 17, 12, 7.5),
              (37, 22, 10, 7), (9, 26, 8, 6.5), (24, 27, 11, 6.5), (40, 31, 7, 5.5)]
    s.add(trunk, tones=(0, 1, 1), shade=(4, 0))
    idx = []
    for i, (cx, cy, rx, ry) in enumerate(clumps):
        s.add(clump(c, cx, cy, rx, ry, bumps=int(rx * 0.7), seed=i), tones=(1, 2, 2), shade=(3, 3), close=2,
              line="dark" if i % 3 else "black", cast=2)
        idx.append((len(s.parts) - 1, cy))
    s.render()
    for p, cy in idx:
        rim(s, (s.owner == p) & (c.Y < cy + 2))
    for ax, ay in [(41, 40), (45, 41)]:
        s.rows(ax - 2, ay - 1, ["..0..", ".010.", "01110", "00000", "03220", "02220", ".020.", "..0.."])
    fourconnect(s)
    s.clean()
    return s.image()


# --------------------------------------------------------------------------- write

NOTES = {
    "oak_acorn": "Intro: the cap tips up about its back hinge, a peek from under the brim (the dark cup "
                 "interior shows), cranes a little higher, then SNAPS down 1px past rest with the brim "
                 "flared. Only the cap and stalk move. Learned: the glossy cap shine and the nut specular "
                 "are where Crystal's shared white earns its keep; the pale radicle feet are genuinely "
                 "white tissue, so they take index 3 too.",
    "oak_sapling": "Intro: the two branches coil down, flex up, pump twice and brace (lead leaf thrust out "
                   "level like a shield). Trunk, cap and roots are pixel-identical. Learned: with the cap "
                   "brown in index 1 the sprite went dark; more leaf mass (a bigger lead leaf, a low back "
                   "leaf) keeps index 2 green as the body colour.",
    "great_oak": "Intro: the crown inhales, heaves up 2px and swells, the leaves shiver twice (the clump "
                 "lobes rotate), then it drops 1px past rest and settles. Trunk, boughs and the acorn fist "
                 "hold still. Learned: green-on-green works with ONE dark: the bark brown shades every "
                 "clump, black splits the front clumps, white rims their lit tops.",
}
SPORT_NOTE = (" Sport: 'Concordia' golden oak. Quercus robur 'Concordia' (Van Geert, Ghent, 1843): "
              "butter-yellow leaves, gold-green acorns (indexes 1-2 only).")


def _bbox(frames, pad=0):
    """Tight moving boxes: one per connected patch of changed pixels."""
    from scipy import ndimage
    a0 = np.asarray(frames[0])
    m = np.zeros(a0.shape[:2], bool)
    for f in frames[1:]:
        m |= (np.asarray(f) != a0).any(-1)
    m = grow(m, 1)
    out = []
    for y0 in range(0, 56, 4):               # 4-row bands: tight around the moving part
        band = m[y0:y0 + 4]
        lab, _ = ndimage.label(band)
        for ys, xs in ndimage.find_objects(lab):
            out.append((xs.start, y0 + ys.start, xs.stop, y0 + ys.stop))
    return out


def frames():
    icon, icon2 = akit.icon, akit.icon2
    sets = {
        "oak_acorn": (acorn_frames, acorn_back, ACORN_ICON, ACORN_ANIM),
        "oak_sapling": (sapling_frames, sapling_back, SAPLING_ICON, SAP_ANIM),
        "great_oak": (oak_frames, oak_back, OAK_ICON, OAK_ANIM),
    }
    out = {}
    for id_, (ff, bf, ic, anim) in sets.items():
        fr = ff()
        i1 = icon(ic, pal3(id_))
        out[id_] = dict(front=fr, back=[bf()], icon=[i1, icon2(i1)], anim=anim, moving=_bbox(fr))
    return out


def build():
    """Write the three base bundles; returns the error count."""
    errs = 0
    for id_, d in frames().items():
        d1, d2 = PAL[id_]
        s1, s2 = SPORT[id_]
        probs = write_species(id_, palette=[BLACK, d1, d2, WHITE], sport=[BLACK, s1, s2, WHITE],
                              front=d["front"], back=d["back"], icon=d["icon"], anim=d["anim"],
                              moving=d["moving"], notes=NOTES[id_] + SPORT_NOTE,
                              tool=TOOL)
        errs += sum(1 for lvl, _ in probs if lvl == "error")
    return errs


if __name__ == "__main__":
    n = build()
    for id_ in IDS:
        intro_strip(id_)
    print("review sheet:", review_sheet(IDS, out=HERE.parent / "review" / "crystal_oak.png"))
    sys.exit(1 if n else 0)
