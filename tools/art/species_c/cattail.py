"""Cattail line: cattail_shoot -> cattail (Typha latifolia).

Signature: the brown "sausage" spike (the female flower spike) with the
bare male spike above it like a horn. The shoot rears out of the water with
a stubby young spike for a head and two strap leaves as arms; the cattail
rears tall, its great velvet spike leaning at the foe, one blade swung
forward like a sword, one arched back over the top, seed fluff bursting off.

Palette (one for the line): slate-teal shade (water and shadow), rust brown
(the spike: the accent, mid slot), pale sage (the strap leaves and fluff,
double duty as the light). The blades are two-tone: their lit face sage,
the turned-away face slate, so the twist of each strap reads.

- cattail_shoot: REARING (whole body tipped ~8 deg; the pale spathe hoods
  over the young spike as its brim; the lead leaf droops forward).
  score: 8 (2: close silhouette family to the adult, by design).
- cattail: REARING with a looming top (a longer spike, the hood blade
  arched over it, and the escalation: a straight sword blade thrust at the
  foe; seed fluff drifting off). score: 8 (9: the fluff seed is tiny).
"""

from __future__ import annotations

import math

import numpy as np

import icons_c
from common import icon, squash, recentre
from px import Sprite, bezier, spline

IDS = ["cattail_shoot", "cattail"]

PAL = ["#304858", "#a85828", "#c8e078"]


def blade(s, ctrl, w0, w1, twist=(), tones=(1, 3, 3), line="black", n=60):
    """A strap leaf along a bezier, tapering w0 -> w1. `twist` = list of
    (t0, t1) spans where the blade shows its shadowed underside."""
    c = s.c
    path = bezier(ctrl, n)
    m = c.stroke(path, w0, w1)
    part = s.add(m, tones=tones, shade=(1, 1), line=line)
    under = c.empty()
    for t0, t1 in twist:
        seg = path[int(t0 * (n - 1)):int(t1 * (n - 1)) + 1]
        L = len(path)
        if len(seg) >= 2:
            k0, k1 = int(t0 * (L - 1)), int(t1 * (L - 1))
            ww = [w0 + (w1 - w0) * (k / (L - 1)) for k in range(k0, k1 + 1)]
            under |= c.stroke(seg, max(ww) + 0.5)
    return part, path, under


def spike(s, cx, cy, h, w, ang, tones=(1, 2, 2)):
    """The sausage: a capsule of height h, width w, centred (cx, cy), tilted
    `ang` degrees (negative = top leans left). Returns (part, axis points)."""
    c = s.c
    a = math.radians(ang)
    ux, uy = math.sin(a), -math.cos(a)          # axis, pointing to the top
    top = (cx + ux * (h / 2 - w / 2), cy + uy * (h / 2 - w / 2))
    bot = (cx - ux * (h / 2 - w / 2), cy - uy * (h / 2 - w / 2))
    m = c.stroke([bot, top], w)
    # flatter ends than a capsule: a cylinder with rounded corners
    q0 = (bot[0] - ux * w * 0.18, bot[1] - uy * w * 0.18)
    q1 = (top[0] + ux * w * 0.18, top[1] + uy * w * 0.18)
    m |= c.stroke([q0, q1], w * 0.82)
    part = s.add(m, tones=tones, flat=True, line="black")
    return part, top, bot, (ux, uy)


def shade_spike(s, part, top, bot, ax, w):
    """Cylinder light: a lit sliver down the left, a 2-3px shadow band on
    the right, velvet pocks along the terminator."""
    c = s.c
    ux, uy = ax
    nx, ny = -uy, ux                               # points to the right of the axis
    m = part.mask
    ov = s.t == 2
    sh = c.stroke([(bot[0] + nx * w * 0.42, bot[1] + ny * w * 0.42), (top[0] + nx * w * 0.42, top[1] + ny * w * 0.42)],
                  w * 0.42)
    s.paint(sh & m & ov, 1)
    # shade wraps round the bottom end too
    s.paint(c.circle(bot[0] + nx * 1.5 + ux * -w * 0.25, bot[1] + ny * 1.5 + uy * -w * 0.25, w * 0.5) & m
            & ~c.circle(bot[0] - nx * 1.0 + ux * 1.5, bot[1] - ny * 1.0 + uy * 1.5, w * 0.5) & (s.t == 2), 1)
    return


def ripple(s, cx, cy, rx, ry, tones=(1, 1, 3)):
    """Water ring at the base: an ellipse of dark water with a lit rim."""
    c = s.c
    m = c.ellipse(cx, cy, rx, ry)
    return s.add(m, tones=tones, shade=(0, 1), line="black", flat=True)


# --------------------------------------------------------------------------- shoot

