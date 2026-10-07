"""Build the Chapter 5 environment bundles (tilesets + structures).

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env5/build.py
      write public/art/tilesets/{oldgrowth,burnt,hollow}/ and
      public/art/structures/<ch5 key>/, then the review sheets
  ... build.py -n     review sheets only (tools/art/env5/review/), no bundles

Deterministic: a regen rewrites nothing unless the art changed. Bundles whose
source.kind is edited/imported are never touched (artkit.emit). Run
`npm run art:index` after adding or removing bundle files.
"""

from __future__ import annotations

import sys

from PIL import Image, ImageChops

import kit
import tilesets as TS
import buildings as BL

TOOL_T = "tools/art/env5/tilesets.py"
TOOL_S = "tools/art/env5/buildings.py"

# mirrors src/contracts/constants.ts AUTOTILE (the groups the scenes use)
AUTOTILE = {
    "oldgrowth_tree": "oldgrowth", "canopy_boardwalk": "canopy_boardwalk", "canopy_drop": "canopy_drop",
    "rope_rail": "rope_rail", "ash": "ash", "hollow_wall": "hollow_wall",
    "bog": "bog", "boardwalk": "boardwalk", "path": "path", "water": "water", "tree": "tree",
}

_RES = None


def _resolver():
    global _RES
    if _RES is None:
        from artkit.resolve import Resolver
        _RES = Resolver()
    return _RES


def _tile(stem: str):
    """A tile image by stem: this generator's first, else the bundles."""
    for d in TS.TILESETS.values():
        if stem in d:
            return kit.to_img(d[stem])
    im = _resolver().image(f"assets/tiles/{stem}.png")
    if im is None:
        return None
    return im if isinstance(im, Image.Image) else Image.fromarray(im, "RGBA")


def _stem_exists(stem: str) -> bool:
    return any(stem in d for d in TS.TILESETS.values()) or _tile(stem) is not None


def render_map(rows, legend, frame=1, structures=(), npcs=()):
    """Compose a map like the engine: masks (out of bounds = same), alts, structures."""
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    keys = [[legend[ch] for ch in r] for r in rows]
    cache: dict[str, Image.Image | None] = {}

    def get(stem):
        if stem not in cache:
            cache[stem] = _tile(stem)
        return cache[stem]
    for y in range(h):
        for x in range(w):
            k = keys[y][x]
            stem = k
            grp = AUTOTILE.get(k)
            if grp:
                def same(xx, yy):
                    return not (0 <= xx < w and 0 <= yy < h) or AUTOTILE.get(keys[yy][xx]) == grp
                m = same(x, y - 1) * 1 | same(x + 1, y) * 2 | same(x, y + 1) * 4 | same(x - 1, y) * 8
                if get(f"{k}@{m}") is not None:
                    stem = f"{k}@{m}"
            if stem == k:
                alt = kit.hash2(x, y) % 4
                if alt and get(f"{k}~{alt}") is not None:
                    stem = f"{k}~{alt}"
            if frame == 2 and get(f"{stem}__2") is not None:
                stem = f"{stem}__2"
            t = get(stem)
            if t is None:
                im.paste((255, 0, 255, 255), (x * 16, y * 16, x * 16 + 16, y * 16 + 16))
            else:
                im.paste(t, (x * 16, y * 16))
    for key, sx, sy in structures:
        s = BL.IMAGES.get(key)
        if s is not None:
            im.alpha_composite(s, (sx * 16, sy * 16))
    for key, sx, sy in npcs:
        ch = _resolver().image(f"assets/characters/{key}.png")
        if ch is not None:
            ch = ch if isinstance(ch, Image.Image) else Image.fromarray(ch, "RGBA")
            im.alpha_composite(ch.crop((0, 0, 16, 16)), (sx * 16, sy * 16))
    return im


def night(im: Image.Image) -> Image.Image:
    over = Image.new("RGBA", im.size, (64, 72, 160, 255))
    return ImageChops.multiply(im.convert("RGBA"), over)


LEG = {
    ".": "moss", ",": "fern_brush", "T": "oldgrowth_tree", "=": "canopy_boardwalk", "~": "canopy_drop",
    "|": "rope_rail", "b": "bog", "-": "boardwalk", "a": "ash", "t": "burnt_trunk", "l": "charred_log",
    "f": "fresh_shoots", "w": "shrine_floor", "W": "hollow_wall", "p": "carved_post", "g": "ghostpipe_clump",
    "G": "glow_pipe", "n": "night_floor", "_": "void", "@": "moss", "E": "mat_exit",
}

