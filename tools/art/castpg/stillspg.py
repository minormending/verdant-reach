"""Post-game story still, an original pixel painting on the stills.Canvas.

  methuselah_night  METHUSELAH RIDGE at night. On a bare summit of frosted
                    rock, under a deep star field and the pale band of the
                    galaxy, stands the oldest bristlecone: a squat, flared,
                    wind-twisted trunk of bare silver deadwood with its grain
                    spiralling up it, one dead spire stabbing at the stars and
                    one dead limb reaching left. One narrow strip of living
                    rust-red bark spirals with the grain from the left root
                    across the trunk's face and out of its right flank into
                    the living limb, whose branches end in short, thick
                    bottlebrush foxtails of dark needles, two of them
                    standing up against the stars. A faint
                    frost-light traces the deadwood's edges and grain and
                    lifts off it in motes: the tree is waking. Small in the
                    lower left, the player stands with their back to us,
                    looking up. Awe, age and stillness.

Composition follows stills.py: the bottom 48px sit under the text box, so
they hold only the summit's dark, calm rock; the tree, its glow and the
player all live above y = 96. Starlight comes from the top left (the
deadwood is lit on its left), and the tree's own frost-light glows from its
edges. Stars come from a fixed-seed generator; every other coordinate is
fixed, so the output is deterministic.
"""
from __future__ import annotations

import math

import numpy as np

import commonpg as common
from stills import Canvas, rng

PAL = {
    # the night sky, deepest at the top, and the galaxy's band
    "s0": "#080a1c", "s1": "#0e1230", "s2": "#161c42", "s3": "#202858", "s4": "#2c3468",
    "st0": "#f8f8f8", "st1": "#c0d0f8", "st2": "#7080b8",
    # far ranges below the summit, and the summit rock
    "rg0": "#2a3058", "rg1": "#1e2446", "rg2": "#151a34",
    "rk0": "#a0a8c8", "rk1": "#666e94", "rk2": "#424a70", "rk3": "#2a3050", "rk4": "#181c34",
    # frost-light
    "fr0": "#f0fcff", "fr1": "#b0e0f8", "fr2": "#70a8d8", "fr3": "#3c5c98",
    # silver deadwood
    "dw0": "#f0f0f0", "dw1": "#c8ccd8", "dw2": "#9498b0", "dw3": "#626880", "dw4": "#3a3e58",
    # the living strip of rust bark
    "rb0": "#b86440", "rb1": "#843e2c", "rb2": "#4e2424",
    # bottlebrush needles
    "nd0": "#78a890", "nd1": "#345a50", "nd2": "#1c3634", "nd3": "#0c1a1c",
    # the player, from behind, in the player sprite's colours (night-dimmed a touch)
    "ink": "#101018", "cp0": "#78b850", "cp1": "#4c8c3c", "cp2": "#286828",
    "hr0": "#906830", "hr1": "#583818", "pk0": "#6c4828", "pk1": "#40281c",
    "or0": "#f08028", "or1": "#b83810", "aq0": "#98d0c8", "aq1": "#5c9c98",
    "sk": "#e0a878",
}

TX = 96            # the trunk's foot, centre
GROUND = 94        # the summit crest under the tree


def band_mid(x):
    """The galaxy's centre line, from the upper right down to the left horizon."""
    return 70 - 0.42 * x + 3 * math.sin(x * 0.05)


def sky(cv):
    cv.bands([0, 20, 40, 58, 72], ["s0", "s1", "s2", "s3", "s4"])
    # The galaxy: a soft, uneven band one step lighter than the sky, dithered
    # at its edges and solid in its core.
    mid = np.array([band_mid(x) for x in range(160)])
    half = np.array([9 + 4 * math.sin(x * 0.11 + 1) + 2 * math.sin(x * 0.29) for x in range(160)])
    d = np.abs(cv.yy - mid[cv.xx]) / half[cv.xx]
    up = {"s0": "s1", "s1": "s2", "s2": "s3", "s3": "s4"}
    base = cv.a.copy()
    for lo, hi in up.items():
        was = base == cv.i(lo)
        cv.checker(was & (d < 1.0), hi)
        cv.fill(was & (d < 0.45), hi)


