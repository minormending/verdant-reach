"""Species art D: hand-built GBC sprites for the mint, wild rose, pitcher
plant and snapdragon lines (8 ids, all 2-stage).

Each line module (mint.py, rose.py, pitcher.py, snapdragon.py) defines
SPRITES: id -> dict(
    pal=(dark, mid, light),           # + #181818 = the 4 GBC colours
    front=fn(ph) -> Sprite,           # drawn straight onto 56x56, ph = idle phase 0..2
    frames=2 | 3,                     # idle frames (front, front__2[, front__3])
    back=fn() -> Sprite,              # drawn straight onto 48x48, cut by the bottom edge
    icon=[16 rows], icon2=[16 rows],  # 16x16 ASCII icons, 2 frames
)
Reference photos (Wikimedia Commons: Mentha x piperita, Rosa canina,
Sarracenia leucophylla, Antirrhinum majus) set the botany; every shape is
authored here (kit.py), then hand pixels.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_d/build.py [ids...]
  ... build.py --preview [ids...]   (review sheets only, no assets written)

Writes public/assets/species/<id>/{front,front__2[,front__3],back,icon,icon__2}.png
and the review sheets in tools/art/species_d/review/.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import kit  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "assets" / "species"
REVIEW = HERE / "review"
LINES = ["mint", "rose", "pitcher", "snapdragon"]


def check(sid, kind, im, size):
    assert im.size == (size, size), (sid, kind, im.size)
    a = np.asarray(im)
    cols = {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3]}
    assert len(cols) <= 4, (sid, kind, cols)
    assert set(np.unique(a[..., 3])) <= {0, 255}, (sid, kind)


def render(sid, spec):
    out = {}
    names = ["front", "front__2", "front__3"][:spec.get("frames", 2)]
    for ph, name in enumerate(names):
        s = spec["front"](ph)
        assert (s.w, s.h) == (56, 56)
        s.finish(**spec.get("front_finish", {}))
        out[name] = s.image()
    b = spec["back"]()
    assert (b.w, b.h) == (48, 48)
    b.finish(open_bottom=True, **spec.get("back_finish", {}))
    out["back"] = b.image()
    out["icon"] = kit.icon_rows(spec["icon"], spec["pal"])
    out["icon__2"] = kit.icon_rows(spec["icon2"], spec["pal"])
    for kind, im in out.items():
        check(sid, kind, im, im.width)
    bb = out["front"].getbbox()
    print(f"  {sid:18s} front {bb[2]-bb[0]}x{bb[3]-bb[1]} at {bb[:2]}, back {out['back'].getbbox()}")
    return out


def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def sheet(items, path, z=4, bg=(248, 248, 240, 255)):
    """One species per row: idle frames + back at 4x, icons at 4x, then 1x."""
    pad = 8
    W = pad + z * (56 * 3 + 48 + 16) + 6 * pad + 56 * 3 + 48 + 32 + 4 * 6 + pad
    ch = 14 + z * 56 + pad
    s = Image.new("RGBA", (W, pad + len(items) * ch), bg)
    d = ImageDraw.Draw(s)
    for r, (sid, imgs) in enumerate(items):
        y = pad + r * ch
        d.text((pad, y), sid, fill=(30, 30, 30, 255))
        y += 14
        x = pad
        for k in ("front", "front__2", "front__3", "back"):
            if k in imgs:
                im = zoom(imgs[k], z)
                s.alpha_composite(im, (x, y + z * 56 - im.height))
            x += z * (48 if k == "back" else 56) + pad
        for k in ("icon", "icon__2"):
            s.alpha_composite(zoom(imgs[k], z), (x, y + (0 if k == "icon" else z * 16 + 4)))
        x += z * 16 + pad
        for k in ("front", "front__2", "front__3", "back", "icon", "icon__2"):
            if k in imgs:
                s.alpha_composite(imgs[k], (x, y + z * 56 - imgs[k].height))
                x += imgs[k].width + 6
    REVIEW.mkdir(exist_ok=True)
    s.save(path)


def roster(mine, path):
    """Every species front at 2x (ours marked), plus a solid-black silhouette row
    at 1x: the new lines must sit comfortably in the existing roster."""
    ids = sorted(p.name for p in OUT.iterdir() if (p / "front.png").exists() and p.name not in mine)
    fronts = [(i, Image.open(OUT / i / "front.png").convert("RGBA")) for i in ids]
    fronts += [(sid, imgs["front"]) for sid, imgs in mine.items()]
    z, cols = 2, 9
    cw, chh = 56 * z + 6, 56 * z + 16
    rows = (len(fronts) + cols - 1) // cols
    s = Image.new("RGBA", (cols * cw + 6, rows * chh + 6 + 2 * (len(fronts) // 24 + 2) * 60), (248, 248, 240, 255))
    d = ImageDraw.Draw(s)
    for k, (sid, im) in enumerate(fronts):
        x, y = 6 + (k % cols) * cw, 6 + (k // cols) * chh
        if sid in mine:
            d.rectangle([x - 2, y - 2, x + 56 * z + 1, y + 56 * z + 1], outline=(200, 120, 40, 255))
        s.alpha_composite(zoom(im, z), (x, y))
        d.text((x, y + 56 * z), sid[:18], fill=(60, 60, 60, 255))
    y0 = 6 + rows * chh + 8
    for k, (sid, im) in enumerate(fronts):
        a = np.asarray(im).copy()
        a[a[..., 3] > 0, :3] = 24
        sil = Image.fromarray(a, "RGBA")
        s.alpha_composite(sil, (6 + (k % 24) * 58, y0 + (k // 24) * 60))
        s.alpha_composite(im, (6 + (k % 24) * 58, y0 + (k // 24 + 2) * 60 + 4))
    s.save(path)


def build(only=None, write=True):
    allitems = {}
    for line in LINES:
        try:
            mod = importlib.import_module(line)
        except ModuleNotFoundError:
            continue
        items = []
        for sid, spec in mod.SPRITES.items():
            imgs = render(sid, spec)
            items.append((sid, imgs))
            allitems[sid] = imgs
            if write and (only is None or sid in only):
                dd = OUT / sid
                dd.mkdir(parents=True, exist_ok=True)
                for kind, im in imgs.items():
                    im.save(dd / f"{kind}.png")
        sheet(items, REVIEW / f"{line}.png")
    sheet(list(allitems.items()), REVIEW / "all.png")
    roster(allitems, REVIEW / "roster.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--preview":
        build(write=False)
    else:
        build(set(args) or None)
