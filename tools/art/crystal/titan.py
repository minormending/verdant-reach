"""Original Crystal-rule Amorphophallus titanum (titan arum): corpse_corm ->
corpse_leaf -> titan_arum.

corpse_corm (baby, BRACED): a huge round brown corm, half buried in a low
mound of soil, wider than it is tall, with root feet gripping the ground on
both sides. A dimple at its top ringed by root scars, and out of it one
stubby, mottled shoot: a thick pointed spike leaning toward the foe, its tip
hooked over like a horn. Intro: the corm pulses (it squashes, swells past its
rest size, holds, and settles); the soil stays put.
corpse_leaf (teen, LOOMING-lite): the titan arum's single giant leaf, a
little tree: a tall, thick stalk mottled with dark blotches and pale specks
rising in a C from the top of the corm, then splitting into three arms that
carry an umbrella of pointed leaflets; the lead arm reaches out low over the
foe, the rear leaflets sit in the dark slot behind. Intro: the leaf sways (the
umbrella winds back, swings over the foe, holds, rebounds and settles).
titan_arum (adult, LOOMING): a towering cream-yellow spadix rising in a C and
leaning over the foe, out of a huge frilled spathe whose open mouth shows its
deep maroon inner wall, ribbed into a pie-crust frill; outside, the spathe is
pale and ribbed. Intro: the spathe unfurls (wrapped tight round the spadix,
it opens, overshoots wide, holds, and settles). The spadix stays registered.
Two tones per stage: a maroon-brown dark slot (the corm's shade and skin
marks, the stalk's blotches, the spathe's inside) under a mid that turns
from olive (corm and leaf, the mottled green) to cream-yellow (the spadix,
and the spathe's pale outside). No third hue is needed.
Faces: the corm and the spathe carry no paired dark spots and no dark slit;
every skin mark is a stroke joined to the shade band or the outline, the
stalk's blotches always touch its edge (no enclosed dark dots), and the
spathe's ribs run out to the rim.
Sport: a pale form, an artistic interpretation (no pale titan arum is
known); see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): corpse_corm 8, corpse_leaf 8,
titan_arum 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, T, Spr, bez, hop, icon_arr, moving_boxes, rim_white, shift  # noqa: E402
from aspen import across, finish  # noqa: E402

TOOL = "tools/art/crystal/titan.py"
IDS = ["corpse_corm", "corpse_leaf", "titan_arum"]
PALS = {
    "corpse_corm": [BLACK, "#683828", "#b0a058", WHITE],
    "corpse_leaf": [BLACK, "#583020", "#88a840", WHITE],
    "titan_arum": [BLACK, "#701830", "#e0d080", WHITE],
}
# the pale form: an artistic interpretation (dusty mauve shade, pale mid)
SPORTS = {
    "corpse_corm": [BLACK, "#887080", "#d8d0b0", WHITE],
    "corpse_leaf": [BLACK, "#706078", "#c0d0a8", WHITE],
    "titan_arum": [BLACK, "#a87088", "#d8d0a0", WHITE],
}
ANIMS = {
    "corpse_corm": {"intro": [[0, 6], [1, 12], [2, 6], [3, 16], [4, 8], [0, 8]],
                    "idle": [[0, 140], [4, 10], [0, 6]]},
    "corpse_leaf": {"intro": [[0, 6], [1, 12], [2, 6], [3, 16], [4, 10], [0, 8]],
                    "idle": [[0, 130], [4, 10], [0, 6]]},
    "titan_arum": {"intro": [[1, 12], [2, 8], [3, 6], [4, 18], [5, 10], [0, 8]],
                   "idle": [[0, 150], [5, 10], [0, 6]]},
}


# ------------------------------------------------------------- shared -----

def mottled(s, ctrl, width, marks=(), specks=(), base=2, n=60, cap=True, line=0, white=None):
    """A thick stalk in the mid tone with a dark crescent down its shaded
    (right) side, mottled: `marks` are (distance along from the start, side,
    depth 0..1, length) dark-slot blotches that run in from an edge (side -1
    the lit edge, +1 the shaded edge), so none is an enclosed dark dot;
    `specks` are (distance along, across -1..1) 2px pale dashes. `white`
    (an across limit) lays a white light strip down the lit edge.
    Returns (part id, mask, path)."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=cap)
    pid = s.part(m, base=base, k=0, line=line)
    w0, w1 = (width if isinstance(width, tuple) else (width, width))
    hws = [(w0 + (w1 - w0) * i / (len(path) - 1)) / 2 for i in range(len(path))]
    u, a = across(s, m, path, hws)
    s.decal(m & (u > 0.45), 1, on=[pid])
    if white is not None:
        s.decal(m & (u < white) & (u > -1.4), 3, on=[pid])
    for at, side, depth, ln in marks:
        su = u * side
        blot = m & (np.abs(a - at) < ln / 2) & (su > 1.0 - 2.0 * depth)
        s.decal(blot, 1, on=[pid])
    for at, uu in specks:
        sp = m & (np.abs(a - at) < 1.0) & (np.abs(u - uu) < 0.3)
        s.decal(sp, 3, on=[pid])
    return pid, m, path


