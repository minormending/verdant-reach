"""16px Chapter 6 walk sheets, built with cast5's layered character kit.

Each costume shares its ramps and identifying prop with its battle portrait.
Right-facing frames are mirrored and re-lit by characters.sheet. The boulder
is one static frame repeated in every cell, never a walking character.
"""
from __future__ import annotations

import common6 as common
import characters as ch
from characters import DEFAULT_PAL, Frame, HEADS

NAVY, NAVY_S = "#303868", "#1c2048"
SAND, SAND_S = "#d0b888", "#988060"
HAIR, HAIR_S = "#503828", "#302020"

# Broad captain's brim, brass band, curls showing at both temples.
HEADS["sea_cap"] = {
    "down": ["................", ".....CCCCCc.....", "....CCAACCcc....", ".DDDDDDDDDDDDdd.",
             "...HSSSSSSSSh...", "...HSESSSSESh...", "...SSESSSSESs...", "....SSSSSSSs...."],
    "up": ["................", ".....CCCCCc.....", "....CCCCCccc....", ".DDDDDDDDDDDDdd.",
           "...HHhHHhHHhh...", "...HhHHhHHhhh...", "...SHHhHHHHhs...", "....SSSSSSss...."],
    "left": ["................", "......CCCCCc....", ".....CCAACCcc...", "DDDDDDDDDDDDDdd.",
             "...SSSSSHHhhh...", "...SESSSHhHHh...", "..SSSSSSSHhh....", "...SSSSSSs......"],
}
HEADS["sea_knit"] = {
    "down": ["................", ".....CCCCCc.....", "....CCcCcCcc....", "...CCCCCCCCcc...",
             "...DDDDDDDDdd...", "...HSESSSSESh...", "...SSESSSSESs...", "....SSSSSSSs...."],
    "up": ["................", ".....CCCCCc.....", "....CCcCcCcc....", "...CCCCCCCCcc...",
           "...DDDDDDDDdd...", "...HHHHHHHHhh...", "...SHHHHHHHhs...", "....SSSSSSss...."],
    "left": ["................", ".....CCCCCc.....", "....CCcCcCcc....", "...CCCCCCCCcc...",
             "...DDDDDDDDdd...", "...SESSSHHHh....", "..SSSSSSSHhh....", "...SSSSSSs......"],
}


def costume(head, body, top, shade, **pal):
    return dict(head=head, body=body, pal={"T": top, "t": shade, "H": HAIR, "h": HAIR_S,
                "B": "#606878", "b": "#404858", "G": "#606878", "g": "#404858",
                "F": "o3", "f": "o3", **pal}, acc=[])


C6 = {}
C6["reyes"] = costume("sea_cap", "coat", NAVY, NAVY_S,
    C=NAVY, c=NAVY_S, D="#485888", d=NAVY_S, A="#d8b858", a="#a07830",
    S="#d8a078", s="#a87058", L="#d8a078", R="#d8a078", P="#a88050", p="#705030",
    V="#90a8a0", v="#587870", Y="#d8b858")
C6["reyes"]["acc"] = [
    {"down": [(["P....", ".P...", "..P..", "...P."], 5, 9)],
     "up": [(["....P", "...P.", "..P.."], 5, 9)], "left": [(["P", "p", "P"], 8, 9)], "line": False},
    {"down": [(["Y.Y", "...", "Y.Y"], 6, 9)], "left": [(["Y", ".", "Y"], 5, 9)], "line": False},
    {"down": [(["VVVv", "VYVv"], 9, 12)], "up": [(["VVVv", "vvvv"], 4, 12)],
     "left": [(["VVv", "VYv"], 10, 12)], "z": "front"},
]

C6["brother_saguaro"] = costume("brim", "dress", SAND, SAND_S,
    C="#d8c088", c="#a08850", D="#e0c890", d="#a08850", A="#907040", a="#705028",
    H="white", h="#b0b0b8", W="white", w="#b0b0b8", O="#c8a878", o="#886840")
C6["brother_saguaro"]["acc"] = [
    {"down": [(["WWWWWWww", ".WWWWWw.", "..WWWw..", "...Ww..."], 4, 7)],
     "left": [(["WWWw", ".WWw", "..Ww"], 3, 7)], "z": "head", "sides": "ESW"},
    {"down": [(["t", "t", "t"], 8, 11)], "up": [(["t", "t", "t"], 8, 11)], "line": False},
]
C6["brother_saguaro"]["held"] = {
    "down": (["O", "O", "o", "O", "O", "o", "O"], "R", 1, -4, "front"),
    "up": (["O", "O", "o", "O", "O", "o", "O"], "L", -1, -4, "front"),
    "left": (["O", "o", "O", "O", "o", "O"], "L", -1, -3, "front"),
}

C6["calloway"] = costume("bun", "coat", "#f0f0e8", "#b0b8c0",
    H="#303038", h="#181820", A="#585860", a="#383840", B="#888890", b="#585860",
    G="#888890", g="#585860", V="#c8a070", v="#886840", W="white", Q="#a0b0b8")
