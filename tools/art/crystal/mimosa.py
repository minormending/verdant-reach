"""Original Crystal-rule Mimosa pudica (the sensitive plant): mimosa_sprout -> sensitive_plant.

mimosa_sprout (teen size class, stage 1 of 2), BRACED: a small pink shoot
planted in a low mound of earth, curving toward the foe. Its leaves are
feathery and bipinnate: each petiole ends in a fan of pinnae, every pinna a
green rachis combed with rows of tiny leaflets. The big lead leaf is raised
across the front like a shield, a smaller rear leaf is swept up behind, a
closed pink flower bud tops the shoot, and one low leaf is caught folding
shut (its leaflets pressed together, its petiole drooping).
sensitive_plant (adult), REARING: a sprawling plant whose prickly pink stems
arch up from a low tangle of leaves at its base, one stem rising high at the
foe with the biggest fluffy pink pom-pom flower head; two smaller pom-poms
ride lower stems. Feathery leaves spread wide on both sides, some open and
some folded shut.

Intro: the leaflets fold shut in a wave: the lead leaf snaps shut first (its
pinnae closing up together, its petiole drooping), then the next leaf and
the next toward the rear, each reopening as the wave passes on, until the
whole plant is open again. Stems, the mound, buds and pom-poms stay
registered.
Two tones: fresh leaf green in the dark slot (the leaflets, rachises and
shade) and pom-pom pink as the mid tone (the stems, petioles, buds and
flower heads); white is a shine down each lit rachis, the stems' shine and
the pom-poms' anther tips. The bud's cup of bracts and the mound share the
green dark slot.
Faces: the leaflets are stripes whose black splits run out to the
pinna's toothed edge, and the pom-poms' dark marks are radial filament
gaps that open to the rim; no enclosed dark dots anywhere (no_dots).
Sport: a white pom-pom form, an artistic interpretation (the Mimosa pudica
reference describes pale pink or purple heads, no white form); see
docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): sprout 7, sensitive_plant 7.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, Spr, bez, erode, hop, icon_arr, moving_boxes
from aspen import finish

TOOL = "tools/art/crystal/mimosa.py"
IDS = ["mimosa_sprout", "sensitive_plant"]
PAL = [BLACK, "#48a040", "#f0a0c8", WHITE]
SPORT = [BLACK, "#589858", "#e8e0d8", WHITE]
PALS = {sid: PAL for sid in IDS}
# per front frame, how open each leaf is (1 open .. 0 shut): a wave from
# the lead leaf (left) to the rear ones, a hold shut, then reopening
WAVE = [
    {"lead": 1.0, "head": 1.0, "rear": 1.0, "far": 1.0, "front": 1.0},
    {"lead": 0.0, "head": 0.6, "rear": 1.0, "far": 1.0, "front": 0.6},
    {"lead": 0.5, "head": 0.0, "rear": 0.6, "far": 0.6, "front": 0.0},
    {"lead": 0.7, "head": 0.3, "rear": 0.0, "far": 0.0, "front": 0.4},
    {"lead": 1.0, "head": 0.8, "rear": 0.6, "far": 0.5, "front": 0.8},
]
ANIM = {"intro": [[0, 8], [1, 8], [2, 8], [3, 14], [4, 10], [0, 8]],
        "idle": [[0, 130], [1, 8], [0, 6]]}


# ------------------------------------------------------------- parts ------

def rot(dx, dy, deg):
    c, s_ = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return dx * c - dy * s_, dx * s_ + dy * c


def pinna(s, base, ang, length, opn=1.0, leaf=3.9, period=2.5, slant=1.0, glint=True):
    """One feathery pinna, drawn pixel by pixel: a green rachis from `base`
    at `ang` degrees, combed on both sides by rows of tiny leaflets. The
    leaflets are stripes slanting forward from the rachis; between them the
    black outline runs in, so the margin reads as fine teeth. `opn` 1
    spreads the leaflets wide; toward 0 they fold forward and shut against
    the rachis (a slim stick). A lit pinna's rachis catches a white shine.
    Returns (part id, mask, tip)."""
    (bx, by), (tx, ty) = s.T([base, (base[0] + math.cos(math.radians(ang)) * length,
                                     base[1] + math.sin(math.radians(ang)) * length)])
    L = math.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / L, (ty - by) / L
    nx, ny = -uy, ux
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    px, py = xx + 0.5 - bx, yy + 0.5 - by
    a = px * ux + py * uy                       # along the rachis
    c = px * nx + py * ny                       # across it
    t = a / L
    hw = leaf * (0.3 + 0.7 * opn) * np.clip(t / 0.18 + 0.3, 0, 1) * (1.0 - 0.6 * np.clip(t, 0, 1) ** 2)
    rach = (t >= -0.02) & (t <= 1.0) & (np.abs(c) < 0.62)
    sl = slant * (0.4 + 0.6 * opn) + 1.6 * (1 - opn)
    wave = np.cos(2 * math.pi * (a - np.abs(c) * sl) / period)
    stripe = wave > 0.0
    env = (t >= 0) & (t <= 1.02) & (np.abs(c) <= hw * (0.45 + 0.55 * np.clip(wave, 0, 1) ** 0.5) + 0.15)
    m = (env & (stripe | (np.abs(c) < 1.1))) | rach
    pid = s.part(m, base=1, k=0, line=0)
    if glint and (ux * 0.6 + uy * 0.8) < 0.55:
        # open, the rachis shines along most of its length; shut, the folded
        # leaflets' pressed edge shines along the middle
        lo, hi = (0.1, 0.82) if opn > 0.5 else (0.2, 0.75)
        s.decal(rach & (t > lo) & (t < hi), 3, on=[pid])
    return pid, m, (tx, ty)


def leaf_fan(s, node, end, angs, length, opn=1.0, droop=18.0, petiole=1.3, glint=True):
    """A bipinnate leaf: a pink petiole from the stem `node` to `end`, then a
    fan of pinnae at `angs`. Shut, the petiole droops by `droop` degrees
    about the node and the pinnae fold up into slim sticks."""
    nx, ny = node
    ex, ey = end
    d = (1.0 - opn) * droop * (1 if ex >= nx else -1)
    ex, ey = (nx + rot(ex - nx, ey - ny, d)[0], ny + rot(ex - nx, ey - ny, d)[1])
    mean = math.degrees(math.atan2(sum(math.sin(math.radians(a)) for a in angs),
                                   sum(math.cos(math.radians(a)) for a in angs)))
    for a in angs:
        # shut, the pinnae close up together as well as their leaflets
        off = (a - mean + 180) % 360 - 180
        a = mean + off * (0.3 + 0.7 * opn)
        pinna(s, (ex, ey), a + d * 1.2, length * (0.85 + 0.15 * opn), opn, glint=glint)
    m = s.stroke(bez([(nx, ny), ((nx + ex) / 2, (ny + ey) / 2 - 0.8), (ex, ey)], 30), petiole, cap=True)
    s.part(m, base=2, k=0, line=0)


def stem(s, ctrl, width, shine=True, prickles=(), n=60):
    """A pink stem with a white shine down its lit side and small prickles
    (short black-outlined spurs) along it."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=True)
    for at in prickles:
        x, y = path[int(at * (n - 1))]
        a, b = path[max(0, int(at * (n - 1)) - 2)], path[min(n - 1, int(at * (n - 1)) + 2)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1
        side = 1 if int(at * 100) % 2 else -1
        nx_, ny_ = -ty / L * side, tx / L * side
        w = (width[0] if isinstance(width, tuple) else width) / 2
        m |= s.poly([(x - tx / L * 0.8 + nx_ * w * 0.6, y - ty / L * 0.8 + ny_ * w * 0.6),
                     (x + tx / L * 0.8 + nx_ * w * 0.6, y + ty / L * 0.8 + ny_ * w * 0.6),
                     (x + nx_ * (w + 1.6) - tx / L * 0.6, y + ny_ * (w + 1.6) - ty / L * 0.6)])
    pid = s.part(m, base=2, k=0, line=0)
    w0 = width[0] if isinstance(width, tuple) else width
    if shine and w0 >= 2.3:
        lit = [(x - w0 * 0.22, y) for x, y in path[int(n * 0.12):int(n * 0.6)]]
        s.decal(s.line1(lit), 3, on=[pid])
    return pid, path


def pompom(s, cx, cy, r, n=None, a0=0.3):
    """A fluffy flower head: a ball of pink stamens whose silhouette is a
    starburst, one point per bundle of filaments. Thin radial splits part
    the bundles around the rim (black in the shade, stopping short of a
    solid pink heart), and the anthers at the lit bundles' tips are white
    (short white rays on the top-left); no dark mark is enclosed."""
    n = n or max(9, round(1.9 * r + 1))
    pts = []
    for i in range(2 * n):
        a = a0 + i * math.pi / n
        rr = r if i % 2 == 0 else r * 0.62
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    dx = xx + 0.5 - tcx
    dy = yy + 0.5 - tcy
    rad = np.hypot(dx, dy)
    ph = ((np.arctan2(dy, dx) - a0) / (2 * math.pi / n)) % 1.0   # 0 at a point, 0.5 at a notch
    lit = (dx * 0.6 + dy * 0.8) / r
    gap = (np.abs(ph - 0.5) < 0.16) & (rad > r * 0.4)
    s.decal(m & gap & (lit > -0.35), 0, on=[pid])
    order = sorted(range(n), key=lambda i: math.cos(a0 + 2 * math.pi * i / n) * 0.6
                   + math.sin(a0 + 2 * math.pi * i / n) * 0.8)
    for k, i in enumerate(order[:max(2, round(n * 0.5))]):
        a = a0 + 2 * math.pi * i / n
        r0 = r * (0.6 if k % 2 == 0 else 0.74) if r < 6 else r * (0.7 if k % 2 == 0 else 0.8)
        s.decal(s.line1([(cx + 0.5 + r0 * math.cos(a), cy + 0.5 + r0 * math.sin(a)),
                         (cx + 0.5 + r * 0.9 * math.cos(a), cy + 0.5 + r * 0.9 * math.sin(a))]), 3, on=[pid])
    return pid


def bud(s, cx, cy, r):
    """A closed flower head in bud: a knobbly pink ball of unopened florets
    (a bumpy rim, short black seams running in from the shaded rim), a
    green cup of bracts under it, and a white glint inside its lit top-left."""
    n = max(8, round(1.7 * r + 2))
    pts = []
    for i in range(2 * n):
        a = 0.4 + i * math.pi / n
        rr = r if i % 2 == 0 else r * 0.84
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    m = s.poly(pts)
    pid = s.part(m, base=2, k=0, line=0)
    cup = s.ellipse(cx + r * 0.25, cy + r * 0.85, r * 0.6, r * 0.38) & ~s.ellipse(cx, cy, r * 0.75, r * 0.75)
    s.part(cup, base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (tcx, tcy), = s.T([(cx, cy)])
    dx, dy = xx + 0.5 - tcx, yy + 0.5 - tcy
    rad = np.hypot(dx, dy)
    ph = ((np.arctan2(dy, dx) - 0.4) / (2 * math.pi / n)) % 1.0
    lit = (dx * 0.6 + dy * 0.8) / r
    s.decal(m & (np.abs(ph - 0.5) < 0.12) & (rad > r * 0.55) & (lit > 0.25), 0, on=[pid])
    s.decal(m & erode_ring(m) & (lit < -0.35), 3, on=[pid])
    return pid


def erode_ring(m):
    """The pixels one in from the edge of m."""
    e = erode(m, 1)
    return e & ~erode(e, 1)


# ------------------------------------------------------------ sprout ------

def soil(s, left, right, top=51.5):
    """A low mound of earth under the feet, in the dark slot."""
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 5, top + 2.5), (left + 9, top + 1.5)]), 3, on=[pid])
    return pid


