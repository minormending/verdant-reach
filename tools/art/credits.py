"""Write public/assets/CREDITS.md from the photo pipeline's sources.json files.

Lists, per species, the photo each sprite was traced from (author, licence,
source page), plus a note on the hand-made art. Run after species.py.
"""

from __future__ import annotations

import json

import gbc
from species import LINES, PHOTOS, S

ACCEPTED = ("public domain", "cc0", "cc by 2.0", "cc by 3.0", "cc by 4.0", "cc by 2.5", "cc-by", "pdm",
            "public domain mark", "us government", "usda", "no known copyright")


STANDIN = ("acer rubrum", "red maple", "gracilis", "not robur", "white oak", "related species", "stand-in",
           "substitute", "nymphaea", "species isn't stated", "species not stated", "unconfirmed", "drosera aliciae",
           "not d. rotundifolia", "identified to genus")


def is_standin(note: str) -> bool:
    return any(k in (note or "").lower() for k in STANDIN)


def stage_photo(line, stage):
    d = PHOTOS / line
    overrides = json.loads((d / "sprite.json").read_text()) if (d / "sprite.json").exists() else {}
    species_cfg = {k: v for k, v in overrides.items() if k not in S.STAGES}
    cfg = {**species_cfg, **overrides.get(stage, {})}
    name = cfg.get("photo") or next((p.name for p in sorted(d.glob(f"{stage}.*"))), None)
    sources = json.loads((d / "sources.json").read_text())
    return name, sources.get(name, {})


def main():
    lines = [
        "# Verdant Reach - art credits",
        "",
        "## Creature sprites",
        "",
        "Every Quickened sprite is traced from a real photograph of the plant by the",
        "photo -> GBC sprite pipeline (`creature-sprites/tool/spritify.py`), then reduced",
        "to 4 colours. Back views and party icons are derived from the same cut-outs",
        "(`tools/art/species.py`). The photographers below made them possible; each",
        "photo is used under the licence shown (public domain, CC0 or CC BY - no",
        "share-alike, non-commercial or no-derivatives licences).",
        "",
        "| Species | Photo | Author | Licence | Source |",
        "|---|---|---|---|---|",
    ]
    bad = []
    for line, stages in LINES.items():
        for stage, sid in stages:
            name, src = stage_photo(line, stage)
            lic = src.get("license", "?")
            if any(x in lic.lower() for x in ("-sa", " sa", "nc", "nd", "share")) or lic == "?":
                bad.append((sid, lic))
            note = src.get("notes", "")
            sub = " *" if is_standin(note) else ""
            lines.append(f"| {sid}{sub} | {line}/{name} | {src.get('author', '?')} | {lic} | "
                         f"{src.get('source_page_url', '?')} |")
    lines += [
        "",
        "\\* See the notes below: the photo shows a related species or variety stand-in.",
        "",
        "### Notes on stand-in species",
        "",
    ]
    for line, stages in LINES.items():
        for stage, sid in stages:
            name, src = stage_photo(line, stage)
            note = (src.get("notes") or "").replace("\n", " ")
            if is_standin(note):
                lines.append(f"- **{sid}** ({line}/{name}): {note}")
    lines += [
        "",
        "## Everything else",
        "",
        "Tiles, buildings, overworld characters, trainer portraits, item icons, the",
        "title screen, logo, pods and Pressed Marks are original pixel art made for",
        "this game with the generators in `tools/art/` (hand-authored pixel maps and",
        "parametric templates). No third-party art is used for them.",
        "",
    ]
    (gbc.ASSETS / "CREDITS.md").write_text("\n".join(lines))
    print("wrote CREDITS.md")
    for b in bad:
        print("CHECK LICENCE:", b)


if __name__ == "__main__":
    main()
