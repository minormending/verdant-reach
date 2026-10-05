"""Species art C: hand-built GBC creature sprites for the four new lines
(round 3): clover, cattail, foxglove and holly (8 ids).

Each line module (clover.py, cattail.py, foxglove.py, holly.py) defines
IDS and make(id) -> {kind: Image} with kinds front, front__2[, front__3],
back, icon, icon__2. Shapes are constructed with px.py (a private copy of
species_a's kit, so other artists' edits never change these sprites) and
then hand-edited; 4 colours + transparency, 1px #181818 outline with
selout, light from the top-left. Reference: Wikipedia/Wikimedia Commons
photos of Trifolium repens, Typha latifolia, Digitalis purpurea and Ilex
aquifolium.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_c/build.py [ids|lines...]
  ... build.py --preview [lines...]     review sheets only, no assets written

Writes public/assets/species/<id>/*.png and tools/art/species_c/review/
(<line>.png, all.png, roster.png = these fronts beside the whole roster,
silhouettes.png, anim.png).
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[2]
OUT = ROOT / "public" / "assets" / "species"
REVIEW = HERE / "review"

LINES = ["clover", "cattail", "foxglove", "holly"]
SIZES = {"front": 56, "front__2": 56, "front__3": 56, "back": 48, "icon": 16, "icon__2": 16}
BG = (236, 240, 228, 255)


def check(id_, imgs):
    pal = None
    for kind, im in imgs.items():
        assert im.size == (SIZES[kind],) * 2, (id_, kind, im.size)
        a = np.asarray(im)
        assert set(np.unique(a[..., 3])) <= {0, 255}, (id_, kind)
        cols = {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3]}
        assert len(cols) <= 4, (id_, kind, cols)
        assert (24, 24, 24) in cols, (id_, kind, "no #181818")
        pal = cols if pal is None else pal | cols
    assert len(pal) <= 4, (id_, "frames disagree on palette", pal)


def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def line_sheet(items, path, z=4):
    """One species per row: front frames, back, icons at 4x, then 1x."""
    pad = 8
    W = pad + z * (56 * 3 + 48) + 4 * pad + 64 + 8 + 56 + 48 + 40 + pad
    ch = 14 + z * 56 + pad
    s = Image.new("RGBA", (W, pad + len(items) * ch), BG)
    d = ImageDraw.Draw(s)
    for r, (sid, ims) in enumerate(items):
        y = pad + r * ch
        d.text((pad, y), sid, fill=(40, 40, 40, 255))
        y += 14
        x = pad
        for k in ("front", "front__2", "front__3", "back"):
            if k not in ims:
                x += z * 56 + pad
                continue
            im = zoom(ims[k], z)
            box = Image.new("RGBA", im.size, (248, 248, 240, 255))
            box.alpha_composite(im)
            s.alpha_composite(box, (x, y + z * 56 - im.height))
            x += im.width + pad
        s.alpha_composite(zoom(ims["icon"], 4), (x, y))
        s.alpha_composite(zoom(ims["icon__2"], 4), (x, y + 72))
        x += 64 + 8
        for k in ("front", "back", "icon", "icon__2"):
            s.alpha_composite(ims[k], (x, y + z * 56 - ims[k].height))
            x += ims[k].width + 4
    s.save(path)


def roster_sheet(mine, path, z=2):
    """Every species front at 2x on one sheet: the existing roster first,
    ours (outlined in red) after, so they can be judged as one game."""
    others = sorted(p.name for p in OUT.iterdir() if p.is_dir() and p.name not in mine)
    ids = others + list(mine)
    cols = 9
    cw = 56 * z + 6
    rows = (len(ids) + cols - 1) // cols
    s = Image.new("RGBA", (6 + cols * cw, 6 + rows * cw), (248, 248, 248, 255))
    d = ImageDraw.Draw(s)
    for i, sid in enumerate(ids):
        x, y = 6 + (i % cols) * cw, 6 + (i // cols) * cw
        im = mine[sid] if sid in mine else Image.open(OUT / sid / "front.png").convert("RGBA")
        s.alpha_composite(zoom(im, z), (x, y))
        if sid in mine:
            d.rectangle((x - 2, y - 2, x + 56 * z + 1, y + 56 * z + 1), outline=(220, 60, 60, 255))
    s.save(path)
    # silhouettes at 1x and 2x: each must read as a solid shape
    sil = Image.new("RGBA", s.size, (248, 248, 248, 255))
    for i, sid in enumerate(ids):
        x, y = 6 + (i % cols) * cw, 6 + (i // cols) * cw
        im = mine[sid] if sid in mine else Image.open(OUT / sid / "front.png").convert("RGBA")
        a = np.asarray(im).copy()
        a[a[..., 3] > 0] = (24, 24, 24, 255)
        sil.alpha_composite(zoom(Image.fromarray(a), z), (x, y))
    sil.save(path.parent / "silhouettes.png")


def anim_sheet(items, path, z=4):
    """front -> front__2 [-> front__3] and a difference map per species."""
    rows = [(sid, ims) for sid, ims in items]
    W = 8 + 4 * (56 * z + 8)
    s = Image.new("RGBA", (W, 8 + len(rows) * (56 * z + 8)), BG)
    for r, (sid, ims) in enumerate(rows):
        y = 8 + r * (56 * z + 8)
        frames = [ims[k] for k in ("front", "front__2", "front__3") if k in ims]
        for i, f in enumerate(frames):
            s.alpha_composite(zoom(f, z), (8 + i * (56 * z + 8), y))
        a0 = np.asarray(frames[0]).astype(int)
        diff = np.zeros((56, 56, 4), np.uint8)
        for f in frames[1:]:
            a1 = np.asarray(f).astype(int)
            ch = (np.abs(a0 - a1).sum(-1) > 0)
            diff[ch] = (220, 60, 60, 255)
        base = frames[0].copy()
        base.alpha_composite(Image.fromarray(diff))
        s.alpha_composite(zoom(base, z), (8 + 3 * (56 * z + 8), y))
    s.save(path)


def build(only=None, lines=LINES, write=True):
    REVIEW.mkdir(exist_ok=True)
    allitems = []
    for name in lines:
        mod = importlib.import_module(name)
        items = []
        for id_ in mod.IDS:
            imgs = mod.make(id_)
            check(id_, imgs)
            items.append((id_, imgs))
            if write and (only is None or id_ in only or name in only):
                d = OUT / id_
                d.mkdir(parents=True, exist_ok=True)
                for kind, im in imgs.items():
                    im.save(d / f"{kind}.png")
                for stale in set(SIZES) - set(imgs):
                    if (d / f"{stale}.png").exists():
                        (d / f"{stale}.png").unlink()
                print("wrote", id_, sorted(imgs))
        line_sheet(items, REVIEW / f"{name}.png")
        allitems += items
    if lines == LINES:
        line_sheet(allitems, REVIEW / "all.png", z=3)
        roster_sheet({sid: ims["front"] for sid, ims in allitems}, REVIEW / "roster.png")
        anim_sheet(allitems, REVIEW / "anim.png", z=3)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--preview":
        build(lines=args[1:] or LINES, write=False)
    else:
        build(set(args) or None)
