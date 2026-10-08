"""16px Chapter 8 walk sheet for MERCER THORNE, on the Round-3 character kit.

  mercer   Rootstock's founder and BRAM's father. Tall and lean: his swept-back
           hair rises a pixel above the usual crown and his long charcoal
           frock coat falls to the ankles, its high collar standing up beside
           the jaw. Silver-streaked hair in BRAM's blue-black, BRAM's heavy
           brow, a short trimmed grey beard, a gold root-knot pin on the
           lapel, and a leather map tube slung across his back (the brass
           cap shows above his shoulder from the front; the whole tube crosses
           his back from behind).

Silhouette checks: no hat (gentleman wears a bowler), no lab-coat white
(researcher), and the only cast member whose coat reaches the ankles with a
tube rising over one shoulder. Right rows are mirrored and re-lit by
characters.sheet.
"""
from __future__ import annotations

import common8 as common
import characters as ch
from characters import BODIES, HEADS

# --- ramps shared with portraits8 and stills8 --------------------------------
COAT, COAT_S = "#585c6c", "#383c4a"
HAIR, HAIR_S = "#2c3c7c", "#18204a"          # BRAM's blue-black, a shade deeper
SILVER, SILVER_S = "#d0d0d8", "#9898a8"
BEARD, BEARD_S = "#b8b8c0", "#8888a0"
LEATHER, LEATHER_S = "#a86838", "#6c4020"
BRASS, BRASS_S = "#e8c058", "#a07c28"
PIN = "#e8c058"

# The frock coat: narrow through the body and long to the ankles, the skirt
# split at the front so a dark trouser line shows as he walks.
BODIES["frock"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                ".....TTTTTt.....",
                ".....TTTTTt.....",
                ".....TTTTtt.....",
                "....TTTTTttt....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "....T......t....",
                "...T........t...",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                ".....TTTTTt.....",
                ".....TTTTTt.....",
                "....TTTTTttt....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "....T......t....",
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
BODIES["frock"]["up"] = BODIES["frock"]["down"]

# Swept-back hair, silver streaked back from the temples, BRAM's heavy brow (K) and a grey beard (M).
HEADS["swept"] = {
    "down": ["................", ".....HHHHHh.....", "....HJHHhHHh....", "...HJJHHHhHhh...",
             "...JSSSSSSSSj...", "...SKKSSSSKKs...", "...SSESSSSESs...", "....SMMMMMMs...."],
    "up": ["................", ".....HHHHHh.....", "....HHHHHHHh....", "...HHHHHHHHhh...",
           "...JHHhHHHhhj...", "...JHHHHHHHhj...", "...SHHHHHHHhs...", "....MSSSSSsm...."],
    "left": ["................", ".....HHHHHh.....", "....HHJHHHHHh...", "...HHJJHHHHHhh..",
             "...SSSSJHHHhh...", "...KKSSJHHhh....", "..SESSSSSHh.....", "...MMMMMSm......"],
}


MERCER = dict(head="swept", body="frock", pal={
    "T": COAT, "t": COAT_S, "H": HAIR, "h": HAIR_S, "J": SILVER, "j": SILVER_S, "M": BEARD, "m": BEARD_S,
    "F": "#302828", "f": "#201818", "G": COAT_S, "g": "#282a34",
    "O": LEATHER, "o": LEATHER_S, "A": BRASS, "a": BRASS_S, "P": LEATHER_S, "Y": PIN, "N": "#282a34",
})
MERCER["acc"] = [
    # The map tube on his back: from the front only its brass cap shows above
    # the left shoulder (screen right); from behind it crosses his whole back;
    # from the side it rides behind the shoulder blade.
    {"down": [(["Aa", "Oo", "Oo"], 13, 7)], "z": "back"},
    {"left": [(["Aa", "Oo", "Oo"], 11, 7)], "z": "head", "sides": "NES"},
    {"up": [(["AA......", "aOo.....", ".OOo....", "..OOo...", "...OOo..", "....OOo.", ".....Oo."], 2, 6)],
     "z": "front"},
    # Its strap across the chest, shoulder to hip.
    {"down": [(["....P", "...P.", "..P..", ".P..."], 6, 9)], "z": "mid", "line": False},
    # The front edge of the coat and the root-knot pin on the lapel.
    {"down": [(["N", "N", "N"], 8, 11)], "z": "mid", "line": False},
    {"down": [(["Y"], 6, 9)], "left": [(["Y"], 6, 10)], "z": "mid", "line": False},
    # The high collar standing up either side of the jaw.
    {"down": [(["T", "T"], 3, 7)], "z": "head", "sides": "NW"},
    {"down": [(["t", "t"], 12, 7)], "z": "head", "sides": "N"},
    {"up": [(["TTTTTTtt"], 4, 8)], "z": "front", "sides": "NEW"},
    {"left": [(["Tt", "Tt"], 9, 7)], "z": "head", "sides": "NE"},
]


def images():
    return {"mercer": ch.sheet(MERCER)}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
