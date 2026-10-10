"""Render the Chapter 10 maps from their source rows and the shipped bundles.

Reads src/world/maps/<id>.ts literally (rows, legend, legendWhen, border,
structures, NPCs) and resolves tiles exactly like src/overworld/autotile.ts:
autotile masks with out-of-bounds counted as joined, then the position-hashed
ground alternates (animated tiles only take alternates that have a frame 2).
Unknown tiles or missing art fail loudly instead of inventing scenery.
"""
from __future__ import annotations

import re

from PIL import Image, ImageDraw

import kit
from artkit.resolve import Resolver

_R = None


def resolver():
    global _R
    if _R is None:
        _R = Resolver()
    return _R


def pairs(s):
    return {a or b: c for a, b, c in re.findall(r'(?:"([^"]+)"|(\w)):\s*"(\w+)"', s)}


def image(path):
    im = resolver().image(path)
    if im is None:
        return None
    return im if isinstance(im, Image.Image) else Image.fromarray(im, "RGBA")


def load(name, flags=None):
    """Parse a map module into rows of tile keys, with legendWhen applied for flags."""
    flags = flags or {}
    s = (kit.ROOT / "src/world/maps" / f"{name}.ts").read_text()
    build = (kit.ROOT / "src/world/build.ts").read_text()
    base = pairs(build.split("export const LEGEND")[1].split("};")[0])
    outdoor = dict(base, **{"@": "grass"})
    m = re.search(r'(?<![A-Za-z])legend: (LEGEND|OUTDOOR|\{[^}]*\})', s)
    spec = m.group(1)
    legend = dict(outdoor if "OUTDOOR" in spec else base)
    if spec.startswith("{"):
        legend.update(pairs(spec))
    whens = re.findall(r'when: when\(\{([^}]*)\}\), legend: \{([^}]*)\}', s.split("legendWhen:", 1)[1].split("],", 1)[0]) \
        if "legendWhen:" in s else []
    override = {}
    for cond, leg in whens:
        need = {k: v == "true" for k, v in re.findall(r'(\w+): (true|false)', cond)}
        if all(flags.get(k, False) == v for k, v in need.items()):
            override = {**pairs(leg), **override}   # first match wins
    legend.update(override)
    rows = re.findall(r'"([^"]+)"', s.split("tiles: [", 1)[1].split("],", 1)[0])
    border = re.search(r'border: "(\w+)"', s).group(1)
    keys = [[legend[c] for c in r] for r in rows]
    structures = [(k, int(x), int(y)) for k, x, y in
                  re.findall(r'key: "(\w+)", x: (\d+), y: (\d+)', s.split("structures: [", 1)[1].split("],", 1)[0])]
    npcs = []
    for line in s.split("npcs: [", 1)[1].split("\n  ],", 1)[0].split("\n"):
        for obj in re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', line):
            sp = re.search(r'sprite: "(\w+)"', obj)
            xy = re.search(r'x: (\d+), y: (\d+)', obj)
            if not sp or not xy:
                continue
            vis = re.search(r'visibleWhen: when\(\{([^}]*)\}\)', obj)
            if vis and not all(flags.get(k, False) == (v == "true") for k, v in re.findall(r'(\w+): (true|false)', vis.group(1))):
                continue
            npcs.append((sp.group(1), int(xy.group(1)), int(xy.group(2))))
    return keys, border, structures, npcs


def groups():
    """AUTOTILE from the contracts (multi-letter keys, so not pairs())."""
    src = (kit.ROOT / "src/contracts/constants.ts").read_text()
    body = src.split("export const AUTOTILE")[1].split("};")[0]
    body = re.sub(r"//[^\n]*", "", body)
    return dict(re.findall(r'(\w+):\s*"(\w+)"', body))


