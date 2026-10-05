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


# acorn-shaped glass capsule: a scaled wooden cap, glass body, seedling inside
POD = [
    "................",
    ".......KK.......",
    "......KoK.......",
    "....KKKKKKKK....",
    "...KOoOoOoOoK...",
    "..KOoOoOoOoODK..",
    "..KoOoOoOoODDK..",
    "..KKKKKKKKKKKK..",
    "...KwqqqqqqQK...",
    "...KwqqgGqqQK...",
    "...KqwqqgqQJK...",
    "....KqqqgqQK....",
    "....KqqqqQJK....",
    ".....KqqQJK.....",
    "......KQJK......",
    ".......KK.......",
]
item("terrarium_pod", POD, {"o": "o1", "O": "o2", "D": "o3", "w": "white", "q": "q1", "Q": "q2",
                            "J": "q3", "g": "g1", "G": "g2"})
# glass pod: a brass cap over clear blue glass, with a sparkle
item("glass_pod", [r if i else "..............w." for i, r in enumerate(POD)],
     {"o": "y1", "O": "y2", "D": "y3", "w": "white", "q": "w1", "Q": "w2", "J": "w3", "g": "g1", "G": "g2"})

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
    ".......*........",
    "..*.....*...*...",
    "......KKKK......",
    ".....KwyyYK.....",
    "....KwyyyYOK..*.",
    "....KyyyYYOK....",
    "...KyyyyYYOOK...",
    "...KyyyYKYOOK...",
    "...KyyYYKYOOK...",
    "...KYYYYKOOOK...",
    "....KYYYOOOK....",
    "....KYYOOOcK....",
    ".*...KOOOcK.....",
    "......KKKK......",
    "...........*....",
    "................",
], {"y": "y0", "w": "white", "Y": "y1", "O": "y2", "c": "y3", "*": "m0"})

# plant food: a stubby bottle of amber liquid feed, green cap, leaf label
item("plant_food", [
    "................",
    "......KKKK......",
    "......KggK......",
    "......KGGK......",
    ".....KKKKKK.....",
    "....KwmmmmMK....",
    "...KwmmmmmmMK...",
    "...KwKKKKKKMK...",
    "...KmKllLlKMK...",
    "...KmKlgGlKMK...",
    "...KmKlLglKMK...",
    "...KmKKKKKKMK...",
    "...KmmmmmmMMK...",
    "....KMMMMMMK....",
    ".....KKKKKK.....",
    "................",
], {"g": "g1", "G": "g2", "w": "y0", "m": "m0", "M": "m1", "l": "s0", "L": "s1"})

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


# wild berry: a hand of bramble-hedge fruit, two red and one purple, a leaf
item("wild_berry", [
    "................",
    "..........KKK...",
    ".........KggGK..",
    "......KK.KgGGK..",
    ".....KsK..KKK...",
    "....KKKsKKK.....",
    "...KrwrKKpwpK...",
    "..KrwrrRKpppPK..",
    "..KrrrrRKppPPK..",
    "..KRrrRRKPpPPK..",
    "...KRRRKrwrKK...",
    "....KKKrwrrRK...",
    "......KrrrrRK...",
    "......KRrrRRK...",
    ".......KRRRK....",
    "........KKK.....",
], {"g": "g1", "G": "g2", "s": "o2", "r": "b1", "R": "b2", "w": "white", "p": "x1", "P": "x2"})

# rose hip: the wild rose's glossy fruit, a crown of dry sepals on top
item("rose_hip", [
    "......K.K.K.....",
    ".....KdKdKdK....",
    "......KdddK.....",
    ".....KKKKKKK....",
    "....KwoorrrRK...",
    "...KwoorrrrRRK..",
    "...KoorrrrrRRK..",
    "...KorrrrrrRRK..",
    "...KrrrrrrRRRK..",
    "...KrrrrrrRRRK..",
    "...KrrrrrRRRRK..",
    "....KrrrRRRRK...",
    ".....KRRRRRK....",
    "......KKgKK.....",
    ".......KgK......",
    "........K.......",
], {"d": "o3", "o": "m1", "r": "b1", "R": "b2", "w": "white", "g": "g2"})

# syrup jar: amber maple syrup in a glass jar, wooden lid, maple-leaf label
item("syrup_jar", [
    "................",
    "....KKKKKKKK....",
    "....KoOoOoOK....",
    "...KKKKKKKKKK...",
    "...KwqqqqqqQK...",
    "...KwyyyyyyMK...",
    "..KKKKKKKKKKKK..",
    "..KllllrlllllK..",
    "..KllrlrlrlllK..",
    "..KlllrrrllllK..",
    "..KllllrlllllK..",
    "..KKKKKKKKKKKK..",
    "...KwMMMMMmmK...",
    "...KMMMMMmmmK...",
    "....KKKKKKKK....",
    "................",
], {"o": "o1", "O": "o2", "w": "y0", "q": "q0", "Q": "q1", "y": "m0", "M": "m1", "m": "m2",
    "l": "s1", "r": "m2"})

def build():
    for k, im in ITEMS.items():
        gbc.save(im, f"items/{k}.png")
    gbc.grid_sheet([(k, gbc.on_bg(v)) for k, v in ITEMS.items()], 10, 6).save(gbc.REVIEW / "items.png")
    return ITEMS


if __name__ == "__main__":
    build()
