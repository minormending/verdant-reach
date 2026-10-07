"""Generator-facing writers. Every tools/art generator writes bundles through
these, never files directly. Rules (ART.md §3 `source`):

- A bundle whose `source.kind` is `edited` or `imported` is never touched.
- Hand-maintained metadata survives a regen: species `sport`, `credits` and
  `notes`; tileset `name` and `credits`; set entries other than the ones a
  generator writes. Only the pixels and what follows from them are rewritten.
- Output is deterministic, so regenerating unchanged art rewrites nothing.
"""

from __future__ import annotations

from typing import Mapping

import numpy as np
from PIL import Image

from . import bundles as B
from .core import ART, LOCKED, to_rgba
from .palette import legacy_sport, order_dark_to_light, opaque_colours, hex_of
from .sheets import assemble
from .tilegroups import TILESET_OF, TILESETS

DEFAULT_CREDITS = "Original pixel art for Verdant Reach ({tool})."


def species_credits(id_: str, tool: str) -> str:
    """Default credits for a species bundle: the generator, plus the reference
    photo from artkit/species_refs.json when the species has one."""
    import json
    from pathlib import Path
    refs = json.loads((Path(__file__).with_name("species_refs.json")).read_text())
    s = f"Original pixel art for Verdant Reach, hand-pixelled in {tool}."
    if id_ in refs:
        s += f" {refs[id_]}: used as a drawing reference, not traced."
    return s
Img = Image.Image | np.ndarray


def _locked(kind: str, id_: str, root) -> dict | None:
    meta = B.read_meta(kind, id_, root)
    if meta and (meta.get("source") or {}).get("kind") in LOCKED:
        print(f"  skip {kind} {id_} (source {meta['source']['kind']})")
        return None
    return meta or {}


def species(id_: str, frames: Mapping[str, Img], tool: str, credits: str | None = None,
            root=ART) -> bool:
    """frames: 'front', 'front__2' .. 'front__8', 'back', 'icon', 'icon__2'."""
    meta = _locked("species", id_, root)
    if meta is None:
        return False
    arrs = {k: to_rgba(v) for k, v in frames.items()}
    cols = opaque_colours(*arrs.values())
    old_pal = meta.get("palette")
    if old_pal and {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in old_pal} == cols:
        palette = old_pal                       # same colours: keep the curated order
    else:
        palette = [hex_of(c) for c in order_dark_to_light(cols)]
        if old_pal:
            print(f"  note: {id_} palette changed {old_pal} -> {palette}; check its sport")
    sport = meta.get("sport") if meta.get("sport") and len(meta["sport"]) == len(palette) else legacy_sport(palette)
    out = {"palette": palette, "sport": sport,
           "credits": credits if credits is not None else meta.get("credits") or species_credits(id_, tool),
           "source": {"kind": "generated", "tool": tool}}
    if meta.get("notes"):
        out["notes"] = meta["notes"]
    if meta.get("anim"):
        out["anim"] = meta["anim"]              # hand-kept, like notes
    B.write_species(id_, arrs, out, root)
    return True


def tileset(id_: str, images: Mapping[str, Img], tool: str, name: str | None = None,
            order: list[str] | None = None, credits: str | None = None, root=ART) -> bool:
    """images: per-tile stems ('grass', 'grass~1', 'water@5__2', ...)."""
    meta = _locked("tileset", id_, root)
    if meta is None:
        return False
    sheet, tiles, cols = assemble({k: to_rgba(v) for k, v in images.items()}, order or [])
    out = {"name": name or meta.get("name") or id_.replace("_", " ").title(),
           "credits": credits if credits is not None else meta.get("credits") or DEFAULT_CREDITS.format(tool=tool),
           "source": {"kind": "generated", "tool": tool}}
    if meta.get("notes"):
        out["notes"] = meta["notes"]
    B.write_tileset(id_, sheet, tiles, cols, out, root)
    return True


def legacy_tiles(images: Mapping[str, Img], tool: str, root=ART) -> list[str]:
    """All Round 1-3 tiles at once: split by TILESETS and write each set."""
    from .sheets import parse_stem
    split: dict[str, dict] = {}
    for stem, im in images.items():
        key = parse_stem(stem)[0]
        if key not in TILESET_OF:
            raise KeyError(f"tile {key!r} has no tileset: add it to artkit/tilegroups.py")
        split.setdefault(TILESET_OF[key], {})[stem] = im
    done = []
    for ts, (name, keys) in TILESETS.items():
        if ts in split and tileset(ts, split[ts], tool, name=name, order=keys, root=root):
            done.append(ts)
    return done


def structure(id_: str, img: Img, tool: str, credits: str | None = None, root=ART,
              notes: str | None = None) -> bool:
    meta = _locked("structure", id_, root)
    if meta is None:
        return False
    out = {"credits": credits if credits is not None else meta.get("credits") or DEFAULT_CREDITS.format(tool=tool),
           "source": {"kind": "generated", "tool": tool}}
    if notes is not None or meta.get("notes"):
        out["notes"] = notes if notes is not None else meta["notes"]
    B.write_structure(id_, to_rgba(img), out, root)
    return True


def character(id_: str, img: Img, tool: str, credits: str | None = None, root=ART) -> bool:
    meta = _locked("character", id_, root)
    if meta is None:
        return False
    out = {"credits": credits if credits is not None else meta.get("credits") or DEFAULT_CREDITS.format(tool=tool),
           "source": {"kind": "generated", "tool": tool}}
    if meta.get("notes"):
        out["notes"] = meta["notes"]
    B.write_character(id_, to_rgba(img), out, root)
    return True


def set_images(set_id: str, images: Mapping[str, Img], tool: str, root=ART) -> list[str]:
    """Write entries into sets/<set_id>; each entry records its generator."""
    return B.write_set_images(set_id, {k: to_rgba(v) for k, v in images.items()},
                              entry_extra={"source": {"kind": "generated", "tool": tool}}, root=root)