def render(name, centre, flags=None, frame=1, size=(10, 9)):
    keys, border, structures, npcs = load(name, flags)
    grp = groups()
    h, w = len(keys), max(map(len, keys))

    def key_at(x, y):
        return keys[y][x] if 0 <= y < h and 0 <= x < len(keys[y]) else border

    def need(path):
        im = image(path)
        if im is None:
            raise ValueError(f"{name}: missing {path}")
        return im

    sfx = "__2" if frame == 2 else ""
    left, top = centre[0] - 4, centre[1] - 4   # the game camera: player tile minus (4, 4)
    out = Image.new("RGBA", (size[0] * 16, size[1] * 16))
    for yy in range(size[1]):
        for xx in range(size[0]):
            x, y = left + xx, top + yy
            key = key_at(x, y)
            anim = image(f"assets/tiles/{key}__2.png") is not None
            path = None
            g = grp.get(key)
            if g:
                mask = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or grp.get(key_at(nx, ny)) == g:
                        mask |= bit
                if image(f"assets/tiles/{key}@{mask}.png") is not None:
                    path = f"assets/tiles/{key}@{mask}{sfx if anim and image(f'assets/tiles/{key}@{mask}__2.png') is not None else ''}.png"
            if path is None:
                alts = [n for n in (1, 2, 3) if image(f"assets/tiles/{key}~{n}.png") is not None
                        and (not anim or image(f"assets/tiles/{key}~{n}__2.png") is not None)]
                n = kit.pick_alt(x, y, alts)
                stem = f"{key}~{n}" if n else key
                path = f"assets/tiles/{stem}{sfx if anim else ''}.png"
            out.alpha_composite(need(path), (xx * 16, yy * 16))
    for key, x, y in structures:
        out.alpha_composite(need(f"assets/structures/{key}.png"), ((x - left) * 16, (y - top) * 16))
    for key, x, y in npcs:
        if left <= x < left + size[0] and top <= y < top + size[1]:
            out.alpha_composite(need(f"assets/characters/{key}.png").crop((0, 0, 16, 16)), ((x - left) * 16, (y - top) * 16))
    return out


def whole(name, flags=None):
    keys, *_ = load(name, flags)
    h, w = len(keys), max(map(len, keys))
    return render(name, (4, 4), flags, size=(w, h))


SPOTS = [
    ("route_12", (35, 27), {}, "Route 12: the eastern gorge"),
    ("route_12", (22, 18), {}, "Route 12: the middle root gap"),
    ("route_12", (9, 15), {}, "Route 12: the windswept terrace"),
    ("route_12", (5, 5), {}, "Route 12: the pits, the pond, the warden"),
    ("council_arboretum", (16, 4), {}, "Arboretum: the Grove Gate"),
    ("council_arboretum", (15, 13), {}, "Arboretum: the Council hall"),
    ("council_arboretum", (8, 20), {}, "Arboretum: the Greenhouse and gardens"),
    ("council_arboretum", (27, 21), {}, "Arboretum: the east lawn"),
    ("elder_grove_1", (6, 20), {}, "Ring 1: the root lane by the west gap"),
    ("elder_grove_1", (14, 5), {"bram_joined": True}, "Ring 1: SHEARS and BRAM"),
    ("elder_grove_2", (11, 20), {"grove_lean": False}, "Ring 2: the west lane open"),
    ("elder_grove_2", (11, 20), {"grove_lean": True}, "Ring 2: the trunks lean, the west lane shut"),
    ("elder_grove_2", (15, 5), {"bram_joined": True}, "Ring 2: CALLOWAY's listening clearing"),
    ("elder_grove_3", (21, 18), {}, "Ring 3: the grass and the east gap"),
    ("elder_grove_heart", (10, 10), {}, "The heart: MERCER at the Elder's trunk"),
    ("elder_grove_heart", (10, 10), {"centuryheart_planted": True}, "The heart: the Elder, after the planting"),
]


def review_maps():
    cols = 4
    cw, ch = 340, 318
    rows = (len(SPOTS) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw + 10, rows * ch + 10), "#202830")
    d = ImageDraw.Draw(sheet)
    for i, (name, centre, flags, label) in enumerate(SPOTS):
        x, y = 10 + (i % cols) * cw, 10 + (i // cols) * ch
        d.text((x, y), label, fill="#f0e8c8")
        im = render(name, centre, flags).resize((320, 288), Image.Resampling.NEAREST)
        sheet.alpha_composite(im, (x, y + 20))
    kit.save_png(kit.REVIEW / "ch10_maps_lead.png", sheet)
