"""16px Chapter 9 walk sheets and one object, on the Round-3 character kit.

  rook             VALERIAN ROOK, the Dragon warden of Sanguine Ridge. Tall
                   and severe: white hair cropped flat and close, the head
                   rising a pixel above the usual crown, a long lined face
                   under a hard level brow. A long oxblood-red coat to the
                   ankles over dark clothes, a short stone-grey mantle over
                   the shoulders with a high collar standing up to the jaw,
                   and a carved dragon-tree staff that rises above his head
                   (a forked crown with a bead of red resin set in it).
  stone_botanist   Thistledown's living-stones botanist: a wide round sun hat
                   whose brim droops at the sides, khaki field shirt and
                   trousers, a jeweller's loupe on a cord at the chest, and a
                   little specimen tray of pebble-plants held out in front.
  tumbleweed_roll  a loose tangled ball of dry pale-tan twigs, 14px across.
                   Columns turn it 0, 30 and 60 degrees so moveNpc reads as
                   rolling; every row is the same image.

Silhouette checks: rook is the only cast member in red to the ankles with a
grey capelet and a staff that rises over the head (hollis wears a flat cap
and an olive jacket and carries a billhook; mercer's coat is charcoal with
no mantle; the shrine keeper's staff is plain cedar). The botanist's brim is
the widest hat in the cast and droops at the ends, unlike the gardener's,
hiker's and birdwatcher's flat brims. Right rows are mirrored and re-lit by
characters.sheet.
"""
from __future__ import annotations

import math

import common9 as common
import characters as ch
from characters import BODIES, DEFAULT_PAL, HEADS
from PIL import Image

# --- ramps shared with portraits9 and stills9 --------------------------------
OXBLOOD, OXBLOOD_S, OXBLOOD_H = "#8c2830", "#5a1420", "#b04848"
MANTLE, MANTLE_S, MANTLE_H = "#8c8c90", "#585864", "#b8b8b0"
WHITE_HAIR, WHITE_HAIR_S = "#f0f0e8", "#b0b0c0"
DARK, DARK_S = "#383040", "#201c28"
STAFF, STAFF_S, STAFF_H = "#c8a070", "#806048", "#e8c898"   # dragon-tree wood: pale, warm
RESIN, RESIN_S, RESIN_H = "#d02828", "#801018", "#f87060"

KHAKI, KHAKI_S = "#c8b080", "#907850"
TROUSER, TROUSER_S = "#887850", "#5c5038"
SUNHAT, SUNHAT_S = "#f0e0b0", "#c0a870"
BAND = "#a05838"

