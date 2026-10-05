"""Story stills -> public/art/sets/stills/ (assets/stills/<key>.png) (160x144, STILLS).

Full-screen GBC-era illustrations shown by the `still` script op. Each one
is painted from primitives (bands, polygons, ellipses, ASCII stamps) with
its own small named palette, light from the top-left, and dithering only
as a deliberate 2-colour checker pattern (seams, glows, glass).

Composition rule: the bottom 48px sit under the text box, so they are kept
calm (large flat shapes, low contrast) and every focal point lives in the
upper two-thirds.

  bloom               prologue night: the Centuryheart spike opens on the
                      far slope; two figures on the Herbarium roof deck.
  greenhouse_morning  dawn through the glass; three potted seedlings all
                      turned toward the door instead of the sun.
  theft               the empty pot, spilled soil, a boot print, door ajar.
  grove_taps          a tapped maple bleeding gold-sheened sap into a
                      Rootstock pail; grey coats out of focus behind.
  graft_collar        Bram's partner, pale, a steel collar clamped round its
                      stem; his gloved hand; cold light.
  vale_call           Dr. Vale on the telephone at night, lamp light, the
                      Centuryheart seed glowing on the desk.

Deterministic: every random draw comes from a fixed-seed generator.
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

import gbc
from gbc import hexc

W, H = 160, 144
TEXT_TOP = 96          # the text box covers y >= 96


# =============================================================================
# Canvas: a palette-indexed 160x144 painting surface
# =============================================================================
class Canvas:
    def __init__(self, pal: dict[str, str], bg: str):
        self.names = list(pal)
        self.rgba = {k: hexc(v) for k, v in pal.items()}
        self.a = np.full((H, W), self.names.index(bg), np.int16)
        yy, xx = np.mgrid[0:H, 0:W]
        self.yy, self.xx = yy, xx

    # -- colour lookup --------------------------------------------------------
    def i(self, c: str) -> int:
        return self.names.index(c)

    def at(self, x, y) -> str:
        return self.names[self.a[int(y), int(x)]]

    # -- masks ----------------------------------------------------------------
    def m_rect(self, x0, y0, x1, y1):
        return (self.xx >= x0) & (self.xx <= x1) & (self.yy >= y0) & (self.yy <= y1)

    def m_ellipse(self, cx, cy, rx, ry):
        return ((self.xx - cx) / max(rx, 0.01)) ** 2 + ((self.yy - cy) / max(ry, 0.01)) ** 2 <= 1.0

    def m_poly(self, pts):
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).polygon([(round(x), round(y)) for x, y in pts], fill=1, outline=1)
        return np.asarray(im).astype(bool)

    def m_line(self, pts, width=1):
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).line([(round(x), round(y)) for x, y in pts], fill=1, width=width)
        return np.asarray(im).astype(bool)

    def m_of(self, *cols):
        m = np.zeros((H, W), bool)
        for c in cols:
            m |= self.a == self.i(c)
        return m

    # -- painting -------------------------------------------------------------
    def fill(self, mask, c):
        self.a[mask] = self.i(c)

    def checker(self, mask, c, phase=0):
        """Paint c on the checkerboard half of mask (a 50% 2-colour dither)."""
        self.a[mask & (((self.xx + self.yy + phase) % 2) == 0)] = self.i(c)

    def sparse(self, mask, c, phase=0):
        """Paint c on a 25% grid (every other pixel of every other row)."""
        self.a[mask & ((self.yy + phase) % 2 == 0) & ((self.xx + (self.yy // 2) * 1 + phase) % 2 == 0)
               & (((self.xx + phase) // 2 + self.yy // 2) % 2 == 0)] = self.i(c)

    def rect(self, x0, y0, x1, y1, c):
        self.fill(self.m_rect(x0, y0, x1, y1), c)

    def ellipse(self, cx, cy, rx, ry, c):
        self.fill(self.m_ellipse(cx, cy, rx, ry), c)

    def poly(self, pts, c):
        self.fill(self.m_poly(pts), c)

    def line(self, pts, c, width=1):
        self.fill(self.m_line(pts, width), c)

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and c is not None:
            self.a[y, x] = self.i(c)

    def stamp(self, rows, x, y, key, flip=False):
        """ASCII art; key maps chars to colour names ('.'/' ' = skip)."""
        for j, r in enumerate(rows):
            if flip:
                r = r[::-1]
            for k, ch in enumerate(r):
                if ch in ". ":
                    continue
                self.px(x + k, y + j, key[ch])

    def bands(self, y_list, c_list, x0=0, x1=W - 1, seam=True):
        """Horizontal colour bands starting at each y, with a one-row
        checker seam into the next band."""
        for n, (y0, c) in enumerate(zip(y_list, c_list)):
            y1 = y_list[n + 1] - 1 if n + 1 < len(y_list) else H - 1
            self.rect(x0, y0, x1, y1, c)
        if seam:
            for n in range(1, len(y_list)):
                self.checker(self.m_rect(x0, y_list[n] - 1, x1, y_list[n] - 1), c_list[n])

    def glow(self, cx, cy, rings, ry_scale=1.0, only=None):
        """Concentric dithered halo: rings = [(radius, colour, 'solid'|'dith')]
        painted largest first. `only` restricts it to a mask."""
        for r, c, kind in sorted(rings, key=lambda t: -t[0]):
            m = self.m_ellipse(cx, cy, r, r * ry_scale)
            if only is not None:
                m &= only
            if kind == "solid":
                self.fill(m, c)
            else:
                self.checker(m, c)

    def outline(self, mask, c, sides="NESW"):
        """Paint c on pixels just outside mask on the given sides."""
        ring = np.zeros_like(mask)
        if "N" in sides:
            ring[:-1] |= mask[1:]
        if "S" in sides:
            ring[1:] |= mask[:-1]
        if "W" in sides:
            ring[:, :-1] |= mask[:, 1:]
        if "E" in sides:
            ring[:, 1:] |= mask[:, :-1]
        self.fill(ring & ~mask, c)

    def edge(self, mask, c, side):
        """Paint c on the pixels of mask that border outside on `side`."""
        inner = np.zeros_like(mask)
        if side == "N":
            inner[1:] = mask[1:] & ~mask[:-1]
            inner[0] = mask[0]
        if side == "S":
            inner[:-1] = mask[:-1] & ~mask[1:]
        if side == "W":
            inner[:, 1:] = mask[:, 1:] & ~mask[:, :-1]
            inner[:, 0] = mask[:, 0]
        if side == "E":
            inner[:, :-1] = mask[:, :-1] & ~mask[:, 1:]
        self.fill(inner, c)

    def image(self) -> Image.Image:
        lut = np.array([self.rgba[n] for n in self.names], np.uint8)
        return Image.fromarray(lut[self.a], "RGBA")


def rng(seed):
    return np.random.default_rng(seed)


# =============================================================================
# 1. bloom: the Long Bloom from the Herbarium roof deck
# =============================================================================
def bloom() -> Image.Image:
    cv = Canvas({
        # night sky, deepest at the top
        "n0": "#080c20", "n1": "#101838", "n2": "#1c2650", "n3": "#2a3464", "n4": "#3c4274",
        # bloom-lit sky and haze
        "h1": "#584c78", "h2": "#806078",
        "star": "#f8f8f0", "star2": "#98a0d0",
        # far hills and the Centuryheart's slope
        "far": "#1c2448", "farl": "#2c3460",
        "sl0": "#141c34", "sl1": "#202c40", "slr": "#4c5468",
        # valley
        "v0": "#101828", "v1": "#18243a", "riv": "#384c78", "rivg": "#c8a050",
        "lamp": "#f8d868",
        # the Centuryheart
        "c0": "#f8f8d0", "c1": "#f8e070", "c2": "#e0a838", "c3": "#a06828", "c4": "#503018",
        "lf0": "#0c1418", "lf1": "#1c2c30", "lf2": "#38504c",
        # roof deck
        "dk0": "#06080e", "dk1": "#0e1220", "dk2": "#181e30", "dk3": "#262c40",
        "rail": "#303648", "railr": "#8c7050",
        # figures
        "fig": "#06070c", "rim": "#e0b050", "rim2": "#f8e8a0",
    }, "n0")
    R = rng(11)
    SPX, SPY_TOP = 112, 10          # spike centre x, top of the spike

    # --- sky ----------------------------------------------------------------
    cv.bands([0, 14, 28, 40, 50], ["n0", "n1", "n2", "n3", "n4"])
    # the bloom lights the sky around it: warm haze, dithered rings
    sky = cv.yy < 64
    cv.glow(SPX, 32, [(34, "n3", "dith"), (28, "n4", "dith"), (22, "n4", "solid"),
                      (17, "h1", "dith"), (12, "h1", "solid"), (8, "h2", "dith")], 1.5, only=sky)
    # stars: sparse, brightest high up and away from the glow
    for _ in range(44):
        x, y = int(R.integers(0, W)), int(R.integers(1, 46))
        if ((x - SPX) / 34) ** 2 + ((y - 32) / 51) ** 2 < 1:
            continue
        cv.px(x, y, "star" if y < 26 and R.random() < 0.5 else "star2")
    for (x, y) in [(18, 9), (54, 4), (80, 20)]:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.px(x + dx, y + dy, "star2")
        cv.px(x, y, "star")

    # --- far hills (left), then the Centuryheart's slope (right) ------------
    def ridge(x, base, amp, f, ph):
        return base - amp * (0.6 * math.sin(x * f + ph) + 0.4 * math.sin(x * f * 2.3 + ph * 1.7))

    far = np.array([ridge(x, 60, 5, 0.06, 0.4) for x in range(W)])
    cv.fill(cv.yy >= far[cv.xx], "far")
    for x in range(W):                       # moonless: rims lit only near the bloom
        if abs(x - SPX) < 60 and far[x] <= far[max(0, x - 1)] + 0.3:
            cv.px(x, round(far[x]), "farl")

    def slope_y(x):     # rises to the right; the spike stands on its shoulder
        return 74 - 26 / (1 + math.exp(-(x - 96) / 9)) + 1.5 * math.sin(x * 0.21)

    sl = np.array([slope_y(x) for x in range(W)])
    cv.fill(cv.yy >= np.round(sl[cv.xx]), "sl0")
    for x in range(W):                       # lit rim facing the bloom
        y = int(round(sl[x]))
        cv.px(x, y, "slr" if 70 < x < SPX + 22 else "sl1")
        if 78 < x < SPX + 10 and x % 2:
            cv.px(x, y + 1, "sl1")
    # little shrubs along the slope crest, silhouetted
    for x in range(64, W, 5):
        y = int(round(sl[x]))
        h = 1 + (x * 7) % 3
        for k in range(h):
            cv.px(x, y - 1 - k, "sl0")
            cv.px(x + 1, y - k, "sl0")
        cv.px(x - 1, y - h, "slr" if 74 < x < SPX + 20 else "sl1")

    # --- valley: dark fields, hedgerow lines, a river carrying the glow -----
    vtop = 66
    valley = (cv.yy >= vtop) & (cv.yy < np.round(sl[cv.xx]))
    cv.fill(valley & (cv.yy >= vtop), "v1")
    for y0 in (69, 73, 78):
        for x in range(W):
            yy = y0 + int(round((x - 40) * 0.04))
            if (x // 3) % 4 != 3 and valley[min(H - 1, yy), x]:
                cv.px(x, yy, "v0")
    cv.fill(valley & (cv.yy < vtop + 1), "far")
    # Fallowfield's last lamps
    for (x, y) in [(30, 70), (33, 71), (37, 69), (44, 72), (20, 73), (52, 70), (9, 75), (61, 74)]:
        cv.px(x, y, "lamp")
    # a low mist bank in the valley, picking up the pollen light
    cv.checker(valley & (cv.yy >= 66) & (cv.yy <= 67) & (cv.xx > 4) & (cv.xx < 90), "farl")

    # --- the Centuryheart ---------------------------------------------------
    base_y = int(round(sl[SPX])) - 1
    # its light pools on the hillside around it
    ground = cv.m_of("sl0")
    cv.checker(ground & cv.m_ellipse(SPX - 2, base_y + 3, 22, 7), "sl1")
    cv.fill(ground & cv.m_ellipse(SPX - 2, base_y + 2, 12, 3.5), "sl1")
    cv.checker(ground & cv.m_ellipse(SPX - 3, base_y + 1, 7, 2), "slr")
    # a few far trees standing on the ridge, black against the haze
    for (x, h) in [(132, 9), (139, 12), (146, 8), (153, 11)]:
        y = int(round(sl[x]))
        cv.fill(cv.m_poly([(x - 3, y), (x, y - h), (x + 3, y)]), "sl0")
        cv.px(x, y - h, "sl1")
    # rosette of spear leaves, black against the lit slope, tips catching gold
    for n, ang in enumerate(np.linspace(math.pi * 0.95, math.pi * 0.05, 11)):
        L = 9 + 4 * math.sin(n * 1.9) ** 2
        tip = (SPX + math.cos(ang) * L, base_y - math.sin(ang) * L * 0.7)
        cv.poly([(SPX - 1.5, base_y + 1), tip, (SPX + 1.5, base_y + 1)], "lf1")
        cv.px(*tip, "lf2")
    cv.ellipse(SPX, base_y, 4, 2, "lf0")

    def cx(y):          # a slight lean toward the valley, like the title
        t = (base_y - y) / (base_y - SPY_TOP)
        return SPX - 1.5 * math.sin(t * 2.6)

    stalk_top = base_y - 8
    for y in range(stalk_top, base_y + 1):
        cv.px(cx(y) - 1, y, "lf2")
        cv.px(cx(y), y, "lf1")
    spike = np.zeros((H, W), np.int8)
    for y in range(SPY_TOP, stalk_top + 1):
        t = (stalk_top - y) / (stalk_top - SPY_TOP)
        w = 0.8 + 4.6 * (1 - t) ** 0.8 * min(1.0, (t + 0.06) * 5)
        w += 0.6 if (y // 2) % 2 else 0
        c = cx(y)
        for x in range(int(c - w - 1), int(c + w + 2)):
            if abs(x - c) <= w:
                u = (x - (c - w)) / (2 * w)
                spike[y, x] = 2 if u < 0.32 else 3 if u < 0.7 else 4
    # florets: staggered clusters, lit top-left; the upper third still in bud
    for y in range(SPY_TOP + 1, stalk_top, 2):
        t = (stalk_top - y) / (stalk_top - SPY_TOP)
        c = cx(y)
        w = 0.8 + 4.6 * (1 - t) ** 0.8 * min(1.0, (t + 0.06) * 5)
        x = c - w + (0 if (y // 2) % 2 else 1.5)
        while x <= c + w:
            xi = int(round(x))
            if spike[y, xi]:
                b = spike[y, xi]
                spike[y, xi] = max(1, b - 1)
                if spike[y - 1, xi - 1] and b <= 3:
                    spike[y - 1, xi - 1] = 1
                if spike[y + 1, xi + 1]:
                    spike[y + 1, xi + 1] = min(5, b + 1)
            x += 3
    cols = ["c0", "c1", "c2", "c3", "c4"]
    for y, x in zip(*np.nonzero(spike)):
        cv.px(x, y, cols[spike[y, x] - 1])
    for y in range(SPY_TOP, stalk_top + 1):
        xs = np.nonzero(spike[y])[0]
        if len(xs):
            cv.px(xs[-1], y, "c4")
    tx = int(round(cx(SPY_TOP)))
    for dx, dy, c in [(0, -1, "c0"), (0, -2, "c1"), (0, -3, "c0"), (-1, -1, "c1"), (1, -1, "c2")]:
        cv.px(tx + dx, SPY_TOP + dy, c)
    for dx, dy in [(-3, -3), (3, -2), (0, -6), (-4, 1), (4, 2)]:
        cv.px(tx + dx, SPY_TOP + dy, "c0")

    # --- pollen: a long drift down-left over the valley toward the deck -----
    for n in range(70):
        t = R.random() ** 0.9
        x = SPX - 6 - t * 104 + R.normal(0, 5)
        y = SPY_TOP + 16 + t * 46 + 7 * math.sin(t * 6 + n) + R.normal(0, 4)
        if not (0 <= x < W and 0 <= y < 84) or spike[int(y), int(x)]:
            continue
        if R.random() < 0.13:
            cv.px(x, y, "c0")
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.px(x + dx, y + dy, "c2")
        else:
            cv.px(x, y, "c1" if R.random() < 0.7 else "c2")

    # --- the roof deck --------------------------------------------------------
    # rail at y=82; deck floor below in calm dark planks
    deck_top = 90
    cv.rect(0, deck_top, W - 1, H - 1, "dk1")
    for k in range(-6, 14):
        x_far = 80 + k * 9
        x_near = 80 + k * 26
        cv.line([(x_far, deck_top), (x_near, H + 10)], "dk0")
    cv.rect(0, deck_top, W - 1, deck_top, "dk2")
    cv.checker(cv.m_rect(0, deck_top + 1, W - 1, deck_top + 1), "dk2")
    # parapet + railing: posts and a top rail, lit gold on top from the bloom
    cv.rect(0, 87, W - 1, deck_top - 1, "dk2")
    cv.rect(0, 87, W - 1, 87, "dk3")
    for x in range(0, W):                    # balusters: thin bars
        if x % 4 == 2:
            cv.rect(x, 80, x, 86, "dk3")
    for x in range(4, W, 16):
        cv.rect(x, 79, x + 1, 86, "rail")
    cv.rect(0, 78, W - 1, 79, "rail")
    cv.rect(0, 78, W - 1, 78, "railr")
    # brass telescope on a tripod, aimed at the bloom (right side of deck)
    cv.line([(138, 89), (144, 72)], "dk0")
    cv.line([(151, 89), (145, 72)], "dk0")
    cv.line([(145, 89), (145, 72)], "dk0")
    cv.line([(136, 62), (154, 70)], "dk0", width=3)
    cv.line([(136, 61), (153, 68)], "railr")
    cv.px(135, 61, "rim")
    # a potted fern on the parapet, left
    cv.poly([(6, 85), (16, 85), (14, 91), (8, 91)], "dk0")
    for ang in np.linspace(math.pi * 0.88, math.pi * 0.12, 7):
        cv.line([(11, 84), (11 + math.cos(ang) * 9, 84 - math.sin(ang) * 7)], "dk0")

    # --- two figures at the rail, looking up at the bloom ---------------------
    fig = np.zeros((H, W), bool)
    # VALE: big wavy hair to the shoulders, lab coat flaring, one arm raised
    # to point at the spike.
    fig |= cv.m_rect(45, 86, 46, 92) | cv.m_rect(50, 86, 51, 92)                 # legs
    fig |= cv.m_poly([(44, 76), (54, 76), (57, 87), (41, 87)])                  # coat
    fig |= cv.m_ellipse(48.5, 70.5, 6.2, 6.0)                                   # hair mass
    fig |= cv.m_ellipse(43.5, 75, 2.2, 2.6) | cv.m_ellipse(53.5, 74.5, 2.0, 2.4)  # curls on the shoulders
    for (x, y) in [(42, 68), (41, 72), (55, 70), (47, 64), (51, 64), (40, 77), (56, 76)]:
        fig |= cv.m_rect(x, y, x, y)
    fig |= cv.m_line([(54, 78), (62, 68)], 2)                                    # pointing arm
    fig |= cv.m_rect(62, 66, 63, 67) | cv.m_rect(64, 65, 64, 65)                 # hand, finger
    # the player: cap with the brim turned to the bloom, satchel on the back
    fig |= cv.m_rect(67, 87, 68, 92) | cv.m_rect(71, 87, 72, 92)
    fig |= cv.m_poly([(66, 79), (74, 79), (75, 87), (65, 87)])
    fig |= cv.m_ellipse(63.5, 82.5, 2.0, 3.0)                                   # satchel
    fig |= cv.m_ellipse(70, 75, 3.6, 3.6)
    fig |= cv.m_ellipse(69.5, 72.6, 4.0, 2.4) | cv.m_rect(73, 73, 76, 73)        # cap + brim
    cv.fill(fig, "fig")
    # gold rim light where an edge faces the bloom (up and to the right)
    ne_open = ~np.roll(np.roll(fig, 1, 0), -1, 1)
    e_open = ~np.roll(fig, -1, 1)
    lit = fig & ne_open & (cv.yy < 84)
    cv.fill(lit, "rim")
    cv.fill(fig & ne_open & e_open & (cv.yy < 72), "rim2")
    for (x, y) in [(64, 65), (76, 73)]:
        cv.px(x, y, "rim2")
    return cv.image()


# =============================================================================
# Shared props
# =============================================================================
def leaf(cv: Canvas, base, tip, width, lit, shade, rib=None, bulge=0.45):
    """A lens-shaped leaf from base to tip. The half facing up-left is lit,
    the other half shaded; an optional midrib colour."""
    (bx, by), (tx, ty) = base, tip
    dx, dy = tx - bx, ty - by
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L                     # unit normal
    mx, my = bx + dx * bulge, by + dy * bulge
    a = (mx + nx * width, my + ny * width)
    b = (mx - nx * width, my - ny * width)
    # which side faces the light (up-left = -x, -y)?
    lit_side, dark_side = (a, b) if (nx * -1 + ny * -1) > 0 else (b, a)
    cv.poly([base, dark_side, tip], shade)
    cv.poly([base, lit_side, tip], lit)
    if rib:
        cv.line([base, (bx + dx * 0.8, by + dy * 0.8)], rib)


def pot(cv: Canvas, cx, top, w, h, c0, c1, c2, c3, soil=None, soil2=None):
    """A terracotta pot: rim band, tapered body lit from the left."""
    half = w / 2
    body = cv.m_poly([(cx - half + 1, top + 3), (cx + half - 1, top + 3),
                      (cx + half - 3, top + h), (cx - half + 3, top + h)])
    cv.fill(body, c1)
    cv.fill(body & (cv.xx >= cx + half * 0.25), c2)
    cv.fill(body & (cv.xx <= cx - half * 0.55), c0)
    cv.edge(body, c3, "E")
    cv.edge(body, c3, "S")
    rim = cv.m_rect(cx - half, top, cx + half - 1, top + 2)
    cv.fill(rim, c1)
    cv.fill(rim & (cv.yy == top), c0)
    cv.fill(rim & (cv.xx >= cx + half * 0.4), c2)
    cv.fill(rim & (cv.yy == top + 2), c2)
    cv.fill(cv.m_rect(cx - half, top + 2, cx + half - 1, top + 2) & (cv.xx >= cx + half * 0.4), c3)
    if soil:
        cv.rect(cx - half + 1, top, cx + half - 2, top, soil)
        if soil2:
            cv.checker(cv.m_rect(cx - half + 1, top, cx + half - 2, top), soil2)


# =============================================================================
# 2. greenhouse_morning: three seedlings turned toward the door
# =============================================================================
def greenhouse_morning() -> Image.Image:
    cv = Canvas({
        # dawn sky through the glass
        "k0": "#a8c0e8", "k1": "#d0c8e0", "k2": "#f0c8b8", "k3": "#f8d8a8", "sun": "#f8f8d8",
        "hill": "#b898b8", "hill2": "#9880a8", "hedge": "#7c7898",
        # glazing bars (white-painted iron) and the shadowed interior
        "bar0": "#f8f0e0", "bar1": "#c8b8b0", "bar2": "#806878",
        "in0": "#584860", "in1": "#6c5870", "in2": "#806878",
        # bench wood
        "o0": "#f8d8a0", "o1": "#d8a060", "o2": "#a06830", "o3": "#583828",
        # terracotta
        "t0": "#f8b088", "t1": "#d87050", "t2": "#a04838", "t3": "#602828",
        "soil": "#483028", "soil2": "#684030",
        # seedlings
        "g0": "#e0f8a0", "g1": "#a0d868", "g2": "#58a040", "g3": "#286038",
        "ac0": "#e8a850", "ac1": "#b87030", "cap0": "#a87040", "cap1": "#684020",
        "white": "#f8f8f0", "wsh": "#c8d8b0",
        "pd0": "#e8a0b0", "pd1": "#b05070", "pd2": "#702848",
        # metal (watering can)
        "m0": "#c8d0d8", "m1": "#8890a8", "m2": "#505870",
        # floor
        "fl0": "#9c8890", "fl1": "#806c7c", "fl2": "#6c5870",
    }, "in1")
    # --- the back wall: glass panes in white glazing bars -------------------
    sky = cv.m_rect(0, 0, 159, 62)
    cv.bands([0, 10, 22, 34, 44], ["k0", "k1", "k2", "k3", "k3"])
    # the sun just clear of the far hills, up and to the left
    cv.glow(28, 42, [(18, "k3", "solid"), (14, "sun", "dith"), (9, "sun", "solid")], 1.0, only=sky)
    hills = np.array([49 - 4 * math.sin(x * 0.045 + 1.2) - 2 * math.sin(x * 0.13) for x in range(W)])
    cv.fill(sky & (cv.yy >= np.round(hills[cv.xx])), "hill")
    far2 = np.array([54 - 2 * math.sin(x * 0.09 + 0.3) - 1.5 * abs(math.sin(x * 0.31)) for x in range(W)])
    cv.fill(sky & (cv.yy >= np.round(far2[cv.xx])), "hill2")
    hedge = np.array([58 - 1.6 * abs(math.sin(x * 0.42)) - 1.2 * abs(math.sin(x * 0.17 + 1)) for x in range(W)])
    cv.fill(sky & (cv.yy >= np.round(hedge[cv.xx])), "hedge")
    # glazing bars, with a glint struck diagonally across some panes
    for x0 in range(0, W, 26):
        for y0, y1 in ((2, 19), (22, 41)):
            if (x0 // 26) % 2 == 0:
                for k in range(0, 4):
                    cv.px(x0 + 14 - k + (y0 - 2) // 6, y0 + 4 + k, "bar0")
                    cv.px(x0 + 18 - k + (y0 - 2) // 6, y0 + 4 + k, "bar0")
    for x0 in range(0, W, 26):
        cv.rect(x0, 0, x0 + 1, 62, "bar1")
        cv.rect(x0, 0, x0, 62, "bar0")
    for y0 in (20, 42):
        cv.rect(0, y0, W - 1, y0 + 1, "bar1")
        cv.rect(0, y0, W - 1, y0, "bar0")
    cv.rect(0, 62, W - 1, 64, "bar1")
    cv.rect(0, 62, W - 1, 62, "bar0")
    cv.rect(0, 65, W - 1, 66, "bar2")

    # --- the door on the right: glazed, with a little sign ------------------
    cv.fill(cv.m_rect(121, 5, 154, 94), "bar2")
    cv.fill(cv.m_rect(122, 6, 153, 94), "bar1")
    cv.fill(cv.m_rect(124, 8, 151, 92), "in2")
    for (y0, y1) in ((10, 44), (48, 70)):
        g = cv.m_rect(127, y0, 148, y1)
        cv.fill(g, "k2")
        cv.fill(g & (cv.yy < y0 + 8), "k1")
        cv.fill(g & (cv.yy > y1 - 6), "k3")
        cv.edge(g, "bar0", "N")
    for k in range(5):                           # door-glass glint
        cv.px(134 - k, 14 + k, "bar0")
        cv.px(137 - k, 14 + k, "bar0")
    cv.rect(137, 10, 138, 44, "bar1")
    cv.rect(127, 74, 148, 90, "in1")
    cv.rect(127, 74, 148, 74, "bar1")
    cv.rect(124, 8, 124, 92, "bar0")
    cv.rect(143, 76, 145, 78, "o0")             # brass knob
    cv.px(145, 78, "o2")
    cv.line([(132, 52), (137, 49), (142, 52)], "o3")   # hanging card on the glass
    cv.rect(131, 52, 143, 58, "bar0")
    cv.rect(132, 58, 143, 58, "bar1")
    cv.rect(133, 54, 141, 54, "bar1")
    cv.rect(133, 56, 139, 56, "bar1")

    # --- light shafts, floor, bench --------------------------------------
    def shaft(x_top, w):
        return cv.m_poly([(x_top, 66), (x_top + w, 66), (x_top + w + 46, 144), (x_top + 46, 144)])
    rays = shaft(-4, 18) | shaft(34, 10) | shaft(62, 14)

    cv.rect(0, 92, W - 1, 143, "fl1")
    cv.rect(0, 92, W - 1, 92, "fl2")
    for y in (100, 112, 128):
        cv.rect(0, y, W - 1, y, "fl2")
    for k in range(-8, 12):
        cv.line([(80 + k * 14, 93), (80 + k * 22, 143)], "fl2")
    cv.checker(rays & (cv.yy > 92), "fl0")
    cv.checker(rays & cv.m_rect(0, 67, 120, 91), "in2")

    top_y, front_y = 74, 81
    cv.rect(2, top_y, 118, front_y - 1, "o1")
    cv.rect(2, top_y, 118, top_y, "o0")
    cv.rect(2, front_y, 118, front_y + 7, "o2")
    cv.rect(2, front_y, 118, front_y, "o3")
    for x in (4, 58, 112):
        cv.rect(x, front_y + 8, x + 4, 110, "o3")
        cv.rect(x, front_y + 8, x, 110, "o2")
    cv.rect(2, front_y + 7, 118, front_y + 7, "o3")
    for x in range(14, 118, 18):
        cv.rect(x, front_y + 1, x, front_y + 6, "o3")
    cv.checker(rays & cv.m_rect(2, top_y + 1, 118, front_y - 1), "o0")
    cv.checker(rays & cv.m_rect(2, front_y + 1, 118, front_y + 6), "o1")

    # --- three seedlings, every one turned toward the door ---------------
    def stem(pts, lit="g1", body="g2"):
        cv.line(pts, body, 2)
        cv.line([(x - 1, y) for x, y in pts[:-1]], lit)

    POT_TOP, PW, PH = 59, 20, 16
    for x in (30, 62, 94):                     # each pot casts a shadow down-right
        cv.fill(cv.m_poly([(x + 4, 74), (x + 9, 74), (x + 16, 79), (x + 8, 79)]), "o2")
    # oak: the split acorn half-sunk in the soil, its shoot arching right
    pot(cv, 30, POT_TOP, PW, PH, "t0", "t1", "t2", "t3", "soil", "soil2")
    stem([(28, 50), (29, 44), (33, 38), (40, 33), (45, 32)])
    leaf(cv, (33, 41), (46, 40), 3.4, "g1", "g2", "g3")
    leaf(cv, (39, 34), (50, 27), 3.2, "g0", "g1", "g2")
    leaf(cv, (30, 47), (23, 39), 2.4, "g1", "g2")
    for (x, y) in [(41, 37), (45, 37), (44, 30), (47, 32)]:     # oak-leaf lobes
        cv.px(x, y, "in1" if cv.at(x, y) in ("g1", "g0") else cv.at(x, y))
    acorn = cv.m_ellipse(26, 54, 4.5, 4.5)
    cv.fill(acorn, "ac1")
    cv.fill(acorn & cv.m_ellipse(24.5, 53, 2.5, 3), "ac0")
    cv.px(27, 57, "cap1")
    cv.ellipse(26, 50.5, 5.5, 2.4, "cap1")
    cv.checker(cv.m_ellipse(25, 50, 4.5, 1.6), "cap0")
    cv.line([(27, 49), (28, 47)], "g2")
    cv.rect(21, 58, 32, 59, "soil")
    # chili: a slim stem and a white star-flower nodding toward the door
    pot(cv, 62, POT_TOP, PW, PH, "t0", "t1", "t2", "t3", "soil", "soil2")
    stem([(60, 59), (60, 48), (63, 39), (69, 32), (74, 31)])
    leaf(cv, (61, 50), (73, 46), 3.0, "g1", "g2", "g3")
    leaf(cv, (62, 43), (72, 37), 2.6, "g0", "g1", "g2")
    leaf(cv, (60, 53), (51, 47), 2.4, "g1", "g2")
    cv.stamp([
        "...ww...",
        ".w.ww.ww",
        "wwwwwwww",
        ".wwGgww.",
        "..wggwwS",
        ".wwwwSS.",
        "ww.wS...",
        "w...S...",
    ], 73, 26, {"w": "white", "S": "wsh", "G": "g2", "g": "g3"})
    # lily: the spiky maroon seedpod, its tip bent over toward the door
    pot(cv, 94, POT_TOP, PW, PH, "t0", "t1", "t2", "t3", "soil", "soil2")
    leaf(cv, (92, 58), (82, 54), 2.6, "g1", "g2")
    leaf(cv, (96, 58), (106, 55), 2.6, "g1", "g2")
    cv.ellipse(94, 49, 6, 9, "pd1")
    cv.poly([(89, 44), (95, 36), (101, 34), (106, 34), (100, 40), (99, 46)], "pd1")
    cv.fill(cv.m_ellipse(94, 49, 6, 9) & (cv.xx >= 96), "pd2")
    cv.fill(cv.m_poly([(97, 39), (101, 34), (106, 34), (100, 41)]), "pd2")
    cv.fill(cv.m_ellipse(91.5, 47, 2, 5), "pd0")
    cv.line([(92, 42), (97, 37)], "pd0")
    for (x, y) in [(87, 47), (87, 52), (88, 42), (101, 50), (101, 45), (100, 55), (93, 39)]:
        cv.px(x, y, "pd2")
    cv.px(107, 33, "pd2")
    for x in (91, 94, 97):                     # ribs
        cv.line([(x, 52), (x + 1, 57)], "pd2" if x > 92 else "pd1")
    # plant labels, all leaning the same way too
    for x in (37, 69, 101):
        cv.rect(x, 55, x + 1, 60, "bar0")
        cv.px(x + 1, 60, "bar1")
    # a watering can at the left end of the bench
    cv.stamp([
        "....mmmmm.......",
        "...m.....m......",
        "...m.....m...mmm",
        "..mmmmmmmmm..mAm",
        "..AAAAAAaam.m.m.",
        ".AAAAAAAaaMm.m..",
        ".AAAAAAaaaMmm...",
        ".AAAAAAaaaMm....",
        ".AAAAAaaaaMm....",
        ".AAAAAaaaaMm....",
        ".AAAAaaaaaMm....",
        "..mmmmmmmmm.....",
    ], 2, 62, {"m": "m2", "A": "m0", "a": "m1", "M": "m1"})
    # a hanging fern basket framing the top-left corner
    cv.line([(12, 0), (6, 14)], "o3")
    cv.line([(12, 0), (18, 14)], "o3")
    for n, ang in enumerate(np.linspace(math.pi * 1.05, -math.pi * 0.05, 9)):
        L = 10 + 3 * (n % 2)
        tip = (12 + math.cos(ang) * L, 15 + abs(math.sin(ang)) * -4 + (L - 6) * 0.9 * (1 if abs(math.cos(ang)) > 0.5 else 0.2))
        leaf(cv, (12, 15), tip, 1.6, "g2" if n % 2 else "g1", "g3")
    for n, x in enumerate((3, 8, 14, 20)):
        leaf(cv, (x + 2, 16), (x - 1 + n, 27 + (n % 2) * 3), 1.4, "g2", "g3")
    cv.ellipse(12, 17, 7, 3.5, "o2")
    cv.fill(cv.m_ellipse(12, 17, 7, 3.5) & (cv.yy <= 15), "o1")
    cv.fill(cv.m_ellipse(12, 17, 7, 3.5) & (cv.xx >= 15) & (cv.yy > 15), "o3")
    cv.checker(cv.m_ellipse(12, 17, 6, 2.5) & (cv.yy > 15), "o3")
    return cv.image()


# =============================================================================
# 3. theft: the empty pot
# =============================================================================
def theft() -> Image.Image:
    cv = Canvas({
        # overcast morning through the glass, a cold cast over everything
        "k0": "#e0e8e8", "k1": "#c0ccd4", "k2": "#98a8b8", "gd0": "#88a090", "gd1": "#607868",
        "bar0": "#e8e8e0", "bar1": "#a8a8a8", "bar2": "#686874",
        "in0": "#3c4050", "in1": "#4c5262", "in2": "#5c6474",
        "fl0": "#a8acb0", "fl1": "#8c9098", "fl2": "#70747e",
        "o0": "#e0c098", "o1": "#b88858", "o2": "#885c38", "o3": "#4c3024",
        "t0": "#f0a080", "t1": "#c86848", "t2": "#904034", "t3": "#4c2024",
        "s0": "#80583c", "s1": "#5c3c2c", "s2": "#3c241c", "s3": "#24140f",
        "root": "#d8c8a0", "lbl": "#f0f0e8",
    }, "in1")
    R = rng(23)
    # --- back wall: glass in iron bars; a grey garden beyond ---------------
    cv.bands([0, 14, 30], ["k0", "k1", "k2"])
    cv.fill(cv.m_rect(0, 36, 159, 46), "gd0")
    for x in range(0, W, 2):
        cv.rect(x, 33 + int(2 * abs(math.sin(x * 0.37))), x + 1, 40, "gd0")
    cv.fill(cv.m_rect(0, 42, 159, 46), "gd1")
    for x0 in range(0, W, 24):
        cv.rect(x0, 0, x0 + 1, 46, "bar1")
        cv.rect(x0, 0, x0, 46, "bar0")
        for k in range(4):
            cv.px(x0 + 12 - k, 6 + k, "bar0")
    cv.rect(0, 22, W - 1, 23, "bar1")
    cv.rect(0, 22, W - 1, 22, "bar0")
    cv.rect(0, 46, W - 1, 48, "bar1")
    cv.rect(0, 46, W - 1, 46, "bar0")
    cv.rect(0, 49, W - 1, 50, "in0")
    # low brick plinth under the glass
    for y in range(52, 80, 4):
        cv.rect(0, y, 114, y, "in0")
        for x in range(((y // 4) % 2) * 6, 115, 12):
            cv.rect(x, y, x, y + 3, "in0")
    cv.checker(cv.m_rect(0, 51, 114, 51), "in2")

    # --- the door, ajar: daylight cuts in round its edge ---------------------
    cv.rect(115, 2, 157, 88, "bar2")             # frame
    cv.rect(117, 4, 155, 88, "k0")               # the opening: bright outside
    cv.fill(cv.m_rect(117, 40, 155, 88), "gd0")  # garden path beyond, pale
    cv.fill(cv.m_poly([(129, 88), (141, 88), (137, 48), (132, 48)]), "fl0")
    cv.fill(cv.m_rect(117, 34, 155, 40), "k1")
    # the door leaf swung in toward us, hinged on the left
    leaf_m = cv.m_poly([(117, 4), (141, -2), (141, 94), (117, 88)])
    cv.fill(cv.m_rect(141, 4, 155, 88), "k0")
    cv.fill(cv.m_rect(141, 40, 155, 88), "gd0")
    cv.fill(cv.m_poly([(144, 88), (150, 88), (148, 48), (146, 48)]), "fl0")
    cv.fill(leaf_m, "bar1")
    cv.fill(cv.m_poly([(120, 8), (138, 3), (138, 44), (120, 46)]), "k2")
    cv.fill(cv.m_poly([(120, 50), (138, 49), (138, 90), (120, 85)]), "in2")
    cv.line([(141, -2), (141, 94)], "bar0")
    cv.line([(142, 0), (142, 94)], "bar2")
    cv.line([(120, 8), (138, 3)], "bar0")
    for k in range(5):
        cv.px(130 - k, 11 + k, "k0")
        cv.px(133 - k, 11 + k, "k0")
    cv.rect(135, 60, 136, 63, "o0")              # handle
    cv.px(136, 63, "o2")
    cv.fill(cv.m_poly([(117, 88), (141, 94), (141, 96), (117, 90)]), "in0")   # its shadow on the floor
    # the wedge of daylight on the floor, out through the gap
    wedge = cv.m_poly([(144, 88), (156, 88), (133, 149), (84, 149)])

    # --- floor ------------------------------------------------------------
    floor = cv.m_rect(0, 80, W - 1, H - 1) & ~cv.m_rect(110, 0, 159, 88)
    cv.fill(floor, "fl1")
    for y in (88, 102, 122):
        cv.fill(floor & (cv.yy == y), "fl2")
    for k in range(-6, 12):
        cv.line([(70 + k * 16, 80), (70 + k * 26, 144)], "fl2")
    cv.fill(floor & wedge, "fl0")
    cv.rect(0, 80, 114, 80, "in0")

    # --- the bench -----------------------------------------------------------
    top_y, front_y = 56, 72
    cv.fill(cv.m_poly([(0, top_y), (84, top_y), (88, front_y - 1), (0, front_y - 1)]), "o1")
    cv.rect(0, top_y, 84, top_y, "o0")
    for y in (60, 65):                           # plank joints
        cv.line([(0, y), (85 + (y - top_y) // 4, y)], "o2")
    cv.rect(0, front_y, 88, front_y + 8, "o2")
    cv.rect(0, front_y, 88, front_y, "o0")
    cv.rect(0, front_y + 8, 88, front_y + 8, "o3")
    cv.rect(88, top_y + 1, 89, front_y + 8, "o3")
    cv.rect(80, front_y + 9, 85, 120, "o3")
    cv.rect(4, front_y + 9, 9, 120, "o3")
    cv.rect(80, front_y + 9, 80, 120, "o2")
    cv.rect(4, front_y + 9, 4, 120, "o2")

    # --- the empty pot, big, centre-left ------------------------------------
    PX, PT = 40, 24
    cv.fill(cv.m_poly([(PX + 4, PT + 36), (PX + 16, PT + 36), (PX + 28, front_y - 2), (PX + 10, front_y - 2)])
            & (cv.yy >= top_y), "o2")            # cast shadow on the bench
    # body: tapered, lit from the left, a dark band in the shadow under the rim
    body = cv.m_poly([(PX - 17, PT + 8), (PX + 17, PT + 8), (PX + 13, PT + 35), (PX - 13, PT + 35)])
    body |= cv.m_ellipse(PX, PT + 35, 13, 2) & (cv.yy >= PT + 35)
    cv.fill(body, "t1")
    cv.fill(body & (cv.xx <= PX - 8), "t0")
    cv.checker(body & (cv.xx > PX - 8) & (cv.xx <= PX - 6), "t0")
    cv.fill(body & (cv.xx >= PX + 6), "t2")
    cv.checker(body & (cv.xx >= PX + 4) & (cv.xx < PX + 6), "t2")
    cv.fill(body & (cv.xx >= PX + 12), "t3")
    cv.fill(body & (cv.yy <= PT + 9), "t2")
    cv.fill(body & (cv.yy <= PT + 9) & (cv.xx >= PX + 6), "t3")
    cv.edge(body, "t3", "S")
    # rim: a thick rolled band with the opening on top
    band = cv.m_ellipse(PX, PT + 3, 19, 4) | cv.m_rect(PX - 19, PT + 3, PX + 19, PT + 7) | cv.m_ellipse(PX, PT + 7, 19, 4)
    band &= cv.yy <= PT + 9
    cv.fill(band, "t1")
    cv.fill(band & (cv.xx <= PX - 9), "t0")
    cv.fill(band & (cv.xx >= PX + 8), "t2")
    cv.fill(band & (cv.xx >= PX + 16), "t3")
    cv.fill(band & ~np.roll(band, -1, 0), "t3")
    cv.fill(band & cv.m_rect(PX - 17, PT + 5, PX + 4, PT + 5), "t0")       # the rolled lip's highlight
    mouth = cv.m_ellipse(PX, PT + 3, 16, 2.8)
    cv.fill(mouth, "s1")
    cv.fill(mouth & (cv.yy <= PT + 2), "t3")             # inner wall, far side in shadow
    cv.fill(mouth & (cv.yy == PT + 3) & (cv.xx > PX + 8), "s2")
    # the crater where the seedling was: a dark hole, a torn root hanging out
    cv.ellipse(PX + 1, PT + 4, 6, 1.6, "s3")
    cv.fill(cv.m_ellipse(PX + 1, PT + 4, 6, 1.6) & (cv.yy <= PT + 3), "s2")
    for (x, y) in [(PX - 9, PT + 4), (PX - 6, PT + 5), (PX + 10, PT + 4), (PX - 12, PT + 3)]:
        cv.px(x, y, "s0")
    cv.line([(PX + 5, PT + 4), (PX + 9, PT + 1), (PX + 14, PT + 1), (PX + 18, PT + 5), (PX + 20, PT + 12)], "root")
    cv.px(PX + 21, PT + 13, "root")
    cv.line([(PX + 3, PT + 5), (PX + 1, PT + 7)], "root")
    # a crack running down the pot from the rim
    cv.line([(PX - 4, PT + 10), (PX - 2, PT + 15), (PX - 4, PT + 19), (PX - 3, PT + 23)], "t3")

    # --- spilled soil: clods across the bench, a trail over the edge --------
    benchtop = cv.m_poly([(0, top_y + 1), (84, top_y + 1), (87, front_y - 1), (0, front_y - 1)])
    heap = cv.m_poly([(PX + 12, top_y + 3), (PX + 22, top_y + 2), (PX + 40, top_y + 5),
                      (PX + 44, top_y + 9), (PX + 30, top_y + 11), (PX + 16, top_y + 9)])
    cv.fill(heap & benchtop, "s1")
    cv.fill(heap & benchtop & cv.m_ellipse(PX + 26, top_y + 5, 7, 1.6), "s0")
    cv.edge(heap & benchtop, "s2", "S")
    for _ in range(26):                          # clods: lit on top, dark beneath
        x = int(PX + 8 + R.random() * 52)
        y = int(top_y + 3 + R.random() * 11)
        if benchtop[y, x] and benchtop[y + 1, x + 1] and not heap[y, x]:
            cv.px(x, y, "s1")
            cv.px(x + 1, y, "s1" if R.random() < 0.5 else "s2")
            cv.px(x, y + 1, "s2")
            cv.px(x + 1, y + 1, "s2")
            cv.px(x, y - 1, "s0") if R.random() < 0.5 else None
    for (x, y) in [(PX + 30, front_y), (PX + 31, front_y + 1), (PX + 32, front_y + 3), (PX + 34, front_y + 5),
                   (PX + 29, front_y + 2), (PX + 36, front_y + 7)]:
        cv.px(x, y, "s1")
    # one torn leaf left behind on the bench
    leaf(cv, (PX + 50, top_y + 4), (PX + 41, top_y + 8), 2.2, "gd0", "gd1")
    cv.px(PX + 51, top_y + 3, "gd1")
    # the plant label, knocked flat
    cv.line([(PX - 22, top_y + 9), (PX - 8, top_y + 6)], "lbl", 2)
    cv.line([(PX - 22, top_y + 11), (PX - 8, top_y + 8)], "o2")
    cv.line([(PX - 19, top_y + 8), (PX - 13, top_y + 7)], "bar1")

    # --- boot prints in soil, in the light, heading for the door --------------
    sole = [
        "...######...",
        ".##########.",
        "############",
        "#..........#",
        "############",
        "#..........#",
        "############",
        ".#........#.",
        ".##########.",
        "..########..",
        "............",
        "..########..",
        ".#........#.",
        ".##########.",
        "..########..",
    ]
    def boot(rows, x, y, ink, tread):
        """Stamp a sole, sheared so the toe points up-right toward the door;
        gaps inside the outline are tread grooves."""
        for j, r in enumerate(rows):
            off = (len(rows) - j) // 3
            if "#" not in r:
                continue
            first, last = r.index("#"), r.rindex("#")
            for k, ch in enumerate(r):
                if ch == "#":
                    cv.px(x + off + k, y + j, ink)
                elif first < k < last and tread:
                    cv.px(x + off + k, y + j, tread)
    boot(sole, 88, 81, "s1", None)
    for (x, y) in [(87, 94), (101, 83), (86, 90)]:
        cv.px(x, y, "s1")
    # a second, fainter print nearer the door
    small = [
        "..######..",
        "##########",
        "#........#",
        "##########",
        "#........#",
        ".########.",
        "..........",
        ".########.",
        "#........#",
        ".########.",
    ]
    boot(small, 104, 80, "s1", "fl2")

    # a trail of soil out to the threshold, and a leaf torn off on the door
    # frame where it clung
    for (x, y) in [(89, 80), (101, 82), (103, 86), (112, 85), (115, 87), (118, 86), (121, 88)]:
        cv.px(x, y, "s1")
        cv.px(x + 1, y, "s2")
    leaf(cv, (116, 58), (111, 63), 1.8, "gd0", "gd1")
    cv.px(116, 57, "gd1")
    cv.line([(116, 60), (114, 67)], "root")

    # --- the one seedling left, at the far end, leaning away -------------------
    pot(cv, 6, 42, 14, 13, "t0", "t1", "t2", "t3", "s1", "s2")
    cv.line([(6, 42), (5, 36), (2, 31), (0, 29)], "gd1", 2)
    leaf(cv, (4, 36), (-2, 33), 2.4, "gd0", "gd1")
    leaf(cv, (5, 38), (11, 34), 2.0, "gd0", "gd1")
    return cv.image()


# =============================================================================
# 4. grove_taps: a tapped maple and the grey coats behind
# =============================================================================
MAPLE = [
    ".....#.....",
    "....###....",
    ".#..###..#.",
    ".##.###.##.",
    "#.#######.#",
    "###########",
    ".#########.",
    "..#######..",
    ".#########.",
    "....#.#....",
    ".....#.....",
    ".....#.....",
]


def maple_leaf(cv: Canvas, x, y, c_lit, c_body, c_dark, stalk, hang=True, lean=0):
    """A sugar-maple leaf from MAPLE. hang=True flips it to dangle from its
    stalk (a limp leaf); lean shears it sideways. Shaded by position so the
    upper-left stays lit either way up."""
    rows = MAPLE[::-1] if hang else MAPLE
    h = len(rows)
    for j, r in enumerate(rows):
        off = round(lean * (j / h if hang else 1 - j / h))
        for k, ch in enumerate(r):
            if ch != "#":
                continue
            is_stalk = (j <= 2) if hang else (j >= h - 3)
            if is_stalk and k == 5:
                c = stalk
            else:
                d = (k - 5) + (j - h / 2)
                c = c_lit if d < -3 else c_dark if d > 2 else c_body
            cv.px(x + k + off, y + j, c)


def grove_taps() -> Image.Image:
    cv = Canvas({
        # the grove behind, out of focus: soft warm haze, dim trunks
        "hz0": "#f8d8a0", "hz1": "#f0b070", "hz2": "#d88858", "hz3": "#b06848",
        "tr0": "#a07060", "tr1": "#886058",
        "coat0": "#a8a0a0", "coat1": "#888088", "coat2": "#706870",
        # foreground maple bark
        "b0": "#c8b8a0", "b1": "#988070", "b2": "#685450", "b3": "#3c2c2c",
        # steel (spile, pail, tube)
        "st0": "#f0f0f0", "st1": "#b8c0c8", "st2": "#7c8494", "st3": "#444c5c",
        # sap: wet bark and a gold sheen
        "sap0": "#f8f0a0", "sap1": "#e8b840", "wet": "#4c3030",
        # leaves (limp) and litter
        "m0": "#f8c060", "m1": "#e88030", "m2": "#b04020", "m3": "#602010",
        "gr0": "#c88848", "gr1": "#a06038", "gr2": "#784028",
        "mark": "#383848",
    }, "hz1")
    R = rng(41)
    # --- background haze: canopy light at the top, warmer low down ----------
    cv.bands([0, 18, 40, 64], ["hz0", "hz1", "hz2", "hz3"])
    # out-of-focus trunks: soft-edged (dithered) and low in contrast
    for (x, w) in [(76, 7), (98, 5), (126, 9), (150, 6), (112, 3)]:
        cv.rect(x, 0, x + w, 100, "tr0")
        cv.checker(cv.m_rect(x - 1, 0, x - 1, 100) | cv.m_rect(x + w + 1, 0, x + w + 1, 100), "tr0")
        cv.rect(x + w * 2 // 3, 0, x + w, 100, "tr1")
    # grey coats among them: two figures, blurred, one at a drum
    def blur_figure(x, y, c, c2, bend=0, clipboard=False):
        """A grey-coated worker, out of focus: soft dithered edges, the lit
        side a shade lighter, no detail."""
        m = cv.m_ellipse(x + bend, y, 3.2, 3.6)                                    # head
        m |= cv.m_rect(x - 4 + bend, y - 4, x + 4 + bend, y - 3)                   # cap
        m |= cv.m_poly([(x - 6 + bend, y + 5), (x + 6 + bend, y + 5), (x + 8, y + 28), (x - 8, y + 28)])  # coat
        m |= cv.m_ellipse(x + bend, y + 5, 6, 2.5)                                 # shoulders
        m |= cv.m_rect(x - 5, y + 28, x - 2, y + 40) | cv.m_rect(x + 2, y + 28, x + 5, y + 40)
        if clipboard:
            m |= cv.m_rect(x + 5, y + 12, x + 10, y + 19)
        cv.fill(m, c)
        cv.fill(m & (cv.xx > x + bend + 1), c2)
        if clipboard:
            cv.fill(cv.m_rect(x + 6, y + 13, x + 9, y + 18), "coat0")
        ring = np.zeros_like(m)
        ring[:, 1:] |= m[:, :-1]
        ring[:, :-1] |= m[:, 1:]
        ring[1:] |= m[:-1]
        cv.checker(ring & ~m, c)
    blur_figure(104, 34, "coat0", "coat1", clipboard=True)
    blur_figure(142, 42, "coat1", "coat2", bend=-3)
    # the drum the second one is bent over, and a tube snaking to it
    cv.rect(124, 66, 142, 86, "coat2")
    cv.checker(cv.m_rect(123, 66, 143, 86) & ~cv.m_rect(124, 66, 142, 86), "coat2")
    cv.rect(124, 66, 142, 67, "coat0")
    cv.rect(124, 75, 142, 75, "coat1")
    # ground: leaf litter, calm
    ground = cv.yy >= 86
    cv.fill(ground, "gr1")
    cv.fill(cv.yy == 86, "gr2")
    cv.checker(cv.m_rect(0, 87, 159, 88), "hz3")
    for _ in range(70):
        x, y = int(R.integers(0, W)), int(R.integers(90, 144))
        cv.px(x, y, "gr0" if R.random() < 0.6 else "gr2")
        cv.px(x + 1, y, "gr0" if R.random() < 0.4 else "gr1")

    # --- the near maple: furrowed bark, lit from the left -------------------
    T0, T1 = 6, 60
    trunk = cv.m_poly([(T0 + 2, 0), (T1 - 2, 0), (T1, 90), (T1 + 6, 100), (T0 - 6, 100), (T0, 90)])
    cv.fill(trunk, "b1")
    cv.fill(trunk & (cv.xx < T0 + 12), "b0")
    cv.fill(trunk & (cv.xx > T1 - 16), "b2")
    cv.edge(trunk, "b3", "E")
    # vertical furrows that wander, plates between them
    for k, x0 in enumerate(range(T0 + 4, T1 - 2, 6)):
        x = x0 + R.random() * 2
        y = -2.0
        while y < 98:
            seg = 4 + R.random() * 9
            nx = x + R.choice([-1, 0, 1])
            colour = "b2" if x0 < T1 - 16 else "b3"
            cv.line([(x, y), (nx, y + seg)], colour)
            if R.random() < 0.35:                  # a plate catching the light
                cv.px(nx - 1, y + seg / 2, "b0" if x0 < T1 - 20 else "b1")
            x, y = nx, y + seg + (1 if R.random() < 0.3 else 0)
    # root flare at the base, half-buried in leaves
    cv.fill(cv.m_poly([(T0 - 12, 100), (T0, 86), (T0 + 4, 100)]), "b1")
    cv.fill(cv.m_poly([(T1 - 4, 100), (T1, 86), (T1 + 14, 100)]), "b2")
    cv.fill(cv.m_rect(0, 96, 80, 100) & ~trunk, "gr1")

    # --- the tap: a steel spile, sap bleeding down, the pail ---------------
    SX, SY = 34, 34                    # the hole
    # the wound: a dark wet streak running from the hole down the bark
    wet = cv.m_poly([(SX - 2, SY), (SX + 2, SY), (SX + 3, SY + 10), (SX + 1, SY + 30), (SX - 1, SY + 30), (SX - 3, SY + 10)])
    cv.fill(wet & trunk, "wet")
    for (x, y) in [(SX - 1, SY + 4), (SX, SY + 9), (SX + 1, SY + 15), (SX, SY + 22), (SX - 1, SY + 27)]:
        cv.px(x, y, "sap1")
    cv.px(SX - 1, SY + 3, "sap0")
    # the hole + the spile, angled out toward us and down
    cv.ellipse(SX, SY, 2.5, 2, "b3")
    cv.poly([(SX - 1, SY - 2), (SX + 2, SY - 2), (SX + 16, SY + 3), (SX + 16, SY + 6), (SX + 1, SY + 2)], "st2")
    cv.line([(SX, SY - 2), (SX + 15, SY + 3)], "st0")
    cv.line([(SX + 1, SY + 2), (SX + 16, SY + 6)], "st3")
    cv.rect(SX + 15, SY + 3, SX + 17, SY + 7, "st1")
    cv.px(SX + 17, SY + 7, "st3")
    # hook + bail wire holding the pail
    cv.line([(SX + 12, SY + 5), (SX + 9, SY + 16)], "st3")
    cv.line([(SX + 12, SY + 5), (SX + 31, SY + 16)], "st3")
    # a drip on its way down, and one landing
    cv.px(SX + 17, SY + 9, "sap1")
    cv.px(SX + 17, SY + 10, "sap0")
    cv.px(SX + 17, SY + 13, "sap1")
    cv.px(SX + 17, SY + 14, "sap1")
    # the pail: a galvanised bucket with a peaked lid, hung on the hook
    PX0, PY0, PX1, PY1 = SX + 6, SY + 12, SX + 34, SY + 42
    lid = cv.m_poly([(PX0 - 2, PY0 + 4), (PX0 + 12, PY0 - 3), (PX1 + 2, PY0 + 4)])
    pail = cv.m_poly([(PX0, PY0 + 4), (PX1, PY0 + 4), (PX1 - 3, PY1), (PX0 + 3, PY1)])
    cv.fill(pail, "st1")
    cv.fill(pail & (cv.xx < PX0 + 7), "st0")
    cv.fill(pail & (cv.xx > PX1 - 10), "st2")
    cv.edge(pail, "st3", "E")
    cv.edge(pail, "st3", "S")
    for y in (PY0 + 9, PY1 - 6):                 # pressed rings
        cv.fill(pail & (cv.yy == y), "st2")
        cv.fill(pail & (cv.yy == y + 1) & (cv.xx < PX1 - 10), "st0")
    cv.fill(lid, "st2")
    cv.fill(lid & (cv.xx < PX0 + 12), "st1")
    cv.edge(lid, "st0", "N")
    cv.fill(cv.m_rect(PX0 - 2, PY0 + 4, PX1 + 2, PY0 + 4), "st3")
    # Rootstock's stencil on the pail: a root-and-ring mark
    mx, my = (PX0 + PX1) // 2 - 1, PY0 + 16
    cv.stamp([
        "...#...",
        "..###..",
        "...#...",
        ".#.#.#.",
        "#.###.#",
        "..#.#..",
        ".#...#.",
    ], mx - 3, my - 3, {"#": "mark"})
    # the tube: a second line out of the trunk, sagging off toward the drums
    tube = [(SX + 6, SY - 12), (SX + 30, SY - 6), (SX + 52, SY + 4), (SX + 74, SY + 14), (SX + 96, SY + 32)]
    cv.ellipse(SX + 4, SY - 13, 2, 1.5, "b3")
    cv.line(tube, "st3", 2)
    cv.line([(x, y - 1) for x, y in tube], "st1")
    for (x, y) in [(SX + 20, SY - 7), (SX + 46, SY + 3)]:   # gold sap glinting inside
        cv.px(x, y, "sap1")

    # --- a bough of limp maple leaves hanging into the top of frame -------
    bough = [(161, -2), (146, 6), (128, 10), (110, 17), (94, 19), (78, 24)]
    cv.line(bough[:3], "b3", 3)
    cv.line(bough[2:], "b3", 2)
    cv.line([(x - 1, y - 1) for x, y in bough], "b2")
    twigs = [(150, 4, 147, 12), (136, 8, 138, 18), (120, 13, 116, 22), (104, 18, 106, 27), (88, 21, 84, 29),
             (142, 6, 132, 2), (114, 15, 108, 9)]
    for x0, y0, x1, y1 in twigs:
        cv.line([(x0, y0), (x1, y1)], "b3")
    for (x, y, lean, tone) in [(147, 12, 1, 0), (138, 18, -1, 1), (116, 22, 1, 0), (106, 27, -2, 1),
                               (84, 29, 1, 1), (132, 1, 2, 0), (108, 8, -1, 1), (156, 2, 0, 1)]:
        lit, body, dark = (("m1", "m2", "m3") if tone else ("m0", "m1", "m2"))
        maple_leaf(cv, x - 5, y, lit, body, dark, "m3", hang=True, lean=lean)
    for (x, y) in [(70, 44), (150, 30)]:                                   # drifting down
        maple_leaf(cv, x, y, "m0", "m1", "m2", "m2", hang=False, lean=2)
    return cv.image()


# =============================================================================
# 5. graft_collar: Bram's partner, collared
# =============================================================================
def graft_collar() -> Image.Image:
    cv = Canvas({
        # cold dusk behind, out of focus
        "bg0": "#3c4868", "bg1": "#2c3654", "bg2": "#202840", "bg3": "#161c30",
        "bk0": "#56648a", "bk1": "#46547a",
        # the plant: pale, sickly, cold-lit
        "p0": "#d8e8c8", "p1": "#a8c0a0", "p2": "#789080", "p3": "#465a58",
        "sick": "#c8b878", "spot": "#806850",
        # the steel collar
        "c0": "#f0f8f8", "c1": "#a8b8c8", "c2": "#687890", "c3": "#2c3448", "led": "#e85040",
        # Bram's glove and sleeve
        "gl0": "#8c8ca0", "gl1": "#5c5c74", "gl2": "#3c3c50", "gl3": "#1c1c2c",
        "sl0": "#5c3c68", "sl1": "#40284c",
    }, "bg1")
    R = rng(57)
    cv.bands([0, 30, 70, 104], ["bg0", "bg1", "bg2", "bg3"])
    # bokeh: soft out-of-focus leaves behind, dithered discs
    for (x, y, r) in [(24, 18, 9), (132, 26, 11), (146, 70, 8), (16, 52, 6), (118, 6, 6), (60, 10, 5)]:
        cv.checker(cv.m_ellipse(x, y, r, r), "bk1")
        cv.fill(cv.m_ellipse(x - 1, y - 1, r - 3, r - 3), "bk1")
        cv.checker(cv.m_ellipse(x - 2, y - 2, r - 5, r - 5), "bk0")

    SX = 90
    # --- the stem: rises from the bottom, pinched by the collar ------------
    CY0, CY1 = 36, 56

    def half(y):
        if y < CY0 + 2:                 # swollen above the collar
            return 4.2 + 1.6 * math.exp(-((y - (CY0 - 3)) / 4) ** 2)
        if y > CY1:                     # starved below
            return 3.4
        return 3.0
    stem = np.zeros((H, W), bool)
    for y in range(0, H):
        c = SX + 2.0 * math.sin(y * 0.03 + 0.5)
        hw = half(y)
        stem[y, int(round(c - hw)):int(round(c + hw)) + 1] = True
    cv.fill(stem, "p1")
    cv.fill(stem & ~np.roll(stem, 2, 1), "p0")       # lit left edge
    cv.fill(stem & ~np.roll(stem, -3, 1), "p2")
    cv.edge(stem, "p3", "E")
    for y in range(CY1 + 1, CY1 + 8):                # the scar under the collar
        cv.px(SX - 1 + (y % 3), y, "spot")
        if y % 2:
            cv.px(SX + 1 + (y % 2), y, "p3")

    # --- leaves: pale, drooping, turned away from his hand ---------------
    leaf(cv, (SX + 3, 26), (SX + 34, 40), 5.5, "p1", "p2", "p3")
    leaf(cv, (SX + 3, 14), (SX + 30, 18), 5.0, "p0", "p1", "p2")
    leaf(cv, (SX - 3, 20), (SX - 24, 32), 4.2, "p1", "p2", "p3")
    leaf(cv, (SX + 1, 4), (SX + 18, 0), 3.6, "p0", "p1", "p2")
    leaf(cv, (SX - 2, 6), (SX - 16, 4), 3.0, "p1", "p2")
    for (x, y) in [(SX + 32, 39), (SX + 33, 40), (SX + 30, 38), (SX - 23, 32), (SX - 22, 31), (SX + 28, 18),
                   (SX + 29, 19), (SX + 31, 40)]:
        cv.px(x, y, "sick")
    for (x, y) in [(SX + 18, 33), (SX + 19, 33), (SX + 19, 34), (SX + 12, 15), (SX + 13, 16), (SX - 12, 26)]:
        cv.px(x, y, "spot")

    # --- the collar: a steel band, clamp tab and bolts, a small red lamp --
    RX = 13
    band = cv.m_ellipse(SX, CY0 + 3, RX, 4) | cv.m_rect(SX - RX, CY0 + 3, SX + RX, CY1 - 3) | cv.m_ellipse(SX, CY1 - 3, RX, 4)
    cv.fill(band, "c1")
    cv.fill(band & (cv.xx < SX - 6), "c0")
    cv.fill(band & (cv.xx > SX + 4), "c2")
    cv.fill(band & (cv.xx > SX + 10), "c3")
    cv.checker(band & (cv.xx >= SX - 7) & (cv.xx <= SX - 6), "c1")
    cv.checker(band & (cv.xx >= SX + 3) & (cv.xx <= SX + 4), "c1")
    top = cv.m_ellipse(SX, CY0 + 3, RX, 4)
    cv.fill(top, "c1")
    cv.fill(top & ~cv.m_ellipse(SX, CY0 + 4, RX, 4), "c0")
    cv.fill(top & (cv.xx > SX + 6), "c2")
    cv.fill(cv.m_ellipse(SX + 0.5, CY0 + 3, 5, 2), "p2")              # stem through the top
    cv.fill(cv.m_ellipse(SX - 0.5, CY0 + 2.5, 3.4, 1.2), "p1")
    for y in (CY0 + 9, CY1 - 7):                                        # pressed ridges
        cv.fill(band & (cv.yy == y), "c2")
        cv.fill(band & (cv.yy == y + 1) & (cv.xx < SX + 4), "c0")
        cv.fill(band & (cv.yy == y) & (cv.xx > SX + 10), "c3")
    lower = band & ~np.roll(band, -1, 0) & (cv.yy > CY0 + 6)
    cv.fill(lower, "c3")
    # clamp tab sticking out to the right, two bolts
    cv.rect(SX + RX, CY0 + 5, SX + RX + 8, CY1 - 5, "c2")
    cv.rect(SX + RX, CY0 + 5, SX + RX + 8, CY0 + 5, "c1")
    cv.rect(SX + RX + 8, CY0 + 5, SX + RX + 8, CY1 - 5, "c3")
    cv.rect(SX + RX, CY1 - 5, SX + RX + 8, CY1 - 5, "c3")
    cv.rect(SX + RX + 1, CY0 + 10, SX + RX + 7, CY0 + 10, "c3")      # the clamp's split
    for by in (CY0 + 6, CY1 - 9):
        cv.rect(SX + RX + 9, by, SX + RX + 11, by + 2, "c1")
        cv.px(SX + RX + 9, by, "c0")
        cv.px(SX + RX + 11, by + 2, "c3")
        cv.px(SX + RX + 12, by + 1, "c3")
    # rivets and the little red lamp
    for x in (SX - 9, SX - 3, SX + 3):
        cv.px(x, CY0 + 13, "c3" if x > SX else "c2")
        cv.px(x - 1, CY0 + 12, "c0")
    cv.rect(SX - 3, CY0 + 6, SX - 2, CY0 + 7, "led")
    cv.px(SX - 3, CY0 + 6, "c0")
    cv.rect(SX - 10, CY0 + 5, SX - 10, CY1 - 6, "c0")                   # cold glint on the lit side
    # the stem bulging over the collar's lip
    cv.fill(cv.m_ellipse(SX, CY0 - 1, 6, 2) & ~band, "p1")
    cv.fill(cv.m_ellipse(SX - 2, CY0 - 1.5, 3, 1) & ~band, "p0")

    # --- Bram's gloved hand, a fist round the stem below the collar -------
    sleeve = cv.m_poly([(-2, 72), (40, 66), (44, 90), (-2, 100)])
    cv.fill(sleeve, "sl0")
    cv.fill(sleeve & (cv.yy > 92 - cv.xx * 0.4), "sl1")
    cv.edge(sleeve, "gl1", "N")
    cuff = cv.m_poly([(38, 66), (48, 64), (52, 88), (42, 90)])
    cv.fill(cuff, "gl2")
    cv.edge(cuff, "gl1", "N")
    cv.edge(cuff, "gl3", "E")
    back = cv.m_poly([(48, 66), (76, 61), (80, 86), (50, 88)])             # back of the hand
    cv.fill(back, "gl1")
    cv.fill(back & (cv.yy < 72) & (cv.xx < 70), "gl0")
    cv.fill(back & (cv.yy > 82), "gl2")
    # four fingers wrapped round the stem, knuckles toward us
    fist_x0, fist_x1 = 70, SX + 6
    for n, fy in enumerate((61, 67, 73, 79)):
        f = cv.m_ellipse((fist_x0 + fist_x1) / 2, fy + 2.5, (fist_x1 - fist_x0) / 2 + 1 - n * 0.6, 3.2)
        cv.fill(f, "gl1")
        cv.fill(f & (cv.yy <= fy + 1), "gl0")
        cv.fill(f & (cv.xx > fist_x1 - 6) & (cv.yy > fy + 1), "gl2")
        cv.fill(f & ~np.roll(f, -1, 0), "gl3")                             # crease under each
        cv.fill(f & ~np.roll(f, -1, 1), "gl3")
    # the thumb, laid over the index finger, pointing at the collar
    thumb = cv.m_poly([(60, 62), (78, 58), (86, 58), (88, 61), (80, 64), (62, 67)])
    cv.fill(thumb, "gl1")
    cv.fill(thumb & (cv.yy <= 60), "gl0")
    cv.edge(thumb, "gl3", "S")
    cv.px(87, 59, "gl0")
    # glove seam across the back
    cv.line([(52, 74), (68, 70)], "gl2")
    cv.line([(52, 75), (68, 71)], "gl0")
    return cv.image()


# =============================================================================
# 6. vale_call: Dr. Vale on the telephone, late
# =============================================================================
def vale_call() -> Image.Image:
    cv = Canvas({
        # the lab at night
        "w0": "#3a3458", "w1": "#2c2846", "w2": "#201c34", "wl": "#5c4c64", "wl2": "#7c6468",
        "n0": "#141c3c", "n1": "#202c58", "star": "#e8e8f8", "moon": "#f8f0c8",
        # lamp light
        "L0": "#f8f8d8", "L1": "#f8d880", "L2": "#e0a050",
        # desk
        "d0": "#c88850", "d1": "#905c38", "d2": "#5c3828", "d3": "#341e1c",
        # banker's lamp
        "gs0": "#78c088", "gs1": "#3c7850", "gs2": "#1c3828", "br": "#d0a050", "br2": "#886030",
        # Vale
        "h0": "#f89868", "h1": "#d85840", "h2": "#9c3030", "h3": "#581c24",
        "sk0": "#f8d8b0", "sk1": "#e0a078", "sk2": "#a06050",
        "ct0": "#f8f0d8", "ct1": "#c8b8b0", "ct2": "#7c6c84",
        "bl": "#4c8c48", "rim": "#281420",
        # telephone, papers, jars
        "ph0": "#605868", "ph1": "#383040", "ph2": "#1c1824",
        "pp0": "#f0e0c0", "pp1": "#b8a090",
        "jar0": "#6c7c90", "jar1": "#4c5470",
        # the diary: leather, ink, a warm glow on the sketched page
        "cov": "#4c2428", "ink": "#4c3030", "ink2": "#a08070", "pg": "#f8f0b0",
    }, "w1")
    R = rng(77)
    # --- wall, window, shelf ---------------------------------------------------
    cv.rect(0, 0, W - 1, H - 1, "w1")
    cv.checker(cv.m_rect(0, 0, W - 1, 3), "w2")
    cv.rect(0, 0, W - 1, 1, "w2")
    win = cv.m_rect(10, 8, 52, 50)
    cv.fill(cv.m_rect(8, 6, 54, 53), "w2")
    cv.fill(win, "n0")
    cv.fill(win & (cv.yy > 34), "n1")
    cv.checker(win & (cv.yy == 34), "n1")
    for _ in range(14):
        cv.px(R.integers(11, 52), R.integers(9, 40), "star")
    cv.ellipse(42, 17, 4, 4, "moon")                     # a thin crescent
    cv.ellipse(44, 16, 4, 4, "n0")
    treeline = np.array([44 - 3 * abs(math.sin(x * 0.5)) - 2 * abs(math.sin(x * 0.17)) for x in range(W)])
    cv.fill(win & (cv.yy >= np.round(treeline[cv.xx])), "w2")
    cv.rect(30, 8, 31, 50, "w2")                        # mullions
    cv.rect(10, 28, 52, 29, "w2")
    cv.rect(8, 51, 54, 53, "wl")                        # sill, lamplit
    cv.rect(8, 51, 54, 51, "wl2")
    # a little pressed-specimen frame and a shelf of jars on the right wall
    cv.rect(124, 8, 146, 30, "d2")
    cv.rect(126, 10, 144, 28, "pp1")
    cv.line([(135, 26), (135, 14)], "jar1")
    leaf(cv, (135, 20), (129, 14), 2.2, "jar0", "jar1")
    leaf(cv, (135, 18), (141, 12), 2.2, "jar0", "jar1")
    cv.rect(114, 40, 159, 41, "d2")
    cv.rect(114, 42, 159, 42, "d3")
    for n, x in enumerate(range(118, 160, 9)):
        h = 8 + (n % 3) * 2
        cv.rect(x, 40 - h, x + 5, 39, "jar1")
        cv.rect(x, 40 - h, x + 1, 39, "jar0")
        cv.rect(x - 1, 40 - h - 1, x + 6, 40 - h, "d2")

    # --- lamp light on the wall: a warm pool behind the lamp -------------------
    LX, LY = 24, 58                      # under the lamp shade
    wall = cv.m_of("w1", "w2")
    cv.glow(LX + 6, LY + 4, [(40, "w0", "dith"), (32, "w0", "solid"), (24, "wl", "dith"), (16, "wl", "solid")],
            0.75, only=wall)

    # --- Vale: seated behind the desk, receiver to her ear -------------------
    VX, VY = 98, 40                       # centre of her face
    # hair: a big wild mass behind and around the head
    hair = cv.m_ellipse(VX + 1, VY - 2, 16, 15) | cv.m_ellipse(VX + 9, VY + 12, 10, 12) | cv.m_ellipse(VX - 9, VY + 9, 8, 9)
    for (x, y, r) in [(VX - 15, VY - 6, 3), (VX + 16, VY - 8, 3), (VX - 6, VY - 17, 3), (VX + 7, VY - 17, 3.5),
                      (VX + 18, VY + 4, 3), (VX - 16, VY + 4, 3), (VX + 1, VY - 18, 2.5)]:
        hair |= cv.m_ellipse(x, y, r, r)
    # body: lab coat shoulders, green blouse at the neck
    coat = cv.m_poly([(VX - 18, 86), (VX - 14, 62), (VX - 6, 56), (VX + 8, 56), (VX + 18, 62), (VX + 24, 86)])
    cv.fill(coat, "ct1")
    cv.fill(coat & (cv.xx < VX - 4), "ct0")
    cv.fill(coat & (cv.xx > VX + 14), "ct2")
    cv.fill(cv.m_poly([(VX - 3, 56), (VX + 5, 56), (VX + 1, 68)]), "bl")      # blouse V
    cv.line([(VX - 4, 56), (VX + 1, 70)], "ct2")                                # lapels
    cv.line([(VX + 6, 56), (VX + 2, 70)], "ct2")
    cv.fill(hair & ~coat, "h1")
    cv.fill(hair & ~coat & (cv.xx + cv.yy < VX + VY - 14), "h0")
    cv.fill(hair & ~coat & (cv.xx - cv.yy > VX - VY + 10), "h2")
    cv.fill(hair & ~coat & (cv.yy > VY + 14) & (cv.xx > VX + 6), "h2")
    cv.outline(hair & ~coat, "h3", "NESW")
    # curl strokes through the hair
    for pts in ([(VX - 10, VY - 10), (VX - 6, VY - 14), (VX - 1, VY - 13)],
                [(VX + 4, VY - 12), (VX + 9, VY - 13), (VX + 12, VY - 9)],
                [(VX + 12, VY + 2), (VX + 15, VY + 6), (VX + 14, VY + 11)],
                [(VX - 12, VY + 2), (VX - 14, VY + 7)]):
        cv.line(pts, "h2")
    # face: three-quarter, turned down toward the seed, lit from the lamp (left)
    face = cv.m_ellipse(VX - 1, VY + 1, 6.5, 8)
    cv.fill(face, "sk1")
    cv.fill(face & (cv.xx < VX + 1), "sk0")
    cv.fill(face & (cv.xx > VX + 4), "sk2")
    cv.fill(cv.m_ellipse(VX + 1, VY - 7, 8, 3.5) & face, "h1")             # fringe
    cv.fill(cv.m_poly([(VX - 8, VY - 6), (VX + 2, VY - 9), (VX - 4, VY - 3)]), "h0")
    cv.px(VX - 6, VY - 3, "h1")
    cv.rect(VX - 1, VY + 9, VX + 3, VY + 14, "sk2")                         # neck in shadow
    cv.rect(VX - 1, VY + 9, VX, VY + 12, "sk1")
    # round glasses, eyes lowered
    for gx, lens in ((VX - 4, "sk0"), (VX + 2, "sk1")):
        cv.fill(cv.m_ellipse(gx, VY + 1, 2.6, 2.6), "rim")
        cv.fill(cv.m_ellipse(gx, VY + 1, 1.7, 1.7), lens)
        cv.rect(gx - 1, VY + 2, gx, VY + 2, "rim")                        # lowered lids
    cv.px(VX - 1, VY + 1, "rim")
    cv.px(VX - 5, VY, "L0")                                                 # lamp glint
    cv.px(VX - 3, VY + 5, "sk2")                                            # nose shadow
    cv.rect(VX - 3, VY + 7, VX - 1, VY + 7, "sk2")                          # mouth, a small o
    cv.px(VX - 2, VY + 6, "h2")
    # the telephone receiver, held to her ear by her right hand
    rec = cv.m_line([(VX - 12, VY - 4), (VX - 9, VY + 6), (VX - 7, VY + 16)], 4)
    cv.fill(rec, "ph1")
    cv.fill(rec & (cv.xx < VX - 10), "ph0")
    cv.ellipse(VX - 11, VY - 6, 3, 2.4, "ph1")
    cv.ellipse(VX - 7, VY + 17, 3, 2.4, "ph1")
    cv.px(VX - 13, VY - 7, "ph0")
    cv.px(VX - 9, VY + 16, "ph0")
    hand = cv.m_ellipse(VX - 12, VY + 6, 3.4, 4.2)
    cv.fill(hand, "sk1")
    cv.fill(hand & (cv.xx < VX - 12), "sk0")
    cv.edge(hand, "sk2", "E")
    for k in range(3):
        cv.px(VX - 10, VY + 3 + k * 2, "sk2")
    # both forearms rest on the desk, so they're painted after it (below)
    def arms():
        # that arm: coat sleeve from the hand down to the elbow on the desk
        sleeve = cv.m_line([(VX - 12, VY + 10), (VX - 18, VY + 24), (VX - 22, 84)], 7)
        cv.fill(sleeve, "ct0")
        cv.fill(sleeve & (cv.xx > VX - 18 + (cv.yy - VY - 24) * -0.2), "ct1")
        cv.outline(sleeve, "ct2", "E")
        # the other forearm along the desk, the hand holding the diary open
        arm2 = cv.m_line([(VX + 16, 70), (VX + 13, 80), (VX + 9, 87)], 6)
        cv.fill(arm2, "ct1")
        cv.fill(arm2 & (cv.xx < VX + 12), "ct0")
        cv.outline(arm2, "ct2", "E")
        hand2 = cv.m_ellipse(VX + 7, 89, 3, 2.4)
        cv.fill(hand2, "sk1")
        cv.fill(hand2 & (cv.xx < VX + 7), "sk0")
        cv.edge(hand2, "sk2", "S")

    # --- the desk ----------------------------------------------------------------
    DT = 80
    top = cv.m_rect(0, DT, W - 1, 95)
    cv.fill(top, "d1")
    cv.fill(top & (cv.yy == DT), "d0")
    cv.rect(0, 96, W - 1, H - 1, "d2")
    cv.rect(0, 96, W - 1, 96, "d3")
    for y in range(110, H, 14):
        cv.rect(0, y, W - 1, y, "d3")
    # the lamp's pool on the desktop, brightest under the shade
    pool = top & cv.m_ellipse(LX + 4, DT + 3, 34, 6)
    cv.checker(pool, "d0")
    cv.fill(top & cv.m_ellipse(LX + 2, DT + 3, 20, 4), "d0")
    cv.checker(top & cv.m_ellipse(LX + 2, DT + 3, 12, 2.5), "L2")
    # banker's lamp: brass stem, green glass shade
    cv.ellipse(LX, DT + 1, 9, 2.5, "br2")
    cv.ellipse(LX - 1, DT + 0.5, 7, 1.6, "br")
    cv.rect(LX - 1, LY, LX, DT, "br")
    cv.rect(LX + 1, LY, LX + 1, DT, "br2")
    shade = cv.m_poly([(LX - 14, LY + 1), (LX - 10, LY - 6), (LX + 12, LY - 6), (LX + 16, LY + 1)])
    cv.fill(shade, "gs1")
    cv.fill(shade & (cv.yy <= LY - 4), "gs0")
    cv.fill(shade & (cv.xx > LX + 8), "gs2")
    cv.rect(LX - 14, LY + 1, LX + 16, LY + 2, "L1")              # the bulb's glow under the rim
    cv.rect(LX - 4, LY + 2, LX + 6, LY + 2, "L0")
    cv.px(LX + 1, LY - 7, "br")
    # the telephone base: black bakelite, cord curling up to her hand
    PX = 50
    base = cv.m_poly([(PX - 9, DT + 1), (PX - 6, DT - 7), (PX + 6, DT - 7), (PX + 9, DT + 1)])
    cv.fill(base, "ph1")
    cv.fill(base & (cv.xx < PX - 2), "ph0")
    cv.edge(base, "ph2", "E")
    cv.ellipse(PX, DT - 4, 4, 2, "ph2")                            # dial
    for a in range(0, 360, 60):
        cv.px(PX + math.cos(math.radians(a)) * 3, DT - 4 + math.sin(math.radians(a)) * 1.5, "ph0")
    cv.rect(PX - 7, DT - 9, PX + 7, DT - 8, "ph2")                 # empty cradle
    cord = [(PX + 6, DT - 3)]
    for k in range(1, 15):
        t = k / 14
        x = PX + 6 + (VX - 7 - PX - 6) * t + math.sin(k * 2.2) * 1.5
        y = DT - 3 + (VY + 19 - (DT - 3)) * t + 6 * math.sin(t * math.pi)
        cord.append((x, y))
    cv.line(cord, "ph2")
    # Fennimore's grandfather's diary, open in front of her: an ink sketch of
    # the seed (a faint warm glow on the page), the spike, cramped writing
    book = cv.m_poly([(69, 83), (103, 83), (107, 95), (65, 95)])
    cv.fill(book, "cov")
    pages = cv.m_poly([(70, 84), (102, 84), (105, 94), (67, 94)])
    cv.fill(pages, "pp0")
    cv.fill(pages & (cv.xx >= 87), "pp0")
    cv.fill(pages & (cv.yy == 94), "pp1")                       # page edges
    cv.fill(pages & ((cv.xx == 85) | (cv.xx == 87)), "pp1")    # gutter shadow
    cv.fill(pages & (cv.xx == 86), "ink2")
    cv.fill(pages & (cv.xx >= 101) & (cv.yy >= 85), "pp1")      # right page curls into shade
    # the glow: a soft warm wash round the seed sketch, on the paper only
    cv.checker(pages & cv.m_ellipse(77, 89, 6, 4) & (cv.xx < 85), "pg")
    cv.fill(pages & cv.m_ellipse(77, 89, 3.5, 2.5), "pg")
    # the seed, drawn: an ink outline, a centre crease, a few radiating strokes
    sd = cv.m_ellipse(77, 89, 2.5, 3.2)
    cv.edge(sd, "ink", "N"); cv.edge(sd, "ink", "S"); cv.edge(sd, "ink", "E"); cv.edge(sd, "ink", "W")
    cv.line([(77, 87), (77, 91)], "ink2")
    for (x, y) in [(73, 86), (81, 86), (72, 90), (82, 91)]:
        cv.px(x, y, "ink2")
    # handwriting lines: short broken dashes, illegible
    for y, segs in [(85, [(71, 75), (80, 84)]), (92, [(70, 74), (76, 79), (81, 84)]),
                    (86, [(96, 100)]), (88, [(96, 99)]), (90, [(96, 100)]), (92, [(89, 94), (96, 101)])]:
        for x0, x1 in segs:
            cv.rect(x0, y, x1, y, "ink2")
            cv.px(x0 + 1, y, "ink")
    # the spike, sketched: a tall tapering outline over a little rosette
    for y, (x0, x1) in [(84, (91, 91)), (85, (91, 91)), (86, (90, 92)), (87, (90, 92)), (88, (90, 92)),
                        (89, (89, 93)), (90, (89, 93)), (91, (90, 92))]:
        cv.px(x0, y, "ink")
        cv.px(x1, y, "ink")
    for (x, y) in [(91, 87), (91, 89), (90, 90), (92, 90)]:        # florets, dotted in
        cv.px(x, y, "ink2")
    cv.line([(91, 92), (91, 93)], "ink")                            # the stalk
    cv.line([(88, 93), (90, 92)], "ink2")                           # rosette strokes
    cv.line([(92, 92), (94, 93)], "ink2")
    arms()

    # books stacked at the right
    for n, (y, c, c2) in enumerate([(DT - 6, "h2", "h3"), (DT - 11, "gs1", "gs2"), (DT - 15, "jar0", "jar1")]):
        x0 = 132 + n * 2
        cv.rect(x0, y, x0 + 22 - n * 3, y + (6 if n == 0 else 4), c)
        cv.rect(x0, y, x0 + 22 - n * 3, y, "pp1")
        cv.rect(x0 + 22 - n * 3, y, x0 + 22 - n * 3, y + (6 if n == 0 else 4), c2)
    return cv.image()


STILL_BUILDERS = {
    "bloom": bloom,
    "greenhouse_morning": greenhouse_morning,
    "theft": theft,
    "grove_taps": grove_taps,
    "graft_collar": graft_collar,
    "vale_call": vale_call,
}


# =============================================================================
# Review
# =============================================================================
def with_textbox(im: Image.Image) -> Image.Image:
    """A preview with a stand-in text box over y >= 96, to check the
    bottom stays calm and the focal point survives."""
    out = im.copy()
    d = ImageDraw.Draw(out)
    d.rectangle([0, TEXT_TOP, W - 1, H - 1], fill=(248, 248, 240, 255), outline=(24, 24, 24, 255))
    d.rectangle([2, TEXT_TOP + 2, W - 3, H - 3], outline=(24, 24, 24, 255))
    return out


def tile_report(im: Image.Image) -> tuple[int, float]:
    """(worst colours in any 8x8, share of 8x8 tiles within 4)."""
    a = np.asarray(im)
    counts = []
    for y in range(0, H, 8):
        for x in range(0, W, 8):
            blk = a[y:y + 8, x:x + 8].reshape(-1, 4)
            counts.append(len({tuple(p) for p in blk}))
    return max(counts), sum(c <= 4 for c in counts) / len(counts)


def build() -> dict[str, Image.Image]:
    out = {}
    for key, fn in STILL_BUILDERS.items():
        im = fn()
        assert im.size == (W, H), key
        gbc.save(im, f"stills/{key}.png")
        out[key] = im
    cells = []
    for k, im in out.items():
        cells.append((k, im))
        cells.append((k + " +box", with_textbox(im)))
    gbc.grid_sheet(cells, 2, 3).save(gbc.REVIEW / "stills.png")
    return out


if __name__ == "__main__":
    for k, im in build().items():
        worst, share = tile_report(im)
        print(f"{k}: {len(gbc.colours(im))} colours, worst 8x8 {worst}, {share:.0%} tiles <=4")
