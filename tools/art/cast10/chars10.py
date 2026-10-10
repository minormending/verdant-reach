"""16px Chapter 10 walk sheets and one object, on the Round-3 character kit.

  rowan           ROWAN VALE, the Keeper of the Elder Grove and DR. VALE's
                  brother. Lean and weathered, in his fifties: a moss-green
                  hooded keeper's cloak to the shins, open down the front
                  over earth-brown clothes, the hood rising a pixel above the
                  usual crown and pushed back far enough to show grey-streaked
                  auburn hair (VALE's red, darker and greyer), a short
                  grizzled beard, and a carved aspen-wood staff with a crook
                  at the top and a small brass bell hung from it. He stands
                  still and upright, the staff planted at his side.
  council_warden  the Council's Route 12 marks warden: a formal grey-green
                  robe to the ankles with wide sleeves and a gold leaf-shaped
                  badge on the breast, a tall straight-sided ceremonial hat in
                  a darker green with a gold band, flaring a little at the
                  crown, and a red ledger of marks held at the waist.
  elder_root      the Elder as an overworld object at the heart: a knot of
                  pale aspen roots rising out of the ground, about the
                  player's size, three pale shoots at its crown and a soft
                  green-gold glow. Column 0 is the resting glow, columns 1-2
                  the pulse (the veins in the roots light up and the glow
                  spreads a pixel); every row is the same, so turning to face
                  the player changes nothing. No face and no paired dark
                  marks: the knot is all strands and light.

Silhouette checks: rowan is the only cast member in a hood, and his crook
staff with its bell is pale and low (rook's is red-brown and forked, taller
than he is). The warden's hat is the tallest straight-sided hat in the cast
(gentleman's bowler is round and low, the grunt's cap is peaked). Right rows
are mirrored and re-lit by characters.sheet.
"""
from __future__ import annotations

import common10 as common
import characters as ch
from characters import BODIES, HEADS
from PIL import Image

# --- ramps shared with portraits10 and stills10 ------------------------------
MOSS, MOSS_S, MOSS_H = "#6c8c48", "#44603a", "#98b868"        # the keeper's cloak
EARTH, EARTH_S = "#8a6040", "#5c3c28"                           # earth-brown clothes
AUBURN, AUBURN_S = "#b05838", "#783020"                          # VALE's red, darker
GREY_STREAK = "#c8c0b8"
BEARD, BEARD_S = "#a07058", "#6c4838"                            # grizzled auburn
ASPEN, ASPEN_S, ASPEN_H = "#e8e0c8", "#a8a088", "#f8f8e8"         # pale aspen wood
BELL, BELL_S = "#e8c058", "#a07c28"
BOOT, BOOT_S = "#4a3020", "#2e1c14"
SKIN, SKIN_S = "#e8b890", "#b88060"                              # weathered

ROBE, ROBE_S, ROBE_H = "#98a890", "#66786a", "#c0ccb4"            # Council grey-green
HAT, HAT_S = "#4c6450", "#2e4234"
GOLD, GOLD_S = "#f0c848", "#a88020"
LEDGER, LEDGER_S = "#a83838", "#682020"