def sprout(s, fr=0):
    w = WAVE[fr]
    s.ox = 1
    soil(s, 11, 48)
    # the rear leaf, swept up behind the shoot
    leaf_fan(s, (31, 31), (37, 26), [-82, -40, -5], 13.0, w["rear"])
    # the low leaf, caught folding shut, drooping to the right
    leaf_fan(s, (32, 43), (38, 44), [5, 32, 60], 13.0, 0.2, droop=10)
    # the shoot, a C leaning at the foe, planted in the mound
    stem(s, [(31.5, 53), (33, 44), (31, 34), (27, 26), (23.5, 20)], (3.6, 2.3), prickles=(0.35, 0.58))
    # the head leaf at the top of the shoot, fanned up behind the bud
    leaf_fan(s, (27, 26), (30, 19), [-118, -78, -40], 12.0, w["head"])
    bud(s, 21.5, 17.0, 3.8)
    # the big lead leaf, raised across the front like a shield
    leaf_fan(s, (31, 40), (21, 36), [-112, -150, 172, 135], 14.0, w["lead"], petiole=1.8)


# ------------------------------------------------------------- adult ------

def adult(s, fr=0):
    w = WAVE[fr]
    s.ox = 0.6
    # the far leaves behind everything: up at the back and out to the right
    leaf_fan(s, (38, 42), (43, 37), [-95, -55, -18, 15], 12.5, w["far"])
    leaf_fan(s, (31, 36), (33, 30), [-120, -80, -42], 12.0, w["rear"])
    # the right stem, with its small pom-pom
    stem(s, [(33, 53), (38, 47), (42, 40), (44, 33)], (2.4, 1.8), prickles=(0.45, 0.75))
    pompom(s, 45.0, 28.0, 4.8)
    # low leaves sprawling on the ground: shut at the right
    leaf_fan(s, (37, 51), (42, 51), [-10, 22], 11.0, 0.15, droop=6)
    # the main stem rearing up at the foe, the big pom-pom on top
    stem(s, [(30, 54), (30, 45), (26, 36), (21, 28), (17, 22)], (3.0, 2.0), prickles=(0.25, 0.45, 0.65))
    leaf_fan(s, (23, 31), (26, 26), [-92, -48, -10], 11.0, w["head"])
    pompom(s, 14.5, 14.0, 7.4)
    # a third, small pom-pom on a short stalk at the left
    stem(s, [(26, 39), (19, 38), (12, 35)], 1.5, shine=False)
    pompom(s, 9.0, 33.0, 4.2)
    # a leaf spread in front of the stems at the right
    leaf_fan(s, (32, 47), (36, 45), [-40, -8, 25], 11.0, w["front"])
    # the low lead leaves: one folded shut on the ground, one spread open at the foe
    leaf_fan(s, (29, 50), (24, 51), [178, -150], 12.0, 0.15, droop=6)
    leaf_fan(s, (29, 44), (24, 43), [-150, 175, 145, 118], 13.0, w["lead"], petiole=1.6)


