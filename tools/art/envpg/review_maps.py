"""Render the post-game maps from their source rows and the shipped bundles.

Reads src/world/maps/seed_vault.ts (one `export const <id>: MapDef` block per
map) and route_9.ts literally: rows, legend, legendWhen, border, structures
and NPCs (item pickups included). Tiles resolve exactly like
src/overworld/autotile.ts: autotile masks with out-of-bounds counted as
joined, then the position-hashed ground alternates (animated tiles only take
alternates that have a frame 2). NPCs stand 4px above their tile, as in the
game. The screens can be lit like the game: a dark map under the FOXFIRE
LANTERN (src/overworld/glowRender.ts: the 2x2 world-anchored dither), and the
night tint of outdoor maps (src/overworld/lights.ts drawTint). Unknown tiles
or missing art fail loudly instead of inventing scenery.
"""
from __future__ import annotations

import re

import numpy as np
from PIL import Image, ImageDraw

import kit
from artkit.resolve import Resolver

_R = None


def image(path):
    global _R
    if _R is None:
        _R = Resolver()
    im = _R.image(path)
    if im is None:
        return None
    return im if isinstance(im, Image.Image) else Image.fromarray(im, "RGBA")


def pairs(s):
    return {a or b: c for a, b, c in re.findall(r'(?:"([^"]+)"|([^\s{},"]))\s*:\s*"(\w+)"', s)}


def base_legend():
    build = (kit.ROOT / "src/world/build.ts").read_text()
    return pairs(build.split("export const LEGEND")[1].split("};")[0])


def block(name):
    """The source text of one map definition."""
    if name == "route_9":
        return (kit.ROOT / "src/world/maps/route_9.ts").read_text()
    s = (kit.ROOT / "src/world/maps/seed_vault.ts").read_text()
    start = s.index(f"export const {name}: MapDef")
    end = s.find("export const ", start + 10)
    return s[start:end if end > 0 else len(s)]


def holds(cond, flags):
    return all(flags.get(k, False) == (v == "true") for k, v in re.findall(r'(\w+): (true|false)', cond))


def load(name, flags=None):
    """Rows of tile keys (legendWhen applied for flags), border, structures, NPCs."""
    flags = flags or {}
    s = block(name)
    base = base_legend()
    spec = re.search(r'(?<![A-Za-z])legend: (LEGEND|OUTDOOR|\{[^}]*\})', s).group(1)
    legend = dict(base, **({"@": "grass"} if "OUTDOOR" in spec else {}))
    if spec.startswith("{"):
        if "...OUTDOOR" in spec:
            legend["@"] = "grass"
        legend.update(pairs(spec.replace("...LEGEND", "").replace("...OUTDOOR", "")))
    if "legendWhen:" in s:
        body = s.split("legendWhen:", 1)[1].split("tiles: [", 1)[0]
        override = {}
        for cond, leg in re.findall(r'when: when\(\{([^}]*)\}\), legend: \{([^}]*)\}', body):
            if holds(cond, flags):
                override = {**pairs(leg), **override}   # first match wins
        legend.update(override)
    rows = re.findall(r'"([^"]+)"', s.split("tiles: [", 1)[1].split("]", 1)[0])
    border = re.search(r'border: "(\w+)"', s).group(1)
    keys = [[legend[c] for c in r] for r in rows]
    st = s.split("structures: [", 1)[1].split("]", 1)[0]
    structures = [(k, int(x), int(y)) for k, x, y in re.findall(r'key: "(\w+)", x: (\d+), y: (\d+)', st)]
    npcs = []
    npc_src = s.split("npcs:", 1)[1].split("signs:", 1)[0]
    pick_vis = re.search(r'\.map\(\(n\) => \(\{ \.\.\.n, visibleWhen: when\(\{([^}]*)\}\)', npc_src)
    for item, x, y in re.findall(r'\{ item: "(\w+)", x: (\d+), y: (\d+)', npc_src):
        if not pick_vis or holds(pick_vis.group(1), flags):
            npcs.append(("item_pickup", int(x), int(y)))
    for obj in re.findall(r'\{ id: [^{}]*?(?:\{[^{}]*\}[^{}]*)*?\}(?=\s*[,\]])', npc_src, re.S):
        sp, xy = re.search(r'sprite: "(\w+)"', obj), re.search(r"x: (\d+), y: (\d+)", obj)
        if not sp or not xy:
            continue
        vis = re.search(r"visibleWhen: when\(\{([^}]*)\}\)", obj)
        if vis and not holds(vis.group(1), flags):
            continue
        npcs.append((sp.group(1), int(xy.group(1)), int(xy.group(2))))
    return keys, border, structures, npcs


