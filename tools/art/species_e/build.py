"""Species art E: the Palm House lines (Round 4), authored directly as
art bundles (docs/ART.md §3).

  orchid.py    orchid_keiki -> orchid_spike -> moth_orchid   (Flora Vance's ace)
  monstera.py  monstera_cutting -> monstera
  lotus.py     lotus_seed -> sacred_lotus

Each line module defines IDS, SPECIES[id] = dict(pal, sport, notes, credits)
and make(id) -> {kind: 4-colour RGBA image}. The shapes are authored with
the starter kit (px.py / kit.py, vendored from species_a so this builder
is self-contained and byte-stable), then hand pixels.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_e/build.py [ids...]
  ... build.py --preview [ids...]   (review sheets only, no bundles written)

Writes public/art/species/<id>/{species.json, front.png, front__2.png,
front__3.png, back.png, icon.png, icon__2.png} and the review sheets in
tools/art/species_e/review/. Deterministic: the same code writes the same
bytes. A bundle whose species.json says source.kind != "generated" is
never overwritten.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(1, str(HERE.parent))                      # tools/art: artkit

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "art" / "species"
REVIEW = HERE / "review"
LINES = ["orchid", "monstera", "lotus"]
SIZES = {"front": 56, "front__2": 56, "front__3": 56, "back": 48, "icon": 16, "icon__2": 16}
ORDER = ["front", "front__2", "front__3", "back", "icon", "icon__2"]


def hexs(rgb):
    return "#%02x%02x%02x" % tuple(rgb)


def snap_hex(h):
    from px import snap
    return hexs(snap(h))


def palette_of(spec):
    """The bundle palette: #181818 then the three line tones, snapped to the
    GBC 15-bit grid exactly as the renderer snaps them."""
    return [snap_hex("#181818")] + [snap_hex(p) for p in spec["pal"]]


def check(sid, kind, im, pal):
    assert im.size == (SIZES[kind],) * 2, (sid, kind, im.size)
    a = np.asarray(im.convert("RGBA"))
    assert set(np.unique(a[..., 3])) <= {0, 255}, (sid, kind, "alpha")
    cols = {hexs(p[:3]) for p in a.reshape(-1, 4) if p[3]}
    assert cols <= set(pal), (sid, kind, sorted(cols - set(pal)))


def write_bundle(sid, spec, line, imgs):
    """Write through artkit (deterministic PNGs, skips edited/imported
    bundles), then set the designed sport and notes: the sport is mapped
    colour by colour, so it follows whatever palette order artkit keeps."""
    from artkit import emit
    from artkit import bundles as B
    from artkit.core import save_json
    tool = f"tools/art/species_e/{line}.py"
    if not emit.species(sid, imgs, tool=tool, credits=spec["credits"]):
        return
    meta = B.read_meta("species", sid)
    mine = dict(zip(palette_of(spec), [snap_hex(p) for p in spec["sport"]]))
    assert set(meta["palette"]) == set(mine), (sid, meta["palette"], list(mine))
    meta["sport"] = [mine[h] for h in meta["palette"]]
    meta["notes"] = spec["notes"]
    save_json(B.json_path("species", sid), B.ordered("species", meta))


def render_all(only=None):
    out = []
    for line in LINES:
        mod = importlib.import_module(line)
        for sid in mod.IDS:
            if only and sid not in only:
                continue
            spec = mod.SPECIES[sid]
            imgs = mod.make(sid)
            pal = palette_of(spec)
            for kind, im in imgs.items():
                check(sid, kind, im, pal)
            out.append((line, sid, spec, imgs))
    return out


# --------------------------------------------------------------------------- review sheets

def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def swap(im, pal, sport):
    a = np.asarray(im.convert("RGBA")).copy()
    src = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in pal]
    dst = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in sport]
    o = a.copy()
    for s_, d_ in zip(src, dst):
        m = (a[..., 3] > 0) & np.all(a[..., :3] == s_, -1)
        o[m, :3] = d_
    return Image.fromarray(o, "RGBA")


def sheet(items, path, z=4, bg=(240, 244, 228, 255)):
    """Per species: idle frames + back at 4x, icons at 4x, the 1x set on a
    battle-ish ground, the 1x silhouette and the sport front."""
    pad = 8
    W = pad + z * (56 * 3 + 48 + 16) + 7 * pad + 56 * 2 + 48 + 40 + 56 + 3 * pad
    ch = 16 + z * 56 + pad
    s = Image.new("RGBA", (W, pad + len(items) * ch), bg)
    d = ImageDraw.Draw(s)
    for r, (line, sid, spec, imgs) in enumerate(items):
        y = pad + r * ch
        d.text((pad, y), f"{sid}   ({line})", fill=(30, 30, 30, 255))
        y += 14
        x = pad
        for k in ("front", "front__2", "front__3", "back"):
            if k in imgs:
                im = zoom(imgs[k], z)
                s.alpha_composite(im, (x, y + z * 56 - im.height))
            x += z * (48 if k == "back" else 56) + pad
        for k in ("icon", "icon__2"):
            s.alpha_composite(zoom(imgs[k], z), (x, y + (0 if k == "icon" else z * 16 + 6)))
        x += z * 16 + pad
        pal = palette_of(spec)
        sport = [snap_hex(p) for p in spec["sport"]]
        for k in ("front", "back"):
            s.alpha_composite(imgs[k], (x, y + 56 - imgs[k].height))
            a = np.asarray(imgs[k]).copy()
            a[a[..., 3] > 0, :3] = 24
            s.alpha_composite(Image.fromarray(a, "RGBA"), (x, y + 60 + 56 - imgs[k].height))
            s.alpha_composite(swap(imgs[k], pal, sport), (x, y + 120 + 56 - imgs[k].height))
            x += imgs[k].width + pad
        for k in ("icon", "icon__2"):
            s.alpha_composite(imgs[k], (x, y + 40))
            s.alpha_composite(swap(imgs[k], pal, sport), (x, y + 160))
            x += 20
        # palette + sport swatches
        for j, (a_, b_) in enumerate(zip(pal, sport)):
            d.rectangle([x + 8, y + j * 14, x + 20, y + j * 14 + 12], fill=a_)
            d.rectangle([x + 22, y + j * 14, x + 34, y + j * 14 + 12], fill=b_)
    REVIEW.mkdir(exist_ok=True)
    s.save(path)


def roster_ids(mine):
    """Every other species front, resolved through artkit exactly as the game
    resolves assets/species/<id>/front.png (bundles, no packs)."""
    from artkit import bundles as B
    from artkit.resolve import Resolver
    r = Resolver()
    got = {}
    for sid in B.list_ids("species"):
        if sid in mine:
            continue
        a = r.image(f"assets/species/{sid}/front.png")
        if a is not None:
            got[sid] = Image.fromarray(a, "RGBA")
    return got


def roster(mine, path):
    """All fronts at 2x (ours boxed), then a 1x silhouette wall and a 1x colour
    wall: the new lines must sit in the existing roster and never share a
    silhouette with anyone."""
    others = roster_ids(mine)
    fronts = sorted(others.items())
    fronts += [(sid, imgs["front"]) for sid, imgs in mine.items()]
    z, cols = 2, 10
    cw, chh = 56 * z + 6, 56 * z + 16
    rows = (len(fronts) + cols - 1) // cols
    per = 22
    wall_rows = (len(fronts) + per - 1) // per
    H = 6 + rows * chh + 16 + wall_rows * 2 * 60 + 10
    s = Image.new("RGBA", (max(cols * cw + 6, per * 58 + 12), H), (248, 248, 240, 255))
    d = ImageDraw.Draw(s)
    for k, (sid, im) in enumerate(fronts):
        x, y = 6 + (k % cols) * cw, 6 + (k // cols) * chh
        if sid in mine:
            d.rectangle([x - 2, y - 2, x + 56 * z + 1, y + 56 * z + 1], outline=(200, 90, 40, 255), width=2)
        s.alpha_composite(zoom(im, z), (x, y))
        d.text((x, y + 56 * z), sid[:18], fill=(60, 60, 60, 255))
    y0 = 6 + rows * chh + 12
    for k, (sid, im) in enumerate(fronts):
        a = np.asarray(im).copy()
        a[a[..., 3] > 0, :3] = 24
        x = 6 + (k % per) * 58
        yy = y0 + (k // per) * 120
        if sid in mine:
            d.rectangle([x - 1, yy - 1, x + 56, yy + 56], outline=(200, 90, 40, 255))
        s.alpha_composite(Image.fromarray(a, "RGBA"), (x, yy))
        s.alpha_composite(im, (x, yy + 60))
    s.save(path)


def build(only=None, write=True):
    items = render_all(only)
    for line in LINES:
        rows = [it for it in items if it[0] == line]
        if rows:
            sheet(rows, REVIEW / f"{line}.png")
    sheet(items, REVIEW / "all.png")
    roster({sid: imgs for _, sid, _, imgs in items}, REVIEW / "roster.png")
    if write:
        for line, sid, spec, imgs in items:
            write_bundle(sid, spec, line, imgs)
    for line, sid, spec, imgs in items:
        bb = imgs["front"].getbbox()
        print(f"  {sid:18s} front {bb[2] - bb[0]}x{bb[3] - bb[1]} at {bb[:2]}, back {imgs['back'].getbbox()}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--preview":
        build(set(args[1:]) or None, write=False)
    else:
        build(set(args) or None)
