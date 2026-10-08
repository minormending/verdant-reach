"""Render the Root Relay floors from their source rows and the shipped bundles.

Reads src/world/maps/<id>.ts literally (rows, legend, legendWhen, border,
structures, NPCs) and resolves tiles exactly like src/overworld/autotile.ts:
autotile masks with out-of-bounds counted as joined, then the position-hashed
ground alternates (animated tiles only take alternates that have a frame 2).
Beyond the map edge it draws the map's border tile, as the game camera does.
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


def _holds(cond, flags):
    return all(flags.get(k, False) == (v == "true") for k, v in re.findall(r'(\w+): (true|false)', cond))


def load(name, flags=None):
    """Parse a map module into rows of tile keys, with legendWhen applied for flags."""
    flags = flags or {}
    s = (kit.ROOT / "src/world/maps" / f"{name}.ts").read_text()
    build = (kit.ROOT / "src/world/build.ts").read_text()
    base = pairs(build.split("export const LEGEND")[1].split("};")[0])
    m = re.search(r'(?<![A-Za-z])legend: (LEGEND|OUTDOOR|\{[^}]*\})', s)
    spec = m.group(1)
    legend = dict(base, **{"@": "grass"}) if "OUTDOOR" in spec else dict(base)
    if spec.startswith("{"):
        legend.update(pairs(spec))
    whens = re.findall(r'when: when\(\{([^}]*)\}\), legend: \{([^}]*)\}', s.split("legendWhen:", 1)[1].split("\n  ],", 1)[0]) \
        if "legendWhen:" in s else []
    override = {}
    for cond, leg in whens:
        if _holds(cond, flags):
            override = {**pairs(leg), **override}   # first match wins, as refreshLegend
    legend.update(override)
    rows = re.findall(r'"([^"]+)"', s.split("tiles: [", 1)[1].split("],", 1)[0])
    border = re.search(r'border: "(\w+)"', s).group(1)
    keys = [[legend[c] for c in r] for r in rows]
    structures = [(k, int(x), int(y)) for k, x, y in
                  re.findall(r'key: "(\w+)", x: (\d+), y: (\d+)', s.split("structures: [", 1)[1].split("],", 1)[0])]
    npcs = []
    block = s.split("npcs: [", 1)[1].split("\n  ],", 1)[0]
    for obj in re.split(r'\n\s*(?=\{ id:)', block):
        sp = re.search(r'sprite: "(\w+)"', obj)
        xy = re.search(r'x: (\d+), y: (\d+)', obj)
        if not sp or not xy:
            continue
        vis = re.search(r'visibleWhen: when\(\{([^}]*)\}\)', obj)
        if vis and not _holds(vis.group(1), flags):
            continue
        face = re.search(r'facing: "(\w+)"', obj)
        npcs.append((sp.group(1), int(xy.group(1)), int(xy.group(2)), face.group(1) if face else "down"))
    return keys, border, structures, npcs


def groups():
    src = (kit.ROOT / "src/contracts/constants.ts").read_text()
    return pairs(src.split("export const AUTOTILE")[1].split("};")[0])


ROW = {"down": 0, "up": 1, "left": 2, "right": 3}


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
    for key, x, y, facing in npcs:
        if left <= x < left + size[0] and top <= y < top + size[1]:
            r = ROW[facing] * 16
            out.alpha_composite(need(f"assets/characters/{key}.png").crop((0, r, 16, r + 16)), ((x - left) * 16, (y - top) * 16))
    return out


def whole(name, flags=None):
    keys, *_ = load(name, flags)
    h, w = len(keys), max(map(len, keys))
    return render(name, (4, 4), flags, size=(w, h))


TAKEOVER = {"ch8_started": True, "got_keycard": True, "ch8_takeover": True, "ch8_bram_met": True}
SPOTS = [
    ("relay_2f", (7, 4), TAKEOVER, "2F SERVER HALL: racks, cable lanes, the work note"),
    ("relay_3f", (8, 4), TAKEOVER, "3F PATCH BAY: consoles A, B, C"),
    ("relay_roof", (3, 7), TAKEOVER, "RELAY ROOF: WREN at the mast, the dome beyond"),
    ("glasshouse_relay", (8, 8), TAKEOVER, "1F lobby during the takeover (banners)"),
]


def review_maps():
    cols = 2
    cw, ch = 340, 318
    rows = (len(SPOTS) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw + 10, rows * ch + 10), "#202830")
    d = ImageDraw.Draw(sheet)
    for i, (name, centre, flags, label) in enumerate(SPOTS):
        x, y = 10 + (i % cols) * cw, 10 + (i // cols) * ch
        d.text((x, y), label, fill="#f0e8c8")
        im = render(name, centre, flags).resize((320, 288), Image.Resampling.NEAREST)
        sheet.alpha_composite(im, (x, y + 20))
    kit.save_png(kit.REVIEW / "ch8_maps_lead.png", sheet)