def shoot_front(f=0):
    """REARING out of the water: the sheath bundle rises in an S, the young
    spike tipped ~20 deg at the foe; the lead blade thrust forward and
    down-curving like a blade arm, the rear blade arched up behind. Idle:
    the head bobs 1px and the ripple ring widens."""
    s = Sprite(56, 56, PAL)
    c = s.c
    bob = 0
    # water ring, far edge lifted (3/4)
    wp = ripple(s, 29, 52.2, 17 + (0, 0, 1)[f], 3.6)
    c.pose((31, 52), 8 + (0, 0.8, 1.8)[f], shift=(1, 2))
    # rear arm: a strap arched up and back over the right
    rear = blade(s, [(32, 50), (39, 34), (47, 20), (53, 24 + bob * 0.5)], 8.0, 2.6, twist=[(0.55, 0.8)])
    # torso: the leaf sheath bundle, an S from the water up to the head
    tor = c.curve([(29, 52), (34, 43), (32, 33), (26, 27 + bob)], 12.0, 8.0)
    tp = s.add(tor, tones=(1, 3, 3), shade=(2, 1), line="black")
    # a sheath leaf wrapping the front of the torso (the 3/4 near side)
    wrap = blade(s, [(26, 52), (28.5, 44), (29.5, 36)], 6.0, 2.0, twist=[(0.0, 0.25)])
    # the spathe: a pale bract up the back of the young spike, hooding over
    # its top toward the foe (the brim)
    spathe = blade(s, [(30, 28), (35, 14), (31, 3), (21, 1.5), (13, 5)], 4.8, 1.8, twist=[(0.45, 0.7)])
    # head: the young spike, stubby, tipped at the foe; its bare tip above
    sp, top, bot, (ux, uy) = spike(s, 23, 18 + bob, 22, 10.6, -20)
    tipm = c.stroke([(top[0] + ux * 3, top[1] + uy * 3), (top[0] + ux * 10, top[1] + uy * 10)], 3.4, 2.4)
    s.add(tipm, tones=(1, 3, 3), shade=(1, 0), line="black")
    # lead arm: a long strap thrust forward, curving down at the tip
    lead = blade(s, [(31, 40), (20, 33), (9, 33), (3, 41 - bob * 0.5)], 8.6, 2.8, twist=[(0.45, 0.72)])
    s.render()
    shade_spike(s, sp, top, bot, (ux, uy), 10.6)
    for part, path, under in (rear, lead, wrap, spathe):
        s.paint(under & part.mask, 1, only=[3])
    # ripple: a lit arc on the near water, black wake lines
    ys, xs = np.mgrid[0:56, 0:56]
    e = lambda cy: ((xs + 0.5 - 27) / 13) ** 2 + ((ys + 0.5 - cy) / 1.4) ** 2 <= 1
    s.paint(e(53.6) & ~e(52.6), 3, only=[1])
    # glint: a sliver on the spike's lit top-left shoulder
    gx, gy = c.to_screen(top[0] - 3, top[1])
    gx, gy = int(round(gx)), int(round(gy))
    s.rows(gx, gy, ["3", "3"])
    s.selout(inner=(2, 3))
    s.contact(13, 20)
    s.clean()
    return s


def shoot_back():
    """Behind and above: the young spike, big, leaning to the top right with
    the spathe hooding over it; the sheath bundle wide at the bottom; the
    lead blade thrust out to the right, the rear blade arching left."""
    s = Sprite(48, 48, PAL, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, shift=(0, 3), zoom=1.1)   # closer: the player's creature fills the box
    rear = blade(s, [(16, 48.5), (8, 36), (2, 24), (1, 30)], 9.0, 3.0, twist=[(0.5, 0.75)])
    s.add(c.curve([(19, 48.5), (20, 38), (24, 30)], 17, 12), tones=(1, 3, 3), shade=(3, 1))
    spathe = blade(s, [(18, 34), (14, 18), (20, 4), (32, 1), (40, 6)], 6.0, 2.2, twist=[(0.0, 0.3)])
    sp, top, bot, (ux, uy) = spike(s, 28, 19, 28, 15.0, 16)
    s.add(c.stroke([(top[0] + ux * 5, top[1] + uy * 5), (top[0] + ux * 11, top[1] + uy * 11)], 3.8, 2.6),
          tones=(1, 3, 3), shade=(1, 0))
    lead = blade(s, [(24, 42), (35, 35), (44, 34), (47.5, 42)], 10.0, 3.2, twist=[(0.45, 0.7)])
    s.render()
    shade_spike(s, sp, top, bot, (ux, uy), 15.0)
    for part, path, under in (rear, lead, spathe):
        s.paint(under & part.mask, 1, only=[3])
    s.selout(inner=(2, 3))
    s.clean()
    return s


# --------------------------------------------------------------------------- cattail

