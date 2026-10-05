"""Build every Crystal-rule species line into the BASE art (docs/ROLLOUT.md).

Discovers every tools/art/crystal/<line>.py that defines build(), skipping
kit.py, build.py and underscore helper modules (_*.py), and runs each line's
build() in its own Python process (the old species_* folders reuse module
names like kit, oak and sunflower, so lines never share an interpreter).
Then it rebuilds the art index and runs the rule checker on every
crystal-drawn species. build_all.py runs this as the `crystal` builder.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/build.py                every line
  $PY tools/art/crystal/build.py oak sunflower  only those lines (checks still cover all)
  $PY tools/art/crystal/build.py --list         the discovered line modules
  $PY tools/art/crystal/build.py --sheet        also write tools/art/review/crystal_review.png

Exits non-zero if a line fails or the checker finds an error.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import kit  # noqa: E402

SKIP = {"kit", "build"}
RUN = (
    "import runpy, sys; sys.path.insert(0, {here!r}); "
    "ns = runpy.run_path({path!r}, run_name='crystal_{name}'); "
    "b = ns.get('build'); "
    "sys.exit(3) if not callable(b) else b()"
)


def modules() -> list[Path]:
    return sorted(p for p in HERE.glob("*.py") if p.stem not in SKIP and not p.stem.startswith("_"))


def run_line(p: Path) -> int:
    code = RUN.format(here=str(HERE), path=str(p), name=p.stem)
    return subprocess.run([sys.executable, "-c", code], cwd=ROOT).returncode


def main(argv: list[str]) -> int:
    mods = modules()
    if "--list" in argv:
        for p in mods:
            print(p.stem)
        return 0
    only = [a for a in argv if not a.startswith("-")]
    unknown = set(only) - {p.stem for p in mods}
    if unknown:
        print("unknown lines:", sorted(unknown))
        return 2
    failed = []
    for p in mods:
        if only and p.stem not in only:
            continue
        print(f"[{p.stem}]")
        rc = run_line(p)
        if rc == 3:
            print(f"  {p.name} defines no build(): skipped")
        elif rc:
            failed.append(p.stem)
    subprocess.run(["node", "tools/art/index.mjs"], cwd=ROOT, check=True)
    print("[check]")
    errors = kit.check_all(quiet="--quiet" in argv)
    if "--sheet" in argv:
        print(f"review sheet: {kit.review_sheet()}")
    if failed:
        print(f"lines failed: {', '.join(failed)}")
    return 1 if failed or errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
