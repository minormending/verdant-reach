"""16x16 item icons -> public/assets/items/<id>.png (REQUIRED_ITEMS).

Hand-authored ASCII, 1px black outline, a few colours each, transparent.
"""

from __future__ import annotations

import gbc
from gbc import img_from_rows

ITEMS = {}


def item(name, rows, key):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (name, [len(r) for r in rows])
    ITEMS[name] = img_from_rows(rows, {".": None, "K": "k", **key})


# acorn-shaped glass capsule with a wooden cap and a seedling inside
POD = [
    "................",
    ".......KK.......",
    "......KoK.......",
    "...KKKKKKKKKK...",
    "..KoOoOoOoOoOK..",
    "..KOoOoOoOoOoK..",
    "..KKKKKKKKKKKK..",
    "...KwqqqqqqqK...",
    "...KwqqgGqqQK...",
    "...KqwqgqqqQK...",
    "...KqqqgqqQQK...",
    "....KqqqqqQK....",
    "....KqqqqQQK....",
    ".....KqqQQK.....",
    "......KQQK......",
    ".......KK.......",
]
item("terrarium_pod", POD, {"o": "o1", "O": "o2", "w": "white", "q": "q1", "Q": "q2", "g": "g1", "G": "g2"})
# glass pod: clearer blue glass with a brass cap and a sparkle (grove only)
item("glass_pod", [r if i else "..............w." for i, r in enumerate(POD)],
     {"o": "y1", "O": "y2", "w": "white", "q": "w1", "Q": "w2", "g": "g1", "G": "g2"})

item("water_flask", [
    "................",
    "......KKKK......",
    "......KooK......",
    ".....KKKKKK.....",
    "......KwqK......",
    "......KwqK......",
    ".....KwqqqK.....",
    "....KwqqqqQK....",
    "...KwqqqqqqQK...",
    "...KbbbbbbbBK...",
    "...KbwbbbbbBK...",
    "...KbbbbbbBBK...",
    "...KbbbbbbBBK...",
    "....KBBBBBBK....",
    ".....KKKKKK.....",
    "................",
], {"o": "o2", "w": "white", "q": "q0", "Q": "q1", "b": "w2", "B": "w3"})

item("spring_water", [
    "................",
    ".......KK.......",
    "......KyyK......",
    "......KKKK......",
    "......KwbK......",
    ".....KwbbBK.....",
    "....KwbbbbBK....",
    "....KwbbbbBK....",
    "....KlllllBK..*.",
    "....KlwlllBK.*w*",
    "....KllllBBK..*.",
    "....KllllBBK....",
    "....KllllBBK....",
    "....KllllBBK....",
    ".....KKKKKK.....",
    "................",
], {"y": "y1", "w": "white", "b": "w1", "B": "w2", "l": "w1", "*": "y1"})

item("rain_jar", [
    "................",
    "....KKKKKKKK....",
    "....KoOoOoOK....",
    "...KKKKKKKKKK...",
    "...KwwqqqqqQK...",
    "...KwKKKqqqQK...",
    "...KKwwwKKqQK...",
    "...KwwwwwwKQK...",
    "...KKKKKKKKQK...",
    "...KqbqqbqqQK...",
    "...KqqqbqqbQK...",
    "...KbbbbbbbBK...",
    "...KbwbbbbbBK...",
    "...KbbbbbbBBK...",
    "....KKKKKKKK....",
    "................",
], {"o": "o1", "O": "o2", "w": "white", "q": "q0", "Q": "q1", "b": "w2", "B": "w3"})

item("compost", [
    "................",
    "................",
    "......KKKK......",
    ".....KoooOK.....",
    "......KKKK......",
    ".....KoooOK.....",
    "....KoooooOK....",
    "...KoooooooOK...",
    "...KooKKKKoOK...",
    "...KoKgGgdKOK...",
    "...KoKdgdGKOK...",
    "...KooKKKKoOK...",
    "...KoooooooOK...",
    "...KOOOOOOOOK...",
    "....KKKKKKKK....",
    "................",
], {"o": "s1", "O": "s3", "g": "g2", "G": "f2", "d": "d2"})

item("neem_spray", [
    "................",
    "..K.KKKK........",
    ".K.KrrrrK.......",
    "..KKKKrrK.......",
    "..K.....KK......",
    "......KKKKK.....",
    ".....KwwgggK....",
    "....KwgggggGK...",
    "....KwgKKKgGK...",
    "....KwgKlKgGK...",
    "....KwgKKKgGK...",
    "....KwgggggGK...",
    "....KggggggGK...",
    "....KGGGGGGGK...",
    ".....KKKKKKK....",
    "................",
], {"r": "r1", "w": "q0", "g": "g1", "G": "g2", "l": "f2"})

item("field_herbarium", [
    "................",
    "..KKKKKKKKKKK...",
    "..KgGGGGGGGGgK..",
    "..KgGwwwwwwGgK..",
    "..KgGwwwlwwGgK..",
    "..KgGwwlLlwGgK..",
    "..KgGwlLlLwGgK..",
    "..KgGwwlLwwGgK..",
    "..KgGwwwLwwGgK..",
    "..KgGwwwwwwGgK..",
    "..KgGGGGGGGGgK..",
    "..KgGGyyyyGGgK..",
    "..KgGGGGGGGGgK..",
    "..KKKKKKKKKKKK..",
    "...KwwwwwwwwwK..",
    "....KKKKKKKKKK..",
], {"g": "f3", "G": "f1", "w": "s0", "l": "g1", "L": "g2", "y": "y1"})

item("centuryheart_seed", [
    ".......y........",
    "..y.........y...",
    "......KKKK......",
    ".....KyyYOK.....",
    "....KywyyYOK....",
    "....KwyyyYOK....",
    "...KyyyyYYOOK...",
    "...KyyyYYYOOK...",
    "...KyyYYYOOOK...",
    "...KYYYYOOOOK...",
    "....KYYOOOOK....",
    "....KOOOOOOK.y..",
    ".y...KOOOOK.....",
    "......KKKK......",
    "...........y....",
    "................",
], {"y": "y0", "w": "white", "Y": "y1", "O": "y2"})

item("fennimores_letter", [
    "................",
    "................",
    "................",
    ".KKKKKKKKKKKKKK.",
    ".KwKwwwwwwwwKwK.",
    ".KwwKwwwwwwKwwK.",
    ".KwwwKwwwwKwwwK.",
    ".KwwwwKwwKwwwwK.",
    ".KwwwwKrrKwwwwK.",
    ".KwwwKrRRrKwwwK.",
    ".KwwKwKrrKwKwwK.",
    ".KwKwwwwwwwwKsK.",
    ".KKsssssssssssK.",
    ".KKKKKKKKKKKKKK.",
    "................",
    "................",
], {"w": "s0", "s": "s2", "r": "b1", "R": "b2"})


def build():
    for k, im in ITEMS.items():
        gbc.save(im, f"items/{k}.png")
    gbc.grid_sheet([(k, gbc.on_bg(v)) for k, v in ITEMS.items()], 10, 6).save(gbc.REVIEW / "items.png")
    return ITEMS


if __name__ == "__main__":
    build()