def soil(s, left, right, top, tone=1, lit=True, open_bottom=False):
    """A low mound of soil in the dark slot, its lit top edge a mid line."""
    m = s.poly([(left, 56.5), (left + 3, top + 2.0), (left + 9, top), (right - 9, top),
                (right - 3, top + 2.0), (right, 56.5)])
    pid = s.part(m, base=tone, k=0, line=0)
    if lit:
        top_edge = m & ~shift(m, 0, -1)
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        (lx,), = [s.T([(left + (right - left) * 0.55, 0)])[0][:1]]
        s.decal(shift(top_edge, 0, -1) & m & ~top_edge & (xx < lx), 2, on=[pid])
    return pid, m


def review_layout(art, pals, name):
    """Each species' front, back and icon at 3x in one row (plus 1x)."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    items = [(sid, art[sid], pals[sid]) for sid in art]
    for scale, fname in ((1, f"{name}_1x.png"), (3, f"{name}_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(items) * scale, 56 * scale), (200, 208, 200))
        for n, (sid, (fs, b, icons), pal) in enumerate(items):
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / fname)


def preview(art, pals, sports, path, k=4):
    """A scratch sheet: every front frame, the sport, the back and icons at k,
    with the stats printed (not written by build())."""
    from kit import to_rgba
    rows = []
    for sid, (fs, b, icons) in art.items():
        pal = pals[sid]
        ims = [to_rgba(f, pal) for f in fs] + [to_rgba(fs[0], sports[sid]), to_rgba(b, pal)] + \
              [to_rgba(i, pal) for i in icons]
        rows.append(ims)
        for n, f in enumerate(fs):
            op = (f != T).sum()
            ys, xs = np.nonzero(f != T)
            print(f"{sid} f{n}: {xs.max() - xs.min() + 1}x{ys.max() - ys.min() + 1} fill {op / f.size:.1%} "
                  f"white {(f == 3).sum() / op:.1%} comx {xs.mean():.1f} bottom {ys.max()}")
        op = (b != T).sum()
        print(f"{sid} back fill {op / b.size:.1%} white {(b == 3).sum() / op:.1%}; "
              f"icon white {(icons[0] == 3).sum() / (icons[0] != T).sum():.1%}")
    W = max(sum(im.shape[1] * k + 8 for im in r) for r in rows) + 8
    sheet = Image.new("RGB", (W, len(rows) * (56 * k + 8) + 8), (200, 208, 200))
    sheet1 = Image.new("RGB", (W // k + 8, len(rows) * 64 + 8), (200, 208, 200))
    for r, ims in enumerate(rows):
        x = 8
        x1 = 4
        for a in ims:
            im = Image.fromarray(a, "RGBA")
            sheet1.paste(im, (x1, 4 + r * 64 + 56 - im.height), im)
            x1 += im.width + 4
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, 8 + r * (56 * k + 8) + 56 * k - im.height), im)
            x += im.width + 8
    sheet.save(path)
    sheet1.save(str(path).replace(".png", "_1x.png"))
    return path


# --------------------------------------------------------- corpse_corm ----

CORM_SCALE = [1.0, 0.93, 1.04, 1.08, 1.02]     # the pulse per front frame


def corm_body(s, cx, cy, rx, ry, sc=1.0, marks=True):
    """The huge round corm: the mid tone on its lit upper-left, a broad dark
    shade over its lower right, a broken white rim on its lit top-left plus
    one glint arc, a dimple at the top, and skin marks: short curved dark
    strokes that grow out of the shade (never closed dots).
    Returns (pid, mask, (top x, top y))."""
    rx, ry = rx * sc, ry * (0.5 + 0.5 * sc)
    cy = cy - (sc - 1.0) * ry * 0.5
    m = s.ellipse(cx, cy, rx, ry)
    pid = s.part(m, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    u = ((xx + 0.5 - tcx) / rx) * 0.6 + ((yy + 0.5 - tcy) / ry) * 0.8
    s.decal(m & (u > 0.28), 1, on=[pid])
    if marks:
        # skin marks: curved mid strokes reaching into the shade, and dark
        # strokes reaching up-left out of it (each joined to the shade)
        for ang, ln in ((-8, 5.0), (24, 6.0), (56, 5.5), (88, 4.5)):
            a = math.radians(ang)
            p0 = (cx + rx * 0.62 * math.cos(a), cy + ry * 0.62 * math.sin(a))
            p1 = (p0[0] - 4.0 - ln * 0.3, p0[1] - ln * 0.55)
            s.decal(s.line1(bez([p0, ((p0[0] + p1[0]) / 2 + 0.8, (p0[1] + p1[1]) / 2 + 0.6), p1], 20)),
                    1, on=[pid])
    ang = np.degrees(np.arctan2((yy + 0.5 - tcy) / ry, (xx + 0.5 - tcx) / rx))
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    rim = edge & (((ang > -180) & (ang < -130)) | ((ang > -122) & (ang < -92)))
    s.decal(rim, 3, on=[pid])
    d = np.hypot((xx + 0.5 - tcx) / rx, (yy + 0.5 - tcy) / ry)
    s.decal(m & (d > 0.56) & (d < 0.74) & (ang > -164) & (ang < -132), 3, on=[pid])
    top = (cx - rx * 0.08, cy - ry * 0.84)
    dm = s.ellipse(top[0] + 1.5, top[1] + 0.6, rx * 0.30, ry * 0.15) & m
    s.decal(dm, 1, on=[pid])
    return pid, m, top


def corm_roots(s):
    """Root feet: short thick roots planted wide, running into the soil."""
    for ctrl, w in (([(14.5, 46.5), (11.5, 50.5)], (3.6, 2.6)),
                    ([(42.5, 46.5), (45.5, 50.5)], (3.4, 2.6))):
        m = s.stroke(bez(ctrl, 30), w, cap=True)
        s.part(m, base=2, k=1, line=0)


def corm_shoot(s, base):
    """The stubby mottled shoot: a thick pointed spike leaning toward the
    foe, its tip hooked over like a horn; big dark blotches and pale specks."""
    bx, by = base
    ctrl = [(bx + 1.5, by + 2.5), (bx, by - 3.5), (bx - 2.5, by - 8.5), (bx - 6.0, by - 12.0),
            (bx - 9.5, by - 13.0)]
    return mottled(s, ctrl, (8.6, 1.4), marks=[(3.0, 1, 0.9, 3.0), (7.5, -1, 0.75, 2.6), (11.5, 1, 0.85, 2.6),
                                                 (15, -1, 0.6, 1.8)],
                   specks=[(5.2, -0.3), (9.5, -0.05)], white=-0.6)


def corm(s, fr=0):
    sc = CORM_SCALE[fr]
    s.ox = 1.0
    corm_roots(s)
    pid, m, top = corm_body(s, 28.5, 41.0, 17.0, 11.5, sc)
    corm_shoot(s, top)
    sp, sm = soil(s, 9, 48, 50.0)
    s.decal(s.line1([(13, 53), (16, 52)]), 3, on=[sp])
    s.decal(s.line1([(36, 53), (38, 53)]), 3, on=[sp])
    s.decal(s.line1([(24, 54), (26, 54)]), 3, on=[sp])


# --------------------------------------------------------- corpse_leaf ----

LEAF_SWAY = [0.0, 3.5, -3.0, -4.5, 1.5]      # degrees: + = the umbrella winds back (right)
CANOPY_C = (24.5, 17.0)                      # the umbrella's hub (rest pose)


def leaflet(s, base, tip, w, tone=2, glint=True, bend=0.10, k=1):
    """One pointed leaflet in `tone`: a dark crescent, a dark midrib and a
    white rim on its lit edge (mid-tone leaflets only)."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.45)
    pid = s.part(m, base=tone, k=k if tone == 2 else 0, line=0, shadow=(1, 1))
    if tone == 2:
        s.decal(s.line1(path[12:-16]), 1, on=[pid])
        if glint:
            rim_white(s, m, pid, 0.4)
    return pid, m