# Rook's coat: long to the ankles and split at the front over dark clothes
# (the inner N line); the sleeves stay oxblood under the mantle.
BODIES["warden"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTNTtt....",
                "....TTTTNTtt....",
                "....TTTTNTtt....",
                "....TTTTNttt....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTNTtt....",
                "....TTTTNTtt....",
                "....TTTTNttt....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....TTTTTtt....",
                ".....TTTTTttt...",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Tt......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                "....TTTTTTttt...",
                "....TTTTTTtttt..",
                "...FFF.....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Tt.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                "....TTTTTTttt...",
                "....TTTTTTtttt..",
                "....fff..FF.....",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........t......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["warden"]["up"] = {
    "stand": [(k, [r.replace("N", "T") for r in rows], x, y, *o) for k, rows, x, y, *o in
              BODIES["warden"]["down"]["stand"]],
    "a": [(k, [r.replace("N", "T") for r in rows], x, y, *o) for k, rows, x, y, *o in
          BODIES["warden"]["down"]["a"]],
}

# Close-cropped white hair, flat on top and tight at the temples; the brow is
# a hard level line (K) and a shade pixel under each eye lines the face.
HEADS["crop"] = {
    "down": ["....HHHHHHHh....", "...HHHHHHHHhh...", "...HSSSSSSSSh...", "...SKKSSSSKKs...",
             "...SSESSSSESs...", "...SsSSSSSSss...", "....SsSSSSsS....", ".....SSSSSs....."],
    "up": ["....HHHHHHHh....", "...HHHHHHHhhh...", "...HHHHHHhhhh...", "...JHHHHhhhjj...",
           "...JJJJjjjjjj...", "...SJjjjjjjjs...", "....SSSSSSss....", ".....SsSSss....."],
    "left": ["....HHHHHHHh....", "...HHHHHHHHhh...", "...SSSSSHHHhh...", "..KKSSSSHHHh....",
             "...ESSSSSHjh....", "..SsSSSSSSh.....", "...SsSSSSs......", "....SSSSs......."],
}

# The sun hat: a low round crown with a terracotta band (A) and a wide brim
# (D) that droops a pixel at each end.
HEADS["sunhat"] = {
    "down": ["......CCCc......", ".....CCCCCc.....", ".....AAAAAa.....", ".DDDDDDDDDDDDdd.",
             "D..HSSSSSSSSh..d", "...SSESSSSESs...", "...HSESSSSESh...", "....SSSSSSSs...."],
    "up": ["......CCCc......", ".....CCCCCc.....", ".....AAAAAa.....", ".DDDDDDDDDDDDdd.",
           "D..HHHHHHHHhh..d", "...HHHHHHHHhh...", "...SHHHHHHHhs...", "....SSSSSSss...."],
    "left": [".......CCCc.....", "......CCCCCc....", "......AAAAAa....", "DDDDDDDDDDDDDdd.",
             "...SSSSSHHHh..d.", "...SESSSHHHh....", "..SSSSSSSHh.....", "...SSSSSSs......"],
}

ROOK = dict(head="crop", body="warden", pal={
    "T": OXBLOOD, "t": OXBLOOD_S, "H": WHITE_HAIR, "h": WHITE_HAIR_S, "J": "#c8c8d0", "j": "#9898a8", "N": DARK_S,
    "F": DARK, "f": DARK_S, "G": DARK, "g": DARK_S,
    "M": MANTLE, "m": MANTLE_S, "O": STAFF, "o": STAFF_S, "Y": RESIN, "y": RESIN_S,
    "S": "#e8c0a0", "s": "#b88868", "L": "#e8c0a0", "R": "#e8c0a0",
})
ROOK["acc"] = [
    # The short stone-grey mantle over both shoulders. No line under it:
    # grey on oxblood reads, and it keeps three rows of red coat showing.
    {"down": [(["MMMMMMMMMMmm", ".mMMMMMMmmm."], 2, 9)],
     "up": [(["MMMMMMMMMMmm", ".mmMMMMmmmm."], 2, 9)],
     "left": [(["MMMMMMMm", ".MMMMMmm"], 4, 9)], "z": "front", "sides": "NEW"},
    # Its high collar standing up round the neck, under the jaw.
    {"down": [(["MMMMMMMm"], 4, 8)], "up": [(["MMMMMMmm"], 4, 8)], "left": [(["MMMm"], 7, 8)],
     "z": "front", "sides": "EW"},
    # The clasp at the throat: a bead of dragon's-blood resin.
    {"down": [(["Y"], 7, 9)], "left": [(["Y"], 5, 9)], "z": "front", "line": False},
]
# The carved dragon-tree staff, taller than he is: a forked crown with a
# resin bead (Y) set at the fork. It stands at his side, planted rather than
# swung, so it never crosses the face; from the side it rides behind him.
STAFF_ROWS = ["O.O", "oYo", ".O.", ".o.", ".O.", ".O.", ".o.", ".O.", ".O.", ".O.", ".o.", ".O.", ".O.", ".o."]
ROOK["acc"].insert(0, {"left": [(STAFF_ROWS, 11, 0)], "z": "back"})
ROOK["acc"].append({"down": [(STAFF_ROWS, 13, 0)], "up": [(STAFF_ROWS, 0, 0)], "z": "front"})

LOUPE = "#a0c8d8"
BOTANIST = dict(head="sunhat", body="casual", pal={
    "C": SUNHAT, "c": SUNHAT_S, "D": SUNHAT, "d": SUNHAT_S, "A": BAND, "a": "#703828",
    "H": "#5a3828", "h": "#3a2418", "S": "#d8a070", "s": "#a87048", "L": "#d8a070", "R": "#d8a070",
    "T": KHAKI, "t": KHAKI_S, "B": TROUSER, "b": TROUSER_S, "G": TROUSER, "g": TROUSER_S,
    "F": "#604030", "f": "#402818", "P": "#585048", "Q": LOUPE, "q": "#507088",
    "V": "#a07048", "v": "#684828", "X": "#c8a0a0", "x": "#90a070",
})
BOTANIST["acc"] = [
    # The loupe on its dark cord, a bright lens with one glint at the chest.
    {"down": [(["P..P", ".PP.", ".WQ."], 6, 9)], "left": [(["P.", "WQ"], 5, 9)], "z": "mid", "line": False},
    {"up": [(["P....P", ".PPPP."], 5, 9)], "z": "mid", "line": False},
    # The specimen tray held out in front at the waist: a wooden rim and three
    # pebble-plants (pink X, green x) in its compartments.
    {"down": [(["XxX", "VVVv"], 6, 11)], "left": [(["xX", "VVv"], 3, 11)], "z": "front"},
]
BOTANIST["pal"]["W"] = "#f8f8f8"


# =============================================================================
# The tumbleweed
# =============================================================================
WEED_PAL = {"L": "#f8e8b8", "M": "#e0c088", "D": "#b08850", "K": "#503018"}
CX, CY = 7.5, 8.5

# Twigs in the ball's own frame: polar polylines (angle in degrees, radius in
# px). Broken arcs round the rim give the round silhouette with gaps; a few
# chords and hooks cross the inside and a couple of twig ends stick out, so
# the ground shows through and the ball reads as loose, not as a disc.
def _arc(a0, a1, r0, r1):
    n = max(2, int(abs(a1 - a0) / 10))
    return [(a0 + (a1 - a0) * i / n, r0 + (r1 - r0) * i / n) for i in range(n + 1)]


TWIGS = [
    _arc(-20, 70, 6.6, 6.0), _arc(85, 160, 6.4, 6.6), _arc(175, 250, 6.6, 6.1), _arc(262, 330, 6.0, 6.6),
    _arc(40, 110, 4.4, 4.8),
    [(150, 6.5), (100, 3.0), (30, 2.0), (330, 4.2), (305, 6.4)],
    [(225, 6.2), (180, 2.2), (95, 1.4), (20, 4.4), (0, 7.4)],
    [(70, 6.4), (40, 3.0), (300, 1.8), (250, 4.8)],
    [(120, 7.3), (128, 6.0)], [(245, 7.4), (238, 6.0)],
]


def weed_frame(turn_deg):
    """Rasterise the twigs rotated by turn_deg (clockwise on screen); the
    shade comes from where each pixel lands, so light stays top-left."""
    pts = set()
    for twig in TWIGS:
        xy = []
        for a, r in twig:
            t = math.radians(a + turn_deg)
            xy.append((CX + r * math.cos(t), CY + r * math.sin(t)))
        for (x0, y0), (x1, y1) in zip(xy, xy[1:]):
            n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 2))
            for i in range(n + 1):
                x = int(math.floor(x0 + (x1 - x0) * i / n))
                y = int(math.floor(y0 + (y1 - y0) * i / n))
                if 0 <= x < 16 and 1 <= y < 16:
                    pts.add((x, y))
    # Every twig gets a 1px dark outline (as layers do in the character kit),
    # so the tangle reads on pale sand; wide gaps stay open.
    line = set()
    for x, y in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pts and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                line.add(q)
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for x, y in line:
        px[x, y] = ch.gbc.hexc(WEED_PAL["K"])
    for x, y in pts:
        d = (x - CX) + (y - CY)
        c = "D" if d > 3.0 else "L" if d < -3.5 else "M"
        px[x, y] = ch.gbc.hexc(WEED_PAL[c])
    return im


def tumbleweed_roll():
    frames = [weed_frame(a) for a in (0, 30, 60)]
    return ch.static_sheet([frames] * 4)


def images():
    return {"rook": ch.sheet(ROOK), "stone_botanist": ch.sheet(BOTANIST), "tumbleweed_roll": tumbleweed_roll()}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
