"""Build the `traced` demo art pack: public/art/packs/traced/.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/import_traced.py

The proof that art swaps cleanly (ART.md §8). It brings back the original
photo-traced sprites from the creature-sprites pipeline's plant test
(creature-sprites/out/plants/<line>/<stage>.png) for the sunflower, oak,
pumpkin, Venus flytrap and fern lines, as pack overrides of our species:

- front.png: the traced 56x56 sprite, as the pipeline made it (4 colours).
- back.png:  a 48x48 back view traced from the same photo cut-out with the
             old pipeline code (tools/art/species.py make_back), snapped to
             the front's 4 colours.
- icons:     NOT supplied, so they fall back to the base icons recoloured
             index by index into the pack palette (the §8 fallback path).
- palette/sport: the tracer's palette; sport seeded with the old hue shift.

Plus two palette-only overrides (no images at all): chili_blossom and
red_chili wear the colours the photo tracer picked for them in Round 1
(creature-sprites/out/game/manifest.json).

Needs the creature-sprites venv (cv2 + its tool/ modules) and the cut-outs
cached in creature-sprites/out/cache. Deterministic: re-running rewrites
nothing.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from artkit import bundles as B  # noqa: E402
from artkit.core import ART, FORMATS, load_rgba, save_json, save_png  # noqa: E402
from artkit.palette import hex_of, legacy_sport, opaque_colours  # noqa: E402

CS = Path("/Users/kevinramdath/projects/research/creature-sprites")
PACK = ART / "packs" / "traced"
LINES = {
    "sunflower": [("baby", "sunflower_seedling"), ("teen", "sunflower_bud"), ("adult", "sunflower")],
    "oak": [("baby", "oak_acorn"), ("teen", "oak_sapling"), ("adult", "great_oak")],
    "pumpkin": [("baby", "pumpkin_blossom"), ("teen", "green_pumpkin"), ("adult", "pumpkin")],
    "venus_flytrap": [("baby", "flytrap_seedling"), ("teen", "young_flytrap"), ("adult", "venus_flytrap")],
    "fern": [("baby", "fern_fiddlehead"), ("teen", "unfurling_fern"), ("adult", "ostrich_fern")],
}
RECOLOUR = {"chili_blossom": ("chili", "baby"), "red_chili": ("chili", "adult")}


def credit(entry: dict) -> str:
    return (f"Photo-traced by the creature-sprites pipeline (tool/spritify.py) from "
            f"{entry['photo']} by {entry['author']} ({entry['license']}), {entry['source_page_url']}.")


def traced_species() -> list[str]:
    import species as SP  # the old Round 1 photo-trace tool, reused for the back view
    SP.S.set_out(CS / "out" / "plants")
    SP.PHOTOS = CS / "photos" / "plants"
    manifest = {(e["species"], e["stage"]): e for e in json.loads((CS / "out/plants/manifest.json").read_text())}
    credits_rows = []
    for line, stages in LINES.items():
        for stage, sid in stages:
            src = CS / "out" / "plants" / line / f"{stage}.png"
            fim = Image.open(src)
            pal_rgb = SP.front_palette(fim)                      # black, dark, light, white
            front = np.asarray(fim.convert("RGBA")).copy()
            assert front.shape[:2] == (56, 56)
            cfg, rgba = SP.stage_cfg(line, stage)
            back = np.asarray(SP.make_back(rgba, cfg, SP.S.STAGES[stage], pal_rgb)).copy()
            # make_back shades the two mid tones ~14% darker: snap them back
            # onto the front's colours so the bundle keeps exactly 4
            shaded = [SP.S.gbc(np.array(c) * SP.SHADE) for c in pal_rgb[1:3]]
            for c_from, c_to in zip(shaded, pal_rgb[1:3]):
                m = (back[..., 3] > 0) & np.all(back[..., :3] == np.array(c_from, np.uint8), -1)
                back[m, :3] = c_to
            palette = [hex_of(c) for c in pal_rgb]
            used = {hex_of(c) for c in opaque_colours(front, back)}
            assert used <= set(palette), (sid, used, palette)
            e = manifest[(line, stage)]
            d = PACK / "species" / sid
            save_png(d / "front.png", front)
            save_png(d / "back.png", back)
            base = B.read_meta("species", sid)
            save_json(d / "species.json", B.ordered("species", {
                "format": FORMATS["species"], "id": sid,
                "palette": palette, "sport": legacy_sport(palette),
                # icons are not in the pack folder: the base icons are recoloured
                # into this palette (ART.md §8)
                "frames": {"front": ["front.png"], "back": ["back.png"], "icon": base["frames"]["icon"]},
                "credits": credit(e) + " Back view traced from the same cut-out; party icons are the base "
                           "icons recoloured.",
                "source": {"kind": "imported", "from": f"creature-sprites/out/plants/{line}/{stage}.png"},
            }))
            credits_rows.append(f"| {sid} | {line}/{stage} | {e['photo']} | {e['author']} | {e['license']} | "
                                f"{e['source_page_url']} |")
            print(f"traced {sid:20} <- {line}/{stage}  {palette}")
    return credits_rows


def recoloured() -> list[str]:
    game = {(e["species"], e["stage"]): e for e in json.loads((CS / "out/game/manifest.json").read_text())}
    rows = []
    for sid, (line, stage) in RECOLOUR.items():
        e = game[(line, stage)]
        palette = [h.lower() for h in e["palette"]]
        save_json(PACK / "species" / sid / "species.json", B.ordered("species", {
            "format": FORMATS["species"], "id": sid,
            "palette": palette, "sport": legacy_sport(palette),
            "credits": f"Palette only: the colours the photo tracer chose for {e['photo']} in Round 1. "
                       "The pixels are the base bundle's.",
            "source": {"kind": "imported", "from": "creature-sprites/out/game/manifest.json (palette)"},
        }))
        rows.append(f"| {sid} | palette only | {e['photo']} (colours) | {e['author']} | {e['license']} | "
                    f"{e['source_page_url']} |")
        print(f"palette {sid:20} {palette}")
    return rows


def main() -> None:
    PACK.mkdir(parents=True, exist_ok=True)
    rows = traced_species() + recoloured()
    save_json(PACK / "pack.json", B.ordered("pack", {
        "format": FORMATS["pack"], "id": "traced", "name": "PHOTO TRACED",
        "description": "The original photo-traced sprites for the sunflower, oak, pumpkin, flytrap and fern "
                       "lines, plus the tracer's colours for two chili stages.",
        "author": "creature-sprites photo -> GBC pipeline (Round 1), packed by tools/art/import_traced.py",
        "credits": "See CREDITS.md in this folder: every traced sprite comes from a credited, "
                   "reuse-licensed photograph.",
    }))
    (PACK / "CREDITS.md").write_text("\n".join([
        "# PHOTO TRACED pack: credits",
        "",
        "These sprites were made automatically by the creature-sprites pipeline",
        "(`tool/spritify.py`): each photo was cut out, traced at 4x, reduced to 4",
        "colours and outlined. Back views were traced from the same cut-out by the",
        "Round 1 tool (`tools/art/species.py`). They are photo traces, not hand-drawn",
        "art; the photographers below made them possible. Licences: public domain,",
        "CC0 or CC BY (no share-alike, non-commercial or no-derivatives).",
        "",
        "| Species | Source | Photo | Author | Licence | Source page |",
        "|---|---|---|---|---|---|",
        *rows,
        "",
    ]))
    print("wrote", PACK.relative_to(ART.parent.parent))


if __name__ == "__main__":
    main()