def umbrella(s, hub, rx, ry, sway=0.0, tiers=((0.0, 9, 6.0, 1.0), (0.5, 5, 6.4, 0.6)), under=True,
             dip=0.18, top_only=False):
    """The umbrella of leaflets: a dark-slot underside (the shade under the
    canopy) with tiers of pointed leaflets radiating from the hub, drawn far
    side first; each tier is (phase, count, width, reach). The canopy dips
    toward the foe by `dip`. Returns the canopy mask."""
    hx, hy = hub
    union = np.zeros((s.h, s.w), bool)
    with s.rotated(sway, hx, hy + 12):
        if under:
            # the shade under the canopy: a skirt of dark-slot leaflets
            # hanging from the hub, their tips jagging the lower edge
            for k in range(7):
                t = math.pi * (0.06 + 0.88 * k / 6)
                ex = -math.cos(t)
                tip = (hx + rx * 0.86 * ex, hy + ry * 0.62 + abs(ex) * -ry * 0.1 - ex * dip * rx * 0.35)
                pid, m = leaflet(s, (hx + ex * rx * 0.2, hy + 1.0), tip, 6.5, tone=1)
                union |= m
        leaves = []
        for ph, n, w, reach in tiers:
            for k in range(n):
                t = math.pi + math.pi * (k + 0.5 + ph * 0.5) / n      # pi..2pi: left, up, right
                if top_only:
                    t = 2 * math.pi * (k + 0.5 + ph) / n
                ex = math.cos(t)
                ey = math.sin(t)
                lift = -ex * dip * rx * 0.4
                tip = (hx + rx * reach * ex, hy + ry * reach * ey * 0.9 + ry * 0.35 * (1 - abs(ey)) + lift)
                base = (hx + rx * 0.18 * ex, hy + ry * 0.12 * ey + 2.0)
                leaves.append((ey, base, tip, w))
        # far (upper) leaflets first, the low rim leaflets last (nearest)
        for ey, base, tip, w in sorted(leaves, key=lambda l: l[0]):
            pid, m = leaflet(s, base, tip, w, glint=math.dist(base, tip) > rx * 0.7)
            union |= m
    return union


