"""Chapter 4 overworld characters -> public/art/characters/<key>/.

Built on the Round-3 compositor in tools/art/characters.py (layers with
auto-outlines, lit/shade region letters, the 1px walk bob, the right row
mirrored and re-lit). New here: a floor-length gown body for FLORA, and
heads for the Glasshouse City cast: a bouffant, a cropped headset cut, a
fedora with a press card, a bowler, a high ponytail, a knit beanie and a
sun bonnet.

  flora_vance       platinum waves, a red rose pinned in, crimson gown,
                    white stole, a long-stemmed rose in hand
  wren              navy-black crop swept over one eye with a teal streak,
                    headset, charcoal jacket with a teal lanyard, tablet
  nursery_keeper    white hair and moustache, brown cardigan, the couple's
                    green apron, a seedling in a pot
  nursery_keeper_b  grey hair under a straw sun bonnet with a pink ribbon,
                    lavender dress, the green apron, a trug of seed packets
  researcher        the Relay's teal lab coat, headphones round the neck,
                    clipboard
  orchardist        orange knit beanie, red flannel, dungarees, apple basket
  arranger          black high ponytail, lilac blouse, green apron, one
                    flower and a pair of snips
  reporter          fedora with a press card, mustard trench, microphone
  gentleman         bowler, grey moustache, bottle-green frock coat, a
                    bouquet of red roses for FLORA
  rose_gate         a rose-trellis gate (environment style; see rose_gate())
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401  (sets sys.path for the Round-3 modules)

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import characters as ch  # noqa: E402
import gbc  # noqa: E402
from characters import BODIES, HEADS, Frame  # noqa: E402

# =============================================================================
# Bodies
# =============================================================================
# Floor-length gown that flares into a small train; the hem swings with the
# step and a shoe tip shows on the leading foot.
BODIES["gown"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                "...BBBBBBBBbb...",
                "...BBBBBBBbbb...",
                "..BBBBBBBBbbbb..",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 9, "NEW"),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                "...BBBBBBBBbb...",
                "..BBBBBBBBbbb...",
                "..BFBBBBBBbbbb..",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 10, "NEW"),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "....BBBBBBbb....",
                "....BBBBBBbbb...",
                "...BBBBBBBbbbb..",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Tt......",
                "........LL......",
            ], 0, 9, "W"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "....BBBBBBbb....",
                "...BBBBBBBbbb...",
                "..FBBBBBBbbbb...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Tt.....",
                "..........L.....",
            ], 0, 10, "W"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "....BBBBBBbb....",
                "....BBBBBBbbb...",
                "....BBBBBBbbbbb.",
            ], 0, 10),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "W"),
        ],
    },
}
BODIES["gown"]["up"] = BODIES["gown"]["down"]


# =============================================================================
# Heads (8 rows; row 0 stays clear for the outline)
# =============================================================================
# FLORA: big platinum waves past the jaw, a side part, a ribbon of shade.
HEADS["bouffant"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHhhh..",
        "..HHHHSSSSSHhh..",
        "..HHSESSSSEShh..",
        "..HHSESSSSEShh..",
        "..HhSSSZSSShhh..",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHhhh..",
        "..HHHhHHHHhHhh..",
        "..HHhHHHHhHHhh..",
        "..HhHHHHhHHHhh..",
        "..HHHHHhHHHhhh..",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "...HSSSHHHhHhh..",
        "...SESSSHhHHhh..",
        "..SSSSSSHHHhhh..",
        "...SSZSSShHhhh..",
    ],
}

# WREN: a cropped cut swept long over one eye, headset cups at the ears.
HEADS["crop"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..OHSSSHHHHhhO..",
        "..OSSESSSSHhhO..",
        "...SSESSSSEhs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....OOOOOOOo....",
        "...HHHHHHHHhh...",
        "..OHHHHHHHHhhO..",
        "..OHHHHHHHHhhO..",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHSSHHOOhh...",
        "...SESSSHOOs....",
        "..SSSSSSSSs.....",
        "...SSSSSSs......",
    ],
}

# Reporter: a fedora with a press card tucked in the band.
HEADS["fedora"] = {
    "down": [
        "................",
        ".....CCcCCc.....",
        "....CCCCCCcc....",
        "....AAAAAWaa....",
        "..DDDDDDDDDDdd..",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCcCCc.....",
        "....CCCCCCcc....",
        "....AAAAAAaa....",
        "..DDDDDDDDDDdd..",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "......CCcCCc....",
        ".....CCCCCCc....",
        ".....AAAAWWa....",
        ".DDDDDDDDDDDdd..",
        "...SESSSHHHh....",
        "..SSSSSSSHh.....",
        "...SSSSSSs......",
    ],
}

# Gentleman: a domed bowler, short grey sides, a big moustache (M).
HEADS["bowler"] = {
    "down": [
        "................",
        "......CCCc......",
        ".....CJCCCc.....",
        ".....CCCCCc.....",
        "...DDDDDDDDdd...",
        "...HSESSSSESh...",
        "...SSESSSSESs...",
        "....SMMMMMMs....",
    ],
    "up": [
        "................",
        "......CCCc......",
        ".....CJCCCc.....",
        ".....CCCCCc.....",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".......CCCc.....",
        "......CJCCCc....",
        "......CCCCCc....",
        "...DDDDDDDDDdd..",
        "...SESSSSHHh....",
        "..SSSSSSSHh.....",
        "..MMMSSSSs......",
    ],
}

# Arranger: hair scraped up into a high ponytail that swings behind.
HEADS["ponytail"] = {
    "down": [
        "...........HH...",
        ".....HHHHHhHh...",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHSSSSHHhh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHAHHHh....",
        "...HHHHHhHHhh...",
        "...HHHHHhHHhh...",
        "...HHHHHhhHhh...",
        "...SHHHhHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHhAHh..",
        "....HHHHHHHHHhh.",
        "...HHHHHHHHhhhh.",
        "...HSSSHHHHh.hh.",
        "...SESSSHHHh..h.",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# Orchardist: a knit beanie with a ribbed turn-up and a pompom.
HEADS["beanie"] = {
    "down": [
        "......AAa.......",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "......AAa.......",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        ".......AAa......",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...SESSSHHHh....",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# Nursery keeper (her): a straw sun bonnet with a deep brim and a ribbon.
HEADS["bonnet"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "..DDAAAAAAAadd..",
        "..DHSSSSSSSShd..",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "..DDAAAAAAAadd..",
        "..DHHHHHHHHhhd..",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "......CCCCCc....",
        ".....CCCCCCcc...",
        "..DDDAAAAAAaa...",
        "...DSSSSHHHHh...",
        "...SESSSHHHh....",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# Nursery keeper (him): neat white side parting, a walrus moustache.
HEADS["parted"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHhHh....",
        "...HHHHHHhHhh...",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SMMMMMMs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...SSSSSHHHhh...",
        "...SESSSSHHh....",
        "..SSSSSSSHh.....",
        "..MMMSSSSs......",
    ],
}


# =============================================================================
# The cast
# =============================================================================
C4: dict = {}

C4["flora_vance"] = dict(
    head="bouffant", body="gown",
    pal={"H": "#504068", "h": "#281830", "T": "#d02848", "t": "#901830", "B": "#d02848", "b": "#901830", "F": "k", "f": "k",
         "A": "#f86078", "a": "#d02848", "W": "white", "w": "r1", "Q": "g2", "q": "f2", "Y": "y1", "Z": "#d02848"},
    acc=[
        # glossy waves falling past the shoulders (behind the arms)
        {"down": [(["HH", "Hh", ".h"], 1, 7), (["hh", "hh", "h."], 13, 7)],
         "left": [(["HHh", "Hhh", ".hh"], 10, 7)], "z": "back", "line": True},
        {"up": [(["HHhHHh", ".HhHh."], 5, 8)], "z": "front", "line": True, "sides": "ESW"},
        # white fur stole draped over the shoulders and upper arms
        {"down": [(["WWWWWWWWww", "W........w"], 3, 9)], "up": [(["WWWWWWWWww", "W........w"], 3, 9)],
         "left": [(["WWWWw", "..Ww."], 5, 9)], "z": "front", "line": False},
        # gold belt
        {"down": [(["YYYYYY"], 5, 11)], "left": [(["YYYY"], 5, 11)], "z": "mid", "line": False},
        # the rose pinned above her ear, with a leaf
        {"down": [(["Aa", "aa"], 2, 2)], "up": [(["Aa", "aa"], 12, 2)], "left": [(["Aa", "aa"], 11, 2)],
         "z": "front", "line": True},
        {"down": [(["Q"], 4, 3)], "up": [(["q"], 11, 3)], "left": [(["Q"], 10, 3)], "z": "front", "line": False},
    ],
    held={
        "down": (["Aa", ".Q", ".q", ".q"], "R", 0, -3, "front"),
        "left": (["aA", "Q.", "q."], "L", -1, -2, "front"),
        "up": (["Aa", "Q.", "q."], "L", -1, -2, "back"),
    },
)

C4["wren"] = dict(
    head="crop", body="casual",
    pal={"H": "u3", "h": "k", "A": "q1", "O": "r3", "o": "k", "T": "#408878", "t": "#285850",
         "B": "#303848", "b": "#202030", "F": "k", "f": "k", "V": "y1", "v": "y2", "Q": "q0", "P": "r2", "p": "r3",
         "G": "#303848", "g": "#202030"},
    acc=[
        # teal streak in the long side of the fringe
        {"down": [(["A", "A"], 9, 3)], "up": [(["A"], 9, 3)], "left": [(["AA"], 4, 3)],
         "z": "head", "line": False},
        # headset mic boom
        {"down": [(["O", ".O"], 2, 6)], "left": [(["OOO"], 6, 7)], "z": "head", "line": False},
        # teal lanyard + badge
        {"down": [(["V....v", ".V..v.", "..VQ.."], 5, 9)], "left": [(["V", "Q"], 6, 10)],
         "z": "mid", "line": False},
        # turned-up collar
        {"down": [(["T", "T"], 4, 8), (["t", "t"], 11, 8)], "left": [(["Tt"], 8, 8)], "z": "head",
         "line": True, "sides": "NEW"},
    ],
    held={
        "down": (["PPp", "QQp", "ppp"], "R", -1, -1, "front"),
        "left": (["pPP", "pQQ"], "L", -2, -1, "front"),
        "up": (["PPp", "ppp"], "L", -1, -1, "back"),
    },
)

C4["nursery_keeper"] = dict(
    head="parted", body="casual",
    pal={"H": "white", "h": "r1", "M": "r1", "T": "d1", "t": "d2", "B": "o3", "b": "o3",
         "A": "g2", "a": "f2", "F": "o3", "f": "o3", "G": "o3", "g": "o3",
         "P": "b1", "p": "b2", "V": "g1", "v": "g2"},
    acc=[
        {"down": [(["A....a", "AAAAaa", "AAAAaa"], 5, 9)], "up": [(["A....a"], 5, 9)],
         "left": [(["AA", "Aa", "Aa"], 4, 10)], "z": "mid", "line": False},
    ],
    held={
        "down": (["VvV", "PPp", ".p."], "R", -1, -2, "front"),
        "left": (["VvV", "PPp", ".p."], "L", -2, -2, "front"),
    },
)

C4["nursery_keeper_b"] = dict(
    head="bonnet", body="dress",
    pal={"C": "y0", "c": "s2", "D": "s1", "d": "s2", "A": "n1", "a": "n2", "H": "r1", "h": "r2",
         "T": "x0", "t": "x1", "B": "x0", "b": "x1", "G": "sk0", "g": "sk1", "F": "o3", "f": "o3",
         "Q": "g2", "q": "f2", "O": "o1", "o": "o2", "Y": "y1", "N": "n1", "W": "white"},
    acc=[
        {"down": [(["Q....q", "QQQQqq", "QQQQqq", ".QQQq."], 5, 9)],
         "left": [(["QQ", "Qq", "Qq"], 4, 10)], "z": "mid", "line": False},
    ],
    held={
        "down": (["WYN", "OOo", "ooo"], "R", -1, -1, "front"),
        "left": (["NYW", "OOo", "ooo"], "L", -2, -1, "front"),
        "up": (["NYW", "OOo"], "L", -1, -1, "back"),
    },
)

C4["researcher"] = dict(
    head="short", body="coat",
    pal={"S": "sk2", "s": "sk3", "L": "sk2", "R": "sk2", "H": "#382828", "h": "k",
         "T": "q0", "t": "q1", "B": "r3", "b": "r3", "G": "r3", "g": "r3", "F": "k", "f": "k",
         "O": "r3", "o": "k", "V": "o1", "v": "o2", "W": "white", "A": "y1"},
    acc=[
        # headphones resting round the neck
        {"down": [(["O......o", ".OO..oo."], 4, 8)], "left": [(["Oo"], 8, 8)], "z": "head", "line": False},
        # ID badge
        {"down": [(["A"], 6, 11)], "z": "mid", "line": False},
        {"down": [(["K"], 8, 12)], "z": "mid", "line": False},
    ],
    held={
        "down": (["VWW", "VWW", "Vvv"], "R", -1, -2, "front"),
        "left": (["WWV", "WWV"], "L", -2, -2, "front"),
        "up": (["vvv", "vvv"], "L", -1, -1, "back"),
    },
)

C4["orchardist"] = dict(
    head="beanie", body="casual",
    pal={"C": "m1", "c": "m2", "D": "m2", "d": "m3", "A": "m0", "a": "m1", "H": "d2", "h": "d3",
         "T": "b1", "t": "b2", "B": "u1", "b": "u2", "G": "u1", "g": "u2", "F": "o3", "f": "o3",
         "O": "o1", "o": "o2", "P": "b1", "p": "b2", "Q": "g1", "Y": "y1"},
    acc=[
        # dungaree bib + straps
        {"down": [(["B....b", "BBBBbb"], 5, 9)], "up": [(["B....b", ".BBbb."], 5, 9)],
         "left": [(["BBb"], 5, 10)], "z": "mid", "line": False},
        # flannel check
        {"down": [(["t", ".", "t"], 3, 9)], "z": "mid", "line": False},
    ],
    held={
        "down": (["PQp", "OoOo", "oOo."], "R", -2, -1, "front"),
        "left": (["pQP.", "oOoO", ".oOo"], "L", -3, -1, "front"),
        "up": (["pPp", "oOo"], "L", -1, 0, "back"),
    },
)

C4["arranger"] = dict(
    head="ponytail", body="dress",
    pal={"H": "#a04830", "h": "#682818", "A": "y1", "T": "x0", "t": "x1", "B": "x1", "b": "x2",
         "G": "sk0", "g": "sk1", "F": "k", "f": "k", "Q": "g2", "q": "f2",
         "N": "n1", "n": "n2", "Y": "y0", "O": "r1", "o": "r2"},
    acc=[
        {"down": [(["A"], 10, 1)], "z": "head", "line": False},
        {"down": [(["Q....q", "QQQQqq", "QQQQqq", ".QQQq."], 5, 9)],
         "left": [(["QQ", "Qq", "Qq"], 4, 10)], "z": "mid", "line": False},
        # snips in the apron pocket
        {"down": [(["O", "o"], 6, 11)], "z": "mid", "line": False},
    ],
    held={
        "down": (["Nn", "YN", ".Q", ".q"], "R", -1, -3, "front"),
        "left": (["nN", "NY", "Q.", "q."], "L", -1, -3, "front"),
    },
)

C4["reporter"] = dict(
    head="fedora", body="coat",
    pal={"C": "o2", "c": "o3", "A": "o3", "a": "k", "D": "o2", "d": "o3", "W": "white",
         "H": "d2", "h": "d3", "T": "y2", "t": "#906810", "B": "o3", "b": "o3",
         "G": "r3", "g": "r3", "F": "k", "f": "k", "O": "r3", "o": "k", "M": "b1"},
    acc=[
        # trench belt + lapels
        {"down": [(["tttttt"], 5, 11), (["T..T"], 6, 9)], "left": [(["tttt"], 5, 11)],
         "z": "mid", "line": False},
    ],
    held={
        "down": (["M", "O", "o"], "R", 0, -3, "front"),
        "left": (["M", "O", "o"], "L", -1, -3, "front"),
        "up": (["O", "o"], "L", 0, -1, "back"),
    },
)

C4["gentleman"] = dict(
    head="bowler", body="coat",
    pal={"C": "#383838", "c": "k", "J": "#787878", "D": "#383838", "d": "k", "H": "r1", "h": "r2", "M": "r1",
         "T": "#286848", "t": "#184030", "B": "r3", "b": "r3", "G": "r3", "g": "r3",
         "F": "k", "f": "k", "W": "white", "A": "y1", "N": "b1", "n": "b2", "Q": "g2", "q": "f2"},
    acc=[
        # white shirt front, gold watch chain
        {"down": [(["WW", "WW"], 7, 9)], "z": "mid", "line": False},
        {"down": [(["A.A", ".A."], 5, 11)], "z": "mid", "line": False},
    ],
    held={
        "down": (["NnN", "nNn", ".Q.", ".q."], "R", -1, -3, "front"),
        "left": (["NnN", "nNn", ".Q.", ".q."], "L", -2, -3, "front"),
        "up": (["NnN", "nNn"], "L", -1, -2, "back"),
    },
)


# =============================================================================
# rose_gate: the Conservatory 3 maze gate (environment style, no black outline)
# =============================================================================
# Colours come from agent 5's Chapter 4 ramps (tools/art/env4/kit.py), so the
# gate matches the rose_trellis walls exactly: the same leaf clumps and
# roses on top, the same white lattice face, posts lit left / shaded right.
TRELLIS_FALLBACK = {"G1": "#98d060", "G2": "#58a040", "L2": "#307040", "L3": "#183828",
                    "T0": "#f8f8f8", "R1": "#b8b8b0", "R2": "#888890",
                    "RO0": "#f8b8c0", "RO1": "#e85070", "RO2": "#a82048"}


def trellis_hex() -> dict:
    try:
        sys.path.insert(0, str(common.ART_TOOLS / "env4"))
        import kit  # tools/art/env4/kit.py
        return {k: kit.HEX[k] for k in TRELLIS_FALLBACK}
    except Exception:  # env4 missing: keep the published values
        return dict(TRELLIS_FALLBACK)


# Drawn 4px above its tile like every NPC, so the rose arch rises over the
# trellis line; two lattice leaves meet at a brass latch in the middle.
GATE = [
    "____,g:__,ga____",
    "__:gRrg:gg:gr:__",
    "_:gg:rRgg:gRrg:_",
    ":gRrg::g:gg::ggg",
    "ggrR:g:::g:g:Rr:",
    "#t:g::::::::g:t#",
    "#tWx.xWxx.xW.,t#",
    "#t.W.W.Wx.W.W.t#",
    "#tx.W.xWWx.W.xt#",
    "#t.W.W.Wx.W.W.t#",
    "#tWx.xWyy.xW.xt#",
    "#t.W.W.Wx.W.W.t#",
    "#tx.W.xWWx.W.xt#",
    "#t.W.W.Wx.W.W.t#",
    "#tWWWWWWxWWWWWt#",
    "::::::::::::::::",
]


def rose_gate() -> Image.Image:
    hx = trellis_hex()
    key = {".": hx["L3"], ":": hx["L2"], "g": hx["G2"], ",": hx["G1"], "R": hx["RO1"], "r": hx["RO2"],
           "a": hx["RO0"], "W": hx["T0"], "x": hx["R1"], "#": hx["T0"], "t": hx["R2"], "y": "#f8d050"}
    im = gbc.img_from_rows(GATE, {"_": None, **{k: gbc.hexc(v) for k, v in key.items()}})
    return ch.static_sheet([[im] * 3] * 4)


OBJECTS4 = {"rose_gate": rose_gate}


# =============================================================================
# Build
# =============================================================================
def sheets() -> dict[str, Image.Image]:
    out = {k: ch.sheet(v) for k, v in C4.items()}
    out.update({k: fn() for k, fn in OBJECTS4.items()})
    return out


def review(out: dict, name="characters_ch4"):
    ch.review(out, name=name, cols=5)


def build(write=True):
    out = sheets()
    if write:
        for k, im in out.items():
            common.write_character(k, im, "chars.py")
    review(out)
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
