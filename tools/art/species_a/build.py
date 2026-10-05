"""Species art A: hand-built GBC sprites for the oak, chili, lily, dandelion,
bramble and sunflower lines (18 species).

Each species module (oak.py, chili.py, ...) defines, per species id,
front() -> 56x56, back() -> 48x48 and icon() -> 16x16 images. The photos in
creature-sprites/photos/game/<line>/ and the old traced sprites were the
reference; the art itself is constructed shape by shape (px.py) and then
hand-edited pixel by pixel, 4 colours + transparency, 1px #181818 outline,
light from the top-left.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_a/build.py [ids...]

Writes public/art/species/<id>/ bundles (artkit.emit.species) and the
review sheet tools/art/species_a/review.png (1x and 4x, one line per row).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(1, str(HERE.parent))  # artkit
ROOT = HERE.parents[2]
OUT = ROOT / "public" / "art" / "species"  # bundles, written via artkit.emit

import importlib  # noqa: E402

LINE_NAMES = ["oak", "chili", "lily", "dandelion", "bramble", "sunflower"]
SIZES = {"front": 56, "front__2": 56, "front__3": 56, "back": 48, "icon": 16, "icon__2": 16}


def check(id_, kind, im: Image.Image):
    assert im.size == (SIZES[kind],) * 2, (id_, kind, im.size)
    a = np.asarray(im)
    cols = {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3]}
    assert len(cols) <= 4, (id_, kind, len(cols))
    assert set(np.unique(a[..., 3])) <= {0, 255}


def build(only=None, lines=LINE_NAMES, write=True, out="review.png"):
    rows = []
    for name in lines:
        mod = importlib.import_module(name)
        row = []
        for id_ in mod.IDS:
            imgs = mod.make(id_)
            for kind, im in imgs.items():
                check(id_, kind, im)
            if write and (only is None or id_ in only):
                from artkit import emit
                emit.species(id_, imgs, tool=f"tools/art/species_a/{name}.py")
            row.append((id_, imgs))
        rows.append(row)
    sheet(rows, out)


def sheet(rows, out, bg=(236, 240, 228, 255)):
    Z = 4
    cellw = 56 * Z + 48 * Z + 16 * Z + 56 + 48 + 16 + 40
    cellh = 56 * Z + 22
    W = 3 * cellw + 20
    H = len(rows) * cellh + 10
    im = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(im)
    for r, row in enumerate(rows):
        for c, (id_, imgs) in enumerate(row):
            x = 10 + c * cellw
            y = 6 + r * cellh
            d.text((x, y), id_, fill=(40, 40, 40, 255))
            y += 12
            for k in ("front", "back"):
                z = imgs[k].resize((imgs[k].width * Z, imgs[k].height * Z), Image.NEAREST)
                im.alpha_composite(z, (x, y + 56 * Z - z.height))
                x += z.width + 4
            for k in ("icon", "icon__2"):
                z = imgs[k].resize((64, 64), Image.NEAREST)
                im.alpha_composite(z, (x, y + (0 if k == "icon" else 70)))
            x += 68
            for k in ("front", "back", "icon", "icon__2"):
                im.alpha_composite(imgs[k], (x, y + 56 * Z - imgs[k].height))
                x += imgs[k].width + 2
    im.save(HERE / out)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--preview":
        # draft a few lines without writing assets: --preview oak chili
        build(lines=args[1:], write=False, out="preview.png")
    else:
        build(set(args) or None)
