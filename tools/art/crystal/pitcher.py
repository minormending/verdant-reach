"""Crystal rule, pitcher line: pitcher_sprout -> pitcher_plant (Sarracenia).

The white, maroon-netted hood is kept from the classic art (it follows the
white-topped S. leucophylla); the Herbarium names S. purpurea.

  index 0  #181818  outline, the depth of the mouth           (shared)
  index 1  MAROON: the veins netting the hood, the inside of the mouth,
           the shade side of the lime tubes
  index 2  lime: the trumpets and the moss tussock
  index 3  #f8f8f8  the white hood (a genuinely white part), the gloss
           on the tubes, the nectar on the lip

Two hues, the flytrap's way: the maroon of the veins lives in the dark slot,
so the same maroon nets the white hood, fills the mouth and shades the lime
tube; there is no dark green.

Poses (docs/CREATURES.md, kept from the classic art):
  pitcher_sprout  REARING: one trumpet rises off a moss tussock and leans its
                  hooded mouth at the foe; a small one behind.
  pitcher_plant   REARING: a brood of three; the lead trumpet rears in an S
                  over the tussock, its hood flared like a cobra's.

Entrance animations (only the lead pitcher's lid moves):
  pitcher_sprout  the lid lifts, peeks open wide, nectar glints on the lip,
                  and the lid claps shut and settles.
  pitcher_plant   the lid creaks up, flares wide (held, the nectar glinting),
                  then claps down, bounces once and settles.

Sport: the green form, as in Sarracenia purpurea f. heterophylla
(anthocyanin-free): all chartreuse, no red veins.

Scores (docs/CREATURES.md §9): pitcher_sprout 8, pitcher_plant 8 (the hood
veins are kept to two nested arcs so the white reads; 3: the small pitchers
are near-vertical columns).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/pitcher.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py pitcher                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, mask_px, stalk, preview, stats, shift)

TOOL = "tools/art/crystal/pitcher.py"
IDS = ["pitcher_sprout", "pitcher_plant"]
MAROON = "#802858"
LIME = "#b0d040"
PAL = [BLACK, MAROON, LIME, WHITE]
SPORT = [BLACK, "#407838", "#c8e050", WHITE]
SPAL = (MAROON, LIME, WHITE)


def rot(pts, deg, cx, cy):
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c + (y - cy) * s_, cy - (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def rosette(s, cx, y, spans):
    """The basal rosette: flat lime leaves lying on the bog, the feet. spans:
    [(tip_x, width)], drawn far-to-near; leaves to the left lean forward."""
    for tx, w in spans:
        base = (cx, y - 1.0)
        tip = (tx, y - 0.6 - (1.6 if abs(tx - cx) < 14 else 0.0))
        m, path = s.leaf(base, tip, w, bend=0.10 if tx < cx else -0.10, fat=0.55, blunt=1.0)
        pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
        s.decal(s.line1(path[10:-12]), 1, on=[pid])
        rim_white(s, m, pid, 0.30)


def trumpet(s, ctrl, w0, w1, veins=3):
    """The tube: tapered along ctrl, lime with a maroon shade band, maroon
    veins on its upper third, a white gloss rim."""
    path = bez(ctrl, 50)
    m = s.stroke(path, lambda t: w0 + (w1 - w0) * t ** 1.6, cap=False)
    pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.22)
    n = len(path)
    for j in range(veins):
        off = (j - (veins - 1) / 2) * w1 * 0.24
        seg = []
        for i in range(int(n * 0.66), n - 2):
            x, y = path[i]
            a = path[max(0, i - 1)]
            b = path[min(n - 1, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy) or 1
            t = (i / n) ** 1.6
            seg.append((x - dy / L * off * t, y + dx / L * off * t))
        s.decal(s.line1(seg) & erode(m, 1), 1, on=[pid])
    return pid, m, path


def mouth_and_hood(s, cx, cy, rx, ry, ang, lift=0.0, nectar=False, veins=4, hood=1.0):
    """The mouth, gaping at the foe (a tilted ellipse: a rolled lime lip, the
    maroon throat, black depth), and the hood: a white cap hinged at the back
    of the mouth, its wavy front edge overhanging the mouth. lift: the lid's
    rotation up and back, in degrees (negative claps it down)."""
    mo = s.ellipse(cx, cy, rx, ry, ang=ang)
    lip = s.part(mo, base=2, k=0, line=0)
    inner = s.ellipse(cx + 0.4, cy + 0.5, rx - 1.5, ry - 1.4, ang=ang)
    s.decal(inner, 1, on=[lip])
    # the hood's shadow on the far inner wall: a black crescent along the top
    # of the throat (a disc here would read as an eye)
    s.decal(inner & ~shift(inner, 0, -2) & ~shift(inner, -1, -2), 0, on=[lip])
    if nectar:
        p = (int(cx - rx * 0.62), int(cy + ry * 0.55))
        s.glint([p, (p[0] + 1, p[1]), (p[0] + 1, p[1] + 1)])
    # hood: hinge at the back (top-right) of the rim
    hx = cx + rx * 0.55
    hy = cy - ry * 0.75
    W = rx * 2.25 * hood
    H = rx * 1.2 * hood
    pts = [(hx + W * 0.16, hy + H * 0.10), (hx + W * 0.20, hy - H * 0.40), (hx - W * 0.05, hy - H * 0.86),
           (hx - W * 0.42, hy - H * 0.98), (hx - W * 0.72, hy - H * 0.78), (hx - W * 0.86, hy - H * 0.40),
           (hx - W * 0.88, hy - H * 0.02),
           (hx - W * 0.78, hy + H * 0.20), (hx - W * 0.66, hy + H * 0.06), (hx - W * 0.52, hy + H * 0.20),
           (hx - W * 0.38, hy + H * 0.04), (hx - W * 0.20, hy + H * 0.12), (hx, hy + H * 0.02)]
    pts = rot(pts, -lift, hx, hy)
    hm = s.poly(bez(pts + pts[:1], 6))
    hid = s.part(hm, base=3, k=1, sh_tone=1, line=0)
    # maroon veins fanning from the hinge toward the front edge
    # (nested arcs over the dome from the hinge to the front rim, like the
    # meridians of a cap, stopping short of the outline so it stays white)
    for j in range(veins):
        f = 0.30 + 0.55 * (j + 0.5) / veins
        arc = [(hx - W * 0.05, hy - H * 0.05), (hx - W * 0.40, hy - H * f * 1.45), (hx - W * 0.80, hy - H * 0.02)]
        seg = bez(rot(arc, -lift, hx, hy), 16)
        s.decal(s.line1(seg) & erode(hm, 2), 1, on=[hid])
    return hid, hm


# ---------------------------------------------------------------------------
# pitcher_sprout: REARING
# ---------------------------------------------------------------------------

SPROUT_KEYS = [  # (lid lift deg, nectar)
    (0, False),
    (22, False),
    (40, True),
    (-6, False),
]


def sprout_front(f=0):
    lift, nec = SPROUT_KEYS[f]
    s = Spr(64, 60, SPAL)
    s.set_tilt(6, 32, 58)
    # the small pitcher behind
    trumpet(s, [(42, 54), (44, 42), (45, 31)], 3.5, 7, veins=0)
    mouth_and_hood(s, 44, 29, 3.6, 2.6, 0.2, veins=1)
    # lead trumpet
    tid, tm, path = trumpet(s, [(31, 55), (34, 44), (31, 33), (25, 27)], 4, 12, veins=3)
    before = s.tone.copy()
    mouth_and_hood(s, 21.5, 24, 7.5, 5, 0.35, lift=lift, nectar=nec, veins=2)
    s.headm = s.tone != before
    with s.untilted():
        rosette(s, 34, 58, [(52, 6.5), (12, 8), (44, 6), (22, 7)])
    s.contact += [(16, 26), (38, 50)]
    return s


def sprout_frames():
    return place(frames(sprout_front, len(SPROUT_KEYS)), 56, dx=2)


def mouth_back(s, cx, cy, rx, ry, ang=-0.35, veins=4):
    """The pitcher seen from behind and above: the mouth open toward the foe
    (top-right) -- a lime rim around the maroon throat -- and the white hood
    rising from its far rim, netted with maroon veins."""
    c, s_ = math.cos(ang), math.sin(ang)

    def T(pts):
        return [(cx + x * c + y * s_, cy - x * s_ + y * c) for x, y in pts]
    # the hood, behind the mouth (on the far rim)
    H = ry * 2.6
    hp = [(-rx * 0.75, -ry * 0.2), (-rx * 0.85, -H * 0.55), (-rx * 0.45, -H * 0.98), (0, -H * 1.05),
          (rx * 0.45, -H * 0.98), (rx * 0.85, -H * 0.55), (rx * 0.75, -ry * 0.2)]
    hm = s.poly(T(bez(hp + hp[:1], 8)))
    hid = s.part(hm, base=3, k=3, sh_tone=1, line=0)
    for j in range(veins):
        u = -0.7 + 1.4 * j / max(1, veins - 1)
        seg = bez(T([(u * rx * 0.3, -ry * 0.1), (u * rx * 0.55, -H * 0.5), (u * rx * 0.75, -H * 0.95)]), 12)
        s.decal(s.line1(seg) & erode(hm, 1), 1, on=[hid])
    # the mouth: lime rim, maroon throat, a black depth on the far side
    mo = s.poly(T([(rx * math.cos(t), ry * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 60)]))
    mid = s.part(mo, base=2, k=0, line=0)
    rim_white(s, mo, mid, 0.35)
    inner = s.poly(T([((rx - 2) * math.cos(t), (ry - 1.6) * math.sin(t) + 0.4) for t in np.linspace(0, 2 * math.pi, 60)]))
    s.decal(inner, 1, on=[mid])
    s.decal(inner & ~shift(inner, 0, -2), 0, on=[mid])
    return hid


def sprout_back():
    s = Spr(48, 64, SPAL)
    trumpet(s, [(8, 72), (7, 56), (9, 46)], 5, 8, veins=0)
    mouth_back(s, 10, 45, 4.5, 2.6, ang=-0.2, veins=2)
    trumpet(s, [(24, 78), (23, 56), (25, 36)], 10, 20, veins=2)
    mouth_back(s, 26, 34, 12, 6.5, ang=-0.35, veins=4)
    with s.untilted():
        rosette(s, 24, 70, [(50, 11), (-2, 12)])
    return s


# ---------------------------------------------------------------------------
# pitcher_plant: REARING (a brood of three)
# ---------------------------------------------------------------------------

PLANT_KEYS = [  # (lid lift deg, nectar)
    (0, False),
    (18, False),
    (42, True),
    (-8, False),
    (6, False),
]


def plant_front(f=0):
    lift, nec = PLANT_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.92)
    s.set_tilt(5, 33, 58)
    trumpet(s, [(50, 55), (52, 46), (53, 38)], 3.5, 7, veins=0)
    mouth_and_hood(s, 52, 36, 3.6, 2.6, 0.2, veins=1)
    trumpet(s, [(41, 55), (44, 41), (44, 29)], 4.5, 9, veins=0)
    mouth_and_hood(s, 42.5, 27, 4.8, 3.4, 0.25, veins=2)
    trumpet(s, [(30, 56), (35, 44), (32, 31), (25, 24)], 5, 14, veins=3)
    before = s.tone.copy()
    mouth_and_hood(s, 21, 21, 9, 6, 0.35, lift=lift, nectar=nec, veins=2)
    s.headm = s.tone != before
    with s.untilted():
        rosette(s, 36, 58.5, [(62, 7), (8, 9), (50, 7), (20, 8)])
    s.contact += [(12, 24), (44, 56)]
    return s


def plant_frames():
    return place(frames(plant_front, len(PLANT_KEYS)), 56, dx=0)


def plant_back():
    s = Spr(52, 64, SPAL)
    trumpet(s, [(7, 74), (6, 56), (8, 44)], 6, 9, veins=0)
    mouth_back(s, 9, 43, 5, 3, ang=-0.2, veins=2)
    trumpet(s, [(45, 74), (46, 56), (46, 46)], 6, 9, veins=0)
    mouth_back(s, 47, 45, 5, 3, ang=-0.4, veins=2)
    trumpet(s, [(25, 78), (24, 56), (26, 34)], 11, 22, veins=2)
    mouth_back(s, 27, 32, 13.5, 7, ang=-0.35, veins=5)
    with s.untilted():
        rosette(s, 26, 70, [(56, 11), (-4, 12)])
    return s


ICONS = {
    "pitcher_sprout": [
        "................",
        "..kkkkk.........",
        ".k33313k........",
        "k3313133k.......",
        "k1kkkk133k......",
        "k11111k22k...k..",
        ".kk111k22k..k3k.",
        "...kkk222k..k1k.",
        "....k2221k..k2k.",
        "....k3221k..k21k",
        "....k3221k.k221k",
        "...kk2221kk2221k",
        ".kk22222222222kk",
        "k3222222222221k.",
        ".kkkkkkkkkkkkk..",
        "................",
    ],
    "pitcher_plant": [
        "..kkkkk.........",
        ".k33313k....kk..",
        "k3313133k..k33k.",
        "k1kkkk133kk313k.",
        "k11111k22kk1kk..",
        ".kk111k22kk22k..",
        "...kkk222kk21k..",
        "....k3221kk21k..",
        "....k3221kk21k..",
        "....k3221kk21k..",
        "...kk2221kk21k..",
        "..k222221k221kk.",
        ".kk22222222222kk",
        "k3222222222221k.",
        ".kkkkkkkkkkkkk..",
        "................",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "pitcher_sprout": {"intro": [[0, 8], [1, 8], [2, 22], [3, 6], [0, 8]],
                       "idle": [[0, 120], [1, 12]]},
    "pitcher_plant": {"intro": [[0, 6], [1, 10], [2, 24], [3, 6], [4, 6], [0, 8]],
                      "idle": [[0, 140], [1, 12]]},
}

NOTES = {
    "pitcher_sprout": "Crystal rule. REARING: one lime trumpet rises off a moss tussock and leans its hooded "
                      "mouth at the foe, a small one behind. Gesture: the lid lifts, peeks open wide with nectar "
                      "glinting on the lip, then claps shut. Two hues: the vein maroon is the dark slot (veins, "
                      "the mouth, the lime's shade); the hood is the shared white (a genuinely white part). "
                      "Sport: the anthocyanin-free green form.",
    "pitcher_plant": "Crystal rule. REARING: a brood of three; the lead trumpet rears in an S over the tussock, "
                     "its white hood flared. Gesture: the lid creaks up, flares wide (held, nectar glinting), "
                     "claps down, bounces once and settles. Sport: the anthocyanin-free green form.",
}

SPECS = {"pitcher_sprout": (sprout_frames, sprout_back), "pitcher_plant": (plant_frames, plant_back)}


def render():
    out = {}
    for sid, (ffn, bfn) in SPECS.items():
        out[sid] = (ffn(), back_frame(bfn), icon_frames(sid))
    return out


def build():
    from kit import write_species, intro_strip
    for sid, (front, back, icons) in render().items():
        write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
        intro_strip(sid)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = render()
        rows = []
        for sid, (front, back, icons) in out.items():
            for i, f in enumerate(front):
                stats(f"{sid}[{i}]", f)
            stats(f"{sid} back", back)
            rows.append((PAL, front + [back] + icons))
            rows.append((SPORT, front[:1]))
        print(preview(rows, sys.argv[-1]))
    else:
        build()