def cattail_front(f=0):
    """REARING to a looming height: the whole plant rears ~10 deg at the foe
    out of its water ring; the great velvet spike (exaggerated ~35% fatter)
    is the head, its bare male spike a horn, and the tallest blade arches up
    behind and over it like a hood, its tip hanging over the foe (the brim);
    the lead blade is swung forward and down like a sword; seed fluff bursts
    off the spike. Idle: the body rears 1-2 deg further, the fluff drifts."""
    s = Sprite(56, 56, PAL)
    c = s.c
    d = (0, 1, 3)[f]
    ripple(s, 30, 52.6, 22, 3.4)
    c.pose((33, 52), 9 + (0, 0.8, 1.8)[f], shift=(2, 0))
    # hood blade: up the back, over the top, the tip hanging toward the foe
    rear = blade(s, [(37, 51), (45, 30), (44, 6), (30, 0.5), (19, 5)], 8.6, 2.6, twist=[(0.66, 0.86)])
    # a short tail blade low at the back right
    tail = blade(s, [(36, 51), (45, 45), (53, 43)], 6.4, 2.0, twist=[(0.5, 0.9)])
    # torso: the flowering stem rising in a C, sheathed at the base
    stem = c.curve([(31, 52), (37, 42), (34, 33), (28, 29)], 7.4, 5.4)
    s.add(stem, tones=(1, 3, 3), shade=(1, 0), line="black")
    sheath = blade(s, [(28, 52), (31, 44), (32, 35)], 9.0, 2.8, twist=[(0.0, 0.3)])
    # head: the great velvet spike, horn above
    sp, top, bot, (ux, uy) = spike(s, 24, 18, 32, 14.0, -14)
    horn = c.stroke([(top[0] + ux * 5, top[1] + uy * 5), (top[0] + ux * 11, top[1] + uy * 11)], 3.6, 2.4)
    s.add(horn, tones=(1, 3, 3), shade=(1, 0), line="black")
    # a low blade bracing forward at the waterline
    low = blade(s, [(31, 50), (21, 46), (11, 49)], 6.0, 2.2, twist=[(0.5, 0.9)])
    # lead arm: the sword: a straight blade thrust up and out at the foe,
    # tapering to a point (the escalation over the shoot's drooping leaf)
    lead = blade(s, [(37, 45), (25, 39), (13, 35), (1, 32)], 10.5, 1.4, twist=[(0.5, 0.7)])
    s.render()
    T = lambda q: c.to_screen(*q)
    tops, bots = T(top), T(bot)
    shade_spike(s, sp, top, bot, (ux, uy), 14.0)
    for part, path, under in (rear, lead, sheath, tail, low):
        s.paint(under & part.mask, 1, only=[3])
    # ripple: a lit arc on the near water (screen space)
    ys, xs = np.mgrid[0:56, 0:56]
    near = (((xs + 0.5 - 28) / 17) ** 2 + ((ys + 0.5 - 54) / 1.4) ** 2 <= 1) & \
        ~((((xs + 0.5 - 28) / 17) ** 2 + ((ys + 0.5 - 53) / 1.4) ** 2) <= 1)
    s.paint(near, 3, only=[1])
    # the fluff burst: seeds leaving the spike's upper right (motion cue)
    fx, fy = int(round(tops[0] + 5)), int(round(tops[1] + 3))
    s.rows(fx, fy, [".000.", "03330", ".0330", "..00."])
    s.rows(49 + d // 2, 12 - d, ["_00_", "0330", "_00_"])
    gx, gy = int(round(tops[0] - 4)), int(round(tops[1] + 2))
    s.rows(gx, gy, ["3", "3", "3"])
    s.selout(inner=(2, 3))
    s.contact(9, 15)
    s.clean()
    return s


def cattail_back():
    """Behind and above: the great spike (biggest shape) leaning to the top
    right, horn up; the hood blade arching over it toward the foe; the
    sword blade out to the right; the stem bundle out of frame."""
    s = Sprite(48, 48, PAL, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, shift=(0, 3), zoom=1.04)   # closer: the player's creature fills the box
    hood = blade(s, [(14, 48.5), (5, 30), (8, 8), (22, 0.5), (40, 2)], 9.0, 3.0, twist=[(0.55, 0.85)])
    s.add(c.curve([(19, 48.5), (20, 38), (25, 30)], 16, 12), tones=(1, 3, 3), shade=(3, 1))
    sp, top, bot, (ux, uy) = spike(s, 29, 20, 34, 18.5, 14)
    s.add(c.stroke([(top[0] + ux * 6, top[1] + uy * 6), (top[0] + ux * 12, top[1] + uy * 12)], 4.0, 2.6),
          tones=(1, 3, 3), shade=(1, 0))
    lead = blade(s, [(24, 43), (35, 37), (44, 37), (47.5, 46)], 10.5, 3.4, twist=[(0.45, 0.7)])
    s.render()
    shade_spike(s, sp, top, bot, (ux, uy), 18.5)
    for part, path, under in (hood, lead):
        s.paint(under & part.mask, 1, only=[3])
    s.selout(inner=(2, 3))
    s.clean()
    return s


def make(id_):
    if id_ == "cattail_shoot":
        fr = [shoot_front(k).image() for k in range(3)]
        back = shoot_back()
    else:
        fr = [cattail_front(k).image() for k in range(3)]
        back = cattail_back()
    i1 = icons_c.make_icon(id_, PAL)
    fr = recentre(fr)
    return {"front": fr[0], "front__2": fr[1], "front__3": fr[2], "back": back.image(),
            "icon": i1, "icon__2": squash(i1, 8)}
