"""Validate the art bundles and rebuild public/art/index.json; with --regen,
first re-run every generator.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/build_all.py                  validate + index (no pixels change)
  $PY tools/art/build_all.py --regen          run all BUILDERS, then validate + index
  $PY tools/art/build_all.py --regen tiles species_a   only those builders
  $PY tools/art/build_all.py --list           list the builders

Generators are authoring tools, not the source of truth: public/art/ is.
A regen reproduces every `source.kind: "generated"` bundle byte-identically
and never touches `edited` or `imported` ones (artkit.emit enforces this).
Exits non-zero on any validation error or a stale index; required paths that
nobody provides yet are reported but only fail with --strict.

To add a generator, append one line to BUILDERS: a name plus either a module
with build() in tools/art/, or a script path run with this Python from the
repo root. Order matters only where noted.

The old photo auto-trace (species.py) is a reference tool and is NOT run.
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
    ("species_a", "species_a/build.py"),
    ("species_b", "species_b/build.py"),
    ("species_c", "species_c/build.py"),
    ("species_d", "species_d/build.py"),
    # Round 4 generators: add yours here, e.g. ("species_e", "species_e/build.py")
    ("species_e", "species_e/build.py"),  # orchid, monstera + lotus lines (Palm House)
    ("species_f", "species_f/build.py"),  # apple + bird of paradise lines
    ("env4", "env4/build.py"),            # Chapter 4 tilesets + structures
    ("cast4", "cast4/build.py"),          # Chapter 4 characters, portraits, items, UI, stills
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
