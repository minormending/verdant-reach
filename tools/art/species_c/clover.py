"""Clover line: clover_sprout -> white_clover (Trifolium repens).

Signature: the trifoliate leaf with its pale chevron. The sprout is one
big three-leaf "head" on a springy stalk; white clover lifts a pom-pom
flower head (with the drooping old florets of a real head as a ruff below
it) and swings two trifoliate leaves like fists, stolons gripping the soil.

Palette (one for the line): blue-green shade, clover green, and the white
of the chevrons and florets (white is real here; it is the accent slot).

- clover_sprout: BOBBING (whole body tipped ~17 deg at the foe, a dew drop
  falling off the lead leaf as the motion cue). score: 8 (7: the rear
  trefoil's petiole reads as a black line).
- white_clover: LUNGING (body rotated ~10 deg about the stolon crown; the
  pom-pom is a tilted, squashed ellipse split into floret clusters by three
  notches). score: 8 (9: the drifting floret is small at 1x).
"""

from __future__ import annotations

import math

import numpy as np

import icons_c
from common import chevron, icon, leaflet, rotp, squash, recentre
from px import Sprite

IDS = ["clover_sprout", "white_clover"]

# one ramp for the line: blue-green shade, clover green, the white of the
# chevrons and florets (white is real here). Accent = the white slot.
SPROUT = ["#285830", "#68b040", "#f0f8e0"]
CLOVER = SPROUT


def trifoliate(s, cen, face, L, w, spread=68, sq=1.0, tones=(1, 2, 2), chev=True, notch=1.6,
               order=(2, 1, 0), lens=(1.0, 1.0, 1.0)):
    """Three leaflets from `cen`, the middle one pointing `face` degrees.
    sq < 1 foreshortens them (a leaf tipped toward/away from us)."""
    c = s.c
    out = []
    for k in order:
        a = math.radians(face + (k - 1) * spread)
        Lk = L * lens[k]
        p1 = (cen[0] + math.cos(a) * Lk, cen[1] + math.sin(a) * Lk * sq)
        p0 = (cen[0] + math.cos(a) * 1.2, cen[1] + math.sin(a) * 1.2 * sq)
        m = leaflet(c, p0, p1, w, notch=notch)
        part = s.add(m, tones=tones, shade=(2, 2), close=1, line="black")
        out.append((part, p0, p1, w * (0.95 if k != 1 else 1.0)))
    return out


def paint_chevrons(s, leaves, tone=3, at=0.42, thick=1.5):
    for part, p0, p1, w in leaves:
        m = chevron(s.c, p0, p1, w, at=at, depth=0.16, thick=thick, span=0.64)
        s.paint(m & part.mask, tone, only=[1, 2])


# --------------------------------------------------------------------------- sprout

