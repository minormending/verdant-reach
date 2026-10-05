"""Review images: a bundle preview (4x) and contact sheets per kind."""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

from . import bundles as B
from .core import ART
from .palette import rgb_of
from .resolve import Resolver
from .sheets import refs_of

BG = (232, 232, 224, 255)
INK = (40, 40, 40, 255)


def _img(a: np.ndarray) -> Image.Image:
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def zoom(a: np.ndarray | Image.Image, k: int) -> Image.Image:
    im = a if isinstance(a, Image.Image) else _img(a)
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def swatches(pal: list[str], k: int = 8) -> Image.Image:
    im = Image.new("RGBA", (len(pal) * k, k), BG)
    for i, h in enumerate(pal):
        im.paste(rgb_of(h) + (255,), (i * k, 0, i * k + k, k))
    return im


def grid(cells: list[tuple[str, Image.Image]], cols: int, pad: int = 6, label: bool = True) -> Image.Image:
    if not cells:
        return Image.new("RGBA", (64, 16), BG)
    cw = max(c.width for _, c in cells)
    ch = max(c.height for _, c in cells)
    lh = 12 if label else 0
    rows = -(-len(cells) // cols)
    sheet = Image.new("RGBA", (pad + cols * (cw + pad), pad + rows * (ch + lh + pad)), BG)
    d = ImageDraw.Draw(sheet)
    for i, (name, c) in enumerate(cells):
        x = pad + (i % cols) * (cw + pad)
        y = pad + (i // cols) * (ch + lh + pad)
        sheet.alpha_composite(c.convert("RGBA"), (x, y + lh))
        if label:
            d.text((x, y), name[: max(4, cw // 6)], fill=INK)
    return sheet


def stack(cells: list[tuple[str, Image.Image]], pad: int = 6) -> Image.Image:
    """Labelled images top to bottom, each row only as tall as it needs."""
    w = pad * 2 + max(max(c.width for _, c in cells), 64)
    h = pad + sum(c.height + 12 + pad for _, c in cells)
    sheet = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(sheet)
    y = pad
    for name, c in cells:
        d.text((pad, y), name, fill=INK)
        sheet.alpha_composite(c.convert("RGBA"), (pad, y + 12))
        y += c.height + 12 + pad
    return sheet


def row(parts: list[Image.Image], gap: int = 4) -> Image.Image:
    w = sum(p.width for p in parts) + gap * (len(parts) - 1)
    h = max(p.height for p in parts)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = 0
    for p in parts:
        im.alpha_composite(p.convert("RGBA"), (x, h - p.height))
        x += p.width + gap
    return im


def species_strip(b: B.Bundle, k: int, sport: bool = False) -> Image.Image:
    return row([zoom(b.frame(kind, sport), k) for kind in b.frame_kinds()])


def show(kind: str, id_: str, packs=(), k: int = 4) -> Image.Image:
    """The `art.py show` preview for one bundle."""
    b = B.load(kind, id_, ART, packs)
    if kind == "species":
        parts = [("palette", zoom(swatches(b.data["palette"]), k // 2 or 1)),
                 ("sport", zoom(swatches(b.data["sport"]), k // 2 or 1)),
                 ("frames", species_strip(b, k)), ("sport frames", species_strip(b, k, True))]
        return stack(parts)
    if kind == "tileset":
        sheet = b.image(b.data["sheet"])
        cells = [("sheet", zoom(sheet, k))]
        # autotile previews: a 4x4 of masks per masked key
        for key, e in b.data["tiles"].items():
            if e.get("masks"):
                g = Image.new("RGBA", (4 * 17, 4 * 17), (255, 0, 255, 255))
                r = Resolver(packs=packs)
                for m in range(16):
                    a = r.image(f"assets/tiles/{key}@{m}.png")
                    if a is None:
                        a = r.image(f"assets/tiles/{key}.png")
                    g.paste(_img(a), ((m % 4) * 17, (m // 4) * 17))
                cells.append((f"{key} masks", zoom(g, max(1, k // 2))))
        return stack(cells)
    if kind == "set":
        return grid([(n, zoom(b.image(e["file"]), k if e["size"][0] <= 64 else max(1, k // 2)))
                     for n, e in b.data["images"].items()], 6)
    f = b.data.get("image") or b.data.get("sheet")
    return grid([(id_, zoom(b.image(f), k))], 1)


def contact(kind: str, packs=(), k: int = 2) -> Image.Image:
    """One review sheet for every bundle of a kind."""
    ids = B.list_ids(kind)
    for pk in packs:
        ids = sorted(set(ids) | set(B.list_ids(kind, ART / "packs" / pk)))
    if kind == "species":
        cells = []
        for sid in ids:
            b = B.load("species", sid, ART, packs)
            cells.append((sid, row([species_strip(b, k), species_strip(b, 1, True)], 8)))
        return grid(cells, 3)
    if kind == "tileset":
        cells = []
        for ts in ids:
            b = B.load("tileset", ts, ART, packs)
            sheet = b.image(b.data["sheet"])
            for key, e in b.data["tiles"].items():
                parts = []
                for kd, n, f, c in refs_of(e):
                    if kd != "mask" or n == 15 or n == 0:
                        x, y = (c % b.data["columns"]) * 16, (c // b.data["columns"]) * 16
                        parts.append(zoom(sheet[y:y + 16, x:x + 16], k))
                cells.append((f"{ts}/{key}", row(parts[:8], 2)))
        return grid(cells, 4)
    cells = []
    for i in ids:
        b = B.load(kind, i, ART, packs)
        if kind == "set":
            for n, e in b.data["images"].items():
                cells.append((f"{i}/{n}", zoom(b.image(e["file"]), k if e["size"][0] <= 64 else 1)))
        else:
            cells.append((i, zoom(b.image(b.data.get("image") or b.data.get("sheet")), k)))
    return grid(cells, 6 if kind != "structure" else 4)


def contact_one(kind: str, id_: str, packs=(), k: int = 2) -> Image.Image:
    """A compact thumbnail of one bundle (used for base-vs-pack comparisons)."""
    try:
        b = B.load(kind, id_, ART, packs)
    except FileNotFoundError:
        return Image.new("RGBA", (16, 16), (255, 0, 255, 255))
    if kind == "species":
        return row([species_strip(b, k), species_strip(b, 1, True)], 8)
    if kind == "tileset":
        return zoom(b.image(b.data["sheet"]), k)
    if kind == "set":
        return row([zoom(b.image(e["file"]), k) for e in b.data["images"].values()], 4)
    return zoom(b.image(b.data.get("image") or b.data.get("sheet")), k)