def stars(cv):
    R = rng(4789)                       # some living bristlecones are more than 4,800 years old
    for _ in range(170):
        x, y = int(R.integers(0, 160)), int(R.integers(0, 84))
        if cv.at(x, y) not in ("s0", "s1", "s2", "s3", "s4"):
            continue
        near_band = abs(y - band_mid(x)) < 12
        r = R.random()
        if y > 70 and r < 0.6:
            continue                     # fewer stars in the horizon haze
        cv.px(x, y, "st1" if (r < 0.25 or (near_band and r < 0.45)) else "st2")
    # A few bright stars with short crosses, away from the tree's crown.
    for x, y in ((18, 10), (46, 30), (132, 12), (150, 52), (66, 6), (24, 50)):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.px(x + dx, y + dy, "st2")
        cv.px(x, y, "st0")


def ranges(cv):
    """Far ranges far below the summit: two layers of soft peaks, the nearer
    darker, with snow catching starlight on the far crests."""
    def ridge(x, base, amp, f, ph):
        return base - amp * (0.6 * math.sin(x * f + ph) + 0.4 * abs(math.sin(x * f * 2.2 + ph * 1.3)))

    far = np.array([ridge(x, 82, 6, 0.07, 1.1) for x in range(160)])
    near = np.array([ridge(x, 90, 5, 0.05, 2.9) for x in range(160)])
    cv.fill(cv.yy >= np.round(far[cv.xx]), "rg0")
    for x in range(160):
        y = int(round(far[x]))
        if far[x] < 79 and x % 3:
            cv.px(x, y, "rk1")
    cv.fill(cv.yy >= np.round(near[cv.xx]), "rg1")
    cv.checker((cv.yy == np.round(near[cv.xx])), "rg0")


def summit(cv):
    """The bare summit: a broad dome of rock rising to the crest under the
    tree, frost on its upper faces, broken by a few slabs and cracks."""
    top = [(0, 104), (14, 100), (30, 97), (48, 95), (64, 93), (80, 92), (96, 91), (112, 92), (126, 94),
           (140, 97), (152, 100), (160, 102)]
    rock = cv.m_poly(top + [(160, 143), (0, 143)])
    cv.fill(rock, "rk3")
    # The crest's upper faces, frosted and lit from the left and by the tree.
    crest = cv.m_poly([(x, y) for x, y in top] + [(160, 106), (120, 100), (96, 98), (64, 100), (30, 104),
                                                    (0, 110)])
    cv.fill(rock & crest, "rk2")
    cv.edge(rock, "rk1", "N")
    cv.fill(rock & cv.m_poly([(40, 96), (64, 93), (80, 92), (92, 92), (80, 94), (60, 96)]), "rk1")
    # Slabs: angular blocks on the crest, lit on their top and left faces.
    for pts in ([(20, 99), (26, 96), (34, 96), (36, 99)], [(118, 93), (124, 90), (132, 91), (134, 95)],
                [(140, 96), (146, 94), (152, 96), (152, 99)], [(56, 95), (60, 93), (66, 93), (66, 95)]):
        m = cv.m_poly(pts)
        cv.fill(m, "rk2")
        cv.edge(m, "rk1", "N")
        cv.edge(m, "rk0", "N")
        cv.edge(m, "rk1", "W")
        cv.outline(m, "rk4", "E")
    # Under the text box: the rock darkens and steadies downward.
    low = rock & (cv.yy >= 108)
    cv.fill(low, "rk3")
    cv.checker(rock & (cv.yy == 107), "rk3")
    cv.fill(rock & (cv.yy >= 124), "rk4")
    cv.checker(rock & (cv.yy == 123), "rk4")
    for pts in ([(10, 112), (22, 116), (30, 115)], [(70, 118), (84, 114), (96, 116)], [(124, 112), (136, 117)],
                [(40, 130), (52, 128)], [(104, 132), (120, 130)]):
        cv.line(pts, "rk4")
    # Frost on the crest: a sparse scatter of pale crystals.
    frost = rock & (cv.yy < 100) & cv.m_of("rk1", "rk2")
    cv.sparse(frost & cv.m_rect(30, 0, 150, 143), "rk0")


# =============================================================================
# The bristlecone
# =============================================================================
def limb(cv, pts, w0, w1):
    """A tapering limb along a polyline: width w0 at the first point, w1 at
    the last, round at every joint."""
    m = np.zeros((144, 160), bool)
    lens = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total, run = sum(lens), 0.0
    for i, L in enumerate(lens):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        wa = w0 + (w1 - w0) * run / total
        run += L
        wb = w0 + (w1 - w0) * run / total
        nx, ny = -(y1 - y0) / L, (x1 - x0) / L
        m |= cv.m_poly([(x0 + nx * wa / 2, y0 + ny * wa / 2), (x1 + nx * wb / 2, y1 + ny * wb / 2),
                        (x1 - nx * wb / 2, y1 - ny * wb / 2), (x0 - nx * wa / 2, y0 - ny * wa / 2)])
        m |= cv.m_ellipse(x1, y1, wb / 2, wb / 2)
    return m


