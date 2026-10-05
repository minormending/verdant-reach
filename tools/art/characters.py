"""Parametric overworld characters -> public/assets/characters/<key>.png (48x64).

Sheet: 4 rows (down, up, left, right) x 3 columns (stand, step A, step B),
16x16 frames, transparent background.

A character = head style + body style + colours + accessories. Heads and
bodies are hand-authored ASCII per facing (down / up / left) and pose
(stand / step); right is the mirrored left, step B of down/up is the
mirrored step A (as in Crystal). Accessories are small per-facing patches.

Region codes in the templates:
  K outline   S skin   E eye (drawn K)   H hair  h hair shade
  C hat/cap   c hat shade   T top   t top shade   B bottoms   F shoes
  A accent (armband, flower, tie)  P pack/bag   W white   M mesh (veil)
"""

from __future__ import annotations

from PIL import Image, ImageOps

import gbc
from gbc import C

DIRS = ("down", "up", "left")

# --------------------------------------------------------------- heads ------
# 9 rows (0..8). Row 8 is the chin.
HEADS = {
    "short": {
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHhHHHHHhK...",
            "...KHSSSSSShK...",
            "...KSSSSSSSSK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHHHHHHHhK...",
            "...KHhHHHHhhK...",
            "...KHHhHHhHhK...",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHHHHHHHhK...",
            "...KSSSHHHHhK...",
            "..KSSSSSHHhK....",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "spiky": {
        "down": [
            "...K..K..K..K...",
            "...KHKHKKHKHK...",
            "..KHHHHHHHHHHK..",
            "...KHHHHHHHhK...",
            "..KHHhHHHHHhhK..",
            "...KHSSHHSShK...",
            "...KSSSSSSSSK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "...K..K..K..K...",
            "...KHKHKKHKHK...",
            "..KHHHHHHHHHHK..",
            "...KHHHHHHHhK...",
            "..KHHhHHHHHhhK..",
            "...KHHhHHhHhK...",
            "..KHHHHHHHHhhK..",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "....K..K..K.....",
            "....KHKHKKHK.K..",
            "...KHHHHHHHHKHK.",
            "...KHHHHHHHHhhK.",
            "..KHHHHHHHHHhK..",
            "...KSSSHHHHhhK..",
            "..KSSSSSHHhK....",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "long": {
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "..KHHhHHHHHhhK..",
            "..KHHSSSSSShhK..",
            "..KHSSSSSSSShK..",
            "..KHSESSSSEShK..",
            "..KhKSSSSSSKhK..",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "..KHHHHHHHHhhK..",
            "..KHHhHHHHhHhK..",
            "..KHHHhHHhHHhK..",
            "..KHHHHHHHHHhK..",
            "..KhHHHHHHHHhK..",
        ],
        "left": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHHHHHHHHhK..",
            "...KSSSHHHHHhK..",
            "..KSSSSSHHHHhK..",
            "..KSESSSSHHhhK..",
            "...KKSSSSKhhK...",
        ],
    },
    "bun": {
        "down": [
            "......KKKK......",
            ".....KHHHhK.....",
            "....KKHHHHKK....",
            "...KHHHHHHHhK...",
            "...KHhHHHHHhK...",
            "...KHSSSSSShK...",
            "...KSSSSSSSSK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "......KKKK......",
            ".....KHHhhK.....",
            "....KKhhhhKK....",
            "...KHHHHHHHhK...",
            "...KHHHHHHHhK...",
            "...KHhHHHHhhK...",
            "...KHHhHHhHhK...",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "..........KKK...",
            ".....KKKKKHHhK..",
            "....KHHHHHKhhK..",
            "...KHHHHHHHKK...",
            "...KHHHHHHHhK...",
            "...KSSSHHHHhK...",
            "..KSSSSSHHhK....",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "bald": {   # old man: bald crown, white side hair
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KSSSSSSK....",
            "...KSSSSSSSSK...",
            "...KHSSSSSSHK...",
            "...KHSSSSSSHK...",
            "...KHSSSSSSHK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KSSSSSSK....",
            "...KSSSSSSSSK...",
            "...KHSSSSSSHK...",
            "...KHHHHHHHHK...",
            "...KHHHHHHHHK...",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "................",
            ".....KKKKKK.....",
            "....KSSSSSSK....",
            "...KSSSSSSSSK...",
            "...KSSSSSSHHK...",
            "...KSSSSSHHHK...",
            "..KSSSSSSHHK....",
            "..KSESSSSHHK....",
            "...KKSSSSSK.....",
        ],
    },
    "cap": {
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "...KCCCWWCCcK...",
            "...KCCCCCCCcK...",
            "..KKcccccccKK...",
            "...KHSSSSSShK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "...KCCCCCCCcK...",
            "...KCCCCCCCcK...",
            "...KcCCCCCCcK...",
            "...KHKKKKKKhK...",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "................",
            "......KKKKK.....",
            ".....KCCCCCK....",
            "....KCCWCCCcK...",
            "...KCCCCCCCcK...",
            ".KKcccKKKHHhK...",
            "..KKSSSSHHhK....",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "brim": {   # wide-brimmed hat (gardener, hiker)
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "....KCCCCCcK....",
            "..KKcAAAAAAcKK..",
            ".KCCCCCCCCCCCCK.",
            "..KKKSSSSSSKKK..",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "....KCCCCCcK....",
            "..KKcAAAAAAcKK..",
            ".KCCCCCCCCCCCCK.",
            "..KKKHHHHHHKKK..",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "................",
            "......KKKKK.....",
            ".....KCCCCCK....",
            ".....KCCCCcK....",
            "...KKAAAAAAcKK..",
            "KKCCCCCCCCCCCCK.",
            ".KKSSSSHHHhKK...",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "veil": {   # beekeeper: hat with a mesh veil over the face
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "....KCCCCCcK....",
            "..KKKKKKKKKKKK..",
            "..KWMWMWMWMWMK..",
            "..KMWMWMWMWMWK..",
            "..KWMWMWMWMWMK..",
            "...KKKKKKKKKK...",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KCCCCCCK....",
            "....KCCCCCcK....",
            "..KKKKKKKKKKKK..",
            "..KWWWWWWWWWWK..",
            "..KWWWWWWWWWcK..",
            "..KWWWWWWWWWcK..",
            "...KKKKKKKKKK...",
        ],
        "left": [
            "................",
            "......KKKKK.....",
            ".....KCCCCCK....",
            ".....KCCCCcK....",
            "...KKKKKKKKKK...",
            "..KMWMWMWWWWcK..",
            "..KWMWMWWWWWcK..",
            "..KMWMWMWWWWcK..",
            "...KKKKKKKKKK...",
        ],
    },
    "ponytail": {
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHhHHHHHhK...",
            "...KHSSSSSShK...",
            "...KSSSSSSSSK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHHHAAHHhK...",
            "...KHhKHHKhhK...",
            "...KHHKHhKHhK...",
            "...KSHKHhKHSK...",
            "....KSKhhKSK....",
        ],
        "left": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhKK..",
            "...KHHHHHHHAhhK.",
            "...KSSSHHHHhKhK.",
            "..KSSSSSHHhK.KhK",
            "..KSESSSSShK..KK",
            "...KKSSSSSK.....",
        ],
    },
    "flatcap": {   # Hollis: tweed flat cap, grey sideburns
        "down": [
            "................",
            "................",
            "....KKKKKKKK....",
            "...KCCCCCCCCK...",
            "..KCCcCCcCCcCK..",
            "..KKcccccccccK..",
            "...KHSSSSSSHK...",
            "...KSESSSSESK...",
            "....KSSSSSSK....",
        ],
        "up": [
            "................",
            "................",
            "....KKKKKKKK....",
            "...KCCCCCCCCK...",
            "...KCCcCCcCcK...",
            "...KcccccccK....",
            "...KHHHHHHHHK...",
            "...KSHHHHHHSK...",
            "....KSSSSSSK....",
        ],
        "left": [
            "................",
            "................",
            ".....KKKKKKK....",
            "....KCCCCCCCK...",
            "..KKCCcCCcCCcK..",
            ".KcccccccccccK..",
            "..KKSSSSSHHK....",
            "..KSESSSSShK....",
            "...KKSSSSSK.....",
        ],
    },
    "bob": {   # chin-length bob (florist, villager)
        "down": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "..KHHHHHHHHHhK..",
            "..KHHSSSSSSHhK..",
            "..KHSSSSSSSShK..",
            "..KHSESSSSEShK..",
            "...KKSSSSSSKK...",
        ],
        "up": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "..KHHHHHHHHHhK..",
            "..KHHhHHHHhHhK..",
            "..KHHHhHHhHHhK..",
            "..KhHHHHHHHHhK..",
            "...KKSSSSSSKK...",
        ],
        "left": [
            "................",
            ".....KKKKKK.....",
            "....KHHHHHHK....",
            "...KHHHHHHHhK...",
            "...KHHHHHHHHhK..",
            "...KSSSHHHHHhK..",
            "..KSSSSSHHHHhK..",
            "..KSESSSSHHHhK..",
            "...KKSSSSKKKK...",
        ],
    },
}