C6["calloway"]["acc"] = [
    {"down": [(["KQKKQK", ".K..K."], 5, 5)], "left": [(["KQK"], 3, 5)], "z": "head", "line": False},
    {"down": [(["B", "B", "K"], 8, 9)], "left": [(["B", "K"], 5, 9)], "line": False},
]
C6["calloway"]["held"] = {
    "down": (["VVV", "VWv", "VWv", "VVv"], "R", -2, -1, "front"),
    "up": (["VVv", "VVv", "VVv"], "L", -1, 0, "front"),
    "left": (["VVv", "VWv", "VWv", "VVv"], "L", -2, -1, "front"),
}

C6["sailor"] = costume("sea_knit", "casual", "#e0e8e8", "#a0b0c0",
    C=NAVY, c=NAVY_S, D="#485888", d=NAVY, A="#485888", X=NAVY,
    B=NAVY, b=NAVY_S, G="#d8a078", g="#a87058", F="#806040", f="#503828")
C6["sailor"]["acc"] = [
    {"down": [(["XXXXXX", "......", "XXXXXX"], 5, 9)],
     "up": [(["XXXXXXXX", "........", "XXXXXXXX"], 4, 9)],
     "left": [(["XXXX", "....", "XXXX"], 5, 9)], "line": False},
]

C6["diver"] = costume("short", "casual", "#384850", "#202830",
    B="#384850", b="#202830", G="#384850", g="#202830", F="#202830", f="#202830",
    A="#50a8a0", a="#286870", Q="#b8e0e8", q="#5898b0", V="#50a8a0", v="#286870")
C6["diver"]["acc"] = [
    {"down": [(["KQQKqqK"], 4, 3)], "left": [(["KQQqK"], 4, 3)],
     "up": [(["aaaaaaa"], 4, 4)], "z": "head", "line": False},
    {"down": [(["A....a", "AAAAaa"], 5, 9)], "up": [(["A....a", ".AAaa."], 5, 9)],
     "left": [(["A", "A"], 5, 9)], "line": False},
]
C6["diver"]["held"] = {
    "down": (["V.V", "V.v", "Vvv", "vvv"], "R", -1, -1, "front"),
    "up": (["V.V", "V.v", "Vvv", "vvv"], "L", -1, -1, "front"),
    "left": (["V.V", "V.v", "Vvv", "vvv"], "L", -1, -1, "front"),
}

C6["angler"] = costume("brim", "casual", "#a09868", "#706840",
    C="#a09868", c="#706840", D="#b8b080", d="#706840", A="#506050", a="#303830",
    B="#506858", b="#304840", G="#506858", g="#304840", F="#303830", f="#202820",
    V="#506858", v="#304840", P="#c8b078", p="#887048", O="#b09060", o="#705030")
C6["angler"]["acc"] = [
    {"down": [(["V....v", "VV..vv", "VV..vv"], 5, 9)],
     "up": [(["V....v", ".VVvv.", "VVVVvv"], 5, 9)], "left": [(["VVv", "VPv", "VVv"], 5, 9)], "line": False},
    {"down": [(["PP..pp"], 5, 11)], "line": False},
    {"down": [(["O", "O", "O", "O", "O", "O", "O", "o"], 13, 3)],
     "up": [(["O", "O", "O", "O", "O", "O", "O", "o"], 2, 3)],
     "left": [(["OO...", "..O..", "...O.", "...O.", "....O", "....O", "....o"], 9, 3)], "z": "back"},
]

C6["island_elder"] = costume("bald", "stooped", "#888068", "#585048",
    H="white", h="#b0b0b8", A="#c89860", a="#885830", Q="#e0c090", q="#a07850",
    O="#b89878", o="#786050", D="#d0b898", W="#e0c090", w="#a07850")
C6["island_elder"]["acc"] = [
    {"down": [(["WWWWWWww", "aWaWaWaw", ".AAAAaa.", "...Aa..."], 4, 9)],
     "up": [(["WWWWWWww", "aWaWaWaw", "AAAAAAaa", ".AAAAaa.", "...Aa..."], 4, 9)],
     "left": [(["WWWWww", "aWaWaw", ".AAAa.", "..Aa.."], 5, 9)], "z": "front", "sides": "ESW"},
]
C6["island_elder"]["held"] = {
    "down": (["DO", "O.", "o.", "O.", "O."], "R", 0, -2, "front"),
    "up": (["OD", ".O", ".o", ".O", ".O"], "L", -1, -2, "front"),
    "left": (["DO", "O.", "o.", "O.", "O."], "L", -1, -2, "front"),
}


def boulder():
    f = Frame()
    f.layer(["....GGg....", "..GGGRRrr..", ".GGRRRRRrr.", "RRHHRRRRrrr", "RHHHRRRRrrr",
             "RRRRRrRRrrr", "RRRRrrRRrrr", "RRRRrRRRrrr", "RRRrRRRrrrr", ".rrrrrrrrr.", "..rrrrrrr.."], 2, 3)
    f.paint([(7, 6), (8, 7), (8, 8), (7, 9), (7, 10)], "C")
    im = ch.render(f, {**DEFAULT_PAL, "R": "#a8a8a0", "r": "#686878", "H": "#e0e0c8",
                       "C": "#484850", "G": "#789058", "g": "#485838"})
    return ch.static_sheet([[im] * 3] * 4)


def images():
    return {**{key: ch.sheet(spec) for key, spec in C6.items()}, "boulder": boulder()}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
