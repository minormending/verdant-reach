"""Review sheets for the species B wild lines (not part of the build).

  .venv/bin/python tools/art/species_b/view.py [line ...]

review/sil.png        every front as a solid silhouette, 1x and 3x (the thumbnail test)
review/<line>_x.png   the line side by side: front, idle frames, back, icons at 4x,
                      plus a GBC battle mock (foe front top-right, back bottom-left)
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

MINE = ["fern", "flytrap", "sundew", "maple", "nettle", "moonflower"]
BG = (248, 248, 248, 255)


def z(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def sil(im):
    a = np.asarray(im).copy()
    on = a[..., 3] > 0
    a[on] = (24, 24, 24, 255)
    return Image.fromarray(a, "RGBA")


def load(line):
    mod = importlib.import_module(line)
    importlib.reload(mod)
    return [(sid, build.render(sid, spec)) for sid, spec in mod.SPRITES.items()]


def line_sheet(line, items):
    k = 4
    pad = 8
    keys = ["front", "front__2", "front__3", "back", "icon", "icon2"]
    W = pad + sum(56 * k + pad for _ in range(3)) + 48 * k + pad + 2 * (16 * k + pad) + 160 * 2 + pad
    H = pad + len(items) * (56 * k + 14 + pad) + 6 * 16 * 2 + pad
    s = Image.new("RGBA", (W, H), (224, 224, 216, 255))
    d = ImageDraw.Draw(s)
    for r, (sid, ims) in enumerate(items):
        y = pad + r * (56 * k + 14 + pad)
        d.text((pad, y), sid, fill=(40, 40, 40, 255))
        x = pad
        for key in keys:
            im = ims.get(key)
            w = {"back": 48, "icon": 16, "icon2": 16}.get(key, 56)
            if im is not None:
                box = Image.new("RGBA", (im.width * k, im.height * k), BG)
                box.alpha_composite(z(im, k))
                s.alpha_composite(box, (x, y + 12))
            x += w * k + pad
        # battle mock at 2x
        bm = Image.new("RGBA", (160, 96), BG)
        bm.alpha_composite(ims["front"], (96, 4))
        bm.alpha_composite(ims["back"], (8, 96 - 48))
        s.alpha_composite(z(bm, 2), (x, y + 12))
    # the whole line at 1x and 2x, silhouettes too
    y = H - 6 * 16 * 2 - pad
    x = pad
    for sid, ims in items:
        s.alpha_composite(z(ims["front"], 2), (x, y))
        s.alpha_composite(z(sil(ims["front"]), 1), (x + 120, y))
        s.alpha_composite(ims["front"], (x + 120, y + 60))
        x += 200
    return s


def sil_sheet(all_items):
    k = 2
    pad = 6
    n = sum(len(v) for v in all_items.values())
    cols = 8
    rows = (n + cols - 1) // cols
    s = Image.new("RGBA", (pad + cols * (56 * k + 60 + pad), pad + rows * (56 * k + pad)), BG)
    i = 0
    for line, items in all_items.items():
        for sid, ims in items:
            c, r = i % cols, i // cols
            x, y = pad + c * (56 * k + 60 + pad), pad + r * (56 * k + pad)
            s.alpha_composite(z(sil(ims["front"]), k), (x, y))
            s.alpha_composite(sil(ims["front"]), (x + 56 * k + 2, y + 56 * k - 56))
            i += 1
    return s


if __name__ == "__main__":
    lines = sys.argv[1:] or MINE
    (HERE / "review").mkdir(exist_ok=True)
    allit = {}
    for line in lines:
        items = load(line)
        allit[line] = items
        line_sheet(line, items).save(HERE / "review" / f"{line}_x.png")
        print("sheet", line)
    sil_sheet(allit).save(HERE / "review" / "sil.png")