# The trunk: squat, flared at the foot where the roots grip the rock, and
# twisted, pinched in and bulging out again as it climbs.
TRUNK = [(64, 97), (72, 95), (78, 92), (82, 87), (84, 81), (81, 75), (80, 69), (82, 63), (85, 57), (85, 52),
         (98, 51), (100, 56), (105, 60), (109, 66), (110, 72), (108, 78), (109, 84), (113, 90), (119, 94),
         (128, 97)]
SPIRE = [(91, 56), (87, 46), (91, 36), (88, 27), (93, 17), (96, 7)]          # the dead spire, zigzagging up
DEAD_LIMB = [(85, 62), (75, 57), (67, 49), (58, 46), (51, 38), (47, 30), (43, 28)]
STUB = [(96, 54), (103, 44), (105, 37)]
# The twist runs up and to the right: the grain (and the one living strip
# of bark that follows it) climbs from the left root across the trunk's face
# and leaves its right flank at the living limb. U_STRIP is that strip's
# grain line.
def grain(cv):
    # Rounded by the trunk: the lines bow as they wrap, steepening near the edges.
    return cv.xx * 0.8 - (100 - cv.yy) * 0.6 + 3.0 * np.sin(cv.yy * 0.11)


U_STRIP = 56.2
# The living limb and its branches, each tip ending in a foxtail.
LIVE_LIMBS = [  # (polyline, base width, tip width)
    ([(101, 58), (112, 51), (120, 44)], 6, 4),
    ([(120, 44), (117, 35), (113, 28)], 3, 2),
    ([(120, 44), (128, 39), (132, 33)], 3, 2),
    ([(112, 51), (126, 49), (140, 44)], 4, 2),
    ([(126, 49), (136, 55), (144, 56)], 2, 2),
]
FOXTAILS = [  # (base x, y, angle, length): short, thick and upturned
    (113, 29, 98, 10), (132, 34, 72, 10), (140, 45, 38, 11), (144, 57, 12, 10),
    (115, 48, 64, 7),                   # a younger foxtail on the limb itself
]


def deadwood(cv):
    trunk = cv.m_poly(TRUNK)
    spire = limb(cv, SPIRE, 11, 2)
    dead = limb(cv, DEAD_LIMB, 9, 2)
    stub = limb(cv, STUB, 5, 2)
    snags = limb(cv, [(67, 49), (64, 41), (65, 37)], 3, 1) | limb(cv, [(58, 46), (52, 49)], 2, 1) \
        | limb(cv, [(89, 28), (83, 21)], 3, 1) | limb(cv, [(92, 40), (98, 34)], 2, 1)
    roots = (cv.m_poly([(70, 96), (58, 99), (52, 100), (62, 97), (76, 92)])
             | cv.m_poly([(120, 95), (134, 98), (140, 100), (130, 96), (114, 91)])
             | cv.m_poly([(90, 95), (85, 100), (93, 100), (98, 95)]))
    wood = trunk | spire | dead | stub | snags | roots
    # The twist: broad bands of grain spiralling up the trunk and the spire,
    # lighter and darker in turn, with a dark crease between each.
    u = grain(cv)
    band = np.floor(u / 6).astype(int) % 3
    cv.fill(wood, "dw2")
    cv.fill(wood & (band == 0), "dw1")
    cv.fill(wood & (np.mod(u, 6) < 1) & (trunk | spire), "dw3")
    # Along the dead limb the grain runs lengthwise instead.
    for pts in ([(83, 60), (74, 55), (66, 47), (58, 44), (51, 36)], [(85, 64), (75, 59), (67, 52)]):
        cv.fill(cv.m_line(pts) & dead & ~trunk, "dw3")
    # Lit on the left by the starlight, shadowed on the right and below.
    lit = np.zeros_like(wood)
    for dx in (1, 2):
        lit |= wood & ~np.roll(wood, dx, 1)
    cv.fill(lit, "dw1")
    cv.fill(wood & ~np.roll(wood, 1, 1), "dw0")
    cv.fill(wood & ~np.roll(wood, 1, 0) & ~np.roll(wood, 1, 1) | (wood & ~np.roll(wood, 1, 0) & (cv.yy < 60)), "dw0")
    dark = np.zeros_like(wood)
    for dx in (1, 2, 3):
        dark |= wood & ~np.roll(wood, -dx, 1)
    cv.fill(dark & ~lit, "dw3")
    cv.fill(wood & ~np.roll(wood, -1, 1), "dw4")
    cv.fill(wood & ~np.roll(wood, -1, 0) & ~lit, "dw4")
    # A burl and a long split low on the trunk, in shadow; one slot, never a pair.
    cv.ellipse(98, 82, 3, 2.5, "dw2")
    cv.px(97, 81, "dw1")
    cv.outline(cv.m_ellipse(98, 82, 3, 2.5), "dw3", "SE")
    cv.poly([(89, 76), (91, 71), (92, 72), (90, 80)], "dw4")
    return wood