FOREST = [
    "TTTTTTTTTTTTTTTTTTTT",
    "TTTTTTTT|==|TTTTTTTT",
    "TTTTTTTT|==|TTTTTTTT",
    "TTT~~~~~|==|~~~~TTTT",
    "TT~~~~~~|==|~~~~~TTT",
    "TT~~~~~~|==|~~~~~~TT",
    "TT~~~~~~|=====|~~~TT",
    "TT~~~~~~|=====|~~~TT",
    "TT~~~~~~|==||||~~~TT",
    "TT~~~~~~|==|~~~~~~TT",
    "TTT~~~~~|==|~~~~~TTT",
    "TTTT....|==|....TTTT",
    "TT.......==........T",
    "T..,,,..........,,.T",
    "T.,,,,,......T..,,.T",
    "T..,,...TT......bb.T",
    "TT......TT.....bbbTT",
    "TTTTTTTTTTTTTTTTTTTT",
]
BURNT = [
    "tttttttttttttttttttt",
    "ttaaaataaaaataaaaatt",
    "taaffffaaalaaaaaaaat",
    "taafffffaaaaaattaaat",
    "taaaffaaaaaaaaaaaaat",
    "taaaaaaataaaaafffaat",
    "tlaaaaaaaaaaaaffffat",
    "taaaaataaaaaaaaaaaat",
    "tttaaaaaaaltaaaaattt",
]
HOLLOW = [
    "WWWWWWWWWWWWWWWW",
    "WWWWWWwwwwWWWWWW",
    "WWwwwwwwwwwwwwWW",
    "Wwpwwww,,wwwwpwW",
    "Wwwwww,,,,wwwwwW",
    "Wgwwwww,,wwwwwgW",
    "WWWWwwwwwwwwWWWW",
    "WWWGwwwwwwwwGWWW",
    "WWWWWWWEWWWWWWWW",
]
NIGHT = [
    "WWWWWWWWWWWWWWWW",
    "WnnnnnnnnnnnnnnW",
    "Wnn____n____nnnW",
    "Wnn____n____nnnW",
    "WnnnnnnnnnnnnnnW",
    "WWWWWWWEWWWWWWWW",
]
TOWN = [
    "TTTTTTTTTTTTTTTTTTTTTTTT",
    "T......................T",
    "T.@@@@....@@@@@@.......T",
    "T.@@@@....@@@@@@.......T",
    "T.@@@@....@@@@@@...@@@.T",
    "T.@@@@....@@@@@@...@@@.T",
    "T..........,,......@@@.T",
    "T.@@@@@...,,,......@@@.T",
    "T.@@@@@................T",
    "T.@@@@@.......@@@......T",
    "T.@@@@@.......@@.......T",
    "T.@@@@@................T",
    "TTTTTTTTTTTTTTTTTTTTTTTT",
]
TOWN_S = [("cedar_house", 2, 2), ("night_conservatory", 10, 2), ("giant_cedar", 19, 4),
          ("hollow_trunk", 2, 7), ("camp_tent", 14, 9)]


def review():
    kit.REVIEW.mkdir(parents=True, exist_ok=True)
    cells = []
    for tid, d in TS.TILESETS.items():
        for stem, a in d.items():
            if "@" in stem:
                continue
            im = kit.to_img(a)
            patch = Image.new("RGBA", (48 + 4 + 16, 48))
            for y in range(3):
                for x in range(3):
                    patch.paste(im, (x * 16, y * 16))
            patch.paste(im, (52, 0))
            cells.append((f"{stem} q{kit.quad_counts(a)}", patch))
    kit.gbc.grid_sheet(cells, 6, 3).save(kit.REVIEW / "tiles.png")
    cells = []
    for tid, d in TS.TILESETS.items():
        keys = sorted({s.split("@")[0] for s in d if "@" in s})
        for k in keys:
            for f in ("", "__2"):
                if f and f"{k}@0__2" not in d:
                    continue
                g = Image.new("RGBA", (4 * 17, 4 * 17), (255, 0, 255, 255))
                for m in kit.MASKS:
                    g.paste(kit.to_img(d[f"{k}@{m}{f}"]), ((m % 4) * 17, (m // 4) * 17))
                cells.append((k + f, g))
    kit.gbc.grid_sheet(cells, 3, 3).save(kit.REVIEW / "tiles_auto.png")
    for name, rows, ss in (("forest", FOREST, []), ("burnt", BURNT, []), ("hollow", HOLLOW, []),
                           ("night", NIGHT, []), ("town", TOWN, TOWN_S)):
        im = render_map(rows, LEG, 1, ss)
        kit.gbc.zoom(im, 3).save(kit.REVIEW / f"map_{name}.png")
        kit.gbc.zoom(night(im), 3).save(kit.REVIEW / f"map_{name}_night.png")
    BL.review()


def build(save=True):
    BL.build_all()
    if save:
        for tid, d in TS.TILESETS.items():
            kit.write_tileset(tid, TS.NAMES_OF[tid], d, TS.ORDER[tid], TOOL_T)
        for key, im in BL.IMAGES.items():
            kit.write_structure(key, im, TOOL_S)
    review()
    bad = TS.check()
    if bad:
        print("over 4 colours/quadrant:", bad)
    print(f"{sum(len(d) for d in TS.TILESETS.values())} tile images in {len(TS.TILESETS)} tilesets; "
          f"{len(BL.IMAGES)} structures")


if __name__ == "__main__":
    build(save="-n" not in sys.argv)
