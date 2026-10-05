"""Crystal rule, bird of paradise line: paradise_shoot -> bird_of_paradise.

A redraw of tools/art/species_f/paradise.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). Strelitzia reginae, the crane
flower: stiff blue-grey paddle leaves, a boat-shaped spathe (the beak),
three orange sepals (the crest) and a blue arrow of fused petals (the
tongue). It reads as a crested bird's head with no face.

  index 0  #181818  outline, the leaves' shadow side, midribs     (shared)
  index 1  slate blue-green: the leaves, stalk and spathe, AND the blue
           tongue. The second hue lives in the dark slot (the pilot
           flytrap's lesson): Strelitzia leaves really are blue-grey, so
           the leaf, the spathe and the petal arrow share one cool tone.
  index 2  sepal orange: the crest, the spathe's lit keel, the line's accent
  index 3  #f8f8f8  rims on the leaves' lit edges, glints        (shared)

Poses (kept from the classic art):
  paradise_shoot    COILED   the closed beak drawn back over an S stalk, a
                             paddle raised in front as a guard.
  bird_of_paradise  LUNGING  the open crest thrust at the foe on an arched
                             neck, paddles fanned back like tail plumes.

Entrance animations (only the head moves):
  paradise_shoot    the beak draws back, then STRIKES forward and down, and a
                    lick of orange splits out of the spathe.
  bird_of_paradise  the crest is folded into the beak; it FLARES up and
                    open, fans past rest, and settles, a spark flying off.

Sport: 'Mandela's Gold' (Kirstenbosch, 1996): golden-yellow sepals, the
petal arrow a deeper violet-blue.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/paradise.py            # preview sheet only (scratch)
  $PY tools/art/crystal/build.py paradise      # write the base bundles
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

TOOL = "tools/art/crystal/paradise.py"
IDS = ["paradise_shoot", "bird_of_paradise"]

DARK, LIGHT = "#305878", "#f89830"
PAL = [BLACK, DARK, LIGHT, WHITE]
SPORT = [BLACK, "#384880", "#f8d038", WHITE]


# ---------------------------------------------------------------- parts ----

def paddle(s, base, mid, tip, w, petiole=2.4, line=0, power=0.5, rimf=0.55, mv=False):
    """A strelitzia leaf: petiole base->mid, then a stiff oblong blade
    mid->tip. Slate body, a black shadow band, a black midrib, a white rim."""
    put = s.mpart if mv else s.part
    pm = s.curve([base, ((base[0] + mid[0]) / 2, (base[1] + mid[1]) / 2 + 0.5), mid], (petiole + 0.8, petiole))
    put(pm, base=1, k=1, sh=0, line=line)
    m, path = s.leaf(mid, tip, w, fat=0.46, power=power, blunt=1.0)
    pid = put(m, base=1, k=1, sh=0, line=line)
    s.rim2(m, pid, rimf, rimf * 0.3)
    if math.dist(mid, tip) > 8:
        s.decal(s.line1(path[8:-12]) & D.erode(m, 1), 2, on=pid)
    return pid


def sepal(s, base, tip, w, mv=True):
    m, path = s.leaf(base, tip, w, fat=0.40, power=0.8)
    pid = (s.mpart if mv else s.part)(m, base=2, k=1, sh=1, line=0)
    s.rim(m, pid, 0.45, sides="tl")
    return pid


def tongue(s, base, tip, w, mv=True):
    m, _ = s.leaf(base, tip, w, fat=0.70, power=0.9)
    pid = (s.mpart if mv else s.part)(m, base=1, k=1, sh=0, line=0)
    s.rim(m, pid, 0.4, sides="t")
    return pid


def spathe(s, root, tip, w, droop=0.06, mv=False):
    """The beak: a boat-shaped bract, slate with an orange lit keel along
    its top edge and a white glint at the root."""
    m, path = s.leaf(root, tip, w, bend=droop, fat=0.30, power=0.75)
    pid = (s.mpart if mv else s.part)(m, base=1, k=1, sh=0, line=0)
    top = m & ~D.shift(m, 0, -1)
    band = top | (D.move(top, 0, 1) & m)
    s.decal(band, 2, on=pid)
    s.decal(top & D.move(top, 0, 0) & ~D.shift(top, 1, 0), 2, on=pid)
    return pid, path


def crest(s, hx, hy, fl, tilt=0.0):
    """Three sepals and the tongue. fl: 0 folded into the beak, 1 rest,
    >1 flared. Angles from vertical (+ = toward the back/right)."""
    spread = 0.25 + 0.75 * fl
    length = 0.45 + 0.55 * min(fl, 1.0) + 0.06 * max(0.0, fl - 1.0)
    for ang, L, w, dx in ((26, 19.5, 5.0, 2), (4, 21.5, 5.6, 0), (-30, 18.5, 5.2, -2)):
        a = math.radians(ang * spread + tilt)
        L2 = L * length
        sepal(s, (hx + dx, hy - 1), (hx + dx + math.sin(a) * L2, hy - 1 - math.cos(a) * L2), w)
    # the blue arrow jutting forward-up from the crest's foot
    a = math.radians(-62 * (0.6 + 0.4 * min(fl, 1.2)) + tilt)
    L = 16.5 * (0.5 + 0.5 * min(fl, 1.1))
    tongue(s, (hx - 2, hy - 2), (hx - 2 + math.sin(a) * L, hy - 2 - math.cos(a) * L), 4.8)


# ---------------------------------------------------------- bird of paradise

ADULT_FL = [1.0, 0.0, 0.55, 1.3, 1.12]


def front_adult(k=0):
    s = D.S(56, 56)
    fl = ADULT_FL[k]
    # tail plumes: paddles fanned back and up (far ones first)
    paddle(s, (37, 53), (45, 36), (54, 17), 10.5)
    paddle(s, (39, 53), (47, 44), (55, 31), 8.5)
    # feet: the leaf bases splayed
    for pts, w in (([(33, 48), (29, 52), (22, 55)], (4.6, 2.8)), ([(37, 48), (41, 52), (47, 55)], (4.2, 2.6))):
        m = s.curve(pts, w)
        s.part(m, base=1, k=1, sh=0, line=0)
    # the neck: the flower stalk arched toward the foe
    neck = s.curve([(35, 55), (39, 44), (37, 33), (31, 26)], (5.0, 3.6))
    pid = s.part(neck, base=1, k=1, sh=0, line=0)
    s.rim(neck, pid, 0.6, sides="l")
    # lead leaf: swept forward low, a long wing
    paddle(s, (34, 50), (26, 45), (3, 40), 10.5, power=0.62, rimf=0.7)
    hx, hy = 28, 22
    crest(s, hx, hy, fl)
    pid, path = spathe(s, (hx + 6, hy + 2), (hx - 24, hy + 5), 7.0)
    # glint on the beak's shoulder
    s.px([(hx - 4, hy + 3), (hx - 3, hy + 3), (hx - 2, hy + 3)], 3)
    # a spark flying off the crest (frames 0, 3, 4)
    sp = {0: (43, 3), 3: (40, 6), 4: (42, 4)}.get(k)
    if sp:
        x, y = sp
        s.rows(x, y, [".k.", "k3k", "k2k", ".k."])
        s.mark(s.rect(x - 1, y - 1, x + 4, y + 5))
    return s


def back_adult():
    """From behind: the beak's keel and the sepals' backs leaning top-right
    at the foe; paddle leaves both sides; the stalk runs off below."""
    s = D.back_canvas()
    paddle(s, (16, 48), (10, 38), (1, 10), 14, rimf=0.6)
    paddle(s, (30, 48), (37, 42), (47, 26), 13, rimf=0.5)
    m = s.curve([(22, 48), (21, 38), (23, 28)], (8.0, 6.0))
    pid = s.part(m, base=1, k=1, sh=0, line=0)
    s.rim(m, pid, 0.7, sides="l")
    paddle(s, (20, 48), (14, 46), (2, 44), 9)
    hx, hy = 24, 23
    sepal(s, (hx - 2, hy - 2), (hx - 10, hy - 21), 7.5, mv=False)
    sepal(s, (hx + 1, hy - 2), (hx + 5, hy - 23), 8.0, mv=False)
    tongue(s, (hx + 4, hy - 3), (hx + 21, hy - 16), 6.0, mv=False)
    sepal(s, (hx + 3, hy - 2), (hx + 17, hy - 18), 7.0, mv=False)
    spathe(s, (hx - 12, hy + 7), (hx + 24, hy - 5), 12.5, droop=-0.05)
    s.px([(16, 30), (17, 30), (18, 29)], 3)
    return s


ICON_ADULT = [
    "......k.........",
    ".....k2k..k.....",
    "..k..k2k.k2k....",
    ".k2k.k2kk2k.....",
    "..k2kk22k2k.....",
    "...k22222k......",
    "kkkkk2221k......",
    "k111kk11kkkk....",
    ".kk22222223kk...",
    "...kkkk11113k...",
    "........k11kkkk.",
    ".kkk...k11kk311k",
    "k3111kk11kk3111k",
    "k31111k11k3111k.",
    ".k11111k11k11k..",
    "..kkkkkkkkkkkk..",
]


# -------------------------------------------------------------- shoot ------

# head pose per frame: (dx, dy, tilt deg, sepal lick 0..1)
SHOOT_POSE = [(0, 0, 0, 0.35), (5, -3, 14, 0.0), (-4, 4, -12, 0.15), (-2, 2, -6, 1.0)]


def front_shoot(k=0):
    s = D.S(56, 56)
    dx, dy, tilt, lick = SHOOT_POSE[k]
    # tail: a new leaf still rolled into a spear, a paddle swept up behind
    m = s.curve([(37, 53), (45, 46), (53, 37)], (3.6, 1.6))
    pid = s.part(m, base=1, k=1, sh=0, line=0)
    s.rim(m, pid, 0.6)
    paddle(s, (35, 53), (42, 40), (51, 21), 9.0)
    for pts, w in (([(31, 49), (27, 52.5), (20, 55)], (4.2, 2.4)), ([(35, 49), (39, 52.5), (45, 55)], (3.8, 2.2))):
        s.part(s.curve(pts, w), base=1, k=1, sh=0, line=0)
    # the neck: an S, the head drawn back over the body before the strike
    hx, hy = 38 + dx, 16 + dy
    upper = s.curve([(33, 36), (29, 29), (32, 21), (hx - 1, hy + 1)], (3.6, 3.2))
    lower = s.curve([(33, 55), (37, 45), (33, 36)], (4.6, 3.6))
    pid = s.part(lower | upper, base=1, k=1, sh=0, line=0)
    s.mark(upper & ~lower)
    s.rim(lower | upper, pid, 0.6, sides="l")
    # the closed beak tipped at the foe; a lick of orange splitting its top
    a = math.radians(tilt)

    def R(x, y):
        return (hx + (x - hx) * math.cos(a) - (y - hy) * math.sin(a),
                hy + (x - hx) * math.sin(a) + (y - hy) * math.cos(a))
    if lick > 0:
        L = 4 + 8 * lick
        sepal(s, R(hx - 6, hy - 1), R(hx - 6 - L * 0.7, hy - 1 - L * 0.75), 3.4 + 1.2 * lick)
    spathe(s, R(hx + 4, hy + 0.5), R(hx - 25, hy + 8), 6.6, droop=-0.06, mv=True)
    g = R(hx - 6, hy + 2)
    s.px([(round(g[0]), round(g[1])), (round(g[0]) + 1, round(g[1]))], 3)
    # lead leaf raised in front as a guard
    paddle(s, (32, 50), (25, 43), (6, 34), 10.0, power=0.6, rimf=0.7)
    return s


def back_shoot():
    s = D.back_canvas()
    paddle(s, (18, 48), (10, 38), (1, 12), 13, rimf=0.6)
    paddle(s, (28, 48), (36, 42), (47, 30), 12)
    m = s.curve([(22, 48), (22, 38), (24, 28)], (7.5, 5.6))
    pid = s.part(m, base=1, k=1, sh=0, line=0)
    s.rim(m, pid, 0.7, sides="l")
    paddle(s, (20, 48), (13, 46), (1, 45), 9)
    sepal(s, (27, 17), (38, 4), 5.0, mv=False)
    spathe(s, (9, 31), (47, 11), 14, droop=-0.04)
    s.px([(14, 27), (15, 27), (16, 26)], 3)
    return s


ICON_SHOOT = [
    "................",
    "................",
    "......kk........",
    ".....k22k.......",
    "...kkkk2kkkkk...",
    ".kk222221111k...",
    "..kk11111111k...",
    "....kkkkk111k...",
    "...kk...k11k....",
    "..k31k..k11k.kk.",
    ".k3111k.k11kk31k",
    ".k31111kk11k311k",
    "..k3111kk11k11k.",
    "...kk11kk11k1k..",
    ".....kkk111kk...",
    "......kkkkk.....",
]


# -------------------------------------------------------------- build ------

SPECS = {
    "paradise_shoot": dict(
        fn=front_shoot, n=4, back=back_shoot, icon=ICON_SHOOT, dx=0,
        anim={"intro": [[1, 12], [2, 4], [3, 14], [2, 6], [0, 2]], "idle": [[0, 150], [1, 8]]},
        notes="COILED: the closed beak drawn back on an S stalk, a paddle raised as a guard. "
              "Intro: the beak draws back, STRIKES forward and down, and a lick of orange splits out "
              "of the spathe, then it settles. Crystal rule: the leaves, stalk, spathe and the blue "
              "petal arrow share the slate dark slot (Strelitzia leaves are blue-grey); orange is the "
              "crest and the spathe's lit keel. Sport: 'Mandela's Gold' (Kirstenbosch, 1996): "
              "golden-yellow sepals, a deeper violet-blue."),
    "bird_of_paradise": dict(
        fn=front_adult, n=5, back=back_adult, icon=ICON_ADULT, dx=0,
        anim={"intro": [[1, 12], [2, 4], [3, 16], [4, 5], [3, 6], [0, 3]], "idle": [[0, 160], [4, 8]]},
        notes="LUNGING: the open crest thrust at the foe on an arched neck, paddles fanned back. "
              "Intro: the crest starts folded into the beak, FLARES up and open past rest, and "
              "settles, a spark flying off. Crystal rule: the leaves, stalk, spathe and the blue "
              "petal arrow share the slate dark slot; the orange sepals are the light slot and the "
              "accent. Sport: 'Mandela's Gold' (Kirstenbosch, 1996): golden-yellow sepals, a "
              "deeper violet-blue."),
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
        write_species(id_, palette=PAL, sport=SPORT, front=fr, back=[back], icon=ics,
                      anim=SPECS[id_]["anim"], moving=D.moving_boxes(fr), notes=SPECS[id_]["notes"], tool=TOOL)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/arte_paradise.png")
    items = []
    for id_ in IDS:
        fr, back, ics = render(id_)
        for i, f in enumerate(fr):
            st = D.stats(f)
            print(id_, i, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in st.items()})
        items.append((id_, PAL, SPORT, fr, back, ics))
    print(D.preview(items, out))
