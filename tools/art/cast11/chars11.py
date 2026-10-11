"""16px Chapter 11 walk sheets for the four Council seats, on the Round-3 kit.

  belladonna  BELLADONNA, the Apothecary: an elegant older woman. Near-black
              hair drawn up into a high bun that rises a pixel above the
              usual crown, pinned with a sprig of nightshade (a green leaf
              and a black berry with a violet bloom); a deep plum gown to
              the floor that flares at the hem, black lace gloves, and a dark
              belt of tiny stoppered glass vials (aqua, amber, rose) at the
              waist. She glides: the hem sways, no feet show.
  mimi_osa    MIMI OSA, the Sleeper: a drowsy young woman in a soft lilac
              dressing robe to the ankles, tied with a pale sash, and pink
              slippers. A long floppy nightcap in a deeper lavender with a
              cream cuff, its tip drooping to one side and ending in a cream
              pom-pom; a pink puff of mimosa flower pinned at her ear; soft
              brown hair; eyes always half closed (one row, not two). She
              carries a small round paper lantern low at her side.
  titus_arum  TITUS ARUM, the Rotter: a big, jovial gardener, a pixel wider
              each side than anyone else. Wild dark hair and a huge dark
              beard spilling over his chest, a moss-olive shirt with the
              sleeves rolled to bare forearms, a maroon leather apron from
              the chest to the knee, tall brown boots caked with compost,
              and a huge spade on his shoulder, its steel blade standing up
              beside his head.
  pyra        PYRA, the Kindler: an energetic young woman with a big mop of
              flame-red curls, a pair of amber-lensed goggles pushed up on a
              dark strap across them; a safety-orange field jacket with a
              silver reflective stripe round the chest and both sleeves, dark
              trousers and black boots, and an iron-caged lantern of glowing
              embers in her hand.

Silhouette checks: belladonna's high bun with its sprig sits above a
floor-length flared gown (flora_vance has long loose hair and a short red
dress; the elder's bun is grey and low, over a purple cardigan). Mimi's
drooping nightcap with its pom-pom is the only floppy hat in the cast, and
her lantern is pale and round. Titus is the widest figure in the cast and
the only one with a blade above the shoulder (the lumberjack wears a beanie
and red plaid). Pyra's goggles sit on top of her curls like two bumps (vale
has red hair too, but glasses on her face and a white lab coat); her lantern
is a dark iron cage with an orange core. Right rows are mirrored and re-lit
by characters.sheet.
"""
from __future__ import annotations

import common11 as common
import characters as ch
from characters import BODIES, HEADS

# --- ramps shared with portraits11 and stills11 ------------------------------
# Belladonna
PLUM, PLUM_S, PLUM_H = "#6c3068", "#45204a", "#9c5090"
NIGHT_HAIR, NIGHT_HAIR_S, NIGHT_HAIR_H = "#3c3448", "#201c2c", "#5c5470"
GLOVE, GLOVE_S = "#3a3040", "#241c2a"
BELT = "#2c2228"
VIAL_AQUA, VIAL_AMBER, VIAL_ROSE = "#98e0d0", "#f0b850", "#e880a0"
BERRY, BERRY_H = "#2a1c34", "#8c60b8"
LEAF, LEAF_S = "#58a040", "#286828"
FAIR, FAIR_S = "#f4d8c4", "#c8a090"

# Mimi Osa
LILAC, LILAC_S, LILAC_H = "#c0a8e0", "#8c74b4", "#e0d4f4"
CAP, CAP_S = "#9078c0", "#5c4c8c"
CREAM, CREAM_S = "#f8f0d8", "#d0c4a8"
MIMOSA, MIMOSA_S, MIMOSA_H = "#f080b0", "#c04880", "#f8c8e0"
SOFT_HAIR, SOFT_HAIR_S = "#a87454", "#74503c"
PAPER, PAPER_S, PAPER_H = "#f8e098", "#e0a850", "#f8f8d0"
SLIPPER, SLIPPER_S = "#e890b0", "#b06080"