def living(cv, wood):
    """The one strip of living bark: a narrow rust band that follows a single
    grain line from the left root up across the trunk's face, spiralling with
    the twist, and runs out of the right flank into the living limb and its
    branches."""
    u = grain(cv)
    # Narrow where it turns away round the trunk, widest across its face.
    width = 1.2 + 0.8 * np.clip(1 - np.abs(cv.yy - 76) / 22, 0, 1)
    strip = wood & (np.abs(u - U_STRIP) < width) & (cv.yy >= 55) & (cv.xx >= 56)
    branches = np.zeros_like(wood)
    for pts, w0, w1 in LIVE_LIMBS:
        branches |= limb(cv, pts, w0, w1)
    bark = strip | branches
    cv.fill(bark, "rb1")
    cv.fill(bark & ~np.roll(bark, 1, 0), "rb0")
    cv.fill(bark & ~np.roll(bark, 1, 1), "rb0")
    cv.fill(bark & ~np.roll(bark, -1, 0), "rb2")
    cv.fill(bark & ~np.roll(bark, -1, 1), "rb2")
    # Furrows along the strip, following the grain.
    cv.fill(strip & (np.abs(u - U_STRIP - 0.5) < 0.35) & (cv.yy % 5 != 0), "rb2")
    # Where the strip turns round the trunk's edges it drops into the
    # deadwood's shade.
    cv.fill(strip & ~np.roll(wood, -2, 1), "rb2")
    for pts in ([(104, 57), (112, 52), (119, 46)], [(114, 51), (126, 50), (136, 46)]):
        cv.fill(cv.m_line(pts) & branches, "rb2")
    return bark


def foxtail(cv, bx, by, angle, length, thick=9):
    """A bristlecone foxtail: a short, thick cylinder of stiff needles packed
    all round a twig tip, curling up at the end. Needles are short strokes
    angled toward the tip, one every pixel along the twig on each side, in
    alternating lengths so the silhouette bristles like a bottlebrush. The
    upper side catches the starlight, the underside sinks into shadow, and
    rings of needles cross the core."""
    a = math.radians(angle)
    ux, uy = math.cos(a), -math.sin(a)
    nx, ny = -uy, ux                       # a normal; make it the upper side
    if ny > 0 or (ny == 0 and nx > 0):
        nx, ny = -nx, -ny
    steps = int(length)
    pts = []
    for k in range(steps + 1):
        t = k / steps
        pts.append((bx + ux * length * t, by + uy * length * t - 1.5 * t * t, t))
    core = np.zeros((144, 160), bool)
    for cx, cy, t in pts:
        r = (thick / 2) * (1 - 0.3 * t ** 3)
        core |= cv.m_ellipse(cx, cy, r - 1.6, r - 1.6)
    for k, (cx, cy, t) in enumerate(pts):
        r = (thick / 2) * (1 - 0.3 * t ** 3)
        for side, body_c, tip_c in ((1, "nd1", "nd0"), (-1, "nd2", "nd3")):
            L = r + (0.6 if (k + (side > 0)) % 2 else -0.4)
            ex = cx + (nx * side * 0.92 + ux * 0.4) * L
            ey = cy + (ny * side * 0.92 + uy * 0.4) * L
            cv.line([(cx, cy), (ex, ey)], body_c)
            if side < 0 or k % 2 == 0:
                cv.px(ex, ey, tip_c)
    # The tip: a tuft of needles fanning forward.
    tx, ty, _ = pts[-1]
    for d in (-0.5, 0, 0.5):
        ex = tx + (ux + nx * d) * 2.5
        ey = ty + (uy + ny * d) * 2.5
        cv.line([(tx, ty), (ex, ey)], "nd1" if d >= 0 else "nd2")
    cv.fill(core, "nd2")
    along = (cv.xx - bx) * ux + (cv.yy - by) * uy
    cv.fill(core & (np.floor(along).astype(int) % 2 == 0) & ~np.roll(np.roll(core, round(-ny * 2), 0),
                                                                    round(-nx * 2), 1), "nd1")
    cv.fill(core & ~np.roll(np.roll(core, round(ny * 2), 0), round(nx * 2), 1), "nd3")
    return core


