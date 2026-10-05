"""Paths, deterministic PNG/JSON I/O and contract parsing for artkit.

Everything that writes bytes goes through `save_png` / `save_json`, so the
same pixels and the same data always produce the same files (the
byte-identical `build_all.py --regen` guarantee rests on this).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
PUBLIC = ROOT / "public"
ART = PUBLIC / "art"
LEGACY = PUBLIC / "assets"
IDS_TS = ROOT / "src" / "contracts" / "ids.ts"

FORMATS = {
    "species": "verdant.species/1",
    "tileset": "verdant.tileset/1",
    "structure": "verdant.structure/1",
    "character": "verdant.character/1",
    "set": "verdant.imageset/1",
    "pack": "verdant.pack/1",
}
# bundle kind -> (folder under art/, json file name)
KINDS = {
    "species": ("species", "species.json"),
    "tileset": ("tilesets", "tileset.json"),
    "structure": ("structures", "structure.json"),
    "character": ("characters", "character.json"),
    "set": ("sets", "set.json"),
}
LOCKED = ("edited", "imported")  # source kinds a generator must never overwrite


# ----------------------------------------------------------------- images ---
def load_rgba(path: Path | str) -> np.ndarray:
    """PNG (any mode) -> HxWx4 uint8 RGBA array."""
    with Image.open(path) as im:
        return np.asarray(im.convert("RGBA")).copy()


def to_rgba(im: Image.Image | np.ndarray) -> np.ndarray:
    if isinstance(im, np.ndarray):
        return im.astype(np.uint8)
    return np.asarray(im.convert("RGBA")).copy()


def png_bytes(a: np.ndarray) -> bytes:
    import io
    buf = io.BytesIO()
    Image.fromarray(np.ascontiguousarray(a, dtype=np.uint8), "RGBA").save(buf, format="PNG", compress_level=9)
    return buf.getvalue()


def save_png(path: Path | str, img: Image.Image | np.ndarray) -> Path:
    """Write an RGBA PNG (colour type 6, no metadata). Only rewrites the file
    when the bytes differ, so mtimes stay put on a no-op regen."""
    p = Path(path)
    data = png_bytes(to_rgba(img))
    if p.exists() and p.read_bytes() == data:
        return p
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return p


# ------------------------------------------------------------------- json ---
def _inline(v: Any) -> str | None:
    """Compact form for scalars, scalar lists and small flat objects."""
    if not isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        if all(not isinstance(x, (dict, list)) or (isinstance(x, list) and all(not isinstance(y, (dict, list)) for y in x))
               for x in v):
            s = "[" + ", ".join(_inline(x) for x in v) + "]"
            return s if len(s) <= 132 else None
        return None
    parts = []
    for k, x in v.items():
        ix = _inline(x)
        if ix is None:
            return None
        parts.append(f"{json.dumps(k)}: {ix}")
    s = "{ " + ", ".join(parts) + " }" if parts else "{}"
    return s if len(s) <= 132 else None


def dumps(v: Any, indent: int = 0, top: bool = True) -> str:
    """Readable deterministic JSON: small things inline, big things indented."""
    if not top:
        ix = _inline(v)
        if ix is not None:
            return ix
    pad = "  " * (indent + 1)
    end = "  " * indent
    if isinstance(v, dict):
        if not v:
            return "{}"
        items = [f"{pad}{json.dumps(k)}: {dumps(x, indent + 1, False)}" for k, x in v.items()]
        return "{\n" + ",\n".join(items) + "\n" + end + "}"
    if isinstance(v, list):
        if not v:
            return "[]"
        ix = _inline(v)
        if ix is not None and not top:
            return ix
        items = [f"{pad}{dumps(x, indent + 1, False)}" for x in v]
        return "[\n" + ",\n".join(items) + "\n" + end + "]"
    return json.dumps(v, ensure_ascii=False)


def save_json(path: Path | str, data: Any) -> Path:
    p = Path(path)
    text = dumps(data) + "\n"
    if p.exists() and p.read_text() == text:
        return p
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return p


def load_json(path: Path | str) -> Any:
    return json.loads(Path(path).read_text())


# -------------------------------------------------------------- contracts ---
def _const_list(src: str, name: str) -> list[str]:
    m = re.search(rf"export const {name} = \[(.*?)\] as const", src, re.S)
    if not m:
        return []
    body = re.sub(r"//[^\n]*", "", m.group(1))
    return re.findall(r'"([a-z0-9_]+)"', body)


def _const_keys(src: str, name: str) -> list[str]:
    m = re.search(rf"export const {name} = \{{(.*?)\n\}} as const", src, re.S)
    if not m:
        return []
    body = re.sub(r"//[^\n]*", "", m.group(1))
    return re.findall(r"^\s*([a-z0-9_]+)\s*:", body, re.M)


def contracts() -> dict[str, Any]:
    """The ids the game requires, parsed from src/contracts/ids.ts."""
    src = IDS_TS.read_text()
    m = re.search(r"const STRUCTURE(?:S|_SPECS) = \{(.*?)\n\} as const", src, re.S)
    structures = {g[0]: (int(g[1]), int(g[2])) for g in
                  re.findall(r"^\s*([a-z_]+):\s*\{ w: (\d+), h: (\d+)", m.group(1) if m else "", re.M)}
    return {
        "species": _const_list(src, "SPECIES_IDS"),
        "tiles": _const_keys(src, "TILES"),
        "structures": structures,
        "characters": _const_list(src, "CHARACTERS"),
        "portraits": _const_list(src, "TRAINER_PORTRAITS"),
        "items": _const_list(src, "REQUIRED_ITEMS"),
        "stills": _const_list(src, "STILLS"),
    }


def rel(p: Path) -> str:
    try:
        return p.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)