# --------------------------------------------------------------- bodies -----
# 7 rows (9..15).
BODIES = {
    "basic": {
        ("down", "stand"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKtK..",
            "..KSKBBBBBBKSK..",
            "...KKBBBBBBKK...",
            "....KBBKKBBK....",
            "....KFFKKFFK....",
        ],
        ("down", "step"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKSK..",
            "..KSKBBBBBBKK...",
            "...KKBBBBBBK....",
            "....KFFKKBBK....",
            ".....KK.KFFK....",
        ],
        ("up", "stand"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKtK..",
            "..KSKBBBBBBKSK..",
            "...KKBBBBBBKK...",
            "....KBBKKBBK....",
            "....KFFKKFFK....",
        ],
        ("up", "step"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKSK..",
            "..KSKBBBBBBKK...",
            "...KKBBBBBBK....",
            "....KFFKKBBK....",
            ".....KK.KFFK....",
        ],
        ("left", "stand"): [
            "....KTTTTTTK....",
            "....KTTTTTtK....",
            "....KTTtTTtK....",
            "....KTSKBBBK....",
            ".....KBBBBK.....",
            ".....KBBBBK.....",
            "....KFFFFKK.....",
        ],
        ("left", "step"): [
            "....KTTTTTTK....",
            "...KTTTTTTtK....",
            "...KSTTTTTtK....",
            "....KKBBBBBK....",
            "....KBBBBBBBK...",
            "...KBBK..KBBK...",
            "..KFFFK..KFFK...",
        ],
    },
    "coat": {
        ("down", "stand"): [
            "...KTTTAATTTK...",
            "..KTKTTKKTTKTK..",
            "..KtKTTKKTTKtK..",
            "..KSKTTTTTTKSK..",
            "...KTTTKKTTTK...",
            "....KBBKKBBK....",
            "....KFFKKFFK....",
        ],
        ("down", "step"): [
            "...KTTTAATTTK...",
            "..KTKTTKKTTKTK..",
            "..KtKTTKKTTKSK..",
            "..KSKTTTTTTKK...",
            "...KTTTKKTTTK...",
            "....KFFKKBBK....",
            ".....KK.KFFK....",
        ],
        ("up", "stand"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKtK..",
            "..KSKTTTTTTKSK..",
            "...KTTTKKTTTK...",
            "....KBBKKBBK....",
            "....KFFKKFFK....",
        ],
        ("up", "step"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKSK..",
            "..KSKTTTTTTKK...",
            "...KTTTKKTTTK...",
            "....KFFKKBBK....",
            ".....KK.KFFK....",
        ],
        ("left", "stand"): [
            "....KTTTTTTK....",
            "....KATTTTtK....",
            "....KTTtTTtK....",
            "....KTSKTTtK....",
            "....KTTTTTtK....",
            ".....KBBBBK.....",
            "....KFFFFKK.....",
        ],
        ("left", "step"): [
            "....KTTTTTTK....",
            "...KTATTTTtK....",
            "...KSTTTTTtK....",
            "....KTTTTTtK....",
            "...KTTTTTTTtK...",
            "...KBBK..KBBK...",
            "..KFFFK..KFFK...",
        ],
    },
    "dress": {
        ("down", "stand"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTAATTKtK..",
            "..KSKBBBBBBKSK..",
            "...KBBBBBBBBK...",
            "...KKKSKKSKKK...",
            "....KFFKKFFK....",
        ],
        ("down", "step"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTAATTKSK..",
            "..KSKBBBBBBKK...",
            "...KBBBBBBBBK...",
            "....KFFKKSKK....",
            ".....KK.KFFK....",
        ],
        ("up", "stand"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKtK..",
            "..KSKBBBBBBKSK..",
            "...KBBBBBBBBK...",
            "...KKKSKKSKKK...",
            "....KFFKKFFK....",
        ],
        ("up", "step"): [
            "...KTTTTTTTTK...",
            "..KTKTTTTTTKTK..",
            "..KtKTTTTTTKSK..",
            "..KSKBBBBBBKK...",
            "...KBBBBBBBBK...",
            "....KFFKKSKK....",
            ".....KK.KFFK....",
        ],
        ("left", "stand"): [
            "....KTTTTTTK....",
            "....KTTTTTtK....",
            "....KTTtTTtK....",
            "....KTSKBBBK....",
            "...KBBBBBBBBK...",
            ".....KSKKSK.....",
            "....KFFKFFK.....",
        ],
        ("left", "step"): [
            "....KTTTTTTK....",
            "...KTTTTTTtK....",
            "...KSTTTTTtK....",
            "....KBBBBBBK....",
            "...KBBBBBBBBK...",
            "...KSK...KSK....",
            "..KFFK...KFFK...",
        ],
    },
}

