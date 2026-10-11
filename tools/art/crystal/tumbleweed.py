"""Original Crystal-rule Salsola tragus (prickly Russian thistle) as a
roaming legendary: tumbleweed.

tumbleweed (adult, single-stage legendary), LUNGING mid-roll: a big, airy
ball of dried, wiry, branching stems, sun-bleached straw tan, rolling at
the foe. The ball is an open lattice: the near stems arc over the front of
the ball in the light tone (lit top-left, russet on the shaded bottom-right),
the far stems show through the gaps in the dark slot, and the background
shows through between them, so it never reads as a solid blob. A few
spine-tipped sprigs bristle out of the silhouette (the leaves are tipped
with spines). A cloud of dust kicked up around its shaded foot trails off
behind it, and seeds scatter off behind it in an arc: the motion cue,
finishing the line of action.

Intro: it rolls in and bounces once, scattering seeds: the ball rolls in
from the right (the lattice turning anticlockwise, toward the foe), hops,
lands squashed in a burst of dust while more seeds fly off behind it,
rebounds and settles. The trailing seeds stay registered.
Two tones: a russet-brown dark slot (the far stems, the shaded side, the
seeds) under a straw-tan mid (the near stems, the dust); white is only the
sun on the lit stems and the tops of the dust cloud.
Faces: the stems are long strokes and the gaps are open background, never
small round holes in pairs; seeds are light-tone teardrops, not dark dots
(no_dots).
Sport: the young plant's green, red-striped colouring (the article records
green, red or striped stems and leaves); see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, T, Spr, back_frame, bez, hop, icon_arr, moving_boxes, shift  # noqa: E402,F401
from aspen import blunt, finish  # noqa: E402
from titan import preview  # noqa: E402

TOOL = "tools/art/crystal/tumbleweed.py"
SID = "tumbleweed"
PAL = [BLACK, "#985830", "#d8b870", WHITE]
# the young plant's colouring: green stems striped red
SPORT = [BLACK, "#a83838", "#a8c070", WHITE]

# per front frame: (roll angle in degrees, + = turned anticlockwise toward
# the foe; dx, dy of the ball; squash, < 1 = flattened; seeds in the air; dust)
ROLL = [
    (0.0, 0.0, 0.0, 1.00, 0, 0),
    (-62.0, 2.5, 0.0, 1.00, 0, 0),     # rolling in from the right
    (-30.0, 1.5, -4.0, 1.03, 1, 0),    # the hop, seeds flung off behind
    (-10.0, 1.0, 0.0, 0.90, 2, 1),     # lands squashed in a burst of dust
    (5.0, -1.0, -1.0, 1.02, 0, 0),     # rebound past the rest pose
]
ANIM = {"intro": [[1, 10], [2, 8], [3, 12], [4, 10], [0, 8]],
        "idle": [[0, 140], [4, 8], [0, 6]]}

CX, CY, R = 27.5, 31.5, 22.6           # the ball at rest (canvas coordinates, before s.ox)


# ------------------------------------------------------------ the ball -----

def _unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


# The lattice: circles on the ball's surface, as (normal (x, y, z), offset
# from the centre along it as a share of R, t0, t1 in degrees, width). Big
# circles are the main stems; small, offset ones are side branches.
STEMS = [
    ((-1.40, -1.20, -1.30), 0.00, 0, 360, 2.2),
    ((-0.62, 1.45, -1.60), 0.05, 0, 360, 2.1),
    ((0.94, 1.26, -0.36), 0.00, 0, 360, 2.0),
    ((-0.70, 0.47, 1.21), 0.15, 0, 360, 1.9),
    ((2.16, 0.89, 1.59), 0.50, 0, 360, 1.8),
    ((-0.45, -0.87, -1.72), 0.30, 0, 360, 1.7),
    ((-1.15, -0.36, 0.19), 0.45, 0, 360, 1.6),
    ((-1.31, 0.82, -0.10), 0.20, 0, 360, 1.6),
    ((-0.64, -0.77, 2.02), 0.35, 0, 360, 1.5),
]
# spine-tipped sprigs bristling out of the silhouette: (angle on screen in
# degrees, 0 = right, anticlockwise positive... measured in screen space,
# y down), length
SPRIGS = [(200.0, 4.5), (232.0, 4.0), (262.0, 4.5), (300.0, 3.5), (160.0, 4.0), (330.0, 3.0), (128.0, 3.5)]


def circle_pts(normal, off, t0, t1, n=140):
    nrm = _unit(normal)
    a = _unit(np.cross(nrm, [0.0, 0.0, 1.0]) if abs(nrm[2]) < 0.95 else np.cross(nrm, [1.0, 0.0, 0.0]))
    b = np.cross(nrm, a)
    r = math.sqrt(max(0.0, 1.0 - off * off))
    ts = np.radians(np.linspace(t0, t1, n))
    return [nrm * off + r * (a * math.cos(t) + b * math.sin(t)) for t in ts]


def project(p, roll, cx, cy, sq):
    """3-D unit-sphere point -> (x, y, depth) on screen; roll turns the ball
    about the axis pointing at the viewer (anticlockwise on screen)."""
    c, s_ = math.cos(math.radians(roll)), math.sin(math.radians(roll))
    x, y, z = p
    x, y = x * c + y * s_, -x * s_ + y * c
    return (cx + x * R * (2.0 - sq), cy + y * R * sq + R * (1.0 - sq), z)


def runs(pts, front):
    """Split a projected polyline into runs on the near (front=True) or far
    side of the ball."""
    out, cur = [], []
    for x, y, z in pts:
        if (z >= -0.05) == front:
            cur.append((x, y))
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [r for r in out if len(r) > 6]


def ball(s, roll=0.0, dx=0.0, dy=0.0, sq=1.0, thick=1.0, sprigs=SPRIGS):
    """The open lattice ball. Far stems first, thin, in the dark slot; then
    the near stems, deepest first, in the light tone with a russet crescent
    and russet on the shaded bottom-right of the ball, and the sun on the
    lit top-left stems."""
    cx, cy = CX + dx, CY + dy
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    diag = ((xx + 0.5 - tcx) + (yy + 0.5 - tcy)) / R          # -1.4 top-left .. +1.4 bottom-right
    pids = []
    projs = [[project(p, roll, cx, cy, sq) for p in circle_pts(nm, off, t0, t1)] + [None] * 0
             for nm, off, t0, t1, w in STEMS]
    for (nm, off, t0, t1, w), pts in zip(STEMS, projs):
        if w < 1.9:
            continue
        for run in runs(pts, False):
            m = s.stroke(run, w * 0.5 * thick, cap=True)
            pids.append(s.part(m, base=1, k=0, line=0))
    fronts = []
    for (nm, off, t0, t1, w), pts in zip(STEMS, projs):
        for run in runs(pts, True):
            fronts.append((np.mean([z for x, y, z in pts if z >= -0.05]), run, w))
    for k, (_, run, w) in enumerate(sorted(fronts, key=lambda f: f[0])):
        m = s.stroke(run, w * thick, cap=True)
        # side twigs forking off the stem toward its ends, alternating sides
        for i in range(8 + 6 * (k % 3), len(run) - 8, 19):
            (x0, y0), (x1, y1) = run[i - 3], run[i + 3]
            tl = math.hypot(x1 - x0, y1 - y0) or 1.0
            tx, ty = (x1 - x0) / tl, (y1 - y0) / tl
            side = 1 if (i // 19) % 2 else -1
            a = math.radians(38.0) * side
            ux, uy = tx * math.cos(a) - ty * math.sin(a), tx * math.sin(a) + ty * math.cos(a)
            bx, by = run[i]
            m |= s.stroke([(bx, by), (bx + ux * 4.2 * thick, by + uy * 4.2 * thick)], (1.5 * thick, 0.9), cap=True)
        pid = s.part(m, base=2, k=0, line=1)
        s.decal(m & ~shift(m, -1, -1) & (diag > 0.2), 1, on=[pid])
        s.decal(m & (diag > 0.95), 1, on=[pid])
        lit = m & (~shift(m, 0, -1) | ~shift(m, -1, 0)) & shift(m, 1, 1)
        s.decal(lit & (diag < 0.25), 3, on=[pid])
        pids.append(pid)
    # spine-tipped sprigs at the rim (they turn with the ball)
    for ang, ln in sprigs:
        a = math.radians(ang - roll)
        ex, ey = math.cos(a), math.sin(a)
        rx, ry = R * (2.0 - sq), R * sq
        bx, by = cx + ex * (rx - 2.0), cy + ey * (ry - 2.0) + R * (1.0 - sq)
        tx, ty = cx + ex * (rx + ln), cy + ey * (ry + ln) + R * (1.0 - sq)
        m = s.stroke([(bx, by), ((bx + tx) / 2 + ey * 0.6, (by + ty) / 2 - ex * 0.6), (tx, ty)], (1.8, 0.9), cap=True)
        pid = s.part(m, base=2 if (ex + ey) < 0.3 else 1, k=0, line=0)
        pids.append(pid)
    return pids


# ----------------------------------------------------------- the trail -----

SEEDS = [(47.0, 30.5, 30.0), (51.0, 24.5, 60.0), (53.0, 34.5, 10.0)]
SEEDS_AIR = [
    [],
    [(48.5, 17.0, 40.0), (53.0, 20.0, 70.0)],
    [(47.5, 11.0, 20.0), (52.5, 15.0, 50.0), (50.5, 40.0, 90.0)],
]


def seed(s, x, y, ang):
    """A winged seed: a little light-tone teardrop with a russet tail."""
    a = math.radians(ang)
    ex, ey = math.cos(a), math.sin(a)
    m = s.stroke([(x - ex * 1.2, y - ey * 1.2), (x + ex * 1.2, y + ey * 1.2)], (2.2, 1.4), cap=True)
    pid = s.part(m, base=2, k=1, line=0)
    return pid


def cloud(s, lobes):
    """A cloud of dust kicked up from the ground: round lobes merged into one
    shape (one outline), the light tone, russet along its underside, and the
    sun on the top of each lobe."""
    m = np.zeros((s.h, s.w), bool)
    for cx, cy, r in lobes:
        m |= s.ellipse(cx, cy, r, r * 0.8)
    pid = s.part(m, base=2, k=1, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    for cx, cy, r in lobes:
        (tx, ty), = s.T([(cx, cy)])
        d = np.hypot((xx + 0.5 - tx) / r, (yy + 0.5 - ty) / (r * 0.8))
        ang = np.degrees(np.arctan2(yy + 0.5 - ty, xx + 0.5 - tx))
        s.decal(m & (d > 0.45) & (d < 0.8) & (ang > -150) & (ang < -95), 3, on=[pid])
    return pid


def puff(s, cx, cy, r):
    return cloud(s, [(cx, cy, r), (cx - r * 0.75, cy + r * 0.25, r * 0.7), (cx + r * 0.8, cy + r * 0.3, r * 0.6)])


def trail(s, air=0, dust=0):
    """The seeds flung off behind the ball in an arc (more in the air while
    it hops)."""
    for x, y, a in SEEDS:
        seed(s, x, y, a)
    for x, y, a in SEEDS_AIR[air]:
        seed(s, x, y, a)


def tumbleweed(s, fr=0):
    roll, dx, dy, sq, air, dust = ROLL[fr]
    s.ox = 1.0
    trail(s, air, dust)
    ball(s, roll, dx, dy, sq)
    # the dust it rolls through, in front of its shaded foot
    g = dust * 0.8
    cloud(s, [(38.0, 52.0, 3.6 + g * 0.5), (43.5, 51.0, 4.2 + g), (49.0, 49.5, 3.4 + g * 0.5), (53.0, 46.0, 2.2)])


# ------------------------------------------------------------- frames -----

def front(fr=0):
    s = Spr(56, 56, tuple(PAL[1:]))
    tumbleweed(s, fr)
    return finish(s)


def back():
    """Behind and above, close: the ball rolling away toward the top-right
    (the foe), its lattice filling the frame and cut by the bottom edge,
    with a seed and a puff of dust kicked up behind it on the left."""
    return finish(back_draw(), open_bottom=True)


def back_draw():
    s = Spr(48, 48, tuple(PAL[1:]), sc=1.0)
    global CX, CY, R
    old = (CX, CY, R)
    try:
        CX, CY, R = 25.0, 31.0, 21.5
        ball(s, 140.0, 0.0, 0.0, 1.0, thick=1.3, sprigs=[(a, l * 0.5) for a, l in SPRIGS])
        puff(s, 5.0, 45.5, 3.6)
        seed(s, 3.0, 36.0, 60.0)
    finally:
        CX, CY, R = old
    return s


# the lattice ball rolling left, a spine at its front, two seeds and a puff
# of dust behind it
ICON = [
    "....33222.......",
    "..332.2.222.....",
    ".32.2..2.2.2....",
    ".3.2.22.2..12...",
    "32.22..2.2.1.2..",
    "2.2..2.22.1..1..",
    "2..2.2.2.21.21..",
    "22.2..2.21.1.1..",
    "2.2.22.2.1.1.1..",
    ".2.2..21.1.11...",
    ".21.21.11.11..2.",
    "..1.1.1.11.1.232",
    "...11111111.2222",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows + ["." * 16])


def render():
    fs = [front(f) for f in range(len(ROLL))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


NOTES = ("Crystal rule. Salsola tragus. LUNGING mid-roll: a big, airy ball of dried, wiry, branching "
         "stems, sun-bleached straw tan, rolling at the foe. An open lattice: the near stems arc over the "
         "ball in the light tone (lit top-left, russet on the shaded side), the far stems show through "
         "the gaps in the dark slot, and the background shows between them; spine-tipped sprigs bristle "
         "from the rim. A cloud of dust trails off behind its foot and seeds scatter behind it (the motion "
         "cue). "
         "Gesture: it rolls in and bounces once, scattering seeds (the lattice turns anticlockwise toward "
         "the foe, hops, lands squashed in a burst of dust, rebounds and settles); the trailing seeds "
         "stay fixed. A russet-brown dark slot under a straw-tan mid. Sport: the young plant's "
         "green, red-striped colouring.")


WANDERERS = ["tumbleweed", "coconut", "burr"]


def wanderers_layout():
    """The lead's layout for the Three Wanderers: each species' front, back
    and icon at 3x in one row (and at 1x), read from the written bundles
    (tools/art/review/wanderers_lead_layout.png, wanderers_1x.png)."""
    from PIL import Image
    from kit import REVIEW_DIR, SPECIES_DIR, load_species
    ids = [i for i in WANDERERS if (SPECIES_DIR / i / "species.json").exists()]
    REVIEW_DIR.mkdir(exist_ok=True)
    for scale, fname in ((1, "wanderers_1x.png"), (3, "wanderers_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(ids) * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(ids):
            imgs = load_species(sid)[1]
            for x, arr in ((0, imgs["front"][0]), (56, imgs["back"][0]), (104, imgs["icon"][0])):
                im = Image.fromarray(arr, "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(REVIEW_DIR / fname)


def build():
    from kit import intro_strip, write_species
    fs, b, icons = render()
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL, notes=NOTES,
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Salsola tragus, "
                  "https://en.wikipedia.org/wiki/Salsola_tragus . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)
    wanderers_layout()


if __name__ == "__main__":
    import os
    preview({SID: render()}, {SID: PAL}, {SID: SPORT}, os.environ.get("PREVIEW", "/tmp/tumbleweed_preview.png"))