# ------------------------------------------------------------- frames -----

def front(sid, fr=0):
    s = Spr(56, 56, tuple(PAL[1:]), sc=1.0 if sid == IDS[0] else 1.08)
    (sprout if sid == IDS[0] else adult)(s, fr)
    return finish(s)


def back(sid):
    """Behind and above: the plant leaning toward the foe (the top-right),
    its feathery leaves fanned out flat and seen from above, the bud or the
    pom-poms held up at the top-right, the base cut off by the bottom edge."""
    s = Spr(48, 48, tuple(PAL[1:]), sc=1.12)
    if sid == IDS[0]:
        leaf_fan(s, (25, 30), (31, 27), [-62, -28, 5, 38], 15.0, 1.0, petiole=2.4)
        leaf_fan(s, (24, 40), (30, 42), [-10, 20, 50], 16.0, 1.0, petiole=2.4)
        leaf_fan(s, (20, 44), (12, 46), [175, -155], 15.0, 0.2, petiole=2.4)
        stem(s, [(21, 50), (22, 40), (26, 30), (31, 20)], (5.0, 3.6), prickles=(0.4, 0.65))
        leaf_fan(s, (27, 25), (25, 17), [-150, -112, -75], 14.0, 1.0, petiole=2.2)
        leaf_fan(s, (22, 38), (14, 35), [-150, -178, 152, 125], 17.0, 1.0, petiole=2.6)
        bud(s, 33.0, 15.0, 5.0)
    else:
        leaf_fan(s, (24, 40), (34, 40), [-40, -8, 25, 55], 16.0, 1.0, petiole=2.4)
        leaf_fan(s, (24, 32), (31, 30), [-70, -30], 14.0, 0.15, petiole=2.2)
        leaf_fan(s, (22, 30), (19, 22), [-150, -110, -72], 14.0, 0.15, petiole=2.2)
        stem(s, [(20, 50), (22, 38), (28, 26), (34, 18)], (5.0, 3.6), prickles=(0.4,))
        leaf_fan(s, (20, 42), (10, 40), [-150, -178, 150, 122], 16.0, 1.0, petiole=2.6)
        stem(s, [(22, 36), (14, 28), (10, 22)], 2.0, shine=False)
        pompom(s, 9.0, 18.0, 6.0)
        pompom(s, 36.0, 13.0, 10.0)
    return finish(s, open_bottom=True)