# Kids: the same heads two pixels lower, with a 5-row body (rows 11..15).
KID_BODY = {
    ("down", "stand"): [
        "...KTTTTTTTTK...",
        "..KTKTTTTTTKTK..",
        "..KSKBBBBBBKSK..",
        "....KBBKKBBK....",
        "....KFFKKFFK....",
    ],
    ("down", "step"): [
        "...KTTTTTTTTK...",
        "..KTKTTTTTTKSK..",
        "..KSKBBBBBBKK...",
        "....KFFKKBBK....",
        ".....KK.KFFK....",
    ],
    ("up", "stand"): [
        "...KTTTTTTTTK...",
        "..KTKTTTTTTKTK..",
        "..KSKBBBBBBKSK..",
        "....KBBKKBBK....",
        "....KFFKKFFK....",
    ],
    ("up", "step"): [
        "...KTTTTTTTTK...",
        "..KTKTTTTTTKSK..",
        "..KSKBBBBBBKK...",
        "....KFFKKBBK....",
        ".....KK.KFFK....",
    ],
    ("left", "stand"): [
        "....KTTTTTTK....",
        "....KTSKTTtK....",
        ".....KBBBBK.....",
        ".....KBBBBK.....",
        "....KFFFFKK.....",
    ],
    ("left", "step"): [
        "....KTTTTTTK....",
        "...KSTTTTTtK....",
        "....KBBBBBBK....",
        "...KBBK..KBBK...",
        "..KFFFK..KFFK...",
    ],
}


