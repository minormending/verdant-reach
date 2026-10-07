"""Bundle validation, mirroring ART.md §9 (src/art/bundles.test.ts is the
authority in CI; this is the same rule set for the Python tools).

    problems = validate()            # [(level, where, message)]
    level: "error"   - the format is broken (bad JSON, sizes, colours, refs, ...)
           "missing" - a logical path the contracts require has no bundle yet
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from . import bundles as B
from .core import ART, FORMATS, KINDS, ROOT, contracts, load_json, load_rgba
from .palette import rgb_of

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
Problem = tuple[str, str, str]


def _ui_required() -> list[str]:
    src = (ROOT / "src" / "contracts" / "constants.ts").read_text()
    m = re.search(r"export const uiPath = \(name:(.*?)\)\s*=>", src, re.S)
    return re.findall(r'"([a-z0-9_]+)"', re.sub(r"//[^\n]*", "", m.group(1))) if m else []


def _refcells(ref) -> list | None:
    if isinstance(ref, int) and not isinstance(ref, bool):
        return [ref]
    if isinstance(ref, list) and 1 <= len(ref) <= 2 and all(isinstance(x, int) and not isinstance(x, bool) for x in ref):
        return ref
    return None


def check_species(b: B.Bundle, out: list[Problem]) -> None:
    w = f"species/{b.id}"
    d = b.data
    pal, sport = d.get("palette"), d.get("sport")
    if not (isinstance(pal, list) and len(pal) == 4 and all(isinstance(h, str) and HEX.match(h) for h in pal)):
        out.append(("error", w, f"palette must be 4 '#rrggbb' colours, got {pal!r}"))
        return
    if not (isinstance(sport, list) and len(sport) == len(pal) and all(isinstance(h, str) and HEX.match(h) for h in sport)):
        out.append(("error", w, "sport missing or not the same length as palette"))
    if len({h.lower() for h in pal}) != 4:
        out.append(("error", w, "palette has duplicate colours"))
    allowed = np.array([rgb_of(h) for h in pal], np.uint8)
    frames = d.get("frames") or {}
    for g, (size, lo, hi, _) in B.SPECIES_FRAMES.items():
        names = frames.get(g) or []
        if not lo <= len(names) <= hi:
            out.append(("error", w, f"frames.{g}: {len(names)} frame(s), want {lo}-{hi}"))
        for n in names:
            p = b.file(n)
            if not p.exists():
                out.append(("error", w, f"missing file {n}"))
                continue
            a = b.image(n)
            if a.shape[:2] != (size, size):
                out.append(("error", w, f"{n} is {a.shape[1]}x{a.shape[0]}, want {size}x{size}"))
            al = set(np.unique(a[..., 3]).tolist())
            if not al <= {0, 255}:
                out.append(("error", w, f"{n}: alpha must be 0 or 255"))
            px = a[a[..., 3] > 0][:, :3]
            ok = (px[:, None, :] == allowed[None, :, :]).all(-1).any(-1)
            if not ok.all():
                stray = {"#%02x%02x%02x" % tuple(p) for p in px[~ok][:4]}
                out.append(("error", w, f"{n}: {int((~ok).sum())} pixel(s) off-palette, e.g. {sorted(stray)}"))


def check_tileset(b: B.Bundle, out: list[Problem]) -> None:
    w = f"tilesets/{b.id}"
    d = b.data
    ts, cols = d.get("tileSize", 16), d.get("columns")
    if ts != 16:
        out.append(("error", w, "tileSize must be 16"))
    p = b.file(d.get("sheet", ""))
    if not isinstance(cols, int) or cols < 1 or not p.exists():
        out.append(("error", w, "needs columns and an existing sheet"))
        return
    a = b.image(d["sheet"])
    if a.shape[1] != cols * 16 or a.shape[0] % 16:
        out.append(("error", w, f"sheet is {a.shape[1]}x{a.shape[0]}: want width {cols * 16} and height a multiple of 16"))
    ncells = cols * (a.shape[0] // 16)
    for key, e in (d.get("tiles") or {}).items():
        def bad(msg):
            out.append(("error", w, f"tiles.{key}: {msg}"))
        base = _refcells(e.get("base")) if isinstance(e, dict) else None
        if base is None:
            bad("base must be a cell or [cell, cell]")
            continue
        refs = list(base)
        alts = e.get("alts", [])
        if not isinstance(alts, list) or len(alts) > 5 or any(_refcells(x) is None or len(_refcells(x)) != 1
                                                               and not isinstance(x, int) for x in alts):
            bad("alts must be up to 5 static cells")
        else:
            refs += [x if isinstance(x, int) else x[0] for x in alts]
        for m, r in (e.get("masks") or {}).items():
            c = _refcells(r)
            if not (m.isdigit() and 0 <= int(m) <= 15) or c is None:
                bad(f"mask {m!r} invalid")
                continue
            if len(c) != len(base):
                bad(f"mask {m} has {len(c)} frame(s), base has {len(base)}")
            refs += c
        for c in refs:
            if not 0 <= c < ncells:
                bad(f"cell {c} outside the sheet ({ncells} cells)")


def check_simple(b: B.Bundle, out: list[Problem], req: dict) -> None:
    w = f"{KINDS[b.kind][0]}/{b.id}"
    d = b.data
    if b.kind == "structure":
        p = b.file(d.get("image", ""))
        if not p.exists():
            out.append(("error", w, "image missing"))
            return
        a = load_rgba(p)
        size = d.get("size")
        if not (isinstance(size, list) and len(size) == 2) or a.shape[:2] != (size[1] * 16, size[0] * 16):
            out.append(("error", w, f"image {a.shape[1]}x{a.shape[0]} doesn't match size {size}"))
        spec = req["structures"].get(b.id)
        if spec and list(spec) != size:
            out.append(("error", w, f"size {size} != STRUCTURES {list(spec)}"))
    elif b.kind == "character":
        p = b.file(d.get("sheet", ""))
        if not p.exists():
            out.append(("error", w, "sheet missing"))
            return
        a = load_rgba(p)
        if a.shape[:2] != (64, 48):
            out.append(("error", w, f"sheet is {a.shape[1]}x{a.shape[0]}, want 48x64"))
        if d.get("frame") != B.CHAR_FRAME or d.get("rows") != B.CHAR_ROWS or d.get("columns") != B.CHAR_COLUMNS:
            out.append(("error", w, "frame/rows/columns must be the v1 values"))
    elif b.kind == "set":
        if not isinstance(d.get("logicalDir"), str) or not d["logicalDir"].startswith("assets/"):
            out.append(("error", w, "logicalDir must be assets/<dir>"))
        for k, e in (d.get("images") or {}).items():
            p = b.file(e.get("file", ""))
            if not p.exists():
                out.append(("error", w, f"images.{k}: file {e.get('file')} missing"))
                continue
            a = load_rgba(p)
            if e.get("size") and list(e["size"]) != [a.shape[1], a.shape[0]]:
                out.append(("error", w, f"images.{k}: size {e['size']} but image is {a.shape[1]}x{a.shape[0]}"))


def _check_bundle(kind: str, id_: str, root: Path, packs: tuple, out: list[Problem], req: dict, where: Path) -> B.Bundle | None:
    jp = where / KINDS[kind][0] / id_ / KINDS[kind][1]
    try:
        raw = load_json(jp)
    except Exception as e:  # noqa: BLE001
        out.append(("error", str(jp.relative_to(ART)), f"bad JSON: {e}"))
        return None
    w = str(jp.parent.relative_to(ART))
    if raw.get("format", FORMATS[kind]) != FORMATS[kind] or ("format" not in raw and where == root):
        out.append(("error", w, f"format must be {FORMATS[kind]!r}"))
    if raw.get("id", id_) != id_:
        out.append(("error", w, f"id {raw.get('id')!r} doesn't match folder"))
    try:
        b = B.load(kind, id_, root, packs)
    except FileNotFoundError:
        return None
    {"species": check_species, "tileset": check_tileset}.get(kind, lambda b, o: check_simple(b, o, req))(b, out)
    return b


def validate(root: Path = ART, coverage: bool = True) -> list[Problem]:
    out: list[Problem] = []
    req = contracts()
    for kind in KINDS:
        for id_ in B.list_ids(kind, root):
            _check_bundle(kind, id_, root, (), out, req, root)
    # tile ownership: every key in exactly one tileset
    owners: dict[str, list[str]] = {}
    for ts in B.list_ids("tileset", root):
        for key in (load_json(B.json_path("tileset", ts, root)).get("tiles") or {}):
            owners.setdefault(key, []).append(ts)
    for key, ts in owners.items():
        if len(ts) > 1:
            out.append(("error", "tilesets", f"tile {key!r} is defined by {len(ts)} tilesets: {ts}"))
        if key not in req["tiles"]:
            out.append(("error", f"tilesets/{ts[0]}", f"tile {key!r} is not a TileKey"))
    # packs
    for pk in B.list_packs(root):
        meta = B.load_pack(pk, root)
        if meta.get("format") != FORMATS["pack"] or meta.get("id") != pk:
            out.append(("error", f"packs/{pk}", "pack.json needs format verdant.pack/1 and a matching id"))
        proot = root / "packs" / pk
        for kind in KINDS:
            for id_ in B.list_ids(kind, proot):
                _check_bundle(kind, id_, root, (pk,), out, req, proot)
    if coverage:
        from .resolve import Resolver
        r = Resolver(root)
        have = set(r.paths())
        need = []
        for s in req["species"]:
            need += [f"assets/species/{s}/{k}.png" for k in ("front", "back", "icon")]
        need += [f"assets/tiles/{t}.png" for t in req["tiles"]]
        need += [f"assets/structures/{s}.png" for s in req["structures"]]
        need += [f"assets/characters/{c}.png" for c in req["characters"]]
        need += [f"assets/trainers/{p}.png" for p in req["portraits"]]
        need += [f"assets/items/{i}.png" for i in req["items"]]
        need += [f"assets/stills/{s}.png" for s in req["stills"]]
        need += [f"assets/ui/{u}.png" for u in _ui_required()]
        for p in need:
            if p not in have:
                out.append(("missing", p, "no bundle provides it"))
        for sid in req["species"]:
            b = r.bundle("species", sid)
            if b and not b.data.get("sport"):
                out.append(("missing", f"species/{sid}", "no sport palette"))
    return out