def groups():
    """AUTOTILE from the contracts."""
    src = (kit.ROOT / "src/contracts/constants.ts").read_text()
    body = re.sub(r"//[^\n]*", "", src.split("export const AUTOTILE")[1].split("};")[0])
    return dict(re.findall(r'(\w+):\s*"(\w+)"', body))


def render(name, centre, flags=None, frame=1, size=(10, 9), player=False):
    keys, border, structures, npcs = load(name, flags)
    if player:
        npcs = npcs + [("player", centre[0], centre[1])]
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
    for key, x, y in sorted(npcs, key=lambda n: n[2]):
        if left - 1 <= x <= left + size[0] and top - 1 <= y <= top + size[1]:
            out.alpha_composite(need(f"assets/characters/{key}.png").crop((0, 0, 16, 16)),
                                ((x - left) * 16, (y - top) * 16 - 4))
    return out


def lantern(im, centre, size=(10, 9)):
    """The FOXFIRE LANTERN on a dark map: radius 3 round the player, the
    game's banded 2x2 world-anchored dither, black elsewhere."""
    left, top = centre[0] - 4, centre[1] - 4
    a = np.asarray(im).copy()
    r2 = 9
    for sy in range(size[1] * 16):
        wy = sy + top * 16
        for sx in range(size[0] * 16):
            wx = sx + left * 16
            tx, ty = (wx + 0.5) / 16 - 0.5, (wy + 0.5) / 16 - 0.5
            d2 = (tx - centre[0]) ** 2 + (ty - centre[1]) ** 2
            band = 0 if d2 <= r2 / 9 else 1 if d2 <= r2 * 4 / 9 else 2 if d2 <= r2 else 3
            ex, ey = wx % 2 == 0, wy % 2 == 0
            if band == 3 or (band == 1 and ex and ey) or (band == 2 and (ex or ey)):
                a[sy, sx] = (0, 0, 0, 255)
    return Image.fromarray(a, "RGBA")


def night(im):
    """drawTint(night): multiply by #6070c0, then screen rgba(16,24,64,0.35)."""
    a = np.asarray(im).astype(np.float64)
    rgb = a[:, :, :3] * np.array([0x60, 0x70, 0xc0]) / 255
    lift = np.array([16, 24, 64]) * 0.35
    rgb = rgb + lift - rgb * lift / 255
    out = a.copy()
    out[:, :, :3] = np.clip(np.rint(rgb), 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def whole(name, flags=None):
    keys, *_ = load(name, flags)
    h, w = len(keys), max(map(len, keys))
    return render(name, (4, 4), flags, size=(w, h))


SPOTS = [
    ("route_9", (6, 4), {"game_cleared": True}, "", "ROUTE 9: the vault portal (game cleared)"),
    ("route_9", (6, 4), {"game_cleared": False}, "", "ROUTE 9: the same rock before the clear"),
    ("seed_vault_entrance", (6, 6), {"game_cleared": True, "diary_read": True}, "", "SEED VAULT: the vestibule"),
    ("seed_vault_b1", (11, 16), {"game_cleared": True}, "lantern", "B1: the frozen hall, by the lantern"),
    ("seed_vault_b1", (12, 10), {"game_cleared": True}, "lantern", "B1: an ice crossing, by the lantern"),
    ("seed_vault_b2", (11, 10), {"game_cleared": True}, "", "B2: the pits and the root gap"),
    ("seed_vault_b2", (19, 4), {"game_cleared": True}, "", "B2: the collapsed east hall"),
    ("seed_vault_b3", (7, 4), {"game_cleared": True}, "", "B3: the FROZEN ARCHIVE, the diary"),
    ("seed_vault_b3", (7, 9), {"game_cleared": True}, "", "B3: the racks"),
    ("methuselah_ridge", (7, 4), {"game_cleared": True, "diary_read": True}, "night", "METHUSELAH RIDGE by night"),
    ("methuselah_ridge", (7, 4), {"game_cleared": True, "diary_read": True}, "", "METHUSELAH RIDGE by day"),
    ("methuselah_ridge", (7, 12), {"game_cleared": True, "diary_read": True}, "", "The ridge: arriving from the vault"),
]


def review_maps(out_name="pg_maps_lead.png"):
    cols = 4
    cw, ch = 340, 318
    rows = (len(SPOTS) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw + 10, rows * ch + 10), "#202830")
    d = ImageDraw.Draw(sheet)
    for i, (name, centre, flags, light, label) in enumerate(SPOTS):
        x, y = 10 + (i % cols) * cw, 10 + (i // cols) * ch
        d.text((x, y), label, fill="#f0e8c8")
        im = render(name, centre, flags, player=True)
        if light == "lantern":
            im = lantern(im, centre)
        elif light == "night":
            im = night(im)
        sheet.alpha_composite(im.resize((320, 288), Image.Resampling.NEAREST), (x, y + 20))
    kit.save_png(kit.REVIEW / out_name, sheet)