def leaf_plant(s, fr=0):
    sway = LEAF_SWAY[fr]
    s.ox = 2.3
    # the corm at the foot, half buried
    m = s.ellipse(32.0, 50.5, 9.5, 5.5)
    pid = s.part(m, base=2, k=2, line=0)
    rim_white(s, m, pid, 0.25)
    soil(s, 17, 48, 52.0)
    hx, hy = CANOPY_C
    # the stalk: a thick mottled C rising from the corm, leaning to the foe
    ax = hx + 3.0 - sway * 0.35
    mottled(s, [(31.0, 49.0), (32.5, 43.0), (31.0, 36.0), (ax + 1.2, hy + 11.0), (ax, hy + 6.0)], (6.4, 4.2),
            marks=[(3, 1, 0.6, 2.4), (7, -1, 0.55, 2.0), (11, 1, 0.6, 2.6), (15, -1, 0.55, 2.0),
                   (19, 1, 0.6, 2.4), (23, -1, 0.5, 1.8)],
            specks=[(5, -0.1), (9.5, 0.2), (13.5, -0.2), (17.5, 0.1), (21.5, -0.1)],
            white=-0.6, cap=False)
    # the three arms fanning out under the canopy
    for ex, ey in ((-13.0, -1.0), (0.0, -6.0), (12.0, -2.0)):
        with s.rotated(sway, hx, hy + 12):
            p = bez([(ax, hy + 7.0), (ax + ex * 0.5, hy + 5.0 + ey * 0.4), (ax + ex, hy + 3.0 + ey * 0.5)], 20)
            mm = s.stroke(p, (2.6, 1.6), cap=True)
        s.part(mm, base=2, k=0, line=0)
    umbrella(s, (hx, hy), 25.0, 11.0, sway)


