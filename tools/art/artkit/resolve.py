"""Logical path -> pixels, exactly as ART.md §2 (and the runtime in src/art/).

    r = Resolver()                       # base bundles
    r = Resolver(packs=["traced"])       # with packs, later packs win
    a = r.image("assets/tiles/water@5__2.png")   # HxWx4 uint8, or None
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import numpy as np

from . import bundles as B
from .core import ART
from .sheets import cell, parse_stem

SPECIES_RE = re.compile(r"^assets/species/([a-z0-9_]+)/(front|front__[2-8]|back|icon|icon__2)\.png(\?sport)?$")
FLAT_RE = re.compile(r"^assets/(tiles|structures|characters|trainers|items|ui|stills)/([^/]+)\.png$")


class Resolver:
    def __init__(self, root: Path = ART, packs: list[str] | tuple[str, ...] = ()):
        self.root = Path(root)
        self.packs = tuple(packs)
        self._tile_owner: dict[str, str] | None = None
        self._sets: dict[str, str] | None = None
        self._bundle = lru_cache(maxsize=None)(self._load)

    def _load(self, kind: str, id_: str) -> B.Bundle | None:
        try:
            return B.load(kind, id_, self.root, self.packs)
        except FileNotFoundError:
            return None

    def bundle(self, kind: str, id_: str) -> B.Bundle | None:
        return self._bundle(kind, id_)

    def tile_owner(self) -> dict[str, str]:
        """TileKey -> tileset id (including tiles a pack tileset adds)."""
        if self._tile_owner is None:
            owner: dict[str, str] = {}
            ids = set(B.list_ids("tileset", self.root))
            for pk in self.packs:
                ids |= set(B.list_ids("tileset", self.root / "packs" / pk))
            for ts in sorted(ids):
                b = self.bundle("tileset", ts)
                for key in (b.data.get("tiles") or {}) if b else {}:
                    owner.setdefault(key, ts)
            self._tile_owner = owner
        return self._tile_owner

    def set_for_dir(self) -> dict[str, str]:
        if self._sets is None:
            self._sets = {}
            for sid in B.list_ids("set", self.root):
                b = self.bundle("set", sid)
                if b:
                    self._sets[b.data["logicalDir"]] = sid
        return self._sets

    def image(self, path: str) -> np.ndarray | None:
        m = SPECIES_RE.match(path)
        if m:
            b = self.bundle("species", m.group(1))
            if not b or m.group(2) not in b.frame_kinds():
                return None
            return b.frame(m.group(2), sport=bool(m.group(3)))
        m = FLAT_RE.match(path)
        if not m:
            return None
        d, name = m.groups()
        if d == "tiles":
            key, kind, n, frame = parse_stem(name)
            ts = self.tile_owner().get(key)
            b = self.bundle("tileset", ts) if ts else None
            if not b:
                return None
            entry = b.data["tiles"][key]
            if kind == "base":
                ref = entry["base"]
            elif kind == "alt":
                alts = entry.get("alts", [])
                if n > len(alts):
                    return None
                ref = alts[n - 1]
            else:
                ref = entry.get("masks", {}).get(str(n))
                if ref is None:
                    return None
            cells = [ref] if isinstance(ref, int) else ref
            if frame > len(cells):
                return None
            sheet = b.image(b.data["sheet"])
            return cell(sheet, cells[frame - 1], b.data["columns"], b.data.get("tileSize", 16))
        if d == "structures":
            b = self.bundle("structure", name)
            return b.image(b.data["image"]) if b else None
        if d == "characters":
            b = self.bundle("character", name)
            return b.image(b.data["sheet"]) if b else None
        sid = self.set_for_dir().get(f"assets/{d}")
        b = self.bundle("set", sid) if sid else None
        if not b or name not in b.data.get("images", {}):
            return None
        return b.image(b.data["images"][name]["file"])

    def paths(self) -> list[str]:
        """Every logical path the bundles provide (base frames, no ?sport)."""
        out = []
        for sid in B.list_ids("species", self.root):
            b = self.bundle("species", sid)
            out += [f"assets/species/{sid}/{k}.png" for k in b.frame_kinds()]
        from .sheets import refs_of, stem_of
        for key, ts in sorted(self.tile_owner().items()):
            entry = self.bundle("tileset", ts).data["tiles"][key]
            out += [f"assets/tiles/{stem_of(key, k, n, f)}.png" for k, n, f, _ in refs_of(entry)]
        out += [f"assets/structures/{s}.png" for s in B.list_ids("structure", self.root)]
        out += [f"assets/characters/{s}.png" for s in B.list_ids("character", self.root)]
        for d, sid in sorted(self.set_for_dir().items()):
            out += [f"{d}/{k}.png" for k in self.bundle("set", sid).data.get("images", {})]
        return sorted(out)
