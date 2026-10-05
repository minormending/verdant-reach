"""Build the Crystal-rule pilot pack (docs/CRYSTAL_PILOT.md): run each line's
generator, rebuild the art index, then run the rule checker and write the
review sheet.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/pilot_crystal/build.py            all three lines
  $PY tools/art/pilot_crystal/build.py sunflower  only those lines (checks still cover all)

Exits non-zero if a generator fails or the checker finds an error.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import common  # noqa: E402

GENERATORS = ["oak", "flytrap", "sunflower"]


def main(argv: list[str]) -> int:
    names = argv or GENERATORS
    failed = []
    for n in names:
        script = HERE / f"{n}.py"
        if not script.exists():
            print(f"[{n}] {script.name} not written yet: skipped")
            continue
        print(f"[{n}]")
        r = subprocess.run([sys.executable, str(script)], cwd=ROOT)
        if r.returncode:
            failed.append(n)
    subprocess.run(["node", "tools/art/index.mjs"], cwd=ROOT, check=True)
    print("[check]")
    errors = common.check_all()
    print(f"review sheet: {common.review_sheet()}")
    if failed:
        print(f"generators failed: {', '.join(failed)}")
    return 1 if failed or errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
