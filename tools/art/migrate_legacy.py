"""ARCHIVED one-off Round 4 migration: public/assets/** -> public/art/ bundles (ART.md).

Its source tree is gone, so with no --legacy it is a no-op.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/migrate_legacy.py [--check] [--legacy DIR]

- 53 species bundles (palette ordered darkest to lightest; `sport` seeded
  from the old runtime hue shift so sports look exactly as before);
- the tile keys grouped into themed tilesets (artkit/tilegroups.py);
- structures, characters, and the portraits / items / ui / stills sets;
- public/assets/CREDITS.md -> public/art/CREDITS.md.

Then it proves equivalence: every legacy file, resolved by its logical path
through the bundles, is pixel-identical RGBA. `--check` only runs the proof.
Bundles whose source.kind is edited/imported are left alone, so re-running
is safe once artists have started editing.

public/assets/ was deleted at the end of Round 4. To re-run the proof, pass a
copy of the old tree: `--check --legacy /path/to/old/public/assets`. (Sport
frames are compared with the hue shift only while a species' sport is still
the seeded one; once an artist designs a real sport, that line will differ
by design.)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402

from artkit import emit  # noqa: E402
from artkit.core import ART, LEGACY, load_rgba  # noqa: E402
from artkit.resolve import Resolver  # noqa: E402

SPECIES_TOOL = {}
for gen, lines in {
    "species_a": {"oak": ["oak_acorn", "oak_sapling", "great_oak"],
                  "chili": ["chili_blossom", "green_chili", "red_chili"],
                  "lily": ["lily_seedpod", "lily_pad", "giant_water_lily"],
                  "dandelion": ["dandelion_bud", "dandelion", "dandelion_clock"],
                  "bramble": ["bramble_blossom", "bramble_berry", "blackberry"],
                  "sunflower": ["sunflower_seedling", "sunflower_bud", "sunflower"]},
    "species_b": {"pumpkin": ["pumpkin_blossom", "green_pumpkin", "pumpkin"],
                  "fern": ["fern_fiddlehead", "unfurling_fern", "ostrich_fern"],
                  "flytrap": ["flytrap_seedling", "young_flytrap", "venus_flytrap"],
                  "sundew": ["sundew_rosette", "sundew"],
                  "maple": ["maple_samara", "maple_sapling", "sugar_maple"],
                  "nettle": ["nettle_sprout", "stinging_nettle"],
                  "moonflower": ["moonflower_seed", "moonflower_vine", "moonflower"]},
    "species_c": {"clover": ["clover_sprout", "white_clover"], "cattail": ["cattail_shoot", "cattail"],
                  "foxglove": ["foxglove_rosette", "foxglove"], "holly": ["holly_seedling", "holly"]},
    "species_d": {"mint": ["mint_sprig", "peppermint"], "rose": ["rose_bud", "wild_rose"],
                  "pitcher": ["pitcher_sprout", "pitcher_plant"], "snapdragon": ["snapdragon_sprout", "snapdragon"]},
}.items():
    for line, ids in lines.items():
        for sid in ids:
            SPECIES_TOOL[sid] = f"tools/art/{gen}/{line}.py"

SETS = {"trainers": ("portraits", "tools/art/portraits.py"), "items": ("items", "tools/art/items.py"),
        "ui": ("ui", "tools/art/ui.py"), "stills": ("stills", "tools/art/stills.py")}


def photo_credits() -> dict[str, str]:
    """species id -> reference-photo credit, from the legacy CREDITS.md table
    (how artkit/species_refs.json was made)."""
    out = {}
    text = (LEGACY / "CREDITS.md").read_text() if (LEGACY / "CREDITS.md").exists() else ""
    for m in re.finditer(r"^\| ([a-z_]+)[ *†]* \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$", text, re.M):
        sid, photo, author, lic, url = (g.strip() for g in m.groups())
        out[sid] = f"Reference photo {photo} by {author} ({lic}), {url}"
    return out




def legacy_files() -> list[Path]:
    return sorted(LEGACY.rglob("*.png"))


def logical(p: Path) -> str:
    return "assets/" + p.relative_to(LEGACY).as_posix()


def migrate() -> None:
    sp = LEGACY / "species"
    for d in sorted(sp.iterdir()):
        frames = {f.stem: load_rgba(f) for f in sorted(d.glob("*.png"))}
        emit.species(d.name, frames, SPECIES_TOOL[d.name])  # credits: artkit/species_refs.json
    print("species:", len(list(sp.iterdir())))
    tiles = {f.stem: load_rgba(f) for f in sorted((LEGACY / "tiles").glob("*.png"))}
    print("tilesets:", emit.legacy_tiles(tiles, "tools/art/tiles.py"), f"({len(tiles)} tile images)")
    for f in sorted((LEGACY / "structures").glob("*.png")):
        emit.structure(f.stem, load_rgba(f), "tools/art/structures.py")
    for f in sorted((LEGACY / "characters").glob("*.png")):
        emit.character(f.stem, load_rgba(f), "tools/art/characters.py")
    for d, (set_id, tool) in SETS.items():
        emit.set_images(set_id, {f.stem: load_rgba(f) for f in sorted((LEGACY / d).glob("*.png"))}, tool)
    credits = LEGACY / "CREDITS.md"
    if credits.exists() and not (ART / "CREDITS.md").exists():
        (ART / "CREDITS.md").write_text(credits.read_text())


def prove() -> int:
    r = Resolver()
    bad = []
    files = legacy_files()
    for f in files:
        want = load_rgba(f)
        got = r.image(logical(f))
        if got is None:
            bad.append(f"missing {logical(f)}")
        elif got.shape != want.shape or not np.array_equal(got, want):
            # transparent pixels may differ in RGB only if alpha is 0 in both
            if got.shape == want.shape and np.array_equal(got[..., 3], want[..., 3]) and \
                    np.array_equal(got[want[..., 3] > 0], want[want[..., 3] > 0]):
                bad.append(f"rgb under alpha=0 differs {logical(f)}")
            else:
                bad.append(f"DIFFERS {logical(f)}")
    # sport: seeded palette must equal the old hue shift applied per pixel
    from artkit.palette import legacy_sport_colour
    nsport = 0
    for d in sorted((LEGACY / "species").iterdir()):
        for f in sorted(d.glob("*.png")):
            want = load_rgba(f)
            m = want[..., 3] > 0
            exp = want.copy()
            for c in {tuple(int(v) for v in p) for p in want[m][:, :3]}:
                sel = m & np.all(want[..., :3] == c, -1)
                exp[sel, :3] = legacy_sport_colour(c)
            got = r.image(logical(f) + "?sport")
            nsport += 1
            if got is None or not np.array_equal(got, exp):
                bad.append(f"SPORT DIFFERS {logical(f)}")
    for b in bad:
        print(" ", b)
    print(f"equivalence: {len(files) - sum(not b.startswith('SPORT') for b in bad)}/{len(files)} legacy files identical, "
          f"{nsport - sum(b.startswith('SPORT') for b in bad)}/{nsport} sport frames identical")
    return 1 if bad else 0


if __name__ == "__main__":
    if "--legacy" in sys.argv:
        LEGACY = Path(sys.argv[sys.argv.index("--legacy") + 1]).resolve()
    if not LEGACY.exists():
        print(f"{LEGACY} is gone (deleted at the end of Round 4 after the migration was proven): nothing to do.\n"
              "To re-run the proof, pass a copy of the old tree: --check --legacy /path/to/old/public/assets")
        sys.exit(0)
    if "--check" not in sys.argv:
        migrate()
    sys.exit(prove())