def heart(c, p0, p1, w, notch=0.22):
    """Obovate clover leaflet: a broad rounded end (two shallow lobes either
    side of the tip notch) narrowing to the leaf centre p0."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    L = np.linalg.norm(p1 - p0)
    ax = (p1 - p0) / L
    nx = np.array([-ax[1], ax[0]])
    r = w / 2

    def at(u, v):
        return p0 + ax * u + nx * v

    q = at(L - r, 0)
    m = c.ellipse(q[0], q[1], r, r * 0.92, math.degrees(math.atan2(nx[1], nx[0])))
    m |= c.poly([at(0, -0.8), at(L - r, -r * 0.98), at(L - r, r * 0.98), at(0, 0.8)])
    for sd in (-1, 1):
        q = at(L - r * 0.62, sd * r * 0.5)
        m |= c.circle(q[0], q[1], r * 0.5)
    q = at(L + 0.2, 0)
    m &= ~c.leaf(at(L - r * notch * 1.6, 0), at(L + 2.5, 0), max(2.2, r * 0.55), power=0.7)
    return m


def trefoil(s, cen, face, L, w, spread=82, sq=1.0, order=(2, 1, 0), lens=(1, 1, 1), widths=(1, 1, 1),
            tones=(1, 2, 2), line="black"):
    c = s.c
    out = []
    for k in order:
        a = math.radians(face + (k - 1) * spread)
        Lk = L * lens[k]
        p1 = (cen[0] + math.cos(a) * Lk, cen[1] + math.sin(a) * Lk * sq)
        p0 = (cen[0] + math.cos(a) * 0.8, cen[1] + math.sin(a) * 0.8 * sq)
        m = heart(c, p0, p1, w * widths[k])
        part = s.add(m, tones=tones, shade=(2, 2), close=1, line=line)
        out.append((part, p0, p1, w * widths[k]))
    return out


def chevrons(s, leaves, at=0.40, thick=1.5, span=0.55, depth=0.18):
    for part, p0, p1, w in leaves:
        m = chevron(s.c, p0, p1, w, at=at, depth=depth, thick=thick, span=span)
        s.paint(m & part.mask, 3, only=[1, 2])


def sprout_front(f=0):
    """BOBBING. A springy C: the trefoil head tipped ~20 deg at the foe,
    the first spade-leaf raised as the lead arm, a little back trefoil as
    the tail; two cotyledon feet. Idle: the head bobs 1px, a dew drop
    slides off the lead leaflet and falls."""
    s = Sprite(56, 56, SPROUT)
    c = s.c
    bob = (0, 1, 1)[f]
    # cotyledon feet, joined at the stalk base
    s.add(c.ellipse(28.0, 52.6, 6.8, 2.9, -8), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(40.5, 53.1, 5.2, 2.4, 10), tones=(1, 1, 2), shade=(1, 1))
    # the whole body tips ~14 deg at the foe about the feet (CREATURES §10)
    c.pose((35, 55), 17 + (0, 0.5, 1.5)[f], shift=(4, 0))
    # tail: rear trefoil on its petiole, swept up behind
    s.add(c.curve([(31, 47), (37, 43), (41, 38 + bob * 0.5)], 2.4, 2.0), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (42, 37 + bob * 0.5), -70, 9.0, 8.4, spread=118, sq=0.9, lens=(0.9, 1, 0.9),
                   line="dark")
    # torso: the C-curved stalk
    s.add(c.curve([(29.5, 55.8), (33.5, 46), (31, 34), (25, 27 + bob)], 4.0, 3.0), tones=(1, 2, 2),
          shade=(1, 0), band=(1, 2))
    # lead arm: the first (spade) leaf, raised toward the foe
    s.add(c.curve([(32, 47), (26, 45), (20, 42.5)], 2.4, 2.0), tones=(1, 2, 2), shade=(1, 0))
    arm = c.leaf((20.5, 43), (6.5, 38.5 - bob * 0.5), 9.6, power=0.8, tip=0.6, base=1.4, bend=-1.2)
    s.add(arm, tones=(1, 2, 2), shade=(2, 2), band=(1, 2))
    # the head: upright trefoil tipped 20 deg toward the foe; far leaflet smaller
    cen = (24.5, 23 + bob)
    head = trefoil(s, cen, -114, 15.5, 16.0, spread=120, sq=0.95, order=(2, 1, 0),
                   lens=(1.04, 1.0, 0.84), widths=(1.04, 1.0, 0.86), line="dark")
    s.render()
    chevrons(s, head)
    chevrons(s, rear, thick=1.0, span=0.5)
    # glint: a dew bead high on the top leaflet's lit lobe
    a = math.radians(-114)
    gx, gy = c.to_screen(cen[0] + math.cos(a) * 11 - 4, cen[1] + math.sin(a) * 11 + 1)
    s.rows(int(gx), int(gy), [".3", "33"])
    # motion cue: a drop sliding off the lead arm's tip and falling
    dy = (0, 1, 3)[f]
    tx, ty = c.to_screen(6.5, 38.5)
    s.rows(int(tx) - 3, int(ty) + 2 + dy, ["_0__", "030_", "0330", "0320", "_00_"])
    s.selout()
    s.contact(22, 32)
    s.clean()
    return s


def sprout_back():
    """From behind and above: the trefoil head huge and tipped toward the
    foe (top right), chevrons on the upper faces; the spade-leaf lead arm
    raised on the right; the stalk runs out of the bottom."""
    s = Sprite(48, 48, SPROUT, crop_bottom=True)
    c = s.c
    s.add(c.curve([(16, 48.5), (11, 43), (5, 40)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (5, 39), -160, 9.5, 9.5, spread=118, sq=0.8, line="dark")
    s.add(c.curve([(21, 48.5), (21, 40), (23, 30)], 9.0, 7.0), tones=(1, 2, 2), shade=(2, 0), band=(1, 2))
    s.add(c.curve([(25, 42), (33, 39), (38, 35)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    s.add(c.leaf((36, 37), (47.5, 22), 14, power=0.8, tip=0.6, base=1.4, bend=1.0), tones=(1, 2, 2),
          shade=(2, 2), band=(1, 2))
    head = trefoil(s, (23, 22), -62, 21.5, 22.0, spread=120, sq=0.8, order=(1, 0, 2),
                   lens=(1.0, 1.05, 1.0), widths=(1.0, 1.04, 1.0), line="dark")
    s.render()
    chevrons(s, head, thick=2.0)
    s.selout()
    s.clean()
    return s


# --------------------------------------------------------------------------- white clover

def pompom(s, hx, hy, hr, n=19, seed=3, rb=3.9, tilt=0.0, sq=1.0, notches=()):
    """The flower head as a ball of floret clusters: points on the visible
    hemisphere, drawn back to front as little domes. Each dome is white on
    the lit side of the ball, green-shaded on the shadow side. `tilt`/`sq`
    turn the ball into a squashed, rotated ellipse (the head tipped at the
    foe); `notches` = rim angles (deg) where a wedge splits the head into
    floret clusters (outlined V cuts with a dark-tone crease inward)."""
    c = s.c
    t = math.radians(tilt)

    def P(x, y):
        return hx + (x * math.cos(t) - y * sq * math.sin(t)), hy + (x * math.sin(t) + y * sq * math.cos(t))

    cut = c.empty()
    creases = []
    for ang in notches:
        a = math.radians(ang)
        p1 = P(math.cos(a) * (hr + 1.5), math.sin(a) * (hr + 1.5))
        p0 = P(math.cos(a) * (hr - 4.5), math.sin(a) * (hr - 4.5))
        cut |= c.leaf(p1, p0, 3.2, power=0.9, tip=2.0)
        creases.append((P(math.cos(a) * (hr - 4), math.sin(a) * (hr - 4)), P(math.cos(a) * (hr - 7.5), math.sin(a) * (hr - 7.5))))
    pts = []
    ga = math.pi * (3 - math.sqrt(5))
    for k in range(n):
        z = 1 - (k + 0.5) / n            # 1 = facing us .. 0 = the rim
        rr = math.sqrt(1 - z * z)
        a = k * ga + seed
        pts.append((math.cos(a) * rr, math.sin(a) * rr, z))
    pts.sort(key=lambda q: q[2])
    L = np.array([-0.55, -0.62, 0.56])
    L /= np.linalg.norm(L)
    base = c.ellipse(hx, hy, hr - 1.2, (hr - 1.2) * sq, tilt)
    for k in range(18):                     # floret tips fringing the rim
        a = 2 * math.pi * k / 18 + seed
        base |= c.circle(*P(math.cos(a) * (hr - 0.2), math.sin(a) * (hr - 0.2)), 1.5)
    s.add(base & ~cut, tones=(1, 2, 2), shade=(3, 3), close=1, line="none")
    parts = []
    for x, y, z in pts:
        X, Y = P(x * (hr - rb * 0.55), y * (hr - rb * 0.55))
        lam = float(np.dot([(X - hx) / hr, (Y - hy) / hr, z], L))
        r = rb * (0.75 + 0.35 * z)
        m = c.circle(X, Y, r) & ~cut
        tones = (2, 3, 3) if lam > -0.45 else (1, 2, 2)
        sh = None if lam > 0.45 else ((1, 1) if lam > 0.0 else (2, 2))
        ln = "dark" if lam < 0.3 else "none"     # floret seams on the shade side only
        if sh is None:
            parts.append(s.add(m, prune=False, tones=tones, flat=True, line=ln))
        else:
            parts.append(s.add(m, prune=False, tones=tones, shade=sh, line=ln))
    s._creases = getattr(s, "_creases", []) + creases
    return parts


def paint_creases(s):
    """Dark-tone creases continuing each notch into the head."""
    for p0, p1 in getattr(s, "_creases", []):
        s.paint(s.c.stroke([p0, p1], 1.2), 1, only=[2, 3])


def floret_marks(s, hx, hy, hr, step=4.0):
    """Sparse floret marks (2px diagonal ticks, mid on white) on the white
    of the head, thickening toward the terminator; the lit cap stays clean."""
    for j in range(-5, 6):
        for i in range(-5, 6):
            x = hx + (i + 0.5 * (j % 2)) * step
            y = hy + j * step * 0.8
            dx, dy = x - hx, y - hy
            if math.hypot(dx, dy) > hr - 2.5:
                continue
            if (-dx - dy) / hr > 0.15:
                continue
            X, Y = int(round(x)), int(round(y))
            if s.t[Y, X] == 3 and s.t[Y + 1, X + 1] == 3 and s.t[Y - 1, X] == 3:
                s.px([(X, Y), (X + 1, Y + 1)], 2)


def clover_front(f=0):
    """LUNGING. The pom-pom head thrust out past the front foot on a strong
    C of peduncle; the big lead trefoil raised under it like a fist, the
    rear trefoil flung up and back; stolon feet rooted wide. Idle: the head
    pushes 1px forward/down, the lead fist lifts, a loose floret drifts."""
    s = Sprite(56, 56, CLOVER)
    c = s.c
    lun = (0, 1, 1)[f]
    dip = (0, 0, 1)[f]
    # stolon: the creeping runner, rooting at two nodes (the feet)
    # stolon legs: arched runners from the crown, rooting at a node each side
    s.add(c.curve([(33, 53), (26, 47.5), (17, 49), (11, 54.5)], 3.4, 2.8), tones=(1, 2, 2), shade=(1, 1),
          band=(1, 2))
    s.add(c.curve([(35, 53), (41, 48.5), (47, 50), (50, 54.5)], 3.2, 2.6), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(11, 54, 3.6, 1.8) | c.ellipse(50.5, 54, 3.0, 1.6) | c.ellipse(34, 54, 4.0, 1.8),
          tones=(1, 1, 2), shade=(1, 1))
    # everything above the stolons lunges: the body rotates ~10 deg about the crown
    c.pose((34, 53), 10 + (0, 0.7, 1.6)[f], shift=(3, 0))
    # rear arm: long petiole flung up and back, trefoil at the top right
    s.add(c.curve([(38, 52), (42, 42), (45, 32), (45.5 - lun * 0.5, 25)], 2.6, 2.2), tones=(1, 2, 2),
          shade=(1, 0))
    rear = trefoil(s, (45.5 - lun * 0.5, 22), -60, 10.0, 9.6, spread=118, sq=0.9, lens=(0.95, 1.0, 0.85),
                   widths=(1, 1, 0.9), line="dark")
    # ruff of reflexed old florets under the head (real heads droop and brown)
    hx, hy, hr = 20.5 - lun, 17 + dip, 13.0
    ped = c.curve([(34, 53), (37, 42), (33, 31), (hx + 4, hy + 6)], 4.6, 3.4)
    s.add(ped, tones=(1, 2, 2), shade=(1, 0), band=(1, 2))
    ruff = c.empty()
    for k in range(8):
        a = math.radians(30 + k * 17)
        x0, y0 = hx + math.cos(a) * hr * 0.6, hy + math.sin(a) * hr * 0.6
        x1, y1 = hx + math.cos(a) * (hr + 3.2), hy + math.sin(a) * (hr + 2.8) + 2.0
        ruff |= c.leaf((x0, y0), (x1, y1), 3.8, power=0.6, tip=1.3)
    s.add(ruff, tones=(1, 1, 2), shade=(1, 1), line="dark")
    # the head: an exaggerated pom-pom of floret clusters
    heads = pompom(s, hx, hy, hr, n=16, seed=2.2, rb=4.4, tilt=-22, sq=0.86, notches=(-60, 10, 75))
    # lead arm: a big trefoil raised forward under the head like a fist
    s.add(c.curve([(31, 52), (24, 47), (17, 42 - lun * 0.5)], 2.8, 2.4), tones=(1, 2, 2), shade=(1, 0))
    lead = trefoil(s, (14.5, 40.5 - lun), 170, 11.5, 11.5, spread=118, sq=0.85, order=(0, 2, 1),
                   lens=(1.0, 1.0, 0.95), line="dark")
    s.render()
    floret_marks(s, *c.to_screen(hx, hy), hr)
    paint_creases(s)
    chevrons(s, lead)
    chevrons(s, rear, thick=1.2, span=0.5)
    # motion cue: one loose floret drifting off the head, up and back
    fx, fy = c.to_screen(34, 6)
    fx, fy = int(fx) + (0, 1, 2)[f], int(fy) - (0, 0, 1)[f]
    s.rows(fx, fy, ["_00_", "0330", "_020"[:4], "__0_"])
    s.selout(inner=(2,), skip=c.circle(hx, hy, hr + 3))
    s.contact(8, 14)
    s.contact(31, 37)
    s.clean()
    return s


def clover_back():
    """Behind and above: the pom-pom (biggest shape) leaning to the top right
    with the old-floret ruff hanging under it; the lead trefoil raised on the
    right, the rear one low on the left; the peduncle runs out of frame."""
    s = Sprite(48, 48, CLOVER, crop_bottom=True)
    c = s.c
    s.add(c.curve([(16, 48.5), (10, 43), (5, 40)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (5, 39), -170, 10.5, 10.5, spread=118, sq=0.8, line="dark")
    s.add(c.curve([(21, 48.5), (22, 40), (24, 32)], 10.0, 8.0), tones=(1, 2, 2), shade=(2, 0), band=(1, 2))
    hx, hy, hr = 25, 19, 18.5
    ruff = c.empty()
    for k in range(11):
        a = math.radians(15 + k * 15)
        ruff |= c.leaf((hx + math.cos(a) * hr * 0.55, hy + math.sin(a) * hr * 0.55),
                       (hx + math.cos(a) * (hr + 3.6), hy + math.sin(a) * (hr + 3) + 2), 4.6, power=0.6, tip=1.3)
    s.add(ruff, tones=(1, 1, 2), shade=(1, 1), line="dark")
    pompom(s, hx, hy, hr, n=22, seed=1.3, rb=5.2, tilt=20, sq=0.88, notches=(-150, -80, 5))
    s.add(c.curve([(25, 44), (34, 41), (39, 38)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    lead = trefoil(s, (41, 37), -25, 11.5, 11.5, spread=118, sq=0.8, order=(2, 0, 1), line="dark")
    s.render()
    floret_marks(s, hx, hy, hr, step=4.8)
    paint_creases(s)
    chevrons(s, lead, thick=1.5)
    chevrons(s, rear, thick=1.3)
    s.selout(inner=(2,), skip=c.circle(hx, hy, hr + 3))
    s.clean()
    return s


def make(id_):
    if id_ == "clover_sprout":
        fr = [sprout_front(k).image() for k in range(3)]
        pal, back = SPROUT, sprout_back()
    else:
        fr = [clover_front(k).image() for k in range(3)]
        pal, back = CLOVER, clover_back()
    i1 = icons_c.make_icon(id_, pal)
    fr = recentre(fr)
    return {"front": fr[0], "front__2": fr[1], "front__3": fr[2], "back": back.image(),
            "icon": i1, "icon__2": squash(i1, 9)}
