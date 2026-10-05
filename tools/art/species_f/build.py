"""Species art F (Round 4, creature artist 4): the apple line and the bird of
paradise line, authored directly as bundles (docs/ART.md section 3).

Each line module (apple.py, paradise.py) defines
SPRITES: id -> dict(
    pal=(dark, mid, light),           # + #181818 = the 4 GBC colours
    sport=(dark, mid, light),         # a real horticultural sport (ART.md: sport)
    sport_name="...",                 # written into species.json notes
    front=fn(ph) -> Sprite,           # drawn straight onto 56x56, ph = idle phase 0..2
    frames=2 | 3,                     # idle frames (front, front__2[, front__3])
    back=fn() -> Sprite,              # drawn straight onto 48x48, cut by the bottom edge
    icon=[16 rows], icon2=[16 rows],  # 16x16 ASCII icons, 2 frames
    notes="...",
)
The drawing kit (kit.py) is species D's, copied so this folder stands alone.
Deterministic: no randomness anywhere, so a rebuild is byte-identical.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_f/build.py [ids...]
  ... build.py --preview [ids...]   (review sheets only, no bundles written)

Writes public/art/species/<id>/ through tools/art/artkit (emit.species: the
palette, deterministic PNGs, never over an `edited` bundle), then sets the
designed sport and notes; and the review sheets in tools/art/species_f/review/.
Run `npm run art:index` after adding a bundle.
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

sys.path.insert(0, str(HERE.parent))
from artkit import emit  # noqa: E402
from artkit import bundles as B  # noqa: E402
from artkit.core import load_json, save_json  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "art" / "species"
REVIEW = HERE / "review"
LINES = ["apple", "paradise"]

CREDITS = ("Original pixel art for Verdant Reach, hand-built in tools/art/species_f/ (Round 4). "
           "Subject: {ref}; drawn from its botany, not traced from any photo.")


def hexs(c):
    r, g, b = kit.hexc(c) if isinstance(c, str) else c
    return f"#{r:02x}{g:02x}{b:02x}"


def check(sid, kind, im, size, pal):
    assert im.size == (size, size), (sid, kind, im.size)
    a = np.asarray(im)
    cols = {tuple(int(v) for v in p[:3]) for p in a.reshape(-1, 4) if p[3]}
    assert cols <= {tuple(p) for p in pal}, (sid, kind, cols - {tuple(p) for p in pal})
    assert set(np.unique(a[..., 3])) <= {0, 255}, (sid, kind)


def slide(im, dx):
    """Register the whole pose dx px sideways (every idle frame alike)."""
    if not dx:
        return im
    a = np.asarray(im)
    assert not a[:, (a.shape[1] - dx if dx > 0 else 0):(a.shape[1] if dx > 0 else -dx), 3].any(), "slide clips"
    return Image.fromarray(np.roll(a, dx, axis=1), "RGBA")


def render(sid, spec):
    pal = [kit.K] + [kit.hexc(p) for p in spec["pal"]]
    out = {}
    names = ["front", "front__2", "front__3"][:spec.get("frames", 2)]
    for ph, name in enumerate(names):
        s = spec["front"](ph)
        assert (s.w, s.h) == (56, 56)
        s.finish(**spec.get("front_finish", {}))
        out[name] = slide(s.image(), spec.get("front_dx", 0))
    b = spec["back"]()
    assert (b.w, b.h) == (48, 48)
    b.finish(open_bottom=True, **spec.get("back_finish", {}))
    out["back"] = b.image()
    out["icon"] = kit.icon_rows(spec["icon"], spec["pal"])
    out["icon__2"] = kit.icon_rows(spec["icon2"], spec["pal"])
    for kind, im in out.items():
        check(sid, kind, im, im.width, pal)
    return out


def write_bundle(sid, spec, line, imgs):
    """Write through artkit (it computes the palette order, keeps hand-kept
    metadata and refuses `edited` bundles), then set this species' designed
    sport, credits and notes, slot-matched by colour."""
    tool = f"tools/art/species_f/{line}.py"
    if not emit.species(sid, imgs, tool=tool, credits=CREDITS.format(ref=spec["ref"])):
        return
    path = B.json_path("species", sid)
    meta = load_json(path)
    to_sport = {hexs(p): hexs(q) for p, q in zip(spec["pal"], spec["sport"])}
    to_sport[hexs(kit.K)] = hexs(kit.K)
    meta["sport"] = [to_sport[c.lower()] for c in meta["palette"]]
    assert len(set(meta["sport"])) == 4, sid
    meta["notes"] = spec["notes"] + f" Sport: {spec['sport_name']}."
    save_json(path, B.ordered("species", meta))


def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def sport_of(im, spec):
    """The sport rendering: palette[i] -> sport[i], pixel for pixel."""
    a = np.asarray(im).copy()
    for p, q in zip(spec["pal"], spec["sport"]):
        p, q = kit.hexc(p), kit.hexc(q)
        m = (a[..., 3] > 0) & np.all(a[..., :3] == p, -1)
        a[m, :3] = q
    return Image.fromarray(a, "RGBA")


def sheet(items, specs, path, z=4, bg=(248, 248, 240, 255)):
    """One species per row: idle frames + back at 4x, icons at 4x, then 1x
    (normal and sport), then a greyscale front (the 4-greys test)."""
    pad = 8
    W = pad + z * (56 * 3 + 48 + 16) + 6 * pad + (56 * 3 + 48 + 32 + 4 * 6) + 2 * 62 + pad
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
                s.alpha_composite(imgs[k], (x, y + 56 - imgs[k].height))
                s.alpha_composite(sport_of(imgs[k], specs[sid]), (x, y + 2 * 56 + 8 - imgs[k].height))
                x += imgs[k].width + 6
        g = imgs["front"].convert("LA").convert("RGBA")
        s.alpha_composite(zoom(g, 2), (x, y))
    REVIEW.mkdir(exist_ok=True)
    s.save(path)


def roster_fronts(mine):
    found = {}
    for root in (OUT,):
        if not root.exists():
            continue
        for p in root.iterdir():
            if (p / "front.png").exists() and p.name not in mine:
                found[p.name] = p / "front.png"
    return [(i, Image.open(found[i]).convert("RGBA")) for i in sorted(found)], OUT


def roster(mine, path):
    """Every species front at 2x (ours outlined), plus a solid-black
    silhouette strip at 1x: the new lines must sit in the existing roster."""
    fronts, _ = roster_fronts(mine)
    fronts += [(sid, imgs["front"]) for sid, imgs in mine.items()]
    z, cols = 2, 10
    cw, chh = 56 * z + 6, 56 * z + 16
    rows = (len(fronts) + cols - 1) // cols
    per = 24
    srows = (len(fronts) + per - 1) // per
    s = Image.new("RGBA", (max(cols * cw, per * 58) + 12, rows * chh + 20 + srows * 120), (248, 248, 240, 255))
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
        x, y = 6 + (k % per) * 58, y0 + (k // per) * 120
        s.alpha_composite(Image.fromarray(a, "RGBA"), (x, y))
        s.alpha_composite(im, (x, y + 58))
    s.save(path)


def specs_all():
    out = {}
    for line in LINES:
        mod = importlib.import_module(line)
        for sid, spec in mod.SPRITES.items():
            out[sid] = (line, spec)
    return out


def build(only=None, write=True):
    allitems, specs = {}, {}
    by_line = {}
    for sid, (line, spec) in specs_all().items():
        imgs = render(sid, spec)
        bb = imgs["front"].getbbox()
        print(f"  {sid:18s} front {bb[2]-bb[0]}x{bb[3]-bb[1]} at {bb[:2]}, back {imgs['back'].getbbox()}")
        allitems[sid] = imgs
        specs[sid] = spec
        by_line.setdefault(line, []).append((sid, imgs))
        if write and (only is None or sid in only):
            write_bundle(sid, spec, line, imgs)
    for line, items in by_line.items():
        sheet(items, specs, REVIEW / f"{line}.png")
    sheet(list(allitems.items()), specs, REVIEW / "all.png")
    roster(allitems, REVIEW / "roster.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--preview":
        build(write=False)
    else:
        build(set(args) or None)
