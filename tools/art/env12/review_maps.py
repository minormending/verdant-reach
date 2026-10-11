"""Render the Chapter 11 Council rooms from their source rows and the shipped bundles.

Reads src/world/maps/council_seats.ts (each `Room` and the `seat(...)` call
that uses it), council_hall.ts and the fellowship room literally, applies the
run's flag swaps (the stair `N` is a wall until the seat is beaten; council_1's
`E` door closes for the run), and resolves tiles exactly like
src/overworld/autotile.ts: autotile masks with out-of-bounds counted as joined,
then the position-hashed ground alternates (animated tiles only take
alternates that have a frame 2). Unknown tiles or missing art fail loudly.
"""
from __future__ import annotations

import re

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
    return {a or b: c for a, b, c in re.findall(r'(?:"([^"]+)"|(\w)):\s*"(\w+)"', s)}


def base_legend():
    build = (kit.ROOT / "src/world/build.ts").read_text()
    return pairs(build.split("export const LEGEND")[1].split("};")[0])


def groups():
    """AUTOTILE from the contracts (multi-letter keys, so not pairs())."""
    src = (kit.ROOT / "src/contracts/constants.ts").read_text()
    body = re.sub(r"//[^\n]*", "", src.split("export const AUTOTILE")[1].split("};")[0])
    return dict(re.findall(r'(\w+):\s*"(\w+)"', body))


def seats():
    """{map id: (rows, legend, npcs, win flag)} for the seat rooms and the Keeper's hall."""
    s = (kit.ROOT / "src/world/maps/council_seats.ts").read_text()
    rooms = {}
    for name, body in re.findall(r"const (\w+): Room = \{(.*?)\n\};", s, re.S):
        legend = pairs(re.search(r"legend: \{([^}]*)\}", body).group(1))
        rows = re.findall(r'"([^"]+)"', body.split("tiles: [", 1)[1].split("]", 1)[0])
        rooms[name] = (rows, legend)
    out = {}
    for mid, npc, sprite, win, room in re.findall(
            r'export const \w+ = seat\("(\w+)", "[^"]*", "(\w+)", "(\w+)", "\w+", "(\w+)", (\w+)\)', s):
        rows, legend = rooms[room]
        x = len(rows[0]) // 2 - 1
        out[mid] = (rows, {**base_legend(), "N": "stairs_up", **legend}, [(sprite, x, 3)], win)
    return out


def load(name, flags):
    """Rows of tile keys (flag swaps applied), the border and the NPCs."""
    if name in ("council_1", "council_2", "council_3", "council_4", "keeper_hall"):
        rows, legend, npcs, win = seats()[name]
        legend = dict(legend)
        if not flags.get(win, False):
            legend["N"] = "wall"
        if name == "council_1" and flags.get("council_run", False):
            legend["E"] = "wall"
        return [[legend[c] for c in r] for r in rows], "void", npcs
    s = (kit.ROOT / "src/world/maps/council_seats.ts").read_text()
    if name == "fellowship_hall":
        body = s.split("export const fellowship_hall", 1)[1]
    else:
        body = (kit.ROOT / f"src/world/maps/{name}.ts").read_text()
    spec = re.search(r'legend: (\{[^}]*\})', body).group(1)
    legend = {**base_legend(), **pairs(spec.replace("...LEGEND", ""))}
    if name == "council_hall" and not flags.get("ch10_done", False):
        legend["N"] = "wall"
    rows = re.findall(r'"([^"]+)"', body.split("tiles: [", 1)[1].split("]", 1)[0])
    npcs = []
    for obj in re.findall(r"\{ id: [^{}]*?(?:\{[^{}]*\}[^{}]*)?\}", body.split("npcs: [", 1)[1].split("\n  ],", 1)[0]):
        sp, xy = re.search(r'sprite: "(\w+)"', obj), re.search(r"x: (\d+), y: (\d+)", obj)
        vis = re.search(r"visibleWhen: when\(\{([^}]*)\}\)", obj)
        if vis and not all(flags.get(k, False) == (v == "true") for k, v in re.findall(r"(\w+): (true|false)", vis.group(1))):
            continue
        npcs.append((sp.group(1), int(xy.group(1)), int(xy.group(2))))
    return [[legend[c] for c in r] for r in rows], "void", npcs


def render(name, centre, flags=None, frame=1, size=(10, 9)):
    keys, border, npcs = load(name, flags or {})
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
    for key, x, y in npcs:
        if left <= x < left + size[0] and top <= y < top + size[1]:
            out.alpha_composite(need(f"assets/characters/{key}.png").crop((0, 0, 16, 16)), ((x - left) * 16, (y - top) * 16))
    return out


def whole(name, flags=None):
    keys, *_ = load(name, flags or {})
    return render(name, (4, 4), flags, size=(max(map(len, keys)), len(keys)))


# One screen per room, from where the player stands to talk (or arrives).
SPOTS = [
    ("council_hall", (7, 4), {"ch10_done": True}, "COUNCIL HALL: the foyer, heal and market counters"),
    ("council_1", (5, 4), {"council_run": True, "beat_council_1": True}, "APOTHECARY: BELLADONNA (seat beaten)"),
    ("council_2", (5, 4), {"council_run": True}, "SLEEPER: MIMI OSA"),
    ("council_3", (5, 4), {"council_run": True}, "ROTTER: TITUS ARUM"),
    ("council_4", (5, 4), {"council_run": True}, "KINDLER: PYRA"),
    ("keeper_hall", (6, 4), {"council_run": True, "beat_keeper": True}, "KEEPER'S HALL: ROWAN (beaten)"),
    ("fellowship_hall", (4, 4), {"game_cleared": True}, "THE HERBARIUM: the ending"),
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
    kit.save_png(kit.REVIEW / "ch11_maps_lead.png", sheet)