# ---------------------------------------------------------- titan_arum ----

# the spathe per front frame: (rim half-width, rim half-height)
SPATHE = [(24.5, 10.0), (16.5, 6.0), (20.0, 7.6), (25.8, 10.8), (25.4, 10.4), (23.6, 9.6)]
SPATHE_C = (28.0, 34.0)
SPATHE_TILT = -8.0                             # degrees: the mouth tips toward the foe
FRILLS = 11


def rim_pts(cx, cy, rx, ry, tilt, frills, amp, n=200, phase=0.0):
    """Points round the spathe's mouth: an ellipse tipped by `tilt`, its
    edge fluted into `frills` scallops of depth `amp` (the pie-crust frill)."""
    a = math.radians(tilt)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        wave = abs(math.sin(frills * t / 2 + phase)) ** 0.7 - 0.6
        x = (rx + amp * wave) * math.cos(t)
        y = (ry + amp * 0.8 * wave) * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def _rot(cx, cy, tilt):
    a = math.radians(tilt)
    ca, sa = math.cos(a), math.sin(a)
    return lambda x, y: (cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca)


def spadix(s, ctrl=((29.5, 46.0), (30.0, 33.0), (29.0, 21.0), (26.0, 11.5), (21.0, 4.8)), w0=12.0, w1=7.0):
    """The towering cream spadix, leaning over the foe in a C, with a rounded
    tip: the mid tone, a dark crescent down its shaded side, a white light
    strip down its lit side, and shallow wrinkles (short dark strokes in
    from the shaded edge)."""
    path = bez(list(ctrl), 80)

    def wf(t):
        return w0 - (w0 - w1) * t ** 1.5
    m = s.stroke(path, wf, cap=True)
    pid = s.part(m, base=2, k=0, line=0)
    hws = [wf(t) / 2 for t in np.linspace(0, 1, len(path))]
    u, a = across(s, m, path, hws)
    s.decal(m & (u > 0.36), 1, on=[pid])
    s.decal(m & (u < -0.40) & (u > -0.92) & (a > 12) & (a < 42), 3, on=[pid])
    for at in (16, 22, 28, 34, 40):
        s.decal(m & (np.abs(a - at) < 0.6) & (u > 0.0), 1, on=[pid])
    return pid, m