# The keeper's cloak: closed at the throat, open down the front over brown
# (B), and flaring at the hem a pixel wider than a coat each side; the arms
# are the cloak's own folds, the hands just showing.
BODIES["cloak"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTBBTtt....",
                "....TTTBBTtt....",
                "...TTTTBBTttt...",
                "...TTTTBBtttt...",
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
                "....TTTBBTtt....",
                "...TTTTBBTttt...",
                "...TTTTBBtttt...",
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
                ".....BTTTTtt....",
                "....TBTTTTttt...",
                "....TBTTTTtttt..",
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
                ".....BTTTTtt....",
                "....TBTTTTttt...",
                "....TBTTTTtttt..",
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
                ".....BTTTTtt....",
                "....TBTTTTttt...",
                "....TBTTTTtttt..",
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
BODIES["cloak"]["up"] = {
    pose: [(k, [r.replace("B", "T") for r in rows], x, y, *o) for k, rows, x, y, *o in layers]
    for pose, layers in BODIES["cloak"]["down"].items()
}

# The hood: moss green (C), rising a pixel above the usual crown and pushed
# back so a band of auburn hair (H) with a grey streak (J) shows under its
# rim; kind eyes, and a short grizzled beard (M) along the jaw.
HEADS["hood"] = {
    "down": ["......CCCc......", ".....CCCCCc.....", "....CCCCCCcc....", "...CCHHJHHHhc...",
             "...CHSSSSSShc...", "...CSESSSSESc...", "...CSSSSSSSsc...", "...cCMMMMMMcc..."],
    "up": ["......CCCc......", ".....CCCCCc.....", "....CCCCCCcc....", "...CCCCCCCccc...",
           "...CCCCCCcccc...", "...CCCCCCcccc...", "...CCCCCCcccc...", "....cCCCCccc...."],
    "left": ["......CCCc......", ".....CCCCCCc....", "....CCCCCCCcc...", "...CHHJCCCCcc...",
             "...SSSSHCCCcc...", "...ESSSSCCCcc...", "..SSSSSSCCcc....", "...MMMMMCcc....."],
}

ROWAN = dict(head="hood", body="cloak", pal={
    "C": MOSS, "c": MOSS_S, "T": MOSS, "t": MOSS_S, "B": EARTH, "b": EARTH_S,
    "H": AUBURN, "h": AUBURN_S, "J": GREY_STREAK, "M": BEARD, "m": BEARD_S,
    "S": SKIN, "s": SKIN_S, "L": SKIN, "R": SKIN,
    "F": BOOT, "f": BOOT_S, "G": BOOT, "g": BOOT_S,
    "O": ASPEN, "o": ASPEN_S, "Y": BELL, "y": BELL_S, "A": BELL,
})
# The aspen staff: a crook at the top with the brass bell hung from its tip.
# Planted at his side, never swung; from the side it rides behind him.
STAFF_ROWS = [".OO", "O.O", "O.Y", "O..", "O..", "o..", "O..", "O..", "O..", "o..", "O..", "O..", "O.."]
ROWAN["acc"] = [
    # The hood falls down his back as a point over the cloak.
    {"up": [(["CCCc", ".Cc."], 6, 8)], "z": "front", "sides": "ESW"},
    {"left": [(["Cc", "c."], 10, 8)], "z": "back"},
    # The cloak's clasp at the throat.
    {"down": [(["A"], 7, 9)], "left": [(["A"], 5, 9)], "z": "front", "line": False},
    {"left": [(STAFF_ROWS, 13, 1)], "z": "back"},
    {"down": [(STAFF_ROWS, 12, 1)], "up": [([r[::-1] for r in STAFF_ROWS], 1, 1)], "z": "front"},
]

# The Council robe: straight to the ankles, wide sleeves that bell at the
# wrist, a gold-trimmed front edge.
BODIES["robe"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTttt....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "..TT........tt..",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTttt....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "..TL........tt..",
                "............R...",
            ], 0, 10),
        ],
    },
    "left": BODIES["cloak"]["left"],
}
BODIES["robe"]["up"] = BODIES["robe"]["down"]

# A tall straight-sided ceremonial hat (C) flaring a little at the crown,
# with a gold band (A) where it meets the brow; dark hair (H) at the temples.
HEADS["tallhat"] = {
    "down": ["....CCCCCCcc....", ".....CCCCCc.....", ".....CCCCCc.....", "....AAAAAAaa....",
             "...HSSSSSSSSh...", "...SSESSSSESs...", "...SSSSSSSSss...", "....SSSSSSSs...."],
    "up": ["....CCCCCCcc....", ".....CCCCCc.....", ".....CCCCCc.....", "....AAAAAAaa....",
           "...HHHHHHHHhh...", "...HHHHHHHHhh...", "...SHHHHHHHhs...", "....SSSSSSss...."],
    "left": [".....CCCCCCcc...", "......CCCCCc....", "......CCCCCc....", ".....AAAAAAa....",
             "...SSSSSHHHhh...", "...ESSSSSHHh....", "..SSSSSSSHh.....", "...SSSSSSs......"],
}

WARDEN = dict(head="tallhat", body="robe", pal={
    "C": HAT, "c": HAT_S, "A": GOLD, "a": GOLD_S, "H": "#584038", "h": "#382820",
    "T": ROBE, "t": ROBE_S, "B": ROBE, "b": ROBE_S, "F": "#383430", "f": "#201c18",
    "Y": GOLD, "y": GOLD_S, "V": LEDGER, "v": LEDGER_S, "W": "#f0e8d0",
})
WARDEN["acc"] = [
    # The gold leaf badge on the breast and the gold-trimmed front edge.
    {"down": [(["Y", "y"], 6, 9)], "left": [(["Y"], 6, 10)], "z": "mid", "line": False},
    {"down": [(["y", "y", "y"], 8, 11)], "z": "mid", "line": False},
]
WARDEN["held"] = {
    # The ledger of marks, held closed at the waist, pages showing on top.
    "down": (["WWW", "VVv", "VVv"], "R", -2, -1, "front"),
    "up": (["VVv", "VVv"], "L", 0, -1, "back"),
    "left": (["WW", "Vv", "Vv"], "L", -2, -1, "front"),
}