# Titus Arum
APRON, APRON_S, APRON_H = "#7c2c3c", "#521c28", "#a04858"
SHIRT, SHIRT_S = "#8c9454", "#5c6438"
BEARD, BEARD_S, BEARD_H = "#4a3428", "#2e2018", "#6c5040"
BOOTS, BOOTS_S = "#6c4828", "#44301c"
COMPOST = "#2e2414"
STEEL, STEEL_S, STEEL_H = "#c0c4c8", "#787c88", "#f0f0f0"
HAFT, HAFT_S = "#c89858", "#8a6038"
TAN, TAN_S = "#e0a878", "#b07850"

# Pyra
FLAME, FLAME_S, FLAME_H = "#d83820", "#901c18", "#f88838"
SAFETY, SAFETY_S, SAFETY_H = "#f08028", "#b84c18", "#f8b060"
STRIPE, STRIPE_S = "#e8f0f0", "#a8b8c0"
TROUSER, TROUSER_S = "#3c4458", "#262c3c"
GOGGLE, GOGGLE_S = "#f8c048", "#c07818"            # amber lenses
STRAP = "#3a3034"
IRON, IRON_S = "#585060", "#34303c"
EMBER, EMBER_S, EMBER_H = "#f8a030", "#d04818", "#f8e870"


def up_from_down(body, swap):
    """Back rows: the down body with front-only details painted over."""
    table = str.maketrans(swap)
    return {pose: [(k, [r.translate(table) for r in rows], x, y, *o) for k, rows, x, y, *o in layers]
            for pose, layers in body["down"].items()}


