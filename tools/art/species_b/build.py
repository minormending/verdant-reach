"""Species art B: hand-pixeled sprites for the pumpkin, fern, flytrap, sundew,
maple, nettle and moonflower lines (19 ids).

Each line module (pumpkin.py, fern.py, ...) defines SPRITES:
  id -> dict(pal=(dark, light), front=fn() -> Sprite, back=fn() -> Sprite,
             icon=[16 ASCII rows], icon2=optional rows or "squash"/"bob")
The photos in creature-sprites/photos/game/<line>/ and the old auto-traces
were the reference; every pixel here is authored (see pix.py).

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_b/build.py [ids...]
writes public/art/species/<id>/ bundles (artkit.emit.species) and the review
sheets tools/art/species_b/review/<line>.png + all.png.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(1, str(HERE.parent))  # artkit
import icons  # noqa: E402
import pix  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "art" / "species"  # bundles, written via artkit.emit
REVIEW = HERE / "review"

LINES = ["pumpkin", "fern", "flytrap", "sundew", "maple", "nettle", "moonflower"]
STAGE_SIZE = {"baby": 40, "teen": 48, "adult": 56}


def render(sid, spec):
    # front + optional battle idle frames (spec["idle"] = [fn, ...] -> front__2,
    # front__3), all placed with ONE shared offset so the registration holds
    fims = []
    for fn in [spec["front"]] + list(spec.get("idle", [])):
        f = fn()
        f.finish(**spec.get("front_finish", {}))
        fims.append(f.image())
    boxes = [im.getbbox() for im in fims]
    bb = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    print(f"  {sid:18s} front {bb[2]-bb[0]}x{bb[3]-bb[1]}")
    if bb[2] - bb[0] > 56 or bb[3] - bb[1] > 56:
        print("  !! front too big", sid)
    frames = [place_fixed(im.crop(bb), 56, spec.get("front_dx", 0)) for im in fims]
    front = frames[0]
    b = spec["back"]()
    b.finish(open_bottom=True, **spec.get("back_finish", {}))
    bim = b.image()
    # back: centred horizontally, cut by the bottom edge (drawn that way)
    bb = bim.getbbox()
    back = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    c = bim.crop((bb[0], bb[1], bb[2], min(bb[3], bb[1] + 48)))
    x = (48 - c.width) // 2 + spec.get("back_dx", 0)
    y = 48 - c.height if c.height < 48 else 0
    back.paste(c, (x, y), c)
    i1 = pix.icon_from_rows(icons.ICONS.get(sid, spec.get("icon")), spec["pal"])
    i2s = spec.get("icon2", "squash")
    if i2s == "squash":
        i2 = pix.squash(i1, spec.get("squash_row"))
    elif i2s == "bob":
        i2 = pix.bob(i1)
    else:
        i2 = pix.icon_from_rows(i2s, spec["pal"])
    out = dict(front=front, back=back, icon=i1, icon2=i2)
    for j, im in enumerate(frames[1:], 2):
        out[f"front__{j}"] = im
    for name, im in out.items():
        cols = {tuple(p) for p in np.asarray(im).reshape(-1, 4) if p[3]}
        assert len(cols) <= 4, (sid, name, cols)
    return out


def place_fixed(c, size, dx=0):
    """Bottom-centre an already-cropped frame (no re-crop: idle frames share it)."""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - c.width) // 2 + dx
    out.paste(c, (x, size - c.height), c)
    return out


def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def sheet(rows, path, z=4):
    """One species per row: front/back/icons at 4x on white, then the 1x set."""
    pad = 8
    items = [it for _, its in rows for it in its]
    W = pad + z * (56 + 48 + 16 + 16) + 4 * pad + (56 + 48 + 16 + 16 + 3 * 4) + pad
    ch = 12 + z * 56 + pad
    s = Image.new("RGBA", (W, pad + len(items) * ch), (232, 232, 224, 255))
    d = ImageDraw.Draw(s)
    for r, (sid, ims) in enumerate(items):
        y = pad + r * ch
        d.text((pad, y), sid, fill=(40, 40, 40, 255))
        xx = pad
        for k in ("front", "back", "icon", "icon2"):
            im = zoom(ims[k], z)
            box = Image.new("RGBA", im.size, (248, 248, 248, 255))
            box.alpha_composite(im)
            s.alpha_composite(box, (xx, y + 12))
            xx += im.width + pad
        for k in ("front", "back", "icon", "icon2"):
            im = ims[k]
            s.alpha_composite(im, (xx, y + 12 + z * 56 - im.height))
            xx += im.width + 4
    s.save(path)


def overview(rows, path):
    """All 19 at 2x: one line per row (fronts, backs, icons)."""
    z = 2
    pad = 8
    cw = z * (56 + 48 + 16 + 16) + 3 * 4 + pad
    W = pad + 3 * cw
    ch = z * 56 + 14
    s = Image.new("RGBA", (W, pad + len(rows) * ch), (248, 248, 248, 255))
    for r, (line, items) in enumerate(rows):
        for c, (sid, ims) in enumerate(items):
            xx = pad + c * cw
            y = pad + r * ch
            for k in ("front", "back", "icon", "icon2"):
                im = zoom(ims[k], z)
                s.alpha_composite(im, (xx, y + z * 56 - im.height))
                xx += im.width + 4
    s.save(path)


def main(only=None):
    REVIEW.mkdir(exist_ok=True)
    allrows = []
    for line in LINES:
        mod = importlib.import_module(line)
        items = []
        for sid, spec in mod.SPRITES.items():
            ims = render(sid, spec)
            items.append((sid, ims))
            if only and sid not in only and line not in only:
                continue
            from artkit import emit
            frames = {("icon__2" if k == "icon2" else k): v for k, v in ims.items()
                      if k in ("front", "front__2", "front__3", "back", "icon", "icon2")}
            emit.species(sid, frames, tool=f"tools/art/species_b/{line}.py")
            print("wrote", sid)
        allrows.append((line, items))
        sheet([(line, items)], REVIEW / f"{line}.png")
    overview(allrows, REVIEW / "all.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    dry = "--dry" in args
    args = [a for a in args if a != "--dry"]
    if dry:
        REVIEW.mkdir(exist_ok=True)
        for line in (args or LINES):
            mod = importlib.import_module(line)
            items = [(sid, render(sid, spec)) for sid, spec in mod.SPRITES.items()]
            sheet([(line, items)], REVIEW / f"{line}.png")
            print("review", line)
    else:
        main(set(args) or None)
