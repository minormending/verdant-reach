"""Load and save every bundle type (ART.md §3-§8).

A `Bundle` is the parsed JSON plus the folders its files resolve in: the
pack folder(s) first, then the base folder. Writers always produce the
default file names and the canonical key order, so output is deterministic.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from .core import ART, FORMATS, KINDS, LOCKED, load_json, load_rgba, save_json, save_png
from .palette import remap

SPECIES_FRAMES = {  # frame group -> (size, min, max, default file names)
    "front": (56, 1, 8, ["front.png"] + [f"front__{i}.png" for i in range(2, 9)]),
    "back": (48, 1, 1, ["back.png"]),
    "icon": (16, 1, 2, ["icon.png", "icon__2.png"]),
}
# legacy kind name ("front__2") -> (group, index)
SPECIES_KINDS = {"front": ("front", 0), **{f"front__{i}": ("front", i - 1) for i in range(2, 9)},
                 "back": ("back", 0), "icon": ("icon", 0), "icon__2": ("icon", 1)}
SETS = {  # set id -> logicalDir
    "portraits": "assets/trainers",
    "items": "assets/items",
    "ui": "assets/ui",
    "stills": "assets/stills",
}
CHAR_FRAME = [16, 16]
CHAR_ROWS = ["down", "up", "left", "right"]
CHAR_COLUMNS = ["stand", "stepA", "stepB"]

KEY_ORDER = {
    "species": ["format", "id", "palette", "sport", "frames", "anim", "credits", "source", "notes"],
    "tileset": ["format", "id", "name", "tileSize", "sheet", "columns", "tiles", "credits", "source", "notes"],
    "structure": ["format", "id", "image", "size", "credits", "source", "notes"],
    "character": ["format", "id", "sheet", "frame", "rows", "columns", "credits", "source", "notes"],
    "set": ["format", "id", "logicalDir", "images", "credits", "notes"],
    "pack": ["format", "id", "name", "description", "author", "credits", "notes"],
}


def ordered(kind: str, data: dict) -> dict:
    order = KEY_ORDER[kind]
    out = {k: data[k] for k in order if k in data}
    out.update({k: v for k, v in data.items() if k not in out})
    return out


@dataclass
class Bundle:
    kind: str
    id: str
    data: dict[str, Any]
    dirs: list[Path] = field(default_factory=list)   # search order: packs first, base last
    base: dict[str, Any] | None = None               # the base JSON when a pack overrides it

    @property
    def dir(self) -> Path:
        return self.dirs[-1]

    @property
    def source_kind(self) -> str:
        return (self.data.get("source") or {}).get("kind", "generated")

    @property
    def locked(self) -> bool:
        return self.source_kind in LOCKED

    def file(self, name: str) -> Path:
        for d in self.dirs:
            if (d / name).exists():
                return d / name
        return self.dirs[-1] / name

    def image(self, name: str) -> np.ndarray:
        """A file of this bundle as RGBA. For species, a file that comes from
        the base folder is recoloured from the base palette into the
        effective palette (palette-only pack overrides, ART.md §8)."""
        p = self.file(name)
        a = load_rgba(p)
        if (self.kind == "species" and self.base is not None and p.parent == self.dirs[-1]
                and self.base.get("palette") and self.data.get("palette")
                and self.base.get("palette") != self.data.get("palette")):
            a = remap(a, self.base["palette"], self.data["palette"])
        return a

    # ---- species helpers
    def frame(self, kind: str, sport: bool = False) -> np.ndarray:
        group, i = SPECIES_KINDS[kind]
        a = self.image(self.data["frames"][group][i])
        if sport:
            sport_map = self.data["sport"]
            if isinstance(sport_map, dict):
                a = remap(a, list(sport_map), list(sport_map.values()))
            else:
                a = remap(a, self.data["palette"], sport_map)
        return a

    def frame_kinds(self) -> list[str]:
        fr = self.data.get("frames", {})
        return [k for k, (g, i) in SPECIES_KINDS.items() if i < len(fr.get(g, []))]


def bundle_dir(kind: str, id_: str, root: Path = ART) -> Path:
    return root / KINDS[kind][0] / id_


def json_path(kind: str, id_: str, root: Path = ART) -> Path:
    return bundle_dir(kind, id_, root) / KINDS[kind][1]


def exists(kind: str, id_: str, root: Path = ART) -> bool:
    return json_path(kind, id_, root).exists()


def list_ids(kind: str, root: Path = ART) -> list[str]:
    d = root / KINDS[kind][0]
    if not d.exists():
        return []
    return sorted(p.name for p in d.iterdir() if (p / KINDS[kind][1]).exists())


def list_packs(root: Path = ART) -> list[str]:
    d = root / "packs"
    return sorted(p.name for p in d.iterdir() if (p / "pack.json").exists()) if d.exists() else []


def load(kind: str, id_: str, root: Path = ART, packs: list[str] | tuple[str, ...] = ()) -> Bundle:
    """Load a bundle, with any packs (later packs win) merged shallowly over it."""
    base_p = json_path(kind, id_, root)
    data: dict | None = load_json(base_p) if base_p.exists() else None
    base = dict(data) if data is not None else None
    dirs = [bundle_dir(kind, id_, root)]
    for pk in packs:
        pp = json_path(kind, id_, root / "packs" / pk)
        if pp.exists():
            over = load_json(pp)
            if kind == "species" and data and over.get("format", data.get("format")) != data.get("format"):
                data = {k:v for k,v in data.items() if k not in ("palette", "sport", "size")}
            data = {**(data or {}), **over}
            dirs.insert(0, pp.parent)
    if data is None:
        raise FileNotFoundError(base_p)
    return Bundle(kind, id_, data, dirs, base if len(dirs) > 1 else None)


def load_pack(pack_id: str, root: Path = ART) -> dict:
    return load_json(root / "packs" / pack_id / "pack.json")


def read_meta(kind: str, id_: str, root: Path = ART) -> dict | None:
    p = json_path(kind, id_, root)
    return load_json(p) if p.exists() else None


def _clean(d: Path, keep: set[str]) -> None:
    """Remove PNGs in a bundle folder that the JSON no longer names."""
    if not d.exists():
        return
    for f in d.glob("*.png"):
        if f.name not in keep:
            f.unlink()


# ----------------------------------------------------------------- writers ---
def write_species(id_: str, frames: dict[str, np.ndarray], meta: dict, root: Path = ART) -> Path:
    """frames: legacy kind -> RGBA ('front', 'front__2', ..., 'icon__2').
    meta: palette, sport, credits, source, notes (palette/sport required)."""
    d = bundle_dir("species", id_, root)
    groups: dict[str, list[str]] = {}
    for kind, (g, i) in SPECIES_KINDS.items():
        if kind in frames:
            names = SPECIES_FRAMES[g][3]
            groups.setdefault(g, []).append(names[i])
            save_png(d / names[i], frames[kind])
    data = {"format": FORMATS["species"], "id": id_, **meta,
            "frames": {g: groups[g] for g in ("front", "back", "icon") if g in groups}}
    _clean(d, {n for v in groups.values() for n in v})
    return save_json(d / "species.json", ordered("species", data))


def write_tileset(id_: str, sheet: np.ndarray, tiles: dict, columns: int, meta: dict, root: Path = ART) -> Path:
    d = bundle_dir("tileset", id_, root)
    save_png(d / "sheet.png", sheet)
    data = {"format": FORMATS["tileset"], "id": id_, "tileSize": 16, "sheet": "sheet.png",
            "columns": columns, "tiles": tiles, **meta}
    _clean(d, {"sheet.png"})
    return save_json(d / "tileset.json", ordered("tileset", data))


def write_structure(id_: str, img: np.ndarray, meta: dict, root: Path = ART) -> Path:
    d = bundle_dir("structure", id_, root)
    save_png(d / "structure.png", img)
    data = {"format": FORMATS["structure"], "id": id_, "image": "structure.png",
            "size": [img.shape[1] // 16, img.shape[0] // 16], **meta}
    _clean(d, {"structure.png"})
    return save_json(d / "structure.json", ordered("structure", data))


def write_character(id_: str, img: np.ndarray, meta: dict, root: Path = ART) -> Path:
    d = bundle_dir("character", id_, root)
    save_png(d / "sheet.png", img)
    data = {"format": FORMATS["character"], "id": id_, "sheet": "sheet.png", "frame": CHAR_FRAME,
            "rows": CHAR_ROWS, "columns": CHAR_COLUMNS, **meta}
    _clean(d, {"sheet.png"})
    return save_json(d / "character.json", ordered("character", data))


def write_set_images(set_id: str, images: dict[str, np.ndarray], meta: dict | None = None,
                     entry_extra: dict | None = None, root: Path = ART, skip_locked: bool = True) -> list[str]:
    """Add/replace images in a flat set, keeping every other entry. An entry
    with `"source": {"kind": "edited"|"imported"}` is never overwritten when
    `skip_locked`. Returns the keys written."""
    d = bundle_dir("set", set_id, root)
    data = read_meta("set", set_id, root) or {
        "format": FORMATS["set"], "id": set_id, "logicalDir": SETS[set_id], "images": {},
        "credits": "Original pixel art for Verdant Reach."}
    if meta:
        data.update(meta)
    written = []
    imgs = data.setdefault("images", {})
    for key, a in images.items():
        old = imgs.get(key)
        if skip_locked and old and (old.get("source") or {}).get("kind") in LOCKED:
            print(f"  skip {set_id}/{key} (source {old['source']['kind']})")
            continue
        entry = {"file": f"{key}.png", "size": [int(a.shape[1]), int(a.shape[0])]}
        if entry_extra:
            entry.update(entry_extra)
        if old:  # keep extra fields someone added (notes, ...), refresh file/size
            entry = {**old, **entry}
        save_png(d / entry["file"], a)
        imgs[key] = entry
        written.append(key)
    data["images"] = dict(sorted(imgs.items()))
    save_json(d / "set.json", ordered("set", data))
    return written


def copy_bundle(kind: str, src_id: str, dst_id: str, root: Path = ART) -> Path:
    src, dst = bundle_dir(kind, src_id, root), bundle_dir(kind, dst_id, root)
    if dst.exists():
        raise FileExistsError(dst)
    shutil.copytree(src, dst)
    data = load_json(dst / KINDS[kind][1])
    data["id"] = dst_id
    save_json(dst / KINDS[kind][1], ordered(kind, data))
    return dst
