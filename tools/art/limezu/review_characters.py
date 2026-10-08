"""R4 local review: all composed frames at 3x and an authored HOME view."""
import math
import re

from PIL import Image, ImageDraw
from build_pack import HERE, ROOT, PACK
from limezu.characters import mappings
from review_render import guarded_review
from limezu.gen_props import prop_specs
from artkit.resolve import Resolver


def home_render():
    """Render authored HOME geometry with runtime masks, feet and prop sorting.

    No server/browser needed: restricted workers can still produce the review.
    This parser is deliberately limited to HOME's literal map definition.
    """
    source = (ROOT / "src/world/maps/player_home.ts").read_text()
    shared = (ROOT / "src/world/build.ts").read_text().split("export const LEGEND", 1)[1].split("};", 1)[0]
    legend = dict(re.findall(r'"([^"\n]+)": "([a-z0-9_]+)"', shared))
    rows = re.findall(r'"([^"\n]+)"', source.split("tiles: [", 1)[1].split("],", 1)[0])
    groups_source = (ROOT / "src/contracts/constants.ts").read_text().split("export const AUTOTILE", 1)[1].split("};", 1)[0]
    groups = dict(re.findall(r'(\w+): "(\w+)"', groups_source))
    keys = [[legend[c] for c in row] for row in rows]
    width, height = len(rows[0]), len(rows)
    if any(len(row) != width for row in rows):
        raise ValueError("HOME review needs rectangular literal rows")
    resolver = Resolver(packs=["limezu"])
    base = Resolver()
    def image(path):
        pixels = resolver.image(path)
        if pixels is None:
            # The Python resolver replaces a whole tileset; the runtime keeps
            # unmapped keys on their base sheet (HOME's exit mat, for example).
            pixels = base.image(path)
        if pixels is None:
            raise ValueError(f"missing review art: {path}")
        return Image.fromarray(pixels)
    def key_at(x, y):
        return keys[y][x] if 0 <= x < width and 0 <= y < height else "void"
    def pos_hash(x, y, salt=0):
        h = (x * 374761393 + y * 668265263 + salt * 1013904223) & 0xffffffff
        h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
        return h ^ (h >> 16)
    def choose(x, y, alts, salt=0):
        r = pos_hash(x, y, salt) % (len(alts) + 2)
        return 0 if r < 2 else alts[r - 2]
    canvas = Image.new("RGBA", (320, 180), "black")
    ox, oy = (320 - width * 16) // 2, (180 - height * 16) // 2
    for y in range(height):
        for x in range(width):
            key = key_at(x, y)
            stem = key
            group = groups.get(key)
            if group:
                mask = (1 if key_at(x, y - 1) == "wall_face" else 0) if key == "wall_face" else sum(
                    bit for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0))
                    if not (0 <= x + dx < width and 0 <= y + dy < height) or groups.get(key_at(x + dx, y + dy)) == group)
                candidate = f"{key}@{mask}"
                if resolver.image(f"assets/tiles/{candidate}.png") is not None:
                    stem = candidate
            if stem == key:
                alts = [n for n in (1, 2, 3) if resolver.image(f"assets/tiles/{key}~{n}.png") is not None]
                alt = choose(x, y, alts)
                if alt and alt == choose(x - 1, y, alts):
                    alt = choose(x, y, alts, 7)
                if alt:
                    stem += f"~{alt}"
            canvas.alpha_composite(image(f"assets/tiles/{stem}.png"), (ox + x * 16, oy + y * 16))
    specs, items = prop_specs(), []
    structures = re.findall(r'key: "(\w+)", x: (\d+), y: (\d+)', source.split("structures: [", 1)[1].split("],", 1)[0])
    for key, sx, sy in structures:
        x, y = int(sx), int(sy)
        spec = specs[key]
        img = image(f"assets/structures/{key}.png")
        position = (ox + x * 16, oy + y * 16)
        if spec.get("layer") == "floor":
            canvas.alpha_composite(img, position)
        else:
            fp = spec.get("footprint", {"y": 0, "h": spec["h"]})
            items.append(((y + fp["y"] + fp["h"]) * 16, 0, img, position))
    actors = re.findall(r'sprite: "(\w+)", x: (\d+), y: (\d+), facing: "(\w+)"', source.split("npcs: [", 1)[1].split("],", 1)[0])
    if not actors:
        raise ValueError("HOME review did not parse its NPC")
    for key, sx, sy, facing in [("player", "5", "4", "down"), *actors]:
        x, y = int(sx), int(sy)
        fw, fh = resolver.bundle("character", key).data["frame"]
        row = ("down", "up", "left", "right").index(facing)
        img = image(f"assets/characters/{key}.png").crop((0, row * fh, fw, (row + 1) * fh))
        items.append(((y + 1) * 16, 1, img, (ox + x * 16, oy + (y + 1) * 16 - fh)))
    for _, _, img, position in sorted(items, key=lambda item: item[:2]):
        canvas.alpha_composite(img, position)
    return canvas


def render():
    destination = HERE / "review/r4.png"
    guarded_review(destination)
    keys = sorted(mappings())
    cell_w, cell_h = 340, 138
    canvas = Image.new("RGBA", (cell_w * 3, 236 + math.ceil(len(keys) / 3) * cell_h), "#232b31")
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 8), "R4 Character Generator: 3x frames; authored HOME at 320x180 (1x)", fill="white")
    canvas.alpha_composite(home_render(), (10, 28))
    labels = ("down", "up", "left", "right", "stepA", "stepB")
    cells = ((0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (2, 0))
    for i, key in enumerate(keys):
        x, y = (i % 3) * cell_w + 10, 236 + (i // 3) * cell_h
        draw.text((x, y), key, fill="white")
        with Image.open(PACK / f"characters/{key}/sheet.png") as sheet:
            for n, ((col, row), label) in enumerate(zip(cells, labels)):
                image = sheet.crop((col * 16, row * 32, col * 16 + 16, row * 32 + 32))
                canvas.alpha_composite(image.resize((48, 96), Image.Resampling.NEAREST), (x + n * 54, y + 18))
                draw.text((x + n * 54, y + 116), label, fill="#c6dbb9")
    destination.parent.mkdir(exist_ok=True)
    canvas.convert("RGB").save(destination)
    print(destination.relative_to(ROOT))


if __name__ == "__main__":
    render()