# =============================================================================
# Belladonna: the floor-length gown and the high bun
# =============================================================================
# The gown: a fitted plum bodice, the vial belt at the waist (N belt, V/Q/U
# glass), then a skirt that widens to the floor. Long sleeves, black gloves.
BODIES["gown"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....NVNQNUnn....",
                "....TTTTTTtt....",
                "...TTTTTTTTtt...",
                "...TTTTTTTTtt...",
                "..TTTTTTTTTTtt..",
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
                "....NVNQNUnn....",
                "...TTTTTTTTtt...",
                "...TTTTTTTTtt...",
                "..TTTTTTTTTTt...",
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
                ".....VNQNnn.....",
                ".....TTTTtt.....",
                "....TTTTTttt....",
                "....TTTTTTtt....",
                "...TTTTTTTttt...",
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
                ".....VNQNnn.....",
                "....TTTTTttt....",
                "...TTTTTTTtt....",
                "..TTTTTTTTttt...",
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
                ".....VNQNnn.....",
                "....TTTTTttt....",
                "....TTTTTTttt...",
                "...TTTTTTTtttt..",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........t......",
                ".........r......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["gown"]["up"] = up_from_down(BODIES["gown"], {"V": "N", "Q": "N", "U": "N"})

# Near-black hair swept up from the face into a high bun (rising a pixel above
# the usual crown); the nightshade sprig (Y leaf, X berry, J its bloom) is
# pinned on her left side of the bun.
HEADS["highbun"] = {
    "down": ["......HHhh......", "......HHhhYX....", "....HHHHHHhhJ...", "...HHHHHHHHhh...",
             "...HSSSSSSSSh...", "...HSESSSSESh...", "...SSESSSSESs...", "....SSSSSSSs...."],
    "up": ["......HHhh......", "....XYHHhh......", "...JHHHHHHhh....", "...HHHHHHHHhh...",
           "...HHHHHHHHhh...", "...HHHHHHHHhh...", "...HHHHHHHHhh...", "....hHSSShh....."],
    "left": ["........HHh.....", "........HHhY....", ".....HHHHHHhX...", "....HHHHHHHhh...",
             "...HSSSSHHHhh...", "...SESSSHHhh....", "..SSSSSSSHh.....", "...SSSSSSs......"],
}

BELLADONNA = dict(head="highbun", body="gown", pal={
    "H": NIGHT_HAIR, "h": NIGHT_HAIR_S, "S": FAIR, "s": FAIR_S,
    "T": PLUM, "t": PLUM_S, "N": BELT, "n": BELT,
    "V": VIAL_AQUA, "Q": VIAL_AMBER, "U": VIAL_ROSE,
    "L": GLOVE, "R": GLOVE, "r": GLOVE_S,
    "Y": LEAF, "y": LEAF_S, "X": BERRY, "J": BERRY_H,
    "F": GLOVE, "f": GLOVE_S,
})


# =============================================================================
# Mimi Osa: the dressing robe and the nightcap
# =============================================================================
# The robe: crossed over at the throat (a V of the paler gown, D), tied at
# the waist with a sash (A), soft to the ankles over pink slippers; the
# sleeves are wide and loose.
BODIES["nightrobe"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTDDTttt....",
                "....TTTDTttt....",
                "....AAAAAAaa....",
                "....TTTTTTtt....",
                "....TTTTTttt....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "..TT........tt..",
                "...L........R...",
            ], 0, 9, "NEW"),
        ],
        "a": [
            ("body", [
                "....TTDDTttt....",
                "....AAAAAAaa....",
                "....TTTTTTtt....",
                "....TTTTTttt....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "..TL........tt..",
                "............R...",
            ], 0, 10, "NEW"),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....DTTTtt.....",
                ".....TTTTtt.....",
                ".....AAAAaa.....",
                ".....TTTTtt.....",
                ".....TTTTTtt....",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                ".......TTt......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....DTTTtt.....",
                ".....AAAAaa.....",
                "....TTTTTTtt....",
                "....TTTTTTttt...",
                "...FFF.....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                "........TTt.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....DTTTtt.....",
                ".....AAAAaa.....",
                "....TTTTTTtt....",
                "....TTTTTTttt...",
                "....fff..FF.....",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........t......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......TTt.......",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["nightrobe"]["up"] = up_from_down(BODIES["nightrobe"], {"D": "T"})

# The nightcap (C) with a cream cuff (D), its long tip flopping over to her
# left and hanging past the ear to a cream pom-pom (P); soft brown hair (H)
# under the cuff; the mimosa puff (M) at her right ear; sleepy eyes: a
# short closed line, not the usual tall eye.
HEADS["nightcap"] = {
    "down": ["................", ".....CCCCc......", "....CCCCCCcc....", "...CCCCCCCCccc..",
             "...DDDDDDDDddcc.", "..MHHSSSSSHHhcP.", "..mHSEESSEESh.Pp", "....SSSSSSSs...."],
    "up": ["................", "......CCCCc.....", "....CCCCCCcc....", "..cCCCCCCCCcc...",
           ".cCCCCCCCCCcc...", "PcDDDDDDDDDdd...", "PpHHHHHHHHHhM...", "...HHHHHHHHhm..."],
    "left": ["................", ".....CCCCc......", "....CCCCCCcc....", "....CCCCCCCccc..",
             "...DDDDDDDDdcc..", "...SSSSHHHHh.cP.", "..SEESSMHhh...Pp", "...SSSSSShh....."],
}

MIMI = dict(head="nightcap", body="nightrobe", pal={
    "C": CAP, "c": CAP_S, "D": CREAM, "d": CREAM_S, "P": CREAM, "p": CREAM_S,
    "H": SOFT_HAIR, "h": SOFT_HAIR_S, "M": MIMOSA, "m": MIMOSA_S,
    "T": LILAC, "t": LILAC_S, "A": LILAC_H, "a": CREAM_S,
    "F": SLIPPER, "f": SLIPPER_S,
    "Y": PAPER, "y": PAPER_S, "O": HAFT_S,
})
MIMI["held"] = {
    # The round paper lantern, hanging low from the hand on a short bail.
    "down": ([".O.", "YYy", "Yyy"], "R", -1, 1, "front"),
    "up": ([".O.", "YYy", "Yyy"], "L", -1, 1, "back"),
    "left": ([".O.", "YYy", "Yyy"], "L", -1, 1, "front"),
}


# =============================================================================
# Titus Arum: the big gardener in his apron, with the spade
# =============================================================================
# A pixel wider each side: the shirt at the shoulders, the maroon apron bib
# (A) over the chest widening to the knee, tall boots (G) with compost (Q)
# caked round the feet. Rolled sleeves: shirt to the elbow, bare forearms.
BODIES["apron"] = {
    "down": {
        "stand": [
            ("body", [
                "...TTAAAAAAtt...",
                "...TTAAAAAAtt...",
                "...AAAAAAAAaa...",
                "...AAAAAAAAaa...",
                "....GGG..ggg....",
                "....FQF..fQf....",
            ], 0, 9),
            ("arm", [
                "..T..........t..",
                "..S..........s..",
                "..L..........R..",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "...TTAAAAAAtt...",
                "...AAAAAAAAaa...",
                "...AAAAAAAAaa...",
                "....GGG..fQf....",
                "....FQF.........",
            ], 0, 10),
            ("arm", [
                "..T..........t..",
                "..L..........s..",
                ".............R..",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                "....TTTTTtt.....",
                "....ATTTTtt.....",
                "....AAATTtt.....",
                "....AAATTtt.....",
                ".....GGGgg......",
                "....FQFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Ss......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                "....TTTTTtt.....",
                "....AAATTtt.....",
                "....AAAATTtt....",
                "....GGG...gg....",
                "...FQF.....fQ...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Ss.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                "....TTTTTtt.....",
                "....AAATTtt.....",
                "....AAAATTtt....",
                "....gg....GG....",
                "...fQf....FQF...",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........s......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Ss........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
# From behind: the shirt, crossed apron straps (A) and the apron's tie.
BODIES["apron"]["up"] = {
    pose: [(k, [r.replace("TTAAAAAAtt", "TTATTTTAtt") if i == 0 else
                r.replace("TTAAAAAAtt", "TTTAttAttt") if i == 1 else r for i, r in enumerate(rows)], x, y, *o)
           if k == "body" else (k, rows, x, y, *o) for k, rows, x, y, *o in layers]
    for pose, layers in BODIES["apron"]["down"].items()
}

# Wild dark hair and a huge beard (M) that spills down over the chest (an
# accessory below), leaving only the eyes and the nose clear.
HEADS["wildbeard"] = {
    "down": ["................", "....H.HHHH.h....", "...HHHHHHHHhh...", "..HHHHHHHHHHhh..",
             "..HHSSSSSSSShh..", "...SSESSSSESs...", "..MMSSSSSSSSmm..", "..MMMMMMMMMMmm.."],
    "up": ["................", "....H.HHHH.h....", "...HHHHHHHHhh...", "..HHHHHHHHHHhh..",
           "..HHHHHHHHHHhh..", "...HHHHHHHHhh...", "..MHHHHHHHHhmm..", "..MMHHHHHHHhmm.."],
    "left": ["................", ".....H.HHHHh....", "....HHHHHHHHh...", "...HHHHHHHHHhh..",
             "...SSSSSHHHHhh..", "...SESSSSHHHhh..", "..SSSSSSMHHhh...", "..MMMMMMMMhh...."],
}

TITUS = dict(head="wildbeard", body="apron", pal={
    "H": BEARD, "h": BEARD_S, "M": BEARD, "m": BEARD_S, "S": TAN, "s": TAN_S, "L": TAN, "R": TAN,
    "T": SHIRT, "t": SHIRT_S, "A": APRON, "a": APRON_S,
    "G": BOOTS, "g": BOOTS_S, "F": BOOTS, "f": BOOTS_S, "Q": COMPOST, "q": COMPOST,
    "Z": STEEL, "z": STEEL_S, "O": HAFT, "o": HAFT_S,
})
TITUS["acc"] = [
    # The beard spilling over the top of the apron.
    {"down": [(["MMMm"], 6, 8)], "left": [(["MMMm", ".Mm."], 2, 8)], "z": "front"},
    # From the side the spade rides on the far shoulder: the blade stands up
    # behind his head, the haft hidden behind his back.
    {"left": [(["ZZz", "ZZz", "zzz", ".o.", ".O."], 12, 0)], "z": "back"},
]
SPADE_UP = ["Zz", "Zz", "zz", "o.", "O.", "O.", "O.", "o.", "O.", "O."]
TITUS["held"] = {
    # The spade on his shoulder: the steel blade up beside the head, the haft
    # down to the hand at his side.
    "down": (SPADE_UP, "L", -1, -10, "front"),
    "up": (SPADE_UP, "R", 0, -10, "front"),
}


# =============================================================================
# Pyra: the field jacket, the curls and the goggles
# =============================================================================
# The jacket (T) with its reflective stripe (W) round the chest and the
# sleeves at the same height, dark trousers (B) and black boots.
BODIES["fieldjacket"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....WWWWWWww....",
                "....TTTTTTtt....",
                ".....BB..bb.....",
                ".....BB..bb.....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...W........w...",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....WWWWWWww....",
                "....TTTTTTtt....",
                ".....BB..ff.....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........w...",
                "............R...",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....WWWWww.....",
                ".....TTTTtt.....",
                "......BBbb......",
                "......BBbb......",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Ww......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....WWWWww.....",
                ".....TTTTtt.....",
                ".....BB...bb....",
                "....FFF....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Ww.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....WWWWww.....",
                ".....TTTTtt.....",
                ".....bb...BB....",
                "....fff....FF...",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........w......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Ww........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["fieldjacket"]["up"] = BODIES["fieldjacket"]["down"]

# A big mop of curls (H), bumpy along the top, with the goggles pushed up
# onto them: two amber lenses (Q) on a dark strap (D) across the crown.
HEADS["goggles"] = {
    "down": ["....H.HH.H......", "..HHHhHHHhHh....", ".HHQQHHHHQQhh...", ".HDQQDDDDQQdhh..",
             ".HHHSSSSSSHHhh..", "..HSESSSSESShh..", ".HhSESSSSESShhh.", "..hHSSSSSSShh..."],
    "up": ["....H.HH.H......", "..HHHhHHHhHh....", ".HHhHHHhHHHhh...", ".HDDDDDDDDDdhh..",
           ".HHHHhHHHhHHhh..", "..HhHHHHhHHHhh..", ".HHHHhHHHHhHhhh.", "..hHSSSSSSShh..."],
    "left": [".....H.HH.H.....", "...HHHhHHHhHh...", "..QQHHHHhHHHhh..", ".DQQDDDDHHHHhh..",
             "...SSSSHHhHHhh..", "...SESSSHHHHhh..", "..SSSSSSHhHhhh..", "...SSSSSShhh...."],
}

PYRA = dict(head="goggles", body="fieldjacket", pal={
    "H": FLAME, "h": FLAME_S, "Q": GOGGLE, "q": GOGGLE_S, "D": STRAP, "d": STRAP,
    "T": SAFETY, "t": SAFETY_S, "W": STRIPE, "w": STRIPE_S,
    "B": TROUSER, "b": TROUSER_S, "F": "#282028", "f": "#181418",
    "Z": IRON, "z": IRON_S, "Y": EMBER, "y": EMBER_S, "J": EMBER_H,
})
PYRA["held"] = {
    # The ember lantern: an iron cage, a ring on top, the embers glowing.
    "down": ([".Z.", "ZJZ", "ZyZ"], "R", -1, 1, "front"),
    "up": ([".Z.", "ZJZ", "ZyZ"], "L", -1, 1, "back"),
    "left": ([".Z.", "ZJZ", "ZyZ"], "L", -1, 1, "front"),
}


def images():
    return {"belladonna": ch.sheet(BELLADONNA), "mimi_osa": ch.sheet(MIMI), "titus_arum": ch.sheet(TITUS),
            "pyra": ch.sheet(PYRA)}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