ICONS = {
    # a pink shoot on its mound, a knobbly bud on top, a feathery leaf
    # raised at the left, another swept up behind
    "mimosa_sprout": [
        ".....22.........",
        "....2332..1.1...",
        "....2222.11111..",
        ".1.1.22.1.1.1...",
        "1111..2..1131...",
        ".1311.2.....1...",
        "11111.2.........",
        ".1.1.22.........",
        "......22........",
        "......2..1.1....",
        "......22.1131...",
        ".......2..1.1...",
        "...1111211111...",
        "..113111111111..",
    ],
    # a big fluffy pom-pom at the top left, feathery leaves, pink stems,
    # a small pom-pom at the right
    "sensitive_plant": [
        "..2.2.2.........",
        ".2333222........",
        "2232222222......",
        ".22222222....2.2",
        "2222222.2...2332",
        ".2.2.2..2..22222",
        "......2.1.1.222.",
        ".1.1...2111.12..",
        "11311.12.1.11...",
        ".1111..2..1131..",
        "1.1.1.22.11111..",
        "..1311.2...1.1..",
        ".11111.22.1.1...",
        "1.1.1.2..2......",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    for sid in IDS:
        fs = [front(sid, f) for f in range(len(WAVE))]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


NOTES = {
    "mimosa_sprout": "BRACED: a small pink shoot planted in a low mound, curving toward the foe; "
                     "feathery bipinnate leaves (a fan of pinnae combed with rows of tiny leaflets) with "
                     "the big lead leaf raised like a shield, a closed pink bud on top, and one low leaf "
                     "caught folding shut, its petiole drooping. Gesture: the leaflets fold shut in a wave "
                     "running from the lead leaf to the rear, each leaf reopening as it passes; the shoot, "
                     "mound and bud stay fixed.",
    "sensitive_plant": "REARING: a sprawling plant, prickly pink stems arching up from a low tangle of "
                       "leaves, one rising high at the foe with the biggest fluffy pink pom-pom flower "
                       "head, two smaller pom-poms on lower stems; feathery leaves spread wide, some open "
                       "and some folded shut. Gesture: the leaflets fold shut in a wave running from the "
                       "lead leaf to the rear, each leaf reopening as it passes; stems and pom-poms stay "
                       "fixed.",
}


def build():
    from kit import intro_strip, write_species
    import prayer
    art = render()
    review_layout(art, extra=prayer.layout_items())
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Mimosa pudica. " + NOTES[sid] +
                      " Fresh leaf green in the dark slot (leaflets, rachises), pom-pom pink as the mid "
                      "tone (stems, petioles, buds, flower heads). Sport: a white pom-pom form, an "
                      "artistic interpretation (no white form is described in the reference).",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Mimosa pudica, "
                      "https://en.wikipedia.org/wiki/Mimosa_pudica . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


def review_layout(art, extra=()):
    """The lead's layout: each species' front, back and icon at 3x in one
    row (tools/art/review/fold_lead_layout.png), plus a 1x copy."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    items = [(sid, art[sid], PALS[sid]) for sid in IDS] + list(extra)
    for scale, fname in ((1, "fold_1x.png"), (3, "fold_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(items) * scale, 56 * scale), (200, 208, 200))
        for n, (sid, (fs, b, icons), pal) in enumerate(items):
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / fname)


if __name__ == "__main__":
    build()