def row_u(m):
    """Per pixel of mask m: its position across its row's run, -1 at the
    left edge to +1 at the right edge."""
    u = np.zeros(m.shape)
    for y in range(m.shape[0]):
        xs = np.nonzero(m[y])[0]
        if len(xs):
            x0, x1 = xs.min(), xs.max()
            c, hw = (x0 + x1) / 2, max(0.5, (x1 - x0) / 2)
            u[y, xs] = (xs - c) / hw
    return u


def spathe_mouth(s, geo):
    """The maroon inner wall seen inside the mouth, fluted: black pleat
    seams run in from the far rim's frill valleys, and the frill crests on
    the lit far rim catch white. geo = (cx, cy, rx, ry, tilt)."""
    cx, cy, rx, ry, tilt = geo
    mouth = s.poly(rim_pts(cx, cy, rx, ry, tilt, FRILLS, 3.0))
    pid = s.part(mouth, base=1, k=0, line=0)
    R = _rot(cx, cy, tilt)
    for k in range(FRILLS):
        t = 2 * math.pi * k / FRILLS            # the valleys (wave minimum)
        if math.sin(t) > -0.2:
            continue
        p_out = R(cx + (rx + 1) * math.cos(t), cy + (ry + 1) * math.sin(t))
        p_in = R(cx + rx * 0.45 * math.cos(t), cy + ry * 0.45 * math.sin(t))
        s.decal(s.line1([p_out, p_in]), 0, on=[pid])
        if math.cos(t) < 0.3:
            # the pleat's lit flank: a short white stroke beside the seam
            q_out = R(cx + (rx - 1.0) * math.cos(t) - 1.4, cy + (ry - 1.0) * math.sin(t) + 0.6)
            q_in = R(cx + rx * 0.72 * math.cos(t) - 1.2, cy + ry * 0.72 * math.sin(t) + 0.4)
            s.decal(s.line1([q_out, q_in]) & ~s.line1([p_out, p_in]), 3, on=[pid])
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    edge = mouth & ~shift(mouth, 0, -1)
    inner = shift(edge, 0, -1) & mouth & ~edge
    lit = (xx + 0.5 < tcx + rx * 0.5) & (yy + 0.5 < tcy - ry * 0.25)
    s.decal((edge | inner) & lit, 3, on=[pid])
    return pid, mouth