def patch(grid: list[list[str]], rows: list[str], x: int, y: int) -> None:
    """Overlay; ' ' keeps what's underneath."""
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != " " and 0 <= y + j < 16 and 0 <= x + i < 16:
                grid[y + j][x + i] = ch


# ---------------------------------------------------------- accessories -----
# Each: dir -> list of (rows, x, y). Applied after head + body.
ACCESSORIES = {
    "armband": {
        "down": [(["A"], 12, 10)],
        "up": [(["A"], 3, 10)],
        "left": [],          # far arm hidden; shown on the right-facing mirror below
        "right_only": [(["A"], 6, 10)],
    },
    "glasses": {
        "down": [(["KWKKKKWK"], 4, 7)],
        "up": [],
        "left": [(["KWK"], 3, 7)],
    },
    "beard": {
        "down": [(["KHHHHHHK", " KHHHHK "], 4, 8)],
        "up": [],
        "left": [(["KHHHHK", " KHHK"], 2, 8)],
    },
    "pack": {   # hiker's big pack
        "down": [(["P", "P"], 5, 9), (["P", "P"], 10, 9)],
        "up": [(["KKKKKKKK", "KPPPPPPK", "KPQQQQPK", "KPPPPPPK", "KPPPPPPK", " KKKKKK "], 4, 8)],
        "left": [([" KKK", "KPPPK", "KPQQK", "KPPPK", "KPPPK", " KKK "], 10, 8)],
    },
    "satchel": {   # schoolkid's bag strap + bag
        "down": [(["P"], 6, 11), (["P"], 7, 12), (["KK", "PK"], 9, 12)],
        "up": [(["P"], 9, 11), (["P"], 8, 12), (["KKK", "PPK"], 3, 12)],
        "left": [(["KKK", "KPPK", "KPPK", " KK"], 9, 11)],
    },
    "binoculars": {
        "down": [(["K  K", " KK ", "KWWK"], 6, 9)],
        "up": [],
        "left": [(["KK", "KW"], 3, 10)],
    },
    "apron": {
        "down": [(["AAAA", "AAAA", "AAAA", "AAAA"], 6, 10)],
        "up": [(["A", "A"], 7, 12), (["A", "A"], 8, 12)],
        "left": [(["A", "A", "A"], 4, 10)],
    },
    "flower": {
        "down": [(["A"], 11, 3)],
        "up": [(["A"], 4, 3)],
        "left": [(["A"], 9, 3)],
    },
    "tie": {
        "down": [(["A", "A"], 7, 9), (["A", "A"], 8, 9)],
        "up": [],
        "left": [(["A"], 4, 10)],
    },
    "waders": {   # Nell: chest waders with straps over the shirt
        "down": [(["B", "B"], 5, 9), (["B", "B"], 10, 9), (["BBBBBB"], 5, 11)],
        "up": [(["B", "B"], 5, 9), (["B", "B"], 10, 9)],
        "left": [(["B", "B"], 8, 9), (["BBBB"], 6, 11)],
    },
    "cane": {
        "down": [(["K", "o", "o", "o"], 13, 11)],
        "up": [(["K", "o", "o", "o"], 2, 11)],
        "left": [(["Ko", " o", " o", " o"], 2, 11)],
    },
    "shears": {   # Shears carries a big pair of garden shears
        "down": [(["W ", "WW", "KK", "KK"], 13, 9)],
        "up": [],
        "left": [(["W", "W", "WK", "KK"], 2, 9)],
    },
}

