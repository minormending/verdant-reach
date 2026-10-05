"""art.py: the command-line front end to artkit (docs/ART.md, "Tooling").

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/art.py list [species|tileset|structure|character|set|pack]
  $PY tools/art/art.py validate [--strict]
  $PY tools/art/art.py show <bundle> [--pack P] [-o out.png]
  $PY tools/art/art.py explode <tileset> <dir>
  $PY tools/art/art.py pack <dir> <tileset> [--name NAME]
  $PY tools/art/art.py swap species <id> --from <dir> [--quantize]
  $PY tools/art/art.py palette <id> [--sport] '#a' '#b' '#c' '#d'
  $PY tools/art/art.py new species <id> --like <id>
  $PY tools/art/art.py contact <kind> [--pack P] [-o out.png]
  $PY tools/art/art.py resolve <logical path> [--pack P] [-o out.png]

<bundle> is `kind/id` (species/oak_acorn, tilesets/water, sets/ui, ...) or a
bare id when only one kind has it. Previews go to tools/art/review/ unless
-o is given. Edits mark the bundle `source.kind` edited or imported, so the
generators leave it alone from then on.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402

from artkit import bundles as B  # noqa: E402
from artkit import contact as C  # noqa: E402
from artkit import index as I  # noqa: E402
from artkit.core import ART, KINDS, load_rgba, rel, save_json, save_png  # noqa: E402
from artkit.palette import legacy_sport, opaque_colours, order_dark_to_light, hex_of, quantize, remap, rgb_of  # noqa: E402
from artkit.resolve import Resolver  # noqa: E402
from artkit.sheets import assemble, explode  # noqa: E402

REVIEW = Path(__file__).resolve().parent / "review"
ALIASES = {"species": "species", "tileset": "tileset", "tilesets": "tileset", "structure": "structure",
           "structures": "structure", "character": "character", "characters": "character",
           "set": "set", "sets": "set"}


def die(msg: str) -> None:
    print("error:", msg, file=sys.stderr)
    sys.exit(2)


def parse_bundle(spec: str) -> tuple[str, str]:
    if "/" in spec:
        k, i = spec.split("/", 1)
        if k not in ALIASES:
            die(f"unknown kind {k!r}")
        if not B.exists(ALIASES[k], i):
            die(f"no {ALIASES[k]} bundle {i!r}")
        return ALIASES[k], i
    hits = [k for k in KINDS if B.exists(k, spec)]
    if not hits:
        die(f"no bundle named {spec!r}")
    if len(hits) > 1:
        die(f"{spec!r} is ambiguous ({', '.join(hits)}): write kind/{spec}")
    return hits[0], spec


def reindex() -> None:
    try:
        print(I.rebuild())
    except RuntimeError as e:
        print("warning: index not rebuilt:", e)


# ---------------------------------------------------------------- commands ---
def cmd_list(a) -> int:
    kinds = [ALIASES.get(a.kind, a.kind)] if a.kind else list(KINDS) + ["pack"]
    for k in kinds:
        if k == "pack":
            for pk in B.list_packs():
                m = B.load_pack(pk)
                n = sum(len(B.list_ids(kk, ART / "packs" / pk)) for kk in KINDS)
                print(f"pack       {pk:22} {n:3} override(s)  {m.get('name', '')}")
            continue
        for i in B.list_ids(k):
            d = B.read_meta(k, i)
            src = d.get("source", {})
            extra = ""
            if k == "tileset":
                extra = f"{len(d['tiles'])} tiles"
            elif k == "set":
                extra = f"{len(d['images'])} images -> {d['logicalDir']}"
            elif k == "species":
                extra = " ".join(d["palette"])
            print(f"{k:10} {i:22} {src.get('kind', '-'):9} {extra}")
    return 0


def cmd_validate(a) -> int:
    from artkit.validate import validate
    probs = validate()
    errs = [p for p in probs if p[0] == "error"]
    miss = [p for p in probs if p[0] == "missing"]
    for lvl, w, m in errs + (miss if a.strict or a.verbose else []):
        print(f"{lvl:7} {w}: {m}")
    stale = None
    try:
        stale = I.check()
    except RuntimeError as e:
        print("warning:", e)
    if stale:
        print("error   index.json:", stale)
    print(f"{len(errs)} error(s), {len(miss)} required path(s) not yet provided"
          + ("" if a.strict or a.verbose or not miss else " (--verbose to list)"))
    return 1 if errs or stale or (a.strict and miss) else 0


def cmd_show(a) -> int:
    kind, i = parse_bundle(a.bundle)
    im = C.show(kind, i, tuple(a.pack or ()), a.scale)
    out = Path(a.o) if a.o else REVIEW / f"show_{kind}_{i}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("wrote", rel(out))
    return 0


def cmd_explode(a) -> int:
    b = B.load("tileset", a.tileset)
    tiles = explode(b.image(b.data["sheet"]), b.data["tiles"], b.data["columns"])
    d = Path(a.dir)
    d.mkdir(parents=True, exist_ok=True)
    for stem, img in tiles.items():
        save_png(d / f"{stem}.png", img)
    print(f"wrote {len(tiles)} tile images to {d}")
    return 0


def cmd_pack(a) -> int:
    d = Path(a.dir)
    imgs = {p.stem: load_rgba(p) for p in sorted(d.glob("*.png"))}
    if not imgs:
        die(f"no PNGs in {d}")
    for s, im in imgs.items():
        if im.shape[:2] != (16, 16):
            die(f"{s}.png is {im.shape[1]}x{im.shape[0]}, tiles are 16x16")
    from artkit.tilegroups import TILESETS
    meta = B.read_meta("tileset", a.tileset) or {}
    old = {}
    if meta:
        b = B.load("tileset", a.tileset)
        old = explode(b.image(b.data["sheet"]), b.data["tiles"], b.data["columns"])
    order = list(meta.get("tiles", {}).keys()) or TILESETS.get(a.tileset, ("", []))[1]
    sheet, tiles, cols = assemble(imgs, order)
    same = set(old) == set(imgs) and all(np.array_equal(old[k], imgs[k]) for k in imgs)
    src = meta.get("source") if same and meta.get("source") else {"kind": "edited", "from": "art.py pack"}
    out = {"name": a.name or meta.get("name") or a.tileset.replace("_", " ").title(),
           "credits": meta.get("credits", "Original pixel art for Verdant Reach."), "source": src}
    if meta.get("notes"):
        out["notes"] = meta["notes"]
    B.write_tileset(a.tileset, sheet, tiles, cols, out)
    print(f"packed {len(imgs)} images ({len(tiles)} tiles) into tilesets/{a.tileset} "
          f"[{'unchanged' if same else 'source: edited'}]")
    if not meta:
        reindex()
    return 0


def cmd_swap(a) -> int:
    if a.kind != "species":
        die("swap supports species (tiles: explode + pack; others: replace the PNG)")
    d = Path(a.src)
    meta = B.read_meta("species", a.id)
    if not meta:
        die(f"no species bundle {a.id!r} (start one with: new species {a.id} --like <id>)")
    b = B.load("species", a.id)
    new: dict[str, np.ndarray] = {}
    for kind, (g, _) in B.SPECIES_KINDS.items():
        p = d / f"{kind}.png"
        if p.exists():
            im = load_rgba(p)
            size = B.SPECIES_FRAMES[g][0]
            if im.shape[:2] != (size, size):
                die(f"{p.name} is {im.shape[1]}x{im.shape[0]}, want {size}x{size}")
            new[kind] = im
    if not new:
        die(f"no frames in {d} (expected front.png, back.png, icon.png, ...)")
    if a.quantize:
        new = {k: quantize(v, meta["palette"]) for k, v in new.items()}
    for k, v in new.items():
        if not set(np.unique(v[..., 3]).tolist()) <= {0, 255}:
            die(f"{k}.png has partial alpha (use --quantize to snap it)")
    cols = opaque_colours(*new.values())
    if len(cols) > 4:
        die(f"the new frames use {len(cols)} colours; species are 4 (use --quantize to snap to the current palette)")
    keep_old = {h.lower() for h in meta["palette"]} >= {hex_of(c) for c in cols}
    palette = meta["palette"] if keep_old else [hex_of(c) for c in order_dark_to_light(cols)]
    if len(palette) != 4:
        die(f"the new frames use only {len(palette)} colours: a palette needs exactly 4")
    frames = {k: remap(b.frame(k), meta["palette"], palette) for k in b.frame_kinds() if k not in new}
    frames.update(new)
    for need in ("front", "back", "icon"):
        if need not in frames:
            die(f"missing {need}.png")
    out = {k: v for k, v in meta.items() if k not in ("format", "id", "frames")}
    out["palette"] = palette
    if not keep_old:
        print(f"palette {meta['palette']} -> {palette}; sport kept by index: {meta['sport']} (review it)")
    out["source"] = {"kind": "imported", "from": str(d)}
    B.write_species(a.id, frames, out)
    print(f"swapped {sorted(new)} into species/{a.id}; kept {sorted(set(frames) - set(new))}")
    reindex()
    return 0


def cmd_palette(a) -> int:
    meta = B.read_meta("species", a.id)
    if not meta:
        die(f"no species bundle {a.id!r}")
    try:
        cols = [hex_of(rgb_of(c)) for c in a.colours]
    except ValueError as e:
        die(str(e))
    if len(cols) != len(meta["palette"]):
        die(f"give {len(meta['palette'])} colours")
    if a.sport:
        meta["sport"] = cols
        save_json(B.json_path("species", a.id), B.ordered("species", meta))
        print(f"species/{a.id} sport = {cols}")
        return 0
    if len({c for c in cols}) != len(cols):
        die("palette colours must be distinct")
    b = B.load("species", a.id)
    frames = {k: remap(b.frame(k), meta["palette"], cols) for k in b.frame_kinds()}
    out = {k: v for k, v in meta.items() if k not in ("format", "id", "frames")}
    out["palette"] = cols
    if (meta.get("source") or {}).get("kind") != "imported":
        out["source"] = {"kind": "edited"}
    B.write_species(a.id, frames, out)
    print(f"species/{a.id} palette {meta['palette']} -> {cols} (pixels remapped)")
    return 0


def cmd_new(a) -> int:
    if a.kind != "species":
        die("new supports species")
    if B.exists("species", a.id):
        die(f"species/{a.id} already exists")
    if not B.exists("species", a.like):
        die(f"no species bundle {a.like!r}")
    B.copy_bundle("species", a.like, a.id)
    meta = B.read_meta("species", a.id)
    meta["credits"] = f"TODO: credit the art. Started from the {a.like} bundle as a template."
    meta["source"] = {"kind": "edited"}
    meta["notes"] = f"Template copied from species/{a.like}: redraw every frame."
    save_json(B.json_path("species", a.id), B.ordered("species", meta))
    print(f"created species/{a.id} from {a.like} (source: edited)")
    reindex()
    return 0


def cmd_contact(a) -> int:
    kind = "pack" if a.kind in ("pack", "packs") else ALIASES.get(a.kind)
    if not kind:
        die(f"unknown kind {a.kind!r}")
    if kind == "pack":
        if not a.pack:
            die("contact pack needs --pack <id>")
        kinds = [k for k in KINDS if B.list_ids(k, ART / "packs" / a.pack[0])]
        for k in kinds:  # base vs pack, side by side
            C.grid([(i, C.row([C.contact_one(k, i, ()), C.contact_one(k, i, tuple(a.pack))], 12))
                    for i in B.list_ids(k, ART / "packs" / a.pack[0])], 1).save(
                REVIEW / f"contact_pack_{a.pack[0]}_{k}.png")
            print("wrote", rel(REVIEW / f"contact_pack_{a.pack[0]}_{k}.png"))
        return 0
    im = C.contact(kind, tuple(a.pack or ()), a.scale)
    out = Path(a.o) if a.o else REVIEW / f"contact_{kind}{'_' + '_'.join(a.pack) if a.pack else ''}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("wrote", rel(out))
    return 0


def cmd_resolve(a) -> int:
    img = Resolver(packs=tuple(a.pack or ())).image(a.path)
    if img is None:
        print("missing:", a.path)
        return 1
    print(f"{a.path}: {img.shape[1]}x{img.shape[0]}")
    if a.o:
        C.zoom(img, a.scale).save(a.o)
        print("wrote", a.o)
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="art.py", description=__doc__.split("\n\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("list", help="list bundles and packs")
    s.add_argument("kind", nargs="?")
    s = sub.add_parser("validate", help="check every bundle against ART.md §9")
    s.add_argument("--strict", action="store_true", help="also fail on required paths nobody provides yet")
    s.add_argument("--verbose", "-v", action="store_true")
    s = sub.add_parser("show", help="write a 4x preview PNG of one bundle")
    s.add_argument("bundle")
    s.add_argument("--pack", action="append")
    s.add_argument("--scale", type=int, default=4)
    s.add_argument("-o")
    s = sub.add_parser("explode", help="tileset -> per-tile PNGs (<key>.png, <key>__2.png, <key>~1.png, <key>@5.png)")
    s.add_argument("tileset")
    s.add_argument("dir")
    s = sub.add_parser("pack", help="per-tile PNGs -> tileset (inverse of explode)")
    s.add_argument("dir")
    s.add_argument("tileset")
    s.add_argument("--name")
    s = sub.add_parser("swap", help="replace a species' frames from a folder of PNGs")
    s.add_argument("kind", choices=["species"])
    s.add_argument("id")
    s.add_argument("--from", dest="src", required=True)
    s.add_argument("--quantize", action="store_true", help="snap colours to the current palette, alpha to 0/255")
    s = sub.add_parser("palette", help="set a species palette (remaps pixels) or, with --sport, its sport")
    s.add_argument("id")
    s.add_argument("--sport", action="store_true")
    s.add_argument("colours", nargs="+")
    s = sub.add_parser("new", help="start a new species bundle from an existing one")
    s.add_argument("kind", choices=["species"])
    s.add_argument("id")
    s.add_argument("--like", required=True)
    s = sub.add_parser("contact", help="review sheet for a kind (species, tileset, structure, character, set, pack)")
    s.add_argument("kind")
    s.add_argument("--pack", action="append")
    s.add_argument("--scale", type=int, default=2)
    s.add_argument("-o")
    s = sub.add_parser("resolve", help="resolve a logical path (assets/...) through the bundles")
    s.add_argument("path")
    s.add_argument("--pack", action="append")
    s.add_argument("--scale", type=int, default=4)
    s.add_argument("-o")
    a = p.parse_args(argv)
    return globals()[f"cmd_{a.cmd}"](a)


if __name__ == "__main__":
    sys.exit(main())