# =============================================================================
# The Elder's root knot
# =============================================================================
ROOT_PAL = {"K": "#181818", "L": ASPEN_H, "M": "#e0dcc0", "D": "#bcb89c", "N": "#908c74",
            "G": "#f0f0a8", "g": "#c0d878", "Q": "#506434", "V": "#f0f8a0", "x": "#c8e088", "o": "#f0f8c0"}

# The silhouette: a column of roots rising out of the soil, rounded at the
# crown, swelling into a knot and flaring into three roots that dive back
# into the ground (the gaps between them show the soil). Spans are inclusive
# x ranges per row; the outline is added round them.
KNOT_SPANS = {5: [(6, 10)], 6: [(5, 11)], 7: [(5, 11)], 8: [(4, 11)], 9: [(5, 12)], 10: [(4, 12)],
              11: [(3, 12)], 12: [(3, 13)], 13: [(2, 13)],
              14: [(0, 4), (6, 9), (11, 15)], 15: [(0, 1), (7, 8), (14, 15)]}
# Three pale shoots spreading from the crown (no outline: thin and light).
SHOOTS = [(3, 1, "G"), (4, 2, "g"), (5, 3, "g"), (6, 4, "g"), (8, 0, "G"), (8, 1, "G"), (8, 2, "g"), (8, 3, "g"),
          (8, 4, "g"), (13, 1, "G"), (12, 2, "g"), (11, 3, "g"), (10, 4, "g")]
MOTES_DIM = [(2, 6), (14, 8), (1, 11)]
MOTES_LIT = [(2, 5), (14, 6), (1, 9), (15, 11), (5, 1), (11, 1), (0, 12)]


def root_frame(pulse: int):
    g = [["."] * 16 for _ in range(16)]
    body = {(x, y) for y, runs in KNOT_SPANS.items() for a, b in runs for x in range(a, b + 1)}
    for x, y in body:
        # The twist: diagonal strands, each lit on its left edge (L), pale
        # across (M), turning into shade (D) and a crease (N) where the next
        # strand wraps over it; the outer edges stay lit left, shaded right.
        c = "LMMDN"[(x + y) % 5] if y < 14 else "M"
        if (x - 1, y) not in body:
            c = "L"
        elif (x + 1, y) not in body and c != "N":
            c = "D"
        if pulse and c == "M" and (x + y) % 5 == 2:
            c = "V"                                   # the glow runs up every strand
        g[y][x] = c
    for x, y in body:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in body and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                g[q[1]][q[0]] = "K"
    # The shoots get a dark green outline (hue-shifted, not black), so they
    # read on grass without weighing as much as the knot.
    shoot = {(x, y) for x, y, _ in SHOOTS}
    for x, y in shoot:
        for dx, dy in ((1, 0), (-1, 0), (0, -1)):
            q = (x + dx, y + dy)
            if q not in shoot and 0 <= q[0] < 16 and 0 <= q[1] < 16 and g[q[1]][q[0]] == ".":
                g[q[1]][q[0]] = "Q"
    for x, y, c in SHOOTS:
        g[y][x] = "o" if pulse and c == "G" else c   # the shoot tips flare on the pulse
    for x, y in MOTES_LIT if pulse else MOTES_DIM:
        if g[y][x] == ".":
            g[y][x] = "o" if pulse else "x"
    out = Image.new("RGBA", (16, 16), ch.gbc.CLEAR)
    px = out.load()
    for y, row in enumerate(g):
        for x, c in enumerate(row):
            if c != ".":
                px[x, y] = ch.gbc.hexc(ROOT_PAL[c])
    return out


def elder_root():
    a, b = root_frame(0), root_frame(1)
    return ch.static_sheet([[a, b, b]] * 4)


def images():
    return {"rowan": ch.sheet(ROWAN), "council_warden": ch.sheet(WARDEN), "elder_root": elder_root()}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