def spathe_outside(s, geo, base_y=56.5, bw=None, ribs=True):
    """The pale outside below the near lip: a flaring bell (concave sides)
    narrowing to the ground, a dark crescent down its shaded right side,
    dark-slot ribs converging to the base and a lip whose crests catch
    white on the lit left."""
    cx, cy, rx, ry, tilt = geo
    lip = rim_pts(cx, cy, rx, ry, tilt, FRILLS, 3.0)
    near = [p for k, p in enumerate(lip) if math.sin(2 * math.pi * k / len(lip)) >= 0]
    near.sort(key=lambda p: p[0])
    bx = cx + 1.0
    bw = bw if bw is not None else 9.5 + rx * 0.12
    L, Rr = near[0], near[-1]
    mid_y = cy + ry + (base_y - cy - ry) * 0.45
    right = bez([Rr, (bx + bw * 0.75 + rx * 0.3, mid_y), (bx + bw, base_y)], 30)
    left = bez([(bx - bw, base_y), (bx - bw * 0.75 - rx * 0.3, mid_y), L], 30)
    body = near + right + left
    inner = s.poly(rim_pts(cx + 0.5, cy - 2.2, rx - 1.2, ry - 1.6, tilt, FRILLS, 3.0))
    bm = s.poly(body) & ~inner
    pid = s.part(bm, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    u = row_u(bm)
    s.decal(bm & (u > 0.52), 1, on=[pid])
    if ribs:
        R = _rot(cx, cy, tilt)
        for k in range(FRILLS):
            t = 2 * math.pi * k / FRILLS
            if math.sin(t) < 0.35:
                continue
            x0, y0 = R(cx + rx * math.cos(t), cy + ry * math.sin(t))
            x1 = bx + (x0 - bx) * 0.45
            s.decal(s.line1(bez([(x0, y0 + 2.0), ((x0 * 0.6 + x1 * 0.4), y0 + 5.5), (x1, base_y - 3)], 30)),
                    1, on=[pid])
    # white on the lit lip, broken into dashes (one per frill crest)
    top = bm & ~shift(bm, 0, -1)
    s.decal(top & (xx + 0.5 < tcx + rx * 0.2) & ((xx + 1) % 5 < 3), 3, on=[pid])
    s.decal(bm & (u < -0.62) & (u > -0.9) & (yy > tcy + ry + 3), 3, on=[pid])
    return pid, bm


def titan(s, fr=0):
    s.ox = 1.0
    rx, ry = SPATHE[fr]
    geo = (SPATHE_C[0], SPATHE_C[1], rx, ry, SPATHE_TILT)
    spathe_mouth(s, geo)
    spadix(s)
    spathe_outside(s, geo)


# ------------------------------------------------------------- frames -----

def front(sid, fr=0):
    s = Spr(56, 56, tuple(PALS[sid][1:]))
    {"corpse_corm": corm, "corpse_leaf": leaf_plant, "titan_arum": titan}[sid](s, fr)
    return finish(s)


def back(sid):
    """Behind and above, leaning to the top-right (the foe), cut off by the
    screen's bottom edge."""
    s = Spr(48, 48, tuple(PALS[sid][1:]))
    if sid == "corpse_corm":
        m = s.ellipse(23.0, 36.0, 23.5, 19.0)
        pid = s.part(m, base=2, k=0, line=0)
        yy, xx = np.mgrid[0:48, 0:48]
        u = ((xx + 0.5 - 23) / 23.5) * 0.55 + ((yy + 0.5 - 36) / 19.0) * 0.85
        s.decal(m & (u > 0.5), 1, on=[pid])
        rim_white(s, m, pid, 0.3)
        dm = s.ellipse(25.0, 24.0, 8.0, 3.5)
        s.decal(dm, 1, on=[pid])
        mottled(s, [(25.0, 25.0), (27.0, 17.0), (31.0, 10.0), (36.0, 6.0), (40.0, 6.0)], (8.0, 2.0),
                marks=[(4, 1, 0.5, 2.6), (9, -1, 0.45, 2.2), (14, 1, 0.5, 2.4), (19, -1, 0.45, 2.0)],
                specks=[(6.5, -0.2), (12, 0.1)], white=-0.55)
    elif sid == "corpse_leaf":
        mottled(s, [(22.0, 49.0), (22.5, 42.0), (24.0, 34.0)], (9.0, 7.5),
                marks=[(3, 1, 0.55, 2.6), (8, -1, 0.5, 2.2), (13, 1, 0.55, 2.6)],
                specks=[(5.5, -0.1), (10.5, 0.2)], white=-0.6, cap=False)
        # the umbrella from behind and above: leaflets all round the hub
        disc = s.ellipse(25.0, 21.0, 21.5, 16.5)
        s.part(disc, base=1, k=0, line=0)
        umbrella(s, (25.0, 20.0), 25.0, 19.5, 0.0, tiers=((0.0, 12, 7.5, 1.0), (0.5, 6, 7.0, 0.6)),
                 under=False, top_only=True)
    else:
        # from behind and above: looking down into the spathe's maroon mouth
        # past its pale near lip, the spadix leaning to the top-right
        geo = (23.5, 29.0, 23.0, 10.5, 9.0)
        spathe_mouth(s, geo)
        spadix(s, ctrl=((22.0, 44.0), (23.0, 31.0), (27.0, 17.0), (33.0, 7.0), (39.0, 1.5)), w0=12.0, w1=6.0)
        spathe_outside(s, geo, base_y=49.0, bw=16.0)
    return finish(s, open_bottom=True)


ICONS = {
    # the round corm in its soil, the mottled shoot hooked toward the foe
    "corpse_corm": [
        "....22..........",
        ".....21.........",
        ".....321........",
        "......321.......",
        "....33222221....",
        "...3222222211...",
        "..322222221111..",
        "..222222211111..",
        "..222222111111..",
        "...2221111111...",
        "..111111111111..",
    ],
    # the mottled stalk under its umbrella of leaflets, leaning left
    "corpse_leaf": [
        "....2..2.2......",
        "...232222221....",
        "..3222222222....",
        "..22222222111...",
        "...11121111.....",
        "......21........",
        "......12........",
        ".......21.......",
        ".......12.......",
        ".......21.......",
        "......2221......",
        "....11111111....",
    ],
    # the cream spadix leaning left out of the maroon frilled spathe
    "titan_arum": [
        "....322.........",
        "....3221........",
        ".....3221.......",
        ".....3221.......",
        "..311132211131..",
        "..111132211111..",
        "..322222222211..",
        "...2222222211...",
        "....22222211....",
        "....22222211....",
        "...2222222111...",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    nf = {"corpse_corm": len(CORM_SCALE), "corpse_leaf": len(LEAF_SWAY), "titan_arum": len(SPATHE)}
    for sid in IDS:
        fs = [front(sid, f) for f in range(nf[sid])]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


NOTES = {
    "corpse_corm": "BRACED: a huge round brown corm, half buried in a low mound of soil, wider than it "
                   "is tall, with root feet gripping the ground on both sides; one stubby, mottled shoot "
                   "rises from the dimple at its top, a thick pointed spike leaning toward the foe with "
                   "its tip hooked over like a horn. Gesture: the corm pulses (it squashes, swells past "
                   "its rest size, holds and settles); the soil stays fixed.",
    "corpse_leaf": "LOOMING-lite: the titan arum's single giant leaf, a little tree: a tall, thick, "
                   "mottled and speckled stalk rising in a C from the corm, splitting into arms that carry "
                   "an umbrella of pointed leaflets, the lead arm reaching out over the foe and the rear "
                   "leaflets in the dark slot behind. Gesture: the leaf sways (the umbrella winds back, "
                   "swings over the foe, holds, rebounds and settles); the corm and soil stay fixed.",
    "titan_arum": "LOOMING: a towering cream-yellow spadix rising in a C and leaning over the foe, out of "
                  "a huge frilled spathe whose open mouth shows its deep maroon, ribbed inner wall; "
                  "outside, the spathe is pale and ribbed. Gesture: the spathe unfurls (wrapped tight round "
                  "the spadix, it opens, overshoots wide, holds and settles); the spadix stays fixed.",
}


def build():
    from kit import intro_strip, write_species
    import flamelily
    art = render()
    # the lead's layout: every Chapter 11 creature (both lines) in one row
    fl = flamelily.render()
    review_layout({**art, **fl}, {**PALS, **flamelily.PALS}, "titan")
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PALS[sid], sport=SPORTS[sid], front=fs, back=[b], icon=icons,
                      anim=ANIMS[sid], moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Amorphophallus titanum. " + NOTES[sid] +
                      " A maroon-brown dark slot (the corm's shade and skin marks, the stalk's blotches, "
                      "the spathe's inside) under a mid that turns from olive (corm and leaf) to "
                      "cream-yellow (the spadix and the spathe's pale outside). Skin marks and blotches "
                      "always join an edge or the shade, never an enclosed dark dot. Sport: a pale form, "
                      "an artistic interpretation (no pale titan arum is known).",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Amorphophallus titanum, "
                      "https://en.wikipedia.org/wiki/Amorphophallus_titanum . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    import os
    preview(render(), PALS, SPORTS, os.environ.get("PREVIEW", "/tmp/titan_preview.png"))