def needles(cv):
    out = np.zeros((144, 160), bool)
    for bx, by, ang, L in FOXTAILS:
        out |= foxtail(cv, bx, by, ang, L)
    return out


def frost_light(cv, wood):
    """The waking: a soft dithered halo just outside the deadwood over the
    sky, bright frost lines along its lit edges, glints on the grain, and
    motes lifting off it."""
    sky_like = cv.m_of("s0", "s1", "s2", "s3", "s4", "st1", "st2", "rg0", "rg1")
    near = np.zeros_like(wood)
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            if abs(dx) + abs(dy) <= 2:
                near |= np.roll(np.roll(wood, dy, 0), dx, 1)
    halo = near & ~wood & sky_like
    cv.sparse(halo, "fr3")
    touch = (np.roll(wood, 1, 1) | np.roll(wood, -1, 1) | np.roll(wood, 1, 0) | np.roll(wood, -1, 0)) & ~wood
    cv.fill(touch & sky_like & (cv.yy < 70), "fr3")
    # Frost tracing the lit edge of the deadwood, brightest up the spire.
    edge = wood & cv.m_of("dw0")
    cv.fill(edge & (cv.yy < 60), "fr1")
    cv.fill(edge & (cv.yy < 30), "fr0")
    # Glints along the grain lines.
    for x, y in ((88, 64), (87, 76), (90, 46), (93, 28), (95, 14), (70, 50), (58, 41), (49, 30)):
        if wood[y, x]:
            cv.px(x, y, "fr0")
    for x, y in ((89, 63), (91, 45), (69, 49)):
        if wood[y, x]:
            cv.px(x, y, "fr1")
    # Motes rising off the wood into the night.
    for (x, y), c in zip(((80, 36), (76, 28), (102, 30), (106, 20), (84, 12), (60, 26), (70, 36), (108, 40),
                          (42, 20), (90, 2)), ("fr1", "fr0", "fr1", "fr2", "fr0", "fr2", "fr1", "fr2", "fr2", "fr1")):
        if not wood[y, x]:
            cv.px(x, y, c)
    # The crest under the tree catches the glow.
    rock = cv.m_of("rk1", "rk2", "rk3")
    cv.checker(rock & cv.m_ellipse(TX, GROUND + 2, 30, 5), "fr3")
    cv.fill(rock & cv.m_ellipse(TX, GROUND + 1, 16, 2.5) & (cv.yy < 97), "fr2")


# =============================================================================
# The player, small, from behind
# =============================================================================
PLAYER = [
    "...kkkk...",
    "..kGGGgk..",
    ".kGGGggdk.",
    ".kHHHHhhk.",
    ".kHHHHhhk.",
    "..kssssk..",
    ".kPPPPPpk.",
    "kPPPPPPppk",
    "kOOOOOOook",
    "kPPPPPPppk",
    ".kAAAAaak.",
    ".kPPkkPpk.",
    ".kPPk.kpk.",
    ".kkkk.kkk.",
]
PLAYER_KEY = {"k": "ink", "G": "cp0", "g": "cp1", "d": "cp2", "H": "hr0", "h": "hr1", "s": "sk",
              "P": "pk0", "p": "pk1", "O": "or0", "o": "or1", "A": "aq0", "a": "aq1"}


def player(cv):
    rows = [r.replace(" ", ".") for r in PLAYER]
    x0, y0 = 40, 96 - len(rows)
    cv.stamp(rows, x0, y0, PLAYER_KEY)
    # A rim of frost-light on the side facing the tree.
    for y in range(y0 + 2, y0 + len(rows) - 2):
        row = rows[y - y0]
        x = x0 + max(i for i, c in enumerate(row) if c not in ".")
        cv.px(x, y, "fr3")
    # Their shadow on the frosted rock, cast away from the tree's glow.
    cv.line([(x0 - 2, 96), (x0 + 7, 96)], "rk3")


def methuselah_night():
    cv = Canvas(PAL, "s0")
    sky(cv)
    stars(cv)
    ranges(cv)
    summit(cv)
    wood = deadwood(cv)
    bark = living(cv, wood)
    needles(cv)
    frost_light(cv, wood & ~bark)
    player(cv)
    return cv.image()


STILLS = {"methuselah_night": methuselah_night}


def build(write=True):
    out = {key: fn() for key, fn in STILLS.items()}
    for key, im in out.items():
        assert im.size == (160, 144), key
    if write:
        common.write_set("stills", out, "stillspg")
    return out
