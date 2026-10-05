"""Build the Chapter 4 environment bundles (tilesets + structures).

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/env4/build.py
      write public/art/tilesets/{city,orchard,palm_house,relay,nursery,rose}/
      and public/art/structures/<ch4 key>/, then the review sheets
  ... build.py -n     review sheets only (tools/art/env4/review/), no bundles

Deterministic: a regen rewrites nothing unless the art changed. Bundles whose
source.kind is edited/imported are never touched (artkit.emit). Run
`npm run art:index` after adding or removing bundle files.
"""

from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets as TS
import buildings as BL
from kit import T, gbc

TOOL_T = "tools/art/env4/tilesets.py"
TOOL_S = "tools/art/env4/buildings.py"

# mirrors src/contracts/constants.ts AUTOTILE (round 1-4)
AUTOTILE = {**T.AUTOTILE, "paving": "paving", "tropical_grass": "tropical_grass",
            "orchard_tree": "orchard", "iron_railing": "iron_railing", "rose_trellis": "rose_trellis",
            "fountain_basin": "water", "stepping_stones": "water"}
ALTS = set(T.ALTS) | {"paving", "floor_marble"}


def all_stems() -> dict:
    out = {k: v for k, v in T.OUT.items()}
    for d in TILESETS_VIEW():
        out.update(d)
    return out


def TILESETS_VIEW():
    return TS.TILESETS.values()


def render_map(rows, legend, frame=1, structures=()):
    """Compose a map like the engine: masks (OOB = same), alts, structures."""
    stems = all_stems()
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * 16, h * 16))
    keys = [[legend[ch] for ch in r] for r in rows]
    for y in range(h):
        for x in range(w):
            k = keys[y][x]
            stem = k
            grp = AUTOTILE.get(k)
            if grp:
                def same(xx, yy):
                    return not (0 <= xx < w and 0 <= yy < h) or AUTOTILE.get(keys[yy][xx]) == grp
                m = same(x, y - 1) * 1 | same(x + 1, y) * 2 | same(x, y + 1) * 4 | same(x - 1, y) * 8
                if f"{k}@{m}" in stems:
                    stem = f"{k}@{m}"
            if stem == k and k in ALTS:
                alt = ((x * 73856093) ^ (y * 19349663)) & 0xFFFF
                alt %= 4
                if alt and f"{k}~{alt}" in stems:
                    stem = f"{k}~{alt}"
            if frame == 2 and f"{stem}__2" in stems:
                stem = f"{stem}__2"
            a = stems.get(stem)
            if a is None:
                im.paste((255, 0, 255, 255), (x * 16, y * 16, x * 16 + 16, y * 16 + 16))
            else:
                im.paste(kit.to_img(a), (x * 16, y * 16))
    for key, sx, sy in structures:
        s = BL.IMAGES.get(key)
        if s is None:
            s = _resolver_image(f"assets/structures/{key}.png")
        if s is not None:
            im.alpha_composite(s, (sx * 16, sy * 16))
    return im


_RES = None


def _resolver_image(path: str):
    """A Round 1-3 structure from the bundles (artkit's logical-path resolver)."""
    global _RES
    from artkit.resolve import Resolver
    if _RES is None:
        _RES = Resolver()
    im = _RES.image(path)
    if im is None:
        return None
    return im if isinstance(im, Image.Image) else Image.fromarray(im, "RGBA")


def night(im: Image.Image) -> Image.Image:
    """Rough night preview: dark blue multiply (the game also lights windows)."""
    over = Image.new("RGBA", im.size, (64, 72, 160, 255))
    from PIL import ImageChops
    return ImageChops.multiply(im.convert("RGBA"), over)


LEG = {
    ".": "grass", ",": "tall_grass", ":": "path", "~": "water", "T": "tree", "_": "void",
    "p": "paving", "R": "iron_railing", "m": "market_stall", "f": "fountain_basin", "P": "palm_tree",
    "o": "orchard_tree", "a": "fallen_apples", "s": "stepping_stones", "x": "bramble_stump",
    "B": "bramble_bush", "t": "tropical_grass", "c": "console", "k": "server_rack", "=": "cable_floor",
    "n": "sensor_post", "e": "seed_tray", "b": "potting_bench", "#": "rose_trellis", "r": "rose_bed",
    "M": "floor_marble", "S": "stage_floor", "I": "glass_wall", "W": "wall", "w": "floor_wood",
    "g": "floor_greenhouse", "6": "lamp_post", "9": "bench", "y": "flowers_yellow", "*": "flowers",
    "1": "stone_path", "L": "stone_wall", "H": "hedge", "q": "reeds", "2": "bridge", "v": "ledge_down",
    "C": "counter",
}

