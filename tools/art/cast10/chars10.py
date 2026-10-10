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
  elder_root      the Elder as an overworld object at the heart: a gnarled
                  tangle of five thick pale aspen roots, about the player's
                  size, trailing out along the ground at both sides and
                  twisting together into a knuckled knot, with the soil
                  showing through the gaps between strands. Three small round
                  golden aspen leaves on short stems sprout from the top and
                  a soft green-gold glow sits in the crevices. Column 0 is the
                  resting glow, columns 1-2 the pulse (the crevices brighten
                  and motes of light rise); every row is the same, so turning
                  to face the player changes nothing. No face and no paired
                  dark marks: crevices are long and irregular, and the gaps
                  never sit side by side.

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
ROOT_PAL = {"K": "#181818", "L": ASPEN_H, "M": "#dcd8bc", "D": "#9c9880",
            "c": "#a8c860", "C": "#e8f890",                     # crevice glow: resting, pulse
            "Y": "#f8d850", "y": "#c89830", "B": "#6c4818",      # golden aspen leaves, dark gold outline
            "s": "#6c8838", "x": "#b8d878", "o": "#f8f8c0"}      # leaf stems, glow motes

# Drawn by hand, pixel by pixel. Five pale roots: two trail out along the
# ground at the corners and climb as the outer legs, one climbs the middle,
# and two cross over the crown in a knuckled knot; the soil shows through
# the gaps between them (left under the crown, right lower down, so no two
# gaps sit side by side). The dark slot (D) is each strand's shadow side
# and the crevices where strands press together; the brightest crevices (c)
# hold the Elder's green-gold glow, which pulses. Three small round golden
# aspen leaves on short stems sprout from the top of the knot.
ROOT_ROWS = [
    ".B.....B.....B..",
    "BYB...BYB...BYB.",
    "BYyB..BYyB..ByYB",
    ".BBs...Bs...sBB.",
    "....s...s..s....",
    "....KsKKsKsKK...",
    "...KLLMMLMDLDK..",
    "..KLMDcLLMMDLDK.",
    "..KLDK.KLMDcLMDK",
    ".KLMK..KLMDcLLDK",
    ".KLDcDKLDcK.KLMK",
    ".KLMcKKLMDK.KLDK",
    "KLDKLDcLDK.KLMcK",
    "LMDK.KLMDcKKLDKD",
    "MDK.KLDKLMDKKMDL",
    "DK..KDK.KLDK.KDD",
]
MOTES_DIM = [(14, 4), (1, 6)]
MOTES_LIT = [(2, 4), (14, 4), (1, 6), (15, 7), (0, 9), (15, 3)]


def root_frame(pulse: int):
    g = [list(r) for r in ROOT_ROWS]
    for x, y in MOTES_LIT if pulse else MOTES_DIM:
        assert g[y][x] == ".", (x, y)
        g[y][x] = "o" if pulse else "x"
    out = Image.new("RGBA", (16, 16), ch.gbc.CLEAR)
    px = out.load()
    for y, row in enumerate(g):
        for x, c in enumerate(row):
            if c == "c" and pulse:
                c = "C"                                   # the crevice glow brightens on the pulse
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