# ----------------------------------------------------------- characters -----
# Colours per region. Missing regions fall back to DEFAULT.
DEFAULT = {"K": "k", "E": "k", "S": "sk0", "W": "white", "F": "k", "M": "r2", "o": "o2"}

CHARS = {
    # the junior botanist: green field cap, orange jacket, blue jeans
    "player": dict(head="cap", body="basic", acc=[],
                   pal={"C": "g2", "c": "f2", "H": "d3", "h": "o3", "T": "m1", "t": "m2",
                        "B": "u2", "F": "r3"}),
    # Dr. Vale: auburn hair in a bun, white lab coat, green tie
    "vale": dict(head="bun", body="coat", acc=["glasses"],
                 pal={"H": "m2", "h": "m3", "T": "white", "t": "r1", "A": "g2", "B": "f2", "F": "o3"}),
    # Bram: spiky dark-red hair, black jacket with purple, cold
    "bram": dict(head="spiky", body="basic", acc=[],
                 pal={"H": "b2", "h": "b3", "T": "x2", "t": "x3", "B": "r3", "F": "k"}),
    # Old Fennimore: bald, white side hair, beard, glasses, brown cardigan, cane
    "fennimore": dict(head="bald", body="coat", acc=["beard", "glasses", "cane"],
                      pal={"H": "r1", "T": "o2", "t": "o3", "A": "s1", "B": "d3", "F": "k"}),
    # Hollis: hedge-layer in a tweed flat cap and a waxed green jacket
    "hollis": dict(head="flatcap", body="coat", acc=["beard"],
                   pal={"C": "d1", "c": "d2", "H": "r1", "T": "f1", "t": "f2", "A": "d1",
                        "B": "d3", "F": "o3"}),
    # Nell Pitcher: strawberry-blonde bun, pink shirt, green chest waders
    "nell_pitcher": dict(head="bun", body="basic", acc=["waders"],
                         pal={"H": "m0", "h": "m1", "T": "n1", "t": "n2", "B": "g2", "F": "f2"}),
    # Shears: Rootstock admin, white slicked hair, charcoal coat, yellow graft-tape armband
    "shears": dict(head="short", body="coat", acc=["armband", "shears"],
                   pal={"H": "white", "h": "r1", "T": "r3", "t": "k", "A": "y1", "B": "k", "F": "k"}),
    # Rootstock grunt: grey cap, grey work coat, yellow armband
    "grunt": dict(head="cap", body="coat", acc=["armband"],
                  pal={"C": "r2", "c": "r3", "H": "r3", "h": "k", "T": "r1", "t": "r2", "A": "y1",
                       "B": "r3", "F": "k", "W": "r1"}),
    # Greenhouse keeper (Pokemon Centre nurse): herb-green dress, white apron, bun
    "greenhouse_keeper": dict(head="bun", body="dress", acc=["apron"],
                              pal={"H": "n2", "h": "n3", "T": "g1", "t": "g2", "A": "white",
                                   "B": "g2", "F": "o3"}),
    # Shopkeeper: blue shop coat, short hair
    "shopkeeper": dict(head="short", body="basic", acc=["apron"],
                       pal={"H": "d3", "h": "k", "T": "u1", "t": "u2", "A": "white", "B": "r3", "F": "k"}),
    # Pip: kid with a yellow tee and a ponytail-free mop, magnifier-free (kid body)
    "pip": dict(head="cap", body="kid", acc=[],
                pal={"C": "y1", "c": "y2", "H": "o2", "h": "o3", "T": "g1", "t": "g2", "B": "o2",
                     "F": "o3"}),
    "villager_a": dict(head="long", body="dress", acc=[],
                       pal={"H": "d2", "h": "d3", "T": "n0", "t": "n1", "A": "n1", "B": "n1", "F": "o3"}),
    "villager_b": dict(head="short", body="basic", acc=[],
                       pal={"H": "k", "h": "r3", "T": "u0", "t": "u1", "B": "o2", "F": "o3"}),
    "elder": dict(head="bun", body="dress", acc=["cane"],
                  pal={"H": "r1", "h": "r2", "T": "x1", "t": "x2", "A": "x0", "B": "x2", "F": "k"}),
    "kid": dict(head="spiky", body="kid", acc=[],
                pal={"H": "d2", "h": "d3", "T": "b1", "t": "b2", "B": "u2", "F": "k"}),
    "gardener": dict(head="brim", body="basic", acc=["apron"],
                     pal={"C": "y0", "c": "s2", "A": "g2", "H": "d3", "T": "white", "t": "r1",
                          "B": "u2", "F": "o3"}),
    "schoolkid": dict(head="short", body="kid", acc=["satchel", "tie"],
                      pal={"H": "k", "h": "r3", "T": "u2", "t": "u3", "A": "b1", "B": "u3", "P": "o2",
                           "F": "k"}),
    "birdwatcher": dict(head="brim", body="basic", acc=["binoculars"],
                        pal={"C": "s2", "c": "s3", "A": "s3", "H": "d3", "T": "s2", "t": "s3",
                             "B": "f2", "F": "o3"}),
    "hiker": dict(head="brim", body="basic", acc=["pack", "beard"],
                  pal={"C": "o2", "c": "o3", "A": "b2", "H": "d3", "T": "b1", "t": "b2", "B": "o2",
                       "P": "f1", "Q": "f2", "F": "o3", "W": "d2"}),
    "beekeeper": dict(head="veil", body="basic", acc=[],
                      pal={"C": "white", "c": "r1", "T": "white", "t": "r1", "B": "white", "F": "y2",
                           "M": "r2"}),
    "florist": dict(head="bob", body="dress", acc=["apron", "flower"],
                    pal={"H": "y1", "h": "y2", "T": "n1", "t": "n2", "A": "g2", "B": "n1", "F": "o3"}),
}