CITY = [
    "IIIIIIIIIIIIIIIIIIIIIIII",
    "Ippppppppppppppppppppppp",
    "IpppppppppppppppppppPppp",
    "Ippppppppppppppppp.....p",
    "IpppPpppppppppppppp.*.pp",
    "IppppppppppppppppppppppR",
    "IpmmmmppppRRRRRRpppppppR",
    "IppppppppRpppppRppPpppp6",
    "IppppppppRpffffppppppppp",
    "IpPpp6pppRpffffpppp9pppp",
    "Ipppppppppffffpppppppppp",
    "IpppppppppppppppRRRRpppp",
    "Ipp..ppppppppppp~~~~pppp",
    "Ipp.Pppppppppppp~~~~pppp",
    "Ippppppnppppppppppppppp.",
]
CITY_S = [("city_house", 1, 0), ("market_large", 6, 0), ("rose_conservatory", 13, 0),
          ("fountain", 11, 8), ("relay_mast", 22, 0)]
ROUTE = [
    "TTTTTTTTTTTTTTTTTTTTTTTT",
    "T..o.o.o.o....o.o.o....T",
    "T..o.o.o.o....o.o.o..a.T",
    "T..o.o.o.o..a.o.o.o....T",
    "T.a.........:::::::....T",
    "T..ooo.ooo..:..xBx.:...T",
    "T..ooo.ooo..:......:.n.T",
    "T...........:...,,,:...T",
    "T~~~~~~~~~~~s~~~,,,:...T",
    "T~~~~~~~~~~~s~~~~~~:...T",
    "T...........:...~~~:...T",
    "TvvvvvvvvvvvvvvvvvvvvvvT",
    "T.........:::::........T",
    "TTTTTTTTTTTTTTTTTTTTTTTT",
]
INSIDE = [
    "WWWWWWWWWWWWWWWWWWWWWWWW",
    "WkkkkW=cccc=WIIIIIIIIIIW",
    "W====W======W#########MW",
    "W=n==W=====CW#MMMM#MM#MW",
    "W====WMMMMMMW#M##M#rr#MW",
    "WMMMMMMMMMMMWMM#MM#MMMMW",
    "WMMMMMMMMMMMW#######SSSW",
    "WbbbwwweeeggW.ttttt.SSSW",
    "Wwwwwwwgggg.W.tPttt.ttPW",
    "WWWWWWWWWWWWWttttttt..tW",
]


def review():
    gbc.REVIEW  # noqa: B018
    kit.REVIEW.mkdir(parents=True, exist_ok=True)
    cells = []
    for tid, d in TS.TILESETS.items():
        for stem, a in d.items():
            if "@" in stem or stem.endswith("__2"):
                continue
            im = kit.to_img(a)
            patch = Image.new("RGBA", (48 + 4 + 16, 48))
            for y in range(3):
                for x in range(3):
                    patch.paste(im, (x * 16, y * 16))
            patch.paste(im, (52, 0))
            cells.append((f"{stem} q{kit.quad_counts(a)}", patch))
    gbc.grid_sheet(cells, 6, 3).save(kit.REVIEW / "tiles.png")
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
    gbc.grid_sheet(cells, 5, 3).save(kit.REVIEW / "tiles_auto.png")
    for name, rows, ss in (("city", CITY, CITY_S), ("route", ROUTE, []), ("inside", INSIDE, [])):
        for f in (1, 2):
            im = render_map(rows, LEG, f, ss)
            gbc.zoom(im, 3).save(kit.REVIEW / f"map_{name}{'' if f == 1 else '_2'}.png")
        gbc.zoom(night(render_map(rows, LEG, 1, ss)), 3).save(kit.REVIEW / f"map_{name}_night.png")
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
