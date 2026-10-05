"""Crystal rule, lotus line: lotus_seed -> sacred_lotus.

A redraw of tools/art/species_e/lotus.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). Nelumbo nucifera: the seed-head pod
pitted with holes (a shower head on a stalk), the water-shedding leaf held
up as a shield, plump lotus-root feet, and the pink cup of the flower.

  index 0  #181818  outline, crevices, the cup leaf's inner lip    (shared)
  index 1  deep teal: the leaves, stalks and seed holes, and the shadow
           side of the pink forms (the second hue in the dark slot, as the
           pilot flytrap did)
  index 2  lotus pink: petals, the pod's flank, the lotus-root feet
  index 3  #f8f8f8  the pod's pale face, the water beads, rims    (shared)

Poses (kept from the classic art):
  lotus_seed    REARING  the seed pod rears on a C stalk from lotus-root
                         feet, its pitted face tilted at the foe; a cupped
                         leaf raised as a shield, the last petal a cape.
  sacred_lotus  REARING  the pink cup of petals leans over the foe on a tall
                         C stalk, the pod in its heart; a big cupped leaf
                         held as a shield, a second leaf high behind.

Entrance animations:
  lotus_seed    the shield leaf tips forward, a water bead rolls off its lip,
                falls and splashes; the leaf springs back.
  sacred_lotus  the flower is a shut bud; it swells, the petals FLARE open
                past rest round the glinting pod, and settle.

Sports (docs/SPORTS.md): lotus_seed = 'Chawan Basu' (white tipped blush
pink); sacred_lotus = 'Alba Grandiflora' (the great white lotus).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/lotus.py <out.png>   # preview sheet only
  $PY tools/art/crystal/build.py lotus       # write the base bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species  # noqa: E402
import _arte_draw as D  # noqa: E402

TOOL = "tools/art/crystal/lotus.py"
IDS = ["lotus_seed", "sacred_lotus"]

PALS = {
    "lotus_seed": ("#285858", "#e87898"),
    "sacred_lotus": ("#285058", "#f070a0"),
}
SPORTS = {
    "lotus_seed": ("#406050", "#f0b8c0"),      # 'Chawan Basu': blush
    "sacred_lotus": ("#486858", "#d0d0c0"),    # 'Alba Grandiflora': white
}


def palette(id_):
    d, l = PALS[id_]
    return [BLACK, d, l, WHITE]


def sport(id_):
    d, l = SPORTS[id_]
    return [BLACK, d, l, WHITE]


def R(pts, deg, cx, cy):
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s_, cy + (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def root_seg(s, x0, y0, x1, y1, w, bold=True):
    """One plump lotus-root segment: pink, teal underside, white rim. A foot."""
    ang = math.atan2(y1 - y0, x1 - x0)
    m = s.ellipse((x0 + x1) / 2, (y0 + y1) / 2, abs(x1 - x0) / 2 + 0.5, w / 2, ang)
    pid = s.part(m, base=2, k=2, sh=1, line=0)
    if bold:
        s.rim2(m, pid, 0.5, 0.18, sides="tl")
    else:
        s.rim(m, pid, 0.5, sides="t")
    return pid


def stalk(s, pts, w, rim=True, mv=False):
    m = s.curve(pts, w)
    pid = (s.mpart if mv else s.part)(m, base=1, k=0, line=0)
    if rim:
        s.rim(m, pid, 0.6, sides="l")
    return pid


def leaf_cup(s, cx, cy, rx, ry, tilt, bead=True, big=False, mv=False):
    """A lotus leaf held up like a shield: a shallow funnel seen from the
    side, teal with a white lit rim and a black inner lip; a water bead in it."""
    put = s.mpart if mv else s.part
    t = math.radians(tilt)
    m = s.ellipse(cx, cy, rx, ry, t)
    pid = put(m, base=1, k=1, sh=0, line=0)
    s.rim2(m, pid, 0.6, 0.22)
    inner = s.ellipse(cx + 0.5, cy - ry * 0.25, rx * 0.78, ry * 0.5, t)
    lip = inner & ~D.shift(inner, 0, 1)
    s.decal(lip & D.erode(m, 1), 0, on=pid)
    if bead:
        # the bead sits ON the rim, breaking the silhouette (a bead in the
        # middle of the dark disc reads as an eye)
        x = s._c(int(round(cx - rx * 0.3)), 0)[0]
        ys = np.nonzero(m[:, x])[0]
        y = int(ys.min())
        pts = [(x, y - 2), (x + 1, y - 2), (x, y - 1)]
        if big:
            pts += [(x - 1, y - 1), (x - 1, y - 2), (x, y - 3)]
        s.pxc(pts, 3)
        s.pxc([(x + 1, y - 1)], 1)
        if mv:
            s.mark(D.Base.rect(s, x - 3, y - 5, x + 4, y + 1))
    return m


def drop(s, x, y, kind="drop"):
    """A falling water bead (outlined), or a splash."""
    if kind == "drop":
        s.rows(x - 1, y - 1, [".k.", "k3k", "k3k", ".k."])
    elif kind == "splash":
        s.rows(x - 3, y - 1, ["k.....k", "3k.k.k3", "k.k3k.k"])
    s.mark(s.rect(x - 4, y - 2, x + 5, y + 4))


def pod(s, cx, cy, rx, ry, depth, tilt, holes=7, top=3, side=2, big=True, mv=False, tk=1):
    """The receptacle: a flat-topped cone, its pale face tilted at the foe and
    pitted with seed holes on a ring and centre (never two level: no face)."""
    put = s.mpart if mv else s.part
    pts = R([(cx - rx, cy), (cx - rx * 0.55, cy + depth * 0.7), (cx + 1.0, cy + depth),
             (cx + rx * 0.6, cy + depth * 0.7), (cx + rx, cy)], tilt, cx, cy)
    body = s.blob(pts)
    bp = put(body, base=side, k=2, sh=1, line=0)
    s.rim(body, bp, 0.3, sides="l")
    topm = s.ellipse(cx, cy, rx, ry, math.radians(tilt))
    tp = put(topm, base=top, k=tk, sh=2, line=0)
    ring = [(0.0, 0.0)] + [(math.cos(a) * 0.62, math.sin(a) * 0.55) for a in np.radians([15, 75, 140, 200, 255, 320])]
    for u, v in ring[:holes]:
        hx, hy = R([(cx + u * rx, cy + v * ry)], tilt, cx, cy)[0]
        x, y = int(round(hx - 0.5)), int(round(hy - 0.5))
        s.px([(x, y)] + ([(x + 1, y)] if big else []), 1 if big else 0)


# ------------------------------------------------------------------ seed ---

# (cup tilt offset deg, bead in cup?, drop (x, y, kind) or None) per frame
SEED = [(0, True, None), (-14, False, (3, 33, "drop")), (6, False, (3, 40, "drop")),
        (2, False, (4, 50, "splash"))]


def front_seed(k=0):
    s = D.S(56, 56)
    tl, bead, dr = SEED[k]
    pet, _ = s.leaf((28, 20), (44, 9), 13, bend=-0.08, fat=0.45, power=0.55)    # the last petal: a cape
    pid = s.part(pet, base=2, k=2, sh=1, line=0)
    s.rim(pet, pid, 0.5)
    stalk(s, [(27, 48), (34, 39), (32, 28), (24, 21)], (4.2, 3.4))
    root_seg(s, 26, 50.4, 45, 52, 8.4)
    root_seg(s, 7, 51.6, 27, 50.4, 9.0)
    # the shield leaf: tips forward (and springs back) on its stalk
    lx, ly = R([(10.5, 32)], tl * 0.6, 25, 48)[0]
    stalk(s, [(25, 48), (18, 42), ((13 + lx) / 2, (34 + ly) / 2 + 1), (lx + 2, ly + 2)], (3.0, 2.6), rim=False, mv=True)
    leaf_cup(s, lx, ly, 10.5, 5.0, -20 + tl, bead=bead, big=True, mv=True)
    pod(s, 18, 14, 12, 5.2, 12.5, -22, big=False)
    s.px([(10, 14), (11, 13)], 3)
    if dr:
        drop(s, *dr)
    return s


def back_seed():
    s = D.back_canvas()
    pet, _ = s.leaf((24, 18), (4, 3), 16, bend=0.08, fat=0.45, power=0.55)
    pid = s.part(pet, base=2, k=2, sh=1, line=0)
    s.rim(pet, pid, 0.5)
    stalk(s, [(22, 44), (16, 34), (20, 24), (28, 18)], (5.0, 4.4))
    stalk(s, [(24, 44), (32, 40), (36, 35)], (3.0, 2.6), rim=False)
    leaf_cup(s, 36, 34, 12, 6.0, 12, big=True)
    root_seg(s, 0, 44.5, 24, 43.5, 13, bold=False)
    root_seg(s, 23, 43.5, 48, 45, 13, bold=False)
    pod(s, 30, 14, 13, 6.5, 15, 16, tk=5)
    return s


ICON_SEED = [
    "................",
    "..kkkkkk...kk...",
    ".k333333k.k22k..",
    "k31313133k2221k.",
    "k333333332221k..",
    "k22333332221k...",
    ".k1222221kkk....",
    "..kk1111k.......",
    ".kk.kk1k........",
    "k31kk11k........",
    "k111k1k.........",
    ".kk.k1k.........",
    "..kkk11kkkk.....",
    ".k3222k32222k...",
    ".k2111k21111k...",
    "..kkkk.kkkkk....",
]


# ----------------------------------------------------------- sacred lotus --

LOTUS_OPEN = [1.0, 0.0, 0.55, 1.28, 1.1]


def front_lotus(k=0):
    s = D.S(56, 56)
    op = LOTUS_OPEN[k]
    stalk(s, [(34, 49), (42, 42), (46, 32)], (3.0, 2.6), rim=False)
    leaf_cup(s, 43.5, 28.5, 9.5, 4.4, 18, bead=False)                      # rear leaf, high
    stalk(s, [(30, 49), (38, 39), (36, 27), (28, 20)], (4.2, 3.4))
    root_seg(s, 27, 50.5, 46, 52.4, 8.0)
    root_seg(s, 8, 52.2, 28, 50.6, 9.0)
    stalk(s, [(26, 49), (20, 45), (15, 38)], (3.2, 2.8), rim=False)
    leaf_cup(s, 13, 35, 10.5, 5.2, -16, big=True)                          # lead leaf: the shield
    # the flower: a cup of pointed petals leaning at the foe, the pod in its heart
    cx, cy, tilt = 25, 18, -16
    if op <= 0.05:
        m, path = s.leaf((cx + 1, cy + 4), R([(cx, cy - 15)], tilt, cx, cy)[0], 13, fat=0.4, power=0.7)
        pid = s.mpart(m, base=2, k=3, sh=1, line=0)
        s.rim(m, pid, 0.5)
        for dx in (-3, 3):
            q = R([(cx + dx * 0.6, cy + 3), (cx + dx * 0.35, cy - 9)], tilt, cx, cy)
            s.decal(s.line1(q) & D.erode(m, 1), 1, on=pid)
    else:
        L = 0.62 + 0.38 * min(op, 1.0) + 0.06 * max(0.0, op - 1.0)
        sp = 0.45 + 0.55 * op

        def petal(a, ln, w, base=3.0, rim=False):
            a = -90 + (a + 90) * sp
            r = math.radians(a)
            p1 = R([(cx + math.cos(r) * ln * L, cy + math.sin(r) * ln * L)], tilt, cx, cy)[0]
            m, _ = s.leaf((cx, cy + base), p1, w, fat=0.42, power=0.6)
            pid = s.mpart(m, base=2, k=2, sh=1, line=0)
            s.rim(m, pid, 0.45 if rim else 0.25)

        for a, ln, w in ((-92, 19, 11), (-58, 18, 10), (-126, 18, 10)):
            petal(a, ln, w, rim=True)
        if op >= 0.4:
            px_, py_ = R([(cx, cy - 2)], tilt, cx, cy)[0]
            pod(s, px_, py_, 7.5 * min(1.0, op), 3.2, 5, tilt, big=False, mv=True)
        for a, ln, w in ((-18, 18, 10), (-166, 20, 11), (-38, 13, 9), (-142, 14, 9)):
            petal(a, ln, w, base=5.0, rim=a == -166)
        g = R([(cx - 12 * L, cy - 2)], tilt, cx, cy)[0]
        s.px([(int(g[0]), int(g[1])), (int(g[0]) + 1, int(g[1]))], 3)
    # a bead rolling off the shield leaf (the motion cue)
    s.rows(3, 40, ["_k_", "k3k", "k3k", "_k_"])
    return s


def back_lotus():
    s = D.back_canvas()
    stalk(s, [(18, 44), (12, 38), (9, 32)], (3.0, 2.6), rim=False)
    leaf_cup(s, 10, 31, 11, 6, -10)
    stalk(s, [(20, 44), (13, 33), (17, 22), (27, 17)], (4.6, 4.0))
    root_seg(s, 0, 44.5, 24, 43.5, 13)
    root_seg(s, 23, 43.5, 48, 45.5, 13)
    cx, cy = 29, 19
    for a, L, w in ((-80, 21, 14), (-40, 22, 14), (-120, 21, 13), (-5, 22, 14), (-160, 20, 13),
                    (30, 20, 14), (150, 18, 13), (70, 18, 15), (105, 18, 14)):
        r = math.radians(a + 12)
        m, _ = s.leaf((cx, cy), (cx + math.cos(r) * L, cy + math.sin(r) * L * 0.85), w, fat=0.42, power=0.6)
        pid = s.part(m, base=2, k=2, sh=1, line=0)
        if a in (-120, -160, -80):
            s.rim(m, pid, 0.45)
    return s


ICON_LOTUS = [
    "...k..k..k......",
    "..k2kk3kk2k.....",
    ".k232k3k232k....",
    ".k2332332332k...",
    "k22333333332k...",
    "k122222222221k..",
    ".k1122222211k...",
    "..kk111111kk....",
    "....kkk1kk..kkk.",
    ".kkkk.k1k..k111k",
    "k3311kk1k.k1111k",
    "k1111k1k...kkkk.",
    ".kkkk.k1k.......",
    "..kkkkk1kkkkk...",
    ".k33222k332222k.",
    "..kkkkkkkkkkkk..",
]


# -------------------------------------------------------------- build ------

SPECS = {
    "lotus_seed": dict(
        fn=front_seed, n=4, back=back_seed, icon=ICON_SEED, dx=6,
        anim={"intro": [[0, 10], [1, 14], [2, 5], [3, 10], [2, 4], [0, 3]], "idle": [[0, 150], [2, 6]]},
        notes="REARING: the seed pod rears on a C stalk from two plump lotus-root feet, its pitted pale "
              "face tilted at the foe; a cupped leaf raised as a shield, the last pink petal a cape. "
              "Intro: the shield leaf tips forward, a water bead rolls off its lip, falls and splashes, "
              "and the leaf springs back. Crystal rule: teal is the dark slot (leaves, stalk, seed "
              "holes, the shade on pink), lotus pink the light. Sport: Nelumbo nucifera 'Chawan "
              "Basu' (white tipped blush pink)."),
    "sacred_lotus": dict(
        fn=front_lotus, n=5, back=back_lotus, icon=ICON_LOTUS, dx=2,
        anim={"intro": [[1, 14], [2, 5], [3, 16], [4, 5], [3, 4], [0, 3]], "idle": [[0, 160], [4, 8]]},
        notes="REARING: the pink cup of pointed petals leans over the foe on a tall C stalk, the pale "
              "pod in its heart; a big cupped leaf held as a shield sheds a bead, a second leaf high "
              "behind, lotus-root feet. Intro: the flower is a shut bud; it swells and the petals "
              "FLARE open past rest round the glinting pod, then settle. Crystal rule: teal dark, "
              "lotus pink light. Sport: Nelumbo nucifera 'Alba Grandiflora' (the great white lotus)."),
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
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/arte_lotus.png")
    items = []
    for id_ in IDS:
        fr, back, ics = render(id_)
        for i, f in enumerate(fr):
            st = D.stats(f)
            if i == 0 or not (0.05 <= st["white"] <= 0.2):
                print(id_, i, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in st.items()})
        items.append((id_, palette(id_), sport(id_), fr, back, ics))
    print(D.preview(items, out))
