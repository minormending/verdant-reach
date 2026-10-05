"""Crystal rule, monstera line: monstera_cutting -> monstera.

A redraw of tools/art/species_e/monstera.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). Monstera deliciosa: the split,
holed leaf (pinnatifid slits from the edge, holes along the midrib) held
up like a shield, and the aerial roots as legs.

  index 0  #181818  outline, the slits' depth, crevices             (shared)
  index 1  deep blue-green: roots, stem, the shadow side of each leaf, the
           holes (we look through them into shade, so they are never black
           discs: no eyes)
  index 2  leaf green: the blades, the cutting's cut face
  index 3  #f8f8f8  rims on the lit leaf edges, glints              (shared)

Poses (kept from the classic art):
  monstera_cutting  BRACED   a stout node braced on two root legs, the young
                             split leaf held up on its petiole like a shield.
  monstera          LOOMING  two great fenestrated leaves raised in a V, the
                             lead one hunched over the foe, root legs.

Entrance animations (only the leaves move):
  monstera_cutting  the shield leaf is still rolled; it unfurls, FANS OPEN
                    past rest with its splits gaping, and settles.
  monstera          both great leaves are folded narrow; they fan open, the
                    splits spread, they flare up past rest and settle.

No faces: the holes are elongated dark slots along the veins, placed
alternately on either side of the midrib and toward the base, never a
level pair (docs/CREATURES.md, faces).

Sports (docs/SPORTS.md): cutting = 'Aurea' (lime-gold); monstera = 'Thai
Constellation' (milky, cream-speckled green).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/monstera.py <out.png>   # preview sheet only
  $PY tools/art/crystal/build.py monstera       # write the base bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species  # noqa: E402
import _arte_draw as D  # noqa: E402

TOOL = "tools/art/crystal/monstera.py"
IDS = ["monstera_cutting", "monstera"]

PALS = {
    "monstera_cutting": ("#1c4c40", "#68b448"),
    "monstera": ("#184438", "#58a840"),
}
SPORTS = {
    "monstera_cutting": ("#485828", "#c0c840"),   # 'Aurea': olive / lime-gold
    "monstera": ("#405848", "#b0c8a0"),           # 'Thai Constellation': milky green
}


def palette(id_):
    d, l = PALS[id_]
    return [BLACK, d, l, WHITE]


def sport(id_):
    d, l = SPORTS[id_]
    return [BLACK, d, l, WHITE]


def mleaf(s, base, tip, width, n=(2, 2), depth=0.6, holes=0, lobe=0.5, slit=2.2, hole_r=1.5, fold=1.0):
    """A monstera leaf mask from the petiole sinus (base) to the tip, with
    n=(left, right) slits cut from the edge toward the midrib and `holes`
    slots between them. fold < 1 narrows it and closes the slits (a leaf
    still unfurling). Returns (blade mask, holes mask)."""
    base, tip = np.asarray(base, float), np.asarray(tip, float)
    ax = tip - base
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    w = width * fold

    def at(u, v):
        return tuple(base + ax * L * u + nx * v * w / 2)

    m, _ = s.leaf(at(-0.04, 0), tuple(tip), w, fat=0.42, power=0.5)
    for sd in (-1, 1):
        q = at(0.1, sd * lobe)
        m |= s.circle(q[0], q[1], w * 0.18)
    m &= ~s.poly([at(-0.25, 0), at(0.08, -0.1), at(0.08, 0.1)])
    whole = m.copy()
    sw = slit * max(0.0, min(1.0, (fold - 0.45) / 0.55)) * (1.0 + 0.4 * max(0.0, fold - 1.0))
    if sw > 0.6:
        for side, k in ((-1, n[0]), (1, n[1])):
            for j in range(k):
                u = 0.22 + 0.62 * (j + 0.5) / k
                e = at(u + 0.08, side * 1.2)
                i = at(u, side * max(0.42, 1 - depth))
                m &= ~s.curve([e, i], sw)
    hm = s.empty()
    if fold > 0.8:
        ang = math.atan2(ax[1], ax[0])
        for j in range(holes):
            u = 0.22 + 0.62 * (j + 0.5 + 0.5 * (j % 2)) / n[1] * 0.8
            q = at(u, 0.42 * (1 if j % 2 == 0 else -1))
            hm |= s.ellipse(q[0], q[1], hole_r * 1.9, hole_r * 0.8, ang + 0.5 * (1 if j % 2 else -1))
        hm &= D.erode(m, 1)
    lab, k = ndimage.label(m)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        m = lab == 1 + int(np.argmax(sizes))
    return m, hm, whole


def blade(s, base, tip, width, rimf=0.55, rib=1, mv=True, **kw):
    m, hm, whole = mleaf(s, base, tip, width, **kw)
    put = s.mpart if mv else s.part
    pid = put(m, base=2, k=2, sh=1, line=0)
    # the rim follows the uncut leaf edge, never the slits' sides (a row of
    # white-edged slits reads as teeth)
    s.rim2(whole, pid, rimf, rimf * 0.35)
    # the holes: dark slots with a black top lip (we look into shade)
    s.decal(hm, 1, on=pid)
    s.decal(hm & ~D.move(hm, 0, 1), 0, on=pid)
    if rib is not None:
        b, t = np.asarray(base, float), np.asarray(tip, float)
        path = [tuple(b + (t - b) * u) for u in np.linspace(0.06, 0.78, 30)]
        s.decal(s.line1(path) & D.erode(m, 1) & ~hm, rib, on=pid)
    return pid


def rot(p, deg, c):
    a = math.radians(deg)
    return (c[0] + (p[0] - c[0]) * math.cos(a) - (p[1] - c[1]) * math.sin(a),
            c[1] + (p[0] - c[0]) * math.sin(a) + (p[1] - c[1]) * math.cos(a))


# --------------------------------------------------------------- cutting ---

# (fold, rotation deg about the petiole top, length) per frame
CUT = [(1.0, 0, 1.0), (0.32, -10, 0.82), (0.7, -4, 0.94), (1.12, 5, 1.03)]


def front_cut(k=0):
    s = D.S(56, 56)
    fold, rt, ln = CUT[k]
    node = s.ellipse(35, 45, 10, 6.2, math.radians(-14))
    face = s.ellipse(44, 42.6, 3.2, 5.6, math.radians(-14))
    roots = (s.curve([(31, 48), (26, 51), (22, 54.6)], (4.4, 3.2))
             | s.curve([(38, 49), (41, 52), (43, 54.6)], (4.4, 3.2)))
    curl = s.curve([(30, 44), (22, 44), (17, 47), (15, 51)], (3.0, 2.2))
    furl, _ = s.leaf((38, 41), (47, 20), 7, bend=-0.08, fat=0.45, power=0.6)
    pet = s.curve([(33, 41), (31, 33), (27, 27)], (3.4, 2.8))
    pid = s.part(furl, base=2, k=2, sh=1, line=0)
    s.rim(furl, pid, 0.5)
    rp = s.part(roots, base=1, k=1, sh=0, line=0)
    s.rim(roots, rp, 0.5)
    pid = s.part(node, base=2, k=3, sh=1, line=0)
    s.rim2(node, pid, 0.45, 0.2)
    pid = s.part(face, base=2, k=1, sh=1, line=0)
    s.rim(face, pid, 0.6)
    s.part(curl, base=1, k=1, sh=0, line=0)
    s.part(pet, base=1, k=1, sh=0, line=0)
    b = (26.5, 28)
    t = rot((26.5 + (4 - 26.5) * ln, 28 + (10 - 28) * ln), rt, b)
    blade(s, b, t, 28, n=(2, 2), depth=0.58, fold=fold, rib=3, rimf=0.7)
    s.px([(10, 13), (11, 13), (11, 12)], 3) if k == 0 else None
    if k == 0:
        s.mark(s.rect(9, 11, 13, 15))
    return s


def back_cut():
    s = D.back_canvas()
    node = s.ellipse(20, 42, 17, 9.5, math.radians(-10))
    furl, _ = s.leaf((12, 38), (3, 12), 10, bend=0.08, fat=0.45, power=0.6)
    pet = s.curve([(22, 36), (24, 29), (27, 26)], (4.8, 4.2))
    pid = s.part(furl, base=2, k=2, sh=1, line=0)
    s.rim(furl, pid, 0.5)
    pid = s.part(node, base=2, k=3, sh=1, line=0)
    s.rim(node, pid, 0.4)
    s.part(pet, base=1, k=1, sh=0, line=0)
    blade(s, (26, 28), (47.6, 1), 38, n=(2, 2), depth=0.58, rib=3, mv=False, rimf=0.45)
    return s


ICON_CUT = [
    "...kkkkk........",
    "..k333332k......",
    ".k32222222k.....",
    "kkkk222222k.....",
    "k3222222222k....",
    "k22222kkkkk.....",
    "kkk222222221k...",
    ".k2222222211k...",
    "..k12222211k....",
    "...kkk11kk.kk...",
    "......k1kk22k...",
    "....kkk1k32222k.",
    "...k1111k22221k.",
    "....kk11k11111k.",
    "....k11k.k11kk..",
    "....kkk..kkk....",
]


# --------------------------------------------------------------- monstera --

# (fold, rotation deg, length) per frame
MON = [(1.0, 0, 1.0), (0.4, -6, 0.8), (0.75, -2, 0.92), (1.1, 6, 1.0), (1.04, 2, 1.0)]


def front_mon(k=0):
    s = D.S(56, 56)
    fold, rt, ln = MON[k]
    roots = (s.curve([(32, 42), (28, 48), (23, 54.6)], (4.0, 3.0))
             | s.curve([(37, 42), (42, 48), (46, 54.6)], (4.0, 3.0)))
    whip = s.curve([(30, 37), (21, 40), (14, 45), (11, 51)], (3.2, 2.2))
    trunk = s.curve([(35, 46), (37, 36), (34, 24)], (7.0, 5.5))
    b2 = (36, 23)
    t2 = rot((36 + 17 * ln, 23 - 22.4 * ln), rt, b2)
    blade(s, b2, t2, 26, n=(3, 3), depth=0.66, holes=2, hole_r=1.4, fold=fold, rimf=0.8, rib=3)
    rp = s.part(roots, base=1, k=1, sh=0, line=0)
    s.rim(roots, rp, 0.45)
    pid = s.part(trunk, base=2, k=3, sh=1, line=0)
    s.rim2(trunk, pid, 0.6, 0.3, sides="l")
    s.decal(s.line1([(36, 44), (37, 39), (36, 33)]), 1, on=pid)
    s.part(whip, base=1, k=1, sh=0, line=0)
    b1 = (32, 25)
    t1 = rot((32 - 31.4 * ln, 25 - 8 * ln), rt, b1)
    blade(s, b1, t1, 31, n=(3, 3), depth=0.66, holes=2, hole_r=1.6, fold=fold, rimf=0.95, rib=3)
    return s


def back_mon():
    s = D.back_canvas()
    trunk = s.curve([(20, 48), (19, 38), (23, 28)], (9.0, 8.0))
    roots = s.curve([(17, 40), (9, 44), (4, 49)], (4.6, 4.0)) | s.curve([(23, 41), (32, 44), (38, 49)], (4.6, 4.0))
    blade(s, (21, 26), (1, 1), 33, n=(3, 3), depth=0.6, holes=2, hole_r=1.5, rib=3, mv=False, rimf=0.5)
    s.part(roots, base=1, k=1, sh=0, line=0)
    pid = s.part(trunk, base=2, k=3, sh=1, line=0)
    s.rim(trunk, pid, 0.5, sides="l")
    blade(s, (23, 27), (47.6, 14), 36, n=(3, 3), depth=0.6, holes=2, hole_r=1.7, rib=3, mv=False, rimf=0.4)
    return s


ICON_MON = [
    "..kkkk....kkk...",
    ".k3333k..k333k..",
    "k322222k.k2222k.",
    "kkk22222k22kkkk.",
    "k3222222k22222k.",
    "k2222kkkkk22221k",
    "kkk222222k22kkkk",
    ".k2222221k22221k",
    "..k1222211k111k.",
    "...kk1k11kkkk...",
    "......k11k......",
    ".....k1k11k.....",
    "....k1kk1k1k....",
    "...k11k.k1kk1k..",
    "...kkk..kkk.k1k.",
    "............kk..",
]


# -------------------------------------------------------------- build ------

SPECS = {
    "monstera_cutting": dict(
        fn=front_cut, n=4, back=back_cut, icon=ICON_CUT, dx=4,
        anim={"intro": [[1, 14], [2, 5], [3, 16], [2, 4], [0, 3]], "idle": [[0, 150], [2, 8]]},
        notes="BRACED: a propagation cutting turned critter, the stout node braced on two aerial-root "
              "legs, the young split leaf held up on its petiole like a shield. Intro: the shield leaf "
              "is still rolled; it unfurls, FANS OPEN past rest with its splits gaping, and settles. "
              "Crystal rule: deep blue-green dark (roots, stem, leaf shade), leaf green light, white "
              "rims. Sport: Monstera deliciosa 'Aurea' (lime-gold)."),
    "monstera": dict(
        fn=front_mon, n=5, back=back_mon, icon=ICON_MON, dx=0,
        anim={"intro": [[1, 12], [2, 5], [3, 16], [4, 6], [0, 3]], "idle": [[0, 160], [4, 8]]},
        notes="LOOMING: two great fenestrated leaves raised in a V, the lead one hunched over the foe, "
              "a thick trunk on aerial-root legs, one root whipping forward. Intro: both leaves are "
              "folded narrow; they fan open, the splits spread, they flare up past rest and settle. "
              "Crystal rule: the holes are dark slots, alternating and toward the base (never a level "
              "pair: no face). Sport: Monstera deliciosa 'Thai Constellation' (milky green)."),
}


def render(id_):
    sp = SPECS[id_]
    fr = D.frames(sp["fn"], sp["n"], dx=sp["dx"])
    back = D.tones(sp["back"](), open_bottom=True)
    i0 = D.icon(sp["icon"])
    return fr, back, [i0, D.hop(i0)]


def build():
    for id_ in IDS:
        fr, back, ics = render(id_)
        write_species(id_, palette=palette(id_), sport=sport(id_), front=fr, back=[back], icon=ics,
                      anim=SPECS[id_]["anim"], moving=D.moving_boxes(fr), notes=SPECS[id_]["notes"], tool=TOOL)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/arte_monstera.png")
    items = []
    for id_ in IDS:
        fr, back, ics = render(id_)
        for i, f in enumerate(fr):
            st = D.stats(f)
            if i == 0 or not (0.05 <= st["white"] <= 0.2):
                print(id_, i, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in st.items()})
        items.append((id_, palette(id_), sport(id_), fr, back, ics))
    print(D.preview(items, out))
