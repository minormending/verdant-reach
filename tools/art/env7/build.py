"""Build the frontier tiles and tools/art/review/tiles_frontier.png.

Run with the pinned art Python. --review writes only the review sheet.
Bundle writes use artkit.emit and respect edited/imported source locks.
Snow alternates are static per the bundle contract. The current TileCatalog
excludes static alternates for animated tiles, so only the base snow shimmers
in-game; enabling both needs a separate runtime/schema change outside env7.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from artkit import emit
from artkit.resolve import Resolver
import tilesets as TS

ROOT = HERE.parents[2]
REVIEW = ROOT / "tools/art/review/tiles_frontier.png"
SCENES = {
    "ice": ["......", ".III..", ".IIII.", "..III.", ".I..I.", "......"],
    "snow": ["......", ".SSS..", ".SSSS.", "..SSS.", ".S..S.", "......"],
    "root_gap": ["ddGddd", "ddGddd", "ddBddd", "ddGddd", "ddGddd", "ddGddd"],
    "root_bridge": ["ddGddd", "ddGddd", "ddBddd", "ddGddd", "ddBddd", "ddGddd"],
    "pit": ["......", "......", ".PFPF.", "......", "dddddd", "dPFPFd"],
    "filled_pit": ["......", "......", ".FPFP.", "......", "dddddd", "dFPFPd"],
}
LEGEND = {".": "floor_tile", "d": "dirt", "I": "ice", "S": "snow",
          "G": "root_gap", "B": "root_bridge", "P": "pit", "F": "filled_pit"}


def scene(rows, out, resolver):
    im = Image.new("RGBA", (96, 96))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            key = LEGEND[ch]
            stem = key
            if key == "ice":
                mask = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < 6 and 0 <= ny < 6) or rows[ny][nx] == "I":
                        mask |= bit
                stem = f"ice@{mask}"
            tile = out.get(stem)
            if tile is None:
                tile = resolver.image(f"assets/tiles/{key}.png")
                if not isinstance(tile, Image.Image):
                    tile = Image.fromarray(tile, "RGBA")
            im.paste(tile, (x * 16, y * 16))
    return im


def review(out):
    resolver = Resolver()
    sheet = Image.new("RGB", (936, 668), "#ece8d8")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "FRONTIER / original tiles / 4x nearest neighbour / 6x6 scenes", fill="#383840")
    for i, key in enumerate(TS.ORDER):
        x, y = 12 + (i % 3) * 308, 32 + (i // 3) * 312
        d.text((x, y), key.upper(), fill="#383840")
        sheet.paste(out[key].resize((64, 64), Image.Resampling.NEAREST), (x, y + 20))
        extras = ["snow__2", "snow~1", "snow~2", "snow~3"] if key == "snow" else []
        if key == "ice":
            extras = ["ice@0", "ice@5", "ice@10"]
        for j, stem in enumerate(extras):
            xx = x + 72 + j * 52
            sheet.paste(out[stem].resize((48, 48), Image.Resampling.NEAREST), (xx, y + 20))
            d.text((xx, y + 72), stem.split("snow")[-1] or "base", fill="#383840")
        patch = scene(SCENES[key], out, resolver)
        sheet.paste(patch.resize((192, 192), Image.Resampling.NEAREST), (x, y + 96))
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW)


def build(save=True):
    out = TS.images()
    TS.check(out)
    if save:
        emit.tileset("frontier", out, "tools/art/env7/tilesets.py", name="Frontier",
                     order=TS.ORDER, credits="Original pixel art for Verdant Reach (frontier environment).")
    review(out)
    print(f"frontier: {len(out)} tile images; review: {REVIEW.relative_to(ROOT)}")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