def frame(spec: dict, d: str, pose: str, mirror_acc=False) -> list[list[str]]:
    grid = [["."] * 16 for _ in range(16)]
    kid = spec["body"] == "kid"
    head = HEADS[spec["head"]][d]
    body = KID_BODY[(d, pose)] if kid else BODIES[spec["body"]][(d, pose)]
    by = 11 if kid else 9
    for j, r in enumerate(body):
        for i, ch in enumerate(r):
            if ch != ".":
                grid[by + j][i] = ch
    hy = 2 if kid else 0
    for j, r in enumerate(head):
        for i, ch in enumerate(r):
            if ch != "." and 0 <= hy + j < 16:
                grid[hy + j][i] = ch
    for a in spec["acc"]:
        parts = ACCESSORIES[a].get(d, [])
        if d == "left" and mirror_acc:
            parts = parts + ACCESSORIES[a].get("right_only", [])
        for rows, x, y in parts:
            yy = y + 2 if kid else y
            patch(grid, rows, x, yy)
    return grid


def render(spec: dict, grid: list[list[str]]) -> Image.Image:
    pal = {**DEFAULT, **spec["pal"]}
    im = Image.new("RGBA", (16, 16), gbc.CLEAR)
    px = im.load()
    for y in range(16):
        for x in range(16):
            ch = grid[y][x]
            if ch == ".":
                continue
            px[x, y] = C[pal.get(ch, "k")]
    return im


