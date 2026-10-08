"""Validate the art bundles and rebuild public/art/index.json; with --regen,
first re-run every generator.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/build_all.py                  validate + index (no pixels change)
  $PY tools/art/build_all.py --regen          run all BUILDERS, then validate + index
  $PY tools/art/build_all.py --regen tiles crystal     only those builders
  $PY tools/art/build_all.py --list           list the builders

Generators are authoring tools, not the source of truth: public/art/ is.
A regen reproduces every `source.kind: "generated"` bundle byte-identically
and never touches `edited` or `imported` ones (artkit.emit enforces this).
Exits non-zero on any validation error or a stale index; required paths that
nobody provides yet are reported but only fail with --strict.

To add a generator, append one line to BUILDERS: a name plus either a module
with build() in tools/art/, or a script path run with this Python from the
repo root. Order matters only where noted.

The old photo auto-trace (species.py) and the pre-Crystal species generators
(species_a/ to species_f/) are reference tools and are NOT run.
"""

from __future__ import annotations

import importlib
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

# (name, "module:function" in tools/art, or "path/to/script.py" relative to tools/art)
BUILDERS: list[tuple[str, str]] = [
    ("tiles", "tiles:build"),
    ("structures", "structures:build"),
    ("characters", "characters:build"),   # after tiles: the hedge gate samples the hedge tile
    ("portraits", "portraits:build"),
    ("items", "items:build"),
    ("ui", "ui:build"),
    ("stills", "stills:build"),
    # Every species, Crystal rule (docs/ROLLOUT.md): runs each tools/art/crystal/<line>.py
    # that defines build(). The old species_a-f generators stay as reference only; they
    # are NOT run, so a --regen never reverts the redraw (the old look is the `classic` pack).
    ("crystal", "crystal/build.py"),
    ("env4", "env4/build.py"),            # Chapter 4 tilesets + structures
    ("cast4", "cast4/build.py"),          # Chapter 4 characters, portraits, items, UI, stills
    ("cast5", "cast5/build.py"),          # Chapter 5 characters, portraits, stills, PIPE MARK, item icons
    ("env5", "env5/build.py"),            # Chapter 5 tilesets + structures
    ("env6", "env6/build.py"),            # Chapter 6 coast, island and harbour structures
    ("cast6", "cast6/build.py"),          # Chapter 6 cast, portraits, items, Marks, raft and healed tree
    ("env7", "env7/build.py"),            # Frontier ice, snow, living bridges and boulder pits
    ("cast7", "cast7/build.py"),          # Chapter 7 cast, portraits, emitter, CRIMSON LILY, pack icon, Mark, stills
    ("env8", "env8/build.py"),            # Chapter 7 alpine and hideout tiles, Larchmere structures (after tiles: red_water recolours water)
    ("cast8", "cast8/build.py"),          # Chapter 8 MERCER, MERCER and WREN portraits, RELAY KEYCARD icon, hub-map still
    ("env9", "env9/build.py"),            # Chapter 8 Root Relay upper floors (after tiles and env4: props drawn over wall, cable_floor, paving)
    ("cast9", "cast9/build.py"),          # Chapter 9 ROOK, the stone botanist, the tumbleweed, ROOK portrait, FIG ROOT, RESIN MARK, dragon-trees still
    ("env10", "env10/build.py"),          # Chapter 9 desert, canyon and ridge tiles, Thistledown and Sanguine Ridge structures (after tiles: scrub sits on the sand colour)
]


def run_builder(name: str, target: str) -> None:
    t = time.time()
    if target.endswith(".py"):
        subprocess.run([sys.executable, str(HERE / target)], check=True, cwd=ROOT,
                       stdout=subprocess.DEVNULL)
    else:
        mod, fn = target.split(":")
        getattr(importlib.import_module(mod), fn)()
    print(f"  built {name} ({time.time() - t:.1f}s)")


def main(argv: list[str]) -> int:
    from artkit import index
    from artkit.validate import validate

    if "--list" in argv:
        for n, t in BUILDERS:
            print(f"{n:14} {t}")
        return 0
    if "--regen" in argv:
        only = [a for a in argv if not a.startswith("-")]
        unknown = set(only) - {n for n, _ in BUILDERS}
        if unknown:
            print("unknown builders:", sorted(unknown))
            return 2
        for n, t in BUILDERS:
            if not only or n in only:
                run_builder(n, t)
    print(index.rebuild())
    probs = validate()
    errs = [p for p in probs if p[0] == "error"]
    miss = [p for p in probs if p[0] == "missing"]
    for lvl, w, m in errs + (miss if "--strict" in argv else []):
        print(f"{lvl.upper()}: {w}: {m}")
    print(f"validate: {len(errs)} error(s); {len(miss)} required path(s) not yet provided")
    return 1 if errs or ("--strict" in argv and miss) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
