"""Placeholder art so new ids pass the bundle checks before the real art exists.

  python tools/art/placeholder.py species <id> [<id> ...]
  python tools/art/placeholder.py ui <name> [<name> ...]          (e.g. mark_pipe)
  python tools/art/placeholder.py items <id> [<id> ...]

Species placeholders are a plain grey blob with a "?" in the 4-colour Crystal
palette, plus a 3-frame intro, a back and 2 icons. Their notes start with
"PLACEHOLDER", which the lead greps for before release: they must never ship.
Run `npm run art:index` afterwards. An existing non-placeholder bundle is
never overwritten.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from artkit import emit  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "public" / "art"
TOOL = "tools/art/placeholder.py"
PAL = [(0x18, 0x18, 0x18), (0x70, 0x70, 0x78), (0xb8, 0xb8, 0xc0), (0xf8, 0xf8, 0xf8)]
QMARK = ["0110", "1001", "0010", "0100", "0000", "0100"]


def blob(size: int, scale: float, lift: int = 0) -> np.ndarray:
    """An outlined, shaded ellipse with a "?" on it; scale 0..1 of the canvas."""
    a = np.zeros((size, size, 4), np.uint8)
    cx, cy = size / 2, size * 0.58 - lift
    rx, ry = size * 0.42 * scale, size * 0.36 * scale
    yy, xx = np.mgrid[0:size, 0:size]
    d = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2
    inside = d <= 1.0
    shade = np.where((xx < cx) & (yy < cy), 2, 1)
    for idx in (1, 2):
        a[inside & (shade == idx)] = (*PAL[idx], 255)
    edge = inside & ~(np.roll(inside, 1, 0) & np.roll(inside, -1, 0) & np.roll(inside, 1, 1) & np.roll(inside, -1, 1))
    a[edge] = (*PAL[0], 255)
    k = max(1, size // 28)
    ox, oy = int(cx - 2 * k), int(cy - 3 * k)
    for r, row in enumerate(QMARK):
        for c, ch in enumerate(row):
            if ch == "1":
                a[oy + r * k: oy + (r + 1) * k, ox + c * k: ox + (c + 1) * k] = (*PAL[3], 255)
    return a


def is_placeholder_or_missing(kind: str, id_: str) -> bool:
    meta = ART / kind / id_ / ("species.json" if kind == "species" else f"{kind}.json")
    if not meta.exists():
        return True
    return str(json.loads(meta.read_text()).get("notes", "")).startswith("PLACEHOLDER")


def species(ids: list[str]) -> None:
    for id_ in ids:
        if not is_placeholder_or_missing("species", id_):
            print(f"skip {id_}: real art exists")
            continue
        frames = {"front": blob(56, 0.8), "front__2": blob(56, 0.84, 1), "front__3": blob(56, 0.88, 2),
                  "back": blob(48, 0.9), "icon": blob(16, 0.9), "icon__2": blob(16, 0.9, 1)}
        emit.species(id_, frames, TOOL, credits="Placeholder (no art yet).")
        meta_path = ART / "species" / id_ / "species.json"
        meta = json.loads(meta_path.read_text())
        meta["sport"] = [meta["palette"][0], "#786848", "#c0b080", meta["palette"][3]]
        meta["notes"] = "PLACEHOLDER: replace with real Crystal-rule art before release."
        meta["anim"] = {"intro": [[0, 12], [1, 8], [2, 12], [1, 8], [0, 1]], "idle": [[0, 120], [1, 10]]}
        meta_path.write_text(json.dumps(meta, indent=2) + "\n")
        print(f"placeholder species {id_}")


def images(set_id: str, names: list[str], size: tuple[int, int]) -> None:
    emit.set_images(set_id, {n: blob(size[0], 0.85) for n in names}, TOOL)
    print(f"placeholder {set_id}: {', '.join(names)}")


if __name__ == "__main__":
    kind, *ids = sys.argv[1:]
    if kind == "species":
        species(ids)
    elif kind == "ui":
        images("ui", ids, (16, 16))
    elif kind == "items":
        images("items", ids, (16, 16))
    else:
        sys.exit(__doc__)