def sheet(spec: dict) -> Image.Image:
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row, d in enumerate(("down", "up", "left", "right")):
        src = "left" if d == "right" else d
        stand = render(spec, frame(spec, src, "stand", d == "right"))
        step = render(spec, frame(spec, src, "step", d == "right"))
        if d == "right":
            stand, step = ImageOps.mirror(stand), ImageOps.mirror(step)
            frames = [stand, step, step]
        elif d == "left":
            frames = [stand, step, step]
        else:
            frames = [stand, step, ImageOps.mirror(step)]
        for col, f in enumerate(frames):
            out.alpha_composite(f, (col * 16, row * 16))
    return out


# --------------------------------------------------------------- objects ----
def potted_plant() -> Image.Image:
    rows = [
        "................",
        ".......KK.......",
        "......KgGK......",
        "..KKK.KgGK.KKK..",
        ".KgggKKgGKKGGGK.",
        ".KgggggKgKGGGGK.",
        "..KKgggKgKGGKK..",
        "....KKKKgKKK....",
        ".......KgK......",
        "...KKKKKKKKKK...",
        "..KhhhhhhhhhhK..",
        "...KcccccccCK...",
        "...KhcccccCCK...",
        "....KccccCCK....",
        "....KcccCCCK....",
        ".....KKKKKK.....",
    ]
    key = {".": None, "K": "k", "g": "g1", "G": "g2", "c": "b1", "C": "b2", "h": "b0"}
    a = gbc.img_from_rows(rows, key)
    # sway: second frame leans the leaves a pixel
    b_rows = [r[1:] + "." if 1 <= i <= 8 else r for i, r in enumerate(rows)]
    b = gbc.img_from_rows(b_rows, key)
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row in range(4):
        for col, f in enumerate((a, a, b)):
            out.alpha_composite(f, (col * 16, row * 16))
    return out


def item_pickup() -> Image.Image:
    """A small glass acorn-shaped pod lying in the grass: wooden cap, clear glass
    body with a shine and a seedling inside. Not a red/white ball."""
    rows = [
        "................",
        "................",
        ".......KK.......",
        "......KoK.......",
        "....KKKKKKKK....",
        "...KoOoOoOoOK...",
        "...KOoOoOoOoK...",
        "...KKKKKKKKKK...",
        "...KwqqqqqqqK...",
        "...KwqqgGqqQK...",
        "....KwqgqqQK....",
        "....KqqqqQQK....",
        ".....KqqQQK.....",
        "......KQQK......",
        ".......KK.......",
        "....ssssssss....",
    ]
    key = {".": None, "K": "k", "o": "o1", "O": "o2", "w": "white", "q": "q1", "Q": "q2",
           "g": "g1", "G": "g2", "s": (0, 0, 0, 72)}
    a = gbc.img_from_rows(rows, key)
    # glint frame: the shine moves
    b_rows = list(rows)
    b_rows[8] = "...KqqqqqqqqK..."
    b_rows[9] = "...KqwqgGqqQK..."
    b_rows[10] = "....KqwgqqQK...."
    b = gbc.img_from_rows(b_rows, key)
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row in range(4):
        for col, f in enumerate((a, a, b)):
            out.alpha_composite(f, (col * 16, row * 16))
    return out


def build() -> dict[str, Image.Image]:
    sheets = {k: sheet(v) for k, v in CHARS.items()}
    sheets["potted_plant"] = potted_plant()
    sheets["item_pickup"] = item_pickup()
    for k, im in sheets.items():
        gbc.save(im, f"characters/{k}.png")
    cells = [(k, gbc.on_bg(im, (160, 216, 104, 255))) for k, im in sheets.items()]
    gbc.grid_sheet(cells, 8, 3).save(gbc.REVIEW / "characters.png")
    return sheets


if __name__ == "__main__":
    build()
